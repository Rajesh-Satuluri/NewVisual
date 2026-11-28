/* content/modern-data-systems.js — the "Modern Data Systems" capstone lesson,
   as DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/modern-data-systems-scene.js. */

export const modernDataSystemsLesson = {
  id: 'modern-data-systems',
  title: 'Modern Data Systems',
  group: 'Data-Intensive (DDIA)',
  summary: 'No single database does everything. Real systems compose specialized engines — OLTP, logs, batch, stream, OLAP, search, cache — around an event-log backbone that keeps them in sync.',
  minutes: 9,
  level: 'advanced',
  metrics: ['throughput', 'latency', 'availability', 'freshness'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why no one database can serve every workload', step: 0 },
    { text: 'The layered reference architecture', step: 1 },
    { text: 'An event log as the integration backbone', step: 2 },
    { text: 'Batch vs stream processing side by side', step: 3 },
    { text: 'The complexity cost of composing systems', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'No silver bullet',
      title: 'One database can’t do everything',
      body: [
        `A real product needs fast point writes (checkout), huge analytical scans (dashboards), full-text <span class="term">search</span>, a low-latency <span class="term">cache</span>, and streaming features — all at once. No single engine is best at all of these: an OLTP row store is terrible at column scans, a warehouse is terrible at single-row updates.`,
        `So teams reach for several specialized systems. The danger is wiring them together ad-hoc — each app dual-writing to the database <em>and</em> the cache <em>and</em> the search index — until nobody knows which copy is correct.`,
      ],
      callout: { kind: 'warn', text: 'Dual-writing the same change into many stores from application code drifts out of sync the first time one write fails. You need one source of truth and a disciplined way to derive the rest.' },
      metrics: { throughput: 5, latency: 120, availability: 95, freshness: 900 },
      scene: { view: 'tangle', note: 'One app dual-writing to five stores — a tangle with no single source of truth.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Layered stack',
      title: 'A layered reference architecture',
      body: [
        `Instead of a mesh, arrange the pieces into <b>layers</b>, each doing one job well. <span class="term">Ingestion</span> captures writes at the OLTP store and emits change events. A durable <span class="term">log backbone</span> transports them. <span class="term">Processing</span> (batch and stream) reshapes the data. <span class="term">Serving</span> stores — OLAP, search, cache, materialized views — are each <em>derived</em> from the log.`,
        `Every serving store is a <b>consumer</b> of the same ordered stream of changes, so they all trace back to one source of truth. This is the shape of the “modern data stack.”`,
      ],
      callout: { kind: 'insight', text: 'Separate the write path from the read paths. Writes land once, in the source of truth; every other store is derived from the change stream, never written directly by apps.' },
      changes: ['+ ingestion → log → processing → serving', '+ one source of truth', '~ serving stores become derived views'],
      metrics: { throughput: 40, latency: 40, availability: 99, freshness: 300 },
      scene: { view: 'layers', note: 'Four layers: ingest, log backbone, process, serve — data flows one way.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Log backbone',
      title: 'The event log ties it all together',
      body: [
        `At the centre sits a durable, ordered, replayable <span class="term">event log</span> (think Kafka). The OLTP database’s <span class="term">CDC</span> feed appends every committed change as an event. Downstream, each system subscribes and keeps its own copy up to date at its own pace.`,
        `Because the log is replayable, adding a brand-new store — a new search index, a new warehouse — just means replaying history into it. No app code changes; no risky dual-write. The log is the integration point.`,
      ],
      callout: { kind: 'insight', text: 'An ordered, replayable log decouples producers from consumers. New derived stores bootstrap by replaying the log; a lagging consumer simply catches up from its offset.' },
      changes: ['+ CDC appends every change to the log', '+ consumers read at independent offsets', '+ replay bootstraps any new store'],
      metrics: { throughput: 120, latency: 25, availability: 99, freshness: 120 },
      scene: { view: 'backbone', note: 'CDC feeds the log; OLAP, search and cache each consume at their own offset.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Batch & stream',
      title: 'Batch for depth, stream for speed',
      body: [
        `Two processing styles read the same data. <span class="term">Batch</span> jobs run over large bounded snapshots — nightly reprocessing, model training, backfills — maximizing <b>throughput</b> and allowing full recomputation. <span class="term">Stream</span> jobs run continuously over the live log — maximizing <b>freshness</b> for real-time features and alerts.`,
        `Both derive outputs from the same source of truth, so a streaming result and a batch result of the same metric agree. Pick batch when correctness-by-recompute matters, stream when latency matters — often you run both.`,
      ],
      callout: { kind: 'tip', text: 'Batch and stream are not rivals: batch gives cheap, exact, replayable recomputation; stream gives low latency. Deriving both from one log keeps their answers consistent.' },
      metrics: { throughput: 200, latency: 15, availability: 99, freshness: 60 },
      scene: { view: 'process', note: 'The same log feeds a high-throughput batch job and a low-latency stream job.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Complexity',
      title: 'Power, paid for in complexity',
      body: [
        `Composing specialized systems buys flexibility and scale — but every box is one more thing to deploy, monitor, secure and keep schema-compatible. Derived stores are <b>eventually consistent</b> with the source, so a reader may briefly see stale search results or a lagging cache.`,
        `The discipline: keep only the systems the requirements justify, make data <em>immutable and replayable</em> so mistakes are recoverable, and treat every derived store as disposable — rebuildable from the log. Simplicity is a feature.`,
      ],
      callout: { kind: 'warn', text: 'More systems means more failure modes, more lag between stores, and harder governance. Add an engine only when a real workload needs it; keep the architecture as small as the problem allows.' },
      changes: ['+ flexibility, scale, right tool per job', '− operational & governance complexity', '~ derived stores lag the source'],
      metrics: { throughput: 200, latency: 15, availability: 97, freshness: 200 },
      scene: { view: 'cost', note: 'Each added engine adds power — and a new box to run and a new place to lag.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Compose around a source of truth',
      body: [
        `Modern data systems don’t pick one database — they <b>compose</b> many, each best at one job, around a replayable event-log backbone. Writes land once in the source of truth; OLAP, search, cache and materialized views are all derived from the same change stream.`,
        `Every concept in this course snaps in here: storage engines back each store, WAL and replication make them durable, partitioning and quorums make them scale and survive failure, and CDC + logs stitch them together. That’s how data systems are built at scale.`,
      ],
      callout: { kind: 'insight', text: 'Separate write and read paths, derive everything from an ordered log, favor immutability and replay, and design for failure and scale. The whole course assembles into this picture.' },
      metrics: { throughput: 180, latency: 20, availability: 99, freshness: 100 },
      scene: { view: 'recap', note: 'One source of truth, a log backbone, many derived serving stores — composed, not monolithic.' },
    },
  ],
};
