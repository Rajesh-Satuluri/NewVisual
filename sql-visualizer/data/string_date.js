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
    },

    {
      id: "tags-per-post-csv",
      number: "SS 9812",
      platform: "StrataScratch",
      title: "Comma-Separated Tags per Post",
      difficulty: "Medium",
      category: "String & Date Functions",
      topics: ["String & Date Functions", "Aggregation & Grouping"],
      domains: ["Content Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "String aggregation", sqlConcept: "STRING_AGG", technique: "Concatenate group rows" },
      descriptionBrief:
        "Given **PostTags(PostId, Tag)**, return one row per post with its tags joined into a " +
        "single **comma-separated string**, tags in alphabetical order.",
      schema: [
        { name: "PostTags", columns: [
          { name: "PostId", type: "INT" },
          { name: "Tag", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.PostTags','U') IS NOT NULL DROP TABLE dbo.PostTags;\n" +
        "CREATE TABLE dbo.PostTags (PostId INT, Tag VARCHAR(30));\n" +
        "INSERT INTO dbo.PostTags VALUES\n" +
        "  (1,'sql'),(1,'joins'),(1,'cte'),(2,'python'),(2,'pandas');",
      sampleData: [
        { table: "PostTags", columns: ["PostId","Tag"],
          rows: [[1,"sql"],[1,"joins"],[1,"cte"],[2,"python"],[2,"pandas"]] }
      ],
      expectedOutput: { columns: ["PostId","Tags"], rows: [[1,"cte, joins, sql"],[2,"pandas, python"]] },
      approaches: [
        {
          name: "STRING_AGG (recommended)",
          perfNote: "One grouped pass builds each list; `WITHIN GROUP (ORDER BY …)` sorts inside the aggregate without a separate sort of the whole set.",
          dialectNote: "STRING_AGG is SQL Server 2017+. Order the concatenation with WITHIN GROUP (ORDER BY …).",
          logic:
            "**What it asks.** Collapse the many tag rows of each post into one delimited string.\n\n" +
            "**Why the naive idea fails.** Plain aggregates like MAX pick a single value; you need to *concatenate* all values in a group — historically the awkward FOR XML PATH trick.\n\n" +
            "**Key Idea.** `STRING_AGG(Tag, ', ')` concatenates every row in the group with a separator; `WITHIN GROUP (ORDER BY Tag)` fixes the order.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `GROUP BY PostId`.\n" +
            "2. `STRING_AGG(Tag, ', ') WITHIN GROUP (ORDER BY Tag)`.\n\n" +
            "**Why it works.** STRING_AGG is a group aggregate that emits the joined text once per group.\n\n" +
            "**Common Gotchas.** Requires SQL Server 2017+; without WITHIN GROUP the order is unspecified. Watch the 8000-byte limit unless the input is nvarchar(max).\n\n" +
            "**Performance.** Single group-aggregate pass; far cheaper and cleaner than FOR XML PATH.\n\n" +
            "**Interview mindset.** 'combine group rows into one string/list' → STRING_AGG (the modern replacement for FOR XML PATH).",
          tsql:
            "SELECT PostId,\n" +
            "       STRING_AGG(Tag, ', ') WITHIN GROUP (ORDER BY Tag) AS Tags  -- sorted, comma-joined\n" +
            "FROM dbo.PostTags\n" +
            "GROUP BY PostId\n" +
            "ORDER BY PostId;",
          clean:
            "SELECT PostId,\n" +
            "       STRING_AGG(Tag, ', ') WITHIN GROUP (ORDER BY Tag) AS Tags\n" +
            "FROM dbo.PostTags\n" +
            "GROUP BY PostId\n" +
            "ORDER BY PostId;"
        }
      ],
      walkthrough: [
        { step: "Concatenate tags per post (alphabetical)", note: "Post 1: cte, joins, sql. Post 2: pandas, python.",
          table: { columns: ["PostId","Tags"], rows: [[1,"cte, joins, sql"],[2,"pandas, python"]] } }
      ],
      patternRecognition: [
        "'combine group rows into one delimited string / list' → STRING_AGG (… WITHIN GROUP (ORDER BY …))."
      ],
      interviewRecall: [
        "STRING_AGG (2017+) replaces the old FOR XML PATH(' ') concatenation hack.",
        "Order the output with WITHIN GROUP (ORDER BY …), not a plain ORDER BY."
      ],
      commonMistakes: [
        "Expecting a deterministic order without WITHIN GROUP.",
        "Overflowing 8000 bytes when concatenating many long values into a non-max type."
      ]
    },

    {
      id: "days-to-ship",
      number: "DL 10145",
      platform: "DataLemur",
      title: "Average Days to Ship",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions", "Aggregation & Grouping"],
      domains: ["Operations Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Date difference", sqlConcept: "DATEDIFF", technique: "Interval between two dates" },
      descriptionBrief:
        "Given **Orders(OrderDate, ShipDate)**, return the **average number of days** between " +
        "order and shipment across all orders (rounded to 1 decimal).",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "OrderDate", type: "DATE" },
          { name: "ShipDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, OrderDate DATE, ShipDate DATE);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,'2024-01-01','2024-01-04'),(2,'2024-01-02','2024-01-03'),(3,'2024-01-05','2024-01-11');",
      sampleData: [
        { table: "Orders", columns: ["Id","OrderDate","ShipDate"],
          rows: [[1,"2024-01-01","2024-01-04"],[2,"2024-01-02","2024-01-03"],[3,"2024-01-05","2024-01-11"]] }
      ],
      expectedOutput: { columns: ["AvgDaysToShip"], rows: [["3.3"]] },
      approaches: [
        {
          name: "AVG of DATEDIFF (recommended)",
          perfNote: "DATEDIFF(DAY,…) is a cheap integer computation per row; AVG over it is a single aggregate pass.",
          dialectNote: "DATEDIFF(DAY, start, end) returns the count of day boundaries crossed (an integer).",
          logic:
            "**What it asks.** The mean shipping delay in days.\n\n" +
            "**Why the naive idea fails.** Subtracting two DATEs with '-' is not valid in T-SQL the way it is in some dialects; you must use DATEDIFF. And averaging integer day-diffs truncates unless you cast.\n\n" +
            "**Key Idea.** Compute `DATEDIFF(DAY, OrderDate, ShipDate)` per order, then average it as a decimal.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Per row, `DATEDIFF(DAY, OrderDate, ShipDate)` = delay in days.\n" +
            "2. `AVG(CAST(... AS DECIMAL))` so the mean keeps its fraction.\n" +
            "3. Round to 1 decimal.\n\n" +
            "**Why it works.** DATEDIFF gives the day gap; averaging over all rows yields the mean delay.\n\n" +
            "**Common Gotchas.** `AVG` over integer day-diffs truncates — cast to DECIMAL first. (3+1+6)/3 = 3.33 → 3.3.\n\n" +
            "**Performance.** One scan + one aggregate.\n\n" +
            "**Interview mindset.** 'time between two timestamps' → DATEDIFF with the right datepart; cast before averaging.",
          tsql:
            "SELECT CAST(AVG(CAST(DATEDIFF(DAY, OrderDate, ShipDate) AS DECIMAL(10,4)))\n" +
            "            AS DECIMAL(10,1)) AS AvgDaysToShip\n" +
            "FROM dbo.Orders;",
          clean:
            "SELECT CAST(AVG(CAST(DATEDIFF(DAY, OrderDate, ShipDate) AS DECIMAL(10,4))) AS DECIMAL(10,1)) AS AvgDaysToShip\n" +
            "FROM dbo.Orders;"
        }
      ],
      walkthrough: [
        { step: "Days per order, then average", note: "3, 1, 6 → mean 3.33 → 3.3.",
          table: { columns: ["Id","Days"], rows: [[1,3],[2,1],[3,6]] } }
      ],
      patternRecognition: [
        "'time/gap between two dates' → DATEDIFF(part, start, end); average as DECIMAL."
      ],
      interviewRecall: [
        "DATEDIFF counts boundary crossings of the chosen part, not elapsed fractional time.",
        "Cast integer day-diffs to DECIMAL before AVG to avoid truncation."
      ],
      commonMistakes: [
        "Subtracting dates with '-' (invalid for DATE in T-SQL).",
        "Averaging integer DATEDIFF results and truncating the mean."
      ]
    },

    {
      id: "clean-phone-numbers",
      number: "SS 9955",
      platform: "StrataScratch",
      title: "Normalize Phone Numbers",
      difficulty: "Easy",
      category: "String & Date Functions",
      topics: ["String & Date Functions"],
      domains: ["Data Cleaning"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "String cleanup", sqlConcept: "REPLACE / TRIM", technique: "Strip formatting characters" },
      descriptionBrief:
        "Given **Contacts(Phone)** with numbers stored inconsistently (spaces, dashes, " +
        "parentheses), return each contact's phone as **digits only**.",
      schema: [
        { name: "Contacts", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Phone", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Contacts','U') IS NOT NULL DROP TABLE dbo.Contacts;\n" +
        "CREATE TABLE dbo.Contacts (Id INT PRIMARY KEY, Phone VARCHAR(30));\n" +
        "INSERT INTO dbo.Contacts VALUES\n" +
        "  (1,'(555) 123-4567'),(2,'555-987-6543'),(3,'555 111 2222');",
      sampleData: [
        { table: "Contacts", columns: ["Id","Phone"],
          rows: [[1,"(555) 123-4567"],[2,"555-987-6543"],[3,"555 111 2222"]] }
      ],
      expectedOutput: { columns: ["Id","Digits"], rows: [[1,"5551234567"],[2,"5559876543"],[3,"5551112222"]] },
      approaches: [
        {
          name: "Nested REPLACE (recommended)",
          perfNote: "A handful of nested REPLACEs is a cheap scalar computation; fine for a known, small set of unwanted characters.",
          dialectNote: "",
          logic:
            "**What it asks.** Strip formatting so only the digits remain.\n\n" +
            "**Why the naive idea fails.** There's no single 'remove all non-digits' built-in in older T-SQL; you remove each unwanted character explicitly (or use TRANSLATE to map them out).\n\n" +
            "**Key Idea.** Nest `REPLACE` calls to delete each formatting character: spaces, dashes, parentheses.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `REPLACE(Phone,'(','')` then wrap with `REPLACE(...,')','')`.\n" +
            "2. Wrap again to remove spaces and dashes.\n" +
            "3. The result is digits only.\n\n" +
            "**Why it works.** Each REPLACE removes all occurrences of one character; nesting chains the removals.\n\n" +
            "**Common Gotchas.** List every formatting character; a leftover '+' or '.' would survive. TRANSLATE (2017+) can map several characters in one call.\n\n" +
            "**Performance.** Scalar string ops over one scan.\n\n" +
            "**Interview mindset.** 'strip specific characters' → nested REPLACE (or TRANSLATE); 'keep only digits generally' → a pattern loop / CLR.",
          tsql:
            "SELECT Id,\n" +
            "       REPLACE(REPLACE(REPLACE(REPLACE(Phone,'(',''),')',''),'-',''),' ','') AS Digits\n" +
            "FROM dbo.Contacts\n" +
            "ORDER BY Id;",
          clean:
            "SELECT Id,\n" +
            "       REPLACE(REPLACE(REPLACE(REPLACE(Phone,'(',''),')',''),'-',''),' ','') AS Digits\n" +
            "FROM dbo.Contacts\n" +
            "ORDER BY Id;"
        }
      ],
      walkthrough: [
        { step: "Remove ( ) - and spaces", note: "'(555) 123-4567' → '5551234567'.",
          table: { columns: ["Id","Digits"], rows: [[1,"5551234567"],[2,"5559876543"],[3,"5551112222"]] } }
      ],
      patternRecognition: [
        "'strip a known set of characters' → nested REPLACE, or TRANSLATE (2017+) to map many at once."
      ],
      interviewRecall: [
        "REPLACE removes ALL occurrences of the target substring.",
        "TRANSLATE swaps a set of characters in one pass; REPLACE handles one substring each."
      ],
      commonMistakes: [
        "Forgetting one formatting character, leaving it in the output.",
        "Assuming a single built-in strips all non-digits in classic T-SQL."
      ]
    }

  ]);
})();
