/* content/data-integration.js — the "Data Integration" lesson, as DATA. Same
   shape as the other db-scale lessons: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/data-integration-scene.js. */

export const dataIntegrationLesson = {
  id: 'data-integration',
  title: 'Data Integration',
  group: 'Data-Intensive (DDIA)',
  summary: 'A real company runs many datastores that all need the same facts. Funnel every change through one ordered log and each system becomes a derived consumer that converges to the same truth.',
  minutes: 9,
  level: 'advanced',
  metrics: ['events', 'freshness', 'lag', 'conflicts'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why point-to-point dual writes scale as N² and drift', step: 0 },
    { text: 'One ordered log as the integration backbone', step: 1 },
    { text: 'A total order makes every consumer deterministic', step: 2 },
    { text: 'New systems subscribe and replay history to catch up', step: 3 },
    { text: 'The cost: asynchronous, eventually-consistent consumers', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'N² tangle',
      title: 'Every store syncing to every other store',
      body: [
        `One fact — “order #42 shipped” — has to reach the <b>OLTP database</b>, the <b>search index</b>, the <b>cache</b>, the <b>warehouse</b>, and two other services. The naive fix is to make each system write to the others directly.`,
        `With <code>N</code> systems that is up to <code>N²</code> point-to-point links, each one a chance to race, retry, or silently drop. Two writes arrive in different orders at different stores, and now nobody can say which copy is <em>right</em>.`,
      ],
      callout: { kind: 'warn', text: 'Ad-hoc dual writes between N systems create N² fragile links with no agreed order. The stores drift apart and there is no single source of truth.' },
      metrics: { events: 0, freshness: 0, lag: 0, conflicts: 9 },
      scene: { view: 'tangle', note: 'Five stores, every pair wired together — races and drift, no agreed order.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'One log',
      title: 'Funnel every change through one ordered log',
      body: [
        `Replace the tangle with a single <span class="term">ordered event log</span>. The system of record publishes each change <b>once</b>, in order, to the log. Every other store becomes a <span class="term">consumer</span> that subscribes and applies those changes.`,
        `DDIA calls this <span class="term">unbundling the database</span>: the log is the write path, and each datastore is just one more index built from it. <code>N</code> brittle links collapse into <code>N</code> log subscriptions.`,
      ],
      callout: { kind: 'insight', text: 'Route all changes through one ordered log. Each downstream store subscribes to it, so there is exactly one write path and one place that defines order.' },
      changes: ['+ one ordered log of changes', '~ stores become log consumers', '− N² point-to-point links removed'],
      metrics: { events: 128, freshness: 40, lag: 30, conflicts: 0 },
      scene: { view: 'log', note: 'The source publishes once; search, cache and the warehouse each subscribe.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Total order',
      title: 'A total order makes consumers deterministic',
      body: [
        `The log hands every consumer the <b>same sequence</b> of changes at offsets <code>#1, #2, #3…</code>. Each store applies them in that exact order, so they all land in the same state — the shared order <em>resolves</em> conflicts instead of leaving them to chance.`,
        `Consumers move at their own pace: the warehouse may sit at offset <code>#980</code> while search is at <code>#1024</code>. The log remembers each cursor, so a slow or restarted consumer simply resumes where it left off.`,
      ],
      callout: { kind: 'insight', text: 'One ordered log = one sequence every consumer sees. Applying changes in log order is deterministic, so the stores converge instead of drifting.' },
      metrics: { events: 1024, freshness: 45, lag: 44, conflicts: 0 },
      scene: { view: 'order', note: 'One numbered sequence; each consumer keeps a cursor and applies in order.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Replay',
      title: 'A new system just subscribes and replays',
      body: [
        `Because the log keeps history, onboarding a new datastore is trivial: point a fresh consumer at <b>offset 0</b> and let it <span class="term">replay</span> every change to rebuild its own copy, then switch to live tailing.`,
        `Need to fix a bug in the search index, or build a brand-new ML feature store? Reset the cursor and reprocess the whole log. The log is the <b>source of truth</b>; every other store is derived and rebuildable.`,
      ],
      callout: { kind: 'tip', text: 'A durable, replayable log lets you add or rebuild any derived store by replaying history from offset 0 — no migration scripts, no dual-write cutover.' },
      changes: ['+ new consumer added', '→ replays offset 0 → head', '✓ derived store rebuilt from the log'],
      metrics: { events: 1024, freshness: 50, lag: 1024, conflicts: 0 },
      scene: { view: 'replay', note: 'A new store sweeps the whole log from the start, then catches up to live.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Async lag',
      title: 'Everything downstream is asynchronous',
      body: [
        `The spine is powerful, but it is <b>asynchronous</b>: consumers trail the log by some <span class="term">lag</span>, so a read right after a write may hit a store that hasn’t applied it yet. Integration buys consistency <em>eventually</em>, not instantly.`,
        `Consumers must also be <span class="term">idempotent</span> — a redelivered or replayed event must not double-apply. In return you get one audit trail, deterministic rebuilds, and the end of mystery drift.`,
      ],
      callout: { kind: 'warn', text: 'Log-based integration is eventually consistent: consumers lag, and every consumer must be idempotent so replays and retries don’t double-apply.' },
      metrics: { events: 1536, freshness: 220, lag: 180, conflicts: 0 },
      scene: { view: 'async', note: 'Consumers trail the head by a little lag — correct soon, not instantly.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One ordered log as the integration spine',
      body: [
        `Swap <code>N²</code> tangled dual-writes for one <b>ordered log</b> that every store subscribes to. A single total order makes consumers deterministic; durable history makes any store rebuildable by replay.`,
        `This is the backbone of modern data platforms — the same idea powers <b>change data capture</b>, stream processing, and derived views, all of which read from the log you just built.`,
      ],
      callout: { kind: 'insight', text: 'Unbundle the database: one ordered log is the write path, every datastore is a derived, replayable consumer of it.' },
      metrics: { events: 1536, freshness: 60, lag: 50, conflicts: 0 },
      scene: { view: 'recap', note: 'One log spine, many derived stores — one truth, deterministically.' },
    },
  ],
};
