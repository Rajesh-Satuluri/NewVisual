// ─────────────────────────────────────────────────────────────────────────────
// Deterministic CDC (Change Data Capture) simulation engine
//
// Pure JS, no DOM — importable in the browser (the CDC labs) and in Node (unit
// tests). Like KafkaSim, every run is REPEATABLE: same seed + same operations ⇒
// identical state. This is a TEACHING SIMULATION of the Postgres → WAL → logical
// decoding → Debezium → Kafka → lakehouse chain, not a real database. It
// composes KafkaSim (it does not fork it) so the Kafka hop uses Kafka's real
// murmur2 partitioner and real per-partition offsets.
//
// Honest approximations (labelled so the content never over-claims):
//   • LSN is modelled as a monotonic integer counter. A real PostgreSQL LSN is a
//     byte position in the WAL; the *ordering and monotonicity* is what matters
//     for teaching, and that is faithful.
//   • A rolled-back transaction contributes NOTHING to the WAL here. Real
//     Postgres physically writes aborted records to the WAL but logical decoding
//     skips them — the observable CDC result (aborted changes never appear
//     downstream) is identical, which is the teaching point.
//   • "bytes" of retained WAL is approximated by serialized record size.
//   • Time (ts_ms) is an internal tick counter, never the wall clock, so replays
//     are deterministic.
//
// The load-bearing correctness idea the whole curriculum rests on is encoded in
// the state: the source LSN, the Kafka offset, and the sink's materialized
// version are THREE DIFFERENT progress markers. The engine tracks them
// separately and never conflates them.
// ─────────────────────────────────────────────────────────────────────────────

import KafkaSim from './engine.js';

const keyStr = (v) => (v === null || v === undefined ? '∅' : String(v));

export class CDCSim {
  constructor({ seed = 1, partitions = 3 } = {}) {
    this.seed = seed >>> 0;
    this.partitions = partitions;
    this.reset();
  }

  // Full deterministic reset: same seed + same ops ⇒ identical state.
  reset() {
    this.kafka = new KafkaSim({ seed: this.seed, brokers: 3 });
    this.tables = new Map();      // name → { pk, columns, rows: Map, replicaIdentity }
    this.txns = new Map();        // txId → { id, changes:[], status }
    this.wal = [];               // [{ lsn, txId, kind, change? }]
    this.bronze = [];            // append-only log of every delivered change event
    this.slot = { name: 'debezium', confirmedFlushLsn: 0, active: true, invalid: false };
    this.connector = { running: true, lastLsn: 0, snapshotDone: false, needsSnapshot: false };
    this.nextLsn = 1;
    this.nextTxId = 1;
    this.tick = 0;               // deterministic logical clock (not wall time)
    return this;
  }

  _now() { return ++this.tick; }

  // ── DDL ─────────────────────────────────────────────────────────────────────
  // replicaIdentity: 'full' (before-image has every column) or 'default'
  // (before-image / delete key has primary-key columns only) — mirrors Postgres.
  createTable(name, { pk, columns = [], replicaIdentity = 'full' } = {}) {
    if (!pk) throw new Error('A captured table needs a primary key');
    if (this.tables.has(name)) throw new Error(`Table "${name}" already exists`);
    this.tables.set(name, { name, pk, columns, rows: new Map(), replicaIdentity });
    // One CDC topic per table, as Debezium does: <topic.prefix>.<schema>.<table>.
    this.kafka.createTopic(this._topic(name), { partitions: this.partitions, replicationFactor: 1 });
    return this.tables.get(name);
  }

  _topic(table) { return `cdc.${table}`; }

  getTable(name) {
    const t = this.tables.get(name);
    if (!t) throw new Error(`No such table "${name}"`);
    return t;
  }

