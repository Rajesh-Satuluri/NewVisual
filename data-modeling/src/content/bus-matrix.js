/* content/bus-matrix.js — the "Kimball Bus Matrix" lesson, as DATA. Same shape as
   content/third-normal-form.js. `scene` is a view-snapshot consumed by
   db/bus-matrix-scene.js.

   A dimensional-modeling PLANNING lesson: the Enterprise Bus Matrix is Kimball's
   tool for scoping a warehouse. Rows are business processes (each a fact table),
   columns are conformed dimensions; marks show which dimensions each process uses.
   The hero visual is a GRID, not a star. */

export const busMatrixLesson = {
  id: 'bus-matrix',
  title: 'Kimball Bus Matrix',
  group: 'Dimensional Modeling',
  summary: 'The Enterprise Bus Matrix is Kimball’s planning tool for a data warehouse: rows are business processes, columns are conformed dimensions, and marks show which process uses which. It reveals the shared dimensions that integrate the whole warehouse.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['facts', 'dimensions', 'tables', 'integrity'],
  legend: [],
  goals: [
    { text: 'Each business process becomes its own fact table', step: 0 },
    { text: 'Conformed dimensions are shared, identical across processes', step: 1 },
    { text: 'The matrix crosses processes against dimensions with marks', step: 2 },
    { text: 'Shared columns are the “bus” that integrates every mart', step: 3 },
    { text: 'The matrix sequences delivery — build one row at a time', step: 4 },
    { text: 'Plan the bus first; conformed dimensions guarantee integration', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Processes',
      title: 'A warehouse is a set of business processes',
      body: [
        `Before drawing a single table, Kimball asks: what does the business actually <em>do</em>? Each measurable activity — <code>Sales</code>, <code>Returns</code>, <code>Inventory</code>, <code>Shipping</code> — is a <span class="term">business process</span>, and each becomes exactly one <b>fact table</b> at its own grain.`,
        `Listing the processes first, rather than the tables, keeps the warehouse grounded in what the business measures instead of in whatever the source systems happen to store. These process rows are the backbone of the plan: finish one, and a whole department can report; the warehouse grows process by process.`,
      ],
      callout: { kind: 'insight', text: 'One business process, one fact table. Scope the warehouse by what the business does, not by what the source database contains.' },
      metrics: { facts: 4, dimensions: 0, tables: 4, integrity: 'low' },
      scene: { view: 'processes', note: 'Four business processes — Sales, Returns, Inventory, Shipping — each becomes one fact table.' },
    },
    { // 1 — SETUP (dimensions)
      chapter: 'setup', short: 'Conformed dims',
      title: 'Conformed dimensions are shared, not copied',
      body: [
        `Those processes don’t stand alone — they describe the <em>same</em> things from different angles. Sales, Returns and Inventory all reference a product, a date, a store. A <span class="term">conformed dimension</span> is a single, agreed dimension — <code>dim_date</code>, <code>dim_product</code>, <code>dim_customer</code>, <code>dim_store</code>, <code>dim_promotion</code> — used <b>identically</b> by every process that needs it.`,
        `“Conformed” means the <code>dim_product</code> joined to Sales is byte-for-byte the same table, with the same keys and the same attributes, as the one joined to Inventory. That shared definition is what lets you compare “units sold” against “units on hand” for the same product and get a meaningful answer.`,
      ],
      callout: { kind: 'tip', text: 'A dimension is conformed when every fact that uses it uses the exact same table — same keys, same attributes, same meaning.' },
      metrics: { facts: 4, dimensions: 5, tables: 9, integrity: 'mid' },
      scene: { view: 'dimensions', note: 'Five conformed dimensions — Date, Product, Customer, Store, Promotion — shared across processes.' },
    },
    { // 2 — TECHNIQUE (the grid)
      chapter: 'technique', short: 'The matrix',
      title: 'Cross processes against dimensions',
      body: [
        `Now draw the <span class="term">bus matrix</span>: processes down the rows, conformed dimensions across the columns, and a mark in every cell where that process uses that dimension. Sales uses Date, Product, Customer, Store and Promotion. Inventory uses Date, Product and Store — but has no customer and no promotion.`,
        `The grid is the entire warehouse plan on one page. A reviewer who has never seen the schema can read, at a glance, which dimensions each fact table needs and — crucially — which dimensions are shared. The dense columns jump out immediately.`,
      ],
      callout: { kind: 'insight', text: 'The matrix is the whole warehouse on one sheet: rows are fact tables, columns are shared dimensions, marks are the joins.' },
      changes: ['+ rows = processes (fact tables)', '+ columns = conformed dimensions', '~ X marks every process–dimension join'],
      metrics: { facts: 4, dimensions: 5, tables: 9, integrity: 'high' },
      scene: { view: 'matrix', note: 'The bus matrix — processes × conformed dimensions, a mark at each join.' },
    },
    { // 3 — SOLUTION (the bus)
      chapter: 'technique', short: 'The bus',
      title: 'The shared columns are the bus',
      body: [
        `Read the matrix down the columns and the shared dimensions reveal themselves — <code>dim_date</code> and <code>dim_product</code> are marked in nearly every row. These heavily-shared dimensions are the <span class="term">bus</span>: the common backbone that every fact table plugs into, exactly like cards sharing a computer’s data bus.`,
        `Because each process connects to the <em>same</em> conformed dimensions, the separate data marts are integrated <b>by construction</b>. You never built an integration layer; sharing <code>dim_product</code> <em>is</em> the integration. Any two processes on the bus can be analysed together because they grade their facts against one shared vocabulary.`,
      ],
      callout: { kind: 'tip', text: 'Integration isn’t a later project — it’s a consequence. Share the dimensions and the marts line up automatically.' },
      metrics: { facts: 4, dimensions: 5, tables: 9, integrity: 'high' },
      scene: { view: 'conformed', note: 'Dense columns — Date and Product — are the bus every fact plugs into.' },
    },
    { // 4 — TRADEOFF / method (sequencing)
      chapter: 'tradeoff', short: 'Deliver by row',
      title: 'Build one row at a time',
      body: [
        `The matrix is also a delivery schedule. You don’t build the whole warehouse at once — you deliver it <b>one row at a time</b>. Ship the Sales fact and the five dimensions it needs; a real mart is live and reporting. The next process, Returns, reuses <code>dim_date</code>, <code>dim_product</code> and <code>dim_customer</code> — already built — and adds only what’s new.`,
        `This is the pragmatic core of Kimball’s method: incremental, each increment independently useful, and each one cheaper than the last as the shared dimensions accumulate. The risk is only that you must get the <em>conformed</em> dimensions right early, because every later row leans on them.`,
      ],
      callout: { kind: 'tip', text: 'Deliver row by row: each fact table is a usable mart, and every shared dimension makes the next row cheaper.' },
      metrics: { facts: 4, dimensions: 5, tables: 9, integrity: 'high' },
      scene: { view: 'sequence', note: 'Deliver the matrix row by row — each process reuses dimensions already built.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Plan the bus before the tables',
      body: [
        `The Enterprise Bus Matrix scopes a dimensional warehouse before any SQL is written. Rows are the business processes, each a fact table; columns are the conformed dimensions, each shared identically; the marks are the joins. It exposes the shared bus, sequences delivery row by row, and guarantees integration because every mart plugs into the same dimensions.`,
        `It is a planning artifact, not a schema — but it drives the schema that follows. Agree the conformed dimensions, draw the grid, and the entire warehouse’s architecture is visible and debatable on a single page, long before a single fact table is loaded.`,
      ],
      callout: { kind: 'insight', text: 'Rows are facts, columns are conformed dimensions, marks are joins — the whole warehouse, planned on one page.' },
      metrics: { facts: 4, dimensions: 5, tables: 9, integrity: 'high' },
      scene: { view: 'recap', note: 'The bus matrix — processes × conformed dimensions — the warehouse plan on one sheet.' },
    },
  ],
};
