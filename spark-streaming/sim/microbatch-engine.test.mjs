// Node unit tests for the micro-batch keystone engine.
// Run: node --test spark-streaming/sim/microbatch-engine.test.mjs
//
// These assert the engine against hand-computed Spark Structured Streaming
// semantics — the honest "provably correct" guarantee, like Kafka's murmur2
// test vectors.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MicroBatchQuery,
  planBatches,
  assignTumbling,
  assignSliding,
} from './microbatch-engine.js';

const rec = (eventTime, extra = {}) => ({ eventTime, ...extra });

// ── Window assignment ────────────────────────────────────────────────────────
test('assignTumbling: one window, [start,end) with end exclusive', () => {
  assert.deepEqual(assignTumbling(7, 5), [{ start: 5, end: 10 }]);
  assert.deepEqual(assignTumbling(10, 5), [{ start: 10, end: 15 }]); // boundary → next window
  assert.deepEqual(assignTumbling(0, 5), [{ start: 0, end: 5 }]);
});

test('assignSliding: record lands in ⌈size/slide⌉ overlapping windows', () => {
  assert.deepEqual(assignSliding(7, 10, 5), [
    { start: 0, end: 10 },
    { start: 5, end: 15 },
  ]);
  assert.deepEqual(assignSliding(12, 10, 5), [
    { start: 5, end: 15 },
    { start: 10, end: 20 },
  ]);
});

test('assignSliding: slide > size leaves gaps (a record can hit 0 or 1 window)', () => {
  assert.deepEqual(assignSliding(7, 3, 5), [{ start: 5, end: 8 }]);
  assert.deepEqual(assignSliding(4, 3, 5), []); // falls in the gap between [0,3) and [5,8)
});

// ── Watermark ────────────────────────────────────────────────────────────────
test('watermark is monotonic: a later batch with smaller event times cannot lower it', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'append' });
  const b1 = q.processBatch([rec(25)]);
  assert.equal(b1.watermarkAfter, 25);
  const b2 = q.processBatch([rec(5)]); // 5 < 25 → dropped, max stays 25
  assert.equal(b2.watermarkAfter, 25);
});

test('late data dropped exactly at the watermark boundary (< wm drops, == wm kept)', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'append' });
  q.processBatch([rec(20)]); // watermark → 20
  const b2 = q.processBatch([rec(19), rec(20), rec(21)]);
  assert.equal(b2.droppedCount, 1);
  assert.equal(b2.dropped[0].eventTime, 19);
  assert.equal(b2.accepted, 2);
});

// ── Append mode ──────────────────────────────────────────────────────────────
test('append: a window is emitted once, only after the watermark passes its end, then evicted', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'append' });
  const b1 = q.processBatch([rec(1), rec(2)]); // window [0,10) count 2, not closed (wm=2)
  assert.equal(b1.emitted.length, 0);
  assert.equal(b1.state.length, 1);

  const b2 = q.processBatch([rec(15)]); // wm → 15, closes [0,10)
  assert.equal(b2.emitted.length, 1);
  assert.deepEqual(b2.emitted[0].window, { start: 0, end: 10 });
  assert.equal(b2.emitted[0].value, 2);
  assert.equal(b2.emitted[0].closed, true);
  // [0,10) is evicted; only [10,20) remains open
  assert.equal(b2.state.length, 1);
  assert.deepEqual(b2.state[0].window, { start: 10, end: 20 });

  const b3 = q.processBatch([rec(16)]); // [0,10) must NOT be emitted again
  assert.equal(b3.emitted.length, 0);
});

// ── Update mode ──────────────────────────────────────────────────────────────
test('update: emits only rows whose aggregate changed this batch', () => {
  const q = new MicroBatchQuery({
    window: { type: 'tumbling', size: 10 },
    outputMode: 'update',
    watermarkDelay: 100, // keep everything open so nothing evicts
  });
  const b1 = q.processBatch([rec(5)]); // touches [0,10)
  assert.equal(b1.emitted.length, 1);
  assert.deepEqual(b1.emitted[0].window, { start: 0, end: 10 });

  const b2 = q.processBatch([rec(50)]); // touches only [50,60)
  assert.equal(b2.emitted.length, 1);
  assert.equal(b2.emitted[0].window.start, 50);
});

// ── Complete mode ────────────────────────────────────────────────────────────
test('complete: re-emits the ENTIRE result table every batch, including unchanged rows', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'complete' });
  q.processBatch([rec(5)]);
  const b2 = q.processBatch([rec(55)]);
  assert.equal(b2.emitted.length, 2); // [0,10) (unchanged) AND [50,60)
});

test('complete: never drops late data and never evicts (unbounded state)', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'complete' });
  q.processBatch([rec(100)]); // watermark would be 100 in append/update
  const b2 = q.processBatch([rec(5)]); // would be "late" in append/update
  assert.equal(b2.droppedCount, 0);
  assert.equal(b2.state.length, 2); // [0,10) kept despite watermark past it
});

