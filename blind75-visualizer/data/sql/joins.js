/*
 * data/joins.js — Joins.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Joins", [

    {
      id: "employees-with-manager-name",
      number: "LC 181",
      platform: "LeetCode",
      title: "Employees Earning More Than Their Manager",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["HR Analytics"],
      link: "https://leetcode.com/problems/employees-earning-more-than-their-managers/",
      meta: { pattern: "Self-join", sqlConcept: "INNER JOIN on same table", technique: "Row-to-row comparison" },
      descriptionBrief:
        "An **Employee** table has each person's `Salary` and their `ManagerId` (referencing " +
        "another row in the same table). Return the names of employees who earn **more than " +
        "their own manager**.",
      schema: [
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Salary", type: "INT" },
          { name: "ManagerId", type: "INT", note: "FK → Employee.Id (nullable)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, Name VARCHAR(50), Salary INT, ManagerId INT);\n" +
        "INSERT INTO dbo.Employee VALUES\n" +
        "  (1,'Joe',70000,3),(2,'Henry',80000,4),(3,'Sam',60000,NULL),(4,'Max',90000,NULL);",
      sampleData: [
        { table: "Employee", columns: ["Id","Name","Salary","ManagerId"],
          rows: [[1,"Joe",70000,3],[2,"Henry",80000,4],[3,"Sam",60000,null],[4,"Max",90000,null]] }
      ],
      expectedOutput: { columns: ["Employee"], rows: [["Joe"]] },
      approaches: [
        {
          name: "Self-join (recommended)",
          perfNote: "One INNER JOIN of the table to itself on ManagerId = Id; an index on Id (the PK) makes the manager lookup a seek.",
          dialectNote: "",
          logic:
            "**What it asks.** Employees whose salary beats their manager's.\n\n" +
            "**Why the naive idea fails.** Manager salary lives in another row of the same table, so a single-row scan can't see it — you need to bring the manager's row alongside the employee's.\n\n" +
            "**Key Idea.** Join the table to itself: alias one copy as the employee `e`, the other as the manager `m`, matched on `e.ManagerId = m.Id`, then compare salaries.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Employee e JOIN Employee m ON e.ManagerId = m.Id`.\n" +
            "2. `WHERE e.Salary > m.Salary`.\n" +
            "3. Project `e.Name`.\n\n" +
            "**Why it works.** The self-join pairs each employee with exactly their manager's row, making the cross-row comparison a normal column comparison.\n\n" +
            "**Common Gotchas.** INNER JOIN naturally drops employees whose `ManagerId` is NULL (top of the org) — correct here, since they have no manager to beat.\n\n" +
            "**Performance.** Two references to one table; the PK on `Id` supports the manager seek.\n\n" +
            "**Interview mindset.** 'compare a row to a related row in the same table' → self-join.",
          tsql:
            "SELECT e.Name AS Employee\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Employee m ON e.ManagerId = m.Id   -- m = this employee's manager\n" +
            "WHERE e.Salary > m.Salary;",
          clean:
            "SELECT e.Name AS Employee\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Employee m ON e.ManagerId = m.Id\n" +
            "WHERE e.Salary > m.Salary;"
        }
      ],
      walkthrough: [
        { step: "Pair each employee with their manager", note: "Joe↔Sam, Henry↔Max; Sam & Max have no manager (dropped).",
          table: { columns: ["Employee","EmpSalary","Manager","MgrSalary"],
            rows: [["Joe",70000,"Sam",60000],["Henry",80000,"Max",90000]] } },
        { step: "Keep EmpSalary > MgrSalary",
          table: { columns: ["Employee"], rows: [["Joe"]] } }
      ],
      patternRecognition: [
        "'compare a row to another row in the same table (manager, parent, previous)' → self-join."
      ],
      interviewRecall: [
        "Alias both copies of the table; INNER JOIN drops rows whose join key (ManagerId) is NULL."
      ],
      commonMistakes: [
        "Forgetting table aliases, making column references ambiguous.",
        "Expecting NULL-manager employees to appear under an INNER JOIN."
      ]
    },

    {
      id: "orders-with-customer-and-total",
      number: "SS 10182",
      platform: "StrataScratch",
      title: "Total Spend per Customer",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Join then aggregate", sqlConcept: "LEFT JOIN + GROUP BY", technique: "Preserve zero-order customers" },
      descriptionBrief:
        "Given **Customers** and **Orders(Amount)**, return every customer and their **total " +
        "order amount**. Customers with no orders should show **0**, not be dropped.",
      schema: [
        { name: "Customers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT", note: "FK → Customers.Id" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, Amount INT);\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cara');\n" +
        "INSERT INTO dbo.Orders VALUES (1,1,100),(2,1,50),(3,3,200);",
      sampleData: [
        { table: "Customers", columns: ["Id","Name"], rows: [[1,"Ana"],[2,"Ben"],[3,"Cara"]] },
        { table: "Orders", columns: ["Id","CustomerId","Amount"], rows: [[1,1,100],[2,1,50],[3,3,200]] }
      ],
      expectedOutput: { columns: ["Name","TotalSpend"], rows: [["Ana",150],["Ben",0],["Cara",200]] },
      approaches: [
        {
          name: "LEFT JOIN + GROUP BY (recommended)",
          perfNote: "LEFT JOIN keeps zero-order customers; SUM over NULL amounts is NULL, so wrap in ISNULL/COALESCE to render 0.",
          dialectNote: "",
          logic:
            "**What it asks.** Total spend per customer, including customers who never ordered (as 0).\n\n" +
            "**Why the naive idea fails.** An INNER JOIN drops customers with no orders, so Ben would vanish; and `SUM` of an all-NULL group is NULL, not 0.\n\n" +
            "**Key Idea.** LEFT JOIN customers to their orders so everyone survives, `SUM(Amount)` per customer, and convert the NULL sum for order-less customers to 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN Orders` on `CustomerId = Id`.\n" +
            "2. `GROUP BY` customer.\n" +
            "3. `ISNULL(SUM(Amount), 0)` for the total.\n\n" +
            "**Why it works.** LEFT JOIN preserves unmatched customers with NULL amounts; ISNULL turns the resulting NULL sum into 0.\n\n" +
            "**Common Gotchas.** Group by a unique customer key (Id) and carry Name along; SUM of no rows is NULL — coalesce it.\n\n" +
            "**Performance.** One outer join + one group aggregate.\n\n" +
            "**Interview mindset.** 'per X including empties' → LEFT JOIN + GROUP BY + ISNULL.",
          tsql:
            "SELECT c.Name,\n" +
            "       ISNULL(SUM(o.Amount), 0) AS TotalSpend   -- 0 for customers with no orders\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "GROUP BY c.Id, c.Name\n" +
            "ORDER BY c.Name;",
          clean:
            "SELECT c.Name, ISNULL(SUM(o.Amount), 0) AS TotalSpend\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.CustomerId = c.Id\n" +
            "GROUP BY c.Id, c.Name\n" +
            "ORDER BY c.Name;"
        }
      ],
      walkthrough: [
        { step: "LEFT JOIN customers to orders", note: "Ben has no order → NULL amount.",
          table: { columns: ["Name","Amount"], rows: [["Ana",100],["Ana",50],["Ben",null],["Cara",200]] } },
        { step: "GROUP BY + ISNULL(SUM,0)",
          table: { columns: ["Name","TotalSpend"], rows: [["Ana",150],["Ben",0],["Cara",200]] } }
      ],
      patternRecognition: [
        "'per customer including those with none' → LEFT JOIN (not INNER) + GROUP BY.",
        "SUM over an all-NULL group is NULL → wrap in ISNULL/COALESCE."
      ],
      interviewRecall: [
        "INNER JOIN drops the empty side; LEFT JOIN keeps it with NULLs.",
        "GROUP BY the unique key and carry descriptive columns along."
      ],
      commonMistakes: [
        "Using INNER JOIN and silently dropping zero-order customers.",
        "Returning NULL instead of 0 for customers with no orders."
      ]
    },

    {
      id: "bank-book-reconciliation",
      number: "SS 20451",
      platform: "StrataScratch",
      title: "Reconcile Bank and Ledger Records",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Finance Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Two-sided reconciliation", sqlConcept: "FULL OUTER JOIN", technique: "COALESCE key + CASE status" },
      descriptionBrief:
        "**BankRecords** and **BookRecords** each hold a `RefId` and an `Amount`. Produce a " +
        "reconciliation showing **every** reference from either side, its amount on each side, and a " +
        "status flag for matches, amount mismatches, and references present on only one side.",
      schema: [
        { name: "BankRecords", columns: [
          { name: "RefId", type: "INT", note: "PK" },
          { name: "Amount", type: "INT" } ] },
        { name: "BookRecords", columns: [
          { name: "RefId", type: "INT", note: "PK" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.BankRecords','U') IS NOT NULL DROP TABLE dbo.BankRecords;\n" +
        "IF OBJECT_ID('dbo.BookRecords','U') IS NOT NULL DROP TABLE dbo.BookRecords;\n" +
        "CREATE TABLE dbo.BankRecords (RefId INT PRIMARY KEY, Amount INT);\n" +
        "CREATE TABLE dbo.BookRecords (RefId INT PRIMARY KEY, Amount INT);\n" +
        "INSERT INTO dbo.BankRecords VALUES (1,500),(2,300),(3,700);\n" +
        "INSERT INTO dbo.BookRecords VALUES (2,300),(3,750),(4,200);",
      sampleData: [
        { table: "BankRecords", columns: ["RefId","Amount"], rows: [[1,500],[2,300],[3,700]] },
        { table: "BookRecords", columns: ["RefId","Amount"], rows: [[2,300],[3,750],[4,200]] }
      ],
      expectedOutput: { columns: ["RefId","BankAmount","BookAmount","Status"],
        rows: [[1,500,null,"Missing in Book"],[2,300,300,"Match"],[3,700,750,"Amount Mismatch"],[4,null,200,"Missing in Bank"]] },
      approaches: [
        {
          name: "FULL OUTER JOIN (recommended)",
          perfNote: "One full outer join on RefId keeps unmatched rows from BOTH sides; the reconciliation is a single pass over the merged key set.",
          dialectNote: "SQL Server spells it `FULL OUTER JOIN` (the `OUTER` keyword is optional). MySQL lacks it and must emulate with LEFT JOIN UNION RIGHT JOIN.",
          logic:
            "**What it asks.** A line for every reference in either system, with both amounts and a status.\n\n" +
            "**Why the naive idea fails.** An INNER JOIN shows only references present in both tables, hiding exactly the discrepancies you are hunting for; a LEFT JOIN keeps one side's orphans but drops the other's.\n\n" +
            "**Key Idea.** A FULL OUTER JOIN keeps unmatched rows from both sides, filling the absent side with NULLs; `COALESCE` recovers the key and `CASE` labels each row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FULL OUTER JOIN` BankRecords to BookRecords on `RefId`.\n" +
            "2. `COALESCE(bank.RefId, book.RefId)` for a non-NULL key.\n" +
            "3. `CASE` on which amount is NULL / whether amounts differ to set the status.\n" +
            "4. Order by the coalesced RefId.\n\n" +
            "**Why it works.** FULL OUTER JOIN is the union of LEFT and RIGHT outer joins, so no reference from either table is lost.\n\n" +
            "**Common Gotchas.** Reference the coalesced key, not one table's RefId (which is NULL for that side's orphans); test amount equality only after both are known present.\n\n" +
            "**Performance.** One join over two PK-indexed key sets; a merge or hash join over sorted keys.\n\n" +
            "**Interview mindset.** 'keep everything from both tables' → FULL OUTER JOIN.",
          tsql:
            "SELECT COALESCE(bank.RefId, book.RefId) AS RefId,\n" +
            "       bank.Amount AS BankAmount,\n" +
            "       book.Amount AS BookAmount,\n" +
            "       CASE WHEN bank.RefId IS NULL THEN 'Missing in Bank'\n" +
            "            WHEN book.RefId IS NULL THEN 'Missing in Book'\n" +
            "            WHEN bank.Amount <> book.Amount THEN 'Amount Mismatch'\n" +
            "            ELSE 'Match' END AS Status\n" +
            "FROM dbo.BankRecords bank\n" +
            "FULL OUTER JOIN dbo.BookRecords book ON bank.RefId = book.RefId\n" +
            "ORDER BY RefId;",
          clean:
            "SELECT COALESCE(bank.RefId, book.RefId) AS RefId,\n" +
            "       bank.Amount AS BankAmount, book.Amount AS BookAmount,\n" +
            "       CASE WHEN bank.RefId IS NULL THEN 'Missing in Bank'\n" +
            "            WHEN book.RefId IS NULL THEN 'Missing in Book'\n" +
            "            WHEN bank.Amount <> book.Amount THEN 'Amount Mismatch'\n" +
            "            ELSE 'Match' END AS Status\n" +
            "FROM dbo.BankRecords bank\n" +
            "FULL OUTER JOIN dbo.BookRecords book ON bank.RefId = book.RefId\n" +
            "ORDER BY RefId;"
        }
      ],
      walkthrough: [
        { step: "FULL OUTER JOIN on RefId", note: "Ref1 only in bank, Ref4 only in book; both survive with NULLs.",
          table: { columns: ["BankRefId","BankAmount","BookRefId","BookAmount"],
            rows: [[1,500,null,null],[2,300,2,300],[3,700,3,750],[null,null,4,200]] } },
        { step: "COALESCE key + CASE status",
          table: { columns: ["RefId","BankAmount","BookAmount","Status"],
            rows: [[1,500,null,"Missing in Book"],[2,300,300,"Match"],[3,700,750,"Amount Mismatch"],[4,null,200,"Missing in Bank"]] } }
      ],
      patternRecognition: [
        "'keep unmatched rows from BOTH tables' → FULL OUTER JOIN.",
        "Recover the join key from either side with COALESCE(a.key, b.key)."
      ],
      interviewRecall: [
        "FULL OUTER JOIN = LEFT JOIN UNION RIGHT JOIN; MySQL emulates it that way.",
        "A NULL on one side's key identifies rows present only on the other side."
      ],
      commonMistakes: [
        "Selecting one table's RefId directly — it is NULL for that side's orphan rows.",
        "Using INNER JOIN and hiding exactly the mismatches the reconciliation exists to surface."
      ]
    },

    {
      id: "score-to-grade-band",
      number: "DL 2410",
      platform: "DataLemur",
      title: "Map Scores to Grade Bands",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Education Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Range / non-equi join", sqlConcept: "BETWEEN join", technique: "Join on an inequality, not equality" },
      descriptionBrief:
        "**Scores** lists each student's numeric `Score`. **GradeBands** defines letter grades by an " +
        "inclusive `LowBound`–`HighBound` range. Assign each student the letter grade whose band " +
        "contains their score.",
      schema: [
        { name: "Scores", columns: [
          { name: "StudentId", type: "INT", note: "PK" },
          { name: "Score", type: "INT" } ] },
        { name: "GradeBands", columns: [
          { name: "Grade", type: "CHAR(1)", note: "PK" },
          { name: "LowBound", type: "INT" },
          { name: "HighBound", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Scores','U') IS NOT NULL DROP TABLE dbo.Scores;\n" +
        "IF OBJECT_ID('dbo.GradeBands','U') IS NOT NULL DROP TABLE dbo.GradeBands;\n" +
        "CREATE TABLE dbo.Scores (StudentId INT PRIMARY KEY, Score INT);\n" +
        "CREATE TABLE dbo.GradeBands (Grade CHAR(1) PRIMARY KEY, LowBound INT, HighBound INT);\n" +
        "INSERT INTO dbo.Scores VALUES (1,95),(2,82),(3,68),(4,77);\n" +
        "INSERT INTO dbo.GradeBands VALUES ('A',90,100),('B',80,89),('C',70,79),('F',0,69);",
      sampleData: [
        { table: "Scores", columns: ["StudentId","Score"], rows: [[1,95],[2,82],[3,68],[4,77]] },
        { table: "GradeBands", columns: ["Grade","LowBound","HighBound"],
          rows: [["A",90,100],["B",80,89],["C",70,79],["F",0,69]] }
      ],
      expectedOutput: { columns: ["StudentId","Score","Grade"],
        rows: [[1,95,"A"],[2,82,"B"],[3,68,"F"],[4,77,"C"]] },
      approaches: [
        {
          name: "BETWEEN range join (recommended)",
          perfNote: "The join predicate is an inequality, so it matches each score to the one band whose range contains it — no equality key exists between these tables.",
          dialectNote: "`BETWEEN` is inclusive on both ends in every major dialect; the same logic works as two `>=`/`<=` comparisons.",
          logic:
            "**What it asks.** The letter grade whose numeric band contains each student's score.\n\n" +
            "**Why the naive idea fails.** There is no shared key to equi-join on — a score of 95 matches no exact column in GradeBands. You must join on a *condition*, not on equality.\n\n" +
            "**Key Idea.** Join on a range predicate: `Score BETWEEN LowBound AND HighBound`. Because the bands are disjoint and cover the scale, each score matches exactly one band.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Scores s JOIN GradeBands g ON s.Score BETWEEN g.LowBound AND g.HighBound`.\n" +
            "2. Project the student, the score, and the matched grade.\n" +
            "3. Order by StudentId.\n\n" +
            "**Why it works.** A non-equi join evaluates any boolean predicate; disjoint, gapless bands guarantee a single match per score.\n\n" +
            "**Common Gotchas.** Overlapping or gapped bands produce duplicate or missing rows — the bands must partition the range. BETWEEN is inclusive, so watch the boundary values (89 vs 90).\n\n" +
            "**Performance.** Range joins cannot use a plain equality hash join; a small dimension table like GradeBands makes a nested-loop range scan cheap.\n\n" +
            "**Interview mindset.** 'bucket a value into a range' → non-equi join with BETWEEN or `>=`/`<`.",
          tsql:
            "SELECT s.StudentId, s.Score, g.Grade\n" +
            "FROM dbo.Scores s\n" +
            "JOIN dbo.GradeBands g\n" +
            "  ON s.Score BETWEEN g.LowBound AND g.HighBound   -- non-equi: match by range\n" +
            "ORDER BY s.StudentId;",
          clean:
            "SELECT s.StudentId, s.Score, g.Grade\n" +
            "FROM dbo.Scores s\n" +
            "JOIN dbo.GradeBands g ON s.Score BETWEEN g.LowBound AND g.HighBound\n" +
            "ORDER BY s.StudentId;"
        }
      ],
      walkthrough: [
        { step: "Match each score to its containing band", note: "95∈[90,100]→A; 82∈[80,89]→B; 68∈[0,69]→F; 77∈[70,79]→C.",
          table: { columns: ["StudentId","Score","Grade"],
            rows: [[1,95,"A"],[2,82,"B"],[3,68,"F"],[4,77,"C"]] } }
      ],
      patternRecognition: [
        "'assign a value to a tier/band/bracket' → non-equi join on BETWEEN.",
        "No shared equality key between two tables → join on a condition."
      ],
      interviewRecall: [
        "Join predicates can be any boolean, not just `=`; BETWEEN is inclusive on both bounds.",
        "Disjoint, gapless bands give exactly one match per row; overlaps duplicate rows."
      ],
      commonMistakes: [
        "Assuming a join needs an equality key and missing that a range condition is legal.",
        "Defining overlapping bands and silently multiplying rows."
      ]
    },

    {
      id: "student-course-enrollments",
      number: "HR 3021",
      platform: "HackerRank",
      title: "Students and Their Enrolled Courses",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Education Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Many-to-many bridge", sqlConcept: "Three-table INNER JOIN", technique: "Traverse a junction table" },
      descriptionBrief:
        "**Students** and **Courses** relate many-to-many through an **Enrollments** bridge table " +
        "holding `(StudentId, CourseId)` pairs. List each student name with each course title they " +
        "are enrolled in. Students with no enrollments should not appear.",
      schema: [
        { name: "Students", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Courses", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Title", type: "VARCHAR(50)" } ] },
        { name: "Enrollments", columns: [
          { name: "StudentId", type: "INT", note: "FK → Students.Id" },
          { name: "CourseId", type: "INT", note: "FK → Courses.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Enrollments','U') IS NOT NULL DROP TABLE dbo.Enrollments;\n" +
        "IF OBJECT_ID('dbo.Students','U') IS NOT NULL DROP TABLE dbo.Students;\n" +
        "IF OBJECT_ID('dbo.Courses','U') IS NOT NULL DROP TABLE dbo.Courses;\n" +
        "CREATE TABLE dbo.Students (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Courses (Id INT PRIMARY KEY, Title VARCHAR(50));\n" +
        "CREATE TABLE dbo.Enrollments (StudentId INT, CourseId INT);\n" +
        "INSERT INTO dbo.Students VALUES (1,'Amy'),(2,'Bob'),(3,'Cy');\n" +
        "INSERT INTO dbo.Courses VALUES (10,'Math'),(20,'Art');\n" +
        "INSERT INTO dbo.Enrollments VALUES (1,10),(1,20),(2,10);",
      sampleData: [
        { table: "Students", columns: ["Id","Name"], rows: [[1,"Amy"],[2,"Bob"],[3,"Cy"]] },
        { table: "Courses", columns: ["Id","Title"], rows: [[10,"Math"],[20,"Art"]] },
        { table: "Enrollments", columns: ["StudentId","CourseId"], rows: [[1,10],[1,20],[2,10]] }
      ],
      expectedOutput: { columns: ["Student","Course"],
        rows: [["Amy","Art"],["Amy","Math"],["Bob","Math"]] },
      approaches: [
        {
          name: "Three-table INNER JOIN via the bridge (recommended)",
          perfNote: "Each enrollment row seeks its student and its course through PK indexes; the bridge table carries the many-to-many relationship.",
          dialectNote: "",
          logic:
            "**What it asks.** Every (student, course) pairing that actually exists.\n\n" +
            "**Why the naive idea fails.** Students and Courses have no direct foreign key to each other — a many-to-many link cannot be a single column on either table, so you cannot join them directly.\n\n" +
            "**Key Idea.** Route through the Enrollments junction table: join Enrollments to Students on StudentId and to Courses on CourseId. Each bridge row becomes one output pairing.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `FROM Enrollments e` (the fact of enrollment).\n" +
            "2. `JOIN Students s ON s.Id = e.StudentId` for the name.\n" +
            "3. `JOIN Courses c ON c.Id = e.CourseId` for the title.\n" +
            "4. Order by student then course.\n\n" +
            "**Why it works.** The bridge stores one row per relationship; joining both dimensions to it expands each pair into a labeled row.\n\n" +
            "**Common Gotchas.** INNER JOIN drops students with zero enrollments (Cy) and courses with none — correct here. Driving from a dimension instead of the bridge risks accidental fan-out or missed pairs.\n\n" +
            "**Performance.** Two PK seeks per enrollment row; indexes on the bridge's FK columns help at scale.\n\n" +
            "**Interview mindset.** 'many-to-many' → there is a junction table; join through it, don't join the ends directly.",
          tsql:
            "SELECT s.Name AS Student, c.Title AS Course\n" +
            "FROM dbo.Enrollments e\n" +
            "JOIN dbo.Students s ON s.Id = e.StudentId\n" +
            "JOIN dbo.Courses  c ON c.Id = e.CourseId\n" +
            "ORDER BY s.Name, c.Title;",
          clean:
            "SELECT s.Name AS Student, c.Title AS Course\n" +
            "FROM dbo.Enrollments e\n" +
            "JOIN dbo.Students s ON s.Id = e.StudentId\n" +
            "JOIN dbo.Courses  c ON c.Id = e.CourseId\n" +
            "ORDER BY s.Name, c.Title;"
        }
      ],
      walkthrough: [
        { step: "Join Enrollments to both dimensions", note: "Each bridge row resolves to a name and a title; Cy (no enrollment) never appears.",
          table: { columns: ["Student","Course"],
            rows: [["Amy","Math"],["Amy","Art"],["Bob","Math"]] } },
        { step: "Order by student, then course",
          table: { columns: ["Student","Course"],
            rows: [["Amy","Art"],["Amy","Math"],["Bob","Math"]] } }
      ],
      patternRecognition: [
        "'many-to-many between A and B' → a junction/bridge table; join A→bridge→B.",
        "Drive the query from the bridge (the fact) to avoid fan-out."
      ],
      interviewRecall: [
        "A bridge table holds one row per A–B relationship, resolving many-to-many into two many-to-one joins.",
        "INNER JOINs through the bridge naturally exclude unrelated rows on either end."
      ],
      commonMistakes: [
        "Trying to join Students directly to Courses with no shared key.",
        "Joining from a dimension and duplicating or losing pairings."
      ]
    },

    {
      id: "products-never-ordered",
      number: "LC 183",
      platform: "LeetCode",
      title: "Products That Were Never Ordered",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Sales Analytics"],
      link: "https://leetcode.com/problems/customers-who-never-order/",
      meta: { pattern: "Anti-join", sqlConcept: "LEFT JOIN + IS NULL", technique: "Find unmatched rows" },
      descriptionBrief:
        "**Products** lists items for sale; **OrderItems** records which product each order line bought. " +
        "Return the products that have **never** appeared on any order line.",
      schema: [
        { name: "Products", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "OrderItems", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "ProductId", type: "INT", note: "FK → Products.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.OrderItems','U') IS NOT NULL DROP TABLE dbo.OrderItems;\n" +
        "IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;\n" +
        "CREATE TABLE dbo.Products (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.OrderItems (Id INT PRIMARY KEY, ProductId INT);\n" +
        "INSERT INTO dbo.Products VALUES (1,'Pen'),(2,'Pad'),(3,'Pin');\n" +
        "INSERT INTO dbo.OrderItems VALUES (1,1),(2,1),(3,3);",
      sampleData: [
        { table: "Products", columns: ["Id","Name"], rows: [[1,"Pen"],[2,"Pad"],[3,"Pin"]] },
        { table: "OrderItems", columns: ["Id","ProductId"], rows: [[1,1],[2,1],[3,3]] }
      ],
      expectedOutput: { columns: ["ProductId","Name"], rows: [[2,"Pad"]] },
      approaches: [
        {
          name: "LEFT JOIN + IS NULL anti-join (recommended)",
          perfNote: "LEFT JOIN keeps every product; the unmatched ones have a NULL on the order side, and filtering on that NULL isolates them in one pass.",
          dialectNote: "",
          logic:
            "**What it asks.** Products that never appear in OrderItems.\n\n" +
            "**Why the naive idea fails.** An INNER JOIN keeps only products that WERE ordered — the exact opposite of what is wanted. You need the rows that fail to match.\n\n" +
            "**Key Idea.** LEFT JOIN Products to OrderItems, then keep only rows where the order side is NULL: those are products with no matching order line — an anti-join.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN OrderItems o ON o.ProductId = p.Id`.\n" +
            "2. `WHERE o.ProductId IS NULL` — no order line matched.\n" +
            "3. Project the product id and name.\n\n" +
            "**Why it works.** LEFT JOIN emits a row for every product; unmatched products carry NULLs from the order side, and the IS NULL filter selects exactly those.\n\n" +
            "**Common Gotchas.** Filter on a column that is NULL only when unmatched (the join key), not a nullable data column. `NOT IN (SELECT ProductId ...)` breaks if that subquery returns any NULL.\n\n" +
            "**Performance.** One outer join plus a filter; `NOT EXISTS` is an equally good, NULL-safe alternative.\n\n" +
            "**Interview mindset.** 'rows in A with no match in B' → LEFT JOIN … IS NULL, or NOT EXISTS.",
          tsql:
            "SELECT p.Id AS ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "LEFT JOIN dbo.OrderItems o ON o.ProductId = p.Id\n" +
            "WHERE o.ProductId IS NULL   -- no order line ever matched this product\n" +
            "ORDER BY p.Id;",
          clean:
            "SELECT p.Id AS ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "LEFT JOIN dbo.OrderItems o ON o.ProductId = p.Id\n" +
            "WHERE o.ProductId IS NULL\n" +
            "ORDER BY p.Id;"
        },
        {
          name: "NOT EXISTS (NULL-safe alternative)",
          perfNote: "A correlated NOT EXISTS short-circuits on the first matching order line and is immune to NULLs in the order data, unlike NOT IN.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep a product only when no order line for it exists.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Products p`.\n" +
            "2. `WHERE NOT EXISTS (SELECT 1 FROM OrderItems o WHERE o.ProductId = p.Id)`.\n" +
            "3. Project id and name.\n\n" +
            "**Why it works.** NOT EXISTS is true precisely when the correlated subquery finds no matching row — the definition of an anti-join.\n\n" +
            "**Common Gotchas.** Prefer NOT EXISTS over `NOT IN`: a single NULL in the NOT IN list makes the whole predicate return no rows.\n\n" +
            "**Performance.** The optimizer typically runs an anti-semi-join, similar cost to the LEFT JOIN form.\n\n" +
            "**Interview mindset.** Offer NOT EXISTS as the NULL-safe twin of LEFT JOIN … IS NULL.",
          tsql:
            "SELECT p.Id AS ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.OrderItems o WHERE o.ProductId = p.Id\n" +
            ")\n" +
            "ORDER BY p.Id;",
          clean:
            "SELECT p.Id AS ProductId, p.Name\n" +
            "FROM dbo.Products p\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.OrderItems o WHERE o.ProductId = p.Id)\n" +
            "ORDER BY p.Id;"
        }
      ],
      walkthrough: [
        { step: "LEFT JOIN products to order lines", note: "Pen and Pin match order lines; Pad matches none → NULL order side.",
          table: { columns: ["ProductId","Name","OrderProductId"],
            rows: [[1,"Pen",1],[1,"Pen",1],[2,"Pad",null],[3,"Pin",3]] } },
        { step: "Keep rows where the order side IS NULL",
          table: { columns: ["ProductId","Name"], rows: [[2,"Pad"]] } }
      ],
      patternRecognition: [
        "'rows in A with no match in B' → anti-join: LEFT JOIN … WHERE B.key IS NULL, or NOT EXISTS.",
        "Prefer NOT EXISTS over NOT IN when the inner column can be NULL."
      ],
      interviewRecall: [
        "The IS NULL filter must target the join key, which is NULL only for unmatched rows.",
        "NOT IN with a NULL in its list returns no rows — NOT EXISTS is NULL-safe."
      ],
      commonMistakes: [
        "Using INNER JOIN and returning the ordered products (the opposite set).",
        "Filtering IS NULL on a naturally-nullable data column instead of the join key."
      ]
    }

  ]);
})();
