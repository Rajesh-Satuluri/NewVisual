/*
 * data/sql/window_extra.js — Window Functions (fold-in: advanced patterns).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * NTILE, PERCENT_RANK/CUME_DIST, FIRST/LAST_VALUE frames, moving averages,
 * top-N-with-ties, and PERCENTILE_CONT medians.
 */
(function () {
  window.SQLLAB.register("Window Functions", [

    {
      id: "winx-ntile-quartiles",
      number: "SL 4201",
      platform: "StudyLab",
      title: "Bucket Salaries into Quartiles with NTILE",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["HR Analytics"],
      link: "",
      meta: { pattern: "Equal-size bucketing", sqlConcept: "NTILE(n)", technique: "Distribution window" },
      descriptionBrief:
        "Given **Salaries(EmpId, Salary)**, split employees into **4 quartiles** by salary (lowest quartile = 1) " +
        "so each bucket holds roughly the same number of employees.",
      schema: [
        { name: "Salaries", columns: [
          { name: "EmpId", type: "INT" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Salaries','U') IS NOT NULL DROP TABLE dbo.Salaries;\n" +
        "CREATE TABLE dbo.Salaries (EmpId INT, Salary INT);\n" +
        "INSERT INTO dbo.Salaries VALUES\n" +
        "  (1,50000),(2,60000),(3,70000),(4,80000),(5,90000),(6,100000),(7,110000),(8,120000);",
      sampleData: [
        { table: "Salaries", columns: ["EmpId","Salary"],
          rows: [[1,50000],[2,60000],[3,70000],[4,80000],[5,90000],[6,100000],[7,110000],[8,120000]] }
      ],
      expectedOutput: { columns: ["EmpId","Salary","Quartile"],
        rows: [[1,50000,1],[2,60000,1],[3,70000,2],[4,80000,2],[5,90000,3],[6,100000,3],[7,110000,4],[8,120000,4]] },
      approaches: [
        {
          name: "NTILE(4) OVER (ORDER BY Salary) (recommended)",
          perfNote: "One ordered pass; NTILE distributes remainder rows to the earliest buckets.",
          dialectNote: "NTILE is ANSI-standard and identical in SQL Server, Postgres, MySQL 8+, and Oracle.",
          logic:
            "**What it asks.** Assign each employee a 1–4 quartile label by ascending salary, keeping buckets balanced.\n\n" +
            "**Why the naive idea fails.** Hand-computing cut points with MIN/MAX and CASE bands buckets by *value range*, not by *count*, so a skewed distribution fills buckets unevenly.\n\n" +
            "**Key Idea.** `NTILE(4) OVER (ORDER BY Salary)` divides the ordered rows into 4 near-equal groups.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order all rows by Salary ascending.\n" +
            "2. `NTILE(4)` labels the first quarter 1, next 2, and so on.\n" +
            "3. With 8 rows, each quartile gets exactly 2.\n\n" +
            "**Why it works.** NTILE counts rows, not values, so bucket sizes stay balanced regardless of the value spread.\n\n" +
            "**Common Gotchas.** Confusing NTILE (equal counts) with width_bucket / CASE bands (equal ranges); when rows don't divide evenly, earlier buckets get the extra row.\n\n" +
            "**Performance.** Single sort — O(n log n).\n\n" +
            "**Interview mindset.** 'quartiles / deciles / equal-size groups' → NTILE(n).",
          tsql:
            "SELECT EmpId, Salary,\n" +
            "       NTILE(4) OVER (ORDER BY Salary) AS Quartile\n" +
            "FROM dbo.Salaries\n" +
            "ORDER BY Salary;",
          clean:
            "SELECT EmpId, Salary,\n" +
            "       NTILE(4) OVER (ORDER BY Salary) AS Quartile\n" +
            "FROM dbo.Salaries\n" +
            "ORDER BY Salary;"
        }
      ],
      walkthrough: [
        { step: "Order by salary, split into 4", note: "8 rows / 4 = 2 per quartile.",
          table: { columns: ["EmpId","Salary","Quartile"],
            rows: [[1,50000,1],[2,60000,1],[3,70000,2],[4,80000,2],[5,90000,3],[6,100000,3],[7,110000,4],[8,120000,4]] } }
      ],
      patternRecognition: [
        "'quartile / decile / percentile bucket / equal-size groups' → NTILE(n) OVER (ORDER BY …).",
        "Balancing by row count, not value range → NTILE, not CASE bands."
      ],
      interviewRecall: [
        "NTILE makes equal-count buckets; extra rows go to the earliest buckets.",
        "PARTITION BY reruns the bucketing within each group."
      ],
      commonMistakes: [
        "Using CASE value bands and getting unbalanced buckets.",
        "Assuming buckets are always exactly equal even when the row count isn't divisible."
      ]
    },

    {
      id: "winx-percent-rank-cume-dist",
      number: "SL 4202",
      platform: "StudyLab",
      title: "PERCENT_RANK and CUME_DIST of Test Scores",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["EdTech"],
      link: "",
      meta: { pattern: "Relative standing", sqlConcept: "PERCENT_RANK / CUME_DIST", technique: "Distribution window" },
      descriptionBrief:
        "Given **Scores(StudentId, Score)**, return each student's **PERCENT_RANK** (relative rank from 0 to 1) " +
        "and **CUME_DIST** (cumulative distribution — fraction of rows at or below this score).",
      schema: [
        { name: "Scores", columns: [
          { name: "StudentId", type: "INT" },
          { name: "Score", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Scores','U') IS NOT NULL DROP TABLE dbo.Scores;\n" +
        "CREATE TABLE dbo.Scores (StudentId INT, Score INT);\n" +
        "INSERT INTO dbo.Scores VALUES (1,60),(2,70),(3,80),(4,90),(5,100);",
      sampleData: [
        { table: "Scores", columns: ["StudentId","Score"],
          rows: [[1,60],[2,70],[3,80],[4,90],[5,100]] }
      ],
      expectedOutput: { columns: ["StudentId","Score","PctRank","CumeDist"],
        rows: [[1,60,0.00,0.20],[2,70,0.25,0.40],[3,80,0.50,0.60],[4,90,0.75,0.80],[5,100,1.00,1.00]] },
      approaches: [
        {
          name: "PERCENT_RANK() and CUME_DIST() (recommended)",
          perfNote: "Both computed from one ordered window pass.",
          dialectNote: "Both are ANSI-standard analytic functions in SQL Server, Postgres, and Oracle; MySQL added them in 8.0.",
          logic:
            "**What it asks.** Each student's relative standing on two standard scales.\n\n" +
            "**Why the naive idea fails.** Manually computing (rank-1)/(n-1) and count-below/n with subqueries is verbose and error-prone on ties.\n\n" +
            "**Key Idea.** `PERCENT_RANK() = (rank - 1) / (rows - 1)`; `CUME_DIST() = (# rows ≤ current) / rows`. Both are built-in.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order the window by Score.\n" +
            "2. `PERCENT_RANK()` gives 0 for the minimum and 1 for the maximum.\n" +
            "3. `CUME_DIST()` gives the fraction of the set at or below each score.\n\n" +
            "**Why it works.** The engine derives rank and running counts internally, applying consistent tie rules.\n\n" +
            "**Common Gotchas.** Mixing up the two: PERCENT_RANK's min is always 0; CUME_DIST's min is 1/n and its max is always 1.\n\n" +
            "**Performance.** Single sort + streaming — O(n log n).\n\n" +
            "**Interview mindset.** 'percentile standing / where does this value sit' → PERCENT_RANK or CUME_DIST.",
          tsql:
            "SELECT StudentId, Score,\n" +
            "       ROUND(PERCENT_RANK() OVER (ORDER BY Score), 2) AS PctRank,\n" +
            "       ROUND(CUME_DIST()   OVER (ORDER BY Score), 2) AS CumeDist\n" +
            "FROM dbo.Scores\n" +
            "ORDER BY Score;",
          clean:
            "SELECT StudentId, Score,\n" +
            "       ROUND(PERCENT_RANK() OVER (ORDER BY Score), 2) AS PctRank,\n" +
            "       ROUND(CUME_DIST() OVER (ORDER BY Score), 2) AS CumeDist\n" +
            "FROM dbo.Scores\n" +
            "ORDER BY Score;"
        }
      ],
      walkthrough: [
        { step: "PERCENT_RANK = (rank-1)/(n-1)", note: "n=5: scores 60..100 → 0, .25, .5, .75, 1." },
        { step: "CUME_DIST = rowsBelowOrEqual/n", note: "1/5, 2/5, 3/5, 4/5, 5/5 → .2, .4, .6, .8, 1.",
          table: { columns: ["StudentId","Score","PctRank","CumeDist"],
            rows: [[1,60,0.00,0.20],[2,70,0.25,0.40],[3,80,0.50,0.60],[4,90,0.75,0.80],[5,100,1.00,1.00]] } }
      ],
      patternRecognition: [
        "'what percentile is this row / relative standing' → PERCENT_RANK or CUME_DIST.",
        "'fraction of rows at or below X' → CUME_DIST."
      ],
      interviewRecall: [
        "PERCENT_RANK: min = 0, max = 1, formula (rank-1)/(n-1).",
        "CUME_DIST: min = 1/n, max = 1, fraction ≤ current."
      ],
      commonMistakes: [
        "Swapping the two definitions.",
        "Rebuilding them with slow correlated subqueries instead of the built-ins."
      ]
    },

    {
      id: "winx-first-last-value",
      number: "SL 4203",
      platform: "StudyLab",
      title: "Open and Close Price with FIRST_VALUE / LAST_VALUE",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["FinTech"],
      link: "",
      meta: { pattern: "Group boundary values", sqlConcept: "FIRST_VALUE / LAST_VALUE + frame", technique: "Boundary window" },
      descriptionBrief:
        "Given **Prices(Ticker, TradeDate, Price)**, attach to every row its ticker's **open** (first) and " +
        "**close** (last) price. Requires the correct frame so LAST_VALUE sees the whole partition.",
      schema: [
        { name: "Prices", columns: [
          { name: "Ticker", type: "VARCHAR(6)" },
          { name: "TradeDate", type: "DATE" },
          { name: "Price", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Prices','U') IS NOT NULL DROP TABLE dbo.Prices;\n" +
        "CREATE TABLE dbo.Prices (Ticker VARCHAR(6), TradeDate DATE, Price INT);\n" +
        "INSERT INTO dbo.Prices VALUES\n" +
        "  ('AAA','2024-01-01',10),('AAA','2024-01-02',12),('AAA','2024-01-03',11),\n" +
        "  ('BBB','2024-01-01',20),('BBB','2024-01-02',25);",
      sampleData: [
        { table: "Prices", columns: ["Ticker","TradeDate","Price"],
          rows: [["AAA","2024-01-01",10],["AAA","2024-01-02",12],["AAA","2024-01-03",11],
                 ["BBB","2024-01-01",20],["BBB","2024-01-02",25]] }
      ],
      expectedOutput: { columns: ["Ticker","TradeDate","Price","OpenPrice","ClosePrice"],
        rows: [["AAA","2024-01-01",10,10,11],["AAA","2024-01-02",12,10,11],["AAA","2024-01-03",11,10,11],
               ["BBB","2024-01-01",20,20,25],["BBB","2024-01-02",25,20,25]] },
      approaches: [
        {
          name: "FIRST_VALUE / LAST_VALUE with a full frame (recommended)",
          perfNote: "One partitioned sort; the explicit frame avoids the classic LAST_VALUE bug.",
          dialectNote: "The default frame is RANGE UNBOUNDED PRECEDING → CURRENT ROW, so LAST_VALUE returns the *current* row unless you widen the frame. Portable ANSI behaviour.",
          logic:
            "**What it asks.** Per ticker, each row alongside the partition's first and last price by date.\n\n" +
            "**Why the naive idea fails.** `LAST_VALUE(Price) OVER (PARTITION BY Ticker ORDER BY TradeDate)` uses the default frame that ends at the current row, so it returns the current price, not the closing one.\n\n" +
            "**Key Idea.** Widen LAST_VALUE's frame to `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` so it sees the entire partition.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Partition by Ticker, order by TradeDate.\n" +
            "2. `FIRST_VALUE(Price)` — safe with the default frame (start is fixed).\n" +
            "3. `LAST_VALUE(Price)` with the full frame to reach the last row.\n\n" +
            "**Why it works.** FIRST_VALUE reads the frame start (always the partition start); LAST_VALUE reads the frame end, which must be extended to the partition end.\n\n" +
            "**Common Gotchas.** Forgetting the frame on LAST_VALUE — the #1 window-function bug in interviews.\n\n" +
            "**Performance.** Single sort per partition — O(n log n).\n\n" +
            "**Interview mindset.** Whenever you use LAST_VALUE, say the frame out loud.",
          tsql:
            "SELECT Ticker, TradeDate, Price,\n" +
            "       FIRST_VALUE(Price) OVER (PARTITION BY Ticker ORDER BY TradeDate) AS OpenPrice,\n" +
            "       LAST_VALUE(Price)  OVER (PARTITION BY Ticker ORDER BY TradeDate\n" +
            "                                ROWS BETWEEN UNBOUNDED PRECEDING\n" +
            "                                         AND UNBOUNDED FOLLOWING) AS ClosePrice\n" +
            "FROM dbo.Prices\n" +
            "ORDER BY Ticker, TradeDate;",
          clean:
            "SELECT Ticker, TradeDate, Price,\n" +
            "       FIRST_VALUE(Price) OVER (PARTITION BY Ticker ORDER BY TradeDate) AS OpenPrice,\n" +
            "       LAST_VALUE(Price)  OVER (PARTITION BY Ticker ORDER BY TradeDate\n" +
            "                                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ClosePrice\n" +
            "FROM dbo.Prices\n" +
            "ORDER BY Ticker, TradeDate;"
        }
      ],
      walkthrough: [
        { step: "AAA partition", note: "Ordered 10,12,11 → open 10, close 11 (needs full frame)." },
        { step: "BBB partition", note: "Ordered 20,25 → open 20, close 25.",
          table: { columns: ["Ticker","TradeDate","Price","OpenPrice","ClosePrice"],
            rows: [["AAA","2024-01-01",10,10,11],["AAA","2024-01-02",12,10,11],["AAA","2024-01-03",11,10,11],
                   ["BBB","2024-01-01",20,20,25],["BBB","2024-01-02",25,20,25]] } }
      ],
      patternRecognition: [
        "'first/last value in a group (open/close, entry/exit)' → FIRST_VALUE / LAST_VALUE.",
        "LAST_VALUE returning the wrong row → the default frame ends at CURRENT ROW."
      ],
      interviewRecall: [
        "Default window frame is RANGE … CURRENT ROW; LAST_VALUE needs UNBOUNDED FOLLOWING.",
        "FIRST_VALUE is safe with the default frame because the start is fixed."
      ],
      commonMistakes: [
        "Omitting the frame on LAST_VALUE and getting the current row's value.",
        "Using MAX/MIN when you need the value at the boundary, not the extreme value."
      ]
    },

    {
      id: "winx-moving-average",
      number: "SL 4204",
      platform: "StudyLab",
      title: "3-Day Moving Average",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Sales Analytics"],
      link: "",
      meta: { pattern: "Sliding-window average", sqlConcept: "AVG OVER … ROWS 2 PRECEDING", technique: "Moving aggregate" },
      descriptionBrief:
        "Given **DailySales(SaleDate, Amount)**, return a **trailing 3-day moving average** of Amount " +
        "(the current day plus the two before it).",
      schema: [
        { name: "DailySales", columns: [
          { name: "SaleDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.DailySales','U') IS NOT NULL DROP TABLE dbo.DailySales;\n" +
        "CREATE TABLE dbo.DailySales (SaleDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.DailySales VALUES\n" +
        "  ('2024-01-01',10),('2024-01-02',20),('2024-01-03',30),('2024-01-04',40),('2024-01-05',50);",
      sampleData: [
        { table: "DailySales", columns: ["SaleDate","Amount"],
          rows: [["2024-01-01",10],["2024-01-02",20],["2024-01-03",30],["2024-01-04",40],["2024-01-05",50]] }
      ],
      expectedOutput: { columns: ["SaleDate","Amount","MovingAvg3"],
        rows: [["2024-01-01",10,10.00],["2024-01-02",20,15.00],["2024-01-03",30,20.00],["2024-01-04",40,30.00],["2024-01-05",50,40.00]] },
      approaches: [
        {
          name: "AVG() OVER with a ROWS frame (recommended)",
          perfNote: "Streaming windowed aggregate over an ordered scan; no self-join.",
          dialectNote: "ROWS BETWEEN 2 PRECEDING AND CURRENT ROW is ANSI-standard and portable. Cast to decimal for a non-truncated average in SQL Server.",
          logic:
            "**What it asks.** For each day, the average of that day and the prior two days.\n\n" +
            "**Why the naive idea fails.** A self-join matching each day to the previous two is O(n²) and awkward at the series start; the default window frame averages *all* prior rows, not a fixed 3-day window.\n\n" +
            "**Key Idea.** `AVG(Amount) OVER (ORDER BY SaleDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` slides a fixed 3-row window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order by SaleDate.\n" +
            "2. Frame the window to the current row and the two before it.\n" +
            "3. AVG over that frame; early rows simply average fewer values.\n\n" +
            "**Why it works.** The ROWS frame fixes the window width to 3 rows, sliding forward one row at a time.\n\n" +
            "**Common Gotchas.** Using the default frame (whole history) instead of a bounded ROWS frame; integer truncation of the average.\n\n" +
            "**Performance.** Single ordered pass — O(n log n).\n\n" +
            "**Interview mindset.** 'moving / rolling N-period average' → AVG OVER with ROWS BETWEEN N-1 PRECEDING AND CURRENT ROW.",
          tsql:
            "SELECT SaleDate, Amount,\n" +
            "       ROUND(AVG(1.0 * Amount) OVER (ORDER BY SaleDate\n" +
            "             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS MovingAvg3\n" +
            "FROM dbo.DailySales\n" +
            "ORDER BY SaleDate;",
          clean:
            "SELECT SaleDate, Amount,\n" +
            "       ROUND(AVG(1.0 * Amount) OVER (ORDER BY SaleDate\n" +
            "             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS MovingAvg3\n" +
            "FROM dbo.DailySales\n" +
            "ORDER BY SaleDate;"
        }
      ],
      walkthrough: [
        { step: "Slide a 3-row window", note: "d1:10; d2:(10+20)/2=15; d3:(10+20+30)/3=20; d4:(20+30+40)/3=30; d5:(30+40+50)/3=40.",
          table: { columns: ["SaleDate","Amount","MovingAvg3"],
            rows: [["2024-01-01",10,10.00],["2024-01-02",20,15.00],["2024-01-03",30,20.00],["2024-01-04",40,30.00],["2024-01-05",50,40.00]] } }
      ],
      patternRecognition: [
        "'moving / rolling / trailing N-period average' → AVG OVER ROWS BETWEEN N-1 PRECEDING AND CURRENT ROW.",
        "Smoothing a time series → bounded ROWS frame, not the default whole-history frame."
      ],
      interviewRecall: [
        "ROWS counts physical rows; RANGE groups peers with equal ORDER BY values.",
        "Early rows average fewer values unless you require a full window."
      ],
      commonMistakes: [
        "Leaving the default frame and averaging the entire history.",
        "Integer division truncating the moving average."
      ]
    },

    {
      id: "winx-topn-per-group-ties",
      number: "SL 4205",
      platform: "StudyLab",
      title: "Top-2 Salaries per Department (Ties Included)",
      difficulty: "Hard",
      category: "Window Functions",
      topics: ["Window Functions", "Ranking"],
      domains: ["HR Analytics"],
      link: "",
      meta: { pattern: "Top-N with ties", sqlConcept: "DENSE_RANK vs ROW_NUMBER", technique: "Ranked filter" },
      descriptionBrief:
        "Given **Emp(EmpId, Dept, Salary)**, return the **top two salary levels** per department — including " +
        "ties, so two employees sharing the top salary both count as level 1.",
      schema: [
        { name: "Emp", columns: [
          { name: "EmpId", type: "INT" },
          { name: "Dept", type: "VARCHAR(20)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Emp','U') IS NOT NULL DROP TABLE dbo.Emp;\n" +
        "CREATE TABLE dbo.Emp (EmpId INT, Dept VARCHAR(20), Salary INT);\n" +
        "INSERT INTO dbo.Emp VALUES\n" +
        "  (1,'Eng',100),(2,'Eng',100),(3,'Eng',90),(4,'Eng',80),(5,'Sales',70),(6,'Sales',60);",
      sampleData: [
        { table: "Emp", columns: ["EmpId","Dept","Salary"],
          rows: [[1,"Eng",100],[2,"Eng",100],[3,"Eng",90],[4,"Eng",80],[5,"Sales",70],[6,"Sales",60]] }
      ],
      expectedOutput: { columns: ["Dept","EmpId","Salary","SalaryRank"],
        rows: [["Eng",1,100,1],["Eng",2,100,1],["Eng",3,90,2],["Sales",5,70,1],["Sales",6,60,2]] },
      approaches: [
        {
          name: "DENSE_RANK() then keep rank ≤ 2 (recommended)",
          perfNote: "One partitioned sort; DENSE_RANK gives ties the same rank with no gaps, so 'top-2 levels' is exactly rank ≤ 2.",
          dialectNote: "DENSE_RANK is ANSI-standard everywhere. Choose ROW_NUMBER for exactly-N rows, RANK/DENSE_RANK for N distinct *levels*.",
          logic:
            "**What it asks.** The two highest distinct salary levels per department, keeping everyone tied at those levels.\n\n" +
            "**Why the naive idea fails.** `ROW_NUMBER() … ≤ 2` would keep only 2 rows in Eng and arbitrarily drop one of the two tied top earners.\n\n" +
            "**Key Idea.** `DENSE_RANK()` assigns tied rows the same rank and does not skip numbers, so 'top 2 levels' is precisely `rank ≤ 2`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `DENSE_RANK() OVER (PARTITION BY Dept ORDER BY Salary DESC)`.\n" +
            "2. Wrap in a CTE.\n" +
            "3. Keep rows with rank ≤ 2.\n\n" +
            "**Why it works.** Eng: 100→1, 100→1, 90→2, 80→3; keeping ≤2 retains both 100s and the 90. Sales: 70→1, 60→2.\n\n" +
            "**Common Gotchas.** Using ROW_NUMBER (drops ties) or RANK (leaves gaps, so 'rank ≤ 2' may skip a wanted level) when the ask is 'top-N levels'.\n\n" +
            "**Performance.** O(n log n) partitioned sort.\n\n" +
            "**Interview mindset.** 'top-N including ties / top-N levels' → DENSE_RANK; 'exactly N rows' → ROW_NUMBER.",
          tsql:
            "WITH ranked AS (\n" +
            "  SELECT EmpId, Dept, Salary,\n" +
            "         DENSE_RANK() OVER (PARTITION BY Dept\n" +
            "                            ORDER BY Salary DESC) AS SalaryRank\n" +
            "  FROM dbo.Emp)\n" +
            "SELECT Dept, EmpId, Salary, SalaryRank\n" +
            "FROM ranked\n" +
            "WHERE SalaryRank <= 2\n" +
            "ORDER BY Dept, SalaryRank, EmpId;",
          clean:
            "WITH ranked AS (\n" +
            "  SELECT EmpId, Dept, Salary,\n" +
            "         DENSE_RANK() OVER (PARTITION BY Dept ORDER BY Salary DESC) AS SalaryRank\n" +
            "  FROM dbo.Emp)\n" +
            "SELECT Dept, EmpId, Salary, SalaryRank FROM ranked\n" +
            "WHERE SalaryRank <= 2 ORDER BY Dept, SalaryRank, EmpId;"
        }
      ],
      walkthrough: [
        { step: "DENSE_RANK per dept desc", note: "Eng: 100,100→1; 90→2; 80→3. Sales: 70→1; 60→2." },
        { step: "Keep rank ≤ 2", note: "Both tied 100s survive; 80 is dropped.",
          table: { columns: ["Dept","EmpId","Salary","SalaryRank"],
            rows: [["Eng",1,100,1],["Eng",2,100,1],["Eng",3,90,2],["Sales",5,70,1],["Sales",6,60,2]] } }
      ],
      patternRecognition: [
        "'top-N per group including ties / top-N salary levels' → DENSE_RANK, keep rank ≤ N.",
        "'exactly N rows per group' → ROW_NUMBER."
      ],
      interviewRecall: [
        "ROW_NUMBER: unique, no ties. RANK: ties share, with gaps. DENSE_RANK: ties share, no gaps.",
        "Window functions can't sit in WHERE — rank in a CTE, then filter."
      ],
      commonMistakes: [
        "ROW_NUMBER silently dropping a tied top earner.",
        "RANK's gaps causing 'rank ≤ N' to omit a level you wanted."
      ]
    },

    {
      id: "winx-median-percentile",
      number: "SL 4206",
      platform: "StudyLab",
      title: "Median Salary per Department (PERCENTILE_CONT)",
      difficulty: "Hard",
      category: "Window Functions",
      topics: ["Window Functions", "Aggregation"],
      domains: ["HR Analytics"],
      link: "",
      meta: { pattern: "Median / percentile", sqlConcept: "PERCENTILE_CONT WITHIN GROUP", technique: "Ordered-set analytic" },
      descriptionBrief:
        "Given **DeptSalaries(Dept, Salary)**, return the **median** salary per department using " +
        "PERCENTILE_CONT(0.5) — the interpolated 50th percentile.",
      schema: [
        { name: "DeptSalaries", columns: [
          { name: "Dept", type: "VARCHAR(20)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.DeptSalaries','U') IS NOT NULL DROP TABLE dbo.DeptSalaries;\n" +
        "CREATE TABLE dbo.DeptSalaries (Dept VARCHAR(20), Salary INT);\n" +
        "INSERT INTO dbo.DeptSalaries VALUES\n" +
        "  ('Eng',80),('Eng',90),('Eng',100),('Eng',120),('Sales',50),('Sales',70),('Sales',90);",
      sampleData: [
        { table: "DeptSalaries", columns: ["Dept","Salary"],
          rows: [["Eng",80],["Eng",90],["Eng",100],["Eng",120],["Sales",50],["Sales",70],["Sales",90]] }
      ],
      expectedOutput: { columns: ["Dept","MedianSalary"],
        rows: [["Eng",95.00],["Sales",70.00]] },
      approaches: [
        {
          name: "PERCENTILE_CONT(0.5) WITHIN GROUP … OVER (recommended)",
          perfNote: "In SQL Server PERCENTILE_CONT is an analytic function that repeats per row; SELECT DISTINCT (or GROUP BY wrapper) collapses to one row per department.",
          dialectNote: "SQL Server: analytic form with OVER(PARTITION BY …), needs DISTINCT. Postgres/Oracle: ordered-set aggregate `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary)` with GROUP BY. MySQL has no PERCENTILE_CONT — emulate with window ranking.",
          logic:
            "**What it asks.** The interpolated median salary for each department.\n\n" +
            "**Why the naive idea fails.** SQL has no MEDIAN() aggregate; AVG is not the median, and a hand-rolled median (ranking + averaging the middle one or two) is fiddly and easy to get wrong for even vs odd counts.\n\n" +
            "**Key Idea.** `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary)` interpolates the 50th percentile, correctly handling both even and odd group sizes.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Apply `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary) OVER (PARTITION BY Dept)`.\n" +
            "2. Because the analytic form repeats the value on every row, `SELECT DISTINCT Dept, median` to get one row per department.\n\n" +
            "**Why it works.** PERCENTILE_CONT interpolates between the two central values for even counts (Eng: avg of 90 and 100 = 95) and returns the middle value for odd counts (Sales: 70).\n\n" +
            "**Common Gotchas.** Forgetting DISTINCT in SQL Server and getting duplicate rows; confusing PERCENTILE_CONT (interpolated) with PERCENTILE_DISC (nearest actual value).\n\n" +
            "**Performance.** Partitioned sort per group — O(n log n).\n\n" +
            "**Interview mindset.** 'median / p50 / p90' → PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY col).",
          tsql:
            "SELECT DISTINCT Dept,\n" +
            "       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary)\n" +
            "           OVER (PARTITION BY Dept) AS MedianSalary\n" +
            "FROM dbo.DeptSalaries\n" +
            "ORDER BY Dept;",
          clean:
            "SELECT DISTINCT Dept,\n" +
            "       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary) OVER (PARTITION BY Dept) AS MedianSalary\n" +
            "FROM dbo.DeptSalaries\n" +
            "ORDER BY Dept;"
        }
      ],
      walkthrough: [
        { step: "Eng: even count (4)", note: "Sorted 80,90,100,120 → interpolate middle two → (90+100)/2 = 95." },
        { step: "Sales: odd count (3)", note: "Sorted 50,70,90 → middle value = 70.",
          table: { columns: ["Dept","MedianSalary"], rows: [["Eng",95.00],["Sales",70.00]] } }
      ],
      patternRecognition: [
        "'median / p50 / p90 / percentile value' → PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY col).",
        "No MEDIAN() aggregate exists → reach for PERCENTILE_CONT."
      ],
      interviewRecall: [
        "PERCENTILE_CONT interpolates; PERCENTILE_DISC returns an actual data point.",
        "In SQL Server it's analytic-only (needs OVER + DISTINCT); in Postgres/Oracle it's an ordered-set aggregate with GROUP BY."
      ],
      commonMistakes: [
        "Using AVG as a stand-in for the median.",
        "Omitting DISTINCT in SQL Server and getting one median row per input row."
      ]
    }

  ]);
})();
