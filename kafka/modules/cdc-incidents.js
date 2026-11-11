// CDC Incident Lab — interactive Debezium/CDC production-incident drills. Same
// step-by-step investigation format as the Troubleshooting Lab, with CDC-specific
// scenarios (slot WAL growth, stuck-after-outage, missing deletes, duplicate /
// out-of-order). Reuses the shared investigation-flow component and its data
// shape; scenarios live in data/cdc-incidents.js.
import { CDC_INCIDENTS } from '../data/cdc-incidents.js';
import { createInvestigation, initInvestigation } from '../components/investigation-flow.js';
import { all } from '../data/progress-store.js';

const DIFFS = ['all', 'medium', 'hard'];
const byId = Object.fromEntries(CDC_INCIDENTS.map(s => [s.id, s]));

export function mount(container) {
  const state = { difficulty: 'all', openId: null };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Interview Practice · CDC</div>
        <h1 class="module-title">CDC Incident Lab</h1>
        <p class="module-subtitle">Real Change-Data-Capture incidents — a slot pinning WAL, a connector stuck after an outage, deletes that never land, totals that double-count — worked like an on-call engineer: see the symptom, choose what to check next, follow the evidence to root cause, fix, prevention, and the interview-ready story.</p>
      </div>

      <div class="study-controls">
        <div class="study-chips" data-filter="difficulty">
          ${DIFFS.map(d => `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <span class="ca-progress" id="cdc-inv-progress"></span>
      </div>

      <div class="inv-list" id="cdc-inv-list"></div>
    </div>`;

  const listEl = container.querySelector('#cdc-inv-list');
  const progEl = container.querySelector('#cdc-inv-progress');

  function refreshProgress() {
    const done = all('troubleshoot');
    const n = CDC_INCIDENTS.filter(s => done[s.id] && done[s.id].solved).length;
    progEl.textContent = n ? `${n}/${CDC_INCIDENTS.length} solved` : '';
  }

  function render() {
    const rows = CDC_INCIDENTS.filter(s => state.difficulty === 'all' || s.difficulty === state.difficulty);
    if (!rows.length) { listEl.innerHTML = `<div class="study-empty">No scenarios at this level.</div>`; return; }

    listEl.innerHTML = rows.map(s => `
      <div class="ca-card" data-id="${s.id}">
        <button class="ca-card-head" aria-expanded="${s.id === state.openId}">
          <span class="ca-card-icon">${s.icon}</span>
          <span class="ca-card-title">${s.title}</span>
          <span class="diff-badge diff-${s.difficulty}">${s.difficulty}</span>
          <span class="q-chevron">▼</span>
        </button>
        <div class="ca-card-body" ${s.id === state.openId ? '' : 'hidden'}></div>
      </div>`).join('');

    listEl.querySelectorAll('.ca-card').forEach(card => {
      const id = card.dataset.id;
      const head = card.querySelector('.ca-card-head');
      const body = card.querySelector('.ca-card-body');
      if (id === state.openId) fillBody(body, id);
      head.addEventListener('click', () => {
        state.openId = state.openId === id ? null : id;
        render();
      });
    });
  }

  function fillBody(body, id) {
    if (body.dataset.filled) return;
    body.innerHTML = createInvestigation(byId[id]);
    initInvestigation(body, byId);
    body.dataset.filled = '1';
  }

  container.querySelector('.study-chips').addEventListener('click', e => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.difficulty = chip.dataset.val;
    container.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });

  const onProgress = () => refreshProgress();
  window.addEventListener('kafka:progress', onProgress);

  render();
  refreshProgress();

  return () => { window.removeEventListener('kafka:progress', onProgress); };
}
