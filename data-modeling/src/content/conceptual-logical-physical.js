/* content/conceptual-logical-physical.js — the "Conceptual · Logical · Physical"
   lesson, as DATA. Same shape as the db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/conceptual-logical-physical-scene.js and
   rendered through the shared course shell on the flat schema canvas. */

export const conceptualLogicalPhysicalLesson = {
  id: 'conceptual-logical-physical',
  title: 'Conceptual · Logical · Physical',
  group: 'Modeling Foundations',
  summary: 'The same model expressed at three levels — a conceptual picture of entities and relationships, a logical design of tables and keys, and a physical schema bound to one engine — and why sound modelling moves down them in order.',
  minutes: 8,
  level: 'beginner',
  metrics: ['entities', 'attributes', 'relations', 'fks'],
  legend: [],
  goals: [
    { text: 'One model is expressed at three levels of detail', step: 0 },
    { text: 'The conceptual model names only entities and relationships', step: 1 },
    { text: 'The logical model adds tables, columns and keys', step: 2 },
    { text: 'The physical model binds types, indexes and storage to one engine', step: 3 },
    { text: 'Each level down adds commitment that is costly to unwind', step: 4 },
    { text: 'Settle the concepts before the storage — move down in order', step: 5 },
  ],

  steps: [
    { // 0 — THREE LEVELS
      chapter: 'setup', short: 'Three levels',
      title: 'One model, three levels',
      body: [
        `A data model does not exist at a single resolution. The <em>same</em> model — the same <code>Customer</code> who places <code>Order</code>s — is drawn three times, each at a different level of detail. The three levels are the <span class="term">conceptual</span>, the <span class="term">logical</span> and the <span class="term">physical</span>, and together they take an idea from a whiteboard sketch all the way down to bytes on a disk.`,
        `Each level answers a different question. Conceptual asks <b>what</b> things exist and how they relate; logical asks <b>how</b> they are structured as tables, columns and keys; physical asks <b>where and how fast</b> — the types, indexes and storage of one concrete engine. Sound modelling moves down them in order, so that each decision rests on a settled one above it.`,
      ],
      callout: { kind: 'insight', text: 'Three levels, one model. Each is a lens on the same entities at a different depth — not three different designs.' },
      metrics: { entities: 2, attributes: 0, relations: 1, fks: 0 },
      scene: { view: 'overview', note: 'One model at three levels: conceptual, logical, physical.' },
    },
    { // 1 — CONCEPTUAL
      chapter: 'technique', short: 'Conceptual',
      title: 'The conceptual model',
      body: [
        `The <span class="term">conceptual model</span> is the highest, most abstract view. It names only <b>entities</b> and the <b>relationships</b> between them — <code>Customer</code> <em>places</em> <code>Order</code> — and deliberately says nothing about columns, types or technology. There are no keys here yet, only the shapes of the business and the lines between them.`,
        `Because it carries no technical detail, a business stakeholder can read it and sign it off. That is its whole job: to agree on <em>what</em> the system is about before anyone argues about how to store it. Get consensus here and every later level inherits a shared, approved picture of the domain.`,
      ],
      callout: { kind: 'tip', text: 'Conceptual = entities and relationships only. If a stakeholder cannot read the diagram, it has drifted too far toward implementation.' },
      changes: ['+ Customer entity', '+ Order entity', '+ Customer places Order'],
      metrics: { entities: 2, attributes: 0, relations: 1, fks: 0 },
      scene: { view: 'conceptual', note: 'Entities and one relationship — no technology, no keys.' },
    },
    { // 2 — LOGICAL
      chapter: 'technique', short: 'Logical',
      title: 'The logical model',
      body: [
        `The <span class="term">logical model</span> turns each entity into a table of named, typed columns and pins down identity with keys. A <b>primary key</b> such as <code>customer_id</code> names one row; a <b>foreign key</b> such as <code>order.customer_id</code> carries the relationship from the conceptual level into real columns, with an explicit <b>1:N</b> cardinality.`,
        `This level is normalized to remove redundancy, yet it is still <b>engine-independent</b>: nothing here commits to PostgreSQL over MySQL, to one index over another, or to any storage layout. It is the design a team can review and reason about without yet choosing — or being trapped by — a database product.`,
      ],
      callout: { kind: 'insight', text: 'The logical model is a complete, normalized design that any relational engine could implement. Keys and cardinalities are fixed; storage is not.' },
      changes: ['+ typed columns per table', '+ PRIMARY KEY (customer_id)', '+ FK order.customer_id → customer, 1:N'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'logical', note: 'Tables, typed columns, primary and foreign keys — engine-independent.' },
    },
    { // 3 — PHYSICAL
      chapter: 'technique', short: 'Physical',
      title: 'The physical model',
      body: [
        `The <span class="term">physical model</span> binds the design to one engine. Abstract types become concrete ones — <code>customer_id</code> is a <code>bigint</code>, <code>email</code> is a <code>varchar(160)</code> — and the schema grows the things that make queries fast: an <b>index</b> on <code>order.customer_id</code>, perhaps partitioning by date and a chosen storage layout.`,
        `These are the decisions tuned for the queries that will actually run, and they are specific to the product you picked. The physical model is where the logical design meets the realities of a particular database's optimizer, page layout and operational limits.`,
      ],
      callout: { kind: 'tip', text: 'Physical = concrete types, indexes, partitioning for one engine. An index on the foreign key is usually the first physical decision a relationship earns.' },
      changes: ['~ types → bigint · varchar · numeric', '+ idx on order.customer_id', '~ storage layout for one engine'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'physical', note: 'Concrete column types and an index — tuned for one engine.' },
    },
    { // 4 — MAPPING DOWN
      chapter: 'tradeoff', short: 'Mapping down',
      title: 'Mapping down the levels',
      body: [
        `Moving from one level to the next is a <b>refinement</b>: conceptual refines into logical, logical refines into physical, and at each step you add detail you did not have before. Nothing is thrown away — the entities and relationships agreed up top survive all the way down — but a great deal is <em>committed</em>.`,
        `And commitment is asymmetric. Renaming an entity at the conceptual level is a whiteboard edit; changing a column type or dropping an index at the physical level can mean a migration, a rebuild and a window of downtime. The further down you go, the more expensive it is to unwind a choice — which is exactly why the order matters.`,
      ],
      callout: { kind: 'warn', text: 'Each level down adds commitment. A conceptual change is cheap; a physical change is a migration. Decide top-down so the costly choices rest on settled cheap ones.' },
      changes: ['~ conceptual → logical → physical', '~ detail increases, cost to change increases'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'mapping', note: 'Each level down refines the model and raises the cost of change.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'In order',
      title: 'Settle the concepts first',
      body: [
        `The three levels are a discipline, not just a taxonomy. Agree the <b>conceptual</b> model with the business, refine it into a normalized <b>logical</b> design, and only then bind it to a <b>physical</b> schema for one engine. Each step rests on the one above, so each can change for its own reasons without rewriting the others from scratch.`,
        `Jumping straight to physical tables is the classic mistake. Choices made to please one engine quietly become the model, and when the requirements shift — or the engine does — there is no clean design underneath to fall back on. Move down the levels in order and the hardest decisions are always the last, cheapest-to-defer ones you make.`,
      ],
      callout: { kind: 'insight', text: 'Conceptual, then logical, then physical — in order. The level you settle first is the one you can least afford to get wrong.' },
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'recap', note: 'Three levels, settled in order — the foundation every later lesson builds on.' },
    },
  ],
};
