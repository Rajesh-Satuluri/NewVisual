/*
 * data/pivot.js — Pivot / Conditional Aggregation.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Pivot / Conditional Agg", [

    {
      id: "sales-by-quarter-pivot",
      number: "SS 10201",
      platform: "StrataScratch",
      title: "Sales by Quarter (One Row per Product)",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Rows → columns", sqlConcept: "Conditional SUM / PIVOT", technique: "Cross-tab" },
      descriptionBrief:
        "Given **Sales(Product, Quarter, Amount)** with quarters 'Q1'..'Q4', return one row " +
        "per product with **four columns** Q1–Q4 holding that quarter's total amount (0 if none).",
      schema: [
        { name: "Sales", columns: [
          { name: "Product", type: "VARCHAR(30)" },
          { name: "Quarter", type: "CHAR(2)", note: "Q1..Q4" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Product VARCHAR(30), Quarter CHAR(2), Amount INT);\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  ('Widget','Q1',100),('Widget','Q2',150),('Widget','Q1',50),\n" +
        "  ('Gadget','Q2',200),('Gadget','Q4',75);",
      sampleData: [
        { table: "Sales", columns: ["Product","Quarter","Amount"],
          rows: [["Widget","Q1",100],["Widget","Q2",150],["Widget","Q1",50],["Gadget","Q2",200],["Gadget","Q4",75]] }
      ],
      expectedOutput: { columns: ["Product","Q1","Q2","Q3","Q4"],
        rows: [["Gadget",0,200,0,75],["Widget",150,150,0,0]] },
      approaches: [
        {
          name: "Conditional aggregation (recommended)",
          perfNote: "SUM(CASE …) does the cross-tab in one grouped scan; more flexible and portable than PIVOT and easy to extend with extra measures.",
          dialectNote: "",
          logic:
            "**What it asks.** Turn the four quarter rows per product into four columns.\n\n" +
            "**Why the naive idea fails.** Plain `GROUP BY Product` can't split one measure into per-quarter columns; you need to route each row's amount to the right column.\n\n" +
            "**Key Idea.** `SUM(CASE WHEN Quarter='Q1' THEN Amount ELSE 0 END)` sums only Q1 rows into the Q1 column — repeat per quarter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Product`.\n" +
            "2. One conditional `SUM` per quarter column.\n" +
            "3. ELSE 0 so absent quarters render 0, not NULL.\n\n" +
            "**Why it works.** The CASE zeroes out non-matching rows, so each SUM accumulates only its quarter.\n\n" +
            "**Common Gotchas.** Use `ELSE 0` (or ISNULL) so missing quarters show 0; Widget's two Q1 rows correctly sum to 150.\n\n" +
            "**Performance.** Single group-aggregate pass.\n\n" +
            "**Interview mindset.** 'rows into columns / cross-tab' → SUM(CASE …) per target column (the portable PIVOT).",
          tsql:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Quarter='Q1' THEN Amount ELSE 0 END) AS Q1,\n" +
            "       SUM(CASE WHEN Quarter='Q2' THEN Amount ELSE 0 END) AS Q2,\n" +
            "       SUM(CASE WHEN Quarter='Q3' THEN Amount ELSE 0 END) AS Q3,\n" +
            "       SUM(CASE WHEN Quarter='Q4' THEN Amount ELSE 0 END) AS Q4\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product\n" +
            "ORDER BY Product;",
          clean:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Quarter='Q1' THEN Amount ELSE 0 END) AS Q1,\n" +
            "       SUM(CASE WHEN Quarter='Q2' THEN Amount ELSE 0 END) AS Q2,\n" +
            "       SUM(CASE WHEN Quarter='Q3' THEN Amount ELSE 0 END) AS Q3,\n" +
            "       SUM(CASE WHEN Quarter='Q4' THEN Amount ELSE 0 END) AS Q4\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product\n" +
            "ORDER BY Product;"
        },
        {
          name: "PIVOT operator",
          perfNote: "The dedicated PIVOT syntax is compact when the column set is fixed and known; less flexible for multiple measures or dynamic columns.",
          dialectNote: "T-SQL `PIVOT` requires listing the pivoted values explicitly and an aggregate.",
          logic:
            "**Key Idea.** Feed a two-column (Quarter, Amount) source into `PIVOT (SUM(Amount) FOR Quarter IN ([Q1],[Q2],[Q3],[Q4]))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Select `Product, Quarter, Amount` as the pivot source.\n" +
            "2. Apply `PIVOT` summing Amount across the four quarter values.\n" +
            "3. ISNULL each quarter column to 0.\n\n" +
            "**Why it works.** PIVOT groups by the non-listed columns (Product) and spreads the aggregate across the named quarter values.\n\n" +
            "**Common Gotchas.** You must enumerate the quarter columns; PIVOT returns NULL for missing combinations, so wrap in ISNULL.\n\n" +
            "**Performance.** Comparable to conditional aggregation.\n\n" +
            "**Interview mindset.** Know both — PIVOT is neat for a fixed column list; CASE scales to many measures.",
          tsql:
            "SELECT Product,\n" +
            "       ISNULL(Q1,0) AS Q1, ISNULL(Q2,0) AS Q2,\n" +
            "       ISNULL(Q3,0) AS Q3, ISNULL(Q4,0) AS Q4\n" +
            "FROM (SELECT Product, Quarter, Amount FROM dbo.Sales) src\n" +
            "PIVOT (SUM(Amount) FOR Quarter IN ([Q1],[Q2],[Q3],[Q4])) p\n" +
            "ORDER BY Product;",
          clean:
            "SELECT Product,\n" +
            "       ISNULL(Q1,0) AS Q1, ISNULL(Q2,0) AS Q2, ISNULL(Q3,0) AS Q3, ISNULL(Q4,0) AS Q4\n" +
            "FROM (SELECT Product, Quarter, Amount FROM dbo.Sales) src\n" +
            "PIVOT (SUM(Amount) FOR Quarter IN ([Q1],[Q2],[Q3],[Q4])) p\n" +
            "ORDER BY Product;"
        }
      ],
      walkthrough: [
        { step: "Route each amount to its quarter column, sum per product",
          note: "Widget Q1 = 100+50 = 150; Gadget Q2 = 200, Q4 = 75; empties = 0.",
          table: { columns: ["Product","Q1","Q2","Q3","Q4"],
            rows: [["Gadget",0,200,0,75],["Widget",150,150,0,0]] } }
      ],
      patternRecognition: [
        "'rows into columns / cross-tab / one column per category' → SUM(CASE …) or PIVOT."
      ],
      interviewRecall: [
        "Conditional aggregation is the portable, flexible pivot; PIVOT is compact for a fixed column list.",
        "Use ELSE 0 / ISNULL so missing categories render 0, not NULL."
      ],
      commonMistakes: [
        "Leaving NULLs for absent categories instead of 0.",
        "Forgetting that multiple source rows for one cell must be summed (Widget's two Q1 rows)."
      ]
    },

    {
      id: "status-counts-per-day",
      number: "DL 10188",
      platform: "DataLemur",
      title: "Order Status Counts per Day",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg", "Aggregation & Grouping"],
      domains: ["Operations Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Conditional count crosstab", sqlConcept: "COUNT(CASE …)", technique: "Count per category into columns" },
      descriptionBrief:
        "Given **Orders(OrderDate, Status)** with statuses 'Placed','Shipped','Cancelled', " +
        "return one row per day with a **count column for each status**.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "OrderDate", type: "DATE" },
          { name: "Status", type: "VARCHAR(20)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, OrderDate DATE, Status VARCHAR(20));\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'2024-01-01','Placed'),(2,'2024-01-01','Shipped'),(3,'2024-01-01','Placed'),\n" +
        "  (4,'2024-01-02','Cancelled'),(5,'2024-01-02','Shipped');",
      sampleData: [
        { table: "Orders", columns: ["Id","OrderDate","Status"],
          rows: [[1,"2024-01-01","Placed"],[2,"2024-01-01","Shipped"],[3,"2024-01-01","Placed"],[4,"2024-01-02","Cancelled"],[5,"2024-01-02","Shipped"]] }
      ],
      expectedOutput: { columns: ["OrderDate","Placed","Shipped","Cancelled"],
        rows: [["2024-01-01",2,1,0],["2024-01-02",0,1,1]] },
      approaches: [
        {
          name: "COUNT(CASE …) (recommended)",
          perfNote: "Counts all status columns in one grouped pass; COUNT ignores the NULLs the CASE produces for non-matching rows.",
          dialectNote: "",
          logic:
            "**What it asks.** A per-day breakdown of orders by status, statuses as columns.\n\n" +
            "**Why the naive idea fails.** A single `COUNT(*)` per day gives one number; you need a separate count per status.\n\n" +
            "**Key Idea.** `COUNT(CASE WHEN Status='Placed' THEN 1 END)` counts only Placed rows (the CASE yields NULL otherwise, and COUNT skips NULLs) — one such expression per status.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY OrderDate`.\n" +
            "2. One `COUNT(CASE WHEN Status='X' THEN 1 END)` per status.\n\n" +
            "**Why it works.** COUNT counts non-NULLs, so each conditional counts exactly its status.\n\n" +
            "**Common Gotchas.** Use `COUNT` (not `SUM`) with `THEN 1 END` and no ELSE — or use `SUM(CASE … THEN 1 ELSE 0 END)`. Mixing them (COUNT with ELSE 0) counts everything.\n\n" +
            "**Performance.** Single group-aggregate pass.\n\n" +
            "**Interview mindset.** 'count per category across columns' → COUNT(CASE …) (a conditional-aggregation crosstab).",
          tsql:
            "SELECT OrderDate,\n" +
            "       COUNT(CASE WHEN Status='Placed'    THEN 1 END) AS Placed,\n" +
            "       COUNT(CASE WHEN Status='Shipped'   THEN 1 END) AS Shipped,\n" +
            "       COUNT(CASE WHEN Status='Cancelled' THEN 1 END) AS Cancelled\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY OrderDate\n" +
            "ORDER BY OrderDate;",
          clean:
            "SELECT OrderDate,\n" +
            "       COUNT(CASE WHEN Status='Placed' THEN 1 END) AS Placed,\n" +
            "       COUNT(CASE WHEN Status='Shipped' THEN 1 END) AS Shipped,\n" +
            "       COUNT(CASE WHEN Status='Cancelled' THEN 1 END) AS Cancelled\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY OrderDate\n" +
            "ORDER BY OrderDate;"
        }
      ],
      walkthrough: [
        { step: "Count each status per day", note: "Jan 1: 2 Placed, 1 Shipped, 0 Cancelled. Jan 2: 0/1/1.",
          table: { columns: ["OrderDate","Placed","Shipped","Cancelled"],
            rows: [["2024-01-01",2,1,0],["2024-01-02",0,1,1]] } }
      ],
      patternRecognition: [
        "'count of each category as its own column' → COUNT(CASE WHEN cat THEN 1 END) per category."
      ],
      interviewRecall: [
        "COUNT(CASE … THEN 1 END) counts matches because COUNT ignores NULLs.",
        "Don't add ELSE 0 to a COUNT(CASE …) — that counts every row."
      ],
      commonMistakes: [
        "Using COUNT(CASE … THEN 1 ELSE 0 END), which counts all rows.",
        "Returning NULL instead of 0 for a status absent on a given day (COUNT gives 0 correctly; SUM needs ISNULL)."
      ]
    },

    {
      id: "unpivot-quarter-columns",
      number: "SS 10233",
      platform: "StrataScratch",
      title: "Unpivot Quarterly Columns to Rows",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Columns → rows", sqlConcept: "UNPIVOT / CROSS APPLY VALUES", technique: "Normalize a wide table" },
      descriptionBrief:
        "Given a wide table **Wide(Product, Q1, Q2, Q3, Q4)**, return a **long** result with one " +
        "row per product-quarter: columns Product, Quarter, Amount.",
      schema: [
        { name: "Wide", columns: [
          { name: "Product", type: "VARCHAR(30)", note: "PK" },
          { name: "Q1", type: "INT" }, { name: "Q2", type: "INT" },
          { name: "Q3", type: "INT" }, { name: "Q4", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Wide','U') IS NOT NULL DROP TABLE dbo.Wide;\n" +
        "CREATE TABLE dbo.Wide (Product VARCHAR(30) PRIMARY KEY, Q1 INT, Q2 INT, Q3 INT, Q4 INT);\n" +
        "INSERT INTO dbo.Wide VALUES ('Widget',150,150,0,0),('Gadget',0,200,0,75);",
      sampleData: [
        { table: "Wide", columns: ["Product","Q1","Q2","Q3","Q4"],
          rows: [["Widget",150,150,0,0],["Gadget",0,200,0,75]] }
      ],
      expectedOutput: { columns: ["Product","Quarter","Amount"],
        rows: [["Widget","Q1",150],["Widget","Q2",150],["Widget","Q3",0],["Widget","Q4",0],
               ["Gadget","Q1",0],["Gadget","Q2",200],["Gadget","Q3",0],["Gadget","Q4",75]] },
      approaches: [
        {
          name: "CROSS APPLY (VALUES …) (recommended)",
          perfNote: "One scan expands each row into four; more flexible than UNPIVOT (handles multiple measures and expressions) and easy to read.",
          dialectNote: "CROSS APPLY (VALUES …) is the modern, flexible way to unpivot in T-SQL; the older UNPIVOT operator also works.",
          logic:
            "**What it asks.** Turn four quarter columns back into four rows per product (normalize a cross-tab).\n\n" +
            "**Why the naive idea fails.** A plain SELECT keeps the wide shape; you must explode each row into one row per quarter.\n\n" +
            "**Key Idea.** `CROSS APPLY (VALUES ('Q1',Q1),('Q2',Q2),('Q3',Q3),('Q4',Q4)) v(Quarter,Amount)` pairs each product with its four (quarter, amount) tuples.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each Wide row, APPLY a 4-row VALUES list mapping label → column.\n" +
            "2. Project Product, v.Quarter, v.Amount.\n\n" +
            "**Why it works.** CROSS APPLY runs the VALUES table-expression per outer row, multiplying one wide row into four long rows.\n\n" +
            "**Common Gotchas.** All unpivoted columns must share a compatible type; UNPIVOT drops NULLs whereas the VALUES approach keeps them.\n\n" +
            "**Performance.** One scan with a 4× row expansion.\n\n" +
            "**Interview mindset.** 'columns into rows / normalize wide data' → CROSS APPLY (VALUES …) or UNPIVOT.",
          tsql:
            "SELECT w.Product, v.Quarter, v.Amount\n" +
            "FROM dbo.Wide w\n" +
            "CROSS APPLY (VALUES ('Q1', w.Q1), ('Q2', w.Q2),\n" +
            "                    ('Q3', w.Q3), ('Q4', w.Q4)) v(Quarter, Amount)\n" +
            "ORDER BY w.Product DESC, v.Quarter;",
          clean:
            "SELECT w.Product, v.Quarter, v.Amount\n" +
            "FROM dbo.Wide w\n" +
            "CROSS APPLY (VALUES ('Q1', w.Q1), ('Q2', w.Q2), ('Q3', w.Q3), ('Q4', w.Q4)) v(Quarter, Amount)\n" +
            "ORDER BY w.Product DESC, v.Quarter;"
        }
      ],
      walkthrough: [
        { step: "Explode each product into four quarter rows", note: "Widget → Q1..Q4; Gadget → Q1..Q4.",
          table: { columns: ["Product","Quarter","Amount"],
            rows: [["Widget","Q1",150],["Widget","Q2",150],["Widget","Q3",0],["Widget","Q4",0],["Gadget","Q1",0],["Gadget","Q2",200],["Gadget","Q3",0],["Gadget","Q4",75]] } }
      ],
      patternRecognition: [
        "'columns into rows / normalize a wide table' → CROSS APPLY (VALUES …) or the UNPIVOT operator."
      ],
      interviewRecall: [
        "CROSS APPLY (VALUES …) is the flexible unpivot; it keeps NULLs, UNPIVOT drops them.",
        "Unpivoted source columns must be type-compatible."
      ],
      commonMistakes: [
        "Assuming UNPIVOT preserves NULL rows (it removes them).",
        "Unpivoting columns of incompatible types without casting."
      ]
    }

  ]);
})();
