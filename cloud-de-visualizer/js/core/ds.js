/* ============================================================
   Design System runtime helpers (Phase 1) — TV.DS.

   Small, dependency-free imperative builders for the primitives in
   css/design-system.css: HTML escaping, copy-to-clipboard buttons,
   accessible modal + confirm dialog, drawer, progress ring markup,
   skeleton markup, and a toast shim that reuses the app's existing
   notifier when present. ADDITIVE — nothing here touches existing
   modules; later phases opt in by calling TV.DS.*.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  if (TV.DS) return;

  const d = document;
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Progress ring / skeleton markup (pure strings) ── */
  function ring(pct, label) {
    const v = Math.max(0, Math.min(100, Math.round(pct || 0)));
    return `<span class="ds-ring" style="--v:${v}" role="img" aria-label="${esc(label || v + '%')}"><span>${label != null ? esc(label) : v + '%'}</span></span>`;
  }
  function skeleton(w, h) {
    return `<span class="ds-skel" style="display:block;width:${esc(w || '100%')};height:${esc(h || '14px')}"></span>`;
  }

  /* ── Copy-to-clipboard ── */
  function copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    } catch (e) { /* fall through */ }
    try {
      const ta = d.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      d.body.appendChild(ta); ta.select(); d.execCommand('copy'); d.body.removeChild(ta);
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }
  /* Attaches copy behavior to a button that sits next to/over a code source. */
  function wireCopy(btn, getText) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      copy(typeof getText === 'function' ? getText() : getText).then(function () {
        const old = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('is-ok');
        setTimeout(function () { btn.textContent = old; btn.classList.remove('is-ok'); }, 1200);
        toast('Copied to clipboard', { type: 'success' });
      }).catch(function () { toast('Copy failed', { type: 'error' }); });
    });
  }

  /* ── Toast (reuse existing notifier if the app provides one) ── */
  function toast(msg, opts) {
    opts = opts || {};
    const IV = window.IcebergViz;
    if (IV && typeof IV.toast === 'function') return IV.toast(msg, opts);
    if (TV && typeof TV.toast === 'function') return TV.toast(msg, opts);
    let host = d.querySelector('.ds-toasts');
    if (!host) { host = d.createElement('div'); host.className = 'ds-toasts'; host.setAttribute('aria-live', 'polite'); d.body.appendChild(host); }
    const t = d.createElement('div');
    t.className = 'ds-toast' + (opts.type ? ' ds-toast--' + opts.type : '');
    t.textContent = msg; host.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.duration || 2600);
  }

  /* ── Focus trap for modal/drawer ── */
  function trap(container, onEscape) {
    function onKey(e) {
      if (e.key === 'Escape') { onEscape && onEscape(); return; }
      if (e.key !== 'Tab') return;
      const f = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  }

  /* ── Modal ── bodyHTML is trusted markup the caller built. */
  function modal(opts) {
    opts = opts || {};
    const prevFocus = d.activeElement;
    const overlay = d.createElement('div'); overlay.className = 'ds-overlay';
    const box = d.createElement('div'); box.className = 'ds-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    if (opts.title) box.setAttribute('aria-label', opts.title);
    box.innerHTML =
      (opts.title ? `<h2 style="margin:0 0 12px;font:600 var(--text-lg) var(--font-ui);color:var(--ds-text)">${esc(opts.title)}</h2>` : '') +
      `<div class="ds-modal-body">${opts.bodyHTML || ''}</div>`;
    overlay.appendChild(box);
    function close() { untrap(); overlay.remove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); opts.onClose && opts.onClose(); }
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay && opts.dismissible !== false) close(); });
    const untrap = trap(box, function () { if (opts.dismissible !== false) close(); });
    d.body.appendChild(overlay);
    const focusable = box.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusable || box).focus && (focusable || box).setAttribute && (focusable ? focusable.focus() : null);
    return { el: box, close: close };
  }

  /* ── Confirm dialog (destructive-action guard) ── */
  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      // Single-settle guard: whichever of ok / cancel / dismiss fires first wins.
      // (close() triggers onClose, so the OK handler must settle BEFORE closing.)
      let settled = false;
      const done = function (v) { if (!settled) { settled = true; resolve(v); } };
      const body =
        `<p style="margin:0 0 16px;color:var(--ds-text-2)">${esc(opts.message || 'Are you sure?')}</p>` +
        `<div style="display:flex;gap:8px;justify-content:flex-end">` +
        `<button class="ds-btn" data-act="cancel">${esc(opts.cancelText || 'Cancel')}</button>` +
        `<button class="ds-btn ${opts.danger ? 'ds-btn--danger' : 'ds-btn--primary'}" data-act="ok">${esc(opts.confirmText || 'Confirm')}</button>` +
        `</div>`;
      const m = modal({ title: opts.title || 'Please confirm', bodyHTML: body, dismissible: true, onClose: function () { done(false); } });
      m.el.querySelector('[data-act="cancel"]').addEventListener('click', function () { done(false); m.close(); });
      m.el.querySelector('[data-act="ok"]').addEventListener('click', function () { done(true); m.close(); });
    });
  }

  TV.DS = { esc: esc, ring: ring, skeleton: skeleton, copy: copy, wireCopy: wireCopy, toast: toast, modal: modal, confirm: confirm, trap: trap };
})();
