/* ============================================================
   deepdives/query-optimization.js — "Query Optimizer" deep dive.
   Registers DBLab.deepDives['query-optimization'] (concept m16).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  function P(name, sub, cost, mark) { return { name: name, sub: sub, cost: cost, mark: mark || null }; }

  // Scene: one ShopKart reporting query, many equivalent plans, the
  // optimizer picking the cheapest.
  //   SELECT c.name, sum(o.total)
  //   FROM orders o JOIN customers c ON o.cust_id = c.id
  //   WHERE o.created_at >= '2026-01-01' GROUP BY c.name;
  var STEPS = [
    {
      label: "1 · One query, thousands of plans",
      what: "A single SQL statement can be executed thousands of different ways — different join orders, join algorithms, and access paths — and those plans can differ by <b>1000×</b> in speed. The <b>optimizer</b>'s job is to pick a good plan, fast, without running any of them.",
      why: "SQL is <i>declarative</i>: you say <i>what</i> you want, not <i>how</i>. Something has to turn that into an efficient physical execution. That 'something' — the cost-based optimizer — is why the same query is snappy on one database and hangs on another.",
      how: "The optimizer runs a pipeline: parse → rewrite into equivalent logical forms → search the space of physical plans → estimate each plan's cost from statistics → pick the cheapest.",
      when: "Every SQL statement goes through the optimizer before it executes (plans may be cached and reused).",
      mistake: "Thinking SQL maps to one fixed execution. It doesn't — the optimizer chooses among many equivalent plans, and the choice is where performance is won or lost.",
      interview: "“What does a query optimizer do?” Transforms a declarative query into an efficient physical plan by enumerating equivalent plans and choosing the lowest estimated cost.",
      example: "ShopKart's revenue-by-customer report could run as a hash join over full scans, or a nested loop over an index — same answer, wildly different speed.",
      viz: { phase: null, plans: [], note: "One declarative query → many equivalent physical plans (1000× spread). The optimizer must pick well without running them." }
    },
    {
      label: "2 · Parse & bind → logical plan",
      what: "First the query is <b>parsed</b> (syntax → tree) and <b>bound</b> (names resolved to real tables/columns, types checked). The result is a <b>logical plan</b>: a relational-algebra tree of <i>what</i> to compute (joins, filters, projections, aggregation).",
      why: "The logical plan is the canonical, algorithm-agnostic form the optimizer reasons about. It says 'join orders and customers, filter by date, group by name' — without yet deciding <i>how</i>.",
      how: "Parsing produces an AST; binding resolves identifiers against the catalog and validates types; the bound tree is normalized into relational-algebra operators.",
      when: "The first stage of every query's compilation.",
      mistake: "Conflating the logical plan (what) with the physical plan (how). Logical operators like 'join' don't yet specify nested-loop vs hash.",
      interview: "“What's the difference between a logical and physical plan?” Logical = relational-algebra 'what' (join/filter/project); physical = the chosen algorithms and access paths, 'how'.",
      example: "ShopKart's report becomes a logical tree: Aggregate(GroupBy name) ← Join(orders, customers) ← Filter(date) — no algorithms chosen yet.",
      viz: { phase: "parse", plans: [], note: "Parse → bind → a logical plan (relational algebra): what to compute, not how." }
    },
    {
      label: "3 · Rewrite into cheaper equivalents",
      what: "The optimizer applies <b>logical transformations</b> that produce equivalent but cheaper forms: <b>predicate pushdown</b> (filter early), constant folding, subquery flattening, projection pruning, join reordering rules.",
      why: "Rewrites shrink the data as early as possible. Pushing the date filter <i>below</i> the join means the join processes far fewer rows — often the single biggest win, done before any cost is computed.",
      how: "Rule-based rewrites transform the logical tree while preserving semantics: move filters down toward scans, drop unused columns, unnest correlated subqueries, simplify expressions.",
      when: "After binding, before (and interleaved with) physical plan search.",
      mistake: "Assuming the optimizer can fix a query written to block pushdown (e.g. a filter wrapped in a non-sargable function). Some rewrites are impossible — how you write SQL still matters.",
      interview: "“What is predicate pushdown?” Moving filters as close to the data source as possible so operators above them process fewer rows — a core logical rewrite.",
      example: "ShopKart's <code>WHERE created_at &gt;= '2026-01-01'</code> is pushed below the join, so only recent orders are ever joined to customers.",
      viz: { phase: "rewrite", plans: [], note: "Rewrites: push filters down, prune columns, flatten subqueries — equivalent results, far less data moved." }
    },
    {
      label: "4 · Search the physical plan space",
      what: "Now the optimizer enumerates <b>physical plans</b>: for each join it can use nested-loop / hash / sort-merge; for each table a seq scan or an index scan; and it considers different <b>join orders</b>. Three candidates emerge for our report.",
      why: "This is where the 1000× lives. The number of join orders alone grows factorially, so the optimizer can't try everything — it prunes the search with dynamic programming (System-R style) and heuristics.",
      how: "Bottom-up dynamic programming builds the best plan for each subset of tables, reusing sub-results; access-path and join-algorithm choices are enumerated at each step. The space is pruned aggressively.",
      when: "The core of optimization, after logical rewrites.",
      mistake: "Believing the optimizer finds the globally optimal plan. For many-way joins it can't search exhaustively — it finds a good plan under time/heuristic limits, not a provably best one.",
      interview: "“Why can't the optimizer just try every plan?” The join-order space is factorial; it uses dynamic programming and heuristics to search a pruned space in bounded time.",
      example: "For the report, the optimizer lines up: (A) Hash Join over two seq scans, (B) Nested Loop using the customers PK index, (C) Sort-Merge Join.",
      viz: { phase: "search", plans: [P("A · Hash Join", "seq × seq", 0), P("B · Nested Loop", "index on customers", 0), P("C · Sort-Merge", "sort both sides", 0)],
        note: "Enumerate physical plans (access path × join algo × join order). Search is pruned by dynamic programming." }
    },
    {
      label: "5 · Estimate cardinality from statistics",
      what: "To cost a plan the optimizer must guess <b>how many rows</b> flow through each operator. It uses <b>statistics</b> — histograms, distinct counts, most-common-values — to estimate the selectivity of the date filter and the join's output size.",
      why: "Cost is dominated by row counts, so cardinality estimation <i>is</i> the optimizer's hardest and most error-prone job. A good estimate → a good plan; a bad estimate → a disaster. Errors compound up the tree.",
      how: "<code>selectivity × table_rows = estimated_rows</code>, propagated upward. The date filter is estimated from the histogram on <code>created_at</code>; join output from join-key distinct counts.",
      when: "During costing of every candidate plan.",
      mistake: "Trusting estimates blindly. Correlated columns and stale statistics break the optimizer's independence assumptions, producing wildly wrong row counts.",
      interview: "“How does the optimizer estimate rows returned by a predicate?” Column statistics: histogram/MCV for value distribution, n_distinct for selectivity; selectivity × rows = estimate, propagated up the plan.",
      example: "Stats say the date filter keeps ~40k of 2M orders, and each joins to exactly one customer — so the join emits ~40k rows.",
      viz: { phase: "cost", plans: [P("A · Hash Join", "~40k rows", 0), P("B · Nested Loop", "~40k rows", 0), P("C · Sort-Merge", "~40k rows", 0)],
        note: "Estimate cardinality from statistics (histograms, n_distinct). Row counts drive cost — and errors compound upward." }
    },
    {
      label: "6 · Cost each plan & pick the cheapest",
      what: "Each plan gets a <b>cost</b> (a blend of I/O and CPU derived from its estimated rows), and the optimizer picks the cheapest. Here the <b>Nested Loop with the customers index (Plan B)</b> wins — the date filter makes the outer side small, so index lookups beat building a hash table over everything.",
      why: "The cost model turns 'which plan is fastest?' into a comparable number, letting the optimizer choose without executing anything. That single number is the whole point of cost-based optimization.",
      how: "Cost ≈ estimated_rows × per-row I/O/CPU for each operator, summed over the tree. Plan B's small outer input makes its per-lookup index cost total less than A's hash-build or C's two sorts.",
      when: "The final selection step; the winning plan is handed to the executor (and often cached).",
      mistake: "Assuming the 'obvious' plan wins. Whether hash, nested-loop, or merge is cheapest depends entirely on the estimated cardinalities — which is why estimates matter so much.",
      interview: "“How does the optimizer choose between plans?” It assigns each an estimated cost (I/O + CPU from estimated rows) and picks the minimum — cost-based optimization.",
      example: "Plan B (nested loop + customers index) costs ~320 vs ~1200 for the hash join and ~1500 for sort-merge, so ShopKart's report runs Plan B.",
      viz: { phase: "pick", plans: [P("A · Hash Join", "seq × seq", 1200, "lose"), P("B · Nested Loop", "index on customers", 320, "win"), P("C · Sort-Merge", "sort both sides", 1500, "lose")],
        note: "Cost ≈ rows × per-row I/O+CPU. Cheapest wins: Plan B (nested loop + index) at cost 320." }
    },
    {
      label: "7 · Garbage in, garbage out",
      what: "The optimizer is only as good as its inputs. <b>Stale statistics</b>, correlated predicates, or a query written to block rewrites lead to bad estimates and catastrophic plans. Tools: <code>ANALYZE</code>, <code>EXPLAIN (ANALYZE)</code>, and awareness of <b>plan caching</b>/parameter sniffing.",
      why: "Most 'the query suddenly got slow' incidents are optimizer input problems, not optimizer bugs: data grew, stats went stale, and an estimate crossed a threshold that flipped the plan to something terrible.",
      how: "Keep statistics fresh (auto-analyze), add extended statistics for correlated columns, compare <b>estimated vs actual</b> rows with <code>EXPLAIN ANALYZE</code>, and watch for a cached plan optimized for one parameter value being reused for a very different one.",
      when: "Whenever a query regresses, or proactively as data distribution shifts.",
      mistake: "Blaming the optimizer for a plan it chose from bad estimates. Fix the inputs (stats) first; reach for hints only as a last resort.",
      interview: "“A query got slow after the table grew, with no code change — why?” A cardinality estimate crossed a threshold and flipped the plan (index→seq, or NLJ→hash), or stats went stale. Re-analyze and read the plan.",
      example: "ShopKart's report degrades after a big import until <code>ANALYZE</code> refreshes the stats; <code>EXPLAIN ANALYZE</code> shows the estimate was 40k but actual was 4M — the smoking gun.",
      viz: { phase: "pick", plans: [P("Estimated", "40k rows → NLJ", 320, "lose"), P("Actual (stale stats)", "4M rows → NLJ = disaster", 9000, "lose")],
        note: "Stale stats → estimate 40k but actual 4M → the nested loop becomes a catastrophe. Keep stats fresh; read EXPLAIN ANALYZE." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    var PHASES = [{ k: "parse", n: "① Parse" }, { k: "rewrite", n: "② Rewrite" }, { k: "search", n: "③ Plan Search" }, { k: "cost", n: "④ Cost" }, { k: "pick", n: "⑤ Pick" }];
    function phaseBar(phase) {
      var pos = {}; PHASES.forEach(function (p, i) { pos[p.k] = i + 1; });
      var order = phase ? pos[phase] : 0;
      return '<div class="dd-phasebar">' + PHASES.map(function (p) {
        var cls = "dd-phase"; if (order > pos[p.k]) cls += " done"; else if (order === pos[p.k]) cls += " on";
        return '<div class="' + cls + '">' + p.n + "</div>";
      }).join("") + "</div>";
    }
    function planRow(p, maxCost) {
      var cls = "dd-plan" + (p.mark ? " " + p.mark : "");
      var pct = p.cost > 0 ? Math.max(6, Math.round((p.cost / maxCost) * 100)) : 0;
      var fillCls = "dd-costbar-fill" + (p.mark === "win" ? " win" : (p.mark === "lose" && p.cost > 0 ? " lose" : ""));
      var label = p.cost > 0 ? "cost " + p.cost : (p.sub && /rows/.test(p.sub) ? p.sub : "—");
      return '<div class="' + cls + '"><div class="dd-plan-name">' + p.name + "<small>" + p.sub + "</small></div>" +
        '<div class="dd-costbar"><div class="' + fillCls + '" style="width:' + pct + '%"></div>' +
        '<span class="dd-costbar-label">' + label + "</span></div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch the optimizer turn one SQL query into a logical plan, ' +
          "rewrite it, search physical plans, cost them from statistics, and pick the cheapest.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Optimizer pipeline</div>' + phaseBar(s.phase) + "</div>";
      if (s.plans && s.plans.length) {
        var maxCost = Math.max.apply(null, s.plans.map(function (p) { return p.cost || 1; }));
        html += '<div class="dd-section"><div class="dd-section-label">Candidate plans</div>' +
          '<div class="dd-oplist">' + s.plans.map(function (p) { return planRow(p, maxCost); }).join("") + "</div></div>";
      }
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["query-optimization"] = {
    slug: "query-optimization",
    overview: {
      what: "The <b>query optimizer</b> turns a declarative SQL statement into an efficient physical execution plan. It parses and rewrites the query, enumerates many equivalent plans (join orders, join algorithms, access paths), estimates each one's cost from statistics, and picks the cheapest.",
      why: "SQL says <i>what</i> you want, not <i>how</i> to get it — and equivalent plans can differ by 1000× in speed. The optimizer is the component that makes declarative queries fast, and understanding it is how you explain (and fix) why a query is slow.",
      how: "A pipeline: parse → bind → logical rewrites (predicate pushdown, etc.) → physical plan search (pruned by dynamic programming) → cardinality estimation from statistics → cost each plan → choose the minimum. The chosen plan goes to the executor and is often cached."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Reading the optimizer's choice with EXPLAIN",
      lang: "sql",
      code:
        "EXPLAIN (ANALYZE, BUFFERS)\n" +
        "SELECT c.name, sum(o.total)\n" +
        "FROM orders o JOIN customers c ON o.cust_id = c.id\n" +
        "WHERE o.created_at >= '2026-01-01'\n" +
        "GROUP BY c.name;\n" +
        "\n" +
        "-- The plan tree shows the optimizer's decisions, e.g.:\n" +
        "--   HashAggregate                       (group by name)\n" +
        "--     -> Nested Loop                     (join algorithm chosen)\n" +
        "--          -> Seq Scan on orders  (rows=40000 ... filter pushed down)\n" +
        "--          -> Index Scan on customers using customers_pkey  (access path)\n" +
        "-- Compare 'rows=' (estimated) vs 'actual rows=' -> a big gap means bad stats.",
      highlights: [1, 12]
    },
    reference: [
      ["optimizer", "Turns a query into an efficient physical plan by cost-based search"],
      ["logical plan", "Relational-algebra tree of WHAT to compute (join/filter/project)"],
      ["physical plan", "The chosen algorithms + access paths, i.e. HOW"],
      ["rewrite", "Semantics-preserving logical transformation (e.g. predicate pushdown)"],
      ["predicate pushdown", "Applying filters as early as possible to shrink data"],
      ["plan search", "Enumerating physical plans, pruned by dynamic programming"],
      ["cardinality", "Estimated number of rows flowing through an operator"],
      ["cost model", "Scores a plan (I/O + CPU) from its estimated cardinalities"],
      ["EXPLAIN", "Shows the chosen plan; ANALYZE adds actual timings/rows"],
      ["plan cache", "Reusing a compiled plan (risking parameter sniffing)"]
    ],
    internals:
      "<p>Optimization is a compilation pipeline. After <b>parse</b> and <b>bind</b> (resolving names/types against the catalog) the query is a <b>logical plan</b> of relational-algebra operators. <b>Rewrite</b> rules produce equivalent, cheaper forms — predicate pushdown, projection pruning, subquery unnesting, constant folding — shrinking data before any physical decision.</p>" +
      "<p>Then comes <b>physical plan search</b>: for each logical operator the optimizer chooses concrete algorithms (scan type, join algorithm) and considers join orders. Because the join-order space is factorial, it uses <b>dynamic programming</b> (the classic System-R approach: compute the best plan for each subset of relations bottom-up) plus heuristics to keep the search bounded. Each candidate is scored by a <b>cost model</b> that combines estimated I/O and CPU, and those estimates are driven by <b>cardinality estimation</b> from column statistics (histograms, n_distinct, MCVs). The plan with the lowest estimated cost wins.</p>" +
      "<p>The Achilles' heel is estimation: costs are only as trustworthy as the row-count estimates, and errors <b>compound</b> up a deep plan tree. That's why the same optimizer produces a great plan one week and a catastrophic one the next when data or statistics shift.</p>",
    engineering:
      "<p>Treat the optimizer as a partner you feed good information. The highest-leverage habits: keep <b>statistics fresh</b> (auto-analyze, and manual ANALYZE after big data changes), and read <b>EXPLAIN (ANALYZE)</b> to compare <i>estimated</i> vs <i>actual</i> rows — a large gap is the fingerprint of a stats problem that will produce bad plans.</p>" +
      "<p>Write <b>sargable</b> SQL so rewrites and index access are possible (don't wrap indexed columns in functions). For correlated columns, add extended/multicolumn statistics so the optimizer stops assuming independence. Understand <b>plan caching</b> and parameter sniffing: a plan compiled for a selective parameter can be disastrous when reused for a non-selective one. Reach for query hints or plan pinning only after fixing the inputs — hints freeze a decision that may become wrong as data evolves.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Read the plan, don't guess.</b> <code>EXPLAIN (ANALYZE)</code> shows the optimizer's actual choices and — crucially — estimated vs actual row counts. A big estimate/actual gap is almost always the root cause of a slow query." },
      { kind: "warn", html: "<b>Stale statistics cause catastrophic plans.</b> After bulk loads or steady growth, estimates drift until one crosses a threshold and flips the plan (index→seq, nested-loop→hash). Keep auto-analyze healthy; ANALYZE after big changes." },
      { kind: "info", html: "<b>Parameter sniffing:</b> a cached plan is compiled for the first parameter value it sees. If that value is atypically selective (or not), every later execution reuses a plan tuned for the wrong distribution. Watch for it on parameterized hot queries." }
    ],
    failureModes:
      "<p><b>Bad plan from stale/insufficient stats:</b> misestimated cardinality picks a disastrous plan (e.g. nested loop over millions). <i>Fix:</i> ANALYZE; extended statistics; verify with EXPLAIN ANALYZE.</p>" +
      "<p><b>Correlated predicates:</b> the optimizer assumes column independence, underestimating rows when columns are correlated (city+country). <i>Fix:</i> multicolumn/extended statistics.</p>" +
      "<p><b>Parameter sniffing:</b> a cached plan good for one bind value is terrible for another. <i>Fix:</i> plan-cache controls, recompile hints, or separate queries.</p>" +
      "<p><b>Non-sargable SQL:</b> functions on indexed columns block rewrites/index use, forcing scans. <i>Fix:</i> expression indexes or rewrite the predicate.</p>",
    quickCheck: [
      {
        q: "A query that was fast for months suddenly becomes slow after the table grew — with no code or schema change. What's the most likely cause?",
        options: [
          "The SQL parser degraded",
          "A cardinality estimate crossed a threshold (or stats went stale), flipping the optimizer to a much worse plan",
          "The database ran out of disk",
          "The network got slower"
        ],
        answer: 1,
        why: "As data grows, estimated row counts change; at some point the optimizer flips access paths or join algorithms (e.g. index→seq, or nested-loop over now-huge inputs), or stale stats misestimate rows. Re-analyze and read EXPLAIN ANALYZE to confirm.",
        diff: "medium"
      },
      {
        q: "What is predicate pushdown, and why does it help?",
        options: [
          "Caching the query plan for reuse",
          "Moving filters as early as possible so operators above them process fewer rows",
          "Pushing the query to a read replica",
          "Converting a subquery into a join"
        ],
        answer: 1,
        why: "Predicate pushdown is a logical rewrite that applies filters close to the data source, so joins and other operators above process far less data — often the single biggest optimization, done before costing.",
        diff: "easy"
      },
      {
        q: "Why doesn't the optimizer simply evaluate every possible plan and pick the true best one?",
        options: [
          "It would violate SQL standards",
          "The join-order space is factorial, so it uses dynamic programming and heuristics to search a pruned space in bounded time",
          "Plans can't be compared numerically",
          "It only knows one join algorithm"
        ],
        answer: 1,
        why: "The number of join orders grows factorially, making exhaustive search infeasible for many-way joins. The optimizer uses dynamic programming (System-R style) plus heuristics to find a good plan within a time budget — not a provably optimal one.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Walk me through what a cost-based query optimizer does, end to end.",
        a: "It compiles a declarative query into an efficient physical plan. First parse and bind — turn SQL into a tree and resolve names/types against the catalog — producing a logical (relational-algebra) plan of what to compute. Then apply logical rewrites that preserve semantics but reduce work: predicate pushdown, projection pruning, subquery unnesting, constant folding. Next, search the physical plan space: choose access paths (seq vs index) and join algorithms (nested-loop/hash/sort-merge) and consider join orders, pruning the factorial search with dynamic programming and heuristics. Estimate the cardinality of each operator from column statistics, cost each candidate plan by combining estimated I/O and CPU, and pick the minimum. The winning plan goes to the executor and is often cached. The whole thing lives or dies on cardinality estimation.",
        tip: "Name the stages in order and end on 'it's all bounded by cardinality estimation' — that's the punchline interviewers want."
      },
      {
        q: "Why is cardinality estimation the hard part, and how do estimation errors hurt?",
        a: "Cost is dominated by how many rows flow through each operator, so the optimizer must estimate row counts before executing. It does this from statistics — histograms, distinct counts, most-common-values — using selectivity × rows and assuming column independence. The trouble is those assumptions break: correlated columns, skew, and stale statistics all produce wrong estimates, and errors compound multiplicatively up a deep plan tree, so a small mistake at a leaf can be enormous at the root. A wrong estimate leads directly to a wrong plan choice — the classic being a nested loop chosen because the optimizer thought the outer side was tiny, then run over millions of rows. Mitigations: keep stats fresh, add extended/multicolumn stats for correlations, and verify estimated vs actual with EXPLAIN ANALYZE.",
        tip: "The phrase 'errors compound up the tree' plus a concrete nested-loop-over-millions example lands this one."
      },
      {
        q: "How do you diagnose and fix a query the optimizer is planning badly?",
        a: "Start with EXPLAIN (ANALYZE, BUFFERS) and compare estimated vs actual rows at each node — the node where they diverge most is the root cause. If it's a stats problem (usually is), run ANALYZE, and add extended statistics if the divergence is from correlated columns. Check for non-sargable predicates (functions on indexed columns) that block index use, and rewrite them or add expression indexes. Consider whether parameter sniffing cached a plan for an atypical value. Only after the inputs are correct would I consider hints or plan pinning, and I'd treat those as last resorts because they freeze a decision that can become wrong as data evolves. The mindset is: fix what the optimizer knows (statistics, sargability) before overriding what it decides.",
        tip: "Lead with 'compare estimated vs actual rows in EXPLAIN ANALYZE' — it's the concrete first move that shows real debugging experience."
      }
    ],
    businessLens: {
      task: "ShopKart's revenue-by-customer report (orders ⋈ customers)",
      meaning: "The same report can return in 200ms or hang for minutes depending on the plan chosen.",
      system: "OLTP/reporting on Postgres (cost-based optimizer)",
      point: "ShopKart's revenue report joins a huge orders table to customers with a date filter. The optimizer decides everything: push the date filter below the join, then pick nested-loop-with-index (great when the date filter is selective) over a hash join (better when it isn't). When it estimates well, the report is instant; when statistics go stale after a big import, it misjudges the row count, keeps the nested loop over millions of rows, and the report hangs. That's why ShopKart treats ANALYZE and reading EXPLAIN as first-class operational habits — the optimizer's inputs are a production concern, not a footnote."
    }
  };
})();
