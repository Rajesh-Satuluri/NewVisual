/*
 * data/joins.js — Joins.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Joins", [

    {
      id: "employees-with-manager-name",
      number: "LC 181",
      platform: "LeetCode",
      title: "Employees Earning More Than Their Manager",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/employees-earning-more-than-their-managers/",
      meta: { pattern: "Self-join", sqlConcept: "INNER JOIN on same table", technique: "Row-to-row comparison" },
      descriptionBrief:
        "An **Employee** table has each person's `Salary` and their `ManagerId` (referencing " +
        "another row in the same table). Return the names of employees who earn **more than " +
        "their own manager**.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" },
          { name: "ManagerId", type: "INT", note: "FK → Employee.Id (nullable)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), Salary INT, ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Joe',70000,3),(2,'Henry',80000,4),(3,'Sam',60000,NULL),(4,'Max',90000,NULL);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","Salary","ManagerId"],
          rows: [[1,"Joe",70000,3],[2,"Henry",80000,4],[3,"Sam",60000,null],[4,"Max",90000,null]] }
      ],
      expectedOutput: { columns: ["Employee"], rows: [["Joe"]] },
      approaches: [
        {
          name: "Self-join (recommended)",
          perfNote: "One INNER JOIN of the table to itself on ManagerId = Id; an index on Id (the PK) makes the manager lookup a seek.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees whose salary beats their manager's.\n\n" +
            "**Why the naive idea fails.** Manager salary lives in another row of the same table, so a single-row scan can't see it — you need to bring the manager's row alongside the employee's.\n\n" +
            "**Key Idea.** Join the table to itself: alias one copy as the employee `e`, the other as the manager `m`, matched on `e.ManagerId = m.Id`, then compare salaries.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Employee e JOIN Employee m ON e.ManagerId = m.Id`.\n" +
            "2. `WHERE e.Salary > m.Salary`.\n" +
            "3. Project `e.Name`.\n\n" +
            "**Why it works.** The self-join pairs each employee with exactly their manager's row, making the cross-row comparison a normal column comparison.\n\n" +
            "**Common Gotchas.** INNER JOIN naturally drops employees whose `ManagerId` is NULL (top of the org) — correct here, since they have no manager to beat.\n\n" +
            "**Performance.** Two references to one table; the PK on `Id` supports the manager seek.\n\n" +
            "**Interview mindset.** 'compare a row to a related row in the same table' → self-join.",
          tsql:
            "SELECT e.Name AS Employee\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Employee m ON e.ManagerId = m.Id   -- m = this employee's manager\n" +
            "WHERE e.Salary > m.Salary;",
          clean:
            "SELECT e.Name AS Employee\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Employee m ON e.ManagerId = m.Id\n" +
            "WHERE e.Salary > m.Salary;"
        }
      ],
      walkthrough: [
        { step: "Pair each employee with their manager", note: "Joe↔Sam, Henry↔Max; Sam & Max have no manager (dropped).",
          table: { columns: ["Employee","EmpSalary","Manager","MgrSalary"],
            rows: [["Joe",70000,"Sam",60000],["Henry",80000,"Max",90000]] } },
        { step: "Keep EmpSalary > MgrSalary",
          table: { columns: ["Employee"], rows: [["Joe"]] } }
      ],
      patternRecognition: [
        "'compare a row to another row in the same table (manager, parent, previous)' → self-join."
      ],
      interviewRecall: [
        "Alias both copies of the table; INNER JOIN drops rows whose join key (ManagerId) is NULL."
      ],
      commonMistakes: [
        "Forgetting table aliases, making column references ambiguous.",
        "Expecting NULL-manager employees to appear under an INNER JOIN."
      ]
    },

    {
      id: "orders-with-customer-and-total",
      number: "SS 10182",
      platform: "StrataScratch",
      title: "Total Spend per Customer",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Join then aggregate", sqlConcept: "LEFT JOIN + GROUP BY", technique: "Preserve zero-order customers" },
      descriptionBrief:
        "Given **Customers** and **Orders(Amount)**, return every customer and their **total " +
        "order amount**. Customers with no orders should show **0**, not be dropped.",
      schema: [
        { name: "Customers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT", note: "FK → Customers.Id" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, Amount INT);\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cara');\n" +
        "INSERT INTO dbo.Orders VALUES (1,1,100),(2,1,50),(3,3,200);",
      sampleData: [
        { table: "Customers", columns: ["Id","Name"], rows: [[1,"Ana"],[2,"Ben"],[3,"Cara"]] },
        { table: "Orders", columns: ["Id","CustomerId","Amount"], rows: [[1,1,100],[2,1,50],[3,3,200]] }
      ],
      expectedOutput: { columns: ["Name","TotalSpend"], rows: [["Ana",150],["Ben",0],["Cara",200]] },
      approaches: [
        {
          name: "LEFT JOIN + GROUP BY (recommended)",
          perfNote: "LEFT JOIN keeps zero-order customers; SUM over NULL amounts is NULL, so wrap in ISNULL/COALESCE to render 0.",
          dialectNote: "",
          logic:
            "**What it asks.** Total spend per customer, including customers who never ordered (as 0).\n\n" +
            "**Why the naive idea fails.** An INNER JOIN drops customers with no orders, so Ben would vanish; and `SUM` of an all-NULL group is NULL, not 0.\n\n" +
            "**Key Idea.** LEFT JOIN customers to their orders so everyone survives, `SUM(Amount)` per customer, and convert the NULL sum for order-less customers to 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN Orders` on `CustomerId = Id`.\n" +
            "2. `GROUP BY` customer.\n" +
            "3. `ISNULL(SUM(Amount), 0)` for the total.\n\n" +
            "**Why it works.** LEFT JOIN preserves unmatched customers with NULL amounts; ISNULL turns the resulting NULL sum into 0.\n\n" +
            "**Common Gotchas.** Group by a unique customer key (Id) and carry Name along; SUM of no rows is NULL — coalesce it.\n\n" +
            "**Performance.** One outer join + one group aggregate.\n\n" +
            "**Interview mindset.** 'per X including empties' → LEFT JOIN + GROUP BY + ISNULL.",
          tsql:
            "SELECT c.Name,\n" +
            "       ISNULL(SUM(o.Amount), 0) AS TotalSpend   -- 0 for customers with no orders\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "GROUP BY c.Id, c.Name\n" +
            "ORDER BY c.Name;",
          clean:
            "SELECT c.Name, ISNULL(SUM(o.Amount), 0) AS TotalSpend\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "GROUP BY c.Id, c.Name\n" +
            "ORDER BY c.Name;"
        }
      ],
      walkthrough: [
        { step: "LEFT JOIN customers to orders", note: "Ben has no order → NULL amount.",
          table: { columns: ["Name","Amount"], rows: [["Ana",100],["Ana",50],["Ben",null],["Cara",200]] } },
        { step: "GROUP BY + ISNULL(SUM,0)",
          table: { columns: ["Name","TotalSpend"], rows: [["Ana",150],["Ben",0],["Cara",200]] } }
      ],
      patternRecognition: [
        "'per customer including those with none' → LEFT JOIN (not INNER) + GROUP BY.",
        "SUM over an all-NULL group is NULL → wrap in ISNULL/COALESCE."
      ],
      interviewRecall: [
        "INNER JOIN drops the empty side; LEFT JOIN keeps it with NULLs.",
        "GROUP BY the unique key and carry descriptive columns along."
      ],
      commonMistakes: [
        "Using INNER JOIN and silently dropping zero-order customers.",
        "Returning NULL instead of 0 for customers with no orders."
      ]
    }

  ]);
})();
