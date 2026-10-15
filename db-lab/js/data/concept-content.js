/* ============================================================
   concept-content.js — P7 depth sweep.

   Authored lesson content for concepts that shipped as sim-only shells.
   Kept separate from the generated concepts.js and merged over it at load,
   so enrichment is modular and reviewable. The concept workspace already
   renders these fields (Overview / Internals / Engineering / Failure /
   Interview / Related) — filling them turns a shell into a real lesson.

   Only genuine concept lessons are enriched; navigational/meta pages
   (concept-map, glossary, lab launchers) are intentionally left to their
   own purpose. Content is original and source-aligned, not padded.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function iq(q, a) { return { q: q, a: a }; }

  var C = {
    /* ── Foundations ──────────────────────────────────────────────────── */
    m06: {
      why: "SQL is declarative — it says <i>what</i>, not <i>how</i>. Relational algebra is the formal <i>how</i>: a small set of operators the optimizer composes and rewrites to turn a query into an executable plan. It is the algebra that makes query optimization possible.",
      intuition: "Treat each table as a set of rows and the query as a pipeline of operators — <b>select</b> (filter rows), <b>project</b> (pick columns), <b>join</b> (combine tables), set operations, and rename — each taking relations in and producing a relation out.",
      internals: "Core operators: σ selection, π projection, ⋈ join, × cartesian product, ∪ / ∩ / − set ops, ρ rename, plus grouping/aggregation. Because every operator is closed over relations and obeys algebraic laws, the optimizer can rewrite an expression into an equivalent, cheaper one — the foundation of query planning.",
      engineering: "Every SQL statement is lowered to a relational-algebra tree (the logical plan). The algebra is what justifies predicate pushdown, join reordering and projection pruning — they are provably result-preserving transformations.",
      failureModes: "A missing join predicate becomes a cartesian product that explodes row counts. Operator order doesn't change results but dominates cost — a filter applied after a join scans far more rows than one pushed below it.",
      interviewQs: [
        iq("What is the relationship between SQL and relational algebra?", "SQL is declarative; the planner translates it into a relational-algebra expression (the logical plan) built from operators like selection, projection and join. Algebraic equivalence laws then let the optimizer rewrite that expression into a cheaper but equivalent one."),
        iq("Why can the optimizer push a WHERE filter below a join?", "Because selection distributes over join when the predicate references only one input: σ(A⋈B) = σ(A)⋈B. Filtering before the join yields the same result while processing far fewer rows."),
      ],
      prerequisites: ["m05"], related: ["m07", "m14", "m16"],
    },
    m07: {
      why: "The bridge from the SQL you write to the algebra the engine runs. Reading a query as algebra demystifies EXPLAIN output and explains why two differently-written statements can compile to the identical plan.",
      intuition: "Map each clause to an operator: FROM/JOIN → joins, WHERE → selection, SELECT list → projection, GROUP BY → grouping, HAVING → selection after grouping, DISTINCT → deduplication, ORDER BY → sort.",
      internals: "Parsing builds an AST; binding resolves names; the query is lowered to a relational-algebra tree. Clauses are evaluated in a <i>logical</i> order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY), not textual order — which is exactly why a SELECT alias isn't visible in WHERE.",
      engineering: "The logical order explains real errors: an alias unavailable in WHERE, HAVING filtering groups while WHERE filters rows, and why the planner may physically reorder operators as long as the result matches.",
      failureModes: "Confusing WHERE (rows) with HAVING (groups). Expecting SELECT aliases in WHERE/GROUP BY. Assuming textual order equals evaluation order.",
      interviewQs: [
        iq("Why can't you use a SELECT-list alias in the WHERE clause?", "Logical evaluation order runs WHERE before SELECT, so the alias the SELECT list defines doesn't exist yet. HAVING and ORDER BY run after SELECT, so they can reference it."),
        iq("What is the difference between WHERE and HAVING?", "WHERE filters individual rows before grouping; HAVING filters groups after GROUP BY and aggregation. A predicate over an aggregate such as COUNT(*) > 5 must go in HAVING."),
      ],
      prerequisites: ["m06"], related: ["m06", "m10", "m16"],
    },
    m08: {
      why: "Constraints move data-integrity rules into the database, where every writer passes through them — so the rules hold no matter which app, migration or manual fix touches the data.",
      intuition: "Declarative guarantees the engine enforces on every write: a primary key is unique and non-null, a foreign key must reference an existing row, a CHECK must evaluate true, NOT NULL forbids nulls, UNIQUE forbids duplicates.",
      internals: "Primary/unique keys are backed by indexes used to detect duplicates; foreign keys trigger a referential-integrity check and may cascade. Constraints are validated inside the transaction, so a violation aborts it atomically. DEFERRABLE constraints are checked at commit instead of per-statement.",
      engineering: "Enforce invariants in the schema, not only the app — the database is the one gate all writers share. Foreign keys cost an index check per write but prevent orphan rows; some very high-ingest systems relax them deliberately and accept the risk.",
      failureModes: "App-only validation bypassed by another service or a bulk load. A missing FK leaves orphaned rows. Over-eager ON DELETE CASCADE removing more than intended. Constraint checks adding latency on hot write paths.",
      interviewQs: [
        iq("Why enforce constraints in the database rather than application code?", "The database is the single point every writer passes through; app rules are bypassed by other apps, migrations or manual edits. A schema constraint holds for all of them and is enforced atomically within the transaction."),
        iq("What does a foreign key cost, and when might you drop one?", "Each child insert/update verifies the referenced parent exists (an index lookup), and deletes may cascade or be blocked. Extreme-ingest systems sometimes drop FKs for throughput and enforce integrity elsewhere — trading safety for speed."),
      ],
      prerequisites: ["m05"], related: ["m05", "m48", "m49"],
    },
    m09: {
      why: "Every performance decision in a database traces back to the latency gap between CPU cache, RAM, SSD and disk. The buffer pool, indexes and the WAL all exist to keep hot data in fast memory and turn random I/O into sequential.",
      intuition: "A pyramid: CPU cache (ns) → RAM (~100 ns) → SSD (~100 µs) → HDD (~10 ms). Each level down is bigger, cheaper and roughly 1000× slower. Databases cache downward and batch writes to amortize the slow levels.",
      internals: "Data lives in fixed-size pages on durable storage; the buffer pool caches hot pages in RAM. Reads prefer sequential (one seek, many pages) over random. The WAL converts scattered data-page writes into sequential log appends. Indexes cut the number of pages a query must touch.",
      engineering: "Three levers dominate: keep the working set in RAM, minimize random I/O, and sequentialize writes. An index that turns a full scan into a handful of page reads is usually the single biggest win.",
      failureModes: "Working set exceeds RAM → cache thrash and disk-bound queries (the classic 'falls off a cliff' as data grows). Unclustered random access patterns dominate latency. Treating SSD as if it were free RAM.",
      interviewQs: [
        iq("Why do databases care so much about sequential vs random I/O?", "A random read pays full device latency per access; a sequential read amortizes one positioning cost across many contiguous pages. Indexes, logging and prefetching are all designed to maximize sequential access."),
        iq("What is the 'working set' and why does it matter?", "The set of pages the workload actively uses. If it fits in the buffer pool, most accesses are cache hits and fast; if not, the system becomes disk-bound and latency spikes — the usual cause of sudden slowdowns as a table grows."),
      ],
      prerequisites: ["m01"], related: ["m30", "m33", "m34"],
    },

    /* ── SQL & Query Processing ───────────────────────────────────────── */
    m10: {
      why: "The first stage of query processing: turn SQL text into a validated tree the engine can analyze. Nothing can be optimized or executed until the text is parsed and its names resolved.",
      intuition: "Like a compiler front-end — lex characters into tokens, parse tokens into a syntax tree following the SQL grammar, then bind names to real tables and columns in the catalog.",
      internals: "Lexer → tokens; parser → parse tree → AST; binder resolves identifiers against the catalog and checks types and privileges. The output is a validated logical query ready for rewriting and planning. This stage reads only metadata, never user data.",
      engineering: "Parse errors are caught early and cheaply; binding catches typos in column names. Prepared statements parse and bind once and reuse the work per execution, cutting front-end cost and plan-cache churn.",
      failureModes: "Syntax errors from grammar violations; binding failures on unknown tables/columns; plan-cache bloat from unparameterized queries that each parse as a distinct string.",
      interviewQs: [
        iq("What are the stages from SQL text to an executable plan?", "Parse (text → tree), bind/analyze (resolve names and types against the catalog, check privileges), rewrite (rules/views), optimize (choose physical operators by cost), then execute. Parsing and binding touch only metadata."),
        iq("Why do prepared statements improve performance?", "They parse, bind and often plan once, then execute many times with different parameters — amortizing front-end cost and avoiding plan-cache churn from otherwise-distinct SQL strings."),
      ],
      prerequisites: ["m03"], related: ["m11", "m12", "m16"],
    },
    m11: {
      why: "The concrete output of parsing — a tree that mirrors the grammar. It is the scaffold every later stage (binding, rewriting, planning) is built on.",
      intuition: "A tree whose nodes are grammar productions: a SELECT node with child clauses for the select list, FROM, WHERE and so on — faithful to the syntax, including redundant structure.",
      internals: "The parse tree (concrete syntax tree) captures every grammar detail; it is then simplified into an AST that drops syntactic noise, and binding annotates nodes with resolved catalog references and types.",
      engineering: "You rarely inspect the parse tree directly, but it explains why equivalent queries written differently converge to the same plan once normalized.",
      failureModes: "Deeply nested subqueries produce large trees; engines cap nesting depth. Ambiguous constructs can parse in surprising ways.",
      interviewQs: [
        iq("What is the difference between a parse tree and an AST?", "A parse tree mirrors the grammar exactly, including syntactic detail; an AST is a simplified, abstract form keeping only semantically meaningful structure, which makes later analysis and transformation easier."),
      ],
      prerequisites: ["m10"], related: ["m10", "m12"],
    },
    m12: {
      why: "The abstract syntax tree is the clean, normalized representation the optimizer actually works on — grammar noise removed, names resolved.",
      intuition: "A simplified tree of the essential operations and operands, without punctuation or redundant grammar nodes — the common currency between parsing and planning.",
      internals: "Derived from the parse tree by dropping syntactic sugar and resolving references. The planner lowers the AST into relational algebra (a logical plan), then into physical operators for execution.",
      engineering: "AST transformations implement query rewrites: constant folding, view inlining, subquery flattening and predicate normalization — all before cost-based planning begins.",
      failureModes: "Over-aggressive normalization that changes NULL / three-valued-logic behavior. Rewrites that alter semantics subtly between engines.",
      interviewQs: [
        iq("What role does the AST play between parsing and execution?", "It is the normalized tree the engine rewrites (constant folding, view expansion, subquery flattening) and then lowers into a logical relational-algebra plan for cost-based optimization — decoupling surface syntax from planning."),
      ],
      prerequisites: ["m11"], related: ["m11", "m16", "m06"],
    },
    m13: {
      why: "Semantic analysis decides whether a syntactically-valid query actually means something: do the tables and columns exist, do the types line up, is the user allowed?",
      intuition: "After parsing proves the query is well-formed, analysis proves it is well-defined — binding every name to a catalog object and type-checking every expression.",
      internals: "The binder walks the AST resolving identifiers against the system catalog, infers and checks expression types, expands * and views, validates aggregates vs GROUP BY, and checks privileges. The result is a bound, type-annotated tree.",
      engineering: "This is where 'column does not exist' and 'operator does not exist for these types' come from — semantic, not syntactic, errors, surfaced before any data is touched.",
      failureModes: "Ambiguous column references across joined tables. Implicit type coercions that change behavior. Privilege errors discovered only at bind time.",
      interviewQs: [
        iq("What is the difference between a syntax error and a binding error?", "A syntax error means the text violates the grammar (caught by the parser). A binding/semantic error means the text is well-formed but references something that doesn't exist or doesn't type-check — an unknown column, a type mismatch, or a missing privilege."),
      ],
      prerequisites: ["m10"], related: ["m10", "m14", "m66"],
    },
    m14: {
      why: "The logical plan is the query expressed as relational-algebra operators — what to compute, independent of how. It is the canvas the optimizer rewrites before choosing physical operators.",
      intuition: "A tree of logical operators (scan, filter, join, aggregate, sort) describing the result set. Many physical plans can implement the same logical plan.",
      internals: "Built from the bound AST, the logical plan is transformed by rule-based rewrites (predicate pushdown, join reordering, subquery decorrelation, projection pruning). Each rewrite is an algebraic equivalence that preserves results.",
      engineering: "Separating logical from physical is what lets the optimizer try join orders and algorithms freely: the logical plan fixes the answer; the physical plan picks the cheapest way to get it.",
      failureModes: "A huge logical search space (join order is factorial) forces heuristics or timeouts. Rewrites that are unsafe under NULLs or duplicates if applied carelessly.",
      interviewQs: [
        iq("What is the difference between a logical and a physical plan?", "The logical plan says what to compute in relational-algebra terms (join these, filter that); the physical plan says how — which join algorithm, which access path, which order — chosen by cost. One logical plan maps to many physical plans."),
      ],
      prerequisites: ["m06"], related: ["m15", "m16", "m17"],
    },
    m15: {
      why: "The physical plan is the executable one: concrete operators (Hash Join, Index Scan, Sort) with an order, chosen by the cost model. It is what EXPLAIN shows and what actually runs.",
      intuition: "Take the logical plan and bind every operator to an algorithm and access path — a sequential or index scan for each table, a nested-loop/hash/merge join for each join, a sort or hash for each aggregate.",
      internals: "The optimizer enumerates physical alternatives, costs each from statistics (cardinality, selectivity, index availability, memory), and keeps the cheapest via dynamic programming over join subsets. The chosen tree is handed to the executor (usually an iterator/volcano model).",
      engineering: "Reading a physical plan tells you why a query is slow: a Seq Scan where you expected an Index Scan, a Nested Loop over millions of rows, an external Sort spilling to disk.",
      failureModes: "A good logical plan with a bad physical choice from wrong estimates. Plan flips under changing statistics. Memory-starved hash/sort operators spilling to disk.",
      interviewQs: [
        iq("You see a Seq Scan where you expected an Index Scan — what do you check?", "Whether a suitable index exists, whether the predicate is selective enough for an index to win (the optimizer may correctly prefer a scan for low selectivity), and whether statistics are stale, making the optimizer mis-estimate how many rows match."),
      ],
      prerequisites: ["m14"], related: ["m17", "m18", "m68"],
    },
    m18: {
      why: "The sequential scan is the baseline access path: read every page of a table in order. It is unbeatable when a query touches most of the table — and the thing an index must beat to be worth using.",
      intuition: "Walk the heap page by page, applying the filter to each row. One positioning cost, then pure sequential throughput.",
      internals: "The executor reads pages sequentially (often with read-ahead/prefetch), evaluating the predicate per row. Cost ≈ number of pages. No index traversal, no random I/O — which is why it wins for low-selectivity filters and full-table aggregates.",
      engineering: "A seq scan is the right choice when selectivity is high (a large fraction of rows match). The optimizer compares its cost against index access and picks the cheaper — so a seq scan in EXPLAIN isn't always a bug.",
      failureModes: "Seq-scanning a huge table for a point lookup (missing/unused index) — the classic cause of a slow query. Repeated full scans evicting the buffer pool's hot pages.",
      interviewQs: [
        iq("When is a sequential scan faster than an index scan?", "When the filter is unselective — a large fraction of rows match — so an index would fetch most rows anyway via many random I/Os plus the index traversal, costing more than streaming every page once sequentially. Past a crossover selectivity (often a few percent), seq scan wins."),
      ],
      prerequisites: ["m09"], related: ["m35", "m17", "m68"],
    },
    m20: {
      why: "The nested-loop join is the simplest join and the most general — it works for any join condition, not just equality. With an index on the inner side it is also the best choice for a small outer input.",
      intuition: "For each row of the outer table, scan the inner table for matches. Naively O(outer × inner); with an inner index it becomes O(outer × index-probe).",
      internals: "Two forms: naive (full inner scan per outer row) and indexed (probe an index on the inner join key per outer row). Cost ≈ pages(outer) + rows(outer) × inner-access. It streams results and needs little memory, but degrades badly when both inputs are large and unindexed.",
      engineering: "Great for OLTP-style joins: a small driving set (one customer's orders) probing an indexed lookup table. Disastrous as a naive join over two large tables — watch for it in EXPLAIN with huge row estimates.",
      failureModes: "Naive nested loop over two big tables → quadratic blowup. A mis-estimated small outer that is actually large. Missing inner index turning indexed NLJ into naive NLJ.",
      interviewQs: [
        iq("When does the optimizer choose an indexed nested-loop join?", "When the outer input is small and the inner table has an index on the join key, so each outer row costs only a cheap index probe. It streams results with minimal memory — ideal for selective OLTP joins. It loses to hash join when the outer is large."),
      ],
      prerequisites: ["m35"], related: ["m22", "m17", "m68"],
    },
    m22: {
      why: "The sort-merge join shines when inputs are already sorted on the join key (e.g., from an index) or when a hash table won't fit in memory. It also naturally produces sorted output.",
      intuition: "Sort both inputs on the join key, then walk them together like merging two sorted lists — advance whichever side is smaller, emit matches.",
      internals: "Cost ≈ sort(outer) + sort(inner) + a linear merge; the sorts dominate unless an input arrives pre-sorted (via an index or an earlier operator), in which case that side is free. Handles non-unique keys and range-friendly orderings; degrades to external sort when memory is tight.",
      engineering: "Chosen for large equi-joins where inputs are already ordered, or when the downstream needs sorted output anyway (ORDER BY / merge-based aggregation). Hash join usually beats it for unsorted inputs that fit memory.",
      failureModes: "Paying two full external sorts when a hash join would have been cheaper. Skew in duplicate keys causing re-scans of the inner run.",
      interviewQs: [
        iq("When is a merge join preferred over a hash join?", "When both inputs are already sorted on the join key (so the sorts are free) or when memory is too small for a hash table. Merge join also yields ordered output, which helps if an ORDER BY or merge aggregation follows."),
      ],
      prerequisites: ["m20"], related: ["m20", "m17", "m68"],
    },
    m23: {
      why: "Aggregation (GROUP BY, COUNT/SUM/AVG) collapses many rows into summary rows — the core of analytics. How the engine groups (hash vs sort) drives performance on large inputs.",
      intuition: "Partition rows into groups by the grouping key, then fold each group's rows into one aggregate value. Two strategies: build a hash table keyed by the group, or sort by the key and aggregate adjacent runs.",
      internals: "Hash aggregation keeps a hash table of group → running state; fast and unordered, but needs memory and spills if groups don't fit. Sort aggregation sorts on the grouping key then aggregates consecutive rows; reuses existing sort order and produces sorted output. The optimizer picks based on memory, cardinality and required ordering.",
      engineering: "High group cardinality stresses hash-aggregate memory (spills); low cardinality is cheap either way. A pre-existing index order can make sort-based grouping free.",
      failureModes: "Hash aggregate spilling to disk under many distinct groups. Double-counting from joins fanning out rows before aggregation. Approximate vs exact distinct counts.",
      interviewQs: [
        iq("Hash aggregation vs sort-based aggregation — how does the optimizer choose?", "Hash aggregation is fast and unordered but needs memory proportional to the number of groups and spills when they don't fit. Sort-based aggregation reuses existing sort order and produces ordered output. The optimizer weighs group cardinality, available memory and whether downstream ordering is needed."),
      ],
      prerequisites: ["m06"], related: ["m22", "m65", "m68"],
    },
    m25: {
      why: "Comparing candidate plans side by side is how you build intuition for the optimizer: the same query, different access paths and join algorithms, with their estimated costs laid bare.",
      intuition: "Hold the query fixed and vary one knob — add an index, change selectivity, grow a table — and watch which plan the cost model now prefers and why.",
      internals: "Each candidate is a physical plan with a cost estimated from cardinality and I/O assumptions. The comparator surfaces the cost breakdown so you can see the crossover points where one plan overtakes another.",
      engineering: "This is the mental model behind EXPLAIN-driven tuning: don't guess, compare. The interactive Cost-Based Optimizer lab makes these crossovers tangible.",
      failureModes: "Trusting estimates that rest on stale statistics. Comparing plans without accounting for caching or parameter-dependent selectivity.",
      interviewQs: [
        iq("Two plans have similar estimated cost but very different runtimes — why?", "Estimates rest on assumptions — uniform data, independent predicates, cold vs cached pages, average parameter values. Correlated columns, data skew, or a cached working set can make the real cost diverge sharply from the model's prediction."),
      ],
      prerequisites: ["m17"], related: ["m17", "m68", "m58"],
    },
    m58: {
      why: "EXPLAIN (and EXPLAIN ANALYZE) is the single most important tuning tool: it shows the plan the optimizer chose and, with ANALYZE, what actually happened when it ran.",
      intuition: "EXPLAIN prints the physical plan tree with estimated rows and cost; EXPLAIN ANALYZE also runs the query and prints actual rows, actual time and loop counts per operator.",
      internals: "Each node shows estimated vs actual rows — the gap is your cardinality-estimation error, the usual root cause of a bad plan. Look for Seq Scans on big tables, Nested Loops with large actual rows, Sorts/Hashes spilling to disk ('external merge', 'Batches > 1'), and rows multiplied by high loop counts.",
      engineering: "Workflow: find the operator where estimated and actual rows diverge most, fix that (better statistics, an index, a rewrite), re-check. Estimated≈actual with a cheap plan is the goal.",
      failureModes: "Reading estimates as truth. Ignoring loop counts (per-loop vs total). Running EXPLAIN ANALYZE on a destructive statement (it executes!).",
      interviewQs: [
        iq("In EXPLAIN ANALYZE, what does a large gap between estimated and actual rows tell you?", "The optimizer mis-estimated cardinality for that operator — usually from stale statistics, correlated columns, or a selectivity it can't model. Since cost drives plan choice, that error is the most likely reason the plan (join order/algorithm) is wrong. Fixing the estimate often fixes the plan."),
        iq("Why can EXPLAIN ANALYZE be dangerous on a write statement?", "Because it actually executes the statement to measure it — running an EXPLAIN ANALYZE on an INSERT/UPDATE/DELETE performs the write. Wrap it in a transaction you roll back, or use plain EXPLAIN, for destructive statements."),
      ],
      prerequisites: ["m15"], related: ["m17", "m66", "m68"],
    },
    m65: {
      why: "Parallel query splits one query's work across CPU cores — the main way a single analytic query uses a modern many-core machine instead of one core.",
      intuition: "Partition the input (e.g., ranges of a big scan) across worker processes that each do part of the work, then a gather step combines their partial results.",
      internals: "A parallel plan has worker processes running the same sub-plan over disjoint slices, feeding a Gather node. Scans, hash joins and aggregates can parallelize; the degree of parallelism is bounded by cores, config and estimated cost. Partial aggregates are combined in a finalize step.",
      engineering: "Parallelism helps large scans/joins/aggregations (OLAP), not cheap OLTP point queries — the coordination overhead would dominate. Too high a degree oversubscribes CPUs and hurts concurrency.",
      failureModes: "Parallelizing tiny queries (overhead > benefit). Worker startup and gather costs. Skewed partitions leaving some workers idle. Oversubscription under many concurrent queries.",
      interviewQs: [
        iq("When does parallel query help and when does it hurt?", "It helps CPU- or scan-bound analytic queries over large inputs, where work splits cleanly across cores. It hurts cheap OLTP queries (coordination and worker-startup overhead exceed the gain) and high-concurrency workloads where many parallel queries oversubscribe the CPUs."),
      ],
      prerequisites: ["m18"], related: ["m18", "m23", "m68"],
    },
    m66: {
      why: "Statistics are the optimizer's eyes: table sizes, column histograms, distinct counts and correlations. Every cost estimate — and therefore every plan choice — depends on them.",
      intuition: "The engine samples tables to build per-column histograms and most-common-value lists, plus row counts, so it can estimate how many rows a predicate or join will produce.",
      internals: "ANALYZE samples rows to build histograms (value distribution), n_distinct (for grouping/join estimates) and MCV lists (for skewed values). Selectivity of a predicate is read from these; join cardinality combines them. Stale or missing stats → wrong estimates → wrong plans. Extended/multi-column statistics capture correlations single-column stats miss.",
      engineering: "Keep statistics fresh (autovacuum/auto-analyze); after big data changes, re-analyze. Correlated columns (city/zip) need multi-column statistics or the optimizer underestimates combined selectivity.",
      failureModes: "Stale stats after a bulk load → catastrophic plans. Correlated predicates estimated as independent → gross underestimates. Unanalyzed temp tables.",
      interviewQs: [
        iq("Why do correlated columns cause bad row estimates?", "The optimizer assumes predicates are independent and multiplies their selectivities. For correlated columns (e.g., city='SF' AND state='CA'), that product underestimates the true count badly, leading it to pick nested loops for what is really a large result. Multi-column/extended statistics fix this."),
        iq("A query got slow right after a big data load — what's a likely cause?", "Stale statistics. The bulk load changed table size and distribution, but the optimizer is still costing plans from old numbers, so it picks a now-wrong plan. Re-running ANALYZE refreshes the estimates and usually restores a good plan."),
      ],
      prerequisites: ["m13"], related: ["m17", "m58", "m68"],
    },
    m68: {
      why: "The cost model is the optimizer's judgment: a formula that turns each candidate plan into a single comparable number, so the engine can pick without running them.",
      intuition: "Estimate how many rows flow between operators (cardinality), then price each operator's work in I/O and CPU units, and sum the tree. Lowest total wins.",
      internals: "Cost blends sequential and random page I/O, CPU per row/operator, and memory effects, weighted by configurable constants. Cardinality drives everything — a wrong row estimate propagates up the tree and dominates the error. The optimizer searches plan space (join order via dynamic programming) and keeps the cheapest.",
      engineering: "You rarely tune the cost constants; you fix the inputs — keep statistics fresh, add indexes, rewrite to give better estimates. The teaching Cost-Based Optimizer lab shows how selectivity and memory move the chosen plan.",
      failureModes: "Garbage-in: bad cardinality → bad cost → bad plan. Cost constants mis-tuned for the hardware (SSD vs HDD random-I/O ratio). Plan instability as estimates wobble near a crossover.",
      interviewQs: [
        iq("What is the single biggest source of error in query cost estimation?", "Cardinality estimation — how many rows each operator produces. It drives the entire cost, and errors compound up the plan tree. Correlated columns, skew and stale statistics all break the estimates, which is why most 'the optimizer picked a bad plan' problems trace back to row estimates, not the cost constants."),
      ],
      prerequisites: ["m17"], related: ["m17", "m66", "m58"],
    },
  };

  DL.conceptContent = Object.assign(DL.conceptContent || {}, C);

  // Merge authored content over the generated registry (same objects as conceptById).
  (DL.concepts || []).forEach(function (c) {
    var e = DL.conceptContent[c.id];
    if (!e) return;
    ["why", "intuition", "internals", "how", "engineering", "failureModes"].forEach(function (k) {
      if (e[k] != null) c[k] = e[k];
    });
    if (e.interviewQs) c.interviewQs = e.interviewQs;
    if (e.prerequisites && (!c.prerequisites || !c.prerequisites.length)) c.prerequisites = e.prerequisites;
    if (e.related && (!c.related || !c.related.length)) c.related = e.related;
    if (e.engineeringApp) c.engineeringApp = e.engineeringApp;
    c.contentAuthored = true;
  });
})();
