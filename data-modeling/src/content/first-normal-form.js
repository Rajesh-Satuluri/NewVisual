/* content/first-normal-form.js — "First Normal Form (1NF)", as DATA.
   Each step is { chapter, short, title, body[], callout, changes?, metrics,
   scene }. `scene` is a view-snapshot consumed by db/first-normal-form-scene.js.

   The first rung of the normalization ladder: atomic values (one value per cell)
   and no repeating groups, with a key on every row. The hero move is the
   decomposition of a multi-valued cell into its own child table joined 1:N. */

export const firstNormalFormLesson = {
  id: 'first-normal-form',
  title: 'First Normal Form (1NF)',
  group: 'ER & Relational Design',
  summary: '1NF requires atomic values and no repeating groups: exactly one value per cell, no comma-packed lists or phone1/phone2/phone3 columns, and a key on every row. It is the floor the relational model stands on.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'columns'],
  legend: [],
  goals: [
    { text: 'An un-normalized table packs many values into one cell', step: 0 },
    { text: 'You cannot query, constrain or index inside a cell', step: 1 },
    { text: '1NF demands exactly one atomic value per cell', step: 2 },
    { text: 'Repeating groups split out into their own rows', step: 3 },
    { text: '1NF is necessary but not sufficient', step: 4 },
    { text: 'Atomic cells and a key per row are the floor', step: 5 },
  ],

  steps: [
    { // 0 — UNF
      chapter: 'setup', short: 'Un-normalized',
      title: 'Many values in one cell',
      body: [
        `Here is a <code>Customer</code> table a beginner writes without thinking twice. Each customer has a <code>phones</code> column, and because people have more than one phone, the column holds a list: <code>"555-1, 555-2, 555-3"</code>. It looks compact and it reads fine to a human. It is also <span class="term">un-normalized</span> — it breaks the very first rule of the relational model.`,
        `The problem is the one tinted cell. A relational column is supposed to hold a single value drawn from a domain; this one holds a comma-packed <em>list</em>. The same mistake wears a second costume — repeating columns like <code>phone1, phone2, phone3</code> — but it is the same disease: more than one fact crammed into a place meant for one.`,
      ],
      callout: { kind: 'warn', text: 'A cell holding "555-1, 555-2, 555-3" is a tiny spreadsheet inside your database. The engine sees one opaque string, not three phones.' },
      metrics: { normalForm: 'UNF', redundancy: 60, anomalies: 3, columns: 4 },
      scene: { view: 'unf', note: 'A Customer table whose phones cell holds a comma-packed list — un-normalized.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Why it hurts',
      title: 'You cannot query inside a cell',
      body: [
        `The cost is not theoretical — it lands the moment you write a query. "Which customers have phone <code>555-2</code>?" cannot be a clean <code>WHERE phones = '555-2'</code>, because the cell is the string <code>"555-1, 555-2, 555-3"</code>, not the value <code>555-2</code>. You fall back to fragile <code>LIKE '%555-2%'</code> matching that also catches <code>555-20</code> and cannot use an index.`,
        `Everything the database is good at stops working on that column. You cannot put a <b>UNIQUE</b> or <b>NOT NULL</b> constraint on an individual phone, you cannot <b>index</b> it for fast lookup, you cannot <b>join</b> on it, and you cannot count phones without parsing strings in application code. The list has smuggled a second data model inside a cell, and the engine refuses to help you manage it.`,
      ],
      callout: { kind: 'warn', text: 'No index, no constraint, no clean join, no aggregate. A multi-valued cell opts that column out of everything a relational engine does well.' },
      metrics: { normalForm: 'UNF', redundancy: 60, anomalies: 3, columns: 4 },
      scene: { view: 'problem', note: 'You cannot filter, constrain or index a value buried inside a comma-list.' },
    },
    { // 2 — ATOMIC
      chapter: 'technique', short: 'Atomic',
      title: 'One value per cell',
      body: [
        `The first half of the fix is <span class="term">atomicity</span>: every cell holds exactly one value, indivisible for the purposes of the model. The obvious first attempt is to break the list into separate columns — <code>phone1</code>, <code>phone2</code>, <code>phone3</code>. Each cell is now atomic, and you can at last constrain and index a single phone.`,
        `But look closely: this only solves half the problem. The three columns are a <span class="term">repeating group</span> — the same kind of thing, numbered. What happens when a customer has a fourth phone? You cannot query "any phone" without naming all three columns, and most rows leave <code>phone3</code> null. Atomic values are necessary, but numbered-column repetition is the <em>other</em> thing 1NF forbids.`,
      ],
      callout: { kind: 'tip', text: 'phone1/phone2/phone3 makes each cell atomic but bakes a fixed limit into the schema. A repeating group is a list turned sideways.' },
      changes: ['~ split the list into atomic values', '! phone1 · phone2 · phone3 is a repeating group'],
      metrics: { normalForm: 'UNF', redundancy: 45, anomalies: 2, columns: 6 },
      scene: { view: 'atomic', note: 'Atomic values at last — but phone1/phone2/phone3 is still a repeating group.' },
    },
    { // 3 — 1NF
      chapter: 'technique', short: 'No repeating groups',
      title: 'Split repeating groups into rows',
      body: [
        `The real fix turns the repeating group <em>sideways</em>: a list across columns becomes rows in a child table. We keep <code>customers(customer_id, name, email)</code> clean, and move phones into their own <code>phones</code> table — one row per phone, each carrying a <span class="term">foreign key</span> back to its customer. A customer with four phones is simply four rows; a customer with none is zero rows.`,
        `This is the shape of every normalization step you will ever make: a <span class="term">decomposition</span> that splits one table into two joined by a key. The relationship is <b>1:N</b> — one customer, many phones — carried by <code>phones.customer_id → customers.customer_id</code>. Now each phone is a first-class value you can constrain, index, join and count, and the schema no longer caps how many a customer may have.`,
      ],
      callout: { kind: 'insight', text: 'Repeating group → child table. One customer, many phone rows, joined by a foreign key: the canonical decomposition the whole ladder repeats.' },
      changes: ['+ phones table (phone_id, customer_id, phone)', '+ FK phones.customer_id → customers.customer_id', '~ 1:N relationship'],
      metrics: { normalForm: '1NF', redundancy: 10, anomalies: 0, columns: 6 },
      scene: { view: '1nf', note: 'customers 1:N phones — the repeating group split out into its own table and joined by a foreign key.' },
    },
    { // 4 — FLOOR
      chapter: 'tradeoff', short: 'The floor',
      title: '1NF is necessary, not sufficient',
      body: [
        `It is tempting to declare victory — but 1NF is only the <em>floor</em>. It guarantees atomic cells and a key on every row, which is what lets the relational operators work at all. It says nothing about <span class="term">redundancy</span>: a table can be perfectly in 1NF and still duplicate facts in every row, still suffer update, insert and delete anomalies.`,
        `A classic 1NF-but-rotten table repeats a customer's name and email on every one of their order rows. Atomic? Yes. Keyed? Yes. Redundant? Badly. That gap is exactly why the ladder keeps climbing: <b>2NF</b> removes dependencies on part of a key, <b>3NF</b> removes dependencies through a non-key. 1NF gets you a lawful relational table; the higher forms make it a <em>well-behaved</em> one.`,
      ],
      callout: { kind: 'tip', text: '1NF makes a table legal, not good. Atomic and keyed is the entry fee — redundancy and anomalies are what 2NF and 3NF go after next.' },
      metrics: { normalForm: '1NF', redundancy: 10, anomalies: 0, columns: 6 },
      scene: { view: 'floor', note: '1NF is the entry rung: atomic and keyed, but redundancy can still remain for the higher forms.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Atomic cells, a key per row',
      body: [
        `First normal form is two demands and nothing more: every cell holds exactly <b>one atomic value</b>, and there are <b>no repeating groups</b> — no comma-lists, no <code>phone1/phone2/phone3</code>. Meeting both usually means <span class="term">decomposing</span> a multi-valued attribute into a child table joined back by a foreign key, which is why 1NF is where you first meet the split-and-link move.`,
        `Get 1NF right and every value in the database is addressable: you can filter it, constrain it, index it, join on it and count it. That is the solid floor the rest of normalization is built on. The next rung, <b>2NF</b>, takes the keyed-and-atomic table and starts hunting the redundancy that 1NF leaves untouched.`,
      ],
      callout: { kind: 'insight', text: 'One value per cell, no repeating groups, a key on every row — the floor that makes a table a proper relation.' },
      metrics: { normalForm: '1NF', redundancy: 10, anomalies: 0, columns: 6 },
      scene: { view: 'recap', note: 'customers 1:N phones — atomic cells and a key per row, the 1NF floor.' },
    },
  ],
};
