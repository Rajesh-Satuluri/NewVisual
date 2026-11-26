/* content/page-cache.js — the "Page Cache" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/page-cache-scene.js. Rendered through the shared course shell. */

export const pageCacheLesson = {
  id: 'page-cache',
  title: 'Page Cache',
  group: 'Storage Engine',
  summary: 'The operating system keeps its own cache of file pages underneath your database — a second layer of RAM you did not ask for. Why it helps, how it wastes memory, and why serious databases bypass it.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['hitRate', 'memory', 'ioOps', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The two caches that sit between a query and the disk', step: 0 },
    { text: 'How the OS page cache turns a miss into a cheap hit', step: 1 },
    { text: 'Double caching: the same page held in RAM twice', step: 2 },
    { text: 'O_DIRECT — bypassing the OS so the DBMS owns its memory', step: 3 },
    { text: 'Rely on the OS vs. manage it yourself', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The stack',
      title: 'Two caches stand between you and the disk',
      body: [
        `When a query needs a page, it does not go straight to the platter. It falls through a <span class="term">stack</span>: the app asks the DBMS, the DBMS looks in its own <b>buffer pool</b> (RAM it manages itself), and only on a miss does it call <code>read()</code>.`,
        `But that <code>read()</code> does not reach the disk either — not at first. The operating system keeps its <span class="term">page cache</span>, a pool of free RAM where it stashes recently-touched file pages. So there are <em>two</em> layers of RAM, managed by two different programs, between your query and the spinning rust.`,
      ],
      callout: { kind: 'insight', text: 'App → Buffer Pool → OS Page Cache → Disk. A read can be satisfied at any layer; the deeper it falls, the slower it gets.' },
      metrics: { hitRate: 62, memory: 512, ioOps: 3800, latency: 9 },
      scene: { view: 'stack', note: 'Four layers: app, buffer pool, OS page cache, disk.' },
    },
    { // 1 — HOW IT WORKS
      chapter: 'technique', short: 'OS cache',
      title: 'A miss in the pool can still skip the disk',
      body: [
        `Here is the quiet benefit. A page the DBMS evicted from its buffer pool is often <em>still sitting</em> in the OS page cache — the kernel hung onto it in otherwise-idle RAM.`,
        `So when the DBMS re-reads that page, its own lookup misses, it issues <code>read()</code>, and the kernel serves the bytes straight from RAM without ever touching the device. A buffer-pool miss becomes an OS-cache hit: microseconds, not milliseconds. The OS is quietly doing a second tier of caching for free.`,
      ],
      callout: { kind: 'tip', text: 'The OS page cache is transparent: your read() looks identical whether it hit RAM or disk. Free pages become a second cache at no cost to you.' },
      changes: ['+ OS caches evicted pages', '~ pool miss → cache hit', '+ no device I/O'],
      metrics: { hitRate: 78, memory: 512, ioOps: 1600, latency: 4 },
      scene: { view: 'oscache', note: 'Buffer-pool miss served from the OS page cache, not the disk.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Double caching',
      title: 'The same page, cached twice',
      body: [
        `The gift has a cost. When the DBMS pulls a page into its buffer pool, the kernel <em>also</em> keeps a copy in the page cache. Now the identical 8 KB page occupies RAM <span class="term">twice</span> — once in each cache.`,
        `Across a hot working set this is enormous waste: half of physical memory shadowing the other half. Worse, the DBMS cannot control the OS copy — it cannot pin it, cannot choose when it flushes, cannot reason about what is really resident. Two caches, one source of truth, no coordination.`,
      ],
      callout: { kind: 'warn', text: 'Double caching can waste up to half your RAM: every hot page is mirrored in both the buffer pool and the OS page cache, uselessly.' },
      changes: ['~ page copied into both caches', '− RAM wasted on duplicates', '− DBMS cannot control OS copy'],
      metrics: { hitRate: 78, memory: 960, ioOps: 1600, latency: 4 },
      scene: { view: 'double', note: 'One page, two resident copies — wasted memory.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'O_DIRECT',
      title: 'Bypass the OS with O_DIRECT',
      body: [
        `The fix is to cut the OS cache out of the path. Opening the data files with <code>O_DIRECT</code> tells the kernel: do not cache these pages, hand my reads and writes straight to the device.`,
        `Now there is exactly <span class="term">one</span> copy of each page, in the buffer pool the DBMS controls. It decides what stays resident, when dirty pages flush, and how memory is divided — no second cache shadowing it, no RAM wasted, no surprises from a kernel it cannot see into. The database owns its memory end to end.`,
      ],
      callout: { kind: 'insight', text: 'O_DIRECT removes the OS page cache from the data path. One copy per page, full control — the buffer pool becomes the single source of truth.' },
      changes: ['+ O_DIRECT bypasses page cache', '+ one copy per page', '+ DBMS owns all caching'],
      metrics: { hitRate: 84, memory: 540, ioOps: 1500, latency: 4 },
      scene: { view: 'direct', note: 'O_DIRECT skips the OS cache: the rail goes pool → disk.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Rely vs own',
      title: 'Let the OS cache, or manage it yourself',
      body: [
        `It is a real choice. <b>Lean on the OS cache</b> and you get simplicity for free — no buffer-pool code to write, the kernel handles readahead and eviction. SQLite and older engines do exactly this. The price is double caching, and surrendering control over eviction and flush timing.`,
        `<b>Bypass with O_DIRECT</b> and you reclaim every byte and every decision — Postgres leans partly on the OS, while Oracle, MySQL/InnoDB and most serious engines manage their own memory. The price is more code and the duty to re-implement readahead yourself. And beware <code>mmap</code>: it looks like free caching but hides page-fault stalls and I/O errors you cannot catch.`,
      ],
      callout: { kind: 'warn', text: 'mmap is a tempting shortcut — the file as memory — but page-fault stalls, uncontrollable eviction and un-catchable I/O errors make it a poor foundation for a database.' },
      metrics: { hitRate: 84, memory: 540, ioOps: 1500, latency: 4 },
      scene: { view: 'tradeoff', note: 'Rely on the OS cache, or bypass it and own your memory.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Own your memory',
      body: [
        `Underneath the buffer pool you so carefully tuned sits a second cache you did not write: the OS page cache. It can rescue an evicted page for free — or silently mirror your entire working set and waste half your RAM.`,
        `The grown-up answer is to take control: open files with <code>O_DIRECT</code>, keep exactly one copy of each page in a buffer pool you manage, and treat the disk as the disk. A database that owns its memory can reason about it — and a database that can reason about its memory is one you can actually tune.`,
      ],
      callout: { kind: 'insight', text: 'Buffer pool = yours to control. OS page cache = free but duplicative. Serious engines bypass it with O_DIRECT and own every page of RAM.' },
      metrics: { hitRate: 84, memory: 540, ioOps: 1500, latency: 4 },
      scene: { view: 'recap', note: 'One cache, owned by the DBMS — the foundation for tuning memory.' },
    },
  ],
};
