/* ============================================================
   State I/O — export / import all local progress as JSON.
   ------------------------------------------------------------
   Backs up every `cdwh-*` localStorage key (theme, platform,
   visited modules, progress records, quiz best scores, code-block
   edits, UI prefs) into a single downloadable file, and restores
   it with a Merge (default, progress-preserving) or Replace mode.

   No backend, no dependencies. Self-wires a top-bar button.
   Public API: window.CDWH.StateIO.{export, open}
   ============================================================ */
(function () {
  'use strict';

  const PREFIX = 'cdwh-';
  const FILE_TAG = 'clouddwh-progress';
  const SCHEMA = 1;

  /* ── Collect / apply ─────────────────────────────────────── */
  function _allKeys() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k);
      }
    } catch (_) {}
    return out;
  }

  function _collect() {
    const data = {};
    _allKeys().forEach(k => { try { data[k] = localStorage.getItem(k); } catch (_) {} });
    return data;
  }

  function exportState() {
    const payload = {
      tool: 'cloud-dwh',
      schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      data: _collect(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `${FILE_TAG}-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Object.keys(payload.data).length;
  }

  /* Parse a stored JSON value; returns {ok, val}. */
  function _json(raw) { try { return { ok: true, val: JSON.parse(raw) }; } catch (_) { return { ok: false }; } }

  /* Progress-preserving merge of one incoming key against local. */
  function _mergeValue(key, localRaw, incomingRaw) {
    if (localRaw == null) return incomingRaw;
    if (incomingRaw === localRaw) return localRaw;

    // Quiz best scores: numeric max wins.
    if (/quiz/.test(key)) {
      const a = Number(localRaw), b = Number(incomingRaw);
      if (!isNaN(a) && !isNaN(b)) return String(Math.max(a, b));
    }
    // Visited lists: union of arrays (order-independent).
    if (/visited/.test(key)) {
      const la = _json(localRaw), ia = _json(incomingRaw);
      if (la.ok && ia.ok && Array.isArray(la.val) && Array.isArray(ia.val)) {
        return JSON.stringify([...new Set([...la.val, ...ia.val])]);
      }
    }
    // Progress records ({items:{id:{done,correct,ts}}}): item-wise merge.
    if (/-prog-/.test(key)) {
      const lo = _json(localRaw), io = _json(incomingRaw);
      if (lo.ok && io.ok && lo.val && io.val && lo.val.items && io.val.items) {
        const items = { ...lo.val.items };
        for (const id in io.val.items) {
          const a = items[id] || {}, b = io.val.items[id] || {};
          items[id] = {
            done: a.done === true || b.done === true,
            correct: a.correct === true || b.correct === true,
            ts: Math.max(a.ts || 0, b.ts || 0),
          };
        }
        return JSON.stringify({ ...lo.val, ...io.val, items });
      }
    }
    // Everything else: the imported copy wins (the user chose to import).
    return incomingRaw;
  }

  function applyImport(payload, mode) {
    if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
      throw new Error('Not a Cloud DWH backup file.');
    }
    const incoming = payload.data;

    if (mode === 'replace') {
      _allKeys().forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
      for (const k in incoming) { if (k.indexOf(PREFIX) === 0) { try { localStorage.setItem(k, incoming[k]); } catch (_) {} } }
    } else { // merge
      for (const k in incoming) {
        if (k.indexOf(PREFIX) !== 0) continue;
        try {
          const merged = _mergeValue(k, localStorage.getItem(k), incoming[k]);
          if (merged != null) localStorage.setItem(k, merged);
        } catch (_) {}
      }
    }
    window.dispatchEvent(new CustomEvent('clouddwh:state-refresh'));
    return Object.keys(incoming).filter(k => k.indexOf(PREFIX) === 0).length;
  }

  /* ── Cloud sync section (Supabase engine lives in cloudsync.js) ── */
  function _cloud() { return (window.CDWH && window.CDWH.cloud) || null; }

  function _cloudSectionHTML() {
    const c = _cloud();
    if (!c || !c.configured()) return ''; // sync not wired / not configured → hide
    const linked = c.enabled();
    return `
      <div class="sio-cloud" data-sio="cloud">
        <div class="sio-row-title">Cloud sync across devices</div>
        <div class="sio-row-sub">Share a secret code between devices — no login. Progress merges automatically (best score &amp; visited always kept).</div>
        <div class="sio-cloud-controls">
          <input type="text" data-sio="code" class="sio-code" placeholder="sync code (≥ 8 chars)" autocomplete="off" spellcheck="false" ${linked ? 'disabled' : ''} value="${linked ? _mask(c.getCode()) : ''}">
          <button class="btn" data-sio="gen" ${linked ? 'style="display:none"' : ''}>Generate</button>
          <button class="btn btn-primary" data-sio="link" ${linked ? 'style="display:none"' : ''}>Link</button>
          <button class="btn" data-sio="sync" ${linked ? '' : 'style="display:none"'}>Sync now</button>
          <button class="btn sio-danger" data-sio="unlink" ${linked ? '' : 'style="display:none"'}>Unlink</button>
        </div>
        <div class="sio-cloud-status" data-sio="cloud-status" aria-live="polite">${_esc(c.status() || (linked ? c.syncLabel() : ''))}</div>
      </div>`;
  }
  function _mask(code) { if (!code) return ''; return code.length <= 4 ? code : code.slice(0, 4) + '•'.repeat(Math.max(0, code.length - 4)); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  function _wireCloud(modal) {
    const c = _cloud();
    const root = modal.querySelector('[data-sio="cloud"]');
    if (!c || !root) return;
    const codeEl = root.querySelector('[data-sio="code"]');
    const statusEl = root.querySelector('[data-sio="cloud-status"]');
    const show = (sel, on) => { const el = root.querySelector(sel); if (el) el.style.display = on ? '' : 'none'; };
    const refresh = () => {
      const linked = c.enabled();
      show('[data-sio="gen"]', !linked); show('[data-sio="link"]', !linked);
      show('[data-sio="sync"]', linked); show('[data-sio="unlink"]', linked);
      codeEl.disabled = linked;
      if (linked) codeEl.value = _mask(c.getCode());
    };
    c.onStatus((txt) => { statusEl.textContent = txt; });
    c.onSync(() => { statusEl.textContent = c.syncLabel(); });
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-sio]') && e.target.closest('[data-sio]').getAttribute('data-sio');
      if (act === 'gen') { codeEl.value = c.generateCode(); codeEl.focus(); }
      else if (act === 'link') {
        const code = (codeEl.value || '').trim();
        if (code.length < 8) { statusEl.textContent = 'Code must be at least 8 characters.'; return; }
        statusEl.textContent = 'Linking…';
        Promise.resolve(c.link(code)).then(refresh);
      } else if (act === 'sync') { c.pull({ force: true }); }
      else if (act === 'unlink') { c.unlink(); refresh(); }
    });
  }

  /* ── UI ──────────────────────────────────────────────────── */
  function open() {
    let modal = document.getElementById('stateio-modal');
    if (modal) { modal.classList.add('visible'); return; }

    modal = document.createElement('div');
    modal.id = 'stateio-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Backup & restore progress');
    const count = _allKeys().length;
    modal.innerHTML = `
      <div class="modal-box" style="max-width:460px;">
        <div class="modal-header">
          <h2 class="modal-title">Backup &amp; restore</h2>
          <button class="btn-icon" data-sio="close" aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="sio-body">
          ${_cloudSectionHTML()}
          <p class="sio-note">Your progress lives only in this browser. Export a file to move it to another device or keep a backup — then import it anywhere.</p>
          <div class="sio-row">
            <div>
              <div class="sio-row-title">Export progress</div>
              <div class="sio-row-sub">${count} saved item${count === 1 ? '' : 's'} → JSON file</div>
            </div>
            <button class="btn btn-primary" data-sio="export">Download</button>
          </div>
          <div class="sio-row">
            <div>
              <div class="sio-row-title">Import progress</div>
              <div class="sio-row-sub">
                <label class="sio-mode"><input type="radio" name="sio-mode" value="merge" checked> Merge (keep best)</label>
                <label class="sio-mode"><input type="radio" name="sio-mode" value="replace"> Replace all</label>
              </div>
            </div>
            <button class="btn" data-sio="import">Choose file…</button>
          </div>
          <div class="sio-status" data-sio="status" aria-live="polite"></div>
        </div>
      </div>
      <input type="file" accept="application/json,.json" data-sio="file" style="display:none">`;
    document.body.appendChild(modal);

    const status = modal.querySelector('[data-sio="status"]');
    const fileInput = modal.querySelector('[data-sio="file"]');
    const say = (msg, kind) => { status.textContent = msg; status.className = 'sio-status' + (kind ? ' sio-' + kind : ''); };
    const close = () => modal.classList.remove('visible');

    modal.addEventListener('click', (e) => {
      if (e.target === modal) return close();
      const act = e.target.closest('[data-sio]') && e.target.closest('[data-sio]').getAttribute('data-sio');
      if (act === 'close') return close();
      if (act === 'export') { const n = exportState(); say(`Exported ${n} item${n === 1 ? '' : 's'}.`, 'ok'); }
      if (act === 'import') fileInput.click();
    });
    document.addEventListener('keydown', function esc(e) {
      if (!document.getElementById('stateio-modal')) return document.removeEventListener('keydown', esc);
      if (e.key === 'Escape') close();
    });

    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const mode = (modal.querySelector('input[name="sio-mode"]:checked') || {}).value || 'merge';
      const reader = new FileReader();
      reader.onload = () => {
        let payload;
        try { payload = JSON.parse(reader.result); } catch (_) { return say('That file is not valid JSON.', 'err'); }
        if (mode === 'replace' && !window.confirm('Replace ALL local progress with this file? This cannot be undone.')) { fileInput.value = ''; return; }
        try {
          const n = applyImport(payload, mode);
          say(`Imported ${n} item${n === 1 ? '' : 's'} (${mode}). Reloading…`, 'ok');
          setTimeout(() => location.reload(), 700);
        } catch (err) { say(err.message || 'Import failed.', 'err'); }
      };
      reader.onerror = () => say('Could not read that file.', 'err');
      reader.readAsText(f);
      fileInput.value = '';
    });

    _wireCloud(modal);
    modal.classList.add('visible');
  }

  /* ── Top-bar button ──────────────────────────────────────── */
  function _injectButton() {
    const bar = document.getElementById('top-bar-right');
    if (!bar || document.getElementById('stateio-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'stateio-btn';
    btn.className = 'btn-icon';
    btn.title = 'Backup & restore progress';
    btn.setAttribute('aria-label', 'Backup and restore progress');
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    btn.addEventListener('click', open);
    bar.insertBefore(btn, bar.firstChild);

    // Dedicated "Cloud sync" button (Spec 2) — only when sync is configured.
    const c = _cloud();
    if (c && c.configured() && !document.getElementById('cloudsync-btn')) {
      const cb = document.createElement('button');
      cb.id = 'cloudsync-btn';
      cb.className = 'btn-icon';
      cb.title = 'Cloud sync across devices';
      cb.setAttribute('aria-label', 'Cloud sync across devices');
      cb.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`;
      cb.addEventListener('click', openCloudSync);
      bar.insertBefore(cb, btn); // sits just before Backup & restore
      // Reflect "linked" state with a small accent dot.
      cb.classList.toggle('cloudsync-on', c.enabled());
      if (c.onSync) c.onSync(() => cb.classList.add('cloudsync-on'));
    }
  }

  /* Open the dialog and focus the Cloud sync section (Spec 2 discoverability). */
  function openCloudSync() {
    open();
    const modal = document.getElementById('stateio-modal');
    const sec = modal && modal.querySelector('[data-sio="cloud"]');
    if (!sec) return;
    try { sec.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    sec.classList.remove('sio-flash');
    // reflow so the animation re-triggers on repeated clicks
    void sec.offsetWidth;
    sec.classList.add('sio-flash');
    const code = sec.querySelector('[data-sio="code"]');
    if (code && !code.disabled) setTimeout(() => { try { code.focus(); } catch (_) {} }, 300);
  }

  function _init() { _injectButton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

  window.CDWH = window.CDWH || {};
  window.CDWH.StateIO = { export: exportState, open, applyImport };
  window.CDWH.openCloudSync = openCloudSync;
})();
