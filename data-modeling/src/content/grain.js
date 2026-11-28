/* content/grain.js — the "Declaring the Grain" lesson, as DATA. Same shape as
   content/third-normal-form.js. The grain is the precise business meaning of a
   single fact row; Kimball's first rule is to declare it before choosing any
   dimension or fact. Rendered by db/grain-scene.js. */

export const grainLesson = {
  id: 'grain',
  title: 'Declaring the Grain',
  group: 'Dimensional Modeling',
  summary: 'The grain is the exact business meaning of one fact row — "one row per product per store per day". Declare it first: it pins down the row and decides which dimensions and facts are even possible.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['grain', 'facts', 'dimensions', 'rows'],
  legend: [],
  goals: [
    { text: 'The grain is the business meaning of a single fact row', step: 0 },
    { text: 'Declare the grain before choosing dimensions or facts', step: 1 },
    { text: 'The grain pins the valid dimensions — one per grain word', step: 2 },
    { text: 'Finer grain means more rows but more analytic flexibility', step: 3 },
    { text: 'Never mix two grains in one fact table', step: 4 },
    { text: 'State the grain in one sentence and the design follows', step: 5 },
  ],

  steps: [
    { // 0 — SETUP · statement
      chapter: 'setup', short: 'One row means',
      title: 'The grain is what one row means',
      body: [
        `Before a fact table has a single column, it has a <span class="term">grain</span>: the precise, business-level answer to “what does <b>one row</b> mean?” Not a schema statement — a sentence a store manager would recognise: <b>“one row per product per store per day.”</b> That sentence is the fact table’s whole contract.`,
        `Every design decision flows from it. The grain tells you how many rows you will have, what a measure like <code>units_sold</code> is measuring, and which dimensions can attach. Get it stated clearly and the rest of the table almost falls out; leave it vague and every later choice is a guess.`,
      ],
      callout: { kind: 'insight', text: 'The grain is a sentence, not a column list. If you cannot say in plain words what one row represents, you are not ready to add columns.' },
      metrics: { grain: 'product·store·day', facts: 0, dimensions: 0, rows: '—' },
      scene: { view: 'statement', note: 'One row per product per store per day — the grain is the business meaning of a single fact row.' },
    },
    { // 1 — TECHNIQUE · declare first
      chapter: 'technique', short: 'Declare first',
      title: 'Kimball’s rule: declare the grain first',
      body: [
        `Kimball’s four-step method is strict about order: identify the process, <b>declare the grain</b>, then choose dimensions, then choose facts — in that sequence. The grain comes <em>second</em> and everything downstream depends on it. Teams that skip ahead to “what columns do we need?” build tables that cannot answer the questions they were meant for.`,
        `Declaring the grain is choosing a <b>level of detail</b> and committing to it. “One row per sale line” is a different table from “one row per order” is a different table from “one row per store per day.” Each is valid; each answers different questions. You pick one, write it down, and design to it.`,
      ],
      callout: { kind: 'tip', text: 'Process → grain → dimensions → facts. The grain is step two for a reason: dimensions and measures are meaningless until you know what a row is.' },
      changes: ['+ grain declared: one row per product per store per day', '~ dimensions & facts now chosen to fit it'],
      metrics: { grain: 'product·store·day', facts: 2, dimensions: 3, rows: '—' },
      scene: { view: 'row', note: 'Declaring the grain pins one concrete row: product 44, store 7, 2024-03-01 — units_sold, net_sales.' },
    },
    { // 2 — TECHNIQUE · dimensions
      chapter: 'technique', short: 'Grain → dims',
      title: 'The grain decides which dimensions fit',
      body: [
        `Read the grain sentence and the dimensions fall out of it. “One row per <b>product</b> per <b>store</b> per <b>day</b>” names exactly three dimensions — <code>dim_product</code>, <code>dim_store</code>, <code>dim_date</code> — and their keys become the fact’s composite identity. A dimension can attach <b>only if it is consistent with the grain</b>.`,
        `This is the test that catches mistakes early. Could you add a <code>dim_customer</code> to a per-product-per-store-per-day table? No — a day’s sales of one product in one store involve <em>many</em> customers, so customer is below the grain and cannot be a dimension here. The grain draws a sharp line between the dimensions that are possible and the ones that are not.`,
      ],
      callout: { kind: 'insight', text: 'Each noun in the grain sentence is a dimension. Anything finer than the grain simply cannot attach — the grain is the floor of detail.' },
      metrics: { grain: 'product·store·day', facts: 2, dimensions: 3, rows: '90M' },
      scene: { view: 'dimensions', note: 'fact_daily_sales at the declared grain — product, store and date dimensions, one key per grain word.' },
    },
    { // 3 — TRADEOFF · fine vs coarse
      chapter: 'tradeoff', short: 'Fine vs coarse',
      title: 'Finer grain: more rows, more freedom',
      body: [
        `Grain is a dial. A <b>finer</b> grain — one row per sale line — stores the most rows but keeps every question open: you can always aggregate up to day, store, category later. A <b>coarser</b> grain — one row per store per month — is pre-aggregated, far smaller and faster, but it has <em>thrown detail away</em>: you can never recover per-product numbers from a monthly store total.`,
        `The rule of thumb is to <b>model at the finest grain the process offers</b>, then build coarser aggregates on top if performance demands. Starting coarse to save space is a trap — the questions you cannot yet imagine are exactly the ones a coarse grain forecloses.`,
      ],
      callout: { kind: 'tip', text: 'You can always roll a fine grain up; you can never split a coarse grain back down. When unsure, model finer.' },
      metrics: { grain: 'fine vs coarse', facts: 2, dimensions: 3, rows: '90M' },
      scene: { view: 'finevscoarse', note: 'Fine grain (per line) keeps every question open; coarse grain (per store per month) pre-aggregates and loses detail.' },
    },
    { // 4 — PROBLEM · mixed grain
      chapter: 'problem', short: 'Never mix',
      title: 'Never mix grains in one table',
      body: [
        `The cardinal sin is <b>mixing grains in a single fact table</b>. Imagine a table where some rows are per-line sales and other rows are per-store-per-day totals, flagged by a column. Now <code>SUM(net_sales)</code> <b>double-counts</b> — the daily total already contains the lines it summarises — and no filter can be trusted without first knowing which kind of row it hit.`,
        `A fact table must hold <b>one grain, uniformly, in every row</b>. If you genuinely need totals at two levels, build two fact tables (a detailed one and an aggregate one), each with a single clean grain, and let queries pick. One table, one grain — no exceptions.`,
      ],
      callout: { kind: 'warn', text: 'Mixed grain is silent double-counting: the aggregate rows contain the detail rows, so every SUM is inflated and no total can be trusted.' },
      changes: ['! detail rows and daily-total rows in one table', '! SUM(net_sales) double-counts — totals corrupt'],
      metrics: { grain: 'MIXED', facts: 2, dimensions: 3, rows: '95M' },
      scene: { view: 'mixed', note: 'Detail rows and pre-aggregated rows in one table — SUM double-counts. One fact table must hold exactly one grain.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'One sentence, and the design follows',
      body: [
        `Declaring the grain is the single most consequential act in dimensional design. Say in plain words what <b>one row</b> means — “one row per product per store per day” — and the valid dimensions (one per noun), the composite key, and the meaning of every measure all follow. Model at the <b>finest</b> grain the process allows, so future questions stay answerable.`,
        `Keep every row at that <b>one uniform grain</b>; if you need another level, build another table. With the grain nailed down, the next step is making those dimensions <b>conformed</b> — shared across fact tables so you can compare one process against another.`,
      ],
      callout: { kind: 'insight', text: 'Declare the grain first, model it fine, keep it uniform. One sentence about one row decides the whole table.' },
      metrics: { grain: 'product·store·day', facts: 2, dimensions: 3, rows: '90M' },
      scene: { view: 'recap', note: 'fact_daily_sales — one declared, uniform, fine grain; product · store · date dimensions follow from the sentence.' },
    },
  ],
};
