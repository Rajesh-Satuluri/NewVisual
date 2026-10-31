/*
 * cloudsync.js — optional cross-device sync for the Kafka platform, backed by
 * Supabase. Fully additive: if the backend isn't configured (blank url/key) or
 * no sync code is linked, this module is inert and the app behaves exactly as
 * before — everything stays local, per device.
 *
 * WHAT SYNCS
 *   Every localStorage key this tool owns — anything starting with "kafka-" or
 *   "kafka_": module mastery (kafka-done), the unified progress bundle
 *   (kafka-progress-v1: quizzes, decision drills, troubleshooting, tiered
 *   answers, SRS, coding drills, visited…), per-module quiz best scores
 *   (kafka_quiz_*), self-explanations (kafka_selfx_*), Coding-Dojo pads
 *   (kafka_cd_pad_*), theme and nav state. New kafka_* keys added by future
 *   features sync automatically.
 *
 * IDENTITY — a "shared sync code"
 *   Pick (or generate) one secret code and type it on each device; every device
 *   with the same code shares the same cloud data. No email / login. The code
 *   lives only in this browser's localStorage under "kafka:synccode" — which is
 *   deliberately OUTSIDE the synced prefixes, so the code itself never syncs —
 *   and is sent to Supabase only to look up your row; the server stores just its
 *   SHA-256 hash, never the code in clear.
 *
 * FLOW
 *   • Local storage stays authoritative for instant / offline use.
 *   • A transparent localStorage write observer detects any kafka-* change and
 *     debounce-pushes the MERGED bundle to the cloud (no existing module needs
 *     to call us).
 *   • On boot, on tab focus, when another tab writes (storage event), every 15s
 *     while visible, on reconnect, and on "Sync now", we pull + merge.
 *
 * MERGE is per-key and type-aware (never a blind last-write-wins that could
 * un-master a module or drop a passed quiz): kafka-done unions, the progress
 * bundle merges per category/id keeping the most-recent record and never
 * regressing a pass, quiz best scores take the max, and plain preference/text
 * keys use a 3-way last-write-wins against a common ancestor. See mergeAll().
 *
 * The pure merge functions are exported for Node unit tests
 * (components/cloudsync.test.mjs). All browser wiring lives inside
 * initCloudSync() / the `cloud` methods so importing this file in Node is safe.
 *
 * No build step, no dependencies.
 */
import { SUPABASE } from '../supabase-config.js';

const CODE_KEY = 'kafka:synccode'; // NOT a kafka-/kafka_ prefix → never synced

// ─── pure merge core (browser + Node) ────────────────────────────────────────

export function isSyncedKey(k) {
  return typeof k === 'string' &&
    (k.indexOf('kafka-') === 0 || k.indexOf('kafka_') === 0);
}

function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export function unionArrays(a, b) {
  const s = new Set();
  if (Array.isArray(a)) a.forEach(x => s.add(x));
  if (Array.isArray(b)) b.forEach(x => s.add(x));
  return [...s];
}

// One category of the progress bundle: {id: {...fields, ts}}. Keep the record
// with the newer ts, but never regress a pass / a correct answer.
function mergeCategory(cat, L, R) {
  L = (L && typeof L === 'object') ? L : {};
  R = (R && typeof R === 'object') ? R : {};
  const out = {}, ids = new Set([...Object.keys(L), ...Object.keys(R)]);
  for (const id of ids) {
    const a = L[id], b = R[id];
    if (a == null) { out[id] = b; continue; }
    if (b == null) { out[id] = a; continue; }
    const an = (a && a.ts) || 0, bn = (b && b.ts) || 0;
    const newer = an >= bn ? a : b, older = newer === a ? b : a;
    const rec = Object.assign({}, older, newer);
    if (cat === 'quiz') {
      rec.passed = !!(a.passed || b.passed);
      const bestA = typeof a.best === 'number' ? a.best : 0;
      const bestB = typeof b.best === 'number' ? b.best : 0;
      if (bestA || bestB) rec.best = Math.max(bestA, bestB);
    } else if (a.correct || b.correct) {
      rec.correct = true;
    }
    out[id] = rec;
  }
  return out;
}

