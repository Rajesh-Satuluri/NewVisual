/*
 * cloudsync.js — optional cross-device sync for the Cloud DE Visualizer,
 * backed by Supabase. Same design as the Blind75 / Kafka tools.
 *
 * What travels across devices (one jsonb "state" bundle, one DB column):
 *   • progress — the whole TV.Progress blob (viewed/quiz/ratings/activities…)
 *   • iqEdits  — your per-question interview Q&A edits
 *
 * Identity model: a "shared sync code". You pick (or generate) a secret code
 * once and type it on each device; every device with the same code shares the
 * same cloud data. No email / login. The code lives only in this browser's
 * localStorage and is sent to Supabase to look up your row — it is never stored
 * on the server in clear text (the server keys on its SHA-256 hash).
 *
 * Flow:
 *   • Local cache stays authoritative for instant/offline use (cloud-store.js).
 *   • On every local change we debounce-push the merged bundle to the cloud.
 *   • On boot, on tab focus, every 15s while visible, and on "Sync now" we pull
 *     the cloud copy; if it differs and you are not mid-edit, we adopt it.
 *   • Edits made while offline stay dirty and flush automatically on reconnect.
 *
 * Merge is per-bucket: iqEdits uses a per-question 3-way merge against a common
 * ancestor (concurrent edits to different questions both survive); progress is
 * timestamped last-write-wins on its own `updated` field.
 *
 * Config comes from supabase-config.js (window.CDEVIZ.SUPABASE). If url/anonKey
 * are blank, this module is inert. No build step, no dependencies, ES5-safe.
 */
