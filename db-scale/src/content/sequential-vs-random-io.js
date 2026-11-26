/* content/sequential-vs-random-io.js — the "Sequential vs Random I/O" lesson,
   as DATA. Same shape as content/dbms.js: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/sequential-vs-random-io-scene.js. */

export const sequentialVsRandomIoLesson = {
  id: 'sequential-vs-random-io',
  title: 'Sequential vs Random I/O',
  group: 'Storage Engine',
  summary: 'The single most important performance fact about storage: reading 1000 adjacent pages is dramatically faster than reading the same 1000 pages scattered around. Nearly every storage structure is built around it.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['throughput', 'seeks', 'ioOps', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why the same page count can be 100× slower when scattered', step: 0 },
    { text: 'Sequential reads: one sweep, prefetch, near-zero seeking', step: 1 },
    { text: 'Random reads: a seek and a rotation for every page', step: 2 },
    { text: 'The throughput gap, on spinning disks and on SSDs', step: 3 },
    { text: 'How databases design around it — logs, sorted runs, scans', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Same 1000 pages',
      title: 'Same pages, 100× difference',
      body: [
        `Here is a fact that surprises people: reading a thousand pages is not one price. Read them as one <b>contiguous run</b> — block after adjacent block — and the disk streams them in a single sweep. Read the <em>same</em> thousand pages <b>scattered</b> across the platter, and the disk has to hunt down each one.`,
        `The bytes are identical. The amount of data is identical. Yet the scattered version can be a hundred times slower on a spinning disk. The difference is entirely in the <span class="term">access pattern</span>, not the volume.`,
      ],
      callout: { kind: 'warn', text: 'Throughput is not about how much you read — it is about how the reads are laid out. Scatter is the enemy.' },
      metrics: { throughput: 10, seeks: 1000, ioOps: 1000, latency: 9800 },
      scene: { view: 'two', note: 'Left: one contiguous sweep. Right: the same pages scattered — a seek each.' },
    },
    { // 1 — TECHNIQUE: sequential
      chapter: 'technique', short: 'Sequential',
      title: 'Sequential: one sweep, then prefetch',
      body: [
        `In a <span class="term">sequential</span> read the pages sit next to each other on disk. The head parks once at the start and streams straight through — no jumping. Cost is dominated by raw transfer speed, which is what disks are good at.`,
        `Better still, the storage layer notices the pattern and <b>reads ahead</b>: while you process page <code>N</code>, it has already fetched <code>N+1, N+2, …</code> into the buffer pool. By the time you ask, they are waiting in RAM. Seeks stay near zero.`,
      ],
      callout: { kind: 'insight', text: 'Sequential access pays the seek cost once, then rides pure bandwidth. Read-ahead hides the rest.' },
      changes: ['+ contiguous layout', '+ single seek', '+ prefetch / read-ahead'],
      metrics: { throughput: 520, seeks: 1, ioOps: 8, latency: 2 },
      scene: { view: 'sequential', note: 'Adjacent pages streamed in order; the next ones are prefetched.' },
    },
    { // 2 — TECHNIQUE: random
      chapter: 'technique', short: 'Random',
      title: 'Random: a seek for every page',
      body: [
        `Now ask for pages scattered across the disk. Before each one the head must <b>seek</b> to a new track and wait for the platter to <b>rotate</b> the right block under it. Only then does the tiny transfer happen — and then it all repeats for the next page.`,
        `The actual data movement is trivial; the <em>mechanical positioning</em> dominates. Thousands of independent little reads, each paying full latency, add up to a crawl. Even on an SSD — no moving parts — random access still loses to sequential because of request overhead and internal parallelism that streaming exploits.`,
      ],
      callout: { kind: 'warn', text: 'Every random page = seek + rotate + transfer. The transfer is the cheap part. Positioning is where the time goes.' },
      changes: ['~ scattered layout', '+ seek per page', '+ rotational wait', '− throughput collapses'],
      metrics: { throughput: 6, seeks: 1000, ioOps: 1000, latency: 11200 },
      scene: { view: 'random', note: 'The arm zig-zags across the platter — a full seek before every page.' },
    },
    { // 3 — TRADEOFF: the numbers
      chapter: 'tradeoff', short: 'The gap',
      title: 'The throughput gap',
      body: [
        `Put the two side by side. On a spinning disk, sequential throughput is measured in hundreds of MB/s while random throughput — the same pages, scattered — can be a <b>few MB/s</b>. That is the famous ~100× gap.`,
        `SSDs shrink the gap but do not close it: with no seek time, random reads are far better than on an HDD, yet sequential still wins — often several times over — because large sequential transfers saturate the device's internal channels. The lesson holds on every medium: <span class="term">lay data out the way you will read it</span>.`,
      ],
      callout: { kind: 'tip', text: 'HDD: sequential ≈ 100× random. SSD: still several× better. The gap shrinks but never disappears.' },
      metrics: { throughput: 520, seeks: 1, ioOps: 8, latency: 2 },
      scene: { view: 'numbers', note: 'Two throughput bars: sequential towers over random.' },
    },
    { // 4 — SOLUTION: design consequence
      chapter: 'solution', short: 'Design for it',
      title: 'Databases bend over backwards for it',
      body: [
        `Once you internalise the gap, a lot of database design falls out of it. The <b>write-ahead log</b> only ever appends — pure sequential writes. <b>LSM-trees</b> buffer random writes in memory and flush them as big <b>sorted runs</b>, turning random into sequential. Large analytical <b>scans</b> read whole tables in order. Writes are <b>batched</b> so many small changes become one sequential flush.`,
        `Even B-Trees try: they keep leaves reasonably contiguous so a range scan walks them in near-sequential order. The whole field is a long campaign to convert random I/O into sequential I/O.`,
      ],
      callout: { kind: 'insight', text: 'WAL appends · LSM sorted runs · batched writes · ordered scans — every one trades random I/O for sequential.' },
      changes: ['+ append-only WAL', '+ sorted runs (LSM)', '+ batched writes', '+ ordered scans'],
      metrics: { throughput: 480, seeks: 3, ioOps: 12, latency: 3 },
      scene: { view: 'design', note: 'Append-only logs, sorted runs, and ordered scans — all sequential-friendly.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Lay it out the way you read it',
      body: [
        `Sequential I/O crushes random I/O — by ~100× on spinning disks, by several× even on SSDs — because positioning, not transfer, is the real cost. The amount of data barely matters; the <b>shape</b> of the access does.`,
        `That one fact explains logs, sorted runs, read-ahead, batching and ordered scans. When you meet a storage structure later in the course, ask: <em>how is it turning random work into sequential work?</em> It almost always is.`,
      ],
      callout: { kind: 'insight', text: 'Positioning dominates transfer. Turn random into sequential and everything gets faster.' },
      metrics: { throughput: 520, seeks: 1, ioOps: 8, latency: 2 },
      scene: { view: 'recap', note: 'Sequential ≫ random — the fact beneath half of storage design.' },
    },
  ],
};