// The whole kafka-progress-v1 bundle: {category: {id: record}}.
export function mergeProgress(L, R) {
  L = (L && typeof L === 'object') ? L : {};
  R = (R && typeof R === 'object') ? R : {};
  const out = {}, cats = new Set([...Object.keys(L), ...Object.keys(R)]);
  for (const c of cats) out[c] = mergeCategory(c, L[c], R[c]);
  return out;
}

// Merge local + remote over the common ancestor `base`. Each argument is a flat
// map of {localStorageKey: parsedValue} for synced keys only.
export function mergeAll(base, local, remote) {
  base = base || {}; local = local || {}; remote = remote || {};
  const out = {};
  const keys = new Set([
    ...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)
  ]);
  for (const k of keys) {
    if (!isSyncedKey(k)) continue;
    const inLocal = Object.prototype.hasOwnProperty.call(local, k);
    const inRemote = Object.prototype.hasOwnProperty.call(remote, k);
    const inBase = Object.prototype.hasOwnProperty.call(base, k);

    if (k === 'kafka-done') { out[k] = unionArrays(local[k], remote[k]); continue; }
    if (k === 'kafka-progress-v1') { out[k] = mergeProgress(local[k], remote[k]); continue; }
    if (k.indexOf('kafka_quiz_') === 0) {
      const lv = inLocal ? Number(local[k]) : -Infinity;
      const rv = inRemote ? Number(remote[k]) : -Infinity;
      const m = Math.max(lv, rv);
      if (isFinite(m)) out[k] = m;
      continue;
    }

    // Generic 3-way last-write-wins for prefs / text keys.
    if (inLocal && !eq(local[k], base[k])) out[k] = local[k];   // local add / change
    else if (inRemote) out[k] = remote[k];                      // otherwise take remote
    else if (inLocal) out[k] = local[k];
    // Honor a local deletion only if remote didn't concurrently change the key.
    if (inBase && !inLocal && inRemote && eq(remote[k], base[k])) delete out[k];
  }
  return out;
}

// ─── browser engine ──────────────────────────────────────────────────────────

let pushTimer = null;
let dirty = false;      // local changes not yet confirmed uploaded
let busy = false;       // a push/pull is in flight
let applying = false;   // guard: our own writes must not retrigger a push
let pushErrored = false;
let statusText = '';
let lastSyncAt = 0;
let lastSyncKind = '';
let base = null;        // snapshot of the last-synced bundle (merge ancestor)
const statusListeners = [];
const syncListeners = [];

function cfg() { return SUPABASE || { url: '', anonKey: '' }; }
function configured() { const c = cfg(); return !!(c.url && c.anonKey); }

function getCode() {
  try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
}
function setCode(code) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch (e) { /* private mode — code just won't persist */ }
}
function enabled() { return configured() && !!getCode(); }

function setStatus(txt) {
  statusText = txt || '';
  statusListeners.forEach(cb => { try { cb(statusText); } catch (e) {} });
}
function markSynced(kind) {
  lastSyncAt = Date.now();
  lastSyncKind = kind || '';
  syncListeners.forEach(cb => { try { cb(lastSyncAt, lastSyncKind); } catch (e) {} });
}
function two(n) { return (n < 10 ? '0' : '') + n; }
function syncLabel() {
  if (!enabled()) return 'Cloud sync off';
  if (!lastSyncAt) return 'Not synced yet';
  const d = new Date(lastSyncAt);
  const t = two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
  return 'Last synced ' + t + (lastSyncKind === 'push' ? ' (saved)' : '');
}

