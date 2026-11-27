/* content/partitioning-strategies.js — the "Partitioning Strategies" lesson, as
   DATA (DDIA ch.6 survey). Same shape as every other db-scale lesson: each step
   is { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/partitioning-strategies-scene.js. */

export const partitioningStrategiesLesson = {
  id: 'partitioning-strategies',
  title: 'Partitioning Strategies',
  group: 'Data-Intensive (DDIA)',
  summary: 'Splitting a dataset across nodes is only half the job — you also have to find the data again. A survey of range vs hash keys, local vs global secondary indexes, and how requests get routed.',
  minutes: 9,
  level: 'advanced',
  metrics: ['partitions', 'skew', 'shards', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one node can’t hold or serve it all', step: 0 },
    { text: 'Partition by key: range vs hash', step: 1 },
    { text: 'Local index: cheap write, scatter/gather read', step: 2 },
    { text: 'Global index: one-partition read, remote write', step: 3 },
    { text: 'Routing: how a request finds its partition', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Too big',
      title: 'One node can’t hold — or serve — it all',
      body: [
        `Your dataset outgrows a single machine: too many rows for its disk, too many requests for its CPU. The only way out is to <span class="term">partition</span> it — cut the data into pieces and spread them over many nodes so storage and load divide.`,
        `But the moment you split, three hard questions appear. How do you decide <b>which</b> partition a key lives on? How do you answer a query on a <b>secondary</b> field that isn’t the partition key? And how does a client even <b>find</b> the partition it needs? Get these wrong and you trade one slow node for a cluster of hotspots and scatter-gather fan-outs.`,
      ],
      callout: { kind: 'warn', text: 'Partitioning is never just “split the data.” You also inherit routing, secondary-index placement and rebalancing — the split is the easy part.' },
      metrics: { partitions: 1, skew: 0, shards: 1, latency: 180 },
      scene: { view: 'problem', note: 'One overloaded node: out of disk, out of CPU — it must be split.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'By key',
      title: 'Partition by the primary key',
      body: [
        `The foundation is to assign each record to a partition by its <span class="term">primary key</span>. Two survey-level strategies dominate. <b>Range</b> partitioning keeps keys sorted into contiguous ranges (A–F, G–M, …) — great for range scans, but a popular range becomes a <span class="term">hotspot</span>. <b>Hash</b> partitioning sends <code>hash(key)</code> to a partition — load spreads evenly, but adjacent keys scatter, so range scans die.`,
        `Either way, a lookup by primary key is now a one-partition hop: compute the range or the hash, go straight to the owner.`,
      ],
      callout: { kind: 'insight', text: 'Range keeps order (good scans, risk of hotspots); hash spreads load (even, but no efficient scans). Primary-key lookups stay single-partition in both.' },
      changes: ['+ split into N partitions by key', '~ range → sorted, scan-friendly', '~ hash → uniform, scan-hostile'],
      metrics: { partitions: 4, skew: 8, shards: 4, latency: 40 },
      scene: { view: 'bykey', note: 'Range (sorted bands) vs hash (uniform spread) — two ways to place a key.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Local index',
      title: 'Local secondary index: scatter / gather',
      body: [
        `Primary-key lookups are solved — but what about a query like “all cars that are <span class="term">red</span>”? Colour isn’t the partition key. The simplest answer is a <span class="term">local</span> (document-partitioned) secondary index: each partition indexes only <b>its own</b> rows.`,
        `Writes are cheap — a new red car updates just one local index, on the partition that already holds it. But a read must <b>ask every partition</b> (“any red cars?”) and merge the answers — a <span class="term">scatter/gather</span> that gets slower with every partition you add.`,
      ],
      callout: { kind: 'tip', text: 'Local (document-partitioned) index: write touches one partition, but a secondary-key read scatters to all of them and gathers the results.' },
      changes: ['+ each partition indexes its own docs', '✓ writes stay local', '− reads fan out to every partition'],
      metrics: { partitions: 4, skew: 10, shards: 4, latency: 95 },
      scene: { view: 'local', note: 'A secondary-key read must scatter to all four partitions, then gather.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Global index',
      title: 'Global secondary index: one read, remote writes',
      body: [
        `Flip the trade. A <span class="term">global</span> (term-partitioned) index partitions the <b>index itself</b> by the secondary term: all “colour = red” entries live on one index partition, “colour = blue” on another — independent of where the rows are stored.`,
        `Now a secondary-key read hits <b>one</b> index partition — fast and focused. But a single write can touch <b>several</b> index partitions on remote nodes (its colour entry here, its make entry there), so writes become distributed and are usually updated <span class="term">asynchronously</span>.`,
      ],
      callout: { kind: 'insight', text: 'Global (term-partitioned) index: reads hit one partition, but writes fan out to remote index partitions — often updated asynchronously, so the index lags.' },
      changes: ['+ index partitioned by term, not by doc', '✓ reads hit one index partition', '− writes update remote index partitions'],
      metrics: { partitions: 4, skew: 6, shards: 4, latency: 55 },
      scene: { view: 'global', note: 'All “red” terms sit on one index partition — the read goes straight there.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Routing',
      title: 'Routing — and the cost you can’t avoid',
      body: [
        `One question remains: a client holds a key — which node owns it? This is <span class="term">request routing</span>, and there are three shapes: a dedicated <b>routing tier</b> (a proxy that knows the map), a <b>partition-aware client</b> (the client holds the map), or <b>gossip</b> (any node can forward to the right owner).`,
        `All of it rests on one unavoidable cost. Data grows, nodes join and leave, so partitions must be <span class="term">rebalanced</span> — and every choice above shifts the bill. Local index favours write-heavy workloads; global favours read-heavy; range favours scans; hash favours even load. There is no free partitioning.`,
      ],
      callout: { kind: 'warn', text: 'Routing (proxy, smart client, or gossip) plus rebalancing is the running cost of every partitioned system. Pick the scheme whose cheap side matches your workload.' },
      metrics: { partitions: 4, skew: 5, shards: 4, latency: 35 },
      scene: { view: 'routing', note: 'A routing tier maps each key to its owning partition, then forwards.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Split, index, route, rebalance',
      body: [
        `Partitioning a dataset is four decisions, not one. <b>Split</b> by range (sorted, scan-friendly) or hash (even, scan-hostile). <b>Index</b> secondary fields locally (cheap writes, scatter reads) or globally (focused reads, remote writes). <b>Route</b> requests through a tier, a smart client, or gossip. And <b>rebalance</b> as the cluster changes.`,
        `Every lever trades a cheap operation for an expensive one. The art is lining up the cheap side with the queries you actually run — which is exactly what the rest of the Data-Intensive chapters build on.`,
      ],
      callout: { kind: 'insight', text: 'Partitioning = split + index + route + rebalance. Each choice makes one access pattern cheap and another dear — match the cheap side to your workload.' },
      metrics: { partitions: 4, skew: 6, shards: 4, latency: 38 },
      scene: { view: 'recap', note: 'Four decisions behind every partitioned store — split, index, route, rebalance.' },
    },
  ],
};
