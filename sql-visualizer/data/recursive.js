/*
 * data/recursive.js — Recursive / Hierarchy.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Recursive / Hierarchy", [

    {
      id: "employee-hierarchy-levels",
      number: "SS 10061",
      platform: "StrataScratch",
      title: "Org Chart Depth per Employee",
      difficulty: "Hard",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy", "CTE & Complex Joins"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Tree traversal", sqlConcept: "Recursive CTE", technique: "Anchor + recursive member" },
      descriptionBrief:
        "Given **Employee(Id, Name, ManagerId)** forming an org tree, return each employee " +
        "with their **level** in the hierarchy (the CEO = level 1).",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "ManagerId", type: "INT", note: "FK → Employee.Id (NULL for CEO)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Ada',NULL),(2,'Ben',1),(3,'Cara',1),(4,'Dan',2),(5,'Eve',4);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","ManagerId"],
          rows: [[1,"Ada",null],[2,"Ben",1],[3,"Cara",1],[4,"Dan",2],[5,"Eve",4]] }
      ],
      expectedOutput: { columns: ["Id","Name","Level"],
        rows: [[1,"Ada",1],[2,"Ben",2],[3,"Cara",2],[4,"Dan",3],[5,"Eve",4]] },
      approaches: [
        {
          name: "Recursive CTE (recommended)",
          perfNote: "Each recursion level is one join to the prior level; index ManagerId. Set MAXRECURSION if the tree can exceed the 100 default.",
          dialectNote: "Recursive CTEs use `WITH … AS (anchor UNION ALL recursive)`; the recursive member references the CTE by name.",
          logic:
            "**What it asks.** The depth of every node in a manager tree.\n\n" +
            "**Why the naive idea fails.** The depth is unbounded — you can't self-join a fixed number of times without knowing the tree's height.\n\n" +
            "**Key Idea.** A recursive CTE: the **anchor** selects the root (ManagerId IS NULL) at level 1; the **recursive member** joins employees to already-found managers, adding 1 to the level each step.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: CEO rows with `Level = 1`.\n" +
            "2. Recursive member: `JOIN cte p ON e.ManagerId = p.Id`, `Level = p.Level + 1`.\n" +
            "3. `UNION ALL` accumulates all levels until no new rows are produced.\n\n" +
            "**Why it works.** Each iteration discovers the direct reports of the previous level, so levels grow one layer at a time until the tree is exhausted.\n\n" +
            "**Common Gotchas.** A cycle in the data loops forever — the 100-level default guards it; raise with `OPTION (MAXRECURSION n)` for deep trees.\n\n" +
            "**Performance.** One join per depth level; index `ManagerId`.\n\n" +
            "**Interview mindset.** 'traverse a tree/graph of unknown depth' → recursive CTE (anchor + recursive member).",
          tsql:
            "WITH OrgChart AS (\n" +
            "    SELECT Id, Name, 1 AS Level          -- anchor: the CEO\n" +
            "    FROM dbo.Employee\n" +
            "    WHERE ManagerId IS NULL\n" +
            "    UNION ALL\n" +
            "    SELECT e.Id, e.Name, p.Level + 1     -- one level deeper each step\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN OrgChart p ON e.ManagerId = p.Id\n" +
            ")\n" +
            "SELECT Id, Name, Level\n" +
            "FROM OrgChart\n" +
            "ORDER BY Level, Id;",
          clean:
            "WITH OrgChart AS (\n" +
            "    SELECT Id, Name, 1 AS Level\n" +
            "    FROM dbo.Employee\n" +
            "    WHERE ManagerId IS NULL\n" +
            "    UNION ALL\n" +
            "    SELECT e.Id, e.Name, p.Level + 1\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN OrgChart p ON e.ManagerId = p.Id\n" +
            ")\n" +
            "SELECT Id, Name, Level\n" +
            "FROM OrgChart\n" +
            "ORDER BY Level, Id;"
        }
      ],
      walkthrough: [
        { step: "Anchor: level 1", note: "Ada (no manager).",
          table: { columns: ["Id","Name","Level"], rows: [[1,"Ada",1]] } },
        { step: "Recurse down the tree", note: "Ben/Cara → 2, Dan → 3, Eve → 4.",
          table: { columns: ["Id","Name","Level"],
            rows: [[1,"Ada",1],[2,"Ben",2],[3,"Cara",2],[4,"Dan",3],[5,"Eve",4]] } }
      ],
      patternRecognition: [
        "'unknown-depth tree / ancestors / path' → recursive CTE with an anchor and a recursive member."
      ],
      interviewRecall: [
        "Anchor = base case; recursive member references the CTE and must converge.",
        "Default MAXRECURSION is 100; OPTION (MAXRECURSION 0) removes the cap (careful with cycles)."
      ],
      commonMistakes: [
        "Omitting UNION ALL / the anchor, or a recursive member that never stops (cyclic data).",
        "Forgetting to increment the level, so every row reports the same depth."
      ]
    },

    {
      id: "date-series-fill",
      number: "DL 10277",
      platform: "DataLemur",
      title: "Generate a Continuous Date Series",
      difficulty: "Medium",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy"],
      domains: ["Reporting"],
      link: "https://datalemur.com/",
      meta: { pattern: "Number/date generator", sqlConcept: "Recursive CTE counter", technique: "Manufacture missing rows" },
      descriptionBrief:
        "Return every calendar date from **2024-01-01 to 2024-01-05 inclusive**, one row per " +
        "day — a continuous date spine you could LEFT JOIN sparse data onto.",
      schema: [
        { name: "(no source table)", columns: [
          { name: "—", type: "—", note: "dates are generated, not read" } ] }
      ],
      setupSql:
        "-- No base table needed; the query below manufactures the date rows.\n" +
        "SELECT 1 AS Note;",
      sampleData: [
        { table: "Parameters", columns: ["StartDate","EndDate"], rows: [["2024-01-01","2024-01-05"]] }
      ],
      expectedOutput: { columns: ["TheDate"],
        rows: [["2024-01-01"],["2024-01-02"],["2024-01-03"],["2024-01-04"],["2024-01-05"]] },
      approaches: [
        {
          name: "Recursive CTE counter (recommended)",
          perfNote: "One row generated per recursion step; cheap for small ranges. For very large spans prefer a numbers/tally table to avoid the recursion cap.",
          dialectNote: "Set OPTION (MAXRECURSION n) when the span exceeds 100 days (the default cap).",
          logic:
            "**What it asks.** A gapless list of dates between two bounds, even though no table stores them.\n\n" +
            "**Why the naive idea fails.** You can't SELECT dates that aren't in any table; they must be manufactured.\n\n" +
            "**Key Idea.** A recursive CTE that starts at the start date and adds one day each step until it reaches the end date.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: `SELECT CAST('2024-01-01' AS DATE)`.\n" +
            "2. Recursive member: `DATEADD(DAY,1,TheDate)` while `< end date`.\n" +
            "3. Select all generated rows.\n\n" +
            "**Why it works.** Each iteration produces the next day; recursion stops when the guard fails.\n\n" +
            "**Common Gotchas.** A span over 100 days hits the default MAXRECURSION — raise it or use a tally table. Keep the stop condition inside the recursive member.\n\n" +
            "**Performance.** O(number of days); a persisted calendar/tally table is faster for big or repeated use.\n\n" +
            "**Interview mindset.** 'fill gaps / one row per day' → generate a spine (recursive CTE or tally table), then LEFT JOIN your data.",
          tsql:
            "WITH Dates AS (\n" +
            "    SELECT CAST('2024-01-01' AS DATE) AS TheDate      -- anchor\n" +
            "    UNION ALL\n" +
            "    SELECT DATEADD(DAY, 1, TheDate)                   -- next day\n" +
            "    FROM Dates\n" +
            "    WHERE TheDate < '2024-01-05'\n" +
            ")\n" +
            "SELECT TheDate\n" +
            "FROM Dates\n" +
            "ORDER BY TheDate;",
          clean:
            "WITH Dates AS (\n" +
            "    SELECT CAST('2024-01-01' AS DATE) AS TheDate\n" +
            "    UNION ALL\n" +
            "    SELECT DATEADD(DAY, 1, TheDate) FROM Dates WHERE TheDate < '2024-01-05'\n" +
            ")\n" +
            "SELECT TheDate FROM Dates ORDER BY TheDate;"
        }
      ],
      walkthrough: [
        { step: "Add one day until the end bound", note: "Jan 1 → Jan 5, one row each.",
          table: { columns: ["TheDate"],
            rows: [["2024-01-01"],["2024-01-02"],["2024-01-03"],["2024-01-04"],["2024-01-05"]] } }
      ],
      patternRecognition: [
        "'one row per day/number even where data is missing' → generate a series (recursive CTE or tally table)."
      ],
      interviewRecall: [
        "Recursive CTEs generate rows, not just traverse tables.",
        "Default MAXRECURSION is 100 — raise it for long spans or use a numbers table."
      ],
      commonMistakes: [
        "Exceeding MAXRECURSION on a long date span.",
        "Putting the stop condition outside the recursive member."
      ]
    },

    {
      id: "management-chain-path",
      number: "SS 10101",
      platform: "StrataScratch",
      title: "Full Management Chain per Employee",
      difficulty: "Hard",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy", "String & Date Functions"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Ancestor path", sqlConcept: "Recursive CTE path-building", technique: "Accumulate a path string" },
      descriptionBrief:
        "Given **Employee(Id, Name, ManagerId)**, return each employee with the **chain of " +
        "names from the CEO down to them**, joined by ' > '.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "ManagerId", type: "INT", note: "NULL for CEO" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Ada',NULL),(2,'Ben',1),(3,'Dan',2);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","ManagerId"],
          rows: [[1,"Ada",null],[2,"Ben",1],[3,"Dan",2]] }
      ],
      expectedOutput: { columns: ["Id","Name","Chain"],
        rows: [[1,"Ada","Ada"],[2,"Ben","Ada > Ben"],[3,"Dan","Ada > Ben > Dan"]] },
      approaches: [
        {
          name: "Recursive CTE building a path (recommended)",
          perfNote: "Each level appends one name to the accumulated path; index ManagerId. Cast the path to a wide varchar so it doesn't truncate deep chains.",
          dialectNote: "Give the path column a wide type in the anchor (e.g. CAST(Name AS VARCHAR(1000))) so concatenation doesn't silently truncate.",
          logic:
            "**What it asks.** For each person, the top-down list of managers ending at them.\n\n" +
            "**Why the naive idea fails.** The chain length varies per employee, so a fixed number of self-joins can't build it.\n\n" +
            "**Key Idea.** A recursive CTE carries an accumulating **path string**: the anchor (CEO) starts the path with their own name; each recursive step appends the child's name after ' > '.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: CEO row, `Chain = CAST(Name AS VARCHAR(1000))`.\n" +
            "2. Recursive member: join children to parents, `Chain = p.Chain + ' > ' + e.Name`.\n" +
            "3. Select each employee with its finished chain.\n\n" +
            "**Why it works.** The path is threaded down the tree, gaining one name per level, so every node ends with its complete ancestry.\n\n" +
            "**Common Gotchas.** Type the path wide in the anchor or deep chains truncate; guard against cycles with MAXRECURSION.\n\n" +
            "**Performance.** One join per depth level.\n\n" +
            "**Interview mindset.** 'accumulate a path/running value down a hierarchy' → recursive CTE that concatenates as it descends.",
          tsql:
            "WITH Chain AS (\n" +
            "    SELECT Id, Name,\n" +
            "           CAST(Name AS VARCHAR(1000)) AS Chain      -- anchor: CEO starts the path\n" +
            "    FROM dbo.Employee\n" +
            "    WHERE ManagerId IS NULL\n" +
            "    UNION ALL\n" +
            "    SELECT e.Id, e.Name,\n" +
            "           CAST(p.Chain + ' > ' + e.Name AS VARCHAR(1000))  -- append child\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN Chain p ON e.ManagerId = p.Id\n" +
            ")\n" +
            "SELECT Id, Name, Chain\n" +
            "FROM Chain\n" +
            "ORDER BY Id;",
          clean:
            "WITH Chain AS (\n" +
            "    SELECT Id, Name, CAST(Name AS VARCHAR(1000)) AS Chain\n" +
            "    FROM dbo.Employee WHERE ManagerId IS NULL\n" +
            "    UNION ALL\n" +
            "    SELECT e.Id, e.Name, CAST(p.Chain + ' > ' + e.Name AS VARCHAR(1000))\n" +
            "    FROM dbo.Employee e JOIN Chain p ON e.ManagerId = p.Id\n" +
            ")\n" +
            "SELECT Id, Name, Chain FROM Chain ORDER BY Id;"
        }
      ],
      walkthrough: [
        { step: "Thread the name path down the tree", note: "Ada → 'Ada'; Ben → 'Ada > Ben'; Dan → 'Ada > Ben > Dan'.",
          table: { columns: ["Id","Chain"], rows: [[1,"Ada"],[2,"Ada > Ben"],[3,"Ada > Ben > Dan"]] } }
      ],
      patternRecognition: [
        "'ancestor path / breadcrumb / running concatenation down a hierarchy' → recursive CTE building a string."
      ],
      interviewRecall: [
        "Type the accumulating column wide in the anchor to avoid truncation.",
        "The recursive member appends to the parent's already-built value."
      ],
      commonMistakes: [
        "Anchoring the path as a short varchar and truncating deep chains.",
        "Appending the parent instead of the current child, or reversing the order."
      ]
    }

  ]);
})();
