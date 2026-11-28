/* content/checkpoints.js — the "Checkpoints" lesson, as DATA.
   Same shape as content/dbms.js. `scene` is a view-snapshot consumed by
   db/checkpoints-scene.js. */

export const checkpointsLesson = {
  id: 'checkpoints',
  title: 'Checkpoints',
  group: 'Transactions & Concurrency',
  summary: 'The periodic "disk is caught up to here" mark that keeps crash recovery fast and the write-ahead log from growing forever.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['lsn', 'recoveryT', 'ioOps', 'ckpts'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a log with no checkpoint makes recovery unbounded', step: 0 },
    { text: 'A checkpoint: flush dirty pages, record a known-good LSN', step: 1 },
    { text: 'Recovery replays only the tail, not the whole log', step: 2 },
    { text: 'Old log segments can be recycled once persisted', step: 3 },
    { text: 'Tuning checkpoint frequency against I/O cost', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Endless replay',
      title: 'A log that only ever grows',
      body: [
        `The write-ahead log makes every change durable: append the change to the log, and a crash can always be <span class="term">replayed</span> back into the data pages. But notice what "replayed" means with nothing else in place — recovery must start at the <em>very first</em> log record and walk the whole thing.`,
        `A database that has been up for weeks has a log of millions of records. The longer it runs, the longer a restart takes, and the log file never stops growing. Durability is fine; <b>bounded</b> recovery is the missing piece.`,
      ],
      callout: { kind: 'warn', text: 'With no checkpoint, recovery time and log size both grow without limit — they are tied to uptime, not to the work still in flight.' },
      metrics: { lsn: 4120, recoveryT: 180, ioOps: 0, ckpts: 0 },
      scene: { view: 'growing', note: 'No checkpoint: a crash replays the log from LSN 0.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Checkpoint',
      title: 'Draw a "caught up to here" line',
      body: [
        `A <span class="term">checkpoint</span> is a periodic housekeeping pass. The database flushes every <b>dirty</b> page in the buffer pool out to disk, then writes a special CHECKPOINT record into the log at the current <span class="term">LSN</span> (log sequence number).`,
        `That record is a promise: everything the log describes up to this point is already safely in the data files. The disk and the log agree at this exact line.`,
      ],
      callout: { kind: 'insight', text: 'A checkpoint persists all dirty pages and stamps the log with an LSN where disk state and log state are known to match.' },
      changes: ['+ flush all dirty pages', '+ write CHECKPOINT record', '~ disk caught up to LSN'],
      metrics: { lsn: 5120, recoveryT: 180, ioOps: 640, ckpts: 1 },
      scene: { view: 'checkpoint', note: 'Flush dirty pages, then stamp the log at LSN 5120.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Bounded recovery',
      title: 'Recover from the last mark',
      body: [
        `Now a crash is cheap. Recovery opens the log, jumps to the <em>last</em> checkpoint record, and replays only what came after it — the tail. Everything before the mark is already on disk, so replaying it would be wasted work.`,
        `Recovery time no longer depends on how long the server has been running. It depends only on how much happened since the last checkpoint — a small, roughly constant window.`,
      ],
      callout: { kind: 'tip', text: 'Recovery = replay the log from the last checkpoint to the end. The replay window is bounded by checkpoint interval, not uptime.' },
      metrics: { lsn: 5890, recoveryT: 6, ioOps: 640, ckpts: 1 },
      scene: { view: 'bounded', note: 'Replay the window from the checkpoint to the log end — nothing earlier.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Recycle',
      title: 'Throw away what you no longer need',
      body: [
        `The checkpoint also frees space. Any log segment that lies entirely <em>before</em> the checkpoint can never be needed for crash recovery again — its changes are all on disk. Once any archival copy is made, those segments are recycled or deleted.`,
        `So the log behaves like a sliding tape: it grows at the head as writes arrive and is trimmed at the tail as checkpoints advance, keeping total log size bounded.`,
      ],
      callout: { kind: 'insight', text: 'Segments older than the last checkpoint are recoverable-irrelevant — recycling them is what keeps the WAL from filling the disk.' },
      changes: ['+ recycle pre-checkpoint segments', '~ log size bounded', '− no unbounded growth'],
      metrics: { lsn: 5890, recoveryT: 6, ioOps: 640, ckpts: 1 },
      scene: { view: 'trim', note: 'Segments before the mark are freed; the log stays a bounded window.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Frequency',
      title: 'How often is often enough?',
      body: [
        `Checkpoints are not free: flushing every dirty page is a burst of write I/O that competes with live transactions. So frequency is a dial. Check in <b>often</b> and recovery is near-instant, but the server pays a steady drumbeat of flush storms.`,
        `Check in <b>rarely</b> and steady-state throughput is smooth, but a crash means a long replay and the log grows large between marks. Real systems spread the flush out (a slow, "fuzzy" checkpoint) to soften the spikes.`,
      ],
      callout: { kind: 'tip', text: 'Frequent checkpoints buy short recovery with ongoing I/O; rare checkpoints buy smooth writes with a long worst-case restart.' },
      metrics: { lsn: 7400, recoveryT: 6, ioOps: 3200, ckpts: 6 },
      scene: { view: 'tradeoff', note: 'Checkpoint often vs rarely — recovery time traded against write I/O.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'A reference point that bounds everything',
      body: [
        `A checkpoint is one small act with two big payoffs: by persisting all dirty pages and stamping a known-good LSN, it bounds <b>recovery time</b> (replay only the tail) and bounds <b>log size</b> (recycle everything older).`,
        `It is the hinge between the write-ahead log and crash recovery — the thing that turns "durable" into "durable <em>and</em> restartable in seconds." The only knob is how often to do it, weighed against flush I/O.`,
      ],
      callout: { kind: 'insight', text: 'Checkpoint = flush + mark. It converts an ever-growing log and an uptime-length replay into a bounded window you can tune.' },
      metrics: { lsn: 7400, recoveryT: 6, ioOps: 3200, ckpts: 6 },
      scene: { view: 'recap', note: 'One periodic reference point bounds both recovery time and log size.' },
    },
  ],
};
