/* ============================================================
   deepdives/relational-model.js — "Relational Model" deep dive.
   Registers DBLab.deepDives['relational-model'] (concept m05).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart's customers & orders as formal relations. We label the
  // parts (attributes, tuples, domains, degree, cardinality), define keys, and
  // show entity + referential integrity in action.
  function rel(name, cols, rows, marks) {
    marks = marks || {};
    return { name: name, cols: cols, rows: rows, pk: marks.pk, fk: marks.fk };
  }
  var CUSTOMERS = rel("customers", ["id", "name", "city"],
    [["7", "Ana", "Pune"], ["8", "Ravi", "Delhi"]], { pk: 0 });
  var ORDERS = rel("orders", ["id", "customer_id", "total"],
    [["9001", "7", "1998"], ["9002", "8", "799"]], { pk: 0, fk: 1 });

  var STEPS = [
    {
      label: "1 · Everything is a relation",
      what: "The <b>relational model</b> represents all data as <b>relations</b> — what we call tables. A relation is a <b>set of tuples</b> (rows) over a fixed set of named, typed <b>attributes</b> (columns). ShopKart's customers are one relation.",
      why: "This single, uniform abstraction — everything is a relation — is the model's power. One consistent structure supports a whole algebra of operations and a declarative language (SQL) on top.",
      how: "A relation has a <b>schema</b> (its attribute names and domains) and an <b>instance</b> (the current set of tuples). <code>customers(id, name, city)</code> is the schema; the two rows are the instance.",
      when: "The foundation of every relational database (Postgres, MySQL, Oracle, SQL Server) and the SQL you write on them.",
      mistake: "Thinking of a table as a spreadsheet or a file of lines. Formally it's a set of tuples over typed attributes — a distinction that drives keys, integrity, and set-based queries.",
      interview: "“What is the relational model in one line?” Data as relations — sets of tuples over named, typed attributes — with a formal algebra and declarative queries on top.",
      example: "ShopKart's <code>customers</code> relation holds Ana and Ravi as tuples over the attributes id, name, city.",
      viz: { relations: [CUSTOMERS], legend: [["relation", "a table: a set of tuples"], ["attribute", "a named, typed column"], ["tuple", "a row"]], note: "A relation = a set of tuples over named, typed attributes. Everything in the model is this one shape." }
    },
    {
      label: "2 · Anatomy: attributes, tuples, domains",
      what: "Each <b>attribute</b> has a <b>domain</b> (its allowed values/type): <code>id</code> is an integer, <code>city</code> is text. The number of attributes is the relation's <b>degree</b>; the number of tuples is its <b>cardinality</b>.",
      why: "Domains are the model's first line of integrity — a value that isn't in an attribute's domain simply can't be stored. Degree and cardinality are the vocabulary for reasoning about relations.",
      how: "Schema fixes the attributes and their domains; the instance supplies tuples whose every value lies in the corresponding domain. <code>customers</code> has degree&nbsp;3 and (right now) cardinality&nbsp;2.",
      when: "Every table definition sets domains (column types) and thereby the shape of valid data.",
      mistake: "Storing everything as text and validating in the app. Domains (proper column types) let the database reject impossible values — a date in a numeric column can't happen.",
      interview: "“Define degree and cardinality.” Degree = number of attributes (columns); cardinality = number of tuples (rows). Domain = the set of allowed values for an attribute.",
      example: "ShopKart types <code>total</code> as an integer (cents), so 'ninety-nine' can never be stored where a number belongs.",
      viz: { relations: [CUSTOMERS], legend: [["domain", "allowed values/type of an attribute"], ["degree", "number of attributes (= 3)"], ["cardinality", "number of tuples (= 2)"]], note: "Attributes carry domains (types); degree = columns, cardinality = rows. Domains are integrity #1." }
    },
    {
      label: "3 · A relation is a set",
      what: "A relation is a <b>set</b> of tuples: <b>no duplicate rows</b> and <b>no inherent order</b>. A tuple is identified by its <b>values</b>, never by a position or a line number.",
      why: "This set semantics is why keys exist (you identify a row by value, so you need a unique value to do it) and why SQL is order-independent unless you ask for <code>ORDER BY</code>. It's the formal difference from a file of lines.",
      how: "Because there's no order, the optimizer is free to return/scan tuples however is fastest. Because there are no duplicates (in the pure model), each tuple must be distinguishable by some set of attribute values.",
      when: "Always — it underlies why you can't rely on 'insertion order' and why every table wants a key.",
      mistake: "Relying on rows coming back 'in the order I inserted them'. Without <code>ORDER BY</code> there is no guaranteed order — the model has none.",
      interview: "“Why is 'a relation is a set' significant?” No duplicates and no order → rows are identified by value (hence keys), and query results are unordered unless you sort.",
      example: "ShopKart can't ask for 'the 3rd row of customers' — it asks for the customer <i>where id = 7</i>. Identity is by value.",
      viz: { relations: [CUSTOMERS], legend: [["set semantics", "no duplicate tuples"], ["no order", "identify by value, not position"], ["⇒ keys", "need a unique value to identify a row"]], note: "A relation has no duplicates and no order. You identify a tuple by its values — which is exactly why keys exist." }
    },
    {
      label: "4 · Keys & entity integrity",
      what: "A <b>superkey</b> is any set of attributes that's unique per tuple; a minimal one is a <b>candidate key</b>; the one you choose is the <b>primary key</b>. <code>customers.id</code> is the primary key. <b>Entity integrity</b>: primary-key attributes can't be <code>NULL</code>.",
      why: "Keys are how the set model actually identifies tuples. Entity integrity guarantees every row is addressable — a null (unknown) key would mean a row you can't reliably reference.",
      how: "The database enforces the primary key as <b>unique + not null</b>, typically with an index. Any insert that duplicates the key or leaves it null is rejected.",
      when: "Every table should declare a primary key; other candidate keys become UNIQUE constraints.",
      mistake: "Tables with no primary key — you lose reliable row identity, safe updates/deletes of a single row, and referential targets.",
      interview: "“Superkey vs candidate vs primary key?” Superkey = any unique attribute set; candidate = a minimal superkey; primary = the chosen candidate key (unique + not null = entity integrity).",
      example: "ShopKart makes <code>customers.id</code> the primary key (unique, never null), so every order can point to exactly one, always-present customer.",
      viz: { relations: [CUSTOMERS], legend: [["superkey", "any unique attribute set"], ["candidate key", "a minimal superkey"], ["primary key", "chosen candidate — unique + NOT NULL"], ["entity integrity", "PK attributes can't be null"]], note: "PK highlighted. Primary key = unique + not null (entity integrity) → every tuple is reliably addressable." }
    },
    {
      label: "5 · Foreign keys & referential integrity",
      what: "A <b>foreign key</b> is an attribute that references another relation's primary key. <code>orders.customer_id</code> references <code>customers.id</code>. <b>Referential integrity</b>: every foreign-key value must match an existing primary key — <b>no orphans</b>.",
      why: "This is how the model links relations <i>and guarantees the link is valid</i>. You can't have an order pointing at a customer who doesn't exist — the database enforces it on every write.",
      how: "The foreign key is checked on insert/update of the child and on delete/update of the parent (with actions like <code>RESTRICT</code>, <code>CASCADE</code>, <code>SET NULL</code>). An order for customer&nbsp;99 (who doesn't exist) is rejected.",
      when: "Any relationship between entities — orders→customers, order_items→orders/products, etc.",
      mistake: "Skipping foreign keys 'for performance' and letting the app maintain them — orphan rows accumulate the first time any other writer misbehaves.",
      interview: "“What does a foreign key guarantee?” Referential integrity: every FK value references an existing PK, so relationships can't dangle — enforced by the database on every write.",
      example: "A ShopKart batch job tries to insert order (9003 → customer 99); the foreign key rejects it because customer 99 isn't in <code>customers</code>.",
      viz: {
        relations: [CUSTOMERS, ORDERS],
        link: { from: "orders.customer_id", to: "customers.id" },
        legend: [["foreign key", "attribute referencing another relation's PK"], ["referential integrity", "every FK value matches an existing PK"], ["reject", "order → customer 99 (doesn't exist)"]],
        verdict: { tone: "bad", html: "<b>INSERT orders(9003, customer_id=99):</b> rejected — customer 99 doesn't exist. Referential integrity holds; no orphan order." },
        note: "orders.customer_id → customers.id. The DB guarantees the referenced customer exists — no dangling relationships."
      }
    },
    {
      label: "6 · Closure: operations on relations yield relations",
      what: "The model is <b>closed</b>: every operation on relations (select, project, join, union…) produces <b>another relation</b>. A query's result is itself a relation — which is why results compose and can feed further queries.",
      why: "Closure is what makes <b>relational algebra</b> — and SQL built on it — so composable. You can nest queries, build views, and chain operations because the output is always the same kind of thing as the input.",
      how: "<code>σ</code> (select/filter), <code>π</code> (project/choose columns), <code>⋈</code> (join), and set operations each take relations and return a relation. SQL's <code>SELECT</code> is these operators; a subquery or view is just a relation.",
      when: "Every SQL query — and especially views, CTEs, and subqueries, which rely on results being relations.",
      mistake: "Not realizing a view or subquery is 'just a relation' — once you see closure, composing queries and building views stops feeling like magic.",
      interview: "“Why is the relational model 'closed', and why does it matter?” Operations on relations return relations, so queries compose — enabling relational algebra, views, and nested SQL.",
      example: "ShopKart joins <code>orders ⋈ customers</code>, projects a few columns, and filters to Pune — every step a relation, so the whole thing composes into one query or a reusable view.",
      viz: {
        relations: [ORDERS],
        legend: [["σ select", "filter tuples (WHERE)"], ["π project", "choose attributes (SELECT cols)"], ["⋈ join", "combine relations on a condition"], ["closure", "each returns a relation → composable"]],
        verdict: { tone: "ok", html: "<b>orders ⋈ customers → π(name, total) → σ(city='Pune')</b> — every step yields a relation, so it all composes into one query or a view." },
        note: "Relational algebra: operators take relations and return relations. Closure is why SQL, views, and subqueries compose."
      }
    },
    {
      label: "7 · Why the relational model endures",
      what: "Fifty years on, relational is still the default because it combines <b>declarative set-based queries</b>, <b>provable integrity</b> (keys + constraints), and <b>physical data independence</b> — the logical schema is separate from how data is stored.",
      why: "You state <i>what</i> you want; integrity is enforced by the model, not app code; and storage/indexes can change underneath without breaking your queries. That durability of design is why SQL outlived many challengers.",
      how: "The logical model (relations, keys, constraints) is defined once; the physical layer (files, pages, indexes, plans) is free to evolve — add an index, change storage, and the same SQL keeps working, just faster.",
      when: "The default choice for transactional, integrity-critical data — and the baseline every other model is compared against.",
      mistake: "Dismissing relational as 'old' — its formal foundation is exactly why it's predictable, tunable, and safe where correctness matters.",
      interview: "“Why has the relational model endured?” Declarative set-based queries, enforced integrity via keys/constraints, and physical data independence — a formal foundation that stays correct as storage evolves.",
      example: "ShopKart adds indexes and repartitions its Postgres tables over the years; the application's SQL never changes — physical data independence in action.",
      viz: {
        relations: [CUSTOMERS, ORDERS],
        link: { from: "orders.customer_id", to: "customers.id" },
        legend: [["declarative", "say what, not how"], ["integrity", "keys + constraints enforced by the model"], ["data independence", "logical schema separate from storage"]],
        verdict: { tone: "ok", html: "<b>Relations + keys + closure + data independence</b> — a formal foundation that stays correct and declarative as storage and indexes evolve underneath." },
        note: "The endurance formula: declarative set-based queries, provable integrity, and physical data independence. This is what SQL is built on."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function relTable(r) {
      var head = "<thead><tr>" + r.cols.map(function (c, i) {
        var cls = i === r.pk ? " class=\"pk\"" : (i === r.fk ? " class=\"fk\"" : "");
        var badge = i === r.pk ? " 🔑" : (i === r.fk ? " ↗" : "");
        return "<th" + cls + ">" + c + badge + "</th>";
      }).join("") + "</tr></thead>";
      var body = "<tbody>" + r.rows.map(function (row) {
        return "<tr>" + row.map(function (v, i) {
          var cls = i === r.pk ? " class=\"pk\"" : (i === r.fk ? " class=\"fk\"" : "");
          return "<td" + cls + ">" + v + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
      return '<div class="dd-relwrap"><div class="dd-rel-name">' + r.name + "</div>" +
        '<div class="dd-matrix-wrap"><table class="dd-matrix">' + head + body + "</table></div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to build up the relational model on ShopKart\'s data — relations, ' +
          "attributes, keys, and the entity & referential integrity that keep it sound.</div>";
        return;
      }
      var relsHtml;
      if (s.relations.length === 2 && s.link) {
        relsHtml = '<div class="dd-relrow">' + relTable(s.relations[1]) +
          '<div class="dd-flow"><span class="dd-flow-arrow">→</span>FK</div>' + relTable(s.relations[0]) + "</div>";
      } else {
        relsHtml = s.relations.map(relTable).join("");
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Relations</div>' + relsHtml + "</div>";
      if (s.verdict) html += '<div class="dd-verdict ' + s.verdict.tone + '">' + s.verdict.html + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">Vocabulary</div><div class="dd-kv-list">' +
        s.legend.map(function (l) { return '<span class="dd-kv-item"><i>' + l[0] + "</i> " + l[1] + "</span>"; }).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["relational-model"] = {
    slug: "relational-model",
    overview: {
      what: "The <b>relational model</b> represents all data as <b>relations</b> (tables): sets of <b>tuples</b> (rows) over named, typed <b>attributes</b> (columns). It adds <b>keys</b> for identity, <b>integrity rules</b> (entity + referential), and a closed <b>algebra</b> of operations that SQL is built on.",
      why: "One uniform abstraction — everything is a relation — yields declarative set-based queries, provable integrity, and physical data independence. That formal foundation is why relational databases have been the default for transactional data for fifty years.",
      how: "A relation has a schema (attributes + domains) and an instance (a set of tuples — no duplicates, no order). A primary key (unique + not null) gives entity integrity; a foreign key referencing another relation's primary key gives referential integrity. Every relational operation (select, project, join, set ops) returns a relation, so queries compose."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The relational model, declared and enforced",
      lang: "sql",
      code:
        "-- Relations with attributes over domains (types)\n" +
        "CREATE TABLE customers (\n" +
        "  id   bigint PRIMARY KEY,          -- entity integrity: unique + NOT NULL\n" +
        "  name text   NOT NULL,\n" +
        "  city text\n" +
        ");\n" +
        "\n" +
        "CREATE TABLE orders (\n" +
        "  id          bigint PRIMARY KEY,\n" +
        "  customer_id bigint NOT NULL REFERENCES customers(id),  -- referential integrity\n" +
        "  total_cents int    NOT NULL CHECK (total_cents >= 0)\n" +
        ");\n" +
        "\n" +
        "-- Relational algebra as SQL: join ⋈, project π, select σ — result is a relation\n" +
        "SELECT c.name, o.total_cents                     -- π (project)\n" +
        "FROM orders o JOIN customers c ON c.id = o.customer_id  -- ⋈ (join)\n" +
        "WHERE c.city = 'Pune';                           -- σ (select)\n" +
        "\n" +
        "INSERT INTO orders VALUES (9003, 99, 500);  -- ERROR: customer 99 doesn't exist",
      highlights: [3, 10, 17, 19]
    },
    reference: [
      ["relation", "A table: a set of tuples over named, typed attributes"],
      ["tuple", "A row of a relation"],
      ["attribute", "A named column, with a domain"],
      ["domain", "The set of allowed values (type) for an attribute"],
      ["degree / cardinality", "Number of attributes / number of tuples"],
      ["superkey → candidate → primary", "Any unique attr set → minimal one → the chosen one"],
      ["entity integrity", "Primary-key attributes are unique and NOT NULL"],
      ["foreign key", "An attribute referencing another relation's primary key"],
      ["referential integrity", "Every foreign-key value matches an existing primary key"],
      ["closure", "Operations on relations return relations (relational algebra)"]
    ],
    internals:
      "<p>The model's rigor comes from treating a relation as a <b>set of tuples over typed attributes</b>. 'Set' means no duplicates and no order, so a tuple can only be identified by its values — which is precisely why <b>keys</b> are fundamental rather than incidental. A superkey is any attribute set that's unique across tuples; a candidate key is a minimal superkey; the primary key is the candidate you designate, enforced as unique and not null. That enforcement is <b>entity integrity</b>: every tuple is guaranteed to be addressable.</p>" +
      "<p><b>Referential integrity</b> extends identity across relations. A foreign key is an attribute whose values must appear as a primary key in the referenced relation, checked on writes to the child and on deletes/updates of the parent (via RESTRICT/CASCADE/SET NULL). Together, entity and referential integrity mean the database — not the application — guarantees that rows are identifiable and that relationships never dangle.</p>" +
      "<p>The final pillar is <b>closure</b>: the relational algebra's operators (selection σ, projection π, join ⋈, and the set operations) each take relations and return a relation. Because the output is the same kind of object as the input, operations compose without limit — which is exactly what lets SQL nest subqueries, define views, and chain transformations. SQL is essentially a practical surface over this algebra, and the separation of the logical relation from its physical storage gives <b>physical data independence</b>: indexes and storage can change while the same queries keep working.</p>",
    engineering:
      "<p>The practical takeaways are design habits. Give every table a <b>primary key</b> (entity integrity) so rows are reliably identifiable and can be referenced. Use <b>foreign keys</b> to make relationships valid by construction rather than by hope — the small write-time cost buys you the guarantee that no orphan rows exist, no matter which app or script writes. Pick proper <b>domains</b> (column types) instead of storing everything as text, so impossible values are rejected at the source.</p>" +
      "<p>Lean on <b>physical data independence</b>: because the logical schema is separate from storage, you can add indexes, change fill factors, partition, or switch access methods to tune performance without touching application SQL. And recognize that views, CTEs, and subqueries are 'just relations' thanks to closure — a powerful tool for building reusable, composable query layers. Deliberate denormalization (for read performance) is a conscious departure from the pure model, made with eyes open to the redundancy it reintroduces.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Every table wants a primary key.</b> A relation is a set, so rows are identified by value — without a PK you lose reliable single-row identity, safe updates/deletes, and referential targets." },
      { kind: "warn", html: "<b>Skipping foreign keys lets orphans in.</b> 'The app maintains it' fails the first time any other writer misbehaves. Referential integrity enforced by the database can't be bypassed." },
      { kind: "info", html: "<b>Results have no order unless you ask.</b> A relation is unordered; relying on 'insertion order' without <code>ORDER BY</code> is undefined behavior the model never promised." }
    ],
    failureModes:
      "<p><b>Keyless tables:</b> no primary key means no reliable row identity — duplicate rows, unsafe single-row updates/deletes, and nothing for foreign keys to reference. <i>Fix:</i> declare a primary key on every table.</p>" +
      "<p><b>Orphan rows:</b> foreign keys omitted 'for performance', so child rows reference missing parents. <i>Fix:</i> declare foreign keys; let the database enforce referential integrity.</p>" +
      "<p><b>Domain-less columns:</b> everything stored as text and validated in the app, letting impossible values in. <i>Fix:</i> proper column types (domains) plus CHECK constraints.</p>" +
      "<p><b>Order dependence:</b> code relying on unspecified row order breaks when the plan changes. <i>Fix:</i> always sort explicitly with <code>ORDER BY</code> when order matters.</p>",
    quickCheck: [
      {
        q: "In the relational model, what does 'a relation is a set' imply?",
        options: [
          "Rows are stored in insertion order",
          "No duplicate tuples and no inherent order — rows are identified by value",
          "Every column must be unique",
          "Relations can't be joined"
        ],
        answer: 1,
        why: "Set semantics means no duplicate tuples and no guaranteed order. Because you can't rely on position, tuples are identified by their values — which is exactly why keys are fundamental to the model.",
        diff: "easy"
      },
      {
        q: "What does declaring customer_id in orders as a foreign key to customers(id) guarantee?",
        options: [
          "orders is sorted by customer_id",
          "Every customer_id value references an existing customer — no orphan orders",
          "customer_id is unique in orders",
          "customers can't be deleted, ever"
        ],
        answer: 1,
        why: "A foreign key enforces referential integrity: every foreign-key value must match an existing primary key. The database rejects an order referencing a non-existent customer, so relationships can never dangle.",
        diff: "medium"
      },
      {
        q: "Why does the relational model's 'closure' property let SQL compose (views, subqueries, CTEs)?",
        options: [
          "Because tables are stored contiguously",
          "Because every relational operation returns a relation, so outputs feed further operations",
          "Because SQL caches results",
          "Because relations are always sorted"
        ],
        answer: 1,
        why: "Closure means operators (select, project, join, set ops) take relations and return relations. Since a query result is itself a relation, it can be nested, joined, or named as a view — enabling unlimited composition.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Explain the relational model and its integrity rules.",
        a: "The relational model represents all data as relations — tables that are sets of tuples (rows) over named, typed attributes (columns). Because a relation is a set, there are no duplicate rows and no inherent order, so tuples are identified by their values, which is why keys are central. A superkey is any unique attribute set, a candidate key is a minimal superkey, and the primary key is the chosen candidate, enforced as unique and not null — that's entity integrity, guaranteeing every row is addressable. A foreign key is an attribute that references another relation's primary key, and referential integrity requires every foreign-key value to match an existing primary key, so relationships can't dangle. Finally, the model is closed: every operation (select, project, join, set operations) returns a relation, which is what makes relational algebra — and the SQL built on it — composable.",
        tip: "Hit the three pillars in order: relations as sets → keys + entity/referential integrity → closure. That structure reads as mastery."
      },
      {
        q: "Why has the relational model endured, and what is physical data independence?",
        a: "It endures because it combines three things few alternatives match together: declarative, set-based queries (you state what you want and the optimizer decides how), integrity that's provable and enforced by the model itself (keys and constraints, not application code), and physical data independence. Physical data independence means the logical schema — relations, attributes, keys, constraints — is separated from the physical storage — files, pages, indexes, access methods, query plans. You can add an index, change the storage layout, or repartition a table, and the same application SQL keeps working, just faster, because it was written against the logical model. That separation is why relational systems stay both correct and tunable over decades, and it's a large part of why SQL outlived many challengers.",
        tip: "Define physical data independence concretely — 'add an index, the SQL doesn't change' — rather than abstractly."
      }
    ],
    businessLens: {
      task: "Model ShopKart's customers and orders so relationships can't break",
      meaning: "Every order provably belongs to a real customer; queries stay declarative as storage evolves.",
      system: "OLTP schema (Postgres, relational)",
      point: "ShopKart's core is relational because correctness is non-negotiable: a primary key on customers makes every customer addressable, and a foreign key from orders guarantees no order ever references a customer who doesn't exist — enforced by the database on every write, not hoped for in app code. Meanwhile physical data independence lets the team add indexes and repartition over the years without rewriting a single query. The relational model is what lets ShopKart trust its data and keep tuning underneath it — the reason it's the default for money-touching systems."
    }
  };
})();
