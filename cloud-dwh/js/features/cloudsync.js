/* ============================================================
   cloudsync.js — optional cross-device cloud sync, backed by Supabase.

   Everything this tool remembers travels across devices: theme, platform,
   visited modules, progress records, quiz best scores, code-block edits and UI
   preferences. It all lives as a flat set of localStorage keys under the
   `cdwh-` prefix (the same keyspace js/features/state-io.js exports) and rides
   in a single jsonb "state" bundle (one DB column, one get, one put; see
   supabase/schema.sql via cdwh_get / cdwh_put).

   Identity model: a "shared sync code". Pick (or generate) a secret code once
   and type it on each device; every device with the same code shares the same
   cloud data. No email / login. The code lives only in this browser's
   localStorage (key "clouddwh:synccode", OUTSIDE the synced prefix so it never
   travels) and is sent to Supabase only to look up your row — the server keys
   on its SHA-256 hash and never stores it in clear text.

   Flow:
     • Local storage stays authoritative for instant/offline use.
     • On every local change we debounce-push the merged bundle to the cloud.
     • On boot, on tab focus, every 15s while visible, and on "Sync now" we
       pull the cloud copy; if it differs and you are not mid-edit, we adopt it.
     • Edits made offline stay dirty and flush automatically on reconnect.

   Merge is per-key and type-aware (no blind last-write-wins that could lose a
   best score):
     • quiz best scores ({best,total,ts})  -> higher `best` wins (never regress)
     • `cdwh-visited` lists                 -> union (every visited module stays)
     • `cdwh-prog-*` records ({items:{…}})  -> item-wise merge (done/correct OR)
     • everything else                      -> 3-way merge against a common
                                               ancestor so two devices editing
                                               different keys both survive.

   Config comes from js/supabase-config.js (window.CDWH.SUPABASE). If the
   url/anonKey are blank, this module is inert and the tool works exactly as it
   did before. No build step, no dependencies, ES5-safe. Additive only: it adds
   window.CDWH.cloud and transparently observes localStorage writes; it never
   edits existing modules, the router, or animations.
   ============================================================ */
