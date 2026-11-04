// ─────────────────────────────────────────────────────────────────────────────
// Mock-interview / exam engine — pure, DOM-free, deterministic.
//
// Assembles a timed exam from two existing content banks (multiple-choice quiz
// questions and open interview questions) and scores the result. All selection
// is seeded, so the same seed reproduces the same paper (for "retry same exam")
// and a fresh seed gives a new mix. Pure functions only — unit-tested in Node;
// the UI (modules/mock-interview.js) feeds it pools and renders what it returns.
// ─────────────────────────────────────────────────────────────────────────────

// Small seeded PRNG (mulberry32) — deterministic floats in [0,1).
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle into a NEW array, using a provided rand() in [0,1).
export function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Normalize one MCQ (from the quiz bank) into an exam item, shuffling the
// options deterministically and recomputing where the correct answer landed.
function mcqItem(raw, rand) {
  const correctValue = raw.options[raw.answer];
  const options = shuffle(raw.options, rand);
  return {
    type: 'mcq',
    moduleId: raw.moduleId,
    group: raw.group,
    srsId: `q:${raw.moduleId}:${raw.idx}`,
    q: raw.q,
    options,
    answer: options.indexOf(correctValue),
    explanation: raw.explanation,
    difficulty: raw.difficulty || 'medium',
  };
}

function openItem(raw) {
  return {
    type: 'open',
    moduleId: raw.moduleId,
    group: raw.group,
    q: raw.q,
    a: raw.a,
    tip: raw.tip,
    difficulty: raw.difficulty || 'medium',
  };
}

// Build an exam paper.
//   mcqPool  — [{ moduleId, group, idx, q, options, answer, explanation, difficulty? }]
//   openPool — [{ moduleId, group, q, a, tip, difficulty? }]
//   groups   — null/empty = all groups; otherwise only questions whose group is in the set
//   length   — target number of questions
//   openRatio— fraction of the paper that should be open interview questions (0..1)
//   seed     — deterministic seed
// Returns an ordered array of normalized exam items (mcq | open), length <= `length`.
export function buildExam({ mcqPool = [], openPool = [], groups = null, length = 10, openRatio = 0.5, seed = 1 } = {}) {
  const rand = rng(seed);
  const inScope = (x) => !groups || groups.length === 0 || groups.includes(x.group);
  const mcqs = shuffle(mcqPool.filter(inScope), rand);
  const opens = shuffle(openPool.filter(inScope), rand);

  let wantOpen = Math.round(length * openRatio);
  let wantMcq = length - wantOpen;
  // Rebalance against availability so we always fill `length` when possible.
  wantOpen = Math.min(wantOpen, opens.length);
  wantMcq = Math.min(wantMcq, mcqs.length);
  let deficit = length - (wantOpen + wantMcq);
  if (deficit > 0) {
    const addMcq = Math.min(deficit, mcqs.length - wantMcq);
    wantMcq += addMcq; deficit -= addMcq;
    const addOpen = Math.min(deficit, opens.length - wantOpen);
    wantOpen += addOpen;
  }

  const chosen = [
    ...mcqs.slice(0, wantMcq).map(m => mcqItem(m, rand)),
    ...opens.slice(0, wantOpen).map(openItem),
  ];
  return shuffle(chosen, rand);
}

// Score a completed paper.
//   items     — the exam items from buildExam
//   responses — parallel array; mcq: { selected: index|null }, open: { rating: 'got'|'partial'|'missed'|null }
// Open grades weight: got=1, partial=0.5, missed/none=0. MCQ: correct=1 else 0.
export function scoreExam(items, responses) {
  const RWEIGHT = { got: 1, partial: 0.5, missed: 0 };
  let points = 0, answered = 0;
  let mcqTotal = 0, mcqCorrect = 0, openTotal = 0;
  const openByRating = { got: 0, partial: 0, missed: 0 };
  const byGroup = {};
  const missedSrsIds = [];

  items.forEach((it, i) => {
    const r = responses[i] || {};
    const g = (byGroup[it.group] = byGroup[it.group] || { correct: 0, total: 0 });
    g.total += 1;
    if (it.type === 'mcq') {
      mcqTotal += 1;
      const ok = r.selected != null && r.selected === it.answer;
      if (r.selected != null) answered += 1;
      if (ok) { mcqCorrect += 1; points += 1; g.correct += 1; }
      else if (it.srsId) missedSrsIds.push(it.srsId);
    } else {
      openTotal += 1;
      const rating = r.rating || 'missed';
      if (r.rating) answered += 1;
      openByRating[rating] = (openByRating[rating] || 0) + 1;
      const w = RWEIGHT[rating] ?? 0;
      points += w;
      g.correct += w;
    }
  });

  const total = items.length;
  const scorePct = total ? Math.round((points / total) * 100) : 0;
  return {
    total, answered, points,
    mcqTotal, mcqCorrect,
    openTotal, openByRating,
    scorePct, byGroup, missedSrsIds,
  };
}

// A short verdict band for a score, for the summary screen.
export function verdict(pct) {
  if (pct >= 85) return { label: 'Interview-ready', tone: 'great' };
  if (pct >= 70) return { label: 'Solid — a few gaps', tone: 'good' };
  if (pct >= 50) return { label: 'Getting there', tone: 'ok' };
  return { label: 'Needs more reps', tone: 'low' };
}
