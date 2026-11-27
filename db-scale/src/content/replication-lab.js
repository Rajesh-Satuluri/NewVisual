/* content/replication-lab.js — the "Replication Lab" interactive lesson, as
   DATA. Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/replication-lab-scene.js.

   A hands-on lab: follow one write through a leader → followers cluster,
   feel the synchronous-vs-asynchronous trade, watch replica lag cause a
   stale read, survive a leader failure by promoting a follower, and close
   the gap with read-your-writes. */

export const replicationLabLesson = {
  id: 'replication-lab',
  title: 'Replication Lab',
  group: 'Interactive Labs',
  summary: 'Follow one write through a leader and its followers: choose synchronous or asynchronous, watch replica lag serve a stale read, kill the leader and promote a follower, then fix stale reads with read-your-writes.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'lag', 'rf', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'See how a leader streams every write to its followers', step: 0 },
    { text: 'Weigh synchronous safety against its latency cost', step: 1 },
    { text: 'Watch asynchronous replication trade freshness for speed', step: 2 },
    { text: 'Promote a follower when the leader dies — and count the cost', step: 3 },
    { text: 'Catch a stale read and fix it with read-your-writes', step: 4 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Cluster',
      title: 'One leader, two followers',
      body: [
        `We keep three copies of the data for durability and read capacity. One node is the <span class="term">leader</span> (primary); the other two are <span class="term">followers</span> (replicas). All writes go to the leader.`,
        `The leader appends each change to its <b>replication log</b> and streams it to every follower, which applies the same changes in the same order. Keep the copies identical and you can lose a machine without losing data, and spread reads across all three.`,
      ],
      callout: { kind: 'tip', text: 'Single-leader replication: writes funnel to one node, reads fan out to all. The leader’s log is the single source of truth every follower replays.' },
      metrics: { replicas: 3, rf: 3, lag: 0, availability: 100 },
      scene: { view: 'setup', note: 'One leader streams its log to two followers; all three hold the same data.' },
    },
    { // 1 — TRADEOFF / synchronous
      chapter: 'tradeoff', short: 'Sync',
      title: 'Synchronous: wait for the ack',
      body: [
        `Run a write <span class="term">synchronously</span>. The leader applies <code>x = 2</code>, ships it to a follower, and <b>waits</b> for that follower to confirm it is durable before telling the client "committed".`,
        `Now the value is guaranteed to survive on at least two nodes — if the leader dies the next instant, the write is not lost. The cost is <em>latency</em>: every commit pays a round trip to the follower, and if that follower stalls, the write stalls with it.`,
      ],
      callout: { kind: 'insight', text: 'Synchronous replication makes a write durable on a follower before the client hears “done.” Zero data loss on failover — paid for with slower commits and a follower that can block you.' },
      changes: ['leader applies x = 2', '→ follower acks (durable on 2 nodes)', '✓ client sees committed, lag = 0'],
      metrics: { replicas: 3, rf: 3, lag: 0, availability: 100 },
      scene: { view: 'sync', note: 'Leader waits for a follower’s ack before committing — safe, but slower.' },
    },
    { // 2 — TRADEOFF / asynchronous
      chapter: 'tradeoff', short: 'Async',
      title: 'Asynchronous: don’t wait',
      body: [
        `Switch to <span class="term">asynchronous</span>. The leader applies <code>x = 3</code> and acks the client <b>immediately</b>, then ships the change to followers in the background whenever they catch up.`,
        `Commits are fast and a slow follower never blocks a write. But the followers now trail the leader by some <span class="term">replica lag</span> — milliseconds to seconds. In that window they still serve the <em>old</em> value, and if the leader dies before a follower catches up, the un-replicated writes are gone.`,
      ],
      callout: { kind: 'warn', text: 'Asynchronous replication acks before followers catch up. Fast and resilient to slow replicas — but followers serve stale data, and a leader crash can lose the lagging writes.' },
      changes: ['leader applies x = 3, acks now', '~ followers lag behind (still x = 2)', '⚠ unreplicated writes at risk'],
      metrics: { replicas: 3, rf: 3, lag: 220, availability: 100 },
      scene: { view: 'async', note: 'Leader acks immediately; followers trail by the replica lag and serve stale reads.' },
    },
    { // 3 — SOLUTION / failover
      chapter: 'solution', short: 'Failover',
      title: 'Leader dies — promote a follower',
      body: [
        `Kill the leader. Writes have nowhere to go, so the cluster runs a <span class="term">failover</span>: it detects the leader is gone, picks the most up-to-date follower, and <b>promotes</b> it to leader. Clients and the remaining follower are redirected to the new leader.`,
        `Availability is restored, but with async replication any writes the old leader had acked yet not shipped are <b>lost</b> — the new leader never saw them. This is why synchronous (or quorum) replication matters when you truly cannot drop a write.`,
      ],
      callout: { kind: 'warn', text: 'Failover = detect, elect the freshest follower, promote, redirect. It buys availability — but async writes the old leader never shipped vanish with it.' },
      changes: ['✗ leader fails', '↑ freshest follower promoted', '− lagging async writes lost'],
      metrics: { replicas: 2, rf: 3, lag: 0, availability: 92 },
      scene: { view: 'failover', note: 'Leader fails → freshest follower is promoted → clients redirected; async tail may be lost.' },
    },
    { // 4 — TECHNIQUE / stale read & read-your-writes
      chapter: 'technique', short: 'Stale read',
      title: 'Stale reads, and reading your own writes',
      body: [
        `Back to normal async operation. A client writes <code>name = Ada</code> to the leader, then immediately reads from a <b>lagging follower</b> — which has not applied the change yet — and sees the <em>old</em> name. The user "saved" something and it seemingly vanished. That is a <span class="term">stale read</span>.`,
        `Fix it with <span class="term">read-your-writes</span> consistency: after a client writes, route its own reads to the leader (or to a replica known to be caught up) for a short window. The user always sees at least their own latest write — other clients may still briefly see the old value, which is usually fine.`,
      ],
      callout: { kind: 'tip', text: 'Read-your-writes: pin a client’s reads to the leader (or a caught-up replica) right after it writes. It sees its own updates immediately, without forcing every read to be fully consistent.' },
      changes: ['write name = Ada → leader', '✗ read from lagging follower = old', '✓ route own reads to leader → fresh'],
      metrics: { replicas: 3, rf: 3, lag: 180, availability: 100 },
      scene: { view: 'staleread', note: 'A lagging follower serves a stale read; routing the writer’s reads to the leader fixes it.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What the lab proved',
      body: [
        `One leader orders every write; followers replay its log to stay identical. <b>Synchronous</b> replication guarantees no loss on failover but slows commits; <b>asynchronous</b> is fast and resilient but lets followers lag and risks losing the tail if the leader dies.`,
        `Replica lag shows up as <b>stale reads</b>, softened by read-your-writes and similar guarantees. When the leader fails, <b>failover</b> promotes the freshest follower to restore availability. Every choice here trades freshness, latency, and durability — pick per workload.`,
      ],
      callout: { kind: 'insight', text: 'Leader orders writes → followers replay. Sync = safe + slow, async = fast + stale. Lag causes stale reads (fix with read-your-writes); failover trades a lost tail for availability.' },
      metrics: { replicas: 3, rf: 3, lag: 0, availability: 100 },
      scene: { view: 'recap', note: 'Replication trades freshness, latency, and durability — tuned per workload.' },
    },
  ],
};
