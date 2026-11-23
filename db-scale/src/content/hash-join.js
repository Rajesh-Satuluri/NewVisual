/* content/hash-join.js — the "Join Algorithms / Hash Join" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/hash-join-scene.js. Rendered through the shared course shell. */

export const hashJoinLesson = {
  id: 'hash-join',
  title: 'Join Algorithms',
  group: 'Query Engine',
  summary: 'The hash join — build a hash table on the smaller input, then probe it with the larger — the fastest way to join two big, unsorted tables on an equality.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['rows', 'memory', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A join runs in two phases: build, then probe', step: 0 },
    { text: 'The build phase hashes the smaller input into buckets', step: 1 },
    { text: 'The probe phase looks each row up in O(1)', step: 2 },
    { text: 'The hash table must fit in memory — or it spills', step: 3 },
    { text: 'When a hash join wins, and when it cannot be used', step: 4 },
  ],

  steps: [
    { // 0 — IDEA
      chapter: 'technique', short: 'Build & probe',
      title: 'Two phases: build, then probe',
      body: [
        `A <span class="term">hash join</span> answers <code>users ⋈ orders ON users.id = orders.user_id</code> by splitting the work in two. First it <b>builds</b> a hash table from one input; then it <b>probes</b> that table with the other, one row at a time.`,
        `The trick is that a hash table turns "does a matching row exist?" from a scan into a single <span class="term">O(1)</span> lookup. Do that once per probe row and the whole join finishes in roughly one pass over each side.`,
      ],
      callout: { kind: 'insight', text: 'Build a hash table on the small side, probe it with the big side. Two passes total — that is the entire algorithm.' },
      metrics: { rows: 0, memory: 0, latency: 0 },
      scene: { view: 'phases', note: 'One side builds the table; the other probes it.' },
    },
    { // 1 — BUILD
      chapter: 'technique', short: 'Build phase',
      title: 'Build a hash table on the small side',
      body: [
        `The planner picks the <b>smaller</b> relation as the <span class="term">build</span> side — here <code>users</code>. It reads every build row and hashes it by the join key (<code>users.id</code>) into a bucket.`,
        `Rows that hash to the same bucket chain together. When the build finishes, the entire small relation lives in memory, indexed by join key and ready to answer lookups.`,
      ],
      callout: { kind: 'tip', text: 'Hash the join key → drop the row in that bucket. Collisions just chain within a bucket; the lookup is still near-constant.' },
      changes: ['+ read the build (small) relation', '+ hash each row by join key', '+ hash table in memory'],
      metrics: { rows: 10000, memory: 4, latency: 30 },
      scene: { view: 'build', note: 'Each users row is hashed into a bucket.' },
    },
    { // 2 — PROBE
      chapter: 'technique', short: 'Probe phase',
      title: 'Probe it with the big side',
      body: [
        `Now the engine streams the <b>larger</b> relation — <code>orders</code> — straight through. Each order row is hashed by <code>orders.user_id</code> and the matching bucket is checked in <span class="term">O(1)</span>.`,
        `A hit emits the joined row immediately; a miss is dropped. The big side never has to be stored — it flows through once and is gone, which is why hash join scales to inputs far larger than memory on the probe side.`,
      ],
      callout: { kind: 'insight', text: 'Probe rows stream through once. Build side is in RAM; probe side is unbounded. Matches are emitted on the fly.' },
      changes: ['+ stream the probe (big) relation', '~ hash + lookup each row', '+ emit matches immediately'],
      metrics: { rows: 142000, memory: 4, latency: 90 },
      scene: { view: 'probe', note: 'Each orders row looks up its bucket in O(1).' },
    },
    { // 3 — MEMORY
      chapter: 'tradeoff', short: 'Memory',
      title: 'The hash table has to fit in RAM',
      body: [
        `The whole speed story assumes the build side's hash table <em>fits in memory</em>. If the small relation is still too big, the table overflows.`,
        `The fix is <span class="term">grace hash join</span>: partition both inputs by hash into buckets small enough to fit, spilling partitions to disk, then join each partition in memory one at a time. It costs extra I/O but never blows up RAM.`,
      ],
      callout: { kind: 'warn', text: 'Too many build rows → the hash table spills to disk (grace hash join). Correct, but you pay for the extra reads and writes.' },
      changes: ['~ build side exceeds memory', '+ partition & spill to disk', '~ join partition-by-partition'],
      metrics: { rows: 142000, memory: 512, latency: 160 },
      scene: { view: 'memory', note: 'When the table overflows RAM, partitions spill to disk.' },
    },
    { // 4 — WHEN
      chapter: 'tradeoff', short: 'When it wins',
      title: 'Best for big, unsorted equi-joins',
      body: [
        `Hash join is the workhorse for large tables joined on an <b>equality</b>: no sorting, no indexes, just two near-linear passes. It crushes nested-loop join once both inputs are big.`,
        `Its one hard limit: hashing only answers <code>=</code>. A <span class="term">range join</span> like <code>a.x &lt; b.y</code> has no single bucket to probe, so the optimizer falls back to a sort-merge or nested-loop plan instead.`,
      ],
      callout: { kind: 'tip', text: 'Equi-join on big unsorted inputs → hash join. Range or inequality join → it cannot help; use sort-merge or nested loop.' },
      metrics: { rows: 142000, memory: 4, latency: 90 },
      scene: { view: 'when', note: 'Great for equi-joins; useless for range joins.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'O(N + M) for equi-joins',
      body: [
        `Build once, probe once: a hash join touches each input roughly a single time, giving <span class="term">O(N + M)</span> — dramatically better than the O(N·M) of a naive nested loop.`,
        `The price is memory for the build table (and spill I/O when it does not fit) and the restriction to equality predicates. Within those bounds, it is usually the cheapest join the optimizer can pick.`,
      ],
      callout: { kind: 'insight', text: 'One build pass + one probe pass = O(N + M). Pay with RAM and an equi-join-only restriction.' },
      metrics: { rows: 142000, memory: 4, latency: 90 },
      scene: { view: 'recap', note: 'Build → table → probe → matches. Linear in both inputs.' },
    },
  ],
};
