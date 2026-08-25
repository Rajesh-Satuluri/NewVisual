/*
 * data/aggregation.js — SEED problem (scaffold placeholder).
 *
 * NOTE: This is an iteration-1/2 scaffold seed to prove the app shell loads,
 * the SQL registry works, and Prism-SQL highlighting renders. The full
 * SQL-adapted per-problem schema (schema / sampleData / expectedOutput /
 * setupSql / multiple T-SQL approaches / result tables) lands in iteration 3.
 */
(function () {
  window.SQLLAB.register("Aggregation & Grouping", [
    {
      id: "seed-employees-per-department",
      number: "SEED",
      platform: "LeetCode",
      title: "Count Employees per Department",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["HR Analytics"],
      link: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql",
      meta: {
        pattern: "GROUP BY aggregate",
        dataStructure: "Single table",
        technique: "COUNT + GROUP BY"
      },
      description:
        "Scaffold seed problem. Given an **Employees** table with a `DeptId`, " +
        "return the number of employees in each department.\n\n" +
        "_Full SQL content (sample-data tables, expected-output table, runnable " +
        "SSMS setup script, and multiple T-SQL approaches) is added in iteration 3._",
      examples: [
        {
          input: "Employees(Id, Name, DeptId)",
          output: "One row per DeptId with its employee count",
          reasoning: "Group the rows by `DeptId` and count each group."
        }
      ],
      approaches: [
        {
          name: "GROUP BY (recommended)",
          time: "Scan",
          space: "Hash agg",
          logic:
            "**What it asks.** Count how many employees fall in each department.\n\n" +
            "**Key Idea.** Collapse rows sharing a `DeptId` into one group and " +
            "count the rows per group with `COUNT(*)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Read every row of `Employees`.\n" +
            "2. `GROUP BY DeptId` to form one bucket per department.\n" +
            "3. `COUNT(*)` the rows in each bucket.\n\n" +
            "**Why it works.** `GROUP BY` partitions the table by the key; the " +
            "aggregate runs once per partition.\n\n" +
            "**Performance.** A hash or stream aggregate over a single scan; an " +
            "index on `DeptId` enables an ordered stream aggregate.",
          rcs:
            "-- Count employees in each department\n" +
            "SELECT DeptId,                 -- grouping key\n" +
            "       COUNT(*) AS EmpCount    -- rows per department\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY DeptId\n" +
            "ORDER BY DeptId;",
          plain:
            "SELECT DeptId, COUNT(*) AS EmpCount\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY DeptId\n" +
            "ORDER BY DeptId;"
        }
      ],
      patternRecognition: [
        "'how many per X' / 'count for each X' → GROUP BY X with COUNT(*)"
      ],
      interviewRecall: [
        "Every non-aggregated column in the SELECT must appear in GROUP BY."
      ]
    }
  ]);
})();
