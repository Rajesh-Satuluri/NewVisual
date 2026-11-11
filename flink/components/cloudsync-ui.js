// ─────────────────────────────────────────────────────────────────────────
// Cloud-sync UI (classic script). Adds a header button + a small modal to
// generate/link/unlink a sync code. No-op if the engine isn't present.
// Exposes window.Flink.openCloudSync().
// ─────────────────────────────────────────────────────────────────────────
(() => {
  'use strict';
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(() => {
    const cloud = window.Flink && window.Flink.cloud;
    if (!cloud) return;

    // ── Header button ─────────────────────────────────────────────────────────
    const actions = document.querySelector('.header-actions');
    if (actions && !document.getElementById('cloud-sync-btn')) {
      const btn = document.createElement('button');
      btn.id = 'cloud-sync-btn';
      btn.className = 'icon-btn';
      btn.type = 'button';
      btn.title = 'Sync across devices';
      btn.setAttribute('aria-label', 'Sync across devices');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>';
      btn.addEventListener('click', openModal);
      actions.insertBefore(btn, actions.firstChild);
    }

    // ── Modal ─────────────────────────────────────────────────────────────────
    let overlay = null;

    function buildModal() {
      overlay = document.createElement('div');
      overlay.className = 'cs-overlay';
      overlay.innerHTML = `
        <div class="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-title">
          <button class="cs-close" type="button" aria-label="Close">×</button>
          <h2 id="cs-title" class="cs-head">☁ Sync across devices</h2>
          <p class="cs-sub">Your progress, quiz scores and edits follow you to any device — no login. Enter the same <strong>sync code</strong> on each device. The code never leaves your browser in clear; keep it private.</p>
          <div class="cs-body"></div>
        </div>`;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
      overlay.querySelector('.cs-close').addEventListener('click', closeModal);
      document.addEventListener('keydown', escClose);
      document.body.appendChild(overlay);
    }

    function escClose(e) { if (e.key === 'Escape') closeModal(); }

    function render() {
      const body = overlay.querySelector('.cs-body');
      if (!cloud.configured()) {
        body.innerHTML = `<div class="cs-note cs-warn">Cloud sync isn't configured for this deployment yet. Add your Supabase URL + key in <code>supabase-config.js</code> to turn it on. Everything still works and saves locally on this device.</div>`;
        return;
      }
      const linked = cloud.enabled();
      body.innerHTML = `
        <div class="cs-row">
          <input class="cs-input" type="text" spellcheck="false" autocomplete="off"
                 placeholder="your sync code (8+ characters)" value="${linked ? cloud.getCode() : ''}" />
          <button class="cs-gen" type="button" title="Generate a strong code">Generate</button>
        </div>
        <div class="cs-actions">
          ${linked
            ? `<button class="cs-unlink btn" type="button">Unlink this device</button>`
            : `<button class="cs-link btn btn-primary" type="button">Link this device</button>`}
        </div>
        <div class="cs-status" aria-live="polite">${cloud.syncLabel()}</div>
        ${linked ? `<p class="cs-hint">Open this tool on another device and enter the same code to pull your data there.</p>` : ''}`;

      const input = body.querySelector('.cs-input');
      body.querySelector('.cs-gen').addEventListener('click', () => { input.value = cloud.generateCode(); input.focus(); });
      const linkBtn = body.querySelector('.cs-link');
      if (linkBtn) linkBtn.addEventListener('click', async () => {
        const code = input.value.trim();
        if (code.length < 8) { setStatus('Code must be at least 8 characters.'); return; }
        cloud.link(code);
        setStatus('Linking…');
        await cloud.pull({ force: true });
        render();
      });
      const unlinkBtn = body.querySelector('.cs-unlink');
      if (unlinkBtn) unlinkBtn.addEventListener('click', () => { cloud.unlink(); render(); });
    }

    function setStatus(text) {
      const el = overlay && overlay.querySelector('.cs-status');
      if (el) el.textContent = text;
    }

    let unsubs = [];
    function openModal() {
      if (!overlay) buildModal();
      overlay.classList.add('open');
      render();
      unsubs.push(cloud.onStatus(() => { const el = overlay.querySelector('.cs-status'); if (el) el.textContent = cloud.syncLabel(); }));
      unsubs.push(cloud.onSync(() => { const el = overlay.querySelector('.cs-status'); if (el) el.textContent = cloud.syncLabel(); }));
    }
    function closeModal() {
      if (overlay) overlay.classList.remove('open');
      unsubs.forEach((u) => { try { u(); } catch (_) {} });
      unsubs = [];
    }

    window.Flink.openCloudSync = openModal;
  });
})();
