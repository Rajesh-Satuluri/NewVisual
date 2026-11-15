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

    /* ─────────────── Slowly-changing dimensions ─────────────── */
    'fund-scd': {
      eyebrow: '🏗️ Modeling & Design',
      title: 'Slowly-changing dimensions (SCD 1 / 2 / 3)',
      lead: 'Dimension attributes drift over time — a customer moves city, a product is recategorized. How you handle that change is the <strong>SCD type</strong>, and it decides whether your reports can answer "what was true <em>then</em>" or only "what is true <em>now</em>."',
      sections: [
        { h: 'The common SCD types', p:
          '<ul>' +
          '<li><strong>Type 0 — retain:</strong> the attribute never changes (e.g. original signup date). Updates are ignored.</li>' +
          '<li><strong>Type 1 — overwrite:</strong> update in place, keep no history. Simple; the dimension always reflects the latest value. You lose the ability to report on the old value.</li>' +
          '<li><strong>Type 2 — add new row:</strong> keep full history by versioning. The old row is closed (valid-to set, current flag off) and a new row is inserted with a new surrogate key. Facts point at whichever version was current at event time. This is the workhorse.</li>' +
          '<li><strong>Type 3 — add new column:</strong> keep a limited history by storing a "previous value" column alongside the current. Only the last change is retained. Useful for a planned, one-off re-org you still want to compare against.</li>' +
          '<li><strong>Type 4 / 6:</strong> Type 4 moves history to a separate table; Type 6 (a.k.a. 1+2+3) combines overwrite, versioned rows, and a current-value column for flexible reporting.</li>' +
          '</ul>' },
        { h: 'Type 2 table shape', p:
          '<p>A Type 2 dimension carries the versioning columns explicitly:</p>' +
          '<div class="code-block" data-noswipe><pre>dim_customer\n  customer_sk     BIGINT   -- surrogate PK (unique per version)\n  customer_id     VARCHAR  -- natural/business key (repeats across versions)\n  name            VARCHAR\n  city            VARCHAR  -- the Type-2 tracked attribute\n  valid_from      DATE\n  valid_to        DATE     -- 9999-12-31 while current\n  is_current      BOOLEAN</pre></div>' +
          '<p>One business customer can have several rows — one per historical state — but exactly one with <code>is_current = true</code>.</p>' },
        { h: 'Applying a Type 2 change with MERGE', p:
          '<p>A single <code>MERGE</code> can\'t both expire the old row <em>and</em> insert a new version for the same key, so the robust, portable pattern is two steps: (1) close out rows whose tracked attribute changed, (2) insert the new versions.</p>' +
          '<div class="code-block" data-noswipe><pre>-- Step 1: expire current rows that changed\nUPDATE dim_customer AS d\nSET    valid_to  = CURRENT_DATE - 1,\n       is_current = FALSE\nFROM   staging_customer AS s\nWHERE  d.customer_id = s.customer_id\n  AND  d.is_current  = TRUE\n  AND  d.city       <> s.city;        -- a tracked attribute changed\n\n-- Step 2: insert the new current version\nINSERT INTO dim_customer\n  (customer_sk, customer_id, name, city, valid_from, valid_to, is_current)\nSELECT next_sk(), s.customer_id, s.name, s.city,\n       CURRENT_DATE, DATE \'9999-12-31\', TRUE\nFROM   staging_customer AS s\nLEFT JOIN dim_customer d\n       ON d.customer_id = s.customer_id AND d.is_current = TRUE\nWHERE  d.customer_id IS NULL           -- brand-new customer\n   OR  d.city <> s.city;               -- or a tracked change</pre></div>' +
          '<p>Some engines let you do the expire-step inside a <code>MERGE … WHEN MATCHED THEN UPDATE</code> and the insert-step in a second pass; the two-statement form above works everywhere and is easy to reason about. Fact loads then look up the surrogate by natural key <em>and</em> event date (<code>valid_from ≤ event_date &lt; valid_to</code>) so each fact points at the correct version.</p>' },
        { h: 'Choosing a type', p:
          '<p>Use <strong>Type 1</strong> when history doesn\'t matter (fixing a typo, non-analytical attributes). Use <strong>Type 2</strong> whenever point-in-time correctness matters — the default for analytical dimensions. Use <strong>Type 3</strong> for a specific "compare to previous grouping" need. Decide <em>per attribute</em>: one dimension often mixes Type 1 columns (overwrite) and Type 2 columns (version).</p>' },
      ],
      map: {
        intro: 'SCD is modeling logic in SQL; the only platform difference is the MERGE/upsert syntax and surrogate generation.',
        sf: { term: 'MERGE + streams', points: ['Standard MERGE for the expire step', 'Streams detect changes incrementally', 'Tasks schedule the Type-2 load'] },
        rs: { term: 'MERGE / staged upsert', points: ['Native MERGE (GA) or DELETE+INSERT', 'IDENTITY for the surrogate key', 'Distribute/sort dim on the natural key'] },
        fb: { term: 'MERGE (T-SQL)', points: ['T-SQL MERGE in the Warehouse', 'Or pipeline/dataflow SCD transforms', 'Semantic model reads the current rows'] },
      },
      takeaway: 'The SCD <b>type</b> decides whether you can report history. <b>Type 1</b> overwrites (no history), <b>Type 2</b> versions rows (full point-in-time history — the default), <b>Type 3</b> keeps one prior value in a column. Apply Type 2 as a two-step <b>expire-then-insert</b>, and choose the type per attribute, not per table.',
      docs: [
        { label: 'Kimball: Slowly changing dimensions', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/' },
        { label: 'Fabric: SCD with MERGE', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-load-tables' },
      ],
    },

    /* ─────────────── Kimball vs Inmon ─────────────── */
    'fund-kimball-inmon': {
      eyebrow: '🏗️ Modeling & Design',
      title: 'Kimball vs Inmon — two philosophies',
      lead: 'The two foundational approaches to warehouse architecture differ in <strong>where modeling happens</strong> and <strong>what the enterprise core looks like</strong>. Most modern platforms blend them, but knowing the pure forms sharpens every design decision — and it\'s a classic interview question.',
      sections: [
        { h: 'Inmon — top-down, normalized core (CIF)', p:
          '<p>Bill Inmon\'s <strong>Corporate Information Factory</strong> builds an enterprise data warehouse (EDW) first: a <strong>normalized (3NF)</strong>, integrated, subject-oriented repository that is the single source of truth. Dimensional <strong>data marts</strong> are then derived <em>from</em> the EDW for each department. Strengths: strong integration and consistency, less redundancy, a durable enterprise model. Cost: more upfront design, slower first delivery, extra ETL from EDW to marts.</p>' },
        { h: 'Kimball — bottom-up, dimensional bus', p:
          '<p>Ralph Kimball builds <strong>dimensional data marts directly</strong>, unified by <strong>conformed dimensions</strong> on a shared bus (the bus matrix). There\'s no separate normalized core — the collection of conformed star schemas <em>is</em> the warehouse. Strengths: fast delivery of business value, query-friendly from day one, incremental. Cost: discipline required so marts actually conform; integration is a practice, not a layer.</p>' },
        { h: 'How they compare', p:
          '<div class="code-block" data-noswipe><pre>                 Inmon (CIF)            Kimball (bus)\nDirection        top-down               bottom-up\nEnterprise core  normalized 3NF EDW     none (conformed dims)\nMarts            derived from EDW       built directly\nFirst delivery   slower                 faster\nIntegration      by design (the EDW)    by conformed dimensions\nStorage          less redundant         some redundancy (cheap)\nBest when        many sources, strong   fast BI value, evolving\n                 governance needs        requirements</pre></div>' },
        { h: 'The modern synthesis', p:
          '<p>Cheap storage and elastic compute blur the debate. A very common pattern: land raw data, build a <strong>cleaned/normalized or Data-Vault core</strong> for integration and history, then serve <strong>Kimball-style stars</strong> (often as the gold layer / semantic models) for BI. You get Inmon\'s integration <em>and</em> Kimball\'s usability — which is exactly what the medallion architecture formalizes.</p>' },
      ],
      map: {
        intro: 'All three platforms run either philosophy; their "serving layer" is where the Kimball star usually lands.',
        sf: { term: 'Layered databases/schemas', points: ['RAW / INTEGRATION / PRESENTATION schemas', 'Streams + tasks move between layers', 'Stars served to BI from PRESENTATION'] },
        rs: { term: 'Staging → core → marts', points: ['Staging schema for raw loads', 'Normalized/integrated core', 'Dimensional marts for BI tools'] },
        fb: { term: 'Medallion + semantic model', points: ['Bronze/Silver/Gold in the lakehouse', 'Gold = Kimball stars', 'Semantic model serves Power BI'] },
      },
      takeaway: '<b>Inmon</b> = top-down normalized EDW first, marts derived from it (integration by design, slower start). <b>Kimball</b> = bottom-up conformed dimensional marts, no separate core (fast value, integration by discipline). Modern warehouses usually <b>blend</b> them: an integrated core feeding Kimball stars for BI — the medallion pattern.',
      docs: [
        { label: 'Kimball Group: techniques', url: 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/' },
        { label: 'Fabric: Medallion architecture', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture' },
      ],
    },

    /* ─────────────── Data Vault 2.0 ─────────────── */
    'fund-data-vault': {
      eyebrow: '🏗️ Modeling & Design',
      title: 'Data Vault 2.0 — a primer',
      lead: 'Data Vault is a modeling approach for the <strong>integration core</strong> — built for many changing sources, full auditability, and parallel loading. It is not a BI-serving model; you still build stars on top. Know it for enterprise and interview contexts.',
      sections: [
        { h: 'The three building blocks', p:
          '<ul>' +
          '<li><strong>Hubs</strong> — the list of unique business keys for a concept (customer, product), plus a hash key and load metadata. Hubs are stable: business keys rarely change.</li>' +
          '<li><strong>Links</strong> — relationships/associations between hubs (a customer places an order). Links are many-to-many by design, so new relationships don\'t require restructuring.</li>' +
          '<li><strong>Satellites</strong> — the descriptive, <em>time-stamped</em> attributes hanging off a hub or link. All history is kept by inserting new satellite rows — never updating — so the vault is inherently auditable.</li>' +
          '</ul>' },
        { h: 'Why teams use it', p:
          '<ul>' +
          '<li><strong>Source agility:</strong> add a new source by adding satellites/links without remodeling existing structures.</li>' +
          '<li><strong>Auditability:</strong> insert-only, fully historized, with record source and load timestamps on everything — strong for compliance.</li>' +
          '<li><strong>Parallel loads:</strong> hubs, links, and satellites load independently (hash keys decouple them), which suits big automated pipelines.</li>' +
          '</ul>' +
          '<p>Data Vault 2.0 adds <strong>hash keys</strong> (deterministic hashes of business keys) for load parallelism and join stability, plus patterns for the whole pipeline.</p>' },
        { h: 'Where it sits (and its cost)', p:
          '<p>The vault is the <strong>raw/integration layer</strong>, not what analysts query. Its normalization means <em>many</em> joins, so you build a dimensional <strong>information mart</strong> (Kimball stars / views) on top for BI. The trade-off: excellent flexibility and auditability, but more tables, more joins, and real complexity — justified for large, multi-source, heavily-governed enterprises, overkill for a small warehouse.</p>' },
      ],
      map: {
        intro: 'Data Vault is vendor-neutral SQL; platforms differ only in hashing and automation support.',
        sf: { term: 'Vault + streams/tasks', points: ['HASH keys via MD5/SHA functions', 'Insert-only satellites, no updates', 'Serve marts from PRESENTATION schema'] },
        rs: { term: 'Vault in staging/core', points: ['Hubs/links/sats as normal tables', 'Distribute on hash keys', 'Derive marts for BI'] },
        fb: { term: 'Vault in the lakehouse', points: ['Bronze/Silver hold the vault', 'Gold = dimensional marts', 'Automate loads via pipelines'] },
      },
      takeaway: 'Data Vault models an auditable, source-agile <b>integration core</b> from <b>hubs</b> (business keys), <b>links</b> (relationships), and insert-only <b>satellites</b> (historized attributes). It\'s not for direct BI — build Kimball <b>stars on top</b>. Great for large multi-source, compliance-heavy shops; overkill for small ones.',
      docs: [
        { label: 'Fabric: Medallion & modeling', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture' },
      ],
    },

    /* ─────────────── Data marts & ODS ─────────────── */
    'fund-marts-ods': {
      eyebrow: '🏗️ Modeling & Design',
      title: 'Data marts & the ODS',
      lead: 'Beyond the warehouse core sit two supporting structures: the <strong>data mart</strong> (a focused slice for one audience) and the <strong>operational data store</strong> (near-real-time integrated operational data). Knowing when to use each keeps a platform tidy.',
      sections: [
        { h: 'Data marts — the focused serving layer', p:
          '<p>A <strong>data mart</strong> is a subject- or department-focused subset of the warehouse — Finance, Marketing, Sales — usually a small set of star schemas tuned for that audience\'s questions. Benefits: simpler and faster for that group, easier to secure, clear ownership. Risk: if marts are built in isolation they drift apart — which is exactly why <strong>conformed dimensions</strong> matter. Marts can be <em>dependent</em> (derived from a central warehouse, Inmon-style) or <em>independent</em> (standalone — convenient but prone to silos).</p>' },
        { h: 'The ODS — integrated, current, operational', p:
          '<p>An <strong>operational data store</strong> integrates data from multiple source systems and keeps it <strong>current</strong> (near-real-time, frequently overwritten) for <em>operational</em> reporting and lookups — "what is the customer\'s status right now across all systems?" Unlike the warehouse, the ODS holds little history and favors current state. It often serves as a landing/integration hop on the way to the warehouse.</p>' },
        { h: 'How they fit together', p:
          '<div class="code-block" data-noswipe><pre>Sources ─▶ ODS (current, integrated, operational)\n         └▶ Warehouse / core (historical, analytical)\n                 └▶ Data marts (focused, dimensional, for BI)</pre></div>' +
          '<p>Rule of thumb: <strong>ODS</strong> answers "what\'s true now" for operations; the <strong>warehouse</strong> answers "what happened over time" for analytics; <strong>marts</strong> make the warehouse fast and friendly for a specific audience. In cloud platforms the ODS is often just a current-state schema/layer rather than a separate system.</p>' },
      ],
      map: {
        intro: 'These are architectural roles; each platform realizes them as schemas/layers rather than separate products.',
        sf: { term: 'Schemas per role', points: ['ODS as a current-state schema', 'Marts as PRESENTATION schemas', 'Secure data sharing per mart'] },
        rs: { term: 'Schemas / databases', points: ['Current-state staging ~ ODS', 'Marts as schemas or datashares', 'Per-group access control'] },
        fb: { term: 'Lakehouse layers + workspaces', points: ['Current-state Silver ~ ODS', 'Gold stars = marts', 'Workspaces give per-team marts'] },
      },
      takeaway: 'A <b>data mart</b> is a focused, dimensional slice for one audience (keep them conformed so they don\'t silo). An <b>ODS</b> holds current, integrated, operational data for "what\'s true now" reporting, with little history. ODS = now/operations, warehouse = history/analytics, marts = fast serving.',
      docs: [
        { label: 'Fabric: Warehousing in Fabric', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing' },
      ],
    },

    /* ─────────────── Medallion meets dimensional ─────────────── */
    'fund-medallion': {
      eyebrow: '🏗️ Modeling & Design',
      title: 'Medallion meets dimensional',
      lead: 'The <strong>medallion architecture</strong> (Bronze → Silver → Gold) organizes a lakehouse by data quality. It isn\'t a rival to dimensional modeling — it\'s <em>where</em> dimensional modeling lives. This page connects the two so the whole track clicks into place.',
      sections: [
        { h: 'The three layers', p:
          '<ul>' +
          '<li><strong>Bronze (raw):</strong> source data landed as-is, append-only, with full fidelity and history. Your audit trail and reprocessing source. Minimal transformation.</li>' +
          '<li><strong>Silver (cleaned/conformed):</strong> validated, deduplicated, type-cast, integrated across sources. Often normalized or a Data-Vault-style integration core. Trustworthy but not yet BI-shaped.</li>' +
          '<li><strong>Gold (curated/serving):</strong> business-ready <strong>dimensional models</strong> — the Kimball star schemas, aggregates, and semantic models BI tools consume.</li>' +
          '</ul>' },
        { h: 'Dimensional modeling lives in Gold', p:
          '<p>Everything in this track — grain, conformed dimensions, star schemas, SCD Type 2, surrogate keys — is applied when you build the <strong>Gold</strong> layer from Silver. Bronze/Silver are about <em>getting data correct and integrated</em>; Gold is about <em>shaping it for analysis</em>. SCD history is often maintained in Silver (or the vault) and projected into Gold dimensions.</p>' },
        { h: 'Why this ordering works', p:
          '<p>Each layer has one job, so pipelines stay debuggable and reprocessable: re-run Silver from Bronze when a rule changes; rebuild Gold from Silver when the model changes — all without re-ingesting. It also reconciles Inmon and Kimball: Silver gives you Inmon-style integration, Gold gives you Kimball-style serving. One flow, both strengths.</p>' },
      ],
      diagramTitle: '🎬 From raw landings to dimensional serving',
      stage: { caption: 'Bronze (raw) → Silver (clean/integrated) → Gold (dimensional) → BI',
        groups: [
          { id: 'src', label: 'Sources', nodes: [ { id: 's1', label: 'Apps · files · CDC' } ], connectorAfter: 'land as-is' },
          { id: 'bronze', label: '🥉 Bronze — raw', sub: 'append-only, full history', nodes: [ { id: 'b', label: 'Raw tables' } ], connectorAfter: 'clean & integrate' },
          { id: 'silver', label: '🥈 Silver — cleaned', sub: 'validated, conformed, integrated', nodes: [ { id: 'sv', label: 'Integration core' } ], connectorAfter: 'shape for analysis' },
          { id: 'gold', label: '🥇 Gold — dimensional', sub: 'star schemas + SCD2', nodes: [ { id: 'g', label: 'Facts + dimensions' } ], connectorAfter: 'serve' },
          { id: 'bi', label: 'BI / ML', nodes: [ { id: 'q', label: 'Dashboards & models' } ] },
        ] },
      steps: [
        { label: 'Bronze', title: 'Land raw, keep everything', on: { spot: ['bronze'], flow: ['b'], conn: ['src'] },
          body: 'Source data lands append-only with full fidelity — the audit trail and the source you reprocess from. Minimal transformation here.',
          facts: ['Append-only, full history', 'Your reprocessing source', 'Little/no transformation'] },
        { label: 'Silver', title: 'Clean, integrate, conform', on: { spot: ['silver'], flow: ['sv'], conn: ['bronze'] },
          body: 'Validate, dedupe, type-cast, and integrate across sources — often a normalized or Data-Vault core. Trustworthy, but not yet BI-shaped.',
          facts: ['Validated & deduplicated', 'Integrated across sources', 'Inmon-style integration'] },
        { label: 'Gold', title: 'Shape it dimensionally', on: { spot: ['gold'], flow: ['g'], conn: ['silver'] },
          body: 'Build the star schemas: grain, conformed dimensions, surrogate keys, SCD Type 2. This is where the whole modeling track is applied.',
          facts: ['Kimball star schemas', 'Surrogate keys + SCD2', 'Business-ready'] },
        { label: 'Serve', title: 'BI & ML read Gold', on: { spot: ['bi'], flow: ['q'], conn: ['gold'] },
          body: 'Dashboards, semantic models, and ML read the Gold layer — fast, intuitive, and governed. One flow delivered both integration and usability.',
          facts: ['Fast, intuitive queries', 'Governed serving layer', 'Inmon + Kimball reconciled'] },
      ],
      map: {
        intro: 'Every platform implements medallion; the vocabulary and serving tech differ slightly.',
        sf: { term: 'Schema layers', points: ['RAW → INTEGRATION → PRESENTATION', 'Streams/tasks promote between layers', 'Gold stars served to BI'] },
        rs: { term: 'Staging → core → marts', points: ['Lakehouse via Spectrum or native', 'Core integration then marts', 'Gold served to QuickSight/BI'] },
        fb: { term: 'Bronze/Silver/Gold native', points: ['OneLake medallion by default', 'Gold = dimensional + semantic model', 'Direct Lake serves Power BI'] },
      },
      takeaway: 'Medallion organizes a lakehouse by quality: <b>Bronze</b> (raw), <b>Silver</b> (cleaned/integrated), <b>Gold</b> (dimensional serving). Dimensional modeling — this whole track — is applied in <b>Gold</b>. Silver gives Inmon-style integration, Gold gives Kimball-style serving: one flow, both strengths, fully reprocessable.',
      compare: 'cmp-query-lake', compareLabel: 'Querying the Lake',
      docs: [
        { label: 'Fabric: Medallion architecture', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture' },
        { label: 'Databricks: Medallion', url: 'https://www.databricks.com/glossary/medallion-architecture' },
      ],
    },

  });
})();
