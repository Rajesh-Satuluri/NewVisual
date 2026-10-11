// Tests for the Foundations stream engine (I28).
// Run: node --test streaming/sim/stream-engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32, generateEvents, computeWatermarks, tumblingWindowOf,
  slidingWindowsOf, runTumblingAggregation, KeyedCounter, simulateBackpressure,
} from './stream-engine.js';

test('mulberry32 is deterministic', () => {
  const a = mulberry32(7), b = mulberry32(7);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('generateEvents is deterministic for a seed', () => {
  const a = generateEvents({ seed: 1, count: 10 });
  const b = generateEvents({ seed: 1, count: 10 });
  assert.deepEqual(a, b);
});

test('generateEvents is ordered by arrival (processing time)', () => {
  const ev = generateEvents({ seed: 3, count: 15, maxDelay: 5 });
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].procTime >= ev[i - 1].procTime);
});

test('out-of-order arrivals actually occur with delay', () => {
  const ev = generateEvents({ seed: 3, count: 20, maxDelay: 5 });
  // at least one event arrives out of event-time order
  const outOfOrder = ev.some((e, i) => i > 0 && e.eventTime < ev[i - 1].eventTime);
  assert.ok(outOfOrder);
});

test('watermark = maxEventTime - allowedLateness, monotonic non-decreasing', () => {
  const ev = computeWatermarks(generateEvents({ seed: 2, count: 12, maxDelay: 3 }), 2);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].watermark >= ev[i - 1].watermark);
});

test('tumbling window assignment', () => {
  assert.deepEqual(tumblingWindowOf(1, 3), { start: 1, end: 3 });
  assert.deepEqual(tumblingWindowOf(3, 3), { start: 1, end: 3 });
  assert.deepEqual(tumblingWindowOf(4, 3), { start: 4, end: 6 });
  assert.deepEqual(tumblingWindowOf(7, 3), { start: 7, end: 9 });
});

test('sliding windows contain the event time and overlap', () => {
  const ws = slidingWindowsOf(5, 4, 2); // size 4, slide 2
  assert.ok(ws.length >= 1);
  for (const w of ws) assert.ok(5 >= w.start && 5 <= w.end);
});

test('tumbling aggregation counts on-time events per keyed window', () => {
  const events = [
    { id: 1, key: 'A', eventTime: 1, procTime: 1, value: 1 },
    { id: 2, key: 'A', eventTime: 2, procTime: 2, value: 1 },
    { id: 3, key: 'A', eventTime: 3, procTime: 3, value: 1 },
    { id: 4, key: 'B', eventTime: 2, procTime: 3, value: 1 },
  ];
  const { results } = runTumblingAggregation({ events, windowSize: 3, allowedLateness: 0, keyed: true });
  const a = results.find(r => r.key === 'A' && r.start === 1);
  const b = results.find(r => r.key === 'B' && r.start === 1);
  assert.equal(a.count, 3);
  assert.equal(b.count, 1);
});

test('late event (after watermark passes window end) is classified late, not counted on-time', () => {
  // event-time 1 window [1..3]; a big event-time 10 pushes watermark past 3,
  // then a straggler for event-time 2 arrives late.
  const events = [
    { id: 1, key: 'A', eventTime: 1, procTime: 1, value: 1 },
    { id: 2, key: 'A', eventTime: 10, procTime: 2, value: 1 },
    { id: 3, key: 'A', eventTime: 2, procTime: 3, value: 1 }, // straggler, late
  ];
  const { results, classified } = runTumblingAggregation({ events, windowSize: 3, allowedLateness: 0, keyed: true });
  const straggler = classified.find(c => c.id === 3);
  assert.equal(straggler.status, 'late');
  const w1 = results.find(r => r.key === 'A' && r.start === 1);
  assert.equal(w1.count, 1);        // only event 1 counted on-time
  assert.equal(w1.lateUpdates, 1);  // straggler tracked as late
});

test('KeyedCounter checkpoint + restore reproduces state exactly', () => {
  const c = new KeyedCounter();
  const ev = generateEvents({ seed: 9, count: 8 });
  ev.slice(0, 4).forEach(e => c.process(e));
  const cp = c.snapshot();
  // continue, then "crash" and restore to the checkpoint
  ev.slice(4).forEach(e => c.process(e));
  const crashed = new KeyedCounter();
  crashed.restore(cp);
  assert.deepEqual(crashed.snapshot(), cp);
  assert.equal(crashed.offset, ev[3].id);
});

test('backpressure: queue grows when input > process, drains otherwise', () => {
  const grow = simulateBackpressure({ steps: 5, inputRate: 100, processRate: 80 });
  assert.ok(grow[grow.length - 1].lag > grow[0].lag);
  assert.ok(grow.some(s => s.backpressured));
  const drain = simulateBackpressure({ steps: 5, inputRate: 50, processRate: 80, startQueue: 100 });
  assert.ok(drain[drain.length - 1].queue < 100);
});
