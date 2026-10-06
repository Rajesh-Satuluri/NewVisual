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
  };
})();
