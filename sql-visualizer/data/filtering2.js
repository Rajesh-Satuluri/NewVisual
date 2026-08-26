/*
 * data/filtering2.js — Filtering & Subqueries (second set).
 * Nine additional problems. T-SQL for SQL Server 2019/2022, runnable as-is in
 * SSMS 19/21. All ids prefixed "filt2-".
 */
(function () {
  window.SQLLAB.register("Filtering & Subqueries", [

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-orders-above-own-average",
      number: "SS 10420",
      platform: "StrataScratch",
      title: "Orders Above the Customer's Own Average",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["E-commerce Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Per-entity threshold", sqlConcept: "Correlated subquery", technique: "Compare row to its own group aggregate" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `Amount`), return every order whose amount is " +
        "**strictly greater than the average order amount of that same customer**, largest first.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerId INT, Amount INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,100),(2,1,200),(3,1,300),(4,2,50),(5,2,150);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","Amount"],
          rows: [[1,1,100],[2,1,200],[3,1,300],[4,2,50],[5,2,150]] }
      ],
      expectedOutput: { columns: ["OrderId","CustomerId","Amount"], rows: [[3,1,300],[5,2,150]] },
      approaches: [
        {
          name: "Correlated subquery on customer (recommended)",
          perfNote: "The inner AVG correlates on CustomerId, so an index on (CustomerId, Amount) keeps each per-row probe a short range scan.",
          dialectNote: "",
          logic:
            "**What it asks.** Orders that beat the average of the *same customer's* orders — a moving threshold, one per customer.\n\n" +
            "**Why the naive idea fails.** A single uncorrelated `(SELECT AVG(Amount) FROM Orders)` compares every order to one global average, mixing customers together and giving the wrong per-customer answer.\n\n" +
            "**Key Idea.** Correlate the average to the outer row's `CustomerId` so each order is measured against its own customer's mean.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Orders` as the outer query, aliased `o`.\n" +
            "2. In WHERE, compute `(SELECT AVG(o2.Amount) FROM Orders o2 WHERE o2.CustomerId = o.CustomerId)`.\n" +
            "3. Keep rows where `o.Amount >` that per-customer average.\n" +
            "4. Order by amount descending.\n\n" +
            "**Why it works.** The correlation predicate `o2.CustomerId = o.CustomerId` re-scopes the aggregate to the outer row's customer, so the threshold slides per customer.\n\n" +
            "**Common Gotchas.** Integer `AVG` truncates in T-SQL; here customer 1 averages 600/3 = 200 and customer 2 averages 200/2 = 100 exactly, but CAST to DECIMAL when fractions matter.\n\n" +
            "**Performance.** One correlated aggregate per outer row; an index on `(CustomerId, Amount)` turns each into a small range scan.\n\n" +
            "**Interview mindset.** 'above the average *of its own group*' → correlated subquery on the grouping key, not a bare scalar subquery.",
          tsql:
            "SELECT o.OrderId, o.CustomerId, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.Amount > (                     -- this customer's own average\n" +
            "    SELECT AVG(o2.Amount)\n" +
            "    FROM dbo.Orders o2\n" +
            "    WHERE o2.CustomerId = o.CustomerId\n" +
            ")\n" +
            "ORDER BY o.Amount DESC;",
          clean:
            "SELECT o.OrderId, o.CustomerId, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.Amount > (SELECT AVG(o2.Amount) FROM dbo.Orders o2 WHERE o2.CustomerId = o.CustomerId)\n" +
            "ORDER BY o.Amount DESC;"
        },
        {
          name: "Window AVG in a CTE",
          perfNote: "Computes each customer's average once in a single partitioned pass, avoiding the per-row re-scan of the correlated form.",
          dialectNote: "",
          logic:
            "**Key Idea.** Attach the customer average to every order with `AVG(Amount) OVER (PARTITION BY CustomerId)`, then filter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, select each order plus `AVG(Amount) OVER (PARTITION BY CustomerId)` as `CustAvg`.\n" +
            "2. In the outer query keep rows where `Amount > CustAvg`.\n" +
            "3. Order by amount descending.\n\n" +
            "**Why it works.** The window average is computed per partition in one pass, so no correlated re-scan is needed; the filter then compares each order to its own customer's mean.\n\n" +
            "**Common Gotchas.** A window function cannot sit in WHERE directly — surface it through a CTE or derived table first.\n\n" +
            "**Performance.** A single partitioned window pass; usually beats the correlated subquery on large tables.\n\n" +
            "**Interview mindset.** When a group aggregate is reused as a threshold, a partitioned window is the one-pass alternative to correlation.",
          tsql:
            "WITH O AS (\n" +
            "    SELECT OrderId, CustomerId, Amount,\n" +
            "           AVG(Amount) OVER (PARTITION BY CustomerId) AS CustAvg  -- per-customer mean\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, CustomerId, Amount\n" +
            "FROM O\n" +
            "WHERE Amount > CustAvg\n" +
            "ORDER BY Amount DESC;",
          clean:
            "WITH O AS (\n" +
            "    SELECT OrderId, CustomerId, Amount, AVG(Amount) OVER (PARTITION BY CustomerId) AS CustAvg\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, CustomerId, Amount\n" +
            "FROM O\n" +
            "WHERE Amount > CustAvg\n" +
            "ORDER BY Amount DESC;"
        }
      ],
      walkthrough: [
        { step: "Average order amount per customer", note: "Customer 1 = (100+200+300)/3 = 200; customer 2 = (50+150)/2 = 100.",
          table: { columns: ["CustomerId","CustAvg"], rows: [[1,200],[2,100]] } },
        { step: "Keep Amount > that customer's average", note: "Order 3 (300 > 200) and order 5 (150 > 100) survive.",
          table: { columns: ["OrderId","CustomerId","Amount"], rows: [[3,1,300],[5,2,150]] } }
      ],
      patternRecognition: [
        "'above/below the average **of the same entity**' → correlated subquery on the entity key, or a partitioned window AVG."
      ],
      interviewRecall: [
        "A correlated subquery re-runs per outer row; the correlation predicate scopes its aggregate to that row's group.",
        "Window functions can't live in WHERE — surface them through a CTE first."
      ],
      commonMistakes: [
        "Comparing to the global average instead of the per-customer average.",
        "Using `>=` and admitting orders that merely equal the average."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-books-never-borrowed-2024",
      number: "DL 2301",
      platform: "DataLemur",
      title: "Books Never Borrowed in 2024",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Date & Time"],
      domains: ["Library Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Anti-join with date window", sqlConcept: "NOT EXISTS", technique: "Absence of matching row in a date range" },
      descriptionBrief:
        "Given **Books** and **Loans** (`BookId`, `LoanDate`), return the titles of books that were " +
        "**never borrowed during 2024** — no loan whose date falls in the 2024 calendar year.",
      schema: [
        { name: "Books", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Title", type: "VARCHAR(60)" } ] },
        { name: "Loans", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "BookId", type: "INT", note: "FK → Books.Id" },
          { name: "LoanDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Loans','U') IS NOT NULL DROP TABLE dbo.Loans;\n" +
        "IF OBJECT_ID('dbo.Books','U') IS NOT NULL DROP TABLE dbo.Books;\n" +
        "CREATE TABLE dbo.Books (Id INT PRIMARY KEY, Title VARCHAR(60));\n" +
        "CREATE TABLE dbo.Loans (Id INT PRIMARY KEY, BookId INT, LoanDate DATE);\n" +
        "INSERT INTO dbo.Books VALUES (1,'SQL Basics'),(2,'Data Mining'),(3,'ML Intro'),(4,'Old Tales');\n" +
        "INSERT INTO dbo.Loans VALUES\n" +
        "  (1,1,'2024-03-01'),(2,2,'2023-11-01'),(3,1,'2024-06-15'),(4,3,'2024-01-20');",
      sampleData: [
        { table: "Books", columns: ["Id","Title"], rows: [[1,"SQL Basics"],[2,"Data Mining"],[3,"ML Intro"],[4,"Old Tales"]] },
        { table: "Loans", columns: ["Id","BookId","LoanDate"],
          rows: [[1,1,"2024-03-01"],[2,2,"2023-11-01"],[3,1,"2024-06-15"],[4,3,"2024-01-20"]] }
      ],
      expectedOutput: { columns: ["Title"], rows: [["Data Mining"],["Old Tales"]] },
      approaches: [
        {
          name: "NOT EXISTS with a date range (recommended)",
          perfNote: "Anti-semi-join whose correlated probe carries the date filter; short-circuits on the first 2024 loan and is NULL-safe.",
          dialectNote: "A half-open `>= '2024-01-01' AND < '2025-01-01'` range is sargable and safe for DATE or DATETIME alike.",
          logic:
            "**What it asks.** Books with zero loans dated inside 2024. A book loaned only in 2023 (Data Mining) counts, and a book never loaned at all (Old Tales) counts.\n\n" +
            "**Why the naive idea fails.** `NOT IN (SELECT BookId FROM Loans WHERE ...)` breaks if any `BookId` is NULL, and wrapping `YEAR(LoanDate) = 2024` around the column makes the range non-sargable so it can't use an index on `LoanDate`.\n\n" +
            "**Key Idea.** Keep a book only when **no** loan row references it *within the 2024 window* — an anti-join expressed with `NOT EXISTS` and a half-open date range.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Books` as `b`.\n" +
            "2. Test a correlated `NOT EXISTS` against `Loans` on `BookId = b.Id` AND `LoanDate >= '2024-01-01' AND LoanDate < '2025-01-01'`.\n" +
            "3. Emit the title when no such loan exists.\n" +
            "4. Order by title.\n\n" +
            "**Why it works.** EXISTS returns TRUE/FALSE only, so a NULL `BookId` simply fails to match rather than poisoning the predicate the way NOT IN would; the date bounds restrict the match to 2024.\n\n" +
            "**Common Gotchas.** Use a half-open range, not `BETWEEN ... AND '2024-12-31'`, which would miss any time-of-day component on the last day. Put the date filter *inside* the EXISTS.\n\n" +
            "**Performance.** Anti-semi-join; an index on `Loans(BookId, LoanDate)` turns each probe into a bounded seek.\n\n" +
            "**Interview mindset.** 'never happened in a time window' → NOT EXISTS with a sargable half-open date range inside the correlated probe.",
          tsql:
            "SELECT b.Title\n" +
            "FROM dbo.Books b\n" +
            "WHERE NOT EXISTS (                       -- no 2024 loan for this book\n" +
            "    SELECT 1 FROM dbo.Loans l\n" +
            "    WHERE l.BookId = b.Id\n" +
            "      AND l.LoanDate >= '2024-01-01'\n" +
            "      AND l.LoanDate <  '2025-01-01'\n" +
            ")\n" +
            "ORDER BY b.Title;",
          clean:
            "SELECT b.Title\n" +
            "FROM dbo.Books b\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.Loans l\n" +
            "    WHERE l.BookId = b.Id\n" +
            "      AND l.LoanDate >= '2024-01-01' AND l.LoanDate < '2025-01-01'\n" +
            ")\n" +
            "ORDER BY b.Title;"
        },
        {
          name: "LEFT JOIN filtered subquery … IS NULL",
          perfNote: "Outer-joins to the pre-filtered 2024 loans and keeps the non-matches; reads well and yields the same anti-join plan.",
          dialectNote: "",
          logic:
            "**Key Idea.** First reduce `Loans` to its 2024 rows, LEFT JOIN books to that set, and keep books whose join produced no match.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Derive `L2024` = loans with `LoanDate` in 2024.\n" +
            "2. `LEFT JOIN` books to `L2024` on `BookId = Id`.\n" +
            "3. Keep rows where `L2024.Id IS NULL` (no 2024 loan matched).\n" +
            "4. Order by title.\n\n" +
            "**Why it works.** A LEFT JOIN preserves unmatched books with NULLs on the loan side; filtering the loan PK to NULL isolates exactly the books with no 2024 loan.\n\n" +
            "**Common Gotchas.** Apply the date filter *before or inside* the join, not in the outer WHERE — a WHERE on the loan date would turn the LEFT JOIN back into an inner join and drop the never-borrowed books.\n\n" +
            "**Performance.** Comparable to NOT EXISTS; the optimizer often produces the same anti-join.\n\n" +
            "**Interview mindset.** The classic 'anti-join via LEFT JOIN / IS NULL', with the date predicate kept out of the outer WHERE.",
          tsql:
            "SELECT b.Title\n" +
            "FROM dbo.Books b\n" +
            "LEFT JOIN (\n" +
            "    SELECT Id, BookId FROM dbo.Loans\n" +
            "    WHERE LoanDate >= '2024-01-01' AND LoanDate < '2025-01-01'\n" +
            ") l ON l.BookId = b.Id\n" +
            "WHERE l.Id IS NULL               -- no 2024 loan matched\n" +
            "ORDER BY b.Title;",
          clean:
            "SELECT b.Title\n" +
            "FROM dbo.Books b\n" +
            "LEFT JOIN (\n" +
            "    SELECT Id, BookId FROM dbo.Loans\n" +
            "    WHERE LoanDate >= '2024-01-01' AND LoanDate < '2025-01-01'\n" +
            ") l ON l.BookId = b.Id\n" +
            "WHERE l.Id IS NULL\n" +
            "ORDER BY b.Title;"
        }
      ],
      walkthrough: [
        { step: "Which books were loaned in 2024", note: "SQL Basics (Mar & Jun 2024) and ML Intro (Jan 2024). Data Mining's only loan is 2023.",
          table: { columns: ["BookId","LoanDate"], rows: [[1,"2024-03-01"],[1,"2024-06-15"],[3,"2024-01-20"]] } },
        { step: "Keep books with no 2024 loan", note: "Data Mining (only 2023) and Old Tales (never loaned) survive.",
          table: { columns: ["Title"], rows: [["Data Mining"],["Old Tales"]] } }
      ],
      patternRecognition: [
        "'never happened during <period>' → anti-join (NOT EXISTS or LEFT JOIN … IS NULL) with a sargable half-open date range."
      ],
      interviewRecall: [
        "Half-open `>= start AND < next-start` is sargable; `YEAR(col) = 2024` is not.",
        "In a LEFT-JOIN anti-join, filtering the right table's date in the outer WHERE silently turns it into an inner join."
      ],
      commonMistakes: [
        "Wrapping the date column in `YEAR(...)`, defeating an index on LoanDate.",
        "Putting the loan-date filter in the outer WHERE of a LEFT JOIN and dropping the never-borrowed books."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-high-rated-genres",
      number: "SS 10505",
      platform: "StrataScratch",
      title: "Well-Reviewed Genres",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["Streaming Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group then filter on aggregates", sqlConcept: "GROUP BY + HAVING", technique: "Filter groups by multiple aggregate conditions" },
      descriptionBrief:
        "Given a **Movies** table (`Genre`, `Rating`), return each genre that has **at least two " +
        "movies** and an **average rating of 8 or higher**, together with its average rating and " +
        "movie count, ordered by genre.",
      schema: [
        { name: "Movies", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Genre", type: "VARCHAR(30)" },
          { name: "Rating", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Movies','U') IS NOT NULL DROP TABLE dbo.Movies;\n" +
        "CREATE TABLE dbo.Movies (Id INT PRIMARY KEY, Genre VARCHAR(30), Rating INT);\n" +
        "INSERT INTO dbo.Movies VALUES\n" +
        "  (1,'Drama',9),(2,'Drama',9),(3,'Comedy',7),(4,'Comedy',6),\n" +
        "  (5,'Horror',9),(6,'SciFi',8),(7,'SciFi',8),(8,'SciFi',8);",
      sampleData: [
        { table: "Movies", columns: ["Id","Genre","Rating"],
          rows: [[1,"Drama",9],[2,"Drama",9],[3,"Comedy",7],[4,"Comedy",6],[5,"Horror",9],[6,"SciFi",8],[7,"SciFi",8],[8,"SciFi",8]] }
      ],
      expectedOutput: { columns: ["Genre","AvgRating","MovieCount"], rows: [["Drama",9,2],["SciFi",8,3]] },
      approaches: [
        {
          name: "GROUP BY … HAVING with two conditions (recommended)",
          perfNote: "Single grouped aggregate; both filters live in HAVING and are evaluated after counting. An index on Genre supports a stream aggregate.",
          dialectNote: "",
          logic:
            "**What it asks.** Genres that clear *two* aggregate bars at once — count >= 2 and average rating >= 8.\n\n" +
            "**Why the naive idea fails.** WHERE cannot test `AVG(Rating)` or `COUNT(*)` — those values don't exist until the rows are grouped, so the conditions must be HAVING. A WHERE on Rating would filter individual movies, not whole genres.\n\n" +
            "**Key Idea.** Group by genre, compute both aggregates, and keep only the groups that satisfy both HAVING predicates.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Genre`.\n" +
            "2. Compute `AVG(Rating)` and `COUNT(*)` per genre.\n" +
            "3. `HAVING COUNT(*) >= 2 AND AVG(Rating) >= 8`.\n" +
            "4. Project genre, average, count; order by genre.\n\n" +
            "**Why it works.** HAVING filters on aggregate results, so both the size threshold and the quality threshold apply to the group as a whole.\n\n" +
            "**Common Gotchas.** `Rating` is INT, so `AVG(Rating)` truncates toward zero — Comedy's (7+6)/2 = 6.5 becomes 6, and Horror is excluded by the count rule, not the average. CAST to DECIMAL if you need a fractional average.\n\n" +
            "**Performance.** One group-aggregate pass; the two HAVING conditions cost nothing extra.\n\n" +
            "**Interview mindset.** 'groups meeting several aggregate conditions' → GROUP BY key HAVING cond1 AND cond2.",
          tsql:
            "SELECT Genre,\n" +
            "       AVG(Rating) AS AvgRating,\n" +
            "       COUNT(*)    AS MovieCount\n" +
            "FROM dbo.Movies\n" +
            "GROUP BY Genre\n" +
            "HAVING COUNT(*) >= 2 AND AVG(Rating) >= 8   -- both bars must clear\n" +
            "ORDER BY Genre;",
          clean:
            "SELECT Genre, AVG(Rating) AS AvgRating, COUNT(*) AS MovieCount\n" +
            "FROM dbo.Movies\n" +
            "GROUP BY Genre\n" +
            "HAVING COUNT(*) >= 2 AND AVG(Rating) >= 8\n" +
            "ORDER BY Genre;"
        }
      ],
      walkthrough: [
        { step: "Aggregate per genre", note: "Drama avg 9 / 2 films; Comedy avg 6 / 2; Horror avg 9 / 1; SciFi avg 8 / 3.",
          table: { columns: ["Genre","AvgRating","MovieCount"], rows: [["Comedy",6,2],["Drama",9,2],["Horror",9,1],["SciFi",8,3]] } },
        { step: "Keep COUNT(*) >= 2 AND AVG(Rating) >= 8", note: "Comedy fails the average; Horror fails the count; Drama and SciFi pass both.",
          table: { columns: ["Genre","AvgRating","MovieCount"], rows: [["Drama",9,2],["SciFi",8,3]] } }
      ],
      patternRecognition: [
        "'groups meeting a size AND a quality threshold' → GROUP BY key HAVING COUNT(*) >= n AND AVG(x) >= t."
      ],
      interviewRecall: [
        "WHERE filters rows before grouping; HAVING filters groups after aggregation — combine multiple aggregate tests with AND in HAVING.",
        "Integer AVG truncates in T-SQL; CAST to DECIMAL for a fractional average."
      ],
      commonMistakes: [
        "Putting `AVG(Rating) >= 8` in WHERE (aggregates are illegal there).",
        "Forgetting the count rule and letting a single high-rated movie form a 'genre'."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-above-any-premium",
      number: "DL 2166",
      platform: "DataLemur",
      title: "Products Pricier Than Some Premium Item",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries"],
      domains: ["Retail Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Quantified comparison", sqlConcept: "> ANY", technique: "Compare to at least one value in a set" },
      descriptionBrief:
        "Given a **Products** table (`Category`, `Price`), return every product priced **higher than " +
        "at least one product in the 'Premium' category**, most expensive first.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "Price", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50), Category VARCHAR(30), Price INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'A','Standard',15),(2,'B','Standard',25),(3,'P','Premium',20),\n" +
        "  (4,'Q','Premium',30),(5,'C','Standard',35);",
      sampleData: [
        { table: "Products", columns: ["Id","Name","Category","Price"],
          rows: [[1,"A","Standard",15],[2,"B","Standard",25],[3,"P","Premium",20],[4,"Q","Premium",30],[5,"C","Standard",35]] }
      ],
      expectedOutput: { columns: ["Name","Price"], rows: [["C",35],["Q",30],["B",25]] },
      approaches: [
        {
          name: "> ANY (recommended)",
          perfNote: "Quantified predicate; SQL Server evaluates the Premium set once and each row need only beat its minimum.",
          dialectNote: "In T-SQL `ANY` and `SOME` are synonyms.",
          logic:
            "**What it asks.** Products whose price exceeds *at least one* Premium product — i.e., more than the cheapest Premium item.\n\n" +
            "**Why the naive idea fails.** `Price > (SELECT Price FROM Products WHERE Category = 'Premium')` raises a 'subquery returned more than one value' error because the Premium set holds several prices, not one.\n\n" +
            "**Key Idea.** `> ANY (set)` is true when the value beats the *minimum* of the set — exactly 'higher than some of them'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Form the Premium price set `(SELECT Price FROM Products WHERE Category = 'Premium')` → {20, 30}.\n" +
            "2. Keep rows where `Price > ANY` that set (i.e., Price > 20).\n" +
            "3. Order by price descending.\n\n" +
            "**Why it works.** `> ANY` requires the comparison to hold for *some* member, which is equivalent to beating the smallest.\n\n" +
            "**Common Gotchas.** If the set were empty, `> ANY` is vacuously FALSE (no rows qualify) — the opposite of `> ALL`. A NULL in the set leaves the comparison UNKNOWN for rows that don't already beat the minimum. Note the Premium item Q (30) beats the other Premium item P (20), so it qualifies too.\n\n" +
            "**Performance.** One scan of the Premium set to get its min, then a filtered scan.\n\n" +
            "**Interview mindset.** '> at least one value in a set' → `> ANY` (= > the minimum); '> every value' → `> ALL` (= > the maximum).",
          tsql:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > ANY (                    -- beat at least one Premium price\n" +
            "    SELECT Price FROM dbo.Products WHERE Category = 'Premium'\n" +
            ")\n" +
            "ORDER BY Price DESC;",
          clean:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > ANY (SELECT Price FROM dbo.Products WHERE Category = 'Premium')\n" +
            "ORDER BY Price DESC;"
        },
        {
          name: "> MIN scalar subquery",
          perfNote: "Aggregates the set to a single number first; avoids the empty-set and NULL subtleties of ANY and is often the clearest form.",
          dialectNote: "",
          logic:
            "**Key Idea.** 'Higher than some Premium item' is the same as 'higher than the minimum Premium price', a single scalar.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `(SELECT MIN(Price) FROM Products WHERE Category = 'Premium')` → 20.\n" +
            "2. Keep rows where `Price >` that value.\n" +
            "3. Order by price descending.\n\n" +
            "**Why it works.** Beating the minimum of a set is logically identical to beating at least one element of it.\n\n" +
            "**Common Gotchas.** When no Premium rows exist, `MIN` returns NULL and the comparison drops all rows — whereas `> ANY` over an empty set is already FALSE for all rows, so both agree here but for different reasons.\n\n" +
            "**Performance.** A single MIN aggregate plus a filtered scan; typically the tidiest plan.\n\n" +
            "**Interview mindset.** Rewriting `> ANY` as `> MIN` (and `> ALL` as `> MAX`) proves you understand the quantifiers and sidesteps their edge cases.",
          tsql:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > (SELECT MIN(Price) FROM dbo.Products WHERE Category = 'Premium')\n" +
            "ORDER BY Price DESC;",
          clean:
            "SELECT Name, Price\n" +
            "FROM dbo.Products\n" +
            "WHERE Price > (SELECT MIN(Price) FROM dbo.Products WHERE Category = 'Premium')\n" +
            "ORDER BY Price DESC;"
        }
      ],
      walkthrough: [
        { step: "Premium price set and its minimum", note: "Premium = {20, 30}; the minimum is 20.",
          table: { columns: ["MinPremium"], rows: [[20]] } },
        { step: "Keep Price > 20", note: "C(35), Q(30) and B(25) beat some Premium item; A(15) and P(20) do not.",
          table: { columns: ["Name","Price"], rows: [["C",35],["Q",30],["B",25]] } }
      ],
      patternRecognition: [
        "'greater than **any/some** of a set' → `> ANY` (= `> MIN`); 'greater than **all**' → `> ALL` (= `> MAX`)."
      ],
      interviewRecall: [
        "`x > ANY (set)` ⇔ `x > MIN(set)`; `x > ALL (set)` ⇔ `x > MAX(set)`.",
        "Empty set: `> ANY` is FALSE for all rows, `> ALL` is TRUE for all rows — MIN/MAX turn to NULL instead."
      ],
      commonMistakes: [
        "Comparing to a multi-row subquery with a plain `>` and hitting the 'more than one value' error.",
        "Confusing `> ANY` (beat the minimum) with `> ALL` (beat the maximum)."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-dept-headcount-scalar",
      number: "SS 10611",
      platform: "StrataScratch",
      title: "Department Headcount via Scalar Subquery",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Aggregation & Grouping"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Per-row derived value", sqlConcept: "Scalar subquery in SELECT", technique: "Correlated count projected as a column" },
      descriptionBrief:
        "Given **Department** and **Employee**, list **every department** with the **number of " +
        "employees** assigned to it — including departments with zero employees — ordered by name.",
      schema: [
        { name: "Department", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "DeptId", type: "INT", note: "FK → Department.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "IF OBJECT_ID('dbo.Department','U') IS NOT NULL DROP TABLE dbo.Department;\n" +
        "CREATE TABLE dbo.Department (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), DeptId INT);\n" +
        "INSERT INTO dbo.Department VALUES (1,'Sales'),(2,'Legal'),(3,'Research');\n" +
        "INSERT INTO dbo.Employee VALUES (1,'Ann',1),(2,'Bob',1),(3,'Cy',3);",
      sampleData: [
        { table: "Department", columns: ["Id","Name"], rows: [[1,"Sales"],[2,"Legal"],[3,"Research"]] },
        { table: "Employee", columns: ["Id","Name","DeptId"], rows: [[1,"Ann",1],[2,"Bob",1],[3,"Cy",3]] }
      ],
      expectedOutput: { columns: ["Name","EmpCount"], rows: [["Legal",0],["Research",1],["Sales",2]] },
      approaches: [
        {
          name: "Scalar subquery in SELECT (recommended)",
          perfNote: "A correlated COUNT per department; because the parent drives the query, zero-employee departments naturally return 0, not a missing row.",
          dialectNote: "",
          logic:
            "**What it asks.** One row per department with its employee count, keeping departments that have nobody (Legal → 0).\n\n" +
            "**Why the naive idea fails.** An inner `JOIN ... GROUP BY` drops Legal entirely because it has no employee rows to group; you'd silently lose the empty department.\n\n" +
            "**Key Idea.** Drive the query from `Department` and compute the count with a correlated scalar subquery in the SELECT list, so every department is emitted regardless of headcount.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Department` as `d`.\n" +
            "2. In the SELECT list, add `(SELECT COUNT(*) FROM Employee e WHERE e.DeptId = d.Id) AS EmpCount`.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** The subquery is evaluated once per department row; COUNT(*) over an empty match returns 0, so no department disappears.\n\n" +
            "**Common Gotchas.** A scalar subquery in SELECT must return exactly one value per outer row — an aggregate like COUNT guarantees that. Use COUNT, not COUNT + an extra column.\n\n" +
            "**Performance.** One correlated count per department; an index on `Employee.DeptId` makes each a fast seek.\n\n" +
            "**Interview mindset.** 'a per-row derived count, keeping rows with none' → correlated aggregate in the SELECT list.",
          tsql:
            "SELECT d.Name,\n" +
            "       (SELECT COUNT(*)                 -- employees in THIS department\n" +
            "        FROM dbo.Employee e\n" +
            "        WHERE e.DeptId = d.Id) AS EmpCount\n" +
            "FROM dbo.Department d\n" +
            "ORDER BY d.Name;",
          clean:
            "SELECT d.Name,\n" +
            "       (SELECT COUNT(*) FROM dbo.Employee e WHERE e.DeptId = d.Id) AS EmpCount\n" +
            "FROM dbo.Department d\n" +
            "ORDER BY d.Name;"
        },
        {
          name: "LEFT JOIN … GROUP BY",
          perfNote: "Single outer join then a grouped count; the LEFT JOIN preserves empty departments and COUNT of the child key returns 0 for them.",
          dialectNote: "",
          logic:
            "**Key Idea.** LEFT JOIN each department to its employees and count a non-null employee column so unmatched departments score 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN Employee e ON e.DeptId = d.Id`.\n" +
            "2. `GROUP BY d.Name`.\n" +
            "3. `COUNT(e.Id)` — counts matched employees, 0 when none matched.\n" +
            "4. Order by name.\n\n" +
            "**Why it works.** LEFT JOIN keeps every department; `COUNT(e.Id)` ignores the NULL produced for an unmatched department, yielding 0.\n\n" +
            "**Common Gotchas.** Use `COUNT(e.Id)`, not `COUNT(*)` — `COUNT(*)` would count the single NULL-padded row for Legal as 1.\n\n" +
            "**Performance.** One hash/merge join plus a grouped aggregate; usually beats a per-row correlated count on large tables.\n\n" +
            "**Interview mindset.** The set-based counterpart; the `COUNT(child_key)` vs `COUNT(*)` distinction is the trap to name.",
          tsql:
            "SELECT d.Name, COUNT(e.Id) AS EmpCount   -- COUNT of the child key -> 0 for empty depts\n" +
            "FROM dbo.Department d\n" +
            "LEFT JOIN dbo.Employee e ON e.DeptId = d.Id\n" +
            "GROUP BY d.Name\n" +
            "ORDER BY d.Name;",
          clean:
            "SELECT d.Name, COUNT(e.Id) AS EmpCount\n" +
            "FROM dbo.Department d\n" +
            "LEFT JOIN dbo.Employee e ON e.DeptId = d.Id\n" +
            "GROUP BY d.Name\n" +
            "ORDER BY d.Name;"
        }
      ],
      walkthrough: [
        { step: "Count employees per department", note: "Sales has Ann & Bob (2), Research has Cy (1), Legal has none (0).",
          table: { columns: ["Name","EmpCount"], rows: [["Sales",2],["Research",1],["Legal",0]] } },
        { step: "Order by name", note: "Legal (0) is retained even with no employees.",
          table: { columns: ["Name","EmpCount"], rows: [["Legal",0],["Research",1],["Sales",2]] } }
      ],
      patternRecognition: [
        "'a derived count per parent, keeping parents with none' → correlated aggregate in SELECT, or LEFT JOIN + COUNT(child_key)."
      ],
      interviewRecall: [
        "A scalar subquery in SELECT must return exactly one value per outer row — aggregates guarantee that.",
        "`COUNT(child.key)` returns 0 for unmatched LEFT-JOIN rows; `COUNT(*)` would return 1."
      ],
      commonMistakes: [
        "Using an inner join + GROUP BY and dropping departments with zero employees.",
        "Writing `COUNT(*)` on the LEFT JOIN and reporting 1 instead of 0 for empty departments."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-latest-order-per-customer",
      number: "DL 2277",
      platform: "DataLemur",
      title: "Each Customer's Most Recent Order",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Ranking"],
      domains: ["E-commerce Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Top-per-group via anti-join", sqlConcept: "NOT EXISTS on a later row", technique: "Keep the row with no later peer" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `OrderDate`, `Amount`), return the **most recent " +
        "order for each customer** (order dates are distinct within a customer).",
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
        "  (1,1,'2024-01-05',100),(2,1,'2024-03-10',200),\n" +
        "  (3,2,'2024-02-01',50),(4,2,'2024-02-20',75),(5,2,'2024-01-15',30);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","OrderDate","Amount"],
          rows: [[1,1,"2024-01-05",100],[2,1,"2024-03-10",200],[3,2,"2024-02-01",50],[4,2,"2024-02-20",75],[5,2,"2024-01-15",30]] }
      ],
      expectedOutput: { columns: ["OrderId","CustomerId","OrderDate","Amount"],
        rows: [[2,1,"2024-03-10",200],[4,2,"2024-02-20",75]] },
      approaches: [
        {
          name: "NOT EXISTS a later order (recommended)",
          perfNote: "Keeps a row only when no same-customer order is more recent; short-circuits on the first later order and needs no window sort.",
          dialectNote: "",
          logic:
            "**What it asks.** For each customer, the single order with the maximum date — their latest purchase.\n\n" +
            "**Why the naive idea fails.** A global `MAX(OrderDate)` returns one date for the whole table; joining on the per-customer max via a separate aggregate works but repeats the grouping and is easy to mis-correlate.\n\n" +
            "**Key Idea.** An order is the customer's most recent exactly when **no** order by the same customer has a later date — an anti-join against 'a later peer'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Orders` as `o`.\n" +
            "2. Test `NOT EXISTS (SELECT 1 FROM Orders o2 WHERE o2.CustomerId = o.CustomerId AND o2.OrderDate > o.OrderDate)`.\n" +
            "3. Keep rows with no later same-customer order.\n" +
            "4. Order by customer.\n\n" +
            "**Why it works.** The correlated `o2.OrderDate > o.OrderDate` finds any strictly-later order; its absence means the current row holds the group maximum.\n\n" +
            "**Common Gotchas.** With duplicate max dates in a customer this returns *all* of them; the prompt guarantees distinct dates so exactly one row survives per customer. Use `>` (strictly later), not `>=`, or nothing survives.\n\n" +
            "**Performance.** Anti-semi-join; an index on `(CustomerId, OrderDate)` turns each probe into a bounded seek.\n\n" +
            "**Interview mindset.** 'the latest/most-extreme row per group' → keep rows with NO strictly-more-extreme peer via NOT EXISTS.",
          tsql:
            "SELECT o.OrderId, o.CustomerId, o.OrderDate, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE NOT EXISTS (                      -- no later order for this customer\n" +
            "    SELECT 1 FROM dbo.Orders o2\n" +
            "    WHERE o2.CustomerId = o.CustomerId\n" +
            "      AND o2.OrderDate > o.OrderDate\n" +
            ")\n" +
            "ORDER BY o.CustomerId;",
          clean:
            "SELECT o.OrderId, o.CustomerId, o.OrderDate, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.Orders o2\n" +
            "    WHERE o2.CustomerId = o.CustomerId AND o2.OrderDate > o.OrderDate\n" +
            ")\n" +
            "ORDER BY o.CustomerId;"
        },
        {
          name: "ROW_NUMBER partitioned",
          perfNote: "One partitioned window sort; number each customer's orders newest-first and keep row 1. The modern default when window functions are available.",
          dialectNote: "",
          logic:
            "**Key Idea.** Number each customer's orders by descending date and keep the first.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC)` as `rn`.\n" +
            "2. Keep rows where `rn = 1`.\n" +
            "3. Order by customer.\n\n" +
            "**Why it works.** PARTITION BY restarts the numbering per customer, and `rn = 1` under a descending date order is the newest order.\n\n" +
            "**Common Gotchas.** You cannot filter `ROW_NUMBER()` in WHERE directly — wrap it in a CTE or subquery. Add a tie-break (e.g. OrderId) if dates could repeat, to keep exactly one row.\n\n" +
            "**Performance.** A single partitioned sort, O(n log n); an index on `(CustomerId, OrderDate DESC)` supplies the order.\n\n" +
            "**Interview mindset.** Offer both: the NOT EXISTS anti-join and the ROW_NUMBER window, then pick by engine support and index shape.",
          tsql:
            "WITH R AS (\n" +
            "    SELECT OrderId, CustomerId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId\n" +
            "                              ORDER BY OrderDate DESC) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, CustomerId, OrderDate, Amount\n" +
            "FROM R\n" +
            "WHERE rn = 1\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH R AS (\n" +
            "    SELECT OrderId, CustomerId, OrderDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT OrderId, CustomerId, OrderDate, Amount\n" +
            "FROM R\n" +
            "WHERE rn = 1\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Does a later same-customer order exist?", note: "Customer 1: order 2 (Mar) has none after it; order 1 does. Customer 2: order 4 (Feb 20) is latest.",
          table: { columns: ["OrderId","CustomerId","OrderDate","HasLater"],
            rows: [[1,1,"2024-01-05","yes"],[2,1,"2024-03-10","no"],[3,2,"2024-02-01","yes"],[4,2,"2024-02-20","no"],[5,2,"2024-01-15","yes"]] } },
        { step: "Keep rows with no later order", note: "Order 2 for customer 1 and order 4 for customer 2 survive.",
          table: { columns: ["OrderId","CustomerId","OrderDate","Amount"], rows: [[2,1,"2024-03-10",200],[4,2,"2024-02-20",75]] } }
      ],
      patternRecognition: [
        "'the latest / max-per-group row' → NOT EXISTS a strictly-more-extreme peer, or ROW_NUMBER() = 1 partitioned."
      ],
      interviewRecall: [
        "Keeping rows with no strictly-greater peer selects the per-group maximum without a window function.",
        "ROW_NUMBER must be filtered in a CTE/derived table, never in WHERE."
      ],
      commonMistakes: [
        "Using `>=` in the NOT EXISTS and eliminating every row.",
        "Comparing to the global MAX(OrderDate) and returning only the single newest order overall."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-fully-booked-flights",
      number: "SS 10733",
      platform: "StrataScratch",
      title: "Fully Booked Flights",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries"],
      domains: ["Airline Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Anti-join on a condition", sqlConcept: "NOT EXISTS", technique: "No child row satisfies a predicate" },
      descriptionBrief:
        "Given **Flights** and **Seats** (`FlightId`, `IsAvailable`), return the flight numbers of " +
        "flights that are **fully booked** — flights with **no available seat**.",
      schema: [
        { name: "Flights", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "FlightNo", type: "VARCHAR(10)" } ] },
        { name: "Seats", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "FlightId", type: "INT", note: "FK → Flights.Id" },
          { name: "IsAvailable", type: "BIT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Seats','U') IS NOT NULL DROP TABLE dbo.Seats;\n" +
        "IF OBJECT_ID('dbo.Flights','U') IS NOT NULL DROP TABLE dbo.Flights;\n" +
        "CREATE TABLE dbo.Flights (Id INT PRIMARY KEY, FlightNo VARCHAR(10));\n" +
        "CREATE TABLE dbo.Seats (Id INT PRIMARY KEY, FlightId INT, IsAvailable BIT);\n" +
        "INSERT INTO dbo.Flights VALUES (1,'AA100'),(2,'BB200'),(3,'CC300');\n" +
        "INSERT INTO dbo.Seats VALUES (1,1,0),(2,1,0),(3,2,1),(4,2,0),(5,3,0);",
      sampleData: [
        { table: "Flights", columns: ["Id","FlightNo"], rows: [[1,"AA100"],[2,"BB200"],[3,"CC300"]] },
        { table: "Seats", columns: ["Id","FlightId","IsAvailable"], rows: [[1,1,0],[2,1,0],[3,2,1],[4,2,0],[5,3,0]] }
      ],
      expectedOutput: { columns: ["FlightNo"], rows: [["AA100"],["CC300"]] },
      approaches: [
        {
          name: "NOT EXISTS an available seat (recommended)",
          perfNote: "Anti-semi-join; short-circuits on the first available seat, so a flight with any open seat is rejected immediately.",
          dialectNote: "",
          logic:
            "**What it asks.** Flights whose every seat is taken — no seat has `IsAvailable = 1`. AA100 (both taken) and CC300 (its one seat taken) qualify; BB200 has an open seat.\n\n" +
            "**Why the naive idea fails.** Filtering `WHERE IsAvailable = 0` on a join returns *seat* rows, not flights, and a flight with a mix of taken and open seats would still surface via its taken seats. You need a condition on the *whole* set of a flight's seats.\n\n" +
            "**Key Idea.** A flight is fully booked exactly when **no** seat of that flight is available — an anti-join expressed with `NOT EXISTS` on the 'available seat' predicate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Flights` as `f`.\n" +
            "2. Test `NOT EXISTS (SELECT 1 FROM Seats s WHERE s.FlightId = f.Id AND s.IsAvailable = 1)`.\n" +
            "3. Keep flights with no available seat.\n" +
            "4. Order by flight number.\n\n" +
            "**Why it works.** EXISTS returns TRUE the moment it finds an available seat; NOT EXISTS therefore keeps only flights where that search comes up empty.\n\n" +
            "**Common Gotchas.** A flight with *no seat rows at all* would also pass NOT EXISTS — decide whether 'no seats' should count as fully booked; here every flight has seats. Put the `IsAvailable = 1` filter inside the probe.\n\n" +
            "**Performance.** Anti-semi-join; an index on `Seats(FlightId, IsAvailable)` turns each probe into a seek that stops at the first open seat.\n\n" +
            "**Interview mindset.** 'every child fails / none satisfies the condition' → NOT EXISTS on the positive predicate.",
          tsql:
            "SELECT f.FlightNo\n" +
            "FROM dbo.Flights f\n" +
            "WHERE NOT EXISTS (                      -- no available seat on this flight\n" +
            "    SELECT 1 FROM dbo.Seats s\n" +
            "    WHERE s.FlightId = f.Id AND s.IsAvailable = 1\n" +
            ")\n" +
            "ORDER BY f.FlightNo;",
          clean:
            "SELECT f.FlightNo\n" +
            "FROM dbo.Flights f\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Seats s WHERE s.FlightId = f.Id AND s.IsAvailable = 1)\n" +
            "ORDER BY f.FlightNo;"
        },
        {
          name: "GROUP BY … HAVING SUM = 0",
          perfNote: "Aggregates each flight's seats and keeps those with zero available; one grouped pass, and it naturally excludes flights with no seats.",
          dialectNote: "`SUM` needs an INT, so CAST the BIT to INT before summing.",
          logic:
            "**Key Idea.** Sum the availability flags per flight and keep flights whose total is zero.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Join `Flights` to `Seats`.\n" +
            "2. `GROUP BY f.FlightNo`.\n" +
            "3. `HAVING SUM(CAST(s.IsAvailable AS INT)) = 0` — no seat contributes a 1.\n" +
            "4. Order by flight number.\n\n" +
            "**Why it works.** Each available seat adds 1 to the sum; a sum of 0 means every seat is taken.\n\n" +
            "**Common Gotchas.** `SUM` over a BIT column errors — CAST to INT. This inner join drops flights with no seat rows, which differs from the NOT EXISTS form; choose the behavior you want.\n\n" +
            "**Performance.** One join plus a grouped aggregate; comparable on modest data.\n\n" +
            "**Interview mindset.** When 'none satisfy a condition' can be phrased as 'the count/sum of satisfiers is zero', HAVING is the aggregate route.",
          tsql:
            "SELECT f.FlightNo\n" +
            "FROM dbo.Flights f\n" +
            "JOIN dbo.Seats s ON s.FlightId = f.Id\n" +
            "GROUP BY f.FlightNo\n" +
            "HAVING SUM(CAST(s.IsAvailable AS INT)) = 0   -- zero seats available\n" +
            "ORDER BY f.FlightNo;",
          clean:
            "SELECT f.FlightNo\n" +
            "FROM dbo.Flights f\n" +
            "JOIN dbo.Seats s ON s.FlightId = f.Id\n" +
            "GROUP BY f.FlightNo\n" +
            "HAVING SUM(CAST(s.IsAvailable AS INT)) = 0\n" +
            "ORDER BY f.FlightNo;"
        }
      ],
      walkthrough: [
        { step: "Available seats per flight", note: "AA100: 0 available (both taken). BB200: 1 available. CC300: 0 available.",
          table: { columns: ["FlightNo","AvailableSeats"], rows: [["AA100",0],["BB200",1],["CC300",0]] } },
        { step: "Keep flights with none available", note: "AA100 and CC300 are fully booked; BB200 has an open seat.",
          table: { columns: ["FlightNo"], rows: [["AA100"],["CC300"]] } }
      ],
      patternRecognition: [
        "'none of the children satisfy a condition' → NOT EXISTS on the positive predicate, or GROUP BY … HAVING SUM(flag) = 0."
      ],
      interviewRecall: [
        "NOT EXISTS also passes parents with no children; HAVING over an inner join excludes them — pick deliberately.",
        "SUM over a BIT column errors in T-SQL; CAST to INT first."
      ],
      commonMistakes: [
        "Filtering `WHERE IsAvailable = 0` on a join and returning seat rows or partially-booked flights.",
        "Summing a BIT column without casting, or ignoring flights that have no seats at all."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-recent-active-customers",
      number: "DL 2312",
      platform: "DataLemur",
      title: "Customers Active in the Last 30 Days",
      difficulty: "Medium",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Date & Time"],
      domains: ["SaaS Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Relative date window", sqlConcept: "Scalar subquery + DATEADD", technique: "Filter to a window anchored on the max date" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `OrderDate`), return the **distinct customers who " +
        "placed an order within 30 days of the most recent order date in the table**, ordered by id.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerId INT, OrderDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,101,'2024-06-30'),(2,102,'2024-06-20'),(3,103,'2024-05-01'),\n" +
        "  (4,101,'2024-06-15'),(5,104,'2024-04-10');",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","OrderDate"],
          rows: [[1,101,"2024-06-30"],[2,102,"2024-06-20"],[3,103,"2024-05-01"],[4,101,"2024-06-15"],[5,104,"2024-04-10"]] }
      ],
      expectedOutput: { columns: ["CustomerId"], rows: [[101],[102]] },
      approaches: [
        {
          name: "Scalar subquery + DATEADD (recommended)",
          perfNote: "The MAX(OrderDate) subquery is uncorrelated, so SQL Server evaluates it once and reuses the anchor across the scan.",
          dialectNote: "`DATEADD(DAY, -30, anchor)` is the T-SQL date-shift; other dialects use `anchor - INTERVAL '30 day'`.",
          logic:
            "**What it asks.** Customers with any order in the trailing 30-day window ending at the latest order date in the data (here 2024-06-30, so the window opens 2024-05-31).\n\n" +
            "**Why the naive idea fails.** Hard-coding `WHERE OrderDate >= '2024-05-31'` bakes in today's data and breaks the moment new orders arrive; using `GETDATE()` anchors on the wall clock, not on the dataset's own most recent activity.\n\n" +
            "**Key Idea.** Anchor the window on `(SELECT MAX(OrderDate) FROM Orders)` and shift back 30 days with `DATEADD`, then keep orders on or after that boundary.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute the anchor `(SELECT MAX(OrderDate) FROM Orders)` → 2024-06-30.\n" +
            "2. Boundary = `DATEADD(DAY, -30, anchor)` → 2024-05-31.\n" +
            "3. Keep orders where `OrderDate >=` that boundary.\n" +
            "4. `SELECT DISTINCT CustomerId` and order by id.\n\n" +
            "**Why it works.** Anchoring on the data's own max date makes the window self-adjusting; the DISTINCT collapses a customer's multiple recent orders to one row.\n\n" +
            "**Common Gotchas.** `DATEADD` on a DATE stays a DATE; keep the comparison inclusive (`>=`) to include the boundary day. Don't wrap `OrderDate` in a function or the filter stops being sargable.\n\n" +
            "**Performance.** One aggregate to find the anchor plus a filtered scan; an index on `OrderDate` supports the range.\n\n" +
            "**Interview mindset.** 'within N days of the latest activity' → anchor on MAX(date) via a scalar subquery, shift with DATEADD, keep a sargable range.",
          tsql:
            "SELECT DISTINCT CustomerId\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate >= DATEADD(DAY, -30, (SELECT MAX(OrderDate) FROM dbo.Orders))\n" +
            "ORDER BY CustomerId;",
          clean:
            "SELECT DISTINCT CustomerId\n" +
            "FROM dbo.Orders\n" +
            "WHERE OrderDate >= DATEADD(DAY, -30, (SELECT MAX(OrderDate) FROM dbo.Orders))\n" +
            "ORDER BY CustomerId;"
        },
        {
          name: "CROSS JOIN the anchor in a CTE",
          perfNote: "Materializes the single anchor date once and cross-joins it in; reads clearly and evaluates MAX exactly once.",
          dialectNote: "",
          logic:
            "**Key Idea.** Compute the boundary date once in a one-row CTE and CROSS JOIN it to the orders, then filter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `A` = `SELECT DATEADD(DAY, -30, MAX(OrderDate)) AS Boundary FROM Orders`.\n" +
            "2. CROSS JOIN `Orders` to `A` (one row, so it just attaches the boundary).\n" +
            "3. Keep orders where `OrderDate >= A.Boundary`.\n" +
            "4. `SELECT DISTINCT CustomerId` ordered by id.\n\n" +
            "**Why it works.** The single-row CTE is a constant table; cross-joining it exposes the boundary as a column without recomputing MAX per row.\n\n" +
            "**Common Gotchas.** Ensure the CTE returns exactly one row (a bare aggregate does). The DISTINCT still matters for customers with several recent orders.\n\n" +
            "**Performance.** MAX computed once; identical filtered scan to the scalar-subquery form.\n\n" +
            "**Interview mindset.** When the same anchor is reused, precomputing it in a one-row CTE reads more clearly than repeating the subquery.",
          tsql:
            "WITH A AS (\n" +
            "    SELECT DATEADD(DAY, -30, MAX(OrderDate)) AS Boundary\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT DISTINCT o.CustomerId\n" +
            "FROM dbo.Orders o\n" +
            "CROSS JOIN A\n" +
            "WHERE o.OrderDate >= A.Boundary\n" +
            "ORDER BY o.CustomerId;",
          clean:
            "WITH A AS (\n" +
            "    SELECT DATEADD(DAY, -30, MAX(OrderDate)) AS Boundary FROM dbo.Orders\n" +
            ")\n" +
            "SELECT DISTINCT o.CustomerId\n" +
            "FROM dbo.Orders o\n" +
            "CROSS JOIN A\n" +
            "WHERE o.OrderDate >= A.Boundary\n" +
            "ORDER BY o.CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Anchor and boundary", note: "MAX(OrderDate) = 2024-06-30; boundary = 2024-06-30 minus 30 days = 2024-05-31.",
          table: { columns: ["Anchor","Boundary"], rows: [["2024-06-30","2024-05-31"]] } },
        { step: "Keep orders on/after 2024-05-31, distinct customers", note: "101 (Jun 30 & Jun 15) and 102 (Jun 20) qualify; 103 (May 1) and 104 (Apr 10) fall outside.",
          table: { columns: ["CustomerId"], rows: [[101],[102]] } }
      ],
      patternRecognition: [
        "'within N days of the latest activity' → anchor on MAX(date) via a scalar subquery/CTE, shift with DATEADD, filter a sargable range."
      ],
      interviewRecall: [
        "Anchor windows on the data's own MAX(date), not GETDATE(), for reproducible results over historical snapshots.",
        "Keep the date column bare in the predicate (no wrapping functions) so the range stays sargable."
      ],
      commonMistakes: [
        "Hard-coding the window's start date instead of deriving it from MAX(OrderDate).",
        "Forgetting DISTINCT and returning a customer once per recent order."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "filt2-electronics-suppliers",
      number: "SS 10840",
      platform: "StrataScratch",
      title: "Suppliers of Electronics",
      difficulty: "Easy",
      category: "Filtering & Subqueries",
      topics: ["Filtering & Subqueries", "Joins"],
      domains: ["Supply Chain Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Semi-join", sqlConcept: "IN vs EXISTS", technique: "Positive membership on a child condition" },
      descriptionBrief:
        "Given **Suppliers** and **Products** (`SupplierId`, `Category`), return the names of " +
        "suppliers that supply **at least one product in the 'Electronics' category**, ordered by name.",
      schema: [
        { name: "Suppliers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "SupplierId", type: "INT", note: "FK → Suppliers.Id" },
          { name: "Category", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "IF OBJECT_ID('dbo.Suppliers','U') IS NOT NULL DROP TABLE dbo.Suppliers;\n" +
        "CREATE TABLE dbo.Suppliers (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, SupplierId INT, Category VARCHAR(30));\n" +
        "INSERT INTO dbo.Suppliers VALUES (1,'Acme'),(2,'Globex'),(3,'Initech');\n" +
        "INSERT INTO dbo.Products VALUES (1,1,'Electronics'),(2,1,'Furniture'),(3,2,'Furniture'),(4,3,'Electronics');",
      sampleData: [
        { table: "Suppliers", columns: ["Id","Name"], rows: [[1,"Acme"],[2,"Globex"],[3,"Initech"]] },
        { table: "Products", columns: ["Id","SupplierId","Category"],
          rows: [[1,1,"Electronics"],[2,1,"Furniture"],[3,2,"Furniture"],[4,3,"Electronics"]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Acme"],["Initech"]] },
      approaches: [
        {
          name: "IN a filtered subquery (recommended)",
          perfNote: "Builds the small set of supplier ids that sell Electronics once, then filters suppliers against it; the optimizer runs it as a semi-join.",
          dialectNote: "",
          logic:
            "**What it asks.** Suppliers with one or more Electronics products — Acme (product 1) and Initech (product 4); Globex sells only Furniture.\n\n" +
            "**Why the naive idea fails.** An inner `JOIN` between Suppliers and Products would return one row *per matching product*, so a supplier with several Electronics products would repeat and need `DISTINCT` to repair.\n\n" +
            "**Key Idea.** Reduce Products to the supplier ids that have an Electronics row, then keep suppliers whose `Id` is in that set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `(SELECT SupplierId FROM Products WHERE Category = 'Electronics')` → {1, 3}.\n" +
            "2. Keep suppliers where `Id IN` that set.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** Membership in the 'sells Electronics' id set is exactly the condition, and IN returns each supplier at most once.\n\n" +
            "**Common Gotchas.** Safe here because `SupplierId` is non-null; the NULL trap bites `NOT IN`, not the positive `IN`. EXISTS generalizes better to multi-column matches.\n\n" +
            "**Performance.** The subquery yields a tiny list; an index on `Products(Category, SupplierId)` supports it and on `Suppliers.Id` supports the probe.\n\n" +
            "**Interview mindset.** 'has at least one child meeting a condition' → IN/EXISTS against a filtered subquery, not a join plus DISTINCT.",
          tsql:
            "SELECT s.Name\n" +
            "FROM dbo.Suppliers s\n" +
            "WHERE s.Id IN (                        -- suppliers that sell Electronics\n" +
            "    SELECT p.SupplierId FROM dbo.Products p WHERE p.Category = 'Electronics'\n" +
            ")\n" +
            "ORDER BY s.Name;",
          clean:
            "SELECT s.Name\n" +
            "FROM dbo.Suppliers s\n" +
            "WHERE s.Id IN (SELECT p.SupplierId FROM dbo.Products p WHERE p.Category = 'Electronics')\n" +
            "ORDER BY s.Name;"
        },
        {
          name: "EXISTS correlated on the product",
          perfNote: "Correlated existence test; identical plan to IN here, and the form you extend when the match spans several columns or the key is nullable.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep a supplier when there *exists* an Electronics product tied to it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan `Suppliers` as `s`.\n" +
            "2. Test `EXISTS (SELECT 1 FROM Products p WHERE p.SupplierId = s.Id AND p.Category = 'Electronics')`.\n" +
            "3. Keep matches and order by name.\n\n" +
            "**Why it works.** The correlated predicate ties each supplier to its own products and folds the category filter into the same existence test, emitting each supplier once.\n\n" +
            "**Common Gotchas.** Put the category filter *inside* the EXISTS; the `SELECT 1` is idiomatic — only existence matters.\n\n" +
            "**Performance.** Equivalent semi-join to the IN form; preferred when the correlation uses several columns or the key is nullable.\n\n" +
            "**Interview mindset.** IN and EXISTS express the same positive semi-join — reach for EXISTS on multi-column or nullable-key matches.",
          tsql:
            "SELECT s.Name\n" +
            "FROM dbo.Suppliers s\n" +
            "WHERE EXISTS (\n" +
            "    SELECT 1 FROM dbo.Products p\n" +
            "    WHERE p.SupplierId = s.Id AND p.Category = 'Electronics'\n" +
            ")\n" +
            "ORDER BY s.Name;",
          clean:
            "SELECT s.Name\n" +
            "FROM dbo.Suppliers s\n" +
            "WHERE EXISTS (SELECT 1 FROM dbo.Products p WHERE p.SupplierId = s.Id AND p.Category = 'Electronics')\n" +
            "ORDER BY s.Name;"
        }
      ],
      walkthrough: [
        { step: "Supplier ids that sell Electronics", note: "Product 1 → supplier 1 (Acme); product 4 → supplier 3 (Initech). Globex (2) has none.",
          table: { columns: ["SupplierId"], rows: [[1],[3]] } },
        { step: "Keep suppliers in that set", note: "Acme and Initech qualify; Globex is dropped.",
          table: { columns: ["Name"], rows: [["Acme"],["Initech"]] } }
      ],
      patternRecognition: [
        "'supplier/parent has at least one child meeting a condition' → IN or EXISTS against a filtered subquery, returning each parent once."
      ],
      interviewRecall: [
        "IN and EXISTS are the same positive semi-join for a single-column test; the optimizer usually plans them identically.",
        "Prefer EXISTS when the correlation spans multiple columns or the join key is nullable."
      ],
      commonMistakes: [
        "Using an inner join and forgetting DISTINCT, duplicating suppliers with many Electronics products.",
        "Putting the category filter outside the EXISTS instead of inside the correlated probe."
      ]
    }

  ]);
})();
