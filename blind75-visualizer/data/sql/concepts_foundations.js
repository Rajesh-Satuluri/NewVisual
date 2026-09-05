/*
 * data/sql/concepts_foundations.js — SQL "Learn" foundations topics.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics (ANSI + the T-SQL /
 * PostgreSQL / MySQL notes flagged inline); teaching structure mirrors the
 * window-functions exemplar.
 */
window.LEARN.register("sql", "Foundations", [
  {
    id: "select-filtering",
    title: "SELECT & Filtering",
    difficulty: "Beginner",
    estMinutes: 10,
    relevance: 3,
    tagline: "Pick the columns you want and keep only the rows that match — the two clauses every query is built on.",

    whatIsIt: [
      "<code>SELECT</code> chooses which <b>columns</b> come back; <code>FROM</code> names the table; <code>WHERE</code> keeps only the <b>rows</b> whose condition is <b>true</b>. Everything else in SQL is a variation on this core.",
      "A <code>WHERE</code> predicate is evaluated in <b>three-valued logic</b>: a row is returned only when the condition is <code>TRUE</code> — never when it is <code>FALSE</code> or <code>UNKNOWN</code>. This matters the moment <code>NULL</code> enters a comparison.",
      "The workhorse operators are <code>=</code>, <code>&lt;&gt;</code>, <code>&lt;</code>, <code>&gt;</code>, plus <code>BETWEEN</code> (inclusive range), <code>IN (...)</code> (set membership), <code>LIKE</code> (pattern match with <code>%</code> and <code>_</code>), and <code>IS NULL</code>. Combine them with <code>AND</code>, <code>OR</code>, and <code>NOT</code>.",
      "<code>SELECT DISTINCT</code> removes duplicate rows from the result — it de-duplicates on the <i>entire</i> selected row, not just the first column."
    ],

    showMe: {
      code:
        "-- Active engineers in a salary band, whose name starts with 'A',\n" +
        "-- in one of three cities, listed once each\n" +
        "SELECT DISTINCT\n" +
        "  name,\n" +
        "  department,\n" +
        "  salary\n" +
        "FROM employee\n" +
        "WHERE department = 'Engineering'\n" +
        "  AND salary BETWEEN 80000 AND 120000\n" +
        "  AND name LIKE 'A%'\n" +
        "  AND city IN ('NYC', 'Austin', 'Remote')\n" +
        "  AND termination_date IS NULL;",
      caption:
        "One WHERE combines a range (BETWEEN, inclusive), a pattern (LIKE 'A%'), set membership (IN), and a NULL check (IS NULL) with AND; DISTINCT collapses duplicate rows."
    },

    whyMatters:
      "<p>Filtering is the first thing every interviewer checks, and the most common place to lose points quietly — a query that <i>runs</i> but returns the wrong rows. The classic mistakes all live here:</p>" +
      "<ul>" +
      "<li><code>WHERE x = NULL</code> never matches anything — use <code>IS NULL</code>.</li>" +
      "<li><code>NOT IN (subquery)</code> that returns a <code>NULL</code> silently returns <b>zero rows</b>.</li>" +
      "<li><code>BETWEEN</code> is <b>inclusive on both ends</b>, which surprises people filtering by date.</li>" +
      "</ul>" +
      "<p>The other reason it matters: a <code>WHERE</code> that lines up with an index lets the engine skip most of the table instead of scanning it. A <b>sargable</b> predicate (column compared directly to a value) can use an index; wrapping the column in a function usually cannot:</p>" +
      "<pre class=\"why-pre\">-- NOT sargable: function on the column defeats the index\nWHERE YEAR(hire_date) = 2024\n\n-- sargable: a half-open range the index can seek\nWHERE hire_date &gt;= '2024-01-01' AND hire_date &lt; '2025-01-01'</pre>",

    recognize: [
      { q: "\"only rows where…\", \"filter to…\", \"just the ones that…\"", think: "a WHERE clause with the right comparison operators" },
      { q: "\"unique\", \"distinct\", \"no duplicates\", \"the different values of…\"", think: "SELECT DISTINCT (de-dups the whole selected row)" },
      { q: "\"between X and Y\", \"in the range…\", \"from … to …\"", think: "BETWEEN (remember: inclusive both ends) or an explicit >= / < pair for dates" },
      { q: "\"starts with / ends with / contains\"", think: "LIKE with % and _ wildcards ('A%', '%z', '%mid%')" },
      { q: "\"is one of\", \"in the list\", \"any of these values\"", think: "IN (...) — and beware NOT IN with NULLs" }
    ],

    matchTags: ["where", "filter", "filtering", "select", "distinct", "between", "like", "in",
                "null", "is null", "predicate", "comparison", "pattern", "wildcard"],

    traps: [
      {
        bad: "SELECT * FROM employee\nWHERE manager_id = NULL;   -- returns nothing",
        good: "SELECT * FROM employee\nWHERE manager_id IS NULL;",
        why: "Any comparison with NULL using = yields UNKNOWN, never TRUE, so no row qualifies. NULL is tested only with IS NULL / IS NOT NULL."
      },
      {
        bad: "SELECT * FROM employee\nWHERE dept_id NOT IN (SELECT dept_id FROM closed_dept);\n-- silently empty if any dept_id is NULL",
        good: "SELECT * FROM employee e\nWHERE NOT EXISTS (\n  SELECT 1 FROM closed_dept c WHERE c.dept_id = e.dept_id);",
        why: "If the NOT IN subquery returns even one NULL, every comparison becomes UNKNOWN and the whole result is empty. NOT EXISTS is NULL-safe."
      },
      {
        bad: "SELECT * FROM orders\nWHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';\n-- misses Jan 31 rows with a time component",
        good: "SELECT * FROM orders\nWHERE order_date >= '2024-01-01'\n  AND order_date <  '2024-02-01';",
        why: "BETWEEN is inclusive, so on a DATETIME column '2024-01-31' means midnight and drops that day's later timestamps; a half-open >= / < range is safer for date/time filtering."
      }
    ],

    complexity: [
      { op: "WHERE col = value (indexed)", big_o: "O(log n)", note: "A sargable equality or range on an indexed column lets the engine seek in the B-tree instead of reading every row." },
      { op: "WHERE with function on column", big_o: "O(n)", note: "Wrapping the column in a function (UPPER, YEAR, arithmetic) makes the predicate non-sargable and forces a full scan even when an index exists." },
      { op: "SELECT DISTINCT", big_o: "O(n log n)", note: "The engine must sort or hash all result rows to detect duplicates, adding cost on top of the underlying scan or seek." },
      { op: "LIKE 'prefix%'", big_o: "O(log n)", note: "A leading-literal pattern can use an index range scan; a leading wildcard like '%text' cannot and degrades to a full scan." },
      { op: "IN (list of k values)", big_o: "O(k log n)", note: "Roughly k index seeks, or one scan checking membership; large IN lists can be slower than a join against a values table." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The core <code>SELECT / FROM / WHERE</code> plus <code>BETWEEN / IN / LIKE / IS NULL</code> is ANSI-standard and identical across engines. The differences are mostly around strings and case.</p>" +
      "<ul>" +
      "<li><b>LIKE case-sensitivity:</b> MySQL's <code>LIKE</code> is case-insensitive by default (collation-dependent); PostgreSQL's <code>LIKE</code> is case-sensitive and offers <code>ILIKE</code> for case-insensitive matching. SQL Server depends on the column collation.</li>" +
      "<li><b>String comparison:</b> SQL Server string <code>=</code> is collation-driven and often case-insensitive; PostgreSQL is case-sensitive.</li>" +
      "<li><b>Escaping wildcards:</b> to match a literal <code>%</code> or <code>_</code>, use <code>LIKE '50\\%' ESCAPE '\\'</code> (ANSI, portable).</li>" +
      "<li><b>Regex (non-ANSI):</b> PostgreSQL uses <code>~</code> / <code>~*</code>, MySQL uses <code>REGEXP</code>, Spark SQL uses <code>RLIKE</code>; none are portable, so prefer <code>LIKE</code> when you can.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "From customer(id, name, email, country, signup_date, unsubscribed_at), return the DISTINCT countries of customers who signed up in 2024, whose email is a gmail address, and who have NOT unsubscribed. Watch the date range and the NULL check.",
      starter:
        "SELECT /* distinct countries */\n" +
        "FROM customer\n" +
        "WHERE /* signed up in 2024 */\n" +
        "  AND /* gmail email */\n" +
        "  AND /* still subscribed */;",
      solution:
        "SELECT DISTINCT country\n" +
        "FROM customer\n" +
        "WHERE signup_date >= '2024-01-01'\n" +
        "  AND signup_date <  '2025-01-01'\n" +
        "  AND email LIKE '%@gmail.com'\n" +
        "  AND unsubscribed_at IS NULL;\n" +
        "-- Half-open date range avoids BETWEEN's inclusive-end trap; IS NULL (not = NULL) finds still-subscribed rows."
    }
  },

  {
    id: "sorting-limiting",
    title: "Sorting & Limiting",
    difficulty: "Beginner",
    estMinutes: 9,
    relevance: 3,
    tagline: "Impose an order on the result, then take just the slice you asked for — the top N, the latest, the page.",

    whatIsIt: [
      "<code>ORDER BY</code> sorts the final result set. Without it, SQL makes <b>no guarantee</b> about row order — results can come back in any order the engine finds convenient, and that order can change between runs.",
      "You can sort by multiple keys and mix directions: <code>ORDER BY dept ASC, salary DESC</code>. <code>ASC</code> is the default. You may sort by a column, an expression, or a <b>select-list alias</b>/position.",
      "Row limiting takes the first N rows <i>after</i> sorting. The ANSI form is <code>ORDER BY ... FETCH FIRST n ROWS ONLY</code>; PostgreSQL/MySQL use <code>LIMIT n</code>; SQL Server uses <code>SELECT TOP (n)</code> or <code>OFFSET ... FETCH</code>.",
      "For <b>pagination</b>, add an offset: <code>LIMIT n OFFSET m</code> (or <code>OFFSET m ROWS FETCH NEXT n ROWS ONLY</code>). A <code>LIMIT</code> without an <code>ORDER BY</code> returns an <b>arbitrary</b> N rows and is almost always a bug."
    ],

    showMe: {
      code:
        "-- The 5 highest-paid employees; ties broken by name, newest hires first\n" +
        "SELECT name, department, salary, hire_date\n" +
        "FROM employee\n" +
        "ORDER BY\n" +
        "  salary   DESC,\n" +
        "  hire_date DESC,\n" +
        "  name      ASC\n" +
        "LIMIT 5;            -- Postgres/MySQL; SQL Server: SELECT TOP (5) ...",
      caption:
        "ORDER BY sorts by salary (highest first), then breaks ties deterministically by hire_date then name; LIMIT 5 takes the top slice only after that ordering."
    },

    whyMatters:
      "<p>\"Top N per something\", \"the most recent record\", \"page 3 of results\" are among the most common interview asks, and they all hinge on a correct <code>ORDER BY</code> + limit. Two things separate a correct answer from a plausible-looking one:</p>" +
      "<ul>" +
      "<li><b>Determinism:</b> if the sort key has ties, add a tie-breaker column. Otherwise which rows survive a <code>LIMIT</code> is undefined and can differ run to run.</li>" +
      "<li><b>Placement:</b> <code>LIMIT</code> applies to the whole query's final result. To take \"top N <i>per group</i>\", you need <code>ROW_NUMBER()</code> in a window, not a bare <code>LIMIT</code>.</li>" +
      "</ul>" +
      "<p>Deep pagination is a performance trap: <code>OFFSET 100000</code> still makes the engine produce and discard the first 100,000 rows. Keyset (\"seek\") pagination is far faster on large tables:</p>" +
      "<pre class=\"why-pre\">-- instead of OFFSET 100000 LIMIT 20, remember the last row seen:\nSELECT * FROM events\nWHERE (created_at, id) &lt; ('2024-06-01 00:00', 500000)\nORDER BY created_at DESC, id DESC\nLIMIT 20;</pre>",

    recognize: [
      { q: "\"top N\", \"highest / lowest\", \"the biggest 10\"", think: "ORDER BY key DESC/ASC then LIMIT / TOP / FETCH FIRST" },
      { q: "\"most recent\", \"latest\", \"newest / oldest\"", think: "ORDER BY timestamp DESC LIMIT 1 (add a tie-breaker if timestamps can collide)" },
      { q: "\"per page\", \"page k\", \"next 20\"", think: "LIMIT n OFFSET (k-1)*n — or keyset pagination for large tables" },
      { q: "\"sorted by … then by …\"", think: "ORDER BY col1, col2 with per-column ASC/DESC" },
      { q: "\"top N within each group\"", think: "NOT a bare LIMIT — use ROW_NUMBER() OVER (PARTITION BY grp ORDER BY …) and filter" }
    ],

    matchTags: ["order by", "sort", "sorting", "limit", "top", "fetch first", "offset",
                "pagination", "asc", "desc", "ranking", "most recent", "latest"],

    traps: [
      {
        bad: "SELECT * FROM employee\nLIMIT 10;   -- which 10? undefined",
        good: "SELECT * FROM employee\nORDER BY salary DESC\nLIMIT 10;",
        why: "A LIMIT without ORDER BY returns an arbitrary, non-repeatable set of rows because SQL does not guarantee any order without an explicit ORDER BY."
      },
      {
        bad: "SELECT * FROM sales\nORDER BY amount DESC\nLIMIT 3;   -- ties at 3rd place lost arbitrarily",
        good: "SELECT * FROM sales\nORDER BY amount DESC, id ASC\nLIMIT 3;   -- deterministic\n-- or: ... FETCH FIRST 3 ROWS WITH TIES",
        why: "If several rows tie on the sort key, which ones survive the LIMIT is undefined; add a unique tie-breaker, or use WITH TIES to keep all rows tied at the cutoff."
      },
      {
        bad: "SELECT * FROM posts\nORDER BY created_at DESC\nLIMIT 20 OFFSET 100000;   -- scans 100020 rows",
        good: "SELECT * FROM posts\nWHERE created_at < :last_seen\nORDER BY created_at DESC\nLIMIT 20;",
        why: "Large OFFSET still materializes and throws away every skipped row; keyset pagination seeks directly past the last row seen and stays fast as the offset grows."
      }
    ],

    complexity: [
      { op: "ORDER BY (no usable index)", big_o: "O(n log n)", note: "Sorting the result set costs a comparison sort over all qualifying rows, and may spill to disk if it exceeds the sort memory." },
      { op: "ORDER BY (matching index)", big_o: "O(n)", note: "When an index already provides the requested order, the engine reads rows in order and skips the sort entirely." },
      { op: "LIMIT n after sort", big_o: "O(n log n) / O(n)", note: "A top-N query can use a bounded heap of size n, turning the sort into O(n log k); combined with a matching index it becomes an early-terminating scan." },
      { op: "OFFSET m", big_o: "O(m + n)", note: "The engine still generates and discards the first m rows before returning n, so cost grows linearly with the offset — the deep-pagination trap." },
      { op: "Keyset pagination", big_o: "O(log N + n)", note: "Seeking past the last-seen key via an index skips discarded rows entirely, so cost stays flat no matter how deep the page." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The row-limiting syntax is the biggest portability gap in this topic.</p>" +
      "<ul>" +
      "<li><b>PostgreSQL / MySQL / SQLite:</b> <code>LIMIT n OFFSET m</code>.</li>" +
      "<li><b>SQL Server:</b> no <code>LIMIT</code>; use <code>SELECT TOP (n) ...</code>, or the ANSI <code>ORDER BY ... OFFSET m ROWS FETCH NEXT n ROWS ONLY</code> (which <b>requires</b> an ORDER BY).</li>" +
      "<li><b>ANSI / Oracle 12c+ / DB2:</b> <code>ORDER BY ... FETCH FIRST n ROWS ONLY</code>, with the optional <code>WITH TIES</code>.</li>" +
      "<li><b>NULL ordering:</b> PostgreSQL and Oracle support <code>NULLS FIRST</code> / <code>NULLS LAST</code>; SQL Server and MySQL do not and sort NULLs first (ascending) by default — emulate with an extra <code>ORDER BY (col IS NULL)</code> key.</li>" +
      "<li><b>Spark SQL</b> supports <code>LIMIT</code> and <code>ORDER BY ... NULLS FIRST/LAST</code>, but a bare <code>LIMIT</code> across a distributed result is still non-deterministic without ORDER BY.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "From product(id, name, category, price, created_at), return the 3 most expensive products, breaking price ties by the most recently created, then by id. Then adapt it for SQL Server. Why does the tie-breaker matter?",
      starter:
        "SELECT name, category, price\n" +
        "FROM product\n" +
        "ORDER BY /* price, then tie-breakers */\n" +
        "LIMIT 3;",
      solution:
        "-- PostgreSQL / MySQL\n" +
        "SELECT name, category, price\n" +
        "FROM product\n" +
        "ORDER BY price DESC, created_at DESC, id ASC\n" +
        "LIMIT 3;\n" +
        "\n" +
        "-- SQL Server equivalent\n" +
        "SELECT TOP (3) name, category, price\n" +
        "FROM product\n" +
        "ORDER BY price DESC, created_at DESC, id ASC;\n" +
        "-- The id tie-breaker makes the top 3 deterministic when prices (and even timestamps) collide."
    }
  },

  {
    id: "case-nulls",
    title: "CASE & NULLs",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Branch row-by-row with CASE, and tame the three-valued logic of NULL before it silently eats your results.",

    whatIsIt: [
      "<code>CASE</code> is SQL's inline conditional — an expression that returns a value based on branches. The <b>searched form</b> tests arbitrary conditions (<code>CASE WHEN salary &gt; 100000 THEN 'high' ELSE 'std' END</code>); the <b>simple form</b> compares one expression to values (<code>CASE status WHEN 'A' THEN ... END</code>).",
      "<code>CASE</code> is an <b>expression</b>, so it works anywhere a value is allowed: the <code>SELECT</code> list, <code>WHERE</code>, <code>ORDER BY</code>, <code>GROUP BY</code>, and — the interview favorite — inside an aggregate for <b>conditional counting</b>: <code>SUM(CASE WHEN paid THEN 1 ELSE 0 END)</code>.",
      "<code>NULL</code> means <b>unknown</b>, not zero and not empty string. Any arithmetic or comparison with <code>NULL</code> yields <code>NULL</code>/<code>UNKNOWN</code>: <code>1 + NULL</code> is <code>NULL</code>, and <code>NULL = NULL</code> is <code>UNKNOWN</code> (not true).",
      "<code>COALESCE(a, b, c)</code> returns the first non-NULL argument — the standard way to supply a default. <code>NULLIF(a, b)</code> returns <code>NULL</code> when <code>a = b</code> (handy to guard against divide-by-zero)."
    ],

    showMe: {
      code:
        "-- Bucket employees, and safely compute a ratio, handling NULLs\n" +
        "SELECT\n" +
        "  department,\n" +
        "  COUNT(*)                                              AS headcount,\n" +
        "  SUM(CASE WHEN salary >= 100000 THEN 1 ELSE 0 END)     AS high_earners,\n" +
        "  COALESCE(AVG(bonus), 0)                               AS avg_bonus,\n" +
        "  SUM(revenue) * 1.0\n" +
        "    / NULLIF(SUM(headcount_cost), 0)                    AS revenue_ratio\n" +
        "FROM employee\n" +
        "GROUP BY department;",
      caption:
        "SUM(CASE ... 1 ELSE 0) counts rows meeting a condition; COALESCE supplies 0 when AVG is NULL; NULLIF turns a zero denominator into NULL so the division is safe instead of erroring."
    },

    whyMatters:
      "<p><code>CASE</code> and <code>NULL</code> handling show up in almost every non-trivial query, and NULL bugs are the ones that pass review and then quietly return wrong numbers. Two facts do most of the damage:</p>" +
      "<ul>" +
      "<li><b>Aggregates skip NULLs.</b> <code>COUNT(col)</code> ignores NULLs (so it differs from <code>COUNT(*)</code>), and <code>AVG(col)</code> divides by the count of non-NULL values, not the row count.</li>" +
      "<li><b>NULL is not FALSE.</b> A <code>WHERE</code> or <code>CASE WHEN</code> that evaluates to <code>NULL</code> is treated as not-true, so those rows fall through to <code>ELSE</code> (or are dropped).</li>" +
      "</ul>" +
      "<p>The pivot / conditional-aggregate pattern is the highest-value use of CASE — turning rows into columns:</p>" +
      "<pre class=\"why-pre\">SELECT\n  order_month,\n  SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END) AS paid,\n  SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) AS refunded\nFROM orders\nGROUP BY order_month;</pre>",

    recognize: [
      { q: "\"categorize / bucket / label rows as…\"", think: "CASE WHEN ... THEN 'label' ... ELSE ... END in the SELECT list" },
      { q: "\"count / sum only the rows where…\", \"how many are X\"", think: "SUM(CASE WHEN cond THEN 1 ELSE 0 END) or COUNT(CASE WHEN cond THEN 1 END)" },
      { q: "\"pivot\", \"one column per category\", \"rows into columns\"", think: "conditional aggregation: SUM(CASE WHEN cat = 'x' THEN val END) per category" },
      { q: "\"default to 0 / replace missing with…\"", think: "COALESCE(col, default) (or ISNULL / IFNULL in specific dialects)" },
      { q: "\"avoid divide by zero\", \"treat blank as null\"", think: "NULLIF(denominator, 0), or NULLIF(col, '') for empty strings" }
    ],

    matchTags: ["case", "case when", "coalesce", "nullif", "null", "is null", "ifnull", "isnull",
                "conditional", "conditional aggregation", "pivot", "default", "three-valued logic"],

    traps: [
      {
        bad: "SELECT AVG(bonus) FROM employee;\n-- silently ignores everyone whose bonus is NULL",
        good: "SELECT AVG(COALESCE(bonus, 0)) FROM employee;\n-- counts a missing bonus as 0",
        why: "AVG (and every aggregate except COUNT(*)) skips NULLs, so AVG(bonus) averages only people who have a bonus; COALESCE to 0 first if a missing bonus should count as zero."
      },
      {
        bad: "CASE WHEN status = NULL THEN 'unknown' ELSE status END",
        good: "CASE WHEN status IS NULL THEN 'unknown' ELSE status END\n-- or: COALESCE(status, 'unknown')",
        why: "status = NULL is never TRUE, so the WHEN never fires; test NULL with IS NULL, or just use COALESCE for the substitute-a-default case."
      },
      {
        bad: "SELECT revenue / headcount AS per_head FROM dept;\n-- errors / NULLs when headcount = 0",
        good: "SELECT revenue * 1.0 / NULLIF(headcount, 0) AS per_head\nFROM dept;",
        why: "A zero denominator raises a divide-by-zero error (or returns NULL in MySQL); NULLIF(headcount, 0) makes the divisor NULL so the result is a clean NULL instead."
      }
    ],

    complexity: [
      { op: "CASE expression", big_o: "O(1) per row", note: "Branches are evaluated per row with short-circuit order (first matching WHEN wins), adding negligible cost on top of the scan producing the rows." },
      { op: "SUM/COUNT(CASE ...)", big_o: "O(n)", note: "Conditional aggregation is a single pass over the group's rows; it does not add asymptotic cost beyond the aggregation itself." },
      { op: "COALESCE / NULLIF", big_o: "O(1) per row", note: "Both are scalar expressions evaluated per row; COALESCE short-circuits and stops at the first non-NULL argument." },
      { op: "COUNT(col) vs COUNT(*)", big_o: "O(n)", note: "Both scan the rows, but COUNT(col) must also test each value for NULL, so the two can return different numbers on the same table." },
      { op: "CASE in WHERE / ORDER BY", big_o: "O(n)", note: "A CASE in the predicate or sort key is usually non-sargable, so it is computed per row and typically prevents an index from being used for that clause." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> <code>CASE</code>, <code>COALESCE</code>, and <code>NULLIF</code> are ANSI-standard and identical everywhere — prefer them for portable code. The single-argument NULL-defaulting helpers are where dialects diverge.</p>" +
      "<ul>" +
      "<li><b>Two-arg NULL default:</b> <code>COALESCE(a, b)</code> is standard and works everywhere. SQL Server also has <code>ISNULL(a, b)</code>; MySQL/SQLite have <code>IFNULL(a, b)</code>; Oracle has <code>NVL(a, b)</code> — all non-portable, so favor <code>COALESCE</code>.</li>" +
      "<li><b>String concatenation:</b> ANSI/PostgreSQL/Oracle use <code>a || b</code> (and <code>||</code> yields NULL if any operand is NULL); SQL Server uses <code>a + b</code>; MySQL requires <code>CONCAT(a, b)</code> (its <code>||</code> means OR by default). <code>CONCAT</code> treats NULL as an empty string, unlike <code>||</code>.</li>" +
      "<li><b>Divide by zero:</b> most engines raise an error; MySQL returns NULL instead. <code>NULLIF(denom, 0)</code> gives consistent NULL behavior across all of them.</li>" +
      "<li><b>Empty string vs NULL:</b> Oracle treats <code>''</code> as NULL; every other engine treats them as distinct — a portability landmine when checking \"missing\".</li>" +
      "<li><b>Spark SQL</b> follows the ANSI functions (<code>COALESCE</code>, <code>NULLIF</code>, <code>CASE</code>) and adds <code>nvl</code>/<code>ifnull</code> aliases.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "From payment(id, customer_id, method, amount, status), write ONE grouped query per customer that returns: total amount of 'success' payments, the count of 'failed' payments, and the success rate (successful count / total count) guarded against zero. Which NULL tools do you need?",
      starter:
        "SELECT\n" +
        "  customer_id,\n" +
        "  /* sum of successful amounts */   AS success_total,\n" +
        "  /* count of failed payments */    AS failed_count,\n" +
        "  /* success rate, divide-safe */   AS success_rate\n" +
        "FROM payment\n" +
        "GROUP BY customer_id;",
      solution:
        "SELECT\n" +
        "  customer_id,\n" +
        "  SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END)        AS success_total,\n" +
        "  SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END)            AS failed_count,\n" +
        "  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 1.0\n" +
        "    / NULLIF(COUNT(*), 0)                                        AS success_rate\n" +
        "FROM payment\n" +
        "GROUP BY customer_id;\n" +
        "-- Conditional SUM(CASE...) for the totals/counts; NULLIF(COUNT(*),0) keeps the rate division safe; *1.0 forces float math."
    }
  }
]);
