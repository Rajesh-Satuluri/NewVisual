/* ============================================================
   Ingestion pipeline specifications — the content model behind the
   End-to-End Snowflake Ingestion Simulator (P0-A).

   A canonical 14-stage lifecycle is defined once; each of the five
   pipeline patterns marks which stages it uses and supplies
   pattern-specific detail for every stage it touches. Stages a
   pattern does NOT use are kept (on:false) so the UI can show the
   real architectural distinctions — e.g. Snowpipe Streaming never
   touches object storage, a stage, or file discovery.

   This is DATA, not behaviour. Figures are illustrative teaching
   values, never guaranteed Snowflake performance. Nothing here runs
   against a live account.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};

  /* Canonical lifecycle — 14 stages, grouped by where they run. */
  const STAGES = [
    { id: 'source',       label: 'Source system',          icon: '🗃️', group: 'Source' },
    { id: 'extract',      label: 'Extract / emit',         icon: '📤', group: 'Source' },
    { id: 'transport',    label: 'Object store / transport',icon: '☁️', group: 'Transport' },
    { id: 'notify',       label: 'Arrival / notification',  icon: '🔔', group: 'Transport' },
    { id: 'interface',    label: 'Stage / stream interface',icon: '🧩', group: 'Snowflake' },
    { id: 'discover',     label: 'Discovery / scheduling',  icon: '🔎', group: 'Snowflake' },
    { id: 'parse',        label: 'Parse / type-convert',    icon: '🔤', group: 'Snowflake' },
    { id: 'execute',      label: 'Ingest execution',        icon: '⚙️', group: 'Snowflake' },
    { id: 'raw',          label: 'RAW landing table',       icon: '📥', group: 'Tables' },
    { id: 'validate',     label: 'Validate / quarantine',   icon: '🧪', group: 'Tables' },
    { id: 'stage_dedup',  label: 'Stage / dedup',           icon: '🧹', group: 'Tables' },
    { id: 'merge',        label: 'Incremental MERGE',       icon: '🔀', group: 'Tables' },
    { id: 'curated',      label: 'Curated target',          icon: '🏆', group: 'Tables' },
    { id: 'reconcile',    label: 'Reconcile / monitor',     icon: '📊', group: 'Ops' },
  ];

  /* Shrthand for a stage-detail record. */
  function S(id, role, title, what, io, state, fail, fix, code) {
    return { id, role, title, what, io, state, fail, fix, code: code || null };
  }

  /* ---- Pattern 1: Batch file ingestion with COPY INTO ---- */
  const BATCH_COPY = {
    id: 'batch_copy', label: 'Batch — COPY INTO', short: 'COPY',
    accent: '#a371f7', fileBased: true,
    tagline: 'Warehouse-driven bulk load of files already in a stage.',
    distinction: 'COPY INTO runs on YOUR virtual warehouse and is synchronous — you run it (or schedule it) and it returns a per-file result set. It is pull-based file loading, not event-driven. Snowflake tracks each loaded file by name + ETag for ~64 days so a re-run skips files already loaded (unless FORCE=TRUE).',
    totals: { files: 1440, rows: 1440000000, rejected: 2100 },
    latency: 'minutes–hours (sized to the job)', throughput: 'bounded by warehouse size',
    skip: ['notify'],
    detail: {
      source:    S('source','upstream','Historical OLTP / export','Three years of watch history living in an operational store or prior data lake, to be back-filled once.','state: external → files','steady, finite dataset','—','—'),
      extract:   S('extract','upstream','Batch export to files','An export job writes partitioned Parquet (or CSV) files — ideally 100–250 MB compressed each — into cloud storage.','rows → object files','files written','Thousands of tiny files throttle COPY parallelism.','Consolidate to well-sized files before loading.'),
      transport: S('transport','upstream','Cloud object storage','Files sit in S3 / GCS / Azure Blob. Snowflake will read them via a stage; the files are not yet "in" Snowflake.','files at rest','files staged in bucket','Wrong prefix / region → COPY finds nothing.','Verify the stage URL + prefix with LIST @stage.'),
      interface: S('interface','snowflake','External (or internal) stage','A named stage points at the bucket + path through a storage integration. An external stage REFERENCES files in place — it does not copy them into Snowflake.','bucket → stage ref','stage resolves files','Missing storage integration / IAM role → access denied.','Grant USAGE on the integration; check the trust policy.',
        { lang:'sql', label:'Stage + file format', text:`CREATE OR REPLACE FILE FORMAT events_db.public.ff_parquet
  TYPE = PARQUET
  COMPRESSION = SNAPPY;   -- AUTO also works for Parquet

CREATE OR REPLACE STAGE events_db.public.hist_stage
  STORAGE_INTEGRATION = s3_int           -- never inline credentials
  URL = 's3://netflix-watch/historical/'
  FILE_FORMAT = events_db.public.ff_parquet;

LIST @events_db.public.hist_stage;       -- inspect before loading` }),
      discover:  S('discover','snowflake','File selection','COPY enumerates the stage and picks files by FILES=(...) or a PATTERN regex. Already-loaded files are skipped via load metadata.','stage listing → load set','N files selected','PATTERN too broad re-scans everything; too narrow misses files.','Anchor the regex to the partition path; dry-run with LIST.'),
      parse:     S('parse','snowflake','Parse & type-convert','Each worker parses Parquet column chunks and converts to Snowflake types. MATCH_BY_COLUMN_NAME maps columns by name, not position.','file bytes → typed rows','rows typed','Type mismatch (string in a NUMBER col) rejects the row.','Set ON_ERROR; inspect rejects with VALIDATION_MODE.'),
      execute:   S('execute','snowflake','COPY INTO on a warehouse','The virtual warehouse distributes files across nodes and writes new micro-partitions. Billed per warehouse-second while it runs.','typed rows → micro-partitions','files loaded','One bad file with ON_ERROR=ABORT_STATEMENT fails the whole statement.','Use ON_ERROR=CONTINUE / SKIP_FILE_n for messy sources.',
        { lang:'sql', label:'COPY INTO (bulk back-fill)', text:`COPY INTO events_db.raw.watch_events
FROM @events_db.public.hist_stage
PATTERN = '.*/watch_events_202[0-3]/.*\\.parquet'
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
ON_ERROR = 'CONTINUE'          -- skip bad rows, keep loading
PURGE = FALSE;                 -- keep files for replay

-- FORCE defaults to FALSE: re-running skips files already loaded.
-- FORCE = TRUE re-loads everything → duplicates. Not a safe default.` }),
      raw:       S('raw','table','RAW landing table','Rows land in an immutable RAW table, one row per source row, with file lineage available via METADATA$FILENAME / METADATA$FILE_ROW_NUMBER.','micro-partitions → RAW','rows in RAW','—','Keep RAW immutable so you can reprocess downstream.'),
      validate:  S('validate','table','Validate / quarantine','VALIDATION_MODE=RETURN_ERRORS (dry run) or a staging check surfaces bad rows; rejects route to a quarantine table with a reason.','RAW → good + rejects','rejects quarantined','Silent reject growth = quiet data loss.','Alert on quarantine volume; reprocess after fixing the source.',
        { lang:'sql', label:'Dry-run validation', text:`-- Inspect what WOULD fail, without loading:
COPY INTO events_db.raw.watch_events
FROM @events_db.public.hist_stage
VALIDATION_MODE = 'RETURN_ERRORS';` }),
      stage_dedup:S('stage_dedup','table','Stage & dedup','A STAGING layer promotes typed columns and de-duplicates on the business key (a back-fill often overlaps live data).','RAW → STAGING','deduped set','Overlap with live loads double-counts.','Dedup on business key with QUALIFY ROW_NUMBER().'),
      merge:     S('merge','table','MERGE into curated','A keyed MERGE upserts the back-fill into the curated table so re-runs are idempotent.','STAGING → curated','curated upserted','Duplicate business keys in source make MERGE non-deterministic.','Dedup the source first so each key appears once.'),
      curated:   S('curated','table','Curated target','The query-ready fact table analytics and BI read from.','curated rows','query-ready','—','Cluster / optimise once the back-fill settles.'),
      reconcile: S('reconcile','ops','Reconcile & monitor','COPY_HISTORY gives a per-file audit (rows loaded, errors, status). Reconcile source vs curated counts.','load metadata → audit','counts reconciled','Assuming files loaded = rows curated ignores dedup/rejects.','Reconcile at each layer; expect legitimate count drops.',
        { lang:'sql', label:'Load audit', text:`SELECT file_name, status, row_count, row_parsed, error_count
FROM TABLE(events_db.information_schema.copy_history(
  table_name => 'RAW.WATCH_EVENTS',
  start_time => DATEADD('hour', -6, CURRENT_TIMESTAMP)))
ORDER BY last_load_time DESC;` }),
    },
  };

  /* ---- Pattern 2: Continuous files with Snowpipe auto-ingest ---- */
  const SNOWPIPE = {
    id: 'snowpipe', label: 'Continuous — Snowpipe', short: 'Snowpipe',
    accent: '#29b5e8', fileBased: true,
    tagline: 'Event-driven, serverless micro-batch file loading.',
    distinction: 'Snowpipe is event-driven and serverless: a cloud notification (S3→SQS/SNS, GCS Pub/Sub, Azure Event Grid) tells a PIPE a file arrived, and Snowflake-managed compute loads it — no warehouse. It is file-level, and file-load metadata gives at-least-once / no-duplicate-file behaviour, NOT row-level idempotency.',
    totals: { files: 1440, rows: 1440000000, rejected: 900 },
    latency: 'seconds–minutes after arrival', throughput: 'serverless, per-file',
    skip: [],
    detail: {
      source:    S('source','upstream','Streaming services','Regional services emit watch events continuously.','state: live','events flowing','—','—'),
      extract:   S('extract','upstream','Micro-batch to files','A writer flushes ~1-minute Parquet files per region to cloud storage.','rows → files/min','file per minute','Sub-minute flushing makes tiny files → per-file overhead.','Target ~100–250 MB files; or use Snowpipe Streaming.'),
      transport: S('transport','upstream','Cloud object storage','New files land under a watched prefix.','files at rest','file written','—','—'),
      notify:    S('notify','upstream','Event notification','The bucket fires an event (S3→SQS/SNS, GCS→Pub/Sub, Azure→Event Grid) that the pipe subscribes to with AUTO_INGEST=TRUE.','PUT → notification','notification queued','Missing/misrouted event config → files never load.','Verify the channel ARN via SHOW PIPES / notification settings.'),
      interface: S('interface','snowflake','External stage + PIPE','A PIPE wraps a COPY statement; the external stage references the files in place.','bucket → pipe','pipe armed','Stage path ≠ notification prefix → silent no-op.','Align the stage URL with the notified prefix.',
        { lang:'sql', label:'Auto-ingest pipe', text:`CREATE OR REPLACE PIPE events_db.public.watch_pipe
  AUTO_INGEST = TRUE
AS
COPY INTO events_db.raw.watch_events
FROM @events_db.public.s3_stage/watch_events/
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;` }),
      discover:  S('discover','snowflake','Queue & schedule','Each notification enqueues the file; Snowpipe batches queued files and schedules serverless loads.','notification → queue','file eligible','Backlog grows if arrival rate > load rate (tiny files).','Watch pendingFileCount in SYSTEM$PIPE_STATUS; fix file size.'),
      parse:     S('parse','snowflake','Parse & type-convert','Serverless workers parse and type-convert each file.','file → typed rows','rows typed','Schema drift (new column) can break MATCH_BY_COLUMN_NAME.','Land into a VARIANT RAW to absorb drift.'),
      execute:   S('execute','snowflake','Serverless ingest','Snowflake-managed compute loads the file and commits — no virtual warehouse. Billed per file + compute.','typed rows → micro-partitions','file loaded','—','No warehouse to size; cost is driven by file count/shape.'),
      raw:       S('raw','table','RAW landing table','Rows commit to RAW in an ACID transaction, visible atomically.','micro-partitions → RAW','rows in RAW','—','—'),
      validate:  S('validate','table','Validate / quarantine','ON_ERROR in the pipe plus a quarantine table handle bad rows without failing the file.','RAW → good + rejects','rejects quarantined','ON_ERROR too strict drops whole files.','Tune ON_ERROR; capture rejects for triage.'),
      stage_dedup:S('stage_dedup','table','Stream → stage','A Stream on RAW exposes only new rows; dedup on business key defends against duplicate files.','RAW → change set','deduped set','Duplicate file arrival = duplicate rows if not keyed.','MERGE on business key makes results exactly-once.'),
      merge:     S('merge','table','Task MERGE / Dynamic Table','A scheduled Task MERGEs the Stream (or a Dynamic Table refreshes declaratively).','change set → curated','curated upserted','Stale stream if the consumer stops advancing past retention.','Consume within retention; monitor SYSTEM$STREAM_HAS_DATA.',
        { lang:'sql', label:'Stream + Task MERGE', text:`CREATE OR REPLACE STREAM events_db.raw.watch_stream
  ON TABLE events_db.raw.watch_events;

CREATE OR REPLACE TASK events_db.raw.merge_task
  WAREHOUSE = transform_wh
  SCHEDULE  = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('events_db.raw.watch_stream')
AS
MERGE INTO events_db.curated.fact_watch t
USING (
  SELECT * FROM events_db.raw.watch_stream
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY event_id ORDER BY event_ts DESC) = 1   -- dedup
) s
ON t.event_id = s.event_id
WHEN NOT MATCHED THEN INSERT (...) VALUES (...);` }),
      curated:   S('curated','table','Curated target','Near-real-time fact table for analytics.','curated rows','query-ready','—','—'),
      reconcile: S('reconcile','ops','Monitor the pipe','SYSTEM$PIPE_STATUS reports lag, pending files and errors; COPY_HISTORY gives the per-file audit.','pipe metadata → audit','health observed','Treating pipe lag as query latency conflates two things.','Alert when pendingFileCount / lag crosses a threshold.',
        { lang:'sql', label:'Pipe status', text:`SELECT SYSTEM$PIPE_STATUS('events_db.public.watch_pipe');
-- JSON: executionState, pendingFileCount, lastReceivedMessageTimestamp ...` }),
    },
  };

  /* ---- Pattern 3: Snowpipe Streaming (row-level, no files) ---- */
  const STREAMING = {
    id: 'streaming', label: 'Streaming — Snowpipe Streaming', short: 'Streaming',
    accent: '#3fb950', fileBased: false,
    tagline: 'Row-level ingestion through channels — no files, no stage.',
    distinction: 'Snowpipe Streaming writes ROWS directly into a table through a channel using the SDK — there is NO object storage, NO stage, and NO file discovery. This is a fundamentally different path from file-based Snowpipe: lower latency, offset-tracked per channel, billed by throughput rather than per file.',
    totals: { files: 0, rows: 1440000000, rejected: 300 },
    latency: 'sub-second–seconds', throughput: 'row-level, continuous',
    skip: ['transport', 'notify', 'discover'],
    detail: {
      source:    S('source','upstream','Application / service','An app produces events it wants queryable almost immediately.','state: live','events emitted','—','—'),
      extract:   S('extract','upstream','SDK rows (no files)','The app uses the Snowpipe Streaming SDK (directly or via the Kafka connector) to append rows — no file is ever written.','events → row buffer','rows buffered','Hand-rolling file writes re-introduces file latency.','Use the streaming SDK for genuine low latency.'),
      interface: S('interface','snowflake','Channel (streaming interface)','A client opens one or more CHANNELS to a table. Each channel is an ordered, offset-tracked row stream.','SDK → channel','channel open','Too many channels / tiny appends add overhead.','Right-size channels; batch appends in the client.',
        { lang:'python', label:'Streaming client (conceptual)', text:`# Conceptual — real code uses the Snowpipe Streaming SDK/Kafka connector.
channel = client.open_channel(db="EVENTS_DB", schema="RAW",
                              table="WATCH_EVENTS", name="region-us-1")
for row in events:                       # row-level, no files
    channel.insert_row(row, offset_token=row["event_id"])
# Offset tokens let the client resume exactly where it left off.` }),
      parse:     S('parse','snowflake','Type-convert rows','Rows are validated/converted to column types on ingest; no file parsing step.','rows → typed rows','rows typed','A row that violates a type is rejected per-row.','Validate in the client; route rejects to a dead-letter path.'),
      execute:   S('execute','snowflake','Streaming ingest','Snowflake commits buffered rows to the table continuously; the channel offset advances. Serverless.','typed rows → table','rows committed','—','Monitor channel latency and offset lag.'),
      raw:       S('raw','table','RAW landing table','Rows are queryable within seconds; offset tokens give per-channel exactly-once append.','channel → RAW','rows in RAW','—','Offsets prevent duplicate appends on client retry.'),
      validate:  S('validate','table','Validate / quarantine','Row-level validation + a dead-letter table for rejects.','RAW → good + rejects','rejects captured','Dropping malformed rows silently loses data.','Dead-letter rejects with the reason.'),
      stage_dedup:S('stage_dedup','table','Stream → stage','A Stream on RAW feeds incremental transforms; business-key dedup guards against app-level duplicates.','RAW → change set','deduped set','App resend without offsets duplicates rows.','Use offset tokens + keyed dedup.'),
      merge:     S('merge','table','Dynamic Table / MERGE','A Dynamic Table with a short TARGET_LAG keeps the curated layer close to real time.','change set → curated','curated fresh','Non-incremental DT falls back to full refresh (cost).','Keep the DT query incremental-eligible.',
        { lang:'sql', label:'Dynamic Table', text:`CREATE OR REPLACE DYNAMIC TABLE events_db.curated.live_top_titles
  TARGET_LAG = '1 minute'
  WAREHOUSE  = transform_wh
AS
SELECT title_id, COUNT(*) AS plays
FROM events_db.raw.watch_events
WHERE event_ts > DATEADD('hour', -1, CURRENT_TIMESTAMP)
GROUP BY title_id;` }),
      curated:   S('curated','table','Curated target','Real-time analytics / recommendation features read here.','curated rows','query-ready','—','—'),
      reconcile: S('reconcile','ops','Monitor channels','Channel offset lag and ingest latency are the health signals; no file audit exists.','channel metadata → audit','health observed','Looking for COPY_HISTORY here — there are no files to audit.','Monitor channel latency/offset, not file load history.'),
    },
  };

  /* ---- Pattern 4: Kafka → Snowflake (Kafka Connector) ---- */
  const KAFKA = {
    id: 'kafka', label: 'Kafka — Snowflake Connector', short: 'Kafka',
    accent: '#f0883e', fileBased: false,
    tagline: 'Kafka topics landed via the Snowflake Kafka Connector.',
    distinction: 'The Snowflake Kafka Connector can run in SNOWPIPE mode (buffers records into files, then Snowpipe loads them) or SNOWPIPE_STREAMING mode (row-level, no files). Mode changes latency AND the diagnostics: streaming mode has channels/offsets, not COPY_HISTORY. By default it lands two VARIANT columns — RECORD_CONTENT and RECORD_METADATA.',
    totals: { files: 0, rows: 1440000000, rejected: 500 },
    latency: 'seconds (streaming mode)', throughput: 'per-partition parallelism',
    skip: ['notify', 'discover'],
    detail: {
      source:    S('source','upstream','Event producers','Services publish events to Kafka.','state: live','events published','—','—'),
      extract:   S('extract','upstream','Produce to topic','Producers write to a topic partitioned for parallelism.','events → partitions','records in topic','Hot partitions skew consumer lag.','Partition on a high-cardinality key.'),
      transport: S('transport','upstream','Kafka topic (transport)','The topic is the transport buffer; the connector consumes it as a consumer group.','records at rest in topic','records retained','Retention expiry before consume = data loss.','Size retention for worst-case connector downtime.'),
      interface: S('interface','snowflake','Kafka Connector sink','The connector maps topic→table and chooses ingestion.method: SNOWPIPE (files) or SNOWPIPE_STREAMING (rows).','topic → table','connector running','Wrong ingestion.method surprises latency + diagnostics.','Pick the mode deliberately; document which one is live.',
        { lang:'json', label:'Connector config', text:`{
  "name": "snowflake-watch-events",
  "connector.class": "com.snowflake.kafka.connector.SnowflakeSinkConnector",
  "tasks.max": "8",
  "topics": "watch-events-prod",
  "snowflake.database.name": "EVENTS_DB",
  "snowflake.schema.name": "RAW",
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
  "buffer.flush.time": "10",
  "buffer.count.records": "10000",
  "buffer.size.bytes": "20000000"
}` }),
      parse:     S('parse','snowflake','Deserialize & land VARIANT','Records are deserialized; by default the connector writes RECORD_CONTENT + RECORD_METADATA as VARIANT (schematization is opt-in).','record → VARIANT row','rows typed','Expecting flat columns by default — they are VARIANT.','Enable schematization or FLATTEN in transforms.'),
      execute:   S('execute','snowflake','Ingest (mode-dependent)','Streaming mode commits rows via channels; Snowpipe mode buffers to files then loads them.','rows → table','rows committed','Confusing the two modes when debugging throughput.','Confirm the mode before reasoning about lag/cost.'),
      raw:       S('raw','table','RAW landing table','VARIANT rows with Kafka metadata (topic, partition, offset) land in RAW.','channel/file → RAW','rows in RAW','—','Keep offset/partition for replay + reconciliation.'),
      validate:  S('validate','table','Validate / quarantine','Deserialization failures and bad payloads route to a dead-letter topic / quarantine.','RAW → good + rejects','rejects captured','Poison messages block a partition if not dead-lettered.','Configure a DLQ; alert on its volume.'),
      stage_dedup:S('stage_dedup','table','Dedup on key/offset','Dedup on a business key (or topic+partition+offset) — Kafka gives at-least-once.','RAW → change set','deduped set','Assuming exactly-once from Kafka alone.','Dedup downstream; treat delivery as at-least-once.'),
      merge:     S('merge','table','MERGE / Dynamic Table','Incremental MERGE or a Dynamic Table builds the curated layer.','change set → curated','curated upserted','Out-of-order events overwrite newer with older.','Order by event time in the dedup window, not arrival.'),
      curated:   S('curated','table','Curated target','Query-ready fact table.','curated rows','query-ready','—','—'),
      reconcile: S('reconcile','ops','Consumer lag + mode metrics','Watch consumer-group lag and the connector metrics; in streaming mode use channel offsets, in Snowpipe mode COPY_HISTORY.','connector metrics → audit','health observed','Using a Snowpipe-only check in streaming mode.','Match the diagnostic to the connector mode.'),
    },
  };

  /* ---- Pattern 5: Database CDC (Postgres + Debezium + Kafka) ---- */
  const CDC = {
    id: 'cdc', label: 'CDC — Postgres · Debezium', short: 'CDC',
    accent: '#db61a2', fileBased: false,
    tagline: 'Row-level change capture from a database into Snowflake.',
    distinction: 'CDC carries INSERT/UPDATE/DELETE as change events with op + before/after images, ordered by a source offset (LSN). A delete is a real event (op=d), so an insert/update-only MERGE will silently never remove rows. Timestamp-only watermarks miss changes; use the source LSN/sequence. Connector event schemas differ — do not assume one shape.',
    totals: { files: 0, rows: 90000000, rejected: 120 },
    latency: 'seconds (change-driven)', throughput: 'proportional to change rate',
    skip: ['notify', 'discover'],
    detail: {
      source:    S('source','upstream','PostgreSQL (OLTP)','The operational database whose row changes must reach Snowflake.','state: live tables','rows changing','—','—'),
      extract:   S('extract','upstream','WAL → Debezium','Debezium reads the Postgres write-ahead log (logical decoding) and emits a change event per committed row change.','WAL → change events','events emitted','Replication slot not advanced → WAL bloat on the DB.','Monitor slot lag; keep the consumer healthy.'),
      transport: S('transport','upstream','Kafka (Debezium topics)','One topic per table carries ordered change events (op=c/u/d, before/after, LSN).','events → topic','events retained','Topic retention < outage window loses changes.','Size retention; snapshot to recover if gapped.'),
      interface: S('interface','snowflake','Connector sink','The Kafka connector lands change events into a RAW change table (VARIANT).','topic → RAW change table','connector running','Treating CDC rows like plain inserts loses op semantics.','Preserve op, before/after and LSN in RAW.',
        { lang:'json', label:'Debezium change event (shape)', text:`{
  "op": "u",                       // c=create, u=update, d=delete
  "ts_ms": 1733000000000,
  "source": { "lsn": 894523412, "table": "orders" },
  "before": { "order_id": 7, "order_status": "PENDING" },
  "after":  { "order_id": 7, "order_status": "SHIPPED" }
}` }),
      parse:     S('parse','snowflake','Land change events','Events land as VARIANT; op, LSN and before/after are extracted in transforms.','event → RAW row','rows typed','Connector schemas differ (Debezium vs others).','Normalise to a common change-row shape in STAGING.'),
      execute:   S('execute','snowflake','Ingest changes','Rows are committed to the RAW change table (via streaming or Snowpipe).','events → RAW','rows committed','—','—'),
      raw:       S('raw','table','RAW change table','Append-only log of change events with op + LSN — the audit trail.','channel → RAW','changes in RAW','—','Keep it append-only; derive current state downstream.'),
      validate:  S('validate','table','Validate / order','Validate events and establish per-key ordering by LSN before applying.','RAW → ordered changes','changes ordered','Applying out of LSN order corrupts current state.','Order by LSN per key; keep only the latest per key per batch.'),
      stage_dedup:S('stage_dedup','table','Dedup by event/LSN','Collapse duplicate/replayed events to one change per key using LSN; idempotent replay.','changes → latest-per-key','deduped changes','Duplicate events (replay) double-apply without dedup.','QUALIFY ROW_NUMBER() ... ORDER BY lsn DESC = 1.'),
      merge:     S('merge','table','MERGE with delete handling','A MERGE that handles op=d with WHEN MATCHED ... THEN DELETE, plus insert/update — so deletes propagate.','changes → current table','state applied','Insert/update-only MERGE never reflects deletes.','Branch on op; DELETE on tombstones.',
        { lang:'sql', label:'CDC MERGE (handles deletes)', text:`MERGE INTO curated.orders t
USING (
  SELECT * FROM staging.order_changes
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY order_id ORDER BY lsn DESC) = 1    -- latest change per key
) c
ON t.order_id = c.order_id
WHEN MATCHED AND c.op = 'd' THEN DELETE              -- propagate deletes
WHEN MATCHED AND c.op IN ('u','c') THEN UPDATE SET
  order_status = c.order_status, updated_at = c.ts
WHEN NOT MATCHED AND c.op <> 'd' THEN INSERT
  (order_id, order_status, updated_at)
  VALUES (c.order_id, c.order_status, c.ts);` }),
      curated:   S('curated','table','Curated current-state table','Mirrors the current state of the source table (deletes applied).','current rows','query-ready','—','—'),
      reconcile: S('reconcile','ops','Reconcile vs source','Compare row counts / key sets against the source; track LSN offset and slot lag.','offsets + counts → audit','counts reconciled','Counts differ legitimately after deletes — reconcile by key.','Reconcile key sets, not just counts; watch LSN lag.'),
    },
  };

  viz.P.snowflake.ingestPipelines = {
    stages: STAGES,
    patterns: [BATCH_COPY, SNOWPIPE, STREAMING, KAFKA, CDC],
    byId(id) { return this.patterns.find(p => p.id === id) || this.patterns[0]; },
  };
})();
