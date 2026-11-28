/* content/keys-identifiers.js — the "Keys & Identifiers" lesson, as DATA.
   Same shape as the other Modeling Foundations lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/keys-identifiers-scene.js and
   rendered through the shared course shell on the flat schema canvas. */

export const keysIdentifiersLesson = {
  id: 'keys-identifiers',
  title: 'Keys & Identifiers',
  group: 'Modeling Foundations',
  summary: 'The family of keys — super, candidate, primary, alternate, composite and foreign — and the choice between surrogate and natural keys that decides how every row is named and linked.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['entities', 'attributes', 'constraints', 'fks'],
  legend: [],
  goals: [
    { text: 'Any uniquely-identifying column set is a super key', step: 0 },
    { text: 'The minimal super keys are the candidate keys', step: 0 },
    { text: 'One candidate becomes the primary key; the rest are alternate keys', step: 1 },
    { text: 'A composite key spans more than one column', step: 2 },
    { text: 'A foreign key references another table’s primary key', step: 3 },
    { text: 'Surrogate keys trade meaning for stability against natural keys', step: 4 },
  ],

  steps: [
    { // 0 — SUPER & CANDIDATE
      chapter: 'setup', short: 'Super & candidate',
      title: 'Super keys and candidate keys',
      body: [
        `A key is a promise of <b>uniqueness</b>. Any set of columns whose values are never repeated across rows is a <span class="term">super key</span> — it can tell every instance apart. For a <code>Customer</code>, <code>customer_id</code> is a super key, and so is <code>(customer_id, email)</code>, and so is any wider set that contains one.`,
        `Most of those super keys carry dead weight. Strip each down until removing any column would break uniqueness and you are left with the <span class="term">candidate keys</span> — the <em>minimal</em> super keys. Here both <code>customer_id</code> and <code>email</code> qualify on their own, so the table has two candidates competing to identify a row.`,
      ],
      callout: { kind: 'insight', text: 'Super key = unique column set. Candidate key = a super key with nothing to spare. Every candidate is a super key; not every super key is a candidate.' },
      metrics: { entities: 1, attributes: 5, constraints: 2, fks: 0 },
      scene: { view: 'candidate', note: 'Two candidate keys — customer_id and email — each uniquely identifies a customer.' },
    },
    { // 1 — PRIMARY & ALTERNATE
      chapter: 'technique', short: 'Primary & alternate',
      title: 'Primary and alternate keys',
      body: [
        `With more than one candidate, the modeler <b>chooses</b> one to be the <span class="term">primary key</span> — the official identifier other tables will reference and the database indexes first. Here we pick <code>customer_id</code>: short, stable and never meaningful to a human, which is exactly what a primary key should be.`,
        `The candidates you did not pick do not stop being unique. They become <span class="term">alternate keys</span>, each enforced with a <code>UNIQUE</code> constraint so the uniqueness promise still holds. <code>email</code> is now an alternate key: one address still names at most one customer, even though relationships point at <code>customer_id</code> instead.`,
      ],
      callout: { kind: 'tip', text: 'Prefer a primary key that is stable and opaque. A candidate that users might want to change — like email — is better kept as an alternate key.' },
      changes: ['+ PRIMARY KEY (customer_id)', '+ UNIQUE (email) — alternate key'],
      metrics: { entities: 1, attributes: 5, constraints: 2, fks: 0 },
      scene: { view: 'primary', note: 'customer_id is the primary key; email stays unique as an alternate key.' },
    },
    { // 2 — COMPOSITE
      chapter: 'technique', short: 'Composite',
      title: 'Composite keys',
      body: [
        `Sometimes no single column is unique, but a <em>combination</em> is. A <span class="term">composite key</span> is a key that spans more than one column. A line on an order is identified not by <code>line_no</code> alone — every order restarts at line 1 — but by the pair <code>(order_id, line_no)</code> together.`,
        `Each part of a composite key is necessary: drop <code>order_id</code> and line numbers collide across orders; drop <code>line_no</code> and an order with several lines loses uniqueness. Both columns carry the key badge, and together they form one indivisible primary key for <code>OrderLine</code>.`,
      ],
      callout: { kind: 'insight', text: 'A composite key is still one key — a single uniqueness promise made by two or more columns acting together, not two separate keys.' },
      changes: ['+ OrderLine entity', '+ PRIMARY KEY (order_id, line_no) — composite'],
      metrics: { entities: 2, attributes: 7, constraints: 3, fks: 0 },
      scene: { view: 'composite', note: 'OrderLine is identified by the composite key (order_id, line_no).' },
    },
    { // 3 — FOREIGN
      chapter: 'technique', short: 'Foreign',
      title: 'Foreign keys',
      body: [
        `A key need not identify its own row — it can point at another table’s. A <span class="term">foreign key</span> is a column that holds the primary key of a row in a second table. <code>order.customer_id</code> is a foreign key: its value is the <code>customer_id</code> of the customer who placed the order.`,
        `The foreign key is what the database uses to enforce <b>referential integrity</b> — the rule that every <code>order.customer_id</code> must match a real customer, so no order can reference one who does not exist. One customer may be referenced by many orders, giving the relationship a <b>1:N</b> cardinality drawn with a crow’s foot on the many side.`,
      ],
      callout: { kind: 'tip', text: 'A foreign key is a value that must already exist as a primary key elsewhere. Referential integrity is the database refusing to store a reference to nothing.' },
      changes: ['+ Order entity', '+ FK order.customer_id → customer.customer_id', '~ 1:N cardinality'],
      metrics: { entities: 2, attributes: 8, constraints: 3, fks: 1 },
      scene: { view: 'foreign', note: 'order.customer_id is a foreign key referencing customer.customer_id — 1:N.' },
    },
    { // 4 — SURROGATE VS NATURAL
      chapter: 'tradeoff', short: 'Surrogate vs natural',
      title: 'Surrogate vs natural keys',
      body: [
        `A <span class="term">natural key</span> is a candidate that already exists in the world and carries meaning — an <code>email</code>, an ISBN, a tax number. It needs no extra column, and a human can read it. Its weakness is that meaningful values <em>change</em>: a customer switches email and every row that referenced the old one is suddenly wrong.`,
        `A <span class="term">surrogate key</span> is an invented identifier — an auto-incrementing <code>customer_id</code> — with no meaning at all. It never changes because nothing in the business depends on its value, which makes references stable; the cost is an opaque number that tells a reader nothing. The common compromise is a surrogate primary key with the natural key kept as a <code>UNIQUE</code> alternate.`,
      ],
      callout: { kind: 'warn', text: 'Using a natural key as the primary key means every change to that real-world value cascades through every foreign key that points at it. Surrogates exist to avoid exactly that.' },
      changes: ['~ natural design: email as PK', '~ surrogate design: customer_id PK + UNIQUE(email)'],
      metrics: { entities: 2, attributes: 8, constraints: 4, fks: 1 },
      scene: { view: 'surrogate', note: 'Natural key (email as PK) versus surrogate key (customer_id PK, email UNIQUE).' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The family',
      title: 'One key family',
      body: [
        `The keys are one family nested inside each other: every <b>candidate</b> key is a minimal <b>super</b> key, one candidate is promoted to <b>primary</b> and the remainder become <b>alternate</b> keys. Any of these may be <b>composite</b>, spanning several columns, and a <b>foreign</b> key borrows a primary key to link two tables.`,
        `Choosing well — a stable, preferably surrogate primary key, natural keys preserved as alternates, foreign keys enforcing referential integrity — is what turns a loose pile of rows into an addressable, connected model. Every later lesson, from normalization to dimensional schemas, assumes these identifiers are already sound.`,
      ],
      callout: { kind: 'insight', text: 'Super ⊃ candidate ⊃ primary + alternate; composite spans columns; foreign borrows a key. Get identity right and everything you build on it stays trustworthy.' },
      metrics: { entities: 2, attributes: 8, constraints: 4, fks: 1 },
      scene: { view: 'recap', note: 'Customer 1:N Order — primary, alternate and foreign keys working together.' },
    },
  ],
};
