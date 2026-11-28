/* content/constraints-triggers.js — the "Constraints & Triggers" lesson, as DATA.
   Same shape as the other Data Modeling lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/constraints-triggers-scene.js and rendered through the shared
   course shell. This is the enforcement-toolkit deep dive: the mechanics of each
   tool and when to reach for it — not the rule-to-category mapping of the
   Business Rules lesson. */

export const constraintsTriggersLesson = {
  id: 'constraints-triggers',
  title: 'Constraints & Triggers',
  group: 'ER & Relational Design',
  summary: 'The enforcement toolkit — NOT NULL, UNIQUE, CHECK, PRIMARY/FOREIGN KEY, plus triggers and assertions for rules too complex for a single column — and when to reach for each.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['constraints', 'integrity', 'columns', 'entities'],
  legend: [],
  goals: [
    { text: 'Invariants belong in the schema, not scattered across apps', step: 0 },
    { text: 'NOT NULL, UNIQUE, CHECK and DEFAULT police columns and rows', step: 1 },
    { text: 'PRIMARY KEY and FOREIGN KEY are constraints that enforce identity and references', step: 2 },
    { text: 'Triggers run procedural logic on insert, update or delete', step: 3 },
    { text: 'Prefer declarative constraints; reach for triggers only when you must', step: 4 },
    { text: 'Declarative first, triggers for the rest', step: 5 },
  ],

  steps: [
    { // 0 — RULES IN THE SCHEMA
      chapter: 'setup', short: 'In the schema',
      title: 'Rules in the schema',
      body: [
        `An <span class="term">invariant</span> is a fact about your data that must always be true: a total is never negative, an email is never blank, every order names a real customer. You can check such rules in the application — but every app, script, migration and analyst that writes the table is then a place the rule can be forgotten.`,
        `Put the rule in the schema instead and the database holds the line for all of them at once, on every insert and update, no matter who writes. This lesson is the <b>enforcement toolkit</b>: the declarative <span class="term">constraints</span> the database checks for you, and the procedural <span class="term">triggers</span> for rules a constraint cannot express — and, for each, when it is the right tool.`,
      ],
      callout: { kind: 'insight', text: 'If a rule must always hold, the schema is the one place no writer can skip. Enforce invariants where the data lives, not in each app that touches it.' },
      metrics: { constraints: 0, integrity: 20, columns: 5, entities: 1 },
      scene: { view: 'overview', note: 'An Orders table with no guards — every invariant still lives in application code.' },
    },
    { // 1 — COLUMN & TABLE CONSTRAINTS
      chapter: 'technique', short: 'Column & table',
      title: 'Column & table constraints',
      body: [
        `The everyday toolkit is four declarative constraints. <code>NOT NULL</code> forbids a missing value. <code>UNIQUE</code> forbids a duplicate across the table. <code>CHECK (total &gt;= 0)</code> forbids a value that fails a boolean test on the row. <code>DEFAULT</code> isn't a guard but supplies a value — <code>status DEFAULT 'pending'</code> — so a column is populated sensibly when the writer stays silent.`,
        `Each is <span class="term">declarative</span>: you state <em>what</em> must be true and the engine works out how to enforce it on every write, with no code to maintain. A constraint on one column is a <b>column constraint</b>; one spanning several columns — <code>UNIQUE(customer_id, slot)</code>, <code>CHECK (ends_at &gt; starts_at)</code> — is a <b>table constraint</b>, but both are checked the same way.`,
      ],
      callout: { kind: 'tip', text: 'NOT NULL · UNIQUE · CHECK · DEFAULT cover most invariants and cost a line each. State what must be true and let the engine enforce it.' },
      changes: ['+ NOT NULL on required columns', '+ UNIQUE(email) · CHECK (total >= 0)', "+ DEFAULT 'pending' on status"],
      metrics: { constraints: 4, integrity: 55, columns: 5, entities: 1 },
      scene: { view: 'constraints', note: 'NOT NULL, UNIQUE, CHECK and DEFAULT attached to the Orders columns.' },
    },
    { // 2 — KEYS AS CONSTRAINTS
      chapter: 'technique', short: 'Keys as constraints',
      title: 'Keys as constraints',
      body: [
        `The keys you draw in a diagram are constraints too. <code>PRIMARY KEY (order_id)</code> is enforcement, not decoration: it bundles <code>UNIQUE</code> with <code>NOT NULL</code>, so the engine rejects any row that duplicates or omits the identifier. In toolkit terms a primary key is the strongest column guard you can declare.`,
        `A <code>FOREIGN KEY (customer_id) REFERENCES customer(id)</code> is the toolkit's one <em>cross-table</em> constraint: the engine refuses an order naming a customer that does not exist, and governs what happens when the parent changes — <code>ON DELETE CASCADE</code>, <code>RESTRICT</code> or <code>SET NULL</code>. One declaration, and referential integrity is maintained on every write to either side.`,
      ],
      callout: { kind: 'insight', text: 'PRIMARY KEY = UNIQUE + NOT NULL on identity; FOREIGN KEY is the built-in cross-table guard with referential actions. Keys are enforcement, not annotation.' },
      changes: ['+ PRIMARY KEY (order_id) — unique + not null', '+ FOREIGN KEY (customer_id) → customer(id)', '~ ON DELETE RESTRICT'],
      metrics: { constraints: 6, integrity: 75, columns: 5, entities: 2 },
      scene: { view: 'keys', note: 'PRIMARY KEY and FOREIGN KEY as constraints — the FK links Order to Customer.' },
    },
    { // 3 — TRIGGERS
      chapter: 'technique', short: 'Triggers',
      title: 'Triggers',
      body: [
        `Some rules no single column or row can express: <em>write an audit record whenever an order's status changes</em>, or <em>a customer's open orders may never exceed their credit limit</em>. These are procedural, or span rows and tables. A <span class="term">trigger</span> is code — <code>BEFORE</code> or <code>AFTER</code> an <code>INSERT</code>, <code>UPDATE</code> or <code>DELETE</code> — that the engine runs automatically as part of the same transaction.`,
        `An <code>AFTER INSERT ON orders</code> trigger can write a row into <code>audit_log</code>; a <code>BEFORE UPDATE</code> trigger can read other rows and raise an error to reject the change. Triggers are the toolkit's escape hatch for logic a declarative constraint cannot reach — including the <span class="term">assertion</span>, a standard but rarely-implemented multi-table constraint usually simulated with triggers.`,
      ],
      callout: { kind: 'tip', text: 'A trigger runs procedural logic on a write, inside the transaction — the reach-for tool when a rule crosses rows or tables, or must do work a CHECK cannot.' },
      changes: ['+ AFTER INSERT ON orders → write audit_log row', '+ BEFORE UPDATE → enforce cross-row rule', '~ assertions simulated with triggers'],
      metrics: { constraints: 7, integrity: 90, columns: 5, entities: 3 },
      scene: { view: 'triggers', note: 'AFTER INSERT on Order writes an audit row — a procedural, cross-table rule.' },
    },
    { // 4 — WHICH TOOL
      chapter: 'tradeoff', short: 'Which tool',
      title: 'Which tool',
      body: [
        `The tools are not equals. A declarative constraint is <b>visible</b> in the schema, <b>checkable</b> at a glance, enforced uniformly, and the optimizer can even reason about it. A trigger is procedural code: its logic is <em>hidden</em> from anyone reading the table, it fires as a side effect writers don't see, and one trigger can quietly fire another — surprising to debug and easy to get wrong.`,
        `So the order of preference is firm: express a rule as <code>NOT NULL</code>, <code>UNIQUE</code>, <code>CHECK</code> or a key if you possibly can; drop to a trigger only for the genuinely procedural or cross-table rules that have no declarative form. Declarative first keeps the schema honest; triggers, used sparingly, cover what's left.`,
      ],
      callout: { kind: 'warn', text: 'Triggers hide logic and fire as side effects — easy to surprise, hard to trace. Prefer a declarative constraint every time one can express the rule.' },
      changes: ['~ declarative: visible, checkable, uniform', '~ triggers: hidden side effects, harder to reason about', '− avoid triggers for rules a CHECK or key can hold'],
      metrics: { constraints: 7, integrity: 90, columns: 5, entities: 3 },
      scene: { view: 'tradeoff', note: 'Declarative constraints are visible and checkable; triggers hide logic — use them sparingly.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The toolkit',
      title: 'Prefer declarative; triggers for the rest',
      body: [
        `The enforcement toolkit, in order of reach: <b>NOT NULL</b>, <b>UNIQUE</b>, <b>CHECK</b> and <b>DEFAULT</b> for columns and rows; <b>PRIMARY KEY</b> and <b>FOREIGN KEY</b> for identity and references; and <b>triggers</b> (and assertions) for the procedural, cross-row or cross-table rules nothing declarative can hold. Each lives in the schema, so the database enforces it for every writer.`,
        `Reach for them in that order. Declarative constraints are cheap, visible and self-documenting — make them the default, and let a trigger carry only the rule that truly needs code. The result is a schema that states its own invariants and a database that refuses to break them.`,
      ],
      callout: { kind: 'insight', text: 'Declarative constraints first — NOT NULL, UNIQUE, CHECK, keys — and triggers only for the rules they cannot express. The schema enforces, for everyone.' },
      metrics: { constraints: 6, integrity: 95, columns: 5, entities: 2 },
      scene: { view: 'recap', note: 'The toolkit: declarative guards by default, a trigger reserved for what they cannot hold.' },
    },
  ],
};
