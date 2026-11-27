/* content/partitioning-lab.js — the "Partitioning Lab" interactive lesson, as
   DATA. Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/partitioning-lab-scene.js.

   A hands-on lab: split one key space across nodes, spread keys evenly with
   hashing, suffer a hot partition, feel a naive add-a-node rebalance, then
   tame it with consistent hashing and virtual nodes. */

export const partitioningLabLesson = {
  id: 'partitioning-lab',
  title: 'Partitioning Lab',
  group: 'Interactive Labs',
  summary: 'Split a key space across nodes: spread it with hash partitioning, overload one node with a hot key, watch a naive modulo rebalance move almost everything, then confine the churn with a consistent-hashing ring and virtual nodes.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['shards', 'skew', 'keyspace', 'hops'],
  legend: ['read', 'write'],
  goals: [
    { text: 'See why one node holding all keys is a bottleneck', step: 0 },
    { text: 'Spread keys evenly with hash(key) % N', step: 1 },
    { text: 'Watch a skewed hot key overload one partition', step: 2 },
    { text: 'Feel a naive modulo rebalance move almost every key', step: 3 },
    { text: 'Confine churn with consistent hashing + virtual nodes', step: 4 },
  ],

  steps: [
    { // 0 — SETUP / the bottleneck
      chapter: 'setup', short: 'One node',
      title: 'One node holds every key',
      body: [
        `Our whole <span class="term">key space</span> lives on a single node. Every read and every write for every key lands there. It is simple — there is only one place to look.`,
        `But one machine caps your throughput and your storage. Double the traffic and it falls over; the data outgrows its disk and you are stuck. To scale out we must <span class="term">partition</span> (shard) the key space across many nodes so each owns a slice.`,
      ],
      callout: { kind: 'tip', text: 'Partitioning splits one key space into independent shards on separate nodes, so capacity grows with machines. The question is only how to assign each key to a partition.' },
      metrics: { shards: 1, skew: 100, keyspace: 0, hops: 1 },
      scene: { view: 'setup', note: 'A single node owns the entire key space — a throughput and storage bottleneck.' },
    },
    { // 1 — SOLUTION / hash partitioning
      chapter: 'solution', short: 'Hash',
      title: 'Spread with hash(key) % N',
      body: [
        `Assign each key by a <span class="term">hash function</span>: compute <code>hash(key) % 3</code> and send the key to that partition. A good hash scatters keys uniformly, so three nodes each get roughly a third — no matter what the keys look like.`,
        `To find a key, a client hashes it and goes straight to the one owning node — a single <span class="term">hop</span>, no scan. Range partitioning (by key order) is the alternative: great for range scans, but it clumps sequential keys and is prone to hot ranges.`,
      ],
      callout: { kind: 'insight', text: 'Hash partitioning distributes keys evenly and gives O(1) point lookups. Range partitioning keeps keys sorted for scans but risks hotspots on sequential inserts.' },
      changes: ['+ 2 more nodes (3 shards)', 'key → hash(key) % 3', '✓ ~even load, 1-hop lookups'],
      metrics: { shards: 3, skew: 8, keyspace: 100, hops: 1 },
      scene: { view: 'hashpart', note: 'hash(key) % 3 scatters keys evenly across three partitions; lookups are one hop.' },
    },
    { // 2 — PROBLEM / hot partition
      chapter: 'problem', short: 'Hot key',
      title: 'A hot key overloads one shard',
      body: [
        `Even load assumes even <em>access</em>. Suppose one key is a celebrity account read millions of times a second. Hashing still puts every request for that key on <b>one</b> partition — and that node melts while the others idle.`,
        `This is a <span class="term">hot partition</span> (skew). The hash spread the <em>keys</em> evenly, but not the <em>traffic</em>. A single key cannot be split by hashing alone; you need to detect it and handle it specially — split the key, add a random suffix, or cache it.`,
      ],
      callout: { kind: 'warn', text: 'Hashing balances key counts, not request volume. One very hot key lands on one partition and overloads it — skew the hash can’t fix on its own.' },
      changes: ['one key = 90% of traffic', '✗ its partition saturates', 'others sit nearly idle'],
      metrics: { shards: 3, skew: 86, keyspace: 100, hops: 1 },
      scene: { view: 'hotpart', note: 'A skewed hot key routes all its traffic to one partition while the rest idle.' },
    },
    { // 3 — TRADEOFF / naive rebalance
      chapter: 'tradeoff', short: 'Rebalance',
      title: 'Add a node, move everything',
      body: [
        `Growth means adding capacity. Add a fourth node and keep the simple scheme: now keys map by <code>hash(key) % 4</code> instead of <code>% 3</code>. The modulus changed, so <b>almost every key</b> gets a new partition and has to move.`,
        `A rebalance that relocates nearly the whole data set saturates the network and disks for hours and can take the cluster down under its own migration. Plain modulo partitioning is cheap until you resize — then it is catastrophic.`,
      ],
      callout: { kind: 'warn', text: 'With hash % N, changing N remaps almost all keys. Adding one node forces a near-total data movement — the fatal flaw of naive modulo partitioning.' },
      changes: ['+ 4th node → hash % 4', '✗ ~3/4 of keys change owner', 'massive migration, cluster strain'],
      metrics: { shards: 4, skew: 8, keyspace: 75, hops: 1 },
      scene: { view: 'rebalance', note: 'Naive modulo: adding a 4th node remaps almost every key — a huge migration.' },
    },
    { // 4 — TECHNIQUE / consistent hashing
      chapter: 'technique', short: 'Ring',
      title: 'Consistent hashing + virtual nodes',
      body: [
        `Map both keys and nodes onto a <span class="term">hash ring</span>. A key belongs to the first node clockwise from its position. Add a node and it only steals the arc between itself and its predecessor — so just <b>~1/N</b> of keys move, not all of them.`,
        `To keep the arcs even, give each physical node many <span class="term">virtual nodes</span> sprinkled around the ring. Load balances finely, and when a node joins or leaves, its keys spread across all the others instead of dumping on one neighbour. This is how real sharded systems resize gracefully.`,
      ],
      callout: { kind: 'tip', text: 'Consistent hashing moves only ~1/N keys when the cluster resizes; virtual nodes even out the arcs and spread a departing node’s load across the whole ring.' },
      changes: ['keys + nodes on a hash ring', '+ node steals one arc only', '✓ ~1/N keys move, vnodes balance'],
      metrics: { shards: 4, skew: 6, keyspace: 25, hops: 1 },
      scene: { view: 'consistent', note: 'A consistent-hashing ring with virtual nodes moves only ~1/N keys on resize.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What the lab proved',
      body: [
        `Partitioning turns one bottlenecked node into a cluster that scales with machines. <b>Hash</b> partitioning spreads keys evenly with 1-hop lookups; <b>range</b> partitioning keeps them sorted for scans at the risk of hotspots.`,
        `Even hashing can’t balance a <b>hot key</b>, and naive <code>% N</code> relocates almost everything when you resize. <b>Consistent hashing with virtual nodes</b> fixes the resize: only ~1/N of the key space moves, spread across the whole cluster.`,
      ],
      callout: { kind: 'insight', text: 'Shard to scale → hash for spread → watch for hot keys → resize with consistent hashing + vnodes so only ~1/N of keys ever move.' },
      metrics: { shards: 4, skew: 6, keyspace: 25, hops: 1 },
      scene: { view: 'recap', note: 'Partition to scale; consistent hashing keeps resizing cheap and balanced.' },
    },
  ],
};
