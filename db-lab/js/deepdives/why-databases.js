/* ============================================================
   deepdives/why-databases.js — "Why Databases?" deep dive.
   Registers DBLab.deepDives['why-databases'] (concept m02).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart runs on spreadsheets/CSV files. Each step hits a wall that
  // files can't solve, and shows the specific database guarantee that does.
  var STEPS = [
    {
      label: "1 · ShopKart on spreadsheets",
      what: "Early ShopKart keeps everything in files: <code>products.csv</code>, <code>orders.csv</code>, <code>customers.csv</code>. One person, small data — edits are just open, change, save.",
      why: "This genuinely works at first, which is why teams start here. The question this concept answers is <i>what breaks</i> as soon as the system has real users and real stakes — each break is a reason databases exist.",
      how: "The app (or a human) reads a file into memory, mutates it, and writes it back. There's no coordination, no schema, no log — the file <i>is</i> the data.",
      when: "Prototypes, personal tools, and static reference data can live like this indefinitely.",
      mistake: "Assuming 'it works on my laptop with one user' will survive concurrency, crashes, and growth. It won't — that's the whole story.",
      interview: "“Why do databases exist at all?” Because file storage breaks under concurrency, crashes, ad-hoc queries, integrity needs, and scale — databases solve each with a guarantee.",
      example: "ShopKart v0's founder edits <code>products.csv</code> in a spreadsheet to change a price. Fine — today.",
      viz: { problem: "Baseline", files: null, dbms: null, note: "Files work for one user and small data. Now add real users, crashes, and questions — and watch each wall appear." }
    },
    {
      label: "2 · Concurrent access → lost updates",
      what: "Two ShopKart clerks change SKU&nbsp;#42's stock at the same time. Both loaded 100, one sets 90, the other sets 95, both save — the last write wins and one update <b>silently vanishes</b>.",
      why: "This is the classic <b>lost update</b>, and files have no answer for it. The instant more than one writer exists, uncoordinated read-modify-write corrupts data invisibly.",
      how: "A database wraps the change in a <b>transaction</b> with concurrency control (locking or MVCC), so the two updates are serialized or detected — neither is silently lost.",
      when: "Every multi-user write — the norm for any real application.",
      mistake: "Adding ad-hoc file locks in the app and thinking you've solved it — you've started building a database's concurrency control, minus the correctness.",
      interview: "“What's a lost update and how does a DBMS prevent it?” Two concurrent read-modify-writes clobber each other; transactions + isolation (locks/MVCC) serialize or detect the conflict.",
      example: "Warehouse and storefront both adjust SKU&nbsp;#42; with a CSV one change disappears, with a DB both apply correctly under a transaction.",
      viz: {
        problem: "Concurrent writers",
        files: "Both clerks load 100; last save wins → one update lost, no error.",
        dbms: "Transaction + isolation serialize/detect the conflict → no lost update.",
        mechanism: "transactions · MVCC/locks",
        note: "The moment there are two writers, uncoordinated files silently lose data."
      }
    },
    {
      label: "3 · Crash mid-write → corruption",
      what: "The process dies while rewriting <code>orders.csv</code>. The file is left <b>half-written</b> — a torn record, or an order partly applied. There's no way to know what completed.",
      why: "Files give you no <b>atomicity</b> and no <b>durability</b> guarantee: a crash can leave data in an impossible in-between state, and a 'saved' change may not have reached disk.",
      how: "A database logs changes <b>write-ahead</b> and commits atomically; on restart, recovery redoes committed work and undoes partial work — the database returns to a consistent state, every time.",
      when: "Any unclean stop: power loss, OOM kill, crash — rare per day, inevitable over a system's life.",
      mistake: "Trusting that 'write to a temp file then rename' covers you. It helps for whole-file swaps but not for concurrent, incremental, multi-file changes with real durability.",
      interview: "“What happens to a file on a crash mid-write vs a database?” The file can be torn/partial with no record of state; the database recovers atomically via the WAL.",
      example: "A ShopKart node loses power writing an order; the CSV is corrupt, but a database recovers the confirmed order and discards the half-finished one.",
      viz: {
        problem: "Crash mid-write",
        files: "orders.csv left torn/partial — no record of what completed.",
        dbms: "WAL + recovery: committed work redone, partial work undone → consistent state.",
        mechanism: "atomicity · durability (WAL)",
        note: "Files have no atomic commit; a crash can leave impossible in-between data."
      }
    },
    {
      label: "4 · No way to ask ad-hoc questions",
      what: "Product asks: 'top-selling chargers under ₹500 shipped to Mumbai last week.' With files, you write and re-write a bespoke script and scan everything; with the data growing, it's slow and brittle.",
      why: "Files offer no <b>query language</b> and no <b>indexes</b>. Every new question is new code and a full scan — analytics and features both suffer.",
      how: "A database lets you <b>declare</b> the question in SQL; the optimizer uses indexes and joins to answer it efficiently, and the same statement keeps working as data grows.",
      when: "Every non-trivial read: search, filters, reports, joins across entities.",
      mistake: "Maintaining hand-written scan-and-filter scripts per question — you're re-implementing a query engine without an optimizer or indexes.",
      interview: "“Why is a query language better than scripting over files?” You declare intent once; the DBMS picks indexes and access paths and re-optimizes as data changes — no per-question code.",
      example: "ShopKart answers the Mumbai-chargers question in one SQL query using an index, instead of a growing pile of CSV-scanning scripts.",
      viz: {
        problem: "Ad-hoc queries",
        files: "New question = new script + full scan; slow, brittle, grows worse.",
        dbms: "One SQL statement; optimizer uses indexes/joins and re-plans as data grows.",
        mechanism: "SQL · indexes · optimizer",
        note: "Without a query language every question is bespoke code over a full scan."
      }
    },
    {
      label: "5 · No enforced integrity",
      what: "Nothing stops a bad row: a negative price, an order referencing a customer who doesn't exist, two customers with the same id, a date in a text field. Files accept <b>anything</b>.",
      why: "Without enforced <b>integrity</b>, garbage accumulates and every reader must defensively re-validate. One buggy writer poisons the data for everyone.",
      how: "A database enforces <b>types, NOT NULL, UNIQUE, CHECK, and foreign keys</b> on every write — invalid data is rejected at the source, no matter which client attempts it.",
      when: "Every write; especially valuable with multiple apps or scripts touching the same data.",
      mistake: "Validating only in one app. The next service, migration, or manual fix bypasses it and writes the bad row the constraint would have blocked.",
      interview: "“Where should data integrity live and why?” In the database as constraints — it's the single gate all writers pass, so app-only rules are eventually bypassed.",
      example: "A ShopKart import tries to add an order for a deleted customer; a foreign key rejects it, where a CSV would have happily stored the orphan.",
      viz: {
        problem: "Data integrity",
        files: "Negative prices, orphan orders, duplicate ids — files accept anything.",
        dbms: "Types + keys + CHECK + foreign keys reject invalid data at the source.",
        mechanism: "constraints · keys · types",
        note: "Files can't enforce rules; one bad writer corrupts the data for all readers."
      }
    },
    {
      label: "6 · Redundancy → inconsistency",
      what: "The customer's address is copied into every order file and the customers file. They change it once; now some copies say the new address and some the old. Which is true?",
      why: "Uncontrolled <b>redundancy</b> breeds <b>inconsistency</b>: the same fact stored in many places drifts apart, and there's no single source of truth to trust.",
      how: "A database lets you store each fact <b>once</b> and reference it (normalization + foreign keys), so an update happens in one place and every reader sees it consistently.",
      when: "Any data shared across records or entities — customers, products, sellers referenced from many rows.",
      mistake: "Copying data 'to make reads easy' without a plan to keep the copies in sync — the copies always diverge under updates.",
      interview: "“Why is duplicating data across files dangerous?” Updates hit some copies and not others, so the same fact becomes inconsistent; a DB stores it once and references it.",
      example: "A ShopKart customer moves house; in files, old orders keep the stale address forever; in a normalized DB, the one <code>customers</code> row is updated and every order reflects it.",
      viz: {
        problem: "Redundancy",
        files: "Address copied everywhere; an update leaves stale copies — which is true?",
        dbms: "Store each fact once, reference it; one update, consistent everywhere.",
        mechanism: "single source of truth",
        note: "Duplicated facts drift apart under updates. One authoritative copy fixes it."
      }
    },
    {
      label: "7 · Scale, sharing & security",
      what: "ShopKart now has many apps, thousands of users, gigabytes of data, and rules about who may see what. Files can't share safely, cache hot data, scale out, or gate access.",
      why: "A database is a <b>shared, managed service</b>: it serves many clients concurrently, caches and indexes for performance, scales via replication/partitioning, and enforces access control — the operational backbone files never provide.",
      how: "Connections are pooled and authorized; a buffer pool caches hot pages; replication and partitioning add read capacity and size; roles/privileges gate every access.",
      when: "As soon as the system is multi-app, multi-user, performance-sensitive, or security-relevant — i.e. in production.",
      mistake: "Delaying the move to a database until files have already caused a data-loss or corruption incident — the migration is far cheaper before that.",
      interview: "“Summarize why we use databases.” Concurrency, crash-safe durability, declarative queries, enforced integrity, consistency over redundancy, and shared, secure, scalable access — none of which files provide.",
      example: "ShopKart's storefront, admin, and analytics all hit one Postgres cluster — concurrent, cached, replicated, and access-controlled — instead of fighting over shared files.",
      viz: {
        problem: "Scale & sharing",
        files: "No safe sharing, caching, scaling, or access control across apps/users.",
        dbms: "Managed service: pooled+authorized connections, caching, replication, roles.",
        mechanism: "shared managed service",
        note: "The full reason to use a database: every guarantee above, delivered to many clients at once, securely and at scale."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch ShopKart outgrow spreadsheets — hitting lost updates, ' +
          "crash corruption, unanswerable questions, and bad data — and see the database guarantee that solves each.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">The wall</div>' +
        '<div class="dd-verdict"><span class="dd-chip dd-chip--accent">' + s.problem + "</span></div></div>";
      if (s.files) {
        html += '<div class="dd-section"><div class="dd-section-label">Same task, two worlds</div>' +
          '<div class="dd-verdict bad"><b>Raw files:</b> ' + s.files + "</div>" +
          '<div class="dd-verdict ok"><b>With a DBMS:</b> ' + s.dbms +
          ' <span class="dd-chip dd-chip--info">' + s.mechanism + "</span></div></div>";
      } else {
        html += '<div class="dd-section"><div class="dd-section-label">Starting point</div>' +
          '<div class="dd-verdict"><b>ShopKart on CSV files</b> — one user, small data, edits by hand. It works… for now.</div></div>';
      }
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["why-databases"] = {
    slug: "why-databases",
    overview: {
      what: "This is the <b>motivation</b> for databases: the concrete problems that raw files and spreadsheets cannot solve — <b>lost updates</b> under concurrency, <b>corruption</b> on crash, <b>no ad-hoc queries</b>, <b>no enforced integrity</b>, <b>inconsistency</b> from redundancy, and <b>no safe sharing at scale</b>.",
      why: "Every one of these walls is a guarantee a DBMS provides. Understanding the failures firsthand is what makes the machinery of the rest of this track — transactions, WAL, indexes, constraints, replication — feel necessary rather than arbitrary.",
      how: "Take one task (managing ShopKart's orders and stock) and push it past a single user: concurrency forces transactions, crashes force durability, questions force a query language, bad data forces integrity, duplication forces a single source of truth, and growth forces a shared, secure, scalable managed service."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "A wall files can't cross — and the one line that does",
      lang: "sql",
      code:
        "-- FILES: two writers, read-modify-write on stock — the last save wins\n" +
        "--   clerk A: read 100 -> set 90 -> save\n" +
        "--   clerk B: read 100 -> set 95 -> save     (A's change is gone, silently)\n" +
        "\n" +
        "-- DBMS: the update is atomic and concurrency-controlled — nothing is lost\n" +
        "BEGIN;\n" +
        "  UPDATE products SET stock = stock - 10 WHERE sku = 42;  -- A\n" +
        "  UPDATE products SET stock = stock - 5  WHERE sku = 42;  -- B (serialized)\n" +
        "COMMIT;    -- final stock = 85, both applied, durable across a crash\n" +
        "\n" +
        "-- And the rules are enforced for EVERY writer, not just this app:\n" +
        "ALTER TABLE products ADD CONSTRAINT stock_nonneg CHECK (stock >= 0);\n" +
        "ALTER TABLE orders   ADD FOREIGN KEY (customer_id) REFERENCES customers(id);",
      highlights: [7, 9, 10, 14]
    },
    reference: [
      ["lost update", "Two concurrent read-modify-writes overwrite each other; one change vanishes"],
      ["atomicity", "A change happens fully or not at all — no half-applied state"],
      ["durability", "Committed data survives a crash"],
      ["query language", "Declarative way to ask questions (SQL) instead of per-question scripts"],
      ["index", "A structure that answers queries without scanning everything"],
      ["integrity constraint", "A rule (type, key, CHECK, foreign key) the data must satisfy"],
      ["redundancy", "The same fact stored in multiple places"],
      ["inconsistency", "Copies of a fact that have drifted apart"],
      ["single source of truth", "Storing each fact once and referencing it"],
      ["managed service", "Shared, cached, replicated, access-controlled data access"]
    ],
    internals:
      "<p>The reasons databases exist map almost one-to-one onto their subsystems. <b>Concurrency</b> failures (lost updates, dirty reads) are answered by the <b>transaction manager</b> with locking or MVCC. <b>Crash</b> failures (torn, partial data) are answered by <b>write-ahead logging</b> and recovery. <b>Query</b> pain is answered by a <b>query processor</b> and <b>indexes</b>. <b>Integrity</b> gaps are answered by <b>constraints</b> enforced in the schema. This track exists to open each of those in turn — this concept is the map of why they're needed.</p>" +
      "<p>Two of the walls are subtler than 'files are slow'. <b>Redundancy → inconsistency</b> is why the relational model and normalization matter: storing a fact once and referencing it means updates can't leave stale copies. And <b>sharing at scale</b> is why a database is a <i>service</i>, not a library: pooled and authorized connections, a shared buffer cache, replication and partitioning, and role-based access control turn 'a place to put data' into an operational backbone many applications can trust simultaneously.</p>" +
      "<p>The through-line is that a DBMS moves universal guarantees out of every application and into one system that enforces them for all writers. That's what makes the guarantees actually hold: they can't be skipped by the next app, the next script, or the next manual fix.</p>",
    engineering:
      "<p>Practically, the signal to graduate from files to a database is when data becomes <b>shared, concurrent, valuable, queried, or growing</b> — usually earlier than teams expect, and always cheaper to do before an incident than after. The migration cost is real but bounded; a data-loss or corruption event from limping along on files is not.</p>" +
      "<p>Once on a database, the same list becomes a design checklist: wrap multi-step changes in transactions, rely on the WAL for durability rather than app-level 'save' logic, push integrity into constraints and foreign keys, normalize to a single source of truth for shared facts (denormalizing deliberately only where reads demand it), and treat the database as the shared, secured, scalable service it is — pooling connections and using roles instead of one god-account.</p>",
    gotchas: [
      { kind: "warn", html: "<b>The second writer is where files die.</b> Everything looks fine with one user; concurrency (lost updates) and crashes (torn files) are invisible until they aren't. Move before the incident, not after." },
      { kind: "tip", html: "<b>Ad-hoc file scripts are a query engine you're building by hand</b> — without an optimizer, indexes, or statistics. One SQL statement plus an index replaces the whole growing pile." },
      { kind: "info", html: "<b>Redundancy is a correctness problem, not just a space one.</b> Duplicated facts drift apart under updates; storing each fact once and referencing it is what keeps them consistent." }
    ],
    failureModes:
      "<p><b>Silent data loss under concurrency:</b> uncoordinated file writes lose updates with no error. <i>Fix:</i> transactions + concurrency control in a DBMS.</p>" +
      "<p><b>Corruption on crash:</b> a half-written file with no record of what completed. <i>Fix:</i> atomic commit + WAL recovery.</p>" +
      "<p><b>Query sprawl:</b> a growing set of bespoke scan-and-filter scripts, each slow and brittle. <i>Fix:</i> a query language with indexes and an optimizer.</p>" +
      "<p><b>Garbage data &amp; drift:</b> invalid rows and inconsistent duplicated facts accumulate. <i>Fix:</i> constraints/foreign keys and a normalized single source of truth.</p>",
    quickCheck: [
      {
        q: "Two processes both read stock=100 from a file, one writes 90, the other writes 95. What happens, and what fixes it?",
        options: [
          "Final value is 85; files handle this",
          "One update is silently lost; a transaction with concurrency control prevents it",
          "The file errors and rolls back",
          "Both values are stored"
        ],
        answer: 1,
        why: "This is a lost update: the last save overwrites the other with no error. A database wraps the change in a transaction and uses locking or MVCC to serialize or detect the conflict, so neither update disappears.",
        diff: "easy"
      },
      {
        q: "Why is storing the same fact (e.g. a customer's address) in many files a correctness problem?",
        options: [
          "It wastes disk space only",
          "Updates hit some copies and not others, so the copies become inconsistent",
          "Files can't store text",
          "It makes reads slower only"
        ],
        answer: 1,
        why: "Uncontrolled redundancy leads to inconsistency: an update to one copy leaves the others stale, and there's no single source of truth. Storing the fact once and referencing it keeps every reader consistent.",
        diff: "medium"
      },
      {
        q: "Which database property specifically prevents a crash mid-write from leaving impossible, half-applied data?",
        options: [
          "Indexing",
          "Atomicity + durability via write-ahead logging and recovery",
          "Compression",
          "A query optimizer"
        ],
        answer: 1,
        why: "Atomicity means a change happens fully or not at all; the WAL makes committed changes durable and lets recovery redo committed work and undo partial work after a crash — so the database returns to a consistent state.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Why do databases exist — what can't files do?",
        a: "Files break along five axes once a system is real. Concurrency: two uncoordinated writers cause lost updates with no error — databases add transactions and locking/MVCC. Crashes: a mid-write leaves a torn, partial file with no record of state — databases add atomic commit and WAL-based recovery. Queries: every new question becomes bespoke scan-and-filter code — databases add a declarative query language, indexes, and an optimizer. Integrity: files accept negative prices and orphan records — databases enforce types, keys, and constraints at the one gate all writers share. Redundancy: the same fact copied across files drifts into inconsistency — databases let you store it once and reference it. And at scale, a database is a shared, cached, replicated, access-controlled service, which files can't be. Each 'why' is a specific guarantee.",
        tip: "Enumerate the five walls — concurrency, crashes, queries, integrity, redundancy — and name the guarantee that answers each."
      },
      {
        q: "When is it fine to just use files, and when must you move to a database?",
        a: "Files are fine when the data isn't concurrently written, doesn't need crash-safe recovery, isn't queried in varied ways, and doesn't need enforced rules — config, logs, caches, static reference data, one-off scripts. You must move to a database once any of those flips: multiple writers (to avoid lost updates), data you can't lose on a crash (durability), varied ad-hoc questions (query language + indexes), rules that must hold across all writers (constraints), shared facts that would otherwise be duplicated (single source of truth), or many apps/users needing secure concurrent access at scale. The practical rule: migrate when the data becomes shared, concurrent, valuable, or growing — and do it before an incident, since that's far cheaper than after one.",
        tip: "Don't say 'always use a database' — showing you know when files suffice is what signals judgment."
      }
    ],
    businessLens: {
      task: "ShopKart outgrows spreadsheets",
      meaning: "Each new user, crash, question, and rule is a wall files can't cross.",
      system: "Application data store (files → Postgres)",
      point: "ShopKart's spreadsheets were fine with one founder. The second clerk caused a lost stock update; a power cut corrupted an orders file; product's questions spawned a pile of brittle scripts; a bad import created orphan orders; a moved customer left stale addresses everywhere. Every one of those is a database guarantee waiting to be adopted — transactions, durability, SQL, constraints, normalization, and a shared secure service. 'Why databases?' is really 'which of these failures can the business afford?' — and the answer, past prototype stage, is none of them."
    }
  };
})();
