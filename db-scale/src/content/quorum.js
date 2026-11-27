/* content/quorum.js — the "Quorum" lesson, as DATA. Same shape as the other
   db-scale lessons: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/quorum-scene.js. */

export const quorumLesson = {
  id: 'quorum',
  title: 'Quorum',
  group: 'Distributed Systems',
  summary: 'How a cluster agrees without a central boss: require a majority for every decision, and lean on the fact that any two majorities must overlap.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'votes', 'availability', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a lone node must never decide alone', step: 0 },
    { text: 'A quorum is a majority: ⌈N/2⌉+1', step: 1 },
    { text: 'Any two majorities always intersect', step: 2 },
    { text: 'A partition lets only the majority side act', step: 3 },
    { text: 'Why odd cluster sizes beat even ones', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Who decides?',
      title: 'If anyone can decide, nobody agrees',
      body: [
        `A cluster has no boss — every node is a peer. So who gets to say a value is <em>committed</em>? If the answer is “whoever acts first,” you have a problem: let the network split the cluster in two, and each half can happily decide something <b>different</b>.`,
        `One side marks an order <span class="term">paid</span>, the other marks it <span class="term">cancelled</span> — and both think they won. This is <span class="term">split-brain</span>, and it comes straight from letting a minority act on its own.`,
      ],
      callout: { kind: 'warn', text: 'If any node (or small group) can decide alone, a network split lets two halves commit opposite things. Agreement needs a rule that only one group can ever satisfy.' },
      metrics: { nodes2: 5, votes: 1, availability: 100, latency: 20 },
      scene: { view: 'why', note: 'Two peers, a split network, two opposite decisions — and no referee.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Majority',
      title: 'Require a majority — a quorum',
      body: [
        `The rule: no decision counts until a <span class="term">quorum</span> of nodes agrees, where a quorum is a strict majority — <code>⌈N/2⌉+1</code>. For five nodes, that is three.`,
        `Now a single node, or any minority, simply <b>cannot</b> commit anything. To make a change you must round up more than half the cluster, so the decision is never one machine’s private opinion.`,
      ],
      callout: { kind: 'insight', text: 'A quorum is a majority: ⌈N/2⌉+1. Require one for every decision and, at most, only one group can ever hold it at a time.' },
      changes: ['+ quorum rule: majority to act', '~ minorities can no longer commit', '+ 3 of 5 = a quorum'],
      metrics: { nodes2: 5, votes: 3, availability: 100, latency: 30 },
      scene: { view: 'majority', note: 'Three of five form a quorum — a proposal needs their votes to pass.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Intersection',
      title: 'Any two majorities must overlap',
      body: [
        `Here is the magic that makes quorums <em>safe</em>, not just democratic. Pick any two majorities of the same cluster. Because each holds more than half the nodes, they <b>cannot be disjoint</b> — there is always at least one node in both.`,
        `That shared node remembers what it already agreed to, so two majorities can never approve contradictory decisions. Overlap turns “a majority” into “the single source of truth.”`,
      ],
      callout: { kind: 'insight', text: 'Any two majorities of N share at least one node. That guaranteed overlap is what makes two contradictory decisions impossible.' },
      metrics: { nodes2: 5, votes: 3, availability: 100, latency: 30 },
      scene: { view: 'intersect', note: 'Majority A and majority B must share a node — it holds the line.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Partition',
      title: 'Under a split, only the majority acts',
      body: [
        `Now cut the five-node cluster into a group of three and a group of two. The <b>three-side</b> still has a quorum, so it keeps serving writes. The <b>two-side</b> cannot reach three, so it must <span class="term">stop</span> — it refuses writes rather than risk diverging.`,
        `The minority stays available for reads of what it already knows, but it will not invent new decisions. There is only ever one majority, so there is only ever one truth.`,
      ],
      callout: { kind: 'tip', text: 'During a partition only the side holding a majority may act; the minority halts. You trade the minority’s availability for a guarantee of consistency.' },
      changes: ['+ majority side keeps writing', '− minority side halts writes', '✓ no split-brain possible'],
      metrics: { nodes2: 5, votes: 3, availability: 60, latency: 45 },
      scene: { view: 'partition', note: 'Three can act, two must wait — the split produces no contradiction.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Odd N',
      title: 'Why clusters prefer odd numbers',
      body: [
        `If a majority is the goal, an <b>even</b> cluster has a nasty failure: six nodes can split cleanly into <span class="term">three and three</span>. Neither side is a majority, so <em>neither</em> can act — the whole cluster deadlocks.`,
        `Five nodes can only split 3–2, and the 3 always wins. In fact a 6-node cluster tolerates the same single-node failures as a 5-node one, at higher cost — so real systems run <b>3, 5, or 7</b> nodes, never even counts.`,
      ],
      callout: { kind: 'warn', text: 'An even N can split into two equal halves with no majority — a deadlock. Odd sizes avoid ties and tolerate the same failures more cheaply.' },
      metrics: { nodes2: 6, votes: 3, availability: 0, latency: 999 },
      scene: { view: 'even', note: 'Six nodes, split 3–3: no majority, no progress. Prefer odd N.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Majorities that overlap act as one',
      body: [
        `A quorum turns a crowd of equal peers into a single decision-maker: require a majority, and because majorities always intersect, the cluster can never contradict itself — even across crashes and partitions.`,
        `This one idea sits underneath nearly everything that follows — <b>leader election</b>, <b>consensus</b> (Raft, Paxos) and <b>replicated writes</b> all commit by quorum. Keep N odd and let the majority speak.`,
      ],
      callout: { kind: 'insight', text: 'Intersecting majorities let many nodes act as one — the backbone of consensus, leader election and replicated writes. Prefer odd N.' },
      metrics: { nodes2: 5, votes: 3, availability: 100, latency: 35 },
      scene: { view: 'recap', note: 'One quorum, one truth — the foundation for agreement at scale.' },
    },
  ],
};
