/* content/cheat-sheet.js — "Cheat Sheet", as DATA.

   A fast-recall reference: each step is a themed card packed with the course's
   key facts and real numbers. No live metrics; the scene is a clean summary of
   each card.

   Same shape as every db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }. */

export const cheatSheetLesson = {
  id: 'cheat-sheet',
  title: 'Cheat Sheet',
  group: 'Mastery & Review',
  summary: 'Fast recall for the whole course: the latency ladder, B+Tree vs LSM, ACID and the four isolation levels, index types, and the distributed trade-offs — CAP, replication, partitioning.',
  minutes: 7,
  level: 'intermediate',
  metrics: [],
  goals: [
    { text: 'Memorize the latency ladder, L1 to disk', step: 0 },
    { text: 'B+Tree vs LSM in one trade-off', step: 1 },
    { text: 'ACID and what each isolation level prevents', step: 2 },
    { text: 'Which index type to reach for', step: 3 },
    { text: 'CAP, replication and partitioning at a glance', step: 4 },
  ],

  steps: [
    { // 0 — latency ladder
      chapter: 'setup', short: 'Latency',
      title: 'The latency ladder',
      body: [
        `Every performance decision rides on these orders of magnitude. Moving a read from disk to memory is <b>~1000×</b>; from a remote DC to the same DC is another big jump. Internalize the <em>shape</em>, not the exact digits.`,
        `The gaps are what matter: RAM is ~100× an L1 hit, SSD is ~100× RAM, and a spinning-disk seek is ~1000× an SSD read. A same-datacenter round trip (~0.5 ms) sits near a disk seek — the network is not free, but it is far cheaper than a cross-region hop.`,
      ],
      callout: { kind: 'tip', text: 'Ratios to keep: RAM ≈ 100× L1, SSD ≈ 100× RAM, disk seek ≈ 1000× SSD. Caching exists to turn the slow rungs into the fast ones.' },
      changes: [
        'L1 cache ~1 ns',
        'Main memory (RAM) ~100 ns',
        'SSD random read ~16 µs',
        'Same-DC round trip ~0.5 ms',
        'Disk (HDD) seek ~10 ms',
      ],
      scene: { view: 'latency', note: 'L1 1ns · RAM 100ns · SSD 16µs · DC 0.5ms · disk 10ms.' },
    },
    { // 1 — storage engines
      chapter: 'tradeoff', short: 'Storage',
      title: 'B+Tree vs LSM',
      body: [
        `One choice shapes a storage engine. A <span class="term">B+Tree</span> is <b>read-optimized</b>: it updates pages <em>in place</em>, keeps keys sorted for range scans, and reaches any row in a handful of page reads (tree height ~3–4). Its cost is <span class="term">write amplification</span> from page splits and rewriting full pages.`,
        `An <span class="term">LSM-Tree</span> is <b>write-optimized</b>: writes <em>append</em> to an in-memory memtable then flush to immutable SSTables, merged by background <span class="term">compaction</span>. Reads may touch several levels (<span class="term">read amplification</span>), softened by <span class="term">bloom filters</span> that skip SSTables that cannot hold the key.`,
      ],
      callout: { kind: 'insight', text: 'Read-heavy, update-in-place, range scans → B+Tree. Write-heavy, append-only, ingest-fast → LSM. Both are sorted; they differ in where the work lands.' },
      changes: [
        'B+Tree — in-place, sorted, read-optimized, write amp from splits',
        'LSM — append + compact, write-optimized, read amp over levels',
        'LSM bloom filters cut wasted SSTable reads',
        'B+Tree: Postgres/MySQL · LSM: RocksDB/Cassandra',
      ],
      scene: { view: 'storage', note: 'B+Tree read-optimized (in-place) · LSM write-optimized (append+compact).' },
    },
    { // 2 — ACID & isolation
      chapter: 'technique', short: 'ACID',
      title: 'ACID & isolation levels',
      body: [
        `<span class="term">ACID</span>: <b>Atomicity</b> (all-or-nothing), <b>Consistency</b> (invariants hold), <b>Isolation</b> (concurrent txns don’t interfere), <b>Durability</b> (committed survives a crash).`,
        `Isolation is a dial. Each level forbids one more anomaly — and costs more concurrency. Weaker levels run faster but let anomalies through, so know your database’s default (often Read Committed) rather than assuming Serializable.`,
      ],
      callout: { kind: 'warn', text: 'Higher isolation = fewer anomalies, less concurrency. Read Committed is a common default — it still allows non-repeatable reads and phantoms.' },
      changes: [
        'Read Uncommitted — allows dirty reads',
        'Read Committed — no dirty reads (non-repeatable still possible)',
        'Repeatable Read — no non-repeatable reads (phantoms still possible)',
        'Serializable — no phantoms; as if run one at a time',
      ],
      scene: { view: 'acid', note: 'Dirty → non-repeatable → phantom: each level forbids one more.' },
    },
    { // 3 — index types
      chapter: 'technique', short: 'Indexes',
      title: 'Index types & when',
      body: [
        `An index trades write cost and space for faster reads. The default is a <span class="term">B+Tree</span> index: it serves equality <em>and</em> range (<code>&lt;, &gt;, BETWEEN, ORDER BY</code>) and prefix matches.`,
        `Reach for a <span class="term">hash</span> index for equality-only lookups, a <span class="term">bitmap</span> for low-cardinality columns, <span class="term">GIN/inverted</span> for full-text and arrays, and a <span class="term">covering</span> index to answer a query from the index alone (index-only scan), skipping the heap.`,
      ],
      callout: { kind: 'tip', text: 'Range or sort → B+Tree. Equality only → hash. Few distinct values → bitmap. Text/array → inverted. Want index-only scans → covering index.' },
      changes: [
        'B+Tree — equality + range + ordering (the default)',
        'Hash — equality only, no range scans',
        'Bitmap — low-cardinality, AND/OR of predicates',
        'Covering — includes all needed columns → index-only scan',
      ],
      scene: { view: 'indexes', note: 'B+Tree range · hash equality · bitmap low-card · covering = index-only.' },
    },
    { // 4 — distributed
      chapter: 'tradeoff', short: 'Distributed',
      title: 'CAP, replication, partitioning',
      body: [
        `<span class="term">CAP</span>: during a network <b>partition</b> you must choose — stay <b>Consistent</b> (reject requests that can’t see the latest write) or stay <b>Available</b> (answer, risking stale data). With no partition you keep both; the choice only bites under failure.`,
        `<span class="term">Replication</span> trades safety for speed: <b>synchronous</b> waits for replicas (durable, slower, blocks on a slow follower) vs <b>asynchronous</b> (fast, but a failover can lose the un-shipped tail). <span class="term">Partitioning</span> trades access patterns: <b>hash</b> spreads load evenly but kills range scans; <b>range</b> keeps scans but risks hot-spot skew.`,
      ],
      callout: { kind: 'insight', text: 'CAP: pick C or A under partition. Sync = safe/slow, async = fast/lossy. Hash = even/no ranges, range = ranges/skew. Every one is a deliberate trade.' },
      changes: [
        'CAP — under partition, choose Consistency or Availability',
        'Sync replication = no data loss, higher latency',
        'Async replication = low latency, possible loss on failover',
        'Hash partition = even load · Range partition = range scans + skew',
      ],
      scene: { view: 'distributed', note: 'CAP (C or A) · sync vs async · hash vs range.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The whole sheet',
      body: [
        `Five cards, one mental model. The <b>latency ladder</b> explains why we cache. <b>B+Tree vs LSM</b> is read- vs write-optimized. <b>ACID + isolation</b> is correctness you dial. <b>Index types</b> pick the access path. <b>CAP, replication, partitioning</b> are the distributed trade-offs.`,
        `Keep the numbers and the direction of each trade in your head; the rest you can derive. That is the whole course, compressed.`,
      ],
      callout: { kind: 'insight', text: 'Cache the slow rungs · read vs write engine · dial isolation for correctness · match index to query · trade C/A, sync/async, hash/range on purpose.' },
      scene: { view: 'recap', note: 'Latency · storage · isolation · indexes · distributed — one page.' },
    },
  ],
};
