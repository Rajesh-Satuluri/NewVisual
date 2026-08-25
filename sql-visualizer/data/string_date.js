/*
 * data/string_date.js — String & Date Functions.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("String & Date Functions", [

    {
      id: "orders-per-month",
      number: "DL 10123",
      platform: "DataLemur",
      title: "Order Count by Month",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions", "Aggregation & Grouping"],
      domains: ["Sales Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Bucket by month", sqlConcept: "FORMAT / DATEFROMPARTS", technique: "Group on a date part" },
      descriptionBrief:
        "Given **Orders(OrderDate)**, return the number of orders in each **year-month** " +
        "(as 'YYYY-MM'), chronologically.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "OrderDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, OrderDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'2024-01-05'),(2,'2024-01-20'),(3,'2024-02-02'),(4,'2024-02-15'),(5,'2024-02-28');",
      sampleData: [
        { table: "Orders", columns: ["Id","OrderDate"],
          rows: [[1,"2024-01-05"],[2,"2024-01-20"],[3,"2024-02-02"],[4,"2024-02-15"],[5,"2024-02-28"]] }
      ],
      expectedOutput: { columns: ["YearMonth","Orders"], rows: [["2024-01",2],["2024-02",3]] },
      approaches: [
        {
          name: "Group on FORMAT (recommended)",
          perfNote: "FORMAT is convenient but scalar-CLR and slow at scale; for big tables prefer grouping on YEAR()/MONTH() or a computed DATEFROMPARTS and formatting only in the SELECT.",
          dialectNote: "FORMAT(date,'yyyy-MM') is SQL Server 2012+; it is not SARGable, so don't filter on it.",
          logic:
            "**What it asks.** Orders bucketed by calendar month.\n\n" +
            "**Why the naive idea fails.** Grouping on the raw `OrderDate` makes one bucket per day; you must collapse each date to its month first.\n\n" +
            "**Key Idea.** Derive a month key from the date (`FORMAT(OrderDate,'yyyy-MM')`) and GROUP BY it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute the year-month string per row.\n" +
            "2. `GROUP BY` that key.\n" +
            "3. `COUNT(*)` per group, ordered by the key.\n\n" +
            "**Why it works.** All dates in the same month map to the same string, so they fall in one group.\n\n" +
            "**Common Gotchas.** FORMAT is culture-aware and slow; for large data group on `YEAR()`,`MONTH()` (or `EOMONTH`) instead and only format for display.\n\n" +
            "**Performance.** One scan + group; FORMAT adds per-row CLR cost.\n\n" +
            "**Interview mindset.** 'per month/quarter/year' → derive the period key, then GROUP BY it.",
          tsql:
            "SELECT FORMAT(OrderDate, 'yyyy-MM') AS YearMonth,\n" +
            "       COUNT(*)                     AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY FORMAT(OrderDate, 'yyyy-MM')\n" +
            "ORDER BY YearMonth;",
          clean:
            "SELECT FORMAT(OrderDate, 'yyyy-MM') AS YearMonth, COUNT(*) AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY FORMAT(OrderDate, 'yyyy-MM')\n" +
            "ORDER BY YearMonth;"
        },
        {
          name: "Group on YEAR()/MONTH() (scalable)",
          perfNote: "Integer date parts group faster than FORMAT; assemble the 'yyyy-MM' label only in the projection.",
          dialectNote: "",
          logic:
            "**Key Idea.** Group on the numeric `YEAR()` and `MONTH()` parts, which are cheap, and build the display label afterward.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY YEAR(OrderDate), MONTH(OrderDate)`.\n" +
            "2. `COUNT(*)` per group.\n" +
            "3. Format the label with `RIGHT('0'+CAST(month AS varchar),2)` or `FORMAT` on the small grouped result.\n\n" +
            "**Why it works.** (year, month) uniquely identifies each month; grouping on integers avoids per-row string work.\n\n" +
            "**Common Gotchas.** Zero-pad the month in the label so '2024-2' becomes '2024-02'.\n\n" +
            "**Performance.** Faster than FORMAT on large tables.\n\n" +
            "**Interview mindset.** Show you know FORMAT is a convenience, not the scalable path.",
          tsql:
            "SELECT CAST(YEAR(OrderDate) AS varchar(4)) + '-'\n" +
            "       + RIGHT('0' + CAST(MONTH(OrderDate) AS varchar(2)), 2) AS YearMonth,\n" +
            "       COUNT(*) AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY YEAR(OrderDate), MONTH(OrderDate)\n" +
            "ORDER BY YearMonth;",
          clean:
            "SELECT CAST(YEAR(OrderDate) AS varchar(4)) + '-'\n" +
            "       + RIGHT('0' + CAST(MONTH(OrderDate) AS varchar(2)), 2) AS YearMonth,\n" +
            "       COUNT(*) AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY YEAR(OrderDate), MONTH(OrderDate)\n" +
            "ORDER BY YearMonth;"
        }
      ],
      walkthrough: [
        { step: "Map each date to its month, count", note: "Jan → 2 orders, Feb → 3 orders.",
          table: { columns: ["YearMonth","Orders"], rows: [["2024-01",2],["2024-02",3]] } }
      ],
      patternRecognition: [
        "'per month/quarter/year' → derive a period key (FORMAT or YEAR/MONTH), GROUP BY it."
      ],
      interviewRecall: [
        "FORMAT is non-SARGable and slow; group on integer date parts for scale.",
        "Zero-pad month numbers when building a 'yyyy-MM' label."
      ],
      commonMistakes: [
        "Grouping on the raw date and getting one row per day.",
        "Filtering with FORMAT(...) in WHERE, defeating any index on the date."
      ]
    },

    {
      id: "gmail-users",
      number: "SS 9781",
      platform: "StrataScratch",
      title: "Users With a Gmail Address",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions", "Filtering & Subqueries"],
      domains: ["Marketing Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Domain match", sqlConcept: "LIKE / RIGHT", technique: "Suffix test on a string" },
      descriptionBrief:
        "Given **Users(Email)**, return the users whose email address is on the " +
        "**gmail.com** domain (the part after the '@').",
      schema: [
        { name: "Users", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Email", type: "VARCHAR(100)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Users','U') IS NOT NULL DROP TABLE dbo.Users;\n" +
        "CREATE TABLE dbo.Users (Id INT PRIMARY KEY, Email VARCHAR(100));\n" +
        "INSERT INTO dbo.Users VALUES\n" +
        "  (1,'ana@gmail.com'),(2,'ben@yahoo.com'),(3,'cara@gmail.com'),(4,'dan@gmail.com.co');",
      sampleData: [
        { table: "Users", columns: ["Id","Email"],
          rows: [[1,"ana@gmail.com"],[2,"ben@yahoo.com"],[3,"cara@gmail.com"],[4,"dan@gmail.com.co"]] }
      ],
      expectedOutput: { columns: ["Id","Email"], rows: [[1,"ana@gmail.com"],[3,"cara@gmail.com"]] },
      approaches: [
        {
          name: "Exact domain via '@' split (recommended)",
          perfNote: "Comparing the substring after '@' to 'gmail.com' is exact and avoids the false positive that a loose LIKE '%gmail.com%' would match (e.g. gmail.com.co).",
          dialectNote: "",
          logic:
            "**What it asks.** Users whose domain is exactly gmail.com.\n\n" +
            "**Why the naive idea fails.** `LIKE '%gmail.com'` also matches 'x@gmail.com.co'? No — but `LIKE '%gmail.com%'` does, and `LIKE '%gmail.com'` matches sub-domains like 'a@mail.gmail.com'. Testing the exact domain avoids both traps.\n\n" +
            "**Key Idea.** Extract the substring after the '@' and compare it to 'gmail.com' for equality.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `CHARINDEX('@', Email)` locates the '@'.\n" +
            "2. `SUBSTRING(Email, pos+1, LEN(Email))` is the domain.\n" +
            "3. Keep rows where the domain = 'gmail.com'.\n\n" +
            "**Why it works.** Equality on the exact domain rejects lookalikes such as 'gmail.com.co'.\n\n" +
            "**Common Gotchas.** A trailing wildcard on 'gmail.com' still admits sub-domains; extract and compare exactly.\n\n" +
            "**Performance.** A scan with per-row string ops; domain filters rarely use an index anyway.\n\n" +
            "**Interview mindset.** 'exact domain' → split on '@' and compare; loose LIKE only for fuzzy contains.",
          tsql:
            "SELECT Id, Email\n" +
            "FROM dbo.Users\n" +
            "WHERE SUBSTRING(Email, CHARINDEX('@', Email) + 1, LEN(Email)) = 'gmail.com';",
          clean:
            "SELECT Id, Email\n" +
            "FROM dbo.Users\n" +
            "WHERE SUBSTRING(Email, CHARINDEX('@', Email) + 1, LEN(Email)) = 'gmail.com';"
        }
      ],
      walkthrough: [
        { step: "Extract the domain after '@'", note: "gmail.com, yahoo.com, gmail.com, gmail.com.co.",
          table: { columns: ["Id","Domain"], rows: [[1,"gmail.com"],[2,"yahoo.com"],[3,"gmail.com"],[4,"gmail.com.co"]] } },
        { step: "Keep domain = 'gmail.com'",
          table: { columns: ["Id","Email"], rows: [[1,"ana@gmail.com"],[3,"cara@gmail.com"]] } }
      ],
      patternRecognition: [
        "'exact domain/suffix' → split the string and compare; 'contains' → LIKE '%x%'."
      ],
      interviewRecall: [
        "CHARINDEX finds a substring position; SUBSTRING slices from it.",
        "A loose LIKE can match unintended lookalikes — extract and compare for exactness."
      ],
      commonMistakes: [
        "Using LIKE '%gmail.com%' and matching 'gmail.com.co'.",
        "Assuming every email has exactly one '@' without validating the data."
      ]
    }

  ]);
})();