  // ── Transactions ────────────────────────────────────────────────────────────
  // Changes buffer on the transaction and only hit the table + WAL on commit —
  // exactly why an uncommitted (or rolled-back) change is invisible to CDC.
  begin() {
    const id = this.nextTxId++;
    this.txns.set(id, { id, changes: [], status: 'open' });
    return id;
  }

  _openTxn(txId) {
    const tx = this.txns.get(txId);
    if (!tx || tx.status !== 'open') throw new Error(`Transaction ${txId} is not open`);
    return tx;
  }

  insert(txId, table, row) {
    const tx = this._openTxn(txId);
    const t = this.getTable(table);
    const key = row[t.pk];
    if (key === undefined) throw new Error(`Insert is missing primary key "${t.pk}"`);
    tx.changes.push({ op: 'c', table, key, before: null, after: { ...row } });
    return this;
  }

  update(txId, table, key, changes) {
    const tx = this._openTxn(txId);
    const t = this.getTable(table);
    const current = t.rows.get(keyStr(key));
    if (!current) throw new Error(`Update target ${table}.${t.pk}=${key} does not exist`);
    const after = { ...current, ...changes };
    tx.changes.push({ op: 'u', table, key, before: { ...current }, after });
    return this;
  }

  delete(txId, table, key) {
    const tx = this._openTxn(txId);
    const t = this.getTable(table);
    const current = t.rows.get(keyStr(key));
    if (!current) throw new Error(`Delete target ${table}.${t.pk}=${key} does not exist`);
    tx.changes.push({ op: 'd', table, key, before: { ...current }, after: null });
    return this;
  }

  // Commit: apply every buffered change to the table AND append it to the WAL,
  // in order, each with a fresh LSN, then an explicit commit record. This is the
  // moment the changes become visible to logical decoding.
  commit(txId) {
    const tx = this._openTxn(txId);
    const lsns = [];
    for (const ch of tx.changes) {
      const t = this.getTable(ch.table);
      if (ch.op === 'd') t.rows.delete(keyStr(ch.key));
      else t.rows.set(keyStr(ch.key), { ...ch.after });
      const lsn = this.nextLsn++;
      lsns.push(lsn);
      this.wal.push({ lsn, txId, kind: 'change', change: ch });
    }
    const commitLsn = this.nextLsn++;
    this.wal.push({ lsn: commitLsn, txId, kind: 'commit' });
    tx.status = 'committed';
    return { lsns, commitLsn };
  }

  // Rollback: discard. Nothing reaches the WAL that logical decoding would emit,
  // so these changes never appear downstream (see the file header note).
  rollback(txId) {
    const tx = this._openTxn(txId);
    tx.status = 'aborted';
    tx.changes = [];
    return this;
  }

  // ── Autocommit convenience (one statement = one transaction) ────────────────
  applyInsert(table, row) { const t = this.begin(); this.insert(t, table, row); return this.commit(t); }
  applyUpdate(table, key, changes) { const t = this.begin(); this.update(t, table, key, changes); return this.commit(t); }
  applyDelete(table, key) { const t = this.begin(); this.delete(t, table, key); return this.commit(t); }

  // ── Heartbeat ───────────────────────────────────────────────────────────────
  // Writes a heartbeat WAL record; if the connector is running it confirms that
  // position, advancing the slot even when no captured table changed — the fix
  // for the "quiet tables" slot-growth trap.
  heartbeat() {
    const lsn = this.nextLsn++;
    this.wal.push({ lsn, txId: null, kind: 'heartbeat' });
    if (this.connector.running) {
      this.connector.lastLsn = Math.max(this.connector.lastLsn, lsn);
      this.slot.confirmedFlushLsn = this.connector.lastLsn;
    }
    return this;
  }

  // ── Connector control ───────────────────────────────────────────────────────
  stopConnector() { this.connector.running = false; return this; }     // simulate an outage
  startConnector() { this.connector.running = true; return this; }

  // What logical decoding could emit right now: committed change records the
  // connector has not consumed yet.
  pendingWal() {
    return this.wal.filter(r => r.kind === 'change' && r.lsn > this.connector.lastLsn);
  }

