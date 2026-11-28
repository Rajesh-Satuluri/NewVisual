/* content/star-schema.js — the "Star Schema" lesson, as DATA.
   Same shape as content/relational-model.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/star-schema-scene.js. Rendered through the shared course shell.

   Star schema is the dimensional-modeling exemplar: a central fact table of
   measurable events, surrounded by dimension tables that give those events
   context — the shape analytic queries are fastest against. */

export const starSchemaLesson = {
  id: 'star-schema',
  title: 'Star Schema',
  group: 'Dimensional Modeling',
  summary: 'A star schema puts measurable events in a central fact table and the context that describes them in surrounding dimension tables — the shape analytic queries are fastest against.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['facts', 'dimensions', 'joins', 'grain'],
  legend: ['read'],
  goals: [
    { text: 'A normalized OLTP schema answers analytics only through many joins', step: 0 },
    { text: 'A fact table holds one row per business event, at a declared grain', step: 1 },
    { text: 'Dimension tables give the facts context — the radial "star"', step: 2 },
    { text: 'Analytic queries filter dimensions and aggregate a fact measure', step: 3 },
    { text: 'Snowflaking normalizes dimensions back into deeper joins', step: 4 },
    { text: 'One grain, numeric facts, denormalized dims, shallow joins', step: 5 },
  ],

  steps: [
    { // 0 — THE PROBLEM
      chapter: 'problem', short: 'OLAP pain',
      title: 'Analytics drowns in joins',
      body: [
        `A fully <span class="term">normalized</span> OLTP schema is tuned for transactions: every fact lives in exactly one place, spread across many narrow tables tied together by foreign keys. That is ideal when you insert one order and update one row.`,
        `But ask it an <em>analytic</em> question — <code>revenue by region by month</code> — and the engine must chase keys through <b>order → line → product → category</b> and <b>order → customer → address → region</b> before it can even start to <code>SUM</code>. The answer is correct, but every query pays for seven joins across tables that were never shaped for scanning.`,
      ],
      callout: { kind: 'warn', text: 'A normalized schema is optimized for writing one row, not for scanning millions. Analytics on OLTP means deep join chains on every question.' },
      metrics: { facts: 0, dimensions: 0, joins: 7, grain: '—' },
      scene: { view: 'normalized', note: 'A normalized OLTP schema: many small tables, a tangle of joins to answer one analytic question.' },
    },
    { // 1 — THE FACT TABLE
      chapter: 'solution', short: 'Fact table',
      title: 'Put the events in the center',
      body: [
        `Dimensional modeling flips the priority: optimize for reading. Start with a single <span class="term">fact table</span> that holds <b>one row per measurable business event</b> — here, one row per <em>sale line</em>. Each row carries numeric <b>measures</b> (<code>quantity</code>, <code>amount</code>) plus foreign keys pointing at the context.`,
        `Before writing a column, you declare the <span class="term">grain</span>: the precise answer to "what does one row mean?" Here it is <code>one row = one order line item</code>. The grain is the most important decision in the whole model — every measure and every dimension must make sense at exactly that level.`,
      ],
      callout: { kind: 'insight', text: 'Declare the grain first. "One row = one order line item" fixes what every measure means and which dimensions can attach.' },
      changes: ['+ sales_fact (one row per sale line)', '+ measures: quantity, amount', '~ grain = one line item'],
      metrics: { facts: 50000, dimensions: 0, joins: 0, grain: 'line item' },
      scene: { view: 'fact', note: 'One central fact table, sales_fact, at grain "one line item", carrying numeric measures.' },
    },
    { // 2 — DIMENSIONS (THE STAR)
      chapter: 'technique', short: 'Dimensions',
      title: 'Dimensions give the facts context',
      body: [
        `A measure is meaningless without context: <code>amount = 40</code> for <em>what</em>, <em>when</em>, <em>who</em>, <em>where</em>? Each axis you want to slice by becomes a <span class="term">dimension table</span> — <code>dim_date</code>, <code>dim_product</code>, <code>dim_customer</code>, <code>dim_store</code> — and the fact table holds one foreign key into each.`,
        `Dimensions are deliberately <b>denormalized</b>: <code>dim_product</code> keeps category and brand as plain columns rather than splitting them off into more tables. Arrange the fact in the center with its dimensions radiating out and you get the shape this model is named for — the <span class="term">star</span>.`,
      ],
      callout: { kind: 'tip', text: 'One dimension per axis you slice by. Keep them wide and denormalized — a descriptive attribute is one column away, never a join away.' },
      changes: ['+ dim_date · dim_product · dim_customer · dim_store', '+ 4 foreign keys on sales_fact', '~ dimensions denormalized (wide, flat)'],
      metrics: { facts: 50000, dimensions: 4, joins: 4, grain: 'line item' },
      scene: { view: 'star', note: 'The star: sales_fact at the center, four dimension tables radiating out, each joined by one FK.' },
    },
    { // 3 — THE STAR JOIN
      chapter: 'technique', short: 'Star join',
      title: 'Slice, dice, aggregate',
      body: [
        `Now the analytic question is cheap. <code>Revenue by region by month</code> becomes: filter <code>dim_date</code> to the months you want, join <code>dim_store</code> for its region, and <code>SUM(amount)</code> from <code>sales_fact</code> grouped by those attributes.`,
        `That is a <span class="term">star join</span>: the fact table joined to each dimension by a <b>single hop</b> on a foreign key — exactly four shallow joins, no deep chains to walk. Filters land on the small dimension tables first, so the engine touches only the matching slice of the large fact table. <em>Slice</em> picks a value, <em>dice</em> crosses two dimensions, <em>aggregate</em> rolls the measure up.`,
      ],
      callout: { kind: 'insight', text: 'Every analytic query is the same shape: filter dimensions, SUM a measure, group by dimension attributes — single-hop joins, predictable and fast.' },
      changes: ['~ filter dims → SUM fact measure', '~ 4 single-hop joins (no chains)', '+ slice · dice · roll-up'],
      metrics: { facts: 50000, dimensions: 4, joins: 4, grain: 'line item' },
      scene: { view: 'query', note: 'A star join: dimensions filtered, reads flowing into the fact center, one measure aggregated.' },
    },
    { // 4 — SNOWFLAKE TRADEOFF
      chapter: 'tradeoff', short: 'Snowflake',
      title: 'Snowflaking normalizes the points',
      body: [
        `A wide <code>dim_product</code> repeats its category and department text on every product row. Normalize that away and you get a <span class="term">snowflake schema</span>: <code>dim_product</code> points at <code>dim_category</code>, which points at <code>dim_department</code>. Redundancy drops and the dimension is smaller.`,
        `But the join you removed from storage comes back at <b>query time</b>: that one arm of the star is now three hops instead of one. The star trades storage for <b>speed and simplicity</b>; the snowflake trades them back for <b>normalization</b>. For analytics the star usually wins — disk is cheap, and shallow predictable joins keep the optimizer honest.`,
      ],
      callout: { kind: 'warn', text: 'Snowflaking removes redundancy by adding joins back. Star = denormalized and shallow; snowflake = normalized and deeper. Pick speed or storage.' },
      changes: ['+ dim_category → dim_department', '~ dim_product arm now 3 hops', '~ less redundancy, more joins'],
      metrics: { facts: 50000, dimensions: 4, joins: 6, grain: 'line item' },
      scene: { view: 'snowflake', note: 'The star with one arm snowflaked: dim_product → dim_category → dim_department adds hops.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Why stars win',
      title: 'Why the star is the default',
      body: [
        `Pull the pieces together. A star schema has <b>one declared grain</b> so every row means the same thing; a fact table of <b>numeric measures</b> that aggregate cleanly; <b>denormalized dimensions</b> that keep descriptive attributes one column away; and <b>shallow, predictable joins</b> — one hop from the fact to each point of the star.`,
        `Those four properties are why the star is the default for analytics and the backbone of the Kimball method. Hold on to grain, facts and conformed dimensions — the lessons on snowflakes, SCDs and the bus matrix all build directly on this shape.`,
      ],
      callout: { kind: 'insight', text: 'One grain · numeric facts · denormalized dimensions · shallow joins. Four properties, one model that analytic queries run fastest against.' },
      metrics: { facts: 50000, dimensions: 4, joins: 4, grain: 'line item' },
      scene: { view: 'recap', note: 'The clean star: one grain, a fact center, and conformed dimensions around it.' },
    },
  ],
};
