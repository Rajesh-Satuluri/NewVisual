// Unit tests for the pure Debezium-internals derivations.
// Run: node --test kafka/sim/debezium-internals.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import CDCSim from './cdc-engine.js';
import {
  relationOid, oldTuple, pgoutputFrames, traceStages,
  atLeastOnceReplay, incrementalSnapshotPlan, SNAPSHOT_MODES, INTERNAL_STORES,
} from './debezium-internals.js';

const ordersFull = { name: 'orders', pk: 'id', columns: ['id', 'status', 'amount'], replicaIdentity: 'full' };
const ordersDefault = { name: 'orders', pk: 'id', columns: ['id', 'status', 'amount'], replicaIdentity: 'default' };

// ── relationOid ──────────────────────────────────────────────────────────────
test('relationOid is deterministic and in the user-object range', () => {
  assert.equal(relationOid('orders'), relationOid('orders'));
  assert.notEqual(relationOid('orders'), relationOid('customers'));
  const oid = relationOid('orders');
  assert.ok(oid >= 16384 && oid < 16384 + 40000);
});

// ── oldTuple / REPLICA IDENTITY ──────────────────────────────────────────────
test('insert has no old tuple', () => {
  assert.equal(oldTuple({ op: 'c', before: null, after: { id: 1 } }, ordersFull), null);
});

test('UPDATE old tuple is key-only under DEFAULT, full under FULL', () => {
  const change = { op: 'u', before: { id: 1, status: 'NEW', amount: 10 }, after: { id: 1, status: 'PAID', amount: 10 } };
  const def = oldTuple(change, ordersDefault);
  assert.equal(def.kind, 'K');
  assert.deepEqual(def.columns, { id: 1 });
  const full = oldTuple(change, ordersFull);
  assert.equal(full.kind, 'O');
  assert.deepEqual(full.columns, { id: 1, status: 'NEW', amount: 10 });
});

test('DELETE old tuple is key-only under DEFAULT, full under FULL', () => {
  const change = { op: 'd', before: { id: 7, status: 'PAID', amount: 99 }, after: null };
  assert.deepEqual(oldTuple(change, ordersDefault).columns, { id: 7 });
  assert.deepEqual(oldTuple(change, ordersFull).columns, { id: 7, status: 'PAID', amount: 99 });
});

// ── pgoutputFrames ───────────────────────────────────────────────────────────
test('pgoutput frames a single UPDATE as BEGIN · RELATION · UPDATE · COMMIT', () => {
  const change = { op: 'u', table: 'orders', key: 1, before: { id: 1, status: 'NEW', amount: 10 }, after: { id: 1, status: 'PAID', amount: 10 }, lsn: 42, txId: 500 };
  const { viaWal, frames } = pgoutputFrames(change, ordersFull);
  assert.equal(viaWal, true);
  assert.deepEqual(frames.map(f => f.type), ['BEGIN', 'RELATION', 'UPDATE', 'COMMIT']);
  assert.equal(frames[0].fields.final_lsn, 42);
  assert.equal(frames[0].fields.xid, 500);
  assert.equal(frames[3].fields.commit_lsn, 42);
});

test('pgoutput can skip the cached RELATION message', () => {
  const change = { op: 'c', table: 'orders', key: 2, before: null, after: { id: 2, status: 'NEW', amount: 5 }, lsn: 10, txId: 1 };
  const { frames } = pgoutputFrames(change, ordersFull, { includeRelation: false });
  assert.deepEqual(frames.map(f => f.type), ['BEGIN', 'INSERT', 'COMMIT']);
});

test('pgoutput UPDATE old-tuple submessage reflects replica identity', () => {
  const change = { op: 'u', table: 'orders', key: 1, before: { id: 1, status: 'NEW', amount: 10 }, after: { id: 1, status: 'PAID', amount: 10 }, lsn: 5, txId: 2 };
  const full = pgoutputFrames(change, ordersFull).frames.find(f => f.type === 'UPDATE');
  assert.match(full.fields.old_tuple, /^O: /);
  const def = pgoutputFrames(change, ordersDefault).frames.find(f => f.type === 'UPDATE');
  assert.match(def.fields.old_tuple, /^K: /);
});

test('snapshot read does NOT go through pgoutput', () => {
  const change = { op: 'r', table: 'orders', key: 1, before: null, after: { id: 1, status: 'NEW', amount: 10 }, lsn: 1, txId: null };
  const res = pgoutputFrames(change, ordersFull);
  assert.equal(res.viaWal, false);
  assert.equal(res.frames.length, 0);
  assert.match(res.note, /SELECT/i);
});

