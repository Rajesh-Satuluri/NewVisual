/*
 * data/gaps_islands.js — Gaps & Islands.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Gaps & Islands", [

    {
      id: "consecutive-login-streaks",
      number: "DL 10298",
      platform: "DataLemur",
      title: "Longest Consecutive Login Streak",
      difficulty: "Hard",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Window Functions"],
      domains: ["Product Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Islands of consecutive dates", sqlConcept: "ROW_NUMBER date-grouping trick", technique: "Date minus row-number is constant per streak" },
      descriptionBrief:
        "Given **Logins(UserId, LoginDate)** (one row per user per day they logged in), " +
        "return each user's **longest run of consecutive days**.",
      schema: [
        { name: "Logins", columns: [
          { name: "UserId", type: "INT" },
          { name: "LoginDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Logins','U') IS NOT NULL DROP TABLE dbo.Logins;\n" +
        "CREATE TABLE dbo.Logins (UserId INT, LoginDate DATE);\n" +
        "INSERT INTO dbo.Logins VALUES\n" +
        "  (1,'2024-01-01'),(1,'2024-01-02'),(1,'2024-01-03'),(1,'2024-01-05'),\n" +
        "  (2,'2024-01-10'),(2,'2024-01-11');",
      sampleData: [
        { table: "Logins", columns: ["UserId","LoginDate"],
          rows: [[1,"2024-01-01"],[1,"2024-01-02"],[1,"2024-01-03"],[1,"2024-01-05"],[2,"2024-01-10"],[2,"2024-01-11"]] }
      ],
      expectedOutput: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,2]] },
      approaches: [
        {
          name: "Date − ROW_NUMBER grouping (recommended)",
          perfNote: "One window pass per user; consecutive dates share a constant (date − row_number), so grouping on it isolates each streak. No self-join.",
          dialectNote: "",
          logic:
            "**What it asks.** The longest unbroken run of daily logins per user.\n\n" +
            "**Why the naive idea fails.** Comparing each row to the previous with LAG finds breaks but still needs extra work to size runs; self-joining on date ± 1 is O(n²) and clumsy.\n\n" +
            "**Key Idea.** The classic islands trick: number each user's dates with `ROW_NUMBER()` in date order. For consecutive dates, `LoginDate − row_number` stays **constant**; it changes only when a gap appears. Group on that anchor to get each streak.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate)` = rn.\n" +
            "2. Compute the anchor `DATEADD(DAY, -rn, LoginDate)` — equal within a streak.\n" +
            "3. `GROUP BY UserId, anchor`, `COUNT(*)` = streak length.\n" +
            "4. Take `MAX(streak length)` per user.\n\n" +
            "**Why it works.** Consecutive dates increase by 1 exactly as the row number does, so their difference is invariant; a gap shifts it, starting a new group.\n\n" +
            "**Common Gotchas.** Assumes one row per user per day; dedupe first if duplicates exist. Subtract the row number *in days*.\n\n" +
            "**Performance.** One sort/window per user + a group aggregate.\n\n" +
            "**Interview mindset.** 'consecutive runs / streaks / islands' → date minus ROW_NUMBER is constant per island.",
          tsql:
            "WITH Numbered AS (\n" +
            "    SELECT UserId, LoginDate,\n" +
            "           DATEADD(DAY,\n" +
            "                   -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate),\n" +
            "                   LoginDate) AS Anchor      -- constant within a streak\n" +
            "    FROM dbo.Logins\n" +
            "),\n" +
            "Streaks AS (\n" +
            "    SELECT UserId, COUNT(*) AS StreakLen\n" +
            "    FROM Numbered\n" +
            "    GROUP BY UserId, Anchor\n" +
            ")\n" +
            "SELECT UserId, MAX(StreakLen) AS LongestStreak\n" +
            "FROM Streaks\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;",
          clean:
            "WITH Numbered AS (\n" +
            "    SELECT UserId, LoginDate,\n" +
            "           DATEADD(DAY, -ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LoginDate), LoginDate) AS Anchor\n" +
            "    FROM dbo.Logins\n" +
            "),\n" +
            "Streaks AS (\n" +
            "    SELECT UserId, COUNT(*) AS StreakLen\n" +
            "    FROM Numbered\n" +
            "    GROUP BY UserId, Anchor\n" +
            ")\n" +
            "SELECT UserId, MAX(StreakLen) AS LongestStreak\n" +
            "FROM Streaks\n" +
            "GROUP BY UserId\n" +
            "ORDER BY UserId;"
        }
      ],
      walkthrough: [
        { step: "Number dates and compute (date − rn)", note: "User 1: Jan1-3 share one anchor; Jan5 gets a new one.",
          table: { columns: ["UserId","LoginDate","rn","Anchor"],
            rows: [[1,"2024-01-01",1,"2023-12-31"],[1,"2024-01-02",2,"2023-12-31"],[1,"2024-01-03",3,"2023-12-31"],[1,"2024-01-05",4,"2024-01-01"],[2,"2024-01-10",1,"2024-01-09"],[2,"2024-01-11",2,"2024-01-09"]] } },
        { step: "Count per anchor, take the max per user",
          table: { columns: ["UserId","LongestStreak"], rows: [[1,3],[2,2]] } }
      ],
      patternRecognition: [
        "'consecutive / streak / uninterrupted run' → group on (ordered value − ROW_NUMBER)."
      ],
      interviewRecall: [
        "Consecutive integers (or dates) minus their row number is constant — the island key.",
        "Dedupe to one row per period before applying the trick."
      ],
      commonMistakes: [
        "Duplicate rows per day inflate streaks — dedupe first.",
        "Subtracting the row number without DATEADD(DAY,…) on a date column."
      ]
    }

  ]);
})();
