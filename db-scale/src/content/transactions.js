/* content/transactions.js — the "ACID Transactions" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/transactions-scene.js. Rendered through the shared course shell. */

export const transactionsLesson = {
  id: 'transactions',
  title: 'ACID Transactions',
  group: 'Transactions & Concurrency',
  summary: 'The unit of safety inside a database: a group of reads and writes that either all happen or none do — and that leaves the data correct no matter what breaks.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['txns', 'commits', 'aborts', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a half-finished change corrupts the data', step: 0 },
    { text: 'BEGIN … COMMIT wraps many writes into one unit', step: 1 },
    { text: 'The four guarantees: Atomicity, Consistency, Isolation, Durability', step: 2 },
    { text: 'COMMIT makes every change durable at once', step: 3 },
    { text: 'ROLLBACK undoes the whole unit — and what it costs', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Partial',
      title: 'A crash halfway leaves money gone',
      body: [
        `Move $100 from account A to account B. It takes <em>two</em> writes: debit A, then credit B. Run them as two ordinary, independent writes and you have opened a window.`,
        `If the machine dies <span class="term">between</span> the two — power cut, crash, killed process — A has lost $100 and B never gained it. The database is now wrong, and no single write was itself invalid. Partial work is the enemy.`,
      ],
      callout: { kind: 'warn', text: 'Any operation that spans more than one write can be interrupted in the middle. Without a transaction, that middle state is a permanent corruption.' },
      metrics: { txns: 0, commits: 0, aborts: 0, latency: 2 },
      scene: { view: 'partial', note: 'Debit lands, crash hits, credit never runs — $100 destroyed.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'BEGIN/COMMIT',
      title: 'Wrap the writes in one transaction',
      body: [
        `Bracket the pair with <code>BEGIN</code> and <code>COMMIT</code>. Everything between them is one <span class="term">transaction</span> — a single logical unit the database treats as indivisible.`,
        `Now there is no "between." Either both writes take effect, or neither does. The debit and the credit rise and fall together, and the window where money could vanish is closed.`,
      ],
      callout: { kind: 'insight', text: 'A transaction turns many physical writes into one all-or-nothing logical change. That boundary is the whole point of BEGIN/COMMIT.' },
      changes: ['+ BEGIN opens the unit', '~ both writes grouped', '+ COMMIT or nothing'],
      metrics: { txns: 1, commits: 0, aborts: 0, latency: 3 },
      scene: { view: 'txn', note: 'Two writes enclosed in one transaction — they live or die together.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'ACID',
      title: 'Four guarantees, spelled ACID',
      body: [
        `A real transaction promises four things. <b>Atomicity</b>: all of it or none. <b>Consistency</b>: it moves the database from one valid state to another, every rule still holding. <b>Isolation</b>: concurrent transactions behave as if run one at a time. <b>Durability</b>: once committed, it survives any later crash.`,
        `These are the <span class="term">ACID</span> properties — the contract every committed transaction keeps.`,
      ],
      callout: { kind: 'tip', text: 'Atomicity · Consistency · Isolation · Durability. Atomicity protects the write; durability protects the commit; isolation protects you from everyone else.' },
      changes: ['+ Atomicity', '+ Consistency', '+ Isolation', '+ Durability'],
      metrics: { txns: 8, commits: 7, aborts: 1, latency: 3 },
      scene: { view: 'acid', note: 'Four pillars — every committed transaction keeps all four.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Commit',
      title: 'COMMIT makes it all durable at once',
      body: [
        `<code>COMMIT</code> is the moment of truth. The database writes a commit record, flushes the transaction's changes so they will survive a crash, and only then reports success.`,
        `Before the commit, the work is tentative and can disappear. After it, every change in the unit is <span class="term">durable</span> — permanently part of the database, together, as one.`,
      ],
      callout: { kind: 'insight', text: 'COMMIT is atomic: the transaction flips from "none of it is real" to "all of it is durable" in a single step. There is no partially-committed.' },
      changes: ['+ commit record written', '+ changes flushed to disk', '~ success reported'],
      metrics: { txns: 9, commits: 8, aborts: 1, latency: 4 },
      scene: { view: 'commit', note: 'COMMIT flushes both writes down to one store — durable together.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Rollback',
      title: 'ROLLBACK undoes the whole unit',
      body: [
        `If anything inside the transaction fails — a constraint violation, a deadlock, an explicit <code>ROLLBACK</code> — the database throws the <em>entire</em> unit away. The data returns to exactly the state it had before <code>BEGIN</code>, as if the transaction never ran.`,
        `That safety is not free. To make atomicity and isolation possible the database keeps locks and an undo log, and commits must reach durable storage. You trade a little raw speed for a correctness guarantee no application-level code can match.`,
      ],
      callout: { kind: 'tip', text: 'Rollback is just "replay the undo log backwards." The cost of transactions — locks, undo, durable commits — is the price of never seeing a corrupt half-state.' },
      metrics: { txns: 10, commits: 8, aborts: 2, latency: 4 },
      scene: { view: 'rollback', note: 'A failed write rolls the whole unit back — and the bookkeeping it costs.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The transaction is the unit of safety',
      body: [
        `A transaction is the smallest group of work the database will let you treat as one. It is <b>atomic</b> (all or nothing), keeps the data <b>consistent</b>, runs in <b>isolation</b> from others, and once <b>committed</b> is <b>durable</b> forever.`,
        `Everything in this section — the write-ahead log, MVCC, locking, isolation levels, crash recovery — is a mechanism for delivering one of these four ACID promises. This lesson is the contract; the rest is how it is kept.`,
      ],
      callout: { kind: 'insight', text: 'Atomic · Consistent · Isolated · Durable. Hold these four; every transaction mechanism that follows exists to honour one of them.' },
      metrics: { txns: 10, commits: 8, aborts: 2, latency: 4 },
      scene: { view: 'acid', note: 'One unit, four guarantees — the foundation for everything in this section.' },
    },
  ],
};
