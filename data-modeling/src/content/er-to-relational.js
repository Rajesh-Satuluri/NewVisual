/* content/er-to-relational.js — the "ER → Relational Mapping" lesson, as DATA.
   Same shape as every db-scale lesson: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/er-to-relational-scene.js and rendered through the shared
   course shell. This lesson teaches the mechanical rules that turn an ER
   diagram into relational tables. */

export const erToRelationalLesson = {
  id: 'er-to-relational',
  title: 'ER → Relational Mapping',
  group: 'ER & Relational Design',
  summary: 'The mechanical rules for turning an ER model into relational tables — entities become tables, attributes become columns, and relationships become foreign keys or join tables.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['entities', 'relations', 'tables', 'fks'],
  legend: [],
  goals: [
    { text: 'An ER diagram maps to relational tables by fixed rules', step: 0 },
    { text: 'Every entity becomes a table with its attributes as columns', step: 1 },
    { text: 'A 1:N relationship becomes a foreign key on the many side', step: 2 },
    { text: 'An N:M relationship becomes a join table of two foreign keys', step: 3 },
    { text: 'A 1:1 relationship merges or becomes a unique foreign key', step: 4 },
    { text: 'The rules compose into a complete, repeatable mapping', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Diagram to tables',
      title: 'From ER to tables',
      body: [
        `An <span class="term">ER model</span> is a drawing: boxes for entities, lines for relationships, cardinality marks for how many of each side take part. A relational database has none of those things — only <b>tables</b>, <b>columns</b> and <b>foreign keys</b>. Something has to translate the first into the second.`,
        `That translation is <em>mechanical</em>. A <code>Customer</code> entity that <code>places</code> many <code>Order</code>s is not a judgement call to map — a short set of rules decides exactly which tables appear and where each key lives. Learn the rules once and any diagram becomes a schema the same way every time.`,
      ],
      callout: { kind: 'insight', text: 'ER → relational mapping is a recipe, not an art. The same diagram always produces the same tables.' },
      metrics: { entities: 2, relations: 1, tables: 0, fks: 0 },
      scene: { view: 'overview', note: 'An ER pair — Customer places Order — waiting to be mapped to tables.' },
    },
    { // 1 — ENTITY → TABLE
      chapter: 'technique', short: 'Entities → tables',
      title: 'Each entity becomes a table',
      body: [
        `The first rule is the simplest. Every <span class="term">entity</span> in the diagram becomes one <b>table</b>. Its attributes become the table's <b>columns</b>, each keeping the type it was given, and its identifying attribute becomes the <span class="term">primary key</span>.`,
        `The <code>Customer</code> box with <code>customer_id</code>, <code>name</code> and <code>email</code> becomes a <code>customers</code> table with exactly those three columns and <code>customer_id</code> as its primary key. No relationships are involved yet — this rule runs once per entity, in isolation.`,
      ],
      callout: { kind: 'tip', text: 'One entity → one table. Attributes → columns, identifier → primary key. Do every entity first, then wire the relationships.' },
      changes: ['+ customers table', '~ attributes become typed columns', '~ customer_id becomes PRIMARY KEY'],
      metrics: { entities: 2, relations: 1, tables: 1, fks: 0 },
      scene: { view: 'entity-table', note: 'The Customer entity becomes the customers table, attributes and all.' },
    },
    { // 2 — 1:N → FK
      chapter: 'technique', short: '1:N → FK',
      title: 'One-to-many becomes a foreign key',
      body: [
        `A <span class="term">one-to-many</span> relationship needs no table of its own. The rule: put a <span class="term">foreign key</span> on the table of the <b>many</b> side, pointing at the primary key of the <b>one</b> side.`,
        `One customer places many orders, so <code>orders</code> gains a <code>customer_id</code> column that holds the owning customer's key. The crow's-foot sits on <code>orders</code> and the single bar on <code>customers</code> — the foreign key always lives where the crow's-foot is. The relationship is now a value pointing at a key.`,
      ],
      callout: { kind: 'tip', text: 'The foreign key goes on the many side. orders.customer_id → customers.customer_id carries the whole 1:N.' },
      changes: ['+ orders table', '+ FK orders.customer_id → customers.customer_id', '~ crow\'s-foot marks the many side'],
      metrics: { entities: 2, relations: 1, tables: 2, fks: 1 },
      scene: { view: 'one-to-many', note: 'customers 1:N orders — the FK lives on orders, the many side.' },
    },
    { // 3 — N:M → JOIN TABLE
      chapter: 'technique', short: 'N:M → join table',
      title: 'Many-to-many becomes a join table',
      body: [
        `No single foreign key can carry a <span class="term">many-to-many</span> relationship — a student takes many courses and a course has many students, so neither side has room for the other. The rule introduces a third table: a <span class="term">join table</span> (also called an associative or junction table).`,
        `The <code>enrollments</code> table holds two foreign keys, <code>student_id</code> and <code>course_id</code>, one pointing at each original table. Together they form its <b>composite primary key</b>, so each (student, course) pair appears at most once. The one N:M line becomes two 1:N relationships into the table in the middle.`,
      ],
      callout: { kind: 'insight', text: 'N:M → a join table of two foreign keys. Their pair is the composite primary key, and the N:M splits into two 1:N edges.' },
      changes: ['+ enrollments join table', '+ FK student_id → students, FK course_id → courses', '~ composite PK (student_id, course_id)'],
      metrics: { entities: 2, relations: 2, tables: 3, fks: 2 },
      scene: { view: 'many-to-many', note: 'students N:M courses resolves into the enrollments join table.' },
    },
    { // 4 — 1:1 → MERGE OR UNIQUE FK
      chapter: 'technique', short: '1:1 → merge or FK',
      title: 'One-to-one: merge or a unique FK',
      body: [
        `A <span class="term">one-to-one</span> relationship has two valid mappings. The first is to <b>merge</b> both entities into a single table, since every row of one matches exactly one row of the other — a user and their profile can simply share a table.`,
        `The second keeps them apart and adds a foreign key on either side, marked <code>UNIQUE</code> so the "many" can never exceed one. Choose merge when the two are always queried together and rarely optional; choose the unique foreign key when one side is optional, written separately, or you want to keep a wide, rarely-read block of columns in its own table.`,
      ],
      callout: { kind: 'tip', text: '1:1 → merge into one table, or a UNIQUE foreign key on one side. The UNIQUE is what stops it drifting into a 1:N.' },
      changes: ['~ option A: merge into one table', '~ option B: UNIQUE FK on one side', '~ UNIQUE enforces the 1:1'],
      metrics: { entities: 2, relations: 1, tables: 2, fks: 1 },
      scene: { view: 'one-to-one', note: 'A 1:1 pair — merge the tables, or link them with a UNIQUE foreign key.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The rules',
      title: 'The mapping rules in one place',
      body: [
        `Four rules convert any ER diagram to tables. <b>Entity → table</b> (attributes become columns). <b>1:N → foreign key</b> on the many side. <b>N:M → join table</b> of two foreign keys with a composite key. <b>1:1 → merge</b> or a unique foreign key. Apply the entity rule to every box, then the relationship rules to every line.`,
        `Because the rules are mechanical, the mapping is repeatable and reviewable: given the diagram, anyone derives the same schema, and a schema can be read back as the diagram it came from. This is the bridge from a model a stakeholder signs off to a database an engine runs.`,
      ],
      callout: { kind: 'insight', text: 'Entity→table · 1:N→FK · N:M→join · 1:1→merge/unique FK. Four rules, applied in order, map any diagram.' },
      metrics: { entities: 2, relations: 1, tables: 2, fks: 1 },
      scene: { view: 'recap', note: 'The mapping rules, checked off against a worked example.' },
    },
  ],
};
