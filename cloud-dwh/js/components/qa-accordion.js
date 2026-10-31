/* ============================================================
   Q&A Accordion — reusable collapsible interview Q&A list.
   Accepts items shaped as {q,a} or {question,answer} with an
   optional `difficulty` / `category`. Fully keyboard + a11y.
   ============================================================ */

(function () {
  'use strict';

  let _uid = 0;

  const QAAccordion = {
    /**
     * @param {Array} items  [{q|question, a|answer, difficulty?, category?}]
     * @param {Object} [opts] { title?: string }
     * @returns {HTMLElement}
     */
    create(items, opts = {}) {
      const wrap = document.createElement('div');
      wrap.className = 'qa-accordion';
      if (!Array.isArray(items) || !items.length) return wrap;

      if (opts.title) {
        const h = document.createElement('div');
        h.className = 'qa-accordion-title';
        h.textContent = opts.title;
        wrap.appendChild(h);
      }

      const notePrefix = opts.notePrefix || (document.documentElement.dataset.platform || 'qa');

      items.forEach((it) => {
        const q = it.q || it.question || '';
        const a = it.a || it.answer || '';
        if (!q) return;
        const diff = it.difficulty || '';
        const id = 'qa' + (++_uid);
        const btnId = id + '-b';
        const panelId = id + '-p';
        const noteKey = notePrefix + '-' + _hash(q);

        const item = document.createElement('div');
        item.className = 'qa-item';
        item.innerHTML = `
          <button class="qa-q" id="${btnId}" aria-expanded="false" aria-controls="${panelId}">
            <span class="qa-q-text">${_esc(q)}</span>
            <span class="qa-note-dot" title="You have a note on this question" hidden>●</span>
            ${diff ? `<span class="qa-diff qa-diff-${_esc(diff)}">${_esc(diff)}</span>` : ''}
            <svg class="qa-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="qa-a" id="${panelId}" role="region" aria-labelledby="${btnId}" hidden>
            <div class="qa-a-inner">${_answer(a)}</div>
            <div class="qa-note" data-note-key="${_esc(noteKey)}"></div>
          </div>`;

        const btn = item.querySelector('.qa-q');
        const panel = item.querySelector('.qa-a');
        const dot = item.querySelector('.qa-note-dot');
        const noteBox = item.querySelector('.qa-note');

        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!open));
          panel.hidden = open;
          item.classList.toggle('open', !open);
        });

        _mountNote(noteBox, noteKey, dot);
        wrap.appendChild(item);
      });

      return wrap;
    },
  };

  /* ── Per-card "My notes" (synced via the cdwh- keyspace) ─────── */
  const NOTE_PREFIX = 'cdwh-note:';

  function _loadNote(key) { try { return localStorage.getItem(NOTE_PREFIX + key) || ''; } catch (_) { return ''; } }
  function _saveNote(key, val) {
    try {
      if (val) localStorage.setItem(NOTE_PREFIX + key, val);
      else localStorage.removeItem(NOTE_PREFIX + key);
    } catch (_) {}
  }
  function _hash(str) {
    let h = 5381; str = String(str);
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function _mountNote(box, key, dot) {
    const render = () => {
      const note = _loadNote(key);
      if (dot) dot.hidden = !note;
      if (note) {
        box.innerHTML = `
          <div class="qa-note-head"><span class="qa-note-label">My notes</span>
            <span class="qa-note-actions"><button class="qa-note-btn" data-n="edit">Edit</button><button class="qa-note-btn qa-note-clear" data-n="clear">Clear</button></span>
          </div>
          <div class="qa-note-body">${_answer(note)}</div>`;
      } else {
        box.innerHTML = `<button class="qa-note-add" data-n="add">+ Add a note</button>`;
      }
    };
    const edit = () => {
      const note = _loadNote(key);
      box.innerHTML = `
        <div class="qa-note-head"><span class="qa-note-label">My notes</span></div>
        <textarea class="qa-note-editor" placeholder="Jot your own answer, mnemonic, or follow-up…">${_esc(note)}</textarea>
        <div class="qa-note-edit-actions"><button class="qa-note-btn qa-note-save" data-n="save">Save</button><button class="qa-note-btn" data-n="cancel">Cancel</button></div>`;
      const ta = box.querySelector('.qa-note-editor');
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(ta.value); }
        else if (e.key === 'Escape') { e.preventDefault(); render(); }
      });
    };
    const commit = (val) => { _saveNote(key, (val || '').trim()); render(); };

    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      const act = b.getAttribute('data-n');
      if (act === 'add' || act === 'edit') edit();
      else if (act === 'save') commit(box.querySelector('.qa-note-editor').value);
      else if (act === 'cancel') render();
      else if (act === 'clear') { _saveNote(key, ''); render(); }
    });

    // Live re-apply when a note arrives from another device — but never while
    // this card's editor is focused.
    window.addEventListener('clouddwh:state-refresh', () => {
      if (box.querySelector('.qa-note-editor') === document.activeElement) return;
      render();
    });

    render();
  }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  // Escape, then preserve intentional line breaks in longer answers.
  function _answer(s) { return _esc(s).replace(/\n/g, '<br>'); }

  window.CDWH = window.CDWH || {};
  window.CDWH.QAAccordion = QAAccordion;
})();