// ── traceStages (end to end, over a REAL engine event) ───────────────────────
test('traceStages produces the seven hops over a real engine update event', () => {
  const sim = new CDCSim({ seed: 7 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'], replicaIdentity: 'full' });
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  sim.applyUpdate('orders', 1, { status: 'PAID' });
  const [ev] = sim.poll();
  const table = sim.getTable('orders');
  const stages = traceStages(ev, table, "UPDATE orders SET status='PAID' WHERE id=1;");
  assert.deepEqual(stages.map(s => s.id), ['sql', 'wal', 'pgoutput', 'decode', 'converter', 'kafka', 'consumer']);
  // The Kafka hop must carry the REAL engine partition/offset, not a guess.
  const kafka = stages.find(s => s.id === 'kafka');
  assert.equal(kafka.body.partition, ev.kafka.partition);
  assert.equal(kafka.body.offset, ev.kafka.offset);
  // The converter envelope has before AND after for an update.
  const conv = stages.find(s => s.id === 'converter');
  assert.equal(conv.body.op, 'u');
  assert.equal(conv.body.before.status, 'NEW');
  assert.equal(conv.body.after.status, 'PAID');
});

test('traceStages delete hop materializes as a DELETE on the sink', () => {
  const sim = new CDCSim({ seed: 3 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'], replicaIdentity: 'full' });
  sim.applyInsert('orders', { id: 9, status: 'NEW', amount: 1 });
  sim.poll();
  sim.applyDelete('orders', 9);
  const [ev] = sim.poll();
  const stages = traceStages(ev, sim.getTable('orders'), 'DELETE FROM orders WHERE id=9;');
  const consumer = stages.find(s => s.id === 'consumer');
  assert.match(consumer.body, /DELETE FROM sink/);
});

// ── atLeastOnceReplay ────────────────────────────────────────────────────────
test('at-least-once redelivers everything after the committed offset', () => {
  const r = atLeastOnceReplay([10, 20, 30, 40], 20);
  assert.deepEqual(r.redelivered, [30, 40]);
  assert.equal(r.duplicateCount, 2);
  assert.equal(r.firstDuplicateLsn, 30);
});

test('at-least-once with a fully-committed offset redelivers nothing', () => {
  const r = atLeastOnceReplay([10, 20, 30], 30);
  assert.deepEqual(r.redelivered, []);
  assert.equal(r.duplicateCount, 0);
  assert.equal(r.firstDuplicateLsn, null);
});

// ── incrementalSnapshotPlan (DBLog watermarks) ───────────────────────────────
test('incremental snapshot chunks keys and brackets each with low/high watermarks', () => {
  const plan = incrementalSnapshotPlan([1, 2, 3, 4, 5], 2);
  assert.equal(plan.chunks, 3);
  const phases = plan.steps.map(s => s.phase);
  // three chunks × (low, read, high) + done
  assert.equal(phases.filter(p => p === 'low-watermark').length, 3);
  assert.equal(phases.filter(p => p === 'high-watermark').length, 3);
  assert.equal(phases[phases.length - 1], 'done');
});

test('a concurrent streamed change inside the window wins over the snapshot read', () => {
  const plan = incrementalSnapshotPlan([1, 2, 3, 4], 2, 3);
  const readWithDedup = plan.steps.find(s => s.phase === 'read' && s.deduped.includes(3));
  assert.ok(readWithDedup, 'key 3 is deduped in its chunk read');
  assert.ok(!readWithDedup.snapshotWins.includes(3), 'key 3 snapshot read is dropped');
  const hw = plan.steps.find(s => s.phase === 'high-watermark' && /streamed event wins/.test(s.detail));
  assert.ok(hw, 'high watermark explains the stream wins');
});

// ── static decision tables are well-formed ───────────────────────────────────
test('SNAPSHOT_MODES covers the documented modes', () => {
  const modes = SNAPSHOT_MODES.map(m => m.mode);
  assert.ok(modes.some(m => m.startsWith('initial')));
  assert.ok(modes.includes('never'));
  assert.ok(modes.includes('when_needed'));
  SNAPSHOT_MODES.forEach(m => { assert.ok(m.onFirstStart && m.onRestart && m.use); });
});

test('INTERNAL_STORES documents the schema history and offsets topics', () => {
  const names = INTERNAL_STORES.map(s => s.name.toLowerCase());
  assert.ok(names.some(n => n.includes('schema history')));
  assert.ok(names.some(n => n.includes('offsets')));
  assert.ok(names.some(n => n.includes('replication slot')));
  INTERNAL_STORES.forEach(s => { assert.ok(s.holds && s.breaks && s.kind); });
});
