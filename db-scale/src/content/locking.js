/* content/locking.js — the "Locking & Deadlocks" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/locking-scene.js. Rendered through the shared course shell. */

export const lockingLesson = {
  id: 'locking',
  title: 'Locking & Deadlocks',
  group: 'Transactions & Concurrency',
  summary: 'How a database lets many transactions touch the same data at once without corrupting it — serialize the conflicts with locks, and untangle the cycles those locks can create.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['locks', 'waiting', 'deadlocks', 'txns'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why uncoordinated writers lose updates', step: 0 },
    { text: 'Shared vs exclusive lock modes', step: 1 },
    { text: 'Two-phase locking and serializability', step: 2 },
    { text: 'How a wait-for cycle deadlocks', step: 3 },
    { text: 'Detecting a cycle and aborting a victim', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Race',
      title: 'Two writers, one lost update',
      body: [
        `Two transactions both read the same account balance of <code>100</code>. Each adds <code>50</code> and writes <code>150</code> back. Run them in the browser-tab sense of "at the same time" and one write simply <em>overwrites</em> the other.`,
        `The correct answer was <code>200</code>. Because nothing forced the two writers to take turns, one increment vanished — a classic <span class="term">lost update</span>. Read-modify-write on shared data is unsafe the moment a second writer appears.`,
      ],
      callout: { kind: 'warn', text: 'Interleaved read-modify-write silently loses data. Without coordination, "last writer wins" and every earlier change is thrown away.' },
      metrics: { locks: 0, waiting: 0, deadlocks: 0, txns: 2 },
      scene: { view: 'race', note: 'Both read 100, both write 150 — the database ends at 150, not 200.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'S / X',
      title: 'Shared and exclusive locks',
      body: [
        `Before touching a row, a transaction must take a <span class="term">lock</span> on it. A <b>shared</b> (S) lock is for reading — many transactions can hold S on the same row at once, because reads never conflict.`,
        `A <b>exclusive</b> (X) lock is for writing. Only one transaction may hold X, and it cannot be granted while <em>any</em> other lock is held. So readers pile on freely, but a writer waits for the row to itself — conflicting access is forced into a line.`,
      ],
      callout: { kind: 'insight', text: 'Compatibility rule: many readers OR one writer, never both. S-locks share; an X-lock stands alone.' },
      changes: ['+ S-lock: shared, read-only', '+ X-lock: exclusive, write', '~ conflicts now serialized'],
      metrics: { locks: 3, waiting: 1, deadlocks: 0, txns: 4 },
      scene: { view: 'modes', note: 'Three readers share the row; the writer is blocked until they release.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Two-phase',
      title: 'Two-phase locking',
      body: [
        `Locking rows is not enough on its own — <em>when</em> you release matters. <span class="term">Two-phase locking</span> (2PL) splits a transaction into a <b>growing</b> phase, where it only ever acquires locks, and a <b>shrinking</b> phase, where it only ever releases them.`,
        `The rule is simple: once you release your first lock, you may never acquire another. That single discipline guarantees the schedule is <span class="term">serializable</span> — equivalent to running the transactions one after another, even though they overlapped in real time.`,
      ],
      callout: { kind: 'tip', text: 'Grow then shrink: take every lock you need before releasing any. No re-acquisition after the first release ⇒ serializable.' },
      changes: ['+ growing phase (acquire only)', '+ shrinking phase (release only)', '+ serializable schedule'],
      metrics: { locks: 4, waiting: 1, deadlocks: 0, txns: 4 },
      scene: { view: 'twophase', note: 'Lock count climbs, peaks, then falls — and never climbs again.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'Deadlock',
      title: 'When waiting forms a cycle',
      body: [
        `Locks solve corruption but introduce a new failure. <b>T1</b> holds row <code>A</code> and now wants <code>B</code>. <b>T2</b> holds row <code>B</code> and now wants <code>A</code>. Each waits for a lock the other is holding.`,
        `Neither will release until it finishes, and neither can finish until it gets the lock it is waiting for. The <span class="term">wait-for graph</span> has a cycle, and both transactions are stuck forever. That is a <span class="term">deadlock</span>.`,
      ],
      callout: { kind: 'warn', text: 'A deadlock is a cycle in the wait-for graph. No amount of patience resolves it — someone has to give up.' },
      metrics: { locks: 2, waiting: 2, deadlocks: 1, txns: 2 },
      scene: { view: 'deadlock', note: 'T1 → B → T2 → A → T1: a closed loop of waiting.' },
    },
    { // 4 — SOLUTION
      chapter: 'solution', short: 'Detect',
      title: 'Detect the cycle, abort a victim',
      body: [
        `The database periodically walks its wait-for graph looking for cycles. When it finds one, it picks a <span class="term">victim</span> — usually the transaction that has done the least work or holds the fewest locks — and <b>aborts</b> it, rolling back its changes and releasing its locks.`,
        `With the victim gone the cycle is broken, and the survivor immediately gets the lock it was waiting for and commits. The aborted transaction is simply retried from the start, this time without the conflict.`,
      ],
      callout: { kind: 'insight', text: 'Detection + victim selection turns an eternal hang into one cheap rollback and retry. The deadlock never reaches the application as a freeze.' },
      changes: ['+ wait-for graph scanned', '~ victim chosen & rolled back', '+ survivor commits'],
      metrics: { locks: 2, waiting: 0, deadlocks: 0, txns: 2 },
      scene: { view: 'detect', note: 'T2 is rolled back; T1 takes row B and finishes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Correctness, paid for in waiting',
      body: [
        `The lock manager is how a database keeps many transactions from corrupting each other: <b>S/X modes</b> decide who may proceed, <b>two-phase locking</b> makes the result serializable, and <b>cycle detection</b> with a victim abort keeps deadlocks from freezing the system.`,
        `None of it is free. Every lock is a potential wait, and a hot row serializes everyone who touches it — latency you trade for correctness. The next lessons show how <span class="term">MVCC</span> and tuned <span class="term">isolation levels</span> buy some of that concurrency back.`,
      ],
      callout: { kind: 'insight', text: 'Locks give isolation; 2PL gives serializability; detection handles deadlocks. The cost is contention — correctness bought with waiting.' },
      metrics: { locks: 1, waiting: 0, deadlocks: 0, txns: 4 },
      scene: { view: 'recap', note: 'One manager: modes, 2PL, detection — the price is contention.' },
    },
  ],
};
