/* content/relationships-cardinality.js — the "Relationships & Cardinality"
   lesson, as DATA. Same shape as every Modeling Foundations lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/relationships-cardinality-scene.js on the
   flat schema canvas (engine/schema2d.js). The lesson covers the shapes a
   relationship can take — 1:1, 1:N and N:M — plus participation (total/partial)
   and degree (unary/binary/ternary). */

export const relationshipsCardinalityLesson = {
  id: 'relationships-cardinality',
  title: 'Relationships & Cardinality',
  group: 'Modeling Foundations',
  summary: 'The shapes a relationship can take — one-to-one, one-to-many and many-to-many — plus participation (total/partial) and degree.',
  minutes: 9,
  level: 'beginner',
  metrics: ['entities', 'relations', 'fks', 'cardinality'],
  legend: [],
  goals: [
    { text: 'A relationship’s cardinality counts how many of each side take part', step: 0 },
    { text: 'One-to-one links single instances, carried by a unique FK', step: 1 },
    { text: 'One-to-many puts the foreign key on the many side', step: 2 },
    { text: 'Many-to-many resolves into a join entity', step: 3 },
    { text: 'Participation is total or partial; degree counts the entities', step: 4 },
    { text: 'Every relationship is counted on both sides', step: 5 },
  ],

  steps: [
    { // 0 — A RELATIONSHIP HAS A SHAPE
      chapter: 'setup', short: 'A relationship',
      title: 'Relationships have a shape',
      body: [
        `Entities rarely stand alone — they connect. A <code>Customer</code> <em>places</em> an <code>Order</code>; a relationship is that named association between two entity types. But connection alone is not enough to design with; you also need to know its <em>shape</em>.`,
        `That shape is its <span class="term">cardinality</span>: how many instances of each side may take part. One customer, how many orders? One order, how many customers? Answering those two counting questions fixes the relationship as one of three shapes — <b>1:1</b>, <b>1:N</b> or <b>N:M</b> — and that choice decides where the foreign key goes and whether a new table is needed.`,
      ],
      callout: { kind: 'insight', text: 'Cardinality is just counting both ends. "How many of A per B, and how many of B per A?" — the answers pick the shape.' },
      metrics: { entities: 2, relations: 1, fks: 1, cardinality: '?' },
      scene: { view: 'setup', note: 'Customer places Order — a relationship whose shape we have yet to count.' },
    },
    { // 1 — ONE-TO-ONE
      chapter: 'technique', short: '1:1',
      title: 'One-to-one',
      body: [
        `In a <span class="term">one-to-one</span> relationship, each instance on one side pairs with at most one on the other. A <code>Customer</code> holds exactly one <code>LoyaltyCard</code>, and each card belongs to exactly one customer. Both ends are "one".`,
        `Physically, a 1:1 is a foreign key with a <code>UNIQUE</code> constraint: put <code>customer_id</code> on <code>LoyaltyCard</code> and mark it unique, so no two cards can share a customer. Because 1:1 data could often live in a single table, the split is a deliberate choice — to isolate optional columns, separate sensitive data, or keep a rarely-read block out of the main row.`,
      ],
      callout: { kind: 'tip', text: '1:1 = a foreign key plus a UNIQUE constraint. If the two always coexist, ask whether they want to be one table at all.' },
      changes: ['+ Customer 1:1 LoyaltyCard', '+ FK loyaltycard.customer_id UNIQUE'],
      metrics: { entities: 2, relations: 1, fks: 1, cardinality: '1:1' },
      scene: { view: 'one-to-one', note: 'Customer 1:1 LoyaltyCard — a single bar at each end, a unique FK.' },
    },
    { // 2 — ONE-TO-MANY
      chapter: 'technique', short: '1:N',
      title: 'One-to-many',
      body: [
        `The most common shape is <span class="term">one-to-many</span>: one instance on the "one" side relates to many on the "many" side. One <code>Customer</code> places many <code>Order</code>s, but each order belongs to exactly one customer. The crow's-foot marks the many end.`,
        `The rule for placing the foreign key is simple and fixed: <b>the FK lives on the many side</b>. <code>order.customer_id</code> holds the id of the one customer that order belongs to. It cannot go the other way — a single <code>customer</code> row has no room for a list of order ids. This is why multivalued facts always push the key downhill onto the many side.`,
      ],
      callout: { kind: 'insight', text: 'In 1:N the foreign key always sits on the many side. One parent row, many children, each child pointing back to its one parent.' },
      changes: ['+ Customer 1:N Order', '+ FK order.customer_id → customer.customer_id'],
      metrics: { entities: 2, relations: 1, fks: 1, cardinality: '1:N' },
      scene: { view: 'one-to-many', note: 'Customer 1:N Order — crow’s-foot on the many side, FK on Order.' },
    },
    { // 3 — MANY-TO-MANY
      chapter: 'technique', short: 'N:M',
      title: 'Many-to-many needs a join entity',
      body: [
        `A <span class="term">many-to-many</span> relationship has many on both sides: a <code>Student</code> enrols in many <code>Course</code>s, and each course has many students. There is nowhere to put a foreign key — neither row can hold a list — so a raw N:M cannot be stored directly in relational tables.`,
        `The resolution is a <b>join entity</b>: a new table in the middle, <code>Enrollment</code>, holding one foreign key to each side. The single N:M becomes <em>two</em> 1:N relationships — <code>Student</code> 1:N <code>Enrollment</code> and <code>Course</code> 1:N <code>Enrollment</code>. Each enrollment row is one student in one course, and it is the natural home for relationship attributes like <code>grade</code> or <code>enrolled_at</code>.`,
      ],
      callout: { kind: 'tip', text: 'Every N:M resolves into a join entity with two foreign keys. The middle table is also where relationship attributes finally have a place to live.' },
      changes: ['+ Enrollment join entity', '+ FK student_id, FK course_id', '~ N:M → two 1:N relationships'],
      metrics: { entities: 3, relations: 2, fks: 2, cardinality: 'N:M' },
      scene: { view: 'many-to-many', note: 'Student ↔ Course resolves into an Enrollment join entity — two 1:N links.' },
    },
    { // 4 — PARTICIPATION & DEGREE
      chapter: 'tradeoff', short: 'Participation',
      title: 'Participation and degree',
      body: [
        `Cardinality counts the maximum; <span class="term">participation</span> sets the minimum. It is <b>total</b> (mandatory) when every instance must take part — an order <em>must</em> have a customer — and <b>partial</b> (optional) when it need not — a customer may have placed no orders yet. Total participation becomes a <code>NOT NULL</code> foreign key; partial allows it to be null.`,
        `A relationship also has a <span class="term">degree</span>: how many entity types it connects. Most are <b>binary</b> (two entities), but some are <b>unary</b> — a self-relationship where one entity relates to itself. <code>Employee</code> <em>manages</em> <code>Employee</code>: <code>manager_id</code> is a foreign key back into the same table. Three-way links are <b>ternary</b>, and usually resolve into a join entity too.`,
      ],
      callout: { kind: 'warn', text: 'Cardinality is the max, participation the min. Forgetting participation is how optional relationships end up wrongly mandatory — or vice versa.' },
      changes: ['~ total vs partial participation', '+ unary self-relationship Employee.manager_id'],
      metrics: { entities: 2, relations: 2, fks: 2, cardinality: 'total/partial' },
      scene: { view: 'participation', note: 'Participation (total vs partial) and degree — a unary self-relationship.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Count both sides',
      body: [
        `Every relationship is pinned down by counting. Its <b>cardinality</b> is one of three shapes — <b>1:1</b> (FK + unique), <b>1:N</b> (FK on the many side), <b>N:M</b> (a join entity) — and that shape decides where keys go and whether a new table appears. Its <b>participation</b> adds the minimum: total or partial. Its <b>degree</b> counts the entities: unary, binary or ternary.`,
        `Together these answer the only questions a relationship really poses: how many on each side, must they take part, and how many entities are involved. Get the counting right and the foreign keys, constraints and join tables follow almost mechanically — which is why cardinality is the first thing to settle about any link.`,
      ],
      callout: { kind: 'insight', text: '1:1 · 1:N · N:M, total or partial, unary to ternary — count both sides and the keys, constraints and join tables fall out on their own.' },
      metrics: { entities: 2, relations: 1, fks: 1, cardinality: '1:N' },
      scene: { view: 'recap', note: 'Customer 1:N Order — the three shapes, participation and degree in one glance.' },
    },
  ],
};
