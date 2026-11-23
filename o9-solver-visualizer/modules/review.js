// review.js — Review Center (Review section).
// A spaced-repetition flashcard session built on the SRS engine in
// data/review.js. Cards are derived from the quiz bank + glossary (no
// duplicated content). Per-card states persist in localStorage 'o9scs-srs-v1'.
import { buildDeck, schedule, buildSession, partitionDeck, nextDueLabel } from '../data/review.js';

const SRS_KEY = 'o9scs-srs-v1';

function readSrs() {
  try {
    const raw = JSON.parse(localStorage.getItem(SRS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) { return {}; }
}
function writeSrs(states) {
  try { localStorage.setItem(SRS_KEY, JSON.stringify(states)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('o9scs:progress')); } catch (e) {}
}

const GRADES = [
  { g: 'again', label: 'Again', hint: '< 1 min', color: '#EF4444' },
  { g: 'hard',  label: 'Hard',  hint: 'sooner',  color: '#F59E0B' },
  { g: 'good',  label: 'Good',  hint: 'on track', color: '#10B981' },
  { g: 'easy',  label: 'Easy',  hint: 'later',    color: '#38BDF8' },
];

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Review</div>
        <h1 class="module-title">Review Center</h1>
        <p class="module-subtitle">Spaced-repetition flashcards drawn from the quiz bank and glossary. Grade each card honestly — the scheduler decides when you see it next.</p>
      </div>
      <div class="scroll-content" id="rv-body"></div>
    </div>`;

  const body = container.querySelector('#rv-body');

  // Session state.
  let deck = buildDeck();
  let session = [];
  let idx = 0;
  let revealed = false;

  function startSession() {
    deck = buildDeck();
    const states = readSrs();
    session = buildSession(deck, states, { newLimit: 15, max: 40 });
    idx = 0;
    revealed = false;
    draw();
  }

  function gradeCurrent(grade) {
    const card = session[idx];
    if (!card) return;
    const states = readSrs();
    states[card.id] = schedule(states[card.id], grade);
    writeSrs(states);
    idx += 1;
    revealed = false;
    draw();
  }

  function drawEmpty(states) {
    const { learned } = partitionDeck(deck, states);
    const nd = nextDueLabel(deck, states);
    body.innerHTML = `
      <div class="rv-done">
        <div class="rv-done-icon">✅</div>
        <div class="section-title">Nothing due right now</div>
        <div class="section-desc">You've cleared every due card${nd ? ` — the next is due in about <strong>${nd}</strong>` : ''}. ${learned} card(s) learned so far.</div>
        <div class="dash-actions" style="justify-content:center">
          <button class="ctrl-btn" id="rv-restart">↺ Build a new session</button>
          <a class="ctrl-btn" href="#dashboard">📊 Dashboard</a>
        </div>
      </div>`;
    body.querySelector('#rv-restart')?.addEventListener('click', startSession);
  }

  function drawDone() {
    const states = readSrs();
    const nd = nextDueLabel(deck, states);
    body.innerHTML = `
      <div class="rv-done">
        <div class="rv-done-icon">🎉</div>
        <div class="section-title">Session complete</div>
        <div class="section-desc">You reviewed <strong>${session.length}</strong> card(s).${nd ? ` Next card due in about <strong>${nd}</strong>.` : ''}</div>
        <div class="dash-actions" style="justify-content:center">
          <button class="ctrl-btn" id="rv-again">↺ Start another session</button>
          <a class="ctrl-btn" href="#study">📚 Study Hub</a>
        </div>
      </div>`;
    body.querySelector('#rv-again')?.addEventListener('click', startSession);
  }

  function draw() {
    const states = readSrs();
    if (!session.length) { drawEmpty(states); return; }
    if (idx >= session.length) { drawDone(); return; }

    const card = session[idx];
    const n = idx + 1, total = session.length;
    const progress = Math.round((idx / total) * 100);

    body.innerHTML = `
      <div class="rv-topbar">
        <div class="rv-progress"><div class="rv-progress-fill" style="width:${progress}%"></div></div>
        <div class="rv-meta"><span>Card ${n} / ${total}</span><span class="rv-tag">${card.tag} · ${card.kind}</span></div>
      </div>

      <div class="rv-card">
        <div class="rv-front">${card.front}</div>
        <div class="rv-back" id="rv-back" ${revealed ? '' : 'hidden'}>${card.back}</div>
      </div>

      <div class="rv-controls" id="rv-controls"></div>`;

    const controls = body.querySelector('#rv-controls');
    if (!revealed) {
      controls.innerHTML = `<button class="ctrl-btn rv-reveal" id="rv-reveal">Reveal answer</button>`;
      controls.querySelector('#rv-reveal')?.addEventListener('click', () => { revealed = true; draw(); });
    } else {
      controls.innerHTML = `
        <div class="rv-grade-label">How well did you recall it?</div>
        <div class="rv-grades">
          ${GRADES.map(gr => `
            <button class="ctrl-btn rv-grade" data-grade="${gr.g}" style="border-color:${gr.color}">
              <span class="rv-grade-name" style="color:${gr.color}">${gr.label}</span>
              <span class="rv-grade-hint">${gr.hint}</span>
            </button>`).join('')}
        </div>`;
      controls.querySelectorAll('.rv-grade').forEach(btn => {
        btn.addEventListener('click', () => gradeCurrent(btn.dataset.grade));
      });
    }
  }

  startSession();
  return null;
}
