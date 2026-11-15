/* ============================================================
   Fundamentals — Quiz Bank. Keyed by nav/module id.
   Each: { q, choices, answer (index), explain }.
   Consumed by the shared enhance layer via CDWH.QuizBank.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
  viz.P.fundamentals.quizBank = {

    /* ── Foundations ─────────────────────────────────────────── */
    'fund-olap-oltp': [
      { q: 'What workload is an OLTP database optimized for?', choices: ['Large analytical scans', 'Many small, concurrent single-row operations', 'Batch model training', 'Columnar compression'], answer: 1, explain: 'OLTP runs the application: many tiny, concurrent reads/writes of individual records, kept correct and durable (ACID).' },
      { q: 'Why does a row-oriented store waste I/O on analytical queries?', choices: ['It compresses too aggressively', 'It must read every column of a row even when only a few are needed', 'It cannot be indexed', 'It stores data in S3'], answer: 1, explain: 'Analytics reads a few columns across many rows. A row layout physically interleaves all columns, so the engine reads columns nobody asked for.' },
      { q: 'What is the modern pattern for serving analytics without hurting the app?', choices: ['Run BI queries directly on the OLTP database', 'Move operational data into a separate warehouse', 'Disable ACID on the OLTP store', 'Add more indexes to the app database'], answer: 1, explain: 'Keep OLTP and OLAP separate and move data across (batch / streaming / CDC). The warehouse becomes the single analytical copy BI and ML read from.' },
    ],
    'fund-architecture': [
      { q: 'What does MPP (massively parallel processing) do?', choices: ['Runs one query on one powerful CPU', 'Splits a query across many workers that each process a shard of data', 'Stores data row by row', 'Replaces the need for storage'], answer: 1, explain: 'MPP divides work across many nodes/slices that scan their shard in parallel, then combine results — the only way to scan billions of rows quickly.' },
      { q: 'What is the main benefit of decoupling compute from storage?', choices: ['Data is never durable', 'Compute and storage scale and are billed independently', 'Queries cannot run in parallel', 'It forces a single warehouse size'], answer: 1, explain: 'Decoupling lets you size/pay for compute separately from a shared, durable storage layer — scale compute up for a big job, pause it when idle, with one source of truth.' },
      { q: 'In a decoupled architecture, where does the source-of-truth table data live?', choices: ['On each compute node\'s local disk only', 'In shared, durable object storage', 'In the leader node\'s memory', 'Only in the result cache'], answer: 1, explain: 'Table data lives in shared object storage; compute clusters read/write the same data and cache hot blocks locally for speed.' },
    ],
    'fund-columnar': [
      { q: 'How is data physically stored in a columnar warehouse?', choices: ['One file per row', 'Values of the same column stored together', 'As JSON blobs', 'In a B-tree index'], answer: 1, explain: 'Columnar layout groups each column\'s values together, so a scan reads only the columns a query touches and compresses similar values extremely well.' },
      { q: 'Why does columnar storage compress so well?', choices: ['It drops old data', 'Adjacent values in a column are similar, so encodings like RLE/dictionary shrink them', 'It uses row locks', 'It stores everything twice'], answer: 1, explain: 'Same-type, often-repeating values sit next to each other, which run-length, dictionary, and delta encodings exploit for high compression ratios.' },
      { q: 'What metadata lets a columnar engine skip blocks it does not need?', choices: ['Foreign keys', 'Per-block min/max statistics (zone maps)', 'The query cache', 'Row IDs'], answer: 1, explain: 'Each block stores min/max (and often other) stats. A range predicate compares against them and skips blocks that cannot match — reading far less data.' },
    ],

    /* ── How Data Gets In ────────────────────────────────────── */
    'fund-ingest-overview': [
      { q: 'What are the three broad ways data gets into a warehouse?', choices: ['Index, view, trigger', 'Batch load, streaming, and change-data-capture', 'Backup, restore, clone', 'Select, insert, update'], answer: 1, explain: 'Ingestion falls into batch/bulk loads, continuous streaming, and CDC that mirrors changes from a source system.' },
      { q: 'What usually distinguishes ingestion approaches from one another?', choices: ['The SQL dialect', 'Latency and data freshness requirements', 'The color of the dashboard', 'The number of columns'], answer: 1, explain: 'How fresh the data must be (minutes-old batch vs seconds-old streaming) is the main driver of which ingestion pattern you choose.' },
    ],
    'fund-ingest-batch': [
      { q: 'What makes bulk COPY-style loads fast?', choices: ['Loading one giant file single-threaded', 'Splitting data into many files so all workers load in parallel', 'Disabling compression', 'Loading row by row with INSERT'], answer: 1, explain: 'Many appropriately-sized files let every slice/worker load in parallel; single huge files or per-row INSERTs serialize the load.' },
      { q: 'Batch ingestion is the best fit when…', choices: ['You need sub-second freshness', 'Periodic loads (hourly/daily) of large volumes are acceptable', 'You cannot tolerate any latency', 'The source emits one event at a time'], answer: 1, explain: 'Batch suits large, periodic loads where minutes-to-hours of latency is fine — it is simpler and cheaper than always-on streaming.' },
    ],
    'fund-ingest-streaming': [
      { q: 'What does streaming ingestion optimize for?', choices: ['Lowest cost', 'Lowest latency / freshest data', 'Maximum compression', 'Fewer columns'], answer: 1, explain: 'Streaming continuously ingests events as they arrive, trading some cost/complexity for seconds-fresh data.' },
      { q: 'A common challenge unique to streaming is…', choices: ['Nothing — it is strictly simpler', 'Handling out-of-order and late-arriving events', 'Reading columns', 'Compressing strings'], answer: 1, explain: 'Events can arrive late or out of order, so streaming systems need windowing/watermarks to produce correct aggregates.' },
    ],
    'fund-ingest-cdc': [
      { q: 'What does change-data-capture (CDC) do?', choices: ['Copies the full table every night', 'Captures inserts/updates/deletes from a source and applies them downstream', 'Deletes old partitions', 'Builds indexes'], answer: 1, explain: 'CDC reads the source\'s change log and replays only the deltas, keeping a warehouse copy in near-real-time sync without full reloads.' },
      { q: 'Why is log-based CDC preferred over query-based polling?', choices: ['It needs no source database', 'It captures every change (including deletes) with low source load', 'It is always slower', 'It ignores updates'], answer: 1, explain: 'Reading the transaction log catches all changes — including deletes — with minimal impact, unlike polling a timestamp column which can miss deletes and intermediate states.' },
    ],
    'fund-elt': [
      { q: 'What is the key difference between ETL and ELT?', choices: ['ELT never transforms data', 'ELT loads raw data first, then transforms it inside the warehouse', 'ETL happens only in streaming', 'They are identical'], answer: 1, explain: 'ETL transforms before loading (external engine); ELT loads raw then transforms using the warehouse\'s own compute — the modern default given cheap, elastic warehouse compute.' },
      { q: 'Why has ELT become the common pattern for cloud warehouses?', choices: ['Warehouses cannot transform data', 'Elastic warehouse compute makes in-place transforms scalable and keeps raw data for reprocessing', 'It avoids SQL', 'It removes the need for storage'], answer: 1, explain: 'Scalable warehouse compute + cheap storage means you can land raw data and transform it with SQL, re-running transforms anytime against the preserved raw layer.' },
    ],

    /* ── Performance Mechanics ───────────────────────────────── */
    'fund-distribution': [
      { q: 'Why does data distribution/partitioning matter in an MPP system?', choices: ['It changes the SQL dialect', 'It decides which worker holds which rows, affecting parallelism and join cost', 'It compresses strings', 'It controls user permissions'], answer: 1, explain: 'How rows are spread across workers determines whether joins can happen locally (fast) or require shuffling data across the network (slow).' },
      { q: 'What is data skew?', choices: ['Evenly spread data', 'Some workers holding far more data than others, creating a bottleneck', 'A type of index', 'A compression codec'], answer: 1, explain: 'A poor distribution key sends disproportionate rows to one worker; that worker becomes the slowest and gates the whole query.' },
    ],
    'fund-pruning': [
      { q: 'What is data skipping / partition pruning?', choices: ['Deleting old rows', 'Avoiding reading files/blocks that cannot match the query predicate', 'Caching results', 'Replicating tables'], answer: 1, explain: 'Using partition values and per-block min/max stats, the engine skips data that cannot satisfy the filter, scanning only relevant portions.' },
      { q: 'Pruning is most effective when…', choices: ['Data is randomly ordered', 'Data is clustered/sorted on the columns you filter by', 'Every query is SELECT *', 'There are no predicates'], answer: 1, explain: 'If rows are ordered on the filter column, each block holds a tight value range, so most blocks can be skipped. Random order leaves overlapping ranges and little to skip.' },
    ],
    'fund-scaling': [
      { q: 'What does elastic compute let you do?', choices: ['Store data for free', 'Add/remove compute to match workload, independent of storage', 'Avoid writing SQL', 'Guarantee zero cost'], answer: 1, explain: 'Elastic compute scales up for heavy jobs, scales down or pauses when idle, and can run multiple isolated clusters over the same data.' },
      { q: 'How is concurrency (many simultaneous users) typically handled?', choices: ['By refusing extra queries', 'By adding transient/extra compute so queries do not queue behind each other', 'By deleting data', 'By disabling caching'], answer: 1, explain: 'Warehouses spin up additional compute (e.g. concurrency scaling / multi-cluster) so bursts of concurrent queries run in parallel instead of queuing.' },
    ],
    'fund-caching': [
      { q: 'What does a result cache return?', choices: ['A recompressed table', 'The stored output of an identical earlier query, with no recompute', 'A random sample', 'The query plan only'], answer: 1, explain: 'If the same query runs again and the underlying data is unchanged, the engine returns the cached result instantly using no compute.' },
      { q: 'When is a result cache entry invalidated?', choices: ['Never', 'When the underlying data changes', 'When the user logs out', 'Every second'], answer: 1, explain: 'Caches are invalidated on data change so results are never stale; otherwise identical queries reuse the cached answer.' },
    ],

    /* ── Data & Modeling ─────────────────────────────────────── */
    'fund-modeling': [
      { q: 'In a star schema, what sits at the center?', choices: ['A dimension table', 'A fact table surrounded by dimension tables', 'An index', 'A view'], answer: 1, explain: 'A central fact table (measurements/events) joins out to descriptive dimension tables — the classic analytical model.' },
      { q: 'What does a fact table typically hold?', choices: ['Descriptive attributes like product name', 'Numeric measures and foreign keys to dimensions', 'User permissions', 'Query plans'], answer: 1, explain: 'Facts store the measurable events (amounts, counts, durations) plus keys linking to the dimensions that describe them.' },
      { q: 'What is the "grain" of a fact table?', choices: ['Its compression codec', 'The level of detail each row represents', 'Its distribution key', 'The number of columns'], answer: 1, explain: 'Grain is what one fact row means (e.g. one row per order line). Declaring grain first is the foundational step in dimensional design.' },
    ],
    'fund-lakehouse': [
      { q: 'What is an open table format (Iceberg / Delta / Hudi)?', choices: ['A proprietary file type', 'A metadata layer over data-lake files giving tables ACID, schema, and time travel', 'A compression algorithm', 'A BI tool'], answer: 1, explain: 'Open table formats add a transaction/metadata layer over Parquet files in object storage, bringing warehouse-like guarantees to the data lake.' },
      { q: 'What problem does the lakehouse pattern aim to solve?', choices: ['Making SQL slower', 'Avoiding copying data between a lake and a separate warehouse', 'Removing storage', 'Eliminating columns'], answer: 1, explain: 'A lakehouse lets engines query one open copy in the lake directly, avoiding duplicate warehouse loads while keeping ACID and performance.' },
    ],

    /* ── Operations ──────────────────────────────────────────── */
    'fund-governance': [
      { q: 'What does role-based access control (RBAC) grant privileges to?', choices: ['Individual rows only', 'Roles, which users and other roles inherit', 'IP addresses', 'Specific CPUs'], answer: 1, explain: 'RBAC assigns privileges to roles; users get access by being granted roles, making permissions manageable at scale.' },
      { q: 'What is the difference between row-level security and column masking?', choices: ['They are the same', 'RLS filters which rows a user sees; masking hides/obscures values in a column', 'RLS encrypts disks', 'Masking deletes rows'], answer: 1, explain: 'RLS restricts visible rows via a policy predicate; dynamic masking transforms sensitive column values (e.g. redact PII) based on the viewer\'s role.' },
    ],
    'fund-cost': [
      { q: 'In a decoupled, consumption-priced warehouse, what usually drives cost most?', choices: ['Number of tables', 'Compute time (and data scanned)', 'Number of users', 'Column names'], answer: 1, explain: 'You largely pay for compute running and/or bytes scanned; idle, well-pruned, well-cached workloads cost far less.' },
      { q: 'Which practice most directly lowers scan-based cost?', choices: ['SELECT * everywhere', 'Partition pruning and selecting only needed columns', 'Disabling compression', 'Running every query twice'], answer: 1, explain: 'Scanning fewer bytes — via pruning, clustering, and narrow column selection — directly reduces both runtime and cost.' },
    ],

  };
})();
