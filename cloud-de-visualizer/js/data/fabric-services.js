/* ============================================================
   Cloud DE Visualizer — Microsoft Fabric service pages (C9).
   Fabric-first content for the active DP-700 certification (OneLake,
   Lakehouse, Warehouse, Dataflow Gen2, Pipelines, Spark notebooks,
   Eventstream, Eventhouse/KQL). Same object shape as the other cloud
   service catalogues, so the generic ServiceDetail renderer drives it.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.FabricServices = [
    {
      id: 'onelake', name: 'OneLake', category: 'storage', aka: 'The “OneDrive for data”',
      tagline: 'A single, tenant-wide logical data lake that every Fabric workload reads and writes — one copy, open Delta/Parquet format.',
      keyFacts: [{ k: 'Model', v: 'One logical lake per tenant' }, { k: 'Format', v: 'Delta Parquet (open)' }, { k: 'Access', v: 'Shortcuts (no copy)' }],
      what: { lead: 'OneLake is the one, unified storage layer under all of Fabric — automatically provisioned for the tenant, organized into workspaces and items.', bullets: [{ h: 'One copy', d: 'Every engine (Spark, SQL, KQL, Power BI) reads the same Delta tables in OneLake — no per-tool copies.' }, { h: 'Shortcuts', d: 'Reference data that lives in ADLS Gen2, S3 or another workspace in place, with no duplication.' }] },
      why: { lead: 'Enterprises drowned in copies of the same data across tools. OneLake makes storage a single governed surface so compute engines compose instead of duplicating.', bullets: [{ h: 'Kills copy sprawl', d: 'Shortcuts + open Delta mean one source of truth, always fresh.' }] },
      how: { lead: 'OneLake is built on ADLS Gen2 semantics; items (Lakehouses, Warehouses) expose their tables as Delta under the item’s folder.', bullets: [{ h: 'Open format', d: 'Tables are Delta Parquet, readable by any Delta client.' }], code: { lang: 'text', text: 'abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>.Lakehouse/Tables/<table>' } },
      deUseCase: { lead: 'Land raw data once in OneLake; Lakehouse Spark jobs refine it to Delta; Warehouse and Power BI read the same tables — no ETL-to-copy between tools.', bullets: [{ h: 'Shortcuts (no copy)', d: 'A shortcut is a pointer to data living in ADLS Gen2, S3, Google Cloud Storage or another Fabric workspace — it appears as a table/folder in your item but the bytes never move, so it stays fresh and is never duplicated. Internal shortcuts also let items share data across workspaces.' }, { h: 'Shortcut vs Mirroring', d: 'Shortcut = reference a file/table in place; Mirroring = continuously replicate an operational database into OneLake Delta. Reach for a copy only when you truly need a physical, independent duplicate.' }] },
      integrations: [{ id: 'fabric-lakehouse', label: 'Lakehouse', note: 'Spark + files', format: 'fabric' }, { id: 'fabric-warehouse', label: 'Warehouse', note: 'T-SQL', format: 'fabric' }, { id: 'fabric-mirroring', label: 'Mirroring', note: 'Replicate DBs in', format: 'fabric' }, { id: 'adls-gen2', label: 'ADLS Gen2', note: 'Shortcut source', format: 'azure' }],
      runtime: { lead: 'Storage is decoupled from compute; access is governed by workspace roles plus two finer gates — OneLake data-access roles and Microsoft Purview sensitivity labels.', bullets: [
        { h: 'Workspace roles', d: 'Admin / Member / Contributor / Viewer set the coarse, item-wide access a principal has in a workspace.' },
        { h: 'OneLake data-access roles', d: 'RBAC *below* the workspace role: grant read on specific folders within a Lakehouse (e.g. only Tables/sales/) so a user sees a subset of an item, not all of it — the fine-grained read control DP-700 tests.' },
        { h: 'Sensitivity labels', d: 'Microsoft Purview information-protection labels (e.g. Confidential) applied to Fabric items flow with the data — into downstream items and Power BI exports — carrying encryption and usage policy end-to-end, with label activity in the audit logs.' },
      ] },
      interview: [
        { q: 'What problem does OneLake solve?', a: 'Copy sprawl: one tenant-wide logical lake in open Delta format that every Fabric engine shares, with shortcuts to avoid duplicating external data.' },
        { q: 'How do shortcuts differ from copying (and from mirroring)?', a: 'A shortcut references data in place (ADLS/S3/GCS/another workspace) so it stays fresh and is never duplicated; a copy physically duplicates and drifts. Mirroring sits between them: it continuously replicates an external operational database into OneLake Delta so you get a local, query-optimized copy that stays in sync.' },
        { q: 'How do you give a user access to only part of a Lakehouse?', a: 'Keep their workspace role minimal and use a OneLake data-access role scoped to just the folders they need (e.g. Tables/sales/). The workspace role sets coarse access; the data-access role restricts reads to a subset of the item. For information protection, apply Purview sensitivity labels so classification and encryption follow the data.' },
      ],
    },
    {
      id: 'fabric-lakehouse', name: 'Fabric Lakehouse', category: 'analytics', aka: 'Spark + files + Delta on OneLake',
      tagline: 'A Fabric item that combines a files area and Delta tables on OneLake, worked with Spark notebooks and queried by a built-in SQL analytics endpoint.',
      keyFacts: [{ k: 'Compute', v: 'Spark notebooks' }, { k: 'Tables', v: 'Delta on OneLake' }, { k: 'Query', v: 'SQL analytics endpoint' }],
      what: { lead: 'The Lakehouse is the open, Spark-centric home for data engineering in Fabric: a Files section for raw/unstructured data and a Tables section of Delta tables.', bullets: [{ h: 'Medallion', d: 'Build Bronze/Silver/Gold Delta tables with notebooks or pipelines.' }, { h: 'SQL endpoint', d: 'Every Lakehouse exposes a read-only T-SQL endpoint over its Delta tables.' }] },
      why: { lead: 'Teams want Spark flexibility and SQL serving over the same open data. The Lakehouse gives both over OneLake without copying.', bullets: [{ h: 'Open + flexible', d: 'Delta tables, Spark, Python/SQL — plus Power BI Direct Lake.' }] },
      how: { lead: 'Notebooks run Spark against the Lakehouse; writes land as Delta in OneLake; the SQL endpoint and Direct Lake read them with no import.', bullets: [{ h: 'Direct Lake', d: 'Power BI reads Delta directly — no import or DirectQuery round-trips.' }], code: { lang: 'python', text: 'df = spark.read.format("delta").load("Tables/bronze_orders")\ndf.write.mode("overwrite").saveAsTable("silver_orders")' } },
      deUseCase: { lead: 'Primary DP-700 ingestion/transformation surface: Auto-resolve schema, clean with PySpark, write Delta, serve to Warehouse/Power BI.', bullets: [{ h: 'vs Warehouse', d: 'Lakehouse = Spark/open files; Warehouse = full T-SQL DML.' }] },
      integrations: [{ id: 'onelake', label: 'OneLake', note: 'Storage', format: 'fabric' }, { id: 'fabric-spark', label: 'Spark notebooks', note: 'Compute', format: 'fabric' }, { id: 'fabric-warehouse', label: 'Warehouse', note: 'T-SQL serving', format: 'fabric' }],
      runtime: { lead: 'Spark pools run notebooks; the SQL endpoint is read-only; Delta OPTIMIZE/V-Order improves read performance.', bullets: [{ h: 'V-Order', d: 'Fabric’s Delta write optimization for fast Power BI/SQL reads.' }] },
      interview: [{ q: 'Lakehouse vs Warehouse in Fabric?', a: 'Lakehouse is Spark + open Delta files with a read-only SQL endpoint; Warehouse is a full T-SQL engine with DML. Both sit on OneLake; choose by whether you need Spark/open files or T-SQL writes.' }],
    },
    {
      id: 'fabric-warehouse', name: 'Fabric Warehouse', category: 'analytics', aka: 'Full T-SQL warehouse on OneLake',
      tagline: 'A fully transactional T-SQL data warehouse that stores its tables as Delta in OneLake — SQL-first, with full DML and multi-table transactions.',
      keyFacts: [{ k: 'Language', v: 'T-SQL (full DML)' }, { k: 'Storage', v: 'Delta on OneLake' }, { k: 'Compute', v: 'Serverless, autoscaling' }],
      what: { lead: 'The Warehouse is Fabric’s SQL-native analytics store: create tables, INSERT/UPDATE/DELETE, and run multi-table transactions, all in T-SQL.', bullets: [{ h: 'Open under the hood', d: 'Data persists as Delta in OneLake, readable by Spark too.' }, { h: 'Full DML', d: 'Unlike the Lakehouse SQL endpoint, the Warehouse supports writes.' }] },
      why: { lead: 'SQL teams want a familiar T-SQL warehouse without giving up the open lake. Fabric Warehouse delivers both.', bullets: [{ h: 'Best of both', d: 'T-SQL productivity + open Delta interop.' }] },
      how: { lead: 'A distributed query engine over OneLake Delta; cross-warehouse/Lakehouse queries work within a workspace.', bullets: [{ h: 'Cross-item queries', d: 'Join Warehouse and Lakehouse tables in one T-SQL query.' }], code: { lang: 'sql', text: 'CREATE TABLE gold.sales AS\nSELECT region, SUM(amount) amt FROM silver.orders GROUP BY region;' } },
      deUseCase: { lead: 'Serve modeled marts to BI with T-SQL; use for workloads needing UPDATE/DELETE/transactions that the Lakehouse endpoint can’t do.', bullets: [{ h: 'Choose for', d: 'T-SQL DML, stored procs, high-concurrency BI.' }] },
      integrations: [{ id: 'onelake', label: 'OneLake', format: 'fabric' }, { id: 'fabric-lakehouse', label: 'Lakehouse', note: 'Cross-query', format: 'fabric' }],
      runtime: { lead: 'Serverless compute autoscales; statistics + result-set caching aid performance.', bullets: [{ h: 'Optimize', d: 'Good table design + statistics; avoid unnecessary data movement.' }] },
      interview: [{ q: 'When Warehouse over Lakehouse?', a: 'When you need full T-SQL DML (UPDATE/DELETE), multi-table transactions, stored procedures, or a SQL-first team — while still storing open Delta on OneLake.' }],
    },
    {
      id: 'dataflow-gen2', name: 'Dataflow Gen2', category: 'ingest-etl', aka: 'Low-code Power Query ETL',
      tagline: 'Visual, low-code data preparation built on Power Query — connect, transform with a rich transform library, and land results in OneLake.',
      keyFacts: [{ k: 'Style', v: 'Low-code (Power Query M)' }, { k: 'Connectors', v: '150+' }, { k: 'Output', v: 'Lakehouse / Warehouse' }],
      what: { lead: 'Dataflow Gen2 is Fabric’s low-code transformation tool: build queries in the Power Query editor and set a data destination.', bullets: [{ h: 'Rich transforms', d: 'Merge, pivot, dedup, type-handling without code.' }, { h: 'Destinations', d: 'Write to Lakehouse, Warehouse or KQL.' }] },
      why: { lead: 'Analysts and citizen developers need ETL without Spark/SQL. Dataflow Gen2 gives a visual path into the lake.', bullets: [{ h: 'Accessibility', d: 'Power Query skills transfer straight from Excel/Power BI.' }] },
      how: { lead: 'Power Query (M) steps run on managed compute; the dataflow writes to the configured destination on a schedule or pipeline trigger.', bullets: [{ h: 'Reusable', d: 'Outputs become tables other items consume.' }] },
      deUseCase: { lead: 'DP-700 contrasts Dataflow Gen2 (low-code transform) with pipelines (orchestration/movement) and notebooks (code-first).', bullets: [{ h: 'Pick it for', d: 'Low-code cleansing/shaping; not heavy orchestration.' }] },
      integrations: [{ id: 'fabric-data-pipelines', label: 'Pipelines', note: 'Orchestrate', format: 'fabric' }, { id: 'fabric-lakehouse', label: 'Lakehouse', note: 'Destination', format: 'fabric' }],
      runtime: { lead: 'Managed compute; staging in OneLake; refreshes scheduled or pipeline-invoked.', bullets: [{ h: 'Monitor', d: 'Refresh history + errors in the monitoring hub.' }] },
      interview: [{ q: 'Dataflow Gen2 vs pipeline vs notebook?', a: 'Dataflow Gen2 = low-code Power Query transforms; pipeline = orchestration + data movement/control flow; notebook = code-first Spark. DP-700 tests choosing the right one per task.' }],
    },
    {
      id: 'fabric-data-pipelines', name: 'Fabric Data Pipelines', category: 'orchestration', aka: 'ADF-style orchestration in Fabric',
      tagline: 'Data Factory pipelines inside Fabric — copy activities, control flow, parameters and triggers to orchestrate dataflows, notebooks and more.',
      keyFacts: [{ k: 'Role', v: 'Orchestration + movement' }, { k: 'Triggers', v: 'Schedule / event' }, { k: 'Activities', v: 'Copy, notebook, dataflow…' }],
      what: { lead: 'Fabric pipelines orchestrate end-to-end flows: Copy data, run a notebook or Dataflow Gen2, branch on conditions, loop, and pass parameters.', bullets: [{ h: 'Control flow', d: 'If/ForEach/Until, dependencies and retries.' }, { h: 'Copy activity', d: 'High-throughput movement across 150+ connectors.' }] },
      why: { lead: 'You need to wire ingestion → transform → serve with schedules, triggers and error handling. Pipelines are that glue.', bullets: [{ h: 'Familiar', d: 'ADF concepts carry over directly.' }] },
      how: { lead: 'Pipelines run activities on managed compute; event triggers (e.g. file arrival) and schedules start runs; expressions parameterize them.', bullets: [{ h: 'Dynamic', d: 'Parameters + expressions for reusable pipelines.' }] },
      deUseCase: { lead: 'Orchestrate incremental loads: Copy new data → notebook MERGE → refresh model, with retries and alerts.', bullets: [{ h: 'Incremental', d: 'Watermark/high-water-mark patterns via parameters.' }] },
      integrations: [{ id: 'dataflow-gen2', label: 'Dataflow Gen2', format: 'fabric' }, { id: 'fabric-spark', label: 'Notebooks', format: 'fabric' }, { id: 'data-factory', label: 'Azure Data Factory', note: 'Sibling', format: 'azure' }],
      runtime: { lead: 'Managed; monitored in the monitoring hub with run history and retry.', bullets: [{ h: 'Errors', d: 'Inspect activity-level failures + configure retries.' }] },
      interview: [{ q: 'Incremental loading in Fabric?', a: 'Use a pipeline with a watermark parameter to copy only new/changed rows, then a notebook MERGE into the Delta table; schedule or event-trigger the pipeline.' }],
    },
    {
      id: 'fabric-spark', name: 'Fabric Spark Notebooks', category: 'compute', aka: 'PySpark/SQL on Fabric',
      tagline: 'Managed Apache Spark in Fabric notebooks — PySpark, Spark SQL and R over Lakehouse Delta tables, with fast-starting pools.',
      keyFacts: [{ k: 'Languages', v: 'PySpark, SQL, Scala, R' }, { k: 'Compute', v: 'Starter + custom pools' }, { k: 'Data', v: 'Lakehouse Delta' }],
      what: { lead: 'Notebooks are the code-first engineering surface: transform Lakehouse data with Spark, author streaming jobs, and build medallion pipelines.', bullets: [{ h: 'Fast start', d: 'Starter pools give near-instant Spark sessions.' }, { h: 'Delta-native', d: 'Read/write Lakehouse Delta tables directly.' }] },
      why: { lead: 'Complex transformations, ML and streaming need real code. Fabric Spark provides managed, scalable compute without cluster ops.', bullets: [{ h: 'Scale + control', d: 'Custom pools size compute to the job.' }] },
      how: { lead: 'Spark runs against OneLake; workspace Spark settings control pools, libraries and concurrency.', bullets: [{ h: 'Config', d: 'Spark workspace settings = pools, runtime, libraries.' }], code: { lang: 'python', text: 'from pyspark.sql.functions import col\n(df.filter(col("amount") > 0)\n   .write.mode("append").saveAsTable("silver_sales"))' } },
      deUseCase: { lead: 'Heavy cleansing, joins, SCD/MERGE, and Structured Streaming ingestion — the code-first half of DP-700.', bullets: [{ h: 'Optimize', d: 'Partitioning, OPTIMIZE/V-Order, right-sized pools.' }] },
      integrations: [{ id: 'fabric-lakehouse', label: 'Lakehouse', format: 'fabric' }, { id: 'structured-streaming', label: 'Structured Streaming', note: 'Same engine', format: 'databricks' }],
      runtime: { lead: 'Managed Spark pools; monitor via Spark UI + monitoring hub.', bullets: [{ h: 'Tune', d: 'Watch skew/spill in the Spark UI as on any Spark platform.' }] },
      interview: [{ q: 'When notebook over Dataflow Gen2?', a: 'When you need code-first control: complex transforms, joins, ML, Structured Streaming or custom logic beyond Power Query’s low-code transforms.' }],
    },
    {
      id: 'eventstream', name: 'Eventstream', category: 'streaming', aka: 'Low-code real-time ingestion',
      tagline: 'Fabric’s no/low-code way to capture, transform and route real-time events from sources to destinations like Eventhouse or Lakehouse.',
      keyFacts: [{ k: 'Style', v: 'Low-code' }, { k: 'Sources', v: 'Event Hubs, Kafka, IoT…' }, { k: 'Sinks', v: 'Eventhouse, Lakehouse' }],
      what: { lead: 'Eventstream ingests streaming events and routes them, with optional in-stream transforms, to real-time destinations — no code required.', bullets: [{ h: 'Connect', d: 'Azure Event Hubs, Kafka, sample/IoT sources.' }, { h: 'Route', d: 'Fan out to Eventhouse (KQL), Lakehouse, or an activator.' }] },
      why: { lead: 'Real-time Intelligence needs an easy on-ramp from brokers to analytics. Eventstream is that low-ops hot path.', bullets: [{ h: 'Low-ops', d: 'Visual pipeline vs writing a streaming app.' }] },
      how: { lead: 'A visual topology connects sources → optional transforms → destinations; it runs continuously.', bullets: [{ h: 'Transforms', d: 'Filter, aggregate, expand in-stream.' }] },
      deUseCase: { lead: 'Ingest device events → Eventhouse for KQL analytics and → Lakehouse for the cold path, in one low-code flow.', bullets: [{ h: 'vs Structured Streaming', d: 'Low-code routing vs code-first stateful processing.' }] },
      integrations: [{ id: 'eventhouse', label: 'Eventhouse (KQL)', format: 'fabric' }, { id: 'event-hubs', label: 'Azure Event Hubs', note: 'Source', format: 'azure' }],
      runtime: { lead: 'Managed, continuous; monitored for throughput and errors.', bullets: [{ h: 'Watch', d: 'Eventstream errors surface in the monitoring hub.' }] },
      interview: [{ q: 'Eventstream vs Spark Structured Streaming?', a: 'Eventstream is low-code real-time ingestion/routing; Structured Streaming is code-first stateful processing. Use Eventstream for easy capture/route, Spark for rich transforms.' }],
    },
    {
      id: 'eventhouse', name: 'Eventhouse (KQL)', category: 'analytics', aka: 'Real-time analytics DB (KQL)',
      tagline: 'A high-speed store and KQL query engine for time-series and log/telemetry data — the analytics heart of Fabric Real-Time Intelligence.',
      keyFacts: [{ k: 'Query', v: 'KQL (+ some T-SQL)' }, { k: 'Data', v: 'Time-series / logs / events' }, { k: 'Latency', v: 'Seconds, high ingest' }],
      what: { lead: 'An Eventhouse contains KQL databases optimized for fast ingestion and sub-second analytics over huge volumes of event/telemetry data.', bullets: [{ h: 'KQL', d: 'Kusto Query Language for time-series, patterns and aggregation.' }, { h: 'OneLake', d: 'Data is also available in OneLake for Spark/SQL.' }] },
      why: { lead: 'Dashboards and anomaly detection on live event data need a purpose-built engine. Eventhouse delivers seconds-fresh analytics at scale.', bullets: [{ h: 'Built for events', d: 'Columnar + time indexing for telemetry.' }] },
      how: { lead: 'Eventstream (or direct ingestion) lands data; KQL queries power real-time dashboards and alerts.', bullets: [{ h: 'KQL example', d: 'Summarize over time windows efficiently.' }], code: { lang: 'kql', text: 'Events\n| where Timestamp > ago(5m)\n| summarize revenue=sum(Amount) by bin(Timestamp, 1m)' } },
      deUseCase: { lead: 'Real-time dashboards, IoT/log analytics, anomaly detection — the hot analytical path DP-700 pairs with Eventstream.', bullets: [{ h: 'Pair with', d: 'Eventstream (ingest) + Real-Time Dashboards.' }] },
      integrations: [{ id: 'eventstream', label: 'Eventstream', note: 'Ingest', format: 'fabric' }, { id: 'onelake', label: 'OneLake', note: 'Also queryable', format: 'fabric' }],
      runtime: { lead: 'Managed; optimize with update policies, partitioning/caching and materialized views.', bullets: [{ h: 'Optimize', d: 'Caching policy + materialized views for dashboards.' }] },
      interview: [{ q: 'When use Eventhouse/KQL?', a: 'For high-volume time-series/telemetry needing sub-second analytics (IoT, logs, live dashboards) — KQL is purpose-built for it, unlike batch T-SQL/Spark.' }],
    },
    {
      id: 'fabric-mirroring', name: 'Fabric Mirroring', category: 'ingest-etl', aka: 'Near-real-time database replication into OneLake',
      tagline: 'Continuously replicates an external operational database (Azure SQL DB, Cosmos DB, Snowflake, PostgreSQL and more) into OneLake as Delta — no ETL pipeline to build or run.',
      keyFacts: [{ k: 'What', v: 'CDC replication → OneLake Delta' }, { k: 'Sources', v: 'Azure SQL, Cosmos DB, Snowflake, PostgreSQL…' }, { k: 'Latency', v: 'Near real-time' }, { k: 'Cost', v: 'Replication compute free; storage metered' }],
      what: {
        lead: 'Mirroring makes a continuously-updated copy of an operational database available inside Fabric: you point it at the source, and Fabric lands and keeps the data in sync as open Delta tables in OneLake — queryable immediately by SQL, Spark and Power BI.',
        bullets: [
          { h: 'Change data capture', d: 'After an initial snapshot, Mirroring streams inserts/updates/deletes from the source so the OneLake copy tracks it with low latency.' },
          { h: 'Open Delta target', d: 'Mirrored data is standard Delta in OneLake — every Fabric engine reads it, and you can shortcut to it from other items.' },
          { h: 'Low-config', d: 'No pipeline, Dataflow or notebook to author — Mirroring is a managed, built-in capability.' },
        ],
      },
      why: {
        lead: 'Teams constantly need operational data in analytics without hand-building and babysitting CDC pipelines. Mirroring removes that work: a managed, near-real-time replica in the lake, so analysts query current data and the OLTP source stays unburdened.',
        bullets: [
          { h: 'No pipeline to maintain', d: 'Replaces the classic "DMS/ADF + MERGE" plumbing with a managed capability.' },
          { h: 'Fresh + decoupled', d: 'Analytics hit the OneLake copy, not the production database, so reporting never competes with transactions.' },
        ],
      },
      how: {
        lead: 'You create a mirrored database item, authenticate to the source, and select what to replicate; Fabric performs an initial load then applies ongoing changes via the source\'s CDC mechanism, writing Delta into OneLake.',
        bullets: [
          { h: 'Initial + incremental', d: 'Snapshot first, then continuous change application — the same full-load-then-CDC shape as classic replication, but managed.' },
          { h: 'Query in place', d: 'A SQL analytics endpoint over the mirrored Delta lets you join it with Lakehouse/Warehouse tables.' },
          { h: 'Shortcut-friendly', d: 'Other items can shortcut to the mirrored tables instead of copying again.' },
        ],
        code: { lang: 'text (shape)', text: 'source: Azure SQL DB (CDC)\n  → initial snapshot → OneLake Delta\n  → stream inserts/updates/deletes (near real-time)\nquery via SQL endpoint / Spark / Direct Lake' },
      },
      deUseCase: {
        lead: 'A DP-700 loading pattern: bring operational data into Fabric without building ingestion. Contrast it with shortcuts (reference in place, no copy) and pipelines (you author movement/orchestration).',
        bullets: [
          { h: 'Choose Mirroring', d: 'When you need a continuously-synced, query-optimized copy of an operational DB in the lake with no pipeline.' },
          { h: 'vs Shortcut', d: 'Shortcut = point at existing lake/DB data in place; Mirroring = replicate an operational DB into OneLake Delta.' },
        ],
      },
      integrations: [
        { id: 'onelake', label: 'OneLake', note: 'Delta target', format: 'fabric' },
        { id: 'fabric-warehouse', label: 'Warehouse', note: 'Cross-query', format: 'fabric' },
        { id: 'azure-sql', label: 'Azure SQL DB', note: 'Source', format: 'azure' },
        { id: 'cosmos-db', label: 'Cosmos DB', note: 'Source', format: 'azure' },
      ],
      runtime: { lead: 'Managed replication; monitored for sync status and latency. Replication compute is free, with OneLake storage metered as usual.', bullets: [{ h: 'Watch', d: 'Sync status + replication latency; large transactions or schema changes on the source are the usual lag causes.' }] },
      interview: [
        { q: 'When would you use Mirroring instead of a pipeline or a shortcut?', a: 'Use Mirroring when you need a continuously-synced copy of an operational database (Azure SQL, Cosmos DB, Snowflake, PostgreSQL) inside Fabric with no ETL to build — Fabric snapshots then CDC-streams changes into OneLake Delta. A shortcut only references existing lake/DB data in place (no copy, no CDC of an OLTP source); a pipeline is when you need to author custom movement, transforms or orchestration. Mirroring is the managed, low-config path for "get my database into the lake, fresh".' },
      ],
    },
  ];
})();
