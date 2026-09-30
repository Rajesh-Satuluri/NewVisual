/* ============================================================
   Snowflake Concepts — component definitions, interview Q&A,
   best practices, advantages, limitations for all 12 modules.
   ============================================================ */

(function () {
  'use strict';

  const SnowflakeConcepts = {

    /* ── Architecture Layers ─────────────────────────────────── */
    architectureLayers: [
      {
        id: 'cloud-services',
        name: 'Cloud Services Layer',
        subtitle: 'The Brain',
        color: '#29b5e8',
        icon: '☁️',
        description: 'Always-on, multi-tenant infrastructure that coordinates every query. No dedicated compute — billed per second used.',
        components: ['Authentication & SSO', 'Query Parser & Optimizer', 'Metadata Manager', 'Transaction Manager', 'Access Control (RBAC)', 'Infrastructure Manager'],
        interviewQs: [
          {
            q: 'What is the Cloud Services Layer and why does it matter?',
            a: 'It is Snowflake\'s always-on "brain" — a multi-tenant set of services: authentication/SSO, the SQL parser and cost-based optimizer, the metadata store, transaction management, and RBAC access control. It matters because metadata operations (SHOW commands, result-cache hits, min/max pruning) run here without spinning up a warehouse, and the optimal plan is built before any data is scanned — saving both time and credits.',
          },
          {
            q: 'How does Snowflake handle query optimization differently from traditional DBs?',
            a: 'Traditional databases rely on manually maintained indexes, statistics, and partitions. Snowflake has no user-managed indexes; its cost-based optimizer uses metadata it collects automatically for every micro-partition (min/max, distinct and null counts) to prune data, and it can return results straight from the result cache. Optimization happens centrally in Cloud Services, independent of the warehouse that executes the plan.',
          },
          {
            q: 'What happens in Cloud Services when a query is submitted?',
            a: 'In order: (1) authenticate the session, (2) authorize via RBAC against the active role, (3) parse and compile the SQL, (4) build a cost-based plan and prune micro-partitions using metadata, (5) check the result cache — return instantly on a hit — otherwise (6) hand the compiled plan to the target virtual warehouse. Only step 6 consumes warehouse compute.',
          },
        ],
        netflix: 'When a Netflix analyst logs in and runs a query, Cloud Services authenticates them via SSO, checks their ROLE, parses their SQL, builds an optimal query plan using metadata statistics, and routes execution to the right warehouse — all before a single byte of data is scanned.',
      },
      {
        id: 'virtual-warehouses',
        name: 'Virtual Warehouses (Compute)',
        subtitle: 'The Muscles',
        color: '#3fb950',
        icon: '⚡',
        description: 'Independent compute clusters. Multiple warehouses run simultaneously without contention. Each auto-suspends when idle.',
        components: ['T-Shirt Size (XS → 6XL)', 'Multi-Cluster Auto-scaling', 'Auto-Suspend / Auto-Resume', 'Local SSD Cache', 'Concurrency Scaling', 'Snowpark Optimized Nodes'],
        interviewQs: [
          {
            q: 'How does Snowflake achieve workload isolation?',
            a: 'Each virtual warehouse is an independent compute cluster with its own CPU, memory, and local SSD cache, while all warehouses read the same shared storage. Because they never share compute, a heavy job on one warehouse (e.g. ML_TRAINING_WH) has zero performance impact on another (e.g. EXEC_WH). You isolate workloads simply by giving each team or workload its own warehouse.',
          },
          {
            q: 'What is multi-cluster warehousing and when would you use it?',
            a: 'A multi-cluster warehouse automatically adds and removes identical clusters (between a MIN and MAX) as concurrent query load rises and falls. It solves concurrency, not single-query speed — use it when many users hit the same warehouse at once (e.g. a dashboard used by hundreds of analysts) so queued queries get their own cluster instead of waiting.',
          },
          {
            q: 'How does auto-suspend save money without hurting performance?',
            a: 'Warehouses bill per second only while running. Auto-suspend stops a warehouse after a configurable idle period, so you stop paying when nothing runs; auto-resume restarts it in ~1–2s on the next query. Because storage is separate, suspending loses only the local SSD cache — never data — so the saving is large while the only cost is an occasional cache warm-up.',
          },
          {
            q: 'What is the difference between concurrency scaling and multi-cluster?',
            a: 'They are the same mechanism seen two ways: multi-cluster warehousing IS how Snowflake delivers concurrency scaling — extra clusters spin up to absorb concurrent queries. Sizing a warehouse up (XS→XL) makes a single query faster (more nodes per cluster); adding clusters (multi-cluster) handles more queries at once. Scale up for slow queries, scale out for many queries.',
          },
        ],
        netflix: 'Netflix runs five separate warehouses: INGEST_WH processes Snowpipe streams, ML_TRAINING_WH runs Snowpark feature engineering, ANALYTICS_WH powers Tableau dashboards — all simultaneously with zero interference.',
      },
      {
        id: 'storage',
        name: 'Storage Layer',
        subtitle: 'The Foundation',
        color: '#a371f7',
        icon: '🗄️',
        description: 'Centralized columnar storage in cloud object storage (S3/Azure Blob/GCS). Separated from compute. Pay only for storage used.',
        components: ['Micro-Partitions (50–500MB compressed)', 'Columnar (PAX) Format', 'AES-256 Encryption at Rest', 'Automatic Compression', 'Metadata Statistics per Column', 'Time Travel File Retention'],
        interviewQs: [
          {
            q: 'What is a micro-partition? How is it different from HDFS blocks?',
            a: 'A micro-partition is an immutable ~50–500 MB (compressed) columnar file Snowflake creates automatically as data is ingested, carrying per-column metadata (min/max, distinct/null counts). Unlike HDFS blocks — fixed-size, row-oriented byte ranges with no column awareness — micro-partitions are columnar, self-describing, and pruning-aware, so Snowflake skips them by metadata without reading contents. You never define or manage them.',
          },
          {
            q: 'How does Snowflake achieve partition pruning without explicit partition definitions?',
            a: 'Because it records min/max (and other) statistics per column in every micro-partition, the optimizer compares a query\'s WHERE predicates against that metadata and skips any micro-partition that cannot contain matching rows — before scanning data. There is no PARTITION BY to define; pruning is automatic. Clustering keys can further improve pruning on very large tables by co-locating related values.',
          },
          {
            q: 'What is columnar storage and why is it better for analytics?',
            a: 'Columnar storage keeps each column\'s values together rather than each row\'s fields together. Analytics queries read a few columns across many rows, so a columnar layout reads only the needed columns (less I/O), compresses far better (similar values sit adjacent), and enables vectorized processing. Snowflake uses a hybrid columnar (PAX) format within each micro-partition.',
          },
          {
            q: 'How does Time Travel work at the storage layer?',
            a: 'Micro-partitions are immutable, so DML writes new files instead of overwriting old ones. Snowflake retains the superseded files for the table\'s retention window (up to 90 days on Enterprise). A Time Travel query simply reads the set of micro-partitions that were current at the requested point in time. After retention, those files move to Fail-Safe (7 days, recoverable only by Snowflake Support).',
          },
        ],
        netflix: "Netflix's 180 TB watch_events table is stored as ~182,000 micro-partitions, each containing metadata (min/max WATCH_START, distinct COUNTRY_CODEs). A query for US viewers yesterday prunes 99.9% of partitions before any data is scanned.",
      },
      {
        id: 'external-storage',
        name: 'Cloud Object Storage',
        subtitle: 'The Backbone',
        color: '#e3b341',
        icon: '☁️',
        description: 'Amazon S3, Azure Blob Storage, or Google Cloud Storage — managed by Snowflake on your behalf. You never manage storage nodes.',
        components: ['Amazon S3', 'Azure Blob Storage', 'Google Cloud Storage', 'External Stages', 'Data Lake Integration'],
        interviewQs: [
          {
            q: 'Why did Snowflake choose cloud object storage over local disks?',
            a: 'Cloud object storage (S3/Blob/GCS) is virtually infinite, extremely durable, cheap, and independent of compute — which is exactly what enables separation of storage and compute. Many ephemeral warehouses can read one shared copy, compute can suspend without losing data, and storage scales independently of query load. Local disks would tie data to specific compute nodes and defeat that model; they are used only as a transient cache.',
          },
          {
            q: 'What is the difference between internal and external stages?',
            a: 'A stage is a location that holds files for loading/unloading. An internal stage is storage Snowflake manages inside your account (user, table, or named internal stage). An external stage points to your own cloud bucket via a storage integration. Use internal stages for Snowflake-managed pipelines; use external stages to load from or unload to buckets you already own, or to back External/Iceberg tables.',
          },
        ],
        netflix: 'Netflix runs on AWS. Snowflake uses S3 as the backbone storage. Netflix can also query external S3 data via External Tables or Iceberg Tables without loading it into Snowflake.',
      },
    ],

    /* ── Module Definitions ──────────────────────────────────── */
    modules: {
      intro: {
        title: 'Why Snowflake?',
        subtitle: 'The Problem with Traditional Data Warehouses',
        icon: '📖',
        group: 'Foundation',
        topics: [
          { name: 'What is Snowflake', desc: 'Cloud-native data platform built from scratch for the cloud. Not a port of an existing on-premise database.' },
          { name: 'Problems with Oracle/Teradata', desc: 'Tightly coupled storage + compute. Scale one = scale both. Expensive licenses. Poor concurrency.' },
          { name: 'Problems with Hadoop/Hive', desc: 'Complex to operate. Slow query performance. Required large engineering teams. Schema-on-read complexity.' },
          { name: 'Problems with BigQuery/Redshift', desc: 'Storage-compute coupling (Redshift). Vendor lock-in. Limited workload isolation.' },
          { name: 'Snowflake Solution', desc: 'True separation of storage and compute. Multiple compute clusters sharing one copy of data. Per-second billing.' },
        ],
      },
      architecture: {
        title: 'Snowflake Architecture',
        subtitle: 'Three-Layer Shared-Nothing Architecture',
        icon: '🏗️',
        group: 'Architecture',
        layers: ['Cloud Services', 'Virtual Warehouses', 'Centralized Storage', 'Cloud Object Storage'],
      },
      'cloud-services': {
        title: 'Cloud Services Layer',
        subtitle: 'Authentication → Parsing → Optimization → Execution Planning',
        icon: '☁️',
        group: 'Architecture',
      },
      storage: {
        title: 'Storage Layer',
        subtitle: 'Micro-Partitions, Columnar Storage, and Automatic Metadata',
        icon: '🗄️',
        group: 'Architecture',
      },
      compute: {
        title: 'Compute Layer',
        subtitle: 'Virtual Warehouses, Workload Isolation, and Auto-Scaling',
        icon: '⚡',
        group: 'Architecture',
      },
      'query-execution': {
        title: 'Query Execution',
        subtitle: 'Full Animated Journey: SQL → Result Set',
        icon: '🔍',
        group: 'Query & Data',
      },
      caching: {
        title: 'Caching in Snowflake',
        subtitle: 'Result Cache, Local Disk Cache, and Remote Disk Cache',
        icon: '⚡',
        group: 'Query & Data',
      },
      'data-loading': {
        title: 'Data Loading',
        subtitle: 'Snowpipe, COPY INTO, Stages, and Streaming',
        icon: '📥',
        group: 'Query & Data',
      },
      objects: {
        title: 'Snowflake Objects',
        subtitle: 'Organization → Account → Database → Schema → Table → ...',
        icon: '🗂️',
        group: 'Platform',
      },
      advanced: {
        title: 'Advanced Features',
        subtitle: 'Time Travel, Cloning, Sharing, Cortex, Iceberg, Snowpark',
        icon: '🚀',
        group: 'Platform',
      },
      security: {
        title: 'Security & Governance',
        subtitle: 'RBAC, Data Masking, Row Access Policies, Encryption',
        icon: '🔐',
        group: 'Platform',
      },
      'e2e-flow': {
        title: 'End-to-End Netflix Flow',
        subtitle: 'Watch Event → Snowpipe → Storage → Query → Recommendation → Dashboard',
        icon: '🎬',
        group: 'Capstone',
      },
    },

    /* ── Caching Layers ──────────────────────────────────────── */
    cacheLayers: [
      {
        name: 'Result Cache',
        layer: 'Cloud Services',
        ttl: '24 hours',
        scope: 'Account-wide — any user, any warehouse',
        hit: 'Identical SQL + same table data + same role permissions',
        miss: 'Any table DML since last cache; different LIMIT; non-deterministic functions (CURRENT_TIMESTAMP)',
        speedup: 'Near-instant (microseconds)',
        netflix: 'Netflix executive dashboard queries run in <1ms because the same aggregation query runs every hour and always hits result cache.',
      },
      {
        name: 'Local Disk Cache (SSD)',
        layer: 'Virtual Warehouse',
        ttl: 'Until warehouse suspends',
        scope: 'Per-warehouse — shared across sessions on same cluster',
        hit: 'Same micro-partitions accessed again on same warehouse before suspend',
        miss: 'Warehouse suspended (cache evicted); different warehouse; first access',
        speedup: '10–100x vs S3 read',
        netflix: 'ANALYTICS_WH caches hot Netflix movie metadata micro-partitions on local SSD. Dashboard refreshes hit local cache, not S3.',
      },
      {
        name: 'Remote Disk Cache (File Metadata)',
        layer: 'Cloud Services (Metadata)',
        ttl: 'Persistent',
        scope: 'Account-wide',
        hit: 'Partition metadata, column statistics, file locations',
        miss: 'Schema changes; new files ingested',
        speedup: 'Eliminates S3 LIST operations during partition pruning',
        netflix: 'Column min/max statistics for WATCH_START are cached in metadata. A date filter prunes 99.9% of watch_events partitions without reading S3.',
      },
    ],

    /* ── Interview Q&A Bank ──────────────────────────────────── */
    interviewQs: [
      {
        category: 'Architecture',
        question: 'What is the difference between a Virtual Warehouse and a Database in Snowflake?',
        answer: 'A Virtual Warehouse is compute — a cluster of nodes that execute queries and load data. A Database is a logical container for schemas, tables, and views (storage metadata). They are completely independent: you query a database using a warehouse, and multiple warehouses can query the same database simultaneously.',
        difficulty: 'beginner',
      },
      {
        category: 'Architecture',
        question: 'How does Snowflake separate storage from compute?',
        answer: 'Snowflake stores all data in cloud object storage (S3/Blob/GCS) as compressed, encrypted micro-partition files. Compute nodes (Virtual Warehouses) are ephemeral clusters that read these files on demand. Because data is never stored inside the compute nodes (only cached on local SSD temporarily), you can spin up 10 different warehouses all reading the same data, or suspend compute entirely while data persists untouched.',
        difficulty: 'beginner',
      },
      {
        category: 'Storage',
        question: 'What is a micro-partition and how does Snowflake use it for pruning?',
        answer: 'A micro-partition is a contiguous group of rows stored in columnar format, typically 50–500 MB compressed. Snowflake automatically records metadata for every micro-partition: min/max values per column, number of distinct values, null counts. During a query with a WHERE clause, Snowflake\'s pruning algorithm uses this metadata to skip entire micro-partitions that cannot contain matching rows — without scanning any actual data. This is automatic and requires no manual partition key definition.',
        difficulty: 'intermediate',
      },
      {
        category: 'Performance',
        question: 'Explain the three levels of caching in Snowflake.',
        answer: '1) Result Cache: Snowflake caches the exact query result for 24 hours in Cloud Services. Identical subsequent queries return instantly without touching the warehouse or storage. 2) Local Disk Cache (SSD): Each warehouse node caches micro-partitions on its local SSD. Repeated access to the same data within a session or across sessions on the same warehouse hits local disk instead of S3. Cache is evicted when the warehouse suspends. 3) Metadata Cache: Column statistics (min/max, distinct values) are permanently cached in Cloud Services, enabling partition pruning without S3 access.',
        difficulty: 'intermediate',
      },
      {
        category: 'Features',
        question: 'How does Time Travel work and what are its limits?',
        answer: 'Time Travel lets you query historical data by specifying a point in time (AT TIMESTAMP), an offset (AT OFFSET -N seconds), or a specific statement (BEFORE STATEMENT ID). Snowflake retains old micro-partition files for the retention period (0–90 days for Enterprise). Queries against historical state reference these retained files directly. Standard tables default to 1 day; Enterprise can set up to 90 days per table. After the retention window, data moves to Fail-Safe — a 7-day read-only period for Snowflake support recovery only (not accessible by SQL).',
        difficulty: 'intermediate',
      },
      {
        category: 'Data Loading',
        question: 'What is the difference between Snowpipe and COPY INTO?',
        answer: 'COPY INTO is a synchronous, batch load command — you run it manually or via a scheduled task, and it loads files from a stage into a table in a single transaction. Snowpipe is a serverless, event-driven continuous data ingestion service. It uses S3/Blob/GCS event notifications (or REST API calls) to automatically trigger COPY INTO commands as new files arrive, often within seconds. Snowpipe bills on a per-credit micro-batch basis and runs on Snowflake-managed compute.',
        difficulty: 'intermediate',
      },
      {
        category: 'Security',
        question: 'Explain RBAC in Snowflake and how Netflix would structure roles.',
        answer: 'Snowflake uses Role-Based Access Control (RBAC). Roles are granted to users and to other roles (role hierarchy). Every object (database, schema, table, warehouse) has privileges granted to roles. Netflix would have: SYSADMIN (manages objects), SECURITYADMIN (manages roles/users), ACCOUNTADMIN (top-level). Below that: custom roles like ANALYTICS_ROLE, ML_ROLE, MARKETING_ROLE, FINANCE_ROLE — each granted only the specific databases and warehouses they need. Sensitive columns (EMAIL, PAYMENT_INFO) are further protected by Masking Policies that show $$$MASKED$$$ to roles without the UNMASKED privilege.',
        difficulty: 'advanced',
      },
      {
        category: 'Advanced',
        question: 'What is a Dynamic Table and when would Netflix use one?',
        answer: 'A Dynamic Table is a materialized query result that Snowflake automatically refreshes based on a TARGET_LAG setting (e.g., "15 minutes"). Unlike a standard materialized view, it uses incremental computation — only processing new/changed rows. Netflix would use it for: pre-computed recommendation scores (refresh every 15 min from ML output), daily content performance aggregates (refresh every hour), and subscriber churn risk scores (refresh every 6 hours). This offloads expensive joins from real-time dashboards to a pre-computed layer.',
        difficulty: 'advanced',
      },
    ],

    /* ── Advanced Feature Definitions ───────────────────────── */
    advancedFeatures: [
      {
        id: 'time-travel',
        name: 'Time Travel',
        icon: '⏪',
        color: '#29b5e8',
        maxDays: { standard: 1, enterprise: 90 },
        description: 'Query any table as it existed at any past point in time within the retention window.',
        netflix: 'A data engineer accidentally deletes 3 days of viewing history. Time Travel restores the table to its state before the DELETE in seconds.',
        syntax: 'SELECT * FROM table AT (TIMESTAMP => \'2024-01-15 08:00:00\');',
      },
      {
        id: 'fail-safe',
        name: 'Fail-Safe',
        icon: '🛡️',
        color: '#3fb950',
        duration: '7 days after Time Travel window',
        description: 'Non-queryable disaster recovery storage retained by Snowflake. Only Snowflake Support can recover data.',
        netflix: 'Last-resort protection: if Time Travel window expires before an issue is detected, Snowflake Support can recover from Fail-Safe within 7 days.',
        syntax: null,
      },
      {
        id: 'zero-copy-clone',
        name: 'Zero-Copy Clone',
        icon: '🔁',
        color: '#a371f7',
        description: 'Creates a full copy of a table/schema/database instantly with no data duplication. Each clone only stores its own changes.',
        netflix: 'Netflix clones the PROD database to DEV before every major schema migration. The clone takes milliseconds and costs nothing until DEV diverges.',
        syntax: 'CREATE DATABASE DEV_DB CLONE PROD_DB;',
      },
      {
        id: 'data-sharing',
        name: 'Secure Data Sharing',
        icon: '🤝',
        color: '#e3b341',
        description: 'Share live data with other Snowflake accounts with zero data movement. Consumers query your data in real-time via their own compute.',
        netflix: 'Netflix shares anonymized engagement analytics with advertising partners. Partners query the data directly in their Snowflake account. No data export, no S3 transfer, no API.',
        syntax: 'CREATE SHARE netflix_ad_share;\nGRANT SELECT ON VIEW engagement_summary TO SHARE netflix_ad_share;',
      },
      {
        id: 'snowpipe-streaming',
        name: 'Snowpipe Streaming',
        icon: '🌊',
        color: '#f97316',
        description: 'Row-level streaming API with sub-second latency. Uses channels to write directly to Snowflake without staging files.',
        netflix: 'Watch events (1.4B/day = ~16,000/second) are streamed directly to Snowflake via the Kafka Connector using Snowpipe Streaming. Latency < 1 second.',
        syntax: 'channel.insertRows(rows, endOffsetToken);',
      },
      {
        id: 'snowpark',
        name: 'Snowpark',
        icon: '🐍',
        color: '#2dd4bf',
        description: 'Developer framework to write Python, Java, or Scala code that executes directly inside Snowflake — no data movement to external compute.',
        netflix: 'Netflix ML engineers write Snowpark Python DataFrames for feature engineering. Training data is processed where it lives — inside Snowflake on ML_TRAINING_WH — without exporting to SageMaker.',
        syntax: 'df = session.table("watch_events")\nresult = df.filter(col("completion_pct") > 0.8).group_by("movie_id").agg(count("*"))',
      },
      {
        id: 'dynamic-tables',
        name: 'Dynamic Tables',
        icon: '♻️',
        color: '#a371f7',
        description: 'Automated, incrementally-refreshed materialized views with a configurable freshness target (TARGET_LAG). Replaces complex ETL pipelines.',
        netflix: 'Netflix DAILY_TOP_RECO Dynamic Table refreshes every 15 minutes. All downstream dashboards query this pre-computed table instead of joining 500B row tables.',
        syntax: 'CREATE DYNAMIC TABLE top_reco TARGET_LAG = \'15 minutes\' WAREHOUSE = ML_WH AS SELECT ...;',
      },
      {
        id: 'iceberg-tables',
        name: 'Iceberg Tables',
        icon: '🧊',
        color: '#29b5e8',
        description: 'Open-standard Apache Iceberg tables stored in your own S3/Blob bucket, queryable and writable via Snowflake. Eliminates vendor lock-in for data storage.',
        netflix: 'Netflix stores raw log data in Apache Iceberg format on S3. Snowflake queries it natively alongside regular Snowflake tables — no separate Spark cluster needed.',
        syntax: 'CREATE ICEBERG TABLE raw_logs CATALOG = \'SNOWFLAKE\' EXTERNAL_VOLUME = \'my_s3_volume\' BASE_LOCATION = \'logs/\';',
      },
      {
        id: 'cortex',
        name: 'Snowflake Cortex AI',
        icon: '🤖',
        color: '#f97316',
        description: 'Built-in LLM functions and ML capabilities directly in SQL — sentiment analysis, translation, summarization, classification, anomaly detection.',
        netflix: 'Netflix uses Cortex SENTIMENT() on user reviews, TRANSLATE() for multi-language content tagging, and COMPLETE() for automated content description generation — all in SQL without external AI APIs.',
        syntax: 'SELECT SNOWFLAKE.CORTEX.SENTIMENT(review_text) AS sentiment_score\nFROM content_reviews;',
      },
    ],

    /* ── Security Components ─────────────────────────────────── */
    security: {
      roles: [
        { name: 'ACCOUNTADMIN', level: 0, desc: 'Full account access. Top of hierarchy. Rarely used directly.' },
        { name: 'SECURITYADMIN', level: 1, desc: 'Manages users, roles, and security policies.' },
        { name: 'SYSADMIN', level: 1, desc: 'Manages databases, schemas, warehouses, and objects.' },
        { name: 'ANALYTICS_ROLE', level: 2, desc: 'Read access to ENGAGEMENT_DB and CONTENT_DB. Uses ANALYTICS_WH.' },
        { name: 'ML_ROLE', level: 2, desc: 'Read/write access to RECOMMENDATIONS_DB. Uses ML_TRAINING_WH.' },
        { name: 'MARKETING_ROLE', level: 2, desc: 'Read-only on pre-aggregated marketing views. Email columns masked.' },
        { name: 'FINANCE_ROLE', level: 2, desc: 'Access to SUBSCRIBER_DB.PAYMENTS. Payment columns unmasked.' },
      ],
      maskingPolicies: [
        { column: 'EMAIL',        policy: 'Return full email to SECURITYADMIN; mask to ***@***.*** for others.' },
        { column: 'CREDIT_CARD', policy: 'Return last 4 digits only. Never expose full PAN in SQL results.' },
        { column: 'IP_ADDRESS',  policy: 'Mask to 0.0.0.0 for non-INFRA roles. Full IP visible to INFRA_ROLE.' },
      ],
      compliance: ['SOC 2 Type II', 'ISO 27001', 'HIPAA', 'GDPR', 'PCI-DSS', 'FedRAMP'],
      encryption: {
        atRest: 'AES-256-GCM',
        inTransit: 'TLS 1.2+',
        keyManagement: 'Tri-Secret Secure (Snowflake key + customer key + HSM)',
      },
    },
  };

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Concepts = SnowflakeConcepts;
})();
