/* content/hot-partitions.js — the "Hot Partitions" lesson, as DATA. Same shape
   as the other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/hot-partitions-scene.js. */

export const hotPartitionsLesson = {
  id: 'hot-partitions',
  title: 'Hot Partitions',
  group: 'Distributed Systems',
  summary: 'Even when data is spread evenly, one partition can take a wildly disproportionate share of traffic. A single hot key saturates a node while the rest idle — and good hashing alone cannot fix it.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['partitions', 'skew', 'rps', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Even data distribution is not even load distribution', step: 0 },
    { text: 'A single hot key saturates one partition', step: 1 },
    { text: 'Salting splits a hot key across K partitions', step: 2 },
    { text: 'Caching and read replicas absorb read hotspots', step: 3 },
    { text: 'Splitting a key costs read fan-out and complexity', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Hotspot',
      title: 'Even data, uneven traffic',
      body: [
        `Your rows are spread evenly across four partitions — each holds a quarter of the keys, exactly as the hashing promised. And yet one node is on fire: its CPU is pinned, its p99 latency is climbing, while the other three sit nearly idle.`,
        `The culprit is a single <span class="term">hot key</span>: a celebrity account, a flash-sale product, a trending hashtag. All of its traffic lands on the one partition that owns it. <b>Balanced storage says nothing about balanced load.</b>`,
      ],
      callout: { kind: 'warn', text: 'A partition can be hot even when data is perfectly balanced. A single popular key concentrates reads or writes on exactly one node — and that node becomes the bottleneck for the whole cluster.' },
      metrics: { partitions: 4, skew: 72, rps: 48000, latency: 180 },
      scene: { view: 'skewed', note: 'Four partitions, equal data — but one takes a torrent of requests while the rest idle.' },
    },
    { // 1 — PROBLEM deepened
      chapter: 'problem', short: 'One key',
      title: 'Why hashing cannot save you',
      body: [
        `The instinct is to blame the hash function. But hashing distributes <em>keys</em>, not <em>requests</em>. A key hashes to exactly one partition by design — that is how reads find it again. So every request for <code>user:celebrity</code> must, deterministically, hit the same node.`,
        `No amount of rehashing moves a single key to two places at once. The hot partition is not a hashing bug; it is traffic physics. To spread the load you have to change the <b>key</b>, not the hash.`,
      ],
      callout: { kind: 'insight', text: 'Hashing balances the keyspace, not the request stream. One hot key is one partition, no matter the hash — so the fix has to live above the partitioner, in how you shape keys and reads.' },
      metrics: { partitions: 4, skew: 72, rps: 52000, latency: 210 },
      scene: { view: 'onekey', note: 'The hot key hashes to a single partition — deterministic, and therefore unavoidable.' },
    },
    { // 2 — SOLUTION / TECHNIQUE
      chapter: 'technique', short: 'Salting',
      title: 'Salt the key to split the load',
      body: [
        `The classic fix is <span class="term">salting</span> (a.k.a. write-sharding). Append a small random suffix — <code>user:celebrity#0</code> … <code>#9</code> — so one logical key becomes <b>K</b> physical keys that hash to K different partitions.`,
        `Writes now fan out across the cluster, and the hottest spot cools by roughly a factor of K. A read must gather all K sub-keys and merge them, but the write throughput is no longer trapped on one machine.`,
      ],
      callout: { kind: 'insight', text: 'Salting turns one hot key into K sub-keys spread across K partitions. Write load divides by ~K. The price is a scatter-gather read that must touch all K sub-keys.' },
      changes: ['+ append #0…#K-1 suffix', '~ one key → K keys across K nodes', '+ write load ÷ K'],
      metrics: { partitions: 4, skew: 18, rps: 52000, latency: 90 },
      scene: { view: 'salted', note: 'One hot key split into K salted sub-keys, each landing on a different partition.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Cache & replicas',
      title: 'For read hotspots: cache and replicate',
      body: [
        `Salting shines for write-heavy hotspots. When the hot key is <em>read</em>-heavy instead — one product everyone is viewing — the cheaper fix is to put a copy where the reads are: a cache at the application tier, or extra <span class="term">read replicas</span> dedicated to that key.`,
        `A cache answers most reads without ever touching the partition; dedicated replicas let the read load fan across several nodes. The hot partition only sees the misses and the writes.`,
      ],
      callout: { kind: 'tip', text: 'Read hotspots are often best absorbed by caching the hot key at the edge and adding read replicas. Match the technique to the shape of the traffic: salt writes, cache reads.' },
      changes: ['+ app-tier cache for hot key', '+ dedicated read replicas', '~ partition sees only misses + writes'],
      metrics: { partitions: 4, skew: 12, rps: 60000, latency: 40 },
      scene: { view: 'cache', note: 'A cache and read replicas soak up the read torrent before it reaches the hot partition.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Fan-out',
      title: 'Every fix adds moving parts',
      body: [
        `None of this is free. Salting makes every read of the hot key a <span class="term">scatter-gather</span> across K partitions — more network round-trips, more merging, and you must pick K by hand. Pick it too small and the key stays hot; too large and ordinary reads get slower.`,
        `Caches add invalidation and staleness; dedicated replicas add lag and cost. And all of it depends on <b>detecting</b> the hotspot first — you cannot salt a key you did not know was hot.`,
      ],
      callout: { kind: 'warn', text: 'Hotspot remedies trade simplicity for balance: fan-out reads, manual split factors, cache invalidation, replica lag. Detection comes first — monitor per-key traffic, because you can only treat a hotspot you can see.' },
      metrics: { partitions: 4, skew: 18, rps: 58000, latency: 70 },
      scene: { view: 'fanout', note: 'A salted read must fan out to all K sub-keys and merge — balance bought with round-trips.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Balance the load, not just the data',
      body: [
        `A hot partition is the gap between where data lives and where traffic goes. Perfect hashing balances the first and is helpless against the second — one popular key can pin a single node no matter how even the storage looks.`,
        `The toolkit: <b>salt</b> write-hot keys across K partitions, <b>cache</b> and <b>replicate</b> read-hot keys, and above all <b>measure</b> per-key load so you spot the hotspot before it spots you.`,
      ],
      callout: { kind: 'insight', text: 'Even data distribution ≠ even load distribution. Hot keys need deliberate handling — salting, caching, replicas — and constant per-key monitoring to catch them early.' },
      metrics: { partitions: 4, skew: 14, rps: 60000, latency: 45 },
      scene: { view: 'recap', note: 'Salt writes, cache reads, measure everything — load balanced, not just storage.' },
    },
  ],
};
