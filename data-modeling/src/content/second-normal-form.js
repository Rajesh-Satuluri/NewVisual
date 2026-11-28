/* content/second-normal-form.js — "Second Normal Form (2NF)", as DATA.
   Each step is { chapter, short, title, body[], callout, changes?, metrics,
   scene }. `scene` is a view-snapshot consumed by db/second-normal-form-scene.js.

   The second rung: remove partial dependencies — every non-key attribute must
   depend on the WHOLE composite key, not just part of it. The hero move splits
   the part-dependent attributes into their own table joined by a foreign key. */

export const secondNormalFormLesson = {
  id: 'second-normal-form',
  title: 'Second Normal Form (2NF)',
  group: 'ER & Relational Design',
  summary: '2NF removes partial dependencies: when a table has a composite key, every non-key attribute must depend on the whole key, not just part of it. Attributes that depend on only part of the key move to their own table.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'duplication'],
  legend: [],
  goals: [
    { text: 'A composite key is a key made of two or more columns', step: 0 },
    { text: 'A partial dependency rides on only part of the key', step: 1 },
    { text: 'Split the part-dependent attributes into their own table', step: 2 },
    { text: 'Non-key attributes must depend on the whole key', step: 3 },
    { text: 'Only composite keys can violate 2NF', step: 4 },
    { text: 'No partial dependencies is the 2NF rule', step: 5 },
  ],

  steps: [
    { // 0 — COMPOSITE KEY
      chapter: 'setup', short: 'Composite key',
      title: 'A table keyed on two columns',
      body: [
        `Second normal form only has something to say once a table has a <span class="term">composite key</span> — a primary key made of more than one column. Our example is <code>order_lines</code>, the line items on orders. A line is identified by <em>which order</em> and <em>which product</em>, so the key is the pair <code>(order_id, product_id)</code>; neither column alone is unique.`,
        `Alongside the key the table carries <code>qty</code>, <code>product_name</code> and <code>product_price</code>. We are assuming it is already in 1NF: every cell is atomic and every row is keyed. It looks tidy. The trouble is not visible yet — it hides in <em>which</em> part of that two-column key each attribute actually depends on.`,
      ],
      callout: { kind: 'tip', text: 'A composite key identifies a row by a combination. order_lines needs both order_id and product_id — one line per product per order.' },
      metrics: { normalForm: '1NF', redundancy: 55, anomalies: 2, duplication: 8 },
      scene: { view: 'table', note: 'order_lines keyed on the pair (order_id, product_id), carrying qty, product_name and product_price.' },
    },
    { // 1 — PARTIAL DEPENDENCY
      chapter: 'problem', short: 'Partial dependency',
      title: 'Some columns depend on part of the key',
      body: [
        `Ask the key question of each non-key column: <em>what does it actually depend on?</em> <code>qty</code> depends on the <b>whole</b> key — the quantity is specific to this product <em>on this order</em>. But <code>product_name</code> and <code>product_price</code> depend only on <code>product_id</code>. The product is called "Widget" and costs $9 regardless of which order the line belongs to.`,
        `That is a <span class="term">partial dependency</span>: a non-key attribute determined by only <em>part</em> of a composite key. Its consequence is duplication. Every line that sells the same product repeats its name and price, so a thousand order lines for one product store that price a thousand times. Change the price and you must update every copy; miss one and the data now contradicts itself.`,
      ],
      callout: { kind: 'warn', text: 'product_name and product_price depend on product_id alone, not the full key. The same product fact is copied into every line that sells it.' },
      changes: ['! product_name ← product_id only (partial)', '! product_price ← product_id only (partial)'],
      metrics: { normalForm: '1NF', redundancy: 55, anomalies: 2, duplication: 8 },
      scene: { view: 'partial', note: 'product_name and product_price depend only on product_id — a partial dependency that repeats in every line.' },
    },
    { // 2 — SPLIT IT OUT
      chapter: 'technique', short: 'Split it out',
      title: 'Move the partial attributes to their own table',
      body: [
        `The fix is the same decomposition you met at 1NF, now aimed at the partial dependency. The attributes that depend on <code>product_id</code> move to a new <code>products</code> table keyed on <code>product_id</code>: <code>products(product_id, product_name, product_price)</code>. Each product is stored <em>once</em>. The <code>order_lines</code> table keeps <code>(order_id, product_id)</code> and <code>qty</code>, with <code>product_id</code> now a <span class="term">foreign key</span> into products.`,
        `The relationship is <b>1:N</b> — one product, many order lines — carried by <code>order_lines.product_id → products.product_id</code>. To rebuild the original wide row you join the two tables back. But now a price lives in exactly one place: update it once and every line reflects it, add a product that no one has ordered yet, delete the last line without erasing the product. The anomalies are gone.`,
      ],
      callout: { kind: 'insight', text: 'Partial dependency → its own table. products holds each product once; order_lines points at it by foreign key. One fact, one place.' },
      changes: ['+ products table (product_id, product_name, product_price)', '+ FK order_lines.product_id → products.product_id', '~ 1:N relationship'],
      metrics: { normalForm: '2NF', redundancy: 10, anomalies: 0, duplication: 0 },
      scene: { view: '2nf', note: 'order_lines 1:N products — the partial attributes split out and joined by a foreign key.' },
    },
    { // 3 — THE RULE
      chapter: 'technique', short: 'The rule',
      title: 'Non-key attributes depend on the WHOLE key',
      body: [
        `State the rule cleanly. A table is in <span class="term">second normal form</span> when it is in 1NF <em>and</em> every non-key attribute depends on the <b>whole</b> primary key, not on any proper subset of it. After the split, the only non-key attribute left in <code>order_lines</code> is <code>qty</code> — and <code>qty</code> genuinely depends on both <code>order_id</code> and <code>product_id</code> together. The table is in 2NF.`,
        `In functional-dependency terms, 2NF forbids any FD whose left side is a <em>proper part</em> of the key. The question to carry into every table is simply: "does this column need the entire key to pin it down, or just a piece?" If just a piece, that piece and the column belong in a table of their own.`,
      ],
      callout: { kind: 'insight', text: '2NF in one line: no non-key attribute may depend on part of a key. qty needs both key columns, so it stays — product facts did not, so they left.' },
      metrics: { normalForm: '2NF', redundancy: 10, anomalies: 0, duplication: 0 },
      scene: { view: 'rule', note: 'qty depends on the whole key (order_id, product_id) — the only non-key attribute left, and legitimately so.' },
    },
    { // 4 — COMPOSITE ONLY
      chapter: 'tradeoff', short: 'Composite only',
      title: 'Only composite keys can violate 2NF',
      body: [
        `Here is the reassuring corollary. A partial dependency means "depends on <em>part</em> of the key" — and a key made of a single column has no parts. So a table whose primary key is one column is <b>automatically in 2NF</b> the instant it reaches 1NF. There is simply nothing for the rule to catch.`,
        `This is why 2NF only bites on tables with composite keys: junction tables, line items, anything keyed on a combination. If every table in your schema has a single surrogate key, you will clear 2NF for free — but you are not done, because <code>product_name</code> depending on a non-key column would still be a <span class="term">transitive dependency</span>, which is <b>3NF</b>'s job. 2NF closes one door; the next lesson closes the other.`,
      ],
      callout: { kind: 'tip', text: 'Single-column key ⇒ already 2NF — a lone column has no part to depend on. 2NF is a rule about composite keys only.' },
      metrics: { normalForm: '2NF', redundancy: 10, anomalies: 0, duplication: 0 },
      scene: { view: 'note', note: 'A single-column primary key has no part to depend on, so it satisfies 2NF automatically.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'No partial dependencies',
      body: [
        `Second normal form adds one demand on top of 1NF: with a composite key, every non-key attribute must depend on the <b>whole</b> key, never on just part of it. Attributes that depend on a fragment are a <span class="term">partial dependency</span>, and they get lifted into their own table keyed on that fragment, joined back by a foreign key — the same split-and-link move, aimed at a new target.`,
        `The payoff is the end of one species of duplication: a fact that belonged to the product no longer rides along on every order line. What remains is the <em>other</em> species — a non-key column depending on another non-key column, the transitive dependency. Removing it is the job of <b>3NF</b>, the next rung, where the ladder finishes the attack on redundancy that 2NF began.`,
      ],
      callout: { kind: 'insight', text: 'Whole key, not part of it. Partial dependencies split out, duplication gone — with transitive dependencies left for 3NF.' },
      metrics: { normalForm: '2NF', redundancy: 10, anomalies: 0, duplication: 0 },
      scene: { view: 'recap', note: 'order_lines 1:N products — no partial dependencies, each product fact stored once.' },
    },
  ],
};
