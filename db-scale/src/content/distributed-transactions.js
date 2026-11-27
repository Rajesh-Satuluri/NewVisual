/* content/distributed-transactions.js — the "Distributed Transactions" lesson,
   as DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/distributed-transactions-scene.js. */

export const distributedTransactionsLesson = {
  id: 'distributed-transactions',
  title: 'Distributed Transactions',
  group: 'Distributed Systems',
  summary: 'One atomic transaction spanning many nodes: either every participant commits or none do. A coordinator makes it possible — and makes it slow.',
  minutes: 9,
  level: 'advanced',
  metrics: ['txns', 'commits', 'aborts', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a cross-shard write cannot just commit locally', step: 0 },
    { text: 'Atomic commitment: all-or-nothing across nodes', step: 1 },
    { text: 'PREPARE, then COMMIT — a unanimous two-phase vote', step: 2 },
    { text: 'A dead coordinator leaves participants blocked', step: 3 },
    { text: 'Why real systems work hard to avoid distributed txns', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Two shards',
      title: 'Debit here, credit there',
      body: [
        `Move $100 from Alice to Bob. Alice’s balance lives on <span class="term">shard A</span>, Bob’s on <span class="term">shard B</span>. The transaction is two writes on two different machines, and it must be <b>all-or-nothing</b>: debit <em>and</em> credit, or neither.`,
        `The trap: each shard can commit its own write just fine. But shard A can crash the instant after it debits Alice, before shard B ever credits Bob — and now $100 has simply vanished. A local commit on each node is <b>not</b> an atomic commit across both.`,
      ],
      callout: { kind: 'warn', text: 'Independent local commits are not atomic. Any node can crash or go unreachable between the two writes, leaving the transaction half-applied and money lost.' },
      metrics: { txns: 1, commits: 0, aborts: 0, latency: 20 },
      scene: { view: 'problem', note: 'Two shards, one transfer — and a crash can land right between the two writes.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Coordinator',
      title: 'A coordinator drives atomic commitment',
      body: [
        `Introduce a <span class="term">coordinator</span> — a referee that owns the outcome of the whole transaction. No participant decides on its own; instead each one promises to do what the coordinator finally says, and only then.`,
        `The goal is <span class="term">atomic commitment</span>: a protocol in which all participants reach the <em>same</em> verdict — commit or abort — even though they are separate machines. The coordinator turns many local writes into one global decision.`,
      ],
      callout: { kind: 'insight', text: 'Atomic commitment means every participant agrees on one outcome. A coordinator collects votes and announces a single verdict that all nodes obey.' },
      changes: ['+ coordinator owns the transaction', '~ participants defer their commit', '+ one global commit/abort for all'],
      metrics: { txns: 1, commits: 0, aborts: 0, latency: 35 },
      scene: { view: 'coordinator', note: 'A coordinator sits above the shards — it, not any node, decides the outcome.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Prepare',
      title: 'Phase one: everybody must vote yes',
      body: [
        `The coordinator sends <code>PREPARE</code> to every participant. Each one does the work, writes it <b>durably</b> as “prepared but not committed,” locks the rows, and votes <span class="term">YES</span> — or, if it cannot, votes <span class="term">NO</span>.`,
        `This is the two-phase-commit vote (see the dedicated lesson for the mechanics). The rule is <b>unanimity</b>: the coordinator commits only if <em>every</em> participant voted yes. One NO, and the whole transaction must abort.`,
      ],
      callout: { kind: 'insight', text: 'PREPARE asks each node to durably stage its write and vote. Commit requires a unanimous yes — a single no, timeout, or lost vote forces a global abort.' },
      changes: ['+ PREPARE fans out to all shards', '+ each stages durably and votes', '✓ unanimous YES → proceed'],
      metrics: { txns: 1, commits: 0, aborts: 0, latency: 55 },
      scene: { view: 'prepare', note: 'Phase one: PREPARE out, votes back — all must say YES.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Commit',
      title: 'Phase two: announce the verdict',
      body: [
        `With all votes in, the coordinator records the decision and sends <code>COMMIT</code> (or <code>ABORT</code>) to everyone. Each participant makes its staged write permanent, releases its locks, and acknowledges.`,
        `Only now is the transfer real on <b>both</b> shards at once. The debit and the credit land together — atomicity achieved across two independent machines.`,
      ],
      callout: { kind: 'tip', text: 'Phase two makes the staged writes permanent everywhere. Both shards flip together, so the debit and credit become visible as a single atomic step.' },
      changes: ['+ COMMIT fans out to all', '+ staged writes made permanent', '+ locks released, transfer done'],
      metrics: { txns: 1, commits: 1, aborts: 0, latency: 70 },
      scene: { view: 'commit', note: 'Phase two: COMMIT out — both shards make the write permanent together.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Blocked',
      title: 'The coordinator is a dangerous bottleneck',
      body: [
        `The catch: between the votes and the verdict, every participant sits <b>prepared</b> — locked, waiting, unable to decide alone. If the <span class="term">coordinator crashes</span> right then, those locks are held <em>indefinitely</em>. The participants are blocked, and so is everyone else touching those rows.`,
        `On top of that, two round-trips plus durable writes make distributed transactions <b>slow</b>, and the coordinator is a single point of failure that drags availability down. So real systems avoid them: co-locate related data on one shard, or use <span class="term">sagas</span> — a chain of local transactions with compensating undo steps instead of one global commit.`,
      ],
      callout: { kind: 'warn', text: 'A coordinator failure after PREPARE leaves participants blocked with locks held. 2PC is slow and lowers availability — prefer co-location or sagas where you can.' },
      changes: ['− coordinator dies → locks stuck', '− extra round-trips → high latency', '~ prefer co-location or sagas'],
      metrics: { txns: 1, commits: 0, aborts: 0, latency: 999 },
      scene: { view: 'blocked', note: 'Coordinator down after PREPARE — participants hold locks and cannot proceed.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Atomicity across nodes — at a price',
      body: [
        `A distributed transaction makes a write span many machines atomic: a coordinator runs a <b>prepare-then-commit</b> vote, and only a unanimous yes commits. It works — but it is slow, and a coordinator crash can block participants with locks held.`,
        `That blocking weakness is exactly what <b>three-phase commit</b> and <b>consensus</b> (Raft, Paxos) set out to fix, by removing the single point of failure. The best distributed transaction, though, is often the one you designed away.`,
      ],
      callout: { kind: 'insight', text: 'Prepare-then-commit gives atomicity across nodes but blocks on coordinator failure. 3PC and consensus address that — or avoid cross-node transactions entirely.' },
      metrics: { txns: 1, commits: 1, aborts: 0, latency: 70 },
      scene: { view: 'recap', note: 'All-or-nothing across nodes — powerful, costly, and best avoided when you can.' },
    },
  ],
};
