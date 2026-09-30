/* ============================================================
   deepdives/hash-join.js — "Join Algorithms" deep dive.
   Registers DBLab.deepDives['hash-join'] (concept m21). Covers
   nested-loop, hash, and sort-merge joins and when each is chosen.
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var COLS = ["Complexity", "Best when", "Requires"];
  var ALGOS = [
    { key: "nlj", name: "Nested Loop", cells: ["O(M×N) · M·logN with index", "one side small or indexed", "any join condition"] },
    { key: "hash", name: "Hash Join", cells: ["O(M + N)", "large, unsorted, equi-join", "equi-join + memory"] },
    { key: "merge", name: "Sort-Merge", cells: ["O(M+N) if pre-sorted", "inputs already sorted / range", "sortable keys"] }
  ];

  var STEPS = [
    {
      label: "1 · The join problem",
      what: "A join combines rows from two tables that match on a key — e.g. <code>orders ⋈ customers ON o.cust_id = c.id</code>. Done naively (compare every row with every row) that's <b>M × N</b> work. The three join algorithms are smarter ways to do it.",
      why: "Joins are where big queries spend their time, and the choice of algorithm can swing runtime by orders of magnitude. Knowing the three and when each wins is core to reading a plan and fixing a slow query.",
      how: "There are exactly three workhorse strategies: <b>nested loop</b>, <b>hash</b>, and <b>sort-merge</b>. The optimizer picks based on table sizes, indexes, sort order, and available memory.",
      when: "Any query with a JOIN (or an implicit join via subquery/IN).",
      mistake: "Thinking 'a join is a join'. The algorithm chosen — not the SQL — decides whether it's fast, and the optimizer picks it from cost estimates.",
      interview: "“What are the main join algorithms?” Nested loop, hash join, and sort-merge join — chosen by the optimizer from sizes, indexes, sortedness, and memory.",
      example: "ShopKart joins a filtered slice of <code>orders</code> to <code>customers</code> — the algorithm chosen decides if the report is instant or grinds.",
      viz: { algo: null, mech: { type: "rel" }, note: "Combine rows matching on a key. Naive = M×N; the three algorithms below beat that in different situations." }
    },
    {
      label: "2 · Nested Loop Join",
      what: "<b>For each row of the outer table, find matches in the inner table.</b> Naively O(M×N), but if the inner side has an <b>index</b> on the join key, each lookup is O(log N) — making it O(M·logN), excellent when the outer side is small.",
      why: "It's the simplest and the most flexible (it handles <i>any</i> join condition, not just equality). With a small outer input and an indexed inner, it's often the cheapest — exactly what the optimizer picked for our selective report earlier.",
      how: "Outer loop over M rows; for each, probe the inner — a full inner scan (bad) or an index lookup (good). Cost is driven by the outer row count.",
      when: "One side is small (or well-filtered) and the inner join key is indexed; also the only option for non-equi joins (<code>&lt;</code>, <code>BETWEEN</code>).",
      mistake: "Letting a nested loop run when both sides are large — that's the M×N catastrophe (step 6). It's great only when the outer is small.",
      interview: "“When is a nested loop join the right choice?” When the outer input is small and the inner has an index on the join key (M·logN), or for non-equi joins that hash/merge can't do.",
      example: "With the date filter making <code>orders</code> small, ShopKart nested-loops each order to <code>customers</code> via the PK index — one lookup per order.",
      viz: { algo: "nlj", mech: { type: "nlj" }, note: "For each outer row → look up the inner (index makes it O(M·logN)). Best when the outer side is small." }
    },
    {
      label: "3 · Hash Join",
      what: "<b>Build</b> a hash table on the smaller relation's join key, then <b>probe</b> it with each row of the larger relation. Matching is O(1) per probe, so the whole join is <b>O(M + N)</b> — no index needed.",
      why: "This is the workhorse for joining two large, unsorted tables on an equality key. It turns a quadratic problem into linear, which is why it dominates analytical/reporting joins.",
      how: "Build phase: scan the smaller table, hash each row by join key into buckets. Probe phase: scan the larger table, hash each row and check the matching bucket. Needs memory to hold the hash table (spills to disk if too big).",
      when: "Large, unsorted inputs joined on an <b>equality</b> condition, with enough memory for the build side.",
      mistake: "Expecting a hash join for a non-equi join or when memory is tiny — it only does equality, and if the build side doesn't fit memory it spills (grace hash) and slows down.",
      interview: "“How does a hash join work and when is it chosen?” Build a hash table on the smaller input, probe with the larger; O(M+N) for equi-joins on large unsorted tables with enough memory.",
      example: "For a report joining all of <code>orders</code> to <code>customers</code> (no selective filter), ShopKart builds a hash table on customers and probes it with orders.",
      viz: { algo: "hash", mech: { type: "hash" }, note: "Build a hash table on the smaller side, probe with the larger → O(M+N). The go-to for large equi-joins." }
    },
    {
      label: "4 · Sort-Merge Join",
      what: "<b>Sort both</b> relations on the join key, then <b>merge</b> them in a single linear pass with two advancing pointers. O(M log M + N log N) to sort, but only O(M + N) if the inputs are <b>already sorted</b>.",
      why: "It shines when the inputs come pre-sorted — e.g. from an index scan or a prior sort — because then you skip the sort and just merge. It also handles range/merge scenarios and produces sorted output for free.",
      how: "Sort left and right by join key (or read them pre-sorted from indexes), then walk both with pointers, emitting matches and advancing the smaller side. One pass, sequential access.",
      when: "Inputs are already sorted on the join key (index order), the result needs to be sorted anyway, or for merge/band joins.",
      mistake: "Choosing sort-merge when neither input is sorted and memory is fine — you pay for two sorts that a hash join avoids.",
      interview: "“When does sort-merge beat hash join?” When both inputs are already sorted on the join key (skip the sort → O(M+N)), or when sorted output is required downstream.",
      example: "If ShopKart's join keys arrive sorted from index scans on both tables, a sort-merge join merges them in one pass with no hashing.",
      viz: { algo: "merge", mech: { type: "merge" }, note: "Sort both sides, then merge in one linear pass. Best when inputs are already sorted (skip the sort)." }
    },
    {
      label: "5 · How the optimizer chooses",
      what: "The optimizer costs all three from estimated sizes, indexes, sort order, and memory: <b>nested loop</b> for a small/indexed side, <b>hash</b> for large unsorted equi-joins, <b>sort-merge</b> for pre-sorted inputs or when sorted output is needed.",
      why: "There's no universally best join — the right one depends entirely on the shape of the data at that point in the plan. This is cost-based optimization applied to joins.",
      how: "For each candidate the optimizer estimates cardinalities and applies the cost model, factoring in whether an index exists, whether inputs are sorted, and whether the hash build fits <code>work_mem</code>. Cheapest wins.",
      when: "During plan search, for every join in the query.",
      mistake: "Assuming one algorithm is 'the fast one'. The best choice flips with selectivity, indexes, and memory — which is why estimates matter so much.",
      interview: "“How does the optimizer pick a join algorithm?” It costs each using estimated row counts, index availability, input sortedness, and memory, and picks the minimum — so the choice changes with the data.",
      example: "As ShopKart's date filter widens, the plan shifts from nested-loop (few orders, indexed customers) to hash join (many orders) — same query, different algorithm.",
      viz: { algo: null, mech: { type: "decide" }, note: "No single winner: small/indexed → nested loop; large unsorted equi → hash; pre-sorted → sort-merge. The optimizer costs all three." }
    },
    {
      label: "6 · The catastrophe: nested loop on two big tables",
      what: "The classic production incident: a <b>bad cardinality estimate</b> makes the optimizer think the outer side is tiny, so it picks a <b>nested loop</b> — but both tables are actually huge. Now it's doing <b>M × N</b> lookups, and the query hangs.",
      why: "This is the #1 join failure and the one to recognize instantly. 'The query was fast, now it hangs' after data growth is almost always a nested loop chosen on a stale estimate, running over millions × millions.",
      how: "The optimizer estimated, say, 50 outer rows (→ nested loop with index looked cheap), but there are 5 million. 5M × index-lookups (or worse, × full inner scans) is catastrophic. <code>EXPLAIN ANALYZE</code> shows estimated 50, actual 5M.",
      when: "After data growth or with correlated/stale statistics that collapse the outer estimate.",
      mistake: "Fixing it with a hint before fixing the stats. Refresh statistics so the optimizer estimates the outer size correctly and switches to a hash join.",
      interview: "“A join query suddenly hangs after the table grew — what happened?” The optimizer under-estimated the outer side and chose a nested loop that's now M×N. Re-analyze; it should switch to hash.",
      example: "After ShopKart's orders table grows, a stale estimate keeps a nested loop that now probes customers millions of times — until ANALYZE flips it to a hash join.",
      viz: { algo: "nlj", mech: { type: "boom" }, note: "Stale estimate → nested loop over two huge tables → M×N lookups → hang. The classic join disaster; fix the stats." }
    },
    {
      label: "7 · Engineering the join",
      what: "Levers that decide join performance: <b>indexes</b> on join keys (enable cheap nested loops), <b>memory</b> (<code>work_mem</code> for hash builds; too little → disk spill), <b>equi vs non-equi</b> (only nested loop handles non-equality), and <b>pre-sorted inputs</b> (make sort-merge free).",
      why: "You can't pick the algorithm directly (usually), but you shape the inputs so the optimizer picks well: index the join keys, give hash joins enough memory, and keep statistics fresh so the size estimates are right.",
      how: "Add indexes on foreign keys; size <code>work_mem</code> for your hash joins to avoid spills; ensure ANALYZE keeps estimates accurate; use <code>EXPLAIN (ANALYZE)</code> to see which join ran and whether it spilled or blew up.",
      when: "Schema/index design, memory configuration, and query tuning.",
      mistake: "Only a non-equi join available but expecting hash/merge speed — those need equality (hash) or sortable keys (merge); a non-equi join is stuck with nested loop.",
      interview: "“What can you change to make a join faster?” Index the join keys (nested loop), give hash joins enough work_mem, keep stats fresh for correct sizing, and prefer equi-joins where possible.",
      example: "ShopKart indexes <code>orders.cust_id</code>, bumps <code>work_mem</code> for its reporting hash joins, and keeps stats fresh so the planner never falls into the nested-loop trap.",
      viz: { algo: null, mech: { type: "decide" }, note: "Shape the inputs: index join keys, give hash joins memory, keep stats fresh, prefer equi-joins. Verify with EXPLAIN ANALYZE." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function chips(vals, cls) { return vals.map(function (v) { return '<span class="dd-kv-item ' + (cls || "") + '">' + v + "</span>"; }).join(""); }
    function mech(m) {
      if (!m) return "";
      if (m.type === "rel") {
        return '<div class="dd-row">' +
          '<div class="dd-actor dd-actor--a"><div class="dd-actor-top"><span class="dd-actor-id">orders</span><span class="dd-actor-tag">outer · M</span></div><div class="dd-actor-body">rows to match on cust_id</div></div>' +
          '<div class="dd-actor dd-actor--b"><div class="dd-actor-top"><span class="dd-actor-id">customers</span><span class="dd-actor-tag">inner · N</span></div><div class="dd-actor-body">matched by id</div></div>' +
          "</div>";
      }
      if (m.type === "nlj") {
        return '<div class="dd-row">' +
          '<div class="dd-actor dd-actor--a"><div class="dd-actor-top"><span class="dd-actor-id">for each order</span><span class="dd-actor-tag">outer loop · M</span></div><div class="dd-actor-body">take cust_id →</div></div>' +
          '<div class="dd-arrow">→</div>' +
          '<div class="dd-actor dd-actor--b"><div class="dd-actor-top"><span class="dd-actor-id">index lookup</span><span class="dd-actor-tag">customers.id</span></div><div class="dd-actor-body">O(logN) per order</div></div>' +
          "</div>";
      }
      if (m.type === "hash") {
        return '<div class="dd-sub-label">Build: hash table on customers (smaller)</div>' +
          '<div class="dd-kv-list">' + chips(["h0 → c12", "h1 → c7, c19", "h2 → c3", "h3 → c41"]) + "</div>" +
          '<div class="dd-sub-label" style="margin-top:10px">Probe: each order → hash(cust_id) → bucket → O(1)</div>' +
          '<div class="dd-kv-list">' + chips(["o→h1 ✓", "o→h2 ✓", "o→h0 ✓"]) + "</div>";
      }
      if (m.type === "merge") {
        return '<div class="dd-sub-label">customers (sorted by id)</div><div class="dd-kv-list">' + chips(["1", "3", "5", "7", "9"]) + "</div>" +
          '<div class="dd-sub-label" style="margin-top:10px">orders.cust_id (sorted)</div><div class="dd-kv-list">' + chips(["1", "1", "5", "7", "7"]) + "</div>" +
          '<div class="dd-note" style="margin-top:8px">Two pointers advance in one linear pass, emitting matches.</div>';
      }
      if (m.type === "boom") {
        return '<div class="dd-row">' +
          '<div class="dd-actor dd-actor--a is-aborted"><div class="dd-actor-top"><span class="dd-actor-id">orders</span><span class="dd-actor-tag">est 50 · actual 5,000,000</span></div><div class="dd-actor-body">outer loop explodes</div></div>' +
          '<div class="dd-arrow">×</div>' +
          '<div class="dd-actor dd-actor--b is-aborted"><div class="dd-actor-top"><span class="dd-actor-id">customers</span><span class="dd-actor-tag">probed 5M×</span></div><div class="dd-actor-body">M×N — hang</div></div>' +
          "</div>";
      }
      return ""; // "decide" → matrix carries the message
    }
    function matrix(algo) {
      var head = "<tr><th>Algorithm</th>" + COLS.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>";
      var body = ALGOS.map(function (a) {
        var tr = '<tr class="' + (a.key === algo ? "is-current" : "") + '"><th>' + a.name + "</th>";
        tr += a.cells.map(function (c) { return "<td>" + c + "</td>"; }).join("");
        return tr + "</tr>";
      }).join("");
      return '<div class="dd-matrix-wrap"><table class="dd-matrix"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to compare the three join algorithms — nested loop, hash, and sort-merge — ' +
          "see how each works, and when the optimizer chooses it.</div>";
        return;
      }
      var mh = mech(s.mech);
      var html = "";
      if (mh) html += '<div class="dd-section"><div class="dd-section-label">orders ⋈ customers ON cust_id = id</div>' + mh + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">Join algorithms</div>' + matrix(s.algo) + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["hash-join"] = {
    slug: "hash-join",
    overview: {
      what: "Databases join two tables with one of three algorithms: <b>nested loop</b> (for each outer row, look up the inner), <b>hash join</b> (build a hash table on the smaller side, probe with the larger), and <b>sort-merge</b> (sort both, merge in one pass). The optimizer picks based on sizes, indexes, sort order, and memory.",
      why: "Joins dominate the cost of big queries, and the algorithm chosen can change runtime by orders of magnitude. Recognizing the three — and the classic nested-loop-over-huge-tables catastrophe — is essential to reading plans and fixing slow queries.",
      how: "Nested loop is O(M·logN) with an indexed inner and great when the outer is small (and the only option for non-equi joins). Hash join is O(M+N) for large unsorted equi-joins with enough memory. Sort-merge is O(M+N) when inputs are already sorted. The optimizer costs all three from estimates."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Seeing which join the optimizer chose",
      lang: "sql",
      code:
        "EXPLAIN (ANALYZE)\n" +
        "SELECT c.name, o.total\n" +
        "FROM orders o JOIN customers c ON o.cust_id = c.id\n" +
        "WHERE o.created_at >= '2026-01-01';\n" +
        "\n" +
        "-- Small, selective outer + indexed inner:\n" +
        "--   Nested Loop -> Index Scan on customers using customers_pkey\n" +
        "-- Large unsorted inputs, equi-join, enough work_mem:\n" +
        "--   Hash Join -> Hash -> Seq Scan on customers   (build side)\n" +
        "-- Both inputs already sorted on the key:\n" +
        "--   Merge Join -> Index Scan ... (both sides)\n" +
        "-- Watch for: 'Nested Loop' with actual rows >> estimated rows  = the M×N trap.",
      highlights: [7, 9, 11]
    },
    reference: [
      ["nested loop join", "For each outer row, find matches in the inner (O(M·logN) if indexed)"],
      ["hash join", "Build a hash table on the smaller side, probe with the larger — O(M+N)"],
      ["sort-merge join", "Sort both inputs, merge in one pass — O(M+N) if pre-sorted"],
      ["build / probe", "Hash join's two phases: construct table, then look up"],
      ["equi-join", "Join on equality (=); required by hash join"],
      ["work_mem", "Memory budget for a hash build/sort before spilling to disk"],
      ["spill", "Hash/sort overflowing memory onto disk (grace hash, external sort)"],
      ["outer / inner", "The driving side vs the looked-up side of a join"],
      ["M×N blowup", "A nested loop over two large inputs — the classic disaster"]
    ],
    internals:
      "<p><b>Nested loop</b> is the simplest: iterate the outer relation and, for each row, find matches in the inner — a full inner scan (O(M×N), bad) or, ideally, an index lookup on the join key (O(M·logN)). It handles any join predicate, including non-equality, which hash and merge cannot.</p>" +
      "<p><b>Hash join</b> has two phases: <i>build</i> a hash table on the smaller relation keyed by the join column, then <i>probe</i> it with each row of the larger relation for O(1) matching — O(M+N) overall. It requires an equality condition and enough memory to hold the build side; if it doesn't fit <code>work_mem</code>, it spills to disk (grace/hybrid hash) and slows down.</p>" +
      "<p><b>Sort-merge</b> sorts both inputs on the join key (O(M log M + N log N)) then merges them with two advancing pointers in a single linear pass. If the inputs are already sorted — say from index scans — the sort is skipped and it's O(M+N), and it naturally produces sorted output. The optimizer costs all three using estimated cardinalities, index availability, input sortedness, and memory, so the winner shifts with the data — and a bad cardinality estimate on the outer side is what triggers the infamous nested-loop-over-huge-tables blowup.</p>",
    engineering:
      "<p>You rarely choose the join algorithm directly; you shape the inputs so the optimizer chooses well. <b>Index the join keys</b> (especially foreign keys) so nested loops are cheap for selective drivers. <b>Give hash joins memory</b> — size <code>work_mem</code> so common hash builds don't spill to disk. <b>Keep statistics fresh</b> so the outer-side estimate is right and the optimizer doesn't fall into a nested loop over millions of rows.</p>" +
      "<p>Know the constraints: only nested loop handles <b>non-equi</b> joins; hash needs equality; sort-merge needs sortable keys and pays off when inputs are pre-sorted or sorted output is needed downstream. Always confirm with <code>EXPLAIN (ANALYZE)</code> — check which join ran, whether a hash join spilled, and whether a nested loop's actual rows dwarf its estimate (the signature of the M×N trap).</p>",
    gotchas: [
      { kind: "warn", html: "<b>The nested-loop-over-two-big-tables blowup is the #1 join disaster.</b> A stale/low estimate on the outer side makes the optimizer pick a nested loop that becomes M×N. If a query hangs after data growth, check for it and refresh statistics." },
      { kind: "tip", html: "<b>Match the algorithm to the shape:</b> small/indexed side → nested loop; large unsorted equi-join → hash; already-sorted inputs → sort-merge. You influence it by adding indexes, giving memory, and keeping estimates accurate." },
      { kind: "info", html: "<b>Only nested loop does non-equi joins.</b> Hash join requires equality; sort-merge requires sortable keys. A <code>&lt;</code>/<code>BETWEEN</code> join condition is stuck with nested loop — so make its inputs small/indexed." }
    ],
    failureModes:
      "<p><b>Nested loop M×N blowup:</b> under-estimated outer side → nested loop over huge inputs → query hangs. <i>Fix:</i> ANALYZE so the estimate is right; the optimizer switches to hash.</p>" +
      "<p><b>Hash join disk spill:</b> the build side exceeds <code>work_mem</code> and spills, slowing the join. <i>Fix:</i> raise work_mem for that workload; reduce the build side; filter earlier.</p>" +
      "<p><b>Needless sorts:</b> sort-merge chosen (or forced) when neither input is sorted and a hash join would avoid the sorts. <i>Fix:</i> let the cost model choose; provide sorted inputs via indexes only when it helps.</p>" +
      "<p><b>Non-equi join stuck slow:</b> a range/inequality join can only nest-loop. <i>Fix:</i> make one side small/indexed, or redesign the predicate toward equality where possible.</p>",
    quickCheck: [
      {
        q: "A join query was fast for months, then suddenly hangs after the tables grew — with no code change. What most likely happened?",
        options: [
          "The join keys changed type",
          "A stale/low cardinality estimate kept a nested loop that is now running M×N over two large tables",
          "The database switched SQL dialects",
          "Hash joins were disabled"
        ],
        answer: 1,
        why: "The classic join disaster: the optimizer under-estimated the outer side and chose a nested loop, which is fine when the outer is small but becomes M×N when it's actually huge. EXPLAIN ANALYZE shows estimated ≪ actual; ANALYZE usually flips it to a hash join.",
        diff: "medium"
      },
      {
        q: "You're joining two large, unsorted tables on an equality key with plenty of memory. Which algorithm does the optimizer typically choose and why?",
        options: [
          "Nested loop — it's always simplest",
          "Hash join — build a table on the smaller side and probe with the larger, giving O(M+N)",
          "Sort-merge — sorting is always fastest",
          "It can't join unsorted tables"
        ],
        answer: 1,
        why: "For large, unsorted, equi-join inputs with enough memory, a hash join is O(M+N): build a hash table on the smaller relation, then probe it with the larger. No index or pre-sorting required.",
        diff: "easy"
      },
      {
        q: "When does a sort-merge join beat a hash join?",
        options: [
          "When the join is a non-equality condition",
          "When both inputs are already sorted on the join key (skip the sort → O(M+N)) or sorted output is needed downstream",
          "When there is no memory at all",
          "When one table is empty"
        ],
        answer: 1,
        why: "Sort-merge's cost is dominated by the sorts; if the inputs arrive pre-sorted (e.g. from index scans) it merges in one linear pass with no sorting, and it yields sorted output for free — which a hash join doesn't.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Compare the three join algorithms and when each is chosen.",
        a: "Nested loop iterates the outer relation and looks up matches in the inner; it's O(M×N) naively but O(M·logN) when the inner has an index on the join key, so it's ideal when the outer side is small or well-filtered — and it's the only option for non-equi joins. Hash join builds a hash table on the smaller relation and probes it with the larger, giving O(M+N) for equality joins on large, unsorted inputs, provided the build side fits in memory (else it spills). Sort-merge sorts both inputs on the join key and merges them in one linear pass — O(M+N) if they're already sorted (e.g. from index scans), and it produces sorted output. The optimizer costs all three from estimated sizes, index availability, sortedness, and memory, so the winner changes with the data; there's no universally fastest join.",
        tip: "Give the complexity AND the 'best when' for each, and end on 'the choice is cost-based, so it shifts with the data.'"
      },
      {
        q: "Describe the nested-loop-over-two-large-tables problem and how you'd fix it.",
        a: "It's the most common join incident. The optimizer estimates the outer side is small — so a nested loop with an indexed inner looks cheap — but the real outer cardinality is huge, so it ends up doing millions of inner lookups (or worse, inner scans): effectively M×N, and the query hangs. It usually appears after data growth or with stale/correlated statistics that collapse the outer estimate. You spot it in EXPLAIN ANALYZE as a Nested Loop whose actual rows vastly exceed its estimate. The fix is to correct the optimizer's inputs: run ANALYZE (and add extended statistics if columns are correlated) so it estimates the outer size correctly and switches to a hash join. Only if that fails would I consider forcing the join method — and reluctantly, since it pins a decision that can go wrong later.",
        tip: "Name the EXPLAIN signature (Nested Loop, actual ≫ estimated) — recognizing it instantly is what interviewers are probing."
      },
      {
        q: "You can't usually pick the join algorithm directly — so how do you influence it?",
        a: "By shaping the inputs the optimizer costs. Index the join keys, especially foreign keys, so nested loops on selective drivers are cheap and index scans can feed a sort-merge with pre-sorted data. Give hash joins enough work_mem so their build side doesn't spill to disk. Keep statistics fresh so the size estimates — which decide the whole thing — are accurate; this is what prevents the nested-loop trap. Prefer equality join conditions where the schema allows, since only nested loop handles non-equi joins. And verify with EXPLAIN ANALYZE that the join you expected actually ran and didn't spill or blow up. So it's indirect: correct statistics, the right indexes, adequate memory, and equi-joins let the cost-based optimizer land on the right algorithm on its own.",
        tip: "Lead with 'shape the inputs, don't fight the optimizer' — indexes, memory, fresh stats — that framing signals maturity."
      }
    ],
    businessLens: {
      task: "ShopKart's revenue report joining orders to customers",
      meaning: "The report is instant or unusable depending purely on which join algorithm runs.",
      system: "OLTP/reporting on Postgres",
      point: "ShopKart's revenue-by-customer report joins a filtered slice of orders to customers. When the date filter is selective, a nested loop using the customers primary-key index is cheapest; when it isn't, a hash join over both tables wins. The danger is the nested-loop trap: after the orders table grew, a stale estimate kept the nested loop and the report started probing customers millions of times until it timed out — fixed by ANALYZE flipping it to a hash join. So ShopKart indexes its join keys, gives reporting queries enough work_mem, and watches estimated-vs-actual rows on joins, because on a big schema the join algorithm is the whole ballgame."
    }
  };
})();
