// Review Center — spaced-repetition study (SM-2). Flip with Space, grade with
// 1–4. Schedule persists across sessions.
import { buildSession, gradeCard, deckStats } from '../data/review.js';

const GRADES = [
  { key: 'again', label: 'Again', hint: '1', k: '1' },
  { key: 'hard', label: 'Hard', hint: '2', k: '2' },
  { key: 'good', label: 'Good', hint: '3', k: '3' },
  { key: 'easy', label: 'Easy', hint: '4', k: '4' },
];

export function mount(container) {
  let state = { type: 'all', session: [], i: 0, flipped: false, graded: 0, done: false };

  function startSession() {
    state.session = buildSession({ type: state.type });
    state.i = 0; state.flipped = false; state.graded = 0; state.done = false;
  }

  function shell() {
    const s = deckStats(state.type);
    container.innerHTML = `
      <div class="module-page">
        <div class="module-hero">
          <div class="module-tag">🔁 Review · Spaced Repetition</div>
          <h1 class="module-title">Review Center</h1>
          <p class="module-subtitle">Flashcards scheduled by an SM-2 algorithm from the quiz bank and glossary. Flip with <kbd>Space</kbd>, grade with <kbd>1</kbd>–<kbd>4</kbd>. The harder a card, the sooner it returns.</p>
        </div>
        <div class="tab-content active">
          <div class="rev-topbar">
            <div class="rev-chips">
              ${['all', 'quiz', 'glossary'].map(t => `<button class="rev-filter ${state.type === t ? 'active' : ''}" data-type="${t}">${t === 'all' ? 'All cards' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
            </div>
            <div class="rev-stats">
              <span class="rev-stat"><b>${s.due}</b> due</span>
              <span class="rev-stat"><b>${s.new}</b> new</span>
              <span class="rev-stat"><b>${s.learning}</b> learning</span>
              <span class="rev-stat rev-stat-mute">${s.total} total</span>
            </div>
          </div>
          <div class="rev-stage" id="rev-stage"></div>
        </div>
      </div>`;

    container.querySelectorAll('.rev-filter').forEach(btn => btn.addEventListener('click', () => {
      state.type = btn.dataset.type;
      startSession();
      shell();
      renderStage();
    }));
    renderStage();
  }

  function renderStage() {
    const stage = container.querySelector('#rev-stage');
    if (state.done || state.i >= state.session.length) {
      stage.innerHTML = `
        <div class="rev-done">
          <div class="rev-done-ic">✅</div>
          <div class="rev-done-title">Session complete</div>
          <p>You reviewed <strong>${state.graded}</strong> card${state.graded === 1 ? '' : 's'}. Come back later — due cards are scheduled by how well you knew them.</p>
          <button class="btn btn-primary" id="rev-restart">Start another session</button>
        </div>`;
      stage.querySelector('#rev-restart')?.addEventListener('click', () => { startSession(); shell(); });
      return;
    }
    const card = state.session[state.i];
    stage.innerHTML = `
      <div class="rev-progress"><div class="rev-progress-fill" style="width:${(state.i / state.session.length) * 100}%"></div></div>
      <div class="rev-count">${state.i + 1} / ${state.session.length} · <span class="rev-type-tag">${card.type}</span> ${card.source ? '· ' + card.source : ''}</div>
      <div class="rev-card ${state.flipped ? 'flipped' : ''}" id="rev-card" tabindex="0" role="button" aria-label="Flashcard. Press Space to reveal the answer.">
        <div class="rev-front">${card.front}</div>
        ${state.flipped ? `<div class="rev-back">${card.back}</div>` : '<div class="rev-hint">Press <kbd>Space</kbd> or click to reveal</div>'}
      </div>
      ${state.flipped ? `
        <div class="rev-grades">
          ${GRADES.map(g => `<button class="rev-grade rev-grade-${g.key}" data-grade="${g.key}"><span>${g.label}</span><kbd>${g.hint}</kbd></button>`).join('')}
        </div>` : `<div class="rev-flipbar"><button class="btn btn-primary" id="rev-flip">Reveal answer</button></div>`}`;

    const flip = () => { state.flipped = true; renderStage(); };
    stage.querySelector('#rev-flip')?.addEventListener('click', flip);
    stage.querySelector('#rev-card')?.addEventListener('click', () => { if (!state.flipped) flip(); });
    stage.querySelector('#rev-card')?.focus();
    stage.querySelectorAll('.rev-grade').forEach(btn => btn.addEventListener('click', () => grade(btn.dataset.grade)));
  }

  function grade(g) {
    const card = state.session[state.i];
    if (!card) return;
    gradeCard(card.id, g);
    state.graded++;
    state.i++;
    state.flipped = false;
    renderStage();
  }

  function onKey(e) {
    if (container.querySelector('#rev-stage') == null) return;
    if (!state.flipped && (e.key === ' ' || e.key === 'Spacebar')) {
      if (state.i < state.session.length && !state.done) { e.preventDefault(); state.flipped = true; renderStage(); }
      return;
    }
    if (state.flipped) {
      const g = GRADES.find(x => x.k === e.key);
      if (g) { e.preventDefault(); grade(g.key); }
    }
  }
  document.addEventListener('keydown', onKey);

  startSession();
  shell();
  return () => document.removeEventListener('keydown', onKey);
}
