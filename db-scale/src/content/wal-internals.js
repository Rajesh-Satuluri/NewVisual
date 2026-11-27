/* content/wal-internals.js — the "WAL Internals" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/wal-internals-scene.js. Rendered through the shared course shell.

   A concrete, physical companion to the WAL lesson: what a log record actually
   contains, how LSNs address it, the in-RAM WAL buffer, group commit, and the
   segment files the log is chopped into. */

export const walInternalsLesson = {
  id: 'wal-internals',
  title: 'WAL Internals',
  group: 'Transactions & Concurrency',
  summary: 'Open the write-ahead log and look at the machinery: the byte layout of a log record, the LSN that addresses it, the RAM buffer it lands in, group commit, and the segment files it all lives in.',
  minutes: 10,
  level: 'advanced',
  metrics: ['lsn', 'throughput', 'ioOps', 'commits'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The fields inside a single WAL record', step: 0 },
    { text: 'The LSN: a monotonic, byte-offset address for every change', step: 1 },
    { text: 'The in-RAM WAL buffer and when it is flushed', step: 2 },
    { text: 'Group commit: many transactions, one fsync', step: 3 },
    { text: 'Segment files, archiving and recycling', step: 4 },
  ],

  steps: [
    { // 0 — TECHNIQUE: record anatomy
      chapter: 'technique', short: 'Record',
      title: 'Anatomy of one log record',
      body: [
        `Every change the database makes appends a <span class="term">log record</span> to the WAL before the data page itself is touched. A record is not prose — it is a packed, fixed-then-variable byte structure.`,
        `It carries its own <b>LSN</b> (where it sits in the log), a <b>prev-LSN</b> back-pointer to the same transaction's previous record, the <b>txid</b> that wrote it, a <b>type</b> (insert / update / commit / abort), the <b>page-id</b> it affects, the <b>before</b> and <b>after</b> images needed to undo and redo it, and a trailing <b>CRC</b> so recovery can tell a torn record from a whole one.`,
      ],
      callout: { kind: 'insight', text: 'A WAL record is self-describing: it says where it is (LSN), what came before it (prev-LSN), who wrote it (txid), what it changed (page-id + before/after) and whether it is intact (CRC).' },
      metrics: { lsn: 4096, throughput: 40, ioOps: 1, commits: 0 },
      scene: { view: 'record', note: 'One record: LSN · prev-LSN · txid · type · page · before/after · CRC.' },
    },
    { // 1 — TECHNIQUE: LSN
      chapter: 'technique', short: 'LSN',
      title: 'The LSN addresses everything',
      body: [
        `The <span class="term">Log Sequence Number</span> is simply the byte offset of a record inside the log — so it only ever goes <em>up</em>, and it uniquely names every change ever made.`,
        `Each data <b>page</b> stamps the LSN of the last record applied to it in its header (<code>pageLSN</code>). On recovery the rule is trivial: if a record's LSN is greater than the page's stored LSN, the change was not yet on disk — redo it; otherwise skip it. One monotonic number drives the whole redo decision.`,
      ],
      callout: { kind: 'tip', text: 'pageLSN ≥ record LSN → the change is already durable, skip. record LSN > pageLSN → redo. The LSN is a clock and an address at once.' },
      changes: ['+ LSN = byte offset in log', '+ pages stamp pageLSN', '~ redo iff recLSN > pageLSN'],
      metrics: { lsn: 8192, throughput: 60, ioOps: 2, commits: 0 },
      scene: { view: 'lsn', note: 'Records on a rising LSN axis; pages remember the last LSN applied.' },
    },
    { // 2 — TECHNIQUE: WAL buffer
      chapter: 'technique', short: 'WAL buffer',
      title: 'First to RAM, then to the log',
      body: [
        `Appending every record straight to disk would mean an fsync per change — far too slow. Instead records are first written to an in-RAM <span class="term">WAL buffer</span>, a small shared ring of pages.`,
        `The buffer is flushed to the on-disk log when a transaction <b>commits</b> (its commit record must be durable before the commit returns), when the buffer <b>fills</b>, or at a background interval. Until then the records sit in memory — fast to write, not yet safe.`,
      ],
      callout: { kind: 'warn', text: 'A record in the WAL buffer is NOT durable. Only an fsync of the log makes it survive a crash — which is exactly why commit blocks on that flush.' },
      changes: ['+ in-RAM WAL buffer (ring)', '~ flush on commit / full / timer', '− buffered ≠ durable'],
      metrics: { lsn: 16384, throughput: 120, ioOps: 3, commits: 1 },
      scene: { view: 'buffer', note: 'Records collect in the RAM WAL buffer, then flush down to the disk log.' },
    },
    { // 3 — SOLUTION: group commit
      chapter: 'solution', short: 'Group commit',
      title: 'Many commits, one fsync',
      body: [
        `fsync is the expensive part — milliseconds of waiting on the disk. If a hundred transactions commit at nearly the same moment, forcing a hundred separate fsyncs would waste almost all of them.`,
        `<span class="term">Group commit</span> batches them: the first committer waits a sliver of time while others pile their commit records into the same buffer, then <b>one</b> fsync makes the whole batch durable at once. Latency per transaction barely moves; throughput multiplies.`,
      ],
      callout: { kind: 'insight', text: 'Group commit amortizes the fsync across every transaction that happened to commit in the same window — the single biggest write-throughput trick in a WAL.' },
      changes: ['+ batch concurrent commit records', '~ one fsync per batch', '+ throughput ↑↑'],
      metrics: { lsn: 65536, throughput: 540, ioOps: 1, commits: 32 },
      scene: { view: 'groupcommit', note: 'Four transactions merge into one batched fsync to the log.' },
    },
    { // 4 — TECHNIQUE: segments
      chapter: 'technique', short: 'Segments',
      title: 'The log is a row of segment files',
      body: [
        `A single unbounded file would be impossible to archive or recycle. So the log is split into fixed-size <span class="term">segment files</span> — 16&nbsp;MB each in Postgres — numbered in order.`,
        `New records append to the <b>active</b> segment. A filled segment is closed and handed off: <b>archived</b> for backup and replication, then eventually <b>recycled</b> — renamed and reused once a checkpoint proves its records are no longer needed for recovery. Replicas simply stream the segments in LSN order.`,
      ],
      callout: { kind: 'tip', text: 'Fixed-size segments turn an infinite log into a manageable queue of files you can archive, ship to replicas and recycle — all keyed by LSN order.' },
      changes: ['+ fixed-size segment files', '~ active → archived → recycled', '+ replicas stream segments'],
      metrics: { lsn: 131072, throughput: 540, ioOps: 4, commits: 96 },
      scene: { view: 'segments', note: 'Filled segments are archived and recycled; one stays active for appends.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The machinery, assembled',
      body: [
        `Put it together: every change becomes a self-describing <b>record</b>, addressed by a monotonic <b>LSN</b> that also drives redo. Records land in a RAM <b>buffer</b>, are made durable in batches by <b>group commit</b>, and are stored in recyclable <b>segment files</b>.`,
        `That is why a write-ahead log can be fast (buffered, group-committed), durable (fsync before commit returns) and streamable (ordered segments) all at once — the backbone under transactions, crash recovery and replication alike.`,
      ],
      callout: { kind: 'insight', text: 'Record · LSN · buffer · group commit · segments. Each piece buys one property — self-description, addressing, speed, throughput, shippability — and together they make the WAL.' },
      metrics: { lsn: 131072, throughput: 560, ioOps: 4, commits: 96 },
      scene: { view: 'recap', note: 'Record → LSN → buffer → group commit → segments: the whole WAL pipeline.' },
    },
  ],
};
