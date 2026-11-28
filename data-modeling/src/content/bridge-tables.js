/* content/bridge-tables.js — the "Bridge Tables" lesson, as DATA. Same shape as
   content/third-normal-form.js. `scene` is a view-snapshot consumed by
   db/bridge-tables-scene.js.

   A bridge (associative) table resolves a many-to-many between a fact and a
   dimension, or a multi-valued dimension. It can carry a weighting/allocation
   factor so measures split cleanly instead of double-counting. */

export const bridgeTablesLesson = {
  id: 'bridge-tables',
  title: 'Bridge Tables',
  group: 'Dimensional Modeling',
  summary: 'A bridge table resolves a many-to-many between a fact and a dimension, or a multi-valued dimension. An optional weighting factor on the bridge splits a measure across members so totals do not double-count.',
  minutes: 8,
  level: 'advanced',
  metrics: ['cardinality', 'dimensions', 'facts', 'fks'],
  legend: [],
  goals: [
    { text: 'A star assumes each fact row meets a dimension exactly once', step: 0 },
    { text: 'Real relationships are often many-to-many — joint accounts, multiple diagnoses', step: 1 },
    { text: 'Joining a many-to-many directly double-counts the measure', step: 2 },
    { text: 'A bridge table sits between fact and dimension with FKs to both', step: 3 },
    { text: 'A weighting factor on the bridge allocates the measure cleanly', step: 4 },
    { text: 'Bridges resolve multi-valued dimensions without double-counting', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'The star assumes 1:N',
      title: 'A star assumes one fact meets one member',
      body: [
        `A clean star schema rests on a quiet assumption: each fact row relates to <b>exactly one</b> member of each dimension. One sale, one customer. One shipment, one warehouse. The fact carries a single foreign key per dimension, the join is <span class="term">one-to-many</span>, and <code>SUM(amount) GROUP BY customer</code> is simply correct.`,
        `Here is that happy case: a <code>fact_balance</code> row points at one <code>dim_account</code> row via <code>account_key</code>. As long as every account has exactly one owner, slicing balance by customer is a straightforward join. The trouble starts the moment that "exactly one" stops being true.`,
      ],
      callout: { kind: 'insight', text: 'The star\'s simplicity is purchased with an assumption — one fact row, one dimension member. Bridges are what you build when reality refuses that assumption.' },
      metrics: { cardinality: '1:N', dimensions: 1, facts: 1, fks: 1 },
      scene: { view: 'many-to-many', note: 'fact_balance → dim_account by account_key — the star\'s assumed one-to-many, before any joint owners.' },
    },
    { // 1 — PROBLEM many-to-many
      chapter: 'problem', short: 'Many-to-many',
      title: 'One account, many customers',
      body: [
        `A <b>joint account</b> breaks the assumption: one bank account is owned by two (or three) customers at once. Now <code>dim_account</code> and <code>dim_customer</code> are in a <span class="term">many-to-many</span> relationship — an account has many owners, and a customer has many accounts. There is no single <code>customer_key</code> to put on the account, because there is no single customer.`,
        `The same shape appears everywhere: one hospital visit with several <b>diagnoses</b>, one product in several <b>categories</b>, one sales call touching several <b>opportunities</b>. In each, a fact (or a dimension) connects to <em>many</em> members of another dimension at once. You cannot model that with a single foreign key, and forcing one loses information.`,
      ],
      callout: { kind: 'warn', text: 'A single foreign key can only point at one member. The instant a fact relates to several members of a dimension, the plain star cannot represent it.' },
      changes: ['~ account 500 owned by customers 42 AND 43', '! no single customer_key fits on the account'],
      metrics: { cardinality: 'M:N', dimensions: 2, facts: 1, fks: 1 },
      scene: { view: 'many-to-many', note: 'Account 500 has two owners — dim_account and dim_customer are many-to-many.' },
    },
    { // 2 — PROBLEM double-count
      chapter: 'problem', short: 'Double count',
      title: 'Join it naively and totals double',
      body: [
        `Suppose you flatten the relationship — list each owner against the account and join. A $1,000 balance on a joint account now appears <b>once per owner</b>: the join <span class="term">fans out</span> the single fact row into two, and <code>SUM(balance)</code> reports <b>$2,000</b> where only $1,000 exists. Roll up all customers and the bank appears to hold twice the money it does.`,
        `This <span class="term">double-counting</span> is the signature failure of a many-to-many joined as if it were one-to-many. The fact itself is fine — $1,000 is $1,000 — but the fan-out of the join multiplies it by the number of related members. Any additive measure summed across the many side is silently inflated.`,
      ],
      callout: { kind: 'warn', text: 'Fan-out is the enemy: joining one fact row to N dimension members repeats the measure N times. Sum it and your total is N× too large.' },
      changes: ['~ $1,000 balance joined to 2 owners', '! SUM(balance) = $2,000 — double-counted'],
      metrics: { cardinality: 'M:N', dimensions: 2, facts: 1, fks: 1 },
      scene: { view: 'double-count', note: 'Joining the joint account to both owners fans $1,000 into $2,000 — the measure double-counts.' },
    },
    { // 3 — TECHNIQUE bridge
      chapter: 'technique', short: 'The bridge',
      title: 'A bridge table between the two',
      body: [
        `The resolution is a <span class="term">bridge table</span> (an associative table) that sits <b>between</b> the account and the customer. <code>bridge_account_owner</code> holds one row per (account, customer) pairing, with a <b>foreign key to each side</b>: <code>account_key</code> and <code>customer_key</code>. The joint account contributes two bridge rows — one per owner — and the many-to-many is now two clean one-to-many joins through the middle.`,
        `The fact joins to the account; the account joins through the bridge to its customers. Each real-world pairing is an explicit row you can see, count and attribute. This is the same pattern as a junction table in OLTP normalization, re-cast for the star: the bridge is where the "many" on both sides finally has somewhere to live.`,
      ],
      callout: { kind: 'insight', text: 'A bridge resolves M:N into two 1:N joins. One row per pairing, a foreign key to each side — the relationship becomes data you can query.' },
      changes: ['+ bridge_account_owner(account_key FK, customer_key FK)', '~ M:N becomes fact → account → bridge → customer'],
      metrics: { cardinality: 'M:N', dimensions: 2, facts: 1, fks: 2 },
      scene: { view: 'bridge', note: 'bridge_account_owner carries an FK to account and an FK to customer — one row per ownership pairing.' },
    },
    { // 4 — TECHNIQUE weighting
      chapter: 'technique', short: 'Weight it',
      title: 'A weighting factor splits the measure',
      body: [
        `The bridge solves the structure but not yet the arithmetic — two bridge rows still fan $1,000 into $2,000 if you sum blindly. So the bridge carries an extra column: a <span class="term">weighting factor</span> (allocation factor) that says what fraction of the measure belongs to each member. Two equal owners each get <code>0.5</code>; the weights on any pairing sum to <b>1.0</b>.`,
        `Now you multiply: <code>SUM(balance × weight)</code> attributes $500 to each owner and totals back to exactly $1,000. The double-count is gone, and you can still report per-customer balances that add up to the truth. Where no allocation makes sense (you genuinely want the full $1,000 against every owner for an "impact" report), you simply omit the weight — the choice is explicit, not accidental.`,
      ],
      callout: { kind: 'tip', text: 'Weights on a bridge sum to 1.0 per group. SUM(measure × weight) allocates cleanly; leave the weight out only when you deliberately want the un-split total.' },
      changes: ['+ bridge.weight (0.5 + 0.5 = 1.0)', '~ SUM(balance × weight) = $1,000 — no double-count'],
      metrics: { cardinality: 'M:N', dimensions: 2, facts: 1, fks: 2 },
      scene: { view: 'weight', note: 'The bridge carries weight = 0.5 per owner; SUM(balance × weight) totals back to $1,000.' },
    },
    { // 5 — RECAP (multi-valued dimension + summary)
      chapter: 'recap', short: 'Summary',
      title: 'Bridges, with and without weights',
      body: [
        `A bridge table resolves a <b>many-to-many</b> between a fact and a dimension, or a <b>multi-valued dimension</b>, by sitting in the middle with a foreign key to each side. One hospital visit with several diagnoses, one account with several owners, one product in several categories — all the same shape, all resolved by one row per pairing in the bridge.`,
        `Add a <b>weighting factor</b> when an additive measure must be split so totals stay honest; omit it when you want the un-allocated impact view. Either way the bridge turns an un-representable relationship into explicit, queryable rows — and keeps <code>SUM</code> from lying about how much there really is.`,
      ],
      callout: { kind: 'insight', text: 'Bridge = M:N resolved into two 1:N joins, with an optional weight to split the measure. Structure first, then the arithmetic that stops double-counting.' },
      metrics: { cardinality: 'M:N', dimensions: 2, facts: 1, fks: 2 },
      scene: { view: 'recap', note: 'fact → account → bridge (weight) → customer — a many-to-many resolved, measures allocated.' },
    },
  ],
};
