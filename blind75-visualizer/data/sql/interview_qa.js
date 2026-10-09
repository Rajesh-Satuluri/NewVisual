/*
 * data/sql/interview_qa.js — SQL "Interview Q&A" bank.
 *
 * Rapid-fire, interview-ready theory answers for the SQL verbal / telephonic
 * round: a crisp one-line definition, a few high-signal bullets, a tiny
 * interview tip, and SQL where it earns its place. Read by js/interviewqa.js
 * and shown as a flashcard panel from SQL Learn, with spaced-repetition
 * grading wired to the shared SRS store (ids namespaced "sqlqa:<id>").
 *
 * All content is authored fresh for this tool (not reproduced from any book).
 *
 * Schema per item:
 *   { id, group, q, difficulty, tags:[], a (html), code?, lang?, tip? (html) }
 * Answers render via innerHTML (allow <b>,<code>,<i>,<ul>,<li>,<p>); code
 * renders via textContent through Prism (lang defaults to "sql").
 */
window.SQL_QA = {
  groups: [
    "Fundamentals & Command Types",
    "Keys & Constraints",
    "Joins & Set Operations",
    "Aggregation, GROUP BY & Filtering",
    "Subqueries & CTEs",
    "Window Functions & Ranking",
    "Indexes & Performance",
    "Normalization & Design",
    "Transactions, ACID & Concurrency",
    "Views, Procedures, Functions & Triggers",
    "Data Types, NULLs & Dates",
    "Classic Query Patterns",
    "OLTP vs OLAP & Misc"
  ],

  items: [
    // ───────────────────── G1 · Fundamentals & Command Types ─────────────────────
    {
      id: "what-is-sql",
      group: "Fundamentals & Command Types",
      q: "What is SQL, and is it a programming language?",
      difficulty: "Core",
      tags: ["sql", "basics", "declarative"],
      a:
        "<p><b>SQL (Structured Query Language) is the standard declarative language for defining and manipulating data in a relational database.</b> You describe <i>what</i> result you want; the database's query optimizer decides <i>how</i> to get it.</p>" +
        "<ul>" +
        "<li><b>Declarative, not imperative</b> — you don't write loops or choose access paths; you state the result set and the engine plans the execution.</li>" +
        "<li><b>Set-based</b> — it operates on whole sets of rows at once, not one row at a time.</li>" +
        "<li><b>Standardised</b> — ANSI/ISO SQL is the common core; each engine (PostgreSQL, MySQL, SQL Server, Oracle) adds its own dialect on top.</li>" +
        "</ul>",
      tip: "Lead with <i>\"SQL is a declarative, set-based query language.\"</i> Those two adjectives — <i>declarative</i> and <i>set-based</i> — are what separate someone who knows SQL from someone who writes row-by-row loops in it."
    },
    {
      id: "sql-command-categories",
      group: "Fundamentals & Command Types",
      q: "What are the categories of SQL commands (DDL, DML, DCL, TCL, DQL)?",
      difficulty: "Core",
      tags: ["ddl", "dml", "dcl", "tcl", "dql"],
      a:
        "<ul>" +
        "<li><b>DDL — Data Definition Language.</b> Defines/alters structure: <code>CREATE</code>, <code>ALTER</code>, <code>DROP</code>, <code>TRUNCATE</code>. (Auto-commits in most engines.)</li>" +
        "<li><b>DML — Data Manipulation Language.</b> Changes rows: <code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>MERGE</code>.</li>" +
        "<li><b>DQL — Data Query Language.</b> Reads rows: <code>SELECT</code>.</li>" +
        "<li><b>DCL — Data Control Language.</b> Permissions: <code>GRANT</code>, <code>REVOKE</code>.</li>" +
        "<li><b>TCL — Transaction Control Language.</b> Transaction boundaries: <code>COMMIT</code>, <code>ROLLBACK</code>, <code>SAVEPOINT</code>.</li>" +
        "</ul>",
      tip: "The trap: interviewers love that <code>TRUNCATE</code> is <b>DDL</b> (not DML) — which is why it can't be rolled back in most engines and resets identity seeds."
    },
    {
      id: "logical-query-order",
      group: "Fundamentals & Command Types",
      q: "In what logical order are the clauses of a SELECT evaluated?",
      difficulty: "Deep",
      tags: ["order", "select", "execution"],
      a:
        "<p>You <i>write</i> <code>SELECT</code> first, but the engine <i>logically evaluates</i> in this order:</p>" +
        "<p><code>FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT/OFFSET</code></p>" +
        "<ul>" +
        "<li>This is why a column <b>alias</b> defined in <code>SELECT</code> can be used in <code>ORDER BY</code> (evaluated later) but <b>not</b> in <code>WHERE</code> (evaluated earlier).</li>" +
        "<li>It's also why <code>WHERE</code> filters rows <i>before</i> grouping and <code>HAVING</code> filters groups <i>after</i>.</li>" +
        "</ul>",
      code:
        "SELECT dept_id, COUNT(*) AS n   -- 5: alias created here\n" +
        "FROM employee                   -- 1\n" +
        "WHERE salary > 0                -- 2: cannot see alias n\n" +
        "GROUP BY dept_id                -- 3\n" +
        "HAVING COUNT(*) > 5             -- 4: filter on groups\n" +
        "ORDER BY n DESC;                -- 6: can see alias n",
      tip: "Memorise the order once — it answers a whole family of questions (alias scope, WHERE vs HAVING, why you can't filter a window function in WHERE)."
    },
    {
      id: "delete-truncate-drop",
      group: "Fundamentals & Command Types",
      q: "Difference between DELETE, TRUNCATE and DROP?",
      difficulty: "Core",
      tags: ["delete", "truncate", "drop"],
      a:
        "<ul>" +
        "<li><b>DELETE</b> (DML) — removes rows matching an optional <code>WHERE</code>; logged row-by-row, fires triggers, <b>can be rolled back</b>, keeps the table + identity seed.</li>" +
        "<li><b>TRUNCATE</b> (DDL) — removes <i>all</i> rows by deallocating pages; minimally logged, much faster, usually can't be rolled back, resets identity seed, no row triggers, no <code>WHERE</code>.</li>" +
        "<li><b>DROP</b> (DDL) — removes the <b>entire table</b> (structure + data + indexes + constraints).</li>" +
        "</ul>",
      tip: "One-liner: <i>\"DELETE removes rows, TRUNCATE empties the table, DROP removes the table itself.\"</i> Then mention rollback + identity-reset to show depth."
    },
    {
      id: "where-vs-having",
      group: "Fundamentals & Command Types",
      q: "Difference between WHERE and HAVING?",
      difficulty: "Core",
      tags: ["where", "having", "group by"],
      a:
        "<ul>" +
        "<li><b>WHERE</b> filters <b>individual rows before grouping</b> and cannot reference aggregates.</li>" +
        "<li><b>HAVING</b> filters <b>groups after <code>GROUP BY</code></b> and is where aggregate conditions live (<code>HAVING COUNT(*) &gt; 5</code>).</li>" +
        "</ul>" +
        "<p>Put non-aggregate conditions in <code>WHERE</code> (cheaper — fewer rows reach the grouping) and aggregate conditions in <code>HAVING</code>.</p>",
      code:
        "SELECT dept_id, AVG(salary) AS avg_sal\n" +
        "FROM employee\n" +
        "WHERE active = 1            -- row filter, before grouping\n" +
        "GROUP BY dept_id\n" +
        "HAVING AVG(salary) > 50000; -- group filter, after grouping",
      tip: "If a filter doesn't need an aggregate, it belongs in WHERE — doing it in HAVING is correct but needlessly aggregates rows you could have dropped earlier."
    },
    {
      id: "char-varchar-nvarchar",
      group: "Fundamentals & Command Types",
      q: "Difference between CHAR, VARCHAR and NVARCHAR?",
      difficulty: "Core",
      tags: ["char", "varchar", "nvarchar", "types"],
      a:
        "<ul>" +
        "<li><b>CHAR(n)</b> — fixed length; always stores n characters, right-padding with spaces. Best when length is truly constant (country code, Y/N).</li>" +
        "<li><b>VARCHAR(n)</b> — variable length; stores only what you put in plus a small length header. Best for names, emails, free text.</li>" +
        "<li><b>NVARCHAR(n)</b> — variable length <b>Unicode</b> (UTF-16 in SQL Server); use it when you must store multiple scripts/languages. Costs ~2 bytes/char.</li>" +
        "</ul>",
      tip: "Default to VARCHAR. Reach for CHAR only for genuinely fixed-width codes, and NVARCHAR when the data is multilingual (in PostgreSQL/MySQL, text is Unicode already, so the N-types are a SQL-Server-ism)."
    },
    {
      id: "union-vs-union-all",
      group: "Fundamentals & Command Types",
      q: "Difference between UNION and UNION ALL?",
      difficulty: "Core",
      tags: ["union", "set", "distinct"],
      a:
        "<ul>" +
        "<li><b>UNION</b> stacks two result sets and <b>removes duplicate rows</b> — which forces a sort/hash de-dup step, so it's slower.</li>" +
        "<li><b>UNION ALL</b> stacks them and <b>keeps every row</b>, including duplicates — no de-dup, so it's faster.</li>" +
        "</ul>" +
        "<p>Both require the same number of columns with compatible types.</p>",
      tip: "Default to <code>UNION ALL</code> and only use <code>UNION</code> when you actually need duplicates removed — most people reach for UNION out of habit and pay for a de-dup they don't need."
    },

    // ───────────────────── G2 · Keys & Constraints ─────────────────────
    {
      id: "primary-key",
      group: "Keys & Constraints",
      q: "What is a primary key?",
      difficulty: "Core",
      tags: ["primary key", "constraint"],
      a:
        "<p><b>A primary key uniquely identifies every row in a table.</b> It enforces two rules at once: values are <b>unique</b> and <b>never NULL</b>. A table has at most one primary key, which may span multiple columns (a composite key).</p>" +
        "<ul>" +
        "<li>Most engines back it with a <b>unique index</b> automatically (clustered by default in SQL Server).</li>" +
        "<li>It's the natural target for foreign keys from other tables.</li>" +
        "</ul>",
      tip: "Interviewers often follow up with \"PK vs UNIQUE\" — have that ready: PK = unique + NOT NULL + one per table; UNIQUE = unique but allows a NULL and you can have many."
    },
    {
      id: "pk-vs-unique",
      group: "Keys & Constraints",
      q: "Difference between a PRIMARY KEY and a UNIQUE key?",
      difficulty: "Core",
      tags: ["primary key", "unique", "constraint"],
      a:
        "<ul>" +
        "<li><b>Nullability</b> — PK columns are <code>NOT NULL</code>; a UNIQUE column may hold NULL (typically one NULL, since NULLs aren't \"equal\" to each other in most engines).</li>" +
        "<li><b>Count</b> — one PK per table; many UNIQUE constraints allowed.</li>" +
        "<li><b>Intent</b> — PK is <i>the</i> identifier; UNIQUE enforces a business rule (e.g. no two users share an email) on a non-identifying column.</li>" +
        "</ul>",
      tip: "The NULL behaviour is the crisp differentiator — lead with it."
    },
    {
      id: "foreign-key",
      group: "Keys & Constraints",
      q: "What is a foreign key and what is referential integrity?",
      difficulty: "Core",
      tags: ["foreign key", "referential integrity"],
      a:
        "<p><b>A foreign key is a column (or set) in one table that references the primary/unique key of another, enforcing <i>referential integrity</i>:</b> you can't insert a child row that points at a parent that doesn't exist, and you can't orphan children by deleting a referenced parent (unless you declare cascade behaviour).</p>" +
        "<ul>" +
        "<li><code>ON DELETE CASCADE</code> / <code>ON UPDATE CASCADE</code> propagate changes to children.</li>" +
        "<li><code>ON DELETE SET NULL</code> nulls the child reference instead.</li>" +
        "</ul>",
      code:
        "CREATE TABLE orders (\n" +
        "  id       INT PRIMARY KEY,\n" +
        "  cust_id  INT NOT NULL,\n" +
        "  FOREIGN KEY (cust_id) REFERENCES customer(id)\n" +
        "    ON DELETE CASCADE\n" +
        ");",
      tip: "Mention that a FK column should usually be indexed — the FK constraint doesn't create the index on the child side in every engine, and un-indexed FKs make parent deletes and joins slow."
    },
    {
      id: "constraints-list",
      group: "Keys & Constraints",
      q: "What are the main constraint types in SQL?",
      difficulty: "Core",
      tags: ["constraints", "check", "default", "not null"],
      a:
        "<ul>" +
        "<li><b>NOT NULL</b> — column must have a value.</li>" +
        "<li><b>UNIQUE</b> — no duplicate values.</li>" +
        "<li><b>PRIMARY KEY</b> — unique + not null; the row identifier.</li>" +
        "<li><b>FOREIGN KEY</b> — enforces a reference to another table.</li>" +
        "<li><b>CHECK</b> — a boolean rule each row must satisfy, e.g. <code>CHECK (rating BETWEEN 1 AND 5)</code>.</li>" +
        "<li><b>DEFAULT</b> — value used when none is supplied on insert.</li>" +
        "</ul>",
      tip: "If asked \"how do you ensure a column only holds 1–5?\", the answer is a CHECK constraint — push the rule into the schema, not the application."
    },
    {
      id: "surrogate-vs-natural-key",
      group: "Keys & Constraints",
      q: "Surrogate key vs natural key — which should you use?",
      difficulty: "Deep",
      tags: ["surrogate", "natural", "key design"],
      a:
        "<ul>" +
        "<li><b>Natural key</b> — a real-world attribute that's already unique (SSN, ISBN, email). No extra column, but can change, may be large, and privacy/uniqueness can bite you.</li>" +
        "<li><b>Surrogate key</b> — a system-generated meaningless id (auto-increment / IDENTITY / sequence / UUID). Stable, compact, never changes.</li>" +
        "</ul>" +
        "<p>Common practice: use a <b>surrogate</b> primary key for stability and a <b>UNIQUE</b> constraint on the natural key to still enforce the business rule.</p>",
      tip: "Say you'd use a surrogate PK <i>plus</i> a unique constraint on the natural key — that answer shows you understand both stability and data integrity."
    },
    {
      id: "composite-key",
      group: "Keys & Constraints",
      q: "What is a composite key?",
      difficulty: "Core",
      tags: ["composite", "key"],
      a:
        "<p><b>A composite (compound) key is a key made of two or more columns</b> whose combination is unique even though no single column is. Classic case: a junction table in a many-to-many relationship, keyed on both foreign keys.</p>",
      code:
        "CREATE TABLE enrollment (\n" +
        "  student_id INT,\n" +
        "  course_id  INT,\n" +
        "  PRIMARY KEY (student_id, course_id)  -- composite\n" +
        ");",
      tip: "Column order in a composite key/index matters for how it can be used — be ready for the follow-up about leftmost-prefix matching (see the Indexes group)."
    },

    // ───────────────────── G3 · Joins & Set Operations ─────────────────────
    {
      id: "join-types",
      group: "Joins & Set Operations",
      q: "Explain INNER, LEFT, RIGHT and FULL OUTER JOIN.",
      difficulty: "Core",
      tags: ["join", "inner", "outer"],
      a:
        "<ul>" +
        "<li><b>INNER JOIN</b> — only rows that match in both tables.</li>" +
        "<li><b>LEFT (OUTER) JOIN</b> — all left rows; unmatched right columns come back NULL.</li>" +
        "<li><b>RIGHT (OUTER) JOIN</b> — all right rows; unmatched left columns NULL. (A LEFT join with the tables swapped.)</li>" +
        "<li><b>FULL (OUTER) JOIN</b> — all rows from both sides; NULLs fill the side with no match.</li>" +
        "</ul>",
      tip: "Draw the mental Venn: INNER = intersection, LEFT = left circle, FULL = union. And remember the gotcha next: putting a right-table filter in WHERE silently turns a LEFT join into an INNER one."
    },
    {
      id: "left-join-where-trap",
      group: "Joins & Set Operations",
      q: "Why can a filter in WHERE turn a LEFT JOIN into an INNER JOIN?",
      difficulty: "Deep",
      tags: ["left join", "where", "null", "trap"],
      a:
        "<p>A LEFT JOIN keeps unmatched left rows with <b>NULL</b> right columns. If you then filter on a right-table column in <code>WHERE</code>, those NULLs fail the predicate and the unmatched rows vanish — you've effectively made it an INNER join.</p>" +
        "<p>Fix: move the condition into the <code>ON</code> clause so it's applied <i>during</i> the join, not after.</p>",
      code:
        "-- drops customers with no 2024 orders (acts like INNER)\n" +
        "SELECT c.*, o.id\n" +
        "FROM customer c LEFT JOIN orders o ON o.cust_id = c.id\n" +
        "WHERE o.year = 2024;\n\n" +
        "-- keeps all customers; condition in ON\n" +
        "SELECT c.*, o.id\n" +
        "FROM customer c LEFT JOIN orders o\n" +
        "  ON o.cust_id = c.id AND o.year = 2024;",
      tip: "Rule of thumb: conditions on the <i>outer</i> (preserved) table go in WHERE; conditions on the <i>optional</i> table go in ON."
    },
    {
      id: "self-join",
      group: "Joins & Set Operations",
      q: "What is a SELF JOIN and when do you use one?",
      difficulty: "Core",
      tags: ["self join", "hierarchy"],
      a:
        "<p><b>A self join joins a table to itself</b> using table aliases, to compare rows within the same table. Classic uses: employee↔manager hierarchies, finding pairs, comparing a row to its predecessor.</p>",
      code:
        "SELECT e.name AS employee, m.name AS manager\n" +
        "FROM employee e\n" +
        "LEFT JOIN employee m ON e.manager_id = m.id;",
      tip: "Always alias both sides clearly (e / m). The LEFT join variant keeps the top of the hierarchy (the CEO with a NULL manager)."
    },
    {
      id: "cross-join",
      group: "Joins & Set Operations",
      q: "What is a CROSS JOIN?",
      difficulty: "Core",
      tags: ["cross join", "cartesian"],
      a:
        "<p><b>A CROSS JOIN returns the Cartesian product</b> — every row of the left table paired with every row of the right. m × n rows, no join condition.</p>" +
        "<p>Deliberate uses: generating a calendar × stores grid, or all size/colour combinations. An <i>accidental</i> cross join (a missing join predicate) is a classic cause of runaway result sets.</p>",
      tip: "If a query returns far more rows than expected, suspect an accidental cross join from a forgotten ON condition."
    },
    {
      id: "union-vs-join",
      group: "Joins & Set Operations",
      q: "Difference between UNION and JOIN?",
      difficulty: "Core",
      tags: ["union", "join"],
      a:
        "<ul>" +
        "<li><b>JOIN</b> combines tables <b>horizontally</b> — it adds columns, matching rows on a condition.</li>" +
        "<li><b>UNION</b> combines result sets <b>vertically</b> — it stacks rows, requiring matching column counts/types.</li>" +
        "</ul>" +
        "<p>Use a JOIN to enrich rows with related data; use UNION to append one set of rows to another.</p>",
      tip: "\"JOIN widens, UNION lengthens\" is the one-liner."
    },
    {
      id: "intersect-except",
      group: "Joins & Set Operations",
      q: "What do INTERSECT and EXCEPT / MINUS do?",
      difficulty: "Core",
      tags: ["intersect", "except", "minus", "set"],
      a:
        "<ul>" +
        "<li><b>INTERSECT</b> — rows present in <i>both</i> result sets (de-duplicated).</li>" +
        "<li><b>EXCEPT</b> (Oracle: <b>MINUS</b>) — rows in the first set that are <i>not</i> in the second.</li>" +
        "</ul>" +
        "<p>Both are set operators, so they remove duplicates and need union-compatible columns. They're a clean, NULL-safe alternative to some <code>IN</code>/<code>NOT IN</code> patterns.</p>",
      tip: "MySQL only gained INTERSECT/EXCEPT in 8.0.31 — for older MySQL you emulate them with joins or EXISTS, which is a good thing to mention."
    },

    // ───────────────────── G4 · Aggregation, GROUP BY & Filtering ─────────────────────
    {
      id: "group-by",
      group: "Aggregation, GROUP BY & Filtering",
      q: "What does GROUP BY do, and what's the rule about the SELECT list?",
      difficulty: "Core",
      tags: ["group by", "aggregate"],
      a:
        "<p><b>GROUP BY collapses rows that share the grouping key into one row per group</b>, so aggregate functions (<code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code>) can summarise each group.</p>" +
        "<p><b>The rule:</b> every column in the SELECT list must either be in the GROUP BY or be wrapped in an aggregate. (MySQL historically let you break this with <code>ONLY_FULL_GROUP_BY</code> off, returning arbitrary values — standard SQL and most engines reject it.)</p>",
      tip: "If asked why a query errors with \"column must appear in GROUP BY\", it's this rule — a non-aggregated column with no grouping is ambiguous."
    },
    {
      id: "count-star-vs-count-col",
      group: "Aggregation, GROUP BY & Filtering",
      q: "Difference between COUNT(*), COUNT(1), COUNT(column) and COUNT(DISTINCT column)?",
      difficulty: "Deep",
      tags: ["count", "null", "distinct"],
      a:
        "<ul>" +
        "<li><b>COUNT(*)</b> — counts rows, including those with NULLs. Fastest/most direct.</li>" +
        "<li><b>COUNT(1)</b> — identical to <code>COUNT(*)</code> in every modern optimizer; the <code>1</code> is just a non-null constant. No performance difference.</li>" +
        "<li><b>COUNT(column)</b> — counts rows where that column is <b>NOT NULL</b>.</li>" +
        "<li><b>COUNT(DISTINCT column)</b> — counts distinct non-null values.</li>" +
        "</ul>",
      tip: "The COUNT(*) vs COUNT(1) \"performance\" debate is a myth — they're the same plan. The real distinction is COUNT(column) skipping NULLs."
    },
    {
      id: "aggregate-nulls",
      group: "Aggregation, GROUP BY & Filtering",
      q: "How do aggregate functions treat NULLs?",
      difficulty: "Deep",
      tags: ["aggregate", "null", "avg"],
      a:
        "<p><b>Aggregates (except <code>COUNT(*)</code>) ignore NULLs.</b> That matters most for <code>AVG</code>: <code>AVG(col)</code> divides the sum by the count of <i>non-null</i> values, not the total row count.</p>" +
        "<p>So if you want NULLs treated as 0 in an average, convert them first with <code>COALESCE(col, 0)</code> — otherwise the denominator is different from what you expect.</p>",
      code:
        "-- rows: 10, 20, NULL\n" +
        "SELECT AVG(x)              FROM t;  -- 15  (ignores NULL)\n" +
        "SELECT AVG(COALESCE(x,0)) FROM t;  -- 10  (counts NULL as 0)",
      tip: "This is a favourite \"gotcha\" — AVG over a column with NULLs rarely equals SUM/COUNT(*)."
    },
    {
      id: "having-without-group",
      group: "Aggregation, GROUP BY & Filtering",
      q: "Can you use HAVING without GROUP BY?",
      difficulty: "Deep",
      tags: ["having", "group by"],
      a:
        "<p>Yes. Without <code>GROUP BY</code>, the whole result is treated as <b>one group</b>, so <code>HAVING</code> filters that single aggregate group.</p>" +
        "<code>SELECT SUM(amount) FROM sales HAVING SUM(amount) &gt; 1000000;</code>" +
        "<p>It returns the row only if the grand total exceeds the threshold. Uncommon, but valid and occasionally handy.</p>",
      tip: "Rare in practice, but saying \"yes — the entire table becomes a single implicit group\" shows you understand what HAVING actually filters."
    },
    {
      id: "rollup-grouping-sets",
      group: "Aggregation, GROUP BY & Filtering",
      q: "What do ROLLUP, CUBE and GROUPING SETS do?",
      difficulty: "Deep",
      tags: ["rollup", "cube", "grouping sets"],
      a:
        "<p>They produce <b>multiple grouping levels in one query</b> — the stuff of subtotals and reports.</p>" +
        "<ul>" +
        "<li><b>ROLLUP(a, b)</b> — adds subtotals rolling up a hierarchy: by (a,b), then by (a), then the grand total.</li>" +
        "<li><b>CUBE(a, b)</b> — all combinations: (a,b), (a), (b), and grand total.</li>" +
        "<li><b>GROUPING SETS</b> — you list exactly which groupings you want.</li>" +
        "</ul>",
      code:
        "SELECT region, product, SUM(sales)\n" +
        "FROM s\n" +
        "GROUP BY ROLLUP(region, product);  -- detail + per-region + grand total",
      tip: "Mention <code>GROUPING()</code> — it flags which rows are subtotal rows so you can label them instead of showing a confusing NULL."
    },
    {
      id: "string-agg",
      group: "Aggregation, GROUP BY & Filtering",
      q: "How do you concatenate values across rows (string aggregation)?",
      difficulty: "Core",
      tags: ["string_agg", "group_concat", "listagg"],
      a:
        "<p>Each engine has its own function, all doing the same thing — collapse a column's values in a group into one delimited string:</p>" +
        "<ul>" +
        "<li>PostgreSQL / SQL Server 2017+: <code>STRING_AGG(name, ', ')</code></li>" +
        "<li>MySQL: <code>GROUP_CONCAT(name SEPARATOR ', ')</code></li>" +
        "<li>Oracle: <code>LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name)</code></li>" +
        "</ul>",
      tip: "Know at least two dialects' names — interviewers often ask \"how would you do this in <engine>?\" after the generic answer."
    },

    // ───────────────────── G5 · Subqueries & CTEs ─────────────────────
    {
      id: "correlated-vs-noncorrelated",
      group: "Subqueries & CTEs",
      q: "Difference between a correlated and a non-correlated subquery?",
      difficulty: "Deep",
      tags: ["subquery", "correlated"],
      a:
        "<ul>" +
        "<li><b>Non-correlated</b> — the inner query is independent; it runs once and its result feeds the outer query. <code>WHERE salary &gt; (SELECT AVG(salary) FROM employee)</code>.</li>" +
        "<li><b>Correlated</b> — the inner query references a column from the outer query, so it's (conceptually) re-evaluated per outer row. <code>WHERE salary &gt; (SELECT AVG(salary) FROM employee e2 WHERE e2.dept_id = e.dept_id)</code>.</li>" +
        "</ul>",
      tip: "Correlated = \"depends on the outer row, runs per row\"; non-correlated = \"stands alone, runs once.\" Note modern optimizers often rewrite correlated subqueries into joins, so \"per row\" is logical, not always physical."
    },
    {
      id: "in-vs-exists",
      group: "Subqueries & CTEs",
      q: "Difference between IN and EXISTS (and NOT IN vs NOT EXISTS)?",
      difficulty: "Deep",
      tags: ["in", "exists", "null"],
      a:
        "<ul>" +
        "<li><b>IN</b> compares a value against a materialised list/subquery result. Fine for small lists.</li>" +
        "<li><b>EXISTS</b> returns true as soon as the subquery yields one row — it short-circuits, often better for large correlated checks.</li>" +
        "<li><b>The big trap:</b> <code>NOT IN</code> with a subquery that returns <b>any NULL</b> yields <i>no rows at all</i>, because the comparison becomes UNKNOWN. <code>NOT EXISTS</code> is NULL-safe — prefer it.</li>" +
        "</ul>",
      code:
        "-- NULL-safe \"customers who never ordered\"\n" +
        "SELECT c.*\n" +
        "FROM customer c\n" +
        "WHERE NOT EXISTS (\n" +
        "  SELECT 1 FROM orders o WHERE o.cust_id = c.id);",
      tip: "The NOT IN + NULL footgun is one of the most-asked SQL gotchas — always volunteer NOT EXISTS as the safe default."
    },
    {
      id: "what-is-cte",
      group: "Subqueries & CTEs",
      q: "What is a CTE (Common Table Expression) and why use one?",
      difficulty: "Core",
      tags: ["cte", "with"],
      a:
        "<p><b>A CTE is a named, temporary result set defined with <code>WITH</code> that exists for the duration of one statement.</b> It makes complex queries readable by naming intermediate steps, and it can be referenced multiple times and be recursive.</p>",
      code:
        "WITH dept_avg AS (\n" +
        "  SELECT dept_id, AVG(salary) AS avg_sal\n" +
        "  FROM employee GROUP BY dept_id\n" +
        ")\n" +
        "SELECT e.name, e.salary\n" +
        "FROM employee e JOIN dept_avg d ON d.dept_id = e.dept_id\n" +
        "WHERE e.salary > d.avg_sal;",
      tip: "Sell CTEs on <i>readability</i> first. Note that in some engines (older PostgreSQL ≤11) a CTE was an optimization fence (materialized); modern PostgreSQL inlines non-recursive CTEs by default."
    },
    {
      id: "cte-vs-subquery",
      group: "Subqueries & CTEs",
      q: "When would you use a CTE instead of a subquery?",
      difficulty: "Deep",
      tags: ["cte", "subquery", "readability"],
      a:
        "<ul>" +
        "<li><b>Reuse</b> — a CTE can be referenced several times in the same query; a derived-table subquery would have to be repeated.</li>" +
        "<li><b>Readability</b> — chained CTEs read top-to-bottom like steps, versus deeply nested subqueries.</li>" +
        "<li><b>Recursion</b> — only a recursive CTE can walk a hierarchy; a plain subquery can't.</li>" +
        "</ul>" +
        "<p>For a one-off, single-use filter, a simple subquery is perfectly fine.</p>",
      tip: "Don't claim CTEs are faster — they're about clarity and capability; performance is optimizer-dependent."
    },
    {
      id: "recursive-cte",
      group: "Subqueries & CTEs",
      q: "What is a recursive CTE and how is it structured?",
      difficulty: "Deep",
      tags: ["recursive", "cte", "hierarchy"],
      a:
        "<p><b>A recursive CTE references itself to walk hierarchical or graph data</b> — org charts, folder trees, bill-of-materials. It has two parts joined by <code>UNION ALL</code>:</p>" +
        "<ul>" +
        "<li><b>Anchor</b> — the starting rows (e.g. the top manager).</li>" +
        "<li><b>Recursive member</b> — joins the CTE back to the base table to fetch the next level, until no new rows are produced.</li>" +
        "</ul>",
      code:
        "WITH RECURSIVE chain AS (\n" +
        "  SELECT id, name, manager_id, 1 AS lvl\n" +
        "  FROM employee WHERE manager_id IS NULL      -- anchor\n" +
        "  UNION ALL\n" +
        "  SELECT e.id, e.name, e.manager_id, c.lvl+1\n" +
        "  FROM employee e JOIN chain c ON e.manager_id = c.id  -- recurse\n" +
        ")\n" +
        "SELECT * FROM chain;",
      tip: "Always have a termination guarantee. For cyclic graphs, track visited ids (or use a depth cap) to avoid infinite recursion."
    },

    // ───────────────────── G6 · Window Functions & Ranking ─────────────────────
    {
      id: "what-are-window-functions",
      group: "Window Functions & Ranking",
      q: "What are window functions and how do they differ from GROUP BY aggregates?",
      difficulty: "Core",
      tags: ["window", "over", "partition"],
      a:
        "<p><b>A window function computes a value across a set of rows related to the current row — without collapsing them.</b> Unlike <code>GROUP BY</code>, which returns one row per group, a window function returns a value <i>alongside every original row</i>.</p>" +
        "<p>Defined with <code>OVER (PARTITION BY ... ORDER BY ...)</code>: PARTITION BY sets the groups, ORDER BY sets order within each.</p>",
      code:
        "SELECT name, dept_id, salary,\n" +
        "       AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg\n" +
        "FROM employee;  -- every row keeps its identity + the dept average",
      tip: "The one-liner: <i>\"aggregates collapse rows; window functions keep them.\"</i> That single sentence answers the question."
    },
    {
      id: "rank-dense-rownumber",
      group: "Window Functions & Ranking",
      q: "Difference between ROW_NUMBER(), RANK() and DENSE_RANK()?",
      difficulty: "Core",
      tags: ["row_number", "rank", "dense_rank"],
      a:
        "<p>All assign numbers within a partition ordered by some column; they differ on ties:</p>" +
        "<ul>" +
        "<li><b>ROW_NUMBER()</b> — unique sequential numbers; ties broken arbitrarily. (1,2,3,4)</li>" +
        "<li><b>RANK()</b> — ties share a rank, then it <b>skips</b>. (1,2,2,4)</li>" +
        "<li><b>DENSE_RANK()</b> — ties share a rank, <b>no gaps</b>. (1,2,2,3)</li>" +
        "</ul>",
      tip: "Nth-highest-salary questions hinge on this: use DENSE_RANK when you want the \"Nth distinct value\" and tied people to all count as the same rank."
    },
    {
      id: "lead-lag",
      group: "Window Functions & Ranking",
      q: "What do LAG() and LEAD() do?",
      difficulty: "Core",
      tags: ["lag", "lead", "window"],
      a:
        "<p><b>LAG</b> reaches <i>back</i> to a previous row and <b>LEAD</b> reaches <i>forward</i> to a later row, within the ordered partition — perfect for row-over-row comparisons like month-over-month change.</p>",
      code:
        "SELECT month, revenue,\n" +
        "       revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change\n" +
        "FROM monthly;",
      tip: "Both take optional offset and default args: <code>LAG(revenue, 1, 0)</code> looks back one row and returns 0 instead of NULL for the first row."
    },
    {
      id: "running-total",
      group: "Window Functions & Ranking",
      q: "How do you compute a running total or moving average?",
      difficulty: "Deep",
      tags: ["running total", "frame", "rows between"],
      a:
        "<p>Use an aggregate as a window function with a <b>frame</b> clause (<code>ROWS BETWEEN</code>).</p>" +
        "<ul>" +
        "<li><b>Running total</b>: <code>SUM(x) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code>.</li>" +
        "<li><b>3-row moving average</b>: <code>AVG(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code>.</li>" +
        "</ul>",
      tip: "Know the ROWS vs RANGE distinction: ROWS counts physical rows; RANGE groups peers with equal ORDER BY values (and is the default frame, which surprises people)."
    },
    {
      id: "rows-vs-range",
      group: "Window Functions & Ranking",
      q: "Difference between ROWS and RANGE in a window frame?",
      difficulty: "Deep",
      tags: ["rows", "range", "frame"],
      a:
        "<ul>" +
        "<li><b>ROWS</b> — a physical count of rows around the current row (e.g. the 2 rows before it), regardless of their values.</li>" +
        "<li><b>RANGE</b> — a logical range based on the ORDER BY value; all rows that are \"peers\" (same ordering value) are treated together.</li>" +
        "</ul>" +
        "<p>The default frame when you specify ORDER BY but no frame is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> — which can double-count ties in a running total. Specify <code>ROWS</code> when you want exact per-row behaviour.</p>",
      tip: "A running total that looks \"wrong\" on tied dates is almost always the default RANGE frame — switch to ROWS."
    },
    {
      id: "window-in-where",
      group: "Window Functions & Ranking",
      q: "Why can't you filter on a window function in WHERE, and what's the fix?",
      difficulty: "Deep",
      tags: ["window", "where", "qualify"],
      a:
        "<p>Window functions are evaluated <b>after</b> WHERE/GROUP BY/HAVING (around the SELECT stage), so the alias doesn't exist yet when WHERE runs. Wrap the query in a subquery/CTE and filter outside:</p>",
      code:
        "WITH ranked AS (\n" +
        "  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn\n" +
        "  FROM employee\n" +
        ")\n" +
        "SELECT * FROM ranked WHERE rn <= 3;  -- top 3 per dept",
      tip: "Some engines (Snowflake, BigQuery, DuckDB, Teradata) offer <code>QUALIFY</code> to filter window results inline — a nice detail to drop if the role uses those."
    },

    // ───────────────────── G7 · Indexes & Performance ─────────────────────
    {
      id: "what-is-index",
      group: "Indexes & Performance",
      q: "What is an index and what's the trade-off?",
      difficulty: "Core",
      tags: ["index", "b-tree", "performance"],
      a:
        "<p><b>An index is an auxiliary data structure (usually a B-tree) that lets the engine find rows without scanning the whole table</b> — like a book's index. It speeds up <code>WHERE</code>, <code>JOIN</code> and <code>ORDER BY</code> lookups on the indexed columns.</p>" +
        "<p><b>The trade-off:</b> indexes cost storage and <b>slow down writes</b> (every INSERT/UPDATE/DELETE must maintain them). Index the columns you filter/join on; don't index everything.</p>",
      tip: "Always state the write cost — candidates who only mention \"indexes make things faster\" miss half the picture."
    },
    {
      id: "clustered-vs-nonclustered",
      group: "Indexes & Performance",
      q: "Difference between a clustered and a non-clustered index?",
      difficulty: "Deep",
      tags: ["clustered", "non-clustered", "index"],
      a:
        "<ul>" +
        "<li><b>Clustered</b> — defines the <b>physical order</b> of the table's rows; the table <i>is</i> the index's leaf level. One per table (SQL Server auto-creates it on the PK). Range scans on the clustering key are very fast.</li>" +
        "<li><b>Non-clustered</b> — a separate structure holding the key + a pointer (row locator / clustering key) back to the row. Many per table.</li>" +
        "</ul>" +
        "<p>Terminology varies: MySQL/InnoDB calls the primary-key index the clustered index; PostgreSQL heap tables have no permanent clustered index (CLUSTER is a one-time reorder).</p>",
      tip: "Clustered = the table sorted by that key; non-clustered = a lookup list pointing into it. There can be only one physical order, hence one clustered index."
    },
    {
      id: "composite-index-order",
      group: "Indexes & Performance",
      q: "Does column order matter in a composite index?",
      difficulty: "Deep",
      tags: ["composite index", "leftmost prefix"],
      a:
        "<p><b>Yes — a composite index can only be used for queries that filter on a <i>leftmost prefix</i> of its columns.</b> An index on <code>(a, b)</code> helps queries on <code>a</code> or on <code>a AND b</code>, but generally <b>not</b> a query on <code>b</code> alone.</p>" +
        "<p>Put the most selective / most-frequently-filtered column first, and match the order to your common query and ORDER BY patterns.</p>",
      code:
        "CREATE INDEX ix ON orders (cust_id, order_date);\n" +
        "-- uses ix:  WHERE cust_id = 7\n" +
        "-- uses ix:  WHERE cust_id = 7 AND order_date > '2024-01-01'\n" +
        "-- can't:    WHERE order_date > '2024-01-01'   (skips leading col)",
      tip: "\"Leftmost prefix rule\" is the exact phrase interviewers want to hear."
    },
    {
      id: "index-scan-vs-seek",
      group: "Indexes & Performance",
      q: "Difference between an index seek, index scan and table scan?",
      difficulty: "Deep",
      tags: ["seek", "scan", "plan"],
      a:
        "<ul>" +
        "<li><b>Index seek</b> — navigates the B-tree straight to the matching rows. Fast; the goal for selective predicates.</li>" +
        "<li><b>Index scan</b> — reads the whole index. Useful when most rows qualify or the index covers the query, but it's reading everything.</li>" +
        "<li><b>Table/heap scan</b> — reads every row of the table with no index help. Fine for small tables; a red flag on big ones.</li>" +
        "</ul>",
      tip: "Order of preference for a selective query: seek > scan > table scan. If you expected a seek and got a scan, suspect a non-sargable predicate."
    },
    {
      id: "sargable",
      group: "Indexes & Performance",
      q: "What is a sargable query, and why do functions on columns hurt?",
      difficulty: "Deep",
      tags: ["sargable", "index", "function"],
      a:
        "<p><b>Sargable</b> = \"Search ARGument ABLE\" — a predicate the engine can satisfy with an index seek. Wrapping the indexed column in a function or computation usually makes it <b>non-sargable</b>, forcing a scan.</p>",
      code:
        "-- non-sargable: function on the column\n" +
        "WHERE YEAR(hire_date) = 2024\n\n" +
        "-- sargable: a range the index can seek\n" +
        "WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01'",
      tip: "Same idea applies to leading wildcards (<code>LIKE '%foo'</code> can't seek) and implicit type conversions on the column. Keep the column \"bare\" on one side of the comparison."
    },
    {
      id: "covering-index",
      group: "Indexes & Performance",
      q: "What is a covering index?",
      difficulty: "Deep",
      tags: ["covering index", "include"],
      a:
        "<p><b>A covering index contains every column a query needs</b> (in the key, or in <code>INCLUDE</code>d columns), so the engine answers the query entirely from the index without touching the table — no \"key lookup\" back to the heap/clustered index.</p>",
      code:
        "-- covers: SELECT order_date, amount WHERE cust_id = ?\n" +
        "CREATE INDEX ix ON orders (cust_id) INCLUDE (order_date, amount);",
      tip: "Great for hot read queries, but every included column widens the index and adds write cost — cover the few queries that matter, not all of them."
    },
    {
      id: "optimize-slow-query",
      group: "Indexes & Performance",
      q: "How do you approach optimizing a slow query?",
      difficulty: "Deep",
      tags: ["optimization", "explain", "plan"],
      a:
        "<ol>" +
        "<li><b>Read the execution plan</b> (<code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code> / showplan) — find scans, spools, sorts, and bad row estimates.</li>" +
        "<li><b>Index the predicates</b> you filter/join/sort on; make them sargable.</li>" +
        "<li><b>Select only needed columns</b> — avoid <code>SELECT *</code>; enable covering indexes.</li>" +
        "<li><b>Fix the shape</b> — replace <code>NOT IN</code> with <code>NOT EXISTS</code>, correlated subqueries with joins, OR-chains with UNION ALL where it helps.</li>" +
        "<li><b>Update statistics</b> so the optimizer estimates cardinality correctly; consider partitioning for huge tables.</li>" +
        "</ol>",
      tip: "Always start with \"look at the execution plan.\" Guessing at indexes without reading the plan is the junior answer."
    },

    // ───────────────────── G8 · Normalization & Design ─────────────────────
    {
      id: "what-is-normalization",
      group: "Normalization & Design",
      q: "What is normalization and why do it?",
      difficulty: "Core",
      tags: ["normalization", "redundancy", "anomalies"],
      a:
        "<p><b>Normalization is organising columns into tables to minimise redundancy and the update/insert/delete anomalies it causes.</b> You split wide, repeating tables into related ones connected by keys.</p>" +
        "<ul>" +
        "<li><b>Update anomaly</b> — a fact stored in many rows must be changed in all of them.</li>" +
        "<li><b>Insertion anomaly</b> — you can't record one fact without another.</li>" +
        "<li><b>Deletion anomaly</b> — deleting a row loses unrelated information.</li>" +
        "</ul>",
      tip: "Frame it as \"store each fact once.\" The three anomalies are the concrete payoff — name at least one."
    },
    {
      id: "1nf-2nf-3nf",
      group: "Normalization & Design",
      q: "Explain 1NF, 2NF and 3NF.",
      difficulty: "Deep",
      tags: ["1nf", "2nf", "3nf", "normal forms"],
      a:
        "<ul>" +
        "<li><b>1NF</b> — atomic values, no repeating groups or arrays in a column; each row unique.</li>" +
        "<li><b>2NF</b> — 1NF <i>and</i> no <b>partial dependency</b>: every non-key column depends on the <i>whole</i> composite key, not part of it.</li>" +
        "<li><b>3NF</b> — 2NF <i>and</i> no <b>transitive dependency</b>: non-key columns depend on the key, not on other non-key columns.</li>" +
        "</ul>",
      tip: "The classic mnemonic: \"each non-key column depends on <b>the key</b> (1NF), <b>the whole key</b> (2NF), and <b>nothing but the key</b> (3NF) — so help me Codd.\""
    },
    {
      id: "bcnf",
      group: "Normalization & Design",
      q: "What is BCNF and how does it differ from 3NF?",
      difficulty: "Deep",
      tags: ["bcnf", "normal forms"],
      a:
        "<p><b>BCNF (Boyce-Codd Normal Form) is a stricter 3NF:</b> for <i>every</i> functional dependency X → Y, X must be a <b>superkey</b>. 3NF tolerates a few cases BCNF doesn't — specifically when a non-prime attribute determines part of a candidate key.</p>" +
        "<p>In practice, most 3NF tables are already BCNF; the difference shows up only with overlapping candidate keys.</p>",
      tip: "Keep it short: \"BCNF = every determinant is a superkey.\" Only go deeper if pressed."
    },
    {
      id: "denormalization",
      group: "Normalization & Design",
      q: "What is denormalization and when is it appropriate?",
      difficulty: "Deep",
      tags: ["denormalization", "warehouse", "read"],
      a:
        "<p><b>Denormalization deliberately adds redundancy</b> (duplicated columns, pre-joined/pre-aggregated tables) to speed up reads by avoiding joins — trading write complexity and storage for query performance.</p>" +
        "<p>Appropriate for <b>read-heavy analytical workloads</b> (data warehouses, reporting, star schemas) where joins are expensive and data changes in controlled batches.</p>",
      tip: "Position it as a deliberate trade-off, not sloppiness: \"normalize for OLTP integrity; denormalize for OLAP read speed.\""
    },
    {
      id: "star-vs-snowflake",
      group: "Normalization & Design",
      q: "Star schema vs snowflake schema?",
      difficulty: "Deep",
      tags: ["star", "snowflake", "dimensional"],
      a:
        "<ul>" +
        "<li><b>Star</b> — a central <b>fact</b> table surrounded by <b>denormalized dimension</b> tables. Fewer joins, simpler, faster for BI queries.</li>" +
        "<li><b>Snowflake</b> — dimensions are <b>normalized</b> into sub-dimensions. Less redundancy, but more joins and complexity.</li>" +
        "</ul>",
      tip: "Star is the default for analytics/BI because join simplicity usually beats the storage saved by snowflaking."
    },

    // ───────────────────── G9 · Transactions, ACID & Concurrency ─────────────────────
    {
      id: "what-is-transaction",
      group: "Transactions, ACID & Concurrency",
      q: "What is a transaction?",
      difficulty: "Core",
      tags: ["transaction", "commit", "rollback"],
      a:
        "<p><b>A transaction is a unit of work that executes all-or-nothing.</b> You group statements between a begin and a <code>COMMIT</code> (make permanent) or <code>ROLLBACK</code> (undo). The textbook example is a bank transfer: debit one account and credit another must both happen or neither.</p>",
      code:
        "BEGIN;\n" +
        "UPDATE account SET bal = bal - 100 WHERE id = 1;\n" +
        "UPDATE account SET bal = bal + 100 WHERE id = 2;\n" +
        "COMMIT;  -- or ROLLBACK to undo both",
      tip: "Lead into ACID — transactions are the mechanism, ACID is the set of guarantees they provide."
    },
    {
      id: "acid",
      group: "Transactions, ACID & Concurrency",
      q: "Explain the ACID properties.",
      difficulty: "Core",
      tags: ["acid", "atomicity", "isolation", "durability"],
      a:
        "<ul>" +
        "<li><b>Atomicity</b> — all statements commit or none do.</li>" +
        "<li><b>Consistency</b> — a transaction moves the DB from one valid state to another, respecting all constraints.</li>" +
        "<li><b>Isolation</b> — concurrent transactions don't see each other's partial work (degree set by the isolation level).</li>" +
        "<li><b>Durability</b> — once committed, changes survive crashes (via the write-ahead/transaction log).</li>" +
        "</ul>",
      tip: "Give one crisp phrase each. Then be ready for the deep follow-up: Isolation is the property that varies by level."
    },
    {
      id: "isolation-levels",
      group: "Transactions, ACID & Concurrency",
      q: "What are the isolation levels and the anomalies they prevent?",
      difficulty: "Deep",
      tags: ["isolation", "dirty read", "phantom"],
      a:
        "<p>From weakest to strongest, each level prevents more read anomalies:</p>" +
        "<ul>" +
        "<li><b>READ UNCOMMITTED</b> — allows <b>dirty reads</b> (seeing others' uncommitted changes).</li>" +
        "<li><b>READ COMMITTED</b> — no dirty reads; still allows <b>non-repeatable reads</b>. (Default in PostgreSQL/Oracle/SQL Server.)</li>" +
        "<li><b>REPEATABLE READ</b> — rows you read won't change; may still allow <b>phantom</b> rows. (Default in MySQL/InnoDB.)</li>" +
        "<li><b>SERIALIZABLE</b> — transactions behave as if run one at a time; prevents phantoms too.</li>" +
        "</ul>",
      tip: "Memorise the grid: dirty read → non-repeatable read → phantom are removed as you climb the levels. Stronger isolation = more locking/aborts = less concurrency."
    },
    {
      id: "deadlock",
      group: "Transactions, ACID & Concurrency",
      q: "What is a deadlock and how do you avoid it?",
      difficulty: "Deep",
      tags: ["deadlock", "locking"],
      a:
        "<p><b>A deadlock is two+ transactions each holding a lock the other needs, so neither can proceed.</b> The engine detects the cycle and kills one as the \"victim,\" which then retries.</p>" +
        "<p>Reduce them by:</p>" +
        "<ul>" +
        "<li>Accessing tables/rows in a <b>consistent order</b> everywhere.</li>" +
        "<li>Keeping transactions <b>short</b>; never wait on user input mid-transaction.</li>" +
        "<li>Using appropriate indexes so locks are narrow (row, not range/table).</li>" +
        "<li>Retrying the victim transaction in application code.</li>" +
        "</ul>",
      tip: "\"Consistent lock ordering + short transactions + retry logic\" is the three-part answer interviewers want."
    },
    {
      id: "savepoint",
      group: "Transactions, ACID & Concurrency",
      q: "What is a SAVEPOINT?",
      difficulty: "Core",
      tags: ["savepoint", "partial rollback"],
      a:
        "<p><b>A SAVEPOINT is a named marker inside a transaction you can roll back to without undoing the whole transaction</b> — a partial rollback. Useful when a later step might fail but you want to keep earlier work.</p>",
      code:
        "BEGIN;\n" +
        "INSERT INTO t ...;\n" +
        "SAVEPOINT sp1;\n" +
        "UPDATE t ...;            -- oops\n" +
        "ROLLBACK TO sp1;         -- undo only the UPDATE\n" +
        "COMMIT;                  -- the INSERT still commits",
      tip: "Contrast with a full ROLLBACK: SAVEPOINT = selective undo to a checkpoint, not the whole transaction."
    },
    {
      id: "optimistic-vs-pessimistic",
      group: "Transactions, ACID & Concurrency",
      q: "Optimistic vs pessimistic concurrency control?",
      difficulty: "Deep",
      tags: ["optimistic", "pessimistic", "locking", "mvcc"],
      a:
        "<ul>" +
        "<li><b>Pessimistic</b> — lock the data while you work so no one else can change it (<code>SELECT ... FOR UPDATE</code>). Prevents conflicts but reduces concurrency and risks deadlocks.</li>" +
        "<li><b>Optimistic</b> — don't lock; at commit, check a <b>version/timestamp</b> column to see if someone changed the row, and retry if so. Great when conflicts are rare.</li>" +
        "</ul>" +
        "<p>Many engines also use <b>MVCC</b> (multi-version concurrency control) so readers never block writers and vice versa.</p>",
      tip: "Mention MVCC — it's why PostgreSQL/Oracle/InnoDB readers don't block writers, a common follow-up."
    },

    // ───────────────────── G10 · Views, Procedures, Functions & Triggers ─────────────────────
    {
      id: "what-is-view",
      group: "Views, Procedures, Functions & Triggers",
      q: "What is a view, and what is a materialized view?",
      difficulty: "Core",
      tags: ["view", "materialized view"],
      a:
        "<ul>" +
        "<li><b>View</b> — a named stored query; a <b>virtual table</b> that holds no data and runs its SELECT each time you query it. Simplifies complex queries and restricts column/row access.</li>" +
        "<li><b>Materialized view</b> — <b>stores the result</b> physically and must be refreshed (on demand or schedule). Faster reads, but can be stale and costs storage.</li>" +
        "</ul>",
      tip: "View = always fresh, computed on read; materialized view = precomputed, fast, possibly stale. The staleness/refresh trade-off is the key point."
    },
    {
      id: "updatable-view",
      group: "Views, Procedures, Functions & Triggers",
      q: "Can you update data through a view?",
      difficulty: "Deep",
      tags: ["view", "updatable"],
      a:
        "<p>Sometimes. A view is <b>updatable</b> only if it maps unambiguously to rows in one base table — roughly: no aggregation, <code>DISTINCT</code>, <code>GROUP BY</code>, joins (in most engines), or computed columns being written.</p>" +
        "<p>For complex views, engines offer <b>INSTEAD OF triggers</b> (SQL Server/Oracle) that translate the DML into operations on the base tables.</p>",
      tip: "Short answer: \"only simple single-table views; otherwise use INSTEAD OF triggers.\""
    },
    {
      id: "proc-vs-function",
      group: "Views, Procedures, Functions & Triggers",
      q: "Difference between a stored procedure and a function?",
      difficulty: "Deep",
      tags: ["stored procedure", "function", "udf"],
      a:
        "<ul>" +
        "<li><b>Function (UDF)</b> — returns a value (scalar or table), is meant to be used <b>inside</b> a query (SELECT/WHERE), generally can't perform DML or transaction control, and should be deterministic/side-effect-free.</li>" +
        "<li><b>Stored procedure</b> — a callable routine that <b>can</b> do DML, manage transactions, return multiple result sets, and take OUT parameters; you <code>CALL</code>/<code>EXEC</code> it, you don't embed it in a SELECT.</li>" +
        "</ul>",
      tip: "Crux: \"functions return values and go inside queries; procedures perform actions and are called on their own.\" Also note scalar UDFs can be a performance trap when called per-row."
    },
    {
      id: "what-is-trigger",
      group: "Views, Procedures, Functions & Triggers",
      q: "What is a trigger and when would you use one?",
      difficulty: "Core",
      tags: ["trigger", "before", "after"],
      a:
        "<p><b>A trigger is procedural code that fires automatically in response to INSERT/UPDATE/DELETE</b> (or sometimes DDL) on a table. <b>BEFORE</b> triggers can validate/modify the row pre-write; <b>AFTER</b> triggers react post-write.</p>" +
        "<p>Uses: auditing/history tables, enforcing complex rules, maintaining derived/denormalized columns.</p>",
      tip: "Flag the downside interviewers want to hear: triggers are \"hidden\" side effects — hard to debug and easy to make slow; prefer constraints/app logic when they suffice."
    },
    {
      id: "what-is-cursor",
      group: "Views, Procedures, Functions & Triggers",
      q: "What is a cursor, and why avoid it?",
      difficulty: "Deep",
      tags: ["cursor", "row-by-row", "set-based"],
      a:
        "<p><b>A cursor processes a result set one row at a time</b> in procedural code. It's occasionally necessary (complex per-row logic, administrative scripts) but is usually a <b>performance anti-pattern</b> — SQL is set-based and the engine optimizes set operations far better than a row-by-row loop (\"RBAR\": row-by-agonizing-row).</p>",
      tip: "Default answer: \"rewrite it as a set-based statement.\" Reach for a cursor only when the logic genuinely can't be expressed as a set operation."
    },

    // ───────────────────── G11 · Data Types, NULLs & Dates ─────────────────────
    {
      id: "what-is-null",
      group: "Data Types, NULLs & Dates",
      q: "What is NULL, and what does NULL = NULL return?",
      difficulty: "Core",
      tags: ["null", "three-valued logic"],
      a:
        "<p><b>NULL means \"unknown / missing\" — it is not zero and not an empty string.</b> SQL uses <b>three-valued logic</b> (TRUE/FALSE/UNKNOWN), so any comparison with NULL (including <code>NULL = NULL</code>) yields <b>UNKNOWN</b>, which is not TRUE — so the row is filtered out.</p>" +
        "<p>Test for NULL with <code>IS NULL</code> / <code>IS NOT NULL</code>, never <code>= NULL</code>.</p>",
      tip: "\"NULL = NULL is UNKNOWN, not TRUE\" is the exact thing they're checking. Follow up with IS NULL as the correct test."
    },
    {
      id: "coalesce-isnull-nullif",
      group: "Data Types, NULLs & Dates",
      q: "Difference between COALESCE, ISNULL/IFNULL and NULLIF?",
      difficulty: "Core",
      tags: ["coalesce", "isnull", "nullif"],
      a:
        "<ul>" +
        "<li><b>COALESCE(a, b, c, …)</b> — returns the first non-NULL argument; ANSI standard, takes many args.</li>" +
        "<li><b>ISNULL(a, b)</b> (SQL Server) / <b>IFNULL(a, b)</b> (MySQL) / <b>NVL(a, b)</b> (Oracle) — two-arg \"replace NULL with b.\"</li>" +
        "<li><b>NULLIF(a, b)</b> — returns NULL if a = b, else a. Handy to avoid divide-by-zero: <code>x / NULLIF(y, 0)</code>.</li>" +
        "</ul>",
      tip: "Prefer COALESCE for portability + multiple fallbacks. The NULLIF divide-by-zero trick is a nice detail to volunteer."
    },
    {
      id: "date-vs-datetime",
      group: "Data Types, NULLs & Dates",
      q: "Difference between DATE, DATETIME/TIMESTAMP, and how do time zones fit in?",
      difficulty: "Deep",
      tags: ["date", "datetime", "timestamp", "timezone"],
      a:
        "<ul>" +
        "<li><b>DATE</b> — calendar date only, no time.</li>" +
        "<li><b>DATETIME</b> — date + time, usually with no time-zone awareness.</li>" +
        "<li><b>TIMESTAMP WITH TIME ZONE</b> (<code>timestamptz</code>) — a point in time normalized to UTC; the safe choice for global apps.</li>" +
        "</ul>" +
        "<p>Store timestamps in UTC and convert on display. Note MySQL's <code>TIMESTAMP</code> is UTC-based and range-limited (to ~2038), while <code>DATETIME</code> is not.</p>",
      tip: "\"Store UTC, convert at the edges\" is the production-grade answer for the time-zone follow-up."
    },
    {
      id: "date-diff-age",
      group: "Data Types, NULLs & Dates",
      q: "How do you compute the difference between two dates / someone's age?",
      difficulty: "Core",
      tags: ["datediff", "age", "interval"],
      a:
        "<p>Each dialect has its own function; the idea is the same:</p>" +
        "<ul>" +
        "<li>PostgreSQL: <code>AGE(dob)</code>, or <code>EXTRACT(YEAR FROM AGE(dob))</code>; date subtraction returns an interval/days.</li>" +
        "<li>MySQL: <code>TIMESTAMPDIFF(YEAR, dob, CURDATE())</code>, or <code>DATEDIFF()</code> for days.</li>" +
        "<li>SQL Server: <code>DATEDIFF(YEAR, dob, GETDATE())</code> (careful — it counts year boundaries, not full years).</li>" +
        "</ul>",
      tip: "Flag the SQL Server <code>DATEDIFF(YEAR, …)</code> pitfall: it counts calendar-year boundaries crossed, so it over-counts age unless you adjust for whether the birthday has passed."
    },
    {
      id: "implicit-conversion",
      group: "Data Types, NULLs & Dates",
      q: "What is implicit type conversion and why can it hurt performance?",
      difficulty: "Deep",
      tags: ["implicit conversion", "sargable", "collation"],
      a:
        "<p><b>Implicit conversion happens when you compare two different types and the engine silently coerces one.</b> If it has to convert the <i>column</i> side (e.g. comparing a VARCHAR column to an N/numeric literal), the predicate becomes non-sargable and the index can't be used — a classic silent performance killer.</p>" +
        "<p>Fix by matching types: pass parameters as the column's exact type.</p>",
      tip: "Tie it back to sargability — implicit conversion on the column defeats the index the same way a function would."
    },

    // ───────────────────── G12 · Classic Query Patterns ─────────────────────
    {
      id: "nth-highest-salary",
      group: "Classic Query Patterns",
      q: "How do you find the 2nd (or Nth) highest salary?",
      difficulty: "Core",
      tags: ["nth highest", "dense_rank", "limit offset"],
      a:
        "<p>Two clean approaches:</p>" +
        "<ul>" +
        "<li><b>Window function</b> (most robust, handles ties): rank by salary and pick rank = N.</li>" +
        "<li><b>LIMIT / OFFSET</b> on distinct salaries (engine-specific): <code>ORDER BY salary DESC LIMIT 1 OFFSET N-1</code>.</li>" +
        "</ul>",
      code:
        "-- Nth highest DISTINCT salary, tie-safe\n" +
        "WITH r AS (\n" +
        "  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk\n" +
        "  FROM employee\n" +
        ")\n" +
        "SELECT DISTINCT salary FROM r WHERE rnk = 2;  -- 2nd highest",
      tip: "Use DENSE_RANK when \"Nth highest\" means the Nth distinct value and tied earners share a rank. Mention it handles the edge case where N exceeds the number of distinct salaries (returns no row)."
    },
    {
      id: "find-duplicates",
      group: "Classic Query Patterns",
      q: "How do you find duplicate rows / duplicate emails?",
      difficulty: "Core",
      tags: ["duplicates", "group by", "having"],
      a:
        "<p><b>Group by the column(s) that define a duplicate and keep groups with more than one row.</b></p>",
      code:
        "SELECT email, COUNT(*) AS n\n" +
        "FROM users\n" +
        "GROUP BY email\n" +
        "HAVING COUNT(*) > 1;",
      tip: "The GROUP BY + HAVING COUNT(*) > 1 pattern is the canonical answer. For whole-row dupes, group by all relevant columns."
    },
    {
      id: "delete-duplicates",
      group: "Classic Query Patterns",
      q: "How do you delete duplicate rows but keep one copy?",
      difficulty: "Deep",
      tags: ["delete duplicates", "row_number", "cte"],
      a:
        "<p>Number the duplicates with <code>ROW_NUMBER()</code> partitioned by the duplicate key, then delete everything with rn &gt; 1.</p>",
      code:
        "WITH d AS (\n" +
        "  SELECT id,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn\n" +
        "  FROM users\n" +
        ")\n" +
        "DELETE FROM users\n" +
        "WHERE id IN (SELECT id FROM d WHERE rn > 1);",
      tip: "This ROW_NUMBER + delete-where-rn>1 pattern is the modern, portable answer. Always back up / wrap in a transaction before a dedup delete."
    },
    {
      id: "customers-never-ordered",
      group: "Classic Query Patterns",
      q: "How do you find customers who never placed an order?",
      difficulty: "Core",
      tags: ["anti join", "not exists", "left join null"],
      a:
        "<p>An <b>anti-join</b>. Two standard forms:</p>" +
        "<ul>" +
        "<li><b>NOT EXISTS</b> (NULL-safe, usually preferred).</li>" +
        "<li><b>LEFT JOIN … WHERE right IS NULL</b>.</li>" +
        "</ul>",
      code:
        "-- LEFT JOIN anti-join\n" +
        "SELECT c.*\n" +
        "FROM customer c\n" +
        "LEFT JOIN orders o ON o.cust_id = c.id\n" +
        "WHERE o.id IS NULL;",
      tip: "Avoid <code>NOT IN (SELECT cust_id FROM orders)</code> here — a single NULL cust_id makes it return nothing. NOT EXISTS / LEFT-JOIN-IS-NULL are safe."
    },
    {
      id: "employees-earn-more-than-manager",
      group: "Classic Query Patterns",
      q: "How do you find employees who earn more than their manager?",
      difficulty: "Core",
      tags: ["self join", "comparison"],
      a:
        "<p>A <b>self join</b> matching each employee to their manager row, then comparing salaries.</p>",
      code:
        "SELECT e.name\n" +
        "FROM employee e\n" +
        "JOIN employee m ON e.manager_id = m.id\n" +
        "WHERE e.salary > m.salary;",
      tip: "This is the canonical self-join question — the key insight is that employee and manager are two aliases of the same table."
    },
    {
      id: "top-n-per-group",
      group: "Classic Query Patterns",
      q: "How do you get the top-N rows per group (e.g. top 3 earners per department)?",
      difficulty: "Deep",
      tags: ["top n per group", "partition", "row_number"],
      a:
        "<p>Rank within each partition with a window function, then filter the rank in an outer query/CTE.</p>",
      code:
        "WITH r AS (\n" +
        "  SELECT name, dept_id, salary,\n" +
        "         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk\n" +
        "  FROM employee\n" +
        ")\n" +
        "SELECT * FROM r WHERE rnk <= 3;",
      tip: "Choose the ranker by the tie rule you want: ROW_NUMBER for exactly N rows, DENSE_RANK/RANK to include ties at the cutoff."
    },
    {
      id: "pivot",
      group: "Classic Query Patterns",
      q: "How do you pivot rows into columns?",
      difficulty: "Deep",
      tags: ["pivot", "conditional aggregation"],
      a:
        "<p>The portable way is <b>conditional aggregation</b>: one aggregated CASE per target column. (SQL Server/Oracle also have a dedicated <code>PIVOT</code> operator.)</p>",
      code:
        "SELECT dept_id,\n" +
        "  SUM(CASE WHEN gender='M' THEN 1 ELSE 0 END) AS male,\n" +
        "  SUM(CASE WHEN gender='F' THEN 1 ELSE 0 END) AS female\n" +
        "FROM employee\n" +
        "GROUP BY dept_id;",
      tip: "Conditional aggregation (SUM(CASE WHEN …)) works everywhere and is what interviewers usually want over the engine-specific PIVOT keyword."
    },

    // ───────────────────── G13 · OLTP vs OLAP & Misc ─────────────────────
    {
      id: "oltp-vs-olap",
      group: "OLTP vs OLAP & Misc",
      q: "Difference between OLTP and OLAP?",
      difficulty: "Core",
      tags: ["oltp", "olap", "warehouse"],
      a:
        "<ul>" +
        "<li><b>OLTP (transaction processing)</b> — many small, fast read/write transactions; highly <b>normalized</b>; current operational data. Think the app's live database (orders, payments).</li>" +
        "<li><b>OLAP (analytical processing)</b> — few, large, complex read queries over historical/aggregated data; often <b>denormalized</b> (star schema); think data warehouse / BI.</li>" +
        "</ul>",
      tip: "Summarise as \"OLTP = run the business (writes, normalized); OLAP = analyze the business (reads, denormalized).\""
    },
    {
      id: "partitioning",
      group: "OLTP vs OLAP & Misc",
      q: "What is table partitioning?",
      difficulty: "Deep",
      tags: ["partitioning", "range", "pruning"],
      a:
        "<p><b>Partitioning splits one large logical table into smaller physical pieces</b> by a key — by <b>range</b> (dates), <b>list</b> (region), or <b>hash</b>. Queries that filter on the partition key read only the relevant partitions (<b>partition pruning</b>), and you can archive/drop a whole partition cheaply.</p>",
      tip: "Key benefit phrase: \"partition pruning\" — the optimizer skips partitions that can't match. Great for time-series / rolling-window data."
    },
    {
      id: "sql-vs-nosql",
      group: "OLTP vs OLAP & Misc",
      q: "When would you choose NoSQL over a relational database?",
      difficulty: "Deep",
      tags: ["nosql", "scale", "schema"],
      a:
        "<ul>" +
        "<li><b>Relational/SQL</b> — strong consistency, complex joins, ACID transactions, well-defined schema. Default for most business data.</li>" +
        "<li><b>NoSQL</b> — flexible/evolving schema, massive horizontal scale, simple access patterns (key-value, document, wide-column), or very high write throughput where you can relax consistency (BASE / eventual consistency).</li>" +
        "</ul>",
      tip: "Avoid \"NoSQL is newer/better.\" Frame it as fit-for-purpose: joins + transactions → SQL; scale + flexible schema + simple access → NoSQL."
    },
    {
      id: "truncate-rollback",
      group: "OLTP vs OLAP & Misc",
      q: "Can TRUNCATE be rolled back?",
      difficulty: "Deep",
      tags: ["truncate", "rollback", "transaction"],
      a:
        "<p><b>It depends on the engine.</b> In <b>SQL Server</b> and <b>PostgreSQL</b>, <code>TRUNCATE</code> is transactional — inside an explicit transaction it <i>can</i> be rolled back. In <b>MySQL</b> and <b>Oracle</b>, <code>TRUNCATE</code> is DDL that implicitly commits, so it <b>cannot</b> be rolled back.</p>",
      tip: "The nuanced answer (\"depends — rollback-able in SQL Server/PostgreSQL, not in MySQL/Oracle\") scores better than a flat \"no.\""
    },
    {
      id: "sql-tsql-plsql",
      group: "OLTP vs OLAP & Misc",
      q: "Difference between SQL, T-SQL and PL/SQL?",
      difficulty: "Core",
      tags: ["t-sql", "pl/sql", "dialect"],
      a:
        "<ul>" +
        "<li><b>SQL</b> — the ANSI standard query language common to all relational engines.</li>" +
        "<li><b>T-SQL</b> — Microsoft's procedural extension for <b>SQL Server</b> (variables, control flow, error handling, <code>TOP</code>, etc.).</li>" +
        "<li><b>PL/SQL</b> — Oracle's procedural extension (blocks, cursors, packages).</li>" +
        "</ul>" +
        "<p>Both T-SQL and PL/SQL add imperative programming (loops, conditionals, exceptions) on top of standard SQL.</p>",
      tip: "One line: \"SQL is the standard; T-SQL and PL/SQL are vendor procedural dialects (Microsoft and Oracle) layered on top.\""
    },
    {
      id: "dynamic-sql",
      group: "OLTP vs OLAP & Misc",
      q: "What is dynamic SQL and what's the risk?",
      difficulty: "Deep",
      tags: ["dynamic sql", "injection", "parameterized"],
      a:
        "<p><b>Dynamic SQL is SQL text built and executed at runtime</b> (e.g. to vary columns/filters). It's flexible but the big risk is <b>SQL injection</b> if you concatenate user input into the string.</p>" +
        "<p>Always use <b>parameterized queries / bind variables</b> (<code>sp_executesql</code>, prepared statements) rather than string concatenation — it both prevents injection and lets the plan cache work.</p>",
      tip: "\"Parameterize, never concatenate user input\" is the security answer every interviewer wants to hear."
    }
  ]
};
