/*
 * SQL Function Cheatsheet — interview coding-round depth.
 * Consumed by js/cheatsheet.js: window.SQL_CHEAT = { groups, rankOrder, essentialCount, fns }.
 * Rendering rules (identical to the PySpark/Python cheatsheets):
 *   - summary, params[].desc, notes  -> innerHTML (escape < > & ; <code>/<b> allowed)
 *   - example, output                -> textContent (PLAIN text, real newlines)
 * Dialect: T-SQL (SQL Server 2019/2022) as the baseline — matches this tool's SQL
 * problem set — with portability notes to Postgres/MySQL where the syntax diverges.
 */
window.SQL_CHEAT = {
  groups: [
    "Aggregates",
    "Window",
    "Conditional & NULL",
    "Dates",
    "Strings",
    "Numeric & Cast",
    "Filtering & Sets",
    "Clauses & CTEs"
  ],

  // Global usage ranking — most-used-in-interviews first. Drives the default
  // "Most used" sort, within-category order, and the ★ essential badge.
  rankOrder: [
    // ── Tier 1: the everyday core ──
    "count", "sum", "avg", "min-max", "row-number", "rank", "coalesce", "case",
    "join", "group-by", "having", "count-distinct", "lag-lead", "sum-over",
    "cast", "datediff", "substring", "concat", "distinct", "top-fetch",
    "where-in", "like", "dense-rank",
    // ── Tier 2 ──
    "ntile", "dateadd", "datepart", "nullif", "isnull", "exists", "union",
    "string-agg", "charindex", "replace", "len", "left-right", "trim",
    "round", "convert", "between", "order-by", "cte", "window-frame",
    // ── Tier 3 ──
    "first-last-value", "getdate", "format-date", "eomonth", "try-cast",
    "upper-lower", "replicate", "floor-ceiling", "abs", "iif", "intersect-except",
    "offset-fetch", "pivot", "grouping-sets", "recursive-cte"
  ],

  essentialCount: 23,

  fns: [
    // ============================================================= Aggregates
    {
      id: "count", group: "Aggregates", name: "COUNT",
      signature: "COUNT(*) | COUNT(expr) | COUNT(DISTINCT expr)",
      summary: "Count rows. <code>COUNT(*)</code> counts all rows; <code>COUNT(col)</code> skips <b>NULLs</b>.",
      returns: "INT / BIGINT",
      params: [
        { name: "*", type: "—", desc: "Counts every row in the group, NULLs included." },
        { name: "expr", type: "column|expr", desc: "Counts rows where the expression is <b>NOT NULL</b> — the classic 'count non-missing' trick." },
        { name: "DISTINCT expr", type: "modifier", desc: "Counts distinct non-NULL values." }
      ],
      example: "SELECT dept, COUNT(*) AS emps,\n       COUNT(bonus) AS with_bonus\nFROM Employee\nGROUP BY dept;",
      output: "rows per dept + non-NULL bonus count",
      notes: "<code>COUNT(col)</code> vs <code>COUNT(*)</code> differing is your fastest NULL-detector. <code>COUNT(DISTINCT ...)</code> can't take multiple columns in T-SQL."
    },
    {
      id: "sum", group: "Aggregates", name: "SUM",
      signature: "SUM([DISTINCT] expr)",
      summary: "Total a numeric expression across a group. Ignores NULLs.",
      returns: "numeric",
      params: [
        { name: "expr", type: "numeric", desc: "Values to add; NULLs are skipped (not treated as 0)." },
        { name: "DISTINCT", type: "modifier", desc: "Sum only distinct values (rare)." }
      ],
      example: "SELECT customer_id, SUM(amount) AS total\nFROM Orders\nGROUP BY customer_id;",
      output: "revenue per customer",
      notes: "Conditional sum with CASE: <code>SUM(CASE WHEN status='paid' THEN amount ELSE 0 END)</code>. Wrap in <code>COALESCE(SUM(x),0)</code> if an all-NULL group must show 0."
    },
    {
      id: "avg", group: "Aggregates", name: "AVG",
      signature: "AVG(expr)",
      summary: "Mean of non-NULL values. Beware <b>integer</b> division.",
      returns: "numeric",
      params: [
        { name: "expr", type: "numeric", desc: "NULLs are excluded from both the sum and the count." }
      ],
      example: "SELECT AVG(salary * 1.0) AS avg_sal\nFROM Employee;",
      output: "mean salary (as decimal)",
      notes: "<code>AVG(int_col)</code> does integer math in T-SQL — multiply by <code>1.0</code> or <code>CAST</code> to decimal first. NULLs shrink the denominator."
    },
    {
      id: "min-max", group: "Aggregates", name: "MIN / MAX",
      signature: "MIN(expr) | MAX(expr)",
      summary: "Smallest / largest value in a group. Work on numbers, dates, and strings.",
      returns: "same type as expr",
      params: [
        { name: "expr", type: "any orderable", desc: "NULLs ignored. On strings/dates uses collation / chronological order." }
      ],
      example: "SELECT customer_id,\n       MIN(order_date) AS first_order,\n       MAX(order_date) AS last_order\nFROM Orders GROUP BY customer_id;",
      output: "first & last order per customer",
      notes: "For the whole <b>row</b> at the min/max (not just the value), use <code>ROW_NUMBER()</code> or a correlated subquery."
    },
    {
      id: "count-distinct", group: "Aggregates", name: "COUNT(DISTINCT ...)",
      signature: "COUNT(DISTINCT expr)",
      summary: "Number of unique non-NULL values — distinct customers, distinct days active.",
      returns: "INT",
      params: [
        { name: "expr", type: "column|expr", desc: "Distinct values counted; NULLs excluded. Single expression only in T-SQL." }
      ],
      example: "SELECT COUNT(DISTINCT customer_id) AS buyers\nFROM Orders;",
      output: "how many unique buyers",
      notes: "Need distinct over multiple columns? Concatenate them, or <code>COUNT(*)</code> over a <code>DISTINCT</code> subquery."
    },
    {
      id: "string-agg", group: "Aggregates", name: "STRING_AGG",
      signature: "STRING_AGG(expr, sep) [WITHIN GROUP (ORDER BY ...)]",
      summary: "Concatenate a column's values across a group into one delimited string.",
      returns: "VARCHAR",
      params: [
        { name: "expr", type: "string", desc: "Value to concatenate (cast non-strings)." },
        { name: "separator", type: "string", desc: "Delimiter between values, e.g. <code>', '</code>." },
        { name: "WITHIN GROUP", type: "clause", desc: "Optional ordering of the concatenated items." }
      ],
      example: "SELECT dept,\n  STRING_AGG(name, ', ')\n    WITHIN GROUP (ORDER BY name) AS people\nFROM Employee GROUP BY dept;",
      output: "comma-separated names per dept",
      notes: "SQL Server 2017+. Postgres: same name; MySQL: <code>GROUP_CONCAT</code>; Oracle: <code>LISTAGG</code>."
    },
    {
      id: "group-by", group: "Aggregates", name: "GROUP BY",
      signature: "GROUP BY col1, col2, ...",
      summary: "Collapse rows sharing the grouping keys into one row per group for aggregation.",
      returns: "grouped result set",
      params: [
        { name: "col1, ...", type: "columns/expr", desc: "Every non-aggregated column in SELECT must appear here (T-SQL rule)." }
      ],
      example: "SELECT dept, job, COUNT(*)\nFROM Employee\nGROUP BY dept, job;",
      output: "one row per (dept, job)",
      notes: "Filter groups with <code>HAVING</code>, rows with <code>WHERE</code> (runs first). You can group by an expression, but not by a SELECT alias in T-SQL."
    },
    {
      id: "having", group: "Aggregates", name: "HAVING",
      signature: "HAVING aggregate_condition",
      summary: "Filter <b>groups</b> after aggregation — use it for conditions on <code>COUNT</code>/<code>SUM</code>/etc.",
      returns: "filtered groups",
      params: [
        { name: "condition", type: "boolean", desc: "May reference aggregates: <code>HAVING COUNT(*) &gt; 1</code>. Row-level filters belong in WHERE." }
      ],
      example: "SELECT email, COUNT(*) AS n\nFROM Person\nGROUP BY email\nHAVING COUNT(*) > 1;   -- duplicates",
      output: "emails appearing more than once",
      notes: "Order of execution: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. That's why HAVING sees aggregates and WHERE doesn't."
    },
    {
      id: "grouping-sets", group: "Aggregates", name: "GROUPING SETS / ROLLUP / CUBE",
      signature: "GROUP BY ROLLUP(a, b) | GROUPING SETS ((a),(b),())",
      summary: "Multiple aggregation levels (incl. subtotals & grand total) in one query.",
      returns: "grouped result set",
      params: [
        { name: "ROLLUP", type: "cols", desc: "Hierarchical subtotals + grand total." },
        { name: "CUBE", type: "cols", desc: "All combinations of the columns." },
        { name: "GROUPING SETS", type: "sets", desc: "Exactly the group levels you list; <code>()</code> is the grand total." }
      ],
      example: "SELECT region, product, SUM(sales)\nFROM S\nGROUP BY ROLLUP(region, product);",
      output: "per product, per region subtotal, grand total",
      notes: "Use <code>GROUPING(col)</code> to tell a subtotal NULL from a real NULL."
    },

    // ================================================================= Window
    {
      id: "row-number", group: "Window", name: "ROW_NUMBER",
      signature: "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)",
      summary: "Unique 1..N sequence per partition — the go-to for <b>top-N-per-group</b> and dedup.",
      returns: "BIGINT",
      params: [
        { name: "PARTITION BY", type: "cols", desc: "Restart numbering per group; omit to number the whole set." },
        { name: "ORDER BY", type: "cols", desc: "Required — defines the ranking order (ties broken arbitrarily but each row gets a distinct number)." }
      ],
      example: "SELECT * FROM (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY dept ORDER BY salary DESC) AS rn\n  FROM Employee) t\nWHERE rn <= 3;   -- top 3 per dept",
      output: "top 3 earners per department",
      notes: "Window functions can't go in WHERE — wrap in a subquery/CTE and filter the alias. Distinct numbers even on ties (unlike RANK)."
    },
    {
      id: "rank", group: "Window", name: "RANK",
      signature: "RANK() OVER (PARTITION BY ... ORDER BY ...)",
      summary: "Ranking with <b>gaps</b> on ties — tied rows share a rank, then the next value skips ahead.",
      returns: "BIGINT",
      params: [
        { name: "PARTITION BY / ORDER BY", type: "cols", desc: "Same as ROW_NUMBER; ties get equal rank." }
      ],
      example: "RANK() OVER (ORDER BY score DESC)\n-- scores 90,90,80 -> ranks 1,1,3",
      output: "1, 1, 3 (gap after the tie)",
      notes: "'Nth highest distinct' → <code>DENSE_RANK</code>. 'Top N rows regardless of ties' → <code>ROW_NUMBER</code>."
    },
    {
      id: "dense-rank", group: "Window", name: "DENSE_RANK",
      signature: "DENSE_RANK() OVER (ORDER BY ...)",
      summary: "Ranking with <b>no gaps</b> — tied rows share a rank and the next value is +1.",
      returns: "BIGINT",
      params: [
        { name: "PARTITION BY / ORDER BY", type: "cols", desc: "Ties share a rank; numbering stays contiguous." }
      ],
      example: "SELECT * FROM (\n  SELECT *, DENSE_RANK() OVER (\n    ORDER BY salary DESC) AS dr\n  FROM Employee) t\nWHERE dr = 2;   -- 2nd highest salary",
      output: "the Nth-highest distinct salary",
      notes: "The right tool for 'Nth highest salary' problems — counts distinct values, so ties don't consume a rank."
    },
    {
      id: "ntile", group: "Window", name: "NTILE",
      signature: "NTILE(n) OVER (ORDER BY ...)",
      summary: "Split ordered rows into <code>n</code> roughly equal buckets — quartiles, percentile bands.",
      returns: "INT (1..n)",
      params: [
        { name: "n", type: "int", desc: "Number of buckets. Earlier buckets get the extra rows when it doesn't divide evenly." },
        { name: "OVER(...)", type: "clause", desc: "PARTITION/ORDER as usual." }
      ],
      example: "SELECT name, NTILE(4) OVER (ORDER BY salary) AS quartile\nFROM Employee;",
      output: "salary quartile 1-4 per employee",
      notes: "Buckets differ by at most one row. For true percentiles use <code>PERCENTILE_CONT</code>/<code>CUME_DIST</code>."
    },
    {
      id: "lag-lead", group: "Window", name: "LAG / LEAD",
      signature: "LAG(expr, offset, default) OVER (ORDER BY ...)",
      summary: "Read a value from a <b>previous / next</b> row — deltas, gaps, run detection.",
      returns: "same type as expr",
      params: [
        { name: "expr", type: "column", desc: "Value to pull from the other row." },
        { name: "offset", type: "int", desc: "How many rows back (LAG) / forward (LEAD); default 1." },
        { name: "default", type: "any", desc: "Value when there's no such row (else NULL)." }
      ],
      example: "SELECT day, sales,\n  sales - LAG(sales,1,0) OVER (ORDER BY day) AS delta\nFROM Daily;",
      output: "day-over-day change",
      notes: "Backbone of gaps-and-islands and 'consecutive' problems. Compare a row to <code>LAG(...)</code> to detect a new group."
    },
    {
      id: "sum-over", group: "Window", name: "SUM / AVG OVER (running)",
      signature: "SUM(expr) OVER (PARTITION BY .. ORDER BY .. ROWS ...)",
      summary: "Aggregate <b>without collapsing rows</b> — running totals, moving averages, group shares.",
      returns: "numeric",
      params: [
        { name: "PARTITION BY", type: "cols", desc: "Reset the accumulation per group." },
        { name: "ORDER BY", type: "cols", desc: "Present → running (cumulative) aggregate; absent → total over the whole partition." },
        { name: "ROWS/RANGE", type: "frame", desc: "Restrict the window (see window frame)." }
      ],
      example: "SELECT day, amt,\n  SUM(amt) OVER (ORDER BY day\n    ROWS UNBOUNDED PRECEDING) AS running,\n  amt * 1.0 / SUM(amt) OVER () AS pct\nFROM Daily;",
      output: "running total + share of grand total",
      notes: "<code>OVER ()</code> = grand total on every row (great for % of total). Adding ORDER BY silently switches to a running frame."
    },
    {
      id: "first-last-value", group: "Window", name: "FIRST_VALUE / LAST_VALUE",
      signature: "FIRST_VALUE(expr) OVER (PARTITION BY .. ORDER BY .. frame)",
      summary: "Grab the first / last value in the window frame — e.g. each group's opening price.",
      returns: "same type as expr",
      params: [
        { name: "expr", type: "column", desc: "Value to fetch from the frame boundary." },
        { name: "frame", type: "ROWS/RANGE", desc: "Critical for LAST_VALUE — default frame ends at the current row." }
      ],
      example: "FIRST_VALUE(price) OVER (\n  PARTITION BY sym ORDER BY ts) AS open,\nLAST_VALUE(price) OVER (\n  PARTITION BY sym ORDER BY ts\n  ROWS BETWEEN UNBOUNDED PRECEDING\n           AND UNBOUNDED FOLLOWING) AS close",
      output: "opening & closing price per symbol",
      notes: "<b>Trap:</b> <code>LAST_VALUE</code> without an explicit full frame returns the current row, not the partition's last."
    },
    {
      id: "window-frame", group: "Window", name: "ROWS / RANGE frame",
      signature: "ROWS BETWEEN n PRECEDING AND m FOLLOWING",
      summary: "Define exactly which rows an OVER aggregate sees — sliding windows, moving averages.",
      returns: "window frame",
      params: [
        { name: "ROWS", type: "physical", desc: "Count of rows around the current row (deterministic)." },
        { name: "RANGE", type: "logical", desc: "By value of the ORDER BY key — ties share a frame; can behave surprisingly." },
        { name: "bounds", type: "keywords", desc: "<code>UNBOUNDED PRECEDING</code>, <code>n PRECEDING</code>, <code>CURRENT ROW</code>, <code>m FOLLOWING</code>." }
      ],
      example: "AVG(x) OVER (ORDER BY day\n  ROWS BETWEEN 6 PRECEDING\n           AND CURRENT ROW)  -- 7-day MA",
      output: "trailing 7-day moving average",
      notes: "Prefer <code>ROWS</code> over <code>RANGE</code> unless you specifically want value-based grouping of ties."
    },

    // ====================================================== Conditional & NULL
    {
      id: "case", group: "Conditional & NULL", name: "CASE",
      signature: "CASE WHEN cond THEN a ... ELSE b END",
      summary: "Inline if/else — bucketing, conditional aggregation, pivoting.",
      returns: "any (single type)",
      params: [
        { name: "WHEN cond THEN val", type: "clauses", desc: "Evaluated top-down; first true wins." },
        { name: "ELSE val", type: "clause", desc: "Fallback; omitted → NULL when nothing matches." }
      ],
      example: "SELECT SUM(CASE WHEN status='paid'\n                THEN amount ELSE 0 END) AS paid\nFROM Orders;",
      output: "sum of paid amounts only",
      notes: "<code>CASE</code> + <code>SUM</code>/<code>COUNT</code> is manual pivoting. All branches must return a compatible type."
    },
    {
      id: "coalesce", group: "Conditional & NULL", name: "COALESCE",
      signature: "COALESCE(expr1, expr2, ...)",
      summary: "Return the first <b>non-NULL</b> argument — the standard NULL fallback.",
      returns: "first non-NULL",
      params: [
        { name: "expr1, expr2, ...", type: "any", desc: "Checked left to right; two or more args, all compatible types." }
      ],
      example: "SELECT COALESCE(nickname, first_name, 'N/A')\nFROM Person;",
      output: "best available name",
      notes: "ANSI-standard (portable), unlike <code>ISNULL</code>. Also fills gaps after LEFT JOINs: <code>COALESCE(SUM(x), 0)</code>."
    },
    {
      id: "nullif", group: "Conditional & NULL", name: "NULLIF",
      signature: "NULLIF(a, b)",
      summary: "Return NULL when <code>a = b</code>, else <code>a</code> — famously guards divide-by-zero.",
      returns: "type of a or NULL",
      params: [
        { name: "a", type: "any", desc: "Value returned unless it equals b." },
        { name: "b", type: "any", desc: "When equal to a, the result is NULL." }
      ],
      example: "SELECT total / NULLIF(cnt, 0) AS avg_val\nFROM Agg;",
      output: "avoids divide-by-zero (NULL instead)",
      notes: "Pair with COALESCE to get a chosen fallback: <code>COALESCE(x / NULLIF(y,0), 0)</code>."
    },
    {
      id: "isnull", group: "Conditional & NULL", name: "ISNULL (T-SQL)",
      signature: "ISNULL(expr, replacement)",
      summary: "Two-arg NULL replacement — SQL Server's shorthand for a single fallback.",
      returns: "type of expr",
      params: [
        { name: "expr", type: "any", desc: "Value to test for NULL." },
        { name: "replacement", type: "any", desc: "Returned when expr is NULL. Result type follows <code>expr</code>, which can truncate." }
      ],
      example: "SELECT ISNULL(bonus, 0) AS bonus\nFROM Employee;",
      output: "0 instead of NULL",
      notes: "Prefer <code>COALESCE</code> for portability and multiple fallbacks. <code>ISNULL</code> takes exactly two args and is T-SQL-only (MySQL's <code>IFNULL</code> is the analog)."
    },
    {
      id: "iif", group: "Conditional & NULL", name: "IIF (T-SQL)",
      signature: "IIF(condition, true_val, false_val)",
      summary: "Compact two-branch CASE — quick flags and labels.",
      returns: "type of the values",
      params: [
        { name: "condition", type: "boolean", desc: "Tested once." },
        { name: "true_val / false_val", type: "any", desc: "Returned for true / false." }
      ],
      example: "SELECT name, IIF(salary >= 100000,'high','std') AS tier\nFROM Employee;",
      output: "a two-way label per row",
      notes: "SQL Server 2012+; just sugar for a 2-branch CASE. For 3+ branches use CASE (portable)."
    },

    // ================================================================== Dates
    {
      id: "datediff", group: "Dates", name: "DATEDIFF",
      signature: "DATEDIFF(datepart, start, end)",
      summary: "Whole-unit difference between two dates — ages, tenure, gaps.",
      returns: "INT",
      params: [
        { name: "datepart", type: "keyword", desc: "<code>day</code>, <code>month</code>, <code>year</code>, <code>hour</code>, <code>minute</code>, <code>second</code>…" },
        { name: "start, end", type: "date/datetime", desc: "Result is <code>end - start</code> (negative if reversed)." }
      ],
      example: "SELECT DATEDIFF(day, order_date, ship_date) AS days_to_ship\nFROM Orders;",
      output: "days between two dates",
      notes: "Counts boundary crossings, not elapsed time — <code>DATEDIFF(year,'2020-12-31','2021-01-01')</code> is 1. Postgres/MySQL differ; there it's often date subtraction."
    },
    {
      id: "dateadd", group: "Dates", name: "DATEADD",
      signature: "DATEADD(datepart, number, date)",
      summary: "Shift a date by N units — windows like 'last 30 days', month boundaries.",
      returns: "date/datetime",
      params: [
        { name: "datepart", type: "keyword", desc: "Unit to add: day/month/year/hour…" },
        { name: "number", type: "int", desc: "How many units (negative to subtract)." },
        { name: "date", type: "date", desc: "Base date." }
      ],
      example: "WHERE order_date >= DATEADD(day, -30, GETDATE())",
      output: "rows from the last 30 days",
      notes: "Keep the column bare on the left (<code>col &gt;= DATEADD(...)</code>) so an index can be used — don't wrap the column in a function."
    },
    {
      id: "datepart", group: "Dates", name: "DATEPART / YEAR / MONTH / DAY",
      signature: "DATEPART(part, date) | YEAR(date) | MONTH(date)",
      summary: "Extract a component of a date for grouping/filtering (e.g. monthly rollups).",
      returns: "INT",
      params: [
        { name: "part", type: "keyword", desc: "<code>year</code>, <code>month</code>, <code>day</code>, <code>weekday</code>, <code>quarter</code>, <code>hour</code>…" },
        { name: "date", type: "date", desc: "Source date." }
      ],
      example: "SELECT YEAR(order_date) AS yr,\n       MONTH(order_date) AS mo,\n       SUM(amount)\nFROM Orders GROUP BY YEAR(order_date), MONTH(order_date);",
      output: "monthly revenue",
      notes: "Grouping by <code>MONTH()</code> alone merges years — group by year+month or by <code>DATEFROMPARTS</code>/truncated date. Postgres: <code>EXTRACT</code>/<code>DATE_TRUNC</code>."
    },
    {
      id: "getdate", group: "Dates", name: "GETDATE / SYSDATETIME / CURRENT_TIMESTAMP",
      signature: "GETDATE() | CAST(GETDATE() AS date)",
      summary: "The current date/time on the server — 'now' for recency filters.",
      returns: "datetime",
      params: [
        { name: "—", type: "", desc: "<code>CAST(... AS date)</code> to drop the time; <code>CURRENT_TIMESTAMP</code> is the ANSI-portable spelling." }
      ],
      example: "SELECT CAST(GETDATE() AS date) AS today;",
      output: "today's date (no time)",
      notes: "Postgres/MySQL: <code>CURRENT_DATE</code> / <code>NOW()</code>. Compare date columns to a computed 'now', not the reverse."
    },
    {
      id: "format-date", group: "Dates", name: "FORMAT / CONVERT (date → string)",
      signature: "FORMAT(date, 'yyyy-MM') | CONVERT(varchar, date, style)",
      summary: "Render a date as a formatted string — month labels, report keys.",
      returns: "VARCHAR",
      params: [
        { name: "format", type: "string", desc: "<code>FORMAT</code> uses .NET patterns (<code>'yyyy-MM-dd'</code>). Flexible but slow at scale." },
        { name: "style", type: "int", desc: "<code>CONVERT</code>'s numeric style code (e.g. 23 = yyyy-mm-dd) — faster." }
      ],
      example: "SELECT FORMAT(order_date,'yyyy-MM') AS ym,\n       SUM(amount)\nFROM Orders GROUP BY FORMAT(order_date,'yyyy-MM');",
      output: "revenue keyed by 'YYYY-MM'",
      notes: "<code>FORMAT</code> is convenient but heavy on big sets — prefer <code>CONVERT</code> with a style code, or group by real date parts."
    },
    {
      id: "eomonth", group: "Dates", name: "EOMONTH / DATETRUNC",
      signature: "EOMONTH(date [, offset]) | DATETRUNC(month, date)",
      summary: "Month-end date, or truncate a date to the start of a unit — month/period bucketing.",
      returns: "date",
      params: [
        { name: "date", type: "date", desc: "Base date." },
        { name: "offset", type: "int", desc: "EOMONTH: months to shift before taking end-of-month." },
        { name: "part", type: "keyword", desc: "DATETRUNC (SQL Server 2022+): unit to truncate to." }
      ],
      example: "SELECT EOMONTH(order_date) AS month_end,\n       DATETRUNC(month, order_date) AS month_start\nFROM Orders;",
      output: "first & last day of each order's month",
      notes: "Pre-2022, month-start = <code>DATEFROMPARTS(YEAR(d),MONTH(d),1)</code>. Postgres: <code>DATE_TRUNC('month', d)</code>."
    },

    // ================================================================ Strings
    {
      id: "concat", group: "Strings", name: "CONCAT / CONCAT_WS",
      signature: "CONCAT(a, b, ...) | CONCAT_WS(sep, a, b, ...)",
      summary: "Join values into one string; <code>CONCAT</code> treats NULL as empty (unlike <code>+</code>).",
      returns: "VARCHAR",
      params: [
        { name: "a, b, ...", type: "any", desc: "Auto-cast to string; NULLs become ''." },
        { name: "sep (CONCAT_WS)", type: "string", desc: "Separator inserted between non-NULL values." }
      ],
      example: "SELECT CONCAT(first_name, ' ', last_name) AS full,\n       CONCAT_WS('-', y, m, d) AS ymd\nFROM Person;",
      output: "'Ada Lovelace' / '2021-03-09'",
      notes: "The <code>+</code> operator returns NULL if <b>any</b> operand is NULL and won't auto-cast numbers — prefer <code>CONCAT</code>."
    },
    {
      id: "substring", group: "Strings", name: "SUBSTRING",
      signature: "SUBSTRING(str, start, length)",
      summary: "Extract part of a string. T-SQL indexes are <b>1-based</b>.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "Source string." },
        { name: "start", type: "int", desc: "1-based start position." },
        { name: "length", type: "int", desc: "Number of characters to take." }
      ],
      example: "SELECT SUBSTRING(email, 1,\n  CHARINDEX('@', email) - 1) AS local_part\nFROM Users;",
      output: "text before the @",
      notes: "Combine with <code>CHARINDEX</code> to cut on a delimiter. Postgres/MySQL also 1-based; <code>LEFT/RIGHT</code> are simpler for ends."
    },
    {
      id: "charindex", group: "Strings", name: "CHARINDEX / PATINDEX",
      signature: "CHARINDEX(needle, haystack [, start])",
      summary: "Position of a substring (1-based), or <code>0</code> if not found — split on delimiters.",
      returns: "INT",
      params: [
        { name: "needle", type: "string", desc: "Substring to find." },
        { name: "haystack", type: "string", desc: "String to search." },
        { name: "start", type: "int", desc: "Optional 1-based search start." }
      ],
      example: "SELECT CHARINDEX('@', 'a@b.com');   -- 2",
      output: "2",
      notes: "Returns 0 (not NULL/-1) when absent. <code>PATINDEX</code> takes a LIKE pattern. Postgres/MySQL: <code>POSITION</code>/<code>INSTR</code>."
    },
    {
      id: "len", group: "Strings", name: "LEN / DATALENGTH",
      signature: "LEN(str) | DATALENGTH(expr)",
      summary: "Character count of a string. <code>LEN</code> ignores <b>trailing</b> spaces.",
      returns: "INT",
      params: [
        { name: "str", type: "string", desc: "Source. <code>LEN</code> trims trailing spaces before counting." },
        { name: "DATALENGTH", type: "any", desc: "Byte length (counts trailing spaces; 2×chars for NVARCHAR)." }
      ],
      example: "SELECT LEN('abc   ');   -- 3",
      output: "3",
      notes: "Need trailing spaces counted? Use <code>DATALENGTH</code>. Postgres/MySQL: <code>LENGTH</code>/<code>CHAR_LENGTH</code>."
    },
    {
      id: "left-right", group: "Strings", name: "LEFT / RIGHT",
      signature: "LEFT(str, n) | RIGHT(str, n)",
      summary: "First / last <code>n</code> characters — prefixes, suffixes, last-4-digits.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "Source string." },
        { name: "n", type: "int", desc: "How many characters from the start / end." }
      ],
      example: "SELECT RIGHT(card_number, 4) AS last4,\n       LEFT(name, 1) AS initial\nFROM Cards;",
      output: "last 4 digits, first initial",
      notes: "Simpler than <code>SUBSTRING</code> for ends. Widely portable (Postgres/MySQL have both)."
    },
    {
      id: "replace", group: "Strings", name: "REPLACE",
      signature: "REPLACE(str, find, replace)",
      summary: "Swap every occurrence of a substring — cleaning, normalization.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "Source string." },
        { name: "find", type: "string", desc: "Substring to replace (all occurrences)." },
        { name: "replace", type: "string", desc: "Replacement text ('' deletes)." }
      ],
      example: "SELECT REPLACE(phone, '-', '') AS digits;",
      output: "phone with dashes removed",
      notes: "Case-sensitivity follows the column's collation. Chain calls to strip several characters."
    },
    {
      id: "trim", group: "Strings", name: "TRIM / LTRIM / RTRIM",
      signature: "TRIM(str) | LTRIM(str) | RTRIM(str)",
      summary: "Remove leading/trailing whitespace (or specified chars) — clean user input.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "String to trim." },
        { name: "chars", type: "string", desc: "SQL Server 2022+: <code>TRIM('x' FROM str)</code> trims specific characters." }
      ],
      example: "SELECT TRIM(name) AS clean\nFROM Person;",
      output: "name with ends trimmed",
      notes: "Single-arg <code>TRIM</code> works from SQL Server 2017. Pre-2017: <code>LTRIM(RTRIM(str))</code>."
    },
    {
      id: "upper-lower", group: "Strings", name: "UPPER / LOWER",
      signature: "UPPER(str) | LOWER(str)",
      summary: "Case conversion — normalize before comparing or grouping.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "String to convert." }
      ],
      example: "WHERE LOWER(email) = LOWER(@input)",
      output: "case-insensitive match",
      notes: "If the collation is already case-insensitive, comparisons ignore case without this — but normalizing is explicit and portable."
    },
    {
      id: "replicate", group: "Strings", name: "REPLICATE / SPACE",
      signature: "REPLICATE(str, n)",
      summary: "Repeat a string N times — padding, masking, simple bar charts.",
      returns: "VARCHAR",
      params: [
        { name: "str", type: "string", desc: "String to repeat." },
        { name: "n", type: "int", desc: "Repeat count." }
      ],
      example: "SELECT REPLICATE('*', 5);   -- '*****'",
      output: "'*****'",
      notes: "Left-pad a number: <code>RIGHT(REPLICATE('0',6)+CAST(n AS varchar),6)</code>. Postgres/MySQL: <code>REPEAT</code>; <code>LPAD</code> pads directly."
    },

    // ========================================================= Numeric & Cast
    {
      id: "cast", group: "Numeric & Cast", name: "CAST",
      signature: "CAST(expr AS type)",
      summary: "Convert between types — the ANSI-standard, portable conversion.",
      returns: "target type",
      params: [
        { name: "expr", type: "any", desc: "Value to convert." },
        { name: "type", type: "data type", desc: "Target: <code>INT</code>, <code>DECIMAL(10,2)</code>, <code>DATE</code>, <code>VARCHAR(n)</code>…" }
      ],
      example: "SELECT CAST(total AS DECIMAL(10,2)),\n       CAST(order_date AS DATE)\nFROM Orders;",
      output: "typed / date-only values",
      notes: "Forces decimal division: <code>CAST(a AS DECIMAL) / b</code>. Fails hard on bad values — use <code>TRY_CAST</code> for dirty data."
    },
    {
      id: "convert", group: "Numeric & Cast", name: "CONVERT (T-SQL)",
      signature: "CONVERT(type, expr [, style])",
      summary: "Like <code>CAST</code> but with a <b>style</b> code — mainly for date⇄string formatting.",
      returns: "target type",
      params: [
        { name: "type", type: "data type", desc: "Target type." },
        { name: "expr", type: "any", desc: "Value to convert." },
        { name: "style", type: "int", desc: "Format code (e.g. 23=yyyy-mm-dd, 101=mm/dd/yyyy)." }
      ],
      example: "SELECT CONVERT(varchar, order_date, 23);   -- '2021-03-09'",
      output: "'2021-03-09'",
      notes: "T-SQL-only; use <code>CAST</code> when you don't need a style (portable). Style codes matter for locale-safe date strings."
    },
    {
      id: "try-cast", group: "Numeric & Cast", name: "TRY_CAST / TRY_CONVERT",
      signature: "TRY_CAST(expr AS type)",
      summary: "Like <code>CAST</code> but returns <b>NULL</b> instead of erroring on bad input — dirty data.",
      returns: "target type or NULL",
      params: [
        { name: "expr", type: "any", desc: "Value that might not convert." },
        { name: "type", type: "data type", desc: "Target type; failed rows become NULL." }
      ],
      example: "SELECT TRY_CAST(raw_age AS INT) AS age\nFROM Staging;   -- 'N/A' -> NULL",
      output: "clean INTs, NULL where unparseable",
      notes: "SQL Server 2012+. The safe way to parse a messy staging column. Postgres has no direct analog (use regex/validation)."
    },
    {
      id: "round", group: "Numeric & Cast", name: "ROUND",
      signature: "ROUND(number, decimals [, trunc])",
      summary: "Round to N decimal places (or truncate with the 3rd arg).",
      returns: "numeric",
      params: [
        { name: "number", type: "numeric", desc: "Value to round." },
        { name: "decimals", type: "int", desc: "Places; negative rounds to tens/hundreds." },
        { name: "trunc", type: "int", desc: "Non-zero → truncate instead of round." }
      ],
      example: "SELECT ROUND(123.456, 2),\n       ROUND(123.456, -1);",
      output: "123.46   and   120",
      notes: "For fixed display, <code>CAST(x AS DECIMAL(10,2))</code> also fixes the scale. Rounding mode is round-half-up."
    },
    {
      id: "floor-ceiling", group: "Numeric & Cast", name: "FLOOR / CEILING",
      signature: "FLOOR(x) | CEILING(x)",
      summary: "Round toward −∞ / +∞ — bucketing, pagination math.",
      returns: "numeric",
      params: [
        { name: "x", type: "numeric", desc: "Value to round to an integer boundary." }
      ],
      example: "SELECT CEILING(count * 1.0 / page_size) AS pages\nFROM T;",
      output: "number of pages needed",
      notes: "Both keep the input's numeric type — <code>CAST</code> to INT if you need an integer. Modulo is <code>%</code> in T-SQL."
    },
    {
      id: "abs", group: "Numeric & Cast", name: "ABS / SIGN / POWER",
      signature: "ABS(x) | SIGN(x) | POWER(x, y)",
      summary: "Magnitude, sign (−1/0/1), and exponentiation — deltas and scoring.",
      returns: "numeric",
      params: [
        { name: "x", type: "numeric", desc: "Input value." },
        { name: "y (POWER)", type: "numeric", desc: "Exponent." }
      ],
      example: "SELECT ABS(actual - target) AS err,\n       SIGN(delta) AS dir\nFROM T;",
      output: "absolute error + direction",
      notes: "<code>SQRT</code>, <code>EXP</code>, <code>LOG</code> round out the math set. <code>%</code> is the modulo operator."
    },

    // ====================================================== Filtering & Sets
    {
      id: "where-in", group: "Filtering & Sets", name: "IN / NOT IN",
      signature: "expr IN (v1, v2, ...) | expr IN (subquery)",
      summary: "Match against a list or a subquery — cleaner than chained <code>OR</code>s.",
      returns: "boolean",
      params: [
        { name: "list / subquery", type: "values | query", desc: "Constant list or a single-column subquery." }
      ],
      example: "WHERE status IN ('paid','shipped')\nWHERE id IN (SELECT customer_id FROM VIP);",
      output: "rows matching any listed value",
      notes: "<b>Trap:</b> <code>NOT IN</code> with a NULL in the list returns no rows — use <code>NOT EXISTS</code> or filter NULLs out."
    },
    {
      id: "like", group: "Filtering & Sets", name: "LIKE",
      signature: "expr LIKE 'pattern'",
      summary: "Pattern match: <code>%</code> = any run, <code>_</code> = one char. Prefix matches can use an index.",
      returns: "boolean",
      params: [
        { name: "pattern", type: "string", desc: "<code>%</code> any (incl. empty), <code>_</code> single char, <code>[a-z]</code> a class (T-SQL)." },
        { name: "ESCAPE", type: "clause", desc: "Escape literal <code>%</code>/<code>_</code>: <code>LIKE '%20\\%%' ESCAPE '\\'</code>." }
      ],
      example: "WHERE email LIKE '%@gmail.com'\nWHERE name LIKE 'A%';   -- can use an index",
      output: "gmail addresses / names starting with A",
      notes: "A leading <code>%</code> forces a scan (no index). Case sensitivity depends on collation. Postgres: <code>ILIKE</code> for case-insensitive."
    },
    {
      id: "between", group: "Filtering & Sets", name: "BETWEEN",
      signature: "expr BETWEEN low AND high",
      summary: "Inclusive range test — both endpoints are included.",
      returns: "boolean",
      params: [
        { name: "low, high", type: "orderable", desc: "Inclusive bounds; <code>low</code> must be ≤ <code>high</code>." }
      ],
      example: "WHERE order_date BETWEEN '2021-01-01' AND '2021-01-31'",
      output: "all of January (inclusive)",
      notes: "<b>Datetime trap:</b> <code>BETWEEN d1 AND d2</code> excludes times after midnight of d2 — prefer <code>&gt;= start AND &lt; next_day</code>."
    },
    {
      id: "exists", group: "Filtering & Sets", name: "EXISTS / NOT EXISTS",
      signature: "WHERE [NOT] EXISTS (correlated subquery)",
      summary: "Test whether a related row exists — the NULL-safe alternative to <code>IN</code>.",
      returns: "boolean",
      params: [
        { name: "subquery", type: "query", desc: "Correlated to the outer row; only its existence matters (<code>SELECT 1</code>)." }
      ],
      example: "SELECT c.* FROM Customer c\nWHERE NOT EXISTS (\n  SELECT 1 FROM Orders o\n  WHERE o.customer_id = c.id);",
      output: "customers with no orders",
      notes: "<code>NOT EXISTS</code> handles NULLs correctly where <code>NOT IN</code> silently breaks. Often the fastest anti-join."
    },
    {
      id: "distinct", group: "Filtering & Sets", name: "DISTINCT",
      signature: "SELECT DISTINCT col1, col2, ...",
      summary: "De-duplicate rows by the selected columns.",
      returns: "unique rows",
      params: [
        { name: "columns", type: "columns", desc: "Uniqueness is across the whole selected tuple, not one column." }
      ],
      example: "SELECT DISTINCT customer_id, product_id\nFROM Orders;",
      output: "unique (customer, product) pairs",
      notes: "For 'one row per key by latest date', <code>DISTINCT</code> won't do — use <code>ROW_NUMBER</code>. <code>DISTINCT</code> applies to all selected columns together."
    },
    {
      id: "union", group: "Filtering & Sets", name: "UNION / UNION ALL",
      signature: "query1 UNION [ALL] query2",
      summary: "Stack result sets. <code>UNION</code> removes duplicates; <code>UNION ALL</code> keeps them (faster).",
      returns: "combined result set",
      params: [
        { name: "queries", type: "SELECTs", desc: "Same column count & compatible types; names come from the first query." },
        { name: "ALL", type: "modifier", desc: "Skip the dedupe sort — use when you know rows are already distinct." }
      ],
      example: "SELECT id FROM A\nUNION ALL\nSELECT id FROM B;",
      output: "all ids from both tables",
      notes: "Prefer <code>UNION ALL</code> unless you truly need dedup — plain <code>UNION</code> pays for a distinct sort."
    },
    {
      id: "intersect-except", group: "Filtering & Sets", name: "INTERSECT / EXCEPT",
      signature: "query1 INTERSECT | EXCEPT query2",
      summary: "Set intersection / difference of two result sets (both dedupe).",
      returns: "result set",
      params: [
        { name: "INTERSECT", type: "op", desc: "Rows present in both queries." },
        { name: "EXCEPT", type: "op", desc: "Rows in the first but not the second (MySQL 8: <code>EXCEPT</code>; older MySQL lacks it)." }
      ],
      example: "SELECT id FROM Active\nEXCEPT\nSELECT id FROM Churned;",
      output: "active ids that never churned",
      notes: "These compare whole rows and are NULL-safe (NULL matches NULL here), unlike <code>NOT IN</code>."
    },
    {
      id: "top-fetch", group: "Filtering & Sets", name: "TOP",
      signature: "SELECT TOP (n) [WITH TIES] ... ORDER BY ...",
      summary: "Limit to the first <code>n</code> rows of an ordered result — top-N queries.",
      returns: "≤ n rows",
      params: [
        { name: "n", type: "int", desc: "Row cap. Add <code>PERCENT</code> for a percentage." },
        { name: "WITH TIES", type: "modifier", desc: "Also return rows tying the nth ORDER BY value (requires ORDER BY)." }
      ],
      example: "SELECT TOP (3) WITH TIES *\nFROM Employee ORDER BY salary DESC;",
      output: "top 3 earners (plus ties)",
      notes: "Meaningless without <code>ORDER BY</code>. Portable paging uses <code>OFFSET/FETCH</code>; MySQL/Postgres use <code>LIMIT</code>."
    },
    {
      id: "offset-fetch", group: "Filtering & Sets", name: "OFFSET / FETCH",
      signature: "ORDER BY ... OFFSET n ROWS FETCH NEXT m ROWS ONLY",
      summary: "Standard pagination — skip <code>n</code> rows, take the next <code>m</code>.",
      returns: "result page",
      params: [
        { name: "OFFSET n", type: "int", desc: "Rows to skip." },
        { name: "FETCH NEXT m", type: "int", desc: "Page size." }
      ],
      example: "SELECT * FROM Products\nORDER BY id\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;",
      output: "rows 21–30",
      notes: "ANSI-standard; requires <code>ORDER BY</code>. MySQL/Postgres: <code>LIMIT m OFFSET n</code>. Deep offsets are slow — keyset-paginate instead."
    },
    {
      id: "pivot", group: "Filtering & Sets", name: "PIVOT (CASE pivot)",
      signature: "SUM(CASE WHEN k='A' THEN v END) AS A, ...",
      summary: "Rotate rows into columns. The portable form is conditional aggregation.",
      returns: "wide result set",
      params: [
        { name: "CASE per column", type: "expr", desc: "One conditional aggregate per target column — works everywhere." },
        { name: "PIVOT clause", type: "T-SQL", desc: "SQL Server's dedicated <code>PIVOT</code> operator; fixed column list only." }
      ],
      example: "SELECT dept,\n  SUM(CASE WHEN yr=2020 THEN amt END) AS y2020,\n  SUM(CASE WHEN yr=2021 THEN amt END) AS y2021\nFROM S GROUP BY dept;",
      output: "one column per year",
      notes: "Prefer the CASE form — portable and flexible. Dynamic column lists need dynamic SQL. <code>UNPIVOT</code> / <code>CROSS APPLY VALUES</code> go the other way."
    },

    // =========================================================== Clauses & CTEs
    {
      id: "join", group: "Clauses & CTEs", name: "JOIN (INNER / LEFT / SELF)",
      signature: "FROM a [INNER|LEFT|RIGHT|FULL] JOIN b ON a.k = b.k",
      summary: "Combine rows across tables on a predicate — the heart of most queries.",
      returns: "combined rows",
      params: [
        { name: "INNER", type: "type", desc: "Only matched pairs." },
        { name: "LEFT", type: "type", desc: "All left rows; unmatched right side is NULL (find-missing pattern)." },
        { name: "ON", type: "predicate", desc: "Join condition; a <b>self-join</b> aliases the same table twice." }
      ],
      example: "SELECT e.name, m.name AS manager\nFROM Employee e\nLEFT JOIN Employee m ON e.manager_id = m.id;",
      output: "each employee + their manager",
      notes: "'Rows with no match' = <code>LEFT JOIN ... WHERE b.k IS NULL</code>. Filtering the right table in <code>WHERE</code> silently turns a LEFT JOIN into an INNER — put such conditions in <code>ON</code>."
    },
    {
      id: "order-by", group: "Clauses & CTEs", name: "ORDER BY",
      signature: "ORDER BY col [ASC|DESC], ... [NULLS pos]",
      summary: "Sort the final result. The only clause allowed to reference SELECT aliases.",
      returns: "ordered result set",
      params: [
        { name: "col / expr / alias", type: "sort key", desc: "Multiple keys break ties left to right. Can use a SELECT alias or column position." },
        { name: "ASC / DESC", type: "direction", desc: "Per key." }
      ],
      example: "SELECT name, salary AS s\nFROM Employee\nORDER BY s DESC, name ASC;",
      output: "highest salary first, name tiebreak",
      notes: "NULL ordering differs by engine (T-SQL: NULLs first on ASC). Postgres/Oracle support <code>NULLS FIRST/LAST</code>."
    },
    {
      id: "cte", group: "Clauses & CTEs", name: "WITH (CTE)",
      signature: "WITH cte AS ( SELECT ... ) SELECT ... FROM cte",
      summary: "Name a subquery up front for readable, layered queries (esp. with window functions).",
      returns: "—",
      params: [
        { name: "cte AS (...)", type: "named query", desc: "Reference it like a table below. Chain several, comma-separated." }
      ],
      example: "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY dept ORDER BY salary DESC) rn\n  FROM Employee)\nSELECT * FROM ranked WHERE rn = 1;",
      output: "top earner per department",
      notes: "The clean way to filter on a window function. A CTE is scoped to the one statement that follows; not automatically materialized."
    },
    {
      id: "recursive-cte", group: "Clauses & CTEs", name: "WITH RECURSIVE",
      signature: "WITH cte AS (anchor UNION ALL recursive_member) ...",
      summary: "Walk hierarchies / generate sequences — org charts, tree ancestry, number series.",
      returns: "—",
      params: [
        { name: "anchor", type: "query", desc: "Base rows (the seed)." },
        { name: "recursive member", type: "query", desc: "References the CTE; <code>UNION ALL</code>-ed until it returns no rows." }
      ],
      example: "WITH chain AS (\n  SELECT id, manager_id, 1 AS lvl FROM Emp WHERE id = 1\n  UNION ALL\n  SELECT e.id, e.manager_id, c.lvl+1\n  FROM Emp e JOIN chain c ON e.manager_id = c.id)\nSELECT * FROM chain;",
      output: "management chain with depth",
      notes: "T-SQL: keyword is just <code>WITH</code> (no <code>RECURSIVE</code>); cap runaway recursion with <code>OPTION (MAXRECURSION n)</code>. Postgres/MySQL require <code>RECURSIVE</code>."
    }
  ]
};
