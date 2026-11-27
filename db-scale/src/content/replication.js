/* content/replication.js — the "Replication" lesson, as DATA. Same shape as
   content/dbms.js: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. Rendered through the shared course shell;
   `scene` is consumed by db/replication-scene.js. */

export const replicationLesson = {
  id: 'replication',
  title: 'Replication',
  group: 'Distributed Systems',
  summary: 'Keep the same data on several machines so a failure loses nothing and reads can scale out — the first move every distributed database makes.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'rf', 'lag', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a single node is both a bottleneck and a time bomb', step: 0 },
    { text: 'Leader–follower replication: one writer, many copies', step: 1 },
    { text: 'Reading from followers to scale read throughput', step: 2 },
    { text: 'Failover: promoting a follower when the leader dies', step: 3 },
    { text: 'Synchronous vs asynchronous — the durability/latency dial', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Single node',
      title: 'One node holds the only copy',
      body: [
        `Put the whole database on a single machine and two problems arrive together. Every read and every write funnels through that one box, so it is a <span class="term">bottleneck</span> the moment traffic grows.`,
        `Worse, it is the <span class="term">single point of failure</span>: when that disk dies or the machine reboots, the data is simply <em>gone</em> and the service is down. One copy is no copy.`,
      ],
      callout: { kind: 'warn', text: 'A single node couples your durability and your availability to one piece of hardware. Nothing about that scales — or survives.' },
      metrics: { replicas: 1, rf: 1, lag: 0, availability: 90 },
      scene: { view: 'single', note: 'One box takes every read and write — and holds the only copy.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Leader–follower',
      title: 'One leader, many followers',
      body: [
        `<span class="term">Replication</span> keeps the same data on several nodes. The common arrangement is <b>leader–follower</b>: one node is the <b>leader</b> and accepts all writes; it streams its ordered change log to a set of <b>follower</b> replicas, each of which applies the same changes in the same order.`,
        `Now there are <code>N</code> independent copies. Lose one and the data lives on everywhere else.`,
      ],
      callout: { kind: 'insight', text: 'The replication factor (RF) is how many copies exist. RF ≥ 3 is the common floor: it survives a node failure with a copy to spare.' },
      changes: ['+ leader takes all writes', '+ followers copy the change log', '+ RF 3× durable copies'],
      metrics: { replicas: 3, rf: 3, lag: 12, availability: 99 },
      scene: { view: 'leader', note: 'The leader streams its change log; followers replay it in order.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Read scaling',
      title: 'Read from any replica',
      body: [
        `Because every follower holds a full copy, <em>reads</em> can be served by any of them. Point your read traffic at the followers and the leader is freed to do nothing but accept writes.`,
        `Add more followers and read capacity grows almost linearly — a read-heavy workload (the common case) scales out just by adding replicas.`,
      ],
      callout: { kind: 'tip', text: 'Reads scale with replica count; writes still funnel through the single leader. Replication scales reads, not writes — that is what partitioning is for.' },
      changes: ['+ reads fan out to followers', '~ leader handles writes only', '+ read throughput ↑'],
      metrics: { replicas: 5, rf: 5, lag: 15, availability: 99 },
      scene: { view: 'reads', note: 'Reads spread across replicas; the leader only writes.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Failover',
      title: 'When the leader dies, promote one',
      body: [
        `The leader will eventually fail. <span class="term">Failover</span> handles it: the cluster detects the dead leader, elects one up-to-date follower, and <b>promotes</b> it to be the new leader. Clients redirect their writes to it and service continues.`,
        `The copies that made reads cheap also make the system <b>highly available</b> — there is always another node ready to take the wheel.`,
      ],
      callout: { kind: 'insight', text: 'Failover turns N copies into high availability. The hard parts are detecting the failure correctly and not promoting two leaders at once (split-brain).' },
      changes: ['− old leader down', '+ follower promoted to leader', '~ writes resume'],
      metrics: { replicas: 4, rf: 4, lag: 20, availability: 98 },
      scene: { view: 'failover', note: 'A follower is promoted; writes resume with no data lost.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Sync vs async',
      title: 'How current must the copies be?',
      body: [
        `The key dial is <b>when</b> a write is acknowledged. With <span class="term">synchronous</span> replication the leader waits for replicas to confirm before telling the client "done" — no write is ever lost on failover, but every write pays the slowest replica's latency.`,
        `With <span class="term">asynchronous</span> replication the leader answers immediately and ships changes in the background — writes are fast, but a leader crash can lose the most recent, un-replicated writes. Most systems run a mix.`,
      ],
      callout: { kind: 'warn', text: 'Async replication means followers lag. Read from a lagging follower and you can read stale data — a correctness surprise, not just a performance one.' },
      metrics: { replicas: 3, rf: 3, lag: 35, availability: 99 },
      scene: { view: 'tradeoff', note: 'Synchronous = no loss but slower; asynchronous = fast but lossy.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What replication buys',
      body: [
        `Replication is the foundation of every distributed database: keep the data on several nodes and you get <b>durability</b> (copies survive failures), <b>read scalability</b> (serve reads from any replica), and <b>high availability</b> (promote a replica when a node dies).`,
        `The one knob to understand is synchrony — how current you force the copies to be — because it trades write latency against how much recent data a failover may lose.`,
      ],
      callout: { kind: 'insight', text: 'Replication copies the whole dataset for safety and read scale. To split a dataset too big for one node, you need partitioning — the next lesson.' },
      metrics: { replicas: 5, rf: 5, lag: 15, availability: 100 },
      scene: { view: 'recap', note: 'Many copies, one leader — durable, read-scalable, highly available.' },
    },
  ],
};
