// E2 · Checkpoint engine unit tests — run: node --test checkpoint-engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASES, planBatches, Sink, CheckpointSim, simulateRecovery,
} from './checkpoint-engine.js';

const recs = (n) => Array.from({ length: n }, (_, i) => ({ id: 'r' + i }));

test('planBatches partitions into contiguous offset ranges', () => {
  const b = planBatches(recs(7), 3);
  assert.equal(b.length, 3);
  assert.deepEqual(b.map((x) => [x.start, x.end]), [[0, 3], [3, 6], [6, 7]]);
  assert.equal(b[0].records.length, 3);
  assert.equal(b[2].records.length, 1);
});

test('planBatches rejects non-positive batch size', () => {
  assert.throws(() => planBatches(recs(3), 0));
});

test('clean run: every batch offset-logged AND commit-logged, no dups', () => {
  const r = simulateRecovery(recs(6), 2);
  assert.equal(r.runResult.completed, true);
  assert.equal(r.offsetLog.length, 3);
  assert.deepEqual(r.commitLog, [0, 1, 2]);
  assert.deepEqual(r.duplicates, []);
  assert.equal(r.coversAll, true);
});

test('offset log is written BEFORE sink (crash after offset log, before sink)', () => {
  // crash in batch 1 at writeSink: batch 1 is offset-logged but not committed,
  // and its rows are NOT yet in the sink.
  const batches = planBatches(recs(6), 2);
  const sim = new CheckpointSim();
  sim.run(batches, { batchId: 1, phase: 'writeSink' });
  assert.ok(sim.offsetLog.has(1), 'batch 1 offset-logged before the crash');
  assert.ok(!sim.commitLog.has(1), 'batch 1 not committed');
  assert.ok(!sim.sink.ids().includes('r2'), 'batch 1 rows not in sink yet');
});

test('recovery replays the offset-logged-but-uncommitted batch', () => {
  const r = simulateRecovery(recs(6), 2, { crash: { batchId: 1, phase: 'writeSink' } });
  // batch 1 was replayed; all records present exactly once; batch 2 processed new.
  assert.equal(r.coversAll, true);
  assert.deepEqual(r.duplicates, []);
  assert.ok(r.recovery.some((x) => x.batchId === 1 && x.action === 'replayed'));
  assert.ok(r.recovery.some((x) => x.batchId === 2 && x.action === 'processed-new'));
});

test('exactly-once sink: crash AFTER sink, before commit → replay, NO duplicates', () => {
  // The dangerous window: rows are in the sink but the commit log says "not done".
  const r = simulateRecovery(recs(6), 2, {
    crash: { batchId: 1, phase: 'writeCommitLog' }, sinkMode: 'exactlyOnce',
  });
  assert.deepEqual(r.duplicates, [], 'transactional replace prevents duplicates');
  assert.equal(r.coversAll, true);
  assert.deepEqual(r.commitLog, [0, 1, 2]);
});

test('at-least-once sink: crash AFTER sink, before commit → replay DUPLICATES', () => {
  const r = simulateRecovery(recs(6), 2, {
    crash: { batchId: 1, phase: 'writeCommitLog' }, sinkMode: 'atLeastOnce',
  });
  // batch 1's rows (r2, r3) were written pre-crash, then written again on replay.
  const dupIds = r.duplicates.map((d) => d.id).sort();
  assert.deepEqual(dupIds, ['r2', 'r3']);
  assert.equal(r.coversAll, true, 'no data LOSS — at-least-once, not at-most-once');
});

test('crash before offset log → batch never started, replayed cleanly on restart', () => {
  const r = simulateRecovery(recs(6), 2, { crash: { batchId: 1, phase: 'writeOffsetLog' } });
  assert.ok(!r.sim.offsetLog.has(1) || r.commitLog.includes(1)); // after recovery it IS processed
  assert.equal(r.coversAll, true);
  assert.deepEqual(r.duplicates, []);
});

test('committed batch is NOT replayed (commit log short-circuits)', () => {
  // crash at the very start of batch 2: batches 0 and 1 are fully committed.
  const batches = planBatches(recs(6), 2);
  const sim = new CheckpointSim();
  sim.run(batches, { batchId: 2, phase: 'planOffsets' });
  assert.deepEqual([...sim.commitLog].sort((a, b) => a - b), [0, 1]);
  const recovery = sim.recover(batches);
  // 0 and 1 already committed → not replayed; only batch 2 processed new.
  assert.ok(!recovery.some((x) => x.action === 'replayed'));
  assert.ok(recovery.some((x) => x.batchId === 2 && x.action === 'processed-new'));
});

test('exactly-once end state is identical to a crash-free run (determinism)', () => {
  const clean = simulateRecovery(recs(8), 2);
  const crashed = simulateRecovery(recs(8), 2, { crash: { batchId: 2, phase: 'writeCommitLog' }, sinkMode: 'exactlyOnce' });
  assert.deepEqual(crashed.sinkIds.slice().sort(), clean.sinkIds.slice().sort());
  assert.deepEqual(crashed.duplicates, []);
});

test('Sink exactlyOnce replace vs atLeastOnce append', () => {
  const eo = new Sink('exactlyOnce');
  eo.write(0, [{ id: 'a' }, { id: 'b' }]); eo.write(0, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(eo.duplicates(), []);
  const al = new Sink('atLeastOnce');
  al.write(0, [{ id: 'a' }]); al.write(0, [{ id: 'a' }]);
  assert.deepEqual(al.duplicates(), [{ id: 'a', count: 2 }]);
});

test('PHASES ordering is the documented lifecycle', () => {
  assert.deepEqual(PHASES, ['planOffsets', 'writeOffsetLog', 'process', 'writeSink', 'writeCommitLog']);
});
