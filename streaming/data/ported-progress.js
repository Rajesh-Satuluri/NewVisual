// Phase 2 — read-only bridge to the ported Kafka/Flink apps' own completion
// stores, so the unified dashboard can aggregate them alongside sml-* progress.
//
// The ported apps own these keys and write them from their own (byte-identical)
// code. This module only READS them — it never writes, so preservation and the
// ported apps' behaviour are untouched. Keys verified against the ported sources:
//   Kafka  → localStorage 'kafka-done'  : JSON array of module ids, e.g. ["m01",…]
//   Flink  → localStorage 'flink_done'  : JSON array of module ids

function readArray(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

// Count only numbered lesson ids (m01, m13b, …); ignore any tool ids that may
// also be present, so the denominator matches the ported app's own module count.
function countModules(arr) {
  return arr.filter(id => /^m\d/.test(String(id))).length;
}

export function portedProgress() {
  const kafkaDone = countModules(readArray('kafka-done'));
  const flinkDone = countModules(readArray('flink_done'));
  return {
    kafka: { done: Math.min(kafkaDone, 22), total: 22, url: 'kafka/' },
    flink: { done: Math.min(flinkDone, 20), total: 20, url: 'flink/' },
  };
}
