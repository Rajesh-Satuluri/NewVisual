/* content/fact-tables.js — the "Fact Tables" lesson, as DATA.
   Same shape as content/third-normal-form.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/fact-tables-scene.js and rendered through the shared course
   shell.

   A close-up on the center of the star: what a fact table holds (measures + FKs
   at one grain), how its measures behave under aggregation (additive /
   semi-additive / non-additive), and why it is tall and narrow. */

export const factTablesLesson = {
  id: 'fact-tables',
  title: 'Fact Tables',
  group: 'Dimensional Modeling',
  summary: 'A fact table stores numeric measures plus foreign keys to dimensions, at one declared grain, and nothing descriptive. Its measures are additive, semi-additive, or non-additive — and that governs how you may aggregate them.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['facts', 'dimensions', 'grain', 'rows'],
  legend: [],
  goals: [
    { text: 'A fact table holds measures plus foreign keys, nothing else', step: 0 },
    { text: 'The grain is the one thing a fact row represents', step: 1 },
    { text: 'Measures are numeric facts you aggregate', step: 2 },
    { text: 'Additivity governs which dimensions a measure may sum over', step: 3 },
    { text: 'Facts are tall and narrow; dimensions short and wide', step: 4 },
    { text: 'Measures + FKs at one grain — the fact table', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / anatomy
      chapter: 'setup', short: 'Anatomy',
      title: 'Two kinds of column, and no others',
      body: [
        `A fact table has a strict anatomy. Every column is either a <b>foreign key</b> to a dimension — <code>date_key</code>, <code>product_key</code>, <code>store_key</code> — or a numeric <b>measure</b> — <code>quantity</code>, <code>revenue</code>, <code>discount</code>. There is deliberately no third kind. No product name, no customer city, no status text; all description lives in the dimensions the foreign keys point to.`,
        `This discipline is what keeps a fact table lean enough to hold billions of rows. The foreign keys say <em>which</em> dimension members an event involved; the measures say <em>how much</em>. Together they turn one real-world event — a sale, a shipment, a click — into one tight numeric row.`,
      ],
      callout: { kind: 'insight', text: 'Fact columns come in exactly two flavors: foreign keys (context) and measures (quantity). Anything descriptive belongs in a dimension, never in the fact.' },
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'anatomy', note: 'fact_sales: foreign-key columns (context) and measure columns (quantity) — nothing descriptive.' },
    },
    { // 1 — SETUP / grain
      chapter: 'setup', short: 'The grain',
      title: 'Declare the grain before anything else',
      body: [
        `The first decision in any fact table is its <span class="term">grain</span>: the precise event that one row represents. "One line on one sales receipt." That single sentence fixes everything — which foreign keys you need (every dimension that describes a line item) and which measures make sense (quantity and revenue <em>for that line</em>).`,
        `Mixing grains is the classic fact-table disaster. If some rows are per-line and others are per-order totals, every <code>SUM</code> double-counts and no measure can be trusted. So you declare the grain first, in words, and then admit only measures and keys that are true at exactly that grain. The grain is the contract the whole table honors.`,
      ],
      callout: { kind: 'warn', text: 'Declare the grain as one English sentence before you add a single column. Every row must mean the same thing, or every aggregate lies.' },
      changes: ['+ grain: "one line on one sales receipt"', '! never mix per-line and per-order rows'],
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'grain', note: 'Grain = one line on one receipt. It fixes which keys and which measures the fact table may hold.' },
    },
    { // 2 — TECHNIQUE / measures
      chapter: 'technique', short: 'Measures',
      title: 'Measures are the numbers you aggregate',
      body: [
        `The <span class="term">measures</span> are the reason the table exists — the numeric facts you will sum, average and count across millions of rows. <code>quantity</code>, <code>revenue</code>, <code>discount_amount</code>, <code>cost</code>. Most are continuously valued and additive, which is what makes them ideal to store at a fine grain and roll up later.`,
        `A good measure is <b>numeric</b> and <b>consistent with the grain</b>. Store the atomic value — revenue <em>per line</em> — and let queries aggregate upward; never pre-compute a total you could derive, because a stored subtotal is just another grain waiting to double-count. The finer the grain, the more questions the same measures can answer.`,
      ],
      callout: { kind: 'tip', text: 'Store measures at the finest grain you can and let the query aggregate. A pre-summed measure locks you into one rollup and invites double-counting.' },
      changes: ['+ quantity, revenue, discount_amount, cost', '~ atomic per-line values, aggregated at query time'],
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'measures', note: 'Measures: quantity, revenue, discount, cost — numeric, stored per line, summed at query time.' },
    },
    { // 3 — TECHNIQUE / additivity
      chapter: 'technique', short: 'Additivity',
      title: 'Additive, semi-additive, non-additive',
      body: [
        `Not every measure may be summed across every dimension. <b>Additive</b> measures — <code>revenue</code>, <code>quantity</code> — can be summed across <em>all</em> dimensions, including time; this is the easy, common case. <b>Semi-additive</b> measures sum across some dimensions but <em>not</em> time: an account <code>balance</code> or <code>inventory_on_hand</code> can be added across accounts or warehouses, but summing yesterday's and today's balance is nonsense — you average or take the latest instead.`,
        `<b>Non-additive</b> measures must never be summed at all: ratios and percentages like <code>margin_pct</code> or <code>unit_price</code>. Averaging a set of percentages isn't even correct — you must re-derive them from their additive components (sum the margin, sum the revenue, then divide). Tagging each measure's additivity is how you stop a dashboard from confidently summing a column that can't be summed.`,
      ],
      callout: { kind: 'insight', text: 'Additive: sum across everything. Semi-additive: sum across all but time. Non-additive: never sum — re-derive from additive parts.' },
      changes: ['+ revenue → additive', '+ balance → semi-additive (not over time)', '! margin_pct → non-additive'],
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'additivity', note: 'Each measure tagged: additive (sum anywhere), semi-additive (not over time), non-additive (never sum).' },
    },
    { // 4 — TRADEOFF / shape
      chapter: 'tradeoff', short: 'Tall & narrow',
      title: 'Facts are tall and narrow; dimensions short and wide',
      body: [
        `The two table types have opposite shapes, and it is not an accident. A <b>fact table is tall and narrow</b>: a handful of key and measure columns, but one row per event — billions of them. A <b>dimension is short and wide</b>: thousands of rows at most, but dozens of descriptive columns. The fact is where the volume lives; the dimension is where the vocabulary lives.`,
        `This shape drives the physics of the warehouse. Facts are partitioned by date and scanned in bulk, so they stay skinny to keep each scanned row cheap. Dimensions are small enough to sit in memory, so they can afford to be wide and redundant. Knowing which table you are looking at from its silhouette alone is a sign you have internalized the model.`,
      ],
      callout: { kind: 'tip', text: 'If a table is growing to billions of rows it is a fact; if it is wide with descriptive text and stays small, it is a dimension. The shapes are diagnostic.' },
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'shape', note: 'Fact: few columns, billions of rows. Dimension: many columns, few rows. Opposite silhouettes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Measures and keys, at one grain',
      body: [
        `A fact table is the measurable core of the star: numeric <span class="term">measures</span> plus a <b>foreign key</b> per dimension, at one declared <span class="term">grain</span>, and nothing descriptive. Fix the grain in a sentence first; admit only keys and measures true at that grain; tag each measure additive, semi-additive or non-additive so aggregations stay honest.`,
        `Keep it tall and narrow and let the dimensions carry the width. That is the whole discipline — and with the <b>star schema</b>, its <b>dimensions</b>, and the <b>snowflake</b> variation, you now have the full vocabulary of dimensional modeling: the shapes a warehouse uses to turn recorded events into answered questions.`,
      ],
      callout: { kind: 'insight', text: 'A fact table: measures + foreign keys, one grain, nothing descriptive, tall and narrow. Everything else about it follows from that.' },
      metrics: { facts: 1, dimensions: 3, grain: 'sale line', rows: 2000000000 },
      scene: { view: 'recap', note: 'fact_sales — measures + FKs at the sale-line grain, tall and narrow at the heart of the star.' },
    },
  ],
};
