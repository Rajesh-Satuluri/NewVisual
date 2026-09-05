/*
 * data/cte2.js — CTE & Complex Joins (second set).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("CTE & Complex Joins", [

    {
      id: "cte2-dedupe-sensor-average",
      number: "SS 10620",
      platform: "StrataScratch",
      title: "Deduplicate Sensor Readings then Average",
      difficulty: "Hard",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Ranking", "Aggregation & Grouping"],
      domains: ["IoT Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Dedupe-then-aggregate", sqlConcept: "ROW_NUMBER dedupe CTE + AVG", technique: "Keep one row per natural key, then aggregate" },
      descriptionBrief:
        "A logger double-writes some rows into **Readings(Id, SensorId, ReadingTime, Value)**, so the " +
        "same `(SensorId, ReadingTime)` can appear twice. First **deduplicate** to one row per " +
        "sensor-and-timestamp, then return each sensor's **average reading** over its distinct readings.",
      schema: [
        { name: "Readings", columns: [
          { name: "Id", type: "INT", note: "PK (surrogate)" },
          { name: "SensorId", type: "VARCHAR(10)" },
          { name: "ReadingTime", type: "DATETIME2(0)" },
          { name: "Value", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Readings','U') IS NOT NULL DROP TABLE dbo.Readings;\n" +
        "CREATE TABLE dbo.Readings (Id INT PRIMARY KEY, SensorId VARCHAR(10), ReadingTime DATETIME2(0), Value INT);\n" +
        "INSERT INTO dbo.Readings VALUES\n" +
        "  (1,'A','2026-01-01T08:00:00',20),\n" +
        "  (2,'A','2026-01-01T08:00:00',20),\n" +
        "  (3,'A','2026-01-01T09:00:00',30),\n" +
        "  (4,'B','2026-01-01T08:00:00',50),\n" +
        "  (5,'B','2026-01-01T08:00:00',50),\n" +
        "  (6,'B','2026-01-01T09:00:00',70),\n" +
        "  (7,'B','2026-01-01T10:00:00',90);",
      sampleData: [
        { table: "Readings", columns: ["Id","SensorId","ReadingTime","Value"],
          rows: [[1,"A","2026-01-01 08:00:00",20],[2,"A","2026-01-01 08:00:00",20],[3,"A","2026-01-01 09:00:00",30],[4,"B","2026-01-01 08:00:00",50],[5,"B","2026-01-01 08:00:00",50],[6,"B","2026-01-01 09:00:00",70],[7,"B","2026-01-01 10:00:00",90]] }
      ],
      expectedOutput: { columns: ["SensorId","AvgReading"], rows: [["A","25.00"],["B","70.00"]] },
      approaches: [
        {
          name: "Dedupe CTE (ROW_NUMBER) then AVG (recommended)",
          perfNote: "One partitioned window pass tags duplicates; keeping rn = 1 gives one row per natural key, then a plain grouped AVG. No self-join, no double counting.",
          dialectNote: "",
          logic:
            "**What it asks.** The average reading per sensor, but each real measurement must be counted once even though the logger wrote some rows twice.\n\n" +
            "**Why the naive idea fails.** A direct `AVG(Value) GROUP BY SensorId` over the raw table counts the duplicated `(SensorId, ReadingTime)` rows twice, which biases the average toward whichever readings happened to be double-logged.\n\n" +
            "**Key Idea.** Number rows within each `(SensorId, ReadingTime)` group with `ROW_NUMBER()`, keep only rn = 1 in a CTE to collapse duplicates, then aggregate the deduplicated set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Deduped`: `ROW_NUMBER() OVER (PARTITION BY SensorId, ReadingTime ORDER BY Id)` tags each copy.\n" +
            "2. Keep `rn = 1` — one surviving row per distinct sensor-timestamp.\n" +
            "3. `GROUP BY SensorId` and `AVG(Value * 1.0)`, cast to `DECIMAL(6,2)`.\n" +
            "4. Order by sensor.\n\n" +
            "**Why it works.** Partitioning by the natural key `(SensorId, ReadingTime)` puts every duplicate in the same group; rn = 1 keeps exactly one, so the downstream AVG sees each measurement once.\n\n" +
            "**Common Gotchas.** Partition by the *natural* key, not the surrogate `Id` (which is unique, so nothing would dedupe). Multiply by `1.0` so the average is decimal, not truncated integer.\n\n" +
            "**Performance.** One window sort on `(SensorId, ReadingTime, Id)` then a grouped scan; an index on those columns supports both.\n\n" +
            "**Interview mindset.** 'Dirty rows, then aggregate' → dedupe in a CTE with ROW_NUMBER = 1 on the natural key, aggregate outside.",
          tsql:
            "WITH Deduped AS (\n" +
            "    SELECT SensorId, ReadingTime, Value,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY SensorId, ReadingTime  -- natural key\n" +
            "                              ORDER BY Id) AS rn\n" +
            "    FROM dbo.Readings\n" +
            ")\n" +
            "SELECT SensorId,\n" +
            "       CAST(AVG(Value * 1.0) AS DECIMAL(6,2)) AS AvgReading  -- decimal average\n" +
            "FROM Deduped\n" +
            "WHERE rn = 1                 -- one row per sensor-timestamp\n" +
            "GROUP BY SensorId\n" +
            "ORDER BY SensorId;",
          clean:
            "WITH Deduped AS (\n" +
            "    SELECT SensorId, ReadingTime, Value,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY SensorId, ReadingTime ORDER BY Id) AS rn\n" +
            "    FROM dbo.Readings\n" +
            ")\n" +
            "SELECT SensorId, CAST(AVG(Value * 1.0) AS DECIMAL(6,2)) AS AvgReading\n" +
            "FROM Deduped\n" +
            "WHERE rn = 1\n" +
            "GROUP BY SensorId\n" +
            "ORDER BY SensorId;"
        },
        {
          name: "Aggregate over a DISTINCT-per-key CTE",
          perfNote: "Collapse duplicates by grouping on the natural key first (taking one Value per key), then average. Equivalent result; clearer when the duplicate rows are byte-identical.",
          dialectNote: "",
          logic:
            "**Key Idea.** If duplicates carry the same `Value`, reduce each `(SensorId, ReadingTime)` to a single row with `GROUP BY` (using `MIN(Value)` to pick the one value), then average those per sensor.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Distinct1`: `GROUP BY SensorId, ReadingTime`, `MIN(Value) AS Value` → one row per key.\n" +
            "2. Outer query `GROUP BY SensorId`, `AVG(Value * 1.0)`.\n" +
            "3. Cast to `DECIMAL(6,2)` and order.\n\n" +
            "**Why it works.** Grouping on the natural key guarantees one row per real measurement; `MIN` (or `MAX`/`AVG`) simply names the single value the duplicates share.\n\n" +
            "**Common Gotchas.** This assumes duplicates agree on `Value`; if they can disagree, decide the tie-break deliberately (latest write, MAX, etc.) — ROW_NUMBER with an explicit ORDER BY is safer then.\n\n" +
            "**Performance.** Two grouped aggregations; a covering index on `(SensorId, ReadingTime)` helps the first.\n\n" +
            "**Interview mindset.** Show you can dedupe either by ranking or by grouping on the key — pick ranking when you need control over *which* copy survives.",
          tsql:
            "WITH Distinct1 AS (\n" +
            "    SELECT SensorId, ReadingTime, MIN(Value) AS Value\n" +
            "    FROM dbo.Readings\n" +
            "    GROUP BY SensorId, ReadingTime      -- one row per natural key\n" +
            ")\n" +
            "SELECT SensorId,\n" +
            "       CAST(AVG(Value * 1.0) AS DECIMAL(6,2)) AS AvgReading\n" +
            "FROM Distinct1\n" +
            "GROUP BY SensorId\n" +
            "ORDER BY SensorId;",
          clean:
            "WITH Distinct1 AS (\n" +
            "    SELECT SensorId, ReadingTime, MIN(Value) AS Value\n" +
            "    FROM dbo.Readings\n" +
            "    GROUP BY SensorId, ReadingTime\n" +
            ")\n" +
            "SELECT SensorId, CAST(AVG(Value * 1.0) AS DECIMAL(6,2)) AS AvgReading\n" +
            "FROM Distinct1\n" +
            "GROUP BY SensorId\n" +
            "ORDER BY SensorId;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER per (SensorId, ReadingTime)", note: "Ids 2 and 5 are second copies (rn 2); every other row is rn 1.",
          table: { columns: ["SensorId","ReadingTime","Value","rn"],
            rows: [["A","2026-01-01 08:00:00",20,1],["A","2026-01-01 08:00:00",20,2],["A","2026-01-01 09:00:00",30,1],["B","2026-01-01 08:00:00",50,1],["B","2026-01-01 08:00:00",50,2],["B","2026-01-01 09:00:00",70,1],["B","2026-01-01 10:00:00",90,1]] } },
        { step: "Keep rn = 1, average per sensor", note: "A: (20+30)/2 = 25.00. B: (50+70+90)/3 = 70.00.",
          table: { columns: ["SensorId","AvgReading"], rows: [["A","25.00"],["B","70.00"]] } }
      ],
      patternRecognition: [
        "'Duplicate rows, then summarize' → dedupe with ROW_NUMBER = 1 on the natural key inside a CTE, aggregate outside.",
        "Partition on the *natural* key (what makes a row a real event), never on the surrogate PK."
      ],
      interviewRecall: [
        "ROW_NUMBER partitioned by the natural key + keep rn = 1 is the canonical SQL Server dedupe.",
        "AVG over raw rows double-counts duplicates; dedupe first."
      ],
      commonMistakes: [
        "Averaging the raw table and letting double-logged rows skew the mean.",
        "Partitioning by the surrogate Id (always unique) so no duplicate is ever removed."
      ]
    },

    {
      id: "cte2-latest-ticket-status",
      number: "DL 10530",
      platform: "DataLemur",
      title: "Latest Status per Support Ticket",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Ranking", "Joins"],
      domains: ["Customer Support Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Top-1 latest per group", sqlConcept: "ROW_NUMBER CTE + join", technique: "Newest row per entity, joined to a parent" },
      descriptionBrief:
        "Given **Tickets(Id, Subject)** and an event log **TicketEvents(Id, TicketId, Status, ChangedAt)**, " +
        "return each ticket's **current status** — the status from its **most recent** event — alongside " +
        "the ticket subject and the change timestamp.",
      schema: [
        { name: "Tickets", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Subject", type: "VARCHAR(50)" } ] },
        { name: "TicketEvents", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "TicketId", type: "INT", note: "FK → Tickets.Id" },
          { name: "Status", type: "VARCHAR(20)" },
          { name: "ChangedAt", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.TicketEvents','U') IS NOT NULL DROP TABLE dbo.TicketEvents;\n" +
        "IF OBJECT_ID('dbo.Tickets','U') IS NOT NULL DROP TABLE dbo.Tickets;\n" +
        "CREATE TABLE dbo.Tickets (Id INT PRIMARY KEY, Subject VARCHAR(50));\n" +
        "CREATE TABLE dbo.TicketEvents (Id INT PRIMARY KEY, TicketId INT, Status VARCHAR(20), ChangedAt DATE);\n" +
        "INSERT INTO dbo.Tickets VALUES\n" +
        "  (1,'Login fails'),(2,'Payment error'),(3,'Slow page');\n" +
        "INSERT INTO dbo.TicketEvents VALUES\n" +
        "  (1,1,'Open','2026-02-01'),(2,1,'Pending','2026-02-03'),(3,1,'Closed','2026-02-05'),\n" +
        "  (4,2,'Open','2026-02-02'),(5,2,'Pending','2026-02-04'),\n" +
        "  (6,3,'Open','2026-02-01');",
      sampleData: [
        { table: "Tickets", columns: ["Id","Subject"], rows: [[1,"Login fails"],[2,"Payment error"],[3,"Slow page"]] },
        { table: "TicketEvents", columns: ["Id","TicketId","Status","ChangedAt"],
          rows: [[1,1,"Open","2026-02-01"],[2,1,"Pending","2026-02-03"],[3,1,"Closed","2026-02-05"],[4,2,"Open","2026-02-02"],[5,2,"Pending","2026-02-04"],[6,3,"Open","2026-02-01"]] }
      ],
      expectedOutput: { columns: ["Subject","Status","ChangedAt"],
        rows: [["Login fails","Closed","2026-02-05"],["Payment error","Pending","2026-02-04"],["Slow page","Open","2026-02-01"]] },
      approaches: [
        {
          name: "ROW_NUMBER latest-per-ticket CTE, then join (recommended)",
          perfNote: "One partitioned window pass finds each ticket's newest event; a single join to Tickets attaches the subject. No correlated subquery per ticket.",
          dialectNote: "",
          logic:
            "**What it asks.** The single most recent status of every ticket, with its subject and change date.\n\n" +
            "**Why the naive idea fails.** `MAX(ChangedAt)` per ticket gives the latest *date* but not the *Status on that date* — you still need the matching row, and a self-join back on `(TicketId, MAX date)` is verbose and breaks if two events share a timestamp.\n\n" +
            "**Key Idea.** Number events within each ticket by `ChangedAt DESC` using `ROW_NUMBER()`; the rn = 1 row is that ticket's current state. Then join to `Tickets` for the subject.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Latest`: `ROW_NUMBER() OVER (PARTITION BY TicketId ORDER BY ChangedAt DESC, Id DESC)`.\n" +
            "2. Keep `rn = 1` — the newest event per ticket.\n" +
            "3. Join to `Tickets` on `TicketId = Id`.\n" +
            "4. Project subject, status, and timestamp; order by ticket.\n\n" +
            "**Why it works.** ROW_NUMBER carries the whole row along with the ordering, so the status and date arrive together — no second lookup to recover the value on the max date.\n\n" +
            "**Common Gotchas.** Add a deterministic tie-break (`Id DESC`) so same-day events pick a definite winner. Filter rn = 1 *before* or in the outer query, never inside `WHERE` of the CTE's own SELECT.\n\n" +
            "**Performance.** One window sort on `(TicketId, ChangedAt DESC)` then a keyed join to the small parent; an index on `TicketEvents(TicketId, ChangedAt)` supports it.\n\n" +
            "**Interview mindset.** 'Latest/current row per entity' → ROW_NUMBER partitioned, ORDER BY time DESC, keep rn = 1.",
          tsql:
            "WITH Latest AS (\n" +
            "    SELECT TicketId, Status, ChangedAt,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY TicketId\n" +
            "                              ORDER BY ChangedAt DESC, Id DESC) AS rn  -- newest first\n" +
            "    FROM dbo.TicketEvents\n" +
            ")\n" +
            "SELECT t.Subject, l.Status, l.ChangedAt\n" +
            "FROM Latest l\n" +
            "JOIN dbo.Tickets t ON t.Id = l.TicketId\n" +
            "WHERE l.rn = 1               -- current status only\n" +
            "ORDER BY t.Id;",
          clean:
            "WITH Latest AS (\n" +
            "    SELECT TicketId, Status, ChangedAt,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY TicketId ORDER BY ChangedAt DESC, Id DESC) AS rn\n" +
            "    FROM dbo.TicketEvents\n" +
            ")\n" +
            "SELECT t.Subject, l.Status, l.ChangedAt\n" +
            "FROM Latest l\n" +
            "JOIN dbo.Tickets t ON t.Id = l.TicketId\n" +
            "WHERE l.rn = 1\n" +
            "ORDER BY t.Id;"
        },
        {
          name: "CROSS APPLY TOP (1) per ticket",
          perfNote: "For each ticket, ask a correlated TOP (1) latest event. Index-friendly: a seek per ticket that stops after one row. Strong when many events per ticket.",
          dialectNote: "`CROSS APPLY` is SQL Server's lateral join; the inner `TOP (1) ... ORDER BY` runs once per outer ticket.",
          logic:
            "**Key Idea.** Drive from `Tickets` and, via `CROSS APPLY`, fetch each ticket's single newest event.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Tickets t`.\n" +
            "2. `CROSS APPLY (SELECT TOP (1) Status, ChangedAt FROM TicketEvents e WHERE e.TicketId = t.Id ORDER BY e.ChangedAt DESC, e.Id DESC) l`.\n" +
            "3. Project `t.Subject`, `l.Status`, `l.ChangedAt`.\n\n" +
            "**Why it works.** APPLY evaluates the inner query per ticket and `TOP (1)` with the ORDER BY returns exactly that ticket's current event.\n\n" +
            "**Common Gotchas.** Use `CROSS APPLY` only if every ticket has at least one event; otherwise `OUTER APPLY` keeps ticketless-... eventless tickets with NULLs. The inner ORDER BY is mandatory.\n\n" +
            "**Performance.** With an index on `TicketEvents(TicketId, ChangedAt DESC)` each APPLY is a one-row seek — often beats a full window sort.\n\n" +
            "**Interview mindset.** A clean 'no window function' alternative that shows you know lateral joins for latest-per-group.",
          tsql:
            "SELECT t.Subject, l.Status, l.ChangedAt\n" +
            "FROM dbo.Tickets t\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (1) e.Status, e.ChangedAt\n" +
            "    FROM dbo.TicketEvents e\n" +
            "    WHERE e.TicketId = t.Id\n" +
            "    ORDER BY e.ChangedAt DESC, e.Id DESC\n" +
            ") l\n" +
            "ORDER BY t.Id;",
          clean:
            "SELECT t.Subject, l.Status, l.ChangedAt\n" +
            "FROM dbo.Tickets t\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (1) e.Status, e.ChangedAt\n" +
            "    FROM dbo.TicketEvents e\n" +
            "    WHERE e.TicketId = t.Id\n" +
            "    ORDER BY e.ChangedAt DESC, e.Id DESC\n" +
            ") l\n" +
            "ORDER BY t.Id;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER per ticket, newest first", note: "Ticket 1: Closed(1), Pending(2), Open(3). Ticket 2: Pending(1), Open(2). Ticket 3: Open(1).",
          table: { columns: ["TicketId","Status","ChangedAt","rn"],
            rows: [[1,"Closed","2026-02-05",1],[1,"Pending","2026-02-03",2],[1,"Open","2026-02-01",3],[2,"Pending","2026-02-04",1],[2,"Open","2026-02-02",2],[3,"Open","2026-02-01",1]] } },
        { step: "Keep rn = 1, join subject", note: "Each ticket keeps only its current status.",
          table: { columns: ["Subject","Status","ChangedAt"],
            rows: [["Login fails","Closed","2026-02-05"],["Payment error","Pending","2026-02-04"],["Slow page","Open","2026-02-01"]] } }
      ],
      patternRecognition: [
        "'Current / latest row per entity' → ROW_NUMBER partitioned by entity, ORDER BY time DESC, keep rn = 1.",
        "Need the whole row (status + date), not just MAX(date) → carry it with ROW_NUMBER or TOP (1) APPLY."
      ],
      interviewRecall: [
        "MAX(date) alone loses the other columns of the winning row; ROW_NUMBER keeps the full row.",
        "Add a tie-break (Id DESC) so same-timestamp events resolve deterministically."
      ],
      commonMistakes: [
        "Joining on MAX(ChangedAt) and getting two rows when a ticket has two same-day events.",
        "Filtering rn = 1 inside the CTE's own WHERE (window functions can't be filtered there)."
      ]
    },

    {
      id: "cte2-repeat-purchase-rate",
      number: "SS 10744",
      platform: "StrataScratch",
      title: "Repeat Purchase Rate",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Aggregation & Grouping"],
      domains: ["E-commerce Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Ratio across chained CTEs", sqlConcept: "Per-entity count CTE → conditional aggregate", technique: "Count per customer, then a share over customers" },
      descriptionBrief:
        "Given **Orders(Id, CustomerId)**, compute the **repeat purchase rate**: the fraction of " +
        "customers who placed **two or more** orders, out of all customers, rounded to two decimals.",
      schema: [
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1),(2,1),(3,1),\n" +
        "  (4,2),\n" +
        "  (5,3),(6,3),\n" +
        "  (7,4),\n" +
        "  (8,5);",
      sampleData: [
        { table: "Orders", columns: ["Id","CustomerId"],
          rows: [[1,1],[2,1],[3,1],[4,2],[5,3],[6,3],[7,4],[8,5]] }
      ],
      expectedOutput: { columns: ["TotalCustomers","RepeatCustomers","RepeatRate"],
        rows: [[5,2,"0.40"]] },
      approaches: [
        {
          name: "Count-per-customer CTE, then a share (recommended)",
          perfNote: "First CTE reduces orders to one row per customer with an order count; the outer query is a single pass computing two counts and their ratio. No self-join.",
          dialectNote: "Integer division truncates, so multiply by `1.0` before dividing.",
          logic:
            "**What it asks.** Of all distinct customers, what share ordered more than once.\n\n" +
            "**Why the naive idea fails.** Counting order rows (`COUNT(*)`) mixes up orders with customers — a customer with three orders would count three times. You must collapse to one row per customer *first*.\n\n" +
            "**Key Idea.** Chain two stages: CTE #1 counts orders per customer; the outer stage counts customers total and counts those with `Orders >= 2`, then divides.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `PerCustomer`: `GROUP BY CustomerId`, `COUNT(*) AS Orders`.\n" +
            "2. Outer query: `COUNT(*)` = total customers.\n" +
            "3. `SUM(CASE WHEN Orders >= 2 THEN 1 ELSE 0 END)` = repeat customers.\n" +
            "4. Divide repeat by total (with `* 1.0`), cast to `DECIMAL(5,2)`.\n\n" +
            "**Why it works.** Aggregating to one row per customer makes the outer counts count *customers*, so the ratio is customers-over-customers — exactly the repeat rate.\n\n" +
            "**Common Gotchas.** Force decimal division with `* 1.0` or the rate truncates to 0. A conditional `SUM(CASE ...)` is the tidy way to count a subset alongside the total in one pass.\n\n" +
            "**Performance.** One grouped scan for the CTE, one aggregate over the small per-customer set.\n\n" +
            "**Interview mindset.** 'Share of entities meeting a threshold' → reduce to one row per entity in a CTE, then COUNT total and conditionally-SUM the qualifiers, and divide.",
          tsql:
            "WITH PerCustomer AS (\n" +
            "    SELECT CustomerId, COUNT(*) AS Orders\n" +
            "    FROM dbo.Orders\n" +
            "    GROUP BY CustomerId\n" +
            ")\n" +
            "SELECT COUNT(*) AS TotalCustomers,\n" +
            "       SUM(CASE WHEN Orders >= 2 THEN 1 ELSE 0 END) AS RepeatCustomers,\n" +
            "       CAST(SUM(CASE WHEN Orders >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)\n" +
            "            AS DECIMAL(5,2)) AS RepeatRate\n" +
            "FROM PerCustomer;",
          clean:
            "WITH PerCustomer AS (\n" +
            "    SELECT CustomerId, COUNT(*) AS Orders\n" +
            "    FROM dbo.Orders\n" +
            "    GROUP BY CustomerId\n" +
            ")\n" +
            "SELECT COUNT(*) AS TotalCustomers,\n" +
            "       SUM(CASE WHEN Orders >= 2 THEN 1 ELSE 0 END) AS RepeatCustomers,\n" +
            "       CAST(SUM(CASE WHEN Orders >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS DECIMAL(5,2)) AS RepeatRate\n" +
            "FROM PerCustomer;"
        }
      ],
      walkthrough: [
        { step: "CTE PerCustomer: orders per customer", note: "Cust 1 → 3, Cust 2 → 1, Cust 3 → 2, Cust 4 → 1, Cust 5 → 1.",
          table: { columns: ["CustomerId","Orders"], rows: [[1,3],[2,1],[3,2],[4,1],[5,1]] } },
        { step: "Total customers, repeat (>=2), and rate", note: "5 customers, 2 repeat (1 and 3); 2/5 = 0.40.",
          table: { columns: ["TotalCustomers","RepeatCustomers","RepeatRate"], rows: [[5,2,"0.40"]] } }
      ],
      patternRecognition: [
        "'Share of entities that did X two-or-more times' → count per entity in a CTE, then total vs conditional-SUM, divide.",
        "Conditional counting alongside a total → `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`."
      ],
      interviewRecall: [
        "Collapse to one row per entity before counting entities, or you count events by mistake.",
        "Multiply by 1.0 to escape integer division in T-SQL."
      ],
      commonMistakes: [
        "Using COUNT(*) on raw orders and calling it 'customers'.",
        "Integer division returning 0 because both operands stayed INT."
      ]
    },

    {
      id: "cte2-student-total-credits",
      number: "HR 10861",
      platform: "HackerRank",
      title: "Total Credits per Student Across Courses",
      difficulty: "Medium",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Joins", "Aggregation & Grouping"],
      domains: ["Education Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Join 3 tables through a CTE", sqlConcept: "Three-table join CTE + SUM", technique: "Resolve a many-to-many via the bridge, then aggregate" },
      descriptionBrief:
        "Given **Students(Id, Name)**, **Courses(Id, Title, Credits)**, and a bridge " +
        "**Enrollments(Id, StudentId, CourseId)**, return each student's **total enrolled credits** by " +
        "joining all three tables through a CTE and summing the credits of the courses they take.",
      schema: [
        { name: "Students", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Courses", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Title", type: "VARCHAR(50)" },
          { name: "Credits", type: "INT" } ] },
        { name: "Enrollments", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "StudentId", type: "INT", note: "FK → Students.Id" },
          { name: "CourseId", type: "INT", note: "FK → Courses.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Enrollments','U') IS NOT NULL DROP TABLE dbo.Enrollments;\n" +
        "IF OBJECT_ID('dbo.Courses','U') IS NOT NULL DROP TABLE dbo.Courses;\n" +
        "IF OBJECT_ID('dbo.Students','U') IS NOT NULL DROP TABLE dbo.Students;\n" +
        "CREATE TABLE dbo.Students (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Courses (Id INT PRIMARY KEY, Title VARCHAR(50), Credits INT);\n" +
        "CREATE TABLE dbo.Enrollments (Id INT PRIMARY KEY, StudentId INT, CourseId INT);\n" +
        "INSERT INTO dbo.Students VALUES\n" +
        "  (1,'Ana'),(2,'Ben'),(3,'Cara');\n" +
        "INSERT INTO dbo.Courses VALUES\n" +
        "  (10,'Math',4),(11,'History',3),(12,'Art',2);\n" +
        "INSERT INTO dbo.Enrollments VALUES\n" +
        "  (1,1,10),(2,1,11),\n" +
        "  (3,2,10),(4,2,12),\n" +
        "  (5,3,11);",
      sampleData: [
        { table: "Students", columns: ["Id","Name"], rows: [[1,"Ana"],[2,"Ben"],[3,"Cara"]] },
        { table: "Courses", columns: ["Id","Title","Credits"], rows: [[10,"Math",4],[11,"History",3],[12,"Art",2]] },
        { table: "Enrollments", columns: ["Id","StudentId","CourseId"],
          rows: [[1,1,10],[2,1,11],[3,2,10],[4,2,12],[5,3,11]] }
      ],
      expectedOutput: { columns: ["Name","TotalCredits"], rows: [["Ana",7],["Ben",6],["Cara",3]] },
      approaches: [
        {
          name: "Bridge-join CTE, then SUM per student (recommended)",
          perfNote: "One CTE resolves the many-to-many by joining the bridge to both sides; the outer query sums credits per student. Two lean passes, keyed on the PKs.",
          dialectNote: "",
          logic:
            "**What it asks.** Each student's total credits, where credits live on `Courses`, students on `Students`, and the link between them on `Enrollments`.\n\n" +
            "**Why the naive idea fails.** Credits and student names are in different tables with no direct relationship — only the `Enrollments` bridge connects them. You cannot sum credits per student without first walking all three tables.\n\n" +
            "**Key Idea.** In a CTE, join `Enrollments` to `Students` (for the name) and to `Courses` (for the credits), producing one row per enrollment carrying both; then `GROUP BY` student and `SUM(Credits)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Enr`: `Enrollments e JOIN Students s ON s.Id = e.StudentId JOIN Courses c ON c.Id = e.CourseId`, selecting `s.Name`, `c.Credits`.\n" +
            "2. Outer query: `GROUP BY Name`, `SUM(Credits) AS TotalCredits`.\n" +
            "3. Order by name.\n\n" +
            "**Why it works.** The bridge table's two foreign keys let one join hop to the student and another to the course, so each enrollment row is complete; summing per student then totals their credits.\n\n" +
            "**Common Gotchas.** Group by the student key (or Name here, unique in the sample), not by course. If a student can have zero enrollments and must still appear, start from `Students` with LEFT joins and `ISNULL(SUM(Credits),0)`.\n\n" +
            "**Performance.** Two keyed joins on primary keys then a grouped aggregate; PK indexes already support the joins.\n\n" +
            "**Interview mindset.** 'Two tables linked only through a bridge' → join the bridge to both sides in a CTE, then aggregate.",
          tsql:
            "WITH Enr AS (\n" +
            "    SELECT s.Name, c.Credits\n" +
            "    FROM dbo.Enrollments e\n" +
            "    JOIN dbo.Students s ON s.Id = e.StudentId   -- hop to the student\n" +
            "    JOIN dbo.Courses  c ON c.Id = e.CourseId    -- hop to the course\n" +
            ")\n" +
            "SELECT Name, SUM(Credits) AS TotalCredits\n" +
            "FROM Enr\n" +
            "GROUP BY Name\n" +
            "ORDER BY Name;",
          clean:
            "WITH Enr AS (\n" +
            "    SELECT s.Name, c.Credits\n" +
            "    FROM dbo.Enrollments e\n" +
            "    JOIN dbo.Students s ON s.Id = e.StudentId\n" +
            "    JOIN dbo.Courses  c ON c.Id = e.CourseId\n" +
            ")\n" +
            "SELECT Name, SUM(Credits) AS TotalCredits\n" +
            "FROM Enr\n" +
            "GROUP BY Name\n" +
            "ORDER BY Name;"
        }
      ],
      walkthrough: [
        { step: "CTE Enr: one row per enrollment with name + credits", note: "Ana→Math(4), Ana→History(3), Ben→Math(4), Ben→Art(2), Cara→History(3).",
          table: { columns: ["Name","Credits"], rows: [["Ana",4],["Ana",3],["Ben",4],["Ben",2],["Cara",3]] } },
        { step: "SUM credits per student", note: "Ana 4+3=7, Ben 4+2=6, Cara 3.",
          table: { columns: ["Name","TotalCredits"], rows: [["Ana",7],["Ben",6],["Cara",3]] } }
      ],
      patternRecognition: [
        "'Aggregate a value across a many-to-many relationship' → join the bridge to both sides, then GROUP BY the entity.",
        "Bridge/junction table = two foreign keys; join out to each parent to assemble the full row."
      ],
      interviewRecall: [
        "A many-to-many is resolved by its bridge table's two FKs; join through it, don't join the parents directly.",
        "Keep everyone (even the un-enrolled) with LEFT joins and ISNULL(SUM,0)."
      ],
      commonMistakes: [
        "Trying to join Students directly to Courses with no shared key.",
        "Grouping by the wrong key and summing across the wrong dimension."
      ]
    },

    {
      id: "cte2-next-month-retention",
      number: "DL 10975",
      platform: "DataLemur",
      title: "Next-Month Cohort Retention",
      difficulty: "Hard",
      category: "CTE & Complex Joins",
      topics: ["CTE & Complex Joins", "Aggregation & Grouping", "Joins"],
      domains: ["SaaS Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Cohort retention via CTEs", sqlConcept: "Multi-CTE + EXISTS + conditional aggregate", technique: "Flag next-month activity, then a per-cohort rate" },
      descriptionBrief:
        "Given **Users(Id, SignupMonth)** and **Activity(Id, UserId, ActivityMonth)** (months are integers), " +
        "compute each **signup cohort's next-month retention**: the share of a cohort's users who had any " +
        "activity in the month **immediately after** they signed up. Round the rate to two decimals.",
      schema: [
        { name: "Users", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "SignupMonth", type: "INT", note: "1..12" } ] },
        { name: "Activity", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "UserId", type: "INT", note: "FK → Users.Id" },
          { name: "ActivityMonth", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Activity','U') IS NOT NULL DROP TABLE dbo.Activity;\n" +
        "IF OBJECT_ID('dbo.Users','U') IS NOT NULL DROP TABLE dbo.Users;\n" +
        "CREATE TABLE dbo.Users (Id INT PRIMARY KEY, SignupMonth INT);\n" +
        "CREATE TABLE dbo.Activity (Id INT PRIMARY KEY, UserId INT, ActivityMonth INT);\n" +
        "INSERT INTO dbo.Users VALUES\n" +
        "  (1,1),(2,1),(3,1),(4,2),(5,2);\n" +
        "INSERT INTO dbo.Activity VALUES\n" +
        "  (1,1,2),(2,2,2),(3,3,3),(4,4,3),(5,5,2);",
      sampleData: [
        { table: "Users", columns: ["Id","SignupMonth"], rows: [[1,1],[2,1],[3,1],[4,2],[5,2]] },
        { table: "Activity", columns: ["Id","UserId","ActivityMonth"],
          rows: [[1,1,2],[2,2,2],[3,3,3],[4,4,3],[5,5,2]] }
      ],
      expectedOutput: { columns: ["SignupMonth","CohortSize","Retained","RetentionRate"],
        rows: [[1,3,2,"0.67"],[2,2,1,"0.50"]] },
      approaches: [
        {
          name: "Flag next-month activity, then per-cohort rate (recommended)",
          perfNote: "One CTE labels each user retained/not via EXISTS on the next month; the outer query rolls that up per cohort with a conditional SUM over COUNT. No fan-out.",
          dialectNote: "",
          logic:
            "**What it asks.** For each signup month, the fraction of that month's users who were active in the very next month.\n\n" +
            "**Why the naive idea fails.** Joining `Users` to `Activity` and counting rows double-counts users who were active several times, and it silently drops users who never returned — both corrupt the cohort size and the retained count. You must decide retention *per user* first, keeping every user.\n\n" +
            "**Key Idea.** Build a per-user CTE that carries `SignupMonth` and a 0/1 `Retained` flag set by `EXISTS (activity in SignupMonth + 1)`; then group by `SignupMonth`, count users for the cohort size and SUM the flag for the retained count, and divide.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `Flagged`: for each user, `CASE WHEN EXISTS (SELECT 1 FROM Activity a WHERE a.UserId = u.Id AND a.ActivityMonth = u.SignupMonth + 1) THEN 1 ELSE 0 END AS Retained`.\n" +
            "2. Outer query: `GROUP BY SignupMonth`.\n" +
            "3. `COUNT(*)` = cohort size; `SUM(Retained)` = retained users.\n" +
            "4. `SUM(Retained) * 1.0 / COUNT(*)`, cast to `DECIMAL(5,2)`; order by month.\n\n" +
            "**Why it works.** `EXISTS` gives a per-user yes/no without multiplying rows, so every user contributes exactly one to the cohort size and either 0 or 1 to the retained count — the rate is honest.\n\n" +
            "**Common Gotchas.** Use `EXISTS` (or a pre-aggregated join), never a raw join, or repeat activity inflates counts. 'Next month' is `SignupMonth + 1`; be careful with year boundaries in real data (here months are plain integers). Force decimal division with `* 1.0`.\n\n" +
            "**Performance.** One semi-join (EXISTS) per user then a grouped aggregate; an index on `Activity(UserId, ActivityMonth)` makes the EXISTS a seek.\n\n" +
            "**Interview mindset.** 'Retention / cohort rate' → flag each member's return with EXISTS in a CTE, then COUNT and conditional-SUM per cohort.",
          tsql:
            "WITH Flagged AS (\n" +
            "    SELECT u.SignupMonth,\n" +
            "           CASE WHEN EXISTS (\n" +
            "                    SELECT 1 FROM dbo.Activity a\n" +
            "                    WHERE a.UserId = u.Id\n" +
            "                      AND a.ActivityMonth = u.SignupMonth + 1  -- the next month\n" +
            "                ) THEN 1 ELSE 0 END AS Retained\n" +
            "    FROM dbo.Users u\n" +
            ")\n" +
            "SELECT SignupMonth,\n" +
            "       COUNT(*) AS CohortSize,\n" +
            "       SUM(Retained) AS Retained,\n" +
            "       CAST(SUM(Retained) * 1.0 / COUNT(*) AS DECIMAL(5,2)) AS RetentionRate\n" +
            "FROM Flagged\n" +
            "GROUP BY SignupMonth\n" +
            "ORDER BY SignupMonth;",
          clean:
            "WITH Flagged AS (\n" +
            "    SELECT u.SignupMonth,\n" +
            "           CASE WHEN EXISTS (\n" +
            "                    SELECT 1 FROM dbo.Activity a\n" +
            "                    WHERE a.UserId = u.Id AND a.ActivityMonth = u.SignupMonth + 1\n" +
            "                ) THEN 1 ELSE 0 END AS Retained\n" +
            "    FROM dbo.Users u\n" +
            ")\n" +
            "SELECT SignupMonth, COUNT(*) AS CohortSize, SUM(Retained) AS Retained,\n" +
            "       CAST(SUM(Retained) * 1.0 / COUNT(*) AS DECIMAL(5,2)) AS RetentionRate\n" +
            "FROM Flagged\n" +
            "GROUP BY SignupMonth\n" +
            "ORDER BY SignupMonth;"
        },
        {
          name: "Pre-aggregate next-month activity, then LEFT join",
          perfNote: "Reduce activity to distinct (UserId, ActivityMonth) pairs in a CTE, LEFT join users to their next-month row, and count matches. Set-based alternative to EXISTS.",
          dialectNote: "",
          logic:
            "**Key Idea.** Collapse activity to distinct user-month pairs, then LEFT join each user to the pair at `SignupMonth + 1`; a non-NULL match means retained.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. CTE `ActMonths`: `SELECT DISTINCT UserId, ActivityMonth FROM Activity`.\n" +
            "2. LEFT join `Users u` to `ActMonths a` on `a.UserId = u.Id AND a.ActivityMonth = u.SignupMonth + 1`.\n" +
            "3. `GROUP BY SignupMonth`: `COUNT(*)` cohort size; `COUNT(a.UserId)` retained (NULLs from unmatched users don't count).\n" +
            "4. Divide with `* 1.0`, cast to `DECIMAL(5,2)`.\n\n" +
            "**Why it works.** DISTINCT removes repeat activity so the LEFT join matches at most one next-month row per user; `COUNT(a.UserId)` counts only the matched (retained) users while `COUNT(*)` keeps everyone.\n\n" +
            "**Common Gotchas.** Must LEFT join (not INNER) or non-returning users vanish and the cohort size is wrong. DISTINCT the activity or a user with two next-month rows double-counts.\n\n" +
            "**Performance.** One distinct aggregation then a keyed LEFT join; comparable to the EXISTS plan.\n\n" +
            "**Interview mindset.** COUNT(a.key) over a LEFT join is the classic 'count only the matched side while keeping all rows' trick.",
          tsql:
            "WITH ActMonths AS (\n" +
            "    SELECT DISTINCT UserId, ActivityMonth\n" +
            "    FROM dbo.Activity\n" +
            ")\n" +
            "SELECT u.SignupMonth,\n" +
            "       COUNT(*) AS CohortSize,\n" +
            "       COUNT(a.UserId) AS Retained,\n" +
            "       CAST(COUNT(a.UserId) * 1.0 / COUNT(*) AS DECIMAL(5,2)) AS RetentionRate\n" +
            "FROM dbo.Users u\n" +
            "LEFT JOIN ActMonths a\n" +
            "       ON a.UserId = u.Id\n" +
            "      AND a.ActivityMonth = u.SignupMonth + 1\n" +
            "GROUP BY u.SignupMonth\n" +
            "ORDER BY u.SignupMonth;",
          clean:
            "WITH ActMonths AS (\n" +
            "    SELECT DISTINCT UserId, ActivityMonth\n" +
            "    FROM dbo.Activity\n" +
            ")\n" +
            "SELECT u.SignupMonth, COUNT(*) AS CohortSize, COUNT(a.UserId) AS Retained,\n" +
            "       CAST(COUNT(a.UserId) * 1.0 / COUNT(*) AS DECIMAL(5,2)) AS RetentionRate\n" +
            "FROM dbo.Users u\n" +
            "LEFT JOIN ActMonths a ON a.UserId = u.Id AND a.ActivityMonth = u.SignupMonth + 1\n" +
            "GROUP BY u.SignupMonth\n" +
            "ORDER BY u.SignupMonth;"
        }
      ],
      walkthrough: [
        { step: "Flag each user retained (active in SignupMonth + 1)", note: "U1 signup1 active2→1; U2 signup1 active2→1; U3 signup1 active3→0; U4 signup2 active3→1; U5 signup2 active2→0.",
          table: { columns: ["UserId","SignupMonth","Retained"], rows: [[1,1,1],[2,1,1],[3,1,0],[4,2,1],[5,2,0]] } },
        { step: "Per cohort: size, retained, rate", note: "Cohort 1: 3 users, 2 retained → 2/3 = 0.67. Cohort 2: 2 users, 1 retained → 0.50.",
          table: { columns: ["SignupMonth","CohortSize","Retained","RetentionRate"],
            rows: [[1,3,2,"0.67"],[2,2,1,"0.50"]] } }
      ],
      patternRecognition: [
        "'Cohort retention / did X in the following period' → flag each member with EXISTS in a CTE, then COUNT and SUM(flag) per cohort.",
        "Keep non-returning members in the denominator → EXISTS flag or LEFT join, never an INNER join to activity."
      ],
      interviewRecall: [
        "EXISTS gives a per-row yes/no without fan-out; a raw join would multiply repeat activity.",
        "COUNT(matched_key) over a LEFT join counts only matched rows while COUNT(*) keeps all."
      ],
      commonMistakes: [
        "Inner-joining users to activity, dropping non-returning users and shrinking the cohort size.",
        "Counting activity rows instead of users, so heavy users inflate the retained count."
      ]
    }

  ]);
})();
