/*
 * data/window_functions.js — Window Functions.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Window Functions", [

    {
      id: "running-total-daily-sales",
      number: "SS 10314",
      platform: "StrataScratch",
      title: "Running Total of Daily Sales",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Running total", sqlConcept: "SUM OVER … ROWS frame", technique: "Cumulative window" },
      descriptionBrief:
        "Given **Sales(SaleDate, Amount)** with one row per day, return each day's amount " +
        "plus a **running (cumulative) total** through that day, ordered by date.",
      schema: [
        { name: "Sales", columns: [
          { name: "SaleDate", type: "DATE", note: "one row per day" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (SaleDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  ('2024-01-01',100),('2024-01-02',50),('2024-01-03',200),('2024-01-04',25);",
      sampleData: [
        { table: "Sales", columns: ["SaleDate","Amount"],
          rows: [["2024-01-01",100],["2024-01-02",50],["2024-01-03",200],["2024-01-04",25]] }
      ],
      expectedOutput: { columns: ["SaleDate","Amount","RunningTotal"],
        rows: [["2024-01-01",100,100],["2024-01-02",50,150],["2024-01-03",200,350],["2024-01-04",25,375]] },
      approaches: [
        {
          name: "SUM() OVER with explicit frame (recommended)",
          perfNote: "One ordered pass; ROWS UNBOUNDED PRECEDING is faster and safer than the default RANGE frame, which can double-count ties and forces an on-disk spool.",
          dialectNote: "Default frame is RANGE UNBOUNDED PRECEDING; state ROWS explicitly for correct, efficient running totals.",
          logic:
            "**What it asks.** A cumulative sum of Amount up to and including each date.\n\n" +
            "**Why the naive idea fails.** A correlated self-join summing all earlier rows is O(n²); and relying on the default window frame (RANGE) can over-count when dates tie and is slower.\n\n" +
            "**Key Idea.** `SUM(Amount) OVER (ORDER BY SaleDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` accumulates as it scans.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order the window by `SaleDate`.\n" +
            "2. Frame it from the start of the partition to the current row with `ROWS`.\n" +
            "3. `SUM(Amount)` over that frame is the running total.\n\n" +
            "**Why it works.** The frame grows one row at a time in date order, so each row sees the sum of itself and all prior rows.\n\n" +
            "**Common Gotchas.** Always specify `ROWS`; the implicit `RANGE` frame includes all peer rows with an equal ORDER BY value and spools to disk.\n\n" +
            "**Performance.** Single sort + streaming window aggregate, O(n log n).\n\n" +
            "**Interview mindset.** 'running / cumulative / to-date' → windowed SUM with an explicit ROWS frame.",
          tsql:
            "SELECT SaleDate, Amount,\n" +
            "       SUM(Amount) OVER (ORDER BY SaleDate\n" +
            "                         ROWS BETWEEN UNBOUNDED PRECEDING\n" +
            "                                  AND CURRENT ROW) AS RunningTotal\n" +
            "FROM dbo.Sales\n" +
            "ORDER BY SaleDate;",
          clean:
            "SELECT SaleDate, Amount,\n" +
            "       SUM(Amount) OVER (ORDER BY SaleDate\n" +
            "                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal\n" +
            "FROM dbo.Sales\n" +
            "ORDER BY SaleDate;"
        }
      ],
      walkthrough: [
        { step: "Accumulate SUM in date order", note: "100 → 150 → 350 → 375.",
          table: { columns: ["SaleDate","Amount","RunningTotal"],
            rows: [["2024-01-01",100,100],["2024-01-02",50,150],["2024-01-03",200,350],["2024-01-04",25,375]] } }
      ],
      patternRecognition: [
        "'running / cumulative / to-date total' → SUM() OVER (ORDER BY … ROWS UNBOUNDED PRECEDING)."
      ],
      interviewRecall: [
        "Specify ROWS, not the default RANGE, for running totals.",
        "PARTITION BY resets the accumulation per group (e.g. per customer)."
      ],
      commonMistakes: [
        "Omitting the frame and getting RANGE's tie-inclusive, slower behavior.",
        "Using an O(n²) self-join instead of a window function."
      ]
    },

    {
      id: "day-over-day-change",
      number: "DL 10084",
      platform: "DataLemur",
      title: "Day-over-Day Sales Change",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Row-to-previous-row", sqlConcept: "LAG()", technique: "Offset window" },
      descriptionBrief:
        "Given **Sales(SaleDate, Amount)**, return each day's amount and the **difference " +
        "from the previous day** (NULL on the first day).",
      schema: [
        { name: "Sales", columns: [
          { name: "SaleDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (SaleDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  ('2024-01-01',100),('2024-01-02',50),('2024-01-03',200),('2024-01-04',25);",
      sampleData: [
        { table: "Sales", columns: ["SaleDate","Amount"],
          rows: [["2024-01-01",100],["2024-01-02",50],["2024-01-03",200],["2024-01-04",25]] }
      ],
      expectedOutput: { columns: ["SaleDate","Amount","DiffFromPrevDay"],
        rows: [["2024-01-01",100,null],["2024-01-02",50,-50],["2024-01-03",200,150],["2024-01-04",25,-175]] },
      approaches: [
        {
          name: "LAG() (recommended)",
          perfNote: "One ordered pass; LAG reads the prior row directly with no self-join. Index on SaleDate supplies the order.",
          dialectNote: "",
          logic:
            "**What it asks.** Each day's change versus the day before.\n\n" +
            "**Why the naive idea fails.** Joining each row to 'the previous date' is awkward and O(n²), and breaks when dates aren't perfectly contiguous.\n\n" +
            "**Key Idea.** `LAG(Amount) OVER (ORDER BY SaleDate)` fetches the previous row's amount in order; subtract it from the current amount.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order the window by `SaleDate`.\n" +
            "2. `LAG(Amount)` gives the prior day's value (NULL for the first).\n" +
            "3. `Amount - LAG(Amount)` is the day-over-day change.\n\n" +
            "**Why it works.** LAG addresses rows by ordered position, so 'previous row' is exact regardless of gaps in the calendar.\n\n" +
            "**Common Gotchas.** The first row's LAG is NULL, so its difference is NULL — expected. Add a PARTITION BY to reset per group.\n\n" +
            "**Performance.** Single sort + streaming offset window, O(n log n).\n\n" +
            "**Interview mindset.** 'compare to previous/next row' → LAG/LEAD, not a self-join.",
          tsql:
            "SELECT SaleDate, Amount,\n" +
            "       Amount - LAG(Amount) OVER (ORDER BY SaleDate) AS DiffFromPrevDay\n" +
            "FROM dbo.Sales\n" +
            "ORDER BY SaleDate;",
          clean:
            "SELECT SaleDate, Amount,\n" +
            "       Amount - LAG(Amount) OVER (ORDER BY SaleDate) AS DiffFromPrevDay\n" +
            "FROM dbo.Sales\n" +
            "ORDER BY SaleDate;"
        }
      ],
      walkthrough: [
        { step: "LAG(Amount) over date order", note: "prev = NULL,100,50,200.",
          table: { columns: ["SaleDate","Amount","PrevAmount"],
            rows: [["2024-01-01",100,null],["2024-01-02",50,100],["2024-01-03",200,50],["2024-01-04",25,200]] } },
        { step: "Amount - PrevAmount",
          table: { columns: ["SaleDate","DiffFromPrevDay"],
            rows: [["2024-01-01",null],["2024-01-02",-50],["2024-01-03",150],["2024-01-04",-175]] } }
      ],
      patternRecognition: [
        "'change vs previous/next period' → LAG / LEAD over an ordered window."
      ],
      interviewRecall: [
        "LAG(col, n, default) reads n rows back; LEAD reads forward.",
        "First-row LAG (and last-row LEAD) is NULL unless you supply a default."
      ],
      commonMistakes: [
        "Self-joining on date ± 1, which breaks across weekends/gaps.",
        "Forgetting PARTITION BY when the change should reset per group."
      ]
    },

    {
      id: "three-day-moving-average",
      number: "SS 10315",
      platform: "StrataScratch",
      title: "3-Day Moving Average of Visits",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Web Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Moving / rolling average", sqlConcept: "AVG OVER … ROWS frame", technique: "Sliding window" },
      descriptionBrief:
        "Given **WebTraffic(VisitDate, Visits)** with one row per day, return each day's visits " +
        "plus a **3-day moving average** (the current day and the two days before it). Early days " +
        "average only the days available so far.",
      schema: [
        { name: "WebTraffic", columns: [
          { name: "VisitDate", type: "DATE", note: "one row per day" },
          { name: "Visits", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.WebTraffic','U') IS NOT NULL DROP TABLE dbo.WebTraffic;\n" +
        "CREATE TABLE dbo.WebTraffic (VisitDate DATE, Visits INT);\n" +
        "INSERT INTO dbo.WebTraffic VALUES\n" +
        "  ('2024-03-01',100),('2024-03-02',140),('2024-03-03',120),\n" +
        "  ('2024-03-04',160),('2024-03-05',200);",
      sampleData: [
        { table: "WebTraffic", columns: ["VisitDate","Visits"],
          rows: [["2024-03-01",100],["2024-03-02",140],["2024-03-03",120],["2024-03-04",160],["2024-03-05",200]] }
      ],
      expectedOutput: { columns: ["VisitDate","Visits","MovingAvg3"],
        rows: [["2024-03-01",100,"100.00"],["2024-03-02",140,"120.00"],["2024-03-03",120,"120.00"],["2024-03-04",160,"140.00"],["2024-03-05",200,"160.00"]] },
      approaches: [
        {
          name: "AVG() OVER with ROWS 2 PRECEDING (recommended)",
          perfNote: "One ordered streaming pass; a fixed-width ROWS frame slides without re-scanning. Cast to DECIMAL so integer division doesn't truncate the average.",
          dialectNote: "AVG over an INT column returns INT in T-SQL — cast the input to DECIMAL to keep the fractional part.",
          logic:
            "**What it asks.** A rolling mean over the current day and the previous two days.\n\n" +
            "**Why the naive idea fails.** A self-join gathering 'this day and the two before' is O(n²) and clumsy across calendar gaps; and `AVG(Visits)` on an INT column silently floors the result via integer division.\n\n" +
            "**Key Idea.** `AVG(CAST(Visits AS DECIMAL)) OVER (ORDER BY VisitDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` averages a sliding 3-row window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order the window by `VisitDate`.\n" +
            "2. Frame it as `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` — a fixed 3-row window.\n" +
            "3. Cast `Visits` to `DECIMAL(10,2)` inside `AVG` so the mean keeps decimals.\n" +
            "4. Early rows average only what exists (1 or 2 rows) — the frame simply has fewer rows.\n\n" +
            "**Why it works.** The ROWS frame counts physical rows, so it always spans at most three consecutive days and slides forward one row at a time.\n\n" +
            "**Common Gotchas.** Use `ROWS`, not `RANGE`: RANGE would pull in date peers and mis-size the window. Cast to DECIMAL or the average truncates.\n\n" +
            "**Performance.** Single sort + streaming window, O(n log n); an index on `VisitDate` supplies the order.\n\n" +
            "**Interview mindset.** 'moving / rolling / N-period average' → windowed AVG with a bounded ROWS frame.",
          tsql:
            "SELECT VisitDate, Visits,\n" +
            "       CAST(AVG(CAST(Visits AS DECIMAL(10,2))) OVER (\n" +
            "                ORDER BY VisitDate\n" +
            "                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS DECIMAL(10,2)) AS MovingAvg3\n" +
            "FROM dbo.WebTraffic\n" +
            "ORDER BY VisitDate;",
          clean:
            "SELECT VisitDate, Visits,\n" +
            "       CAST(AVG(CAST(Visits AS DECIMAL(10,2))) OVER (\n" +
            "                ORDER BY VisitDate\n" +
            "                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS DECIMAL(10,2)) AS MovingAvg3\n" +
            "FROM dbo.WebTraffic\n" +
            "ORDER BY VisitDate;"
        }
      ],
      walkthrough: [
        { step: "Slide a 3-row window in date order", note: "Frames: [100], [100,140], [100,140,120], [140,120,160], [120,160,200].",
          table: { columns: ["VisitDate","Visits","MovingAvg3"],
            rows: [["2024-03-01",100,"100.00"],["2024-03-02",140,"120.00"],["2024-03-03",120,"120.00"],["2024-03-04",160,"140.00"],["2024-03-05",200,"160.00"]] } }
      ],
      patternRecognition: [
        "'moving / rolling / trailing N-period average' → AVG() OVER (ORDER BY … ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW)."
      ],
      interviewRecall: [
        "A bounded ROWS frame (n PRECEDING) gives a fixed-width sliding window; UNBOUNDED PRECEDING gives a growing one.",
        "AVG over INT truncates in T-SQL — cast to DECIMAL first."
      ],
      commonMistakes: [
        "Leaving the frame implicit (RANGE) and mis-sizing the window on tied/duplicate order keys.",
        "Averaging an INT column and losing the fractional part to integer division."
      ]
    },

    {
      id: "percent-of-region-total",
      number: "DL 10088",
      platform: "DataLemur",
      title: "Percent of Region Total",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Share of total", sqlConcept: "SUM OVER (PARTITION BY)", technique: "Whole-partition denominator" },
      descriptionBrief:
        "Given **RegionSales(Region, Product, Revenue)**, return each row with the product's " +
        "**percent share of its region's total revenue**, rounded to two decimals.",
      schema: [
        { name: "RegionSales", columns: [
          { name: "Region", type: "VARCHAR(20)" },
          { name: "Product", type: "VARCHAR(20)" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.RegionSales','U') IS NOT NULL DROP TABLE dbo.RegionSales;\n" +
        "CREATE TABLE dbo.RegionSales (Region VARCHAR(20), Product VARCHAR(20), Revenue INT);\n" +
        "INSERT INTO dbo.RegionSales VALUES\n" +
        "  ('East','Widget',300),('East','Gadget',100),('East','Gizmo',100),\n" +
        "  ('West','Widget',150),('West','Gadget',50);",
      sampleData: [
        { table: "RegionSales", columns: ["Region","Product","Revenue"],
          rows: [["East","Widget",300],["East","Gadget",100],["East","Gizmo",100],["West","Widget",150],["West","Gadget",50]] }
      ],
      expectedOutput: { columns: ["Region","Product","Revenue","PctOfRegion"],
        rows: [["East","Widget",300,"60.00"],["East","Gadget",100,"20.00"],["East","Gizmo",100,"20.00"],["West","Widget",150,"75.00"],["West","Gadget",50,"25.00"]] },
      approaches: [
        {
          name: "SUM() OVER (PARTITION BY) denominator (recommended)",
          perfNote: "One pass computes each region's total alongside every row — no GROUP BY, no join back. The window keeps row-level detail while supplying the group total.",
          dialectNote: "Multiply by 100.0 (a decimal literal) before dividing so the ratio isn't computed in integer arithmetic.",
          logic:
            "**What it asks.** Each product's revenue as a percentage of its own region's total.\n\n" +
            "**Why the naive idea fails.** `GROUP BY Region` collapses the detail rows you still need; you'd then have to join the aggregate back. And `Revenue / SUM(...)` in integers yields 0 before you scale.\n\n" +
            "**Key Idea.** `SUM(Revenue) OVER (PARTITION BY Region)` returns the region total *on every detail row*, so `100.0 * Revenue / that` is the share without collapsing rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `SUM(Revenue) OVER (PARTITION BY Region)` — the whole-partition total (no ORDER BY, so the frame is the entire partition).\n" +
            "2. Divide `100.0 * Revenue` by that total.\n" +
            "3. `CAST` / round to `DECIMAL(5,2)` for a clean percentage.\n\n" +
            "**Why it works.** An un-ordered PARTITION BY window aggregates across the full partition, giving every row its group denominator while preserving row-level output.\n\n" +
            "**Common Gotchas.** Scale by `100.0` (decimal), not `100` (int), or integer division floors small shares to 0. Beware divide-by-zero if a region total could be 0.\n\n" +
            "**Performance.** Single hash/sort segment per region + streaming aggregate, O(n log n) — cheaper than aggregate-then-join.\n\n" +
            "**Interview mindset.** 'share / percent of total' → the numerator is the row, the denominator is a windowed SUM over the group.",
          tsql:
            "SELECT Region, Product, Revenue,\n" +
            "       CAST(100.0 * Revenue\n" +
            "            / SUM(Revenue) OVER (PARTITION BY Region) AS DECIMAL(5,2)) AS PctOfRegion\n" +
            "FROM dbo.RegionSales\n" +
            "ORDER BY Region, Revenue DESC, Product;",
          clean:
            "SELECT Region, Product, Revenue,\n" +
            "       CAST(100.0 * Revenue\n" +
            "            / SUM(Revenue) OVER (PARTITION BY Region) AS DECIMAL(5,2)) AS PctOfRegion\n" +
            "FROM dbo.RegionSales\n" +
            "ORDER BY Region, Revenue DESC, Product;"
        },
        {
          name: "Aggregate CTE + join back",
          perfNote: "Explicit and portable, but computes the totals separately and re-joins — two passes plus a join versus the window's single pass.",
          dialectNote: "",
          logic:
            "**Key Idea.** Pre-compute each region's total in a grouped CTE, then join it back to the detail rows to form the ratio.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Totals`: `SELECT Region, SUM(Revenue) AS RegionTotal FROM RegionSales GROUP BY Region`.\n" +
            "2. Join the detail table to `Totals` on `Region`.\n" +
            "3. Compute `100.0 * Revenue / RegionTotal` and round.\n\n" +
            "**Why it works.** The join re-attaches the group total to each detail row, reproducing what the window did inline.\n\n" +
            "**Common Gotchas.** Same decimal-scaling rule; make sure the join key matches the partition key exactly.\n\n" +
            "**Performance.** A GROUP BY aggregate plus a join — more work than one windowed pass, but easy to reason about.\n\n" +
            "**Interview mindset.** A good 'without window functions' fallback that proves you understand what SUM() OVER is doing under the hood.",
          tsql:
            "WITH Totals AS (\n" +
            "    SELECT Region, SUM(Revenue) AS RegionTotal\n" +
            "    FROM dbo.RegionSales\n" +
            "    GROUP BY Region\n" +
            ")\n" +
            "SELECT s.Region, s.Product, s.Revenue,\n" +
            "       CAST(100.0 * s.Revenue / t.RegionTotal AS DECIMAL(5,2)) AS PctOfRegion\n" +
            "FROM dbo.RegionSales s\n" +
            "JOIN Totals t ON t.Region = s.Region\n" +
            "ORDER BY s.Region, s.Revenue DESC, s.Product;",
          clean:
            "WITH Totals AS (\n" +
            "    SELECT Region, SUM(Revenue) AS RegionTotal\n" +
            "    FROM dbo.RegionSales\n" +
            "    GROUP BY Region\n" +
            ")\n" +
            "SELECT s.Region, s.Product, s.Revenue,\n" +
            "       CAST(100.0 * s.Revenue / t.RegionTotal AS DECIMAL(5,2)) AS PctOfRegion\n" +
            "FROM dbo.RegionSales s\n" +
            "JOIN Totals t ON t.Region = s.Region\n" +
            "ORDER BY s.Region, s.Revenue DESC, s.Product;"
        }
      ],
      walkthrough: [
        { step: "Region total on every row", note: "East total 500, West total 200 (via SUM OVER PARTITION BY Region).",
          table: { columns: ["Region","Product","Revenue","RegionTotal"],
            rows: [["East","Widget",300,500],["East","Gadget",100,500],["East","Gizmo",100,500],["West","Widget",150,200],["West","Gadget",50,200]] } },
        { step: "100.0 * Revenue / RegionTotal", note: "East: 60/20/20. West: 75/25.",
          table: { columns: ["Region","Product","PctOfRegion"],
            rows: [["East","Widget","60.00"],["East","Gadget","20.00"],["East","Gizmo","20.00"],["West","Widget","75.00"],["West","Gadget","25.00"]] } }
      ],
      patternRecognition: [
        "'percent / share of total' → SUM(x) OVER (PARTITION BY group) as the denominator, row value as the numerator.",
        "Need row detail AND a group total together → window aggregate, not GROUP BY."
      ],
      interviewRecall: [
        "A PARTITION BY window with no ORDER BY aggregates the entire partition on every row.",
        "Scale by a decimal literal (100.0) before integer division floors the ratio."
      ],
      commonMistakes: [
        "Using GROUP BY and losing the per-product detail rows.",
        "Integer division: 100 * Revenue / Total done in INT truncates small shares to 0."
      ]
    },

    {
      id: "dept-salary-high-low",
      number: "SS 10316",
      platform: "StrataScratch",
      title: "Highest and Lowest Salary per Department",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Partition endpoints", sqlConcept: "FIRST_VALUE / LAST_VALUE", technique: "Framed boundary values" },
      descriptionBrief:
        "Given **Employees(Name, Dept, Salary)**, return each employee alongside the **highest and " +
        "lowest salary in their department** on the same row.",
      schema: [
        { name: "Employees", columns: [
          { name: "Name", type: "VARCHAR(20)" },
          { name: "Dept", type: "VARCHAR(20)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (Name VARCHAR(20), Dept VARCHAR(20), Salary INT);\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  ('Alice','Sales',5000),('Bob','Sales',7000),('Cara','Sales',6000),\n" +
        "  ('Dan','Eng',9000),('Eve','Eng',8000);",
      sampleData: [
        { table: "Employees", columns: ["Name","Dept","Salary"],
          rows: [["Alice","Sales",5000],["Bob","Sales",7000],["Cara","Sales",6000],["Dan","Eng",9000],["Eve","Eng",8000]] }
      ],
      expectedOutput: { columns: ["Name","Dept","Salary","DeptMax","DeptMin"],
        rows: [["Dan","Eng",9000,9000,8000],["Eve","Eng",8000,9000,8000],["Bob","Sales",7000,7000,5000],["Cara","Sales",6000,7000,5000],["Alice","Sales",5000,7000,5000]] },
      approaches: [
        {
          name: "FIRST_VALUE / LAST_VALUE with full frame (recommended)",
          perfNote: "One partitioned ordered pass returns both endpoints. LAST_VALUE needs an explicit full frame or it stops at the current row and returns the wrong value.",
          dialectNote: "The default frame is RANGE UNBOUNDED PRECEDING AND CURRENT ROW — LAST_VALUE then equals the current row. Widen it to UNBOUNDED FOLLOWING.",
          logic:
            "**What it asks.** Each employee's row plus the max and min salary of their department.\n\n" +
            "**Why the naive idea fails.** `LAST_VALUE(Salary) OVER (PARTITION BY Dept ORDER BY Salary DESC)` with the *default* frame only sees up to the current row, so it returns the current salary — not the department minimum.\n\n" +
            "**Key Idea.** Order each department's rows by salary and read the two boundary rows: `FIRST_VALUE` is the top, `LAST_VALUE` is the bottom — but only if the frame spans the whole partition.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `PARTITION BY Dept ORDER BY Salary DESC`.\n" +
            "2. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` so both functions see the entire partition.\n" +
            "3. `FIRST_VALUE(Salary)` = highest; `LAST_VALUE(Salary)` = lowest.\n\n" +
            "**Why it works.** With a full frame, the first framed row is the department's top salary and the last framed row is its bottom, on every row of the partition.\n\n" +
            "**Common Gotchas.** Forgetting the explicit frame is the classic LAST_VALUE bug. Equivalently, use `MAX()`/`MIN()` OVER (PARTITION BY Dept), which need no frame.\n\n" +
            "**Performance.** One segment/sort per department + streaming window, O(n log n).\n\n" +
            "**Interview mindset.** Reach for FIRST_VALUE/LAST_VALUE for 'the value at the edge of an ordered group' — and always state the frame for LAST_VALUE.",
          tsql:
            "SELECT Name, Dept, Salary,\n" +
            "       FIRST_VALUE(Salary) OVER (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS DeptMax,\n" +
            "       LAST_VALUE(Salary)  OVER (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS DeptMin\n" +
            "FROM dbo.Employees\n" +
            "ORDER BY Dept, Salary DESC;",
          clean:
            "SELECT Name, Dept, Salary,\n" +
            "       FIRST_VALUE(Salary) OVER (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS DeptMax,\n" +
            "       LAST_VALUE(Salary)  OVER (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS DeptMin\n" +
            "FROM dbo.Employees\n" +
            "ORDER BY Dept, Salary DESC;"
        },
        {
          name: "MAX()/MIN() OVER (PARTITION BY)",
          perfNote: "Simplest and frame-free: partitioned MAX/MIN need no ORDER BY or frame and are hard to get subtly wrong.",
          dialectNote: "",
          logic:
            "**Key Idea.** The department max and min are just `MAX(Salary)` and `MIN(Salary)` over the partition — no ordering or frame required.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `MAX(Salary) OVER (PARTITION BY Dept)` as DeptMax.\n" +
            "2. `MIN(Salary) OVER (PARTITION BY Dept)` as DeptMin.\n" +
            "3. Project alongside each detail row.\n\n" +
            "**Why it works.** An un-ordered PARTITION BY window covers the whole group, so MAX/MIN see every salary in the department.\n\n" +
            "**Common Gotchas.** None of the LAST_VALUE frame trap here — that's the point. Add ORDER BY only in the final SELECT for display.\n\n" +
            "**Performance.** Equivalent single partitioned pass; often the planner's preferred form.\n\n" +
            "**Interview mindset.** If you only need the extreme value (not the row at the edge), MAX/MIN OVER is cleaner than FIRST_VALUE/LAST_VALUE.",
          tsql:
            "SELECT Name, Dept, Salary,\n" +
            "       MAX(Salary) OVER (PARTITION BY Dept) AS DeptMax,\n" +
            "       MIN(Salary) OVER (PARTITION BY Dept) AS DeptMin\n" +
            "FROM dbo.Employees\n" +
            "ORDER BY Dept, Salary DESC;",
          clean:
            "SELECT Name, Dept, Salary,\n" +
            "       MAX(Salary) OVER (PARTITION BY Dept) AS DeptMax,\n" +
            "       MIN(Salary) OVER (PARTITION BY Dept) AS DeptMin\n" +
            "FROM dbo.Employees\n" +
            "ORDER BY Dept, Salary DESC;"
        }
      ],
      walkthrough: [
        { step: "Order each department by Salary DESC", note: "Eng: Dan 9000, Eve 8000. Sales: Bob 7000, Cara 6000, Alice 5000.",
          table: { columns: ["Dept","Name","Salary"],
            rows: [["Eng","Dan",9000],["Eng","Eve",8000],["Sales","Bob",7000],["Sales","Cara",6000],["Sales","Alice",5000]] } },
        { step: "FIRST_VALUE / LAST_VALUE over the full frame", note: "Eng edges 9000/8000; Sales edges 7000/5000 — same on every row of the group.",
          table: { columns: ["Name","Dept","Salary","DeptMax","DeptMin"],
            rows: [["Dan","Eng",9000,9000,8000],["Eve","Eng",8000,9000,8000],["Bob","Sales",7000,7000,5000],["Cara","Sales",6000,7000,5000],["Alice","Sales",5000,7000,5000]] } }
      ],
      patternRecognition: [
        "'the first / last value of an ordered group' → FIRST_VALUE / LAST_VALUE with an explicit frame.",
        "'just the extreme value of a group' → MAX / MIN OVER (PARTITION BY …)."
      ],
      interviewRecall: [
        "LAST_VALUE with the default frame returns the current row — always widen to UNBOUNDED FOLLOWING.",
        "FIRST_VALUE/LAST_VALUE return a row's value at a frame edge; MAX/MIN aggregate the whole partition."
      ],
      commonMistakes: [
        "Omitting the frame on LAST_VALUE and getting the current row's salary as the 'minimum'.",
        "Adding ORDER BY to MAX/MIN OVER and unintentionally turning it into a running aggregate with the default frame."
      ]
    },

    {
      id: "days-until-next-login",
      number: "DL 10091",
      platform: "DataLemur",
      title: "Days Until Next Login",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Product Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Row-to-next-row gap", sqlConcept: "LEAD()", technique: "Forward offset window" },
      descriptionBrief:
        "Given **Logins(UserId, LoginDate)**, for each login return the **next login date** for that " +
        "user and the **number of days until it**. The most recent login per user has no next login " +
        "(NULL).",
      schema: [
        { name: "Logins", columns: [
          { name: "UserId", type: "INT" },
          { name: "LoginDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Logins','U') IS NOT NULL DROP TABLE dbo.Logins;\n" +
        "CREATE TABLE dbo.Logins (UserId INT, LoginDate DATE);\n" +
        "INSERT INTO dbo.Logins VALUES\n" +
        "  (1,'2024-01-01'),(1,'2024-01-05'),(1,'2024-01-08'),\n" +
        "  (2,'2024-01-02'),(2,'2024-01-10');",
      sampleData: [
        { table: "Logins", columns: ["UserId","LoginDate"],
          rows: [[1,"2024-01-01"],[1,"2024-01-05"],[1,"2024-01-08"],[2,"2024-01-02"],[2,"2024-01-10"]] }
      ],
      expectedOutput: { columns: ["UserId","LoginDate","NextLoginDate","DaysUntilNext"],
        rows: [[1,"2024-01-01","2024-01-05",4],[1,"2024-01-05","2024-01-08",3],[1,"2024-01-08",null,null],[2,"2024-01-02","2024-01-10",8],[2,"2024-01-10",null,null]] },
      approaches: [
        {
          name: "LEAD() (recommended)",
          perfNote: "One partitioned ordered pass reads the next row directly — no self-join. Index on (UserId, LoginDate) supplies the order.",
          dialectNote: "",
          logic:
            "**What it asks.** For each login, the user's following login and the day gap to it.\n\n" +
            "**Why the naive idea fails.** Correlating each row to 'the minimum login date greater than this one for the same user' is an O(n²) self-join and awkward to write.\n\n" +
            "**Key Idea.** `LEAD(LoginDate) OVER (PARTITION BY UserId ORDER BY LoginDate)` returns the next login in order; `DATEDIFF(day, LoginDate, next)` is the gap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Partition by `UserId` and order by `LoginDate`.\n" +
            "2. `LEAD(LoginDate)` gives the next row's date (NULL for each user's last login).\n" +
            "3. `DATEDIFF(day, LoginDate, LEAD(...))` is the days until the next login.\n\n" +
            "**Why it works.** LEAD addresses rows by ordered position within each user, so 'next login' is exact even with irregular gaps.\n\n" +
            "**Common Gotchas.** PARTITION BY UserId is essential — without it LEAD crosses user boundaries. The last row per user is NULL, so its diff is NULL.\n\n" +
            "**Performance.** Single sort per partition + streaming offset window, O(n log n).\n\n" +
            "**Interview mindset.** 'next event / time to next' → LEAD; 'previous event / time since last' → LAG.",
          tsql:
            "SELECT UserId, LoginDate,\n" +
            "       LEAD(LoginDate) OVER (PARTITION BY UserId ORDER BY LoginDate) AS NextLoginDate,\n" +
            "       DATEDIFF(day, LoginDate,\n" +
            "                LEAD(LoginDate) OVER (PARTITION BY UserId ORDER BY LoginDate)) AS DaysUntilNext\n" +
            "FROM dbo.Logins\n" +
            "ORDER BY UserId, LoginDate;",
          clean:
            "SELECT UserId, LoginDate,\n" +
            "       LEAD(LoginDate) OVER (PARTITION BY UserId ORDER BY LoginDate) AS NextLoginDate,\n" +
            "       DATEDIFF(day, LoginDate,\n" +
            "                LEAD(LoginDate) OVER (PARTITION BY UserId ORDER BY LoginDate)) AS DaysUntilNext\n" +
            "FROM dbo.Logins\n" +
            "ORDER BY UserId, LoginDate;"
        }
      ],
      walkthrough: [
        { step: "LEAD(LoginDate) within each user", note: "User 1: 01-05, 01-08, NULL. User 2: 01-10, NULL.",
          table: { columns: ["UserId","LoginDate","NextLoginDate"],
            rows: [[1,"2024-01-01","2024-01-05"],[1,"2024-01-05","2024-01-08"],[1,"2024-01-08",null],[2,"2024-01-02","2024-01-10"],[2,"2024-01-10",null]] } },
        { step: "DATEDIFF(day, LoginDate, NextLoginDate)", note: "4, 3, NULL, 8, NULL.",
          table: { columns: ["UserId","LoginDate","DaysUntilNext"],
            rows: [[1,"2024-01-01",4],[1,"2024-01-05",3],[1,"2024-01-08",null],[2,"2024-01-02",8],[2,"2024-01-10",null]] } }
      ],
      patternRecognition: [
        "'next event / gap to next occurrence' → LEAD over a partitioned ordered window.",
        "'time since previous event' → LAG (the mirror image)."
      ],
      interviewRecall: [
        "LEAD(col, n, default) reads n rows forward; the last row(s) of a partition return the default (NULL).",
        "DATEDIFF(day, start, end) is end minus start — order the arguments accordingly."
      ],
      commonMistakes: [
        "Dropping PARTITION BY so LEAD pulls the next user's first login.",
        "Reversing DATEDIFF arguments and getting negative day counts."
      ]
    },

    {
      id: "score-quartiles-ntile",
      number: "HR 10122",
      platform: "HackerRank",
      title: "Split Scores into Quartiles",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Education Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Bucketing / tiling", sqlConcept: "NTILE()", technique: "Equal-size partitions" },
      descriptionBrief:
        "Given **Students(Name, Score)**, assign each student to a **quartile (1–4)** by score, with " +
        "**quartile 1 being the highest** scores. Split the rows into four groups as evenly as possible.",
      schema: [
        { name: "Students", columns: [
          { name: "Name", type: "VARCHAR(20)" },
          { name: "Score", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Students','U') IS NOT NULL DROP TABLE dbo.Students;\n" +
        "CREATE TABLE dbo.Students (Name VARCHAR(20), Score INT);\n" +
        "INSERT INTO dbo.Students VALUES\n" +
        "  ('A',95),('B',90),('C',85),('D',80),\n" +
        "  ('E',75),('F',70),('G',65),('H',60);",
      sampleData: [
        { table: "Students", columns: ["Name","Score"],
          rows: [["A",95],["B",90],["C",85],["D",80],["E",75],["F",70],["G",65],["H",60]] }
      ],
      expectedOutput: { columns: ["Name","Score","Quartile"],
        rows: [["A",95,1],["B",90,1],["C",85,2],["D",80,2],["E",75,3],["F",70,3],["G",65,4],["H",60,4]] },
      approaches: [
        {
          name: "NTILE(4) (recommended)",
          perfNote: "One ordered pass distributes rows into four near-equal buckets; NTILE handles uneven counts by making the earliest buckets one row larger.",
          dialectNote: "",
          logic:
            "**What it asks.** Divide students into four equal-size groups ranked by score, top scores in quartile 1.\n\n" +
            "**Why the naive idea fails.** Hand-computing cutoffs (score >= X → Q1, …) is brittle and doesn't stay balanced as the data changes; RANK/DENSE_RANK number individuals, not fixed-size groups.\n\n" +
            "**Key Idea.** `NTILE(4) OVER (ORDER BY Score DESC)` splits the ordered rows into four consecutive buckets of as-equal-as-possible size.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order all rows by `Score DESC` so the highest scores come first.\n" +
            "2. `NTILE(4)` labels them 1..4 across the ordered set.\n" +
            "3. Bucket 1 holds the top quarter, bucket 4 the bottom quarter.\n\n" +
            "**Why it works.** NTILE divides N rows into the requested number of tiles; with 8 rows and 4 tiles each tile gets exactly 2. When N isn't divisible, the first (N mod tiles) tiles get one extra row.\n\n" +
            "**Common Gotchas.** NTILE ignores value ties — two equal scores can straddle a bucket boundary, since it counts rows, not distinct values. Order direction sets which end is bucket 1.\n\n" +
            "**Performance.** Single sort + streaming assignment, O(n log n); an index on `Score` supplies the order.\n\n" +
            "**Interview mindset.** 'quartiles / deciles / percentile buckets / N equal groups' → NTILE(N).",
          tsql:
            "SELECT Name, Score,\n" +
            "       NTILE(4) OVER (ORDER BY Score DESC) AS Quartile\n" +
            "FROM dbo.Students\n" +
            "ORDER BY Score DESC;",
          clean:
            "SELECT Name, Score,\n" +
            "       NTILE(4) OVER (ORDER BY Score DESC) AS Quartile\n" +
            "FROM dbo.Students\n" +
            "ORDER BY Score DESC;"
        }
      ],
      walkthrough: [
        { step: "NTILE(4) over Score DESC", note: "8 rows / 4 tiles = 2 per bucket: {A,B}=1, {C,D}=2, {E,F}=3, {G,H}=4.",
          table: { columns: ["Name","Score","Quartile"],
            rows: [["A",95,1],["B",90,1],["C",85,2],["D",80,2],["E",75,3],["F",70,3],["G",65,4],["H",60,4]] } }
      ],
      patternRecognition: [
        "'divide into N equal groups / quartiles / deciles / percentile bands' → NTILE(N).",
        "Highest-first buckets → ORDER BY the measure DESC inside NTILE."
      ],
      interviewRecall: [
        "NTILE(n) makes n near-equal buckets; when rows don't divide evenly the earliest buckets take the extra rows.",
        "NTILE counts rows, not values — equal values can land in different buckets."
      ],
      commonMistakes: [
        "Confusing NTILE with RANK/DENSE_RANK — those number rows, they don't form fixed-size groups.",
        "Ordering ascending when the task wants the top scores in bucket 1."
      ]
    }

  ]);
})();
