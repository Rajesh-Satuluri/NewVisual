// Unit tests for the pure mock-exam engine.
// Run: node --test kafka/data/mock-exam.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, shuffle, buildExam, scoreExam, verdict } from './mock-exam.js';

function mcqPool(n, group = 'Foundation') {
  return Array.from({ length: n }, (_, i) => ({
    moduleId: 'm01', group, idx: i,
    q: `Q${i}?`, options: ['a', 'b', 'c', 'd'], answer: i % 4,
    explanation: `because ${i}`,
  }));
}
function openPool(n, group = 'Foundation') {
  return Array.from({ length: n }, (_, i) => ({
    moduleId: 'm02', group, q: `Open ${i}?`, a: `Answer ${i}`, tip: `Tip ${i}`,
  }));
}

test('rng is deterministic for a seed and varies across seeds', () => {
  const a = rng(42), b = rng(42), c = rng(7);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  seqA.forEach(x => assert.ok(x >= 0 && x < 1));
});

test('shuffle preserves elements and is a new array', () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, rng(3));
  assert.notEqual(out, src);
  assert.deepEqual([...out].sort((x, y) => x - y), [1, 2, 3, 4, 5]);
});

test('buildExam is deterministic for a seed', () => {
  const opts = { mcqPool: mcqPool(20), openPool: openPool(20), length: 10, seed: 99 };
  const a = buildExam(opts);
  const b = buildExam(opts);
  assert.deepEqual(a.map(i => i.q), b.map(i => i.q));
});

test('a different seed yields a different paper', () => {
  const base = { mcqPool: mcqPool(20), openPool: openPool(20), length: 10 };
  const a = buildExam({ ...base, seed: 1 });
  const b = buildExam({ ...base, seed: 2 });
  assert.notDeepEqual(a.map(i => i.q), b.map(i => i.q));
});

test('buildExam respects requested length and open/mcq ratio', () => {
  const ex = buildExam({ mcqPool: mcqPool(20), openPool: openPool(20), length: 10, openRatio: 0.5, seed: 5 });
  assert.equal(ex.length, 10);
  const opens = ex.filter(i => i.type === 'open').length;
  assert.equal(opens, 5);
});

test('buildExam rebalances when one pool is short', () => {
  // Only 2 open questions available but ask for 10 with 50% open.
  const ex = buildExam({ mcqPool: mcqPool(20), openPool: openPool(2), length: 10, openRatio: 0.5, seed: 5 });
  assert.equal(ex.length, 10);
  assert.equal(ex.filter(i => i.type === 'open').length, 2);
  assert.equal(ex.filter(i => i.type === 'mcq').length, 8);
});

test('group filter restricts the pool', () => {
  const pool = [...mcqPool(10, 'Foundation'), ...mcqPool(10, 'CDC')];
  const ex = buildExam({ mcqPool: pool, openPool: [], groups: ['CDC'], length: 8, openRatio: 0, seed: 5 });
  assert.ok(ex.length > 0);
  assert.ok(ex.every(i => i.group === 'CDC'));
});

test('mcq option shuffle keeps the correct answer pointing at the right value', () => {
  const raw = { moduleId: 'm01', group: 'Foundation', idx: 0, q: 'Q?', options: ['RIGHT', 'w1', 'w2', 'w3'], answer: 0, explanation: 'x' };
  // Build many papers; the normalized answer index must always point to "RIGHT".
  for (let s = 1; s <= 20; s++) {
    const ex = buildExam({ mcqPool: [raw], openPool: [], length: 1, openRatio: 0, seed: s });
    const item = ex[0];
    assert.equal(item.options[item.answer], 'RIGHT');
    assert.equal(item.srsId, 'q:m01:0');
  }
});

test('scoreExam grades mcq correctness and collects missed SRS ids', () => {
  const items = [
    { type: 'mcq', group: 'Foundation', srsId: 'q:m01:0', answer: 2 },
    { type: 'mcq', group: 'Foundation', srsId: 'q:m01:1', answer: 0 },
    { type: 'mcq', group: 'CDC', srsId: 'q:m25:3', answer: 1 },
  ];
  const resp = [{ selected: 2 }, { selected: 3 }, { selected: null }];
  const s = scoreExam(items, resp);
  assert.equal(s.mcqTotal, 3);
  assert.equal(s.mcqCorrect, 1);
  assert.equal(s.answered, 2);
  assert.deepEqual(s.missedSrsIds.sort(), ['q:m01:1', 'q:m25:3']);
  assert.equal(s.byGroup.Foundation.correct, 1);
  assert.equal(s.byGroup.Foundation.total, 2);
});

test('scoreExam weights open self-ratings got=1 partial=0.5 missed=0', () => {
  const items = [
    { type: 'open', group: 'Core Internals' },
    { type: 'open', group: 'Core Internals' },
    { type: 'open', group: 'Core Internals' },
  ];
  const resp = [{ rating: 'got' }, { rating: 'partial' }, { rating: 'missed' }];
  const s = scoreExam(items, resp);
  assert.equal(s.points, 1.5);
  assert.equal(s.scorePct, 50); // 1.5 / 3
  assert.deepEqual(s.openByRating, { got: 1, partial: 1, missed: 1 });
  assert.equal(s.missedSrsIds.length, 0); // open questions are not SRS deck cards
});

test('scoreExam mixed paper computes a combined percentage', () => {
  const items = [
    { type: 'mcq', group: 'G', srsId: 'q:m01:0', answer: 0 },
    { type: 'open', group: 'G' },
  ];
  const s = scoreExam(items, [{ selected: 0 }, { rating: 'partial' }]);
  assert.equal(s.points, 1.5);
  assert.equal(s.scorePct, 75);
});

test('verdict bands map score to a label', () => {
  assert.equal(verdict(90).tone, 'great');
  assert.equal(verdict(75).tone, 'good');
  assert.equal(verdict(55).tone, 'ok');
  assert.equal(verdict(30).tone, 'low');
});
