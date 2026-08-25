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
    }

  ]);
})();
