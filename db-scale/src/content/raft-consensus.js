/* content/raft-consensus.js — the "Raft Consensus" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/raft-consensus-scene.js. */

export const raftConsensusLesson = {
  id: 'raft-consensus',
  title: 'Raft Consensus',
  group: 'Distributed Systems',
  summary: 'How a cluster of unreliable machines agrees on one ordered history — an elected leader, a replicated log, and the quiet power of a majority.',
  minutes: 11,
  level: 'intermediate',
  metrics: ['nodes2', 'term', 'votes', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why independent nodes can’t just decide for themselves', step: 0 },
    { text: 'Leader election: a term, a candidate, a majority of votes', step: 1 },
    { text: 'The replicated log — the leader is the only writer', step: 2 },
    { text: 'Commit means a majority has it, not just the leader', step: 3 },
    { text: 'Under a partition, the minority stalls instead of diverging', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Agree',
      title: 'Five machines, one history',
      body: [
        `Replication copied your data onto many nodes — but now they must agree on the <em>order</em> of operations. If each node accepts writes on its own, their logs drift apart and there is no single truth to read back.`,
        `You can’t just “ask the nodes” either: messages are lost, reordered and delayed, and any node can crash at the worst moment. No single machine can be trusted to decide for everyone.`,
      ],
      callout: { kind: 'warn', text: 'Independent writers diverge. The job of consensus is to make a flock of unreliable nodes behave like one reliable, ordered log.' },
      metrics: { nodes2: 5, term: 0, votes: 0, availability: 0 },
      scene: { view: 'problem', note: 'Five peers, five slightly different logs — and no agreed order.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'Election',
      title: 'Elect one leader per term',
      body: [
        `Raft gives time a counter called the <span class="term">term</span>. When a node stops hearing from a leader, it times out, becomes a <b>candidate</b>, bumps the term, votes for itself, and sends <code>RequestVote</code> to everyone else.`,
        `Each node votes for at most one candidate per term. Win a <span class="term">majority</span> — here 3 of 5 — and you are the leader for that term. Because two candidates can’t both get a majority, every term has at most one leader.`,
      ],
      callout: { kind: 'insight', text: 'A majority (quorum) is the whole trick: any two majorities of the same cluster must overlap, so they can never crown two leaders in one term.' },
      changes: ['+ term 0 → 1', '~ candidate requests votes', '+ 3 / 5 → leader'],
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 0 },
      scene: { view: 'election', note: 'A candidate bumps the term and collects a majority of votes.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Replicate',
      title: 'One writer, one log',
      body: [
        `Clients send every command to the <b>leader</b>. It appends the command to its own log, then ships the new entries to each follower with <code>AppendEntries</code>. Followers copy them into the <em>same positions, in the same order</em>.`,
        `Only the leader ever appends, so there is exactly one authority for “what comes next.” Followers that fall behind or disagree are made to match the leader’s log, entry by entry.`,
      ],
      callout: { kind: 'tip', text: 'Funnelling all writes through one leader turns “agree on an order” into “copy the leader’s log” — a far simpler problem.' },
      changes: ['+ leader appends entry', '→ AppendEntries to followers', '~ followers copy in order'],
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 80 },
      scene: { view: 'log', note: 'The leader appends, then replicates entries to the followers.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'Commit',
      title: 'Committed means a majority has it',
      body: [
        `An entry is not safe just because the leader wrote it — the leader might crash next. Raft calls an entry <span class="term">committed</span> only once a <b>majority</b> of nodes have stored it. Then, and only then, the leader applies it to its state machine and tells followers to apply it too.`,
        `Because every future leader must be elected by a majority, and that majority already holds all committed entries, committed history can never be lost or reordered. Reads after commit see the same result everywhere.`,
      ],
      callout: { kind: 'insight', text: 'Durability by quorum: once ⌈N/2⌉+1 nodes hold an entry, no election can produce a leader that lacks it. Commit is permanent.' },
      changes: ['+ majority stored entry', '+ entry COMMITTED', '→ applied on every node'],
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 100 },
      scene: { view: 'commit', note: 'A majority holds the entry → it is committed and applied everywhere.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Partition',
      title: 'A minority must stand still',
      body: [
        `Split the network and the cluster breaks into two sides. The side with a <b>majority</b> can still elect a leader and commit — it keeps serving. The <span class="term">minority</span> side cannot reach a quorum, so it can neither elect a leader nor commit anything new.`,
        `That stall is deliberate. Raft would rather the minority be <em>unavailable</em> than let it accept writes that would fork history. When the partition heals, the minority rejoins and catches up from the leader.`,
      ],
      callout: { kind: 'warn', text: 'Consensus chooses consistency over availability: on the wrong side of a partition you wait. Safety is never traded for uptime.' },
      changes: ['~ network splits 3 | 2', '+ majority keeps committing', '− minority stalls (no quorum)'],
      metrics: { nodes2: 3, term: 1, votes: 3, availability: 60 },
      scene: { view: 'partition', note: 'Majority side keeps going; the minority stalls rather than diverge.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One log, agreed by majority',
      body: [
        `Raft is three moving parts: <b>elect</b> one leader per term by majority vote, <b>replicate</b> the leader’s log to the followers, and <b>commit</b> an entry once a majority holds it. Every node then applies the same commands in the same order.`,
        `The result is a single, fault-tolerant, totally-ordered log — the backbone under replicated databases, config stores and lock services. Lose a minority of nodes and the system keeps its word.`,
      ],
      callout: { kind: 'insight', text: 'Elect · Replicate · Commit. A majority quorum ties them together, surviving any minority of crashes and partitions.' },
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 100 },
      scene: { view: 'recap', note: 'Identical logs on every node — one agreed history.' },
    },
  ],
};
