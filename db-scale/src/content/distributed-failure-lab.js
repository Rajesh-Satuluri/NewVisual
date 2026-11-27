/* content/distributed-failure-lab.js — the "Distributed Failure Lab" lesson,
   as DATA. Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/distributed-failure-lab-scene.js.

   A hands-on lab: split the network, watch split-brain diverge the data, let
   quorum stop it, detect a dead node by timed-out heartbeats, and face the CAP
   choice — consistency or availability — during a partition. */

export const distributedFailureLabLesson = {
  id: 'distributed-failure-lab',
  title: 'Distributed Failure Lab',
  group: 'Interactive Labs',
  summary: 'Break the network on purpose: cause a partition, watch split-brain diverge two sides, let quorum stop it, detect a dead node by missed heartbeats, and make the CAP call between consistency and availability.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['nodes2', 'availability', 'suspected', 'conflicts'],
  goals: [
    { text: 'Why partial failure is the hard part of distributed systems', step: 0 },
    { text: 'Split the cluster into a majority and a minority side', step: 1 },
    { text: 'See split-brain diverge the data into conflicts', step: 2 },
    { text: 'Let quorum keep only the majority side writable', step: 3 },
    { text: 'Detect and fence a node by timed-out heartbeats', step: 4 },
    { text: 'Make the CAP choice: CP or AP during a partition', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Setup',
      title: 'A healthy cluster, gossiping',
      body: [
        `Welcome to the lab. Five nodes hold replicas of the same data. Every node periodically sends a <span class="term">heartbeat</span> to the others — "I'm alive" — so each one knows who is reachable. Right now all five are up and <b>availability</b> is <code>100%</code>.`,
        `In a single machine, a crash is total: the process is up or down. A distributed system has a nastier failure mode — <span class="term">partial failure</span>, where some nodes are fine, some are dead, and some are merely <em>unreachable</em>, and no node can tell which from the outside.`,
      ],
      callout: { kind: 'tip', text: 'The defining hazard is that a slow network and a dead node look identical from the outside. Everything that follows is about coping with that ambiguity.' },
      metrics: { nodes2: 5, availability: 100, suspected: 0, conflicts: 0 },
      scene: { view: 'setup', note: 'Five replicas up, exchanging heartbeats. Availability 100%.' },
    },
    { // 1 — PROBLEM / partition
      chapter: 'problem', short: 'Partition',
      title: 'The network splits',
      body: [
        `A switch fails. The cluster tears into two groups that can each still talk internally but <b>cannot reach the other side</b>: a <span class="term">majority side</span> of three nodes and a <span class="term">minority side</span> of two. This is a <span class="term">network partition</span>.`,
        `Crucially, every node is still <em>running</em>. Each side sees the other's heartbeats stop and concludes the other side is down — but the other side thinks the exact same thing about <b>them</b>. Both sides believe they are the survivors.`,
      ],
      callout: { kind: 'warn', text: 'Neither side can distinguish "the others crashed" from "the others are unreachable but fine." A naive system lets both sides keep serving — which is where the trouble starts.' },
      changes: ['✗ link between sides drops', 'majority side: 3 nodes', 'minority side: 2 nodes'],
      metrics: { nodes2: 5, availability: 60, suspected: 2, conflicts: 0 },
      scene: { view: 'partition', note: 'Network splits into a majority (3) and a minority (2) side.' },
    },
    { // 2 — PROBLEM / split-brain
      chapter: 'problem', short: 'Split-brain',
      title: 'Both sides write: split-brain',
      body: [
        `Suppose we let <b>both</b> sides accept writes to keep serving users. The majority side sets <code>x = 7</code>. The minority side, serving its own clients, sets <code>x = 3</code>. Neither can see the other's update.`,
        `Now the cluster holds <b>two conflicting truths</b> for the same key. This is <span class="term">split-brain</span>: two independent masters diverging. When the partition heals, you're left with conflicts that no one can automatically reconcile without losing a write.`,
      ],
      callout: { kind: 'warn', text: 'Split-brain is the worst outcome: the system silently accepts contradictory writes and only discovers the divergence after the fact. Preventing it is the whole point of quorum.' },
      changes: ['majority writes x = 7', 'minority writes x = 3', '✗ divergence — 1 conflict'],
      metrics: { nodes2: 5, availability: 100, suspected: 0, conflicts: 1 },
      scene: { view: 'splitbrain', note: 'Both sides accept writes → x = 7 vs x = 3, data diverges.' },
    },
    { // 3 — SOLUTION / quorum
      chapter: 'solution', short: 'Quorum',
      title: 'Quorum stops the divergence',
      body: [
        `Fix: require a write to be accepted by a <span class="term">quorum</span> — a majority of the <b>whole</b> cluster, <code>3</code> of 5 — before it counts. Only one side of any partition can hold a majority.`,
        `The majority side (3 nodes) can still reach quorum, so it keeps serving <b>writes</b>. The minority side (2 nodes) can't — it goes <span class="term">read-only</span>, refusing writes until it rejoins. There is only ever one writable side, so the data <b>cannot diverge</b>. Conflicts stay at zero.`,
      ],
      callout: { kind: 'insight', text: 'Because any two majorities overlap, at most one side can reach quorum during a partition. That single-writer guarantee is exactly what prevents split-brain.' },
      changes: ['+ writes need quorum (3/5)', '✓ majority side stays writable', '~ minority side → read-only'],
      metrics: { nodes2: 5, availability: 60, suspected: 2, conflicts: 0 },
      scene: { view: 'quorum', note: 'Only the majority side reaches quorum; minority goes read-only.' },
    },
    { // 4 — TECHNIQUE / detect
      chapter: 'technique', short: 'Detect',
      title: 'Suspect and fence by heartbeat',
      body: [
        `How does the cluster know a node is gone? Each node expects a heartbeat within a <span class="term">timeout</span>. Miss enough in a row and the node is marked <span class="term">suspected</span>.`,
        `A suspected node is <span class="term">fenced</span>: stripped of its role (a leader lease, a shard ownership) so a healthy node can take over without two nodes claiming the same job. The timeout is a knob — short detects failures fast but <b>false-positives</b> a slow node; long is patient but leaves the cluster degraded longer.`,
      ],
      callout: { kind: 'tip', text: 'Failure detection is a guess, not a fact. Fencing makes the guess safe: even if a "dead" node was only slow and comes back, it has already lost its role and cannot cause a conflict.' },
      changes: ['heartbeats time out', '~ node marked suspected', '+ fenced → healthy node takes over'],
      metrics: { nodes2: 5, availability: 80, suspected: 1, conflicts: 0 },
      scene: { view: 'detect', note: 'Missed heartbeats → node suspected → fenced, role reassigned.' },
    },
    { // 5 — TRADEOFF / CAP
      chapter: 'tradeoff', short: 'CAP',
      title: 'The CAP choice: CP or AP',
      body: [
        `During a partition you cannot have everything. You get <b>consistency</b> and <b>availability</b> freely only while the network is whole; once it splits, you must pick — this is <span class="term">CAP</span>.`,
        `Choose <span class="term">CP</span> and the minority side <b>rejects writes</b> (and maybe reads) to stay consistent — correct, but partly unavailable. Choose <span class="term">AP</span> and every side keeps accepting writes to stay available — never down, but you <b>reconcile</b> conflicts afterward with vector clocks, CRDTs, or last-write-wins. Neither is "right"; it depends on whether a wrong answer or a refused answer hurts your users more.`,
      ],
      callout: { kind: 'warn', text: 'CAP only forces a choice during a partition. A bank picks CP (refuse rather than double-spend); a shopping cart picks AP (accept, merge later). Know which failure your app can tolerate.' },
      changes: ['CP: minority refuses writes → consistent', 'AP: all sides accept → available', 'trade correctness vs uptime'],
      metrics: { nodes2: 5, availability: 60, suspected: 2, conflicts: 0 },
      scene: { view: 'cap', note: 'Partition forces a choice: CP (reject writes) or AP (accept, reconcile).' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What the lab proved',
      body: [
        `Partial failure is the distinguishing problem of distributed systems: a slow network and a dead node are indistinguishable. Left unchecked, a partition causes split-brain and diverging data.`,
        `Quorum fixes it by keeping only one side writable, so data can't diverge. Heartbeats with timeouts detect the unreachable, and fencing makes the detection safe. When the network does split, CAP forces a deliberate choice between staying consistent and staying available — decide it up front, per workload.`,
      ],
      callout: { kind: 'insight', text: 'Partition → split-brain risk → quorum keeps one writer → detect + fence the unreachable → pick CP or AP. The partition is inevitable; your consistency guarantee is a choice.' },
      metrics: { nodes2: 5, availability: 100, suspected: 0, conflicts: 0 },
      scene: { view: 'recap', note: 'Quorum + fencing + a deliberate CAP choice tame partial failure.' },
    },
  ],
};
