/* Fundamentals · Modeling & Design track (P2-2) — a dedicated, deeper
   path through dimensional design: grain & dimensions, star vs snowflake,
   fact types & additivity, keys, SCD, methodologies. Vendor-neutral.
   Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ─────────────── Grain & dimensions (deep) ─────────────── */
    'fund-dim-grain': {
      eyebrow: '⭐ Modeling & Design',
      title: 'Grain, dimensions & the bus matrix',
      lead: 'Every dimensional design starts with one decision: <strong>the grain</strong> — what a single fact row means. Get it right and the rest of the model follows. This page goes past "facts and dimensions" into the choices that make a warehouse coherent across teams: conformed dimensions, role-playing, hierarchies, and the bus matrix.',
      sections: [
        { h: 'Declare the grain first — always', p:
          '<p>The <strong>grain</strong> is the precise meaning of one fact row: "one row per order <em>line</em>", "one row per sensor reading per minute", "one row per boarding pass scan". Declare it in a sentence before you pick a single dimension or measure. Why first? Because grain decides <em>which dimensions apply</em> (a dimension must be true at that grain) and <em>whether measures are additive</em>. Mixing grains in one table is the most common modeling bug — it silently double-counts.</p>' +
          '<p>Prefer the <strong>lowest practical grain</strong> (atomic). Atomic facts can always be rolled up later; pre-aggregated facts can never be drilled back down. You can add summary tables for speed, but keep the atomic fact as the source of truth.</p>' },
        { h: 'Conformed dimensions — the shared vocabulary', p:
          '<p>A <strong>conformed dimension</strong> is one dimension (same keys, same attributes, same meaning) used by many fact tables. When <code>dim_date</code> and <code>dim_customer</code> mean the same thing to Sales, Marketing, and Support, their facts can be compared and combined — "revenue vs. support tickets by customer by month" just works. Conformed dimensions are what turn isolated data marts into an integrated warehouse.</p>' },
        { h: 'Role-playing dimensions & hierarchies', p:
          '<p>One physical dimension can play multiple <strong>roles</strong>. A single <code>dim_date</code> is joined three times to an orders fact as <em>order date</em>, <em>ship date</em>, and <em>delivery date</em> (via three date keys / three views). That\'s a role-playing dimension — one table, several aliases.</p>' +
          '<p>Dimensions also carry <strong>hierarchies</strong> — date → day/month/quarter/year, product → SKU/brand/category. Hierarchies let BI tools drill down and roll up along natural paths without new joins.</p>' },
        { h: 'The bus matrix — plan the whole warehouse', p:
          '<p>Kimball\'s <strong>bus matrix</strong> is a grid: business processes (rows, each becoming a fact table) × dimensions (columns). A checkmark means "this process uses this dimension". It\'s a one-page plan that shows which dimensions are shared (conformed) and lets you build fact tables incrementally while guaranteeing they\'ll integrate. Build it before building tables.</p>' +
          '<div class="code-block" data-noswipe><pre>Process \\ Dim   | Date | Customer | Product | Store | Promo\n----------------|------|----------|---------|-------|------\nSales orders    |  ✓   |    ✓     |    ✓    |   ✓   |  ✓\nInventory       |  ✓   |          |    ✓    |   ✓   |\nReturns         |  ✓   |    ✓     |    ✓    |   ✓   |\nWeb clicks      |  ✓   |    ✓     |    ✓    |       |  ✓</pre></div>' },
      ],
      map: {
        intro: 'The grain-first, conformed-dimension discipline is identical everywhere; platforms differ only in how they physically optimize the shared dimensions.',
        sf: { term: 'Automatic clustering', points: ['Conformed dims as normal tables', 'Auto-clustering keeps big facts pruned', 'Search optimization for point lookups'] },
        rs: { term: 'Replicate conformed dims', points: ['DISTSTYLE ALL on small conformed dims', 'So every node has them for local joins', 'Sort facts on the date key'] },
        fb: { term: 'Semantic model relationships', points: ['Conformed dims become shared relationships', 'Role-playing via multiple relationships', 'Reused across many Power BI reports'] },
      },
      takeaway: 'Write the <b>grain</b> as a sentence before anything else, model at the <b>atomic</b> level, and share <b>conformed dimensions</b> so facts integrate. Plan the whole warehouse with a <b>bus matrix</b> (process × dimension) so you can build one fact table at a time and still get a coherent whole.',
      docs: [
        { label: 'Kimball: Four-step design process', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/' },
        { label: 'Fabric: Dimensional modeling', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-overview' },
      ],
    },

    /* ─────────────── Star vs snowflake (deep) ─────────────── */
    'fund-star-snow': {
      eyebrow: '⭐ Modeling & Design',
      title: 'Star vs snowflake schema — the real trade-off',
      lead: 'Both arrange a fact surrounded by dimensions. The difference is whether dimensions are kept <strong>denormalized</strong> (star) or broken into normalized sub-tables (snowflake). In a columnar MPP warehouse the choice is mostly about <strong>join count and usability</strong>, not storage.',
      sections: [
        { h: 'Star: one flat table per dimension', p:
          '<p>In a <strong>star schema</strong> each dimension is a single wide, denormalized table. <code>dim_product</code> holds SKU, name, brand, category, department — all in one row. A query joins the fact to just the dimensions it needs: few, predictable joins the planner handles well. Redundancy (the category name repeats for every product) is cheap because columnar compression collapses repeated values.</p>' },
        { h: 'Snowflake: normalized dimension sub-tables', p:
          '<p>A <strong>snowflake schema</strong> normalizes a dimension into a chain: <code>dim_product → dim_brand → dim_category</code>. Less redundancy and a tidy model, but a "sales by category" query now traverses several joins. On large dimensions the extra joins cost more than the space they save — which is why warehouses usually prefer star.</p>' },
        { h: 'When snowflaking is actually justified', p:
          '<ul>' +
          '<li><strong>Huge, high-cardinality dimensions</strong> where a repeated wide attribute genuinely wastes space or must be maintained in one place.</li>' +
          '<li><strong>Outriggers</strong>: a small shared sub-dimension (e.g. a date attached to a dimension row) factored out deliberately.</li>' +
          '<li><strong>Governed hierarchies</strong> that several dimensions reference and that must stay consistent.</li>' +
          '</ul>' +
          '<p>Default to <strong>star</strong>; snowflake only the specific branches that earn it. Many teams land raw data normalized and expose a star (views or a curated layer) to BI — best of both.</p>' },
      ],
      diagramTitle: '🎬 Star vs snowflake, side by side',
      stage: { caption: 'Same fact — denormalized star vs normalized snowflake dimension',
        groups: [
          { id: 'fact', label: 'Fact (center)', sub: 'fact_sales', nodes: [ { id: 'f', label: 'amount, product_key, date_key' } ], connectorAfter: 'joins to dimensions' },
          { id: 'star', label: 'Star: one flat dimension', nodes: [ { id: 'dprod', label: 'dim_product', sub: 'sku · name · brand · category' } ], connectorAfter: '1 join' },
          { id: 'snow', label: 'Snowflake: normalized chain', nodes: [
            { id: 'sprod', label: 'dim_product' }, { id: 'sbrand', label: 'dim_brand' }, { id: 'scat', label: 'dim_category' } ], connectorAfter: '3 joins' },
        ] },
      steps: [
        { label: 'Fact', title: 'Start with the fact', on: { spot: ['fact'], flow: ['f'] },
          body: 'A sales fact stores the measure and foreign keys. The only question is how we shape the product dimension it joins to.',
          facts: ['Measures + foreign keys', 'Same fact either way', 'Shape is a dimension choice'] },
        { label: 'Star', title: 'Denormalized — one join', on: { spot: ['star'], flow: ['dprod'], conn: ['fact'] },
          body: '"Sales by category" = fact ⋈ dim_product. One join, attributes right there. Repetition of brand/category is compressed away columnar-side.',
          facts: ['1 join, simple SQL', 'Attributes co-located', 'Redundancy is cheap (compression)'] },
        { label: 'Snowflake', title: 'Normalized — more joins', on: { spot: ['snow'], flow: ['sprod', 'sbrand', 'scat'], conn: ['fact'] },
          body: 'The same question now walks product → brand → category. Less redundancy, but more joins and more complex SQL for every query.',
          facts: ['3 joins for one answer', 'Less storage redundancy', 'Costlier & harder to use'] },
        { label: 'Pick', title: 'Default to star', on: { spot: ['star'], flow: ['dprod'], dim: ['snow'] },
          body: 'In columnar MPP, join count usually beats storage. Default to star; snowflake only the specific branches with a real maintenance or size reason.',
          facts: ['Star by default', 'Snowflake select branches', 'Optimize for queries, not space'] },
      ],
      map: {
        intro: 'All three run either schema; the columnar storage makes star\'s redundancy nearly free on every one.',
        sf: { term: 'Star preferred', points: ['Micro-partitions compress repeated attrs', 'Joins handled without manual tuning', 'Snowflake-the-schema ≠ Snowflake-the-vendor!'] },
        rs: { term: 'Star + ALL dims', points: ['Replicate small star dimensions (ALL)', 'Avoids redistributing on every join', 'Snowflaking adds redistribution risk'] },
        fb: { term: 'Star for semantic models', points: ['Power BI/semantic models expect star', 'Star gives the best Direct Lake performance', 'Normalize only in the lakehouse layer'] },
      },
      takeaway: 'Default to a <b>star</b>: denormalized dimensions mean fewer joins and simpler SQL, and columnar compression makes the redundancy almost free. Reach for <b>snowflake</b> only on specific large or governed branches. Note the naming trap: "snowflake schema" is a modeling term, unrelated to Snowflake the platform.',
      docs: [
        { label: 'Kimball: Star schema basics', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/star-schemas-cubes/' },
        { label: 'Fabric: Dimensional modeling', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-dimension-tables' },
      ],
    },

    /* ─────────────── Fact types & additivity ─────────────── */
    'fund-fact-types': {
      eyebrow: '⭐ Modeling & Design',
      title: 'Fact types & additivity',
      lead: 'Not all facts behave the same way under a <code>SUM</code>. Choosing the right <strong>fact type</strong> and knowing which measures are <strong>additive</strong> is what keeps a dashboard from quietly reporting wrong numbers.',
      sections: [
        { h: 'The three fact table types', p:
          '<ul>' +
          '<li><strong>Transaction fact</strong> — one row per event (an order line, a click). The most common and most flexible; atomic grain, fully additive measures.</li>' +
          '<li><strong>Periodic snapshot</strong> — one row per entity per time period (account balance per day, inventory per store per week). Great for "state over time"; measures are often <em>semi-additive</em>.</li>' +
          '<li><strong>Accumulating snapshot</strong> — one row per process instance, updated as it moves through milestones (order placed → shipped → delivered). Columns hold the dates/durations of each step; the row is revisited and updated.</li>' +
          '</ul>' },
        { h: 'Additivity — can you SUM it?', p:
          '<ul>' +
          '<li><strong>Additive</strong>: summable across <em>every</em> dimension (sales amount, quantity). The easy, ideal case.</li>' +
          '<li><strong>Semi-additive</strong>: summable across some dimensions but <em>not time</em> — e.g. an account balance. Summing balances across days is meaningless; you take the last value (or average) over time but sum across accounts.</li>' +
          '<li><strong>Non-additive</strong>: can\'t be summed at all (ratios, percentages, unit prices). Store the fully-additive components (numerator and denominator) and compute the ratio <em>after</em> aggregation, never before.</li>' +
          '</ul>' },
        { h: 'Factless facts, degenerate & junk dimensions', p:
          '<p>A <strong>factless fact</strong> has no measures — it records that an event happened (a student attended a class, a promotion was in effect). You count rows or coverage.</p>' +
          '<p>A <strong>degenerate dimension</strong> is a dimension attribute that lives on the fact itself with no separate table — classically an order number or invoice number. A <strong>junk dimension</strong> gathers a handful of low-cardinality flags/indicators (is_gift, channel, order_status) into one small dimension instead of scattering many tiny columns across the fact.</p>' },
      ],
      map: {
        intro: 'Fact types and additivity are pure modeling concepts — the platform just stores and aggregates them.',
        sf: { term: 'Snapshots via streams/tasks', points: ['Transaction facts as insert-only tables', 'Periodic snapshots built by scheduled tasks', 'Accumulating via MERGE updates'] },
        rs: { term: 'Snapshots via scheduled SQL', points: ['Insert-only transaction facts', 'Snapshot jobs on a schedule', 'Semi-additive handled in SQL (window fns)'] },
        fb: { term: 'Snapshots in pipelines', points: ['Transaction facts in the Warehouse', 'Snapshots via Data Factory pipelines', 'Measures model additivity in the semantic layer'] },
      },
      takeaway: 'Pick the fact type by behavior: <b>transaction</b> (per event), <b>periodic snapshot</b> (state per period), or <b>accumulating snapshot</b> (a process that gets updated). Then classify every measure — <b>additive / semi-additive / non-additive</b> — and never SUM a semi-additive measure over time or a ratio before aggregating.',
      docs: [
        { label: 'Kimball: Fact table techniques', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/' },
      ],
    },

    /* ─────────────── Surrogate vs natural keys ─────────────── */
    'fund-keys': {
      eyebrow: '⭐ Modeling & Design',
      title: 'Surrogate vs natural keys',
      lead: 'Should a dimension be keyed by the source system\'s own ID (natural key) or a warehouse-generated integer (surrogate key)? For dimensional models the answer is almost always <strong>surrogate keys</strong> — and the reasons are structural, not cosmetic.',
      sections: [
        { h: 'Natural vs surrogate', p:
          '<p>A <strong>natural (business) key</strong> comes from the source — an email, an SKU, a customer ID. A <strong>surrogate key</strong> is a meaningless warehouse-generated integer (identity/sequence) that is the dimension\'s primary key; the fact stores the surrogate, not the natural key.</p>' },
        { h: 'Why surrogate keys win in a warehouse', p:
          '<ul>' +
          '<li><strong>SCD history needs them.</strong> With Type 2, one customer has several versioned rows. They share a natural key but need distinct primary keys — the surrogate — so a fact can point at the <em>version</em> that was current when the event happened.</li>' +
          '<li><strong>Insulation from source change.</strong> Sources merge, re-key, or change ID formats. Surrogates keep the warehouse stable through all of it.</li>' +
          '<li><strong>Integration.</strong> Two sources with clashing natural keys unify cleanly under one surrogate.</li>' +
          '<li><strong>Performance.</strong> A narrow integer key joins and compresses better than a wide composite or string natural key.</li>' +
          '<li><strong>Late-arriving / unknown members.</strong> A dedicated surrogate (e.g. -1 "Unknown") lets facts land before their dimension row exists.</li>' +
          '</ul>' },
        { h: 'Keep the natural key too', p:
          '<p>Surrogate is the <em>primary</em> key, but always keep the natural/business key as an attribute on the dimension. You need it to look rows up during loads, to match incoming source records to the right dimension member, and for humans to trace a row back to the source. A common pattern: surrogate PK + natural key + the SCD validity columns.</p>' },
      ],
      map: {
        intro: 'Every platform can generate surrogates; the mechanism differs slightly.',
        sf: { term: 'IDENTITY / sequences', points: ['Auto-increment IDENTITY columns', 'Or SEQUENCE objects for shared ranges', 'Hash keys when distributed generation needed'] },
        rs: { term: 'IDENTITY columns', points: ['IDENTITY(seed, step) on the dim PK', 'Note: not guaranteed gap-free/contiguous', 'Narrow int keys aid dist/sort'] },
        fb: { term: 'Generated keys', points: ['Warehouse: IDENTITY / generated keys', 'Or ROW_NUMBER() during the load', 'Keep business key for semantic relationships'] },
      },
      takeaway: 'Key dimensions on a <b>surrogate</b> (a meaningless warehouse integer) and store the <b>natural key</b> as an attribute. Surrogates are what make SCD Type 2 history, source-change insulation, cross-source integration, and fast narrow joins possible — natural keys alone can\'t do any of those.',
      docs: [
        { label: 'Kimball: Surrogate keys', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/surrogate-key/' },
      ],
    },

  });
})();
