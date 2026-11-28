/* content/aggregate-tables.js — the "Aggregate Tables" lesson, as DATA. Same shape
   as content/third-normal-form.js. `scene` is a view-snapshot consumed by
   db/aggregate-tables-scene.js.

   A dimensional-modeling performance lesson: a pre-summarized fact table at a
   coarser grain, stored alongside the base fact, that the query layer transparently
   routes to (aggregate navigation) — trading storage and maintenance for read speed. */

export const aggregateTablesLesson = {
  id: 'aggregate-tables',
  title: 'Aggregate Tables',
  group: 'Dimensional Modeling',
  summary: 'An aggregate table is a pre-summarized fact table at a coarser grain, stored beside the base fact. Queries that match the coarser grain hit the tiny aggregate instead of scanning billions of base rows — routed transparently by aggregate navigation.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['facts', 'grain', 'scanRows', 'rows'],
  legend: [],
  goals: [
    { text: 'The base fact is at the finest grain — and enormous', step: 0 },
    { text: 'Coarse-grained questions still scan every fine row', step: 1 },
    { text: 'Pre-summarize to a coarser grain in an aggregate fact', step: 2 },
    { text: 'Aggregate navigation routes queries to the best table', step: 3 },
    { text: 'The aggregate must be refreshed to stay consistent', step: 4 },
    { text: 'Trade storage and maintenance for a huge read speedup', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Base grain',
      title: 'The base fact is at the finest grain',
      body: [
        `A dimensional model’s <span class="term">base fact table</span> is declared at the finest grain the business measures. Here <code>fct_sales</code> is one row per <b>product, per store, per day</b> — the atomic grain. That is exactly what you want for flexibility: any question can be answered by rolling these atoms up.`,
        `The price of that flexibility is size. A chain with 50,000 products across 1,000 stores over three years is already measured in the <b>billions</b> of rows. The base fact is the source of truth, and it is correctly enormous.`,
      ],
      callout: { kind: 'insight', text: 'The base fact is at the atomic grain on purpose — it can answer anything, but it is billions of rows wide.' },
      metrics: { facts: 1, grain: 'day', scanRows: '1.8B', rows: '1.8B' },
      scene: { view: 'base', note: 'fct_sales — one row per product, per store, per day. The atomic grain, and billions of rows.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Full scan',
      title: 'Coarse questions still scan every atom',
      body: [
        `Most dashboards don’t ask atomic questions. “Monthly sales by category” is coarse — it wants a few hundred numbers. But with only the base fact available, the engine must scan all <b>1.8 billion</b> daily, per-product, per-store rows and sum them down to those few hundred totals.`,
        `Every refresh of that dashboard pays the full-scan cost again. The answer is tiny; the work to produce it is vast; and the same rollup is recomputed over and over because the shape of the question never changes.`,
      ],
      callout: { kind: 'warn', text: 'Scanning billions of atomic rows to return a few hundred monthly totals — the same expensive rollup, recomputed on every query.' },
      changes: ['~ query wants monthly × category', '! engine scans all 1.8B daily × product × store rows'],
      metrics: { facts: 1, grain: 'day', scanRows: '1.8B', rows: '1.8B' },
      scene: { view: 'rollup', note: 'A monthly-by-category query scans all 1.8B base rows to return a few hundred totals.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Pre-summarize',
      title: 'Build a coarser-grained aggregate',
      body: [
        `Pre-compute the rollup once and store it. <code>agg_sales_month</code> is a second fact table at a <b>coarser grain</b> — one row per <b>category, per month</b> — holding the summed measures. The same facts, pre-aggregated: daily becomes monthly, product becomes category.`,
        `The size collapse is the whole point. Those 1.8 billion atomic rows reduce to perhaps <b>40,000</b> category-month rows — tens of thousands instead of billions. The aggregate sits <em>alongside</em> the base fact, not instead of it; the atoms remain the source of truth for anything finer.`,
      ],
      callout: { kind: 'tip', text: 'An aggregate is the same facts summed to a coarser grain — billions of atomic rows become tens of thousands.' },
      changes: ['+ agg_sales_month (category × month, summed)', '~ 1.8B base rows → ~40K aggregate rows'],
      metrics: { facts: 2, grain: 'month', scanRows: '40K', rows: '40K' },
      scene: { view: 'aggregate', note: 'agg_sales_month — category × month, pre-summed. ~40K rows beside the 1.8B base.' },
    },
    { // 3 — TECHNIQUE (navigation)
      chapter: 'technique', short: 'Navigation',
      title: 'The query layer routes to the best table',
      body: [
        `Users should never have to know the aggregate exists. <span class="term">Aggregate navigation</span> is a layer — in the BI tool, the semantic model, or the database’s own materialized-view rewriter — that inspects each incoming query and transparently redirects it to the smallest table that can answer it.`,
        `A monthly-by-category query gets rewritten to hit <code>agg_sales_month</code> and scans 40,000 rows; a query that drills to a single day falls through to the base <code>fct_sales</code>. Same SQL from the user’s perspective, radically different work. Done well, the aggregate is <b>invisible</b> and the dashboard just feels fast.`,
      ],
      callout: { kind: 'insight', text: 'Aggregate navigation picks the smallest table that answers each query — the user writes one query, the engine chooses the grain.' },
      changes: ['+ navigation layer rewrites queries to the coarsest matching table', '~ monthly → agg (40K) · daily → base (1.8B)'],
      metrics: { facts: 2, grain: 'month', scanRows: '40K', rows: '40K' },
      scene: { view: 'navigation', note: 'The navigator routes coarse queries to the aggregate, fine ones to the base — transparently.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Keep it fresh',
      title: 'Storage and freshness are the price',
      body: [
        `Aggregates are not free. Each one costs <b>storage</b> and, more importantly, <b>maintenance</b>: every time the base fact gains new rows, the aggregate must be refreshed to match, or it silently returns stale totals. A monthly aggregate that missed yesterday’s load reports the wrong month-to-date.`,
        `So aggregates are a deliberate, bounded investment — you build a <em>few</em> aggregates for the query shapes that actually dominate your workload, not one for every conceivable rollup. Storage is cheap; the real discipline is the refresh pipeline that keeps each aggregate consistent with its base.`,
      ],
      callout: { kind: 'warn', text: 'An unrefreshed aggregate is a fast wrong answer. Every aggregate you build is a table you must keep consistent with the base.' },
      metrics: { facts: 2, grain: 'month', scanRows: '40K', rows: '40K' },
      scene: { view: 'tradeoff', note: 'Storage + a refresh pipeline buy read speed — an unrefreshed aggregate drifts from the base.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Pre-summarized, consistent, invisible',
      body: [
        `An aggregate table is a pre-summarized fact table at a coarser grain, stored beside the base fact. Queries that match the coarse grain hit the tiny aggregate instead of scanning billions of atoms — routed automatically by aggregate navigation, and kept consistent by a refresh pipeline.`,
        `The trade is explicit: a little storage and real maintenance discipline bought in exchange for order-of-magnitude faster reads on the query shapes that matter. Build a few, navigate to them transparently, and keep them fresh — and the whole warehouse feels fast without anyone changing a single query.`,
      ],
      callout: { kind: 'insight', text: 'Pre-summarize the dominant rollups, route to them invisibly, refresh them faithfully — billions scanned become thousands.' },
      metrics: { facts: 2, grain: 'month', scanRows: '40K', rows: '40K' },
      scene: { view: 'recap', note: 'Base fact + aggregate, chosen by the navigator — 40K rows scanned instead of 1.8B.' },
    },
  ],
};
