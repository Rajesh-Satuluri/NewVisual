/* ============================================================
   deepdives/dbms-architecture.js — "DBMS Architecture" deep dive.
   Registers DBLab.deepDives['dbms-architecture'] (concept m03).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: one ShopKart query — "top chargers under ₹500" — descends the layers
  // of the database, from the connection down to the disk, and the result rises
  // back up. Each step lights the layer currently doing the work.
  var LAYERS = [
    { key: "conn", name: "Connection & session manager", sub: "listener · auth · session · pool" },
    { key: "parse", name: "Parser & rewriter", sub: "tokenize · parse tree · validate · rewrite" },
    { key: "plan", name: "Planner / optimizer", sub: "enumerate · cost with stats · pick plan" },
    { key: "exec", name: "Execution engine", sub: "operators · iterator pipeline" },
    { key: "storage", name: "Storage engine", sub: "access methods · buffer pool" },
    { key: "txn", name: "Transaction · lock · log managers → disk", sub: "ACID · MVCC/locks · WAL · data files" }
  ];
  function layers(activeKey, mode) {
    var order = LAYERS.map(function (l) { return l.key; });
    var ai = order.indexOf(activeKey);
    return LAYERS.map(function (l, i) {
      var state = "idle";
      if (mode === "all") state = "idle";
      else if (i === ai) state = "active";
      else if (i < ai) state = "done";
      else state = "idle";
      return { name: l.name, sub: l.sub, state: state };
    });
  }

  var STEPS = [
    {
      label: "1 · A database is a layered system",
      what: "A DBMS isn't one blob — it's a stack of cooperating components. A request enters at the top (a connection), descends through <b>query processing</b> and <b>execution</b> into the <b>storage engine</b>, and the data lives at the bottom on disk.",
      why: "Seeing the layers is what makes every other concept locate itself: parsing, planning, execution, buffering, locking, logging are all <i>places</i> in this stack. Understanding the shape tells you where a problem (or a tuning knob) lives.",
      how: "Top to bottom: connection/session management → parser & rewriter → planner/optimizer → execution engine → storage engine (buffer pool + access methods) → transaction/lock/log managers over the disk. A query flows down; rows flow back up.",
      when: "This architecture is common to Postgres, MySQL/InnoDB, Oracle, SQL Server — the names differ, the layers don't.",
      mistake: "Treating the database as a black box 'that runs SQL'. Knowing the layers is what lets you reason about latency, locking, and where an EXPLAIN plan comes from.",
      interview: "“Walk me through a database's architecture.” Connection → parser → optimizer → executor → storage engine (buffer pool + access methods) → transaction/log/lock managers on disk.",
      example: "ShopKart's query for 'top chargers under ₹500' is about to travel this whole stack and come back as ten rows.",
      viz: { layers: layers(null, "all"), flow: null, note: "One request enters at the top and descends to the disk; rows return up. Each layer owns one job." }
    },
    {
      label: "2 · Connection & session manager",
      what: "The client opens a connection. The database <b>authenticates</b> it, establishes a <b>session</b>, and (via a pool) assigns a backend to handle its statements. The SQL text arrives here.",
      why: "Connections are expensive resources with real limits. This layer is where authentication, session state, and — crucially — <b>connection pooling</b> live; mismanaging it is a common production bottleneck.",
      how: "A listener accepts the TCP/socket connection, checks credentials and roles, and hands the session a worker (process or thread). A pooler (PgBouncer, built-in pool) multiplexes many clients onto few backends.",
      when: "At every connect; pooling matters most under many short-lived clients (web requests, serverless).",
      mistake: "Opening a fresh database connection per web request with no pool — connection setup and backend memory become the bottleneck long before the query engine does.",
      interview: "“What does the connection layer do and why pool?” Auth + session + backend assignment; pooling reuses expensive backends across many short client connections.",
      example: "ShopKart's app servers keep a pool of Postgres connections; a checkout borrows one, runs its statements, and returns it — no per-request connect cost.",
      viz: { layers: layers("conn"), flow: "down", note: "Authenticate, establish a session, assign a pooled backend. The SQL text enters the engine here." }
    },
    {
      label: "3 · Parser & rewriter",
      what: "The SQL text is <b>tokenized and parsed</b> into a syntax tree, its names and types are <b>validated</b> against the catalog, and rules/views are <b>rewritten</b> (a view reference is expanded into its definition).",
      why: "This turns free-form text into a precise, checked internal representation the rest of the engine can reason about — catching syntax and name errors before any work is planned or executed.",
      how: "Lexer → parser → parse tree; the analyzer resolves table/column names, checks permissions and types against the system catalog; the rewriter applies view definitions and rules to produce a query tree.",
      when: "Every statement; prepared statements cache the parsed/planned form to skip re-parsing.",
      mistake: "Confusing a syntax error (caught here) with a planning or runtime error (caught later) — they come from different layers and mean different things.",
      interview: "“What happens between raw SQL and execution?” Parse to a tree, validate names/types/permissions against the catalog, rewrite views/rules — producing a query tree for the planner.",
      example: "ShopKart's query naming the <code>products</code> view is rewritten into the underlying join before planning even begins.",
      viz: { layers: layers("parse"), flow: "down", note: "SQL text → parse tree → validated & rewritten query tree. Syntax and name errors are caught here." }
    },
    {
      label: "4 · Planner / optimizer",
      what: "The optimizer <b>enumerates</b> ways to answer the query (which indexes, join orders, join algorithms), <b>estimates each one's cost</b> using table statistics, and picks the cheapest — the <b>execution plan</b>.",
      why: "This is where declarative SQL becomes an efficient procedure. The same query can get a sequential scan today and an index scan tomorrow as data and statistics change — decided here, not in your code.",
      how: "Using statistics (row counts, value distributions) it estimates rows and cost for candidate plans and searches the plan space for the minimum. <code>EXPLAIN</code> shows the plan it chose.",
      when: "Every statement (unless a cached prepared plan is reused); re-planned as statistics shift.",
      mistake: "Blaming 'the database' for a slow query without reading <code>EXPLAIN</code> — the plan chosen here, and the statistics feeding it, are almost always the story.",
      interview: "“What does the optimizer do?” Enumerates candidate plans, costs them with statistics, and picks the cheapest access paths and join order — the plan EXPLAIN reveals.",
      example: "ShopKart's optimizer sees an index on <code>(category, price)</code> and chooses an index scan over a full table scan for 'chargers under ₹500'.",
      viz: { layers: layers("plan"), flow: "down", note: "Enumerate plans → cost with statistics → pick the cheapest. This is what EXPLAIN shows you." }
    },
    {
      label: "5 · Execution engine",
      what: "The executor runs the chosen plan's <b>operators</b> — scans, joins, aggregates, sorts — wired into a pipeline. Rows are pulled through it, typically one at a time (the iterator/'Volcano' model).",
      why: "This is where the plan actually produces rows. Its structure (a tree of operators, each pulling from its children) is exactly what an <code>EXPLAIN ANALYZE</code> tree shows, with real timing.",
      how: "Each operator implements <code>open/next/close</code>; calling <code>next</code> on the root pulls a row, which recursively pulls from child operators. Some operators (sort, hash) materialize; others stream.",
      when: "Every executed statement; long queries live here, so this is where runtime cost and memory (work_mem) show up.",
      mistake: "Reading a plan top-down as execution order — data flows up from the leaves; the root is the last operator to see each row.",
      interview: "“How does the executor run a plan?” As a tree of operators pulling rows from their children (iterator model); EXPLAIN ANALYZE shows that tree with actual times and row counts.",
      example: "ShopKart's plan runs an index scan feeding a sort feeding a limit — pulling exactly the ten charger rows the query asked for.",
      viz: { layers: layers("exec"), flow: "down", note: "Operators (scan → join → aggregate → sort) wired into a pipeline; rows pulled through. This is the EXPLAIN ANALYZE tree." }
    },
    {
      label: "6 · Storage engine: buffer pool & access methods",
      what: "The operators don't touch disk directly — they call <b>access methods</b> (heap scans, B-tree index lookups) that read <b>pages</b> through the <b>buffer pool</b>. A cache hit is memory-fast; a miss fetches the page from disk.",
      why: "This layer is where 'the data' physically lives and where most performance is won or lost: the buffer pool turns random disk I/O into cache hits, and the right access method turns a full scan into a few page reads.",
      how: "An index scan walks a B-tree to find matching row pointers, then fetches those heap pages via the buffer pool; a sequential scan reads pages in order. The buffer manager caches hot pages and evicts cold ones.",
      when: "Every row access; the buffer-pool hit ratio and index quality dominate query latency.",
      mistake: "Ignoring the buffer pool when reasoning about speed — the same plan is milliseconds on a warm cache and seconds on a cold one.",
      interview: "“How do query operators get data?” Through access methods (heap/index) reading pages via the buffer pool; hits are memory-fast, misses hit disk.",
      example: "ShopKart's index scan finds ten row pointers and fetches their heap pages — all already cached in the buffer pool during the sale, so it's memory-fast.",
      viz: { layers: layers("storage"), flow: "down", note: "Access methods read pages via the buffer pool. Cache hit = memory-fast; miss = disk fetch. Most latency is decided here." }
    },
    {
      label: "7 · Transaction, lock & log managers — then back up",
      what: "Wrapping all of it: the <b>transaction manager</b> gives the statement ACID semantics, the <b>lock manager</b>/MVCC keeps concurrent statements correct, and the <b>log manager</b> (WAL) makes changes durable. The result rows then travel back <b>up</b> the stack to the client.",
      why: "These cross-cutting managers are why the whole descent is safe under concurrency and crashes. They don't sit in the data path so much as <i>around</i> it — enforcing isolation and durability at every touch of a page.",
      how: "Reads take snapshots or share locks; writes take row locks and append WAL records (fsync at commit). Once execution finishes, rows flow up through executor → session → connection back to the client.",
      when: "Every statement runs inside this transactional envelope, even a single autocommit SELECT.",
      mistake: "Picturing transactions/locking/logging as one more layer in the pipeline. They're cross-cutting services the other layers call into, not a step rows pass through.",
      interview: "“Where do ACID and durability fit in the architecture?” In cross-cutting transaction, lock, and log managers that wrap execution and storage — providing isolation (locks/MVCC) and durability (WAL).",
      example: "ShopKart's read runs under an MVCC snapshot (no locks blocking it); a concurrent checkout's write takes a row lock and logs to the WAL — and both results return up their own connections.",
      viz: { layers: layers("txn"), flow: "up", note: "Transaction/lock/log managers wrap every layer (ACID · isolation · WAL). Then the result rows rise back up to the client." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function layer(s, i, n) {
      var cls = "dd-stack-layer" + (s.state === "active" ? " active" : (s.state === "done" ? " done" : " muted"));
      var tag = s.state === "active" ? "▶ working" : (s.state === "done" ? "✓ done" : "");
      var arrow = i < n - 1 ? '<div class="dd-stack-arrow">↓</div>' : "";
      return '<div class="' + cls + '"><div class="dd-stack-hd"><span class="dd-stack-name">' + s.name + "</span>" +
        '<span class="dd-stack-tag">' + tag + '</span></div><div class="dd-stack-sub">' +
        s.sub.split(" · ").map(function (c) { return '<span class="dd-kv-item">' + c + "</span>"; }).join("") + "</div></div>" + arrow;
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to follow one ShopKart query down through the database — ' +
          "connection, parser, optimizer, executor, storage engine — and back up as rows.</div>";
        return;
      }
      var flow = s.flow === "up" ? '<span class="dd-chip dd-chip--ok">rows flowing up ↑</span>'
        : (s.flow === "down" ? '<span class="dd-chip dd-chip--info">query flowing down ↓</span>' : "");
      var html = '<div class="dd-section"><div class="dd-section-label">Query path ' + flow + "</div>" +
        '<div class="dd-stack">' + s.layers.map(function (l, i) { return layer(l, i, s.layers.length); }).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["dbms-architecture"] = {
    slug: "dbms-architecture",
    overview: {
      what: "<b>DBMS architecture</b> is the layered internal structure a request passes through: a <b>connection/session manager</b>, a <b>query processor</b> (parser → optimizer → executor), a <b>storage engine</b> (buffer pool + access methods), and cross-cutting <b>transaction, lock, and log managers</b> over the disk.",
      why: "Almost every database concept is a <i>place</i> in this stack — EXPLAIN comes from the optimizer, cache hits from the buffer pool, isolation from the lock manager, durability from the WAL. Knowing the shape is what lets you locate performance problems and tuning knobs.",
      how: "A query descends: the connection layer authenticates and assigns a backend; the parser turns SQL into a validated tree; the optimizer costs candidate plans and picks one; the executor runs the plan's operators; the storage engine serves pages via the buffer pool; and transaction/lock/log managers wrap it all for ACID and durability. Rows then flow back up to the client."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Seeing the layers from the outside",
      lang: "sql",
      code:
        "-- Parser + optimizer: what plan did the query become?\n" +
        "EXPLAIN\n" +
        "SELECT name, price FROM products\n" +
        "WHERE category = 'charger' AND price < 500\n" +
        "ORDER BY monthly_sales DESC LIMIT 10;\n" +
        "--   Limit -> Sort -> Index Scan using products_cat_price_idx   (the executor's operator tree)\n" +
        "\n" +
        "-- Executor + storage engine: actual times, rows, and buffer (cache) hits\n" +
        "EXPLAIN (ANALYZE, BUFFERS) SELECT ...;   -- shared hit=... read=...  (buffer pool vs disk)\n" +
        "\n" +
        "-- Connection/session layer: who's connected, on which backend, doing what\n" +
        "SELECT pid, usename, state, query FROM pg_stat_activity;\n" +
        "\n" +
        "-- Transaction/lock managers: current locks and waits\n" +
        "SELECT locktype, relation::regclass, mode, granted FROM pg_locks;",
      highlights: [2, 8, 11, 14]
    },
    reference: [
      ["connection manager", "Accepts, authenticates, and assigns a backend to each client session"],
      ["connection pool", "Reuses a few backends across many short-lived client connections"],
      ["parser", "Turns SQL text into a validated syntax/query tree"],
      ["rewriter", "Expands views/rules into the underlying query tree"],
      ["optimizer", "Costs candidate plans with statistics and picks the cheapest"],
      ["execution engine", "Runs the plan as a tree of operators pulling rows (iterator model)"],
      ["storage engine", "Serves data as pages via access methods and the buffer pool"],
      ["buffer pool", "In-memory cache of disk pages; hits avoid disk I/O"],
      ["access method", "Heap/index structures for locating rows (seq scan, B-tree)"],
      ["transaction/lock/log managers", "Cross-cutting ACID: isolation (locks/MVCC) and durability (WAL)"]
    ],
    internals:
      "<p>The stack has a clean division of labor. <b>Query processing</b> (parser, rewriter, optimizer) is purely about turning declarative text into an efficient plan — it touches the catalog and statistics but no user data. <b>Execution</b> runs that plan as a tree of operators in the iterator model: calling <code>next</code> on the root recursively pulls rows up from the leaves, some operators streaming and others (sort, hash) materializing. <b>The storage engine</b> is where user data physically lives — access methods locate rows and the buffer pool caches the pages they sit on, turning random disk I/O into memory hits.</p>" +
      "<p>The <b>transaction, lock, and log managers</b> are best understood as cross-cutting rather than as a pipeline stage: they wrap every page touch. Reads run under a snapshot (MVCC) or take share locks; writes take row locks and append WAL records that are fsync'd at commit. This is why the same descent is simultaneously fast (buffer pool, good plan) and safe (isolation, durability) — the correctness services surround the data path instead of sitting inside it.</p>" +
      "<p>The value of the model is diagnostic. A syntax error is the parser; a bad plan is the optimizer (and its statistics); a slow-but-correct plan is usually the storage engine (cold cache, missing index); a hang is often the lock manager; a durability or recovery question is the log manager. Vendors rename the boxes, but the layers — and where each class of problem lives — are remarkably universal.</p>",
    engineering:
      "<p>Use the architecture as a debugging map. Latency spike with a correct result? Compare the plan (<code>EXPLAIN</code>) and the buffer hit ratio (<code>EXPLAIN (ANALYZE, BUFFERS)</code>) — optimizer vs storage engine. Query hanging? Check the lock manager (<code>pg_locks</code>, blocking sessions). Too many connections eating memory? That's the connection layer — add a pooler rather than a bigger box. Wrong results under concurrency? Isolation level in the transaction manager.</p>" +
      "<p>Each layer also has its own knobs: pool size at the connection layer; prepared statements to skip re-parse/plan; statistics and indexes to feed the optimizer; <code>work_mem</code> for execution operators; buffer pool size (<code>shared_buffers</code>) for the storage engine; isolation level and lock timeouts for the transaction manager; WAL/checkpoint settings for the log manager. Knowing which layer owns a symptom is what turns 'the database is slow' into a specific, fixable diagnosis.</p>",
    gotchas: [
      { kind: "tip", html: "<b>The layers are a debugging map.</b> Syntax error → parser; slow-but-right → optimizer or buffer pool; hang → lock manager; too many connections → connection layer. Locate the symptom before tuning." },
      { kind: "info", html: "<b>Transaction/lock/log managers are cross-cutting, not a pipeline step.</b> They wrap every page access to provide isolation and durability — rows don't 'pass through' them the way they pass through operators." },
      { kind: "warn", html: "<b>The connection layer fails first at scale.</b> One DB connection per request exhausts backends and memory long before the query engine is the bottleneck. Pool connections." }
    ],
    failureModes:
      "<p><b>Connection exhaustion:</b> too many direct client connections consume backend memory and slots. <i>Fix:</i> a connection pooler (PgBouncer / built-in), right-sized to backend capacity.</p>" +
      "<p><b>Bad plans:</b> stale or missing statistics lead the optimizer to a poor plan (wrong join, seq scan). <i>Fix:</i> ANALYZE / autovacuum stats, appropriate indexes; read EXPLAIN.</p>" +
      "<p><b>Cold cache latency:</b> a correct plan is slow because pages miss the buffer pool. <i>Fix:</i> size shared_buffers, warm caches, or reduce pages touched with better indexes.</p>" +
      "<p><b>Lock contention:</b> statements block in the lock manager on hot rows or long transactions. <i>Fix:</i> shorter transactions, appropriate isolation, lock timeouts; inspect pg_locks.</p>",
    quickCheck: [
      {
        q: "You run EXPLAIN and see the operator tree for a query. Which layer produced that plan?",
        options: [
          "The storage engine",
          "The planner / optimizer",
          "The connection manager",
          "The lock manager"
        ],
        answer: 1,
        why: "The optimizer enumerates candidate plans, costs them with statistics, and picks the cheapest — that chosen plan is exactly what EXPLAIN displays. The executor then runs it and the storage engine serves the pages.",
        diff: "easy"
      },
      {
        q: "The same query is milliseconds sometimes and seconds other times, with the identical plan. Which layer most likely explains it?",
        options: [
          "The parser",
          "The storage engine's buffer pool (cache hit vs miss)",
          "The optimizer",
          "The connection pool"
        ],
        answer: 1,
        why: "With the plan fixed, the variable is whether the pages it touches are already in the buffer pool. A warm cache serves them from memory; a cold cache pays disk I/O — a storage-engine effect, visible via EXPLAIN (ANALYZE, BUFFERS).",
        diff: "medium"
      },
      {
        q: "Where do ACID isolation and durability sit in the architecture?",
        options: [
          "As a single step between the optimizer and executor",
          "In cross-cutting transaction, lock, and log managers that wrap execution and storage",
          "In the parser",
          "Only in the connection manager"
        ],
        answer: 1,
        why: "Transaction, lock, and log managers aren't a pipeline stage rows pass through — they wrap every page access, providing isolation (locks/MVCC) on reads and writes and durability (WAL) at commit, around the whole descent.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Walk me through the architecture of a database and what each layer does.",
        a: "A request descends a stack of components. The connection/session manager authenticates the client, establishes a session, and assigns it a backend — usually through a connection pool. The parser tokenizes and parses the SQL into a syntax tree, validates names/types/permissions against the catalog, and the rewriter expands views and rules. The planner/optimizer enumerates candidate execution plans, costs them using table statistics, and picks the cheapest — that's what EXPLAIN shows. The execution engine runs that plan as a tree of operators (scans, joins, aggregates) in the iterator model, pulling rows from the leaves up. The storage engine serves the data those operators need as pages, via access methods (heap/index) and the buffer pool, hitting disk only on a cache miss. Wrapping all of it, the transaction, lock, and log managers provide ACID: isolation via locks or MVCC and durability via the WAL. Rows then flow back up to the client.",
        tip: "Go top-to-bottom naming each box and its one job, then add that transaction/lock/log are cross-cutting, not a pipeline step."
      },
      {
        q: "How do you use the architecture to diagnose a performance problem?",
        a: "Map the symptom to the layer that owns it. A syntax or name error is the parser. A query that's slow but returns the right answer is usually the optimizer (a bad plan from stale statistics or a missing index — check EXPLAIN) or the storage engine (a cold buffer pool — check EXPLAIN (ANALYZE, BUFFERS) for shared read vs hit). A query that hangs is typically the lock manager — look for blocking sessions in pg_locks and long transactions. Running out of capacity under many clients is the connection layer — add a pooler rather than scaling the box. Wrong results under concurrency point at the isolation level in the transaction manager. Each layer also has its knobs — pool size, prepared statements, statistics/indexes, work_mem, shared_buffers, isolation/lock timeouts, WAL/checkpoint settings — so identifying the layer turns a vague 'it's slow' into a specific fix.",
        tip: "Lead with 'map the symptom to the layer' — showing the diagnostic use of the model is what impresses."
      }
    ],
    businessLens: {
      task: "Trace one ShopKart query through the database",
      meaning: "Every layer is a place latency, locking, or a tuning knob can live.",
      system: "OLTP query path (Postgres internals)",
      point: "When a ShopKart page is slow, 'the database is slow' isn't actionable — the architecture makes it so. Is it the connection layer (too many un-pooled clients), the optimizer (a bad plan from stale stats), the storage engine (a cold buffer pool), or the lock manager (a long transaction blocking checkouts)? The same layered map that explains how a query for 'top chargers under ₹500' becomes ten rows is the map an engineer uses to find and fix the bottleneck — which is why knowing the anatomy pays off long after the intro."
    }
  };
})();
