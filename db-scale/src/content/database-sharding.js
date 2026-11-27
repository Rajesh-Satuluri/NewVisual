/* content/database-sharding.js — the "Database Sharding" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/database-sharding-scene.js. Rendered through the shared course shell. */

export const databaseShardingLesson = {
  id: 'database-sharding',
  title: 'Database Sharding',
  group: 'Distributed Systems',
  summary: 'When one database can no longer hold or serve all the data, split the rows across many independent databases — and teach the app how to find them.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['shards', 'nodes2', 'throughput', 'skew'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why scaling one machine up eventually hits a wall', step: 0 },
    { text: 'Splitting rows across independent databases by a shard key', step: 1 },
    { text: 'A router that sends each query to the shard that owns it', step: 2 },
    { text: 'Why cross-shard queries are the expensive case', step: 3 },
    { text: 'Hot shards from a skewed key — and resharding', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Scale-up wall',
      title: 'One database, one machine, one ceiling',
      body: [
        `For a long time the fix for a growing database is a <span class="term">bigger box</span> — more cores, more RAM, faster disks. It works, until it doesn't: the largest machine money can buy is finite, and the last doublings cost far more than the first.`,
        `A single server also remains a single point of failure, and its write throughput is capped by one set of CPUs and one disk subsystem. <b>Scaling up</b> buys time, not a future.`,
      ],
      callout: { kind: 'warn', text: 'Vertical scaling has a hard ceiling: cost grows faster than capacity, and one machine is still one machine. Past a point you must scale OUT.' },
      metrics: { shards: 1, nodes2: 1, throughput: 40, skew: 0 },
      scene: { view: 'vertical', note: 'One maxed-out database — nowhere left to grow but out.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Shard the rows',
      title: 'Split the rows across independent databases',
      body: [
        `<span class="term">Sharding</span> is horizontal partitioning taken all the way: the table's rows are divided across several <em>independent</em> database instances — each shard is a complete database holding only its slice of the data.`,
        `A <span class="term">shard key</span> (say <code>user_id</code>) decides which shard a row lives on. Four shards hold a quarter of the rows each, serve a quarter of the traffic each, and fail independently. Capacity now grows by <b>adding machines</b>.`,
      ],
      callout: { kind: 'insight', text: 'A shard is a full, standalone database — not a slice managed by one engine. Sharding scales writes and storage by spreading rows across many of them.' },
      changes: ['+ rows split by shard key', '+ 4 independent databases', '~ each owns 1/N of the data'],
      metrics: { shards: 4, nodes2: 4, throughput: 150, skew: 4 },
      scene: { view: 'shard', note: 'Rows split by shard key across four independent databases.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Shard router',
      title: 'A router sends each query to its shard',
      body: [
        `Apps shouldn't know which machine holds which row. A <span class="term">routing layer</span> — a shard map or directory — hashes the shard key of each request and forwards it to the one shard that owns that key.`,
        `To the application it still looks like a single logical database: it sends a query for <code>user_id = 8143</code>, the router computes the shard, and the answer comes back. One lookup, one shard, one hop.`,
      ],
      callout: { kind: 'tip', text: 'The router turns a shard key into a destination. Keep the key on the query and most requests touch exactly one shard.' },
      changes: ['+ shard router / directory', '~ key → shard lookup', '+ one logical database'],
      metrics: { shards: 4, nodes2: 5, throughput: 220, skew: 4 },
      scene: { view: 'route', note: 'The router hashes the shard key and hits exactly one shard.' },
    },
    { // 3 — TRADE-OFF
      chapter: 'tradeoff', short: 'Cross-shard',
      title: 'The query that spans every shard',
      body: [
        `Single-shard queries fly. The expensive case is a query that <em>can't</em> name one shard — a report across all users, or a <code>JOIN</code> on a non-shard column. The router must <span class="term">scatter</span> it to every shard and <span class="term">gather</span> the partial results back, then merge them.`,
        `That scatter-gather is as slow as the slowest shard, and cross-shard transactions need distributed commit. The art of sharding is choosing a key that keeps the common queries on <b>one</b> shard.`,
      ],
      callout: { kind: 'warn', text: 'Cross-shard queries fan out to every node and merge — N times the work, bounded by the slowest shard. A good shard key makes them rare.' },
      metrics: { shards: 4, nodes2: 5, throughput: 90, skew: 6 },
      scene: { view: 'crossshard', note: 'No single owner → scatter to all shards, then gather and merge.' },
    },
    { // 4 — PROBLEM
      chapter: 'problem', short: 'Hot shard',
      title: 'A skewed key overloads one shard',
      body: [
        `Sharding only balances load if the key spreads it evenly. A key with hot values — a celebrity account, a default tenant, "today" — pours a disproportionate share of traffic onto <b>one</b> shard while the others idle.`,
        `That hot shard becomes the new bottleneck, and the fix is painful: <span class="term">resharding</span> — splitting the shard or moving ranges to rebalance, often while live. Choosing the shard key well up front is worth a great deal.`,
      ],
      callout: { kind: 'warn', text: 'A skewed shard key recreates the single-machine bottleneck on one shard. Watch load skew; rebalancing a live system is costly.' },
      metrics: { shards: 4, nodes2: 5, throughput: 120, skew: 61 },
      scene: { view: 'hotspot', note: 'One shard red-hot, the rest idle — the shard key is skewed.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Horizontal scale, paid for in coordination',
      body: [
        `Sharding scales a database <b>out</b>: rows split by a shard key across independent instances, a router that hides them behind one logical endpoint, and capacity that grows by adding machines rather than buying a bigger one.`,
        `The bill comes as coordination — cross-shard queries, distributed transactions, and the constant care of a shard key that keeps load even. Spend it only when one machine truly can't keep up.`,
      ],
      callout: { kind: 'insight', text: 'Shard key + router = one logical DB over many real ones. You gain horizontal scale; you pay in cross-shard queries and rebalancing.' },
      metrics: { shards: 4, nodes2: 5, throughput: 240, skew: 6 },
      scene: { view: 'recap', note: 'One logical database, many independent shards behind a router.' },
    },
  ],
};
