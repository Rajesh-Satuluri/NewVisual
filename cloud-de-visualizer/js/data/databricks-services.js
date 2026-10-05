/* ============================================================
   Cloud DE Visualizer — Databricks service catalogue (Block C).
   12 interview-critical Databricks components, each with six depth
   levels (What / Why / How / DE Use Case / Integrations / Runtime)
   plus key facts and interview Q&A. Consumed by _service-detail.js
   (renderer) and formats/databricks.js (nav). Cross-cloud chips
   deep-link into the Azure format where the relationship is real.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const DATABRICKS_SERVICES = [
    /* ── STORAGE (lakehouse table format) ────────────────── */
    {
      id: 'delta-lake', name: 'Delta Lake', category: 'storage',
      aka: 'The open table format under the lakehouse',
      tagline: 'An open storage layer that adds a transaction log over Parquet files, giving object storage ACID transactions, schema enforcement, time travel and upserts — the foundation every other Databricks feature builds on.',
      keyFacts: [
        { k: 'Format', v: 'Parquet + _delta_log' },
        { k: 'Guarantees', v: 'ACID (OCC)' },
        { k: 'Superpowers', v: 'MERGE, time travel' },
        { k: 'Optimize', v: 'OPTIMIZE + Z-Order / liquid' },
      ],
      what: {
        lead: 'Delta Lake is immutable Parquet data files plus an ordered transaction log (_delta_log) of JSON commits and periodic Parquet checkpoints. The log — not a file listing — defines the current table state, which is what turns a folder of Parquet into a real ACID table.',
        bullets: [
          { h: 'Transaction log', d: 'Each commit writes an atomic JSON with the add/remove file actions; readers replay the log to know exactly which files make up the table version.' },
          { h: 'ACID via OCC', d: 'Optimistic concurrency: writers stage files then atomically create the next log version; a losing racer retries — readers only ever see committed snapshots.' },
          { h: 'Schema enforcement + evolution', d: 'Writes that violate the schema are rejected; ALTER/mergeSchema evolves it as a metadata-only change.' },
          { h: 'Time travel', d: 'Query VERSION AS OF / TIMESTAMP AS OF because old file versions and the log history are retained until VACUUM.' },
        ],
      },
      why: {
        lead: 'Plain Parquet on a lake has no atomicity, no safe concurrent writes, no schema safety, no history. Delta adds all of that over the same cheap files, so the lake can serve reliable pipelines and BI — the "lakehouse".',
        bullets: [
          { h: 'Reliability on the lake', d: 'Failed jobs never leave half-written tables; concurrent writers do not corrupt data.' },
          { h: 'Upserts & deletes', d: 'MERGE INTO enables CDC and GDPR deletes that plain Parquet cannot do safely.' },
          { h: 'Performance', d: 'Per-file min/max stats in the log let engines skip files (data skipping); OPTIMIZE + Z-Order/liquid clustering co-locate data.' },
        ],
      },
      how: {
        lead: 'A write stages new Parquet files, then commits a log entry listing files to add and remove. Readers build state from the latest checkpoint plus subsequent JSON commits. Data skipping uses the stats in the log to prune files before scanning.',
        bullets: [
          { h: 'Checkpoints', d: 'Every ~10 commits Delta writes a Parquet checkpoint of cumulative state so readers replay only a few recent JSONs, not all history.' },
          { h: 'MERGE / deletion vectors', d: 'MERGE rewrites affected files (copy-on-write); deletion vectors mark deleted rows (merge-on-read) to avoid rewriting whole files.' },
          { h: 'OPTIMIZE + Z-Order', d: 'Bin-packs small files into right-sized ones and can Z-Order (or use liquid clustering) to co-locate related rows for better skipping.' },
        ],
        code: {
          lang: 'SQL / PySpark',
          text: "MERGE INTO silver.orders t\nUSING bronze.orders_cdc s\n  ON t.order_id = s.order_id\nWHEN MATCHED THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *;\n\nSELECT * FROM silver.orders VERSION AS OF 42;   -- time travel",
        },
      },
      deUseCase: {
        lead: 'Delta is the table format for every layer of the medallion architecture: Bronze raw, Silver cleaned/deduped via MERGE, Gold aggregated — all ACID, all time-travellable, queryable by Spark and Databricks SQL alike.',
        bullets: [
          { h: 'CDC into Silver', d: 'Stream or batch changes MERGE into a Silver Delta table for an always-current cleaned view.' },
          { h: 'Reproducible reports', d: 'Time travel pins a Gold table version so a report can be re-run exactly as it was.' },
        ],
      },
      integrations: [
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'governs Delta tables' },
        { id: 'auto-loader', label: 'Auto Loader', note: 'writes Bronze Delta' },
        { id: 'delta-live-tables', label: 'Delta Live Tables', note: 'builds Delta pipelines' },
        { id: 'change-data-feed', label: 'Change Data Feed', note: 'row-level changes' },
        { id: 'adls-gen2', format: 'azure', label: 'ADLS Gen2', note: 'physical storage on Azure' },
      ],
      runtime: {
        lead: 'The dominant costs are small-file overhead and log replay. Streaming writes create many tiny files, so OPTIMIZE/auto-compaction matters; a long log without checkpoints slows readers. Data skipping only helps if stats and clustering match query predicates.',
        bullets: [
          { h: 'Small files', d: 'Frequent commits fragment the table; OPTIMIZE or auto-compaction bin-packs them for fast reads.' },
          { h: 'VACUUM vs time travel', d: 'VACUUM removes old files past a retention window — it reclaims cost but also truncates how far back you can time-travel.' },
        ],
      },
      interview: [
        { q: 'What does the Delta transaction log give you that plain Parquet does not?', a: 'ACID transactions, safe concurrent writes (optimistic concurrency), schema enforcement/evolution, time travel, and upserts/deletes via MERGE. The log is an ordered set of atomic JSON commits (plus checkpoints) that defines the exact set of files in each version — so readers see consistent snapshots and writers never corrupt the table.' },
        { q: 'How does Delta do upserts, and why can’t plain Parquet?', a: 'MERGE INTO matches source rows to target and inserts/updates/deletes in one atomic commit. Under the hood it rewrites affected files (copy-on-write) or marks rows via deletion vectors (merge-on-read), then commits the add/remove actions to the log atomically. Plain Parquet has no transaction log, so there is no atomic way to replace files safely under concurrency.' },
        { q: 'What is a checkpoint in Delta and why does it exist?', a: 'Every ~10 commits Delta writes a Parquet checkpoint summarizing cumulative table state. Without it, a reader would replay the entire JSON commit history from version 0. With checkpoints, readers load the latest checkpoint and replay only the handful of commits after it — keeping table open latency low as history grows.' },
        { q: 'What is the trade-off with VACUUM?', a: 'VACUUM deletes data files no longer referenced by the current version and older than the retention window (default 7 days), reclaiming storage. But it also removes the older file versions time travel relies on — so after VACUUM you can no longer time-travel to versions whose files were purged. It is a cost-vs-history trade.' },
      ],
    },

    /* ── GOVERNANCE ──────────────────────────────────────── */
    {
      id: 'unity-catalog', name: 'Unity Catalog', category: 'governance',
      aka: 'UC — unified governance for the lakehouse',
      tagline: 'Databricks’ central governance layer: one metastore across workspaces with a three-level namespace (catalog.schema.table), fine-grained access control, automatic column/table lineage, auditing and data discovery.',
      keyFacts: [
        { k: 'Namespace', v: 'catalog.schema.table' },
        { k: 'Scope', v: 'Across workspaces' },
        { k: 'Controls', v: 'Grants, RLS/CLS, lineage' },
        { k: 'Identity', v: 'Account-level + SCIM' },
      ],
      what: {
        lead: 'Unity Catalog is a metastore that governs all data and AI assets in a Databricks account. It replaces per-workspace Hive metastores with one account-level catalog, a three-part namespace, and centralized permissions, lineage and audit.',
        bullets: [
          { h: 'Three-level namespace', d: 'catalog → schema → table/view/volume/model, so you can organize by domain/environment and grant at any level.' },
          { h: 'Fine-grained access control', d: 'ANSI GRANT/REVOKE on catalogs, schemas, tables, plus row-level security and column masking.' },
          { h: 'External locations + storage credentials', d: 'UC governs which paths (e.g. an ADLS container) principals can read/write, decoupled from cluster configs.' },
          { h: 'Automatic lineage', d: 'Captures table- and column-level lineage across notebooks, jobs and dashboards with no extra code.' },
        ],
      },
      why: {
        lead: 'Before UC, governance lived per-workspace with cluster-scoped credentials and no unified lineage — impossible to audit or share consistently. UC centralizes identity, permissions, lineage and discovery across the whole account.',
        bullets: [
          { h: 'One source of truth', d: 'Define access once at account level; every workspace honors it.' },
          { h: 'Compliance', d: 'Column masking, row filters, and audit logs answer "who can see PII and who accessed it".' },
          { h: 'Discovery & sharing', d: 'A searchable catalog plus Delta Sharing lets teams find and share governed data safely.' },
        ],
      },
      how: {
        lead: 'Identities are managed at the account level (synced via SCIM from Entra ID). A metastore is attached to workspaces; principals are granted privileges on securable objects. Access to cloud storage flows through storage credentials + external locations rather than cluster keys.',
        bullets: [
          { h: 'Storage credential → external location', d: 'A managed identity/credential is registered once; external locations map it to paths, and grants control who uses them.' },
          { h: 'RLS & column masking', d: 'Row filters and masking functions apply dynamically based on the querying principal’s group.' },
          { h: 'Managed vs external tables', d: 'Managed tables live in UC-managed storage with lifecycle handled by UC; external tables point at your own paths.' },
        ],
      },
      deUseCase: {
        lead: 'UC is the governance backbone of a Databricks lakehouse: it secures Bronze/Silver/Gold, masks PII columns, enforces row filters per region/tenant, and gives lineage so you can trace a Gold column back to source for impact analysis.',
        bullets: [
          { h: 'PII protection', d: 'Column masks on email/SSN plus row filters so analysts see only their region’s rows.' },
          { h: 'Impact analysis', d: 'Column lineage shows every downstream table/dashboard before you change a source schema.' },
        ],
      },
      integrations: [
        { id: 'delta-lake', label: 'Delta Lake', note: 'the tables it governs' },
        { id: 'delta-sharing', label: 'Delta Sharing', note: 'open cross-org sharing' },
        { id: 'databricks-sql', label: 'Databricks SQL', note: 'grants honored in DBSQL' },
        { id: 'entra-id', format: 'azure', label: 'Entra ID', note: 'identity via SCIM' },
        { id: 'purview', format: 'azure', label: 'Microsoft Purview', note: 'estate-wide catalog (overlaps)' },
      ],
      runtime: {
        lead: 'UC evaluates permissions and applies row filters/masks at query planning time, so governance is enforced by the engine, not by convention. Lineage is captured from query plans. Access needs UC-enabled compute (a shared or single-user cluster on a supported access mode).',
        bullets: [
          { h: 'Enforced in the plan', d: 'Filters/masks are injected into the query, so there is no way around them via a different tool.' },
          { h: 'Cluster access modes', d: 'UC features require supported access modes; legacy no-isolation clusters bypass some controls and are discouraged.' },
        ],
      },
      interview: [
        { q: 'What problem does Unity Catalog solve over the legacy Hive metastore?', a: 'The Hive metastore is per-workspace with cluster-scoped storage credentials and no unified lineage or fine-grained control. UC provides one account-level metastore across workspaces, a three-level namespace, ANSI GRANTs with row-level security and column masking, storage access via credentials/external locations (not cluster keys), automatic column/table lineage, and audit — consistent governance and discovery for the whole account.' },
        { q: 'How does Unity Catalog control access to cloud storage?', a: 'Through storage credentials and external locations. A managed identity/service credential is registered once as a storage credential; external locations map it to specific paths (e.g. an ADLS container). Grants then decide which principals can read/write those locations — decoupling storage access from cluster configuration so no one hardcodes keys on a cluster.' },
        { q: 'How does Unity Catalog relate to Azure Purview?', a: 'They overlap but sit at different layers. UC is Databricks-native governance that enforces access, lineage and audit on lakehouse data at query time. Purview is an estate-wide catalog that scans many sources (ADLS, SQL, Synapse, Power BI, on-prem) for discovery, classification and cross-system lineage. Enterprises often use UC to govern the lakehouse and Purview to catalog the broader estate, bridged by connectors.' },
      ],
    },

    /* ── INGESTION & ETL ─────────────────────────────────── */
    {
      id: 'delta-live-tables', name: 'Delta Live Tables', category: 'ingest-etl',
      aka: 'DLT — declarative pipelines (a.k.a. Lakeflow Declarative Pipelines)',
      tagline: 'A declarative framework for building reliable Delta pipelines: you declare the tables and their transformations, and DLT manages orchestration, dependencies, data-quality expectations, incremental processing and error recovery.',
      keyFacts: [
        { k: 'Model', v: 'Declarative (SQL/Python)' },
        { k: 'Quality', v: 'EXPECTATIONS (constraints)' },
        { k: 'Modes', v: 'Triggered / Continuous' },
        { k: 'Tables', v: 'Streaming tables + MVs' },
      ],
      what: {
        lead: 'With DLT you define datasets (streaming tables and materialized views) and the queries that populate them; DLT infers the dependency DAG, runs them in order, tracks incremental state, enforces quality expectations, and handles retries and recovery.',
        bullets: [
          { h: 'Declarative datasets', d: 'Declare each table with a query; DLT figures out the execution graph from the references between them.' },
          { h: 'Expectations', d: 'Data-quality constraints (EXPECT) that warn, drop, or fail rows that violate rules — quality is built into the pipeline.' },
          { h: 'Streaming tables vs MVs', d: 'Streaming tables process new data incrementally (append/CDC); materialized views recompute a defined result efficiently.' },
          { h: 'Triggered vs continuous', d: 'Run to completion on a schedule (triggered) or keep processing as data arrives (continuous).' },
        ],
      },
      why: {
        lead: 'Hand-written Spark pipelines mix transformation logic with orchestration, checkpoint management, retries and quality checks. DLT removes that boilerplate so engineers declare intent and get a managed, observable, self-healing pipeline.',
        bullets: [
          { h: 'Less orchestration code', d: 'No manual DAG wiring or checkpoint plumbing — DLT manages dependencies and incremental state.' },
          { h: 'Quality as a first-class citizen', d: 'Expectations quarantine or reject bad data and surface metrics automatically.' },
          { h: 'Reliability', d: 'Automatic retries, recovery and full lineage of the pipeline’s tables.' },
        ],
      },
      how: {
        lead: 'DLT parses the dataset definitions into a DAG, provisions compute, and executes each dataset, maintaining checkpoints for streaming tables and recomputing materialized views. Expectations run inline; the event log records metrics, quality and lineage.',
        bullets: [
          { h: 'APPLY CHANGES INTO', d: 'Built-in CDC handling (SCD type 1/2) that applies ordered change events into a target table without hand-written MERGE.' },
          { h: 'Auto Loader source', d: 'Streaming tables commonly read raw files via Auto Loader for incremental Bronze ingestion.' },
          { h: 'Event log', d: 'Every run emits a queryable event log with data-quality and lineage metrics.' },
        ],
        code: {
          lang: 'DLT (Python)',
          text: "@dlt.table\ndef bronze():\n    return spark.readStream.format('cloudFiles')...load(path)\n\n@dlt.table\n@dlt.expect_or_drop('valid_amount', 'amount > 0')\ndef silver():\n    return dlt.read_stream('bronze').dropDuplicates(['order_id'])",
        },
      },
      deUseCase: {
        lead: 'DLT is the managed way to build the medallion pipeline: Auto Loader → Bronze streaming table → Silver with expectations and dedup → Gold materialized views, all declared, quality-checked and orchestrated by DLT.',
        bullets: [
          { h: 'CDC pipeline', d: 'APPLY CHANGES INTO builds an SCD-2 Silver table from ordered change events with no manual MERGE.' },
          { h: 'Quality gates', d: 'Expectations drop or quarantine bad rows and expose pass/fail rates per run.' },
        ],
      },
      integrations: [
        { id: 'auto-loader', label: 'Auto Loader', note: 'incremental file source' },
        { id: 'delta-lake', label: 'Delta Lake', note: 'output tables' },
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'governs DLT tables' },
        { id: 'workflows', label: 'Workflows', note: 'orchestrates DLT + tasks' },
      ],
      runtime: {
        lead: 'DLT manages the streaming checkpoints and cluster lifecycle for you; continuous mode keeps compute running while triggered mode spins up per run. Materialized view refresh cost depends on whether DLT can incrementally update or must recompute.',
        bullets: [
          { h: 'Incremental where possible', d: 'Streaming tables process only new data; MVs incrementally refresh when the query allows, else recompute.' },
          { h: 'Serverless option', d: 'Serverless DLT removes cluster sizing and speeds startup; otherwise you size the pipeline cluster.' },
        ],
      },
      interview: [
        { q: 'What is Delta Live Tables and how is it different from a normal Spark job?', a: 'DLT is a declarative pipeline framework: you declare streaming tables and materialized views with their queries, and DLT infers the dependency DAG, manages incremental processing and checkpoints, enforces data-quality expectations, and handles retries, recovery and lineage. A normal Spark job is imperative — you hand-wire orchestration, checkpoints and quality checks yourself. DLT trades some flexibility for a managed, observable, self-healing pipeline.' },
        { q: 'What are expectations in DLT?', a: 'Declarative data-quality constraints on a dataset. EXPECT keeps but tracks violations, EXPECT OR DROP removes bad rows, EXPECT OR FAIL stops the pipeline. They run inline and emit pass/fail metrics to the event log, so quality is enforced and observable rather than bolted on.' },
        { q: 'How does DLT handle CDC?', a: 'With APPLY CHANGES INTO, which applies ordered change events (inserts/updates/deletes) into a target streaming table and can maintain SCD type 1 or type 2 automatically — replacing hand-written MERGE logic and sequencing. You give it the key, sequence column and change type, and DLT keeps the target correct.' },
      ],
    },

    {
      id: 'auto-loader', name: 'Auto Loader', category: 'ingest-etl',
      aka: 'cloudFiles — incremental file ingestion',
      tagline: 'A Structured Streaming source that incrementally and efficiently ingests new files from cloud storage as they arrive, tracking what it has already processed so you never rescan the whole directory or reprocess old files.',
      keyFacts: [
        { k: 'Source', v: 'format("cloudFiles")' },
        { k: 'Discovery', v: 'Directory listing or file notifications' },
        { k: 'State', v: 'RocksDB checkpoint' },
        { k: 'Schema', v: 'Inference + evolution' },
      ],
      what: {
        lead: 'Auto Loader is the cloudFiles source for Structured Streaming. Point it at a storage path and it processes only newly arrived files, keeping durable state of what it has seen — the standard way to build incremental Bronze ingestion on Databricks.',
        bullets: [
          { h: 'Two discovery modes', d: 'Directory listing (lists the path) or File notification (subscribes to cloud events) — notification scales to millions of files without expensive listings.' },
          { h: 'Exactly-once file processing', d: 'A checkpoint (RocksDB) records processed files so a restart never reprocesses or misses them.' },
          { h: 'Schema inference + evolution', d: 'Infers schema from sampled files and can evolve it as new columns appear, rescuing unexpected data into a rescued-data column.' },
        ],
      },
      why: {
        lead: 'Naively reading a growing directory rescans everything and risks double-processing. Auto Loader makes incremental ingestion cheap and correct, and scales to high file volumes via notifications instead of listings.',
        bullets: [
          { h: 'No full rescans', d: 'Only new files are processed; state is durable across restarts.' },
          { h: 'Scales to millions of files', d: 'File-notification mode avoids the cost of listing huge directories.' },
          { h: 'Schema drift handled', d: 'Evolution + rescued data means new/changed columns don’t break the pipeline.' },
        ],
      },
      how: {
        lead: 'Auto Loader discovers new files (by listing or by consuming a cloud notification queue it can auto-configure), reads them as a streaming micro-batch, and commits processed-file state to the checkpoint. It writes to a Delta Bronze table, often as the source of a DLT streaming table.',
        bullets: [
          { h: 'File notification setup', d: 'It can provision the cloud event subscription + queue automatically, then consume file-arrival events for low-latency discovery.' },
          { h: 'Rescued data column', d: 'Columns that don’t match the schema are captured in _rescued_data instead of being dropped.' },
          { h: 'Trigger options', d: 'Run continuously, in micro-batches, or as Trigger.AvailableNow to process the backlog once and stop.' },
        ],
        code: {
          lang: 'PySpark',
          text: "df = (spark.readStream.format('cloudFiles')\n      .option('cloudFiles.format','json')\n      .option('cloudFiles.schemaLocation', chk)\n      .load('abfss://bronze@acct.dfs.core.windows.net/orders/'))\ndf.writeStream.option('checkpointLocation', chk).toTable('bronze.orders')",
        },
      },
      deUseCase: {
        lead: 'Auto Loader is the default Bronze ingestion tool: it tails a landing zone in ADLS (often fed by Event Hubs Capture or ADF) and incrementally loads new files into a Bronze Delta table with schema evolution and exactly-once guarantees.',
        bullets: [
          { h: 'Landing → Bronze', d: 'Files land in ADLS from Capture/ADF; Auto Loader incrementally ingests them into Bronze Delta.' },
          { h: 'Backfill + live', d: 'Trigger.AvailableNow clears the backlog; a continuous stream then keeps Bronze current.' },
        ],
      },
      integrations: [
        { id: 'delta-lake', label: 'Delta Lake', note: 'Bronze target' },
        { id: 'delta-live-tables', label: 'Delta Live Tables', note: 'common source' },
        { id: 'structured-streaming', label: 'Structured Streaming', note: 'runs on top of it' },
        { id: 'adls-gen2', format: 'azure', label: 'ADLS Gen2', note: 'the landing zone' },
        { id: 'event-hubs', format: 'azure', label: 'Event Hubs Capture', note: 'produces the files' },
      ],
      runtime: {
        lead: 'Directory-listing mode is simple but gets expensive as file counts grow; file-notification mode stays cheap at scale. The checkpoint is the source of truth for exactly-once — deleting it causes reprocessing. Many small files still cost per-file overhead downstream.',
        bullets: [
          { h: 'Listing vs notification', d: 'Switch to notification mode for high-volume paths to avoid costly LIST operations.' },
          { h: 'Checkpoint is critical', d: 'It records processed files; back it up and never point two streams at the same checkpoint.' },
        ],
      },
      interview: [
        { q: 'How does Auto Loader guarantee it processes each file exactly once?', a: 'It maintains a durable checkpoint (RocksDB-backed) recording which files it has already processed. On every micro-batch it only picks up new files and commits their identifiers to the checkpoint atomically with the write. A restart resumes from the checkpoint, so no file is reprocessed or skipped — as long as you keep a stable, dedicated checkpoint location.' },
        { q: 'Directory listing vs file notification mode — when to use which?', a: 'Directory listing lists the storage path to find new files — simple, no cloud setup, but cost grows with the number of files. File notification subscribes to cloud storage events (Auto Loader can auto-provision the queue/subscription) so new files are discovered via events, not listings — essential for high-volume paths with millions of files where listing would be slow and expensive.' },
        { q: 'How does Auto Loader handle schema changes?', a: 'It infers schema from sampled files and supports schema evolution: when new columns appear it can update the schema (and restart the stream), and data that does not match the current schema is captured in a _rescued_data column rather than dropped — so drift does not silently lose data or break the pipeline.' },
      ],
    },

    /* ── STREAMING ───────────────────────────────────────── */
    {
      id: 'structured-streaming', name: 'Structured Streaming', category: 'streaming',
      aka: 'Spark’s streaming engine — a stream is an unbounded table',
      tagline: 'Spark’s scalable stream-processing engine that treats a live data stream as an unbounded table you query with the same DataFrame/SQL API as batch — with checkpointing and write-ahead logs for exactly-once, stateful, fault-tolerant processing.',
      keyFacts: [
        { k: 'Model', v: 'Micro-batch (or continuous)' },
        { k: 'Semantics', v: 'Exactly-once (with idempotent sink)' },
        { k: 'State', v: 'Checkpoint + WAL (RocksDB)' },
        { k: 'Time', v: 'Event time + watermarks' },
      ],
      what: {
        lead: 'Structured Streaming models a stream as a table that grows over time; your query is defined once and Spark incrementally executes it on each new micro-batch, updating results. The same code runs on batch and streaming sources.',
        bullets: [
          { h: 'Unbounded table abstraction', d: 'Reads (readStream) and writes (writeStream) mirror batch DataFrames — one API for both.' },
          { h: 'Event-time + watermarks', d: 'Aggregate by event time with windows; watermarks bound how long to wait for late data before finalizing state.' },
          { h: 'Output modes', d: 'Append, Update, Complete control how results are emitted to the sink.' },
          { h: 'Stateful ops', d: 'Windowed aggregations, stream-stream joins, and arbitrary state (flatMapGroupsWithState) with managed, checkpointed state.' },
        ],
      },
      why: {
        lead: 'It unifies batch and streaming under one API and provides fault tolerance and exactly-once semantics without hand-rolling offset/state management — so pipelines are simpler and correct under failure.',
        bullets: [
          { h: 'One API, two modes', d: 'Prototype on batch, deploy as a stream with minimal change.' },
          { h: 'Fault tolerance built in', d: 'Checkpoints + write-ahead logs let a failed stream resume exactly where it left off.' },
          { h: 'Delta-native', d: 'Delta is a first-class streaming source and sink, enabling incremental medallion pipelines.' },
        ],
      },
      how: {
        lead: 'The engine tracks source offsets in a checkpoint, plans an incremental query per trigger, updates state stores (RocksDB) for stateful ops, and commits results transactionally to the sink. Recovery replays from the checkpoint for exactly-once.',
        bullets: [
          { h: 'Checkpoint = offsets + state', d: 'Records read progress and operator state so restarts are consistent; each stream needs its own checkpoint.' },
          { h: 'Watermarks manage state', d: 'They let the engine drop state for windows past the allowed lateness, bounding memory.' },
          { h: 'Triggers', d: 'Fixed-interval micro-batch, Trigger.AvailableNow (drain and stop), or continuous (low-latency).' },
        ],
      },
      deUseCase: {
        lead: 'It is the engine under Auto Loader and DLT and the way to build real-time Silver: read Event Hubs/Kafka or Delta, transform, and write to a Delta table with exactly-once, powering near-real-time dashboards and features.',
        bullets: [
          { h: 'Real-time Silver', d: 'Stream from Event Hubs, dedupe and enrich, write to a Silver Delta table read live by BI.' },
          { h: 'Stream-stream join', d: 'Join clicks and impressions within a watermark window for real-time attribution.' },
        ],
      },
      integrations: [
        { id: 'delta-lake', label: 'Delta Lake', note: 'source & sink' },
        { id: 'auto-loader', label: 'Auto Loader', note: 'file streaming source' },
        { id: 'delta-live-tables', label: 'Delta Live Tables', note: 'declarative wrapper' },
        { id: 'event-hubs', format: 'azure', label: 'Event Hubs', note: 'stream source (Kafka API)' },
      ],
      runtime: {
        lead: 'Throughput and stability hinge on state size and micro-batch duration. Unbounded state (no watermark on aggregations/joins) grows forever; too-small batches add overhead, too-large add latency. RocksDB state and checkpoint I/O dominate stateful workloads.',
        bullets: [
          { h: 'Watermark or bust', d: 'Stateful aggregations/joins without a watermark accumulate unbounded state and eventually fail.' },
          { h: 'Exactly-once needs an idempotent/transactional sink', d: 'Delta gives transactional commits; arbitrary sinks may only be at-least-once.' },
        ],
      },
      interview: [
        { q: 'How does Structured Streaming achieve exactly-once processing?', a: 'It records source offsets and operator state in a checkpoint (with a write-ahead log) on every micro-batch, and commits results to the sink transactionally. On failure it replays from the last checkpoint. Combined with an idempotent or transactional sink like Delta, each input is reflected exactly once in the output — no duplicates, no loss.' },
        { q: 'What is a watermark and why is it needed?', a: 'A watermark is a threshold on event time that tells the engine how long to wait for late-arriving data before finalizing a window and dropping its state. Without it, stateful aggregations and stream-stream joins would keep state forever and eventually run out of memory. The watermark bounds state and defines when late data is too late.' },
        { q: 'Micro-batch vs continuous processing?', a: 'Default micro-batch processes data in small scheduled batches — high throughput, exactly-once, latency in the sub-second-to-seconds range. Continuous processing offers millisecond latency for simple (map-like) queries but supports fewer operations and weaker guarantees. Most pipelines use micro-batch; continuous is for ultra-low-latency, simple transforms.' },
      ],
    },

    {
      id: 'change-data-feed', name: 'Change Data Feed', category: 'streaming',
      aka: 'CDF — row-level change stream from a Delta table',
      tagline: 'A Delta table feature that records row-level changes (inserts, updates before/after, deletes) so downstream consumers can read exactly what changed between versions — turning any Delta table into a CDC source.',
      keyFacts: [
        { k: 'Enable', v: 'delta.enableChangeDataFeed=true' },
        { k: 'Emits', v: '_change_type, _commit_version' },
        { k: 'Read', v: 'readChangeFeed by version/time' },
        { k: 'Use', v: 'Incremental downstream updates' },
      ],
      what: {
        lead: 'With CDF enabled, a Delta table exposes the row-level changes for each commit — insert, update_preimage, update_postimage, delete — with metadata columns identifying the change type and the commit version/timestamp.',
        bullets: [
          { h: 'Change metadata', d: '_change_type, _commit_version and _commit_timestamp accompany each changed row.' },
          { h: 'Read by range', d: 'readChangeFeed between two versions or timestamps returns just the changes in that window.' },
          { h: 'Update pre/post images', d: 'Updates yield both the old and new row so consumers can compute deltas precisely.' },
        ],
      },
      why: {
        lead: 'Propagating changes downstream by rescanning a whole table is wasteful. CDF lets consumers process only the rows that changed since they last read, enabling efficient incremental Silver→Gold updates and replication.',
        bullets: [
          { h: 'Incremental propagation', d: 'Update Gold aggregates or a downstream table from just the changed rows.' },
          { h: 'Auditing & replication', d: 'A precise log of what changed, when, and how — useful for audit and syncing to other systems.' },
        ],
      },
      how: {
        lead: 'When enabled, Delta writes change data (as part of the commit or derived from it) so a reader can request the feed for a version range. Consumers typically MERGE the changes into a downstream table or recompute affected aggregates.',
        bullets: [
          { h: 'Enable per table', d: 'Set the table property (new tables) or ALTER an existing one; only changes after enablement are captured.' },
          { h: 'Streaming or batch read', d: 'Read the feed incrementally as a stream, or batch a version range.' },
        ],
        code: {
          lang: 'PySpark',
          text: "spark.read.format('delta')\n  .option('readChangeFeed','true')\n  .option('startingVersion', 42)\n  .table('silver.orders')\n  # rows carry _change_type, _commit_version",
        },
      },
      deUseCase: {
        lead: 'CDF drives incremental medallion propagation: when Silver changes, read only those changes and MERGE them into Gold, instead of recomputing Gold from all of Silver — the efficient way to keep marts fresh.',
        bullets: [
          { h: 'Silver → Gold incrementally', d: 'MERGE only changed Silver rows into Gold aggregates.' },
          { h: 'Outbound replication', d: 'Ship changes to an external system or serving store.' },
        ],
      },
      integrations: [
        { id: 'delta-lake', label: 'Delta Lake', note: 'the table feature' },
        { id: 'structured-streaming', label: 'Structured Streaming', note: 'stream the feed' },
        { id: 'delta-live-tables', label: 'Delta Live Tables', note: 'APPLY CHANGES consumer' },
      ],
      runtime: {
        lead: 'CDF adds some write-side overhead to record changes and only captures changes made after it was enabled. Reading a very wide version range can be large; consumers should track their last processed version to stay incremental.',
        bullets: [
          { h: 'Only post-enablement', d: 'Changes before you enabled CDF are not available — enable early.' },
          { h: 'Track your position', d: 'Persist the last _commit_version consumed so each run reads only new changes.' },
        ],
      },
      interview: [
        { q: 'What is Delta Change Data Feed and when would you use it?', a: 'CDF makes a Delta table expose its row-level changes (insert, update pre/post image, delete) with commit version/timestamp metadata. You use it to propagate changes downstream incrementally — e.g. MERGE only the rows that changed in Silver into Gold, or replicate changes to another system — instead of rescanning and recomputing the entire table. Enable it with a table property; it captures changes made after enablement.' },
        { q: 'How is CDF different from just time-travelling between two versions?', a: 'Time travel gives you full table snapshots at two versions; you’d have to diff them yourself to find changes. CDF directly emits the changed rows with a _change_type (and both pre- and post-images for updates), so consumers get precise, ready-to-apply change records without computing a diff — far more efficient for incremental downstream updates.' },
      ],
    },

    /* ── ORCHESTRATION ───────────────────────────────────── */
    {
      id: 'workflows', name: 'Databricks Workflows', category: 'orchestration',
      aka: 'Jobs — native orchestration (a.k.a. Lakeflow Jobs)',
      tagline: 'Databricks’ built-in orchestrator: define multi-task jobs as a DAG of notebooks, DLT pipelines, SQL, Python and dbt tasks, with dependencies, scheduling, retries, alerts and parameter passing — no external scheduler required.',
      keyFacts: [
        { k: 'Unit', v: 'Job = DAG of tasks' },
        { k: 'Task types', v: 'Notebook, DLT, SQL, Python, dbt' },
        { k: 'Triggers', v: 'Schedule / file arrival / continuous' },
        { k: 'Compute', v: 'Job clusters or serverless' },
      ],
      what: {
        lead: 'A Workflow (Job) is a directed graph of tasks with dependencies. Each task runs a unit of work — a notebook, a DLT pipeline, a SQL query, a Python script, a dbt project — and Workflows handles ordering, retries, alerting, and passing values between tasks.',
        bullets: [
          { h: 'Multi-task DAG', d: 'Tasks declare upstream dependencies; Workflows runs them in order and in parallel where possible.' },
          { h: 'Task variety', d: 'Notebook, DLT pipeline, SQL, Python wheel/script, dbt, and "run job" tasks compose a full pipeline.' },
          { h: 'Triggers', d: 'Cron schedules, file-arrival triggers, or continuous; plus manual and API/CI triggers.' },
          { h: 'Parameters & task values', d: 'Job/task parameters and taskValues pass data between tasks and parameterize runs.' },
        ],
      },
      why: {
        lead: 'Production pipelines need orchestration — ordering, retries, alerting, isolation — without standing up a separate scheduler. Workflows provides that natively on Databricks, running each task on isolated job compute.',
        bullets: [
          { h: 'No external scheduler', d: 'Native orchestration means one less system than wiring Airflow/ADF for Databricks-only pipelines.' },
          { h: 'Reliability', d: 'Per-task retries, timeouts, and failure alerts with a clear run history and repair-run for failed tasks.' },
          { h: 'Cost isolation', d: 'Tasks run on ephemeral job clusters (or serverless), so each run is right-sized and torn down.' },
        ],
      },
      how: {
        lead: 'You define tasks and their dependency edges; Workflows schedules the DAG, provisioning job clusters (shared across tasks or per task) or serverless compute, running tasks in dependency order, and recording a run history you can repair or rerun.',
        bullets: [
          { h: 'Repair run', d: 'Re-run only the failed tasks (and their downstream) instead of the whole job — saves time and cost.' },
          { h: 'Shared job cluster', d: 'Multiple tasks can share one job cluster to avoid repeated startup while staying isolated from other jobs.' },
          { h: 'CI/CD + orchestrate DLT', d: 'Jobs are defined as code (YAML/Asset Bundles) and commonly orchestrate DLT pipelines plus surrounding tasks.' },
        ],
      },
      deUseCase: {
        lead: 'Workflows is the control plane of a Databricks-native pipeline: ingest with Auto Loader, transform with a DLT pipeline, run quality checks, refresh a Gold table, and score an MLflow model — all as one scheduled, monitored, retryable job.',
        bullets: [
          { h: 'End-to-end medallion job', d: 'One Workflow chains Bronze ingest → DLT Silver/Gold → model scoring with dependencies and alerts.' },
          { h: 'vs ADF', d: 'For Databricks-centric work Workflows replaces an external orchestrator; ADF is preferred when orchestrating across many non-Databricks Azure services.' },
        ],
      },
      integrations: [
        { id: 'delta-live-tables', label: 'Delta Live Tables', note: 'orchestrated as a task' },
        { id: 'clusters', label: 'Clusters', note: 'runs tasks on job clusters' },
        { id: 'mlflow', label: 'MLflow', note: 'schedule train/score' },
        { id: 'data-factory', format: 'azure', label: 'Azure Data Factory', note: 'external-orchestrator alternative' },
      ],
      runtime: {
        lead: 'Each task run consumes job-cluster (or serverless) compute; shared job clusters cut repeated startup, and repair-runs avoid recomputing successful tasks. Concurrency limits and task-level retries/timeouts govern behavior under failure and load.',
        bullets: [
          { h: 'Repair over rerun', d: 'Repairing a failed run recomputes only failed/downstream tasks, not the whole DAG.' },
          { h: 'Startup amortization', d: 'A shared job cluster across tasks avoids paying cold-start per task.' },
        ],
      },
      interview: [
        { q: 'What are Databricks Workflows and when would you use them over Azure Data Factory?', a: 'Workflows (Jobs) are Databricks’ native orchestrator — multi-task DAGs of notebooks, DLT pipelines, SQL, Python and dbt with dependencies, scheduling, retries and alerts, running on isolated job compute. Use Workflows when the pipeline is Databricks-centric (it avoids standing up a separate scheduler and passes values between tasks natively). Use ADF when you need to orchestrate across many non-Databricks Azure services and connectors; a common hybrid is ADF orchestrating overall and triggering Databricks Workflows/notebooks for the transformation.' },
        { q: 'What is a repair run?', a: 'When a multi-task job fails partway, a repair run re-executes only the failed tasks and their downstream dependencies, reusing the successful tasks’ results — instead of rerunning the entire DAG. It saves time and compute and is the standard way to recover a partially-failed pipeline.' },
      ],
    },

    /* ── COMPUTE & RUNTIME ───────────────────────────────── */
    {
      id: 'photon', name: 'Photon Engine', category: 'compute',
      aka: 'Databricks’ vectorized C++ query engine',
      tagline: 'A native, vectorized query engine written in C++ that transparently accelerates SQL and DataFrame workloads on Databricks — the same code runs faster, especially for scans, joins and aggregations, at lower cost per query.',
      keyFacts: [
        { k: 'Written in', v: 'C++ (native)' },
        { k: 'Technique', v: 'Vectorized, SIMD' },
        { k: 'Compatible', v: 'Spark API, no code change' },
        { k: 'Best for', v: 'SQL scans/joins/aggs' },
      ],
      what: {
        lead: 'Photon is a drop-in execution engine that replaces parts of Spark’s JVM-based execution with vectorized native code. It is API-compatible — you enable it on the cluster/warehouse and existing SQL/DataFrame code runs faster with no changes.',
        bullets: [
          { h: 'Vectorized execution', d: 'Processes data in batches of columns using SIMD, instead of row-at-a-time — far better CPU efficiency.' },
          { h: 'Native (C++)', d: 'Avoids JVM overheads and garbage-collection stalls for compute-heavy operators.' },
          { h: 'Transparent', d: 'Falls back to Spark for operations it doesn’t yet support; no rewrite needed.' },
        ],
      },
      why: {
        lead: 'Spark’s JVM row-oriented execution leaves modern CPU performance on the table. Photon’s vectorized native engine gets more work per core, cutting query time and cost for SQL-style analytics and ETL.',
        bullets: [
          { h: 'Faster + cheaper', d: 'Higher throughput per core means the same workload finishes sooner on fewer DBUs.' },
          { h: 'No migration cost', d: 'Because it is API-compatible, teams get speedups without changing code.' },
        ],
      },
      how: {
        lead: 'When enabled, the optimizer runs supported operators (scans, filters, joins, aggregations, writes) in Photon’s native vectorized engine and seamlessly hands unsupported parts back to Spark. It powers Databricks SQL warehouses and Photon-enabled clusters.',
        bullets: [
          { h: 'Operator coverage', d: 'Most relational operators and Delta writes are accelerated; UDF-heavy or unsupported ops fall back to Spark.' },
          { h: 'Columnar + Delta synergy', d: 'Vectorized scans pair naturally with Parquet/Delta columnar storage and data skipping.' },
        ],
      },
      deUseCase: {
        lead: 'For data engineering, Photon speeds up the heavy SQL of Silver/Gold builds and BI queries: large joins and aggregations run faster and cheaper, which is why Databricks SQL warehouses run Photon by default.',
        bullets: [
          { h: 'Faster Gold builds', d: 'Large aggregation jobs finish sooner, shrinking the batch window.' },
          { h: 'Interactive BI', d: 'DBSQL warehouses use Photon for low-latency dashboard queries.' },
        ],
      },
      integrations: [
        { id: 'databricks-sql', label: 'Databricks SQL', note: 'Photon-powered warehouses' },
        { id: 'clusters', label: 'Clusters', note: 'enable Photon runtime' },
        { id: 'delta-lake', label: 'Delta Lake', note: 'accelerated scans/writes' },
      ],
      runtime: {
        lead: 'Gains are largest on CPU-bound relational work over columnar data; workloads dominated by Python UDFs or unsupported operators see less benefit because they fall back to Spark. Photon changes cost/perf, not results.',
        bullets: [
          { h: 'UDF caveat', d: 'Non-native Python UDFs can’t be vectorized and fall back — prefer built-in/SQL expressions to stay on Photon.' },
          { h: 'DBU rate', d: 'Photon clusters bill at a higher DBU rate but usually finish faster, often a net cost win for SQL/ETL.' },
        ],
      },
      interview: [
        { q: 'What is Photon and why is it faster than stock Spark?', a: 'Photon is Databricks’ native, vectorized query engine written in C++. Instead of Spark’s JVM, row-at-a-time execution, it processes columnar batches using SIMD, avoiding JVM/GC overhead and using CPUs far more efficiently. It is API-compatible, so existing SQL/DataFrame code runs faster with no changes, and it falls back to Spark for operators it does not support.' },
        { q: 'When does Photon NOT help much?', a: 'When the workload is dominated by operations Photon can’t vectorize — notably arbitrary Python UDFs, or unsupported operators — because those fall back to the Spark engine. It also helps less on tiny or purely I/O-bound jobs. Photon shines on CPU-bound relational work (scans, joins, aggregations) over columnar Delta/Parquet data.' },
      ],
    },

    {
      id: 'clusters', name: 'Clusters (All-Purpose / Job / Serverless)', category: 'compute',
      aka: 'The compute that runs Databricks workloads',
      tagline: 'Managed Spark compute in three flavors: all-purpose clusters for interactive work, job clusters that spin up per scheduled job and terminate after, and serverless compute that removes sizing and cold-starts entirely.',
      keyFacts: [
        { k: 'All-purpose', v: 'Interactive, shared, persistent' },
        { k: 'Job', v: 'Per-run, ephemeral, cheaper' },
        { k: 'Serverless', v: 'Instant, no sizing' },
        { k: 'Bill', v: 'DBUs + cloud VMs' },
      ],
      what: {
        lead: 'A Databricks cluster is a driver + worker nodes running the Databricks Runtime (Spark + optimizations). The type you pick reflects the workload: interactive exploration, scheduled production jobs, or fully-managed serverless.',
        bullets: [
          { h: 'All-purpose clusters', d: 'Persistent, shareable, for notebooks/interactive analysis and collaboration; can autoscale and auto-terminate on idle.' },
          { h: 'Job clusters', d: 'Created for a specific job run and torn down when it finishes — isolated and cheaper for production schedules.' },
          { h: 'Serverless compute', d: 'Databricks manages the pool; you get near-instant start with no node sizing — for SQL, jobs and notebooks.' },
          { h: 'Access modes', d: 'Single-user or shared access modes determine Unity Catalog compatibility and isolation.' },
        ],
      },
      why: {
        lead: 'Matching compute to workload controls both cost and reliability. Interactive work needs a warm shared cluster; production jobs want isolated, ephemeral clusters; serverless removes the operational burden of sizing and cold starts.',
        bullets: [
          { h: 'Cost control', d: 'Job clusters avoid paying for idle interactive clusters; autoscaling and auto-termination cut waste.' },
          { h: 'Isolation', d: 'A dedicated job cluster prevents a heavy job from starving interactive users.' },
          { h: 'Less ops', d: 'Serverless removes instance-type/worker-count tuning and cold-start delays.' },
        ],
      },
      how: {
        lead: 'You choose the Databricks Runtime version (optionally Photon), node types, and worker count or autoscaling range; pools can keep warm instances to cut startup time. Jobs reference a job cluster spec so each run is fresh and isolated.',
        bullets: [
          { h: 'Autoscaling', d: 'Workers scale between min/max with load; keeps cost aligned to demand.' },
          { h: 'Instance pools', d: 'Pre-warmed idle instances reduce cluster start latency for frequent jobs.' },
          { h: 'Auto-termination', d: 'Idle all-purpose clusters shut down after N minutes to stop billing.' },
        ],
      },
      deUseCase: {
        lead: 'The standard pattern: develop on an autoscaling all-purpose cluster, then run production pipelines on job clusters (or serverless) so each scheduled run is isolated, right-sized and torn down — minimizing cost and blast radius.',
        bullets: [
          { h: 'Dev vs prod compute', d: 'Interactive cluster for building; job clusters for the scheduled Workflows run.' },
          { h: 'Serverless SQL', d: 'DBSQL serverless warehouses for BI with instant start and no sizing.' },
        ],
      },
      integrations: [
        { id: 'workflows', label: 'Workflows', note: 'run tasks on job clusters' },
        { id: 'photon', label: 'Photon', note: 'runtime acceleration' },
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'access mode gating' },
        { id: 'databricks-sql', label: 'Databricks SQL', note: 'SQL warehouses' },
      ],
      runtime: {
        lead: 'Cost = DBUs (by runtime/tier) + underlying cloud VMs. Idle all-purpose clusters are the classic money leak; job clusters and auto-termination fix it. Cold starts hurt frequent jobs unless you use pools or serverless.',
        bullets: [
          { h: 'Idle cost', d: 'Auto-terminate interactive clusters; never leave them running overnight.' },
          { h: 'Start latency', d: 'Classic clusters take minutes to start; pools/serverless mitigate it.' },
        ],
      },
      interview: [
        { q: 'All-purpose vs job clusters — when do you use each?', a: 'All-purpose (interactive) clusters are persistent and shareable for notebooks, exploration and collaboration. Job clusters are created for a specific scheduled job run and terminated when it finishes. Use all-purpose for development/interactive work; use job clusters for production pipelines because they are isolated (no noisy-neighbour), right-sized per job, and cheaper since you never pay for idle time.' },
        { q: 'What is serverless compute and what problem does it solve?', a: 'Serverless compute is Databricks-managed compute where you don’t choose instance types or worker counts and get near-instant startup from a managed warm pool. It removes cluster sizing/tuning and cold-start latency — the main operational pain of classic clusters — and is available for SQL warehouses, jobs and notebooks, billed for actual usage.' },
        { q: 'How do you control Databricks compute cost?', a: 'Run production on ephemeral job clusters (no idle cost), enable autoscaling to match load, set auto-termination on interactive clusters, use instance pools or serverless to avoid repeated cold starts, and right-size node types. The biggest single leak is idle all-purpose clusters left running — auto-termination and job clusters eliminate it.' },
      ],
    },

    /* ── ANALYTICS & WAREHOUSE ───────────────────────────── */
    {
      id: 'databricks-sql', name: 'Databricks SQL', category: 'analytics',
      aka: 'DBSQL — the SQL warehouse on the lakehouse',
      tagline: 'The data-warehousing experience on Databricks: SQL warehouses (Photon-powered compute) plus a query editor, dashboards, alerts and BI connectivity, letting analysts run fast ANSI SQL directly on governed Delta tables.',
      keyFacts: [
        { k: 'Compute', v: 'SQL Warehouses (Photon)' },
        { k: 'Types', v: 'Classic / Pro / Serverless' },
        { k: 'On', v: 'Delta + Unity Catalog' },
        { k: 'For', v: 'BI, ad-hoc SQL, dashboards' },
      ],
      what: {
        lead: 'Databricks SQL provides SQL warehouses — elastic, Photon-accelerated compute optimized for concurrent BI/SQL — plus a query editor, visualizations, dashboards and alerts. It brings warehouse ergonomics to lakehouse data without moving it.',
        bullets: [
          { h: 'SQL warehouses', d: 'Right-sized (T-shirt sizes) autoscaling compute; Serverless warehouses start in seconds.' },
          { h: 'BI connectivity', d: 'Native connectors for Power BI, Tableau, and JDBC/ODBC clients.' },
          { h: 'Dashboards & alerts', d: 'Build dashboards on queries and fire alerts on thresholds — no separate BI tool required for basics.' },
        ],
      },
      why: {
        lead: 'Analysts want fast, concurrent ANSI SQL and BI on curated data without a separate warehouse copy. DBSQL serves that directly on governed Delta tables — one copy of data, governed by Unity Catalog, queried at warehouse speed via Photon.',
        bullets: [
          { h: 'No data duplication', d: 'Query the same Gold Delta tables engineers build — no ETL into a separate warehouse.' },
          { h: 'Concurrency', d: 'Warehouses scale out to serve many simultaneous BI users with low latency.' },
          { h: 'Governed', d: 'Unity Catalog grants, masks and row filters apply to DBSQL queries.' },
        ],
      },
      how: {
        lead: 'A SQL warehouse is a Photon compute cluster tuned for SQL. It autoscales clusters based on query load and queues; serverless warehouses draw from a managed warm pool for instant start. Results can cache; queries honor UC governance.',
        bullets: [
          { h: 'Autoscaling + queuing', d: 'Adds clusters under concurrency load and scales down when idle; a max sets the ceiling.' },
          { h: 'Result & disk caching', d: 'Repeated queries hit cache; Photon + Delta data skipping cut scan cost.' },
          { h: 'Serverless start', d: 'Serverless warehouses avoid the multi-minute start of classic compute.' },
        ],
      },
      deUseCase: {
        lead: 'DBSQL is the serving layer of the lakehouse: analysts and BI tools query Gold Delta tables through warehouses, with dashboards and alerts on top — the Databricks answer to a traditional SQL data warehouse.',
        bullets: [
          { h: 'BI serving', d: 'Power BI/Tableau connect to a serverless warehouse over governed Gold tables.' },
          { h: 'Ad-hoc + alerting', d: 'Analysts explore in the SQL editor; scheduled alerts watch KPIs.' },
        ],
      },
      integrations: [
        { id: 'photon', label: 'Photon', note: 'warehouse engine' },
        { id: 'delta-lake', label: 'Delta Lake', note: 'the tables queried' },
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'governs access' },
        { id: 'synapse-analytics', format: 'azure', label: 'Synapse (alt. serving)', note: 'comparable warehouse role' },
      ],
      runtime: {
        lead: 'Latency and cost track warehouse size, autoscaling ceiling and how much each query scans. Serverless removes start latency; classic warehouses cost while idle unless auto-stopped. Small files and missing clustering hurt scan performance.',
        bullets: [
          { h: 'Right-size + auto-stop', d: 'Pick the smallest size that meets latency; enable auto-stop to avoid idle cost.' },
          { h: 'Data layout matters', d: 'OPTIMIZE/liquid clustering + data skipping determine how little each query scans.' },
        ],
      },
      interview: [
        { q: 'What is a SQL warehouse in Databricks SQL?', a: 'It is the compute that runs SQL/BI queries — a Photon-accelerated cluster tuned for concurrent, low-latency SQL over Delta tables. It autoscales clusters based on query load, honors Unity Catalog governance, and comes in Classic/Pro/Serverless flavors; Serverless starts in seconds from a managed pool. It gives warehouse ergonomics directly on lakehouse data without copying it out.' },
        { q: 'How does Databricks SQL differ from a traditional data warehouse like Synapse dedicated pool?', a: 'DBSQL queries open Delta tables in the lakehouse in place — one governed copy of data, no ETL into proprietary warehouse storage — using Photon for speed and Unity Catalog for governance. A Synapse dedicated pool loads data into its own MPP storage tuned via distribution keys. DBSQL emphasizes lakehouse unification (engineering, ML and BI on one copy); the dedicated pool emphasizes a classic provisioned MPP warehouse. Both serve BI SQL at scale.' },
      ],
    },

    /* ── ML & AI ─────────────────────────────────────────── */
    {
      id: 'mlflow', name: 'MLflow', category: 'ml',
      aka: 'Open-source ML lifecycle platform',
      tagline: 'An open-source platform (created by Databricks) for managing the machine-learning lifecycle: experiment tracking, reproducible runs, a model registry with stage transitions, and packaging models for deployment.',
      keyFacts: [
        { k: 'Tracking', v: 'Params / metrics / artifacts' },
        { k: 'Registry', v: 'Versions + stages/aliases' },
        { k: 'Packaging', v: 'MLflow Models flavor' },
        { k: 'Serving', v: 'Batch / real-time endpoints' },
      ],
      what: {
        lead: 'MLflow organizes ML work into tracked runs and registered models. Tracking logs parameters, metrics and artifacts per run; the Model Registry versions models and manages promotion; Models package a trained model with its flavor for consistent deployment.',
        bullets: [
          { h: 'Tracking', d: 'Log params, metrics, and artifacts (model files, plots) per run for comparison and reproducibility.' },
          { h: 'Model Registry', d: 'Central store of versioned models with stage transitions / aliases (e.g. Staging → Production) and approvals.' },
          { h: 'Models & flavors', d: 'A standard packaging so a model trained in sklearn/PyTorch/Spark deploys the same way.' },
          { h: 'Deployment', d: 'Serve registered models via batch scoring or real-time Model Serving endpoints.' },
        ],
      },
      why: {
        lead: 'ML without tracking is irreproducible and ungoverned — you can’t tell which data/params produced a model or safely promote it. MLflow makes experiments comparable, models versioned and promotable, and deployment consistent.',
        bullets: [
          { h: 'Reproducibility', d: 'Every run’s inputs and results are recorded, so results can be reproduced and audited.' },
          { h: 'Governed promotion', d: 'The registry gives a controlled path from experiment to production with lineage.' },
          { h: 'Consistent deploy', d: 'One packaging works across batch and real-time serving.' },
        ],
      },
      how: {
        lead: 'You wrap training with mlflow tracking calls (often autolog) to capture params/metrics/artifacts; the best run’s model is registered and versioned; stage/alias transitions promote it; serving loads the registered version. On Databricks, MLflow integrates with Unity Catalog for governed models.',
        bullets: [
          { h: 'Autolog', d: 'Automatically captures params/metrics/model for popular frameworks with one call.' },
          { h: 'Registry in Unity Catalog', d: 'Models registered as UC objects get the same grants, lineage and audit as data.' },
          { h: 'Feature Store link', d: 'Models can record the features used, tying training and serving together.' },
        ],
        code: {
          lang: 'Python',
          text: "import mlflow\nmlflow.sklearn.autolog()\nwith mlflow.start_run():\n    model.fit(X, y)          # params/metrics/model logged\nmlflow.register_model(uri, 'catalog.ml.churn')  # versioned in UC",
        },
      },
      deUseCase: {
        lead: 'For DE/ML platforms, MLflow is the governance layer for models the way Unity Catalog is for data: pipelines train on Gold features, log runs, register the winner, and promote it to Production for batch or real-time serving — all tracked and reproducible.',
        bullets: [
          { h: 'Train → register → serve', d: 'A job trains on Gold, logs metrics, registers and promotes the model to a serving endpoint.' },
          { h: 'Auditability', d: 'Every production model traces back to the run, data and params that made it.' },
        ],
      },
      integrations: [
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'governs registered models' },
        { id: 'delta-lake', label: 'Delta Lake', note: 'training data / features' },
        { id: 'workflows', label: 'Workflows', note: 'schedule train/score jobs' },
      ],
      runtime: {
        lead: 'Tracking is lightweight logging to a backend store; the registry adds governance, not compute. Real cost/latency shows up in Model Serving (endpoint compute) and batch scoring jobs, not in tracking itself.',
        bullets: [
          { h: 'Serving compute', d: 'Real-time endpoints run managed compute you scale to traffic; batch scoring runs on clusters/jobs.' },
          { h: 'Reproducibility depends on inputs', d: 'Log data versions (e.g. Delta version) alongside runs to truly reproduce a model.' },
        ],
      },
      interview: [
        { q: 'What are the main components of MLflow?', a: 'Tracking (log params, metrics and artifacts per run for comparison and reproducibility), the Model Registry (versioned models with stage/alias transitions like Staging→Production and approvals), MLflow Models (a standard packaging/flavor so a model deploys consistently regardless of framework), and deployment/serving (batch or real-time endpoints). On Databricks the registry integrates with Unity Catalog for governed, audited models.' },
        { q: 'How does MLflow help with reproducibility and governance?', a: 'Every training run records its parameters, metrics, code version and artifacts, so you can reproduce and compare results. The Model Registry versions models and controls promotion through stages with approvals and lineage, and — registered in Unity Catalog — models get the same access control, lineage and audit as data. Together they answer "which data/params produced this production model, and who approved it".' },
      ],
    },

    /* ── GOVERNANCE (sharing) ────────────────────────────── */
    {
      id: 'delta-sharing', name: 'Delta Sharing', category: 'governance',
      aka: 'Open protocol for secure data sharing',
      tagline: 'An open protocol for sharing live data across organizations and platforms without copying it — recipients read shared Delta tables directly from cloud storage using any Delta Sharing client, governed centrally by the provider.',
      keyFacts: [
        { k: 'Model', v: 'Open REST protocol' },
        { k: 'Shares', v: 'Live tables, no copy' },
        { k: 'Recipients', v: 'Any client (not just Databricks)' },
        { k: 'Governed by', v: 'Unity Catalog' },
      ],
      what: {
        lead: 'Delta Sharing lets a data provider grant recipients read access to Delta tables via an open protocol. Recipients — on Databricks or using pandas/Spark/other clients — read the data in place from cloud storage through short-lived signed URLs, with no data movement.',
        bullets: [
          { h: 'Open protocol', d: 'A REST spec with open-source clients, so recipients need not be Databricks customers.' },
          { h: 'Share live data', d: 'Recipients see current table data (and can stream changes), not a stale export.' },
          { h: 'Central governance', d: 'The provider controls shares and recipients through Unity Catalog; access is auditable and revocable.' },
        ],
      },
      why: {
        lead: 'Traditional sharing means copying data via FTP/exports — stale, ungoverned, and duplicated. Delta Sharing shares live data securely without copies, across clouds and platforms, keeping one governed source of truth.',
        bullets: [
          { h: 'No copies', d: 'Recipients read the provider’s files directly; no duplication or drift.' },
          { h: 'Cross-platform', d: 'Any Delta Sharing client works — Databricks, Spark, pandas, BI tools.' },
          { h: 'Governed & revocable', d: 'Grant, audit and revoke access centrally through Unity Catalog.' },
        ],
      },
      how: {
        lead: 'The provider defines a share (a set of tables) and a recipient (with a bearer token or Databricks-to-Databricks identity). A sharing server authorizes requests and hands back short-lived signed URLs to the underlying files, which the client reads directly.',
        bullets: [
          { h: 'Shares + recipients', d: 'UC objects: a share bundles tables; recipients get tokenized or identity-based access.' },
          { h: 'Signed URLs', d: 'Time-limited URLs to Parquet/Delta files mean the provider never exposes credentials.' },
          { h: 'Databricks-to-Databricks', d: 'Between Databricks accounts it uses identity (no token juggling) and supports more features.' },
        ],
      },
      deUseCase: {
        lead: 'Delta Sharing distributes governed data products: share a Gold table with a partner, another business unit, or an external analytics team live and read-only, without building a bespoke export pipeline or duplicating data.',
        bullets: [
          { h: 'Data products', d: 'Publish a curated Gold table as a share to downstream consumers.' },
          { h: 'Cross-org analytics', d: 'A partner reads the shared table from their own tools, always current.' },
        ],
      },
      integrations: [
        { id: 'unity-catalog', label: 'Unity Catalog', note: 'defines shares & recipients' },
        { id: 'delta-lake', label: 'Delta Lake', note: 'the shared tables' },
        { id: 'databricks-sql', label: 'Databricks SQL', note: 'query shared data' },
      ],
      runtime: {
        lead: 'Recipients read directly from the provider’s cloud storage via signed URLs, so throughput is object-storage speed and the provider pays egress. Tokens/URLs are short-lived; access is logged and revocable at any time.',
        bullets: [
          { h: 'Egress ownership', d: 'The provider’s storage serves the bytes, so cross-region/cloud reads incur egress on the provider side.' },
          { h: 'Short-lived credentials', d: 'Signed URLs expire quickly, limiting exposure if leaked.' },
        ],
      },
      interview: [
        { q: 'What is Delta Sharing and what makes it different from exporting data?', a: 'Delta Sharing is an open protocol for sharing live Delta tables without copying them. Recipients — using Databricks or open-source clients like pandas/Spark — read the provider’s data in place via short-lived signed URLs, governed and revocable through Unity Catalog. Unlike FTP/exports, there is no duplication or staleness, it works across clouds and platforms, and access is centrally audited and can be revoked instantly.' },
        { q: 'How is access secured in Delta Sharing?', a: 'The provider defines shares and recipients in Unity Catalog. A sharing server authorizes each request (via a bearer token for open sharing, or identity for Databricks-to-Databricks) and returns short-lived signed URLs to the underlying files — so storage credentials are never exposed. All access is logged and the share can be revoked at any time, keeping the provider in control.' },
      ],
    },
  ];

  TV.DatabricksServices = DATABRICKS_SERVICES;
})();
