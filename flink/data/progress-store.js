// ─────────────────────────────────────────────────────────────────────────
// Central progress store for the Flink platform.
//
// Honest progress: a module is "mastered" only when its quiz is passed
// (≥ 2/3). Page opens are tracked separately as "visited" and never count as
// completion. Backward-safe: any module a prior visitor had auto-completed
// (legacy `flink_done`) stays mastered.
//
// Categories persisted under one key:
//   visited      [ids]          — modules whose page was opened
//   quiz         {id:{best,total}} — best quiz score per module
//   decisions    {id:[idx...]}   — decision-drill cards answered correctly
//   selfExplain  {id:[idx...]}   — self-explain prompts revealed
//   srs          {cardId:{...}}  — spaced-repetition schedule (Track D)
//
// Every write dispatches a `flink:progress` event so the dashboard, nav and
// review center can live-refresh.
// ─────────────────────────────────────────────────────────────────────────

const KEY = 'flink_progress_v1';
const LEGACY_DONE = 'flink_done'; // pre-honest-progress auto-completions + mastery mirror
export const PASS_RATIO = 2 / 3;

function blank() {
  return { visited: [], quiz: {}, decisions: {}, selfExplain: {}, srs: {} };
}

export function getProgress() {
  const data = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(data, JSON.parse(raw));
  } catch (e) {}
  // normalise shape
  data.visited = Array.isArray(data.visited) ? data.visited : [];
  data.quiz = data.quiz || {};
  data.decisions = data.decisions || {};
  data.selfExplain = data.selfExplain || {};
  data.srs = data.srs || {};
  return data;
}

function persist(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('flink:progress', { detail: data })); } catch (e) {}
}

// ── Mastery (quiz-pass, backward-safe) ──────────────────────────────────────
export function legacyDone() {
  try { return new Set(JSON.parse(localStorage.getItem(LEGACY_DONE) || '[]')); }
  catch (e) { return new Set(); }
}

export function isPassed(id, data = getProgress()) {
  const q = data.quiz[id];
  if (q && q.total > 0 && q.best / q.total >= PASS_RATIO) return true;
  return legacyDone().has(id);
}

// Set of mastered module ids (quiz-passed ∪ legacy auto-completions).
export function masteredSet(data = getProgress()) {
  const s = legacyDone();
  Object.keys(data.quiz).forEach(id => {
    const q = data.quiz[id];
    if (q && q.total > 0 && q.best / q.total >= PASS_RATIO) s.add(id);
  });
  return s;
}

// Mirror mastery into legacy `flink_done` so existing nav/home/progress keep working.
function mirrorMastery(id) {
  try {
    const s = legacyDone();
    s.add(id);
    localStorage.setItem(LEGACY_DONE, JSON.stringify([...s]));
  } catch (e) {}
}

// ── Writers ─────────────────────────────────────────────────────────────────
export function markVisited(id) {
  const data = getProgress();
  if (!data.visited.includes(id)) {
    data.visited.push(id);
    persist(data);
  }
}

// Returns { best, total, passed, improved } for the graded attempt.
export function recordQuiz(id, correct, total) {
  const data = getProgress();
  const prev = data.quiz[id];
  const best = Math.max(correct, prev ? prev.best : 0);
  const improved = !prev || correct > prev.best;
  data.quiz[id] = { best, total };
  persist(data);
  const passed = total > 0 && best / total >= PASS_RATIO;
  if (passed) mirrorMastery(id);
  return { best, total, passed, improved };
}

export function recordDecision(id, idx) {
  const data = getProgress();
  const arr = data.decisions[id] || (data.decisions[id] = []);
  if (!arr.includes(idx)) { arr.push(idx); persist(data); }
}

export function recordSelfExplain(id, idx) {
  const data = getProgress();
  const arr = data.selfExplain[id] || (data.selfExplain[id] = []);
  if (!arr.includes(idx)) { arr.push(idx); persist(data); }
}

// ── SRS (spaced repetition) — Track D ───────────────────────────────────────
export function getSrs() { return getProgress().srs; }
export function setSrsCard(cardId, schedule) {
  const data = getProgress();
  data.srs[cardId] = schedule;
  persist(data);
}
export function setSrsBulk(map) {
  const data = getProgress();
  Object.assign(data.srs, map);
  persist(data);
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  try { localStorage.removeItem(LEGACY_DONE); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('flink:progress', { detail: blank() })); } catch (e) {}
}
