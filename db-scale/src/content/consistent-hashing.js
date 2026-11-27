/* content/consistent-hashing.js — the "Consistent Hashing" lesson, as DATA.
   Same shape as content/dbms.js. `scene` is a view-snapshot consumed by
   db/consistent-hashing-scene.js. */

export const consistentHashingLesson = {
  id: 'consistent-hashing',
  title: 'Consistent Hashing',
  group: 'Distributed Systems',
  summary: 'How to spread keys across a changing set of nodes so that adding or removing one machine moves only a tiny slice of the data — the partitioning scheme behind Dynamo, Cassandra and friends.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'keyspace', 'skew', 'hops'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why hash(key) % N falls apart when N changes', step: 0 },
    { text: 'Placing nodes and keys on one shared hash ring', step: 1 },
    { text: 'Adding a node moves only the keys next to it', step: 2 },
    { text: 'Removing a node spills its keys to one neighbour', step: 3 },
    { text: 'Virtual nodes to smooth out an uneven ring', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'hash % N',
      title: 'Modulo hashing melts down',
      body: [
        `The obvious way to spread keys over <code>N</code> nodes is <code>bucket = hash(key) % N</code>. It is perfectly balanced — until the day you add or lose a machine.`,
        `Change <code>N</code> from 4 to 5 and the modulo shifts for <em>almost every key</em>. Nearly the whole dataset has to move to a new node at once: caches cold, disks thrashing, the cluster crawling. The scheme that was so simple is unusable the moment the cluster is <span class="term">elastic</span>.`,
      ],
      callout: { kind: 'warn', text: 'hash(key) % N ties every key to the current count of nodes. One membership change remaps O(N·keys) of them — a reshuffle storm.' },
      metrics: { nodes2: 4, keyspace: 94, skew: 40, hops: 1 },
      scene: { view: 'modulo', note: 'Add one node and 94% of keys land somewhere new.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'The ring',
      title: 'Put everyone on one ring',
      body: [
        `Consistent hashing hashes into a fixed, circular keyspace — <code>0 … 2³²</code> wrapped into a ring — and places <b>both</b> the nodes and the keys on it.`,
        `A key belongs to the first node you meet going <b>clockwise</b> from the key's position. The crucial change: the mapping no longer mentions <code>N</code> at all. Each key's owner is decided by angles on the ring, not by how many nodes happen to exist.`,
      ],
      callout: { kind: 'insight', text: 'Hash nodes and keys into the same space. Ownership = "next node clockwise". Nothing in that rule depends on the node count.' },
      changes: ['+ fixed circular keyspace', '~ nodes hashed onto the ring too', '+ key → next node clockwise'],
      metrics: { nodes2: 4, keyspace: 0, skew: 25, hops: 1 },
      scene: { view: 'ring', note: 'One ring holds nodes and keys; ownership is just "walk clockwise".' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Add a node',
      title: 'Adding a node barely ripples',
      body: [
        `Drop a new node <b>E</b> onto the ring. It takes over only the keys sitting in the arc between it and its clockwise <em>predecessor</em> — the keys that used to walk past that spot to the next node.`,
        `Every other key on the ring keeps the exact same owner. Instead of remapping the whole dataset, you move roughly <code>1/N</code> of it, and only one node hands work over.`,
      ],
      callout: { kind: 'insight', text: 'A join touches one arc: the keys between the newcomer and the node before it. Expected movement ≈ keys ⁄ N, not keys.' },
      changes: ['+ node E inserted on the ring', '~ only E↔predecessor arc moves', '= ~80% of keys untouched'],
      metrics: { nodes2: 5, keyspace: 20, skew: 22, hops: 1 },
      scene: { view: 'add', note: 'New node E, ~20% of keys move; the rest never notice.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Remove a node',
      title: 'Removing a node is just as cheap',
      body: [
        `When a node leaves — planned or crashed — only <em>its</em> keys are orphaned, and they all fall to the <b>next node clockwise</b>. No other key changes hands.`,
        `So both directions are symmetric and local: a membership change disturbs one arc of the ring, never the whole cluster. That is exactly the elasticity modulo hashing could not give us.`,
      ],
      callout: { kind: 'tip', text: 'A leave spills one node’s keys onto its clockwise neighbour. Everyone else’s ownership is unchanged.' },
      changes: ['- node B leaves', '~ B’s keys → next node clockwise', '= all other keys stay put'],
      metrics: { nodes2: 4, keyspace: 20, skew: 28, hops: 1 },
      scene: { view: 'remove', note: 'B leaves; its keys slide to one neighbour, nothing else moves.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Virtual nodes',
      title: 'Virtual nodes even out the load',
      body: [
        `With one point per node the arcs come out uneven — a node that happens to own a big gap gets a disproportionate share of the keys. The ring is stable but <span class="term">skewed</span>.`,
        `The fix is to give each physical node <b>many</b> virtual points scattered around the ring. Load averages out across dozens of small arcs instead of one big one, and when a node dies its share is spread smoothly over all the others rather than dumped on a single neighbour.`,
      ],
      callout: { kind: 'tip', text: 'More virtual nodes → smoother load and gentler failover, at the cost of more routing metadata to track.' },
      changes: ['+ many virtual points per node', '~ load spread over small arcs', '↓ skew'],
      metrics: { nodes2: 4, keyspace: 0, skew: 6, hops: 1 },
      scene: { view: 'vnodes', note: 'Each node owns many small arcs — the load flattens out.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Elastic partitioning, by design',
      body: [
        `Consistent hashing turns a brittle <code>% N</code> into an elastic ring: membership changes move only about <code>1/N</code> of the keys, lookups stay <code>O(1)</code>, and virtual nodes keep the load even.`,
        `It is the quiet workhorse underneath distributed caches and Dynamo-style stores — the first thing you reach for when the set of machines holding your data has to grow and shrink without a reshuffle storm.`,
      ],
      callout: { kind: 'insight', text: 'Stable membership · even load · O(1) lookup. Add or remove a node and the cluster barely flinches.' },
      metrics: { nodes2: 5, keyspace: 18, skew: 6, hops: 1 },
      scene: { view: 'recap', note: 'A stable, evenly-loaded ring — scale the cluster without a reshuffle.' },
    },
  ],
};
