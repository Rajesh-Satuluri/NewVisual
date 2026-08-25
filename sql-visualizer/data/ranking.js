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
    }

  ]);
})();
