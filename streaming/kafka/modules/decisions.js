// Decisions — "Choose the Right Approach" practice page. Lists every decision
// scenario (filterable by difficulty), and opens one as an interactive drill.
// Senior Kafka interviews are mostly trade-off questions; this turns the
// course's trade-offs into decisions you make and then get explained back.
import { DECISIONS } from '../data/decisions.js';
import { createChooseApproach, initChooseApproach } from '../components/choose-approach.js';
import { all } from '../data/progress-store.js';

const DIFFS = ['all', 'easy', 'medium', 'hard'];

export function mount(container) {
  const state = { difficulty: 'all', openId: null };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Interview Practice · Amazon Edition</div>
        <h1 class="module-title">Choose the Right Approach</h1>
        <p class="module-subtitle">Real requirements, a few plausible approaches — you pick one, then see why each is the best, a viable compromise, or wrong, and how the answer flips when the requirement changes. This is how senior Kafka interviews actually go.</p>
      </div>

      <div class="study-controls">
        <div class="study-chips" data-filter="difficulty">
          ${DIFFS.map(d => `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <span class="ca-progress" id="ca-progress"></span>
      </div>

      <div class="ca-list" id="ca-list"></div>
    </div>`;

  const listEl = container.querySelector('#ca-list');
  const progEl = container.querySelector('#ca-progress');

  function refreshProgress() {
    const done = all('decisions');
    const n = DECISIONS.filter(s => done[s.id]).length;
    progEl.textContent = n ? `${n}/${DECISIONS.length} attempted` : '';
  }

  function render() {
    const rows = DECISIONS.filter(s => state.difficulty === 'all' || s.difficulty === state.difficulty);
    if (!rows.length) { listEl.innerHTML = `<div class="study-empty">No scenarios at this level.</div>`; return; }

    listEl.innerHTML = rows.map(s => `
      <div class="ca-card" data-id="${s.id}">
        <button class="ca-card-head" aria-expanded="${s.id === state.openId}">
          <span class="ca-card-topic">${s.topic}</span>
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
        const opening = state.openId !== id;
        state.openId = opening ? id : null;
        render();
      });
    });
  }

  function fillBody(body, id) {
    const s = DECISIONS.find(x => x.id === id);
    if (!s || body.dataset.filled) return;
    body.innerHTML = createChooseApproach(s);
    initChooseApproach(body);
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
