/*
 * data/aggregation.js — Aggregation & Grouping (seed set).
 * Full topic content is authored in later iterations; these problems exercise
 * the complete SQL-adapted schema (schema / sampleData / expectedOutput /
 * setupSql / multiple T-SQL approaches / walkthrough tables).
 */
(function () {
  window.SQLLAB.register("Aggregation & Grouping", [
    {
      id: "employees-per-department",
      number: "LC 570",
      platform: "LeetCode",
      title: "Count Employees per Department",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["HR Analytics"],
      link: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql",
      meta: { pattern: "GROUP BY aggregate", sqlConcept: "COUNT + GROUP BY", technique: "Single-table aggregate" },
      descriptionBrief:
        "Given an **Employees** table, return each department id together with the " +
        "number of employees assigned to it. Departments with no employees may be omitted.",
      schema: [
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "DeptId", type: "INT", note: "department" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, Name VARCHAR(50), DeptId INT);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Ana',10),(2,'Ben',10),(3,'Cara',20),\n" +
        "  (4,'Dan',20),(5,'Eve',20),(6,'Finn',30);",
      sampleData: [
        { table: "Employees", columns: ["Id","Name","DeptId"],
          rows: [[1,"Ana",10],[2,"Ben",10],[3,"Cara",20],[4,"Dan",20],[5,"Eve",20],[6,"Finn",30]] }
      ],
      expectedOutput: { columns: ["DeptId","EmpCount"], rows: [[10,2],[20,3],[30,1]] },
      approaches: [
        {
          name: "GROUP BY (recommended)",
          perfNote: "Single scan feeding a hash/stream aggregate; an index on DeptId enables an ordered stream aggregate with no sort.",
          dialectNote: "",
          logic:
            "**What it asks.** Report, for each department, how many employees it has.\n\n" +
            "**Why the naive idea fails.** Running `COUNT(*)` once over the whole table gives a single grand total, not a per-department breakdown — you need one count *per group*.\n\n" +
            "**Key Idea.** `GROUP BY DeptId` collapses all rows that share a department into one group; `COUNT(*)` then counts the rows inside each group.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan every row of `Employees`.\n" +
            "2. Partition the rows into buckets keyed by `DeptId`.\n" +
            "3. Emit one output row per bucket with `COUNT(*)` as its size.\n\n" +
            "**Why it works.** Grouping is defined to produce exactly one result row per distinct grouping key, and aggregates are evaluated within each group.\n\n" +
            "**Common Gotchas.** Every non-aggregated column in the SELECT list must appear in GROUP BY.\n\n" +
            "**Performance.** Hash aggregate over one scan, O(n); with an index ordered by `DeptId` the optimizer can stream-aggregate and skip the sort.\n\n" +
            "**Interview mindset.** 'How many per X' almost always maps to `GROUP BY X` with a `COUNT`.",
          tsql:
            "SELECT DeptId,                 -- one row per department\n" +
            "       COUNT(*) AS EmpCount    -- rows in that department\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY DeptId\n" +
            "ORDER BY DeptId;",
          clean:
            "SELECT DeptId, COUNT(*) AS EmpCount\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY DeptId\n" +
            "ORDER BY DeptId;"
        }
      ],
      walkthrough: [
        { step: "After GROUP BY DeptId", note: "Rows collapse into three buckets; COUNT(*) sizes each.",
          table: { columns: ["DeptId","EmpCount"], rows: [[10,2],[20,3],[30,1]] } }
      ],
      patternRecognition: [
        "'how many per X' / 'count for each X' → `GROUP BY X` with `COUNT(*)`"
      ],
      interviewRecall: [
        "Every non-aggregated SELECT column must be in GROUP BY.",
        "`COUNT(*)` counts rows; `COUNT(col)` skips NULLs in `col`."
      ],
      commonMistakes: [
        "Selecting a column that is neither aggregated nor in GROUP BY (a compile error in T-SQL).",
        "Using `COUNT(DeptId)` expecting the number of departments — it counts employee rows, not distinct departments."
      ]
    }
  ]);
})();
