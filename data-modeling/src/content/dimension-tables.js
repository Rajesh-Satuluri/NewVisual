/* content/dimension-tables.js — the "Dimension Tables" lesson, as DATA.
   Same shape as content/third-normal-form.js. Dimensions are the context half
   of a star: wide, denormalized, few rows, a surrogate key, and the verbose
   descriptive attributes every filter, group-by and label draws from.
   Rendered by db/dimension-tables-scene.js. */

export const dimensionTablesLesson = {
  id: 'dimension-tables',
  title: 'Dimension Tables',
  group: 'Dimensional Modeling',
  summary: 'Dimensions give facts their context — the who, what, where and when. They are wide and denormalized, keyed by a surrogate, and packed with the readable attributes every filter and group-by uses.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['dimensions', 'attributes', 'cardinality', 'rows'],
  legend: [],
  goals: [
    { text: 'A dimension supplies the descriptive context facts lack', step: 0 },
    { text: 'Dimensions are wide and denormalized — many attributes, few rows', step: 1 },
    { text: 'A surrogate key, not the natural key, identifies each row', step: 2 },
    { text: 'Hierarchies live as columns inside one dimension', step: 3 },
    { text: 'Attributes are the by in every group-by and filter', step: 4 },
    { text: 'Good dimensions trade storage for readable, verbose labels', step: 5 },
  ],

  steps: [
    { // 0 — SETUP · anatomy
      chapter: 'setup', short: 'Context for facts',
      title: 'A dimension is the context around a fact',
      body: [
        `A fact table measures <em>what happened</em> — a sale of 3 units for $59. On its own that is almost meaningless; it has keys and numbers but no words. A <span class="term">dimension table</span> supplies the words: the <b>who, what, where, when and how</b>. <code>dim_customer</code> here turns a bare <code>customer_key</code> into a name, a city, a segment, a signup cohort.`,
        `Facts point at dimensions through foreign keys, and a dimension is shared by every fact that references it. The fact stays lean — keys and measures only — while all the descriptive richness lives once, in the dimension, ready to label and group any fact that joins to it.`,
      ],
      callout: { kind: 'insight', text: 'Facts are the measurements; dimensions are the vocabulary. Every label on a report, every filter in a slice, comes from a dimension, not a fact.' },
      metrics: { dimensions: 1, attributes: 7, cardinality: '2M', rows: '2M' },
      scene: { view: 'anatomy', note: 'dim_customer — a surrogate key plus the descriptive attributes that give every sale its who and where.' },
    },
    { // 1 — TECHNIQUE · wide
      chapter: 'technique', short: 'Wide & flat',
      title: 'Wide, denormalized, and not many rows',
      body: [
        `Dimensions break the normalization habit on purpose. Where an OLTP schema would scatter customer, city, state and country across four joined tables, a dimension <b>flattens them into one wide table</b> — <span class="term">denormalized</span> by design. A real <code>dim_customer</code> or <code>dim_product</code> may run to dozens of columns.`,
        `This is affordable because dimensions have <b>few rows relative to facts</b>: millions of customers against billions of sales. Widening a 2M-row table to collapse joins is a cheap trade that makes the far larger fact table trivially easy to query — no six-way join to read a product’s category name.`,
      ],
      callout: { kind: 'tip', text: 'Denormalize the small table to simplify the big one. A wide dimension spends a little storage to erase joins from every fact query.' },
      changes: ['+ city, state, country flattened into one table', '~ joins collapsed — read any attribute without a hop'],
      metrics: { dimensions: 1, attributes: 9, cardinality: '2M', rows: '2M' },
      scene: { view: 'attributes', note: 'dim_product — a wide, denormalized table: brand, category, department all flattened in, no joins to read a label.' },
    },
    { // 2 — TECHNIQUE · surrogate
      chapter: 'technique', short: 'Surrogate key',
      title: 'A surrogate key, not the business key',
      body: [
        `The primary key of a dimension is a <span class="term">surrogate key</span> — a meaningless integer the warehouse mints (<code>customer_key</code>), <em>not</em> the natural business key (<code>customer_id</code> from the source system). The natural key is kept as an ordinary attribute, but the facts point at the surrogate.`,
        `Why the extra key? It <b>decouples the warehouse from source systems</b>: if a source renumbers its IDs or two merged systems collide on <code>customer_id</code>, the facts never notice. It is also what makes <b>slowly changing dimensions</b> possible — a new surrogate row can capture a customer’s old and new state while the natural key stays the same. Surrogates are compact integers too, so fact-table foreign keys and joins stay small and fast.`,
      ],
      callout: { kind: 'insight', text: 'The surrogate key is identity the warehouse controls; the natural key is identity the source controls. Point facts at the one you own.' },
      changes: ['+ customer_key — warehouse-minted surrogate PK', '~ customer_id kept as a plain natural-key attribute'],
      metrics: { dimensions: 1, attributes: 9, cardinality: '2M', rows: '2M' },
      scene: { view: 'surrogate', note: 'customer_key (surrogate PK) identifies the row; customer_id (natural key) is just another attribute.' },
    },
    { // 3 — TECHNIQUE · hierarchy
      chapter: 'technique', short: 'Hierarchy inside',
      title: 'Hierarchies live inside the dimension',
      body: [
        `A <span class="term">hierarchy</span> — day → month → quarter → year, or product → brand → category → department — does <b>not</b> become a chain of joined tables. In dimensional design every level is just <b>another column in the same dimension row</b>. <code>dim_date</code> carries <code>full_date</code>, <code>month</code>, <code>quarter</code> and <code>year</code> all together.`,
        `That lets a user <b>drill up and down a hierarchy with no joins</b>: group by <code>month</code>, then by <code>quarter</code>, then by <code>year</code>, all from one table. The redundancy (every day in March repeats “Q1”, “2024”) is deliberate and harmless — the dimension is small, and the payoff is roll-ups that are a single <code>GROUP BY</code> away.`,
      ],
      callout: { kind: 'tip', text: 'A hierarchy is columns, not tables. Storing every level in each row makes drill-down a group-by instead of a join.' },
      metrics: { dimensions: 1, attributes: 6, cardinality: '3.6K', rows: '3.6K' },
      scene: { view: 'hierarchy', note: 'dim_date — day → month → quarter → year as columns in one row, so drill-down needs no join.' },
    },
    { // 4 — TRADEOFF · slice
      chapter: 'tradeoff', short: 'Slice & group',
      title: 'Attributes are the by in every query',
      body: [
        `Everything a dimension is for shows up in one query shape: <code>SELECT SUM(net_amount) … GROUP BY</code> <b>a dimension attribute</b>. Facts supply the <code>SUM</code>; dimensions supply every <code>WHERE</code>, every <code>GROUP BY</code>, every column label. “Revenue by <em>region</em> for the <em>premium</em> segment last <em>quarter</em>” is three dimension attributes wrapped around one fact measure.`,
        `This is why dimension attributes must be <b>rich and plentiful</b>: each one is a way to slice. The cost is modest write-time complexity — the ETL must look up each surrogate and maintain the wide rows — but that is paid once, in the pipeline, so that every read stays a clean star join.`,
      ],
      callout: { kind: 'insight', text: 'Count your report’s GROUP BYs and filters: every one is a dimension attribute. More good attributes means more questions answerable with no schema change.' },
      metrics: { dimensions: 2, attributes: 9, cardinality: '2M', rows: '2M' },
      scene: { view: 'slice', note: 'fact_sales joins dim_customer on customer_key — the attributes drive the filters, group-bys and labels.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Wide, keyed, and readable',
      body: [
        `A dimension is the descriptive half of the star: <b>wide and denormalized</b>, with <b>relatively few rows</b>, a <b>surrogate primary key</b> the warehouse owns, and <b>verbose, readable attributes</b> — real words, not cryptic codes — that serve as the filters, group-bys and labels of every query. Hierarchies ride along as extra columns so drill-down never needs a join.`,
        `Build dimensions for the reader: spell out <code>category = 'Outdoor Furniture'</code>, not <code>cat = 7</code>. The storage is cheap and the clarity compounds. Next come the <b>grain</b> that pins down a fact row and the <b>conformed dimensions</b> that let one <code>dim_date</code> serve many facts at once.`,
      ],
      callout: { kind: 'insight', text: 'Surrogate key, few rows, many rich attributes. A dimension is a dictionary the facts look words up in — make the words readable.' },
      metrics: { dimensions: 2, attributes: 9, cardinality: '2M', rows: '2M' },
      scene: { view: 'recap', note: 'fact_sales → dim_customer on the surrogate key — lean fact, wide readable dimension, star joined.' },
    },
  ],
};
