/*
 * data/sql/concepts_advanced.js — SQL "Learn" advanced topics.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the T-SQL /
 * PostgreSQL / MySQL notes flagged inline); teaching structure mirrors the
 * window-functions exemplar.
 */
window.LEARN.register("sql", "Advanced", [
  {
    id: "pivoting",
    title: "Pivoting",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Turn rows into columns — one column per category — by aggregating conditionally.",

    whatIsIt: [
      "<b>Pivoting</b> reshapes a table so that <b>distinct values become columns</b>. A tall, \"long\" table with one row per (entity, category) pair collapses into a \"wide\" table with one row per entity and one column per category — a cross-tab or contingency table.",
      "The portable, dialect-independent way is <b>conditional aggregation</b>: <code>GROUP BY</code> the entity, then wrap an aggregate around a <code>CASE</code> that only lets the target category through — <code>SUM(CASE WHEN cat='x' THEN val END)</code>. The <code>CASE</code> returns <code>NULL</code> for non-matching rows, and aggregates skip <code>NULL</code>, so each column sums only its own category.",
      "Some engines add a dedicated <code>PIVOT</code> operator (T-SQL, Oracle) that does the same thing with terser syntax, and an <code>UNPIVOT</code> operator to go the other way — columns back into rows. Both are convenient but non-portable; the <code>CASE</code> form runs everywhere.",
      "Pivoting always <b>fixes the columns at query-write time</b>: you must know the categories in advance. A truly dynamic set of columns requires building the SQL string dynamically — the query itself cannot invent columns from data at runtime."
    ],

    showMe: {
      code:
        "-- Long -> wide: one row per employee, one column per quarter\n" +
        "SELECT\n" +
        "  employee_id,\n" +
        "  SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1,\n" +
        "  SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2,\n" +
        "  SUM(CASE WHEN quarter = 'Q3' THEN amount END) AS q3,\n" +
        "  SUM(CASE WHEN quarter = 'Q4' THEN amount END) AS q4,\n" +
        "  SUM(amount)                                   AS full_year\n" +
        "FROM sales\n" +
        "GROUP BY employee_id;",
      caption:
        "One GROUP BY, one output row per employee. Each CASE lets only its quarter's rows through " +
        "(the rest become NULL); SUM ignores NULL, so every column totals just its own quarter. " +
        "SUM(amount) with no CASE gives the row's grand total for free."
    },

    whyMatters:
      "<p>Pivoting is the bread-and-butter of <b>reporting and dashboard</b> queries: monthly revenue by region, headcount by department, conversion by channel — anything a stakeholder wants as a grid rather than a list. Interviewers love it because it tests whether you understand that aggregates <b>skip NULL</b>.</p>" +
      "<p>The one pattern to internalize is conditional aggregation. Pick the aggregate to match the question: <code>SUM</code>/<code>MAX</code> for numbers, <code>COUNT</code> for how-many, <code>MAX</code> when you expect exactly one value per cell and just want to \"lift\" it:</p>" +
      "<pre class=\"why-pre\">SELECT store_id,\n       COUNT(CASE WHEN status = 'paid'    THEN 1 END) AS paid,\n       COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refunded\nFROM orders\nGROUP BY store_id;</pre>",

    recognize: [
      { q: "\"one column per month / category / status\", \"show it as a grid / cross-tab\"", think: "pivot via SUM/COUNT(CASE WHEN cat = ... THEN ... END), GROUP BY the entity" },
      { q: "\"turn these rows into columns\", \"transpose\", \"wide format\"", think: "conditional aggregation, one CASE per target column" },
      { q: "\"count how many of each type per group, side by side\"", think: "COUNT(CASE WHEN type = 'x' THEN 1 END) per type" },
      { q: "\"the columns depend on the data / I don't know them ahead of time\"", think: "static pivot can't do it — you need dynamic SQL that builds the column list first" },
      { q: "\"columns back into rows\", \"melt / long format\"", think: "UNPIVOT (T-SQL/Oracle) or a portable UNION ALL of one SELECT per source column" }
    ],

    matchTags: ["pivot", "unpivot", "conditional aggregation", "cross tab", "rows to columns"],

    traps: [
      {
        bad: "SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1\n-- then AVG(...) elsewhere with the same ELSE 0",
        good: "SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1\n-- no ELSE: non-matching rows are NULL",
        why: "For SUM, ELSE 0 is harmless. But for AVG/COUNT it is wrong: ELSE 0 turns non-matching rows into real zeros that AVG divides by and COUNT counts. Omit ELSE so non-matches stay NULL and the aggregate skips them."
      },
      {
        bad: "SELECT quarter, SUM(CASE WHEN quarter='Q1' THEN amount END) AS q1\nFROM sales GROUP BY employee_id;",
        good: "SELECT employee_id, SUM(CASE WHEN quarter='Q1' THEN amount END) AS q1\nFROM sales GROUP BY employee_id;",
        why: "Selecting the pivoted-away column (quarter) alongside a GROUP BY on the entity is either an error or defeats the pivot. Only the grouping key and the conditional aggregates belong in the SELECT."
      },
      {
        bad: "PIVOT (SUM(amount) FOR quarter IN ([Q1],[Q2]))  -- shipped to MySQL",
        good: "SUM(CASE WHEN quarter='Q1' THEN amount END) AS q1  -- runs everywhere",
        why: "The PIVOT operator exists only in T-SQL and Oracle. MySQL, Postgres, and SQLite have no PIVOT keyword — the conditional-aggregation form is the portable answer and works identically in all of them."
      }
    ],

    complexity: [
      { op: "Conditional-aggregation pivot", big_o: "O(n)", note: "A single grouped scan of the n input rows; each row is tested against the CASE branches and folded into its entity's accumulator, so cost is linear in the input." },
      { op: "GROUP BY (hash aggregation)", big_o: "O(n)", note: "Building the per-entity groups is linear when the engine can hash on the grouping key, which is the usual plan for a pivot." },
      { op: "GROUP BY (sort aggregation)", big_o: "O(n log n)", note: "If the engine sorts to group instead of hashing, the sort dominates; an index on the grouping key can remove it." },
      { op: "PIVOT operator (T-SQL/Oracle)", big_o: "O(n)", note: "It compiles down to the same conditional aggregation, so the runtime cost matches the CASE form — the difference is only syntax." },
      { op: "Number of pivot columns k", big_o: "O(n*k)", note: "Each of the k output columns adds one CASE test per row, so very wide pivots grow the per-row work by a constant factor k." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> Conditional aggregation — <code>SUM/COUNT(CASE WHEN ... THEN ... END)</code> — is pure ANSI SQL and runs identically in PostgreSQL, MySQL, SQL Server, Oracle, SQLite, Snowflake, and Spark SQL. Prefer it unless you have a reason not to.</p>" +
      "<p>Dedicated operators, when you can rely on them:</p>" +
      "<ul>" +
      "<li><b>PIVOT / UNPIVOT:</b> a first-class operator in <b>SQL Server (T-SQL)</b> and <b>Oracle</b>. Terser, but the column list is still hard-coded.</li>" +
      "<li><b>PostgreSQL:</b> no PIVOT keyword; use conditional aggregation, or the <code>crosstab()</code> function from the <code>tablefunc</code> extension.</li>" +
      "<li><b>MySQL / SQLite:</b> no PIVOT at all — conditional aggregation is the only option.</li>" +
      "<li><b>Dynamic columns:</b> every engine needs generated/dynamic SQL to pivot an unknown set of categories; a static query can never produce columns it did not name.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have orders(customer_id, status, amount) where status is one of 'paid', 'pending', 'refunded'. Write ONE query returning, per customer: the total paid amount, the COUNT of refunded orders, and the overall total amount — each as its own column. Why must the refunded COUNT omit an ELSE branch?",
      starter:
        "SELECT\n" +
        "  customer_id,\n" +
        "  /* total amount where status = 'paid'      */ AS paid_amount,\n" +
        "  /* number of orders where status='refunded'*/ AS refunded_count,\n" +
        "  /* grand total across all statuses         */ AS total_amount\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;",
      solution:
        "SELECT\n" +
        "  customer_id,\n" +
        "  SUM(CASE WHEN status = 'paid'     THEN amount END) AS paid_amount,\n" +
        "  COUNT(CASE WHEN status = 'refunded' THEN 1 END)   AS refunded_count,\n" +
        "  SUM(amount)                                       AS total_amount\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;\n" +
        "-- No ELSE on the refunded CASE: non-refunded rows return NULL, and COUNT skips\n" +
        "-- NULL. An ELSE 0 would return a real 0 that COUNT still counts, inflating the\n" +
        "-- count to every order. SUM(amount) with no CASE gives the grand total for free."
    }
  },
  {
    id: "set-operations",
    title: "Set Operations",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Combine or compare the rows of two result sets: UNION, INTERSECT, EXCEPT.",

    whatIsIt: [
      "<b>Set operations</b> combine two <b>result sets</b> vertically (stacking rows), unlike joins, which combine tables horizontally (widening rows). The two inputs must be <b>union-compatible</b>: the same number of columns, in the same order, with compatible types.",
      "<code>UNION</code> returns rows in either input and <b>removes duplicates</b>; <code>UNION ALL</code> returns every row from both, <b>keeping duplicates</b>. <code>INTERSECT</code> returns rows present in <i>both</i> inputs; <code>EXCEPT</code> (called <code>MINUS</code> in Oracle) returns rows in the first input but <b>not</b> the second.",
      "All three of <code>UNION</code>, <code>INTERSECT</code>, and <code>EXCEPT</code> are <b>duplicate-eliminating by default</b> — they compare whole rows and collapse identical ones. That deduplication has a cost: the engine must sort or hash the combined rows. <code>UNION ALL</code> skips it entirely, which is why it is the cheapest and should be your default when you know duplicates can't occur or don't matter.",
      "Column names in the output come from the <b>first</b> SELECT; a single trailing <code>ORDER BY</code> sorts the whole combined result and applies to the entire statement, not just the last branch."
    ],

    showMe: {
      code:
        "-- Customers who ordered in 2023 but NOT in 2024\n" +
        "SELECT customer_id FROM orders WHERE order_year = 2023\n" +
        "EXCEPT\n" +
        "SELECT customer_id FROM orders WHERE order_year = 2024;\n" +
        "\n" +
        "-- Stack two sources cheaply, keeping every row (no dedup)\n" +
        "SELECT id, 'web'   AS src FROM web_signups\n" +
        "UNION ALL\n" +
        "SELECT id, 'store' AS src FROM store_signups;",
      caption:
        "EXCEPT does set difference and dedups automatically — you get each lapsed customer once. " +
        "UNION ALL just concatenates: no dedup, no sort, so it is the cheapest way to combine sources " +
        "when you know rows won't collide (or you want the duplicates)."
    },

    whyMatters:
      "<p>Set operations express <b>membership questions</b> that joins express awkwardly: \"in A but not B\", \"in both A and B\", \"in either\". <code>EXCEPT</code> and <code>INTERSECT</code> read almost like the English requirement, which makes them fast to write and hard to get subtly wrong.</p>" +
      "<p>The performance rule interviewers probe: <b>reach for <code>UNION ALL</code> unless you actually need dedup.</b> Plain <code>UNION</code> silently adds a sort/hash-distinct step over the whole combined set:</p>" +
      "<ul>" +
      "<li><code>UNION ALL</code> — concatenate, keep duplicates, no sort. Cheapest.</li>" +
      "<li><code>UNION</code> — concatenate, then remove duplicates. Pays for a sort or hash.</li>" +
      "<li><code>INTERSECT</code> / <code>EXCEPT</code> — compare whole rows across inputs; also dedup.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">-- Prefer this when the two sources cannot overlap:\nSELECT id FROM active_users\nUNION ALL\nSELECT id FROM archived_users;   -- no needless DISTINCT pass</pre>",

    recognize: [
      { q: "\"in A but not in B\", \"lapsed / churned\", \"missing from\"", think: "EXCEPT (Oracle: MINUS) — first query minus the second, dedup'd" },
      { q: "\"in both A and B\", \"appears in each\", \"common to\"", think: "INTERSECT — rows present in both inputs" },
      { q: "\"combine / stack two tables into one list\"", think: "UNION (dedup) or UNION ALL (keep all) — decide whether duplicates matter" },
      { q: "\"combine and I know there are no overlaps\" / \"and keep every occurrence\"", think: "UNION ALL — skip the dedup sort, it is strictly cheaper" },
      { q: "\"my UNION is slow / added a sort I didn't ask for\"", think: "plain UNION is deduping; switch to UNION ALL if duplicates are impossible or wanted" }
    ],

    matchTags: ["union", "union all", "intersect", "except", "minus", "set operation"],

    traps: [
      {
        bad: "SELECT id FROM a\nUNION\nSELECT id FROM b;   -- when a and b can't overlap",
        good: "SELECT id FROM a\nUNION ALL\nSELECT id FROM b;",
        why: "Plain UNION always performs a duplicate-elimination pass (a sort or hash) over the combined set. If the inputs cannot produce duplicates — or you want to keep them — UNION ALL skips that work and is strictly faster."
      },
      {
        bad: "SELECT id FROM a WHERE x = 1\nEXCEPT\nSELECT id FROM b\nORDER BY id\nWHERE ...;",
        good: "SELECT id FROM a WHERE x = 1\nEXCEPT\nSELECT id FROM b\nORDER BY id;   -- single ORDER BY, at the very end",
        why: "ORDER BY is legal only once, at the end of the whole set statement, and sorts the combined result. Each branch keeps its own WHERE, but there is exactly one final ORDER BY for the statement."
      },
      {
        bad: "SELECT name, email FROM a\nUNION\nSELECT email, name FROM b;   -- columns swapped",
        good: "SELECT name, email FROM a\nUNION\nSELECT name, email FROM b;",
        why: "Set operations match columns by POSITION, not by name. Swapped or misaligned columns won't error if the types happen to be compatible — they just silently produce wrong rows. Line the columns up in the same order in every branch."
      }
    ],

    complexity: [
      { op: "UNION ALL", big_o: "O(n + m)", note: "Pure concatenation of the two inputs of sizes n and m with no comparison step, so it is linear and the cheapest set operation." },
      { op: "UNION", big_o: "O((n+m) log(n+m))", note: "Concatenates and then removes duplicates, which needs a sort (or a linear hash-distinct on average); the extra dedup pass is what makes it costlier than UNION ALL." },
      { op: "INTERSECT", big_o: "O(n log n + m log m)", note: "The engine sorts or hashes both inputs to find rows common to both and to eliminate duplicates, so it carries the same dedup cost as UNION." },
      { op: "EXCEPT / MINUS", big_o: "O(n log n + m log m)", note: "Like INTERSECT, it sorts or hashes both sides to subtract the second set from the first and dedup the result." },
      { op: "Union-compatibility check", big_o: "O(1)", note: "Matching column counts and types is done once at plan time from the query's metadata and adds no per-row runtime cost." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>UNION</code>, <code>UNION ALL</code>, and <code>INTERSECT</code> are widely portable and behave the same across PostgreSQL, SQL Server, Oracle, SQLite, Snowflake, and MySQL 8.0.31+.</p>" +
      "<ul>" +
      "<li><b>Dedup + sort:</b> <code>UNION</code> removes duplicates (and typically sorts to do it); <code>UNION ALL</code> does neither. This is the single most-tested distinction.</li>" +
      "<li><b>EXCEPT vs MySQL:</b> Oracle spells it <code>MINUS</code>; older MySQL (before 8.0.31) has <b>no</b> <code>EXCEPT</code> or <code>INTERSECT</code>. Emulate difference with <code>LEFT JOIN ... WHERE b.key IS NULL</code> or <code>WHERE key NOT IN (SELECT ...)</code>, and intersection with an <code>INNER JOIN</code> or <code>IN (SELECT ...)</code>.</li>" +
      "<li><b>NULL handling:</b> set operations treat two NULLs as <b>equal</b> for dedup/matching purposes — unlike a <code>=</code> comparison — so identical rows containing NULL collapse together.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have logins_2023(user_id) and logins_2024(user_id). Write ONE query for users who logged in during 2023 but NOT during 2024. Then: if you had to run this on old MySQL that lacks EXCEPT, how would you rewrite it?",
      starter:
        "-- Portable set-operation form:\n" +
        "SELECT user_id FROM logins_2023\n" +
        "/* set operation? */\n" +
        "SELECT user_id FROM logins_2024;",
      solution:
        "-- Standard SQL (Postgres, SQL Server, Oracle uses MINUS):\n" +
        "SELECT user_id FROM logins_2023\n" +
        "EXCEPT\n" +
        "SELECT user_id FROM logins_2024;\n" +
        "\n" +
        "-- MySQL without EXCEPT — anti-join with LEFT JOIN / IS NULL:\n" +
        "SELECT DISTINCT a.user_id\n" +
        "FROM logins_2023 a\n" +
        "LEFT JOIN logins_2024 b ON b.user_id = a.user_id\n" +
        "WHERE b.user_id IS NULL;\n" +
        "-- EXCEPT dedups automatically; the anti-join needs an explicit DISTINCT to match that."
    }
  },
  {
    id: "performance-indexes",
    title: "Performance & Indexes",
    difficulty: "Advanced",
    estMinutes: 13,
    relevance: 3,
    tagline: "Why one query is instant and another crawls: indexes, sargable predicates, seeks vs scans.",

    whatIsIt: [
      "An <b>index</b> is an auxiliary, sorted data structure (usually a B-tree) on one or more columns. It lets the engine <b>jump straight to matching rows</b> instead of reading the whole table — the difference between finding a word via a book's index and reading every page.",
      "The two access patterns to know: a <b>seek</b> (index seek / range scan) navigates the B-tree directly to the rows a predicate needs — cost proportional to the matches. A <b>scan</b> (table scan / full scan) reads every row and tests each one — cost proportional to the whole table. An index turns a scan into a seek, but <b>only if the query lets it</b>.",
      "\"Letting it\" means the predicate is <b>sargable</b> (Search-ARGument-able): the indexed column appears <b>bare</b> on one side, compared to a constant, so the engine can use the index's ordering. Wrapping the column in a function, doing arithmetic on it, or a <b>leading-wildcard</b> <code>LIKE '%x'</code> destroys sargability — the engine can no longer use the sorted order and falls back to a full scan.",
      "You inspect all of this through the <b>execution plan</b> (<code>EXPLAIN</code>). The plan is the engine's proof of what it will actually do: which indexes it chose, seek vs scan, join order, and estimated (or, with the right option, measured) row counts and cost."
    ],

    showMe: {
      code:
        "-- SARGABLE: column is bare, so the index on created_at can SEEK\n" +
        "SELECT * FROM orders\n" +
        "WHERE created_at >= '2024-01-01'\n" +
        "  AND created_at <  '2024-02-01';\n" +
        "\n" +
        "-- NON-SARGABLE: a function wraps the column -> index unusable -> full SCAN\n" +
        "SELECT * FROM orders\n" +
        "WHERE YEAR(created_at) = 2024;\n" +
        "\n" +
        "-- See what the engine actually does:\n" +
        "EXPLAIN\n" +
        "SELECT * FROM orders WHERE created_at >= '2024-01-01';",
      caption:
        "Both filters mean \"orders in a date range\", but only the first keeps created_at bare, so an index " +
        "on created_at can seek the range. YEAR(created_at) forces the engine to compute the function for " +
        "every row — the index is useless and it scans the whole table. Rewrite functions into range predicates."
    },

    whyMatters:
      "<p>Correctness gets you a passing answer; <b>performance gets you the offer</b>. Once a table is large, the gap between a seek and a full scan is the gap between milliseconds and minutes. Interviewers ask \"this query is slow — why, and how would you fix it?\" precisely to see if you think about access paths.</p>" +
      "<p>The mental checklist, in order:</p>" +
      "<ul>" +
      "<li><b>Is there an index</b> on the filtered/joined column? If not, every lookup is a scan.</li>" +
      "<li><b>Is the predicate sargable?</b> Keep the indexed column bare — no <code>YEAR(col)</code>, no <code>col + 1</code>, no <code>col LIKE '%x'</code>. Rewrite the constant side instead.</li>" +
      "<li><b>Read the plan</b> to confirm a seek, not a scan, and that the intended index was used.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">-- Non-sargable (scan):     WHERE YEAR(created_at) = 2024\n-- Sargable rewrite (seek):  WHERE created_at >= '2024-01-01'\n--                          AND created_at <  '2025-01-01'\n-- Non-sargable (scan):     WHERE name LIKE '%son'\n-- Sargable prefix (seek):   WHERE name LIKE 'John%'</pre>",

    recognize: [
      { q: "\"this query is slow — why?\", \"how would you speed it up?\"", think: "check for an index on the filtered/joined column, then check the predicate is sargable, then read EXPLAIN" },
      { q: "\"seek vs scan\", \"why is it doing a full table scan?\"", think: "no usable index, or a non-sargable predicate is defeating the one that exists" },
      { q: "\"WHERE YEAR(col) = ...\", \"WHERE col + 1 = ...\", function wrapping the column", think: "non-sargable — rewrite as a range on the bare column so the index can seek" },
      { q: "\"LIKE '%something'\", search that starts with a wildcard", think: "leading wildcard is non-sargable; only a trailing wildcard ('prefix%') can seek a B-tree" },
      { q: "\"read / explain the execution plan\", \"what index is it using?\"", think: "EXPLAIN (estimated) or EXPLAIN ANALYZE / SET STATISTICS (measured) to see seek vs scan and index choice" }
    ],

    matchTags: ["index", "performance", "execution plan", "sargable", "seek", "scan", "optimization"],

    traps: [
      {
        bad: "SELECT * FROM orders WHERE YEAR(created_at) = 2024;",
        good: "SELECT * FROM orders\nWHERE created_at >= '2024-01-01'\n  AND created_at <  '2025-01-01';",
        why: "Wrapping the indexed column in a function (YEAR, UPPER, CAST, arithmetic) makes the predicate non-sargable: the engine must evaluate the function for every row and cannot use the index's sort order, so it full-scans. Move the transformation to the constant side and compare the bare column."
      },
      {
        bad: "SELECT * FROM customers WHERE name LIKE '%son';",
        good: "SELECT * FROM customers WHERE name LIKE 'John%';",
        why: "A leading wildcard means the engine doesn't know the starting characters, so a B-tree index (which is ordered by prefix) can't seek — it scans. Only a trailing wildcard ('prefix%') is sargable. For genuine substring/suffix search you need a different structure (full-text, trigram, or a reversed-string index)."
      },
      {
        bad: "-- Add an index on every column \"just in case\"\nCREATE INDEX i1 ON t(a); CREATE INDEX i2 ON t(b); ...",
        good: "-- Index the columns your real WHERE/JOIN/ORDER BY actually use;\n-- consider one composite index matching the query's column order.",
        why: "Indexes are not free: each one slows down INSERT/UPDATE/DELETE (every write must maintain it) and consumes storage. Over-indexing degrades write throughput. Index deliberately for the queries you run, and prefer a composite index over many single-column ones when a query filters on several columns together."
      }
    ],

    complexity: [
      { op: "Index seek (B-tree, equality/range)", big_o: "O(log n + k)", note: "Navigating the B-tree to the first match is logarithmic in the table size n, then reading the k matching rows is linear in the matches — independent of how big the table is." },
      { op: "Full table scan", big_o: "O(n)", note: "Every one of the n rows is read and tested against the predicate, so cost grows with the whole table regardless of how few rows match." },
      { op: "Index build (CREATE INDEX)", big_o: "O(n log n)", note: "Constructing the sorted structure requires sorting all n rows once, which is the same cost as a sort and runs at index-creation time." },
      { op: "Write with indexes (INSERT/UPDATE/DELETE)", big_o: "O(m log n)", note: "Each write must update all m indexes on the table, and each update is a logarithmic B-tree maintenance, so more indexes make writes proportionally slower." },
      { op: "Covering index (index-only scan)", big_o: "O(log n + k)", note: "When the index contains every column the query needs, the engine answers from the index alone and skips the table lookups, saving the extra I/O of fetching each matched row." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> B-tree indexes, seeks, scans, and sargability are universal concepts, but the tooling to inspect them differs.</p>" +
      "<ul>" +
      "<li><b>PostgreSQL:</b> <code>EXPLAIN</code> shows the estimated plan; <code>EXPLAIN ANALYZE</code> actually runs the query and reports measured times and real row counts. Postgres also offers partial, expression, and GIN/GiST indexes (an expression index on <code>YEAR(created_at)</code> can even make that predicate sargable).</li>" +
      "<li><b>SQL Server:</b> <code>SET STATISTICS IO ON</code> / <code>SET STATISTICS TIME ON</code> report logical reads and elapsed time; the graphical/estimated plan shows \"Index Seek\" vs \"Index/Table Scan\" nodes.</li>" +
      "<li><b>MySQL:</b> <code>EXPLAIN</code> gives the plan; <code>EXPLAIN ANALYZE</code> (8.0.18+) measures it. The <code>type</code> column tells the access path — <code>ref</code>/<code>range</code> are seeks, <code>ALL</code> is a full scan.</li>" +
      "<li><b>Estimated vs measured:</b> plain <code>EXPLAIN</code> is the optimizer's <i>estimate</i> and can be wrong if statistics are stale; the <code>ANALYZE</code> / <code>STATISTICS</code> variants show what really happened. Refresh stats (<code>ANALYZE</code> / <code>UPDATE STATISTICS</code>) when estimates look off.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "The query SELECT * FROM events WHERE LOWER(email) = 'a@x.com' AND created_at >= '2024-01-01' is doing a full table scan despite an index on email and one on created_at. Identify why, and rewrite it (plus any index change) so the engine can seek.",
      starter:
        "-- Current (scans):\n" +
        "SELECT * FROM events\n" +
        "WHERE LOWER(email) = 'a@x.com'\n" +
        "  AND created_at >= '2024-01-01';\n" +
        "-- Which predicate is non-sargable, and how do you fix it?",
      solution:
        "-- Problem: LOWER(email) wraps the indexed column, so the email index can't seek —\n" +
        "-- the engine must compute LOWER() per row and scans.\n" +
        "\n" +
        "-- Fix A: store/compare email already-normalized so the column stays bare:\n" +
        "SELECT * FROM events\n" +
        "WHERE email = 'a@x.com'            -- assumes emails stored lowercased\n" +
        "  AND created_at >= '2024-01-01';\n" +
        "\n" +
        "-- Fix B (Postgres): an expression index makes LOWER(email) itself sargable:\n" +
        "CREATE INDEX idx_events_lower_email ON events (LOWER(email));\n" +
        "-- Then the original LOWER(email) = ... predicate can seek that index.\n" +
        "-- Best of all: a composite index on (email, created_at) or (LOWER(email), created_at)\n" +
        "-- lets one seek satisfy both predicates."
    }
  }
]);
