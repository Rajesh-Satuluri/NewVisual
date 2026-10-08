/*
 * cloudsync.js — optional FULL-COVERAGE cross-device sync, backed by Supabase.
 *
 * Everything the study tool remembers travels across devices: progress status,
 * Python topic status, the spaced-repetition schedule, review flags, daily
 * activity/streak, challenge flags, viz links, notes, code edits, logic edits,
 * and a safe subset of preferences. It all rides in a single jsonb "state"
 * bundle (one DB column, one get, one put — see supabase/schema.sql).
 *
 * Identity model: a "shared sync code". You pick (or generate) a secret code
 * once and type it on each device; every device with the same code shares the
 * same cloud data. No email / login. The code lives only in this browser's
 * localStorage and is sent to Supabase to look up your row — it is never
 * stored on the server in clear text (the server keys on its SHA-256 hash).
 *
 * Flow:
 *   • Local cache stays authoritative for instant/offline use (store.js).
 *   • On every local change we debounce-push the merged bundle to the cloud.
 *   • On boot, on tab focus, every 15s while visible, and on "Sync now" we
 *     pull the cloud copy; if it differs and you are not mid-edit, we adopt it.
 *   • Edits made while offline stay dirty and flush automatically on reconnect.
 *
 * Merge is per-bucket and type-aware (no blind last-write-wins that could
 * un-solve a problem): progress uses most-advanced-wins, SRS uses most-recent,
 * activity uses max-per-day, review/challenge flags union, text buckets use a
 * per-key 3-way merge against a common ancestor, and prefs use timestamped
 * last-write-wins. See mergeAll() below.
 *
 * Config comes from js/supabase-config.js (window.BLIND75.SUPABASE). If the
 * url/anonKey are blank, this module is inert and the app works exactly as it
 * did before. No build step, no dependencies, ES5-safe.
 */
