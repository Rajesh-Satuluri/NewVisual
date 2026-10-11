// Answers — "Weak / Good / Senior" tiered answers to the questions interviewers
// actually ask. For each question you can flip between the junior answer, a
// solid answer, and the answer that impresses — and read why the senior one
// wins. Complements the Study Hub (which has breadth); this has depth on the
// highest-leverage questions.
import { TIERED } from '../data/tiered.js';
import { createTieredAnswer, initTieredAnswer } from '../components/tiered-answer.js';

export function mount(container) {
  const state = { openId: TIERED[0] ? TIERED[0].id : null };

  function render() {
    container.innerHTML = `
      <div class="module-page">
        <div class="module-hero">
          <div class="module-tag">★ · Interview Practice · Amazon Edition</div>
          <h1 class="module-title">Level Up Your Answer</h1>
          <p class="module-subtitle">The same interview question, answered three ways — what a junior says, a solid mid-level answer, and the senior answer that actually lands — with a note on why the senior version wins. Great for the last pass before an interview.</p>
        </div>
        <div class="ta-list">
          ${TIERED.map(item => `
            <div class="ca-card ta-card" data-id="${item.id}">
              <button class="ca-card-head" aria-expanded="${item.id === state.openId}">
                <span class="ca-card-topic">${item.topic}</span>
                <span class="ca-card-title">${item.question}</span>
                <span class="q-chevron">▼</span>
              </button>
              <div class="ca-card-body" ${item.id === state.openId ? '' : 'hidden'}></div>
            </div>`).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.ta-card').forEach(card => {
      const id = card.dataset.id;
      const head = card.querySelector('.ca-card-head');
      const body = card.querySelector('.ca-card-body');
      if (id === state.openId) {
        body.innerHTML = createTieredAnswer(TIERED.find(x => x.id === id));
        initTieredAnswer(body);
      }
      head.addEventListener('click', () => {
        state.openId = state.openId === id ? null : id;
        render();
      });
    });
  }

  render();
}
