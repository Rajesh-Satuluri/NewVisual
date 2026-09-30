import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Operations',
    title: 'Interview Q&A',
    subtitle: 'Senior / staff level Databricks & Lakehouse interview prep',
    tabs: [
      { id: 'systems',  label: '🏗️ System Design' },
      { id: 'deep',     label: '🔬 Deep Dives' },
      { id: 'tradeoff', label: '⚖️ Trade-offs' },
    ]
  });

  container.querySelector('#tab-systems').innerHTML = createIQSection([
    {
      q: 'Design a real-time order analytics system for Amazon using Databricks.',
      a: 'Ingestion: Kafka → Auto Loader reads new Avro files from S3 landing zone into Bronze Delta table (orders_raw) within 30s of arrival. Bronze: append-only, schema-as-is, partition by date. Silver: Structured Streaming job (trigger: 1 min) MERGE INTO orders_silver on order_id — deduplicates, enriches with product/customer dims from Unity Catalog tables. Gold: nightly Workflow job aggregates Silver into orders_gold_hourly (GMV by category/hour), OPTIMIZED with ZORDER BY (order_date, category_id) for Photon SQL queries. BI layer: SQL Warehouse (Photon-enabled) serves Tableau dashboards from Gold — auto-suspends when idle. SLA: Bronze <1min latency, Silver <5min, Gold <6hr. Monitoring: job alerts via PagerDuty webhook, data quality checks via Delta constraints.'
    },
    {
      q: 'How would you migrate 500TB of Hive/HDFS tables to Databricks Lakehouse without downtime?',
      a: 'Phase 1 — Assessment: catalog all Hive tables (schema, size, query patterns, SLA). Classify: hot tables (queried daily) vs cold (archive). Phase 2 — Shadow copy: use CONVERT TO DELTA or distcp to copy Parquet files to S3 + Delta log bootstrap. For hot tables, set up Structured Streaming from HDFS to Delta (dual-write). Phase 3 — Cutover: freeze writes to HDFS table → verify row counts match → register Delta table in Unity Catalog → redirect downstream jobs to new table. Use Delta\'s RESTORE if a cutover goes wrong — roll back to a known snapshot. Phase 4 — Decommission: run VACUUM on old HDFS paths after 30-day stabilization. Key risk: Hive SerDe formats (ORC, custom) — convert to Parquet first. Never attempt big-bang cutover; table-by-table migration with validation is safer.'
    },
  ]);

  container.querySelector('#tab-deep').innerHTML = createIQSection([
    {
      q: 'Walk me through what happens internally when you run MERGE INTO on a Delta table.',
      a: 'MERGE INTO target USING source ON condition WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT: (1) Spark reads the Delta log to determine the current snapshot — which Parquet files are active. (2) Source is computed (broadcast if small, otherwise hash-partitioned). (3) Delta finds candidate files by checking min/max statistics in the log — files whose ranges overlap the join condition. Only candidate files are read. (4) For each candidate file: rows matching the WHEN MATCHED condition are updated (written to a new Parquet file); rows not in source are passed through; new rows from source are appended. (5) Old candidate files are marked as "remove" in the new commit file; new files are marked "add". (6) Delta writes the commit atomically to _delta_log. If another writer commits concurrently on overlapping files, this MERGE gets a conflict exception and retries from step 1.'
    },
    {
      q: 'Explain how Photon\'s vectorized hash aggregation outperforms Spark\'s Tungsten sort-based aggregation.',
      a: 'Tungsten (JVM): builds a hash map of aggregation states using off-heap memory. Each row is processed one at a time through a JVM method dispatch chain — even with bytecode generation, each row involves JVM overhead (null checks, boxing/unboxing for numeric types). Photon (C++): processes rows in 1,024-row column batches. For a COUNT/SUM aggregation, the inner loop is a tight C++ loop with SIMD vectorization: 8 int64 values summed in one AVX-512 instruction. The hash map is cache-line aligned — key lookups hit L1/L2 cache far more often than Tungsten\'s random-access patterns. For cardinality <1M groups (typical BI aggregation), Photon\'s hash table fits entirely in CPU cache. Result: 3–8× faster for GROUP BY on numeric/string columns — the most common BI query pattern.'
    },
    {
      q: 'How does Delta Lake\'s time travel work at the file level?',
      a: 'Every Delta commit adds a JSON file to _delta_log/ listing "add" (new Parquet files) and "remove" (obsoleted Parquet files with deletionTimestamp). Time travel (VERSION AS OF 5 or TIMESTAMP AS OF \'2024-01-15\') reconstructs the snapshot at that point by replaying the log up to the target version/timestamp: only "add" entries that were not "removed" before the target time are included. The underlying Parquet files are never deleted — only the log entry changes. VACUUM removes Parquet files whose deletionTimestamp is older than the retention period (default 7 days). After VACUUM, time travel to before the vacuum period fails with FileNotFoundException. Key: the transaction log is the source of truth; Parquet files are immutable data that multiple snapshot versions can reference simultaneously.'
    },
  ]);

  container.querySelector('#tab-tradeoff').innerHTML = createIQSection([
    {
      q: 'Delta Lake vs Apache Iceberg vs Apache Hudi — how do you choose?',
      a: 'Delta Lake: best on Databricks (Photon acceleration, Unity Catalog, DLT first-class support). Open format since 2022 (any engine can read). Strongest ecosystem for Spark-heavy shops. Iceberg: better multi-engine story (Trino, Spark, Flink, Dremio, Snowflake all support it natively). Hidden partitioning and partition evolution are cleaner. Preferred at companies running heterogeneous query engines. Hudi: optimized for incremental record-level upserts with Bloom filter indexes — best for CDC (Change Data Capture) pipelines ingesting MySQL/Postgres binlogs. Copy-on-write vs merge-on-read modes. Tiebreaker: if you\'re on Databricks and use Spark primarily → Delta. If you run Trino or Flink as primary engine → Iceberg. If you need sub-minute CDC upserts at scale → Hudi.'
    },
    {
      q: 'When would you choose Delta Live Tables (DLT) over writing custom Spark streaming jobs?',
      a: 'DLT: declarative pipeline definition (LIVE TABLE, STREAMING LIVE TABLE), built-in quality constraints (EXPECT), automatic dependency resolution and retry, lineage tracking in Unity Catalog, development vs production mode, auto-scaling. Choose DLT when: building Medallion pipelines where data quality enforcement (EXPECT) is a requirement; team includes SQL-only analysts who can\'t write PySpark; you want automatic lineage without custom instrumentation. Choose custom Spark streaming when: you need fine-grained control over checkpoint locations, trigger intervals, and foreachBatch logic; you\'re integrating with non-Delta sinks (HBase, Cassandra, custom APIs); you have complex branching logic that doesn\'t map to DLT\'s DAG model; you need to pass task values between streaming stages in a Workflow. DLT\'s constraints and lineage are worth the reduced flexibility for most Medallion ETL pipelines.'
    },
    {
      q: 'Databricks SQL Warehouse vs All-Purpose Cluster for BI queries — which and why?',
      a: 'SQL Warehouse (Photon): auto-suspend when idle (zero cost when not queried), scales to multiple clusters automatically (multi-cluster), optimized for concurrent BI users, Photon-only (every query benefits), built-in query caching, serverless option available. All-purpose cluster: flexible (run notebooks, Python scripts, ML alongside SQL), persistent (no cold start), billed continuously. For BI dashboards: always use SQL Warehouse. For exploratory analysis: all-purpose with auto-termination. Hybrid pattern: SQL Warehouse for Tableau/Power BI reports (many concurrent users, bursty), + a shared all-purpose cluster for data team exploration (1–5 heavy users). Never send BI tool traffic to an all-purpose cluster — concurrent user auto-scaling doesn\'t work and cost is always-on.'
    },
  ]);
}
