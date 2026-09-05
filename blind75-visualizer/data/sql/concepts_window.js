/*
 * data/sql/concepts_window.js — SQL "Learn" exemplar topic.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the T-SQL /
 * PostgreSQL notes flagged inline); teaching structure mirrors the Python lab.
 */
window.LEARN.register("sql", "Window Functions", [
  {
    id: "window-functions",
    title: "Window Functions",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Compute across a set of rows related to the current row — without collapsing them into one.",

    whatIsIt: [
      "A <b>window function</b> computes a value over a <b>window</b> — a set of rows related to the current row — but, unlike <code>GROUP BY</code>, it <b>keeps every row</b>. You get the aggregate <i>and</i> the detail in the same result set.",
      "The engine is the <code>OVER(...)</code> clause. <code>PARTITION BY</code> splits the rows into groups (the windows); <code>ORDER BY</code> orders rows <i>inside</i> each window; an optional <b>frame</b> (<code>ROWS BETWEEN …</code>) narrows the window to a sliding range around the current row.",
      "Reach for a window function whenever a question needs a <b>per-row answer that depends on other rows</b> — a rank, a running total, a moving average, the previous row's value, or each row's share of its group's total."
    ],

    showMe: {
      code:
        "-- Rank employees by salary WITHIN each department, keeping every row\n" +
        "SELECT\n" +
        "  name,\n" +
        "  department,\n" +
        "  salary,\n" +
        "  RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,\n" +
        "  SUM(salary)  OVER (PARTITION BY department)                     AS dept_payroll,\n" +
        "  salary * 100.0\n" +
        "    / SUM(salary) OVER (PARTITION BY department)                  AS pct_of_dept\n" +
        "FROM employee;",
      caption:
        "One pass, every row preserved: RANK() numbers rows inside each department; " +
        "SUM(...) OVER (PARTITION BY department) repeats the department total on every row so you can compute each person's share."
    },

    whyMatters:
      "<p>Window functions are the single highest-leverage SQL topic in data-analyst and data-engineering interviews. A huge share of \"medium/hard\" questions — <b>top-N per group</b>, <b>running totals</b>, <b>month-over-month change</b>, <b>deduplicate keeping the latest row</b>, <b>gaps &amp; islands</b> — are one <code>OVER()</code> clause away.</p>" +
      "<p>The classic pattern: put a window function in a subquery/CTE, then filter on its result in the outer query (you <b>cannot</b> filter a window function in the same <code>WHERE</code> — it's computed too late):</p>" +
      "<pre class=\"why-pre\">WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\n  FROM employee\n)\nSELECT * FROM ranked WHERE rn = 1;   -- top earner per department</pre>",

    recognize: [
      { q: "\"…per group, but keep every row\" / \"…for each row, relative to its group\"", think: "window function with PARTITION BY (GROUP BY would collapse the rows)" },
      { q: "\"top N per category\", \"most recent row per key\", \"latest status\"", think: "ROW_NUMBER() OVER (PARTITION BY key ORDER BY … DESC) in a CTE, then filter rn <= N" },
      { q: "\"running total\", \"cumulative\", \"so far\"", think: "SUM(x) OVER (ORDER BY t) — an ordered window with the default running frame" },
      { q: "\"moving / rolling average of last k\"", think: "AVG(x) OVER (ORDER BY t ROWS BETWEEN k-1 PRECEDING AND CURRENT ROW)" },
      { q: "\"change vs previous / next row\", \"month-over-month\"", think: "LAG()/LEAD() OVER (ORDER BY t)" }
    ],

    matchTags: ["window", "window function", "over", "partition", "rank", "row_number", "dense_rank",
                "running total", "moving average", "lag", "lead", "ranking", "dedup", "top n", "gaps"],

    traps: [
      {
        bad: "SELECT name, RANK() OVER (ORDER BY salary DESC) AS r\nFROM employee\nWHERE r = 1;   -- ERROR: r doesn't exist yet",
        good: "SELECT name FROM (\n  SELECT name, RANK() OVER (ORDER BY salary DESC) AS r\n  FROM employee\n) t\nWHERE r = 1;",
        why: "Window functions run AFTER WHERE/GROUP BY/HAVING and can't be referenced in the same query's WHERE. Wrap them in a subquery or CTE, then filter."
      },
      {
        bad: "ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)  -- for \"all top earners\"",
        good: "RANK() OVER (PARTITION BY dept ORDER BY salary DESC)        -- ties share rank 1",
        why: "ROW_NUMBER breaks ties arbitrarily (one winner). If two people tie for the top salary and you want BOTH, use RANK (or DENSE_RANK)."
      },
      {
        bad: "SUM(x) OVER (ORDER BY t)                 -- surprising when t has duplicates",
        good: "SUM(x) OVER (ORDER BY t\n              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
        why: "With ORDER BY and no explicit frame, the default is RANGE UNBOUNDED PRECEDING, which lumps all rows sharing the current ORDER BY value together. Specify ROWS for a true row-by-row running total."
      }
    ],

    complexity: [
      { op: "ROW_NUMBER / RANK / DENSE_RANK", big_o: "O(n log n)", note: "Dominated by sorting each partition by the ORDER BY key; an index matching PARTITION BY + ORDER BY can let the engine stream rows and avoid the sort." },
      { op: "LAG / LEAD", big_o: "O(n)", note: "Once rows are ordered within the partition, looking at the previous/next row is a constant-time offset per row." },
      { op: "SUM/AVG/COUNT OVER (running frame)", big_o: "O(n)", note: "A single ordered pass maintaining the accumulator; the cost is the ordering, then linear over the frame." },
      { op: "PARTITION BY", big_o: "O(n)", note: "Groups rows into windows; no extra asymptotic cost beyond the sort/hash already needed, but many partitions add memory for per-window state." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The core syntax is ANSI-standard and identical across PostgreSQL, SQL Server, MySQL 8+, Snowflake, and Spark SQL.</p>" +
      "<p>Differences to remember in an interview:</p>" +
      "<ul>" +
      "<li><b>Top-N per group:</b> everyone supports <code>ROW_NUMBER()</code> in a CTE. Postgres/SQLite also have <code>… FETCH FIRST n ROWS WITH TIES</code>; SQL Server has <code>TOP (n) WITH TIES</code>.</li>" +
      "<li><b>QUALIFY:</b> Snowflake, BigQuery, and DuckDB let you filter a window function directly with <code>QUALIFY rn = 1</code> — no wrapping CTE. Postgres/MySQL/SQL Server do <b>not</b> have it.</li>" +
      "<li><b>NULLS FIRST/LAST</b> in the window <code>ORDER BY</code> is supported in Postgres/Oracle; SQL Server orders NULLs first by default and needs a workaround.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have sales(order_date, region, amount). Write ONE query that returns, for every row, the region's running total of amount ordered by order_date, AND each region's rank of that row by amount (highest = 1). Which two window functions do you need, and what goes in each OVER() clause?",
      starter:
        "SELECT\n" +
        "  order_date,\n" +
        "  region,\n" +
        "  amount,\n" +
        "  /* running total per region, by date */        AS running_total,\n" +
        "  /* rank of this row within its region, by amount desc */ AS amt_rank\n" +
        "FROM sales;",
      solution:
        "SELECT\n" +
        "  order_date,\n" +
        "  region,\n" +
        "  amount,\n" +
        "  SUM(amount) OVER (PARTITION BY region ORDER BY order_date\n" +
        "                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,\n" +
        "  RANK()      OVER (PARTITION BY region ORDER BY amount DESC)          AS amt_rank\n" +
        "FROM sales;\n" +
        "-- running_total: ordered window + explicit ROWS frame for a true cumulative sum.\n" +
        "-- amt_rank: same partition, ordered by amount DESC; RANK so ties share a rank."
    }
  }
]);
