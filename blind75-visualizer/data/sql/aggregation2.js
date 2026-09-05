/*
 * data/aggregation2.js — Aggregation & Grouping (extension set 2).
 * Fourteen additional interview problems that follow the same per-problem
 * schema as ranking.js: schema / sampleData / expectedOutput / setupSql /
 * multiple T-SQL approaches / walkthrough tables. All T-SQL targets SQL
 * Server 2019/2022 and runs as-is in SSMS 19/21. Every id is prefixed
 * "agg2-" to avoid collisions with the seed aggregation set.
 */
(function () {
  window.SQLLAB.register("Aggregation & Grouping", [

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-percent-of-total-revenue",
      number: "SS 10301",
      platform: "StrataScratch",
      title: "Each Category's Percent of Total Revenue",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Percent of grand total", sqlConcept: "SUM / scalar subquery", technique: "Group total over overall total" },
      descriptionBrief:
        "Given an **Orders** table (`Category`, `Amount`), return per category its **total revenue** and " +
        "its **share of the grand total** as a percentage rounded to two decimals, highest revenue first.",
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
        "  (1,'Books',60.00),(2,'Electronics',300.00),\n" +
        "  (3,'Electronics',100.00),(4,'Clothing',40.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","Category","Amount"],
          rows: [[1,"Books","60.00"],[2,"Electronics","300.00"],[3,"Electronics","100.00"],[4,"Clothing","40.00"]] }
      ],
      expectedOutput: { columns: ["Category","Revenue","PctOfTotal"],
        rows: [["Electronics","400.00","80.00"],["Books","60.00","12.00"],["Clothing","40.00","8.00"]] },
      approaches: [
        {
          name: "SUM with a scalar subquery denominator (recommended)",
          perfNote: "One grouped pass for the per-category totals; the grand total is a single scalar subquery evaluated once, not per row.",
          dialectNote: "",
          logic:
            "**What it asks.** Each category's revenue and what fraction of all revenue it represents.\n\n" +
            "**Why the naive idea fails.** A plain `GROUP BY` gives the per-category totals but has no access to the overall total in the same aggregate — you need a second, ungrouped total to divide by, and integer arithmetic would truncate the percentage to 0.\n\n" +
            "**Key Idea.** Compute `SUM(Amount)` per category, then divide by `(SELECT SUM(Amount) FROM Orders)` — the grand total — multiplying by 100.0 so the division is done in decimal.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `SUM(Amount)` as the category revenue.\n" +
            "2. Divide that by a scalar subquery that sums `Amount` over the whole table.\n" +
            "3. Multiply by `100.0` (a decimal literal) and `ROUND(...,2)`.\n" +
            "4. Order by revenue descending.\n\n" +
            "**Why it works.** The scalar subquery returns one constant — the grand total — so every group divides by the same denominator, yielding each group's share.\n\n" +
            "**Common Gotchas.** Multiply by `100.0`, not `100`, or integer division floors small shares to 0. The shares sum to 100 only because the denominator covers every row.\n\n" +
            "**Performance.** Two aggregates over the table (one grouped, one scalar); the scalar subquery is evaluated a single time.\n\n" +
            "**Interview mindset.** 'percent of total' → group SUM over a whole-table SUM; force decimal math with a `.0` literal.",
          tsql:
            "SELECT Category,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Amount)\n" +
            "                  / (SELECT SUM(Amount) FROM dbo.Orders), 2) AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT Category,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Amount)\n" +
            "                  / (SELECT SUM(Amount) FROM dbo.Orders), 2) AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;"
        },
        {
          name: "Window SUM() OVER () denominator",
          perfNote: "A single scan: the per-category grouped SUM and the grand total (via a windowed sum of the group sums) come from one query without a correlated subquery.",
          dialectNote: "`SUM(SUM(x)) OVER ()` nests an aggregate inside a window — legal because the window runs after grouping.",
          logic:
            "**Key Idea.** Group by category, then take `SUM(SUM(Amount)) OVER ()` — the window sum of the group totals is the grand total, available on every group row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `SUM(Amount)` as the group revenue.\n" +
            "2. Add `SUM(SUM(Amount)) OVER ()` as the grand total.\n" +
            "3. Divide, times `100.0`, round to two decimals.\n\n" +
            "**Why it works.** Window functions run after `GROUP BY`, so `SUM(...) OVER ()` sums across the already-aggregated group rows, giving the overall total.\n\n" +
            "**Common Gotchas.** The empty `OVER ()` frame spans all groups; adding a `PARTITION BY` would change the denominator.\n\n" +
            "**Performance.** One pass, no separate scalar scan of the base table.\n\n" +
            "**Interview mindset.** Show `SUM(SUM(x)) OVER ()` as the slick single-scan way to get a group's share of the whole.",
          tsql:
            "SELECT Category,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Amount)\n" +
            "                  / SUM(SUM(Amount)) OVER (), 2) AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT Category,\n" +
            "       SUM(Amount) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Amount)\n" +
            "                  / SUM(SUM(Amount)) OVER (), 2) AS DECIMAL(5,2)) AS PctOfTotal\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;"
        }
      ],
      walkthrough: [
        { step: "Total per category", note: "Electronics 400, Books 60, Clothing 40; grand total 500.",
          table: { columns: ["Category","Revenue"], rows: [["Electronics","400.00"],["Books","60.00"],["Clothing","40.00"]] } },
        { step: "Divide by grand total 500", note: "400/500=80%, 60/500=12%, 40/500=8%.",
          table: { columns: ["Category","Revenue","PctOfTotal"],
            rows: [["Electronics","400.00","80.00"],["Books","60.00","12.00"],["Clothing","40.00","8.00"]] } }
      ],
      patternRecognition: [
        "'percent / share of total per X' → group SUM divided by a whole-table SUM (scalar subquery or `SUM() OVER ()`).",
        "Force decimal math with a `100.0` literal so small shares are not truncated to 0."
      ],
      interviewRecall: [
        "A scalar subquery returns one constant usable as a denominator for every group.",
        "`SUM(SUM(x)) OVER ()` gives the grand total in the same pass as the grouped sums."
      ],
      commonMistakes: [
        "Multiplying by integer `100`, causing integer division to floor the percentage.",
        "Dividing by a filtered subquery that omits some rows, so the shares do not sum to 100."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-having-avg-order-value",
      number: "DL 2301",
      platform: "DataLemur",
      title: "Customers With High Average Order Value",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["E-commerce Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Group then filter by AVG", sqlConcept: "GROUP BY + HAVING AVG", technique: "Threshold on an average" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `Amount`), return each customer whose **average order value " +
        "is at least 100**, with that average, highest average first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,50.00),(2,1,150.00),(3,2,80.00),\n" +
        "  (4,2,90.00),(5,3,200.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","Amount"],
          rows: [[1,1,"50.00"],[2,1,"150.00"],[3,2,"80.00"],[4,2,"90.00"],[5,3,"200.00"]] }
      ],
      expectedOutput: { columns: ["CustomerId","AvgOrder"], rows: [[3,"200.00"],[1,"100.00"]] },
      approaches: [
        {
          name: "GROUP BY … HAVING AVG (recommended)",
          perfNote: "Average per customer in one grouped pass; HAVING drops the low-average customers before returning results.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers whose typical order (their mean amount) is 100 or more.\n\n" +
            "**Why the naive idea fails.** `WHERE Amount >= 100` filters individual orders, not the *average*; a customer with a 50 and a 150 averages 100 but has one order below the line, so a per-row filter answers a different question.\n\n" +
            "**Key Idea.** Aggregate `AVG(Amount)` per customer, then apply the threshold with `HAVING`, which filters *groups* after the average exists.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId` with `AVG(Amount)` as the average order value.\n" +
            "2. `HAVING AVG(Amount) >= 100` to keep high-AOV customers.\n" +
            "3. Order by the average descending.\n\n" +
            "**Why it works.** HAVING is evaluated after grouping, so it can compare against an aggregate that WHERE cannot see.\n\n" +
            "**Common Gotchas.** The threshold belongs in HAVING, not WHERE. `>=` includes an exact 100; `>` would drop customer 1.\n\n" +
            "**Performance.** One group aggregate plus a small sort on the averages.\n\n" +
            "**Interview mindset.** 'average per X above a threshold' → GROUP BY X HAVING AVG(...) comparison.",
          tsql:
            "SELECT CustomerId,\n" +
            "       CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgOrder\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING AVG(Amount) >= 100      -- filter on the per-customer average\n" +
            "ORDER BY AvgOrder DESC;",
          clean:
            "SELECT CustomerId, CAST(AVG(Amount) AS DECIMAL(10,2)) AS AvgOrder\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING AVG(Amount) >= 100\n" +
            "ORDER BY AvgOrder DESC;"
        }
      ],
      walkthrough: [
        { step: "Average per customer", note: "Cust 1 = (50+150)/2 = 100, cust 2 = (80+90)/2 = 85, cust 3 = 200.",
          table: { columns: ["CustomerId","AvgOrder"], rows: [[1,"100.00"],[2,"85.00"],[3,"200.00"]] } },
        { step: "Keep AVG >= 100, order DESC", note: "Customer 2 drops; 3 leads, then 1.",
          table: { columns: ["CustomerId","AvgOrder"], rows: [[3,"200.00"],[1,"100.00"]] } }
      ],
      patternRecognition: [
        "'average per X meeting a threshold' → GROUP BY X HAVING AVG(...) comparison."
      ],
      interviewRecall: [
        "HAVING filters aggregated groups; a threshold on AVG/SUM/COUNT must live there, not in WHERE.",
        "`>=` versus `>` decides whether a group exactly at the boundary survives."
      ],
      commonMistakes: [
        "Filtering `Amount >= 100` per order instead of on the customer average.",
        "Using `>` and accidentally excluding a customer whose average is exactly the threshold."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-sales-rollup-subtotals",
      number: "SS 10305",
      platform: "StrataScratch",
      title: "Regional Revenue With Grand Total",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Retail Analytics"],
      link: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql",
      meta: { pattern: "Subtotals + grand total", sqlConcept: "GROUP BY ROLLUP", technique: "Hierarchical super-aggregate" },
      descriptionBrief:
        "Given a **Sales** table (`Region`, `Amount`), return the **revenue per region** and, in the same " +
        "result, a **grand-total** row that sums every region. Label the total row 'All Regions'.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(20)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Region VARCHAR(20), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'East',100.00),(2,'East',200.00),(3,'West',300.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","Region","Amount"],
          rows: [[1,"East","100.00"],[2,"East","200.00"],[3,"West","300.00"]] }
      ],
      expectedOutput: { columns: ["Region","Revenue"],
        rows: [["East","300.00"],["West","300.00"],["All Regions","600.00"]] },
      approaches: [
        {
          name: "GROUP BY ROLLUP (recommended)",
          perfNote: "One grouped pass emits both the per-region rows and the extra super-aggregate (grand-total) row; no UNION with a second query.",
          dialectNote: "`GROUP BY ROLLUP(col)` is SQL Server syntax; the total row carries NULL in the rolled-up column, detectable with `GROUPING()`.",
          logic:
            "**What it asks.** Region subtotals plus one grand-total row combined in a single result set.\n\n" +
            "**Why the naive idea fails.** A plain `GROUP BY Region` gives only the region rows; adding the total usually means a second query `UNION`-ed in, which re-scans the table and is easy to get inconsistent.\n\n" +
            "**Key Idea.** `GROUP BY ROLLUP(Region)` produces the normal per-region groups *and* an extra super-aggregate row where Region is NULL — the total across all regions.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY ROLLUP(Region)` with `SUM(Amount)`.\n" +
            "2. Use `GROUPING(Region)` to detect the total row and label it 'All Regions' via `CASE`.\n" +
            "3. Order region rows first (by `GROUPING(Region)`), then the total.\n\n" +
            "**Why it works.** ROLLUP adds higher-level subtotals by treating the grouping column as absent for the extra row; that NULL marks the grand total.\n\n" +
            "**Common Gotchas.** Distinguish a real NULL region from the ROLLUP total with `GROUPING()`, not `IS NULL`, when NULLs can occur in the data.\n\n" +
            "**Performance.** A single aggregate that also emits the subtotal; cheaper than a UNION of two scans.\n\n" +
            "**Interview mindset.** 'subtotals and a grand total together' → ROLLUP; label the super-aggregate rows with GROUPING().",
          tsql:
            "SELECT CASE WHEN GROUPING(Region) = 1 THEN 'All Regions'\n" +
            "            ELSE Region END AS Region,\n" +
            "       SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY ROLLUP(Region)\n" +
            "ORDER BY GROUPING(Region), Region;   -- region rows first, total last\n",
          clean:
            "SELECT CASE WHEN GROUPING(Region) = 1 THEN 'All Regions' ELSE Region END AS Region,\n" +
            "       SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY ROLLUP(Region)\n" +
            "ORDER BY GROUPING(Region), Region;"
        }
      ],
      walkthrough: [
        { step: "ROLLUP(Region) sums", note: "East 300, West 300, plus a NULL-region super-aggregate 600.",
          table: { columns: ["Region","Revenue"], rows: [["East","300.00"],["West","300.00"],[null,"600.00"]] } },
        { step: "Label the total row and order", note: "GROUPING(Region)=1 becomes 'All Regions', sorted last.",
          table: { columns: ["Region","Revenue"], rows: [["East","300.00"],["West","300.00"],["All Regions","600.00"]] } }
      ],
      patternRecognition: [
        "'per group AND a grand total in one result' → `GROUP BY ROLLUP(col)`.",
        "Detect super-aggregate rows with `GROUPING(col) = 1`, not `col IS NULL`."
      ],
      interviewRecall: [
        "ROLLUP adds subtotal / grand-total rows with NULL in the rolled-up column.",
        "GROUPING() returns 1 on a super-aggregate row, distinguishing it from a data NULL."
      ],
      commonMistakes: [
        "UNION-ing a separate total query instead of using ROLLUP.",
        "Using `Region IS NULL` to find the total row when the data itself may contain NULL regions."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-grouping-sets-multi",
      number: "SS 10308",
      platform: "StrataScratch",
      title: "Revenue by Region and by Product in One Query",
      difficulty: "Hard",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Marketing Analytics"],
      link: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-group-by-transact-sql",
      meta: { pattern: "Multiple grouping levels", sqlConcept: "GROUP BY GROUPING SETS", technique: "Several aggregations in one pass" },
      descriptionBrief:
        "Given a **Sales** table (`Region`, `Product`, `Amount`), return **totals by region** and, separately, " +
        "**totals by product**, in a single result. Show 'ALL' in whichever dimension is not being grouped.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(20)" },
          { name: "Product", type: "VARCHAR(20)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Region VARCHAR(20), Product VARCHAR(20), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'East','A',100.00),(2,'East','B',50.00),(3,'West','A',70.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","Region","Product","Amount"],
          rows: [[1,"East","A","100.00"],[2,"East","B","50.00"],[3,"West","A","70.00"]] }
      ],
      expectedOutput: { columns: ["Region","Product","Revenue"],
        rows: [["East","ALL","150.00"],["West","ALL","70.00"],["ALL","A","170.00"],["ALL","B","50.00"]] },
      approaches: [
        {
          name: "GROUP BY GROUPING SETS (recommended)",
          perfNote: "One scan computes both breakdowns; GROUPING SETS lists the exact aggregation levels wanted, avoiding a UNION ALL of two grouped queries.",
          dialectNote: "`GROUPING SETS ((a),(b))` is SQL Server syntax equivalent to a UNION ALL of `GROUP BY a` and `GROUP BY b`.",
          logic:
            "**What it asks.** Two independent rollups — one by region, one by product — merged into a single result.\n\n" +
            "**Why the naive idea fails.** Running `GROUP BY Region` and `GROUP BY Product` as two queries and `UNION ALL`-ing them scans the table twice and duplicates logic; a single `GROUP BY Region, Product` gives the wrong thing (per-pair totals, not per-dimension totals).\n\n" +
            "**Key Idea.** `GROUP BY GROUPING SETS ((Region), (Product))` asks for exactly those two grouping levels in one statement; the dimension not in a given set comes back NULL.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY GROUPING SETS ((Region), (Product))` with `SUM(Amount)`.\n" +
            "2. Label the NULL dimension 'ALL' using `GROUPING()` in a `CASE`.\n" +
            "3. Order so the region-level rows come before the product-level rows.\n\n" +
            "**Why it works.** Each grouping set is aggregated independently and the results are stacked; NULL in a column marks the dimension collapsed for that row.\n\n" +
            "**Common Gotchas.** `GROUP BY Region, Product` is NOT the same — it groups by the pair. Use `GROUPING()` to label collapsed columns, since data NULLs and set NULLs look alike.\n\n" +
            "**Performance.** One pass for all listed sets; cheaper than manual UNION ALLs.\n\n" +
            "**Interview mindset.** 'totals by A and, separately, by B in one query' → GROUPING SETS ((A),(B)).",
          tsql:
            "SELECT CASE WHEN GROUPING(Region)  = 1 THEN 'ALL' ELSE Region  END AS Region,\n" +
            "       CASE WHEN GROUPING(Product) = 1 THEN 'ALL' ELSE Product END AS Product,\n" +
            "       SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY GROUPING SETS ((Region), (Product))\n" +
            "ORDER BY GROUPING(Region), Region, Product;\n",
          clean:
            "SELECT CASE WHEN GROUPING(Region)  = 1 THEN 'ALL' ELSE Region  END AS Region,\n" +
            "       CASE WHEN GROUPING(Product) = 1 THEN 'ALL' ELSE Product END AS Product,\n" +
            "       SUM(Amount) AS Revenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY GROUPING SETS ((Region), (Product))\n" +
            "ORDER BY GROUPING(Region), Region, Product;"
        }
      ],
      walkthrough: [
        { step: "Aggregate the region set", note: "By region: East 100+50=150, West 70; Product collapses to ALL.",
          table: { columns: ["Region","Product","Revenue"], rows: [["East","ALL","150.00"],["West","ALL","70.00"]] } },
        { step: "Aggregate the product set", note: "By product: A 100+70=170, B 50; Region collapses to ALL.",
          table: { columns: ["Region","Product","Revenue"], rows: [["ALL","A","170.00"],["ALL","B","50.00"]] } }
      ],
      patternRecognition: [
        "'totals by A and, separately, by B, in one result' → `GROUP BY GROUPING SETS ((A),(B))`.",
        "`GROUP BY A, B` groups by the *pair* — a different question."
      ],
      interviewRecall: [
        "GROUPING SETS = a UNION ALL of the listed grouping levels in one scan.",
        "A collapsed dimension appears as NULL; label it with GROUPING()."
      ],
      commonMistakes: [
        "Confusing `GROUP BY A, B` (per-pair) with `GROUPING SETS ((A),(B))` (per-dimension).",
        "Labelling collapsed columns with `IS NULL` instead of `GROUPING()`."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-refund-ratio-per-store",
      number: "DL 2312",
      platform: "DataLemur",
      title: "Refund-to-Sales Ratio per Store",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Ratio of two conditional sums", sqlConcept: "SUM(CASE) / SUM(CASE)", technique: "Conditional-aggregate ratio" },
      descriptionBrief:
        "Given a **Transactions** table where each row is a `Sale` or a `Refund` with an `Amount`, return per " +
        "store the **total sales**, **total refunds**, and the **refund rate** (refunds ÷ sales) rounded to two decimals.",
      schema: [
        { name: "Transactions", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Store", type: "VARCHAR(10)" },
          { name: "Type", type: "VARCHAR(10)", note: "'Sale' or 'Refund'" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Transactions','U') IS NOT NULL DROP TABLE dbo.Transactions;\n" +
        "CREATE TABLE dbo.Transactions (Id INT PRIMARY KEY, Store VARCHAR(10), Type VARCHAR(10), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Transactions VALUES\n" +
        "  (1,'S1','Sale',100.00),(2,'S1','Sale',100.00),(3,'S1','Refund',20.00),\n" +
        "  (4,'S2','Sale',50.00),(5,'S2','Refund',25.00);",
      sampleData: [
        { table: "Transactions", columns: ["Id","Store","Type","Amount"],
          rows: [[1,"S1","Sale","100.00"],[2,"S1","Sale","100.00"],[3,"S1","Refund","20.00"],[4,"S2","Sale","50.00"],[5,"S2","Refund","25.00"]] }
      ],
      expectedOutput: { columns: ["Store","SalesTotal","RefundTotal","RefundRate"],
        rows: [["S1","200.00","20.00","0.10"],["S2","50.00","25.00","0.50"]] },
      approaches: [
        {
          name: "Two conditional sums divided (recommended)",
          perfNote: "Both totals and the ratio come from one grouped scan; a CASE splits each row into the sales or refund bucket without a self-join.",
          dialectNote: "",
          logic:
            "**What it asks.** Sales, refunds, and their ratio per store — all derived from the same rows, split by `Type`.\n\n" +
            "**Why the naive idea fails.** Filtering the table twice (once WHERE Type='Sale', once WHERE Type='Refund') and joining is clumsy; and dividing two integer sums, or dividing by a store with zero sales, blows up.\n\n" +
            "**Key Idea.** Use conditional aggregation: `SUM(CASE WHEN Type='Sale' THEN Amount ELSE 0 END)` and the refund equivalent, then divide refunds by sales, guarding the denominator with `NULLIF`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Store`.\n" +
            "2. Sum a CASE that keeps only sale amounts; sum another that keeps only refunds.\n" +
            "3. Divide the refund sum by the sale sum, wrapping the denominator in `NULLIF(...,0)` and multiplying by `1.0` for decimal math.\n" +
            "4. Round to two decimals and order by store.\n\n" +
            "**Why it works.** Each transaction contributes to exactly one bucket via its CASE, so the two sums are the true per-store sale and refund totals; their quotient is the refund rate.\n\n" +
            "**Common Gotchas.** `NULLIF(sales,0)` avoids divide-by-zero (yielding NULL instead). Multiply by `1.0` (or CAST) so the division is decimal, not integer.\n\n" +
            "**Performance.** One grouped aggregate for all three measures, O(n).\n\n" +
            "**Interview mindset.** 'ratio of A to B within a group' → SUM(CASE for A) / NULLIF(SUM(CASE for B),0).",
          tsql:
            "SELECT Store,\n" +
            "       SUM(CASE WHEN Type = 'Sale'   THEN Amount ELSE 0 END) AS SalesTotal,\n" +
            "       SUM(CASE WHEN Type = 'Refund' THEN Amount ELSE 0 END) AS RefundTotal,\n" +
            "       CAST(ROUND(\n" +
            "           1.0 * SUM(CASE WHEN Type = 'Refund' THEN Amount ELSE 0 END)\n" +
            "               / NULLIF(SUM(CASE WHEN Type = 'Sale' THEN Amount ELSE 0 END), 0),\n" +
            "           2) AS DECIMAL(5,2)) AS RefundRate\n" +
            "FROM dbo.Transactions\n" +
            "GROUP BY Store\n" +
            "ORDER BY Store;",
          clean:
            "SELECT Store,\n" +
            "       SUM(CASE WHEN Type = 'Sale'   THEN Amount ELSE 0 END) AS SalesTotal,\n" +
            "       SUM(CASE WHEN Type = 'Refund' THEN Amount ELSE 0 END) AS RefundTotal,\n" +
            "       CAST(ROUND(\n" +
            "           1.0 * SUM(CASE WHEN Type = 'Refund' THEN Amount ELSE 0 END)\n" +
            "               / NULLIF(SUM(CASE WHEN Type = 'Sale' THEN Amount ELSE 0 END), 0),\n" +
            "           2) AS DECIMAL(5,2)) AS RefundRate\n" +
            "FROM dbo.Transactions\n" +
            "GROUP BY Store\n" +
            "ORDER BY Store;"
        }
      ],
      walkthrough: [
        { step: "Conditional sums per store", note: "S1: sales 200, refunds 20. S2: sales 50, refunds 25.",
          table: { columns: ["Store","SalesTotal","RefundTotal"], rows: [["S1","200.00","20.00"],["S2","50.00","25.00"]] } },
        { step: "Refund ÷ sales", note: "S1 = 20/200 = 0.10; S2 = 25/50 = 0.50.",
          table: { columns: ["Store","SalesTotal","RefundTotal","RefundRate"],
            rows: [["S1","200.00","20.00","0.10"],["S2","50.00","25.00","0.50"]] } }
      ],
      patternRecognition: [
        "'ratio of A to B within each group' → `SUM(CASE A)/NULLIF(SUM(CASE B),0)`.",
        "Guard every aggregate division with `NULLIF(denominator,0)`."
      ],
      interviewRecall: [
        "Conditional aggregation splits one scan into multiple buckets via CASE.",
        "Multiply by `1.0` (or CAST) to force decimal division; NULLIF prevents divide-by-zero."
      ],
      commonMistakes: [
        "Dividing integer sums and getting 0, or crashing when a store has no sales.",
        "Filtering the table twice and joining instead of one conditional-aggregate pass."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-daily-active-users",
      number: "DL 2318",
      platform: "DataLemur",
      title: "Daily Active Users",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["Product Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Distinct count per group", sqlConcept: "COUNT(DISTINCT ...) + GROUP BY", technique: "Unique entities per bucket" },
      descriptionBrief:
        "Given an **Events** log (`EventDate`, `UserId`) where a user can fire many events a day, return the number " +
        "of **distinct active users per day**, ordered by date.",
      schema: [
        { name: "Events", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "EventDate", type: "DATE" },
          { name: "UserId", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Events','U') IS NOT NULL DROP TABLE dbo.Events;\n" +
        "CREATE TABLE dbo.Events (Id INT PRIMARY KEY, EventDate DATE, UserId INT);\n" +
        "INSERT INTO dbo.Events VALUES\n" +
        "  (1,'2024-01-01',1),(2,'2024-01-01',1),(3,'2024-01-01',2),\n" +
        "  (4,'2024-01-02',3);",
      sampleData: [
        { table: "Events", columns: ["Id","EventDate","UserId"],
          rows: [[1,"2024-01-01",1],[2,"2024-01-01",1],[3,"2024-01-01",2],[4,"2024-01-02",3]] }
      ],
      expectedOutput: { columns: ["EventDate","ActiveUsers"],
        rows: [["2024-01-01",2],["2024-01-02",1]] },
      approaches: [
        {
          name: "COUNT(DISTINCT UserId) per day (recommended)",
          perfNote: "One grouped pass; COUNT(DISTINCT) deduplicates users inside each day without a subquery.",
          dialectNote: "",
          logic:
            "**What it asks.** How many *different* users were active each day, not how many events occurred.\n\n" +
            "**Why the naive idea fails.** `COUNT(*)` counts event rows, so a user who fires ten events counts ten times, overstating the active-user tally.\n\n" +
            "**Key Idea.** `COUNT(DISTINCT UserId)` collapses repeated user ids within each day before counting.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY EventDate`.\n" +
            "2. Project `COUNT(DISTINCT UserId)` as the active-user count.\n" +
            "3. Order by date.\n\n" +
            "**Why it works.** DISTINCT inside COUNT removes duplicate user ids per group, so each user contributes exactly one to the day's count.\n\n" +
            "**Common Gotchas.** `COUNT(DISTINCT UserId)` ignores NULL user ids. `COUNT(*)` counts events, not users — a common mix-up.\n\n" +
            "**Performance.** A hash/sort distinct per group then a count, O(n).\n\n" +
            "**Interview mindset.** 'active / unique users per day' → `COUNT(DISTINCT UserId)` GROUP BY day.",
          tsql:
            "SELECT EventDate,\n" +
            "       COUNT(DISTINCT UserId) AS ActiveUsers  -- unique users, not events\n" +
            "FROM dbo.Events\n" +
            "GROUP BY EventDate\n" +
            "ORDER BY EventDate;",
          clean:
            "SELECT EventDate, COUNT(DISTINCT UserId) AS ActiveUsers\n" +
            "FROM dbo.Events\n" +
            "GROUP BY EventDate\n" +
            "ORDER BY EventDate;"
        }
      ],
      walkthrough: [
        { step: "COUNT(DISTINCT UserId) per day", note: "Jan 1 has users 1 (twice) and 2 → 2 distinct; Jan 2 has only user 3 → 1.",
          table: { columns: ["EventDate","ActiveUsers"], rows: [["2024-01-01",2],["2024-01-02",1]] } }
      ],
      patternRecognition: [
        "'active / unique users per period' → `COUNT(DISTINCT UserId)` with `GROUP BY period`."
      ],
      interviewRecall: [
        "`COUNT(*)` counts rows/events; `COUNT(DISTINCT UserId)` counts unique users.",
        "COUNT(DISTINCT) ignores NULLs and deduplicates within each group."
      ],
      commonMistakes: [
        "Using `COUNT(*)` and reporting event volume as active users.",
        "Forgetting DISTINCT, so heavy users are counted many times."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-revenue-by-segment-columns",
      number: "SS 10314",
      platform: "StrataScratch",
      title: "Retail vs Wholesale Revenue per Region",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Pivot with conditional sums", sqlConcept: "SUM(CASE) as columns", technique: "Row-to-column pivot" },
      descriptionBrief:
        "Given a **Sales** table (`Region`, `Segment`, `Amount`) where `Segment` is 'Retail' or 'Wholesale', return " +
        "per region the **retail revenue** and **wholesale revenue** as two columns, ordered by region.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(20)" },
          { name: "Segment", type: "VARCHAR(20)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, Region VARCHAR(20), Segment VARCHAR(20), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'East','Retail',100.00),(2,'East','Wholesale',200.00),(3,'West','Retail',50.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","Region","Segment","Amount"],
          rows: [[1,"East","Retail","100.00"],[2,"East","Wholesale","200.00"],[3,"West","Retail","50.00"]] }
      ],
      expectedOutput: { columns: ["Region","RetailRevenue","WholesaleRevenue"],
        rows: [["East","100.00","200.00"],["West","50.00","0.00"]] },
      approaches: [
        {
          name: "Conditional sums as columns (recommended)",
          perfNote: "Both segment totals fall out of one grouped scan; each CASE routes a row's amount into the right column, with 0 filling absent combinations.",
          dialectNote: "",
          logic:
            "**What it asks.** A pivoted layout: one row per region with separate retail and wholesale columns.\n\n" +
            "**Why the naive idea fails.** `GROUP BY Region, Segment` gives one row *per segment* (a long shape), not the wide two-column layout; stitching two filtered queries together is more work than a single pass.\n\n" +
            "**Key Idea.** Conditional aggregation: `SUM(CASE WHEN Segment='Retail' THEN Amount ELSE 0 END)` and the wholesale equivalent become the two columns under one `GROUP BY Region`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Region`.\n" +
            "2. Sum a CASE keeping only retail amounts as `RetailRevenue`.\n" +
            "3. Sum a CASE keeping only wholesale amounts as `WholesaleRevenue`.\n" +
            "4. Order by region.\n\n" +
            "**Why it works.** Each row's amount is added into exactly one column's CASE and 0 into the other; summing per region produces the pivoted totals, with 0 where a segment is absent (West has no wholesale).\n\n" +
            "**Common Gotchas.** Use `ELSE 0` (not omitting it) so a region missing a segment shows 0, not NULL. This is the portable equivalent of the `PIVOT` operator.\n\n" +
            "**Performance.** One grouped aggregate for both columns, O(n).\n\n" +
            "**Interview mindset.** 'segment values as columns' → SUM(CASE) per segment; the manual, portable PIVOT.",
          tsql:
            "SELECT Region,\n" +
            "       SUM(CASE WHEN Segment = 'Retail'    THEN Amount ELSE 0 END) AS RetailRevenue,\n" +
            "       SUM(CASE WHEN Segment = 'Wholesale' THEN Amount ELSE 0 END) AS WholesaleRevenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region\n" +
            "ORDER BY Region;",
          clean:
            "SELECT Region,\n" +
            "       SUM(CASE WHEN Segment = 'Retail'    THEN Amount ELSE 0 END) AS RetailRevenue,\n" +
            "       SUM(CASE WHEN Segment = 'Wholesale' THEN Amount ELSE 0 END) AS WholesaleRevenue\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Region\n" +
            "ORDER BY Region;"
        }
      ],
      walkthrough: [
        { step: "Route amounts by segment per region", note: "East: retail 100, wholesale 200. West: retail 50, wholesale absent → 0.",
          table: { columns: ["Region","RetailRevenue","WholesaleRevenue"],
            rows: [["East","100.00","200.00"],["West","50.00","0.00"]] } }
      ],
      patternRecognition: [
        "'category values as columns' (pivot) → `SUM(CASE WHEN cat=... THEN val ELSE 0 END)` per category."
      ],
      interviewRecall: [
        "Conditional SUM(CASE) is the portable manual equivalent of the PIVOT operator.",
        "`ELSE 0` makes missing combinations show 0 rather than NULL."
      ],
      commonMistakes: [
        "Leaving the result in long form (`GROUP BY Region, Segment`) when a wide pivot was requested.",
        "Omitting `ELSE 0` so absent segments return NULL instead of 0."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-repeat-customers",
      number: "LC 1050",
      platform: "LeetCode",
      title: "Customers With More Than One Order",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["E-commerce Analytics"],
      link: "https://leetcode.com/problems/",
      meta: { pattern: "Group then filter by COUNT", sqlConcept: "GROUP BY + HAVING COUNT", technique: "Repeat-entity detection" },
      descriptionBrief:
        "Given an **Orders** table, return every customer who has placed **more than one order**, with their order " +
        "count, most orders first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1),(2,1),(3,2),(4,3),(5,3),(6,3);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId"],
          rows: [[1,1],[2,1],[3,2],[4,3],[5,3],[6,3]] }
      ],
      expectedOutput: { columns: ["CustomerId","OrderCount"], rows: [[3,3],[1,2]] },
      approaches: [
        {
          name: "GROUP BY … HAVING COUNT(*) > 1 (recommended)",
          perfNote: "One grouped pass counts orders per customer; HAVING keeps only the repeat buyers before returning.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers who ordered more than once — repeat buyers — and how many times.\n\n" +
            "**Why the naive idea fails.** WHERE cannot test a per-customer count; the count only exists after grouping, so the '> 1' filter must be HAVING. A `DISTINCT` alone would not tell you the multiplicity.\n\n" +
            "**Key Idea.** Count orders per `CustomerId`, then keep customers whose count exceeds one with `HAVING COUNT(*) > 1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId` with `COUNT(*)` as the order count.\n" +
            "2. `HAVING COUNT(*) > 1` to keep repeat customers.\n" +
            "3. Order by the count descending.\n\n" +
            "**Why it works.** HAVING filters groups after aggregation, so it can compare a group's row count against the threshold.\n\n" +
            "**Common Gotchas.** The threshold is HAVING, not WHERE; `> 1` (strictly more than one) is the repeat condition — `>= 1` would keep everyone.\n\n" +
            "**Performance.** One group aggregate plus a small sort on the counts.\n\n" +
            "**Interview mindset.** 'entities appearing more than once' (repeat buyers, duplicate keys) → GROUP BY key HAVING COUNT(*) > 1.",
          tsql:
            "SELECT CustomerId,\n" +
            "       COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(*) > 1            -- repeat customers only\n" +
            "ORDER BY OrderCount DESC;",
          clean:
            "SELECT CustomerId, COUNT(*) AS OrderCount\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "HAVING COUNT(*) > 1\n" +
            "ORDER BY OrderCount DESC;"
        }
      ],
      walkthrough: [
        { step: "Count orders per customer", note: "Cust 1 = 2, cust 2 = 1, cust 3 = 3.",
          table: { columns: ["CustomerId","OrderCount"], rows: [[1,2],[2,1],[3,3]] } },
        { step: "Keep COUNT(*) > 1, order DESC", note: "Customer 2 drops; 3 leads with 3, then 1 with 2.",
          table: { columns: ["CustomerId","OrderCount"], rows: [[3,3],[1,2]] } }
      ],
      patternRecognition: [
        "'appears more than once' / 'repeat / duplicate' → GROUP BY key HAVING COUNT(*) > 1."
      ],
      interviewRecall: [
        "HAVING filters groups after aggregation; a count threshold belongs there.",
        "`COUNT(*) > 1` is the canonical duplicate / repeat-entity test."
      ],
      commonMistakes: [
        "Putting `COUNT(*) > 1` in WHERE.",
        "Using `>= 1` (keeps everyone) when the intent is strictly more than one."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-salary-spread-per-team",
      number: "SS 10320",
      platform: "StrataScratch",
      title: "Salary Spread per Team",
      difficulty: "Easy",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Range via MAX - MIN", sqlConcept: "MAX(x) - MIN(x)", technique: "Spread from two extremes" },
      descriptionBrief:
        "Given an **Employees** table (`Team`, `Salary`), return per team the **minimum salary**, **maximum salary**, " +
        "and the **spread** (max minus min), widest spread first.",
      schema: [
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Team", type: "VARCHAR(20)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, Team VARCHAR(20), Salary INT);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Alpha',100),(2,'Alpha',200),(3,'Alpha',150),\n" +
        "  (4,'Beta',300),(5,'Beta',320);",
      sampleData: [
        { table: "Employees", columns: ["Id","Team","Salary"],
          rows: [[1,"Alpha",100],[2,"Alpha",200],[3,"Alpha",150],[4,"Beta",300],[5,"Beta",320]] }
      ],
      expectedOutput: { columns: ["Team","MinSalary","MaxSalary","Spread"],
        rows: [["Alpha",100,200,100],["Beta",300,320,20]] },
      approaches: [
        {
          name: "MAX minus MIN in one GROUP BY (recommended)",
          perfNote: "Both extremes and their difference come from a single grouped scan; no self-join and no second pass.",
          dialectNote: "",
          logic:
            "**What it asks.** The pay range within each team — the gap between the highest and lowest salary.\n\n" +
            "**Why the naive idea fails.** Computing the min and the max in separate queries and subtracting across them means two aggregations and a join; both extremes already live in the same group.\n\n" +
            "**Key Idea.** `GROUP BY Team` and project `MIN(Salary)`, `MAX(Salary)`, and `MAX(Salary) - MIN(Salary)` — the spread is just the difference of the two extremes computed in the same pass.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Team`.\n" +
            "2. Project `MIN(Salary)` and `MAX(Salary)`.\n" +
            "3. Project `MAX(Salary) - MIN(Salary)` as the spread.\n" +
            "4. Order by the spread descending.\n\n" +
            "**Why it works.** MIN and MAX are order-independent aggregates over the same partition, so their difference is well defined within one grouped pass.\n\n" +
            "**Common Gotchas.** A single-member team has spread 0 (min equals max) — correct, not a bug. You can reference `MAX-MIN` directly in SELECT even though the alias `Spread` is not reusable there.\n\n" +
            "**Performance.** One hash/stream aggregate, O(n); an index on `(Team, Salary)` streams it without a sort.\n\n" +
            "**Interview mindset.** 'range / spread / gap per X' → `MAX(x) - MIN(x)` under GROUP BY X.",
          tsql:
            "SELECT Team,\n" +
            "       MIN(Salary) AS MinSalary,\n" +
            "       MAX(Salary) AS MaxSalary,\n" +
            "       MAX(Salary) - MIN(Salary) AS Spread\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY Team\n" +
            "ORDER BY Spread DESC;",
          clean:
            "SELECT Team,\n" +
            "       MIN(Salary) AS MinSalary,\n" +
            "       MAX(Salary) AS MaxSalary,\n" +
            "       MAX(Salary) - MIN(Salary) AS Spread\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY Team\n" +
            "ORDER BY Spread DESC;"
        }
      ],
      walkthrough: [
        { step: "Extremes and difference per team", note: "Alpha: min 100, max 200, spread 100. Beta: min 300, max 320, spread 20.",
          table: { columns: ["Team","MinSalary","MaxSalary","Spread"],
            rows: [["Alpha",100,200,100],["Beta",300,320,20]] } }
      ],
      patternRecognition: [
        "'range / spread / gap per X' → `MAX(x) - MIN(x)` with `GROUP BY X`."
      ],
      interviewRecall: [
        "MIN and MAX read from the same grouped pass; their difference is the spread.",
        "A one-row group yields spread 0 because MIN equals MAX."
      ],
      commonMistakes: [
        "Computing MIN and MAX in separate queries and subtracting across them.",
        "Treating a zero spread for a single-member team as an error."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-above-average-price-categories",
      number: "DL 2327",
      platform: "DataLemur",
      title: "Categories Priced Above the Overall Average",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Filtering & Subqueries"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Group avg vs global avg", sqlConcept: "HAVING AVG > scalar subquery", technique: "Compare group to overall" },
      descriptionBrief:
        "Given a **Products** table (`Category`, `Price`), return the categories whose **average price exceeds the " +
        "overall average price** across all products, with that average, highest first.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(20)" },
          { name: "Price", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Category VARCHAR(20), Price DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'A',100.00),(2,'A',200.00),(3,'B',300.00),\n" +
        "  (4,'B',500.00),(5,'C',50.00);",
      sampleData: [
        { table: "Products", columns: ["Id","Category","Price"],
          rows: [[1,"A","100.00"],[2,"A","200.00"],[3,"B","300.00"],[4,"B","500.00"],[5,"C","50.00"]] }
      ],
      expectedOutput: { columns: ["Category","AvgPrice"], rows: [["B","400.00"]] },
      approaches: [
        {
          name: "HAVING AVG > overall AVG subquery (recommended)",
          perfNote: "The per-category averages come from one grouped pass; the overall average is a single scalar subquery over the whole table.",
          dialectNote: "",
          logic:
            "**What it asks.** Categories that are, on average, more expensive than the catalogue as a whole.\n\n" +
            "**Why the naive idea fails.** The overall average is not available inside the grouped query's rows; comparing each category's average to a hard-coded number would break as data changes, and WHERE cannot see the per-category average at all.\n\n" +
            "**Key Idea.** Group by category with `AVG(Price)`, and in `HAVING` compare that group average to `(SELECT AVG(Price) FROM Products)` — the global average as a scalar subquery.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `AVG(Price)` as the category average.\n" +
            "2. `HAVING AVG(Price) > (SELECT AVG(Price) FROM Products)`.\n" +
            "3. Order by the average descending.\n\n" +
            "**Why it works.** The scalar subquery yields one constant — the overall mean — and HAVING (which runs after grouping) compares each group's average against it.\n\n" +
            "**Common Gotchas.** The subquery averages *rows*, not the category averages, so it is the true overall mean (weighted by row count), not the mean of the group means. Cast to DECIMAL for a fractional average.\n\n" +
            "**Performance.** One grouped aggregate plus a single scalar scan for the global average.\n\n" +
            "**Interview mindset.** 'groups above the overall average' → HAVING AVG(x) > (SELECT AVG(x) FROM table).",
          tsql:
            "SELECT Category,\n" +
            "       CAST(AVG(Price) AS DECIMAL(10,2)) AS AvgPrice\n" +
            "FROM dbo.Products\n" +
            "GROUP BY Category\n" +
            "HAVING AVG(Price) > (SELECT AVG(Price) FROM dbo.Products)  -- beat the overall mean\n" +
            "ORDER BY AvgPrice DESC;",
          clean:
            "SELECT Category, CAST(AVG(Price) AS DECIMAL(10,2)) AS AvgPrice\n" +
            "FROM dbo.Products\n" +
            "GROUP BY Category\n" +
            "HAVING AVG(Price) > (SELECT AVG(Price) FROM dbo.Products)\n" +
            "ORDER BY AvgPrice DESC;"
        }
      ],
      walkthrough: [
        { step: "Average per category and overall", note: "A=150, B=400, C=50; overall = (100+200+300+500+50)/5 = 230.",
          table: { columns: ["Category","AvgPrice"], rows: [["A","150.00"],["B","400.00"],["C","50.00"]] } },
        { step: "Keep AVG > 230", note: "Only B (400) beats the overall average of 230.",
          table: { columns: ["Category","AvgPrice"], rows: [["B","400.00"]] } }
      ],
      patternRecognition: [
        "'groups above/below the overall metric' → HAVING AGG(x) compared to a scalar subquery over the whole table."
      ],
      interviewRecall: [
        "A scalar subquery supplies a whole-table constant for HAVING to compare against.",
        "`AVG` over all rows is the row-weighted mean, not the average of group averages."
      ],
      commonMistakes: [
        "Hard-coding the overall average instead of computing it with a subquery.",
        "Assuming the overall AVG equals the average of the per-category averages."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-running-monthly-total",
      number: "SS 10333",
      platform: "StrataScratch",
      title: "Monthly Revenue With a Running Total",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Window Functions"],
      domains: ["Finance Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Grouped total then cumulative", sqlConcept: "GROUP BY + SUM() OVER (ORDER BY)", technique: "Running total over group sums" },
      descriptionBrief:
        "Given a **Sales** table (`SaleMonth`, `Amount`), first total the revenue **per month**, then add a " +
        "**running (cumulative) total** that accumulates month by month. Order by month.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "SaleMonth", type: "INT", note: "1-12" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, SaleMonth INT, Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,1,100.00),(2,1,50.00),(3,2,200.00),(4,3,100.00);",
      sampleData: [
        { table: "Sales", columns: ["Id","SaleMonth","Amount"],
          rows: [[1,1,"100.00"],[2,1,"50.00"],[3,2,"200.00"],[4,3,"100.00"]] }
      ],
      expectedOutput: { columns: ["SaleMonth","MonthlyRevenue","RunningTotal"],
        rows: [[1,"150.00","150.00"],[2,"200.00","350.00"],[3,"100.00","450.00"]] },
      approaches: [
        {
          name: "Group per month, then windowed running SUM (recommended)",
          perfNote: "One grouped pass collapses months, then a single ordered window accumulates them; a self-join running total would re-scan per month.",
          dialectNote: "`SUM(...) OVER (ORDER BY col)` is a running total (SQL Server 2012+), defaulting to RANGE UNBOUNDED PRECEDING.",
          logic:
            "**What it asks.** Two numbers per month: that month's revenue, and the cumulative revenue through that month.\n\n" +
            "**Why the naive idea fails.** A grouped `SUM` gives the monthly total but not the accumulation; a correlated self-join summing all earlier months re-scans the data for every month and scales poorly.\n\n" +
            "**Key Idea.** First aggregate to one row per month (`GROUP BY SaleMonth`), then apply `SUM(MonthlyRevenue) OVER (ORDER BY SaleMonth)` to accumulate across those month rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, `GROUP BY SaleMonth` with `SUM(Amount)` as `MonthlyRevenue`.\n" +
            "2. In the outer query, add `SUM(MonthlyRevenue) OVER (ORDER BY SaleMonth)` as the running total.\n" +
            "3. Order by month.\n\n" +
            "**Why it works.** The window's `ORDER BY` defines a running frame (all rows up to the current month), so the cumulative sum grows month by month.\n\n" +
            "**Common Gotchas.** You cannot nest the running window directly over the raw rows and also collapse months in one step — aggregate first, then window. The default frame is fine for a simple running total.\n\n" +
            "**Performance.** One group aggregate then one ordered window pass, O(n log n) for the sort.\n\n" +
            "**Interview mindset.** 'running / cumulative total' → `SUM(x) OVER (ORDER BY t)`; aggregate to the reporting grain first.",
          tsql:
            "WITH Monthly AS (\n" +
            "    SELECT SaleMonth, SUM(Amount) AS MonthlyRevenue\n" +
            "    FROM dbo.Sales\n" +
            "    GROUP BY SaleMonth\n" +
            ")\n" +
            "SELECT SaleMonth,\n" +
            "       MonthlyRevenue,\n" +
            "       SUM(MonthlyRevenue) OVER (ORDER BY SaleMonth) AS RunningTotal  -- cumulative\n" +
            "FROM Monthly\n" +
            "ORDER BY SaleMonth;",
          clean:
            "WITH Monthly AS (\n" +
            "    SELECT SaleMonth, SUM(Amount) AS MonthlyRevenue\n" +
            "    FROM dbo.Sales\n" +
            "    GROUP BY SaleMonth\n" +
            ")\n" +
            "SELECT SaleMonth, MonthlyRevenue,\n" +
            "       SUM(MonthlyRevenue) OVER (ORDER BY SaleMonth) AS RunningTotal\n" +
            "FROM Monthly\n" +
            "ORDER BY SaleMonth;"
        }
      ],
      walkthrough: [
        { step: "Total per month", note: "Month 1 = 100+50 = 150, month 2 = 200, month 3 = 100.",
          table: { columns: ["SaleMonth","MonthlyRevenue"], rows: [[1,"150.00"],[2,"200.00"],[3,"100.00"]] } },
        { step: "Accumulate with SUM() OVER (ORDER BY month)", note: "150, then 150+200=350, then 350+100=450.",
          table: { columns: ["SaleMonth","MonthlyRevenue","RunningTotal"],
            rows: [[1,"150.00","150.00"],[2,"200.00","350.00"],[3,"100.00","450.00"]] } }
      ],
      patternRecognition: [
        "'running / cumulative total' → `SUM(x) OVER (ORDER BY t)` after aggregating to the reporting grain."
      ],
      interviewRecall: [
        "A window `SUM` with `ORDER BY` and no explicit frame is a running total.",
        "Aggregate to one row per period first, then accumulate over those rows."
      ],
      commonMistakes: [
        "Trying to collapse months and accumulate in a single flat GROUP BY.",
        "Using a correlated self-join for the running total, re-scanning per period."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-completed-order-revenue",
      number: "DL 2340",
      platform: "DataLemur",
      title: "Completed-Order Revenue per Customer",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Conditional Logic"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Filtered aggregate", sqlConcept: "SUM/COUNT over a CASE subset", technique: "Aggregate a filtered slice per group" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `Status`, `Amount`) where status is 'Completed', 'Cancelled', or " +
        "'Pending', return per customer the **revenue from completed orders only** and the **count of completed orders**.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Status", type: "VARCHAR(12)" },
          { name: "Amount", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, Status VARCHAR(12), Amount DECIMAL(10,2));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,'Completed',100.00),(2,1,'Cancelled',50.00),(3,1,'Completed',30.00),\n" +
        "  (4,2,'Pending',200.00),(5,2,'Completed',40.00);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId","Status","Amount"],
          rows: [[1,1,"Completed","100.00"],[2,1,"Cancelled","50.00"],[3,1,"Completed","30.00"],[4,2,"Pending","200.00"],[5,2,"Completed","40.00"]] }
      ],
      expectedOutput: { columns: ["CustomerId","CompletedRevenue","CompletedOrders"],
        rows: [[1,"130.00",2],[2,"40.00",1]] },
      approaches: [
        {
          name: "Filtered conditional aggregates (recommended)",
          perfNote: "Revenue and count of the completed slice come from one grouped scan; a CASE restricts each aggregate to completed rows without dropping the other customers.",
          dialectNote: "",
          logic:
            "**What it asks.** Per customer, sum and count only the *completed* orders, while still listing every customer that has at least one completed order.\n\n" +
            "**Why the naive idea fails.** Adding `WHERE Status='Completed'` works here, but it discards non-completed rows entirely — problematic once you also want a measure over all statuses in the same query. A per-group *filtered* aggregate keeps the flexibility.\n\n" +
            "**Key Idea.** Aggregate over a CASE-filtered slice: `SUM(CASE WHEN Status='Completed' THEN Amount END)` and `COUNT(CASE WHEN Status='Completed' THEN 1 END)` — the ELSE is NULL, which SUM and COUNT both ignore.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY CustomerId`.\n" +
            "2. `SUM(CASE WHEN Status='Completed' THEN Amount END)` for completed revenue.\n" +
            "3. `COUNT(CASE WHEN Status='Completed' THEN 1 END)` for completed order count.\n" +
            "4. Order by customer id.\n\n" +
            "**Why it works.** With no ELSE, non-completed rows contribute NULL, and SUM/COUNT skip NULLs — so only completed orders enter each aggregate.\n\n" +
            "**Common Gotchas.** `COUNT(CASE ... THEN 1 END)` counts completed rows; `COUNT(*)` would count all statuses. Omitting ELSE (or using `ELSE NULL`) is what filters — `ELSE 0` would wrongly pad the count if you used COUNT.\n\n" +
            "**Performance.** One grouped aggregate over a single scan, O(n).\n\n" +
            "**Interview mindset.** 'aggregate only the rows matching a condition, per group, but keep the groups' → SUM/COUNT over a CASE with no ELSE (a filtered aggregate).",
          tsql:
            "SELECT CustomerId,\n" +
            "       SUM(CASE WHEN Status = 'Completed' THEN Amount END) AS CompletedRevenue,\n" +
            "       COUNT(CASE WHEN Status = 'Completed' THEN 1 END)    AS CompletedOrders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;",
          clean:
            "SELECT CustomerId,\n" +
            "       SUM(CASE WHEN Status = 'Completed' THEN Amount END) AS CompletedRevenue,\n" +
            "       COUNT(CASE WHEN Status = 'Completed' THEN 1 END)    AS CompletedOrders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY CustomerId\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Aggregate only completed rows per customer", note: "Cust 1: completed 100 + 30 = 130 over 2 orders (Cancelled ignored). Cust 2: completed 40 over 1 (Pending ignored).",
          table: { columns: ["CustomerId","CompletedRevenue","CompletedOrders"], rows: [[1,"130.00",2],[2,"40.00",1]] } }
      ],
      patternRecognition: [
        "'aggregate only rows matching a condition, per group' → SUM/COUNT over a `CASE` with no ELSE (a filtered aggregate)."
      ],
      interviewRecall: [
        "A CASE with no ELSE yields NULL, and SUM/COUNT ignore NULLs — that is how you filter inside an aggregate.",
        "`COUNT(CASE WHEN cond THEN 1 END)` counts matching rows; `COUNT(*)` counts all."
      ],
      commonMistakes: [
        "Using `ELSE 0` in a COUNT and inflating the count of the filtered slice.",
        "Falling back to `WHERE Status='Completed'` when the query must also keep other-status measures."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-category-share-window",
      number: "DL 2348",
      platform: "DataLemur",
      title: "Category Share of Revenue With a Window",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Window Functions"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/questions",
      meta: { pattern: "Group share via window total", sqlConcept: "SUM(SUM(x)) OVER ()", technique: "Aggregate nested in a window" },
      descriptionBrief:
        "Given an **OrderLines** table (`Category`, `Revenue`), return each category's **total revenue** and its " +
        "**share of overall revenue** as a percentage rounded to two decimals — computed in a single pass, highest revenue first.",
      schema: [
        { name: "OrderLines", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(20)" },
          { name: "Revenue", type: "DECIMAL(10,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderLines','U') IS NOT NULL DROP TABLE dbo.OrderLines;\n" +
        "CREATE TABLE dbo.OrderLines (Id INT PRIMARY KEY, Category VARCHAR(20), Revenue DECIMAL(10,2));\n" +
        "INSERT INTO dbo.OrderLines VALUES\n" +
        "  (1,'Toys',100.00),(2,'Toys',100.00),(3,'Games',300.00),(4,'Books',100.00);",
      sampleData: [
        { table: "OrderLines", columns: ["Id","Category","Revenue"],
          rows: [[1,"Toys","100.00"],[2,"Toys","100.00"],[3,"Games","300.00"],[4,"Books","100.00"]] }
      ],
      expectedOutput: { columns: ["Category","Revenue","SharePct"],
        rows: [["Games","300.00","50.00"],["Toys","200.00","33.33"],["Books","100.00","16.67"]] },
      approaches: [
        {
          name: "Aggregate nested inside a window (recommended)",
          perfNote: "A single scan: the grouped category sums and the grand total (a windowed sum of those sums) come from one query, no correlated subquery.",
          dialectNote: "`SUM(SUM(Revenue)) OVER ()` nests a grouped aggregate inside a window — legal because windows run after GROUP BY.",
          logic:
            "**What it asks.** Each category's revenue and its percentage of the whole, in one query.\n\n" +
            "**Why the naive idea fails.** After `GROUP BY Category` you have the per-category sums but no direct handle on the grand total; a second scalar scan works but adds a pass, and integer math would truncate the share.\n\n" +
            "**Key Idea.** Group by category with `SUM(Revenue)`, then take `SUM(SUM(Revenue)) OVER ()` — the window sums the per-category totals into the grand total, available on every group row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Category` with `SUM(Revenue)` as the category total.\n" +
            "2. Add `SUM(SUM(Revenue)) OVER ()` as the grand total.\n" +
            "3. Divide, multiply by `100.0`, `ROUND(...,2)`.\n" +
            "4. Order by revenue descending.\n\n" +
            "**Why it works.** Window functions execute after grouping, so the outer `SUM(...) OVER ()` runs across the already-aggregated group rows, yielding the overall total in the same pass.\n\n" +
            "**Common Gotchas.** The empty `OVER ()` covers all groups; adding a PARTITION BY would change the denominator. Rounded shares may not sum to exactly 100 (here 50 + 33.33 + 16.67 = 100.00).\n\n" +
            "**Performance.** One grouped pass plus the window computation — no separate scan of the base table.\n\n" +
            "**Interview mindset.** 'each group's share of the whole in one pass' → `SUM(SUM(x)) OVER ()` as the denominator.",
          tsql:
            "SELECT Category,\n" +
            "       SUM(Revenue) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Revenue)\n" +
            "                  / SUM(SUM(Revenue)) OVER (), 2) AS DECIMAL(5,2)) AS SharePct\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;",
          clean:
            "SELECT Category,\n" +
            "       SUM(Revenue) AS Revenue,\n" +
            "       CAST(ROUND(100.0 * SUM(Revenue)\n" +
            "                  / SUM(SUM(Revenue)) OVER (), 2) AS DECIMAL(5,2)) AS SharePct\n" +
            "FROM dbo.OrderLines\n" +
            "GROUP BY Category\n" +
            "ORDER BY Revenue DESC;"
        }
      ],
      walkthrough: [
        { step: "Category totals and grand total", note: "Games 300, Toys 200, Books 100; grand total 600 via SUM(SUM) OVER ().",
          table: { columns: ["Category","Revenue"], rows: [["Games","300.00"],["Toys","200.00"],["Books","100.00"]] } },
        { step: "Share = category / 600", note: "300/600=50.00, 200/600=33.33, 100/600=16.67.",
          table: { columns: ["Category","Revenue","SharePct"],
            rows: [["Games","300.00","50.00"],["Toys","200.00","33.33"],["Books","100.00","16.67"]] } }
      ],
      patternRecognition: [
        "'each group's share of the whole, one pass' → `SUM(SUM(x)) OVER ()` as the denominator.",
        "Windows run after GROUP BY, so an aggregate may be nested inside `... OVER ()`."
      ],
      interviewRecall: [
        "`SUM(SUM(x)) OVER ()` gives the grand total alongside the grouped sums in one scan.",
        "Force decimal math with a `100.0` literal; rounded shares may not total exactly 100."
      ],
      commonMistakes: [
        "Adding a PARTITION BY to the window and changing the denominator.",
        "Using integer `100` and truncating each share to a whole number or 0."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "agg2-employees-with-without-manager",
      number: "SS 10355",
      platform: "StrataScratch",
      title: "Managed vs Top-Level Employees per Department",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "NULL Handling"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Count with vs without a value", sqlConcept: "COUNT(col) vs COUNT of NULLs", technique: "NULL-aware conditional counts" },
      descriptionBrief:
        "Given an **Employees** table (`Dept`, `ManagerId`) where a NULL `ManagerId` means the employee reports to " +
        "no one, return per department how many employees **have a manager** and how many are **top-level** (NULL manager).",
      schema: [
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Dept", type: "VARCHAR(20)" },
          { name: "ManagerId", type: "INT", note: "NULL = top-level" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, Dept VARCHAR(20), ManagerId INT);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Sales',NULL),(2,'Sales',1),(3,'Sales',1),\n" +
        "  (4,'Eng',2);",
      sampleData: [
        { table: "Employees", columns: ["Id","Dept","ManagerId"],
          rows: [[1,"Sales",null],[2,"Sales",1],[3,"Sales",1],[4,"Eng",2]] }
      ],
      expectedOutput: { columns: ["Dept","WithManager","WithoutManager"],
        rows: [["Eng",1,0],["Sales",2,1]] },
      approaches: [
        {
          name: "COUNT(col) plus a NULL-counting CASE (recommended)",
          perfNote: "Both counts come from one grouped scan; COUNT(ManagerId) naturally skips NULLs, and a CASE counts the NULLs — no self-join, no two queries.",
          dialectNote: "",
          logic:
            "**What it asks.** Per department, split the headcount into those who have a manager and those whose `ManagerId` is NULL.\n\n" +
            "**Why the naive idea fails.** `COUNT(*)` counts everyone regardless of manager; filtering `WHERE ManagerId IS NOT NULL` would drop the top-level employees you also need to count in the same result.\n\n" +
            "**Key Idea.** `COUNT(ManagerId)` counts only non-NULL managers (the managed employees), and `SUM(CASE WHEN ManagerId IS NULL THEN 1 ELSE 0 END)` counts the NULLs (the top-level ones).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Dept`.\n" +
            "2. `COUNT(ManagerId)` for employees with a manager (NULLs skipped).\n" +
            "3. `SUM(CASE WHEN ManagerId IS NULL THEN 1 ELSE 0 END)` for top-level employees.\n" +
            "4. Order by department.\n\n" +
            "**Why it works.** `COUNT(col)` is defined to ignore NULLs, so it directly counts the managed staff; the complementary CASE explicitly tallies the NULLs.\n\n" +
            "**Common Gotchas.** `COUNT(ManagerId)` and `COUNT(*)` differ exactly by the NULL count — do not use `COUNT(*)` for the managed count. `COUNT(ManagerId) + WithoutManager` equals the department headcount.\n\n" +
            "**Performance.** One grouped aggregate for both measures, O(n).\n\n" +
            "**Interview mindset.** 'how many have a value vs are NULL, per group' → `COUNT(col)` for present, `SUM(CASE WHEN col IS NULL ...)` for missing.",
          tsql:
            "SELECT Dept,\n" +
            "       COUNT(ManagerId) AS WithManager,                                  -- non-NULL managers\n" +
            "       SUM(CASE WHEN ManagerId IS NULL THEN 1 ELSE 0 END) AS WithoutManager\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY Dept\n" +
            "ORDER BY Dept;",
          clean:
            "SELECT Dept,\n" +
            "       COUNT(ManagerId) AS WithManager,\n" +
            "       SUM(CASE WHEN ManagerId IS NULL THEN 1 ELSE 0 END) AS WithoutManager\n" +
            "FROM dbo.Employees\n" +
            "GROUP BY Dept\n" +
            "ORDER BY Dept;"
        }
      ],
      walkthrough: [
        { step: "Split by manager presence per department", note: "Sales: two with a manager (ids 2,3), one top-level (id 1 NULL). Eng: one with a manager (id 4), none top-level.",
          table: { columns: ["Dept","WithManager","WithoutManager"], rows: [["Eng",1,0],["Sales",2,1]] } }
      ],
      patternRecognition: [
        "'how many have a value vs are NULL, per group' → `COUNT(col)` for present, `SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END)` for missing."
      ],
      interviewRecall: [
        "`COUNT(col)` ignores NULLs; `COUNT(*)` counts every row — their difference is the NULL count.",
        "`COUNT(col) + (NULL count)` equals the group's total headcount."
      ],
      commonMistakes: [
        "Using `COUNT(*)` for the managed count and including the top-level employees.",
        "Filtering out NULL managers with WHERE and losing the top-level count."
      ]
    }
  ]);
})();
