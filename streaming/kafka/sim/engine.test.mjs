// Unit tests for the Kafka simulation engine.
// Run:  node --test kafka/sim/engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KafkaSim, murmur2, partitionForKey, utf8Bytes, mulberry32,
} from './engine.js';

// ── murmur2 matches Kafka's published test vectors ───────────────────────────
// Verified against org.apache.kafka.common.utils.UtilsTest.testMurmur2.
test('murmur2 matches Kafka published vectors', () => {
  assert.equal(murmur2(utf8Bytes('21')), -973932308);
  assert.equal(murmur2(utf8Bytes('foobar')), -790332482);
  assert.equal(murmur2(utf8Bytes('a-little-bit-long-string')), -985981536);
});

// Regression guard on our own routing inputs (computed from the verified impl).
test('murmur2 stable for routing inputs', () => {
  assert.equal(murmur2(utf8Bytes('')), 275646681);
  assert.equal(murmur2(utf8Bytes('kafka')), -798503068);
  assert.equal(murmur2(utf8Bytes('hello')), 2132663229);
});

// ── Keyed routing is deterministic and in range ──────────────────────────────
test('partitionForKey is stable and in range', () => {
  for (const k of ['order-1', 'customer-42', 'US', 'product-x', '']) {
    const p = partitionForKey(k, 6);
    assert.ok(p >= 0 && p < 6, `${k} -> ${p} out of range`);
    assert.equal(partitionForKey(k, 6), p, 'same key must route to same partition');
  }
});

test('same key always lands on the same partition (ordering boundary)', () => {
  const sim = new KafkaSim({ seed: 7, brokers: 3 });
  sim.createTopic('orders', { partitions: 4, replicationFactor: 1 });
  const first = sim.produce('orders', { key: 'cust-99', value: 'a' }).partition;
  for (let i = 0; i < 20; i++) {
    assert.equal(sim.produce('orders', { key: 'cust-99', value: i }).partition, first);
  }
});

// ── Offsets increase per partition ───────────────────────────────────────────
test('offsets are per-partition and monotonic', () => {
  const sim = new KafkaSim({ seed: 1 });
  sim.createTopic('t', { partitions: 3 });
  const seen = {};
  for (let i = 0; i < 30; i++) {
    const r = sim.produce('t', { key: 'k' + (i % 5), value: i });
    seen[r.partition] = (seen[r.partition] ?? -1) + 1;
    assert.equal(r.offset, seen[r.partition], 'offset should equal prior count on that partition');
  }
});

// ── Determinism: reset reproduces identical state ────────────────────────────
test('reset + same ops produce identical snapshot', () => {
  const build = () => {
    const sim = new KafkaSim({ seed: 123, brokers: 3 });
    sim.createTopic('orders', { partitions: 5, replicationFactor: 2 });
    sim.produceBatch('orders', Array.from({ length: 50 }, (_, i) => ({ key: null, value: i })));
    sim.produceBatch('orders', Array.from({ length: 50 }, (_, i) => ({ key: 'c' + i, value: i })));
    return sim.snapshot();
  };
  assert.deepEqual(build(), build());
});

// ── Hot partition detection ──────────────────────────────────────────────────
test('low-cardinality key creates a hot partition', () => {
  const sim = new KafkaSim({ seed: 3 });
  sim.createTopic('orders', { partitions: 5 });
  // 80% US, rest spread — classic skew.
  for (let i = 0; i < 100; i++) {
    const key = i < 80 ? 'US' : ['EU', 'APAC', 'LATAM', 'MEA'][i % 4];
    sim.produce('orders', { key, value: i });
  }
  const hot = sim.hotPartition('orders');
  assert.ok(hot.isHot, 'expected a hot partition');
  assert.ok(hot.pct >= 0.6, `expected dominant partition ≥60%, got ${hot.pct}`);
});

test('high-cardinality key spreads evenly (no hot partition)', () => {
  const sim = new KafkaSim({ seed: 3 });
  sim.createTopic('orders', { partitions: 5 });
  for (let i = 0; i < 5000; i++) sim.produce('orders', { key: 'order-' + i, value: i });
  const hot = sim.hotPartition('orders');
  assert.equal(hot.isHot, false, `unexpected skew: ${JSON.stringify(hot)}`);
  // Each partition should be within ~15% of even share.
  for (const s of sim.partitionStats('orders')) {
    assert.ok(Math.abs(s.pct - 0.2) < 0.03, `partition ${s.partition} off: ${s.pct}`);
  }
});

// ── Config validation ────────────────────────────────────────────────────────
test('replicationFactor cannot exceed live brokers', () => {
  const sim = new KafkaSim({ seed: 1, brokers: 2 });
  assert.throws(() => sim.createTopic('t', { partitions: 1, replicationFactor: 3 }),
    /replicationFactor/);
});

test('duplicate topic rejected', () => {
  const sim = new KafkaSim({ seed: 1 });
  sim.createTopic('t', { partitions: 1 });
  assert.throws(() => sim.createTopic('t', { partitions: 1 }), /already exists/);
});

// ── Replica placement ────────────────────────────────────────────────────────
test('replicas spread across brokers, leader is first replica', () => {
  const sim = new KafkaSim({ seed: 1, brokers: 3 });
  const t = sim.createTopic('t', { partitions: 3, replicationFactor: 2 });
  for (const p of t.partitions) {
    assert.equal(p.replicas.length, 2);
    assert.equal(p.leader, p.replicas[0]);
    assert.deepEqual(p.isr, p.replicas);
    assert.notEqual(p.replicas[0], p.replicas[1], 'replicas must be on distinct brokers');
  }
});

// ── PRNG determinism ─────────────────────────────────────────────────────────
test('mulberry32 is deterministic', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
