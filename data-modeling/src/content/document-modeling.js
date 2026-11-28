/* content/document-modeling.js — "Document Modeling", the gateway NoSQL lesson,
   as DATA. Same step shape as the relational lessons, but its scene is rendered on
   the NoSQL canvas (engine/nosql2d.js): the hero is a document that UNFOLDS as a
   nested JSON tree, not a flat table. */

export const documentModelingLesson = {
  id: 'document-modeling',
  title: 'Document Modeling',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A document stores a whole aggregate — the object you read together — as one self-contained, nested record. You model around the read, not around normalization.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['collections', 'requests', 'nesting', 'joins'],
  legend: [],
  goals: [
    { text: 'A document is a self-contained tree of keys, scalars, arrays and sub-objects', step: 0 },
    { text: 'The relational answer scatters one object across many tables', step: 1 },
    { text: 'A document stores the whole aggregate, read in a single request', step: 2 },
    { text: 'Arrays and nested objects are first-class — no join table needed', step: 3 },
    { text: 'Embedding has limits: document size, unbounded growth, duplicated facts', step: 4 },
    { text: 'Model the document around what you read together', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'A self-contained tree',
      title: 'A document is a tree, not a row',
      body: [
        `In a document database — MongoDB, Couchbase, DynamoDB’s item model — the unit of storage is not a row in a table but a <span class="term">document</span>: a self-contained, schema-flexible record shaped like JSON. Keys map to <b>scalars</b>, to <b>arrays</b>, and to nested <b>sub-objects</b>, nested as deep as the data naturally goes.`,
        `Here is a <code>user</code> document. The flat fields — <code>_id</code>, <code>name</code>, <code>email</code> — look like columns, but <code>address</code> is itself an object with its own keys. One document already carries what a relational design would spread across two tables.`,
      ],
      callout: { kind: 'insight', text: 'A document is the object as your application already holds it in memory — stored whole, not shredded into normalized tables.' },
      metrics: { collections: 1, requests: 1, nesting: 2, joins: 0 },
      scene: { view: 'doc', note: 'One user document — flat fields plus a nested address object, stored as a single tree.' },
    },
    { // 1 PROBLEM (relational contrast)
      chapter: 'problem', short: 'Scattered across tables',
      title: 'The relational answer shreds the object',
      body: [
        `Model the same user in a normalized relational schema and the single object fractures: <code>users</code> holds the scalar fields, <code>addresses</code> holds the address in its own table joined by <code>user_id</code>, and every order the user placed lives in yet another <code>orders</code> table. Reassembling the user your app wants means a <b>join across three tables</b>.`,
        `Normalization optimizes for write-time integrity — one fact, one place. But the application almost always reads the <em>whole</em> user at once, and it pays a multi-join tax on every read to rebuild an object the document store would have handed back intact.`,
      ],
      callout: { kind: 'warn', text: 'Normalization scatters the aggregate to protect writes; the read then pays to gather it back together, join after join.' },
      changes: ['~ users / addresses / orders — three tables', '! one read → a 3-table join'],
      metrics: { collections: 3, requests: 3, nesting: 0, joins: 2 },
      scene: { view: 'scattered', note: 'The same user, normalized — scalar fields, address and orders split across three tables joined by user_id.' },
    },
    { // 2 TECHNIQUE (embed the aggregate)
      chapter: 'technique', short: 'Store the aggregate',
      title: 'Embed what you read together',
      body: [
        `A document models the <span class="term">aggregate</span> — the cluster of data that is created, read and updated as a unit. If the app always loads the user <em>with</em> their address and recent orders, then address and orders belong <b>inside</b> the user document, embedded as a sub-object and an array.`,
        `Now the read that cost three joins is a single key lookup that returns the entire tree. No join, no second round-trip: the storage layout matches the access pattern exactly. This inversion — <b>shape the data to the query, not to the schema</b> — is the whole of NoSQL data modeling.`,
      ],
      callout: { kind: 'tip', text: 'Draw a boundary around the data that is always read together. That boundary is your document.' },
      changes: ['+ address embedded as a sub-object', '+ orders embedded as an array', '~ one read, zero joins'],
      metrics: { collections: 1, requests: 1, nesting: 3, joins: 0 },
      scene: { view: 'embed', note: 'address and recent orders embedded inside the user — the whole aggregate returned in one read.' },
    },
    { // 3 TECHNIQUE (arrays & nesting are first-class)
      chapter: 'technique', short: 'Arrays & sub-objects',
      title: 'Lists and nesting are first-class',
      body: [
        `A document holds an <b>array</b> of sub-objects directly: <code>orders</code> is a list, each element its own little document with <code>sku</code>, <code>qty</code> and <code>price</code>. Relationally this demands an <code>order_items</code> child table and a foreign key; in a document it is just a nested value, queried and indexed in place.`,
        `This is why documents feel natural to application developers: the stored shape is the object graph. A one-to-many that is <em>owned</em> by the parent — a user’s addresses, an order’s line items, a post’s comments — simply nests, and the database can index deep into the array (<code>orders.sku</code>) without a separate table.`,
      ],
      callout: { kind: 'insight', text: 'An owned one-to-many becomes a nested array. No join table, no foreign key — the children live inside the parent.' },
      metrics: { collections: 1, requests: 1, nesting: 3, joins: 0 },
      scene: { view: 'nested', note: 'orders is an array of line-item sub-objects — an owned one-to-many, nested instead of joined.' },
    },
    { // 4 TRADEOFF (limits of embedding)
      chapter: 'tradeoff', short: 'Embedding has limits',
      title: 'When the aggregate grows without bound',
      body: [
        `Embedding is not free. A document has a hard <b>size ceiling</b> (16 MB in MongoDB), and an array that grows without bound — every event a user ever triggered, every comment on a viral post — will eventually blow past it or make the whole document slow to load for a read that only wanted the name.`,
        `Embedding also <b>duplicates</b> any fact shared between aggregates: a product embedded in a thousand orders is copied a thousand times, and a price change must now rewrite them all. The rule of thumb: embed data that is <em>owned</em>, <em>bounded</em>, and <em>read with</em> the parent; <span class="term">reference</span> data that is shared, unbounded, or large — the subject of the next lesson.`,
      ],
      callout: { kind: 'warn', text: 'Unbounded arrays and shared, duplicated sub-documents are the two ways embedding goes wrong. Bounded + owned + read-together is the safe zone.' },
      changes: ['! orders array grows unbounded → 16 MB ceiling', '! embedded product duplicated across documents'],
      metrics: { collections: 1, requests: 1, nesting: 4, joins: 0 },
      scene: { view: 'growth', note: 'An unbounded embedded array strains the document size limit; a shared sub-object duplicates a fact across documents.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Model the read',
      title: 'Shape the document around the read',
      body: [
        `Document modeling inverts the relational instinct. Instead of decomposing the world into minimal, non-redundant tables and rejoining at read time, you draw a boundary around the <b>aggregate your application reads together</b> and store it as one nested tree — scalars, sub-objects and arrays — fetched in a single request with no joins.`,
        `The craft is in the boundary. Embed what is owned, bounded and read-together; reference what is shared, unbounded or large. Get that line right and the storage layout mirrors the access pattern, which is exactly what the next lessons — embedding vs referencing, key-value, wide-column and single-table design — refine into a full method.`,
      ],
      callout: { kind: 'insight', text: 'One aggregate, one document, one read. Model the shape of the answer, then store that shape.' },
      metrics: { collections: 1, requests: 1, nesting: 3, joins: 0 },
      scene: { view: 'recap', note: 'The user aggregate as one document — owned data embedded, read whole in a single request.' },
    },
  ],
};
