/* content/query-first-design.js — "Query-First Design", the founding principle of
   NoSQL modeling, as DATA. You do not start from entities and normalize; you start
   from the LIST OF ACCESS PATTERNS and shape the data so each is one cheap read.
   Its scene lives on the NoSQL canvas: the hero is the accessList. */

export const queryFirstDesignLesson = {
  id: 'query-first-design',
  title: 'Query-First Design',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'Relational modeling shapes the data first and queries it any way later; NoSQL inverts that. You enumerate the exact queries the app must serve, then shape the data so each one is a single cheap read.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['accessPatterns', 'requests', 'itemsRead', 'joins'],
  legend: [],
  goals: [
    { text: 'Relational is entity-first: model the data, then query it any way with ad-hoc joins', step: 0 },
    { text: 'NoSQL is query-first: a query you did not design for is expensive or impossible', step: 1 },
    { text: 'Enumerate the access patterns — the exact questions the app must answer', step: 2 },
    { text: 'Map each access pattern to one key or collection that serves it in a single read', step: 3 },
    { text: 'The cost: you must know the patterns up front; a new one means a redesign', step: 4 },
    { text: 'List the queries first, then design the data to satisfy every one of them', step: 5 },
  ],

  steps: [
    { // 0 SETUP — entity-first (relational)
      chapter: 'setup', short: 'Entity-first',
      title: 'Relational starts from the entities',
      body: [
        `Relational modeling is <span class="term">entity-first</span>. You identify the nouns of the domain — <code>users</code>, <code>orders</code>, <code>products</code> — give each its own normalized table, and connect them with foreign keys. The schema describes <em>the world</em>, not any particular question, and that is its great strength.`,
        `Because the data is decomposed into clean, non-redundant tables, you can answer <b>any</b> query later by writing a new <code>SELECT</code> with whatever joins it needs — including questions nobody anticipated when the schema was drawn. The modeling is done before you know how the data will be read.`,
      ],
      callout: { kind: 'insight', text: 'Model the entities, normalize, and the database will join them any way you ask later. Flexibility is the whole point of the relational model.' },
      metrics: { accessPatterns: 'any', requests: 3, itemsRead: 7, joins: 2 },
      scene: { view: 'entity-first', note: 'Entity-first: three normalized tables describe the domain; any query is answered later with ad-hoc joins.' },
    },
    { // 1 PROBLEM — query-first inversion
      chapter: 'problem', short: 'Queries come first',
      title: 'NoSQL inverts the order',
      body: [
        `A distributed NoSQL store has <b>no ad-hoc join</b> and no cheap full-table scan. Shaping the data after the fact is not an option: the layout you choose <em>is</em> the set of questions you can answer quickly. So the order of work flips. You enumerate the <span class="term">access patterns</span> — the exact queries the application will run — <b>first</b>, and only then design the data to serve them.`,
        `The consequence is stark. A query you designed for is a single millisecond-scale read. A query you did <em>not</em> design for is a slow scan, a second data copy, or simply impossible without reshaping everything. In NoSQL, the queries are not an afterthought — they are the input to the model.`,
      ],
      callout: { kind: 'warn', text: 'There are no ad-hoc joins to fall back on. A query the model was not designed for is expensive or impossible — so the queries must come first.' },
      changes: ['~ no ad-hoc joins, no cheap scan', '! the data layout fixes which queries are fast'],
      metrics: { accessPatterns: 0, requests: 1, itemsRead: 1, joins: 0 },
      scene: { view: 'patterns', note: 'Query-first: the list of access patterns is the input to the model, enumerated before any data is shaped.' },
    },
    { // 2 TECHNIQUE — enumerate the access patterns (the hero)
      chapter: 'technique', short: 'Enumerate patterns',
      title: 'Write down every access pattern',
      body: [
        `The first real modeling step is a list, not a diagram. Write every <span class="term">access pattern</span> the app needs, phrased as a concrete question with its input: <em>get a user by id</em>, <em>list a user's orders newest-first</em>, <em>get an order with its line items</em>, <em>look up a product by id</em>. Each line is a query the system must serve, and the list is meant to be <b>exhaustive</b>.`,
        `This list is the single most important artifact in NoSQL design. Everything downstream — which keys you pick, what you embed, what you duplicate — is derived from it. If a pattern is missing from the list, the data will not be shaped to answer it, and you will discover the gap in production.`,
      ],
      callout: { kind: 'tip', text: 'Interview the application, not the domain. Every screen and endpoint is one access pattern — list them all before touching a key.' },
      changes: ['+ enumerate every query the app runs', '+ each line is one concrete, parameterized read'],
      metrics: { accessPatterns: 4, requests: 1, itemsRead: 1, joins: 0 },
      scene: { view: 'enumerate', note: 'The access-pattern list — every concrete query the application must serve, written out before the data is modeled.' },
    },
    { // 3 TECHNIQUE — map each pattern to a key/collection
      chapter: 'technique', short: 'Map to keys',
      title: 'Map each pattern to one read',
      body: [
        `Now satisfy the list. For each access pattern, choose a <b>key or collection</b> that returns its answer in a single read. <em>Get user by id</em> becomes the key <code>user:42</code>; <em>a user's orders</em> become an item collection under <code>PK=USER#42</code>; <em>product by id</em> becomes <code>product:A1</code>. You design the data <b>to the queries</b>, not the other way round.`,
        `When every pattern on the list has a green check — one lookup or one range read each — the model is complete. The storage layout is now a mirror of the access patterns: nothing is stored that no query reads, and every query reads exactly one place. That alignment is what delivers predictable latency at scale.`,
      ],
      callout: { kind: 'insight', text: 'Done when every access pattern maps to a single read. The data shape is the list of queries, turned into keys.' },
      changes: ['+ each pattern → one key or one collection', '~ every query satisfied by a single read'],
      metrics: { accessPatterns: 4, requests: 1, itemsRead: 1, joins: 0 },
      scene: { view: 'map', note: 'Each access pattern mapped to a key or collection — every query satisfied by exactly one read.' },
    },
    { // 4 TRADEOFF — must know patterns up front
      chapter: 'tradeoff', short: 'The price',
      title: 'A new pattern means a redesign',
      body: [
        `Query-first design buys speed with <b>rigidity</b>. It demands that you know your access patterns <em>up front</em> — the exact inversion of the relational promise that any future question can be answered with a new join. Here, a query the model never anticipated has no home: there is no table shaped to return it in one read.`,
        `Adding that query after the fact is real work: a secondary index, a second copy of the data shaped for the new access, or a migration of the keys. So query-first design is fastest when the access patterns are <b>known and stable</b>, and most painful when they churn. When the questions keep changing, a normalized relational schema is often the better tool.`,
      ],
      callout: { kind: 'warn', text: 'You trade query flexibility for latency. An unplanned access pattern needs a new index, a new copy, or a migration — know your patterns before you build.' },
      changes: ['! unplanned query has no single-read home', '! new pattern → index, duplicate, or key migration'],
      metrics: { accessPatterns: 5, requests: 2, itemsRead: 4, joins: 0 },
      scene: { view: 'newpattern', note: 'An access pattern the model never anticipated — no key serves it, so it needs a new index, a copy, or a redesign.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Queries first',
      title: 'List the queries, then shape the data',
      body: [
        `Query-first design is the founding principle every other NoSQL lesson rests on. You do not start from entities and normalize; you start from the <b>list of access patterns</b> — the exact queries the app must serve — and shape the data so each one is a single cheap read. Relational models the data then queries it; NoSQL enumerates the queries then models the data.`,
        `The method is always the same: list every access pattern, then map each to one key or collection that answers it in a single read. Embedding vs referencing, key-value, wide-column and single-table design are all just techniques for turning that list into keys. Get the list right and complete, and the rest of NoSQL modeling follows from it.`,
      ],
      callout: { kind: 'insight', text: 'Enumerate the queries first; shape the data to them. A query you did not design for is the one that will hurt.' },
      metrics: { accessPatterns: 4, requests: 1, itemsRead: 1, joins: 0 },
      scene: { view: 'recap', note: 'Every access pattern mapped to a single read — the data shaped to the queries, which is the whole of query-first design.' },
    },
  ],
};
