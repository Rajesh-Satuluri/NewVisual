/* content/read-repair.js — the "Read Repair" lesson, as DATA. Same shape as the
   other db-scale lessons: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/read-repair-scene.js. */

export const readRepairLesson = {
  id: 'read-repair',
  title: 'Read Repair',
  group: 'Distributed Systems',
  summary: 'How a cluster heals stale replicas on the fly: every read compares the copies it touches, serves the newest, and quietly writes that fresh value back to whoever fell behind.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'staleness', 'repairs', 'conflicts'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why eventually-consistent replicas drift apart', step: 0 },
    { text: 'Compare versions on every read', step: 1 },
    { text: 'Serve the newest, push it back to laggards', step: 2 },
    { text: 'Only read keys get repaired — cold data stays stale', step: 3 },
    { text: 'Read repair pairs with anti-entropy for full coverage', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Drift',
      title: 'Replicas quietly fall out of sync',
      body: [
        `Under eventual consistency a write does not have to reach every replica before it is acknowledged. A dropped packet, a brief crash, a slow link — any of these leaves one copy holding an <span class="term">old</span> value while its peers moved on.`,
        `Nothing shouts about it. The cluster keeps serving, and a client that happens to read the stale replica gets <b>yesterday's answer</b> with no warning. Left alone, that gap never closes on its own.`,
      ],
      callout: { kind: 'warn', text: 'Eventually-consistent replicas accept writes independently, so a missed update leaves one copy stale. Without repair, a read of that copy silently returns outdated data.' },
      metrics: { replicas: 3, staleness: 900, repairs: 0, conflicts: 1 },
      scene: { view: 'drift', note: 'Three replicas of key K: two hold v7, one is stuck on v6.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Compare',
      title: 'Read more than one copy, then compare',
      body: [
        `The fix starts on the read path. Instead of trusting a single replica, the <span class="term">coordinator</span> asks several copies for the value and lines up their version numbers (a timestamp or a logical version per key).`,
        `Now the disagreement is <b>visible</b>: two replicas say <code>v7</code>, one says <code>v6</code>. The coordinator can tell at a glance which answer is current and which has fallen behind — the first step to healing it.`,
      ],
      callout: { kind: 'insight', text: 'Read repair works because reads already touch multiple replicas. Comparing their versions turns an invisible drift into a difference the coordinator can act on.' },
      changes: ['+ coordinator reads R replicas', '+ each reply carries a version', '~ stale copy now detectable'],
      metrics: { replicas: 3, staleness: 900, repairs: 0, conflicts: 1 },
      scene: { view: 'compare', note: 'A read fans out to all three replicas; versions come back v7, v7, v6.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Repair',
      title: 'Serve the newest — and write it back',
      body: [
        `The coordinator returns the <b>newest</b> value to the client, so the reader is never served stale data. But it does one more thing: it pushes that fresh value <span class="term">back</span> to every replica that returned an older version.`,
        `That extra write is the <span class="term">read repair</span>. The laggard is brought up to <code>v7</code> as a side-effect of the read, so the very next request — to any replica — now agrees. The gap closes itself, exactly where traffic flows.`,
      ],
      callout: { kind: 'insight', text: 'The coordinator serves the latest version to the client and asynchronously writes it back to stale replicas. The read heals the cluster as it answers.' },
      changes: ['+ newest value returned to client', '+ fresh copy written to the laggard', '✓ all replicas now hold v7'],
      metrics: { replicas: 3, staleness: 0, repairs: 1, conflicts: 0 },
      scene: { view: 'repair', note: 'Coordinator serves v7 and writes v7 back to the stale replica.' },
    },
    { // 3 — TRADE-OFF
      chapter: 'tradeoff', short: 'Cold keys',
      title: 'Only the keys you read get healed',
      body: [
        `Read repair is <em>opportunistic</em>: it only fixes a key when someone reads it. A hot key that is queried constantly stays near-perfectly in sync. But a <b>cold</b> key — written once, rarely read — can stay stale on a replica indefinitely, because no read ever compares it.`,
        `There is a cost, too: every multi-replica read may spawn extra <span class="term">write-back</span> traffic, and the coordinator must wait on more than one copy, nudging read latency up. You heal exactly where it is cheap to notice, and nowhere else.`,
      ],
      callout: { kind: 'tip', text: 'Read repair only touches keys that are read, and adds write-back traffic. Cold, rarely-read data can drift unchecked — so it cannot be your only anti-drift mechanism.' },
      changes: ['~ hot keys self-heal on every read', '− cold keys never get compared', '+ extra write-back + wider reads'],
      metrics: { replicas: 3, staleness: 600, repairs: 1, conflicts: 1 },
      scene: { view: 'cold', note: 'Hot key healed by traffic; a cold key stays stale with no read to fix it.' },
    },
    { // 4 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Heal on reads, sweep in the background',
      body: [
        `Read repair makes the read path do double duty: it answers the client with the freshest value and, in the same breath, drags stale replicas forward. It is cheap, needs no coordinator process, and keeps popular data crisp.`,
        `Its blind spot — cold keys — is covered by its partner, <b>anti-entropy</b>: a background sweep that compares whole replicas and reconciles everything, read or not. Together they give you convergence on the keys that matter now and, eventually, on every key.`,
      ],
      callout: { kind: 'insight', text: 'Read repair heals hot keys inline as a free side-effect of reads; anti-entropy sweeps the cold ones in the background. Run both for complete convergence.' },
      metrics: { replicas: 3, staleness: 0, repairs: 1, conflicts: 0 },
      scene: { view: 'recap', note: 'Reads heal the hot path; anti-entropy covers the rest.' },
    },
    { // 5 — RECAP / big picture (kept as recap chapter, distinct view)
      chapter: 'recap', short: 'In practice',
      title: 'Where read repair lives',
      body: [
        `Systems like Dynamo-style stores (Cassandra, Riak, DynamoDB) ship read repair as a built-in. It is the quiet reason a quorum read not only tolerates stale replicas but actively <b>shrinks</b> the staleness window over time.`,
        `Tune it with the read count <code>R</code>: read more replicas and you catch more disagreements per request — at the price of more work. The lesson is simple — let the traffic you already have do the healing.`,
      ],
      callout: { kind: 'tip', text: 'Raising the read count R catches more stale replicas per request but costs more per read. Read repair turns ordinary quorum reads into a convergence engine.' },
      metrics: { replicas: 3, staleness: 0, repairs: 1, conflicts: 0 },
      scene: { view: 'practice', note: 'Higher R → more copies compared → faster convergence, higher cost.' },
    },
  ],
};
