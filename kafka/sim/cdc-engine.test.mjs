// Unit tests for the deterministic CDC engine. Run: node --test kafka/sim/cdc-engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import CDCSim from './cdc-engine.js';

function shop() {
  const sim = new CDCSim({ seed: 7 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
  return sim;
}

test('insert → commit emits one create event (after set, before null)', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  const evs = sim.poll();
  assert.equal(evs.length, 1);
  assert.equal(evs[0].op, 'c');
  assert.equal(evs[0].before, null);
  assert.deepEqual(evs[0].after, { id: 1, status: 'NEW', amount: 10 });
});

test('update emits u with before AND after', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  sim.applyUpdate('orders', 1, { status: 'PAID' });
  const evs = sim.poll();
  assert.equal(evs.length, 1);
  assert.equal(evs[0].op, 'u');
  assert.equal(evs[0].before.status, 'NEW');
  assert.equal(evs[0].after.status, 'PAID');
});

test('delete emits d with before populated and after null', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  sim.applyDelete('orders', 1);
  const evs = sim.poll();
  assert.equal(evs.length, 1);
  assert.equal(evs[0].op, 'd');
  assert.equal(evs[0].before.id, 1);
  assert.equal(evs[0].after, null);
});

test('rolled-back changes never appear downstream', () => {
  const sim = shop();
  const tx = sim.begin();
  sim.insert(tx, 'orders', { id: 9, status: 'NEW', amount: 5 });
  sim.rollback(tx);
  const evs = sim.poll();
  assert.equal(evs.length, 0);
  assert.equal(sim.currentState('orders').length, 0);
});

test('LSNs are strictly monotonic across commits', () => {
  const sim = shop();
  const a = sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 1 });
  const b = sim.applyInsert('orders', { id: 2, status: 'NEW', amount: 2 });
  assert.ok(a.commitLsn < b.lsns[0], 'later txn gets higher LSNs');
  const lsns = sim.walView().map(r => r.lsn);
  for (let i = 1; i < lsns.length; i++) assert.ok(lsns[i] > lsns[i - 1]);
});

test('multi-statement transaction appears together only after commit', () => {
  const sim = shop();
  const tx = sim.begin();
  sim.insert(tx, 'orders', { id: 1, status: 'NEW', amount: 1 });
  sim.insert(tx, 'orders', { id: 2, status: 'NEW', amount: 2 });
  // Not committed yet → nothing visible to decoding, table unchanged.
  assert.equal(sim.pendingWal().length, 0);
  assert.equal(sim.currentState('orders').length, 0);
  sim.commit(tx);
  const evs = sim.poll();
  assert.equal(evs.length, 2);
  assert.equal(sim.currentState('orders').length, 2);
});

test('slot backlog grows during an outage and drains on resume', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 1 });
  sim.poll();
  assert.equal(sim.walBacklog().records, 0);
  sim.stopConnector();
  sim.applyInsert('orders', { id: 2, status: 'NEW', amount: 2 });
  sim.applyInsert('orders', { id: 3, status: 'NEW', amount: 3 });
  assert.ok(sim.walBacklog().records > 0, 'retained WAL grows while stopped');
  sim.startConnector();
  sim.poll();
  assert.equal(sim.walBacklog().records, 0, 'slot caught up');
});

test('heartbeat advances the slot with no captured-table change', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 1 });
  sim.poll();
  const before = sim.slotView().confirmedFlushLsn;
  sim.heartbeat();
  assert.ok(sim.slotView().confirmedFlushLsn > before);
  assert.equal(sim.walBacklog().records, 0);
});

test('Silver materialization reconciles with the live source table', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.applyInsert('orders', { id: 2, status: 'NEW', amount: 20 });
  sim.applyUpdate('orders', 1, { status: 'PAID' });
  sim.applyDelete('orders', 2);
  sim.poll();
  const r = sim.reconcile('orders');
  assert.ok(r.match, JSON.stringify(r));
  assert.equal(r.sourceRows, 1);
  assert.equal(r.silverRows, 1);
});

test('polling current state loses history that the CDC log keeps', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.applyUpdate('orders', 1, { status: 'PACKED' });
  sim.applyUpdate('orders', 1, { status: 'SHIPPED' });
  sim.applyDelete('orders', 1);
  sim.poll();
  // A poll-the-table approach would see nothing (row deleted)...
  assert.equal(sim.currentState('orders').length, 0);
  // ...but CDC captured every transition, including the delete.
  const ops = sim.bronze.filter(e => e.table === 'orders').map(e => e.op);
  assert.deepEqual(ops, ['c', 'u', 'u', 'd']);
});

test('duplicate delivery is idempotent in Silver (upsert by key)', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  const once = sim.silver('orders');
  // Replay the same event into Bronze — Silver folds by key, so no duplicate row.
  sim.bronze.push({ ...sim.bronze[0] });
  const twice = sim.silver('orders');
  assert.deepEqual(once, twice);
});

test('initial snapshot emits a read (r) event per existing row', () => {
  const sim = shop();
  sim.stopConnector(); // load rows without streaming
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.applyInsert('orders', { id: 2, status: 'NEW', amount: 20 });
  sim.startConnector();
  const reads = sim.snapshot('orders');
  assert.equal(reads.length, 2);
  assert.ok(reads.every(e => e.op === 'r' && e.source.snapshot === true));
});

test('LSN, Kafka offset and row key are distinct markers', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  const [ev] = sim.poll();
  // The source LSN and the Kafka offset are different numbers for the same event.
  assert.equal(typeof ev.source.lsn, 'number');
  assert.equal(typeof ev.kafka.offset, 'number');
  assert.equal(ev.kafka.offset, 0); // first record in its partition
  assert.ok(ev.source.lsn >= 1);
});

test('determinism: reset + same ops ⇒ identical state snapshot', () => {
  const run = () => {
    const s = new CDCSim({ seed: 42 });
    s.createTable('orders', { pk: 'id' });
    s.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
    s.applyUpdate('orders', 1, { status: 'PAID' });
    s.applyInsert('orders', { id: 2, status: 'NEW', amount: 5 });
    s.poll();
    return s.snapshotState();
  };
  assert.deepEqual(run(), run());
});

test('lost WAL stalls streaming until a fresh snapshot recovers it', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  sim.stopConnector();
  sim.applyInsert('orders', { id: 2, status: 'NEW', amount: 20 });
  assert.equal(sim.simulateWalLoss(), true);     // there was a backlog to lose
  sim.startConnector();
  assert.deepEqual(sim.poll(), []);              // streaming is stuck
  assert.equal(sim.connector.needsSnapshot, true);
  const reads = sim.snapshot('orders');          // recover
  assert.ok(reads.length >= 1 && reads.every(e => e.op === 'r'));
  assert.equal(sim.connector.needsSnapshot, false);
  assert.equal(sim.slot.invalid, false);
});

test('incremental snapshot emits reads without rewinding the stream position', () => {
  const sim = shop();
  sim.applyInsert('orders', { id: 1, status: 'NEW', amount: 10 });
  sim.poll();
  const posBefore = sim.connector.lastLsn;
  const reads = sim.incrementalSnapshot('orders');
  assert.equal(reads.length, 1);
  assert.equal(reads[0].op, 'r');
  assert.equal(reads[0].source.snapshot, 'incremental');
  assert.equal(sim.connector.lastLsn, posBefore); // streaming position unchanged
});
