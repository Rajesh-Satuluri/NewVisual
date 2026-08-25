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
    },

    {
      id: "big-departments",
      number: "LC 570",
      platform: "LeetCode",
      title: "Departments With At Least Three Employees",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/managers-with-at-least-5-direct-reports/",
      meta: { pattern: "Group then filter groups", sqlConcept: "GROUP BY + HAVING", technique: "Threshold on COUNT" },
      descriptionBrief:
        "Given **Employees(DeptId)** and **Departments(Name)**, return the names of departments " +
        "that have **three or more employees**.",
      schema: [
        { name: "Departments", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "DeptId", type: "INT", note: "FK → Departments.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "IF OBJECT_ID('dbo.Departments','U') IS NOT NULL DROP TABLE dbo.Departments;\n" +
        "CREATE TABLE dbo.Departments (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, DeptId INT);\n" +
        "INSERT INTO dbo.Departments VALUES (10,'Sales'),(20,'HR'),(30,'IT');\n" +
        "INSERT INTO dbo.Employees VALUES (1,10),(2,10),(3,10),(4,20),(5,30),(6,30);",
      sampleData: [
        { table: "Departments", columns: ["Id","Name"], rows: [[10,"Sales"],[20,"HR"],[30,"IT"]] },
        { table: "Employees", columns: ["Id","DeptId"], rows: [[1,10],[2,10],[3,10],[4,20],[5,30],[6,30]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Sales"]] },
      approaches: [
        {
          name: "GROUP BY … HAVING (recommended)",
          perfNote: "Aggregate employees per department first, HAVING to keep large groups, then join for the name — the join runs on the small filtered set.",
          dialectNote: "",
          logic:
            "**What it asks.** Departments with a headcount of at least three.\n\n" +
            "**Why the naive idea fails.** WHERE can't test a per-department count; the count only exists after grouping, so the threshold must be HAVING.\n\n" +
            "**Key Idea.** Count employees per `DeptId`, keep departments whose count ≥ 3 with `HAVING`, then join to `Departments` for the name.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY DeptId` over `Employees` with `COUNT(*)`.\n" +
            "2. `HAVING COUNT(*) >= 3`.\n" +
            "3. Join the survivors to `Departments` for the display name.\n\n" +
            "**Why it works.** HAVING filters aggregated groups; joining afterward keeps the aggregation clean and cheap.\n\n" +
            "**Common Gotchas.** Put the count threshold in HAVING, not WHERE; join for the name after filtering.\n\n" +
            "**Performance.** One group aggregate + a small join.\n\n" +
            "**Interview mindset.** 'groups with at least N' → GROUP BY key HAVING COUNT(*) >= N.",
          tsql:
            "SELECT d.Name\n" +
            "FROM dbo.Employees e\n" +
            "JOIN dbo.Departments d ON d.Id = e.DeptId\n" +
            "GROUP BY d.Id, d.Name\n" +
            "HAVING COUNT(*) >= 3;         -- departments with 3+ employees\n",
          clean:
            "SELECT d.Name\n" +
            "FROM dbo.Employees e\n" +
            "JOIN dbo.Departments d ON d.Id = e.DeptId\n" +
            "GROUP BY d.Id, d.Name\n" +
            "HAVING COUNT(*) >= 3;"
        }
      ],
      walkthrough: [
        { step: "Count employees per department", note: "Sales 3, HR 1, IT 2.",
          table: { columns: ["Name","Cnt"], rows: [["Sales",3],["HR",1],["IT",2]] } },
        { step: "Keep COUNT(*) >= 3",
          table: { columns: ["Name"], rows: [["Sales"]] } }
      ],
      patternRecognition: [
        "'groups having at least/at most N' → GROUP BY key HAVING COUNT(*) threshold."
      ],
      interviewRecall: [
        "HAVING is the WHERE-for-groups; it runs after aggregation.",
        "GROUP BY the department key and its name together so the name is projectable."
      ],
      commonMistakes: [
        "Putting the COUNT threshold in WHERE.",
        "Grouping by name only when two departments could share a name — group by the id too."
      ]
    },

    {
      id: "revenue-per-category",
      number: "SS 10171",
      platform: "StrataScratch",
      title: "Revenue and Average Order per Category",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Multi-aggregate per group", sqlConcept: "SUM / AVG / COUNT", technique: "Several aggregates at once" },
      descriptionBrief:
        "Given **Orders(Category, Amount)**, return per category the **order count**, **total " +
        "revenue**, and **average order value** (rounded to 2 decimals), highest revenue first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, Category VARCHAR(30), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'Books',20.00),(2,'Books',40.00),(3,'Electronics',300.00),\n" +
        "  (4,'Electronics',100.00),(5,'Electronics',50.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","Category","Amount"],
          rows: [[1,"Books","20.00"],[2,"Books","40.00"],[3,"Electronics","300.00"],[4,"Electronics","100.00"],[5,"Electronics","50.00"]] }
      ],
      expectedOutput: { columns: ["Category","Orders","Revenue","AvgOrder"],
        rows: [["Electronics",3,"450.00","150.00"],["Books",2,"60.00","30.00"]] },
      approaches: [
        {
          name: "GROUP BY with several aggregates (recommended)",
          perfNote: "COUNT, SUM and AVG all compute in the same single grouped pass — no need for separate queries.",
          dialectNote: "",
          logic:
            "**What it asks.** Three summary numbers per category in one result.\n\n" +
            "**Why the naive idea fails.** Running three separate grouped queries and stitching them is wasteful — all three aggregates come from the same groups.\n\n" +
            "**Key Idea.** One `GROUP BY Category` can carry `COUNT(*)`, `SUM(Amount)`, and `AVG(Amount)` together.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category`.\n" +
            "2. Project `COUNT(*)`, `SUM(Amount)`, `CAST(AVG(Amount) AS DECIMAL(10,2))`.\n" +
            "3. Order by revenue descending.\n\n" +
            "**Why it works.** Multiple aggregate expressions evaluate over the same partition in a single pass.\n\n" +
            "**Common Gotchas.** On integer columns AVG truncates — here Amount is DECIMAL so the average is exact; cast/round to control the display scale.\n\n" +
            "**Performance.** One group aggregate for all three measures.\n\n" +
            "**Interview mindset.** Combine COUNT/SUM/AVG in one GROUP BY rather than several queries.",
          tsql:
            "SELECT Category,\n" +
            "       COUNT(*)                         AS Orders,\n" +
            "       SUM(Amount)                      AS Revenue,\n" +
            "       CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgOrder\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT Category,\n" +
            "       COUNT(*) AS Orders,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgOrder\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;"
        }
      ],
      walkthrough: [
        { step: "Aggregate per category", note: "Electronics: 3 orders, 450 total, 150 avg. Books: 2, 60, 30.",
          table: { columns: ["Category","Orders","Revenue","AvgOrder"],
            rows: [["Electronics",3,"450.00","150.00"],["Books",2,"60.00","30.00"]] } }
      ],
      patternRecognition: [
        "'count, total AND average per X' → one GROUP BY with multiple aggregate expressions."
      ],
      interviewRecall: [
        "Several aggregates share one GROUP BY pass.",
        "AVG over INT truncates; use DECIMAL or CAST for fractional accuracy."
      ],
      commonMistakes: [
        "Writing three separate grouped queries instead of one.",
        "Letting integer AVG silently truncate the average."
      ]
    }
  ]);
})();
