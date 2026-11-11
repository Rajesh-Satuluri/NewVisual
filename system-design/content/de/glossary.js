// ── DE Glossary ───────────────────────────────────────────────────────────────
// Every key data-engineering term in one line, grouped by theme. `see` optionally
// links to a built DE concept id (rendered as a chip that routes to #c:<id>).

export const GLOSSARY_GROUPS = [
  'Storage & formats',
  'Modeling & warehousing',
  'Ingestion & CDC',
  'Batch & transformation',
  'Streaming & events',
  'Orchestration & reliability',
  'Governance, quality & cost',
];

export const GLOSSARY = [
  // ── Storage & formats ─────────────────────────────────────────────────────────
  { term: 'Data lake', group: 'Storage & formats', def: 'Cheap object storage that holds raw data of any shape (structured, semi-, unstructured) in open files, decoupled from the compute that reads it.', see: 'data-lake' },
  { term: 'Data warehouse', group: 'Storage & formats', def: 'A system optimized for structured analytical queries (OLAP) — columnar storage, SQL, and governance over curated, modeled data.', see: 'warehouse-design' },
  { term: 'Lakehouse', group: 'Storage & formats', def: 'A lake with warehouse features bolted on via a table format — ACID transactions, schema, and governance over open files in one store.', see: 'table-formats' },
  { term: 'Columnar format (Parquet/ORC)', group: 'Storage & formats', def: 'Stores values column-by-column so analytical scans read only the columns they need and compress far better than row storage.', see: 'file-formats' },
  { term: 'Row format (Avro)', group: 'Storage & formats', def: 'Stores whole records together — efficient for writes and streaming/serialization where you read entire rows, not a few columns.', see: 'file-formats' },
  { term: 'Table format (Delta/Iceberg/Hudi)', group: 'Storage & formats', def: 'A metadata layer over data files giving ACID transactions, time travel, schema evolution, and row-level updates/deletes on a lake.', see: 'table-formats' },
  { term: 'Partitioning', group: 'Storage & formats', def: 'Splitting a table’s files into folders by a column’s value so queries that filter on it skip (prune) non-matching data.', see: 'partitioning-bucketing' },
  { term: 'Bucketing / clustering', group: 'Storage & formats', def: 'Hashing or sorting rows into a fixed set of files within a partition so joins and filters on that key read fewer files.', see: 'partitioning-bucketing' },
  { term: 'Partition pruning', group: 'Storage & formats', def: 'The engine skipping entire partitions whose values can’t match the query filter — the main payoff of good partitioning.', see: 'partitioning-bucketing' },
  { term: 'Small-files problem', group: 'Storage & formats', def: 'Thousands of tiny files (from streaming or over-partitioning) that slow scans and metadata ops; fixed by compaction.', see: 'small-file-compaction' },
  { term: 'Compaction', group: 'Storage & formats', def: 'Rewriting many small files into fewer large ones (~128MB–1GB) to restore scan performance.', see: 'small-file-compaction' },
  { term: 'Z-ordering', group: 'Storage & formats', def: 'Co-locating rows with similar multi-column values so min/max file stats let queries skip more files on several filters at once.', see: 'small-file-compaction' },
  { term: 'Time travel', group: 'Storage & formats', def: 'Querying a table as of a past version or timestamp, enabled by a table format keeping a transaction log of snapshots.', see: 'table-formats' },
  { term: 'Schema-on-read', group: 'Storage & formats', def: 'Storing raw data as-is and applying structure when you query it — flexible lake pattern, versus schema-on-write in a warehouse.', see: 'data-lake' },

  // ── Modeling & warehousing ────────────────────────────────────────────────────
  { term: 'OLTP vs OLAP', group: 'Modeling & warehousing', def: 'OLTP = many small transactions (row store); OLAP = big scans and aggregations (columnar). You model and store them differently.', see: 'oltp-vs-olap' },
  { term: 'Star schema', group: 'Modeling & warehousing', def: 'A central fact table joined to denormalized dimension tables — simple joins and fast aggregations for BI.', see: 'warehouse-design' },
  { term: 'Snowflake schema', group: 'Modeling & warehousing', def: 'A star schema whose dimensions are further normalized into sub-tables — less redundancy, more joins.', see: 'warehouse-design' },
  { term: 'Fact table', group: 'Modeling & warehousing', def: 'Stores measurements/events (sales, clicks) at a defined grain, with foreign keys to dimensions and numeric measures.', see: 'warehouse-design' },
  { term: 'Dimension table', group: 'Modeling & warehousing', def: 'Describes the entities a fact refers to (customer, product, date) with descriptive attributes used to slice and filter.', see: 'warehouse-design' },
  { term: 'Grain', group: 'Modeling & warehousing', def: 'The exact level of detail one fact row represents (one order line, one daily balance). Defining it first prevents double-counting.', see: 'warehouse-design' },
  { term: 'Slowly changing dimension (SCD)', group: 'Modeling & warehousing', def: 'How a dimension handles attribute changes: Type 1 overwrites; Type 2 adds a versioned row with validity dates to keep history.', see: 'warehouse-design' },
  { term: 'Surrogate key', group: 'Modeling & warehousing', def: 'A system-generated key (usually an integer) used for joins and SCD history, independent of the changeable business key.', see: 'warehouse-design' },
  { term: 'Medallion architecture', group: 'Modeling & warehousing', def: 'Layering data as bronze (raw) → silver (cleaned/conformed) → gold (business-ready), each rebuildable from the layer before.', see: 'medallion-architecture' },
  { term: 'Normalization / denormalization', group: 'Modeling & warehousing', def: 'Normalize to remove redundancy (OLTP); denormalize to pre-join for fast reads (OLAP). The read/write trade-off.', see: 'oltp-vs-olap' },
  { term: 'One Big Table (OBT)', group: 'Modeling & warehousing', def: 'A wide, fully denormalized table for a specific fast query path, trading storage duplication for zero join cost.', see: 'warehouse-design' },

  // ── Ingestion & CDC ───────────────────────────────────────────────────────────
  { term: 'Change Data Capture (CDC)', group: 'Ingestion & CDC', def: 'Capturing row-level inserts/updates/deletes from a source’s transaction log so you sync only what changed.', see: 'cdc-pipeline' },
  { term: 'Write-ahead log (WAL/binlog)', group: 'Ingestion & CDC', def: 'The database’s ordered log of committed changes; the complete, cheap source CDC reads from — including deletes.', see: 'cdc-pipeline' },
  { term: 'Log sequence number (LSN/SCN)', group: 'Ingestion & CDC', def: 'A monotonic position in the transaction log used to pin a snapshot and resume the change stream without gaps.', see: 'cdc-pipeline' },
  { term: 'Snapshot + stream', group: 'Ingestion & CDC', def: 'Load the whole table once at a known log offset, then stream changes from that exact point so nothing is missed or duplicated.', see: 'cdc-pipeline' },
  { term: 'Tombstone', group: 'Ingestion & CDC', def: 'A marker representing a deleted row, propagated downstream so consumers see the deletion instead of a silently vanished row.', see: 'cdc-pipeline' },
  { term: 'Landing / raw zone', group: 'Ingestion & CDC', def: 'Immutable, append-only storage of ingested data exactly as received, so you can always replay from the source of truth.', see: 'data-lake' },
  { term: 'Backfill', group: 'Ingestion & CDC', def: 'Reprocessing historical data through a pipeline, typically chunked by partition and made idempotent so reruns are safe.', see: 'incremental-vs-full' },
  { term: 'High-water mark', group: 'Ingestion & CDC', def: 'The last-processed timestamp/id a pipeline records so the next incremental run picks up only newer data.', see: 'incremental-vs-full' },
  { term: 'Schema drift', group: 'Ingestion & CDC', def: 'Unexpected changes in a source’s schema; handled by evolving additively and quarantining breaking changes.', see: 'data-quality' },

  // ── Batch & transformation ────────────────────────────────────────────────────
  { term: 'ETL vs ELT', group: 'Batch & transformation', def: 'ETL transforms before loading; ELT loads raw then transforms in a powerful warehouse/lake — the modern default with elastic compute.', see: 'etl-vs-elt' },
  { term: 'Incremental vs full load', group: 'Batch & transformation', def: 'Process only new/changed data (cheap, scales with change) versus reloading everything (simple but costly at scale).', see: 'incremental-vs-full' },
  { term: 'Idempotent pipeline', group: 'Batch & transformation', def: 'A pipeline where re-running a step yields the same result as running it once — via overwrite-by-partition or MERGE.', see: 'idempotent-pipelines' },
  { term: 'MERGE / upsert', group: 'Batch & transformation', def: 'Insert new keys and update existing ones in one operation, making re-applying the same rows a no-op.', see: 'idempotent-pipelines' },
  { term: 'Shuffle', group: 'Batch & transformation', def: 'Redistributing data across the cluster by key for joins/aggregations — the expensive, network-heavy part of a Spark job.', see: 'spark-shuffle' },
  { term: 'Data skew', group: 'Batch & transformation', def: 'A few keys holding most of the data, overloading one task; fixed by salting, splitting, or skew-aware joins.', see: 'spark-shuffle' },
  { term: 'Broadcast join', group: 'Batch & transformation', def: 'Copying a small table to every node so a join needs no shuffle — the fast path when one side is small.', see: 'join-strategies' },
  { term: 'Shuffle-sort-merge join', group: 'Batch & transformation', def: 'Both sides partitioned and sorted by the join key across the cluster — used when both tables are large.', see: 'join-strategies' },
  { term: 'Spill', group: 'Batch & transformation', def: 'When a task’s data exceeds memory and overflows to disk, slowing the job — a sign of too-large partitions or skew.', see: 'spark-shuffle' },
  { term: 'Staging + atomic publish', group: 'Batch & transformation', def: 'Writing output to a temp location and swapping it in only on success, so readers never see partial/corrupt state.', see: 'idempotent-pipelines' },

  // ── Streaming & events ────────────────────────────────────────────────────────
  { term: 'Kafka topic / partition', group: 'Streaming & events', def: 'An append-only log split into partitions for parallelism; records with the same key go to the same partition, preserving order.', see: 'kafka-architecture' },
  { term: 'Consumer group / offset', group: 'Streaming & events', def: 'Consumers share partitions of a topic and track their position (offset); resetting offsets replays from the past.', see: 'kafka-architecture' },
  { term: 'Consumer lag', group: 'Streaming & events', def: 'How far behind the latest message a consumer is — the key streaming SLI; persistent lag means scale out.', see: 'pipeline-monitoring' },
  { term: 'Event time vs processing time', group: 'Streaming & events', def: 'When an event happened versus when it was processed; windowing on event time needs watermarks for late data.', see: 'windowing' },
  { term: 'Tumbling / sliding / session window', group: 'Streaming & events', def: 'Fixed non-overlapping, overlapping moving, and activity-gap windows — chosen by the aggregation question you ask.', see: 'windowing' },
  { term: 'Watermark', group: 'Streaming & events', def: 'An estimate of event-time progress that decides when a window is complete and how long to wait for late events.', see: 'watermarking' },
  { term: 'Delivery semantics', group: 'Streaming & events', def: 'At-most-once (may lose), at-least-once (may duplicate), exactly-once (reflected once) — matched to the cost of a duplicate.', see: 'delivery-guarantees' },
  { term: 'Exactly-once effect', group: 'Streaming & events', def: 'At-least-once delivery plus an idempotent/dedup sink, giving correct results more cheaply than true end-to-end exactly-once.', see: 'delivery-guarantees' },
  { term: 'Event-driven architecture', group: 'Streaming & events', def: 'Producers emit events to a log and consumers react independently — decoupling, buffering, and replayability.', see: 'event-driven' },
  { term: 'Stream-table (temporal) join', group: 'Streaming & events', def: 'Enriching a stream with a dimension as of event time, cached locally and refreshed on change.', see: 'event-driven' },

  // ── Orchestration & reliability ───────────────────────────────────────────────
  { term: 'DAG', group: 'Orchestration & reliability', def: 'A directed acyclic graph of tasks wired by dependencies, expressing the order a pipeline must run in.', see: 'orchestration-dag' },
  { term: 'Orchestrator (Airflow/Dagster)', group: 'Orchestration & reliability', def: 'The system that schedules, runs, retries, and monitors pipeline tasks and their dependencies.', see: 'orchestration-dag' },
  { term: 'Sensor / dataset trigger', group: 'Orchestration & reliability', def: 'Starting work when data actually arrives rather than at a fixed clock time — more timely and resilient.', see: 'orchestration-dag' },
  { term: 'Logical / execution date', group: 'Orchestration & reliability', def: 'The date partition a run processes (not wall-clock now()), making runs deterministic and backfills reproducible.', see: 'idempotent-pipelines' },
  { term: 'Retry with backoff', group: 'Orchestration & reliability', def: 'Re-attempting a failed task after increasing delays to ride out transient errors without hammering the source.', see: 'pipeline-monitoring' },
  { term: 'Data freshness SLA', group: 'Orchestration & reliability', def: 'A promise of how recent a dataset is; monitored as an SLI so consumers know when data is late.', see: 'pipeline-monitoring' },
  { term: 'Dead-letter / quarantine', group: 'Orchestration & reliability', def: 'A side table for records that fail validation, so good data proceeds and bad data is reviewed and replayed.', see: 'data-quality' },

  // ── Governance, quality & cost ────────────────────────────────────────────────
  { term: 'Data lineage', group: 'Governance, quality & cost', def: 'The traceable path of data from source to output at table and column level — essential for impact analysis and trust.', see: 'governance-lineage' },
  { term: 'Data catalog', group: 'Governance, quality & cost', def: 'A searchable inventory of datasets with ownership, descriptions, schema, and freshness so people can find and trust data.', see: 'governance-lineage' },
  { term: 'Data contract', group: 'Governance, quality & cost', def: 'An agreed, enforced schema and quality expectation between a data producer and its consumers.', see: 'data-quality' },
  { term: 'Data quality check', group: 'Governance, quality & cost', def: 'An assertion (not-null, unique, range, referential) run in the pipeline to catch bad data before it spreads.', see: 'data-quality' },
  { term: 'Reconciliation', group: 'Governance, quality & cost', def: 'Comparing counts/totals between source and target to catch silent data loss or duplication.', see: 'reconciliation-dedup' },
  { term: 'RBAC / ABAC', group: 'Governance, quality & cost', def: 'Granting access by role or by attribute, enforced centrally with least privilege so access is consistent and auditable.', see: 'security-iam' },
  { term: 'PII masking / tokenization', group: 'Governance, quality & cost', def: 'Hiding or replacing sensitive identifiers so analytics run without exposing real personal data.', see: 'security-iam' },
  { term: 'Crypto-shredding', group: 'Governance, quality & cost', def: 'Deleting a subject’s encryption key to render their data unreadable — a way to honor erasure in immutable storage.', see: 'security-iam' },
  { term: 'Storage tiering', group: 'Governance, quality & cost', def: 'Keeping hot data on fast storage and aging cold data to cheaper tiers by access pattern to cut cost.', see: 'cost-optimization' },
  { term: 'Separation of storage & compute', group: 'Governance, quality & cost', def: 'Scaling query compute independently of stored data so you pay for each separately and elastically.', see: 'cost-optimization' },
  { term: 'Chargeback', group: 'Governance, quality & cost', def: 'Attributing platform cost to teams via resource/query tagging so usage is visible and owned.', see: 'cost-optimization' },
];
