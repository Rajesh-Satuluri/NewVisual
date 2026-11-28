/* content/buffer-pool-replacement.js — "Buffer Pool Replacement" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/buffer-pool-replacement-scene.js. */

export const bufferPoolReplacementLesson = {
  id: 'buffer-pool-replacement',
  title: 'Buffer Pool Replacement',
  group: 'Storage Engine',
  summary: 'The buffer pool is full and a new page needs a frame — so which resident page do you throw out? The eviction policy is the whole ballgame for hit rate.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['hitRate', 'evictions', 'pages', 'memory'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a full pool forces an eviction decision on every miss', step: 0 },
    { text: 'LRU: evict the least-recently-used page', step: 1 },
    { text: 'Clock / second-chance: LRU’s cost without LRU’s bookkeeping', step: 2 },
    { text: 'Sequential flooding — the attack that breaks plain LRU', step: 3 },
    { text: 'Scan-resistant policies that protect the hot working set', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Pool full',
      title: 'The pool is full. Something must go.',
      body: [
        `Every frame in the buffer pool holds a page. Now a query asks for page <code>42</code>, which isn’t resident — a <span class="term">buffer miss</span>. To read it from disk you need a free frame, and there are none.`,
        `So before the newcomer can load, the pool must <b>evict</b> a victim: pick a resident page, write it back if it’s dirty, and free its frame. The only question is <em>which</em> page — and that single choice decides how often you hit RAM versus the disk.`,
      ],
      callout: { kind: 'warn', text: 'A miss on a full pool is never just a read — it is an eviction plus a read. Choose the victim badly and you evict the page you need next.' },
      metrics: { hitRate: 50, evictions: 0, pages: 8, memory: 64 },
      scene: { view: 'full', note: '8 of 8 frames occupied — page 42 arrives with nowhere to land.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'LRU',
      title: 'LRU: throw out the coldest page',
      body: [
        `The classic answer is <span class="term">LRU</span> — Least Recently Used. Order the frames by last touch: the page you used most recently sits at the <b>hot</b> end, the one untouched longest at the <b>cold</b> end.`,
        `On a miss, evict the page at the cold end and insert the newcomer at the hot end. Every access moves its page back to the front. The bet is simple and usually right: a page used recently will be used again soon.`,
      ],
      callout: { kind: 'insight', text: 'LRU approximates “keep what the workload actually touches.” It exploits temporal locality — the backbone assumption of every cache.' },
      changes: ['+ recency order per frame', '~ evict the cold end', '+ insert at the hot end'],
      metrics: { hitRate: 78, evictions: 1, pages: 8, memory: 64 },
      scene: { view: 'lru', note: 'Evict the least-recently-used frame; the newcomer enters hot.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Clock',
      title: 'Clock: LRU on the cheap',
      body: [
        `True LRU means moving a frame to the head of a list on <em>every single access</em> — too much bookkeeping for a hot pool. <span class="term">Clock</span> (second-chance) approximates it with one <b>reference bit</b> per frame.`,
        `A hand sweeps the frames in a ring. When a page is used, its bit is set to <code>1</code>. On eviction the hand advances: a frame with bit <code>1</code> gets a second chance — clear it to <code>0</code> and move on; the first frame it finds already at <code>0</code> is the victim.`,
      ],
      callout: { kind: 'tip', text: 'Clock gives near-LRU quality for the price of one bit and a moving pointer. It is what real buffer pools actually run.' },
      changes: ['+ one reference bit / frame', '~ set bit on access', '+ sweep: clear 1→0, evict first 0'],
      metrics: { hitRate: 76, evictions: 2, pages: 8, memory: 64 },
      scene: { view: 'clock', note: 'The hand clears set bits (second chance) and evicts the first bit-0 frame.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'Flooding',
      title: 'Sequential flooding breaks LRU',
      body: [
        `Now run one big table scan. It streams thousands of pages through the pool, each touched <em>exactly once</em> and never again. But to plain LRU every one of them looks “most recently used,” so each scan page marches to the hot end and shoves the real working set out the cold end.`,
        `When the scan ends, the hot pages your other queries needed are gone — evicted by data that will never be read again. Hit rate collapses. This is <span class="term">sequential flooding</span>.`,
      ],
      callout: { kind: 'warn', text: 'A one-pass scan is poison for LRU: use-once pages evict use-many pages. Recency lies when a page’s first touch is also its last.' },
      changes: ['+ large sequential scan', '~ one-use pages flood the hot end', '− working set evicted'],
      metrics: { hitRate: 31, evictions: 7, pages: 8, memory: 64 },
      scene: { view: 'flooding', note: 'Use-once scan pages flood in and evict the pages real queries need.' },
    },
    { // 4 — SOLUTION
      chapter: 'solution', short: 'Scan-resistant',
      title: 'Protect the pages that earn it',
      body: [
        `The fix is to stop trusting a <em>single</em> touch. <span class="term">LRU-K</span> remembers the time of each page’s K-th most recent access (K=2 is common): a page needs to be referenced twice before it’s treated as hot, so a one-pass scan page never displaces a genuinely frequent page.`,
        `Real systems layer this — a probation queue for newcomers, a protected queue for pages touched again (2Q, ARC, LRU-K). Scan pages pass through probation and leave; the hot working set stays resident.`,
      ],
      callout: { kind: 'insight', text: 'Frequency beats raw recency: require a second reference before promotion, and sequential floods lose their power to evict your hot set.' },
      changes: ['+ track the K-th-last access', '~ one-touch pages stay on probation', '+ hot set protected'],
      metrics: { hitRate: 74, evictions: 3, pages: 8, memory: 64 },
      scene: { view: 'lru-k', note: 'A second reference promotes a page; one-touch scan pages bounce off probation.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Pick a victim, keep the hot set',
      body: [
        `Replacement policy is a spectrum of guesses about the future. <b>LRU</b> bets on recency; <b>Clock</b> delivers almost the same guess for the cost of one bit; <b>LRU-K / 2Q / ARC</b> add frequency so a scan can’t wreck the pool.`,
        `All of them chase one goal: when a frame must be freed, give up the page least likely to be needed next — and keep the hottest working set resident so most reads never touch the disk.`,
      ],
      callout: { kind: 'insight', text: 'Recency → Clock (cheap) → scan-resistance (LRU-K/2Q/ARC). The whole art is evicting the page you’ll miss least.' },
      metrics: { hitRate: 81, evictions: 3, pages: 8, memory: 64 },
      scene: { view: 'recap', note: 'LRU · Clock · LRU-K — three ways to keep the working set in RAM.' },
    },
  ],
};
