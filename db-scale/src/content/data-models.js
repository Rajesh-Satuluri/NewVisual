/* content/data-models.js — the "Data Models" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/data-models-scene.js. Rendered through the shared course shell. */

export const dataModelsLesson = {
  id: 'data-models',
  title: 'Data Models',
  group: 'Foundations',
  summary: 'A data model is the shape you give your data plus the operations it allows — the very same facts look completely different depending on the model you choose.',
  minutes: 7,
  level: 'beginner',
  metrics: ['relations', 'rows', 'queries'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A data model is <b>structure + operations</b>, not just storage', step: 0 },
    { text: 'The relational model: tables of rows linked by keys', step: 1 },
    { text: 'The document model: one self-contained nested record', step: 2 },
    { text: 'Key-value &amp; graph models, and what each is for', step: 3 },
    { text: 'Choose a model by your access pattern, not by fashion', step: 5 },
  ],

  steps: [
    { // 0 — WHAT IS IT
      chapter: 'technique', short: 'What is it',
      title: 'A model is a shape plus its rules',
      body: [
        `Before a database stores a single byte, it has to decide what data even <em>looks</em> like. A <span class="term">data model</span> is exactly that decision: a <b>structure</b> for your facts, the <b>operations</b> you may run over them, and the <b>constraints</b> that keep them valid.`,
        `The same real-world information — say a <code>user</code> who has placed two <code>orders</code> — can be shaped in radically different ways. Pick a model and you have quietly chosen how every query, index and join above it will work.`,
      ],
      callout: { kind: 'insight', text: 'A data model is a contract about structure and operations. Everything the database can do fast — or at all — is downstream of it.' },
      metrics: { relations: 0, rows: 0, queries: 0 },
      scene: { view: 'intro', apps: 2, note: 'One pile of facts; the model decides its shape.' },
    },
    { // 1 — RELATIONAL
      chapter: 'technique', short: 'Relational',
      title: 'Relational: tables linked by keys',
      body: [
        `The <span class="term">relational model</span> splits the facts across <b>tables</b> of uniform rows. A <code>users</code> table holds one row per person; an <code>orders</code> table holds one row per order, each carrying the <code>user_id</code> of its owner.`,
        `Nothing is nested. Relationships are expressed by matching <b>keys</b>, and you reassemble the picture at read time with a <em>join</em>. It is the default for structured, highly-related data — and the model the rest of this course leans on.`,
      ],
      callout: { kind: 'tip', text: 'Flat tables + foreign keys + joins. No duplication, strong rules, and a general query language on top.' },
      changes: ['+ users table', '+ orders table', '~ linked by user_id (foreign key)'],
      metrics: { relations: 2, rows: 3, queries: 1 },
      scene: { view: 'relational', apps: 2, note: 'Two tables, joined by a key — the relational shape.' },
    },
    { // 2 — DOCUMENT
      chapter: 'technique', short: 'Document',
      title: 'Document: one nested record',
      body: [
        `The <span class="term">document model</span> keeps everything about one entity together in a single self-contained record — a JSON-like tree. The user document <em>embeds</em> its own orders array, so one read returns the whole aggregate.`,
        `No joins, no assembly: great when you always read an entity and its children together. The price is duplication and weaker cross-entity rules, because the database sees one opaque tree, not shared tables.`,
      ],
      callout: { kind: 'tip', text: 'One document = one aggregate read in a single hit. Fast for read-together data; awkward for data that must be shared and cross-referenced.' },
      changes: ['~ orders embedded inside the user', '+ one read returns everything', '- relationships across documents are manual'],
      metrics: { relations: 1, rows: 1, queries: 1 },
      scene: { view: 'document', apps: 2, note: 'One nested document carries the user and its orders.' },
    },
    { // 3 — KEY-VALUE
      chapter: 'technique', short: 'Key-Value',
      title: 'Key-value: a giant dictionary',
      body: [
        `Strip structure away entirely and you have the <span class="term">key-value model</span>: a huge dictionary of <code>key → value</code>. Hand it a key, it hands back the blob; put a key, it stores the blob. That is the whole interface.`,
        `Because the database never looks inside the value, get and put are blisteringly fast and trivial to distribute — but you cannot query by anything except the key. Perfect for sessions, caches and counters; useless for ad-hoc questions.`,
      ],
      callout: { kind: 'insight', text: 'Fastest possible access by key, zero understanding of what is inside. You trade queryability for raw speed and scale.' },
      changes: ['~ value is an opaque blob', '+ O(1) get / put by key', '- no querying inside values'],
      metrics: { relations: 1, rows: 4, queries: 1 },
      scene: { view: 'keyvalue', apps: 2, note: 'Key in, blob out — no structure the database can see.' },
    },
    { // 4 — GRAPH
      chapter: 'technique', short: 'Graph',
      title: 'Graph: relationships first',
      body: [
        `The <span class="term">graph model</span> makes connections the main event. Entities become <b>nodes</b> and the links between them become <b>edges</b> — the user node <em>placed</em> an order node, which <em>contains</em> a product node.`,
        `Walking many hops of relationships — friends-of-friends, recommendation paths, dependency chains — is cheap here and painful in flat tables. When the <em>edges</em> are the data you care about, a graph wins.`,
      ],
      callout: { kind: 'tip', text: 'Nodes + edges make relationships first-class. Ideal for highly-connected data and multi-hop traversals; overkill for simple records.' },
      changes: ['+ nodes (user, order, product)', '+ edges carry the relationships', '~ traversals instead of joins'],
      metrics: { relations: 3, rows: 3, queries: 2 },
      scene: { view: 'graph', apps: 2, note: 'Nodes and edges — the connections are the data.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Pick by access',
      title: 'Choose by how you read and write',
      body: [
        `There is no “best” model — only the one that fits your access pattern. Reach for <b>relational</b> when data is structured and shared; <b>document</b> when you read whole aggregates; <b>key-value</b> when you need raw speed by key; <b>graph</b> when the relationships are the point.`,
        `Real systems mix them. What matters is that “a data model” is a deliberate design choice, made for the queries you expect — not a default you inherit by accident.`,
      ],
      callout: { kind: 'insight', text: 'Relational · Document · Key-value · Graph. Match the model to your read/write pattern, and everything above it gets easier.' },
      metrics: { relations: 2, rows: 3, queries: 2 },
      scene: { view: 'recap', apps: 2, note: 'Four shapes for the same facts — pick for your workload.' },
    },
  ],
};
