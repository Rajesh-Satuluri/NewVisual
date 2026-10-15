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

  /* ── Storage & Indexing ─────────────────────────────────────────────── */
  var S = {
    m26: {
      why: "Everything above the storage engine — tables, indexes, the WAL — ultimately lands in files on disk. How the engine lays out those files decides what I/O patterns queries produce.",
      intuition: "A table is a heap file: an unordered collection of fixed-size pages holding rows. Indexes are separate files. The engine maps a (file, page number) to a byte offset and reads a whole page at a time.",
      internals: "Databases manage their own file layout rather than one row per OS file: a relation is one or more segment files split into pages; a free-space map tracks room for inserts; a visibility/space map aids scans and vacuum. The buffer pool caches these pages in RAM.",
      engineering: "Co-locating related rows (clustering) turns random reads into sequential ones. Append-heavy tables fragment differently from update-heavy ones; file layout is why VACUUM/compaction exist.",
      failureModes: "Fragmentation and bloat from updates/deletes leaving dead space. Scattered inserts causing random I/O. Running out of free space mid-transaction.",
      interviewQs: [
        iq("Why do databases manage their own on-disk file layout instead of using one file per row or table?", "Row/record granularity must map to page-sized I/O for the buffer pool and OS to be efficient, and the engine needs control over free space, clustering and recovery metadata. Managing pages within segment files lets it batch I/O, track free space, and coordinate with the WAL and vacuum."),
      ],
      prerequisites: ["m09"], related: ["m27", "m30", "m33"],
    },
    m27: {
      why: "The page (typically 4–16 KB) is the atomic unit of database I/O and caching. Everything — rows, index nodes, the buffer pool, the WAL — is organized around it.",
      intuition: "A fixed-size block read and written as a whole. Reading one row means reading its entire page; the buffer pool caches pages, not rows.",
      internals: "A page has a header, a slot array of (offset, length) pointers growing from the front, and row data growing from the back — the slotted-page layout. This supports variable-length rows and in-place compaction without moving row identifiers (which point at slots, not offsets).",
      engineering: "Page size trades off: bigger pages amortize I/O and suit scans but waste cache on point lookups and increase contention. Row size vs page size determines rows-per-page, which drives scan cost.",
      failureModes: "Rows larger than a page need overflow/TOAST storage. Low fill factor wastes cache; too-high fill factor causes splits under updates. Torn pages on crash (mitigated by full-page WAL images).",
      interviewQs: [
        iq("Why does the slotted-page layout use a slot array instead of storing rows at fixed offsets?", "Row identifiers (page, slot) must stay stable even as variable-length rows are inserted, deleted and compacted within a page. The slot array indirection lets the engine move row bytes to reclaim space while keeping each row's (page, slot) identifier — referenced by indexes — unchanged."),
      ],
      prerequisites: ["m26"], related: ["m26", "m28", "m30"],
    },
    m28: {
      why: "How a row is encoded inside a page determines storage efficiency, the cost of reading a column, and how updates behave. It is the lowest level of the data model.",
      intuition: "A tuple is a header plus its column values packed into a page slot. Fixed-length columns sit at known offsets; variable-length ones (text) are length-prefixed and packed after.",
      internals: "The row header carries visibility info (xmin/xmax for MVCC), a null bitmap, and the column layout. Fixed-width columns are read by offset; variable-width require walking lengths. Large values are moved to overflow (TOAST) storage and referenced by pointer.",
      engineering: "Column order can matter for alignment/padding. Wide rows reduce rows-per-page and slow scans. An UPDATE in an MVCC engine writes a whole new row version, not an in-place field edit.",
      failureModes: "Padding waste from poor column ordering. Oversized rows forcing overflow and extra I/O. Update-heavy tables bloating with dead versions.",
      interviewQs: [
        iq("In an MVCC database, what physically happens to a row on UPDATE?", "A new row version (tuple) is written with the updating transaction's xmin; the old version is stamped with that transaction's xmax to mark it superseded. The field isn't edited in place — which is why updates create dead tuples that VACUUM later reclaims."),
      ],
      prerequisites: ["m27"], related: ["m27", "m48", "m50"],
    },
    m31: {
      why: "When the buffer pool is full, something must be evicted to make room. The replacement policy decides what — and a bad choice turns a cache into a bottleneck.",
      intuition: "Keep the pages you'll reuse soon, evict the ones you won't. LRU approximates 'soon' by 'recently used'; CLOCK approximates LRU cheaply; FIFO ignores reuse entirely.",
      internals: "LRU evicts the least-recently-used frame (updates recency on hit); CLOCK uses a reference bit and a sweeping hand to approximate LRU at O(1); FIFO evicts the oldest-loaded frame and can suffer Bélády's anomaly. Dirty victims must be written back (and the WAL forced) before eviction.",
      engineering: "Scans can pollute an LRU cache by flooding it with pages used once — real engines add scan resistance (LRU-K, ring buffers for big scans). Explore the trade-offs in the interactive Buffer Pool lab.",
      failureModes: "Cache thrash when the working set exceeds the pool. Scan pollution evicting hot pages. FIFO's anomaly where more frames → more misses.",
      interviewQs: [
        iq("Why do real databases use CLOCK or LRU-K instead of plain LRU?", "Plain LRU needs per-access list maintenance and is vulnerable to scan pollution (a one-pass scan evicts the hot working set). CLOCK approximates LRU with a cheap reference bit, and LRU-K/scan-resistant variants keep single-use scan pages from displacing frequently-reused pages."),
      ],
      prerequisites: ["m30"], related: ["m30", "m32", "m34"],
    },
    m32: {
      why: "The OS keeps its own page cache beneath the database's buffer pool. Understanding the two layers explains double-buffering, direct I/O, and why 'free' RAM shows as cache.",
      intuition: "Two caches in series: the DB buffer pool (knows transactions and dirty pages) over the OS page cache (knows files and blocks). A read may hit either, both, or neither.",
      internals: "By default a read not in the buffer pool goes to the OS, which may serve it from its page cache (a fast 'warm' miss) or go to disk. This double-buffering wastes some RAM but gives a second cache tier. Direct I/O (O_DIRECT) bypasses the OS cache to avoid duplication, at the cost of losing OS read-ahead.",
      engineering: "Sizing shared_buffers vs leaving RAM for the OS cache is a real tuning decision; many engines deliberately keep the buffer pool modest and lean on the OS cache. fsync semantics matter for durability across this boundary.",
      failureModes: "Double-buffering wasting RAM. Relying on OS cache for durability (it isn't durable until fsync). Cold OS cache after a restart causing a slow warm-up.",
      interviewQs: [
        iq("What is double buffering and why might a database use direct I/O?", "Double buffering is caching the same page in both the DB buffer pool and the OS page cache, wasting RAM. Direct I/O (O_DIRECT) bypasses the OS cache so each page is cached once under the database's control — chosen when the engine wants full control of caching and write ordering, trading away OS read-ahead."),
      ],
      prerequisites: ["m30"], related: ["m30", "m31", "m33"],
    },
    m33: {
      why: "All of a database's performance engineering exists to manage disk I/O — the slowest thing it does by orders of magnitude. Knowing how I/O actually works grounds every tuning decision.",
      intuition: "Storage is accessed in blocks. A read costs a positioning delay plus transfer time; the positioning delay (seek on HDD, flash translation on SSD) is what you fight to avoid or amortize.",
      internals: "HDDs pay seek + rotational latency per random access (~10 ms); SSDs have no seek but still pay per-operation overhead and have write-amplification/erase-block constraints. Databases issue page-sized I/Os, prefetch sequential runs, and batch/sequentialize writes (WAL) to amortize per-op cost. fsync forces durability to the device.",
      engineering: "Measure IOPS and throughput separately: random workloads are IOPS-bound, scans are throughput-bound. SSDs shrink but don't eliminate the random/sequential gap, and their write endurance shapes compaction/WAL design.",
      failureModes: "Random-I/O-bound workloads starved for IOPS. fsync storms during checkpoints. SSD write amplification from small random writes.",
      interviewQs: [
        iq("SSDs have no seek time — does the sequential-vs-random distinction still matter?", "Yes. SSDs still pay per-operation overhead, read in pages and erase in larger blocks, so many small random writes cause write amplification and garbage-collection cost. Sequential access amortizes overhead and is kinder to flash endurance — the gap shrinks versus HDDs but doesn't vanish."),
      ],
      prerequisites: ["m09"], related: ["m34", "m09", "m54"],
    },
    m34: {
      why: "The single most important storage fact in databases: sequential I/O is often 100–1000× faster than random I/O. Indexes, logging and clustering all exist to turn random into sequential.",
      intuition: "Reading contiguous pages pays one positioning cost then streams; jumping around pays the positioning cost every time. A scan is sequential; an unclustered index lookup of many rows is random.",
      internals: "The WAL makes commit durable with a sequential append instead of random data-page writes. A clustered index stores rows in key order so range scans are sequential. Prefetch/read-ahead detects sequential patterns. The optimizer's cost model weighs random page cost far above sequential.",
      engineering: "Prefer plans and layouts that sequentialize access: covering indexes, clustering on range-query keys, batching writes. An index that fetches 40% of a table via random I/O can be slower than a sequential scan — the seq-vs-index crossover.",
      failureModes: "Random-access plans (unclustered index over many rows) that lose to a seq scan. Insert patterns scattering related rows. Ignoring read-ahead by issuing tiny scattered reads.",
      interviewQs: [
        iq("Why can a sequential scan beat an index scan even when an index exists?", "If the query matches a large fraction of rows, the index path performs many random page fetches (one per matching row) plus the index traversal, while a sequential scan streams all pages once with a single positioning cost. Past a crossover selectivity, sequential throughput wins — which is why the optimizer sometimes correctly chooses a seq scan."),
      ],
      prerequisites: ["m33"], related: ["m18", "m09", "m17"],
    },
    m35: {
      why: "The B-tree is the ancestor of the B+tree and the classic balanced, disk-friendly index: high fan-out, shallow depth, O(log n) lookups with few page reads. Understanding it frames why B+trees refine it.",
      intuition: "A balanced search tree with many keys per node (not two), so it stays shallow. Each internal node holds keys and child pointers; a search descends comparing against keys.",
      internals: "A B-tree stores keys (and sometimes values) in both internal and leaf nodes; a B+tree moves all values to the leaves and links them. High fan-out (hundreds of keys/node) keeps height ~3–4 even for billions of rows, so a lookup is a handful of page reads. Nodes split on overflow and merge on underflow to stay balanced.",
      engineering: "Almost every relational index is a B+tree variant. The B-tree's key property — balance via split/merge so all leaves are equidistant — is what guarantees predictable lookup cost. See it live in the interactive B+Tree lab.",
      failureModes: "Low fan-out (large keys) deepening the tree. Random insert order causing frequent splits/bloat. Confusing B-tree with binary tree (B-trees are wide and shallow).",
      interviewQs: [
        iq("Why are B-trees wide and shallow instead of binary?", "Because disk/SSD I/O is page-sized and latency-dominated. Packing hundreds of keys per node (matching a page) gives high fan-out, so the tree height — and thus the number of page reads per lookup — stays tiny (3–4) even for billions of keys. A binary tree would be far deeper and not page-aligned."),
      ],
      prerequisites: ["m09"], related: ["m36", "m52", "m18"],
    },
    m37: {
      why: "Search is the B+tree's core operation and the reason it exists: find a key (or the start of a range) in a few page reads, regardless of table size.",
      intuition: "Start at the root, compare the key against the separators, follow the one child whose range contains it, repeat until a leaf — then the leaf holds the value (or the range's start).",
      internals: "Each internal node's separator keys partition the key space; the search follows one pointer per level, so it touches exactly height nodes (≈ the number of page reads). A range scan descends to the low end once, then walks the linked leaves sequentially — the B+tree's range superpower.",
      engineering: "Point lookups cost the tree height in I/O; range scans add the sequential leaf walk. This is why B+trees serve both equality and range predicates well, unlike hash indexes. Try searches in the B+Tree lab.",
      failureModes: "Non-covering lookups needing an extra heap fetch per match (random I/O). Deep trees from low fan-out. Searching a non-leading column of a composite index (can't use it).",
      interviewQs: [
        iq("Why can a B+tree serve range queries efficiently but a hash index cannot?", "B+tree leaves are stored in sorted order and linked, so a range query descends once to the low bound and then walks leaves sequentially. A hash index scatters keys across buckets with no order, so it supports equality lookups but has no way to find 'the next key' — ranges would require scanning every bucket."),
      ],
      prerequisites: ["m35"], related: ["m36", "m38", "m52"],
    },
    m38: {
      why: "Insertion is where a B+tree grows while staying balanced. The split-and-propagate mechanism is what keeps every leaf at the same depth no matter the insert order.",
      intuition: "Find the right leaf, put the key in sorted position. If the leaf overflows, split it in two and push a separator up to the parent — which may split in turn, up to the root.",
      internals: "A leaf over capacity splits; the new leaf's first key is copied up as a separator. If a parent overflows it splits and pushes its middle key up. Only a root split adds a level — the single way the tree grows taller, and why all leaves stay equidistant.",
      engineering: "Sequential (monotonic) inserts hit the rightmost leaf repeatedly — efficient but can create a hotspot; random inserts spread splits out. Fill factor tunes how full leaves start, trading space for fewer future splits. Watch splits in the B+Tree lab.",
      failureModes: "Right-edge insert hotspots under monotonic keys. Page splits causing fragmentation and bloat under heavy insert. Low fill factor wasting space.",
      interviewQs: [
        iq("How does a B+tree stay balanced as rows are inserted in any order?", "Inserts only ever cause bottom-up splits: an overflowing node splits and pushes a separator to its parent, cascading upward. The tree's height changes only when the root splits, which adds one level to every path at once — so all leaves always remain at the same depth regardless of insertion order."),
      ],
      prerequisites: ["m37"], related: ["m36", "m39", "m40"],
    },
    m39: {
      why: "Deletion is the mirror of insertion: remove a key and, if a node falls below minimum occupancy, rebalance so the tree stays valid and reasonably full.",
      intuition: "Remove the key from its leaf. If the leaf is now too empty, borrow a key from a sibling that has spare, or merge with a sibling and pull a separator down from the parent.",
      internals: "Underflow (below the minimum key count) triggers a borrow (rotate a key through the parent separator) if a sibling has surplus, else a merge (combine with a sibling and remove the parent's separator). Merges can cascade upward and shrink the tree's height when the root loses its last separator.",
      engineering: "Many real engines defer or avoid aggressive merging (allowing some under-full nodes) because deletes are often followed by inserts; periodic rebuild/VACUUM reclaims space. Watch borrow/merge in the B+Tree lab.",
      failureModes: "Index bloat when deletes leave under-full pages that aren't reclaimed. Cascading merges adding write cost. Churn from alternating insert/delete at a boundary.",
      interviewQs: [
        iq("What happens when a B+tree node underflows on delete?", "If a neighboring sibling has more than the minimum keys, the node borrows one (rotating a key through the parent's separator). Otherwise it merges with a sibling, pulling the separator down and removing it from the parent — which can cascade and, if the root empties, reduce the tree's height."),
      ],
      prerequisites: ["m38"], related: ["m36", "m38", "m50"],
    },
    m40: {
      why: "A root split is the only event that makes a B+tree taller. It's worth isolating because it explains the tree's balance guarantee and its logarithmic, uniform depth.",
      intuition: "When a split propagates all the way up and the root itself overflows, the root splits into two and a brand-new root is created above them — adding exactly one level to every path simultaneously.",
      internals: "Splits cascade from a leaf upward; if they reach the root and it overflows, a new root with a single separator and two children is created. Because this lifts every leaf by one level at once, the tree remains perfectly balanced. Height grows O(log) in the number of keys.",
      engineering: "Root splits are rare (height grows logarithmically), so the amortized cost of insertion stays low. The guarantee 'all leaves at equal depth' is exactly what a root split preserves — the basis of the B+tree's predictable lookup cost.",
      failureModes: "Nothing pathological — but very low fan-out makes root splits (and height growth) happen sooner, deepening the tree and raising lookup I/O.",
      interviewQs: [
        iq("Why is a B+tree guaranteed to have all leaves at the same depth?", "Because the tree only ever grows at the root: splits propagate bottom-up, and the sole way to add a level is a root split, which creates a new root above the whole tree. That lifts every leaf by one level simultaneously, so no path is ever longer than another."),
      ],
      prerequisites: ["m38"], related: ["m36", "m38", "m35"],
    },
    m42: {
      why: "The MemTable + WAL is the LSM-tree's write path: make writes fast and durable by appending to a log and buffering in sorted memory, deferring the expensive sorted-file work.",
      intuition: "A write does two cheap things: append a record to the WAL (durability) and insert into an in-memory sorted structure (the MemTable). No random disk writes on the hot path.",
      internals: "The WAL append is sequential and fsync'd for durability; the MemTable (a balanced tree or skip list) keeps keys sorted in RAM. When the MemTable fills, it is flushed as an immutable sorted SSTable in one sequential write, and a fresh MemTable + WAL segment begins. A crash replays the WAL into a new MemTable.",
      engineering: "This is why LSM stores (RocksDB, Cassandra) have excellent write throughput: random user writes become sequential log appends plus in-memory inserts. Explore it in the LSM-Tree lab.",
      failureModes: "WAL fsync latency on the write path. MemTable memory pressure forcing frequent small flushes. Losing un-fsync'd WAL tail on crash.",
      interviewQs: [
        iq("How does an LSM-tree make writes fast without losing durability?", "Each write appends to a sequential WAL (durable via fsync) and updates an in-memory sorted MemTable — both cheap, no random disk writes. When the MemTable fills it is flushed as one immutable sorted SSTable in a single sequential write. A crash is recovered by replaying the WAL into a fresh MemTable."),
      ],
      prerequisites: ["m47"], related: ["m41", "m43", "m45"],
    },
    m43: {
      why: "The SSTable (Sorted String Table) is the LSM-tree's on-disk building block: an immutable, sorted, self-describing file. Immutability is what makes LSM writes sequential and compaction simple.",
      intuition: "A file of key→value pairs sorted by key, written once and never modified. To 'change' data you write a newer SSTable; reads merge across them newest-first.",
      internals: "An SSTable stores sorted entries plus a sparse index (and often a Bloom filter) for fast lookups, and is never updated in place. Because it's immutable, concurrent reads need no locks, and compaction can merge SSTables by streaming. Deletes are tombstone entries in newer SSTables.",
      engineering: "Immutability trades update-in-place for append + background merge: great write throughput and simple concurrency, at the cost of read amplification (check several SSTables) mitigated by Bloom filters. See SSTables form in the LSM-Tree lab.",
      failureModes: "Read amplification from many overlapping SSTables (before compaction). Tombstones lingering until compaction. Space amplification from superseded versions.",
      interviewQs: [
        iq("Why are SSTables immutable, and what does that cost?", "Immutability makes writes sequential (just append a new file), lets reads proceed lock-free, and makes compaction a simple streaming merge. The cost is read amplification — a lookup may have to check several SSTables and the MemTable — plus space for superseded versions until compaction reclaims them. Bloom filters cut the read cost."),
      ],
      prerequisites: ["m42"], related: ["m41", "m45", "m44"],
    },
    m45: {
      why: "Compaction is the LSM-tree's housekeeping: merge SSTables to discard superseded versions and tombstones, bound read amplification, and reclaim space. Its strategy sets the write/read/space trade-off.",
      intuition: "Periodically merge several sorted files into fewer, larger sorted files — keeping the newest value per key and dropping deletes at the bottom level. It's a streaming k-way merge.",
      internals: "Leveled compaction keeps one sorted run per level with a size ratio, giving low read/space amplification but high write amplification (data rewritten as it descends). Size-tiered compaction merges similarly-sized runs, giving low write amplification but higher read/space amplification. Tombstones are purged only at the bottom level.",
      engineering: "Pick the strategy for the workload: leveled for read-heavy/space-sensitive, tiered for write-heavy. Compaction competes with foreground I/O — poorly tuned compaction causes latency stalls. Watch amplification shift in the LSM-Tree lab.",
      failureModes: "Compaction stalls/backlog under heavy writes (write stalls). Write amplification wearing SSDs. Large tombstones delaying space reclamation. I/O contention with live traffic.",
      interviewQs: [
        iq("Contrast leveled and size-tiered compaction.", "Leveled keeps one sorted run per level with a fixed size ratio: few files to check (low read amplification) and compact storage (low space amplification), but data is rewritten repeatedly as it moves down (high write amplification). Size-tiered merges similarly-sized runs: less rewriting (low write amplification) but more overlapping files and dead versions (higher read/space amplification)."),
      ],
      prerequisites: ["m43"], related: ["m41", "m44", "m43"],
    },
    m52: {
      why: "Not every index is a B+tree. Choosing the right index type — hash, bitmap, covering, partial, GIN/GiST — is a core design decision that maps the index to the query pattern.",
      intuition: "Match the structure to the predicate: B+tree for equality+range, hash for equality-only, bitmap for low-cardinality analytics, GIN for containment (arrays/JSON/full-text), covering to avoid heap fetches.",
      internals: "Hash indexes give O(1) equality but no ranges. Bitmap indexes store a bit-vector per distinct value — tiny and fast to combine with AND/OR for low-cardinality columns, poor for high-cardinality or heavy updates. Covering (include) indexes store extra columns in the leaf so the query is answered from the index alone (index-only scan). Partial indexes index only rows matching a predicate. GIN/GiST handle multi-valued and geometric/text data.",
      engineering: "A covering index turns a random heap fetch per row into zero — a big win for hot read paths. Partial indexes shrink an index to just the rows you query (e.g., WHERE status='active'). Over-indexing slows writes and wastes space.",
      failureModes: "Using a hash index where ranges are needed. Bitmap indexes on high-cardinality or write-heavy columns. Too many indexes slowing every write. Non-covering lookups paying heap-fetch random I/O.",
      interviewQs: [
        iq("What is a covering (index-only) scan and when is it worth it?", "A covering index includes all columns a query needs in its leaf entries, so the query is answered from the index without fetching the heap row — eliminating one random I/O per matching row. It's worth it for hot read paths where that heap-fetch cost dominates, at the price of a larger index and slower writes."),
        iq("When would you choose a hash index over a B+tree index?", "Only when the workload is pure equality lookups and you never need ranges or ordering, since a hash index gives O(1) equality but cannot support range or sorted access. In practice B+trees are the default because they handle equality and ranges; hash indexes are a niche optimization."),
      ],
      prerequisites: ["m35"], related: ["m36", "m37", "m17"],
    },
    m56: {
      why: "Opening a database connection is expensive (TCP + auth + backend process/thread). A connection pool reuses a bounded set of established connections, which is essential for scaling application concurrency.",
      intuition: "Keep a fixed pool of open connections; hand one to a request, take it back when done. Requests briefly wait if all are busy, instead of each paying full connection setup.",
      internals: "Each database backend consumes memory and scheduling; too many connections cause contention and context-switch overhead (databases are usually fastest with a modest number of busy connections). A pool caps concurrency, multiplexes many app requests over few backends, and can queue or reject excess. External poolers (e.g., PgBouncer) add transaction-level pooling.",
      engineering: "Size the pool near the database's optimal concurrency (often a small multiple of cores), not the number of app threads. Watch for pool exhaustion (requests queueing) and for long-held connections (a slow query starving the pool).",
      failureModes: "Pool too large → database thrashes on too many active backends. Pool too small → request queueing. Leaked connections (not returned) exhausting the pool. Long transactions holding connections and locks.",
      interviewQs: [
        iq("Why can adding more database connections make throughput worse?", "Each connection is a backend consuming memory and CPU scheduling; beyond the database's optimal concurrency (often a small multiple of cores), they contend for locks, cache and the scheduler, so more connections mean more context-switching and less useful work. A pool that caps active connections near that optimum and queues the rest usually beats a larger pool."),
      ],
      prerequisites: ["m01"], related: ["m49", "m30", "m48"],
    },
  };
  Object.assign(C, S);

  /* ── Distributed Databases ──────────────────────────────────────────── */
  var D = {
    m62: {
      why: "A single machine eventually runs out of CPU, RAM, disk or I/O. Sharding (horizontal partitioning) splits one logical dataset across many nodes so the system scales out instead of up.",
      intuition: "Divide rows across shards by a partition key, each shard a self-contained database holding a subset. A router sends each query to the shard(s) that own the relevant keys.",
      internals: "A sharding function (hash or range of the partition key) maps each row to a shard. Single-key operations touch one shard; cross-shard queries and joins require scatter-gather and are expensive. The partition key choice governs load balance and which queries stay single-shard.",
      engineering: "Pick a partition key that spreads load evenly and keeps your hottest queries single-shard (e.g., shard orders by customer_id if you query by customer). Cross-shard transactions need distributed commit; avoid them on hot paths.",
      failureModes: "Skewed keys creating hot shards. Cross-shard joins/transactions blowing up latency. Re-sharding pain when a key choice turns out wrong. Losing a shard = losing its data unless replicated.",
      interviewQs: [
        iq("How do you choose a sharding (partition) key?", "Pick one that (1) distributes data and load evenly to avoid hot shards and (2) keeps your most frequent queries within a single shard to avoid scatter-gather. For example, sharding orders by customer_id keeps per-customer reads single-shard. A poor key causes skew or forces cross-shard joins that don't scale."),
      ],
      prerequisites: ["m55"], related: ["m86", "m87", "m90"],
    },
    m64: {
      why: "Quorums let a replicated system stay consistent and available without every replica being up: require overlapping read and write majorities so a read always sees the latest write.",
      intuition: "With N replicas, write to W and read from R. If R + W > N, the read set and any write set overlap in at least one replica, so a read always catches the newest value.",
      internals: "A write succeeds when W replicas acknowledge; a read queries R replicas and takes the newest (by version/timestamp). R + W > N guarantees overlap. Tuning: W=N,R=1 favors reads; W=1,R=N favors writes; W=R=⌈(N+1)/2⌉ balances. Quorums tolerate up to N−W write failures and N−R read failures.",
      engineering: "Dynamo-style stores expose N/R/W as knobs. R+W>N gives strong-ish reads; relaxing it (R+W≤N) gives faster but potentially stale reads (eventual consistency). Explore overlap in the Quorum lab.",
      failureModes: "R+W≤N allowing stale reads. Losing quorum under too many failures → unavailable. Clock-based conflict resolution losing writes. Sloppy quorums/hinted handoff weakening guarantees.",
      interviewQs: [
        iq("Why does R + W > N guarantee a read sees the latest write?", "A write is acknowledged by W replicas; a read consults R replicas. If R + W > N, the two sets must overlap in at least one replica by the pigeonhole principle — and that replica holds the latest write, which the read picks by version. If R + W ≤ N, the sets can be disjoint and the read may miss the newest value."),
      ],
      prerequisites: ["m79"], related: ["m79", "m80", "m81"],
    },
    m69: {
      why: "Distributing a database buys scale and fault tolerance but introduces partial failure, network uncertainty and the need for coordination — a fundamentally harder model than a single node.",
      intuition: "Many machines cooperating over an unreliable network, where any node or link can fail independently and messages can be lost, delayed or reordered. No shared clock, no shared memory.",
      internals: "The 'fallacies of distributed computing' bite: the network is not reliable, latency is not zero, bandwidth is finite, topology changes. Core problems: replication (copies), partitioning (splitting), consensus (agreement), and consistency (what readers see). CAP/PACELC frame the unavoidable trade-offs under partitions and latency.",
      engineering: "Design for partial failure from day one: timeouts, retries (idempotent), health checks, and explicit consistency choices. Don't pretend remote calls are local.",
      failureModes: "Assuming the network is reliable/synchronous. Ignoring partial failure. Unbounded retries amplifying outages. Hidden single points of failure.",
      interviewQs: [
        iq("What makes distributed systems fundamentally harder than single-node ones?", "Partial failure and asynchrony: individual nodes and links fail independently, and messages can be lost, delayed or reordered with no shared clock or memory. You can't tell a slow node from a dead one, so correctness requires explicit coordination (consensus, quorums) and every operation must tolerate components failing underneath it."),
      ],
      prerequisites: ["m01"], related: ["m70", "m55", "m80"],
    },
    m70: {
      why: "You can't design fault tolerance without a model of what 'fault' means. Classifying failure modes — crash, omission, timing, Byzantine — sets what a protocol must tolerate.",
      intuition: "Failures range from clean (a node stops) to messy (a node sends wrong or conflicting data). The nastier the model you tolerate, the more expensive the protocol.",
      internals: "Crash-stop: a node halts and stays halted. Crash-recovery: it may restart (needs stable storage). Omission: messages dropped. Timing: responses too late (asynchrony). Byzantine: arbitrary/malicious behavior — tolerated only by BFT protocols needing 3f+1 nodes for f faults. Most databases assume crash-recovery with reliable-ish links, not Byzantine.",
      engineering: "Match the model to reality: in a trusted datacenter, crash-recovery (Raft/Paxos, 2f+1 for f faults) suffices; across trust boundaries (blockchains) you need BFT. Over-modeling costs performance.",
      failureModes: "Assuming crash-stop when nodes actually recover with stale state. Ignoring omission/timing faults (the common real ones). Using a non-Byzantine protocol where malicious actors exist.",
      interviewQs: [
        iq("What's the difference between crash and Byzantine failures, and how many nodes does each need?", "A crash failure is a node simply stopping; a Byzantine failure is a node behaving arbitrarily or maliciously (wrong or conflicting messages). Crash-tolerant consensus (Raft/Paxos) needs 2f+1 nodes to tolerate f failures (a majority survives); Byzantine fault tolerance needs 3f+1, because you must out-vote both the failed nodes and their lies."),
      ],
      prerequisites: ["m69"], related: ["m72", "m73", "m93"],
    },
    m71: {
      why: "Everything in a distributed database happens by sending messages over a network that can lose, delay, duplicate and reorder them. The communication model shapes every protocol.",
      intuition: "Nodes talk by RPC or message passing. A request may get no reply because the request was lost, the node died, or the reply was lost — and the sender can't tell which.",
      internals: "Synchronous RPC blocks awaiting a reply (simple but couples availability); asynchronous messaging decouples sender and receiver (queues, callbacks). At-most-once, at-least-once and exactly-once delivery semantics differ sharply; 'exactly once' is achieved via idempotency + dedup, not magic. Timeouts convert silence into a (possibly wrong) failure decision.",
      engineering: "Make retried operations idempotent (so at-least-once is safe). Bound every wait with a timeout. Prefer async messaging for loose coupling and backpressure. Treat a timeout as 'unknown', not 'failed'.",
      failureModes: "Non-idempotent retries double-applying effects. Unbounded blocking RPCs cascading failures. Assuming exactly-once delivery. Retry storms (thundering herd) on recovery.",
      interviewQs: [
        iq("Why is 'exactly-once delivery' usually an illusion, and what do you do instead?", "The network can lose either the request or the acknowledgment, so a sender that sees no reply must retry — risking duplicates — or give up — risking loss. You can't have exactly-once at the transport. Instead you build exactly-once *effects*: make operations idempotent and deduplicate by a request id, so at-least-once delivery becomes effectively exactly-once."),
      ],
      prerequisites: ["m69"], related: ["m72", "m70", "m60"],
    },
    m72: {
      why: "Partial failure — some components working while others fail — is the defining difficulty of distributed systems. A single machine is all-or-nothing; a cluster is not.",
      intuition: "One node is down, or one link is slow, while everything else runs. The hard part: a healthy node cannot reliably tell whether a silent peer has crashed or is just slow/unreachable.",
      internals: "Because you can't distinguish 'crashed' from 'slow' from 'partitioned' (the core asynchrony problem), systems use timeouts and failure detectors that are necessarily imperfect — they make mistakes (false positives). Protocols must remain correct despite these wrong guesses (e.g., a wrongly-declared-dead leader must not cause split-brain).",
      engineering: "Assume any subset can be down at any time. Design idempotent, retryable operations; use quorums so a minority failing doesn't stop progress; fence off nodes you've declared dead so a 'resurrected' one can't corrupt state.",
      failureModes: "Split-brain when a slow node is wrongly declared dead and a new one takes over. Cascading failures from aggressive timeouts. Operations that assume all-or-nothing execution.",
      interviewQs: [
        iq("Why can't a node reliably tell whether a peer has crashed or is just slow?", "In an asynchronous network there's no bound on message delay, so an absent response could mean the peer crashed, the network dropped the message, or the peer is merely slow — these are indistinguishable from the outside. Systems resort to timeouts, which are heuristics that sometimes wrongly declare a live node dead, so protocols must stay safe even when the failure detector is wrong."),
      ],
      prerequisites: ["m69"], related: ["m73", "m96", "m95"],
    },
    m73: {
      why: "Before a system can react to a failure — fail over, re-replicate, re-elect — it has to detect it. Failure detection is foundational and, in an async network, provably imperfect.",
      intuition: "Watch for signs of life (heartbeats, successful RPCs); if they stop for long enough, suspect the node. 'Long enough' is a guess that trades detection speed against false alarms.",
      internals: "Failure detectors are characterized by completeness (dead nodes are eventually suspected) and accuracy (live nodes aren't wrongly suspected) — in a fully async system you can't have perfect accuracy. Adaptive detectors (e.g., phi-accrual) output a suspicion level from inter-arrival statistics rather than a hard timeout.",
      engineering: "Tune timeouts to your network's tail latency: too short → false positives (needless failovers); too long → slow detection (prolonged outages). Pair detection with fencing so a falsely-suspected node can't cause damage.",
      failureModes: "Aggressive timeouts causing flapping/needless failovers. Lax timeouts delaying recovery. Correlated failures fooling detectors. Detection without fencing → split-brain.",
      interviewQs: [
        iq("What is the fundamental trade-off in setting a failure-detection timeout?", "Detection speed vs accuracy. A short timeout detects real failures fast but wrongly suspects slow-but-live nodes (false positives → needless, risky failovers); a long timeout avoids false alarms but prolongs outages before recovery kicks in. Since async networks preclude a perfect detector, you tune toward your network's tail latency and add fencing to contain mistakes."),
      ],
      prerequisites: ["m72"], related: ["m74", "m63", "m96"],
    },
    m74: {
      why: "Heartbeats are the simplest, most common liveness mechanism: periodic 'I'm alive' signals whose absence triggers failure suspicion and recovery.",
      intuition: "Each node (or a monitor) sends a small message every interval; miss a few in a row and the peer is suspected dead.",
      internals: "A sender emits heartbeats every T; a receiver suspects failure after k missed intervals (timeout ≈ kT). Heartbeats also piggyback leader leases (a leader that stops heart-beating loses leadership) and cluster-membership gossip. The interval/threshold set the detection-latency vs false-positive trade-off.",
      engineering: "Size the interval below your failover tolerance but above normal jitter. Combine with leases so a leader must keep heart-beating to retain authority (preventing a partitioned old leader from acting). Avoid synchronized heartbeat storms.",
      failureModes: "GC pauses or load spikes delaying heartbeats → false death. Too-frequent heartbeats wasting bandwidth. A partitioned leader still 'alive' to one side → split-brain without leases.",
      interviewQs: [
        iq("How do heartbeats and leases prevent a partitioned old leader from causing harm?", "A leader holds a time-bounded lease that it must renew by heart-beating to a quorum. If it's partitioned away from the quorum, it stops receiving renewals and its lease expires, so it voluntarily steps down before a new leader is elected on the other side. Without such a lease, both the old and new leaders could act simultaneously — split-brain."),
      ],
      prerequisites: ["m73"], related: ["m73", "m63", "m96"],
    },
    m76: {
      why: "Multi-leader replication lets more than one node accept writes — good for multi-region latency and offline operation — but it admits concurrent conflicting writes that must be resolved.",
      intuition: "Each region has a writable leader; they replicate to each other asynchronously. Two regions can edit the same record at once, so the system must detect and merge or pick a winner.",
      internals: "Writes apply locally then propagate; conflicting concurrent updates are resolved by a strategy: last-write-wins (by timestamp — can lose data), application merge, or CRDTs (conflict-free types that merge deterministically). Version vectors detect concurrency. There's no single ordering of writes, so strong consistency is sacrificed.",
      engineering: "Use multi-leader for geo-distributed low-latency writes or offline clients, with a conflict strategy you can live with. Avoid it for data needing a single source of truth (balances) unless you add coordination.",
      failureModes: "Lost updates under last-write-wins. Conflict resolution that violates invariants. Replication loops/amplification. Divergent replicas if merge is wrong.",
      interviewQs: [
        iq("What new problem does multi-leader replication introduce, and how is it handled?", "Write conflicts: two leaders can accept concurrent edits to the same key with no global order. Resolution strategies include last-write-wins by timestamp (simple but can silently drop a write), application-specific merge, or CRDTs that merge deterministically without losing data. Version vectors detect which writes were concurrent versus causally ordered."),
      ],
      prerequisites: ["m55"], related: ["m77", "m78", "m81"],
    },
    m77: {
      why: "Synchronous replication makes a commit wait until replicas have the data, so a committed write survives the loss of the primary — strong durability at the cost of latency.",
      intuition: "On commit, the primary blocks until one or more replicas acknowledge the write. The client's success means the data is on multiple nodes.",
      internals: "The primary ships the WAL/log to replicas and waits for W acknowledgments before returning commit. Guarantees no data loss on primary failure (the write is already on a replica) and read-your-writes from synced replicas — but commit latency now includes a round trip, and if replicas are unreachable, writes stall (availability coupling).",
      engineering: "Use for data that must never be lost (financial), often as 'semi-sync' (wait for one replica, not all) to bound the latency/availability hit. Combine with async replicas for read scaling.",
      failureModes: "Write stalls when replicas lag or fail (availability tied to replicas). Higher commit latency. Over-replicating synchronously (waiting for all) amplifying tail latency.",
      interviewQs: [
        iq("What does synchronous replication guarantee, and what does it cost?", "It guarantees a committed write is already on one or more replicas, so a primary failure loses no acknowledged data and synced replicas can serve read-your-writes. The cost is that commit latency includes a replica round trip, and if the required replicas are slow or unreachable, writes stall — availability becomes coupled to replica health. Semi-sync (wait for one of several) softens this."),
      ],
      prerequisites: ["m55"], related: ["m78", "m76", "m64"],
    },
    m78: {
      why: "Asynchronous replication keeps writes fast by not waiting for replicas — the default for read scaling and geo-distribution — at the price of replication lag and possible data loss on failover.",
      intuition: "The primary commits locally and returns immediately; replicas apply the change a little later. Reads from a replica may be slightly stale.",
      internals: "The primary streams its WAL to replicas that apply it in the background; commit doesn't wait. Replication lag (ms to seconds) means a read right after a write can miss it on a replica (no read-your-writes), and an un-replicated tail is lost if the primary dies before shipping it. This is the ShopKart 'order vanishes then reappears' scenario.",
      engineering: "Great for scaling reads and cross-region replicas. For correctness, route read-your-writes to the primary (or a caught-up replica), monitor lag, and accept bounded data-loss on failover or add sync for critical writes.",
      failureModes: "Stale reads violating read-your-writes. Data loss of the un-shipped tail on failover. Unbounded lag under write bursts. Replica falling so far behind it must re-snapshot.",
      interviewQs: [
        iq("What consistency problem does asynchronous replication cause for reads, and how do you fix it?", "Replication lag means a read sent to a replica right after a write may not see that write (no read-your-writes), and the un-replicated tail is lost if the primary fails. Fixes: route a user's post-write reads to the primary for a short window, or pin them to a replica that has applied the client's last write LSN (session/causal consistency), keeping the replica fan-out for everything else."),
      ],
      prerequisites: ["m55"], related: ["m77", "m81", "m80"],
    },
    m80: {
      why: "'Consistency' isn't one thing — it's a spectrum of guarantees about what a read can see. Choosing a consistency model is choosing how much staleness and anomaly your app tolerates for how much performance.",
      intuition: "From strong (every read sees the latest write, as if one copy) to eventual (replicas converge if writes stop), with useful middles: read-your-writes, monotonic reads, causal consistency.",
      internals: "Linearizability (strong) orders all operations on a single timeline — expensive, needs coordination. Causal consistency preserves cause-effect order without a global clock — cheaper, often enough. Eventual consistency only promises convergence. Session guarantees (read-your-writes, monotonic reads/writes) are practical client-centric middles. CAP: under a partition you must drop strong consistency or availability.",
      engineering: "Pick the weakest model that preserves your invariants: strong for balances, causal for comments/feeds, eventual for caches/metrics. Stronger = more coordination = more latency and less availability.",
      failureModes: "Choosing eventual where an invariant needs strong (overselling stock). Assuming linearizability from an async-replicated read. Mixing models and getting surprising anomalies.",
      interviewQs: [
        iq("Give an example where eventual consistency is fine and one where it isn't.", "Fine: a 'like' counter or a product-view count — brief staleness is harmless and replicas converge. Not fine: decrementing inventory on checkout or a bank balance, where two replicas each approving a write on stale data can oversell stock or overdraw an account. Invariants that must hold across concurrent writes need strong consistency or explicit coordination."),
        iq("What is causal consistency and why is it a popular middle ground?", "It guarantees that operations which are causally related (a reply after its message, a read that influenced a write) are seen in that order by all nodes, while concurrent operations may be seen in any order. It rules out the confusing 'effect before cause' anomalies without needing a global total order, so it's much cheaper than linearizability while still feeling intuitive to users."),
      ],
      prerequisites: ["m81"], related: ["m82", "m81", "m64"],
    },
    m82: {
      why: "Strong consistency (linearizability) is the gold standard: the system behaves as if there's a single copy of the data and every operation takes effect atomically at some instant between its start and finish.",
      intuition: "Once a write completes, every subsequent read anywhere sees it (or a newer value). There are no stale reads and no reordering — exactly the single-machine mental model, preserved across replicas.",
      internals: "Achieved via consensus (Raft/Paxos) or synchronous replication with a leader serializing writes and reads going through the committed log. It requires coordination on every operation, so it costs latency and, under a network partition, availability (CAP's CP side). Linearizability is a per-object real-time guarantee; serializability is the multi-object transaction analog.",
      engineering: "Use it where correctness depends on seeing the latest value: leader election, locks, account balances, unique constraints. Confine it to the data that needs it; serve everything else from cheaper models.",
      failureModes: "Latency and throughput cost on every op. Unavailability during partitions. Mistaking 'reads from the leader' for linearizable without going through the log/lease.",
      interviewQs: [
        iq("What does linearizability guarantee, and why does it cost availability under a partition?", "It guarantees every operation appears to take effect atomically at a single point in real time, so a completed write is visible to all later reads — the single-copy illusion. Providing it requires coordinating each operation through a consensus leader/quorum; during a network partition the minority side can't reach a quorum, so to avoid serving stale or conflicting data it must reject requests — sacrificing availability (CAP's CP choice)."),
      ],
      prerequisites: ["m80"], related: ["m80", "m63", "m64"],
    },
    m83: {
      why: "In eventually-consistent, quorum-replicated stores, replicas drift. Read repair fixes staleness opportunistically — on the read path — so frequently-read data self-heals.",
      intuition: "When a read queries several replicas and notices one is behind, it writes the newest value back to the stale replica as a side effect of serving the read.",
      internals: "A coordinator reads from R replicas, compares versions, returns the newest to the client, and asynchronously pushes it to any lagging replica. It repairs only data that gets read (hot keys heal; cold keys don't), so it's paired with anti-entropy for full coverage.",
      engineering: "Cheap and effective for hot data in Dynamo-style systems; combine with background anti-entropy for the long tail. Tune how often (probabilistically) to do it to bound extra writes.",
      failureModes: "Cold keys never repaired (needs anti-entropy). Extra write load on reads. Conflict resolution during repair losing data (last-write-wins). Repair amplifying under skew.",
      interviewQs: [
        iq("What does read repair fix, and what does it miss?", "On a quorum read it detects replicas holding a stale version and writes the newest value back to them, so frequently-read keys converge as a side effect of being read. It misses rarely-read ('cold') keys, which never trigger a repair — so it's paired with background anti-entropy (e.g., Merkle-tree comparison) to converge the data that read repair never touches."),
      ],
      prerequisites: ["m81"], related: ["m84", "m64", "m81"],
    },
    m84: {
      why: "Anti-entropy is the background process that converges replicas regardless of read traffic — the safety net that guarantees eventual consistency actually happens for all data, not just hot keys.",
      intuition: "Replicas periodically compare their data and exchange whatever differs. To avoid shipping everything, they compare compact fingerprints (Merkle trees) and only sync the mismatched ranges.",
      internals: "Each replica builds a Merkle tree (a hash tree over key ranges); two replicas compare roots, then descend only where hashes differ, pinpointing divergent ranges in log time and transferring just those. Gossip spreads updates epidemically. This bounds convergence time independent of whether keys are read.",
      engineering: "Schedule anti-entropy to balance convergence speed against I/O/network cost; it's the complement to read repair (hot path) and hinted handoff (temporary failures). Essential for cold data.",
      failureModes: "Expensive full comparisons without Merkle trees. Anti-entropy I/O competing with live traffic. Slow convergence if run too rarely. Conflict resolution still needed when values differ.",
      interviewQs: [
        iq("How do Merkle trees make anti-entropy efficient?", "Each replica hashes its key ranges into a tree. Two replicas compare root hashes; if equal, they're identical and nothing transfers. If not, they recurse only into subtrees whose hashes differ, pinpointing the exact divergent ranges in logarithmic comparisons and transferring just those keys — instead of streaming and comparing the entire dataset."),
      ],
      prerequisites: ["m83"], related: ["m83", "m81", "m64"],
    },
    m85: {
      why: "Vertical partitioning splits a table by columns (or splits a schema by feature) rather than by rows — isolating hot columns, big blobs, or independent services.",
      intuition: "Put frequently-accessed columns in one store and rarely-used or large ones in another, so common queries read narrower rows; or give each service its own tables.",
      internals: "Row-store column splitting keeps hot, narrow columns together (more rows per page, faster scans) and moves cold/large columns aside (referenced by key). At the schema level, vertical partitioning underlies service-oriented data ownership. Contrast with horizontal partitioning (sharding) which splits rows.",
      engineering: "Use it to keep hot-path rows small (better cache density) and to decouple services. The cost is a join/extra fetch when you need the split-off columns together.",
      failureModes: "Needing both partitions per query (join overhead negating the benefit). Over-splitting creating chatty access. Confusing it with sharding (which splits rows for scale).",
      interviewQs: [
        iq("How does vertical partitioning differ from horizontal partitioning (sharding)?", "Vertical partitioning splits a table by columns — separating hot/narrow columns from cold/large ones (or splitting schema by service) so common queries read smaller rows. Horizontal partitioning (sharding) splits by rows across nodes to scale capacity and throughput. Vertical is about access-pattern locality on (often) one node; horizontal is about distributing load and data volume."),
      ],
      prerequisites: ["m62"], related: ["m86", "m87", "m27"],
    },
    m86: {
      why: "Hash partitioning spreads rows across shards by hashing the partition key — the default way to get even load distribution and avoid hotspots.",
      intuition: "shard = hash(key) mod N. Similar keys scatter to different shards, so load is balanced, but ordering is lost — you can't do a range scan without hitting every shard.",
      internals: "A hash function maps keys uniformly to shards, giving good balance for skewed keys. The downside: adjacent keys land on different shards, so range queries become scatter-gather. Naive mod-N rebalances almost everything when N changes — consistent hashing (with virtual nodes) fixes that by moving only ~1/N of keys.",
      engineering: "Use hash partitioning when access is by exact key and you want even load (user_id, order_id). Avoid it when you need range scans on the partition key. Prefer consistent hashing so adding a node doesn't reshuffle everything.",
      failureModes: "Range queries forced to scatter-gather. mod-N rebalancing moving nearly all data on resize. Hash skew from a low-cardinality or heavily-repeated key. Still hot if one key is extremely popular.",
      interviewQs: [
        iq("Why is naive hash(key) mod N partitioning problematic when you add a node, and what fixes it?", "Changing N changes almost every key's (hash mod N) result, so adding one node reshuffles nearly the whole dataset — a massive rebalancing storm. Consistent hashing fixes this: keys and nodes are placed on a hash ring and a key belongs to the next node clockwise, so adding a node only moves the keys between it and its predecessor (~1/N of the data). Virtual nodes smooth the distribution further."),
      ],
      prerequisites: ["m62"], related: ["m87", "m88", "m90"],
    },
    m87: {
      why: "Range partitioning assigns contiguous key ranges to shards, preserving order so range scans stay efficient — at the risk of hotspots when load concentrates in one range.",
      intuition: "Shard A holds keys 1–1000, B holds 1001–2000, and so on. A range query touches only the shards covering that range; sequential inserts, though, all hit the last shard.",
      internals: "A partition map records range boundaries; lookups and range scans route to the owning shard(s), keeping ordered access cheap. Splits/merges adjust boundaries as data grows (like a distributed B-tree). The classic hazard: monotonic keys (timestamps, auto-increment ids) send all new writes to one shard — a write hotspot.",
      engineering: "Use range partitioning when range/ordered queries matter (time-series, scans). Avoid monotonic partition keys for writes, or salt/prefix them to spread inserts. Watch for uneven range sizes needing split/merge.",
      failureModes: "Write hotspot on the latest range under monotonic keys. Uneven ranges (some shards huge). Rebalancing via split/merge adding overhead. Range queries spanning many shards.",
      interviewQs: [
        iq("Range vs hash partitioning — what do you gain and lose with each?", "Range partitioning preserves key order, so range/ordered scans touch only the relevant shards — but monotonic keys concentrate writes on one shard (hotspot) and ranges can grow unevenly. Hash partitioning spreads load evenly and avoids write hotspots — but destroys ordering, so range queries become scatter-gather. Choose by whether your workload is range-oriented or exact-key-oriented."),
      ],
      prerequisites: ["m62"], related: ["m86", "m88", "m90"],
    },
    m88: {
      why: "Virtual nodes make consistent hashing practical: instead of one ring position per server, each server owns many small 'vnodes', smoothing load and making rebalancing incremental.",
      intuition: "Give each physical node hundreds of random ring positions. Keys spread more evenly, and adding/removing a node moves many small slices from/to many peers rather than one big slice from one neighbor.",
      internals: "With one token per node, hash-ring load is lumpy and a leaving node dumps its whole range on one successor. Virtual nodes (vnodes) assign each physical node V ring tokens, so load variance drops ~1/√V and a node's data is spread across many peers — making rebalancing fast, parallel and even. Heterogeneous nodes get more vnodes to carry more load.",
      engineering: "Vnodes are standard in Dynamo/Cassandra-style systems. Pick V to balance smoothness against metadata overhead. They enable graceful scale-out and faster recovery (many peers each stream a small share).",
      failureModes: "Too few vnodes → lumpy load; too many → metadata/overhead. Rebalancing still moves data (just more evenly). Token assignment bugs causing imbalance.",
      interviewQs: [
        iq("Why do consistent-hashing systems use virtual nodes?", "With one ring token per server, load is uneven and removing a node dumps its entire key range onto a single successor (and adding one steals a big range from one neighbor). Giving each server many virtual tokens spreads its data across many peers, so load is smoother and rebalancing moves many small slices in parallel across the cluster — faster, more even scale-out and recovery. Heterogeneous capacity is handled by assigning more vnodes to bigger servers."),
      ],
      prerequisites: ["m86"], related: ["m86", "m89", "m90"],
    },
    m89: {
      why: "Rebalancing moves partitions when the cluster changes — nodes added, removed or failed — to keep load even. How it's done determines whether scaling is smooth or an outage.",
      intuition: "When topology changes, some data must move to new owners. Good rebalancing moves the minimum amount, in the background, without overloading the network or the nodes involved.",
      internals: "Strategies: fixed partition count (many more partitions than nodes; assign whole partitions to nodes — move partitions, not re-hash keys), dynamic partitioning (split/merge by size, like HBase), and consistent hashing with vnodes (move ~1/N on change). Rebalancing should be incremental and throttled, and ideally automatic but with a human in the loop for safety.",
      engineering: "Prefer 'move whole partitions' designs so rebalancing never re-hashes every key. Throttle data movement to protect live traffic. Make it observable and reversible; automatic rebalancing + a flaky node can cascade.",
      failureModes: "Rebalancing storms saturating the network. Moving too much data (mod-N designs). Automatic rebalancing reacting to a transient failure and thrashing. Hot partitions that rebalancing alone can't fix (need splitting).",
      interviewQs: [
        iq("How do you rebalance without re-hashing the entire dataset when adding a node?", "Decouple partitions from nodes: create many more fixed partitions than nodes and assign whole partitions to nodes. Adding a node just reassigns some existing partitions to it — their keys don't change, only ownership — so you move ~1/N of the data and never re-hash everything. Consistent hashing with virtual nodes achieves the same minimal-movement property on a ring."),
      ],
      prerequisites: ["m88"], related: ["m88", "m90", "m62"],
    },
    m90: {
      why: "Even with good partitioning, a single key or range can attract disproportionate traffic — a hot partition — bottlenecking one node while others idle. Handling skew is a core scaling problem.",
      intuition: "A celebrity user, a trending product, or the newest time-range gets far more load than its share. The shard that owns it saturates; adding nodes doesn't help because the load is on one key.",
      internals: "Skew defeats uniform partitioning because the unit of distribution (a key/range) is itself overloaded. Mitigations: split the hot key (salting — append a random suffix to spread writes, then gather on read), add a caching layer in front, replicate the hot partition for reads, or isolate it on dedicated capacity. Range schemes also hotspot on monotonic keys.",
      engineering: "Detect hotspots via per-partition metrics. For hot writes, salt the key; for hot reads, cache or add read replicas. Design partition keys to avoid predictable concentration (don't shard purely by timestamp).",
      failureModes: "One shard at 100% while the cluster is idle. Salting complicating reads (must query all salts). Cache stampedes on a hot key. Monotonic keys hotspotting the latest range.",
      interviewQs: [
        iq("A single popular key is overloading one shard — how do you fix it?", "You can't fix single-key skew by adding shards, because the load is on one key. Options: split the hot key by salting (append a random prefix/suffix so writes spread across N sub-keys, then fan-in on read), put a cache in front of hot reads, replicate that partition across nodes for read scaling, or isolate it on dedicated capacity. The right mix depends on whether the hotspot is reads or writes."),
      ],
      prerequisites: ["m62"], related: ["m86", "m87", "m89"],
    },
    m92: {
      why: "Three-phase commit tries to fix two-phase commit's blocking problem by adding a phase so a recovering coordinator/participant can make progress — illustrating why non-blocking atomic commit is hard.",
      intuition: "2PC can block forever if the coordinator dies after participants vote 'yes' but before the commit decision arrives. 3PC inserts a 'prepared-to-commit' phase so survivors can infer and complete the decision.",
      internals: "3PC splits commit into canCommit → preCommit → doCommit. The extra preCommit phase means that if the coordinator fails, participants that reached preCommit know the outcome was 'commit' and can finish, giving non-blocking behavior under the synchronous, fail-stop model. But it's not safe under network partitions (it can commit on one side and abort on another), so real systems use consensus (Paxos/Raft)-based commit instead.",
      engineering: "3PC is mostly of theoretical/teaching value: its assumptions (bounded delay, no partitions) don't hold in practice, so production systems favor Paxos/Raft-backed commit or careful 2PC with timeouts and recovery.",
      failureModes: "Unsafe under network partitions (can violate atomicity). Extra round trip cost. Still relies on timing assumptions. Rarely used in practice.",
      interviewQs: [
        iq("What problem does 3PC try to solve over 2PC, and why isn't it used?", "2PC blocks if the coordinator crashes after participants vote yes but before they learn the decision — they're stuck holding locks with no way to decide. 3PC adds a preCommit phase so survivors can infer the outcome and finish without the coordinator (non-blocking) — but only under synchronous, partition-free assumptions. Under real network partitions 3PC can commit on one side and abort on another, violating atomicity, so production systems use consensus-based commit instead."),
      ],
      prerequisites: ["m60"], related: ["m60", "m93", "m95"],
    },
    m93: {
      why: "Consensus — getting a set of nodes to agree on a single value despite failures — is the foundation of fault-tolerant distributed systems: leader election, replicated logs, atomic commit and locks all reduce to it.",
      intuition: "Many nodes propose; all must decide on one value, and once decided it never changes, even as nodes crash and recover. Achieved by majority agreement so decisions survive minority failures.",
      internals: "A consensus protocol must satisfy agreement (all decide the same), validity (the value was proposed) and termination (they eventually decide). FLP proves deterministic consensus is impossible in a fully async system with even one failure — so practical protocols (Paxos, Raft) use timeouts/leaders to make progress when the network is well-behaved while never violating safety. A majority quorum ensures any two decisions overlap.",
      engineering: "Don't build consensus yourself; use a proven implementation (Raft libraries, etcd/ZooKeeper). Keep the consensus group small (3–5) for latency; put only metadata/critical state through it, not high-volume data.",
      failureModes: "Rolling your own and getting safety wrong. Large consensus groups → high latency. Routing bulk data through consensus. Losing quorum → no progress (by design).",
      interviewQs: [
        iq("What does the FLP result say, and how do real consensus protocols cope?", "FLP proves that in a fully asynchronous network, no deterministic protocol can guarantee consensus if even one node may fail — you can't always distinguish a slow node from a dead one, so termination can't be guaranteed. Real protocols (Paxos, Raft) sidestep it by relying on timeouts/leader election for *liveness* (progress when the network behaves) while never sacrificing *safety* (they never decide two different values), so they're always correct and usually live."),
        iq("Why must a consensus decision be backed by a majority quorum?", "Because any two majorities of the same set overlap in at least one node, so a value decided by one majority is known to a node in every future majority — preventing two different decisions. Majorities also let the system keep deciding while a minority is down, giving fault tolerance of f failures with 2f+1 nodes."),
      ],
      prerequisites: ["m79"], related: ["m63", "m79", "m60"],
    },
    m94: {
      why: "Raft is the consensus algorithm most engineers actually meet (etcd, Consul, CockroachDB). It was designed for understandability, decomposing consensus into leader election, log replication and safety.",
      intuition: "One elected leader per term takes all writes, replicates them to followers, and commits an entry once a majority stores it. Terms and the up-to-date voting rule keep the log consistent across leader changes.",
      internals: "Time is divided into terms, each with at most one leader. A follower that times out becomes a candidate, increments the term and requests votes, granted only if its log is at least as up-to-date — guaranteeing a new leader has all committed entries. The leader replicates entries and advances commitIndex when a majority (and the current term) holds them. See the interactive Raft lab.",
      engineering: "Use a battle-tested Raft library rather than reimplementing. Keep the group at 3 or 5 nodes; co-locate for low election timeouts; snapshot the log to bound its growth. Raft gives you a linearizable replicated log to build on.",
      failureModes: "Reimplementation bugs. Flapping leaders from too-short election timeouts under load. Large groups raising commit latency. Unbounded log without snapshots.",
      interviewQs: [
        iq("How does Raft guarantee a newly elected leader has all committed entries?", "By the election restriction: a voter grants its vote only if the candidate's log is at least as up-to-date (higher last term, or same term and ≥ index) as its own. A committed entry is on a majority; any winning candidate needs votes from a majority; those majorities intersect, and the overlapping voter won't vote for a candidate missing that entry — so the winner necessarily has every committed entry, and committed data is never lost across leader changes."),
      ],
      prerequisites: ["m63"], related: ["m63", "m93", "m96"],
    },
    m95: {
      why: "A network partition — the cluster splits into groups that can't talk — is the failure that forces the CAP choice. How a system behaves when partitioned defines its consistency/availability character.",
      intuition: "A link failure cuts the cluster in two. Each side sees the other as 'dead'. Do you let both sides keep serving (risking divergence) or make the minority stop (losing availability)?",
      internals: "Under a partition you cannot have both consistency and availability (CAP): a CP system makes the minority side reject requests (no quorum → unavailable but consistent); an AP system lets both sides serve and reconciles later (available but temporarily inconsistent). Quorum/consensus systems are CP — only the majority side makes progress; the minority can't elect a leader or commit.",
      engineering: "Decide per-dataset: CP for data needing correctness (balances, locks — use consensus), AP for data needing availability (shopping carts, feeds — use conflict-free merge). Make the partition behavior explicit and test it (chaos/partition injection).",
      failureModes: "Split-brain if both sides keep writing without coordination. Minority-side outages (the correct CP behavior, but surprising). Silent divergence in AP systems with bad conflict resolution.",
      interviewQs: [
        iq("During a network partition, what choice does CAP force, and how does a quorum system behave?", "CAP says under a partition you must sacrifice either consistency or availability. A quorum/consensus (CP) system keeps consistency: only the side with a majority can elect a leader and commit, so the minority side rejects writes (and often reads) — unavailable but never divergent. An AP system keeps availability: both sides serve and the data is reconciled after the partition heals, accepting temporary inconsistency."),
      ],
      prerequisites: ["m80"], related: ["m96", "m82", "m64"],
    },
    m96: {
      why: "Split-brain is the dangerous failure where two nodes both believe they're the leader/primary and both accept writes — leading to divergent, conflicting state. Preventing it is a core job of coordination protocols.",
      intuition: "A partition isolates the leader; the other side elects a new one; now two leaders write independently. When the network heals, their histories conflict and data is lost or corrupted.",
      internals: "Prevented by requiring a majority quorum to lead (two majorities can't exist simultaneously, so at most one leader) and by fencing: a new leader gets a higher epoch/term, and storage/peers reject writes stamped with an older epoch — so a partitioned old leader that returns is ignored. Leases (time-bounded leadership) make an isolated leader step down before its lease expires.",
      engineering: "Never allow leadership on a minority. Use fencing tokens (monotonic epoch) at the storage layer so a stale leader's writes are rejected. Combine quorum + lease + fencing; don't rely on failure detection alone.",
      failureModes: "Two leaders writing during a partition → divergence. A resurrected old leader corrupting state without fencing. Fencing missing at the storage layer. Leases without clock-skew bounds.",
      interviewQs: [
        iq("How do systems prevent split-brain (two active leaders)?", "Three layers: (1) require a majority quorum to become leader, so two leaders can't coexist (two majorities would overlap); (2) fencing tokens — each leadership gets a higher monotonic epoch, and storage/peers reject writes carrying an older epoch, so a returning stale leader is ignored; (3) time-bounded leases, so a partitioned leader stops acting before its lease expires. Quorum + fencing + leases together, not failure detection alone."),
      ],
      prerequisites: ["m95"], related: ["m63", "m74", "m95"],
    },
    m97: {
      why: "After nodes crash, partitions heal, or leaders change, a distributed database must reconcile — recover committed state, discard uncommitted, and bring stale replicas back in sync — without losing or duplicating data.",
      intuition: "Recovery combines single-node crash recovery (WAL replay per node) with distributed reconciliation: a rejoining node catches up from the leader's log; conflicting histories are resolved by the commit rules.",
      internals: "Each node recovers locally via its WAL (redo committed, undo uncommitted). A rejoining follower catches up by log shipping/snapshots from the current leader, truncating any uncommitted tail that conflicts (Raft log reconciliation). Consensus guarantees committed entries survive; uncommitted ones from a deposed leader are overwritten. Anti-entropy/read-repair converge eventually-consistent replicas.",
      engineering: "Lean on the protocol's guarantees: with Raft, a recovered node safely re-syncs from the leader and can't resurrect stale writes (fencing by term). Snapshot to bound catch-up time. Make recovery idempotent and observable.",
      failureModes: "A recovered node serving stale reads before catching up. Un-fenced old leader reintroducing overwritten writes. Slow catch-up without snapshots. Conflicting histories resolved incorrectly.",
      interviewQs: [
        iq("When a crashed follower rejoins a Raft cluster, how does it recover without corrupting the log?", "It first recovers its own state locally via its WAL, then rejoins as a follower and the current leader brings it up to date via AppendEntries (or a snapshot): any uncommitted tail in the follower's log that conflicts with the leader is overwritten, and missing committed entries are shipped over. Because leadership is fenced by term, the stale node can't act as leader or reintroduce overwritten writes, so committed data is preserved and divergence is repaired."),
      ],
      prerequisites: ["m53"], related: ["m63", "m95", "m54"],
    },
  };
  Object.assign(C, D);

  /* ── Production Engineering (systems / DDIA-style) ──────────────────── */
  var P = {
    m98: {
      why: "Replication copies data to multiple nodes for fault tolerance, read scaling and locality. The three models — single-leader, multi-leader, leaderless — are the menu, each with distinct consistency and conflict trade-offs.",
      intuition: "Who can accept writes? One node (single-leader: simple, linear), several (multi-leader: low-latency multi-region, conflicts), or any node via quorums (leaderless: highly available, needs read-repair).",
      internals: "Single-leader: all writes to one leader, replicated to followers (sync or async) — no write conflicts, but a failover gap. Multi-leader: multiple writable leaders replicate to each other — conflict resolution required. Leaderless (Dynamo): clients write to many replicas, read from a quorum, with read-repair/anti-entropy — R+W>N tunes consistency. Each trades consistency for availability/latency differently.",
      engineering: "Default to single-leader for correctness; add async read replicas for scale. Reach for multi-leader only for multi-region write latency or offline, and leaderless for extreme availability with conflict-tolerant data.",
      failureModes: "Single-leader failover window/data loss (async). Multi-leader write conflicts. Leaderless stale reads if R+W≤N. Picking a model that fights the workload.",
      interviewQs: [
        iq("Compare single-leader, multi-leader and leaderless replication.", "Single-leader routes all writes through one node — no conflicts, strong-ish consistency, but a failover gap and one write bottleneck. Multi-leader accepts writes at several nodes for low-latency/multi-region writes, at the cost of resolving concurrent conflicts. Leaderless (quorum) lets any replica take writes and uses R/W quorums plus read-repair for high availability, tuning consistency via R+W>N. The axis is: fewer write points = simpler consistency; more = better availability/latency but conflict handling."),
      ],
      prerequisites: ["m55"], related: ["m76", "m77", "m64"],
    },
    m99: {
      why: "Partitioning strategy decides how data (and load) spreads across nodes. The choice — key-range, hash, or directory — determines which queries stay cheap and whether you get hotspots.",
      intuition: "Range keeps order (good scans, risk of monotonic-write hotspots); hash spreads evenly (good balance, no ranges); directory/lookup maps keys to shards explicitly (flexible, needs a maintained map).",
      internals: "Range partitioning routes by key boundaries (ordered scans cheap, but sequential keys hotspot one shard). Hash partitioning (ideally consistent hashing + vnodes) balances load but loses order. A lookup/directory service stores an explicit key→partition map, allowing arbitrary placement and easy rebalancing at the cost of a metadata layer. Secondary indexes add local vs global partitioning choices.",
      engineering: "Match the strategy to your dominant query: hash for exact-key/even-load, range for time-series/scans (salt monotonic keys), directory when you need flexible placement. Keep many more partitions than nodes so rebalancing moves whole partitions.",
      failureModes: "Monotonic-key hotspots (range). Lost range queries (hash). Directory as a bottleneck/SPOF. Secondary-index fan-out (scatter-gather reads or write amplification).",
      interviewQs: [
        iq("How do secondary indexes complicate partitioning?", "You must choose local or global secondary indexes. A local (document-partitioned) index lives with its partition's data: writes are cheap (one partition), but a query on the indexed field must scatter-gather across all partitions. A global (term-partitioned) index is partitioned by the indexed value: reads hit one partition, but a single write may update index entries on several partitions — trading read efficiency for write cost and cross-partition consistency."),
      ],
      prerequisites: ["m62"], related: ["m86", "m87", "m89"],
    },
    m100: {
      why: "Transactions guarantee all-or-nothing, but across shards or services that guarantee is expensive and partition-sensitive. Scaling transactions means choosing between distributed commit and looser patterns like sagas.",
      intuition: "A cross-shard transaction needs every participant to agree to commit (atomic commit). When that's too costly or unavailable, break the work into a saga: a sequence of local transactions with compensating undo steps.",
      internals: "Two-phase commit gives atomicity across participants but blocks if the coordinator fails and couples availability. Consensus-backed commit (Paxos/Raft commit, as in Spanner/Cockroach) makes it fault-tolerant but still costs cross-node round trips. Sagas trade atomicity+isolation for availability: each step commits locally and failures trigger compensating transactions — eventual consistency with application-managed rollback. Idempotency and outbox patterns keep effects exactly-once.",
      engineering: "Keep transactions single-shard whenever possible (choose keys accordingly). For genuinely cross-service workflows, prefer sagas with idempotent steps and an outbox; reserve distributed ACID for the few cases that truly need it.",
      failureModes: "2PC coordinator blocking. Cross-shard latency. Sagas exposing intermediate states (no isolation). Compensations that can't truly undo (sent email). Non-idempotent steps double-applying.",
      interviewQs: [
        iq("When would you use a saga instead of a distributed (2PC) transaction?", "When spanning multiple services/shards where blocking 2PC's availability coupling is unacceptable, or where participants can't hold locks across a long workflow. A saga runs each step as a local transaction and, on failure, invokes compensating transactions to undo prior steps — giving availability and loose coupling at the cost of atomicity/isolation (intermediate states are visible). It requires idempotent steps and compensations, and tolerating eventual consistency."),
      ],
      prerequisites: ["m60"], related: ["m60", "m48", "m93"],
    },
    m101: {
      why: "Consistency guarantees and consensus are two sides of a coin: providing strong consistency (linearizability) across replicas requires agreement, and agreement is what consensus delivers. This ties the whole distributed stack together.",
      intuition: "To make replicas look like one copy, writes must be totally ordered — and getting nodes to agree on that order, despite failures, is consensus. Linearizable storage, leader election and atomic commit all reduce to it.",
      internals: "Linearizability ⇔ total order of operations agreed by a majority (consensus). A replicated state machine applies a consensus-ordered log identically on every node, yielding a consistent, fault-tolerant service — the pattern behind etcd/ZooKeeper and distributed SQL. Weaker models (causal, eventual) need less coordination and so are cheaper and more available, which is the lever you actually pull.",
      engineering: "Put only the data that needs strong consistency through consensus (metadata, locks, leadership); serve the rest from cheaper models. Use a replicated-state-machine library rather than hand-rolling. Expect latency proportional to a quorum round trip for linearizable ops.",
      failureModes: "Routing high-volume data through consensus (latency/throughput collapse). Assuming replicas are linearizable when they're async. Over-strong defaults harming availability under partitions.",
      interviewQs: [
        iq("Why is linearizable storage essentially a consensus problem?", "Making many replicas behave as a single copy requires every node to agree on one total order of operations; once a value is 'decided', it must never change even as nodes fail — which is exactly the agreement, validity and stability consensus provides. A replicated state machine applies the consensus-ordered log identically everywhere, so linearizable services are built directly on consensus (Paxos/Raft), and their cost is a quorum round trip per operation."),
      ],
      prerequisites: ["m93"], related: ["m82", "m63", "m80"],
    },
    m102: {
      why: "Batch processing crunches large, bounded datasets (ETL, analytics, model training) with high throughput and simple fault tolerance — the workhorse of offline data pipelines.",
      intuition: "Read a big fixed input, transform it in parallel across many machines, write a big output. No low-latency requirement, so you optimize for throughput and easy retries.",
      internals: "The MapReduce model: partition input, run map tasks in parallel, shuffle by key, run reduce tasks, write output. Fault tolerance is cheap because inputs are immutable — just re-run a failed task. Modern engines (Spark) keep intermediate data in memory and model the job as a DAG of transformations, but the principles (partitioning, shuffle, deterministic re-execution) are the same.",
      engineering: "Use batch for periodic, throughput-bound work over complete datasets (nightly rollups, reindexing). Immutable inputs make it reproducible and idempotent. The shuffle (data movement by key) is the usual bottleneck — minimize it.",
      failureModes: "Shuffle/network bottlenecks. Skewed keys creating straggler reducers. Latency (hours) unsuitable for real-time needs. Non-deterministic jobs breaking re-execution.",
      interviewQs: [
        iq("Why is fault tolerance simpler in batch processing than in online systems?", "Because inputs are immutable and bounded, and tasks are deterministic: if a worker fails, the framework just re-runs that task on another node from the same input and gets the same result — no need to track partial mutable state. Immutability plus deterministic re-execution turns fault recovery into 'retry', which is far simpler than recovering mutable online state."),
      ],
      prerequisites: ["m01"], related: ["m103", "m104", "m109"],
    },
    m103: {
      why: "Stream processing handles unbounded, continuously-arriving data with low latency — powering real-time analytics, monitoring, fraud detection and event-driven pipelines where waiting for a batch is too slow.",
      intuition: "Process events as they arrive, one at a time or in small windows, maintaining running state. The data never 'ends', so you compute incrementally and define windows over time.",
      internals: "Streams are processed as records flow in; operators keep state (counts, joins, aggregates) in a fault-tolerant store with periodic checkpoints. Key hard problems: event-time vs processing-time (events arrive late/out of order), windowing (tumbling/sliding/session), and watermarks (how long to wait for stragglers). Exactly-once effects come from idempotency + checkpointed offsets, not from the transport.",
      engineering: "Use streaming for low-latency, continuous computation; design windows around event time with watermarks for late data. Checkpoint state for recovery. Expect a correctness/latency trade-off: wait longer for completeness, or emit early and revise.",
      failureModes: "Out-of-order/late events corrupting windows without watermarks. Unbounded state growth. Reprocessing semantics (duplicates) without idempotency. Backpressure when consumers lag producers.",
      interviewQs: [
        iq("What is the difference between event time and processing time, and why does it matter?", "Event time is when an event actually occurred; processing time is when the system handles it. They diverge because events arrive late, out of order, or in bursts (network delays, offline devices). Windowed computations must use event time to be correct (e.g., 'sales in the 3pm hour' means events timestamped 3pm, not processed then), and watermarks bound how long to wait for stragglers before closing a window — trading latency for completeness."),
      ],
      prerequisites: ["m102"], related: ["m104", "m107", "m109"],
    },
    m104: {
      why: "An append-only event log (Kafka-style) is the backbone of modern data systems: an ordered, durable, replayable record of everything that happened, used as a message bus and a source of truth.",
      intuition: "Instead of mutating state in place, append immutable events to an ordered log; consumers read the log at their own pace and rebuild whatever views they need. The log is the ledger; everything else is a projection.",
      internals: "The log is a partitioned, ordered, durable sequence of records. Each consumer tracks its own offset, so many consumers read independently and can replay from any point. Partitions give parallelism and per-key ordering; replication gives durability. Because events are immutable and ordered, the log is both a reliable message queue and a rebuildable system of record — the basis of event sourcing and CDC.",
      engineering: "Use the log to decouple producers from consumers, to replay/rebuild derived stores, and to integrate many systems from one source. Choose partition keys for ordering+parallelism. Retention and compaction control how much history you keep.",
      failureModes: "Hot partitions from a skewed key. Ordering only within a partition (not globally). Unbounded retention cost. Consumers falling behind (lag). Schema evolution breaking old consumers.",
      interviewQs: [
        iq("Why is an append-only log a powerful foundation for data systems?", "Because it's immutable, ordered and replayable: it serves as a durable message bus (many consumers read independently at their own offsets) and as a system of record from which any derived view can be rebuilt by replaying events. Immutability makes it reliable and auditable; per-partition ordering plus consumer offsets decouple producers from consumers and enable reprocessing — which is why it underpins event sourcing, CDC and stream processing."),
      ],
      prerequisites: ["m103"], related: ["m107", "m105", "m109"],
    },
    m105: {
      why: "Derived data is any dataset computed from a source of truth: indexes, caches, materialized views, search indexes, aggregates. Keeping the source authoritative and everything else derived makes systems simpler and recoverable.",
      intuition: "Pick one system of record; treat every other representation (a search index, a cache, a rollup) as a function of it that can be recomputed. If a derived store is lost or wrong, rebuild it from the source.",
      internals: "Derived stores are updated by a deterministic transformation of the source — synchronously (triggers), via CDC/event streams, or by batch recomputation. Because they're functions of the source, they can be rebuilt (disaster recovery, schema change, new view) by replaying the source log. This is the 'log as source of truth, views as projections' pattern.",
      engineering: "Be explicit about which store is authoritative. Update derived data via a stream/CDC pipeline so it's eventually consistent and rebuildable. Never let two stores each think they're the source — that's how data diverges.",
      failureModes: "Ambiguous ownership (two sources of truth) → divergence. Derived store drifting from source (missed updates). Expensive full rebuilds without incremental updates. Stale caches served as truth.",
      interviewQs: [
        iq("Why distinguish a 'system of record' from 'derived data'?", "Because it removes ambiguity about which copy is authoritative and makes everything else recoverable. The system of record holds the canonical state; indexes, caches, materialized views and search indexes are deterministic functions of it, updated via CDC/streams and rebuildable by replaying the source. If a derived store is lost or corrupted, you recompute it — whereas two stores each believing they're authoritative inevitably diverge with no way to reconcile."),
      ],
      prerequisites: ["m104"], related: ["m104", "m107", "m108"],
    },
    m106: {
      why: "Real organizations run many specialized stores (OLTP DB, search index, cache, warehouse, queue). Data integration is the problem of keeping them consistent — and the event log is the modern answer.",
      intuition: "Rather than point-to-point syncs between every pair of systems (N² spaghetti), funnel all changes through one ordered log that each system consumes to update itself.",
      internals: "Writing to N systems directly is unreliable (partial failures, no ordering, no atomicity). Capturing changes once (CDC) into an ordered log and letting each downstream system consume it gives a single, replayable integration backbone with consistent ordering and the ability to add new consumers/rebuild stores. This turns N² integrations into N log subscriptions.",
      engineering: "Make the primary database's change stream (CDC) the integration point; derive search/cache/warehouse from it. Use the outbox pattern to publish events atomically with the DB write. Add new systems by subscribing, not by writing a new sync.",
      failureModes: "Dual writes (app writes DB and queue separately) losing consistency on partial failure. Point-to-point integrations that don't scale. Ordering/replay gaps. Schema drift across consumers.",
      interviewQs: [
        iq("Why use a change-event log for data integration instead of writing to each system directly?", "Writing to multiple systems directly (dual writes) has no atomicity or ordering — a partial failure leaves them inconsistent, and every new system means another bespoke sync (N² problem). Capturing changes once into an ordered, durable log that each system consumes gives consistent ordering, reliable replay, and single-point extensibility: adding a consumer or rebuilding a store is just another subscription. The outbox pattern makes publishing atomic with the source write."),
      ],
      prerequisites: ["m104"], related: ["m107", "m104", "m105"],
    },
    m107: {
      why: "Change Data Capture turns a database's writes into an event stream — the bridge that lets the operational database feed search indexes, caches, warehouses and other services in near real time.",
      intuition: "Tap the database's own change record (its WAL/replication log) and emit each insert/update/delete as an event, so downstream systems learn about every change without polling.",
      internals: "CDC reads the transaction log (logical decoding of the WAL / binlog) rather than querying tables, so it captures every committed change in commit order with low overhead and no missed updates. Tools (Debezium) publish these to a log (Kafka). Combined with the outbox pattern, it gives exactly-once, ordered propagation of changes and makes the database the single source of truth for derived data.",
      engineering: "Prefer log-based CDC over query-based polling (no missed changes, lower load, ordered). Use it to keep caches/search/warehouses fresh and to migrate or integrate systems. Mind schema evolution and initial snapshots for new consumers.",
      failureModes: "Query-based CDC missing deletes/intermediate updates. Snapshot + stream handoff gaps. Schema changes breaking decoders. Large transactions causing bursts. Replication-slot bloat if a consumer stalls.",
      interviewQs: [
        iq("Why is log-based CDC better than polling tables for changes?", "Polling (SELECT … WHERE updated_at > x) misses deletes and intermediate updates between polls, adds query load, and can't guarantee ordering. Log-based CDC reads the database's own write-ahead/replication log, so it captures every committed insert/update/delete exactly once, in commit order, with minimal overhead — turning the DB's durable change record into a reliable, ordered event stream for downstream systems."),
      ],
      prerequisites: ["m47"], related: ["m104", "m106", "m105"],
    },
    m108: {
      why: "A materialized view precomputes and stores a query's result so reads are instant, trading storage and update cost for query speed — essential when a query is too expensive to run per request.",
      intuition: "Run the expensive aggregation/join once, save the result, and serve reads from it. When the underlying data changes, refresh the view (fully or incrementally).",
      internals: "Unlike a regular view (a stored query re-run each time), a materialized view stores actual rows. Refresh strategies: full recompute (simple, expensive), incremental/eager maintenance (apply deltas as base data changes — fast reads, complex maintenance), or stream-maintained (a stream processor keeps it current from a change log). The trade-off is read latency vs freshness vs maintenance cost.",
      engineering: "Use for dashboards, rollups and expensive joins read far more than written. Choose refresh by freshness need: periodic for tolerant cases, incremental/streaming for near-real-time. It's a form of derived data — rebuildable from the source.",
      failureModes: "Staleness between refreshes. Expensive full refreshes. Incremental maintenance complexity/bugs. Storage cost. Serving a stale view as if live.",
      interviewQs: [
        iq("What's the difference between a view and a materialized view, and when do you use each?", "A regular view is just a saved query re-executed on every read — always fresh, no storage, but pays the full query cost each time. A materialized view stores the precomputed result, so reads are fast, but it must be refreshed (fully, incrementally, or via a stream) and can be stale between refreshes. Use a materialized view when an expensive aggregation/join is read far more often than the base data changes and some staleness is acceptable."),
      ],
      prerequisites: ["m105"], related: ["m105", "m23", "m103"],
    },
    m109: {
      why: "Dataflow architecture models a system as data moving through a pipeline of transformations rather than services mutating shared state — the mental model behind streams, derived data and event-driven systems.",
      intuition: "Think in flows: events enter, pass through stateless/stateful transforms, and produce derived outputs. State is the result of processing a stream, not a thing you mutate directly.",
      internals: "Composes the earlier pieces: an event log as the backbone, stream processors deriving views, CDC feeding changes, and materialized views as outputs. Each stage consumes an input stream and produces an output stream/store deterministically, so the whole pipeline is replayable and rebuildable. This 'turning the database inside out' treats the log as the core and databases as materialized views over it.",
      engineering: "Design pipelines where each stage is a deterministic transform over a stream, with explicit inputs/outputs and replayability. It decouples teams (subscribe to streams), enables rebuilding any view, and makes data lineage explicit. Watch end-to-end latency and state growth.",
      failureModes: "Hidden coupling via shared mutable state defeating the model. Unbounded intermediate state. Hard-to-debug multi-stage pipelines. End-to-end latency accumulation.",
      interviewQs: [
        iq("What does 'turning the database inside out' mean in a dataflow architecture?", "It means treating the ordered event log as the primary source of truth and every database/index/cache as a materialized view derived from it by stream processing — the inverse of a monolithic database that hides its log inside and exposes mutable tables. State becomes the output of processing a stream, so views are rebuildable by replay, data lineage is explicit, and systems integrate by subscribing to streams rather than sharing mutable state."),
      ],
      prerequisites: ["m104"], related: ["m103", "m105", "m110"],
    },
    m110: {
      why: "No single database does everything well, so modern systems compose specialized stores — OLTP DB, search, cache, warehouse, stream processor — into a coherent whole. Knowing how to combine them is the real-world skill.",
      intuition: "Use the right tool for each access pattern and keep them consistent via a change log. The 'database' becomes an architecture of cooperating systems, not one box.",
      internals: "Polyglot persistence: an OLTP store for transactions, a search index for text, a cache for hot reads, a columnar warehouse for analytics, a stream processor for real-time — each fed from the system of record via CDC/streams so they stay consistent and rebuildable. The hard parts are consistency across stores (eventual, via the log), operational complexity, and clear data ownership.",
      engineering: "Pick stores by workload, make one authoritative, and integrate via an event log rather than dual writes. Accept eventual consistency between stores. Weigh the operational cost of each added system against its benefit — simplicity is a feature.",
      failureModes: "Over-engineering (too many systems to operate). Dual-write inconsistency. Unclear source of truth. Cross-store consistency surprises. Operational/skills overhead.",
      interviewQs: [
        iq("How do you keep multiple specialized data stores consistent?", "Designate one store as the system of record and derive the others from its change stream (CDC → event log), so each specialized store (search, cache, warehouse) is an eventually-consistent, rebuildable projection of the source. Avoid dual writes (writing to each store directly), which have no atomicity or ordering; the log gives consistent ordering and replay. You accept eventual consistency between stores in exchange for using the right tool per workload."),
      ],
      prerequisites: ["m106"], related: ["m106", "m109", "m111"],
    },
    m111: {
      why: "The canonical modern data pipeline — OLTP → CDC → Kafka → stream processing → OLAP — ties the whole course together: how a write in an operational database becomes real-time analytics without coupling the two.",
      intuition: "A user action writes to the OLTP database; CDC captures the change into Kafka; a stream processor transforms/enriches it; the result lands in an OLAP/warehouse store for analytics — each stage decoupled and replayable.",
      internals: "OLTP handles low-latency transactional writes. CDC (log-based) captures every committed change in order. Kafka (the event log) buffers and distributes it durably. Stream processing joins/aggregates/enriches with event-time semantics. OLAP (columnar warehouse) serves analytical queries over the derived data. The log decouples the fast operational side from the heavy analytical side, so analytics never slows transactions and either side can evolve independently.",
      engineering: "This pattern separates concerns cleanly: OLTP stays fast, analytics stays rich, and they're linked by a replayable log instead of expensive cross-database queries. Use the outbox pattern for atomic event publishing, watch pipeline lag end-to-end, and treat the warehouse as rebuildable derived data.",
      failureModes: "Pipeline lag making analytics stale. Outbox/dual-write gaps losing events. Schema evolution breaking downstream stages. Backpressure when the warehouse load lags. Operating five systems well.",
      interviewQs: [
        iq("Walk through how a database write becomes real-time analytics in an OLTP→CDC→Kafka→stream→OLAP pipeline.", "The user action commits to the OLTP database (fast transactional write). Log-based CDC reads the WAL and emits the change, in commit order, to Kafka — the durable event log that decouples producers from consumers. A stream processor consumes it, applying event-time joins/aggregations/enrichment, and writes the result into an OLAP/columnar warehouse that serves analytical queries. The log in the middle means heavy analytics never contend with transactional writes, every stage is replayable, and the warehouse is rebuildable derived data."),
      ],
      prerequisites: ["m107"], related: ["m107", "m103", "m110"],
    },
  };
  Object.assign(C, P);

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

  // Normalize related/prerequisites to concept IDs. Authored content
  // references some concepts by slug, but the registry and every consumer
  // (master-map edges, the Related tab) key on id — so map slug -> id,
  // drop anything that resolves to nothing or to self, and dedupe.
  function normRefs(list, selfId) {
    if (!list || !list.length) return list || [];
    var out = [], seen = {};
    list.forEach(function (ref) {
      var id = DL.conceptById[ref] ? ref : (DL.conceptBySlug[ref] ? DL.conceptBySlug[ref].id : null);
      if (id && id !== selfId && !seen[id]) { seen[id] = 1; out.push(id); }
    });
    return out;
  }
  (DL.concepts || []).forEach(function (c) {
    c.related = normRefs(c.related, c.id);
    c.prerequisites = normRefs(c.prerequisites, c.id);
  });
})();
