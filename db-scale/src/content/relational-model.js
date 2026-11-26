/* content/relational-model.js — the "Relational Model" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/relational-model-scene.js. Rendered through the shared course shell. */

export const relationalModelLesson = {
  id: 'relational-model',
  title: 'Relational Model',
  group: 'Foundations',
  summary: 'Codd’s relational model — data as relations (tables) of tuples (rows) over typed attributes (columns), tied together by keys. The idea underneath every SQL database.',
  minutes: 8,
  level: 'beginner',
  metrics: ['relations', 'rows', 'columns', 'constraints'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A relation is a table: a heading plus a body of rows', step: 0 },
    { text: 'Rows are tuples; columns are typed attributes', step: 1 },
    { text: 'A primary key uniquely identifies every row', step: 2 },
    { text: 'Foreign keys link one relation to another', step: 3 },
    { text: 'A relation is a set — no duplicates, order is irrelevant', step: 4 },
  ],

  steps: [
    { // 0 — A RELATION
      chapter: 'technique', short: 'A relation',
      title: 'A relation is just a table',
      body: [
        `In 1970 Edgar Codd proposed something radical: stop thinking about pointers and files, and describe data as plain <span class="term">relations</span>. A relation is a table — a <b>heading</b> that names its columns and fixes their types, and a <b>body</b> of rows that hold the data.`,
        `We write the heading as <code>users(id, name, email)</code>. That one line is the whole contract: three attributes, any number of rows, nothing hidden. Everything else in this course is built on this shape.`,
      ],
      callout: { kind: 'insight', text: 'Relation = heading (schema) + body (rows). No navigation, no pointers — just named columns and the rows beneath them.' },
      metrics: { relations: 1, rows: 4, columns: 3, constraints: 0 },
      scene: { view: 'table', note: 'One relation: users(id, name, email) and four rows beneath it.' },
    },
    { // 1 — TUPLES & ATTRIBUTES
      chapter: 'technique', short: 'Tuples',
      title: 'Rows are tuples, columns are attributes',
      body: [
        `Each row is a <span class="term">tuple</span> — an ordered-by-name bundle of values, one per column. Each column is an <span class="term">attribute</span> drawn from a <b>domain</b>: <code>id</code> is an integer, <code>email</code> is text. A cell holds exactly one atomic value — no lists, no nested tables.`,
        `That atomic, uniform grid is what makes relations easy to reason about and easy for the engine to store, index and query.`,
      ],
      callout: { kind: 'tip', text: 'One row = one tuple. Every cell is a single value of its column’s type. Keep it flat and the algebra stays simple.' },
      changes: ['+ each row is a tuple', '~ each column has a domain/type', '+ atomic cells only'],
      metrics: { relations: 1, rows: 4, columns: 3, constraints: 0 },
      scene: { view: 'tuple', note: 'Highlight one tuple; the columns id · name · email are its attributes.' },
    },
    { // 2 — KEYS
      chapter: 'technique', short: 'Keys',
      title: 'A primary key names each row',
      body: [
        `If a relation is a set of rows, you need a way to point at exactly one. A <span class="term">primary key</span> is the column (or columns) whose value is <b>unique</b> and <b>never null</b> — here, <code>id</code>. No two users may share it.`,
        `The key is the row’s identity. It’s what other tables will reference, and what the engine builds its fastest index on.`,
      ],
      callout: { kind: 'insight', text: 'A primary key is a uniqueness promise: one value, one row, forever. It turns “a pile of rows” into “addressable records.”' },
      changes: ['+ PRIMARY KEY (id)', '~ unique · not null', '+ 1 constraint'],
      metrics: { relations: 1, rows: 4, columns: 3, constraints: 1 },
      scene: { view: 'key', note: 'id is the primary key — unique and not null for every row.' },
    },
    { // 3 — RELATIONSHIPS
      chapter: 'technique', short: 'Relationships',
      title: 'Foreign keys link relations',
      body: [
        `Real data is connected: users place orders. Instead of nesting orders inside users, we give <code>orders</code> a column <code>user_id</code> that holds the <b>primary key</b> of the user it belongs to. That reference is a <span class="term">foreign key</span>.`,
        `Relationships become plain data — a value in a column — not a special structure. Follow the key and you’ve joined the two relations; the engine guarantees the referenced user actually exists.`,
      ],
      callout: { kind: 'tip', text: 'Foreign key: orders.user_id → users.id. Relationships are just values pointing at keys. That’s why relations compose so cleanly.' },
      changes: ['+ orders relation', '+ FK orders.user_id → users.id', '~ referential integrity enforced'],
      metrics: { relations: 2, rows: 9, columns: 6, constraints: 2 },
      scene: { view: 'fk', note: 'orders.user_id references users.id — a foreign-key link between two relations.' },
    },
    { // 4 — SET SEMANTICS
      chapter: 'technique', short: 'Set semantics',
      title: 'A relation is a set',
      body: [
        `Mathematically a relation is a <span class="term">set</span> of tuples, and sets have two rules that matter: there are <b>no duplicate rows</b>, and the <b>order</b> of rows (and of columns) means nothing. Two tables with the same rows in a different order are the <em>same</em> relation.`,
        `Because the model is set-based, operators that take relations and return relations compose without surprises — the groundwork for relational algebra and SQL.`,
      ],
      callout: { kind: 'insight', text: 'No duplicates, no inherent order. A relation is defined by <em>which</em> tuples it contains, never by how they’re arranged.' },
      changes: ['~ duplicate rows collapse', '~ row & column order carry no meaning'],
      metrics: { relations: 2, rows: 9, columns: 6, constraints: 2 },
      scene: { view: 'set', note: 'A duplicate tuple is not a second row — a relation holds each tuple once.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Why it won',
      title: 'Why the relational model won',
      body: [
        `Codd’s model gave data a <b>simple</b> shape (tables), a <b>precise</b> meaning (sets of typed tuples) and a property no earlier model had: it is <span class="term">closed</span> — every operation on relations returns a relation, so queries compose endlessly.`,
        `That is exactly what the next two lessons exploit: <b>relational algebra</b> is the set of those operations, and <b>SQL</b> is the language that drives them. Hold on to tables, tuples and keys — everything builds on them.`,
      ],
      callout: { kind: 'insight', text: 'Typed · keyed · set-based · closed under operations. Four properties, one foundation for every relational database.' },
      metrics: { relations: 2, rows: 9, columns: 6, constraints: 2 },
      scene: { view: 'recap', note: 'Two linked relations — the shape SQL and relational algebra operate on.' },
    },
  ],
};
