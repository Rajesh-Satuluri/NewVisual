/* content/business-rules.js — the "Business Rules & Constraints" lesson, as DATA.
   Same shape as the other Data Modeling lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/business-rules-scene.js and rendered through the shared course
   shell. Business rules become constraints the database itself enforces. */

export const businessRulesLesson = {
  id: 'business-rules',
  title: 'Business Rules & Constraints',
  group: 'Modeling Foundations',
  summary: 'Business rules become constraints in the model — domain, key, entity and referential integrity, plus CHECK constraints and triggers — so the database enforces the rules, not just the application.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['constraints', 'integrity', 'fks', 'entities'],
  legend: [],
  goals: [
    { text: 'A business rule becomes a constraint in the schema', step: 0 },
    { text: 'Domain and key constraints limit values and fix identity', step: 1 },
    { text: 'Entity integrity means a primary key is unique and not null', step: 2 },
    { text: 'Referential integrity keeps foreign keys pointing at real rows', step: 3 },
    { text: 'CHECK constraints and triggers enforce richer rules', step: 4 },
    { text: 'Rules in the schema outlive any one application', step: 5 },
  ],

  steps: [
    { // 0 — RULES AS CONSTRAINTS
      chapter: 'setup', short: 'Rules as constraints',
      title: 'A rule becomes a constraint',
      body: [
        `Every business runs on rules: “an email must be unique”, “an order total can’t be negative”, “every order belongs to a customer”. A <span class="term">constraint</span> is that rule written into the schema, where the database checks it on every insert and update — no matter which application, script or analyst wrote the data.`,
        `Take the rule <em>every order must belong to a customer</em>. As a <span class="term">foreign-key constraint</span> on <code>order.customer_id</code>, the database will simply refuse any order that names a customer who does not exist. The rule stops being a hopeful comment in the app and becomes a guarantee the data cannot violate.`,
      ],
      callout: { kind: 'insight', text: 'A constraint is a business rule the database refuses to break. If a rule must always hold, the schema — not the application — is where it belongs.' },
      metrics: { constraints: 1, integrity: 25, fks: 1, entities: 2 },
      scene: { view: 'overview', note: 'Every order must belong to a customer — a foreign-key constraint links Order to Customer.' },
    },
    { // 1 — DOMAIN & KEY
      chapter: 'technique', short: 'Domain & key',
      title: 'Domain and key constraints',
      body: [
        `The most basic constraints police <em>values</em>. A <span class="term">domain constraint</span> is the column’s type plus any limits on it: <code>signup_date</code> is a <code>DATE</code>, <code>email</code> is <code>VARCHAR(255)</code>, <code>status</code> may be only <code>'active'</code> or <code>'closed'</code>. The database rejects anything outside the domain before it is ever stored.`,
        `A <span class="term">key constraint</span> polices <em>identity</em>. <code>UNIQUE(email)</code> guarantees no two customers share an address; <code>PRIMARY KEY(customer_id)</code> guarantees one unique, non-null identifier per row. Together, domain and key constraints make each column hold only sensible values and each row addressable by a dependable key.`,
      ],
      callout: { kind: 'tip', text: 'Reach for the narrowest domain a column allows and a UNIQUE on anything that must not repeat. Cheap to declare, and they catch bad data at the door.' },
      changes: ['+ domain: email VARCHAR(255), status IN (active, closed)', '+ UNIQUE(email)', '+ PRIMARY KEY(customer_id)'],
      metrics: { constraints: 3, integrity: 45, fks: 1, entities: 2 },
      scene: { view: 'domain', note: 'Domain constraints bound each column; UNIQUE guarantees one email per customer.' },
    },
    { // 2 — ENTITY INTEGRITY
      chapter: 'technique', short: 'Entity integrity',
      title: 'Entity integrity',
      body: [
        `<span class="term">Entity integrity</span> is a single, strict promise about the primary key: it must be <b>unique</b> and it must be <b>not null</b>. Uniqueness means one key value names one row; not-null means every row <em>has</em> an identity. A primary key that allowed nulls could leave a row no one can point at or address.`,
        `This is why <code>PRIMARY KEY</code> is more than a <code>UNIQUE</code> index: it bundles uniqueness with a not-null guarantee and marks the column as the row’s canonical identity. Enforce entity integrity and every record is distinct and reachable — the precondition for any relationship pointing at it.`,
      ],
      callout: { kind: 'insight', text: 'Entity integrity = unique AND not null on the primary key. A missing or duplicated key is a row the rest of the model can never reliably find.' },
      changes: ['~ customer_id: PRIMARY KEY', '~ guaranteed unique · not null'],
      metrics: { constraints: 4, integrity: 65, fks: 1, entities: 2 },
      scene: { view: 'entity-integrity', note: 'Entity integrity: the primary key is unique and not null for every row.' },
    },
    { // 3 — REFERENTIAL INTEGRITY
      chapter: 'technique', short: 'Referential integrity',
      title: 'Referential integrity',
      body: [
        `<span class="term">Referential integrity</span> keeps relationships honest: every <span class="term">foreign key</span> must reference a primary key that actually exists. With it in force, <code>order.customer_id</code> can never point at a customer who was never created — there are no <b>orphan</b> rows dangling off a missing parent.`,
        `The constraint also decides what happens when the parent is deleted. <code>ON DELETE RESTRICT</code> refuses to remove a customer who still has orders; <code>ON DELETE CASCADE</code> deletes their orders along with them; <code>ON DELETE SET NULL</code> detaches the orders. Choosing that behaviour is part of modelling the relationship, not an afterthought.`,
      ],
      callout: { kind: 'warn', text: 'A foreign key with no ON DELETE policy leaves deletes to chance. Decide up front: RESTRICT to protect children, CASCADE to remove them, SET NULL to detach them.' },
      changes: ['+ FOREIGN KEY (order.customer_id) → customer(customer_id)', '+ ON DELETE RESTRICT — no orphans'],
      metrics: { constraints: 5, integrity: 80, fks: 1, entities: 2 },
      scene: { view: 'referential', note: 'Referential integrity: no order may point at a customer who does not exist.' },
    },
    { // 4 — CHECK & ASSERTIONS
      chapter: 'technique', short: 'CHECK & assertions',
      title: 'CHECK constraints and triggers',
      body: [
        `Some rules go beyond “valid type” and “real reference”. A <span class="term">CHECK constraint</span> states a boolean every row must satisfy: <code>CHECK (total >= 0)</code> forbids a negative total, and a cross-column <code>CHECK (ship_date >= order_date)</code> forbids shipping before ordering. The database evaluates it on every write and rejects any row that fails.`,
        `When a rule spans many rows or tables — “a customer’s orders may not exceed their credit limit” — a single-column CHECK is not enough, and you reach for a <span class="term">trigger</span> or assertion: a small procedure the database runs on change. Use these sparingly; they are powerful but harder to see and reason about than a plain CHECK.`,
      ],
      callout: { kind: 'tip', text: 'Prefer a declarative CHECK over a trigger whenever the rule fits one. A CHECK is visible in the schema; trigger logic hides in code the next modeller may miss.' },
      changes: ['+ CHECK (total >= 0)', '+ CHECK (ship_date >= order_date)', '+ trigger for cross-row rules'],
      metrics: { constraints: 7, integrity: 95, fks: 1, entities: 2 },
      scene: { view: 'check', note: 'CHECK constraints bound the Order row: total ≥ 0, ship_date ≥ order_date.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Let the database enforce the rules',
      body: [
        `Four kinds of integrity plus the CHECK cover almost every rule: <b>domain</b> (valid values), <b>entity</b> (a unique, non-null key), <b>referential</b> (foreign keys point at real rows), and <b>CHECK / triggers</b> (richer conditions). Declared in the schema, each one is enforced for every writer, forever — not just for the one app that remembered to validate.`,
        `That is the whole argument for constraints: applications are rewritten, scripts bypass the UI, analysts run ad-hoc inserts. A rule that lives in the <b>schema</b> outlives all of them. Model the rules as constraints and the database becomes the last, unbreakable line of defence for your data’s correctness.`,
      ],
      callout: { kind: 'insight', text: 'Domain · entity · referential · CHECK — put the rules in the schema and they hold no matter which application, or how many, touch the data.' },
      metrics: { constraints: 7, integrity: 100, fks: 1, entities: 2 },
      scene: { view: 'recap', note: 'Four integrity kinds plus CHECK — rules the database enforces for every writer.' },
    },
  ],
};
