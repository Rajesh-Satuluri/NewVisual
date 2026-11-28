/* content/snowflake-schema.js — the "Snowflake Schema" lesson, as DATA.
   Same shape as content/third-normal-form.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/snowflake-schema-scene.js and rendered through the shared
   course shell.

   The variation on the star: normalize a dimension into sub-dimensions so it
   branches into a chain. Saves storage and removes redundancy, but costs more
   joins — the star/snowflake tradeoff. */

export const snowflakeSchemaLesson = {
  id: 'snowflake-schema',
  title: 'Snowflake Schema',
  group: 'Dimensional Modeling',
  summary: 'A snowflake schema normalizes a star dimension into sub-dimensions, so one wide dimension branches into a chain. It removes redundancy and saves storage, at the cost of more joins and more complexity.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['dimensions', 'joins', 'redundancy', 'tables'],
  legend: [],
  goals: [
    { text: 'A star dimension is wide and repeats its hierarchy', step: 0 },
    { text: 'The repetition is redundant across many rows', step: 1 },
    { text: 'Snowflaking normalizes the hierarchy into sub-dimensions', step: 2 },
    { text: 'The dimension becomes a branching chain of joins', step: 3 },
    { text: 'The tradeoff: integrity and storage vs query simplicity', step: 4 },
    { text: 'Most Kimball practitioners keep the star', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / the star dimension
      chapter: 'setup', short: 'A wide dimension',
      title: 'The star dimension, flattened',
      body: [
        `Start from a textbook star dimension. <code>dim_product</code> flattens a whole hierarchy into one wide row: the product's <code>name</code>, its <code>category</code>, and the <code>department</code> that category belongs to. A product is in a category; a category is in a department. In the star, all three levels sit side by side in every product row.`,
        `That flatness is exactly what makes the star easy to query — "group by department" is one column, no join. But look closely at the repetition: hundreds of products share the category "Running Shoes", and every one of them re-states "Footwear" as the department. The hierarchy is <em>denormalized</em>.`,
      ],
      callout: { kind: 'insight', text: 'A star dimension stores the full hierarchy on every row. Convenient to read — but the parent levels (category, department) repeat across thousands of products.' },
      metrics: { dimensions: 1, joins: 1, redundancy: 72, tables: 1 },
      scene: { view: 'star-dim', note: 'dim_product flattens product → category → department into one wide, denormalized row.' },
    },
    { // 1 — PROBLEM / redundancy
      chapter: 'problem', short: 'Redundant levels',
      title: 'The hierarchy repeats across every row',
      body: [
        `Because the parent levels live on each product row, they are stored thousands of times over. The department name "Footwear" is physically repeated for every product under it. For a short string that is cheap; for a dimension with long descriptive attributes at the upper levels — a category description, a department manager, a region profile — the waste adds up.`,
        `There is a subtler cost too: <span class="term">integrity</span>. If "Footwear" is spelled "Footware" on even one row, your "by department" rollup silently splits into two groups. Nothing enforces that the repeated parent values agree. The star accepts this because the warehouse is rebuilt from a clean source — but it is real redundancy.`,
      ],
      callout: { kind: 'warn', text: 'Repeating a parent level on every child row wastes storage and risks disagreement — one mistyped department name quietly fractures a rollup.' },
      changes: ['~ category / department repeated per product', '! parent values can disagree across rows'],
      metrics: { dimensions: 1, joins: 1, redundancy: 84, tables: 1 },
      scene: { view: 'star-dim', note: 'department repeats on every product row — storage waste and a risk of disagreement.' },
    },
    { // 2 — TECHNIQUE / snowflake it
      chapter: 'technique', short: 'Normalize it',
      title: 'Snowflake: normalize the hierarchy out',
      body: [
        `<span class="term">Snowflaking</span> applies normalization to a dimension. Pull each level of the hierarchy into its own sub-dimension: <code>dim_product</code> keeps <code>product_key</code>, <code>name</code> and a foreign key to <code>dim_category</code>; <code>dim_category</code> keeps the category and a foreign key to <code>dim_department</code>; <code>dim_department</code> holds each department once.`,
        `Now "Footwear" is stored in exactly one place — one row in <code>dim_department</code>. Every category points to it; every product points to a category. The redundancy is gone and the hierarchy is enforced by foreign keys. The single fat dimension has become a short <b>chain</b> of normalized tables branching off the fact.`,
      ],
      callout: { kind: 'tip', text: 'Snowflaking is just 3NF applied to a dimension: split each hierarchy level into its own table, linked by foreign keys, so each parent value is stored once.' },
      changes: ['+ dim_category(category_key, department_key FK)', '+ dim_department(department_key) — one row per department'],
      metrics: { dimensions: 3, joins: 2, redundancy: 6, tables: 3 },
      scene: { view: 'snowflake', note: 'dim_product → dim_category → dim_department — the hierarchy normalized into sub-dimensions.' },
    },
    { // 3 — TECHNIQUE / the chain
      chapter: 'technique', short: 'A join chain',
      title: 'The dimension becomes a branching chain',
      body: [
        `The name is literal: normalize several dimensions and the diagram grows branches off each point of the star, like a snowflake's arms. But those branches have a cost at query time. To report revenue "by department" you can no longer touch one table — you must join <code>fact_sales → dim_product → dim_category → dim_department</code>, three hops deep.`,
        `Every extra level is another join the query planner must resolve and another table the analyst must know about. The clean one-hop property of the star is gone; the model is more faithful to the data's structure but harder to query and harder to read. You traded join simplicity for normalization.`,
      ],
      callout: { kind: 'insight', text: 'A snowflake replaces one fact-to-dimension hop with a chain of hops. Each normalized level is another join the query — and the analyst — must navigate.' },
      changes: ['~ one hop becomes fact → product → category → department', '! BI tools and analysts navigate the chain'],
      metrics: { dimensions: 3, joins: 3, redundancy: 6, tables: 3 },
      scene: { view: 'chain', note: 'A "by department" query now joins through three tables — the chain the snowflake creates.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Star vs snowflake',
      title: 'The tradeoff: storage vs simplicity',
      body: [
        `The two shapes make opposite bets on the same dimension. The <b>star</b> denormalizes it — wide, redundant, but one join hop and instantly readable. The <b>snowflake</b> normalizes it — compact, non-redundant, integrity enforced, but a chain of joins and a more complex model. Neither is "wrong"; they optimize for different things.`,
        `In practice the storage the snowflake saves is usually trivial — dimensions are tiny next to the fact table, which holds billions of rows and isn't touched either way. What you lose is query simplicity and BI-tool friendliness, which analysts feel every day. So the saving is small and the cost is constant.`,
      ],
      callout: { kind: 'tip', text: 'Snowflaking saves storage on tables that are already small, and costs join simplicity on queries you run constantly. The math rarely favors it.' },
      metrics: { dimensions: 3, joins: 3, redundancy: 6, tables: 3 },
      scene: { view: 'tradeoff', note: 'Star: wide, redundant, one hop. Snowflake: normalized, compact, many hops. Opposite bets.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Prefer the star; snowflake with care',
      body: [
        `Snowflaking normalizes a star dimension into a chain of sub-dimensions — <code>product → category → department</code> — removing the repeated parent levels at the cost of extra joins. It buys storage savings and referential integrity on the dimension, and gives up the star's defining one-hop simplicity.`,
        `Because the storage saved is negligible and the complexity added is constant, most Kimball-school practitioners <b>keep the star</b> and denormalize dimensions fully, reserving snowflaking for a genuinely large or volatile hierarchy. When in doubt, flatten: readability is the reason the warehouse exists.`,
      ],
      callout: { kind: 'insight', text: 'Snowflake = normalize a dimension into a chain. It trades simple joins for integrity and storage — a trade most star schemas decline.' },
      metrics: { dimensions: 3, joins: 3, redundancy: 6, tables: 3 },
      scene: { view: 'recap', note: 'Snowflake normalizes dimensions into chains — most practitioners prefer the flatter star.' },
    },
  ],
};