// Supabase Postgres functions live at /rest/v1/rpc/<name>; plain fetch, no lib.
function rpc(fn, args) {
  const c = cfg();
  const url = c.url.replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json', apikey: c.anonKey };
  // Legacy anon keys are JWTs (start "ey") and need a Bearer header; the newer
  // sb_publishable_ keys are NOT JWTs and go ONLY in apikey.
  if (/^ey/.test(c.anonKey)) headers.Authorization = 'Bearer ' + c.anonKey;
  return fetch(url + '/rest/v1/rpc/' + fn, {
    method: 'POST', headers, body: JSON.stringify(args || {})
  }).then(r => {
    if (!r.ok) return r.text().then(t => {
      throw new Error('HTTP ' + r.status + (t ? ' — ' + t.slice(0, 200) : ''));
    });
    return r.json();
  });
}

// Read every synced localStorage key into {key: parsedValue}. Values that are
// JSON parse to objects/arrays/numbers; bare strings (theme, prose) stay strings.
function parseVal(s) { try { return JSON.parse(s); } catch (e) { return s; } }
function serializeVal(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

function collectState() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncedKey(k)) out[k] = parseVal(localStorage.getItem(k));
    }
  } catch (e) {}
  return out;
}

// Write a merged bundle back to localStorage. Returns true if anything changed.
// `applying` is set so our own writes don't retrigger onLocalChange().
function applyState(merged) {
  let changed = false;
  applying = true;
  try {
    for (const k in merged) {
      if (!Object.prototype.hasOwnProperty.call(merged, k)) continue;
      if (!isSyncedKey(k)) continue;
      const next = serializeVal(merged[k]);
      if (localStorage.getItem(k) !== next) { localStorage.setItem(k, next); changed = true; }
    }
    // Remove synced keys that the merge dropped (honored deletions).
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isSyncedKey(k) && !Object.prototype.hasOwnProperty.call(merged, k)) toRemove.push(k);
    }
    toRemove.forEach(k => { localStorage.removeItem(k); changed = true; });
  } catch (e) {} finally { applying = false; }
  return changed;
}

function snapshot(b) { return JSON.parse(JSON.stringify(b || {})); }

// Re-render open views with the synced data.
function fireRefresh() {
  try { window.dispatchEvent(new Event('kafka:cloud-refresh')); } catch (e) {}
  // Nav / dashboard / home listen on kafka:progress — nudge them too.
  try { window.dispatchEvent(new CustomEvent('kafka:progress')); } catch (e) {}
}

function editingNow() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'textarea' || tag === 'input' || el.isContentEditable === true;
}

// ─── push / pull ─────────────────────────────────────────────────────────────

function onLocalChange() {
  if (!enabled()) return;
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, 900);
}

function doPush() {
  pushTimer = null;
  if (!enabled() || busy) { if (busy) pushTimer = setTimeout(doPush, 900); return; }
  busy = true;
  dirty = false; // an edit landing mid-upload re-sets this → picked up by a follow-up push
  setStatus('Saving…');
  rpc('kafka_get', { p_code: getCode() }).then(rows => {
    const remote = (rows && rows.length && rows[0].state) ? rows[0].state : {};
    const merged = mergeAll(base, collectState(), remote);
    return rpc('kafka_put', { p_code: getCode(), p_state: merged }).then(() => {
      pushErrored = false;
      base = snapshot(merged);
      const changed = applyState(merged);
      markSynced('push');
      setStatus('Saved to cloud ✓');
      if (changed) fireRefresh();
    });
  }).catch(err => {
    pushErrored = true;
    dirty = true; // nothing uploaded — keep trying
    setStatus('Sync error: ' + err.message);
  }).then(() => {
    busy = false;
    if (dirty && !pushTimer) pushTimer = setTimeout(doPush, pushErrored ? 8000 : 900);
  });
}

