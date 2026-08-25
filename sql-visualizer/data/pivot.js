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
    }

  ]);
})();
