// Progress store (I13) — namespaced sml-* so it NEVER collides with
// the existing kafka-* or flink localStorage keys.

const DONE_KEY = 'sml-done';
const VISIT_KEY = 'sml-visited';

function load(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { return new Set(); } }
function save(key, set) { try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {} }

const done = load(DONE_KEY);
const visited = load(VISIT_KEY);

export function markDone(id) { done.add(id); save(DONE_KEY, done); }
export function unmarkDone(id) { done.delete(id); save(DONE_KEY, done); }
export function isDone(id) { return done.has(id); }
export function markVisited(id) { if (!visited.has(id)) { visited.add(id); save(VISIT_KEY, visited); } }
export function isVisited(id) { return visited.has(id); }

export function progress(ids) {
  const total = ids.length;
  const complete = ids.filter(id => done.has(id)).length;
  return { complete, total, pct: total ? Math.round((complete / total) * 100) : 0 };
}
export function resetAll() { done.clear(); visited.clear(); save(DONE_KEY, done); save(VISIT_KEY, visited); }
