/* content/replication-models.js — the "Replication Models" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/replication-models-scene.js.

   A DDIA ch.5 survey: the three ways to keep copies of data in sync —
   single-leader, multi-leader, leaderless — and how to choose between them. */

export const replicationModelsLesson = {
  id: 'replication-models',
  title: 'Replication Models',
  group: 'Data-Intensive (DDIA)',
  summary: 'Three ways to keep copies of your data in sync — single-leader, multi-leader, and leaderless — and how the choice of who may accept a write decides everything else.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'lag', 'conflicts', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one copy is never enough', step: 0 },
    { text: 'Every model answers one question: who may write?', step: 1 },
    { text: 'Single-leader: one writer, many followers', step: 2 },
    { text: 'Multi-leader: many writers, so conflicts', step: 3 },
    { text: 'Leaderless: write to many, read from many', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'One copy',
      title: 'A single copy has no safety net',
      body: [
        `Keep your data on one machine and two things are permanently true: if that machine dies, the data is <b>gone</b> until it comes back, and every read in the world must queue at that one disk. There is no fault tolerance and no way to scale reads.`,
        `The fix sounds easy — keep <span class="term">N copies</span> on N machines. The hard part is the word <em>copies</em>: the moment two machines can both change the data, you have to decide whose change wins. Replication is less about copying and more about <b>who is allowed to write</b>.`,
      ],
      callout: { kind: 'warn', text: 'One copy means no failover and no read scaling. Keeping many copies is easy; keeping them in agreement is the whole problem.' },
      metrics: { replicas: 1, lag: 0, conflicts: 0, availability: 90 },
      scene: { view: 'single', note: 'One copy, one point of failure — every read and write funnels through it.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Who writes?',
      title: 'Pick a model by who may accept a write',
      body: [
        `Every replication design is really an answer to one question: <b>which replicas may accept a write?</b> There are exactly three answers, and each one picks a different spot on the consistency-versus-availability spectrum.`,
        `<span class="term">Single-leader</span>: only one replica writes. <span class="term">Multi-leader</span>: a few replicas write. <span class="term">Leaderless</span>: any replica writes. Fewer writers means simpler, more consistent, but more fragile; more writers means available and local, but you must reconcile conflicts.`,
      ],
      callout: { kind: 'insight', text: 'The three models — single-leader, multi-leader, leaderless — differ only in how many replicas may accept writes. Everything else follows from that.' },
      changes: ['+ single-leader: 1 writer', '+ multi-leader: a few writers', '+ leaderless: any writer'],
      metrics: { replicas: 3, lag: 10, conflicts: 0, availability: 99 },
      scene: { view: 'overview', note: 'Three topologies, one axis: how many replicas are allowed to accept a write.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Single-leader',
      title: 'Single-leader: one writer, many followers',
      body: [
        `One replica is the <span class="term">leader</span>; every write goes to it. The leader applies the change, then streams it to its <span class="term">followers</span>, who replay it in order. Reads can be served by any replica, so reads scale out freely.`,
        `Because a single node orders every write, there are <b>no write conflicts</b> — ever. That simplicity is why it is the default in Postgres, MySQL and most relational systems. The cost: the leader is a bottleneck for writes, and if it dies you must <span class="term">fail over</span> to a follower before writing can resume.`,
      ],
      callout: { kind: 'tip', text: 'Single-leader gives conflict-free writes and simple reasoning — at the price of a write bottleneck and a failover gap when the leader dies.' },
      changes: ['+ 1 leader takes all writes', '+ followers replay the stream', '✓ no write conflicts, ever'],
      metrics: { replicas: 3, lag: 12, conflicts: 0, availability: 99 },
      scene: { view: 'single-leader', note: 'All writes hit one leader; followers replay the log and serve reads.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Multi-leader',
      title: 'Multi-leader: many writers, so conflicts',
      body: [
        `Put a leader in each datacenter and let clients write to their nearest one. Writes are now <b>fast and local</b>, and a whole region can go offline without blocking writes elsewhere — great for geo-distributed apps and offline-capable clients.`,
        `But two leaders can accept conflicting writes to the <em>same</em> row before they hear about each other. That <span class="term">write conflict</span> has no single right answer, so the system must resolve it — last-write-wins, version vectors, or custom merge logic. You bought availability and locality with the hard currency of conflict resolution.`,
      ],
      callout: { kind: 'warn', text: 'Multiple leaders accept writes independently, so concurrent edits to the same key collide. Conflict resolution becomes unavoidable — and never free.' },
      changes: ['+ a leader per region', '~ writes go local & fast', '− conflicts must be resolved'],
      metrics: { replicas: 4, lag: 40, conflicts: 3, availability: 99 },
      scene: { view: 'multi-leader', note: 'Two leaders accept writes in parallel — the same key diverges and must be merged.' },
    },
    { // 4 — HOW IT WORKS
      chapter: 'technique', short: 'Leaderless',
      title: 'Leaderless: write to many, read from many',
      body: [
        `Drop the idea of a leader entirely. The client (or a coordinator) sends each write to <b>several</b> replicas and reads from <b>several</b> replicas. If the write set and read set overlap — a <span class="term">quorum</span> — a read is guaranteed to see the latest write.`,
        `Stale replicas are healed on the fly by <span class="term">read-repair</span> and in the background by <span class="term">anti-entropy</span>. This Dynamo-style design shrugs off node failures and keeps serving through partitions, but the price is weaker, <em>eventual</em> consistency and more work on every read.`,
      ],
      callout: { kind: 'insight', text: 'Leaderless replication reaches a quorum of replicas on every read and write. It stays available under failure, trading away the clean consistency of a single writer.' },
      changes: ['+ write to W replicas', '+ read from R replicas', '+ read-repair heals stale copies'],
      metrics: { replicas: 5, lag: 25, conflicts: 1, availability: 100 },
      scene: { view: 'leaderless', note: 'No leader: writes fan out to a quorum, reads gather from a quorum, overlap guarantees freshness.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Choose by who you trust to write',
      body: [
        `Three models, one dial — <b>how many replicas may write</b>. Single-leader for the strongest, simplest consistency when one write bottleneck is fine. Multi-leader when regions must write independently and you can stomach conflict resolution. Leaderless when availability under failure matters more than clean ordering.`,
        `Cutting across all three is a second choice — <span class="term">synchronous</span> replication (wait for copies, safer, slower) versus <span class="term">asynchronous</span> (don't wait, faster, risk loss). Pick the topology for your writers, then pick the timing for your durability.`,
      ],
      callout: { kind: 'insight', text: 'Match the model to the workload: single-leader for simple consistency, multi-leader for geo-local writes, leaderless for availability. Then choose sync vs async for durability.' },
      metrics: { replicas: 3, lag: 10, conflicts: 0, availability: 99 },
      scene: { view: 'recap', note: 'One axis, three homes — the whole design space of replication on a single line.' },
    },
  ],
};
