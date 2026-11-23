// Decision Drills page — "Choose the Right Approach". Renders the DECISIONS
// bank with difficulty + keyword filtering; each card expands to show every
// option's verdict and the mechanism behind it.
import { DECISIONS } from '../data/decisions.js';
import { injectStyles, wireCards } from './scenario-shell.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const V = { best: 'v-best', viable: 'v-viable', wrong: 'v-wrong' };

export function mount(container) {
  injectStyles();
  const state = { difficulty: 'all', query: '' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🧭 · Scenarios · Decision Drills</div>
        <h1 class="module-title">Choose the Right Approach</h1>
        <p class="module-subtitle">Real Databricks requirements with candidate approaches. Pick one in your head, then open it to see which is best, viable, or wrong — and the mechanism behind each, how it flips if requirements change, and how to say it in an interview.</p>
      </div>
      <div class="scn-controls">
        <input class="scn-search" type="search" placeholder="🔍 Search scenarios…" aria-label="Search scenarios" />
        <div class="scn-chips">
          ${['all','easy','medium','hard'].map(d =>
            `<button class="scn-chip ${d==='all'?'active':''}" data-val="${d}">${d==='all'?'All levels':d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div id="scn-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#scn-results');
  const searchEl = container.querySelector('.scn-search');

  function apply() {
    const q = state.query.toLowerCase();
    const rows = DECISIONS.filter(d =>
      (state.difficulty === 'all' || d.difficulty === state.difficulty) &&
      (!q || (d.title + ' ' + d.topic + ' ' + d.requirement).toLowerCase().includes(q))
    ).sort((a,b) => (DIFF_ORDER[a.difficulty]-DIFF_ORDER[b.difficulty]));

    if (!rows.length) { resultsEl.innerHTML = `<div class="scn-empty">No scenarios match your filters.</div>`; return; }

    resultsEl.innerHTML = `
      <div class="scn-count">${rows.length} scenario${rows.length>1?'s':''}</div>
      ${rows.map(d => `
        <div class="scn-card">
          <div class="scn-head">
            <span class="scn-ico">🧭</span>
            <span class="scn-htext">
              <span class="scn-title">${d.title}</span>
              <span class="scn-meta">
                <span class="diff-badge diff-${d.difficulty}">${d.difficulty}</span>
                <span class="scn-tag">${d.topic}</span>
                <span class="scn-tag">#${d.moduleId}</span>
              </span>
            </span>
            <span class="scn-chev">▼</span>
          </div>
          <div class="scn-body">
            <div class="scn-label">Requirement</div>
            <div class="scn-req">${d.requirement}</div>
            <div class="scn-label">Options</div>
            ${d.options.map(o => `
              <div class="opt ${o.verdict==='best'?'best':''}">
                <div class="opt-label"><span class="opt-verdict ${V[o.verdict]}">${o.verdict}</span> ${o.label}</div>
                <div class="opt-why">${o.why}</div>
              </div>`).join('')}
            <div class="scn-whatif"><b>If requirements changed:</b> ${d.whatIfChanged}</div>
            <div class="scn-note"><b>💬 Interview note:</b> ${d.interviewNote}</div>
          </div>
        </div>`).join('')}`;
    wireCards(resultsEl);
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  container.querySelector('.scn-chips').addEventListener('click', e => {
    const chip = e.target.closest('.scn-chip'); if (!chip) return;
    state.difficulty = chip.dataset.val;
    container.querySelectorAll('.scn-chip').forEach(c => c.classList.toggle('active', c===chip));
    apply();
  });

  apply();
  return () => {};
}
