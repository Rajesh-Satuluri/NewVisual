/*
 * data/aggregation3.js — Aggregation & Grouping (third supplemental set).
 * Thirteen additional interview problems authored to the same per-problem
 * schema as ranking.js: schema / sampleData / setupSql / expectedOutput /
 * multiple instructive T-SQL approaches / walkthrough tables.
 * All T-SQL targets SQL Server 2019/2022 and runs as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Aggregation & Grouping", [

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-monthly-revenue-by-region",
      number: "SS 10402",
      platform: "StrataScratch",
      title: "Monthly Revenue by Region",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Date/Time"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group by derived date parts", sqlConcept: "SUM + YEAR/MONTH", technique: "Composite time bucket" },
      descriptionBrief:
        "Given a **Sales** table with a `SaleDate` and an `Amount`, return the total revenue for each " +
        "**region-and-month** combination. Bucket by calendar year and month, ordered by region then " +
        "year then month.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(20)" },
          { name: "SaleDate", type: "DATE" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Region VARCHAR(20), SaleDate DATE, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'North','2024-01-10',100.00),(2,'North','2024-01-25',150.00),\n" +
        "  (3,'North','2024-02-05',200.00),(4,'South','2024-01-15',300.00),\n" +
        "  (5,'South','2024-02-20',250.00),(6,'South','2024-02-28',50.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","Region","SaleDate","Amount"],
          rows: [[1,"North","2024-01-10","100.00"],[2,"North","2024-01-25","150.00"],[3,"North","2024-02-05","200.00"],[4,"South","2024-01-15","300.00"],[5,"South","2024-02-20","250.00"],[6,"South","2024-02-28","50.00"]] }
      ],
      expectedOutput: { columns: ["Region","SaleYear","SaleMonth","Revenue"],
        rows: [["North",2024,1,"250.00"],["North",2024,2,"200.00"],["South",2024,1,"300.00"],["South",2024,2,"300.00"]] },
      approaches: [
        {
          name: "GROUP BY region and date parts (recommended)",
          perfNote: "One grouped pass; YEAR() and MONTH() are cheap scalar extractions and the group key is the (Region, year, month) tuple.",
          dialectNote: "`YEAR()`/`MONTH()` are T-SQL built-ins; other dialects use `EXTRACT(... FROM ...)` or `DATE_TRUNC`.",
          logic:
            "**What it asks.** One revenue total per region for each calendar month.\n\n" +
            "**Why the naive idea fails.** Grouping by the raw `SaleDate` makes a separate bucket per day, not per month; grouping by region alone flattens time away entirely.\n\n" +
            "**Key Idea.** Derive the month bucket with `YEAR(SaleDate)` and `MONTH(SaleDate)`, then `GROUP BY Region, YEAR(SaleDate), MONTH(SaleDate)` and `SUM(Amount)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute the year and month from `SaleDate`.\n" +
            "2. `GROUP BY Region, YEAR(SaleDate), MONTH(SaleDate)`.\n" +
            "3. Project the keys plus `SUM(Amount)` as revenue.\n" +
            "4. Order by region, year, month.\n\n" +
            "**Why it works.** The grouping key becomes the region-year-month tuple, so every distinct month within a region collapses to a single total.\n\n" +
            "**Common Gotchas.** Group on the *same* expressions you select; grouping on the raw date instead of its parts explodes the buckets. Include the year so December and January of different years never merge.\n\n" +
            "**Performance.** One hash/stream aggregate over a single scan, O(n).\n\n" +
            "**Interview mindset.** 'per month' means bucket the date first — GROUP BY the year and month parts, not the raw timestamp.",
          tsql:
            "SELECT Region,\n" +
            "       YEAR(SaleDate)  AS SaleYear,\n" +
            "       MONTH(SaleDate) AS SaleMonth,\n" +
            "       SUM(Amount)     AS Revenue     -- total for this region-month\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region, YEAR(SaleDate), MONTH(SaleDate)\n" +
            "ORDER BY Region, SaleYear, SaleMonth;",
          clean:
            "SELECT Region, YEAR(SaleDate) AS SaleYear, MONTH(SaleDate) AS SaleMonth,\n" +
            "       SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region, YEAR(SaleDate), MONTH(SaleDate)\n" +
            "ORDER BY Region, SaleYear, SaleMonth;"
        }
      ],
      walkthrough: [
        { step: "Bucket by region-year-month", note: "North Jan = 100+150 = 250; North Feb = 200; South Jan = 300; South Feb = 250+50 = 300.",
          table: { columns: ["Region","SaleYear","SaleMonth","Revenue"],
            rows: [["North",2024,1,"250.00"],["North",2024,2,"200.00"],["South",2024,1,"300.00"],["South",2024,2,"300.00"]] } }
      ],
      patternRecognition: [
        "'revenue per month' → GROUP BY the year and month parts of the date, not the raw date.",
        "Always carry the year alongside the month so same-numbered months across years stay separate."
      ],
      interviewRecall: [
        "YEAR()/MONTH() extract date parts you can group on.",
        "The GROUP BY expressions must match the non-aggregated SELECT expressions exactly."
      ],
      commonMistakes: [
        "Grouping by the raw date and getting one bucket per day.",
        "Dropping the year and merging the same month from different years."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-average-order-value-per-channel",
      number: "DL 2402",
      platform: "DataLemur",
      title: "Average Order Value per Channel",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["E-commerce Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Ratio metric per group", sqlConcept: "SUM / COUNT / AVG", technique: "Average order value" },
      descriptionBrief:
        "Given an **Orders** table tagged by acquisition `Channel`, return per channel the **order " +
        "count**, **total revenue**, and **average order value** (rounded to 2 decimals), highest AOV " +
        "first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Channel", type: "VARCHAR(20)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, Channel VARCHAR(20), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'Web',100.00),(2,'Web',200.00),(3,'Web',300.00),\n" +
        "  (4,'Mobile',50.00),(5,'Mobile',150.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","Channel","Amount"],
          rows: [[1,"Web","100.00"],[2,"Web","200.00"],[3,"Web","300.00"],[4,"Mobile","50.00"],[5,"Mobile","150.00"]] }
      ],
      expectedOutput: { columns: ["Channel","Orders","Revenue","AvgOrderValue"],
        rows: [["Web",3,"600.00","200.00"],["Mobile",2,"200.00","100.00"]] },
      approaches: [
        {
          name: "SUM over COUNT for AOV (recommended)",
          perfNote: "All three measures fall out of one grouped scan; expressing AOV as SUM/COUNT keeps the arithmetic explicit and avoids AVG's integer traps.",
          dialectNote: "",
          logic:
            "**What it asks.** Average order value per channel — total revenue divided by number of orders — with the count and revenue shown too.\n\n" +
            "**Why the naive idea fails.** Averaging the raw amounts with plain `AVG` on an integer column would truncate; and computing revenue and count in separate queries then dividing outside SQL is needless round-tripping.\n\n" +
            "**Key Idea.** Group by channel and compute `SUM(Amount) / COUNT(*)` (as decimal) for AOV, alongside `COUNT(*)` and `SUM(Amount)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Channel`.\n" +
            "2. Project `COUNT(*)` as Orders and `SUM(Amount)` as Revenue.\n" +
            "3. Compute AOV as `SUM(Amount) / COUNT(*)`, cast to `DECIMAL(10,2)`.\n" +
            "4. Order by AOV descending.\n\n" +
            "**Why it works.** Each order contributes one row to `COUNT(*)` and its amount to `SUM`, so their ratio is exactly the mean order value.\n\n" +
            "**Common Gotchas.** On an integer amount column the division truncates — cast to decimal first. `AVG(Amount)` is equivalent here only because Amount is already `DECIMAL`.\n\n" +
            "**Performance.** One grouped aggregate for all three measures, O(n).\n\n" +
            "**Interview mindset.** 'average value per group' → SUM/COUNT (or AVG), computed inside the same GROUP BY.",
          tsql:
            "SELECT Channel,\n" +
            "       COUNT(*)    AS Orders,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(SUM(Amount) / COUNT(*) AS DECIMAL(10,2)) AS AvgOrderValue\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Channel\n" +
            "ORDER BY AvgOrderValue DESC;",
          clean:
            "SELECT Channel, COUNT(*) AS Orders, SUM(Amount) AS Revenue,\n" +
            "       CAST(SUM(Amount) / COUNT(*) AS DECIMAL(10,2)) AS AvgOrderValue\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Channel\n" +
            "ORDER BY AvgOrderValue DESC;"
        }
      ],
      walkthrough: [
        { step: "Aggregate per channel", note: "Web: 3 orders, 600 revenue, 200 AOV. Mobile: 2 orders, 200 revenue, 100 AOV.",
          table: { columns: ["Channel","Orders","Revenue","AvgOrderValue"],
            rows: [["Web",3,"600.00","200.00"],["Mobile",2,"200.00","100.00"]] } }
      ],
      patternRecognition: [
        "'average order value / average per group' → SUM(measure) / COUNT(*) inside GROUP BY."
      ],
      interviewRecall: [
        "AOV = total revenue / order count; both come from the same grouped pass.",
        "Cast to decimal before dividing integers, or the quotient truncates."
      ],
      commonMistakes: [
        "Letting integer division truncate the average.",
        "Computing revenue and count in separate queries and dividing outside SQL."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-repeat-purchase-customers",
      number: "DL 2405",
      platform: "DataLemur",
      title: "Repeat Purchase Customers",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Group then filter by count", sqlConcept: "GROUP BY + HAVING COUNT", technique: "Repeat-behaviour threshold" },
      descriptionBrief:
        "Given an **Orders** table, return the customers who placed **more than one order** together " +
        "with their order count, most orders first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, OrderDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,'2024-01-01'),(2,1,'2024-02-01'),(3,2,'2024-01-05'),\n" +
        "  (4,3,'2024-01-10'),(5,3,'2024-03-10'),(6,3,'2024-04-10');",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","OrderDate"],
          rows: [[1,1,"2024-01-01"],[2,1,"2024-02-01"],[3,2,"2024-01-05"],[4,3,"2024-01-10"],[5,3,"2024-03-10"],[6,3,"2024-04-10"]] }
      ],
      expectedOutput: { columns: ["CustomerId","OrderCount"], rows: [[3,3],[1,2]] },
      approaches: [
        {
          name: "GROUP BY … HAVING COUNT > 1 (recommended)",
          perfNote: "Count orders per customer in one grouped pass; HAVING drops single-order customers before the result is returned.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers who ordered more than once — the repeat buyers — and how many orders each placed.\n\n" +
            "**Why the naive idea fails.** `WHERE` cannot test a per-customer count because the count only exists after grouping; a per-row filter has no notion of 'how many orders this customer has'.\n\n" +
            "**Key Idea.** Count orders per `CustomerId`, then keep customers whose count exceeds one with `HAVING COUNT(*) > 1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId` with `COUNT(*)` as the order count.\n" +
            "2. `HAVING COUNT(*) > 1` to keep repeat buyers.\n" +
            "3. Order by the count descending.\n\n" +
            "**Why it works.** HAVING filters the aggregated groups, so it can compare against the group's own row count that WHERE never sees.\n\n" +
            "**Common Gotchas.** Use HAVING, not WHERE, for the count threshold. `> 1` excludes one-time buyers; `>= 2` is the same thing.\n\n" +
            "**Performance.** One group aggregate plus a small sort on the counts.\n\n" +
            "**Interview mindset.** 'did X more than once / repeat behaviour' → GROUP BY the actor, HAVING COUNT(*) > 1.",
          tsql:
            "SELECT CustomerId,\n" +
            "       COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(*) > 1            -- keep repeat buyers only\n" +
            "ORDER BY OrderCount DESC;",
          clean:
            "SELECT CustomerId, COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(*) > 1\n" +
            "ORDER BY OrderCount DESC;"
        }
      ],
      walkthrough: [
        { step: "Count orders per customer", note: "Customer 1 = 2, customer 2 = 1, customer 3 = 3.",
          table: { columns: ["CustomerId","OrderCount"], rows: [[1,2],[2,1],[3,3]] } },
        { step: "Keep COUNT(*) > 1, order DESC", note: "Customer 2 drops; 3 leads with 3, then 1 with 2.",
          table: { columns: ["CustomerId","OrderCount"], rows: [[3,3],[1,2]] } }
      ],
      patternRecognition: [
        "'customers who ordered more than once / repeat buyers' → GROUP BY customer HAVING COUNT(*) > 1."
      ],
      interviewRecall: [
        "HAVING filters groups after aggregation; WHERE filters rows before it.",
        "A count-based threshold cannot live in WHERE."
      ],
      commonMistakes: [
        "Trying to express the count threshold in WHERE.",
        "Returning single-order customers because the HAVING boundary was wrong."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-active-users-per-day",
      number: "SS 10410",
      platform: "StrataScratch",
      title: "Daily Active Users",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Product Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Distinct count per group", sqlConcept: "COUNT(DISTINCT ...)", technique: "Deduplicated per-day count" },
      descriptionBrief:
        "Given an **Events** log where a user can fire many events per day, return the number of " +
        "**distinct active users** on each day, ordered by date.",
      schema: [
        { name: "Events", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "UserId", type: "INT" },
          { name: "EventDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Events','U') IS NOT NULL DROP TABLE dbo.Events;\n" +
        "CREATE TABLE dbo.Events (Id INT PRIMARY KEY, UserId INT, EventDate DATE);\n" +
        "INSERT INTO dbo.Events VALUES\n" +
        "  (1,1,'2024-05-01'),(2,1,'2024-05-01'),(3,2,'2024-05-01'),\n" +
        "  (4,2,'2024-05-02'),(5,3,'2024-05-02');",
      sampleData: [
        { table: "Events", columns: ["Id","UserId","EventDate"],
          rows: [[1,1,"2024-05-01"],[2,1,"2024-05-01"],[3,2,"2024-05-01"],[4,2,"2024-05-02"],[5,3,"2024-05-02"]] }
      ],
      expectedOutput: { columns: ["EventDate","ActiveUsers"],
        rows: [["2024-05-01",2],["2024-05-02",2]] },
      approaches: [
        {
          name: "COUNT(DISTINCT UserId) per day (recommended)",
          perfNote: "One grouped pass; COUNT(DISTINCT) deduplicates users inside each day without a separate DISTINCT subquery.",
          dialectNote: "",
          logic:
            "**What it asks.** How many *unique* users were active each day — the classic daily-active-users (DAU) metric.\n\n" +
            "**Why the naive idea fails.** Plain `COUNT(*)` counts event rows, so a user who fired ten events counts ten times and inflates DAU.\n\n" +
            "**Key Idea.** Group by day and use `COUNT(DISTINCT UserId)` so each user contributes exactly one to the day's tally.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY EventDate`.\n" +
            "2. Project `COUNT(DISTINCT UserId)` as active users.\n" +
            "3. Order by date.\n\n" +
            "**Why it works.** DISTINCT collapses repeated user ids within a day before counting, so multiple events from one user count once.\n\n" +
            "**Common Gotchas.** `COUNT(DISTINCT UserId)` ignores NULL user ids. If timestamps carry a time component, bucket to the date first with `CAST(... AS DATE)`.\n\n" +
            "**Performance.** A distinct-then-count per group, O(n); slightly heavier than a plain COUNT.\n\n" +
            "**Interview mindset.** 'active users / unique visitors per period' → COUNT(DISTINCT actor) GROUP BY period.",
          tsql:
            "SELECT EventDate,\n" +
            "       COUNT(DISTINCT UserId) AS ActiveUsers   -- unique users that day\n" +
            "FROM dbo.Events\n" +
            "GROUP BY EventDate\n" +
            "ORDER BY EventDate;",
          clean:
            "SELECT EventDate, COUNT(DISTINCT UserId) AS ActiveUsers\n" +
            "FROM dbo.Events\n" +
            "GROUP BY EventDate\n" +
            "ORDER BY EventDate;"
        }
      ],
      walkthrough: [
        { step: "COUNT(DISTINCT UserId) per day", note: "May 1: users 1 (twice) and 2 → 2. May 2: users 2 and 3 → 2.",
          table: { columns: ["EventDate","ActiveUsers"], rows: [["2024-05-01",2],["2024-05-02",2]] } }
      ],
      patternRecognition: [
        "'active users / unique per day' → COUNT(DISTINCT user) GROUP BY day."
      ],
      interviewRecall: [
        "COUNT(*) counts events; COUNT(DISTINCT user) counts people.",
        "Bucket a datetime to a date with CAST(... AS DATE) before grouping by day."
      ],
      commonMistakes: [
        "Using COUNT(*) and inflating DAU with repeat events.",
        "Grouping on a datetime with a time part so every second becomes its own bucket."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-first-last-activity-per-user",
      number: "SS 10415",
      platform: "StrataScratch",
      title: "First and Last Activity Span per User",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Date/Time"],
      domains: ["Product Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group endpoints + span", sqlConcept: "MIN / MAX + DATEDIFF", technique: "Lifetime window per group" },
      descriptionBrief:
        "Given a **Sessions** table, return per user their **first** and **last** activity date and the " +
        "number of days between them (the active span), ordered by user id.",
      schema: [
        { name: "Sessions", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sessions','U') IS NOT NULL DROP TABLE dbo.Sessions;\n" +
        "CREATE TABLE dbo.Sessions (Id INT PRIMARY KEY, UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.Sessions VALUES\n" +
        "  (1,1,'2024-01-05'),(2,1,'2024-03-10'),(3,1,'2024-02-01'),\n" +
        "  (4,2,'2024-04-01'),(5,2,'2024-04-15');",
      sampleData: [
        { table: "Sessions", columns: ["Id","UserId","ActivityDate"],
          rows: [[1,1,"2024-01-05"],[2,1,"2024-03-10"],[3,1,"2024-02-01"],[4,2,"2024-04-01"],[5,2,"2024-04-15"]] }
      ],
      expectedOutput: { columns: ["UserId","FirstActivity","LastActivity","SpanDays"],
        rows: [[1,"2024-01-05","2024-03-10",65],[2,"2024-04-01","2024-04-15",14]] },
      approaches: [
        {
          name: "MIN / MAX + DATEDIFF (recommended)",
          perfNote: "Both endpoints come from the same grouped scan; DATEDIFF over the two aggregates needs no self-join or window.",
          dialectNote: "`DATEDIFF(day, a, b)` is T-SQL; other dialects subtract dates directly or use `DATE_PART`.",
          logic:
            "**What it asks.** For each user, the earliest and latest activity date and how many days separate them.\n\n" +
            "**Why the naive idea fails.** Fetching the first and last rows with two ordered subqueries (or a window function) is heavier than needed when only the dates — not whole rows — are wanted.\n\n" +
            "**Key Idea.** `GROUP BY UserId` and take `MIN(ActivityDate)` and `MAX(ActivityDate)`; the span is `DATEDIFF(day, MIN, MAX)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY UserId`.\n" +
            "2. Project `MIN(ActivityDate)` and `MAX(ActivityDate)`.\n" +
            "3. Compute `DATEDIFF(day, MIN(ActivityDate), MAX(ActivityDate))` as the span.\n" +
            "4. Order by user id.\n\n" +
            "**Why it works.** MIN and MAX read the chronological endpoints in one pass; DATEDIFF measures the day gap between them.\n\n" +
            "**Common Gotchas.** You may reference `MIN`/`MAX` directly inside `DATEDIFF` in the SELECT — no need to nest a subquery. A single-session user yields a span of 0, which is correct.\n\n" +
            "**Performance.** One stream/hash aggregate, O(n); an index on `(UserId, ActivityDate)` streams it without a sort.\n\n" +
            "**Interview mindset.** 'first and last date + how long between' → MIN/MAX in a GROUP BY, DATEDIFF on the two aggregates.",
          tsql:
            "SELECT UserId,\n" +
            "       MIN(ActivityDate) AS FirstActivity,\n" +
            "       MAX(ActivityDate) AS LastActivity,\n" +
            "       DATEDIFF(day, MIN(ActivityDate), MAX(ActivityDate)) AS SpanDays\n" +
            "FROM dbo.Sessions\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;",
          clean:
            "SELECT UserId, MIN(ActivityDate) AS FirstActivity,\n" +
            "       MAX(ActivityDate) AS LastActivity,\n" +
            "       DATEDIFF(day, MIN(ActivityDate), MAX(ActivityDate)) AS SpanDays\n" +
            "FROM dbo.Sessions\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;"
        }
      ],
      walkthrough: [
        { step: "MIN/MAX per user, then span", note: "User 1: 2024-01-05 to 2024-03-10 = 65 days. User 2: 2024-04-01 to 2024-04-15 = 14 days.",
          table: { columns: ["UserId","FirstActivity","LastActivity","SpanDays"],
            rows: [[1,"2024-01-05","2024-03-10",65],[2,"2024-04-01","2024-04-15",14]] } }
      ],
      patternRecognition: [
        "'first and last event per group' → MIN(date) and MAX(date) under GROUP BY.",
        "'how long between first and last' → DATEDIFF over the two aggregates."
      ],
      interviewRecall: [
        "MIN/MAX on a DATE compares chronologically and ignores NULLs.",
        "DATEDIFF(day, MIN, MAX) can reference aggregates directly in the SELECT."
      ],
      commonMistakes: [
        "Reaching for FIRST_VALUE/LAST_VALUE windows when only the dates are needed.",
        "Reversing DATEDIFF arguments and getting a negative span."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-high-conversion-campaigns",
      number: "DL 2412",
      platform: "DataLemur",
      title: "Campaigns With High Conversion Rate",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Marketing Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "HAVING on a ratio", sqlConcept: "SUM(CASE) ratio + HAVING", technique: "Conditional-aggregate ratio filter" },
      descriptionBrief:
        "Given an **AdEvents** log where each row is a `click` or a `conversion`, return the campaigns " +
        "whose **conversion rate** (conversions per click) is **at least 0.5**, with clicks, " +
        "conversions and the rate, highest rate first.",
      schema: [
        { name: "AdEvents", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Campaign", type: "VARCHAR(20)" },
          { name: "EventType", type: "VARCHAR(12)", note: "'click' | 'conversion'" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.AdEvents','U') IS NOT NULL DROP TABLE dbo.AdEvents;\n" +
        "CREATE TABLE dbo.AdEvents (Id INT PRIMARY KEY, Campaign VARCHAR(20), EventType VARCHAR(12));\n" +
        "INSERT INTO dbo.AdEvents VALUES\n" +
        "  (1,'A','click'),(2,'A','click'),(3,'A','conversion'),(4,'A','conversion'),\n" +
        "  (5,'B','click'),(6,'B','click'),(7,'B','click'),(8,'B','conversion');",
      sampleData: [
        { table: "AdEvents", columns: ["Id","Campaign","EventType"],
          rows: [[1,"A","click"],[2,"A","click"],[3,"A","conversion"],[4,"A","conversion"],[5,"B","click"],[6,"B","click"],[7,"B","click"],[8,"B","conversion"]] }
      ],
      expectedOutput: { columns: ["Campaign","Clicks","Conversions","ConversionRate"],
        rows: [["A",2,2,"1.00"]] },
      approaches: [
        {
          name: "Conditional counts with a HAVING ratio (recommended)",
          perfNote: "Clicks and conversions are counted in one grouped pass with SUM(CASE); the ratio filter runs in HAVING before results return.",
          dialectNote: "",
          logic:
            "**What it asks.** Campaigns efficient enough that conversions are at least half the clicks.\n\n" +
            "**Why the naive idea fails.** Clicks and conversions live in the *same* column as different `EventType` values, so you cannot filter to one type in WHERE and still count the other; and the ratio is a per-group figure that WHERE cannot see.\n\n" +
            "**Key Idea.** Count each type with `SUM(CASE WHEN EventType = ... THEN 1 ELSE 0 END)`, then filter the ratio in `HAVING`, casting to decimal so the division is exact.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Campaign`.\n" +
            "2. Count clicks and conversions with two conditional sums.\n" +
            "3. In `HAVING`, require `conversions * 1.0 / clicks >= 0.5`.\n" +
            "4. Project the ratio (rounded) and order by it descending.\n\n" +
            "**Why it works.** Conditional aggregation turns the single event column into two counts; HAVING applies the ratio test to the aggregated group.\n\n" +
            "**Common Gotchas.** Multiply by `1.0` (or cast) before dividing so integer division doesn't floor the ratio to 0. Guard against divide-by-zero if a campaign could have no clicks.\n\n" +
            "**Performance.** One grouped aggregate plus a tiny sort on the ratio, O(n).\n\n" +
            "**Interview mindset.** 'groups whose ratio of A to B exceeds t' → conditional SUMs, then HAVING on their (decimal) quotient.",
          tsql:
            "SELECT Campaign,\n" +
            "       SUM(CASE WHEN EventType = 'click'      THEN 1 ELSE 0 END) AS Clicks,\n" +
            "       SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) AS Conversions,\n" +
            "       CAST(SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) * 1.0\n" +
            "            / SUM(CASE WHEN EventType = 'click' THEN 1 ELSE 0 END) AS DECIMAL(4,2)) AS ConversionRate\n" +
            "FROM dbo.AdEvents\n" +
            "GROUP BY Campaign\n" +
            "HAVING SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) * 1.0\n" +
            "       / SUM(CASE WHEN EventType = 'click' THEN 1 ELSE 0 END) >= 0.5\n" +
            "ORDER BY ConversionRate DESC;",
          clean:
            "SELECT Campaign,\n" +
            "       SUM(CASE WHEN EventType = 'click' THEN 1 ELSE 0 END) AS Clicks,\n" +
            "       SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) AS Conversions,\n" +
            "       CAST(SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) * 1.0\n" +
            "            / SUM(CASE WHEN EventType = 'click' THEN 1 ELSE 0 END) AS DECIMAL(4,2)) AS ConversionRate\n" +
            "FROM dbo.AdEvents\n" +
            "GROUP BY Campaign\n" +
            "HAVING SUM(CASE WHEN EventType = 'conversion' THEN 1 ELSE 0 END) * 1.0\n" +
            "       / SUM(CASE WHEN EventType = 'click' THEN 1 ELSE 0 END) >= 0.5\n" +
            "ORDER BY ConversionRate DESC;"
        }
      ],
      walkthrough: [
        { step: "Conditional counts per campaign", note: "A: 2 clicks, 2 conversions, ratio 1.00. B: 3 clicks, 1 conversion, ratio 0.33.",
          table: { columns: ["Campaign","Clicks","Conversions","ConversionRate"],
            rows: [["A",2,2,"1.00"],["B",3,1,"0.33"]] } },
        { step: "Keep ratio >= 0.5", note: "Campaign B (0.33) drops; only A survives.",
          table: { columns: ["Campaign","Clicks","Conversions","ConversionRate"],
            rows: [["A",2,2,"1.00"]] } }
      ],
      patternRecognition: [
        "'ratio of A-events to B-events per group above a threshold' → conditional SUMs + HAVING on their quotient.",
        "Two event types in one column → SUM(CASE) rather than WHERE."
      ],
      interviewRecall: [
        "Multiply by 1.0 before dividing counts, or integer division floors the ratio.",
        "A ratio threshold is a per-group condition and belongs in HAVING."
      ],
      commonMistakes: [
        "Integer division collapsing every ratio below 1 to 0.",
        "Filtering EventType in WHERE and losing the ability to count the other type."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-category-share-of-total",
      number: "SS 10420",
      platform: "StrataScratch",
      title: "Category Share of Total Revenue",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Window Functions"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Share of total", sqlConcept: "Grouped SUM over grand SUM", technique: "Aggregate of an aggregate via window" },
      descriptionBrief:
        "Given an **OrderLines** table, return each category's total revenue and its **percentage share " +
        "of the grand total** (2 decimals), highest revenue first.",
      schema: [
        { name: "OrderLines", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Revenue", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderLines','U') IS NOT NULL DROP TABLE dbo.OrderLines;\n" +
        "CREATE TABLE dbo.OrderLines (Id INT PRIMARY KEY, Category VARCHAR(30), Revenue DECIMAL(10,2));\n" +
        "INSERT INTO dbo.OrderLines VALUES\n" +
        "  (1,'Books',100.00),(2,'Books',100.00),(3,'Toys',300.00),\n" +
        "  (4,'Games',200.00),(5,'Games',300.00);",
      sampleData: [
        { table: "OrderLines", columns: ["Id","Category","Revenue"],
          rows: [[1,"Books","100.00"],[2,"Books","100.00"],[3,"Toys","300.00"],[4,"Games","200.00"],[5,"Games","300.00"]] }
      ],
      expectedOutput: { columns: ["Category","Revenue","PctOfTotal"],
        rows: [["Games","500.00","50.00"],["Toys","300.00","30.00"],["Books","200.00","20.00"]] },
      approaches: [
        {
          name: "Grouped SUM over windowed grand total (recommended)",
          perfNote: "Aggregate once per category, then divide by the grand total supplied by SUM(SUM(...)) OVER () — no second scan or self-join.",
          dialectNote: "`SUM(SUM(x)) OVER ()` (a window over an aggregate) is standard SQL and supported in SQL Server 2012+.",
          logic:
            "**What it asks.** Each category's revenue as a percentage of all revenue combined.\n\n" +
            "**Why the naive idea fails.** After `GROUP BY Category` the grand total is no longer a visible row value; a plain `SUM(Revenue)` inside the group only knows its own category, not the whole.\n\n" +
            "**Key Idea.** Compute the per-category `SUM(Revenue)`, then divide by the grand total obtained with a window aggregate `SUM(SUM(Revenue)) OVER ()`, which sums the group totals across all groups.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `SUM(Revenue)` as the category total.\n" +
            "2. Add `SUM(SUM(Revenue)) OVER ()` — the sum of every group's total, i.e. the grand total.\n" +
            "3. Divide category total by grand total, multiply by 100, cast to `DECIMAL(5,2)`.\n" +
            "4. Order by revenue descending.\n\n" +
            "**Why it works.** A window function runs *after* grouping, so its input rows are the group totals; summing them with an empty OVER() gives the overall total on every row.\n\n" +
            "**Common Gotchas.** The double aggregate `SUM(SUM(...)) OVER ()` is intentional — the inner SUM is the group total, the outer window SUM totals the groups. Multiply by 100.0 (decimal) to avoid integer division.\n\n" +
            "**Performance.** One grouped aggregate plus a cheap window pass over the few group rows.\n\n" +
            "**Interview mindset.** 'share / percent of total' → grouped SUM divided by SUM(SUM(...)) OVER () — window over the aggregate.",
          tsql:
            "SELECT Category,\n" +
            "       SUM(Revenue) AS Revenue,\n" +
            "       CAST(100.0 * SUM(Revenue) / SUM(SUM(Revenue)) OVER () AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT Category, SUM(Revenue) AS Revenue,\n" +
            "       CAST(100.0 * SUM(Revenue) / SUM(SUM(Revenue)) OVER () AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;"
        },
        {
          name: "CROSS JOIN to a scalar grand total",
          perfNote: "Compute the grand total once in a subquery and cross join it to the grouped rows; portable to dialects without windowed aggregates.",
          dialectNote: "",
          logic:
            "**What it asks.** The same per-category share, expressed without a window function.\n\n" +
            "**Why the naive idea fails.** Referencing an ungrouped grand total inside a grouped query is impossible without bringing it in from outside the group.\n\n" +
            "**Key Idea.** Compute the grand total once as a scalar subquery and `CROSS JOIN` it onto the grouped result, then divide.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Derive `SELECT SUM(Revenue) AS Total FROM OrderLines` as a one-row derived table `t`.\n" +
            "2. `GROUP BY Category` in the main query and `CROSS JOIN t`.\n" +
            "3. Divide `SUM(Revenue)` by `t.Total`, times 100, cast to decimal.\n" +
            "4. Order by revenue descending.\n\n" +
            "**Why it works.** The cross join attaches the single grand-total value to every grouped row, making the division possible.\n\n" +
            "**Common Gotchas.** The subquery must total the *whole* table, not a filtered subset; use decimal arithmetic.\n\n" +
            "**Performance.** Two scans (one for the total, one grouped); comparable on small data, and window-free.\n\n" +
            "**Interview mindset.** No windowed aggregates available? Cross join the grand total in.",
          tsql:
            "SELECT o.Category,\n" +
            "       SUM(o.Revenue) AS Revenue,\n" +
            "       CAST(100.0 * SUM(o.Revenue) / t.Total AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.OrderLines o\n" +
            "CROSS JOIN (SELECT SUM(Revenue) AS Total FROM dbo.OrderLines) t\n" +
            "GROUP BY o.Category, t.Total\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT o.Category, SUM(o.Revenue) AS Revenue,\n" +
            "       CAST(100.0 * SUM(o.Revenue) / t.Total AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.OrderLines o\n" +
            "CROSS JOIN (SELECT SUM(Revenue) AS Total FROM dbo.OrderLines) t\n" +
            "GROUP BY o.Category, t.Total\n" +
            "ORDER BY Revenue DESC;"
        }
      ],
      walkthrough: [
        { step: "Category totals + grand total", note: "Books 200, Toys 300, Games 500; grand total 1000.",
          table: { columns: ["Category","Revenue","GrandTotal"],
            rows: [["Games","500.00","1000.00"],["Toys","300.00","1000.00"],["Books","200.00","1000.00"]] } },
        { step: "Divide by grand total", note: "500/1000 = 50%, 300/1000 = 30%, 200/1000 = 20%.",
          table: { columns: ["Category","Revenue","PctOfTotal"],
            rows: [["Games","500.00","50.00"],["Toys","300.00","30.00"],["Books","200.00","20.00"]] } }
      ],
      patternRecognition: [
        "'share / percentage of total' → grouped SUM / SUM(SUM(...)) OVER ().",
        "No windowed aggregates? Cross join a scalar grand total instead."
      ],
      interviewRecall: [
        "A window function runs after GROUP BY, so SUM(SUM(x)) OVER () totals the group totals.",
        "Multiply by 100.0 (decimal) so the percentage isn't floored by integer division."
      ],
      commonMistakes: [
        "Writing SUM(Revenue) OVER () (sums raw rows) instead of SUM(SUM(Revenue)) OVER ().",
        "Integer division making every share 0."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-weighted-average-rating",
      number: "HR 3210",
      platform: "HackerRank",
      title: "Weighted Average Course Rating",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Education Analytics"],
      link: "https://www.hackerrank.com/domains/sql",
      meta: { pattern: "Weighted average", sqlConcept: "SUM(v*w) / SUM(w)", technique: "Weighted mean per group" },
      descriptionBrief:
        "Given a **Reviews** table where each review has a `Rating` and a `Weight` (number of helpful " +
        "votes), return each course's **weighted average rating** (2 decimals), highest first.",
      schema: [
        { name: "Reviews", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Course", type: "VARCHAR(30)" },
          { name: "Rating", type: "INT", note: "1-5" },
          { name: "Weight", type: "INT", note: "helpful votes" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Reviews','U') IS NOT NULL DROP TABLE dbo.Reviews;\n" +
        "CREATE TABLE dbo.Reviews (Id INT PRIMARY KEY, Course VARCHAR(30), Rating INT, Weight INT);\n" +
        "INSERT INTO dbo.Reviews VALUES\n" +
        "  (1,'SQL',5,3),(2,'SQL',3,1),\n" +
        "  (3,'Python',4,2),(4,'Python',2,2);",
      sampleData: [
        { table: "Reviews", columns: ["Id","Course","Rating","Weight"],
          rows: [[1,"SQL",5,3],[2,"SQL",3,1],[3,"Python",4,2],[4,"Python",2,2]] }
      ],
      expectedOutput: { columns: ["Course","WeightedAvg"],
        rows: [["SQL","4.50"],["Python","3.00"]] },
      approaches: [
        {
          name: "SUM(Rating*Weight) / SUM(Weight) (recommended)",
          perfNote: "One grouped pass computes both the weighted numerator and the weight total; no per-row division and no window.",
          dialectNote: "",
          logic:
            "**What it asks.** Each course's average rating where reviews with more helpful votes count more.\n\n" +
            "**Why the naive idea fails.** Plain `AVG(Rating)` treats every review equally and ignores the weights, giving the wrong mean whenever weights differ.\n\n" +
            "**Key Idea.** A weighted average is `SUM(Rating * Weight) / SUM(Weight)`; compute both sums per course and divide.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Course`.\n" +
            "2. Compute `SUM(Rating * Weight)` (weighted numerator) and `SUM(Weight)` (total weight).\n" +
            "3. Divide, using decimal arithmetic, and cast to `DECIMAL(4,2)`.\n" +
            "4. Order by the weighted average descending.\n\n" +
            "**Why it works.** Multiplying each rating by its weight before summing gives every review influence proportional to its weight; dividing by the total weight normalizes back to the rating scale.\n\n" +
            "**Common Gotchas.** Multiply by `1.0` or cast before dividing so the quotient isn't integer-truncated. `AVG(Rating)` is not the same thing.\n\n" +
            "**Performance.** One grouped aggregate, O(n).\n\n" +
            "**Interview mindset.** 'weighted average' → SUM(value*weight)/SUM(weight), never AVG(value).",
          tsql:
            "SELECT Course,\n" +
            "       CAST(SUM(Rating * Weight) * 1.0 / SUM(Weight) AS DECIMAL(4,2)) AS WeightedAvg\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY Course\n" +
            "ORDER BY WeightedAvg DESC;",
          clean:
            "SELECT Course,\n" +
            "       CAST(SUM(Rating * Weight) * 1.0 / SUM(Weight) AS DECIMAL(4,2)) AS WeightedAvg\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY Course\n" +
            "ORDER BY WeightedAvg DESC;"
        }
      ],
      walkthrough: [
        { step: "Weighted sums per course", note: "SQL: (5*3 + 3*1)=18 over weight 4 → 4.50. Python: (4*2 + 2*2)=12 over weight 4 → 3.00.",
          table: { columns: ["Course","WeightedAvg"], rows: [["SQL","4.50"],["Python","3.00"]] } }
      ],
      patternRecognition: [
        "'weighted average / vote-weighted mean' → SUM(value*weight) / SUM(weight) per group."
      ],
      interviewRecall: [
        "A weighted mean divides the weighted total by the total weight, not by the row count.",
        "Cast or multiply by 1.0 before dividing integer sums."
      ],
      commonMistakes: [
        "Using AVG(Rating) and ignoring the weights entirely.",
        "Integer division truncating the weighted mean."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-large-orders-per-store",
      number: "DL 2418",
      platform: "DataLemur",
      title: "Count of Large Orders per Store",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Count of qualifying rows", sqlConcept: "COUNT(CASE ...)", technique: "Filtered count alongside total" },
      descriptionBrief:
        "Given an **Orders** table, return per store the **total number of orders** and the number of " +
        "**large orders** (amount of 100 or more), ordered by store id.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "StoreId", type: "VARCHAR(10)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, StoreId VARCHAR(10), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'S1',50.00),(2,'S1',150.00),(3,'S1',200.00),\n" +
        "  (4,'S2',80.00),(5,'S2',90.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","StoreId","Amount"],
          rows: [[1,"S1","50.00"],[2,"S1","150.00"],[3,"S1","200.00"],[4,"S2","80.00"],[5,"S2","90.00"]] }
      ],
      expectedOutput: { columns: ["StoreId","TotalOrders","LargeOrders"],
        rows: [["S1",3,2],["S2",2,0]] },
      approaches: [
        {
          name: "COUNT(CASE ...) for the qualifying subset (recommended)",
          perfNote: "The total and the filtered count come from the same grouped scan; no self-join and no second query.",
          dialectNote: "",
          logic:
            "**What it asks.** Per store, the overall order count and, separately, how many of those orders were large.\n\n" +
            "**Why the naive idea fails.** A `WHERE Amount >= 100` filter would remove small orders before grouping, so the *total* count would be lost — you need both counts from the same rows.\n\n" +
            "**Key Idea.** Keep every row in the group; count all with `COUNT(*)` and count only the qualifying ones with `COUNT(CASE WHEN Amount >= 100 THEN 1 END)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY StoreId`.\n" +
            "2. `COUNT(*)` for total orders.\n" +
            "3. `COUNT(CASE WHEN Amount >= 100 THEN 1 END)` for large orders (the ELSE is NULL, which COUNT skips).\n" +
            "4. Order by store id.\n\n" +
            "**Why it works.** COUNT ignores NULLs, so the CASE that returns 1 only for large orders and NULL otherwise counts exactly the qualifying rows, while COUNT(*) still sees them all.\n\n" +
            "**Common Gotchas.** Don't put the size filter in WHERE, or the total collapses to the large-order count. A store with zero large orders correctly reports 0, not NULL, because COUNT of all-NULL is 0.\n\n" +
            "**Performance.** One grouped aggregate for both measures, O(n).\n\n" +
            "**Interview mindset.** 'total and how many qualify' → COUNT(*) plus COUNT(CASE WHEN cond THEN 1 END) in one GROUP BY.",
          tsql:
            "SELECT StoreId,\n" +
            "       COUNT(*) AS TotalOrders,\n" +
            "       COUNT(CASE WHEN Amount >= 100 THEN 1 END) AS LargeOrders  -- NULLs skipped\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY StoreId\n" +
            "ORDER BY StoreId;",
          clean:
            "SELECT StoreId, COUNT(*) AS TotalOrders,\n" +
            "       COUNT(CASE WHEN Amount >= 100 THEN 1 END) AS LargeOrders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY StoreId\n" +
            "ORDER BY StoreId;"
        }
      ],
      walkthrough: [
        { step: "Total and filtered counts per store", note: "S1: 3 orders, two are >= 100. S2: 2 orders, none reach 100.",
          table: { columns: ["StoreId","TotalOrders","LargeOrders"], rows: [["S1",3,2],["S2",2,0]] } }
      ],
      patternRecognition: [
        "'how many rows qualify, alongside the total' → COUNT(*) and COUNT(CASE WHEN cond THEN 1 END) together."
      ],
      interviewRecall: [
        "COUNT ignores NULLs, so a CASE with no ELSE counts only the matching rows.",
        "Filtering in WHERE would drop the rows you still need for the total."
      ],
      commonMistakes: [
        "Putting the size condition in WHERE and losing the total order count.",
        "Using SUM(CASE ... ELSE 0) is fine too, but expecting COUNT(CASE) to count the 0-branch."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-customer-lifetime-value",
      number: "SS 10428",
      platform: "StrataScratch",
      title: "Per-Customer Lifetime Value",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Subscription Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Multi-aggregate per entity", sqlConcept: "SUM / COUNT / AVG", technique: "Lifetime value rollup" },
      descriptionBrief:
        "Given a **Payments** table, return per customer their **number of payments**, **lifetime value** " +
        "(total paid), and **average payment** (2 decimals), highest lifetime value first.",
      schema: [
        { name: "Payments", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Payments','U') IS NOT NULL DROP TABLE dbo.Payments;\n" +
        "CREATE TABLE dbo.Payments (Id INT PRIMARY KEY, CustomerId INT, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Payments VALUES\n" +
        "  (1,1,100.00),(2,1,200.00),(3,2,500.00),\n" +
        "  (4,2,100.00),(5,3,50.00);",
      sampleData: [
        { table: "Payments", columns: ["Id","CustomerId","Amount"],
          rows: [[1,1,"100.00"],[2,1,"200.00"],[3,2,"500.00"],[4,2,"100.00"],[5,3,"50.00"]] }
      ],
      expectedOutput: { columns: ["CustomerId","Payments","LifetimeValue","AvgPayment"],
        rows: [[2,2,"600.00","300.00"],[1,2,"300.00","150.00"],[3,1,"50.00","50.00"]] },
      approaches: [
        {
          name: "SUM/COUNT/AVG per customer (recommended)",
          perfNote: "All three lifetime metrics compute in one grouped scan; no repeated aggregation.",
          dialectNote: "",
          logic:
            "**What it asks.** A per-customer rollup: how many payments, total value, and average payment size.\n\n" +
            "**Why the naive idea fails.** Running three separate grouped queries and stitching them wastes work — all three come from the same customer groups.\n\n" +
            "**Key Idea.** One `GROUP BY CustomerId` carries `COUNT(*)`, `SUM(Amount)`, and `AVG(Amount)` together.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId`.\n" +
            "2. Project `COUNT(*)`, `SUM(Amount)`, and `CAST(AVG(Amount) AS DECIMAL(10,2))`.\n" +
            "3. Order by lifetime value descending.\n\n" +
            "**Why it works.** Multiple aggregate expressions evaluate over the same partition in a single pass.\n\n" +
            "**Common Gotchas.** Amount is DECIMAL so AVG is exact; on an integer column AVG would truncate. Order by the SUM alias for the ranking.\n\n" +
            "**Performance.** One grouped aggregate for all three measures, O(n).\n\n" +
            "**Interview mindset.** 'lifetime value / per-customer rollup' → combine COUNT, SUM, AVG under one GROUP BY.",
          tsql:
            "SELECT CustomerId,\n" +
            "       COUNT(*)    AS Payments,\n" +
            "       SUM(Amount) AS LifetimeValue,\n" +
            "       CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgPayment\n" +
            "FROM dbo.Payments\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY LifetimeValue DESC;",
          clean:
            "SELECT CustomerId, COUNT(*) AS Payments, SUM(Amount) AS LifetimeValue,\n" +
            "       CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgPayment\n" +
            "FROM dbo.Payments\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY LifetimeValue DESC;"
        }
      ],
      walkthrough: [
        { step: "Roll up per customer", note: "Customer 2: 2 payments, 600 total, 300 avg. Customer 1: 2, 300, 150. Customer 3: 1, 50, 50.",
          table: { columns: ["CustomerId","Payments","LifetimeValue","AvgPayment"],
            rows: [[2,2,"600.00","300.00"],[1,2,"300.00","150.00"],[3,1,"50.00","50.00"]] } }
      ],
      patternRecognition: [
        "'lifetime value / total, count and average per entity' → one GROUP BY with COUNT, SUM and AVG."
      ],
      interviewRecall: [
        "Several aggregates share a single GROUP BY pass.",
        "AVG over INT truncates; cast or use DECIMAL for fractional accuracy."
      ],
      commonMistakes: [
        "Writing three separate grouped queries instead of one.",
        "Ordering by an unaggregated column instead of the SUM."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-order-size-buckets",
      number: "SS 10432",
      platform: "StrataScratch",
      title: "Order Size Distribution Buckets",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["E-commerce Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group by a CASE expression", sqlConcept: "GROUP BY CASE", technique: "Bucketed histogram counts" },
      descriptionBrief:
        "Given an **Orders** table, classify each order into a size bucket — **Small** (< 50), **Medium** " +
        "(50 to 199), **Large** (>= 200) — and return the number of orders in each bucket, from smallest " +
        "bucket to largest.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,20.00),(2,45.00),(3,60.00),\n" +
        "  (4,150.00),(5,200.00),(6,500.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","Amount"],
          rows: [[1,"20.00"],[2,"45.00"],[3,"60.00"],[4,"150.00"],[5,"200.00"],[6,"500.00"]] }
      ],
      expectedOutput: { columns: ["Bucket","OrderCount"],
        rows: [["Small",2],["Medium",2],["Large",2]] },
      approaches: [
        {
          name: "GROUP BY a CASE bucket (recommended)",
          perfNote: "The bucketing CASE is both the SELECT label and the GROUP BY key, so one pass builds the histogram — no ranges table, no self-join.",
          dialectNote: "",
          logic:
            "**What it asks.** A histogram: how many orders fall into each size band.\n\n" +
            "**Why the naive idea fails.** There is no bucket column in the data; grouping by the raw amount makes one group per distinct amount, not per band.\n\n" +
            "**Key Idea.** Derive the band with a `CASE` expression and `GROUP BY` that same expression so all orders in a band collapse to one row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write a `CASE` mapping Amount to 'Small' / 'Medium' / 'Large'.\n" +
            "2. `GROUP BY` the identical CASE expression.\n" +
            "3. `COUNT(*)` the orders per band.\n" +
            "4. Order the bands by a sort key (e.g. `MIN(Amount)`) so they read Small→Large.\n\n" +
            "**Why it works.** Grouping on the CASE means every order sharing a band lands in the same bucket, and COUNT sizes it.\n\n" +
            "**Common Gotchas.** The GROUP BY expression must match the SELECT CASE exactly. You cannot GROUP BY the SELECT alias in T-SQL — repeat the CASE (or wrap in a derived table). Watch the band boundaries (50 and 200 belong to Medium and Large respectively).\n\n" +
            "**Performance.** One grouped aggregate, O(n).\n\n" +
            "**Interview mindset.** 'bucket / band / histogram counts' → GROUP BY a CASE that defines the buckets.",
          tsql:
            "SELECT CASE WHEN Amount < 50  THEN 'Small'\n" +
            "            WHEN Amount < 200 THEN 'Medium'\n" +
            "            ELSE 'Large' END AS Bucket,\n" +
            "       COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CASE WHEN Amount < 50  THEN 'Small'\n" +
            "              WHEN Amount < 200 THEN 'Medium'\n" +
            "              ELSE 'Large' END\n" +
            "ORDER BY MIN(Amount);",
          clean:
            "SELECT CASE WHEN Amount < 50 THEN 'Small'\n" +
            "            WHEN Amount < 200 THEN 'Medium'\n" +
            "            ELSE 'Large' END AS Bucket,\n" +
            "       COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CASE WHEN Amount < 50 THEN 'Small'\n" +
            "              WHEN Amount < 200 THEN 'Medium'\n" +
            "              ELSE 'Large' END\n" +
            "ORDER BY MIN(Amount);"
        }
      ],
      walkthrough: [
        { step: "Label each order, then group", note: "Small: 20,45. Medium: 60,150. Large: 200,500. Two orders each.",
          table: { columns: ["Bucket","OrderCount"], rows: [["Small",2],["Medium",2],["Large",2]] } }
      ],
      patternRecognition: [
        "'histogram / count per band / bucketed distribution' → GROUP BY a CASE expression."
      ],
      interviewRecall: [
        "You can GROUP BY a CASE expression; repeat it (T-SQL can't group by a SELECT alias).",
        "Order the buckets by a numeric sort key like MIN(Amount) for a natural sequence."
      ],
      commonMistakes: [
        "Grouping by the raw amount and getting one group per value.",
        "Mismatching the SELECT CASE and the GROUP BY CASE, or fumbling the boundary values."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-longest-login-streak",
      number: "DL 2425",
      platform: "DataLemur",
      title: "Longest Daily Login Streak per User",
      difficulty: "Hard",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Window Functions"],
      domains: ["Product Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Gaps and islands", sqlConcept: "ROW_NUMBER date anchor + GROUP BY", technique: "Consecutive-run counting" },
      descriptionBrief:
        "Given a **Logins** table with one row per user per day they logged in, return each user's " +
        "**longest streak of consecutive days**, ordered by user id.",
      schema: [
        { name: "Logins", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "UserId", type: "INT" },
          { name: "LoginDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Logins','U') IS NOT NULL DROP TABLE dbo.Logins;\n" +
        "CREATE TABLE dbo.Logins (Id INT PRIMARY KEY, UserId INT, LoginDate DATE);\n" +
        "INSERT INTO dbo.Logins VALUES\n" +
        "  (1,1,'2024-01-01'),(2,1,'2024-01-02'),(3,1,'2024-01-03'),\n" +
        "  (4,1,'2024-01-05'),(5,1,'2024-01-06'),\n" +
        "  (6,2,'2024-01-10'),(7,2,'2024-01-12');",
      sampleData: [
        { table: "Logins", columns: ["Id","UserId","LoginDate"],
          rows: [[1,1,"2024-01-01"],[2,1,"2024-01-02"],[3,1,"2024-01-03"],[4,1,"2024-01-05"],[5,1,"2024-01-06"],[6,2,"2024-01-10"],[7,2,"2024-01-12"]] }
      ],
      expectedOutput: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,1]] },
      approaches: [
        {
          name: "Date-minus-ROW_NUMBER islands (recommended)",
          perfNote: "One window pass numbers each user's days; subtracting the row number from the date anchors each consecutive run to a constant, so a single GROUP BY sizes the runs.",
          dialectNote: "`DATEADD(day, -rn, LoginDate)` is T-SQL; the gaps-and-islands idea is dialect-agnostic.",
          logic:
            "**What it asks.** The length of each user's longest unbroken run of consecutive login days.\n\n" +
            "**Why the naive idea fails.** A plain `COUNT(*)` or a self-join on `date = date + 1` can't measure run *length* across arbitrary gaps; you need to identify which rows belong to the same consecutive run first.\n\n" +
            "**Key Idea.** For consecutive dates, `LoginDate` and its per-user row number both increase by one, so `LoginDate - ROW_NUMBER()` stays constant within a run and changes at every gap — that constant is the run's identifier (an 'island').\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Number each user's days with `ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate)`.\n" +
            "2. Compute the island key `DATEADD(day, -rn, LoginDate)`.\n" +
            "3. `GROUP BY UserId, island` and `COUNT(*)` — the length of each run.\n" +
            "4. Take `MAX(runlength)` per user with an outer `GROUP BY UserId`.\n\n" +
            "**Why it works.** Within a consecutive streak both the date and the counter step by one, so their difference is invariant; a gap breaks the pattern and starts a new island key.\n\n" +
            "**Common Gotchas.** Assumes one row per user per day — deduplicate first if a user can log in twice a day, or the row numbers desynchronize from the dates.\n\n" +
            "**Performance.** One partitioned window sort then two grouped aggregates, O(n log n).\n\n" +
            "**Interview mindset.** 'longest consecutive streak / run of days' → date minus ROW_NUMBER to form islands, then group and count.",
          tsql:
            "WITH Numbered AS (\n" +
            "    SELECT UserId, LoginDate,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate) AS rn\n" +
            "    FROM dbo.Logins\n" +
            "), Islands AS (\n" +
            "    SELECT UserId,\n" +
            "           DATEADD(day, -rn, LoginDate) AS grp   -- constant within a run\n" +
            "    FROM Numbered\n" +
            "), Runs AS (\n" +
            "    SELECT UserId, grp, COUNT(*) AS RunLength\n" +
            "    FROM Islands\n" +
            "    GROUP BY UserId, grp\n" +
            ")\n" +
            "SELECT UserId, MAX(RunLength) AS LongestStreak\n" +
            "FROM Runs\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;",
          clean:
            "WITH Islands AS (\n" +
            "    SELECT UserId,\n" +
            "           DATEADD(day, -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate), LoginDate) AS grp\n" +
            "    FROM dbo.Logins\n" +
            ")\n" +
            "SELECT UserId, MAX(cnt) AS LongestStreak\n" +
            "FROM (SELECT UserId, grp, COUNT(*) AS cnt FROM Islands GROUP BY UserId, grp) r\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;"
        }
      ],
      walkthrough: [
        { step: "Number days and form island keys", note: "User 1: Jan 1-3 map to the same anchor (streak of 3); Jan 5-6 to another (streak of 2). User 2's two days are non-consecutive → two islands of 1.",
          table: { columns: ["UserId","LoginDate","rn","grp"],
            rows: [[1,"2024-01-01",1,"2023-12-31"],[1,"2024-01-02",2,"2023-12-31"],[1,"2024-01-03",3,"2023-12-31"],[1,"2024-01-05",4,"2024-01-01"],[1,"2024-01-06",5,"2024-01-01"],[2,"2024-01-10",1,"2024-01-09"],[2,"2024-01-12",2,"2024-01-10"]] } },
        { step: "Count per island, take the max per user", note: "User 1 runs: 3 and 2 → 3. User 2 runs: 1 and 1 → 1.",
          table: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,1]] } }
      ],
      patternRecognition: [
        "'longest consecutive streak / run of dates' → gaps-and-islands: date minus ROW_NUMBER, then group and count.",
        "The date-minus-rownumber anchor is constant only across truly consecutive rows."
      ],
      interviewRecall: [
        "Consecutive dates and a dense row number both step by 1, so their difference labels each island.",
        "One row per day per user is required; deduplicate otherwise."
      ],
      commonMistakes: [
        "Trying to count streaks with a single COUNT(*) and no island key.",
        "Feeding duplicate per-day rows in, which breaks the date/row-number alignment."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg3-distinct-visitors-per-page",
      number: "SS 10440",
      platform: "StrataScratch",
      title: "Distinct Visitors per Page",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Web Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Distinct vs total per group", sqlConcept: "COUNT(DISTINCT) + COUNT(*)", technique: "Unique and raw counts together" },
      descriptionBrief:
        "Given a **PageViews** log, return per page the number of **unique visitors** and the **total " +
        "views**, ordered by unique visitors descending then page url.",
      schema: [
        { name: "PageViews", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "PageUrl", type: "VARCHAR(50)" },
          { name: "VisitorId", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.PageViews','U') IS NOT NULL DROP TABLE dbo.PageViews;\n" +
        "CREATE TABLE dbo.PageViews (Id INT PRIMARY KEY, PageUrl VARCHAR(50), VisitorId INT);\n" +
        "INSERT INTO dbo.PageViews VALUES\n" +
        "  (1,'/home',1),(2,'/home',1),(3,'/home',2),\n" +
        "  (4,'/pricing',3),(5,'/pricing',3);",
      sampleData: [
        { table: "PageViews", columns: ["Id","PageUrl","VisitorId"],
          rows: [[1,"/home",1],[2,"/home",1],[3,"/home",2],[4,"/pricing",3],[5,"/pricing",3]] }
      ],
      expectedOutput: { columns: ["PageUrl","UniqueVisitors","TotalViews"],
        rows: [["/home",2,3],["/pricing",1,2]] },
      approaches: [
        {
          name: "COUNT(DISTINCT) beside COUNT(*) (recommended)",
          perfNote: "Both the unique and raw counts come from one grouped scan; COUNT(DISTINCT) deduplicates visitors inside each page group.",
          dialectNote: "",
          logic:
            "**What it asks.** For each page, how many distinct people viewed it and how many views it got overall.\n\n" +
            "**Why the naive idea fails.** `COUNT(*)` alone reports raw views and overcounts visitors who returned; `COUNT(DISTINCT)` alone loses the raw view volume. Both numbers are wanted side by side.\n\n" +
            "**Key Idea.** In one `GROUP BY PageUrl`, use `COUNT(DISTINCT VisitorId)` for unique visitors and `COUNT(*)` for total views.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY PageUrl`.\n" +
            "2. Project `COUNT(DISTINCT VisitorId)` and `COUNT(*)`.\n" +
            "3. Order by unique visitors descending, then page url.\n\n" +
            "**Why it works.** DISTINCT collapses repeated visitor ids within a page before counting, while COUNT(*) still tallies every row.\n\n" +
            "**Common Gotchas.** COUNT(DISTINCT) ignores NULL visitor ids. Unique visitors can never exceed total views.\n\n" +
            "**Performance.** A distinct-then-count plus a plain count per group, O(n).\n\n" +
            "**Interview mindset.** 'unique X and total events per group' → COUNT(DISTINCT X) beside COUNT(*).",
          tsql:
            "SELECT PageUrl,\n" +
            "       COUNT(DISTINCT VisitorId) AS UniqueVisitors,\n" +
            "       COUNT(*)                  AS TotalViews\n" +
            "FROM dbo.PageViews\n" +
            "GROUP BY PageUrl\n" +
            "ORDER BY UniqueVisitors DESC, PageUrl;",
          clean:
            "SELECT PageUrl, COUNT(DISTINCT VisitorId) AS UniqueVisitors, COUNT(*) AS TotalViews\n" +
            "FROM dbo.PageViews\n" +
            "GROUP BY PageUrl\n" +
            "ORDER BY UniqueVisitors DESC, PageUrl;"
        }
      ],
      walkthrough: [
        { step: "Unique and total counts per page", note: "/home: visitors 1 (twice) and 2 → 2 unique, 3 views. /pricing: visitor 3 twice → 1 unique, 2 views.",
          table: { columns: ["PageUrl","UniqueVisitors","TotalViews"], rows: [["/home",2,3],["/pricing",1,2]] } }
      ],
      patternRecognition: [
        "'unique visitors and total views per page' → COUNT(DISTINCT visitor) and COUNT(*) in one GROUP BY."
      ],
      interviewRecall: [
        "COUNT(DISTINCT col) counts unique non-NULL values; COUNT(*) counts rows.",
        "Unique count is always <= total count."
      ],
      commonMistakes: [
        "Reporting COUNT(*) as unique visitors and overcounting returners.",
        "Assuming COUNT(DISTINCT) includes NULL visitor ids."
      ]
    }

  ]);
})();
