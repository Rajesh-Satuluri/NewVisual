/*
 * data/filtering_subqueries.js — Filtering & Subqueries.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Filtering & Subqueries", [

    {
      id: "customers-who-never-order",
      number: "LC 183",
      platform: "LeetCode",
      title: "Customers Who Never Order",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Joins"],
      domains: ["Sales Analytics"],
      link: "https://leetcode.com/problems/customers-who-never-order/",
      meta: { pattern: "Anti-join", sqlConcept: "NOT EXISTS", technique: "Absence of matching row" },
      descriptionBrief:
        "Given **Customers** and **Orders**, return the names of customers who have " +
        "**never placed an order** (no matching row in Orders).",
      schema: [
        { name: "Customers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT", note: "FK → Customers.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT);\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Joe'),(2,'Henry'),(3,'Sam'),(4,'Max');\n" +
        "INSERT INTO dbo.Orders VALUES (1,3),(2,1);",
      sampleData: [
        { table: "Customers", columns: ["Id","Name"], rows: [[1,"Joe"],[2,"Henry"],[3,"Sam"],[4,"Max"]] },
        { table: "Orders", columns: ["Id","CustomerId"], rows: [[1,3],[2,1]] }
      ],
      expectedOutput: { columns: ["Customers"], rows: [["Henry"],["Max"]] },
      approaches: [
        {
          name: "NOT EXISTS (recommended)",
          perfNote: "Anti-semi-join; short-circuits on the first matching order, NULL-safe, and usually gets the best plan with an index on Orders.CustomerId.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers with zero orders.\n\n" +
            "**Why the naive idea fails.** `NOT IN (SELECT CustomerId FROM Orders)` silently returns nothing if any CustomerId is NULL, because `x NOT IN (…, NULL)` is never true.\n\n" +
            "**Key Idea.** Keep a customer only when **no** order row references them — an anti-join expressed with `NOT EXISTS`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Customers`.\n" +
            "2. For each, test a correlated `NOT EXISTS` against `Orders` on `CustomerId = c.Id`.\n" +
            "3. Emit the name when the subquery finds nothing.\n\n" +
            "**Why it works.** EXISTS returns true/false (never NULL), so NULLs in Orders can't poison the result the way NOT IN does.\n\n" +
            "**Common Gotchas.** Prefer NOT EXISTS over NOT IN on nullable columns.\n\n" +
            "**Performance.** Anti-semi-join; an index on `Orders.CustomerId` turns each probe into a seek.\n\n" +
            "**Interview mindset.** 'who never / who has no matching row' → anti-join via NOT EXISTS.",
          tsql:
            "SELECT c.Name AS Customers\n" +
            "FROM dbo.Customers c\n" +
            "WHERE NOT EXISTS (            -- keep customers with no order\n" +
            "    SELECT 1 FROM dbo.Orders o WHERE o.CustomerId = c.Id\n" +
            ");",
          clean:
            "SELECT c.Name AS Customers\n" +
            "FROM dbo.Customers c\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Orders o WHERE o.CustomerId = c.Id);"
        },
        {
          name: "LEFT JOIN … IS NULL",
          perfNote: "Outer-join then filter the non-matches; equivalent plan, and reads well when you already need columns from both sides.",
          dialectNote: "",
          logic:
            "**Key Idea.** LEFT JOIN every customer to their orders; rows with no match get NULLs on the Orders side — those are exactly the customers who never ordered.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN Orders` on `CustomerId = Id`.\n" +
            "2. Keep rows where `o.Id IS NULL` (no order matched).\n\n" +
            "**Why it works.** A LEFT JOIN preserves unmatched left rows with NULLs; filtering on a NON-nullable order key = NULL isolates them.\n\n" +
            "**Common Gotchas.** Filter on a column that is NULL only for non-matches (the order PK), not on a column that could be NULL in real data.\n\n" +
            "**Performance.** Comparable to NOT EXISTS; the optimizer often produces the same anti-join.\n\n" +
            "**Interview mindset.** The classic 'anti-join via LEFT JOIN / IS NULL' phrasing.",
          tsql:
            "SELECT c.Name AS Customers\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "WHERE o.Id IS NULL;          -- no order matched\n",
          clean:
            "SELECT c.Name AS Customers\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "WHERE o.Id IS NULL;"
        }
      ],
      walkthrough: [
        { step: "LEFT JOIN customers to orders", note: "Joe & Sam match an order; Henry & Max get NULLs.",
          table: { columns: ["Name","OrderId"], rows: [["Joe",2],["Henry",null],["Sam",1],["Max",null]] } },
        { step: "Keep rows with no matching order",
          table: { columns: ["Customers"], rows: [["Henry"],["Max"]] } }
      ],
      patternRecognition: [
        "'who never / has no matching row' → anti-join (NOT EXISTS or LEFT JOIN … IS NULL)."
      ],
      interviewRecall: [
        "NOT EXISTS is NULL-safe; NOT IN breaks if the subquery yields a NULL.",
        "EXISTS stops at the first match — often cheaper than materializing a full list."
      ],
      commonMistakes: [
        "Using NOT IN over a nullable column — one NULL makes the whole predicate return no rows.",
        "Filtering LEFT JOIN on a nullable data column instead of the unmatched key."
      ]
    },

    {
      id: "above-average-salary",
      number: "SS 9917",
      platform: "StrataScratch",
      title: "Employees Earning Above the Average",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Scalar subquery threshold", sqlConcept: "Subquery in WHERE", technique: "Compare to aggregate" },
      descriptionBrief:
        "From an **Employees** table, return everyone whose salary is **strictly greater " +
        "than the company-wide average salary**, highest first.",
      schema: [
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, Name VARCHAR(50), Salary INT);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Ana',5000),(2,'Ben',7000),(3,'Cara',4000),(4,'Dan',9000),(5,'Eve',6000);",
      sampleData: [
        { table: "Employees", columns: ["Id","Name","Salary"],
          rows: [[1,"Ana",5000],[2,"Ben",7000],[3,"Cara",4000],[4,"Dan",9000],[5,"Eve",6000]] }
      ],
      expectedOutput: { columns: ["Name","Salary"], rows: [["Dan",9000],["Ben",7000]] },
      approaches: [
        {
          name: "Scalar subquery in WHERE (recommended)",
          perfNote: "The AVG subquery is uncorrelated, so SQL Server evaluates it once and reuses the constant across the scan.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees paid above the overall average.\n\n" +
            "**Why the naive idea fails.** You can't put a bare `AVG(Salary)` in WHERE — aggregates aren't allowed there; the average must come from a subquery (or HAVING on a grouped set).\n\n" +
            "**Key Idea.** Compute the average once with a scalar subquery and compare each row's salary to it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `(SELECT AVG(Salary) FROM Employees)` yields one number.\n" +
            "2. Keep rows where `Salary >` that number.\n" +
            "3. Order by salary descending.\n\n" +
            "**Why it works.** The uncorrelated subquery is a constant for the whole query, so the comparison is a simple filter.\n\n" +
            "**Common Gotchas.** Integer `AVG` truncates; cast to a decimal if fractional accuracy matters. Average here is 6200, so only 7000 and 9000 qualify.\n\n" +
            "**Performance.** One aggregate pass + one filtered scan.\n\n" +
            "**Interview mindset.** 'above/below the average' → compare to a scalar subquery.",
          tsql:
            "SELECT Name, Salary\n" +
            "FROM dbo.Employees\n" +
            "WHERE Salary > (SELECT AVG(Salary) FROM dbo.Employees)  -- company average\n" +
            "ORDER BY Salary DESC;",
          clean:
            "SELECT Name, Salary\n" +
            "FROM dbo.Employees\n" +
            "WHERE Salary > (SELECT AVG(Salary) FROM dbo.Employees)\n" +
            "ORDER BY Salary DESC;"
        }
      ],
      walkthrough: [
        { step: "Company average", note: "AVG(5000,7000,4000,9000,6000) = 6200.",
          table: { columns: ["AvgSalary"], rows: [[6200]] } },
        { step: "Keep Salary > 6200",
          table: { columns: ["Name","Salary"], rows: [["Dan",9000],["Ben",7000]] } }
      ],
      patternRecognition: [
        "'greater/less than the average/total' → scalar subquery in WHERE."
      ],
      interviewRecall: [
        "Aggregates are illegal in WHERE; use a subquery or HAVING.",
        "Integer AVG truncates in T-SQL — CAST to DECIMAL for exact averages."
      ],
      commonMistakes: [
        "Writing `WHERE Salary > AVG(Salary)` (aggregate not allowed in WHERE).",
        "Forgetting integer division/truncation on an INT column."
      ]
    },

    {
      id: "duplicate-emails",
      number: "LC 182",
      platform: "LeetCode",
      title: "Find Duplicate Emails",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["Marketing Analytics"],
      link: "https://leetcode.com/problems/duplicate-emails/",
      meta: { pattern: "Group then filter", sqlConcept: "GROUP BY + HAVING", technique: "Count > 1" },
      descriptionBrief:
        "Given a **Person** table, return each email address that appears **more than once**.",
      schema: [
        { name: "Person", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Email", type: "VARCHAR(100)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Person','U') IS NOT NULL DROP TABLE dbo.Person;\n" +
        "CREATE TABLE dbo.Person (Id INT PRIMARY KEY, Email VARCHAR(100));\n" +
        "INSERT INTO dbo.Person VALUES (1,'a@x.com'),(2,'c@x.com'),(3,'a@x.com'),(4,'a@x.com'),(5,'c@x.com');",
      sampleData: [
        { table: "Person", columns: ["Id","Email"],
          rows: [[1,"a@x.com"],[2,"c@x.com"],[3,"a@x.com"],[4,"a@x.com"],[5,"c@x.com"]] }
      ],
      expectedOutput: { columns: ["Email"], rows: [["a@x.com"],["c@x.com"]] },
      approaches: [
        {
          name: "GROUP BY … HAVING COUNT(*) > 1 (recommended)",
          perfNote: "Single grouped aggregate; HAVING filters groups after counting. An index on Email supports a stream aggregate.",
          dialectNote: "",
          logic:
            "**What it asks.** Emails shared by two or more people.\n\n" +
            "**Why the naive idea fails.** A WHERE clause can't test a per-group count — counting happens during grouping, so the filter must be HAVING.\n\n" +
            "**Key Idea.** Group by email, count rows per group, and keep only groups whose count exceeds one.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Email`.\n" +
            "2. `HAVING COUNT(*) > 1`.\n" +
            "3. Project the email.\n\n" +
            "**Why it works.** HAVING filters on aggregate results, which WHERE cannot.\n\n" +
            "**Common Gotchas.** WHERE filters rows *before* grouping; HAVING filters groups *after* — using WHERE here is a compile error.\n\n" +
            "**Performance.** One group-aggregate pass.\n\n" +
            "**Interview mindset.** 'appears more than once / has duplicates' → GROUP BY key HAVING COUNT(*) > 1.",
          tsql:
            "SELECT Email\n" +
            "FROM dbo.Person\n" +
            "GROUP BY Email\n" +
            "HAVING COUNT(*) > 1;          -- keep only repeated emails\n",
          clean:
            "SELECT Email\n" +
            "FROM dbo.Person\n" +
            "GROUP BY Email\n" +
            "HAVING COUNT(*) > 1;"
        }
      ],
      walkthrough: [
        { step: "GROUP BY Email with COUNT(*)", note: "a@x.com → 3, c@x.com → 2.",
          table: { columns: ["Email","Cnt"], rows: [["a@x.com",3],["c@x.com",2]] } },
        { step: "Keep COUNT(*) > 1",
          table: { columns: ["Email"], rows: [["a@x.com"],["c@x.com"]] } }
      ],
      patternRecognition: [
        "'duplicate / appears more than once' → GROUP BY key HAVING COUNT(*) > 1."
      ],
      interviewRecall: [
        "WHERE filters rows before grouping; HAVING filters groups after aggregation."
      ],
      commonMistakes: [
        "Trying `WHERE COUNT(*) > 1` — aggregates belong in HAVING, not WHERE."
      ]
    }

  ]);
})();
