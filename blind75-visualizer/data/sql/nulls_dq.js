/*
 * data/sql/nulls_dq.js — Nulls & Data Quality.
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 * The three-valued-logic traps and dedup/audit patterns that quietly fail
 * "queries that run but return the wrong rows" — a favourite interview trap.
 */
(function () {
  window.SQLLAB.register("Nulls & Data Quality", [

    {
      id: "ndq-not-in-null-trap",
      number: "SL 4101",
      platform: "StudyLab",
      title: "The NOT IN NULL Trap",
      difficulty: "Medium",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Subqueries"],
      domains: ["HR Analytics"],
      link: "",
      meta: { pattern: "Anti-membership with NULLs", sqlConcept: "NOT IN vs NOT EXISTS", technique: "Three-valued logic" },
      descriptionBrief:
        "Given **Employees(EmpId, Name)** and **BonusRecipients(EmpId)** — where one recipient row " +
        "was inserted as **NULL** by a bad ETL job — return every employee who did **not** receive a bonus. " +
        "Show why the obvious `NOT IN` returns an empty result.",
      schema: [
        { name: "Employees", columns: [
          { name: "EmpId", type: "INT" },
          { name: "Name", type: "VARCHAR(40)" } ] },
        { name: "BonusRecipients", columns: [
          { name: "EmpId", type: "INT", note: "nullable — contains a stray NULL" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.BonusRecipients','U') IS NOT NULL DROP TABLE dbo.BonusRecipients;\n" +
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (EmpId INT, Name VARCHAR(40));\n" +
        "CREATE TABLE dbo.BonusRecipients (EmpId INT NULL);\n" +
        "INSERT INTO dbo.Employees VALUES (1,'Alice'),(2,'Bob'),(3,'Carol'),(4,'Dan');\n" +
        "INSERT INTO dbo.BonusRecipients VALUES (2),(NULL);",
      sampleData: [
        { table: "Employees", columns: ["EmpId","Name"],
          rows: [[1,"Alice"],[2,"Bob"],[3,"Carol"],[4,"Dan"]] },
        { table: "BonusRecipients", columns: ["EmpId"],
          rows: [[2],[null]] }
      ],
      expectedOutput: { columns: ["EmpId","Name"],
        rows: [[1,"Alice"],[3,"Carol"],[4,"Dan"]] },
      approaches: [
        {
          name: "NOT EXISTS (recommended)",
          perfNote: "Semi-join; the optimizer stops at the first match and is completely unaffected by NULLs in the inner set.",
          dialectNote: "NOT EXISTS behaves identically across SQL Server, Postgres, MySQL and Oracle — the portable, safe choice.",
          logic:
            "**What it asks.** Every employee with no matching row in BonusRecipients.\n\n" +
            "**Why the naive idea fails.** `EmpId NOT IN (2, NULL)` expands to `EmpId <> 2 AND EmpId <> NULL`. `EmpId <> NULL` is never TRUE — it is UNKNOWN — so the whole `AND` can never be TRUE, and **every** row is filtered out. The query returns nothing.\n\n" +
            "**Key Idea.** `NOT EXISTS` uses row-existence, not value-equality, so a NULL in the inner table simply fails to match and is harmless.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each employee, probe BonusRecipients for a row with the same EmpId.\n" +
            "2. `NOT EXISTS` keeps the employee only when no such row is found.\n" +
            "3. The stray NULL never equals any EmpId, so it is correctly ignored.\n\n" +
            "**Why it works.** Existence is two-valued (a row is found or it is not); it never collapses into UNKNOWN the way `<>` against NULL does.\n\n" +
            "**Common Gotchas.** Reaching for `NOT IN` on a nullable column; forgetting that a single NULL poisons the entire result.\n\n" +
            "**Performance.** Anti-semi-join, typically a hash or merge anti-join — O(n).\n\n" +
            "**Interview mindset.** 'not in a set that might contain NULLs' → `NOT EXISTS`, every time.",
          tsql:
            "SELECT e.EmpId, e.Name\n" +
            "FROM dbo.Employees e\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.BonusRecipients b\n" +
            "    WHERE b.EmpId = e.EmpId)\n" +
            "ORDER BY e.EmpId;",
          clean:
            "SELECT e.EmpId, e.Name\n" +
            "FROM dbo.Employees e\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.BonusRecipients b WHERE b.EmpId = e.EmpId)\n" +
            "ORDER BY e.EmpId;"
        },
        {
          name: "NOT IN with an explicit IS NOT NULL guard",
          perfNote: "Works, but you must remember the guard; one forgotten filter reintroduces the bug.",
          dialectNote: "Portable, but considered fragile — reviewers prefer NOT EXISTS or a LEFT JOIN … IS NULL anti-join.",
          logic:
            "**What it asks.** The same anti-membership result, kept safe for `NOT IN`.\n\n" +
            "**Why the naive idea fails.** Plain `NOT IN` over a nullable subquery is the trap itself; without a guard it returns nothing.\n\n" +
            "**Key Idea.** Strip NULLs from the inner set with `WHERE EmpId IS NOT NULL` before applying `NOT IN`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the inner list filtered to `EmpId IS NOT NULL`.\n" +
            "2. Apply `NOT IN` against that clean list.\n\n" +
            "**Why it works.** With no NULL in the list, `<> NULL` never appears and the logic stays two-valued.\n\n" +
            "**Common Gotchas.** Forgetting the guard on the next similar query; it is a manual safeguard, not a structural fix.\n\n" +
            "**Performance.** Comparable to NOT EXISTS once NULLs are removed.\n\n" +
            "**Interview mindset.** If you must use NOT IN on a nullable column, say the guard out loud — but prefer NOT EXISTS.",
          tsql:
            "SELECT e.EmpId, e.Name\n" +
            "FROM dbo.Employees e\n" +
            "WHERE e.EmpId NOT IN (\n" +
            "    SELECT b.EmpId FROM dbo.BonusRecipients b\n" +
            "    WHERE b.EmpId IS NOT NULL)\n" +
            "ORDER BY e.EmpId;",
          clean:
            "SELECT e.EmpId, e.Name\n" +
            "FROM dbo.Employees e\n" +
            "WHERE e.EmpId NOT IN (SELECT b.EmpId FROM dbo.BonusRecipients b WHERE b.EmpId IS NOT NULL)\n" +
            "ORDER BY e.EmpId;"
        }
      ],
      walkthrough: [
        { step: "Expand the naive NOT IN", note: "EmpId <> 2 AND EmpId <> NULL → the second term is UNKNOWN → whole predicate never TRUE → 0 rows." },
        { step: "Switch to NOT EXISTS", note: "Probe by existence; the NULL row never matches any EmpId and is ignored.",
          table: { columns: ["EmpId","Name"], rows: [[1,"Alice"],[3,"Carol"],[4,"Dan"]] } }
      ],
      patternRecognition: [
        "'employees/customers NOT in <subquery>' where the subquery column is nullable → NOT EXISTS.",
        "An anti-membership query that mysteriously returns zero rows → suspect a NULL in the NOT IN list."
      ],
      interviewRecall: [
        "NOT IN (…, NULL) can never be TRUE — it returns an empty set.",
        "NOT EXISTS and LEFT JOIN … IS NULL are NULL-safe; NOT IN is not."
      ],
      commonMistakes: [
        "Using NOT IN against a nullable subquery column.",
        "Blaming the data instead of the three-valued logic when the result is empty."
      ]
    },

    {
      id: "ndq-three-valued-logic",
      number: "SL 4102",
      platform: "StudyLab",
      title: "Non-Active Accounts (NULL Counts Too)",
      difficulty: "Easy",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Filtering"],
      domains: ["SaaS Analytics"],
      link: "",
      meta: { pattern: "NULL-inclusive inequality", sqlConcept: "IS NULL with <>", technique: "Three-valued logic" },
      descriptionBrief:
        "Given **Accounts(AccountId, Status)** where Status can be NULL, return every account whose status " +
        "is **not** 'active'. A missing (NULL) status must count as non-active — the naive `Status <> 'active'` silently drops it.",
      schema: [
        { name: "Accounts", columns: [
          { name: "AccountId", type: "INT" },
          { name: "Status", type: "VARCHAR(20)", note: "nullable" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Accounts','U') IS NOT NULL DROP TABLE dbo.Accounts;\n" +
        "CREATE TABLE dbo.Accounts (AccountId INT, Status VARCHAR(20) NULL);\n" +
        "INSERT INTO dbo.Accounts VALUES (1,'active'),(2,'closed'),(3,NULL),(4,'suspended');",
      sampleData: [
        { table: "Accounts", columns: ["AccountId","Status"],
          rows: [[1,"active"],[2,"closed"],[3,null],[4,"suspended"]] }
      ],
      expectedOutput: { columns: ["AccountId","Status"],
        rows: [[2,"closed"],[3,null],[4,"suspended"]] },
      approaches: [
        {
          name: "Inequality OR IS NULL (recommended)",
          perfNote: "A single scan with an OR predicate; on a big table an index on Status still helps the equality side.",
          dialectNote: "Postgres/DB2 offer `Status IS DISTINCT FROM 'active'` which handles NULL in one operator; SQL Server has no IS DISTINCT FROM before 2022, so use the explicit OR.",
          logic:
            "**What it asks.** All accounts not currently active, treating NULL (unknown) as non-active.\n\n" +
            "**Why the naive idea fails.** `Status <> 'active'` evaluates to UNKNOWN for the NULL row, and WHERE keeps only rows where the predicate is TRUE — so account 3 disappears.\n\n" +
            "**Key Idea.** Add `OR Status IS NULL` to explicitly rescue the unknown rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep rows where `Status <> 'active'` (the known non-active).\n" +
            "2. OR-in `Status IS NULL` to include the missing ones.\n\n" +
            "**Why it works.** IS NULL is a two-valued test that returns TRUE for NULLs, filling the gap left by the inequality.\n\n" +
            "**Common Gotchas.** Assuming `<>` covers NULL; writing `Status = NULL` (always UNKNOWN) instead of `IS NULL`.\n\n" +
            "**Performance.** One scan; predicate is sargable on the equality half.\n\n" +
            "**Interview mindset.** Any inequality on a nullable column → ask 'what about the NULLs?' and add IS NULL if they belong.",
          tsql:
            "SELECT AccountId, Status\n" +
            "FROM dbo.Accounts\n" +
            "WHERE Status <> 'active' OR Status IS NULL\n" +
            "ORDER BY AccountId;",
          clean:
            "SELECT AccountId, Status\n" +
            "FROM dbo.Accounts\n" +
            "WHERE Status <> 'active' OR Status IS NULL\n" +
            "ORDER BY AccountId;"
        }
      ],
      walkthrough: [
        { step: "Evaluate the naive predicate", note: "Row 3: NULL <> 'active' → UNKNOWN → dropped by WHERE." },
        { step: "Add OR IS NULL", note: "Row 3 now qualifies via IS NULL.",
          table: { columns: ["AccountId","Status"], rows: [[2,"closed"],[3,null],[4,"suspended"]] } }
      ],
      patternRecognition: [
        "'everything except X' on a nullable column → `col <> 'X' OR col IS NULL`.",
        "A filter that quietly loses rows with missing values → three-valued logic."
      ],
      interviewRecall: [
        "WHERE keeps only TRUE rows; UNKNOWN is discarded like FALSE.",
        "col = NULL and col <> NULL are always UNKNOWN — use IS NULL / IS NOT NULL."
      ],
      commonMistakes: [
        "Writing Status <> 'active' and silently excluding NULLs.",
        "Using Status = NULL instead of Status IS NULL."
      ]
    },

    {
      id: "ndq-coalesce-nullif",
      number: "SL 4103",
      platform: "StudyLab",
      title: "Safe Conversion Rate with COALESCE and NULLIF",
      difficulty: "Easy",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Aggregation"],
      domains: ["Marketing Analytics"],
      link: "",
      meta: { pattern: "Null-safe division & defaults", sqlConcept: "COALESCE / NULLIF", technique: "Guarded arithmetic" },
      descriptionBrief:
        "Given **Campaigns(CampaignId, Region, Visits, Signups)**, return each campaign's region " +
        "(defaulting a missing region to 'Unknown') and its conversion rate = Signups / Visits. " +
        "Guard against **division by zero** so a campaign with 0 visits yields NULL, not an error.",
      schema: [
        { name: "Campaigns", columns: [
          { name: "CampaignId", type: "INT" },
          { name: "Region", type: "VARCHAR(20)", note: "nullable" },
          { name: "Visits", type: "INT" },
          { name: "Signups", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Campaigns','U') IS NOT NULL DROP TABLE dbo.Campaigns;\n" +
        "CREATE TABLE dbo.Campaigns (CampaignId INT, Region VARCHAR(20) NULL, Visits INT, Signups INT);\n" +
        "INSERT INTO dbo.Campaigns VALUES (1,'US',100,10),(2,NULL,0,0),(3,'EU',50,5);",
      sampleData: [
        { table: "Campaigns", columns: ["CampaignId","Region","Visits","Signups"],
          rows: [[1,"US",100,10],[2,null,0,0],[3,"EU",50,5]] }
      ],
      expectedOutput: { columns: ["CampaignId","RegionLabel","ConversionRate"],
        rows: [[1,"US",0.10],[2,"Unknown",null],[3,"EU",0.10]] },
      approaches: [
        {
          name: "COALESCE for defaults, NULLIF for the divisor (recommended)",
          perfNote: "Pure scalar expressions in the SELECT list; no extra passes.",
          dialectNote: "COALESCE and NULLIF are ANSI-standard and identical across engines. Use `1.0 *` (or CAST) to force decimal division in SQL Server, where INT/INT truncates.",
          logic:
            "**What it asks.** A labelled region plus a conversion rate that never errors on zero visits.\n\n" +
            "**Why the naive idea fails.** `Signups / Visits` throws a divide-by-zero error for campaign 2, and integer division would truncate 10/100 to 0 anyway.\n\n" +
            "**Key Idea.** `NULLIF(Visits, 0)` turns a 0 divisor into NULL (making the quotient NULL, not an error); `COALESCE(Region, 'Unknown')` supplies a default label.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `COALESCE(Region,'Unknown')` for the display label.\n" +
            "2. Multiply Signups by 1.0 to get decimal division.\n" +
            "3. Divide by `NULLIF(Visits,0)` so zero visits produce NULL.\n\n" +
            "**Why it works.** Any arithmetic with a NULL operand yields NULL, so the guarded divisor short-circuits the whole expression safely.\n\n" +
            "**Common Gotchas.** Integer division truncating to 0; forgetting the NULLIF and hitting a runtime error mid-report.\n\n" +
            "**Performance.** Negligible — scalar functions per row.\n\n" +
            "**Interview mindset.** 'a rate/ratio' → immediately say NULLIF on the denominator and decimal casting.",
          tsql:
            "SELECT CampaignId,\n" +
            "       COALESCE(Region, 'Unknown') AS RegionLabel,\n" +
            "       ROUND(1.0 * Signups / NULLIF(Visits, 0), 2) AS ConversionRate\n" +
            "FROM dbo.Campaigns\n" +
            "ORDER BY CampaignId;",
          clean:
            "SELECT CampaignId,\n" +
            "       COALESCE(Region, 'Unknown') AS RegionLabel,\n" +
            "       ROUND(1.0 * Signups / NULLIF(Visits, 0), 2) AS ConversionRate\n" +
            "FROM dbo.Campaigns\n" +
            "ORDER BY CampaignId;"
        }
      ],
      walkthrough: [
        { step: "Guard the divisor", note: "Campaign 2: NULLIF(0,0)=NULL → 0/NULL → NULL rate (no error)." },
        { step: "Default the label & divide", note: "Region NULL → 'Unknown'; 10/100 and 5/50 → 0.10.",
          table: { columns: ["CampaignId","RegionLabel","ConversionRate"], rows: [[1,"US",0.10],[2,"Unknown",null],[3,"EU",0.10]] } }
      ],
      patternRecognition: [
        "'rate / ratio / percentage' → NULLIF(denominator, 0) to dodge divide-by-zero.",
        "'default a missing value' → COALESCE(col, fallback)."
      ],
      interviewRecall: [
        "NULLIF(a,b) returns NULL when a = b, else a — perfect for zero divisors.",
        "COALESCE returns the first non-NULL argument; it is ANSI-standard (ISNULL is SQL-Server-only, two-arg)."
      ],
      commonMistakes: [
        "Integer division truncating the rate to 0 — cast to decimal first.",
        "Omitting NULLIF and crashing on a single zero-visit row."
      ]
    },

    {
      id: "ndq-count-star-vs-col",
      number: "SL 4104",
      platform: "StudyLab",
      title: "COUNT(*) vs COUNT(col): Rated Reviews",
      difficulty: "Easy",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Aggregation"],
      domains: ["E-commerce"],
      link: "",
      meta: { pattern: "Null-aware counting", sqlConcept: "COUNT(*) vs COUNT(col)", technique: "Aggregate NULL semantics" },
      descriptionBrief:
        "Given **Reviews(ReviewId, ProductId, Rating)** where Rating may be NULL, return per product the " +
        "**total** number of reviews, the number that were actually **rated**, and the **average rating** — " +
        "demonstrating how COUNT and AVG treat NULLs.",
      schema: [
        { name: "Reviews", columns: [
          { name: "ReviewId", type: "INT" },
          { name: "ProductId", type: "INT" },
          { name: "Rating", type: "INT", note: "nullable — review left with no score" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Reviews','U') IS NOT NULL DROP TABLE dbo.Reviews;\n" +
        "CREATE TABLE dbo.Reviews (ReviewId INT, ProductId INT, Rating INT NULL);\n" +
        "INSERT INTO dbo.Reviews VALUES (1,100,5),(2,100,NULL),(3,100,4),(4,200,NULL);",
      sampleData: [
        { table: "Reviews", columns: ["ReviewId","ProductId","Rating"],
          rows: [[1,100,5],[2,100,null],[3,100,4],[4,200,null]] }
      ],
      expectedOutput: { columns: ["ProductId","TotalReviews","RatedReviews","AvgRating"],
        rows: [[100,3,2,4.5],[200,1,0,null]] },
      approaches: [
        {
          name: "COUNT(*) and COUNT(Rating) side by side (recommended)",
          perfNote: "Single grouped scan; both counters and the average come from one aggregation.",
          dialectNote: "COUNT(col) ignoring NULLs and AVG ignoring NULLs are ANSI-standard behaviours across all major engines.",
          logic:
            "**What it asks.** Total rows per product, how many carried a rating, and the average of the ratings that exist.\n\n" +
            "**Why the naive idea fails.** Using `COUNT(*)` for 'rated' overcounts (it counts the unrated review too); dividing a manual SUM by COUNT(*) understates the average by treating NULL as 0.\n\n" +
            "**Key Idea.** `COUNT(*)` counts rows; `COUNT(Rating)` counts only non-NULL ratings; `AVG(Rating)` averages only non-NULL ratings.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. GROUP BY ProductId.\n" +
            "2. `COUNT(*)` for total reviews.\n" +
            "3. `COUNT(Rating)` for rated reviews.\n" +
            "4. `AVG(Rating)` — automatically skips NULLs, so product 200 (no ratings) is NULL.\n\n" +
            "**Why it works.** All SQL aggregates except COUNT(*) ignore NULL inputs, so the denominator of AVG is the count of non-NULLs, not of rows.\n\n" +
            "**Common Gotchas.** Expecting AVG to return 0 for an all-NULL group (it returns NULL); using COUNT(*) where COUNT(col) is meant.\n\n" +
            "**Performance.** One hash/stream aggregate — O(n).\n\n" +
            "**Interview mindset.** 'how many actually have X' → COUNT(X); 'how many rows' → COUNT(*).",
          tsql:
            "SELECT ProductId,\n" +
            "       COUNT(*)        AS TotalReviews,\n" +
            "       COUNT(Rating)   AS RatedReviews,\n" +
            "       ROUND(AVG(1.0 * Rating), 2) AS AvgRating\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY ProductId\n" +
            "ORDER BY ProductId;",
          clean:
            "SELECT ProductId,\n" +
            "       COUNT(*) AS TotalReviews,\n" +
            "       COUNT(Rating) AS RatedReviews,\n" +
            "       ROUND(AVG(1.0 * Rating), 2) AS AvgRating\n" +
            "FROM dbo.Reviews\n" +
            "GROUP BY ProductId\n" +
            "ORDER BY ProductId;"
        }
      ],
      walkthrough: [
        { step: "Product 100", note: "3 rows total; ratings {5,4} non-NULL → rated 2, avg (5+4)/2 = 4.5." },
        { step: "Product 200", note: "1 row, rating NULL → rated 0, AVG over no values → NULL.",
          table: { columns: ["ProductId","TotalReviews","RatedReviews","AvgRating"], rows: [[100,3,2,4.5],[200,1,0,null]] } }
      ],
      patternRecognition: [
        "'how many have a value for X' → COUNT(X); 'how many records' → COUNT(*).",
        "An average that should ignore missing scores → AVG(col) needs no filter; it skips NULLs."
      ],
      interviewRecall: [
        "COUNT(*) counts rows; COUNT(col) counts non-NULL values of col.",
        "SUM/AVG/MIN/MAX all ignore NULLs; AVG of an all-NULL group is NULL, not 0."
      ],
      commonMistakes: [
        "Averaging with SUM(col)/COUNT(*), which dilutes the mean by counting NULL rows.",
        "Expecting 0 instead of NULL for a group with no non-NULL values."
      ]
    },

    {
      id: "ndq-dedup-keep-latest",
      number: "SL 4105",
      platform: "StudyLab",
      title: "Deduplicate: Keep the Most Recent Row",
      difficulty: "Medium",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Window Functions"],
      domains: ["CRM"],
      link: "",
      meta: { pattern: "Keep-latest-per-key", sqlConcept: "ROW_NUMBER() OVER PARTITION", technique: "Ranked dedup" },
      descriptionBrief:
        "Given **CustomerProfiles(CustomerId, UpdatedAt, Email)** with multiple historical rows per customer, " +
        "return exactly **one row per customer** — the most recently updated profile.",
      schema: [
        { name: "CustomerProfiles", columns: [
          { name: "CustomerId", type: "INT" },
          { name: "UpdatedAt", type: "DATE" },
          { name: "Email", type: "VARCHAR(60)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.CustomerProfiles','U') IS NOT NULL DROP TABLE dbo.CustomerProfiles;\n" +
        "CREATE TABLE dbo.CustomerProfiles (CustomerId INT, UpdatedAt DATE, Email VARCHAR(60));\n" +
        "INSERT INTO dbo.CustomerProfiles VALUES\n" +
        "  (1,'2024-01-01','a@x.com'),(1,'2024-03-01','a2@x.com'),\n" +
        "  (2,'2024-02-01','b@x.com'),(2,'2024-02-15','b2@x.com');",
      sampleData: [
        { table: "CustomerProfiles", columns: ["CustomerId","UpdatedAt","Email"],
          rows: [[1,"2024-01-01","a@x.com"],[1,"2024-03-01","a2@x.com"],
                 [2,"2024-02-01","b@x.com"],[2,"2024-02-15","b2@x.com"]] }
      ],
      expectedOutput: { columns: ["CustomerId","UpdatedAt","Email"],
        rows: [[1,"2024-03-01","a2@x.com"],[2,"2024-02-15","b2@x.com"]] },
      approaches: [
        {
          name: "ROW_NUMBER() then keep rn = 1 (recommended)",
          perfNote: "One partitioned sort; deterministic when the ORDER BY is unique enough. Add a tie-breaker column for stability.",
          dialectNote: "ROW_NUMBER() OVER (PARTITION BY … ORDER BY … DESC) is portable across SQL Server, Postgres, MySQL 8+, and Oracle.",
          logic:
            "**What it asks.** The single latest profile per customer.\n\n" +
            "**Why the naive idea fails.** `GROUP BY CustomerId` with `MAX(UpdatedAt)` gives the latest date but cannot carry the matching Email without a self-join; picking MAX(Email) mixes columns from different rows.\n\n" +
            "**Key Idea.** Number rows within each customer by recency, then keep number 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY UpdatedAt DESC)`.\n" +
            "2. Wrap in a CTE.\n" +
            "3. Filter `rn = 1`.\n\n" +
            "**Why it works.** Row numbering keeps the whole row intact, so the Email travels with its own UpdatedAt — no column mixing.\n\n" +
            "**Common Gotchas.** Ties on UpdatedAt with no tie-breaker → non-deterministic winner; filtering rn=1 in the same SELECT that defines it (not allowed — window funcs can't sit in WHERE).\n\n" +
            "**Performance.** O(n log n) for the partitioned sort.\n\n" +
            "**Interview mindset.** 'one row per key, chosen by recency/priority' → ROW_NUMBER + rn = 1.",
          tsql:
            "WITH ranked AS (\n" +
            "  SELECT CustomerId, UpdatedAt, Email,\n" +
            "         ROW_NUMBER() OVER (PARTITION BY CustomerId\n" +
            "                            ORDER BY UpdatedAt DESC) AS rn\n" +
            "  FROM dbo.CustomerProfiles)\n" +
            "SELECT CustomerId, UpdatedAt, Email\n" +
            "FROM ranked\n" +
            "WHERE rn = 1\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH ranked AS (\n" +
            "  SELECT CustomerId, UpdatedAt, Email,\n" +
            "         ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY UpdatedAt DESC) AS rn\n" +
            "  FROM dbo.CustomerProfiles)\n" +
            "SELECT CustomerId, UpdatedAt, Email FROM ranked WHERE rn = 1 ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "Number by recency per customer", note: "Customer 1: 2024-03-01 → rn 1, 2024-01-01 → rn 2. Customer 2: 2024-02-15 → rn 1." },
        { step: "Keep rn = 1", note: "One most-recent row per customer.",
          table: { columns: ["CustomerId","UpdatedAt","Email"], rows: [[1,"2024-03-01","a2@x.com"],[2,"2024-02-15","b2@x.com"]] } }
      ],
      patternRecognition: [
        "'latest / most recent / current record per key' → ROW_NUMBER() … ORDER BY ts DESC, keep rn = 1.",
        "'deduplicate keeping the best row' → ranked dedup, not GROUP BY."
      ],
      interviewRecall: [
        "Window functions cannot appear in WHERE — compute rn in a CTE/subquery, then filter.",
        "Add a unique tie-breaker to ORDER BY for deterministic dedup."
      ],
      commonMistakes: [
        "GROUP BY + MAX that loses or mismatches the other columns.",
        "Filtering ROW_NUMBER() directly in the same query's WHERE."
      ]
    },

    {
      id: "ndq-orphan-null-audit",
      number: "SL 4106",
      platform: "StudyLab",
      title: "Data-Quality Audit: NULLs and Orphans",
      difficulty: "Medium",
      category: "Nulls & Data Quality",
      topics: ["Nulls & Data Quality", "Joins"],
      domains: ["Data Engineering"],
      link: "",
      meta: { pattern: "Validation / referential integrity", sqlConcept: "LEFT JOIN … IS NULL + UNION ALL", technique: "Anti-join audit" },
      descriptionBrief:
        "Given **Customers(CustomerId)** and **Orders(OrderId, CustomerId, Amount)**, produce a data-quality " +
        "report listing every order that fails validation: either a **NULL amount** or an **orphaned** " +
        "CustomerId that does not exist in Customers. Return the OrderId and a short Issue label.",
      schema: [
        { name: "Customers", columns: [
          { name: "CustomerId", type: "INT" } ] },
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT" },
          { name: "CustomerId", type: "INT" },
          { name: "Amount", type: "INT", note: "nullable" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (CustomerId INT);\n" +
        "CREATE TABLE dbo.Orders (OrderId INT, CustomerId INT, Amount INT NULL);\n" +
        "INSERT INTO dbo.Customers VALUES (1),(2);\n" +
        "INSERT INTO dbo.Orders VALUES (10,1,50),(11,3,20),(12,2,NULL),(13,2,30);",
      sampleData: [
        { table: "Customers", columns: ["CustomerId"], rows: [[1],[2]] },
        { table: "Orders", columns: ["OrderId","CustomerId","Amount"],
          rows: [[10,1,50],[11,3,20],[12,2,null],[13,2,30]] }
      ],
      expectedOutput: { columns: ["OrderId","Issue"],
        rows: [[11,"orphan customer"],[12,"null amount"]] },
      approaches: [
        {
          name: "UNION ALL of two anti-checks (recommended)",
          perfNote: "Each branch is a single scan/anti-join; UNION ALL avoids a needless distinct sort.",
          dialectNote: "LEFT JOIN … WHERE right IS NULL is the portable anti-join; NOT EXISTS is equivalent. UNION ALL is standard everywhere.",
          logic:
            "**What it asks.** One report row per failing order, tagged with the failure type.\n\n" +
            "**Why the naive idea fails.** A single WHERE with OR can find failing rows but cannot label *which* rule each row broke, and an inner join would silently drop the orphan you are trying to catch.\n\n" +
            "**Key Idea.** Run one query per rule and stack them with UNION ALL, each carrying its own literal Issue label.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Orphan check: `Orders LEFT JOIN Customers` on CustomerId, keep rows where `Customers.CustomerId IS NULL`, label 'orphan customer'.\n" +
            "2. Null check: `Orders WHERE Amount IS NULL`, label 'null amount'.\n" +
            "3. `UNION ALL` the two, order by OrderId.\n\n" +
            "**Why it works.** The LEFT JOIN anti-pattern surfaces orphans that an inner join would hide; separate branches let each row keep an accurate label.\n\n" +
            "**Common Gotchas.** Using INNER JOIN (drops orphans); using UNION (pays for a distinct sort you don't need); a row can legitimately appear twice if it breaks both rules.\n\n" +
            "**Performance.** Two O(n) passes; the anti-join is a hash/merge left anti-join.\n\n" +
            "**Interview mindset.** 'audit / which rows are bad and why' → one anti-check per rule, UNION ALL with labels.",
          tsql:
            "SELECT o.OrderId, 'orphan customer' AS Issue\n" +
            "FROM dbo.Orders o\n" +
            "LEFT JOIN dbo.Customers c ON c.CustomerId = o.CustomerId\n" +
            "WHERE c.CustomerId IS NULL\n" +
            "UNION ALL\n" +
            "SELECT o.OrderId, 'null amount'\n" +
            "FROM dbo.Orders o\n" +
            "WHERE o.Amount IS NULL\n" +
            "ORDER BY OrderId;",
          clean:
            "SELECT o.OrderId, 'orphan customer' AS Issue\n" +
            "FROM dbo.Orders o LEFT JOIN dbo.Customers c ON c.CustomerId = o.CustomerId\n" +
            "WHERE c.CustomerId IS NULL\n" +
            "UNION ALL\n" +
            "SELECT o.OrderId, 'null amount' FROM dbo.Orders o WHERE o.Amount IS NULL\n" +
            "ORDER BY OrderId;"
        }
      ],
      walkthrough: [
        { step: "Orphan check", note: "Order 11 → CustomerId 3 not in Customers → 'orphan customer'." },
        { step: "Null check", note: "Order 12 → Amount NULL → 'null amount'." },
        { step: "Stack & order", note: "UNION ALL, ORDER BY OrderId.",
          table: { columns: ["OrderId","Issue"], rows: [[11,"orphan customer"],[12,"null amount"]] } }
      ],
      patternRecognition: [
        "'find rows violating referential integrity' → LEFT JOIN parent … WHERE parent key IS NULL.",
        "'flag bad rows with a reason' → one anti-check per rule, UNION ALL with a literal label."
      ],
      interviewRecall: [
        "LEFT JOIN + right-side IS NULL is the anti-join; INNER JOIN would hide the orphans.",
        "Prefer UNION ALL over UNION when duplicates are impossible or acceptable — it skips the distinct sort."
      ],
      commonMistakes: [
        "Using INNER JOIN and dropping the very orphans you're auditing.",
        "Trying to label multiple failure types from a single OR'd WHERE clause."
      ]
    }

  ]);
})();
