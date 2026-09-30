/* ============================================================
   deepdives/cost-based-optimization.js — "Cost-Based Optimization".
   Registers DBLab.deepDives['cost-based-optimization'] (concept m17).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  function Plan(name, sub, cost, mark) { return { name: name, sub: sub, cost: cost, mark: mark || null }; }

  // Scene: costing access paths on ShopKart's products table (2,000,000 rows).
  var STATS = [
    ["n_rows", "2,000,000"], ["n_distinct(category)", "20"], ["MCV top", "'books' 9%"],
    ["histogram", "100 buckets on price"], ["null_frac(category)", "0.00"]
  ];

  var STEPS = [
    {
      label: "1 · Cost is a function of row counts",
      what: "A cost-based optimizer scores each plan with a number, and that number is driven almost entirely by <b>how many rows</b> flow through each operator. Get the row counts right and the costs — and the plan choice — are right.",
      why: "Everything downstream (which access path, which join, how much memory) depends on cardinality. This is why estimation is the optimizer's central, most error-prone job: a wrong row count silently produces a wrong plan.",
      how: "The optimizer estimates rows per operator, converts them to a cost (I/O + CPU), sums the tree, and compares plans. The estimate comes from stored <b>statistics</b>, not from running the query.",
      when: "During costing of every candidate plan for every query.",
      mistake: "Thinking cost is about the query's text complexity. It's about estimated data volume — a 'simple' query over a misestimated huge intermediate result is the expensive one.",
      interview: "“What drives a plan's estimated cost?” Estimated cardinality at each operator, turned into I/O + CPU cost and summed up the tree.",
      example: "Whether ShopKart's category filter is 'cheap' depends entirely on how many of the 2M product rows it's estimated to return.",
      viz: { stats: [], predicate: null, estRows: null, actualRows: null, plans: [], note: "Cost ≈ estimated_rows × per-row I/O+CPU, summed over the plan tree. Row counts are everything." }
    },
    {
      label: "2 · The optimizer keeps statistics",
      what: "For each column the database stores <b>statistics</b>: total row count, number of distinct values (<code>n_distinct</code>), a <b>most-common-values</b> list with frequencies, a <b>histogram</b> of the value distribution, and the fraction of NULLs.",
      why: "These summaries let the optimizer estimate selectivity <i>without</i> scanning the data. They're gathered by <code>ANALYZE</code> (and auto-analyze) by sampling the table, and refreshed as data changes.",
      how: "A background/manual sample builds the histogram and MCV list. The optimizer reads these at planning time — they're the entire basis for its row-count guesses.",
      when: "Collected by auto-analyze on data change, or manually via <code>ANALYZE</code>; read on every plan.",
      mistake: "Forgetting these are a <i>sample</i> taken at a point in time. If the data shifts and stats aren't refreshed, every estimate built on them is wrong.",
      interview: "“What statistics does the optimizer use?” Row count, n_distinct, most-common-values with frequencies, a histogram of the distribution, and null fraction — per column.",
      example: "ShopKart's products stats: 2M rows, 20 distinct categories, 'books' is the most common at 9%, a 100-bucket histogram on price.",
      viz: { stats: STATS, predicate: null, estRows: null, actualRows: null, plans: [], note: "Per-column stats (n_distinct, MCV, histogram, null_frac) let the optimizer estimate selectivity without touching the data." }
    },
    {
      label: "3 · Selectivity → estimated rows",
      what: "For <code>WHERE category = 'electronics'</code>, the optimizer looks up 'electronics' in the MCV/histogram to get a <b>selectivity</b> (say 3%), then estimates rows as <code>selectivity × n_rows = 0.03 × 2,000,000 ≈ 60,000</code>.",
      why: "This single estimate decides the plan. 60k out of 2M is selective — few enough that an index is likely worthwhile. The whole access-path decision hinges on this number.",
      how: "selectivity = fraction of rows matching the predicate, read from stats; estimated rows = selectivity × table rows, then propagated up through joins and aggregates.",
      when: "For every predicate, on every plan.",
      mistake: "Assuming uniform distribution. Real columns are skewed — that's exactly why MCV lists and histograms exist, and why a naive 1/n_distinct estimate is often wrong.",
      interview: "“How is the number of rows a predicate returns estimated?” selectivity (from histogram/MCV) × table rows; skew is captured by the MCV list and histogram buckets.",
      example: "'electronics' is estimated at ~3% → ~60,000 of ShopKart's 2M products.",
      viz: { stats: STATS, predicate: "category = 'electronics'", estRows: 60000, actualRows: null, plans: [], note: "selectivity (3% from stats) × 2,000,000 rows ≈ 60,000 estimated rows. This number drives the choice." }
    },
    {
      label: "4 · Estimate → cost → access path",
      what: "With ~60,000 rows estimated, the optimizer costs each access path. An <b>index scan</b> (descend + ~60k targeted fetches) costs less than a <b>sequential scan</b> of all 2M rows. Index wins.",
      why: "This is cost-based optimization in one screen: the estimate becomes a cost, the costs are compared, and the cheaper path is chosen — no execution required.",
      how: "Seq scan cost ≈ read all pages (flat, large). Index scan cost ≈ index descent + estimated_matches × random fetch. At 3% selectivity the index total is lower, so it's chosen.",
      when: "For each candidate access path during costing.",
      mistake: "Believing an index is always cheaper. It's cheaper only up to a selectivity threshold — the next step shows it flip.",
      interview: "“When does the optimizer choose an index scan over a seq scan?” When estimated selectivity is low enough that targeted (random) fetches cost less than sweeping every page sequentially.",
      example: "For 'electronics' (~60k of 2M), ShopKart's planner picks the index scan over a full table scan.",
      viz: { stats: STATS, predicate: "category = 'electronics'", estRows: 60000, actualRows: null,
        plans: [Plan("Index Scan", "~60k targeted fetches", 800, "win"), Plan("Seq Scan", "read all 2M rows", 2500, "lose")],
        note: "~60k rows → Index Scan (cost 800) beats Seq Scan (cost 2500). Estimate → cost → choice." }
    },
    {
      label: "5 · The crossover: when seq scan wins",
      what: "Change the predicate to <code>price &gt; 0</code> — it matches nearly <b>all</b> rows. Now the estimate is ~2,000,000, so the index would do 2M random fetches: far worse than one sequential sweep. The plan <b>flips to Seq Scan</b>.",
      why: "This crossover is why 'just add an index' isn't a universal fix. Past a selectivity threshold (often ~5–20%), random index fetches lose to a single sequential scan — and the optimizer knows it from the estimate.",
      how: "Index cost grows with estimated matches (random I/O), while seq cost is flat. As selectivity rises the two lines cross; beyond the crossover, seq scan is cheaper and is chosen.",
      when: "Whenever a predicate is non-selective (returns a large fraction of the table).",
      mistake: "Adding an index for a low-selectivity predicate and expecting it to be used. The optimizer will correctly ignore it in favor of a seq scan.",
      interview: "“Why would the optimizer ignore a perfectly good index?” Because the predicate isn't selective enough — scanning sequentially is cheaper than millions of random index fetches.",
      example: "A ShopKart filter that matches most products (e.g. in-stock) is served by a seq scan; the index would be slower.",
      viz: { stats: STATS, predicate: "price > 0  (matches ~all)", estRows: 2000000, actualRows: null,
        plans: [Plan("Index Scan", "~2M random fetches", 9000, "lose"), Plan("Seq Scan", "one sequential sweep", 2500, "win")],
        note: "~2M rows → Seq Scan (2500) now beats Index Scan (9000). Past the crossover, sequential wins." }
    },
    {
      label: "6 · Stale statistics → catastrophe",
      what: "Data changed but <code>ANALYZE</code> hasn't run. Stats still say 'electronics' is 3% (60k), so the optimizer picks the index — but there are now <b>4,000,000</b> matching rows. <code>EXPLAIN ANALYZE</code> reveals <b>estimated 60k, actual 4M</b>: the index plan is a disaster.",
      why: "This is the number-one cause of sudden query slowdowns 'with no code change'. The plan was reasonable <i>for the stats</i> — but the stats were lies, so the estimate, cost, and choice were all wrong.",
      how: "The optimizer trusts stale statistics, estimates low, picks the index, and then executes millions of random fetches it thought were thousands. The gap between estimated and actual rows is the smoking gun.",
      when: "After bulk loads, big deletes, or steady growth without analyze; especially on fast-changing tables.",
      mistake: "Blaming the optimizer. It chose correctly given its inputs — the fix is fresh statistics, not a hint.",
      interview: "“A query regressed badly after a data import — first thing you check?” Estimated vs actual rows in EXPLAIN ANALYZE; a huge gap means stale stats — run ANALYZE.",
      example: "After ShopKart re-categorizes millions of items into 'electronics', the report crawls until ANALYZE refreshes the stats and the planner switches to a seq scan.",
      viz: { stats: [["stats say", "'electronics' = 3%"], ["reality", "'electronics' = 200%+ growth"]], predicate: "category = 'electronics'", estRows: 60000, actualRows: 4000000,
        plans: [Plan("Index Scan (chosen)", "planned for 60k, ran 4M", 9000, "lose")],
        note: "Estimated 60k but ACTUAL 4M → index plan executes millions of random fetches. Classic stale-stats disaster." }
    },
    {
      label: "7 · Keeping estimates honest",
      what: "Fixes: keep <code>ANALYZE</code> current (auto-analyze), add <b>extended statistics</b> for correlated columns, verify plans with <code>EXPLAIN (ANALYZE)</code> by comparing estimated vs actual rows, and watch for <b>parameter sniffing</b> on cached plans.",
      why: "The optimizer is only as good as its statistics. Almost all 'the optimizer chose wrong' problems are really 'the optimizer was fed wrong numbers' — so the durable fix is better inputs, not overriding decisions.",
      how: "Auto-analyze after change thresholds; <code>CREATE STATISTICS</code> for correlated columns (city+country) that break the independence assumption; read EXPLAIN ANALYZE routinely; consider plan-cache controls for skewed parameterized queries.",
      when: "Continuously (auto-analyze), and whenever a query regresses or data distribution shifts.",
      mistake: "Reaching for query hints first. Hints freeze a decision that becomes wrong as data evolves; fix statistics and sargability before pinning plans.",
      interview: "“How do you help the optimizer estimate correlated columns like (city, country)?” Extended/multicolumn statistics, so it stops assuming the columns are independent and underestimating rows.",
      example: "ShopKart adds extended statistics on (brand, category) — highly correlated — so the optimizer stops underestimating combined filters and picks the right plan.",
      viz: { stats: STATS, predicate: "category = 'electronics'", estRows: 60000, actualRows: 62000,
        plans: [Plan("Index Scan", "estimate now matches reality", 820, "win"), Plan("Seq Scan", "", 2500, "lose")],
        note: "After ANALYZE, estimated 60k ≈ actual 62k → the right plan. Fresh stats + extended stats keep estimates honest." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function planRow(p, maxCost) {
      var cls = "dd-plan" + (p.mark ? " " + p.mark : "");
      var pct = p.cost > 0 ? Math.max(6, Math.round((p.cost / maxCost) * 100)) : 0;
      var fillCls = "dd-costbar-fill" + (p.mark === "win" ? " win" : (p.mark === "lose" ? " lose" : ""));
      return '<div class="' + cls + '"><div class="dd-plan-name">' + p.name + (p.sub ? "<small>" + p.sub + "</small>" : "") + "</div>" +
        '<div class="dd-costbar"><div class="' + fillCls + '" style="width:' + pct + '%"></div>' +
        '<span class="dd-costbar-label">cost ' + p.cost + "</span></div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch the optimizer turn column statistics into a row estimate, ' +
          "a cost, and an access-path choice — and see stale stats wreck it.</div>";
        return;
      }
      var html = "";
      if (s.stats && s.stats.length) {
        html += '<div class="dd-section"><div class="dd-section-label">Column statistics (products)</div>' +
          '<div class="dd-kv-list">' + s.stats.map(function (r) {
            return '<span class="dd-kv-item">' + r[0] + " = " + r[1] + "</span>";
          }).join("") + "</div></div>";
      }
      if (s.predicate) {
        var chips = '<span class="dd-chip dd-chip--info">WHERE ' + s.predicate + "</span>";
        if (s.estRows != null) chips += ' <span class="dd-chip dd-chip--accent">estimated ' + s.estRows.toLocaleString() + " rows</span>";
        if (s.actualRows != null) {
          var bad = Math.abs(s.actualRows - s.estRows) > s.estRows;
          chips += ' <span class="dd-chip ' + (bad ? "dd-chip--bad" : "dd-chip--ok") + '">actual ' + s.actualRows.toLocaleString() + " rows</span>";
        }
        html += '<div class="dd-section"><div class="dd-section-label">Predicate &amp; cardinality</div><div>' + chips + "</div></div>";
      }
      if (s.plans && s.plans.length) {
        var maxCost = Math.max.apply(null, s.plans.map(function (p) { return p.cost || 1; }));
        html += '<div class="dd-section"><div class="dd-section-label">Access-path cost</div>' +
          '<div class="dd-oplist">' + s.plans.map(function (p) { return planRow(p, maxCost); }).join("") + "</div></div>";
      }
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["cost-based-optimization"] = {
    slug: "cost-based-optimization",
    overview: {
      what: "<b>Cost-based optimization</b> is how the optimizer chooses a plan: it estimates the <b>cardinality</b> (row count) at each operator from column <b>statistics</b>, converts that into a <b>cost</b> (I/O + CPU), and picks the plan with the lowest total cost.",
      why: "It's the mechanism behind every 'why is this query fast/slow?' answer. Because the choice is driven by estimated row counts, the quality of statistics determines the quality of the plan — and stale statistics are the most common cause of sudden slowdowns.",
      how: "ANALYZE samples each column into a histogram, distinct count, and most-common-values list. At plan time the optimizer computes selectivity × rows for each predicate, propagates estimates up the tree, costs each candidate, and chooses the cheapest — flipping access paths and join algorithms as the estimates change."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Statistics, estimates, and the estimate/actual gap",
      lang: "sql",
      code:
        "ANALYZE products;                     -- refresh column statistics (sampled)\n" +
        "\n" +
        "-- Inspect what the optimizer knows:\n" +
        "SELECT n_distinct, most_common_vals, most_common_freqs\n" +
        "FROM pg_stats WHERE tablename='products' AND attname='category';\n" +
        "\n" +
        "-- The truth test: estimated vs actual rows\n" +
        "EXPLAIN (ANALYZE) SELECT * FROM products WHERE category = 'electronics';\n" +
        "--  Index Scan ... (rows=60000 ...) (actual rows=4000000 ...)\n" +
        "--                    ^ estimate            ^ reality  -> stale stats! run ANALYZE\n" +
        "\n" +
        "-- Correlated columns break the independence assumption:\n" +
        "CREATE STATISTICS s_brand_cat (dependencies) ON brand, category FROM products;",
      highlights: [1, 9, 13]
    },
    reference: [
      ["cardinality", "Estimated number of rows produced by an operator"],
      ["selectivity", "Fraction of rows a predicate is estimated to keep"],
      ["statistics", "Per-column summaries: n_distinct, MCV, histogram, null_frac"],
      ["histogram", "Buckets describing a column's value distribution"],
      ["MCV", "Most-common-values list with frequencies (captures skew)"],
      ["cost model", "Converts estimated rows into I/O + CPU cost"],
      ["crossover", "Selectivity point where seq scan becomes cheaper than index"],
      ["ANALYZE", "Samples the table to (re)build statistics"],
      ["extended statistics", "Multicolumn stats for correlated columns"],
      ["estimate/actual gap", "EXPLAIN ANALYZE divergence — the sign of bad stats"]
    ],
    internals:
      "<p>Cost-based optimization rests on three layers. <b>Statistics</b>, gathered by sampling (ANALYZE), summarize each column: a histogram for the distribution, a most-common-values list for skew, a distinct count for selectivity, and a null fraction. <b>Estimation</b> turns a predicate into a selectivity (looked up in the MCV/histogram) and multiplies by row count to get estimated cardinality, then propagates estimates up through joins (using join-key distinct counts) and aggregates. <b>Costing</b> converts each operator's estimated rows into an I/O + CPU cost and sums the plan tree.</p>" +
      "<p>The decisive behavior is the <b>crossover</b>: index-scan cost rises with estimated matches (each is a potential random fetch) while seq-scan cost is roughly flat, so below a selectivity threshold the index wins and above it the sequential scan does. The same logic flips join algorithms. Because these decisions are threshold-driven, a small change in the estimate can flip the whole plan.</p>" +
      "<p>The fragile assumption is <b>independence</b>: the optimizer assumes predicates on different columns are independent and multiplies their selectivities. For correlated columns (city+country, brand+category) this underestimates rows badly — which is what extended/multicolumn statistics exist to fix.</p>",
    engineering:
      "<p>The practical discipline is to keep the optimizer's inputs trustworthy and to verify its outputs. <b>Keep statistics fresh</b>: rely on auto-analyze, but run <code>ANALYZE</code> manually after bulk loads, big deletes, or bulk updates, because the plan is only as good as the sample it was built from. <b>Read EXPLAIN (ANALYZE)</b> as a habit and compare <i>estimated</i> vs <i>actual</i> rows — the node with the biggest gap is your problem.</p>" +
      "<p>For correlated columns, add <b>extended statistics</b> so the optimizer stops assuming independence. Write <b>sargable</b> predicates so estimates and index access are possible. Be aware of <b>parameter sniffing</b>: a cached plan compiled for one bind value can be terrible for another distribution. And prefer fixing statistics over query hints — hints pin a choice that will drift out of correctness as the data changes.</p>",
    gotchas: [
      { kind: "warn", html: "<b>Stale statistics are the #1 cause of sudden slowdowns.</b> After a big data change the estimate can be off by orders of magnitude, flipping the plan to a disaster. Run <code>ANALYZE</code> after bulk changes; keep auto-analyze healthy." },
      { kind: "tip", html: "<b>The estimate/actual gap in <code>EXPLAIN ANALYZE</code> is your best diagnostic.</b> If a node estimates 60k rows but produces 4M, the plan was chosen on a lie — fix the stats, not the plan." },
      { kind: "info", html: "<b>The optimizer assumes column independence.</b> For correlated columns (brand+category, city+country) it multiplies selectivities and underestimates rows. Add extended/multicolumn statistics to correct it." }
    ],
    failureModes:
      "<p><b>Stale-stats plan flip:</b> outdated estimates pick an index scan that becomes millions of random fetches (or vice versa). <i>Fix:</i> ANALYZE; tune auto-analyze thresholds.</p>" +
      "<p><b>Correlated-column underestimation:</b> independence assumption undercounts rows for correlated predicates, favoring nested loops that explode. <i>Fix:</i> extended statistics.</p>" +
      "<p><b>Skew blindness:</b> without a good MCV list, a filter on a hot value is mis-estimated. <i>Fix:</i> higher statistics target; ensure ANALYZE captured the skew.</p>" +
      "<p><b>Parameter sniffing:</b> a cached plan tuned for one value is reused for a very different one. <i>Fix:</i> plan-cache controls, recompile, or split queries.</p>",
    quickCheck: [
      {
        q: "The optimizer estimates a predicate returns 60,000 rows and picks an index scan, but EXPLAIN ANALYZE shows 4,000,000 actual rows and the query is slow. What's the root cause?",
        options: [
          "The index is corrupt",
          "Stale/incorrect statistics made the estimate far too low, so the optimizer chose a plan that's terrible for the real row count",
          "The query has a syntax error",
          "The buffer pool is too small"
        ],
        answer: 1,
        why: "A large estimated-vs-actual gap means the optimizer planned on wrong cardinality. It chose the index for 60k rows, but 4M random fetches is a disaster. The fix is fresh statistics (ANALYZE), not a plan hint.",
        diff: "medium"
      },
      {
        q: "Why does the optimizer switch from an index scan to a sequential scan as a predicate matches more and more rows?",
        options: [
          "Indexes stop working above a size",
          "Index cost grows with matches (random fetches) while seq-scan cost is flat, so past a selectivity crossover the sequential scan is cheaper",
          "Sequential scans are always cheaper",
          "The index gets locked"
        ],
        answer: 1,
        why: "Each index match is a potential random fetch, so index cost rises with the number of matches; a seq scan is one flat sweep. Beyond a selectivity threshold the lines cross and the seq scan wins — which is why an index isn't used for low-selectivity predicates.",
        diff: "medium"
      },
      {
        q: "A filter on two correlated columns (brand='Apple' AND category='electronics') is badly underestimated. Why, and what's the fix?",
        options: [
          "The columns need indexes; add them",
          "The optimizer assumes columns are independent and multiplies selectivities; add extended/multicolumn statistics",
          "The histogram is disabled; enable it",
          "Correlated columns can't be estimated at all"
        ],
        answer: 1,
        why: "By default the optimizer multiplies per-column selectivities assuming independence, so correlated predicates come out far too low. Extended (multicolumn) statistics capture the correlation and correct the estimate.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "How does a cost-based optimizer decide between an index scan and a sequential scan?",
        a: "It estimates how many rows the predicate returns, using column statistics — a histogram and most-common-values list give the selectivity, and selectivity × row count gives the estimated cardinality. It then costs each access path: a sequential scan is roughly a flat cost to read all pages, while an index scan costs the index descent plus one (often random) fetch per estimated match. For a selective predicate the index's targeted fetches total less, so it's chosen; as selectivity rises, index cost grows with the match count until it crosses the flat seq-scan cost, at which point the optimizer switches to a sequential scan. So the decision is entirely a function of the estimated row count relative to a crossover threshold — which is why an index on a low-selectivity column is correctly ignored.",
        tip: "The crossover framing — 'index cost grows with matches, seq cost is flat' — is exactly what interviewers want to hear."
      },
      {
        q: "Why do stale statistics cause such dramatic query regressions?",
        a: "The optimizer never runs the query to decide the plan — it estimates cardinality purely from stored statistics, and cost decisions are threshold-driven. When data changes but statistics don't, the estimate can be off by orders of magnitude, and once it crosses a threshold the optimizer flips to a plan that's catastrophic for the real data — the classic being a nested loop or index scan chosen for a few thousand rows that actually processes millions of random fetches. And because estimation errors compound up a plan tree, a wrong leaf estimate becomes an enormous wrong estimate at the root. The tell is EXPLAIN ANALYZE showing estimated rows far from actual rows; the fix is ANALYZE to refresh the sample, not a hint.",
        tip: "Tie it to 'the plan was correct for the stats, but the stats were wrong' — it shows you understand it's an input problem."
      },
      {
        q: "What is the independence assumption, and when does it hurt you?",
        a: "To estimate a conjunction of predicates on different columns, the optimizer assumes the columns are statistically independent and multiplies their individual selectivities. That's fine for genuinely independent columns, but many real columns are correlated — city and country, brand and category, order_date and ship_date. For those, multiplying selectivities drastically underestimates the row count (a filter that's individually 10% on each might together match far more than 1%), which leads the optimizer to choose plans like nested loops that then explode. The fix is extended (multicolumn) statistics — in Postgres, CREATE STATISTICS — which let the optimizer model the dependency and estimate the combined selectivity correctly.",
        tip: "Have a concrete correlated pair (city/country) ready and name CREATE STATISTICS — specificity signals real experience."
      }
    ],
    businessLens: {
      task: "Costing filters on ShopKart's 2M-row products table",
      meaning: "The same filter uses an index or a full scan depending purely on the estimated match count.",
      system: "OLTP/reporting on Postgres (cost-based optimizer)",
      point: "When ShopKart filters products by a selective category, the optimizer estimates ~60k of 2M rows and picks an index; when it filters by something that matches most products, it estimates ~2M and correctly switches to a sequential scan. The system only works when the statistics are fresh — after a big re-categorization import, stale stats made it estimate 60k when the truth was 4M, and the index plan turned a fast report into a hang until ANALYZE ran. That's why ShopKart treats statistics freshness and reading estimated-vs-actual in EXPLAIN ANALYZE as core operational habits, and adds extended statistics on correlated attributes like brand+category."
    }
  };
})();
