// Spaced-repetition engine + deck builder.
//
// Deck: flashcards generated from the quiz bank (question -> correct answer +
// explanation) and the glossary (term -> definition). No duplicated content —
// the cards are derived from the same data the modules use.
//
// Scheduler: a compact SM-2 variant. Each card's state is { ease, interval
// (days), due (ms epoch), reps, lapses }. Grades: again | hard | good | easy.
import { QUIZ_BANK } from './quiz-bank.js';
import { TERMS } from '../modules/glossary.js';
import { MODULES } from '../components/nav.js';

const DAY = 86400000;
const labelOf = id => (MODULES.find(m => m.id === id)?.label) || id;

export function buildDeck() {
  const cards = [];
  for (const [mid, qs] of Object.entries(QUIZ_BANK)) {
    qs.forEach((q, i) => {
      cards.push({
        id: `q:${mid}:${i}`,
        kind: 'quiz',
        tag: labelOf(mid),
        moduleId: mid,
        front: q.q,
        back: `<strong>${q.options[q.answer]}</strong><div class="rv-why">${q.explanation}</div>`,
      });
    });
  }
  TERMS.forEach(t => {
    cards.push({
      id: `g:${t.t}`,
      kind: 'glossary',
      tag: t.c,
      moduleId: t.m,
      front: t.t,
      back: t.d,
    });
  });
  return cards;
}

// Pure scheduler. Returns the next state given the current state and a grade.
export function schedule(state, grade, now = Date.now()) {
  let { ease = 2.5, interval = 0, reps = 0, lapses = 0 } = state || {};
  if (grade === 'again') {
    ease = Math.max(1.3, ease - 0.2);
    reps = 0;
    lapses += 1;
    interval = 0;
    return { ease, interval, reps, lapses, due: now + 60000, last: now }; // ~1 min, re-shown soon
  }
  if (grade === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
    interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    reps += 1;
  } else if (grade === 'easy') {
    ease = ease + 0.15;
    interval = reps === 0 ? 4 : Math.round(interval * ease * 1.3);
    reps += 1;
  } else { // good
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * ease);
    reps += 1;
  }
  interval = Math.max(1, interval);
  return { ease, interval, reps, lapses, due: now + interval * DAY, last: now };
}

// Partition a deck against saved states into { due, fresh, later, learned }.
export function partitionDeck(deck, states, now = Date.now()) {
  const due = [], fresh = [], later = [];
  let learned = 0;
  for (const c of deck) {
    const st = states[c.id];
    if (!st) { fresh.push(c); continue; }
    if (st.reps > 0) learned++;
    if (st.due <= now) due.push(c);
    else later.push(c);
  }
  due.sort((a, b) => (states[a.id].due - states[b.id].due));
  return { due, fresh, later, learned };
}

// Build an ordered session: all due cards, then up to `newLimit` fresh ones.
export function buildSession(deck, states, { newLimit = 15, max = 40 } = {}, now = Date.now()) {
  const { due, fresh } = partitionDeck(deck, states, now);
  return [...due, ...fresh.slice(0, newLimit)].slice(0, max);
}

export function nextDueLabel(deck, states, now = Date.now()) {
  let soonest = Infinity;
  for (const c of deck) {
    const st = states[c.id];
    if (st && st.due > now) soonest = Math.min(soonest, st.due);
  }
  if (soonest === Infinity) return null;
  const mins = Math.round((soonest - now) / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  return `${Math.round(hrs / 24)} day${hrs >= 48 ? 's' : ''}`;
}
