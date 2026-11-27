/* content/network-partition.js — the "Network Partition" lesson, as DATA. Same
   shape as the other db-scale lessons: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/network-partition-scene.js. */

export const networkPartitionLesson = {
  id: 'network-partition',
  title: 'Network Partition',
  group: 'Distributed Systems',
  summary: 'When the network splits a cluster into islands that cannot talk — though every node is alive. It is indistinguishable from a slow link or a dead peer, and it forces the hardest choice in distributed systems.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'availability', 'partitions', 'suspected'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A partition cuts the cluster yet leaves every node healthy', step: 0 },
    { text: 'You cannot tell a partition from a slow or crashed peer', step: 1 },
    { text: 'CP: only the majority acts, the minority refuses writes', step: 2 },
    { text: 'AP: both sides serve and reconcile later', step: 3 },
    { text: 'During a partition you must pick consistency or availability', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The split',
      title: 'The network cuts the cluster in two',
      body: [
        `A switch dies, a cable is pulled, a cloud zone loses its link. Suddenly the cluster is torn into two groups that <b>cannot reach each other</b> — yet every node is perfectly healthy, still running, still answering clients that happen to reach it.`,
        `This is a <span class="term">network partition</span>: not a crash, not a slowdown, but a <em>split</em>. Each island believes it is the whole world. The danger is that both keep accepting work while blind to the other.`,
      ],
      callout: { kind: 'warn', text: 'A partition leaves nodes alive but unable to communicate. Each side can keep serving clients while completely unaware the other side even exists.' },
      metrics: { nodes2: 5, availability: 100, partitions: 1, suspected: 0 },
      scene: { view: 'split', note: 'One switch fails and the cluster becomes two islands — both still alive.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Looks like what?',
      title: 'A partition looks exactly like a dead peer',
      body: [
        `Here is the cruel part. From one node's point of view, a partitioned peer and a <b>crashed</b> peer and a merely <b>slow</b> peer are <em>identical</em>: all three just mean “I sent a message and heard nothing back.”`,
        `You cannot wait forever to be sure, and you cannot know the difference. So a node must <span class="term">guess</span> — and whatever it guesses, it may be wrong, which is why partition handling is so hard.`,
      ],
      callout: { kind: 'insight', text: 'Silence is ambiguous: a partition, a crash and a slow network are indistinguishable from the outside. Every timeout is a guess that might be wrong.' },
      metrics: { nodes2: 5, availability: 100, partitions: 1, suspected: 2 },
      scene: { view: 'ambiguous', note: 'No reply could mean crashed, slow, or partitioned — the sender cannot tell.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'CP side',
      title: 'Consistency first: only the majority acts',
      body: [
        `One answer is to pick <span class="term">consistency</span>. Require a quorum — a majority — for every write. During a split, only the side holding more than half the nodes can reach quorum, so <b>only it keeps writing</b>. The minority side detects it is outnumbered and <b>refuses writes</b>, staying read-only.`,
        `There is at most one majority, so there is at most one source of truth. No two sides ever diverge. The cost: the minority is <em>unavailable</em> for writes until the partition heals.`,
      ],
      callout: { kind: 'tip', text: 'A CP system lets only the majority side accept writes; the minority halts. One truth is preserved, but the minority goes dark until the network recovers.' },
      changes: ['+ majority side keeps writing', '− minority side refuses writes', '✓ no divergence possible'],
      metrics: { nodes2: 5, availability: 60, partitions: 1, suspected: 2 },
      scene: { view: 'cp', note: 'Three-node majority keeps serving; the two-node minority goes read-only.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'AP side',
      title: 'Availability first: both sides keep serving',
      body: [
        `The other answer is to pick <span class="term">availability</span>. Let <b>both</b> sides keep accepting reads and writes, even while partitioned. No client is ever told “no” — every island stays up.`,
        `The price is that the two sides <span class="term">diverge</span>: they accept conflicting writes and must <b>reconcile later</b>, once they can talk again, using version vectors, last-writer-wins, or merge logic. You traded a clean single truth for always-on service.`,
      ],
      callout: { kind: 'warn', text: 'An AP system keeps both sides writable during a partition, so they diverge and must be reconciled afterward — risking lost updates or a split-brain if reconciliation is sloppy.' },
      changes: ['+ both sides keep writing', '~ versions diverge across the split', '+ reconcile when the partition heals'],
      metrics: { nodes2: 5, availability: 100, partitions: 1, suspected: 0 },
      scene: { view: 'ap', note: 'Both islands keep writing — divergence now, reconciliation later.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Pick one',
      title: 'During a partition, you must choose',
      body: [
        `This is the heart of the <span class="term">CAP theorem</span>. Partitions are not optional — on a real network they <b>will</b> happen. And while one is happening, you cannot have both perfect consistency <em>and</em> full availability. You get to keep one.`,
        `Fencing and quorums (CP) stop split-brain but take the minority offline. Serving everywhere (AP) stays up but risks divergence. The right call depends on the data: a bank balance wants CP; a shopping cart or “like” counter is happy with AP.`,
      ],
      callout: { kind: 'insight', text: 'CAP: when partitioned, choose consistency (halt the minority) or availability (let both sides diverge). You cannot have both — pick per the data’s needs.' },
      metrics: { nodes2: 5, availability: 80, partitions: 1, suspected: 1 },
      scene: { view: 'cap', note: 'The fork in the road: CP halts the minority, AP keeps both sides live.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Design the behavior before the split happens',
      body: [
        `Partitions are a fact of distributed life, not an edge case. The question is never “will the network split?” but “what happens <em>when</em> it does?” — and that behavior must be chosen deliberately, long before the cable is pulled.`,
        `Choose CP and you must handle minority downtime; choose AP and you must handle reconciliation. Either way the next problems are the same two: a <b>split-brain</b> if you choose wrong, and <b>recovery</b> once the partition finally heals.`,
      ],
      callout: { kind: 'insight', text: 'Partitions are inevitable. Decide up front whether each piece of data favors consistency or availability — then build the healing and anti-split-brain path to match.' },
      metrics: { nodes2: 5, availability: 100, partitions: 0, suspected: 0 },
      scene: { view: 'recap', note: 'One cluster, healed — because its partition behavior was designed in advance.' },
    },
  ],
};
