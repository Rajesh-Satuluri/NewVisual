/*
 * cloudsync-ui.js — the settings control for cross-device cloud sync.
 *
 * Adds a ☁ button to the top bar that opens a small dialog where you set your
 * shared sync code, link the device, sync on demand, or disconnect. All the
 * actual syncing lives in js/core/cloudsync.js; this file is purely the UI and
 * is self-contained (scoped styles, ES5-safe).
 */
(function () {
  'use strict';
  var C = (window.CDEVIZ = window.CDEVIZ || {});

  var CSS = [
    '.cs-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;',
    '  background:rgba(4,10,20,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}',
    '.cs-overlay[hidden]{display:none;}',
    '.cs-card{width:100%;max-width:440px;box-sizing:border-box;background:var(--bg-1,#121a2a);color:var(--text-primary,#e7eef7);',
    '  border:1px solid var(--border-default,rgba(255,255,255,.12));border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);',
    '  padding:20px 20px 18px;font:14px/1.5 inherit;}',
    '.cs-card h2{margin:0 0 4px;font-size:17px;display:flex;align-items:center;gap:8px;}',
    '.cs-sub{margin:0 0 14px;opacity:.75;font-size:12.5px;}',
    '.cs-row{display:flex;gap:8px;margin:10px 0;}',
    '.cs-row input{flex:1;min-width:0;padding:9px 11px;border-radius:9px;border:1px solid var(--border-default,rgba(255,255,255,.18));',
    '  background:var(--bg-2,rgba(0,0,0,.25));color:inherit;font:600 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.5px;}',
    '.cs-btn{cursor:pointer;border-radius:9px;border:1px solid transparent;padding:9px 13px;font:600 13px/1 inherit;white-space:nowrap;}',
    '.cs-btn-primary{background:var(--brand,#0a6fd0);color:#fff;}',
    '.cs-btn-primary:hover{filter:brightness(1.1);}',
    '.cs-btn-ghost{background:var(--bg-2,rgba(255,255,255,.08));color:inherit;}',
    '.cs-btn-ghost:hover{filter:brightness(1.15);}',
    '.cs-btn-danger{background:transparent;color:#ff8a8a;border-color:rgba(255,138,138,.4);}',
    '.cs-btn-danger:hover{background:rgba(255,138,138,.12);}',
    '.cs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}',
    '.cs-actions .cs-spacer{flex:1;}',
    '.cs-status{margin-top:12px;font-size:12.5px;min-height:1.2em;opacity:.9;}',
    '.cs-note{margin-top:12px;font-size:12px;opacity:.7;}',
    '.cs-warn{margin:10px 0;padding:9px 11px;border-radius:9px;font-size:12.5px;',
    '  background:rgba(255,196,0,.12);border:1px solid rgba(255,196,0,.35);}',
    '.cs-warn code{font-family:ui-monospace,Menlo,monospace;}'
  ].join('\n');

  function injectStyleOnce() {
    if (document.getElementById('cs-style')) return;
    var st = document.createElement('style');
    st.id = 'cs-style'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  var overlay = null, codeInput = null, statusEl = null;

  function buildModal() {
    if (overlay) return overlay;
    injectStyleOnce();
    overlay = document.createElement('div');
    overlay.className = 'cs-overlay';
    overlay.setAttribute('hidden', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cloud sync settings');

    var card = document.createElement('div');
    card.className = 'cs-card';
    overlay.appendChild(card);

    var h = document.createElement('h2'); h.textContent = '☁ Cloud sync'; card.appendChild(h);

    var sub = document.createElement('p');
    sub.className = 'cs-sub';
    sub.textContent = 'Sync your learning progress and your interview Q&A edits across devices. Type the same sync code on every device and they share the same data.';
    card.appendChild(sub);

    if (!C.cloud || !C.cloud.configured()) {
      var warn = document.createElement('div');
      warn.className = 'cs-warn';
      warn.innerHTML = 'Backend not configured yet. Add your Supabase <code>url</code> and <code>anonKey</code> in <code>supabase-config.js</code> and run <code>supabase/schema.sql</code> once, then reload.';
      card.appendChild(warn);
    }

    var row = document.createElement('div');
    row.className = 'cs-row';
    codeInput = document.createElement('input');
    codeInput.type = 'text'; codeInput.placeholder = 'your-sync-code';
    codeInput.autocomplete = 'off'; codeInput.spellcheck = false;
    codeInput.setAttribute('aria-label', 'Sync code');
    var genBtn = document.createElement('button');
    genBtn.className = 'cs-btn cs-btn-ghost'; genBtn.type = 'button'; genBtn.textContent = 'Generate';
    genBtn.addEventListener('click', function () {
      if (C.cloud) codeInput.value = C.cloud.generateCode();
      codeInput.focus(); codeInput.select();
    });
    row.appendChild(codeInput); row.appendChild(genBtn); card.appendChild(row);

    statusEl = document.createElement('div'); statusEl.className = 'cs-status'; card.appendChild(statusEl);

    var actions = document.createElement('div'); actions.className = 'cs-actions';

    var linkBtn = document.createElement('button');
    linkBtn.className = 'cs-btn cs-btn-primary'; linkBtn.type = 'button'; linkBtn.textContent = 'Link & sync';
    linkBtn.addEventListener('click', function () {
      var code = (codeInput.value || '').trim();
      if (code.replace(/-/g, '').length < 8) { setStatus('Code must be at least 8 characters.'); return; }
      if (C.cloud) C.cloud.link(code);
    });

    var syncBtn = document.createElement('button');
    syncBtn.className = 'cs-btn cs-btn-ghost'; syncBtn.type = 'button'; syncBtn.textContent = 'Sync now';
    syncBtn.addEventListener('click', function () { if (C.cloud) C.cloud.pull({ force: true }); });

    var discBtn = document.createElement('button');
    discBtn.className = 'cs-btn cs-btn-danger'; discBtn.type = 'button'; discBtn.textContent = 'Disconnect';
    discBtn.addEventListener('click', function () { if (C.cloud) C.cloud.unlink(); codeInput.value = ''; });

    var spacer = document.createElement('div'); spacer.className = 'cs-spacer';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'cs-btn cs-btn-ghost'; closeBtn.type = 'button'; closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', close);

    actions.appendChild(linkBtn); actions.appendChild(syncBtn); actions.appendChild(discBtn);
    actions.appendChild(spacer); actions.appendChild(closeBtn);
    card.appendChild(actions);

    var note = document.createElement('p');
    note.className = 'cs-note';
    note.textContent = 'Keep your sync code private — anyone who has it can read and change all of your synced data.';
    card.appendChild(note);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.hasAttribute('hidden') && e.key === 'Escape') close();
    });
    if (C.cloud && C.cloud.onStatus) C.cloud.onStatus(setStatus);
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function setStatus(txt) { if (statusEl) statusEl.textContent = txt || ''; }

  function open() {
    buildModal();
    if (C.cloud) codeInput.value = C.cloud.getCode() || '';
    setStatus(C.cloud ? C.cloud.status() : '');
    overlay.removeAttribute('hidden');
    codeInput.focus();
  }
  function close() { if (overlay) overlay.setAttribute('hidden', ''); }
  C.openSyncDialog = open;

  // ---- inject the ☁ button into the top bar -------------------------------
  function addTopbarButton() {
    var bar = document.querySelector('.topbar-right');
    if (!bar || document.getElementById('cloudSyncBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'cloudSyncBtn';
    btn.className = 'btn-icon';
    btn.type = 'button';
    btn.title = 'Cloud sync — study progress & Q&A edits across devices';
    btn.setAttribute('data-tooltip', 'Cloud sync');
    btn.setAttribute('aria-label', 'Cloud sync settings');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16" aria-hidden="true">' +
      '<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.5 4 4 0 0 0 7 17.5"/>' +
      '<path d="M12 12v8m0-8l-2.2 2.2M12 12l2.2 2.2"/></svg>';
    btn.addEventListener('click', open);
    var anchor = document.getElementById('docs-link');
    if (anchor && anchor.parentNode === bar) bar.insertBefore(btn, anchor);
    else bar.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addTopbarButton);
  else addTopbarButton();
})();
