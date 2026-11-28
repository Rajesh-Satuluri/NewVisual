/* content/normalization-lab.js — the "Normalization Lab" lesson, as DATA.
   Same shape as content/relational-model.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/normalization-lab-scene.js. This is a STEPPED
   lab — one fixed snapshot per step — rendered through the shared course shell.

   A single wide, redundant orders table is split step by step into clean
   related tables, and the update / insert / delete anomalies disappear as it
   reaches third normal form. */

export const normalizationLabLesson = {
  id: 'normalization-lab',
  title: 'Normalization Lab',
  group: 'Interactive Labs',
  summary: 'Watch a single wide, redundant orders table split step by step into clean related tables — and watch the update, insert and delete anomalies disappear as it reaches third normal form.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'duplication'],
  legend: ['write'],
  goals: [
    { text: 'One wide table repeats the same facts on every line', step: 0 },
    { text: 'Redundancy breeds update, insert and delete anomalies', step: 1 },
    { text: '1NF: atomic cells — one value per cell, a key per row', step: 2 },
    { text: '2NF: split out product facts that depend on part of the key', step: 3 },
    { text: '3NF: split out customer facts that depend on another column', step: 4 },
    { text: 'Each fact lives in exactly one place — anomalies gone', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'One wide table',
      title: 'Everything in one table',
      body: [
        `Here is where most schemas begin: one wide <code>orders</code> table that holds <em>everything</em>. Every line carries the <span class="term">customer</span>’s name and email <b>and</b> the <span class="term">product</span>’s name and price, right next to the <code>qty</code> that line actually records.`,
        `It reads beautifully — one row tells you the whole story of an order, no joins required. But look down the columns: the same <code>customer_email</code> and the same <code>product_name</code> / <code>price</code> are copied onto <em>every</em> row that mentions them. Convenient to read, a liability to maintain.`,
      ],
      callout: { kind: 'insight', text: 'A wide table trades write-time discipline for read-time convenience. The same fact, re-typed on every row, is the debt you are taking on.' },
      metrics: { normalForm: 'UNF', redundancy: 78, anomalies: 3, duplication: 12 },
      scene: { view: 'unnormalized', note: 'One wide orders table: customer and product facts repeated on every line.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Anomalies',
      title: 'Redundancy breeds anomalies',
      body: [
        `Duplicated data is not just wasteful — it is <em>incorrect waiting to happen</em>. Three classic <span class="term">anomalies</span> fall straight out of this one table.`,
        `<b>Update anomaly:</b> a customer changes their email, and now you must rewrite it in <em>every</em> row they appear in — miss one and the table disagrees with itself. <b>Insert anomaly:</b> you cannot record a new product until someone orders it, because a product only exists here as a side-effect of an order row. <b>Delete anomaly:</b> delete a customer’s last order and you have silently erased the customer too — their name and email lived nowhere else.`,
      ],
      callout: { kind: 'warn', text: 'Update · insert · delete anomalies are three faces of one disease: a fact stored in more than one place, or stored only as a by-product of another.' },
      changes: ['! UPDATE anomaly — email copied across rows', '! INSERT anomaly — no product without an order', '! DELETE anomaly — last order erases the customer'],
      metrics: { normalForm: 'UNF', redundancy: 78, anomalies: 3, duplication: 12 },
      scene: { view: 'anomalies', note: 'The same wide table, now with the three anomalies pointed out on it.' },
    },
    { // 2 — 1NF
      chapter: 'technique', short: '1NF',
      title: 'First normal form: atomic cells',
      body: [
        `Normalization is a sequence of small, reversible splits, each removing one kind of duplication. The first rung is <span class="term">first normal form</span>: every cell holds exactly <b>one atomic value</b>, there are <b>no repeating groups</b> (no <code>product1, product2, product3</code> columns, no comma-packed lists), and every row is addressable by a <b>key</b>.`,
        `Our table is already close — but 1NF is the promise that makes the later steps possible. Once each cell is a single value under a stable key, we can reason about which column <em>depends</em> on which, and start moving facts to where they belong.`,
      ],
      callout: { kind: 'tip', text: 'One value per cell, no repeating groups, a key on every row. 1NF buys you nothing on its own — it is the floor the other forms stand on.' },
      changes: ['~ one value per cell', '~ no repeating groups', '+ key per row'],
      metrics: { normalForm: '1NF', redundancy: 70, anomalies: 3, duplication: 10 },
      scene: { view: '1nf', note: 'The table flagged 1NF: atomic cells, a key per row — still one table.' },
    },
    { // 3 — 2NF
      chapter: 'technique', short: '2NF',
      title: 'Second normal form: whole-key dependencies',
      body: [
        `Now we look at <span class="term">dependencies</span>. The natural key of an order line is composite — think <code>(order_id, product_id)</code>. A <span class="term">partial dependency</span> is any non-key column that depends on only <em>part</em> of that key: <code>product_name</code> and <code>price</code> depend on <code>product_id</code> alone, not on the whole key.`,
        `<span class="term">Second normal form</span> removes partial dependencies. The product facts move out into their own <code>products</code> table, keyed by <code>product_id</code>, and the orders table keeps just a <b>foreign key</b> <code>product_id</code> pointing at it. A product now exists on its own — the insert anomaly for products is gone, and each price is stored once.`,
      ],
      callout: { kind: 'insight', text: '2NF: no non-key column may depend on only part of a composite key. Lift those columns into the table of the thing they actually describe.' },
      changes: ['+ products(product_id, name, price)', '+ FK orders.product_id → products.product_id', '~ product facts stored once'],
      metrics: { normalForm: '2NF', redundancy: 40, anomalies: 2, duplication: 5 },
      scene: { view: '2nf', note: 'Two tables now: orders (left) and products (right), joined by a foreign key.' },
    },
    { // 4 — 3NF
      chapter: 'technique', short: '3NF',
      title: 'Third normal form: no transitive deps',
      body: [
        `One redundancy is left: <code>customer_name</code> and <code>customer_email</code> still ride along in every order row. They do not depend on part of the key — they depend on <code>customer_id</code>, which is itself a non-key column. That is a <span class="term">transitive dependency</span>: key → <code>customer_id</code> → email.`,
        `<span class="term">Third normal form</span> removes it. The customer facts move into a <code>customers</code> table keyed by <code>customer_id</code>, and orders keeps a foreign key to it. We now have <b>three clean tables</b> — <code>customers</code>, <code>orders</code>, <code>products</code> — and an order row is just its own facts plus two keys.`,
      ],
      callout: { kind: 'insight', text: '3NF: no non-key column may depend on another non-key column. Chase every such chain out into its own table and reference it by key.' },
      changes: ['+ customers(customer_id, name, email)', '+ FK orders.customer_id → customers.customer_id', '~ orders = order_id · customer_id · product_id · qty'],
      metrics: { normalForm: '3NF', redundancy: 3, anomalies: 0, duplication: 0 },
      scene: { view: '3nf', note: 'Three tables: customers · orders · products, orders in the middle linking both.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The payoff',
      title: 'Each fact in exactly one place',
      body: [
        `There is an old mnemonic for 3NF: every non-key attribute depends on <b>the key, the whole key, and nothing but the key</b> — 1NF gives you the key, 2NF the <em>whole</em> key, 3NF <em>nothing but</em> the key. Read our three tables back and each clause holds, column by column.`,
        `The payoff is that every fact now lives in <em>exactly one place</em>: change a customer’s email once, add a product with no orders, delete the last order without losing anyone. The anomalies are gone. The cost is <b>joins</b> — to reassemble the original wide row you now stitch three tables back together. When reads dominate and that join cost bites, <span class="term">denormalization</span> is the deliberate reverse: copy a fact back in, on purpose, and own the redundancy with your eyes open.`,
      ],
      callout: { kind: 'insight', text: 'The key, the whole key, and nothing but the key. Normalize for correctness; denormalize, deliberately, only when read speed demands it.' },
      metrics: { normalForm: '3NF', redundancy: 3, anomalies: 0, duplication: 0 },
      scene: { view: 'recap', note: 'The 3NF layout — atomic, whole-key, no transitive deps — each fact stored once.' },
    },
  ],
};
