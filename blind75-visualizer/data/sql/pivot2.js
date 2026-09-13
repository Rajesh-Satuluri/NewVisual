/*
 * data/sql/pivot2.js — Pivot / Conditional Aggregation (fold-in).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * Funnel-as-columns, unpivot, cross-tab rates, and year-over-year conditional
 * pivots — the SUM(CASE …) toolkit interviewers reach for constantly.
 */
(function () {
  window.SQLLAB.register("Pivot / Conditional Agg", [

    {
      id: "piv2-funnel-columns",
      number: "SL 4401",
      platform: "StudyLab",
      title: "Conversion Funnel as Columns",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg", "Aggregation"],
      domains: ["Product Analytics"],
      link: "",
      meta: { pattern: "Funnel pivot", sqlConcept: "COUNT(DISTINCT CASE …)", technique: "Conditional aggregation" },
      descriptionBrief:
        "Given **FunnelEvents(UserId, Step)** where Step is 'visit', 'signup', or 'purchase', return a single " +
        "row with the number of **distinct users** reaching each step as columns: Visits, Signups, Purchases.",
      schema: [
        { name: "FunnelEvents", columns: [
          { name: "UserId", type: "INT" },
          { name: "Step", type: "VARCHAR(20)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.FunnelEvents','U') IS NOT NULL DROP TABLE dbo.FunnelEvents;\n" +
        "CREATE TABLE dbo.FunnelEvents (UserId INT, Step VARCHAR(20));\n" +
        "INSERT INTO dbo.FunnelEvents VALUES\n" +
        "  (1,'visit'),(1,'signup'),(1,'purchase'),\n" +
        "  (2,'visit'),(2,'signup'),\n" +
        "  (3,'visit');",
      sampleData: [
        { table: "FunnelEvents", columns: ["UserId","Step"],
          rows: [[1,"visit"],[1,"signup"],[1,"purchase"],[2,"visit"],[2,"signup"],[3,"visit"]] }
      ],
      expectedOutput: { columns: ["Visits","Signups","Purchases"], rows: [[3,2,1]] },
      approaches: [
        {
          name: "COUNT(DISTINCT CASE …) per step (recommended)",
          perfNote: "One grouped scan produces all three counters; no self-joins or multiple passes.",
          dialectNote: "COUNT(DISTINCT CASE …) is ANSI-standard. SQL Server's PIVOT operator can do this too but is more rigid and needs the column list hard-coded.",
          logic:
            "**What it asks.** Distinct users at each funnel stage, laid out horizontally.\n\n" +
            "**Why the naive idea fails.** Three separate queries UNION'd give rows, not columns; joining three filtered subqueries is verbose and error-prone.\n\n" +
            "**Key Idea.** Conditional aggregation: `COUNT(DISTINCT CASE WHEN Step = 'visit' THEN UserId END)` counts only the users who hit that step, one expression per column.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each step, write `CASE WHEN Step = '<step>' THEN UserId END`.\n" +
            "2. Wrap in `COUNT(DISTINCT …)` so repeat events don't double-count a user.\n" +
            "3. No GROUP BY — a single summary row.\n\n" +
            "**Why it works.** CASE returns NULL for non-matching steps, and COUNT ignores NULLs, so each column counts exactly its own step's distinct users.\n\n" +
            "**Common Gotchas.** Using COUNT(*) instead of COUNT(DISTINCT UserId) and inflating counts when users have multiple events per step.\n\n" +
            "**Performance.** Single aggregation — O(n).\n\n" +
            "**Interview mindset.** 'categories/steps as columns' → SUM/COUNT with CASE, one per column.",
          tsql:
            "SELECT\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'visit'    THEN UserId END) AS Visits,\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'signup'   THEN UserId END) AS Signups,\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'purchase' THEN UserId END) AS Purchases\n" +
            "FROM dbo.FunnelEvents;",
          clean:
            "SELECT\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'visit'    THEN UserId END) AS Visits,\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'signup'   THEN UserId END) AS Signups,\n" +
            "  COUNT(DISTINCT CASE WHEN Step = 'purchase' THEN UserId END) AS Purchases\n" +
            "FROM dbo.FunnelEvents;"
        }
      ],
      walkthrough: [
        { step: "Count distinct users per step", note: "visit → {1,2,3}=3; signup → {1,2}=2; purchase → {1}=1.",
          table: { columns: ["Visits","Signups","Purchases"], rows: [[3,2,1]] } }
      ],
      patternRecognition: [
        "'funnel / steps / statuses as columns' → COUNT(DISTINCT CASE …) per column.",
        "One summary row of category counts → conditional aggregation, no GROUP BY."
      ],
      interviewRecall: [
        "CASE returns NULL when it doesn't match; COUNT and SUM ignore NULLs.",
        "Use COUNT(DISTINCT …) when the same entity can appear multiple times per bucket."
      ],
      commonMistakes: [
        "COUNT(*) double-counting users with repeat events.",
        "UNION'ing rows when the ask is columns."
      ]
    },

    {
      id: "piv2-unpivot",
      number: "SL 4402",
      platform: "StudyLab",
      title: "Unpivot Monthly Columns into Rows",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg"],
      domains: ["Finance"],
      link: "",
      meta: { pattern: "Wide-to-long", sqlConcept: "UNPIVOT / CROSS APPLY VALUES", technique: "Unpivot" },
      descriptionBrief:
        "Given **QuarterSales(Region, Jan, Feb, Mar)** in a wide format, reshape it to a long format with " +
        "one row per Region and Month: (Region, Month, Amount).",
      schema: [
        { name: "QuarterSales", columns: [
          { name: "Region", type: "VARCHAR(10)" },
          { name: "Jan", type: "INT" },
          { name: "Feb", type: "INT" },
          { name: "Mar", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.QuarterSales','U') IS NOT NULL DROP TABLE dbo.QuarterSales;\n" +
        "CREATE TABLE dbo.QuarterSales (Region VARCHAR(10), Jan INT, Feb INT, Mar INT);\n" +
        "INSERT INTO dbo.QuarterSales VALUES ('US',100,200,150),('EU',80,90,120);",
      sampleData: [
        { table: "QuarterSales", columns: ["Region","Jan","Feb","Mar"],
          rows: [["US",100,200,150],["EU",80,90,120]] }
      ],
      expectedOutput: { columns: ["Region","Month","Amount"],
        rows: [["EU","Jan",80],["EU","Feb",90],["EU","Mar",120],
               ["US","Jan",100],["US","Feb",200],["US","Mar",150]] },
      approaches: [
        {
          name: "CROSS APPLY (VALUES …) (recommended)",
          perfNote: "One pass; CROSS APPLY VALUES is more flexible than UNPIVOT (allows expressions and mixed types) and reads clearly.",
          dialectNote: "CROSS APPLY (VALUES …) is SQL-Server/Oracle-friendly. SQL Server also has the UNPIVOT operator. Postgres uses LATERAL (VALUES …) or unnest.",
          logic:
            "**What it asks.** Turn three month columns into rows, tagging each with its month name.\n\n" +
            "**Why the naive idea fails.** Manually UNION ALL'ing three SELECTs (one per month) works but scales badly and repeats the table reference three times.\n\n" +
            "**Key Idea.** `CROSS APPLY (VALUES ('Jan', Jan), ('Feb', Feb), ('Mar', Mar)) v(Month, Amount)` expands each source row into three, pairing a label with its value.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep Region from the base row.\n" +
            "2. CROSS APPLY a VALUES table of (label, column) pairs.\n" +
            "3. Order by Region and a month sort key for calendar order.\n\n" +
            "**Why it works.** CROSS APPLY runs the VALUES constructor once per base row, multiplying rows by the number of value pairs.\n\n" +
            "**Common Gotchas.** Alphabetical month ordering (Feb before Jan) unless you add an explicit calendar sort; type mismatches across unpivoted columns.\n\n" +
            "**Performance.** O(n · k) for k unpivoted columns — here k = 3.\n\n" +
            "**Interview mindset.** 'wide to long / normalize columns into rows' → UNPIVOT or CROSS APPLY VALUES.",
          tsql:
            "SELECT q.Region, v.Month, v.Amount\n" +
            "FROM dbo.QuarterSales q\n" +
            "CROSS APPLY (VALUES ('Jan', q.Jan), ('Feb', q.Feb), ('Mar', q.Mar)) v(Month, Amount)\n" +
            "ORDER BY q.Region,\n" +
            "         CASE v.Month WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 END;",
          clean:
            "SELECT q.Region, v.Month, v.Amount\n" +
            "FROM dbo.QuarterSales q\n" +
            "CROSS APPLY (VALUES ('Jan', q.Jan), ('Feb', q.Feb), ('Mar', q.Mar)) v(Month, Amount)\n" +
            "ORDER BY q.Region, CASE v.Month WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 END;"
        }
      ],
      walkthrough: [
        { step: "Expand each region into 3 rows", note: "EU → (Jan,80),(Feb,90),(Mar,120); US → (Jan,100),(Feb,200),(Mar,150)." },
        { step: "Order by Region, calendar month", note: "EU rows first, then US, months in Jan/Feb/Mar order.",
          table: { columns: ["Region","Month","Amount"],
            rows: [["EU","Jan",80],["EU","Feb",90],["EU","Mar",120],["US","Jan",100],["US","Feb",200],["US","Mar",150]] } }
      ],
      patternRecognition: [
        "'reshape columns into rows / normalize a wide table' → UNPIVOT or CROSS APPLY VALUES.",
        "Repeated UNION ALL of one-column SELECTs → replace with CROSS APPLY VALUES."
      ],
      interviewRecall: [
        "CROSS APPLY (VALUES …) is the flexible unpivot; UNPIVOT is the dedicated operator.",
        "Unpivoted month/label columns sort alphabetically unless you add a calendar CASE."
      ],
      commonMistakes: [
        "Months coming out alphabetically (Feb, Jan, Mar) with no explicit order.",
        "Mismatched data types across the columns being unpivoted."
      ]
    },

    {
      id: "piv2-crosstab-rates",
      number: "SL 4403",
      platform: "StudyLab",
      title: "Cross-Tab of Order Status with Completion Rate",
      difficulty: "Hard",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg", "Aggregation"],
      domains: ["E-commerce"],
      link: "",
      meta: { pattern: "Cross-tab with rate", sqlConcept: "SUM(CASE …) + NULLIF ratio", technique: "Conditional aggregation" },
      descriptionBrief:
        "Given **Orders2(Category, Status)** where Status is 'completed' or 'cancelled', return per category the " +
        "count of completed and cancelled orders plus the **completion rate** as a percentage rounded to 2 decimals.",
      schema: [
        { name: "Orders2", columns: [
          { name: "Category", type: "VARCHAR(20)" },
          { name: "Status", type: "VARCHAR(20)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders2','U') IS NOT NULL DROP TABLE dbo.Orders2;\n" +
        "CREATE TABLE dbo.Orders2 (Category VARCHAR(20), Status VARCHAR(20));\n" +
        "INSERT INTO dbo.Orders2 VALUES\n" +
        "  ('Books','completed'),('Books','completed'),('Books','cancelled'),\n" +
        "  ('Toys','completed'),('Toys','cancelled'),('Toys','cancelled');",
      sampleData: [
        { table: "Orders2", columns: ["Category","Status"],
          rows: [["Books","completed"],["Books","completed"],["Books","cancelled"],
                 ["Toys","completed"],["Toys","cancelled"],["Toys","cancelled"]] }
      ],
      expectedOutput: { columns: ["Category","Completed","Cancelled","CompletionRate"],
        rows: [["Books",2,1,66.67],["Toys",1,2,33.33]] },
      approaches: [
        {
          name: "SUM(CASE …) columns + guarded rate (recommended)",
          perfNote: "One grouped scan yields both counts and the rate; NULLIF avoids divide-by-zero for empty categories.",
          dialectNote: "SUM(CASE …) is portable everywhere. Cast to decimal (1.0 * or CAST) before dividing in SQL Server to avoid integer truncation.",
          logic:
            "**What it asks.** A per-category cross-tab of status counts and the completed-share percentage.\n\n" +
            "**Why the naive idea fails.** Separate COUNT queries per status need joining back together; computing the rate without a decimal cast truncates to 0, and an all-cancelled category could divide by zero.\n\n" +
            "**Key Idea.** `SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END)` builds each status column; the rate is `100.0 * completed / NULLIF(total, 0)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. GROUP BY Category.\n" +
            "2. SUM(CASE) for Completed and Cancelled counts.\n" +
            "3. Rate = 100.0 × completed ÷ NULLIF(total rows, 0), rounded to 2.\n\n" +
            "**Why it works.** The CASE sums partition the group's rows into status buckets in a single pass; NULLIF makes an empty denominator yield NULL rather than an error.\n\n" +
            "**Common Gotchas.** Integer division truncating the rate; forgetting NULLIF; counting total as completed+cancelled by hand instead of COUNT(*).\n\n" +
            "**Performance.** Single hash/stream aggregate — O(n).\n\n" +
            "**Interview mindset.** 'counts by status + a rate' → SUM(CASE) columns and a NULLIF-guarded ratio.",
          tsql:
            "SELECT Category,\n" +
            "       SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) AS Completed,\n" +
            "       SUM(CASE WHEN Status = 'cancelled' THEN 1 ELSE 0 END) AS Cancelled,\n" +
            "       ROUND(100.0 * SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END)\n" +
            "             / NULLIF(COUNT(*), 0), 2) AS CompletionRate\n" +
            "FROM dbo.Orders2\n" +
            "GROUP BY Category\n" +
            "ORDER BY Category;",
          clean:
            "SELECT Category,\n" +
            "       SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) AS Completed,\n" +
            "       SUM(CASE WHEN Status = 'cancelled' THEN 1 ELSE 0 END) AS Cancelled,\n" +
            "       ROUND(100.0 * SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS CompletionRate\n" +
            "FROM dbo.Orders2 GROUP BY Category ORDER BY Category;"
        }
      ],
      walkthrough: [
        { step: "Books", note: "completed 2, cancelled 1, total 3 → 100*2/3 = 66.67." },
        { step: "Toys", note: "completed 1, cancelled 2, total 3 → 100*1/3 = 33.33.",
          table: { columns: ["Category","Completed","Cancelled","CompletionRate"],
            rows: [["Books",2,1,66.67],["Toys",1,2,33.33]] } }
      ],
      patternRecognition: [
        "'counts split by status/type plus a rate' → SUM(CASE) columns + NULLIF ratio.",
        "Cross-tab of one categorical against another → conditional aggregation."
      ],
      interviewRecall: [
        "SUM(CASE WHEN … THEN 1 ELSE 0 END) is the portable pivot; COUNT(CASE …) works too (NULL else).",
        "Always cast to decimal and NULLIF the denominator for percentages."
      ],
      commonMistakes: [
        "Integer division making every rate 0.",
        "No NULLIF, so an empty category throws divide-by-zero."
      ]
    },

    {
      id: "piv2-conditional-pivot",
      number: "SL 4404",
      platform: "StudyLab",
      title: "Pivot Revenue by Year into Columns",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg", "Aggregation"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Long-to-wide pivot", sqlConcept: "SUM(CASE WHEN year …)", technique: "Conditional aggregation" },
      descriptionBrief:
        "Given **ProductYearSales(Product, Yr, Revenue)** in long format, pivot it so each product has one row " +
        "with revenue for 2023 and 2024 as separate columns.",
      schema: [
        { name: "ProductYearSales", columns: [
          { name: "Product", type: "VARCHAR(10)" },
          { name: "Yr", type: "INT" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.ProductYearSales','U') IS NOT NULL DROP TABLE dbo.ProductYearSales;\n" +
        "CREATE TABLE dbo.ProductYearSales (Product VARCHAR(10), Yr INT, Revenue INT);\n" +
        "INSERT INTO dbo.ProductYearSales VALUES\n" +
        "  ('X',2023,100),('X',2024,150),('Y',2023,200),('Y',2024,50);",
      sampleData: [
        { table: "ProductYearSales", columns: ["Product","Yr","Revenue"],
          rows: [["X",2023,100],["X",2024,150],["Y",2023,200],["Y",2024,50]] }
      ],
      expectedOutput: { columns: ["Product","Y2023","Y2024"],
        rows: [["X",100,150],["Y",200,50]] },
      approaches: [
        {
          name: "SUM(CASE WHEN Yr = … ) per column (recommended)",
          perfNote: "One grouped scan; more portable and flexible than the PIVOT operator, which needs a fixed value list.",
          dialectNote: "SUM(CASE …) works in every engine. SQL Server's PIVOT operator is an alternative but hard-codes the column values and is less readable.",
          logic:
            "**What it asks.** One row per product with each year's revenue in its own column.\n\n" +
            "**Why the naive idea fails.** Self-joining the table to itself on Product (one alias per year) is brittle and breaks when a product is missing a year.\n\n" +
            "**Key Idea.** `SUM(CASE WHEN Yr = 2023 THEN Revenue END)` collapses each year's rows into a column under a single GROUP BY Product.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. GROUP BY Product.\n" +
            "2. One `SUM(CASE WHEN Yr = <year> THEN Revenue END)` per target year.\n" +
            "3. Alias each as Y2023, Y2024.\n\n" +
            "**Why it works.** CASE isolates each year's rows; SUM aggregates them per product; a missing year naturally yields NULL (or 0 with an ELSE 0).\n\n" +
            "**Common Gotchas.** Hard-coding the wrong year; expecting 0 vs NULL for a missing year (add ELSE 0 if you want 0).\n\n" +
            "**Performance.** Single aggregation — O(n).\n\n" +
            "**Interview mindset.** 'pivot rows into named columns' → SUM(CASE WHEN key = value THEN metric END).",
          tsql:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Yr = 2023 THEN Revenue END) AS Y2023,\n" +
            "       SUM(CASE WHEN Yr = 2024 THEN Revenue END) AS Y2024\n" +
            "FROM dbo.ProductYearSales\n" +
            "GROUP BY Product\n" +
            "ORDER BY Product;",
          clean:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Yr = 2023 THEN Revenue END) AS Y2023,\n" +
            "       SUM(CASE WHEN Yr = 2024 THEN Revenue END) AS Y2024\n" +
            "FROM dbo.ProductYearSales GROUP BY Product ORDER BY Product;"
        }
      ],
      walkthrough: [
        { step: "Group by product, split years", note: "X: 2023→100, 2024→150. Y: 2023→200, 2024→50.",
          table: { columns: ["Product","Y2023","Y2024"], rows: [["X",100,150],["Y",200,50]] } }
      ],
      patternRecognition: [
        "'pivot long rows into named columns (years, months, statuses)' → SUM(CASE WHEN key = value THEN metric END).",
        "Manual self-joins per category → replace with conditional aggregation."
      ],
      interviewRecall: [
        "SUM(CASE …) is the portable pivot; the PIVOT operator hard-codes the value list.",
        "Missing category → NULL by default; add ELSE 0 to get 0."
      ],
      commonMistakes: [
        "Self-joining per year and losing products missing a year.",
        "Forgetting to GROUP BY the non-pivoted key."
      ]
    }

  ]);
})();
