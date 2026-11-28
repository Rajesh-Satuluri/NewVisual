/* content/hot-key-handling.js — "Hot Keys & Write Sharding", the classic
   distributed-data failure, as DATA. Its scene lives on the NoSQL canvas:
   partition buckets where one bin goes hot while the others sit idle, then a
   single logical key fanned across N physical shards to spread the load. */

export const hotKeyHandlingLesson = {
  id: 'hot-key-handling',
  title: 'Hot Keys & Write Sharding',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A distributed store only scales when load spreads evenly across partitions; when one partition key draws a disproportionate share of traffic it becomes a hot partition that bottlenecks the whole cluster. Write sharding salts the key across N physical partitions to flatten the skew — at the cost of a scatter-gather read.',
  minutes: 8,
  level: 'advanced',
  metrics: ['skew', 'partitions', 'throughput', 'requests'],
  legend: [],
  goals: [
    { text: 'Capacity scales only when traffic spreads evenly across every partition', step: 0 },
    { text: 'One over-popular key makes a hot partition while the rest sit idle', step: 1 },
    { text: 'Celebrity keys, monotonic keys and low-cardinality flags all cause skew', step: 2 },
    { text: 'Write sharding salts one logical key across N physical partitions', step: 3 },
    { text: 'The cost: reads now scatter-gather across every shard of the key', step: 4 },
    { text: 'Pick high-cardinality, non-monotonic keys; salt or hash the rest', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'Even spread is the goal',
      title: 'Capacity lives in even distribution',
      body: [
        `A distributed store earns its scale by splitting data across many <span class="term">partitions</span>, each on its own node with its own slice of throughput. The access pattern is <code>write(key)</code> and <code>read(key)</code>, routed by a <b>hash of the partition key</b> to one partition. When the keys are varied, the hash scatters writes evenly, and the cluster's total capacity is the <em>sum</em> of every partition's capacity.`,
        `This is the whole premise: ten partitions at 1,000 writes/sec each give you 10,000 writes/sec — but <b>only if every partition carries roughly the same load</b>. The partition key is not just an address; it is the <b>unit of load balancing</b>, and a healthy key choice keeps the bars level.`,
      ],
      callout: { kind: 'insight', text: 'The partition key is the unit of load balancing. Capacity is the sum of partitions only when load is spread evenly across them.' },
      metrics: { skew: 1.0, partitions: 4, throughput: 4000, requests: 4000 },
      scene: { view: 'even', note: 'Four partitions carrying roughly equal load — the cluster\'s capacity is the sum of all four.' },
    },
    { // 1 PROBLEM (hot partition)
      chapter: 'problem', short: 'One key goes hot',
      title: 'One key goes hot, the rest go idle',
      body: [
        `Now the traffic <b>skews</b>. A single partition key — say <code>celebrity#1</code> or the flag <code>status=active</code> — starts drawing a disproportionate share of every request. Because the hash sends that one key to <b>one partition</b>, every request for it piles onto a single node. That node saturates, throttles, and starts rejecting writes while <em>its neighbours sit nearly idle</em>.`,
        `This is the <span class="term">hot partition</span> (or <b>hot key</b>) failure. The cluster might be provisioned for 10,000 writes/sec, but the hot partition caps at its own ~1,000 — so the effective ceiling collapses to one node's worth. You have ten machines and the throughput of one. Capacity is wasted because load is <b>skewed onto a single partition</b>.`,
      ],
      callout: { kind: 'warn', text: 'A hot partition caps the whole cluster at one node\'s throughput. The idle partitions cannot help — the hash sends every hot-key request to the same place.' },
      changes: ['! all celebrity#1 traffic lands on one partition', '~ that node saturates while others stay idle'],
      metrics: { skew: 8.0, partitions: 4, throughput: 1200, requests: 4000 },
      scene: { view: 'hotspot', note: 'One partition saturated with the celebrity key while the other three sit idle — the cluster is capped at one node.' },
    },
    { // 2 PROBLEM (causes)
      chapter: 'problem', short: 'What makes a key hot',
      title: 'Three ways a key turns hot',
      body: [
        `Hot keys are not random — they come from predictable key-design mistakes. <b>Celebrity / popularity skew</b>: a value that is genuinely more popular than the rest (a trending product, a viral user, one huge tenant) concentrates reads and writes on its partition. <b>Low cardinality</b>: a key like <code>status</code> or <code>country=US</code> has only a handful of distinct values, so only a handful of partitions ever get used — most of the keyspace is dead.`,
        `<b>Monotonic / sequential keys</b> are the subtlest: an auto-increment id or a <code>timestamp</code> partition key always sorts to the <em>end</em>, so every new write targets the <b>newest partition</b> while older ones go cold. The write frontier is always a single hot partition that moves over time. All three share one root cause: the key does not <b>spread</b> traffic.`,
      ],
      callout: { kind: 'tip', text: 'Monotonic keys are the trap: a sequential id or raw timestamp always writes to the newest partition, so the hot spot follows the write frontier.' },
      changes: ['! celebrity value → popularity skew', '! low-cardinality flag → few partitions used', '! monotonic key → writes chase the newest partition'],
      metrics: { skew: 8.0, partitions: 4, throughput: 1200, requests: 4000 },
      scene: { view: 'causes', note: 'The three classic causes of a hot key: a celebrity value, a low-cardinality flag and a monotonic/sequential partition key.' },
    },
    { // 3 TECHNIQUE (write sharding)
      chapter: 'technique', short: 'Salt the key',
      title: 'Write sharding splits one key into N',
      body: [
        `The fix is <span class="term">write sharding</span>, also called key salting: take the one logical key and append a <b>shard suffix</b> so it becomes N physical keys. <code>PROD#A1</code> becomes <code>PROD#A1#0</code>, <code>PROD#A1#1</code> … <code>PROD#A1#N</code>. Each write picks a suffix (round-robin, random, or <code>hash(itemId) % N</code>), so the hash now scatters what used to be one hot key across <b>N different partitions</b>.`,
        `The skew flattens: with N shards the hot key's load is divided by N, and each physical partition carries its fair share again. For a monotonic key the same idea appears as <b>hashing or reversing</b> the key — a reversed sequential id (<code>1001 → 1001reversed</code>) no longer clusters at the write frontier. You have deliberately traded one tidy key for N spread ones.`,
      ],
      callout: { kind: 'insight', text: 'Salting divides a hot key\'s load by N: PROD#A1#0..N-1 hash to N partitions, so one celebrity key now rides N nodes instead of one.' },
      changes: ['+ append shard suffix: PROD#A1#0 .. PROD#A1#N', '~ write picks suffix via hash(itemId) % N', '+ skew divided by N across N partitions'],
      metrics: { skew: 1.5, partitions: 4, throughput: 3800, requests: 4000 },
      scene: { view: 'shard', note: 'One logical key PROD#A1 salted into N shards that fan out across every partition — the load is divided by N.' },
    },
    { // 4 TRADEOFF (read fan-out)
      chapter: 'tradeoff', short: 'Reads fan out',
      title: 'The price: reads now scatter-gather',
      body: [
        `Sharding is not free. The write spread you gained comes straight out of the <b>read</b> path. To read everything under the logical key <code>PROD#A1</code>, the app can no longer do one lookup — it must query <b>all N shards</b> (<code>PROD#A1#0 … #N-1</code>) and <b>merge</b> the results. One O(1) read became N reads plus a gather, the <span class="term">scatter-gather</span> pattern.`,
        `So N is a tuning dial, not a free win: too small and the key is still warm; too large and every read fans out across more partitions than it needs to. Shard only the keys that are actually hot, size N to the hottest key's load, and remember that <b>single-item reads by id are unaffected</b> — only reads of the <em>whole</em> logical key pay the fan-out tax.`,
      ],
      callout: { kind: 'warn', text: 'Spreading writes scatters reads: reading the whole key means querying all N shards and merging. Shard only the hot keys, and size N deliberately.' },
      changes: ['! read the logical key → query all N shards + merge', '~ N is a tradeoff: write spread vs read fan-out'],
      metrics: { skew: 1.5, partitions: 4, throughput: 3800, requests: 4000 },
      scene: { view: 'readfanout', note: 'Reading the whole logical key now fans out across every shard and gathers the results — the cost of write sharding.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Spread the load',
      title: 'Choose keys that spread by design',
      body: [
        `Hot partitions are a key-design problem, not a capacity problem — adding nodes never helps when the hash sends everything to one. Start by choosing a <b>high-cardinality, non-monotonic</b> partition key so traffic spreads naturally; never partition on a boolean flag, a low-cardinality enum, or a raw sequential id or timestamp.`,
        `When a key is unavoidably hot, apply <span class="term">write sharding</span>: salt it into N shards to divide the load, hash or reverse monotonic keys so writes stop chasing the newest partition, and accept the scatter-gather on reads of the whole key. The goal never changes — keep every partition's bar level so the cluster's capacity is the sum of its nodes, not the ceiling of one.`,
      ],
      callout: { kind: 'insight', text: 'High-cardinality, non-monotonic keys spread load for free; salt the few that stay hot and pay the read fan-out. Level bars = full capacity.' },
      metrics: { skew: 1.2, partitions: 4, throughput: 3900, requests: 4000 },
      scene: { view: 'recap', note: 'The salted key spread across every partition, bars level again — capacity restored to the sum of all nodes.' },
    },
  ],
};
