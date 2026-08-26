/*
 * data/misc2.js — additional problems across five categories.
 * ONE file registering into FIVE categories via FIVE window.SQLLAB.register calls.
 * Recursive 3, Pivot 2, Gaps&Islands 1, Set Operations 1, DML/DDL 1 = 8 problems.
 * All T-SQL targets SQL Server 2019/2022 and runs as-is in SSMS 19/21.
 */
(function () {

  /* ================================================================== */
  /* Recursive / Hierarchy (3)                                          */
  /* ================================================================== */
  window.SQLLAB.register("Recursive / Hierarchy", [

    {
      id: "misc2-factorial-series",
      number: "DL 10611",
      platform: "DataLemur",
      title: "Factorials 1..N (Running Product)",
      difficulty: "Medium",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy"],
      domains: ["Math / Reporting"],
      link: "https://datalemur.com/",
      meta: { pattern: "Accumulating generator", sqlConcept: "Recursive CTE running product", technique: "Carry a running value across rows" },
      descriptionBrief:
        "Produce one row per integer from **1 to N (here N = 6)** with its **factorial** " +
        "(1! = 1, 2! = 2, … 6! = 720). No table stores the values — each factorial is the " +
        "previous one multiplied by the current integer.",
      schema: [
        { name: "(no source table)", columns: [
          { name: "—", type: "—", note: "values are generated; N is the only parameter" } ] }
      ],
      setupSql:
        "-- No base table needed; the recursive query manufactures the rows.\n" +
        "SELECT 1 AS Note;",
      sampleData: [
        { table: "Parameters", columns: ["N"], rows: [[6]] }
      ],
      expectedOutput: { columns: ["N", "Factorial"],
        rows: [[1, 1], [2, 2], [3, 6], [4, 24], [5, 120], [6, 720]] },
      approaches: [
        {
          name: "Recursive CTE running product (recommended)",
          perfNote: "One row generated per recursion step; the product is carried forward so it is never recomputed. Cast to BIGINT to avoid INT overflow past 12!.",
          dialectNote: "Set OPTION (MAXRECURSION n) if N could exceed the default cap of 100.",
          logic:
            "**What it asks.** A generated series 1..N where each row also carries the factorial of that integer.\n\n" +
            "**Why the naive idea fails.** There is no table to SELECT from, and a factorial depends on *all* prior integers, so a single aggregate over a numbers table would have to re-multiply a growing prefix per row.\n\n" +
            "**Key Idea.** A recursive CTE seeds `(N=1, Fact=1)` and, each step, advances to `N+1` while multiplying the carried product by `N+1` — the running product is threaded through the recursion.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: `SELECT 1 AS N, CAST(1 AS BIGINT) AS Fact`.\n" +
            "2. Recursive member: `SELECT N + 1, Fact * (N + 1) FROM F WHERE N < 6`.\n" +
            "3. Select every generated row ordered by N.\n\n" +
            "**Why it works.** Each iteration multiplies exactly one new factor into the value the previous row already computed, so row k holds k!.\n\n" +
            "**Common Gotchas.** Type the product `BIGINT` in the anchor — plain INT overflows at 13!. Keep the stop condition (`N < 6`) inside the recursive member.\n\n" +
            "**Performance.** O(N) rows, one multiply each; for very large N a set-based `EXP(SUM(LOG(...)))` trick avoids the recursion cap but loses exactness.\n\n" +
            "**Interview mindset.** 'each row depends on the running value of the row before it' → recursive CTE carrying an accumulator.",
          tsql:
            "WITH F AS (\n" +
            "    SELECT 1 AS N, CAST(1 AS BIGINT) AS Fact       -- anchor: 1! = 1\n" +
            "    UNION ALL\n" +
            "    SELECT N + 1, Fact * (N + 1)                   -- multiply in the next integer\n" +
            "    FROM F\n" +
            "    WHERE N < 6\n" +
            ")\n" +
            "SELECT N, Fact AS Factorial\n" +
            "FROM F\n" +
            "ORDER BY N;",
          clean:
            "WITH F AS (\n" +
            "    SELECT 1 AS N, CAST(1 AS BIGINT) AS Fact\n" +
            "    UNION ALL\n" +
            "    SELECT N + 1, Fact * (N + 1) FROM F WHERE N < 6\n" +
            ")\n" +
            "SELECT N, Fact AS Factorial FROM F ORDER BY N;"
        }
      ],
      walkthrough: [
        { step: "Seed then multiply the running product", note: "Fact_k = Fact_(k-1) * k, carried step by step.",
          table: { columns: ["N", "Factorial"],
            rows: [[1, 1], [2, 2], [3, 6], [4, 24], [5, 120], [6, 720]] } }
      ],
      patternRecognition: [
        "'each row = previous row's value combined with the current one' → recursive CTE carrying an accumulator (sum, product, path)."
      ],
      interviewRecall: [
        "Recursive CTEs can carry a running value, not just a level counter.",
        "Widen the accumulator's type in the anchor (BIGINT) so it does not overflow."
      ],
      commonMistakes: [
        "Anchoring the product as INT and overflowing on large N.",
        "Putting the `N < 6` guard outside the recursive member so recursion never terminates."
      ]
    },

    {
      id: "misc2-org-subtree-size",
      number: "SS 10440",
      platform: "StrataScratch",
      title: "Subtree Size per Manager",
      difficulty: "Hard",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy", "CTE & Complex Joins"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Descendant enumeration", sqlConcept: "Recursive CTE reachability", technique: "Ancestor-descendant pairs + COUNT" },
      descriptionBrief:
        "Given **Employee(Id, Name, ManagerId)**, return for each employee the **size of their " +
        "subtree** — themselves plus everyone reporting to them at any depth. A leaf's subtree " +
        "size is 1; the CEO's is the whole company.",
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
        "  (1,'Ada',NULL),(2,'Ben',1),(3,'Cara',1),(4,'Dan',2),(5,'Eve',2);",
      sampleData: [
        { table: "Employee", columns: ["Id", "Name", "ManagerId"],
          rows: [[1, "Ada", null], [2, "Ben", 1], [3, "Cara", 1], [4, "Dan", 2], [5, "Eve", 2]] }
      ],
      expectedOutput: { columns: ["Id", "Name", "SubtreeSize"],
        rows: [[1, "Ada", 5], [2, "Ben", 3], [3, "Cara", 1], [4, "Dan", 1], [5, "Eve", 1]] },
      approaches: [
        {
          name: "Recursive reachability pairs (recommended)",
          perfNote: "Builds every (root, descendant) pair once, then a single GROUP BY counts each subtree. One recursive pass instead of a per-employee re-traversal.",
          dialectNote: "Each employee seeds its own root so the pair set includes the node itself (distance 0).",
          logic:
            "**What it asks.** For every node, how many nodes lie in the subtree rooted at it (inclusive).\n\n" +
            "**Why the naive idea fails.** Counting direct reports (`GROUP BY ManagerId`) only measures depth 1; subtree size is recursive and the depth is unknown, so a fixed set of self-joins can't reach every descendant.\n\n" +
            "**Key Idea.** Generate all **ancestor→descendant reachability pairs** with a recursive CTE — each employee reaches itself, and every step extends a reached node to its children — then `COUNT(*)` the descendants grouped by the root.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: `SELECT Id AS RootId, Id AS NodeId FROM Employee` (every node reaches itself).\n" +
            "2. Recursive member: join `Employee e` to the CTE on `e.ManagerId = NodeId`, keeping the same `RootId`, new `NodeId = e.Id`.\n" +
            "3. `GROUP BY RootId` and `COUNT(*)`; join back to Employee for the name.\n\n" +
            "**Why it works.** The pair set contains exactly one row per (root, node-in-its-subtree), so counting per root yields the subtree size including the root itself.\n\n" +
            "**Common Gotchas.** Seed each node as its own root (distance 0) or leaves count 0 instead of 1. Cyclic data loops — MAXRECURSION guards it.\n\n" +
            "**Performance.** Produces O(sum of subtree sizes) pairs; fine for typical org charts, heavier for very bushy deep trees. Index `ManagerId`.\n\n" +
            "**Interview mindset.** 'aggregate over all descendants' → materialize reachability pairs first, then a plain GROUP BY.",
          tsql:
            "WITH Reach AS (\n" +
            "    SELECT Id AS RootId, Id AS NodeId       -- every node reaches itself\n" +
            "    FROM dbo.Employee\n" +
            "    UNION ALL\n" +
            "    SELECT r.RootId, e.Id                    -- extend to each child\n" +
            "    FROM dbo.Employee e\n" +
            "    JOIN Reach r ON e.ManagerId = r.NodeId\n" +
            ")\n" +
            "SELECT e.Id, e.Name, COUNT(*) AS SubtreeSize\n" +
            "FROM Reach r\n" +
            "JOIN dbo.Employee e ON e.Id = r.RootId\n" +
            "GROUP BY e.Id, e.Name\n" +
            "ORDER BY e.Id;",
          clean:
            "WITH Reach AS (\n" +
            "    SELECT Id AS RootId, Id AS NodeId FROM dbo.Employee\n" +
            "    UNION ALL\n" +
            "    SELECT r.RootId, e.Id\n" +
            "    FROM dbo.Employee e JOIN Reach r ON e.ManagerId = r.NodeId\n" +
            ")\n" +
            "SELECT e.Id, e.Name, COUNT(*) AS SubtreeSize\n" +
            "FROM Reach r JOIN dbo.Employee e ON e.Id = r.RootId\n" +
            "GROUP BY e.Id, e.Name ORDER BY e.Id;"
        }
      ],
      walkthrough: [
        { step: "Reachability pairs per root", note: "Ada reaches all 5; Ben reaches Ben/Dan/Eve; leaves reach only themselves.",
          table: { columns: ["RootId", "NodeId"],
            rows: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [2, 2], [2, 4], [2, 5], [3, 3], [4, 4], [5, 5]] } },
        { step: "COUNT per root", note: "Group by RootId gives the inclusive subtree size.",
          table: { columns: ["Id", "Name", "SubtreeSize"],
            rows: [[1, "Ada", 5], [2, "Ben", 3], [3, "Cara", 1], [4, "Dan", 1], [5, "Eve", 1]] } }
      ],
      patternRecognition: [
        "'aggregate/count over all descendants of each node' → build recursive reachability pairs, then GROUP BY the root."
      ],
      interviewRecall: [
        "Seed every node as its own root so the count is inclusive (subtree size ≥ 1).",
        "Reachability-pair CTEs turn a tree question into a flat GROUP BY."
      ],
      commonMistakes: [
        "Only counting direct reports (`GROUP BY ManagerId`), which measures depth 1, not the whole subtree.",
        "Forgetting the self-pair anchor, so leaves report size 0."
      ]
    },

    {
      id: "misc2-bom-explosion",
      number: "HR BOM-1",
      platform: "HackerRank",
      title: "Bill-of-Materials Explosion",
      difficulty: "Hard",
      category: "Recursive / Hierarchy",
      topics: ["Recursive / Hierarchy", "CTE & Complex Joins"],
      domains: ["Manufacturing"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Multi-level BOM", sqlConcept: "Recursive CTE with quantity multiply", technique: "Propagate multiplied quantities down a DAG" },
      descriptionBrief:
        "Given a **BOM(Parent, Child, Qty)** assembly graph, explode the top assembly **'Bike'** " +
        "into every component it contains at any depth, with the **total quantity** required — " +
        "quantities multiply along each path (a Wheel needing 3 Spokes, with 2 Wheels per Bike, " +
        "means 6 Spokes).",
      schema: [
        { name: "BOM", columns: [
          { name: "Parent", type: "VARCHAR(30)", note: "assembly" },
          { name: "Child", type: "VARCHAR(30)", note: "component" },
          { name: "Qty", type: "INT", note: "children per parent" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.BOM','U') IS NOT NULL DROP TABLE dbo.BOM;\n" +
        "CREATE TABLE dbo.BOM (Parent VARCHAR(30), Child VARCHAR(30), Qty INT);\n" +
        "INSERT INTO dbo.BOM VALUES\n" +
        "  ('Bike','Frame',1),('Bike','Wheel',2),\n" +
        "  ('Wheel','Rim',1),('Wheel','Spoke',3);",
      sampleData: [
        { table: "BOM", columns: ["Parent", "Child", "Qty"],
          rows: [["Bike", "Frame", 1], ["Bike", "Wheel", 2], ["Wheel", "Rim", 1], ["Wheel", "Spoke", 3]] }
      ],
      expectedOutput: { columns: ["Component", "TotalQty"],
        rows: [["Frame", 1], ["Rim", 2], ["Spoke", 6], ["Wheel", 2]] },
      approaches: [
        {
          name: "Recursive CTE with multiplied quantity (recommended)",
          perfNote: "One recursion level per BOM tier; the carried quantity is multiplied on the way down so the leaf total is already computed. Index BOM(Parent).",
          dialectNote: "Set OPTION (MAXRECURSION n) for very deep assemblies beyond the 100 default.",
          logic:
            "**What it asks.** Every part under 'Bike', with quantities compounded through the assembly levels.\n\n" +
            "**Why the naive idea fails.** A single join sees only direct children (Frame, Wheel) and misses sub-components (Rim, Spoke); and even reaching them, you must *multiply* the quantities along the path, not add them.\n\n" +
            "**Key Idea.** A recursive CTE seeds the top assembly's direct children and, each step, joins a discovered component to *its* children while multiplying the running quantity by the child's per-parent quantity.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: `SELECT Parent, Child, Qty FROM BOM WHERE Parent = 'Bike'`.\n" +
            "2. Recursive member: join the CTE's `Child` to `BOM.Parent`, computing `Qty = e.Qty * b.Qty`.\n" +
            "3. `GROUP BY Child` and `SUM(Qty)` to total parts that appear via multiple paths.\n\n" +
            "**Why it works.** Multiplication is the correct composition for nested quantities; summing at the end folds together the same component reached down different branches.\n\n" +
            "**Common Gotchas.** Multiply (not add) the quantities. A real BOM is a DAG — a genuine cycle would loop forever, so keep MAXRECURSION as a guard.\n\n" +
            "**Performance.** One join per BOM depth; index `BOM(Parent)` for the recursive lookups.\n\n" +
            "**Interview mindset.** 'explode nested quantities / multi-level BOM' → recursive CTE that multiplies a carried quantity, then SUM per component.",
          tsql:
            "WITH Explosion AS (\n" +
            "    SELECT Parent, Child, Qty                       -- anchor: Bike's direct parts\n" +
            "    FROM dbo.BOM\n" +
            "    WHERE Parent = 'Bike'\n" +
            "    UNION ALL\n" +
            "    SELECT e.Parent, b.Child, e.Qty * b.Qty         -- multiply down each level\n" +
            "    FROM Explosion e\n" +
            "    JOIN dbo.BOM b ON b.Parent = e.Child\n" +
            ")\n" +
            "SELECT Child AS Component, SUM(Qty) AS TotalQty\n" +
            "FROM Explosion\n" +
            "GROUP BY Child\n" +
            "ORDER BY Child;",
          clean:
            "WITH Explosion AS (\n" +
            "    SELECT Parent, Child, Qty FROM dbo.BOM WHERE Parent = 'Bike'\n" +
            "    UNION ALL\n" +
            "    SELECT e.Parent, b.Child, e.Qty * b.Qty\n" +
            "    FROM Explosion e JOIN dbo.BOM b ON b.Parent = e.Child\n" +
            ")\n" +
            "SELECT Child AS Component, SUM(Qty) AS TotalQty\n" +
            "FROM Explosion GROUP BY Child ORDER BY Child;"
        }
      ],
      walkthrough: [
        { step: "Anchor + recurse, multiplying quantities", note: "Wheel(2) → Rim 2*1=2, Spoke 2*3=6; Frame stays 1.",
          table: { columns: ["Child", "Qty"],
            rows: [["Frame", 1], ["Wheel", 2], ["Rim", 2], ["Spoke", 6]] } },
        { step: "SUM per component", note: "Group by Child (here each appears once).",
          table: { columns: ["Component", "TotalQty"],
            rows: [["Frame", 1], ["Rim", 2], ["Spoke", 6], ["Wheel", 2]] } }
      ],
      patternRecognition: [
        "'multi-level bill of materials / nested quantities' → recursive CTE multiplying a carried quantity, then SUM per component."
      ],
      interviewRecall: [
        "Compose nested quantities by multiplying down the path, not adding.",
        "SUM at the end folds a component reached through multiple sub-assemblies."
      ],
      commonMistakes: [
        "Adding quantities instead of multiplying them across levels.",
        "Stopping at direct children and missing deeper sub-components."
      ]
    }

  ]);

  /* ================================================================== */
  /* Pivot / Conditional Agg (2)                                        */
  /* ================================================================== */
  window.SQLLAB.register("Pivot / Conditional Agg", [

    {
      id: "misc2-monthly-pivot-operator",
      number: "SS 10320",
      platform: "StrataScratch",
      title: "Monthly Sales Pivot (PIVOT Operator)",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg"],
      domains: ["Retail Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Long-to-wide pivot", sqlConcept: "PIVOT operator", technique: "Rotate month rows into columns" },
      descriptionBrief:
        "Given a **Sales(Product, Mon, Amount)** table with one row per product-month, produce a " +
        "wide report with **one row per product** and a **column per month** ('Jan', 'Feb') " +
        "holding that month's total amount — using SQL Server's `PIVOT` operator.",
      schema: [
        { name: "Sales", columns: [
          { name: "Product", type: "VARCHAR(20)" },
          { name: "Mon", type: "VARCHAR(3)", note: "'Jan' | 'Feb'" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "CREATE TABLE dbo.Sales (Product VARCHAR(20), Mon VARCHAR(3), Amount INT);\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  ('A','Jan',100),('A','Feb',150),\n" +
        "  ('B','Jan',80),('B','Feb',90);",
      sampleData: [
        { table: "Sales", columns: ["Product", "Mon", "Amount"],
          rows: [["A", "Jan", 100], ["A", "Feb", 150], ["B", "Jan", 80], ["B", "Feb", 90]] }
      ],
      expectedOutput: { columns: ["Product", "Jan", "Feb"],
        rows: [["A", 100, 150], ["B", 80, 90]] },
      approaches: [
        {
          name: "PIVOT operator (recommended)",
          perfNote: "One aggregation pass; the PIVOT operator is a compact syntax over the same conditional SUM the engine would run anyway.",
          dialectNote: "`PIVOT` is T-SQL-specific. Column names in the `IN (...)` list are hard-coded — dynamic month sets need dynamic SQL.",
          logic:
            "**What it asks.** Rotate the tall product-month table into a wide grid: products down the side, months across the top.\n\n" +
            "**Why the naive idea fails.** Plain `GROUP BY Product` collapses the months together; there is no single column that separates Jan from Feb without spreading them across output columns.\n\n" +
            "**Key Idea.** The `PIVOT` operator turns distinct values of `Mon` into columns and aggregates `Amount` into each cell with `SUM`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Provide a source with exactly the columns involved: the row key (`Product`), the spreading column (`Mon`), the value (`Amount`).\n" +
            "2. `PIVOT (SUM(Amount) FOR Mon IN ([Jan],[Feb]))`.\n" +
            "3. Select `Product, [Jan], [Feb]` and order by product.\n\n" +
            "**Why it works.** PIVOT groups by every source column *not* named in the aggregate or the FOR clause (here just `Product`) and fills each month column with the matching aggregate.\n\n" +
            "**Common Gotchas.** Any stray column in the source is silently added to the implicit GROUP BY and can split rows — expose only the three needed columns, typically via a derived table. The `IN` list is static.\n\n" +
            "**Performance.** Equivalent to conditional aggregation; one pass over Sales.\n\n" +
            "**Interview mindset.** 'known, fixed set of category columns' → PIVOT or conditional SUM; 'unknown set' → dynamic SQL.",
          tsql:
            "SELECT Product, [Jan], [Feb]\n" +
            "FROM (\n" +
            "    SELECT Product, Mon, Amount               -- only the 3 columns PIVOT should see\n" +
            "    FROM dbo.Sales\n" +
            ") s\n" +
            "PIVOT (\n" +
            "    SUM(Amount) FOR Mon IN ([Jan],[Feb])      -- months become columns\n" +
            ") p\n" +
            "ORDER BY Product;",
          clean:
            "SELECT Product, [Jan], [Feb]\n" +
            "FROM (SELECT Product, Mon, Amount FROM dbo.Sales) s\n" +
            "PIVOT (SUM(Amount) FOR Mon IN ([Jan],[Feb])) p\n" +
            "ORDER BY Product;"
        },
        {
          name: "Conditional aggregation (portable)",
          perfNote: "Same single pass; a `SUM(CASE ...)` per month. More verbose but portable across every SQL dialect and easy to extend with computed columns.",
          dialectNote: "Works on any engine — no PIVOT keyword required.",
          logic:
            "**Key Idea.** Replace PIVOT with explicit `SUM(CASE WHEN Mon = 'Jan' THEN Amount END)` columns, grouped by Product.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Product`.\n" +
            "2. One `SUM(CASE WHEN Mon = <month> THEN Amount END)` per target column.\n" +
            "3. Order by product.\n\n" +
            "**Why it works.** The CASE zeroes out non-matching months (returning NULL, which SUM ignores), so each column totals only its own month.\n\n" +
            "**Common Gotchas.** Omitting the ELSE is fine — NULLs are skipped by SUM; use ISNULL if you need 0 instead of NULL for empty cells.\n\n" +
            "**Performance.** Identical to PIVOT — one grouped pass.\n\n" +
            "**Interview mindset.** Show this when asked for the portable equivalent, or when you need expressions PIVOT can't express.",
          tsql:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Mon = 'Jan' THEN Amount END) AS Jan,\n" +
            "       SUM(CASE WHEN Mon = 'Feb' THEN Amount END) AS Feb\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product\n" +
            "ORDER BY Product;",
          clean:
            "SELECT Product,\n" +
            "       SUM(CASE WHEN Mon = 'Jan' THEN Amount END) AS Jan,\n" +
            "       SUM(CASE WHEN Mon = 'Feb' THEN Amount END) AS Feb\n" +
            "FROM dbo.Sales\n" +
            "GROUP BY Product ORDER BY Product;"
        }
      ],
      walkthrough: [
        { step: "Group by Product, spread Mon into columns", note: "Each product's two month rows fold into one wide row.",
          table: { columns: ["Product", "Jan", "Feb"],
            rows: [["A", 100, 150], ["B", 80, 90]] } }
      ],
      patternRecognition: [
        "'one row per entity, a column per known category' → PIVOT operator or SUM(CASE ...).",
        "Static category list → PIVOT/CASE; unknown category list → dynamic SQL."
      ],
      interviewRecall: [
        "PIVOT groups by every source column not in the aggregate or FOR clause — expose only the columns you want.",
        "PIVOT's IN list is static; a changing set of columns needs dynamic SQL."
      ],
      commonMistakes: [
        "Leaving extra columns in the PIVOT source, which split rows via the implicit GROUP BY.",
        "Expecting PIVOT to discover the month values automatically — the IN list is hard-coded."
      ]
    },

    {
      id: "misc2-avg-salary-crosstab",
      number: "DL 2588",
      platform: "DataLemur",
      title: "Average Salary Crosstab by Gender",
      difficulty: "Medium",
      category: "Pivot / Conditional Agg",
      topics: ["Pivot / Conditional Agg"],
      domains: ["HR Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Conditional averages", sqlConcept: "AVG(CASE ...)", technique: "Per-bucket average in one grouped pass" },
      descriptionBrief:
        "Given **Emp(Dept, Gender, Salary)**, build a crosstab with **one row per department** and " +
        "columns **AvgMale** and **AvgFemale** giving the average salary of each gender in that " +
        "department. Missing combinations should be NULL, not skew the average.",
      schema: [
        { name: "Emp", columns: [
          { name: "EmpId", type: "INT", note: "PK" },
          { name: "Dept", type: "VARCHAR(20)" },
          { name: "Gender", type: "CHAR(1)", note: "'M' | 'F'" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Emp','U') IS NOT NULL DROP TABLE dbo.Emp;\n" +
        "CREATE TABLE dbo.Emp (EmpId INT PRIMARY KEY, Dept VARCHAR(20), Gender CHAR(1), Salary INT);\n" +
        "INSERT INTO dbo.Emp VALUES\n" +
        "  (1,'Sales','M',5000),(2,'Sales','F',7000),\n" +
        "  (3,'Tech','M',9000),(4,'Tech','M',11000),(5,'Tech','F',8000);",
      sampleData: [
        { table: "Emp", columns: ["EmpId", "Dept", "Gender", "Salary"],
          rows: [[1, "Sales", "M", 5000], [2, "Sales", "F", 7000], [3, "Tech", "M", 9000], [4, "Tech", "M", 11000], [5, "Tech", "F", 8000]] }
      ],
      expectedOutput: { columns: ["Dept", "AvgMale", "AvgFemale"],
        rows: [["Sales", 5000, 7000], ["Tech", 10000, 8000]] },
      approaches: [
        {
          name: "AVG(CASE ...) conditional average (recommended)",
          perfNote: "One grouped pass; the CASE narrows each AVG to its own gender. No self-join, no repeated scans.",
          dialectNote: "The CASE must have NO ELSE (or ELSE NULL) so AVG divides by the matching count only — an ELSE 0 would corrupt the average.",
          logic:
            "**What it asks.** A department-by-gender grid of *average* salaries, side by side on one row.\n\n" +
            "**Why the naive idea fails.** `AVG(Salary)` grouped by Dept mixes genders together. And unlike a conditional SUM, you cannot fake a conditional average with `AVG(CASE ... ELSE 0 END)` — the zeros inflate the denominator and drag the mean down.\n\n" +
            "**Key Idea.** `AVG(CASE WHEN Gender = 'M' THEN Salary END)` — with the non-matching branch returning NULL — averages only the male salaries, because AVG ignores NULLs in both numerator and count.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY Dept`.\n" +
            "2. `AVG(CASE WHEN Gender = 'M' THEN Salary END) AS AvgMale`.\n" +
            "3. `AVG(CASE WHEN Gender = 'F' THEN Salary END) AS AvgFemale`.\n" +
            "4. Order by department.\n\n" +
            "**Why it works.** AVG divides the sum of non-NULL values by the count of non-NULL values, so the CASE's NULLs simply drop the other gender out of both.\n\n" +
            "**Common Gotchas.** Never add `ELSE 0` — for averages that changes the answer (unlike SUM). A department with no members of a gender yields NULL, which is correct.\n\n" +
            "**Performance.** One pass over Emp grouped by Dept.\n\n" +
            "**Interview mindset.** Conditional SUM tolerates ELSE 0; conditional AVG must leave it NULL — call that distinction out loud.",
          tsql:
            "SELECT Dept,\n" +
            "       AVG(CASE WHEN Gender = 'M' THEN Salary END) AS AvgMale,   -- NULL when not male\n" +
            "       AVG(CASE WHEN Gender = 'F' THEN Salary END) AS AvgFemale  -- NULLs ignored by AVG\n" +
            "FROM dbo.Emp\n" +
            "GROUP BY Dept\n" +
            "ORDER BY Dept;",
          clean:
            "SELECT Dept,\n" +
            "       AVG(CASE WHEN Gender = 'M' THEN Salary END) AS AvgMale,\n" +
            "       AVG(CASE WHEN Gender = 'F' THEN Salary END) AS AvgFemale\n" +
            "FROM dbo.Emp\n" +
            "GROUP BY Dept ORDER BY Dept;"
        }
      ],
      walkthrough: [
        { step: "Conditional AVG per gender, grouped by Dept", note: "Tech male avg = (9000+11000)/2 = 10000; Tech female = 8000.",
          table: { columns: ["Dept", "AvgMale", "AvgFemale"],
            rows: [["Sales", 5000, 7000], ["Tech", 10000, 8000]] } }
      ],
      patternRecognition: [
        "'average per sub-bucket across columns' → AVG(CASE WHEN bucket THEN value END) with no ELSE."
      ],
      interviewRecall: [
        "AVG ignores NULLs in both numerator and denominator — the CASE's NULL cleanly excludes other buckets.",
        "Conditional SUM can use ELSE 0; conditional AVG must not."
      ],
      commonMistakes: [
        "Writing `AVG(CASE ... ELSE 0 END)`, which inflates the denominator and skews the mean.",
        "Grouping by Dept alone with a plain AVG(Salary), mixing genders together."
      ]
    }

  ]);

  /* ================================================================== */
  /* Gaps & Islands (1)                                                 */
  /* ================================================================== */
  window.SQLLAB.register("Gaps & Islands", [

    {
      id: "misc2-find-missing-ids",
      number: "LC 1285",
      platform: "LeetCode",
      title: "Find Missing IDs in a Sequence",
      difficulty: "Medium",
      category: "Gaps & Islands",
      topics: ["Gaps & Islands", "Recursive / Hierarchy"],
      domains: ["Data Quality"],
      link: "https://leetcode.com/",
      meta: { pattern: "Gap detection", sqlConcept: "Generated series anti-join", technique: "Full range minus present values" },
      descriptionBrief:
        "A **Seq(Id)** table should hold consecutive integers but some are missing. Return **every " +
        "absent Id** between the smallest and largest present value, one per row. Here the present " +
        "ids are 1, 2, 4, 5, 8, so 3, 6, 7 are missing.",
      schema: [
        { name: "Seq", columns: [
          { name: "Id", type: "INT", note: "PK, gaps allowed" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Seq','U') IS NOT NULL DROP TABLE dbo.Seq;\n" +
        "CREATE TABLE dbo.Seq (Id INT PRIMARY KEY);\n" +
        "INSERT INTO dbo.Seq VALUES (1),(2),(4),(5),(8);",
      sampleData: [
        { table: "Seq", columns: ["Id"], rows: [[1], [2], [4], [5], [8]] }
      ],
      expectedOutput: { columns: ["MissingId"], rows: [[3], [6], [7]] },
      approaches: [
        {
          name: "Generate full range, anti-join (recommended)",
          perfNote: "Recursive CTE manufactures min..max, then a NOT IN / anti-join drops the present ids. O(range) rows.",
          dialectNote: "Set OPTION (MAXRECURSION n) if max − min could exceed the 100 default.",
          logic:
            "**What it asks.** The integers that *should* appear between the min and max but don't.\n\n" +
            "**Why the naive idea fails.** You cannot SELECT rows that aren't in the table — the missing ids exist nowhere to be filtered. LEAD can spot where a gap *starts* but doesn't enumerate each absent value inside a wide gap.\n\n" +
            "**Key Idea.** Manufacture the complete range `min..max`, then subtract the ids that are present — what remains are exactly the missing ones.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor: `SELECT MIN(Id) AS n, MAX(Id) AS hi FROM Seq`.\n" +
            "2. Recursive member: `n + 1` while `n < hi`, carrying `hi`.\n" +
            "3. Keep generated `n` values that are `NOT IN (SELECT Id FROM Seq)`.\n\n" +
            "**Why it works.** The generated series is gapless by construction, so any value not found in Seq is a hole in the original sequence.\n\n" +
            "**Common Gotchas.** Bound the range by the actual min/max, not 1..max, unless the spec starts at 1. A large span hits MAXRECURSION — raise it or use a tally table.\n\n" +
            "**Performance.** Proportional to the range width; a persisted numbers table avoids the recursion cap for big ranges.\n\n" +
            "**Interview mindset.** 'list the missing values' → generate the dense spine and anti-join; 'find where gaps begin' → LEAD/LAG.",
          tsql:
            "WITH Nums AS (\n" +
            "    SELECT MIN(Id) AS n, MAX(Id) AS hi        -- range bounds from the data\n" +
            "    FROM dbo.Seq\n" +
            "    UNION ALL\n" +
            "    SELECT n + 1, hi                          -- walk the dense range\n" +
            "    FROM Nums\n" +
            "    WHERE n < hi\n" +
            ")\n" +
            "SELECT n AS MissingId\n" +
            "FROM Nums\n" +
            "WHERE n NOT IN (SELECT Id FROM dbo.Seq)       -- keep only the absent values\n" +
            "ORDER BY n;",
          clean:
            "WITH Nums AS (\n" +
            "    SELECT MIN(Id) AS n, MAX(Id) AS hi FROM dbo.Seq\n" +
            "    UNION ALL\n" +
            "    SELECT n + 1, hi FROM Nums WHERE n < hi\n" +
            ")\n" +
            "SELECT n AS MissingId\n" +
            "FROM Nums WHERE n NOT IN (SELECT Id FROM dbo.Seq)\n" +
            "ORDER BY n;"
        },
        {
          name: "LEAD to report gap ranges",
          perfNote: "One ordered pass; LEAD compares each id to the next present id and flags where a gap opens. Reports ranges, not each individual id.",
          dialectNote: "LEAD is SQL Server 2012+. This variant returns the [start,end] of each gap rather than one row per missing value.",
          logic:
            "**Key Idea.** Order the present ids; wherever the next id jumps by more than 1, the integers between mark a gap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEAD(Id) OVER (ORDER BY Id) AS NextId`.\n" +
            "2. Keep rows where `NextId - Id > 1`.\n" +
            "3. Report `Id + 1` as gap start and `NextId - 1` as gap end.\n\n" +
            "**Why it works.** A jump greater than 1 between consecutive present ids means every integer strictly between them is absent.\n\n" +
            "**Common Gotchas.** This yields gap *ranges*; to list every missing id you still expand each range (join to a numbers table). The final row's LEAD is NULL and is naturally excluded.\n\n" +
            "**Performance.** Single window sort; very cheap and doesn't depend on the range width.\n\n" +
            "**Interview mindset.** Prefer LEAD when you only need where gaps are, not each missing value — it scales with row count, not range size.",
          tsql:
            "WITH L AS (\n" +
            "    SELECT Id, LEAD(Id) OVER (ORDER BY Id) AS NextId\n" +
            "    FROM dbo.Seq\n" +
            ")\n" +
            "SELECT Id + 1 AS GapStart, NextId - 1 AS GapEnd\n" +
            "FROM L\n" +
            "WHERE NextId - Id > 1\n" +
            "ORDER BY GapStart;",
          clean:
            "WITH L AS (\n" +
            "    SELECT Id, LEAD(Id) OVER (ORDER BY Id) AS NextId FROM dbo.Seq\n" +
            ")\n" +
            "SELECT Id + 1 AS GapStart, NextId - 1 AS GapEnd\n" +
            "FROM L WHERE NextId - Id > 1 ORDER BY GapStart;"
        }
      ],
      walkthrough: [
        { step: "Generate dense range 1..8", note: "Recursive counter fills every integer between min and max.",
          table: { columns: ["n"], rows: [[1], [2], [3], [4], [5], [6], [7], [8]] } },
        { step: "Drop present ids", note: "Remove {1,2,4,5,8}; 3, 6, 7 remain.",
          table: { columns: ["MissingId"], rows: [[3], [6], [7]] } }
      ],
      patternRecognition: [
        "'which values are missing from a sequence' → generate the dense range and anti-join the present values.",
        "'where do the gaps begin/end' → LEAD/LAG comparing consecutive values."
      ],
      interviewRecall: [
        "Missing values must be manufactured — a generated series (recursive CTE or tally) is the source.",
        "LEAD flags gap boundaries in one pass but reports ranges, not each individual id."
      ],
      commonMistakes: [
        "Trying to filter for absent ids directly from Seq — they aren't there to filter.",
        "Bounding the range 1..max when the sequence should start at its own minimum."
      ]
    }

  ]);

  /* ================================================================== */
  /* Set Operations (1)                                                 */
  /* ================================================================== */
  window.SQLLAB.register("Set Operations", [

    {
      id: "misc2-union-dedupe-sources",
      number: "DL 2661",
      platform: "DataLemur",
      title: "Unique Customers Across Two Channels",
      difficulty: "Easy",
      category: "Set Operations",
      topics: ["Set Operations"],
      domains: ["Marketing Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Deduplicated combine", sqlConcept: "UNION vs UNION ALL", technique: "Merge two row sets, remove duplicates" },
      descriptionBrief:
        "You have two customer email lists — **OnlineCustomers** and **StoreCustomers** — that " +
        "overlap. Return the **distinct set of email addresses that appear in either source**, " +
        "each listed once, alphabetically.",
      schema: [
        { name: "OnlineCustomers", columns: [
          { name: "Email", type: "VARCHAR(100)" } ] },
        { name: "StoreCustomers", columns: [
          { name: "Email", type: "VARCHAR(100)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OnlineCustomers','U') IS NOT NULL DROP TABLE dbo.OnlineCustomers;\n" +
        "IF OBJECT_ID('dbo.StoreCustomers','U') IS NOT NULL DROP TABLE dbo.StoreCustomers;\n" +
        "CREATE TABLE dbo.OnlineCustomers (Email VARCHAR(100));\n" +
        "CREATE TABLE dbo.StoreCustomers (Email VARCHAR(100));\n" +
        "INSERT INTO dbo.OnlineCustomers VALUES ('a@x.com'),('b@x.com'),('c@x.com');\n" +
        "INSERT INTO dbo.StoreCustomers VALUES ('b@x.com'),('d@x.com');",
      sampleData: [
        { table: "OnlineCustomers", columns: ["Email"], rows: [["a@x.com"], ["b@x.com"], ["c@x.com"]] },
        { table: "StoreCustomers", columns: ["Email"], rows: [["b@x.com"], ["d@x.com"]] }
      ],
      expectedOutput: { columns: ["Email"], rows: [["a@x.com"], ["b@x.com"], ["c@x.com"], ["d@x.com"]] },
      approaches: [
        {
          name: "UNION (recommended)",
          perfNote: "UNION combines both sources and removes duplicates in one shot via an implicit distinct (sort/hash). Exactly the operator this problem describes.",
          dialectNote: "Standard SQL. UNION deduplicates; UNION ALL does not.",
          logic:
            "**What it asks.** The combined, de-duplicated set of emails from both lists.\n\n" +
            "**Why the naive idea fails.** `UNION ALL` concatenates the lists but keeps `b@x.com` twice (once per source). A join is the wrong tool — you want the union of two single-column sets, not a row-matching correlation.\n\n" +
            "**Key Idea.** `SELECT Email FROM Online UNION SELECT Email FROM Store` — `UNION` stacks the two result sets and then removes duplicate rows automatically.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Select `Email` from each source with matching column shape.\n" +
            "2. Combine with `UNION` (not `UNION ALL`).\n" +
            "3. Order the deduplicated result alphabetically.\n\n" +
            "**Why it works.** `UNION` is defined as set union: it eliminates duplicates across and within the inputs, so an email present in both channels collapses to one row.\n\n" +
            "**Common Gotchas.** The two SELECTs must have the same column count and compatible types. `ORDER BY` applies once, to the whole combined result, and goes at the very end.\n\n" +
            "**Performance.** The dedup costs a sort or hash; if you know the sources are already disjoint, `UNION ALL` skips it and is cheaper.\n\n" +
            "**Interview mindset.** 'combine and dedupe' → UNION; 'combine, keep every row' → UNION ALL. Default to UNION ALL when you know there are no overlaps.",
          tsql:
            "SELECT Email FROM dbo.OnlineCustomers\n" +
            "UNION                                   -- set union: duplicates removed\n" +
            "SELECT Email FROM dbo.StoreCustomers\n" +
            "ORDER BY Email;",
          clean:
            "SELECT Email FROM dbo.OnlineCustomers\n" +
            "UNION\n" +
            "SELECT Email FROM dbo.StoreCustomers\n" +
            "ORDER BY Email;"
        },
        {
          name: "UNION ALL + DISTINCT (equivalent)",
          perfNote: "Explicitly concatenate then deduplicate. Same result as UNION and useful to show you understand what UNION does under the hood.",
          dialectNote: "Portable everywhere; makes the dedup step explicit.",
          logic:
            "**Key Idea.** `UNION ALL` keeps every row from both sources; wrapping it in `SELECT DISTINCT` removes the duplicates — which is precisely what `UNION` does internally.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `UNION ALL` the two selects in a derived table/CTE.\n" +
            "2. `SELECT DISTINCT Email` from it.\n" +
            "3. Order alphabetically.\n\n" +
            "**Why it works.** DISTINCT collapses the repeated `b@x.com` to a single row, matching the UNION result exactly.\n\n" +
            "**Common Gotchas.** Don't leave out the DISTINCT thinking UNION ALL dedupes — it does not.\n\n" +
            "**Performance.** Identical cost to UNION; the engine plans them the same way.\n\n" +
            "**Interview mindset.** A good way to prove you know UNION = UNION ALL + DISTINCT.",
          tsql:
            "SELECT DISTINCT Email\n" +
            "FROM (\n" +
            "    SELECT Email FROM dbo.OnlineCustomers\n" +
            "    UNION ALL\n" +
            "    SELECT Email FROM dbo.StoreCustomers\n" +
            ") s\n" +
            "ORDER BY Email;",
          clean:
            "SELECT DISTINCT Email\n" +
            "FROM (\n" +
            "    SELECT Email FROM dbo.OnlineCustomers\n" +
            "    UNION ALL\n" +
            "    SELECT Email FROM dbo.StoreCustomers\n" +
            ") s\n" +
            "ORDER BY Email;"
        }
      ],
      walkthrough: [
        { step: "Stack both sources", note: "UNION ALL view: a, b, c, b, d — b appears twice.",
          table: { columns: ["Email"], rows: [["a@x.com"], ["b@x.com"], ["c@x.com"], ["b@x.com"], ["d@x.com"]] } },
        { step: "Deduplicate", note: "UNION removes the repeated b@x.com.",
          table: { columns: ["Email"], rows: [["a@x.com"], ["b@x.com"], ["c@x.com"], ["d@x.com"]] } }
      ],
      patternRecognition: [
        "'distinct rows from either source' → UNION.",
        "'every row from both, keep duplicates' → UNION ALL."
      ],
      interviewRecall: [
        "UNION = UNION ALL + implicit DISTINCT; UNION ALL is cheaper when overlaps are impossible.",
        "Both SELECTs must have matching column count and compatible types; ORDER BY goes once at the end."
      ],
      commonMistakes: [
        "Using UNION ALL and returning duplicated emails.",
        "Reaching for a JOIN when the task is a set union of single-column lists."
      ]
    }

  ]);

  /* ================================================================== */
  /* DML / DDL (1)                                                      */
  /* ================================================================== */
  window.SQLLAB.register("DML / DDL", [

    {
      id: "misc2-merge-upsert-inventory",
      number: "HR MERGE-1",
      platform: "HackerRank",
      title: "Upsert Inventory with MERGE",
      difficulty: "Medium",
      category: "DML / DDL",
      topics: ["DML / DDL"],
      domains: ["Inventory / Ops"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Upsert", sqlConcept: "MERGE statement", technique: "Match → update, no match → insert" },
      descriptionBrief:
        "You receive a shipment feed **Shipments(ProductId, Qty)** and must fold it into the " +
        "**Inventory(ProductId, Qty)** table: **add the shipped quantity** to products that " +
        "already exist, and **insert** products that are new. Show the resulting inventory.",
      schema: [
        { name: "Inventory", columns: [
          { name: "ProductId", type: "INT", note: "PK" },
          { name: "Qty", type: "INT" } ] },
        { name: "Shipments", columns: [
          { name: "ProductId", type: "INT" },
          { name: "Qty", type: "INT", note: "quantity received" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Inventory','U') IS NOT NULL DROP TABLE dbo.Inventory;\n" +
        "IF OBJECT_ID('dbo.Shipments','U') IS NOT NULL DROP TABLE dbo.Shipments;\n" +
        "CREATE TABLE dbo.Inventory (ProductId INT PRIMARY KEY, Qty INT);\n" +
        "CREATE TABLE dbo.Shipments (ProductId INT, Qty INT);\n" +
        "INSERT INTO dbo.Inventory VALUES (1,10),(2,5);\n" +
        "INSERT INTO dbo.Shipments VALUES (1,3),(3,7);",
      sampleData: [
        { table: "Inventory", columns: ["ProductId", "Qty"], rows: [[1, 10], [2, 5]] },
        { table: "Shipments", columns: ["ProductId", "Qty"], rows: [[1, 3], [3, 7]] }
      ],
      expectedOutput: { columns: ["ProductId", "Qty"], rows: [[1, 13], [2, 5], [3, 7]] },
      approaches: [
        {
          name: "MERGE (recommended)",
          perfNote: "A single statement scans the source once and applies the matched/not-matched branches together — no separate UPDATE then INSERT round trips.",
          dialectNote: "`MERGE` is T-SQL (SQL Server 2008+). Terminate it with a semicolon — it is required. Note the well-known MERGE caveats; many teams prefer explicit UPDATE+INSERT.",
          logic:
            "**What it asks.** An upsert: existing products get their quantity increased, brand-new products are inserted.\n\n" +
            "**Why the naive idea fails.** A lone `INSERT` errors or duplicates on the existing ProductId 1; a lone `UPDATE` never adds the new ProductId 3. You need both behaviors keyed on whether the product already exists.\n\n" +
            "**Key Idea.** `MERGE` joins target to source on the key: `WHEN MATCHED` runs the UPDATE (add the shipped qty), `WHEN NOT MATCHED BY TARGET` runs the INSERT.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `MERGE dbo.Inventory AS t USING dbo.Shipments AS s ON t.ProductId = s.ProductId`.\n" +
            "2. `WHEN MATCHED THEN UPDATE SET Qty = t.Qty + s.Qty`.\n" +
            "3. `WHEN NOT MATCHED BY TARGET THEN INSERT (ProductId, Qty) VALUES (s.ProductId, s.Qty)`.\n" +
            "4. End with a semicolon; then SELECT the inventory to verify.\n\n" +
            "**Why it works.** The ON predicate classifies each source row as matched or not, and each branch applies the right change in one atomic pass.\n\n" +
            "**Common Gotchas.** MERGE MUST end with `;`. A source with duplicate keys throws (target row updated twice). Use `NOT MATCHED BY TARGET` (the default NOT MATCHED) for inserts, distinct from `NOT MATCHED BY SOURCE`.\n\n" +
            "**Performance.** One pass; index the join key. For high-concurrency upserts many teams use UPDATE+INSERT under a transaction instead, due to MERGE's historical bugs.\n\n" +
            "**Interview mindset.** 'insert-or-update on a key' → MERGE, but mention you know the pattern can also be written as UPDATE then INSERT of the unmatched rows.",
          tsql:
            "MERGE dbo.Inventory AS t\n" +
            "USING dbo.Shipments AS s\n" +
            "    ON t.ProductId = s.ProductId\n" +
            "WHEN MATCHED THEN\n" +
            "    UPDATE SET Qty = t.Qty + s.Qty              -- add shipped units\n" +
            "WHEN NOT MATCHED BY TARGET THEN\n" +
            "    INSERT (ProductId, Qty) VALUES (s.ProductId, s.Qty);  -- new product\n" +
            "\n" +
            "SELECT ProductId, Qty\n" +
            "FROM dbo.Inventory\n" +
            "ORDER BY ProductId;",
          clean:
            "MERGE dbo.Inventory AS t\n" +
            "USING dbo.Shipments AS s ON t.ProductId = s.ProductId\n" +
            "WHEN MATCHED THEN UPDATE SET Qty = t.Qty + s.Qty\n" +
            "WHEN NOT MATCHED BY TARGET THEN INSERT (ProductId, Qty) VALUES (s.ProductId, s.Qty);\n" +
            "\n" +
            "SELECT ProductId, Qty FROM dbo.Inventory ORDER BY ProductId;"
        },
        {
          name: "UPDATE … FROM then INSERT (portable upsert)",
          perfNote: "Two statements: an UPDATE for existing keys, then an INSERT of the unmatched source rows. Avoids MERGE's edge cases; wrap in a transaction for atomicity.",
          dialectNote: "Portable and MERGE-free; run both inside one transaction so the upsert is all-or-nothing.",
          logic:
            "**Key Idea.** Do the two halves of the upsert explicitly: update the products that already exist, then insert the source rows that have no match.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `UPDATE i SET Qty = i.Qty + s.Qty FROM Inventory i JOIN Shipments s ON i.ProductId = s.ProductId`.\n" +
            "2. `INSERT INTO Inventory SELECT s.ProductId, s.Qty FROM Shipments s WHERE NOT EXISTS (SELECT 1 FROM Inventory i WHERE i.ProductId = s.ProductId)`.\n" +
            "3. Wrap both in a transaction.\n\n" +
            "**Why it works.** The UPDATE handles matched keys; the NOT EXISTS filter on the INSERT handles exactly the keys the UPDATE didn't touch — together they cover every source row once.\n\n" +
            "**Common Gotchas.** Order matters conceptually but here the INSERT's NOT EXISTS keys off the original match, so update-first is safe. Without a transaction a failure between the two leaves a partial upsert.\n\n" +
            "**Performance.** Two passes over the source; the join key index serves both.\n\n" +
            "**Interview mindset.** The dependable alternative to MERGE — many production teams standardize on it.",
          tsql:
            "UPDATE i\n" +
            "SET i.Qty = i.Qty + s.Qty\n" +
            "FROM dbo.Inventory i\n" +
            "JOIN dbo.Shipments s ON i.ProductId = s.ProductId;\n" +
            "\n" +
            "INSERT INTO dbo.Inventory (ProductId, Qty)\n" +
            "SELECT s.ProductId, s.Qty\n" +
            "FROM dbo.Shipments s\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.Inventory i WHERE i.ProductId = s.ProductId\n" +
            ");\n" +
            "\n" +
            "SELECT ProductId, Qty FROM dbo.Inventory ORDER BY ProductId;",
          clean:
            "UPDATE i SET i.Qty = i.Qty + s.Qty\n" +
            "FROM dbo.Inventory i JOIN dbo.Shipments s ON i.ProductId = s.ProductId;\n" +
            "\n" +
            "INSERT INTO dbo.Inventory (ProductId, Qty)\n" +
            "SELECT s.ProductId, s.Qty FROM dbo.Shipments s\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Inventory i WHERE i.ProductId = s.ProductId);\n" +
            "\n" +
            "SELECT ProductId, Qty FROM dbo.Inventory ORDER BY ProductId;"
        }
      ],
      walkthrough: [
        { step: "Classify each shipment row", note: "ProductId 1 matches (update); ProductId 3 has no match (insert).",
          table: { columns: ["ProductId", "Action"], rows: [[1, "MATCHED → update"], [3, "NOT MATCHED → insert"]] } },
        { step: "Resulting inventory", note: "1: 10+3=13; 2 untouched; 3 inserted at 7.",
          table: { columns: ["ProductId", "Qty"], rows: [[1, 13], [2, 5], [3, 7]] } }
      ],
      patternRecognition: [
        "'insert new rows, update existing ones on a key' → upsert: MERGE, or UPDATE then INSERT-where-NOT-EXISTS."
      ],
      interviewRecall: [
        "MERGE must end with a semicolon; WHEN MATCHED updates, WHEN NOT MATCHED BY TARGET inserts.",
        "UNION-free upsert alternative: UPDATE…FROM the matches, then INSERT the NOT EXISTS rows, inside a transaction."
      ],
      commonMistakes: [
        "Omitting the trailing semicolon on MERGE (syntax error).",
        "A source with duplicate keys, which makes MERGE fail by trying to update a target row twice."
      ]
    }

  ]);

})();
