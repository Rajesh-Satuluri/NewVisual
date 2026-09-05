/*
 * data/ranking.js — Ranking topic (EXEMPLAR file).
 * This is the format-sign-off exemplar for the SQL Study Lab: it exercises the
 * full per-problem schema, HTML result tables, runnable SSMS setup scripts, and
 * multiple genuinely-instructive T-SQL approaches with RCS(commented) + Clean.
 * All T-SQL targets SQL Server 2019/2022 and runs as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Ranking", [

    /* ------------------------------------------------------------------ */
    {
      id: "nth-highest-salary",
      number: "LC 177",
      platform: "LeetCode",
      title: "Nth Highest Salary",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/nth-highest-salary/",
      meta: { pattern: "Top-N by rank", sqlConcept: "DENSE_RANK / OFFSET-FETCH", technique: "Dense ranking" },
      descriptionBrief:
        "From an **Employee** table with a `Salary` column, return the **Nth highest _distinct_ " +
        "salary** (here N = 2). If fewer than N distinct salaries exist, return `NULL`. " +
        "Ties count as one salary level.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Salary INT);\n" +
        "INSERT INTO dbo.Employee VALUES (1,100),(2,200),(3,200),(4,300);",
      sampleData: [
        { table: "Employee", columns: ["Id","Salary"], rows: [[1,100],[2,200],[3,200],[4,300]] }
      ],
      expectedOutput: { columns: ["SecondHighestSalary"], rows: [[200]] },
      approaches: [
        {
          name: "DENSE_RANK (recommended)",
          perfNote: "One pass + a sort on Salary; DENSE_RANK collapses ties so the Nth *distinct* level is exact. Best when you want a specific rank level.",
          dialectNote: "",
          logic:
            "**What it asks.** The 2nd highest *distinct* salary — duplicate salaries share one rank.\n\n" +
            "**Why the naive idea fails.** `MAX(Salary)` gives only the top. `TOP 2 ... ORDER BY Salary DESC` returns two *rows* (200 and 200 here), not two *levels*, so a plain OFFSET on rows breaks when ties exist.\n\n" +
            "**Key Idea.** Rank distinct salary *levels* with `DENSE_RANK()` (ties get equal rank, no gaps), then pick the level whose rank = N.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `DENSE_RANK() OVER (ORDER BY Salary DESC)` per row.\n" +
            "2. Filter to `rnk = 2`.\n" +
            "3. `SELECT DISTINCT` (or MAX) the salary so ties collapse to one value.\n" +
            "4. Wrap in an outer aggregate so 'no such rank' yields `NULL` instead of an empty set.\n\n" +
            "**Why it works.** DENSE_RANK numbers *levels*, not rows, so rank 2 is exactly the 2nd-highest distinct salary regardless of how many people earn it.\n\n" +
            "**Common Gotchas.** Return `NULL` (not empty) when N exceeds the number of distinct salaries — wrap the pick in `MAX()` or `(SELECT ...)` scalar.\n\n" +
            "**Performance.** Sort on Salary DESC then a linear scan; O(n log n). An index on `Salary` supplies the order.\n\n" +
            "**Interview mindset.** 'Nth highest *distinct*' → DENSE_RANK. 'Nth row' → ROW_NUMBER or OFFSET/FETCH.",
          tsql:
            "-- 2nd highest DISTINCT salary, NULL-safe\n" +
            "WITH Ranked AS (\n" +
            "    SELECT Salary,\n" +
            "           DENSE_RANK() OVER (ORDER BY Salary DESC) AS rnk  -- ties share a rank\n" +
            "    FROM dbo.Employee\n" +
            ")\n" +
            "SELECT MAX(Salary) AS SecondHighestSalary   -- MAX over a single level; NULL if none\n" +
            "FROM Ranked\n" +
            "WHERE rnk = 2;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT Salary, DENSE_RANK() OVER (ORDER BY Salary DESC) AS rnk\n" +
            "    FROM dbo.Employee\n" +
            ")\n" +
            "SELECT MAX(Salary) AS SecondHighestSalary\n" +
            "FROM Ranked\n" +
            "WHERE rnk = 2;"
        },
        {
          name: "OFFSET … FETCH over DISTINCT",
          perfNote: "Deduplicate first, then skip N-1 rows. Clean for 'Nth distinct', but returns an empty set (not NULL) when N is too large unless wrapped.",
          dialectNote: "`OFFSET … FETCH` requires an `ORDER BY` and is SQL Server 2012+.",
          logic:
            "**Key Idea.** Collapse to distinct salaries, order them descending, then page directly to the Nth.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `SELECT DISTINCT Salary` so ties disappear.\n" +
            "2. `ORDER BY Salary DESC`.\n" +
            "3. `OFFSET (N-1) ROWS FETCH NEXT 1 ROW ONLY` — skip N-1 levels, take one.\n" +
            "4. Wrap in an outer scalar `SELECT` so a missing level returns `NULL`.\n\n" +
            "**Why it works.** After DISTINCT, each row *is* a level, so a row offset equals a level offset.\n\n" +
            "**Common Gotchas.** Without the outer wrap, too-large N yields zero rows, not `NULL`. OFFSET/FETCH demands an ORDER BY.\n\n" +
            "**Performance.** DISTINCT (hash/sort) then an ordered skip; comparable to the ranking approach.\n\n" +
            "**Interview mindset.** A tidy alternative to show you can page result sets, not only rank them.",
          tsql:
            "-- Skip the top (N-1) DISTINCT salaries, take the next\n" +
            "SELECT (\n" +
            "    SELECT DISTINCT Salary\n" +
            "    FROM dbo.Employee\n" +
            "    ORDER BY Salary DESC\n" +
            "    OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY   -- N = 2 -> skip 1\n" +
            ") AS SecondHighestSalary;",
          clean:
            "SELECT (\n" +
            "    SELECT DISTINCT Salary\n" +
            "    FROM dbo.Employee\n" +
            "    ORDER BY Salary DESC\n" +
            "    OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY\n" +
            ") AS SecondHighestSalary;"
        }
      ],
      walkthrough: [
        { step: "DENSE_RANK over salaries (DESC)", note: "300→1, the two 200s→2, 100→3. Ties share rank 2.",
          table: { columns: ["Salary","rnk"], rows: [[300,1],[200,2],[200,2],[100,3]] } },
        { step: "Filter rnk = 2 and collapse", note: "Only the 200 level survives; MAX gives a single value.",
          table: { columns: ["SecondHighestSalary"], rows: [[200]] } }
      ],
      patternRecognition: [
        "'Nth highest **distinct**' → `DENSE_RANK`.",
        "'Nth **row**' (ties count separately) → `ROW_NUMBER` or `OFFSET/FETCH`."
      ],
      interviewRecall: [
        "DENSE_RANK: ties equal, no gaps. RANK: ties equal, gaps. ROW_NUMBER: no ties, arbitrary tie-break.",
        "Wrap the pick in an aggregate/scalar subquery so 'no such rank' returns NULL, not an empty set."
      ],
      commonMistakes: [
        "Using `TOP 2 ... OFFSET` on raw rows — duplicate salaries make the Nth row ≠ Nth distinct salary.",
        "Returning an empty result instead of `NULL` when N exceeds the number of distinct salaries."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "top-earner-per-department",
      number: "LC 184",
      platform: "LeetCode",
      title: "Highest Salary in Each Department",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/department-highest-salary/",
      meta: { pattern: "Top-1 per group", sqlConcept: "RANK partitioned", technique: "Per-group ranking" },
      descriptionBrief:
        "Given **Employee** (with `DeptId`, `Salary`) and **Department**, return the employee(s) " +
        "earning the **highest salary within each department**. If several tie for the top of a " +
        "department, return all of them.",
      schema: [
        { name: "Department", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" },
          { name: "DeptId", type: "INT", note: "FK → Department.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "IF OBJECT_ID('dbo.Department','U') IS NOT NULL DROP TABLE dbo.Department;\n" +
        "CREATE TABLE dbo.Department (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), Salary INT, DeptId INT);\n" +
        "INSERT INTO dbo.Department VALUES (1,'Sales'),(2,'Engineering');\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Joe',7000,1),(2,'Jim',9000,1),(3,'Max',9000,2),\n" +
        "  (4,'Sam',6000,2),(5,'Ann',9000,2);",
      sampleData: [
        { table: "Department", columns: ["Id","Name"], rows: [[1,"Sales"],[2,"Engineering"]] },
        { table: "Employee", columns: ["Id","Name","Salary","DeptId"],
          rows: [[1,"Joe",7000,1],[2,"Jim",9000,1],[3,"Max",9000,2],[4,"Sam",6000,2],[5,"Ann",9000,2]] }
      ],
      expectedOutput: { columns: ["Department","Employee","Salary"],
        rows: [["Sales","Jim",9000],["Engineering","Max",9000],["Engineering","Ann",9000]] },
      approaches: [
        {
          name: "RANK partitioned (recommended)",
          perfNote: "One partitioned window sort per department; keeps ALL ties naturally because RANK gives every top earner rank 1.",
          dialectNote: "",
          logic:
            "**What it asks.** The top-paid employee(s) in every department, ties included.\n\n" +
            "**Why the naive idea fails.** Joining on `MAX(Salary) per dept` works but repeats the aggregation and is easy to get subtly wrong with ties; `ROW_NUMBER` would silently drop tied top earners.\n\n" +
            "**Key Idea.** Rank employees *within* each department by salary using `RANK() OVER (PARTITION BY DeptId ORDER BY Salary DESC)`; every rank-1 row is a department top earner.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned rank per employee.\n" +
            "2. Keep rows where `rnk = 1`.\n" +
            "3. Join to `Department` for the name and project the three output columns.\n\n" +
            "**Why it works.** PARTITION BY restarts ranking per department; RANK assigns 1 to every employee tied for the max, so no top earner is lost.\n\n" +
            "**Common Gotchas.** Use `RANK` (or `DENSE_RANK`), not `ROW_NUMBER`, or you drop ties. Ann and Max both must appear.\n\n" +
            "**Performance.** A segment/sort per partition, O(n log n); an index on `(DeptId, Salary DESC)` supports the window order.\n\n" +
            "**Interview mindset.** 'Top-1 per group *with ties*' → RANK = 1 partitioned; 'exactly one per group' → ROW_NUMBER = 1.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT e.Name AS Employee, e.Salary, e.DeptId,\n" +
            "           RANK() OVER (PARTITION BY e.DeptId       -- restart per department\n" +
            "                        ORDER BY e.Salary DESC) AS rnk  -- ties share rank 1\n" +
            "    FROM dbo.Employee e\n" +
            ")\n" +
            "SELECT d.Name AS Department, r.Employee, r.Salary\n" +
            "FROM Ranked r\n" +
            "JOIN dbo.Department d ON d.Id = r.DeptId\n" +
            "WHERE r.rnk = 1\n" +
            "ORDER BY d.Name DESC, r.Employee;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT e.Name AS Employee, e.Salary, e.DeptId,\n" +
            "           RANK() OVER (PARTITION BY e.DeptId ORDER BY e.Salary DESC) AS rnk\n" +
            "    FROM dbo.Employee e\n" +
            ")\n" +
            "SELECT d.Name AS Department, r.Employee, r.Salary\n" +
            "FROM Ranked r\n" +
            "JOIN dbo.Department d ON d.Id = r.DeptId\n" +
            "WHERE r.rnk = 1;"
        },
        {
          name: "Correlated MAX subquery",
          perfNote: "Reads well and keeps ties, but re-derives the per-department max for each row; fine on small tables, weaker at scale than a single window pass.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep an employee only if their salary equals the maximum salary of their own department.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Join `Employee` to `Department`.\n" +
            "2. In the WHERE clause, compare `e.Salary` to a correlated `(SELECT MAX(Salary) FROM Employee WHERE DeptId = e.DeptId)`.\n" +
            "3. Rows matching the department max survive — ties included.\n\n" +
            "**Why it works.** Equality against the group maximum admits every tied top earner.\n\n" +
            "**Common Gotchas.** The subquery must correlate on `DeptId`; forgetting it compares against the global max.\n\n" +
            "**Performance.** The correlated subquery may re-scan per row without a supporting index on `(DeptId, Salary)`.\n\n" +
            "**Interview mindset.** A good 'any other way?' answer that avoids window functions entirely.",
          tsql:
            "SELECT d.Name AS Department, e.Name AS Employee, e.Salary\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Department d ON d.Id = e.DeptId\n" +
            "WHERE e.Salary = (                    -- department-local maximum\n" +
            "    SELECT MAX(e2.Salary)\n" +
            "    FROM dbo.Employee e2\n" +
            "    WHERE e2.DeptId = e.DeptId\n" +
            ");",
          clean:
            "SELECT d.Name AS Department, e.Name AS Employee, e.Salary\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Department d ON d.Id = e.DeptId\n" +
            "WHERE e.Salary = (SELECT MAX(e2.Salary) FROM dbo.Employee e2 WHERE e2.DeptId = e.DeptId);"
        }
      ],
      walkthrough: [
        { step: "RANK within each department", note: "Sales: Jim 1, Joe 2. Engineering: Max 1, Ann 1 (tie), Sam 3.",
          table: { columns: ["Employee","Salary","DeptId","rnk"],
            rows: [["Jim",9000,1,1],["Joe",7000,1,2],["Max",9000,2,1],["Ann",9000,2,1],["Sam",6000,2,3]] } },
        { step: "Keep rnk = 1 and join department", note: "Both Engineering top earners are retained.",
          table: { columns: ["Department","Employee","Salary"],
            rows: [["Sales","Jim",9000],["Engineering","Max",9000],["Engineering","Ann",9000]] } }
      ],
      patternRecognition: [
        "'Top / bottom N **per group**' → windowed `RANK`/`ROW_NUMBER` with `PARTITION BY group`.",
        "Need to keep ties → `RANK` or `DENSE_RANK`; need exactly one → `ROW_NUMBER`."
      ],
      interviewRecall: [
        "PARTITION BY restarts the ranking counter for each group.",
        "RANK keeps all tied top rows; ROW_NUMBER arbitrarily keeps one."
      ],
      commonMistakes: [
        "Using `ROW_NUMBER() = 1` and silently dropping employees tied for the department max.",
        "Correlating the MAX subquery on the wrong key (or not at all), comparing to the global maximum."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank-scores",
      number: "LC 178",
      platform: "LeetCode",
      title: "Rank Scores (No Gaps)",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking"],
      domains: ["Gaming Analytics"],
      link: "https://leetcode.com/problems/rank-scores/",
      meta: { pattern: "Standings / leaderboard", sqlConcept: "DENSE_RANK", technique: "Gapless ranking" },
      descriptionBrief:
        "Given a **Scores** table, produce a leaderboard: each score with its rank, **highest first**. " +
        "Equal scores get the **same rank**, and ranks must have **no gaps** (1,1,2,3 — not 1,1,3,4).",
      schema: [
        { name: "Scores", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Score", type: "DECIMAL(4,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Scores','U') IS NOT NULL DROP TABLE dbo.Scores;\n" +
        "CREATE TABLE dbo.Scores (Id INT PRIMARY KEY, Score DECIMAL(4,2));\n" +
        "INSERT INTO dbo.Scores VALUES (1,3.50),(2,3.65),(3,4.00),(4,3.85),(5,4.00),(6,3.65);",
      sampleData: [
        { table: "Scores", columns: ["Id","Score"], rows: [[1,"3.50"],[2,"3.65"],[3,"4.00"],[4,"3.85"],[5,"4.00"],[6,"3.65"]] }
      ],
      expectedOutput: { columns: ["Score","Rank"],
        rows: [["4.00",1],["4.00",1],["3.85",2],["3.65",3],["3.65",3],["3.50",4]] },
      approaches: [
        {
          name: "DENSE_RANK (recommended)",
          perfNote: "Single sort on Score DESC; DENSE_RANK produces the exact gapless standings the prompt requires in one pass.",
          dialectNote: "",
          logic:
            "**What it asks.** A gapless leaderboard: ties share a rank and the next distinct score is exactly one higher.\n\n" +
            "**Why the naive idea fails.** `RANK()` gives ties the same number but then *skips* — 1,1,3 — which violates 'no gaps'. `ROW_NUMBER()` breaks ties apart entirely.\n\n" +
            "**Key Idea.** `DENSE_RANK() OVER (ORDER BY Score DESC)` is defined to be gapless: equal scores share a rank and the counter advances by exactly one per distinct score.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order all rows by `Score DESC`.\n" +
            "2. Apply `DENSE_RANK()` over that order.\n" +
            "3. Project `Score` and the rank; order the output by score descending.\n\n" +
            "**Why it works.** DENSE_RANK increments only when the ordered value changes, giving 1,1,2,3 for tied-then-distinct scores.\n\n" +
            "**Common Gotchas.** Don't reach for `RANK` (leaves gaps) or `ROW_NUMBER` (no ties). Alias the column `Rank` with brackets if needed — `RANK` is a keyword.\n\n" +
            "**Performance.** One sort on Score, O(n log n); an index on `Score` supplies the order directly.\n\n" +
            "**Interview mindset.** Say the three window functions out loud and pick by the tie rule — this problem is the canonical DENSE_RANK case.",
          tsql:
            "SELECT Score,\n" +
            "       DENSE_RANK() OVER (ORDER BY Score DESC) AS [Rank]  -- gapless: 1,1,2,3\n" +
            "FROM dbo.Scores\n" +
            "ORDER BY Score DESC;",
          clean:
            "SELECT Score,\n" +
            "       DENSE_RANK() OVER (ORDER BY Score DESC) AS [Rank]\n" +
            "FROM dbo.Scores\n" +
            "ORDER BY Score DESC;"
        }
      ],
      walkthrough: [
        { step: "DENSE_RANK over Score DESC", note: "Two 4.00s share rank 1; 3.85→2; two 3.65s→3; 3.50→4. No gaps.",
          table: { columns: ["Score","Rank"],
            rows: [["4.00",1],["4.00",1],["3.85",2],["3.65",3],["3.65",3],["3.50",4]] } }
      ],
      patternRecognition: [
        "'Same rank for ties, **no gaps**' → `DENSE_RANK`.",
        "'Same rank for ties, **gaps allowed** (Olympic)' → `RANK`."
      ],
      interviewRecall: [
        "RANK leaves gaps after ties; DENSE_RANK does not; ROW_NUMBER never ties.",
        "`Rank` is a reserved word — alias with `[Rank]`."
      ],
      commonMistakes: [
        "Using `RANK()` and returning 1,1,3 where the prompt demands 1,1,2.",
        "Ordering ascending by mistake — leaderboards rank the highest score as 1 (DESC)."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "top-3-products-per-category",
      number: "SS 9102",
      platform: "StrataScratch",
      title: "Top 3 Products by Revenue per Category",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Retail Analytics"],
      link: "https://platform.stratascratch.com/coding/9102-top-3-products-per-category",
      meta: { pattern: "Top-N per group", sqlConcept: "ROW_NUMBER partitioned", technique: "Per-group top-N filter" },
      descriptionBrief:
        "Given a **Products** table (`Category`, `ProductName`, `Revenue`), return the **three " +
        "highest-revenue products in each category**. Categories with fewer than three products " +
        "return all they have. Break exact revenue ties by product name so exactly three rows " +
        "survive per category.",
      schema: [
        { name: "Products", columns: [
          { name: "ProductId", type: "INT", note: "PK" },
          { name: "Category", type: "VARCHAR(30)" },
          { name: "ProductName", type: "VARCHAR(50)" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (ProductId INT PRIMARY KEY, Category VARCHAR(30), ProductName VARCHAR(50), Revenue INT);\n" +
        "INSERT INTO dbo.Products VALUES\n" +
        "  (1,'Electronics','Laptop',1200),(2,'Electronics','Phone',900),\n" +
        "  (3,'Electronics','Tablet',700),(4,'Electronics','Camera',500),\n" +
        "  (5,'Books','Textbook',120),(6,'Books','Novel',40),(7,'Books','Comic',25),\n" +
        "  (8,'Toys','Blocks',60),(9,'Toys','Doll',45);",
      sampleData: [
        { table: "Products", columns: ["ProductId","Category","ProductName","Revenue"],
          rows: [[1,"Electronics","Laptop",1200],[2,"Electronics","Phone",900],[3,"Electronics","Tablet",700],[4,"Electronics","Camera",500],[5,"Books","Textbook",120],[6,"Books","Novel",40],[7,"Books","Comic",25],[8,"Toys","Blocks",60],[9,"Toys","Doll",45]] }
      ],
      expectedOutput: { columns: ["Category","ProductName","Revenue","rn"],
        rows: [["Books","Textbook",120,1],["Books","Novel",40,2],["Books","Comic",25,3],["Electronics","Laptop",1200,1],["Electronics","Phone",900,2],["Electronics","Tablet",700,3],["Toys","Blocks",60,1],["Toys","Doll",45,2]] },
      approaches: [
        {
          name: "ROW_NUMBER partitioned (recommended)",
          perfNote: "One partitioned sort per category; ROW_NUMBER numbers rows 1..k so a `<= 3` filter caps each group at three. Best general-purpose top-N-per-group.",
          dialectNote: "",
          logic:
            "**What it asks.** The three top-revenue products within each category, capped at exactly three even if revenues tie.\n\n" +
            "**Why the naive idea fails.** A global `TOP 3` returns three products overall, not three per category. `RANK`/`DENSE_RANK` would return *more* than three rows when the third place ties, breaking the 'exactly three' cap.\n\n" +
            "**Key Idea.** `ROW_NUMBER() OVER (PARTITION BY Category ORDER BY Revenue DESC, ProductName)` gives a strict 1,2,3,… sequence per category; keep rows numbered `<= 3`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned `ROW_NUMBER` with a deterministic tie-break on `ProductName`.\n" +
            "2. Filter to `rn <= 3`.\n" +
            "3. Order the output by `Category`, then `rn`.\n\n" +
            "**Why it works.** ROW_NUMBER never repeats a value inside a partition, so the third row is unambiguous and the group is capped at three regardless of ties.\n\n" +
            "**Common Gotchas.** You cannot filter a window function in `WHERE` directly — it must live in a CTE/subquery. Add a tie-break column or 'top 3' is nondeterministic.\n\n" +
            "**Performance.** A segment + sort per partition, O(n log n); an index on `(Category, Revenue DESC, ProductName)` supplies the window order.\n\n" +
            "**Interview mindset.** 'Top **N** per group, hard cap' → ROW_NUMBER <= N. 'Top N **including ties**' → RANK <= N.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT Category, ProductName, Revenue,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Category            -- restart per category\n" +
            "                              ORDER BY Revenue DESC, ProductName) AS rn  -- deterministic\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Category, ProductName, Revenue, rn\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 3               -- keep the top three per category\n" +
            "ORDER BY Category, rn;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT Category, ProductName, Revenue,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Category ORDER BY Revenue DESC, ProductName) AS rn\n" +
            "    FROM dbo.Products\n" +
            ")\n" +
            "SELECT Category, ProductName, Revenue, rn\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 3\n" +
            "ORDER BY Category, rn;"
        },
        {
          name: "CROSS APPLY TOP 3",
          perfNote: "Correlated TOP-N per distinct category; can be very fast when an index seeks each category and stops after three rows. Shines with many rows per few categories.",
          dialectNote: "`CROSS APPLY` is SQL Server's lateral join; `TOP (3) ... ORDER BY` selects per outer row.",
          logic:
            "**Key Idea.** For each distinct category, ask a correlated `TOP (3)` subquery for its three best products via `CROSS APPLY`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Derive the distinct category list.\n" +
            "2. `CROSS APPLY` a `SELECT TOP (3) ... WHERE Category = c.Category ORDER BY Revenue DESC, ProductName`.\n" +
            "3. Project the joined columns.\n\n" +
            "**Why it works.** APPLY runs the inner query once per category and TOP caps each run at three rows.\n\n" +
            "**Common Gotchas.** The inner TOP needs its own `ORDER BY`; the correlation predicate on `Category` is mandatory.\n\n" +
            "**Performance.** With an index on `(Category, Revenue DESC, ProductName)` each APPLY is a short seek — often beats a full window sort.\n\n" +
            "**Interview mindset.** A strong 'alternative without ranking functions' answer that shows you know lateral joins.",
          tsql:
            "SELECT t.Category, t.ProductName, t.Revenue, t.rn\n" +
            "FROM (SELECT DISTINCT Category FROM dbo.Products) c\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (3) p.ProductName, p.Revenue, c.Category,\n" +
            "           ROW_NUMBER() OVER (ORDER BY p.Revenue DESC, p.ProductName) AS rn\n" +
            "    FROM dbo.Products p\n" +
            "    WHERE p.Category = c.Category\n" +
            "    ORDER BY p.Revenue DESC, p.ProductName\n" +
            ") t\n" +
            "ORDER BY t.Category, t.rn;",
          clean:
            "SELECT t.Category, t.ProductName, t.Revenue, t.rn\n" +
            "FROM (SELECT DISTINCT Category FROM dbo.Products) c\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (3) p.ProductName, p.Revenue, c.Category,\n" +
            "           ROW_NUMBER() OVER (ORDER BY p.Revenue DESC, p.ProductName) AS rn\n" +
            "    FROM dbo.Products p\n" +
            "    WHERE p.Category = c.Category\n" +
            "    ORDER BY p.Revenue DESC, p.ProductName\n" +
            ") t\n" +
            "ORDER BY t.Category, t.rn;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER within each category", note: "Electronics numbers Laptop 1, Phone 2, Tablet 3, Camera 4; Books and Toys restart at 1.",
          table: { columns: ["Category","ProductName","Revenue","rn"],
            rows: [["Electronics","Laptop",1200,1],["Electronics","Phone",900,2],["Electronics","Tablet",700,3],["Electronics","Camera",500,4],["Books","Textbook",120,1],["Books","Novel",40,2],["Books","Comic",25,3],["Toys","Blocks",60,1],["Toys","Doll",45,2]] } },
        { step: "Keep rn <= 3, order output", note: "Camera (rn 4) drops; Toys keeps its two rows.",
          table: { columns: ["Category","ProductName","Revenue","rn"],
            rows: [["Books","Textbook",120,1],["Books","Novel",40,2],["Books","Comic",25,3],["Electronics","Laptop",1200,1],["Electronics","Phone",900,2],["Electronics","Tablet",700,3],["Toys","Blocks",60,1],["Toys","Doll",45,2]] } }
      ],
      patternRecognition: [
        "'Top N **per group**, hard cap' → `ROW_NUMBER() <= N` with `PARTITION BY group`.",
        "Filtering a window result requires a CTE/derived table — you cannot use it in `WHERE`."
      ],
      interviewRecall: [
        "ROW_NUMBER caps a group at exactly N; RANK/DENSE_RANK may return more when the Nth place ties.",
        "CROSS APPLY + TOP (N) is the index-friendly alternative to a window sort."
      ],
      commonMistakes: [
        "Using `RANK() <= 3` and returning four rows when two products tie for third.",
        "Omitting a tie-break column, making which products count as 'top 3' nondeterministic."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "customer-spend-quartiles",
      number: "DL 2410",
      platform: "DataLemur",
      title: "Customer Spend Quartiles",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Marketing Analytics"],
      link: "https://datalemur.com/questions/customer-spend-quartiles",
      meta: { pattern: "Bucketing / tiering", sqlConcept: "NTILE", technique: "Equal-size ranked buckets" },
      descriptionBrief:
        "Given a **Customers** table (`Name`, `TotalSpend`), split customers into **four equal-size " +
        "spend tiers** where tier 1 is the biggest spenders and tier 4 the smallest. Label the " +
        "tiers 'Platinum', 'Gold', 'Silver', 'Bronze'. With eight customers each tier holds two.",
      schema: [
        { name: "Customers", columns: [
          { name: "CustomerId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "TotalSpend", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (CustomerId INT PRIMARY KEY, Name VARCHAR(50), TotalSpend INT);\n" +
        "INSERT INTO dbo.Customers VALUES\n" +
        "  (1,'Amy',100),(2,'Ben',250),(3,'Cora',300),(4,'Dan',450),\n" +
        "  (5,'Eve',500),(6,'Finn',650),(7,'Gus',800),(8,'Hana',950);",
      sampleData: [
        { table: "Customers", columns: ["CustomerId","Name","TotalSpend"],
          rows: [[1,"Amy",100],[2,"Ben",250],[3,"Cora",300],[4,"Dan",450],[5,"Eve",500],[6,"Finn",650],[7,"Gus",800],[8,"Hana",950]] }
      ],
      expectedOutput: { columns: ["Name","TotalSpend","Quartile","Tier"],
        rows: [["Hana",950,1,"Platinum"],["Gus",800,1,"Platinum"],["Finn",650,2,"Gold"],["Eve",500,2,"Gold"],["Dan",450,3,"Silver"],["Cora",300,3,"Silver"],["Ben",250,4,"Bronze"],["Amy",100,4,"Bronze"]] },
      approaches: [
        {
          name: "NTILE(4) (recommended)",
          perfNote: "Single ordered pass; NTILE distributes rows into four contiguous, near-equal buckets automatically. Purpose-built for tiering.",
          dialectNote: "",
          logic:
            "**What it asks.** Four equal-size spend tiers, biggest spenders in tier 1.\n\n" +
            "**Why the naive idea fails.** Fixed spend thresholds ('>800 = Platinum') don't guarantee equal-size groups and must be re-tuned as data shifts. Manual `NTILE`-by-hand math with `ROW_NUMBER` and division is error-prone at the boundaries.\n\n" +
            "**Key Idea.** `NTILE(4) OVER (ORDER BY TotalSpend DESC)` slices the ordered rows into four buckets as evenly as possible, numbering the top bucket 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order customers by `TotalSpend DESC`.\n" +
            "2. Apply `NTILE(4)` over that order to get a 1–4 quartile.\n" +
            "3. Map the quartile to a label with `CASE` (1→Platinum … 4→Bronze).\n" +
            "4. Order the output by spend descending.\n\n" +
            "**Why it works.** NTILE guarantees bucket sizes differ by at most one row; with 8 rows each of the four buckets gets exactly two.\n\n" +
            "**Common Gotchas.** When rows aren't divisible by the bucket count, NTILE puts the extra rows in the *earlier* buckets — don't assume perfectly equal sizes. Order direction sets which tier is 1.\n\n" +
            "**Performance.** One sort on TotalSpend, O(n log n); an index on `TotalSpend` supplies the order.\n\n" +
            "**Interview mindset.** 'Split into N equal groups / quartiles / deciles' → NTILE(N). 'Rank by value' → RANK family.",
          tsql:
            "WITH Tiled AS (\n" +
            "    SELECT Name, TotalSpend,\n" +
            "           NTILE(4) OVER (ORDER BY TotalSpend DESC) AS Quartile  -- 4 equal buckets\n" +
            "    FROM dbo.Customers\n" +
            ")\n" +
            "SELECT Name, TotalSpend, Quartile,\n" +
            "       CASE Quartile WHEN 1 THEN 'Platinum'\n" +
            "                     WHEN 2 THEN 'Gold'\n" +
            "                     WHEN 3 THEN 'Silver'\n" +
            "                     ELSE 'Bronze' END AS Tier\n" +
            "FROM Tiled\n" +
            "ORDER BY TotalSpend DESC;",
          clean:
            "WITH Tiled AS (\n" +
            "    SELECT Name, TotalSpend,\n" +
            "           NTILE(4) OVER (ORDER BY TotalSpend DESC) AS Quartile\n" +
            "    FROM dbo.Customers\n" +
            ")\n" +
            "SELECT Name, TotalSpend, Quartile,\n" +
            "       CASE Quartile WHEN 1 THEN 'Platinum' WHEN 2 THEN 'Gold'\n" +
            "                     WHEN 3 THEN 'Silver' ELSE 'Bronze' END AS Tier\n" +
            "FROM Tiled\n" +
            "ORDER BY TotalSpend DESC;"
        }
      ],
      walkthrough: [
        { step: "NTILE(4) over spend DESC", note: "Eight ordered rows split into four buckets of two; Hana and Gus land in bucket 1.",
          table: { columns: ["Name","TotalSpend","Quartile"],
            rows: [["Hana",950,1],["Gus",800,1],["Finn",650,2],["Eve",500,2],["Dan",450,3],["Cora",300,3],["Ben",250,4],["Amy",100,4]] } },
        { step: "Map quartile to tier label", note: "CASE turns 1–4 into Platinum/Gold/Silver/Bronze.",
          table: { columns: ["Name","TotalSpend","Quartile","Tier"],
            rows: [["Hana",950,1,"Platinum"],["Gus",800,1,"Platinum"],["Finn",650,2,"Gold"],["Eve",500,2,"Gold"],["Dan",450,3,"Silver"],["Cora",300,3,"Silver"],["Ben",250,4,"Bronze"],["Amy",100,4,"Bronze"]] } }
      ],
      patternRecognition: [
        "'Split into N **equal-size** groups / quartiles / deciles / percentiles-as-buckets' → `NTILE(N)`.",
        "Uneven divisions put the extra rows in the earlier (lower-numbered) buckets."
      ],
      interviewRecall: [
        "NTILE(N) makes bucket sizes differ by at most one; it is about counts, not value thresholds.",
        "The ORDER BY direction decides which bucket is number 1."
      ],
      commonMistakes: [
        "Assuming NTILE splits by *value ranges* — it splits by *row counts*.",
        "Ordering ascending and mislabeling the smallest spenders as the top tier."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "exam-percentile-standing",
      number: "SS 10310",
      platform: "StrataScratch",
      title: "Exam Percentile Standing",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Education Analytics"],
      link: "https://platform.stratascratch.com/coding/10310-exam-percentile-standing",
      meta: { pattern: "Relative standing", sqlConcept: "PERCENT_RANK / CUME_DIST", technique: "Distribution position" },
      descriptionBrief:
        "Given an **Exams** table (`Name`, `Score`), report each student's **relative position** in " +
        "the score distribution using `PERCENT_RANK` (fraction of students strictly below) and " +
        "`CUME_DIST` (fraction at or below). Round both to two decimals and order lowest score first.",
      schema: [
        { name: "Exams", columns: [
          { name: "StudentId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Score", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Exams','U') IS NOT NULL DROP TABLE dbo.Exams;\n" +
        "CREATE TABLE dbo.Exams (StudentId INT PRIMARY KEY, Name VARCHAR(50), Score INT);\n" +
        "INSERT INTO dbo.Exams VALUES\n" +
        "  (1,'Ann',60),(2,'Bob',70),(3,'Cid',80),(4,'Dee',90),(5,'Eli',100);",
      sampleData: [
        { table: "Exams", columns: ["StudentId","Name","Score"],
          rows: [[1,"Ann",60],[2,"Bob",70],[3,"Cid",80],[4,"Dee",90],[5,"Eli",100]] }
      ],
      expectedOutput: { columns: ["Name","Score","PctRank","CumeDist"],
        rows: [["Ann",60,"0.00","0.20"],["Bob",70,"0.25","0.40"],["Cid",80,"0.50","0.60"],["Dee",90,"0.75","0.80"],["Eli",100,"1.00","1.00"]] },
      approaches: [
        {
          name: "PERCENT_RANK + CUME_DIST (recommended)",
          perfNote: "One shared ordered pass computes both distribution functions; no self-join or subquery per row. The direct, standards-based way to express relative standing.",
          dialectNote: "",
          logic:
            "**What it asks.** Where each score sits in the distribution — the share of students below (PERCENT_RANK) and the share at or below (CUME_DIST).\n\n" +
            "**Why the naive idea fails.** Hand-rolling percentiles with correlated `COUNT(*) WHERE score < s` subqueries re-scans the table per row and is easy to get off-by-one on the denominator (n vs n-1).\n\n" +
            "**Key Idea.** `PERCENT_RANK() = (rank-1)/(n-1)` gives the fraction strictly below; `CUME_DIST() = (# rows <= current)/n` gives the fraction at or below. Both take the same `ORDER BY Score`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order rows by `Score` ascending.\n" +
            "2. Compute `PERCENT_RANK() OVER (ORDER BY Score)` and `CUME_DIST() OVER (ORDER BY Score)`.\n" +
            "3. `ROUND(...,2)` each to two decimals.\n" +
            "4. Order the output by score.\n\n" +
            "**Why it works.** The two functions encode the two natural definitions of 'percentile position' with the correct denominators built in — n-1 for PERCENT_RANK, n for CUME_DIST.\n\n" +
            "**Common Gotchas.** The lowest value always has PERCENT_RANK 0; the highest always has CUME_DIST 1. Ties share both values. Don't confuse the two — they differ by exactly which end is inclusive.\n\n" +
            "**Performance.** A single sort on Score, O(n log n); an index on `Score` supplies the order for both windows.\n\n" +
            "**Interview mindset.** 'Fraction below' → PERCENT_RANK; 'fraction at-or-below / running distribution' → CUME_DIST.",
          tsql:
            "SELECT Name, Score,\n" +
            "       CAST(ROUND(PERCENT_RANK() OVER (ORDER BY Score), 2) AS DECIMAL(4,2)) AS PctRank,  -- (rank-1)/(n-1)\n" +
            "       CAST(ROUND(CUME_DIST()   OVER (ORDER BY Score), 2) AS DECIMAL(4,2)) AS CumeDist  -- (<= cnt)/n\n" +
            "FROM dbo.Exams\n" +
            "ORDER BY Score;",
          clean:
            "SELECT Name, Score,\n" +
            "       CAST(ROUND(PERCENT_RANK() OVER (ORDER BY Score), 2) AS DECIMAL(4,2)) AS PctRank,\n" +
            "       CAST(ROUND(CUME_DIST()   OVER (ORDER BY Score), 2) AS DECIMAL(4,2)) AS CumeDist\n" +
            "FROM dbo.Exams\n" +
            "ORDER BY Score;"
        }
      ],
      walkthrough: [
        { step: "Rank ascending, apply both functions", note: "n = 5. PERCENT_RANK uses (rank-1)/4; CUME_DIST uses (rows<=)/5.",
          table: { columns: ["Name","Score","PctRank","CumeDist"],
            rows: [["Ann",60,"0.00","0.20"],["Bob",70,"0.25","0.40"],["Cid",80,"0.50","0.60"],["Dee",90,"0.75","0.80"],["Eli",100,"1.00","1.00"]] } }
      ],
      patternRecognition: [
        "'Fraction of rows **strictly below**' → `PERCENT_RANK` (denominator n-1).",
        "'Fraction of rows **at or below** / running share' → `CUME_DIST` (denominator n)."
      ],
      interviewRecall: [
        "PERCENT_RANK of the minimum is always 0; CUME_DIST of the maximum is always 1.",
        "Both are ordered window functions and accept a PARTITION BY to compute per group."
      ],
      commonMistakes: [
        "Swapping the denominators — dividing PERCENT_RANK by n or CUME_DIST by n-1.",
        "Hand-coding correlated COUNT subqueries that re-scan the table and mis-handle ties."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "dept-high-low-earner",
      number: "DL 2455",
      platform: "DataLemur",
      title: "Highest and Lowest Earner per Department",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/questions/highest-lowest-earner-department",
      meta: { pattern: "Group endpoints on one row", sqlConcept: "FIRST_VALUE / LAST_VALUE", technique: "Windowed frame endpoints" },
      descriptionBrief:
        "Given a **Staff** table (`Dept`, `Name`, `Salary`), return **one row per department** " +
        "naming both the **highest-paid** and **lowest-paid** employee. Assume no salary ties " +
        "within a department so each endpoint is a single person.",
      schema: [
        { name: "Staff", columns: [
          { name: "EmpId", type: "INT", note: "PK" },
          { name: "Dept", type: "VARCHAR(30)" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Staff','U') IS NOT NULL DROP TABLE dbo.Staff;\n" +
        "CREATE TABLE dbo.Staff (EmpId INT PRIMARY KEY, Dept VARCHAR(30), Name VARCHAR(50), Salary INT);\n" +
        "INSERT INTO dbo.Staff VALUES\n" +
        "  (1,'Sales','Ana',5000),(2,'Sales','Bob',7000),(3,'Sales','Cal',6000),\n" +
        "  (4,'Tech','Dan',9000),(5,'Tech','Eli',8000),(6,'Tech','Fay',12000);",
      sampleData: [
        { table: "Staff", columns: ["EmpId","Dept","Name","Salary"],
          rows: [[1,"Sales","Ana",5000],[2,"Sales","Bob",7000],[3,"Sales","Cal",6000],[4,"Tech","Dan",9000],[5,"Tech","Eli",8000],[6,"Tech","Fay",12000]] }
      ],
      expectedOutput: { columns: ["Dept","TopEarner","TopSalary","BottomEarner","BottomSalary"],
        rows: [["Sales","Bob",7000,"Ana",5000],["Tech","Fay",12000,"Eli",8000]] },
      approaches: [
        {
          name: "FIRST_VALUE / LAST_VALUE (recommended)",
          perfNote: "Both endpoints come from one partitioned window; a full-partition frame lets LAST_VALUE see the whole group. One pass, then de-duplicate.",
          dialectNote: "",
          logic:
            "**What it asks.** For every department, the top and bottom earner side by side on a single row.\n\n" +
            "**Why the naive idea fails.** Two separate MAX/MIN joins (one for the top name, one for the bottom) means two aggregations plus two self-joins back to names — verbose and easy to mis-correlate. A lone `LAST_VALUE` with the *default* frame silently returns the current row, not the partition's last.\n\n" +
            "**Key Idea.** Partition by department ordered by salary; `FIRST_VALUE(Name)` is the top earner and `LAST_VALUE(Name)` over the **full-partition frame** is the bottom earner.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order each department by `Salary DESC`.\n" +
            "2. `FIRST_VALUE(Name)` / `FIRST_VALUE(Salary)` → highest paid.\n" +
            "3. `LAST_VALUE(Name)` / `LAST_VALUE(Salary)` with `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` → lowest paid.\n" +
            "4. `SELECT DISTINCT` (values repeat on every partition row) and order by department.\n\n" +
            "**Why it works.** Every row in a partition sees the same FIRST_VALUE and, with a full frame, the same LAST_VALUE — so one distinct row per department carries both endpoints.\n\n" +
            "**Common Gotchas.** The default window frame is `RANGE ... CURRENT ROW`, which makes LAST_VALUE useless — you MUST widen the frame to the whole partition. Remember the DISTINCT.\n\n" +
            "**Performance.** One sort per partition, O(n log n); an index on `(Dept, Salary DESC)` supplies the order.\n\n" +
            "**Interview mindset.** Reaching for LAST_VALUE? Say 'and I widen the frame to UNBOUNDED FOLLOWING' in the same breath — that line wins the point.",
          tsql:
            "WITH Bounds AS (\n" +
            "    SELECT Dept,\n" +
            "           FIRST_VALUE(Name)   OVER w AS TopEarner,\n" +
            "           FIRST_VALUE(Salary) OVER w AS TopSalary,\n" +
            "           LAST_VALUE(Name)    OVER w AS BottomEarner,\n" +
            "           LAST_VALUE(Salary)  OVER w AS BottomSalary\n" +
            "    FROM dbo.Staff\n" +
            "    WINDOW w AS (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)  -- full partition\n" +
            ")\n" +
            "SELECT DISTINCT Dept, TopEarner, TopSalary, BottomEarner, BottomSalary\n" +
            "FROM Bounds\n" +
            "ORDER BY Dept;",
          clean:
            "WITH Bounds AS (\n" +
            "    SELECT Dept,\n" +
            "           FIRST_VALUE(Name)   OVER w AS TopEarner,\n" +
            "           FIRST_VALUE(Salary) OVER w AS TopSalary,\n" +
            "           LAST_VALUE(Name)    OVER w AS BottomEarner,\n" +
            "           LAST_VALUE(Salary)  OVER w AS BottomSalary\n" +
            "    FROM dbo.Staff\n" +
            "    WINDOW w AS (PARTITION BY Dept ORDER BY Salary DESC\n" +
            "                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)\n" +
            ")\n" +
            "SELECT DISTINCT Dept, TopEarner, TopSalary, BottomEarner, BottomSalary\n" +
            "FROM Bounds\n" +
            "ORDER BY Dept;"
        },
        {
          name: "Two ROW_NUMBER passes joined",
          perfNote: "Rank each way, pull rn=1 for top and bottom, join per department. Clear and avoids frame subtleties; two window sorts instead of one.",
          dialectNote: "",
          logic:
            "**Key Idea.** Number each department twice — ascending and descending by salary — and pick the rn=1 row from each, then join them per department.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `hi`: `ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary DESC)`, keep rn=1 → top earner.\n" +
            "2. CTE `lo`: same but `ORDER BY Salary ASC`, keep rn=1 → bottom earner.\n" +
            "3. Join `hi` and `lo` on `Dept` and project both names/salaries.\n\n" +
            "**Why it works.** rn=1 in each ordering is exactly the endpoint for that direction; the join stitches them onto one row.\n\n" +
            "**Common Gotchas.** Filter `rn = 1` in each CTE *before* joining, or the join fans out.\n\n" +
            "**Performance.** Two partitioned sorts; the same `(Dept, Salary)` index serves both directions.\n\n" +
            "**Interview mindset.** The frame-free alternative to show when you'd rather not reason about LAST_VALUE's default window.",
          tsql:
            "WITH hi AS (\n" +
            "    SELECT Dept, Name, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary DESC) AS rn\n" +
            "    FROM dbo.Staff\n" +
            "), lo AS (\n" +
            "    SELECT Dept, Name, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary ASC) AS rn\n" +
            "    FROM dbo.Staff\n" +
            ")\n" +
            "SELECT hi.Dept, hi.Name AS TopEarner, hi.Salary AS TopSalary,\n" +
            "       lo.Name AS BottomEarner, lo.Salary AS BottomSalary\n" +
            "FROM hi\n" +
            "JOIN lo ON lo.Dept = hi.Dept AND lo.rn = 1\n" +
            "WHERE hi.rn = 1\n" +
            "ORDER BY hi.Dept;",
          clean:
            "WITH hi AS (\n" +
            "    SELECT Dept, Name, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary DESC) AS rn\n" +
            "    FROM dbo.Staff\n" +
            "), lo AS (\n" +
            "    SELECT Dept, Name, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary ASC) AS rn\n" +
            "    FROM dbo.Staff\n" +
            ")\n" +
            "SELECT hi.Dept, hi.Name AS TopEarner, hi.Salary AS TopSalary,\n" +
            "       lo.Name AS BottomEarner, lo.Salary AS BottomSalary\n" +
            "FROM hi\n" +
            "JOIN lo ON lo.Dept = hi.Dept AND lo.rn = 1\n" +
            "WHERE hi.rn = 1\n" +
            "ORDER BY hi.Dept;"
        }
      ],
      walkthrough: [
        { step: "Full-partition window per department", note: "Ordered by salary DESC, every row sees the same top (FIRST_VALUE) and bottom (LAST_VALUE, full frame).",
          table: { columns: ["Dept","TopEarner","TopSalary","BottomEarner","BottomSalary"],
            rows: [["Sales","Bob",7000,"Ana",5000],["Sales","Bob",7000,"Ana",5000],["Sales","Bob",7000,"Ana",5000],["Tech","Fay",12000,"Eli",8000],["Tech","Fay",12000,"Eli",8000],["Tech","Fay",12000,"Eli",8000]] } },
        { step: "SELECT DISTINCT per department", note: "Collapse the repeated rows to one per department.",
          table: { columns: ["Dept","TopEarner","TopSalary","BottomEarner","BottomSalary"],
            rows: [["Sales","Bob",7000,"Ana",5000],["Tech","Fay",12000,"Eli",8000]] } }
      ],
      patternRecognition: [
        "'Both endpoints of a group on **one row**' → `FIRST_VALUE` + `LAST_VALUE` partitioned.",
        "Using `LAST_VALUE` → always widen the frame to `UNBOUNDED FOLLOWING`."
      ],
      interviewRecall: [
        "The default window frame is RANGE ... CURRENT ROW, which cripples LAST_VALUE.",
        "FIRST_VALUE/LAST_VALUE repeat across the partition — DISTINCT collapses to one row per group."
      ],
      commonMistakes: [
        "Leaving the default frame so LAST_VALUE returns the current row's own name.",
        "Forgetting DISTINCT and returning one row per employee instead of per department."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "median-salary-per-department",
      number: "HR 2088",
      platform: "HackerRank",
      title: "Median Salary per Department",
      difficulty: "Hard",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["HR Analytics"],
      link: "https://www.hackerrank.com/challenges/median-salary-per-department/problem",
      meta: { pattern: "Positional aggregate", sqlConcept: "PERCENTILE_CONT", technique: "Interpolated median" },
      descriptionBrief:
        "Given a **Payroll** table (`Dept`, `Salary`), compute the **median salary of each " +
        "department**. With an even count, the median is the average of the two middle values; " +
        "with an odd count it is the single middle value.",
      schema: [
        { name: "Payroll", columns: [
          { name: "EmpId", type: "INT", note: "PK" },
          { name: "Dept", type: "VARCHAR(30)" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Payroll','U') IS NOT NULL DROP TABLE dbo.Payroll;\n" +
        "CREATE TABLE dbo.Payroll (EmpId INT PRIMARY KEY, Dept VARCHAR(30), Salary INT);\n" +
        "INSERT INTO dbo.Payroll VALUES\n" +
        "  (1,'A',10),(2,'A',20),(3,'A',30),(4,'A',40),\n" +
        "  (5,'B',10),(6,'B',20),(7,'B',30);",
      sampleData: [
        { table: "Payroll", columns: ["EmpId","Dept","Salary"],
          rows: [[1,"A",10],[2,"A",20],[3,"A",30],[4,"A",40],[5,"B",10],[6,"B",20],[7,"B",30]] }
      ],
      expectedOutput: { columns: ["Dept","MedianSalary"],
        rows: [["A","25.00"],["B","20.00"]] },
      approaches: [
        {
          name: "PERCENTILE_CONT(0.5) (recommended)",
          perfNote: "One ordered pass per partition; the built-in interpolates the 50th percentile directly, handling odd/even counts with no manual middle-row math.",
          dialectNote: "",
          logic:
            "**What it asks.** The median salary per department — average of the two middles when the count is even, the single middle when odd.\n\n" +
            "**Why the naive idea fails.** `AVG(Salary)` is the mean, not the median. Hand-rolling the median with `ROW_NUMBER` and count parity works but needs careful `(cnt+1)/2` and `cnt/2 + 1` index arithmetic that is easy to get wrong on even counts.\n\n" +
            "**Key Idea.** `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary) OVER (PARTITION BY Dept)` returns the *continuous* (interpolated) 50th percentile — exactly the median definition.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Within each department, order by `Salary` inside `WITHIN GROUP`.\n" +
            "2. `PERCENTILE_CONT(0.5)` interpolates the midpoint; `OVER (PARTITION BY Dept)` computes it per group.\n" +
            "3. The value repeats on every partition row, so `SELECT DISTINCT` one row per department.\n" +
            "4. Order the output by department.\n\n" +
            "**Why it works.** For an even count PERCENTILE_CONT averages the two straddling values (dept A: (20+30)/2 = 25); for an odd count it lands exactly on the middle value (dept B: 20).\n\n" +
            "**Common Gotchas.** PERCENTILE_CONT is a *window/analytic* function in SQL Server — it has no plain GROUP BY form, so you use `OVER (PARTITION BY ...)` and de-duplicate. Its result is `FLOAT`; cast for tidy display.\n\n" +
            "**Performance.** A sort per partition, O(n log n); an index on `(Dept, Salary)` supplies the order.\n\n" +
            "**Interview mindset.** 'Median / any percentile, interpolated' → PERCENTILE_CONT. 'Must return an actual existing value' → PERCENTILE_DISC.",
          tsql:
            "SELECT DISTINCT Dept,\n" +
            "       CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary)\n" +
            "            OVER (PARTITION BY Dept) AS DECIMAL(10,2)) AS MedianSalary  -- interpolated 50th pct\n" +
            "FROM dbo.Payroll\n" +
            "ORDER BY Dept;",
          clean:
            "SELECT DISTINCT Dept,\n" +
            "       CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY Salary)\n" +
            "            OVER (PARTITION BY Dept) AS DECIMAL(10,2)) AS MedianSalary\n" +
            "FROM dbo.Payroll\n" +
            "ORDER BY Dept;"
        },
        {
          name: "ROW_NUMBER parity method",
          perfNote: "Portable median without PERCENTILE_CONT: number rows per department and average the middle one or two. Works on engines lacking the ordered-set aggregate.",
          dialectNote: "",
          logic:
            "**Key Idea.** Number each department's salaries in order, then average the row(s) at the center — one middle row for odd counts, two for even.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE: `ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary)` as `rn`, plus `COUNT(*) OVER (PARTITION BY Dept)` as `cnt`.\n" +
            "2. Keep rows where `rn IN ((cnt+1)/2, (cnt+2)/2)` — one row when odd, two when even.\n" +
            "3. `GROUP BY Dept` and `AVG` the kept salaries.\n\n" +
            "**Why it works.** Integer division makes both expressions equal the single middle index on odd counts and the two straddling indices on even counts; averaging yields the median either way.\n\n" +
            "**Common Gotchas.** Use a decimal AVG (multiply by 1.0 or cast) so even-count medians aren't integer-truncated.\n\n" +
            "**Performance.** One partitioned sort plus a grouped average; the same `(Dept, Salary)` index serves the order.\n\n" +
            "**Interview mindset.** The bulletproof fallback when the interviewer says 'now do it without PERCENTILE_CONT'.",
          tsql:
            "WITH r AS (\n" +
            "    SELECT Dept, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary) AS rn,\n" +
            "           COUNT(*)     OVER (PARTITION BY Dept)                 AS cnt\n" +
            "    FROM dbo.Payroll\n" +
            ")\n" +
            "SELECT Dept,\n" +
            "       CAST(AVG(Salary * 1.0) AS DECIMAL(10,2)) AS MedianSalary  -- decimal average of middle row(s)\n" +
            "FROM r\n" +
            "WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)\n" +
            "GROUP BY Dept\n" +
            "ORDER BY Dept;",
          clean:
            "WITH r AS (\n" +
            "    SELECT Dept, Salary,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Dept ORDER BY Salary) AS rn,\n" +
            "           COUNT(*)     OVER (PARTITION BY Dept)                 AS cnt\n" +
            "    FROM dbo.Payroll\n" +
            ")\n" +
            "SELECT Dept,\n" +
            "       CAST(AVG(Salary * 1.0) AS DECIMAL(10,2)) AS MedianSalary\n" +
            "FROM r\n" +
            "WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)\n" +
            "GROUP BY Dept\n" +
            "ORDER BY Dept;"
        }
      ],
      walkthrough: [
        { step: "Order salaries within each department", note: "Dept A has an even count (4 rows); Dept B is odd (3 rows).",
          table: { columns: ["Dept","Salary","rn","cnt"],
            rows: [["A",10,1,4],["A",20,2,4],["A",30,3,4],["A",40,4,4],["B",10,1,3],["B",20,2,3],["B",30,3,3]] } },
        { step: "Interpolate the 50th percentile", note: "A: (20+30)/2 = 25.00; B: single middle 20.00.",
          table: { columns: ["Dept","MedianSalary"],
            rows: [["A","25.00"],["B","20.00"]] } }
      ],
      patternRecognition: [
        "'Median / percentile, **interpolated**' → `PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY g)`.",
        "'Percentile that must be an **existing value**' → `PERCENTILE_DISC`."
      ],
      interviewRecall: [
        "In SQL Server PERCENTILE_CONT/DISC are analytic-only (OVER), never plain GROUP BY — de-dup with DISTINCT.",
        "The ROW_NUMBER parity trick (rn IN ((cnt+1)/2,(cnt+2)/2)) is the portable median fallback."
      ],
      commonMistakes: [
        "Returning AVG (the mean) and calling it the median.",
        "Integer-truncating the even-count average by forgetting to compute it in decimal."
      ]
    }

  ]);
})();
