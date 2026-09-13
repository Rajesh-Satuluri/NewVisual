/*
 * data/sql/timeseries_cohort.js — Time-Series & Cohort Analytics (new category).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * The product-analytics core: DAU, retention, cohort grids, MoM/YoY growth,
 * rolling active users, and date-spine gap filling.
 */
(function () {
  window.SQLLAB.register("Time-Series & Cohort Analytics", [

    {
      id: "ts-daily-active-users",
      number: "SL 4501",
      platform: "StudyLab",
      title: "Daily Active Users (DAU)",
      difficulty: "Easy",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Aggregation"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Distinct active per period", sqlConcept: "COUNT(DISTINCT …) GROUP BY day", technique: "Active-user metric" },
      descriptionBrief:
        "Given **Activity(UserId, ActivityDate)** with possibly multiple events per user per day, return the " +
        "**number of distinct active users** for each day.",
      schema: [
        { name: "Activity", columns: [
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Activity','U') IS NOT NULL DROP TABLE dbo.Activity;\n" +
        "CREATE TABLE dbo.Activity (UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.Activity VALUES\n" +
        "  (1,'2024-01-01'),(2,'2024-01-01'),(1,'2024-01-01'),(1,'2024-01-02');",
      sampleData: [
        { table: "Activity", columns: ["UserId","ActivityDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"],[1,"2024-01-01"],[1,"2024-01-02"]] }
      ],
      expectedOutput: { columns: ["ActivityDate","DAU"], rows: [["2024-01-01",2],["2024-01-02",1]] },
      approaches: [
        {
          name: "COUNT(DISTINCT UserId) grouped by day (recommended)",
          perfNote: "One grouped scan; DISTINCT collapses repeat events per user per day.",
          dialectNote: "COUNT(DISTINCT …) is ANSI-standard. For very high volumes, approximate counters like APPROX_COUNT_DISTINCT (SQL Server 2019+) trade exactness for speed.",
          logic:
            "**What it asks.** How many unique users were active on each calendar day.\n\n" +
            "**Why the naive idea fails.** `COUNT(*)` counts events, not users, so a user with three events on a day inflates the metric threefold.\n\n" +
            "**Key Idea.** `COUNT(DISTINCT UserId)` per day counts each user once regardless of how many events they logged.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. GROUP BY ActivityDate.\n" +
            "2. `COUNT(DISTINCT UserId)` as DAU.\n" +
            "3. Order by date.\n\n" +
            "**Why it works.** DISTINCT deduplicates users within each day's group before counting.\n\n" +
            "**Common Gotchas.** Using COUNT(*) and overstating DAU; forgetting that a user active on two days counts on both.\n\n" +
            "**Performance.** Single aggregation — O(n).\n\n" +
            "**Interview mindset.** 'active users / unique users per period' → COUNT(DISTINCT user) GROUP BY period.",
          tsql:
            "SELECT ActivityDate,\n" +
            "       COUNT(DISTINCT UserId) AS DAU\n" +
            "FROM dbo.Activity\n" +
            "GROUP BY ActivityDate\n" +
            "ORDER BY ActivityDate;",
          clean:
            "SELECT ActivityDate, COUNT(DISTINCT UserId) AS DAU\n" +
            "FROM dbo.Activity GROUP BY ActivityDate ORDER BY ActivityDate;"
        }
      ],
      walkthrough: [
        { step: "Group by day, distinct users", note: "01-01: {1,2}=2 (user 1's repeat ignored); 01-02: {1}=1.",
          table: { columns: ["ActivityDate","DAU"], rows: [["2024-01-01",2],["2024-01-02",1]] } }
      ],
      patternRecognition: [
        "'active users / unique visitors per day/week/month' → COUNT(DISTINCT user) GROUP BY period.",
        "Repeat events per user → DISTINCT, never COUNT(*)."
      ],
      interviewRecall: [
        "DAU/WAU/MAU are all COUNT(DISTINCT user) at different grains.",
        "Truncate the timestamp to the period (day/week/month) before grouping."
      ],
      commonMistakes: [
        "COUNT(*) counting events instead of users.",
        "Grouping on a full timestamp instead of the date."
      ]
    },

    {
      id: "ts-day1-retention",
      number: "SL 4502",
      platform: "StudyLab",
      title: "Day-1 Retention Rate",
      difficulty: "Medium",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Joins"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Next-day return", sqlConcept: "self-join on date + 1", technique: "Retention metric" },
      descriptionBrief:
        "Given **Signups(UserId, SignupDate)** and **Retention(UserId, ActivityDate)**, compute per signup date " +
        "how many users returned **exactly one day later** and the day-1 retention rate as a percentage.",
      schema: [
        { name: "Signups", columns: [
          { name: "UserId", type: "INT" },
          { name: "SignupDate", type: "DATE" } ] },
        { name: "Retention", columns: [
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Retention','U') IS NOT NULL DROP TABLE dbo.Retention;\n" +
        "IF OBJECT_ID('dbo.Signups','U') IS NOT NULL DROP TABLE dbo.Signups;\n" +
        "CREATE TABLE dbo.Signups (UserId INT, SignupDate DATE);\n" +
        "CREATE TABLE dbo.Retention (UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.Signups VALUES (1,'2024-01-01'),(2,'2024-01-01'),(3,'2024-01-01');\n" +
        "INSERT INTO dbo.Retention VALUES (1,'2024-01-02'),(2,'2024-01-03');",
      sampleData: [
        { table: "Signups", columns: ["UserId","SignupDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"],[3,"2024-01-01"]] },
        { table: "Retention", columns: ["UserId","ActivityDate"],
          rows: [[1,"2024-01-02"],[2,"2024-01-03"]] }
      ],
      expectedOutput: { columns: ["SignupDate","SignedUp","RetainedDay1","RetentionRate"],
        rows: [["2024-01-01",3,1,33.33]] },
      approaches: [
        {
          name: "LEFT JOIN on ActivityDate = SignupDate + 1 (recommended)",
          perfNote: "One join keyed on user and the shifted date; COUNT(DISTINCT) over the matched side.",
          dialectNote: "DATEADD(day,1,SignupDate) in SQL Server; Postgres uses SignupDate + INTERVAL '1 day'. The shifted-date join is portable.",
          logic:
            "**What it asks.** Of the users who signed up on a date, what share came back the very next day.\n\n" +
            "**Why the naive idea fails.** Counting anyone active after signup measures overall return, not day-1 specifically; an inner join would drop cohorts with zero returners and hide a 0% rate.\n\n" +
            "**Key Idea.** Join each signup to retention on the same user and `ActivityDate = SignupDate + 1 day`; count the matches.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. LEFT JOIN Retention on UserId and the next-day condition.\n" +
            "2. Per SignupDate, `COUNT(*)` signups and `COUNT(DISTINCT matched user)` retained.\n" +
            "3. Rate = 100.0 × retained ÷ NULLIF(signups, 0).\n\n" +
            "**Why it works.** The date-shift condition isolates precisely the day-after activity; LEFT JOIN preserves cohorts that had no returners.\n\n" +
            "**Common Gotchas.** Inner join hiding 0% cohorts; counting 'active anytime after' instead of exactly day+1; integer division.\n\n" +
            "**Performance.** O(n) hash join.\n\n" +
            "**Interview mindset.** 'day-N retention' → join signup to activity on date + N, then rate.",
          tsql:
            "SELECT s.SignupDate,\n" +
            "       COUNT(*) AS SignedUp,\n" +
            "       COUNT(DISTINCT r.UserId) AS RetainedDay1,\n" +
            "       ROUND(100.0 * COUNT(DISTINCT r.UserId) / NULLIF(COUNT(*), 0), 2) AS RetentionRate\n" +
            "FROM dbo.Signups s\n" +
            "LEFT JOIN dbo.Retention r\n" +
            "       ON r.UserId = s.UserId\n" +
            "      AND r.ActivityDate = DATEADD(day, 1, s.SignupDate)\n" +
            "GROUP BY s.SignupDate\n" +
            "ORDER BY s.SignupDate;",
          clean:
            "SELECT s.SignupDate,\n" +
            "       COUNT(*) AS SignedUp,\n" +
            "       COUNT(DISTINCT r.UserId) AS RetainedDay1,\n" +
            "       ROUND(100.0 * COUNT(DISTINCT r.UserId) / NULLIF(COUNT(*), 0), 2) AS RetentionRate\n" +
            "FROM dbo.Signups s\n" +
            "LEFT JOIN dbo.Retention r ON r.UserId = s.UserId AND r.ActivityDate = DATEADD(day, 1, s.SignupDate)\n" +
            "GROUP BY s.SignupDate ORDER BY s.SignupDate;"
        }
      ],
      walkthrough: [
        { step: "Match next-day activity", note: "User1 active 01-02 = signup+1 (retained); User2 active 01-03 (not day1); User3 never." },
        { step: "Aggregate the cohort", note: "3 signed up, 1 retained → 100*1/3 = 33.33%.",
          table: { columns: ["SignupDate","SignedUp","RetainedDay1","RetentionRate"], rows: [["2024-01-01",3,1,33.33]] } }
      ],
      patternRecognition: [
        "'day-1 / day-7 / day-N retention' → join signup cohort to activity on SignupDate + N.",
        "Cohort rates that must include 0% groups → LEFT JOIN, not INNER."
      ],
      interviewRecall: [
        "Day-N retention keys on activity exactly N days after signup.",
        "LEFT JOIN keeps cohorts with no returners so their rate shows as 0, not vanished."
      ],
      commonMistakes: [
        "Measuring 'active anytime later' instead of the specific day.",
        "Inner join dropping zero-retention cohorts."
      ]
    },

    {
      id: "ts-day7-retention",
      number: "SL 4503",
      platform: "StudyLab",
      title: "Day-7 Retention Rate",
      difficulty: "Medium",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Joins"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Nth-day return", sqlConcept: "self-join on date + 7", technique: "Retention metric" },
      descriptionBrief:
        "Given **Signups7(UserId, SignupDate)** and **Retention7(UserId, ActivityDate)**, compute per signup date " +
        "the day-7 retention: how many users were active exactly seven days after signing up, and the rate.",
      schema: [
        { name: "Signups7", columns: [
          { name: "UserId", type: "INT" },
          { name: "SignupDate", type: "DATE" } ] },
        { name: "Retention7", columns: [
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Retention7','U') IS NOT NULL DROP TABLE dbo.Retention7;\n" +
        "IF OBJECT_ID('dbo.Signups7','U') IS NOT NULL DROP TABLE dbo.Signups7;\n" +
        "CREATE TABLE dbo.Signups7 (UserId INT, SignupDate DATE);\n" +
        "CREATE TABLE dbo.Retention7 (UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.Signups7 VALUES (1,'2024-01-01'),(2,'2024-01-01');\n" +
        "INSERT INTO dbo.Retention7 VALUES (1,'2024-01-08'),(2,'2024-01-05');",
      sampleData: [
        { table: "Signups7", columns: ["UserId","SignupDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"]] },
        { table: "Retention7", columns: ["UserId","ActivityDate"],
          rows: [[1,"2024-01-08"],[2,"2024-01-05"]] }
      ],
      expectedOutput: { columns: ["SignupDate","SignedUp","RetainedDay7","RetentionRate"],
        rows: [["2024-01-01",2,1,50.00]] },
      approaches: [
        {
          name: "LEFT JOIN on ActivityDate = SignupDate + 7 (recommended)",
          perfNote: "Identical shape to day-1 retention with a 7-day shift; one hash join.",
          dialectNote: "Change the offset in DATEADD(day, 7, …) to parameterise any day-N retention.",
          logic:
            "**What it asks.** Share of a signup cohort active exactly on day 7.\n\n" +
            "**Why the naive idea fails.** 'Active within a week' (a range) is week-1 retention, a different, looser metric; using a range here overcounts.\n\n" +
            "**Key Idea.** Join on `ActivityDate = SignupDate + 7 days` — an exact point, not a range.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. LEFT JOIN Retention7 on UserId and the day-7 date.\n" +
            "2. Count signups and distinct retained users per cohort.\n" +
            "3. Rate = 100.0 × retained ÷ NULLIF(signups, 0).\n\n" +
            "**Why it works.** The exact date-shift isolates day-7 activity; only user 1 (active 01-08) qualifies.\n\n" +
            "**Common Gotchas.** Confusing day-7 (a point) with week-1 (a 7-day range); off-by-one in the offset.\n\n" +
            "**Performance.** O(n) hash join.\n\n" +
            "**Interview mindset.** State whether the metric is a point (day-N) or a window (week-N) before writing the join.",
          tsql:
            "SELECT s.SignupDate,\n" +
            "       COUNT(*) AS SignedUp,\n" +
            "       COUNT(DISTINCT r.UserId) AS RetainedDay7,\n" +
            "       ROUND(100.0 * COUNT(DISTINCT r.UserId) / NULLIF(COUNT(*), 0), 2) AS RetentionRate\n" +
            "FROM dbo.Signups7 s\n" +
            "LEFT JOIN dbo.Retention7 r\n" +
            "       ON r.UserId = s.UserId\n" +
            "      AND r.ActivityDate = DATEADD(day, 7, s.SignupDate)\n" +
            "GROUP BY s.SignupDate\n" +
            "ORDER BY s.SignupDate;",
          clean:
            "SELECT s.SignupDate,\n" +
            "       COUNT(*) AS SignedUp,\n" +
            "       COUNT(DISTINCT r.UserId) AS RetainedDay7,\n" +
            "       ROUND(100.0 * COUNT(DISTINCT r.UserId) / NULLIF(COUNT(*), 0), 2) AS RetentionRate\n" +
            "FROM dbo.Signups7 s\n" +
            "LEFT JOIN dbo.Retention7 r ON r.UserId = s.UserId AND r.ActivityDate = DATEADD(day, 7, s.SignupDate)\n" +
            "GROUP BY s.SignupDate ORDER BY s.SignupDate;"
        }
      ],
      walkthrough: [
        { step: "Match day-7 activity", note: "User1 active 01-08 = signup+7 (retained); User2 active 01-05 (day 4, not day 7)." },
        { step: "Aggregate", note: "2 signed up, 1 retained → 100*1/2 = 50.00%.",
          table: { columns: ["SignupDate","SignedUp","RetainedDay7","RetentionRate"], rows: [["2024-01-01",2,1,50.00]] } }
      ],
      patternRecognition: [
        "'day-N retention' → exact date-shift join on SignupDate + N.",
        "'week-N / within N days' → a range join, a different metric."
      ],
      interviewRecall: [
        "Day-N retention is a point measure; week-N is a range measure.",
        "Parameterise the offset in DATEADD to switch between day-1, day-7, day-30."
      ],
      commonMistakes: [
        "Using a 7-day range and reporting it as day-7.",
        "Off-by-one errors in the date offset."
      ]
    },

    {
      id: "ts-cohort-retention-grid",
      number: "SL 4504",
      platform: "StudyLab",
      title: "Monthly Cohort Retention Grid",
      difficulty: "Hard",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Pivot / Conditional Agg"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Cohort matrix", sqlConcept: "DATEDIFF month + conditional pivot", technique: "Cohort analysis" },
      descriptionBrief:
        "Given **CohortSignups(UserId, SignupDate)** and **CohortActivity(UserId, ActivityDate)**, build a cohort " +
        "grid: for each signup-month cohort, the number of distinct active users in month 0 (signup month) and " +
        "month 1 (the following month).",
      schema: [
        { name: "CohortSignups", columns: [
          { name: "UserId", type: "INT" },
          { name: "SignupDate", type: "DATE", note: "first of the signup month" } ] },
        { name: "CohortActivity", columns: [
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE", note: "first of the active month" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.CohortActivity','U') IS NOT NULL DROP TABLE dbo.CohortActivity;\n" +
        "IF OBJECT_ID('dbo.CohortSignups','U') IS NOT NULL DROP TABLE dbo.CohortSignups;\n" +
        "CREATE TABLE dbo.CohortSignups (UserId INT, SignupDate DATE);\n" +
        "CREATE TABLE dbo.CohortActivity (UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.CohortSignups VALUES (1,'2024-01-01'),(2,'2024-01-01'),(3,'2024-01-01'),(4,'2024-02-01'),(5,'2024-02-01');\n" +
        "INSERT INTO dbo.CohortActivity VALUES\n" +
        "  (1,'2024-01-01'),(2,'2024-01-01'),(3,'2024-01-01'),\n" +
        "  (1,'2024-02-01'),(2,'2024-02-01'),\n" +
        "  (4,'2024-02-01'),(5,'2024-02-01'),\n" +
        "  (4,'2024-03-01');",
      sampleData: [
        { table: "CohortSignups", columns: ["UserId","SignupDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"],[3,"2024-01-01"],[4,"2024-02-01"],[5,"2024-02-01"]] },
        { table: "CohortActivity", columns: ["UserId","ActivityDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"],[3,"2024-01-01"],
                 [1,"2024-02-01"],[2,"2024-02-01"],
                 [4,"2024-02-01"],[5,"2024-02-01"],[4,"2024-03-01"]] }
      ],
      expectedOutput: { columns: ["CohortMonth","Month0","Month1"],
        rows: [["2024-01",3,2],["2024-02",2,1]] },
      approaches: [
        {
          name: "DATEDIFF months since signup + conditional pivot (recommended)",
          perfNote: "One join, one DATEDIFF, one conditional aggregation — the standard cohort build.",
          dialectNote: "DATEDIFF(month, …) and FORMAT(…, 'yyyy-MM') are SQL Server. Postgres: (date_part('year',age)*12 + date_part('month',age)) and to_char(SignupDate,'YYYY-MM').",
          logic:
            "**What it asks.** A cohort matrix: rows are signup months, columns are months-since-signup, cells are active user counts.\n\n" +
            "**Why the naive idea fails.** Reporting raw activity by calendar month loses the cohort dimension — you can't see how each signup group decays over its own lifetime.\n\n" +
            "**Key Idea.** Join activity to each user's signup, compute `DATEDIFF(month, SignupDate, ActivityDate)` as the period index, then pivot period 0 and 1 into columns with COUNT(DISTINCT CASE …).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. JOIN CohortActivity to CohortSignups on UserId.\n" +
            "2. `monthsSince = DATEDIFF(month, SignupDate, ActivityDate)`.\n" +
            "3. Cohort label = `FORMAT(SignupDate, 'yyyy-MM')`.\n" +
            "4. `COUNT(DISTINCT CASE WHEN monthsSince = 0 THEN UserId END)` for Month0, `= 1` for Month1.\n" +
            "5. GROUP BY the cohort month.\n\n" +
            "**Why it works.** Anchoring the period to each user's own signup makes every cohort comparable on the same relative timeline.\n\n" +
            "**Common Gotchas.** Grouping by calendar month instead of relative month; COUNT(*) instead of COUNT(DISTINCT user) when users have multiple events per month.\n\n" +
            "**Performance.** O(n) join + aggregation.\n\n" +
            "**Interview mindset.** 'cohort retention grid' → relative period via DATEDIFF, then conditional-aggregation pivot.",
          tsql:
            "SELECT FORMAT(s.SignupDate, 'yyyy-MM') AS CohortMonth,\n" +
            "       COUNT(DISTINCT CASE WHEN DATEDIFF(month, s.SignupDate, a.ActivityDate) = 0 THEN a.UserId END) AS Month0,\n" +
            "       COUNT(DISTINCT CASE WHEN DATEDIFF(month, s.SignupDate, a.ActivityDate) = 1 THEN a.UserId END) AS Month1\n" +
            "FROM dbo.CohortSignups s\n" +
            "JOIN dbo.CohortActivity a ON a.UserId = s.UserId\n" +
            "GROUP BY FORMAT(s.SignupDate, 'yyyy-MM')\n" +
            "ORDER BY CohortMonth;",
          clean:
            "SELECT FORMAT(s.SignupDate, 'yyyy-MM') AS CohortMonth,\n" +
            "       COUNT(DISTINCT CASE WHEN DATEDIFF(month, s.SignupDate, a.ActivityDate) = 0 THEN a.UserId END) AS Month0,\n" +
            "       COUNT(DISTINCT CASE WHEN DATEDIFF(month, s.SignupDate, a.ActivityDate) = 1 THEN a.UserId END) AS Month1\n" +
            "FROM dbo.CohortSignups s\n" +
            "JOIN dbo.CohortActivity a ON a.UserId = s.UserId\n" +
            "GROUP BY FORMAT(s.SignupDate, 'yyyy-MM') ORDER BY CohortMonth;"
        }
      ],
      walkthrough: [
        { step: "Jan cohort (users 1,2,3)", note: "Month0 active {1,2,3}=3; Month1 (Feb) active {1,2}=2." },
        { step: "Feb cohort (users 4,5)", note: "Month0 {4,5}=2; Month1 (Mar) {4}=1.",
          table: { columns: ["CohortMonth","Month0","Month1"], rows: [["2024-01",3,2],["2024-02",2,1]] } }
      ],
      patternRecognition: [
        "'cohort retention grid / triangle' → relative period via DATEDIFF from signup, then pivot.",
        "Comparing signup groups over their own lifetime → cohort analysis, not calendar aggregation."
      ],
      interviewRecall: [
        "The cohort axis is signup period; the other axis is periods-since-signup (DATEDIFF).",
        "Pivot the relative periods into columns with COUNT(DISTINCT CASE …)."
      ],
      commonMistakes: [
        "Aggregating by calendar month and losing the cohort lifetime.",
        "COUNT(*) inflating counts when users act multiple times in a period."
      ]
    },

    {
      id: "ts-mom-growth",
      number: "SL 4505",
      platform: "StudyLab",
      title: "Month-over-Month Revenue Growth",
      difficulty: "Medium",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Window Functions"],
      domains: ["Finance"],
      link: "",
      meta: { pattern: "Period-over-period change", sqlConcept: "LAG() growth %", technique: "Time-series delta" },
      descriptionBrief:
        "Given **MonthlyRevenue(Mon, Revenue)** (one row per month), return each month's revenue and its " +
        "**month-over-month growth** as a percentage (NULL for the first month).",
      schema: [
        { name: "MonthlyRevenue", columns: [
          { name: "Mon", type: "DATE", note: "first of the month" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.MonthlyRevenue','U') IS NOT NULL DROP TABLE dbo.MonthlyRevenue;\n" +
        "CREATE TABLE dbo.MonthlyRevenue (Mon DATE, Revenue INT);\n" +
        "INSERT INTO dbo.MonthlyRevenue VALUES ('2024-01-01',1000),('2024-02-01',1200),('2024-03-01',900);",
      sampleData: [
        { table: "MonthlyRevenue", columns: ["Mon","Revenue"],
          rows: [["2024-01-01",1000],["2024-02-01",1200],["2024-03-01",900]] }
      ],
      expectedOutput: { columns: ["Mon","Revenue","MoMGrowthPct"],
        rows: [["2024-01-01",1000,null],["2024-02-01",1200,20.00],["2024-03-01",900,-25.00]] },
      approaches: [
        {
          name: "LAG() for the prior month, then percent change (recommended)",
          perfNote: "One ordered pass; LAG reads the previous row without a self-join.",
          dialectNote: "LAG() OVER (ORDER BY …) is ANSI-standard in SQL Server, Postgres, Oracle, and MySQL 8+.",
          logic:
            "**What it asks.** The percentage change in revenue from the previous month.\n\n" +
            "**Why the naive idea fails.** A self-join matching each month to the prior month is verbose and O(n²)-ish; hard-coding month arithmetic breaks across year boundaries.\n\n" +
            "**Key Idea.** `LAG(Revenue) OVER (ORDER BY Mon)` fetches last month's revenue; growth = `(cur - prev) / prev × 100`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `prev = LAG(Revenue) OVER (ORDER BY Mon)`.\n" +
            "2. Growth = `100.0 × (Revenue - prev) / NULLIF(prev, 0)`.\n" +
            "3. First month has no prev → NULL.\n\n" +
            "**Why it works.** LAG aligns each row with its predecessor in month order; NULLIF guards a zero base.\n\n" +
            "**Common Gotchas.** Integer division; dividing by zero on a zero-revenue prior month; missing months silently making adjacent rows non-consecutive (fill gaps first if needed).\n\n" +
            "**Performance.** Single sort — O(n log n).\n\n" +
            "**Interview mindset.** 'MoM / WoW / period-over-period change' → LAG then percent formula.",
          tsql:
            "SELECT Mon, Revenue,\n" +
            "       ROUND(100.0 * (Revenue - LAG(Revenue) OVER (ORDER BY Mon))\n" +
            "             / NULLIF(LAG(Revenue) OVER (ORDER BY Mon), 0), 2) AS MoMGrowthPct\n" +
            "FROM dbo.MonthlyRevenue\n" +
            "ORDER BY Mon;",
          clean:
            "SELECT Mon, Revenue,\n" +
            "       ROUND(100.0 * (Revenue - LAG(Revenue) OVER (ORDER BY Mon))\n" +
            "             / NULLIF(LAG(Revenue) OVER (ORDER BY Mon), 0), 2) AS MoMGrowthPct\n" +
            "FROM dbo.MonthlyRevenue ORDER BY Mon;"
        }
      ],
      walkthrough: [
        { step: "LAG previous month", note: "Jan: no prev → NULL. Feb: prev 1000. Mar: prev 1200." },
        { step: "Percent change", note: "Feb (1200-1000)/1000=20.00; Mar (900-1200)/1200=-25.00.",
          table: { columns: ["Mon","Revenue","MoMGrowthPct"], rows: [["2024-01-01",1000,null],["2024-02-01",1200,20.00],["2024-03-01",900,-25.00]] } }
      ],
      patternRecognition: [
        "'month-over-month / week-over-week / delta from last period' → LAG then percent change.",
        "First period NULL growth → expected, LAG has no predecessor."
      ],
      interviewRecall: [
        "Growth % = 100 * (cur - prev) / prev, with NULLIF on prev.",
        "Fill missing periods before computing MoM or the deltas skip gaps."
      ],
      commonMistakes: [
        "Integer division flattening growth to 0.",
        "Ignoring gaps so 'previous row' isn't the previous month."
      ]
    },

    {
      id: "ts-yoy-growth",
      number: "SL 4506",
      platform: "StudyLab",
      title: "Year-over-Year Growth by Month",
      difficulty: "Medium",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Joins"],
      domains: ["Finance"],
      link: "",
      meta: { pattern: "Same-month-prior-year", sqlConcept: "self-join on year - 1", technique: "Time-series delta" },
      descriptionBrief:
        "Given **MonthlyRev2(Mon, Revenue)** spanning two years, return each month's revenue and its " +
        "**year-over-year growth** versus the same month one year earlier (NULL when no prior-year value exists).",
      schema: [
        { name: "MonthlyRev2", columns: [
          { name: "Mon", type: "DATE", note: "first of the month" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.MonthlyRev2','U') IS NOT NULL DROP TABLE dbo.MonthlyRev2;\n" +
        "CREATE TABLE dbo.MonthlyRev2 (Mon DATE, Revenue INT);\n" +
        "INSERT INTO dbo.MonthlyRev2 VALUES\n" +
        "  ('2023-01-01',100),('2023-02-01',200),('2024-01-01',150),('2024-02-01',250);",
      sampleData: [
        { table: "MonthlyRev2", columns: ["Mon","Revenue"],
          rows: [["2023-01-01",100],["2023-02-01",200],["2024-01-01",150],["2024-02-01",250]] }
      ],
      expectedOutput: { columns: ["Mon","Revenue","YoYGrowthPct"],
        rows: [["2023-01-01",100,null],["2023-02-01",200,null],["2024-01-01",150,50.00],["2024-02-01",250,25.00]] },
      approaches: [
        {
          name: "Self-join on same month, prior year (recommended)",
          perfNote: "One equi-join on month and year-1; robust to missing intermediate months (unlike LAG by fixed offset).",
          dialectNote: "MONTH()/YEAR() in SQL Server; Postgres uses EXTRACT(MONTH/YEAR FROM Mon). Joining on year-1 is portable and clearer than LAG(…, 12) when months can be missing.",
          logic:
            "**What it asks.** Each month compared to the same calendar month a year earlier.\n\n" +
            "**Why the naive idea fails.** `LAG(Revenue, 12)` assumes exactly 12 consecutive monthly rows with no gaps; a single missing month misaligns every later comparison.\n\n" +
            "**Key Idea.** Self-join current to prior year on the same month number and `YEAR = YEAR - 1`, then compute the percent change.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. LEFT JOIN the table to itself: `cur.MONTH = prev.MONTH AND cur.YEAR = prev.YEAR + 1`.\n" +
            "2. Growth = `100.0 × (cur.Revenue - prev.Revenue) / NULLIF(prev.Revenue, 0)`.\n" +
            "3. Rows with no prior-year match → NULL.\n\n" +
            "**Why it works.** Matching on month-and-year-minus-one is gap-proof: it finds the true same-month-last-year value regardless of missing rows.\n\n" +
            "**Common Gotchas.** Using LAG by position and breaking on gaps; integer division; forgetting NULL for the earliest year.\n\n" +
            "**Performance.** O(n) hash join.\n\n" +
            "**Interview mindset.** 'YoY / same period last year' → self-join on the calendar key with year-1, not a positional LAG.",
          tsql:
            "SELECT cur.Mon, cur.Revenue,\n" +
            "       ROUND(100.0 * (cur.Revenue - prev.Revenue)\n" +
            "             / NULLIF(prev.Revenue, 0), 2) AS YoYGrowthPct\n" +
            "FROM dbo.MonthlyRev2 cur\n" +
            "LEFT JOIN dbo.MonthlyRev2 prev\n" +
            "       ON MONTH(prev.Mon) = MONTH(cur.Mon)\n" +
            "      AND YEAR(prev.Mon)  = YEAR(cur.Mon) - 1\n" +
            "ORDER BY cur.Mon;",
          clean:
            "SELECT cur.Mon, cur.Revenue,\n" +
            "       ROUND(100.0 * (cur.Revenue - prev.Revenue) / NULLIF(prev.Revenue, 0), 2) AS YoYGrowthPct\n" +
            "FROM dbo.MonthlyRev2 cur\n" +
            "LEFT JOIN dbo.MonthlyRev2 prev ON MONTH(prev.Mon) = MONTH(cur.Mon) AND YEAR(prev.Mon) = YEAR(cur.Mon) - 1\n" +
            "ORDER BY cur.Mon;"
        }
      ],
      walkthrough: [
        { step: "Match same month, prior year", note: "2024-01 ↔ 2023-01 (100); 2024-02 ↔ 2023-02 (200); 2023 rows have no prior year." },
        { step: "Percent change", note: "Jan (150-100)/100=50.00; Feb (250-200)/200=25.00.",
          table: { columns: ["Mon","Revenue","YoYGrowthPct"],
            rows: [["2023-01-01",100,null],["2023-02-01",200,null],["2024-01-01",150,50.00],["2024-02-01",250,25.00]] } }
      ],
      patternRecognition: [
        "'year-over-year / same month last year' → self-join on month and year-1.",
        "Gaps in the series → calendar-key join beats positional LAG(…, 12)."
      ],
      interviewRecall: [
        "Join on the calendar key (month, year-1), not row position, for gap-safe YoY.",
        "Earliest year has no comparison → NULL."
      ],
      commonMistakes: [
        "LAG(…, 12) misaligning when a month is missing.",
        "Integer division and missing NULLIF on the base."
      ]
    },

    {
      id: "ts-rolling-7day-active",
      number: "SL 4507",
      platform: "StudyLab",
      title: "Rolling 7-Day Active Users",
      difficulty: "Hard",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Joins"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Sliding distinct count", sqlConcept: "range self-join + COUNT(DISTINCT)", technique: "Rolling window" },
      descriptionBrief:
        "Given **Activity3(UserId, ActivityDate)**, for every day that has activity, return the number of " +
        "**distinct users active in the trailing 7-day window** (that day and the six before it).",
      schema: [
        { name: "Activity3", columns: [
          { name: "UserId", type: "INT" },
          { name: "ActivityDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Activity3','U') IS NOT NULL DROP TABLE dbo.Activity3;\n" +
        "CREATE TABLE dbo.Activity3 (UserId INT, ActivityDate DATE);\n" +
        "INSERT INTO dbo.Activity3 VALUES (1,'2024-01-01'),(2,'2024-01-02'),(1,'2024-01-03');",
      sampleData: [
        { table: "Activity3", columns: ["UserId","ActivityDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-02"],[1,"2024-01-03"]] }
      ],
      expectedOutput: { columns: ["ActivityDate","RollingActive7"],
        rows: [["2024-01-01",1],["2024-01-02",2],["2024-01-03",2]] },
      approaches: [
        {
          name: "Range self-join with COUNT(DISTINCT) (recommended)",
          perfNote: "COUNT(DISTINCT …) cannot be a window function, so a range self-join over each anchor day is the standard approach.",
          dialectNote: "DATEADD/BETWEEN are portable in spirit. Some engines (Snowflake/BigQuery) offer approximate distinct in windows; ANSI SQL needs the range join for exact distinct counts.",
          logic:
            "**What it asks.** For each active day, unique users seen across a trailing 7-day window.\n\n" +
            "**Why the naive idea fails.** `COUNT(DISTINCT UserId) OVER (…)` is not allowed — DISTINCT is not permitted in a windowed aggregate — so a pure window function can't do this.\n\n" +
            "**Key Idea.** For each anchor day, join all activity within `[day - 6, day]` and `COUNT(DISTINCT UserId)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Take the distinct anchor days.\n" +
            "2. JOIN activity where `ActivityDate BETWEEN DATEADD(day,-6,anchor) AND anchor`.\n" +
            "3. GROUP BY anchor, `COUNT(DISTINCT UserId)`.\n\n" +
            "**Why it works.** The BETWEEN range gathers every event in the trailing window; DISTINCT deduplicates users who appear on multiple days within it.\n\n" +
            "**Common Gotchas.** Trying COUNT(DISTINCT) as a window function; off-by-one on the 7-day range (use -6 to include the current day for 7 days total).\n\n" +
            "**Performance.** O(n · w) for window width w; fine for daily grains, use pre-aggregation at scale.\n\n" +
            "**Interview mindset.** 'rolling distinct users / rolling uniques' → range self-join + COUNT(DISTINCT), not a window function.",
          tsql:
            "SELECT d.ActivityDate,\n" +
            "       COUNT(DISTINCT a.UserId) AS RollingActive7\n" +
            "FROM (SELECT DISTINCT ActivityDate FROM dbo.Activity3) d\n" +
            "JOIN dbo.Activity3 a\n" +
            "  ON a.ActivityDate BETWEEN DATEADD(day, -6, d.ActivityDate) AND d.ActivityDate\n" +
            "GROUP BY d.ActivityDate\n" +
            "ORDER BY d.ActivityDate;",
          clean:
            "SELECT d.ActivityDate, COUNT(DISTINCT a.UserId) AS RollingActive7\n" +
            "FROM (SELECT DISTINCT ActivityDate FROM dbo.Activity3) d\n" +
            "JOIN dbo.Activity3 a ON a.ActivityDate BETWEEN DATEADD(day, -6, d.ActivityDate) AND d.ActivityDate\n" +
            "GROUP BY d.ActivityDate ORDER BY d.ActivityDate;"
        }
      ],
      walkthrough: [
        { step: "Window per anchor day", note: "01-01: [12-26..01-01] users {1}=1; 01-02: [12-27..01-02] {1,2}=2; 01-03: [12-28..01-03] {1,2}=2." },
        { step: "Distinct count", note: "User 1 active on 01-01 and 01-03 counts once inside the 01-03 window.",
          table: { columns: ["ActivityDate","RollingActive7"], rows: [["2024-01-01",1],["2024-01-02",2],["2024-01-03",2]] } }
      ],
      patternRecognition: [
        "'rolling / trailing N-day unique users' → range self-join + COUNT(DISTINCT).",
        "COUNT(DISTINCT) needed over a window → range join, since window DISTINCT is disallowed."
      ],
      interviewRecall: [
        "COUNT(DISTINCT …) is not a valid window aggregate — use a range self-join.",
        "Trailing 7 days = BETWEEN day-6 AND day (inclusive of both ends)."
      ],
      commonMistakes: [
        "Attempting COUNT(DISTINCT UserId) OVER (…).",
        "Off-by-one giving an 8-day or 6-day window."
      ]
    },

    {
      id: "ts-date-spine-gapfill",
      number: "SL 4508",
      platform: "StudyLab",
      title: "Fill Missing Dates with a Date Spine",
      difficulty: "Hard",
      category: "Time-Series & Cohort Analytics",
      topics: ["Time-Series & Cohort Analytics", "Recursive / Hierarchy"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Gap-filling / dense series", sqlConcept: "recursive CTE calendar + LEFT JOIN", technique: "Date spine" },
      descriptionBrief:
        "Given **Sales4(SaleDate, Amount)** with some calendar days missing, return a **continuous** daily series " +
        "from the first to the last sale date, filling days with no sales as 0.",
      schema: [
        { name: "Sales4", columns: [
          { name: "SaleDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales4','U') IS NOT NULL DROP TABLE dbo.Sales4;\n" +
        "CREATE TABLE dbo.Sales4 (SaleDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Sales4 VALUES ('2024-01-01',100),('2024-01-03',200);",
      sampleData: [
        { table: "Sales4", columns: ["SaleDate","Amount"],
          rows: [["2024-01-01",100],["2024-01-03",200]] }
      ],
      expectedOutput: { columns: ["SaleDate","Amount"],
        rows: [["2024-01-01",100],["2024-01-02",0],["2024-01-03",200]] },
      approaches: [
        {
          name: "Recursive-CTE calendar spine + LEFT JOIN (recommended)",
          perfNote: "The spine generates every date once; a single LEFT JOIN attaches sales. Use OPTION (MAXRECURSION 0) for long ranges.",
          dialectNote: "Recursive CTE + DATEADD is SQL Server. Postgres: generate_series(min, max, interval '1 day'); MySQL 8+: recursive CTE similarly. A persistent Calendar/Dim_Date table is the production-grade alternative.",
          logic:
            "**What it asks.** A dense daily series with zeros on days that had no sales.\n\n" +
            "**Why the naive idea fails.** Selecting straight from Sales4 only ever returns days that exist; missing days simply don't appear, so downstream charts and moving averages are wrong.\n\n" +
            "**Key Idea.** Generate the full range of dates (a 'date spine') and LEFT JOIN the sparse sales onto it, defaulting missing amounts to 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Find MIN and MAX SaleDate.\n" +
            "2. Build a recursive CTE that steps one day at a time from MIN to MAX.\n" +
            "3. LEFT JOIN Sales4 to the spine on the date.\n" +
            "4. `COALESCE(Amount, 0)`.\n\n" +
            "**Why it works.** The spine is the authoritative set of dates; the LEFT JOIN keeps every spine day even when no sale matches.\n\n" +
            "**Common Gotchas.** Hitting the default 100-row recursion cap (add OPTION (MAXRECURSION 0)); driving the series from the sparse table instead of a generated spine.\n\n" +
            "**Performance.** O(days) to build the spine + O(n) join; a permanent calendar table avoids regenerating it.\n\n" +
            "**Interview mindset.** 'fill missing dates / no gaps in the series' → date spine (calendar table or recursive CTE) + LEFT JOIN.",
          tsql:
            "WITH bounds AS (\n" +
            "  SELECT MIN(SaleDate) AS mn, MAX(SaleDate) AS mx FROM dbo.Sales4),\n" +
            "spine AS (\n" +
            "  SELECT mn AS d FROM bounds\n" +
            "  UNION ALL\n" +
            "  SELECT DATEADD(day, 1, s.d)\n" +
            "  FROM spine s CROSS JOIN bounds b\n" +
            "  WHERE s.d < b.mx)\n" +
            "SELECT s.d AS SaleDate, COALESCE(x.Amount, 0) AS Amount\n" +
            "FROM spine s\n" +
            "LEFT JOIN dbo.Sales4 x ON x.SaleDate = s.d\n" +
            "ORDER BY s.d\n" +
            "OPTION (MAXRECURSION 0);",
          clean:
            "WITH bounds AS (SELECT MIN(SaleDate) AS mn, MAX(SaleDate) AS mx FROM dbo.Sales4),\n" +
            "spine AS (\n" +
            "  SELECT mn AS d FROM bounds\n" +
            "  UNION ALL\n" +
            "  SELECT DATEADD(day, 1, s.d) FROM spine s CROSS JOIN bounds b WHERE s.d < b.mx)\n" +
            "SELECT s.d AS SaleDate, COALESCE(x.Amount, 0) AS Amount\n" +
            "FROM spine s LEFT JOIN dbo.Sales4 x ON x.SaleDate = s.d\n" +
            "ORDER BY s.d OPTION (MAXRECURSION 0);"
        }
      ],
      walkthrough: [
        { step: "Generate the spine", note: "MIN 01-01, MAX 01-03 → dates 01-01, 01-02, 01-03." },
        { step: "LEFT JOIN + COALESCE", note: "01-02 has no sale → Amount 0; others keep their value.",
          table: { columns: ["SaleDate","Amount"], rows: [["2024-01-01",100],["2024-01-02",0],["2024-01-03",200]] } }
      ],
      patternRecognition: [
        "'no gaps / continuous daily series / fill missing dates' → date spine + LEFT JOIN.",
        "Zeros required for empty periods → COALESCE over a LEFT JOIN to the spine."
      ],
      interviewRecall: [
        "Drive the series from a generated calendar, not from the sparse fact table.",
        "SQL Server caps recursion at 100 rows by default — OPTION (MAXRECURSION 0) lifts it."
      ],
      commonMistakes: [
        "Selecting from the sparse table and silently omitting missing days.",
        "Hitting the recursion limit on longer date ranges."
      ]
    }

  ]);
})();
