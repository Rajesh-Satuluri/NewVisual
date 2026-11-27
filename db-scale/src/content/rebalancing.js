/* content/rebalancing.js — the "Rebalancing" lesson, as DATA. Same shape as the
   other db-scale lessons: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/rebalancing-scene.js. */

export const rebalancingLesson = {
  id: 'rebalancing',
  title: 'Rebalancing',
  group: 'Distributed Systems',
  summary: 'How a cluster keeps load even as it grows, shrinks, or skews — by moving as little data as possible between nodes instead of reshuffling everything.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'keyspace', 'skew', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why clusters drift out of balance', step: 0 },
    { text: 'The goal: minimal data movement', step: 1 },
    { text: 'Many fixed partitions make moves cheap', step: 2 },
    { text: 'Split and merge partitions as data grows', step: 3 },
    { text: 'Why rebalancing is throttled, not instant', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Drift',
      title: 'Clusters do not stay balanced',
      body: [
        `A cluster starts with data spread evenly across its nodes. Then reality intrudes: you <b>add a node</b> to handle growth, a node <b>crashes</b> and its share must go somewhere, or one partition quietly grows <span class="term">hot</span> while others stay cold.`,
        `Any of these leaves the load <span class="term">skewed</span> — a few nodes sweat while the rest idle. The whole point of a distributed store was to share the work, and skew quietly throws that away.`,
      ],
      callout: { kind: 'warn', text: 'Adding a node, losing a node, or uneven key popularity all tilt the cluster. Left alone, a skewed cluster wastes most of its capacity.' },
      metrics: { nodes2: 3, keyspace: 0, skew: 48, availability: 100 },
      scene: { view: 'drift', note: 'Three nodes, wildly uneven stacks — the load has drifted out of balance.' },
    },
    { // 1 — PROBLEM (naive fix is worse)
      chapter: 'problem', short: 'mod N',
      title: 'The naive fix reshuffles everything',
      body: [
        `The obvious scheme is <code>node = hash(key) mod N</code>. It spreads keys evenly — until <b>N changes</b>. Go from 3 nodes to 4 and the modulus changes for <em>almost every key</em>, so nearly the entire dataset has to move at once.`,
        `That is a storm of network traffic and disk writes for what should have been a small change. Balancing by re-hashing the world is a cure worse than the disease.`,
      ],
      callout: { kind: 'warn', text: 'With hash-mod-N, changing N remaps almost all keys — adding one node can move ~100% of the data. Rebalancing must not depend on N this way.' },
      changes: ['+ 1 node joins (N: 3 → 4)', '~ modulus changes for nearly every key', '− ~100% of keys must move'],
      metrics: { nodes2: 4, keyspace: 92, skew: 40, availability: 100 },
      scene: { view: 'naive', note: 'One node joins, and mod-N forces almost the whole keyspace to migrate.' },
    },
    { // 2 — SOLUTION
      chapter: 'solution', short: 'Minimal move',
      title: 'Move only what you must',
      body: [
        `Good rebalancing has one rule: <b>restore balance by moving the least data possible</b>. When a node joins a cluster of N, each existing node should give up only about <code>1/(N+1)</code> of its keys — just enough to fill the newcomer.`,
        `The trick is a layer of <span class="term">partitions</span> between keys and nodes. Keys map to a fixed partition; partitions map to nodes. Rebalancing then <em>reassigns whole partitions</em> without touching which key lives in which partition.`,
      ],
      callout: { kind: 'insight', text: 'Put a stable partition layer between keys and nodes. To rebalance you reassign partitions, not keys — so adding a node moves only ~1/N of the data.' },
      changes: ['+ partition layer: key → partition → node', '~ reassign partitions, never remap keys', '− only ~1/N of data moves'],
      metrics: { nodes2: 4, keyspace: 25, skew: 8, availability: 100 },
      scene: { view: 'minimal', note: 'A new node pulls one partition from each peer — about a quarter of the data, no more.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Fixed vs dynamic',
      title: 'Fixed partitions, or split on growth',
      body: [
        `Two schemes dominate. <b>Fixed partitioning</b> carves the keyspace into many more partitions than nodes — say 256 partitions on 4 nodes. Each node holds a bundle of partitions; to rebalance you just hand a few whole partitions to the new node.`,
        `<b>Dynamic partitioning</b> instead <span class="term">splits</span> a partition in two once it grows past a size threshold, and <span class="term">merges</span> small ones — so the number of partitions tracks the data volume. Either way, consistent-hashing with virtual nodes achieves the same minimal-movement effect.`,
      ],
      callout: { kind: 'tip', text: 'Fixed: many small partitions, reassign in bundles. Dynamic: split/merge partitions by size. Both move whole partitions, keeping data movement proportional to the change.' },
      metrics: { nodes2: 4, keyspace: 25, skew: 6, availability: 100 },
      scene: { view: 'schemes', note: 'Many fixed partitions reassigned in bundles — or split and merged as data grows.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Throttle it',
      title: 'Rebalancing competes with live traffic',
      body: [
        `Moving partitions is not free: it floods the network and hammers disks on both the source and destination nodes — <em>at the same time those nodes are serving real queries</em>. Rebalance too aggressively and you can tip a busy cluster into overload.`,
        `So production systems rebalance <b>gradually and throttled</b>, a few partitions at a time, and many keep a <span class="term">human in the loop</span> to approve big moves. Fully automatic rebalancing can cascade: a move adds load, which trips a failure detector, which triggers another move.`,
      ],
      callout: { kind: 'warn', text: 'Rebalancing steals network and I/O from live traffic. Throttle it and often gate it on a human — automatic rebalancing under load can cascade into more rebalancing.' },
      changes: ['+ throttle: a few partitions at a time', '+ optional human approval for large moves', '~ data stays available throughout'],
      metrics: { nodes2: 4, keyspace: 25, skew: 5, availability: 99 },
      scene: { view: 'throttle', note: 'Partitions trickle across while queries keep flowing — movement paced against live load.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Even load, minimal movement, no downtime',
      body: [
        `Rebalancing keeps a cluster's work evenly shared as it grows, shrinks, and skews. The winning idea is indirection: a stable partition layer lets you move <em>whole partitions</em> instead of re-hashing every key, so a change touches only ~1/N of the data.`,
        `Do it gradually, keep serving traffic throughout, and — for the big moves — let a human say go. Even load, minimal movement, and no downtime: that is a cluster that scales without flinching.`,
      ],
      callout: { kind: 'insight', text: 'Partitions decouple keys from nodes, so rebalancing moves ~1/N of the data, gradually and online. Even load without a full reshuffle is the whole game.' },
      metrics: { nodes2: 4, keyspace: 25, skew: 5, availability: 100 },
      scene: { view: 'recap', note: 'Balanced stacks across every node — achieved by moving as little as possible.' },
    },
  ],
};
