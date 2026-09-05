/*
 * data/sql/concepts_joins.js — SQL "Learn" topic set: Joins.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the MySQL /
 * PostgreSQL / SQL Server notes flagged inline); teaching structure mirrors the
 * Window Functions exemplar.
 */
window.LEARN.register("sql", "Joins", [
  {
    id: "join-types",
    title: "Join Types",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Combine rows from two tables by matching a key — and decide what happens to the rows that don't match.",

    whatIsIt: [
      "A <b>join</b> combines columns from two tables by comparing a condition — almost always a key equality like <code>a.customer_id = b.customer_id</code>. The join <b>type</b> decides the fate of rows that have <i>no</i> match on the other side.",
      "<b>INNER JOIN</b> keeps only rows that match on both sides — non-matching rows from either table are dropped. <b>LEFT JOIN</b> keeps <i>every</i> row from the left table and fills the right-side columns with <code>NULL</code> where there was no match; <b>RIGHT JOIN</b> is its mirror (every right row kept). <b>FULL OUTER JOIN</b> keeps every row from both sides, NULL-filling wherever a match is missing.",
      "<b>CROSS JOIN</b> is the odd one out: it has no <code>ON</code> condition and returns the <b>Cartesian product</b> — every left row paired with every right row (<code>n &times; m</code> rows). It's used deliberately (e.g. to generate a calendar &times; region grid), and produced <i>accidentally</i> when you forget a join condition.",
      "Mental model: start from the left table; an INNER join is a LEFT join that then throws away any row whose right side came back NULL. That single idea explains most join bugs."
    ],

    showMe: {
      code:
        "-- Same two tables, three join types side by side\n" +
        "-- customers(id, name)   orders(id, customer_id, amount)\n" +
        "\n" +
        "-- INNER: only customers who placed at least one order\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c\n" +
        "JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- LEFT: every customer; NULL amount for those with no orders\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- FULL OUTER: every customer AND every order, matched where possible\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c\n" +
        "FULL OUTER JOIN orders o ON o.customer_id = c.id;",
      caption:
        "Same ON condition, different survivors. INNER returns only matched pairs; " +
        "LEFT adds back every customer with no order (amount = NULL); " +
        "FULL adds back both unmatched customers and orphan orders (a NULL on whichever side is missing)."
    },

    whyMatters:
      "<p>Joins are the most-used operation in analytical SQL and the single most common source of silent wrong answers in interviews. Pick the wrong type and the query still runs — it just quietly returns too few rows (unexpected INNER) or too many (a fan-out or accidental CROSS).</p>" +
      "<p>The classic interview trap is putting a filter on the right table in the <code>WHERE</code> clause of a LEFT JOIN. Doing so turns the LEFT JOIN back into an INNER JOIN, because the NULL right-side rows fail the <code>WHERE</code> test. Put the filter in the <code>ON</code> clause to keep the outer rows:</p>" +
      "<pre class=\"why-pre\">-- WRONG: WHERE drops the unmatched customers -> behaves like INNER\nSELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.amount > 100;\n\n-- RIGHT: filter in ON; customers with no big order still appear (amount NULL)\nSELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id AND o.amount > 100;</pre>",

    recognize: [
      { q: "\"only rows that exist in both\", \"customers who placed an order\"", think: "INNER JOIN — unmatched rows on either side are dropped" },
      { q: "\"all X, including those with no Y\", \"every customer even with zero orders\"", think: "LEFT JOIN from X, expect NULLs on the Y side" },
      { q: "\"everything from both tables, matched where possible\"", think: "FULL OUTER JOIN (emulate with UNION of LEFT + RIGHT in MySQL)" },
      { q: "\"every combination of A and B\", \"each region for each day\"", think: "CROSS JOIN — deliberate Cartesian product to build a grid" },
      { q: "\"my join returned way more rows than expected\"", think: "fan-out: the join key isn't unique on one side (one row matched many), or a missing ON gave a CROSS join" }
    ],

    matchTags: ["join", "inner join", "left join", "right join", "full join", "cross join", "outer join"],

    traps: [
      {
        bad: "SELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'shipped';",
        good: "SELECT c.name, o.amount\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id AND o.status = 'shipped';",
        why: "A predicate on the right table in WHERE runs AFTER the join and rejects the NULL rows, silently collapsing your LEFT JOIN into an INNER JOIN. Move right-table filters into the ON clause to preserve the outer rows."
      },
      {
        bad: "SELECT o.id, i.product\nFROM orders o, order_items i;   -- comma join, no condition",
        good: "SELECT o.id, i.product\nFROM orders o\nJOIN order_items i ON i.order_id = o.id;",
        why: "A comma between tables with no WHERE/ON is a CROSS JOIN — every order paired with every item (n x m rows). Always state the join condition; use explicit CROSS JOIN only when you truly want the Cartesian product."
      },
      {
        bad: "SELECT c.name, SUM(o.amount)\nFROM customers c\nJOIN orders o   ON o.customer_id = c.id\nJOIN refunds r  ON r.customer_id = c.id\nGROUP BY c.name;   -- amount double-counted",
        good: "SELECT c.name,\n  (SELECT SUM(amount) FROM orders  WHERE customer_id = c.id) AS spent,\n  (SELECT SUM(amount) FROM refunds WHERE customer_id = c.id) AS refunded\nFROM customers c;",
        why: "Joining two independent one-to-many tables to the same key fans out: each order row is repeated once per refund row, inflating SUM(amount). Aggregate each side separately (subqueries or pre-aggregated CTEs) before combining."
      }
    ],

    complexity: [
      { op: "Nested-loop join", big_o: "O(n * m)", note: "For each row of the outer table the engine scans the inner table for matches; cheap when the inner side is tiny or an index on the join key turns the inner scan into an index seek, but quadratic on two large unindexed tables." },
      { op: "Hash join", big_o: "O(n + m)", note: "The engine builds a hash table on the smaller input's join key, then probes it once per row of the larger input; the workhorse for large equi-joins, at the cost of memory to hold the build side (spills to disk if it doesn't fit)." },
      { op: "Merge join", big_o: "O(n log n + m log m)", note: "Both inputs are sorted on the join key and then walked in lockstep; if the rows already arrive sorted (from an index), the sort cost vanishes and it becomes a linear merge." },
      { op: "INNER JOIN (row count)", big_o: "output <= n * m", note: "INNER drops every row without a match, so the result can be smaller than either input; but on a non-unique key one row can match many, so output can also exceed n (fan-out) up to the n x m worst case." },
      { op: "CROSS JOIN", big_o: "O(n * m) rows", note: "No condition prunes anything, so it always materializes the full Cartesian product; the output size itself, not the algorithm, is what makes it expensive." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>INNER</code>, <code>LEFT</code>, <code>RIGHT</code>, and <code>CROSS</code> joins are ANSI-standard and behave identically across PostgreSQL, MySQL, SQL Server, Oracle, and SQLite.</p>" +
      "<ul>" +
      "<li><b>FULL OUTER JOIN</b> is missing in MySQL before 8.0 and in older SQLite. Emulate it by UNION-ing a LEFT JOIN with the anti-join half of a RIGHT JOIN: <code>SELECT ... FROM a LEFT JOIN b ON ... UNION SELECT ... FROM a RIGHT JOIN b ON ... WHERE a.key IS NULL</code>.</li>" +
      "<li><b>USING vs ON:</b> <code>JOIN b USING (customer_id)</code> is shorthand for <code>ON a.customer_id = b.customer_id</code> and collapses the two key columns into one unqualified column in the output; <code>ON</code> is more general (any predicate) and keeps both columns. Avoid <code>NATURAL JOIN</code> — it silently joins on every same-named column and breaks the moment someone adds a column.</li>" +
      "<li><b>RIGHT JOIN</b> is supported everywhere but rarely idiomatic; most style guides rewrite it as a LEFT JOIN with the tables swapped so the query reads left-to-right.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have customers(id, name) and orders(id, customer_id, amount). Write ONE query that lists EVERY customer with their total spend, including customers who have never ordered (they should show 0, not be omitted). Which join type do you need, and why won't a plain INNER JOIN work?",
      starter:
        "SELECT c.name, /* total spend, 0 if none */ AS total_spend\n" +
        "FROM customers c\n" +
        "/* which join? */ orders o ON o.customer_id = c.id\n" +
        "GROUP BY c.name;",
      solution:
        "SELECT c.name, COALESCE(SUM(o.amount), 0) AS total_spend\n" +
        "FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "GROUP BY c.id, c.name;\n" +
        "-- LEFT JOIN keeps customers with no orders (o.amount is NULL for them).\n" +
        "-- SUM ignores NULLs and returns NULL for an all-NULL group, so COALESCE(..., 0)\n" +
        "-- turns the never-ordered customers' total into 0.\n" +
        "-- An INNER JOIN would drop those customers entirely, since they have no matching order row."
    }
  },
  {
    id: "self-anti-joins",
    title: "Self & Anti Joins",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Join a table to itself to compare rows, and find the rows in A that have no match in B.",

    whatIsIt: [
      "A <b>self-join</b> joins a table to itself using two aliases, so you can compare one row to another row of the same table. It's the standard tool for hierarchies (employee -> manager, both in <code>employee</code>), adjacency (this row vs the previous one), and pairing within a table (find pairs of people in the same city).",
      "An <b>anti-join</b> answers \"which rows in A have <b>no</b> matching row in B?\" — the complement of an INNER join. There is no <code>ANTI JOIN</code> keyword in standard SQL; you express it two idiomatic ways.",
      "The first idiom is <b>NOT EXISTS</b> with a correlated subquery: keep an A row only when no matching B row exists. The second is a <b>LEFT JOIN ... WHERE b.key IS NULL</b>: join everything, then keep only the rows where the right side came back NULL — i.e. the ones that failed to match.",
      "A <b>semi-join</b> is the positive twin (\"A rows that DO have a match\", via <code>EXISTS</code>); it returns A's columns without fanning out, unlike an INNER join which repeats an A row once per match."
    ],

    showMe: {
      code:
        "-- SELF JOIN: pair each employee with their manager's name\n" +
        "SELECT e.name AS employee, m.name AS manager\n" +
        "FROM employee e\n" +
        "LEFT JOIN employee m ON m.id = e.manager_id;   -- LEFT so the CEO (no manager) survives\n" +
        "\n" +
        "-- ANTI JOIN, idiom 1: customers who have never ordered (NOT EXISTS)\n" +
        "SELECT c.name\n" +
        "FROM customers c\n" +
        "WHERE NOT EXISTS (\n" +
        "  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n" +
        ");\n" +
        "\n" +
        "-- ANTI JOIN, idiom 2: same result via LEFT JOIN ... IS NULL\n" +
        "SELECT c.name\n" +
        "FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "WHERE o.customer_id IS NULL;   -- kept only the rows that found no match",
      caption:
        "Top: one table (employee) aliased twice compares each row to its manager row. " +
        "Bottom: two equivalent anti-joins — NOT EXISTS and LEFT JOIN + IS NULL both return the customers with no order. " +
        "In the LEFT JOIN version, test a right-side column that is NON-NULL on a match (the join key) for IS NULL."
    },

    whyMatters:
      "<p>Self-joins and anti-joins turn up constantly: \"employees who earn more than their manager\", \"products never sold\", \"users who signed up but never logged in\", \"find duplicate rows\". Recognizing that a question is really \"A minus (A that match B)\" is half the battle.</p>" +
      "<p>The most dangerous version of an anti-join uses <code>NOT IN</code> with a subquery — and it silently returns <b>zero rows</b> the moment that subquery contains a single NULL. Because <code>x NOT IN (1, 2, NULL)</code> evaluates to <code>UNKNOWN</code> (never TRUE), every outer row is rejected:</p>" +
      "<pre class=\"why-pre\">-- LANDMINE: if any orders.customer_id is NULL, this returns NOTHING\nSELECT name FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);\n\n-- SAFE: NOT EXISTS is NULL-proof and usually plans better\nSELECT name FROM customers c\nWHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);</pre>" +
      "<p>Prefer <code>NOT EXISTS</code> (or the LEFT JOIN ... IS NULL idiom) for anti-joins. Reach for <code>NOT IN</code> only when the subquery column is guaranteed NOT NULL.</p>",

    recognize: [
      { q: "\"employee and their manager\", \"row vs the row it points to\"", think: "self-join: the same table aliased twice, joined on the parent-key = id" },
      { q: "\"X that have never / no Y\", \"products never ordered\", \"users with no login\"", think: "anti-join: NOT EXISTS, or LEFT JOIN ... WHERE right.key IS NULL" },
      { q: "\"X that DO have at least one Y\" (but don't repeat X per match)", think: "semi-join: EXISTS (avoids the fan-out of INNER JOIN + DISTINCT)" },
      { q: "\"pairs within the same table\", \"two employees in the same city\"", think: "self-join with a.id < b.id to get unordered pairs without duplicates" },
      { q: "\"NOT IN returns nothing / fewer rows than I expect\"", think: "a NULL in the subquery is poisoning NOT IN; switch to NOT EXISTS" }
    ],

    matchTags: ["join", "self join", "anti join", "semi join", "not exists", "not in", "left join", "outer join"],

    traps: [
      {
        bad: "SELECT name FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);",
        good: "SELECT name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);",
        why: "If any orders.customer_id is NULL, NOT IN evaluates to UNKNOWN for every row and the query returns zero rows. NOT EXISTS handles NULLs correctly and typically produces a better anti-join plan."
      },
      {
        bad: "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.amount IS NULL;",
        good: "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.customer_id IS NULL;",
        why: "For the LEFT-JOIN anti-join idiom, test a right-side column that is guaranteed non-NULL on a real match (the join key). Testing a nullable column like amount also picks up matched orders that merely have a NULL amount, giving wrong results."
      },
      {
        bad: "SELECT a.name, b.name\nFROM people a\nJOIN people b ON a.city = b.city;",
        good: "SELECT a.name, b.name\nFROM people a\nJOIN people b ON a.city = b.city AND a.id < b.id;",
        why: "A self-join with only the equality matches each person to themselves and returns each pair twice (A-B and B-A). Add a.id < b.id to exclude self-pairs and keep each unordered pair once."
      }
    ],

    complexity: [
      { op: "Self-join (on indexed key)", big_o: "O(n log n)", note: "It is an ordinary join whose two inputs happen to be the same table; with an index on the join key each row seeks its partner cheaply, so cost tracks the underlying nested-loop or hash join, not anything special about self-reference." },
      { op: "NOT EXISTS (anti-join)", big_o: "O(n + m) hashed", note: "Planners recognize NOT EXISTS as an anti-join and usually run a hash anti-join: build a hash on B's key, then emit each A row whose key is absent — one pass over each side rather than a subquery re-run per row." },
      { op: "LEFT JOIN ... IS NULL (anti-join)", big_o: "O(n + m)", note: "Semantically identical to NOT EXISTS and often compiled to the same anti-join plan; it materializes matches first and then discards them, so it can touch more intermediate rows on a high-fan-out key." },
      { op: "NOT IN with subquery", big_o: "O(n + m)", note: "Similar cost when the column is NOT NULL, but a nullable column blocks the anti-join optimization and forces slower, correctness-preserving evaluation — another reason to prefer NOT EXISTS." },
      { op: "Self-join for pairs (a.id < b.id)", big_o: "O(n^2) worst case", note: "Pairing every row with every other row within a group is inherently quadratic in the group size; a large group sharing the join value (e.g. one popular city) dominates the runtime regardless of indexing." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> Self-joins, <code>EXISTS</code>/<code>NOT EXISTS</code>, and the LEFT JOIN ... IS NULL idiom are ANSI-standard and identical across PostgreSQL, MySQL, SQL Server, Oracle, and SQLite.</p>" +
      "<ul>" +
      "<li><b>NOT IN + NULL:</b> the zero-rows trap applies in every dialect — it's ANSI three-valued-logic behavior, not a bug. Always prefer <code>NOT EXISTS</code> unless the subquery column is declared NOT NULL.</li>" +
      "<li><b>Explicit ANTI/SEMI syntax:</b> Spark SQL and Databricks expose <code>LEFT ANTI JOIN</code> and <code>LEFT SEMI JOIN</code> keywords; standard engines (Postgres, MySQL, SQL Server) do not — use NOT EXISTS / EXISTS, which the planner turns into the same anti/semi-join.</li>" +
      "<li><b>Recursive hierarchies:</b> a single self-join climbs one level (employee -> manager). For an arbitrary-depth tree use a recursive CTE (<code>WITH RECURSIVE ...</code>) — available in Postgres, MySQL 8+, SQL Server, and SQLite.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have employee(id, name, salary, manager_id) where manager_id points at another employee's id. Write ONE query that returns the names of employees who earn strictly more than their own manager. Which join is this, and what condition goes in the ON vs the WHERE?",
      starter:
        "SELECT e.name\n" +
        "FROM employee e\n" +
        "JOIN employee m ON /* link employee to their manager */\n" +
        "WHERE /* earns more than the manager */;",
      solution:
        "SELECT e.name\n" +
        "FROM employee e\n" +
        "JOIN employee m ON m.id = e.manager_id\n" +
        "WHERE e.salary > m.salary;\n" +
        "-- Self-join: the employee table aliased as e (the worker) and m (the manager).\n" +
        "-- ON m.id = e.manager_id links each employee row to its manager row.\n" +
        "-- WHERE e.salary > m.salary keeps only those out-earning their manager.\n" +
        "-- INNER JOIN is correct here: employees with no manager (manager_id NULL)\n" +
        "-- have nobody to out-earn and should be excluded."
    }
  }
]);
