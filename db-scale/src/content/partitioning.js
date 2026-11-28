/* content/partitioning.js — the "Partitioning" lesson, as DATA. Same shape as
   content/dbms.js: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/partitioning-scene.js. */

export const partitioningLesson = {
  id: 'partitioning',
  title: 'Partitioning',
  group: 'Distributed Systems',
  summary: 'When one dataset no longer fits — or one machine can no longer keep up — split the keyspace across many nodes so capacity and write throughput grow with the cluster.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['partitions', 'nodes2', 'skew', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a single node becomes the hard ceiling', step: 0 },
    { text: 'Splitting the keyspace into disjoint partitions', step: 1 },
    { text: 'Routing a request to the one node that owns its key', step: 2 },
    { text: 'Skew: how one hot partition ruins the plan', step: 3 },
    { text: 'Range vs hash — the partitioning trade-off', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Too big',
      title: 'One node is the ceiling',
      body: [
        `Replication makes copies of the <em>whole</em> dataset — every node still holds all of it. That is wonderful for reads and durability, but it does nothing when the data simply <b>does not fit</b>, or when writes arrive faster than one machine can absorb.`,
        `A single node has a single disk, a single RAM budget and a single write path. Once you hit any of those limits, adding more read replicas cannot help — every write still lands on every copy. You need to stop storing everything in one place.`,
      ],
      callout: { kind: 'warn', text: 'Replication scales reads, not size or writes. One node’s disk, memory and write throughput are a hard wall that more copies cannot move.' },
      metrics: { partitions: 1, nodes2: 1, skew: 0, throughput: 40 },
      scene: { view: 'big', note: 'One node holding the entire dataset — disk, RAM and write path all maxed.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Split by key',
      title: 'Cut the keyspace into partitions',
      body: [
        `<span class="term">Partitioning</span> (also called sharding) splits the rows into <b>disjoint</b> groups called partitions, and puts each partition on a different node. Every row belongs to exactly one partition, chosen by a <span class="term">partition key</span> — by key range, or by a hash of the key.`,
        `Now the dataset is divided, not duplicated. Four nodes hold a quarter each; the whole thing is four times larger than any one machine could store, and writes to different partitions proceed in parallel.`,
      ],
      callout: { kind: 'insight', text: 'Partitioning divides the keyspace so each node owns a slice. Capacity and write throughput now grow with the number of nodes.' },
      changes: ['+ keyspace split 4 ways', '~ each node owns one slice', '+ writes run in parallel'],
      metrics: { partitions: 4, nodes2: 4, skew: 6, throughput: 150 },
      scene: { view: 'split', note: 'One keyspace a…z, cut into four disjoint partitions — one per node.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Routing',
      title: 'Send the key to its owner',
      body: [
        `Because partitions are disjoint, any key has exactly one home. A request for <code>get("paris")</code> is routed — by the same range or hash rule — straight to the single node that owns that slice of the keyspace.`,
        `No broadcast, no searching: three of the four nodes never even see the request. This is what makes partitioning scale — work spreads out instead of piling up.`,
      ],
      callout: { kind: 'tip', text: 'The routing rule is the partition key applied again: hash or range the key, and you know its owner without asking anyone.' },
      metrics: { partitions: 4, nodes2: 4, skew: 6, throughput: 220 },
      scene: { view: 'route', note: 'The key n–s lands on P2 alone; the other three partitions stay idle.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'Skew',
      title: 'When one partition runs hot',
      body: [
        `Partitioning assumes load spreads evenly — but real keys rarely do. A celebrity user, a trending product, a “today” timestamp: one value can draw a huge share of the traffic onto a single partition.`,
        `That node melts while the others idle. The cluster is only as fast as its <span class="term">hottest</span> partition, so <span class="term">skew</span> quietly throws away most of the capacity you added.`,
      ],
      callout: { kind: 'warn', text: 'A hot key makes one partition the new bottleneck. Even load is the whole point of partitioning — and the hardest part to guarantee.' },
      metrics: { partitions: 4, nodes2: 4, skew: 68, throughput: 90 },
      scene: { view: 'skew', note: 'One celebrity key drives 70% of traffic onto a single partition; the rest sit idle.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Range vs hash',
      title: 'Range keeps order; hash spreads load',
      body: [
        `The partition key decides everything. <b>Range</b> partitioning keeps keys sorted, so range scans (“all orders in March”) touch just a few nodes — but adjacent keys cluster together, so a hot range overloads one partition.`,
        `<b>Hash</b> partitioning scatters keys evenly, killing hot spots — but it destroys order, so a range scan must fan out to every node. There is no free choice: you trade scannability against even load.`,
      ],
      callout: { kind: 'insight', text: 'Range = sorted, scan-friendly, skew-prone. Hash = even, skew-resistant, scan-hostile. Pick for your dominant access pattern.' },
      metrics: { partitions: 4, nodes2: 4, skew: 10, throughput: 240 },
      scene: { view: 'tradeoff', note: 'Range partitioning vs hash partitioning — order and scans against even load.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Divide the keyspace to scale',
      body: [
        `Partitioning turns one dataset into many disjoint slices, so storage and write throughput scale horizontally instead of hitting one machine’s ceiling. Requests route to a single owner, and nodes work in parallel.`,
        `The whole bet rides on the partition key: a good one spreads load evenly; a bad one re-creates the single-node bottleneck as a single hot partition. Partition for size and writes, replicate for durability and reads — real systems do both.`,
      ],
      callout: { kind: 'insight', text: 'Partition to scale capacity and writes; replicate to survive failures and scale reads. The partition key is the decision that makes or breaks it.' },
      metrics: { partitions: 4, nodes2: 4, skew: 8, throughput: 240 },
      scene: { view: 'recap', note: 'Divide the keyspace, route by owner, watch for skew — partitioning in one picture.' },
    },
  ],
};
