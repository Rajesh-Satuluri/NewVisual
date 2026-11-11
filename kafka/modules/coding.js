// Coding Dojo — Kafka/data-engineering coding practice. Lists every problem
// (filterable by level, category, difficulty), opens one as an interactive
// drill: prompt → scratchpad → progressive hints → reference solution + the
// "make it a Kafka pipeline" follow-up. Honest about scope: no code is run
// here (no backend); this is study-grade practice with self-rating.
// Registered as the #coding PAGE.
import { CODING_BANK, CODING_LEVELS, CODING_LEVEL_LABEL, CODING_CATEGORIES } from '../data/coding-bank.js';
import { createCodingProblem, initCodingProblem } from '../components/coding-problem.js';
import { all } from '../data/progress-store.js';

const DIFFS = ['all', 'easy', 'medium', 'hard'];

export function mount(container) {
  const state = { level: 'all', category: 'all', difficulty: 'all', openId: null, revealAll: false };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">💻 · Interview Practice · Coding</div>
        <h1 class="module-title">Coding Dojo</h1>
        <p class="module-subtitle">The coding half of a Kafka data-engineering interview: Python on streams of events — dedup, aggregation, ordering, producers &amp; consumers, windowing, reconciliation. Think it through, sketch it in the scratchpad, then check against a reference solution and the follow-up that turns it into a real Kafka pipeline.</p>
      </div>

      <div class="cd-scope-note">⚠️ No code is executed here — this platform has no runtime. The scratchpad is a notepad; solutions are study references in Python. For live runs, use a local editor.</div>

      <div class="study-controls">
        <div class="study-chips" data-filter="level">
          <button class="study-chip active" data-val="all">All levels</button>
          ${CODING_LEVELS.map(l => `<button class="study-chip" data-val="${l}" title="${CODING_LEVEL_LABEL[l]}">L${l}</button>`).join('')}
        </div>
        <select class="study-select" data-filter="category" aria-label="Filter by category">
          <option value="all">All categories</option>
          ${CODING_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <div class="study-chips" data-filter="difficulty">
          ${DIFFS.map(d => `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'Any' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <button class="quiz-btn cd-random">🎲 Random drill</button>
        <button class="quiz-btn cd-reveal-all" aria-pressed="false" title="Show every question's reference solution at once">👁 Reveal all answers</button>
        <span class="ca-progress" id="cd-progress"></span>
      </div>

      <div class="ca-list" id="cd-list"></div>
    </div>`;

  const listEl = container.querySelector('#cd-list');
  const progEl = container.querySelector('#cd-progress');

  function refreshProgress() {
    const done = all('coding');
    const rated = CODING_BANK.filter(p => done[p.id] && done[p.id].rating).length;
    progEl.textContent = rated ? `${rated}/${CODING_BANK.length} rated` : '';
  }

  function filtered() {
    return CODING_BANK.filter(p =>
      (state.level === 'all' || String(p.level) === String(state.level)) &&
      (state.category === 'all' || p.category === state.category) &&
      (state.difficulty === 'all' || p.difficulty === state.difficulty));
  }

  function render() {
    const rows = filtered();
    if (!rows.length) { listEl.innerHTML = `<div class="study-empty">No problems match these filters.</div>`; return; }

    // In "reveal all" mode every card is open; otherwise one at a time.
    const isOpen = id => state.revealAll || id === state.openId;

    const done = all('coding');
    listEl.innerHTML = rows.map(p => {
      const rec = done[p.id];
      const badge = rec && rec.rating
        ? `<span class="cd-rated cd-rated-${rec.rating}">${rec.rating === 'got' ? '✓' : rec.rating === 'partial' ? '~' : '↻'}</span>`
        : '';
      return `
      <div class="ca-card" data-id="${p.id}">
        <button class="ca-card-head" aria-expanded="${isOpen(p.id)}">
          <span class="ca-card-topic">L${p.level} · ${p.category}</span>
          <span class="ca-card-title">${p.title}${badge}</span>
          <span class="diff-badge diff-${p.difficulty}">${p.difficulty}</span>
          <span class="q-chevron">▼</span>
        </button>
        <div class="ca-card-body" ${isOpen(p.id) ? '' : 'hidden'}></div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.ca-card').forEach(card => {
      const id = card.dataset.id;
      const head = card.querySelector('.ca-card-head');
      const body = card.querySelector('.ca-card-body');
      if (isOpen(id)) fillBody(body, id);
      head.addEventListener('click', () => {
        if (state.revealAll) {
          // Answer-key mode: head click collapses/expands this card only,
          // without re-rendering (the body is already filled + revealed).
          const nowHidden = body.hidden = !body.hidden;
          head.setAttribute('aria-expanded', String(!nowHidden));
          return;
        }
        state.openId = state.openId === id ? null : id;
        render();
      });
    });
  }

  function fillBody(body, id) {
    const p = CODING_BANK.find(x => x.id === id);
    if (!p || body.dataset.filled) return;
    body.innerHTML = createCodingProblem(p, { revealed: state.revealAll });
    initCodingProblem(body);
    body.dataset.filled = '1';
  }

  // Level + difficulty chips.
  container.querySelectorAll('.study-chips').forEach(group => {
    const dim = group.dataset.filter;
    group.addEventListener('click', e => {
      const chip = e.target.closest('.study-chip');
      if (!chip) return;
      state[dim] = chip.dataset.val;
      group.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
      state.openId = null;
      render();
    });
  });

  // Category select.
  container.querySelector('.study-select').addEventListener('change', e => {
    state.category = e.target.value;
    state.openId = null;
    render();
  });

  // Reveal-all toggle — flip between the single-open accordion and a full
  // answer-key view (every question expanded with its reference solution).
  const revealBtn = container.querySelector('.cd-reveal-all');
  revealBtn.addEventListener('click', () => {
    state.revealAll = !state.revealAll;
    revealBtn.setAttribute('aria-pressed', String(state.revealAll));
    revealBtn.classList.toggle('active', state.revealAll);
    revealBtn.textContent = state.revealAll ? '🙈 Hide all answers' : '👁 Reveal all answers';
    render();
  });

  // Random drill — pick a random problem from the current filter and open it.
  container.querySelector('.cd-random').addEventListener('click', () => {
    const rows = filtered();
    if (!rows.length) return;
    state.openId = rows[Math.floor(Math.random() * rows.length)].id;
    render();
    const open = listEl.querySelector('.ca-card-head[aria-expanded="true"]');
    open?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const onProgress = () => { refreshProgress(); };
  window.addEventListener('kafka:progress', onProgress);

  render();
  refreshProgress();

  return () => { window.removeEventListener('kafka:progress', onProgress); };
}
