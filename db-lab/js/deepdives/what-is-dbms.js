/* ============================================================
   deepdives/what-is-dbms.js — "What is a DBMS?" deep dive.
   Registers DBLab.deepDives['what-is-dbms'] (concept m01).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart needs to store orders. We start with the app managing raw
  // files itself, then introduce a DBMS and light up each service it provides
  // until the whole system stands.
  var SERVICES = [
    { key: "store", name: "Storage & retrieval", sub: "pages · indexes · buffer pool" },
    { key: "query", name: "Declarative queries", sub: "SQL · planner · executor" },
    { key: "concurrency", name: "Concurrency control", sub: "transactions · isolation · locks/MVCC" },
    { key: "durability", name: "Durability & recovery", sub: "WAL · checkpoints · crash recovery" },
    { key: "integrity", name: "Integrity & access control", sub: "constraints · types · permissions" }
  ];
  function svc(active) {
    var a = {}; (active || []).forEach(function (k) { a[k] = 1; });
    return SERVICES.map(function (s) {
      return { name: s.name, sub: s.sub, state: a[s.key] === 2 ? "active" : (a[s.key] === 1 ? "done" : "idle") };
    });
  }

  var STEPS = [
    {
      label: "1 · Without a DBMS: the app juggles raw files",
      what: "ShopKart needs to store orders, products, and customers. The naive approach: the application reads and writes <b>raw files</b> itself — parsing bytes, hand-rolling lookups, coordinating every writer.",
      why: "This is the baseline a DBMS replaces. It <i>works</i> for a toy, but every hard problem — concurrent writers, crash safety, fast lookups, data integrity — becomes the application's problem, re-solved badly in every app.",
      how: "The app opens <code>orders.dat</code>, seeks, parses, mutates, rewrites. There's no query language, no transactions, no enforced schema — just files and hope.",
      when: "Config files, logs, and one-off scripts legitimately live like this. A multi-user system with money in it does not.",
      mistake: "Reaching for 'just use files/JSON' for shared, concurrent, must-not-lose-it data — you end up re-implementing a worse database inside your app.",
      interview: "“Why not just store data in files?” Files give you no queries, no concurrency control, no crash recovery, and no integrity — a DBMS provides all four as a managed service.",
      example: "ShopKart v0 keeps orders in a CSV; two simultaneous checkouts overwrite the same file and one order silently vanishes.",
      viz: { mode: "nodbms", services: svc([]), note: "App ↔ raw files. No query language, no transactions, no recovery, no integrity — every guarantee is the app's burden." }
    },
    {
      label: "2 · A DBMS sits between the app and the data",
      what: "A <b>Database Management System</b> is software that sits between applications and stored data, managing its <b>storage, retrieval, and integrity</b> so applications don't have to. The app now talks to the DBMS, not to files.",
      why: "This indirection is the whole idea: the DBMS owns the hard, universal problems once, correctly, behind a clean interface — so every application gets concurrency, durability, and query power for free.",
      how: "The app sends requests (SQL) to the DBMS; the DBMS manages the on-disk representation, the memory cache, and the concurrent access. The physical layout becomes the DBMS's concern, not the app's.",
      when: "Any time data is shared, concurrent, long-lived, queried in varied ways, or must not be lost — i.e. almost every real application.",
      mistake: "Thinking a DBMS is 'just a place to put data'. It's an active system that enforces guarantees and mediates every access, not a passive file.",
      interview: "“What is a DBMS in one sentence?” Software that manages storage, retrieval, and integrity of data on behalf of applications, providing querying, concurrency, and durability as managed services.",
      example: "ShopKart moves orders into Postgres; the app issues <code>INSERT</code>/<code>SELECT</code> and never touches a file byte again.",
      viz: { mode: "dbms", services: svc(["store"]).map(function (s, i) { return i === 0 ? Object.assign(s, { state: "active" }) : s; }), note: "The DBMS mediates all access. First job: own the storage & retrieval the app used to hand-roll." }
    },
    {
      label: "3 · It gives you a declarative query language",
      what: "Instead of coding <i>how</i> to find data, you declare <i>what</i> you want in <b>SQL</b>, and the DBMS's planner figures out the fastest way to get it.",
      why: "Declarative querying decouples intent from execution: you say <code>WHERE price &lt; 20 ORDER BY sales</code>, and the optimizer picks indexes, join orders, and access paths — work you'd otherwise write and re-tune by hand.",
      how: "A query goes through parse → plan → optimize → execute. The same query can run a sequential scan today and an index scan tomorrow as data grows, with no change to your code.",
      when: "Every read and write; ad-hoc analytics especially benefit from not having to pre-plan access paths.",
      mistake: "Treating SQL as a dumb API and micro-managing execution — usually the optimizer, given good statistics and indexes, beats hand-rolled access logic.",
      interview: "“What does 'declarative' buy you?” You specify the result, not the algorithm; the DBMS chooses and re-chooses the execution plan as data and indexes change.",
      example: "ShopKart asks for 'the 10 best-selling chargers under ₹500' in one SQL statement; the planner uses an index without the app knowing it exists.",
      viz: { mode: "dbms", services: svc(["store"]).map(function (s) { return s.name.indexOf("Declarative") === 0 ? Object.assign(s, { state: "active" }) : (s.name.indexOf("Storage") === 0 ? Object.assign(s, { state: "done" }) : s); }), note: "Say WHAT, not HOW. The optimizer turns one SQL statement into an efficient plan — and re-plans as data grows." }
    },
    {
      label: "4 · It manages concurrency for many clients",
      what: "Thousands of users hit ShopKart at once. The DBMS lets them read and write <b>concurrently</b> while each sees a <b>consistent</b> view — via transactions and isolation (locking or MVCC).",
      why: "Concurrency is where naive file storage collapses (lost updates, dirty reads). The DBMS turns 'many clients touching the same rows' into a well-defined, correct experience instead of a race.",
      how: "Each unit of work runs as a transaction with an isolation level; the engine uses locks and/or multi-version snapshots so overlapping transactions don't corrupt each other's results.",
      when: "Every multi-user moment — checkouts, inventory updates, analytics running alongside writes.",
      mistake: "Assuming the database serializes everything for you regardless of isolation level. You still choose the level and design for the anomalies it permits.",
      interview: "“How does a DBMS handle many users on the same data?” Transactions plus an isolation mechanism (locking or MVCC) give each concurrent transaction a consistent view without manual coordination.",
      example: "During a flash sale, thousands of ShopKart checkouts update stock at once; MVCC lets analytics read a clean snapshot while sales commit — no lost updates.",
      viz: { mode: "dbms", services: svc([]).map(function (s) { var n = s.name; return { name: n, sub: s.sub, state: n.indexOf("Concurrency") === 0 ? "active" : (n.indexOf("Storage") === 0 || n.indexOf("Declarative") === 0 ? "done" : "idle") }; }), note: "Many clients, one consistent story. Transactions + isolation replace the app's doomed attempt to coordinate writers." }
    },
    {
      label: "5 · It guarantees durability and recovery",
      what: "When the DBMS says a transaction <b>committed</b>, that data survives a crash. After a power loss it recovers to a consistent state — committed work kept, in-flight work rolled back.",
      why: "'It's saved' has to mean it. The DBMS makes durability a guarantee (via the WAL) and atomic recovery automatic — the app never writes crash-recovery code.",
      how: "Changes are logged write-ahead and fsync'd at commit; on restart, recovery redoes committed changes and undoes uncommitted ones. Checkpoints bound how much log must be replayed.",
      when: "Every commit and every restart — the guarantee that lets you trust an order confirmation.",
      mistake: "Confusing 'the app returned success' with 'the data is durable'. Durability is defined by the DBMS's commit + fsync, not by your app's response.",
      interview: "“What makes 'committed' mean durable?” The DBMS logs the change to a durable WAL and fsyncs it before acknowledging; recovery replays it after a crash.",
      example: "A ShopKart node loses power right after 'Order placed'; on reboot the order is intact because its commit was in the durable WAL.",
      viz: { mode: "dbms", services: svc([]).map(function (s) { var n = s.name; var done = n.indexOf("Storage") === 0 || n.indexOf("Declarative") === 0 || n.indexOf("Concurrency") === 0; return { name: n, sub: s.sub, state: n.indexOf("Durability") === 0 ? "active" : (done ? "done" : "idle") }; }), note: "Committed means durable. The WAL + recovery keep committed orders and discard half-finished ones across a crash." }
    },
    {
      label: "6 · It enforces integrity and access control",
      what: "The DBMS enforces the <b>rules of the data</b>: types, <code>NOT NULL</code>, unique keys, foreign keys, checks — plus <b>who</b> may read or write what. Bad data and unauthorized access are rejected at the source.",
      why: "Centralizing integrity means the rules hold no matter which app or script writes — you can't have a negative price or an order pointing at a non-existent customer, and permissions aren't reinvented per client.",
      how: "Constraints are declared in the schema and checked on every write; roles and privileges gate access. The database is the single point where invariants are guaranteed.",
      when: "Every write is validated; every connection is authorized.",
      mistake: "Enforcing integrity only in the application. A second app, a migration, or a manual fix will eventually bypass it — the database is the backstop that can't be skipped.",
      interview: "“Why enforce constraints in the database, not just the app?” Because the database is the one gate every writer passes through; app-only rules are bypassed by other clients and scripts.",
      example: "A buggy ShopKart batch job tries to insert an order for a deleted customer; the foreign key rejects it, protecting the catalog's integrity.",
      viz: { mode: "dbms", services: svc(["store", "query", "concurrency", "durability", "integrity"]).map(function (s) { var n = s.name; return { name: n, sub: s.sub, state: n.indexOf("Integrity") === 0 ? "active" : "done" }; }), note: "The database is the backstop for the rules. Constraints + permissions hold no matter who writes." }
    },
    {
      label: "7 · The payoff: one system, many guarantees",
      what: "Put together, these services <b>are</b> the DBMS. The app issues SQL; behind that one interface sit storage, querying, concurrency, durability, and integrity — all working at once.",
      why: "This is why we use a database instead of files: a lifetime of hard, universal problems solved once, correctly, behind a declarative interface — so ShopKart's engineers build features, not storage engines.",
      how: "A single request flows through connection handling → query processing → execution → the storage engine and its transaction/lock/log managers → disk, and comes back as a result the app can trust. (That anatomy is the next concept: DBMS Architecture.)",
      when: "Every interaction with the database benefits from the full stack simultaneously.",
      mistake: "Under-valuing what you get 'for free'. Rebuilding even one of these services well (say, crash recovery) is a multi-year effort — the DBMS gives you all of them.",
      interview: "“Summarize what a DBMS provides.” Managed storage & retrieval, a declarative query language, concurrency control, durability/recovery, and integrity/security — behind one interface.",
      example: "ShopKart's team ships checkout, search, and reporting features on top of Postgres, trusting it for every guarantee they'd otherwise have to build.",
      viz: { mode: "dbms", services: svc([]).map(function (s) { return { name: s.name, sub: s.sub, state: "done" }; }), note: "All services active behind one SQL interface. That whole stack, working together, is what 'a database' means." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function layer(s) {
      var cls = "dd-stack-layer" + (s.state === "active" ? " active" : (s.state === "done" ? " done" : " muted"));
      var tag = s.state === "active" ? "▶ active" : (s.state === "done" ? "✓ provided" : "—");
      return '<div class="' + cls + '"><div class="dd-stack-hd"><span class="dd-stack-name">' + s.name + "</span>" +
        '<span class="dd-stack-tag">' + tag + '</span></div><div class="dd-stack-sub">' +
        s.sub.split(" · ").map(function (c) { return '<span class="dd-kv-item">' + c + "</span>"; }).join("") + "</div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to go from ShopKart juggling raw files to a full DBMS — ' +
          "watching each service it provides (queries, concurrency, durability, integrity) switch on.</div>";
        return;
      }
      var head = s.mode === "nodbms"
        ? '<div class="dd-verdict bad"><b>ShopKart app</b> ↔ <b>raw files</b> — no mediator, every guarantee is the app’s problem.</div>'
        : '<div class="dd-verdict ok"><b>ShopKart app</b> → <b>DBMS</b> → <b>disk</b> — one interface (SQL), many guarantees below it.</div>';
      var html = '<div class="dd-section"><div class="dd-section-label">System</div>' + head + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">DBMS services</div>' +
        '<div class="dd-stack">' + s.services.map(layer).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["what-is-dbms"] = {
    slug: "what-is-dbms",
    overview: {
      what: "A <b>DBMS (Database Management System)</b> is software that sits between applications and stored data, managing its <b>storage, retrieval, and integrity</b> — and providing a declarative query language, concurrency control, durability/recovery, and access control as managed services.",
      why: "Every non-trivial application needs concurrent access, crash safety, flexible queries, and enforced data rules. Without a DBMS the application must re-solve all of these itself — badly. A DBMS owns these universal, hard problems once, correctly, behind one interface.",
      how: "Applications send requests (typically SQL) to the DBMS instead of touching files. The DBMS parses and optimizes the query, executes it against a storage engine (buffer pool, indexes, access methods), coordinates concurrent transactions, logs changes for durability, and enforces schema constraints and permissions on every access."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The same task: raw files vs a DBMS",
      lang: "sql",
      code:
        "-- Without a DBMS (application code): open, parse, mutate, coordinate, rewrite\n" +
        "--   f = open('orders.dat'); rows = parse(f); ... ; lock??; rewrite(f)\n" +
        "--   → you hand-build indexing, concurrency, recovery, and integrity\n" +
        "\n" +
        "-- With a DBMS: declare the schema once; the system enforces the rules\n" +
        "CREATE TABLE orders (\n" +
        "  id         bigserial PRIMARY KEY,\n" +
        "  customer_id bigint NOT NULL REFERENCES customers(id),  -- integrity\n" +
        "  total_cents int    NOT NULL CHECK (total_cents >= 0),  -- integrity\n" +
        "  placed_at  timestamptz NOT NULL DEFAULT now()\n" +
        ");\n" +
        "\n" +
        "BEGIN;                                        -- concurrency + durability\n" +
        "  INSERT INTO orders(customer_id, total_cents) VALUES (42, 1999);\n" +
        "COMMIT;                                        -- durable once this returns\n" +
        "\n" +
        "SELECT id, total_cents FROM orders             -- declarative: say WHAT\n" +
        "WHERE customer_id = 42 ORDER BY placed_at DESC; --   planner picks HOW",
      highlights: [6, 7, 11, 14]
    },
    reference: [
      ["DBMS", "Software managing storage, retrieval, and integrity of data for applications"],
      ["database", "The organized collection of data the DBMS manages"],
      ["schema", "The declared structure & rules of the data (tables, types, constraints)"],
      ["SQL", "Declarative query language: specify the result, not the algorithm"],
      ["transaction", "An all-or-nothing unit of work with ACID guarantees"],
      ["concurrency control", "Mechanism (locks/MVCC) letting many clients share data consistently"],
      ["durability", "Committed data survives crashes (via the WAL)"],
      ["integrity", "Enforced rules — types, keys, constraints — that data must satisfy"],
      ["query optimizer", "Chooses an efficient execution plan for a declarative query"],
      ["access control", "Roles & privileges governing who may read/write what"]
    ],
    internals:
      "<p>A DBMS is best understood as a stack of cooperating services behind one interface. At the bottom, a <b>storage engine</b> lays data out in pages, caches them in a <b>buffer pool</b>, and offers <b>access methods</b> (heaps, B-trees) for fast retrieval. Above it, a <b>query processor</b> parses SQL, plans and optimizes it, and executes the chosen plan. Around both, a <b>transaction manager</b> (with lock manager and log manager) provides ACID: concurrency via locking or MVCC, durability via write-ahead logging, atomic recovery via redo/undo.</p>" +
      "<p>The defining move is <b>declarative access</b>. Because you state the result you want rather than the procedure to compute it, the optimizer is free to choose and re-choose execution strategies as data volume, distribution, and indexes change — the same query improving without code changes. That indirection is what makes a database adaptable where hand-rolled file access is frozen.</p>" +
      "<p>Everything else — constraints, types, foreign keys, permissions — is centralized so it holds regardless of which client writes. The database becomes the single authoritative gate: the one place invariants are guaranteed and access is authorized, no matter how many applications, scripts, or humans touch the data.</p>",
    engineering:
      "<p>Choosing 'a database' over files or a bespoke store is really choosing to <b>not</b> rebuild concurrency, durability, and recovery yourself — each a multi-year effort to get right. The engineering judgment is which <i>kind</i> of DBMS fits: a relational OLTP engine for transactional integrity, a document store for flexible nested data, a columnar warehouse for analytics, a key-value store for caching. They trade the same guarantees differently.</p>" +
      "<p>Design implications follow from what the DBMS gives you: push integrity into the schema (constraints, foreign keys) rather than trusting every client; keep transactions short so concurrency control stays cheap; let the optimizer work by maintaining statistics and the right indexes instead of micro-managing access paths; and treat the database as the security and correctness boundary, not just a bucket. The rest of this track opens each of these services in turn.</p>",
    gotchas: [
      { kind: "tip", html: "<b>The database is the one gate every writer passes through.</b> Enforce invariants there (constraints, foreign keys) — app-only rules get bypassed by the next app, migration, or manual fix." },
      { kind: "info", html: "<b>Declarative ≠ slow.</b> Given good statistics and indexes, the optimizer usually beats hand-rolled access logic, and keeps beating it as data grows — because it re-plans and your code doesn't." },
      { kind: "warn", html: "<b>'The app returned success' is not 'the data is durable.'</b> Durability is defined by the DBMS's commit + fsync, not your application's response. Know where that line is." }
    ],
    failureModes:
      "<p><b>Re-implementing a database in the app:</b> starting with files/JSON for shared concurrent data, then bolting on locking, indexing, and recovery — badly. <i>Fix:</i> use a real DBMS once the data is shared, concurrent, or must not be lost.</p>" +
      "<p><b>Integrity only in application code:</b> a second writer (script, migration, other service) bypasses the rules and corrupts the data. <i>Fix:</i> declare constraints and foreign keys in the schema.</p>" +
      "<p><b>Wrong class of DBMS:</b> forcing analytics onto a row-store OLTP engine, or transactions onto an eventually-consistent KV store. <i>Fix:</i> match the engine's guarantees to the workload.</p>" +
      "<p><b>Treating the DBMS as a passive bucket:</b> ignoring the optimizer, transactions, and constraints, so you get neither performance nor safety. <i>Fix:</i> lean on the services it provides.</p>",
    quickCheck: [
      {
        q: "What most fundamentally distinguishes a DBMS from just storing data in files?",
        options: [
          "It compresses data",
          "It provides managed querying, concurrency, durability, and integrity behind one interface",
          "It stores data on faster disks",
          "It always uses less space"
        ],
        answer: 1,
        why: "A DBMS is an active system that manages storage/retrieval and layers on a query language, concurrency control, crash-safe durability, and enforced integrity — the guarantees raw files leave entirely to the application.",
        diff: "easy"
      },
      {
        q: "Why enforce a constraint like a foreign key in the database rather than in application code?",
        options: [
          "It's faster to type",
          "The database is the single gate every writer passes through, so the rule can't be bypassed",
          "Application code can't check foreign keys",
          "It saves storage"
        ],
        answer: 1,
        why: "Any number of apps, scripts, migrations, or manual edits can write to the database. Only a constraint declared in the database itself holds for all of them; app-only checks are bypassed by every other writer.",
        diff: "medium"
      },
      {
        q: "What does a declarative query language (SQL) let the DBMS do that a hand-coded fetch cannot?",
        options: [
          "Run without a CPU",
          "Choose and re-choose an efficient execution plan as data and indexes change, with no code change",
          "Avoid reading from disk",
          "Guarantee results are always cached"
        ],
        answer: 1,
        why: "Declaring the result rather than the procedure lets the optimizer pick access paths, join orders, and indexes — and revise them as statistics change — so the same query keeps performing well without you rewriting it.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "What is a DBMS, and what does it provide that raw file storage doesn't?",
        a: "A DBMS is software that sits between applications and stored data, managing its storage, retrieval, and integrity so applications don't have to. Beyond just persisting bytes, it provides four things files don't: a declarative query language (you state the result; the optimizer picks the execution plan and re-plans as data changes), concurrency control (transactions plus locking or MVCC let many clients share data consistently without lost updates or dirty reads), durability and recovery (committed data survives crashes via the WAL, and recovery restores a consistent state), and integrity plus access control (types, keys, constraints, and permissions enforced at the single gate every writer passes through). With files, the application must re-implement all of these — usually incorrectly.",
        tip: "List the four services — query, concurrency, durability, integrity — then note they're 'solved once, correctly, behind one interface.'"
      },
      {
        q: "When would you NOT use a full DBMS, and how do you choose among database types?",
        a: "Files or a lightweight store are fine when data isn't shared or concurrent and needn't be recovered — config, logs, caches, one-off scripts. Once data is shared by multiple writers, must survive crashes, needs varied queries, or must enforce invariants, you want a DBMS. Choosing among them is about matching guarantees to the workload: a relational OLTP engine (Postgres/MySQL) for transactional integrity and rich queries; a document store for flexible nested data with fewer cross-entity constraints; a columnar warehouse for large-scale analytics; a key-value store for low-latency caching; a graph database for highly connected traversals. The trade is always some mix of consistency, query flexibility, and scale.",
        tip: "Show you know files are sometimes right — then pivot to matching the engine's guarantees to the workload."
      }
    ],
    businessLens: {
      task: "Move ShopKart from files to a database as it grows",
      meaning: "Concurrent checkouts, durable orders, and enforced rules become guarantees, not app code.",
      system: "OLTP application backing store (Postgres)",
      point: "When ShopKart was a prototype, a CSV worked. The moment two customers checked out at once — or a crash lost a confirmed order, or a bug wrote a negative price — the app was being asked to reinvent a database, poorly. Adopting a DBMS hands all of that to one system: SQL for every query, transactions for concurrency, the WAL for durability, constraints for integrity. ShopKart's engineers then spend their time on checkout and search, trusting the database for the guarantees they'd otherwise spend years rebuilding."
    }
  };
})();
