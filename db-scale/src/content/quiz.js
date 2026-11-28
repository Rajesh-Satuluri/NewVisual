/* content/quiz.js — the "Course Quiz" lesson, as DATA.
   Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }.
   `scene` is a view-snapshot consumed by db/quiz-scene.js.

   A self-check across the course. Each step is one multiple-choice question:
   the prompt and options A–D live in `body`; the correct answer and a one-line
   explanation are revealed in the `callout` (kind:'insight'); `changes` lists
   the options with the right one marked. The scene shows the options as cubes
   with the correct one haloed green. */

export const quizLesson = {
  id: 'quiz',
  title: 'Course Quiz',
  group: 'Mastery & Review',
  summary: 'A seven-question self-check across the whole course — storage, indexing, transactions, MVCC, replication, and consensus. Answer first, then reveal the correct choice and a one-line why.',
  minutes: 8,
  level: 'intermediate',
  metrics: [],
  goals: [
    { text: 'Recall the LSM write path end to end', step: 0 },
    { text: 'Reason about B+Tree height from fan-out', step: 1 },
    { text: 'Match isolation level to the anomaly it stops', step: 2 },
    { text: 'State what MVCC buys readers', step: 3 },
    { text: 'Predict what async replication can return', step: 4 },
    { text: 'Compute the majority a Raft cluster needs', step: 5 },
  ],

  steps: [
    { // 0 — Q1 storage / LSM write path
      chapter: 'problem', short: 'Q1',
      title: 'Q1 — the LSM write path',
      body: [
        `In an LSM-tree storage engine, what happens on a single <code>PUT</code>, in order?`,
        `<b>A.</b> Overwrite the row in place on its disk page.`,
        `<b>B.</b> Append to the write-ahead log, then insert into the in-memory memtable.`,
        `<b>C.</b> Write directly to the deepest level's SSTable.`,
        `<b>D.</b> Rewrite every SSTable so the key stays sorted.`,
      ],
      callout: { kind: 'insight', text: 'B. The write is logged (WAL) for durability, then buffered in the sorted in-memory memtable. SSTables are written later, in bulk, when the memtable flushes — so every write is sequential.' },
      changes: ['A — update in place (that\'s a B+Tree)', 'B — WAL then memtable ✓', 'C — straight to deepest level', 'D — rewrite all SSTables per put'],
      scene: { view: 'q1', q: 1, prompt: 'LSM PUT path?', options: ['in-place', 'WAL→memtable', 'deepest SSTable', 'rewrite all'], correct: 1, note: 'A PUT is logged, then buffered in the memtable.' },
    },
    { // 1 — Q2 indexing / B+Tree height
      chapter: 'problem', short: 'Q2',
      title: 'Q2 — B+Tree height',
      body: [
        `A B+Tree indexes 100 million rows with a fan-out of about 100 per node. Roughly how many levels deep is it?`,
        `<b>A.</b> About 2 levels.`,
        `<b>B.</b> About 4 levels.`,
        `<b>C.</b> About 100 levels.`,
        `<b>D.</b> About 1,000 levels.`,
      ],
      callout: { kind: 'insight', text: 'B. Height ≈ log₁₀₀(100M) = 4. High fan-out keeps B+Trees extremely shallow, so a point lookup is only a handful of page reads — that is the whole point of the structure.' },
      changes: ['A — too shallow (that\'s 10k rows)', 'B — log₁₀₀(10⁸) ≈ 4 ✓', 'C — confuses fan-out with height', 'D — off by orders of magnitude'],
      scene: { view: 'q2', q: 2, prompt: 'Height of a 100M-row B+Tree?', options: ['~2', '~4', '~100', '~1000'], correct: 1, note: 'log₁₀₀(100M) ≈ 4: high fan-out ⇒ shallow tree.' },
    },
    { // 2 — Q3 transactions / isolation & phantoms
      chapter: 'problem', short: 'Q3',
      title: 'Q3 — stopping phantom reads',
      body: [
        `Which isolation level is the weakest one that prevents <span class="term">phantom reads</span>?`,
        `<b>A.</b> Read Uncommitted.`,
        `<b>B.</b> Read Committed.`,
        `<b>C.</b> Repeatable Read.`,
        `<b>D.</b> Serializable.`,
      ],
      callout: { kind: 'insight', text: 'D. Serializable. Repeatable Read stops non-repeatable reads but a concurrent insert can still add rows to a range (a phantom). Only Serializable forbids phantoms by making the schedule equivalent to some serial order.' },
      changes: ['A — allows everything', 'B — allows non-repeatable + phantoms', 'C — stops non-repeatable, not phantoms', 'D — Serializable stops phantoms ✓'],
      scene: { view: 'q3', q: 3, prompt: 'Level that stops phantoms?', options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], correct: 3, note: 'Only Serializable forbids phantom reads.' },
    },
    { // 3 — Q4 MVCC
      chapter: 'problem', short: 'Q4',
      title: 'Q4 — what MVCC buys you',
      body: [
        `Under multi-version concurrency control (<span class="term">MVCC</span>), what is the key benefit for a read-only query?`,
        `<b>A.</b> It reads a consistent snapshot without blocking writers.`,
        `<b>B.</b> It takes an exclusive lock on every row it reads.`,
        `<b>C.</b> It always sees the very latest committed value mid-scan.`,
        `<b>D.</b> It eliminates the need to ever store old row versions.`,
      ],
      callout: { kind: 'insight', text: 'A. Each writer creates a new version, so a reader sees a stable snapshot as of its start and never waits on a writer. The cost is storing versions and vacuuming dead ones — not free, but readers never block.' },
      changes: ['A — snapshot, no reader/writer blocking ✓', 'B — that\'s pessimistic locking', 'C — it sees its snapshot, not live latest', 'D — MVCC must keep old versions'],
      scene: { view: 'q4', q: 4, prompt: 'MVCC gives a reader…?', options: ['snapshot, no block', 'exclusive locks', 'live latest value', 'no old versions'], correct: 0, note: 'Readers see a stable snapshot and never block writers.' },
    },
    { // 4 — Q5 replication / async lag
      chapter: 'problem', short: 'Q5',
      title: 'Q5 — reading an async replica',
      body: [
        `With <b>asynchronous</b> replication, a read served by a follower can return…`,
        `<b>A.</b> Always the same value as the primary.`,
        `<b>B.</b> Stale data, because the follower may lag the primary.`,
        `<b>C.</b> A value from the future, before it is committed.`,
        `<b>D.</b> An error, since followers cannot serve reads.`,
      ],
      callout: { kind: 'insight', text: 'B. Async replication acknowledges the write before followers apply it, so a follower read can miss the most recent writes (replica lag). That is the throughput-for-staleness trade; sync replication avoids it but adds commit latency.' },
      changes: ['A — only sync guarantees that', 'B — follower may lag → stale ✓', 'C — impossible, not yet committed', 'D — followers commonly serve reads'],
      scene: { view: 'q5', q: 5, prompt: 'Async follower read returns…?', options: ['same as primary', 'stale (lag)', 'future value', 'an error'], correct: 1, note: 'Async means the follower can lag → stale reads.' },
    },
    { // 5 — Q6 consensus / Raft majority
      chapter: 'problem', short: 'Q6',
      title: 'Q6 — Raft majority',
      body: [
        `In a 5-node Raft cluster, how many nodes must acknowledge a write for it to commit, and how many failures does that tolerate?`,
        `<b>A.</b> 2 acks; tolerates 3 failures.`,
        `<b>B.</b> 3 acks (a majority); tolerates 2 failures.`,
        `<b>C.</b> 5 acks (all); tolerates 0 failures.`,
        `<b>D.</b> 1 ack (the leader); tolerates 4 failures.`,
      ],
      callout: { kind: 'insight', text: 'B. A write needs a majority — ⌊5/2⌋+1 = 3 — so it survives any 2 failures. Requiring a quorum guarantees any two majorities overlap, which is what keeps the committed log consistent across elections.' },
      changes: ['A — 2 is not a majority of 5', 'B — majority = 3, tolerates 2 ✓', 'C — all-acks kills availability', 'D — one node can\'t commit safely'],
      scene: { view: 'q6', q: 6, prompt: 'Acks to commit in 5-node Raft?', options: ['2', '3 (majority)', '5 (all)', '1 (leader)'], correct: 1, note: 'Majority of 5 is 3; tolerates 2 failures.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Score yourself',
      body: [
        `Six questions, six mechanisms. <b>LSM</b> logs then buffers writes; <b>B+Trees</b> stay shallow via fan-out; <b>Serializable</b> is the level that kills phantoms; <b>MVCC</b> gives readers a lock-free snapshot; <b>async replication</b> trades freshness for throughput; <b>Raft</b> commits on a majority.`,
        `Two more to keep in your pocket: <span class="term">consistent hashing</span> minimizes the keys that move when a node joins or leaves, and <span class="term">CAP</span> forces a consistency-or-availability choice only during a network partition. Miss any? Revisit that lesson — the goal is to explain the <em>why</em>, not just pick the letter.`,
      ],
      callout: { kind: 'insight', text: 'Write path, tree height, isolation, MVCC, replication lag, quorum — if you can explain each in a sentence, the fundamentals are solid. Re-run the ones you missed.' },
      scene: { view: 'recap', note: 'Six mechanisms checked — explain the why, not just the letter.' },
    },
  ],
};
