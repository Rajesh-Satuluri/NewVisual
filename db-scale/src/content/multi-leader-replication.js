/* content/multi-leader-replication.js — the "Multi-Leader Replication" lesson,
   as DATA. Same shape as content/dbms.js: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/multi-leader-replication-scene.js. */

export const multiLeaderReplicationLesson = {
  id: 'multi-leader-replication',
  title: 'Multi-Leader Replication',
  group: 'Distributed Systems',
  summary: 'Let more than one node accept writes — a leader in every region. You win local latency and offline tolerance, and take on the hard problem of conflicts.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'conflicts', 'lag', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a single leader caps write latency and availability', step: 0 },
    { text: 'A leader per region, each accepting local writes', step: 1 },
    { text: 'How concurrent writes to one key create conflicts', step: 2 },
    { text: 'Resolving conflicts: LWW, version vectors, CRDTs, merge', step: 3 },
    { text: 'The trade: write locality & availability vs conflict handling', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'One leader',
      title: 'One leader is a long way away',
      body: [
        `Single-leader replication is simple and safe: exactly one node accepts writes and streams them to the followers. But <em>every</em> write — from every client, everywhere — has to reach that one leader.`,
        `A user in Sydney writing to a leader in Virginia pays the round-trip on every single write. The leader is also a <span class="term">bottleneck</span> and a single point of failure for writes: if it or its region goes down, nobody can write at all.`,
      ],
      callout: { kind: 'warn', text: 'With one leader, write latency is bounded by distance to that leader, and a region outage stops all writes. Reads can scale on followers; writes cannot.' },
      metrics: { replicas: 3, conflicts: 0, lag: 40, availability: 97 },
      scene: { view: 'single', note: 'Every write funnels to one leader — distance becomes latency.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Many leaders',
      title: 'Put a leader in every region',
      body: [
        `<span class="term">Multi-leader replication</span> gives each region (or datacenter) its own leader. Local clients write to their <b>local</b> leader at local-network speed, and the leaders replicate each other's changes <b>asynchronously</b> in the background.`,
        `Now a Sydney write lands in milliseconds, and if one region drops off the network entirely, the others keep accepting writes. Writes are available and fast everywhere.`,
      ],
      callout: { kind: 'insight', text: 'Each leader is a full write-accepting replica. Writes go to the nearest one; leaders gossip changes to each other. No single node is on every write path.' },
      changes: ['+ a leader per region', '~ writes served locally', '+ survives a region outage'],
      metrics: { replicas: 3, conflicts: 0, lag: 90, availability: 100 },
      scene: { view: 'multi', note: 'Three regional leaders, each writing locally and replicating to the rest.' },
    },
    { // 2 — PROBLEM (the catch)
      chapter: 'problem', short: 'Conflicts',
      title: 'Two leaders, one key, two answers',
      body: [
        `Here is the price. Because replication is asynchronous, two leaders can accept writes to the <em>same</em> key at the <em>same</em> time, each unaware of the other. The US leader sets <code>x = 1</code>; the EU leader sets <code>x = 2</code>.`,
        `When those writes finally replicate across, each node sees a value it didn't expect. This is a <span class="term">write conflict</span> — the defining difficulty of multi-leader systems, and something single-leader setups never have.`,
      ],
      callout: { kind: 'warn', text: 'Concurrent writes to the same key on different leaders conflict. The database cannot tell which "should" win — both were accepted as valid at the time.' },
      metrics: { replicas: 3, conflicts: 1, lag: 120, availability: 100 },
      scene: { view: 'conflict', note: 'Same key, two values, neither write saw the other.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'Resolve',
      title: 'Agree on one value, everywhere',
      body: [
        `Conflicts have to be <span class="term">resolved</span> so every replica converges on the same value. The common strategies: <b>last-write-wins</b> (keep the one with the newest timestamp — simple, but silently drops a write); <b>version vectors</b> (detect which writes are truly concurrent); <b>CRDTs</b> (data types that merge automatically); or hand the conflict to the <b>application</b> to merge.`,
        `Whatever the rule, it must be deterministic: run it on any replica, in any order, and land on the same result.`,
      ],
      callout: { kind: 'tip', text: 'Resolution turns "two values" into "one agreed value" on every node. LWW is easy but lossy; CRDTs merge without losing writes; app-merge is most flexible.' },
      changes: ['+ deterministic resolution rule', '~ replicas converge', '- a losing write may be dropped (LWW)'],
      metrics: { replicas: 3, conflicts: 0, lag: 90, availability: 100 },
      scene: { view: 'resolve', note: 'A deterministic rule collapses the conflict to one value.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'The bargain',
      title: 'Locality and uptime, paid in conflicts',
      body: [
        `Multi-leader buys you <b>low-latency local writes</b>, <b>write availability during region outages</b>, and even <b>offline operation</b> (think a laptop or phone that syncs later). Those are exactly the things single-leader can't give you.`,
        `The bill is conflict handling and weaker guarantees: you only get <span class="term">eventual consistency</span>, and you must design keys and merge rules so conflicts are rare or automatically mergeable. Use it when writes are naturally partitioned by region or user — and avoid it when a single global order matters.`,
      ],
      callout: { kind: 'insight', text: 'Multi-leader shines when writes rarely touch the same key across regions. If strong, globally-ordered writes matter, a single leader or consensus is the better tool.' },
      metrics: { replicas: 3, conflicts: 0, lag: 90, availability: 100 },
      scene: { view: 'tradeoff', note: 'What you gain versus what you pay.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Write anywhere, reconcile later',
      body: [
        `Multi-leader replication trades the single write path for many: write to any regional leader, replicate asynchronously, and resolve the conflicts that asynchrony lets in.`,
        `It's the backbone of geo-distributed and offline-first systems — fast and available, as long as you have a sound answer to "what happens when two writes collide?"`,
      ],
      callout: { kind: 'insight', text: 'Write anywhere · replicate async · resolve conflicts. Great for geo & offline; only ever eventually consistent.' },
      metrics: { replicas: 3, conflicts: 0, lag: 80, availability: 100 },
      scene: { view: 'recap', note: 'Many leaders, local writes, convergence through resolution.' },
    },
  ],
};
