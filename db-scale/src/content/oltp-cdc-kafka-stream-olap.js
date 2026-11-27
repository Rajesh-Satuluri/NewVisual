/* content/oltp-cdc-kafka-stream-olap.js — the "OLTP → CDC → Kafka → Stream →
   OLAP" capstone lesson, as DATA. Same shape as every other db-scale lesson:
   each step is { chapter, short, title, body[], callout, changes?, metrics,
   scene }. `scene` is a view-snapshot consumed by
   db/oltp-cdc-kafka-stream-olap-scene.js. */

export const oltpCdcKafkaStreamOlapLesson = {
  id: 'oltp-cdc-kafka-stream-olap',
  title: 'OLTP → CDC → Kafka → OLAP',
  group: 'Data-Intensive (DDIA)',
  summary: 'Follow one order from the moment it is written in the transactional database all the way to a live revenue dashboard — through change capture, a durable log, a stream processor and a columnar warehouse.',
  minutes: 10,
  level: 'advanced',
  metrics: ['events', 'lag', 'freshness', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why analytics must not query the OLTP database directly', step: 0 },
    { text: 'CDC turns committed rows into an ordered event stream', step: 1 },
    { text: 'Kafka is the durable, replayable backbone that decouples stages', step: 2 },
    { text: 'A stream job enriches and windows events into live aggregates', step: 3 },
    { text: 'The warehouse serves the dashboard cheaply, seconds fresh', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Two worlds',
      title: 'One write, two very different readers',
      body: [
        `A customer places an order. It is a tiny <span class="term">OLTP</span> write — insert one row, commit, done in a millisecond. But another team needs that same fact <em>immediately</em>: a live dashboard showing <b>revenue this minute</b>, refreshed for the whole company.`,
        `The naive fix — point the dashboard’s heavy <span class="term">GROUP BY</span> scans straight at the orders table — is a disaster. Analytical queries lock pages, trash the buffer cache and starve the checkout path. OLTP and <span class="term">OLAP</span> want opposite things from the same data.`,
      ],
      callout: { kind: 'warn', text: 'Running analytics on your transactional database couples two workloads with opposite needs. A single reporting query can slow every checkout. The two worlds must be kept apart.' },
      metrics: { events: 0, lag: 0, freshness: 0, latency: 2 },
      scene: { view: 'problem', note: 'One order row — and a dashboard that must never touch it directly.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'A pipeline',
      title: 'Stream the change, don’t query the source',
      body: [
        `Instead of <em>pulling</em> data out with queries, we <b>push</b> every committed change along a pipeline: <span class="term">OLTP → CDC → Kafka → stream processor → OLAP</span>. Each stage does one job and hands off to the next.`,
        `The source database is never touched by analytics again. It just commits rows as always; a capture process downstream does the rest. Follow a single order through all five stages and the whole architecture falls into place.`,
      ],
      callout: { kind: 'insight', text: 'A streaming pipeline carries each committed change from the transactional store to the warehouse automatically — ordered, decoupled, and without ever running an analytical query against the source.' },
      changes: ['+ CDC connector on the OLTP log', '+ Kafka topic as the backbone', '+ stream job → warehouse', '~ dashboard reads OLAP only'],
      metrics: { events: 1, lag: 0, freshness: 0, latency: 2 },
      scene: { view: 'pipeline', note: 'Five stages, one direction — the order will travel left to right.' },
    },
    { // 2 — HOW IT WORKS (capture)
      chapter: 'technique', short: 'CDC',
      title: 'Change Data Capture reads the WAL, not the tables',
      body: [
        `When the order commits, the database already writes it to the <span class="term">WAL</span> — its ordered, durable log of every change. A <span class="term">CDC</span> connector (Debezium, logical decoding) simply <b>tails that log</b> and emits a structured event: <code>{op:insert, table:orders, after:{…}}</code>.`,
        `Because the WAL records commits in order, CDC preserves exact <b>commit order</b> and adds <em>zero</em> query load — it reads the log the database was writing anyway. The row becomes an event the instant it is durable.`,
      ],
      callout: { kind: 'tip', text: 'CDC captures changes from the write-ahead log, so it inherits commit order for free and never competes with live traffic — unlike polling the table with SELECTs.' },
      changes: ['+ tail the WAL', '+ emit ordered change events', '− no SELECT load on source'],
      metrics: { events: 1, lag: 8, freshness: 10, latency: 3 },
      scene: { view: 'cdc', note: 'The commit hits the WAL; the connector turns it into an ordered event.' },
    },
    { // 3 — HOW IT WORKS (transport + process)
      chapter: 'technique', short: 'Kafka + stream',
      title: 'A durable log, then a windowed aggregate',
      body: [
        `The event is appended to a <span class="term">Kafka</span> topic — a partitioned, replicated, <b>replayable</b> log. Kafka is the backbone: producers and consumers never talk directly, new consumers can replay from any <span class="term">offset</span>, and a slow downstream only grows a backlog, it never drops data.`,
        `A <span class="term">stream processor</span> (Flink, Kafka Streams) consumes the topic, <b>joins</b> the order with customer data, and folds it into a <b>windowed</b> running total — <em>revenue per minute</em>. It tracks event-time so a late event lands in the right window, then pushes the updated aggregate onward.`,
      ],
      callout: { kind: 'insight', text: 'Kafka decouples and durably buffers every stage; the stream job turns a flood of individual events into the exact aggregate the dashboard needs, keyed by event-time windows.' },
      changes: ['+ append to replayable topic', '+ consumer at an offset', '+ enrich + window → revenue/min'],
      metrics: { events: 1, lag: 40, freshness: 120, latency: 4 },
      scene: { view: 'process', note: 'Append to the log, replay-safe; a stream operator windows it into a live total.' },
    },
    { // 4 — TRADE-OFF (serve + cost)
      chapter: 'tradeoff', short: 'OLAP serve',
      title: 'Fast dashboards, at the price of moving parts',
      body: [
        `The aggregate lands in a <span class="term">columnar</span> warehouse / materialized view. The dashboard now reads a tiny pre-rolled table — milliseconds, no scan of raw orders — and shows revenue that is only <b>seconds old</b>. End to end the pipeline is ordered, replayable, decoupled and keeps the OLTP store safe.`,
        `The cost is <b>complexity</b>: a connector, a broker cluster, a stream job and a warehouse to operate, each adding a little <span class="term">lag</span>. You must reason about <em>exactly-once</em> delivery and schema changes rippling down the chain. You trade simplicity for freshness and isolation.`,
      ],
      callout: { kind: 'warn', text: 'The pipeline buys seconds-fresh analytics without touching the source — but every stage adds lag and an operational component. Freshness and isolation are paid for in moving parts and exactly-once care.' },
      changes: ['+ columnar warehouse / mat. view', '✓ dashboard read in ms', '− more systems, end-to-end lag'],
      metrics: { events: 1, lag: 70, freshness: 850, latency: 5 },
      scene: { view: 'olap', note: 'The order reaches the warehouse; the dashboard reads a seconds-fresh total.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'From one row to a live number',
      body: [
        `You just traced a single order end to end: <b>committed</b> in OLTP, <b>captured</b> from the WAL by CDC, <b>buffered</b> durably in Kafka, <b>aggregated</b> by a stream job, and <b>served</b> cheaply from OLAP — all in seconds, with the transactional database never touched by analytics.`,
        `This is the shape of nearly every modern data platform. The log in the middle is the key idea: an ordered, replayable stream of facts that any number of consumers — dashboards, search indexes, caches, ML features — can derive their own views from.`,
      ],
      callout: { kind: 'insight', text: 'OLTP → CDC → Kafka → stream → OLAP: a durable log of changes in the middle lets many downstream views stay fresh and independent, without ever coupling them to the source database.' },
      metrics: { events: 1, lag: 60, freshness: 800, latency: 4 },
      scene: { view: 'recap', note: 'One ordered log of changes, many fresh views — the backbone of modern data systems.' },
    },
  ],
};
