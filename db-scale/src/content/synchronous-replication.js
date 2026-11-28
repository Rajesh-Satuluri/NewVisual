/* content/synchronous-replication.js — the "Synchronous Replication" lesson, as
   DATA. Same shape as content/dbms.js: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/synchronous-replication-scene.js. */

export const synchronousReplicationLesson = {
  id: 'synchronous-replication',
  title: 'Synchronous Replication',
  group: 'Distributed Systems',
  summary: 'The durable end of the replication dial — the leader waits for replicas to acknowledge a write before it tells the client "done", so a committed write can never be lost.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'lag', 'latency', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'How a write blocks on replica acknowledgements', step: 0 },
    { text: 'Why that buys zero data loss on failover (RPO = 0)', step: 1 },
    { text: 'The latency price: every write pays a round-trip', step: 2 },
    { text: 'How a stalled replica can block writes entirely', step: 3 },
    { text: 'Semi-synchronous replication as the middle ground', step: 4 },
  ],

  steps: [
    { // 0 — TECHNIQUE
      chapter: 'technique', short: 'Wait for acks',
      title: 'The leader waits for the replicas',
      body: [
        `In <span class="term">synchronous replication</span> a write does not finish at the leader. The leader appends it, ships it to its replicas, and <b>blocks</b> — it will not tell the client "committed" until the replicas have written the change and sent back an <span class="term">acknowledgement</span>.`,
        `So the order is strict: <code>1</code> client write → <code>2</code> replicate → <code>3</code> replicas ack → <code>4</code> client gets OK. Only when the data is safely on <em>several</em> machines does the client hear success.`,
      ],
      callout: { kind: 'insight', text: 'A synchronous write is "done" only once it is durable on the leader AND its replicas. The acknowledgement is the whole point.' },
      metrics: { replicas: 3, lag: 0, latency: 9, availability: 100 },
      scene: { view: 'flow', note: 'Write → replicate → acks → OK. The client waits for the replicas.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Zero loss',
      title: 'A committed write can’t be lost',
      body: [
        `Because the client only ever sees success <em>after</em> the replicas hold the write, the data lives on multiple nodes before anyone depends on it. Now the leader can die the instant after committing and nothing is lost.`,
        `A replica is promoted to leader carrying the <b>complete</b> history. The recovery point objective is <span class="term">RPO = 0</span>: not one acknowledged write disappears.`,
      ],
      callout: { kind: 'insight', text: 'RPO = 0 — zero data loss on failover. Synchronous replication is how a database promises that an acknowledged write truly survives.' },
      changes: ['+ write on 3 nodes before OK', '~ leader crash → promote a replica', '+ no acknowledged write lost'],
      metrics: { replicas: 3, lag: 0, latency: 9, availability: 100 },
      scene: { view: 'durable', note: 'The leader dies — a replica is promoted with every committed write intact.' },
    },
    { // 2 — TRADEOFF
      chapter: 'tradeoff', short: 'Latency cost',
      title: 'Every write pays a round-trip',
      body: [
        `Durability is not free. The client now waits out the full loop: local write + network hop to the replicas + their write + the acks back. Write latency becomes <code>local + round-trip</code>, bounded by the <b>slowest</b> replica that must ack.`,
        `Put a synchronous replica in another region and every write inherits that cross-region latency. The dial that gives you safety also lengthens the critical path.`,
      ],
      callout: { kind: 'warn', text: 'Synchronous writes are as slow as the slowest acking replica. Geography and tail latency land directly on write latency.' },
      metrics: { replicas: 3, lag: 0, latency: 18, availability: 100 },
      scene: { view: 'latency', note: 'The client blocks for the whole round-trip — paced by the slowest replica.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'Sync stall',
      title: 'A slow replica stalls every write',
      body: [
        `Here is the sharp edge. If a synchronous replica goes <b>down</b> or merely slow, the leader keeps waiting for an ack that never comes — so <em>all</em> writes block. Strong durability has quietly become an availability risk.`,
        `A replica meant to protect you can now take you offline. Requiring an ack from a specific replica couples your write availability to that replica's health.`,
      ],
      callout: { kind: 'warn', text: 'If writes must wait for a replica that is stuck, one slow node freezes the whole system. Durability and availability pull against each other.' },
      metrics: { replicas: 3, lag: 0, latency: 999, availability: 40 },
      scene: { view: 'stall', note: 'One replica stalls — the leader waits forever and every write blocks.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Semi-sync',
      title: 'Semi-synchronous: wait for one',
      body: [
        `The common compromise is <span class="term">semi-synchronous</span> replication: the leader waits for an ack from <b>at least one</b> replica, not all of them. The write is durable on two nodes, but a single lagging replica can no longer block progress.`,
        `You bound data loss (there is always one up-to-date copy) while tolerating a slow or failed replica. It is the pragmatic middle of the dial most systems actually run.`,
      ],
      callout: { kind: 'tip', text: 'Semi-sync waits for any 1 of N acks: durable on two nodes, yet resilient to one stalling replica. Safety without the full stall risk.' },
      changes: ['~ wait for any 1 ack, not all', '+ durable on 2 nodes', '+ a lagging replica no longer blocks'],
      metrics: { replicas: 3, lag: 20, latency: 7, availability: 99 },
      scene: { view: 'semisync', note: 'Ack from any one replica releases the write; a laggard no longer stalls it.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The durable end of the dial',
      body: [
        `Synchronous replication trades latency for safety: the leader blocks on replica acks, so every acknowledged write is already on several machines and a failover loses nothing (<span class="term">RPO = 0</span>).`,
        `The costs are write latency (the round-trip) and an availability risk if a required replica stalls — which <b>semi-synchronous</b> replication softens by waiting for just one. The opposite end of this dial, trading durability for speed, is <b>asynchronous</b> replication.`,
      ],
      callout: { kind: 'insight', text: 'Sync = wait for acks → no loss, more latency. Semi-sync = wait for one. Async (next lesson) = don’t wait → fast, but lossy.' },
      metrics: { replicas: 3, lag: 0, latency: 12, availability: 100 },
      scene: { view: 'recap', note: 'Zero data loss, bought with write latency — softened by semi-sync.' },
    },
  ],
};
