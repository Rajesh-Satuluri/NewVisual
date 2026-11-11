// Answers — "Weak / Good / Senior" tiered answers to the questions interviewers
// actually ask. For each question you can flip between the junior answer, a
// solid answer, and the answer that impresses — and read why the senior one
// wins. Complements the Study Hub (which has breadth); this has depth on the
// highest-leverage questions. Each card is editable in place and the edits sync
// across devices (see components/tiered-edits.js).
import { TIERED } from '../data/tiered.js';
import { createTieredAnswer, initTieredAnswer } from '../components/tiered-answer.js';
import { mergeOverride, hasOverride, initTieredEdits } from '../components/tiered-edits.js';

export function mount(container) {
  const state = { openId: TIERED[0] ? TIERED[0].id : null };

  function render() {
    container.innerHTML = `
      <div class="module-page">
        <div class="module-hero">
          <div class="module-tag">★ · Interview Practice · Amazon Edition</div>
          <h1 class="module-title">Level Up Your Answer</h1>
          <p class="module-subtitle">The same interview question, answered three ways — what a junior says, a solid mid-level answer, and the senior answer that actually lands — with a note on why the senior version wins. Great for the last pass before an interview. Edit any card to make it your own — your edits sync across your devices.</p>
        </div>
        <div class="ta-list">
          ${TIERED.map(item => {
            const m = mergeOverride(item);
            return `
            <div class="ca-card ta-card${hasOverride(item.id) ? ' tae-edited' : ''}" data-id="${item.id}">
              <button class="ca-card-head" aria-expanded="${item.id === state.openId}">
                <span class="ca-card-topic">${m.topic}</span>
                <span class="ca-card-title">${m.question}</span>
                <span class="iqe-badge tae-head-badge"${hasOverride(item.id) ? '' : ' hidden'} title="You have edited this card">edited</span>
                <span class="q-chevron">▼</span>
              </button>
              <div class="ca-card-body" ${item.id === state.openId ? '' : 'hidden'}></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.ta-card').forEach(card => {
      const id = card.dataset.id;
      const head = card.querySelector('.ca-card-head');
      const body = card.querySelector('.ca-card-body');
      if (id === state.openId) {
        const orig = TIERED.find(x => x.id === id);
        body.innerHTML = createTieredAnswer(mergeOverride(orig));
        initTieredAnswer(body);
        initTieredEdits(body, orig, () => render());
      }
      head.addEventListener('click', () => {
        state.openId = state.openId === id ? null : id;
        render();
      });
    });
  }

  render();

  // Re-render when an edit from another device (or a sync pull) lands, unless
  // the user is mid-edit in the open card.
  const onRefresh = () => {
    if (!container.querySelector('.tae-editing')) render();
  };
  window.addEventListener('kafka:cloud-refresh', onRefresh);
  return () => window.removeEventListener('kafka:cloud-refresh', onRefresh);
}
