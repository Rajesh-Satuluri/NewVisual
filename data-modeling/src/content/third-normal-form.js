/* content/third-normal-form.js — the "Third Normal Form (3NF)" lesson, as DATA.
   Same shape as content/data-model-basics.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/third-normal-form-scene.js and rendered through the shared
   course shell.

   This is a CONCEPTUAL lesson — the second rung after 2NF on the normalization
   ladder (…2NF → 3NF → BCNF → 4NF/5NF). It is distinct from the interactive
   'normalization-lab': here one idea, transitive dependency, is drawn out in a
   fixed snapshot per step. */

export const thirdNormalFormLesson = {
  id: 'third-normal-form',
  title: 'Third Normal Form (3NF)',
  group: 'ER & Relational Design',
  summary: '3NF removes transitive dependencies — a non-key attribute must not depend on another non-key attribute. It is the normal form most operational schemas are designed to.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'duplication'],
  legend: [],
  goals: [
    { text: 'A transitive dependency hides a second entity inside one table', step: 0 },
    { text: 'Redundant, derived facts breed update anomalies', step: 1 },
    { text: '3NF decomposes the chain into one table per determinant', step: 2 },
    { text: 'The rule: depend on the key, the whole key, and nothing but the key', step: 3 },
    { text: '3NF is the default target for transactional (OLTP) schemas', step: 4 },
    { text: 'No non-key attribute depends on another non-key attribute', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'A transitive chain',
      title: 'A non-key depends on a non-key',
      body: [
        `By the time a table reaches <span class="term">second normal form</span>, every non-key attribute depends on the <em>whole</em> key. 3NF asks a subtler question: do any of those non-key attributes depend on <em>each other</em>? Here is an <code>orders</code> table keyed on <code>order_id</code> that also carries <code>customer_id</code>, <code>customer_city</code> and <code>customer_zip</code>.`,
        `Look at the chain. <code>order_id</code> determines <code>customer_id</code>, and <code>customer_id</code> in turn determines <code>customer_city</code> and <code>customer_zip</code>. The city and zip do not describe the <em>order</em> at all — they describe the <b>customer</b>. That indirect link, <code>key → non-key → non-key</code>, is a <span class="term">transitive dependency</span>.`,
      ],
      callout: { kind: 'insight', text: 'A transitive dependency is a second entity hiding in plain sight: customer facts, stored in an orders row because an order happens to name a customer.' },
      metrics: { normalForm: '2NF', redundancy: 64, anomalies: 3, duplication: 9 },
      scene: { view: 'table', note: 'orders keyed on order_id — but customer_city and customer_zip depend on customer_id, not order_id.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Update anomaly',
      title: 'Change one fact, update many rows',
      body: [
        `Because a customer places many orders, that customer’s city and zip are <b>copied onto every one of their order rows</b>. The same fact — “customer 42 lives in Denver, 80202” — is re-typed again and again. The table is in 2NF and still drowning in redundancy.`,
        `Now the customer moves. To keep the data honest you must find and rewrite <em>every</em> order row that mentions them; miss one and the table flatly contradicts itself. That is an <span class="term">update anomaly</span>, and its siblings follow: you cannot record a customer’s address until they place an order (<em>insert anomaly</em>), and deleting their last order erases the address entirely (<em>delete anomaly</em>).`,
      ],
      callout: { kind: 'warn', text: 'The city and zip are not facts about the order. Storing them there means one real-world change demands many row-level writes — and any missed row is silent corruption.' },
      changes: ['~ customer_city / customer_zip repeated per order', '! one move → N rows to rewrite'],
      metrics: { normalForm: '2NF', redundancy: 78, anomalies: 3, duplication: 14 },
      scene: { view: 'problem', note: 'customer_city and customer_zip depend on customer_id — the transitive attributes repeat and drift.' },
    },
    { // 2 — TECHNIQUE (decompose)
      chapter: 'technique', short: 'Split it out',
      title: 'Move the transitive attributes to their own table',
      body: [
        `The fix is <span class="term">decomposition</span>. Pull the transitively-dependent columns out into a new <code>customers</code> table keyed on <code>customer_id</code>, where <code>customer_city</code> and <code>customer_zip</code> finally sit beside the thing they actually describe. In <code>orders</code>, <code>customer_id</code> stays behind as a <b>foreign key</b>.`,
        `Each customer fact now lives in exactly <em>one</em> place. The move becomes a single-row update in <code>customers</code>; a new customer can be recorded before any order exists; deleting an order touches no customer data. The join that reunites them — <code>orders.customer_id → customers.customer_id</code> — is cheap and indexed. The chain is broken, and the table is in <span class="term">third normal form</span>.`,
      ],
      callout: { kind: 'tip', text: 'Decomposition is lossless: the foreign-key join rebuilds the original row on demand, so nothing is lost except the redundancy.' },
      changes: ['+ customers(customer_id PK, customer_city, customer_zip)', '~ orders.customer_id → customers.customer_id (FK)'],
      metrics: { normalForm: '3NF', redundancy: 9, anomalies: 0, duplication: 1 },
      scene: { view: '3nf', note: 'orders and customers, split on customer_id — each customer fact stored exactly once.' },
    },
    { // 3 — TECHNIQUE (the rule)
      chapter: 'technique', short: 'The rule',
      title: 'The key, the whole key, and nothing but the key',
      body: [
        `The three normal forms compress into one mnemonic about what every non-key attribute must depend on. <b>1NF</b> — depend on <span class="term">the key</span> (atomic values, one per cell). <b>2NF</b> — depend on <span class="term">the whole key</span> (no dependence on just part of a composite key). <b>3NF</b> — depend on <span class="term">nothing but the key</span> (no dependence on another non-key attribute).`,
        `3NF owns that last clause. Formally: for every functional dependency <code>X → A</code> where <code>A</code> is non-key, <code>X</code> must contain a key — no non-key determinant allowed. If an attribute can be derived from another non-key column, it does not belong in this table; it belongs in the table keyed by that determinant.`,
      ],
      callout: { kind: 'insight', text: '“Depend on the key, the whole key, and nothing but the key, so help me Codd.” 3NF is the clause about nothing but the key.' },
      metrics: { normalForm: '3NF', redundancy: 9, anomalies: 0, duplication: 1 },
      scene: { view: 'rule', note: 'The key · the whole key · nothing but the key — 1NF, 2NF, 3NF in one line.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'The usual target',
      title: '3NF is the default for OLTP',
      body: [
        `For transactional systems — the <span class="term">OLTP</span> workloads that take orders, move money and update records all day — 3NF is the pragmatic stopping point. It eliminates the redundancy that causes anomalies while keeping the schema natural to write against, and in practice a 3NF design is almost always <b>BCNF</b> too, so the stricter form rarely adds work.`,
        `The cost is joins: a query that wants the customer’s city alongside the order must now reunite the two tables. On indexed foreign keys that cost is small and predictable, and it is the right trade for data you write far more carefully than you read. <em>Analytical</em> stores make the opposite bet — deliberately de-normalizing into star schemas so reads need no joins — but that is a reporting decision, not a licence to let your source-of-truth tables rot.`,
      ],
      callout: { kind: 'tip', text: 'Normalize your system of record to 3NF; de-normalize copies downstream for reporting. Never confuse the two.' },
      metrics: { normalForm: '3NF', redundancy: 9, anomalies: 0, duplication: 1 },
      scene: { view: 'target', note: '3NF: the operational default — redundancy gone, writes clean, one indexed join to rejoin.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'No transitive dependencies',
      body: [
        `Third normal form closes the gap 2NF leaves open: a non-key attribute may not depend on another non-key attribute. Spot the <code>key → non-key → non-key</code> chain, decompose on the middle determinant, and leave a foreign key behind. Every fact then lives in exactly one row, and the update, insert and delete anomalies that plagued the wide table are gone by construction.`,
        `<code>orders</code> now holds only order facts and points at <code>customers</code>, which holds only customer facts — a clean <b>N:1</b> relationship carried by a foreign key. This is the shape most operational schemas settle at. The next lesson, <b>BCNF</b>, sharpens the rule for the one awkward case 3NF still permits: when candidate keys overlap.`,
      ],
      callout: { kind: 'insight', text: 'Depend on nothing but the key. One determinant, one table, one copy of every fact — 3NF in a sentence.' },
      metrics: { normalForm: '3NF', redundancy: 9, anomalies: 0, duplication: 1 },
      scene: { view: 'recap', note: 'orders N:1 customers — the transitive chain decomposed, 1NF · 2NF · 3NF all satisfied.' },
    },
  ],
};
