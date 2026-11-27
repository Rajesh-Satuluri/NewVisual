/* content/db-internals-roadmap.js — the "DB Internals Roadmap" Mastery & Review
   lesson, as DATA. A suggested learning path: a sequence of milestones from
   beginner to advanced, each a stop with prerequisites. Same step shape as
   every other db-scale lesson, but with no per-step metrics (this is a guide,
   not a simulation). `scene` is a view-snapshot consumed by
   db/db-internals-roadmap-scene.js. */

export const dbInternalsRoadmapLesson = {
  id: 'db-internals-roadmap',
  title: 'DB Internals Roadmap',
  group: 'Mastery & Review',
  summary: 'A suggested path through database internals: start with the relational model and storage basics, then indexing and execution, then transactions and recovery, then replication and partitioning, then consensus — and finish with the labs and system design.',
  minutes: 8,
  level: 'beginner',
  metrics: [],
  goals: [
    { text: 'A concrete order to learn database internals in', step: 0 },
    { text: 'Start: relational model, SQL, how storage works', step: 1 },
    { text: 'Core: indexing, query execution, the buffer pool', step: 2 },
    { text: 'ACID: transactions, the WAL, isolation, recovery', step: 3 },
    { text: 'Scale out: replication and partitioning', step: 4 },
    { text: 'Advanced: consensus, CAP, and the labs', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / the path
      chapter: 'setup', short: 'The path',
      title: 'A route, not a pile of topics',
      body: [
        `Database internals is a big field, but there is a <b>natural order</b> to learn it in — each milestone unlocks the next. Rushing ahead means later topics feel like magic; following the path means they feel inevitable.`,
        `Six stops: <span class="term">Start</span> → <span class="term">Core</span> → <span class="term">ACID</span> → <span class="term">Scale</span> → <span class="term">Distributed</span> → <span class="term">Mastery</span>. Each builds on the one before. Here is what to study at each, and why it comes when it does.`,
      ],
      callout: { kind: 'tip', text: 'Learn in dependency order: foundations before indexes, indexes before transactions, a single node before a distributed one. The path is the prerequisite graph laid flat.' },
      scene: { view: 'start', note: 'Six milestones from beginner to advanced — a route through the internals.' },
    },
    { // 1 — START
      chapter: 'technique', short: 'Start',
      title: 'Start: the model and the medium',
      body: [
        `Begin with the <span class="term">relational model</span> — tables, rows, keys, constraints — and enough <b>SQL</b> to express real questions. Then learn how data physically lives: <b>pages</b> on disk, rows packed into them, and why sequential I/O beats random.`,
        `This is the vocabulary everything else uses. You cannot reason about an index before you know what a page is, or about a query plan before you know what a table is.`,
      ],
      callout: { kind: 'insight', text: 'Before any clever engineering: what is a row, a table, a key, a page? These primitives are referenced by every later topic — learn them cold.' },
      scene: { view: 'start', note: 'Relational model + SQL + pages — the primitives everything references.' },
    },
    { // 2 — CORE
      chapter: 'technique', short: 'Core',
      title: 'Core: find rows fast, run queries',
      body: [
        `Next, make reads fast. Learn <span class="term">indexing</span> — <b>B+trees</b> and hash indexes — and how the <span class="term">buffer pool</span> caches hot pages so random access is affordable. Then learn <span class="term">query execution</span>: scans, joins, the operators that turn a plan into rows.`,
        `Add the <b>optimizer</b> once the operators make sense: it only has choices to price because you now know the alternatives (index vs scan, hash vs nested-loop join).`,
      ],
      callout: { kind: 'tip', text: 'Indexing, the buffer pool and execution are the working heart of a single-node database. Learn the operators before the optimizer — you cannot price plans you do not understand.' },
      scene: { view: 'core', note: 'Indexing → buffer pool → execution → optimizer: the single-node engine.' },
    },
    { // 3 — ACID
      chapter: 'technique', short: 'ACID',
      title: 'ACID: correctness under concurrency and crashes',
      body: [
        `Now make it <b>correct</b>. Learn <span class="term">transactions</span> and the <b>ACID</b> properties, the <span class="term">WAL</span> that gives durability, <span class="term">isolation levels</span> with <b>locking</b> and <b>MVCC</b>, and <span class="term">crash recovery</span> that replays the log.`,
        `This builds straight on Core: isolation guards the very pages the executor reads, and recovery restores the buffer pool from the WAL. It is the hardest single-node material — and the most interviewed.`,
      ],
      callout: { kind: 'insight', text: 'Transactions sit on storage: durability is the WAL, isolation is locks or MVCC over pages, recovery is log replay. Master this and you understand a real single-node DBMS.' },
      scene: { view: 'acid', note: 'Transactions · WAL · isolation · recovery — correctness on one node.' },
    },
    { // 4 — SCALE
      chapter: 'technique', short: 'Scale',
      title: 'Scale: more than one machine',
      body: [
        `One node has limits. Learn <span class="term">replication</span> — shipping the WAL to copies for durability and read scaling — and <span class="term">partitioning</span> (sharding), splitting data across nodes so writes scale too.`,
        `Both reuse everything below: a replica replays the same log, a shard runs the same engine. Meet the new failure modes here — replica lag, rebalancing, hot partitions — before adding agreement on top.`,
      ],
      callout: { kind: 'tip', text: 'Scaling out copies and splits the single-node machine; it does not replace it. Replication ships the WAL; partitioning routes keys. The engine underneath is unchanged.' },
      scene: { view: 'scale', note: 'Replication + partitioning — the single node, copied and split.' },
    },
    { // 5 — DISTRIBUTED
      chapter: 'tradeoff', short: 'Distributed',
      title: 'Distributed: agreement and its price',
      body: [
        `The advanced stop: how independent nodes <b>agree</b>. Learn <span class="term">consensus</span> (Raft, Paxos), <b>quorums</b>, the <span class="term">CAP</span> theorem, and the <span class="term">consistency</span> spectrum from strong to eventual.`,
        `This is last because it <em>composes</em> everything: a distributed transaction needs single-node transactions <b>and</b> consensus; a consistency choice is a replication choice. Here the real trade-offs — latency vs consistency, availability vs correctness — come due.`,
      ],
      callout: { kind: 'warn', text: 'Distributed systems compose the earlier layers under uncertainty. You cannot shortcut to consensus: it only makes sense once transactions, replication and partitioning are solid.' },
      scene: { view: 'distributed', note: 'Consensus · quorums · CAP · consistency — agreement across nodes.' },
    },
    { // 6 — MASTERY / recap
      chapter: 'recap', short: 'Mastery',
      title: 'Mastery: put it to work',
      body: [
        `The final stop is practice. Run the <span class="term">Labs</span> to see the pieces move together, then do <span class="term">system design</span> — choose an engine, an isolation level, a replication strategy for a real workload — and rehearse the <b>interview</b> questions each milestone feeds.`,
        `Loop back as needed: the path is not one-way. But walked once in order, database internals stops being a wall of jargon and becomes a map you can navigate — and extend.`,
      ],
      callout: { kind: 'insight', text: 'Start → Core → ACID → Scale → Distributed → Mastery. Each stop is a prerequisite for the next; the labs and system design are where the whole path finally pays off.' },
      scene: { view: 'recap', note: 'Start → Core → ACID → Scale → Distributed → Mastery — the full route.' },
    },
  ],
};
