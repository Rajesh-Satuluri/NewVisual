/* content/distributed-recovery.js — the "Distributed Recovery" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/distributed-recovery-scene.js. */

export const distributedRecoveryLesson = {
  id: 'distributed-recovery',
  title: 'Distributed Recovery',
  group: 'Distributed Systems',
  summary: 'How a cluster heals a node that crashed or was cut off: catch it up from the committed log — by shipping the entries it missed or a whole snapshot — reconcile any divergence, then let it serve again.',
  minutes: 9,
  level: 'advanced',
  metrics: ['nodes2', 'recoveryT', 'lag', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A node that was gone has a stale log', step: 0 },
    { text: 'Rejoin as a follower and catch up first', step: 1 },
    { text: 'Ship missing log entries, or a full snapshot', step: 2 },
    { text: 'When a partition heals, drop divergent writes', step: 3 },
    { text: 'Catch-up costs bandwidth and recovery time', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Stale return',
      title: 'A node comes back holding old data',
      body: [
        `A follower crashed — or the network cut it off — and for a while the rest of the cluster kept going. The majority committed new writes it never saw. When the node finally returns, its log ends at entry <code>#104</code> while the leader is already at <code>#131</code>.`,
        `If it just starts answering queries, it serves <b>stale</b> reads. Worse, if it tries to replicate its own uncommitted tail, it could <b>overwrite</b> values the cluster already agreed on. A returning node is not automatically a trustworthy node.`,
      ],
      callout: { kind: 'warn', text: 'A node that crashed or was partitioned missed every write committed while it was gone. Let it serve immediately and it returns stale data — or clobbers newer data.' },
      metrics: { nodes2: 5, recoveryT: 0, lag: 27, availability: 80 },
      scene: { view: 'gap', note: 'The returning node stops at #104; the leader is at #131 — a 27-entry hole.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Rejoin',
      title: 'Rejoin as a follower, catch up before serving',
      body: [
        `The rule: a recovering node rejoins as a plain <span class="term">follower</span> and is marked <span class="term">catching up</span>. In that state it takes no reads and casts no votes — it only receives data from the leader.`,
        `It compares logs with the leader to find the last entry they share — the <span class="term">matching point</span>, <code>#104</code> — and asks for everything after it. Only once its log reaches the committed tip does it flip to <b>in-sync</b> and begin serving.`,
      ],
      callout: { kind: 'insight', text: 'A rejoining node is quarantined as a catching-up follower: no reads, no votes, until its log matches the committed prefix. Correctness first, availability second.' },
      changes: ['+ rejoin as follower', '~ state: catching up (no reads/votes)', '+ find matching point #104'],
      metrics: { nodes2: 5, recoveryT: 2, lag: 27, availability: 80 },
      scene: { view: 'rejoin', note: 'The node rejoins as a follower, quarantined until it catches up.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Log ship',
      title: 'Ship the missing entries — or a full snapshot',
      body: [
        `If the gap is small, the leader does <span class="term">log shipping</span>: it streams the WAL entries <code>#105…#131</code>, and the follower replays them in order until its state matches. Cheap, incremental, and exactly what live followers do every day.`,
        `But if the node was gone so long that the leader has already <b>compacted</b> those entries away, there is nothing to ship. Then the leader sends a full <span class="term">snapshot</span> of current state, the follower installs it wholesale, and <em>then</em> tails the log from the snapshot's point forward.`,
      ],
      callout: { kind: 'tip', text: 'Small gap → ship the missing log entries and replay. Gap too old to replay → install a snapshot, then tail the log. Both end at the same committed tip.' },
      changes: ['+ stream WAL #105…#131', '✓ replay until log matches', '↺ too far behind → snapshot + tail'],
      metrics: { nodes2: 5, recoveryT: 6, lag: 4, availability: 100 },
      scene: { view: 'catchup', note: 'The leader ships #105…#131; the follower replays to close the gap.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Heal split',
      title: 'When a partition heals, drop the divergent tail',
      body: [
        `A partition is subtler than a crash: the minority side was <em>alive</em> and may have accepted writes that never reached a quorum. When the split heals, those uncommitted writes are <b>not</b> truth — only the majority's log is.`,
        `So the minority rolls back its divergent tail, adopts the majority's log, and replays forward. (A CP system discards the losers outright; an <span class="term">AP</span> system instead keeps both and merges them later via anti-entropy and read-repair.) Either way, the cluster converges on one history.`,
      ],
      callout: { kind: 'warn', text: 'Writes the minority took during a partition never had a quorum. On heal, the minority discards its divergent tail and adopts the majority log — or an AP system reconciles both by merging.' },
      changes: ['− roll back minority divergent writes', '+ adopt majority log', '✓ one agreed history'],
      metrics: { nodes2: 5, recoveryT: 7, lag: 2, availability: 100 },
      scene: { view: 'heal', note: 'The minority discards its divergent tail and adopts the majority history.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Cost',
      title: 'Catching up isn’t free',
      body: [
        `Recovery spends real resources. Streaming the log — or worse, a full snapshot — eats the <b>leader's bandwidth and IO</b> while it is also serving live traffic, and the recovering node stays <span class="term">unavailable</span> the whole time it catches up. A big snapshot can mean minutes of reduced capacity.`,
        `That is why systems <b>bound how far behind</b> a replica may fall: keep enough WAL to allow log shipping, but not so much that compaction never runs. Snapshots trade storage and IO for a faster rejoin — the classic lag-versus-cost dial.`,
      ],
      callout: { kind: 'tip', text: 'Catch-up consumes leader bandwidth and keeps the node offline until it is in sync. Retain enough log for shipping, and snapshot to bound rejoin time — recovery time is the thing you are buying down.' },
      metrics: { nodes2: 5, recoveryT: 11, lag: 0, availability: 100 },
      scene: { view: 'cost', note: 'Catch-up draws leader bandwidth; recovery time is the price of a clean rejoin.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Detect, catch up, reconcile, rejoin',
      body: [
        `Distributed recovery is a four-beat loop: <b>detect</b> that a node is stale, <b>catch it up</b> from the committed log (ship entries, or a snapshot then tail), <b>reconcile</b> any divergence from a healed partition, and only then <b>rejoin</b> it to serving and voting.`,
        `It is where the whole section meets: the <b>WAL</b> is what you replay, <b>replication</b> is how it streams, <b>quorum</b> decides whose log is truth. Heal correctly and a crashed cluster becomes, once more, a single consistent system.`,
      ],
      callout: { kind: 'insight', text: 'Recovery = detect staleness → catch up (log or snapshot) → reconcile divergence → rejoin. WAL, replication and quorum are the pieces that make the heal safe.' },
      metrics: { nodes2: 5, recoveryT: 11, lag: 2, availability: 100 },
      scene: { view: 'recap', note: 'Detect → catch up → reconcile → rejoin: the cluster is whole again.' },
    },
  ],
};
