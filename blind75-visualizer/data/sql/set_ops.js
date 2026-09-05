/*
 * data/set_ops.js — Set Operations.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Set Operations", [

    {
      id: "customers-in-both-years",
      number: "SS 10222",
      platform: "StrataScratch",
      title: "Customers Active in Both Years",
      difficulty: "Medium",
      category: "Set Operations",
      topics: ["Set Operations"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Set intersection", sqlConcept: "INTERSECT", technique: "Common rows of two queries" },
      descriptionBrief:
        "Given **Orders(CustomerId, OrderYear)**, return the customers who placed an order " +
        "in **both 2023 and 2024**.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderYear", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, OrderYear INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,2023),(2,1,2024),(3,2,2023),(4,3,2024),(5,3,2024),(6,1,2023);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","OrderYear"],
          rows: [[1,1,2023],[2,1,2024],[3,2,2023],[4,3,2024],[5,3,2024],[6,1,2023]] }
      ],
      expectedOutput: { columns: ["CustomerId"], rows: [[1]] },
      approaches: [
        {
          name: "INTERSECT (recommended)",
          perfNote: "INTERSECT returns distinct rows common to both queries and de-duplicates automatically — no GROUP BY or DISTINCT needed.",
          dialectNote: "INTERSECT compares whole rows and treats two NULLs as equal (unlike '=').",
          logic:
            "**What it asks.** Customers appearing in both the 2023 set and the 2024 set.\n\n" +
            "**Why the naive idea fails.** `WHERE OrderYear IN (2023,2024)` returns customers in *either* year; you need membership in *both*.\n\n" +
            "**Key Idea.** Intersect the set of 2023 customers with the set of 2024 customers; only those in both survive.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `SELECT CustomerId … WHERE OrderYear = 2023`.\n" +
            "2. `INTERSECT`.\n" +
            "3. `SELECT CustomerId … WHERE OrderYear = 2024`.\n\n" +
            "**Why it works.** INTERSECT keeps distinct rows present in both result sets — exactly 'active in both years'.\n\n" +
            "**Common Gotchas.** INTERSECT already returns DISTINCT rows; customer 1's repeat 2023 rows don't matter.\n\n" +
            "**Performance.** Two indexed range scans + a hash match; comparable to a GROUP BY/HAVING approach.\n\n" +
            "**Interview mindset.** 'in both sets' → INTERSECT; 'in A but not B' → EXCEPT; 'in either' → UNION.",
          tsql:
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2023\n" +
            "INTERSECT\n" +
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2024;",
          clean:
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2023\n" +
            "INTERSECT\n" +
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2024;"
        },
        {
          name: "GROUP BY … HAVING",
          perfNote: "Filter to the two years, then require both distinct years per customer; one grouped pass, no set operator.",
          dialectNote: "",
          logic:
            "**Key Idea.** Restrict to 2023/2024, group by customer, and keep those with two distinct years.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `WHERE OrderYear IN (2023,2024)`.\n" +
            "2. `GROUP BY CustomerId`.\n" +
            "3. `HAVING COUNT(DISTINCT OrderYear) = 2`.\n\n" +
            "**Why it works.** After restricting to the two years, needing both is exactly two distinct years present.\n\n" +
            "**Common Gotchas.** Use COUNT(DISTINCT OrderYear); customer 1 has two 2023 rows.\n\n" +
            "**Performance.** One filtered group aggregate.\n\n" +
            "**Interview mindset.** The 'has all of a fixed set' pattern, reused for set intersection.",
          tsql:
            "SELECT CustomerId\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderYear IN (2023, 2024)\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(DISTINCT OrderYear) = 2;",
          clean:
            "SELECT CustomerId\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderYear IN (2023, 2024)\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(DISTINCT OrderYear) = 2;"
        }
      ],
      walkthrough: [
        { step: "2023 customers ∩ 2024 customers", note: "2023: {1,2}; 2024: {1,3}; intersection: {1}.",
          table: { columns: ["CustomerId"], rows: [[1]] } }
      ],
      patternRecognition: [
        "'in both' → INTERSECT; 'in A not B' → EXCEPT; 'in either' → UNION."
      ],
      interviewRecall: [
        "INTERSECT/EXCEPT/UNION dedupe by default; UNION ALL keeps duplicates.",
        "Set operators compare entire rows and treat NULLs as equal."
      ],
      commonMistakes: [
        "Using IN (2023,2024) alone and returning 'either-year' customers.",
        "Forgetting that column lists and types must line up across the set operator."
      ]
    },

    {
      id: "churned-customers-except",
      number: "DL 10240",
      platform: "DataLemur",
      title: "Customers Who Churned (Last Year, Not This Year)",
      difficulty: "Medium",
      category: "Set Operations",
      topics: ["Set Operations"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Set difference", sqlConcept: "EXCEPT", technique: "Rows in A but not B" },
      descriptionBrief:
        "Given **Orders(CustomerId, OrderYear)**, return the customers who ordered in **2023 " +
        "but did NOT order in 2024** (churned).",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderYear", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, OrderYear INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,2023),(2,1,2024),(3,2,2023),(4,3,2024),(5,2,2023);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","OrderYear"],
          rows: [[1,1,2023],[2,1,2024],[3,2,2023],[4,3,2024],[5,2,2023]] }
      ],
      expectedOutput: { columns: ["CustomerId"], rows: [[2]] },
      approaches: [
        {
          name: "EXCEPT (recommended)",
          perfNote: "EXCEPT returns distinct rows in the first query not present in the second, de-duplicating automatically — no NOT IN / NOT EXISTS wiring.",
          dialectNote: "EXCEPT compares whole rows and treats NULLs as equal, unlike NOT IN.",
          logic:
            "**What it asks.** Customers present in 2023 but absent in 2024.\n\n" +
            "**Why the naive idea fails.** A single filtered query can't express 'in this set and not that set' directly; and `NOT IN` over a nullable subquery is fragile.\n\n" +
            "**Key Idea.** Subtract the 2024-customer set from the 2023-customer set with `EXCEPT`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `SELECT CustomerId … WHERE OrderYear = 2023`.\n" +
            "2. `EXCEPT`.\n" +
            "3. `SELECT CustomerId … WHERE OrderYear = 2024`.\n\n" +
            "**Why it works.** EXCEPT keeps distinct left rows that have no match on the right — exactly 'ordered in 2023, not in 2024'.\n\n" +
            "**Common Gotchas.** EXCEPT is directional (A EXCEPT B ≠ B EXCEPT A) and already returns DISTINCT.\n\n" +
            "**Performance.** Two indexed scans + a hash/merge difference.\n\n" +
            "**Interview mindset.** 'in A but not B / churned / dropped off' → EXCEPT.",
          tsql:
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2023\n" +
            "EXCEPT\n" +
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2024;",
          clean:
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2023\n" +
            "EXCEPT\n" +
            "SELECT CustomerId FROM dbo.Orders WHERE OrderYear = 2024;"
        },
        {
          name: "NOT EXISTS",
          perfNote: "An anti-join alternative; explicit and index-friendly, and the natural choice when you also need non-key columns.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep distinct 2023 customers for whom no 2024 order exists.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Select distinct 2023 customers.\n" +
            "2. Filter with `NOT EXISTS` a correlated 2024 order for the same customer.\n\n" +
            "**Why it works.** The anti-join removes anyone who reappears in 2024.\n\n" +
            "**Common Gotchas.** Remember DISTINCT (customer 2 has two 2023 rows); NOT EXISTS is NULL-safe unlike NOT IN.\n\n" +
            "**Performance.** Anti-semi-join; index CustomerId, OrderYear.\n\n" +
            "**Interview mindset.** The set-difference idea expressed as an anti-join.",
          tsql:
            "SELECT DISTINCT o.CustomerId\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.OrderYear = 2023\n" +
            "  AND NOT EXISTS (SELECT 1 FROM dbo.Orders n\n" +
            "                  WHERE n.CustomerId = o.CustomerId AND n.OrderYear = 2024);",
          clean:
            "SELECT DISTINCT o.CustomerId\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.OrderYear = 2023\n" +
            "  AND NOT EXISTS (SELECT 1 FROM dbo.Orders n WHERE n.CustomerId = o.CustomerId AND n.OrderYear = 2024);"
        }
      ],
      walkthrough: [
        { step: "2023 customers minus 2024 customers", note: "2023: {1,2}; 2024: {1,3}; difference: {2}.",
          table: { columns: ["CustomerId"], rows: [[2]] } }
      ],
      patternRecognition: [
        "'in A but not B / churned / removed' → EXCEPT (directional set difference) or an anti-join."
      ],
      interviewRecall: [
        "EXCEPT is directional and returns DISTINCT rows.",
        "EXCEPT/NOT EXISTS are NULL-safe; NOT IN is not."
      ],
      commonMistakes: [
        "Reversing the operands (B EXCEPT A) and getting the wrong side.",
        "Omitting DISTINCT in the NOT EXISTS variant when a customer has multiple 2023 rows."
      ]
    }

  ]);
})();
