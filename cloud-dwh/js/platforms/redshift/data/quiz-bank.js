/* ============================================================
   Redshift — Quiz Bank. Keyed by module id.
   Each: { q, choices, answer (index), explain }.
   Densified to >= 3 questions per learn page (P2-3).
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  viz.P.redshift.quizBank = {

    /* ── Learn — Fundamentals ────────────────────────────────── */
    architecture: [
      { q: 'Which component compiles the query plan and performs final aggregation?', choices: ['A compute node', 'The leader node', 'A slice', 'Amazon S3'], answer: 1, explain: 'The leader node parses, plans, compiles to C++ segments, and does the final aggregation; clients connect only to it.' },
      { q: 'What determines how many slices a compute node has?', choices: ['The distribution style', 'The number of tables', 'The node type', 'The sort key'], answer: 2, explain: 'Slice count is fixed by node type — e.g. ra3.4xlarge has 4 slices, ra3.16xlarge has 16.' },
      { q: 'What does DS_DIST_NONE in an EXPLAIN plan indicate?', choices: ['A failed query', 'Join partners are co-located, so no redistribution is needed', 'The table is unsorted', 'Data was spilled to disk'], answer: 1, explain: 'DS_DIST_NONE means the joined rows already sit on the same slice (good distribution) — no network shuffle, the fastest join step.' },
    ],
    'ra3-managed-storage': [
      { q: 'What is the main advantage of RA3 nodes?', choices: ['They are always free', 'Compute and storage scale independently', 'They remove the leader node', 'They disable compression'], answer: 1, explain: 'RA3 decouples compute from Redshift Managed Storage (S3-backed), so you size and pay for each separately.' },
      { q: 'How does RA3 keep queries fast when data lives in S3-backed RMS?', choices: ['It never uses S3', 'It caches hot blocks on local SSD and fetches cold data on demand', 'It disables zone maps', 'It replicates all data to every node'], answer: 1, explain: 'RA3 automatically caches the working set on fast local SSD and evicts cold blocks to managed storage, fetching them when needed.' },
      { q: 'Which older node families couple compute and storage together?', choices: ['RA3 only', 'DC2 and DS2', 'Serverless', 'Spectrum'], answer: 1, explain: 'DC2/DS2 tie storage to the node, so scaling one forces paying for the other — the problem RA3 solves.' },
    ],
    serverless: [
      { q: 'How much memory does 1 RPU provide?', choices: ['1 GB', '8 GB', '16 GB', '64 GB'], answer: 2, explain: 'One Redshift Processing Unit provides 16 GB of memory. Billing is per-second RPU-hours while active (60s minimum).' },
      { q: 'When are you charged for Redshift Serverless compute?', choices: ['A flat monthly fee', 'Per-second RPU-hours only while queries run (60s minimum), nothing when idle', 'Per query regardless of size', 'Only for storage'], answer: 1, explain: 'Serverless charges compute per-second while active with a 60-second minimum; idle time has no compute charge. Storage (RMS) is billed separately.' },
      { q: 'What do base and max capacity control in Serverless?', choices: ['Nothing', 'Base is the compute floor / performance lever; max caps how high auto-scaling can go (and spend)', 'The number of tables', 'The encryption level'], answer: 1, explain: 'Base capacity sets the floor and is a lever for big ETL; max capacity caps auto-scaling and therefore cost.' },
    ],
    'columnar-storage': [
      { q: 'What is stored in a zone map?', choices: ['A full copy of the block', 'The min and max values per 1 MB block', 'The sort key definition', 'User permissions'], answer: 1, explain: 'Zone maps hold per-block min/max metadata so range-restricted predicates can skip non-matching 1 MB blocks.' },
      { q: 'Why does columnar storage scan less data than a row store for analytics?', choices: ['It compresses nothing', 'It reads only the columns a query references, not whole rows', 'It stores data in JSON', 'It uses row locks'], answer: 1, explain: 'Columnar layout groups each column together, so a query reads just the referenced columns — far less I/O than reading full rows.' },
      { q: 'What makes zone maps most effective at skipping blocks?', choices: ['Random row order', 'Data sorted on the filter column, giving tight non-overlapping block ranges', 'Disabling compression', 'Using EVEN distribution'], answer: 1, explain: 'If rows are sorted on the predicate column, each 1 MB block has a narrow range and most blocks can be skipped; that is why sort keys matter.' },
    ],

    /* ── Learn — Internals & Data ────────────────────────────── */
    'distribution-styles': [
      { q: 'Which distribution style replicates a full copy of the table to every node?', choices: ['KEY', 'EVEN', 'ALL', 'AUTO'], answer: 2, explain: 'ALL replicates the whole table to each node — ideal for small dimension tables so joins never redistribute them.' },
      { q: 'What causes distribution skew?', choices: ['Using EVEN distribution', 'A KEY column with uneven/low-cardinality values', 'Enabling result caching', 'Running VACUUM'], answer: 1, explain: 'A lopsided KEY column sends too many rows to one slice, making it the bottleneck. Choose a high-cardinality, even key.' },
      { q: 'What does DISTSTYLE AUTO do?', choices: ['Always uses KEY', 'Starts small tables as ALL and switches to EVEN/KEY as they grow', 'Disables distribution', 'Replicates every table'], answer: 1, explain: 'AUTO (the default) lets Redshift begin a small table as ALL and promote it to EVEN/KEY as it grows, with no manual intervention.' },
    ],
    'sort-keys': [
      { q: 'Which maintenance command restores an interleaved sort key\'s performance?', choices: ['ANALYZE', 'VACUUM REINDEX', 'COPY', 'REFRESH MATERIALIZED VIEW'], answer: 1, explain: 'Interleaved keys skew as data grows; VACUUM REINDEX re-analyzes them (an extra, slower pass).' },
      { q: 'When is a compound sort key the right choice?', choices: ['When queries filter on different single columns each time', 'When queries filter on a prefix of the sort columns, and for frequent DML', 'Only for tiny tables', 'Never'], answer: 1, explain: 'Compound (the default) suits queries that filter on the leading sort columns and tables with regular inserts/updates; it is cheaper to maintain than interleaved.' },
      { q: 'How do sort keys speed up queries?', choices: ['By encrypting data', 'By ordering rows so zone maps can skip more blocks for range filters', 'By replicating the table', 'By adding indexes'], answer: 1, explain: 'Sorting clusters similar values together, giving each block a tight range so range-restricted scans skip most blocks.' },
    ],
    compression: [
      { q: 'What is the recommended way to choose column compression in Redshift?', choices: ['Always use RAW', 'Let COPY auto-select encodings (or use ANALYZE COMPRESSION)', 'Disable compression', 'Use the same codec everywhere'], answer: 1, explain: 'COPY into an empty table applies automatic compression; ANALYZE COMPRESSION also recommends optimal per-column encodings.' },
      { q: 'Which encoding is a strong default for sorted/sequential columns?', choices: ['RAW', 'AZ64 (or delta for sequential)', 'No encoding', 'Bytedict only'], answer: 1, explain: 'AZ64 is an efficient general-purpose Amazon encoding for numeric/date/time; delta encodings suit monotonic sequences.' },
      { q: 'Why does compression improve query performance, not just storage?', choices: ['It does not', 'Less data on disk means fewer bytes read per scan (less I/O)', 'It removes the leader node', 'It disables zone maps'], answer: 1, explain: 'Smaller compressed blocks mean the engine reads fewer bytes from disk, so scans run faster as well as cheaper.' },
    ],
    'vacuum-analyze': [
      { q: 'What does VACUUM do?', choices: ['Refreshes statistics', 'Reclaims space from deleted rows and restores sort order', 'Encrypts the cluster', 'Caches results'], answer: 1, explain: 'VACUUM reclaims space left by deletes/updates and re-sorts rows (FULL does both; SORT ONLY / DELETE ONLY do one job).' },
      { q: 'What does ANALYZE update?', choices: ['Disk encryption', 'Table statistics the planner uses to pick join order/method', 'The sort key', 'User roles'], answer: 1, explain: 'ANALYZE refreshes planner statistics so query plans stay accurate after large data changes.' },
      { q: 'When should you run VACUUM/ANALYZE manually despite auto-maintenance?', choices: ['Never', 'After large loads, deletes, or updates', 'Before every SELECT', 'Only on empty tables'], answer: 1, explain: 'Redshift auto-maintains both, but after big DML it is worth running them manually to restore sort order and refresh stats promptly.' },
    ],
    'query-execution': [
      { q: 'What does the leader node produce from a SQL statement?', choices: ['A CSV file', 'A query plan compiled to C++ segments distributed to compute nodes', 'An index', 'A snapshot'], answer: 1, explain: 'The leader parses and plans the query, compiles it to C++ segments/steps, and ships them to compute nodes for parallel execution.' },
      { q: 'In EXPLAIN output, which step is the most expensive to avoid?', choices: ['DS_DIST_NONE', 'DS_DIST_BOTH (both tables redistributed across the network)', 'A sequential scan of a tiny table', 'A result cache hit'], answer: 1, explain: 'DS_DIST_BOTH redistributes both sides of a join over the network — the costliest data-movement step; good dist keys reduce it to DS_DIST_NONE.' },
      { q: 'What does it mean when a query "spills to disk"?', choices: ['It finished early', 'A step needed more memory than its slot had, so intermediate data went to disk (slow)', 'Results were cached', 'The table was vacuumed'], answer: 1, explain: 'When a hash/sort step exceeds its memory allocation it spills to disk, hurting performance — a signal to tune WLM memory or the query.' },
    ],
    'result-caching': [
      { q: 'When is a cached result NOT returned?', choices: ['When the query is identical', 'When the underlying data has changed', 'When the leader node is used', 'When permissions match'], answer: 1, explain: 'The cache is invalidated when underlying data changes, so results are never stale.' },
      { q: 'Where does the Redshift result cache live and what does it cost to serve?', choices: ['On compute nodes; full compute cost', 'On the leader node; returned with no compute', 'In S3; per-GB scanned', 'In the client; nothing'], answer: 1, explain: 'The leader node caches results and returns an identical query instantly using no compute.' },
      { q: 'How can you disable result caching for benchmarking?', choices: ['DROP CACHE', 'SET enable_result_cache_for_session TO off', 'VACUUM', 'Delete the leader node'], answer: 1, explain: 'Setting enable_result_cache_for_session to off forces recomputation so you can measure true execution time.' },
    ],
    'materialized-views': [
      { q: 'What do materialized views store?', choices: ['Only a query definition', 'Precomputed join/aggregate results as a physical table', 'User permissions', 'The sort key'], answer: 1, explain: 'An MV persists the computed result so dashboards read a small precomputed table instead of rescanning the base tables.' },
      { q: 'What does AUTO REFRESH YES do for a materialized view?', choices: ['Nothing', 'Lets Redshift refresh the MV automatically (incrementally when possible)', 'Drops the MV nightly', 'Disables the base tables'], answer: 1, explain: 'With auto refresh, Redshift keeps the MV current, using incremental refresh when the query shape allows it.' },
      { q: 'What is automatic query rewrite with MVs?', choices: ['Rewriting your SQL files', 'Redshift routing base-table queries to a matching MV even if they never referenced it', 'Encrypting queries', 'Caching the leader node'], answer: 1, explain: 'The optimizer can transparently answer a base-table query from a matching MV, speeding up queries that did not mention the MV.' },
    ],

    /* ── Scale & Performance ─────────────────────────────────── */
    wlm: [
      { q: 'What does Workload Management (WLM) control?', choices: ['Disk encryption', 'How queries are routed into queues with memory and concurrency limits', 'The sort key', 'Snapshot schedules'], answer: 1, explain: 'WLM assigns queries to queues, each with a memory share and concurrency, so heavy and light workloads do not starve each other.' },
      { q: 'Why is Automatic WLM recommended over manual WLM?', choices: ['It disables queues', 'Redshift sets per-query memory and concurrency dynamically instead of hand-tuned static queues', 'It is cheaper to license', 'It removes the leader node'], answer: 1, explain: 'Automatic WLM adapts memory/concurrency per query based on estimated needs — better than static manual queues for most workloads.' },
      { q: 'What are Query Monitoring Rules (QMR) used for?', choices: ['Encrypting queries', 'Logging, aborting, or re-prioritizing queries that breach thresholds (e.g. long runtime)', 'Building indexes', 'Caching results'], answer: 1, explain: 'QMR define metric-based actions (log/hop/abort) to control runaway queries within WLM.' },
    ],
    'concurrency-scaling': [
      { q: 'Concurrency scaling primarily helps with…', choices: ['Loading data faster', 'Bursts of concurrent queries that would otherwise queue', 'Encrypting data', 'Reducing storage cost'], answer: 1, explain: 'It adds transient clusters when a queue\'s concurrency is exceeded so queries run in parallel instead of waiting; daily free credits apply.' },
      { q: 'Does concurrency scaling support write queries?', choices: ['No, reads only', 'Yes — it scales reads and supported writes (COPY/INSERT/UPDATE/DELETE), GA since 2022', 'Only VACUUM', 'Only on Serverless'], answer: 1, explain: 'Originally read-focused, concurrency scaling has supported common write operations since late 2022.' },
      { q: 'How is concurrency scaling billed?', choices: ['Always free', 'Per-second beyond the accrued daily free credits', 'Per table', 'Flat monthly'], answer: 1, explain: 'Clusters earn a daily free credit of concurrency-scaling time; usage beyond that is billed per second.' },
    ],
    resize: [
      { q: 'What characterizes an elastic resize?', choices: ['Hours of downtime', 'Adds/removes nodes in minutes by redistributing slices (brief pause)', 'Rebuilds the whole cluster', 'Only changes node type'], answer: 1, explain: 'Elastic resize changes node count quickly by remapping slices, with only a short pause — best for routine scaling.' },
      { q: 'What happens during a classic resize?', choices: ['No change to availability', 'A brief restart, then the cluster is read-write while data redistributes in the background', 'The cluster is deleted', 'Encryption is disabled'], answer: 1, explain: 'Classic resize copies data to a new cluster; after a brief restart it is read-write while redistribution completes in the background. Use it when elastic resize is not available for the target config.' },
      { q: 'When must you use classic resize instead of elastic?', choices: ['Always', 'When changing to a configuration elastic resize does not support', 'For every scaling operation', 'Only to encrypt'], answer: 1, explain: 'Elastic resize is preferred for speed; classic resize covers node-type/size changes elastic resize cannot do.' },
    ],
    'short-query-accel': [
      { q: 'What does Short Query Acceleration (SQA) do?', choices: ['Encrypts short queries', 'Runs short, light queries in a dedicated fast lane so they skip long-query queues', 'Deletes short queries', 'Caches the leader node'], answer: 1, explain: 'SQA uses ML to predict short queries and routes them to a reserved space so dashboards are not stuck behind big ETL.' },
      { q: 'How does SQA decide which queries are "short"?', choices: ['By table size only', 'A machine-learning model predicts execution time', 'Randomly', 'By user role'], answer: 1, explain: 'SQA uses a trained model on your workload to estimate runtime and fast-track the short ones.' },
      { q: 'SQA mainly improves which experience?', choices: ['Bulk loads', 'Interactive/dashboard latency under mixed workloads', 'Encryption speed', 'Snapshot time'], answer: 1, explain: 'By keeping quick queries from queuing behind long ones, SQA improves perceived latency for interactive users.' },
    ],
    'cost-performance': [
      { q: 'On RA3/Serverless, which lever most directly reduces cost?', choices: ['Adding more tables', 'Reducing compute time and bytes scanned (pruning, caching, right-sizing)', 'Disabling zone maps', 'Using SELECT *'], answer: 1, explain: 'You pay for compute and data scanned; pruning, caching, good keys, and right-sizing/auto-pause cut both.' },
      { q: 'What does Reserved Instance / Reserved Node pricing offer?', choices: ['Faster queries', 'Lower cost for committing to 1- or 3-year usage vs on-demand', 'More storage', 'Automatic tuning'], answer: 1, explain: 'Reserved pricing trades a usage commitment for a significant discount over on-demand for steady workloads.' },
      { q: 'Which practice lowers Spectrum/lake query cost specifically?', choices: ['Querying uncompressed CSV', 'Partitioning and using columnar formats (Parquet) so less data is scanned', 'Scanning all partitions', 'Disabling pushdown'], answer: 1, explain: 'Spectrum bills per TB scanned; partition pruning and columnar formats dramatically reduce bytes scanned.' },
    ],

    /* ── Ecosystem & Integration ─────────────────────────────── */
    spectrum: [
      { q: 'Redshift Spectrum lets you…', choices: ['Load S3 data into Redshift', 'Query data in S3 without loading it', 'Encrypt the cluster', 'Resize the cluster'], answer: 1, explain: 'Spectrum queries S3 in place via external tables; it\'s billed by the amount of data scanned.' },
      { q: 'What catalog typically backs Spectrum external tables?', choices: ['The Redshift system tables', 'The AWS Glue Data Catalog (external schema)', 'DynamoDB', 'CloudWatch'], answer: 1, explain: 'External schemas usually map to the Glue Data Catalog (or Hive metastore), describing the S3 data for Spectrum.' },
      { q: 'How do you cut Spectrum cost and latency?', choices: ['Use row-based CSV', 'Partition data and store it in columnar formats like Parquet', 'Scan every file', 'Disable predicate pushdown'], answer: 1, explain: 'Partitioning + Parquet enable partition pruning and column projection, so Spectrum scans far fewer bytes.' },
    ],
    'federated-query': [
      { q: 'What does Redshift Federated Query do?', choices: ['Queries S3 files', 'Queries live data in RDS/Aurora (PostgreSQL/MySQL) directly from Redshift', 'Trains ML models', 'Encrypts data'], answer: 1, explain: 'Federated Query reaches into operational databases (Aurora/RDS) so you can join live source data without first loading it.' },
      { q: 'A good use case for Federated Query is…', choices: ['Bulk historical analytics', 'Incremental ETL or joining a small set of fresh operational rows', 'Encrypting the cluster', 'Resizing'], answer: 1, explain: 'It shines for pulling the latest changed rows or small live lookups; large scans are better served by loading/ELT.' },
      { q: 'What should you watch for with Federated Query?', choices: ['It has no cost', 'Load/impact on the source database and network latency', 'It disables WLM', 'It removes zone maps'], answer: 1, explain: 'Because it hits the live source, heavy federated scans can burden the operational database — keep them targeted.' },
    ],
    datashares: [
      { q: 'What do Redshift datashares enable?', choices: ['Copying data between clusters', 'Live, read-only sharing of data across clusters/accounts without copies', 'Encrypting tables', 'Resizing'], answer: 1, explain: 'Datashares expose objects for live read access to other clusters/accounts (RA3/Serverless) with no data duplication.' },
      { q: 'Datashares require which node family?', choices: ['DC2', 'RA3 or Serverless', 'DS2', 'Any node type'], answer: 1, explain: 'Cross-cluster data sharing relies on RA3/Serverless managed storage architecture.' },
      { q: 'What access does a consumer of a datashare get?', choices: ['Read-write', 'Live read-only access to the shared objects', 'Admin on the producer', 'A one-time copy'], answer: 1, explain: 'Consumers query the shared data live and read-only; the producer keeps control and there is no stale copy.' },
    ],
    'redshift-ml': [
      { q: 'Which service powers model training behind CREATE MODEL?', choices: ['Amazon EMR', 'Amazon SageMaker', 'AWS Glue', 'Amazon Athena'], answer: 1, explain: 'Redshift ML uses Amazon SageMaker (Autopilot) to train; the model is exposed as a SQL function for in-database inference.' },
      { q: 'How do you run inference with a Redshift ML model?', choices: ['Export to Python', 'Call the generated prediction function in SQL (SELECT ... model_fn(...))', 'Only via the console', 'Through VACUUM'], answer: 1, explain: 'CREATE MODEL produces a SQL function; you score rows by calling it in ordinary SELECT statements, in-database.' },
      { q: 'What skill does Redshift ML mainly remove the need for?', choices: ['Writing SQL', 'Managing separate ML infrastructure/pipelines for common models', 'Loading data', 'Using IAM'], answer: 1, explain: 'It lets SQL users build/apply models without standing up and operating separate ML infrastructure.' },
    ],
    'super-partiql': [
      { q: 'What is the SUPER data type for?', choices: ['Encryption keys', 'Storing semi-structured/JSON data natively in a column', 'Sort keys', 'Snapshots'], answer: 1, explain: 'SUPER stores schemaless/semi-structured data (JSON-like) so you can ingest and query nested data in Redshift.' },
      { q: 'Which language queries SUPER/nested data in Redshift?', choices: ['GraphQL', 'PartiQL (SQL extension for nested/semi-structured data)', 'XPath', 'JSONPath only'], answer: 1, explain: 'PartiQL extends SQL to navigate and unnest SUPER columns with familiar dot/array notation.' },
      { q: 'A benefit of SUPER over parsing JSON strings is…', choices: ['It is slower', 'Schemaless ingestion plus efficient, indexed-style access to nested fields', 'It disables compression', 'It needs no SQL'], answer: 1, explain: 'SUPER stores data in an optimized format so nested access is efficient, avoiding repeated string parsing.' },
    ],
    'copy-unload': [
      { q: 'How do you maximize COPY throughput?', choices: ['Use one large file', 'Split data into many slice-aligned files', 'Disable compression', 'Load into a non-empty table'], answer: 1, explain: 'Multiple files (ideally a multiple of the slice count) let all slices load in parallel; COPY into empty tables also auto-compresses.' },
      { q: 'What does UNLOAD do?', choices: ['Deletes a table', 'Exports query results to S3 (optionally Parquet, partitioned, parallel)', 'Loads from S3', 'Encrypts a column'], answer: 1, explain: 'UNLOAD writes SELECT results to S3 in parallel; it can output Parquet and partition by columns for downstream lakes.' },
      { q: 'Which COPY practice enables automatic compression analysis?', choices: ['Loading into a populated table', 'COPY into an empty table (Redshift samples and applies encodings)', 'Disabling stats', 'Using single-row INSERTs'], answer: 1, explain: 'When COPY loads an empty table it samples the data and applies optimal column compression automatically.' },
    ],

    /* ── Security & Governance ───────────────────────────────── */
    'iam-rbac': [
      { q: 'How does Redshift RBAC assign privileges?', choices: ['Only to individual users', 'To roles, which users and other roles inherit', 'To IP addresses', 'To slices'], answer: 1, explain: 'RBAC grants system/object privileges to roles; users acquire access by being granted roles, simplifying management.' },
      { q: 'What is IAM mainly used for with Redshift?', choices: ['Sorting data', 'Authentication and authorizing access to AWS resources (e.g. COPY from S3 via a role)', 'Compression', 'Zone maps'], answer: 1, explain: 'IAM handles AWS-level identity: cluster access, and roles that let COPY/UNLOAD/Spectrum reach S3/Glue securely.' },
      { q: 'Which pair best describes least-privilege design here?', choices: ['Grant ALL to PUBLIC', 'Model job functions as roles and grant only needed privileges', 'Share the admin password', 'Disable IAM'], answer: 1, explain: 'Least privilege means scoping roles to job functions and granting only the privileges each needs.' },
    ],
    'kms-encryption': [
      { q: 'What does KMS provide for Redshift?', choices: ['Query caching', 'Managed encryption keys for encryption at rest', 'Sorting', 'Concurrency scaling'], answer: 1, explain: 'AWS KMS manages the keys used to encrypt Redshift data at rest (and snapshots), with rotation and access control.' },
      { q: 'How is data protected in transit to Redshift?', choices: ['It cannot be', 'SSL/TLS connections', 'Only KMS', 'VACUUM'], answer: 1, explain: 'Client connections use SSL/TLS to encrypt data in transit, complementing at-rest encryption.' },
      { q: 'When you enable encryption, what else is encrypted?', choices: ['Nothing else', 'Automated and manual snapshots of the cluster', 'Only the leader node logs', 'Query text only'], answer: 1, explain: 'Snapshots inherit the cluster\'s encryption, so backups are protected with the same KMS keys.' },
    ],
    'lake-formation': [
      { q: 'What does AWS Lake Formation add for Spectrum/lake access?', choices: ['Faster COPY', 'Fine-grained (table/column/row) permissions on data-lake tables', 'Compression', 'Result caching'], answer: 1, explain: 'Lake Formation centralizes fine-grained access control (down to columns/rows) for lake tables queried via Spectrum.' },
      { q: 'Lake Formation permissions are enforced at which level?', choices: ['Only whole buckets', 'Database, table, column, and row level', 'Node level', 'Slice level'], answer: 1, explain: 'It supports granular grants — databases, tables, columns, and row-level filters — across analytics services.' },
      { q: 'Why combine Lake Formation with Redshift Spectrum?', choices: ['To disable S3', 'To govern who can query which lake columns/rows consistently', 'To avoid IAM', 'To speed up VACUUM'], answer: 1, explain: 'It gives consistent, centrally-managed fine-grained governance over the S3 data Spectrum reads.' },
    ],

    /* ── New topic pages (P2-3) ──────────────────────────────── */
    'zero-etl': [
      { q: 'What does a Redshift zero-ETL integration do?', choices: ['Encrypts tables', 'Automatically replicates data from sources like Aurora/RDS/DynamoDB into Redshift, no pipeline', 'Deletes old data', 'Resizes the cluster'], answer: 1, explain: 'Zero-ETL continuously replicates operational source changes into Redshift with no pipeline to build or run.' },
      { q: 'How fresh is data with zero-ETL?', choices: ['Weekly', 'Near real-time (seconds)', 'Only on manual refresh', 'Never updated'], answer: 1, explain: 'Changes are replicated continuously, so data is queryable in Redshift within seconds of the source change.' },
      { q: 'Which is a supported zero-ETL source?', choices: ['A CSV on your laptop', 'Aurora / RDS MySQL & PostgreSQL / DynamoDB', 'A Kafka topic only', 'Google BigQuery'], answer: 1, explain: 'Zero-ETL targets AWS operational databases (Aurora, RDS MySQL/PostgreSQL, DynamoDB); files/lakes still use COPY/Spectrum.' },
    ],
    'streaming-ingestion': [
      { q: 'How does Redshift streaming ingestion land data?', choices: ['Via nightly COPY', 'Directly from Kinesis/MSK into a materialized view, no S3 staging', 'Through email', 'Only through Spectrum'], answer: 1, explain: 'A materialized view over an external schema reads the stream directly — no intermediate S3 files.' },
      { q: 'Which sources does streaming ingestion support?', choices: ['Only S3', 'Amazon Kinesis Data Streams and Amazon MSK (Kafka)', 'DynamoDB only', 'RDS only'], answer: 1, explain: 'Streaming ingestion reads from Kinesis Data Streams or MSK into a materialized view.' },
      { q: 'How are JSON payloads typically handled in a streaming MV?', choices: ['Ignored', 'Parsed into a SUPER column via JSON_PARSE', 'Stored as images', 'Rejected'], answer: 1, explain: 'The MV can JSON_PARSE the raw record into a SUPER column, then query nested fields with PartiQL.' },
    ],
    'system-tables': [
      { q: 'What does EXPLAIN give you?', choices: ['The query result', 'The estimated plan incl. join methods and data-movement (DS_DIST_*) before running', 'A backup', 'Encryption status'], answer: 1, explain: 'EXPLAIN shows the planned steps, costs, and redistribution labels so you can spot expensive shuffles before execution.' },
      { q: 'Which system view family holds logged history of completed queries?', choices: ['STV', 'STL (and SVL/SVV aggregates)', 'KMS', 'WLM'], answer: 1, explain: 'STL views log completed activity; STV holds live/transient state; SVL/SVV are convenient aggregated views.' },
      { q: 'Which view surfaces table skew and unsorted percentage?', choices: ['STV_SLICES', 'SVV_TABLE_INFO', 'STL_CONNECTION_LOG', 'SYS_LOAD_ERROR'], answer: 1, explain: 'SVV_TABLE_INFO reports skew_rows, unsorted %, and stats_off — pointing directly at dist/sort/VACUUM/ANALYZE fixes.' },
    ],
    'row-level-security': [
      { q: 'What does a row-level security (RLS) policy do?', choices: ['Encrypts columns', 'Filters which rows a user/role can see via a predicate', 'Caches results', 'Resizes the cluster'], answer: 1, explain: 'RLS attaches a predicate so each role sees only matching rows — enforced automatically on every query.' },
      { q: 'What does dynamic data masking do?', choices: ['Deletes columns', 'Transforms sensitive column values (e.g. redacts PII) based on the viewer\'s role', 'Drops rows', 'Disables RBAC'], answer: 1, explain: 'A masking policy rewrites a column\'s value at query time per role, so some users see full data and others a masked form.' },
      { q: 'Why use RLS/masking instead of separate per-team tables or views?', choices: ['It is slower', 'One base table, central auditable policies, no duplicate copies to drift', 'It avoids SQL', 'It removes IAM'], answer: 1, explain: 'Policies enforce row/column access in-engine on a single table — no duplicate tables/views to maintain or drift.' },
    ],
    'snapshots-dr': [
      { q: 'How does Redshift back up a cluster?', choices: ['Manual CSV export only', 'Incremental snapshots to S3 (automated + manual)', 'It does not', 'Only via UNLOAD'], answer: 1, explain: 'Redshift continuously takes incremental snapshots to S3; automated ones honor a retention period, manual ones persist until deleted.' },
      { q: 'What is the basis of cross-region disaster recovery?', choices: ['Larger nodes', 'Cross-region snapshot copy', 'Result caching', 'More slices'], answer: 1, explain: 'Enabling cross-region snapshot copy keeps a recent backup in a second region to restore from after a regional failure.' },
      { q: 'What restore granularity does Redshift support?', choices: ['Whole cluster only', 'A new cluster from a snapshot, or individual tables from a snapshot', 'Single rows only', 'None'], answer: 1, explain: 'You can restore a snapshot to a new cluster (any region) or restore specific tables without a full cluster restore.' },
    ],

  };
})();