// opts.force bypasses the mid-edit guard (the explicit "Sync now" button).
function pull(opts) {
  opts = opts || {};
  if (!enabled() || busy) return Promise.resolve(false);
  if (!opts.force && editingNow()) {
    setStatus('Cloud has updates — will sync when you finish editing');
    return Promise.resolve(false);
  }
  busy = true;
  setStatus('Checking cloud…');
  return rpc('kafka_get', { p_code: getCode() }).then(rows => {
    const remote = (rows && rows.length && rows[0].state) ? rows[0].state : {};
    const merged = mergeAll(base, collectState(), remote);
    const changed = applyState(merged);
    base = snapshot(merged);
    markSynced('pull');
    setStatus(changed ? 'Synced from cloud ✓' : 'Up to date ✓');
    busy = false;
    if (changed) fireRefresh();
    // If our merge produced something the cloud doesn't have yet, push it.
    if (!eq(merged, remote)) onLocalChange();
    return changed;
  }).catch(err => {
    setStatus('Sync error: ' + err.message);
    busy = false;
    return false;
  });
}

// ─── public API ──────────────────────────────────────────────────────────────

export const cloud = {
  configured, enabled, getCode, setCode, onLocalChange, pull, syncLabel,
  status: () => statusText,
  onStatus: cb => { if (typeof cb === 'function') statusListeners.push(cb); },
  lastSync: () => ({ at: lastSyncAt, kind: lastSyncKind }),
  onSync: cb => { if (typeof cb === 'function') syncListeners.push(cb); },
  collectState,
  // A strong, readable random sync code, grouped XXXXX-XXXXX-XXXXX-XXXXX.
  generateCode() {
    const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/L
    let raw = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint8Array(20);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < buf.length; i++) raw += alpha[buf[i] % alpha.length];
    } else {
      for (let j = 0; j < 20; j++) raw += alpha[Math.floor(Math.random() * alpha.length)];
    }
    return raw.replace(/(.{5})(?=.)/g, '$1-');
  },
  link(code) {
    setCode((code || '').trim());
    dirty = false;
    base = snapshot(collectState()); // this device's current data is the ancestor
    if (!enabled()) {
      setStatus(configured() ? 'Enter a sync code to start' : 'Not configured');
      return Promise.resolve(false);
    }
    return pull({ force: true });
  },
  unlink() {
    setCode('');
    base = null;
    setStatus('Disconnected from cloud');
  },
  // Download everything this tool has stored, for a manual backup.
  exportState() { return collectState(); },
  // Restore a backup object {key: value}. Merges over current (never loses the
  // best score / mastery already here), applies locally, and pushes if linked.
  importState(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const incoming = {};
    for (const k in obj) if (isSyncedKey(k)) incoming[k] = obj[k];
    const merged = mergeAll(base || {}, collectState(), incoming);
    const changed = applyState(merged);
    base = snapshot(merged);
    if (changed) fireRefresh();
    if (enabled()) onLocalChange();
    return changed;
  }
};

let started = false;
export function initCloudSync() {
  if (started) return;
  started = true;

  base = snapshot(collectState());

  // Transparent write observer: any kafka-* write (by any module) schedules a
  // push, unless it's one of our own applyState() writes.
  try {
    const _set = localStorage.setItem.bind(localStorage);
    const _remove = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      _set(k, v);
      if (!applying && isSyncedKey(k)) onLocalChange();
    };
    localStorage.removeItem = function (k) {
      _remove(k);
      if (!applying && isSyncedKey(k)) onLocalChange();
    };
  } catch (e) { /* if override is blocked, the fallbacks below still fire */ }

  // Fallbacks / cross-tab: progress events (same tab) and storage events (other tabs).
  window.addEventListener('kafka:progress', () => { if (!applying) onLocalChange(); });
  window.addEventListener('storage', e => {
    if (e && e.key && isSyncedKey(e.key) && enabled() && !editingNow()) pull();
  });

  window.addEventListener('online', () => {
    if (!enabled()) return;
    if (dirty) onLocalChange();
    else if (!editingNow()) pull();
  });
  window.addEventListener('focus', () => { if (enabled() && !editingNow()) pull(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && enabled() && !editingNow()) pull();
  });
  setInterval(() => {
    if (enabled() && document.visibilityState === 'visible' && !editingNow()) pull();
  }, 15000);

  if (!enabled()) {
    setStatus(configured() ? 'Enter a sync code to start' : 'Not configured');
  } else {
    pull();
  }
}
