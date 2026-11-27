/* content/follow-the-transaction.js — the "Follow the Transaction" interactive
   lab, as DATA. A guided trace of ONE money-transfer transaction through ACID:
   it ties together transactions, MVCC snapshots, row-version writes, locking and
   the WAL commit point. Same lesson shape as the other db-scale lessons: each
   step is { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/follow-the-transaction-scene.js. */

export const followTheTransactionLesson = {
  id: 'follow-the-transaction',
  title: 'Follow the Transaction',
  group: 'Interactive Labs',
  summary: 'Trace one money transfer end to end — BEGIN, snapshot, versioned writes, isolation, and the WAL commit point — and watch the four ACID letters fall out of the mechanics.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['txns', 'locks', 'versions', 'commits'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The transfer must be all-or-nothing, and never half-seen', step: 0 },
    { text: 'BEGIN pins a consistent snapshot for the transaction', step: 1 },
    { text: 'Each UPDATE writes a NEW row version, old ones stay visible', step: 2 },
    { text: 'A concurrent reader keeps seeing pre-commit values', step: 3 },
    { text: 'COMMIT writes to the WAL and flips everything visible at once', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The transfer',
      title: 'Move $100 from A to B — atomically',
      body: [
        `Our transaction is four lines: <code>BEGIN; UPDATE A −=100; UPDATE B +=100; COMMIT;</code>. Two rows change, and they must change <b>together</b>. If the server crashed between the two updates, account <span class="term">A</span> would lose $100 that <span class="term">B</span> never gained — money vaporised.`,
        `Worse, a <b>concurrent reader</b> is summing both balances right now. If it ever saw A already debited but B not yet credited, it would read a total that never truly existed. We need <span class="term">Atomicity</span>, <span class="term">Isolation</span> and <span class="term">Durability</span> — all at once.`,
      ],
      callout: { kind: 'warn', text: 'A multi-row change has two enemies: a crash that applies only part of it, and a reader that peeks mid-way. ACID exists to defeat both.' },
      metrics: { txns: 1, locks: 0, versions: 0, commits: 0 },
      scene: { view: 'intro', note: 'One transfer, two rows, and a reader watching — everything must stay consistent.' },
    },
    { // 1 — BEGIN & SNAPSHOT
      chapter: 'technique', short: 'BEGIN',
      title: 'BEGIN pins a snapshot',
      body: [
        `<code>BEGIN</code> hands the transaction an <span class="term">id</span> (say <code>txn 42</code>) and, under <span class="term">MVCC</span>, a <b>consistent snapshot</b> of the database as of this instant. From now on our transaction sees a frozen world, no matter who else commits.`,
        `The concurrent reader gets its <em>own</em> snapshot too. Both currently see <b>A = 500</b>, <b>B = 300</b> — the committed versions. Nobody can read a half-written value, because nothing has been written yet.`,
      ],
      callout: { kind: 'insight', text: 'A snapshot is just a visibility rule: “show me the newest version committed before my transaction began.” It is what gives each transaction a stable view.' },
      changes: ['+ txn 42 opened', '+ snapshot pinned at A=500, B=300'],
      metrics: { txns: 1, locks: 0, versions: 0, commits: 0 },
      scene: { view: 'snapshot', note: 'txn 42 and the reader each pin a snapshot — both see the committed A=500, B=300.' },
    },
    { // 2 — WRITES CREATE VERSIONS
      chapter: 'technique', short: 'Writes',
      title: 'Each UPDATE writes a new version',
      body: [
        `<code>UPDATE A −=100</code> does not overwrite the old row. It appends a <b>new version</b> — <code>A = 400</code>, tagged with <code>txn 42</code> and marked <span class="term">uncommitted</span>. The old <code>A = 500</code> version stays put. Same for <code>UPDATE B +=100</code> → a new <code>B = 400</code> version.`,
        `To write, txn 42 takes a <span class="term">lock</span> on each row it changes. Locks make <b>writers block writers</b> — a second transfer touching A must wait — but under MVCC they do <em>not</em> block readers, who simply follow the old versions.`,
      ],
      callout: { kind: 'tip', text: 'New-version-on-write is the trick behind both rollback and isolation: the old value is never destroyed, so undoing is free and readers are never disturbed.' },
      changes: ['+ A: new version 400 (txn 42, uncommitted)', '+ B: new version 400 (txn 42, uncommitted)', '+ 2 row locks held'],
      metrics: { txns: 1, locks: 2, versions: 2, commits: 0 },
      scene: { view: 'writes', note: 'Two new uncommitted versions appear; the old versions remain, and two write-locks are held.' },
    },
    { // 3 — ISOLATION
      chapter: 'technique', short: 'Isolation',
      title: 'The reader still sees the old world',
      body: [
        `Here is isolation in action. The concurrent reader re-reads A and B — and still sees <b>A = 500, B = 300</b>. Its snapshot predates txn 42's commit, so the new uncommitted versions are <span class="term">invisible</span> to it. No dirty read, ever.`,
        `This is why its running total stays a consistent $800. The isolation level decides exactly which versions each reader may follow; snapshot isolation — the common default — gives every statement a stable, committed-only view.`,
      ],
      callout: { kind: 'insight', text: 'Isolation is not “one at a time.” It is “everyone sees a coherent version of history,” achieved by pointing each reader at the right versions instead of blocking them.' },
      metrics: { txns: 2, locks: 2, versions: 2, commits: 0 },
      scene: { view: 'isolation', note: 'The reader follows the old versions — A=500, B=300 — while txn 42’s writes stay hidden.' },
    },
    { // 4 — COMMIT
      chapter: 'solution', short: 'COMMIT',
      title: 'COMMIT: one durable, atomic flip',
      body: [
        `<code>COMMIT</code> writes a single <b>commit record</b> to the <span class="term">WAL</span> and flushes it to disk. That one durable write is the <span class="term">commit point</span>: the instant before it, the transaction can still abort to nothing; the instant after, it is permanent — a crash now will <b>replay</b> it on recovery (Durability).`,
        `Marking txn 42 committed makes <b>both</b> new versions visible at the same logical moment — Atomicity: all-or-nothing, with no in-between a reader could catch. The row locks release, and a fresh reader now sees <b>A = 400, B = 400</b>.`,
      ],
      callout: { kind: 'tip', text: 'Atomicity and Durability both hinge on the WAL commit record. Writes can dribble out in any order; it is that one marker that makes them count — together, and for good.' },
      changes: ['+ commit record → WAL (fsync)', '~ both versions now committed & visible', '− 2 locks released'],
      metrics: { txns: 1, locks: 0, versions: 2, commits: 1 },
      scene: { view: 'commit', note: 'A commit record hits the WAL; both new versions turn visible together and the locks drop.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Four letters, one trace',
      body: [
        `Follow the trace and ACID is not four features but four consequences of one design. <b>A</b>tomic: the commit point flips everything together. <b>C</b>onsistent: invariants (money conserved) hold across it. <b>I</b>solated: snapshots and versions give every reader a coherent view. <b>D</b>urable: the WAL survives the crash.`,
        `And had we typed <code>ABORT</code> instead? Trivial — the new versions are simply never marked committed, so they stay invisible and get vacuumed away. Nothing to undo, because nothing committed was ever shown.`,
      ],
      callout: { kind: 'insight', text: 'MVCC versions + row locks + a WAL commit point are the whole machine. Learn to see a transaction as versions waiting on one durable flip, and ACID stops being a mystery.' },
      metrics: { txns: 0, locks: 0, versions: 2, commits: 1 },
      scene: { view: 'recap', note: 'A·C·I·D — each letter traced back to the mechanics you just watched.' },
    },
  ],
};
