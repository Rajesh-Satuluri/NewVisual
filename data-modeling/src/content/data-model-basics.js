/* content/data-model-basics.js — the "Data Model Basics" lesson, as DATA.
   Same shape as the db-scale lessons: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/data-model-basics-scene.js and rendered through the shared
   course shell. This is the foundational overview exemplar for Data Modeling. */

export const dataModelBasicsLesson = {
  id: 'data-model-basics',
  title: 'Data Model Basics',
  group: 'Modeling Foundations',
  summary: 'A data model names the entities a business cares about, the attributes that describe them, and the relationships between them — the blueprint every table, document or node is built from.',
  minutes: 8,
  level: 'beginner',
  metrics: ['entities', 'attributes', 'relations', 'fks'],
  legend: [],
  goals: [
    { text: 'A data model is a map of the entities a system stores', step: 0 },
    { text: 'Entities are described by typed attributes', step: 1 },
    { text: 'A primary key uniquely identifies each instance', step: 2 },
    { text: 'Relationships link entities and are carried by foreign keys', step: 3 },
    { text: 'The same model lives at conceptual, logical and physical levels', step: 4 },
    { text: 'Entities · attributes · keys · relationships are the course’s vocabulary', step: 5 },
  ],

  steps: [
    { // 0 — WHAT A DATA MODEL IS
      chapter: 'setup', short: 'A data model',
      title: 'What a data model is',
      body: [
        `Before a single table exists, a system needs a plan for <em>what</em> it will store. A <span class="term">data model</span> is that plan: a precise description of the real-world things a business cares about and how they fit together. Everything downstream — relational tables, documents, graph nodes — is built from it.`,
        `The atoms of the model are <span class="term">entities</span>: the distinct kinds of thing worth storing. A retailer keeps data about <code>Customer</code>, <code>Order</code> and <code>Product</code>. We start with one. <code>Customer</code> is an entity; every actual customer is an <em>instance</em> of it.`,
      ],
      callout: { kind: 'insight', text: 'A data model is the blueprint, not the building. Name the entities first — the storage technology is a later decision.' },
      metrics: { entities: 1, attributes: 0, relations: 0, fks: 0 },
      scene: { view: 'entity', note: 'One entity — Customer — the first thing our system will store.' },
    },
    { // 1 — ATTRIBUTES
      chapter: 'technique', short: 'Attributes',
      title: 'Entities have attributes',
      body: [
        `An entity on its own is just a name. We describe it with <span class="term">attributes</span> — the individual facts we record about every instance. A <code>Customer</code> has a <code>customer_id</code>, a <code>name</code>, an <code>email</code> and a <code>signup_date</code>.`,
        `Each attribute draws from a <b>domain</b>, or type: <code>customer_id</code> is an integer, <code>email</code> is text, <code>signup_date</code> is a date. Fixing the type early is what lets the model reject nonsense — a date can never hold <code>"hello"</code> — long before any application code runs.`,
      ],
      callout: { kind: 'tip', text: 'An attribute is one named, typed fact about every instance of the entity. Pick the narrowest type the fact allows.' },
      changes: ['+ customer_id · name · email · signup_date', '~ each attribute gets a domain/type'],
      metrics: { entities: 1, attributes: 4, relations: 0, fks: 0 },
      scene: { view: 'attributes', note: 'Customer described by four typed attributes.' },
    },
    { // 2 — KEYS
      chapter: 'technique', short: 'Keys',
      title: 'A key identifies each instance',
      body: [
        `With many customers stored, you need a way to point at exactly one. A <span class="term">primary key</span> is the attribute (or set of attributes) whose value is <b>unique</b> and <b>never null</b> — here, <code>customer_id</code>. No two customers may share it.`,
        `The key is the instance’s identity. It is what other entities will reference, what the database indexes first, and what turns “a pile of facts” into addressable <em>records</em> you can reliably find, update and link.`,
      ],
      callout: { kind: 'insight', text: 'A primary key is a uniqueness promise: one value names one instance, for as long as that instance exists.' },
      changes: ['+ PRIMARY KEY (customer_id)', '~ unique · not null'],
      metrics: { entities: 1, attributes: 4, relations: 0, fks: 0 },
      scene: { view: 'keys', note: 'customer_id is the primary key — unique and not null for every instance.' },
    },
    { // 3 — RELATIONSHIPS
      chapter: 'technique', short: 'Relationships',
      title: 'Entities relate to each other',
      body: [
        `Real data is connected. A <code>Customer</code> places <code>Order</code>s, so our second entity <code>Order</code> must point back at the customer it belongs to. It does this with a <span class="term">foreign key</span>: a column <code>order.customer_id</code> that holds the primary key of a customer.`,
        `Every relationship has a <span class="term">cardinality</span> — how many of each side may take part. One customer places many orders, so this is a <b>1:N</b> relationship. The other shapes are <b>1:1</b> (a customer and their single loyalty card) and <b>N:M</b> (students and the courses they enrol in, which needs a join entity of its own).`,
      ],
      callout: { kind: 'tip', text: 'Foreign key: order.customer_id → customer.customer_id. A relationship is just a value pointing at a key, tagged with a cardinality.' },
      changes: ['+ Order entity', '+ FK order.customer_id → customer.customer_id', '~ 1:N cardinality'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'relationship', note: 'Customer 1:N Order — a relationship carried by a foreign key.' },
    },
    { // 4 — THREE LEVELS
      chapter: 'tradeoff', short: 'Three levels',
      title: 'Conceptual → Logical → Physical',
      body: [
        `The same model is expressed at three levels of detail, and sound modelling moves down them in order. The <span class="term">conceptual</span> model names only entities and relationships — <code>Customer</code> places <code>Order</code> — with no mention of technology; it is the picture a business stakeholder can read and sign off.`,
        `The <span class="term">logical</span> model turns that into tables, columns, and primary and foreign keys, normalized to remove redundancy — still independent of any engine. The <span class="term">physical</span> model binds it to one database: concrete column types, indexes, partitioning and storage layout, tuned for the queries that will actually run.`,
      ],
      callout: { kind: 'warn', text: 'Jumping straight to physical tables is the classic mistake. Choices made for one engine are expensive to unwind — settle the concepts first.' },
      changes: ['+ conceptual · logical · physical lenses', '~ same entities, increasing detail'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'levels', note: 'One model, three levels: conceptual → logical → physical.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The blueprint',
      title: 'Why the model comes first',
      body: [
        `Four ideas carry the whole of data modelling: <b>entities</b> (the things), <b>attributes</b> (their typed facts), <b>keys</b> (identity), and <b>relationships</b> (how things connect). Refine them through the conceptual, logical and physical levels and you have a complete model.`,
        `Get this blueprint right and the rest of the course — normalization, dimensional schemas, document and graph models — becomes a set of informed <em>choices</em> about how to shape these same four pieces. Get it wrong and every table, query and migration inherits the mistake. The model comes first because everything else is built on it.`,
      ],
      callout: { kind: 'insight', text: 'Entities · attributes · keys · relationships, refined across three levels — the vocabulary every later lesson reuses.' },
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'recap', note: 'Two linked entities — the shape every later model refines.' },
    },
  ],
};
