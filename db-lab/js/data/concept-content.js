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
