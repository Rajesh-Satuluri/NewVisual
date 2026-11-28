/* content/embedding-vs-referencing.js — "Embedding vs Referencing", the central
   document-modeling decision, as DATA. Embed what is owned, bounded and read
   together; reference what is shared, unbounded or large. Its scene lives on the
   NoSQL canvas: an embedded sub-doc vs a ref pointer with an arrow to a second doc. */

export const embeddingVsReferencingLesson = {
  id: 'embedding-vs-referencing',
  title: 'Embedding vs Referencing',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'Every document model faces one choice per relationship: embed the related entity inside the document, or reference it by id. Embed what is owned, bounded and read-together; reference what is shared, unbounded or large.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['requests', 'duplication', 'collections', 'nesting'],
  legend: [],
  goals: [
    { text: 'Every relationship in a document model is either embedded or referenced', step: 0 },
    { text: 'Embedding nests the related entity: one read, but it duplicates shared data', step: 1 },
    { text: 'Referencing stores a pointer id: no duplication, but an extra round-trip', step: 2 },
    { text: 'The rule: embed owned+bounded+read-together, reference shared/unbounded/large', step: 3 },
    { text: 'Hybrid: embed a small summary and reference the full document', step: 4 },
    { text: 'Pick embed or reference per relationship from ownership and access', step: 5 },
  ],

  steps: [
    { // 0 SETUP — the choice
      chapter: 'setup', short: 'One choice',
      title: 'Embed it, or point to it',
      body: [
        `Once you store an aggregate as a document, every relationship it has forces one decision: do you <span class="term">embed</span> the related entity — nest it as a sub-object or array right inside the document — or <span class="term">reference</span> it, storing only its id and fetching it separately? This single choice, made per relationship, is the heart of document modeling.`,
        `Consider an <code>order</code> that has a <code>customer</code> and a list of <code>items</code>. Embedding puts the customer and items <b>inside</b> the order document; referencing stores <code>customer_id</code> and <code>item_ids</code> and leaves the real records elsewhere. Both are valid — they trade off differently, and the data's shape and access pattern decide which wins.`,
      ],
      callout: { kind: 'insight', text: 'Embed vs reference is decided per relationship, not per database. The same app embeds some relationships and references others.' },
      metrics: { requests: 1, duplication: 0, collections: 1, nesting: 2 },
      scene: { view: 'choice', note: 'One order with a customer and items: embed them inside the document, or reference them by id and fetch separately.' },
    },
    { // 1 TECHNIQUE — embed
      chapter: 'technique', short: 'Embed: one read',
      title: 'Embedding: everything in one read',
      body: [
        `<b>Embedding</b> nests the related data directly inside the parent. The order carries its <code>items</code> array and its <code>shipping_address</code> sub-object in the same document, so loading the order returns everything it needs in a <b>single read</b> — no join, no second round-trip. When the app always reads the order <em>with</em> these parts, embedding matches the access pattern exactly.`,
        `The cost is <span class="term">duplication</span>. If a product's name and price are embedded in every order that bought it, that product is copied into a thousand documents. The data is fast to read but redundant to store, and a change to the shared fact — a price correction — must now rewrite every copy. Embedding duplicates whatever it nests.`,
      ],
      callout: { kind: 'tip', text: 'Embed when the parts are read together and owned by the parent. One read is the payoff; duplication of shared facts is the price.' },
      changes: ['+ items & address embedded in the order', '~ one read, zero joins', '! shared product data duplicated per order'],
      metrics: { requests: 1, duplication: 3, collections: 1, nesting: 3 },
      scene: { view: 'embed', note: 'The order with items and address embedded — one read returns the whole document, but shared product data is duplicated.' },
    },
    { // 2 TECHNIQUE — reference
      chapter: 'technique', short: 'Reference: a pointer',
      title: 'Referencing: a pointer, fetched later',
      body: [
        `<b>Referencing</b> stores only a pointer — the id of the related entity — and keeps the real record in its own collection. The order holds <code>customer_id: "u#42"</code>; the customer lives once in the <code>users</code> collection. Nothing is duplicated, so the shared fact has exactly one home and a change is written in exactly one place. References are also <b>unbounded-safe</b>: a list of ids never blows past a document size limit.`,
        `The price is an <b>extra round-trip</b>. To show the order <em>with</em> the customer's name, the app does a second read — follow the id, fetch the user — or performs an application-side join. You pay one more request per reference to keep the data normalized and bounded.`,
      ],
      callout: { kind: 'insight', text: 'A reference is a foreign key you dereference in the app. One copy of the shared fact, unbounded-safe — at the cost of a second read.' },
      changes: ['+ customer_id stored as a pointer', '~ customer lives once in its own collection', '! an extra read to resolve the reference'],
      metrics: { requests: 2, duplication: 0, collections: 2, nesting: 1 },
      scene: { view: 'reference', note: 'The order stores customer_id and points to a separate user document — no duplication, but a second read resolves it.' },
    },
    { // 3 TECHNIQUE — the decision rule
      chapter: 'technique', short: 'The rule',
      title: 'Owned & bounded, or shared & large',
      body: [
        `The decision follows three questions about the related data. <b>Ownership:</b> is it owned by this parent (an order's line items) or shared across many (a product in many orders)? <b>Boundedness:</b> is the collection bounded (a handful of addresses) or unbounded (every event ever)? <b>Access:</b> is it always read <em>with</em> the parent, or often on its own?`,
        `The rule falls out: <span class="term">embed</span> what is <b>owned, bounded, and read-together</b>; <span class="term">reference</span> what is <b>shared, unbounded, or large</b>. An order's line items — owned, bounded, read with the order — embed. A customer shared across thousands of orders, or an unbounded activity log — reference. Apply it per relationship and the model almost designs itself.`,
      ],
      callout: { kind: 'tip', text: 'Embed owned + bounded + read-together. Reference shared, unbounded, or large. Three questions settle every relationship.' },
      changes: ['~ owned + bounded + read-together → embed', '~ shared / unbounded / large → reference'],
      metrics: { requests: 1, duplication: 0, collections: 2, nesting: 2 },
      scene: { view: 'rule', note: 'The decision rule: embed owned, bounded, read-together data; reference shared, unbounded, or large data.' },
    },
    { // 4 TRADEOFF / HYBRID
      chapter: 'tradeoff', short: 'The hybrid',
      title: 'Embed a summary, reference the rest',
      body: [
        `The two are not exclusive — the <b>hybrid</b> embed captures most of the benefit of both. Embed a small, stable <em>summary</em> of the related entity for the common read, and keep a reference to the full document for when more is needed. An order embeds <code>product_name</code> and <code>price_at_purchase</code> (enough to render the receipt in one read) and also stores <code>product_id</code> to fetch live stock or reviews.`,
        `This deliberately duplicates a <em>little</em> stable data to avoid the extra read on the hot path, while the reference keeps the full, changing record in one place. The embedded snapshot is often exactly what you want anyway — <code>price_at_purchase</code> should <b>not</b> change when the product's price later does. Pick what to snapshot carefully: duplicate only fields that are stable or meant to be frozen.`,
      ],
      callout: { kind: 'warn', text: 'The hybrid duplicates a small, stable summary on purpose. It is wrong only if you snapshot volatile fields and let them drift from the source of truth.' },
      changes: ['+ embed a stable summary (name, price_at_purchase)', '+ reference the full product by id', '! snapshot only stable or frozen fields'],
      metrics: { requests: 1, duplication: 1, collections: 2, nesting: 2 },
      scene: { view: 'hybrid', note: 'A hybrid: a small stable summary embedded for the one-read path, plus a reference to the full product document.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Per relationship',
      title: 'Decide each relationship on its merits',
      body: [
        `Embedding and referencing are the two moves of document modeling, chosen <b>per relationship</b> from ownership, boundedness, and access pattern. Embedding gives one read but duplicates shared data and risks unbounded growth. Referencing avoids duplication and stays unbounded-safe but costs an extra round-trip. Neither is the default; the data decides.`,
        `The rule — embed owned + bounded + read-together, reference shared + unbounded + large, hybridize with a stable embedded summary — turns the choice from guesswork into a checklist. It is query-first design applied inside a single document: shape each relationship around how it is read, and the extra reads disappear where they matter most.`,
      ],
      callout: { kind: 'insight', text: 'One read vs no duplication is the trade. Embed what is owned and bounded; reference what is shared and large; snapshot the stable middle.' },
      metrics: { requests: 1, duplication: 1, collections: 2, nesting: 2 },
      scene: { view: 'recap', note: 'The hybrid order: owned items embedded, shared product referenced, a stable summary snapshotted for the one-read path.' },
    },
  ],
};
