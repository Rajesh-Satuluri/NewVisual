// ─────────────────────────────────────────────────────────────────────────
// Review Center logic — a spaced-repetition deck (SM-2 variant) built from the
// quiz bank and the glossary. Schedules persist in the progress store (srs).
// ─────────────────────────────────────────────────────────────────────────
import { getSrs, setSrsCard } from './progress-store.js';
import { QUIZ_BANK } from './quiz-bank.js';
import { TERMS } from '../modules/glossary.js';
import { MODULES } from '../components/nav.js';

const DAY = 86400000;
const titleOf = id => (MODULES.find(m => m.id === id) || {}).title || id;

let DECK = null;
export function buildDeck() {
  if (DECK) return DECK;
  const cards = [];
  Object.keys(QUIZ_BANK).forEach(id => (QUIZ_BANK[id] || []).forEach((q, i) => {
    cards.push({
      id: `quiz:${id}:${i}`, type: 'quiz', module: id, source: titleOf(id),
      front: q.q,
      back: `<div class="rev-answer"><strong>${q.options[q.answer]}</strong></div><div class="rev-expl">${q.explanation}</div>`,
    });
  }));
  TERMS.forEach(([name, cat, def], i) => {
    cards.push({
      id: `gloss:${i}`, type: 'glossary', source: cat,
      front: name, back: `<div class="rev-expl">${def}</div>`,
    });
  });
  DECK = cards;
  return DECK;
}

// SM-2 variant. grade ∈ 'again' | 'hard' | 'good' | 'easy'.
export function gradeCard(cardId, grade) {
  const prev = getSrs()[cardId] || { ease: 2.5, interval: 0, reps: 0 };
  let { ease, interval, reps } = prev;
  const now = Date.now();
  let due;
  if (grade === 'again') {
    reps = 0; interval = 0; ease = Math.max(1.3, ease - 0.2); due = now + 60 * 1000;
  } else {
    if (grade === 'hard') { ease = Math.max(1.3, ease - 0.15); interval = reps === 0 ? 1 : interval * 1.2; }
    else if (grade === 'good') { interval = reps === 0 ? 1 : (reps === 1 ? 3 : interval * ease); }
    else { ease = ease + 0.15; interval = reps === 0 ? 3 : interval * ease * 1.3; } // easy
    reps += 1;
    due = now + Math.round(interval * DAY);
  }
  const sched = { ease: Number(ease.toFixed(2)), interval: Math.round(interval * 100) / 100, reps, due, last: now };
  setSrsCard(cardId, sched);
  return sched;
}

// Build a study session: all due cards first, then up to maxNew new cards,
// capped at maxTotal. `type` filters to 'quiz' | 'glossary' | 'all'.
export function buildSession({ maxNew = 15, maxTotal = 40, type = 'all' } = {}) {
  const deck = buildDeck().filter(c => type === 'all' || c.type === type);
  const srs = getSrs();
  const now = Date.now();
  const due = [];
  const fresh = [];
  deck.forEach(c => {
    const s = srs[c.id];
    if (!s) fresh.push(c);
    else if (s.due <= now) due.push(c);
  });
  const session = [...due];
  let added = 0;
  for (const c of fresh) {
    if (session.length >= maxTotal || added >= maxNew) break;
    session.push(c); added++;
  }
  return session.slice(0, maxTotal);
}

export function deckStats(type = 'all') {
  const deck = buildDeck().filter(c => type === 'all' || c.type === type);
  const srs = getSrs();
  const now = Date.now();
  let due = 0, fresh = 0, learning = 0, mature = 0;
  deck.forEach(c => {
    const s = srs[c.id];
    if (!s) fresh++;
    else if (s.due <= now) due++;
    else if (s.interval < 21) learning++;
    else mature++;
  });
  return { total: deck.length, due, new: fresh, learning, mature };
}
