/*
 * data/ranking2.js — Ranking topic, additional problem set (batch 2).
 * Eight further ranking problems for the SQL Study Lab, matching the exemplar
 * schema in data/ranking.js. All T-SQL targets SQL Server 2019/2022 and runs
 * as-is in SSMS 19/21. Every id is prefixed with "rank2-".
 */
(function () {
  window.SQLLAB.register("Ranking", [

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-latest-txn-per-account",
      number: "SS 9711",
      platform: "StrataScratch",
      title: "Latest Transaction per Account",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Banking Analytics"],
      link: "https://platform.stratascratch.com/coding/9711-latest-transaction-per-account",
      meta: { pattern: "Latest record per key", sqlConcept: "ROW_NUMBER partitioned", technique: "Per-key most-recent filter" },
      descriptionBrief:
        "Given a **Transactions** table (`AccountId`, `TxnDate`, `Amount`), return the **single most " +
        "recent transaction for each account**. If two transactions share the same date, break the " +
        "tie by the larger `TxnId` so exactly one row survives per account.",
      schema: [
        { name: "Transactions", columns: [
          { name: "TxnId", type: "INT", note: "PK" },
          { name: "AccountId", type: "INT" },
          { name: "TxnDate", type: "DATE" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Transactions','U') IS NOT NULL DROP TABLE dbo.Transactions;\n" +
        "CREATE TABLE dbo.Transactions (TxnId INT PRIMARY KEY, AccountId INT, TxnDate DATE, Amount INT);\n" +
        "INSERT INTO dbo.Transactions VALUES\n" +
        "  (1,1,'2024-01-05',100),(2,1,'2024-03-10',250),(3,1,'2024-02-01',75),\n" +
        "  (4,2,'2024-05-20',500),(5,2,'2024-05-22',300),\n" +
        "  (6,3,'2024-01-01',40);",
      sampleData: [
        { table: "Transactions", columns: ["TxnId","AccountId","TxnDate","Amount"],
          rows: [[1,1,"2024-01-05",100],[2,1,"2024-03-10",250],[3,1,"2024-02-01",75],[4,2,"2024-05-20",500],[5,2,"2024-05-22",300],[6,3,"2024-01-01",40]] }
      ],
      expectedOutput: { columns: ["AccountId","TxnId","TxnDate","Amount"],
        rows: [[1,2,"2024-03-10",250],[2,5,"2024-05-22",300],[3,6,"2024-01-01",40]] },
      approaches: [
        {
          name: "ROW_NUMBER partitioned (recommended)",
          perfNote: "One partitioned sort per account; ROW_NUMBER = 1 pinpoints the newest row deterministically. The canonical latest-per-key pattern.",
          dialectNote: "",
          logic:
            "**What it asks.** The newest transaction for every account, exactly one row each.\n\n" +
            "**Why the naive idea fails.** Joining on `MAX(TxnDate) per account` returns two rows when an account has two transactions on the same day, and it needs a second correlation on Amount/TxnId to disambiguate — verbose and tie-fragile.\n\n" +
            "**Key Idea.** `ROW_NUMBER() OVER (PARTITION BY AccountId ORDER BY TxnDate DESC, TxnId DESC)` numbers each account's rows newest-first; the row numbered 1 is the latest.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned ROW_NUMBER with a deterministic tie-break on `TxnId DESC`.\n" +
            "2. Filter to `rn = 1`.\n" +
            "3. Project the account, txn, date, and amount; order by account.\n\n" +
            "**Why it works.** ROW_NUMBER never repeats inside a partition, so `rn = 1` is unambiguous even when dates tie — the tie-break column decides.\n\n" +
            "**Common Gotchas.** You cannot filter a window function in `WHERE` directly — wrap it in a CTE/derived table. Without the `TxnId` tie-break, a same-day tie makes the winner nondeterministic.\n\n" +
            "**Performance.** A segment + sort per partition, O(n log n); an index on `(AccountId, TxnDate DESC, TxnId DESC)` supplies the window order.\n\n" +
            "**Interview mindset.** 'Latest / most-recent per key' → ROW_NUMBER = 1 partitioned by the key, ordered by the timestamp DESC.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT AccountId, TxnId, TxnDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY AccountId               -- restart per account\n" +
            "                              ORDER BY TxnDate DESC, TxnId DESC) AS rn  -- newest first\n" +
            "    FROM dbo.Transactions\n" +
            ")\n" +
            "SELECT AccountId, TxnId, TxnDate, Amount\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1                 -- keep only the most recent per account\n" +
            "ORDER BY AccountId;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT AccountId, TxnId, TxnDate, Amount,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY AccountId ORDER BY TxnDate DESC, TxnId DESC) AS rn\n" +
            "    FROM dbo.Transactions\n" +
            ")\n" +
            "SELECT AccountId, TxnId, TxnDate, Amount\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1\n" +
            "ORDER BY AccountId;"
        },
        {
          name: "CROSS APPLY TOP 1",
          perfNote: "Correlated TOP 1 per distinct account; with a supporting index each APPLY is a short seek that stops after one row. Great when few accounts have many transactions.",
          dialectNote: "`CROSS APPLY` is SQL Server's lateral join; `TOP (1) ... ORDER BY` picks per outer row.",
          logic:
            "**Key Idea.** For each distinct account, ask a correlated `TOP (1)` subquery for its newest transaction via `CROSS APPLY`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Derive the distinct account list.\n" +
            "2. `CROSS APPLY` a `SELECT TOP (1) ... WHERE AccountId = a.AccountId ORDER BY TxnDate DESC, TxnId DESC`.\n" +
            "3. Project the joined columns and order by account.\n\n" +
            "**Why it works.** APPLY runs the inner query once per account and TOP (1) caps each run at the single newest row.\n\n" +
            "**Common Gotchas.** The inner TOP needs its own `ORDER BY`; the correlation predicate on `AccountId` is mandatory or every APPLY returns the global newest.\n\n" +
            "**Performance.** With an index on `(AccountId, TxnDate DESC, TxnId DESC)` each APPLY is a one-row seek — often beats a full window sort.\n\n" +
            "**Interview mindset.** The index-friendly alternative to a window when you want the engine to stop after one row per key.",
          tsql:
            "SELECT t.AccountId, t.TxnId, t.TxnDate, t.Amount\n" +
            "FROM (SELECT DISTINCT AccountId FROM dbo.Transactions) a\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (1) x.AccountId, x.TxnId, x.TxnDate, x.Amount\n" +
            "    FROM dbo.Transactions x\n" +
            "    WHERE x.AccountId = a.AccountId\n" +
            "    ORDER BY x.TxnDate DESC, x.TxnId DESC\n" +
            ") t\n" +
            "ORDER BY t.AccountId;",
          clean:
            "SELECT t.AccountId, t.TxnId, t.TxnDate, t.Amount\n" +
            "FROM (SELECT DISTINCT AccountId FROM dbo.Transactions) a\n" +
            "CROSS APPLY (\n" +
            "    SELECT TOP (1) x.AccountId, x.TxnId, x.TxnDate, x.Amount\n" +
            "    FROM dbo.Transactions x\n" +
            "    WHERE x.AccountId = a.AccountId\n" +
            "    ORDER BY x.TxnDate DESC, x.TxnId DESC\n" +
            ") t\n" +
            "ORDER BY t.AccountId;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER newest-first per account", note: "Account 1: 2024-03-10 is rn 1; account 2: 2024-05-22 is rn 1; account 3 has one row.",
          table: { columns: ["AccountId","TxnId","TxnDate","rn"],
            rows: [[1,2,"2024-03-10",1],[1,3,"2024-02-01",2],[1,1,"2024-01-05",3],[2,5,"2024-05-22",1],[2,4,"2024-05-20",2],[3,6,"2024-01-01",1]] } },
        { step: "Keep rn = 1", note: "One newest transaction survives per account.",
          table: { columns: ["AccountId","TxnId","TxnDate","Amount"],
            rows: [[1,2,"2024-03-10",250],[2,5,"2024-05-22",300],[3,6,"2024-01-01",40]] } }
      ],
      patternRecognition: [
        "'Latest / most-recent row **per key**' → `ROW_NUMBER() = 1` with `PARTITION BY key ORDER BY ts DESC`.",
        "Add a tie-break column to the ORDER BY so same-timestamp rows resolve deterministically."
      ],
      interviewRecall: [
        "ROW_NUMBER caps each group at exactly one; a MAX-date join can return duplicates on ties.",
        "CROSS APPLY + TOP (1) is the index-seek alternative to a partitioned window sort."
      ],
      commonMistakes: [
        "Joining on `MAX(TxnDate)` and getting two rows when an account transacts twice in one day.",
        "Omitting the tie-break, making the 'latest' row nondeterministic across runs."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-dedup-contacts",
      number: "DL 2517",
      platform: "DataLemur",
      title: "Deduplicate Contacts by Email",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["CRM Analytics"],
      link: "https://datalemur.com/questions/deduplicate-contacts",
      meta: { pattern: "Dedup keep-one", sqlConcept: "ROW_NUMBER partitioned", technique: "Keep earliest per key" },
      descriptionBrief:
        "A **Contacts** table has duplicate rows for the same `Email` from repeated imports. Keep **one " +
        "row per email — the earliest by `CreatedAt`** (the original record) — and discard the rest. " +
        "Break `CreatedAt` ties by the smaller `RowId`.",
      schema: [
        { name: "Contacts", columns: [
          { name: "RowId", type: "INT", note: "PK" },
          { name: "Email", type: "VARCHAR(100)" },
          { name: "FullName", type: "VARCHAR(50)" },
          { name: "CreatedAt", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Contacts','U') IS NOT NULL DROP TABLE dbo.Contacts;\n" +
        "CREATE TABLE dbo.Contacts (RowId INT PRIMARY KEY, Email VARCHAR(100), FullName VARCHAR(50), CreatedAt DATE);\n" +
        "INSERT INTO dbo.Contacts VALUES\n" +
        "  (1,'a@x.com','Ann','2024-01-01'),(2,'a@x.com','Ann A','2024-02-01'),\n" +
        "  (3,'b@x.com','Bob','2024-01-15'),(4,'c@x.com','Cid','2024-03-01'),\n" +
        "  (5,'b@x.com','Bob B','2024-01-10');",
      sampleData: [
        { table: "Contacts", columns: ["RowId","Email","FullName","CreatedAt"],
          rows: [[1,"a@x.com","Ann","2024-01-01"],[2,"a@x.com","Ann A","2024-02-01"],[3,"b@x.com","Bob","2024-01-15"],[4,"c@x.com","Cid","2024-03-01"],[5,"b@x.com","Bob B","2024-01-10"]] }
      ],
      expectedOutput: { columns: ["RowId","Email","FullName","CreatedAt"],
        rows: [[1,"a@x.com","Ann","2024-01-01"],[5,"b@x.com","Bob B","2024-01-10"],[4,"c@x.com","Cid","2024-03-01"]] },
      approaches: [
        {
          name: "ROW_NUMBER dedup (recommended)",
          perfNote: "One partitioned sort; ROW_NUMBER = 1 marks the survivor per email in a single pass. The standard dedup idiom.",
          dialectNote: "",
          logic:
            "**What it asks.** Collapse duplicate emails to one canonical row — the earliest-created — keeping the rest out.\n\n" +
            "**Why the naive idea fails.** `SELECT DISTINCT` won't help because the duplicate rows differ in `RowId`/`FullName`. `GROUP BY Email` forces you to aggregate every other column and loses which original row to keep.\n\n" +
            "**Key Idea.** `ROW_NUMBER() OVER (PARTITION BY Email ORDER BY CreatedAt ASC, RowId ASC)` numbers each email's rows oldest-first; the row numbered 1 is the keeper.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned ROW_NUMBER ordered by `CreatedAt` then `RowId`.\n" +
            "2. Filter to `rn = 1` to keep one row per email.\n" +
            "3. Project the columns and order by email.\n\n" +
            "**Why it works.** Partitioning by the duplicate key and ordering by the 'winner' rule makes `rn = 1` name exactly the row you want to retain per key.\n\n" +
            "**Common Gotchas.** Choose the ORDER BY to match your keep rule (earliest here — ASC). A tie-break like `RowId` is required or the survivor is nondeterministic. To actually delete duplicates you'd `DELETE FROM cte WHERE rn > 1`.\n\n" +
            "**Performance.** A segment + sort per partition, O(n log n); an index on `(Email, CreatedAt, RowId)` supplies the order.\n\n" +
            "**Interview mindset.** 'Dedup, keep one per key' → ROW_NUMBER partitioned by the key; keep `rn = 1`, delete `rn > 1`.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT RowId, Email, FullName, CreatedAt,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Email                 -- one group per email\n" +
            "                              ORDER BY CreatedAt ASC, RowId ASC) AS rn  -- earliest wins\n" +
            "    FROM dbo.Contacts\n" +
            ")\n" +
            "SELECT RowId, Email, FullName, CreatedAt\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1                 -- keep the original row only\n" +
            "ORDER BY Email;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT RowId, Email, FullName, CreatedAt,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Email ORDER BY CreatedAt ASC, RowId ASC) AS rn\n" +
            "    FROM dbo.Contacts\n" +
            ")\n" +
            "SELECT RowId, Email, FullName, CreatedAt\n" +
            "FROM Ranked\n" +
            "WHERE rn = 1\n" +
            "ORDER BY Email;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER earliest-first per email", note: "a@x.com: RowId 1 is rn 1; b@x.com: RowId 5 (2024-01-10) beats RowId 3; c@x.com has one row.",
          table: { columns: ["Email","RowId","CreatedAt","rn"],
            rows: [["a@x.com",1,"2024-01-01",1],["a@x.com",2,"2024-02-01",2],["b@x.com",5,"2024-01-10",1],["b@x.com",3,"2024-01-15",2],["c@x.com",4,"2024-03-01",1]] } },
        { step: "Keep rn = 1", note: "One canonical row per email survives.",
          table: { columns: ["RowId","Email","FullName","CreatedAt"],
            rows: [[1,"a@x.com","Ann","2024-01-01"],[5,"b@x.com","Bob B","2024-01-10"],[4,"c@x.com","Cid","2024-03-01"]] } }
      ],
      patternRecognition: [
        "'Remove duplicates, **keep one per key**' → `ROW_NUMBER()` partitioned by the key, keep `rn = 1`.",
        "The ORDER BY inside the window encodes *which* duplicate you keep (earliest, latest, highest)."
      ],
      interviewRecall: [
        "To physically delete duplicates: `WITH c AS (...) DELETE FROM c WHERE rn > 1;` — you can DELETE through the CTE.",
        "DISTINCT/GROUP BY can't pick a specific full row to keep; ROW_NUMBER can."
      ],
      commonMistakes: [
        "Ordering DESC and accidentally keeping the newest duplicate instead of the original.",
        "Omitting the tie-break so which row survives changes between executions."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-engagement-deciles",
      number: "SS 10455",
      platform: "StrataScratch",
      title: "User Engagement Deciles",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Web Analytics"],
      link: "https://platform.stratascratch.com/coding/10455-user-engagement-deciles",
      meta: { pattern: "Bucketing / tiering", sqlConcept: "NTILE(10)", technique: "Decile buckets by row count" },
      descriptionBrief:
        "Given a **Users** table (`UserId`, `Sessions`), split users into **ten engagement deciles** " +
        "where decile 1 holds the most active users and decile 10 the least active. With ten users, " +
        "each decile holds exactly one user.",
      schema: [
        { name: "Users", columns: [
          { name: "UserId", type: "INT", note: "PK" },
          { name: "Sessions", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Users','U') IS NOT NULL DROP TABLE dbo.Users;\n" +
        "CREATE TABLE dbo.Users (UserId INT PRIMARY KEY, Sessions INT);\n" +
        "INSERT INTO dbo.Users VALUES\n" +
        "  (1,5),(2,12),(3,18),(4,25),(5,33),(6,47),(7,60),(8,88),(9,120),(10,200);",
      sampleData: [
        { table: "Users", columns: ["UserId","Sessions"],
          rows: [[1,5],[2,12],[3,18],[4,25],[5,33],[6,47],[7,60],[8,88],[9,120],[10,200]] }
      ],
      expectedOutput: { columns: ["UserId","Sessions","Decile"],
        rows: [[10,200,1],[9,120,2],[8,88,3],[7,60,4],[6,47,5],[5,33,6],[4,25,7],[3,18,8],[2,12,9],[1,5,10]] },
      approaches: [
        {
          name: "NTILE(10) (recommended)",
          perfNote: "Single ordered pass; NTILE distributes rows into ten contiguous, near-equal buckets. Purpose-built for deciles.",
          dialectNote: "",
          logic:
            "**What it asks.** Ten equal-size engagement deciles, most-active users in decile 1.\n\n" +
            "**Why the naive idea fails.** Fixed session thresholds ('>100 = decile 1') don't produce equal-size groups and drift as traffic changes. Hand-computing deciles from `ROW_NUMBER` and `CEILING(rn * 10.0 / n)` works but is fiddly at the boundaries.\n\n" +
            "**Key Idea.** `NTILE(10) OVER (ORDER BY Sessions DESC)` slices the ordered rows into ten buckets as evenly as possible, numbering the busiest bucket 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order users by `Sessions DESC`.\n" +
            "2. Apply `NTILE(10)` over that order to get a 1–10 decile.\n" +
            "3. Project user, sessions, and decile; order by sessions descending.\n\n" +
            "**Why it works.** NTILE guarantees bucket sizes differ by at most one row; with 10 rows each of the ten buckets gets exactly one.\n\n" +
            "**Common Gotchas.** When the row count isn't divisible by 10, NTILE puts the extra rows in the *earlier* (lower-numbered) buckets — sizes aren't perfectly equal. Order direction sets which decile is 1.\n\n" +
            "**Performance.** One sort on Sessions, O(n log n); an index on `Sessions` supplies the order.\n\n" +
            "**Interview mindset.** 'Split into N equal groups — quartiles, deciles, percentile buckets' → NTILE(N).",
          tsql:
            "SELECT UserId, Sessions,\n" +
            "       NTILE(10) OVER (ORDER BY Sessions DESC) AS Decile  -- 10 near-equal buckets, busiest = 1\n" +
            "FROM dbo.Users\n" +
            "ORDER BY Sessions DESC;",
          clean:
            "SELECT UserId, Sessions,\n" +
            "       NTILE(10) OVER (ORDER BY Sessions DESC) AS Decile\n" +
            "FROM dbo.Users\n" +
            "ORDER BY Sessions DESC;"
        }
      ],
      walkthrough: [
        { step: "NTILE(10) over sessions DESC", note: "Ten ordered users split into ten buckets of one; user 10 (200 sessions) lands in decile 1.",
          table: { columns: ["UserId","Sessions","Decile"],
            rows: [[10,200,1],[9,120,2],[8,88,3],[7,60,4],[6,47,5],[5,33,6],[4,25,7],[3,18,8],[2,12,9],[1,5,10]] } }
      ],
      patternRecognition: [
        "'Deciles / N equal-size groups' → `NTILE(N)` over the ordered measure.",
        "Uneven divisions put the extra rows in the earlier (lower-numbered) buckets."
      ],
      interviewRecall: [
        "NTILE(N) balances row *counts*, not value ranges — bucket sizes differ by at most one.",
        "The ORDER BY direction decides which decile is number 1."
      ],
      commonMistakes: [
        "Assuming each decile covers an equal *range* of sessions rather than an equal count of users.",
        "Ordering ascending and labeling the least-active users as the top decile."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-second-recent-order",
      number: "LC 2686",
      platform: "LeetCode",
      title: "Second Most Recent Order per Customer",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["E-commerce Analytics"],
      link: "https://leetcode.com/problems/second-most-recent-order-per-customer/",
      meta: { pattern: "Nth per partition", sqlConcept: "ROW_NUMBER partitioned", technique: "Pick the Nth row per group" },
      descriptionBrief:
        "Given an **Orders** table (`CustomerId`, `OrderDate`, `Total`), return each customer's **second " +
        "most recent order**. Customers with only one order are excluded. Break same-date ties by the " +
        "larger `OrderId`.",
      schema: [
        { name: "Orders", columns: [
          { name: "OrderId", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT" },
          { name: "OrderDate", type: "DATE" },
          { name: "Total", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "CREATE TABLE dbo.Orders (OrderId INT PRIMARY KEY, CustomerId INT, OrderDate DATE, Total INT);\n" +
        "INSERT INTO dbo.Orders VALUES\n" +
        "  (1,1,'2024-01-10',50),(2,1,'2024-03-05',80),(3,1,'2024-02-20',30),\n" +
        "  (4,2,'2024-06-01',100),(5,2,'2024-06-15',60),\n" +
        "  (6,3,'2024-04-01',25);",
      sampleData: [
        { table: "Orders", columns: ["OrderId","CustomerId","OrderDate","Total"],
          rows: [[1,1,"2024-01-10",50],[2,1,"2024-03-05",80],[3,1,"2024-02-20",30],[4,2,"2024-06-01",100],[5,2,"2024-06-15",60],[6,3,"2024-04-01",25]] }
      ],
      expectedOutput: { columns: ["CustomerId","OrderId","OrderDate","Total"],
        rows: [[1,3,"2024-02-20",30],[2,4,"2024-06-01",100]] },
      approaches: [
        {
          name: "ROW_NUMBER = 2 (recommended)",
          perfNote: "One partitioned sort; ROW_NUMBER numbers newest-first so `rn = 2` is exactly the second most recent, and single-order customers vanish naturally.",
          dialectNote: "",
          logic:
            "**What it asks.** The second-newest order per customer, skipping customers who have only one.\n\n" +
            "**Why the naive idea fails.** `MAX(OrderDate)` gives only the latest. Trying to 'exclude the max then take the max again' needs two correlated subqueries and still mishandles same-date ties.\n\n" +
            "**Key Idea.** `ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC, OrderId DESC)` numbers each customer newest-first; the row numbered 2 is the second most recent.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned ROW_NUMBER ordered by date DESC with an `OrderId` tie-break.\n" +
            "2. Filter to `rn = 2`.\n" +
            "3. Customers with a single order never produce an `rn = 2`, so they drop automatically.\n\n" +
            "**Why it works.** ROW_NUMBER is a strict 1,2,3,… per partition, so 'the Nth per group' is simply `rn = N`; a partition with fewer than N rows has no such row.\n\n" +
            "**Common Gotchas.** Use `ROW_NUMBER`, not `RANK`/`DENSE_RANK` — with a tie for first, RANK skips rank 2 and `rn = 2` could return nothing or the wrong row. Filter the window result in a CTE, never in `WHERE`.\n\n" +
            "**Performance.** A segment + sort per partition, O(n log n); an index on `(CustomerId, OrderDate DESC, OrderId DESC)` supplies the order.\n\n" +
            "**Interview mindset.** 'The Nth row per group' → ROW_NUMBER = N; groups shorter than N simply produce no row.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT CustomerId, OrderId, OrderDate, Total,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId              -- restart per customer\n" +
            "                              ORDER BY OrderDate DESC, OrderId DESC) AS rn  -- newest first\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Total\n" +
            "FROM Ranked\n" +
            "WHERE rn = 2                 -- the second most recent order\n" +
            "ORDER BY CustomerId;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT CustomerId, OrderId, OrderDate, Total,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate DESC, OrderId DESC) AS rn\n" +
            "    FROM dbo.Orders\n" +
            ")\n" +
            "SELECT CustomerId, OrderId, OrderDate, Total\n" +
            "FROM Ranked\n" +
            "WHERE rn = 2\n" +
            "ORDER BY CustomerId;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER newest-first per customer", note: "Customer 1: 03-05 (1), 02-20 (2), 01-10 (3); customer 2: 06-15 (1), 06-01 (2); customer 3 has one row.",
          table: { columns: ["CustomerId","OrderId","OrderDate","rn"],
            rows: [[1,2,"2024-03-05",1],[1,3,"2024-02-20",2],[1,1,"2024-01-10",3],[2,5,"2024-06-15",1],[2,4,"2024-06-01",2],[3,6,"2024-04-01",1]] } },
        { step: "Keep rn = 2", note: "Customer 3 (single order) has no rn 2 and drops out.",
          table: { columns: ["CustomerId","OrderId","OrderDate","Total"],
            rows: [[1,3,"2024-02-20",30],[2,4,"2024-06-01",100]] } }
      ],
      patternRecognition: [
        "'The **Nth** row per group' → `ROW_NUMBER() = N` partitioned by the group.",
        "Groups with fewer than N rows disappear — a built-in filter for 'must have at least N'."
      ],
      interviewRecall: [
        "ROW_NUMBER is strict 1,2,3; RANK can skip N after a tie, so use ROW_NUMBER for 'exactly the Nth'.",
        "Same-timestamp ties need an explicit tie-break column for a deterministic Nth."
      ],
      commonMistakes: [
        "Using `RANK() = 2` and getting nothing when two orders tie for most recent (both rank 1).",
        "Forgetting the tie-break, making the 'second most recent' nondeterministic on same-date orders."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-bottom-3-stores",
      number: "SS 9840",
      platform: "StrataScratch",
      title: "Bottom 3 Stores by Sales per Region",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Retail Analytics"],
      link: "https://platform.stratascratch.com/coding/9840-bottom-3-stores-per-region",
      meta: { pattern: "Bottom-N per group", sqlConcept: "ROW_NUMBER partitioned ASC", technique: "Per-group worst-N filter" },
      descriptionBrief:
        "Given a **Stores** table (`Region`, `StoreName`, `Sales`), return the **three lowest-selling " +
        "stores in each region** for a turnaround program. Regions with fewer than three stores return " +
        "all they have. Break exact sales ties by store name.",
      schema: [
        { name: "Stores", columns: [
          { name: "StoreId", type: "INT", note: "PK" },
          { name: "Region", type: "VARCHAR(30)" },
          { name: "StoreName", type: "VARCHAR(30)" },
          { name: "Sales", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Stores','U') IS NOT NULL DROP TABLE dbo.Stores;\n" +
        "CREATE TABLE dbo.Stores (StoreId INT PRIMARY KEY, Region VARCHAR(30), StoreName VARCHAR(30), Sales INT);\n" +
        "INSERT INTO dbo.Stores VALUES\n" +
        "  (1,'East','E1',500),(2,'East','E2',300),(3,'East','E3',700),(4,'East','E4',200),\n" +
        "  (5,'West','W1',400),(6,'West','W2',150);",
      sampleData: [
        { table: "Stores", columns: ["StoreId","Region","StoreName","Sales"],
          rows: [[1,"East","E1",500],[2,"East","E2",300],[3,"East","E3",700],[4,"East","E4",200],[5,"West","W1",400],[6,"West","W2",150]] }
      ],
      expectedOutput: { columns: ["Region","StoreName","Sales","rn"],
        rows: [["East","E4",200,1],["East","E2",300,2],["East","E1",500,3],["West","W2",150,1],["West","W1",400,2]] },
      approaches: [
        {
          name: "ROW_NUMBER ascending (recommended)",
          perfNote: "One partitioned sort per region with an ASCENDING order; ROW_NUMBER numbers worst-first so a `<= 3` filter keeps the bottom three. Bottom-N is top-N with the order flipped.",
          dialectNote: "",
          logic:
            "**What it asks.** The three weakest stores per region, capped at exactly three even when sales tie.\n\n" +
            "**Why the naive idea fails.** A global `TOP 3 ... ORDER BY Sales ASC` returns three stores overall, not three per region. `RANK ASC <= 3` would return *more* than three when the third-worst ties, breaking the cap.\n\n" +
            "**Key Idea.** Bottom-N is top-N with a flipped sort: `ROW_NUMBER() OVER (PARTITION BY Region ORDER BY Sales ASC, StoreName)` numbers each region worst-first; keep `rn <= 3`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute the partitioned ROW_NUMBER ordered by `Sales ASC` with a `StoreName` tie-break.\n" +
            "2. Filter to `rn <= 3`.\n" +
            "3. Order the output by `Region`, then `rn`.\n\n" +
            "**Why it works.** Ordering ascending makes the smallest-sales store rn 1; ROW_NUMBER's strict sequence caps the group at three regardless of ties.\n\n" +
            "**Common Gotchas.** Flip the ORDER BY to ASC for 'bottom' — leaving it DESC returns the top stores. Add a tie-break or 'bottom 3' is nondeterministic. Filter the window in a CTE, not `WHERE`.\n\n" +
            "**Performance.** A segment + sort per partition, O(n log n); an index on `(Region, Sales, StoreName)` supplies the window order.\n\n" +
            "**Interview mindset.** 'Bottom N per group' = 'top N per group' with `ORDER BY measure ASC`; everything else is identical.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT Region, StoreName, Sales,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Region                 -- restart per region\n" +
            "                              ORDER BY Sales ASC, StoreName) AS rn  -- worst first, deterministic\n" +
            "    FROM dbo.Stores\n" +
            ")\n" +
            "SELECT Region, StoreName, Sales, rn\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 3               -- keep the three lowest per region\n" +
            "ORDER BY Region, rn;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT Region, StoreName, Sales,\n" +
            "           ROW_NUMBER() OVER (PARTITION BY Region ORDER BY Sales ASC, StoreName) AS rn\n" +
            "    FROM dbo.Stores\n" +
            ")\n" +
            "SELECT Region, StoreName, Sales, rn\n" +
            "FROM Ranked\n" +
            "WHERE rn <= 3\n" +
            "ORDER BY Region, rn;"
        }
      ],
      walkthrough: [
        { step: "ROW_NUMBER worst-first per region", note: "East ascending: E4 200 (1), E2 300 (2), E1 500 (3), E3 700 (4); West: W2 150 (1), W1 400 (2).",
          table: { columns: ["Region","StoreName","Sales","rn"],
            rows: [["East","E4",200,1],["East","E2",300,2],["East","E1",500,3],["East","E3",700,4],["West","W2",150,1],["West","W1",400,2]] } },
        { step: "Keep rn <= 3", note: "East drops its top store E3; West keeps both.",
          table: { columns: ["Region","StoreName","Sales","rn"],
            rows: [["East","E4",200,1],["East","E2",300,2],["East","E1",500,3],["West","W2",150,1],["West","W1",400,2]] } }
      ],
      patternRecognition: [
        "'Bottom / worst N **per group**' → `ROW_NUMBER() <= N` with `ORDER BY measure ASC`.",
        "Bottom-N and top-N share one template; only the ORDER BY direction differs."
      ],
      interviewRecall: [
        "ROW_NUMBER caps a group at exactly N; RANK/DENSE_RANK may exceed N when the Nth place ties.",
        "Filtering a window result requires a CTE/derived table — not the WHERE of the same SELECT."
      ],
      commonMistakes: [
        "Leaving `ORDER BY Sales DESC` and returning the top stores instead of the bottom.",
        "Using `RANK() <= 3` and returning four rows when two stores tie for third-worst."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-race-standings-gaps",
      number: "HR 2145",
      platform: "HackerRank",
      title: "Race Standings with Gaps",
      difficulty: "Easy",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Sports Analytics"],
      link: "https://www.hackerrank.com/challenges/race-standings-with-gaps/problem",
      meta: { pattern: "Olympic ranking", sqlConcept: "RANK", technique: "Standard competition ranking with gaps" },
      descriptionBrief:
        "Given a **RaceResults** table (`Racer`, `FinishTime`), produce the finishing standings. The " +
        "fastest time is rank 1; racers with the **same time share a rank**, and the next distinct time " +
        "**skips** the tied positions (Olympic-style: 1,1,3,4,4,6).",
      schema: [
        { name: "RaceResults", columns: [
          { name: "RacerId", type: "INT", note: "PK" },
          { name: "Racer", type: "VARCHAR(30)" },
          { name: "FinishTime", type: "DECIMAL(4,2)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.RaceResults','U') IS NOT NULL DROP TABLE dbo.RaceResults;\n" +
        "CREATE TABLE dbo.RaceResults (RacerId INT PRIMARY KEY, Racer VARCHAR(30), FinishTime DECIMAL(4,2));\n" +
        "INSERT INTO dbo.RaceResults VALUES\n" +
        "  (1,'Ann',10.50),(2,'Bob',10.50),(3,'Cid',11.00),\n" +
        "  (4,'Dee',11.20),(5,'Eli',11.20),(6,'Fay',11.50);",
      sampleData: [
        { table: "RaceResults", columns: ["RacerId","Racer","FinishTime"],
          rows: [[1,"Ann","10.50"],[2,"Bob","10.50"],[3,"Cid","11.00"],[4,"Dee","11.20"],[5,"Eli","11.20"],[6,"Fay","11.50"]] }
      ],
      expectedOutput: { columns: ["Racer","FinishTime","Place"],
        rows: [["Ann","10.50",1],["Bob","10.50",1],["Cid","11.00",3],["Dee","11.20",4],["Eli","11.20",4],["Fay","11.50",6]] },
      approaches: [
        {
          name: "RANK (recommended)",
          perfNote: "Single sort on FinishTime; RANK gives the exact Olympic standings — ties share a place and the next place skips ahead — in one pass.",
          dialectNote: "",
          logic:
            "**What it asks.** Competition standings where tied racers share a place and the following place jumps past the tie (1,1,3).\n\n" +
            "**Why the naive idea fails.** `DENSE_RANK` gives ties the same place but **no gap** (1,1,2), which is wrong for standings — after two racers tie for 1st, the next is 3rd, not 2nd. `ROW_NUMBER` breaks the tie apart entirely (1,2,3).\n\n" +
            "**Key Idea.** `RANK() OVER (ORDER BY FinishTime ASC)` is defined to leave gaps: each rank equals one plus the number of racers strictly faster, so ties share and the next distinct time skips.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Order racers by `FinishTime ASC` (fastest first).\n" +
            "2. Apply `RANK()` over that order.\n" +
            "3. Project racer, time, and place; order by time then racer.\n\n" +
            "**Why it works.** RANK counts how many rows precede each value, so two racers at 10.50 both get 1 and the next (11.00) becomes 3 — exactly the Olympic rule.\n\n" +
            "**Common Gotchas.** Don't reach for `DENSE_RANK` (no gaps) unless the prompt says 'no gaps'. Order ASC — fastest time is rank 1, not slowest.\n\n" +
            "**Performance.** One sort on FinishTime, O(n log n); an index on `FinishTime` supplies the order.\n\n" +
            "**Interview mindset.** 'Ties share, next place **skips**' → RANK. 'Ties share, **no gaps**' → DENSE_RANK. 'No ties at all' → ROW_NUMBER.",
          tsql:
            "SELECT Racer, FinishTime,\n" +
            "       RANK() OVER (ORDER BY FinishTime ASC) AS Place  -- Olympic: ties share, gaps follow\n" +
            "FROM dbo.RaceResults\n" +
            "ORDER BY FinishTime, Racer;",
          clean:
            "SELECT Racer, FinishTime,\n" +
            "       RANK() OVER (ORDER BY FinishTime ASC) AS Place\n" +
            "FROM dbo.RaceResults\n" +
            "ORDER BY FinishTime, Racer;"
        }
      ],
      walkthrough: [
        { step: "RANK over FinishTime ASC", note: "Ann and Bob (10.50) share place 1; Cid (11.00) skips to 3; Dee and Eli (11.20) share 4; Fay is 6.",
          table: { columns: ["Racer","FinishTime","Place"],
            rows: [["Ann","10.50",1],["Bob","10.50",1],["Cid","11.00",3],["Dee","11.20",4],["Eli","11.20",4],["Fay","11.50",6]] } }
      ],
      patternRecognition: [
        "'Ties share a place and the next place **skips**' (competition/Olympic) → `RANK`.",
        "'Ties share, ranks stay **contiguous**' → `DENSE_RANK`."
      ],
      interviewRecall: [
        "RANK = 1 + (# rows strictly before), so gaps appear after every tie group.",
        "DENSE_RANK never gaps; ROW_NUMBER never ties — pick by the exact wording."
      ],
      commonMistakes: [
        "Using DENSE_RANK and returning 1,1,2 where the standings demand 1,1,3.",
        "Ordering descending and crowning the slowest racer as rank 1."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-tie-handling-contrast",
      number: "DL 2603",
      platform: "DataLemur",
      title: "RANK vs DENSE_RANK vs ROW_NUMBER Contrast",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Gaming Analytics"],
      link: "https://datalemur.com/questions/rank-denserank-rownumber-contrast",
      meta: { pattern: "Tie-handling contrast", sqlConcept: "RANK / DENSE_RANK / ROW_NUMBER", technique: "Three ranking functions side by side" },
      descriptionBrief:
        "Given a **Players** table (`Player`, `Points`), show all three ranking functions **side by " +
        "side** over the same `Points DESC` order so the tie behaviour is visible: `RANK` (ties share, " +
        "gaps), `DENSE_RANK` (ties share, no gaps), and `ROW_NUMBER` (no ties). Break `ROW_NUMBER` ties " +
        "by player name.",
      schema: [
        { name: "Players", columns: [
          { name: "PlayerId", type: "INT", note: "PK" },
          { name: "Player", type: "VARCHAR(30)" },
          { name: "Points", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Players','U') IS NOT NULL DROP TABLE dbo.Players;\n" +
        "CREATE TABLE dbo.Players (PlayerId INT PRIMARY KEY, Player VARCHAR(30), Points INT);\n" +
        "INSERT INTO dbo.Players VALUES\n" +
        "  (1,'Amy',90),(2,'Ben',90),(3,'Cid',80),(4,'Dan',80),(5,'Eve',70);",
      sampleData: [
        { table: "Players", columns: ["PlayerId","Player","Points"],
          rows: [[1,"Amy",90],[2,"Ben",90],[3,"Cid",80],[4,"Dan",80],[5,"Eve",70]] }
      ],
      expectedOutput: { columns: ["Player","Points","rnk","drnk","rnum"],
        rows: [["Amy",90,1,1,1],["Ben",90,1,1,2],["Cid",80,3,2,3],["Dan",80,3,2,4],["Eve",70,5,3,5]] },
      approaches: [
        {
          name: "All three windows in one SELECT (recommended)",
          perfNote: "The three functions share one ORDER BY, so the optimizer computes them over a single sort — one pass yields all three columns.",
          dialectNote: "",
          logic:
            "**What it asks.** One result showing how RANK, DENSE_RANK, and ROW_NUMBER differ on the very same tied data.\n\n" +
            "**Why the naive idea fails.** Reaching for whichever function you remember and hoping it matches the required tie rule leads to silent off-by-one errors — 1,1,3 where you wanted 1,1,2, or dropped ties. Seeing all three at once makes the contract explicit.\n\n" +
            "**Key Idea.** Emit `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()` over the identical `ORDER BY Points DESC` (with a name tie-break for ROW_NUMBER) so their columns line up row by row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `SELECT` the player and points.\n" +
            "2. Add `RANK() OVER (ORDER BY Points DESC)` — ties share, then a gap.\n" +
            "3. Add `DENSE_RANK() OVER (ORDER BY Points DESC)` — ties share, no gap.\n" +
            "4. Add `ROW_NUMBER() OVER (ORDER BY Points DESC, Player)` — strict 1..n, tie broken by name.\n" +
            "5. Order the output by points DESC then player.\n\n" +
            "**Why it works.** RANK counts rows strictly before it (gaps), DENSE_RANK counts distinct values before it (no gaps), and ROW_NUMBER counts rows including itself (never ties) — the same data exposes all three definitions.\n\n" +
            "**Common Gotchas.** ROW_NUMBER needs a deterministic tie-break or the two 90-point players swap arbitrarily between runs. RANK/DENSE_RANK ignore the tie-break — they tie regardless.\n\n" +
            "**Performance.** All three share one sort on Points, O(n log n); an index on `Points` supplies the order.\n\n" +
            "**Interview mindset.** Memorize the tie triplet: RANK → 1,1,3; DENSE_RANK → 1,1,2; ROW_NUMBER → 1,2,3.",
          tsql:
            "SELECT Player, Points,\n" +
            "       RANK()       OVER (ORDER BY Points DESC)          AS rnk,   -- ties share, gaps\n" +
            "       DENSE_RANK() OVER (ORDER BY Points DESC)          AS drnk,  -- ties share, no gaps\n" +
            "       ROW_NUMBER() OVER (ORDER BY Points DESC, Player)  AS rnum   -- strict, name tie-break\n" +
            "FROM dbo.Players\n" +
            "ORDER BY Points DESC, Player;",
          clean:
            "SELECT Player, Points,\n" +
            "       RANK()       OVER (ORDER BY Points DESC)         AS rnk,\n" +
            "       DENSE_RANK() OVER (ORDER BY Points DESC)         AS drnk,\n" +
            "       ROW_NUMBER() OVER (ORDER BY Points DESC, Player) AS rnum\n" +
            "FROM dbo.Players\n" +
            "ORDER BY Points DESC, Player;"
        }
      ],
      walkthrough: [
        { step: "Three windows over Points DESC", note: "Amy/Ben tie at 90; Cid/Dan tie at 80. RANK jumps 1,1,3,3,5; DENSE_RANK stays 1,1,2,2,3; ROW_NUMBER is strict 1..5.",
          table: { columns: ["Player","Points","rnk","drnk","rnum"],
            rows: [["Amy",90,1,1,1],["Ben",90,1,1,2],["Cid",80,3,2,3],["Dan",80,3,2,4],["Eve",70,5,3,5]] } }
      ],
      patternRecognition: [
        "Choose by the tie contract: gaps → RANK, no gaps → DENSE_RANK, no ties → ROW_NUMBER.",
        "All three accept `PARTITION BY` to restart per group and share one ORDER BY."
      ],
      interviewRecall: [
        "The canonical triplet on a tie: RANK 1,1,3 — DENSE_RANK 1,1,2 — ROW_NUMBER 1,2,3.",
        "Only ROW_NUMBER cares about a tie-break column; RANK/DENSE_RANK tie regardless of it."
      ],
      commonMistakes: [
        "Assuming RANK and DENSE_RANK are interchangeable — they differ exactly on the post-tie gap.",
        "Leaving ROW_NUMBER without a tie-break, so tied rows get unstable numbers."
      ]
    },

    /* ------------------------------------------------------------------ */
    {
      id: "rank2-top-percentile-reps",
      number: "SS 10527",
      platform: "StrataScratch",
      title: "Flag Top-Percentile Sales Reps",
      difficulty: "Medium",
      category: "Ranking",
      topics: ["Ranking", "Window Functions"],
      domains: ["Sales Analytics"],
      link: "https://platform.stratascratch.com/coding/10527-top-percentile-reps",
      meta: { pattern: "Percentile threshold", sqlConcept: "PERCENT_RANK", technique: "Threshold on relative standing" },
      descriptionBrief:
        "Given a **Reps** table (`Name`, `Revenue`), compute each rep's `PERCENT_RANK` over revenue " +
        "(ascending) and **flag the top 20%** — reps whose `PERCENT_RANK >= 0.80` — as `'Yes'`, everyone " +
        "else `'No'`. Round the percent rank to two decimals and order lowest revenue first.",
      schema: [
        { name: "Reps", columns: [
          { name: "RepId", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(30)" },
          { name: "Revenue", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Reps','U') IS NOT NULL DROP TABLE dbo.Reps;\n" +
        "CREATE TABLE dbo.Reps (RepId INT PRIMARY KEY, Name VARCHAR(30), Revenue INT);\n" +
        "INSERT INTO dbo.Reps VALUES\n" +
        "  (1,'Ann',100),(2,'Bob',200),(3,'Cid',300),\n" +
        "  (4,'Dee',400),(5,'Eli',500),(6,'Fay',600);",
      sampleData: [
        { table: "Reps", columns: ["RepId","Name","Revenue"],
          rows: [[1,"Ann",100],[2,"Bob",200],[3,"Cid",300],[4,"Dee",400],[5,"Eli",500],[6,"Fay",600]] }
      ],
      expectedOutput: { columns: ["Name","Revenue","PctRank","TopTier"],
        rows: [["Ann",100,"0.00","No"],["Bob",200,"0.20","No"],["Cid",300,"0.40","No"],["Dee",400,"0.60","No"],["Eli",500,"0.80","Yes"],["Fay",600,"1.00","Yes"]] },
      approaches: [
        {
          name: "PERCENT_RANK threshold (recommended)",
          perfNote: "One ordered pass computes the relative standing; a CASE turns it into a top-percentile flag with no self-join or per-row subquery.",
          dialectNote: "",
          logic:
            "**What it asks.** Mark the reps in the top 20% of the revenue distribution, based on relative standing rather than a fixed dollar cutoff.\n\n" +
            "**Why the naive idea fails.** A hard threshold ('Revenue >= 500 = top tier') has to be re-tuned whenever the numbers move and doesn't mean 'top 20%'. A correlated `COUNT(*) WHERE Revenue < r` divided by n re-scans per row and is easy to get off-by-one (n vs n-1).\n\n" +
            "**Key Idea.** `PERCENT_RANK() OVER (ORDER BY Revenue) = (rank-1)/(n-1)` gives each rep's fraction of peers strictly below; 'top 20%' is `PERCENT_RANK >= 0.80`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, compute `PERCENT_RANK() OVER (ORDER BY Revenue)`.\n" +
            "2. Round it to two decimals for display.\n" +
            "3. In the outer query, `CASE WHEN pr >= 0.80 THEN 'Yes' ELSE 'No'` for the top tier.\n" +
            "4. Order the output by revenue ascending.\n\n" +
            "**Why it works.** PERCENT_RANK normalizes standing to a 0–1 scale independent of the actual revenue values, so the 0.80 cutoff always means 'in the top fifth' regardless of magnitude.\n\n" +
            "**Common Gotchas.** Flag on the raw PERCENT_RANK, not the rounded copy, to avoid boundary surprises. The minimum always gets 0.00; the maximum always 1.00. Ties share a PERCENT_RANK, so a tie at the boundary flags together.\n\n" +
            "**Performance.** A single sort on Revenue, O(n log n); an index on `Revenue` supplies the order.\n\n" +
            "**Interview mindset.** 'Top / bottom X% by relative standing' → PERCENT_RANK with a fractional threshold, not a hard-coded value cutoff.",
          tsql:
            "WITH Ranked AS (\n" +
            "    SELECT Name, Revenue,\n" +
            "           PERCENT_RANK() OVER (ORDER BY Revenue) AS pr  -- (rank-1)/(n-1), fraction below\n" +
            "    FROM dbo.Reps\n" +
            ")\n" +
            "SELECT Name, Revenue,\n" +
            "       CAST(ROUND(pr, 2) AS DECIMAL(4,2)) AS PctRank,\n" +
            "       CASE WHEN pr >= 0.80 THEN 'Yes' ELSE 'No' END AS TopTier  -- top 20%\n" +
            "FROM Ranked\n" +
            "ORDER BY Revenue;",
          clean:
            "WITH Ranked AS (\n" +
            "    SELECT Name, Revenue,\n" +
            "           PERCENT_RANK() OVER (ORDER BY Revenue) AS pr\n" +
            "    FROM dbo.Reps\n" +
            ")\n" +
            "SELECT Name, Revenue,\n" +
            "       CAST(ROUND(pr, 2) AS DECIMAL(4,2)) AS PctRank,\n" +
            "       CASE WHEN pr >= 0.80 THEN 'Yes' ELSE 'No' END AS TopTier\n" +
            "FROM Ranked\n" +
            "ORDER BY Revenue;"
        }
      ],
      walkthrough: [
        { step: "PERCENT_RANK over Revenue ASC", note: "n = 6, so PERCENT_RANK = (rank-1)/5: Ann 0.00, Bob 0.20, ... Eli 0.80, Fay 1.00.",
          table: { columns: ["Name","Revenue","PctRank"],
            rows: [["Ann",100,"0.00"],["Bob",200,"0.20"],["Cid",300,"0.40"],["Dee",400,"0.60"],["Eli",500,"0.80"],["Fay",600,"1.00"]] } },
        { step: "Flag PERCENT_RANK >= 0.80", note: "Eli (0.80) and Fay (1.00) clear the top-20% cutoff.",
          table: { columns: ["Name","Revenue","PctRank","TopTier"],
            rows: [["Ann",100,"0.00","No"],["Bob",200,"0.20","No"],["Cid",300,"0.40","No"],["Dee",400,"0.60","No"],["Eli",500,"0.80","Yes"],["Fay",600,"1.00","Yes"]] } }
      ],
      patternRecognition: [
        "'Top / bottom X% by **relative standing**' → `PERCENT_RANK` with a fractional threshold.",
        "PERCENT_RANK normalizes to 0–1, so the cutoff is data-scale independent."
      ],
      interviewRecall: [
        "PERCENT_RANK = (rank-1)/(n-1); the minimum is always 0 and the maximum always 1.",
        "Compare the raw window value against the cutoff; round only for display."
      ],
      commonMistakes: [
        "Using a hard-coded revenue cutoff that doesn't actually mean 'top 20%'.",
        "Dividing by n instead of n-1 (that is CUME_DIST-style), shifting every boundary."
      ]
    }

  ]);
})();
