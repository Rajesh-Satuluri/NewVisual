/* content/virtual-nodes.js — the "Virtual Nodes" lesson, as DATA. Same shape as
   the other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/virtual-nodes-scene.js. */

export const virtualNodesLesson = {
  id: 'virtual-nodes',
  title: 'Virtual Nodes',
  group: 'Distributed Systems',
  summary: 'Consistent hashing gives each machine one spot on the ring — and that makes load lumpy. Virtual nodes fix it: give every machine hundreds of scattered spots so its share averages out.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'skew', 'keyspace', 'partitions'],
  legend: ['read', 'write'],
  goals: [
    { text: 'One token per node leaves ring arcs uneven', step: 0 },
    { text: 'A single token makes join/leave lumpy', step: 1 },
    { text: 'Each machine owns many scattered vnodes', step: 2 },
    { text: 'A key maps to a vnode, then to its owner', step: 3 },
    { text: 'Many small slices rebalance in parallel', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Lumpy arcs',
      title: 'One token per node, and the load is uneven',
      body: [
        `Plain consistent hashing places each machine at a <em>single</em> random point on the ring, and a machine owns the arc running clockwise up to the next point. But random points are not evenly spaced: some arcs come out long, some short.`,
        `A node that happens to land just after a big gap inherits a huge slice of the keyspace — and all the traffic that goes with it. With only a handful of machines, the <span class="term">load skew</span> between the busiest and quietest node can be 2× or worse.`,
      ],
      callout: { kind: 'warn', text: 'One token per node means the ring is carved into uneven arcs. The node with the longest arc becomes a hotspot through pure bad luck.' },
      metrics: { nodes2: 4, skew: 58, keyspace: 0, partitions: 4 },
      scene: { view: 'single', note: 'Four nodes, four random points — and wildly unequal arcs.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Lumpy moves',
      title: 'Adding a node only helps its two neighbours',
      body: [
        `The single-token layout also makes <span class="term">rebalancing</span> clumsy. When a new machine joins, it drops in at one point and takes over exactly one arc — carved out of the <b>one</b> node that happened to own that region.`,
        `So the newcomer and that single unlucky neighbour do all the data movement, while every other node sits idle. You cannot spread the shuffle across the cluster, so growing or shrinking is slow and bursty.`,
      ],
      callout: { kind: 'warn', text: 'With one token, a join or leave only touches the two nodes adjacent to that point. The rest of the cluster cannot share the rebalancing work.' },
      changes: ['+ new node joins at one ring point', '~ one neighbour hands over its whole arc', '− every other node stays idle'],
      metrics: { nodes2: 5, skew: 54, keyspace: 25, partitions: 5 },
      scene: { view: 'lumpy', note: 'A join forces one neighbour to surrender a big contiguous arc.' },
    },
    { // 2 — SOLUTION
      chapter: 'solution', short: 'Scatter',
      title: 'Give each machine many points, not one',
      body: [
        `The fix is simple: stop giving a machine one position on the ring and give it <b>many</b> — dozens to hundreds of <span class="term">virtual nodes</span> (vnodes), each a separate token hashed to its own spot.`,
        `Now a physical machine no longer owns one big arc; it owns a <em>spray</em> of small arcs scattered all around the ring. Interleaved with every other machine's vnodes, the long-gap lottery disappears.`,
      ],
      callout: { kind: 'insight', text: 'A virtual node is just an extra token for a physical machine. Give each machine many, and it owns many tiny arcs instead of one large one.' },
      changes: ['+ each node emits many vnode tokens', '~ one big arc → a spray of small arcs', '+ vnodes interleave around the ring'],
      metrics: { nodes2: 4, skew: 12, keyspace: 0, partitions: 64 },
      scene: { view: 'scatter', note: 'Each colour is one machine — now scattered as many small ticks.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Two hops',
      title: 'A key finds a vnode, the vnode names the owner',
      body: [
        `Lookup gains one indirection. Hash the key to a point on the ring and walk clockwise to the first <b>vnode</b> — exactly as before. That vnode then carries a label saying which <b>physical machine</b> owns it.`,
        `So the map is <code>key → vnode → machine</code>. The ring still has an O(1) successor lookup; the only extra cost is a small table mapping each vnode back to its owner. Averaged over hundreds of vnodes, every machine lands within a few percent of a fair share.`,
      ],
      callout: { kind: 'insight', text: 'Lookup is key → nearest vnode → owning machine. The averaging over many vnodes is what flattens the load, not any change to the hash.' },
      metrics: { nodes2: 4, skew: 8, keyspace: 0, partitions: 64 },
      scene: { view: 'lookup', note: 'The key lands on a vnode; the vnode points to its physical owner.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Parallel moves',
      title: 'Smooth rebalancing, at the cost of metadata',
      body: [
        `Now watch a machine join. It brings its own spray of vnodes, each slotting between existing vnodes all over the ring — so it pulls a <em>little</em> data from <b>many</b> different machines at once, in parallel. The same happens, in reverse, when a machine leaves.`,
        `The price is bookkeeping: hundreds of tokens per node means a larger ring map and more membership state to gossip. In practice that metadata is tiny next to the payoff, which is why Cassandra and Dynamo-style stores run vnodes by default.`,
      ],
      callout: { kind: 'tip', text: 'Many vnodes mean a join or leave moves small slices from many nodes in parallel — fast, even rebalancing. You pay only in extra token metadata.' },
      changes: ['+ joiner takes slivers from every node', '+ data movement runs in parallel', '− more tokens → more ring metadata'],
      metrics: { nodes2: 5, skew: 10, keyspace: 20, partitions: 80 },
      scene: { view: 'rebalance', note: 'A new machine pulls small slices from all of its peers at once.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The practical form of consistent hashing',
      body: [
        `Virtual nodes keep everything good about consistent hashing — stable membership, O(1) lookup, only ~1/N of keys moving on a change — and remove its one rough edge, the uneven single-token arcs.`,
        `By giving each machine many small, scattered arcs, load evens out and rebalancing spreads across the whole cluster. That is why real systems — <b>Cassandra</b>, <b>Riak</b>, <b>DynamoDB</b> — ship vnodes as the default, not an option.`,
      ],
      callout: { kind: 'insight', text: 'Vnodes = consistent hashing with even load and parallel rebalancing. One extra indirection buys a flat distribution across the cluster.' },
      metrics: { nodes2: 4, skew: 8, keyspace: 0, partitions: 64 },
      scene: { view: 'recap', note: 'Many tiny arcs per machine — even load, smooth growth.' },
    },
  ],
};
