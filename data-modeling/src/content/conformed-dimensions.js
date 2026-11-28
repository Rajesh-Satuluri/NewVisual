/* content/conformed-dimensions.js — the "Conformed Dimensions" lesson, as DATA.
   Same shape as content/third-normal-form.js. A conformed dimension is one
   dimension — same keys, same attributes, same meaning — shared across many
   fact tables, and it is what makes drill-across (comparing processes) possible.
   Rendered by db/conformed-dimensions-scene.js. */

export const conformedDimensionsLesson = {
  id: 'conformed-dimensions',
  title: 'Conformed Dimensions',
  group: 'Dimensional Modeling',
  summary: 'A conformed dimension is one dimension — same keys, attributes and meaning — shared across many fact tables. It is the backbone of an integrated warehouse and what lets you drill across to compare one process with another.',
  minutes: 8,
  level: 'advanced',
  metrics: ['dimensions', 'facts', 'tables', 'integrity'],
  legend: [],
  goals: [
    { text: 'Two data marts each measure a different process', step: 0 },
    { text: 'Private per-mart dimensions turn marts into silos', step: 1 },
    { text: 'Conforming means one shared dimension, identical everywhere', step: 2 },
    { text: 'Both fact tables point at the same central dimension', step: 3 },
    { text: 'Drill-across compares processes through the shared keys', step: 4 },
    { text: 'Conformed dimensions are the warehouse bus', step: 5 },
  ],

  steps: [
    { // 0 — SETUP · two marts
      chapter: 'setup', short: 'Two marts',
      title: 'Two processes, two fact tables',
      body: [
        `A real warehouse measures many business processes, each with its own fact table — often built by different teams at different times. Here are two: a <b>Sales</b> mart with <code>fact_sales</code>, and an <b>Inventory</b> mart with <code>fact_inventory</code>. One measures units sold; the other measures units on hand.`,
        `The obvious business question spans both: “for each product, on each day, how do sales compare to what we had in stock?” To answer it you must line up the two facts <b>by the same product and the same day</b>. Whether you <em>can</em> depends entirely on how their dimensions were built.`,
      ],
      callout: { kind: 'insight', text: 'The interesting questions live between fact tables, not inside one. Comparing sales to inventory means joining two processes on what they share.' },
      metrics: { dimensions: 2, facts: 2, tables: 4, integrity: 'low' },
      scene: { view: 'two-marts', note: 'A Sales mart and an Inventory mart — two fact tables measuring two processes that the business wants to compare.' },
    },
    { // 1 — PROBLEM · silos
      chapter: 'problem', short: 'Silos',
      title: 'Private dimensions make silos',
      body: [
        `Suppose each team built its own date dimension. Sales has <code>dim_date_sales</code> keyed <code>1…N</code> from its first sale; Inventory has <code>dim_date_inv</code> keyed independently. The keys do not match, the attributes may be spelled differently (“Q1” vs “Quarter 1”), and the same calendar day has two different surrogate keys.`,
        `Now the cross-process question is <b>unanswerable</b>. You cannot join <code>fact_sales</code> to <code>fact_inventory</code> on date, because <code>date_key = 42</code> means one day in one mart and a different day in the other. Each mart is a <span class="term">silo</span> — internally consistent, mutually incomparable. The warehouse has data but no integration.`,
      ],
      callout: { kind: 'warn', text: 'Two private copies of “the same” dimension cannot be joined. Divergent keys and attributes quietly turn independent marts into islands.' },
      changes: ['! dim_date_sales and dim_date_inv keyed independently', '! fact_sales ⋈ fact_inventory on date is impossible'],
      metrics: { dimensions: 2, facts: 2, tables: 4, integrity: 'broken' },
      scene: { view: 'silo', note: 'Each mart owns a private date dimension with its own keys — the two fact tables cannot be joined on day.' },
    },
    { // 2 — TECHNIQUE · conform
      chapter: 'technique', short: 'Conform',
      title: 'Conform: one dimension, everywhere',
      body: [
        `The fix is to <b>conform</b> the dimension: build <code>dim_date</code> <em>once</em>, with one set of surrogate keys and one set of attribute definitions, and have <b>both</b> fact tables reference it. A <span class="term">conformed dimension</span> means the same keys, the same columns, and the same meaning in every mart that uses it.`,
        `Conforming does not require two dimensions to be identical in every column — the strict form is that one is a <b>subset</b> of the other and they <b>agree on every shared key and attribute</b>. A monthly-grain mart may use a conformed <code>dim_month</code> that rolls up the daily <code>dim_date</code>; as long as the overlapping values match exactly, they conform.`,
      ],
      callout: { kind: 'tip', text: 'Conforming is a contract: one authoritative dimension, defined once, that every fact table agrees to speak. Build it before the marts, not after.' },
      changes: ['+ dim_date defined once — single keys & attributes', '~ both facts repointed at the shared dim_date'],
      metrics: { dimensions: 1, facts: 2, tables: 3, integrity: 'high' },
      scene: { view: 'conform', note: 'Two private date dimensions collapsed into one authoritative dim_date — same keys, same attributes, one definition.' },
    },
    { // 3 — SOLUTION · shared
      chapter: 'solution', short: 'Shared center',
      title: 'Both facts point at the same dimension',
      body: [
        `With the dimension conformed, the picture simplifies dramatically: <code>dim_date</code> and <code>dim_product</code> sit at the <b>center</b>, and both <code>fact_sales</code> and <code>fact_inventory</code> point at the <em>same</em> rows. A single <code>date_key</code> now means the same calendar day to both facts; a single <code>product_key</code> means the same item.`,
        `This shared center is what turns a pile of marts into an <b>integrated warehouse</b>. The dimensions are the shared reference data — the common language — and each fact table is a different sentence spoken in it. Add a <code>fact_returns</code> tomorrow and, if it conforms to the same dimensions, it joins the family for free.`,
      ],
      callout: { kind: 'insight', text: 'Conformed dimensions are the shared spine. Facts come and go around them, but the dimensions are the stable, common vocabulary that ties everything together.' },
      metrics: { dimensions: 2, facts: 2, tables: 4, integrity: 'high' },
      scene: { view: 'shared', note: 'dim_date and dim_product shared at the center — fact_sales and fact_inventory both reference the same dimension rows.' },
    },
    { // 4 — TECHNIQUE · drill-across
      chapter: 'technique', short: 'Drill across',
      title: 'Drill across: compare through shared keys',
      body: [
        `The payoff is <span class="term">drill-across</span>: comparing measures from <em>different</em> fact tables, aligned on their conformed dimensions. You do <b>not</b> join two billion-row fact tables directly. Instead you aggregate each one separately to the common grain — units sold by product by day, units on hand by product by day — then line the two result sets up on <code>product_key</code> and <code>date_key</code>.`,
        `Because both aggregates are grouped by the <em>same</em> conformed keys, the alignment is exact and cheap. Now “sell-through rate = sales ÷ on-hand, per product per day” is a trivial final join of two small, pre-grouped results. Every cross-process KPI in the business — sales vs. returns, plan vs. actual, forecast vs. shipped — is a drill-across over conformed dimensions.`,
      ],
      callout: { kind: 'tip', text: 'Drill-across = aggregate each fact to the shared grain, then join the small results on the conformed keys. Never join raw fact to raw fact.' },
      changes: ['+ each fact aggregated to product · day', '~ results joined on the conformed keys'],
      metrics: { dimensions: 2, facts: 2, tables: 4, integrity: 'high' },
      scene: { view: 'drill-across', note: 'Aggregate each fact to product·day on the shared keys, then join the small results — sell-through across two processes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Conformed dimensions are the bus',
      body: [
        `A conformed dimension is <b>one</b> dimension — identical keys, attributes and meaning — <b>shared across fact tables and marts</b>. It is what makes a warehouse integrated rather than a drawer of incompatible marts, and it is the precondition for <b>drill-across</b>: comparing any process to any other through the keys they hold in common.`,
        `Kimball calls the catalog of these shared dimensions the <span class="term">bus matrix</span> — the enterprise’s agreed, reusable dimensions laid against its business processes. Conform the dimensions first and every new fact table plugs straight into the bus; skip it, and you are left with silos that can never be compared.`,
      ],
      callout: { kind: 'insight', text: 'Build the dimensions once, share them everywhere. Conformed dimensions are the common spine that lets separate marts answer one question together.' },
      metrics: { dimensions: 2, facts: 2, tables: 4, integrity: 'high' },
      scene: { view: 'recap', note: 'Shared dim_date and dim_product — the bus that lets fact_sales and fact_inventory be compared by day and product.' },
    },
  ],
};
