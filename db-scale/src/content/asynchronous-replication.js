/* content/asynchronous-replication.js — "Asynchronous Replication" as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/asynchronous-replication-scene.js. */

export const asynchronousReplicationLesson = {
  id: 'asynchronous-replication',
  title: 'Asynchronous Replication',
  group: 'Distributed Systems',
  summary: 'Confirm the write the instant the leader has it, then ship it to replicas in the background — the fast, available, slightly lossy half of the replication trade-off.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'lag', 'staleness', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The leader acks the client first, replicates afterward', step: 0 },
    { text: 'Why that makes writes fast and the leader never block', step: 1 },
    { text: 'Replication lag → followers serve stale reads', step: 2 },
    { text: 'A leader crash can lose the newest, un-shipped writes', step: 3 },
    { text: 'The latency-vs-durability bargain, and when to take it', step: 4 },
  ],

  steps: [
    { // 0 — HOW IT WORKS
      chapter: 'technique', short: 'Ack first',
      title: 'Ack the client, replicate later',
      body: [
        `In <span class="term">asynchronous</span> replication the leader does the bare minimum before saying yes: it writes the change to its own log and <b>immediately returns OK</b> to the client. Only <em>after that</em> does it stream the change out to its replicas, in the background.`,
        `So the client's write latency is just one node's work — the replicas are never on the critical path. The copies catch up a moment later, out of band.`,
      ],
      callout: { kind: 'insight', text: 'The order is the whole point: 1) leader writes, 2) client hears “OK”, 3) replicas receive the change afterward. The acknowledgement does not wait for the copies.' },
      changes: ['+ leader logs the write', '+ client gets OK at once', '~ replicas updated in the background'],
      metrics: { replicas: 2, lag: 20, staleness: 30, throughput: 240 },
      scene: { view: 'flow', note: 'Write, ack, then replicate — in that order. The client never waits for a replica.' },
    },
    { // 1 — SOLUTION / BENEFIT
      chapter: 'solution', short: 'Fast writes',
      title: 'Writes stay fast, the leader never stalls',
      body: [
        `Because acknowledgement never waits on the network to the replicas, write latency is low and <span class="term">predictable</span> — it does not depend on how far away or how slow a replica is.`,
        `A down or lagging replica cannot block writes: the leader keeps accepting them and lets the replica catch up whenever it can. Meanwhile the replicas still serve <b>reads</b>, scaling read throughput.`,
      ],
      callout: { kind: 'tip', text: 'Async decouples write latency from replica health. One sluggish follower slows nothing; writes run at leader speed.' },
      changes: ['+ low, steady write latency', '+ a slow replica blocks nothing', '+ replicas absorb reads'],
      metrics: { replicas: 2, lag: 25, staleness: 40, throughput: 420 },
      scene: { view: 'fast', note: 'Writes run at the speed of one node; replicas scale reads on the side.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Lag',
      title: 'Followers trail — reads can be stale',
      body: [
        `The copies are always a little behind. The gap between the leader and a replica is the <span class="term">replication lag</span> — usually milliseconds, but seconds or more under load or a slow link.`,
        `A read served by a lagging follower sees an <b>older</b> version. Write a value, immediately read it from a replica, and you may not see your own write — the leader is at <code>v7</code> while the follower is still on <code>v5</code>.`,
      ],
      callout: { kind: 'warn', text: 'Asynchronous replication is only eventually consistent. Followers can return stale data, and “read-your-writes” is not guaranteed unless you read the leader.' },
      changes: ['~ replica trails the leader', '− follower reads may be stale', '− no read-your-writes on followers'],
      metrics: { replicas: 2, lag: 180, staleness: 220, throughput: 420 },
      scene: { view: 'lag', note: 'Leader at v7, follower still at v5 — the lag window is where stale reads live.' },
    },
    { // 3 — PROBLEM
      chapter: 'problem', short: 'Data loss',
      title: 'A crash can swallow the newest writes',
      body: [
        `Here is the sharp edge. The leader has acked writes that it has <em>not yet shipped</em>. If it crashes in that instant and a follower is promoted, those un-replicated writes are <b>gone</b> — the new leader never saw them.`,
        `That is a non-zero <span class="term">RPO</span> (recovery point objective): a small window of committed-looking work that failover can lose. The client was told “OK”, but the data did not survive.`,
      ],
      callout: { kind: 'warn', text: 'Async trades durability for speed. Any write acked but not yet replicated is lost if the leader dies before it ships — acknowledged ≠ safe.' },
      changes: ['− un-shipped writes lost on failover', '− RPO > 0 (a loss window)', '~ promoted follower lacks the tail'],
      metrics: { replicas: 2, lag: 180, staleness: 220, throughput: 420 },
      scene: { view: 'dataloss', note: 'The leader dies holding v6–v7; the promoted follower only has v5. Those writes vanish.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The bargain',
      title: 'Speed and availability, bought with risk',
      body: [
        `The async bargain is explicit: you gain <b>low latency</b>, <b>high throughput</b>, and a leader that never blocks on replicas. You pay with <b>stale follower reads</b> and a <b>window of data loss</b> on failover.`,
        `It is the exact mirror of synchronous replication, which pays latency to guarantee zero loss. Most systems tune the dial — e.g. semi-sync to one replica — rather than living at either extreme.`,
      ],
      callout: { kind: 'insight', text: 'Pick async when speed and availability matter more than never losing the last few writes: analytics, caches, feeds. Avoid it, or go semi-sync, for money and orders.' },
      metrics: { replicas: 2, lag: 90, staleness: 120, throughput: 400 },
      scene: { view: 'tradeoff', note: 'Fast & available vs stale & lossy — the opposite corner from synchronous.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Fast, available, eventually consistent',
      body: [
        `Asynchronous replication acknowledges on the leader and copies afterward: writes are fast, the leader is never held hostage by a slow replica, and reads scale across followers.`,
        `The cost is baked in — <b>replication lag</b> means stale reads, and a leader crash can lose its un-shipped tail. Know the loss window, and reach for synchronous (or semi-sync) when it must be zero.`,
      ],
      callout: { kind: 'insight', text: 'Async = ack now, ship later → fast + available + eventually consistent, with a small data-loss window. Sync = the opposite trade.' },
      metrics: { replicas: 2, lag: 60, staleness: 90, throughput: 400 },
      scene: { view: 'recap', note: 'Ack now, ship later: speed and availability, at the price of lag and a loss window.' },
    },
  ],
};
