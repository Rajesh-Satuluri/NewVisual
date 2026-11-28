/* content/model-smells.js — the "Model Smells & Quality" lesson, as DATA.
   Same shape as the other Data Modeling lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/model-smells-scene.js and rendered through the shared course
   shell. The warning signs of a model that will hurt later — and the clean
   shape to aim for. */

export const modelSmellsLesson = {
  id: 'model-smells',
  title: 'Model Smells & Quality',
  group: 'Modeling Foundations',
  summary: 'The warning signs of a model that will hurt later — uncontrolled redundancy, god tables, missing keys, over-nesting and premature physical choices — and the healthy shape to aim for.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['redundancy', 'duplication', 'normalForm', 'entities'],
  legend: [],
  goals: [
    { text: 'A smell is a warning sign, not an outright bug', step: 0 },
    { text: 'Uncontrolled redundancy breeds update anomalies', step: 1 },
    { text: 'A god table lumps many entities into one', step: 2 },
    { text: 'A table with no key has rows you cannot address', step: 3 },
    { text: 'Over-nesting and premature tuning lock in bad choices', step: 4 },
    { text: 'Clear entities, a key per table and controlled redundancy', step: 5 },
  ],

  steps: [
    { // 0 — WHAT A SMELL IS
      chapter: 'setup', short: 'What a smell is',
      title: 'A smell is a warning, not a bug',
      body: [
        `Borrowed from code, a <span class="term">model smell</span> is a structural warning sign: the schema <em>works</em> today — queries return, inserts succeed — but its shape is going to cause pain. Nothing is broken yet, so smells slip through review easily; the cost arrives months later as awkward queries, tangled migrations and quiet data drift.`,
        `This lesson is a field guide to the common ones: uncontrolled <b>redundancy</b>, the <b>god table</b>, <b>missing keys</b>, and <b>over-nesting</b> with premature physical tuning. For each, learn to spot it early — when a smell is still a cheap edit rather than an expensive rewrite — and keep the clean shape in mind as the target.`,
      ],
      callout: { kind: 'insight', text: 'A smell is not “this is wrong”, it is “this will hurt”. The time to fix one is now, while it is a small change and not a migration.' },
      metrics: { redundancy: 40, duplication: 6, normalForm: 1, entities: 1 },
      scene: { view: 'overview', note: 'One card mixing several entities’ fields — a model that works but will hurt.' },
    },
    { // 1 — REDUNDANCY
      chapter: 'problem', short: 'Redundancy',
      title: 'Uncontrolled redundancy',
      body: [
        `The first and most common smell is storing the same fact in many places. An <code>Orders</code> table that carries <code>customer_name</code>, <code>customer_email</code> and <code>product_price</code> on <em>every row</em> repeats those facts thousands of times. The data is <span class="term">redundant</span>, and redundancy you did not choose on purpose is a liability.`,
        `It breeds <b>update anomalies</b>: change a customer’s email and you must find and rewrite every order they ever placed, or the table now disagrees with itself. Miss one row and the truth is ambiguous. The fix is to give each fact one home — a <code>Customer</code> row — and reference it, so there is exactly one place to change it.`,
      ],
      callout: { kind: 'warn', text: 'The same fact on many rows is an update anomaly waiting to happen. One fact, one row, one place to change — everything else references it.' },
      changes: ['! customer_name, customer_email repeated per order', '! product_price copied onto every line', '→ update one email ⇒ rewrite thousands of rows'],
      metrics: { redundancy: 70, duplication: 14, normalForm: 1, entities: 1 },
      scene: { view: 'redundancy', note: 'Customer and product facts copied onto every order row — redundancy, flagged.' },
    },
    { // 2 — GOD TABLE
      chapter: 'problem', short: 'God table',
      title: 'The god table',
      body: [
        `A <span class="term">god table</span> is the opposite of too many tables: one enormous table — forty columns and climbing — that tries to model everything. Customer fields, order fields, product fields and payment fields all share rows, half of them null at any time because no single row is really about all of those things at once.`,
        `The smell is that there is <b>no clear entity</b>. A table should be about one kind of thing; a god table is about several, glued together for the convenience of avoiding a join. It is impossible to key cleanly, miserable to index, and every new requirement bolts another column onto the pile. Split it along its real entities.`,
      ],
      callout: { kind: 'warn', text: 'One table, many entities, columns mostly null — that is a god table. Ask “what is one row about?”; if there is no single answer, split it.' },
      changes: ['! 40 columns spanning customer, order, product, payment', '! most columns null on most rows', '→ split into one table per entity'],
      metrics: { redundancy: 65, duplication: 18, normalForm: 1, entities: 1 },
      scene: { view: 'godtable', note: 'One very tall table modelling four entities at once — a god table.' },
    },
    { // 3 — MISSING KEYS
      chapter: 'problem', short: 'Missing keys',
      title: 'No key, no identity',
      body: [
        `A subtler smell is a table with <b>no primary key</b>. It will happily store rows, but two identical rows are now indistinguishable, and there is no reliable way to point at <em>one</em> of them to update or delete it. Duplicates creep in silently, and nothing in the schema can object.`,
        `Without a key there is also nothing for a relationship to reference, so the table can never be the clean parent of a foreign key. Every real entity deserves an identity: a natural key if one exists, or a surrogate <code>id</code> if not. A table with no key is a pile of rows, not a set of records.`,
      ],
      callout: { kind: 'warn', text: 'No primary key means duplicate, unaddressable rows and no anchor for relationships. Give every table a key — surrogate if nothing natural fits.' },
      changes: ['! no PRIMARY KEY declared', '! duplicate rows cannot be told apart', '→ add a key: natural, or a surrogate id'],
      metrics: { redundancy: 60, duplication: 12, normalForm: 0, entities: 1 },
      scene: { view: 'missingkeys', note: 'A table with no key row — duplicate, unaddressable rows.' },
    },
    { // 4 — OVER-NESTING & PREMATURE PHYSICAL
      chapter: 'tradeoff', short: 'Over-nesting & premature physical',
      title: 'Over-nesting and premature tuning',
      body: [
        `Two smells travel together on the physical side. <span class="term">Over-nesting</span> buries data in deeply nested documents — a customer holding orders holding line-items holding product snapshots — so that reading a single price means descending four levels, and any field you want to query independently is trapped inside its parent.`,
        `<span class="term">Premature physical tuning</span> is choosing indexes, partitioning or a storage engine before the logical model is even settled. You optimize for queries that may change and bake in decisions that are expensive to unwind. Settle the <em>entities and relationships</em> first; nest only as deep as access patterns truly need, and tune last.`,
      ],
      callout: { kind: 'tip', text: 'Depth and indexes are physical choices. Make them last, from real access patterns — not up front, from guesses about how the data will be read.' },
      changes: ['! documents nested 4+ levels deep', '! indexes and partitions chosen before the model settled', '→ flatten to access patterns; tune last'],
      metrics: { redundancy: 50, duplication: 10, normalForm: 1, entities: 1 },
      scene: { view: 'overnesting', note: 'A structure nested level upon level, tuned before the model settled — flagged.' },
    },
    { // 5 — THE HEALTHY SHAPE
      chapter: 'recap', short: 'The healthy shape',
      title: 'What good looks like',
      body: [
        `The cure for every smell is the same clean shape: <b>clear entities</b> (one table is about one kind of thing), a <b>key on every table</b> (each row has an identity), <b>controlled redundancy</b> (each fact lives in one place and is referenced), and <b>physical choices last</b> (types, indexes and nesting decided from real access patterns, not guesses).`,
        `Here that shape is a plain <code>Customer</code> and <code>Order</code>, each keyed, joined by a single foreign key — no repeated facts, no god table, no orphan rows. It is less clever than a forty-column mega-table, and that is exactly the point: a model you can read is a model you can keep correct as it grows.`,
      ],
      callout: { kind: 'insight', text: 'Clear entities · a key per table · controlled redundancy · physical choices last. Boring, legible models are the ones that survive.' },
      metrics: { redundancy: 5, duplication: 0, normalForm: 3, entities: 2 },
      scene: { view: 'recap', note: 'Clean Customer 1:N Order — keyed, normalized, clear entities.' },
    },
  ],
};
