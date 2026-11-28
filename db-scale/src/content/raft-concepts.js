/* content/raft-concepts.js — the "Raft Concepts" lesson, as DATA. Same shape as
   the other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/raft-concepts-scene.js.

   This is the VOCABULARY lesson: the handful of building blocks — states,
   terms, the replicated log, strong leadership, and the safety rules — that
   make Raft understandable. The sibling raft-consensus lesson walks the full
   protocol; here we name the parts. */

export const raftConceptsLesson = {
  id: 'raft-concepts',
  title: 'Raft Concepts',
  group: 'Distributed Systems',
  summary: 'The vocabulary that makes consensus understandable: three node states, a term clock, one replicated log, and two small safety rules — the parts Raft is built from.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'term', 'votes', 'messages'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why consensus feels impossibly subtle to reason about', step: 0 },
    { text: 'Every node is a follower, candidate, or leader', step: 1 },
    { text: 'A term is a logical clock — one leader per term', step: 2 },
    { text: 'One replicated log; an entry commits at a majority', step: 3 },
    { text: 'Strong leadership trades throughput for clarity', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Hard to reason',
      title: 'Consensus is notoriously hard to think about',
      body: [
        `A handful of machines must agree on one history of events, even while messages drop, nodes crash, and clocks drift. The classic algorithm for this — <span class="term">Paxos</span> — is correct, but famous for being almost impossible to understand or implement from the paper alone.`,
        `The trouble is that everything happens at once: who is in charge, what order events go in, and what counts as “decided” all tangle together. Without names for the moving parts, you cannot hold the problem in your head.`,
      ],
      callout: { kind: 'warn', text: 'Consensus is subtle because leadership, ordering, and commitment are all entangled. Paxos is correct but famously hard to follow — which is exactly the gap Raft set out to close.' },
      metrics: { nodes2: 5, term: 0, votes: 0, messages: 0 },
      scene: { view: 'problem', note: 'Five peers, no agreed order, no vocabulary to pin the problem down.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Three states',
      title: 'Raft decomposes it into a few named parts',
      body: [
        `Raft’s whole trick is <b>understandability</b>: break consensus into separate sub-problems — <span class="term">leader election</span>, <span class="term">log replication</span>, and <span class="term">safety</span> — each with its own small set of rules.`,
        `The first building block is the node <b>state</b>. At any moment every node is exactly one of three: a <span class="term">follower</span> (passive, obeys the leader), a <span class="term">candidate</span> (campaigning for votes), or the <span class="term">leader</span> (the single node that handles all client writes). Timeouts drive the transitions between them.`,
      ],
      callout: { kind: 'insight', text: 'Every node is a follower, a candidate, or a leader. A follower that hears nothing times out and becomes a candidate; a candidate that wins a majority becomes the leader.' },
      changes: ['+ states: follower · candidate · leader', '+ decomposed: election + replication + safety', '~ timeouts drive every transition'],
      metrics: { nodes2: 5, term: 1, votes: 0, messages: 0 },
      scene: { view: 'states', note: 'Three states, one cycle: follower → candidate → leader, and back on failure.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Terms',
      title: 'A term is a logical clock',
      body: [
        `Raft divides time into <span class="term">terms</span> — numbered <code>1, 2, 3, …</code> and only ever increasing. A term begins with an election; the winner serves as leader for the rest of that term. Terms are a <b>logical clock</b>, not a wall clock: they count elections, not seconds.`,
        `The rule that makes them powerful: <b>at most one leader per term</b>. Every message carries its sender’s term, so a node that sees a higher term immediately knows it is stale, steps down to follower, and catches up. Old leaders can never overwrite newer ones.`,
      ],
      callout: { kind: 'insight', text: 'A term is a monotonic counter bumped on each election. At most one leader exists per term, and a higher term always wins — so stale leaders quietly step down.' },
      changes: ['+ term counter (logical clock)', '+ rule: ≤ 1 leader per term', '~ higher term → stale node steps down'],
      metrics: { nodes2: 5, term: 2, votes: 3, messages: 4 },
      scene: { view: 'terms', note: 'Terms climb 1 → 2 → 3; each election bumps the clock and crowns one leader.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'The log',
      title: 'One replicated log, committed by majority',
      body: [
        `The heart of Raft is the <span class="term">replicated log</span>: an ordered list of commands that every node stores. Only the leader appends; it then streams each new entry to followers (an <code>AppendEntries</code> RPC) so their logs become byte-for-byte copies in the same order.`,
        `An entry is <span class="term">committed</span> the moment it is safely stored on a <b>majority</b> of nodes — ⌈N/2⌉+1. Once committed, it is applied to the state machine and can never be lost: any future leader is guaranteed to already have it. Each entry is tagged with the term it was created in, which is how nodes spot and repair divergence.`,
      ],
      callout: { kind: 'insight', text: 'The leader owns the only log that matters; followers copy it in order. An entry commits once a majority holds it, and a committed entry is permanent — the single source of truth.' },
      changes: ['+ replicated log (ordered commands)', '+ leader appends → AppendEntries → followers', '✓ entry committed at a majority = durable'],
      metrics: { nodes2: 5, term: 2, votes: 3, messages: 8 },
      scene: { view: 'log', note: 'Leader appends #4; followers copy in order; #1–#3 already held by a majority.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Strong leader',
      title: 'Strong leadership: simple, but a bottleneck',
      body: [
        `Routing <b>every</b> write through a single leader is what keeps Raft easy to reason about — there is one authority on order, so there is never a conflict to merge. But it has a cost: the leader is a <span class="term">throughput bottleneck</span> and a single point of coordination.`,
        `Worse, when the leader crashes the cluster <b>cannot serve writes</b> until a follower times out, wins an election, and takes over — a brief <span class="term">failover gap</span> of a few hundred milliseconds. Safety is preserved by two rules: a candidate needs a majority <i>and</i> an at-least-as-up-to-date log, so a node missing committed entries can never win.`,
      ],
      callout: { kind: 'warn', text: 'The single leader is a bottleneck and a failover gap: on its crash, writes pause until a new election completes. Strong leadership buys clarity at the price of peak throughput.' },
      changes: ['− single leader caps write throughput', '− leader crash → short failover gap', '✓ up-to-date-log rule keeps elections safe'],
      metrics: { nodes2: 5, term: 3, votes: 3, messages: 6 },
      scene: { view: 'tradeoff', note: 'Leader crashes; writes stall; a follower with the fullest log must win next.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'A small vocabulary that runs the internet',
      body: [
        `That is the whole kit: three <b>states</b>, a <b>term</b> clock with one leader each, a single <b>replicated log</b> committed by <b>majority</b>, and two safety rules. Name those parts and the once-impenetrable problem of consensus becomes something you can actually follow.`,
        `These exact concepts power the systems coordinating much of modern infrastructure — <b>etcd</b> (and therefore Kubernetes), <b>Consul</b>, <b>CockroachDB</b>, and <b>TiKV</b> all run Raft underneath. Learn the vocabulary once and every one of them reads the same.`,
      ],
      callout: { kind: 'insight', text: 'States + terms + one replicated log + majority commit + safety rules = Raft. The same five ideas underpin etcd, Consul, CockroachDB, and TiKV.' },
      metrics: { nodes2: 5, term: 3, votes: 3, messages: 8 },
      scene: { view: 'recap', note: 'One leader, one log, one agreed order — the building blocks, assembled.' },
    },
  ],
};
