/* ============================================================
   Ingestion theory — deeper "why it works this way" explanation for
   every active stage of every pattern in the E2E simulator (P0-A).
   Loaded AFTER ingest-pipelines.js; it attaches a `theory` string to
   each pattern.detail[stageId] without touching the descriptor file.
   Conceptual mechanism/rationale that complements the per-stage
   "what happens" line. Illustrative teaching content.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const spec = viz.P && viz.P.snowflake && viz.P.snowflake.ingestPipelines;
  if (!spec) return;

  const THEORY = {
    /* ---------- Batch — COPY INTO ---------- */
    batch_copy: {
      source: 'Batch ingestion assumes a bounded, at-rest dataset rather than a live stream. Because the data is finite and historical, you optimise for throughput and cost of a one-time (or periodic) move, not latency — which is why a warehouse-driven COPY, sized up for the burst and released afterwards, is the natural fit.',
      extract: 'File-based loading decouples the producer from the warehouse: the export writes immutable files to object storage and Snowflake reads them later. File SIZE is the dominant throughput lever — COPY parallelises across files and within large ones, so ~100–250 MB compressed balances parallelism against per-file overhead. Thousands of tiny files starve the parallel scan.',
      transport: 'Object storage is the durable staging substrate, and Snowflake never "owns" these bytes — it reads them through a stage. So the bucket layout (prefixes, partitioning) directly shapes how well COPY can prune and parallelise. Keeping storage and compute separate here is the whole premise of the ELT model.',
      interface: 'A stage is a named pointer plus a file-format binding; an external stage is pure metadata over your bucket (via a storage integration), so defining it moves no data. This indirection lets the same files feed COPY, Snowpipe, external tables or INFER_SCHEMA without copying, and centralises credentials in the integration instead of in SQL.',
      discover: 'COPY must decide WHICH files to read: it enumerates the stage and intersects that with load metadata (files already loaded, kept ~64 days) so a re-run is idempotent at the file level. PATTERN/FILES narrow the set — a regex anchored to the partition path is what stops a back-fill from re-scanning the whole bucket.',
      parse: 'Parsing turns the file\'s physical encoding into Snowflake\'s typed columnar form. For self-describing formats (Parquet/Avro) this is mostly validation plus name-based mapping (MATCH_BY_COLUMN_NAME); for text (CSV/JSON) the file-format options ARE the contract, and a mismatch surfaces as a per-row cast error governed by ON_ERROR.',
      execute: 'COPY runs on YOUR virtual warehouse and is synchronous and transactional: it distributes files across nodes, writes new micro-partitions, and returns a per-file result set. Billing is warehouse-seconds, so you scale up for the burst and suspend after. The transactional commit means queries see all-or-nothing, never a half-loaded file.',
      raw: 'The RAW layer is the immutable system of record. Keeping it append-only and untransformed means any downstream logic change can be re-derived by reprocessing RAW rather than re-ingesting from source — the core safety net of ELT. Micro-partition metadata (including METADATA$FILENAME) is what makes lineage and pruning possible.',
      validate: 'Validation decides what "bad" means before it reaches the target. VALIDATION_MODE is a dry run that returns errors without loading; ON_ERROR (CONTINUE / SKIP_FILE / ABORT) sets the blast radius of a bad row. Routing rejects to a quarantine table turns silent loss into a visible, reloadable backlog.',
      stage_dedup: 'A STAGING layer is where raw rows become trustworthy — typed, cleaned and de-duplicated on the business key. A back-fill frequently overlaps live data, so QUALIFY ROW_NUMBER() per key is what guarantees exactly one row per entity regardless of how the files overlapped.',
      merge: 'MERGE makes the load idempotent in its RESULT: re-applying the same keyed source converges to the same target. The precondition is a deterministic source — one row per business key, chosen by latest sequence — otherwise the match is ambiguous and the outcome non-deterministic.',
      curated: 'The curated layer is modelled for consumption, not ingestion: clustered and optimised for the queries that read it. Separating it from RAW/STAGING lets you reshape it freely while the immutable history behind it stays intact.',
      reconcile: 'Reconciliation closes the loop: COPY_HISTORY gives a per-file audit (parsed vs loaded vs errors), and comparing source to curated BY KEY (not by raw counts) confirms completeness. Counts legitimately shrink through rejects, updates and dedup — equal totals can actually be the bug.',
    },

    /* ---------- Continuous — Snowpipe ---------- */
    snowpipe: {
      source: 'Continuous ingestion treats data as an unbounded stream of files: there is no "done", so you optimise for steady, low-latency flow and hands-off operation rather than a sized burst. Snowpipe\'s serverless model fits precisely because you cannot predict when the next file lands.',
      extract: 'Micro-batching trades a little latency for file efficiency: the producer flushes a file every interval. That interval is a direct lever — too long adds latency, too short creates tiny-file overhead Snowpipe pays per file. Below a certain file size, file-based loading stops being the right tool and Snowpipe Streaming takes over.',
      transport: 'The same durable object-storage substrate as batch, but now it doubles as an event source: writing a file is both persistence AND the trigger. Loading is driven by the bucket\'s event configuration, not by a schedule.',
      notify: 'Event-driven ingestion replaces polling with a push: the cloud provider\'s notification service (S3→SQS/SNS, GCS→Pub/Sub, Azure→Event Grid) tells the pipe a file arrived, and AUTO_INGEST subscribes to it. This is the defining mechanism of Snowpipe — and its most common failure point, because the notification plumbing lives outside Snowflake.',
      interface: 'A PIPE is a COPY statement wrapped as a standing, event-driven object. The external stage still references files in place; the pipe adds the subscription and queue semantics. Keeping the pipe separate from the table lets Snowflake manage serverless compute and load history per pipe.',
      discover: 'Discovery here is queue-driven, not enumeration: each notification enqueues one file and Snowpipe batches the queue for serverless loading. pendingFileCount is the health signal — if arrival rate exceeds load rate (usually from tiny files) the queue grows and latency climbs even though nothing is strictly "broken".',
      parse: 'The same typed conversion as COPY, but per-file and serverless. Because files arrive continuously and independently, schema drift tends to appear gradually (one new field in newer files), which is why a flexible or VARIANT RAW is especially valuable in a continuous pipeline.',
      execute: 'Snowpipe uses Snowflake-managed serverless compute, not your warehouse — so there is no size to tune, and cost is driven by file count/shape plus compute. Each file commits independently and atomically, giving near-real-time visibility with no warehouse running.',
      raw: 'Rows commit to RAW continuously and atomically; queries always see whole files, never partial loads. As with batch, the immutability of RAW is what makes reprocessing and late-data handling safe.',
      validate: 'Validation must tolerate a continuous stream: ON_ERROR in the pipe plus a quarantine table keeps one bad file from stalling the flow. You monitor reject volume as a rate rather than a one-off number.',
      stage_dedup: 'Event-driven delivery is at-least-once (a file can be delivered twice), so a Stream on RAW plus business-key dedup is what converts at-least-once ingestion into exactly-once RESULTS downstream.',
      merge: 'Incremental transform is driven by the Stream\'s change set, consumed by a scheduled Task MERGE or a Dynamic Table. The subtlety is the stream offset: it must be consumed within the retention window, or the stream goes stale and the pending change set is lost.',
      curated: 'Near-real-time curated tables; the freshness contract is set by how often the Task runs or the Dynamic Table\'s TARGET_LAG, traded against continuous compute cost.',
      reconcile: 'Monitoring shifts from a batch audit to continuous health: SYSTEM$PIPE_STATUS (lag, pending files) alongside COPY_HISTORY. Pipe lag is an ingestion signal — distinct from query latency.',
    },

    /* ---------- Streaming — Snowpipe Streaming ---------- */
    streaming: {
      source: 'Row-level streaming targets the lowest-latency tier: an application needs its events queryable within seconds, so the design removes the file round-trip entirely. The trade-off is a continuous client connection rather than a fire-and-forget file drop.',
      extract: 'The producer writes ROWS through the Snowpipe Streaming SDK, not files — so there is no object storage, no stage, and no file-size tuning. Latency is bounded by the client\'s buffer/flush settings, not by how often files are written.',
      interface: 'A CHANNEL is an ordered, offset-tracked row stream into a single table. Offsets are the central idea: they make per-channel appends exactly-once on client retry, replacing file-load metadata as the idempotency mechanism.',
      parse: 'There is no file to parse — rows are type-validated on ingest. Validation therefore moves into the client/channel, so a malformed row is a row-level concern (dead-letter) rather than a file-level ON_ERROR policy.',
      execute: 'Snowflake commits buffered rows continuously and advances the channel offset; compute is serverless and billed by throughput. Because nothing is staged as files, end-to-end latency can be sub-second.',
      raw: 'Rows are queryable within seconds, and the channel offset gives exactly-once append per channel, so a client retry resumes cleanly without duplicating rows.',
      validate: 'Validation is row-level with a dead-letter path for rejects — there is no file to quarantine, so bad rows are diverted individually with their reason.',
      stage_dedup: 'Even with offset-safe channels, application-level duplicates (a resend without an offset token) still need business-key dedup; a Stream on RAW feeds the incremental transform.',
      merge: 'A Dynamic Table with a short TARGET_LAG is the idiomatic transform here — declarative incremental refresh keeps curated close to real time without hand-written Tasks, as long as the query stays incremental-eligible.',
      curated: 'Real-time features and analytics read here; the entire pipeline exists to keep this layer seconds-fresh.',
      reconcile: 'Health is channel offset lag and ingest latency — there is deliberately no COPY_HISTORY, because there are no files. Looking for a file-load audit here is a category error.',
    },

    /* ---------- Kafka — Snowflake Connector ---------- */
    kafka: {
      source: 'Kafka ingestion decouples producers from Snowflake through a durable log. The connector is a managed consumer, so Snowflake\'s load behaviour depends on how the topic is produced (partitioning) as much as on Snowflake itself.',
      extract: 'Producers write to a partitioned topic, and partition count sets the ceiling on consumer parallelism. A hot or low-cardinality partition key creates skew that later shows up as uneven consumer lag.',
      transport: 'The topic is both transport and buffer: retention defines how long the connector can be down before data is lost. That makes retention a capacity-planning decision unique to log-based transport.',
      interface: 'The Snowflake Kafka Connector maps topic→table and chooses its ingestion.method — SNOWPIPE (buffers records into files) or SNOWPIPE_STREAMING (row-level). That single setting changes latency, cost AND which diagnostics apply, so it must be a deliberate choice, not a default.',
      parse: 'By default the connector lands two VARIANT columns — RECORD_CONTENT and RECORD_METADATA (topic/partition/offset) — rather than flat typed columns. Schematisation is opt-in, so expecting flat columns is a common surprise.',
      execute: 'In streaming mode the connector commits rows via channels; in Snowpipe mode it buffers records into files that Snowpipe then loads. Reasoning about throughput or lag requires knowing which mode is actually live.',
      raw: 'RAW holds VARIANT payloads plus Kafka coordinates (partition/offset). Keeping those coordinates is what enables replay and reconciliation back against the topic.',
      validate: 'Deserialisation failures and poison messages must be dead-lettered, or a single bad record can block a whole partition. Reject volume is watched as a rate.',
      stage_dedup: 'Kafka delivery is at-least-once, so dedup on a business key (or topic+partition+offset) is mandatory for correctness; assuming exactly-once from Kafka alone is a classic mistake.',
      merge: 'An incremental MERGE or Dynamic Table builds curated state. Because events can arrive out of order across partitions, ordering within the dedup window must use event/commit order, not arrival order.',
      curated: 'Query-ready fact tables for analytics, shaped for consumption like any curated layer.',
      reconcile: 'The primary signal is consumer-group lag plus connector metrics; in streaming mode you use channel offsets, in Snowpipe mode COPY_HISTORY — matching the diagnostic to the mode.',
    },

    /* ---------- CDC — Postgres · Debezium ---------- */
    cdc: {
      source: 'CDC mirrors a database\'s CURRENT STATE by streaming its changes rather than re-exporting snapshots. The unit of data is a change event (op + before/after + sequence), which is far richer — and more fragile — than a row in a file.',
      extract: 'Debezium reads the Postgres WAL via logical decoding and emits one event per committed row change, each stamped with an LSN. The replication slot is stateful: if the consumer stalls, the slot retains WAL and the source database bloats — a failure mode that lives on the source, not in Snowflake.',
      transport: 'One Kafka topic per table carries ordered change events. Ordering is per-partition, and retention must cover the worst-case outage or a fresh snapshot is needed to recover the gap.',
      interface: 'The connector lands change events into a RAW change table, preserving op, before/after and LSN. Treating these as plain inserts discards exactly the semantics that make deletes and ordering correct.',
      parse: 'Events land as VARIANT, and op/LSN/before/after are extracted in transforms. Connector event schemas differ (Debezium vs others), so normalising to a common change-row shape before applying is essential.',
      execute: 'Change events commit to the RAW change table (via streaming or Snowpipe). The RAW log is append-only — current state is DERIVED from it, never edited in place.',
      raw: 'The RAW change table is the ordered, LSN-stamped audit trail of every insert/update/delete. Because it is append-only, current state can always be rebuilt deterministically from it.',
      validate: 'Validation establishes per-key ORDER by LSN before applying — applying changes out of commit order corrupts current state even when every individual event is valid.',
      stage_dedup: 'Replays and at-least-once delivery mean the same event can appear twice; dedup by event_id and collapse to the latest LSN per key so a replay becomes a no-op.',
      merge: 'The MERGE must branch on op — DELETE on tombstones, UPDATE/INSERT otherwise — choosing one row per key by latest LSN. An insert/update-only MERGE silently never removes rows, which is the signature CDC bug.',
      curated: 'Curated mirrors the source table\'s current state with deletes applied. Reconciliation must compare by key set, since deletes legitimately make the target smaller than the raw change count.',
      reconcile: 'Reconcile key sets (not raw counts) against the source and track the LSN offset / slot lag — the health of both the pipeline and the source database depend on it.',
    },
  };

  spec.patterns.forEach(p => {
    const t = THEORY[p.id] || {};
    Object.keys(t).forEach(sid => { if (p.detail[sid]) p.detail[sid].theory = t[sid]; });
  });
})();
