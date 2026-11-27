/* content/crash-recovery.js — the "Crash Recovery" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/crash-recovery-scene.js. Assumes the reader already knows the WAL. */

export const crashRecoveryLesson = {
  id: 'crash-recovery',
  title: 'Crash Recovery',
  group: 'Transactions & Concurrency',
  summary: 'After the power dies mid-flight, the on-disk files are a mess — some committed work missing, some uncommitted work already written. ARIES turns the WAL into a recipe for the one correct state.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['recoveryT', 'lsn', 'txns', 'commits'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a crash leaves the data files in an inconsistent mix', step: 0 },
    { text: 'ARIES: recover using only the WAL and the last checkpoint', step: 1 },
    { text: 'Analyze — rebuild who was in-flight and which pages were dirty', step: 2 },
    { text: 'Redo — repeat history forward to the instant of the crash', step: 3 },
    { text: 'Undo — roll back everything that never committed', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The crash',
      title: 'The power dies mid-flight',
      body: [
        `The server loses power. In RAM, the buffer pool held a jumble of modified pages; on disk, the data files are frozen in whatever half-written state they happened to be in. Two things are now wrong at once.`,
        `A committed transaction's changes may <b>never have reached disk</b> — the buffer pool was flushed lazily, so a promise we made is missing. Meanwhile an <em>uncommitted</em> transaction's dirty pages may <b>already be on disk</b> — because the pool evicted them early. Too little of the good, too much of the bad.`,
      ],
      callout: { kind: 'warn', text: 'A crash leaves the heap files neither at the last commit nor at the crash instant — but a torn mixture of both. You cannot trust a single page on its own.' },
      metrics: { recoveryT: 0, lsn: 48200, txns: 5, commits: 3 },
      scene: { view: 'crash', note: 'Power lost. Heap pages torn — some stale, some too-new. The WAL survives intact.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'ARIES',
      title: 'The log already knows everything',
      body: [
        `Here is the payoff of write-ahead logging: <em>every</em> change was recorded in the WAL <b>before</b> the page itself was allowed to reach disk. The log is the one complete, ordered truth that survived.`,
        `<span class="term">ARIES</span> recovers in three passes over that log, starting from the last <b>checkpoint</b> (a known-good marker): <b>Analyze</b> figures out the situation, <b>Redo</b> rebuilds the crash instant, and <b>Undo</b> removes the unfinished work.`,
      ],
      callout: { kind: 'insight', text: 'Analyze → Redo → Undo. The data files are untrusted; the WAL + last checkpoint are the inputs; a consistent database is the output.' },
      changes: ['+ start from last checkpoint', '+ Analyze pass', '+ Redo pass', '+ Undo pass'],
      metrics: { recoveryT: 0, lsn: 48200, txns: 5, commits: 3 },
      scene: { view: 'aries', note: 'Three passes over the WAL turn torn files back into the one correct state.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Analyze',
      title: 'Analyze — reconstruct the moment of the crash',
      body: [
        `The first pass scans the WAL <b>forward</b> from the last checkpoint. It rebuilds two tables: the <b>transaction table</b> (who was still running, and the last thing each did) and the <b>dirty-page table</b> (which pages had unflushed changes, and from which log position).`,
        `Nothing is modified yet. Analyze just answers two questions: where does Redo need to start, and which transactions will Undo have to roll back?`,
      ],
      callout: { kind: 'tip', text: 'Analyze is a dry read of the log. Out of it fall the winners (committed) and the losers (in-flight) — and the earliest dirty page, which bounds the Redo scan.' },
      changes: ['+ transaction table', '+ dirty-page table', '~ no writes yet'],
      metrics: { recoveryT: 1, lsn: 48200, txns: 5, commits: 3 },
      scene: { view: 'analyze', note: 'Scan forward from the checkpoint: 2 txns in-flight, 4 pages dirty.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Redo',
      title: 'Redo — repeat history, all of it',
      body: [
        `The Redo pass replays <b>every</b> logged change forward onto the pages — committed or not. This sounds reckless, but it is the ARIES trick: <span class="term">repeat history</span> first, so the database exactly matches the instant of the crash, uncommitted dirt and all.`,
        `Each page records the log position (<b>LSN</b>) of its last applied change, so Redo skips anything already on disk and is safely re-runnable if recovery itself crashes.`,
      ],
      callout: { kind: 'insight', text: 'Redo brings back the committed work that never flushed. Replaying uncommitted changes too is fine — Undo is about to erase exactly those.' },
      changes: ['+ replay WAL → heap pages', '+ committed work restored', '~ page LSN guards idempotency'],
      metrics: { recoveryT: 3, lsn: 48200, txns: 5, commits: 3 },
      scene: { view: 'redo', note: 'Replay forward: the heap now matches the crash instant exactly.' },
    },
    { // 4 — HOW IT WORKS
      chapter: 'technique', short: 'Undo',
      title: 'Undo — erase the unfinished work',
      body: [
        `Now the database is at the crash instant — which still contains the half-done changes of transactions that never committed. The Undo pass walks the log <b>backward</b>, reversing each action of every loser transaction until they vanish.`,
        `Crucially, each undo is <em>itself</em> logged as a <b>compensation log record</b> (CLR). So if the machine crashes <em>during</em> recovery, the next recovery picks up exactly where this one stopped — undo never doubles back.`,
      ],
      callout: { kind: 'tip', text: 'Winners keep their changes; losers are rolled back. CLRs make Undo idempotent — recovery can crash and restart any number of times and still land in one place.' },
      changes: ['- roll back in-flight txns', '+ CLRs logged for each undo', '✓ atomicity restored'],
      metrics: { recoveryT: 4, lsn: 48730, txns: 3, commits: 3 },
      scene: { view: 'undo', note: 'Walk backward: 2 unfinished txns reversed. Only committed work remains.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'A log becomes a guarantee',
      body: [
        `Analyze → Redo → Undo. The recipe never trusts a data page; it trusts only the durable WAL and the last checkpoint, and from them it reconstructs the single state the database is <em>allowed</em> to be in: exactly the committed transactions, and nothing else.`,
        `This is what makes the D and the A of ACID real across a power cut. The checkpoint bounds how much log Redo must replay — which is the whole reason the next lesson exists.`,
      ],
      callout: { kind: 'insight', text: 'After any crash — even a crash mid-recovery — ARIES lands on one consistent state: every committed change present, every uncommitted change gone. Durability and atomicity, restored.' },
      metrics: { recoveryT: 4, lsn: 48730, txns: 3, commits: 3 },
      scene: { view: 'recap', note: 'Torn files in, one consistent database out — the committed work, exactly.' },
    },
  ],
};
