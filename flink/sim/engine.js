// ─────────────────────────────────────────────────────────────────────────
// Deterministic Flink simulation engine.
//
// These are the REAL algorithms Flink uses for key-group assignment and
// watermark propagation, reimplemented in JS for teaching. There is NO network,
// no cluster and no randomness — given the same inputs you get the same outputs,
// so every lab result is reproducible. See sim/PRESERVATION.md for the honesty
// ledger (what is a real algorithm vs a labelled simulation).
// ─────────────────────────────────────────────────────────────────────────

// Java String.hashCode() — so key hashing matches what Flink would compute.
export function javaStringHashCode(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// Flink MathUtils.murmurHash finalizer, returned as a non-negative int.
export function murmurHash(code) {
  let h = code | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 15;
  return h & 0x7fffffff;
}

// Flink default maxParallelism: round(1.5 * p) clamped to [128, 32768], then
// rounded up to the next power of two.
export function defaultMaxParallelism(parallelism) {
  const clamped = Math.min(Math.max(Math.round(parallelism * 1.5), 128), 32768);
  let pw = 1;
  while (pw < clamped) pw <<= 1;
  return Math.min(pw, 32768);
}

// KeyGroupRangeAssignment.assignToKeyGroup
export function keyGroupFor(key, maxParallelism) {
  return murmurHash(javaStringHashCode(key)) % maxParallelism;
}

// KeyGroupRangeAssignment.computeOperatorIndexForKeyGroup
export function subtaskForKeyGroup(keyGroup, parallelism, maxParallelism) {
  return Math.floor((keyGroup * parallelism) / maxParallelism);
}

// Convenience: the subtask a key lands on.
export function subtaskForKey(key, parallelism, maxParallelism) {
  return subtaskForKeyGroup(keyGroupFor(key, maxParallelism), parallelism, maxParallelism);
}

// Assign a list of keys to subtasks at a given parallelism.
// Returns { bySubtask: {idx:[keys]}, keyGroupOf:{key:kg}, subtaskOf:{key:idx} }.
export function assignKeys(keys, parallelism, maxParallelism) {
  const bySubtask = {};
  const keyGroupOf = {};
  const subtaskOf = {};
  for (let i = 0; i < parallelism; i++) bySubtask[i] = [];
  keys.forEach(k => {
    const kg = keyGroupFor(k, maxParallelism);
    const st = subtaskForKeyGroup(kg, parallelism, maxParallelism);
    keyGroupOf[k] = kg;
    subtaskOf[k] = st;
    bySubtask[st].push(k);
  });
  return { bySubtask, keyGroupOf, subtaskOf };
}

// Rescale: recompute assignment at newParallelism and report which keys moved.
export function rescale(keys, fromP, toP, maxParallelism) {
  const before = assignKeys(keys, fromP, maxParallelism);
  const after = assignKeys(keys, toP, maxParallelism);
  const moved = keys.filter(k => before.subtaskOf[k] !== after.subtaskOf[k]);
  return { before, after, moved, movedFraction: keys.length ? moved.length / keys.length : 0 };
}

// Watermark propagation: an operator's watermark is the MIN across its
// non-idle input partitions. Returns null if every input is idle.
export function operatorWatermark(partitionWatermarks, idleSet = new Set()) {
  const active = partitionWatermarks.filter((_, i) => !idleSet.has(i));
  if (!active.length) return null;
  return Math.min(...active);
}

// Balance metric for an assignment: max/avg keys per subtask (1.0 = perfect).
export function skewFactor(bySubtask) {
  const counts = Object.values(bySubtask).map(a => a.length);
  if (!counts.length) return 1;
  const total = counts.reduce((a, b) => a + b, 0);
  const avg = total / counts.length;
  const max = Math.max(...counts);
  return avg === 0 ? 1 : max / avg;
}
