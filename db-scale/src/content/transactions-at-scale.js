/* content/transactions-at-scale.js — the "Transactions at Scale" lesson (DDIA
   ch.7), as DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/transactions-at-scale-scene.js. */

export const transactionsAtScaleLesson = {
  id: 'transactions-at-scale',
  title: 'Transactions at Scale',
  group: 'Data-Intensive (DDIA)',
  summary: 'Single-node ACID is well understood — but concurrency corrupts data through anomalies, and sharding stretches a transaction across machines. This is the ladder from weak isolation to serializable, and why distributed transactions hurt.',
  minutes: 9,
  level: 'advanced',
  metrics: ['txns', 'latency', 'conflicts', 'aborts'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why concurrent transactions corrupt data', step: 0 },
    { text: 'Isolation levels climb a ladder of guarantees', step: 1 },
    { text: 'Snapshot isolation gives each txn its own view', step: 2 },
    { text: 'Three roads to true serializability', step: 3 },
    { text: 'Why spanning partitions multiplies the cost', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Anomalies',
      title: 'Concurrency quietly corrupts data',
      body: [
        `A transaction on one machine is a solved problem: <span class="term">ACID</span> promises all-or-nothing writes that survive a crash. But run two transactions <b>at the same time</b> and the real hazard appears — not crashes, but <span class="term">concurrency anomalies</span>.`,
        `Two clerks read a balance of 100, each adds 50, each writes back 150 — one update is silently <b>lost</b>. Elsewhere a report reads half-way through someone else's transfer and sees money that exists in neither account. Nobody errored; the data is just wrong.`,
      ],
      callout: { kind: 'warn', text: 'Dirty reads, lost updates, read skew and write skew are not crashes — they are correct-looking results from interleaved transactions. Without isolation they slip in silently.' },
      metrics: { txns: 2, latency: 8, conflicts: 2, aborts: 0 },
      scene: { view: 'anomaly', note: 'Two transactions interleave on one row — one write is lost, no error raised.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Isolation',
      title: 'Isolation levels: a ladder of guarantees',
      body: [
        `The fix is <span class="term">isolation</span> — the I in ACID — the illusion that each transaction runs alone. It comes in grades. <b>Read Committed</b> blocks dirty reads and dirty writes. <b>Snapshot Isolation</b> adds a stable read view. <b>Serializable</b> is the top rung: the result must match <em>some</em> order of running the transactions one at a time.`,
        `Each rung prevents more anomalies — and costs more. Most databases default to a <b>weak</b> level (Read Committed), which means the anomalies it does <em>not</em> prevent are yours to worry about.`,
      ],
      callout: { kind: 'insight', text: 'Higher isolation prevents more anomalies at higher cost. Serializable is the only level that makes concurrent execution indistinguishable from serial — know which rung your database defaults to.' },
      changes: ['+ read committed: no dirty reads', '+ snapshot: stable read view', '+ serializable: as if run one-at-a-time'],
      metrics: { txns: 4, latency: 14, conflicts: 1, aborts: 0 },
      scene: { view: 'ladder', note: 'Four isolation levels; each higher rung blocks more of the anomalies below.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Snapshot',
      title: 'Snapshot isolation: your own frozen view',
      body: [
        `The workhorse of modern databases is <span class="term">snapshot isolation</span>, built on <span class="term">MVCC</span> — multi-version concurrency control. When a transaction begins it is handed a <b>consistent snapshot</b>: every read sees the database as it was at that instant, ignoring any writes committed since.`,
        `Because readers never block writers and writers never block readers, a long analytics query and a stream of small writes coexist happily. It cures dirty reads and read skew for free — but <b>lost updates</b> and <b>write skew</b> can still slip through.`,
      ],
      callout: { kind: 'tip', text: 'Snapshot isolation (MVCC) gives each transaction a frozen view, so reads and writes never block each other. It kills read anomalies — but not write skew or lost updates.' },
      changes: ['+ MVCC keeps old row versions', '~ each txn reads its own snapshot', '− write skew still possible'],
      metrics: { txns: 6, latency: 11, conflicts: 0, aborts: 1 },
      scene: { view: 'snapshot', note: 'Two transactions, two frozen snapshots — reads never see each other’s in-flight writes.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Serializable',
      title: 'Three roads to true serializability',
      body: [
        `When you truly need "as if one at a time," there are exactly three implementations. <b>Actual serial execution</b> runs every transaction on a single thread in memory (VoltDB, Redis) — simple and fast, if your working set fits in RAM. <b>Two-phase locking (2PL)</b> makes readers and writers block each other with shared and exclusive locks — correct, but slow, and prone to <span class="term">deadlocks</span>.`,
        `<b>Serializable Snapshot Isolation (SSI)</b> is the modern optimist: run on a snapshot as usual, track read/write conflicts, and <b>abort</b> at commit time if a dangerous pattern formed. No locking in the common case — you pay only when a real conflict occurs.`,
      ],
      callout: { kind: 'insight', text: 'Serializability has three shapes: serial execution (one thread), 2PL (pessimistic locking + deadlocks), and SSI (optimistic — abort on conflict). SSI is why serializable is practical today.' },
      changes: ['+ serial: one thread, in-RAM', '+ 2PL: locks, deadlock risk', '+ SSI: optimistic, abort-on-conflict'],
      metrics: { txns: 6, latency: 19, conflicts: 2, aborts: 2 },
      scene: { view: 'serializable', note: 'Serial, 2PL and SSI — three machines that all produce a one-at-a-time result.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Distributed',
      title: 'Spanning partitions multiplies the pain',
      body: [
        `Now shard the data. A transaction that touches two partitions must coordinate a commit across machines — that is <span class="term">two-phase commit</span>, and it is <b>slow and blocking</b>: every participant holds locks while waiting, and a stalled coordinator can freeze them indefinitely. Stronger isolation plus distribution means more locking, more aborts, more latency.`,
        `So real systems dodge it. Many pick <b>weaker isolation</b> for throughput. Others <b>co-locate</b> related rows so transactions stay single-partition. A few pay for global serializability with synchronized clocks and consensus — Google <b>Spanner</b>, <b>Calvin</b> — accepting the latency as the price of correctness.`,
      ],
      callout: { kind: 'warn', text: 'A transaction across partitions needs 2PC: participants hold locks and block on the coordinator. Avoid cross-partition transactions when you can — co-locate data or weaken isolation.' },
      changes: ['+ cross-partition txn → 2PC', '− participants block on commit', '~ co-locate data or weaken isolation'],
      metrics: { txns: 6, latency: 46, conflicts: 3, aborts: 4 },
      scene: { view: 'distributed', note: 'A transaction spans two shards — 2PC holds locks on both while the coordinator decides.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Know your isolation, avoid the span',
      body: [
        `Concurrency, not crashes, is what quietly corrupts data — and the defence is <b>isolation</b>, chosen one rung at a time. Snapshot isolation handles most reads cheaply; serializable (via serial, 2PL or SSI) is the only airtight level, at a real cost in latency and aborts.`,
        `Across machines the bill climbs again: distributed transactions mean 2PC, locks and blocking. The scalable playbook is to <b>know the isolation level you actually run</b>, reach for serializable only where correctness demands it, and <b>keep transactions inside one partition</b> wherever you can.`,
      ],
      callout: { kind: 'insight', text: 'Pick isolation deliberately, use serializable where it matters, and keep transactions single-partition. Correctness under concurrency is a budget — spend it where the data demands.' },
      metrics: { txns: 6, latency: 12, conflicts: 0, aborts: 0 },
      scene: { view: 'recap', note: 'Weak → serializable, single-partition → distributed: the cost rises with every step.' },
    },
  ],
};