(function () {
  "use strict";

  var CDWH = (window.CDWH = window.CDWH || {});

  var PREFIX = "cdwh-";                 // the single family this tool writes
  // Device-local housekeeping that must NOT travel between devices.
  var EXCLUDE = {};
  var CODE_KEY = "clouddwh:synccode";   // outside PREFIX on purpose

  var pushTimer = null;
  var dirty = false;        // local changes not yet confirmed uploaded
  var busy = false;         // a push/pull is in flight
  var applying = false;     // guard: our own writes must not re-trigger a push
  var statusText = "";
  var statusListeners = [];
  var lastSyncAt = 0;
  var lastSyncKind = "";
  var syncListeners = [];
  // Snapshot of the synced bundle as of the last successful sync — the common
  // ancestor for a 3-way merge so a push applies only THIS device's changes
  // over the latest cloud copy instead of overwriting it wholesale.
  var base = null;

  /* ── config ──────────────────────────────────────────────── */
  function cfg() { return CDWH.SUPABASE || { url: "", anonKey: "" }; }
  function configured() { var c = cfg(); return !!(c.url && c.anonKey); }
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

  /* ── status / sync broadcast ─────────────────────────────── */
  function setStatus(txt) {
    statusText = txt || "";
    for (var i = 0; i < statusListeners.length; i++) {
      try { statusListeners[i](statusText); } catch (e) {}
    }
  }
  function markSynced(kind) {
    lastSyncAt = Date.now();
    lastSyncKind = kind || "";
    for (var i = 0; i < syncListeners.length; i++) {
      try { syncListeners[i](lastSyncAt, lastSyncKind); } catch (e) {}
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

  /* ── REST / RPC (plain fetch; no client library) ─────────── */
  function rpc(fn, args) {
    var c = cfg();
    var apiBase = c.url.replace(/\/+$/, "");
    var headers = { "Content-Type": "application/json", "apikey": c.anonKey };
    // Legacy anon keys are JWTs and want "Authorization: Bearer <jwt>". The
    // newer sb_publishable_/sb_secret_ keys are NOT JWTs — they go ONLY in the
    // apikey header, so don't send them as a Bearer token.
    if (/^ey/.test(c.anonKey)) headers["Authorization"] = "Bearer " + c.anonKey;
    return fetch(apiBase + "/rest/v1/rpc/" + fn, {
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

  /* ── local keyspace <-> bundle ───────────────────────────── */
  function matches(key) {
    if (!key || EXCLUDE[key]) return false;
    return key.indexOf(PREFIX) === 0;
  }
  // Read every synced key into a flat { key: rawString } bundle.
  function collect() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!matches(k)) continue;
        var v = localStorage.getItem(k);
        if (v !== null) data[k] = v;        // raw strings, exactly as stored
      }
    } catch (e) { /* private mode / disabled */ }
    return data;
  }
  // Write a merged bundle back to localStorage. Returns true if anything on
  // this device actually changed (so callers can decide whether to re-render).
  function apply(bundle) {
    var changed = false;
    applying = true;
    try {
      // Add / update keys present in the bundle.
      for (var k in bundle) {
        if (!bundle.hasOwnProperty(k) || !matches(k)) continue;
        var nv = String(bundle[k]);
        var cur = null;
        try { cur = localStorage.getItem(k); } catch (e) {}
        if (cur !== nv) {
          try { localStorage.setItem(k, nv); changed = true; } catch (e) {}
        }
      }
      // Remove synced keys that the merged bundle dropped.
      var present = collect();
      for (var ek in present) {
        if (present.hasOwnProperty(ek) && !bundle.hasOwnProperty(ek)) {
          try { localStorage.removeItem(ek); changed = true; } catch (e) {}
        }
      }
    } finally {
      applying = false;
    }
    return changed;
  }

  /* ── merge ───────────────────────────────────────────────── */
  function snapshot(b) { return JSON.parse(JSON.stringify(b || {})); }

  function isQuizKey(k)  { return /-quiz-/.test(k); }
  function isVisited(k)  { return /-visited$/.test(k); }
  function isProgKey(k)  { return /-prog-/.test(k); }

  function parse(raw) { try { return JSON.parse(raw); } catch (e) { return undefined; } }

  // Union two JSON-array strings (visited module ids). Falls back to the other
  // side on any parse trouble so we never lose this device's progress.
  function unionArrays(a, b) {
    var av = parse(a), bv = parse(b);
    if (!Array.isArray(av)) return Array.isArray(bv) ? b : a;
    if (!Array.isArray(bv)) return a;
    var seen = {}, out = [];
    function add(arr) {
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        var key = (typeof v === "string") ? v : JSON.stringify(v);
        if (!seen[key]) { seen[key] = 1; out.push(v); }
      }
    }
    add(av); add(bv);
    return JSON.stringify(out);
  }

  // Quiz best score: value is {best,total,ts}. Higher `best` wins; tie -> newer.
  function mergeQuiz(a, b) {
    var av = parse(a), bv = parse(b);
    if (!av || typeof av.best !== "number") return bv ? b : a;
    if (!bv || typeof bv.best !== "number") return a;
    if (bv.best > av.best) return b;
    if (av.best > bv.best) return a;
    return (bv.ts || 0) > (av.ts || 0) ? b : a;  // same score: keep newer
  }

  // Progress record: {items:{id:{done,correct,ts}}}. Item-wise OR-merge so a
  // module done/correct on either device stays done/correct.
  function mergeProg(a, b) {
    var av = parse(a), bv = parse(b);
    if (!av || !av.items) return bv ? b : a;
    if (!bv || !bv.items) return a;
    var items = {}, id;
    for (id in av.items) if (av.items.hasOwnProperty(id)) items[id] = av.items[id];
    for (id in bv.items) {
      if (!bv.items.hasOwnProperty(id)) continue;
      var x = items[id] || {}, y = bv.items[id] || {};
      items[id] = {
        done: x.done === true || y.done === true,
        correct: x.correct === true || y.correct === true,
        ts: Math.max(x.ts || 0, y.ts || 0)
      };
    }
    var out = {};
    for (id in av) if (av.hasOwnProperty(id)) out[id] = av[id];
    for (id in bv) if (bv.hasOwnProperty(id)) out[id] = bv[id];
    out.items = items;
    return JSON.stringify(out);
  }

  // 3-way merge of two flat bundles against the common ancestor `baseB`.
  function mergeAll(baseB, localB, remoteB) {
    baseB = baseB || {}; localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    var keys = {};
    for (k in remoteB) if (remoteB.hasOwnProperty(k)) keys[k] = 1;
    for (k in localB)  if (localB.hasOwnProperty(k))  keys[k] = 1;

    for (k in keys) {
      if (!keys.hasOwnProperty(k)) continue;
      var hasL = localB.hasOwnProperty(k), hasR = remoteB.hasOwnProperty(k);
      var lv = hasL ? localB[k] : undefined, rv = hasR ? remoteB[k] : undefined;

      // Type-aware, order-independent merges (never regress progress).
      if (isQuizKey(k)) { out[k] = (hasL && hasR) ? mergeQuiz(lv, rv) : (hasL ? lv : rv); continue; }
      if (isVisited(k)) { out[k] = (hasL && hasR) ? unionArrays(lv, rv) : (hasL ? lv : rv); continue; }
      if (isProgKey(k)) { out[k] = (hasL && hasR) ? mergeProg(lv, rv) : (hasL ? lv : rv); continue; }

      // Generic 3-way for prefs / theme / platform / flags.
      var inBase = baseB.hasOwnProperty(k);
      if (hasL && hasR) {
        out[k] = (inBase && lv === baseB[k]) ? rv : lv;  // local changed -> local wins
      } else if (hasL && !hasR) {
        if (!inBase || lv !== baseB[k]) out[k] = lv;     // local add or local change
      } else { // remote-only
        if (!inBase) out[k] = rv;                        // remote add (not a local delete)
      }
    }
    return out;
  }

  /* ── refresh hook ────────────────────────────────────────── */
  function fireRefresh() {
    try { window.dispatchEvent(new Event("clouddwh:state-refresh")); }
    catch (e) {
      var ev = document.createEvent("Event");
      ev.initEvent("clouddwh:state-refresh", false, false);
      window.dispatchEvent(ev);
    }
  }
  function editingNow() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "textarea" || tag === "input" || el.isContentEditable === true;
  }

  /* ── push ────────────────────────────────────────────────── */
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
    busy = true;
    dirty = false;   // edits landing DURING this upload re-set it for a follow-up
    setStatus("Saving…");
    rpc("cdwh_get", { p_code: getCode() }).then(function (rows) {
      var remote = (rows && rows.length && rows[0].state) ? rows[0].state : {};
      var local = collect();
      var merged = mergeAll(base, local, remote);
      return rpc("cdwh_put", { p_code: getCode(), p_state: merged }).then(function () {
        pushErrored = false;
        base = snapshot(merged);
        var changed = apply(merged);   // adopt merged result (picks up other device)
        markSynced("push");
        setStatus("Saved to cloud ✓");
        if (changed) fireRefresh();
      });
    })["catch"](function (err) {
      pushErrored = true;
      dirty = true;                    // nothing uploaded — keep trying
      setStatus("Sync error: " + err.message);
    }).then(function () {
      busy = false;
      if (dirty && !pushTimer) pushTimer = setTimeout(doPush, pushErrored ? 8000 : 900);
    });
  }

  /* ── pull ────────────────────────────────────────────────── */
  function pull(opts) {
    opts = opts || {};
    if (!enabled()) return Promise.resolve(false);
    if (busy) return Promise.resolve(false);
    busy = true;
    setStatus("Checking cloud…");
    return rpc("cdwh_get", { p_code: getCode() }).then(function (rows) {
      var row = rows && rows.length ? rows[0] : null;

      if (!row) {                      // no cloud row yet — seed from local
        setStatus("Linked — this device will seed the cloud");
        busy = false;
        onLocalChange();
        return false;
      }
      var remote = row.state || {};

      if (dirty) {                     // local edits pending — push, don't clobber
        setStatus("Local changes pending — uploading");
        busy = false;
        onLocalChange();
        return false;
      }
      if (!opts.force && editingNow()) {
        setStatus("Cloud has updates — will sync when you finish editing");
        busy = false;
        return false;
      }

      var merged = mergeAll(base, collect(), remote);
      var changed = apply(merged);
      base = snapshot(merged);
      markSynced("pull");
      setStatus(changed ? "Synced from cloud ✓" : "Up to date ✓");
      busy = false;
      if (changed) fireRefresh();
      // If our merge produced something richer than the cloud (e.g. a higher
      // local quiz score survived), push it back so other devices catch up.
      if (JSON.stringify(merged) !== JSON.stringify(remote)) onLocalChange();
      return changed;
    })["catch"](function (err) {
      setStatus("Sync error: " + err.message);
      busy = false;
      return false;
    });
  }

  /* ── public API ──────────────────────────────────────────── */
  CDWH.cloud = {
    configured: configured,
    enabled: enabled,
    getCode: getCode,
    setCode: setCode,
    onLocalChange: onLocalChange,
    pull: pull,
    flush: function () {
      if (!enabled()) return Promise.reject(new Error("Cloud sync is off"));
      dirty = true;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(doPush, 0);
      return new Promise(function (resolve, reject) {
        var started = Date.now();
        (function wait() {
          if (!dirty && !busy) { resolve(lastSyncAt); return; }
          if (Date.now() - started > 20000) { reject(new Error("timed out — check your connection")); return; }
          setTimeout(wait, 300);
        })();
      });
    },
    status: function () { return statusText; },
    onStatus: function (cb) { if (typeof cb === "function") statusListeners.push(cb); },
    lastSync: function () { return { at: lastSyncAt, kind: lastSyncKind }; },
    onSync: function (cb) { if (typeof cb === "function") syncListeners.push(cb); },
    syncLabel: syncLabel,
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
      return raw.replace(/(.{5})(?=.)/g, "$1-"); // XXXXX-XXXXX-XXXXX-XXXXX
    },
    link: function (code) {
      setCode((code || "").trim());
      dirty = false;
      base = null;                    // fresh merge ancestor for the new code
      if (!enabled()) {
        setStatus(configured() ? "Enter a sync code to start" : "Not configured");
        return Promise.resolve(false);
      }
      return pull({ force: true });
    },
    unlink: function () {
      setCode("");
      base = null;
      setStatus("Disconnected from cloud");
    },
    // expose mergers for testing / reuse
    _merge: { mergeAll: mergeAll, mergeQuiz: mergeQuiz, mergeProg: mergeProg, unionArrays: unionArrays }
  };

  /* ── observe local writes (no store layer to hook) ─────────── */
  (function patchStorage() {
    var ls;
    try { ls = window.localStorage; } catch (e) { return; }
    if (!ls) return;
    var proto = Object.getPrototypeOf(ls) || Storage.prototype;
    if (!proto || proto.__cdwhSyncPatched) return;
    var origSet = proto.setItem, origRemove = proto.removeItem;
    proto.setItem = function (k, v) {
      var r = origSet.apply(this, arguments);
      if (!applying && matches(k)) onLocalChange();
      return r;
    };
    proto.removeItem = function (k) {
      var r = origRemove.apply(this, arguments);
      if (!applying && matches(k)) onLocalChange();
      return r;
    };
    try { proto.__cdwhSyncPatched = true; } catch (e) {}
  })();

  /* ── lifecycle ───────────────────────────────────────────── */
  base = snapshot(collect());

  function boot() {
    if (!enabled()) {
      setStatus(configured() ? "Enter a sync code to start" : "Not configured");
      return;
    }
    pull();
  }

  window.addEventListener("online", function () {
    if (!enabled()) return;
    if (dirty) onLocalChange();
    else if (!editingNow()) pull();
  });
  window.addEventListener("focus", function () { if (enabled() && !editingNow()) pull(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && enabled() && !editingNow()) pull();
  });
  setInterval(function () {
    if (enabled() && document.visibilityState === "visible" && !editingNow()) pull();
  }, 15000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
