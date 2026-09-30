/* ============================================================
   deepdives/data-models.js — "Data Models" deep dive.
   Registers DBLab.deepDives['data-models'] (concept m04).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: the SAME ShopKart order (#9001, customer Ana, 2 line items) modeled
  // five ways. Each step highlights one model and how it shapes queries,
  // integrity, and scale.
  var MODELS = [
    {
      key: "relational", name: "Relational", tag: "tables · rows · SQL",
      code: "customers(id=7, name='Ana', city='Pune')\norders(id=9001, customer_id=7, total=1998)\norder_items(order_id=9001, sku=42, qty=1)\norder_items(order_id=9001, sku=88, qty=1)",
      best: "Transactions, integrity, ad-hoc joins & queries"
    },
    {
      key: "document", name: "Document", tag: "nested JSON",
      code: "order 9001 = {\n  customer: { id:7, name:'Ana' },\n  items: [ {sku:42, qty:1}, {sku:88, qty:1} ],\n  total: 1998\n}",
      best: "Data read/written together; flexible schema"
    },
    {
      key: "keyvalue", name: "Key-Value", tag: "get/put by key",
      code: "GET  order:9001\n  -> «opaque blob»\nSET  order:9001 = «blob»\n(no queries on the value)",
      best: "Caching, sessions, ultra-low-latency lookups"
    },
    {
      key: "widecolumn", name: "Wide-Column", tag: "column families · partitioned",
      code: "row key: 9001\n  info:  { customer:7, total:1998 }\n  items: { 42:1, 88:1 }\n(sparse columns, partitioned by key)",
      best: "Massive write scale; key / range access"
    },
    {
      key: "graph", name: "Graph", tag: "nodes + edges",
      code: "(Ana) -[:PLACED]-> (Order 9001)\n(Order 9001) -[:CONTAINS]-> (SKU 42)\n(Order 9001) -[:CONTAINS]-> (SKU 88)",
      best: "Relationship traversal; recommendations, fraud"
    }
  ];
  function cards(activeKey, mode) {
    return MODELS.map(function (m) {
      var state = "idle";
      if (mode === "all") state = "shown";
      else if (m.key === activeKey) state = "active";
      else state = "muted";
      return { key: m.key, name: m.name, tag: m.tag, code: m.code, best: m.best, state: state };
    });
  }

  var STEPS = [
    {
      label: "1 · One reality, many shapes",
      what: "A <b>data model</b> is how you shape real-world facts into structures a database stores and queries. ShopKart's order #9001 — customer Ana, two line items, a total — can be modeled in fundamentally different ways.",
      why: "The model you pick shapes everything downstream: how you query, what integrity you can enforce, how it scales, and what's easy vs painful. It's one of the most consequential early decisions.",
      how: "The major families: <b>relational</b> (tables), <b>document</b> (nested JSON), <b>key-value</b> (opaque blobs by key), <b>wide-column</b> (partitioned column families), and <b>graph</b> (nodes + edges).",
      when: "At design time for every new store — and often more than once, since different parts of a system suit different models (polyglot persistence).",
      mistake: "Believing there's one 'best' model. Each optimizes for a different access pattern; the right one depends on how you'll read and write the data.",
      interview: "“What is a data model and why does it matter?” It's how facts are structured for storage/query; it dictates query power, integrity, and scalability — so it's chosen to fit access patterns.",
      example: "The very same ShopKart order is about to appear as tables, a JSON document, a key-value blob, wide-column rows, and a graph — each with different strengths.",
      viz: { cards: cards(null, "all"), note: "The same order #9001, five ways. The model shapes your queries, your integrity, and your scale." }
    },
    {
      label: "2 · Relational: tables and relationships",
      what: "The <b>relational</b> model stores data as <b>tables</b> of rows and columns, with relationships expressed by <b>keys</b>. Ana, the order, and its items live in separate normalized tables joined on ids.",
      why: "It's the default for transactional systems because it combines a strong, enforced schema, powerful ad-hoc queries (SQL + joins), and rock-solid integrity (keys, constraints, ACID transactions).",
      how: "Each fact is stored once and referenced by key; joins recombine them at query time; constraints and foreign keys keep the data valid. The optimizer answers arbitrary queries efficiently with indexes.",
      when: "Transactional workloads with rich relationships and integrity needs — orders, payments, inventory, most business systems.",
      mistake: "Assuming joins make it 'slow' at any scale — for OLTP-sized working sets with good indexes, joins are cheap and the integrity is worth it.",
      interview: "“When is relational the right default?” When you need transactions, enforced integrity, and flexible queries over related entities — i.e. most business data.",
      example: "ShopKart runs on Postgres: orders, order_items, customers, products as tables, joined for every checkout and report, with foreign keys guaranteeing no orphan orders.",
      viz: { cards: cards("relational"), note: "Facts stored once, joined by keys. Strong schema + ACID + ad-hoc SQL — the transactional default." }
    },
    {
      label: "3 · Document: aggregates as nested JSON",
      what: "The <b>document</b> model stores each entity as a self-contained <b>nested document</b> (JSON/BSON). The whole order — customer snapshot, items array, total — is one document you read and write together.",
      why: "When data is accessed as a unit, embedding it avoids joins and matches the shape of application objects. A flexible schema lets documents vary without migrations.",
      how: "A document is fetched by id in one read (no joins), and its nested structure mirrors your code's objects. Trade-offs: duplicated data across documents and weaker cross-document integrity.",
      when: "Aggregate-oriented data read/written as a whole — product catalogs, user profiles, content, event payloads — where schema flexibility helps.",
      mistake: "Embedding data that's shared and updated independently — a customer copied into every order means updating the address in thousands of documents.",
      interview: "“When does a document model beat relational?” When entities are read/written as self-contained aggregates and schema flexibility matters more than cross-entity joins/integrity.",
      example: "ShopKart stores product catalog entries as documents — each product with its varying attributes and reviews embedded — so a product page is one read.",
      viz: { cards: cards("document"), note: "One self-contained document per aggregate: no joins to read it, flexible schema — but duplication and weaker cross-doc integrity." }
    },
    {
      label: "4 · Key-value: the simplest contract",
      what: "The <b>key-value</b> model is a giant dictionary: store and fetch an <b>opaque value by its key</b>. <code>order:9001</code> maps to a blob; you can't query <i>inside</i> the value.",
      why: "By giving up query power it gets extreme speed and simplicity — O(1) get/put, trivial to partition — making it ideal for caching, sessions, and hot lookups.",
      how: "One operation matters: get/set by key. The value is opaque to the store (a string, blob, or serialized object). Scale-out is easy because keys shard cleanly.",
      when: "Caches (Redis/Memcached), session stores, feature flags, rate limiters — anywhere you look up by a known key and don't need to query the contents.",
      mistake: "Trying to run analytics or filters over values — the store can't see inside them; you'd have to fetch and scan everything client-side.",
      interview: "“What do you trade for key-value's speed?” Query power: you can only fetch by key, not query the value's contents, so it fits known-key lookups like caches.",
      example: "ShopKart caches rendered product pages and user sessions in Redis by key — sub-millisecond reads that take load off Postgres.",
      viz: { cards: cards("keyvalue"), note: "Fetch by key, value opaque. Maximum speed & simplicity, minimum query power — the caching/session workhorse." }
    },
    {
      label: "5 · Wide-column: sparse columns at scale",
      what: "The <b>wide-column</b> model (Cassandra, HBase, Bigtable) keys each row and groups columns into <b>column families</b>, with rows <b>partitioned</b> across nodes. Rows can be sparse and very wide.",
      why: "It's built for <b>massive write throughput and horizontal scale</b> with predictable key/range access, trading ad-hoc queries and joins for linear scalability and availability.",
      how: "You design tables around your queries (query-first): the partition key routes to a node, the clustering key orders within it. Great for time-series and huge, write-heavy datasets; weak for arbitrary queries.",
      when: "Enormous write volumes and known access patterns — event/time-series data, activity feeds, metrics, IoT — where relational scale-up won't cut it.",
      mistake: "Modeling it like relational and expecting ad-hoc joins/filters — you must design tables per query pattern up front, and denormalize deliberately.",
      interview: "“When wide-column over relational?” When you need very high write throughput and horizontal scale with predictable key/range access, and can design tables around queries.",
      example: "ShopKart stores its clickstream and per-user activity feed in Cassandra, partitioned by user, to absorb millions of writes/sec that Postgres couldn't.",
      viz: { cards: cards("widecolumn"), note: "Partitioned rows, sparse column families, query-first design. Linear write scale — at the cost of ad-hoc queries." }
    },
    {
      label: "6 · Graph: relationships as first-class",
      what: "The <b>graph</b> model stores <b>nodes</b> (Ana, the order, products) and <b>edges</b> (PLACED, CONTAINS) as first-class citizens, and lets you <b>traverse</b> relationships directly.",
      why: "When the questions are about connections — 'customers who bought this also bought…', shortest paths, fraud rings — graph traversal is far more natural and efficient than repeated relational joins.",
      how: "Edges are stored with the nodes, so hopping from node to node is a local operation rather than a join over the whole table. Query languages (Cypher, Gremlin) express traversals directly.",
      when: "Highly connected data where relationships are the query: recommendations, social networks, fraud detection, knowledge graphs, dependency analysis.",
      mistake: "Reaching for a graph database for data that's only shallowly related — a couple of foreign keys don't need graph traversal; relational joins handle them fine.",
      interview: "“When is a graph database worth it?” When queries are deep relationship traversals (recommendations, fraud, paths) that would be many expensive self-joins in relational.",
      example: "ShopKart powers 'customers also bought' by traversing the purchase graph — a few hops from a product to co-purchased products — instead of heavy multi-join SQL.",
      viz: { cards: cards("graph"), note: "Nodes + edges, traversal as a first-class operation. Wins where the question IS the relationship." }
    },
    {
      label: "7 · Choosing — and mixing — models",
      what: "There's no universal winner. You match the model to the <b>access pattern</b>, and real systems often use <b>several</b> (polyglot persistence) — relational for transactions, key-value for caching, graph for recommendations.",
      why: "Each model optimizes a different thing: relational for integrity + queries, document for aggregates, key-value for speed, wide-column for write scale, graph for relationships. Fit beats fashion.",
      how: "Start from how you'll read and write the data. Default to relational for transactional business data; add specialized stores for the parts whose access pattern a different model serves far better.",
      when: "Every storage decision; revisit as new access patterns (analytics, search, recommendations, caching) emerge.",
      mistake: "Picking a model by hype (or by 'we already run X') rather than by access pattern — or sprawling into ten stores when two would do. Fit and operational cost both matter.",
      interview: "“How do you choose a data model?” From the access patterns and integrity/scale needs; relational as the transactional default, specialized models where their strengths clearly pay off — often mixed.",
      example: "ShopKart runs Postgres (orders/inventory), Redis (cache/sessions), Cassandra (clickstream), and a graph store (recommendations) — each model where it fits.",
      viz: { cards: cards(null, "all"), note: "Match the model to the access pattern. Relational as the default; specialized stores where they clearly win. Most real systems mix." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function card(c) {
      var cls = "dd-modelcard" + (c.state === "active" ? " active" : (c.state === "muted" ? " muted" : ""));
      return '<div class="' + cls + '"><div class="dd-modelcard-name">' + c.name + "</div>" +
        '<div class="dd-modelcard-tag">' + c.tag + "</div>" +
        '<div class="dd-modelcode">' + c.code + "</div>" +
        '<div class="dd-modelcard-best"><span class="dd-modelcard-bestlbl">best for</span> ' + c.best + "</div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to see one ShopKart order modeled five ways — relational, document, ' +
          "key-value, wide-column, and graph — and how each shapes queries, integrity, and scale.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Order #9001, modeled five ways</div>' +
        '<div class="dd-row">' + s.cards.map(card).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["data-models"] = {
    slug: "data-models",
    overview: {
      what: "A <b>data model</b> is how real-world facts are shaped into structures a database stores and queries. The major families are <b>relational</b> (tables), <b>document</b> (nested JSON aggregates), <b>key-value</b> (opaque blobs by key), <b>wide-column</b> (partitioned column families), and <b>graph</b> (nodes + edges).",
      why: "The model chosen dictates query power, enforceable integrity, and how the system scales. The same data (a ShopKart order) is easy to query one way and painful another — so the model is matched to how the data will be read and written, not picked by fashion.",
      how: "Relational normalizes facts into tables joined by keys (strong integrity + ad-hoc SQL). Document embeds an aggregate as one flexible record (no joins to read it). Key-value trades all query power for speed. Wide-column partitions sparse columns for massive write scale. Graph makes relationships first-class for traversal. Real systems often mix several (polyglot persistence)."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The same order in three model idioms",
      lang: "sql",
      code:
        "-- RELATIONAL: normalized tables joined by keys\n" +
        "SELECT o.id, c.name, i.sku, i.qty\n" +
        "FROM orders o JOIN customers c ON c.id = o.customer_id\n" +
        "              JOIN order_items i ON i.order_id = o.id\n" +
        "WHERE o.id = 9001;\n" +
        "\n" +
        "-- DOCUMENT: one self-contained aggregate, fetched whole (MongoDB-style)\n" +
        "db.orders.findOne({ _id: 9001 })\n" +
        "//  { customer:{id:7,name:'Ana'}, items:[{sku:42,qty:1},{sku:88,qty:1}], total:1998 }\n" +
        "\n" +
        "-- KEY-VALUE: opaque blob by key (Redis-style)\n" +
        "GET order:9001            # value is opaque — you cannot query inside it\n" +
        "\n" +
        "-- GRAPH: traverse relationships (Cypher-style)\n" +
        "MATCH (a:Customer)-[:PLACED]->(o:Order {id:9001})-[:CONTAINS]->(p:Product)\n" +
        "RETURN a.name, p.sku;",
      highlights: [2, 8, 12, 15]
    },
    reference: [
      ["data model", "How facts are structured for storage & query; shapes queries/integrity/scale"],
      ["relational", "Tables of rows/columns related by keys; SQL, joins, ACID, strong integrity"],
      ["document", "Nested self-contained records (JSON/BSON); aggregate-oriented, flexible schema"],
      ["key-value", "Opaque values fetched by key; maximal speed, no queries on the value"],
      ["wide-column", "Partitioned rows with sparse column families; massive write scale, query-first"],
      ["graph", "Nodes + edges with traversal as a first-class operation"],
      ["aggregate", "An entity read/written as a unit (e.g. an order with its items)"],
      ["normalization", "Storing each fact once and referencing it (relational)"],
      ["polyglot persistence", "Using multiple data models/stores for their respective strengths"],
      ["access pattern", "How data will actually be read/written — the driver of model choice"]
    ],
    internals:
      "<p>The models differ mainly in <b>where they put the work</b> and <b>what they can enforce</b>. Relational <i>normalizes</i>: each fact is stored once and joins recombine facts at read time, which is what enables both strong integrity (a fact has one home to constrain) and arbitrary ad-hoc queries (any combination can be joined). Document databases <i>embed</i>: an aggregate is stored pre-joined as one record, so reading it is a single fetch — at the cost of duplicating shared facts and losing cross-document constraints.</p>" +
      "<p>Key-value and wide-column push toward <b>scale by giving up query generality</b>. Key-value exposes only get/put on an opaque value, which is trivial to shard and blazingly fast but blind to contents. Wide-column keeps a partition key that routes rows to nodes and clustering keys that order within a partition, enabling enormous write throughput and predictable key/range reads — but you must design tables per query up front (query-first), because there's no general join/optimizer to fall back on. Graph databases store edges alongside nodes so traversal is a local pointer-hop rather than a set-based join, making deep relationship queries cheap where relational self-joins would explode.</p>" +
      "<p>The practical upshot is <b>polyglot persistence</b>: mature systems rarely pick one. They keep transactional, integrity-critical data relational, cache hot lookups in key-value, absorb firehose writes in wide-column, and answer relationship questions in a graph — each model earning its place by matching an access pattern, at the cost of more moving parts to operate.</p>",
    engineering:
      "<p>Choose from the <b>access pattern</b>, not the trend. Ask: is the data transactional with rich relationships and integrity needs (relational)? Read and written as a self-contained aggregate (document)? Looked up by a known key at extreme speed (key-value)? Written at firehose volume with predictable key/range reads (wide-column)? Fundamentally about connections (graph)? The answer usually makes relational the safe default for core business data, with specialized stores added exactly where their strength is decisive.</p>" +
      "<p>Weigh the operational cost of mixing: every additional store is another thing to secure, back up, monitor, and keep consistent (often via CDC or dual writes, which introduce their own consistency problems). Note that the lines blur — relational engines now have strong JSON/document columns and even graph extensions — so sometimes 'one Postgres with a JSONB column' beats standing up a second database. The engineering skill is matching model to pattern <i>and</i> keeping the number of systems as small as the access patterns allow.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Model from the access pattern, not the hype.</b> How you'll read and write the data — aggregate fetch, key lookup, relationship traversal, firehose writes — is what picks the model. Relational is the safe default for transactional data." },
      { kind: "warn", html: "<b>Embedding shared, independently-updated data duplicates the update.</b> A customer copied into every order document means changing an address in thousands of docs. Embed aggregates; reference shared facts." },
      { kind: "info", html: "<b>The lines blur.</b> Relational engines now have strong JSONB/document and even graph features — often 'one Postgres' beats adding a second store, saving you the operational and consistency cost of polyglot persistence." }
    ],
    failureModes:
      "<p><b>Wrong model for the pattern:</b> forcing analytics onto row-store OLTP, ad-hoc queries onto key-value, or firehose writes onto a single relational node. <i>Fix:</i> match model to access pattern; add a specialized store where it clearly wins.</p>" +
      "<p><b>Over-embedding in documents:</b> duplicating shared, independently-updated facts leads to inconsistency and mass updates. <i>Fix:</i> embed true aggregates; reference shared entities.</p>" +
      "<p><b>Relational-thinking a wide-column store:</b> expecting ad-hoc joins/filters instead of query-first table design. <i>Fix:</i> design one table per query pattern; denormalize deliberately.</p>" +
      "<p><b>Polyglot sprawl:</b> too many stores kept in sync via fragile dual-writes/CDC, multiplying operational and consistency risk. <i>Fix:</i> minimize stores; use one engine's multi-model features when they suffice.</p>",
    quickCheck: [
      {
        q: "Which data model stores each entity as one self-contained nested record, read and written as a whole?",
        options: ["Relational", "Document", "Key-value", "Graph"],
        answer: 1,
        why: "The document model embeds an aggregate (e.g. an order with its customer snapshot and items array) as a single nested JSON/BSON record — fetched in one read with no joins, at the cost of duplication and weaker cross-document integrity.",
        diff: "easy"
      },
      {
        q: "You need to look up rendered pages and sessions by a known key at sub-millisecond speed, with no queries into the value. Which model?",
        options: ["Graph", "Relational", "Key-value", "Wide-column"],
        answer: 2,
        why: "Key-value trades all query power for speed and simplicity: O(1) get/put on an opaque value that shards cleanly. That's exactly the caching/session use case; you never query inside the value.",
        diff: "medium"
      },
      {
        q: "A query like 'customers who bought this also bought…' over many hops is most naturally served by which model?",
        options: ["Graph", "Key-value", "Document", "Wide-column"],
        answer: 0,
        why: "Graph databases store edges with nodes so traversing relationships is a local hop rather than a set-based join. Deep relationship questions (recommendations, fraud rings, paths) that would be many expensive self-joins in relational are natural here.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Compare the major data models and when you'd choose each.",
        a: "Relational stores facts as normalized tables joined by keys; choose it when you need transactions, enforced integrity, and flexible ad-hoc queries over related entities — the default for business data. Document stores each entity as a self-contained nested record; choose it when data is read/written as an aggregate and schema flexibility matters more than cross-entity joins. Key-value maps keys to opaque values with O(1) get/put; choose it for caching, sessions, and known-key lookups where you never query the value. Wide-column partitions sparse column families by row key; choose it for massive write throughput and predictable key/range access with query-first table design (time-series, feeds). Graph makes nodes and edges first-class for traversal; choose it when the questions are deep relationship queries — recommendations, fraud, paths. The selector is always the access pattern plus integrity and scale needs.",
        tip: "For each model give one strength and one use case — breadth with concreteness beats a long taxonomy."
      },
      {
        q: "What is polyglot persistence and what are its trade-offs?",
        a: "Polyglot persistence is using more than one data model/store in a single system, each for the part of the workload its strengths fit — for example Postgres for transactional orders and inventory, Redis for caching and sessions, Cassandra for a high-volume clickstream, and a graph store for recommendations. The benefit is that each access pattern gets a model that serves it well instead of forcing everything into one. The cost is operational and correctness overhead: every additional store must be secured, backed up, monitored, and kept consistent with the others — usually via CDC or dual writes, which introduce their own consistency and failure modes. Because relational engines now offer strong JSON/document and even graph features, the disciplined default is to minimize the number of stores and only add one when a distinct access pattern clearly justifies it.",
        tip: "Name the benefit AND the cost — showing you weigh operational overhead signals seniority."
      }
    ],
    businessLens: {
      task: "Store every part of ShopKart where it fits best",
      meaning: "Orders, cache, clickstream, and recommendations each want a different model.",
      system: "Polyglot data platform (Postgres · Redis · Cassandra · graph)",
      point: "One ShopKart order touches several models. Its authoritative form is relational — Postgres with foreign keys, so a checkout is transactional and no order is orphaned. The rendered product page and the shopper's session are cached key-value in Redis for speed. The clickstream behind 'trending now' is firehose writes in Cassandra. 'Customers also bought' traverses a purchase graph. Choosing each model by access pattern is what lets ShopKart be both correct where it must be and fast/scalable where it must be — the payoff, and the operational cost, of understanding data models."
    }
  };
})();
