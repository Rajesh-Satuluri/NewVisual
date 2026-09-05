/*
 * data/sql/concepts_ctes.js — SQL "Learn" topic: CTEs & Subqueries.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the T-SQL /
 * PostgreSQL / MySQL / SQLite notes flagged inline); teaching structure mirrors
 * the Window Functions exemplar.
 */
window.LEARN.register("sql", "CTEs & Subqueries", [
  {
    id: "ctes",
    title: "CTEs",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Name a query so you can read it top-to-bottom — a temporary result set that lives for one statement.",

    whatIsIt: [
      "A <b>CTE</b> (Common Table Expression) is a <b>named temporary result set</b> defined with <code>WITH name AS (...)</code> that exists only for the single statement that follows. Think of it as a query-local view: you name a subquery once, then reference that name like a table.",
      "The point is <b>readability and reuse</b>. Instead of nesting a subquery three levels deep, you give each step a name and read the query as a sequence: <code>WITH step1 AS (...), step2 AS (...) SELECT ... FROM step2</code>. Later CTEs can reference earlier ones, so you build a pipeline.",
      "A CTE referenced twice is still written once. Whether the engine <b>materializes</b> it (runs it once and stashes the rows) or <b>inlines</b> it (folds the definition into each reference and re-optimizes) is up to the planner — and dialects differ, which matters for performance."
    ],

    showMe: {
      code:
        "-- Chained CTEs: each step names the one before it\n" +
        "WITH dept_totals AS (\n" +
        "  SELECT department, SUM(salary) AS payroll\n" +
        "  FROM employee\n" +
        "  GROUP BY department\n" +
        "),\n" +
        "big_depts AS (\n" +
        "  SELECT department, payroll\n" +
        "  FROM dept_totals\n" +
        "  WHERE payroll > 500000\n" +
        ")\n" +
        "SELECT e.name, e.department, b.payroll\n" +
        "FROM employee e\n" +
        "JOIN big_depts b ON b.department = e.department\n" +
        "ORDER BY b.payroll DESC, e.name;",
      caption:
        "dept_totals aggregates once; big_depts filters that result; the final SELECT joins back to detail rows. " +
        "Read it top-to-bottom instead of unwrapping nested parentheses inside-out."
    },

    whyMatters:
      "<p>CTEs are the backbone of readable analytical SQL. Any \"medium/hard\" interview answer that needs two or three transformation steps — aggregate, then filter on the aggregate, then join back — is far clearer as chained CTEs than as nested subqueries. They also pair with window functions: compute a <code>ROW_NUMBER()</code> in a CTE, filter it in the outer query.</p>" +
      "<p>The classic shape is <b>aggregate in a CTE, filter/join in the outer query</b>, because you cannot reference an aggregate or window result in the same query's <code>WHERE</code>:</p>" +
      "<pre class=\"why-pre\">WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY hired) AS rn\n  FROM employee\n)\nSELECT * FROM ranked WHERE rn = 1;   -- first hire per department</pre>" +
      "<p>They are also the only way to write a <b>recursive</b> query (next topic) and the cleanest way to reuse one intermediate result in several places.</p>",

    recognize: [
      { q: "\"aggregate, THEN filter on that aggregate\", \"filter on a computed total\"", think: "compute the aggregate in a CTE, filter it in the outer SELECT (WHERE can't see the aggregate)" },
      { q: "\"this subquery appears three times\", \"reuse the same intermediate result\"", think: "name it once as a CTE and reference the name repeatedly" },
      { q: "\"break this monster query into steps\", \"make it readable\"", think: "chain CTEs — step1, step2, step3 — each naming the one before" },
      { q: "\"top N per group\", \"latest row per key\" combined with more logic", think: "window function inside a CTE, then filter/join in the outer query" },
      { q: "\"walk a hierarchy / tree / graph\"", think: "a recursive CTE — WITH RECURSIVE (see the next topic)" }
    ],

    matchTags: ["cte", "with", "common table expression", "subquery", "derived table", "nested query"],

    traps: [
      {
        bad: "SELECT department, SUM(salary) AS payroll\nFROM employee\nGROUP BY department\nHAVING payroll > 500000\nWHERE payroll > 500000;   -- WHERE can't see the aggregate; HAVING is the fix here",
        good: "WITH dept_totals AS (\n  SELECT department, SUM(salary) AS payroll\n  FROM employee GROUP BY department\n)\nSELECT * FROM dept_totals WHERE payroll > 500000;",
        why: "You cannot filter an aggregate (or a window result) in the same query's WHERE — it is computed after WHERE. Either use HAVING for a plain aggregate, or compute it in a CTE and filter the CTE in the outer query. The CTE form also lets you reuse payroll elsewhere."
      },
      {
        bad: "WITH t AS (SELECT ...);\nWITH s AS (SELECT ...)\nSELECT * FROM s;   -- two WITH keywords",
        good: "WITH t AS (SELECT ...),\n     s AS (SELECT ...)\nSELECT * FROM s;",
        why: "There is exactly one WITH per statement. Additional CTEs are comma-separated after it, not introduced with another WITH. Only the final SELECT (or INSERT/UPDATE/DELETE) can consume them."
      },
      {
        bad: "WITH t AS (SELECT * FROM big_table WHERE region = 'US')\nSELECT * FROM t JOIN t t2 ON ...   -- assuming t is computed once",
        good: "-- If you rely on single evaluation, force it:\n-- Postgres: WITH t AS MATERIALIZED (...)\n-- Or accept the planner may inline/re-run it and index accordingly.",
        why: "A CTE is not guaranteed to be materialized (run once). Modern Postgres, SQL Server, and MySQL may inline a CTE and evaluate it per reference. Don't assume a CTE caches its rows unless you force materialization or the dialect guarantees it."
      }
    ],

    complexity: [
      { op: "CTE definition (non-recursive)", big_o: "O(cost of its query)", note: "A CTE adds no asymptotic cost of its own; it costs exactly what its inner query costs, evaluated when referenced." },
      { op: "Materialized CTE referenced k times", big_o: "O(Q + k·R)", note: "The query Q runs once to produce R rows, then each of the k references scans those rows; the inner work is not repeated." },
      { op: "Inlined CTE referenced k times", big_o: "O(k·Q)", note: "If the planner inlines the definition, the underlying query is effectively re-evaluated at each reference, so cost scales with the number of references." },
      { op: "Chained CTEs (a pipeline)", big_o: "O(sum of stages)", note: "Each stage reads the previous stage's output; total cost is the sum of the stages, the same as writing them as nested subqueries." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>WITH name AS (...)</code> is ANSI-standard and works in PostgreSQL, SQL Server, MySQL 8+, SQLite, Oracle, Snowflake, and BigQuery.</p>" +
      "<p>The big difference is <b>materialization</b>:</p>" +
      "<ul>" +
      "<li><b>PostgreSQL &lt; 12</b> treated every CTE as an <b>optimization fence</b> — always materialized, never pushed into. From <b>12+</b> a CTE referenced once and side-effect-free is inlined by default; use <code>AS MATERIALIZED</code> / <code>AS NOT MATERIALIZED</code> to force it either way.</li>" +
      "<li><b>SQL Server</b> and <b>MySQL 8+</b> generally inline CTEs into the plan (no guaranteed caching); there is no MATERIALIZED keyword. MySQL may materialize into an internal temp table when it helps.</li>" +
      "<li><b>SQLite</b> also supports <code>MATERIALIZED</code> / <code>NOT MATERIALIZED</code> hints (3.35+).</li>" +
      "</ul>" +
      "<p>Practically: never rely on a CTE being computed exactly once unless you force it or the engine documents it.</p>",

    challenge: {
      prompt:
        "You have orders(order_id, customer_id, amount). Using CTEs, return each customer whose total spend is above the overall average customer spend, with their total. Do it as two named steps — per-customer totals, then the average of those totals — and explain why WHERE alone can't do this in one flat query.",
      starter:
        "WITH customer_totals AS (\n" +
        "  /* per-customer SUM(amount) */\n" +
        "),\n" +
        "avg_spend AS (\n" +
        "  /* average of the per-customer totals */\n" +
        ")\n" +
        "SELECT ...\n" +
        "FROM customer_totals\n" +
        "WHERE ...;",
      solution:
        "WITH customer_totals AS (\n" +
        "  SELECT customer_id, SUM(amount) AS total\n" +
        "  FROM orders\n" +
        "  GROUP BY customer_id\n" +
        "),\n" +
        "avg_spend AS (\n" +
        "  SELECT AVG(total) AS avg_total\n" +
        "  FROM customer_totals\n" +
        ")\n" +
        "SELECT ct.customer_id, ct.total\n" +
        "FROM customer_totals ct\n" +
        "CROSS JOIN avg_spend a\n" +
        "WHERE ct.total > a.avg_total\n" +
        "ORDER BY ct.total DESC;\n" +
        "-- WHERE runs per row before aggregation, so it cannot compare a row to\n" +
        "-- an aggregate-of-aggregates. The first CTE collapses to one row per\n" +
        "-- customer; the second averages those; the outer query filters against it."
    }
  },
  {
    id: "recursive-ctes",
    title: "Recursive CTEs",
    difficulty: "Advanced",
    estMinutes: 13,
    relevance: 2,
    tagline: "A query that references itself — the standard way to walk hierarchies, trees, and graphs in pure SQL.",

    whatIsIt: [
      "A <b>recursive CTE</b> is a CTE that refers to <b>itself</b>. It has two parts joined by <code>UNION ALL</code>: an <b>anchor member</b> (the base rows, evaluated once) and a <b>recursive member</b> (references the CTE name, and runs repeatedly, each pass feeding on the rows the previous pass produced).",
      "Execution is iterative: the anchor produces the first batch; the recursive member runs against that batch to produce the next; that becomes the input for the next pass; and so on. It <b>terminates when the recursive member returns no rows</b> — so the recursive member must have a condition (usually a JOIN back to the source) that eventually stops adding rows.",
      "This is how you traverse things with unknown depth in SQL: an org chart (manager → reports), a category tree, a bill of materials, a folder structure, or the reachable nodes of a graph. You accumulate depth or a path as you go."
    ],

    showMe: {
      code:
        "-- Walk an org chart down from the CEO, tracking depth\n" +
        "WITH RECURSIVE org AS (\n" +
        "  -- anchor: start at the top (no manager)\n" +
        "  SELECT id, name, manager_id, 1 AS depth\n" +
        "  FROM employee\n" +
        "  WHERE manager_id IS NULL\n" +
        "\n" +
        "  UNION ALL\n" +
        "\n" +
        "  -- recursive member: everyone reporting to a row we already have\n" +
        "  SELECT e.id, e.name, e.manager_id, o.depth + 1\n" +
        "  FROM employee e\n" +
        "  JOIN org o ON e.manager_id = o.id\n" +
        ")\n" +
        "SELECT id, name, depth\n" +
        "FROM org\n" +
        "ORDER BY depth, name;",
      caption:
        "The anchor picks the root(s). Each pass of the recursive member joins new employees onto the rows found so far, adding 1 to depth. " +
        "When no employee reports to any newly added row, the recursive member returns nothing and the recursion stops."
    },

    whyMatters:
      "<p>Recursive CTEs are the canonical answer to <b>\"traverse a hierarchy of unknown depth\"</b> — a question flat JOINs cannot answer because you don't know how many levels to join. They show up whenever data is self-referential: employees with a <code>manager_id</code>, categories with a <code>parent_id</code>, threaded comments, dependency graphs.</p>" +
      "<ul>" +
      "<li><b>Descendants / ancestors:</b> everyone under a manager, or the chain from a node up to the root.</li>" +
      "<li><b>Path &amp; depth:</b> accumulate a breadcrumb string or a level number as you descend.</li>" +
      "<li><b>Sequences:</b> generate a series of numbers or dates without a numbers table.</li>" +
      "</ul>" +
      "<p>The mental model is a fixed-point loop:</p>" +
      "<pre class=\"why-pre\">result := anchor query           -- pass 0\nrepeat:\n  next := recursive member using the LAST batch\n  add next to result\nuntil next is empty            -- termination</pre>",

    recognize: [
      { q: "\"all employees under manager X\", \"whole subtree\", \"all descendants\"", think: "recursive CTE: anchor = the starting node, recursive member joins children onto found rows" },
      { q: "\"the chain from a node up to the root\", \"all ancestors\", \"path to top\"", think: "recursive CTE walking parent_id upward, accumulating a path" },
      { q: "\"category tree\", \"bill of materials\", \"folder structure\", \"org chart\"", think: "self-referential table (parent_id / manager_id) → WITH RECURSIVE" },
      { q: "\"generate numbers 1..N\" or \"every date in a range\" with no numbers table", think: "recursive CTE: anchor = 1, recursive member = n + 1 WHERE n < N" },
      { q: "\"levels\", \"depth\", \"how many hops\"", think: "carry depth + 1 through the recursive member" }
    ],

    matchTags: ["recursive", "cte", "with", "common table expression", "hierarchy", "tree", "subquery", "nested query"],

    traps: [
      {
        bad: "WITH RECURSIVE org AS (\n  SELECT id, manager_id FROM employee WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.id, e.manager_id FROM employee e, org o   -- no join condition!\n)\nSELECT * FROM org;",
        good: "  ...\n  UNION ALL\n  SELECT e.id, e.manager_id\n  FROM employee e\n  JOIN org o ON e.manager_id = o.id   -- links each child to a found parent",
        why: "The recursive member MUST narrow toward termination. Without a join condition tying new rows to the previously found rows, it never returns an empty batch and the query runs forever (or hits the depth limit). And on cyclic data even a correct join can loop — carry a visited path or a depth cap."
      },
      {
        bad: "WITH RECURSIVE t AS (\n  SELECT 1 AS n\n  UNION            -- dedups every pass (slower, and hides intended rows)\n  SELECT n + 1 FROM t WHERE n < 100\n)\nSELECT * FROM t;",
        good: "WITH RECURSIVE t AS (\n  SELECT 1 AS n\n  UNION ALL\n  SELECT n + 1 FROM t WHERE n < 100\n)\nSELECT * FROM t;",
        why: "The standard recursive form uses UNION ALL. UNION forces a distinct on the accumulated set every iteration — usually unwanted and slower. Use UNION only when you deliberately need to collapse duplicate paths (e.g. a graph reachable many ways) and understand the cost."
      },
      {
        bad: "-- SQL Server, expecting it to run deep by default\nWITH RECURSIVE org AS (...)   -- SQL Server has no RECURSIVE keyword",
        good: "-- SQL Server: no RECURSIVE keyword; default max depth is 100\nWITH org AS (...)\nSELECT * FROM org\nOPTION (MAXRECURSION 0);   -- 0 = unlimited (use with care)",
        why: "SQL Server writes recursive CTEs with plain WITH (no RECURSIVE keyword) and caps recursion at 100 levels by default, erroring out beyond that. Raise or remove the cap with OPTION (MAXRECURSION n). Postgres/MySQL/SQLite require the RECURSIVE keyword instead."
      }
    ],

    complexity: [
      { op: "Tree/DAG traversal (UNION ALL)", big_o: "O(V + E)", note: "Each edge is followed once as the recursive member joins children onto found rows, so cost is roughly the number of nodes plus edges reached." },
      { op: "Series generation (n up to N)", big_o: "O(N)", note: "One row is produced per iteration until the stop condition fails, giving a linear number of passes and rows." },
      { op: "Recursive member per pass", big_o: "O(cost of one join)", note: "Each iteration is a single join of the source table against the previous batch; an index on the join key (parent_id / manager_id) keeps each pass cheap." },
      { op: "Cyclic graph without cycle guard", big_o: "unbounded", note: "Without a visited-path check or depth cap, cycles make the recursion never terminate, so bounding it is a correctness requirement, not an optimization." },
      { op: "UNION (distinct) variant", big_o: "O(passes · result log result)", note: "Deduplicating the accumulated set every iteration adds a sort/hash per pass, which is why UNION ALL is the default unless dedup is needed." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The structure — anchor <code>UNION ALL</code> recursive member — is ANSI-standard, but the keyword and limits differ:</p>" +
      "<ul>" +
      "<li><b>PostgreSQL, MySQL 8+, SQLite:</b> require the <code>RECURSIVE</code> keyword: <code>WITH RECURSIVE t AS (...)</code>. Postgres has no default depth cap (an infinite recursion runs until it exhausts resources), so guard cycles yourself; it also offers <code>UNION</code> with a <code>CYCLE</code> clause (14+) to detect cycles.</li>" +
      "<li><b>SQL Server:</b> uses plain <code>WITH</code> (<b>no</b> <code>RECURSIVE</code> keyword) and defaults to <b>MAXRECURSION 100</b>; exceeding it is an error. Override with <code>OPTION (MAXRECURSION n)</code> (<code>0</code> = unlimited).</li>" +
      "<li><b>Oracle:</b> supports the standard recursive <code>WITH</code> and also its legacy <code>CONNECT BY</code> hierarchical syntax.</li>" +
      "</ul>" +
      "<p>In every dialect the recursive member may reference the CTE name <b>once</b>, and aggregates/<code>ORDER BY</code>/<code>LIMIT</code> inside the recursive member are restricted.</p>",

    challenge: {
      prompt:
        "You have category(id, name, parent_id) with parent_id NULL at the roots. Write a recursive CTE that returns every category with its depth (roots = 1) and a slash-separated path from the root (e.g. 'Electronics/Phones/Cases'). Identify the anchor, the recursive member, and what makes it terminate.",
      starter:
        "WITH RECURSIVE tree AS (\n" +
        "  -- anchor: root categories\n" +
        "  /* SELECT id, name, 1 AS depth, name AS path ... WHERE parent_id IS NULL */\n" +
        "  UNION ALL\n" +
        "  -- recursive member: children of rows already found\n" +
        "  /* join category to tree on parent_id, depth + 1, path || '/' || name */\n" +
        ")\n" +
        "SELECT id, name, depth, path FROM tree ORDER BY path;",
      solution:
        "WITH RECURSIVE tree AS (\n" +
        "  SELECT id, name, 1 AS depth,\n" +
        "         name AS path\n" +
        "  FROM category\n" +
        "  WHERE parent_id IS NULL\n" +
        "\n" +
        "  UNION ALL\n" +
        "\n" +
        "  SELECT c.id, c.name, t.depth + 1,\n" +
        "         t.path || '/' || c.name\n" +
        "  FROM category c\n" +
        "  JOIN tree t ON c.parent_id = t.id\n" +
        ")\n" +
        "SELECT id, name, depth, path\n" +
        "FROM tree\n" +
        "ORDER BY path;\n" +
        "-- Anchor: the roots (parent_id IS NULL), depth 1, path = own name.\n" +
        "-- Recursive member: each category whose parent is a row already in tree,\n" +
        "--   extending depth and path. It terminates when no category's parent_id\n" +
        "--   matches a newly added row, so the recursive member returns no rows.\n" +
        "-- Note: || is Postgres/SQLite/Oracle string concat; SQL Server uses +\n" +
        "--   (and CONCAT), MySQL uses CONCAT(t.path,'/',c.name)."
    }
  },
  {
    id: "subqueries",
    title: "Subqueries",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "A query inside a query — as a single value, a set to test against, or a table to select from.",

    whatIsIt: [
      "A <b>subquery</b> is a <code>SELECT</code> nested inside another statement. Its role depends on where it sits: a <b>scalar subquery</b> returns one row/one column and stands in for a value; a subquery after <code>IN</code>/<code>EXISTS</code> returns a set you test membership against; a subquery in the <code>FROM</code> clause is a <b>derived table</b> you select from like any table (it must be aliased).",
      "The key distinction is <b>correlated vs uncorrelated</b>. An <b>uncorrelated</b> subquery is self-contained — it can be run once on its own. A <b>correlated</b> subquery references a column from the outer query, so it is conceptually <b>re-evaluated once per outer row</b> (the optimizer may rewrite it as a join, but that is the mental model).",
      "<code>EXISTS</code> is the correlated workhorse: it checks whether the inner query returns <b>any</b> row and <b>short-circuits</b> on the first match. It also handles <code>NULL</code>s cleanly — unlike <code>NOT IN</code>, whose result becomes <code>UNKNOWN</code> (so, no rows) the moment the value list contains a <code>NULL</code>."
    ],

    showMe: {
      code:
        "-- Scalar subquery: compare each salary to the company average\n" +
        "SELECT name, salary\n" +
        "FROM employee\n" +
        "WHERE salary > (SELECT AVG(salary) FROM employee);\n" +
        "\n" +
        "-- Correlated EXISTS: departments that have at least one employee\n" +
        "SELECT d.name\n" +
        "FROM department d\n" +
        "WHERE EXISTS (\n" +
        "  SELECT 1\n" +
        "  FROM employee e\n" +
        "  WHERE e.department_id = d.id   -- references the OUTER row\n" +
        ");\n" +
        "\n" +
        "-- Derived table: filter on an aggregate computed in FROM\n" +
        "SELECT department_id, headcount\n" +
        "FROM (\n" +
        "  SELECT department_id, COUNT(*) AS headcount\n" +
        "  FROM employee\n" +
        "  GROUP BY department_id\n" +
        ") t                              -- alias is required\n" +
        "WHERE headcount >= 5;",
      caption:
        "Three roles in one screen: a scalar subquery supplies the average as a value; " +
        "EXISTS correlates on d.id and stops at the first matching employee; the derived table lets the outer WHERE filter a computed count."
    },

    whyMatters:
      "<p>Subqueries are the most common way to express \"filter by a condition that itself needs a query\": rows above an average, rows that do (or don't) have a related row, rows matching a computed set. Getting <code>IN</code> vs <code>EXISTS</code> vs a <code>JOIN</code> right — and the <code>NULL</code> pitfalls of <code>NOT IN</code> — is a frequent interview discriminator.</p>" +
      "<ul>" +
      "<li><b>Scalar:</b> one value — a threshold, a lookup — used inline in <code>SELECT</code> or <code>WHERE</code>.</li>" +
      "<li><b>IN / EXISTS:</b> membership and existence tests; <code>EXISTS</code> short-circuits and is NULL-safe.</li>" +
      "<li><b>Derived table:</b> pre-aggregate or pre-shape rows, then query the result.</li>" +
      "</ul>" +
      "<p>The NULL trap is worth memorizing — <code>NOT IN</code> with a NULL in the set returns nothing:</p>" +
      "<pre class=\"why-pre\">-- if any dept_id in the subquery is NULL, this returns ZERO rows:\nSELECT * FROM employee\nWHERE department_id NOT IN (SELECT department_id FROM closed_dept);\n\n-- NULL-safe alternative:\nSELECT * FROM employee e\nWHERE NOT EXISTS (\n  SELECT 1 FROM closed_dept c WHERE c.department_id = e.department_id);</pre>",

    recognize: [
      { q: "\"above/below the average\", \"more than the max of…\"", think: "scalar subquery returning one aggregate value, compared in WHERE" },
      { q: "\"customers who HAVE placed an order\", \"rows with a matching related row\"", think: "correlated EXISTS (short-circuits on first match)" },
      { q: "\"customers who have NEVER ordered\", \"rows with no match\"", think: "NOT EXISTS (NULL-safe) — prefer it over NOT IN when NULLs are possible" },
      { q: "\"whose id is in this list produced by a query\"", think: "IN (uncorrelated subquery) — fine when the subquery has no NULLs" },
      { q: "\"filter on a COUNT/SUM per group\", \"query the result of an aggregation\"", think: "derived table in FROM (aliased), then filter its columns in the outer WHERE" }
    ],

    matchTags: ["subquery", "correlated", "exists", "in", "derived table", "nested query", "scalar"],

    traps: [
      {
        bad: "SELECT * FROM employee\nWHERE department_id NOT IN (\n  SELECT department_id FROM closed_dept   -- may contain NULL\n);",
        good: "SELECT * FROM employee e\nWHERE NOT EXISTS (\n  SELECT 1 FROM closed_dept c\n  WHERE c.department_id = e.department_id\n);",
        why: "If the NOT IN subquery yields even one NULL, every comparison becomes UNKNOWN and the whole predicate returns no rows — a silent, data-dependent bug. NOT EXISTS compares row-by-row and is NULL-safe. Either switch to NOT EXISTS or add a WHERE ... IS NOT NULL guard to the subquery."
      },
      {
        bad: "WHERE salary > (SELECT salary FROM employee WHERE department = 'Sales')",
        good: "WHERE salary > (SELECT MAX(salary) FROM employee WHERE department = 'Sales')\n-- or use IN / ANY / ALL if you truly mean a set",
        why: "A scalar subquery must return at most one row. If the inner query can return several, the engine raises a runtime error. Aggregate it to one value, or use IN / = ANY / > ALL when you mean a set comparison."
      },
      {
        bad: "SELECT department_id, COUNT(*)\nFROM (SELECT * FROM employee) \nWHERE ...   -- derived table with no alias",
        good: "SELECT department_id, COUNT(*)\nFROM (SELECT * FROM employee) AS e   -- alias required\nGROUP BY department_id;",
        why: "A subquery in FROM (a derived table) must be given an alias in most dialects (Postgres, MySQL, SQL Server); without it you get a syntax error. Also remember its columns exist only through that alias."
      }
    ],

    complexity: [
      { op: "Uncorrelated scalar / IN subquery", big_o: "O(inner) + O(outer)", note: "The inner query runs once and its result is reused, so its cost is added to, not multiplied by, the outer scan." },
      { op: "Correlated subquery (naive)", big_o: "O(outer · inner)", note: "Conceptually the inner query re-runs for every outer row, so an unindexed correlated subquery over large tables is the classic performance trap." },
      { op: "Correlated subquery (optimized)", big_o: "O(n log n) or O(n)", note: "Most planners rewrite a correlated EXISTS/IN into a semi-join, collapsing the nested-loop blowup — provided the correlation column is indexed." },
      { op: "EXISTS (short-circuit)", big_o: "O(cost to first match)", note: "EXISTS stops at the first qualifying inner row, so on a well-indexed correlation column each check is near-constant regardless of how many rows would match." },
      { op: "Derived table", big_o: "O(cost of its query)", note: "It costs what its inner query costs; the planner may materialize it once or fold it into the outer plan much like a CTE." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> Scalar subqueries, <code>IN</code>, <code>EXISTS</code>, and derived tables are ANSI-standard and available everywhere.</p>" +
      "<ul>" +
      "<li><b>Correlated performance:</b> Postgres and SQL Server routinely rewrite correlated <code>EXISTS</code>/<code>IN</code> into semi-joins, so the \"once per row\" model rarely bites when the correlation column is indexed. Older MySQL was notoriously bad at this — pre-8.0 correlated subqueries and <code>IN (subquery)</code> could run as slow nested loops; MySQL 8's optimizer (semi-join, materialization) largely fixed it.</li>" +
      "<li><b>Derived table alias:</b> Postgres, MySQL, and SQL Server require an alias on a FROM-clause subquery; Oracle does not.</li>" +
      "<li><b>Row / multi-column subqueries:</b> Postgres and MySQL support <code>WHERE (a, b) IN (SELECT a, b ...)</code>; SQL Server does not and needs an <code>EXISTS</code> rewrite.</li>" +
      "<li><b>NOT IN + NULL</b> behaves the same everywhere (returns no rows) — it is standard three-valued logic, not a dialect quirk.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have customer(id, name) and orders(id, customer_id, amount). Return every customer who has NEVER placed an order. Write it with NOT EXISTS, and say why NOT EXISTS is safer than NOT IN here and how a LEFT JOIN ... IS NULL would compare.",
      starter:
        "SELECT c.id, c.name\n" +
        "FROM customer c\n" +
        "WHERE NOT EXISTS (\n" +
        "  /* an order for this customer */\n" +
        ");",
      solution:
        "SELECT c.id, c.name\n" +
        "FROM customer c\n" +
        "WHERE NOT EXISTS (\n" +
        "  SELECT 1\n" +
        "  FROM orders o\n" +
        "  WHERE o.customer_id = c.id\n" +
        ");\n" +
        "-- Safer than NOT IN: if orders.customer_id contained any NULL, then\n" +
        "--   WHERE c.id NOT IN (SELECT customer_id FROM orders) would return ZERO\n" +
        "--   rows (the NULL makes the predicate UNKNOWN). NOT EXISTS is NULL-safe.\n" +
        "-- Equivalent anti-join:\n" +
        "--   SELECT c.id, c.name FROM customer c\n" +
        "--   LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "--   WHERE o.id IS NULL;\n" +
        "-- All three express an anti-join; planners often produce the same plan."
    }
  }
]);
