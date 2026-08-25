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
    }

  ]);
})();
