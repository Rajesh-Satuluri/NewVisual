/* content/entities-attributes.js — the "Entities & Attributes" lesson, as DATA.
   Same shape as every Modeling Foundations lesson: each step is { chapter,
   short, title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/entities-attributes-scene.js and rendered on the
   flat schema canvas (engine/schema2d.js). This lesson walks the kinds of
   attribute — simple, composite, derived, multivalued and key — that describe an
   entity, and the type/instance distinction underneath all of them. */

export const entitiesAttributesLesson = {
  id: 'entities-attributes',
  title: 'Entities & Attributes',
  group: 'Modeling Foundations',
  summary: 'Entity types versus instances, and the kinds of attribute — simple, composite, derived, multivalued and key — that describe them.',
  minutes: 8,
  level: 'beginner',
  metrics: ['entities', 'attributes', 'columns', 'constraints'],
  legend: [],
  goals: [
    { text: 'An entity type is a template; each stored row is an instance', step: 0 },
    { text: 'Simple attributes are atomic, single-valued, typed facts', step: 1 },
    { text: 'A composite attribute has named sub-parts', step: 2 },
    { text: 'A derived attribute is computed from other attributes', step: 3 },
    { text: 'A multivalued attribute signals a future separate table', step: 4 },
    { text: 'Every entity is one type plus a set of typed attributes', step: 5 },
  ],

  steps: [
    { // 0 — TYPE vs INSTANCE
      chapter: 'setup', short: 'Type vs instance',
      title: 'Entities: type vs instance',
      body: [
        `The first thing a model names is an <span class="term">entity type</span>: a kind of thing worth storing. <code>Customer</code> is an entity type — a template that says every customer will be described the same way. You design the type <em>once</em>.`,
        `Each real customer is an <span class="term">instance</span> of that type: one concrete row, with its own values. The type is the shape; an instance is a filling of that shape. Confusing the two — modelling <code>Ada</code> instead of <code>Customer</code> — is the most common beginner's slip, because it bakes one row into the schema itself.`,
      ],
      callout: { kind: 'insight', text: 'Model the type, not the instance. "Customer" belongs in the schema; "Ada Lovelace, #1024" is a row that fills it.' },
      metrics: { entities: 1, attributes: 0, columns: 0, constraints: 0 },
      scene: { view: 'entity', note: 'Customer is an entity type; each real customer is an instance of it.' },
    },
    { // 1 — SIMPLE ATTRIBUTES
      chapter: 'technique', short: 'Simple',
      title: 'Simple attributes',
      body: [
        `We describe the type with <span class="term">attributes</span>. The plainest kind is a <b>simple</b> attribute: <em>atomic</em> (it cannot be broken into meaningful parts), <em>single-valued</em> (exactly one value per instance) and drawn from a <b>domain</b>, or type. <code>customer_id</code> is an integer, <code>email</code> is text, <code>signup_date</code> is a date.`,
        `Atomic is the key word. <code>email</code> holds one address, not a list; <code>signup_date</code> holds one date, not a range. Fixing the domain early is what lets the model reject nonsense — a date column can never hold <code>"hello"</code> — long before any application code runs. Each simple attribute becomes exactly one <span class="term">column</span>.`,
      ],
      callout: { kind: 'tip', text: 'A simple attribute is one atomic, single-valued, typed fact. One attribute, one column — pick the narrowest domain the fact allows.' },
      changes: ['+ customer_id · name · email · signup_date', '~ each attribute gets a domain/type'],
      metrics: { entities: 1, attributes: 4, columns: 4, constraints: 1 },
      scene: { view: 'simple', note: 'Four simple, typed attributes — each atomic and single-valued.' },
    },
    { // 2 — COMPOSITE ATTRIBUTES
      chapter: 'technique', short: 'Composite',
      title: 'Composite attributes',
      body: [
        `Some attributes are not atomic — they have named sub-parts. A <span class="term">composite</span> attribute like <code>name</code> decomposes into <code>first_name</code> and <code>last_name</code>; <code>address</code> decomposes into <code>street</code>, <code>city</code> and <code>zip</code>. The whole has meaning, but so does each part.`,
        `This is where attributes and columns part ways. <code>name</code> is one <em>attribute</em> conceptually, but it lands as two <em>columns</em> once you store the parts separately. Splitting it is usually worth it: you can sort by <code>last_name</code> or search by <code>city</code> only if those parts are columns of their own, not buried inside one text blob.`,
      ],
      callout: { kind: 'insight', text: 'A composite attribute is one fact made of named parts. Store the parts as columns when you will filter, sort or join on them.' },
      changes: ['~ name → (first_name, last_name)', '+ one attribute becomes two columns'],
      metrics: { entities: 1, attributes: 4, columns: 5, constraints: 1 },
      scene: { view: 'composite', note: 'The composite attribute name expands into first_name and last_name.' },
    },
    { // 3 — DERIVED ATTRIBUTES
      chapter: 'technique', short: 'Derived',
      title: 'Derived attributes',
      body: [
        `A <span class="term">derived</span> attribute is one whose value is computed from others rather than supplied on its own. <code>age</code> is derived from <code>birth_date</code> and today's date; an order's <code>total</code> is derived from its line items. The fact is real, but it carries no independent information.`,
        `So you face a choice: <b>compute</b> it on every read (always correct, never stale, but costs work each query) or <b>store</b> it as a materialized column (fast to read, but must be recomputed whenever its inputs change). Marking an attribute as derived in the model is a reminder that its value has a <em>formula</em>, and that storing it is an optimization with an upkeep cost — not a free fact.`,
      ],
      callout: { kind: 'tip', text: 'Derived = f(other attributes). Compute it live for correctness, or store it for speed — but then own the job of keeping it in sync.' },
      changes: ['+ birth_date (stored)', '~ age = f(birth_date) — derived, not stored'],
      metrics: { entities: 1, attributes: 6, columns: 6, constraints: 1 },
      scene: { view: 'derived', note: 'age is derived from birth_date — computed, not an independent fact.' },
    },
    { // 4 — MULTIVALUED ATTRIBUTES
      chapter: 'tradeoff', short: 'Multivalued',
      title: 'Multivalued attributes',
      body: [
        `A <span class="term">multivalued</span> attribute can hold more than one value for a single instance: a customer may have several <code>phones</code> or <code>emails</code>. It breaks the single-valued rule, and cramming the values into one column — <code>"555-1000, 555-2000"</code> — makes them impossible to query, constrain or count reliably.`,
        `The fix is almost always the same: split the multivalued attribute into its <b>own entity</b>. <code>Phone</code> becomes a separate table, each phone its own row, linked back to the customer by a foreign key in a <b>1:N</b> relationship. A repeating attribute is really a hidden entity asking to be born — seeing one early saves a painful migration later.`,
      ],
      callout: { kind: 'warn', text: 'A multivalued attribute is a future table in disguise. Do not pack many values into one column — give them rows of their own.' },
      changes: ['~ phones is multivalued — one-to-many', '+ split into a Phone entity (phone_id, customer_id, number)'],
      metrics: { entities: 2, attributes: 7, columns: 9, constraints: 2 },
      scene: { view: 'multivalued', note: 'phones is multivalued — split it into a Phone entity joined 1:N.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The kinds',
      title: 'Entities and their attributes',
      body: [
        `An entity is one <b>type</b> plus a set of attributes, and the attributes come in distinct flavours: <b>simple</b> (atomic, single-valued), <b>composite</b> (named sub-parts), <b>derived</b> (computed from others), <b>multivalued</b> (many values — a hidden entity), and the <b>key</b> that identifies each instance. Naming the flavour tells you how to store it.`,
        `This vocabulary is the raw material for everything that follows. Keys drive relationships; composite and multivalued attributes drive normalization; derived attributes drive the store-versus-compute tradeoffs of dimensional and physical design. Get the attributes right on each entity and the rest of the course becomes informed choices about how to shape them.`,
      ],
      callout: { kind: 'insight', text: 'Type and instance; simple, composite, derived, multivalued, key — the five shapes an attribute can take, and the hooks every later lesson pulls on.' },
      metrics: { entities: 1, attributes: 6, columns: 6, constraints: 1 },
      scene: { view: 'recap', note: 'One entity type, described by attributes of every kind.' },
    },
  ],
};