(function () {
  "use strict";

  window.BLIND75 = window.BLIND75 || {};
  var B = window.BLIND75;

  var CODE_KEY = "blind75:synccode";
  var pushTimer = null;
  var dirty = false;        // local changes not yet confirmed uploaded
  var busy = false;         // a push/pull is in flight
  var statusText = "";
  var statusListeners = [];
  var lastSyncAt = 0;       // ms of last successful push/pull
  var lastSyncKind = "";    // "push" | "pull"
  var syncListeners = [];
  // Snapshot of the three buckets as of the last successful sync. Used as the
  // common ancestor for a 3-way merge so a push applies only THIS device's
  // changes over the latest cloud copy, instead of overwriting it wholesale.
  var base = null;

  // ---- config -------------------------------------------------------------
  function cfg() { return B.SUPABASE || { url: "", anonKey: "" }; }
  function configured() {
    var c = cfg();
    return !!(c.url && c.anonKey);
  }
  function getCode() {
    try { return localStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; }
  }
  function setCode(code) {
    try {
      if (code) localStorage.setItem(CODE_KEY, code);
      else localStorage.removeItem(CODE_KEY);
    } catch (e) { /* private mode — code just won't persist */ }
  }
  function enabled() { return configured() && !!getCode(); }

  // ---- status broadcast ---------------------------------------------------
  function setStatus(txt) {
    statusText = txt || "";
    for (var i = 0; i < statusListeners.length; i++) {
      try { statusListeners[i](statusText); } catch (e) { /* ignore */ }
    }
  }

  // Record a successful sync and notify listeners (drives the "Last synced …"
  // label shown near the notes).
  function markSynced(kind) {
    lastSyncAt = Date.now();
    lastSyncKind = kind || "";
    for (var i = 0; i < syncListeners.length; i++) {
      try { syncListeners[i](lastSyncAt, lastSyncKind); } catch (e) { /* ignore */ }
    }
  }

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function syncLabel() {
    if (!enabled()) return "Cloud sync off";
    if (!lastSyncAt) return "Not synced yet";
    var d = new Date(lastSyncAt);
    var t = two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
    return "Last synced " + t + (lastSyncKind === "push" ? " (saved)" : "");
  }

  // ---- REST / RPC ---------------------------------------------------------
  // Supabase exposes Postgres functions at /rest/v1/rpc/<name>. We call them
  // with plain fetch so there's no client library to load.
  function rpc(fn, args) {
    var c = cfg();
    var base = c.url.replace(/\/+$/, "");
    var headers = { "Content-Type": "application/json", "apikey": c.anonKey };
    // Legacy anon keys are JWTs and expect an "Authorization: Bearer <jwt>"
    // header. The newer sb_publishable_/sb_secret_ keys are NOT JWTs — they go
    // ONLY in the apikey header; sending them as a Bearer token makes Supabase
    // try (and fail) to verify them as a JWT, so every request errors out.
    if (/^ey/.test(c.anonKey)) headers["Authorization"] = "Bearer " + c.anonKey;
    return fetch(base + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(args || {})
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error("HTTP " + r.status + (t ? " — " + t.slice(0, 200) : ""));
        });
      }
      return r.json();
    });
  }

  // Every synced bucket, with safe defaults so a merge never touches undefined.
  function emptyBundle() {
    return {
      notes: {}, links: {}, codeEdits: {}, logicEdits: {},
      status: {}, pyStatus: {}, srs: {}, review: {}, activity: {},
      pyChallenge: {}, prefs: {}, prefsAt: 0
    };
  }
  // Normalise a stored bundle (from the DB's single `state` jsonb column, or
  // from the local store) into the full shape, defaulting any missing bucket.
  function normalize(b) {
    var e = emptyBundle(), out = {};
    for (var k in e) if (e.hasOwnProperty(k)) {
      out[k] = (b && b[k] !== undefined && b[k] !== null) ? b[k] : e[k];
    }
    return out;
  }
  // The DB row now carries the whole bundle in `state`.
  function rowToBuckets(row) {
    if (!row) return null;
    return normalize(row.state || {});
  }

  // ---- merge --------------------------------------------------------------
  function snapshot(b) { return JSON.parse(JSON.stringify(normalize(b))); }
  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Progress rank — higher is "more advanced". Spans both the problem statuses
  // ("not-started"/"learning"/"solved") and the Python statuses
  // ("not-started"/"learning"/"learned"/"mastered"). Merges never regress.
  function rank(s) {
    switch (s) {
      case "mastered": return 4;
      case "solved":   return 3;
      case "learned":  return 2;
      case "learning": return 1;
      default:         return 0; // not-started / unknown
    }
  }

  // Text / structured buckets keyed by problem id: per-key 3-way merge against
  // the common ancestor `base`. Different keys never clash; the same key edited
  // on two devices resolves to THIS device's value; a local deletion sticks.
  function mergeBucket(baseB, localB, remoteB) {
    baseB = baseB || {}; localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) if (remoteB.hasOwnProperty(k)) out[k] = remoteB[k];
    for (k in localB) if (localB.hasOwnProperty(k)) {
      if (!eq(localB[k], baseB[k])) out[k] = localB[k]; // local add / change vs base
    }
    for (k in baseB) if (baseB.hasOwnProperty(k)) {
      if (!localB.hasOwnProperty(k)) delete out[k];      // local deletion vs base
    }
    return out;
  }
  // codeEdits / logicEdits are two-level maps (id -> { subkey: text }); merge
  // each inner map so edits to different approaches of the same problem on two
  // devices both survive.
  function mergeNested(baseB, localB, remoteB) {
    baseB = baseB || {}; localB = localB || {}; remoteB = remoteB || {};
    var ids = {}, id, out = {};
    for (id in remoteB) ids[id] = 1;
    for (id in localB) ids[id] = 1;
    for (id in baseB) ids[id] = 1;
    for (id in ids) {
      var inner = mergeBucket(baseB[id], localB[id], remoteB[id]);
      var has = false, kk; for (kk in inner) { has = true; break; }
      if (has) out[id] = inner;
    }
    return out;
  }
  // Progress: most-advanced status wins, per key. Never un-solves anything.
  function mergeMonotonic(localB, remoteB) {
    localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) out[k] = remoteB[k];
    for (k in localB) {
      if (!(k in out) || rank(localB[k]) > rank(out[k])) out[k] = localB[k];
    }
    return out;
  }
  // SRS: the device that reviewed a card most recently owns its schedule.
  function mergeSrs(localB, remoteB) {
    localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) out[k] = remoteB[k];
    for (k in localB) {
      var r = out[k];
      if (!r || (localB[k].last || 0) >= (r.last || 0)) out[k] = localB[k];
    }
    return out;
  }
  // Activity per day: max of the two counts (sum would double-count on re-sync).
  function mergeActivity(localB, remoteB) {
    localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) out[k] = remoteB[k];
    for (k in localB) out[k] = Math.max(out[k] || 0, localB[k] || 0);
    return out;
  }
  // Boolean flags (review, challenge-done): true on any device stays true.
  function mergeFlags(localB, remoteB) {
    localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) if (remoteB[k]) out[k] = true;
    for (k in localB) if (localB[k]) out[k] = true;
    return out;
  }
  // Prefs: timestamped last-write-wins over the whole synced subset.
  function mergePrefs(local, remote) {
    var la = local.prefsAt || 0, ra = remote.prefsAt || 0;
    if (ra > la) return { prefs: remote.prefs || {}, prefsAt: ra };
    return { prefs: local.prefs || {}, prefsAt: la };
  }

  function mergeAll(baseS, localB, remoteB) {
    baseS = normalize(baseS); localB = normalize(localB); remoteB = normalize(remoteB);
    var pref = mergePrefs(localB, remoteB);
    return {
      notes:       mergeBucket(baseS.notes, localB.notes, remoteB.notes),
      links:       mergeBucket(baseS.links, localB.links, remoteB.links),
      codeEdits:   mergeNested(baseS.codeEdits, localB.codeEdits, remoteB.codeEdits),
      logicEdits:  mergeNested(baseS.logicEdits, localB.logicEdits, remoteB.logicEdits),
      status:      mergeMonotonic(localB.status, remoteB.status),
      pyStatus:    mergeMonotonic(localB.pyStatus, remoteB.pyStatus),
      srs:         mergeSrs(localB.srs, remoteB.srs),
      review:      mergeFlags(localB.review, remoteB.review),
      activity:    mergeActivity(localB.activity, remoteB.activity),
      pyChallenge: mergeFlags(localB.pyChallenge, remoteB.pyChallenge),
      prefs:       pref.prefs,
      prefsAt:     pref.prefsAt
    };
  }

  // Re-render the current view so synced notes/code show immediately.
  function fireRefresh() {
    try { window.dispatchEvent(new Event("blind75:cloud-refresh")); }
    catch (e) {
      var ev = document.createEvent("Event");
      ev.initEvent("blind75:cloud-refresh", false, false);
      window.dispatchEvent(ev);
    }
  }

  // ---- editing guard ------------------------------------------------------
  // Don't clobber the view (or someone's half-typed note) while they type.
  function editingNow() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "textarea" || tag === "input" || el.isContentEditable === true;
  }

  // ---- push ---------------------------------------------------------------
  function onLocalChange() {
    if (!enabled()) return;
    dirty = true;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(doPush, 900);
  }

  var pushErrored = false;
  function doPush() {
    pushTimer = null;
    if (!enabled() || busy) { if (busy) { pushTimer = setTimeout(doPush, 900); } return; }
    if (!B.store) return;
    busy = true;
    // Clear the dirty flag now: any edit that lands DURING this upload will
    // re-set it, so it gets picked up by a follow-up push instead of lost.
    dirty = false;
    setStatus("Saving…");
    // Fetch the latest cloud copy first, merge this device's changes over it,
    // then write the merged result back — so a concurrent edit on another
    // device (to a different problem) is preserved rather than clobbered.
    rpc("study_get", { p_code: getCode() }).then(function (rows) {
      var remote = rowToBuckets(rows && rows.length ? rows[0] : null) || snapshot(null);
      var local = B.store.cloudBuckets();
      var merged = mergeAll(base, local, remote);
      return rpc("study_put", {
        p_code: getCode(),
        p_state: merged
      }).then(function () {
        pushErrored = false;
        base = snapshot(merged);
        // Adopt the merged result locally (picks up the other device's edits);
        // re-render if it changed what's on screen.
        var changed = B.store.applyCloudBuckets(merged);
        markSynced("push");
        setStatus("Saved to cloud ✓");
        if (changed) fireRefresh();
      });
    })["catch"](function (err) {
      pushErrored = true;
      dirty = true; // nothing was uploaded — keep trying
      setStatus("Sync error: " + err.message);
    }).then(function () {
      busy = false;
      // Re-push if edits landed mid-upload, or retry (backed off) after a fail.
      if (dirty && !pushTimer) pushTimer = setTimeout(doPush, pushErrored ? 8000 : 900);
    });
  }

  // ---- pull ---------------------------------------------------------------
  // opts.force bypasses the "mid-edit" guard (used by the explicit button).
  function pull(opts) {
    opts = opts || {};
    if (!enabled()) return Promise.resolve(false);
    if (busy) return Promise.resolve(false);
    busy = true;
    setStatus("Checking cloud…");
    return rpc("study_get", { p_code: getCode() }).then(function (rows) {
      var row = rows && rows.length ? rows[0] : null;

      // No cloud row yet for this code: seed it from whatever is local.
      if (!row) {
        setStatus("Linked — this device will seed the cloud");
        busy = false;
        onLocalChange();
        return false;
      }

      var buckets = rowToBuckets(row);

      // Local has unsent edits — keep them and push instead of overwriting.
      if (dirty) {
        setStatus("Local changes pending — uploading");
        busy = false;
        onLocalChange();
        return false;
      }

      // Don't yank the UI out from under an active edit (unless forced).
      if (!opts.force && editingNow()) {
        setStatus("Cloud has updates — will sync when you finish editing");
        busy = false;
        return false;
      }

      var changed = B.store ? B.store.applyCloudBuckets(buckets) : false;
      base = snapshot(buckets); // local now matches cloud — new merge ancestor
      markSynced("pull");
      setStatus(changed ? "Synced from cloud ✓" : "Up to date ✓");
      busy = false;
      if (changed) fireRefresh();
      return changed;
    })["catch"](function (err) {
      setStatus("Sync error: " + err.message);
      busy = false;
      return false;
    });
  }

  // ---- public API ---------------------------------------------------------
  B.cloud = {
    configured: configured,
    enabled: enabled,
    getCode: getCode,
    setCode: setCode,
    onLocalChange: onLocalChange,
    pull: pull,
    status: function () { return statusText; },
    onStatus: function (cb) { if (typeof cb === "function") statusListeners.push(cb); },
    lastSync: function () { return { at: lastSyncAt, kind: lastSyncKind }; },
    onSync: function (cb) { if (typeof cb === "function") syncListeners.push(cb); },
    syncLabel: syncLabel,
    // Generate a strong, readable random sync code (grouped for legibility).
    generateCode: function () {
      var alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
      var raw = "";
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(20);
        window.crypto.getRandomValues(buf);
        for (var i = 0; i < buf.length; i++) raw += alpha[buf[i] % alpha.length];
      } else {
        for (var j = 0; j < 20; j++) raw += alpha[Math.floor(Math.random() * alpha.length)];
      }
      // group as XXXXX-XXXXX-XXXXX-XXXXX
      return raw.replace(/(.{5})(?=.)/g, "$1-");
    },
    // Called by the settings dialog after a code is entered/changed.
    link: function (code) {
      setCode((code || "").trim());
      dirty = false;
      base = null; // fresh merge ancestor for the new code
      if (!enabled()) { setStatus(configured() ? "Enter a sync code to start" : "Not configured"); return Promise.resolve(false); }
      return pull({ force: true });
    },
    unlink: function () {
      setCode("");
      base = null;
      setStatus("Disconnected from cloud");
    }
  };

  // ---- lifecycle ----------------------------------------------------------
  // Seed the merge ancestor from what's already stored on this device, so an
  // edit made before the first pull is counted as a single change rather than
  // overwriting the whole cloud copy with this device's (possibly stale) data.
  if (B.store) base = snapshot(B.store.cloudBuckets());

  function boot() {
    if (!enabled()) {
      setStatus(configured() ? "Enter a sync code to start" : "Not configured");
      return;
    }
    pull();
  }

  // Back online after being offline: flush any edits that couldn't upload, then
  // pull so this device catches up with whatever changed elsewhere meanwhile.
  window.addEventListener("online", function () {
    if (!enabled()) return;
    if (dirty) onLocalChange();
    else if (!editingNow()) pull();
  });

  // Re-pull when the tab regains focus / becomes visible, so edits made on
  // another device show up when you come back to this one.
  window.addEventListener("focus", function () { if (enabled() && !editingNow()) pull(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && enabled() && !editingNow()) pull();
  });

  // Automatic background refresh: while the tab is visible and you're not
  // mid-edit, quietly check the cloud every 15s so an already-open device
  // picks up edits from another device without any manual "Sync now".
  // pull() no-ops if a request is already in flight or nothing changed.
  setInterval(function () {
    if (enabled() && document.visibilityState === "visible" && !editingNow()) pull();
  }, 15000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
