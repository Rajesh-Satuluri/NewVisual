/* ============================================================
   Study Deck Module
   Aggregates every quiz-bank question + interview Q&A into one
   filterable page (difficulty, source, free-text), grouped by
   topic. Reveal-answer flashcards. Read-only study aid.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  function _injectStyles() {
    if (document.getElementById('study-styles')) return;
    const s = document.createElement('style');
    s.id = 'study-styles';
    s.textContent = `
.study-page { padding: 24px; }
.study-filters {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  margin: 16px 0 8px; position: sticky; top: 0; z-index: 2;
  background: var(--bg-1); padding: 8px 0;
}
.study-search {
  flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px;
  background: var(--bg-3); border: 1px solid var(--border-default);
  border-radius: var(--radius-sm); padding: 8px 12px;
}
.study-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: var(--text-sm); }
.study-select {
  background: var(--bg-3); border: 1px solid var(--border-default); color: var(--text-primary);
  border-radius: var(--radius-sm); padding: 8px 10px; font-size: var(--text-sm);
}
.study-count { font-size: var(--text-xs); color: var(--text-muted); margin: 4px 0 16px; }
.study-group { margin-bottom: 26px; }
.study-group__title {
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);
}
.study-card {
  border: 1px solid var(--border-default); border-radius: var(--radius);
  background: var(--bg-2); margin-bottom: 10px; overflow: hidden;
}
.study-card__q {
  width: 100%; text-align: left; background: none; border: none; cursor: pointer;
  display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px;
  color: var(--text-primary); font-size: var(--text-sm); font-weight: 500; line-height: 1.5;
}
.study-card__q:hover { background: var(--bg-3); }
.study-card__a {
  padding: 0 16px 14px 44px; color: var(--text-secondary); font-size: var(--text-sm);
  line-height: 1.6; border-top: 1px solid var(--border-subtle); padding-top: 12px;
}
.study-chip {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em;
  padding: 2px 7px; border-radius: 999px; flex-shrink: 0;
}
.study-chip--basic { background: var(--green-subtle); color: var(--green); }
.study-chip--intermediate { background: var(--yellow-subtle); color: var(--yellow); }
.study-chip--advanced { background: var(--red-subtle); color: var(--red); }
.study-chip--quiz { background: var(--blue-subtle); color: var(--blue); }
.study-chip--interview { background: var(--purple-subtle); color: var(--purple); }
.study-empty { padding: 40px; text-align: center; color: var(--text-muted); }
`;
    document.head.appendChild(s);
  }

  function _labelFor(id) {
    const s = (IV.getScreens ? IV.getScreens() : []).find(x => x.id === id);
    return s ? s.label : id;
  }

  function _collect() {
    const items = [];
    const qb = IV.QuestionBank || {};
    Object.keys(qb).forEach(screen => {
      if (!Array.isArray(qb[screen])) return;   // skip format buckets (e.g. qb.delta)
      qb[screen].forEach(q => items.push({
        type: 'quiz', difficulty: q.difficulty || 'basic',
        group: _labelFor(screen), q: q.q, a: q.explanation,
      }));
    });
    const iq = (IV.Concepts && IV.Concepts.interviewQuestions) || {};
    ['basic', 'intermediate', 'advanced'].forEach(d => {
      (iq[d] || []).forEach(x => items.push({
        type: 'interview', difficulty: d, group: 'Interview Questions', q: x.q, a: x.a,
      }));
    });
    return items;
  }

  function _esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function _render(container) {
    _injectStyles();
    const all = _collect();

    const page = document.createElement('div');
    page.className = 'page-enter study-page';
    page.innerHTML = `
      <div class="module-header">
        <div>
          <h1 class="gradient-text">Study Deck</h1>
          <p class="module-subtitle">Every quiz question and interview prompt in one place. Filter by difficulty or topic, search, and tap a card to reveal the answer.</p>
        </div>
      </div>
      <div class="study-filters">
        <div class="study-search">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input id="study-q" type="text" placeholder="Search questions…" aria-label="Search questions" autocomplete="off" />
        </div>
        <select id="study-diff" class="study-select" aria-label="Filter by difficulty">
          <option value="">All levels</option>
          <option value="basic">Basic</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select id="study-type" class="study-select" aria-label="Filter by source">
          <option value="">All sources</option>
          <option value="quiz">Quiz</option>
          <option value="interview">Interview</option>
        </select>
      </div>
      <div class="study-count" id="study-count"></div>
      <div id="study-results"></div>`;
    container.appendChild(page);

    const qEl = page.querySelector('#study-q');
    const dEl = page.querySelector('#study-diff');
    const tEl = page.querySelector('#study-type');
    const out = page.querySelector('#study-results');
    const countEl = page.querySelector('#study-count');

    function apply() {
      const q = qEl.value.trim().toLowerCase();
      const d = dEl.value, t = tEl.value;
      const filtered = all.filter(it =>
        (!d || it.difficulty === d) &&
        (!t || it.type === t) &&
        (!q || (it.q + ' ' + it.a).toLowerCase().includes(q)));

      countEl.textContent = `${filtered.length} of ${all.length} questions`;
      if (!filtered.length) { out.innerHTML = `<div class="study-empty">No questions match your filters.</div>`; return; }

      const groups = {};
      filtered.forEach(it => { (groups[it.group] = groups[it.group] || []).push(it); });
      out.innerHTML = Object.keys(groups).sort().map(g => `
        <div class="study-group">
          <div class="study-group__title">${_esc(g)}</div>
          ${groups[g].map(it => `
            <div class="study-card">
              <button class="study-card__q" aria-expanded="false">
                <span class="study-chip study-chip--${it.difficulty}">${it.difficulty}</span>
                <span class="study-chip study-chip--${it.type}">${it.type}</span>
                <span style="flex:1">${_esc(it.q)}</span>
              </button>
              <div class="study-card__a" hidden>${_esc(it.a)}</div>
            </div>`).join('')}
        </div>`).join('');

      out.querySelectorAll('.study-card__q').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = btn.nextElementSibling;
          const open = !a.hidden;
          a.hidden = open;
          btn.setAttribute('aria-expanded', String(!open));
        });
      });
    }

    qEl.addEventListener('input', apply);
    dEl.addEventListener('change', apply);
    tEl.addEventListener('change', apply);
    apply();
  }

  IV.modules = IV.modules || {};
  IV.modules['study'] = { id: 'study', title: 'Study Deck', group: 'learn', render: _render, destroy() {} };
})();
