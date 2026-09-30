/* ============================================================
   deepdives/query-execution.js — "Query Execution" deep dive.
   Registers DBLab.deepDives['query-execution'] (concept m24).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Operator tree for: SELECT c.name, sum(o.total) FROM orders o
  //   JOIN customers c ON o.cust_id=c.id WHERE o.created_at>=... GROUP BY c.name
  // node = { label, cls }.  cls: on-path (active pull) | split (pipeline breaker) | is-new (emitting)
  function tree(clsMap, withLimit) {
    function n(label) { return { keys: [label], cls: clsMap[label] || "" }; }
    var levels = [
      [n("Aggregate")],
      [n("Hash Join")],
      [n("Seq Scan · orders"), n("Index Scan · customers")]
    ];
    if (withLimit) levels.unshift([n("Limit 10")]);
    return levels;
  }

  var STEPS = [
    {
      label: "1 · The plan is a tree of operators",
      what: "The optimizer's chosen plan is a <b>tree of physical operators</b> — scans at the leaves, joins and aggregates above. The executor runs it with the <b>iterator (Volcano) model</b>: each operator exposes <code>open()</code>, <code>next()</code>, <code>close()</code>, and rows are <b>pulled</b> from the root downward.",
      why: "This uniform interface is what lets the engine compose any operators into a plan and stream rows through them. Understanding pull-based execution explains pipelining, memory use, <code>LIMIT</code> behavior, and where time goes.",
      how: "The root's <code>next()</code> asks its child for a row, which asks <i>its</i> child, down to a scan that reads from the buffer pool. Each operator transforms the rows it pulls and hands them up.",
      when: "Every query, after the optimizer hands the physical plan to the executor.",
      mistake: "Picturing execution as running each operator fully then passing a result set. Classic execution is demand-driven and row-at-a-time, not batch-then-hand-off.",
      interview: "“How does a database execute a plan?” As a tree of operators using the iterator model — open/next/close — pulling rows from the root down to the scans (Volcano model).",
      example: "ShopKart's report plan: Aggregate ← Hash Join ← (Seq Scan orders, Index Scan customers). The executor pulls rows down this tree.",
      viz: { levels: tree({}), note: "The physical plan is an operator tree. Execution pulls rows from the root down via open()/next()/close() — the Volcano model." }
    },
    {
      label: "2 · Leaves produce the rows",
      what: "At the bottom, <b>scan</b> operators produce rows from storage: a <b>Seq Scan</b> on <code>orders</code> (with the date filter) and an <b>Index Scan</b> on <code>customers</code>. These are the sources every row flows up from.",
      why: "Everything above is transformation; the leaves are where data actually enters the pipeline. The access-path choices (seq vs index) made by the optimizer live here.",
      how: "Each scan's <code>next()</code> returns the next qualifying row from the buffer pool (reading pages as needed), applying any pushed-down filter as it goes.",
      when: "Continuously as upper operators pull — leaves are re-entered on every <code>next()</code> until exhausted.",
      mistake: "Assuming a scan reads the whole table into memory first. It yields one row (or a batch) at a time on demand, not all at once.",
      interview: "“Where do rows originate in a plan?” At the leaf operators — the scans — which read from the buffer pool and yield qualifying rows upward on demand.",
      example: "ShopKart's Seq Scan streams recent orders; the Index Scan yields the matching customer for each — feeding the join above.",
      viz: { levels: tree({ "Seq Scan · orders": "is-new", "Index Scan · customers": "is-new" }),
        note: "Leaf scans produce rows from storage (buffer pool), applying pushed-down filters. Everything above transforms them." }
    },
    {
      label: "3 · next() pulls rows up the tree",
      what: "Execution is <b>demand-driven</b>: the root calls <code>next()</code> on its child, which calls <code>next()</code> on its child, down to a scan. One row bubbles up the chain per top-level <code>next()</code>. The consumer <b>pulls</b>; producers don't push.",
      why: "Pull-based execution means work happens only when a row is actually requested — the foundation for streaming, early termination, and bounded memory. It's why a well-shaped plan doesn't compute rows nobody consumes.",
      how: "Each operator's <code>next()</code> pulls as many child rows as it needs to produce one output row, transforms them, and returns it. Control flows down; rows flow up.",
      when: "On every row the query produces.",
      mistake: "Thinking each operator finishes before the next starts. In a pipeline they're all active at once, each pulling from below as needed.",
      interview: "“What does 'pull-based' execution mean?” Consumers drive the work by calling next() down the tree; operators produce a row only when asked — the opposite of push-based streaming.",
      example: "For each output group, ShopKart's Aggregate pulls joined rows, which pull scanned rows — a single active pipeline from root to leaves.",
      viz: { levels: tree({ "Aggregate": "on-path", "Hash Join": "on-path", "Seq Scan · orders": "on-path", "Index Scan · customers": "on-path" }),
        note: "Control flows DOWN (next() calls), rows flow UP. One row is pulled through the whole chain per top-level next()." }
    },
    {
      label: "4 · Pipelining: stream without materializing",
      what: "Many operators are <b>pipelined</b> — they transform each row and pass it straight up without storing it: filters, projections, and the <b>probe</b> side of a hash join. Rows stream through with tiny, constant memory.",
      why: "Pipelining is why a query can process billions of rows without holding them all in memory, and why the first rows can appear before the last are read. It's the efficiency heart of the iterator model.",
      how: "A pipelined operator's <code>next()</code> pulls one child row, transforms it, and returns it immediately — no buffering. A chain of pipelined operators forms a streaming 'pipeline'.",
      when: "For non-blocking operators: scans (with filters), projections, nested-loop and hash-probe sides, unions.",
      mistake: "Assuming every operator buffers its input. Pipelined operators keep almost no state — that's what makes streaming cheap.",
      interview: "“What is a pipelined operator?” One that emits an output row per input row without materializing — filter, project, hash-probe — enabling streaming with constant memory.",
      example: "ShopKart's date filter and column projection stream: each order flows through them one at a time into the join, never buffered.",
      viz: { levels: tree({ "Hash Join": "on-path", "Seq Scan · orders": "on-path" }),
        note: "Pipelined operators (filter, project, hash-probe) pass each row straight up — streaming, constant memory, first rows early." }
    },
    {
      label: "5 · Pipeline breakers must materialize",
      what: "Some operators are <b>pipeline breakers</b>: they must consume <b>all</b> their input before producing any output. A <b>Sort</b>, a hash join's <b>build</b> side, and an <b>Aggregate</b> block and materialize — buffering data (and possibly spilling to disk).",
      why: "Breakers are where memory and latency concentrate. You can't emit the first grouped result until every input row has been seen; you can't probe a hash table until it's fully built. Recognizing breakers explains where a plan stalls and spills.",
      how: "A breaker's <code>open()</code>/first <code>next()</code> drains its child entirely (building a hash table, sorting, accumulating groups), then streams results. If the buffered data exceeds <code>work_mem</code>, it spills to disk.",
      when: "Sorts, hash builds, grouped/whole-relation aggregates, DISTINCT, window functions.",
      mistake: "Expecting <code>LIMIT</code> to make an aggregate or sort cheap. A breaker still consumes all input first — the LIMIT only trims the already-materialized output.",
      interview: "“What's a pipeline breaker?” An operator that must fully consume its input before emitting — sort, hash-build, aggregate — where memory concentrates and spills happen.",
      example: "ShopKart's Aggregate must read every joined row before it can emit any customer's total, and the hash join's build side must finish before probing starts.",
      viz: { levels: tree({ "Aggregate": "split", "Hash Join": "split" }),
        note: "Pipeline breakers (sort, hash-build, aggregate) consume ALL input before emitting → they buffer/materialize and may spill." }
    },
    {
      label: "6 · Early termination with LIMIT",
      what: "Add <code>LIMIT 10</code> on top. Because execution is pull-based, the <b>Limit</b> operator simply stops calling <code>next()</code> once it has 10 rows — the pipeline below <b>stops early</b> and never produces the rest.",
      why: "This is a superpower of demand-driven execution: you don't compute rows nobody asked for. A <code>LIMIT</code> over a pipelined plan can be dramatically cheaper than the un-limited query.",
      how: "Limit pulls 10 rows then returns EOF upward and <code>close()</code>s its child; pipelined producers below simply stop being asked. (But a pipeline breaker under the LIMIT still had to finish first.)",
      when: "Top-N queries, pagination, EXISTS/semi-joins — anywhere only some rows are needed.",
      mistake: "Believing <code>LIMIT</code> always makes a query cheap. If there's a sort or aggregate below it, that breaker still processes all input before the LIMIT can trim.",
      interview: "“Why can LIMIT make a query much faster — but sometimes not?” Pull-based execution stops early over pipelined operators; but a pipeline breaker (sort/aggregate) below the LIMIT still consumes all its input first.",
      example: "ShopKart's 'latest 10 orders' over an index-ordered scan stops after 10 rows; but 'top 10 customers by revenue' must aggregate everyone first.",
      viz: { levels: tree({ "Limit 10": "is-new", "Seq Scan · orders": "on-path" }, true),
        note: "Pull-based → Limit stops calling next() at 10 rows; pipelined producers below stop early. (A breaker below still finishes first.)" }
    },
    {
      label: "7 · Beyond one-row-at-a-time",
      what: "The classic iterator model has real per-row overhead (a virtual <code>next()</code> call per row per operator). Modern engines reduce it with <b>vectorized execution</b> (process a batch of rows per <code>next()</code>) and <b>compiled/JIT execution</b> (generate machine code for the plan).",
      why: "For analytical queries over billions of rows, per-row function-call and interpretation overhead dominates. Batching and compilation reclaim CPU efficiency — often 10×+ — which is why modern OLAP engines use them.",
      how: "Vectorized: each <code>next()</code> returns a column-oriented batch (e.g. 1024 rows), amortizing call overhead and enabling SIMD/cache-friendly loops. Compiled: the plan is lowered to native code, eliminating the interpreter.",
      when: "Analytical/OLAP workloads and modern engines (DuckDB, ClickHouse, Postgres JIT, Spark).",
      mistake: "Assuming row-at-a-time is inherent. It isn't — it's an interpretation-overhead choice, and vectorized/compiled execution is the standard fix for CPU-bound analytics.",
      interview: "“How do modern engines speed up execution over the Volcano model?” Vectorized execution (batch of rows per next, SIMD-friendly) and compiled/JIT execution (native code for the plan), cutting per-row overhead.",
      example: "ShopKart's analytics warehouse uses a vectorized engine so a billion-row aggregation isn't bottlenecked by per-row iterator overhead.",
      viz: { levels: tree({ "Aggregate": "is-new", "Hash Join": "on-path", "Seq Scan · orders": "on-path", "Index Scan · customers": "on-path" }),
        note: "Vectorized (batch per next(), SIMD) and compiled/JIT execution cut the iterator model's per-row overhead for big analytics." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function nodeHtml(n) {
      return '<div class="dd-node' + (n.cls ? " " + n.cls : "") + '">' +
        n.keys.map(function (k) { return '<span class="dd-node-key">' + k + "</span>"; }).join("") + "</div>";
    }
    function levelHtml(nodes) { return '<div class="dd-tree-level">' + nodes.map(nodeHtml).join("") + "</div>"; }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to run a query plan as an operator tree — pull rows with the iterator model, ' +
          "stream through pipelines, hit a pipeline breaker, and stop early on LIMIT.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Physical plan · operator tree (rows flow up)</div>' +
        '<div class="dd-tree">' + s.levels.map(levelHtml).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Legend</div><div class="dd-kv-list">' +
        '<span class="dd-chip dd-chip--info">active pull path</span>' +
        '<span class="dd-chip dd-chip--warn">pipeline breaker (materializes)</span>' +
        '<span class="dd-chip dd-chip--ok">producing / emitting</span></div></div>';
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["query-execution"] = {
    slug: "query-execution",
    overview: {
      what: "<b>Query execution</b> runs the optimizer's physical plan — a <b>tree of operators</b> (scans, joins, aggregates) — using the <b>iterator (Volcano) model</b>: each operator supports <code>open/next/close</code>, and rows are pulled from the root down through the tree.",
      why: "How the executor works explains a query's real behavior: why pipelined plans stream with tiny memory, why sorts and aggregates (pipeline breakers) buffer and spill, why <code>LIMIT</code> can stop work early, and why modern engines vectorize. It's the layer where the plan becomes actual CPU and I/O.",
      how: "Pull-based execution: a consumer calls <code>next()</code>, which cascades down to the scans; each operator transforms the rows it pulls and returns them upward. Pipelined operators stream row-by-row; pipeline breakers must consume all input first. Vectorized/compiled execution reduces per-row overhead."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The iterator (Volcano) model",
      lang: "sql",
      code:
        "-- Every operator implements the same interface:\n" +
        "interface Operator { open(); next() -> Row | EOF; close(); }\n" +
        "\n" +
        "-- Execution pulls from the root down:\n" +
        "root.open()\n" +
        "while (row = root.next()) != EOF:      # each next() cascades down the tree\n" +
        "    emit(row)                          # ... a scan at the bottom reads a page\n" +
        "root.close()\n" +
        "\n" +
        "-- Pipelined  (filter, project, hash-probe): next() = transform one row, return it.\n" +
        "-- Breaker    (sort, hash-build, aggregate): first next() drains the whole child,\n" +
        "--            materializes (spills past work_mem), THEN streams results.\n" +
        "-- Limit: stops calling child.next() once N rows are produced -> early termination.",
      highlights: [2, 6, 13]
    },
    reference: [
      ["operator", "A node in the plan (scan, join, sort, aggregate) that produces rows"],
      ["iterator / Volcano model", "open/next/close interface; rows pulled from the root down"],
      ["pull-based", "Consumers drive work by calling next(); producers respond"],
      ["pipelining", "Passing each row straight up without materializing"],
      ["pipeline breaker", "Operator that must consume all input before emitting (sort/agg/build)"],
      ["materialize", "Buffer intermediate rows (in memory, spilling to disk if large)"],
      ["work_mem", "Per-operation memory before a breaker spills to disk"],
      ["early termination", "Stopping the pipeline once enough rows are produced (LIMIT)"],
      ["vectorized execution", "Process a batch of rows per next() (SIMD-friendly)"],
      ["compiled execution", "JIT the plan to native code to cut interpreter overhead"]
    ],
    internals:
      "<p>Execution is a <b>tree of operators</b> driven by the <b>iterator (Volcano) model</b>: every operator implements <code>open()</code>, <code>next()</code>, <code>close()</code>. A top-level <code>next()</code> on the root cascades down — each operator calls <code>next()</code> on its children as needed — until a leaf <b>scan</b> reads a row from the buffer pool. Control flows down; rows flow up. This one uniform interface lets arbitrary operators compose into any plan.</p>" +
      "<p>Operators split into two kinds. <b>Pipelined</b> (non-blocking) operators — filter, project, the probe side of a hash join, nested-loop — emit one output row per input row with almost no state, so a chain of them streams data through with constant memory and produces first results early. <b>Pipeline breakers</b> — sort, the build side of a hash join, aggregation, DISTINCT, window functions — must consume their entire input before emitting anything, so they <b>materialize</b> (and spill to disk past <code>work_mem</code>). Breakers are where a plan's memory and latency concentrate.</p>" +
      "<p>Because it's <b>pull-based</b>, execution naturally supports <b>early termination</b>: a <code>Limit</code> stops calling <code>next()</code> once satisfied, so pipelined producers below it simply stop — though a breaker beneath the limit still had to finish first. The classic model's cost is a virtual call per row per operator; <b>vectorized</b> execution (a batch of rows per <code>next()</code>) and <b>compiled/JIT</b> execution reclaim that overhead for CPU-bound analytical queries.</p>",
    engineering:
      "<p>Reading a plan through the executor's lens tells you where time and memory go. Trace the <b>pipelines</b> and spot the <b>breakers</b>: a sort or hash build is where the query will buffer and possibly spill, so size <code>work_mem</code> for them and watch <code>EXPLAIN (ANALYZE)</code> for on-disk sorts/spills. Know that <code>LIMIT</code> only helps over pipelined operators — a top-N over a sort or aggregate still processes everything, so an index that provides pre-sorted order (turning the sort into a cheap pipeline) is often the real fix.</p>" +
      "<p>Prefer plans that stream: pushing filters down and projecting early keeps pipelines thin. For CPU-bound analytics over huge row counts, the per-row overhead of the iterator model matters — which is why OLAP engines use vectorized/compiled execution and column layouts. Match the tool: row-at-a-time is fine for OLTP point queries; batch/vectorized wins for scans over billions of rows.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Find the pipeline breakers to find the cost.</b> Sorts, hash builds, and aggregates materialize their whole input — that's where memory concentrates and spills happen. Everything else usually streams cheaply." },
      { kind: "warn", html: "<b><code>LIMIT</code> doesn't always make a query cheap.</b> Early termination only helps over pipelined operators. A <code>LIMIT</code> above a sort or aggregate still forces that breaker to consume all its input first — provide sorted input (an index) to avoid the sort." },
      { kind: "info", html: "<b>Row-at-a-time isn't mandatory.</b> The Volcano model's per-row overhead dominates CPU-bound analytics; vectorized (batch-per-next, SIMD) and compiled/JIT execution are the standard fixes in modern OLAP engines." }
    ],
    failureModes:
      "<p><b>Spilling pipeline breaker:</b> a sort or hash build exceeds <code>work_mem</code> and spills to disk, adding latency. <i>Fix:</i> raise work_mem for that query; reduce input via earlier filters; provide sorted input to skip the sort.</p>" +
      "<p><b>LIMIT that isn't cheap:</b> a top-N over a breaker (sort/aggregate) processes all input despite the LIMIT. <i>Fix:</i> an index that yields the required order, turning the sort into a pipelined scan with early stop.</p>" +
      "<p><b>Fat pipelines:</b> not projecting/filtering early carries unneeded columns/rows through the whole plan. <i>Fix:</i> push filters down; select only needed columns.</p>" +
      "<p><b>CPU-bound row-at-a-time analytics:</b> huge aggregations bottleneck on iterator overhead. <i>Fix:</i> vectorized/compiled engine, columnar storage.</p>",
    quickCheck: [
      {
        q: "In the iterator (Volcano) model, which direction do control and data flow?",
        options: [
          "Both flow up from the leaves to the root",
          "Control (next() calls) flows down from the root; rows flow up from the leaves",
          "Both flow down from the root",
          "Operators run independently with no flow"
        ],
        answer: 1,
        why: "It's pull-based: a consumer calls next() on the root, which cascades down to the scans (control flows down), and each operator returns transformed rows upward (data flows up).",
        diff: "easy"
      },
      {
        q: "Why can a query with LIMIT 10 sometimes still be slow?",
        options: [
          "LIMIT is ignored by the executor",
          "If a pipeline breaker (sort or aggregate) sits below the LIMIT, it must consume all its input before the LIMIT can trim the output",
          "LIMIT forces a full table scan",
          "LIMIT disables indexes"
        ],
        answer: 1,
        why: "Early termination only helps over pipelined operators. A sort or aggregate is a pipeline breaker that must process its entire input first, so the LIMIT only trims already-materialized output. Providing pre-sorted input (an index) avoids the breaker.",
        diff: "medium"
      },
      {
        q: "Which set of operators are pipeline breakers (must consume all input before emitting)?",
        options: [
          "Filter, projection, hash-probe",
          "Sort, hash-build, aggregate",
          "Sequential scan, index scan",
          "Limit, nested-loop probe"
        ],
        answer: 1,
        why: "Sort, the build side of a hash join, and aggregation must see all their input before producing output, so they materialize (and may spill). Filters, projections, and hash-probe are pipelined and stream row-by-row.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Explain how a database executes a query plan using the iterator model.",
        a: "The optimizer produces a physical plan as a tree of operators — scans at the leaves, joins/aggregates above. The executor uses the Volcano iterator model: every operator implements open(), next(), and close(), and execution is pull-based. A top-level next() on the root cascades down — each operator calls next() on its children as needed — until a leaf scan reads a row from the buffer pool; the row is then transformed on the way back up. Control flows down, rows flow up. Pipelined operators (filter, project, hash-probe) emit one row per input row and stream with constant memory; pipeline breakers (sort, hash-build, aggregate) must consume all input before emitting, so they materialize and can spill. Because it's pull-based, a Limit can stop pulling early. Modern engines reduce the model's per-row overhead with vectorized or compiled execution.",
        tip: "Say 'control flows down, rows flow up' and distinguish pipelined vs breaker — those two ideas carry the whole answer."
      },
      {
        q: "What's the difference between a pipelined operator and a pipeline breaker, and why does it matter?",
        a: "A pipelined (non-blocking) operator produces an output row for each input row without buffering — filters, projections, the probe side of a hash join — so a chain of them streams data through with tiny, constant memory and can yield first results before the input is fully read. A pipeline breaker must consume its entire input before it can emit anything — a sort, the build side of a hash join, an aggregate, DISTINCT, window functions — so it materializes its input (and spills to disk if it exceeds work_mem). It matters because breakers are where a plan's memory and latency concentrate: they're what spills, what delays the first row, and what makes a LIMIT not cheap. When I read a plan I look for the breakers first to understand its cost profile.",
        tip: "Tie it to practical consequences — memory, spilling, first-row latency, LIMIT — not just the definition."
      },
      {
        q: "How do modern engines improve on the classic Volcano model, and when does it matter?",
        a: "The classic model calls a virtual next() per row per operator, so for CPU-bound queries over huge row counts the interpretation and function-call overhead dominates. Two techniques fix it. Vectorized execution changes next() to return a batch of rows (say ~1024), often column-oriented, which amortizes the call overhead and enables tight, cache-friendly, SIMD-able loops. Compiled/JIT execution lowers the whole plan to native code, removing the interpreter entirely. These matter most for analytical/OLAP workloads — large scans and aggregations over billions of rows — which is why engines like DuckDB, ClickHouse, and Spark, and Postgres's JIT, use them. For OLTP point queries that touch few rows, the classic row-at-a-time model is perfectly fine, so it's a workload-driven choice.",
        tip: "Name vectorized AND compiled as distinct techniques, and scope it to OLAP vs OLTP — that precision reads as current knowledge."
      }
    ],
    businessLens: {
      task: "Running ShopKart's revenue-by-customer report plan",
      meaning: "Whether the report streams cheaply or buffers-and-spills depends on the plan's breakers.",
      system: "OLTP/reporting on Postgres (executor)",
      point: "ShopKart's report executes as an operator tree: scans stream filtered orders and matching customers up into a hash join, and an aggregate on top groups by customer. The scans and join probe pipeline cheaply, but the aggregate (and the hash build) are pipeline breakers — they buffer, and if the joined set exceeds work_mem they spill to disk and the report slows. Knowing that, ShopKart sizes work_mem for the report, and for 'latest 10 orders' relies on an index that yields pre-sorted rows so the LIMIT can stop early instead of sorting everything. Reading the plan as pipelines and breakers is how the team predicts a query's memory and latency before it ever runs."
    }
  };
})();
