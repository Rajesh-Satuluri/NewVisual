/*
 * data/sql/concepts_window2.js — SQL "Learn" sibling topics for the
 * "Window Functions" section. Registered into the multi-stack concept registry
 * (window.LEARN) under the "sql" stack. Content grounded in standard SQL
 * semantics (ANSI + dialect notes flagged inline); teaching structure mirrors
 * data/sql/concepts_window.js. This file adds two topics — Ranking, and
 * Running Totals & Moving Averages — WITHOUT redefining the overview topic.
 */
window.LEARN.register("sql", "Window Functions", [
  {
    id: "ranking",
    title: "Ranking",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Number the rows inside each group — and pick the right function so ties behave the way the question wants.",

    whatIsIt: [
      "The <b>ranking functions</b> assign a position to each row inside its window, ordered by the window's <code>ORDER BY</code>. All four take an empty argument list and live in an <code>OVER (PARTITION BY … ORDER BY …)</code> clause: the <code>PARTITION BY</code> restarts the numbering per group, the <code>ORDER BY</code> decides the order.",
      "They differ only in how they treat <b>ties</b> (rows equal on the ORDER BY key). <code>ROW_NUMBER()</code> gives every row a distinct number, breaking ties <b>arbitrarily</b>. <code>RANK()</code> gives tied rows the <b>same</b> number and then <b>skips</b> the next values (1, 1, 3). <code>DENSE_RANK()</code> gives tied rows the same number but leaves <b>no gaps</b> (1, 1, 2). <code>NTILE(k)</code> ignores ties and instead splits each window into <code>k</code> roughly equal buckets, labelled 1..k.",
      "The signature move in interviews is <b>top-N per group</b>: compute <code>ROW_NUMBER()</code> (or <code>RANK</code>) in a CTE/subquery, then filter on it in the outer query. You cannot filter a window function in the same <code>WHERE</code> — it is computed after <code>WHERE</code>, so it does not exist yet at that stage.",
      "Picking the function IS the answer: \"the single newest row per user\" wants <code>ROW_NUMBER() = 1</code> (exactly one), while \"everyone tied for the top score\" wants <code>RANK() = 1</code> or <code>DENSE_RANK() = 1</code> so ties survive."
    ],

    showMe: {
      code:
        "-- All four ranking functions side by side, per department, by salary DESC\n" +
        "SELECT\n" +
        "  name,\n" +
        "  department,\n" +
        "  salary,\n" +
        "  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn,\n" +
        "  RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rnk,\n" +
        "  DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rnk,\n" +
        "  NTILE(4)     OVER (PARTITION BY department ORDER BY salary DESC) AS quartile\n" +
        "FROM employee;",
      caption:
        "If two people tie on salary: rn gives them adjacent distinct numbers (e.g. 2 and 3), " +
        "rnk gives both 2 then jumps to 4, dense_rnk gives both 2 then 3, and NTILE just drops each " +
        "into a quartile bucket regardless of the tie."
    },

    whyMatters:
      "<p>Ranking is the workhorse behind a whole family of \"medium\" questions: <b>Nth-highest salary</b>, <b>top-N products per category</b>, <b>most recent order per customer</b>, and <b>deduplicate keeping one row per key</b>. Choosing ROW_NUMBER vs RANK vs DENSE_RANK is usually the entire difficulty of the problem.</p>" +
      "<ul>" +
      "<li><b>Exactly one row per group</b> (dedup, latest row) &rarr; <code>ROW_NUMBER()</code>.</li>" +
      "<li><b>Keep ties</b> (all top earners, everyone in first place) &rarr; <code>RANK()</code> or <code>DENSE_RANK()</code>.</li>" +
      "<li><b>Nth <i>distinct</i> value</b> (2nd highest <i>salary</i>, not 2nd person) &rarr; <code>DENSE_RANK() = N</code>.</li>" +
      "<li><b>Buckets / percentiles / quartiles</b> &rarr; <code>NTILE(k)</code>.</li>" +
      "</ul>" +
      "<p>The canonical top-N-per-group template — window in a CTE, filter outside:</p>" +
      "<pre class=\"why-pre\">WITH ranked AS (\n  SELECT *,\n         ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS rn\n  FROM product\n)\nSELECT * FROM ranked WHERE rn <= 3;   -- top 3 products per category</pre>",

    recognize: [
      { q: "\"top N per group / category / user\"", think: "ROW_NUMBER() OVER (PARTITION BY key ORDER BY … DESC) in a CTE, then WHERE rn <= N" },
      { q: "\"most recent row per key\", \"latest status\", \"deduplicate keeping one\"", think: "ROW_NUMBER() OVER (PARTITION BY key ORDER BY ts DESC) then keep rn = 1 — one row guaranteed" },
      { q: "\"Nth highest salary\" / \"2nd highest distinct value\"", think: "DENSE_RANK() OVER (ORDER BY salary DESC) = N — distinct values, no gaps" },
      { q: "\"all the top scorers\", \"everyone tied for first\"", think: "RANK() or DENSE_RANK() = 1 so tied rows are all returned (ROW_NUMBER would drop all but one)" },
      { q: "\"split into quartiles / deciles / k equal buckets\"", think: "NTILE(k) OVER (ORDER BY metric)" }
    ],

    matchTags: ["rank", "row_number", "dense_rank", "ntile", "top n", "ranking", "dedup", "nth highest"],

    traps: [
      {
        bad: "SELECT name,\n       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\nFROM employee\nWHERE rn = 1;   -- ERROR: rn does not exist yet",
        good: "WITH ranked AS (\n  SELECT name,\n         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\n  FROM employee\n)\nSELECT name FROM ranked WHERE rn = 1;",
        why: "Window functions are evaluated AFTER WHERE/GROUP BY/HAVING, so you cannot filter on rn in the same query's WHERE. Wrap the window in a CTE or subquery, then filter in the outer query."
      },
      {
        bad: "ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)  -- for \"all top earners\"",
        good: "RANK() OVER (PARTITION BY dept ORDER BY salary DESC)        -- ties all share rank 1",
        why: "ROW_NUMBER breaks ties arbitrarily and returns exactly one winner. If two people tie for the highest salary and you want BOTH, use RANK or DENSE_RANK so tied rows share the top position."
      },
      {
        bad: "SELECT DISTINCT salary\nFROM employee\nORDER BY salary DESC\nLIMIT 1 OFFSET 1;   -- \"2nd highest\" but brittle with ties/empties",
        good: "SELECT DISTINCT salary FROM (\n  SELECT salary,\n         DENSE_RANK() OVER (ORDER BY salary DESC) AS dr\n  FROM employee\n) t\nWHERE dr = 2;",
        why: "For \"Nth highest DISTINCT value\" use DENSE_RANK: it collapses duplicate salaries to one rank with no gaps, so dr = 2 is genuinely the second-highest distinct salary. RANK would skip numbers after ties, and ROW_NUMBER counts duplicate salaries separately."
      }
    ],

    complexity: [
      { op: "ROW_NUMBER / RANK / DENSE_RANK", big_o: "O(n log n)", note: "The cost is dominated by sorting each partition on the ORDER BY key; an index matching PARTITION BY then ORDER BY can let the engine stream rows in order and skip the sort." },
      { op: "NTILE(k)", big_o: "O(n log n)", note: "Also requires the rows to be ordered within each partition, then a linear pass assigns bucket numbers by dividing the row count into k groups." },
      { op: "Top-N per group (CTE + filter)", big_o: "O(n log n)", note: "The ranking sort dominates; the outer filter on rn is a linear scan, so adding the filter does not change the asymptotic cost." },
      { op: "PARTITION BY", big_o: "O(n)", note: "Restarting the numbering per group adds no asymptotic cost beyond the sort already needed, but many partitions increase memory for per-window state." },
      { op: "DISTINCT-value Nth (DENSE_RANK)", big_o: "O(n log n)", note: "One ordered pass computes the dense rank; the outer WHERE dr = N is a linear filter over the ranked rows." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>ROW_NUMBER</code>, <code>RANK</code>, <code>DENSE_RANK</code>, and <code>NTILE</code> are ANSI-standard and identical across PostgreSQL, SQL Server, MySQL 8+, Oracle, Snowflake, BigQuery, and Spark SQL.</p>" +
      "<ul>" +
      "<li><b>QUALIFY:</b> Snowflake, BigQuery, and DuckDB let you filter a ranking function directly: <code>… QUALIFY ROW_NUMBER() OVER (…) = 1</code> — no wrapping CTE. Postgres, MySQL, and SQL Server do <b>not</b> have QUALIFY, so you must use a subquery/CTE.</li>" +
      "<li><b>TOP / FETCH WITH TIES:</b> for a plain (ungrouped) top-N that keeps ties, SQL Server has <code>SELECT TOP (n) WITH TIES … ORDER BY …</code> and Postgres/Oracle/SQLite have <code>… FETCH FIRST n ROWS WITH TIES</code>. These do not partition, so top-N <i>per group</i> still needs a ranking function.</li>" +
      "<li><b>NTILE distribution:</b> when the row count is not divisible by k, NTILE puts the extra rows in the <b>earlier</b> buckets — e.g. 10 rows into NTILE(3) yields buckets of size 4, 3, 3, not 3, 3, 4. Bucket sizes therefore differ by at most one.</li>" +
      "<li><b>NULLS ordering:</b> Postgres/Oracle allow <code>ORDER BY col DESC NULLS LAST</code> inside OVER; SQL Server orders NULLs first by default and needs a workaround expression.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have exam(student_id, subject, score). Write ONE query that returns, for each subject, the students holding the top 2 DISTINCT scores — and make sure that if several students tie for a top-2 score, ALL of them are returned. Which ranking function do you need, and why not ROW_NUMBER?",
      starter:
        "WITH ranked AS (\n" +
        "  SELECT student_id, subject, score,\n" +
        "         /* rank within subject by score desc, ties share a rank, no gaps */ AS dr\n" +
        "  FROM exam\n" +
        ")\n" +
        "SELECT student_id, subject, score\n" +
        "FROM ranked\n" +
        "WHERE /* keep the top 2 distinct scores */;",
      solution:
        "WITH ranked AS (\n" +
        "  SELECT student_id, subject, score,\n" +
        "         DENSE_RANK() OVER (PARTITION BY subject ORDER BY score DESC) AS dr\n" +
        "  FROM exam\n" +
        ")\n" +
        "SELECT student_id, subject, score\n" +
        "FROM ranked\n" +
        "WHERE dr <= 2\n" +
        "ORDER BY subject, score DESC;\n" +
        "-- DENSE_RANK, not ROW_NUMBER: we want the top 2 DISTINCT scores, and every\n" +
        "-- student who ties for one of them. ROW_NUMBER would assign distinct numbers\n" +
        "-- and drop tied students; RANK would skip numbers after a tie, so \"<= 2\"\n" +
        "-- could miss the genuine second-highest distinct score."
    }
  },

  {
    id: "running-totals-moving-averages",
    title: "Running Totals & Moving Averages",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Aggregate over an ordered sliding range around each row — cumulative sums, rolling averages, and row-to-row deltas.",

    whatIsIt: [
      "A <b>running total</b> is an aggregate (<code>SUM</code>, <code>COUNT</code>, <code>AVG</code>…) computed <b>OVER an ordered window</b> that grows as you move down the rows. Add <code>ORDER BY</code> to the <code>OVER</code> clause and the aggregate accumulates from the start of the window up to the current row instead of covering the whole partition at once.",
      "The <b>frame</b> — the <code>ROWS BETWEEN … AND …</code> clause — controls exactly which rows around the current one are included. <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> is a cumulative (running) total; <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> is a 3-row moving window (a rolling average when the aggregate is <code>AVG</code>).",
      "There is a critical default: with <code>ORDER BY</code> but <b>no explicit frame</b>, SQL uses <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. <code>RANGE</code> groups together every row that shares the current ORDER BY value, so if the order key has duplicates, tied rows all get the <b>same</b> cumulative total. For a true row-by-row running total, always spell out an explicit <code>ROWS</code> frame.",
      "<b>LAG</b> and <b>LEAD</b> are the companion tools: <code>LAG(x)</code> reads the value of <code>x</code> from the previous row in the window, <code>LEAD(x)</code> from the next row. Subtract to get row-to-row deltas — day-over-day change, month-over-month growth, gaps between events."
    ],

    showMe: {
      code:
        "-- Cumulative sum, 3-day moving average, and day-over-day delta per region\n" +
        "SELECT\n" +
        "  order_date,\n" +
        "  region,\n" +
        "  amount,\n" +
        "  SUM(amount) OVER (PARTITION BY region ORDER BY order_date\n" +
        "                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,\n" +
        "  AVG(amount) OVER (PARTITION BY region ORDER BY order_date\n" +
        "                    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)          AS moving_avg_3,\n" +
        "  amount - LAG(amount) OVER (PARTITION BY region ORDER BY order_date)  AS vs_prev_day\n" +
        "FROM sales;",
      caption:
        "running_total accumulates from the first row up to the current one (explicit ROWS frame); " +
        "moving_avg_3 averages the current row plus the two before it; " +
        "LAG(amount) pulls the previous row's amount so the subtraction gives the day-over-day change (NULL on each region's first day)."
    },

    whyMatters:
      "<p>Ordered-window aggregates power the classic time-series questions: <b>cumulative revenue</b>, <b>running headcount</b>, <b>rolling 7-day averages</b>, <b>month-over-month growth</b>, and <b>gaps between consecutive events</b>. They are near-guaranteed in analyst and data-engineering interviews.</p>" +
      "<ul>" +
      "<li><b>Cumulative / running total</b> &rarr; <code>SUM(x) OVER (ORDER BY t ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code>.</li>" +
      "<li><b>Rolling average of the last k rows</b> &rarr; <code>AVG(x) OVER (ORDER BY t ROWS BETWEEN k-1 PRECEDING AND CURRENT ROW)</code>.</li>" +
      "<li><b>Change vs previous / next row</b> &rarr; <code>x - LAG(x) OVER (ORDER BY t)</code> or <code>LEAD(x) OVER (ORDER BY t) - x</code>.</li>" +
      "</ul>" +
      "<p>Month-over-month growth is just LAG on a pre-aggregated CTE:</p>" +
      "<pre class=\"why-pre\">WITH monthly AS (\n  SELECT DATE_TRUNC('month', order_date) AS mth, SUM(amount) AS revenue\n  FROM sales\n  GROUP BY DATE_TRUNC('month', order_date)\n)\nSELECT mth, revenue,\n       revenue - LAG(revenue) OVER (ORDER BY mth)            AS mom_change,\n       (revenue - LAG(revenue) OVER (ORDER BY mth)) * 100.0\n         / LAG(revenue) OVER (ORDER BY mth)                  AS mom_pct\nFROM monthly\nORDER BY mth;</pre>",

    recognize: [
      { q: "\"running total\", \"cumulative\", \"so far\", \"to date\"", think: "SUM(x) OVER (ORDER BY t ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)" },
      { q: "\"moving / rolling average of the last k\", \"7-day average\"", think: "AVG(x) OVER (ORDER BY t ROWS BETWEEN k-1 PRECEDING AND CURRENT ROW)" },
      { q: "\"change vs previous row\", \"day-over-day\", \"delta\"", think: "x - LAG(x) OVER (ORDER BY t) — previous row's value subtracted from the current" },
      { q: "\"month-over-month / week-over-week growth %\"", think: "aggregate per period in a CTE, then LAG the aggregate to compute the percentage change" },
      { q: "\"gap between consecutive events / time since last event\"", think: "t - LAG(t) OVER (PARTITION BY key ORDER BY t)" }
    ],

    matchTags: ["running total", "cumulative", "moving average", "rolling", "frame", "rows between",
                "lag", "lead", "running sum", "month over month"],

    traps: [
      {
        bad: "SUM(amount) OVER (ORDER BY order_date)  -- \"running total\", but order_date repeats",
        good: "SUM(amount) OVER (ORDER BY order_date\n                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
        why: "With ORDER BY and no frame the default is RANGE UNBOUNDED PRECEDING, which lumps together every row sharing the current order_date and gives them the SAME cumulative total. Spell out an explicit ROWS frame for a true row-by-row running total."
      },
      {
        bad: "AVG(amount) OVER (ORDER BY order_date\n                  ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)  -- for a 3-day avg",
        good: "AVG(amount) OVER (ORDER BY order_date\n                  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)  -- 3 rows total",
        why: "A k-row moving window is 'k-1 PRECEDING AND CURRENT ROW'. '3 PRECEDING AND CURRENT ROW' spans FOUR rows (3 before + the current one). Off-by-one here is a common interview slip."
      },
      {
        bad: "amount - LAG(amount) OVER (ORDER BY order_date)  -- deltas across ALL regions",
        good: "amount - LAG(amount) OVER (PARTITION BY region ORDER BY order_date)",
        why: "Without PARTITION BY, LAG reaches across region boundaries, so the first row of each region subtracts the last row of the previous region. Partition by the grouping key so deltas reset per group (and the first row of each group correctly yields NULL)."
      }
    ],

    complexity: [
      { op: "SUM/AVG/COUNT OVER (running frame)", big_o: "O(n log n)", note: "Ordering the partition dominates; once ordered, an UNBOUNDED PRECEDING running frame maintains a single accumulator in one linear pass." },
      { op: "Moving window (ROWS k PRECEDING)", big_o: "O(n log n)", note: "After the sort, a fixed-size k-row window slides in linear time because the engine adds the entering row and drops the leaving row rather than re-summing k rows each step." },
      { op: "LAG / LEAD", big_o: "O(n)", note: "Once rows are ordered within the partition, reading the previous or next row is a constant-time offset per row, so the pass is linear." },
      { op: "Month-over-month (CTE + LAG)", big_o: "O(n log n)", note: "The GROUP BY aggregation and the ordering for LAG dominate; the LAG subtraction itself is linear over the far smaller set of per-period rows." },
      { op: "RANGE frame with duplicate keys", big_o: "O(n log n)", note: "Same ordering cost as ROWS, but RANGE must scan all peer rows sharing the current order value, which can add work when the order key has many duplicates." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> Ordered aggregates, <code>ROWS</code>/<code>RANGE</code> frames, and <code>LAG</code>/<code>LEAD</code> are ANSI-standard and behave the same in PostgreSQL, SQL Server, MySQL 8+, Oracle, Snowflake, BigQuery, and Spark SQL.</p>" +
      "<ul>" +
      "<li><b>Default frame gotcha:</b> ORDER BY with no explicit frame means <code>RANGE UNBOUNDED PRECEDING</code>, not <code>ROWS</code> — everywhere. When the order key has duplicates this changes results, so make the frame explicit for reproducible running totals.</li>" +
      "<li><b>LAG/LEAD offset and default:</b> <code>LAG(x, 2, 0)</code> looks 2 rows back and returns 0 instead of NULL when there is no such row. The offset and default arguments are ANSI-standard and supported across the major engines.</li>" +
      "<li><b>GROUPS frame &amp; EXCLUDE:</b> <code>GROUPS BETWEEN …</code> and frame <code>EXCLUDE</code> clauses are in Postgres, Oracle, and SQLite but not in SQL Server or MySQL — avoid them unless the target dialect supports them.</li>" +
      "<li><b>QUALIFY:</b> Snowflake/BigQuery/DuckDB can filter on a windowed aggregate directly with <code>QUALIFY</code>; elsewhere wrap it in a CTE. <code>DATE_TRUNC</code> (Postgres/Snowflake) is <code>DATE_FORMAT</code>/<code>FORMAT</code> in MySQL/SQL Server for period bucketing.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have logins(user_id, login_date). For each user, in date order, write ONE query returning each login date, the number of days since that user's PREVIOUS login, and a running count of that user's logins so far. Which functions and OVER() clauses do you need — and why an explicit ROWS frame for the running count?",
      starter:
        "SELECT\n" +
        "  user_id,\n" +
        "  login_date,\n" +
        "  /* days since this user's previous login */    AS days_since_prev,\n" +
        "  /* running count of this user's logins so far */ AS logins_so_far\n" +
        "FROM logins;",
      solution:
        "SELECT\n" +
        "  user_id,\n" +
        "  login_date,\n" +
        "  login_date - LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS days_since_prev,\n" +
        "  COUNT(*) OVER (PARTITION BY user_id ORDER BY login_date\n" +
        "                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)             AS logins_so_far\n" +
        "FROM logins\n" +
        "ORDER BY user_id, login_date;\n" +
        "-- LAG(login_date) partitioned by user gives the previous login (NULL on the first);\n" +
        "--   subtracting yields days since it. (Use DATEDIFF(...) in MySQL/SQL Server.)\n" +
        "-- COUNT(*) with an explicit ROWS frame is a true per-row running count: without\n" +
        "-- the frame the default RANGE would give every login sharing a date the same\n" +
        "-- (peer-grouped) count instead of a clean 1, 2, 3, ..."
    }
  }
]);
