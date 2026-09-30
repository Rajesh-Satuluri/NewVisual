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

      items.forEach((it) => {
        const q = it.q || it.question || '';
        const a = it.a || it.answer || '';
        if (!q) return;
        const diff = it.difficulty || '';
        const id = 'qa' + (++_uid);
        const btnId = id + '-b';
        const panelId = id + '-p';

        const item = document.createElement('div');
        item.className = 'qa-item';
        item.innerHTML = `
          <button class="qa-q" id="${btnId}" aria-expanded="false" aria-controls="${panelId}">
            <span class="qa-q-text">${_esc(q)}</span>
            ${diff ? `<span class="qa-diff qa-diff-${_esc(diff)}">${_esc(diff)}</span>` : ''}
            <svg class="qa-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="qa-a" id="${panelId}" role="region" aria-labelledby="${btnId}" hidden>
            <div class="qa-a-inner">${_answer(a)}</div>
          </div>`;

        const btn = item.querySelector('.qa-q');
        const panel = item.querySelector('.qa-a');
        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!open));
          panel.hidden = open;
          item.classList.toggle('open', !open);
        });
        wrap.appendChild(item);
      });

      return wrap;
    },
  };

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  // Escape, then preserve intentional line breaks in longer answers.
  function _answer(s) { return _esc(s).replace(/\n/g, '<br>'); }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.QAAccordion = QAAccordion;
})();
