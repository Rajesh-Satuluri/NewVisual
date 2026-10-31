/* ============================================================
   Q&A Accordion — reusable collapsible interview Q&A list.
   Accepts items shaped as {q,a} or {question,answer} with an
   optional `difficulty` / `category`. Fully keyboard + a11y.

   Each card's question AND answer are editable in place. Edits
   are stored under the synced `cdwh-qaedit:` keyspace, so they
   ride cloud sync + export/import and survive across devices.
   The original curated text is never mutated — "Reset" drops the
   override and the original curated Q&A returns.
   ============================================================ */

(function () {
  'use strict';

  let _uid = 0;

  const QAAccordion = {
    /**
     * @param {Array} items  [{q|question, a|answer, difficulty?, category?}]
     * @param {Object} [opts] { title?: string, editPrefix?: string }
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

      // Back-compat: notePrefix was the old name for this.
      const editPrefix = opts.editPrefix || opts.notePrefix ||
        (document.documentElement.dataset.platform || 'qa');

      items.forEach((it) => {
        const origQ = it.q || it.question || '';
        const origA = it.a || it.answer || '';
        if (!origQ) return;
        const diff = it.difficulty || '';
        const id = 'qa' + (++_uid);
        const btnId = id + '-b';
        const panelId = id + '-p';
        // Key is hashed from the ORIGINAL question so it stays stable
        // even after the user edits the question text.
        const editKey = editPrefix + '-' + _hash(origQ);

        const item = document.createElement('div');
        item.className = 'qa-item';
        item.innerHTML = `
          <button class="qa-q" id="${btnId}" aria-expanded="false" aria-controls="${panelId}">
            <span class="qa-q-text"></span>
            <span class="qa-edit-dot" title="You've edited this question" hidden>●</span>
            ${diff ? `<span class="qa-diff qa-diff-${_esc(diff)}">${_esc(diff)}</span>` : ''}
            <svg class="qa-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="qa-a" id="${panelId}" role="region" aria-labelledby="${btnId}" hidden>
            <div class="qa-a-inner"></div>
            <div class="qa-edit" data-edit-key="${_esc(editKey)}"></div>
          </div>`;

        const btn = item.querySelector('.qa-q');
        const panel = item.querySelector('.qa-a');

        btn.addEventListener('click', (e) => {
          // Don't toggle when interacting with controls inside the question row.
          if (e.target.closest('.qa-diff')) return;
          const open = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!open));
          panel.hidden = open;
          item.classList.toggle('open', !open);
        });

        _mountEditable(item, editKey, { q: origQ, a: origA });
        wrap.appendChild(item);
      });

      return wrap;
    },
  };

  /* ── Editable Q&A overrides (synced via the cdwh- keyspace) ───── */
  const EDIT_PREFIX = 'cdwh-qaedit:';

  function _loadEdit(key) {
    try {
      const raw = localStorage.getItem(EDIT_PREFIX + key);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : null;
    } catch (_) { return null; }
  }
  function _saveEdit(key, obj) {
    try {
      if (obj && (obj.q != null || obj.a != null)) {
        localStorage.setItem(EDIT_PREFIX + key, JSON.stringify(obj));
      } else {
        localStorage.removeItem(EDIT_PREFIX + key);
      }
    } catch (_) {}
  }
  function _hash(str) {
    let h = 5381; str = String(str);
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function _mountEditable(item, key, orig) {
    const qText = item.querySelector('.qa-q-text');
    const dot = item.querySelector('.qa-edit-dot');
    const aInner = item.querySelector('.qa-a-inner');
    const editBox = item.querySelector('.qa-edit');

    // Resolve the currently-displayed values (override wins, field by field).
    const current = () => {
      const ov = _loadEdit(key) || {};
      return {
        q: (ov.q != null && ov.q !== '') ? ov.q : orig.q,
        a: (ov.a != null && ov.a !== '') ? ov.a : orig.a,
        edited: !!(ov.q != null && ov.q !== '' && ov.q !== orig.q) ||
                !!(ov.a != null && ov.a !== '' && ov.a !== orig.a),
      };
    };

    const render = () => {
      const c = current();
      qText.textContent = c.q;
      aInner.innerHTML = _answer(c.a) + (c.edited ? ' <span class="qa-edited-badge">edited</span>' : '');
      if (dot) dot.hidden = !c.edited;
      editBox.innerHTML = c.edited
        ? `<button class="qa-edit-btn" data-e="edit">${_pencil()} Edit</button>
           <button class="qa-edit-btn qa-edit-reset" data-e="reset">Reset to original</button>`
        : `<button class="qa-edit-btn" data-e="edit">${_pencil()} Edit question &amp; answer</button>`;
    };

    const edit = () => {
      const c = current();
      editBox.innerHTML = `
        <div class="qa-edit-field">
          <label class="qa-edit-label">Question</label>
          <textarea class="qa-edit-ta qa-edit-q" rows="2">${_esc(c.q)}</textarea>
        </div>
        <div class="qa-edit-field">
          <label class="qa-edit-label">Answer</label>
          <textarea class="qa-edit-ta qa-edit-a" rows="5">${_esc(c.a)}</textarea>
        </div>
        <div class="qa-edit-actions">
          <button class="qa-edit-btn qa-edit-save" data-e="save">Save</button>
          <button class="qa-edit-btn" data-e="cancel">Cancel</button>
          <button class="qa-edit-btn qa-edit-reset" data-e="reset">Reset to original</button>
        </div>`;
      const qa = editBox.querySelector('.qa-edit-q');
      qa.focus();
      editBox.querySelectorAll('.qa-edit-ta').forEach((ta) => {
        ta.addEventListener('keydown', (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); render(); }
        });
      });
    };

    const commit = () => {
      const q = (editBox.querySelector('.qa-edit-q').value || '').trim();
      const a = (editBox.querySelector('.qa-edit-a').value || '').trim();
      // Only store the fields that actually diverge from the original, so an
      // untouched field keeps tracking future curated-content updates.
      const obj = {};
      if (q && q !== orig.q) obj.q = q;
      if (a && a !== orig.a) obj.a = a;
      _saveEdit(key, (obj.q != null || obj.a != null) ? obj : null);
      render();
    };

    editBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const act = b.getAttribute('data-e');
      if (act === 'edit') edit();
      else if (act === 'save') commit();
      else if (act === 'cancel') render();
      else if (act === 'reset') { _saveEdit(key, null); render(); }
    });

    // Live re-apply when an edit arrives from another device — but never while
    // this card's editor is focused (don't stomp an in-progress edit).
    window.addEventListener('clouddwh:state-refresh', () => {
      if (editBox.querySelector('.qa-edit-ta') &&
          editBox.contains(document.activeElement)) return;
      render();
    });

    render();
  }

  function _pencil() {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  // Escape, then preserve intentional line breaks in longer answers.
  function _answer(s) { return _esc(s).replace(/\n/g, '<br>'); }

  window.CDWH = window.CDWH || {};
  window.CDWH.QAAccordion = QAAccordion;
})();
