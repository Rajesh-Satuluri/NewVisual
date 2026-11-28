/* content/crash-recovery-lab.js — the "Crash Recovery Lab" interactive lab, as
   DATA. A guided ARIES-style recovery walkthrough: crash the database mid-flight
   and bring it back with Analysis → Redo → Undo over the write-ahead log.
   Same shape as the other db-scale lessons; `scene` is a view-snapshot consumed
   by db/crash-recovery-lab-scene.js. */

export const crashRecoveryLabLesson = {
  id: 'crash-recovery-lab',
  title: 'Crash Recovery Lab',
  group: 'Interactive Labs',
  summary: 'Pull the plug mid-transaction, then watch the database heal itself. A hands-on run through ARIES recovery — Analysis, Redo, Undo — using nothing but the write-ahead log and the last checkpoint.',
  minutes: 10,
  level: 'advanced',
  metrics: ['lsn', 'recoveryT', 'commits', 'aborts'],
  legend: ['read', 'write', 'flush'],
  goals: [
    { text: 'Why a crash leaves data files half-written', step: 0 },
    { text: 'The WAL + last checkpoint survive the crash', step: 1 },
    { text: 'Analysis finds winners, losers and dirty pages', step: 2 },
    { text: 'Redo repeats history to the pre-crash state', step: 3 },
    { text: 'Undo rolls back losers with crash-safe CLRs', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / setup + the crash
      chapter: 'problem', short: 'Pull the plug',
      title: 'The power fails mid-transaction',
      body: [
        `Four transactions are in flight. <b>T1</b> and <b>T3</b> have already written their <span class="term">commit</span> record; <b>T2</b> and <b>T4</b> are still working. A <span class="term">checkpoint</span> ran a while ago, and since then the buffer pool has been dirtied but only partly flushed to disk.`,
        `Then the power dies. Volatile memory — the entire buffer pool — <b>vanishes</b>. The data files on disk are a mess: some pages hold committed changes, some hold uncommitted ones, and some committed changes never made it out of memory at all. Which changes are real?`,
      ],
      callout: { kind: 'warn', text: 'A crash loses the buffer pool and leaves data files partially updated. You cannot trust the data files alone — some committed writes are missing, some uncommitted writes are present.' },
      metrics: { lsn: 1180, recoveryT: 0, commits: 2, aborts: 0 },
      scene: { view: 'setup', note: 'Four transactions, a checkpoint, then a crash — the buffer pool is gone.' },
    },
    { // 1 — the WAL survives
      chapter: 'technique', short: 'The log lives',
      title: 'The write-ahead log survives on disk',
      body: [
        `Recovery is possible because of one rule the engine never broke: <b>write-ahead logging</b>. Every change was logged to the WAL and <span class="term">fsync</span>ed to disk <em>before</em> its data page could be written, and a commit returned only after its log record was durable.`,
        `So on restart we still have the WAL up to the last successful fsync, plus the <span class="term">checkpoint</span> record that marks a known-good starting point. Recovery replays the log forward from that checkpoint — it never has to read the whole history.`,
      ],
      callout: { kind: 'insight', text: 'The WAL is the source of truth after a crash. Recovery begins at the last checkpoint, not the beginning of time — that is what bounds recovery time.' },
      changes: ['✓ WAL durable up to last fsync', '✓ last checkpoint = recovery start', '~ data files: untrusted'],
      metrics: { lsn: 1180, recoveryT: 1, commits: 2, aborts: 0 },
      scene: { view: 'wal', note: 'The log and the last checkpoint are intact — recovery starts there.' },
    },
    { // 2 — Analysis pass
      chapter: 'technique', short: 'Analysis',
      title: 'Pass 1 — Analysis: winners and losers',
      body: [
        `The first pass scans the WAL <b>forward</b> from the checkpoint. It rebuilds two tables: the <span class="term">transaction table</span> (who was running at crash time) and the <span class="term">dirty page table</span> (which pages had unflushed changes).`,
        `A transaction with a <b>commit</b> record is a <span class="term">winner</span> — its work must survive. One still open at the crash is a <span class="term">loser</span> — its work must be undone. Here T1 and T3 are winners; <b>T2 and T4 are losers</b>.`,
      ],
      callout: { kind: 'tip', text: 'Analysis reconstructs what was in flight: the transaction table (winners vs losers) and the dirty page table (where redo must start). No data pages change yet.' },
      metrics: { lsn: 1180, recoveryT: 2, commits: 2, aborts: 0 },
      scene: { view: 'analysis', note: 'Scan forward: T1, T3 committed (winners); T2, T4 open (losers).' },
    },
    { // 3 — Redo pass
      chapter: 'technique', short: 'Redo',
      title: 'Pass 2 — Redo: repeat history',
      body: [
        `The redo pass replays <b>every</b> logged change after the checkpoint back onto the pages — even changes from loser transactions. This sounds wrong, but it is deliberate: redo <span class="term">repeats history</span> to reconstruct the exact page state the system had the instant before the crash.`,
        `Each page carries the LSN of the last change applied to it, so redo skips any change already on disk and is safely <span class="term">idempotent</span> — replay it twice and nothing breaks. After redo, the database looks exactly as it did at crash time.`,
      ],
      callout: { kind: 'insight', text: 'Redo replays all changes (winners and losers) to restore the pre-crash state. Page LSNs make it idempotent, so recovery can itself crash and restart safely.' },
      changes: ['+ replay WAL → pages', '~ page LSN gates each change', '= exact pre-crash state'],
      metrics: { lsn: 1180, recoveryT: 5, commits: 2, aborts: 0 },
      scene: { view: 'redo', note: 'Replay all changes after the checkpoint — history is repeated exactly.' },
    },
    { // 4 — Undo pass
      chapter: 'solution', short: 'Undo',
      title: 'Pass 3 — Undo: roll back the losers',
      body: [
        `Now the losers. The undo pass walks the loser transactions <b>backward</b>, reversing each of their changes so no uncommitted work remains. T2 and T4 are rolled back; T1 and T3 are left untouched.`,
        `Each undo writes a <span class="term">compensation log record</span> (CLR) describing the reversal. CLRs make undo itself crash-safe: if the machine dies <em>during</em> recovery, the next run redoes the CLRs and never double-undoes. When undo finishes, the database is consistent.`,
      ],
      callout: { kind: 'tip', text: 'Undo reverses only loser transactions, logging a CLR per reversal so a crash mid-recovery resumes cleanly. After undo, atomicity is restored: no partial transaction survives.' },
      changes: ['− undo T2, T4 (losers)', '+ CLR per reversal (crash-safe)', '✓ T1, T3 preserved'],
      metrics: { lsn: 1206, recoveryT: 7, commits: 2, aborts: 2 },
      scene: { view: 'undo', note: 'Walk losers backward, writing CLRs — uncommitted work disappears.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Durability and atomicity, restored',
      body: [
        `The database is back. Committed transactions T1 and T3 survived (<b>durability</b>); uncommitted T2 and T4 left no trace (<b>atomicity</b>) — exactly the ACID promises, delivered after a hard crash by three passes over the log.`,
        `The whole algorithm is <span class="term">ARIES</span>: <b>Analysis</b> → <b>Redo</b> (repeat history) → <b>Undo</b> (roll back losers, with CLRs). And recovery time is bounded by how recent the last checkpoint was — checkpoint more often to recover faster, at the cost of more I/O while running.`,
      ],
      callout: { kind: 'insight', text: 'ARIES = Analysis → Redo → Undo. Redo repeats history (idempotent via page LSNs); Undo uses CLRs so recovery is itself restartable. Checkpoints bound recovery time.' },
      metrics: { lsn: 1206, recoveryT: 7, commits: 2, aborts: 2 },
      scene: { view: 'recap', note: 'Winners kept, losers erased — ACID upheld by Analysis, Redo, Undo.' },
    },
  ],
};
