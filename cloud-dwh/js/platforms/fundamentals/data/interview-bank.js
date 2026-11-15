/* ============================================================
   Fundamentals — Interview Bank. Keyed by nav/module id.
   Each: { q, a, difficulty }. Consumed by the shared enhance layer
   via CDWH.InterviewBank.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
  viz.P.fundamentals.interviewBank = {

    /* ── Foundations ─────────────────────────────────────────── */
    'fund-olap-oltp': [
      { q: 'Explain the difference between OLTP and OLAP.', a: 'OLTP (transaction processing) runs the application: many small, concurrent, single-row operations kept correct and durable (ACID) — e.g. Postgres/MySQL behind a web app. OLAP (analytical processing) answers fewer but far larger questions that scan/aggregate millions–billions of rows across big joins — e.g. Snowflake/Redshift/Fabric behind BI. Different access patterns, different storage layouts, different scaling.', difficulty: 'easy' },
      { q: 'Why not just run analytics directly on the production OLTP database?', a: 'Two reasons. (1) Layout: OLTP stores rows together, so big column scans read huge amounts of unnecessary data. (2) Contention: heavy analytical scans would lock resources and starve the latency-sensitive app traffic. They also scale differently — OLTP for low-latency single-row writes, OLAP for high-throughput set reads. So you separate them and copy data into the warehouse.', difficulty: 'medium' },
      { q: 'How does data typically get from the OLTP side to the OLAP side?', a: 'Via ingestion: periodic batch/bulk loads, continuous streaming of events, or change-data-capture that mirrors inserts/updates/deletes from the source log. The warehouse becomes the single analytical copy that BI, reporting, and ML all read, decoupled from the live app.', difficulty: 'medium' },
    ],
    'fund-architecture': [
      { q: 'What is massively parallel processing (MPP) and why do warehouses need it?', a: 'MPP splits a query across many workers (nodes/slices), each scanning its own shard of the data in parallel, then combines the partial results. Because analytical queries routinely touch billions of rows, a single CPU can\'t keep up — parallelism across many workers is the only way to get interactive response times on that volume.', difficulty: 'easy' },
      { q: 'What does "decoupled compute and storage" mean, and what does it buy you?', a: 'Table data lives once in shared, durable object storage; compute clusters are separate and read/write that shared data (caching hot blocks locally). Benefits: size and pay for compute independently of storage, scale compute up for a big job and pause when idle, and run multiple isolated compute clusters over the same single source of truth without copying data.', difficulty: 'medium' },
      { q: 'If storage is remote object storage, how do queries stay fast?', a: 'Compute caches hot data on fast local SSD/memory and only fetches cold blocks from object storage on demand. Combined with columnar layout, compression, and pruning (so far less data is read in the first place), the working set stays local while capacity scales independently in cheap storage.', difficulty: 'hard' },
    ],
    'fund-columnar': [
      { q: 'Why is columnar storage the right layout for analytics?', a: 'Analytics reads a few columns over many rows. Storing each column\'s values together means a query reads only the columns it references — not whole rows — slashing I/O. It also compresses far better because adjacent values share a type and often repeat, which dictionary/RLE/delta encodings exploit.', difficulty: 'easy' },
      { q: 'How do zone maps / min-max statistics speed up scans?', a: 'The engine stores per-block min and max values. For a range or equality predicate, it compares the predicate against each block\'s range and skips blocks that can\'t contain a match — so it reads only the blocks that might qualify. No secondary indexes needed; effectiveness depends on data being clustered on the filter column.', difficulty: 'medium' },
      { q: 'What is the trade-off of columnar storage versus row storage?', a: 'Columnar is excellent for wide scans/aggregations but poor for OLTP-style single-row reads/writes, because reconstructing or updating one full record touches many separate column files. That\'s exactly why warehouses are columnar and app databases are row-oriented — each matches its workload.', difficulty: 'hard' },
    ],

    /* ── How Data Gets In ────────────────────────────────────── */
    'fund-ingest-overview': [
      { q: 'What are the main ingestion patterns and how do you choose between them?', a: 'Batch/bulk loads (periodic, large, simplest/cheapest), streaming (continuous, seconds-fresh, more complex), and CDC (mirror source changes in near real time). The main driver is required freshness vs cost/complexity: use batch when minutes-to-hours latency is fine, streaming/CDC when you need near-real-time data.', difficulty: 'easy' },
      { q: 'What concerns cut across all ingestion methods?', a: 'Schema evolution (sources change shape), idempotency/exactly-once (avoid duplicates on retries), ordering and late data, data quality/validation on landing, and keeping a raw landing layer so transforms can be re-run. Good ingestion is as much about correctness and reprocessing as about speed.', difficulty: 'medium' },
    ],
    'fund-ingest-batch': [
      { q: 'How do you make a bulk load fast?', a: 'Split the input into many appropriately-sized files so every worker/slice loads in parallel, load into empty/freshly-partitioned targets where possible (often enabling auto-compression), avoid row-by-row INSERTs, and stage files in object storage close to the warehouse. Parallelism across files is the biggest lever.', difficulty: 'medium' },
      { q: 'When is batch the right choice over streaming?', a: 'When the business tolerates periodic freshness (hourly/daily), volumes are large, and you want the simplest, cheapest, most robust pipeline. Batch is easier to reason about, retry, and backfill than always-on streaming, so prefer it unless latency requirements force otherwise.', difficulty: 'easy' },
    ],
    'fund-ingest-streaming': [
      { q: 'What makes streaming ingestion harder than batch?', a: 'Events arrive continuously and can be late or out of order, so you need windowing and watermarks to compute correct aggregates, plus handling for exactly-once delivery, backpressure, and small-file/compaction issues. You trade operational complexity and cost for seconds-fresh data.', difficulty: 'medium' },
      { q: 'How do you handle late-arriving events in a streaming pipeline?', a: 'Use event-time windows with watermarks: the system tracks how far event-time has progressed and allows a grace period for late data before finalizing a window. Very-late data can be routed to a correction/side path or reprocessed in batch. This keeps aggregates correct without waiting forever.', difficulty: 'hard' },
    ],
    'fund-ingest-cdc': [
      { q: 'What is change-data-capture and why use it?', a: 'CDC captures every insert/update/delete from a source system — ideally by reading its transaction log — and replays those deltas into the warehouse, keeping a near-real-time replica without full reloads. It\'s efficient (only changes move) and complete (captures deletes), unlike nightly full copies.', difficulty: 'easy' },
      { q: 'Why is log-based CDC preferred over query-based (timestamp polling) CDC?', a: 'Query-based CDC polls a modified-at column, which misses hard deletes and any intermediate states between polls, and adds load to the source. Log-based CDC reads the database\'s commit log, so it captures all changes (including deletes) in order, with minimal source impact and lower latency.', difficulty: 'medium' },
    ],
    'fund-elt': [
      { q: 'Explain ETL vs ELT and why ELT is now common.', a: 'ETL transforms data in an external engine before loading; ELT loads raw data into the warehouse first, then transforms it with the warehouse\'s own (elastic) compute via SQL. ELT dominates in the cloud because warehouse compute is scalable and cheap storage lets you keep the raw layer and re-run transforms anytime — simpler lineage and easy reprocessing.', difficulty: 'medium' },
      { q: 'What is the value of keeping a raw/landing layer in ELT?', a: 'It preserves source data exactly as received, so you can reprocess when transform logic changes, debug discrepancies, replay history, and build new models without re-ingesting. It underpins layered designs (e.g. raw → cleaned → curated / bronze → silver → gold).', difficulty: 'hard' },
    ],

    /* ── Performance Mechanics ───────────────────────────────── */
    'fund-distribution': [
      { q: 'Why does how data is distributed across workers matter so much?', a: 'In MPP, a join or aggregate is cheap when the matching rows already live on the same worker (local) and expensive when the engine must shuffle rows across the network to co-locate them. Choosing distribution/partition keys so join partners land together avoids redistribution — one of the biggest performance levers.', difficulty: 'medium' },
      { q: 'What is data skew and how do you avoid it?', a: 'Skew is when a distribution key\'s values are uneven, so one worker holds disproportionately many rows and becomes the bottleneck that gates the query. Avoid it by distributing on a high-cardinality, evenly-spread column (often the main join key), or using an even/round-robin strategy when no good key exists.', difficulty: 'hard' },
    ],
    'fund-pruning': [
      { q: 'What is partition pruning / data skipping and how does it work?', a: 'The engine uses partition values and per-block min/max statistics to avoid reading data that cannot satisfy a query\'s predicates. For `WHERE date = \'2024-01-01\'` it reads only that partition/those blocks and skips the rest, scanning a fraction of the table.', difficulty: 'medium' },
      { q: 'What determines how effective pruning is?', a: 'How well the data is clustered/sorted on the columns you filter. If rows are ordered on the predicate column, each block has a tight, non-overlapping range, so most blocks are skipped. Randomly ordered data has overlapping ranges per block, so little can be pruned — which is why clustering/sort keys exist.', difficulty: 'hard' },
    ],
    'fund-scaling': [
      { q: 'How does elastic compute change capacity planning?', a: 'Instead of provisioning for peak, you scale compute to the workload: size up for heavy ETL, down or pause when idle, and spin up separate clusters for separate teams over the same data. You pay for what you use, and workloads don\'t contend because they can run on isolated compute.', difficulty: 'easy' },
      { q: 'How do warehouses handle sudden spikes in concurrent users?', a: 'With automatic concurrency scaling / multi-cluster compute: when queries would queue, the system adds transient clusters to absorb the burst and removes them afterward. This keeps latency stable under concurrency without permanently over-provisioning.', difficulty: 'medium' },
    ],
    'fund-caching': [
      { q: 'What kinds of caching exist in a warehouse and what do they do?', a: 'Typically: a result cache (returns the stored output of an identical query with no recompute), and local data/metadata caches on compute (hot blocks on fast disk/memory so repeat scans avoid object storage). Together they make repeated and similar queries dramatically cheaper and faster.', difficulty: 'medium' },
      { q: 'When is a result cache NOT used?', a: 'When the query text differs, when the underlying data has changed (the entry is invalidated so results are never stale), or sometimes when non-deterministic functions or different permissions are involved. On a cache miss the query recomputes and may repopulate the cache.', difficulty: 'easy' },
    ],

    /* ── Data & Modeling ─────────────────────────────────────── */
    'fund-modeling': [
      { q: 'What is dimensional modeling and what are facts vs dimensions?', a: 'Dimensional modeling organizes analytical data into fact tables (numeric measures of events, plus foreign keys) surrounded by dimension tables (descriptive context like customer, product, date). This "star schema" makes queries intuitive and fast: filter/group by dimensions, aggregate measures from the fact.', difficulty: 'easy' },
      { q: 'What does declaring the "grain" of a fact table mean, and why first?', a: 'Grain is exactly what one fact row represents (e.g. one row per order line, or one row per sensor reading per minute). You declare it before choosing dimensions or measures because grain determines which dimensions apply and prevents mixing levels of detail that would double-count measures.', difficulty: 'medium' },
      { q: 'Star schema vs snowflake schema — what\'s the trade-off?', a: 'A star keeps dimensions denormalized (one table each) for simpler, faster joins. A snowflake normalizes dimensions into sub-tables, saving some space and reducing redundancy but adding joins and complexity. Most analytical designs favor star for query performance and clarity.', difficulty: 'medium' },
    ],
    'fund-lakehouse': [
      { q: 'What is a lakehouse and what problem does it solve?', a: 'A lakehouse uses open table formats (Iceberg/Delta/Hudi) to add ACID transactions, schema enforcement, and time travel to files in a data lake, so engines can query one open copy directly. It removes the need to copy data from a lake into a separate proprietary warehouse, cutting duplication while keeping warehouse-like guarantees.', difficulty: 'medium' },
      { q: 'What do open table formats add on top of plain Parquet files?', a: 'A metadata/transaction layer: atomic commits (multiple files appear together), snapshot isolation and time travel, schema and partition evolution, and efficient metadata for pruning. Plain Parquet is just files; the table format makes a set of files behave like a real, versioned table.', difficulty: 'hard' },
    ],

    /* ── Operations ──────────────────────────────────────────── */
    'fund-governance': [
      { q: 'How does role-based access control (RBAC) work in a warehouse?', a: 'Privileges are granted to roles, not directly to users; users (and other roles) inherit access by being granted roles. This makes permissions manageable at scale — you model job functions as roles, and onboarding/offboarding is just granting/revoking a role rather than editing many object grants.', difficulty: 'easy' },
      { q: 'Compare row-level security and dynamic data masking.', a: 'Row-level security attaches a policy predicate so each user sees only the rows they\'re entitled to (e.g. their region). Dynamic masking transforms sensitive column values at query time based on the viewer\'s role (e.g. show last-4 of a card, or NULL). RLS controls which rows; masking controls how column values appear.', difficulty: 'medium' },
    ],
    'fund-cost': [
      { q: 'What drives cost in a consumption-priced cloud warehouse, and how do you control it?', a: 'Cost is mostly compute time and/or bytes scanned (plus storage). Control it by right-sizing/auto-suspending compute, pruning and clustering so queries scan less, selecting only needed columns, leveraging caching, and avoiding runaway/repeated full scans. Idle, well-tuned workloads cost dramatically less.', difficulty: 'medium' },
      { q: 'How would you investigate an unexpectedly expensive query?', a: 'Look at bytes scanned and compute time, check the plan for full scans / missing pruning / data shuffles / skew, verify the filter columns are clustered, confirm it isn\'t SELECT * on a wide table, and see whether a result/materialized view could serve it. Then fix the biggest contributor — usually reducing data scanned or redistribution.', difficulty: 'hard' },
    ],

    /* ── Modeling & Design Track ─────────────────────────────── */
    'fund-dim-grain': [
      { q: 'Walk me through how you start a dimensional design.', a: 'Kimball\'s four steps: (1) pick the business process, (2) declare the grain (what one fact row means, in a sentence), (3) identify the dimensions that are true at that grain, (4) identify the measures. Grain first is non-negotiable — it decides which dimensions apply and whether measures are additive.', difficulty: 'easy' },
      { q: 'What is a conformed dimension and why does it matter?', a: 'A conformed dimension is one dimension — same keys, attributes, and meaning — reused across multiple fact tables. It lets you compare and combine facts from different processes ("revenue vs support tickets by customer by month"). Conformed dimensions are what integrate separate data marts into a coherent warehouse rather than disconnected silos.', difficulty: 'medium' },
      { q: 'What is a bus matrix and how do you use it?', a: 'A grid of business processes (rows → fact tables) by dimensions (columns), with a check where a process uses a dimension. It\'s a one-page plan of the whole warehouse: it shows which dimensions are shared/conformed and lets you deliver one fact table at a time while guaranteeing they\'ll integrate. Build it before building tables.', difficulty: 'medium' },
      { q: 'Explain role-playing dimensions with an example.', a: 'One physical dimension joined multiple times in different roles. A single dim_date connects to an orders fact as order date, ship date, and delivery date via three date keys (often exposed as three views/aliases). You maintain one date table but it "plays" several roles — avoiding duplicate date dimensions.', difficulty: 'hard' },
    ],
    'fund-star-snow': [
      { q: 'Star vs snowflake schema — explain the difference and which you\'d choose.', a: 'Star keeps each dimension as one wide denormalized table (few joins, simple SQL); snowflake normalizes dimensions into sub-table chains (less redundancy, more joins). In a columnar MPP warehouse I default to star: join count dominates performance and compression makes the repeated attributes nearly free. I\'d snowflake only specific large or governed branches.', difficulty: 'medium' },
      { q: 'Doesn\'t the redundancy in a star schema waste a lot of storage?', a: 'Far less than you\'d think. Columnar storage keeps each column together and encodes repeated values (dictionary/RLE), so a category name repeated across millions of product rows collapses to almost nothing. The storage saved by snowflaking rarely offsets the extra joins it adds to every query.', difficulty: 'hard' },
      { q: 'Is "snowflake schema" related to Snowflake the platform?', a: 'No — pure naming coincidence. "Snowflake schema" is a decades-old dimensional-modeling term for normalized dimensions (the diagram branches out like a snowflake). Snowflake the data platform is a separate vendor and actually runs star schemas very well. Worth clarifying in interviews to avoid confusion.', difficulty: 'easy' },
    ],
    'fund-fact-types': [
      { q: 'What are the three fact table types?', a: 'Transaction (one row per event — most common, atomic, fully additive), periodic snapshot (one row per entity per period, e.g. daily balance — captures state, often semi-additive), and accumulating snapshot (one row per process instance, updated as it hits milestones like placed→shipped→delivered, storing step dates/durations).', difficulty: 'medium' },
      { q: 'What is a semi-additive measure and how do you handle it?', a: 'A measure summable across some dimensions but not time — e.g. account balance or inventory on hand. Summing balances across days is meaningless. You sum across accounts/products but over time take the last value (or average). BI semantic layers often mark these explicitly so tools don\'t sum them over the date dimension.', difficulty: 'hard' },
      { q: 'What are degenerate and junk dimensions?', a: 'A degenerate dimension is a dimension attribute stored on the fact with no separate table — typically an operational identifier like order or invoice number, useful for grouping/tracing. A junk dimension collects several low-cardinality flags/indicators (channel, is_gift, status) into one small dimension instead of leaving many tiny columns scattered on the fact.', difficulty: 'medium' },
    ],
    'fund-keys': [
      { q: 'Why use surrogate keys instead of natural keys in a dimensional model?', a: 'Surrogates (meaningless warehouse integers) enable SCD Type 2 history (versioned rows need distinct PKs), insulate the warehouse from source re-keying, integrate clashing keys across sources, join/compress faster as narrow integers, and allow "unknown" members for late-arriving data. Natural keys alone can\'t support versioned history or source-change stability.', difficulty: 'medium' },
      { q: 'If you key on surrogates, do you still need the natural key?', a: 'Yes — keep it as an attribute on the dimension. You need it to look up the right dimension member when loading facts, to match incoming source rows, and for humans to trace a warehouse row back to the source system. Typical pattern: surrogate PK + natural/business key + SCD validity columns.', difficulty: 'easy' },
      { q: 'How do surrogate keys interact with late-arriving facts?', a: 'If a fact arrives before its dimension member exists, you can route it to a reserved surrogate (e.g. -1 "Unknown") and later rewire it, or insert a stub dimension row with the natural key and backfill attributes when they arrive. The surrogate indirection is what makes this graceful — the fact always has a valid key to point at.', difficulty: 'hard' },
    ],
    'fund-scd': [
      { q: 'Explain SCD Types 1, 2, and 3.', a: 'Type 1 overwrites the attribute in place — no history, always current. Type 2 preserves full history by versioning: it closes the old row (valid_to, is_current=false) and inserts a new row with a new surrogate key, so facts reference the version current at event time. Type 3 adds a "previous value" column, keeping only the last change. Type 2 is the default when point-in-time correctness matters.', difficulty: 'easy' },
      { q: 'Walk me through applying a Type 2 change in SQL.', a: 'Two steps because a single MERGE can\'t expire and re-insert for the same key: (1) UPDATE the current row whose tracked attribute changed — set valid_to to yesterday and is_current=false; (2) INSERT a new row for new customers and for changed ones, with a fresh surrogate, valid_from=today, valid_to=9999-12-31, is_current=true. Fact loads then resolve the surrogate by natural key where valid_from ≤ event_date < valid_to.', difficulty: 'medium' },
      { q: 'How does a fact table point at the correct historical version of a dimension?', a: 'During the fact load you look up the dimension\'s surrogate key by the natural/business key constrained to the event date — the version where valid_from ≤ event_date < valid_to (or is_current for live events). The fact stores that surrogate, so even after the dimension member changes again, the fact still references the state that was true when the event occurred.', difficulty: 'hard' },
      { q: 'Can one dimension use more than one SCD type?', a: 'Yes, and it\'s common. SCD type is an attribute-level decision: a customer dimension might overwrite a corrected phone number (Type 1) while versioning address/segment changes (Type 2). You choose per column based on whether that attribute\'s history is analytically meaningful — Type 6 formalizes combining approaches in one dimension.', difficulty: 'medium' },
    ],

  };
})();
