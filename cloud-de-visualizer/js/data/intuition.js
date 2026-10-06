/* ============================================================
   Cloud DE Visualizer — "Intuition" layer.

   Plain-English, business-first mental models for the highest-value
   services. The service pages are technically complete; this adds the
   missing "why would a business ever pay for this?" intuition, in a
   consistent 3-part shape so it reads the same everywhere and is easy
   to extend to the remaining services later:

     pain  — the real business/engineering pain that existed before
     aha   — the one mental model that makes the service "click"
     when  — when you'd actually reach for it (and when you wouldn't)

   Keyed by service id. The Service Detail renderer looks up
   svc.intuition || TV.Intuition[svc.id] and shows a callout near the
   top of the page. Phase-1 seeds ~15 anchor services; add more here.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  TV.Intuition = {
    /* ── AWS ── */
    's3': {
      pain: 'Before cheap object storage, analytics data lived in databases or on servers whose disks you had to size, pay for, and babysit — so teams threw away data they could not afford to keep.',
      aha: 'S3 is a bottomless, pay-per-GB bucket that separates storage from compute: keep everything forever, cheaply and durably, and point any engine at it later. Storage stops being a capacity decision.',
      when: 'Reach for it as the landing zone and system-of-record for a data lake. It is not a database — you do not do low-latency row lookups or transactions on raw S3.',
    },
    'glue-catalog': {
      pain: 'A lake is just files in S3; without a shared "what tables exist and what columns do they have?" registry, every team re-discovers schema by hand and tools disagree on what the data is.',
      aha: 'The Glue Data Catalog is the single card-catalog of your lake — define a table once and Athena, EMR, Redshift Spectrum and Glue ETL all read the same schema and partitions.',
      when: 'Use it whenever more than one engine (or person) queries the same lake data. The business value is consistency and discoverability, not storage.',
    },
    'athena': {
      pain: 'Answering one ad-hoc question over lake data used to mean spinning up and paying for a whole cluster, even for a five-minute query.',
      aha: 'Athena is "SQL on S3 with no server" — you pay only for the bytes a query scans. The cost lever is literally how much data you read, so Parquet + partitioning turns a $5 query into 5 cents.',
      when: 'Perfect for interactive, occasional SQL over the lake. For heavy, repeated, SLA-bound workloads a warehouse (Redshift) or Spark is cheaper per query.',
    },
    'redshift': {
      pain: 'BI dashboards over raw lake files are slow and unpredictable; business users need consistent sub-second answers over curated, modeled data.',
      aha: 'Redshift is a columnar MPP warehouse: it spreads a big table across many nodes and scans only the columns a query needs, so aggregations over billions of rows return fast and predictably.',
      when: 'Use it as the serving layer for BI and modeled marts. The whole game is distribution + sort keys so joins stay local; get those wrong and the MPP advantage evaporates.',
    },
    'kinesis': {
      pain: 'Batch jobs that run every hour cannot answer "what is happening right now?" — fraud, live dashboards and alerting need data within seconds of it being produced.',
      aha: 'Kinesis is a managed, ordered, replayable pipe between producers and consumers. Throughput scales with shards, and ordering is per-shard, so the partition key decides what stays in order.',
      when: 'Reach for it for real-time ingestion inside AWS with light ops. For the open Kafka ecosystem or very high fan-out, MSK (managed Kafka) fits better.',
    },
    'glue-etl': {
      pain: 'Running scheduled Spark transforms meant standing up, tuning and paying for a cluster even when jobs ran for minutes a day.',
      aha: 'Glue ETL is serverless Spark: you write the job (visual or PySpark), it provisions DPUs per run and tears them down after. Job bookmarks remember what was already processed, so reruns stay incremental.',
      when: 'Ideal for scheduled/triggered batch ETL with minimal ops. For large, long-running or heavily customized Spark/Hadoop jobs that need cluster control, use EMR.',
    },
    'lake-formation': {
      pain: 'Granting access to lake data via raw S3 bucket policies is all-or-nothing — you cannot say "this team sees these columns, not those rows", and auditors hate it.',
      aha: 'Lake Formation layers fine-grained, central permissions over the Glue Catalog — database / table / column / row and tag-based grants, enforced consistently across Athena, Redshift Spectrum and EMR.',
      when: 'Use it the moment multiple teams share a governed lake. It is about least-privilege access and audit, not storage or performance.',
    },
    'emr': {
      pain: 'Hand-building and tuning a Hadoop/Spark cluster — versions, scaling, Spot bidding — is slow, fragile work that distracts from the actual pipeline.',
      aha: 'EMR is managed big-data clusters (Spark, Hadoop, Presto, Hive) with full control of versions and tuning, plus Spot fleets for big cost savings on heavy jobs.',
      when: 'Reach for it for large, long-running or highly customized Spark/Hadoop workloads. For lightweight serverless batch, Glue ETL is less to operate.',
    },
    'redshift-spectrum': {
      pain: 'Loading every lake table into the warehouse before you can query it is slow, doubles storage cost, and keeps cold data you rarely touch sitting in expensive nodes.',
      aha: 'Spectrum runs Redshift SQL directly over S3 external tables (via the Glue Catalog) and joins them to local warehouse tables — query the lake in place, no load step.',
      when: 'Great for occasional or cold/huge lake data you do not want to load. Hot, repeatedly-queried data still belongs loaded inside Redshift for best speed.',
    },
    'msk': {
      pain: 'Running your own Kafka — brokers, coordination, patching, scaling — is effectively a full-time platform job.',
      aha: 'MSK is managed Apache Kafka: the open streaming standard and its whole ecosystem (Connect, Streams, Schema Registry), without you operating the cluster.',
      when: 'Choose it when you need true Kafka compatibility, high fan-out, or the Kafka tooling ecosystem. For simple AWS-native streaming with the least ops, Kinesis is lighter.',
    },
    'step-functions': {
      pain: 'Wiring Lambdas and services together with retries, error handling and branching in code becomes tangled glue that nobody can follow or debug.',
      aha: 'Step Functions is a serverless state machine: you declare the workflow as states — with built-in retry, catch, parallel and wait — and it durably orchestrates AWS services, visibly.',
      when: 'Best for event-driven, service-to-service orchestration with almost no infra. For complex Python-defined DAGs and the Airflow ecosystem, use MWAA.',
    },
    'mwaa': {
      pain: 'Teams standardized on Airflow, but running and scaling the scheduler, workers and metadata DB yourself is heavy and easy to get wrong.',
      aha: 'MWAA is managed Apache Airflow — your Python DAGs and the full operator ecosystem, with the control plane run for you.',
      when: 'Use it for complex, Python-defined pipelines and existing Airflow investment. For lightweight AWS-native orchestration, Step Functions is simpler and cheaper.',
    },
    'lambda': {
      pain: 'Running a whole server just to execute a few seconds of code on each event wastes money and adds patching and scaling you did not want.',
      aha: 'Lambda runs code on demand per event, billed per millisecond and auto-scaled (even to zero) — no servers to manage.',
      when: 'Perfect event-driven glue: react to an S3 upload, transform small records, trigger a pipeline. Not for long-running or memory-heavy Spark-style processing.',
    },
    'dms': {
      pain: 'Migrating or continuously replicating an operational database to the cloud or lake without downtime is risky, manual and easy to get subtly wrong.',
      aha: 'Database Migration Service does a full load plus ongoing CDC replication between a source and target, keeping them in sync with minimal downtime.',
      when: 'Use it for lift-and-shift migrations and source→lake/warehouse CDC feeds. It moves data, it does not transform it — pair it with Glue/Spark for shaping.',
    },

    /* ── Azure ── */
    'adls-gen2': {
      pain: 'Plain blob storage is great for files but has no real folders or fine-grained permissions, which analytics engines and security teams both need.',
      aha: 'ADLS Gen2 is blob storage + a hierarchical namespace: real directories with atomic renames and POSIX ACLs. It turns an object store into a proper, governable analytics lake.',
      when: 'The default lake storage for any Azure data platform. Use plain Blob only for simple file/object workloads that do not need directory semantics or ACLs.',
    },
    'data-factory': {
      pain: 'Getting data from a hundred different sources — on-prem SQL, SaaS APIs, FTP — into the lake on a schedule used to mean a pile of brittle custom scripts nobody wanted to own.',
      aha: 'ADF is managed "plumbing as configuration": connectors + triggers + parameterized pipelines move and orchestrate data without you running any servers. The Self-hosted IR is the bridge to anything behind a firewall.',
      when: 'Use it for ingestion and orchestration across many sources. For heavy in-engine transformation, let ADF orchestrate and push the compute to Databricks or Synapse.',
    },
    'event-hubs': {
      pain: 'Millions of events per second from apps and devices will overwhelm any database you point them at directly, and tightly coupling producers to consumers makes the whole system fragile.',
      aha: 'Event Hubs is a massive managed buffer/broker — producers fire-and-forget, many consumers read independently at their own pace, and ordering holds within a partition.',
      when: 'The front door for streaming on Azure. Note: it is a broker, not a processor — you still need Stream Analytics or Databricks behind it to actually compute on the stream.',
    },
    'synapse-analytics': {
      pain: 'Teams were stitching together separate tools for data warehousing, lake querying and orchestration, with data copied awkwardly between them.',
      aha: 'Synapse is an analytics workspace that puts a dedicated MPP SQL warehouse, serverless lake querying and pipelines under one roof over the same ADLS data.',
      when: 'Dedicated SQL pools suit predictable, high-concurrency BI; serverless suits occasional pay-per-TB lake queries. Pick the engine per workload rather than defaulting to the expensive provisioned pool.',
    },
    'stream-analytics': {
      pain: 'Computing a live metric like "revenue per 5 minutes" from a raw event stream normally means writing and operating a stateful streaming app.',
      aha: 'Stream Analytics is serverless SQL over a stream: you write a windowed query, it runs continuously with no cluster to manage. Tumbling/hopping/sliding windows are the core vocabulary.',
      when: 'Great for standard windowed aggregations with minimal ops. For rich transforms, ML, complex joins or a Delta sink, reach for Databricks Structured Streaming instead.',
    },
    'blob-storage': {
      pain: 'You need cheap, massively scalable storage for files, backups and media — but paying warehouse prices for cold objects makes no sense.',
      aha: 'Blob is Azure\'s base object store: virtually unlimited, with hot / cool / archive tiers so cost matches how often you touch the data. ADLS Gen2 is simply Blob plus a hierarchical namespace.',
      when: 'Use plain Blob for general objects, backups and static assets. For an analytics lake that needs real folders and ACLs, use ADLS Gen2 instead.',
    },
    'synapse-serverless': {
      pain: 'A provisioned warehouse bills around the clock, which is wasteful when you only need to query the lake occasionally or explore new files.',
      aha: 'Serverless SQL is an on-demand endpoint that queries Parquet / CSV / Delta in ADLS directly, billed per TB scanned — no cluster to size, no loading step.',
      when: 'Ideal for ad-hoc lake SQL, exploration and logical-warehouse views. For predictable, high-concurrency BI, a dedicated SQL pool performs better.',
    },
    'azure-sql': {
      pain: 'You need a reliable transactional (OLTP) database but do not want to run and patch SQL Server VMs yourself.',
      aha: 'Azure SQL is the fully-managed SQL Server engine (PaaS): built-in HA, backups, patching and scaling. It is the operational source of truth, not the analytics store.',
      when: 'Use it for application/operational data and as a CDC source into the lake. Keep heavy analytics downstream in the lake or warehouse.',
    },
    'cosmos-db': {
      pain: 'Global apps need single-digit-millisecond reads and writes across regions at huge scale — something a single relational database cannot deliver.',
      aha: 'Cosmos DB is a globally-distributed, multi-model NoSQL database with turnkey multi-region replication and tunable consistency. Your partition-key choice makes or breaks throughput.',
      when: 'For high-scale, low-latency operational workloads (IoT, catalogs, user sessions). In DE it is usually a source — via its change feed — not the analytics store.',
    },
    'purview': {
      pain: 'In a large estate nobody can say what data exists, where it came from, or whether it holds PII — until an audit forces the question.',
      aha: 'Purview is an estate-wide scanner and catalog: it classifies data, maps lineage and makes assets discoverable across clouds and on-prem.',
      when: 'For governance, discovery and compliance across the whole estate. It complements query-time enforcement (like Unity Catalog), it does not replace it.',
    },
    'entra-id': {
      pain: 'Every service with its own logins and passwords is a security nightmare and impossible to govern or audit centrally.',
      aha: 'Entra ID is the cloud identity provider — one home for users, groups, service principals and managed identities. It answers "who are you" (authentication); RBAC answers "what can you do".',
      when: 'The backbone of all Azure access. Pair managed identities with RBAC for passwordless, least-privilege service-to-service access.',
    },
    'key-vault': {
      pain: 'Secrets hardcoded into pipelines, configs and notebooks leak, get committed to git, and cannot be rotated safely.',
      aha: 'Key Vault is a managed store for secrets, keys and certificates with access policies and audit — code references a secret by name and never holds its value.',
      when: 'Anywhere a connection string, token or key is needed. Combine it with a managed identity so even access to the vault needs no stored credential.',
    },
    'azure-monitor': {
      pain: 'When a pipeline fails or slows at 2am, hunting across separate services for logs and metrics burns the first hour of every incident.',
      aha: 'Azure Monitor is the unified observability plane: metrics, logs (Log Analytics + KQL), alerts and dashboards across all resources in one place.',
      when: 'For production monitoring, alerting and troubleshooting. It is the difference between a job failing silently and your team being paged within 60 seconds.',
    },

    /* ── Databricks ── */
    'delta-lake': {
      pain: 'A plain Parquet "lake" has no transactions: a failed job leaves half-written files, two writers corrupt each other, and there is no way to undo a bad load or see yesterday\'s data.',
      aha: 'Delta adds an ordered transaction log on top of Parquet. That one log gives you ACID commits, time travel, schema enforcement and MERGE — the reliability of a database on open lake files.',
      when: 'Make it the default table format for the lakehouse. The log is also why you get CDC (Change Data Feed) and safe concurrent writes almost for free.',
    },
    'unity-catalog': {
      pain: 'As a lakehouse grows, "who can see which table/column/row?" sprawls across workspaces with no central answer, and auditors and security teams lose the thread.',
      aha: 'Unity Catalog is one account-level governance brain: a three-level namespace (catalog.schema.table), fine-grained grants, row/column security, lineage and storage credentials — enforced inside the query plan.',
      when: 'Adopt it as the governance layer for all Databricks data. It is about trust, audit and least-privilege access, not query speed.',
    },
    'auto-loader': {
      pain: 'Incrementally ingesting files that keep landing in the lake is deceptively hard: re-scanning the whole folder is slow and expensive, and naive jobs reprocess or skip files after a restart.',
      aha: 'Auto Loader tracks exactly which files it has already processed in a durable checkpoint, so it picks up only new files and never double-counts — even across failures.',
      when: 'Use it for continuous/incremental file ingestion into Delta. Switch to file-notification mode (over directory listing) once a path holds millions of files.',
    },
    'structured-streaming': {
      pain: 'Businesses increasingly need the same logic to run on a live stream and a nightly batch, but maintaining two separate codebases is costly and they drift apart.',
      aha: 'Structured Streaming treats a stream as an unbounded table — you write almost the same DataFrame code as for batch, and it handles state, checkpoints and exactly-once delivery to Delta.',
      when: 'Reach for it when you need rich, stateful, code-first streaming (joins, ML, Delta sinks). For simple windowed SQL with minimal ops, Azure Stream Analytics is lower-effort.',
    },
    'photon': {
      pain: 'Spark\'s JVM engine processes data row-by-row and spends a lot of CPU on overhead, so big SQL and aggregation jobs cost more compute than they should.',
      aha: 'Photon is a drop-in native C++ vectorized engine: it crunches columnar batches using the CPU far more efficiently, cutting runtime (and cost) with no code change.',
      when: 'Turn it on for SQL/DataFrame and ETL workloads where it helps most. The win is price/performance; it does not change what your queries mean, only how fast they run.',
    },
    'delta-live-tables': {
      pain: 'Hand-built Spark pipelines make you wire dependencies, manage incremental state, bolt on quality checks and handle retries yourself — and it quietly rots over time.',
      aha: 'DLT is declarative ETL: you declare the tables and data-quality expectations, and it infers the DAG, manages incremental/streaming state, enforces quality and handles retries + lineage.',
      when: 'For production ELT where reliability and built-in quality matter. For one-off or highly custom logic, a plain notebook/job is still fine.',
    },
    'change-data-feed': {
      pain: 'To push only what changed into downstream tables you would otherwise re-scan whole tables or build fragile hand-rolled diff logic.',
      aha: 'Change Data Feed makes a Delta table emit row-level inserts/updates/deletes between versions, so downstream MERGEs consume just the deltas.',
      when: 'For incremental silver→gold propagation and CDC-style pipelines on the lakehouse. Enable it on the source Delta table up front so the change history exists.',
    },
    'workflows': {
      pain: 'Scheduling and chaining notebooks, JARs and DLT pipelines with dependencies and retries normally needs a separate orchestrator and extra infrastructure.',
      aha: 'Workflows is native Databricks orchestration: multi-task jobs with dependencies, retries, parameters and ephemeral job clusters — no extra tooling.',
      when: 'For scheduling and chaining Databricks work. For orchestration that spans systems beyond Databricks, Airflow or ADF may still sit on top.',
    },
    'clusters': {
      pain: 'Over-provision compute and you burn money sitting idle; under-provision and jobs crawl or run out of memory.',
      aha: 'Clusters are on-demand Spark compute you size to the workload: all-purpose (interactive, shared) vs job clusters (ephemeral, per-run) vs serverless, with autoscaling and Spot to cut cost.',
      when: 'Everything runs on a cluster — use ephemeral job/serverless compute for production and interactive for dev. Leaving all-purpose clusters running is the classic cost leak.',
    },
    'databricks-sql': {
      pain: 'Analysts want fast BI SQL and dashboards, but data-science notebooks and clusters are not built for low-latency query serving.',
      aha: 'Databricks SQL provides Photon-powered SQL warehouses tuned for BI over lakehouse tables, with a SQL editor, dashboards and native BI-tool connectors.',
      when: 'As the serving layer for analysts and BI on Delta. It is governed by Unity Catalog like everything else in the lakehouse.',
    },
    'mlflow': {
      pain: 'ML experiments are irreproducible — months later nobody can say which data, parameters and code produced a model, or who promoted it to production.',
      aha: 'MLflow tracks every run (params, metrics, artifacts, code version) and the Model Registry versions and stage-promotes models with lineage; registered in Unity Catalog, models get the same governance as data.',
      when: 'For any ML workflow needing reproducibility, comparison and governed promotion. It is the experiment/model backbone, not the training engine itself.',
    },
    'delta-sharing': {
      pain: 'Sharing data with partners used to mean copying or exporting files — instantly stale, ungoverned, and a security risk.',
      aha: 'Delta Sharing is an open protocol to share live Delta tables in place via short-lived signed URLs — no copy, cross-platform (even non-Databricks recipients), centrally governed and revocable.',
      when: 'For sharing data with external partners or across orgs/clouds without duplication. It is governed through Unity Catalog.',
    },

    /* ── Microsoft Fabric (DP-700) ── */
    'onelake': {
      pain: 'Every analytics tool kept its own copy of the data, so the same table existed five times, drifted out of sync, and nobody trusted which was current.',
      aha: 'OneLake is one tenant-wide logical lake in open Delta format that every Fabric engine shares; shortcuts reference external data in place instead of copying it.',
      when: 'The default storage under all of Fabric. Use shortcuts to bring ADLS/S3 data in without moving it; reach for a copy only when you truly need a physical duplicate.',
    },
    'fabric-lakehouse': {
      pain: 'Teams had to choose between Spark flexibility and SQL serving, and copy data between the two worlds to get both.',
      aha: 'The Lakehouse gives you a Files area and Delta Tables on OneLake, worked with Spark notebooks and queried by a built-in SQL endpoint — plus Power BI Direct Lake, all over one copy.',
      when: 'The Spark/open-files home for data engineering. Choose it when you want code + open Delta; use the Warehouse when you need full T-SQL DML.',
    },
    'fabric-warehouse': {
      pain: 'SQL-first teams wanted a familiar T-SQL warehouse with real UPDATE/DELETE and transactions, but not at the cost of locking data into a proprietary store.',
      aha: 'The Fabric Warehouse is a full T-SQL engine whose tables persist as open Delta on OneLake — so SQL teams get DML and transactions while Spark can still read the same data.',
      when: 'For T-SQL DML, stored procedures and high-concurrency BI. The Lakehouse SQL endpoint is read-only; the Warehouse is the writable SQL surface.',
    },
    'dataflow-gen2': {
      pain: 'Not everyone writes Spark or SQL, yet analysts still need to clean and shape data into the lake.',
      aha: 'Dataflow Gen2 is low-code ETL built on Power Query — the same visual transforms as Excel/Power BI — that lands results in OneLake.',
      when: 'For low-code cleansing/shaping by analysts. For heavy orchestration use pipelines; for complex/code-first logic use notebooks.',
    },
    'fabric-data-pipelines': {
      pain: 'Ingestion, transformation and serving are separate steps that need scheduling, triggers, parameters and error handling to run reliably.',
      aha: 'Fabric Data Pipelines are ADF-style orchestration inside Fabric: copy activities + control flow that run notebooks and dataflows on schedules or event triggers.',
      when: 'The glue that wires an end-to-end flow with retries and incremental (watermark) patterns. It orchestrates and moves data; notebooks/dataflows do the transforming.',
    },
    'fabric-spark': {
      pain: 'Low-code tools cannot express complex joins, SCD logic, ML or streaming — and standing up your own Spark cluster is heavy.',
      aha: 'Fabric Spark notebooks are managed Apache Spark over OneLake with fast-starting pools — PySpark/SQL against Lakehouse Delta without cluster ops.',
      when: 'The code-first surface for heavy transforms, MERGE/SCD and Structured Streaming. Use Dataflow Gen2 instead for simple low-code shaping.',
    },
    'eventstream': {
      pain: 'Getting real-time events from a broker into analytics usually meant writing and operating a streaming application.',
      aha: 'Eventstream is a low-code real-time on-ramp: visually capture events from Event Hubs/Kafka/IoT, optionally transform, and route them to Eventhouse or the Lakehouse.',
      when: 'The easy hot-path for real-time ingestion/routing. For rich, stateful stream processing, use Spark Structured Streaming instead.',
    },
    'eventhouse': {
      pain: 'Dashboards and anomaly detection over huge volumes of live telemetry need sub-second answers that batch SQL/Spark cannot give.',
      aha: 'An Eventhouse is a KQL engine purpose-built for time-series/log data — fast ingestion and seconds-fresh analytics, with data also available in OneLake.',
      when: 'For high-volume real-time analytics (IoT, logs, live dashboards) via KQL. Pair it with Eventstream for ingestion; use the Lakehouse/Warehouse for batch analytics.',
    },

    /* ── Interview concepts (drill pages, keyed by iq-<id>) ── */
    'iq-spark-arch': {
      pain: 'A Spark cluster is just a pile of machines; without a model of how work is split across them, you cannot reason about why a job is slow or runs out of memory.',
      aha: 'One driver plans a DAG of stages; each stage becomes tasks that executors run over data partitions, and a shuffle is what separates one stage from the next.',
      when: 'This is the mental model behind every tuning decision — learn it before shuffle, joins and performance tuning.',
    },
    'iq-partitioning': {
      pain: 'Too few partitions leave the cluster idle; too many drown it in scheduling overhead; a skewed key makes one task run forever while the rest finish.',
      aha: 'Partitions are Spark\'s unit of parallelism — right-sizing them (and spreading skew) is the first and biggest lever on throughput.',
      when: 'Whenever a job is slow or uneven. It is the prerequisite for understanding joins and shuffle tuning.',
    },
    'iq-joins': {
      pain: 'Joining two large datasets silently shuffles huge amounts of data across the network — the single most common reason a Spark job crawls.',
      aha: 'The trick is matching the join strategy to the data: broadcast the small side to eliminate the shuffle entirely; otherwise co-partition both sides on the join key.',
      when: 'Any time two big datasets meet. Broadcast joins and data-skew handling are the headline interview topics here.',
    },
    'iq-optimization': {
      pain: '"The job is slow and expensive" with no systematic way to find out why turns tuning into guesswork.',
      aha: 'Optimization is a repeatable loop: read the Spark UI, find the skewed or spilling stage, fix partitions / joins / caching, and let AQE adapt at runtime.',
      when: 'Performance tuning and senior-level interviews. It builds directly on partitioning, joins and caching.',
    },
    'iq-delta': {
      pain: 'A plain Parquet lake has no transactions, so concurrent writers corrupt each other and a failed job leaves half-written files behind.',
      aha: 'The Delta transaction log turns a folder of files into a real table — ACID commits, time travel, MERGE and schema enforcement.',
      when: 'The foundation of the lakehouse: Change Data Feed, streaming and governance all build on top of it.',
    },
    'iq-unity': {
      pain: 'As data spreads across workspaces, "who can see which table, column and row?" becomes unanswerable and audits start to fail.',
      aha: 'Unity Catalog centralizes identity, fine-grained grants (incl. row/column security), lineage and storage access — all enforced inside the query plan.',
      when: 'Lakehouse governance. It is the enforcement counterpart to Purview\'s estate-wide cataloging.',
    },
  };
})();
