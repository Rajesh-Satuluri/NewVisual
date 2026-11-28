/* content/vacuum.js — the "VACUUM" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/vacuum-scene.js. Rendered through the shared course shell.

   Picks up where MVCC left off: versions pile up, and something has to clean
   them. That something is VACUUM. */

export const vacuumLesson = {
  id: 'vacuum',
  title: 'VACUUM',
  group: 'Transactions & Concurrency',
  summary: 'MVCC never overwrites a row in place — it leaves the old version behind as a dead tuple. VACUUM is the garbage collector that reclaims them before the table bloats forever.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['deadTuples', 'rows', 'pages', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why MVCC leaves dead tuples behind on every update', step: 0 },
    { text: 'VACUUM marks dead tuples as reclaimable free space', step: 1 },
    { text: 'Freed slots are reused in place; the visibility map skips clean pages', step: 2 },
    { text: 'Plain VACUUM vs VACUUM FULL — reuse in place vs rewrite & shrink', step: 3 },
    { text: 'Tuning autovacuum: bloat and wraparound vs I/O pressure', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Bloat',
      title: 'Dead tuples pile up',
      body: [
        `Under MVCC an <code>UPDATE</code> never edits a row in place — it writes a <em>new</em> version and leaves the old one sitting on the page, now invisible to every new transaction. A <code>DELETE</code> just marks the row dead. Nothing is physically removed.`,
        `Do this all day and the table fills with corpses. Live rows stay the same, but the file keeps growing, and every sequential scan drags more and more <span class="term">dead tuples</span> off disk to find the same handful of live ones.`,
      ],
      callout: { kind: 'warn', text: 'Dead tuples are not free. They inflate the table file, slow every scan, and — left unchecked — threaten transaction-ID wraparound. Space has to be reclaimed.' },
      metrics: { deadTuples: 1840, rows: 500, pages: 92, throughput: 38 },
      scene: { view: 'bloat', note: 'Live rows unchanged — but the pages are crowded with dead versions.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'VACUUM',
      title: 'VACUUM marks the dead reclaimable',
      body: [
        `<span class="term">VACUUM</span> walks the table's pages and finds the tuples that are dead to <em>every</em> running snapshot — no live transaction could ever see them again.`,
        `It doesn't delete them one by one. It records their slots in the page's free-space map as <b>reclaimable</b>. The row is gone as far as anyone cares, and its space is now available for the next insert.`,
      ],
      callout: { kind: 'insight', text: 'A tuple is safe to reclaim only when it is invisible to the oldest active snapshot. VACUUM is careful: it never touches a version someone might still need.' },
      changes: ['~ scan pages for dead tuples', '+ mark slots reclaimable', '~ update free-space map'],
      metrics: { deadTuples: 1840, rows: 500, pages: 92, throughput: 44 },
      scene: { view: 'mark', note: 'VACUUM sweeps the pages — dead tuples flip to free slots.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Reclaim',
      title: 'Free space, reused in place',
      body: [
        `Those freed slots don't shrink the file — they become holes the table fills on its own. The next <code>INSERT</code> or new row version drops straight into reclaimed space instead of extending the file.`,
        `VACUUM also updates the <span class="term">visibility map</span>: pages where every tuple is visible to all transactions get flagged, so the next vacuum can skip them entirely and index-only scans can trust the page without a heap fetch.`,
      ],
      callout: { kind: 'tip', text: 'Plain VACUUM keeps the file the same size but stops it from growing. Steady-state, inserts and reclaimed space balance out and bloat holds flat.' },
      changes: ['+ reclaimed slots reused by inserts', '+ visibility map marks clean pages', '~ future vacuums skip them'],
      metrics: { deadTuples: 120, rows: 520, pages: 92, throughput: 71 },
      scene: { view: 'reclaim', note: 'Dead tuples drop; new inserts refill the freed slots — same file.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'VACUUM FULL',
      title: 'Plain VACUUM vs VACUUM FULL',
      body: [
        `Plain VACUUM reclaims space <em>inside</em> the file but never hands pages back to the OS — a table that ballooned once stays big on disk, just with room to grow into.`,
        `<span class="term">VACUUM FULL</span> rewrites the whole table into a brand-new, tightly packed file and drops the old one, returning the slack to the operating system. The catch: it takes an <b>exclusive lock</b>, so nothing can read or write the table while it runs.`,
      ],
      callout: { kind: 'warn', text: 'VACUUM FULL actually shrinks the file — but it locks the table and doubles disk use mid-rewrite. Use it for one-off cleanups after a big purge, never on a hot table.' },
      changes: ['~ FULL: rewrite into a compact file', '+ disk returned to the OS', '− exclusive lock blocks all access'],
      metrics: { deadTuples: 0, rows: 520, pages: 48, throughput: 66 },
      scene: { view: 'full', note: 'Plain VACUUM reuses in place; FULL rewrites and shrinks — under a lock.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Timing',
      title: 'How often should it run?',
      body: [
        `In practice you rarely run VACUUM by hand — <span class="term">autovacuum</span> watches each table's dead-tuple count and fires when it crosses a threshold. The whole game is tuning that cadence.`,
        `Too lazy and bloat snowballs while transaction-ID wraparound creeps closer; too eager and vacuum workers burn I/O and CPU competing with the very queries they're meant to keep fast.`,
      ],
      callout: { kind: 'insight', text: 'Autovacuum is a dial, not a switch. Match its aggressiveness to the table’s write rate: hot tables want frequent light passes, cold tables barely any.' },
      metrics: { deadTuples: 60, rows: 520, pages: 48, throughput: 74 },
      scene: { view: 'tradeoff', note: 'Too rare → bloat & wraparound. Too aggressive → I/O contention.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'MVCC’s garbage collector',
      body: [
        `VACUUM is the other half of MVCC. Versioning buys lock-free reads by never overwriting a row; VACUUM pays the bill by reclaiming the dead versions that leaves behind.`,
        `Keep it running — automatically, in the background — and the table stays lean, scans stay fast, and transaction IDs never wrap. Neglect it and every table slowly rots.`,
      ],
      callout: { kind: 'insight', text: 'Reclaim dead tuples · reuse space in place · keep the visibility map fresh · prevent wraparound. MVCC gives you the version; VACUUM takes it away when it’s safe.' },
      metrics: { deadTuples: 40, rows: 540, pages: 48, throughput: 78 },
      scene: { view: 'recap', note: 'Versioning and VACUUM, two halves of one contract.' },
    },
  ],
};
