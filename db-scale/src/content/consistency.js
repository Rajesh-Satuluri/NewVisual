/* content/consistency.js — the "Consistency" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/consistency-scene.js. Rendered through the shared course shell.

   This is the OVERVIEW of the consistency spectrum — what a read is promised
   across replicas. Strong and eventual consistency each get their own deeper
   lesson later; here we map the whole dial. */

export const consistencyLesson = {
  id: 'consistency',
  title: 'Consistency',
  group: 'Distributed Systems',
  summary: 'Once your data lives on several replicas, a read is no longer a simple question. Consistency is the contract that says what a reader is actually guaranteed to see — and it is a dial, not a yes/no.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['replicas', 'staleness', 'latency', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why replicas make "what will I read?" a hard question', step: 0 },
    { text: 'Strong / linearizable: reads always see the latest write', step: 1 },
    { text: 'Eventual: fast and available, but reads may lag', step: 2 },
    { text: 'Causal & session guarantees as the practical middle', step: 3 },
    { text: 'The spectrum: freshness traded for latency & availability', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The promise',
      title: 'What does a read even promise?',
      body: [
        `On one machine a read is trivial: you wrote <code>x = 7</code>, you read back <code>7</code>. Put the data on three <span class="term">replicas</span> for durability and scale, and that certainty evaporates.`,
        `A write lands on one replica and takes time to reach the others. In that window, three readers hitting three replicas can each get a <em>different</em> answer. So the real question is not “what is x?” but “what is a reader <b>guaranteed</b> to see — and when?”`,
      ],
      callout: { kind: 'warn', text: 'With replication, a read has no single obvious answer. "Consistency" is the contract that pins down which answers are allowed.' },
      metrics: { replicas: 3, staleness: 140, latency: 8, availability: 99.9 },
      scene: { view: 'problem', note: 'One key, three replicas, three different answers — mid-propagation.' },
    },
    { // 1 — STRONG
      chapter: 'technique', short: 'Strong',
      title: 'Strong: one copy, always the latest',
      body: [
        `<span class="term">Strong consistency</span> (its strict form is <b>linearizability</b>) makes the whole cluster behave as if there were a single copy: every read returns the most recent committed write, and once one client sees a new value, no one ever sees an older one.`,
        `It is the easiest model to reason about — and the most expensive. Reads and writes must <b>coordinate</b> (a quorum or consensus round) so everyone agrees on order, which adds latency and, during a partition, can cost availability.`,
      ],
      callout: { kind: 'insight', text: 'Strong = behaves like one copy. Correct and intuitive, paid for in coordination latency and partition sensitivity.' },
      changes: ['+ reads see the latest write', '+ single global order', '− coordination on every op'],
      metrics: { replicas: 3, staleness: 0, latency: 42, availability: 99.0 },
      scene: { view: 'strong', note: 'Reads route through coordination — every replica agrees on v7.' },
    },
    { // 2 — EVENTUAL
      chapter: 'technique', short: 'Eventual',
      title: 'Eventual: fast now, correct later',
      body: [
        `<span class="term">Eventual consistency</span> flips the priority: accept the write locally, answer immediately, and let the new value <b>propagate</b> in the background. If writes stop, all replicas eventually <b>converge</b> to the same state.`,
        `The upside is speed and availability — any replica answers without waiting on the others, even during a partition. The catch is <span class="term">staleness</span>: a read can return an older value, and two readers can briefly disagree.`,
      ],
      callout: { kind: 'tip', text: 'Eventual = converges if writes pause. Maximum availability and low latency, at the price of possibly-stale reads.' },
      changes: ['+ any replica answers instantly', '+ available under partition', '− reads may be stale'],
      metrics: { replicas: 3, staleness: 220, latency: 6, availability: 99.99 },
      scene: { view: 'eventual', note: 'Replicas diverge, then converge to v7 once the writes settle.' },
    },
    { // 3 — CAUSAL / SESSION
      chapter: 'technique', short: 'Causal',
      title: 'Causal & session: a usable middle',
      body: [
        `Pure eventual is often too weak for humans: you post a comment, refresh, and it is gone. Session and <span class="term">causal</span> guarantees fix the surprises without full coordination.`,
        `<b>Read-your-writes</b> means you always see your own updates; <b>monotonic reads</b> mean you never see time go backwards; <b>causal</b> order means if A caused B, everyone sees A before B. Unrelated writes can still settle in any order — so it stays cheap and available.`,
      ],
      callout: { kind: 'insight', text: 'Causal / session models kill the jarring anomalies (lost writes, time-travel) while keeping eventual’s availability and speed.' },
      changes: ['+ read-your-writes', '+ monotonic reads', '+ causally-related ops ordered'],
      metrics: { replicas: 3, staleness: 40, latency: 12, availability: 99.95 },
      scene: { view: 'causal', note: 'A client always sees its own write, even while other replicas still lag.' },
    },
    { // 4 — SPECTRUM (TRADE-OFF)
      chapter: 'tradeoff', short: 'Spectrum',
      title: 'The dial: freshness vs availability',
      body: [
        `These models form a <b>spectrum</b>, not a menu of unrelated choices: <span class="term">strong → causal → eventual</span>. As you move toward strong, reads get fresher and ordering tightens — but every step adds coordination, latency, and fragility when the network splits.`,
        `This is CAP and PACELC in one picture: under a partition you trade consistency for availability, and <em>even in normal operation</em> you trade consistency for latency. There is no free lunch — only the right rung for a given workload.`,
      ],
      callout: { kind: 'tip', text: 'Strong ⟷ causal ⟷ eventual is a dial of freshness against latency & availability. Pick the rung, do not hope for all of it.' },
      metrics: { replicas: 3, staleness: 40, latency: 20, availability: 99.9 },
      scene: { view: 'spectrum', note: 'One ladder: fresher reads cost coordination; cheaper reads cost staleness.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Consistency is a choice',
      body: [
        `Consistency is not a property a database simply “has” — it is a contract you choose, per workload and sometimes per request. A bank ledger wants strong; a like-counter is happy with eventual; a social feed usually wants causal.`,
        `The rule of thumb: pick the <b>weakest</b> model your application can tolerate. Stronger buys fresher, better-ordered reads; it bills you in coordination, latency, and sensitivity to partitions. The next two lessons zoom into the ends of this dial — strong and eventual.`,
      ],
      callout: { kind: 'insight', text: 'Choose the weakest consistency that is still correct for the use case. Strength is bought with latency and availability.' },
      metrics: { replicas: 3, staleness: 0, latency: 20, availability: 99.9 },
      scene: { view: 'recap', note: 'A dial from strong to eventual — match the rung to the workload.' },
    },
  ],
};
