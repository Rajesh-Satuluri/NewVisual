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
    },

    {
      id: "products-above-category-average",
      number: "SS 10012",
      platform: "StrataScratch",
      title: "Products Priced Above Their Category Average",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["Retail Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Per-group threshold", sqlConcept: "Correlated subquery", technique: "Compare to group aggregate" },
      descriptionBrief:
        "Given a **Products** table with a `Category` and a `Price`, return every product " +
        "whose price is **strictly above the average price of its own category**, most " +
        "expensive first.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Price", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50), Category VARCHAR(30), Price INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'Apple','Fruit',3),(2,'Banana','Fruit',1),(3,'Cherry','Fruit',5),\n" +
        "  (4,'Carrot','Veg',2),(5,'Potato','Veg',4);",
      sampleData: [
        { table: "Products", columns: ["Id","Name","Category","Price"],
          rows: [[1,"Apple","Fruit",3],[2,"Banana","Fruit",1],[3,"Cherry","Fruit",5],[4,"Carrot","Veg",2],[5,"Potato","Veg",4]] }
      ],
      expectedOutput: { columns: ["Name","Category","Price"], rows: [["Cherry","Fruit",5],["Potato","Veg",4]] },
      approaches: [
        {
          name: "Correlated subquery on category (recommended)",
          perfNote: "The inner AVG re-evaluates per outer row but correlates on Category, so an index on (Category, Price) keeps each probe cheap.",
          dialectNote: "",
          logic:
            "**What it asks.** Products beating the average price *of their own category*, not the global average.\n\n" +
            "**Why the naive idea fails.** A single uncorrelated `(SELECT AVG(Price) FROM Products)` compares every row to one company-wide number, mixing Fruit and Veg together and giving the wrong per-category answer.\n\n" +
            "**Key Idea.** Correlate the average to the outer row's category so each product is compared against the mean of its *own* group.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Products` as the outer query, aliased `p`.\n" +
            "2. In WHERE, compute `(SELECT AVG(p2.Price) FROM Products p2 WHERE p2.Category = p.Category)`.\n" +
            "3. Keep rows where `p.Price >` that per-category average.\n" +
            "4. Order by price descending.\n\n" +
            "**Why it works.** The correlation predicate `p2.Category = p.Category` re-scopes the aggregate to the outer row's group, so the threshold moves per category.\n\n" +
            "**Common Gotchas.** Integer `AVG` truncates in T-SQL; here Fruit avg = 9/3 = 3 and Veg avg = 6/2 = 3 are exact, but cast to DECIMAL when fractions matter.\n\n" +
            "**Performance.** One correlated aggregate per row; an index on `(Category, Price)` turns each into a small range scan.\n\n" +
            "**Interview mindset.** 'above the average *of its group*' → correlated subquery on the grouping key, not a bare scalar subquery.",
          tsql:
            "SELECT p.Name, p.Category, p.Price\n" +
            "FROM dbo.Products p\n" +
            "WHERE p.Price > (                       -- average of THIS product's category\n" +
            "    SELECT AVG(p2.Price)\n" +
            "    FROM dbo.Products p2\n" +
            "    WHERE p2.Category = p.Category\n" +
            ")\n" +
            "ORDER BY p.Price DESC;",
          clean:
            "SELECT p.Name, p.Category, p.Price\n" +
            "FROM dbo.Products p\n" +
            "WHERE p.Price > (SELECT AVG(p2.Price) FROM dbo.Products p2 WHERE p2.Category = p.Category)\n" +
            "ORDER BY p.Price DESC;"
        },
        {
          name: "Window AVG in a CTE",
          perfNote: "Computes each category average once in a single pass with a partitioned window, avoiding the per-row re-scan of the correlated form.",
          dialectNote: "",
          logic:
            "**Key Idea.** Attach the category average to every row with `AVG(Price) OVER (PARTITION BY Category)`, then filter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, select each product plus `AVG(Price) OVER (PARTITION BY Category)` as `CatAvg`.\n" +
            "2. In the outer query keep rows where `Price > CatAvg`.\n" +
            "3. Order by price descending.\n\n" +
            "**Why it works.** The window average is computed per partition in one pass, so no correlated re-scan is needed; the filter then compares each row to its own group's mean.\n\n" +
            "**Common Gotchas.** You cannot reference a window function directly in WHERE — wrap it in a CTE or subquery first.\n\n" +
            "**Performance.** A single partitioned window pass; usually beats the correlated subquery on large tables.\n\n" +
            "**Interview mindset.** When the group aggregate is reused as a threshold, a partitioned window is the one-pass alternative to correlation.",
          tsql:
            "WITH P AS (\n" +
            "    SELECT Name, Category, Price,\n" +
            "           AVG(Price) OVER (PARTITION BY Category) AS CatAvg  -- per-category mean\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Name, Category, Price\n" +
            "FROM P\n" +
            "WHERE Price > CatAvg\n" +
            "ORDER BY Price DESC;",
          clean:
            "WITH P AS (\n" +
            "    SELECT Name, Category, Price, AVG(Price) OVER (PARTITION BY Category) AS CatAvg\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Name, Category, Price\n" +
            "FROM P\n" +
            "WHERE Price > CatAvg\n" +
            "ORDER BY Price DESC;"
        }
      ],
      walkthrough: [
        { step: "Average price per category", note: "Fruit = (3+1+5)/3 = 3; Veg = (2+4)/2 = 3.",
          table: { columns: ["Category","CatAvg"], rows: [["Fruit",3],["Veg",3]] } },
        { step: "Keep Price > its category average", note: "Cherry 5 > 3 and Potato 4 > 3; Apple 3 is not strictly greater.",
          table: { columns: ["Name","Category","Price"], rows: [["Cherry","Fruit",5],["Potato","Veg",4]] } }
      ],
      patternRecognition: [
        "'above/below the average **of its group**' → correlated subquery on the grouping key, or a partitioned window AVG."
      ],
      interviewRecall: [
        "A correlated subquery re-runs per outer row; the correlation predicate scopes its aggregate to that row's group.",
        "Window functions can't sit in WHERE — surface them through a CTE first."
      ],
      commonMistakes: [
        "Comparing to the global average instead of the per-category average.",
        "Using `>=` and pulling in rows that merely equal the average."
      ]
    },

    {
      id: "departments-with-employees-exists",
      number: "SS 10123",
      platform: "StrataScratch",
      title: "Departments That Have At Least One Employee",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Joins"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Semi-join", sqlConcept: "EXISTS", technique: "Presence of matching row" },
      descriptionBrief:
        "Given **Department** and **Employee**, return the names of departments that have " +
        "**at least one employee** assigned to them.",
      schema: [
        { name: "Department", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "DeptId", type: "INT", note: "FK → Department.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "IF OBJECT_ID('dbo.Department','U') IS NOT NULL DROP TABLE dbo.Department;\n" +
        "CREATE TABLE dbo.Department (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), DeptId INT);\n" +
        "INSERT INTO dbo.Department VALUES (1,'Sales'),(2,'Legal'),(3,'Research');\n" +
        "INSERT INTO dbo.Employee VALUES (1,'Ann',1),(2,'Bob',1),(3,'Cy',3);",
      sampleData: [
        { table: "Department", columns: ["Id","Name"], rows: [[1,"Sales"],[2,"Legal"],[3,"Research"]] },
        { table: "Employee", columns: ["Id","Name","DeptId"], rows: [[1,"Ann",1],[2,"Bob",1],[3,"Cy",3]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Research"],["Sales"]] },
      approaches: [
        {
          name: "EXISTS semi-join (recommended)",
          perfNote: "Semi-join that short-circuits on the first matching employee; never duplicates a department the way an inner join can.",
          dialectNote: "",
          logic:
            "**What it asks.** Departments that have one or more employees — Legal (empty) is excluded.\n\n" +
            "**Why the naive idea fails.** An inner `JOIN` between Department and Employee returns one row *per employee*, so Sales (two employees) would appear twice; you'd then need `DISTINCT` to repair it.\n\n" +
            "**Key Idea.** Test only for the *presence* of a matching employee with a correlated `EXISTS`, which yields at most one Department row regardless of how many employees match.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Department` as `d`.\n" +
            "2. For each, evaluate `EXISTS (SELECT 1 FROM Employee e WHERE e.DeptId = d.Id)`.\n" +
            "3. Keep departments where the subquery finds at least one row.\n" +
            "4. Order by name.\n\n" +
            "**Why it works.** EXISTS is a boolean semi-join: it returns true on the first match and stops, emitting the department exactly once.\n\n" +
            "**Common Gotchas.** The `SELECT` list inside EXISTS is irrelevant — `SELECT 1` is idiomatic; the engine only cares whether any row qualifies.\n\n" +
            "**Performance.** An index on `Employee.DeptId` turns each existence probe into a seek that stops at the first hit.\n\n" +
            "**Interview mindset.** 'has at least one / any matching row' → EXISTS semi-join, not an inner join plus DISTINCT.",
          tsql:
            "SELECT d.Name\n" +
            "FROM dbo.Department d\n" +
            "WHERE EXISTS (                -- department has at least one employee\n" +
            "    SELECT 1 FROM dbo.Employee e WHERE e.DeptId = d.Id\n" +
            ")\n" +
            "ORDER BY d.Name;",
          clean:
            "SELECT d.Name\n" +
            "FROM dbo.Department d\n" +
            "WHERE EXISTS (SELECT 1 FROM dbo.Employee e WHERE e.DeptId = d.Id)\n" +
            "ORDER BY d.Name;"
        },
        {
          name: "IN over the DeptId list",
          perfNote: "Reads simply; safe here because DeptId is the semi-join key and non-null. On nullable keys prefer EXISTS.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep a department whose `Id` appears in the set of `DeptId`s actually used by employees.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the list `(SELECT DeptId FROM Employee)`.\n" +
            "2. Keep departments where `d.Id IN` that list.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** A department id present among employee assignments means at least one employee sits in it.\n\n" +
            "**Common Gotchas.** `IN` is safe for presence tests; the NULL trap bites `NOT IN`, not `IN`. Still, EXISTS generalizes better to multi-column matches.\n\n" +
            "**Performance.** The optimizer typically rewrites `IN (subquery)` to the same semi-join as EXISTS.\n\n" +
            "**Interview mindset.** `IN` and `EXISTS` are interchangeable for a positive membership test on a single column.",
          tsql:
            "SELECT d.Name\n" +
            "FROM dbo.Department d\n" +
            "WHERE d.Id IN (SELECT e.DeptId FROM dbo.Employee e)\n" +
            "ORDER BY d.Name;",
          clean:
            "SELECT d.Name\n" +
            "FROM dbo.Department d\n" +
            "WHERE d.Id IN (SELECT e.DeptId FROM dbo.Employee e)\n" +
            "ORDER BY d.Name;"
        }
      ],
      walkthrough: [
        { step: "Which DeptIds are used", note: "Employees reference DeptId 1 (Ann, Bob) and 3 (Cy); 2 is never used.",
          table: { columns: ["DeptId"], rows: [[1],[3]] } },
        { step: "Keep departments present in that set", note: "Sales(1) and Research(3) qualify; Legal(2) is dropped.",
          table: { columns: ["Name"], rows: [["Research"],["Sales"]] } }
      ],
      patternRecognition: [
        "'has at least one / any matching child' → EXISTS (or IN) semi-join, returning each parent once."
      ],
      interviewRecall: [
        "EXISTS returns each outer row at most once; an inner join can multiply rows and needs DISTINCT.",
        "`IN` is safe for presence; the NULL pitfall only affects `NOT IN`."
      ],
      commonMistakes: [
        "Using an inner join and forgetting DISTINCT, duplicating departments with many employees.",
        "Referencing employee columns in the outer SELECT when only the department is wanted."
      ]
    },

    {
      id: "employees-in-nyc-departments",
      number: "DL 2041",
      platform: "DataLemur",
      title: "Employees in NYC-Based Departments",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Joins"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Membership filter", sqlConcept: "IN vs EXISTS", technique: "Filter by related-table set" },
      descriptionBrief:
        "Given **Department** (with a `City`) and **Employee**, return the names of employees " +
        "who work in a department **located in 'NYC'**.",
      schema: [
        { name: "Department", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "City", type: "VARCHAR(30)" } ] },
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "DeptId", type: "INT", note: "FK → Department.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "IF OBJECT_ID('dbo.Department','U') IS NOT NULL DROP TABLE dbo.Department;\n" +
        "CREATE TABLE dbo.Department (Id INT PRIMARY KEY, Name VARCHAR(50), City VARCHAR(30));\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), DeptId INT);\n" +
        "INSERT INTO dbo.Department VALUES (1,'Sales','NYC'),(2,'Legal','LA'),(3,'Research','NYC');\n" +
        "INSERT INTO dbo.Employee VALUES (1,'Ann',1),(2,'Bob',2),(3,'Cy',3),(4,'Di',2);",
      sampleData: [
        { table: "Department", columns: ["Id","Name","City"], rows: [[1,"Sales","NYC"],[2,"Legal","LA"],[3,"Research","NYC"]] },
        { table: "Employee", columns: ["Id","Name","DeptId"], rows: [[1,"Ann",1],[2,"Bob",2],[3,"Cy",3],[4,"Di",2]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Ann"],["Cy"]] },
      approaches: [
        {
          name: "IN a filtered subquery (recommended)",
          perfNote: "Builds the small set of NYC department ids once, then filters employees against it; the optimizer runs it as a semi-join.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees whose department city is NYC — Ann (Sales) and Cy (Research).\n\n" +
            "**Why the naive idea fails.** You can't filter on `Department.City` without reaching the department; a bare `WHERE City = 'NYC'` on Employee alone doesn't compile because Employee has no City column.\n\n" +
            "**Key Idea.** Reduce Department to just the NYC ids, then keep employees whose `DeptId` is in that set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `(SELECT Id FROM Department WHERE City = 'NYC')` → {1, 3}.\n" +
            "2. Keep employees where `DeptId IN` that set.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** Membership in the NYC-department id set is exactly the 'works in an NYC department' condition.\n\n" +
            "**Common Gotchas.** Safe here because `DeptId` is non-null; if it could be NULL, those employees simply fail the positive `IN` test (they'd need special handling only under NOT IN).\n\n" +
            "**Performance.** The subquery yields a tiny list; an index on `Employee.DeptId` supports the probe.\n\n" +
            "**Interview mindset.** 'related row matches a condition' → `IN`/`EXISTS` against a filtered subquery; equivalent to a join + DISTINCT.",
          tsql:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE e.DeptId IN (                    -- ids of NYC departments\n" +
            "    SELECT d.Id FROM dbo.Department d WHERE d.City = 'NYC'\n" +
            ")\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE e.DeptId IN (SELECT d.Id FROM dbo.Department d WHERE d.City = 'NYC')\n" +
            "ORDER BY e.Name;"
        },
        {
          name: "EXISTS correlated on the department",
          perfNote: "Correlated existence test; identical plan to IN here, and the form you extend when the match spans multiple columns.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep an employee when there *exists* a department that both matches their `DeptId` and sits in NYC.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Employee` as `e`.\n" +
            "2. Test `EXISTS (SELECT 1 FROM Department d WHERE d.Id = e.DeptId AND d.City = 'NYC')`.\n" +
            "3. Keep matches and order by name.\n\n" +
            "**Why it works.** The correlated predicate ties each employee to their own department row and adds the city filter inside the same test.\n\n" +
            "**Common Gotchas.** Put the city filter *inside* the EXISTS; moving it outside would require exposing the department columns via a join.\n\n" +
            "**Performance.** Equivalent semi-join to the IN form; preferred when the correlation uses several columns or when the key is nullable.\n\n" +
            "**Interview mindset.** IN and EXISTS express the same semi-join — reach for EXISTS when the match is multi-column or the key may be NULL.",
          tsql:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE EXISTS (\n" +
            "    SELECT 1 FROM dbo.Department d\n" +
            "    WHERE d.Id = e.DeptId AND d.City = 'NYC'\n" +
            ")\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE EXISTS (SELECT 1 FROM dbo.Department d WHERE d.Id = e.DeptId AND d.City = 'NYC')\n" +
            "ORDER BY e.Name;"
        }
      ],
      walkthrough: [
        { step: "NYC department ids", note: "Sales(1) and Research(3) are in NYC; Legal(2) is in LA.",
          table: { columns: ["Id"], rows: [[1],[3]] } },
        { step: "Keep employees whose DeptId is in that set", note: "Ann(1) and Cy(3) qualify; Bob and Di sit in Legal(2).",
          table: { columns: ["Name"], rows: [["Ann"],["Cy"]] } }
      ],
      patternRecognition: [
        "'employee/child matches a condition on the parent' → IN or EXISTS against a filtered subquery on the parent."
      ],
      interviewRecall: [
        "IN and EXISTS are the same semi-join for a positive single-column test; the optimizer usually plans them identically.",
        "Prefer EXISTS when the correlation spans multiple columns or the join key is nullable."
      ],
      commonMistakes: [
        "Trying to filter on a parent-table column without joining or subquerying to it.",
        "Reaching for NOT IN semantics when only a positive membership test is needed."
      ]
    },

    {
      id: "products-costlier-than-all-budget",
      number: "DL 2088",
      platform: "DataLemur",
      title: "Products Costlier Than Every Budget Item",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Quantified comparison", sqlConcept: "> ALL", technique: "Compare to every value in a set" },
      descriptionBrief:
        "Given a **Products** table with `Category` and `Price`, return every product priced " +
        "**higher than all products in the 'Budget' category**, most expensive first.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Price", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50), Category VARCHAR(30), Price INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'A','Budget',10),(2,'B','Budget',20),(3,'C','Premium',25),\n" +
        "  (4,'D','Premium',15),(5,'E','Premium',30);",
      sampleData: [
        { table: "Products", columns: ["Id","Name","Category","Price"],
          rows: [[1,"A","Budget",10],[2,"B","Budget",20],[3,"C","Premium",25],[4,"D","Premium",15],[5,"E","Premium",30]] }
      ],
      expectedOutput: { columns: ["Name","Price"], rows: [["E",30],["C",25]] },
      approaches: [
        {
          name: "> ALL (recommended)",
          perfNote: "Quantified predicate; SQL Server evaluates the Budget set once and compares each row to its maximum.",
          dialectNote: "",
          logic:
            "**What it asks.** Products whose price exceeds *every* Budget product — i.e., more than the most expensive Budget item.\n\n" +
            "**Why the naive idea fails.** `Price > (SELECT Price FROM Products WHERE Category = 'Budget')` raises a 'subquery returned more than one value' error because the Budget set has several prices, not one.\n\n" +
            "**Key Idea.** `> ALL (set)` is true only when the value beats the maximum of the set — exactly 'higher than all of them'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Form the Budget price set `(SELECT Price FROM Products WHERE Category = 'Budget')` → {10, 20}.\n" +
            "2. Keep rows where `Price > ALL` that set (i.e., Price > 20).\n" +
            "3. Order by price descending.\n\n" +
            "**Why it works.** `> ALL` requires the comparison to hold against every member, which is equivalent to beating the maximum.\n\n" +
            "**Common Gotchas.** If the set were empty, `> ALL` is vacuously true (all rows qualify); guard for that when the category might not exist. A NULL in the set makes `> ALL` unknown for rows that don't already exceed the max.\n\n" +
            "**Performance.** One scan of the Budget set to get its max, then a filtered scan.\n\n" +
            "**Interview mindset.** '> every value in a set' → `> ALL`; '> at least one value' → `> ANY` (= > the minimum).",
          tsql:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > ALL (                    -- beat every Budget price\n" +
            "    SELECT Price FROM dbo.Products WHERE Category = 'Budget'\n" +
            ")\n" +
            "ORDER BY Price DESC;",
          clean:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > ALL (SELECT Price FROM dbo.Products WHERE Category = 'Budget')\n" +
            "ORDER BY Price DESC;"
        },
        {
          name: "> MAX scalar subquery",
          perfNote: "Aggregates the set to a single number first; avoids the empty-set and NULL subtleties of ALL and is often the clearest form.",
          dialectNote: "",
          logic:
            "**Key Idea.** 'Higher than all Budget items' is the same as 'higher than the maximum Budget price', which is a single scalar.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `(SELECT MAX(Price) FROM Products WHERE Category = 'Budget')` → 20.\n" +
            "2. Keep rows where `Price >` that value.\n" +
            "3. Order by price descending.\n\n" +
            "**Why it works.** Beating the maximum of a set is logically identical to beating every element of it.\n\n" +
            "**Common Gotchas.** When no Budget rows exist, `MAX` returns NULL and the comparison drops all rows — the opposite of `> ALL`'s vacuous-true behavior, so pick the semantics you actually want.\n\n" +
            "**Performance.** A single MAX aggregate plus a filtered scan; typically the tidiest plan.\n\n" +
            "**Interview mindset.** Rewriting `> ALL` as `> MAX` (and `> ANY` as `> MIN`) shows you understand the quantifiers, and sidesteps their edge cases.",
          tsql:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > (SELECT MAX(Price) FROM dbo.Products WHERE Category = 'Budget')\n" +
            "ORDER BY Price DESC;",
          clean:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > (SELECT MAX(Price) FROM dbo.Products WHERE Category = 'Budget')\n" +
            "ORDER BY Price DESC;"
        }
      ],
      walkthrough: [
        { step: "Budget price set and its max", note: "Budget = {10, 20}; the maximum is 20.",
          table: { columns: ["MaxBudget"], rows: [[20]] } },
        { step: "Keep Price > 20", note: "E(30) and C(25) beat every Budget item; D(15) does not.",
          table: { columns: ["Name","Price"], rows: [["E",30],["C",25]] } }
      ],
      patternRecognition: [
        "'greater than **all** of a set' → `> ALL` (= `> MAX`); 'greater than **any/some**' → `> ANY` (= `> MIN`)."
      ],
      interviewRecall: [
        "`x > ALL (set)` ⇔ `x > MAX(set)`; `x > ANY (set)` ⇔ `x > MIN(set)`.",
        "Empty set: `> ALL` is TRUE for all rows, `> ANY` is FALSE for all rows — MAX/MIN turn to NULL instead."
      ],
      commonMistakes: [
        "Comparing to a multi-row subquery with a plain `>` and hitting the 'more than one value' error.",
        "Ignoring empty-set / NULL semantics that differ between `> ALL` and `> MAX`."
      ]
    },

    {
      id: "second-most-expensive-per-category",
      number: "SS 10240",
      platform: "StrataScratch",
      title: "Second Most Expensive Product Per Category",
      difficulty: "Hard",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Ranking"],
      domains: ["Retail Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Nth-per-group", sqlConcept: "Correlated COUNT subquery", technique: "Rank via counting greater rows" },
      descriptionBrief:
        "Given a **Products** table with `Category` and `Price`, return the **second most " +
        "expensive product in each category** (prices are distinct within a category).",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Price", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50), Category VARCHAR(30), Price INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'Apple','Fruit',3),(2,'Banana','Fruit',1),(3,'Cherry','Fruit',5),\n" +
        "  (4,'Carrot','Veg',2),(5,'Potato','Veg',4),(6,'Onion','Veg',6);",
      sampleData: [
        { table: "Products", columns: ["Id","Name","Category","Price"],
          rows: [[1,"Apple","Fruit",3],[2,"Banana","Fruit",1],[3,"Cherry","Fruit",5],[4,"Carrot","Veg",2],[5,"Potato","Veg",4],[6,"Onion","Veg",6]] }
      ],
      expectedOutput: { columns: ["Category","Name","Price"], rows: [["Fruit","Apple",3],["Veg","Potato",4]] },
      approaches: [
        {
          name: "Correlated COUNT subquery (recommended)",
          perfNote: "Ranks a row by counting how many in its category are pricier; no window functions, portable to older engines.",
          dialectNote: "",
          logic:
            "**What it asks.** Per category, the product at rank 2 by price — one below the top.\n\n" +
            "**Why the naive idea fails.** `MAX(Price)` gives the top only; a global 'second highest' ignores categories and returns a single row instead of one per category.\n\n" +
            "**Key Idea.** A product is the 2nd most expensive in its category exactly when **one** other product in the same category has a strictly higher price.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Products` as `p`.\n" +
            "2. Count same-category products priced higher: `(SELECT COUNT(*) FROM Products p2 WHERE p2.Category = p.Category AND p2.Price > p.Price)`.\n" +
            "3. Keep rows where that count = 1 (one product above them → they are 2nd).\n" +
            "4. Order by category.\n\n" +
            "**Why it works.** Counting strictly-greater peers is a rank: 0 above = 1st, 1 above = 2nd, and so on, scoped per category by the correlation.\n\n" +
            "**Common Gotchas.** With ties this counts levels loosely; the prompt guarantees distinct prices per category so 'count = 1' cleanly means second.\n\n" +
            "**Performance.** A correlated count per row; an index on `(Category, Price)` makes each a short range scan.\n\n" +
            "**Interview mindset.** 'Nth per group' without window functions → keep rows where the count of better peers = N-1.",
          tsql:
            "SELECT p.Category, p.Name, p.Price\n" +
            "FROM dbo.Products p\n" +
            "WHERE (                                  -- exactly one pricier product in this category\n" +
            "    SELECT COUNT(*)\n" +
            "    FROM dbo.Products p2\n" +
            "    WHERE p2.Category = p.Category AND p2.Price > p.Price\n" +
            ") = 1\n" +
            "ORDER BY p.Category;",
          clean:
            "SELECT p.Category, p.Name, p.Price\n" +
            "FROM dbo.Products p\n" +
            "WHERE (SELECT COUNT(*) FROM dbo.Products p2\n" +
            "       WHERE p2.Category = p.Category AND p2.Price > p.Price) = 1\n" +
            "ORDER BY p.Category;"
        },
        {
          name: "DENSE_RANK in a CTE",
          perfNote: "One partitioned window pass; the modern default when the engine supports window functions.",
          dialectNote: "",
          logic:
            "**Key Idea.** Rank products within each category by descending price and keep rank 2.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `DENSE_RANK() OVER (PARTITION BY Category ORDER BY Price DESC)` as `rnk`.\n" +
            "2. Keep rows where `rnk = 2`.\n" +
            "3. Order by category.\n\n" +
            "**Why it works.** PARTITION BY restarts the ranking per category, and rank 2 is the second-priciest level within each.\n\n" +
            "**Common Gotchas.** With duplicate prices, `DENSE_RANK` groups ties into one level — choose `ROW_NUMBER` if you need exactly one row even under ties.\n\n" +
            "**Performance.** A single partitioned sort, generally beating the correlated count on large tables.\n\n" +
            "**Interview mindset.** Show both: the count-of-better-peers subquery *and* the window version, then pick by engine support.",
          tsql:
            "WITH R AS (\n" +
            "    SELECT Category, Name, Price,\n" +
            "           DENSE_RANK() OVER (PARTITION BY Category ORDER BY Price DESC) AS rnk\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Category, Name, Price\n" +
            "FROM R\n" +
            "WHERE rnk = 2\n" +
            "ORDER BY Category;",
          clean:
            "WITH R AS (\n" +
            "    SELECT Category, Name, Price,\n" +
            "           DENSE_RANK() OVER (PARTITION BY Category ORDER BY Price DESC) AS rnk\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Category, Name, Price\n" +
            "FROM R\n" +
            "WHERE rnk = 2\n" +
            "ORDER BY Category;"
        }
      ],
      walkthrough: [
        { step: "Count pricier peers per product", note: "Fruit: Cherry 0, Apple 1, Banana 2. Veg: Onion 0, Potato 1, Carrot 2.",
          table: { columns: ["Category","Name","Price","Above"],
            rows: [["Fruit","Cherry",5,0],["Fruit","Apple",3,1],["Fruit","Banana",1,2],["Veg","Onion",6,0],["Veg","Potato",4,1],["Veg","Carrot",2,2]] } },
        { step: "Keep count = 1 (second place)", note: "Apple in Fruit and Potato in Veg each have exactly one pricier peer.",
          table: { columns: ["Category","Name","Price"], rows: [["Fruit","Apple",3],["Veg","Potato",4]] } }
      ],
      patternRecognition: [
        "'Nth per group' via subquery → keep rows where the count of strictly-better peers equals N-1.",
        "Window equivalent → `DENSE_RANK()`/`ROW_NUMBER()` partitioned by the group, filter to rank N."
      ],
      interviewRecall: [
        "Counting strictly-greater rows in the same group is a hand-rolled rank: 0 above = top, 1 above = second.",
        "Correlate the count on the grouping key or you rank across the whole table."
      ],
      commonMistakes: [
        "Using `>=` in the count and shifting every rank by one.",
        "Forgetting the category correlation and computing a global second-highest."
      ]
    },

    {
      id: "employees-who-are-not-managers",
      number: "DL 2155",
      platform: "DataLemur",
      title: "Employees Who Manage No One (NOT IN Trap)",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Anti-membership with NULLs", sqlConcept: "NOT IN vs NOT EXISTS", technique: "NULL-safe absence test" },
      descriptionBrief:
        "Given an **Employee** table with a self-referencing nullable `ManagerId`, return the " +
        "names of employees who **manage nobody** — whose `Id` never appears as another " +
        "employee's `ManagerId`.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "ManagerId", type: "INT", note: "NULL for the top boss" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Alice',NULL),(2,'Bob',1),(3,'Cara',1),(4,'Dan',2);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","ManagerId"], rows: [[1,"Alice",null],[2,"Bob",1],[3,"Cara",1],[4,"Dan",2]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Cara"],["Dan"]] },
      approaches: [
        {
          name: "NOT EXISTS (recommended)",
          perfNote: "Anti-semi-join that is inherently NULL-safe; unaffected by the NULL ManagerId that breaks NOT IN.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees whose Id is nobody's `ManagerId` — the leaves of the org chart. Here Bob and Alice manage people; Cara and Dan manage no one.\n\n" +
            "**Why the naive idea fails.** `Id NOT IN (SELECT ManagerId FROM Employee)` returns **zero rows**: the subquery contains a NULL (Alice's), and `x NOT IN (…, NULL)` evaluates to UNKNOWN, never TRUE, so every row is filtered out.\n\n" +
            "**Key Idea.** Express the absence as `NOT EXISTS`, which returns a clean TRUE/FALSE and is immune to the NULL poisoning.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Employee` as `e` (the candidate leaf).\n" +
            "2. Test `NOT EXISTS (SELECT 1 FROM Employee m WHERE m.ManagerId = e.Id)`.\n" +
            "3. Keep employees no one reports to; order by name.\n\n" +
            "**Why it works.** The correlated equality `m.ManagerId = e.Id` simply fails to match for NULL manager ids, so NULLs are ignored rather than poisoning the whole predicate.\n\n" +
            "**Common Gotchas.** This is the canonical reason to prefer NOT EXISTS over NOT IN whenever the subquery column is nullable.\n\n" +
            "**Performance.** Anti-semi-join; an index on `Employee.ManagerId` turns each probe into a seek.\n\n" +
            "**Interview mindset.** 'not in a set that may contain NULLs' → NOT EXISTS, always.",
          tsql:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE NOT EXISTS (              -- nobody reports to e\n" +
            "    SELECT 1 FROM dbo.Employee m WHERE m.ManagerId = e.Id\n" +
            ")\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Employee m WHERE m.ManagerId = e.Id)\n" +
            "ORDER BY e.Name;"
        },
        {
          name: "NOT IN with a NULL guard",
          perfNote: "Keeps the readable NOT IN form but must strip NULLs first; correct only with the explicit IS NOT NULL filter.",
          dialectNote: "",
          logic:
            "**Key Idea.** If you insist on NOT IN, remove the NULLs from the subquery so the anti-membership test can succeed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the manager-id set but add `WHERE ManagerId IS NOT NULL` → {1, 2}.\n" +
            "2. Keep employees whose `Id NOT IN` that NULL-free set.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** With no NULL in the list, `NOT IN` behaves as expected: an Id absent from {1, 2} is genuinely nobody's manager.\n\n" +
            "**Common Gotchas.** Omitting the `IS NOT NULL` filter reintroduces the trap and silently returns nothing — a classic interview 'why is my result empty?' bug.\n\n" +
            "**Performance.** Comparable to NOT EXISTS once the list is materialized; the guard is the whole point.\n\n" +
            "**Interview mindset.** State the NULL trap out loud, then either switch to NOT EXISTS or add the explicit guard.",
          tsql:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE e.Id NOT IN (\n" +
            "    SELECT m.ManagerId FROM dbo.Employee m WHERE m.ManagerId IS NOT NULL  -- strip NULLs\n" +
            ")\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name\n" +
            "FROM dbo.Employee e\n" +
            "WHERE e.Id NOT IN (SELECT m.ManagerId FROM dbo.Employee m WHERE m.ManagerId IS NOT NULL)\n" +
            "ORDER BY e.Name;"
        }
      ],
      walkthrough: [
        { step: "Distinct ManagerId values (with the NULL)", note: "Alice's NULL plus 1 (Alice manages Bob & Cara) and 2 (Bob manages Dan).",
          table: { columns: ["ManagerId"], rows: [[null],[1],[2]] } },
        { step: "Keep Ids not among the non-null managers {1,2}", note: "Cara(3) and Dan(4) manage no one; the raw NOT IN would return empty due to the NULL.",
          table: { columns: ["Name"], rows: [["Cara"],["Dan"]] } }
      ],
      patternRecognition: [
        "'not in a set that can contain NULLs' → NOT EXISTS (NULL-safe) or NOT IN with an explicit IS NOT NULL guard."
      ],
      interviewRecall: [
        "`x NOT IN (…, NULL)` is never TRUE — a single NULL empties the whole result.",
        "NOT EXISTS returns TRUE/FALSE only and sidesteps the NULL trap entirely."
      ],
      commonMistakes: [
        "Using NOT IN over a nullable column and getting an unexplained empty result set.",
        "Adding the IS NOT NULL guard to the outer query instead of inside the subquery list."
      ]
    }

  ]);
})();
