/* content/split-brain.js — the "Split-Brain" lesson, as DATA. Same shape as the
   other db-scale lessons: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/split-brain-scene.js. */

export const splitBrainLesson = {
  id: 'split-brain',
  title: 'Split-Brain',
  group: 'Distributed Systems',
  summary: 'The catastrophe quorum and fencing exist to prevent: a partition leaves both sides thinking they are in charge, each electing a leader and accepting writes — until the truth has forked in two.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'conflicts', 'availability', 'votes'],
  legend: ['read', 'write'],
  goals: [
    { text: 'How a partition breeds two leaders at once', step: 0 },
    { text: 'Why two brains corrupt a shared resource', step: 1 },
    { text: 'Quorum: only a majority may elect a leader', step: 2 },
    { text: 'Fencing tokens reject a stale leader’s writes', step: 3 },
    { text: 'The availability price of one guaranteed brain', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Two leaders',
      title: 'A partition, and suddenly two leaders',
      body: [
        `A healthy cluster has one <span class="term">leader</span> taking writes and followers trailing it. Now the network splits. The followers on the far side can no longer see the leader’s heartbeats, so they do the only sensible thing: they assume it died and <b>elect a new leader of their own</b>.`,
        `But the old leader never actually failed — it is alive and well on its side of the break, still happily accepting writes. The cluster now has <b>two leaders at once</b>, each certain it is the one in charge.`,
      ],
      callout: { kind: 'warn', text: 'A partition can hide a healthy leader rather than kill it. If the other side reacts by electing its own, you get two leaders — both live, both convinced they are sole ruler.' },
      metrics: { nodes2: 5, conflicts: 0, availability: 100, votes: 1 },
      scene: { view: 'problem', note: 'The split hides the leader; the far side elects its own — now there are two.' },
    },
    { // 1 — PROBLEM (consequence)
      chapter: 'problem', short: 'Divergence',
      title: 'Two brains, two truths — and corruption',
      body: [
        `With two leaders live, each accepts its own writes. One side sets <span class="term">balance = 90</span>, the other sets <span class="term">balance = 40</span>, and neither knows the other exists. The single source of truth has <b>forked into two</b>, and they will not agree.`,
        `It gets worse when both control the <b>same resource</b> — two primaries writing one shared disk, or two owners of one IP. Their writes interleave and the data is left <span class="term">corrupt</span>, not merely stale. When the partition heals, there is no clean way to reconcile the two histories.`,
      ],
      callout: { kind: 'warn', text: 'Split-brain is worse than downtime: two leaders writing the same data interleave into corruption. A healed partition then leaves two irreconcilable versions of the truth.' },
      changes: ['+ side A commits balance = 90', '+ side B commits balance = 40', '✗ shared state corrupted'],
      metrics: { nodes2: 5, conflicts: 7, availability: 100, votes: 2 },
      scene: { view: 'diverge', note: 'Each leader writes its own value — the truth has split in two.' },
    },
    { // 2 — SOLUTION
      chapter: 'solution', short: 'Quorum',
      title: 'Only a majority may crown a leader',
      body: [
        `The first defence is <span class="term">quorum</span>: a side may elect a leader or accept writes <b>only</b> if it holds a strict majority of nodes — <code>⌈N/2⌉+1</code>. Because two majorities of the same cluster always overlap, at most one side can ever hold one.`,
        `Split a 5-node cluster 3–2 and only the <b>3-side</b> can form a quorum; the 2-side cannot elect anyone and must step down. The minority can never grow a second brain. For even clusters a <span class="term">witness</span> (tiebreaker) node keeps the count odd.`,
      ],
      callout: { kind: 'insight', text: 'Require a majority to lead. Two majorities must share a node, so only one side can ever satisfy the rule — the minority is structurally unable to form a second leader.' },
      changes: ['+ quorum = ⌈3/2⌉+1 = majority to lead', '~ 3-side holds quorum, acts', '− 2-side has no quorum, stands down'],
      metrics: { nodes2: 5, conflicts: 0, availability: 60, votes: 3 },
      scene: { view: 'quorum', note: 'Only the majority side reaches quorum; the minority cannot elect anyone.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Fencing',
      title: 'Fencing tokens shut out a stale leader',
      body: [
        `Quorum stops a second leader from forming, but what about the <em>old</em> leader that was deposed while isolated — still trying to write? <span class="term">Fencing</span> handles it. Every leadership term carries a monotonically increasing <span class="term">fencing token</span> (an epoch number).`,
        `Every write stamps its token, and the storage layer <b>remembers the highest it has seen</b> and rejects anything lower. When the new leader writes with epoch&nbsp;8, the storage advances; the stale leader’s epoch&nbsp;7 writes are now <b>refused at the door</b>. For hardware, <span class="term">STONITH</span> simply powers the old node off.`,
      ],
      callout: { kind: 'tip', text: 'A monotonic fencing token on every write lets the resource itself reject a stale leader: once it has served epoch 8, any epoch-7 write is refused. The old brain is fenced out even if it never noticed it lost.' },
      changes: ['+ each term gets an epoch token', '+ storage keeps the highest epoch seen', '− lower-epoch writes rejected'],
      metrics: { nodes2: 5, conflicts: 0, availability: 80, votes: 3 },
      scene: { view: 'fencing', note: 'The resource remembers epoch 8 and refuses the stale leader’s epoch 7.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The price',
      title: 'One guaranteed brain has a price',
      body: [
        `Guaranteeing a single brain is not free. <b>Quorum</b> sacrifices the minority’s availability on purpose: the 2-side goes read-only rather than risk a fork — you have chosen consistency over availability (the CP corner of CAP). <b>Fencing</b> needs cooperation from the resource; a dumb disk that ignores tokens cannot be fenced.`,
        `The other path is to stay <span class="term">AP</span>: let both sides keep writing and <b>reconcile later</b> with conflict resolution (version vectors, CRDTs, last-write-wins). You keep full availability but inherit every merge conflict split-brain created. There is no free lunch — pick where you pay.`,
      ],
      callout: { kind: 'warn', text: 'Preventing split-brain costs the minority’s availability (CP); tolerating it costs you conflict resolution after the fact (AP). Fencing only works if the protected resource honours the token.' },
      metrics: { nodes2: 5, conflicts: 3, availability: 60, votes: 3 },
      scene: { view: 'tradeoff', note: 'CP halts the minority for safety; AP stays up but must merge the conflicts.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Two brains, or one — never both',
      body: [
        `Split-brain is the failure every consensus system is built to avoid: a partition that leaves two leaders writing divergent, conflicting — sometimes corrupt — state. The cure is to make a second brain <b>impossible</b>, not merely unlikely.`,
        `<span class="term">Quorum</span> ensures only a majority can ever lead, and <span class="term">fencing tokens</span> ensure a deposed leader’s late writes are refused. Keep N odd, add a witness when it is even, and this is exactly the guarantee that <b>leader election</b>, <b>Raft</b> and <b>Paxos</b> deliver.`,
      ],
      callout: { kind: 'insight', text: 'Prevent split-brain by construction: quorum makes a second leader impossible, fencing makes a stale leader harmless. One brain, always — the bedrock of consensus.' },
      metrics: { nodes2: 5, conflicts: 0, availability: 100, votes: 3 },
      scene: { view: 'recap', note: 'Quorum plus fencing — one authoritative brain, even through a partition.' },
    },
  ],
};
