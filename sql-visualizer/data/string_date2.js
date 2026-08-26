/*
 * data/string_date2.js — String & Date Functions (additional problems).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("String & Date Functions", [

    {
      id: "str2-split-full-name",
      number: "SS 9860",
      platform: "StrataScratch",
      title: "Split 'Last, First' Into Name Columns",
      difficulty: "Medium",
      category: "String & Date Functions",
      topics: ["String & Date Functions"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Delimiter parsing", sqlConcept: "CHARINDEX / LEFT / SUBSTRING", technique: "Split a string on a separator" },
      descriptionBrief:
        "Given **People(FullName)** where names are stored as **'Last, First'**, split each into a " +
        "**LastName** and **FirstName** column (trimmed of surrounding spaces) and build a tidy " +
        "**'First Last'** display string.",
      schema: [
        { name: "People", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "FullName", type: "VARCHAR(100)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.People','U') IS NOT NULL DROP TABLE dbo.People;\n" +
        "CREATE TABLE dbo.People (Id INT PRIMARY KEY, FullName VARCHAR(100));\n" +
        "INSERT INTO dbo.People VALUES\n" +
        "  (1,'Smith, Anna'),(2,'Brown, Liam'),(3,'Lee, Mia'),(4,'Vance, Cole');",
      sampleData: [
        { table: "People", columns: ["Id","FullName"],
          rows: [[1,"Smith, Anna"],[2,"Brown, Liam"],[3,"Lee, Mia"],[4,"Vance, Cole"]] }
      ],
      expectedOutput: { columns: ["Id","LastName","FirstName","DisplayName"],
        rows: [[1,"Smith","Anna","Anna Smith"],[2,"Brown","Liam","Liam Brown"],[3,"Lee","Mia","Mia Lee"],[4,"Vance","Cole","Cole Vance"]] },
      approaches: [
        {
          name: "CHARINDEX + LEFT/SUBSTRING (recommended)",
          perfNote: "Locate the comma once with CHARINDEX, then slice both halves with LEFT and SUBSTRING; a handful of cheap scalar ops per row.",
          dialectNote: "TRIM is SQL Server 2017+; on older builds use LTRIM(RTRIM(...)).",
          logic:
            "**What it asks.** Break one 'Last, First' field into two clean columns and a friendly display name.\n\n" +
            "**Why the naive idea fails.** A blind `LEFT(FullName, 5)` assumes a fixed width; names vary. You must find the delimiter position dynamically, and the space after the comma leaves ' First' unless you trim.\n\n" +
            "**Key Idea.** `CHARINDEX(',', FullName)` gives the comma's position; everything before it is the last name, everything after it is the first name — then `TRIM` the pieces.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `pos = CHARINDEX(',', FullName)` locates the separator.\n" +
            "2. `LEFT(FullName, pos - 1)` is the last name; `SUBSTRING(FullName, pos + 1, LEN(FullName))` is the first name.\n" +
            "3. `TRIM(...)` each to drop the space that follows the comma.\n" +
            "4. `CONCAT(FirstName, ' ', LastName)` builds the display string.\n\n" +
            "**Why it works.** The comma is the single split point, so its index cleanly partitions the string into the two names regardless of their lengths.\n\n" +
            "**Common Gotchas.** Subtract 1 from the comma position for LEFT or the comma leaks into the last name. Trim the first name or it keeps a leading space. `CONCAT` treats NULLs as '' — handy here, unlike '+'.\n\n" +
            "**Performance.** One scan with scalar string work per row; no index helps a computed split.\n\n" +
            "**Interview mindset.** 'Split on a delimiter' → CHARINDEX to find it, LEFT/SUBSTRING to slice, TRIM to clean.",
          tsql:
            "SELECT Id,\n" +
            "       TRIM(LEFT(FullName, CHARINDEX(',', FullName) - 1)) AS LastName,        -- before the comma\n" +
            "       TRIM(SUBSTRING(FullName, CHARINDEX(',', FullName) + 1, LEN(FullName))) AS FirstName,  -- after it\n" +
            "       CONCAT(TRIM(SUBSTRING(FullName, CHARINDEX(',', FullName) + 1, LEN(FullName))),\n" +
            "              ' ',\n" +
            "              TRIM(LEFT(FullName, CHARINDEX(',', FullName) - 1))) AS DisplayName\n" +
            "FROM dbo.People\n" +
            "ORDER BY Id;",
          clean:
            "SELECT Id,\n" +
            "       TRIM(LEFT(FullName, CHARINDEX(',', FullName) - 1)) AS LastName,\n" +
            "       TRIM(SUBSTRING(FullName, CHARINDEX(',', FullName) + 1, LEN(FullName))) AS FirstName,\n" +
            "       CONCAT(TRIM(SUBSTRING(FullName, CHARINDEX(',', FullName) + 1, LEN(FullName))), ' ',\n" +
            "              TRIM(LEFT(FullName, CHARINDEX(',', FullName) - 1))) AS DisplayName\n" +
            "FROM dbo.People\n" +
            "ORDER BY Id;"
        }
      ],
      walkthrough: [
        { step: "Find the comma, slice both halves, trim", note: "'Smith, Anna' → Last 'Smith', First 'Anna'.",
          table: { columns: ["Id","LastName","FirstName"], rows: [[1,"Smith","Anna"],[2,"Brown","Liam"],[3,"Lee","Mia"],[4,"Vance","Cole"]] } },
        { step: "CONCAT into 'First Last'",
          table: { columns: ["Id","DisplayName"], rows: [[1,"Anna Smith"],[2,"Liam Brown"],[3,"Mia Lee"],[4,"Cole Vance"]] } }
      ],
      patternRecognition: [
        "'split on a delimiter' → CHARINDEX to locate it, LEFT/SUBSTRING to slice the two sides.",
        "Trim each slice to shed the space that usually follows a delimiter."
      ],
      interviewRecall: [
        "CHARINDEX returns 0 when the substring is absent — guard before subtracting 1.",
        "CONCAT ignores NULLs (treats them as ''); '+' propagates NULL across the whole expression."
      ],
      commonMistakes: [
        "Forgetting the `- 1` so the comma leaks into the last name.",
        "Leaving the leading space on the first name by skipping TRIM."
      ]
    },

    {
      id: "str2-weekday-order-volume",
      number: "DL 10188",
      platform: "DataLemur",
      title: "Order Volume by Day of Week",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions", "Aggregation & Grouping"],
      domains: ["E-commerce Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Bucket by weekday", sqlConcept: "DATENAME / DATEPART", technique: "Group on a weekday part" },
      descriptionBrief:
        "Given **Orders(OrderDate)**, count how many orders fell on each **day of the week** " +
        "(Monday, Tuesday, …). Return the weekday name and its order count, busiest first.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "OrderDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, OrderDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'2024-01-01'),(2,'2024-01-01'),(3,'2024-01-02'),\n" +
        "  (4,'2024-01-06'),(5,'2024-01-07'),(6,'2024-01-08');",
      sampleData: [
        { table: "Orders", columns: ["Id","OrderDate"],
          rows: [[1,"2024-01-01"],[2,"2024-01-01"],[3,"2024-01-02"],[4,"2024-01-06"],[5,"2024-01-07"],[6,"2024-01-08"]] }
      ],
      expectedOutput: { columns: ["Weekday","Orders"],
        rows: [["Monday",3],["Saturday",1],["Sunday",1],["Tuesday",1]] },
      approaches: [
        {
          name: "Group on DATENAME(WEEKDAY) (recommended)",
          perfNote: "One scan + group; DATENAME turns each date into its weekday label, which becomes the grouping key.",
          dialectNote: "DATENAME(WEEKDAY,…) returns the language-dependent name; DATEPART(WEEKDAY,…) returns a number whose start depends on @@DATEFIRST.",
          logic:
            "**What it asks.** Order counts bucketed by the seven days of the week.\n\n" +
            "**Why the naive idea fails.** Grouping on the raw `OrderDate` gives one bucket per calendar date, not per weekday; and a plain `DATEPART(WEEKDAY,…)` number is 1–7 with no name and shifts with the server's `@@DATEFIRST` setting.\n\n" +
            "**Key Idea.** `DATENAME(WEEKDAY, OrderDate)` maps every date to its weekday name ('Monday', 'Tuesday', …); GROUP BY that.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `DATENAME(WEEKDAY, OrderDate)` per row.\n" +
            "2. `GROUP BY` that weekday name.\n" +
            "3. `COUNT(*)` per group.\n" +
            "4. Order by the count descending (busiest first), name as the tie-break.\n\n" +
            "**Why it works.** All dates that fall on the same weekday share the same DATENAME value, so they collapse into one group.\n\n" +
            "**Common Gotchas.** DATENAME is language-dependent (SET LANGUAGE / login default). The DATEPART weekday *number* depends on @@DATEFIRST; the *name* from DATENAME does not, which is why it is safer here.\n\n" +
            "**Performance.** One scan + hash/stream aggregate; the per-row DATENAME is cheap.\n\n" +
            "**Interview mindset.** 'per weekday / month / quarter' → derive that date part, then GROUP BY it.",
          tsql:
            "SELECT DATENAME(WEEKDAY, OrderDate) AS Weekday,\n" +
            "       COUNT(*)                     AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY DATENAME(WEEKDAY, OrderDate)\n" +
            "ORDER BY Orders DESC, Weekday;",
          clean:
            "SELECT DATENAME(WEEKDAY, OrderDate) AS Weekday, COUNT(*) AS Orders\n" +
            "FROM dbo.Orders\n" +
            "GROUP BY DATENAME(WEEKDAY, OrderDate)\n" +
            "ORDER BY Orders DESC, Weekday;"
        }
      ],
      walkthrough: [
        { step: "Label each date with its weekday", note: "Jan 1 & 8 = Monday, Jan 2 = Tuesday, Jan 6 = Saturday, Jan 7 = Sunday.",
          table: { columns: ["Id","Weekday"], rows: [[1,"Monday"],[2,"Monday"],[3,"Tuesday"],[4,"Saturday"],[5,"Sunday"],[6,"Monday"]] } },
        { step: "Count per weekday, busiest first", note: "Monday 3; Saturday/Sunday/Tuesday 1 each.",
          table: { columns: ["Weekday","Orders"], rows: [["Monday",3],["Saturday",1],["Sunday",1],["Tuesday",1]] } }
      ],
      patternRecognition: [
        "'per day of week' → GROUP BY DATENAME(WEEKDAY, date).",
        "Need the name → DATENAME; need a sortable number → DATEPART (mind @@DATEFIRST)."
      ],
      interviewRecall: [
        "DATENAME returns a language-dependent string; DATEPART returns an integer.",
        "DATEPART(WEEKDAY,…) numbering starts at whatever @@DATEFIRST says (default Sunday=1 for us_english)."
      ],
      commonMistakes: [
        "Grouping on the raw date and getting one row per calendar day.",
        "Relying on the DATEPART weekday number without accounting for @@DATEFIRST."
      ]
    },

    {
      id: "str2-month-end-close",
      number: "HR 4471",
      platform: "HackerRank",
      title: "Days Until Month-End Close",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions"],
      domains: ["Finance Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Month boundary", sqlConcept: "EOMONTH / DATEDIFF", technique: "Snap to end of month" },
      descriptionBrief:
        "Given **Invoices(InvoiceDate)**, each invoice is due on the **last day of its month**. " +
        "Return that month-end due date and the **number of days** from the invoice date to it.",
      schema: [
        { name: "Invoices", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "InvoiceDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Invoices','U') IS NOT NULL DROP TABLE dbo.Invoices;\n" +
        "CREATE TABLE dbo.Invoices (Id INT PRIMARY KEY, InvoiceDate DATE);\n" +
        "INSERT INTO dbo.Invoices VALUES\n" +
        "  (1,'2024-02-10'),(2,'2024-04-15'),(3,'2024-12-01');",
      sampleData: [
        { table: "Invoices", columns: ["Id","InvoiceDate"],
          rows: [[1,"2024-02-10"],[2,"2024-04-15"],[3,"2024-12-01"]] }
      ],
      expectedOutput: { columns: ["Id","MonthEnd","DaysToMonthEnd"],
        rows: [[1,"2024-02-29",19],[2,"2024-04-30",15],[3,"2024-12-31",30]] },
      approaches: [
        {
          name: "EOMONTH + DATEDIFF (recommended)",
          perfNote: "EOMONTH computes the last day directly (leap years included); DATEDIFF(DAY,…) gives the gap in one integer op.",
          dialectNote: "EOMONTH is SQL Server 2012+ and returns the last day of the month for the given date.",
          logic:
            "**What it asks.** For each invoice, the last calendar day of its month and how many days away that is.\n\n" +
            "**Why the naive idea fails.** Hand-building the month end ('year-month-31' or first-of-next-month minus one) is fiddly and breaks on February and leap years — Feb 2024 ends on the 29th, not the 28th or 31st.\n\n" +
            "**Key Idea.** `EOMONTH(InvoiceDate)` returns the correct last day for any month; `DATEDIFF(DAY, InvoiceDate, EOMONTH(InvoiceDate))` is the days remaining.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `EOMONTH(InvoiceDate)` → the month-end due date.\n" +
            "2. `DATEDIFF(DAY, InvoiceDate, EOMONTH(InvoiceDate))` → days to close.\n" +
            "3. Project both alongside the id.\n\n" +
            "**Why it works.** EOMONTH knows each month's length, including leap-year February, so it always lands on the true last day.\n\n" +
            "**Common Gotchas.** EOMONTH takes an optional second arg to shift months (`EOMONTH(d, 1)` = end of *next* month) — don't pass it here. DATEDIFF counts day boundaries, so an invoice already on month-end yields 0.\n\n" +
            "**Performance.** Two cheap scalar functions per row over a single scan.\n\n" +
            "**Interview mindset.** 'last day of the month' → EOMONTH; never assemble '-31' by hand.",
          tsql:
            "SELECT Id,\n" +
            "       EOMONTH(InvoiceDate)                              AS MonthEnd,       -- true last day\n" +
            "       DATEDIFF(DAY, InvoiceDate, EOMONTH(InvoiceDate))  AS DaysToMonthEnd\n" +
            "FROM dbo.Invoices\n" +
            "ORDER BY Id;",
          clean:
            "SELECT Id,\n" +
            "       EOMONTH(InvoiceDate) AS MonthEnd,\n" +
            "       DATEDIFF(DAY, InvoiceDate, EOMONTH(InvoiceDate)) AS DaysToMonthEnd\n" +
            "FROM dbo.Invoices\n" +
            "ORDER BY Id;"
        }
      ],
      walkthrough: [
        { step: "Snap each date to its month-end", note: "Feb 2024 is a leap year → 2024-02-29, not the 28th.",
          table: { columns: ["Id","MonthEnd"], rows: [[1,"2024-02-29"],[2,"2024-04-30"],[3,"2024-12-31"]] } },
        { step: "Count days from invoice date to month-end", note: "Feb 10→29 = 19; Apr 15→30 = 15; Dec 1→31 = 30.",
          table: { columns: ["Id","DaysToMonthEnd"], rows: [[1,19],[2,15],[3,30]] } }
      ],
      patternRecognition: [
        "'last day of the month' → EOMONTH(date); shift months with the optional 2nd argument.",
        "'days between two dates' → DATEDIFF(DAY, start, end)."
      ],
      interviewRecall: [
        "EOMONTH handles leap-year February automatically — Feb 2024 ends on the 29th.",
        "EOMONTH(d, n) jumps n months (e.g. EOMONTH(d, -1) is the prior month's end)."
      ],
      commonMistakes: [
        "Building a month-end by string-concatenating '-31' and breaking on Feb/short months.",
        "Passing a month-offset to EOMONTH by accident and landing on the wrong month."
      ]
    },

    {
      id: "str2-employee-tenure-band",
      number: "SS 10422",
      platform: "StrataScratch",
      title: "Employee Tenure in Completed Years",
      difficulty: "Medium",
      category: "String & Date Functions",
      topics: ["String & Date Functions"],
      domains: ["HR Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Age / tenure", sqlConcept: "DATEDIFF + anniversary adjust", technique: "Completed whole years" },
      descriptionBrief:
        "Given **Staff(Name, HireDate)**, compute each employee's **completed years of tenure** as " +
        "of **2026-08-26** and label them: 10+ = 'Veteran', 5–9 = 'Senior', 2–4 = 'Mid', else 'New'.",
      schema: [
        { name: "Staff", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "HireDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Staff','U') IS NOT NULL DROP TABLE dbo.Staff;\n" +
        "CREATE TABLE dbo.Staff (Id INT PRIMARY KEY, Name VARCHAR(50), HireDate DATE);\n" +
        "INSERT INTO dbo.Staff VALUES\n" +
        "  (1,'Ann','2015-03-01'),(2,'Ben','2020-09-15'),\n" +
        "  (3,'Cid','2024-08-26'),(4,'Dee','2026-01-10');",
      sampleData: [
        { table: "Staff", columns: ["Id","Name","HireDate"],
          rows: [[1,"Ann","2015-03-01"],[2,"Ben","2020-09-15"],[3,"Cid","2024-08-26"],[4,"Dee","2026-01-10"]] }
      ],
      expectedOutput: { columns: ["Name","HireDate","TenureYears","Band"],
        rows: [["Ann","2015-03-01",11,"Veteran"],["Ben","2020-09-15",5,"Senior"],["Cid","2024-08-26",2,"Mid"],["Dee","2026-01-10",0,"New"]] },
      approaches: [
        {
          name: "DATEDIFF with anniversary correction (recommended)",
          perfNote: "One DATEDIFF plus a boolean correction per row; no self-join, purely scalar.",
          dialectNote: "DATEDIFF(YEAR,…) counts year-boundary crossings, NOT elapsed full years.",
          logic:
            "**What it asks.** Whole completed years since hire as of a reference date, then a seniority band.\n\n" +
            "**Why the naive idea fails.** `DATEDIFF(YEAR, HireDate, @asof)` counts *January boundaries crossed*, not full years — someone hired 2020-09-15 shows 6 on 2026-08-26 even though their 6th anniversary (Sep 15) has not arrived yet. It over-counts whenever the reference date is earlier in the year than the hire anniversary.\n\n" +
            "**Key Idea.** Take `DATEDIFF(YEAR, …)` and subtract 1 when the anniversary has not yet occurred this year (reference month/day is before hire month/day).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `raw = DATEDIFF(YEAR, HireDate, @asof)` — boundary count.\n" +
            "2. If `(month/day of @asof) < (month/day of HireDate)`, the anniversary hasn't passed → subtract 1.\n" +
            "3. Encode that test cheaply as `CASE WHEN DATEADD(YEAR, raw, HireDate) > @asof THEN 1 ELSE 0 END`.\n" +
            "4. Map the completed years to a band with `CASE`.\n\n" +
            "**Why it works.** `DATEADD(YEAR, raw, HireDate)` is the most recent boundary-anniversary; if it lands *after* the reference date, that last year isn't complete, so we remove it.\n\n" +
            "**Common Gotchas.** Never report `DATEDIFF(YEAR,…)` as age/tenure directly. An exact-anniversary date (Cid, hired 2024-08-26, as of 2026-08-26) is a *completed* 2 years, not 1 — the `>` (strict) comparison keeps it at 2.\n\n" +
            "**Performance.** Scalar arithmetic over one scan; nothing to index.\n\n" +
            "**Interview mindset.** 'age / years of service' → DATEDIFF(YEAR) then adjust for whether the anniversary has passed.",
          tsql:
            "SELECT Name, HireDate,\n" +
            "       DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE))\n" +
            "         - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE)), HireDate)\n" +
            "                     > CAST('2026-08-26' AS DATE) THEN 1 ELSE 0 END AS TenureYears,\n" +
            "       CASE\n" +
            "         WHEN DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE))\n" +
            "              - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE)), HireDate)\n" +
            "                          > CAST('2026-08-26' AS DATE) THEN 1 ELSE 0 END >= 10 THEN 'Veteran'\n" +
            "         WHEN DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE))\n" +
            "              - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE)), HireDate)\n" +
            "                          > CAST('2026-08-26' AS DATE) THEN 1 ELSE 0 END >= 5 THEN 'Senior'\n" +
            "         WHEN DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE))\n" +
            "              - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE)), HireDate)\n" +
            "                          > CAST('2026-08-26' AS DATE) THEN 1 ELSE 0 END >= 2 THEN 'Mid'\n" +
            "         ELSE 'New'\n" +
            "       END AS Band\n" +
            "FROM dbo.Staff\n" +
            "ORDER BY TenureYears DESC, Name;",
          clean:
            "WITH T AS (\n" +
            "    SELECT Name, HireDate,\n" +
            "           DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE))\n" +
            "             - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, HireDate, CAST('2026-08-26' AS DATE)), HireDate)\n" +
            "                         > CAST('2026-08-26' AS DATE) THEN 1 ELSE 0 END AS TenureYears\n" +
            "    FROM dbo.Staff\n" +
            ")\n" +
            "SELECT Name, HireDate, TenureYears,\n" +
            "       CASE WHEN TenureYears >= 10 THEN 'Veteran'\n" +
            "            WHEN TenureYears >= 5  THEN 'Senior'\n" +
            "            WHEN TenureYears >= 2  THEN 'Mid'\n" +
            "            ELSE 'New' END AS Band\n" +
            "FROM T\n" +
            "ORDER BY TenureYears DESC, Name;"
        }
      ],
      walkthrough: [
        { step: "Raw DATEDIFF(YEAR) then anniversary adjust", note: "Ben: raw 6, but Sep 15 anniversary not yet reached on Aug 26 → 5. Cid: exact anniversary → completed 2.",
          table: { columns: ["Name","TenureYears"], rows: [["Ann",11],["Ben",5],["Cid",2],["Dee",0]] } },
        { step: "Map years to a band", note: "11→Veteran, 5→Senior, 2→Mid, 0→New.",
          table: { columns: ["Name","HireDate","TenureYears","Band"],
            rows: [["Ann","2015-03-01",11,"Veteran"],["Ben","2020-09-15",5,"Senior"],["Cid","2024-08-26",2,"Mid"],["Dee","2026-01-10",0,"New"]] } }
      ],
      patternRecognition: [
        "'age / years of service' → DATEDIFF(YEAR) MINUS 1 if the anniversary hasn't passed this year.",
        "Compare month/day (or use DATEADD back to the anniversary) to decide the correction."
      ],
      interviewRecall: [
        "DATEDIFF(YEAR, a, b) counts calendar-year boundaries, not full elapsed years.",
        "DATEADD(YEAR, DATEDIFF(YEAR,a,b), a) > b tells you the last year is incomplete."
      ],
      commonMistakes: [
        "Reporting DATEDIFF(YEAR,…) as tenure and over-counting by a year.",
        "Using `>=` on the anniversary test and under-counting someone on their exact anniversary."
      ]
    }

  ]);
})();
