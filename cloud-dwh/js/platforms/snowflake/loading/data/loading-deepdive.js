/* ============================================================
   Loading Deep Dive — interview-grade reference content for the
   full breadth of Snowflake data ingestion.

   Complements the E2E Simulator (lifecycle + 5 patterns), the
   Workshop (stages/formats/COPY), the Incremental lab (MERGE/CDC)
   and the Recovery lab (incidents). This fills the conceptual
   gaps those don't cover in depth: the continuous-data-pipeline
   mental model, every loading METHOD (incl. external/directory/
   Iceberg tables, transforms-in-COPY and unloading), the
   automation objects (Streams / Tasks / Dynamic Tables) with
   their real mechanics, the monitoring surface, and a large
   grouped interview Q&A bank.

   Pure DATA. Figures are illustrative teaching values; SQL is
   valid-for-context reference, not run against a live account.
   Facts reflect Snowflake behaviour as of late 2025 — fast-moving
   areas (Snowpipe Streaming high-performance architecture,
   triggered tasks, Dynamic Table refresh modes, Iceberg) are
   dated where it matters.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};

  /* ---------------------------------------------------------------
     1 · PIPELINE MAP — the continuous data pipeline mental model
     --------------------------------------------------------------- */
  const PIPELINE = {
    intro: 'Almost every Snowflake ingestion question is really asking you to assemble the same five building blocks in the right order. Learn this chain and you can reason about any pipeline — batch, streaming or CDC — from one picture.',
    chain: [
      { id: 'stage', icon: '🗂️', name: 'Stage', role: 'LAND', one: 'Where files live',
        what: 'A named pointer to files — an external stage references your own S3/GCS/Azure bucket in place (via a STORAGE INTEGRATION), an internal stage is Snowflake-managed storage you PUT into. Nothing is "in" Snowflake until something reads the stage.' },
      { id: 'pipe', icon: '🚰', name: 'Pipe', role: 'INGEST', one: 'Loads files for you',
        what: 'A PIPE wraps a COPY INTO statement as a standing, event-driven object. With AUTO_INGEST, a cloud notification runs it serverlessly as each file lands. (Bulk COPY INTO is the pull-based alternative — no pipe, runs on your warehouse.)' },
      { id: 'stream', icon: '🌊', name: 'Stream', role: 'CAPTURE', one: 'Tracks what changed',
        what: 'A STREAM is a change cursor over a table: it exposes the rows inserted/updated/deleted since you last read it, with offset semantics. It turns "the whole table" into "just the delta" so transforms stay incremental.' },
      { id: 'task', icon: '⏰', name: 'Task', role: 'AUTOMATE', one: 'Runs SQL on a trigger',
        what: 'A TASK runs a SQL statement or procedure on a schedule, on a cron, or when a stream has data. Tasks chain into DAGs (graphs) so a pipeline runs step by step. Serverless or on your warehouse.' },
      { id: 'dt', icon: '🔁', name: 'Dynamic Table', role: 'DECLARE', one: 'Refreshes to a freshness goal',
        what: 'A DYNAMIC TABLE is the declarative alternative to Stream+Task: you write the target query and a TARGET_LAG, and Snowflake keeps it fresh — incrementally when it can. No stream, no task, no MERGE to hand-write.' },
    ],
    note: 'Two ingestion methods bypass files entirely (Snowpipe Streaming, Kafka in streaming mode) and two bypass loading entirely (external & Iceberg tables query files in place) — but downstream, the Stream → Task / Dynamic Table half of the chain is the same.',
    /* The object cheat-table: what each object IS vs DOES. */
    objects: [
      ['Storage integration', 'Account object holding a cloud IAM role', 'Keeps credentials out of SQL; reused by many stages'],
      ['Stage', 'Named pointer to files (+ file format)', 'LIST / query / COPY / Snowpipe read from it'],
      ['File format', 'Reusable parse spec (type, delimiter, options)', 'Referenced by stages, COPY, external tables'],
      ['Pipe', 'A standing COPY for Snowpipe', 'Auto-loads files on a cloud event (or REST call)'],
      ['Stream', 'Change cursor over a table/view/stage', 'Feeds incremental MERGE / INSERT'],
      ['Task', 'Scheduled or triggered SQL runner', 'Automates the transform; chains into DAGs'],
      ['Dynamic Table', 'Declarative incrementally-refreshed table', 'Replaces Stream+Task+MERGE for most ELT'],
      ['External / Iceberg table', 'Table metadata over files in your storage', 'Query in place — no COPY, no second copy'],
    ],
  };

  /* Shorthand for a concept card. */
  function C(id, icon, title, tag, when, body, points, gotchas, interview, code) {
    return { id, icon, title, tag, when, body, points: points || [], gotchas: gotchas || [], interview: interview || '', code: code || null };
  }

  /* ---------------------------------------------------------------
     2 · LOADING METHODS — every way data gets into (or is read by)
         Snowflake, in depth.
     --------------------------------------------------------------- */
  const METHODS = [
    C('copy', '📦', 'COPY INTO <table> — bulk loading', 'Pull-based · your warehouse',
      'Back-fills and scheduled batch loads where minutes of latency are fine and you want full control.',
      [
        'COPY INTO is the foundational bulk loader: synchronous, transactional, and run on your own virtual warehouse. You invoke it (manually, or from a Task) and it returns a per-file result set. It is pull-based — nothing happens until you run it.',
        'Every other file-based method is COPY underneath: a Pipe is a standing COPY, Snowpipe runs COPY serverlessly, the Kafka connector in file mode generates COPY. Master COPY options and you understand all of them.',
      ],
      [
        'Scales with file COUNT, not file size — a bigger warehouse loads more files in parallel but does nothing for one huge file.',
        'Transactional: a COPY commits all-or-nothing per statement, so queries never see a half-loaded file.',
        'Load metadata tracks each loaded file (name + ETag) for ~64 days, so a re-run skips files already loaded — idempotent at the FILE level.',
        'Supports a rich option set (next card) for error handling, dedup control, column mapping and validation.',
      ],
      [
        'ON_ERROR defaults to ABORT_STATEMENT — one bad row fails the whole statement unless you change it.',
        'FORCE = TRUE bypasses file dedup and re-loads everything → duplicates. Never a routine retry fix.',
        'File-level idempotency is NOT row-level: the same rows in a NEW file still duplicate. Dedup by business key downstream.',
      ],
      'Interviewers use COPY to test whether you understand pull-vs-push, warehouse billing, file sizing (~100–250 MB compressed), and the 64-day load-metadata dedup. "How do you reload safely?" → re-run (dedup skips loaded files), not FORCE.',
      { lang: 'sql', label: 'COPY INTO — the shape to know', text: `COPY INTO events_db.raw.watch_events
FROM @events_db.public.hist_stage
PATTERN = '.*/2024/.*[.]parquet'        -- which files (regex on path)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE -- map by column name, not position
ON_ERROR = 'CONTINUE'                   -- load good rows, record bad ones
PURGE = FALSE;                          -- keep source files for replay

-- Re-running is safe: load metadata skips files already loaded (~64 days).
-- FORCE = TRUE re-loads everything → duplicates. Not a retry strategy.` }),

    C('copyopts', '🎛️', 'COPY option reference — the ones they ask about', 'Correctness knobs',
      'Any time the question is "how would you handle X during a load" — the answer is usually a COPY option.',
      [
        'A senior answer names the specific option, not just "handle the error". These are the high-frequency ones.',
      ],
      [
        'ON_ERROR = CONTINUE | SKIP_FILE | SKIP_FILE_n | SKIP_FILE_n% | ABORT_STATEMENT — blast radius of a bad row (ABORT is the default).',
        'VALIDATION_MODE = RETURN_ERRORS | RETURN_n_ROWS | RETURN_ALL_ERRORS — dry-run that loads nothing and reports what would fail.',
        'MATCH_BY_COLUMN_NAME = CASE_SENSITIVE | CASE_INSENSITIVE | NONE — name-based mapping for Parquet/JSON/Avro (not usable with a transforming SELECT).',
        'FORCE = TRUE — re-load files already loaded (bypasses dedup). SIZE_LIMIT — stop after ~N bytes. RETURN_FAILED_ONLY — only report files that failed.',
        'PURGE = TRUE — delete source files after a successful load. TRUNCATECOLUMNS / ENFORCE_LENGTH — truncate vs error on over-length strings.',
        'LOAD_UNCERTAIN_FILES = TRUE — reload files whose load status is unknown (metadata expired past 64 days).',
      ],
      [
        'SKIP_FILE discards the ENTIRE file on its first bad row — good rows in it are lost. Fine for all-or-nothing files, wasteful otherwise.',
        'VALIDATION_MODE ignores the SELECT list in a transforming COPY — validate the plain load, not the transform.',
      ],
      '"A COPY says the file loaded but 0 rows inserted — why?" → a file-format mismatch rejected every row; re-run with VALIDATION_MODE and inspect COPY_HISTORY error_count / the rejected records.',
      { lang: 'sql', label: 'Dry-run, then load with a reject policy', text: `-- 1) See what WOULD fail, load nothing:
COPY INTO raw.orders FROM @landing.orders_stage
  FILE_FORMAT = (FORMAT_NAME = ff_csv)
  VALIDATION_MODE = 'RETURN_ALL_ERRORS';

-- 2) Load the good rows, keep the bad ones for triage:
COPY INTO raw.orders FROM @landing.orders_stage
  FILE_FORMAT = (FORMAT_NAME = ff_csv)
  ON_ERROR = 'CONTINUE'
  RETURN_FAILED_ONLY = TRUE;` }),

    C('copytransform', '🔧', 'Transformations during COPY', 'Reshape on load',
      'Light reshaping on the way in: reorder/omit columns, cast types, split a timestamp, trim text — without a staging table.',
      [
        'COPY can load from a SELECT over the stage, so you can transform columns as they land: COPY INTO t FROM (SELECT $1, $2::number, SUBSTR($3,1,10) FROM @stage). Columns are referenced positionally ($1, $2…) or, for semi-structured, by path ($1:id).',
        'It is deliberately limited — a SELECT over a stage, not a full query engine. Know exactly what is and is not allowed.',
      ],
      [
        'Supported: column reorder/omit, CAST / ::type, a subset of scalar functions (SUBSTR, string/date/numeric funcs), and semi-structured path access + FLATTEN to build the row set.',
        'NOT supported in the COPY transform SELECT: WHERE (row filtering), ORDER BY, LIMIT / FETCH / TOP, JOIN, GROUP BY / aggregates, and DISTINCT is only partially supported.',
        'MATCH_BY_COLUMN_NAME cannot be combined with a transforming SELECT — it is one or the other.',
      ],
      [
        'You cannot filter rows during COPY. Narrow which FILES load with FILES=/PATTERN=, or load to a staging table and filter into the final table.',
        'Heavy transformation belongs in ELT (load raw, transform in SQL), not in COPY.',
      ],
      '"Can you transform data during a load?" → yes, a limited SELECT over the stage (reorder/cast/scalar funcs), but no WHERE/JOIN/GROUP BY — those happen after landing in RAW. Showing you know the boundary is the point.',
      { lang: 'sql', label: 'Reshape columns as they load', text: `COPY INTO curated.orders (order_id, amount, order_day, region)
FROM (
  SELECT
    $1::number                     AS order_id,
    $2::number(12,2)               AS amount,
    TO_DATE($3, 'YYYY-MM-DD')      AS order_day,
    UPPER($4)                      AS region
  FROM @landing.orders_stage
)
FILE_FORMAT = (FORMAT_NAME = ff_csv);
-- No WHERE here: filter which FILES load with PATTERN=, or filter after load.` }),

    C('snowpipe', '🚰', 'Snowpipe — serverless auto-ingest', 'Event-driven · serverless',
      'Files land continuously and you want hands-off, seconds-to-minutes loading with no warehouse to manage.',
      [
        'Snowpipe is a PIPE (a standing COPY) loaded by Snowflake-managed serverless compute. In AUTO_INGEST mode a cloud event (S3→SQS/SNS, GCS→Pub/Sub, Azure→Event Grid) tells the pipe a file arrived and it loads it within seconds.',
        'The alternative trigger is the Snowpipe REST API (insertFiles) — your app explicitly hands the pipe a file list. Same pipe object, push instead of event.',
      ],
      [
        'No warehouse: billed on serverless Snowpipe credits plus a small per-file overhead. Cost is driven by file count/shape, not a warehouse size you tune.',
        'File-level dedup, same as COPY — at-least-once / no-duplicate-file, NOT row-level idempotency.',
        'SYSTEM$PIPE_STATUS reports executionState, pendingFileCount and lag — the health signals. Error notifications (ERROR_INTEGRATION) can push load failures to a cloud queue.',
        'As of Dec 2025, Snowpipe moved to unified per-GB pricing (0.0037 credits/GB) across file and streaming ingestion.',
      ],
      [
        'Missing/misrouted cloud notification config → files silently never load. The event plumbing lives outside Snowflake and is the #1 failure point.',
        'Tiny files kill it: per-file overhead dominates and pendingFileCount climbs even though "nothing is broken". Right-size files or switch to Snowpipe Streaming.',
        'Stage path must match the notified prefix exactly, or the event fires and nothing loads.',
      ],
      'Classic compare: "COPY vs Snowpipe?" → COPY is pull-based batch on your warehouse (minutes–hours); Snowpipe is event-driven serverless (seconds). "How does Snowpipe know to load?" → cloud event notification wired to the pipe, or the REST insertFiles call.',
      { lang: 'sql', label: 'Auto-ingest pipe + health check', text: `CREATE OR REPLACE PIPE events_db.public.watch_pipe
  AUTO_INGEST = TRUE
  ERROR_INTEGRATION = my_notify_int    -- push load errors to a cloud queue
AS
COPY INTO events_db.raw.watch_events
FROM @events_db.public.s3_stage/watch_events/
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- Is it healthy?  (JSON: executionState, pendingFileCount, lag ...)
SELECT SYSTEM$PIPE_STATUS('events_db.public.watch_pipe');` }),

    C('streaming', '🌊', 'Snowpipe Streaming — rows, no files', 'Row-level · lowest latency',
      'Sub-second row ingestion (events, IoT, clickstream) where staging into files would add latency and tiny-file overhead.',
      [
        'Snowpipe Streaming writes ROWS directly into a table through a channel using an SDK — no object storage, no stage, no file discovery. It is a fundamentally different path from file-based Snowpipe.',
        'There are two architectures. Classic: the Snowflake Ingest SDK opens channels, each an ordered, offset-token-tracked row stream, billed on serverless compute plus client connections. The new high-performance architecture (GA 2025) routes through a PIPE object and bills purely per uncompressed GB with no per-client charge, scaling to tens of GB/s per table with Elastic Channels.',
      ],
      [
        'Offset tokens make each channel exactly-once on client retry — they replace file-load metadata as the idempotency mechanism.',
        'Latency is bounded by the client buffer/flush, not by how often files are written — sub-second is achievable.',
        'The Kafka connector in SNOWPIPE_STREAMING mode uses this under the hood.',
        'Pairs naturally with a Dynamic Table (short TARGET_LAG) for a seconds-fresh curated layer.',
      ],
      [
        'There is no COPY_HISTORY — looking for a file-load audit here is a category error. Monitor channel offset lag and ingest latency instead.',
        'Too many channels / tiny appends add overhead; right-size channels and batch appends in the client.',
        'App-level resends without an offset token still duplicate — offsets only dedup per channel, so keep business-key dedup downstream.',
      ],
      '"Where does Snowpipe Streaming fit vs classic Snowpipe?" → classic auto-loads files (seconds, file-based); Streaming writes rows via channels (sub-second, no files) — right for high-rate events. Bonus senior point: the 2025 high-performance architecture bills per-GB, not per-client.',
      { lang: 'text', label: 'Streaming client (conceptual)', text: `// Conceptual — real code uses the Snowflake Ingest SDK / Kafka connector.
channel = client.openChannel(db, schema, table, "region-us-1");
for (row : events) {
    channel.insertRow(row, /* offsetToken */ row.eventId);  // row-level, no files
}
// Offset tokens let the client resume exactly where it left off (exactly-once
// per channel). No stage, no COPY, no COPY_HISTORY — monitor channel lag.` }),

    C('kafka', '🟠', 'Kafka connector', 'Streaming OR file mode',
      'Data already flows through Kafka and you want it in Snowflake without writing a consumer.',
      [
        'The Snowflake Kafka Connector is a managed Kafka Connect sink that maps topic → table. Its single most important setting is snowflake.ingestion.method: SNOWPIPE_STREAMING (row-level, channels) or SNOWPIPE (buffers records into files, then Snowpipe loads them).',
        'That one setting changes latency, cost AND which diagnostics apply — streaming mode has channels/offsets, file mode has COPY_HISTORY.',
      ],
      [
        'By default it lands two VARIANT columns: RECORD_CONTENT (the payload) and RECORD_METADATA (topic, partition, offset, key, timestamp). Schematization (flat typed columns) is opt-in.',
        'Parallelism is per-partition: partition count sets the consumer ceiling. Order is per-partition (offset order), never global.',
        'Kafka delivery is at-least-once — dedup on a business key (or topic+partition+offset) downstream.',
      ],
      [
        'Assuming exactly-once from Kafka alone — it is at-least-once; you add idempotency.',
        'Expecting flat columns by default — it is VARIANT unless you enable schematization or FLATTEN downstream.',
        'Poison messages block a partition if not dead-lettered — configure a DLQ.',
      ],
      '"How does the Kafka connector preserve order / avoid duplicates?" → per-partition offset order, at-least-once delivery, so dedup by key downstream. Know the two ingestion modes and that they change the diagnostics.',
      { lang: 'json', label: 'Connector config (streaming mode)', text: `{
  "name": "snowflake-watch-events",
  "connector.class": "com.snowflake.kafka.connector.SnowflakeSinkConnector",
  "tasks.max": "8",
  "topics": "watch-events-prod",
  "snowflake.database.name": "EVENTS_DB",
  "snowflake.schema.name": "RAW",
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
  "buffer.flush.time": "10",
  "buffer.count.records": "10000"
}` }),

    C('external', '🔭', 'External tables — query files in place', 'No load · schema-on-read',
      'A data lake you want to query occasionally without paying to copy it into Snowflake, or to probe files before loading.',
      [
        'An external table is table metadata over files in your external stage — querying reads the files in place. No COPY, no second copy, no storage billed by Snowflake for the data itself.',
        'Rows surface as a VARIANT VALUE column; you define virtual columns as expressions over VALUE (and over METADATA$FILENAME for partitioning).',
      ],
      [
        'Partition on expressions derived from the file path so queries prune whole files — critical, since there are no micro-partition statistics to lean on.',
        'AUTO_REFRESH via cloud event notifications keeps the file list current as objects are added/removed.',
        'Slower than native tables (no micro-partitions, no clustering). Put a MATERIALIZED VIEW on top for hot query paths.',
        'Supports a stream (insert-only) for incremental processing of newly-arrived files.',
      ],
      [
        'Treating it like a native table for heavy, repeated analytics — performance will disappoint. Load (COPY) or use Iceberg for that.',
        'Forgetting partitioning → every query scans every file.',
      ],
      '"External table vs COPY?" → external = query-in-place, schema-on-read, no copy, slower, best for infrequent/lake access or pre-load inspection; COPY = load into native micro-partitions, fast, best for repeated analytics. Mention materialized views + partition pruning for senior credit.',
      { lang: 'sql', label: 'Partitioned external table', text: `CREATE OR REPLACE EXTERNAL TABLE lake.ext_events (
  event_date DATE AS TO_DATE(SPLIT_PART(METADATA$FILENAME,'/',3),'YYYY-MM-DD'),
  user_id    NUMBER AS (VALUE:user_id::number),
  title_id   NUMBER AS (VALUE:title_id::number)
)
PARTITION BY (event_date)
LOCATION = @lake.events_stage
AUTO_REFRESH = TRUE
FILE_FORMAT = (TYPE = PARQUET);
-- Query reads the Parquet files in place; event_date prunes whole files.` }),

    C('directory', '📁', 'Directory tables', 'File metadata index',
      'Cataloguing files on a stage (often unstructured data) and reacting when new files arrive.',
      [
        'A directory table is an implicit metadata layer on a stage (internal or external) — it stores one row per file: RELATIVE_PATH, SIZE, LAST_MODIFIED, ETAG and a scoped FILE_URL. Enable it with DIRECTORY = (ENABLE = TRUE).',
        'It is the backbone of unstructured-data workflows: list files, build scoped/pre-signed URLs, and feed downstream processing.',
      ],
      [
        'Query it as SELECT * FROM DIRECTORY(@my_stage).',
        'A STREAM on a directory table (insert-only) lets a Task process only newly-arrived files — a files-as-events pattern without Snowpipe.',
        'Refreshes via ALTER STAGE … REFRESH or AUTO_REFRESH with cloud notifications.',
      ],
      [
        'It indexes file metadata, not file contents — you still COPY or use functions to read the data.',
        'Easy to confuse with an external table: directory table = "what files exist"; external table = "the rows inside the files".',
      ],
      'A differentiator topic: "How do you process unstructured files (PDFs, images) in Snowflake?" → directory table for the file index + scoped URLs, a stream to catch new files, a task/UDF to process them.',
      { lang: 'sql', label: 'Directory table + new-file stream', text: `CREATE OR REPLACE STAGE docs.inbound
  DIRECTORY = (ENABLE = TRUE)
  FILE_FORMAT = (TYPE = CSV);

SELECT relative_path, size, last_modified, file_url
FROM DIRECTORY(@docs.inbound);

-- React to newly-arrived files:
CREATE OR REPLACE STREAM docs.new_files ON STAGE docs.inbound;` }),

    C('iceberg', '🧊', 'Iceberg tables', 'Open format · your storage',
      'Open-format lakehouse data in your own storage that other engines (Spark, Trino, Flink) must also read or write.',
      [
        'Iceberg tables store data as Apache Iceberg (Parquet + Iceberg metadata) in YOUR cloud storage, reached through an EXTERNAL VOLUME (an account object pointing at the bucket). You get near-native Snowflake performance on open files.',
        'Two flavours: Snowflake-managed (Snowflake is the catalog and the sole writer; other engines read) and externally managed (an external catalog — AWS Glue, Snowflake Open Catalog, an Iceberg REST catalog — is the source of truth; Snowflake reads, and can write via a catalog-linked database).',
      ],
      [
        'Load like any table: COPY INTO, INSERT, Snowpipe or Snowpipe Streaming — into a Snowflake-managed Iceberg table.',
        'LOAD_MODE = ADD_FILES_COPY registers existing Parquet files into the table instead of rewriting them (CASE_SENSITIVE column matching only).',
        'ALTER ICEBERG TABLE … CONVERT TO MANAGED promotes an externally-managed table to Snowflake-managed without rewriting data files.',
      ],
      [
        'Only one writer at a time for Snowflake-managed tables — other engines are read-only against them.',
        'COPY INTO support is limited for externally-managed tables; convert to managed for full write support.',
      ],
      'An increasingly common modern-architecture question: "Why Iceberg over a normal table?" → open format, data stays in your storage, multi-engine interoperability, no lock-in — with Snowflake performance. Know external volume + managed vs externally-managed.',
      { lang: 'sql', label: 'Snowflake-managed Iceberg + load', text: `CREATE OR REPLACE ICEBERG TABLE lake.orders (
  order_id NUMBER, amount NUMBER(12,2), order_ts TIMESTAMP_NTZ
)
CATALOG = 'SNOWFLAKE'
EXTERNAL_VOLUME = 'my_ext_vol'
BASE_LOCATION = 'orders/';

COPY INTO lake.orders
FROM @landing.orders_stage
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;` }),

    C('unload', '📤', 'Data unloading (COPY INTO location)', 'Export out of Snowflake',
      'Exporting query results or a table to files — for downstream systems, archival, or sharing with non-Snowflake consumers.',
      [
        'Unloading is COPY INTO <location> — the reverse of loading. You copy a table or query result to a stage, which writes files you then GET (internal stage) or read from your bucket (external stage).',
        'By default it splits output across parallel files (one per thread); SINGLE = TRUE forces one file, and MAX_FILE_SIZE caps each (default 16 MB, up to 5 GB).',
      ],
      [
        'Formats: CSV, JSON, Parquet. Compression on by default (gzip for CSV/JSON).',
        'PARTITION BY an expression writes a partitioned folder layout (e.g. by date) — handy for lake exports.',
        'GET downloads files from an internal stage to a client; PUT is the upload counterpart for loading.',
      ],
      [
        'Expecting one file by default — you get many unless SINGLE = TRUE (which forfeits parallelism for large exports).',
        'Very large SINGLE unloads can hit the file-size ceiling — partition or split instead.',
      ],
      'Less common but it catches people out: "How do you get data OUT of Snowflake?" → COPY INTO @stage FROM (SELECT …), choose SINGLE vs split + MAX_FILE_SIZE, then GET / read the bucket. PUT/GET move files between a client and an internal stage.',
      { lang: 'sql', label: 'Unload a query to Parquet', text: `COPY INTO @exports.daily/orders/
FROM (SELECT * FROM curated.orders WHERE order_day = CURRENT_DATE - 1)
FILE_FORMAT = (TYPE = PARQUET)
PARTITION BY ('region=' || region)   -- partitioned folder layout
MAX_FILE_SIZE = 268435456            -- 256 MB per file
HEADER = TRUE;

-- Internal stage → local client:
GET @exports.daily/orders/ file:///tmp/orders/;` }),
  ];

  /* ---------------------------------------------------------------
     3 · TRANSFORM & AUTOMATE — Streams, Tasks, Dynamic Tables,
         MERGE patterns and idempotency.
     --------------------------------------------------------------- */
  const AUTOMATE = [
    C('streams', '🌊', 'Streams — change tracking', 'The delta cursor',
      'Processing only what changed in a table since last time — the heart of incremental ELT.',
      [
        'A stream records a change cursor (offset) over a table. SELECTing it shows the rows changed since the offset; consuming it inside a DML transaction advances the offset atomically, so you never process the same change twice.',
        'It stores no data — just the offset and metadata columns: METADATA$ACTION (INSERT/DELETE), METADATA$ISUPDATE (an update is a DELETE+INSERT pair), METADATA$ROW_ID.',
      ],
      [
        'Three types: STANDARD (inserts, updates, deletes — full delta), APPEND_ONLY (inserts only — cheaper, ignores deletes/updates), INSERT_ONLY (for external tables / directory tables on a stage).',
        'Staleness: a stream must be consumed within the source table retention (DATA_RETENTION_TIME_PERIOD extended by MAX_DATA_EXTENSION_TIME_PERIOD, up to 14 days). Past STALE_AFTER it goes stale and its pending changes are lost.',
        'SYSTEM$STREAM_HAS_DATA(name) gates work so a task only runs when there is something to do.',
      ],
      [
        'A stream that is never consumed goes STALE and silently drops its changes — monitor and consume within retention.',
        'Reading a stream in a plain SELECT does NOT advance it; only consuming it in a committed DML does.',
        'An update shows as a delete + insert pair — handle both rows.',
      ],
      '"What is a stream and what makes it go stale?" → a change cursor advanced by DML consumption; goes stale if not consumed within the (possibly extended) retention window, losing the delta. Know the three types and when append-only is the right (cheaper) choice.',
      { lang: 'sql', label: 'Stream types + gating', text: `CREATE OR REPLACE STREAM raw.orders_stream ON TABLE raw.orders;            -- standard
CREATE OR REPLACE STREAM raw.orders_ins ON TABLE raw.orders APPEND_ONLY = TRUE;

-- Only act when there is a delta:
SELECT SYSTEM$STREAM_HAS_DATA('raw.orders_stream');

SELECT order_id, metadata$action, metadata$isupdate
FROM raw.orders_stream;   -- SELECT alone does NOT advance the offset` }),

    C('tasks', '⏰', 'Tasks — automation & DAGs', 'Scheduled / triggered SQL',
      'Running transforms on a schedule, or whenever upstream data changes, and chaining steps into a pipeline.',
      [
        'A Task runs one SQL statement or stored procedure on a trigger. Triggers: a fixed interval (SCHEDULE = "5 MINUTE"), a CRON expression, or dependency on another task (AFTER) to form a DAG.',
        'Compute is serverless (omit WAREHOUSE — Snowflake sizes it) or user-managed (WAREHOUSE = …). Serverless suits spiky/short tasks; a dedicated warehouse suits heavy, predictable ones.',
      ],
      [
        'Task graphs (DAGs): a root task plus children with AFTER run in dependency order; a FINALIZER task runs once the graph finishes (cleanup/notify), even on failure.',
        'WHEN SYSTEM$STREAM_HAS_DATA(…) skips a scheduled run when there is no delta — you pay nothing for an empty run.',
        'Triggered tasks (serverless, GA 2025): omit SCHEDULE, add a WHEN on one or more streams and a TARGET_COMPLETION_INTERVAL — the task fires when data arrives instead of polling, cutting idle cost and latency.',
        'A task runs serially by default; ALLOW_OVERLAPPING_EXECUTION = TRUE permits concurrent runs if a run can exceed its interval.',
      ],
      [
        'A newly created task is SUSPENDED — you must ALTER TASK … RESUME (and resume child tasks) or nothing runs.',
        'Long tasks on a short schedule back up unless overlapping is allowed or the schedule is sized to the runtime.',
      ],
      '"How do you automate an incremental load?" → a Task (scheduled or triggered) with WHEN SYSTEM$STREAM_HAS_DATA running a MERGE from a stream; chain steps with AFTER into a DAG. Senior angle: triggered serverless tasks (2025) vs cron polling, and finalizer tasks.',
      { lang: 'sql', label: 'Triggered serverless task on a stream', text: `CREATE OR REPLACE TASK curated.load_orders
  -- no WAREHOUSE  -> serverless;  no SCHEDULE -> triggered
  TARGET_COMPLETION_INTERVAL = '15 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('raw.orders_stream')
AS
MERGE INTO curated.orders t
USING (
  SELECT * FROM raw.orders_stream
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.metadata$action = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET t.status = s.status, t.amount = s.amount
WHEN NOT MATCHED THEN INSERT (order_id, status, amount)
  VALUES (s.order_id, s.status, s.amount);

ALTER TASK curated.load_orders RESUME;   -- tasks start SUSPENDED` }),

    C('dynamic', '🔁', 'Dynamic Tables — declarative pipelines', 'Set a lag, not a job',
      'Most ELT transforms where you would otherwise hand-write Stream + Task + MERGE — let Snowflake manage incrementality.',
      [
        'A Dynamic Table is defined by a query and a TARGET_LAG. Snowflake refreshes it automatically to stay within that freshness goal, computing only the changed rows when it can. You write WHAT the table should contain, not HOW to maintain it.',
        'It collapses the whole Stream + Task + MERGE pattern into one object — no stream to keep fresh, no task to resume, no MERGE to get right.',
      ],
      [
        'Refresh modes: INCREMENTAL (only changes), FULL (recompute), AUTO (Snowflake picks), and ADAPTIVE (newer). AUTO silently falls back to FULL if the query uses constructs incremental refresh cannot handle.',
        'TARGET_LAG = "1 minute" sets an explicit goal; TARGET_LAG = DOWNSTREAM means "refresh only as often as the tables reading me need".',
        'Chain them: a DAG of dynamic tables builds RAW → staging → curated declaratively, each with its own lag.',
      ],
      [
        'Not everything incrementalizes — non-deterministic functions, some window/aggregate constructs, EXCEPT/INTERSECT, and outer joins with non-equality predicates force FULL refresh (expensive). Set REFRESH_MODE = INCREMENTAL explicitly so creation FAILS loudly instead of quietly going full.',
        'A very short TARGET_LAG on a full-refresh table is a cost trap.',
      ],
      '"Dynamic Table vs Streams + Tasks — when each?" → Dynamic Table for declarative, lag-based ELT with managed incrementality (less code, fewer failure modes); Streams + Tasks when you need imperative control, non-SQL steps, or procedural logic. Senior point: knowing which queries break incremental refresh.',
      { lang: 'sql', label: 'Dynamic Table with explicit incremental', text: `CREATE OR REPLACE DYNAMIC TABLE curated.live_top_titles
  TARGET_LAG = '1 minute'
  WAREHOUSE  = transform_wh
  REFRESH_MODE = INCREMENTAL   -- fail at create if not incrementalizable
AS
SELECT title_id, COUNT(*) AS plays
FROM raw.watch_events
WHERE event_ts > DATEADD('hour', -1, CURRENT_TIMESTAMP)
GROUP BY title_id;` }),

    C('merge', '🔀', 'MERGE & idempotency patterns', 'Correct incremental apply',
      'Applying a change batch (especially CDC) so the result is correct and re-runs are safe.',
      [
        'MERGE is the upsert at the core of incremental loads: insert new keys, update changed ones, delete tombstones. Idempotency comes from the RESULT converging — re-applying the same keyed batch yields the same target.',
        'The precondition is a deterministic source: exactly one row per business key, chosen by latest sequence. Otherwise the match is ambiguous and the outcome non-deterministic.',
      ],
      [
        'Dedup the source by key first: QUALIFY ROW_NUMBER() OVER (PARTITION BY key ORDER BY lsn DESC) = 1 — keep the latest change per key per batch.',
        'Handle deletes explicitly: WHEN MATCHED AND op = "d" THEN DELETE. An insert/update-only MERGE silently never removes rows — the signature CDC bug.',
        'Order by the source sequence (LSN/offset), not event or arrival time — timestamps skew and tie.',
        'Guard replays with an applied-events table or offset check so an at-least-once redelivery is a no-op.',
      ],
      [
        'File-load dedup (COPY) is file-level, not row-level — the same rows in a new file still duplicate. Correctness is business-key + MERGE, never FORCE.',
        'Duplicate business keys in the source make MERGE error or pick arbitrarily.',
      ],
      'The reliability staple: "How do you make an incremental load idempotent?" → dedup source by key (latest LSN), MERGE on the key, branch on op for deletes, guard replays. "Why not blind append?" → at-least-once + retries duplicate and can never reflect updates/deletes.',
      { lang: 'sql', label: 'Delete-aware, replay-safe MERGE', text: `MERGE INTO curated.orders t
USING (
  SELECT * FROM staging.order_changes
  WHERE event_id NOT IN (SELECT event_id FROM curated.applied_events)  -- replay guard
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) c
ON t.order_id = c.order_id
WHEN MATCHED AND c.op = 'd' THEN DELETE                 -- propagate deletes
WHEN MATCHED AND c.op IN ('u','c') THEN UPDATE SET
  status = c.status, amount = c.amount, updated_at = c.ts
WHEN NOT MATCHED AND c.op <> 'd' THEN INSERT
  (order_id, status, amount, updated_at)
  VALUES (c.order_id, c.status, c.amount, c.ts);` }),
  ];

  /* ---------------------------------------------------------------
     4 · MONITOR & OPERATE — observability, error handling depth,
         schema evolution, cost.
     --------------------------------------------------------------- */
  const OPS = [
    C('monitor', '📊', 'Monitoring the load — which view, when', 'COPY_HISTORY & friends',
      'Any "how do you debug / audit a load" question — name the right view for the mechanism.',
      [
        'Match the diagnostic to the ingestion mechanism. Reaching for COPY_HISTORY on a streaming pipe (which has no files) is the classic wrong answer.',
      ],
      [
        'COPY_HISTORY — per-file load audit (rows parsed/loaded, errors, status). Table function in INFORMATION_SCHEMA; also an ACCOUNT_USAGE view.',
        'LOAD_HISTORY — bulk COPY loads only (NOT Snowpipe). INFORMATION_SCHEMA version; ACCOUNT_USAGE version for history.',
        'VALIDATE(table, job_id) — returns the errors from a specific past COPY job for triage.',
        'SYSTEM$PIPE_STATUS — Snowpipe health (pendingFileCount, lag). PIPE_USAGE_HISTORY — Snowpipe credit consumption.',
        'TASK_HISTORY — task run outcomes. DYNAMIC_TABLE_REFRESH_HISTORY — DT refreshes and whether they were incremental. Channel offset lag — Snowpipe Streaming.',
      ],
      [
        'INFORMATION_SCHEMA vs ACCOUNT_USAGE: INFORMATION_SCHEMA is real-time, shorter retention (7 days–6 months), scoped to a database/session, excludes dropped objects. ACCOUNT_USAGE is account-wide, 365-day retention, includes dropped objects, but lags ~45 min–3 h. Use IS for "what just happened", AU for trends/billing.',
      ],
      '"A load looks wrong — how do you investigate?" → COPY_HISTORY (file status + error_count), VALIDATE() for the exact rejects, SYSTEM$PIPE_STATUS for a pipe. Bonus: know INFORMATION_SCHEMA (live, short) vs ACCOUNT_USAGE (lagged, 365-day, account-wide).',
      { lang: 'sql', label: 'The audit queries', text: `-- Per-file load audit (real-time, last 24h):
SELECT file_name, status, row_count, row_parsed, error_count, first_error
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'RAW.WATCH_EVENTS',
  START_TIME => DATEADD('hour', -24, CURRENT_TIMESTAMP())));

-- Exact errors from one past COPY job:
SELECT * FROM TABLE(VALIDATE(raw.watch_events, JOB_ID => '_last'));

-- Snowpipe credits over time (account-wide, lagged):
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
ORDER BY start_time DESC;` }),

    C('errors', '🧪', 'Error handling & data quality', 'Good rows in, bad rows visible',
      'Loading messy real-world data without either failing the whole batch or silently losing records.',
      [
        'The goal is always: load the good rows, make the bad rows visible and reloadable, never silently drop data. Snowflake gives you layered controls to do that.',
      ],
      [
        'ON_ERROR sets the blast radius (CONTINUE / SKIP_FILE / ABORT_STATEMENT). VALIDATION_MODE dry-runs before committing.',
        'Route rejects to a quarantine table and alert on its volume — silent reject growth is quiet data loss.',
        'Distinguish format errors (parse fails, hit many/all rows in a file → fix the FILE FORMAT) from data errors (genuine bad values in valid files → quarantine with ON_ERROR = CONTINUE).',
        'Reconcile by key, not raw counts — counts legitimately shrink through rejects, dedup, updates and deletes; equal totals can be the bug.',
      ],
      [
        'ON_ERROR too strict (default ABORT) turns one bad row into a failed batch; too loose can mask a real upstream break.',
        'Reconciling file-count = row-count ignores rejects and dedup.',
      ],
      '"How do you handle bad records?" → ON_ERROR to control behaviour, VALIDATION_MODE to dry-run, quarantine + COPY_HISTORY to inspect, alert on reject rate. "Format vs data error?" → format = fix the file format; data = quarantine the rows.',
      null),

    C('schema', '🧬', 'Schema detection & evolution', 'Handle drift without breaking',
      'Source schemas that change over time (new columns) or unknown schemas you must land without hand-writing DDL.',
      [
        'Snowflake can both infer a schema up front and evolve a table as new columns appear — two related but distinct features.',
      ],
      [
        'INFER_SCHEMA(LOCATION => @stage, FILE_FORMAT => …) suggests columns/types from staged files (Parquet/Avro/ORC/CSV/JSON).',
        'CREATE TABLE … USING TEMPLATE (from INFER_SCHEMA output) auto-builds the table DDL — no manual column list.',
        'ENABLE_SCHEMA_EVOLUTION = TRUE on the table lets COPY / Snowpipe add new columns automatically as they appear in files (with name-based matching).',
        'For deeply nested or unpredictable JSON, land into a VARIANT RAW column and promote hot fields later — the most drift-tolerant pattern.',
      ],
      [
        'Schema evolution adds columns; it does not silently retype or drop — type conflicts still error.',
        'INFER_SCHEMA is a suggestion — review the inferred types (e.g. NUMBER precision, dates) before trusting them.',
      ],
      '"How do you handle schema drift on ingest?" → VARIANT landing for the flexible tail, ENABLE_SCHEMA_EVOLUTION for auto-added columns, INFER_SCHEMA + USING TEMPLATE to bootstrap DDL. Shows you plan for change instead of hard-failing.',
      { lang: 'sql', label: 'Infer, templatize, evolve', text: `-- Build the table from the files, no manual DDL:
CREATE OR REPLACE TABLE raw.orders
USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(INFER_SCHEMA(
    LOCATION => '@landing.orders_stage',
    FILE_FORMAT => 'ff_parquet'))
);

-- Let future loads add new columns automatically:
ALTER TABLE raw.orders SET ENABLE_SCHEMA_EVOLUTION = TRUE;` }),

    C('cost', '💰', 'Cost & performance of ingestion', 'The money answer',
      'Every loading design question has a cost dimension — a complete answer includes it.',
      [
        'A loading answer is incomplete without cost intuition. The cheapest correct pipeline is usually an idempotent one — a failed run is just a safe re-run, no cleanup, no duplicate-driven reprocessing downstream.',
      ],
      [
        'File sizing: ~100–250 MB compressed, many files in parallel. Tiny files waste per-file overhead (and inflate Snowpipe cost); one huge file cannot parallelize.',
        'COPY bills warehouse credits while it runs (auto-suspend reclaims idle); Snowpipe bills serverless per-GB (unified 0.0037 credits/GB since Dec 2025) plus per-file overhead — so very tiny frequent files can cost more than a batched COPY.',
        'Loading scales with file COUNT, not size — a bigger/multi-cluster warehouse helps only when there are many files.',
        'Snowpipe Streaming buys sub-second latency at a throughput-based cost; for minute-level freshness, Snowpipe + a Dynamic Table is usually cheaper.',
        'Load roughly in natural order (e.g. by event time) so micro-partition min/max metadata stays tight and later queries prune for free.',
      ],
      [
        'Sub-minute flushing to tiny files is the most common self-inflicted cost in continuous pipelines.',
        'A tiny TARGET_LAG on a non-incremental Dynamic Table quietly runs full refreshes.',
      ],
      '"COPY vs Snowpipe — who pays and when is each cheaper?" → COPY = warehouse credits (great for scheduled bulk); Snowpipe = serverless per-GB + per-file (great for continuous, but tiny files hurt). "Does a bigger warehouse speed up one huge file?" → no, split it; loading scales with file count.',
      null),
  ];

  /* ---------------------------------------------------------------
     5 · INTERVIEW Q&A — grouped, difficulty-tagged. Rendered via
         the shared QAAccordion (editable, filterable).
     --------------------------------------------------------------- */
  const QA = [
    {
      group: 'Methods & patterns',
      items: [
        { q: 'Compare COPY INTO, Snowpipe and Snowpipe Streaming in one breath.', a: 'COPY INTO is pull-based batch you run on your warehouse (minutes–hours, file-based, transactional). Snowpipe is event-driven and serverless — a cloud notification auto-runs COPY as files land (seconds–minutes). Snowpipe Streaming writes rows directly through channels with no files or stage (sub-second), using offset tokens for exactly-once per channel. Latency and cost model fall in that order; pick the slowest one that meets the freshness requirement.', difficulty: 'intermediate' },
        { q: 'Which ingestion method uses no files and no stage, and why does that matter?', a: 'Snowpipe Streaming. It writes rows through a channel with the Ingest SDK, so there is no object storage, no file-size tuning and no file-discovery latency — just buffer/flush in the client. It also means there is no COPY_HISTORY to audit; you monitor channel offset lag instead.', difficulty: 'intermediate' },
        { q: 'When do you reach for CDC (e.g. Debezium) over the other patterns?', a: 'When you must mirror a source database’s row-level inserts, UPDATES and DELETES. CDC reads the DB transaction log (WAL via logical decoding) and emits change events (op + before/after + LSN). You apply them with a delete-aware MERGE ordered by LSN. The giveaway is "keep Snowflake in sync with an OLTP table, deletes included".', difficulty: 'intermediate' },
        { q: 'What is the difference between an external table and an Iceberg table?', a: 'Both keep data as files in your own storage and query it with Snowflake. An external table is schema-on-read metadata over arbitrary files (VARIANT VALUE + virtual columns), slower, good for infrequent lake access. An Iceberg table uses the open Apache Iceberg format with real metadata/snapshots, gives near-native performance and is writable (Snowflake-managed) or interoperable with other engines (externally managed). Iceberg is the modern lakehouse choice; external tables are for occasional reads.', difficulty: 'advanced' },
        { q: 'How does the Kafka connector decide latency and diagnostics?', a: 'Through snowflake.ingestion.method: SNOWPIPE_STREAMING (row-level via channels, seconds, monitored by channel offsets) or SNOWPIPE (buffers records to files that Snowpipe loads, monitored by COPY_HISTORY). The same connector, the same topic→table mapping, but that one setting changes latency, cost and which views you debug with.', difficulty: 'advanced' },
        { q: 'Can you transform data during a COPY, and what are the limits?', a: 'Yes — COPY can load from a SELECT over the stage, so you can reorder/omit columns, cast types, apply scalar functions and access semi-structured paths. But it is not a full query: no WHERE row filtering, no JOIN, no GROUP BY/aggregates, no ORDER BY/LIMIT, and MATCH_BY_COLUMN_NAME can’t be combined with a transforming SELECT. Filter which FILES load with PATTERN=, and do real transformation after landing in RAW (ELT).', difficulty: 'advanced' },
        { q: 'How do you get data OUT of Snowflake?', a: 'COPY INTO <location> — the reverse of loading. Copy a table or query result to a stage (CSV/JSON/Parquet), which splits across parallel files by default; SINGLE = TRUE and MAX_FILE_SIZE control the output, PARTITION BY writes a partitioned folder layout. Then GET from an internal stage (or read your bucket for an external stage). PUT/GET move files between a client and an internal stage.', difficulty: 'beginner' },
      ],
    },
    {
      group: 'Stages, formats & COPY',
      items: [
        { q: 'What are the three objects you need to bulk-load files from S3?', a: 'A STORAGE INTEGRATION (holds the cloud IAM role so credentials never go inline), a STAGE (references the bucket path via that integration), and a FILE FORMAT (how to parse — type, delimiter, compression, error options). Then COPY INTO <table> FROM @stage uses the format. Optionally a PIPE wraps the COPY for Snowpipe auto-ingest.', difficulty: 'intermediate' },
        { q: 'Internal vs external stage?', a: 'An external stage points at files in your own bucket (S3/GCS/Azure) and reads them in place — Snowflake doesn’t store them. An internal stage is Snowflake-managed storage (user @~, table @%tbl, or a named internal stage) that you PUT files into first. External suits data that already lands in cloud storage; internal suits files pushed from a client.', difficulty: 'beginner' },
        { q: 'Why is the same file not loaded twice, and how do you force it?', a: 'COPY records each loaded file’s name + ETag in load metadata per table for ~64 days and skips files already loaded — idempotent at the file level. FORCE = TRUE bypasses that and re-loads everything, which duplicates rows, so it’s a deliberate reload tool, never a routine retry. For an expired-metadata edge case use LOAD_UNCERTAIN_FILES.', difficulty: 'advanced' },
        { q: 'A COPY reports the file loaded but 0 rows inserted. First suspicion?', a: 'A file-format mismatch (delimiter, header, quoting, type casts) rejected every row. Re-run with VALIDATION_MODE = RETURN_ALL_ERRORS, check COPY_HISTORY error_count / first_error and the rejected records, then fix the FILE FORMAT. Format errors tend to hit many/all rows in a file; genuine data errors hit scattered rows.', difficulty: 'intermediate' },
        { q: 'How do you load one big JSON array so each element is a row?', a: 'Use a JSON file format with STRIP_OUTER_ARRAY = TRUE, which unwraps the top-level array so each element lands as its own VARIANT row instead of one giant row. From there cast/flatten the paths you need (v:field::type, LATERAL FLATTEN for nested arrays).', difficulty: 'intermediate' },
        { q: 'What file sizing makes a bulk load fast, and does a bigger warehouse help?', a: 'Aim for ~100–250 MB compressed files and load many in parallel so every warehouse thread stays busy. Loading scales with file COUNT, not size: a bigger or multi-cluster warehouse loads more files at once but does nothing for a single huge file — split it first. Thousands of tiny files waste per-file overhead.', difficulty: 'advanced' },
      ],
    },
    {
      group: 'Streams, Tasks & Dynamic Tables',
      items: [
        { q: 'What do a Stream and a Task do together?', a: 'A Stream is a change cursor over a table — the rows changed since you last consumed it, advanced atomically when you consume it in DML. A Task runs SQL on a schedule/cron/trigger, typically WHEN SYSTEM$STREAM_HAS_DATA, to MERGE that delta into a target. Together they are the classic incremental-ELT engine; chain Tasks with AFTER for a multi-step DAG.', difficulty: 'intermediate' },
        { q: 'What makes a stream go stale, and what happens then?', a: 'A stream must be consumed within the source table’s retention window (DATA_RETENTION_TIME_PERIOD extended by MAX_DATA_EXTENSION_TIME_PERIOD, up to 14 days). Its STALE_AFTER timestamp marks the deadline; past it the stream goes stale and its pending change set is lost — you must reinitialize and backfill. So you monitor consumption and keep the consuming task healthy.', difficulty: 'advanced' },
        { q: 'Standard vs append-only stream — when do you choose append-only?', a: 'A standard stream tracks inserts, updates and deletes (full delta); append-only tracks inserts only and is cheaper and simpler. Choose append-only when the source is insert-only (event logs, raw landing tables) and you never need to react to updates/deletes — it avoids the overhead of tracking them. Insert-only streams exist for external/directory tables.', difficulty: 'advanced' },
        { q: 'Dynamic Table vs Streams + Tasks — when each?', a: 'A Dynamic Table is declarative: you write the target query and a TARGET_LAG and Snowflake maintains it, incrementally when it can — less code, fewer failure modes, ideal for standard SQL ELT. Streams + Tasks are imperative: you control each step, can call procedures / non-SQL logic, and handle cases a DT query can’t express. Reach for DTs first; drop to Streams + Tasks when you need procedural control.', difficulty: 'intermediate' },
        { q: 'When does a Dynamic Table fall back to a full refresh, and why care?', a: 'When the query uses constructs incremental refresh can’t maintain — non-deterministic functions, certain window/aggregate patterns, EXCEPT/INTERSECT, outer joins with non-equality predicates. In AUTO mode it silently goes FULL (expensive, especially on a short lag). Set REFRESH_MODE = INCREMENTAL so creation fails loudly, telling you exactly what isn’t incrementalizable.', difficulty: 'advanced' },
        { q: 'What is a triggered task and why use one?', a: 'A triggered task (serverless, GA 2025) has no SCHEDULE — it fires when a stream has data, using a WHEN on SYSTEM$STREAM_HAS_DATA plus a TARGET_COMPLETION_INTERVAL. It replaces cron polling: no empty scheduled runs, lower idle cost, and lower latency because it reacts to data arrival instead of waiting for the next tick.', difficulty: 'advanced' },
      ],
    },
    {
      group: 'Incremental, CDC & idempotency',
      items: [
        { q: 'Define idempotent loading and how you achieve it.', a: 'Re-running the same batch converges to the same final state — no duplicate rows, no double-applied updates. You achieve it with file-load dedup (COPY skips loaded files) for file-level safety, and dedup-by-business-key + MERGE for row-level correctness. A pipeline that is idempotent turns a failed load into a safe re-run with no manual cleanup.', difficulty: 'intermediate' },
        { q: 'Why is blind-appending change events dangerous?', a: 'Delivery is at-least-once and retries re-deliver events, so an append with no key/dedup creates duplicates. Worse, append-only can never reflect updates or deletes — the target drifts from the source. The fix is dedup the source by key (latest LSN) and upsert with a delete-aware MERGE.', difficulty: 'intermediate' },
        { q: 'How do you apply CDC deletes correctly?', a: 'Carry the op flag and branch in the MERGE: WHEN MATCHED AND op = ’d’ THEN DELETE (hard delete) or SET is_deleted = TRUE (soft delete to preserve history). An insert/update-only MERGE silently ignores tombstones, so deleted source rows live forever in the target — the single most common CDC bug.', difficulty: 'advanced' },
        { q: 'Why dedup the source by key before a MERGE, and how?', a: 'MERGE is non-deterministic (or errors) if one target row matches several source rows. Keep exactly one row per business key — the latest change — with QUALIFY ROW_NUMBER() OVER (PARTITION BY key ORDER BY lsn DESC) = 1. Order by the source sequence (LSN/offset), not event or arrival time, which skew and tie.', difficulty: 'advanced' },
        { q: 'What is a watermark and what makes a good one?', a: 'The high-water value already processed (MAX updated_at / LSN / offset) so the next run pulls only newer rows. A good watermark never goes backwards: a monotonic commit LSN or stream offset is safest. Timestamp watermarks miss late/clock-skewed rows and re-scan on ties — use them with care, prefer source sequence numbers.', difficulty: 'advanced' },
        { q: 'FORCE=TRUE vs a safe reload — what’s the difference?', a: 'A safe reload re-runs COPY and relies on load metadata to skip files already loaded, reprocessing only the gap. FORCE=TRUE bypasses that dedup and re-loads every file, duplicating rows. So after a half-finished batch you re-run (not FORCE); you only use FORCE for a deliberate, controlled full reload — and even then correctness still needs business-key dedup downstream.', difficulty: 'intermediate' },
      ],
    },
    {
      group: 'Monitoring, errors & cost',
      items: [
        { q: 'How do you audit and debug a load?', a: 'COPY_HISTORY for per-file status (rows parsed/loaded, error_count, first_error); VALIDATE(table, job_id) for the exact rejected rows of a past COPY; SYSTEM$PIPE_STATUS for Snowpipe health (pendingFileCount, lag); TASK_HISTORY and DYNAMIC_TABLE_REFRESH_HISTORY for automation. Match the view to the mechanism — there is no COPY_HISTORY for a streaming pipe.', difficulty: 'intermediate' },
        { q: 'INFORMATION_SCHEMA vs ACCOUNT_USAGE for load history?', a: 'INFORMATION_SCHEMA is real-time, shorter retention (7 days–6 months), scoped to a database/session, and excludes dropped objects — use it for "what just happened". ACCOUNT_USAGE is account-wide, 365-day retention, includes dropped objects, but lags ~45 min–3 h — use it for trends, billing and audits. LOAD_HISTORY covers bulk COPY only (not Snowpipe); PIPE_USAGE_HISTORY covers Snowpipe credits.', difficulty: 'advanced' },
        { q: 'How do you handle bad records during a load?', a: 'ON_ERROR controls the blast radius (CONTINUE loads good rows, SKIP_FILE drops the whole file, ABORT_STATEMENT fails the load — the default). VALIDATION_MODE dry-runs. Route rejects to a quarantine table and alert on reject volume. Distinguish format errors (fix the FILE FORMAT) from data errors (quarantine with ON_ERROR = CONTINUE). Never silently drop data.', difficulty: 'intermediate' },
        { q: 'How do you reconcile a load, and why can equal counts be a bug?', a: 'Compare control totals source vs target: row counts per partition, a SUM/checksum on key numeric columns, and distinct business-key counts. Counts legitimately change along a pipeline — filtering, rejects, dedup, updates and deletes all move the number — so reconcile BY KEY, not by raw totals. Equal source/target counts after a load that should have deduped or deleted can mean the dedup/delete silently didn’t happen.', difficulty: 'advanced' },
        { q: 'COPY vs Snowpipe — who pays, and when is each cheaper?', a: 'COPY runs on your warehouse (warehouse credits while it runs; auto-suspend reclaims idle) — cheaper for scheduled bulk. Snowpipe is serverless, billed per-GB (unified 0.0037 credits/GB since Dec 2025) plus a small per-file overhead — cheaper for continuous hands-off loading, but very tiny frequent files can cost more than a batched COPY. Right-size files either way.', difficulty: 'intermediate' },
        { q: 'How do you handle schema drift on ingest?', a: 'Land the flexible/unknown part into a VARIANT column so new fields never break the load; set ENABLE_SCHEMA_EVOLUTION = TRUE so COPY/Snowpipe add new columns automatically; and bootstrap DDL with INFER_SCHEMA + CREATE TABLE … USING TEMPLATE. Promote the handful of constantly-queried fields to typed columns and leave the long tail in VARIANT.', difficulty: 'advanced' },
      ],
    },
  ];

  viz.P.snowflake.loadingDeepDive = {
    pipeline: PIPELINE,
    methods: METHODS,
    automate: AUTOMATE,
    ops: OPS,
    qa: QA,
  };
})();
