/* content/buffer-pool-lab.js — the "Buffer Pool Lab" interactive walkthrough,
   as DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/buffer-pool-lab-scene.js. */

export const bufferPoolLabLesson = {
  id: 'buffer-pool-lab',
  title: 'Buffer Pool Lab',
  group: 'Interactive Labs',
  summary: 'Run a stream of page requests against a tiny 4-frame buffer pool and watch hits, misses, evictions and write-backs decide how often you touch the disk.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['hitRate', 'evictions', 'ioOps', 'latency'],
  legend: ['read', 'write', 'flush'],
  goals: [
    { text: 'Why a cache in RAM sits between queries and the disk', step: 0 },
    { text: 'Cold misses fault pages in and fill empty frames', step: 1 },
    { text: 'Re-reading a cached page is a hit — no disk I/O', step: 2 },
    { text: 'A full pool evicts by LRU; dirty victims flush first', step: 3 },
    { text: 'A scan bigger than the pool thrashes the hit rate', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / setup
      chapter: 'problem', short: 'Setup',
      title: 'A tiny pool in front of a slow disk',
      body: [
        `Reading a page from disk costs on the order of <b>10,000×</b> what reading it from RAM does. So the database keeps a <span class="term">buffer pool</span> — a fixed set of in-memory <em>frames</em> that cache recently-used disk pages — and every read goes through it first.`,
        `Our lab pool has just <b>4 frames</b>. A query will ask for pages in the order <code>1 · 2 · 3 · 1 · 4 · 2 · 5 · 1</code>. Watch which requests the pool can answer from memory, and which force a trip to disk.`,
      ],
      callout: { kind: 'tip', text: 'A hit is served from RAM in microseconds; a miss must fetch the page from disk. The whole game is to turn misses into hits.' },
      metrics: { hitRate: 0, evictions: 0, ioOps: 0, latency: 2 },
      scene: { view: 'setup', note: 'Four empty frames in RAM, a disk below, and a queue of page requests.' },
    },
    { // 1 — TECHNIQUE: cold misses
      chapter: 'technique', short: 'Cold miss',
      title: 'Cold misses fault pages in',
      body: [
        `The first three requests — <code>1</code>, <code>2</code>, <code>3</code> — find <b>nothing</b> cached. Each is a <span class="term">compulsory miss</span>: the pool fetches the page from disk (an I/O) and parks it in a free frame.`,
        `Every miss costs a slow disk read, so <b>latency is high</b> and <b>I/O count climbs</b>. But the frames are filling, and the hit rate is already inching up off zero as the pool warms.`,
      ],
      callout: { kind: 'insight', text: 'A cold cache can only miss — there is nothing to hit yet. Misses here are unavoidable; the payoff comes on the re-reads.' },
      changes: ['+ fault pages 1, 2, 3 from disk', '+ 3 disk I/Os', '~ 3 of 4 frames now full'],
      metrics: { hitRate: 0, evictions: 0, ioOps: 3, latency: 40 },
      scene: { view: 'cold', note: 'Pages 1·2·3 read from disk into empty frames — three slow misses.' },
    },
    { // 2 — TECHNIQUE: hits
      chapter: 'technique', short: 'Hit',
      title: 'A re-read is a hit — straight from RAM',
      body: [
        `Now the stream asks for page <code>1</code> again. It is <b>already in a frame</b>, so the pool answers from memory — a <span class="term">cache hit</span>, no disk touched. The LRU bookkeeping marks page 1 as most-recently-used.`,
        `This is why caching works at all: real workloads have <span class="term">locality</span> — they revisit the same hot pages. Each hit skips a disk read, so latency drops and the hit rate jumps.`,
      ],
      callout: { kind: 'insight', text: 'Locality is the whole bet: if requests revisit recent pages, a small pool serves most reads from RAM.' },
      changes: ['✓ request for page 1 → HIT', '− 0 disk I/O for the hit', '~ page 1 marked most-recently-used'],
      metrics: { hitRate: 25, evictions: 0, ioOps: 3, latency: 12 },
      scene: { view: 'hit', note: 'Page 1 is already cached — served from RAM with no disk I/O.' },
    },
    { // 3 — TECHNIQUE: eviction + flush
      chapter: 'technique', short: 'Evict',
      title: 'A full pool evicts — and dirty pages flush',
      body: [
        `Page <code>4</code> fills the last frame; the pool is now <b>full</b>. The next new page, <code>5</code>, has nowhere to go, so the replacement policy picks a <span class="term">victim</span> — the <b>least-recently-used</b> frame, page 3 — and reclaims it.`,
        `If the victim is <span class="term">clean</span> it is simply dropped. But if it was modified — <span class="term">dirty</span> — the pool must first <b>flush it to disk</b> (a write-back) before the frame can be reused. That flush is an extra I/O the eviction pays for.`,
      ],
      callout: { kind: 'warn', text: 'Evicting a dirty page costs a write before the read: the frame can’t be reused until its changes are safely on disk.' },
      changes: ['+ page 5 requested, pool full', '− evict LRU victim (page 3)', '⚑ dirty victim flushed to disk first'],
      metrics: { hitRate: 33, evictions: 1, ioOps: 6, latency: 46 },
      scene: { view: 'evict', note: 'Pool full: LRU victim page 3 is flushed, then page 5 takes its frame.' },
    },
    { // 4 — TRADE-OFF: thrashing
      chapter: 'tradeoff', short: 'Thrash',
      title: 'Scan a set bigger than the pool → thrashing',
      body: [
        `Now run a scan over <b>5 pages</b> through a <b>4-frame</b> pool, again and again. Each new page evicts the one you are about to need next, so every single request misses — the classic <span class="term">thrash</span>. The hit rate collapses toward zero and I/O spikes.`,
        `Two levers fix it: a <b>bigger pool</b> (hold the whole working set), or a <b>smarter policy</b> — LRU-K or CLOCK resist evicting pages a scan will revisit. More memory buys fewer I/Os; that is the core trade.`,
      ],
      callout: { kind: 'warn', text: 'When the working set exceeds the pool, LRU evicts exactly the pages you need next. Size the pool to the working set, or use a scan-resistant policy.' },
      changes: ['− working set (5) > frames (4)', '✗ every request misses', '+ hit rate collapses, I/O spikes'],
      metrics: { hitRate: 4, evictions: 8, ioOps: 20, latency: 52 },
      scene: { view: 'thrash', note: 'A 5-page loop through 4 frames: each page is evicted just before it is needed again.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The pool turns random I/O into memory hits',
      body: [
        `The buffer pool converts slow, random disk reads into fast memory hits — <b>when there is locality</b>. First touches must miss; re-reads hit; a full pool evicts its least-recently-used frame, flushing it first if dirty.`,
        `Two numbers decide performance: the <b>hit rate</b> (set by pool size and replacement policy) and the <b>flush cost</b> of dirty evictions. Size the pool to the working set and pick a policy that survives scans.`,
      ],
      callout: { kind: 'insight', text: 'Hit rate is set by pool size × policy × locality; dirty evictions add a flush. Tune all three to keep the disk quiet.' },
      metrics: { hitRate: 62, evictions: 2, ioOps: 7, latency: 10 },
      scene: { view: 'recap', note: 'Warm pool, high hit rate — the disk is touched only on misses and flushes.' },
    },
  ],
};
