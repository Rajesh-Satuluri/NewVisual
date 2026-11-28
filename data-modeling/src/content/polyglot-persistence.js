/* content/polyglot-persistence.js — "Polyglot Persistence", as DATA. No single store
   is best at everything, so a real system runs several, each matched to an access
   pattern, kept in sync by CDC / event streams. Its scene shows one source feeding
   many distinct stores, each shaped for a different query. */

export const polyglotPersistenceLesson = {
  id: 'polyglot-persistence',
  title: 'Polyglot Persistence',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'No single database is best at everything, so a real system uses several stores, each matched to an access pattern. Polyglot persistence is choosing the right tool per job and keeping the copies in sync — buying fit and speed with operational complexity.',
  minutes: 8,
  level: 'advanced',
  metrics: ['accessPatterns', 'latency', 'staleness', 'throughput'],
  legend: [],
  goals: [
    { text: 'One database cannot be best at every access pattern at once', step: 0 },
    { text: 'Map each access pattern to the store built for it', step: 1 },
    { text: 'The same entity is shaped differently in every store', step: 2 },
    { text: 'Keep the stores in sync with CDC and event streams', step: 3 },
    { text: 'Many stores means real operational and consistency complexity', step: 4 },
    { text: 'Use polyglot persistence when one engine genuinely cannot serve all patterns', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'One DB can’t do it all',
      title: 'No database is best at everything',
      body: [
        `Every database engine makes a trade. A relational store gives you transactions and integrity but strains at full-text search; a key-value cache gives you microsecond lookups but can't answer "find products like this"; a graph engine walks relationships that a document store would need a dozen round-trips for. Each is <b>shaped for a family of access patterns</b> and slow or clumsy outside it.`,
        `A real product has <em>all</em> these patterns at once: a store sells things (catalog browsing), takes money (transactions), remembers sessions (fast key lookups), lets people search (full-text), recommends (graph), reports (analytics). Forcing them through one engine means every pattern but one runs on the wrong tool.`,
      ],
      callout: { kind: 'insight', text: 'Each engine is tuned for a family of access patterns. A real app spans several families, so no single store fits all of them well.' },
      metrics: { accessPatterns: 1, latency: 40, staleness: 0, throughput: 1 },
      scene: { view: 'onesize', note: 'One database asked to serve every access pattern at once — strong at one family, clumsy at the rest.' },
    },
    { // 1 TECHNIQUE (map patterns to stores)
      chapter: 'technique', short: 'Map patterns to stores',
      title: 'Match each pattern to its store',
      body: [
        `<span class="term">Polyglot persistence</span> is the deliberate use of several stores, each chosen for the access pattern it serves best. Transactions and integrity → the <b>relational</b> database. Catalog documents read whole → a <b>document</b> store. Sessions and hot lookups → a <b>key-value</b> cache. Full-text queries → a <b>search</b> engine. "People who bought this" → a <b>graph</b>. Metrics over time → a <b>time-series</b> DB. Historical roll-ups → a <b>warehouse</b>.`,
        `You are applying the same query-first rule as within a single store, one level up: start from the list of access patterns, and for each one pick the engine whose data structures answer it in a single, cheap operation. The system of record stays authoritative; the others are purpose-built read paths.`,
      ],
      callout: { kind: 'tip', text: 'List the access patterns first, then assign each to the engine that answers it cheapest — relational, document, KV, search, graph, warehouse.' },
      changes: ['+ relational = truth · KV = sessions · search = text', '+ graph = relationships · warehouse = analytics'],
      metrics: { accessPatterns: 6, latency: 2, staleness: 0, throughput: 6 },
      scene: { view: 'map-stores', note: 'Each access pattern routed to the store built for it — a cache, a search index, a graph, a warehouse.' },
    },
    { // 2 TECHNIQUE (same entity, many shapes)
      chapter: 'technique', short: 'Same entity, many shapes',
      title: 'The same entity, shaped per store',
      body: [
        `Modeling now spans stores: a single entity — a <code>product</code> — takes a <b>different shape in each</b>. In the relational system of record it is normalized rows with foreign keys and constraints. In the document store it is one denormalized catalog document read whole. In the search index it is an inverted index of tokenized text and facets. In the cache it is a flat key→blob for one-hop reads. In the graph it is a node with edges to co-purchased products.`,
        `None of these is "the" product; each is the product <em>shaped for a question</em>. The craft of polyglot modeling is designing these projections — deciding which fields each store needs and how to derive its shape from the source of truth.`,
      ],
      callout: { kind: 'insight', text: 'One entity, many projections: rows, a document, an inverted index, a cached blob, a graph node — each shaped for its query.' },
      changes: ['~ product = rows / document / index / blob / node', '+ each projection carries only what its queries need'],
      metrics: { accessPatterns: 6, latency: 2, staleness: 1, throughput: 6 },
      scene: { view: 'shapes', note: 'The same product projected into rows, a document, a search index, a cache blob and a graph node.' },
    },
    { // 3 TECHNIQUE (keeping in sync)
      chapter: 'technique', short: 'Keeping in sync',
      title: 'Keep the copies in sync',
      body: [
        `Several copies of the same fact means <b>keeping them in sync</b>. The robust pattern is <span class="term">change data capture</span>: writes land in the system of record, which emits a change <b>event stream</b>; downstream consumers project each change into the search index, the cache, the graph, the warehouse. One write, many derived updates, flowing outward.`,
        `CDC is preferred over <em>dual writes</em> (the app writing every store itself) because dual writes have no safe ordering — a crash between writes leaves stores permanently inconsistent, with no single place to replay from. An event log gives you one ordered source of truth to rebuild every projection from, and the derived stores become <b>eventually consistent</b> with it.`,
      ],
      callout: { kind: 'tip', text: 'Prefer CDC / an event stream from the system of record over dual writes: one ordered log you can replay to rebuild any projection.' },
      changes: ['+ system of record emits a change stream', '~ consumers project changes into each store'],
      metrics: { accessPatterns: 6, latency: 2, staleness: 2, throughput: 6 },
      scene: { view: 'sync', note: 'The system of record emits a change stream; consumers project each change into the other stores, eventually consistent.' },
    },
    { // 4 TRADEOFF (complexity)
      chapter: 'tradeoff', short: 'The complexity cost',
      title: 'Many stores, much complexity',
      body: [
        `The bill for all this fit is <b>operational complexity</b>. Every store is a thing to provision, scale, secure, back up, monitor and understand failures in — six engines is six on-call playbooks. The data is now <b>eventually consistent</b> across them, so the search index can lag the source of truth, and the app and its users must tolerate that <span class="term">staleness</span> window.`,
        `So polyglot persistence is not a default — it is a response to genuine, measured need. If one engine can serve all your access patterns acceptably, use one: fewer moving parts beats a perfect fit. Add a store only when a specific pattern is <em>provably</em> badly served by what you already run, and the win outweighs another system to keep alive and in sync.`,
      ],
      callout: { kind: 'warn', text: 'Each store added is another system to run and another copy to keep consistent. Add one only when a pattern is provably underserved.' },
      changes: ['! N stores → N ops burdens, N sync paths', '! eventual consistency: derived stores lag the truth'],
      metrics: { accessPatterns: 6, latency: 2, staleness: 5, throughput: 6 },
      scene: { view: 'complexity', note: 'Each added store is another system to operate and another lagging copy — complexity traded for fit.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Right tool per job',
      title: 'The right tool for each pattern',
      body: [
        `Polyglot persistence closes the section's argument. Within a store you shape the data to the query; across a system you shape the <b>choice of store</b> to the query. Keep the relational database for truth and transactions, and add a document store, a cache, a search engine, a graph or a warehouse exactly where an access pattern demands one — each fed from the source of truth by CDC or an event stream.`,
        `Spend the complexity consciously. More stores buy better fit and lower latency per pattern, at the cost of operations and eventual consistency. The modeling skill is drawing the map — access patterns to engines, one entity to many shapes, kept in sync by an ordered stream — and adding a store only when the fit is worth the system.`,
      ],
      callout: { kind: 'insight', text: 'Shape the store choice to the query, as you shape the data to the query — and pay the complexity only where a pattern earns it.' },
      metrics: { accessPatterns: 6, latency: 2, staleness: 2, throughput: 6 },
      scene: { view: 'recap', note: 'One source of truth feeding a cache, a document store, a search index, a graph and a warehouse — right tool per pattern.' },
    },
  ],
};
