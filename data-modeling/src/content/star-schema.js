/* content/star-schema.js — the "Star Schema" lesson, as DATA.
   Same shape as content/third-normal-form.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/star-schema-scene.js and rendered through the shared course
   shell.

   The centerpiece of dimensional modeling: a central FACT table of measures,
   surrounded by denormalized DIMENSION tables, one join hop apart — the shape
   that forms a star. */

export const starSchemaLesson = {
  id: 'star-schema',
  title: 'Star Schema',
  group: 'Dimensional Modeling',
  summary: 'A star schema is one central fact table of measures surrounded by denormalized dimension tables, one join hop apart. The shape forms a star — and it is the dominant pattern for analytical databases.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['facts', 'dimensions', 'joins', 'grain'],
  legend: [],
  goals: [
    { text: 'The fact table holds measures plus a foreign key per dimension', step: 0 },
    { text: 'Dimensions surround the fact — the shape is a star', step: 1 },
    { text: 'Dimensions are wide and denormalized on purpose', step: 2 },
    { text: 'Every question is one join hop from fact to dimension', step: 3 },
    { text: 'Redundancy buys readability and fast slice-and-dice', step: 4 },
    { text: 'One fact at a grain, dimensions around it — the star', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / the fact table
      chapter: 'setup', short: 'The fact table',
      title: 'The fact table at the center',
      body: [
        `At the heart of every star is one <span class="term">fact table</span>. It records the events a business measures — here, individual sales. Each row is one sale at a declared <span class="term">grain</span> (one line item), and holds only two kinds of column: numeric <b>measures</b> (<code>quantity</code>, <code>revenue</code>) and a <b>foreign key</b> to each dimension (<code>date_key</code>, <code>customer_key</code>, <code>product_key</code>).`,
        `Notice what is <em>not</em> here: no customer name, no product description, no city. The fact table is deliberately narrow and tall — billions of rows, a dozen columns — because every descriptive attribute has been pushed out to a dimension. The fact is the measurable truth; the dimensions are the context.`,
      ],
      callout: { kind: 'insight', text: 'A fact row is measures + foreign keys at one grain, and nothing descriptive. Keep it narrow: it is the table that grows to billions of rows.' },
      metrics: { facts: 1, dimensions: 0, joins: 0, grain: 'line item' },
      scene: { view: 'fact', note: 'fact_sales — measures (quantity, revenue) plus one foreign key per dimension, at the line-item grain.' },
    },
    { // 1 — SOLUTION / assemble the star
      chapter: 'solution', short: 'Build the star',
      title: 'Dimensions around the fact — the star',
      body: [
        `Now surround the fact with its <span class="term">dimension tables</span>. Each foreign key in the fact points at one dimension — <code>dim_date</code>, <code>dim_customer</code>, <code>dim_product</code>, <code>dim_store</code> — and each dimension holds the full descriptive context for that entity. Drawn out, the fact sits in the middle and the dimensions radiate from it: the shape is literally a <b>star</b>.`,
        `The relationship is always the same: <b>many</b> fact rows reference <b>one</b> dimension row (<code>N : 1</code>), carried by the foreign key. A dimension row — one customer, one product, one calendar day — is referenced by millions of sales. This uniform hub-and-spoke shape is what makes a star schema instantly recognizable and easy to query.`,
      ],
      callout: { kind: 'insight', text: 'Fact in the center, dimensions on the points. Every spoke is a simple N:1 foreign key — many facts, one dimension row.' },
      changes: ['+ dim_date, dim_customer, dim_product, dim_store', '+ one N:1 foreign-key spoke per dimension'],
      metrics: { facts: 1, dimensions: 4, joins: 0, grain: 'line item' },
      scene: { view: 'star', note: 'fact_sales surrounded by four dimensions — one N:1 foreign-key spoke each. The shape is a star.' },
    },
    { // 2 — TECHNIQUE / denormalized dimensions
      chapter: 'technique', short: 'Wide dimensions',
      title: 'Dimensions are wide and redundant on purpose',
      body: [
        `A dimension is the opposite of a normalized table. <code>dim_product</code> carries the product name, its category, its department, its brand and its supplier — all flattened into one wide row, even though a strict 3NF design would split category and department into their own tables. The redundancy is <b>intentional</b>.`,
        `Why pay for redundancy you spent the whole normalization course removing? Because this is a read-mostly copy, not the system of record. Writes are rare (a nightly load), so update anomalies barely matter; reads are everything, and a flat dimension means "group by department" is a single column, no join. In dimensional modeling, <span class="term">readability beats normalization</span>.`,
      ],
      callout: { kind: 'tip', text: 'A dimension flattens a whole hierarchy into one wide table. You trade storage and redundancy — cheap here — for join-free, human-readable queries.' },
      changes: ['~ category / department / brand flattened into dim_product', '+ denormalized: one wide row per product'],
      metrics: { facts: 1, dimensions: 4, joins: 1, grain: 'line item' },
      scene: { view: 'dimensions', note: 'dim_product flattens category, department and brand into one wide row — denormalized on purpose.' },
    },
    { // 3 — TECHNIQUE / the query
      chapter: 'technique', short: 'One join hop',
      title: 'Every question is one join hop away',
      body: [
        `Here is the payoff. "Revenue by product category, by month" touches the fact and just two dimensions: join <code>fact_sales</code> to <code>dim_product</code> for the category, to <code>dim_date</code> for the month, sum <code>revenue</code>, group. Every dimension is exactly <b>one hop</b> from the fact — never a chain, never a join through a join.`,
        `That bounded join depth is the whole point. No matter how you slice the data — by region, by quarter, by brand, by store — the query shape is identical: fact in the <code>FROM</code>, dimensions in the <code>JOIN</code>, measures in the <code>SELECT SUM(...)</code>, attributes in the <code>GROUP BY</code>. Analysts and BI tools can generate these queries mechanically.`,
      ],
      callout: { kind: 'insight', text: 'Star-schema joins are flat: fact-to-dimension, one hop, every time. The query writer never navigates a chain of tables.' },
      changes: ['+ join fact → dim_product, fact → dim_date', '~ SUM(revenue) GROUP BY category, month'],
      metrics: { facts: 1, dimensions: 4, joins: 2, grain: 'line item' },
      scene: { view: 'query', note: 'Revenue by category by month: fact joined to two dimensions, one hop each — SUM and GROUP BY.' },
    },
    { // 4 — TRADEOFF / why analysts love it
      chapter: 'tradeoff', short: 'Why analysts love it',
      title: 'Redundancy you choose, simplicity you keep',
      body: [
        `The star makes a deliberate trade against everything 3NF teaches. It <b>duplicates</b> descriptive data across wide dimensions, and it <b>stores derived context</b> freely — because the redundancy that is dangerous in a write-heavy OLTP store is harmless in a read-mostly warehouse rebuilt on a schedule.`,
        `In return you get the three things analysts actually care about: <b>simple joins</b> (always one hop), <b>fast slice-and-dice</b> (filter and group on flat dimension columns), and an <b>intuitive model</b> a non-engineer can read — "sales, by customer, by product, by day". The star schema has dominated analytical design for thirty years because that trade is almost always the right one.`,
      ],
      callout: { kind: 'tip', text: 'Normalize the OLTP source for write integrity; denormalize the warehouse into a star for read simplicity. Same data, different goal, different shape.' },
      metrics: { facts: 1, dimensions: 4, joins: 1, grain: 'line item' },
      scene: { view: 'denorm', note: 'The trade: deliberate redundancy in wide dimensions buys simple joins, fast slicing, an intuitive model.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'One fact, many dimensions, one hop',
      body: [
        `A star schema is one <span class="term">fact table</span> — measures plus a foreign key per dimension, at a single declared grain — surrounded by wide, denormalized <span class="term">dimension tables</span>. Every relationship is a simple <b>N : 1</b> foreign-key spoke, so every analytical question is exactly one join hop from the fact to any dimension.`,
        `The dimensions are redundant on purpose: in a read-mostly warehouse, readability and query simplicity beat normalization. That is the whole idea. The next lessons zoom in on each half of the star — what belongs in a <b>fact table</b> and how its measures behave, and what happens when you <b>snowflake</b> a dimension by normalizing it back into a chain.`,
      ],
      callout: { kind: 'insight', text: 'Fact in the center at one grain, denormalized dimensions on the points, one N:1 hop between. That shape is the star schema.' },
      metrics: { facts: 1, dimensions: 4, joins: 1, grain: 'line item' },
      scene: { view: 'recap', note: 'fact_sales at the line-item grain, four denormalized dimensions, one N:1 hop each — the star.' },
    },
  ],
};
