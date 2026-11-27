/* content/consistency-and-consensus.js — the "Consistency & Consensus" lesson
   (DDIA ch.9), as DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/consistency-and-consensus-scene.js. */

export const consistencyAndConsensusLesson = {
  id: 'consistency-and-consensus',
  title: 'Consistency & Consensus',
  group: 'Data-Intensive (DDIA)',
  summary: 'A ladder of consistency guarantees — from eventual, up through causal, to linearizable — and why the top rungs all rest on one hard primitive: consensus.',
  minutes: 9,
  level: 'advanced',
  metrics: ['nodes2', 'votes', 'availability', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why “eventual” is the weakest useful guarantee', step: 0 },
    { text: 'Consistency is a ladder, not a switch', step: 1 },
    { text: 'Causal is the strongest model that survives a partition', step: 2 },
    { text: 'Linearizability = total-order broadcast = consensus', step: 3 },
    { text: 'Coordination costs latency and availability', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Weak by default',
      title: 'Eventual consistency promises very little',
      body: [
        `Replicate for availability and your replicas drift: a write lands on one copy and trickles to the others. In between, two clients reading the “same” key can get <b>different</b> answers — and a client can even read a value <em>older</em> than one it saw a moment ago.`,
        `Eventual consistency only promises that <em>if writes stop</em>, the copies will someday agree. That is easy to provide and cheap to run, but it hands the application a pile of anomalies to reason about. Most apps need a firmer promise — at least somewhere.`,
      ],
      callout: { kind: 'warn', text: 'Eventual consistency is the floor: copies converge only once writes stop, and until then reads may disagree or go backwards. Useful, but a weak contract.' },
      metrics: { nodes2: 3, votes: 0, availability: 100, latency: 8 },
      scene: { view: 'weak', note: 'Three replicas mid-drift — two clients read the same key and get different values.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'The ladder',
      title: 'Consistency is a ladder of guarantees',
      body: [
        `“Consistent” is not one thing. Between eventual and perfect lies a ladder of <span class="term">guarantees</span>, each stronger than the last: <b>read-your-writes</b> (you always see your own updates), <b>monotonic reads</b> (time never runs backward for you), <b>causal</b> (cause precedes effect everywhere), and at the top <b>linearizability</b> (the system behaves as a single, up-to-date copy).`,
        `Each rung rules out more anomalies — and asks for more coordination between nodes. The engineering question is never “strong or weak?” but “which rung does this operation actually need?”`,
      ],
      callout: { kind: 'insight', text: 'Pick a rung, not a side. Higher rungs forbid more anomalies but demand more coordination. Match the guarantee to what the operation truly requires.' },
      changes: ['+ read-your-writes', '+ monotonic reads', '+ causal order', '+ linearizable (top)'],
      metrics: { nodes2: 3, votes: 0, availability: 100, latency: 12 },
      scene: { view: 'ladder', note: 'From eventual at the floor to linearizable at the top — each rung forbids more anomalies.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Causal',
      title: 'Causal: the strongest model that stays available',
      body: [
        `<span class="term">Causal consistency</span> keeps cause before effect: if a write B was made <em>after</em> seeing write A, every replica applies A before B. Operations that are genuinely <b>concurrent</b> (neither saw the other) may still be ordered differently on different nodes — and that freedom is exactly what makes it cheap.`,
        `Because it only tracks <em>happens-before</em> (via version vectors), causal order needs <b>no global agreement</b>. So it keeps working on <em>both</em> sides of a network partition — it is the strongest guarantee a system can offer while staying fully available.`,
      ],
      callout: { kind: 'tip', text: 'Causal consistency preserves cause→effect using version vectors, not coordination — so it survives partitions. It is the ceiling for “available under CAP”.' },
      metrics: { nodes2: 3, votes: 0, availability: 100, latency: 15 },
      scene: { view: 'causal', note: 'A→B causal chain preserved on every replica; concurrent writes may reorder — no coordination needed.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Consensus',
      title: 'Linearizability is total-order broadcast is consensus',
      body: [
        `The top rung, <span class="term">linearizability</span>, demands a single <b>total order</b> that every node agrees on — as if there were one copy. Delivering the same ordered log of operations to every node is called <span class="term">total-order broadcast</span>, and doing that reliably is precisely the <span class="term">consensus</span> problem.`,
        `A leader sequences operations and commits each once a <b>quorum</b> has stored it; the committed log replays identically everywhere. Remarkably, a linearizable register, atomic commit, a uniqueness constraint, and leader election are all <em>equivalent</em> — each one reduces to consensus.`,
      ],
      callout: { kind: 'insight', text: 'Total-order broadcast ≈ repeated consensus: a leader + quorum commit one agreed log. Linearizable storage, atomic commit and leader election all reduce to it.' },
      changes: ['+ leader sequences ops', '+ quorum commits each entry', '= one total order, replayed everywhere'],
      metrics: { nodes2: 5, votes: 3, availability: 100, latency: 45 },
      scene: { view: 'broadcast', note: 'Leader sequences the log; a quorum commits each entry; every node delivers the same order.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The price',
      title: 'Coordination costs latency and availability',
      body: [
        `Consensus is not free. Every linearizable operation waits for a round trip to a majority, so <b>latency</b> rises — and across datacenters it rises a lot. Worse, under a partition only the side holding a <b>quorum</b> can make progress; the minority side must <span class="term">stop</span> serving writes. That is the CAP tax: linearizability gives up availability to keep a single truth.`,
        `So spend coordination deliberately. Use the <b>weakest</b> guarantee that is still correct: causal or read-your-writes for most paths, and pay for linearizability only where it genuinely matters — a unique username, a bank balance, electing one leader.`,
      ],
      callout: { kind: 'warn', text: 'Linearizability costs a majority round-trip and makes the minority side unavailable under a partition. Reserve it for the few operations that truly need one truth.' },
      metrics: { nodes2: 5, votes: 3, availability: 60, latency: 90 },
      scene: { view: 'cost', note: 'Partition: the majority keeps committing, the minority halts — linearizability trades availability for one order.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Know which rung you need',
      body: [
        `Consistency is a ladder: eventual at the floor, causal as the highest rung that stays available under partition, linearizability at the top where the system acts as one copy. The higher you climb, the more coordination — and the more a partition hurts.`,
        `Underneath every strong guarantee sits the same engine: <b>consensus</b>, a leader plus a quorum agreeing on one ordered log. Climb only as high as the operation demands, and pay the coordination tax just where it buys correctness you actually need.`,
      ],
      callout: { kind: 'insight', text: 'Eventual → causal → linearizable. Causal is the ceiling for availability; linearizability needs consensus. Use the weakest rung that stays correct.' },
      metrics: { nodes2: 5, votes: 3, availability: 100, latency: 40 },
      scene: { view: 'recap', note: 'One ladder, one engine: climb as high as you must, and no higher.' },
    },
  ],
};
