// Troubleshooting page — production incident playbooks. Each incident expands
// into a step-by-step investigation: pick a check to reveal whether it was the
// right next move and why, then read root cause / resolution / prevention and
// the interview-ready answer.
import { INCIDENTS } from '../data/incidents.js';
import { injectStyles, wireCards } from './scenario-shell.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

export function mount(container) {
  injectStyles();
  const state = { difficulty: 'all', query: '' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🚑 · Scenarios · Troubleshooting Lab</div>
        <h1 class="module-title">Production Incident Playbooks</h1>
        <p class="module-subtitle">A symptom, then "what do you check next?" — click a check to see if it was the right move and why. Each incident ends with root cause, the fix, prevention, and how to narrate it in an interview.</p>
      </div>
      <div class="scn-controls">
        <input class="scn-search" type="search" placeholder="🔍 Search incidents…" aria-label="Search incidents" />
        <div class="scn-chips">
          ${['all','easy','medium','hard'].map(d =>
            `<button class="scn-chip ${d==='all'?'active':''}" data-val="${d}">${d==='all'?'All levels':d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div id="scn-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#scn-results');
  const searchEl = container.querySelector('.scn-search');

  const check = c => c.correct
    ? `<div class="chk correct">
         <div class="chk-label"><span class="chk-mark">✓</span> ${c.label}</div>
         <div class="chk-reveal"><p class="scn-evi"><b>What you find:</b> ${c.evidence}</p><p>${c.reasoning}</p></div>
       </div>`
    : `<div class="chk wrong">
         <div class="chk-label"><span class="chk-mark">✗</span> ${c.label}</div>
         <div class="chk-reveal">${c.why}</div>
       </div>`;

  function apply() {
    const q = state.query.toLowerCase();
    const rows = INCIDENTS.filter(it =>
      (state.difficulty === 'all' || it.difficulty === state.difficulty) &&
      (!q || (it.title + ' ' + it.symptom + ' ' + it.rootCause).toLowerCase().includes(q))
    ).sort((a,b) => (DIFF_ORDER[a.difficulty]-DIFF_ORDER[b.difficulty]));

    if (!rows.length) { resultsEl.innerHTML = `<div class="scn-empty">No incidents match your filters.</div>`; return; }

    resultsEl.innerHTML = `
      <div class="scn-count">${rows.length} incident${rows.length>1?'s':''}</div>
      ${rows.map(it => `
        <div class="scn-card">
          <div class="scn-head">
            <span class="scn-ico">${it.icon}</span>
            <span class="scn-htext">
              <span class="scn-title">${it.title}</span>
              <span class="scn-sub">${it.symptom}</span>
              <span class="scn-meta"><span class="diff-badge diff-${it.difficulty}">${it.difficulty}</span></span>
            </span>
            <span class="scn-chev">▼</span>
          </div>
          <div class="scn-body">
            ${it.steps.map((s,i) => `
              <div class="step">
                <div class="step-prompt">Step ${i+1} — ${s.prompt}</div>
                ${s.checks.map(check).join('')}
              </div>`).join('')}
            <div class="outcome">
              <div class="outcome-row"><div class="scn-label">Root cause</div><p>${it.rootCause}</p></div>
              <div class="outcome-row"><div class="scn-label">Resolution</div><p>${it.resolution}</p></div>
              <div class="outcome-row"><div class="scn-label">Prevention</div><p>${it.prevention}</p></div>
            </div>
            <div class="scn-note"><b>💬 Interview answer:</b> ${it.interviewAnswer}</div>
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
