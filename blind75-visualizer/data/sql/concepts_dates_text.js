/*
 * data/sql/concepts_dates_text.js — SQL "Learn" topics: Dates & Text.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack. Content grounded in standard SQL semantics with the heavy
 * dialect divergence (PostgreSQL / T-SQL / MySQL) flagged inline; teaching
 * structure mirrors the Window Functions exemplar.
 */
window.LEARN.register("sql", "Dates & Text", [
  {
    id: "dates-intervals",
    title: "Dates & Intervals",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Bucket, shift, and difference dates — without wrapping the column in a function that kills your index.",

    whatIsIt: [
      "SQL stores time in a few distinct types: <code>DATE</code> (calendar day, no time), <code>TIME</code> (time of day), <code>TIMESTAMP</code> / <code>DATETIME</code> (day + time), and often <code>TIMESTAMPTZ</code> (an instant, stored in UTC and rendered in the session's zone). Picking the right type decides what arithmetic is even legal.",
      "Three operations cover almost every interview question: <b>pull out a field</b> (year, month, day-of-week) with <code>EXTRACT</code> / <code>DATEPART</code>; <b>shift a date</b> by adding an interval; and <b>difference two dates</b>. The catch is that the spelling of each is wildly dialect-specific.",
      "<b>Truncation</b> is the workhorse for reporting: collapsing a timestamp down to the start of its month, week, or day so rows in the same period group together. Postgres has <code>date_trunc('month', ts)</code>; other engines assemble it from parts.",
      "The single most important habit: to filter or group by a period, prefer a <b>half-open range</b> <code>[start, end)</code> over <code>BETWEEN</code>, and never wrap the indexed column in a function. <code>YEAR(col) = 2023</code> forces a full scan; <code>col &gt;= '2023-01-01' AND col &lt; '2024-01-01'</code> can use the index."
    ],

    showMe: {
      code:
        "-- Orders per month in 2023, and average fulfilment time.\n" +
        "-- Note the half-open range on the raw column (sargable),\n" +
        "-- while grouping uses a truncated copy for the label only.\n" +
        "SELECT\n" +
        "  date_trunc('month', order_ts)        AS month,        -- Postgres\n" +
        "  COUNT(*)                             AS orders,\n" +
        "  AVG(ship_ts - order_ts)              AS avg_fulfil     -- Postgres interval subtraction\n" +
        "FROM orders\n" +
        "WHERE order_ts >= DATE '2023-01-01'\n" +
        "  AND order_ts <  DATE '2024-01-01'    -- [start, end): no upper-bound off-by-one\n" +
        "GROUP BY date_trunc('month', order_ts)\n" +
        "ORDER BY month;",
      caption:
        "The WHERE clause leaves order_ts bare so an index on it can be used; the half-open [2023-01-01, 2024-01-01) " +
        "range captures every instant in 2023 including 23:59:59.999 on Dec 31, which BETWEEN … AND '2023-12-31' would miss."
    },

    whyMatters:
      "<p>Date logic shows up in nearly every analytics question — <b>monthly revenue</b>, <b>cohort/retention windows</b>, <b>time-to-ship</b>, <b>active-in-last-30-days</b> — and it is where correctness and performance quietly break. The two recurring bugs are the <b>BETWEEN off-by-one on timestamps</b> and the <b>non-sargable function on a column</b>.</p>" +
      "<ul>" +
      "<li><b>Half-open ranges</b> <code>[start, end)</code> compose cleanly (adjacent months never overlap or gap) and are correct whether the column is a DATE or a TIMESTAMP.</li>" +
      "<li><b>Sargability</b>: keep the column bare on one side of the comparison so the optimizer can seek an index instead of scanning and computing the function for every row.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">-- Same question, two ways. The second can use an index on event_ts.\nWHERE EXTRACT(YEAR FROM event_ts) = 2023            -- function on column: full scan\n\nWHERE event_ts >= DATE '2023-01-01'\n  AND event_ts <  DATE '2024-01-01'                  -- range on bare column: index seek</pre>",

    recognize: [
      { q: "\"per month / quarter / year\", \"monthly trend\"", think: "Truncate or extract the period key and GROUP BY it — date_trunc('month', …) in Postgres; group on YEAR()+MONTH() elsewhere." },
      { q: "\"in 2023\", \"during Q2\", \"between these two dates\" on a timestamp column", think: "Half-open range col >= start AND col < end — not BETWEEN, which includes the upper bound and drops the last day's times." },
      { q: "\"days between\", \"time to ship\", \"age\"", think: "Difference two dates: Postgres date2 - date1 (days) or AGE(); T-SQL DATEDIFF(DAY, a, b); MySQL DATEDIFF(b, a)." },
      { q: "\"N days/months ago\", \"expires in 30 days\", \"add a week\"", think: "Shift by an interval: Postgres ts + INTERVAL '30 days'; T-SQL DATEADD(DAY, 30, ts); MySQL DATE_ADD(ts, INTERVAL 30 DAY)." },
      { q: "\"day of week\", \"which weekday\", \"hour of day\"", think: "EXTRACT(DOW FROM ts) / EXTRACT(HOUR FROM ts) in standard SQL; DATEPART(WEEKDAY, ts) in T-SQL." }
    ],

    matchTags: ["date", "timestamp", "interval", "extract", "datepart", "dateadd", "datediff",
                "month", "year", "truncate", "date_trunc", "between dates"],

    traps: [
      {
        bad: "WHERE order_ts BETWEEN '2023-01-01' AND '2023-12-31'",
        good: "WHERE order_ts >= DATE '2023-01-01'\n  AND order_ts <  DATE '2024-01-01'",
        why: "On a TIMESTAMP, '2023-12-31' means 2023-12-31 00:00:00, so BETWEEN silently drops everything from noon Dec 31 onward. A half-open [start, next-period) range includes the whole final day and never overlaps the next bucket."
      },
      {
        bad: "WHERE YEAR(order_ts) = 2023          -- or EXTRACT(YEAR FROM order_ts) = 2023",
        good: "WHERE order_ts >= DATE '2023-01-01'\n  AND order_ts <  DATE '2024-01-01'",
        why: "Wrapping the column in a function makes the predicate non-sargable: the engine must compute YEAR() for every row and cannot seek an index on order_ts. Filter on a raw-column range instead."
      },
      {
        bad: "SELECT DATEDIFF(end_date, start_date)   -- MySQL arg order vs\n       DATEDIFF(DAY, start_date, end_date)  -- T-SQL: incompatible!",
        good: "-- Know your engine:\n-- Postgres: end_date - start_date            (integer days)\n-- T-SQL:    DATEDIFF(DAY, start_date, end_date)\n-- MySQL:    DATEDIFF(end_date, start_date)",
        why: "DATEDIFF exists in both T-SQL and MySQL but with different signatures (T-SQL takes a datepart first and returns boundary crossings; MySQL takes end then start and returns whole days). Postgres has no DATEDIFF at all — subtract dates directly. Confusing them silently returns wrong or negated numbers."
      }
    ],

    complexity: [
      { op: "Range filter on a bare column (sargable)", big_o: "O(log n + k)", note: "With a B-tree index on the date column, a col >= a AND col < b predicate is an index range seek returning the k matching rows, not a full scan." },
      { op: "Function on the column, e.g. YEAR(col) = 2023", big_o: "O(n)", note: "Non-sargable: the engine must evaluate the function on every row, so the index is unusable and the whole table is scanned." },
      { op: "GROUP BY date_trunc / period key", big_o: "O(n) or O(n log n)", note: "One pass to compute the key plus a hash or sort aggregate; a sort-based group adds the log n factor but no per-row index penalty." },
      { op: "EXTRACT / DATEPART in the SELECT list", big_o: "O(n)", note: "A cheap constant-time computation per output row; harmless in projection, costly only when it lands in a WHERE and blocks an index." },
      { op: "Date +/- interval (DATEADD)", big_o: "O(1)", note: "Shifting a single date by an interval is constant-time arithmetic; applied per row it is O(n) but adds no sort or scan cost of its own." }
    ],

    engineNote:
      "<p><b>Dialect notes — this topic diverges heavily. Always name your engine.</b></p>" +
      "<ul>" +
      "<li><b>Extract a field:</b> standard SQL and Postgres/MySQL use <code>EXTRACT(YEAR FROM ts)</code> (Postgres/MySQL also have <code>YEAR(ts)</code>, <code>MONTH(ts)</code>). SQL Server has no EXTRACT — it uses <code>DATEPART(YEAR, ts)</code> / <code>YEAR(ts)</code>.</li>" +
      "<li><b>Shift a date:</b> Postgres uses interval arithmetic, <code>ts + INTERVAL '1 month'</code>. SQL Server uses <code>DATEADD(MONTH, 1, ts)</code>. MySQL uses <code>DATE_ADD(ts, INTERVAL 1 MONTH)</code> (or <code>ts + INTERVAL 1 MONTH</code>).</li>" +
      "<li><b>Difference two dates:</b> Postgres subtracts directly, <code>d2 - d1</code> (integer days) or <code>AGE(d2, d1)</code> for a year/month/day interval. SQL Server: <code>DATEDIFF(DAY, d1, d2)</code> counting boundary crossings. MySQL: <code>DATEDIFF(d2, d1)</code> (note the reversed argument order) for whole days, or <code>TIMESTAMPDIFF(unit, d1, d2)</code> for other units.</li>" +
      "<li><b>Truncate to a period:</b> Postgres <code>date_trunc('month', ts)</code>. SQL Server has <code>DATETRUNC(MONTH, ts)</code> only in 2022+; older versions rebuild it via <code>DATEFROMPARTS</code> or <code>DATEADD/DATEDIFF</code> tricks. MySQL uses <code>DATE_FORMAT(ts, '%Y-%m-01')</code> or extracts the parts.</li>" +
      "<li><b>Current time:</b> <code>CURRENT_DATE</code> / <code>CURRENT_TIMESTAMP</code> are standard; SQL Server also has <code>GETDATE()</code>, MySQL <code>NOW()</code> / <code>CURDATE()</code>.</li>" +
      "<li><b>Day-of-week numbering differs</b> across engines (0-based vs 1-based, Sunday vs Monday start) — never hardcode the integer without checking.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have events(user_id, event_ts TIMESTAMP). Write ONE query (target: PostgreSQL) that returns the count of events per calendar month for the year 2024 only, ordered chronologically. Make the year filter sargable (index-friendly) and use a half-open range so no boundary rows are lost or double-counted. Then note how the truncation and range would change for SQL Server.",
      starter:
        "SELECT\n" +
        "  /* month bucket */                 AS month,\n" +
        "  COUNT(*)                           AS events\n" +
        "FROM events\n" +
        "WHERE /* sargable half-open 2024 range */\n" +
        "GROUP BY /* month bucket */\n" +
        "ORDER BY month;",
      solution:
        "-- PostgreSQL\n" +
        "SELECT\n" +
        "  date_trunc('month', event_ts)      AS month,\n" +
        "  COUNT(*)                           AS events\n" +
        "FROM events\n" +
        "WHERE event_ts >= DATE '2024-01-01'\n" +
        "  AND event_ts <  DATE '2025-01-01'  -- half-open: whole year, bare column stays sargable\n" +
        "GROUP BY date_trunc('month', event_ts)\n" +
        "ORDER BY month;\n" +
        "-- The range predicate keeps event_ts unwrapped, so an index on it is usable.\n" +
        "-- Grouping on the truncated value only affects the aggregate, not the scan.\n" +
        "--\n" +
        "-- SQL Server: swap date_trunc for DATETRUNC(MONTH, event_ts) (2022+),\n" +
        "-- or DATEADD(MONTH, DATEDIFF(MONTH, 0, event_ts), 0) on older versions.\n" +
        "-- The half-open WHERE range is identical and just as sargable there."
    }
  },

  {
    id: "string-functions",
    title: "String Functions",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 2,
    tagline: "Slice, join, clean, and match text — knowing which operations can use an index and which cannot.",

    whatIsIt: [
      "String work in SQL clusters into a few jobs: <b>join</b> pieces together (concatenation), <b>slice</b> out a part (<code>SUBSTRING</code>, with <code>POSITION</code>/<code>CHARINDEX</code> to find where), <b>clean</b> (<code>TRIM</code>, <code>REPLACE</code>, <code>UPPER</code>/<code>LOWER</code>), and <b>match</b> (<code>LIKE</code>, and regex where supported).",
      "The one indexing detail that trips everyone: <b>string positions are 1-based</b>. <code>SUBSTRING(s, 1, 3)</code> returns the first three characters, not characters 2–4. There is no character at position 0.",
      "<code>LIKE</code> is the portable pattern matcher: <code>%</code> matches any run of characters, <code>_</code> matches exactly one. A <b>prefix</b> pattern (<code>'abc%'</code>) can still use a B-tree index; a leading wildcard (<code>'%abc'</code>) cannot, and forces a scan.",
      "Cleaning functions are for normalizing before comparison — <code>LOWER(email)</code> for case-insensitive equality, <code>TRIM(name)</code> to drop stray whitespace, <code>REPLACE</code> to strip formatting. Just remember that applying them to a column in a <code>WHERE</code> is, like date functions, usually non-sargable."
    ],

    showMe: {
      code:
        "-- Pull the domain out of an email, normalize case, and\n" +
        "-- flag whether the local part looks like a support alias.\n" +
        "SELECT\n" +
        "  email,\n" +
        "  LOWER(SUBSTRING(email FROM POSITION('@' IN email) + 1)) AS domain,   -- standard SQL\n" +
        "  TRIM(SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)) AS local_part,\n" +
        "  first_name || ' ' || last_name                         AS full_name  -- Postgres concat\n" +
        "FROM users\n" +
        "WHERE email LIKE '%@example.com';",
      caption:
        "POSITION('@' IN email) locates the separator (1-based), SUBSTRING slices the domain after it, and LOWER normalizes " +
        "for comparison. The || operator concatenates in standard SQL / Postgres; the LIKE has a leading wildcard, so it cannot use an index here."
    },

    whyMatters:
      "<p>Text handling powers data-cleaning and parsing questions — <b>extract a domain</b>, <b>split a full name</b>, <b>normalize phone numbers</b>, <b>find rows containing X</b>, <b>concatenate group values into a list</b>. The recurring performance trap mirrors dates: a function on the column blocks the index.</p>" +
      "<ul>" +
      "<li><b>Prefix LIKE is sargable</b> (<code>name LIKE 'Sm%'</code>); <b>leading-wildcard LIKE is not</b> (<code>name LIKE '%son'</code>) and scans the table.</li>" +
      "<li><b>Case-insensitive matching</b> via <code>LOWER(col) = 'x'</code> is non-sargable — prefer a case-insensitive collation, a functional index on <code>LOWER(col)</code>, or Postgres <code>ILIKE</code>.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">-- Prefix search can seek an index; contains-search cannot.\nWHERE name LIKE 'Sm%'      -- index range seek on name\nWHERE name LIKE '%son'     -- leading wildcard: full scan\nWHERE LOWER(name) = 'smith'-- function on column: full scan (unless functional index)</pre>",

    recognize: [
      { q: "\"extract the part before/after a character\", \"get the domain\", \"split the name\"", think: "POSITION/CHARINDEX to find the delimiter, then SUBSTRING to slice — remember 1-based indexing." },
      { q: "\"combine into one string\", \"full name\", \"label\"", think: "Concatenate: standard/Postgres a || b; SQL Server a + b; portable CONCAT(a, b) (which also handles NULLs)." },
      { q: "\"contains\", \"starts with\", \"ends with\", \"pattern\"", think: "LIKE with % / _ ; a leading % kills the index. Regex (~, REGEXP, LIKE_REGEXP) for richer patterns where supported." },
      { q: "\"case-insensitive\", \"ignore capitalization\"", think: "LOWER()/UPPER() both sides, or ILIKE (Postgres) / a CI collation — but note LOWER(col) in WHERE is non-sargable." },
      { q: "\"strip whitespace\", \"remove characters\", \"clean up\"", think: "TRIM (and LTRIM/RTRIM) for whitespace; REPLACE to remove or swap a substring; nest REPLACE for several characters." }
    ],

    matchTags: ["string", "substring", "concat", "like", "trim", "replace", "split",
                "position", "upper", "lower", "regex"],

    traps: [
      {
        bad: "SUBSTRING(s, 0, 3)    -- expecting the first 3 characters",
        good: "SUBSTRING(s, 1, 3)    -- positions are 1-based: chars 1,2,3",
        why: "SQL string positions start at 1, not 0. Passing a start of 0 (or a negative) behaves differently across engines and rarely gives the first N characters you intended."
      },
      {
        bad: "SELECT first_name + ' ' + last_name FROM users;   -- NULL if either is NULL (T-SQL)",
        good: "SELECT CONCAT(first_name, ' ', last_name) FROM users;",
        why: "In T-SQL the + operator returns NULL when any operand is NULL, wiping out the whole name; in Postgres || also propagates NULL. CONCAT treats NULLs as empty strings and is portable across Postgres/MySQL/SQL Server."
      },
      {
        bad: "WHERE LOWER(email) LIKE '%@gmail.com'",
        good: "WHERE email ILIKE '%@gmail.com'   -- Postgres; or a CI collation / functional index",
        why: "LOWER(col) makes the predicate non-sargable, and the leading % already prevents an index range seek. For a genuine suffix/contains test on large data, consider a functional index, a reversed-string index, or full-text search rather than scanning."
      }
    ],

    complexity: [
      { op: "SUBSTRING / TRIM / UPPER / LOWER / REPLACE (per row)", big_o: "O(m)", note: "Linear in the string length m; cheap in a SELECT list, but placing them on a column in WHERE turns the predicate non-sargable and scans all n rows." },
      { op: "Concatenation (|| / + / CONCAT)", big_o: "O(m1 + m2)", note: "Proportional to the combined length of the pieces; a constant-per-row cost with no effect on index usage." },
      { op: "LIKE 'prefix%' (no leading wildcard)", big_o: "O(log n + k)", note: "Sargable — a B-tree index on the column supports a range seek to the k matching rows, just like a range predicate." },
      { op: "LIKE '%substr%' (leading wildcard)", big_o: "O(n * m)", note: "Non-sargable: every one of the n rows is scanned and pattern-matched, each match linear in the string length m. Use full-text or a trigram index instead." },
      { op: "POSITION / CHARINDEX", big_o: "O(m)", note: "Scans the string to find the first occurrence, linear in its length; O(n*m) if applied across a whole table in the projection." }
    ],

    engineNote:
      "<p><b>Dialect notes — string syntax diverges; name your engine.</b></p>" +
      "<ul>" +
      "<li><b>Concatenation:</b> standard SQL and Postgres use <code>a || b</code>; SQL Server uses <code>a + b</code> (and <code>||</code> is not valid); MySQL treats <code>||</code> as logical OR by default, so use <code>CONCAT(a, b)</code>. <code>CONCAT(...)</code> works everywhere and is NULL-safe.</li>" +
      "<li><b>Substring:</b> standard form is <code>SUBSTRING(s FROM start FOR len)</code>; the comma form <code>SUBSTRING(s, start, len)</code> works in Postgres/MySQL/SQL Server. SQL Server also uses <code>LEFT</code>/<code>RIGHT</code>. All are <b>1-based</b>.</li>" +
      "<li><b>Find a position:</b> standard/Postgres <code>POSITION(sub IN s)</code> or <code>STRPOS(s, sub)</code>; SQL Server <code>CHARINDEX(sub, s)</code>; MySQL <code>LOCATE(sub, s)</code> or <code>INSTR(s, sub)</code>. All return 1-based positions, 0 when not found.</li>" +
      "<li><b>Trim:</b> <code>TRIM(s)</code> is standard; older SQL Server (pre-2017) needs <code>LTRIM(RTRIM(s))</code>.</li>" +
      "<li><b>Case-insensitive matching:</b> Postgres has <code>ILIKE</code>; MySQL comparisons are case-insensitive by default (collation-dependent); SQL Server depends on the column/database collation. Do not assume LIKE is case-insensitive — it is engine- and collation-specific.</li>" +
      "<li><b>Split &amp; regex:</b> Postgres <code>SPLIT_PART(s, delim, n)</code>, <code>REGEXP_REPLACE</code>, and the <code>~</code> operator; MySQL <code>SUBSTRING_INDEX</code> and <code>REGEXP</code>; SQL Server <code>STRING_SPLIT</code> (a table function) and limited regex before 2025. String aggregation is <code>STRING_AGG</code> in Postgres/SQL Server, <code>GROUP_CONCAT</code> in MySQL.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You have accounts(email VARCHAR). Write ONE query (target: PostgreSQL) that returns each email's lowercased domain (the part after '@') and a full display label of the form 'local@domain' with surrounding whitespace trimmed, for accounts on the example.com domain only. Which functions locate the '@', slice the two parts, and concatenate them — and why is the domain filter here not index-friendly?",
      starter:
        "SELECT\n" +
        "  email,\n" +
        "  /* lowercased domain after '@' */   AS domain,\n" +
        "  /* trimmed 'local@domain' label */  AS label\n" +
        "FROM accounts\n" +
        "WHERE /* domain is example.com */;",
      solution:
        "-- PostgreSQL\n" +
        "SELECT\n" +
        "  email,\n" +
        "  LOWER(SUBSTRING(email FROM POSITION('@' IN email) + 1))              AS domain,\n" +
        "  TRIM(SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1))\n" +
        "    || '@'\n" +
        "    || LOWER(SUBSTRING(email FROM POSITION('@' IN email) + 1))         AS label\n" +
        "FROM accounts\n" +
        "WHERE email LIKE '%@example.com';\n" +
        "-- POSITION('@' IN email) finds the 1-based separator index;\n" +
        "-- SUBSTRING slices the local part (FROM 1 FOR pos-1) and domain (FROM pos+1);\n" +
        "-- || concatenates them back with a literal '@'.\n" +
        "-- The filter LIKE '%@example.com' has a LEADING wildcard, so it is non-sargable\n" +
        "-- and forces a full scan; a functional index on the extracted domain would fix it."
    }
  }
]);