// ── Determinism ──────────────────────────────────────────────────────────────
test('determinism: same input + config ⇒ byte-identical trace', () => {
  const cfg = {
    window: { type: 'sliding', size: 10, slide: 5 },
    outputMode: 'append',
    watermarkDelay: 2,
    aggregate: { fn: 'sum', field: 'value' },
    groupBy: 'key',
  };
  const input = [
    rec(1, { key: 'a', value: 3 }),
    rec(7, { key: 'b', value: 2 }),
    rec(12, { key: 'a', value: 5 }),
    rec(30, { key: 'a', value: 1 }),
  ];
  const batches = [input.slice(0, 2), input.slice(2, 3), input.slice(3)];
  const r1 = new MicroBatchQuery(cfg).run(batches);
  const r2 = new MicroBatchQuery(cfg).run(batches);
  assert.deepEqual(r1, r2);
});

// ── Empty batch ──────────────────────────────────────────────────────────────
test('empty batch is a no-op: watermark, state and emission unchanged', () => {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 10 }, outputMode: 'append' });
  q.processBatch([rec(5)]); // wm=5, state [0,10) count 1
  const b2 = q.processBatch([]);
  assert.equal(b2.watermarkAfter, 5);
  assert.equal(b2.emitted.length, 0);
  assert.equal(b2.state.length, 1);
  assert.equal(b2.state[0].value, 1);
});

// ── Sliding / aggregates / groupBy ───────────────────────────────────────────
test('sliding windows double-count: one record contributes to its 2 overlapping windows', () => {
  const q = new MicroBatchQuery({
    window: { type: 'sliding', size: 10, slide: 5 },
    outputMode: 'complete',
  });
  const b1 = q.processBatch([rec(7)]);
  assert.equal(b1.state.length, 2);
  assert.deepEqual(b1.state.map((r) => r.value), [1, 1]); // [0,10) and [5,15)
});

test('sum aggregator sums the value field within a window', () => {
  const q = new MicroBatchQuery({
    window: { type: 'tumbling', size: 10 },
    outputMode: 'complete',
    aggregate: { fn: 'sum', field: 'value' },
  });
  const b1 = q.processBatch([rec(1, { value: 5 }), rec(2, { value: 7 })]);
  assert.equal(b1.emitted[0].value, 12);
});

test('groupBy produces an independent window per key', () => {
  const q = new MicroBatchQuery({
    window: { type: 'tumbling', size: 10 },
    outputMode: 'complete',
    groupBy: 'key',
  });
  const b1 = q.processBatch([rec(1, { key: 'a' }), rec(2, { key: 'b' }), rec(3, { key: 'a' })]);
  assert.equal(b1.emitted.length, 2);
  const a = b1.emitted.find((r) => r.key === 'a');
  const b = b1.emitted.find((r) => r.key === 'b');
  assert.equal(a.value, 2);
  assert.equal(b.value, 1);
});

// ── Session windows ──────────────────────────────────────────────────────────
test('session windows merge events within the gap and split beyond it', () => {
  const q = new MicroBatchQuery({ window: { type: 'session', gap: 5 }, outputMode: 'complete' });
  const b1 = q.processBatch([rec(10), rec(12), rec(100)]);
  assert.equal(b1.state.length, 2); // {10..17} merged, {100..105} separate
  assert.deepEqual(b1.state[0].window, { start: 10, end: 17 });
  assert.equal(b1.state[0].value, 2);
  assert.deepEqual(b1.state[1].window, { start: 100, end: 105 });

  // Exactly `gap` apart ⇒ NOT merged (boundary is exclusive)
  const q2 = new MicroBatchQuery({ window: { type: 'session', gap: 5 }, outputMode: 'complete' });
  const r = q2.processBatch([rec(10), rec(15)]);
  assert.equal(r.state.length, 2);
});

test('session append: a closed session is emitted exactly once, then evicted', () => {
  const q = new MicroBatchQuery({ window: { type: 'session', gap: 5 }, outputMode: 'append' });
  q.processBatch([rec(10), rec(12)]); // session [10,17) count 2, wm=12, open
  const b2 = q.processBatch([rec(30)]); // wm=30 → [10,17) closes
  assert.equal(b2.emitted.length, 1);
  assert.deepEqual(b2.emitted[0].window, { start: 10, end: 17 });
  assert.equal(b2.emitted[0].value, 2);
  const b3 = q.processBatch([rec(31)]); // extends [30,36); [10,17) must not re-emit
  assert.equal(b3.emitted.length, 0);
});

// ── Trigger planning ─────────────────────────────────────────────────────────
test('planBatches processingTime buckets by arrival time (empty intervals included)', () => {
  const batches = planBatches(
    [
      rec(0, { arrivalTime: 0 }),
      rec(1, { arrivalTime: 0 }),
      rec(2, { arrivalTime: 10 }),
      rec(3, { arrivalTime: 25 }),
    ],
    { type: 'processingTime', interval: 10 }
  );
  assert.deepEqual(batches.map((b) => b.length), [2, 1, 1]);
});

test('planBatches once ⇒ a single batch with everything; availableNow can split', () => {
  const once = planBatches([rec(1), rec(2), rec(3)], { type: 'once' });
  assert.equal(once.length, 1);
  assert.equal(once[0].length, 3);
  const now = planBatches([rec(1), rec(2), rec(3)], { type: 'availableNow', maxEventsPerBatch: 2 });
  assert.deepEqual(now.map((b) => b.length), [2, 1]);
});
