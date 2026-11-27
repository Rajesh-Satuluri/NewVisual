/* content/isolation-levels.js — the "Isolation Levels" lesson, as DATA.
   Same shape as content/dbms.js. Rendered through db/isolation-levels-scene.js. */

export const isolationLevelsLesson = {
  id: 'isolation-levels',
  title: 'Isolation Levels',
  group: 'Transactions & Concurrency',
  summary: 'The dial between correctness and concurrency — four standard levels, each forbidding one more read anomaly at the cost of throughput.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['anomalies', 'txns', 'throughput', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The three classic read anomalies: dirty, non-repeatable, phantom', step: 0 },
    { text: 'Read Committed — never read uncommitted data', step: 1 },
    { text: 'Repeatable Read — a stable snapshot per transaction', step: 2 },
    { text: 'Serializable — as if transactions ran one at a time', step: 3 },
    { text: 'The ladder: more isolation, less concurrency', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Anomalies',
      title: 'Three ways a read can lie',
      body: [
        `Run two transactions at once with no guardrails and a read can return something that was never really true. There are three classic ways this bites.`,
        `A <span class="term">dirty read</span> sees another transaction's uncommitted write — which may roll back. A <span class="term">non-repeatable read</span> reads the same row twice in one transaction and gets two different committed values. A <span class="term">phantom</span> runs the same range query twice and the second run gains rows that appeared in between.`,
      ],
      callout: { kind: 'warn', text: 'Dirty read · non-repeatable read · phantom. Isolation levels are defined entirely by which of these three they promise to prevent.' },
      metrics: { anomalies: 3, txns: 9000, throughput: 120, latency: 4 },
      scene: { view: 'anomalies', note: 'Three transactions, three ways a read goes wrong.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'Read Committed',
      title: 'Read Committed: only committed data',
      body: [
        `The first rung up. Every read returns only data that has already <b>committed</b> — an in-flight write from another transaction is invisible until it commits. Dirty reads are gone.`,
        `But each statement reads the <em>latest</em> committed value independently, so reading the same row twice can still see two values, and a range can still grow. Non-repeatable reads and phantoms remain possible. This is the default in many databases, including PostgreSQL.`,
      ],
      callout: { kind: 'insight', text: 'Read Committed is a per-statement snapshot: no dirty reads, but no stability across statements within the transaction.' },
      changes: ['+ dirty reads blocked', '~ reads see only committed data', '− non-repeatable & phantoms remain'],
      metrics: { anomalies: 2, txns: 9000, throughput: 112, latency: 5 },
      scene: { view: 'readcommitted', note: 'Uncommitted writes stay hidden — no more dirty reads.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Repeatable Read',
      title: 'Repeatable Read: one stable snapshot',
      body: [
        `Freeze a <span class="term">snapshot</span> at the transaction's first read and serve every later read from it. Re-read any row and you get the same value you saw before, no matter who committed in between. Non-repeatable reads are gone.`,
        `In the textbook definition phantoms can still slip in — a range query might see new rows — though snapshot-based engines (PostgreSQL's Repeatable Read, MVCC) prevent most of them in practice.`,
      ],
      callout: { kind: 'insight', text: 'Repeatable Read pins a single snapshot for the whole transaction. Rows you have seen never change under you.' },
      changes: ['+ non-repeatable reads blocked', '+ stable per-transaction snapshot', '− phantoms may remain'],
      metrics: { anomalies: 1, txns: 9000, throughput: 95, latency: 7 },
      scene: { view: 'repeatable', note: 'One frozen snapshot — the same row reads the same twice.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'Serializable',
      title: 'Serializable: as if one at a time',
      body: [
        `The top rung. The database guarantees the concurrent schedule is <span class="term">equivalent</span> to <em>some</em> serial order — running the transactions one after another. Every anomaly, including phantoms, is impossible.`,
        `It is not free: the engine must detect conflicting schedules and <b>abort</b> one of the transactions to preserve the illusion, so applications must be ready to retry. Throughput is the lowest of the four levels.`,
      ],
      callout: { kind: 'tip', text: 'Serializable is the gold standard for correctness. Pay for it in aborts and retries, not in subtle data bugs.' },
      changes: ['+ phantoms blocked', '+ all anomalies impossible', '− conflicting txns abort & retry'],
      metrics: { anomalies: 0, txns: 9000, throughput: 61, latency: 14 },
      scene: { view: 'serializable', note: 'Concurrent, but equivalent to a single-file order.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The ladder',
      title: 'A ladder of four rungs',
      body: [
        `Line the levels up and the pattern is clear. <b>Read Uncommitted</b> forbids nothing, <b>Read Committed</b> forbids dirty reads, <b>Repeatable Read</b> adds non-repeatable reads, and <b>Serializable</b> forbids phantoms too.`,
        `Each rung you climb removes one more anomaly — and costs concurrency, because the engine holds more state, keeps snapshots longer, or aborts more often. Higher is safer and slower.`,
      ],
      callout: { kind: 'insight', text: 'The four levels are a total order: each forbids a strict superset of the anomalies below it. Safety up, concurrency down.' },
      metrics: { anomalies: 0, txns: 9000, throughput: 61, latency: 14 },
      scene: { view: 'ladder', note: 'Climb the ladder: each rung forbids one more anomaly.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Pick the weakest level that is safe',
      body: [
        `Isolation is a dial, not a switch. Choose the <em>lowest</em> level that forbids the anomalies your application genuinely cannot tolerate, and keep the concurrency the higher rungs would throw away.`,
        `A reporting dashboard may be fine on Read Committed; a money transfer wants Serializable. Most workloads live comfortably at Repeatable Read. The next lessons show how MVCC and locking actually deliver these guarantees.`,
      ],
      callout: { kind: 'tip', text: 'Match the level to the cost of being wrong. Weakest-that-is-safe keeps both correctness and throughput.' },
      metrics: { anomalies: 0, txns: 9000, throughput: 61, latency: 14 },
      scene: { view: 'recap', note: 'The right rung is the lowest one your data can survive.' },
    },
  ],
};
