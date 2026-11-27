/* content/glossary.js — "Glossary", as DATA.

   Concise definitions of the course's essential terms, grouped by theme. Each
   step is one theme; its `changes` list carries the definitions. No live
   metrics; the scene is a clean summary of each theme's terms.

   Same shape as every db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }. */

export const glossaryLesson = {
  id: 'glossary',
  title: 'Glossary',
  group: 'Mastery & Review',
  summary: 'The course’s essential vocabulary, defined and grouped by theme: storage, query processing, transactions, distributed systems, and data-intensive systems.',
  minutes: 8,
  level: 'beginner',
  metrics: [],
  goals: [
    { text: 'Storage-engine terms, page to bloom filter', step: 0 },
    { text: 'Query-processing terms, parser to EXPLAIN', step: 1 },
    { text: 'Transaction terms, ACID to vacuum', step: 2 },
    { text: 'Distributed terms, quorum to split-brain', step: 3 },
    { text: 'Data-intensive terms, OLTP to materialized view', step: 4 },
  ],

  steps: [
    { // 0 — storage
      chapter: 'setup', short: 'Storage',
      title: 'Storage engine',
      body: [
        `Start at the bottom: how bytes live on disk and get cached in memory. These terms recur in every engine, whether it indexes with a B+Tree or an LSM-Tree.`,
      ],
      callout: { kind: 'tip', text: 'A page holds tuples; a buffer pool caches pages; a WAL protects writes; a B+Tree or LSM indexes them — the four pillars of a storage engine.' },
      changes: [
        '<b>Page</b> — fixed-size block (often 4–16 KB), the unit of disk I/O and caching',
        '<b>Tuple</b> — a stored row; its bytes live inside a page',
        '<b>Slotted page</b> — page layout with a slot directory, so rows can vary in size and move without changing their row id',
        '<b>Buffer pool</b> — in-memory cache of pages, with eviction (LRU/clock) on misses',
        '<b>WAL</b> — write-ahead log: record the change before applying it, for durability and crash recovery',
        '<b>B+Tree</b> — sorted, balanced index; in-place, read-optimized, range-friendly',
        '<b>LSM-Tree</b> — log-structured merge tree; append to a memtable, flush to SSTables, compact',
        '<b>SSTable</b> — sorted string table: an immutable, sorted on-disk file of key/value pairs',
        '<b>Bloom filter</b> — probabilistic set; says “definitely not present” to skip SSTables cheaply',
      ],
      scene: { view: 'storage', note: 'Page · tuple · buffer pool · WAL · B+Tree · LSM · SSTable · bloom.' },
    },
    { // 1 — query
      chapter: 'technique', short: 'Query',
      title: 'Query processing',
      body: [
        `A SQL string becomes a running plan through a pipeline: parse, plan, optimize, execute. These terms name each stage and the structures it builds.`,
      ],
      callout: { kind: 'insight', text: 'Parser → AST → logical plan → optimizer (cost model) → physical plan → execution. EXPLAIN lets you read the plan the optimizer chose.' },
      changes: [
        '<b>Parser</b> — turns SQL text into a syntax tree, checking grammar',
        '<b>AST</b> — abstract syntax tree: the parsed query as a structured tree',
        '<b>Logical plan</b> — what to compute (relational algebra), independent of how',
        '<b>Physical plan</b> — how to compute it: concrete operators and access paths',
        '<b>Optimizer</b> — searches equivalent plans for the cheapest one',
        '<b>Cost model</b> — estimates each plan’s cost from statistics (rows, selectivity)',
        '<b>Join algorithm</b> — nested-loop, hash, or sort-merge join, each with its own cost shape',
        '<b>EXPLAIN</b> — shows the chosen plan; EXPLAIN ANALYZE adds measured runtimes',
      ],
      scene: { view: 'query', note: 'Parser → AST → logical → optimizer → physical → EXPLAIN.' },
    },
    { // 2 — transactions
      chapter: 'technique', short: 'Txn',
      title: 'Transactions',
      body: [
        `Correctness under concurrency and crashes. These terms cover what a transaction guarantees and the machinery — versions, locks, logs — that enforces it.`,
      ],
      callout: { kind: 'insight', text: 'ACID is the promise; MVCC and 2PL are two ways to keep it; checkpoint and vacuum are the housekeeping that keeps it affordable.' },
      changes: [
        '<b>ACID</b> — atomicity, consistency, isolation, durability',
        '<b>MVCC</b> — multi-version concurrency control: readers see a snapshot, never block writers',
        '<b>Isolation level</b> — how much concurrency anomaly is allowed (Read Committed … Serializable)',
        '<b>2PL</b> — two-phase locking: acquire locks, then release; serializes conflicting txns',
        '<b>Deadlock</b> — a wait-for cycle where transactions each hold what another needs',
        '<b>Checkpoint</b> — flush dirty pages and mark the log, bounding crash-recovery time',
        '<b>Vacuum</b> — reclaim space from dead tuples left by MVCC updates and deletes',
        '<b>Dead tuple</b> — an old row version no transaction can still see; vacuum removes it',
      ],
      scene: { view: 'txn', note: 'ACID · MVCC · isolation · 2PL · deadlock · checkpoint · vacuum.' },
    },
    { // 3 — distributed
      chapter: 'technique', short: 'Distributed',
      title: 'Distributed systems',
      body: [
        `Many nodes, unreliable networks. These terms name how data is copied, split, and kept in agreement across machines that can fail independently.`,
      ],
      callout: { kind: 'warn', text: 'Replication copies data, partitioning splits it, quorums and consensus keep copies in agreement — and split-brain is what goes wrong when agreement fails.' },
      changes: [
        '<b>Replication</b> — keeping copies of data on multiple nodes for availability and reads',
        '<b>Leader / follower</b> — one node accepts writes; others replicate them',
        '<b>Quorum</b> — a majority (W + R &gt; N) that must agree for a read/write to count',
        '<b>Partition / shard</b> — splitting a dataset across nodes by key range or hash',
        '<b>Consistent hashing</b> — maps keys to nodes on a ring so rebalancing moves few keys',
        '<b>Consensus</b> — agreeing on one value/log order despite failures (Paxos, Raft)',
        '<b>Raft</b> — an understandable consensus protocol: leader election + replicated log',
        '<b>CAP</b> — under a partition, choose consistency or availability',
        '<b>Split-brain</b> — two nodes both believe they are leader, diverging the data',
      ],
      scene: { view: 'distributed', note: 'Replication · leader/follower · quorum · shard · hashing · Raft · CAP.' },
    },
    { // 4 — data-intensive
      chapter: 'technique', short: 'Data-intensive',
      title: 'Data-intensive systems',
      body: [
        `Systems built on top of databases: analytics, pipelines, and streams. These terms distinguish transactional from analytical work and name the dataflow patterns that connect them.`,
      ],
      callout: { kind: 'tip', text: 'OLTP serves the app, OLAP serves analysis; CDC and event logs ship changes between them so derived views stay in sync.' },
      changes: [
        '<b>OLTP</b> — online transaction processing: many small, fast reads/writes (the app)',
        '<b>OLAP</b> — online analytical processing: large scans and aggregations (analysis)',
        '<b>CDC</b> — change data capture: stream a database’s row changes to other systems',
        '<b>Event log</b> — an append-only, ordered record of events; the source of truth',
        '<b>Stream processing</b> — continuous computation over unbounded event streams',
        '<b>Batch processing</b> — bounded computation over a fixed dataset (MapReduce-style)',
        '<b>Materialized view</b> — a precomputed, stored query result, refreshed from its sources',
      ],
      scene: { view: 'dataint', note: 'OLTP · OLAP · CDC · event log · stream · batch · materialized view.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The vocabulary, grouped',
      body: [
        `Five themes cover the course’s language: <b>storage</b> (how bytes live and get cached), <b>query</b> (how SQL becomes a plan), <b>transactions</b> (correctness under concurrency), <b>distributed</b> (many nodes agreeing), and <b>data-intensive</b> (systems built on top).`,
        `When a term blurs, come back here, find its theme, and re-read its neighbours — terms make the most sense next to the ones they work with.`,
      ],
      callout: { kind: 'insight', text: 'Storage · query · transactions · distributed · data-intensive — learn each term beside its theme, not alone.' },
      scene: { view: 'recap', note: 'Five themes, one shared vocabulary.' },
    },
  ],
};
