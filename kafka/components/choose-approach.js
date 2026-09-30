// Choose-the-approach drill. Renders one decision scenario: a requirement, a
// set of candidate approaches, and — after the learner picks — the verdict and
// plain-language reasoning for EVERY option, plus how the answer changes if the
// requirement changes and how to say it in an interview.
//
//   createChooseApproach(scenario) -> HTML string
//   initChooseApproach(rootEl)     -> wires clicks + records to progress store
//
// Records to the progress store under category 'decisions' (correct === the
// 'best' option was the first pick). Content is trusted in-repo HTML.
import { record } from '../data/progress-store.js';

const VERDICT_LABEL = { best: 'Best choice', viable: 'Viable', wrong: 'Not ideal' };

export function createChooseApproach(s) {
  return `
    <div class="ca" data-ca="${s.id}">
      <div class="ca-requirement">
        <div class="ca-req-label">The requirement</div>
        <div class="ca-req-body">${s.requirement}</div>
      </div>
      <div class="ca-prompt">Pick the approach you'd choose:</div>
      <div class="ca-options">
        ${s.options.map((o, i) => `
          <button class="ca-opt" data-i="${i}" data-verdict="${o.verdict}" aria-pressed="false">
            <span class="ca-opt-label">${o.label}</span>
            <span class="ca-opt-verdict" hidden>${VERDICT_LABEL[o.verdict] || ''}</span>
            <span class="ca-opt-why" hidden>${o.why}</span>
          </button>`).join('')}
      </div>
      <div class="ca-followups" hidden>
        <div class="ca-block ca-whatif">
          <div class="ca-block-head">🔄 What if the requirement changed?</div>
          <div class="ca-block-body">${s.whatIfChanged}</div>
        </div>
        <div class="ca-block ca-interview">
          <div class="ca-block-head">🎙️ Say it in an interview</div>
          <div class="ca-block-body">${s.interviewNote}</div>
        </div>
      </div>
    </div>`;
}

export function initChooseApproach(root) {
  root.querySelectorAll('.ca[data-ca]').forEach(card => {
    const id = card.dataset.ca;
    const opts = [...card.querySelectorAll('.ca-opt')];
    const followups = card.querySelector('.ca-followups');
    let answered = false;

    opts.forEach(btn => {
      btn.addEventListener('click', () => {
        const picked = btn.dataset.verdict;

        // First pick decides correctness; after that, reveal is idempotent.
        if (!answered) {
          answered = true;
          record('decisions', id, { correct: picked === 'best', picked });
        }

        // Reveal verdict + reasoning on every option so the full trade-off shows.
        opts.forEach(o => {
          o.classList.add('revealed', `v-${o.dataset.verdict}`);
          o.querySelector('.ca-opt-verdict').hidden = false;
          o.querySelector('.ca-opt-why').hidden = false;
          o.setAttribute('aria-pressed', String(o === btn));
        });
        card.classList.add('answered');
        card.querySelector('.ca-prompt').textContent =
          picked === 'best' ? '✅ Exactly right — here\'s why each option lands where it does:'
                            : 'Here\'s how each option actually compares:';
        if (followups) followups.hidden = false;
      });
    });
  });
}
