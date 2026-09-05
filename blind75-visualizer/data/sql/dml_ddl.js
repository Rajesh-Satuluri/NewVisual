/*
 * data/dml_ddl.js — DML / DDL.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * These problems teach a data-changing statement; the "expected output"
 * shows the table state AFTER the statement runs.
 */
(function () {
  window.SQLLAB.register("DML / DDL", [

    {
      id: "delete-duplicate-emails",
      number: "LC 196",
      platform: "LeetCode",
      title: "Delete Duplicate Emails (Keep Lowest Id)",
      difficulty: "Medium",
      category: "DML / DDL",
      topics: ["DML / DDL", "Filtering & Subqueries"],
      domains: ["Data Cleaning"],
      link: "https://leetcode.com/problems/delete-duplicate-emails/",
      meta: { pattern: "De-duplicate in place", sqlConcept: "DELETE with self-join", technique: "Keep the min id per key" },
      descriptionBrief:
        "Given a **Person** table, **delete** duplicate emails, keeping only the row with the " +
        "**smallest Id** for each email. Show the table after the delete.",
      schema: [
        { name: "Person", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Email", type: "VARCHAR(100)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Person','U') IS NOT NULL DROP TABLE dbo.Person;\n" +
        "CREATE TABLE dbo.Person (Id INT PRIMARY KEY, Email VARCHAR(100));\n" +
        "INSERT INTO dbo.Person VALUES (1,'a@x.com'),(2,'c@x.com'),(3,'a@x.com');",
      sampleData: [
        { table: "Person", columns: ["Id","Email"], rows: [[1,"a@x.com"],[2,"c@x.com"],[3,"a@x.com"]] }
      ],
      expectedOutput: { columns: ["Id","Email"], rows: [[1,"a@x.com"],[2,"c@x.com"]] },
      approaches: [
        {
          name: "DELETE with self-join (recommended)",
          perfNote: "Deletes only the higher-Id duplicates in a single statement; an index on Email helps the match.",
          dialectNote: "T-SQL allows `DELETE p FROM Person p JOIN … ` — alias the table being deleted in the DELETE clause.",
          logic:
            "**What it asks.** Remove duplicate-email rows, keeping the lowest Id of each email.\n\n" +
            "**Why the naive idea fails.** A blind `DELETE WHERE Email IN (dupes)` would remove *all* copies, including the one you want to keep.\n\n" +
            "**Key Idea.** Delete a row only if another row exists with the **same email but a smaller Id** — that leaves exactly the minimum-Id row per email.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Self-join `Person p` to `Person q` on equal email and `q.Id < p.Id`.\n" +
            "2. `DELETE p` for every p that has such a smaller-Id twin.\n\n" +
            "**Why it works.** The keeper (minimum Id) has no smaller-Id match, so it survives; every larger duplicate does have one and is deleted.\n\n" +
            "**Common Gotchas.** Alias the deleted table in the DELETE clause; test with SELECT first. A window-function variant (`ROW_NUMBER … DELETE WHERE rn > 1`) works too.\n\n" +
            "**Performance.** One join-driven delete; index Email.\n\n" +
            "**Interview mindset.** 'keep one per key, drop the rest' → delete rows that have a better-ranked twin.",
          tsql:
            "DELETE p\n" +
            "FROM dbo.Person p\n" +
            "JOIN dbo.Person q\n" +
            "  ON q.Email = p.Email\n" +
            " AND q.Id  < p.Id;      -- a smaller-Id row with the same email exists\n" +
            "-- SELECT * FROM dbo.Person;  -- inspect the result",
          clean:
            "DELETE p\n" +
            "FROM dbo.Person p\n" +
            "JOIN dbo.Person q ON q.Email = p.Email AND q.Id < p.Id;"
        }
      ],
      walkthrough: [
        { step: "Rows with a smaller-Id same-email twin", note: "Id 3 (a@x.com) has Id 1 → delete Id 3.",
          table: { columns: ["Id","Email"], rows: [[3,"a@x.com"]] } },
        { step: "Person after DELETE",
          table: { columns: ["Id","Email"], rows: [[1,"a@x.com"],[2,"c@x.com"]] } }
      ],
      patternRecognition: [
        "'keep one row per key, delete the rest' → delete rows that have a better-ranked (smaller-Id) twin, or ROW_NUMBER > 1."
      ],
      interviewRecall: [
        "In T-SQL, alias the table in the DELETE clause: `DELETE p FROM … p JOIN …`.",
        "Preview a destructive DELETE by running it first as a SELECT."
      ],
      commonMistakes: [
        "Deleting all copies instead of keeping the minimum-Id row.",
        "Forgetting the alias in the DELETE clause (syntax error in T-SQL)."
      ]
    },

    {
      id: "update-salary-from-raise-table",
      number: "SS 10404",
      platform: "StrataScratch",
      title: "Apply Department Raises (UPDATE … FROM)",
      difficulty: "Medium",
      category: "DML / DDL",
      topics: ["DML / DDL", "Joins"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Set-based update via join", sqlConcept: "UPDATE … FROM", technique: "Update one table from another" },
      descriptionBrief:
        "Given **Employee(Id, DeptId, Salary)** and **Raise(DeptId, Pct)**, **increase each " +
        "employee's salary** by their department's raise percentage. Show the table after the update.",
      schema: [
        { name: "Raise", columns: [
          { name: "DeptId", type: "INT", note: "PK" },
          { name: "Pct", type: "INT", note: "percent, e.g. 10" } ] },
        { name: "Employee", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "DeptId", type: "INT" },
          { name: "Salary", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employee','U') IS NOT NULL DROP TABLE dbo.Employee;\n" +
        "IF OBJECT_ID('dbo.Raise','U') IS NOT NULL DROP TABLE dbo.Raise;\n" +
        "CREATE TABLE dbo.Raise (DeptId INT PRIMARY KEY, Pct INT);\n" +
        "CREATE TABLE dbo.Employee (Id INT PRIMARY KEY, DeptId INT, Salary INT);\n" +
        "INSERT INTO dbo.Raise VALUES (10,10),(20,0);\n" +
        "INSERT INTO dbo.Employee VALUES (1,10,1000),(2,10,2000),(3,20,3000);",
      sampleData: [
        { table: "Raise", columns: ["DeptId","Pct"], rows: [[10,10],[20,0]] },
        { table: "Employee", columns: ["Id","DeptId","Salary"], rows: [[1,10,1000],[2,10,2000],[3,20,3000]] }
      ],
      expectedOutput: { columns: ["Id","DeptId","Salary"], rows: [[1,10,1100],[2,10,2200],[3,20,3000]] },
      approaches: [
        {
          name: "UPDATE … FROM join (recommended)",
          perfNote: "A single set-based UPDATE joins each employee to their department's raise and applies it in one statement — no row-by-row loop.",
          dialectNote: "T-SQL's `UPDATE t SET … FROM t JOIN … ` extends standard UPDATE; alias the updated table in the UPDATE clause.",
          logic:
            "**What it asks.** Raise every salary by a department-specific percentage stored in another table.\n\n" +
            "**Why the naive idea fails.** A bare `UPDATE Employee SET Salary = Salary * …` can't reach the per-department Pct in the Raise table without a join.\n\n" +
            "**Key Idea.** `UPDATE e SET e.Salary = … FROM Employee e JOIN Raise r ON r.DeptId = e.DeptId` applies each department's percentage to its employees in one pass.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Join `Employee` to `Raise` on DeptId.\n" +
            "2. Set `Salary = Salary + Salary * Pct / 100`.\n" +
            "3. Employees whose department has Pct 0 are unchanged.\n\n" +
            "**Why it works.** The join makes each department's Pct available per employee row, so the arithmetic is a normal column expression.\n\n" +
            "**Common Gotchas.** Integer math: `Salary * Pct / 100` is fine here (1000*10/100=100) but watch truncation with odd percentages — multiply before dividing, or use decimals. Alias the updated table.\n\n" +
            "**Performance.** One join-driven set update.\n\n" +
            "**Interview mindset.** 'update a table using values from another' → UPDATE … FROM join (set-based, not a cursor).",
          tsql:
            "UPDATE e\n" +
            "SET e.Salary = e.Salary + e.Salary * r.Pct / 100   -- apply the dept raise\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Raise r ON r.DeptId = e.DeptId;\n" +
            "-- SELECT * FROM dbo.Employee;  -- inspect the result",
          clean:
            "UPDATE e\n" +
            "SET e.Salary = e.Salary + e.Salary * r.Pct / 100\n" +
            "FROM dbo.Employee e\n" +
            "JOIN dbo.Raise r ON r.DeptId = e.DeptId;"
        }
      ],
      walkthrough: [
        { step: "Join each employee to their dept raise", note: "Dept 10 → +10%, Dept 20 → +0%.",
          table: { columns: ["Id","Salary","Pct"], rows: [[1,1000,10],[2,2000,10],[3,3000,0]] } },
        { step: "Employee after UPDATE",
          table: { columns: ["Id","DeptId","Salary"], rows: [[1,10,1100],[2,10,2200],[3,20,3000]] } }
      ],
      patternRecognition: [
        "'update/set a column using another table' → UPDATE … FROM with a join (set-based)."
      ],
      interviewRecall: [
        "Alias the updated table in the UPDATE clause: `UPDATE e … FROM Employee e JOIN …`.",
        "Watch integer truncation in percentage math; multiply before dividing or use decimals."
      ],
      commonMistakes: [
        "Trying to reference the other table's column without a FROM join.",
        "Dividing before multiplying and truncating the raise to 0."
      ]
    }

  ]);
})();
