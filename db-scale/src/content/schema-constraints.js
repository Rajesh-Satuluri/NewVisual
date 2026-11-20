/* content/schema-constraints.js — the "Schema & Constraints" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/schema-constraints-scene.js. Rendered through the shared course shell. */

export const schemaConstraintsLesson = {
  id: 'schema-constraints',
  title: 'Schema & Constraints',
  group: 'Foundations',
  summary: 'The schema declares each column’s name and type, and constraints are rules the database itself enforces — so invalid data can never land in the first place.',
  minutes: 8,
  level: 'beginner',
  metrics: ['tables', 'columns', 'constraints', 'integrity'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A schema fixes the columns and types every row must match', step: 0 },
    { text: 'Domain &amp; NOT NULL constraints reject malformed values', step: 1 },
    { text: 'A primary key guarantees uniqueness and identity', step: 2 },
    { text: 'A foreign key enforces referential integrity across tables', step: 3 },
    { text: 'CHECK and UNIQUE encode your business rules', step: 4 },
  ],

  steps: [
    { // 0 — THE CONTRACT
      chapter: 'technique', short: 'The contract',
      title: 'The schema is the contract',
      body: [
        `Before a single row exists, you declare a <span class="term">schema</span>: the list of columns and the <b>type</b> of each one. For a users table that might be <code>id INT, name TEXT, email TEXT</code>.`,
        `From then on the database holds every write to that shape. A row with the wrong columns, or a number where text belongs, is not stored and quietly fixed later — it is <em>refused at the door</em>. The schema is a promise the data can always be trusted to keep.`,
      ],
      callout: { kind: 'insight', text: 'A schema is a contract enforced on every write. Data that doesn’t fit the declared shape never enters the table.' },
      metrics: { tables: 1, columns: 3, constraints: 0, integrity: 88 },
      scene: { view: 'schema', note: 'One table, three typed columns — the shape every row must match.' },
    },
    { // 1 — DOMAIN / NOT NULL
      chapter: 'technique', short: 'NOT NULL',
      title: 'Types and NOT NULL draw the lines',
      body: [
        `The simplest constraints guard a single column. A <b>type</b> says <em>what kind</em> of value is allowed; <code>NOT NULL</code> says a value must be present at all.`,
        `Try to insert a user with no <code>email</code>, or the text <code>"twelve"</code> into an <code>INT</code> column, and the write is rejected before it touches storage. These are called <span class="term">domain constraints</span> — they fence each column to its legal set of values.`,
      ],
      callout: { kind: 'tip', text: 'Type + NOT NULL = domain constraints. They keep each column inside the set of values it is allowed to hold.' },
      changes: ['+ NOT NULL on email', '+ type checks per column', '~ malformed rows bounced'],
      metrics: { tables: 1, columns: 3, constraints: 2, integrity: 91 },
      scene: { view: 'domain', note: 'A row with a null email is turned away at the column boundary.' },
    },
    { // 2 — PRIMARY KEY
      chapter: 'technique', short: 'Primary key',
      title: 'A primary key gives each row an identity',
      body: [
        `Pick a column (or set of columns) whose value is <b>unique</b> for every row and never missing — that is the <span class="term">primary key</span>. For users it is almost always <code>id</code>.`,
        `The database now refuses any second row with an <code>id</code> that already exists. Every row has exactly one identity, and anything that wants to point at a user can do so by that key alone.`,
      ],
      callout: { kind: 'insight', text: 'PRIMARY KEY = unique + not null + the row’s identity. Duplicate keys are impossible by construction.' },
      changes: ['+ PRIMARY KEY (id)', '~ duplicate id rejected', '+ stable row identity'],
      metrics: { tables: 1, columns: 3, constraints: 3, integrity: 94 },
      scene: { view: 'pk', note: 'A second row with id = 7 collides with the key and is refused.' },
    },
    { // 3 — FOREIGN KEY
      chapter: 'technique', short: 'Foreign key',
      title: 'A foreign key links tables honestly',
      body: [
        `An <code>orders</code> table stores a <code>user_id</code> that must match some real row in <code>users</code>. Declare it a <span class="term">foreign key</span> and the database enforces that link on every write.`,
        `Insert an order for a user that does not exist — an <em>orphan</em> — and it is rejected. Delete a user that still has orders and the database stops you (or cascades the cleanup). This is <span class="term">referential integrity</span>: the references between tables can never dangle.`,
      ],
      callout: { kind: 'tip', text: 'A FOREIGN KEY ties a column to another table’s key. Orphaned references simply cannot exist.' },
      changes: ['+ orders.user_id → users.id', '~ orphan orders rejected', '+ referential integrity'],
      metrics: { tables: 2, columns: 6, constraints: 4, integrity: 97 },
      scene: { view: 'fk', note: 'orders.user_id must point at a real user — an orphan order is blocked.' },
    },
    { // 4 — CHECK / UNIQUE
      chapter: 'technique', short: 'CHECK · UNIQUE',
      title: 'CHECK and UNIQUE encode your rules',
      body: [
        `Beyond keys, you can teach the database your own invariants. <code>CHECK (age &gt;= 0)</code> forbids a negative age; <code>UNIQUE (email)</code> forbids two users sharing an address even though neither is the primary key.`,
        `Each rule you move into the schema is a rule <em>every</em> application gets for free, forever — no app can forget it, and no bug can slip a bad row past it.`,
      ],
      callout: { kind: 'insight', text: 'CHECK and UNIQUE push business rules into the data layer, where they hold for every writer at once.' },
      changes: ['+ CHECK (age >= 0)', '+ UNIQUE (email)', '~ rule-breaking rows bounced'],
      metrics: { tables: 2, columns: 6, constraints: 6, integrity: 100 },
      scene: { view: 'check', note: 'A row that breaks a CHECK or UNIQUE rule never reaches the table.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Integrity, guaranteed by the database',
      body: [
        `Stack them up — types, <code>NOT NULL</code>, primary keys, foreign keys, <code>CHECK</code>, <code>UNIQUE</code> — and the schema becomes a wall of rules the database checks on every single write.`,
        `The payoff is enormous: correctness stops being something each application re-implements and starts being a property of the data itself. Write the rule once, in the schema, and the database guards it for all time.`,
      ],
      callout: { kind: 'insight', text: 'Constraints move correctness out of every app and into the database — declared once, enforced on every write.' },
      metrics: { tables: 2, columns: 6, constraints: 6, integrity: 100 },
      scene: { view: 'recap', note: 'Six rules, one gatekeeper — bad data has nowhere to enter.' },
    },
  ],
};
