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
    }

  ]);
})();
