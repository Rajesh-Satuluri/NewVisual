/* content/storage-hierarchy.js — the "Storage Hierarchy" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/storage-hierarchy-scene.js. Rendered through the shared course shell. */

export const storageHierarchyLesson = {
  id: 'storage-hierarchy',
  title: 'Storage Hierarchy',
  group: 'Foundations',
  summary: 'From CPU registers down to disk and the network, every tier is faster but smaller and costlier than the one below — and almost every database design is really about dodging the slow tiers.',
  minutes: 8,
  level: 'beginner',
  metrics: ['latency', 'tiers'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The storage pyramid: each tier faster but smaller &amp; costlier', step: 0 },
    { text: 'The latency cliff between RAM and disk', step: 1 },
    { text: 'Volatile RAM vs durable disk — why logs exist', step: 2 },
    { text: 'Pages, and why sequential I/O beats random', step: 3 },
    { text: 'The buffer pool: caching hot pages in RAM', step: 4 },
  ],

  steps: [
    { // 0 — THE PYRAMID
      chapter: 'technique', short: 'The pyramid',
      title: 'A pyramid of trade-offs',
      body: [
        `Computer memory is not one thing — it is a <span class="term">hierarchy</span>. At the very top, CPU <b>registers</b> answer in under a nanosecond but hold only a few dozen values. Just below, the <b>CPU cache</b> (~1&nbsp;ns) holds kilobytes, <b>RAM</b> (~100&nbsp;ns) holds gigabytes, an <b>SSD</b> (~100&nbsp;µs) holds terabytes, a spinning <b>disk</b> (~10&nbsp;ms) holds more still, and the <b>network</b> (~100&nbsp;ms) reaches effectively everything.`,
        `Each step down is bigger and cheaper per byte — and dramatically slower. That single tension shapes every decision a database makes.`,
      ],
      callout: { kind: 'insight', text: 'Up the pyramid: fast, small, expensive. Down the pyramid: slow, huge, cheap. A database constantly chooses which tier a byte should live on right now.' },
      metrics: { latency: 10, tiers: 6 },
      scene: { view: 'pyramid', note: 'Six tiers — each ~10–100× slower but far larger than the one above.' },
    },
    { // 1 — THE CLIFF
      chapter: 'technique', short: 'The cliff',
      title: 'The latency cliff',
      body: [
        `The gaps are not gentle. Reading from RAM takes about <b>100&nbsp;ns</b>; reading the same data from a spinning disk takes about <b>10&nbsp;ms</b> — roughly <b>100,000×</b> longer. If RAM were a one-second errand, that disk read would take over a day.`,
        `This RAM&nbsp;→&nbsp;disk <span class="term">cliff</span> dominates performance. A query that stays in memory feels instant; one that falls to disk stalls. Most of a storage engine's cleverness exists to keep your working data on the fast side of this cliff.`,
      ],
      callout: { kind: 'warn', text: 'The jump from RAM to disk is ~100,000×. One avoidable disk read can cost more than a million in-memory operations.' },
      metrics: { latency: 10, tiers: 6 },
      scene: { view: 'latency', note: 'RAM to disk is the cliff — five orders of magnitude.' },
    },
    { // 2 — VOLATILE VS DURABLE
      chapter: 'technique', short: 'Volatile',
      title: 'Fast but forgetful, slow but faithful',
      body: [
        `Speed comes with a catch. RAM is <span class="term">volatile</span> — pull the power and everything in it vanishes. Disk is <span class="term">durable</span> — it keeps its contents across crashes and restarts.`,
        `So a database cannot simply live in fast memory: anything it promises to remember must eventually reach durable storage. The classic trick is the <b>write-ahead log</b> — append each change to disk <em>first</em>, then do the fast in-memory work, so a crash can always be replayed.`,
      ],
      callout: { kind: 'tip', text: 'RAM = fast + forgetful. Disk = slow + faithful. Durability means a change is safe on disk before it is acknowledged — the reason the WAL exists.' },
      changes: ['+ durable disk tier', '~ RAM holds the working set', '+ write-ahead log for safety'],
      metrics: { latency: 10, tiers: 2 },
      scene: { view: 'volatile', note: 'RAM forgets on power-off; disk remembers. The log bridges them.' },
    },
    { // 3 — PAGE I/O
      chapter: 'technique', short: 'Pages',
      title: 'Disks move in pages',
      body: [
        `You never read one byte from disk — hardware moves data in fixed <span class="term">pages</span> (commonly 4–16&nbsp;KB). Asking for a single row drags its whole page into memory.`,
        `And <b>where</b> the pages sit matters enormously. Reading pages that are laid out <em>next to each other</em> — <span class="term">sequential</span> I/O — is often 100× faster than hopping to scattered <span class="term">random</span> locations. This is why databases work hard to store related data together and to turn random writes into sequential ones.`,
      ],
      callout: { kind: 'insight', text: 'I/O is paged, not byte-addressed. Sequential ≫ random — layout is a first-class performance decision, not an afterthought.' },
      changes: ['+ page-granular I/O', '+ sequential layout wins', '~ random access is the slow path'],
      metrics: { latency: 10, tiers: 2 },
      scene: { view: 'pageio', note: 'Sequential pages stream; random pages stall.' },
    },
    { // 4 — BUFFER POOL
      chapter: 'technique', short: 'Buffer pool',
      title: 'Keep the hot pages in RAM',
      body: [
        `The fix for the cliff is a cache. The <span class="term">buffer pool</span> is a slice of RAM where the database keeps the pages it has touched recently. The next time a query wants one of those pages, it is served from memory in nanoseconds instead of being fetched from disk in milliseconds.`,
        `Because real workloads touch a small <em>hot</em> set over and over, a well-sized buffer pool answers the vast majority of reads without ever paying the disk cost. It is the single most important reason databases feel fast.`,
      ],
      callout: { kind: 'tip', text: 'The buffer pool trades RAM for speed: cache hot pages so the common read never crosses the cliff. Hit rate is everything.' },
      changes: ['+ buffer pool in RAM', '~ hot pages cached', '− most reads avoid disk'],
      metrics: { latency: 1, tiers: 2 },
      scene: { view: 'bufferpool', note: 'Hot pages ride up into RAM; cold pages wait on disk.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'It is all latency arbitrage',
      body: [
        `Step back and the pattern is everywhere: an <b>index</b> turns a random scan into a few targeted reads, a <b>cache</b> keeps hot data up a tier, a <b>log</b> converts slow random writes into fast sequential ones. Each is a move to a better spot on the pyramid.`,
        `Hold the hierarchy in mind for the rest of the course. Buffer pools, B-trees, LSM-trees, WALs — every one of them is a strategy for keeping the data you need on the fast side of the cliff.`,
      ],
      callout: { kind: 'insight', text: 'Indexes · caches · logs — the whole storage engine is machinery for moving work up the pyramid, away from the slow tiers.' },
      metrics: { latency: 1, tiers: 6 },
      scene: { view: 'recap', note: 'Index, cache, log — three ways to climb the pyramid.' },
    },
  ],
};
