// ─────────────────────────────────────────────────────────────────────────────
// Debezium internals — pure, DOM-free derivations for the M32 "internals" module.
//
// These functions turn an engine change/event into the *intermediate artifacts*
// that a real PostgreSQL → Debezium → Kafka pipeline produces at each hop, so the
// UI can show one change moving through the whole machine. They are deterministic
// (same input ⇒ same output) and have no dependency on the DOM or the clock, so
// they are unit-tested in Node (see debezium-internals.test.mjs).
//
// Scope / honesty: these model the SHAPE and ORDERING of the real artifacts
// (pgoutput logical-replication messages, the SourceRecord/Envelope, the
// at-least-once redelivery window, the DBLog incremental-snapshot watermarks).
// They are a faithful teaching representation, not a byte-exact wire decoder —
// the modules label them as such, matching the rest of the CDC curriculum.
// ─────────────────────────────────────────────────────────────────────────────

const OP_LABEL = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ (snapshot)' };

// A stable, illustrative relation OID for a table name (deterministic hash).
export function relationOid(tableName) {
  let h = 2166136261;
  for (let i = 0; i < tableName.length; i++) {
    h ^= tableName.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Keep it in a realistic small-OID range (16384+ are user objects in Postgres).
  return 16384 + (h >>> 0) % 40000;
}

// The before-image a replica identity exposes for UPDATE/DELETE old tuples.
//   'full'    → every column  (pgoutput submessage 'O' — old tuple)
//   'default' → primary key only (pgoutput submessage 'K' — key)
// Returns { kind: 'O'|'K', columns } or null when there is no old tuple (insert).
export function oldTuple(change, table) {
  if (change.op === 'c' || change.op === 'r') return null;
  const full = (table.replicaIdentity || 'full') === 'full';
  if (change.op === 'd') {
    // DELETE carries the key (default) or the whole old row (full).
    const cols = full ? { ...change.before } : { [table.pk]: change.before[table.pk] };
    return { kind: full ? 'O' : 'K', columns: cols };
  }
  // UPDATE: old tuple only present when it is needed to identify the row —
  // under DEFAULT that is the key; under FULL it is the complete prior row.
  const cols = full ? { ...change.before } : { [table.pk]: change.before[table.pk] };
  return { kind: full ? 'O' : 'K', columns: cols };
}

// Decode one committed change into the ordered pgoutput logical-replication
// messages Debezium consumes from the replication slot. A single-statement
// transaction frames as BEGIN · (RELATION) · INSERT|UPDATE|DELETE · COMMIT.
//   opts.includeRelation (default true) — emit the RELATION message. In a real
//     session RELATION is sent once per relation and then cached; set false to
//     model "already seen this table".
export function pgoutputFrames(change, table, opts = {}) {
  const includeRelation = opts.includeRelation !== false;
  const lsn = change.lsn ?? 0;
  const xid = change.txId ?? 0;
  const oid = relationOid(table.name);

  // Snapshots are consistent SELECTs, NOT logical decoding — be honest about it.
  if (change.op === 'r') {
    return {
      viaWal: false,
      note: 'Snapshot reads do not travel through pgoutput. The initial snapshot is a set of consistent SELECTs against the tables; only post-snapshot streaming decodes the WAL into the messages below.',
      frames: [],
    };
  }

  const frames = [];
  frames.push({
    type: 'BEGIN',
    fields: { final_lsn: lsn, xid },
    note: 'Start of a transaction. Carries the LSN of the eventual COMMIT and the transaction id. Debezium buffers the changes until it sees COMMIT — uncommitted work never ships.',
  });

  if (includeRelation) {
    frames.push({
      type: 'RELATION',
      fields: {
        oid,
        namespace: 'public',
        name: table.name,
        replica_identity: (table.replicaIdentity || 'full') === 'full' ? 'FULL (f)' : 'DEFAULT (d)',
        columns: (table.columns || []).join(', '),
      },
      note: 'Describes the table shape (OID, columns, replica identity). Sent the first time a relation appears, then cached — subsequent rows for the same table skip it. It is what lets Debezium build a typed schema without re-querying the catalog each row.',
    });
  }

  const label = OP_LABEL[change.op] || change.op;
  const old = oldTuple(change, table);
  const newTuple = change.op === 'd' ? null : { ...change.after };
  frames.push({
    type: label.split(' ')[0], // INSERT | UPDATE | DELETE
    fields: {
      oid,
      old_tuple: old ? `${old.kind}: ${JSON.stringify(old.columns)}` : '— (none)',
      new_tuple: newTuple ? `N: ${JSON.stringify(newTuple)}` : '— (none)',
    },
    note: old
      ? `Row change. The old tuple is sent as submessage '${old.kind}' — ${old.kind === 'O' ? 'the complete prior row, because REPLICA IDENTITY FULL' : 'the key only, because REPLICA IDENTITY DEFAULT'}. This is exactly why the event's before image is full or key-only.`
      : 'Row change. INSERT carries only the new tuple (N) — there is no prior row to describe.',
  });

  frames.push({
    type: 'COMMIT',
    fields: { commit_lsn: lsn, end_lsn: lsn + 1 },
    note: 'Marks the transaction durable and decodable. Debezium now emits the buffered change(s) downstream and can advance its offset / confirm the slot up to this LSN.',
  });

  return { viaWal: true, note: null, frames };
}

// Assemble the end-to-end stages one change passes through, from the SQL that
// ran to the row a sink materializes. `event` is an engine change event (from
// CDCSim poll/snapshot) carrying { op, table, key, before, after, source, kafka }.
// Returns an ordered array of stages, each with the concrete artifact at that hop.
export function traceStages(event, table, sql) {
  const op = event.op;
  const topic = event.kafka?.topic ?? `cdc.${table.name}`;
  const po = pgoutputFrames(
    { op, table: table.name, key: event.key, before: event.before, after: event.after, lsn: event.source?.lsn, txId: event.source?.txId },
    table,
  );

  // The Debezium value envelope (what the converter serializes).
  const envelope = {
    before: (op === 'c' || op === 'r') ? null : event.before,
    after: op === 'd' ? null : event.after,
    source: {
      version: '3.0.x', connector: 'postgresql', name: 'shop',
      db: 'shop', schema: 'public', table: table.name,
      lsn: event.source?.lsn, txId: event.source?.txId,
      ts_ms: event.source?.tsMs,
      snapshot: event.source?.snapshot ?? false,
    },
    op,
    ts_ms: event.tsMs,
  };

  const sinkAction = op === 'd'
    ? `DELETE FROM sink WHERE ${table.pk} = ${JSON.stringify(event.key)}`
    : `UPSERT INTO sink (${Object.keys(event.after || {}).join(', ')}) — key ${table.pk}=${JSON.stringify(event.key)}`;

  return [
    {
      id: 'sql', icon: '🖊️', title: 'Application runs SQL',
      artifact: 'sql', body: sql,
      explain: 'An ordinary write inside a transaction. The app has no idea CDC exists — that is the point of log-based capture: zero application change.',
    },
    {
      id: 'wal', icon: '🪵', title: 'Postgres writes the WAL + commits',
      artifact: 'kv', body: {
        'WAL record': `${OP_LABEL[op] || op} on public.${table.name}`,
        'LSN': event.source?.lsn,
        'xid': event.source?.txId ?? '(snapshot)',
        'durable': 'yes — fsync on commit',
      },
      explain: 'The change becomes durable in the write-ahead log and gets a Log Sequence Number. The WAL is the single source of truth CDC reads — not triggers, not the table.',
    },
    {
      id: 'pgoutput', icon: '📡', title: 'Logical decoding → pgoutput messages',
      artifact: 'frames', body: po,
      explain: po.viaWal
        ? 'The logical decoding plugin (pgoutput) turns the physical WAL into logical row messages, read through the replication slot. REPLICA IDENTITY decides how much of the old row rides along.'
        : po.note,
    },
    {
      id: 'decode', icon: '⚙️', title: 'Debezium builds a SourceRecord',
      artifact: 'kv', body: {
        'topic': topic,
        'key (Struct)': JSON.stringify({ [table.pk]: event.key }),
        'value (Struct)': 'Envelope { before, after, source, op, ts_ms }',
        'partition decided by': `hash(key) — key=${JSON.stringify(event.key)}`,
        'source offset': `{ lsn: ${event.source?.lsn} }`,
      },
      explain: 'Inside the Kafka Connect worker, the connector maps the pgoutput message to a Connect SourceRecord: a typed key Struct, a value Struct (the envelope), the target topic, and the source offset it will later checkpoint.',
    },
    {
      id: 'converter', icon: '🔄', title: 'Converter serializes the envelope',
      artifact: 'json', body: envelope,
      explain: 'The converter (JSON here; Avro/Protobuf + Schema Registry in production) turns the Struct into bytes. SMTs, if configured, reshape it first — e.g. ExtractNewRecordState would flatten this to just the after row.',
    },
    {
      id: 'kafka', icon: '📨', title: 'Message lands in Kafka',
      artifact: 'kv', body: {
        'topic': topic,
        'partition': event.kafka?.partition,
        'offset': event.kafka?.offset,
        'key': JSON.stringify(event.key),
        'value': op === 'd' ? 'full delete envelope (then a tombstone)' : 'change envelope',
      },
      explain: 'A real Kafka append — same partitioning (murmur2 on the key), same per-partition offsets as any producer. Same-key changes share a partition, so per-row order is preserved end to end.',
    },
    {
      id: 'consumer', icon: '🎧', title: 'Sink consumes and materializes',
      artifact: 'sql', body: sinkAction,
      explain: 'A sink folds the envelope into current state by primary key — UPSERT on c/u/r, DELETE on d. Appending events is not enough; materialization is an upsert on the key. Reprocessing the same offset lands on the same row (idempotent).',
    },
  ];
}

// At-least-once delivery: Debezium checkpoints its source offset PERIODICALLY,
// not per event. If the worker dies after events reached Kafka but before the
// offset was committed, the restart resumes from the last committed offset and
// RE-EMITS everything after it — duplicates in the topic. This computes exactly
// what gets redelivered.
//   emitted         — ordered list of LSNs already produced to Kafka this run
//   committedOffset — the highest LSN whose offset was durably committed
// Returns { redelivered, duplicateCount, firstDuplicateLsn }.
export function atLeastOnceReplay(emitted, committedOffset) {
  const sorted = [...emitted].sort((a, b) => a - b);
  const redelivered = sorted.filter(lsn => lsn > committedOffset);
  return {
    redelivered,
    duplicateCount: redelivered.length,
    firstDuplicateLsn: redelivered.length ? redelivered[0] : null,
    // The consumer-side cure: dedupe by (source.lsn) or make the sink upsert
    // idempotent — then a redelivered event is a no-op, not a corruption.
    idempotentOutcome: 'no-op (same key, same or newer version wins)',
  };
}

// DBLog incremental snapshot (signal-based, chunked, watermarked). Debezium can
// snapshot a table WITHOUT stopping streaming by reading it in key-ordered chunks,
// bracketing each chunk between a low and high watermark written to the signal/
// WAL stream, and letting concurrent streamed changes inside the window WIN over
// the snapshot read (so a row changed mid-snapshot is never stale).
//   keys           — ordered primary keys to snapshot
//   chunkSize      — rows per chunk
//   concurrentKey  — (optional) a key that receives a streamed UPDATE during the
//                    window, to show the watermark dedupe pick the stream value
// Returns ordered steps describing one pass.
export function incrementalSnapshotPlan(keys, chunkSize = 2, concurrentKey = null) {
  const chunks = [];
  for (let i = 0; i < keys.length; i += chunkSize) chunks.push(keys.slice(i, i + chunkSize));
  const steps = [];
  chunks.forEach((chunk, idx) => {
    steps.push({ phase: 'low-watermark', chunk: idx + 1, detail: `Write LOW watermark to the signal stream, then SELECT keys [${chunk.join(', ')}] as a chunk.` });
    const deduped = [];
    const snapshotWins = [];
    chunk.forEach(k => {
      if (concurrentKey !== null && String(k) === String(concurrentKey)) {
        deduped.push(k); // the streamed change inside the window wins
      } else {
        snapshotWins.push(k);
      }
    });
    steps.push({
      phase: 'read', chunk: idx + 1,
      detail: `Buffer chunk rows as READ (op:'r') events: [${chunk.join(', ')}].`,
      snapshotWins, deduped,
    });
    steps.push({
      phase: 'high-watermark', chunk: idx + 1,
      detail: concurrentKey !== null && chunk.map(String).includes(String(concurrentKey))
        ? `Write HIGH watermark. Key ${concurrentKey} was changed by STREAMING inside the window → the streamed event wins; the buffered snapshot read for ${concurrentKey} is dropped (no stale overwrite).`
        : 'Write HIGH watermark. No conflicting streamed change in this window — all buffered reads are emitted as-is.',
    });
  });
  steps.push({ phase: 'done', detail: `Incremental snapshot complete over ${keys.length} key(s) in ${chunks.length} chunk(s), with streaming never paused.` });
  return { chunks: chunks.length, steps };
}

// The snapshot.mode decision table Debezium exposes, as structured data the UI
// renders. Each: when the connector starts, what it does.
export const SNAPSHOT_MODES = [
  { mode: 'initial', onFirstStart: 'Snapshot, then stream', onRestart: 'Stream from stored offset (no re-snapshot)', use: 'The default. Backfill history once, then tail the WAL forever.' },
  { mode: 'initial_only', onFirstStart: 'Snapshot, then STOP', onRestart: 'Nothing (already done)', use: 'One-off bulk export into Kafka with no ongoing streaming.' },
  { mode: 'no_data (schema_only)', onFirstStart: 'Capture schema, skip row data, then stream', onRestart: 'Stream from stored offset', use: 'You only want changes from now on — history is irrelevant or already loaded.' },
  { mode: 'when_needed', onFirstStart: 'Snapshot if no valid offset', onRestart: 'Re-snapshot ONLY if the stored offset/WAL is gone', use: 'Self-healing: recovers from WAL loss automatically instead of getting stuck.' },
  { mode: 'never', onFirstStart: 'Stream only — no snapshot ever', onRestart: 'Stream from stored offset', use: 'Advanced: you have another way to load the baseline and only want the tail.' },
];

// What each internal store/topic holds — Debezium's durable state, consolidated.
export const INTERNAL_STORES = [
  { name: 'Replication slot (in Postgres)', kind: 'database', holds: 'confirmed_flush_lsn — how far the consumer has acknowledged.', breaks: 'If invalidated or outrun by max_slot_wal_keep_size, required WAL is recycled → the connector must re-snapshot.', single: true },
  { name: 'Offsets topic (connect-offsets)', kind: 'kafka', holds: "The connector's source offset: the last processed LSN, per connector+partition.", breaks: 'Lost/compacted-away offset → restart falls back to snapshot.mode behavior (often a fresh snapshot).', single: false },
  { name: 'Schema history topic', kind: 'kafka', holds: 'Every DDL / schema change seen, so the connector can rebuild the exact table structure at any past LSN.', breaks: 'Deleting it means the connector cannot reconstruct historical schema → it refuses to start and needs a new snapshot. Never let it be compacted or deleted.', single: false },
  { name: 'Transaction metadata topic', kind: 'kafka', holds: 'Optional BEGIN/END markers per transaction with event counts, so consumers can reassemble transaction boundaries.', breaks: 'Only present when provide.transaction.metadata is on; absence just means no tx-boundary stream.', single: false },
  { name: 'Heartbeat topic', kind: 'kafka', holds: 'Periodic heartbeat events that let the connector advance & confirm the slot even when captured tables are idle.', breaks: 'Without heartbeats, a busy database with quiet captured tables lets the slot pin WAL and fill the source disk.', single: false },
  { name: 'Config topic (connect-configs)', kind: 'kafka', holds: 'Connector and task configuration for the distributed Connect cluster.', breaks: 'Connect-level state; losing it is a cluster-ops problem, not a CDC-position one.', single: false },
];

export { OP_LABEL };
