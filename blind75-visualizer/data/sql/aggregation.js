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
    },

    {
      id: "min-max-price-per-category",
      number: "SS 10188",
      platform: "StrataScratch",
      title: "Cheapest and Priciest Product per Category",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Retail Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Min/Max per group", sqlConcept: "MIN / MAX + GROUP BY", technique: "Range aggregates per group" },
      descriptionBrief:
        "Given a **Products** catalogue with a `Category` and `Price`, return per category the " +
        "**lowest** and **highest** price, ordered alphabetically by category.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Price", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Category VARCHAR(30), Price DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'Phone',699.00),(2,'Phone',999.00),(3,'Laptop',1299.00),\n" +
        "  (4,'Laptop',899.00),(5,'Tablet',499.00);",
      sampleData: [
        { table: "Products", columns: ["Id","Category","Price"],
          rows: [[1,"Phone","699.00"],[2,"Phone","999.00"],[3,"Laptop","1299.00"],[4,"Laptop","899.00"],[5,"Tablet","499.00"]] }
      ],
      expectedOutput: { columns: ["Category","MinPrice","MaxPrice"],
        rows: [["Laptop","899.00","1299.00"],["Phone","699.00","999.00"],["Tablet","499.00","499.00"]] },
      approaches: [
        {
          name: "MIN and MAX in one GROUP BY (recommended)",
          perfNote: "Both extremes come from the same grouped scan; no self-join and no second pass needed.",
          dialectNote: "",
          logic:
            "**What it asks.** The price floor and ceiling within each category, side by side.\n\n" +
            "**Why the naive idea fails.** Two separate queries (one for MIN, one for MAX) then a join is wasteful — both extremes live in the same group and can be read together.\n\n" +
            "**Key Idea.** `GROUP BY Category` forms one bucket per category; `MIN(Price)` and `MAX(Price)` scan that bucket for its endpoints in a single pass.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category`.\n" +
            "2. Project `MIN(Price)` and `MAX(Price)` alongside the category.\n" +
            "3. Order the result by category name.\n\n" +
            "**Why it works.** MIN and MAX are order-independent aggregates evaluated over the same partition, so one grouped pass yields both.\n\n" +
            "**Common Gotchas.** A category with a single product returns the same value for MIN and MAX — that is correct, not a bug.\n\n" +
            "**Performance.** One hash/stream aggregate, O(n); an index on `(Category, Price)` lets the engine stream-aggregate without a sort.\n\n" +
            "**Interview mindset.** 'lowest AND highest per X' → MIN and MAX together under one GROUP BY.",
          tsql:
            "SELECT Category,\n" +
            "       MIN(Price) AS MinPrice,   -- cheapest in the category\n" +
            "       MAX(Price) AS MaxPrice    -- priciest in the category\n" +
            "FROM dbo.Products\n" +
            "GROUP BY Category\n" +
            "ORDER BY Category;",
          clean:
            "SELECT Category, MIN(Price) AS MinPrice, MAX(Price) AS MaxPrice\n" +
            "FROM dbo.Products\n" +
            "GROUP BY Category\n" +
            "ORDER BY Category;"
        }
      ],
      walkthrough: [
        { step: "Aggregate endpoints per category", note: "Each category collapses to its price floor and ceiling.",
          table: { columns: ["Category","MinPrice","MaxPrice"],
            rows: [["Laptop","899.00","1299.00"],["Phone","699.00","999.00"],["Tablet","499.00","499.00"]] } }
      ],
      patternRecognition: [
        "'lowest / highest / range per X' → `MIN` and `MAX` with `GROUP BY X`."
      ],
      interviewRecall: [
        "MIN and MAX ignore NULLs and need no ORDER BY.",
        "Both extremes read from the same grouped pass — no self-join required."
      ],
      commonMistakes: [
        "Running two grouped queries and joining them instead of selecting both aggregates at once.",
        "Assuming a one-product category is an error when MIN equals MAX."
      ]
    },

    {
      id: "most-sold-product",
      number: "DL 2041",
      platform: "DataLemur",
      title: "Most Frequently Sold Product",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Mode / most frequent", sqlConcept: "COUNT + TOP WITH TIES", technique: "Highest group count" },
      descriptionBrief:
        "Given a **Sales** log where each row is one item sold, return the product that was sold the " +
        "**most times** along with its sale count. If several products tie for the top, return all of them.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Product", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Product VARCHAR(30));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'Widget'),(2,'Gadget'),(3,'Widget'),\n" +
        "  (4,'Widget'),(5,'Gizmo'),(6,'Gadget');",
      sampleData: [
        { table: "Sales", columns: ["Id","Product"],
          rows: [[1,"Widget"],[2,"Gadget"],[3,"Widget"],[4,"Widget"],[5,"Gizmo"],[6,"Gadget"]] }
      ],
      expectedOutput: { columns: ["Product","Sales"], rows: [["Widget",3]] },
      approaches: [
        {
          name: "GROUP BY + TOP 1 WITH TIES (recommended)",
          perfNote: "One grouped count, ordered descending; WITH TIES keeps every product sharing the maximum count without a second query.",
          dialectNote: "`TOP ... WITH TIES` is T-SQL syntax; other dialects use `LIMIT` plus a rank filter.",
          logic:
            "**What it asks.** The product with the largest number of sales rows — the mode of the `Product` column.\n\n" +
            "**Why the naive idea fails.** `MAX(COUNT(*))` cannot be nested directly, and a plain `TOP 1` silently drops products tied for first place.\n\n" +
            "**Key Idea.** Count rows per product, order by that count descending, and take the top with `TOP 1 WITH TIES` so co-leaders are all returned.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Product` with `COUNT(*)` as the sale count.\n" +
            "2. `ORDER BY COUNT(*) DESC`.\n" +
            "3. `TOP 1 WITH TIES` keeps the first row and any others matching its count.\n\n" +
            "**Why it works.** WITH TIES extends the TOP set to every row equal to the last one under the ORDER BY, so all products at the maximum count survive.\n\n" +
            "**Common Gotchas.** Plain `TOP 1` returns one arbitrary winner on ties; `WITH TIES` requires an `ORDER BY`.\n\n" +
            "**Performance.** One group aggregate plus a sort on the count; O(n log g) for g groups.\n\n" +
            "**Interview mindset.** 'the most / most frequent' → GROUP + COUNT + TOP 1 WITH TIES, or a DENSE_RANK filter.",
          tsql:
            "SELECT TOP 1 WITH TIES\n" +
            "       Product,\n" +
            "       COUNT(*) AS Sales      -- rows for this product\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product\n" +
            "ORDER BY COUNT(*) DESC;      -- WITH TIES keeps all co-leaders\n",
          clean:
            "SELECT TOP 1 WITH TIES Product, COUNT(*) AS Sales\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product\n" +
            "ORDER BY COUNT(*) DESC;"
        },
        {
          name: "DENSE_RANK on the counts",
          perfNote: "Rank the grouped counts and keep rank 1; portable across dialects and naturally ties-safe.",
          dialectNote: "",
          logic:
            "**Key Idea.** After counting per product, rank the counts descending and keep every group at rank 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, `GROUP BY Product` with `COUNT(*)` as `Sales`.\n" +
            "2. Compute `DENSE_RANK() OVER (ORDER BY COUNT(*) DESC)`.\n" +
            "3. Filter to `rnk = 1`.\n\n" +
            "**Why it works.** DENSE_RANK gives every group with the maximum count the same rank 1, so ties are preserved automatically.\n\n" +
            "**Common Gotchas.** You must aggregate first, then rank the aggregated counts — not the raw rows.\n\n" +
            "**Performance.** Group aggregate then a sort for the window; comparable to TOP WITH TIES.\n\n" +
            "**Interview mindset.** Reach here when the platform lacks `WITH TIES` but has window functions.",
          tsql:
            "WITH Counts AS (\n" +
            "    SELECT Product, COUNT(*) AS Sales,\n" +
            "           DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk\n" +
            "    FROM dbo.Sales\n" +
            "    GROUP BY Product\n" +
            ")\n" +
            "SELECT Product, Sales\n" +
            "FROM Counts\n" +
            "WHERE rnk = 1;",
          clean:
            "WITH Counts AS (\n" +
            "    SELECT Product, COUNT(*) AS Sales,\n" +
            "           DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk\n" +
            "    FROM dbo.Sales\n" +
            "    GROUP BY Product\n" +
            ")\n" +
            "SELECT Product, Sales FROM Counts WHERE rnk = 1;"
        }
      ],
      walkthrough: [
        { step: "Count sales per product", note: "Widget 3, Gadget 2, Gizmo 1.",
          table: { columns: ["Product","Sales"], rows: [["Widget",3],["Gadget",2],["Gizmo",1]] } },
        { step: "Keep the maximum count", note: "Widget leads with 3; no ties here.",
          table: { columns: ["Product","Sales"], rows: [["Widget",3]] } }
      ],
      patternRecognition: [
        "'the most frequent / most common X' → GROUP + COUNT, then TOP 1 WITH TIES or DENSE_RANK = 1."
      ],
      interviewRecall: [
        "`TOP 1 WITH TIES` needs an ORDER BY and keeps every row equal to the last.",
        "You cannot nest `MAX(COUNT(*))`; rank or TOP the grouped counts instead."
      ],
      commonMistakes: [
        "Plain `TOP 1` dropping products tied for the highest count.",
        "Trying to write `MAX(COUNT(*))` in a single flat query."
      ]
    },

    {
      id: "first-order-per-customer",
      number: "SS 10199",
      platform: "StrataScratch",
      title: "Each Customer's First Order Date",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Earliest per group", sqlConcept: "MIN(date) + GROUP BY", technique: "First event via aggregation" },
      descriptionBrief:
        "Given an **Orders** table, return each customer id with the **date of their earliest order**, " +
        "ordered by customer id.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, OrderDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,101,'2024-01-05'),(2,101,'2024-03-10'),(3,102,'2024-02-01'),\n" +
        "  (4,102,'2024-02-20'),(5,103,'2024-05-15');",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","OrderDate"],
          rows: [[1,101,"2024-01-05"],[2,101,"2024-03-10"],[3,102,"2024-02-01"],[4,102,"2024-02-20"],[5,103,"2024-05-15"]] }
      ],
      expectedOutput: { columns: ["CustomerId","FirstOrder"],
        rows: [[101,"2024-01-05"],[102,"2024-02-01"],[103,"2024-05-15"]] },
      approaches: [
        {
          name: "MIN(OrderDate) per customer (recommended)",
          perfNote: "A single grouped MIN over one scan; no ORDER BY or window function needed just to find the earliest date.",
          dialectNote: "",
          logic:
            "**What it asks.** For each customer, the calendar date of their very first order.\n\n" +
            "**Why the naive idea fails.** Sorting all orders and eyeballing the top per customer is a window/ranking job; when you only need the earliest *date* (not the whole row), a plain aggregate is simpler and cheaper.\n\n" +
            "**Key Idea.** `GROUP BY CustomerId` and take `MIN(OrderDate)` — the minimum date is the earliest order.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId`.\n" +
            "2. Project `MIN(OrderDate)` as the first-order date.\n" +
            "3. Order the output by customer id.\n\n" +
            "**Why it works.** Dates compare chronologically, so `MIN` returns the earliest order date in each customer's group.\n\n" +
            "**Common Gotchas.** This returns the earliest *date*, not the earliest order's other columns — if you need the whole first row, use `ROW_NUMBER`.\n\n" +
            "**Performance.** One stream/hash aggregate, O(n); an index on `(CustomerId, OrderDate)` streams it without a sort.\n\n" +
            "**Interview mindset.** 'earliest / first date per X' → `MIN(date)` GROUP BY X; 'the whole first row' → windowed ROW_NUMBER.",
          tsql:
            "SELECT CustomerId,\n" +
            "       MIN(OrderDate) AS FirstOrder   -- earliest order date per customer\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;",
          clean:
            "SELECT CustomerId, MIN(OrderDate) AS FirstOrder\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "MIN(OrderDate) per customer", note: "101 earliest 2024-01-05, 102 earliest 2024-02-01, 103 single order.",
          table: { columns: ["CustomerId","FirstOrder"],
            rows: [[101,"2024-01-05"],[102,"2024-02-01"],[103,"2024-05-15"]] } }
      ],
      patternRecognition: [
        "'first / earliest date per X' → `MIN(date)` with `GROUP BY X`; 'latest' → `MAX(date)`."
      ],
      interviewRecall: [
        "MIN/MAX on a DATE column compares chronologically.",
        "Need the whole earliest row (not just the date)? Switch to ROW_NUMBER partitioned by the group."
      ],
      commonMistakes: [
        "Reaching for a window function when a simple grouped MIN answers the question.",
        "Assuming MIN(OrderDate) also pulls that order's id — it does not."
      ]
    },

    {
      id: "high-value-customers",
      number: "DL 2055",
      platform: "DataLemur",
      title: "High-Spending Customers",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Group then filter by SUM", sqlConcept: "GROUP BY + HAVING SUM", technique: "Threshold on a total" },
      descriptionBrief:
        "Given a **Payments** table, return each customer whose **total payments exceed 500**, with their " +
        "total, highest total first.",
      schema: [
        { name: "Payments", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Payments','U') IS NOT NULL DROP TABLE dbo.Payments;\n" +
        "CREATE TABLE dbo.Payments (Id INT PRIMARY KEY, CustomerId INT, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Payments VALUES\n" +
        "  (1,1,300.00),(2,1,250.00),(3,2,100.00),\n" +
        "  (4,3,600.00),(5,3,50.00);",
      sampleData: [
        { table: "Payments", columns: ["Id","CustomerId","Amount"],
          rows: [[1,1,"300.00"],[2,1,"250.00"],[3,2,"100.00"],[4,3,"600.00"],[5,3,"50.00"]] }
      ],
      expectedOutput: { columns: ["CustomerId","TotalPaid"], rows: [[3,"650.00"],[1,"550.00"]] },
      approaches: [
        {
          name: "GROUP BY … HAVING SUM (recommended)",
          perfNote: "Sum per customer in one grouped pass, then HAVING drops the small spenders before the result is returned.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers whose lifetime payment total is above 500.\n\n" +
            "**Why the naive idea fails.** `WHERE Amount > 500` filters individual payments, not the *total*; a customer can clear 500 across several small payments, and the per-row filter would miss them.\n\n" +
            "**Key Idea.** Aggregate `SUM(Amount)` per customer, then apply the threshold with `HAVING`, which filters *groups* after aggregation.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId` with `SUM(Amount)` as the total.\n" +
            "2. `HAVING SUM(Amount) > 500` to keep big spenders.\n" +
            "3. Order by the total descending.\n\n" +
            "**Why it works.** HAVING is evaluated after the group totals exist, so it can compare against an aggregate that WHERE never sees.\n\n" +
            "**Common Gotchas.** The threshold belongs in HAVING, not WHERE; `> 500` excludes an exact 500, `>= 500` includes it.\n\n" +
            "**Performance.** One group aggregate plus a small sort on the totals.\n\n" +
            "**Interview mindset.** 'total per X above a threshold' → GROUP BY X HAVING SUM(...) > n.",
          tsql:
            "SELECT CustomerId,\n" +
            "       SUM(Amount) AS TotalPaid\n" +
            "FROM dbo.Payments\n" +
            "GROUP BY CustomerId\n" +
            "HAVING SUM(Amount) > 500       -- filter on the per-customer total\n" +
            "ORDER BY TotalPaid DESC;",
          clean:
            "SELECT CustomerId, SUM(Amount) AS TotalPaid\n" +
            "FROM dbo.Payments\n" +
            "GROUP BY CustomerId\n" +
            "HAVING SUM(Amount) > 500\n" +
            "ORDER BY TotalPaid DESC;"
        }
      ],
      walkthrough: [
        { step: "Total per customer", note: "Customer 1 = 550, customer 2 = 100, customer 3 = 650.",
          table: { columns: ["CustomerId","TotalPaid"], rows: [[1,"550.00"],[2,"100.00"],[3,"650.00"]] } },
        { step: "Keep SUM > 500, order DESC", note: "Customer 2 drops out; 3 leads, then 1.",
          table: { columns: ["CustomerId","TotalPaid"], rows: [[3,"650.00"],[1,"550.00"]] } }
      ],
      patternRecognition: [
        "'total / sum per X over a threshold' → GROUP BY X HAVING SUM(...) comparison."
      ],
      interviewRecall: [
        "WHERE filters rows before grouping; HAVING filters groups after aggregation.",
        "A threshold on an aggregate (SUM, COUNT, AVG) must live in HAVING."
      ],
      commonMistakes: [
        "Filtering `Amount > 500` in WHERE and missing customers who reach the total across many payments.",
        "Confusing `>` and `>=` at the boundary value."
      ]
    },

    {
      id: "distinct-products-per-customer",
      number: "SS 10210",
      platform: "StrataScratch",
      title: "Distinct Products Bought per Customer",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Distinct count per group", sqlConcept: "COUNT(DISTINCT ...)", technique: "Deduplicated count" },
      descriptionBrief:
        "Given an **OrderItems** table where a customer can buy the same product more than once, return " +
        "each customer id with the number of **distinct products** they have purchased, by customer id.",
      schema: [
        { name: "OrderItems", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "ProductId", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderItems','U') IS NOT NULL DROP TABLE dbo.OrderItems;\n" +
        "CREATE TABLE dbo.OrderItems (Id INT PRIMARY KEY, CustomerId INT, ProductId INT);\n" +
        "INSERT INTO dbo.OrderItems VALUES\n" +
        "  (1,1,10),(2,1,10),(3,1,20),\n" +
        "  (4,2,30),(5,2,30);",
      sampleData: [
        { table: "OrderItems", columns: ["Id","CustomerId","ProductId"],
          rows: [[1,1,10],[2,1,10],[3,1,20],[4,2,30],[5,2,30]] }
      ],
      expectedOutput: { columns: ["CustomerId","DistinctProducts"], rows: [[1,2],[2,1]] },
      approaches: [
        {
          name: "COUNT(DISTINCT ProductId) (recommended)",
          perfNote: "One grouped pass; COUNT(DISTINCT) deduplicates inside each group without a separate DISTINCT subquery.",
          dialectNote: "",
          logic:
            "**What it asks.** How many *different* products each customer bought, ignoring repeat purchases of the same product.\n\n" +
            "**Why the naive idea fails.** Plain `COUNT(*)` (or `COUNT(ProductId)`) counts purchase rows, so a customer who bought the same product twice is overcounted.\n\n" +
            "**Key Idea.** `COUNT(DISTINCT ProductId)` collapses duplicate product ids within each group before counting.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId`.\n" +
            "2. Project `COUNT(DISTINCT ProductId)`.\n" +
            "3. Order by customer id.\n\n" +
            "**Why it works.** DISTINCT inside COUNT removes repeated product ids per group, so each product contributes exactly one to the tally.\n\n" +
            "**Common Gotchas.** `COUNT(DISTINCT ...)` counts distinct non-NULL values; NULL product ids are ignored.\n\n" +
            "**Performance.** A hash/sort distinct per group then a count, O(n); slightly heavier than a plain COUNT.\n\n" +
            "**Interview mindset.** 'how many different / unique X per Y' → `COUNT(DISTINCT X)` GROUP BY Y.",
          tsql:
            "SELECT CustomerId,\n" +
            "       COUNT(DISTINCT ProductId) AS DistinctProducts  -- unique products only\n" +
            "FROM dbo.OrderItems\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;",
          clean:
            "SELECT CustomerId, COUNT(DISTINCT ProductId) AS DistinctProducts\n" +
            "FROM dbo.OrderItems\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "COUNT(DISTINCT ProductId) per customer", note: "Customer 1 bought products 10 (twice) and 20 → 2 distinct; customer 2 only 30 → 1.",
          table: { columns: ["CustomerId","DistinctProducts"], rows: [[1,2],[2,1]] } }
      ],
      patternRecognition: [
        "'how many unique / distinct X per Y' → `COUNT(DISTINCT X)` with `GROUP BY Y`."
      ],
      interviewRecall: [
        "`COUNT(*)` counts rows; `COUNT(DISTINCT col)` counts distinct non-NULL values.",
        "DISTINCT lives inside the COUNT parentheses, not before the whole SELECT."
      ],
      commonMistakes: [
        "Using `COUNT(*)` and overcounting repeat purchases of the same product.",
        "Expecting NULL product ids to be counted by COUNT(DISTINCT)."
      ]
    },

    {
      id: "pass-fail-counts-per-class",
      number: "HR 3120",
      platform: "HackerRank",
      title: "Pass and Fail Counts per Class",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Education Analytics"],
      link: "https://www.hackerrank.com/domains/sql",
      meta: { pattern: "Conditional aggregation", sqlConcept: "SUM(CASE WHEN ...)", technique: "Pivot counts with CASE" },
      descriptionBrief:
        "Given an **Exams** table with a `Score` per student, return per class the number of **passes** " +
        "(score 60 or above) and **fails** (below 60) side by side, ordered by class.",
      schema: [
        { name: "Exams", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "ClassId", type: "VARCHAR(10)" },
          { name: "Score", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Exams','U') IS NOT NULL DROP TABLE dbo.Exams;\n" +
        "CREATE TABLE dbo.Exams (Id INT PRIMARY KEY, ClassId VARCHAR(10), Score INT);\n" +
        "INSERT INTO dbo.Exams VALUES\n" +
        "  (1,'A',75),(2,'A',50),(3,'A',90),\n" +
        "  (4,'B',40),(5,'B',65);",
      sampleData: [
        { table: "Exams", columns: ["Id","ClassId","Score"],
          rows: [[1,"A",75],[2,"A",50],[3,"A",90],[4,"B",40],[5,"B",65]] }
      ],
      expectedOutput: { columns: ["ClassId","Passes","Fails"], rows: [["A",2,1],["B",1,1]] },
      approaches: [
        {
          name: "Conditional aggregation with CASE (recommended)",
          perfNote: "Both counts fall out of one grouped scan; each CASE contributes a 1 or 0 that SUM tallies — no self-join, no two queries.",
          dialectNote: "",
          logic:
            "**What it asks.** Two counts per class — passes and fails — as columns on the same row.\n\n" +
            "**Why the naive idea fails.** Two separate filtered queries (one WHERE Score>=60, one WHERE Score<60) then a join is clumsy; a single grouped pass can produce both.\n\n" +
            "**Key Idea.** Inside `GROUP BY ClassId`, use `SUM(CASE WHEN Score >= 60 THEN 1 ELSE 0 END)` for passes and the complementary CASE for fails — conditional aggregation.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY ClassId`.\n" +
            "2. Sum a CASE that emits 1 when the score passes, 0 otherwise.\n" +
            "3. Sum the complementary CASE for fails.\n" +
            "4. Order by class.\n\n" +
            "**Why it works.** Each row maps to 1 or 0 per condition; summing those flags within a group counts the rows that met each condition.\n\n" +
            "**Common Gotchas.** Watch the boundary: 60 is a pass here (`>= 60`). `COUNT(CASE WHEN cond THEN 1 END)` works too because COUNT skips the NULLs from the ELSE.\n\n" +
            "**Performance.** One grouped aggregate for both measures, O(n).\n\n" +
            "**Interview mindset.** 'count of X and count of Y per group in one row' → SUM(CASE ...) per condition.",
          tsql:
            "SELECT ClassId,\n" +
            "       SUM(CASE WHEN Score >= 60 THEN 1 ELSE 0 END) AS Passes,  -- 60+ passes\n" +
            "       SUM(CASE WHEN Score <  60 THEN 1 ELSE 0 END) AS Fails\n" +
            "FROM dbo.Exams\n" +
            "GROUP BY ClassId\n" +
            "ORDER BY ClassId;",
          clean:
            "SELECT ClassId,\n" +
            "       SUM(CASE WHEN Score >= 60 THEN 1 ELSE 0 END) AS Passes,\n" +
            "       SUM(CASE WHEN Score < 60 THEN 1 ELSE 0 END) AS Fails\n" +
            "FROM dbo.Exams\n" +
            "GROUP BY ClassId\n" +
            "ORDER BY ClassId;"
        }
      ],
      walkthrough: [
        { step: "Conditional sums per class", note: "Class A: 75 and 90 pass, 50 fails → 2/1. Class B: 65 passes, 40 fails → 1/1.",
          table: { columns: ["ClassId","Passes","Fails"], rows: [["A",2,1],["B",1,1]] } }
      ],
      patternRecognition: [
        "'count of category A vs B per group as columns' → `SUM(CASE WHEN ...)` conditional aggregation."
      ],
      interviewRecall: [
        "SUM(CASE WHEN cond THEN 1 ELSE 0 END) counts rows meeting a condition per group.",
        "COUNT(CASE WHEN cond THEN 1 END) is equivalent — COUNT ignores the NULL from the missing ELSE."
      ],
      commonMistakes: [
        "Getting the pass boundary wrong (treating 60 as a fail).",
        "Writing one filtered query per bucket and joining instead of a single grouped pass."
      ]
    },

    {
      id: "revenue-by-region-and-year",
      number: "SS 10225",
      platform: "StrataScratch",
      title: "Revenue by Region and Year",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group by multiple keys", sqlConcept: "GROUP BY a, b", technique: "Composite grouping key" },
      descriptionBrief:
        "Given a **Sales** table with a `Region`, a `SaleYear`, and an `Amount`, return the total revenue " +
        "for **each region-and-year combination**, ordered by region then year.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(20)" },
          { name: "SaleYear", type: "INT" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Region VARCHAR(20), SaleYear INT, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'East',2023,100.00),(2,'East',2023,200.00),(3,'East',2024,150.00),\n" +
        "  (4,'West',2023,300.00),(5,'West',2024,400.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","Region","SaleYear","Amount"],
          rows: [[1,"East",2023,"100.00"],[2,"East",2023,"200.00"],[3,"East",2024,"150.00"],[4,"West",2023,"300.00"],[5,"West",2024,"400.00"]] }
      ],
      expectedOutput: { columns: ["Region","SaleYear","Revenue"],
        rows: [["East",2023,"300.00"],["East",2024,"150.00"],["West",2023,"300.00"],["West",2024,"400.00"]] },
      approaches: [
        {
          name: "GROUP BY two columns (recommended)",
          perfNote: "The grouping key is the pair (Region, SaleYear); one grouped pass produces every combination that exists in the data.",
          dialectNote: "",
          logic:
            "**What it asks.** One revenue total per distinct region-year pair, not per region and not per year alone.\n\n" +
            "**Why the naive idea fails.** Grouping by region only merges the years together; grouping by year only merges the regions. The breakdown needs both keys at once.\n\n" +
            "**Key Idea.** List both columns in `GROUP BY`; the group key becomes the *combination* `(Region, SaleYear)`, and `SUM(Amount)` totals each combination.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Region, SaleYear`.\n" +
            "2. Project both keys plus `SUM(Amount)`.\n" +
            "3. Order by region then year.\n\n" +
            "**Why it works.** A multi-column GROUP BY forms one bucket per distinct tuple of the listed columns, so each region-year appears once.\n\n" +
            "**Common Gotchas.** Every non-aggregated SELECT column (both Region and SaleYear) must be in GROUP BY. Only combinations present in the data appear — empty pairs are not invented.\n\n" +
            "**Performance.** One hash/stream aggregate; an index on `(Region, SaleYear)` supports a sort-free stream aggregate.\n\n" +
            "**Interview mindset.** 'per X per Y' / 'for each combination of X and Y' → GROUP BY X, Y.",
          tsql:
            "SELECT Region,\n" +
            "       SaleYear,\n" +
            "       SUM(Amount) AS Revenue     -- total per region-year pair\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region, SaleYear\n" +
            "ORDER BY Region, SaleYear;",
          clean:
            "SELECT Region, SaleYear, SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region, SaleYear\n" +
            "ORDER BY Region, SaleYear;"
        }
      ],
      walkthrough: [
        { step: "Aggregate on the (Region, SaleYear) pair", note: "East 2023 = 100+200 = 300; East 2024 = 150; West 2023 = 300; West 2024 = 400.",
          table: { columns: ["Region","SaleYear","Revenue"],
            rows: [["East",2023,"300.00"],["East",2024,"150.00"],["West",2023,"300.00"],["West",2024,"400.00"]] } }
      ],
      patternRecognition: [
        "'for each combination of X and Y' → multi-column `GROUP BY X, Y`."
      ],
      interviewRecall: [
        "A multi-column GROUP BY keys on the tuple of columns, one row per distinct combination.",
        "All non-aggregated SELECT columns must appear in the GROUP BY list."
      ],
      commonMistakes: [
        "Grouping by only one of the two keys and collapsing the other dimension.",
        "Expecting combinations with no rows to show up as zero — they are simply absent."
      ]
    },

    {
      id: "top-category-by-revenue",
      number: "DL 2078",
      platform: "DataLemur",
      title: "Top Category by Total Revenue",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Top group by SUM", sqlConcept: "SUM + TOP WITH TIES", technique: "Highest total group" },
      descriptionBrief:
        "Given an **OrderLines** table, return the single **category with the highest total revenue** and " +
        "that total. If two categories tie for the top, return both.",
      schema: [
        { name: "OrderLines", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Revenue", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderLines','U') IS NOT NULL DROP TABLE dbo.OrderLines;\n" +
        "CREATE TABLE dbo.OrderLines (Id INT PRIMARY KEY, Category VARCHAR(30), Revenue DECIMAL(10,2));\n" +
        "INSERT INTO dbo.OrderLines VALUES\n" +
        "  (1,'Toys',100.00),(2,'Toys',150.00),(3,'Games',400.00),\n" +
        "  (4,'Games',50.00),(5,'Books',120.00);",
      sampleData: [
        { table: "OrderLines", columns: ["Id","Category","Revenue"],
          rows: [[1,"Toys","100.00"],[2,"Toys","150.00"],[3,"Games","400.00"],[4,"Games","50.00"],[5,"Books","120.00"]] }
      ],
      expectedOutput: { columns: ["Category","TotalRevenue"], rows: [["Games","450.00"]] },
      approaches: [
        {
          name: "GROUP BY + TOP 1 WITH TIES (recommended)",
          perfNote: "Total per category in one grouped pass, ordered descending; WITH TIES keeps co-leaders without a second aggregation.",
          dialectNote: "`TOP ... WITH TIES` is T-SQL; elsewhere use a ranked total filtered to rank 1.",
          logic:
            "**What it asks.** The category whose summed revenue is the largest, ties included.\n\n" +
            "**Why the naive idea fails.** You cannot compare a group's SUM to the maximum SUM in the same flat query, and `TOP 1` alone silently drops a tied runner-up.\n\n" +
            "**Key Idea.** Sum revenue per category, order by that total descending, and take `TOP 1 WITH TIES` so any categories sharing the maximum all appear.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `SUM(Revenue)`.\n" +
            "2. `ORDER BY SUM(Revenue) DESC`.\n" +
            "3. `TOP 1 WITH TIES` returns the leader and any equal totals.\n\n" +
            "**Why it works.** WITH TIES widens the TOP set to every row equal to the last under the ORDER BY, so co-leaders are preserved.\n\n" +
            "**Common Gotchas.** WITH TIES requires an ORDER BY; without it TOP 1 is arbitrary on ties.\n\n" +
            "**Performance.** One group aggregate plus a sort on the totals.\n\n" +
            "**Interview mindset.** 'the top group by a total' → GROUP + SUM + TOP 1 WITH TIES, or DENSE_RANK = 1 on the totals.",
          tsql:
            "SELECT TOP 1 WITH TIES\n" +
            "       Category,\n" +
            "       SUM(Revenue) AS TotalRevenue\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY SUM(Revenue) DESC;    -- WITH TIES keeps tied leaders\n",
          clean:
            "SELECT TOP 1 WITH TIES Category, SUM(Revenue) AS TotalRevenue\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY SUM(Revenue) DESC;"
        },
        {
          name: "DENSE_RANK on category totals",
          perfNote: "Rank the summed totals and keep rank 1; portable and ties-safe where WITH TIES is unavailable.",
          dialectNote: "",
          logic:
            "**Key Idea.** After summing revenue per category, rank the totals descending and keep every category at rank 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, `GROUP BY Category` with `SUM(Revenue)` as `TotalRevenue`.\n" +
            "2. Compute `DENSE_RANK() OVER (ORDER BY SUM(Revenue) DESC)`.\n" +
            "3. Filter to `rnk = 1`.\n\n" +
            "**Why it works.** Every category tied for the largest total shares rank 1, so no leader is lost.\n\n" +
            "**Common Gotchas.** Aggregate first, then rank the totals — do not rank raw rows.\n\n" +
            "**Performance.** Group aggregate then a sort for the window; on par with TOP WITH TIES.\n\n" +
            "**Interview mindset.** The portable form of 'the top group' when the dialect has no WITH TIES.",
          tsql:
            "WITH Totals AS (\n" +
            "    SELECT Category, SUM(Revenue) AS TotalRevenue,\n" +
            "           DENSE_RANK() OVER (ORDER BY SUM(Revenue) DESC) AS rnk\n" +
            "    FROM dbo.OrderLines\n" +
            "    GROUP BY Category\n" +
            ")\n" +
            "SELECT Category, TotalRevenue\n" +
            "FROM Totals\n" +
            "WHERE rnk = 1;",
          clean:
            "WITH Totals AS (\n" +
            "    SELECT Category, SUM(Revenue) AS TotalRevenue,\n" +
            "           DENSE_RANK() OVER (ORDER BY SUM(Revenue) DESC) AS rnk\n" +
            "    FROM dbo.OrderLines\n" +
            "    GROUP BY Category\n" +
            ")\n" +
            "SELECT Category, TotalRevenue FROM Totals WHERE rnk = 1;"
        }
      ],
      walkthrough: [
        { step: "Sum revenue per category", note: "Games 450, Toys 250, Books 120.",
          table: { columns: ["Category","TotalRevenue"], rows: [["Games","450.00"],["Toys","250.00"],["Books","120.00"]] } },
        { step: "Keep the highest total", note: "Games leads at 450; no tie.",
          table: { columns: ["Category","TotalRevenue"], rows: [["Games","450.00"]] } }
      ],
      patternRecognition: [
        "'the top group by a total' → GROUP + SUM, then TOP 1 WITH TIES or DENSE_RANK = 1 on the totals."
      ],
      interviewRecall: [
        "You cannot compare a group SUM to MAX(SUM) in one flat query — rank or TOP the totals.",
        "`TOP 1 WITH TIES` and `DENSE_RANK = 1` both keep tied leaders; plain TOP 1 does not."
      ],
      commonMistakes: [
        "Using plain `TOP 1` and dropping a category tied for the highest revenue.",
        "Ranking raw order lines instead of the per-category totals."
      ]
    },

    {
      id: "average-rating-null-handling",
      number: "SS 10240",
      platform: "StrataScratch",
      title: "Average Rating with Missing Scores",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "NULL Handling"],
      domains: ["Product Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Average ignoring NULLs", sqlConcept: "AVG vs COUNT(*) vs COUNT(col)", technique: "NULL-aware aggregation" },
      descriptionBrief:
        "Given a **Reviews** table where some rows have no `Rating` yet (NULL), return per product the " +
        "**average rating** (rounded to 2 decimals) and the number of **rated** reviews, ordered by product id.",
      schema: [
        { name: "Reviews", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "ProductId", type: "INT" },
          { name: "Rating", type: "INT", note: "NULL = not yet rated" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Reviews','U') IS NOT NULL DROP TABLE dbo.Reviews;\n" +
        "CREATE TABLE dbo.Reviews (Id INT PRIMARY KEY, ProductId INT, Rating INT);\n" +
        "INSERT INTO dbo.Reviews VALUES\n" +
        "  (1,1,4),(2,1,NULL),(3,1,2),\n" +
        "  (4,2,5),(5,2,NULL);",
      sampleData: [
        { table: "Reviews", columns: ["Id","ProductId","Rating"],
          rows: [[1,1,4],[2,1,null],[3,1,2],[4,2,5],[5,2,null]] }
      ],
      expectedOutput: { columns: ["ProductId","AvgRating","RatedReviews"],
        rows: [[1,"3.00",2],[2,"5.00",1]] },
      approaches: [
        {
          name: "AVG over non-NULL ratings (recommended)",
          perfNote: "AVG and COUNT(Rating) both ignore NULLs in one grouped pass; no filtering subquery is needed to exclude the unrated rows.",
          dialectNote: "",
          logic:
            "**What it asks.** The mean rating per product plus how many reviews actually carried a rating.\n\n" +
            "**Why the naive idea fails.** Treating NULL as zero (via `ISNULL(Rating,0)`) drags the average down; and `COUNT(*)` counts unrated rows too, overstating the number of ratings.\n\n" +
            "**Key Idea.** `AVG` and `COUNT(col)` both skip NULLs by definition, so averaging `Rating` divides the sum of real ratings by the count of *rated* rows — exactly what is wanted.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY ProductId`.\n" +
            "2. `AVG` the rating (cast to DECIMAL so the mean is not integer-truncated), rounded to 2 places.\n" +
            "3. `COUNT(Rating)` for the number of rated reviews (not `COUNT(*)`).\n" +
            "4. Order by product id.\n\n" +
            "**Why it works.** SQL aggregates other than `COUNT(*)` ignore NULL inputs, so unrated rows never enter the sum or the divisor.\n\n" +
            "**Common Gotchas.** `AVG` over an INT column truncates — cast to DECIMAL first. `COUNT(*)` would count the NULL rows; use `COUNT(Rating)`.\n\n" +
            "**Performance.** One grouped aggregate, O(n).\n\n" +
            "**Interview mindset.** 'average that ignores missing values' → plain AVG (NULLs are skipped); count the rated rows with COUNT(col), not COUNT(*).",
          tsql:
            "SELECT ProductId,\n" +
            "       CAST(AVG(CAST(Rating AS DECIMAL(6,2))) AS DECIMAL(6,2)) AS AvgRating, -- NULLs skipped\n" +
            "       COUNT(Rating) AS RatedReviews   -- counts non-NULL ratings only\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY ProductId\n" +
            "ORDER BY ProductId;",
          clean:
            "SELECT ProductId,\n" +
            "       CAST(AVG(CAST(Rating AS DECIMAL(6,2))) AS DECIMAL(6,2)) AS AvgRating,\n" +
            "       COUNT(Rating) AS RatedReviews\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY ProductId\n" +
            "ORDER BY ProductId;"
        }
      ],
      walkthrough: [
        { step: "Average non-NULL ratings per product", note: "Product 1: (4+2)/2 = 3.00 over 2 rated rows (the NULL is skipped). Product 2: 5/1 = 5.00.",
          table: { columns: ["ProductId","AvgRating","RatedReviews"], rows: [[1,"3.00",2],[2,"5.00",1]] } }
      ],
      patternRecognition: [
        "'average ignoring blanks / not-yet-set values' → plain AVG (NULLs are excluded automatically).",
        "'how many actually have a value' → `COUNT(col)`, not `COUNT(*)`."
      ],
      interviewRecall: [
        "AVG, SUM, COUNT(col) all ignore NULLs; only COUNT(*) counts every row.",
        "AVG over INT truncates — cast to DECIMAL for a fractional mean."
      ],
      commonMistakes: [
        "Coalescing NULL ratings to 0, which biases the average downward.",
        "Using COUNT(*) and overstating the number of actual ratings."
      ]
    },

    {
      id: "median-salary-per-department-agg",
      number: "DL 2091",
      platform: "DataLemur",
      title: "Median Salary per Department",
      difficulty: "Hard",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Median per group", sqlConcept: "PERCENTILE_CONT", technique: "Percentile within group" },
      descriptionBrief:
        "Given a **Salaries** table, return the **median salary** for each department. The median is the " +
        "middle value (or the mean of the two middle values when the department has an even headcount).",
      schema: [
        { name: "Salaries", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Dept", type: "VARCHAR(10)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Salaries','U') IS NOT NULL DROP TABLE dbo.Salaries;\n" +
        "CREATE TABLE dbo.Salaries (Id INT PRIMARY KEY, Dept VARCHAR(10), Salary INT);\n" +
        "INSERT INTO dbo.Salaries VALUES\n" +
        "  (1,'A',100),(2,'A',200),(3,'A',300),\n" +
        "  (4,'B',100),(5,'B',400);",
      sampleData: [
        { table: "Salaries", columns: ["Id","Dept","Salary"],
          rows: [[1,"A",100],[2,"A",200],[3,"A",300],[4,"B",100],[5,"B",400]] }
      ],
      expectedOutput: { columns: ["Dept","MedianSalary"], rows: [["A","200.00"],["B","250.00"]] },
      approaches: [
        {
          name: "PERCENTILE_CONT within group (recommended)",
          perfNote: "PERCENTILE_CONT(0.5) computes the median directly, interpolating for even counts; DISTINCT collapses its per-row output to one row per department.",
          dialectNote: "`PERCENTILE_CONT` is an analytic function used with `WITHIN GROUP (ORDER BY ...) OVER (PARTITION BY ...)`; it returns a value per row, so deduplicate.",
          logic:
            "**What it asks.** The middle salary per department, averaging the two central values when the count is even.\n\n" +
            "**Why the naive idea fails.** SQL Server has no `MEDIAN` aggregate, and `AVG` is the mean, not the median — they differ whenever the distribution is skewed.\n\n" +
            "**Key Idea.** `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary) OVER (PARTITION BY Dept)` returns the 50th percentile per department, interpolating between the two middle values on even counts.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Apply `PERCENTILE_CONT(0.5)` ordered by salary, partitioned by department.\n" +
            "2. Because it is analytic (one value per row, not a grouped aggregate), wrap the query and `SELECT DISTINCT Dept, median`.\n" +
            "3. Order by department.\n\n" +
            "**Why it works.** `PERCENTILE_CONT` at 0.5 is the continuous median: for department A it lands on 200; for B it interpolates (100+400)/2 = 250.\n\n" +
            "**Common Gotchas.** It emits the same median on every partition row, so you must DISTINCT (or group in an outer query) to get one row per department. It returns a float — cast for display.\n\n" +
            "**Performance.** A sort per partition to locate the percentile; O(n log n).\n\n" +
            "**Interview mindset.** 'median / a percentile per group' → PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY g), then dedupe.",
          tsql:
            "SELECT DISTINCT\n" +
            "       Dept,\n" +
            "       CAST(PERCENTILE_CONT(0.5)                 -- 50th percentile = median\n" +
            "              WITHIN GROUP (ORDER BY Salary)\n" +
            "              OVER (PARTITION BY Dept) AS DECIMAL(10,2)) AS MedianSalary\n" +
            "FROM dbo.Salaries\n" +
            "ORDER BY Dept;",
          clean:
            "SELECT DISTINCT\n" +
            "       Dept,\n" +
            "       CAST(PERCENTILE_CONT(0.5)\n" +
            "              WITHIN GROUP (ORDER BY Salary)\n" +
            "              OVER (PARTITION BY Dept) AS DECIMAL(10,2)) AS MedianSalary\n" +
            "FROM dbo.Salaries\n" +
            "ORDER BY Dept;"
        }
      ],
      walkthrough: [
        { step: "PERCENTILE_CONT(0.5) per department", note: "Dept A (100,200,300) → middle 200. Dept B (100,400) → (100+400)/2 = 250. Same value repeats on each partition row before DISTINCT.",
          table: { columns: ["Dept","MedianSalary"], rows: [["A","200.00"],["B","250.00"]] } }
      ],
      patternRecognition: [
        "'median / Nth percentile per group' → `PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY g)`."
      ],
      interviewRecall: [
        "SQL Server has no MEDIAN aggregate — use PERCENTILE_CONT(0.5).",
        "PERCENTILE_CONT is analytic (one value per row); DISTINCT or an outer GROUP BY collapses it to one row per group.",
        "PERCENTILE_CONT interpolates; PERCENTILE_DISC returns an actual data point."
      ],
      commonMistakes: [
        "Using AVG and calling it the median.",
        "Forgetting to DISTINCT, so the median repeats once per employee row."
      ]
    }
  ]);
})();
