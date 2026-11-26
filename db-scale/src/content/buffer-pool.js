/* content/buffer-pool.js — the "Buffer Pool" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/buffer-pool-scene.js. Rendered through the shared course shell. */

export const bufferPoolLesson = {
  id: 'buffer-pool',
  title: 'Buffer Pool',
  group: 'Storage Engine',
  summary: 'The in-RAM cache of disk pages that sits between the storage engine and the disk — the single reason a database can answer most reads without ever touching a platter.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['hitRate', 'pages', 'memory', 'ioOps'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a disk read is a catastrophe next to a RAM read', step: 0 },
    { text: 'The buffer pool: fixed RAM frames holding copies of disk pages', step: 1 },
    { text: 'The page table that finds a cached page in O(1)', step: 2 },
    { text: 'Cache hit vs miss — the two paths a read can take', step: 3 },
    { text: 'Pinned and dirty frames: what must not be evicted yet', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The gap',
      title: 'Disk is a different universe from RAM',
      body: [
        `The storage engine keeps its data in <span class="term">pages</span> on disk. The trouble is physics: reading a page from RAM takes about 100 nanoseconds, while reading one from a spinning disk takes about 10 milliseconds — roughly <b>100,000× slower</b>.`,
        `If every query read its pages straight off the disk, the database would spend almost all of its time waiting. One uncached lookup can stall a request longer than thousands of in-memory ones combined. Something has to stand in the gap.`,
      ],
      callout: { kind: 'warn', text: 'A single disk page read can cost as much as 100,000 RAM reads. Touch the disk on every query and your database crawls.' },
      metrics: { hitRate: 0, pages: 0, memory: 0, ioOps: 1 },
      scene: { view: 'gap', note: 'RAM in nanoseconds, disk in milliseconds — a 100,000× chasm.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'The pool',
      title: 'A pool of RAM frames caching pages',
      body: [
        `The <span class="term">buffer pool</span> is a big slab of RAM carved into fixed-size <b>frames</b>, each exactly one page wide. When the engine needs a page, it copies that page from disk into a free frame — and leaves it there.`,
        `The next time anyone asks for that page, it is already in RAM: no disk trip at all. Hot pages — the ones queries hit again and again — simply stay resident, so the vast majority of reads are served from memory.`,
      ],
      callout: { kind: 'insight', text: 'The buffer pool is a cache of disk pages in RAM. Read a page once, serve it from memory forever after — until something evicts it.' },
      changes: ['+ fixed RAM frames', '+ pages copied in on first read', '+ hot pages stay resident'],
      metrics: { hitRate: 62, pages: 6, memory: 64, ioOps: 6 },
      scene: { view: 'pool', note: 'Eight frames in RAM, each caching one page copied up from disk.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Page table',
      title: 'The page table finds a page instantly',
      body: [
        `To serve a page from the pool, the engine first has to know <em>whether</em> it is cached and <em>where</em>. That is the job of the <span class="term">page table</span>: a hash map from <code>page_id</code> to the frame number holding it.`,
        `A lookup is O(1). Present in the table → it is a <b>hit</b>, return that frame. Absent → it is a <b>miss</b>, go fetch it from disk. The page table is the pool's index into itself.`,
      ],
      callout: { kind: 'tip', text: 'page_id → frame number, in a hash map. The page table turns "is this page cached?" into a single constant-time lookup.' },
      changes: ['+ page table: page_id → frame', '~ O(1) hit/miss decision'],
      metrics: { hitRate: 74, pages: 8, memory: 64, ioOps: 8 },
      scene: { view: 'pagetable', note: 'page_id 42 → frame 3: one hash lookup decides hit or miss.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Hit vs miss',
      title: 'Two paths: served from RAM, or fetched from disk',
      body: [
        `A <span class="term">hit</span> is the happy path: the page table points at a frame, the engine reads it straight from RAM and returns — nanoseconds, no I/O.`,
        `A <span class="term">miss</span> is the long way round: find a free frame (or evict one to make room), issue a disk read to load the page into it, record it in the page table, <em>then</em> return. Every miss is a disk trip; the whole point of the pool is to make misses rare.`,
      ],
      callout: { kind: 'insight', text: 'Hit = RAM, done. Miss = evict, disk read, fill frame, record, then done. The hit rate is the headline number for the whole storage engine.' },
      metrics: { hitRate: 91, pages: 9, memory: 64, ioOps: 11 },
      scene: { view: 'hitmiss', note: 'A hit short-circuits in RAM; a miss pays for a full disk fetch.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Pin & dirty',
      title: 'Pinned and dirty frames can’t just vanish',
      body: [
        `Frames are not freely interchangeable. A frame is <span class="term">pinned</span> while someone is actively reading or writing its page — eviction is forbidden until the last user unpins it, or the page could be pulled out from under a live query.`,
        `A frame is <span class="term">dirty</span> once its page has been modified in RAM but not yet written back. Before a dirty frame can be reused, the pool must flush it to disk, or that change is lost. Pin says "not yet"; dirty says "write me first."`,
      ],
      callout: { kind: 'warn', text: 'Never evict a pinned frame — a live reader depends on it. Never discard a dirty frame — flush it to disk first, or you lose the write.' },
      changes: ['+ pin count per frame', '+ dirty bit per frame', '~ dirty frames flush before reuse'],
      metrics: { hitRate: 93, pages: 9, memory: 64, ioOps: 13 },
      scene: { view: 'dirty', note: 'One frame pinned (in use), one dirty (must flush before reuse).' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Most reads never reach the disk',
      body: [
        `The buffer pool is the storage engine's working memory: fixed frames caching disk pages, a page table that locates any cached page in O(1), and per-frame pin counts and dirty bits that keep eviction safe.`,
        `Together they turn a 100,000× penalty into a rounding error — when the hit rate is high, the disk barely moves. How the pool chooses <em>which</em> frame to evict when it runs out is the next lesson: buffer pool replacement.`,
      ],
      callout: { kind: 'insight', text: 'Frames · page table · pin & dirty. A high hit rate means the database runs at RAM speed and only falls to disk on a miss.' },
      metrics: { hitRate: 96, pages: 9, memory: 64, ioOps: 13 },
      scene: { view: 'recap', note: 'Frames, page table, safety bits — the disk barely moves.' },
    },
  ],
};
