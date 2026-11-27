/* content/mvcc.js — the "MVCC" lesson, as DATA. Same shape as content/dbms.js:
   each step is { chapter, short, title, body[], callout, changes?, metrics,
   scene }. `scene` is a view-snapshot consumed by db/mvcc-scene.js. */

export const mvccLesson = {
  id: 'mvcc',
  title: 'MVCC',
  group: 'Transactions & Concurrency',
  summary: 'Multi-Version Concurrency Control — why databases keep several timestamped copies of a row so that readers never block writers, and writers never block readers.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['versions', 'txns', 'latency', 'deadTuples'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why plain locking makes reads wait behind writes', step: 0 },
    { text: 'Updates write a new row version instead of overwriting', step: 1 },
    { text: 'Each transaction reads from its own snapshot', step: 2 },
    { text: 'Readers and writers stop blocking each other', step: 3 },
    { text: 'The price: dead versions that VACUUM must reclaim', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Contention',
      title: 'Readers stuck behind a writer',
      body: [
        `With a single current copy of each row, safety comes from <span class="term">locks</span>. A transaction that updates row <code>42</code> takes an exclusive lock on it — and every reader who wants that same row now <b>waits</b> until the writer commits.`,
        `One slow <code>UPDATE</code> and a queue of innocent <code>SELECT</code>s backs up behind it. Reads and writes to the same row are forced to run one after another, and latency climbs even though the readers only wanted to <em>look</em>.`,
      ],
      callout: { kind: 'warn', text: 'Overwrite-in-place means one physical copy of a row. A writer’s lock on it freezes every reader of that row — reads and writes serialize.' },
      metrics: { versions: 1, txns: 4, latency: 180, deadTuples: 0 },
      scene: { view: 'contention', note: 'One copy, one lock — three readers queue behind a single writer.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Versions',
      title: 'Never overwrite — append a version',
      body: [
        `MVCC changes the rule: an <code>UPDATE</code> does not touch the old row at all. It writes a <b>new version</b> of the row and leaves the old one in place.`,
        `Each version is stamped with the id of the transaction that created it (<code>xmin</code>) and, once a newer version supersedes it, the id that retired it (<code>xmax</code>). One logical row becomes a little stack of timestamped versions, newest on top.`,
      ],
      callout: { kind: 'insight', text: 'A row is a chain of versions, each tagged xmin (born) and xmax (died). “Update” means “append a new version,” never “overwrite.”' },
      changes: ['+ new version per update', '~ old versions kept', '+ xmin / xmax stamps'],
      metrics: { versions: 3, txns: 5, latency: 120, deadTuples: 0 },
      scene: { view: 'versions', note: 'One logical row, three stacked versions — each stamped with its txid.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Snapshot',
      title: 'Everyone reads their own snapshot',
      body: [
        `When a transaction begins, it takes a <span class="term">snapshot</span>: the set of versions that were committed as of that instant. For the life of the transaction it only ever sees versions visible to that snapshot.`,
        `So two transactions can read the <em>same</em> logical row at the <em>same</em> moment and each correctly sees a different version — an older reader keeps seeing <code>v2</code> while a newer one sees <code>v3</code>. No waiting, no coordination.`,
      ],
      callout: { kind: 'tip', text: 'A snapshot is a visibility rule, not a copy: “show me the newest version whose xmin committed before I started and whose xmax hadn’t.”' },
      changes: ['+ per-transaction snapshot', '~ visibility by xmin/xmax', '+ consistent point-in-time read'],
      metrics: { versions: 3, txns: 6, latency: 70, deadTuples: 0 },
      scene: { view: 'snapshot', note: 'Two live transactions, two snapshots — same row, different versions, at once.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'No blocking',
      title: 'Readers and writers stop colliding',
      body: [
        `Because a writer adds a <em>new</em> version instead of mutating the one readers are looking at, the two never contend. A reader picks the version its snapshot allows; a writer appends the next version beside it.`,
        `<b>Readers never block writers, and writers never block readers.</b> Only two writers racing for the <em>same</em> row still need to be ordered — the overwhelmingly common read/write mix now runs fully in parallel.`,
      ],
      callout: { kind: 'insight', text: 'MVCC’s headline guarantee: read/write on the same row is lock-free. Latency drops because SELECTs no longer wait in line behind UPDATEs.' },
      changes: ['+ parallel read & write', '− no shared lock on the row', '~ only writer/writer still ordered'],
      metrics: { versions: 4, txns: 9, latency: 28, deadTuples: 0 },
      scene: { view: 'nolock', note: 'Read and write flow side by side — no lock between them.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Bloat',
      title: 'Old versions pile up',
      body: [
        `Nothing is free. Every superseded version stays on disk until the database is sure no snapshot can still need it. Those <span class="term">dead tuples</span> accumulate — a hot, frequently-updated row can leave a long trail of corpses.`,
        `They cost space, they slow scans that must skip over them, and they must eventually be swept up by <span class="term">VACUUM</span>. MVCC trades cheap, lock-free reads for the ongoing chore of garbage collection.`,
      ],
      callout: { kind: 'warn', text: 'Dead versions are the bill for non-blocking reads. Without regular VACUUM they bloat tables and indexes until performance sags.' },
      changes: ['+ lock-free reads', '− dead versions accumulate', '− VACUUM must reclaim them'],
      metrics: { versions: 7, txns: 9, latency: 30, deadTuples: 5 },
      scene: { view: 'tradeoff', note: 'Lock-free reads on one side; a growing heap of dead versions on the other.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Many versions, one consistent view',
      body: [
        `MVCC keeps <b>many timestamped versions</b> of each row and gives every transaction a <b>snapshot</b> that selects exactly the right one. The payoff is consistent, point-in-time reads that never take or wait for a lock.`,
        `The standing cost is cleanup: dead versions must be reclaimed. That makes <span class="term">VACUUM</span> — the next lesson — not optional housekeeping but a core part of how an MVCC database stays healthy.`,
      ],
      callout: { kind: 'insight', text: 'Versions + snapshots = non-blocking, consistent reads. The price is version cleanup — which is why VACUUM exists.' },
      metrics: { versions: 7, txns: 9, latency: 30, deadTuples: 5 },
      scene: { view: 'recap', note: 'Versions give lock-free consistency; VACUUM keeps the version trail from piling up.' },
    },
  ],
};
