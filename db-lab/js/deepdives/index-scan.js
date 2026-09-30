/* ============================================================
   deepdives/index-scan.js — "Seq Scan vs Index Scan" deep dive.
   Registers DBLab.deepDives['index-scan'] (concept m19).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var NPAGES = 24;
  function pages(stateFn) { var a = []; for (var i = 0; i < NPAGES; i++) a.push({ id: i, state: stateFn(i) }); return a; }
  function Plan(name, sub, cost, mark) { return { name: name, sub: sub, cost: cost, mark: mark || null }; }
  var SCATTER = { 3: 1, 9: 1, 16: 1, 21: 1 };
  var CLUSTER = { 10: 1, 11: 1, 12: 1, 13: 1 };

  var STEPS = [
    {
      label: "1 · Two ways to find rows",
      what: "To satisfy <code>WHERE …</code>, the executor has two basic <b>access paths</b>: <b>sequentially scan</b> every page of the table, or use an <b>index</b> to jump to just the matching rows. The optimizer picks based on how many rows match.",
      why: "This is the most common plan decision there is, and the most misunderstood. 'Just add an index' only helps sometimes — because which path is cheaper depends entirely on selectivity.",
      how: "A seq scan reads all heap pages in order; an index scan descends a B+ Tree to the matching keys and then fetches those rows from the heap. Same result, very different I/O profile.",
      when: "For every table access in every query plan.",
      mistake: "Assuming an index is always the fast path. For a predicate that matches most rows, a sequential scan is faster — and the optimizer knows it.",
      interview: "“What are the two main access paths and what decides between them?” Sequential scan vs index scan; the optimizer chooses based on estimated selectivity (how many rows match).",
      example: "ShopKart's <code>products</code> table (24 pages here): find 'electronics' via the index, or find 'in-stock' (most rows) via a full scan.",
      viz: { pages: pages(function () { return "idle"; }), path: null, plans: [], note: "Seq scan reads every page; index scan fetches only matches. Which is cheaper depends on how many rows match." }
    },
    {
      label: "2 · Sequential scan: read everything",
      what: "A <b>sequential scan</b> reads <i>every</i> page of the table in physical order, checking the predicate on each row. Its cost is proportional to the table size and is <b>flat</b> — it doesn't matter whether 1 row or 1 million match.",
      why: "Sequential I/O is fast per byte (the disk/prefetcher love it), so scanning a whole table is cheaper than it sounds — and it's the <i>best</i> choice when a query returns a large fraction of rows.",
      how: "Read pages 0…N-1 in order, filter rows in each. One big sequential sweep; no index, no random access.",
      when: "When the predicate is non-selective (matches many rows), or there's no useful index, or the table is tiny.",
      mistake: "Treating 'Seq Scan' in EXPLAIN as always bad. On a big result or a small table it's the correct, fastest plan.",
      interview: "“When is a full table scan the right choice?” When the query returns a large fraction of the table (or the table is small) — one sequential sweep beats many random index fetches.",
      example: "Counting all ShopKart products, or filtering to a value most rows share, is served fastest by a sequential scan.",
      viz: { pages: pages(function () { return "seq"; }), path: "seq", plans: [Plan("Seq Scan", "read all 24 pages, sequential I/O", 240, null)],
        note: "Reads every page in order. Cost is flat (∝ table size) regardless of how many rows match." }
    },
    {
      label: "3 · Index scan: jump to matches",
      what: "An <b>index scan</b> descends the B+ Tree to the matching keys, then <b>fetches each matching row</b> from the heap. For a selective predicate (say 4 matching pages), it reads a handful of pages instead of all 24.",
      why: "When few rows match, touching only those rows is a huge win — this is the entire reason indexes exist. Cost is proportional to the number of matches, not the table size.",
      how: "Descend the index (a few page reads) to find matching row pointers, then fetch each row's heap page. Here 4 scattered pages hold the matches.",
      when: "When the predicate is selective (matches a small fraction of rows) and a suitable index exists.",
      mistake: "Forgetting the heap fetch. An index scan usually still reads the actual rows from the heap — the index gives pointers, not (by default) the data.",
      interview: "“What does an index scan actually do?” Descends the index to matching keys, then fetches those rows from the heap — cost scales with matches, not table size.",
      example: "Finding ShopKart's 'electronics' (a small slice) via the index touches only the few pages holding those rows.",
      viz: { pages: pages(function (i) { return SCATTER[i] ? "match" : "idle"; }), path: "index",
        plans: [Plan("Index Scan", "descend + 4 heap fetches", 40, "win"), Plan("Seq Scan", "read all 24 pages", 240, "lose")],
        note: "Selective predicate → touch only the ~4 pages with matches. Cost ∝ matches (40) ≪ full scan (240)." }
    },
    {
      label: "4 · The catch: random I/O",
      what: "Those matching rows are scattered across the table, so each heap fetch is a <b>random</b> page read — far slower per page than sequential I/O. The index's advantage is the small <i>count</i> of reads, but each one is expensive.",
      why: "Random reads are the hidden cost of index scans. A few random fetches still beat a full scan, but the per-page penalty is why the index stops winning once the match count climbs.",
      how: "Each matching row pointer resolves to some heap page, in no particular order — the disk head/prefetcher can't help. The optimizer weights these as random-page costs.",
      when: "Whenever index matches are physically scattered (the common case for unclustered data).",
      mistake: "Ignoring random vs sequential I/O. 100 random fetches can cost more than reading 1,000 pages sequentially — counts alone don't tell you which path wins.",
      interview: "“Why isn't an index scan always cheaper per row than a seq scan?” Index fetches are random I/O; sequential scans read contiguously. Random reads have a much higher per-page cost.",
      example: "ShopKart's electronics rows are spread across the table, so the index scan does 4 scattered random reads — cheap here, but the penalty scales.",
      viz: { pages: pages(function (i) { return SCATTER[i] ? "fetch" : "idle"; }), path: "index",
        plans: [Plan("Index Scan", "4 RANDOM heap fetches", 40, "win"), Plan("Seq Scan", "sequential sweep", 240, "lose")],
        note: "Each match is a random heap read (scattered). Cheap at 4 fetches — but each random read is costly, and that scales." }
    },
    {
      label: "5 · The crossover: seq scan wins back",
      what: "Change the predicate to match <b>most</b> rows. Now the index would do ~20 random fetches — more expensive than one sequential sweep of all 24 pages. The optimizer <b>flips to a sequential scan</b>.",
      why: "This crossover (often around ~5–20% selectivity) is why adding an index doesn't guarantee it's used. Past the threshold, many random reads lose to one contiguous scan.",
      how: "Index cost grows with match count (random reads); seq cost is flat. When estimated matches push index cost above seq cost, the sequential scan is chosen.",
      when: "For non-selective predicates on unclustered data.",
      mistake: "Adding an index for a low-selectivity filter and expecting a speedup. The optimizer will (correctly) ignore it for a seq scan.",
      interview: "“Why would the planner ignore an index that exactly matches the WHERE clause?” The predicate isn't selective enough — the random fetches would cost more than a sequential scan.",
      example: "A ShopKart filter matching most products (e.g. price &gt; 0) is served by a seq scan; the index would be slower.",
      viz: { pages: pages(function () { return "seq"; }), path: "seq",
        plans: [Plan("Index Scan", "~20 random fetches", 700, "lose"), Plan("Seq Scan", "one sequential sweep", 240, "win")],
        note: "Many matches → ~20 random fetches cost more than one sequential sweep. Past the crossover, seq scan wins." }
    },
    {
      label: "6 · Index-only scan: skip the heap",
      what: "If the index <b>covers</b> every column the query needs (a <b>covering index</b>), the answer is read straight from the index — <b>no heap fetch at all</b>. That removes the random-I/O cost and lets the index win even for more rows.",
      why: "Index-only scans are the strongest index play: they turn 'index + random heap reads' into 'index reads only'. Designing a covering index is a top query-tuning technique.",
      how: "The executor finds all needed columns in the index leaves and returns them directly. (In Postgres, the visibility map must confirm rows are all-visible so it can skip the heap.)",
      when: "When a query's selected + filtered columns all fit in one index (SELECT a,b WHERE a=…, index on (a,b)).",
      mistake: "Selecting <code>*</code> and wondering why the covering index isn't used. Index-only scans need the query to reference only covered columns.",
      interview: "“What is a covering index / index-only scan?” An index that contains all columns a query needs, so the query is answered from the index alone — no heap fetch.",
      example: "ShopKart's <code>SELECT sku, price WHERE category=?</code> with an index on <code>(category, sku, price)</code> runs index-only — no heap reads.",
      viz: { pages: pages(function () { return "idle"; }), path: "index",
        plans: [Plan("Index-Only Scan", "answered from index, no heap", 25, "win"), Plan("Seq Scan", "read all pages", 240, "lose")],
        note: "Covering index → all needed columns in the index → zero heap fetches. Index wins even for larger result sets." }
    },
    {
      label: "7 · Clustering, correlation & 'just add an index'",
      what: "If the table is physically <b>ordered</b> by the indexed column (clustered/correlated), the matching rows sit on <b>adjacent</b> pages, so index fetches become <i>sequential</i> — cheap even for many matches. Physical layout, not just the index, decides the cost.",
      why: "This is why the same index is great on one table and useless on another: correlation between index order and physical order turns random fetches into sequential ones. It's the missing variable in 'just add an index'.",
      how: "High correlation (e.g. an append-only time column) means an index range maps to a contiguous heap range; the optimizer accounts for this via the column's correlation statistic. <code>CLUSTER</code> can reorder a table to match an index.",
      when: "Range scans on naturally-ordered columns (timestamps, sequential ids); wherever data locality matters.",
      mistake: "Adding indexes blindly. Each index also costs write overhead and space; and an index on an uncorrelated, low-selectivity column may never be used. Verify with EXPLAIN.",
      interview: "“Two tables, same index and query — why is one fast and one slow?” Correlation: if the heap is ordered like the index, fetches are sequential; if not, they're random and far costlier.",
      example: "ShopKart's orders indexed by <code>created_at</code> (append-only) fetch date-ranges from contiguous pages — fast; the same index on a shuffled table would scatter reads.",
      viz: { pages: pages(function (i) { return CLUSTER[i] ? "fetch" : "idle"; }), path: "index",
        plans: [Plan("Index Scan (clustered)", "contiguous, near-sequential fetches", 60, "win"), Plan("Seq Scan", "read all pages", 240, "lose")],
        note: "Clustered/correlated data → matching rows on adjacent pages → fetches are sequential. Layout decides the cost." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function pageCells(pgs) {
      return '<div class="dd-scanpages">' + pgs.map(function (p) {
        var cls = "dd-pg" + (p.state === "seq" ? " seq" : (p.state === "fetch" ? " fetch" : (p.state === "match" ? " fetch match" : "")));
        return '<div class="' + cls + '">' + p.id + "</div>";
      }).join("") + "</div>";
    }
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
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to compare a sequential scan and an index scan on the same table — ' +
          "and watch the optimizer flip between them as selectivity changes.</div>";
        return;
      }
      var pathChip = s.path === "seq" ? '<span class="dd-chip dd-chip--info">Sequential Scan</span>'
        : (s.path === "index" ? '<span class="dd-chip dd-chip--accent">Index Scan</span>' : "");
      var html = '<div class="dd-section"><div class="dd-section-label">Heap pages · products ' + pathChip + "</div>" + pageCells(s.pages) + "</div>";
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

  DL.deepDives["index-scan"] = {
    slug: "index-scan",
    overview: {
      what: "A query can find rows two ways: a <b>sequential scan</b> reads every page of the table, or an <b>index scan</b> descends an index to the matching keys and fetches just those rows. The optimizer chooses based on <b>selectivity</b> — how many rows match.",
      why: "This is the access-path decision behind 'why isn't my index being used?'. An index helps for selective predicates but loses to a sequential scan when most rows match, because index fetches are random I/O. Understanding the crossover is core query tuning.",
      how: "Sequential-scan cost is flat (read all pages, cheap sequential I/O). Index-scan cost grows with the number of matches (each a random heap fetch). Below a selectivity crossover the index wins; above it, the seq scan does. Covering indexes and physical clustering shift the balance."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Watching the planner pick an access path",
      lang: "sql",
      code:
        "-- Selective predicate -> Index Scan\n" +
        "EXPLAIN (ANALYZE) SELECT * FROM products WHERE category = 'electronics';\n" +
        "--  Index Scan using products_category_idx ...  (few random heap fetches)\n" +
        "\n" +
        "-- Non-selective predicate -> Seq Scan (index correctly ignored)\n" +
        "EXPLAIN (ANALYZE) SELECT * FROM products WHERE price > 0;\n" +
        "--  Seq Scan on products ...  (one sequential sweep beats millions of random reads)\n" +
        "\n" +
        "-- Covering index -> Index Only Scan (no heap fetch)\n" +
        "CREATE INDEX ix ON products (category, sku, price);\n" +
        "EXPLAIN SELECT sku, price FROM products WHERE category = 'electronics';\n" +
        "--  Index Only Scan using ix ...",
      highlights: [2, 6, 11]
    },
    reference: [
      ["access path", "How an operator reads a table: seq scan or index scan"],
      ["sequential scan", "Read every page in order; flat cost; great for many matches"],
      ["index scan", "Descend an index to matches, then fetch rows from the heap"],
      ["selectivity", "Fraction of rows a predicate matches — decides the path"],
      ["random I/O", "Scattered page reads (index fetches); costly per page"],
      ["crossover", "Selectivity where seq scan becomes cheaper than index"],
      ["covering index", "Index holding all columns a query needs"],
      ["index-only scan", "Answering a query from the index alone, no heap fetch"],
      ["correlation", "How closely physical row order matches index order"],
      ["CLUSTER", "Physically reorder a table to match an index"]
    ],
    internals:
      "<p>The two access paths have fundamentally different cost shapes. A <b>sequential scan</b> reads all heap pages in physical order — cheap per page (sequential I/O, prefetchable) and <b>flat</b>: its cost depends on table size, not on how many rows match. An <b>index scan</b> descends a B+ Tree to the matching row pointers and then <b>fetches each matching row from the heap</b>, and those fetches are typically <b>random</b> I/O — cheap in count for a selective query, but expensive per page.</p>" +
      "<p>So index cost rises with the match count while seq cost stays flat, and they <b>cross over</b> at some selectivity (often ~5–20% depending on the random/sequential cost ratio). Below it the index wins; above it the sequential scan does — which is exactly why the optimizer 'ignores' an index for a non-selective predicate.</p>" +
      "<p>Two things bend the curve. A <b>covering index</b> enables an <b>index-only scan</b> that skips the heap entirely, removing the random-fetch cost. And <b>correlation</b> — how closely the heap's physical order matches the index order — determines whether index fetches are random or effectively sequential; a highly correlated (clustered) column makes range fetches contiguous and cheap even for many matches.</p>",
    engineering:
      "<p>Index tuning is really about the crossover and the heap-fetch cost. Add indexes for <b>selective</b> predicates and for <b>range/order</b> queries; don't expect them to be used for predicates that match most rows. Reach for <b>covering indexes</b> to enable index-only scans on hot queries — often the biggest single win — but keep the query referencing only covered columns (beware <code>SELECT *</code>).</p>" +
      "<p>Mind <b>physical layout</b>: an index on a well-correlated column (append-only timestamps, sequential ids) gives near-sequential fetches, while the same index on shuffled data scatters reads; <code>CLUSTER</code> or a naturally-ordered key helps. Remember every index has a cost — write amplification on insert/update and storage — so index deliberately, and always confirm the plan with <code>EXPLAIN (ANALYZE)</code> rather than assuming the index is used.</p>",
    gotchas: [
      { kind: "tip", html: "<b>An index is not always the fast path.</b> For a predicate matching a large fraction of rows, the optimizer correctly prefers a sequential scan — one contiguous sweep beats many random heap fetches. 'Seq Scan' in a plan is often right." },
      { kind: "warn", html: "<b>Index scans pay for random I/O.</b> The win comes from the small <i>number</i> of fetches, not cheap fetches. As matches grow, random-read cost crosses the flat seq-scan cost and the index stops being used." },
      { kind: "info", html: "<b>Covering indexes unlock index-only scans</b> (no heap fetch) — a major speedup — but only if the query references solely covered columns. Correlation/clustering also matters: it decides whether index fetches are random or sequential." }
    ],
    failureModes:
      "<p><b>Unused index (surprise seq scan):</b> the predicate is non-selective, so the optimizer skips the index for a scan. <i>Fix:</i> expected behavior — restructure the query, add a covering/partial index, or accept the scan.</p>" +
      "<p><b>Random-fetch blowup:</b> an index scan chosen on a mis-estimate does millions of scattered heap reads. <i>Fix:</i> fresh statistics; covering index; or let it pick a seq scan.</p>" +
      "<p><b>SELECT * defeats index-only scans:</b> selecting uncovered columns forces heap fetches. <i>Fix:</i> select only needed columns; design the covering index to include them.</p>" +
      "<p><b>Over-indexing:</b> too many indexes slow writes and waste space. <i>Fix:</i> keep indexes that are actually used; drop the rest.</p>",
    quickCheck: [
      {
        q: "You add an index that exactly matches a query's WHERE clause, but EXPLAIN still shows a Seq Scan. What's the most likely reason?",
        options: [
          "The index wasn't built correctly",
          "The predicate matches a large fraction of rows, so a sequential scan is cheaper than many random index fetches",
          "Indexes only work on primary keys",
          "The table is too small to index"
        ],
        answer: 1,
        why: "Index-scan cost grows with the number of matches (random heap fetches); seq-scan cost is flat. For a non-selective predicate the optimizer correctly prefers one sequential sweep over millions of random reads.",
        diff: "medium"
      },
      {
        q: "What makes an index-only scan possible, and why is it faster?",
        options: [
          "A smaller table; it skips the WHERE clause",
          "A covering index that holds all columns the query needs, so the answer is read from the index with no heap fetch",
          "Running on a replica",
          "Disabling the buffer pool"
        ],
        answer: 1,
        why: "If the index contains every column the query references, the executor reads the result straight from the index leaves and skips fetching rows from the heap — eliminating the random-I/O cost that normally limits index scans.",
        diff: "medium"
      },
      {
        q: "The same index and query are fast on one table but slow on another. What property most likely explains it?",
        options: [
          "The slow table has more columns",
          "Correlation between index order and physical row order — clustered data gives sequential fetches; uncorrelated data gives random ones",
          "The fast table has no primary key",
          "The slow table uses a different SQL dialect"
        ],
        answer: 1,
        why: "If the heap is physically ordered like the index (high correlation/clustering), an index range maps to contiguous pages and fetches are sequential and cheap. On uncorrelated data the same fetches are scattered random reads — much slower.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain when the optimizer chooses a sequential scan versus an index scan.",
        a: "It compares cost, and the two paths have different cost shapes. A sequential scan reads every page in physical order — cheap sequential I/O, and a flat cost that depends on table size, not on how many rows match. An index scan descends the index to the matching keys and then fetches each matching row from the heap, and those fetches are usually random I/O, so its cost grows with the number of matches. For a selective predicate (few matches) the index wins; as selectivity rises, index cost climbs until it crosses the flat seq-scan cost, after which the sequential scan is cheaper and is chosen. That crossover — often somewhere around 5–20% selectivity — is why an index on a non-selective column is correctly ignored.",
        tip: "Anchor on 'index cost grows with matches (random I/O), seq cost is flat' and the crossover — that's the whole model."
      },
      {
        q: "What's an index-only scan, and how would you design for one?",
        a: "An index-only scan answers a query entirely from the index, without fetching rows from the heap, because the index contains every column the query needs — a covering index. That removes the random heap-fetch cost that normally caps index-scan performance, so it can win even for larger result sets. To design for it, build an index whose columns cover both the predicate and the selected columns — e.g. for SELECT sku, price WHERE category = ?, an index on (category, sku, price). The gotchas: the query must reference only covered columns (SELECT * defeats it), and in Postgres the visibility map must show the rows as all-visible so the heap can be skipped, which means keeping the table well-vacuumed.",
        tip: "Give the concrete (category, sku, price) example and mention SELECT * as the classic thing that breaks it."
      },
      {
        q: "Why can adding an index fail to speed up a query — or even not be used at all?",
        a: "Several reasons, all about cost. If the predicate isn't selective, a sequential scan beats many random index fetches, so the optimizer ignores the index. If the query selects uncovered columns, every index match still triggers a random heap fetch, so the index helps less than expected. If the data is uncorrelated with the index order, those fetches are scattered random reads rather than sequential ones, raising the cost. And if statistics are stale, the optimizer may misjudge selectivity entirely. On top of that, indexes aren't free — they add write overhead and storage — so an unused index is pure cost. The fix is to match indexes to selective/range predicates, use covering indexes for hot queries, keep statistics fresh, and verify with EXPLAIN ANALYZE rather than assuming.",
        tip: "Framing it as 'indexes have a cost and are only used when cheaper' shows you think like the optimizer, not by superstition."
      }
    ],
    businessLens: {
      task: "ShopKart product & order lookups: index scan vs full scan",
      meaning: "Selective lookups fly via indexes; broad filters and reports correctly use full scans.",
      system: "OLTP/reporting on Postgres",
      point: "ShopKart's 'show me this SKU' or 'electronics under ₹5000' are selective, so the planner uses an index and touches only a few pages. But 'all in-stock products' matches most rows, so the same table is scanned sequentially — and forcing an index there would be slower. The team leans on covering indexes for hot endpoints (index-only scans on SKU+price), keeps orders naturally ordered by created_at so date-range reports fetch contiguous pages, and reads EXPLAIN to confirm the path — because on ShopKart's scale, the difference between a chosen index and an accidental random-fetch storm is the difference between a 20ms endpoint and a timeout."
    }
  };
})();
