/* content/dataflow-architecture.js — the "Dataflow Architecture" lesson, as
   DATA. Same shape as the other db-scale lessons: each step is { chapter,
   short, title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/dataflow-architecture-scene.js. */

export const dataflowArchitectureLesson = {
  id: 'dataflow-architecture',
  title: 'Dataflow Architecture',
  group: 'Data-Intensive (DDIA)',
  summary: 'Turn the database inside out: model the whole system as events flowing through durable logs into stateful operators that keep materialized read views current.',
  minutes: 9,
  level: 'advanced',
  metrics: ['events', 'freshness', 'latency', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a shared mutable database couples everything', step: 0 },
    { text: 'Connect components with durable event logs', step: 1 },
    { text: 'Unbundle the database into log + operators + views', step: 2 },
    { text: 'Stateful operators keep read views current', step: 3 },
    { text: 'The cost of going asynchronous', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Shared DB',
      title: 'One shared database couples everything',
      body: [
        `The classic design points every service at <b>one shared, mutable database</b> and wires them together with synchronous calls. It is simple at first — and then it isn't. That database becomes the single place where all coordination happens, a bottleneck no one can route around.`,
        `Worse, the services are now <span class="term">tightly coupled</span>: a slow or failed call ripples outward, and every cache, search index and analytics copy drifts out of sync because each is updated by hand on a separate path.`,
      ],
      callout: { kind: 'warn', text: 'A shared mutable database is a single point of coordination and failure. Synchronous calls fail together, and every derived store drifts out of sync.' },
      metrics: { events: 0, freshness: 1200, latency: 180, throughput: 40 },
      scene: { view: 'coupled', note: 'Four services, one shared DB, synchronous calls — and drifting derived copies.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Event log',
      title: 'Let events flow through a durable log',
      body: [
        `Flip the model. Instead of mutating shared state in place, treat every write as an <span class="term">event</span> appended to a <b>durable, ordered log</b>. The log — not a shared table — becomes the backbone that connects components.`,
        `A write is now just “append an event.” Anything that cares about that write <em>subscribes</em> to the log and reacts on its own clock. Producers and consumers never call each other directly, so they are decoupled in time and in failure.`,
      ],
      callout: { kind: 'insight', text: 'Model writes as events appended to an ordered log. The log decouples producers from consumers — they communicate through durable history, not direct calls.' },
      changes: ['+ writes become appended events', '~ log replaces the shared table', '+ consumers subscribe, not call'],
      metrics: { events: 1, freshness: 400, latency: 60, throughput: 120 },
      scene: { view: 'dataflow', note: 'A write becomes an event on the log; subscribers downstream react in their own time.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Unbundle',
      title: 'Unbundle the database into three parts',
      body: [
        `A database secretly does three jobs at once: it <b>stores</b> and orders writes, it <b>derives</b> query results, and it <b>serves</b> reads. Dataflow pulls those apart — the <span class="term">unbundled database</span>.`,
        `The <b>log</b> owns storage and ordering. <b>Stream operators</b> own derivation. <b>Materialized views</b> own the read side. Each piece scales and fails on its own, and because the log is the source of truth, any view can be <em>rebuilt</em> by replaying history.`,
      ],
      callout: { kind: 'insight', text: 'Unbundle the database: a log for storage + ordering, stream operators for derivation, materialized views for reads. The log is the rebuildable source of truth.' },
      changes: ['+ log = storage + ordering', '+ operators = derivation', '+ views = read side'],
      metrics: { events: 3, freshness: 250, latency: 40, throughput: 220 },
      scene: { view: 'unbundle', note: 'The monolithic database, split into a log, stream operators and materialized views.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Operators',
      title: 'Stateful operators keep read views current',
      body: [
        `Between log and views sit <span class="term">stream operators</span>. Each consumes events, updates its own <b>local state</b>, and emits new events downstream — a search indexer, an aggregator, a cache maintainer, a notifier, all reading the same log.`,
        `This is <span class="term">CQRS</span> in the large: the <b>write path</b> only appends events, while the <b>read path</b> is served entirely from precomputed materialized views. Reads are fast because the work was already done when the event flowed through.`,
      ],
      callout: { kind: 'tip', text: 'Operators consume events, update local state, and emit new events — keeping each materialized view current. Writes append; reads come from precomputed views (CQRS).' },
      metrics: { events: 6, freshness: 180, latency: 25, throughput: 320 },
      scene: { view: 'operators', note: 'One log feeds several stateful operators, each maintaining its own read view.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Async cost',
      title: 'Decoupling buys resilience, costs immediacy',
      body: [
        `Nothing is free. Because everything downstream is <b>asynchronous</b>, the views are only <span class="term">eventually consistent</span> — a read right after a write may not see it yet, and you must reason carefully about event ordering and late-arriving data.`,
        `You also run more moving parts: a log, operators, view stores. In return you get genuine <b>decoupling</b>, fault isolation, independent scaling, and the superpower of <em>reproducibility</em> — replay the log to rebuild any view or spin up a new one.`,
      ],
      callout: { kind: 'warn', text: 'Dataflow is asynchronous: views are eventually consistent and ordering is subtle. You trade immediacy and extra infrastructure for decoupling, resilience and replayable rebuilds.' },
      changes: ['− eventual consistency on reads', '− more infrastructure to run', '+ decoupled, scalable, replayable'],
      metrics: { events: 6, freshness: 300, latency: 25, throughput: 320 },
      scene: { view: 'tradeoff', note: 'Synchronous strong-read coupling versus asynchronous decoupled dataflow.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The database, turned inside out',
      body: [
        `Dataflow architecture models the whole system as <b>events flowing through stateful operators into materialized read views</b>. The log is the source of truth; everything else is a derived, rebuildable projection of it.`,
        `This is the synthesis the earlier pieces were building toward — <b>event logs</b>, <b>CDC</b>, <b>stream processing</b> and <b>materialized views</b> all click together here: one write path appending history, many read paths kept fresh from it.`,
      ],
      callout: { kind: 'insight', text: 'Events → logs → stateful operators → materialized views. One rebuildable source of truth, many derived read views: the database turned inside out.' },
      metrics: { events: 6, freshness: 180, latency: 22, throughput: 340 },
      scene: { view: 'recap', note: 'One log, many derived views — a system built as dataflow.' },
    },
  ],
};
