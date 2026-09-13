/*
 * data/sql/gaps_islands2.js — Gaps & Islands (fold-in: streaks, merges, sessions).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * The row_number-difference trick, longest streaks, interval merging, and
 * gap-based sessionization — the highest-frequency "consecutive events" family.
 */
(function () {
  window.SQLLAB.register("Gaps & Islands", [

    {
      id: "gi2-consecutive-logins",
      number: "SL 4301",
      platform: "StudyLab",
      title: "Users With 3+ Consecutive Login Days",
      difficulty: "Medium",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Window Functions"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Consecutive run detection", sqlConcept: "date - ROW_NUMBER() island key", technique: "Gaps & islands" },
      descriptionBrief:
        "Given **Logins(UserId, LoginDate)** with at most one login per user per day, return every user who " +
        "logged in on **3 or more consecutive calendar days**.",
      schema: [
        { name: "Logins", columns: [
          { name: "UserId", type: "INT" },
          { name: "LoginDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Logins','U') IS NOT NULL DROP TABLE dbo.Logins;\n" +
        "CREATE TABLE dbo.Logins (UserId INT, LoginDate DATE);\n" +
        "INSERT INTO dbo.Logins VALUES\n" +
        "  (1,'2024-01-01'),(1,'2024-01-02'),(1,'2024-01-03'),\n" +
        "  (2,'2024-01-01'),(2,'2024-01-03'),(2,'2024-01-04');",
      sampleData: [
        { table: "Logins", columns: ["UserId","LoginDate"],
          rows: [[1,"2024-01-01"],[1,"2024-01-02"],[1,"2024-01-03"],
                 [2,"2024-01-01"],[2,"2024-01-03"],[2,"2024-01-04"]] }
      ],
      expectedOutput: { columns: ["UserId"], rows: [[1]] },
      approaches: [
        {
          name: "date minus ROW_NUMBER() island key (recommended)",
          perfNote: "One partitioned sort; the subtracted key is constant within a consecutive run.",
          dialectNote: "DATEADD/ROW_NUMBER are portable in spirit; Postgres uses LoginDate - (ROW_NUMBER() OVER …) * INTERVAL '1 day'.",
          logic:
            "**What it asks.** Users with a streak of at least 3 back-to-back days.\n\n" +
            "**Why the naive idea fails.** Self-joining each day to the next two is O(n·k) and clumsy; counting distinct days ignores whether they're consecutive.\n\n" +
            "**Key Idea.** For rows ordered by date, `LoginDate - ROW_NUMBER()` is constant across a consecutive run: as the date steps +1 day, the row number also steps +1, so their difference stays fixed and breaks only at a gap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate)`.\n" +
            "2. Compute the island key `DATEADD(day, -rn, LoginDate)`.\n" +
            "3. GROUP BY UserId, island key; keep groups with COUNT(*) ≥ 3.\n" +
            "4. Return the distinct users.\n\n" +
            "**Why it works.** Consecutive dates advance in lockstep with the row number; a missing day shifts the difference, starting a new island.\n\n" +
            "**Common Gotchas.** Duplicate logins per day would break the lockstep — dedupe first; using RANK instead of ROW_NUMBER breaks the arithmetic on ties.\n\n" +
            "**Performance.** O(n log n) partitioned sort.\n\n" +
            "**Interview mindset.** 'consecutive days / streak' → date minus ROW_NUMBER() island key.",
          tsql:
            "WITH marked AS (\n" +
            "  SELECT UserId, LoginDate,\n" +
            "         DATEADD(day,\n" +
            "                 -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate),\n" +
            "                 LoginDate) AS grp\n" +
            "  FROM dbo.Logins)\n" +
            "SELECT UserId\n" +
            "FROM marked\n" +
            "GROUP BY UserId, grp\n" +
            "HAVING COUNT(*) >= 3\n" +
            "ORDER BY UserId;",
          clean:
            "WITH marked AS (\n" +
            "  SELECT UserId, LoginDate,\n" +
            "         DATEADD(day, -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate), LoginDate) AS grp\n" +
            "  FROM dbo.Logins)\n" +
            "SELECT UserId FROM marked GROUP BY UserId, grp HAVING COUNT(*) >= 3 ORDER BY UserId;"
        }
      ],
      walkthrough: [
        { step: "User 1 island key", note: "01-01,01-02,01-03 with rn 1,2,3 → key = 2023-12-31 for all → one island of 3." },
        { step: "User 2 island key", note: "01-01(rn1)→12-31; 01-03(rn2)→01-01; 01-04(rn3)→01-01 → islands of size 1 and 2, max 2 < 3.",
          table: { columns: ["UserId"], rows: [[1]] } }
      ],
      patternRecognition: [
        "'N consecutive days/periods' → date minus ROW_NUMBER() forms a constant island key.",
        "Streak / run problems → gaps & islands, not self-joins."
      ],
      interviewRecall: [
        "Consecutive integers/dates minus their row number are constant within a run.",
        "Dedupe per period first, or the lockstep assumption fails."
      ],
      commonMistakes: [
        "Counting distinct days without checking consecutiveness.",
        "Using RANK/DENSE_RANK (ties) where ROW_NUMBER is required."
      ]
    },

    {
      id: "gi2-longest-streak",
      number: "SL 4302",
      platform: "StudyLab",
      title: "Longest Consecutive Login Streak per User",
      difficulty: "Medium",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Window Functions"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Longest run per key", sqlConcept: "island grouping + MAX(COUNT)", technique: "Gaps & islands" },
      descriptionBrief:
        "Given **Logins2(UserId, LoginDate)**, return each user's **longest streak** of consecutive login days.",
      schema: [
        { name: "Logins2", columns: [
          { name: "UserId", type: "INT" },
          { name: "LoginDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Logins2','U') IS NOT NULL DROP TABLE dbo.Logins2;\n" +
        "CREATE TABLE dbo.Logins2 (UserId INT, LoginDate DATE);\n" +
        "INSERT INTO dbo.Logins2 VALUES\n" +
        "  (1,'2024-01-01'),(1,'2024-01-02'),(1,'2024-01-04'),(1,'2024-01-05'),(1,'2024-01-06'),\n" +
        "  (2,'2024-01-01'),(2,'2024-01-02');",
      sampleData: [
        { table: "Logins2", columns: ["UserId","LoginDate"],
          rows: [[1,"2024-01-01"],[1,"2024-01-02"],[1,"2024-01-04"],[1,"2024-01-05"],[1,"2024-01-06"],
                 [2,"2024-01-01"],[2,"2024-01-02"]] }
      ],
      expectedOutput: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,2]] },
      approaches: [
        {
          name: "Island grouping then MAX of the per-island counts (recommended)",
          perfNote: "Two aggregations over one windowed pass; no self-join.",
          dialectNote: "Same island trick as consecutive-run detection; portable across engines with their date arithmetic.",
          logic:
            "**What it asks.** The length of the longest back-to-back run of days per user.\n\n" +
            "**Why the naive idea fails.** There is no built-in 'longest run'; iterating row by row in SQL is awkward and slow.\n\n" +
            "**Key Idea.** Build islands with the `date - ROW_NUMBER()` key, count each island's length, then take the MAX per user.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute the island key per user.\n" +
            "2. GROUP BY UserId, key → each group's COUNT(*) is a streak length.\n" +
            "3. Wrap and take `MAX(streakLen)` per user.\n\n" +
            "**Why it works.** Each island is exactly one consecutive run; its row count is that run's length, so the max across islands is the longest streak.\n\n" +
            "**Common Gotchas.** Returning the island with the most recent date instead of the longest; not handling users with a single login (streak 1).\n\n" +
            "**Performance.** O(n log n).\n\n" +
            "**Interview mindset.** 'longest streak' → island lengths, then MAX per key.",
          tsql:
            "WITH marked AS (\n" +
            "  SELECT UserId, LoginDate,\n" +
            "         DATEADD(day, -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate), LoginDate) AS grp\n" +
            "  FROM dbo.Logins2),\n" +
            "runs AS (\n" +
            "  SELECT UserId, grp, COUNT(*) AS streakLen\n" +
            "  FROM marked GROUP BY UserId, grp)\n" +
            "SELECT UserId, MAX(streakLen) AS LongestStreak\n" +
            "FROM runs\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;",
          clean:
            "WITH marked AS (\n" +
            "  SELECT UserId, LoginDate,\n" +
            "         DATEADD(day, -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate), LoginDate) AS grp\n" +
            "  FROM dbo.Logins2),\n" +
            "runs AS (SELECT UserId, grp, COUNT(*) AS streakLen FROM marked GROUP BY UserId, grp)\n" +
            "SELECT UserId, MAX(streakLen) AS LongestStreak FROM runs GROUP BY UserId ORDER BY UserId;"
        }
      ],
      walkthrough: [
        { step: "User 1 islands", note: "{01-01,01-02}=2 and {01-04,01-05,01-06}=3 → longest 3." },
        { step: "User 2 island", note: "{01-01,01-02}=2 → longest 2.",
          table: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,2]] } }
      ],
      patternRecognition: [
        "'longest consecutive streak' → island lengths, then MAX per key.",
        "Runs of consecutive periods → gaps & islands."
      ],
      interviewRecall: [
        "Each island's COUNT(*) is a run length; MAX across islands is the longest streak.",
        "The island key is date minus its per-user row number."
      ],
      commonMistakes: [
        "Confusing 'longest' with 'most recent' streak.",
        "Dropping single-login users who still have a streak of 1."
      ]
    },

    {
      id: "gi2-merge-intervals",
      number: "SL 4303",
      platform: "StudyLab",
      title: "Merge Overlapping Booking Intervals",
      difficulty: "Hard",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Window Functions"],
      domains: ["Hospitality"],
      link: "",
      meta: { pattern: "Interval merge", sqlConcept: "running max end + island sum", technique: "Gaps & islands" },
      descriptionBrief:
        "Given **Bookings(RoomId, StartDate, EndDate)** with possibly overlapping ranges, **merge** overlapping " +
        "intervals per room into consolidated occupied periods.",
      schema: [
        { name: "Bookings", columns: [
          { name: "RoomId", type: "VARCHAR(4)" },
          { name: "StartDate", type: "DATE" },
          { name: "EndDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Bookings','U') IS NOT NULL DROP TABLE dbo.Bookings;\n" +
        "CREATE TABLE dbo.Bookings (RoomId VARCHAR(4), StartDate DATE, EndDate DATE);\n" +
        "INSERT INTO dbo.Bookings VALUES\n" +
        "  ('A','2024-01-01','2024-01-03'),('A','2024-01-02','2024-01-05'),('A','2024-01-08','2024-01-10');",
      sampleData: [
        { table: "Bookings", columns: ["RoomId","StartDate","EndDate"],
          rows: [["A","2024-01-01","2024-01-03"],["A","2024-01-02","2024-01-05"],["A","2024-01-08","2024-01-10"]] }
      ],
      expectedOutput: { columns: ["RoomId","MergedStart","MergedEnd"],
        rows: [["A","2024-01-01","2024-01-05"],["A","2024-01-08","2024-01-10"]] },
      approaches: [
        {
          name: "Running max end → island flag → group (recommended)",
          perfNote: "One ordered pass computing the prior running max, one flag, one grouped aggregation.",
          dialectNote: "Uses MAX() OVER with a ROWS frame excluding the current row; portable to Postgres/Oracle. MySQL 8+ supports the same frame syntax.",
          logic:
            "**What it asks.** Collapse overlapping (or touching) intervals into the fewest covering ranges per room.\n\n" +
            "**Why the naive idea fails.** Comparing each interval to every other is O(n²); a simple GROUP BY can't detect chained overlaps (A overlaps B, B overlaps C).\n\n" +
            "**Key Idea.** Order by StartDate. A new island begins when the current StartDate is later than the **maximum EndDate of all prior intervals**. A running sum of that flag numbers the islands.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `MAX(EndDate) OVER (PARTITION BY RoomId ORDER BY StartDate ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)` = prior max end.\n" +
            "2. Flag = 1 when StartDate > prior max end (or prior is NULL — the first row), else 0.\n" +
            "3. island = `SUM(flag) OVER (PARTITION BY RoomId ORDER BY StartDate)`.\n" +
            "4. GROUP BY RoomId, island → MIN(StartDate), MAX(EndDate).\n\n" +
            "**Why it works.** Tracking the running max end (not just the previous row's end) correctly handles chained and nested overlaps.\n\n" +
            "**Common Gotchas.** Comparing to the previous row's EndDate instead of the running max (misses nesting); mishandling the first row where prior max is NULL.\n\n" +
            "**Performance.** O(n log n) single ordered pass.\n\n" +
            "**Interview mindset.** 'merge overlapping intervals' → running max end + island sum.",
          tsql:
            "WITH ext AS (\n" +
            "  SELECT RoomId, StartDate, EndDate,\n" +
            "         MAX(EndDate) OVER (PARTITION BY RoomId ORDER BY StartDate\n" +
            "               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS priorMaxEnd\n" +
            "  FROM dbo.Bookings),\n" +
            "flagged AS (\n" +
            "  SELECT RoomId, StartDate, EndDate,\n" +
            "         CASE WHEN priorMaxEnd IS NULL OR StartDate > priorMaxEnd THEN 1 ELSE 0 END AS isNew\n" +
            "  FROM ext),\n" +
            "islands AS (\n" +
            "  SELECT RoomId, StartDate, EndDate,\n" +
            "         SUM(isNew) OVER (PARTITION BY RoomId ORDER BY StartDate) AS island\n" +
            "  FROM flagged)\n" +
            "SELECT RoomId, MIN(StartDate) AS MergedStart, MAX(EndDate) AS MergedEnd\n" +
            "FROM islands\n" +
            "GROUP BY RoomId, island\n" +
            "ORDER BY RoomId, MergedStart;",
          clean:
            "WITH ext AS (\n" +
            "  SELECT RoomId, StartDate, EndDate,\n" +
            "         MAX(EndDate) OVER (PARTITION BY RoomId ORDER BY StartDate\n" +
            "               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS priorMaxEnd\n" +
            "  FROM dbo.Bookings),\n" +
            "flagged AS (SELECT RoomId, StartDate, EndDate,\n" +
            "         CASE WHEN priorMaxEnd IS NULL OR StartDate > priorMaxEnd THEN 1 ELSE 0 END AS isNew FROM ext),\n" +
            "islands AS (SELECT RoomId, StartDate, EndDate,\n" +
            "         SUM(isNew) OVER (PARTITION BY RoomId ORDER BY StartDate) AS island FROM flagged)\n" +
            "SELECT RoomId, MIN(StartDate) AS MergedStart, MAX(EndDate) AS MergedEnd\n" +
            "FROM islands GROUP BY RoomId, island ORDER BY RoomId, MergedStart;"
        }
      ],
      walkthrough: [
        { step: "Running prior-max end", note: "Row1 prior=NULL→new; Row2 prior=01-03, start 01-02≤01-03→same; Row3 prior=max(01-03,01-05)=01-05, start 01-08>01-05→new." },
        { step: "Group islands", note: "Island 1: [01-01, max(01-03,01-05)=01-05]. Island 2: [01-08,01-10].",
          table: { columns: ["RoomId","MergedStart","MergedEnd"],
            rows: [["A","2024-01-01","2024-01-05"],["A","2024-01-08","2024-01-10"]] } }
      ],
      patternRecognition: [
        "'merge overlapping ranges / consolidate intervals' → running max end + island sum.",
        "Chained/nested overlaps → compare to running max end, not the previous row."
      ],
      interviewRecall: [
        "A new interval island starts when StartDate > max end of all prior intervals.",
        "Use a ROWS frame ending at 1 PRECEDING to exclude the current row from the running max."
      ],
      commonMistakes: [
        "Comparing only to the previous row's end, missing nested intervals.",
        "Forgetting the first-row NULL case for the running max."
      ]
    },

    {
      id: "gi2-sessionize",
      number: "SL 4304",
      platform: "StudyLab",
      title: "Sessionize Events by 30-Minute Gap",
      difficulty: "Hard",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Window Functions"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Gap-based sessionization", sqlConcept: "LAG gap + running sum flag", technique: "Gaps & islands" },
      descriptionBrief:
        "Given **Events(UserId, EventTime)**, assign a **session number** per user, starting a new session " +
        "whenever the gap since the previous event exceeds **30 minutes**.",
      schema: [
        { name: "Events", columns: [
          { name: "UserId", type: "INT" },
          { name: "EventTime", type: "DATETIME" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Events','U') IS NOT NULL DROP TABLE dbo.Events;\n" +
        "CREATE TABLE dbo.Events (UserId INT, EventTime DATETIME);\n" +
        "INSERT INTO dbo.Events VALUES\n" +
        "  (1,'2024-01-01 10:00:00'),(1,'2024-01-01 10:20:00'),\n" +
        "  (1,'2024-01-01 11:30:00'),(1,'2024-01-01 11:40:00');",
      sampleData: [
        { table: "Events", columns: ["UserId","EventTime"],
          rows: [[1,"2024-01-01 10:00:00"],[1,"2024-01-01 10:20:00"],
                 [1,"2024-01-01 11:30:00"],[1,"2024-01-01 11:40:00"]] }
      ],
      expectedOutput: { columns: ["UserId","EventTime","SessionId"],
        rows: [[1,"2024-01-01 10:00:00",1],[1,"2024-01-01 10:20:00",1],
               [1,"2024-01-01 11:30:00",2],[1,"2024-01-01 11:40:00",2]] },
      approaches: [
        {
          name: "LAG gap → new-session flag → running sum (recommended)",
          perfNote: "One ordered pass with LAG and a running SUM; the canonical sessionization shape.",
          dialectNote: "DATEDIFF(minute, prev, cur) in SQL Server; Postgres uses EXTRACT(EPOCH FROM (cur - prev))/60. The LAG + cumulative-sum pattern is identical everywhere.",
          logic:
            "**What it asks.** Group each user's events into sessions separated by >30 minutes of inactivity.\n\n" +
            "**Why the naive idea fails.** There is no built-in 'session' concept; a fixed time-bucket (e.g. per hour) splits real sessions that straddle a boundary and merges distinct ones.\n\n" +
            "**Key Idea.** Look back one event with LAG; when the gap exceeds 30 minutes (or there is no previous event), start a new session. A running SUM of that flag is the session number.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LAG(EventTime) OVER (PARTITION BY UserId ORDER BY EventTime)` = previous event time.\n" +
            "2. Flag = 1 when previous is NULL or `DATEDIFF(minute, prev, cur) > 30`, else 0.\n" +
            "3. `SUM(flag) OVER (PARTITION BY UserId ORDER BY EventTime)` = SessionId.\n\n" +
            "**Why it works.** Every session boundary contributes exactly one increment, so the cumulative flag labels events with a monotonically increasing session number.\n\n" +
            "**Common Gotchas.** Using a fixed clock bucket instead of an inactivity gap; forgetting the first event's NULL gap (must count as a new session).\n\n" +
            "**Performance.** O(n log n) partitioned sort.\n\n" +
            "**Interview mindset.** 'sessionize / inactivity gap / 30-minute rule' → LAG gap + running sum.",
          tsql:
            "WITH gapped AS (\n" +
            "  SELECT UserId, EventTime,\n" +
            "         CASE WHEN DATEDIFF(minute,\n" +
            "                 LAG(EventTime) OVER (PARTITION BY UserId ORDER BY EventTime),\n" +
            "                 EventTime) > 30\n" +
            "              OR LAG(EventTime) OVER (PARTITION BY UserId ORDER BY EventTime) IS NULL\n" +
            "              THEN 1 ELSE 0 END AS isNew\n" +
            "  FROM dbo.Events)\n" +
            "SELECT UserId, EventTime,\n" +
            "       SUM(isNew) OVER (PARTITION BY UserId ORDER BY EventTime) AS SessionId\n" +
            "FROM gapped\n" +
            "ORDER BY UserId, EventTime;",
          clean:
            "WITH gapped AS (\n" +
            "  SELECT UserId, EventTime,\n" +
            "         CASE WHEN DATEDIFF(minute, LAG(EventTime) OVER (PARTITION BY UserId ORDER BY EventTime), EventTime) > 30\n" +
            "              OR LAG(EventTime) OVER (PARTITION BY UserId ORDER BY EventTime) IS NULL\n" +
            "              THEN 1 ELSE 0 END AS isNew\n" +
            "  FROM dbo.Events)\n" +
            "SELECT UserId, EventTime,\n" +
            "       SUM(isNew) OVER (PARTITION BY UserId ORDER BY EventTime) AS SessionId\n" +
            "FROM gapped ORDER BY UserId, EventTime;"
        }
      ],
      walkthrough: [
        { step: "Compute gaps with LAG", note: "10:00 (no prev→new); 10:20 (gap 20≤30→same); 11:30 (gap 70>30→new); 11:40 (gap 10→same)." },
        { step: "Running sum of flags", note: "Flags 1,0,1,0 → SessionId 1,1,2,2.",
          table: { columns: ["UserId","EventTime","SessionId"],
            rows: [[1,"2024-01-01 10:00:00",1],[1,"2024-01-01 10:20:00",1],
                   [1,"2024-01-01 11:30:00",2],[1,"2024-01-01 11:40:00",2]] } }
      ],
      patternRecognition: [
        "'sessionize / inactivity timeout / 30-minute gap' → LAG gap + running sum of a new-session flag.",
        "Grouping events by activity, not by clock buckets → gaps & islands."
      ],
      interviewRecall: [
        "A new session starts when the gap > threshold OR there is no previous event.",
        "The cumulative sum of boundary flags is the session number."
      ],
      commonMistakes: [
        "Bucketing by fixed hour instead of an inactivity gap.",
        "Not treating the first event (NULL gap) as a new session."
      ]
    }

  ]);
})();
