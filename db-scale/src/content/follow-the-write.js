/* content/follow-the-write.js — the "Follow the Write" interactive lab, as
   DATA. Traces a single UPDATE end-to-end through the storage engine: WAL
   append → buffer-pool dirty page → commit → background flush. Ties together
   the WAL, buffer-pool, pages and checkpoint lessons taught earlier. Each step
   is { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/follow-the-write-scene.js. */

export const followTheWriteLesson = {
  id: 'follow-the-write',
  title: 'Follow the Write',
  group: 'Interactive Labs',
  summary: 'Trace one UPDATE as it travels through the engine — logged to the WAL, changed in the buffer pool, committed, and only later flushed to disk — and see exactly where durability and speed come from.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['latency', 'lsn', 'ioOps', 'hitRate'],
  legend: ['read', 'write', 'flush'],
  goals: [
    { text: 'How one UPDATE becomes durable without a slow random write', step: 0 },
    { text: 'The WAL takes the change first, as a sequential append', step: 1 },
    { text: 'The page is changed in memory and marked dirty', step: 2 },
    { text: 'WAL rule: the log is forced before the data', step: 3 },
    { text: 'Dirty pages flush to the data files in the background', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / INTRO
      chapter: 'problem', short: 'The ask',
      title: 'One UPDATE, two promises',
      body: [
        `You run a single statement: <code>UPDATE accounts SET balance = 940 WHERE id = 42;</code>. The engine now owes you two things that pull in opposite directions.`,
        `It must be <b>durable</b> — if the machine loses power one millisecond after it says “done,” your change must survive. And it must be <b>fast</b> — you cannot wait for a slow, random seek to the exact spot on disk where row 42 lives. This lab follows the write and shows how the engine keeps both promises.`,
      ],
      callout: { kind: 'insight', text: 'Durability wants the change on disk now; speed forbids a random disk write now. The write-ahead log is how the engine satisfies both at once.' },
      metrics: { latency: 0, lsn: 1000, ioOps: 0, hitRate: 98 },
      scene: { view: 'intro', note: 'The statement arrives — four places it could go, one durable path through them.' },
    },
    { // 1 — WAL APPEND
      chapter: 'technique', short: 'Log first',
      title: 'Step 1 — append to the write-ahead log',
      body: [
        `Before touching the real data, the engine writes a tiny <span class="term">log record</span> describing the change — “row 42, balance 900 → 940” — to the end of the <span class="term">WAL</span>. The WAL is a single file written <b>sequentially</b>, so this is one cheap append, not a seek.`,
        `The record is <code>fsync</code>ed to stable storage and the <span class="term">LSN</span> (log sequence number) advances. The moment that append is on disk, the change is effectively <b>durable</b> — even though row 42 itself hasn't moved yet.`,
      ],
      callout: { kind: 'tip', text: 'A sequential append + fsync is dramatically faster than a random write to the data file — the disk head never leaves the end of the log.' },
      changes: ['+ WAL record: id=42 bal 900→940', '~ LSN 1000 → 1001', '✓ change is now durable'],
      metrics: { latency: 1, lsn: 1001, ioOps: 1, hitRate: 98 },
      scene: { view: 'wal', note: 'The change lands in the log first — one sequential append, then fsync.' },
    },
    { // 2 — BUFFER POOL
      chapter: 'technique', short: 'In memory',
      title: 'Step 2 — change the page in the buffer pool',
      body: [
        `Now the engine finds the data <span class="term">page</span> that holds row 42. If it's already cached in the <span class="term">buffer pool</span> (a hit), great; if not, it's read in once. The row is modified <b>in memory</b>, in place, and the page is flagged <span class="term">dirty</span> — changed but not yet written back.`,
        `With the log safe and the page updated in RAM, the engine can <b>return “done” to you right here</b>. No random write to the data file happened on your critical path — that's where the speed comes from.`,
      ],
      callout: { kind: 'insight', text: 'The write returns the instant the log is durable and the in-memory page is updated. The expensive data-file write is deferred, off the user\'s path.' },
      changes: ['+ page 7 loaded / hit in buffer pool', '~ row 42 updated in memory', '⚑ page 7 marked DIRTY'],
      metrics: { latency: 2, lsn: 1001, ioOps: 1, hitRate: 99 },
      scene: { view: 'bufferpool', note: 'The page changes in RAM and goes dirty — the client is answered now.' },
    },
    { // 3 — COMMIT
      chapter: 'technique', short: 'Commit',
      title: 'Step 3 — commit: log before data',
      body: [
        `On <code>COMMIT</code>, a commit record is appended and forced to the WAL too. This is the ironclad <span class="term">write-ahead rule</span>: the log entry for a change must reach disk <b>before</b> the corresponding data page does.`,
        `Why it matters: if the server crashes right now, the data file still holds the <em>old</em> row 42 — but the WAL holds both the change and the commit. On restart, recovery replays the log and reconstructs your committed write. Nothing acknowledged is ever lost.`,
      ],
      callout: { kind: 'warn', text: 'Break the ordering — let a dirty page reach disk before its log record — and a crash could leave a change on disk with no way to undo or redo it. Log always goes first.' },
      changes: ['+ WAL commit record (LSN 1002)', '✓ write-ahead ordering preserved', '✓ crash now would still recover the write'],
      metrics: { latency: 2, lsn: 1002, ioOps: 2, hitRate: 99 },
      scene: { view: 'commit', note: 'The commit record is forced to the log — the data file still holds the old row, and that is fine.' },
    },
    { // 4 — CHECKPOINT / FLUSH
      chapter: 'tradeoff', short: 'Flush later',
      title: 'Step 4 — flush dirty pages in the background',
      body: [
        `Later — on a timer, at a <span class="term">checkpoint</span>, or under memory pressure — a background writer finally flushes dirty page 7 to the data files. Now the on-disk row matches the log. Many writes to the same page may have piled up, so one flush can pay off dozens of logical updates.`,
        `Once a page is safely flushed, the WAL records that preceded it are no longer needed for recovery and the log can be <b>trimmed</b>. The trade is deliberate: you spend a little extra memory and background I/O to keep the user-facing write off the slow random-write path.`,
      ],
      callout: { kind: 'tip', text: 'Deferring and batching the data-file write turns many small random writes into a few larger background ones, and lets the WAL be recycled after a checkpoint.' },
      changes: ['↓ dirty page 7 flushed to data file', '~ on-disk row now = 940', '− old WAL segments trimmed'],
      metrics: { latency: 2, lsn: 1002, ioOps: 3, hitRate: 99 },
      scene: { view: 'flush', note: 'The dirty page drains to disk in the background; the WAL behind it can be recycled.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Where durability and speed came from',
      body: [
        `Follow the arrows back: your write was <b>durable</b> the instant it hit the WAL (a sequential append), and <b>fast</b> because the real data-file write was deferred to the background. The buffer pool absorbed the change in memory; the checkpoint settled it to disk on its own schedule.`,
        `This WAL-then-dirty-page-then-flush dance is the heart of every crash-safe engine. It's why a database can promise “committed” in microseconds and still survive a power cut — the log remembers what the data file hasn't caught up to yet.`,
      ],
      callout: { kind: 'insight', text: 'Durability from the log, speed from deferring the data write, recovery from replaying the log — one UPDATE shows the whole contract.' },
      metrics: { latency: 2, lsn: 1002, ioOps: 3, hitRate: 99 },
      scene: { view: 'recap', note: 'Log first, memory next, disk last — durable and fast at the same time.' },
    },
  ],
};
