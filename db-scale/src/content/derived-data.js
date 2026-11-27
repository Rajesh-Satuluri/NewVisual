/* content/derived-data.js — the "Derived Data" lesson, as DATA. Same shape as
   the other db-scale lessons: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/derived-data-scene.js. */

export const derivedDataLesson = {
  id: 'derived-data',
  title: 'Derived Data',
  group: 'Data-Intensive (DDIA)',
  summary: 'One authoritative source of truth, many read-optimized copies. Treat search indexes, caches and warehouses as derived views fed one-way from an ordered log — recomputable, loosely coupled, and never dual-written.',
  minutes: 9,
  level: 'advanced',
  metrics: ['freshness', 'events', 'lag', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one store can’t serve every access pattern', step: 0 },
    { text: 'System of record vs derived data', step: 1 },
    { text: 'Feed every derived view from one ordered log', step: 2 },
    { text: 'Any derived store can be rebuilt by replay', step: 3 },
    { text: 'The freshness cost you accept in return', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Many shapes',
      title: 'One database can’t be good at everything',
      body: [
        `Your primary store holds the orders — but product search wants a <span class="term">full-text index</span>, the home page wants a <span class="term">cache</span>, and analytics wants a <span class="term">columnar warehouse</span>. No single engine is great at all four shapes of read.`,
        `So teams reach for the obvious fix: have the application <b>write to each system itself</b> — insert the row, update the index, bust the cache, append to the warehouse. It looks simple on a whiteboard.`,
      ],
      callout: { kind: 'warn', text: 'Dual writes make the app responsible for keeping N systems in sync. A crash between writes, or two requests racing, and the copies silently disagree — with no single order to untangle them.' },
      metrics: { freshness: 0, events: 0, lag: 0, latency: 24 },
      scene: { view: 'dualwrite', note: 'The app writes to four systems by hand — any partial failure leaves them out of sync.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Record vs derived',
      title: 'Name the source of truth',
      body: [
        `Split your systems into two kinds. The <span class="term">system of record</span> is authoritative: each fact is written there <b>once</b>, and if anything disagrees, it wins. Everything else — indexes, caches, materialized views, aggregates — is <span class="term">derived data</span>.`,
        `Derived data is, by definition, <b>recomputable</b> from the source. That reframes the whole problem: you don’t need to keep four peers in sync, you need to keep three <em>followers</em> downstream of one leader.`,
      ],
      callout: { kind: 'insight', text: 'If you can throw a store away and rebuild it from somewhere else, it is derived — not a source of truth. Only the system of record holds each fact once and for real.' },
      changes: ['+ system of record = authoritative', '~ index / cache / warehouse = derived', '− no store is dual-written anymore'],
      metrics: { freshness: 0, events: 0, lag: 0, latency: 22 },
      scene: { view: 'classify', note: 'One authoritative record; the rest are derived views that can be rebuilt.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'One log',
      title: 'Derive everything from an ordered log',
      body: [
        `Have the system of record emit every change as an <span class="term">ordered event log</span> — one append-only sequence, one global order. Each derived system <b>subscribes</b> to that log and updates itself: the index re-indexes, the cache invalidates, the warehouse appends.`,
        `Because the derivation flows in <b>one direction</b> from a single ordered source, there are no conflicting writers and no races — every follower sees the same events in the same order, and the app writes to exactly one place.`,
      ],
      callout: { kind: 'tip', text: 'An ordered log turns “keep four systems consistent” into “apply the same events in the same order.” The order is the thing that dual writes never had.' },
      changes: ['+ record emits an ordered change log', '+ each derived view subscribes to it', '✓ single writer, single order'],
      metrics: { freshness: 120, events: 1800, lag: 40, latency: 20 },
      scene: { view: 'fanout', note: 'The record’s ordered log fans out one-way to the index, cache and warehouse.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Rebuild',
      title: 'A derived store is just a replay away',
      body: [
        `Here is the payoff. Since a derived view is a <b>deterministic function</b> of the input log, you can <span class="term">rebuild it from scratch</span> — point a fresh index at offset 0 and replay. Corrupted cache? Drop it and rewarm. New search schema? Build the new index beside the old one by replaying history, then cut over.`,
        `This makes migrations and schema changes <em>safe</em>: you run the old and new derived views side by side off the same log, compare, and switch readers only when the new one has caught up.`,
      ],
      callout: { kind: 'insight', text: 'Replaying the log reconstructs any derived store exactly. That means no derived view is ever precious — you can evolve, fix or re-shape it without touching the source of truth.' },
      changes: ['+ replay from offset 0 → rebuild any view', '+ run old & new views side by side', '✓ migrations without downtime'],
      metrics: { freshness: 120, events: 1800, lag: 60, latency: 20 },
      scene: { view: 'rebuild', note: 'A new index replays the whole log to rebuild itself, beside the live one.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Freshness',
      title: 'You pay in freshness, not in correctness',
      body: [
        `Derived data is <span class="term">eventually consistent</span>: it trails the source by however long it takes an event to propagate and be applied — milliseconds usually, longer under a backlog. A read of the search index can briefly miss an order the record already has.`,
        `And there are more moving parts: a log, subscribers, offsets to monitor. But in exchange you get <b>loose coupling</b> (systems fail independently), <b>no fragile dual writes</b>, and <b>free rebuilds</b>. For most read-scaling, that trade is a bargain.`,
      ],
      callout: { kind: 'warn', text: 'Never read a derived store expecting the latest write the instant it lands — it lags. If a read must be up-to-the-moment, serve it from the system of record.' },
      metrics: { freshness: 350, events: 1800, lag: 220, latency: 18 },
      scene: { view: 'lag', note: 'The derived view trails the record by a freshness gap — correct, just a little behind.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One source of truth, many derived views',
      body: [
        `Pick <b>one</b> system of record, make everything else a derived view, and feed those views one-way from an ordered log. The app writes once; indexes, caches and warehouses keep themselves current; and any of them can be rebuilt by replay.`,
        `This idea is the backbone of modern data systems — it’s exactly what <b>change data capture</b>, <b>event logs</b> and <b>stream processors</b> (the next lessons) are built to deliver.`,
      ],
      callout: { kind: 'insight', text: 'Derived data = reproducible functions of an ordered log. Loose coupling and painless rebuilds, bought with a little lag. One truth, many views.' },
      metrics: { freshness: 140, events: 1800, lag: 50, latency: 19 },
      scene: { view: 'recap', note: 'One record of truth, an ordered log, and derived views that stay reproducible.' },
    },
  ],
};
