// Troubleshooting Lab — interactive production-incident drills. Pick a scenario,
// then work it step by step: observe a symptom, choose what to check next, and
// get evidence + reasoning until you reach root cause, resolution, prevention
// and a spoken interview answer. Shares its scenario data with the Incident
// Bank (incident-bank.js) — one source, two views.
import { INCIDENTS } from '../data/incidents.js';
import { createInvestigation, initInvestigation } from '../components/investigation-flow.js';
import { all } from '../data/progress-store.js';

const DIFFS = ['all', 'medium', 'hard'];
const byId = Object.fromEntries(INCIDENTS.map(s => [s.id, s]));

export function mount(container) {
  const state = { difficulty: 'all', openId: null };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Interview Practice · Amazon Edition</div>
        <h1 class="module-title">Troubleshooting Lab</h1>
        <p class="module-subtitle">Real Kafka production incidents, worked like an on-call engineer would: see the symptom, decide what to check next, and follow the evidence to root cause. Each scenario ends with the fix, how to prevent it, and how to tell the story in an interview.</p>
      </div>

      <div class="study-controls">
        <div class="study-chips" data-filter="difficulty">
          ${DIFFS.map(d => `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <span class="ca-progress" id="inv-progress"></span>
      </div>

      <div class="inv-list" id="inv-list"></div>
    </div>`;

  const listEl = container.querySelector('#inv-list');
  const progEl = container.querySelector('#inv-progress');

  function refreshProgress() {
    const done = all('troubleshoot');
    const n = INCIDENTS.filter(s => done[s.id] && done[s.id].solved).length;
    progEl.textContent = n ? `${n}/${INCIDENTS.length} solved` : '';
  }

  function render() {
    const rows = INCIDENTS.filter(s => state.difficulty === 'all' || s.difficulty === state.difficulty);
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
