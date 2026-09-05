/*
 * data/window2.js — Window Functions (additional problems).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Window Functions", [

    /* ------------------------------------------------------------------ */
    {
      id: "win2-rolling-3txn-sum",
      number: "DL 10201",
      platform: "DataLemur",
      title: "Rolling 3-Transaction Spend",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Banking Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Moving / rolling sum", sqlConcept: "SUM OVER … ROWS frame", technique: "Bounded sliding window" },
      descriptionBrief:
        "Given **Transactions(TxnDate, Amount)** with one row per day, return each day's amount " +
        "plus a **rolling sum of the current day and the two prior days** (a bounded 3-row window). " +
        "The first two days sum only the days available so far.",
      schema: [
        { name: "Transactions", columns: [
          { name: "TxnDate", type: "DATE", note: "one row per day" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Transactions','U') IS NOT NULL DROP TABLE dbo.Transactions;\n" +
        "CREATE TABLE dbo.Transactions (TxnDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Transactions VALUES\n" +
        "  ('2024-05-01',200),('2024-05-02',300),('2024-05-03',100),\n" +
        "  ('2024-05-04',400),('2024-05-05',250);",
      sampleData: [
        { table: "Transactions", columns: ["TxnDate","Amount"],
          rows: [["2024-05-01",200],["2024-05-02",300],["2024-05-03",100],["2024-05-04",400],["2024-05-05",250]] }
      ],
      expectedOutput: { columns: ["TxnDate","Amount","Rolling3Sum"],
        rows: [["2024-05-01",200,200],["2024-05-02",300,500],["2024-05-03",100,600],["2024-05-04",400,800],["2024-05-05",250,750]] },
      approaches: [
        {
          name: "SUM() OVER with ROWS 2 PRECEDING (recommended)",
          perfNote: "One ordered streaming pass; a fixed-width ROWS frame slides forward without re-scanning earlier rows. An index on TxnDate supplies the order.",
          dialectNote: "Specify ROWS, not the default RANGE — RANGE would fold in date peers and mis-size a fixed-width window.",
          logic:
            "**What it asks.** A trailing sum spanning the current day and the two days before it.\n\n" +
            "**Why the naive idea fails.** A self-join gathering 'this day and the two prior' is O(n²) and breaks across calendar gaps; and leaving the frame implicit gives RANGE, whose tie-inclusive semantics can pull in more than three rows and spool to disk.\n\n" +
            "**Key Idea.** `SUM(Amount) OVER (ORDER BY TxnDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` sums a sliding 3-row window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order the window by `TxnDate`.\n" +
            "2. Frame it as `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` — at most three physical rows.\n" +
            "3. `SUM(Amount)` over that frame is the rolling sum.\n" +
            "4. Early rows (day 1, day 2) simply have a shorter frame and sum only what exists.\n\n" +
            "**Why it works.** A ROWS frame counts physical rows, so the window always spans at most three consecutive days and advances one row per step.\n\n" +
            "**Common Gotchas.** Use `ROWS`, not `RANGE`. A bounded `2 PRECEDING` gives a fixed width; `UNBOUNDED PRECEDING` would make it a growing running total instead.\n\n" +
            "**Performance.** Single sort + streaming window aggregate, O(n log n).\n\n" +
            "**Interview mindset.** 'rolling / trailing N-period sum' → windowed SUM with a bounded `(N-1) PRECEDING` ROWS frame.",
          tsql:
            "SELECT TxnDate, Amount,\n" +
            "       SUM(Amount) OVER (ORDER BY TxnDate\n" +
            "                         ROWS BETWEEN 2 PRECEDING\n" +
            "                                  AND CURRENT ROW) AS Rolling3Sum\n" +
            "FROM dbo.Transactions\n" +
            "ORDER BY TxnDate;",
          clean:
            "SELECT TxnDate, Amount,\n" +
            "       SUM(Amount) OVER (ORDER BY TxnDate\n" +
            "                         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS Rolling3Sum\n" +
            "FROM dbo.Transactions\n" +
            "ORDER BY TxnDate;"
        }
      ],
      walkthrough: [
        { step: "Slide a 3-row window in date order", note: "Frames: [200], [200,300], [200,300,100], [300,100,400], [100,400,250].",
          table: { columns: ["TxnDate","Amount","Rolling3Sum"],
            rows: [["2024-05-01",200,200],["2024-05-02",300,500],["2024-05-03",100,600],["2024-05-04",400,800],["2024-05-05",250,750]] } }
      ],
      patternRecognition: [
        "'rolling / trailing N-day sum' → SUM() OVER (ORDER BY … ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW).",
        "Bounded PRECEDING → fixed-width window; UNBOUNDED PRECEDING → growing running total."
      ],
      interviewRecall: [
        "A bounded ROWS frame gives a fixed-width sliding window; the edge rows simply frame fewer rows.",
        "PARTITION BY resets the rolling sum per group (e.g. per account)."
      ],
      commonMistakes: [
        "Leaving the frame implicit (RANGE) and mis-sizing the window on tied order keys.",
        "Using UNBOUNDED PRECEDING and accidentally producing a running total instead of a fixed window."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "win2-running-signup-count",
      number: "SS 10401",
      platform: "StrataScratch",
      title: "Running Signup Count per Plan",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["SaaS Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Running count", sqlConcept: "COUNT OVER … ROWS frame", technique: "Cumulative count per partition" },
      descriptionBrief:
        "Given **Signups(UserId, SignupDate, Plan)**, for each signup return a **running count of how " +
        "many users have joined that same plan up to and including this signup**, ordered by date. " +
        "The counter restarts for each plan.",
      schema: [
        { name: "Signups", columns: [
          { name: "UserId", type: "INT", note: "PK" },
          { name: "SignupDate", type: "DATE" },
          { name: "Plan", type: "VARCHAR(20)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Signups','U') IS NOT NULL DROP TABLE dbo.Signups;\n" +
        "CREATE TABLE dbo.Signups (UserId INT PRIMARY KEY, SignupDate DATE, Plan VARCHAR(20));\n" +
        "INSERT INTO dbo.Signups VALUES\n" +
        "  (1,'2024-02-01','Free'),(2,'2024-02-03','Pro'),(3,'2024-02-05','Free'),\n" +
        "  (4,'2024-02-08','Pro'),(5,'2024-02-10','Free');",
      sampleData: [
        { table: "Signups", columns: ["UserId","SignupDate","Plan"],
          rows: [[1,"2024-02-01","Free"],[2,"2024-02-03","Pro"],[3,"2024-02-05","Free"],[4,"2024-02-08","Pro"],[5,"2024-02-10","Free"]] }
      ],
      expectedOutput: { columns: ["UserId","SignupDate","Plan","RunningPlanCount"],
        rows: [[1,"2024-02-01","Free",1],[2,"2024-02-03","Pro",1],[3,"2024-02-05","Free",2],[4,"2024-02-08","Pro",2],[5,"2024-02-10","Free",3]] },
      approaches: [
        {
          name: "COUNT() OVER with explicit frame (recommended)",
          perfNote: "One partitioned ordered pass; the streaming window increments the count as it scans, no self-join. Index on (Plan, SignupDate) supplies the order.",
          dialectNote: "State ROWS explicitly; the default RANGE frame counts all rows sharing the current date, inflating the count when two users join the same day.",
          logic:
            "**What it asks.** For each signup, how many users have joined the same plan so far.\n\n" +
            "**Why the naive idea fails.** A correlated `COUNT(*) WHERE Plan = p AND SignupDate <= d` re-scans the table per row (O(n²)); and the default RANGE frame lumps all same-date rows together, so two users joining on one day both read the same larger count.\n\n" +
            "**Key Idea.** `COUNT(*) OVER (PARTITION BY Plan ORDER BY SignupDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` counts rows from the start of the plan's partition through the current row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Partition by `Plan` so the counter restarts per plan.\n" +
            "2. Order by `SignupDate`.\n" +
            "3. Frame `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` and `COUNT(*)`.\n\n" +
            "**Why it works.** The frame grows one row at a time in date order within each plan, so the count is exactly the number of signups to date for that plan.\n\n" +
            "**Common Gotchas.** Without PARTITION BY the count runs across all plans. Use ROWS, not RANGE, so same-day signups get distinct incremental counts.\n\n" +
            "**Performance.** Single sort per partition + streaming aggregate, O(n log n).\n\n" +
            "**Interview mindset.** 'running / cumulative count' → COUNT(*) OVER (ORDER BY … ROWS UNBOUNDED PRECEDING), partition to reset per group.",
          tsql:
            "SELECT UserId, SignupDate, Plan,\n" +
            "       COUNT(*) OVER (PARTITION BY Plan\n" +
            "                      ORDER BY SignupDate\n" +
            "                      ROWS BETWEEN UNBOUNDED PRECEDING\n" +
            "                               AND CURRENT ROW) AS RunningPlanCount\n" +
            "FROM dbo.Signups\n" +
            "ORDER BY SignupDate;",
          clean:
            "SELECT UserId, SignupDate, Plan,\n" +
            "       COUNT(*) OVER (PARTITION BY Plan ORDER BY SignupDate\n" +
            "                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningPlanCount\n" +
            "FROM dbo.Signups\n" +
            "ORDER BY SignupDate;"
        }
      ],
      walkthrough: [
        { step: "Partition by Plan, accumulate COUNT in date order", note: "Free: 1,2,3 on its three rows; Pro: 1,2 on its two rows.",
          table: { columns: ["Plan","SignupDate","RunningPlanCount"],
            rows: [["Free","2024-02-01",1],["Pro","2024-02-03",1],["Free","2024-02-05",2],["Pro","2024-02-08",2],["Free","2024-02-10",3]] } },
        { step: "Project back in date order",
          table: { columns: ["UserId","SignupDate","Plan","RunningPlanCount"],
            rows: [[1,"2024-02-01","Free",1],[2,"2024-02-03","Pro",1],[3,"2024-02-05","Free",2],[4,"2024-02-08","Pro",2],[5,"2024-02-10","Free",3]] } }
      ],
      patternRecognition: [
        "'running / cumulative count to date' → COUNT(*) OVER (ORDER BY … ROWS UNBOUNDED PRECEDING).",
        "'per group' running count → add PARTITION BY the group key."
      ],
      interviewRecall: [
        "COUNT(*) OVER with an ordered ROWS-UNBOUNDED-PRECEDING frame is the count analogue of a running SUM.",
        "Default RANGE frame ties same-key rows together; ROWS gives strict per-row increments."
      ],
      commonMistakes: [
        "Omitting PARTITION BY and counting across every plan.",
        "Leaving the frame implicit so same-date signups share an inflated count."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "win2-second-order-per-customer",
      number: "DL 10205",
      platform: "DataLemur",
      title: "Each Customer's Second Order",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions", "Ranking"],
      domains: ["E-Commerce Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Rank then filter", sqlConcept: "ROW_NUMBER + outer filter", technique: "Nth-row-per-group" },
      descriptionBrief:
        "Given **Orders(OrderId, CustomerId, OrderDate, Amount)**, return **each customer's second " +
        "order** (by order date). Customers with fewer than two orders are excluded. Break same-date " +
        "ties by OrderId so exactly one row qualifies as the second.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerId", type: "VARCHAR(10)" },
          { name: "OrderDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerId VARCHAR(10), OrderDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (101,'C1','2024-01-05',50),(102,'C1','2024-01-20',80),(103,'C1','2024-02-10',30),\n" +
        "  (201,'C2','2024-01-15',200),(202,'C2','2024-03-01',150),\n" +
        "  (301,'C3','2024-02-20',90);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","OrderDate","Amount"],
          rows: [[101,"C1","2024-01-05",50],[102,"C1","2024-01-20",80],[103,"C1","2024-02-10",30],[201,"C2","2024-01-15",200],[202,"C2","2024-03-01",150],[301,"C3","2024-02-20",90]] }
      ],
      expectedOutput: { columns: ["CustomerId","OrderId","OrderDate","Amount"],
        rows: [["C1",102,"2024-01-20",80],["C2",202,"2024-03-01",150]] },
      approaches: [
        {
          name: "ROW_NUMBER then filter rn = 2 (recommended)",
          perfNote: "One partitioned ordered pass numbers each customer's orders 1..k; an outer filter keeps rn = 2. Customers with one order never produce a rn = 2 row, so they drop automatically.",
          dialectNote: "You cannot reference a window function in WHERE — it must be computed in a CTE/derived table and filtered in the outer query.",
          logic:
            "**What it asks.** The second order per customer, excluding customers who ordered only once.\n\n" +
            "**Why the naive idea fails.** `MIN(OrderDate)` gives the first order, not the second; and a correlated 'the smallest date greater than the customer's minimum' is fiddly and mishandles same-date ties. `RANK`/`DENSE_RANK` could return two rows if the second date ties.\n\n" +
            "**Key Idea.** `ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate, OrderId)` gives each customer's orders a strict 1,2,3,… sequence; the second order is simply `rn = 2`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, number orders per customer with a deterministic tie-break on `OrderId`.\n" +
            "2. In the outer query, filter to `rn = 2`.\n" +
            "3. Project the customer, order id, date, and amount.\n\n" +
            "**Why it works.** ROW_NUMBER never repeats a value inside a partition, so exactly one row is the second — and a customer with a single order has no row numbered 2, dropping them cleanly.\n\n" +
            "**Common Gotchas.** Use ROW_NUMBER (not RANK) so a same-date tie can't yield two 'second' rows. The window function can't live in WHERE — wrap it first.\n\n" +
            "**Performance.** One segment/sort per customer, O(n log n); an index on `(CustomerId, OrderDate, OrderId)` supplies the order.\n\n" +
            "**Interview mindset.** 'the Nth row per group' → ROW_NUMBER = N in a CTE; a deterministic tie-break makes 'Nth' unambiguous.",
          tsql:
            "WITH Numbered AS (\n" +
            "    SELECT OrderId, CustomerId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId\n" +
            "                              ORDER BY OrderDate, OrderId) AS rn  -- 1,2,3,... per customer\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Amount\n" +
            "FROM Numbered\n" +
            "WHERE rn = 2               -- the second order only\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH Numbered AS (\n" +
            "    SELECT OrderId, CustomerId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate, OrderId) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Amount\n" +
            "FROM Numbered\n" +
            "WHERE rn = 2\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER within each customer", note: "C1: 101→1, 102→2, 103→3. C2: 201→1, 202→2. C3: 301→1.",
          table: { columns: ["CustomerId","OrderId","OrderDate","rn"],
            rows: [["C1",101,"2024-01-05",1],["C1",102,"2024-01-20",2],["C1",103,"2024-02-10",3],["C2",201,"2024-01-15",1],["C2",202,"2024-03-01",2],["C3",301,"2024-02-20",1]] } },
        { step: "Filter rn = 2", note: "C1's 102 and C2's 202 survive; C3 (only one order) drops.",
          table: { columns: ["CustomerId","OrderId","OrderDate","Amount"],
            rows: [["C1",102,"2024-01-20",80],["C2",202,"2024-03-01",150]] } }
      ],
      patternRecognition: [
        "'the Nth event per group' → ROW_NUMBER() = N filtered in a CTE.",
        "Filtering a window result requires a CTE/derived table — it cannot appear in WHERE."
      ],
      interviewRecall: [
        "ROW_NUMBER caps each group's sequence strictly; groups shorter than N produce no rn = N row and drop out.",
        "Add a deterministic tie-break column so 'the Nth' is well-defined under ties."
      ],
      commonMistakes: [
        "Putting the window function directly in WHERE instead of a CTE.",
        "Using RANK and returning two rows when the second date ties."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "win2-session-entry-exit-page",
      number: "SS 10405",
      platform: "StrataScratch",
      title: "Session Entry and Exit Page",
      difficulty: "Medium",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Web Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Partition endpoints", sqlConcept: "FIRST_VALUE / LAST_VALUE", technique: "Explicit full-partition frame" },
      descriptionBrief:
        "Given **PageViews(SessionId, ViewTime, Page)**, return **one row per session** naming the " +
        "**entry page** (first page viewed) and the **exit page** (last page viewed), ordered by view " +
        "time within the session.",
      schema: [
        { name: "PageViews", columns: [
          { name: "SessionId", type: "VARCHAR(10)" },
          { name: "ViewTime", type: "DATETIME2" },
          { name: "Page", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.PageViews','U') IS NOT NULL DROP TABLE dbo.PageViews;\n" +
        "CREATE TABLE dbo.PageViews (SessionId VARCHAR(10), ViewTime DATETIME2, Page VARCHAR(30));\n" +
        "INSERT INTO dbo.PageViews VALUES\n" +
        "  ('S1','2024-06-01T10:00:00','Home'),('S1','2024-06-01T10:02:00','Products'),\n" +
        "  ('S1','2024-06-01T10:05:00','Checkout'),\n" +
        "  ('S2','2024-06-01T11:00:00','Landing'),('S2','2024-06-01T11:03:00','Pricing');",
      sampleData: [
        { table: "PageViews", columns: ["SessionId","ViewTime","Page"],
          rows: [["S1","2024-06-01 10:00:00","Home"],["S1","2024-06-01 10:02:00","Products"],["S1","2024-06-01 10:05:00","Checkout"],["S2","2024-06-01 11:00:00","Landing"],["S2","2024-06-01 11:03:00","Pricing"]] }
      ],
      expectedOutput: { columns: ["SessionId","EntryPage","ExitPage"],
        rows: [["S1","Home","Checkout"],["S2","Landing","Pricing"]] },
      approaches: [
        {
          name: "FIRST_VALUE / LAST_VALUE with full frame (recommended)",
          perfNote: "One partitioned ordered pass returns both boundary pages. LAST_VALUE needs an explicit full-partition frame or it stops at the current row and returns the wrong page.",
          dialectNote: "The default frame is RANGE UNBOUNDED PRECEDING AND CURRENT ROW, so LAST_VALUE returns the current row — widen it to UNBOUNDED FOLLOWING.",
          logic:
            "**What it asks.** The first and last page of each session on a single row.\n\n" +
            "**Why the naive idea fails.** MIN/MAX apply to the timestamp, not the page name, so you'd need extra joins to recover which page those times belong to. And a lone `LAST_VALUE(Page)` with the *default* frame only sees up to the current row, returning the current page instead of the session's last.\n\n" +
            "**Key Idea.** Partition by session, order by view time; `FIRST_VALUE(Page)` is the entry page and `LAST_VALUE(Page)` over the **full-partition frame** is the exit page.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `PARTITION BY SessionId ORDER BY ViewTime`.\n" +
            "2. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` so both functions see the whole session.\n" +
            "3. `FIRST_VALUE(Page)` = entry; `LAST_VALUE(Page)` = exit.\n" +
            "4. `SELECT DISTINCT` — the same pair repeats on every row of the session — and order by session.\n\n" +
            "**Why it works.** With a full frame, every row in a session sees the same first and last framed page, so one distinct row per session carries both endpoints.\n\n" +
            "**Common Gotchas.** Forgetting the explicit frame is the classic LAST_VALUE bug. Remember the DISTINCT or you get one row per page view.\n\n" +
            "**Performance.** One segment/sort per session + streaming window, O(n log n); an index on `(SessionId, ViewTime)` supplies the order.\n\n" +
            "**Interview mindset.** Reaching for LAST_VALUE? Say 'and I widen the frame to UNBOUNDED FOLLOWING' in the same breath.",
          tsql:
            "WITH Bounds AS (\n" +
            "    SELECT SessionId,\n" +
            "           FIRST_VALUE(Page) OVER w AS EntryPage,\n" +
            "           LAST_VALUE(Page)  OVER w AS ExitPage\n" +
            "    FROM dbo.PageViews\n" +
            "    WINDOW w AS (PARTITION BY SessionId ORDER BY ViewTime\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)  -- full session\n" +
            ")\n" +
            "SELECT DISTINCT SessionId, EntryPage, ExitPage\n" +
            "FROM Bounds\n" +
            "ORDER BY SessionId;",
          clean:
            "WITH Bounds AS (\n" +
            "    SELECT SessionId,\n" +
            "           FIRST_VALUE(Page) OVER w AS EntryPage,\n" +
            "           LAST_VALUE(Page)  OVER w AS ExitPage\n" +
            "    FROM dbo.PageViews\n" +
            "    WINDOW w AS (PARTITION BY SessionId ORDER BY ViewTime\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)\n" +
            ")\n" +
            "SELECT DISTINCT SessionId, EntryPage, ExitPage\n" +
            "FROM Bounds\n" +
            "ORDER BY SessionId;"
        }
      ],
      walkthrough: [
        { step: "Order each session by ViewTime", note: "S1: Home, Products, Checkout. S2: Landing, Pricing.",
          table: { columns: ["SessionId","ViewTime","Page"],
            rows: [["S1","10:00","Home"],["S1","10:02","Products"],["S1","10:05","Checkout"],["S2","11:00","Landing"],["S2","11:03","Pricing"]] } },
        { step: "FIRST_VALUE / LAST_VALUE over full frame, then DISTINCT", note: "S1 edges Home/Checkout; S2 edges Landing/Pricing.",
          table: { columns: ["SessionId","EntryPage","ExitPage"],
            rows: [["S1","Home","Checkout"],["S2","Landing","Pricing"]] } }
      ],
      patternRecognition: [
        "'first and last value of an ordered group' → FIRST_VALUE / LAST_VALUE with an explicit full frame.",
        "The endpoint values repeat on every partition row → SELECT DISTINCT to collapse to one row per group."
      ],
      interviewRecall: [
        "LAST_VALUE with the default frame returns the current row — always widen to UNBOUNDED FOLLOWING.",
        "FIRST_VALUE/LAST_VALUE return a column value at a frame edge, unlike MAX/MIN which aggregate a measure."
      ],
      commonMistakes: [
        "Omitting the explicit frame on LAST_VALUE and getting the current page as the 'exit'.",
        "Forgetting DISTINCT and returning one row per page view instead of one per session."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "win2-cumulative-distinct-products",
      number: "DL 10209",
      platform: "DataLemur",
      title: "Cumulative Distinct Products Purchased",
      difficulty: "Hard",
      category: "Window Functions",
      topics: ["Window Functions"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Running distinct count", sqlConcept: "first-occurrence flag + running SUM", technique: "Flag then accumulate" },
      descriptionBrief:
        "Given **Purchases(PurchaseDate, Product)** with one row per purchase, return for each " +
        "purchase the **number of distinct products bought so far** (through that date). Repeated " +
        "purchases of an already-seen product must not increase the count.",
      schema: [
        { name: "Purchases", columns: [
          { name: "PurchaseDate", type: "DATE", note: "one row per purchase" },
          { name: "Product", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Purchases','U') IS NOT NULL DROP TABLE dbo.Purchases;\n" +
        "CREATE TABLE dbo.Purchases (PurchaseDate DATE, Product VARCHAR(30));\n" +
        "INSERT INTO dbo.Purchases VALUES\n" +
        "  ('2024-07-01','Apple'),('2024-07-02','Banana'),('2024-07-03','Apple'),\n" +
        "  ('2024-07-04','Cherry'),('2024-07-05','Banana');",
      sampleData: [
        { table: "Purchases", columns: ["PurchaseDate","Product"],
          rows: [["2024-07-01","Apple"],["2024-07-02","Banana"],["2024-07-03","Apple"],["2024-07-04","Cherry"],["2024-07-05","Banana"]] }
      ],
      expectedOutput: { columns: ["PurchaseDate","Product","DistinctProductsToDate"],
        rows: [["2024-07-01","Apple",1],["2024-07-02","Banana",2],["2024-07-03","Apple",2],["2024-07-04","Cherry",3],["2024-07-05","Banana",3]] },
      approaches: [
        {
          name: "First-occurrence flag + running SUM (recommended)",
          perfNote: "Two ordered passes (one to flag first occurrences per product, one to accumulate) — no O(n²) self-join. There is no COUNT(DISTINCT) OVER in T-SQL, so this flag-then-sum pattern is the standard workaround.",
          dialectNote: "T-SQL has no COUNT(DISTINCT …) OVER window; emulate it by flagging the first appearance of each value and running a SUM over the flag.",
          logic:
            "**What it asks.** A running count of *distinct* products, where re-buying a known product doesn't move the count.\n\n" +
            "**Why the naive idea fails.** `COUNT(DISTINCT Product) OVER (ORDER BY PurchaseDate …)` is not valid T-SQL — DISTINCT isn't allowed in a window aggregate. A correlated `COUNT(DISTINCT …) WHERE date <= d` re-scans per row (O(n²)).\n\n" +
            "**Key Idea.** A product adds to the distinct count exactly once — on its *first* purchase. Flag that first row with `ROW_NUMBER() OVER (PARTITION BY Product ORDER BY PurchaseDate) = 1`, then a running `SUM` of the flag is the cumulative distinct count.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE: for each row compute `ROW_NUMBER() OVER (PARTITION BY Product ORDER BY PurchaseDate, (SELECT 1))` and set `IsFirst = 1` when it equals 1, else 0.\n" +
            "2. Run `SUM(IsFirst) OVER (ORDER BY PurchaseDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` — each first-occurrence adds 1, repeats add 0.\n" +
            "3. Project the date, product, and the running sum.\n\n" +
            "**Why it works.** Each distinct product contributes a single 1 (on its earliest date); accumulating those 1s in date order gives the number of distinct products seen so far.\n\n" +
            "**Common Gotchas.** Order the *outer* running SUM by the same key as the flag's date logic, and use ROWS so same-date rows accumulate one at a time. The flag's tie-break must be deterministic so exactly one row per product is flagged.\n\n" +
            "**Performance.** Two streaming window passes, O(n log n); an index on `(Product, PurchaseDate)` and one on `PurchaseDate` support the two orders.\n\n" +
            "**Interview mindset.** 'running distinct count' with no COUNT(DISTINCT) OVER → flag the first occurrence of each value, then running-SUM the flag.",
          tsql:
            "WITH Flagged AS (\n" +
            "    SELECT PurchaseDate, Product,\n" +
            "           CASE WHEN ROW_NUMBER() OVER (PARTITION BY Product\n" +
            "                                        ORDER BY PurchaseDate) = 1\n" +
            "                THEN 1 ELSE 0 END AS IsFirst   -- 1 only on a product's first buy\n" +
            "    FROM dbo.Purchases\n" +
            ")\n" +
            "SELECT PurchaseDate, Product,\n" +
            "       SUM(IsFirst) OVER (ORDER BY PurchaseDate\n" +
            "                          ROWS BETWEEN UNBOUNDED PRECEDING\n" +
            "                                   AND CURRENT ROW) AS DistinctProductsToDate\n" +
            "FROM Flagged\n" +
            "ORDER BY PurchaseDate;",
          clean:
            "WITH Flagged AS (\n" +
            "    SELECT PurchaseDate, Product,\n" +
            "           CASE WHEN ROW_NUMBER() OVER (PARTITION BY Product ORDER BY PurchaseDate) = 1\n" +
            "                THEN 1 ELSE 0 END AS IsFirst\n" +
            "    FROM dbo.Purchases\n" +
            ")\n" +
            "SELECT PurchaseDate, Product,\n" +
            "       SUM(IsFirst) OVER (ORDER BY PurchaseDate\n" +
            "                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS DistinctProductsToDate\n" +
            "FROM Flagged\n" +
            "ORDER BY PurchaseDate;"
        }
      ],
      walkthrough: [
        { step: "Flag each product's first purchase", note: "Apple 07-01 → 1, Banana 07-02 → 1, Apple 07-03 → 0 (repeat), Cherry 07-04 → 1, Banana 07-05 → 0 (repeat).",
          table: { columns: ["PurchaseDate","Product","IsFirst"],
            rows: [["2024-07-01","Apple",1],["2024-07-02","Banana",1],["2024-07-03","Apple",0],["2024-07-04","Cherry",1],["2024-07-05","Banana",0]] } },
        { step: "Running SUM of the flag in date order", note: "1 → 2 → 2 → 3 → 3.",
          table: { columns: ["PurchaseDate","Product","DistinctProductsToDate"],
            rows: [["2024-07-01","Apple",1],["2024-07-02","Banana",2],["2024-07-03","Apple",2],["2024-07-04","Cherry",3],["2024-07-05","Banana",3]] } }
      ],
      patternRecognition: [
        "'running distinct count' (no COUNT(DISTINCT) OVER in T-SQL) → flag first occurrence per value, then running SUM.",
        "First occurrence of a value in an ordered group → ROW_NUMBER() PARTITION BY value = 1."
      ],
      interviewRecall: [
        "T-SQL window aggregates do not accept DISTINCT — COUNT(DISTINCT x) OVER (...) is a syntax error.",
        "Reduce 'distinct-to-date' to 'sum of a 0/1 first-occurrence flag' — a reusable trick."
      ],
      commonMistakes: [
        "Trying COUNT(DISTINCT Product) OVER (...) and hitting a syntax error.",
        "Using RANGE (or omitting the frame) so same-date first occurrences don't accumulate one at a time."
      ]
    }

  ]);
})();
