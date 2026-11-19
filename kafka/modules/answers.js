// Answers — "Weak / Good / Senior" tiered answers to the questions interviewers
// actually ask. For each question you can flip between the junior answer, a
// solid answer, and the answer that impresses — and read why the senior one
// wins. Complements the Study Hub (which has breadth); this has depth on the
// highest-leverage questions. Each card is editable in place and the edits sync
// across devices (see components/tiered-edits.js).
import { TIERED } from '../data/tiered.js';
import { createTieredAnswer, initTieredAnswer } from '../components/tiered-answer.js';
import { mergeOverride, hasOverride, initTieredEdits } from '../components/tiered-edits.js';
import { initAccordion } from '../components/accordion.js';

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
            <div class="ca-card ta-card${hasOverride(item.id) ? ' tae-edited' : ''}${item.id === state.openId ? ' open' : ''}" data-id="${item.id}">
              <button class="ca-card-head" aria-expanded="${item.id === state.openId}">
                <span class="ca-card-topic">${m.topic}</span>
                <span class="ca-card-title">${m.question}</span>
                <span class="iqe-badge tae-head-badge"${hasOverride(item.id) ? '' : ' hidden'} title="You have edited this card">edited</span>
                <span class="q-chevron">▼</span>
              </button>
              <div class="ca-card-acc"><div class="ca-card-body"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    initAccordion(container.querySelector('.ta-list'), { fillBody, onToggle: (id, open) => { if (open) state.openId = id; else if (state.openId === id) state.openId = null; } });
  }

  // Fill (or re-fill) a single card's body in place. On save/reset we re-run
  // this for just the open card instead of re-rendering the whole list — that
  // keeps the card open, preserves scroll position, and only refreshes the one
  // card's content and its collapsed-head "edited" badge.
  function fillBody(body, id) {
    const orig = TIERED.find(x => x.id === id);
    body.innerHTML = createTieredAnswer(mergeOverride(orig));
    initTieredAnswer(body);
    initTieredEdits(body, orig, () => {
      fillBody(body, id);            // refresh this card's content in place
      const card = body.closest('.ca-card');
      if (card) {
        const edited = hasOverride(id);
        card.classList.toggle('tae-edited', edited);
        const badge = card.querySelector('.tae-head-badge');
        if (badge) badge.hidden = !edited;
      }
    });
    body.dataset.filled = '1';
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