  // ── Poll: logical decoding → change events → Kafka → Bronze ──────────────────
  // The connector reads pending committed changes, builds Debezium-shaped change
  // events, publishes them to the per-table Kafka topic (real murmur2 routing /
  // real offsets), advances its own source offset (lastLsn) and confirms the
  // slot. Returns the events delivered this poll. Does nothing during an outage.
  poll() {
    if (!this.connector.running) return [];
    // Streaming cannot resume if the WAL it needs was already removed — the
    // connector is stuck until a fresh snapshot rebuilds its position.
    if (this.connector.needsSnapshot) return [];
    const pending = this.pendingWal();
    const out = [];
    let maxLsn = this.connector.lastLsn;
    for (const rec of pending) {
      const ev = this._toEvent(rec.change, { lsn: rec.lsn, txId: rec.txId, snapshot: false });
      out.push(ev);
      this.bronze.push(ev);
      maxLsn = Math.max(maxLsn, rec.lsn);
    }
    // The slot only advances to the latest *consumed* position — including the
    // commit record that follows the last change we read.
    const commitAfter = this.wal
      .filter(r => r.kind !== 'change' && r.lsn > this.connector.lastLsn && r.lsn <= this.nextLsn)
      .reduce((m, r) => Math.max(m, r.lsn), maxLsn);
    this.connector.lastLsn = commitAfter;
    this.slot.confirmedFlushLsn = commitAfter;
    return out;
  }

  // ── Snapshot (initial) ───────────────────────────────────────────────────────
  // Emit a READ (op:'r') event for every current row, as Debezium's initial
  // snapshot does, then mark the snapshot complete and start streaming from here.
  snapshot(table) {
    const names = table ? [table] : [...this.tables.keys()];
    const out = [];
    for (const name of names) {
      const t = this.getTable(name);
      for (const row of t.rows.values()) {
        const ev = this._toEvent(
          { op: 'r', table: name, key: row[t.pk], before: null, after: { ...row } },
          { lsn: this.nextLsn - 1, txId: null, snapshot: true });
        out.push(ev); this.bronze.push(ev);
      }
    }
    this.connector.snapshotDone = true;
    // A fresh snapshot also clears a "needs snapshot" / invalid-slot state:
    // this is exactly how a connector recovers after required WAL was lost.
    this.connector.needsSnapshot = false;
    this.slot.invalid = false;
    // Streaming resumes from the current WAL head.
    this.connector.lastLsn = this.nextLsn - 1;
    this.slot.confirmedFlushLsn = this.connector.lastLsn;
    return out;
  }

  // Incremental snapshot: re-read current rows as READ (op:'r') events WITHOUT
  // resetting the streaming position — Debezium runs these in chunks, concurrently
  // with streaming, to backfill newly-captured tables or re-sync without a stop.
  incrementalSnapshot(table) {
    const names = table ? [table] : [...this.tables.keys()];
    const out = [];
    for (const name of names) {
      const t = this.getTable(name);
      for (const row of t.rows.values()) {
        const ev = this._toEvent(
          { op: 'r', table: name, key: row[t.pk], before: null, after: { ...row } },
          { lsn: this.connector.lastLsn, txId: null, snapshot: 'incremental' });
        out.push(ev); this.bronze.push(ev);
      }
    }
    return out;
  }

  // Simulate the WAL the connector still needs being removed/recycled (e.g. a
  // slot invalidated past max_slot_wal_keep_size, or WAL recycled during a long
  // outage). Streaming is then stuck until a new snapshot runs. Returns whether
  // anything was actually lost (there must be unconsumed WAL to lose).
  simulateWalLoss() {
    const backlog = this.walBacklog();
    if (backlog.records === 0) return false;
    this.connector.needsSnapshot = true;
    this.slot.invalid = true;
    return true;
  }

