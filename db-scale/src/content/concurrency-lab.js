/* content/concurrency-lab.js — the "Concurrency Lab" interactive lesson, as
   DATA. Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/concurrency-lab-scene.js.

   A hands-on lab: run two transactions side by side, watch a lost update
   corrupt the data, fix it with locking, hit a deadlock, and break it with
   detect-and-abort. Ties together locking, isolation levels and deadlocks. */

export const concurrencyLabLesson = {
  id: 'concurrency-lab',
  title: 'Concurrency Lab',
  group: 'Interactive Labs',
  summary: 'Run two transactions at once and watch them collide: reproduce a lost update, serialize them with locks, trip a deadlock, then break it with detect-and-abort.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['txns', 'locks', 'waiting', 'deadlocks'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why interleaving two transactions can corrupt a row', step: 0 },
    { text: 'Reproduce a lost update on a shared balance', step: 1 },
    { text: 'Serialize with two-phase locking so one waits', step: 2 },
    { text: 'See locks form a wait-for cycle — a deadlock', step: 3 },
    { text: 'Break the cycle by aborting a victim, then retry', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / setup
      chapter: 'problem', short: 'Setup',
      title: 'Two transactions, one row',
      body: [
        `Welcome to the lab. We run two transactions, <span class="term">T1</span> and <span class="term">T2</span>, at the same time. Both want to touch the <b>same</b> account row, <code>balance = 100</code>.`,
        `On a single core the database <em>interleaves</em> their steps — a little of T1, a little of T2. Most interleavings are fine. But some let the two transactions step on each other and leave the row <b>wrong</b>. Let's make one happen on purpose.`,
      ],
      callout: { kind: 'tip', text: 'Concurrency means the DB can interleave the steps of T1 and T2 in any order. Correctness must hold for every possible interleaving — not just the lucky ones.' },
      metrics: { txns: 2, locks: 0, waiting: 0, deadlocks: 0 },
      scene: { view: 'setup', note: 'T1 and T2 both target the same row: balance = 100.' },
    },
    { // 1 — PROBLEM / the anomaly
      chapter: 'problem', short: 'Lost update',
      title: 'Reproduce a lost update',
      body: [
        `Run this interleaving: T1 <b>reads</b> 100. T2 <b>reads</b> 100 (before T1 writes). T1 computes <code>100 + 50</code> and <b>writes</b> 150. Then T2 computes <code>100 + 50</code> from its stale read and <b>writes</b> 150 too.`,
        `Two <code>+50</code> deposits went in; the balance should be <b>200</b>. Instead it reads <b>150</b> — T1's update was silently overwritten. One write vanished. This is a <span class="term">lost update</span>, and nothing errored.`,
      ],
      callout: { kind: 'warn', text: 'Both transactions read the old value before either wrote. The second write clobbers the first with no warning — the classic lost update anomaly.' },
      changes: ['T1 read 100 · T2 read 100', 'T1 wrote 150 · T2 wrote 150', '✗ expected 200, got 150'],
      metrics: { txns: 2, locks: 0, waiting: 0, deadlocks: 0, anomalies: 1 },
      scene: { view: 'anomaly', note: 'Interleaved reads then writes: a +50 deposit is lost, 150 ≠ 200.' },
    },
    { // 2 — SOLUTION / locking
      chapter: 'solution', short: 'Lock it',
      title: 'Serialize with a lock',
      body: [
        `Fix: make a transaction <span class="term">lock</span> the row before it touches it, and hold the lock until it commits — <span class="term">two-phase locking</span>. Now T1 locks the row, reads 100, writes 150, commits, releases.`,
        `When T2 tries to read, the lock is held, so T2 must <b>wait</b>. Only once T1 commits does T2 proceed — it reads the <em>fresh</em> 150, adds 50, writes <b>200</b>. Correct. The lock forced the two into a safe order.`,
      ],
      callout: { kind: 'insight', text: 'A write lock held to commit (2PL) makes conflicting transactions run one-at-a-time on that row. T2 blocks, then sees T1’s committed value — no lost update.' },
      changes: ['+ T1 locks the row', '~ T2 blocks until T1 commits', '✓ 100 → 150 → 200'],
      metrics: { txns: 2, locks: 1, waiting: 1, deadlocks: 0 },
      scene: { view: 'locking', note: 'T1 holds the lock; T2 waits, then reads 150 and writes 200. Correct.' },
    },
    { // 3 — TECHNIQUE / deadlock
      chapter: 'technique', short: 'Deadlock',
      title: 'Locks can deadlock',
      body: [
        `Locks fix correctness but introduce a new hazard. Give each transaction <b>two</b> rows to update. T1 locks row <b>A</b>, then wants <b>B</b>. T2 locks row <b>B</b>, then wants <b>A</b>.`,
        `Now T1 waits for B (held by T2) and T2 waits for A (held by T1). Neither will release until it finishes, and neither can finish. This cycle in the <span class="term">wait-for graph</span> is a <span class="term">deadlock</span> — both transactions are stuck forever.`,
      ],
      callout: { kind: 'warn', text: 'A deadlock is a cycle of waits: T1 → B → T2 → A → T1. Each holds what the other needs. Left alone, both block indefinitely.' },
      changes: ['T1 holds A, waits B', 'T2 holds B, waits A', '✗ wait-for cycle — stuck'],
      metrics: { txns: 2, locks: 2, waiting: 2, deadlocks: 1 },
      scene: { view: 'deadlock', note: 'T1 holds A wants B; T2 holds B wants A — a wait-for cycle.' },
    },
    { // 4 — TRADEOFF / detection & isolation levels
      chapter: 'tradeoff', short: 'Break it',
      title: 'Detect, abort a victim, retry',
      body: [
        `The database watches the wait-for graph (or just times a lock out). When it spots the cycle it picks a <span class="term">victim</span> — say T2 — and <b>aborts</b> it. T2 rolls back, releasing row B; T1 grabs B, finishes, commits. T2 then <b>retries</b> from the start and succeeds.`,
        `You also get to <em>tune</em> how much locking happens: a weaker <span class="term">isolation level</span> (Read Committed) takes fewer locks and runs faster but allows more anomalies; <span class="term">Serializable</span> forbids them at the cost of more blocking and aborts; <span class="term">MVCC</span> lets readers skip locks entirely by reading a snapshot.`,
      ],
      callout: { kind: 'tip', text: 'Deadlocks are resolved, not prevented: detect the cycle, abort one victim, let it retry. Your isolation level trades correctness against concurrency — pick deliberately.' },
      changes: ['+ detector finds the cycle', '− abort victim T2, roll back', '↺ T2 retries and commits'],
      metrics: { txns: 2, locks: 1, waiting: 0, deadlocks: 0, aborts: 1 },
      scene: { view: 'resolve', note: 'Cycle detected → abort T2 (victim) → T1 commits → T2 retries.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What the lab proved',
      body: [
        `Concurrency is correct only if it is <em>isolated</em>. Unguarded interleavings lose updates and read garbage; locking (2PL) or MVCC restores a safe order. Locks in turn can deadlock, so databases <b>detect</b> cycles and <b>abort</b> a victim to retry.`,
        `The dial you control is the <b>isolation level</b>: lower it for throughput and accept weaker guarantees, raise it for safety and accept more waiting and aborts. Know which level your app runs at — the default is often weaker than you think.`,
      ],
      callout: { kind: 'insight', text: 'Interleave → anomaly → lock → deadlock → detect+abort+retry. Isolation buys correctness; its level is a throughput-vs-safety trade you should set on purpose.' },
      metrics: { txns: 2, locks: 0, waiting: 0, deadlocks: 0 },
      scene: { view: 'recap', note: 'Isolation makes concurrency correct — at a throughput cost you choose.' },
    },
  ],
};
