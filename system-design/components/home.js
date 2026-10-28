// ── Faceted home explorer (Block C · C10) ───────────────────────────────────
// Card grid of every question with a filter bar: text search, difficulty
// pills, tag chips, category select, and a live count. Pure client-side.
//
// mount(container, { done }) → cleanup()

import {
  QUESTIONS, CATEGORY_ORDER, CATEGORY_LABEL, DIFFICULTY_ORDER, allTags,
} from '../content/index.js';

const DIFF_CLASS = {
  Fundamental: 'diff-fundamental',
  Intermediate: 'diff-intermediate',
  Advanced: 'diff-advanced',
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// filter state persists for the session (not across reloads — intentionally light)
const state = {
  q: '',
  difficulty: null,     // one of DIFFICULTY_ORDER or null
  tags: new Set(),      // AND-match
  category: 'all',
};

export function mount(container, { done } = { done: new Set() }) {
  const tags = allTags();
  const cats = CATEGORY_ORDER.filter(c => QUESTIONS.some(q => q.category === c));

  container.innerHTML = `
    <div class="module-page sd-home">
      <div class="sd-home-hero">
        <div class="module-tag">Visual Learning Lab</div>
        <h1 class="sd-home-title">System Design Knowledge Base</h1>
        <p class="sd-home-sub">
          Real-world system-design questions with model answers — browse by
          topic, difficulty, and tag.
        </p>
        <div class="sd-home-stats">
          <span><b>${QUESTIONS.length}</b> questions</span>
          <span><b>${cats.length}</b> categories</span>
          <span><b id="sd-home-done">${done.size}</b> completed</span>
        </div>
      </div>

      <div class="sd-filters">
        <input type="search" id="sd-search" class="sd-search"
               placeholder="Search questions…" autocomplete="off" />
        <div class="sd-filter-row">
          <div class="sd-pill-group" id="sd-diff-pills" role="group" aria-label="Difficulty">
            <button class="sd-pill active" data-diff="all">All levels</button>
            ${DIFFICULTY_ORDER.map(d =>
              `<button class="sd-pill" data-diff="${d}">${d}</button>`).join('')}
          </div>
          <select class="sd-select" id="sd-cat">
            <option value="all">All categories</option>
            ${cats.map(c =>
              `<option value="${esc(c)}">${esc(CATEGORY_LABEL[c] || c)}</option>`).join('')}
          </select>
        </div>
        <div class="sd-tag-group" id="sd-tag-chips" role="group" aria-label="Tags">
          ${tags.map(t =>
            `<button class="sd-tag-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>
      </div>

      <div class="sd-result-bar">
        <span id="sd-count"></span>
        <button class="sd-clear" id="sd-clear" hidden>Clear filters</button>
      </div>

      <div class="sd-card-grid" id="sd-grid"></div>
      <div class="sd-empty" id="sd-empty" hidden>
        <div class="sd-empty-icon">🔍</div>
        <p>No questions match these filters.</p>
      </div>
    </div>`;

  const grid    = container.querySelector('#sd-grid');
  const empty   = container.querySelector('#sd-empty');
  const countEl = container.querySelector('#sd-count');
  const search  = container.querySelector('#sd-search');
  const catSel  = container.querySelector('#sd-cat');
  const clearBtn = container.querySelector('#sd-clear');
  const diffPills = [...container.querySelectorAll('[data-diff]')];
  const tagChips  = [...container.querySelectorAll('[data-tag]')];

  function matches(qn) {
    if (state.difficulty && qn.difficulty !== state.difficulty) return false;
    if (state.category !== 'all' && qn.category !== state.category) return false;
    if (state.tags.size && ![...state.tags].every(t => (qn.tags || []).includes(t))) return false;
    if (state.q) {
      const hay = (qn.question + ' ' + qn.category + ' ' + (qn.tags || []).join(' ')).toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  }

  function card(qn) {
    const dc = DIFF_CLASS[qn.difficulty] || '';
    const isDone = done.has(qn.id);
    const tagsHtml = (qn.tags || []).slice(0, 3)
      .map(t => `<span class="sd-tag">${esc(t)}</span>`).join('');
    return `
      <a class="sd-card${isDone ? ' done' : ''}" href="#${qn.id}">
        <div class="sd-card-top">
          <span class="sd-card-icon">${qn.icon || '📘'}</span>
          <span class="sd-diff ${dc}">${esc(qn.difficulty || '')}</span>
          ${qn.draft ? '<span class="sd-draft">draft</span>' : ''}
          ${isDone ? '<span class="sd-card-check" title="Completed">✓</span>' : ''}
        </div>
        <h3 class="sd-card-q">${esc(qn.question)}</h3>
        <div class="sd-card-cat">${esc(CATEGORY_LABEL[qn.category] || qn.category || '')}</div>
        <div class="sd-tags">${tagsHtml}</div>
      </a>`;
  }

  function render() {
    const list = QUESTIONS.filter(matches);
    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    grid.hidden = list.length === 0;
    countEl.textContent = `${list.length} of ${QUESTIONS.length} question${QUESTIONS.length === 1 ? '' : 's'}`;
    const active = state.q || state.difficulty || state.tags.size || state.category !== 'all';
    clearBtn.hidden = !active;
  }

  // ── events ────────────────────────────────────────────────────────────────
  let searchTimer = null;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = search.value.trim().toLowerCase(); render(); }, 120);
  }
  search.addEventListener('input', onSearch);

  diffPills.forEach(p => p.addEventListener('click', () => {
    const d = p.dataset.diff;
    state.difficulty = d === 'all' ? null : d;
    diffPills.forEach(x => x.classList.toggle('active',
      x.dataset.diff === (state.difficulty || 'all')));
    render();
  }));

  tagChips.forEach(c => c.addEventListener('click', () => {
    const t = c.dataset.tag;
    if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
    c.classList.toggle('active', state.tags.has(t));
    render();
  }));

  catSel.addEventListener('change', () => { state.category = catSel.value; render(); });

  clearBtn.addEventListener('click', () => {
    state.q = ''; state.difficulty = null; state.tags.clear(); state.category = 'all';
    search.value = '';
    catSel.value = 'all';
    diffPills.forEach(x => x.classList.toggle('active', x.dataset.diff === 'all'));
    tagChips.forEach(x => x.classList.remove('active'));
    render();
  });

  // restore any active state into the controls (session-persistent)
  search.value = state.q;
  catSel.value = state.category;
  diffPills.forEach(x => x.classList.toggle('active', x.dataset.diff === (state.difficulty || 'all')));
  tagChips.forEach(x => x.classList.toggle('active', state.tags.has(x.dataset.tag)));

  render();

  return function cleanup() { clearTimeout(searchTimer); };
}
