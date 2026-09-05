/*
 * data/sql/concepts_aggregation.js — SQL "Learn" topic: Aggregation.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the T-SQL /
 * PostgreSQL / MySQL / Spark notes flagged inline); teaching structure mirrors
 * the Window Functions exemplar.
 */
window.LEARN.register("sql", "Aggregation", [
  {
    id: "group-by-aggregates",
    title: "GROUP BY & Aggregates",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Collapse many rows into one summary row per group, then compute totals, counts, and averages over each.",

    whatIsIt: [
      "An <b>aggregate function</b> takes many rows and returns a single value: <code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code>. On its own it collapses the whole table into one row.",
      "<code>GROUP BY</code> partitions the rows into groups by one or more columns, and the aggregate is then computed <b>once per group</b>. The result has exactly one row per distinct combination of the grouping columns.",
      "The golden rule of standard SQL: <b>every column in the <code>SELECT</code> list must either appear in <code>GROUP BY</code> or be wrapped in an aggregate</b>. A bare non-grouped column has no single value for the group, so it is an error.",
      "Watch the NULL behavior closely: <code>COUNT(*)</code> counts every row including NULLs, while <code>COUNT(col)</code> counts only rows where <code>col</code> is <b>not NULL</b>. <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, and <code>MAX</code> all silently skip NULLs too."
    ],

    showMe: {
      code:
        "-- One summary row per department: headcount, payroll, and average pay\n" +
        "SELECT\n" +
        "  department,\n" +
        "  COUNT(*)        AS headcount,\n" +
        "  COUNT(bonus)    AS with_bonus,   -- ignores rows where bonus IS NULL\n" +
        "  SUM(salary)     AS payroll,\n" +
        "  AVG(salary)     AS avg_salary,\n" +
        "  MAX(salary)     AS top_salary\n" +
        "FROM employee\n" +
        "GROUP BY department;",
      caption:
        "Rows collapse to one per department. COUNT(*) counts all employees; " +
        "COUNT(bonus) counts only those with a non-NULL bonus — the two differ exactly by the number of NULLs."
    },

    whyMatters:
      "<p>Aggregation is the workhorse of every reporting and analytics query: revenue per region, active users per day, orders per customer, error rate per service. Interview prompts that say <b>\"per\"</b>, <b>\"for each\"</b>, or <b>\"how many\"</b> are almost always a <code>GROUP BY</code>.</p>" +
      "<p>The clause execution order is what trips people up. Logically SQL runs <code>FROM</code> &rarr; <code>WHERE</code> &rarr; <code>GROUP BY</code> &rarr; aggregate &rarr; <code>HAVING</code> &rarr; <code>SELECT</code> &rarr; <code>ORDER BY</code>. So <code>WHERE</code> filters raw rows <b>before</b> grouping, and column aliases created in <code>SELECT</code> are not yet visible to <code>WHERE</code> or <code>GROUP BY</code>:</p>" +
      "<pre class=\"why-pre\">SELECT department, AVG(salary) AS avg_pay\nFROM employee\nWHERE hire_date >= '2020-01-01'   -- filters rows FIRST\nGROUP BY department;              -- then groups the survivors</pre>",

    recognize: [
      { q: "\"total / count / average per X\", \"for each X\", \"how many … by …\"", think: "GROUP BY X with the matching aggregate in SELECT" },
      { q: "\"number of non-null values\" vs \"number of rows\"", think: "COUNT(col) skips NULLs; COUNT(*) counts every row" },
      { q: "\"distinct customers\", \"unique visitors\"", think: "COUNT(DISTINCT customer_id) inside the group" },
      { q: "\"filter the rows before summarizing\"", think: "WHERE runs before GROUP BY — put the row filter there, not in HAVING" },
      { q: "\"grand total of the whole table\"", think: "an aggregate with no GROUP BY collapses everything to one row" }
    ],

    matchTags: ["group by", "aggregate", "count", "sum", "avg", "min", "max", "per group",
                "distinct", "grouping", "count distinct", "summary"],

    traps: [
      {
        bad: "SELECT department, name, AVG(salary)\nFROM employee\nGROUP BY department;   -- name is not grouped or aggregated",
        good: "SELECT department, AVG(salary)\nFROM employee\nGROUP BY department;   -- or add name to GROUP BY / wrap it in MAX()",
        why: "In standard SQL every non-aggregated SELECT column must be in GROUP BY. name has no single value per department, so the query is invalid. MySQL used to allow this (returning an arbitrary name) — a classic silent-bug trap."
      },
      {
        bad: "SELECT COUNT(bonus) FROM employee;   -- \"how many employees?\"",
        good: "SELECT COUNT(*) FROM employee;       -- counts every row incl. NULL bonus",
        why: "COUNT(col) ignores NULLs, so if some employees have no bonus you undercount the headcount. Use COUNT(*) when you mean 'number of rows'."
      },
      {
        bad: "SELECT AVG(amount) FROM sales;   -- rows with amount IS NULL just vanish",
        good: "SELECT SUM(amount) / COUNT(*) FROM sales;   -- if NULLs should count as 0",
        why: "AVG skips NULLs entirely, dividing the SUM by the count of non-NULL values. If a missing amount really means zero, replace NULLs (COALESCE) or divide by COUNT(*) yourself."
      }
    ],

    complexity: [
      { op: "GROUP BY (hash aggregation)", big_o: "O(n)", note: "The engine builds a hash table keyed by the grouping columns in one pass over n rows; each row updates its group's accumulators in amortized constant time." },
      { op: "GROUP BY (sort aggregation)", big_o: "O(n log n)", note: "When the engine sorts rows by the grouping key first, the cost is the sort; an index already ordered on the grouping columns lets it stream groups and skip the sort." },
      { op: "COUNT / SUM / AVG / MIN / MAX", big_o: "O(n)", note: "Each aggregate maintains a small running accumulator, so evaluating it costs one pass over the rows in each group with no extra memory per row." },
      { op: "COUNT(DISTINCT col)", big_o: "O(n)", note: "Requires tracking the set of distinct values seen (a hash set or a sort), so it uses extra memory proportional to the number of distinct values and is noticeably heavier than a plain COUNT." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code> and their NULL-skipping behavior are ANSI-standard and identical across PostgreSQL, SQL Server, MySQL, and Spark SQL.</p>" +
      "<ul>" +
      "<li><b>The GROUP BY rule:</b> Postgres, SQL Server, and Spark enforce that every non-aggregated SELECT column is in GROUP BY. MySQL historically relaxed this; with <code>ONLY_FULL_GROUP_BY</code> (the default since 5.7) it now enforces the standard too.</li>" +
      "<li><b>AVG return type:</b> Postgres returns <code>numeric</code> for integer input (exact); MySQL and SQL Server may return an integer-truncated or double result depending on the column type — cast to a decimal if you need precision.</li>" +
      "<li><b>Aliases in GROUP BY:</b> MySQL and Postgres let you <code>GROUP BY</code> a SELECT alias or ordinal position; SQL Server does not — repeat the full expression.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have orders(order_id, customer_id, amount, coupon_code). Write ONE query that returns, per customer: how many orders they placed, how many of those used a coupon, and their total spend. Which aggregate distinguishes 'orders with a coupon' from 'all orders'?",
      starter:
        "SELECT\n" +
        "  customer_id,\n" +
        "  /* all orders */          AS order_count,\n" +
        "  /* orders with a coupon */ AS coupon_orders,\n" +
        "  /* total spend */          AS total_spend\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;",
      solution:
        "SELECT\n" +
        "  customer_id,\n" +
        "  COUNT(*)           AS order_count,\n" +
        "  COUNT(coupon_code) AS coupon_orders,\n" +
        "  SUM(amount)        AS total_spend\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;\n" +
        "-- COUNT(*) counts every order; COUNT(coupon_code) skips NULL coupons,\n" +
        "-- so it counts only orders that actually used one."
    }
  },
  {
    id: "having",
    title: "HAVING",
    difficulty: "Core",
    estMinutes: 8,
    relevance: 3,
    tagline: "Filter groups AFTER aggregation — the WHERE clause for aggregates.",

    whatIsIt: [
      "<code>HAVING</code> filters <b>groups</b>, using conditions on aggregate results. It is to <code>GROUP BY</code> what <code>WHERE</code> is to raw rows.",
      "The key distinction: <code>WHERE</code> runs <b>before</b> grouping and filters individual rows; <code>HAVING</code> runs <b>after</b> grouping and filters the summary rows the aggregates produced. You cannot put an aggregate like <code>COUNT(*) &gt; 5</code> in <code>WHERE</code> — the aggregate doesn't exist yet at that stage.",
      "Because <code>HAVING</code> runs after the <code>GROUP BY</code>/aggregate step, it can reference aggregate functions directly (<code>HAVING SUM(amount) &gt; 1000</code>). It can also reference the grouping columns, but there's rarely a reason to — a plain-column filter belongs in <code>WHERE</code>, which is cheaper because it discards rows before the grouping work.",
      "Put both to work together: <code>WHERE</code> to shrink the input, then <code>GROUP BY</code>, then <code>HAVING</code> to keep only the groups that pass the aggregate test."
    ],

    showMe: {
      code:
        "-- Departments with more than 5 people AND an average salary above 80k,\n" +
        "-- considering only full-time employees\n" +
        "SELECT\n" +
        "  department,\n" +
        "  COUNT(*)    AS headcount,\n" +
        "  AVG(salary) AS avg_salary\n" +
        "FROM employee\n" +
        "WHERE employment_type = 'full_time'   -- filters ROWS before grouping\n" +
        "GROUP BY department\n" +
        "HAVING COUNT(*) > 5\n" +
        "   AND AVG(salary) > 80000;           -- filters GROUPS after aggregation",
      caption:
        "WHERE trims the raw rows to full-time employees first; then rows collapse per department; " +
        "then HAVING drops any department whose aggregated headcount or average pay fails the test."
    },

    whyMatters:
      "<p>Any question phrased as \"groups that have more than / at least / fewer than N …\" or \"categories whose total exceeds …\" is a <code>HAVING</code> clause. Examples: customers with 3+ orders, products sold in every region, days with over 1000 signups.</p>" +
      "<p>The single most common mistake is putting a plain-row condition in <code>HAVING</code> when it belongs in <code>WHERE</code>. It often still returns the right answer but does needless work — the engine groups rows it will later throw away. Rule of thumb:</p>" +
      "<ul>" +
      "<li>Condition on a <b>raw column value</b> (<code>status = 'active'</code>, <code>hire_date &gt; …</code>) &rarr; <code>WHERE</code>.</li>" +
      "<li>Condition on an <b>aggregate</b> (<code>COUNT(*) &gt; 5</code>, <code>SUM(x) &gt; 100</code>) &rarr; <code>HAVING</code>.</li>" +
      "</ul>",

    recognize: [
      { q: "\"groups with more than / at least / fewer than N rows\"", think: "GROUP BY … HAVING COUNT(*) <comparison> N" },
      { q: "\"categories whose total/average exceeds …\"", think: "HAVING SUM(x) > … or HAVING AVG(x) > …" },
      { q: "\"find duplicates\", \"values appearing more than once\"", think: "GROUP BY the key HAVING COUNT(*) > 1" },
      { q: "\"filter on a plain column value\"", think: "that's WHERE, not HAVING — do it before grouping" },
      { q: "\"customers who ordered in every month\"", think: "GROUP BY customer HAVING COUNT(DISTINCT month) = (total months)" }
    ],

    matchTags: ["having", "group by", "aggregate", "count", "sum", "avg", "per group",
                "duplicates", "filter groups", "at least"],

    traps: [
      {
        bad: "SELECT customer_id, COUNT(*)\nFROM orders\nWHERE COUNT(*) > 3     -- ERROR: aggregate not allowed in WHERE\nGROUP BY customer_id;",
        good: "SELECT customer_id, COUNT(*)\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(*) > 3;",
        why: "WHERE runs before grouping, so aggregates don't exist yet and are rejected. Conditions on aggregates must go in HAVING, which runs after the group step."
      },
      {
        bad: "SELECT department, AVG(salary)\nFROM employee\nGROUP BY department\nHAVING employment_type = 'full_time';   -- plain column, works but wasteful",
        good: "SELECT department, AVG(salary)\nFROM employee\nWHERE employment_type = 'full_time'\nGROUP BY department;",
        why: "employment_type is a raw-row condition, not an aggregate. Filtering it in WHERE discards rows before the expensive grouping; leaving it in HAVING groups rows only to throw them out (and can even error if the column isn't a grouping column)."
      },
      {
        bad: "SELECT department, COUNT(*) AS n\nFROM employee\nGROUP BY department\nHAVING n > 5;   -- alias not portable in HAVING",
        good: "SELECT department, COUNT(*) AS n\nFROM employee\nGROUP BY department\nHAVING COUNT(*) > 5;",
        why: "HAVING is logically evaluated before SELECT, so the SELECT alias 'n' may not be visible. Postgres and MySQL tolerate the alias; SQL Server and Spark do not — repeat the aggregate expression to be safe."
      }
    ],

    complexity: [
      { op: "HAVING filter", big_o: "O(g)", note: "Runs once per group g after aggregation, so its cost is proportional to the number of groups, which is typically far smaller than the number of rows." },
      { op: "WHERE + HAVING together", big_o: "O(n)", note: "WHERE cuts the n input rows first, reducing how many rows the O(n) grouping pass has to process before HAVING sees the groups." },
      { op: "HAVING COUNT(*) > 1 (find duplicates)", big_o: "O(n)", note: "The grouping pass over n rows dominates; the HAVING check itself is a cheap per-group comparison on the counts already computed." },
      { op: "Pushing a filter to WHERE vs HAVING", big_o: "O(n)", note: "Same asymptotic class, but WHERE lowers the constant factor by shrinking the input to the grouping step, so prefer it for plain-column conditions." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The logical ordering — <code>WHERE</code> before <code>GROUP BY</code>, <code>HAVING</code> after — is ANSI-standard and identical everywhere (PostgreSQL, SQL Server, MySQL, Spark SQL).</p>" +
      "<ul>" +
      "<li><b>Aliases in HAVING:</b> Postgres and MySQL let <code>HAVING</code> reference a SELECT alias; SQL Server and Spark SQL require the full aggregate expression because <code>HAVING</code> is logically evaluated before <code>SELECT</code>.</li>" +
      "<li><b>HAVING without GROUP BY:</b> all major engines allow it — the whole table is treated as one group, so <code>HAVING SUM(x) &gt; 0</code> filters that single implicit group.</li>" +
      "<li><b>Ordinal references:</b> unlike <code>ORDER BY</code> and (in some engines) <code>GROUP BY</code>, <code>HAVING</code> does not accept positional column numbers in any dialect.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have logins(user_id, login_date). Write ONE query to find users who logged in on more than 10 distinct days during 2025. Which clause holds the date-range filter, and which holds the 'more than 10 days' test?",
      starter:
        "SELECT user_id\n" +
        "FROM logins\n" +
        "/* restrict to 2025 */\n" +
        "GROUP BY user_id\n" +
        "/* keep only users with >10 distinct login days */;",
      solution:
        "SELECT user_id\n" +
        "FROM logins\n" +
        "WHERE login_date >= '2025-01-01'\n" +
        "  AND login_date <  '2026-01-01'\n" +
        "GROUP BY user_id\n" +
        "HAVING COUNT(DISTINCT login_date) > 10;\n" +
        "-- WHERE holds the raw-row date filter (before grouping);\n" +
        "-- HAVING holds the aggregate test on distinct days (after grouping)."
    }
  },
  {
    id: "group-by-extensions",
    title: "GROUP BY Extensions",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 2,
    tagline: "GROUPING SETS, ROLLUP, and CUBE — subtotals and grand totals in a single query.",

    whatIsIt: [
      "The <b>GROUP BY extensions</b> let one query aggregate at several grouping levels at once, adding <b>subtotal</b> and <b>grand-total</b> rows you would otherwise get by writing multiple queries joined with <code>UNION ALL</code>.",
      "<code>GROUPING SETS((a,b),(a),())</code> is the explicit form: you list each grouping combination you want. The other two are shorthands. <code>ROLLUP(a,b)</code> produces a hierarchy of subtotals — <code>(a,b)</code>, then <code>(a)</code>, then <code>()</code> the grand total — ideal for nested dimensions like year &rarr; month. <code>CUBE(a,b)</code> produces <b>every</b> combination — <code>(a,b)</code>, <code>(a)</code>, <code>(b)</code>, and <code>()</code> — for cross-tab reports.",
      "In the extra subtotal rows, the columns that aren't part of that grouping come back as <b>NULL</b>. Because a real data NULL looks the same, the <code>GROUPING(col)</code> function returns <code>1</code> for a NULL that marks a subtotal and <code>0</code> for an actual value — use it to label rows or with <code>GROUPING SETS</code> to sort totals to the bottom.",
      "Think of <code>ROLLUP</code> and <code>CUBE</code> as syntactic sugar: any of them can be rewritten as an equivalent <code>GROUPING SETS</code> list."
    ],

    showMe: {
      code:
        "-- Sales by (region, product), plus a subtotal per region, plus a grand total\n" +
        "SELECT\n" +
        "  region,\n" +
        "  product,\n" +
        "  SUM(amount)            AS total_sales,\n" +
        "  GROUPING(product)      AS is_region_subtotal\n" +
        "FROM sales\n" +
        "GROUP BY ROLLUP(region, product)\n" +
        "ORDER BY region, product;",
      caption:
        "ROLLUP(region, product) emits detail rows per (region, product), a subtotal row per region " +
        "(product is NULL, GROUPING(product)=1), and one grand-total row (both NULL). " +
        "Equivalent to GROUPING SETS((region, product), (region), ())."
    },

    whyMatters:
      "<p>Dashboards and financial reports constantly need \"detail plus subtotals plus a grand total\" in one result — sales by region with a per-region subtotal and a company-wide total, or headcount by department and level. Without extensions you'd run three <code>GROUP BY</code> queries and <code>UNION ALL</code> them, re-scanning the table each time.</p>" +
      "<p>The extensions do it in a single pass and are far more readable. The mental model — each extension is just a shorthand for a set of grouping combinations:</p>" +
      "<pre class=\"why-pre\">GROUP BY ROLLUP(a, b)\n  = GROUPING SETS ((a, b), (a), ())          -- hierarchy of subtotals\n\nGROUP BY CUBE(a, b)\n  = GROUPING SETS ((a, b), (a), (b), ())     -- every combination</pre>",

    recognize: [
      { q: "\"detail rows plus subtotals plus a grand total in one result\"", think: "GROUP BY ROLLUP(...) — the hierarchy shorthand" },
      { q: "\"cross-tab / totals for every combination of dimensions\"", think: "GROUP BY CUBE(...)" },
      { q: "\"these specific grouping levels and no others\"", think: "GROUP BY GROUPING SETS(( … ), ( … ), ())" },
      { q: "\"how do I tell a subtotal NULL from a real NULL?\"", think: "GROUPING(col) returns 1 for a subtotal placeholder, 0 for a real value" },
      { q: "\"year then month subtotals\"", think: "ROLLUP(year, month) — nested/hierarchical dimensions" }
    ],

    matchTags: ["group by extensions", "grouping sets", "cube", "rollup", "subtotal",
                "grand total", "group by", "aggregate", "grouping", "cross-tab"],

    traps: [
      {
        bad: "GROUP BY CUBE(region, product)   -- when you only want per-region subtotals",
        good: "GROUP BY ROLLUP(region, product) -- hierarchy: (region,product),(region),()",
        why: "CUBE emits every combination including (product) alone and standalone product subtotals you didn't ask for. For a nested hierarchy (region then product) ROLLUP gives exactly the subtotal rows you want and less noise."
      },
      {
        bad: "WHERE product IS NULL   -- trying to isolate the subtotal rows",
        good: "WHERE GROUPING(product) = 1   -- true subtotal marker",
        why: "A subtotal row's NULL is indistinguishable from a genuine NULL product by value. GROUPING(product)=1 reliably identifies the rows where product was rolled up, so you don't accidentally include real NULL-product data."
      },
      {
        bad: "SELECT region, product, SUM(amount)\nFROM sales GROUP BY GROUPING SETS ((region, product), (region))\n-- forgot the () grand total",
        good: "SELECT region, product, SUM(amount)\nFROM sales GROUP BY GROUPING SETS ((region, product), (region), ())",
        why: "GROUPING SETS is explicit — it produces only the sets you list. If you want a grand total you must include the empty set (). ROLLUP/CUBE add it automatically."
      }
    ],

    complexity: [
      { op: "ROLLUP(a, b)", big_o: "O(n)", note: "The engine computes the finest grouping in one pass and derives each coarser subtotal by aggregating those partial results, so it stays roughly linear in the input rather than re-scanning per level." },
      { op: "CUBE(a, b, …, k)", big_o: "O(n · 2^k)", note: "It materializes 2^k grouping combinations for k columns, so output size and work grow exponentially with the number of cubed columns — cube few columns, not many." },
      { op: "GROUPING SETS (explicit list)", big_o: "O(n · s)", note: "Cost scales with the number s of grouping sets you list; you pay only for the combinations you actually request, which is why it's the leanest of the three." },
      { op: "Equivalent UNION ALL of GROUP BYs", big_o: "O(n · s)", note: "Produces the same rows but typically re-scans the base table once per grouping set, so the extensions are usually faster by computing the sets in a shared pass." },
      { op: "GROUPING(col)", big_o: "O(1)", note: "A per-row bit test on already-computed grouping metadata, so it adds no meaningful cost beyond the aggregation itself." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>GROUPING SETS</code>, <code>ROLLUP</code>, and <code>CUBE</code> are ANSI-standard but support varies:</p>" +
      "<ul>" +
      "<li><b>PostgreSQL (9.5+):</b> full support for all three plus <code>GROUPING()</code>, using the standard syntax <code>GROUP BY ROLLUP(a, b)</code>.</li>" +
      "<li><b>SQL Server:</b> full support for <code>GROUPING SETS</code>, <code>ROLLUP</code>, <code>CUBE</code>, and <code>GROUPING()</code>/<code>GROUPING_ID()</code>. The old non-standard <code>WITH ROLLUP</code>/<code>WITH CUBE</code> syntax is deprecated.</li>" +
      "<li><b>MySQL:</b> supports <code>GROUP BY … WITH ROLLUP</code> only — no <code>CUBE</code>, and <code>GROUPING SETS</code> arrived only in MySQL 8.0.1's <code>GROUPING()</code> support; there is no CUBE at all.</li>" +
      "<li><b>Spark SQL:</b> supports all three via <code>ROLLUP(...)</code>, <code>CUBE(...)</code>, and <code>GROUPING SETS(...)</code>, plus <code>GROUPING</code>/<code>GROUPING_ID</code>.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have sales(year, quarter, amount). Write ONE query returning total amount per (year, quarter), a subtotal per year, and a single grand total — with a flag marking the subtotal/total rows. Which extension gives this hierarchy, and how do you distinguish the total rows?",
      starter:
        "SELECT\n" +
        "  year,\n" +
        "  quarter,\n" +
        "  SUM(amount) AS total,\n" +
        "  /* flag: 1 when this row is a year subtotal or grand total */ AS is_total\n" +
        "FROM sales\n" +
        "GROUP BY /* hierarchy of year then quarter */;",
      solution:
        "SELECT\n" +
        "  year,\n" +
        "  quarter,\n" +
        "  SUM(amount)        AS total,\n" +
        "  GROUPING(quarter)  AS is_total\n" +
        "FROM sales\n" +
        "GROUP BY ROLLUP(year, quarter)\n" +
        "ORDER BY year, quarter;\n" +
        "-- ROLLUP(year, quarter) = GROUPING SETS ((year,quarter),(year),()).\n" +
        "-- GROUPING(quarter)=1 on the year-subtotal and grand-total rows,\n" +
        "-- where quarter (and, for the grand total, year) is a rolled-up NULL."
    }
  }
]);
