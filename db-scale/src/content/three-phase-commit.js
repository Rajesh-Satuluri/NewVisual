/* content/three-phase-commit.js — the "Three-Phase Commit" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/three-phase-commit-scene.js. */

export const threePhaseCommitLesson = {
  id: 'three-phase-commit',
  title: 'Three-Phase Commit',
  group: 'Distributed Systems',
  summary: 'Why two-phase commit blocks when the coordinator dies, and how an extra "pre-commit" round makes the protocol non-blocking under crashes — though still not under partitions.',
  minutes: 9,
  level: 'advanced',
  metrics: ['messages', 'latency', 'availability', 'nodes2'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why 2PC blocks when the coordinator crashes', step: 0 },
    { text: 'Add a pre-commit phase so no one commits alone', step: 1 },
    { text: 'The three rounds: can-commit, pre-commit, do-commit', step: 2 },
    { text: 'A recovery node can finish or abort safely', step: 3 },
    { text: 'Why 3PC still fails under a network partition', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Blocked',
      title: 'Two-phase commit can get stuck',
      body: [
        `In <span class="term">two-phase commit</span>, a coordinator asks every participant to <b>prepare</b>, collects their yes votes, then broadcasts <b>commit</b>. It works — until the coordinator <span class="term">crashes</span> at the worst moment: right after everyone voted yes, but before the decision is sent.`,
        `Now each participant is stuck. It voted yes, so it may not abort unilaterally; but it never heard “commit,” so it may not commit either. It just <b>waits</b> — holding locks, blocking other transactions — until the coordinator returns. That is 2PC’s fatal flaw: it <em>blocks</em>.`,
      ],
      callout: { kind: 'warn', text: 'If the 2PC coordinator dies after the votes but before the decision, participants are stranded: they cannot safely commit or abort, so they block and hold locks indefinitely.' },
      metrics: { messages: 4, latency: 999, availability: 0, nodes2: 4 },
      scene: { view: 'block', note: 'Coordinator crashed mid-decision — participants voted yes and are now frozen.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Pre-commit',
      title: 'Insert a pre-commit phase',
      body: [
        `Three-phase commit fixes the block by adding a round <em>between</em> the vote and the commit. After everyone votes yes, the coordinator sends <span class="term">pre-commit</span>: “prepare to commit — the decision <b>will</b> be commit.” Each participant acknowledges.`,
        `The point is subtle but powerful: once any participant has seen pre-commit, the whole cluster knows the outcome can only be <b>commit</b>, never abort. No one is ever left guessing which way the decision went.`,
      ],
      callout: { kind: 'insight', text: 'The pre-commit round publishes the decision before anyone acts on it. After it, commit is the only possible outcome — so a survivor can always finish the job.' },
      changes: ['+ new phase between vote and commit', '~ pre-commit announces the outcome early', '✓ no participant commits while abort is still possible'],
      metrics: { messages: 6, latency: 120, availability: 100, nodes2: 4 },
      scene: { view: 'phases', note: 'Three rounds: can-commit, pre-commit, do-commit — each a clean broadcast and ack.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Three rounds',
      title: 'Can-commit, pre-commit, do-commit',
      body: [
        `<b>Phase 1 — can-commit?</b> The coordinator asks each participant whether it <em>could</em> commit. Everyone replies yes or no, exactly like 2PC’s vote.`,
        `<b>Phase 2 — pre-commit.</b> If all said yes, the coordinator broadcasts pre-commit and waits for acks. Now every node knows the outcome is commit. <b>Phase 3 — do-commit.</b> The coordinator says commit; participants commit and release locks. Three clean rounds, each a broadcast and an acknowledgement.`,
      ],
      callout: { kind: 'tip', text: 'Phase 1 gathers consent, phase 2 broadcasts the decision, phase 3 executes it. The middle phase is the whole trick — it separates "decided" from "done".' },
      metrics: { messages: 6, latency: 150, availability: 100, nodes2: 4 },
      scene: { view: 'walk', note: 'Follow one transaction down all three phases — vote, pre-commit, commit.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Recovery',
      title: 'A survivor can decide safely',
      body: [
        `Now crash the coordinator again. A <span class="term">recovery node</span> takes over and polls the survivors. If <b>any</b> participant reached pre-commit, the recovery node knows the decision was commit, so it finishes the commit everywhere.`,
        `If <b>none</b> reached pre-commit, no one could have committed, so it is safe to <b>abort</b>. Either way a timeout resolves the transaction without waiting for the dead coordinator — the protocol is <span class="term">non-blocking</span> under node crashes.`,
      ],
      callout: { kind: 'insight', text: 'Because pre-commit is visible before any commit, a survivor can always infer the outcome: saw pre-commit → finish commit; saw none → abort. No indefinite blocking.' },
      changes: ['+ recovery node polls survivors', '✓ saw pre-commit → commit', '✓ saw none → abort', '− no indefinite wait on a dead coordinator'],
      metrics: { messages: 8, latency: 180, availability: 100, nodes2: 4 },
      scene: { view: 'recover', note: 'Coordinator dies; a survivor polls the rest and finishes the decision.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Partitions',
      title: 'The extra round — and the partition gap',
      body: [
        `Non-blocking isn’t free. The pre-commit round is a whole extra network round trip, so 3PC is <b>slower</b> and sends more messages than 2PC on the happy path — latency you pay on every single transaction.`,
        `Worse, 3PC’s safety assumes crashes, not <span class="term">partitions</span>. Split the cluster and one side can see pre-commit and commit while the isolated side times out and aborts — the two halves <b>diverge</b>. That is why real systems reach for <b>consensus</b> (Paxos, Raft) instead: it stays correct even when the network splits.`,
      ],
      callout: { kind: 'warn', text: '3PC adds a round trip of latency and still breaks under network partitions: a split can let two halves decide differently. Partition-safe commit needs consensus, not 3PC.' },
      metrics: { messages: 9, latency: 260, availability: 50, nodes2: 4 },
      scene: { view: 'partition', note: 'A split: one side commits, the other aborts — 3PC cannot prevent it.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Non-blocking, but not partition-proof',
      body: [
        `Three-phase commit buys one real thing over 2PC: it never leaves participants stranded when the <b>coordinator</b> crashes, because the pre-commit round makes the outcome recoverable by any survivor.`,
        `But it costs an extra round trip and still fails under <b>network partitions</b> — so in practice it was a stepping stone. The lessons it taught (announce the decision before acting; let survivors finish it) live on inside <b>Raft</b> and <b>Paxos</b>, which solve commit <em>and</em> partitions together.`,
      ],
      callout: { kind: 'insight', text: '3PC = non-blocking under crashes via a pre-commit round, but not partition-safe. Its ideas survive in Raft/Paxos, which handle both — the reason consensus won.' },
      metrics: { messages: 6, latency: 150, availability: 100, nodes2: 4 },
      scene: { view: 'recap', note: 'Pre-commit beats blocking; consensus beats partitions — the path from 2PC to Raft.' },
    },
  ],
};
