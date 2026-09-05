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
    },

    {
      id: "employees-earning-more-than-manager",
      number: "LC 181",
      platform: "LeetCode",
      title: "Employees Earning More Than Their Manager",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Joins"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/employees-earning-more-than-their-managers/",
      meta: { pattern: "Self-referential comparison", sqlConcept: "CTE + self-join", technique: "Join a table to itself via a CTE" },
      descriptionBrief:
        "Given **Employee(Id, Name, Salary, ManagerId)** where `ManagerId` points at another row's " +
        "`Id` (NULL for top-level staff), return the **names of employees who earn strictly more " +
        "than their own manager**.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" },
          { name: "ManagerId", type: "INT", note: "FK → Employee.Id, NULL if none" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), Salary INT, ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Joe',70000,3),(2,'Henry',80000,4),(3,'Sam',60000,NULL),\n" +
        "  (4,'Max',90000,NULL),(5,'Ann',85000,4),(6,'Bob',95000,3);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","Salary","ManagerId"],
          rows: [[1,"Joe",70000,3],[2,"Henry",80000,4],[3,"Sam",60000,null],[4,"Max",90000,null],[5,"Ann",85000,4],[6,"Bob",95000,3]] }
      ],
      expectedOutput: { columns: ["Employee"], rows: [["Bob"],["Joe"]] },
      approaches: [
        {
          name: "CTE + self-join (recommended)",
          perfNote: "One inner self-join on ManagerId → Id; employees with a NULL manager drop out naturally, and the comparison is a single predicate.",
          dialectNote: "",
          logic:
            "**What it asks.** Names of employees whose salary exceeds their direct manager's salary.\n\n" +
            "**Why the naive idea fails.** Manager salary lives in the *same* table on a different row, so there is no single-row column to compare against; a plain `WHERE Salary > ManagerSalary` has no such column to reference.\n\n" +
            "**Key Idea.** Name the table twice via a CTE self-join — employee row `e` joined to its manager row `m` on `e.ManagerId = m.Id` — so both salaries sit on one row, then compare.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE joins `Employee e` to `Employee m` on `e.ManagerId = m.Id`.\n" +
            "2. The inner join discards employees whose `ManagerId` is NULL (Sam, Max).\n" +
            "3. Keep rows where `e.Salary > m.Salary`.\n" +
            "4. Project the employee's name.\n\n" +
            "**Why it works.** Aliasing the table twice makes the manager's row available alongside the employee's, turning a cross-row comparison into an ordinary column comparison.\n\n" +
            "**Common Gotchas.** Use an INNER join so NULL-manager rows fall away; a LEFT join would keep them with NULL manager salary and the `>` predicate then filters them anyway, but INNER states intent.\n\n" +
            "**Performance.** A single hash/loop join keyed on `Id`; an index on the PK already supports the manager lookup.\n\n" +
            "**Interview mindset.** 'Compare a row to another row in the same table' → self-join, alias twice, name it with a CTE for readability.",
          tsql:
            "WITH EmpMgr AS (\n" +
            "    SELECT e.Name AS Employee, e.Salary AS EmpSalary,\n" +
            "           m.Salary AS MgrSalary\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN dbo.Employee m ON e.ManagerId = m.Id   -- attach the manager row\n" +
            ")\n" +
            "SELECT Employee\n" +
            "FROM EmpMgr\n" +
            "WHERE EmpSalary > MgrSalary\n" +
            "ORDER BY Employee;",
          clean:
            "WITH EmpMgr AS (\n" +
            "    SELECT e.Name AS Employee, e.Salary AS EmpSalary, m.Salary AS MgrSalary\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN dbo.Employee m ON e.ManagerId = m.Id\n" +
            ")\n" +
            "SELECT Employee\n" +
            "FROM EmpMgr\n" +
            "WHERE EmpSalary > MgrSalary\n" +
            "ORDER BY Employee;"
        }
      ],
      walkthrough: [
        { step: "Self-join employee to manager", note: "Sam and Max have no manager, so they are dropped by the inner join.",
          table: { columns: ["Employee","EmpSalary","MgrSalary"],
            rows: [["Joe",70000,60000],["Henry",80000,90000],["Ann",85000,90000],["Bob",95000,60000]] } },
        { step: "Keep EmpSalary > MgrSalary", note: "Joe (70000>60000) and Bob (95000>60000) qualify; Henry and Ann do not.",
          table: { columns: ["Employee"], rows: [["Bob"],["Joe"]] } }
      ],
      patternRecognition: [
        "'Compare each row to a related row in the same table' → self-join on the foreign key back to the PK."
      ],
      interviewRecall: [
        "A self-join aliases the same table twice; a CTE gives each role a readable name.",
        "INNER join on ManagerId silently removes rows with no manager."
      ],
      commonMistakes: [
        "Forgetting the join is to the SAME table and inventing a nonexistent Manager table.",
        "Using >= instead of > and including employees paid exactly the same as their manager."
      ]
    },

    {
      id: "top-two-products-per-category",
      number: "SS 10411",
      platform: "StrataScratch",
      title: "Top Two Products per Category by Revenue",
      difficulty: "Hard",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Ranking", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Top-N per group", sqlConcept: "Multi-CTE + ROW_NUMBER", technique: "Aggregate in one CTE, rank in the next" },
      descriptionBrief:
        "Given **Products(Id, Name, Category)** and **OrderItems(Id, ProductId, Quantity, UnitPrice)**, " +
        "compute each product's total revenue (`Quantity * UnitPrice`) and return the **two " +
        "highest-revenue products within each category**.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Category", type: "VARCHAR(30)" } ] },
        { name: "OrderItems", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "ProductId", type: "INT", note: "FK → Products.Id" },
          { name: "Quantity", type: "INT" },
          { name: "UnitPrice", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderItems','U') IS NOT NULL DROP TABLE dbo.OrderItems;\n" +
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50), Category VARCHAR(30));\n" +
        "CREATE TABLE dbo.OrderItems (Id INT PRIMARY KEY, ProductId INT, Quantity INT, UnitPrice INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'Laptop','Electronics'),(2,'Phone','Electronics'),(3,'Headphones','Electronics'),\n" +
        "  (4,'Novel','Books'),(5,'Comic','Books');\n" +
        "INSERT INTO dbo.OrderItems VALUES\n" +
        "  (1,1,2,1000),(2,1,1,1000),(3,2,3,800),(4,3,5,100),(5,4,4,20),(6,5,10,15);",
      sampleData: [
        { table: "Products", columns: ["Id","Name","Category"],
          rows: [[1,"Laptop","Electronics"],[2,"Phone","Electronics"],[3,"Headphones","Electronics"],[4,"Novel","Books"],[5,"Comic","Books"]] },
        { table: "OrderItems", columns: ["Id","ProductId","Quantity","UnitPrice"],
          rows: [[1,1,2,1000],[2,1,1,1000],[3,2,3,800],[4,3,5,100],[5,4,4,20],[6,5,10,15]] }
      ],
      expectedOutput: { columns: ["Category","Product","Revenue"],
        rows: [["Books","Comic",150],["Books","Novel",80],["Electronics","Laptop",3000],["Electronics","Phone",2400]] },
      approaches: [
        {
          name: "Aggregate CTE → rank CTE (recommended)",
          perfNote: "First CTE collapses order lines to one revenue per product; second CTE ranks within category. Two lean passes, no repeated aggregation.",
          dialectNote: "",
          logic:
            "**What it asks.** The two best-selling products (by summed revenue) in every category.\n\n" +
            "**Why the naive idea fails.** Revenue is spread across many order lines, so you must aggregate first; and 'top two per category' can't be expressed with a single `TOP` or `MAX` across the whole table.\n\n" +
            "**Key Idea.** Build a pipeline: CTE #1 sums `Quantity * UnitPrice` per product and attaches its category; CTE #2 applies `ROW_NUMBER() OVER (PARTITION BY Category ORDER BY Revenue DESC)`; the outer query keeps `rn <= 2`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Rev`: join `OrderItems` to `Products`, `GROUP BY` product, `SUM(Quantity*UnitPrice)` as Revenue.\n" +
            "2. CTE `Ranked`: number products within each category by Revenue descending.\n" +
            "3. Outer query filters `rn <= 2` and orders for presentation.\n\n" +
            "**Why it works.** Aggregating before ranking means each product appears once, so `ROW_NUMBER` ranks products (not order lines); the partition restarts the count per category.\n\n" +
            "**Common Gotchas.** Aggregate in a separate CTE — ranking the raw order lines would count individual lines, not products. Use `ROW_NUMBER` for exactly two; `RANK`/`DENSE_RANK` if ties should be kept.\n\n" +
            "**Performance.** One group aggregate then one partitioned sort; an index on `OrderItems(ProductId)` speeds the join.\n\n" +
            "**Interview mindset.** 'Top-N per group over an aggregate' → aggregate in CTE #1, window-rank in CTE #2, filter outside.",
          tsql:
            "WITH Rev AS (\n" +
            "    SELECT p.Category, p.Name AS Product,\n" +
            "           SUM(oi.Quantity * oi.UnitPrice) AS Revenue\n" +
            "    FROM dbo.OrderItems oi\n" +
            "    JOIN dbo.Products p ON p.Id = oi.ProductId\n" +
            "    GROUP BY p.Category, p.Name\n" +
            "), Ranked AS (\n" +
            "    SELECT Category, Product, Revenue,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Category\n" +
            "                              ORDER BY Revenue DESC) AS rn\n" +
            "    FROM Rev\n" +
            ")\n" +
            "SELECT Category, Product, Revenue\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 2\n" +
            "ORDER BY Category, Revenue DESC;",
          clean:
            "WITH Rev AS (\n" +
            "    SELECT p.Category, p.Name AS Product, SUM(oi.Quantity * oi.UnitPrice) AS Revenue\n" +
            "    FROM dbo.OrderItems oi\n" +
            "    JOIN dbo.Products p ON p.Id = oi.ProductId\n" +
            "    GROUP BY p.Category, p.Name\n" +
            "), Ranked AS (\n" +
            "    SELECT Category, Product, Revenue,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Category ORDER BY Revenue DESC) AS rn\n" +
            "    FROM Rev\n" +
            ")\n" +
            "SELECT Category, Product, Revenue\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 2\n" +
            "ORDER BY Category, Revenue DESC;"
        }
      ],
      walkthrough: [
        { step: "CTE Rev: revenue per product", note: "Laptop 2*1000+1*1000=3000; Phone 2400; Headphones 500; Novel 80; Comic 150.",
          table: { columns: ["Category","Product","Revenue"],
            rows: [["Electronics","Laptop",3000],["Electronics","Phone",2400],["Electronics","Headphones",500],["Books","Novel",80],["Books","Comic",150]] } },
        { step: "CTE Ranked: ROW_NUMBER per category, keep rn <= 2", note: "Electronics drops Headphones (rn 3); Books keeps both.",
          table: { columns: ["Category","Product","Revenue"],
            rows: [["Books","Comic",150],["Books","Novel",80],["Electronics","Laptop",3000],["Electronics","Phone",2400]] } }
      ],
      patternRecognition: [
        "'Top-N per group over a computed metric' → aggregate in one CTE, ROW_NUMBER in the next, filter rn <= N."
      ],
      interviewRecall: [
        "Aggregate BEFORE ranking so the window ranks entities, not raw rows.",
        "Chaining CTEs with a comma lets each stage feed the next."
      ],
      commonMistakes: [
        "Ranking the raw order lines and getting per-line ranks instead of per-product.",
        "Using ROW_NUMBER when the prompt wants ties kept (should be RANK/DENSE_RANK)."
      ]
    },

    {
      id: "channel-conversion-rate",
      number: "DL 10488",
      platform: "DataLemur",
      title: "Conversion Rate per Marketing Channel",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Aggregation & Grouping"],
      domains: ["Marketing Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Chained CTEs computing a ratio", sqlConcept: "Two aggregate CTEs + join", technique: "Count each side separately, then divide" },
      descriptionBrief:
        "Given **Visits(Id, Channel)** and **Conversions(Id, Channel)**, compute each channel's " +
        "**conversion rate** = conversions ÷ visits, rounded to two decimals, ordered highest first.",
      schema: [
        { name: "Visits", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Channel", type: "VARCHAR(30)" } ] },
        { name: "Conversions", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Channel", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Conversions','U') IS NOT NULL DROP TABLE dbo.Conversions;\n" +
        "IF OBJECT_ID('dbo.Visits','U') IS NOT NULL DROP TABLE dbo.Visits;\n" +
        "CREATE TABLE dbo.Visits (Id INT PRIMARY KEY, Channel VARCHAR(30));\n" +
        "CREATE TABLE dbo.Conversions (Id INT PRIMARY KEY, Channel VARCHAR(30));\n" +
        "INSERT INTO dbo.Visits VALUES\n" +
        "  (1,'Organic'),(2,'Organic'),(3,'Organic'),(4,'Organic'),\n" +
        "  (5,'Paid'),(6,'Paid'),\n" +
        "  (7,'Email'),(8,'Email'),(9,'Email'),(10,'Email'),(11,'Email');\n" +
        "INSERT INTO dbo.Conversions VALUES\n" +
        "  (1,'Organic'),(2,'Paid'),(3,'Email'),(4,'Email');",
      sampleData: [
        { table: "Visits", columns: ["Id","Channel"],
          rows: [[1,"Organic"],[2,"Organic"],[3,"Organic"],[4,"Organic"],[5,"Paid"],[6,"Paid"],[7,"Email"],[8,"Email"],[9,"Email"],[10,"Email"],[11,"Email"]] },
        { table: "Conversions", columns: ["Id","Channel"],
          rows: [[1,"Organic"],[2,"Paid"],[3,"Email"],[4,"Email"]] }
      ],
      expectedOutput: { columns: ["Channel","Visits","Conversions","ConversionRate"],
        rows: [["Paid",2,1,"0.50"],["Email",5,2,"0.40"],["Organic",4,1,"0.25"]] },
      approaches: [
        {
          name: "Two count CTEs joined into a ratio (recommended)",
          perfNote: "Each side is a single grouped count; joining the two small per-channel results then dividing avoids fanning-out the two tables against each other.",
          dialectNote: "Integer division truncates in T-SQL, so multiply by `1.0` (or CAST) before dividing.",
          logic:
            "**What it asks.** Per channel, the fraction of visits that converted, to two decimals.\n\n" +
            "**Why the naive idea fails.** Joining `Visits` to `Conversions` on `Channel` first produces a cartesian blow-up (every visit paired with every conversion in the channel), so raw counts after the join are wrong.\n\n" +
            "**Key Idea.** Count each side *independently* in its own CTE keyed by channel, then join the two aggregates one-to-one and divide.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `V`: `GROUP BY Channel` counting visits.\n" +
            "2. CTE `C`: `GROUP BY Channel` counting conversions.\n" +
            "3. Join `V` to `C` on Channel and compute `Conversions * 1.0 / Visits`, cast to `DECIMAL(5,2)`.\n\n" +
            "**Why it works.** Pre-aggregating each table to one row per channel means the join matches a single visit-count to a single conversion-count — no fan-out, so the ratio is exact.\n\n" +
            "**Common Gotchas.** Divide with `* 1.0` or the integer division returns 0. If a channel could have visits but zero conversions, use a LEFT join and `ISNULL` — here every channel converts at least once.\n\n" +
            "**Performance.** Two independent grouped scans then a tiny join on distinct channels.\n\n" +
            "**Interview mindset.** 'Ratio of two counts from two tables' → aggregate each side separately in a CTE, then join and divide; never join raw rows first.",
          tsql:
            "WITH V AS (\n" +
            "    SELECT Channel, COUNT(*) AS Visits\n" +
            "    FROM dbo.Visits\n" +
            "    GROUP BY Channel\n" +
            "), C AS (\n" +
            "    SELECT Channel, COUNT(*) AS Conversions\n" +
            "    FROM dbo.Conversions\n" +
            "    GROUP BY Channel\n" +
            ")\n" +
            "SELECT V.Channel, V.Visits, C.Conversions,\n" +
            "       CAST(C.Conversions * 1.0 / V.Visits AS DECIMAL(5,2)) AS ConversionRate\n" +
            "FROM V\n" +
            "JOIN C ON C.Channel = V.Channel\n" +
            "ORDER BY ConversionRate DESC;",
          clean:
            "WITH V AS (\n" +
            "    SELECT Channel, COUNT(*) AS Visits\n" +
            "    FROM dbo.Visits\n" +
            "    GROUP BY Channel\n" +
            "), C AS (\n" +
            "    SELECT Channel, COUNT(*) AS Conversions\n" +
            "    FROM dbo.Conversions\n" +
            "    GROUP BY Channel\n" +
            ")\n" +
            "SELECT V.Channel, V.Visits, C.Conversions,\n" +
            "       CAST(C.Conversions * 1.0 / V.Visits AS DECIMAL(5,2)) AS ConversionRate\n" +
            "FROM V\n" +
            "JOIN C ON C.Channel = V.Channel\n" +
            "ORDER BY ConversionRate DESC;"
        }
      ],
      walkthrough: [
        { step: "CTE V and CTE C: count each side per channel", note: "Visits: Organic 4, Paid 2, Email 5. Conversions: Organic 1, Paid 1, Email 2.",
          table: { columns: ["Channel","Visits","Conversions"],
            rows: [["Organic",4,1],["Paid",2,1],["Email",5,2]] } },
        { step: "Join and divide, round to 2 decimals, order DESC", note: "Paid 1/2=0.50; Email 2/5=0.40; Organic 1/4=0.25.",
          table: { columns: ["Channel","Visits","Conversions","ConversionRate"],
            rows: [["Paid",2,1,"0.50"],["Email",5,2,"0.40"],["Organic",4,1,"0.25"]] } }
      ],
      patternRecognition: [
        "'Ratio of counts from two tables' → aggregate each table to one row per key in its own CTE, then join and divide."
      ],
      interviewRecall: [
        "Pre-aggregate before joining to avoid a many-to-many fan-out that corrupts counts.",
        "Multiply by 1.0 (or CAST) to force decimal division in T-SQL."
      ],
      commonMistakes: [
        "Joining raw Visits to Conversions first, inflating both counts.",
        "Integer division returning 0 because the operands stayed INT."
      ]
    }

  ]);
})();
