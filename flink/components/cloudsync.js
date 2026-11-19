// ─────────────────────────────────────────────────────────────────────────
// Cross-device cloud sync engine → window.Flink.cloud  (classic script).
//
// Syncs the tool's entire saved state across devices with NO login, using a
// shared secret "sync code". Fully optional and inert until a code is linked:
// if Supabase isn't configured, or no code is linked, every method is a safe
// no-op and the tool stays local-only.
//
// What syncs: every localStorage key starting with `flink_` or `flink:`
// (theme, progress, quiz scores, nav state, interview edits, code edits).
// They are bundled into ONE jsonb object = the `state` column (one row/code).
//
// The sync code lives at `flinksync:code` — deliberately OUTSIDE the synced
// prefixes so the secret itself is never uploaded. Only its SHA-256 hash ever
// reaches the server (hashed server-side inside flink_get / flink_put).
// ─────────────────────────────────────────────────────────────────────────
(() => {
  'use strict';
  window.Flink = window.Flink || {};

  const CODE_KEY = 'flinksync:code';   // the private code (never synced)
  const BASE_KEY = 'flinksync:base';   // last-known common ancestor (never synced)
  const SYNC_PREFIXES = ['flink_', 'flink:'];
  const PUSH_DEBOUNCE = 900;
  const PUSH_RETRY = 8000;
  const HIDDEN_PULL_MS = 15000;

  const cfg = () => window.Flink.SUPABASE || {};
  const configured = () => !!(cfg().url && cfg().anonKey);

  // ── Raw localStorage (captured before we wrap setItem) ────────────────────
  const LS = window.localStorage;
  const rawGet = LS.getItem.bind(LS);
  const rawSet = LS.setItem.bind(LS);
  const rawRemove = LS.removeItem.bind(LS);

  const isSynced = (k) => !!k && SYNC_PREFIXES.some((p) => k.startsWith(p));

  // ── State ─────────────────────────────────────────────────────────────────
  let applying = false;          // true while we write incoming cloud data (don't re-push)
  let pushTimer = null;
  let retryTimer = null;
  let lastHidden = 0;
  let status = 'idle';
  let lastSyncAt = null;
  let lastSyncKind = null;
  const statusSubs = new Set();
  const syncSubs = new Set();

  const setStatus = (s) => { status = s; statusSubs.forEach((cb) => { try { cb(s); } catch (_) {} }); };
  const noteSync = (kind) => {
    lastSyncAt = Date.now(); lastSyncKind = kind;
    syncSubs.forEach((cb) => { try { cb({ at: lastSyncAt, kind }); } catch (_) {} });
  };

  const getCode = () => { try { return rawGet(CODE_KEY) || ''; } catch (_) { return ''; } };
  const setCode = (c) => { try { c ? rawSet(CODE_KEY, c) : rawRemove(CODE_KEY); } catch (_) {} };
  const enabled = () => configured() && !!getCode();

  // Is the user mid-edit? Don't clobber an open editor with incoming data.
  const editingNow = () => {
    const a = document.activeElement;
    if (!a) return false;
    if (a.isContentEditable) return true;
    const t = (a.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || t === 'select';
  };

  // ── Collect / scatter the synced bundle ───────────────────────────────────
  function collect() {
    const bundle = {};
    for (let i = 0; i < LS.length; i++) {
      const k = LS.key(i);
      if (isSynced(k)) bundle[k] = rawGet(k);
    }
    return bundle;
  }

  // Write a merged bundle back into localStorage (guarded so our own writes
  // don't re-trigger a push). Removes synced keys absent from the bundle.
  function scatter(bundle) {
    applying = true;
    try {
      const present = new Set(Object.keys(bundle));
      const toRemove = [];
      for (let i = 0; i < LS.length; i++) {
        const k = LS.key(i);
        if (isSynced(k) && !present.has(k)) toRemove.push(k);
      }
      toRemove.forEach((k) => rawRemove(k));
      Object.keys(bundle).forEach((k) => {
        if (bundle[k] == null) rawRemove(k); else rawSet(k, bundle[k]);
      });
    } finally { applying = false; }
  }

  // ── Merge ─────────────────────────────────────────────────────────────────
  const parse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  const uniq = (arr) => [...new Set(arr)];

  // Deep merge for the central progress object: never lose progress on either side.
  function mergeProgress(localRaw, remoteRaw) {
    const L = parse(localRaw) || {}, R = parse(remoteRaw) || {};
    const out = {
      visited: uniq([...(R.visited || []), ...(L.visited || [])]),
      quiz: {}, decisions: {}, selfExplain: {}, srs: {},
    };
    const ids = uniq([...Object.keys(R.quiz || {}), ...Object.keys(L.quiz || {})]);
    ids.forEach((id) => {
      const lq = (L.quiz || {})[id], rq = (R.quiz || {})[id];
      if (lq && rq) out.quiz[id] = { best: Math.max(lq.best || 0, rq.best || 0), total: lq.total || rq.total };
      else out.quiz[id] = lq || rq;
    });
    ['decisions', 'selfExplain'].forEach((cat) => {
      const keys = uniq([...Object.keys(R[cat] || {}), ...Object.keys(L[cat] || {})]);
      keys.forEach((id) => { out[cat][id] = uniq([...((R[cat] || {})[id] || []), ...((L[cat] || {})[id] || [])]); });
    });
    out.srs = Object.assign({}, R.srs || {}, L.srs || {}); // local wins per card
    return JSON.stringify(out);
  }

  // 3-way merge against a common ancestor so two devices editing *different*
  // keys both survive.
  function mergeAll(base, local, remote) {
    base = base || {}; local = local || {}; remote = remote || {};
    const out = {};
    const keys = uniq([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const k of keys) {
      const b = base[k], l = local[k], r = remote[k];
      const inL = k in local, inR = k in remote;

      if (k === 'flink_progress_v1') { out[k] = mergeProgress(l, r); continue; }
      if (k === 'flink_done') { out[k] = JSON.stringify(uniq([...(parse(r) || []), ...(parse(l) || [])])); continue; }
      if (/^flink_quiz_/.test(k)) {
        const n = Math.max(Number(l ?? -Infinity), Number(r ?? -Infinity));
        out[k] = Number.isFinite(n) ? String(n) : (l ?? r); continue;
      }
      // deletions: gone on one side, unchanged on the other → honor the delete
      if (!inL && inR && r === b) continue;   // deleted locally
      if (!inR && inL && l === b) continue;    // deleted remotely
      // adds / edits: 3-way last-write-wins (local change beats stale remote)
      if (inL && l !== b) { out[k] = l; }
      else if (inR) { out[k] = r; }
      else if (inL) { out[k] = l; }
    }
    return out;
  }

  // ── Network ────────────────────────────────────────────────────────────────
  async function rpc(fn, body) {
    const { url, anonKey } = cfg();
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${fn} ${res.status}`);
    return res.json();
  }

  // ── Pull ─────────────────────────────────────────────────────────────────
  async function pull(opts = {}) {
    if (!enabled()) return;
    if (!opts.force && editingNow()) return;
    setStatus('syncing');
    try {
      const rows = await rpc('flink_get', { p_code: getCode() });
      const remote = (Array.isArray(rows) ? rows[0] : rows) || {};
      const remoteState = remote.state || {};
      const base = parse(rawGet(BASE_KEY)) || {};
      const local = collect();
      const merged = mergeAll(base, local, remoteState);

      const changed = JSON.stringify(merged) !== JSON.stringify(local);
      if (changed) {
        scatter(merged);
        // repaint listeners (interview edits, code edits, nav/dashboard)
        try { window.dispatchEvent(new CustomEvent('flink:cloud-refresh', { detail: merged })); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent('flink:progress')); } catch (_) {}
      }
      // base becomes the merged snapshot; push it up so remote matches too
      try { rawSet(BASE_KEY, JSON.stringify(merged)); } catch (_) {}
      await push({ immediate: true, silent: true, state: merged });
      setStatus('synced'); noteSync('pull');
    } catch (e) {
      setStatus('error');
    }
  }

  // ── Push ─────────────────────────────────────────────────────────────────
  function schedulePush() {
    if (!enabled() || applying) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(), PUSH_DEBOUNCE);
  }

  async function push(opts = {}) {
    if (!enabled()) return;
    const state = opts.state || collect();
    if (!opts.silent) setStatus('syncing');
    try {
      await rpc('flink_put', { p_code: getCode(), p_state: state });
      try { rawSet(BASE_KEY, JSON.stringify(state)); } catch (_) {}
      clearTimeout(retryTimer); retryTimer = null;
      if (!opts.silent) { setStatus('synced'); noteSync('push'); }
      return true;
    } catch (e) {
      if (!opts.silent) setStatus('error');
      if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = null; push(); }, PUSH_RETRY);
      return false;
    }
  }

  function flush() {
    if (!enabled()) return Promise.resolve(false);
    clearTimeout(pushTimer);
    return push({ immediate: true });
  }

  // ── Transparent local-change detection (wrap setItem/removeItem) ──────────
  LS.setItem = function (k, v) {
    rawSet(k, v);
    if (!applying && isSynced(k)) schedulePush();
  };
  LS.removeItem = function (k) {
    rawRemove(k);
    if (!applying && isSynced(k)) schedulePush();
  };

  // ── Lifecycle triggers ─────────────────────────────────────────────────────
  window.addEventListener('focus', () => pull());
  window.addEventListener('online', () => pull());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { lastHidden = Date.now(); }
    else if (Date.now() - lastHidden > HIDDEN_PULL_MS) { pull(); }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  function fmtTime(ts) {
    const d = new Date(ts); const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0'); return `${h}:${m}`;
  }

  window.Flink.cloud = {
    configured,
    enabled,
    getCode,
    setCode,
    generateCode() {
      const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
      let c = '';
      const rnd = (window.crypto && window.crypto.getRandomValues)
        ? Array.from(window.crypto.getRandomValues(new Uint32Array(12)))
        : Array.from({ length: 12 }, () => Math.floor(Math.random() * 1e9));
      rnd.forEach((n) => { c += alpha[n % alpha.length]; });
      return c; // 12 chars, well over the 8-char minimum
    },
    link(code) { setCode((code || '').trim()); if (enabled()) schedulePush(); },
    unlink() { setCode(''); try { rawRemove(BASE_KEY); } catch (_) {} setStatus('idle'); },
    pull,
    flush,
    onLocalChange() { schedulePush(); },
    status: () => status,
    lastSync: () => (lastSyncAt ? { at: lastSyncAt, kind: lastSyncKind } : null),
    syncLabel() {
      if (!enabled()) return configured() ? 'Not linked' : 'Cloud sync off';
      if (!lastSyncAt) return 'Linked — not synced yet';
      return `Last synced ${fmtTime(lastSyncAt)} (${lastSyncKind === 'push' ? 'saved' : 'pulled'})`;
    },
    onStatus(cb) { statusSubs.add(cb); return () => statusSubs.delete(cb); },
    onSync(cb) { syncSubs.add(cb); return () => syncSubs.delete(cb); },
  };

  // Boot: pull once on load if linked.
  if (enabled()) setTimeout(() => pull({ force: false }), 400);
})();
