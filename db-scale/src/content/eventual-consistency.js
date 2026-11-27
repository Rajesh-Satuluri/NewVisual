/* content/eventual-consistency.js — the "Eventual Consistency" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/eventual-consistency-scene.js. */

export const eventualConsistencyLesson = {
  id: 'eventual-consistency',
  title: 'Eventual Consistency',
  group: 'Distributed Systems',
  summary: 'Replicas accept writes immediately and sync in the background, so they briefly disagree — but given no new writes, every copy converges to the same value.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'staleness', 'conflicts', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why async replication lets replicas disagree', step: 0 },
    { text: 'The promise: convergence once writes stop', step: 1 },
    { text: 'Background propagation spreads every write', step: 2 },
    { text: 'Last-write-wins resolves conflicting copies', step: 3 },
    { text: 'The trade: always available, sometimes stale', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Stale reads',
      title: 'Replicas can read different values',
      body: [
        `A write lands on one replica and returns <b>success</b> immediately — it does not wait for the others. The update then travels to the rest <em>in the background</em>. For a short window, the copies disagree.`,
        `A client that reads replica&nbsp;B right after writing to replica&nbsp;A sees the <span class="term">old</span> value. Nothing is broken — the write just has not arrived yet. This is the price of not blocking on every replica.`,
      ],
      callout: { kind: 'warn', text: 'With asynchronous replication a read can land on a replica that has not yet received the latest write, so it returns a stale value. The copies are temporarily out of sync.' },
      metrics: { replicas: 3, staleness: 240, conflicts: 0, availability: 100 },
      scene: { view: 'diverge', note: 'One replica has v2, two still hold v1 — reads disagree for a moment.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Converge',
      title: 'The promise: they all catch up',
      body: [
        `Eventual consistency makes one guarantee: <b>if writes stop, every replica eventually holds the same value</b>. There is no permanent disagreement — only a lag while updates propagate.`,
        `“Eventual” is a promise about the <em>end state</em>, not the timing. It may take milliseconds or seconds, but the replicas are always converging toward agreement, never drifting apart.`,
      ],
      callout: { kind: 'insight', text: 'Eventual consistency guarantees convergence: stop writing, and after the propagation delay every replica returns the same value. It bounds the destination, not the delay.' },
      changes: ['+ write accepted on one replica', '~ others still catching up', '→ all heading to v2'],
      metrics: { replicas: 3, staleness: 120, conflicts: 0, availability: 100 },
      scene: { view: 'converge', note: 'Updates fan out; given no new writes, all three settle on v2.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Propagate',
      title: 'Writes gossip to every replica',
      body: [
        `How does catch-up happen? Each write is <b>propagated</b> in the background: the receiving replica forwards it to its peers, which forward it on, until every copy has applied it. Replicas also periodically compare state to fill any gaps.`,
        `Because propagation is asynchronous, the <span class="term">staleness window</span> shrinks as the write spreads. The more replicas have it, the fewer reads can see the old value.`,
      ],
      callout: { kind: 'tip', text: 'Background propagation (and periodic anti-entropy sync) carries each write to every replica. The staleness window is just how long that spread takes.' },
      metrics: { replicas: 3, staleness: 40, conflicts: 0, availability: 100 },
      scene: { view: 'propagate', note: 'v2 hops replica → replica until the whole set has it.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Resolve',
      title: 'When two writes race, pick a winner',
      body: [
        `What if two clients write <em>different</em> values to <em>different</em> replicas at once? Now the copies genuinely <b>conflict</b> — there is no single “latest” yet. The system must resolve it deterministically so every replica lands on the same answer.`,
        `The simplest rule is <span class="term">last-write-wins</span>: tag each write with a timestamp (or version), and the highest one wins everywhere. Richer systems merge with version vectors or CRDTs, but the goal is identical — one agreed value.`,
      ],
      callout: { kind: 'insight', text: 'Concurrent writes create conflicts. A deterministic rule — last-write-wins by timestamp, or a merge via version vectors / CRDTs — makes every replica resolve to the same value.' },
      changes: ['+ two writes race', '~ conflict detected', '✓ last-write-wins picks v2'],
      metrics: { replicas: 3, staleness: 60, conflicts: 1, availability: 100 },
      scene: { view: 'resolve', note: 'vA and vB collide; the later timestamp wins on every replica.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Trade',
      title: 'Always up, sometimes behind',
      body: [
        `The payoff is big: because no write waits for the whole cluster, the system stays <b>fast and available</b> even when replicas are slow or a network link drops. Every replica can serve reads and accept writes on its own.`,
        `The cost is <span class="term">stale reads</span>. For a shopping cart or a “likes” count that is fine; for a bank balance it is not. Use eventual consistency where <em>availability</em> matters more than reading the very latest value.`,
      ],
      callout: { kind: 'warn', text: 'Eventual consistency buys high availability and low latency by allowing temporary staleness. Great for carts, counters and feeds — wrong for anything needing a single up-to-the-instant truth.' },
      metrics: { replicas: 3, staleness: 180, conflicts: 0, availability: 100 },
      scene: { view: 'tradeoff', note: 'Partition one replica: it still serves, just a little behind.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Disagree now, agree soon',
      body: [
        `Eventual consistency trades instant agreement for availability: replicas accept writes without waiting, diverge briefly, then converge as updates propagate and conflicts resolve. The guarantee is the destination, not the schedule.`,
        `It underpins Dynamo-style stores, DNS and shopping carts the world over. Next come its relatives — <b>read repair</b> and <b>anti-entropy</b>, the mechanics that actually drive replicas back together.`,
      ],
      callout: { kind: 'insight', text: 'Accept writes anywhere, sync in the background, resolve conflicts deterministically — and every replica ends up agreeing. Availability now, consistency soon.' },
      metrics: { replicas: 3, staleness: 0, conflicts: 0, availability: 100 },
      scene: { view: 'recap', note: 'All replicas converged on v2 — one value, eventually.' },
    },
  ],
};
