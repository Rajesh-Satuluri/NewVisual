/*
 * data/cte_joins.js — CTE & Complex Joins.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("CTE & Complex Joins", [

    {
      id: "second-highest-per-department",
      number: "DL 10352",
      platform: "DataLemur",
      title: "Second-Highest Salary per Department",
      difficulty: "Hard",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Ranking", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Per-group Nth via CTE", sqlConcept: "CTE + DENSE_RANK", technique: "Rank inside a CTE, filter outside" },
      descriptionBrief:
        "Given **Employee(DeptId, Salary)**, return the **second-highest distinct salary in " +
        "each department**. Departments without a second distinct salary are omitted.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "DeptId", type: "INT" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, DeptId INT, Salary INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,10,9000),(2,10,9000),(3,10,7000),(4,10,5000),\n" +
        "  (5,20,8000),(6,20,6000),(7,30,4000);",
      sampleData: [
        { table: "Employee", columns: ["Id","DeptId","Salary"],
          rows: [[1,10,9000],[2,10,9000],[3,10,7000],[4,10,5000],[5,20,8000],[6,20,6000],[7,30,4000]] }
      ],
      expectedOutput: { columns: ["DeptId","SecondHighest"], rows: [[10,7000],[20,6000]] },
      approaches: [
        {
          name: "CTE + DENSE_RANK (recommended)",
          perfNote: "One partitioned window pass in the CTE; DENSE_RANK collapses tied top salaries so rank 2 is the true second-distinct level. Dept 30 has only one level, so it's absent.",
          dialectNote: "",
          logic:
            "**What it asks.** The 2nd distinct salary within each department.\n\n" +
            "**Why the naive idea fails.** A department-wide `MAX` gives only the top; excluding it and taking another MAX is clumsy across many departments, and duplicate top salaries (dept 10 has two 9000s) break row-offset tricks.\n\n" +
            "**Key Idea.** In a CTE, rank salaries *within* each department with `DENSE_RANK() OVER (PARTITION BY DeptId ORDER BY Salary DESC)`; then, outside the CTE, keep rank 2.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE computes the per-department dense rank of each row.\n" +
            "2. Outer query filters `rnk = 2`.\n" +
            "3. `SELECT DISTINCT` (or GROUP BY) so a department yields one value.\n\n" +
            "**Why it works.** DENSE_RANK ranks distinct salary levels per partition, so rank 2 is exactly the second-highest distinct salary — ties at the top don't shift it.\n\n" +
            "**Common Gotchas.** Departments lacking a rank-2 level (dept 30) simply produce no row — usually the intended behavior.\n\n" +
            "**Performance.** Single window sort per partition; the CTE is not materialized, just a named subquery.\n\n" +
            "**Interview mindset.** 'Nth distinct per group' → partitioned DENSE_RANK inside a CTE, filter outside.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT DeptId, Salary,\n" +
            "           DENSE_RANK() OVER (PARTITION BY DeptId\n" +
            "                              ORDER BY Salary DESC) AS rnk\n" +
            "    FROM dbo.Employee\n" +
            ")\n" +
            "SELECT DISTINCT DeptId, Salary AS SecondHighest\n" +
            "FROM Ranked\n" +
            "WHERE rnk = 2\n" +
            "ORDER BY DeptId;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT DeptId, Salary,\n" +
            "           DENSE_RANK() OVER (PARTITION BY DeptId ORDER BY Salary DESC) AS rnk\n" +
            "    FROM dbo.Employee\n" +
            ")\n" +
            "SELECT DISTINCT DeptId, Salary AS SecondHighest\n" +
            "FROM Ranked\n" +
            "WHERE rnk = 2\n" +
            "ORDER BY DeptId;"
        }
      ],
      walkthrough: [
        { step: "DENSE_RANK per department", note: "Dept 10: 9000,9000→1, 7000→2, 5000→3. Dept 20: 8000→1, 6000→2. Dept 30: 4000→1.",
          table: { columns: ["DeptId","Salary","rnk"],
            rows: [[10,9000,1],[10,9000,1],[10,7000,2],[10,5000,3],[20,8000,1],[20,6000,2],[30,4000,1]] } },
        { step: "Keep rnk = 2 (distinct)",
          table: { columns: ["DeptId","SecondHighest"], rows: [[10,7000],[20,6000]] } }
      ],
      patternRecognition: [
        "'Nth highest per group' → CTE with partitioned DENSE_RANK, filter rank = N outside."
      ],
      interviewRecall: [
        "A CTE names a subquery so the windowed rank can be filtered in the outer query (you can't filter a window function in WHERE directly).",
        "DENSE_RANK for 'distinct level'; ROW_NUMBER for 'exact row'."
      ],
      commonMistakes: [
        "Filtering on the window function in WHERE of the same SELECT (not allowed) — needs the CTE/subquery.",
        "Using ROW_NUMBER and getting a wrong second value when the top salary is tied."
      ]
    },

    {
      id: "customers-both-categories",
      number: "SS 10192",
      platform: "StrataScratch",
      title: "Customers Who Bought Two Categories",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Relational division", sqlConcept: "CTE + COUNT(DISTINCT)", technique: "Group with a completeness test" },
      descriptionBrief:
        "Given **Purchases(CustomerId, Category)**, return the customers who have bought from " +
        "**both** the 'Books' and 'Electronics' categories.",
      schema: [
        { name: "Purchases", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Category", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Purchases','U') IS NOT NULL DROP TABLE dbo.Purchases;\n" +
        "CREATE TABLE dbo.Purchases (Id INT PRIMARY KEY, CustomerId INT, Category VARCHAR(30));\n" +
        "INSERT INTO dbo.Purchases VALUES\n" +
        "  (1,1,'Books'),(2,1,'Electronics'),(3,2,'Books'),(4,2,'Books'),\n" +
        "  (5,3,'Electronics'),(6,3,'Books'),(7,4,'Toys');",
      sampleData: [
        { table: "Purchases", columns: ["Id","CustomerId","Category"],
          rows: [[1,1,"Books"],[2,1,"Electronics"],[3,2,"Books"],[4,2,"Books"],[5,3,"Electronics"],[6,3,"Books"],[7,4,"Toys"]] }
      ],
      expectedOutput: { columns: ["CustomerId"], rows: [[1],[3]] },
      approaches: [
        {
          name: "CTE + COUNT(DISTINCT) (recommended)",
          perfNote: "Filter to the two categories first, then require both distinct values per customer; a single grouped aggregate, no self-join.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers present in *both* target categories.\n\n" +
            "**Why the naive idea fails.** `WHERE Category IN ('Books','Electronics')` alone returns customers in *either*; and self-joining Books rows to Electronics rows is clumsier than counting.\n\n" +
            "**Key Idea.** Restrict to the two categories, then keep customers whose count of *distinct* categories equals 2 — a small relational-division test.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE filters `Category IN ('Books','Electronics')`.\n" +
            "2. `GROUP BY CustomerId`.\n" +
            "3. `HAVING COUNT(DISTINCT Category) = 2`.\n\n" +
            "**Why it works.** After restricting to the two categories, needing both is exactly 'two distinct categories present'. DISTINCT guards against customer 2's repeated Books rows counting twice.\n\n" +
            "**Common Gotchas.** Use `COUNT(DISTINCT Category)`, not `COUNT(*)` — customer 2 has two Books rows but only one category.\n\n" +
            "**Performance.** One filtered scan + one group aggregate.\n\n" +
            "**Interview mindset.** 'bought/has ALL of these' → filter to the set, GROUP BY entity, HAVING COUNT(DISTINCT) = size of set.",
          tsql:
            "WITH Filtered AS (\n" +
            "    SELECT CustomerId, Category\n" +
            "    FROM dbo.Purchases\n" +
            "    WHERE Category IN ('Books','Electronics')\n" +
            ")\n" +
            "SELECT CustomerId\n" +
            "FROM Filtered\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(DISTINCT Category) = 2   -- present in BOTH\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH Filtered AS (\n" +
            "    SELECT CustomerId, Category\n" +
            "    FROM dbo.Purchases\n" +
            "    WHERE Category IN ('Books','Electronics')\n" +
            ")\n" +
            "SELECT CustomerId\n" +
            "FROM Filtered\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(DISTINCT Category) = 2\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Filter to the two categories, distinct count per customer", note: "Cust 1 & 3 have both; cust 2 only Books; cust 4 filtered out.",
          table: { columns: ["CustomerId","DistinctCats"], rows: [[1,2],[2,1],[3,2]] } },
        { step: "Keep count = 2",
          table: { columns: ["CustomerId"], rows: [[1],[3]] } }
      ],
      patternRecognition: [
        "'has ALL of a fixed set' → filter to the set, GROUP BY, HAVING COUNT(DISTINCT) = set size."
      ],
      interviewRecall: [
        "COUNT(DISTINCT col) guards against repeated rows inflating the count.",
        "'Both/all' → count distinct; 'either/any' → simple IN filter."
      ],
      commonMistakes: [
        "Using COUNT(*) and over-counting customers with repeats in one category.",
        "Returning 'either category' customers because the completeness HAVING was omitted."
      ]
    }

  ]);
})();
