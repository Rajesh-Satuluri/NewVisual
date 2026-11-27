/* content/book-concept-mapping.js — "Book Concept Mapping", as DATA.

   A reference page: it maps this course's lessons onto the two canonical
   texts — Alex Petrov's Database Internals and Martin Kleppmann's Designing
   Data-Intensive Applications — part by part, so a reader knows where to go
   deeper. No live metrics; the scene is a clean side-by-side summary.

   Same shape as every db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }. */

export const bookConceptMappingLesson = {
  id: 'book-concept-mapping',
  title: 'Book Concept Mapping',
  group: 'Mastery & Review',
  summary: 'Where every lesson lives in the two canonical books: Petrov’s Database Internals (storage + distributed) and Kleppmann’s Designing Data-Intensive Applications (foundations, distributed data, derived data).',
  minutes: 8,
  level: 'intermediate',
  metrics: [],
  goals: [
    { text: 'See how the course mirrors two canonical texts', step: 0 },
    { text: 'Database Internals Part I ↔ the storage-engine lessons', step: 1 },
    { text: 'Database Internals Part II ↔ the distributed lessons', step: 2 },
    { text: 'DDIA Part I ↔ foundations, storage and transactions', step: 3 },
    { text: 'DDIA Part II ↔ replication, partitioning, consistency', step: 4 },
    { text: 'DDIA Part III ↔ batch, stream and derived data', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / overview
      chapter: 'setup', short: 'Two books',
      title: 'Two books, one course',
      body: [
        `This course is built on two references. <span class="term">Database Internals</span> by <b>Alex Petrov</b> goes deep on <em>how one node works</em> and <em>how nodes agree</em>: Part I is Storage Engines, Part II is Distributed Systems.`,
        `<span class="term">Designing Data-Intensive Applications</span> by <b>Martin Kleppmann</b> zooms out to <em>system design</em>: Part I Foundations, Part II Distributed Data, Part III Derived Data. Petrov tells you how the machinery is built; Kleppmann tells you how to choose and compose it.`,
        `Each lesson in this course corresponds to a chapter or section of these books. This page is the index: use it to find the source material behind any topic you want to push further.`,
      ],
      callout: { kind: 'tip', text: 'Rule of thumb: reach for Petrov when you want to know how a thing is implemented, and Kleppmann when you want to know which thing to pick and why.' },
      scene: { view: 'overview', note: 'Database Internals (how it works) and DDIA (how to design with it).' },
    },
    { // 1 — DI Part I ↔ storage engines
      chapter: 'technique', short: 'DI · Storage',
      title: 'Database Internals I ↔ Storage Engines',
      body: [
        `Petrov’s <b>Part I</b> is a tour of the single-node storage engine. It builds <span class="term">B-Trees</span> and their on-disk cousins, then the write-optimized <span class="term">LSM-Tree</span> with its SSTables and compaction.`,
        `It also covers the plumbing every engine shares: fixed-size <span class="term">pages</span> with slotted layout, the <span class="term">buffer pool</span> that caches them, and the <span class="term">write-ahead log</span> that makes updates durable and crash recoverable.`,
      ],
      callout: { kind: 'insight', text: 'The storage chapters are the foundation: pages on disk, a buffer pool over them, a B-Tree or LSM index into them, and a WAL in front for durability.' },
      changes: [
        'B-Tree Basics ↔ b-tree, b+tree search/insert/delete, root split',
        'Log-Structured Storage ↔ lsm, sstable, memtable+wal, compaction',
        'File Formats & Page Layout ↔ pages, slotted-pages, database-files',
        'Buffer / Recovery ↔ buffer-pool, page-cache, wal-internals, checkpoints',
      ],
      scene: { view: 'di-storage', note: 'Database Internals Part I → the storage-engine lessons.' },
    },
    { // 2 — DI Part II ↔ distributed
      chapter: 'technique', short: 'DI · Distributed',
      title: 'Database Internals II ↔ Distributed',
      body: [
        `Petrov’s <b>Part II</b> turns one node into many. It starts with the hard primitives: <span class="term">failure detection</span> by heartbeats and timeouts, then <span class="term">leader election</span> to pick a coordinator.`,
        `From there it builds up <span class="term">replication</span> and ordering, and finally <span class="term">consensus</span> — Paxos and <span class="term">Raft</span> — so a cluster can agree on a single value or log entry despite crashes and partitions.`,
      ],
      callout: { kind: 'insight', text: 'Distributed storage is a stack: detect who is alive, elect a leader, replicate the log, and run consensus so everyone agrees on its order.' },
      changes: [
        'Failure Detection ↔ failure-detection, heartbeats',
        'Leader Election ↔ leader-election, split-brain',
        'Replication & Consistency ↔ replication, consistency, quorum',
        'Consensus ↔ consensus, raft-concepts, raft-consensus, consensus-lab',
      ],
      scene: { view: 'di-distributed', note: 'Database Internals Part II → the distributed-systems lessons.' },
    },
    { // 3 — DDIA Part I ↔ foundations
      chapter: 'technique', short: 'DDIA · I',
      title: 'DDIA I ↔ Foundations',
      body: [
        `Kleppmann’s <b>Part I</b> is single-node foundations. <em>Data Models & Query Languages</em> weighs relational against document and graph; <em>Storage & Retrieval</em> contrasts B-Trees with LSM from the application’s point of view.`,
        `It closes with <span class="term">Transactions</span> — ACID, the weak isolation levels and their anomalies, and the concurrency control (locking, MVCC) that enforces them. This is where the course’s foundations and transaction tracks live.`,
      ],
      callout: { kind: 'insight', text: 'DDIA Part I is the shared ground: how you model data, how the engine stores and retrieves it, and what transactions actually guarantee.' },
      changes: [
        'Data Models ↔ relational-model, data-models, schema-constraints',
        'Storage & Retrieval ↔ storage-hierarchy, b-tree vs lsm, index-types',
        'Transactions ↔ transactions, isolation-levels, locking, mvcc',
        'Encoding & Evolution ↔ records-tuples, dbms-architecture',
      ],
      scene: { view: 'ddia-single', note: 'DDIA Part I → foundations, storage and transaction lessons.' },
    },
    { // 4 — DDIA Part II ↔ distributed data
      chapter: 'technique', short: 'DDIA · II',
      title: 'DDIA II ↔ Distributed Data',
      body: [
        `Kleppmann’s <b>Part II</b> distributes the data. <em>Replication</em> compares single-leader, multi-leader and leaderless; <em>Partitioning</em> shards a dataset by key range or hash and rebalances it.`,
        `<em>The Trouble with Distributed Systems</em> catalogues partial failures, unreliable clocks and network partitions, and <em>Consistency & Consensus</em> frames linearizability, <span class="term">CAP</span> and the quorums and consensus needed to cope.`,
      ],
      callout: { kind: 'insight', text: 'Part II is the trade-off core: replicate for availability, partition for scale, and pay for both in consistency and failure handling.' },
      changes: [
        'Replication ↔ replication-models, sync/async, multi-leader, quorum',
        'Partitioning ↔ partitioning, hash/range, consistent-hashing, rebalancing',
        'Trouble w/ Distributed ↔ partial-failure, network-partition, failure-modes',
        'Consistency & Consensus ↔ strong/eventual-consistency, cap-theorem, consensus',
      ],
      scene: { view: 'ddia-distributed', note: 'DDIA Part II → replication, partitioning and consistency lessons.' },
    },
    { // 5 — DDIA Part III ↔ derived data
      chapter: 'technique', short: 'DDIA · III',
      title: 'DDIA III ↔ Derived Data',
      body: [
        `Kleppmann’s <b>Part III</b> is about systems built <em>on top of</em> databases. <em>Batch Processing</em> is the MapReduce/dataflow model; <em>Stream Processing</em> is unbounded event streams and the log as the system of record.`,
        `Change Data Capture (<span class="term">CDC</span>), event logs and <span class="term">materialized views</span> tie it together: one source of truth is transformed into many derived, read-optimized representations kept in sync by streams.`,
      ],
      callout: { kind: 'tip', text: 'Derived data flips the mindset: stop updating many stores in place; keep one ordered log and derive every other view from it.' },
      changes: [
        'Batch Processing ↔ batch-processing, dataflow-architecture',
        'Stream Processing ↔ stream-processing, event-logs',
        'Change Data Capture ↔ cdc, oltp-cdc-kafka-stream-olap',
        'Derived & Integration ↔ materialized-views, derived-data, data-integration',
      ],
      scene: { view: 'ddia-derived', note: 'DDIA Part III → batch, stream and change-data-capture lessons.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The map in one view',
      body: [
        `Two books, five parts. Petrov’s <b>Database Internals</b> is the implementation half — <em>storage engines</em> then <em>distributed systems</em>. Kleppmann’s <b>DDIA</b> is the design half — <em>foundations</em>, <em>distributed data</em>, then <em>derived data</em>.`,
        `Every lesson in this course has a home in that grid. When a topic feels thin, open the matching chapter: Petrov for the mechanism, Kleppmann for the judgement about when and why to use it.`,
      ],
      callout: { kind: 'insight', text: 'Database Internals = how it works (storage · distributed). DDIA = how to design with it (foundations · distributed data · derived data).' },
      scene: { view: 'recap', note: 'Petrov builds the machine; Kleppmann teaches you to design with it.' },
    },
  ],
};
