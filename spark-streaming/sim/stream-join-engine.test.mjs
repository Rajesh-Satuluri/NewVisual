// E3 · Stream-join engine unit tests — run: node --test stream-join-engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOIN_TYPES, StreamJoin, runJoin } from './stream-join-engine.js';

const L = (id, key, t) => ({ id, key, eventTime: t });
const R = (id, key, t) => ({ id, key, eventTime: t });

test('inner: matching rows within the time window emit immediately', () => {
  const { trace } = runJoin([{ left: [L('L1', 'k', 5)], right: [R('R1', 'k', 6)] }],
    { joinType: 'inner', watermarkDelay: 0, timeWindow: 2 });
  assert.equal(trace[0].emitted.length, 1);
  assert.equal(trace[0].emitted[0].type, 'inner');
  assert.equal(trace[0].emitted[0].left.id, 'L1');
  assert.equal(trace[0].emitted[0].right.id, 'R1');
});

test('inner: rows outside the time window do NOT match', () => {
  const { trace } = runJoin([{ left: [L('L1', 'k', 5)], right: [R('R1', 'k', 8)] }],
    { joinType: 'inner', watermarkDelay: 0, timeWindow: 1 });
  assert.equal(trace[0].emitted.length, 0);
});

test('inner: different keys do not match', () => {
  const { trace } = runJoin([{ left: [L('L1', 'a', 5)], right: [R('R1', 'b', 5)] }],
    { joinType: 'inner', watermarkDelay: 0, timeWindow: 5 });
  assert.equal(trace[0].emitted.length, 0);
});

test('inner: cross-batch match when the other side arrives later', () => {
  const { trace } = runJoin([
    { left: [L('L1', 'k', 5)], right: [] },
    { left: [], right: [R('R1', 'k', 6)] },
  ], { joinType: 'inner', watermarkDelay: 0, timeWindow: 3 });
  assert.equal(trace[0].emitted.length, 0, 'no match in batch 0');
  assert.equal(trace[1].emitted.length, 1, 'match emitted in batch 1');
  assert.equal(trace[1].emitted[0].right.id, 'R1');
});

test('inner: a pair is emitted at most once (no duplicate across batches)', () => {
  const { trace } = runJoin([
    { left: [L('L1', 'k', 5)], right: [R('R1', 'k', 6)] },
    { left: [], right: [R('R2', 'k', 7)] },
  ], { joinType: 'inner', watermarkDelay: 0, timeWindow: 5 });
  assert.equal(trace[0].emitted.length, 1); // L1-R1
  // batch 1: only the NEW pair L1-R2, never L1-R1 again
  assert.equal(trace[1].emitted.length, 1);
  assert.equal(trace[1].emitted[0].right.id, 'R2');
});

test('leftOuter: unmatched left row emits a null-padded result at eviction', () => {
  const { trace } = runJoin([
    { left: [L('L1', 'k', 5)], right: [] },
    { left: [], right: [R('R9', 'other', 20)] }, // advances right wm so L1 evicts
  ], { joinType: 'leftOuter', watermarkDelay: 0, timeWindow: 1 });
  assert.equal(trace[0].emitted.length, 0);
  const outer = trace[1].emitted.find((e) => e.type === 'leftOuter');
  assert.ok(outer, 'leftOuter null row emitted at eviction');
  assert.equal(outer.left.id, 'L1');
  assert.equal(outer.right, null);
});

test('inner: unmatched row evicts silently (no null emission)', () => {
  const { trace } = runJoin([
    { left: [L('L1', 'k', 5)], right: [] },
    { left: [], right: [R('R9', 'other', 20)] },
  ], { joinType: 'inner', watermarkDelay: 0, timeWindow: 1 });
  assert.equal(trace[1].emitted.length, 0, 'inner never emits nulls');
  assert.equal(trace[1].leftState.length, 0, 'but L1 is evicted from state');
});

test('rightOuter: unmatched right row emits null-padded result at eviction', () => {
  const { trace } = runJoin([
    { left: [], right: [R('R1', 'k', 5)] },
    { left: [L('L9', 'other', 20)], right: [] },
  ], { joinType: 'rightOuter', watermarkDelay: 0, timeWindow: 1 });
  const outer = trace[1].emitted.find((e) => e.type === 'rightOuter');
  assert.ok(outer);
  assert.equal(outer.right.id, 'R1');
  assert.equal(outer.left, null);
});

test('global watermark is the MIN of the two per-side watermarks', () => {
  const j = new StreamJoin({ joinType: 'inner', watermarkDelay: 0, timeWindow: 1 });
  const e = j.processBatch({ left: [L('L1', 'k', 10)], right: [R('R1', 'k', 4)] });
  assert.equal(e.wmL, 10);
  assert.equal(e.wmR, 4);
  assert.equal(e.watermarkAfter, 4, 'global = min(10,4)');
});

test('late rows below the global watermark are dropped', () => {
  const { trace } = runJoin([
    { left: [L('L1', 'k', 10)], right: [R('R1', 'k', 10)] }, // sets wm to 10
    { left: [L('L2', 'k', 5)], right: [] },                  // 5 < 10 -> dropped
  ], { joinType: 'inner', watermarkDelay: 0, timeWindow: 1 });
  assert.equal(trace[1].droppedCount, 1);
  assert.equal(trace[1].dropped[0].id, 'L2');
  assert.equal(trace[1].emitted.length, 0);
});

test('watermark delay widens the matching grace before eviction', () => {
  // With delay 3, the right watermark lags, so a left row survives longer.
  const { trace } = runJoin([
    { left: [L('L1', 'k', 5)], right: [] },
    { left: [], right: [R('R1', 'k', 10)] }, // |5-10|=5 > window 2 -> no match
  ], { joinType: 'inner', watermarkDelay: 3, timeWindow: 2 });
  // right wm after batch1 = 10-3 = 7; evict left L1 if wmR(7) > 5+2=7? strict > -> no, kept
  assert.equal(trace[1].leftState.length, 1, 'L1 still buffered under the delay');
});

test('determinism: same input + config yields identical traces', () => {
  const batches = [
    { left: [L('L1', 'k', 5), L('L2', 'k', 6)], right: [R('R1', 'k', 5)] },
    { left: [], right: [R('R2', 'k', 7)] },
  ];
  const cfg = { joinType: 'inner', watermarkDelay: 1, timeWindow: 3 };
  assert.deepEqual(runJoin(batches, cfg).trace, runJoin(batches, cfg).trace);
});

test('JOIN_TYPES are the supported set; bad type throws', () => {
  assert.deepEqual(JOIN_TYPES, ['inner', 'leftOuter', 'rightOuter']);
  assert.throws(() => new StreamJoin({ joinType: 'fullOuter' }));
});
