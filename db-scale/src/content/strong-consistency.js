/* content/strong-consistency.js — the "Strong Consistency" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/strong-consistency-scene.js. */

export const strongConsistencyLesson = {
  id: 'strong-consistency',
  title: 'Strong Consistency',
  group: 'Distributed Systems',
  summary: 'Make many replicas behave like one copy: every read returns the most recent committed write, and everyone sees the same order of events — linearizability, and the price it charges.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'latency', 'availability', 'staleness'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why async replicas let two clients disagree', step: 0 },
    { text: 'Linearizability: behave as a single copy', step: 1 },
    { text: 'A write commits only once a quorum acknowledges', step: 2 },
    { text: 'Every read observes the one committed order', step: 3 },
    { text: 'The CAP price: latency, and CP under a partition', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Disagreement',
      title: 'Two clients, two different "latest"',
      body: [
        `Spread data across replicas and let writes propagate <em>lazily</em>, and a nasty thing happens: a client writes <code>x = 2</code> to one replica, but a second client — reading a replica that has not caught up — still sees <code>x = 1</code>.`,
        `Both reads "succeeded." Neither client did anything wrong. Yet they walked away believing <b>different facts about the same key</b>. Without a stronger rule, there is no single answer to "what is the current value?"`,
      ],
      callout: { kind: 'warn', text: 'Under lazy replication a read can land on a stale replica and miss a completed write. Two clients can observe two different "current" values at the same instant.' },
      metrics: { replicas: 3, latency: 12, availability: 100, staleness: 90 },
      scene: { view: 'skew', note: 'One replica lags — so two clients read two different "latest" values.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'One copy',
      title: 'Behave as if there is only one copy',
      body: [
        `<span class="term">Strong consistency</span> — specifically <span class="term">linearizability</span> — makes the whole cluster act like a <b>single</b> copy of the data. Once a write completes, <em>every</em> later read, on any replica, must return that write or something newer.`,
        `There is one agreed order of operations, and all clients see it. The moment your write returns "OK," the old value is gone for good — no reader anywhere can still see it.`,
      ],
      callout: { kind: 'insight', text: 'Linearizability = the system behaves as one copy with a single timeline. After a write returns, every subsequent read everywhere reflects it.' },
      changes: ['+ single logical copy', '+ one global order of operations', '~ reads never go backwards in time'],
      metrics: { replicas: 3, latency: 20, availability: 100, staleness: 0 },
      scene: { view: 'single', note: 'Three physical replicas, but they present one logical, always-current copy.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Commit',
      title: 'A write waits for a quorum to agree',
      body: [
        `How do replicas agree? The write is not "done" the instant one node stores it. It is routed through a <span class="term">leader</span> (or a quorum), which replicates it and <b>blocks</b> until a majority has durably acknowledged it.`,
        `Only then does the client hear "OK." Because a majority now holds the new value, no future majority can be formed that still believes the old one — the overlap guarantees the change sticks.`,
      ],
      callout: { kind: 'insight', text: 'A write commits only after a majority acknowledges it. The client blocks until then, which is exactly what buys the single-copy guarantee.' },
      changes: ['+ leader replicates write', '+ wait for majority ack', '✓ commit point is unambiguous'],
      metrics: { replicas: 3, latency: 34, availability: 100, staleness: 0 },
      scene: { view: 'commit', note: 'The write blocks until a majority of replicas acknowledges — then it commits.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Ordered reads',
      title: 'Every read sees the committed order',
      body: [
        `Reads respect the same discipline. A linearizable read returns the latest <b>committed</b> value — it either goes to the leader, or confirms with a quorum that what it is about to return has not been superseded.`,
        `So two reads that happen after a write both see that write; a read that happens before it sees the old value; and no read ever observes operations out of order. The timeline is total, and everyone shares it.`,
      ],
      callout: { kind: 'tip', text: 'Reads also pass through the leader or a quorum, so they return the last committed value and never observe writes out of order.' },
      metrics: { replicas: 3, latency: 30, availability: 100, staleness: 0 },
      scene: { view: 'order', note: 'Writes and reads fall on one shared timeline — nobody sees the past.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'CAP price',
      title: 'The bill: latency, and CP under a split',
      body: [
        `Agreement is not free. Every write — and often every read — pays a <b>round trip to a majority</b>, so latency rises and throughput falls compared with reading your nearest replica.`,
        `Worse, under a <span class="term">network partition</span> the minority side cannot reach a majority, so it must <b>refuse</b> requests rather than serve stale data. Strong consistency is the <span class="term">CP</span> corner of CAP: it keeps consistency by giving up availability when the network breaks.`,
      ],
      callout: { kind: 'warn', text: 'Linearizability costs a majority round-trip per operation, and under a partition the minority must reject requests. It chooses consistency over availability — the CP corner of CAP.' },
      changes: ['~ every op pays a quorum round-trip', '− minority side rejects requests', '✓ never returns a stale value'],
      metrics: { replicas: 3, latency: 70, availability: 60, staleness: 0 },
      scene: { view: 'partition', note: 'The minority side cannot reach a majority, so it refuses rather than go stale.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One copy, one timeline, one price',
      body: [
        `Strong consistency hides replication entirely: clients see a single, always-current copy with one global order of events. It is built on quorum commits — a write is real only when a majority holds it.`,
        `You pay in latency and in availability during partitions. When correctness must be absolute — balances, locks, leader election — that price is worth it. When it is not, <b>eventual consistency</b> trades it away for speed and uptime.`,
      ],
      callout: { kind: 'insight', text: 'Strong consistency = one logical copy on one timeline, paid for with latency and CP behavior under partitions. Reach for it when a stale read would be wrong.' },
      metrics: { replicas: 3, latency: 32, availability: 100, staleness: 0 },
      scene: { view: 'recap', note: 'Many replicas, one truth, one shared order — at the cost of a round trip.' },
    },
  ],
};
