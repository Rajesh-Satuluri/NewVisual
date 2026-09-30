// Study Hub — aggregates every module's interview questions into one filterable
// page (difficulty, module, free-text). Pulls Q&A directly from each module's
// exported IQ array via the shared aggregator, so it covers all 22 modules and
// never drifts from the module content.
import { MODULES } from '../components/nav.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { loadAllIQ } from '../data/iq-aggregate.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const numOf = id => id.replace(/^m/, '');

export function mount(container) {
  const totalQuizzes = Object.keys(QUIZ_BANK).reduce((n, k) => n + QUIZ_BANK[k].length, 0);
  const state = { difficulty: 'all', module: 'all', query: '' };
  let ALL = [];

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Review · Amazon Edition</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Every interview question across the course in one place — filter by difficulty, module, or keyword. Pulled straight from all ${MODULES.length} modules.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val" id="st-iq">…</span><span class="stat-label">Interview Q&amp;As</span></div>
        <div class="stat-box"><span class="stat-val" id="st-mod">${MODULES.length}/${MODULES.length}</span><span class="stat-label">Modules covered</span></div>
        <div class="stat-box"><span class="stat-val">${totalQuizzes}</span><span class="stat-label">Quiz questions</span></div>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search questions…" aria-label="Search questions" />
        <div class="study-chips" data-filter="difficulty">
          ${['all', 'easy', 'medium', 'hard'].map(d =>
            `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <select class="study-select" aria-label="Filter by module">
          <option value="all">All modules</option>
          ${MODULES.map(m => `<option value="${m.id}">${numOf(m.id)} · ${m.label}</option>`).join('')}
        </select>
      </div>

      <div class="study-results" id="study-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#study-results');
  const searchEl = container.querySelector('.study-search');
  resultsEl.innerHTML = `<div class="study-empty">Loading interview questions…</div>`;

  function apply() {
    const q = state.query.toLowerCase();
    const rows = ALL.filter(x =>
      (state.difficulty === 'all' || x.difficulty === state.difficulty) &&
      (state.module === 'all' || x.moduleId === state.module) &&
      (!q || (x.q + ' ' + x.a).toLowerCase().includes(q))
    ).sort((a, b) => (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]) || a.moduleNum.localeCompare(b.moduleNum));

    if (!rows.length) {
      resultsEl.innerHTML = `<div class="study-empty">No questions match your filters.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="study-count">${rows.length} question${rows.length > 1 ? 's' : ''}</div>
      <div class="iq-list">
        ${rows.map(x => `
          <div class="iq-item">
            <div class="iq-question">
              <span class="q-num">${x.moduleNum}</span>
              <span style="flex:1">${x.q}</span>
              <span class="diff-badge diff-${x.difficulty}">${x.difficulty}</span>
              <span class="q-chevron">▼</span>
            </div>
            <div class="iq-answer">
              <div class="study-src"><a href="#${x.moduleId}">${x.icon} ${x.moduleTitle}</a></div>
              ${x.a}
              ${x.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${x.tip}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>`;

    resultsEl.querySelectorAll('.iq-question').forEach(qEl => {
      qEl.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        qEl.closest('.iq-item').classList.toggle('open');
      });
    });
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  container.querySelector('.study-chips').addEventListener('click', e => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.difficulty = chip.dataset.val;
    container.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
    apply();
  });
  container.querySelector('.study-select').addEventListener('change', e => { state.module = e.target.value; apply(); });

  let alive = true;
  loadAllIQ().then(list => {
    if (!alive) return;
    ALL = list;
    const iqEl = container.querySelector('#st-iq');
    if (iqEl) iqEl.textContent = ALL.length;
    apply();
  });

  return () => { alive = false; };
}