(function () {
  'use strict';

  var C = (window.CDEVIZ = window.CDEVIZ || {});

  var CODE_KEY = 'cde:synccode';
  var pushTimer = null;
  var dirty = false;
  var busy = false;
  var statusText = '';
  var statusListeners = [];
  var lastSyncAt = 0;
  var lastSyncKind = '';
  var syncListeners = [];
  var base = null; // common ancestor for the 3-way iqEdits merge

  // ---- config -------------------------------------------------------------
  function cfg() { return C.SUPABASE || { url: '', anonKey: '' }; }
  function configured() { var c = cfg(); return !!(c.url && c.anonKey); }
  function getCode() { try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; } }
  function setCode(code) {
    try { if (code) localStorage.setItem(CODE_KEY, code); else localStorage.removeItem(CODE_KEY); } catch (e) {}
  }
  function enabled() { return configured() && !!getCode(); }

  // ---- status broadcast ---------------------------------------------------
  function setStatus(txt) {
    statusText = txt || '';
    for (var i = 0; i < statusListeners.length; i++) { try { statusListeners[i](statusText); } catch (e) {} }
  }
  function markSynced(kind) {
    lastSyncAt = Date.now(); lastSyncKind = kind || '';
    for (var i = 0; i < syncListeners.length; i++) { try { syncListeners[i](lastSyncAt, lastSyncKind); } catch (e) {} }
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function syncLabel() {
    if (!enabled()) return 'Cloud sync off';
    if (!lastSyncAt) return 'Not synced yet';
    var d = new Date(lastSyncAt);
    var t = two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
    return 'Last synced ' + t + (lastSyncKind === 'push' ? ' (saved)' : '');
  }

  // ---- REST / RPC ---------------------------------------------------------
  function rpc(fn, args) {
    var c = cfg();
    var baseUrl = c.url.replace(/\/+$/, '');
    var headers = { 'Content-Type': 'application/json', 'apikey': c.anonKey };
    // Legacy anon keys are JWTs (start with "ey") and want a Bearer header; the
    // newer sb_publishable_/sb_secret_ keys go ONLY in the apikey header.
    if (/^ey/.test(c.anonKey)) headers['Authorization'] = 'Bearer ' + c.anonKey;
    return fetch(baseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: headers, body: JSON.stringify(args || {})
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error('HTTP ' + r.status + (t ? ' — ' + t.slice(0, 200) : '')); });
      }
      return r.json();
    });
  }

  // ---- bundle shape -------------------------------------------------------
  function emptyBundle() { return { progress: {}, iqEdits: {} }; }
  function normalize(b) {
    var e = emptyBundle(), out = {};
    for (var k in e) if (e.hasOwnProperty(k)) {
      out[k] = (b && b[k] !== undefined && b[k] !== null) ? b[k] : e[k];
    }
    return out;
  }
  function rowToBuckets(row) { if (!row) return null; return normalize(row.state || {}); }
  function snapshot(b) { return JSON.parse(JSON.stringify(normalize(b))); }
  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ---- merge --------------------------------------------------------------
  // Per-key 3-way merge against the common ancestor `base`.
  function mergeBucket(baseB, localB, remoteB) {
    baseB = baseB || {}; localB = localB || {}; remoteB = remoteB || {};
    var out = {}, k;
    for (k in remoteB) if (remoteB.hasOwnProperty(k)) out[k] = remoteB[k];
    for (k in localB) if (localB.hasOwnProperty(k)) { if (!eq(localB[k], baseB[k])) out[k] = localB[k]; }
    for (k in baseB) if (baseB.hasOwnProperty(k)) { if (!localB.hasOwnProperty(k)) delete out[k]; }
    return out;
  }
  // iqEdits is a two-level map (group -> { qi -> {q,a} }); merge each inner map.
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
  // progress: timestamped last-write-wins on the whole blob.
  function mergeProgress(localP, remoteP) {
    localP = localP || {}; remoteP = remoteP || {};
    var lu = +localP.updated || 0, ru = +remoteP.updated || 0;
    // When neither has moved, prefer the richer (more keys) so an empty default
    // never wipes real data on first link.
    if (ru > lu) return remoteP;
    if (lu > ru) return localP;
    return (Object.keys(localP).length >= Object.keys(remoteP).length) ? localP : remoteP;
  }

  function mergeAll(baseS, localB, remoteB) {
    baseS = normalize(baseS); localB = normalize(localB); remoteB = normalize(remoteB);
    return {
      progress: mergeProgress(localB.progress, remoteB.progress),
      iqEdits:  mergeNested(baseS.iqEdits, localB.iqEdits, remoteB.iqEdits)
    };
  }

  // Re-render the current view so synced edits/progress show immediately.
  function fireRefresh() {
    try { window.dispatchEvent(new Event('cde:cloud-refresh')); }
    catch (e) {
      var ev = document.createEvent('Event');
      ev.initEvent('cde:cloud-refresh', false, false);
      window.dispatchEvent(ev);
    }
  }

  // ---- editing guard ------------------------------------------------------
  function editingNow() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'textarea' || tag === 'input' || el.isContentEditable === true;
  }

  function store() { return C.store; }

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
    if (!store()) return;
    busy = true;
    dirty = false;
    setStatus('Saving…');
    rpc('cde_get', { p_code: getCode() }).then(function (rows) {
      var remote = rowToBuckets(rows && rows.length ? rows[0] : null) || snapshot(null);
      var local = store().cloudBuckets();
      var merged = mergeAll(base, local, remote);
      return rpc('cde_put', { p_code: getCode(), p_state: merged }).then(function () {
        pushErrored = false;
        base = snapshot(merged);
        var changed = store().applyCloudBuckets(merged);
        markSynced('push');
        setStatus('Saved to cloud ✓');
        if (changed) fireRefresh();
      });
    })['catch'](function (err) {
      pushErrored = true;
      dirty = true;
      setStatus('Sync error: ' + err.message);
    }).then(function () {
      busy = false;
      if (dirty && !pushTimer) pushTimer = setTimeout(doPush, pushErrored ? 8000 : 900);
    });
  }

  // ---- pull ---------------------------------------------------------------
  function pull(opts) {
    opts = opts || {};
    if (!enabled()) return Promise.resolve(false);
    if (busy) return Promise.resolve(false);
    busy = true;
    setStatus('Checking cloud…');
    return rpc('cde_get', { p_code: getCode() }).then(function (rows) {
      var row = rows && rows.length ? rows[0] : null;
      if (!row) { setStatus('Linked — this device will seed the cloud'); busy = false; onLocalChange(); return false; }
      var buckets = rowToBuckets(row);
      if (dirty) { setStatus('Local changes pending — uploading'); busy = false; onLocalChange(); return false; }
      if (!opts.force && editingNow()) { setStatus('Cloud has updates — will sync when you finish editing'); busy = false; return false; }
      var changed = store() ? store().applyCloudBuckets(buckets) : false;
      base = snapshot(buckets);
      markSynced('pull');
      setStatus(changed ? 'Synced from cloud ✓' : 'Up to date ✓');
      busy = false;
      if (changed) fireRefresh();
      return changed;
    })['catch'](function (err) {
      setStatus('Sync error: ' + err.message);
      busy = false;
      return false;
    });
  }

  // ---- public API ---------------------------------------------------------
  C.cloud = {
    configured: configured,
    enabled: enabled,
    getCode: getCode,
    setCode: setCode,
    onLocalChange: onLocalChange,
    pull: pull,
    flush: function () {
      if (!enabled()) return Promise.reject(new Error('Cloud sync is off'));
      dirty = true;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(doPush, 0);
      return new Promise(function (resolve, reject) {
        var started = Date.now();
        (function wait() {
          if (!dirty && !busy) { resolve(lastSyncAt); return; }
          if (Date.now() - started > 20000) { reject(new Error('timed out — check your connection')); return; }
          setTimeout(wait, 300);
        })();
      });
    },
    status: function () { return statusText; },
    onStatus: function (cb) { if (typeof cb === 'function') statusListeners.push(cb); },
    lastSync: function () { return { at: lastSyncAt, kind: lastSyncKind }; },
    onSync: function (cb) { if (typeof cb === 'function') syncListeners.push(cb); },
    syncLabel: syncLabel,
    generateCode: function () {
      var alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      var raw = '';
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(20); window.crypto.getRandomValues(buf);
        for (var i = 0; i < buf.length; i++) raw += alpha[buf[i] % alpha.length];
      } else { for (var j = 0; j < 20; j++) raw += alpha[Math.floor(Math.random() * alpha.length)]; }
      return raw.replace(/(.{5})(?=.)/g, '$1-');
    },
    link: function (code) {
      setCode((code || '').trim());
      dirty = false;
      base = null;
      if (!enabled()) { setStatus(configured() ? 'Enter a sync code to start' : 'Not configured'); return Promise.resolve(false); }
      return pull({ force: true });
    },
    unlink: function () { setCode(''); base = null; setStatus('Disconnected from cloud'); }
  };

  // ---- lifecycle ----------------------------------------------------------
  if (store()) base = snapshot(store().cloudBuckets());

  function boot() {
    if (!enabled()) { setStatus(configured() ? 'Enter a sync code to start' : 'Not configured'); return; }
    pull();
  }
  window.addEventListener('online', function () {
    if (!enabled()) return;
    if (dirty) onLocalChange(); else if (!editingNow()) pull();
  });
  window.addEventListener('focus', function () { if (enabled() && !editingNow()) pull(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && enabled() && !editingNow()) pull();
  });
  setInterval(function () {
    if (enabled() && document.visibilityState === 'visible' && !editingNow()) pull();
  }, 15000);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
