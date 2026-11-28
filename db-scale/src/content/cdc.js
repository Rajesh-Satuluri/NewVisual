/* content/cdc.js — the "Change Data Capture" lesson, as DATA. Same shape as the
   other db-scale lessons: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/cdc-scene.js. */

export const cdcLesson = {
  id: 'cdc',
  title: 'CDC',
  group: 'Data-Intensive (DDIA)',
  summary: 'Turn a database’s committed writes into an ordered stream of change events — by tapping the same replication log that already records every change — and feed every downstream system from it.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['events', 'lag', 'freshness', 'offset'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why dual-writing to a DB and a search index goes wrong', step: 0 },
    { text: 'Capture change at the source: the replication log / WAL', step: 1 },
    { text: 'A connector decodes each commit into a change event', step: 2 },
    { text: 'One ordered log fans out to every derived system', step: 3 },
    { text: 'The cost: pipeline lag, and why consumers must be idempotent', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Dual writes',
      title: 'Writing to two systems at once is a race',
      body: [
        `Your orders live in a SQL database, but you also want them in a <span class="term">search index</span> and a <span class="term">cache</span>. The obvious fix — have the app write to all three — is a trap. The two writes are <b>not one transaction</b>: the database commit can succeed while the index write fails, or they can land in a different order on different nodes.`,
        `Worse, the app often doesn’t know <em>every</em> path that changes a row — a batch job, an admin tool, a stored procedure. Polling an <code>updated_at</code> column instead misses <b>deletes</b> entirely and always lags behind.`,
      ],
      callout: { kind: 'warn', text: 'Dual writes have no shared transaction: systems drift out of sync, and deletes and out-of-band writes are silently missed.' },
      metrics: { events: 0, lag: 0, freshness: 0, offset: 0 },
      scene: { view: 'dualwrite', note: 'The app writes the DB and the index separately — one can fail or reorder.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Tap the log',
      title: 'Capture change where it is already recorded',
      body: [
        `Every durable database already keeps an authoritative, ordered record of every committed change: its <span class="term">write-ahead log</span> (the WAL, or MySQL’s binlog). It is the exact stream the database’s own <b>replicas</b> follow to stay in sync.`,
        `Change Data Capture says: don’t ask the application to re-report its writes — <b>read the log</b>. Whatever committed, in the order it committed, is right there. Nothing can slip past it, because a change that isn’t in the log never happened.`,
      ],
      callout: { kind: 'insight', text: 'The replication log is the single source of truth for “what changed, in what order.” CDC taps that log instead of trusting the app to tell every consumer.' },
      changes: ['+ read the WAL / binlog', '~ no app changes needed', '+ captures inserts, updates AND deletes'],
      metrics: { events: 0, lag: 0, freshness: 0, offset: 0 },
      scene: { view: 'tap', note: 'The WAL already records every commit — CDC reads from it.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Decode',
      title: 'A connector decodes commits into events',
      body: [
        `A CDC <span class="term">connector</span> (Debezium is the common one) tails the log and decodes each committed row change into a structured <span class="term">change event</span>: <code>{op: insert|update|delete, before, after, lsn}</code>. It publishes these to an <b>event log</b> in commit order.`,
        `To catch up data that was written <em>before</em> CDC started, the connector first takes an initial <span class="term">snapshot</span> of existing rows, then switches to tailing the live log from that point — so consumers see the whole history, then every new change.`,
      ],
      callout: { kind: 'tip', text: 'Snapshot the current rows once to bootstrap, then tail the log forever. The log offset / LSN marks progress so a consumer can resume exactly where it stopped.' },
      changes: ['+ snapshot existing rows', '+ decode each commit → change event', '+ publish in commit order'],
      metrics: { events: 1240, lag: 120, freshness: 180, offset: 1240 },
      scene: { view: 'decode', note: 'The connector turns WAL records into ordered change events.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Fan out',
      title: 'One stream feeds every derived system',
      body: [
        `Now the change stream is a <b>product</b>, not a point-to-point hack. The search index, the cache, a data warehouse, an analytics job — each subscribes to the same ordered log and applies events at its own pace, tracking its own <span class="term">offset</span>.`,
        `Add a new consumer tomorrow and it can replay from the start to build its view, then join live. Every derived system is now a deterministic function of the <b>one</b> log, so they can’t silently disagree.`,
      ],
      callout: { kind: 'insight', text: 'A single ordered change log lets many downstream systems stay consistent derivatives of the database — each reading at its own offset, each replayable.' },
      changes: ['+ search, cache, warehouse all subscribe', '~ each tracks its own offset', '+ new consumers replay from offset 0'],
      metrics: { events: 1240, lag: 140, freshness: 220, offset: 1240 },
      scene: { view: 'fanout', note: 'The event log fans out to every derived system, each at its own offset.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Lag & idempotency',
      title: 'Asynchronous means lag — and replays',
      body: [
        `CDC is asynchronous: a change is captured, published and applied after the commit, so derived systems are <b>eventually</b> consistent, trailing the database by a <span class="term">freshness</span> delay. Fine for a search index, not for “read your own write” on the same screen.`,
        `Because the connector can restart and <b>re-deliver</b> events (at-least-once), and because a replay re-reads old offsets, consumers must be <span class="term">idempotent</span> — applying the same change twice must equal applying it once. Schema changes in the source need handling too.`,
      ],
      callout: { kind: 'warn', text: 'Derived data trails the source by the pipeline’s lag, and events can be re-delivered — so every consumer must apply changes idempotently.' },
      metrics: { events: 1310, lag: 350, freshness: 500, offset: 1310 },
      scene: { view: 'tradeoff', note: 'Events arrive late and may repeat — consumers absorb both.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Tap the log, stream the change',
      body: [
        `Change Data Capture reframes a database’s writes as an <b>ordered event stream</b>: tap the WAL, decode each commit, publish to a log, and let every downstream system derive its own view from it — losslessly, in order, deletes included.`,
        `It is the practical bridge from a running OLTP database into the event-log world of <b>stream processing</b>, materialized views and data integration — the backbone of keeping many systems in sync without dual writes.`,
      ],
      callout: { kind: 'insight', text: 'CDC = tap the replication log → ordered change stream → feed all derived systems. One source of truth, many consistent views.' },
      metrics: { events: 1310, lag: 150, freshness: 200, offset: 1310 },
      scene: { view: 'recap', note: 'One log of changes, many systems kept in sync.' },
    },
  ],
};