  // Build one Debezium-shaped change event and publish it to Kafka. The before
  // image honours REPLICA IDENTITY: 'default' exposes only the PK column(s).
  _toEvent(change, { lsn, txId, snapshot }) {
    const t = this.getTable(change.table);
    let before = change.before;
    if (before && t.replicaIdentity === 'default') before = { [t.pk]: before[t.pk] };
    const value = change.op === 'd' ? null : change.after;
    const pub = this.kafka.produce(this._topic(change.table), {
      key: keyStr(change.key),
      value,
    });
    return {
      op: change.op,
      table: change.table,
      key: change.key,
      before,
      after: change.after,
      source: { lsn, txId, tsMs: this._now(), snapshot: typeof snapshot === 'string' ? snapshot : !!snapshot, table: change.table, db: 'shop' },
      tsMs: this._now(),
      kafka: { topic: pub.topic, partition: pub.partition, offset: pub.offset },
    };
  }

  // ── Views (for the UI) ────────────────────────────────────────────────────────
  // The committed source table — the ground truth we reconcile Silver against.
  currentState(table) {
    const t = this.getTable(table);
    return [...t.rows.values()].map(r => ({ ...r }));
  }

  // Silver: the materialized current state, folded from the Bronze event log by
  // primary key. This is the whole point of CDC materialization — appending
  // events is not enough; you must UPSERT on the key and REMOVE on delete.
  // Folding is idempotent: replaying the same event lands on the same state.
  silver(table) {
    const t = this.getTable(table);
    const state = new Map();
    for (const ev of this.bronze) {
      if (ev.table !== table) continue;
      if (ev.op === 'd') state.delete(keyStr(ev.key));
      else state.set(keyStr(ev.key), { ...ev.after });
    }
    return [...state.values()];
  }

  // Does the materialized Silver match the live source table?
  reconcile(table) {
    const t = this.getTable(table);
    const src = new Map(this.currentState(table).map(r => [keyStr(r[t.pk]), r]));
    const slv = new Map(this.silver(table).map(r => [keyStr(r[t.pk]), r]));
    const missingInSilver = [...src.keys()].filter(k => !slv.has(k));
    const extraInSilver = [...slv.keys()].filter(k => !src.has(k));
    const mismatched = [...src.keys()].filter(k =>
      slv.has(k) && JSON.stringify(src.get(k)) !== JSON.stringify(slv.get(k)));
    return {
      match: !missingInSilver.length && !extraInSilver.length && !mismatched.length,
      missingInSilver, extraInSilver, mismatched,
      sourceRows: src.size, silverRows: slv.size,
    };
  }

  // Retained WAL = everything the slot has not confirmed yet. A lagging or
  // stopped connector lets this grow without bound → source disk risk.
  walBacklog() {
    const retained = this.wal.filter(r => r.lsn > this.slot.confirmedFlushLsn);
    const bytes = retained.reduce((s, r) => s + JSON.stringify(r).length, 0);
    return {
      records: retained.length,
      bytes,
      oldestLsn: retained.length ? retained[0].lsn : null,
      newestLsn: retained.length ? retained[retained.length - 1].lsn : null,
    };
  }

  walView() { return this.wal.map(r => ({ ...r })); }
  slotView() { return { ...this.slot, backlog: this.walBacklog() }; }

  // Serializable snapshot for determinism tests / save-state.
  snapshotState() {
    return {
      seed: this.seed,
      nextLsn: this.nextLsn,
      slot: { ...this.slot },
      connector: { ...this.connector },
      tables: [...this.tables.values()].map(t => ({
        name: t.name, pk: t.pk, replicaIdentity: t.replicaIdentity,
        rows: [...t.rows.values()].map(r => ({ ...r })),
      })),
      bronze: this.bronze.map(e => ({ op: e.op, table: e.table, key: e.key, kafka: e.kafka })),
    };
  }
}

export default CDCSim;
