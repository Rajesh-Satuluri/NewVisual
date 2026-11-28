/* content/hash-partitioning.js — the "Hash Partitioning" lesson, as DATA. Same
   shape as the other db-scale lessons: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/hash-partitioning-scene.js. */

export const hashPartitioningLesson = {
  id: 'hash-partitioning',
  title: 'Hash Partitioning',
  group: 'Distributed Systems',
  summary: 'Spread rows evenly across nodes by hashing the key: hash(key) mod N scatters data uniformly, killing hotspots — at the cost of making range scans touch every partition.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['partitions', 'skew', 'nodes2', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why naive placement creates hotspots', step: 0 },
    { text: 'Hashing the key scatters rows uniformly', step: 1 },
    { text: 'partition = hash(key) mod N — one hop per key', step: 2 },
    { text: 'Range scans must now touch every partition', step: 3 },
    { text: 'Changing N reshuffles almost everything', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Hotspots',
      title: 'Sequential keys clump onto one node',
      body: [
        `You have more data than one machine holds, so you split the table across <b>N</b> nodes. The obvious rule — “keys A–I on node 1, J–R on node 2, S–Z on node 3” — is <span class="term">range partitioning</span>, and it has a trap.`,
        `Real keys are rarely uniform. Auto-increment IDs, timestamps, usernames starting with common letters — all of them <b>clump</b>. New writes pour into whichever partition owns “now,” so one node runs hot while the others sit nearly idle.`,
      ],
      callout: { kind: 'warn', text: 'Range placement groups adjacent keys together. When traffic favours a key range — recent IDs, today’s timestamps — that one partition becomes a hotspot while the rest idle.' },
      metrics: { partitions: 3, skew: 72, nodes2: 3, latency: 95 },
      scene: { view: 'hotspot', note: 'Sequential keys pile onto one partition — a hotspot forms.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Hash it',
      title: 'Hash the key before you place it',
      body: [
        `The fix is to stop placing rows by their raw key and place them by a <span class="term">hash</span> of the key instead. A good hash function takes any input — sequential, clustered, lopsided — and returns a value spread <b>uniformly</b> across its whole output range.`,
        `Feed “user:1”, “user:2”, “user:3” through the hash and they scatter to completely different buckets. The clumping in the <em>input</em> vanishes; the <em>output</em> is an even sprinkle across all N nodes.`,
      ],
      callout: { kind: 'insight', text: 'A hash function turns a skewed key distribution into a uniform one. Place rows by hash(key), not by key, and load spreads evenly no matter how lopsided the keys are.' },
      changes: ['+ hash(key) before placement', '~ clustered keys → uniform scatter', '− no single hot partition'],
      metrics: { partitions: 3, skew: 8, nodes2: 3, latency: 32 },
      scene: { view: 'hashfn', note: 'Keys flow through hash() and scatter evenly to every bucket.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'mod N',
      title: 'partition = hash(key) mod N',
      body: [
        `The placement rule is one line: <code>partition = hash(key) mod N</code>. Hash the key to a big integer, take it modulo the number of partitions, and that is the node that owns the row — for both writes and reads.`,
        `Because the hash is <b>deterministic</b>, the same key always lands on the same partition. A point lookup — “fetch user:42” — hashes the key, jumps straight to the one owning node, and reads it in a <span class="term">single hop</span>. No broadcast, no search.`,
      ],
      callout: { kind: 'tip', text: 'The mapping is deterministic: identical keys always hash to the same partition. Point reads and writes go straight to the owning node in one hop — no coordinator fan-out.' },
      metrics: { partitions: 3, skew: 6, nodes2: 3, latency: 18 },
      scene: { view: 'lookup', note: 'hash(key) mod N routes a point lookup straight to its owner.' },
    },
    { // 3 — TRADE-OFF
      chapter: 'tradeoff', short: 'Range scans',
      title: 'Uniform scatter kills range scans',
      body: [
        `The same scattering that saves you on point reads <b>hurts</b> on ranges. Hashing deliberately throws adjacent keys apart, so “all orders from Monday” no longer live together — they are sprinkled across <em>every</em> partition.`,
        `A range query can’t visit one node; it must fan out to <b>all N</b>, scan each, and merge the results. What was a tidy sequential read under range partitioning becomes a scatter-gather across the whole cluster.`,
      ],
      callout: { kind: 'warn', text: 'Hashing destroys key ordering. Range queries can no longer target one partition — they must hit all N and merge, so scans get slower as the cluster grows.' },
      changes: ['+ point reads: 1 hop', '− range scans: fan out to all N', '~ ordering is lost on disk'],
      metrics: { partitions: 3, skew: 6, nodes2: 3, latency: 140 },
      scene: { view: 'range', note: 'A range scan must hit every partition — adjacent keys scattered everywhere.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Resizing',
      title: 'Add a node and almost everything moves',
      body: [
        `There is a second sting hiding in <code>mod N</code>. Grow the cluster from 3 nodes to 4 and the divisor changes, so <code>hash(key) mod 3</code> and <code>hash(key) mod 4</code> disagree for <b>most</b> keys at once.`,
        `The result is a near-total reshuffle: the system drags huge fractions of the dataset across the network just to add one machine. This exact pain is what motivates <span class="term">consistent hashing</span> and virtual nodes — resizing that moves only a small slice of the keyspace.`,
      ],
      callout: { kind: 'warn', text: 'Naive hash(key) mod N remaps almost every key when N changes, forcing a massive data shuffle on every resize. Consistent hashing exists to move only ~1/N of the keys instead.' },
      metrics: { partitions: 4, skew: 7, nodes2: 4, latency: 180 },
      scene: { view: 'resize', note: 'N: 3 → 4 reshuffles most keys — the motivation for consistent hashing.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Even load, fast points, costly ranges',
      body: [
        `Hash partitioning trades ordering for evenness. By placing rows at <code>hash(key) mod N</code> you get <b>uniform load</b> and <b>single-hop point lookups</b> regardless of how skewed the keys are — the default for key-value stores and caches.`,
        `The bill comes due on <b>range scans</b>, which must sweep every partition, and on <b>resizing</b>, which naively reshuffles the world. Choose hashing when access is by exact key; reach for range partitioning when you scan by order, and for consistent hashing when the cluster grows and shrinks.`,
      ],
      callout: { kind: 'insight', text: 'Hash partitioning = even load + one-hop point reads, paid for with scatter-gather range scans and expensive resizes. Match the scheme to how you actually query the data.' },
      metrics: { partitions: 3, skew: 6, nodes2: 3, latency: 24 },
      scene: { view: 'recap', note: 'Uniform scatter: great for keys, costly for ranges and resizes.' },
    },
  ],
};
