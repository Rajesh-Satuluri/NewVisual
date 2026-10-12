// Study Hub — aggregates every module's interview questions into one filterable
// page (difficulty, module, free-text). Auto-populates as IQ_BANK grows.
import { MODULES } from '../components/nav.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { INTERVIEW_CASES } from '../data/interview-cases.js';
import { scenarioCard } from '../components/story-ui.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function flatten() {
  const out = [];
  MODULES.forEach(m => {
    (IQ_BANK[m.id] || []).forEach((qa, i) => {
      out.push({
        moduleId: m.id,
        moduleTitle: m.title,
        moduleNum: m.num,
        group: m.group,
        icon: m.icon,
        difficulty: qa.difficulty || 'medium',
        q: qa.q,
        a: qa.a,
        tip: qa.tip,
        idx: i,
      });
    });
  });
  return out;
}

export function mount(container) {
  const ALL = flatten();
  const modulesCovered = new Set(ALL.map(x => x.moduleId));
  const totalQuizzes = Object.keys(QUIZ_BANK).reduce((n, k) => n + QUIZ_BANK[k].length, 0);

  const state = { difficulty: 'all', module: 'all', query: '', mode: 'qa' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Review · Uber Edition</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Every interview question across the course in one place — filter by difficulty, module, or keyword. Grows automatically as each module is built.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val">${ALL.length}</span><span class="stat-label">Interview Q&amp;As</span></div>
        <div class="stat-box"><span class="stat-val">${modulesCovered.size}/${MODULES.length}</span><span class="stat-label">Modules covered</span></div>
        <div class="stat-box"><span class="stat-val">${totalQuizzes}</span><span class="stat-label">Quiz questions</span></div>
        <div class="stat-box"><span class="stat-val">${INTERVIEW_CASES.length}</span><span class="stat-label">Scenario cases</span></div>
      </div>

      <div class="study-mode-tabs" style="display:flex;gap:8px;margin:0 0 4px">
        <button class="study-chip active" data-mode="qa">📇 Q&amp;A bank</button>
        <button class="study-chip" data-mode="scenario">🎬 Scenario drill (R-4471)</button>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search questions…" aria-label="Search questions" />
        <div class="study-chips" data-filter="difficulty">
          ${['all', 'easy', 'medium', 'hard'].map(d =>
            `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <select class="study-select" aria-label="Filter by module">
          <option value="all">All modules</option>
          ${MODULES.filter(m => modulesCovered.has(m.id)).map(m =>
            `<option value="${m.id}">${m.num} · ${m.title}</option>`).join('')}
        </select>
      </div>

      <div class="study-results" id="study-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#study-results');
  const searchEl = container.querySelector('.study-search');

  function apply() {
    const q = state.query.toLowerCase();

    if (state.mode === 'scenario') {
      const cases = INTERVIEW_CASES.filter(c =>
        (state.difficulty === 'all' || c.difficulty === state.difficulty) &&
        (state.module === 'all' || c.module === state.module) &&
        (!q || (c.scenario + ' ' + c.breaks + ' ' + c.answer).toLowerCase().includes(q))
      );
      resultsEl.innerHTML = cases.length
        ? `<div class="study-count">${cases.length} scenario case${cases.length > 1 ? 's' : ''} — each anchored to a real moment in ride R-4471</div>${cases.map(c => scenarioCard(c)).join('')}`
        : `<div class="study-empty">No scenario cases match your filters.</div>`;
      return;
    }

    const rows = ALL.filter(x =>
      (state.difficulty === 'all' || x.difficulty === state.difficulty) &&
      (state.module === 'all' || x.moduleId === state.module) &&
      (!q || (x.q + ' ' + x.a).toLowerCase().includes(q))
    ).sort((a, b) =>
      (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]) || a.moduleNum.localeCompare(b.moduleNum)
    );

    if (!rows.length) {
      resultsEl.innerHTML = ALL.length
        ? `<div class="study-empty">No questions match your filters.</div>`
        : `<div class="study-empty">No questions yet — interview content is added as each module is built. Module 01 is ready now.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="study-count">${rows.length} question${rows.length > 1 ? 's' : ''}</div>
      <div class="iq-list">
        ${rows.map((x, i) => `
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
  container.querySelector('.study-select').addEventListener('change', e => {
    state.module = e.target.value; apply();
  });
  container.querySelector('.study-mode-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.study-chip');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    container.querySelectorAll('.study-mode-tabs .study-chip').forEach(c => c.classList.toggle('active', c === btn));
    apply();
  });

  apply();
  return () => {};
}
