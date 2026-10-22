// Study Hub — every practice surface in one place: interview Q&A, scenario
// drills (R-4471), tiered answers (Weak/Good/Senior), decision drills, and
// self-explain prompts. All counts are honest — they read the real banks.
import { MODULES } from '../components/nav.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { INTERVIEW_CASES } from '../data/interview-cases.js';
import { TIERED } from '../data/tiered.js';
import { DECISIONS } from '../data/decisions.js';
import { SELF_EXPLAIN } from '../data/self-explain.js';
import { scenarioCard } from '../components/story-ui.js';
import { createTieredCards, createDecisionDrill, initDecisionDrill, createSelfExplain, initSelfExplain } from '../components/practice.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const titleOf = id => (MODULES.find(m => m.id === id) || {}).title || id;
const iconOf = id => (MODULES.find(m => m.id === id) || {}).icon || '';
const numOf = id => (MODULES.find(m => m.id === id) || {}).num || '';

function flattenQA() {
  const out = [];
  MODULES.forEach(m => {
    (IQ_BANK[m.id] || []).forEach((qa, i) => {
      out.push({
        moduleId: m.id, moduleTitle: m.title, moduleNum: m.num, icon: m.icon,
        difficulty: qa.difficulty || 'medium', q: qa.q, a: qa.a, tip: qa.tip, idx: i,
      });
    });
  });
  return out;
}

// Count helpers across the keyed banks.
const countBank = bank => Object.keys(bank).reduce((n, k) => n + (bank[k] ? bank[k].length : 0), 0);

