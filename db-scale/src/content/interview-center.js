/* content/interview-center.js — the "Interview Center" lesson, as DATA.
   Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }.
   `scene` is a view-snapshot consumed by db/interview-center-scene.js.

   A map of the database-internals / system-design interview: the topic areas
   that get probed, the questions asked inside each, and how to structure an
   answer that lands. Organized by area, then a framing playbook. */

export const interviewCenterLesson = {
  id: 'interview-center',
  title: 'Interview Center',
  group: 'Mastery & Review',
  summary: 'A map of the database-internals interview — storage, query, transactions, and distribution — with the questions that get asked in each area and a framing playbook for answering them well.',
  minutes: 11,
  level: 'advanced',
  metrics: [],
  goals: [
    { text: 'See the four areas every DB-internals interview covers', step: 0 },
    { text: 'Answer storage questions: B+Tree vs LSM, when to index', step: 1 },
    { text: 'Walk a query through parse → plan → execute, read an EXPLAIN', step: 2 },
    { text: 'Speak ACID, isolation levels, MVCC vs locking fluently', step: 3 },
    { text: 'Reason about replication, partitioning, CAP, consensus', step: 4 },
    { text: 'Frame any answer: restate → trade-offs → pick → justify', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / the map
      chapter: 'setup', short: 'The map',
      title: 'What they actually test',
      body: [
        `A database-internals interview is not a trivia quiz. It probes whether you can <b>reason about mechanisms</b> and <em>trade-offs</em> under a concrete workload. Four areas come up again and again.`,
        `<span class="term">Storage</span> — how bytes land on disk and how indexes find them. <span class="term">Query</span> — how a statement becomes a plan and runs. <span class="term">Transactions</span> — how concurrent work stays correct. <span class="term">Distributed</span> — how the system survives more data and more machines. Expect depth, not breadth: they drill one branch until you run out of road.`,
      ],
      callout: { kind: 'insight', text: 'Every strong answer names the workload first (read/write ratio, size, latency target), then reasons from it. "It depends" is correct only when you say what it depends on.' },
      scene: { view: 'overview', note: 'Four areas: storage, query, transactions, distribution.' },
    },
    { // 1 — TECHNIQUE / storage & indexing
      chapter: 'technique', short: 'Storage',
      title: 'Storage & indexing',
      body: [
        `The anchor comparison: <span class="term">B+Tree</span> vs <span class="term">LSM-tree</span>. A B+Tree updates in place — great for reads and range scans, but every write is a random page write. An LSM-tree batches writes in memory and flushes sorted runs, so it is <b>write-optimized</b> at the cost of read and space amplification, which compaction trades back.`,
        `Then indexing judgement: an index speeds reads but taxes every write and consumes space. A <span class="term">covering index</span> answers a query from the index alone — no heap fetch. You index the columns that filter or sort hot queries, not every column.`,
      ],
      callout: { kind: 'tip', text: 'Say "write-optimized vs read-optimized" out loud and attach it to the structure: LSM sequential-writes-then-merge, B+Tree update-in-place. Then let the workload pick.' },
      changes: [
        'Q: Why is an LSM-tree write-optimized?',
        'Q: When does an index hurt instead of help?',
        'Q: What is a covering index and why avoid the heap?',
        'Q: B+Tree vs LSM for a write-heavy log?',
      ],
      scene: { view: 'storage', note: 'B+Tree (read-optimized) vs LSM (write-optimized); index the hot columns.' },
    },
    { // 2 — TECHNIQUE / query execution
      chapter: 'technique', short: 'Query',
      title: 'How a query runs',
      body: [
        `Trace the pipeline: <b>parse</b> → <b>bind</b> → <b>optimize</b> → <b>execute</b>. The optimizer is the star — it enumerates plans and uses statistics (row counts, histograms) to estimate cost, then picks the cheapest. You should be able to read an <code>EXPLAIN</code> and spot a sequential scan where an index scan belongs.`,
        `Know the <span class="term">join algorithms</span> and when each wins: <b>nested loop</b> for a small outer with an index on the inner, <b>hash join</b> for large unsorted equi-joins, <b>merge join</b> when both inputs are already sorted. A wrong cardinality estimate is the usual reason a plan goes bad.`,
      ],
      callout: { kind: 'insight', text: 'Interviewers love "the query is slow — what do you check?" Answer with EXPLAIN first: look at the join order, the access method, and whether estimated rows match reality.' },
      changes: [
        'Q: Walk a SELECT from text to result.',
        'Q: Nested-loop vs hash vs merge join — pick one.',
        'Q: What does the optimizer use to choose a plan?',
        'Q: EXPLAIN shows a seq scan on 10M rows — now what?',
      ],
      scene: { view: 'query', note: 'parse → optimize (stats) → execute; pick the join by input shape.' },
    },
    { // 3 — TECHNIQUE / transactions
      chapter: 'technique', short: 'Txn',
      title: 'Transactions & isolation',
      body: [
        `Define <span class="term">ACID</span> crisply, then go straight to <b>isolation levels</b> and the anomalies each permits: Read Committed allows non-repeatable reads; Repeatable Read still allows phantoms; only <b>Serializable</b> forbids them all. Name the anomaly, not just the level.`,
        `The mechanism question: <span class="term">MVCC</span> vs <span class="term">locking</span>. MVCC gives each reader a consistent snapshot so readers never block writers — at the cost of version storage and vacuum. Pessimistic locking blocks instead, and lock cycles cause <b>deadlocks</b>, which the DB breaks by aborting a victim.`,
      ],
      callout: { kind: 'tip', text: 'Map level → anomaly it still allows → mechanism. "Serializable stops phantoms; Postgres does it with SSI over MVCC; the cost is more aborts you must retry."' },
      changes: [
        'Q: Which isolation level stops phantom reads?',
        'Q: MVCC vs two-phase locking — trade-offs?',
        'Q: How does the DB detect and resolve a deadlock?',
        'Q: What does the "I" in ACID actually guarantee?',
      ],
      scene: { view: 'txn', note: 'Isolation level → anomaly allowed; MVCC snapshots vs locking.' },
    },
    { // 4 — TECHNIQUE / distributed
      chapter: 'technique', short: 'Distributed',
      title: 'Replication, partitioning, consensus',
      body: [
        `Scaling questions split three ways. <span class="term">Replication</span> for availability: sync is safe but slow, async is fast but the replica lags and can lose the tail on failover. <span class="term">Partitioning</span> for size: hash spreads load evenly, range keeps scans local but risks hot shards; <b>consistent hashing</b> limits how much data moves when a node joins.`,
        `Then the hard core: <span class="term">CAP</span> — under a partition you choose consistency or availability, not both — and <span class="term">consensus</span> (Raft/Paxos), where a write commits once a <b>majority</b> acknowledges, so the cluster tolerates a minority failing. Watch for <b>hot keys</b>: a single celebrity row defeats any sharding scheme.`,
      ],
      callout: { kind: 'insight', text: 'CAP is about the partition case only. The real question is "how much staleness / unavailability can this feature tolerate?" — answer per feature, not per database.' },
      changes: [
        'Q: Sync vs async replication — what do you lose?',
        'Q: Why consistent hashing over plain modulo?',
        'Q: Raft needs how many nodes to tolerate 1 failure?',
        'Q: A hot key is overloading one shard — fix it.',
      ],
      scene: { view: 'distributed', note: 'Replicate for HA, partition for size, consensus needs a majority.' },
    },
    { // 5 — SOLUTION / framing playbook
      chapter: 'solution', short: 'How to answer',
      title: 'The framing playbook',
      body: [
        `Structure beats recall. Use four moves on every open-ended question. <b>Restate</b> the problem and the workload so you solve the right one. Lay out the <b>trade-offs</b> — the two or three viable options and what each costs. <b>Pick</b> one decisively. <b>Justify</b> it against the stated workload, and name what would change your mind.`,
        `This is the STAR of system design: it turns "I don't know" into "here is how I'd reason it out," which is what they are grading. Think out loud, draw the boxes, and state assumptions as you go — a wrong assumption surfaced early is cheap; a silent one is fatal.`,
      ],
      callout: { kind: 'tip', text: 'Restate → trade-offs → pick → justify. Memorize the four moves, not answers. They work on a question you have never seen.' },
      changes: [
        '1. Restate: "write-heavy, 100k/s, reads rare" ✓',
        '2. Trade-offs: B+Tree vs LSM, their costs',
        '3. Pick: LSM — decisively',
        '4. Justify: against the workload + caveats',
      ],
      scene: { view: 'howto', note: 'Restate → trade-offs → pick → justify: the four moves.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Walk in with the map',
      body: [
        `Four areas, one method. <b>Storage</b>, <b>query</b>, <b>transactions</b>, <b>distribution</b> — know the anchor comparison in each and the trade-off it turns on. Over the top, the four framing moves make any unseen question tractable.`,
        `Prepare by reasoning, not memorizing. For each area, practice saying the mechanism, then the cost, then the workload that flips the decision. Do that, and the interview stops being a test of recall and becomes a conversation you can steer.`,
      ],
      callout: { kind: 'insight', text: 'Storage · query · txn · distributed, each a trade-off; restate → trade-offs → pick → justify over the top. Mechanism, cost, workload — in that order, every time.' },
      scene: { view: 'recap', note: 'Four areas + one framing method = a steerable interview.' },
    },
  ],
};
