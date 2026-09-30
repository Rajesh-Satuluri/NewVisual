// Unified interview-prep progress store.
// One namespaced, versioned localStorage key records what the learner has
// attempted across the active-practice features (decision drills,
// troubleshooting flows, tiered answers, …) so a future Readiness view can
// aggregate it. Every write is try/catch-guarded and fires a
// 'kafka:progress' event so any open view can live-refresh.
//
//   record(category, id, patch)  — merge a result for one item
//   get(category, id)            — read one item's record (or null)
//   all(category)                — read every record in a category ({} if none)
//   counts(category)             — { attempted, correct } tallies
//   reset(category?)             — clear one category, or everything

const KEY = 'kafka-progress-v1';

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) { return {}; }
}

function write(store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('kafka:progress')); } catch (e) {}
}

export function record(category, id, patch) {
  const store = read();
  const cat = store[category] || (store[category] = {});
  cat[id] = { ...(cat[id] || {}), ...patch, ts: Date.now() };
  write(store);
  return cat[id];
}

export function get(category, id) {
  const store = read();
  return (store[category] && store[category][id]) || null;
}

export function all(category) {
  return read()[category] || {};
}

export function counts(category) {
  const items = all(category);
  const ids = Object.keys(items);
  const correct = ids.filter(k => items[k] && items[k].correct).length;
  return { attempted: ids.length, correct };
}

export function reset(category) {
  if (!category) { write({}); return; }
  const store = read();
  delete store[category];
  write(store);
}
