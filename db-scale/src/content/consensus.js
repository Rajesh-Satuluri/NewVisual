/* content/consensus.js — the "Consensus" lesson, as DATA. Same shape as the
   other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/consensus-scene.js. */

export const consensusLesson = {
  id: 'consensus',
  title: 'Consensus',
  group: 'Distributed Systems',
  summary: 'How a group of unreliable, equal nodes agree on one value — and all learn the same one — even when messages are lost and machines crash. The problem beneath leader election, atomic commit and replicated logs.',
  minutes: 9,
  level: 'advanced',
  metrics: ['nodes2', 'votes', 'term', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why independent nodes struggle to pick one value', step: 0 },
    { text: 'Consensus = agreement + validity + termination', step: 1 },
    { text: 'A majority quorum makes a decision final and safe', step: 2 },
    { text: 'FLP: async + crashes means no guaranteed termination', step: 3 },
    { text: 'Majority-only progress costs latency but survives splits', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'One value',
      title: 'Everyone must choose the same thing',
      body: [
        `A cluster of equal nodes each receives a proposal — “the new leader is N3”, “the next log entry is <code>x=7</code>”. They must all <b>decide the same value</b>, and once decided it can never be taken back. Sounds easy, until you remember the network: messages arrive late, out of order, or <span class="term">not at all</span>, and any node can crash mid-sentence.`,
        `You already saw two-phase commit freeze when the coordinator died, and three-phase commit still break under a partition. Neither is <span class="term">partition-safe</span>. So how does a group reach a decision that is guaranteed to be unique — with no single machine it depends on?`,
      ],
      callout: { kind: 'warn', text: 'With lost messages and crashing nodes, “just take a vote” is not enough: two nodes can each believe a different value won. Consensus is the problem of deciding one value, safely, anyway.' },
      metrics: { nodes2: 5, votes: 0, term: 1, availability: 100 },
      scene: { view: 'problem', note: 'Five peers, three different proposals, a lossy network — who decides, and how do all agree?' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Define it',
      title: 'A consensus protocol with three guarantees',
      body: [
        `A <span class="term">consensus protocol</span> is a set of rules every node follows that provably delivers three properties. <b>Agreement</b>: no two nodes ever decide different values. <b>Validity</b>: the value decided was actually proposed by someone — it isn’t invented. <b>Termination</b>: non-faulty nodes eventually decide.`,
        `The first two are <span class="term">safety</span> (nothing bad ever happens); the third is <span class="term">liveness</span> (something good eventually happens). A correct protocol never sacrifices safety — it would rather pause than let two values win.`,
      ],
      callout: { kind: 'insight', text: 'Consensus = Agreement + Validity + Termination. Agreement and validity are safety and must hold always; termination is liveness and may be delayed when the network misbehaves.' },
      changes: ['+ rule everyone follows', '✓ agreement · validity · termination', '~ safety outranks liveness'],
      metrics: { nodes2: 5, votes: 0, term: 1, availability: 100 },
      scene: { view: 'define', note: 'The three promises every consensus protocol must keep — safety first.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Majority',
      title: 'Decide by majority, and overlap makes it final',
      body: [
        `The engine of safety is the <span class="term">quorum</span>: a value is decided only once a <b>majority</b> of nodes accept it. Because any two majorities of the same cluster must share at least one node, a second, different value can never also gather a majority — that shared node refuses it.`,
        `So one decision, and only one, can ever stick. And because a majority survives any <em>minority</em> of crashes, a decided value lives on even if some nodes die right after accepting it. Majority acceptance is both the safety rule and the durability rule.`,
      ],
      callout: { kind: 'insight', text: 'A value is decided when a majority accepts it. Overlapping majorities make two different decisions impossible, and a surviving majority keeps the decision durable through minority failures.' },
      changes: ['+ accept needs a majority', '✓ overlap blocks a rival value', '✓ decision survives minority crashes'],
      metrics: { nodes2: 5, votes: 3, term: 2, availability: 100 },
      scene: { view: 'majority', note: 'Three of five accept x=7 — a majority. No rival value can also reach three.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'FLP',
      title: 'The catch: you cannot guarantee it always finishes',
      body: [
        `There is a famous limit — the <span class="term">FLP result</span>. In a fully asynchronous network (no bound on message delay) where even one node may crash, <b>no deterministic protocol can guarantee termination</b>. A node can never tell “crashed” apart from “just slow”, so it may wait forever for the vote that settles things.`,
        `Real systems dodge this without breaking safety: they add <span class="term">timeouts</span> and a little <span class="term">randomness</span> (random election delays) so that, in practice, the cluster stops dithering and decides. Safety is never at risk — only how long liveness takes.`,
      ],
      callout: { kind: 'warn', text: 'FLP: in a purely async network with crashes, no protocol can promise it always terminates. Practical protocols add timeouts and randomness to make progress likely — never trading away agreement to do it.' },
      metrics: { nodes2: 5, votes: 2, term: 3, availability: 100 },
      scene: { view: 'flp', note: 'Is N4 crashed or just slow? Unanswerable — so termination needs timeouts, not pure logic.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Price',
      title: 'Majority-only progress: the CP tax',
      body: [
        `Consensus is unavoidably <span class="term">CP</span>. When a partition splits the cluster, only the side with a majority can decide; the minority side must <b>stop</b> accepting writes rather than risk a second decision. You trade the minority’s availability for a rock-solid guarantee of agreement.`,
        `It also costs <span class="term">round-trips</span>: every decision needs a proposer to reach and hear back from a majority, so latency rises with cluster size and distance. That is why consensus clusters stay small (3, 5, 7) and why not every write goes through them — but when you truly need one answer, it is the only partition-safe way to get it.`,
      ],
      callout: { kind: 'tip', text: 'Consensus favours consistency over availability (CP): the minority halts during a split, and each decision pays extra round-trips. Keep clusters small and route only decisions that must be unique through it.' },
      changes: ['− minority halts on a split', '+ extra round-trips per decision', '✓ still the only partition-safe agreement'],
      metrics: { nodes2: 5, votes: 3, term: 4, availability: 60 },
      scene: { view: 'partition', note: 'Split 3–2: the majority decides, the minority halts. Consistency bought with availability.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The foundation everything agreement rests on',
      body: [
        `Consensus takes a crowd of unreliable equals and makes them act as one reliable decider: majority acceptance gives agreement and durability, safety always outranks liveness, and timeouts tame the FLP limit in practice.`,
        `<b>Paxos</b> and <b>Raft</b> are the famous implementations — both commit a value once a majority accepts it, with Raft trading some of Paxos’s generality for being understandable (that’s next). Underneath, <span class="term">leader election</span>, <span class="term">replicated state machines</span> and <span class="term">distributed locks</span> all reduce to this one problem.`,
      ],
      callout: { kind: 'insight', text: 'Agree by majority, never break safety, lean on timeouts for liveness — that is consensus. Paxos and Raft implement it, and leader election, replicated logs and distributed locks all reduce to it.' },
      metrics: { nodes2: 5, votes: 3, term: 4, availability: 100 },
      scene: { view: 'recap', note: 'One agreed value across the cluster — the backbone of coordinated distributed systems.' },
    },
  ],
};