export function mount(container) {
  const ALL = flattenQA();
  const modulesCovered = new Set(ALL.map(x => x.moduleId));
  const totalQuizzes = countBank(QUIZ_BANK);
  const totalTiered = countBank(TIERED);
  const totalDecisions = countBank(DECISIONS);
  const totalSelfExplain = countBank(SELF_EXPLAIN);

  const state = { difficulty: 'all', module: 'all', query: '', mode: 'qa' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Review · Uber Edition</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Every practice surface in one place — interview Q&amp;A, scenario drills, tiered answers, decision drills and self-explain prompts. Filter by difficulty, module, or keyword.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val">${ALL.length}</span><span class="stat-label">Interview Q&amp;As</span></div>
        <div class="stat-box"><span class="stat-val">${modulesCovered.size}/${MODULES.length}</span><span class="stat-label">Modules covered</span></div>
        <div class="stat-box"><span class="stat-val">${totalQuizzes}</span><span class="stat-label">Quiz questions</span></div>
        <div class="stat-box"><span class="stat-val">${INTERVIEW_CASES.length}</span><span class="stat-label">Scenario cases</span></div>
        <div class="stat-box"><span class="stat-val">${totalDecisions}</span><span class="stat-label">Decision drills</span></div>
        <div class="stat-box"><span class="stat-val">${totalTiered}</span><span class="stat-label">Tiered answers</span></div>
      </div>

      <div class="study-mode-tabs" role="tablist">
        <button class="study-chip active" data-mode="qa" role="tab" aria-selected="true">📇 Q&amp;A bank</button>
        <button class="study-chip" data-mode="scenario" role="tab" aria-selected="false">🎬 Scenario drill</button>
        <button class="study-chip" data-mode="decisions" role="tab" aria-selected="false">🧭 Decision drills</button>
        <button class="study-chip" data-mode="tiered" role="tab" aria-selected="false">🪜 Tiered answers</button>
        <button class="study-chip" data-mode="self" role="tab" aria-selected="false">🧠 Self-explain</button>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search…" aria-label="Search" />
        <div class="study-chips" data-filter="difficulty">
          ${['all', 'easy', 'medium', 'hard'].map(d =>
            `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <select class="study-select" aria-label="Filter by module">
          <option value="all">All modules</option>
          ${MODULES.map(m => `<option value="${m.id}">${m.num} · ${m.title}</option>`).join('')}
        </select>
      </div>

      <div class="study-results" id="study-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#study-results');
  const searchEl = container.querySelector('.study-search');
  const diffWrap = container.querySelector('.study-chips[data-filter="difficulty"]');
  const selectEl = container.querySelector('.study-select');

  // modes that don't use difficulty filtering
  const usesDifficulty = () => state.mode === 'qa' || state.mode === 'scenario';

  function moduleGroups(bank, renderItems) {
    // Render a per-module section for banks keyed by module id.
    return MODULES.filter(m => bank[m.id] && bank[m.id].length &&
      (state.module === 'all' || state.module === m.id))
      .map(m => `
        <div class="study-mod-group">
          <a class="study-mod-head" href="#${m.id}">${m.icon} <span>${m.num} · ${m.title}</span></a>
          ${renderItems(m.id, bank[m.id])}
        </div>`).join('');
  }

  function apply() {
    const q = state.query.toLowerCase();
    diffWrap.style.display = usesDifficulty() ? '' : 'none';

    if (state.mode === 'scenario') {
      const cases = INTERVIEW_CASES.filter(c =>
        (state.difficulty === 'all' || c.difficulty === state.difficulty) &&
        (state.module === 'all' || c.module === state.module) &&
        (!q || (c.scenario + ' ' + c.breaks + ' ' + c.answer).toLowerCase().includes(q)));
      resultsEl.innerHTML = cases.length
        ? `<div class="study-count">${cases.length} scenario case${cases.length > 1 ? 's' : ''} — each anchored to a real moment in ride R-4471</div>${cases.map(c => scenarioCard(c)).join('')}`
        : `<div class="study-empty">No scenario cases match your filters.</div>`;
      return;
    }

    if (state.mode === 'decisions') {
      const html = moduleGroups(DECISIONS, (id, items) => {
        const filtered = q ? items.filter(d => (d.scenario + ' ' + d.takeaway).toLowerCase().includes(q)) : items;
        return filtered.length ? createDecisionDrill(id, filtered) : '';
      });
      resultsEl.innerHTML = html || `<div class="study-empty">No decision drills match your filters.</div>`;
      initDecisionDrill(resultsEl);
      return;
    }

    if (state.mode === 'tiered') {
      const html = moduleGroups(TIERED, (id, items) => {
        const filtered = q ? items.filter(t => (t.q + ' ' + t.senior).toLowerCase().includes(q)) : items;
        return createTieredCards(filtered);
      });
      resultsEl.innerHTML = html || `<div class="study-empty">No tiered answers match your filters.</div>`;
      return;
    }

    if (state.mode === 'self') {
      const html = moduleGroups(SELF_EXPLAIN, (id, items) => {
        const filtered = q ? items.filter(s => (s.prompt + ' ' + s.modelAnswer).toLowerCase().includes(q)) : items;
        return filtered.length ? createSelfExplain(id, filtered) : '';
      });
      resultsEl.innerHTML = html || `<div class="study-empty">No self-explain prompts match your filters.</div>`;
      initSelfExplain(resultsEl);
      return;
    }

    // default: Q&A bank
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
            <div class="iq-question" role="button" tabindex="0" aria-expanded="false">
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
      const toggle = () => {
        const item = qEl.closest('.iq-item');
        const open = item.classList.toggle('open');
        qEl.setAttribute('aria-expanded', String(open));
      };
      qEl.addEventListener('click', e => { if (e.target.closest('a')) return; toggle(); });
      qEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  diffWrap.addEventListener('click', e => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.difficulty = chip.dataset.val;
    diffWrap.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
    apply();
  });
  selectEl.addEventListener('change', e => { state.module = e.target.value; apply(); });
  container.querySelector('.study-mode-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.study-chip');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    container.querySelectorAll('.study-mode-tabs .study-chip').forEach(c => {
      const on = c === btn;
      c.classList.toggle('active', on);
      c.setAttribute('aria-selected', String(on));
    });
    apply();
  });

  apply();
  return () => {};
}
