/* ============================================================
   Cloud DE Visualizer — Azure service catalogue (Block B).
   13 interview-critical Azure data services, each with six
   depth levels (What / Why / How / DE Use Case / Integrations /
   Runtime) plus key facts and interview Q&A. Consumed by
   _service-detail.js (renderer) and formats/azure.js (nav).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const AZURE_SERVICES = [
    /* ── STORAGE ─────────────────────────────────────────── */
    {
      id: 'adls-gen2', name: 'Azure Data Lake Storage Gen2', category: 'storage',
      aka: 'ADLS Gen2 — Blob Storage with a hierarchical namespace',
      tagline: 'The default data lake on Azure: massively scalable object storage with real directories, POSIX ACLs, and one API surface for both blob and file semantics.',
      keyFacts: [
        { k: 'Built on', v: 'Azure Blob Storage' },
        { k: 'Key feature', v: 'Hierarchical Namespace (HNS)' },
        { k: 'Protocol', v: 'abfss:// (ABFS driver)' },
        { k: 'Security', v: 'RBAC + POSIX ACLs' },
      ],
      what: {
        lead: 'ADLS Gen2 is not a separate product — it is Azure Blob Storage with the Hierarchical Namespace feature turned on. That one flag adds true directories and file/folder-level permissions, turning cheap object storage into a lake that behaves like a filesystem.',
        bullets: [
          { h: 'Hierarchical Namespace (HNS)', d: 'Files are organized in real directories, so a rename or move of a folder is a single atomic metadata operation instead of copying every object.' },
          { h: 'Multi-protocol access', d: 'The same data is reachable through the Blob endpoint and the Data Lake (ABFS) endpoint — no data movement between "lake" and "blob".' },
          { h: 'Storage tiers', d: 'Hot / Cool / Cold / Archive tiers let you place cold history cheaply and hot working data fast, per blob or via lifecycle rules.' },
        ],
      },
      why: {
        lead: 'Analytics engines list and scan directories constantly. On flat blob storage a "directory rename" means copy-then-delete of millions of objects; HNS makes it O(1) and gives per-directory security the lake actually needs.',
        bullets: [
          { h: 'Atomic directory operations', d: 'Spark writes to a _temporary folder then renames it to commit. Flat blob makes that slow and non-atomic; HNS makes commit instant and safe.' },
          { h: 'Fine-grained security', d: 'POSIX ACLs on folders let you grant a team read on /bronze/orders without exposing /silver/pii.' },
          { h: 'Cost at scale', d: 'Object storage economics (pennies/GB) with tiering, versus paying warehouse rates to store raw data.' },
        ],
      },
      how: {
        lead: 'Data is addressed as abfss://<container>@<account>.dfs.core.windows.net/<path>. The ABFS driver talks to the DFS endpoint, which understands directories; the Blob endpoint sees the same bytes as flat objects.',
        bullets: [
          { h: 'Containers = filesystems', d: 'A storage account holds containers; with HNS each container is a filesystem root with a directory tree.' },
          { h: 'ACLs + RBAC combine', d: 'Azure RBAC grants coarse account/container roles; POSIX ACLs (read/write/execute) refine access down to individual folders and files.' },
          { h: 'Medallion layout', d: 'Conventionally organized as /bronze (raw), /silver (cleaned), /gold (curated) containers or folders.' },
        ],
        code: {
          lang: 'spark (abfss path)',
          text: "df = spark.read.parquet(\n  \"abfss://bronze@shopkart.dfs.core.windows.net/orders/\"\n)\ndf.write.format(\"delta\").save(\n  \"abfss://silver@shopkart.dfs.core.windows.net/orders/\"\n)",
        },
      },
      deUseCase: {
        lead: 'ADLS Gen2 is the storage foundation under almost every Azure pipeline — the landing zone for ingestion and the physical home of Bronze/Silver/Gold Delta tables.',
        bullets: [
          { h: 'Landing + medallion lake', d: 'ADF or Event Hubs Capture lands raw files in Bronze; Databricks/Synapse Spark refine into Silver and Gold on the same account.' },
          { h: 'External tables', d: 'Synapse Serverless SQL and Databricks Unity Catalog external locations point directly at ADLS paths — query in place, no load.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'ingests / lands files' },
        { id: 'synapse-serverless', label: 'Synapse Serverless SQL', note: 'query in place' },
        { id: 'event-hubs', label: 'Event Hubs Capture', note: 'streams → Parquet' },
        { id: 'purview', label: 'Microsoft Purview', note: 'scans & catalogs' },
        { label: 'Databricks (external location)', note: 'Unity Catalog governs the same paths' },
      ],
      runtime: {
        lead: 'At runtime the ABFS driver batches metadata calls and streams block ranges. Because HNS renames are metadata-only, Spark job commit is fast and atomic — the single biggest lake performance win over flat blob.',
        bullets: [
          { h: 'Throughput', d: 'Scales to many GB/s per account; parallel readers hit many blocks/objects at once.' },
          { h: 'Consistency', d: 'Strong read-after-write consistency — a file written is immediately readable, so pipelines do not need eventual-consistency workarounds.' },
        ],
      },
      interview: [
        { q: 'What is the difference between Blob Storage and ADLS Gen2?', a: 'ADLS Gen2 is Blob Storage with the Hierarchical Namespace enabled. That adds real directories (atomic folder rename/move), POSIX ACLs for folder-level security, and the ABFS/DFS endpoint — while keeping blob economics and multi-protocol access to the same bytes.' },
        { q: 'Why does the hierarchical namespace matter for Spark?', a: 'Spark commits output by writing to a temp directory then renaming it. On flat blob a rename is copy+delete of every object — slow and non-atomic. HNS makes the rename a single metadata operation, so job commit is fast and atomic.' },
        { q: 'How do you secure data in ADLS Gen2?', a: 'Two layers: Azure RBAC for coarse-grained roles at account/container scope, and POSIX ACLs (read/write/execute) on directories and files for fine-grained access — e.g. a team gets read on /bronze but not /silver/pii.' },
      ],
    },

    {
      id: 'blob-storage', name: 'Azure Blob Storage', category: 'storage',
      tagline: 'Azure’s core object store for unstructured data — the substrate ADLS Gen2 is built on, and the go-to for backups, images, logs and any "just put bytes somewhere cheap" need.',
      keyFacts: [
        { k: 'Model', v: 'Flat object store' },
        { k: 'Tiers', v: 'Hot / Cool / Cold / Archive' },
        { k: 'Redundancy', v: 'LRS / ZRS / GRS / RA-GRS' },
        { k: 'Access', v: 'REST, SAS, RBAC' },
      ],
      what: {
        lead: 'Blob Storage stores objects (blobs) in a flat container namespace. Without the hierarchical namespace there are no true folders — "paths" are just prefixes on object names.',
        bullets: [
          { h: 'Block / append / page blobs', d: 'Block blobs for files & streaming uploads, append blobs for logs, page blobs for random-access (VM disks).' },
          { h: 'Redundancy options', d: 'LRS (local), ZRS (zonal), GRS (geo), RA-GRS (geo + read replica) trade cost against durability and DR.' },
        ],
      },
      why: {
        lead: 'It is the cheapest, most durable place to keep large volumes of data on Azure, with lifecycle rules to tier data down automatically as it ages.',
        bullets: [
          { h: 'Elastic + cheap', d: 'Pennies per GB, effectively unlimited capacity, pay only for what you store and transfer.' },
          { h: 'Durable', d: 'Eleven 9s of durability with geo-redundant options for disaster recovery.' },
        ],
      },
      how: {
        lead: 'Clients address blobs as https://<account>.blob.core.windows.net/<container>/<name>. Access is granted via account keys, SAS tokens (scoped, time-limited) or Azure RBAC + Entra identities.',
        bullets: [
          { h: 'Lifecycle management', d: 'Rules auto-move blobs Hot → Cool → Archive after N days and delete expired data, cutting storage cost without code.' },
          { h: 'SAS tokens', d: 'Shared Access Signatures grant scoped, expiring URLs — the safe way to hand a partner temporary read on one container.' },
        ],
      },
      deUseCase: {
        lead: 'In a data platform Blob is the raw landing zone and archive tier. Enable HNS on it and it becomes ADLS Gen2 for analytics; leave it flat for backups, exports and file drops.',
        bullets: [
          { h: 'Ingestion drop zone', d: 'Partners and apps drop CSV/JSON/Parquet; ADF or Event Grid triggers pick them up.' },
          { h: 'Cold archive', d: 'Aged Parquet history tiered to Archive for cents, rehydrated only when needed.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'same service + HNS' },
        { id: 'data-factory', label: 'Data Factory', note: 'copy source/sink' },
        { id: 'event-hubs', label: 'Event Hubs Capture', note: 'writes Avro/Parquet here' },
      ],
      runtime: {
        lead: 'Blob operations are individual REST calls against a flat index. Listing a large "folder" scans by prefix across the whole container, which is why analytics workloads prefer HNS (ADLS Gen2).',
        bullets: [
          { h: 'Eventual list consistency', d: 'Recently created blobs are immediately readable, but large prefix listings can be slower than a real directory tree.' },
        ],
      },
      interview: [
        { q: 'When would you use plain Blob Storage vs ADLS Gen2?', a: 'Use ADLS Gen2 (HNS on) for analytics lakes that need directory semantics and folder ACLs. Use plain Blob for backups, media, exports, and simple app storage where you do not need atomic folder renames or POSIX ACLs. It is the same service — HNS is the switch.' },
        { q: 'What are storage tiers and why use them?', a: 'Hot/Cool/Cold/Archive tiers trade access cost for storage cost. Hot for active data, Archive for rarely-read history at the lowest price. Lifecycle rules move blobs down tiers automatically as they age.' },
      ],
    },

    /* ── INGESTION & ETL ─────────────────────────────────── */
    {
      id: 'data-factory', name: 'Azure Data Factory', category: 'ingest-etl',
      aka: 'ADF — cloud-native, serverless data integration',
      tagline: 'Azure’s managed orchestration and ETL/ELT service: pipelines that move data from 100+ sources, transform it with Mapping Data Flows or by pushing compute down to Spark/SQL, on a schedule or trigger.',
      keyFacts: [
        { k: 'Role', v: 'Orchestration + ELT' },
        { k: 'Move engine', v: 'Copy Activity (IR)' },
        { k: 'Transform', v: 'Mapping Data Flows (Spark)' },
        { k: 'Connectors', v: '100+ sources/sinks' },
      ],
      what: {
        lead: 'ADF is a serverless data-integration service. You build pipelines of activities — copy, transform, run a notebook, run a stored proc — and ADF schedules and monitors them. It is Azure’s answer to "how do I get data from A to B and orchestrate the steps".',
        bullets: [
          { h: 'Pipelines & activities', d: 'A pipeline is a DAG of activities: Copy, Data Flow, Databricks Notebook, Stored Procedure, Lookup, ForEach, If.' },
          { h: 'Integration Runtime (IR)', d: 'The compute that executes moves: Azure IR (cloud), Self-hosted IR (on-prem/VNet), Azure-SSIS IR (lift SSIS packages).' },
          { h: 'Mapping Data Flows', d: 'Visual, code-free transformations that ADF compiles to Spark and runs on a managed cluster — no Spark code required.' },
          { h: 'Triggers', d: 'Schedule, tumbling window (with dependencies & backfill), and event triggers (a blob arrives).' },
        ],
      },
      why: {
        lead: 'Teams need a managed, monitored way to orchestrate ingestion and transformation without running their own scheduler. ADF gives connectors, retry/alerting, and parameterized reusable pipelines out of the box.',
        bullets: [
          { h: 'ELT push-down', d: 'Rather than transform in ADF, it commonly orchestrates: copy raw to the lake, then invoke Databricks/Synapse to do the heavy transform where the data lives.' },
          { h: 'Hybrid connectivity', d: 'Self-hosted IR reaches on-prem SQL Server, Oracle, file shares behind a firewall — key for lift-and-shift.' },
          { h: 'Metadata-driven', d: 'Parameterized pipelines + a control table let one pipeline ingest hundreds of tables generically.' },
        ],
      },
      how: {
        lead: 'A pipeline references linked services (connection definitions) and datasets (shape/location). The Copy Activity streams data source→sink through an IR; Data Flows spin up a transient Spark cluster. Triggers fire pipelines; Monitor tracks runs.',
        bullets: [
          { h: 'Linked service + dataset', d: 'Linked service = the connection (an ADLS account, a SQL DB); dataset = the table/file within it. Reused across pipelines.' },
          { h: 'Tumbling window triggers', d: 'Fixed, non-overlapping time slices with dependency chains and automatic backfill of missed windows — ideal for incremental loads.' },
          { h: 'CI/CD', d: 'ADF integrates with Git; ARM templates promote pipelines dev → test → prod.' },
        ],
        code: {
          lang: 'pipeline (conceptual)',
          text: "Trigger (event: blob lands in /bronze)\n  -> Copy Activity: SQL on-prem  ->  ADLS /bronze/orders (Parquet)\n  -> Databricks Notebook: bronze -> silver (clean, dedupe)\n  -> Stored Proc: refresh Synapse gold table",
        },
      },
      deUseCase: {
        lead: 'ADF is the control plane of an Azure batch platform: it lands raw data into ADLS Bronze, then orchestrates the Spark/SQL jobs that build Silver and Gold, with retries, alerting and lineage.',
        bullets: [
          { h: 'Ingestion framework', d: 'Metadata-driven pipeline copies 300 on-prem tables nightly into Bronze, parameterized by a control table.' },
          { h: 'Orchestrating Databricks', d: 'ADF triggers Databricks notebooks/jobs and passes parameters; ADF owns scheduling, Databricks owns transformation.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'primary sink / lake' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'source & sink' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'load gold tables' },
        { id: 'key-vault', label: 'Key Vault', note: 'stores secrets' },
        { label: 'Databricks', note: 'Notebook activity' },
      ],
      runtime: {
        lead: 'Copy Activity is billed by Data Integration Units (DIU) and runtime; Data Flows bill by the Spark cluster’s vCore-hours (with a cold-start warm-up). ADF itself is serverless — you pay per activity run and data moved, not for an idle service.',
        bullets: [
          { h: 'Parallel copy', d: 'Copy Activity partitions large sources and moves partitions in parallel to saturate bandwidth.' },
          { h: 'Data Flow cluster', d: 'Each Data Flow debug/run warms a transient Spark cluster; a TTL/keep-alive avoids repeated cold starts across activities.' },
        ],
      },
      interview: [
        { q: 'What is an Integration Runtime in ADF?', a: 'The compute engine that executes activities. Azure IR runs fully-managed in the cloud for cloud-to-cloud moves and Data Flows; Self-hosted IR runs on a VM you control to reach on-prem or VNet sources; Azure-SSIS IR runs lifted SSIS packages.' },
        { q: 'ADF vs Databricks — how do they relate?', a: 'They are complementary. ADF is the orchestrator + connector layer (schedule, move, monitor); Databricks is the transformation engine. A common pattern is ADF lands raw data and triggers Databricks notebooks to do the Spark transformation. ADF Mapping Data Flows can transform too, but heavy logic usually goes to Databricks.' },
        { q: 'How do you do incremental loads in ADF?', a: 'Track a watermark (max modified date / id) per table in a control table; the pipeline reads the last watermark, copies only newer rows, then updates it. Tumbling-window triggers give fixed time slices with dependencies and automatic backfill for missed windows.' },
        { q: 'What is the difference between a linked service and a dataset?', a: 'A linked service is the connection definition (which storage account or database, plus auth). A dataset points at the specific object within it (a container/path or a table). Datasets reference linked services and are reused across pipelines.' },
      ],
    },

    /* ── STREAMING ───────────────────────────────────────── */
    {
      id: 'event-hubs', name: 'Azure Event Hubs', category: 'streaming',
      aka: 'Azure’s managed event-streaming platform (Kafka-compatible)',
      tagline: 'A big-data streaming ingress that swallows millions of events per second, buffers them in partitioned logs, and fans them out to many consumers — with a Kafka-protocol surface so Kafka clients work unchanged.',
      keyFacts: [
        { k: 'Model', v: 'Partitioned append log' },
        { k: 'Kafka', v: 'Wire-compatible endpoint' },
        { k: 'Retention', v: 'Hours → days (Standard)' },
        { k: 'Replay', v: 'By offset within retention' },
      ],
      what: {
        lead: 'Event Hubs is a distributed, partitioned commit log — conceptually Azure’s managed Kafka. Producers append events; the hub retains them for a window; consumers read at their own pace by tracking an offset. It decouples fast producers from slower downstream systems.',
        bullets: [
          { h: 'Partitions', d: 'A hub is split into partitions; each is an ordered, append-only log. Partition count sets the max parallelism of consumers.' },
          { h: 'Consumer groups', d: 'Each consumer group is an independent view (its own offsets) over the same stream — analytics and archival can read the same events separately.' },
          { h: 'Throughput/Processing Units', d: 'Capacity is provisioned in TUs (Standard) or PUs (Premium)/CUs (Dedicated); Auto-Inflate scales TUs up under load.' },
          { h: 'Capture', d: 'Event Hubs Capture automatically writes the stream to ADLS/Blob as Avro or Parquet on a size/time window — instant cheap archival.' },
        ],
      },
      why: {
        lead: 'When events arrive faster than any single consumer can process, you need a durable buffer that preserves order per key and lets many consumers read independently and replay. That is exactly the partitioned-log model.',
        bullets: [
          { h: 'Backpressure & decoupling', d: 'Producers never block on slow consumers; the log absorbs bursts and consumers catch up.' },
          { h: 'Replay', d: 'A consumer can rewind to an earlier offset to reprocess — essential for reprocessing after a bug fix.' },
          { h: 'Kafka without ops', d: 'Existing Kafka producers/consumers point at the Kafka endpoint and just work — no cluster to run.' },
        ],
      },
      how: {
        lead: 'A producer picks a partition (round-robin, or by partition key to keep a key ordered). Events land in that partition’s log with a monotonic offset. Consumers in a group lease partitions and checkpoint their offset so they can resume after a crash.',
        bullets: [
          { h: 'Partition key = ordering unit', d: 'All events with the same key (e.g. orderId) go to one partition, preserving their order; different keys spread for parallelism.' },
          { h: 'Offsets & checkpoints', d: 'Consumers record the last processed offset (checkpoint) so a restart resumes at the right place — at-least-once by default.' },
          { h: 'Capture to lake', d: 'Turn on Capture and every N minutes / MB the hub flushes a Parquet/Avro file to ADLS — Bronze arrives with zero code.' },
        ],
        code: {
          lang: 'concept',
          text: "producer.send(event, key=orderId)   # key -> one partition, ordered\n\nHub \"orders\"  [P0][P1][P2][P3]      # 4 ordered logs\n  consumer-group \"realtime\"  -> Stream Analytics\n  consumer-group \"archive\"   -> Capture -> ADLS /bronze (Parquet)",
        },
      },
      deUseCase: {
        lead: 'Event Hubs is the front door for real-time data on Azure: clickstream, IoT telemetry and app events land here, then split to a hot path (Stream Analytics / Databricks) and a cold path (Capture → ADLS Bronze).',
        bullets: [
          { h: 'Lambda ingress', d: 'One hub feeds both a streaming aggregator (hot) and Capture-to-lake (cold) via separate consumer groups.' },
          { h: 'Databricks Structured Streaming', d: 'Databricks reads Event Hubs (or its Kafka endpoint) directly into a streaming DataFrame for real-time Silver tables.' },
        ],
      },
      integrations: [
        { id: 'stream-analytics', label: 'Stream Analytics', note: 'real-time SQL over the stream' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'Capture target' },
        { label: 'Databricks Structured Streaming', note: 'reads via Kafka/EH connector' },
        { label: 'Kafka clients', note: 'Kafka-compatible endpoint' },
      ],
      runtime: {
        lead: 'Ordering is guaranteed only within a partition, never across the hub. Consumer parallelism is capped by partition count, and partition count is fixed at creation on Standard — so you size partitions for peak consumer parallelism up front.',
        bullets: [
          { h: 'At-least-once', d: 'Checkpointing after processing means a crash can reprocess a few events — downstream must be idempotent.' },
          { h: 'Partition count is a ceiling', d: 'You can add TUs for throughput, but you cannot exceed partition count in consumer parallelism; choose it for future peak.' },
          { h: 'Auto-Inflate', d: 'Standard tier can auto-scale throughput units upward under load (never down automatically).' },
        ],
      },
      interview: [
        { q: 'Event Hubs vs Kafka — what is the relationship?', a: 'Event Hubs is a managed partitioned-log service with the same core model as Kafka (partitions, consumer groups, offsets) and it exposes a Kafka-protocol endpoint so Kafka clients work unchanged. You get the Kafka programming model without running or patching a Kafka cluster.' },
        { q: 'How is ordering guaranteed in Event Hubs?', a: 'Only within a single partition. Send events that must stay ordered with the same partition key (e.g. orderId) so they land in one partition. Across partitions there is no global order — that is the trade for horizontal scale.' },
        { q: 'What is a consumer group?', a: 'An independent reader view over the whole hub with its own offset tracking. Multiple consumer groups let different downstreams (real-time analytics, archival, audit) each read the full stream at their own pace without interfering.' },
        { q: 'What is Event Hubs Capture?', a: 'A built-in feature that automatically writes the incoming stream to ADLS/Blob as Avro or Parquet on a time/size window — a zero-code cold path that lands raw events in the Bronze layer while the hot path consumes the same stream live.' },
      ],
    },

    {
      id: 'stream-analytics', name: 'Azure Stream Analytics', category: 'streaming',
      aka: 'ASA — serverless real-time SQL over streams',
      tagline: 'A managed, serverless engine that runs SQL-like queries continuously over streaming inputs (Event Hubs/IoT Hub), computing windowed aggregations and emitting results to sinks in seconds — no cluster to manage.',
      keyFacts: [
        { k: 'Language', v: 'Stream Analytics Query Language (SQL)' },
        { k: 'Inputs', v: 'Event Hubs, IoT Hub, Blob' },
        { k: 'Windows', v: 'Tumbling/Hopping/Sliding/Session' },
        { k: 'Scale unit', v: 'Streaming Units (SU)' },
      ],
      what: {
        lead: 'Stream Analytics lets you express real-time processing as SQL. You define inputs, a query with temporal windows, and outputs; ASA runs it 24/7, continuously ingesting, computing and emitting — fully serverless.',
        bullets: [
          { h: 'Temporal windows', d: 'Tumbling (fixed, non-overlapping), Hopping (overlapping), Sliding (event-driven), Session (gap-based) windows for time aggregations.' },
          { h: 'Built-in temporal joins', d: 'JOIN two streams within a time bound, or join a stream to reference data (a slowly-changing lookup blob).' },
          { h: 'Serverless SUs', d: 'Capacity is Streaming Units; you scale SUs, not VMs. No infrastructure to patch.' },
        ],
      },
      why: {
        lead: 'For many real-time use cases you do not want to write and operate Spark/Flink code. ASA gives windowed streaming analytics in familiar SQL with sub-second-to-seconds latency and automatic checkpointing.',
        bullets: [
          { h: 'Low-code real time', d: 'Analysts who know SQL can build dashboards-over-streams without distributed-systems expertise.' },
          { h: 'Exactly-once to some sinks', d: 'ASA checkpoints internally and can deliver exactly-once to selected outputs (e.g. SQL) — strong correctness with no manual state code.' },
        ],
      },
      how: {
        lead: 'ASA assigns event time from a timestamp field, buffers events to tolerate out-of-order arrival, applies the windowed query, and writes results to outputs. Watermarks and late-arrival tolerance are configuration, not code.',
        bullets: [
          { h: 'Event time + watermarks', d: 'TIMESTAMP BY chooses the event-time column; late-arrival and out-of-order windows bound how long ASA waits before closing a window.' },
          { h: 'Query parallelism', d: 'Partition-aligned queries (PARTITION BY, matching input partitions) scale linearly across SUs.' },
        ],
        code: {
          lang: 'Stream Analytics SQL',
          text: "SELECT category,\n       System.Timestamp() AS window_end,\n       COUNT(*) AS orders,\n       SUM(amount) AS revenue\nINTO   [powerbi-out]\nFROM   [eventhub-orders] TIMESTAMP BY event_time\nGROUP BY category, TumblingWindow(minute, 5)",
        },
      },
      deUseCase: {
        lead: 'ASA powers the hot path of a real-time platform: live KPIs, fraud/anomaly thresholds and IoT telemetry aggregation, reading from Event Hubs and pushing to Power BI, SQL or back to a hub.',
        bullets: [
          { h: 'Live dashboards', d: 'Event Hubs → ASA 5-minute tumbling revenue → Power BI streaming dataset.' },
          { h: 'Alerting', d: 'Threshold query over a sliding window emits to a hub/queue that triggers an alert function.' },
        ],
      },
      integrations: [
        { id: 'event-hubs', label: 'Event Hubs', note: 'primary input' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'output sink' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'reference data / output' },
        { label: 'Power BI', note: 'real-time dashboard sink' },
      ],
      runtime: {
        lead: 'Throughput hinges on matching query partitioning to input partitions: an embarrassingly-parallel (partition-aligned) query scales linearly with SUs; a query that shuffles across partitions bottlenecks. Watermark/late-arrival settings trade latency against completeness.',
        bullets: [
          { h: 'SU utilization', d: 'The SU % metric is the health signal; sustained high utilization means add SUs or repartition the query.' },
          { h: 'Late & out-of-order', d: 'Configurable tolerance decides when a window is finalized — larger tolerance = more correct but higher latency.' },
        ],
      },
      interview: [
        { q: 'What window types does Stream Analytics support?', a: 'Tumbling (fixed non-overlapping), Hopping (fixed size, overlapping by a hop), Sliding (emits when events enter/leave the window), and Session (groups events separated by gaps). Tumbling is the default for periodic aggregations like "revenue per 5 minutes".' },
        { q: 'Stream Analytics vs Databricks Structured Streaming?', a: 'ASA is serverless, SQL-only, low-ops — great for standard windowed analytics and IoT with minimal code. Databricks Structured Streaming is code-first (Python/Scala), far more flexible (arbitrary transforms, ML, Delta sinks, complex state), and scales bigger, at the cost of running and tuning clusters. Choose ASA for simple SQL real-time; Databricks for rich or large pipelines.' },
        { q: 'How does ASA handle late-arriving events?', a: 'You set TIMESTAMP BY to use event time, plus late-arrival and out-of-order tolerance windows. ASA buffers up to that tolerance and reorders before finalizing a window, trading a bit of latency for correctness. Events beyond the tolerance are dropped or adjusted per policy.' },
      ],
    },

    /* ── ANALYTICS & WAREHOUSE ───────────────────────────── */
    {
      id: 'synapse-analytics', name: 'Azure Synapse Analytics', category: 'analytics',
      aka: 'formerly Azure SQL Data Warehouse (dedicated SQL pools)',
      tagline: 'An integrated analytics platform bringing together an MPP data warehouse (dedicated SQL pools), serverless SQL, Spark pools and pipelines under one Synapse Studio — Azure’s "warehouse + lake in one workspace" play.',
      keyFacts: [
        { k: 'DW engine', v: 'MPP (dedicated SQL pool)' },
        { k: 'Scale unit', v: 'DWU (Data Warehouse Units)' },
        { k: 'Distributions', v: '60 (hash/round-robin/replicate)' },
        { k: 'Also includes', v: 'Serverless SQL + Spark pools' },
      ],
      what: {
        lead: 'Synapse is an umbrella workspace. Its flagship is the dedicated SQL pool — a Massively Parallel Processing (MPP) warehouse that shards a table across 60 distributions and computes in parallel. It also bundles serverless SQL, Apache Spark pools and Synapse Pipelines (ADF engine).',
        bullets: [
          { h: 'MPP architecture', d: 'A control node plans the query and farms work to compute nodes; data is spread across 60 distributions so scans and joins run in parallel.' },
          { h: 'Distribution strategy', d: 'Tables are Hash-distributed (large facts, on a join key), Round-robin (staging), or Replicated (small dimensions copied to every node).' },
          { h: 'DWU scaling', d: 'Compute is provisioned in DWUs and can pause when idle to stop compute billing while storage persists.' },
        ],
      },
      why: {
        lead: 'Terabyte-to-petabyte SQL analytics need parallelism no single-box database can give. MPP splits the data and the work; getting the distribution key right is what makes joins avoid expensive data movement.',
        bullets: [
          { h: 'Parallel at scale', d: 'A star-schema join across billions of rows runs across 60 distributions at once instead of one engine.' },
          { h: 'Minimize data movement', d: 'Co-locating fact and dimension on the same hash key means the join happens locally per node — the core MPP tuning lever.' },
          { h: 'One workspace', d: 'Warehouse, lake queries, Spark and orchestration share security and Studio — less integration glue.' },
        ],
      },
      how: {
        lead: 'The control node compiles a distributed query plan; where a join needs matching rows on the same node, the engine performs data movement (shuffle/broadcast). Good distribution + partitioning + columnstore indexes minimize that movement.',
        bullets: [
          { h: 'Clustered columnstore', d: 'Fact tables use columnstore for compression and segment elimination; keep enough rows per partition to fill rowgroups.' },
          { h: 'Replicated dimensions', d: 'Small dims replicated to every distribution eliminate broadcast movement on joins.' },
          { h: 'Result-set caching + statistics', d: 'Up-to-date statistics let the optimizer choose movement-minimizing plans; caching serves repeat queries instantly.' },
        ],
        code: {
          lang: 'T-SQL (dedicated pool)',
          text: "CREATE TABLE fact_orders (\n  order_id BIGINT, customer_id BIGINT, amount DECIMAL(12,2), order_date DATE\n)\nWITH (\n  DISTRIBUTION = HASH(customer_id),   -- co-locate with dim_customer\n  CLUSTERED COLUMNSTORE INDEX,\n  PARTITION (order_date RANGE RIGHT FOR VALUES ('2026-01-01'))\n);",
        },
      },
      deUseCase: {
        lead: 'Synapse dedicated pools serve the Gold/serving layer: curated star schemas that BI tools query at scale. Synapse Pipelines land and shape data; Spark pools or Databricks build Silver; the SQL pool serves it.',
        bullets: [
          { h: 'Enterprise DW', d: 'Star schema of fact_orders + dimensions, hash-distributed for fast joins, powering Power BI at concurrency.' },
          { h: 'Lake + warehouse', d: 'Serverless SQL queries Parquet in ADLS directly; dedicated pool holds the curated marts.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'external tables / PolyBase' },
        { id: 'data-factory', label: 'Data Factory / Pipelines', note: 'load & orchestrate' },
        { id: 'synapse-serverless', label: 'Serverless SQL', note: 'same workspace' },
        { label: 'Power BI', note: 'BI serving layer' },
      ],
      runtime: {
        lead: 'The dominant runtime cost is data movement between distributions during joins and aggregations. A well-chosen hash key (matching join keys, high cardinality, even distribution) keeps joins local; a bad key causes skew and shuffles that dominate query time.',
        bullets: [
          { h: 'Data skew', d: 'A low-cardinality or lumpy hash key overloads a few distributions — the classic MPP performance bug.' },
          { h: 'Concurrency slots', d: 'DWU level sets memory and concurrency; resource classes govern how much memory each query gets.' },
          { h: 'Pause to save cost', d: 'Pausing a dedicated pool stops compute billing entirely while storage remains.' },
        ],
      },
      interview: [
        { q: 'Explain distribution in a Synapse dedicated SQL pool.', a: 'Data is spread across 60 distributions. Hash distribution assigns rows by a column’s hash — use it for large fact tables on their join key so joins stay local. Round-robin spreads evenly with no key — good for staging. Replicated copies a small table to every node — good for dimensions. Matching fact and dimension on the same hash key avoids data movement, which is the main MPP tuning goal.' },
        { q: 'What causes slow queries in Synapse and how do you fix them?', a: 'Usually excessive data movement (shuffles/broadcasts) from a poor distribution key, or data skew from a lumpy hash key. Fixes: distribute facts on the join key, replicate small dimensions, keep statistics updated, use clustered columnstore with enough rows per partition, and avoid over-partitioning (which starves rowgroups).' },
        { q: 'Synapse dedicated pool vs serverless SQL pool?', a: 'Dedicated pool is provisioned MPP compute (DWUs) for a persistent, tuned warehouse — you pay for the pool and pause it when idle. Serverless SQL is on-demand, pay-per-TB-scanned querying of files in the lake with no infrastructure — great for ad-hoc lake queries and no curated storage. Same T-SQL surface, different cost/perf model.' },
        { q: 'How does Synapse relate to Databricks?', a: 'Overlapping but different centers of gravity. Synapse leads with a T-SQL MPP warehouse plus bundled Spark/serverless/pipelines. Databricks leads with best-in-class Spark + Delta Lakehouse and Unity Catalog. Many shops use Databricks for engineering/ML on the lake and Synapse (or Databricks SQL) as the SQL serving layer.' },
      ],
    },

    {
      id: 'synapse-serverless', name: 'Synapse Serverless SQL Pool', category: 'analytics',
      aka: 'SQL-on-demand — query the lake in place',
      tagline: 'A serverless, pay-per-query T-SQL engine that reads Parquet/CSV/JSON and Delta directly from ADLS with no data loading and no infrastructure — the "just SQL my lake files" tool, billed per TB scanned.',
      keyFacts: [
        { k: 'Model', v: 'Serverless, on-demand' },
        { k: 'Billing', v: 'Per TB of data processed' },
        { k: 'Reads', v: 'Parquet, CSV, JSON, Delta' },
        { k: 'State', v: 'No storage — query in place' },
      ],
      what: {
        lead: 'The serverless SQL pool is always available and provisioned per query. You point OPENROWSET or an external table at files in ADLS and run T-SQL; there is nothing to size, start or pause.',
        bullets: [
          { h: 'OPENROWSET / external tables', d: 'Read files ad-hoc with OPENROWSET, or define external tables + views for a stable schema over lake paths.' },
          { h: 'Schema-on-read', d: 'Structure is applied at query time; no ingestion step, so new files are queryable immediately.' },
          { h: 'Logical views', d: 'Wrap partitioned Parquet folders in views that expose a clean table to BI without moving data.' },
        ],
      },
      why: {
        lead: 'Loading data into a warehouse just to explore it is wasteful. Serverless SQL lets analysts query raw and curated lake files with familiar T-SQL and pay only for bytes scanned.',
        bullets: [
          { h: 'No infra, no idle cost', d: 'You never pay for a running pool — only per query, per TB scanned.' },
          { h: 'Fast lake exploration', d: 'Profile a new dataset the moment it lands in Bronze, no pipeline required.' },
        ],
      },
      how: {
        lead: 'The engine parses the query, prunes files using folder partitioning and Parquet column/row-group statistics, scans only needed columns, and streams results. Cost and speed both depend on scanning less.',
        bullets: [
          { h: 'Partition pruning', d: 'filepath()/filename() functions and folder structure (e.g. /year=2026/month=09) let the engine skip irrelevant files.' },
          { h: 'Columnar pushdown', d: 'Parquet lets it read only referenced columns and skip row groups via min/max stats — fewer TB scanned, lower bill.' },
        ],
        code: {
          lang: 'T-SQL (serverless)',
          text: "SELECT category, SUM(amount) AS revenue\nFROM OPENROWSET(\n  BULK 'https://shopkart.dfs.core.windows.net/silver/orders/**',\n  FORMAT = 'PARQUET'\n) AS rows\nWHERE rows.filepath(1) = '2026'   -- partition prune by folder\nGROUP BY category;",
        },
      },
      deUseCase: {
        lead: 'It is the ad-hoc and logical-serving layer over the lake: data profiling on Bronze, a SQL view layer over Silver/Gold Parquet for BI, and one-off exploration without touching a dedicated pool.',
        bullets: [
          { h: 'Logical data warehouse', d: 'Views over curated Parquet/Delta give BI a SQL surface with no ETL into a warehouse.' },
          { h: 'Data validation', d: 'Quick counts/quality checks on freshly landed files inside a pipeline.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'the data it queries' },
        { id: 'synapse-analytics', label: 'Synapse workspace', note: 'same Studio' },
        { label: 'Power BI', note: 'DirectQuery over views' },
      ],
      runtime: {
        lead: 'There is no cluster to tune — performance and cost are governed almost entirely by how much data each query scans. Partitioned folders, Parquet/Delta (not CSV), and selecting only needed columns are the levers.',
        bullets: [
          { h: 'Bill = bytes scanned', d: 'CSV forces full-row scans; Parquet/Delta enable pruning — the same query can cost 10× less on Parquet.' },
          { h: 'No caching of results', d: 'Each run re-scans; materialize hot results as a CETAS table if repeated.' },
        ],
      },
      interview: [
        { q: 'How is serverless SQL billed and how do you keep cost down?', a: 'Per terabyte of data processed by each query. Cut cost by scanning less: store data as Parquet/Delta (not CSV) for columnar pruning, partition folders so the engine can skip files, and select only the columns you need. A query touching one partition and three columns scans a fraction of the data.' },
        { q: 'When would you use serverless vs a dedicated SQL pool?', a: 'Serverless for ad-hoc exploration, data profiling, and a logical view layer over lake files with no infra and pay-per-query. Dedicated pool for a persistent, tuned, high-concurrency warehouse serving curated marts to many BI users, where predictable performance justifies provisioned MPP compute.' },
      ],
    },

    /* ── DATABASES ───────────────────────────────────────── */
    {
      id: 'azure-sql', name: 'Azure SQL Database', category: 'databases',
      aka: 'Managed (PaaS) SQL Server engine',
      tagline: 'A fully-managed relational database built on the SQL Server engine — the OLTP workhorse behind apps and a very common source for data pipelines, with automated HA, backups and patching.',
      keyFacts: [
        { k: 'Engine', v: 'SQL Server (PaaS)' },
        { k: 'Purchasing', v: 'vCore / DTU' },
        { k: 'HA', v: 'Built-in, 99.99% SLA' },
        { k: 'DE role', v: 'OLTP source / CDC' },
      ],
      what: {
        lead: 'Azure SQL Database is SQL Server delivered as a managed service: you get the T-SQL engine without managing the OS, patching or backups. It targets transactional (OLTP) app workloads.',
        bullets: [
          { h: 'Deployment options', d: 'Single database, Elastic Pool (shared resources across many DBs), or Managed Instance (near-100% SQL Server surface for lift-and-shift).' },
          { h: 'Purchasing models', d: 'vCore (choose cores/memory, Hyperscale for huge DBs) or DTU (bundled blended unit).' },
          { h: 'Serverless tier', d: 'Auto-pause/scale compute for spiky or dev workloads, billed per second of use.' },
        ],
      },
      why: {
        lead: 'Apps need a reliable transactional store; teams want the SQL Server engine without running it. For data engineers it is one of the most common upstream sources — and the place change data capture originates.',
        bullets: [
          { h: 'Managed HA & DR', d: 'Automatic backups, point-in-time restore, active geo-replication and a 99.99% SLA with no infra work.' },
          { h: 'Familiar & rich', d: 'Full T-SQL, stored procedures, and tooling that teams already know.' },
        ],
      },
      how: {
        lead: 'Behind the scenes it runs the SQL Server engine on Azure infrastructure with automated replicas for HA. Data engineers connect via ADF or Spark JDBC to extract, often incrementally via a watermark or CDC/Change Tracking.',
        bullets: [
          { h: 'Change Data Capture / Change Tracking', d: 'Surfaces inserts/updates/deletes so pipelines pull only what changed instead of full reloads.' },
          { h: 'Hyperscale', d: 'A storage architecture that decouples compute from a distributed page store, scaling to 100 TB with fast backups/restores.' },
        ],
      },
      deUseCase: {
        lead: 'In pipelines Azure SQL is typically the OLTP source: ADF or Databricks extracts incrementally into ADLS Bronze, or CDC feeds a near-real-time stream. It can also serve small curated marts.',
        bullets: [
          { h: 'CDC ingestion', d: 'Enable CDC; ADF/Databricks reads change tables and merges into a Delta Silver table.' },
          { h: 'Watermark extract', d: 'Nightly copy of rows where modified_date > last watermark into the lake.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'primary extract path' },
        { id: 'key-vault', label: 'Key Vault', note: 'connection secrets' },
        { id: 'stream-analytics', label: 'Stream Analytics', note: 'output sink' },
        { label: 'Databricks (JDBC)', note: 'read/write via spark.read.jdbc' },
      ],
      runtime: {
        lead: 'Tuned for many small transactional reads/writes with row-store indexes, not big analytical scans. Pulling huge volumes for analytics can pressure the OLTP workload — hence extracting to the lake for heavy processing.',
        bullets: [
          { h: 'OLTP, not OLAP', d: 'B-tree indexes and row storage favor point lookups; large aggregations belong in the lake/warehouse.' },
          { h: 'Read replicas', d: 'Offload reporting/extract reads to a geo/read replica to protect the primary’s transactional latency.' },
        ],
      },
      interview: [
        { q: 'How do you ingest from Azure SQL into a lake incrementally?', a: 'Prefer change-based extraction: enable CDC or Change Tracking to pull only inserted/updated/deleted rows, or use a watermark column (max modified_date/id) tracked per table. ADF or Databricks reads the delta and MERGEs it into a Delta Silver table, avoiding costly full reloads and reducing load on the OLTP primary.' },
        { q: 'Azure SQL Database vs Managed Instance vs Synapse?', a: 'Azure SQL Database is PaaS SQL Server for OLTP apps. Managed Instance gives near-full SQL Server surface (SQL Agent, cross-DB queries) for lift-and-shift. Synapse dedicated pool is an MPP analytical warehouse for OLAP. Rule of thumb: transactions → SQL Database/MI; large analytical scans → Synapse/Databricks.' },
      ],
    },

    {
      id: 'cosmos-db', name: 'Azure Cosmos DB', category: 'databases',
      aka: 'Globally-distributed, multi-model NoSQL',
      tagline: 'A turnkey globally-distributed NoSQL database with single-digit-millisecond latency, elastic partitioned scale, tunable consistency, and a Change Feed that makes it a natural streaming source for pipelines.',
      keyFacts: [
        { k: 'Model', v: 'NoSQL (multi-API)' },
        { k: 'Scale', v: 'Partition key + RU/s' },
        { k: 'Consistency', v: '5 levels (strong → eventual)' },
        { k: 'DE hook', v: 'Change Feed' },
      ],
      what: {
        lead: 'Cosmos DB is a managed NoSQL service that partitions data horizontally and can replicate it across regions. It offers multiple APIs (NoSQL/Core, MongoDB, Cassandra, Gremlin, Table) over one engine.',
        bullets: [
          { h: 'Partition key', d: 'Every container has a partition key that shards documents into logical partitions — choosing it well is the whole game for scale and cost.' },
          { h: 'Request Units (RU/s)', d: 'Throughput is provisioned/auto-scaled in RUs; every read/write costs RUs by size and complexity.' },
          { h: 'Five consistency levels', d: 'Strong, Bounded Staleness, Session, Consistent Prefix, Eventual — tune latency/availability vs freshness.' },
        ],
      },
      why: {
        lead: 'Global apps need low-latency reads/writes everywhere with elastic scale that relational DBs struggle to give. Cosmos delivers turnkey global distribution and predictable latency SLAs.',
        bullets: [
          { h: 'Global, low latency', d: 'Multi-region writes and <10ms reads/writes at the 99th percentile under SLA.' },
          { h: 'Elastic partitioned scale', d: 'Add RUs and partitions transparently as traffic grows.' },
          { h: 'Change Feed', d: 'An ordered, persistent log of changes per partition — a built-in event source for pipelines.' },
        ],
      },
      how: {
        lead: 'Documents route to a logical partition by partition key; logical partitions map to physical partitions the service scales automatically. Reads/writes debit RUs; hot or unbalanced keys cause throttling (429) and skew.',
        bullets: [
          { h: 'Avoid hot partitions', d: 'A high-cardinality, evenly-accessed partition key spreads load; a lumpy key overloads one physical partition.' },
          { h: 'Change Feed consumers', d: 'Azure Functions or Spark read the Change Feed to propagate changes downstream in near real time.' },
        ],
      },
      deUseCase: {
        lead: 'For data engineers Cosmos is both a source and a serving store: the Change Feed streams operational changes into the lake, and the Analytical Store (Synapse Link) enables HTAP analytics without touching the transactional side.',
        bullets: [
          { h: 'Change Feed → lake', d: 'A Function/Spark job tails the Change Feed and lands changes in Bronze for near-real-time analytics.' },
          { h: 'Azure Synapse Link', d: 'A no-ETL analytical column store over Cosmos data queried directly from Synapse — HTAP without ETL.' },
        ],
      },
      integrations: [
        { id: 'synapse-analytics', label: 'Synapse Link', note: 'HTAP analytical store' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'Change Feed landing' },
        { label: 'Azure Functions', note: 'Change Feed processor' },
      ],
      runtime: {
        lead: 'Everything is governed by RUs and the partition key. Under-provisioned RUs or a hot partition cause 429 throttling; cross-partition queries fan out and cost more RUs than a single-partition lookup.',
        bullets: [
          { h: '429 = throttled', d: 'Exceeding provisioned RU/s returns 429; SDKs retry with backoff, or you scale RUs / fix the key.' },
          { h: 'Single-partition reads are cheapest', d: 'Include the partition key in queries to hit one partition; cross-partition fan-out multiplies RU cost.' },
        ],
      },
      interview: [
        { q: 'Why is the partition key the most important design choice in Cosmos DB?', a: 'It determines how data and load are distributed. A high-cardinality key with even access spreads reads/writes across physical partitions for linear scale. A poor (low-cardinality or lumpy) key creates a hot partition that throttles (429) regardless of total provisioned RUs. You cannot change a container’s partition key later, so it must be right up front.' },
        { q: 'What are Request Units?', a: 'A normalized currency for throughput — each operation costs RUs based on payload size, indexing and complexity. You provision or auto-scale RU/s; exceeding them throttles requests. Cost/perf tuning in Cosmos is largely about minimizing RUs per operation (efficient queries, right indexes, single-partition reads).' },
        { q: 'How do you get Cosmos data into an analytics platform?', a: 'Two main ways: the Change Feed (an ordered per-partition change log) consumed by Functions/Spark to stream changes into the lake, or Azure Synapse Link, which maintains a separate analytical column store over the same data for HTAP queries from Synapse with no ETL and no impact on the transactional workload.' },
      ],
    },

    /* ── GOVERNANCE & SECURITY ───────────────────────────── */
    {
      id: 'purview', name: 'Microsoft Purview', category: 'governance',
      aka: 'formerly Azure Purview — unified data governance',
      tagline: 'A unified data-governance service that scans sources to build an enterprise data map: automated catalog, end-to-end lineage, classification of sensitive data, and a searchable glossary across cloud and on-prem.',
      keyFacts: [
        { k: 'Core', v: 'Data Map + Catalog' },
        { k: 'Discovers', v: 'Schema, lineage, PII' },
        { k: 'Scans', v: 'ADLS, SQL, Synapse, PowerBI+' },
        { k: 'Analog', v: 'Databricks Unity Catalog (partly)' },
      ],
      what: {
        lead: 'Purview registers data sources and scans them to populate a Data Map — a graph of assets, their schemas, classifications and lineage. On top sits a searchable catalog and business glossary so people can find and trust data.',
        bullets: [
          { h: 'Data Map', d: 'The metadata backbone: assets, schemas, relationships and lineage discovered by scans.' },
          { h: 'Classification', d: 'Built-in and custom classifiers detect sensitive data (emails, credit cards, national IDs) and tag it automatically.' },
          { h: 'Lineage', d: 'Captures how data flows through ADF/Synapse/Databricks so you can trace a column back to its source.' },
        ],
      },
      why: {
        lead: 'As data spreads across lakes, warehouses and pipelines, nobody can find or trust it and compliance can’t prove where PII lives. Purview gives one catalog, automated sensitivity labeling, and lineage for impact analysis.',
        bullets: [
          { h: 'Discoverability', d: 'A single search across all registered sources — analysts find the right dataset instead of re-deriving it.' },
          { h: 'Compliance', d: 'Automated PII classification and lineage answer "where is sensitive data and what feeds this report".' },
        ],
      },
      how: {
        lead: 'You register a source, configure a scan (with a managed or self-hosted integration runtime for private networks), and Purview crawls schemas, samples data to classify it, and stitches lineage from pipeline metadata.',
        bullets: [
          { h: 'Scan rulesets', d: 'Control what is scanned and which classifiers apply; schedule incremental scans as data changes.' },
          { h: 'Lineage from engines', d: 'ADF, Synapse and (via connectors) Databricks push operation metadata so Purview draws source→target lineage.' },
        ],
      },
      deUseCase: {
        lead: 'Purview is the governance layer over an Azure data estate: catalog the medallion lake, classify PII in Bronze/Silver, and expose lineage so a broken Gold table can be traced to its upstream source.',
        bullets: [
          { h: 'PII audit', d: 'Scan ADLS + SQL, auto-classify sensitive columns, report where regulated data lives.' },
          { h: 'Impact analysis', d: 'Before changing a source schema, use lineage to see every downstream table and report affected.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'scanned source' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'scanned source' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'source + lineage' },
        { id: 'data-factory', label: 'Data Factory', note: 'lineage emitter' },
        { label: 'Databricks / Unity Catalog', note: 'overlapping governance' },
      ],
      runtime: {
        lead: 'Scans are the main workload: classification samples data and can be I/O heavy, so schedule off-peak and use incremental scans. Lineage completeness depends on the source engines emitting operation metadata.',
        bullets: [
          { h: 'Scan cost', d: 'Billed by vCore-hours of scanning + Data Map capacity units; incremental scans keep it economical.' },
          { h: 'Private access', d: 'A self-hosted integration runtime lets scans reach sources inside a VNet or on-prem.' },
        ],
      },
      interview: [
        { q: 'What problem does Purview solve?', a: 'Discovery, trust and compliance across a sprawling data estate. It scans sources into a Data Map, auto-classifies sensitive data, and captures lineage — so people can find datasets, prove where PII lives, and trace a report back to source for impact analysis. It is the enterprise catalog/governance layer over lakes, warehouses and pipelines.' },
        { q: 'How does Purview relate to Databricks Unity Catalog?', a: 'They overlap on governance but operate at different layers. Unity Catalog is Databricks’ native governance — it enforces access control, lineage and auditing on data in Databricks. Purview is a broader estate-wide catalog that scans many sources (ADLS, SQL, Synapse, Power BI, on-prem) for discovery, classification and cross-system lineage. Enterprises often use Unity Catalog to govern the lakehouse and Purview to catalog everything, with connectors bridging them.' },
        { q: 'How does Purview build lineage?', a: 'Engines like ADF and Synapse emit operation metadata (which sources produced which targets) that Purview stitches into a source→target graph. Scans provide the assets and schemas; the pipeline metadata provides the edges. Coverage depends on each engine supporting lineage emission.' },
      ],
    },

    {
      id: 'entra-id', name: 'Microsoft Entra ID + RBAC', category: 'governance',
      aka: 'formerly Azure Active Directory (Azure AD)',
      tagline: 'Azure’s cloud identity and access backbone: Entra ID authenticates users and workloads (managed identities, service principals) and Azure RBAC authorizes what each identity can do on resources.',
      keyFacts: [
        { k: 'Entra ID', v: 'Authentication (who)' },
        { k: 'Azure RBAC', v: 'Authorization (what)' },
        { k: 'Workload identity', v: 'Managed Identity / SP' },
        { k: 'Extras', v: 'Conditional Access, PIM, MFA' },
      ],
      what: {
        lead: 'Entra ID is the identity provider — it verifies who a principal is (a user, group, service principal, or managed identity) and issues tokens. Azure RBAC then decides what that principal may do, by assigning roles at a scope.',
        bullets: [
          { h: 'Principals', d: 'Users, groups, service principals (app identities), and managed identities (Azure-managed credentials for resources).' },
          { h: 'RBAC = role + scope + principal', d: 'A role assignment grants a role (e.g. Storage Blob Data Reader) to a principal at a scope (subscription/RG/resource).' },
          { h: 'Managed identities', d: 'System- or user-assigned identities let a Data Factory or Databricks reach storage with no secrets in code.' },
        ],
      },
      why: {
        lead: 'Data platforms must control who and what can touch data, without scattering passwords. Entra + managed identities give passwordless, centrally-governed, auditable access — the foundation of least privilege.',
        bullets: [
          { h: 'No secrets', d: 'Managed identities remove connection-string passwords; the platform authenticates as itself.' },
          { h: 'Least privilege', d: 'RBAC roles scoped tightly (this container, read-only) limit blast radius.' },
          { h: 'Central policy', d: 'Conditional Access, MFA and PIM enforce security posture across every service at once.' },
        ],
      },
      how: {
        lead: 'A service authenticates to Entra as its managed identity, receives a token, and calls a resource; the resource checks Azure RBAC role assignments at the relevant scope to authorize. On ADLS, RBAC combines with POSIX ACLs for folder-level control.',
        bullets: [
          { h: 'Token flow', d: 'Identity → Entra issues OAuth token → resource validates token + evaluates RBAC.' },
          { h: 'Scope inheritance', d: 'Roles assigned at a higher scope (subscription) inherit down to resource groups and resources.' },
          { h: 'PIM & Conditional Access', d: 'Privileged Identity Management gives just-in-time elevation; Conditional Access gates by device, location, MFA.' },
        ],
      },
      deUseCase: {
        lead: 'Every secure Azure pipeline rests on this: Data Factory and Databricks use managed identities (granted Storage Blob Data roles) to read/write ADLS with no keys, and data-team access is governed by RBAC + ADLS ACLs.',
        bullets: [
          { h: 'Passwordless pipeline', d: 'ADF’s managed identity gets Storage Blob Data Contributor on the lake — no keys in linked services.' },
          { h: 'Team access model', d: 'Groups mapped to RBAC roles + folder ACLs implement least-privilege on Bronze/Silver/Gold.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'RBAC + POSIX ACLs' },
        { id: 'key-vault', label: 'Key Vault', note: 'access policies / RBAC' },
        { id: 'data-factory', label: 'Data Factory', note: 'managed identity' },
        { label: 'Databricks', note: 'UC + Entra passthrough' },
      ],
      runtime: {
        lead: 'Authorization is evaluated on each request against RBAC assignments (and ACLs on ADLS); role changes can take a short time to propagate. Tokens are cached and refreshed by the SDK/managed-identity endpoint.',
        bullets: [
          { h: 'RBAC vs ACL on ADLS', d: 'RBAC gives coarse container/account roles; POSIX ACLs refine to folders/files — both are checked.' },
          { h: 'Propagation delay', d: 'New role assignments may take minutes to take effect due to caching.' },
        ],
      },
      interview: [
        { q: 'Difference between authentication and authorization on Azure, and which service does each?', a: 'Authentication (who you are) is handled by Microsoft Entra ID, which verifies the principal and issues a token. Authorization (what you can do) is Azure RBAC, which assigns roles to that principal at a scope. On ADLS, RBAC is combined with POSIX ACLs for fine-grained folder-level authorization.' },
        { q: 'What is a managed identity and why use it?', a: 'An Entra identity that Azure creates and rotates for a resource (like a Data Factory or VM), so the service can authenticate as itself with no stored credentials. You grant it RBAC roles (e.g. Storage Blob Data Reader) and it accesses resources passwordlessly — eliminating secrets in code and connection strings.' },
        { q: 'How do you implement least-privilege access to a data lake?', a: 'Map teams to Entra groups, assign narrowly-scoped RBAC roles (read-only, on a specific container) to those groups, and layer POSIX ACLs on ADLS folders so, say, /silver/pii is restricted. Use managed identities for services, PIM for just-in-time admin elevation, and Conditional Access/MFA for humans.' },
      ],
    },

    {
      id: 'key-vault', name: 'Azure Key Vault', category: 'governance',
      tagline: 'A managed secrets, keys and certificates store: pipelines fetch connection strings and keys from Key Vault at runtime instead of hardcoding them, with access governed by Entra and every access audited.',
      keyFacts: [
        { k: 'Stores', v: 'Secrets, keys, certificates' },
        { k: 'Access', v: 'Entra (RBAC / policies)' },
        { k: 'Backed by', v: 'Software / HSM' },
        { k: 'DE use', v: 'No secrets in code' },
      ],
      what: {
        lead: 'Key Vault centrally stores secrets (passwords, connection strings, tokens), cryptographic keys, and TLS certificates, and controls access to them via Entra identities. Services retrieve what they need at runtime.',
        bullets: [
          { h: 'Three object types', d: 'Secrets (arbitrary strings), Keys (for encrypt/sign, optionally HSM-backed), Certificates (managed lifecycle/renewal).' },
          { h: 'Entra-governed access', d: 'RBAC or access policies decide which identities can get/list/set each object; nothing is anonymous.' },
          { h: 'Versioning & soft-delete', d: 'Every secret is versioned; soft-delete/purge-protection guard against accidental loss.' },
        ],
      },
      why: {
        lead: 'Credentials in code, config files or pipeline definitions are a breach waiting to happen. Key Vault removes them from source, centralizes rotation, and audits every access.',
        bullets: [
          { h: 'No hardcoded secrets', d: 'Pipelines reference a Key Vault secret; the real value never lives in Git or a linked service.' },
          { h: 'Rotation & audit', d: 'Rotate a secret in one place; access logs feed compliance and incident response.' },
        ],
      },
      how: {
        lead: 'A service authenticates to Entra (usually via managed identity), which authorizes it against the vault’s RBAC/policies, then it reads the secret over TLS. ADF and Databricks integrate natively so secrets are referenced, never inlined.',
        bullets: [
          { h: 'ADF integration', d: 'Linked services pull passwords from a Key Vault reference instead of storing them.' },
          { h: 'Databricks secret scopes', d: 'A Key Vault-backed secret scope exposes secrets to notebooks via dbutils.secrets without revealing values.' },
        ],
      },
      deUseCase: {
        lead: 'Key Vault is the secrets backbone of every pipeline: database passwords, storage keys and API tokens live here and are referenced by ADF linked services and Databricks secret scopes at run time.',
        bullets: [
          { h: 'Pipeline credentials', d: 'ADF reads a source DB password from Key Vault; rotating it needs no pipeline change.' },
          { h: 'Databricks scopes', d: 'Notebooks read an API token via dbutils.secrets.get, keeping it out of code and logs.' },
        ],
      },
      integrations: [
        { id: 'entra-id', label: 'Entra ID', note: 'authorizes access' },
        { id: 'data-factory', label: 'Data Factory', note: 'secret references' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'stored credentials' },
        { label: 'Databricks', note: 'KV-backed secret scope' },
      ],
      runtime: {
        lead: 'Secret reads are lightweight TLS calls; SDKs cache values to avoid per-operation fetches. Access is authorized per call against Entra and logged, so throttling limits and audit trails both apply.',
        bullets: [
          { h: 'Caching', d: 'Clients cache secrets for the run to avoid hitting vault throttling limits on hot paths.' },
          { h: 'Auditing', d: 'Every get/set is logged to Azure Monitor for compliance.' },
        ],
      },
      interview: [
        { q: 'How do you keep secrets out of Databricks notebooks and ADF pipelines?', a: 'Store them in Key Vault and reference them. In Databricks, create a Key Vault-backed secret scope and read values with dbutils.secrets.get — the value is redacted in output and never in code. In ADF, linked services pull passwords from a Key Vault reference. Access is via managed identity, so no keys live in Git.' },
        { q: 'Why not just use storage account keys directly?', a: 'Account keys are long-lived, all-powerful, and easily leaked. Prefer managed identities + RBAC for passwordless access, and when a secret is unavoidable, store it in Key Vault so it is centrally rotated, access-controlled by Entra, versioned, and audited — never hardcoded.' },
      ],
    },

    /* ── MONITORING & OPS ────────────────────────────────── */
    {
      id: 'azure-monitor', name: 'Azure Monitor + Log Analytics', category: 'ops',
      tagline: 'Azure’s observability platform: Azure Monitor collects metrics and logs from every resource, Log Analytics stores and queries logs with KQL, and alerts/workbooks turn that telemetry into action.',
      keyFacts: [
        { k: 'Metrics', v: 'Numeric, near-real-time' },
        { k: 'Logs', v: 'Log Analytics workspace' },
        { k: 'Query', v: 'KQL (Kusto)' },
        { k: 'Act on it', v: 'Alerts, Workbooks' },
      ],
      what: {
        lead: 'Azure Monitor is the umbrella for telemetry. Metrics are lightweight numeric time-series; Logs are richer records sent to a Log Analytics workspace and queried with KQL. Application Insights extends it to app-level tracing.',
        bullets: [
          { h: 'Metrics vs Logs', d: 'Metrics: cheap, fast, numeric (CPU, throughput). Logs: detailed events/records in Log Analytics, queried with KQL.' },
          { h: 'Log Analytics + KQL', d: 'A workspace ingests diagnostic logs; the Kusto Query Language slices them for troubleshooting and dashboards.' },
          { h: 'Alerts & Workbooks', d: 'Metric/log alert rules fire actions (email, webhook, auto-scale); Workbooks build interactive reports.' },
        ],
      },
      why: {
        lead: 'You cannot operate pipelines you cannot see. Centralized metrics, logs and alerts let you detect failures, diagnose root cause, and prove SLAs across every Azure service from one place.',
        bullets: [
          { h: 'Single pane', d: 'ADF runs, Databricks clusters, storage throttling and SQL DTUs all land in one workspace.' },
          { h: 'Proactive alerting', d: 'Alert on a failed pipeline, a throttled storage account, or latency crossing a threshold before users notice.' },
        ],
      },
      how: {
        lead: 'Each resource emits platform metrics automatically and can route Diagnostic Settings (logs/metrics) to a Log Analytics workspace, Storage (archive) or Event Hubs (forward to a SIEM). KQL queries and alert rules run over the workspace.',
        bullets: [
          { h: 'Diagnostic settings', d: 'The switch that ships a resource’s logs to Log Analytics — without it, detailed logs are not retained.' },
          { h: 'KQL', d: 'Filter/aggregate/join logs: e.g. count failed ADF activities per pipeline over the last day.' },
        ],
        code: {
          lang: 'KQL',
          text: "ADFActivityRun\n| where Status == \"Failed\"\n| where TimeGenerated > ago(1d)\n| summarize failures = count() by PipelineName, ErrorMessage\n| order by failures desc",
        },
      },
      deUseCase: {
        lead: 'For data platforms, Monitor is the operations layer: alert on failed ADF pipelines, watch Databricks job/cluster health, catch storage throttling, and build a workbook showing pipeline SLAs and freshness.',
        bullets: [
          { h: 'Pipeline SLAs', d: 'Route ADF + Databricks logs to Log Analytics; a workbook tracks success rate and latency, alerts on breaches.' },
          { h: 'Cost/throttling watch', d: 'Alert when a storage account hits throttling or a SQL pool nears its DWU ceiling.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'run + activity logs' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'pool metrics/logs' },
        { id: 'key-vault', label: 'Key Vault', note: 'access audit logs' },
        { label: 'Databricks', note: 'cluster/job diagnostics' },
      ],
      runtime: {
        lead: 'Log ingestion and retention are the cost drivers, so route only what you need and set retention deliberately. KQL queries run over the workspace’s indexed store; high-cardinality logs cost more to ingest and query.',
        bullets: [
          { h: 'Ingestion cost', d: 'Billed per GB ingested + retention; filter noisy logs at the diagnostic-setting level.' },
          { h: 'Metrics are cheap', d: 'Platform metrics are near-free and near-real-time; prefer them for high-frequency signals, logs for detail.' },
        ],
      },
      interview: [
        { q: 'Difference between metrics and logs in Azure Monitor?', a: 'Metrics are lightweight numeric time-series (CPU %, throughput) collected at high frequency and cheap to store — good for real-time health and auto-scale triggers. Logs are richer event/records sent to a Log Analytics workspace and queried with KQL — good for detailed troubleshooting and correlation. You alert on both, but pick metrics for high-frequency numeric signals and logs for detail.' },
        { q: 'How would you monitor a data pipeline built on ADF and Databricks?', a: 'Enable diagnostic settings on ADF and Databricks to ship run/activity and cluster/job logs to a Log Analytics workspace. Use KQL to track failed activities, durations and data volumes; build a Workbook for pipeline SLAs and freshness; and configure alert rules to fire on failures, latency breaches, or storage throttling so issues are caught before users report them.' },
      ],
    },
  ];

  TV.AzureServices = AZURE_SERVICES;
})();
