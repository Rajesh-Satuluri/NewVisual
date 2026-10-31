// Unit tests for the cloud-sync merge core. Run:
//   node --test kafka/components/cloudsync.test.mjs
// These exercise only the pure functions — no DOM, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAll, mergeProgress, unionArrays, isSyncedKey } from './cloudsync.js';

test('isSyncedKey matches kafka- and kafka_ prefixes only', () => {
  assert.ok(isSyncedKey('kafka-done'));
  assert.ok(isSyncedKey('kafka_quiz_m01'));
  assert.ok(isSyncedKey('kafka-progress-v1'));
  assert.equal(isSyncedKey('kafka:synccode'), false); // the code itself never syncs
  assert.equal(isSyncedKey('other-key'), false);
  assert.equal(isSyncedKey(null), false);
});

test('kafka-done unions module ids across devices', () => {
  const out = mergeAll({}, { 'kafka-done': ['m01', 'm23'] }, { 'kafka-done': ['m23', 'm30'] });
  assert.deepEqual([...out['kafka-done']].sort(), ['m01', 'm23', 'm30']);
});

test('unionArrays tolerates non-arrays', () => {
  assert.deepEqual(unionArrays(null, ['a']), ['a']);
  assert.deepEqual(unionArrays(['a'], undefined), ['a']);
});

test('progress quiz: a pass on either device is never lost, best is the max', () => {
  const local = { quiz: { m05: { passed: true, best: 3, ts: 100 } } };
  const remote = { quiz: { m05: { passed: false, best: 2, ts: 200 } } }; // newer but a fail
  const out = mergeProgress(local, remote);
  assert.equal(out.quiz.m05.passed, true, 'pass survives a newer fail');
  assert.equal(out.quiz.m05.best, 3, 'best score is the max');
});

test('progress: newer ts wins non-monotonic fields; correct never regresses', () => {
  const local = { decisions: { d1: { correct: true, note: 'old', ts: 10 } } };
  const remote = { decisions: { d1: { correct: false, note: 'new', ts: 20 } } };
  const out = mergeProgress(local, remote);
  assert.equal(out.decisions.d1.note, 'new', 'newer record fields win');
  assert.equal(out.decisions.d1.correct, true, 'a correct answer is not un-done');
});

test('progress: category present on only one side is kept whole', () => {
  const out = mergeProgress({ srs: { c1: { ts: 5 } } }, {});
  assert.deepEqual(out.srs, { c1: { ts: 5 } });
});

test('kafka-progress-v1 is deep-merged through mergeAll', () => {
  const out = mergeAll(
    {},
    { 'kafka-progress-v1': { quiz: { m01: { passed: true, ts: 1 } } } },
    { 'kafka-progress-v1': { quiz: { m02: { passed: true, ts: 1 } } } }
  );
  assert.equal(out['kafka-progress-v1'].quiz.m01.passed, true);
  assert.equal(out['kafka-progress-v1'].quiz.m02.passed, true);
});

test('kafka_quiz_* takes the numeric maximum', () => {
  const out = mergeAll({}, { 'kafka_quiz_m01': 2 }, { 'kafka_quiz_m01': 3 });
  assert.equal(out['kafka_quiz_m01'], 3);
  const out2 = mergeAll({}, { 'kafka_quiz_m02': 3 }, {});
  assert.equal(out2['kafka_quiz_m02'], 3);
});

test('generic key: a local change over the common ancestor wins', () => {
  const base = { 'kafka-theme': 'dark' };
  const out = mergeAll(base, { 'kafka-theme': 'light' }, { 'kafka-theme': 'dark' });
  assert.equal(out['kafka-theme'], 'light');
});

test('generic key: untouched locally => remote (another device) wins', () => {
  const base = { 'kafka_selfx_m01_0': 'orig' };
  const out = mergeAll(base,
    { 'kafka_selfx_m01_0': 'orig' },          // unchanged here
    { 'kafka_selfx_m01_0': 'edited elsewhere' });
  assert.equal(out['kafka_selfx_m01_0'], 'edited elsewhere');
});

test('generic key: a local deletion sticks when remote is unchanged', () => {
  const base = { 'kafka_selfx_m01_0': 'note' };
  const out = mergeAll(base, {}, { 'kafka_selfx_m01_0': 'note' });
  assert.equal('kafka_selfx_m01_0' in out, false);
});

test('generic key: a concurrent remote change beats a local deletion', () => {
  const base = { 'kafka_selfx_m01_0': 'note' };
  const out = mergeAll(base, {}, { 'kafka_selfx_m01_0': 'changed' });
  assert.equal(out['kafka_selfx_m01_0'], 'changed');
});

test('non-synced keys are ignored entirely', () => {
  const out = mergeAll({}, { 'other': 1 }, { 'kafka:synccode': 'x' });
  assert.deepEqual(out, {});
});

test('merge is idempotent — merging a result with itself is stable', () => {
  const local = {
    'kafka-done': ['m01'],
    'kafka-progress-v1': { quiz: { m01: { passed: true, best: 3, ts: 9 } } },
    'kafka_quiz_m01': 3,
    'kafka-theme': 'light'
  };
  const once = mergeAll({}, local, {});
  const twice = mergeAll(once, once, once);
  assert.deepEqual(twice, once);
});
