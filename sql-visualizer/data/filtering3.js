/*
 * data/filtering3.js — Filtering & Subqueries topic (additional problems).
 * Follows the ranking.js exemplar schema exactly. All T-SQL targets SQL Server
 * 2019/2022 and runs as-is in SSMS 19/21. ids are prefixed "filt3-".
 */
(function () {
  window.SQLLAB.register("Filtering & Subqueries", [

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-high-value-customers",
      number: "SL 3001",
      platform: "StudyLab",
      title: "High-Value Customers Above a Spend Threshold",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering", "Comparison Predicates"],
      domains: ["E-commerce Analytics"],
      link: "",
      meta: { pattern: "Threshold filter", sqlConcept: "WHERE with subquery threshold", technique: "Scalar-subquery comparison" },
      descriptionBrief:
        "Given a **Customers** table (`Name`, `LifetimeSpend`) and a single-row **Config** table " +
        "holding the VIP `MinSpend` threshold, return every customer whose lifetime spend is **at " +
        "or above** that threshold, highest spender first.",
      schema: [
        { name: "Customers", columns: [
          { name: "CustomerId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "LifetimeSpend", type: "INT" } ] },
        { name: "Config", columns: [
          { name: "MinSpend", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "IF OBJECT_ID('dbo.Config','U') IS NOT NULL DROP TABLE dbo.Config;\n" +
        "CREATE TABLE dbo.Customers (CustomerId INT PRIMARY KEY, Name VARCHAR(50), LifetimeSpend INT);\n" +
        "CREATE TABLE dbo.Config (MinSpend INT);\n" +
        "INSERT INTO dbo.Config VALUES (500);\n" +
        "INSERT INTO dbo.Customers VALUES\n" +
        "  (1,'Amy',450),(2,'Ben',600),(3,'Cora',500),(4,'Dan',300),(5,'Eve',900);",
      sampleData: [
        { table: "Config", columns: ["MinSpend"], rows: [[500]] },
        { table: "Customers", columns: ["CustomerId","Name","LifetimeSpend"],
          rows: [[1,"Amy",450],[2,"Ben",600],[3,"Cora",500],[4,"Dan",300],[5,"Eve",900]] }
      ],
      expectedOutput: { columns: ["Name","LifetimeSpend"],
        rows: [["Eve",900],["Ben",600],["Cora",500]] },
      approaches: [
        {
          name: "Scalar subquery threshold (recommended)",
          perfNote: "The Config subquery runs once and folds to a constant; the outer scan then applies a single range predicate. An index on LifetimeSpend supports a seek.",
          dialectNote: "",
          logic:
            "**What it asks.** Every customer whose lifetime spend meets or beats the configured VIP threshold.\n\n" +
            "**Why the naive idea fails.** Hard-coding `>= 500` in the query means editing SQL whenever marketing retunes the cutoff; the threshold belongs in data, not in the predicate.\n\n" +
            "**Key Idea.** Read the threshold from `Config` with a scalar subquery and compare `LifetimeSpend` against it with `>=`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write `(SELECT MinSpend FROM dbo.Config)` as a scalar subquery — it returns one value.\n" +
            "2. In the WHERE clause compare `LifetimeSpend >=` that value.\n" +
            "3. Project `Name` and `LifetimeSpend` and order by spend descending.\n\n" +
            "**Why it works.** A single-row, single-column subquery is a scalar, usable anywhere a value is expected; the optimizer evaluates it once.\n\n" +
            "**Common Gotchas.** A scalar subquery that returns more than one row raises an error — `Config` must hold exactly one row. Use `>=` not `>` because the threshold is inclusive.\n\n" +
            "**Performance.** One evaluation of the subquery plus one pass (or index seek) over Customers; negligible cost.\n\n" +
            "**Interview mindset.** 'Threshold that lives in a table' → scalar subquery in the predicate keeps the logic data-driven.",
          tsql:
            "SELECT Name, LifetimeSpend\n" +
            "FROM dbo.Customers\n" +
            "WHERE LifetimeSpend >= (SELECT MinSpend FROM dbo.Config)   -- inclusive VIP cutoff\n" +
            "ORDER BY LifetimeSpend DESC;",
          clean:
            "SELECT Name, LifetimeSpend\n" +
            "FROM dbo.Customers\n" +
            "WHERE LifetimeSpend >= (SELECT MinSpend FROM dbo.Config)\n" +
            "ORDER BY LifetimeSpend DESC;"
        }
      ],
      walkthrough: [
        { step: "Resolve the threshold", note: "Config yields MinSpend = 500.",
          table: { columns: ["MinSpend"], rows: [[500]] } },
        { step: "Keep spend >= 500, order DESC", note: "Amy (450) and Dan (300) drop; Cora (500) stays because the cutoff is inclusive.",
          table: { columns: ["Name","LifetimeSpend"], rows: [["Eve",900],["Ben",600],["Cora",500]] } }
      ],
      patternRecognition: [
        "'Above/below a configurable threshold' → scalar subquery in the WHERE clause.",
        "Inclusive cutoff → `>=`; strictly above → `>`."
      ],
      interviewRecall: [
        "A scalar subquery must return at most one row and one column.",
        "Storing thresholds in a table keeps the query stable while the business tunes the number."
      ],
      commonMistakes: [
        "Using `>` when the spec says 'at or above' and dropping the boundary customer.",
        "Letting Config hold multiple rows, which makes the scalar subquery error out."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-products-never-sold",
      number: "SL 3002",
      platform: "StudyLab",
      title: "Products That Were Never Sold",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Anti-Join", "NOT EXISTS"],
      domains: ["Retail Analytics"],
      link: "",
      meta: { pattern: "Anti-join / absence", sqlConcept: "NOT EXISTS", technique: "Correlated non-existence" },
      descriptionBrief:
        "Given a **Products** catalog and an **OrderItems** table of line items, return the products " +
        "that appear in **no** order line — items that have never sold — alphabetically by name.",
      schema: [
        { name: "Products", columns: [
          { name: "ProductId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "OrderItems", columns: [
          { name: "OrderItemId", type: "INT", note: "PK" },
          { name: "ProductId", type: "INT", note: "FK → Products.ProductId" },
          { name: "Qty", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderItems','U') IS NOT NULL DROP TABLE dbo.OrderItems;\n" +
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (ProductId INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.OrderItems (OrderItemId INT PRIMARY KEY, ProductId INT, Qty INT);\n" +
        "INSERT INTO dbo.Products VALUES (1,'Laptop'),(2,'Mouse'),(3,'Keyboard'),(4,'Monitor');\n" +
        "INSERT INTO dbo.OrderItems VALUES (1,1,2),(2,1,1),(3,3,5);",
      sampleData: [
        { table: "Products", columns: ["ProductId","Name"], rows: [[1,"Laptop"],[2,"Mouse"],[3,"Keyboard"],[4,"Monitor"]] },
        { table: "OrderItems", columns: ["OrderItemId","ProductId","Qty"], rows: [[1,1,2],[2,1,1],[3,3,5]] }
      ],
      expectedOutput: { columns: ["ProductId","Name"], rows: [[4,"Monitor"],[2,"Mouse"]] },
      approaches: [
        {
          name: "NOT EXISTS (recommended)",
          perfNote: "The correlated NOT EXISTS stops at the first matching line item and is null-safe. An index on OrderItems(ProductId) makes each probe a seek.",
          dialectNote: "",
          logic:
            "**What it asks.** Catalog products with zero order lines — the anti-join of Products against OrderItems.\n\n" +
            "**Why the naive idea fails.** `NOT IN (SELECT ProductId FROM OrderItems)` silently returns *nothing* if any ProductId in the subquery is NULL, because `x NOT IN (.., NULL)` is never true. That is a classic trap.\n\n" +
            "**Key Idea.** For each product, test that **no** matching line item exists with a correlated `NOT EXISTS`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Products p`.\n" +
            "2. In WHERE, add `NOT EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.ProductId = p.ProductId)`.\n" +
            "3. Keep the products for which the probe finds nothing; order by name.\n\n" +
            "**Why it works.** EXISTS returns true/false on presence, never NULL, so absence is detected correctly even when ProductId columns contain NULLs.\n\n" +
            "**Common Gotchas.** Prefer NOT EXISTS over NOT IN whenever the subquery column can be NULL. The inner `SELECT 1` is idiomatic — the projected value is irrelevant.\n\n" +
            "**Performance.** Each product probes OrderItems once and short-circuits; O(n) probes, each a seek with the right index.\n\n" +
            "**Interview mindset.** 'Things with none of X' → anti-join, and reach for NOT EXISTS to sidestep the NOT IN / NULL landmine.",
          tsql:
            "SELECT p.ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1                       -- presence test only\n" +
            "    FROM dbo.OrderItems oi\n" +
            "    WHERE oi.ProductId = p.ProductId\n" +
            ")\n" +
            "ORDER BY p.Name;",
          clean:
            "SELECT p.ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.ProductId = p.ProductId)\n" +
            "ORDER BY p.Name;"
        },
        {
          name: "LEFT JOIN … IS NULL",
          perfNote: "Outer-join then keep the unmatched rows. Reads well and is null-safe; may materialize matched rows the anti-join would skip.",
          dialectNote: "",
          logic:
            "**Key Idea.** LEFT JOIN Products to OrderItems and keep only rows where no match was found (the right side is NULL).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN dbo.OrderItems oi ON oi.ProductId = p.ProductId`.\n" +
            "2. Filter `WHERE oi.ProductId IS NULL` to keep unmatched products.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** An unmatched LEFT JOIN row fills the right-hand columns with NULL, so IS NULL isolates the never-sold products.\n\n" +
            "**Common Gotchas.** Test IS NULL on a right-side column that is guaranteed non-null when a match exists (the join key), not on a nullable data column.\n\n" +
            "**Performance.** One join plus a filter; comparable to the anti-join for small tables.\n\n" +
            "**Interview mindset.** The 'anti-join without a subquery' phrasing — good to show you know both forms.",
          tsql:
            "SELECT p.ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "LEFT JOIN dbo.OrderItems oi ON oi.ProductId = p.ProductId\n" +
            "WHERE oi.ProductId IS NULL      -- no matching line item\n" +
            "ORDER BY p.Name;",
          clean:
            "SELECT p.ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "LEFT JOIN dbo.OrderItems oi ON oi.ProductId = p.ProductId\n" +
            "WHERE oi.ProductId IS NULL\n" +
            "ORDER BY p.Name;"
        }
      ],
      walkthrough: [
        { step: "Which products appear in OrderItems?", note: "ProductIds 1 and 3 have line items; 2 and 4 do not.",
          table: { columns: ["ProductId","SoldAtLeastOnce"], rows: [[1,"yes"],[2,"no"],[3,"yes"],[4,"no"]] } },
        { step: "Keep the never-sold, order by name", note: "Monitor and Mouse survive; alphabetical order.",
          table: { columns: ["ProductId","Name"], rows: [[4,"Monitor"],[2,"Mouse"]] } }
      ],
      patternRecognition: [
        "'Rows in A with no match in B' → anti-join via `NOT EXISTS` or `LEFT JOIN ... IS NULL`.",
        "Nullable subquery column → avoid `NOT IN`; use `NOT EXISTS`."
      ],
      interviewRecall: [
        "EXISTS yields only true/false, never NULL — safe for absence tests.",
        "NOT IN with a NULL in the list returns no rows at all."
      ],
      commonMistakes: [
        "Using `NOT IN (SELECT ProductId ...)` when ProductId can be NULL and getting an empty result.",
        "Filtering IS NULL on a nullable data column instead of the join key."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-employees-without-manager",
      number: "SL 3003",
      platform: "StudyLab",
      title: "Employees Who Report to No One",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering", "NULL Handling"],
      domains: ["HR Analytics"],
      link: "",
      meta: { pattern: "NULL predicate", sqlConcept: "IS NULL", technique: "Three-valued logic filter" },
      descriptionBrief:
        "Given an **Employees** table with a self-referencing `ManagerId`, return the employees who " +
        "have **no manager** — the ones whose `ManagerId` is NULL (top of the org chart) — ordered " +
        "by name.",
      schema: [
        { name: "Employees", columns: [
          { name: "EmpId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "ManagerId", type: "INT", note: "FK → Employees.EmpId, NULL if none" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (EmpId INT PRIMARY KEY, Name VARCHAR(50), ManagerId INT NULL);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Alice',NULL),(2,'Bob',1),(3,'Cara',1),(4,'Drew',NULL),(5,'Ed',2);",
      sampleData: [
        { table: "Employees", columns: ["EmpId","Name","ManagerId"],
          rows: [[1,"Alice",null],[2,"Bob",1],[3,"Cara",1],[4,"Drew",null],[5,"Ed",2]] }
      ],
      expectedOutput: { columns: ["EmpId","Name"], rows: [[1,"Alice"],[4,"Drew"]] },
      approaches: [
        {
          name: "IS NULL predicate (recommended)",
          perfNote: "A single scan with an IS NULL filter; a filtered index on ManagerId can serve it directly. Trivial cost.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees at the top of the hierarchy — those with no manager assigned.\n\n" +
            "**Why the naive idea fails.** `WHERE ManagerId = NULL` never matches: in three-valued logic any comparison *to* NULL yields UNKNOWN, which the WHERE clause treats as false. The result would be empty.\n\n" +
            "**Key Idea.** Test for the absence of a value with the `IS NULL` predicate, which is the only correct way to match NULLs.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Employees`.\n" +
            "2. Filter `WHERE ManagerId IS NULL`.\n" +
            "3. Project the id and name; order by name.\n\n" +
            "**Why it works.** `IS NULL` is a dedicated predicate returning true/false (not UNKNOWN), so it correctly identifies rows whose ManagerId is missing.\n\n" +
            "**Common Gotchas.** Never use `= NULL` or `<> NULL`; both evaluate to UNKNOWN. A NULL ManagerId means 'no manager', distinct from a ManagerId of 0.\n\n" +
            "**Performance.** One pass; O(n). A filtered index `WHERE ManagerId IS NULL` makes it a seek.\n\n" +
            "**Interview mindset.** The instant NULL check tells the interviewer you know equality never matches NULL — say `IS NULL`, not `= NULL`.",
          tsql:
            "SELECT EmpId, Name\n" +
            "FROM dbo.Employees\n" +
            "WHERE ManagerId IS NULL          -- no manager assigned\n" +
            "ORDER BY Name;",
          clean:
            "SELECT EmpId, Name\n" +
            "FROM dbo.Employees\n" +
            "WHERE ManagerId IS NULL\n" +
            "ORDER BY Name;"
        }
      ],
      walkthrough: [
        { step: "Evaluate ManagerId IS NULL", note: "Alice and Drew have NULL managers; the rest point to a manager.",
          table: { columns: ["EmpId","Name","ManagerId","IsNull"],
            rows: [[1,"Alice",null,"true"],[2,"Bob",1,"false"],[3,"Cara",1,"false"],[4,"Drew",null,"true"],[5,"Ed",2,"false"]] } },
        { step: "Keep the true rows, order by name", note: "Alice then Drew.",
          table: { columns: ["EmpId","Name"], rows: [[1,"Alice"],[4,"Drew"]] } }
      ],
      patternRecognition: [
        "'Has no X / missing value' → `IS NULL`, never `= NULL`.",
        "Self-referencing FK with NULL root → top-of-hierarchy filter."
      ],
      interviewRecall: [
        "Any comparison to NULL yields UNKNOWN, which WHERE treats as false.",
        "`IS NULL` / `IS NOT NULL` are the only predicates that match or exclude NULL."
      ],
      commonMistakes: [
        "Writing `WHERE ManagerId = NULL` and getting an empty result.",
        "Conflating NULL (no manager) with a sentinel like 0."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-orders-above-category-average",
      number: "SL 3004",
      platform: "StudyLab",
      title: "Orders Exceeding Their Category Average",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Correlated Subquery", "Aggregation"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Compare row to group aggregate", sqlConcept: "Correlated AVG subquery", technique: "Per-group comparison" },
      descriptionBrief:
        "Given an **Orders** table (`Category`, `Amount`), return the orders whose amount is **strictly " +
        "greater than the average order amount within the same category**, ordered by category then " +
        "amount.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, Category VARCHAR(30), Amount INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'Books',20),(2,'Books',40),(3,'Books',60),\n" +
        "  (4,'Toys',100),(5,'Toys',200),(6,'Games',50);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","Category","Amount"],
          rows: [[1,"Books",20],[2,"Books",40],[3,"Books",60],[4,"Toys",100],[5,"Toys",200],[6,"Games",50]] }
      ],
      expectedOutput: { columns: ["OrderId","Category","Amount"],
        rows: [[3,"Books",60],[5,"Toys",200]] },
      approaches: [
        {
          name: "Correlated AVG subquery (recommended)",
          perfNote: "The subquery re-derives each category average per row; fine on small data. A window-function variant computes the average once per partition.",
          dialectNote: "",
          logic:
            "**What it asks.** Orders that beat the average order amount of their own category.\n\n" +
            "**Why the naive idea fails.** A single `WHERE Amount > AVG(Amount)` cannot mix a row with an aggregate — you cannot use a bare aggregate in WHERE, and a global average would compare every category to one number instead of its own.\n\n" +
            "**Key Idea.** Correlate an `AVG(Amount)` subquery on `Category` so each order is compared to its category's own average.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Orders o`.\n" +
            "2. In WHERE compare `o.Amount >` a correlated `(SELECT AVG(Amount) FROM Orders o2 WHERE o2.Category = o.Category)`.\n" +
            "3. Keep the rows that exceed it; order by category, then amount.\n\n" +
            "**Why it works.** The correlation predicate scopes the average to the matching category, so each order is judged against the right baseline.\n\n" +
            "**Common Gotchas.** `AVG` over INT columns does integer division in T-SQL; here the averages (40, 150, 50) are whole numbers, but cast to a decimal when fractional averages matter. Forgetting the correlation compares against the global average.\n\n" +
            "**Performance.** Without an index the subquery re-scans per row; an index on `(Category, Amount)` lets each average compute from a seek.\n\n" +
            "**Interview mindset.** 'Row versus its group's aggregate' → correlated subquery on the group key, or a windowed AVG().",
          tsql:
            "SELECT o.OrderId, o.Category, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.Amount > (\n" +
            "    SELECT AVG(o2.Amount)                -- category-local average\n" +
            "    FROM dbo.Orders o2\n" +
            "    WHERE o2.Category = o.Category\n" +
            ")\n" +
            "ORDER BY o.Category, o.Amount;",
          clean:
            "SELECT o.OrderId, o.Category, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.Amount > (SELECT AVG(o2.Amount) FROM dbo.Orders o2 WHERE o2.Category = o.Category)\n" +
            "ORDER BY o.Category, o.Amount;"
        },
        {
          name: "Windowed AVG (one pass)",
          perfNote: "Computes each category average once via a window, then filters. One sort/segment pass instead of per-row re-aggregation.",
          dialectNote: "",
          logic:
            "**Key Idea.** Compute `AVG(Amount) OVER (PARTITION BY Category)` alongside each row, then keep rows above their partition average.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, add `AVG(Amount) OVER (PARTITION BY Category) AS CatAvg`.\n" +
            "2. In the outer query filter `Amount > CatAvg`.\n" +
            "3. Order by category, then amount.\n\n" +
            "**Why it works.** The partitioned window gives every row its category average without a self-join, and the outer filter compares the two.\n\n" +
            "**Common Gotchas.** You cannot filter on the window result in the same SELECT's WHERE — wrap it in a CTE or derived table first.\n\n" +
            "**Performance.** One partitioned pass; usually cheaper than a correlated subquery at scale.\n\n" +
            "**Interview mindset.** Offering the window version signals you know how to avoid repeated aggregation.",
          tsql:
            "WITH WithAvg AS (\n" +
            "    SELECT OrderId, Category, Amount,\n" +
            "           AVG(Amount) OVER (PARTITION BY Category) AS CatAvg\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, Category, Amount\n" +
            "FROM WithAvg\n" +
            "WHERE Amount > CatAvg\n" +
            "ORDER BY Category, Amount;",
          clean:
            "WITH WithAvg AS (\n" +
            "    SELECT OrderId, Category, Amount,\n" +
            "           AVG(Amount) OVER (PARTITION BY Category) AS CatAvg\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, Category, Amount\n" +
            "FROM WithAvg\n" +
            "WHERE Amount > CatAvg\n" +
            "ORDER BY Category, Amount;"
        }
      ],
      walkthrough: [
        { step: "Compute each category average", note: "Books avg = 40, Toys avg = 150, Games avg = 50.",
          table: { columns: ["Category","CatAvg"], rows: [["Books",40],["Toys",150],["Games",50]] } },
        { step: "Keep Amount > CatAvg", note: "Books 60 > 40 and Toys 200 > 150 qualify; Games 50 is not > 50.",
          table: { columns: ["OrderId","Category","Amount"], rows: [[3,"Books",60],[5,"Toys",200]] } }
      ],
      patternRecognition: [
        "'Row above/below its group's average' → correlated aggregate subquery or windowed AVG.",
        "You cannot put a bare aggregate directly in WHERE."
      ],
      interviewRecall: [
        "Correlate the subquery on the group key so the average is group-local.",
        "AVG over INT truncates in T-SQL — cast for fractional precision."
      ],
      commonMistakes: [
        "Comparing every category to a single global average.",
        "Trying to filter a window column in the same query's WHERE without a CTE."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-orders-in-date-range",
      number: "SL 3005",
      platform: "StudyLab",
      title: "Orders Within a Quarter (Date Range)",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering", "Date Ranges"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Range filter", sqlConcept: "BETWEEN on dates", technique: "Inclusive date-range predicate" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerName`, `OrderDate`, `Amount`), return the orders placed in " +
        "**Q1 2024** — from 2024-01-01 through 2024-03-31 inclusive — ordered by date.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerName", type: "VARCHAR(50)" },
          { name: "OrderDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerName VARCHAR(50), OrderDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'Amy','2023-12-31',100),(2,'Ben','2024-01-15',200),\n" +
        "  (3,'Cora','2024-02-20',150),(4,'Dan','2024-03-31',300),\n" +
        "  (5,'Eve','2024-04-01',250);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerName","OrderDate","Amount"],
          rows: [[1,"Amy","2023-12-31",100],[2,"Ben","2024-01-15",200],[3,"Cora","2024-02-20",150],[4,"Dan","2024-03-31",300],[5,"Eve","2024-04-01",250]] }
      ],
      expectedOutput: { columns: ["OrderId","CustomerName","OrderDate","Amount"],
        rows: [[2,"Ben","2024-01-15",200],[3,"Cora","2024-02-20",150],[4,"Dan","2024-03-31",300]] },
      approaches: [
        {
          name: "Half-open range (recommended)",
          perfNote: "A `>= start AND < next-start` predicate is sargable and correct for both DATE and DATETIME columns; an index on OrderDate yields a range seek.",
          dialectNote: "",
          logic:
            "**What it asks.** All orders falling inside the first quarter of 2024, endpoints included.\n\n" +
            "**Why the naive idea fails.** `BETWEEN '2024-01-01' AND '2024-03-31'` is inclusive of the end date, but if `OrderDate` were a DATETIME a value like `2024-03-31 14:00` would exceed `2024-03-31 00:00` and be wrongly excluded. Building the predicate around functions like `YEAR()`/`MONTH()` also defeats index seeks.\n\n" +
            "**Key Idea.** Use a half-open interval `OrderDate >= '2024-01-01' AND OrderDate < '2024-04-01'`, which is correct regardless of time component and stays sargable.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Filter `OrderDate >= '2024-01-01'`.\n" +
            "2. And `OrderDate < '2024-04-01'` (the day after the quarter ends).\n" +
            "3. Order by `OrderDate`.\n\n" +
            "**Why it works.** The lower bound is inclusive and the upper bound is exclusive at the next period's start, so every instant of March 31 is captured without over-reaching into April.\n\n" +
            "**Common Gotchas.** Do not wrap `OrderDate` in a function (non-sargable). BETWEEN is fine for a pure DATE column but risky for DATETIME — the half-open form is the safe habit.\n\n" +
            "**Performance.** A range seek on an OrderDate index; O(log n + matches).\n\n" +
            "**Interview mindset.** For date ranges, say 'half-open interval' — it is the pattern that survives a schema change from DATE to DATETIME.",
          tsql:
            "SELECT OrderId, CustomerName, OrderDate, Amount\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate >= '2024-01-01'\n" +
            "  AND OrderDate <  '2024-04-01'   -- exclusive upper bound, DATETIME-safe\n" +
            "ORDER BY OrderDate;",
          clean:
            "SELECT OrderId, CustomerName, OrderDate, Amount\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate >= '2024-01-01' AND OrderDate < '2024-04-01'\n" +
            "ORDER BY OrderDate;"
        },
        {
          name: "BETWEEN (DATE column)",
          perfNote: "Inclusive on both ends; correct here because OrderDate is a pure DATE with no time component. Also sargable.",
          dialectNote: "`BETWEEN` is inclusive of both endpoints in T-SQL.",
          logic:
            "**Key Idea.** Since the column is a pure `DATE`, an inclusive `BETWEEN` captures the quarter exactly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Filter `OrderDate BETWEEN '2024-01-01' AND '2024-03-31'`.\n" +
            "2. Order by `OrderDate`.\n\n" +
            "**Why it works.** With no time-of-day, March 31 stored as a DATE equals the literal boundary, so the inclusive upper bound is safe.\n\n" +
            "**Common Gotchas.** This is only safe because the column is DATE. On a DATETIME column, prefer the half-open form.\n\n" +
            "**Performance.** BETWEEN compiles to `>= AND <=`, still a sargable range seek.\n\n" +
            "**Interview mindset.** Name the assumption out loud: 'BETWEEN is fine here because OrderDate is a DATE.'",
          tsql:
            "SELECT OrderId, CustomerName, OrderDate, Amount\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate BETWEEN '2024-01-01' AND '2024-03-31'   -- inclusive, safe for DATE\n" +
            "ORDER BY OrderDate;",
          clean:
            "SELECT OrderId, CustomerName, OrderDate, Amount\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate BETWEEN '2024-01-01' AND '2024-03-31'\n" +
            "ORDER BY OrderDate;"
        }
      ],
      walkthrough: [
        { step: "Apply the quarter bounds", note: "Amy (2023-12-31) is before the start; Eve (2024-04-01) is on/after the exclusive upper bound.",
          table: { columns: ["OrderId","OrderDate","InRange"],
            rows: [[1,"2023-12-31","no"],[2,"2024-01-15","yes"],[3,"2024-02-20","yes"],[4,"2024-03-31","yes"],[5,"2024-04-01","no"]] } },
        { step: "Keep in-range, order by date", note: "Ben, Cora, Dan remain.",
          table: { columns: ["OrderId","CustomerName","OrderDate","Amount"],
            rows: [[2,"Ben","2024-01-15",200],[3,"Cora","2024-02-20",150],[4,"Dan","2024-03-31",300]] } }
      ],
      patternRecognition: [
        "'Between two dates' → half-open `>= start AND < next-start`, DATETIME-safe.",
        "Wrapping the date column in a function → non-sargable, avoid."
      ],
      interviewRecall: [
        "BETWEEN is inclusive on both ends and only safe for pure DATE columns.",
        "Half-open intervals survive a DATE → DATETIME schema change."
      ],
      commonMistakes: [
        "Using an inclusive end date on a DATETIME column and dropping same-day afternoon rows.",
        "Filtering with `YEAR(OrderDate)=2024 AND MONTH(...)` and losing index seeks."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-customers-in-popular-cities",
      number: "SL 3006",
      platform: "StudyLab",
      title: "Customers in Cities With Multiple Customers",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["IN Subquery", "GROUP BY HAVING"],
      domains: ["Marketing Analytics"],
      link: "",
      meta: { pattern: "Membership in a derived set", sqlConcept: "IN (SELECT ... HAVING)", technique: "Derived-set membership" },
      descriptionBrief:
        "Given a **Customers** table (`Name`, `City`), return the customers who live in a city that " +
        "has **more than one** customer — membership in a set derived by `GROUP BY ... HAVING` — " +
        "ordered by city then name.",
      schema: [
        { name: "Customers", columns: [
          { name: "CustomerId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "City", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (CustomerId INT PRIMARY KEY, Name VARCHAR(50), City VARCHAR(30));\n" +
        "INSERT INTO dbo.Customers VALUES\n" +
        "  (1,'Amy','NYC'),(2,'Ben','NYC'),(3,'Cora','LA'),\n" +
        "  (4,'Dan','Chicago'),(5,'Eve','NYC'),(6,'Finn','LA');",
      sampleData: [
        { table: "Customers", columns: ["CustomerId","Name","City"],
          rows: [[1,"Amy","NYC"],[2,"Ben","NYC"],[3,"Cora","LA"],[4,"Dan","Chicago"],[5,"Eve","NYC"],[6,"Finn","LA"]] }
      ],
      expectedOutput: { columns: ["Name","City"],
        rows: [["Cora","LA"],["Finn","LA"],["Amy","NYC"],["Ben","NYC"],["Eve","NYC"]] },
      approaches: [
        {
          name: "IN a derived HAVING set (recommended)",
          perfNote: "The inner GROUP BY/HAVING builds the qualifying-city set once; the outer scan tests membership. An index on City helps both the grouping and the probe.",
          dialectNote: "",
          logic:
            "**What it asks.** Every customer whose city contains more than one customer.\n\n" +
            "**Why the naive idea fails.** You cannot express 'city has >1 customer' with a plain WHERE on a single row — the condition is about the *group*, not the row. A COUNT can only be tested with HAVING, and that lives in an aggregated query.\n\n" +
            "**Key Idea.** Build the set of qualifying cities with `GROUP BY City HAVING COUNT(*) > 1`, then keep customers whose `City IN` that set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Inner query: `SELECT City FROM Customers GROUP BY City HAVING COUNT(*) > 1`.\n" +
            "2. Outer query: `WHERE City IN (that set)`.\n" +
            "3. Project name and city; order by city, then name.\n\n" +
            "**Why it works.** HAVING filters groups after aggregation, producing exactly the multi-customer cities; IN then admits every customer belonging to one.\n\n" +
            "**Common Gotchas.** HAVING is for post-aggregate conditions; WHERE cannot reference COUNT(*). The IN-list column (City) is non-nullable here, so no NULL trap; if it were nullable, prefer EXISTS.\n\n" +
            "**Performance.** One aggregation plus a membership probe; both benefit from an index on City.\n\n" +
            "**Interview mindset.** 'Belongs to a group meeting an aggregate condition' → IN (or EXISTS) over a `GROUP BY ... HAVING` set.",
          tsql:
            "SELECT Name, City\n" +
            "FROM dbo.Customers\n" +
            "WHERE City IN (\n" +
            "    SELECT City\n" +
            "    FROM dbo.Customers\n" +
            "    GROUP BY City\n" +
            "    HAVING COUNT(*) > 1          -- cities with more than one customer\n" +
            ")\n" +
            "ORDER BY City, Name;",
          clean:
            "SELECT Name, City\n" +
            "FROM dbo.Customers\n" +
            "WHERE City IN (SELECT City FROM dbo.Customers GROUP BY City HAVING COUNT(*) > 1)\n" +
            "ORDER BY City, Name;"
        },
        {
          name: "Windowed COUNT filter",
          perfNote: "One partitioned pass tags each row with its city count; the outer filter keeps counts > 1. Avoids scanning the table twice.",
          dialectNote: "",
          logic:
            "**Key Idea.** Add `COUNT(*) OVER (PARTITION BY City)` to each row, then keep rows whose city count exceeds one.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `COUNT(*) OVER (PARTITION BY City) AS CityCount`.\n" +
            "2. Filter `CityCount > 1` in the outer query.\n" +
            "3. Order by city, then name.\n\n" +
            "**Why it works.** The partitioned COUNT gives every customer the size of their city group without a separate aggregation query.\n\n" +
            "**Common Gotchas.** Filter the window column in an outer query/CTE, not in the same WHERE.\n\n" +
            "**Performance.** A single segment/hash pass; often preferable to the self-referencing subquery.\n\n" +
            "**Interview mindset.** Shows you can turn a group-membership test into a one-pass window filter.",
          tsql:
            "WITH Tagged AS (\n" +
            "    SELECT Name, City,\n" +
            "           COUNT(*) OVER (PARTITION BY City) AS CityCount\n" +
            "    FROM dbo.Customers\n" +
            ")\n" +
            "SELECT Name, City\n" +
            "FROM Tagged\n" +
            "WHERE CityCount > 1\n" +
            "ORDER BY City, Name;",
          clean:
            "WITH Tagged AS (\n" +
            "    SELECT Name, City,\n" +
            "           COUNT(*) OVER (PARTITION BY City) AS CityCount\n" +
            "    FROM dbo.Customers\n" +
            ")\n" +
            "SELECT Name, City\n" +
            "FROM Tagged\n" +
            "WHERE CityCount > 1\n" +
            "ORDER BY City, Name;"
        }
      ],
      walkthrough: [
        { step: "Derive qualifying cities", note: "NYC has 3, LA has 2 (both > 1); Chicago has 1 and is excluded.",
          table: { columns: ["City","CustomerCount"], rows: [["NYC",3],["LA",2],["Chicago",1]] } },
        { step: "Keep customers in those cities", note: "Chicago's Dan drops; order by city then name.",
          table: { columns: ["Name","City"], rows: [["Cora","LA"],["Finn","LA"],["Amy","NYC"],["Ben","NYC"],["Eve","NYC"]] } }
      ],
      patternRecognition: [
        "'Belongs to a group meeting a COUNT/SUM condition' → IN/EXISTS over `GROUP BY ... HAVING`.",
        "HAVING filters groups; WHERE filters rows before aggregation."
      ],
      interviewRecall: [
        "COUNT(*) cannot appear in WHERE — it needs HAVING or a window.",
        "A windowed COUNT can replace the derived-set subquery in one pass."
      ],
      commonMistakes: [
        "Trying to put `COUNT(*) > 1` in the WHERE clause of a non-aggregated query.",
        "Using IN over a nullable column and hitting the NULL trap (use EXISTS there)."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-warehouse-difference",
      number: "SL 3007",
      platform: "StudyLab",
      title: "SKUs in Warehouse A but Not Warehouse B",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Set Difference", "NOT EXISTS"],
      domains: ["Supply Chain Analytics"],
      link: "",
      meta: { pattern: "Set difference (A minus B)", sqlConcept: "NOT EXISTS vs EXCEPT", technique: "Anti-join difference" },
      descriptionBrief:
        "Given two stock tables, **WarehouseA** and **WarehouseB**, each listing `Sku` values, return " +
        "the SKUs stocked in **A but not in B** — the set difference A − B — ordered by SKU.",
      schema: [
        { name: "WarehouseA", columns: [
          { name: "Sku", type: "INT", note: "PK" } ] },
        { name: "WarehouseB", columns: [
          { name: "Sku", type: "INT", note: "PK" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.WarehouseA','U') IS NOT NULL DROP TABLE dbo.WarehouseA;\n" +
        "IF OBJECT_ID('dbo.WarehouseB','U') IS NOT NULL DROP TABLE dbo.WarehouseB;\n" +
        "CREATE TABLE dbo.WarehouseA (Sku INT PRIMARY KEY);\n" +
        "CREATE TABLE dbo.WarehouseB (Sku INT PRIMARY KEY);\n" +
        "INSERT INTO dbo.WarehouseA VALUES (100),(200),(300),(400);\n" +
        "INSERT INTO dbo.WarehouseB VALUES (200),(400);",
      sampleData: [
        { table: "WarehouseA", columns: ["Sku"], rows: [[100],[200],[300],[400]] },
        { table: "WarehouseB", columns: ["Sku"], rows: [[200],[400]] }
      ],
      expectedOutput: { columns: ["Sku"], rows: [[100],[300]] },
      approaches: [
        {
          name: "NOT EXISTS (recommended)",
          perfNote: "Each A row probes B once and short-circuits; null-safe and index-friendly on WarehouseB(Sku). Preserves duplicates from A if any.",
          dialectNote: "",
          logic:
            "**What it asks.** SKUs present in warehouse A whose value does not appear in warehouse B.\n\n" +
            "**Why the naive idea fails.** `Sku NOT IN (SELECT Sku FROM WarehouseB)` breaks to an empty result if B ever contains a NULL Sku, because `NOT IN` with a NULL in the list is never true.\n\n" +
            "**Key Idea.** For each A row, assert that **no** B row has the same Sku using a correlated `NOT EXISTS`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `WarehouseA a`.\n" +
            "2. Add `NOT EXISTS (SELECT 1 FROM WarehouseB b WHERE b.Sku = a.Sku)`.\n" +
            "3. Keep the A rows with no B match; order by Sku.\n\n" +
            "**Why it works.** EXISTS returns a definite true/false on presence, so absence is detected even when NULLs are present, giving a correct A − B.\n\n" +
            "**Common Gotchas.** NOT EXISTS keeps duplicate A rows (it filters, not de-duplicates), unlike EXCEPT which returns distinct rows. Choose based on whether you want duplicates.\n\n" +
            "**Performance.** O(|A|) probes into B, each a seek with an index on B(Sku).\n\n" +
            "**Interview mindset.** 'A minus B' → NOT EXISTS for the null-safe, duplicate-preserving anti-join; EXCEPT for a distinct set difference.",
          tsql:
            "SELECT a.Sku\n" +
            "FROM dbo.WarehouseA a\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1\n" +
            "    FROM dbo.WarehouseB b\n" +
            "    WHERE b.Sku = a.Sku            -- same SKU in B?\n" +
            ")\n" +
            "ORDER BY a.Sku;",
          clean:
            "SELECT a.Sku\n" +
            "FROM dbo.WarehouseA a\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.WarehouseB b WHERE b.Sku = a.Sku)\n" +
            "ORDER BY a.Sku;"
        },
        {
          name: "EXCEPT",
          perfNote: "Declarative set difference returning DISTINCT rows; compares all selected columns with null-equality semantics. Concise when duplicates are unwanted.",
          dialectNote: "`EXCEPT` returns distinct rows and treats NULLs as equal for matching.",
          logic:
            "**Key Idea.** Subtract B's SKU set from A's directly with the `EXCEPT` set operator.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `SELECT Sku FROM WarehouseA`.\n" +
            "2. `EXCEPT`.\n" +
            "3. `SELECT Sku FROM WarehouseB`, then order the result by Sku.\n\n" +
            "**Why it works.** EXCEPT yields the distinct rows from the top query absent from the bottom, which is exactly A − B, and its NULL-as-equal matching avoids the NOT IN trap.\n\n" +
            "**Common Gotchas.** EXCEPT de-duplicates — if A had duplicate SKUs you would lose the copies. Both SELECTs must have matching column counts and compatible types.\n\n" +
            "**Performance.** Typically a hash or merge of the two inputs; efficient for whole-set differences.\n\n" +
            "**Interview mindset.** When the answer is a distinct set, EXCEPT is the most readable expression of the difference.",
          tsql:
            "SELECT Sku FROM dbo.WarehouseA\n" +
            "EXCEPT\n" +
            "SELECT Sku FROM dbo.WarehouseB\n" +
            "ORDER BY Sku;",
          clean:
            "SELECT Sku FROM dbo.WarehouseA\n" +
            "EXCEPT\n" +
            "SELECT Sku FROM dbo.WarehouseB\n" +
            "ORDER BY Sku;"
        }
      ],
      walkthrough: [
        { step: "List A and mark presence in B", note: "200 and 400 are in B; 100 and 300 are not.",
          table: { columns: ["Sku","InB"], rows: [[100,"no"],[200,"yes"],[300,"no"],[400,"yes"]] } },
        { step: "Keep A rows absent from B", note: "100 and 300 form A − B.",
          table: { columns: ["Sku"], rows: [[100],[300]] } }
      ],
      patternRecognition: [
        "'In A but not in B' → `NOT EXISTS` (duplicate-preserving) or `EXCEPT` (distinct).",
        "EXCEPT matches NULLs as equal; NOT IN does not."
      ],
      interviewRecall: [
        "EXCEPT returns distinct rows and is null-safe; NOT EXISTS preserves duplicates.",
        "NOT IN over a nullable column can collapse to an empty result."
      ],
      commonMistakes: [
        "Reaching for NOT IN and getting nothing when B contains a NULL.",
        "Expecting EXCEPT to preserve duplicate rows from A."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt3-latest-order-per-customer",
      number: "SL 3008",
      platform: "StudyLab",
      title: "Each Customer's Most Recent Order",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Correlated Subquery", "Latest Record"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Latest record per group", sqlConcept: "Correlated MAX subquery", technique: "Per-group extreme filter" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `OrderDate`, `Amount`), return **each customer's most " +
        "recent order** — the row whose date equals that customer's maximum order date. Assume no " +
        "customer has two orders on the same date. Order by customer.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerId INT, OrderDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,'2024-01-01',100),(2,1,'2024-03-01',150),\n" +
        "  (3,2,'2024-02-01',200),(4,2,'2024-02-15',80),\n" +
        "  (5,3,'2024-01-10',300);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","OrderDate","Amount"],
          rows: [[1,1,"2024-01-01",100],[2,1,"2024-03-01",150],[3,2,"2024-02-01",200],[4,2,"2024-02-15",80],[5,3,"2024-01-10",300]] }
      ],
      expectedOutput: { columns: ["CustomerId","OrderId","OrderDate","Amount"],
        rows: [[1,2,"2024-03-01",150],[2,4,"2024-02-15",80],[3,5,"2024-01-10",300]] },
      approaches: [
        {
          name: "Correlated MAX(OrderDate) (recommended)",
          perfNote: "The subquery finds each customer's max date; the row is kept when its date matches. An index on (CustomerId, OrderDate) makes each lookup a seek.",
          dialectNote: "",
          logic:
            "**What it asks.** The single latest order for every customer.\n\n" +
            "**Why the naive idea fails.** `MAX(OrderDate)` in a GROUP BY gives the latest *date* per customer but drops the OrderId and Amount of that specific row; you still need to get back to the whole row, and joining on the date alone can duplicate rows if dates tie.\n\n" +
            "**Key Idea.** Keep an order only if its `OrderDate` equals the correlated maximum date for its own customer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Orders o`.\n" +
            "2. Compare `o.OrderDate =` a correlated `(SELECT MAX(OrderDate) FROM Orders o2 WHERE o2.CustomerId = o.CustomerId)`.\n" +
            "3. Keep the matching rows; order by customer.\n\n" +
            "**Why it works.** The correlated MAX is the customer's latest date, so equality selects exactly that customer's most recent order, carrying all its columns.\n\n" +
            "**Common Gotchas.** With two orders on the same max date this returns both — the problem assumes uniqueness. When ties are possible, use ROW_NUMBER with a deterministic tie-break instead.\n\n" +
            "**Performance.** Each row triggers a MAX lookup; an index on `(CustomerId, OrderDate)` turns it into a fast seek.\n\n" +
            "**Interview mindset.** 'Latest record per group, keep the whole row' → correlated MAX on the group key, or ROW_NUMBER = 1 partitioned.",
          tsql:
            "SELECT o.CustomerId, o.OrderId, o.OrderDate, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.OrderDate = (\n" +
            "    SELECT MAX(o2.OrderDate)          -- this customer's latest date\n" +
            "    FROM dbo.Orders o2\n" +
            "    WHERE o2.CustomerId = o.CustomerId\n" +
            ")\n" +
            "ORDER BY o.CustomerId;",
          clean:
            "SELECT o.CustomerId, o.OrderId, o.OrderDate, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.OrderDate = (SELECT MAX(o2.OrderDate) FROM dbo.Orders o2 WHERE o2.CustomerId = o.CustomerId)\n" +
            "ORDER BY o.CustomerId;"
        },
        {
          name: "ROW_NUMBER partitioned",
          perfNote: "One partitioned sort numbers each customer's orders newest-first; keep rn = 1. Deterministic with a tie-break and caps ties at one row.",
          dialectNote: "",
          logic:
            "**Key Idea.** Number each customer's orders by date descending and keep the first per customer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC, OrderId DESC) AS rn`.\n" +
            "2. Filter `rn = 1`.\n" +
            "3. Order by customer.\n\n" +
            "**Why it works.** rn = 1 within each partition is the newest order; the OrderId tie-break makes the pick deterministic even if two dates matched.\n\n" +
            "**Common Gotchas.** You cannot filter `rn = 1` in the same query's WHERE — wrap in a CTE. Add a tie-break or 'latest' is ambiguous on tied dates.\n\n" +
            "**Performance.** One partitioned sort, O(n log n); the `(CustomerId, OrderDate DESC)` index supplies the order.\n\n" +
            "**Interview mindset.** ROW_NUMBER = 1 is the tie-safe, one-row-per-group form of 'latest record'.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT CustomerId, OrderId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId\n" +
            "                              ORDER BY OrderDate DESC, OrderId DESC) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Amount\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT CustomerId, OrderId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC, OrderId DESC) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Amount\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Max order date per customer", note: "Cust 1 → 2024-03-01, cust 2 → 2024-02-15, cust 3 → 2024-01-10.",
          table: { columns: ["CustomerId","MaxOrderDate"], rows: [[1,"2024-03-01"],[2,"2024-02-15"],[3,"2024-01-10"]] } },
        { step: "Keep rows matching the max date", note: "Order 2, order 4, and order 5 survive.",
          table: { columns: ["CustomerId","OrderId","OrderDate","Amount"],
            rows: [[1,2,"2024-03-01",150],[2,4,"2024-02-15",80],[3,5,"2024-01-10",300]] } }
      ],
      patternRecognition: [
        "'Latest / earliest record per group, whole row' → correlated MAX/MIN or `ROW_NUMBER = 1` partitioned.",
        "Ties on the extreme value → ROW_NUMBER with a deterministic tie-break."
      ],
      interviewRecall: [
        "A correlated MAX returns all rows tied at the max; ROW_NUMBER caps at one.",
        "GROUP BY MAX(date) loses the other columns of that row — you must get back to the full row."
      ],
      commonMistakes: [
        "Joining on the max date alone and duplicating rows when dates tie.",
        "Filtering `rn = 1` in the same SELECT's WHERE without a CTE."
      ]
    }

  ]);
})();
