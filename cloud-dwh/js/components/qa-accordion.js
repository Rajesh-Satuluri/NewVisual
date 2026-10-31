/* ============================================================
   Q&A Accordion — reusable collapsible interview Q&A list.
   Accepts items shaped as {q,a} or {question,answer} with an
   optional `difficulty` / `category`. Fully keyboard + a11y.

   The question AND answer are edited IN PLACE — you edit the
   very text that's shown, not a separate form. Overrides are
   stored under the synced `cdwh-qaedit:` keyspace, so they ride
   cloud sync + export/import and survive across devices. The
   curated source text is never mutated — "Reset" drops the
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

      // Back-compat: notePrefix was an earlier name for this.
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
        // Key hashed from the ORIGINAL question so it stays stable even after
        // the user edits the question text.
        const editKey = editPrefix + '-' + _hash(origQ);

        const item = document.createElement('div');
        item.className = 'qa-item';
        // role=button (not <button>) so the question text can be contenteditable
        // in place — a native button can't host an editable caret.
        item.innerHTML = `
          <div class="qa-q" id="${btnId}" role="button" tabindex="0" aria-expanded="false" aria-controls="${panelId}">
            <span class="qa-q-text"></span>
            <span class="qa-edit-dot" title="You've edited this question" hidden>●</span>
            ${diff ? `<span class="qa-diff qa-diff-${_esc(diff)}">${_esc(diff)}</span>` : ''}
            <svg class="qa-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="qa-a" id="${panelId}" role="region" aria-labelledby="${btnId}" hidden>
            <div class="qa-a-inner"></div>
            <div class="qa-edit" data-edit-key="${_esc(editKey)}"></div>
          </div>`;

        const header = item.querySelector('.qa-q');
        const panel = item.querySelector('.qa-a');

        const setOpen = (open) => {
          header.setAttribute('aria-expanded', String(open));
          panel.hidden = !open;
          item.classList.toggle('open', open);
        };
        const toggle = () => {
          if (item.classList.contains('editing')) return;   // never collapse mid-edit
          setOpen(header.getAttribute('aria-expanded') !== 'true');
        };

        header.addEventListener('click', (e) => {
          // Don't toggle while editing or when clicking the editable text / badge.
          if (item.classList.contains('editing')) return;
          if (e.target.closest('.qa-q-text[contenteditable="true"]') || e.target.closest('.qa-diff')) return;
          toggle();
        });
        header.addEventListener('keydown', (e) => {
          if (item.classList.contains('editing')) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });

        _mountEditable(item, editKey, { q: origQ, a: origA }, setOpen);
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

  // Broadcast an edit so every other mounted accordion showing the SAME
  // question (same key) re-renders in place — the copy in a module's
  // Interview Questions section and the one in the aggregate Interview Prep
  // view stay in lockstep without a navigation.
  function _broadcast(key) {
    try {
      window.dispatchEvent(new CustomEvent('clouddwh:qaedit', { detail: { key: key } }));
    } catch (_) {}
  }

  function _caretEnd(el) {
    try {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (_) {}
  }

  function _mountEditable(item, key, orig, setOpen) {
    const qText = item.querySelector('.qa-q-text');
    const dot = item.querySelector('.qa-edit-dot');
    const aInner = item.querySelector('.qa-a-inner');
    const editBox = item.querySelector('.qa-edit');

    // Currently-displayed values (override wins, field by field).
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
      item.classList.remove('editing');
      qText.contentEditable = 'false';
      qText.classList.remove('qa-ce');
      qText.textContent = c.q;
      aInner.contentEditable = 'false';
      aInner.classList.remove('qa-ce');
      aInner.innerHTML = _answer(c.a) + (c.edited ? ' <span class="qa-edited-badge">edited</span>' : '');
      if (dot) dot.hidden = !c.edited;
      editBox.innerHTML = c.edited
        ? `<button class="qa-edit-btn" data-e="edit">${_pencil()} Edit</button>`
        : `<button class="qa-edit-btn" data-e="edit">${_pencil()} Edit in place</button>`;
    };

    const startEdit = () => {
      if (setOpen) setOpen(true);
      const c = current();
      item.classList.add('editing');
      // Make the shown text editable right where it sits.
      qText.textContent = c.q;
      qText.contentEditable = 'true';
      qText.classList.add('qa-ce');
      qText.spellcheck = true;
      aInner.innerHTML = _answer(c.a);          // WYSIWYG: edit the rendered answer, drop the badge
      aInner.contentEditable = 'true';
      aInner.classList.add('qa-ce');
      aInner.spellcheck = true;
      editBox.innerHTML = `
        <div class="qa-edit-hint">Editing in place — Esc to cancel</div>
        <div class="qa-edit-actions">
          <button class="qa-edit-btn qa-edit-save" data-e="save">Save</button>
          <button class="qa-edit-btn" data-e="cancel">Cancel</button>
        </div>`;
      qText.focus(); _caretEnd(qText);

      qText.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }       // question = single line
        else if (e.key === 'Escape') { e.preventDefault(); render(); }
      };
      aInner.onkeydown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); render(); }
      };
    };

    const commit = () => {
      qText.onkeydown = aInner.onkeydown = null;
      const q = (qText.innerText || '').replace(/\s+$/,'').trim();
      // Serialize the edited DOM back to markdown-lite text instead of a flat
      // innerText dump — preserves bold / italic / lists and never inflates the
      // paragraph spacing the way stacked <br>s did.
      const a = _serialize(aInner);
      // Store only fields that diverge, so an untouched field keeps tracking
      // future curated-content updates.
      const obj = {};
      if (q && q !== orig.q) obj.q = q;
      if (a && a !== orig.a) obj.a = a;
      _saveEdit(key, (obj.q != null || obj.a != null) ? obj : null);
      render();
      _broadcast(key);   // sync every other copy of this question on the page
    };

    editBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const act = b.getAttribute('data-e');
      if (act === 'edit') startEdit();
      else if (act === 'save') commit();
      else if (act === 'cancel') { qText.onkeydown = aInner.onkeydown = null; render(); }
    });

    // Live re-apply when an edit arrives from another device — but never while
    // this card is being edited here (don't stomp an in-progress edit).
    window.addEventListener('clouddwh:state-refresh', () => {
      if (item.classList.contains('editing')) return;
      render();
    });
    // Live re-apply when the SAME question is edited elsewhere on this page
    // (e.g. Architecture tab ↔ Interview Prep view) in the same session.
    window.addEventListener('clouddwh:qaedit', (e) => {
      if (!e.detail || e.detail.key !== key) return;
      if (item.classList.contains('editing')) return;
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
  // Inline markdown-lite on already-escaped text: **bold**, *italic*, `code`.
  function _inline(t) {
    return t
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }

  // Render a stored answer (markdown-lite text) to clean HTML. Blank lines split
  // paragraphs; a run of "1." / "-" lines becomes an ordered / unordered list.
  // Spacing is owned by CSS (<p>/<ul> margins), not by stacked <br>s — so the
  // saved answer reads exactly like what was shown in the editor.
  function _answer(s) {
    const src = String(s == null ? '' : s).replace(/\r\n?/g, '\n');
    const blocks = src.split(/\n{2,}/);
    const html = blocks.map((block) => {
      const lines = block.split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim() !== '');
      if (!lines.length) return '';
      if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) {
        return '<ol>' + lines.map(l => '<li>' + _inline(_esc(l.replace(/^\s*\d+[.)]\s+/, ''))) + '</li>').join('') + '</ol>';
      }
      if (lines.every(l => /^\s*[-*•]\s+/.test(l))) {
        return '<ul>' + lines.map(l => '<li>' + _inline(_esc(l.replace(/^\s*[-*•]\s+/, ''))) + '</li>').join('') + '</ul>';
      }
      return '<p>' + lines.map(l => _inline(_esc(l))).join('<br>') + '</p>';
    }).filter(Boolean).join('');
    return html;
  }

  // Serialize a contenteditable answer DOM back to markdown-lite text, without
  // the blank-line inflation that innerText produces on block elements.
  function _serialize(root) {
    const inline = (node) => {
      let s = '';
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) { s += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toLowerCase();
        if (tag === 'br') s += '\n';
        else if (tag === 'strong' || tag === 'b') s += '**' + inline(n).trim() + '**';
        else if (tag === 'em' || tag === 'i') s += '*' + inline(n).trim() + '*';
        else if (tag === 'code') s += '`' + inline(n).trim() + '`';
        else s += inline(n);
      });
      return s;
    };
    const parts = [];
    root.childNodes.forEach((n) => {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) parts.push(n.nodeValue.trim()); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'ol' || tag === 'ul') {
        let i = 0;
        [].forEach.call(n.children, (li) => {
          if (li.tagName.toLowerCase() !== 'li') return;
          i++;
          parts.push((tag === 'ol' ? i + '. ' : '- ') + inline(li).trim());
        });
        parts.push('');
      } else if (tag === 'p') {
        parts.push(inline(n).replace(/\s+$/, ''));
        parts.push('');
      } else if (tag === 'div') {
        parts.push(inline(n).replace(/\s+$/, ''));
      } else if (tag === 'br') {
        parts.push('');
      } else {
        parts.push(inline(n));
      }
    });
    return parts.join('\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+|\n+$/g, '');
  }

  window.CDWH = window.CDWH || {};
  window.CDWH.QAAccordion = QAAccordion;
})();
