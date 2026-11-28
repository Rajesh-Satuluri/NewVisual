/* content/oltp-vs-olap.js — the "OLTP vs OLAP" lesson, as DATA.
   Same shape as content/third-normal-form.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/oltp-vs-olap-scene.js and rendered through the shared course
   shell.

   The framing lesson for dimensional modeling: the same business supports two
   workloads with opposite shapes. OLTP wants a normalized store for many small
   concurrent writes; OLAP wants a denormalized star for a few huge scans. */

export const oltpVsOlapLesson = {
  id: 'oltp-vs-olap',
  title: 'OLTP vs OLAP',
  group: 'Dimensional Modeling',
  summary: 'OLTP is the transactional store — normalized, write-heavy, latency-critical. OLAP is the analytical store — denormalized, scan-heavy, throughput-oriented. The same business needs both shapes, bridged by ETL.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['joins', 'scanRows', 'latency', 'throughput'],
  legend: [],
  goals: [
    { text: 'The same business data serves two opposite workloads', step: 0 },
    { text: 'OLTP is normalized for many small, concurrent writes', step: 1 },
    { text: 'OLAP is denormalized for a few huge scans and aggregations', step: 2 },
    { text: 'Running reports on your OLTP store starves the writes', step: 3 },
    { text: 'ETL/ELT copies and reshapes OLTP into the analytical store', step: 4 },
    { text: 'Two systems, two shapes, tuned for opposite goals', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'One business, two jobs',
      title: 'Writing it down vs making sense of it',
      body: [
        `Every data-driven business does two very different things with the same facts. It <b>records</b> them — a customer places an order, a payment clears, inventory drops — thousands of tiny changes a second, each one needing to be correct <em>right now</em>. And it <b>analyzes</b> them — revenue by region by quarter, cohort retention, the ten slowest-moving products — a handful of enormous questions asked over months of history.`,
        `These are the two faces of a data platform: <span class="term">OLTP</span> (online transaction processing) and <span class="term">OLAP</span> (online analytical processing). They touch the same business, but a schema tuned for one is actively hostile to the other. The whole of dimensional modeling exists because of this split.`,
      ],
      callout: { kind: 'insight', text: 'OLTP answers "what is true right now, and change it"; OLAP answers "what has been true, aggregated across millions of rows". Same data, opposite questions.' },
      metrics: { joins: 0, scanRows: 1, latency: '2ms', throughput: 'writes' },
      scene: { view: 'contrast', note: 'One business, two workloads: record transactions (OLTP) vs analyze history (OLAP).' },
    },
    { // 1 — PROBLEM / the OLTP shape
      chapter: 'problem', short: 'The OLTP shape',
      title: 'OLTP: normalized, write-optimized, point lookups',
      body: [
        `The transactional store is <span class="term">normalized</span> — usually to 3NF — into many small, single-purpose tables: <code>orders</code>, <code>customers</code>, <code>order_items</code>, <code>products</code>. Each fact lives in exactly one place, so a write touches one short row and never has to be copied. That is what keeps concurrent writes fast and consistent: a thousand customers checking out at once each lock a tiny slice.`,
        `The access pattern is the <span class="term">point lookup</span> — "give me order 90210 and its items" — reaching a few rows through indexes in a millisecond or two. Storage is <b>row-oriented</b>, so an entire record is read and written together. OLTP is latency-critical: the user is waiting, so every millisecond counts.`,
      ],
      callout: { kind: 'tip', text: 'Normalization is a write optimization: store each fact once and no update ever has to find-and-rewrite copies. That is exactly what you want when writes dominate.' },
      changes: ['+ many small normalized tables', '+ row-oriented storage, indexed point lookups'],
      metrics: { joins: 4, scanRows: 6, latency: '2ms', throughput: 'writes' },
      scene: { view: 'oltp', note: 'A normalized OLTP cluster: small tables, foreign keys, point lookups — tuned for writes.' },
    },
    { // 2 — SOLUTION / the OLAP shape
      chapter: 'solution', short: 'The OLAP shape',
      title: 'OLAP: denormalized, scan-optimized, aggregations',
      body: [
        `The analytical store makes the opposite bet. It <span class="term">denormalizes</span> those small tables into a wide <span class="term">star schema</span>: one central <code>fact_sales</code> table of measures, surrounded by a few fat dimension tables (<code>dim_customer</code>, <code>dim_product</code>, <code>dim_date</code>). Redundancy is deliberate — the customer's city is copied onto the dimension so a report never has to chase it.`,
        `The access pattern is the <span class="term">full scan</span> with aggregation: "sum revenue over every sale this year, grouped by region". That reads millions of rows but only a couple of columns, which is why OLAP stores are <b>column-oriented</b> — a column scan skips the data it doesn't need. Nobody is waiting on a single query; the goal is <span class="term">throughput</span> over huge volumes.`,
      ],
      callout: { kind: 'insight', text: 'OLAP optimizes for reads you make rarely but at enormous scale. Denormalization trades write cost (which you no longer pay here) for join-free, column-oriented scans.' },
      changes: ['+ wide denormalized star schema', '+ column-oriented storage for big scans'],
      metrics: { joins: 1, scanRows: 9000000, latency: '4s', throughput: 'scans' },
      scene: { view: 'olap', note: 'A wide OLAP star: one fact table, fat dimensions, one join hop — tuned for scans.' },
    },
    { // 3 — PROBLEM / why not one store
      chapter: 'problem', short: 'Don\'t mix them',
      title: 'Why you don\'t report off your OLTP store',
      body: [
        `The tempting shortcut is to skip the second system and just run your dashboards against the transactional database. It works — until it doesn't. An analytical query scans millions of rows and joins half a dozen normalized tables; while it runs it holds locks, floods the buffer cache, and saturates the disk the checkout path depends on. The report is slow <b>and</b> every customer's write slows with it.`,
        `This is <span class="term">lock contention</span> and <span class="term">resource starvation</span>: two workloads with opposite needs fighting over one machine. The analyst's 30-second scan and the shopper's 2-millisecond write cannot share a server without one ruining the other. Isolating them is not a nicety — it is the reason the two stores exist.`,
      ],
      callout: { kind: 'warn', text: 'A heavy report on your OLTP database doesn\'t just run slowly — it steals locks and I/O from the transactions users are waiting on. Keep analytics off the system of record.' },
      changes: ['! analytical scan locks rows the writes need', '! buffer cache + disk starved — checkout slows'],
      metrics: { joins: 6, scanRows: 9000000, latency: '30s', throughput: 'blocked' },
      scene: { view: 'workload', note: 'A huge analytical scan on the OLTP store contends for locks and I/O with live writes.' },
    },
    { // 4 — TECHNIQUE / the bridge
      chapter: 'technique', short: 'ETL / ELT',
      title: 'The bridge: ETL/ELT between the two',
      body: [
        `The two stores are connected by a pipeline. <span class="term">ETL</span> — extract, transform, load — pulls rows out of the OLTP source, reshapes the normalized tables into the denormalized star, and loads them into the warehouse on a schedule. <span class="term">ELT</span> flips the last two steps: load the raw data first, then transform it inside the warehouse with SQL — the modern default when compute is cheap and elastic.`,
        `Either way the warehouse is a <em>copy</em>, refreshed periodically, so it is allowed to be slightly stale — yesterday's numbers are fine for a quarterly trend. That staleness is the price of isolation, and it is almost always worth paying: the writes stay fast on one side, the scans stay fast on the other, and the ETL job carries facts from one shape to the other.`,
      ],
      callout: { kind: 'tip', text: 'ETL transforms before loading; ELT loads then transforms in the warehouse. Both exist to reshape normalized OLTP data into the denormalized star that analytics wants.' },
      changes: ['+ scheduled ETL/ELT extract → transform → load', '~ warehouse is a refreshed copy (bounded staleness)'],
      metrics: { joins: 1, scanRows: 9000000, latency: '4s', throughput: 'scans' },
      scene: { view: 'bridge', note: 'ETL/ELT extracts from OLTP, reshapes normalized tables into the star, loads the warehouse.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Two shapes for two jobs',
      body: [
        `OLTP and OLAP are the same business seen through opposite lenses. OLTP: normalized to 3NF, row-oriented, many small concurrent writes, point lookups, latency-critical — the <b>system of record</b>. OLAP: denormalized into a star, column-oriented, few huge read-mostly scans and aggregations, throughput-oriented — the <b>analytical copy</b>.`,
        `You don't choose one; you run both, and let an ETL/ELT pipeline bridge them. The rest of this group is about the OLAP side of that bridge: the <b>star schema</b>, its <b>fact</b> and <b>dimension</b> tables, and the <b>snowflake</b> variation — the shapes you reach for the moment you stop recording data and start making sense of it.`,
      ],
      callout: { kind: 'insight', text: 'Normalize the system of record for writes; denormalize a copy into a star for reads. Two stores, two shapes, one ETL bridge between them.' },
      metrics: { joins: 1, scanRows: 9000000, latency: '4s', throughput: 'scans' },
      scene: { view: 'recap', note: 'OLTP normalized for writes · OLAP denormalized for scans · ETL bridges the two.' },
    },
  ],
};
