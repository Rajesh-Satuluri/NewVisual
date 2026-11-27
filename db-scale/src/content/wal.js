/* content/wal.js — the "Write-Ahead Log (WAL)" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/wal-scene.js. Rendered through the shared course shell. */

export const walLesson = {
  id: 'wal',
  title: 'Write-Ahead Log (WAL)',
  group: 'Transactions & Concurrency',
  summary: 'The one rule that makes a crash survivable: write the change to a sequential log — and force it to disk — before you ever touch the data page it describes.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['lsn', 'throughput', 'recoveryT', 'ioOps'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why an in-place page update is unsafe across a crash', step: 0 },
    { text: 'The log: append the change-record first, sequentially', step: 1 },
    { text: 'The write-ahead rule — log is durable before the page moves', step: 2 },
    { text: 'Recovery by replaying the log from start to end', step: 3 },
    { text: 'The cost of writing twice, and why it still wins', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'In-place',
      title: 'A page half-written is a page lost',
      body: [
        `A data page is 8&nbsp;KB; a disk writes in smaller sectors. Overwrite a page <em>in place</em> and lose power halfway, and you are left with a <span class="term">torn page</span> — part new bytes, part old, and no record of which.`,
        `Worse, nothing on disk even says a change was <em>in progress</em>. On restart the database cannot tell a committed change from a corrupt one. The update is simply gone, or poison.`,
      ],
      callout: { kind: 'warn', text: 'Modifying the only copy of a page is a bet against the power supply. A crash mid-write corrupts the page and erases any trace of what you were doing.' },
      metrics: { lsn: 0, throughput: 40, recoveryT: 0, ioOps: 1 },
      scene: { view: 'risk', note: 'One page, overwritten in place — a crash tears it in two.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Log first',
      title: 'Write the intent down first',
      body: [
        `Before changing anything, append a tiny <span class="term">log record</span> describing the change — "page 42, offset 16, old → new" — to an <b>append-only log</b>. Appends are purely sequential, so they are fast and never tear an existing byte.`,
        `Each record gets a monotonically increasing <span class="term">LSN</span> (log sequence number). The log becomes the authoritative history of every change, in order.`,
      ],
      callout: { kind: 'insight', text: 'The log is the source of truth. The data pages are just a cache of what the log already says — rebuildable at any time.' },
      changes: ['+ append-only log', '+ LSN per record', '~ change described before it is applied'],
      metrics: { lsn: 1, throughput: 60, recoveryT: 0, ioOps: 1 },
      scene: { view: 'wal', note: 'The change is recorded in the log before the heap is touched.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Order',
      title: 'The write-ahead rule',
      body: [
        `The rule has one word that matters: <b>ahead</b>. The log record must be <span class="term">durable</span> — flushed with <code>fsync</code> all the way to the platter — <em>before</em> the dirty data page is allowed to reach disk.`,
        `In the buffer pool the page can change immediately; it just may not be <em>written back</em> until its log record is safe. Log first (1), page later (2). Always.`,
      ],
      callout: { kind: 'tip', text: 'WAL invariant: for every page write, its log record is already on durable storage. Flush the log, then you are free to flush the page.' },
      changes: ['+ fsync log before page', '~ page dirtied in RAM now, flushed later', '+ durability point = log fsync'],
      metrics: { lsn: 4, throughput: 120, recoveryT: 0, ioOps: 2 },
      scene: { view: 'order', note: 'Step 1: log → disk (fsync). Step 2: page may follow.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Replay',
      title: 'Recover by reading the log',
      body: [
        `After a crash the data files may be stale or torn, but the log is intact up to the last fsync. Recovery simply <b>replays</b> it: read records start → end and re-apply each to the pages, rebuilding the exact committed state.`,
        `Anything whose log record never made it to disk was never promised to anyone — so losing it is correct, not a bug. The log draws a clean line between committed and not.`,
      ],
      callout: { kind: 'insight', text: 'Recovery is deterministic: same log, same final state, every time. The database heals itself by re-reading its own history.' },
      changes: ['+ replay log start → end', '~ torn pages overwritten by replay', '+ exact committed state restored'],
      metrics: { lsn: 6, throughput: 110, recoveryT: 3, ioOps: 6 },
      scene: { view: 'replay', note: 'Crash, then replay the log to reconstruct every page.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Cost',
      title: 'Every change written twice',
      body: [
        `WAL is not free. Each change is persisted <em>twice</em> — once as a log record, once in the page — and the <code>fsync</code> on commit adds latency you can feel.`,
        `But the two writes are not equal. Log writes are small and <b>sequential</b> (the disk's happy path); page writes are large and <b>random</b>, and can be deferred and batched. You trade a cheap second write for a guarantee you cannot otherwise buy.`,
      ],
      callout: { kind: 'tip', text: 'Write amplification is real, but sequential log I/O is far cheaper than the random page I/O it lets you delay. Durability for the price of an append.' },
      metrics: { lsn: 9, throughput: 180, recoveryT: 3, ioOps: 3 },
      scene: { view: 'tradeoff', note: 'Pay one cheap sequential write; buy guaranteed durability.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The log underneath everything',
      body: [
        `WAL is two ideas: an <b>append-only log</b> of every change, and the <b>write-ahead ordering</b> that keeps the log one step in front of the data. Together they give durability and fast, deterministic recovery.`,
        `This single mechanism is the foundation the rest of the course leans on — crash recovery replays it, checkpoints bound it, and replication ships it to other nodes byte-for-byte.`,
      ],
      callout: { kind: 'insight', text: 'Append + write-ahead ordering = durability + replayable history. Checkpoints, recovery and replication are all just ways of using the log.' },
      metrics: { lsn: 9, throughput: 180, recoveryT: 3, ioOps: 3 },
      scene: { view: 'recap', note: 'One sequential log: durability, recovery and replication in one.' },
    },
  ],
};
