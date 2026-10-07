/*
 * cloudsync.js — optional cross-device sync for notes + code edits + logic
 * edits, backed by Supabase.
 *
 * Identity model: a "shared sync code". You pick (or generate) a secret code
 * once and type it on each device; every device with the same code shares the
 * same cloud data. No email / login. The code lives only in this browser's
 * localStorage and is sent to Supabase to look up your row — it is never
 * stored on the server in clear text (the server keys on its SHA-256 hash;
 * see supabase/schema.sql).
 *
 * Flow:
 *   • Local cache stays authoritative for instant/offline use (store.js).
 *   • On every local change we debounce-push the three buckets to the cloud.
 *   • On boot, on tab focus, and on "Sync now" we pull the cloud copy; if it
 *     differs and you are not mid-edit, we adopt it and re-render.
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

  // Map the DB row (snake_case) to the store's bucket shape (camelCase).
  function rowToBuckets(row) {
    if (!row) return null;
    return {
      notes: row.notes || {},
      codeEdits: row.code_edits || {},
      logicEdits: row.logic_edits || {}
    };
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

  function doPush() {
    pushTimer = null;
    if (!enabled() || busy) { if (busy) { if (pushTimer) clearTimeout(pushTimer); pushTimer = setTimeout(doPush, 900); } return; }
    if (!B.store) return;
    var buckets = B.store.cloudBuckets();
    busy = true;
    setStatus("Saving…");
    rpc("study_put", {
      p_code: getCode(),
      p_notes: buckets.notes,
      p_code_edits: buckets.codeEdits,
      p_logic_edits: buckets.logicEdits
    }).then(function () {
      dirty = false;
      setStatus("Saved to cloud ✓");
    })["catch"](function (err) {
      setStatus("Sync error: " + err.message);
    }).then(function () {
      busy = false;
      // If more edits landed while uploading, schedule another push.
      if (dirty && !pushTimer) pushTimer = setTimeout(doPush, 900);
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
      setStatus(changed ? "Synced from cloud ✓" : "Up to date ✓");
      busy = false;
      if (changed) {
        // Re-render the current view so new notes/code show immediately.
        try { window.dispatchEvent(new Event("blind75:cloud-refresh")); }
        catch (e) {
          // Old browsers without the Event constructor: hard refresh fallback.
          var ev = document.createEvent("Event");
          ev.initEvent("blind75:cloud-refresh", false, false);
          window.dispatchEvent(ev);
        }
      }
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
      if (!enabled()) { setStatus(configured() ? "Enter a sync code to start" : "Not configured"); return Promise.resolve(false); }
      return pull({ force: true });
    },
    unlink: function () {
      setCode("");
      setStatus("Disconnected from cloud");
    }
  };

  // ---- lifecycle ----------------------------------------------------------
  function boot() {
    if (!enabled()) {
      setStatus(configured() ? "Enter a sync code to start" : "Not configured");
      return;
    }
    pull();
  }

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
