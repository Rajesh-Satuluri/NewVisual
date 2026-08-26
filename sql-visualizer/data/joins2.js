/*
 * data/joins2.js — Joins (additional problems).
 * T-SQL for SQL Server 2019/2022, runnable as-is in SSMS 19/21.
 */
(function () {
  window.SQLLAB.register("Joins", [

    {
      id: "joins2-orders-customer-city",
      number: "SS 10245",
      platform: "StrataScratch",
      title: "Orders with Customer and City",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Logistics Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Dimension chain", sqlConcept: "Three-table INNER JOIN", technique: "Follow foreign keys across tables" },
      descriptionBrief:
        "**Orders** reference a customer via `CustomerId`; **Customers** reference a city via `CityId`; " +
        "**Cities** hold the city name. For every order, return its id and amount alongside the " +
        "**customer name** and **city name** by chaining the two foreign keys.",
      schema: [
        { name: "Cities", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Customers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "CityId", type: "INT", note: "FK -> Cities.Id" } ] },
        { name: "Orders", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT", note: "FK -> Customers.Id" },
          { name: "Amount", type: "INT" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U') IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "IF OBJECT_ID('dbo.Cities','U') IS NOT NULL DROP TABLE dbo.Cities;\n" +
        "CREATE TABLE dbo.Cities (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Customers (Id INT PRIMARY KEY, Name VARCHAR(50), CityId INT);\n" +
        "CREATE TABLE dbo.Orders (Id INT PRIMARY KEY, CustomerId INT, Amount INT);\n" +
        "INSERT INTO dbo.Cities VALUES (1,'Austin'),(2,'Denver');\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Ana',1),(2,'Ben',2),(3,'Cid',1);\n" +
        "INSERT INTO dbo.Orders VALUES (1,1,100),(2,3,250),(3,2,75),(4,1,40);",
      sampleData: [
        { table: "Cities", columns: ["Id","Name"], rows: [[1,"Austin"],[2,"Denver"]] },
        { table: "Customers", columns: ["Id","Name","CityId"], rows: [[1,"Ana",1],[2,"Ben",2],[3,"Cid",1]] },
        { table: "Orders", columns: ["Id","CustomerId","Amount"], rows: [[1,1,100],[2,3,250],[3,2,75],[4,1,40]] }
      ],
      expectedOutput: { columns: ["OrderId","Customer","City","Amount"],
        rows: [[1,"Ana","Austin",100],[2,"Cid","Austin",250],[3,"Ben","Denver",75],[4,"Ana","Austin",40]] },
      approaches: [
        {
          name: "Three-table INNER JOIN (recommended)",
          perfNote: "Each order seeks its customer, then its city, through PK indexes; the two joins are short lookups on the dimension keys.",
          dialectNote: "",
          logic:
            "**What it asks.** Every order labeled with its customer's name and that customer's city.\n\n" +
            "**Why the naive idea fails.** The city is not stored on the order — it sits one hop further out, on the customer. A single join to Customers gives the name but not the city; you must follow a second foreign key to Cities.\n\n" +
            "**Key Idea.** Chain the joins along the foreign-key path: Orders -> Customers on `CustomerId = Customers.Id`, then Customers -> Cities on `CityId = Cities.Id`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `FROM Orders o` (the fact table).\n" +
            "2. `JOIN Customers c ON c.Id = o.CustomerId` to pick up the name and CityId.\n" +
            "3. `JOIN Cities ci ON ci.Id = c.CityId` to resolve the city name.\n" +
            "4. Project order id, name, city, amount; order by order id.\n\n" +
            "**Why it works.** Each join is many-to-one toward a unique key, so no row multiplies; the chain simply walks the relationships to gather columns from three tables onto one row.\n\n" +
            "**Common Gotchas.** Join on the correct key at each hop (`CustomerId` vs `CityId`); INNER JOIN drops any order whose customer or city is missing, which is intended here.\n\n" +
            "**Performance.** Two PK seeks per order row; both dimensions are tiny and indexed on Id.\n\n" +
            "**Interview mindset.** 'a column lives two tables away' -> follow the FK chain with successive joins, don't try to jump directly.",
          tsql:
            "SELECT o.Id AS OrderId, c.Name AS Customer, ci.Name AS City, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "JOIN dbo.Customers c ON c.Id = o.CustomerId   -- hop 1: order -> customer\n" +
            "JOIN dbo.Cities    ci ON ci.Id = c.CityId     -- hop 2: customer -> city\n" +
            "ORDER BY o.Id;",
          clean:
            "SELECT o.Id AS OrderId, c.Name AS Customer, ci.Name AS City, o.Amount\n" +
            "FROM dbo.Orders o\n" +
            "JOIN dbo.Customers c ON c.Id = o.CustomerId\n" +
            "JOIN dbo.Cities    ci ON ci.Id = c.CityId\n" +
            "ORDER BY o.Id;"
        }
      ],
      walkthrough: [
        { step: "Join Orders to Customers", note: "Each order picks up its customer name and CityId.",
          table: { columns: ["OrderId","Customer","CityId","Amount"],
            rows: [[1,"Ana",1,100],[2,"Cid",1,250],[3,"Ben",2,75],[4,"Ana",1,40]] } },
        { step: "Join through to Cities", note: "CityId 1 -> Austin, 2 -> Denver.",
          table: { columns: ["OrderId","Customer","City","Amount"],
            rows: [[1,"Ana","Austin",100],[2,"Cid","Austin",250],[3,"Ben","Denver",75],[4,"Ana","Austin",40]] } }
      ],
      patternRecognition: [
        "'a needed column is two tables away' -> chain INNER JOINs along the foreign-key path.",
        "Drive the query from the fact table (Orders) outward to the dimensions."
      ],
      interviewRecall: [
        "Each many-to-one join toward a unique key adds columns without multiplying rows.",
        "A missing row anywhere in an all-INNER chain removes the whole order from the result."
      ],
      commonMistakes: [
        "Joining on the wrong key at a hop (CustomerId where CityId is meant).",
        "Trying to reach Cities directly from Orders when no such key exists."
      ]
    },

    {
      id: "joins2-player-pairs-same-country",
      number: "LC 1364",
      platform: "LeetCode",
      title: "Pairs of Players from the Same Country",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Gaming Analytics"],
      link: "https://leetcode.com/",
      meta: { pattern: "Self-join for pairs", sqlConcept: "Self-join with id inequality", technique: "a.Id < b.Id to dedupe pairs" },
      descriptionBrief:
        "**Players** each have a `Country`. Return every **unordered pair** of distinct players who " +
        "share the same country. Each pair should appear **once** (not twice), and a player must not " +
        "be paired with themselves.",
      schema: [
        { name: "Players", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "Country", type: "VARCHAR(20)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Players','U') IS NOT NULL DROP TABLE dbo.Players;\n" +
        "CREATE TABLE dbo.Players (Id INT PRIMARY KEY, Name VARCHAR(50), Country VARCHAR(20));\n" +
        "INSERT INTO dbo.Players VALUES\n" +
        "  (1,'Ann','US'),(2,'Bob','US'),(3,'Cid','UK'),(4,'Dee','US'),(5,'Eli','UK');",
      sampleData: [
        { table: "Players", columns: ["Id","Name","Country"],
          rows: [[1,"Ann","US"],[2,"Bob","US"],[3,"Cid","UK"],[4,"Dee","US"],[5,"Eli","UK"]] }
      ],
      expectedOutput: { columns: ["Player1","Player2","Country"],
        rows: [["Ann","Bob","US"],["Ann","Dee","US"],["Bob","Dee","US"],["Cid","Eli","UK"]] },
      approaches: [
        {
          name: "Self-join with a.Id < b.Id (recommended)",
          perfNote: "One join of the table to itself on Country; the `a.Id < b.Id` predicate halves the output and removes self-pairs in the same stroke.",
          dialectNote: "",
          logic:
            "**What it asks.** Every unordered pair of different players in the same country, listed once.\n\n" +
            "**Why the naive idea fails.** Joining the table to itself only on `a.Country = b.Country` pairs each player with themselves (Ann-Ann) and lists every real pair twice (Ann-Bob and Bob-Ann). You need to break that symmetry.\n\n" +
            "**Key Idea.** Add `a.Id < b.Id` to the join. It excludes self-pairs (equal ids fail `<`) and keeps only one ordering of each real pair.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Players a JOIN Players b ON a.Country = b.Country` to co-locate same-country players.\n" +
            "2. `AND a.Id < b.Id` to keep exactly one, self-excluding ordering.\n" +
            "3. Project the two names and the shared country.\n" +
            "4. Order by the names for a stable result.\n\n" +
            "**Why it works.** For any two distinct players exactly one of `a.Id < b.Id` or `b.Id < a.Id` holds, so each pair survives once; `a.Id < a.Id` is never true, so no one pairs with themselves.\n\n" +
            "**Common Gotchas.** Use strict `<`, not `<=` (which re-admits self-pairs) and not `<>` (which brings back both orderings). The tie-break column must be unique.\n\n" +
            "**Performance.** A self-join grouped by Country; an index on `(Country, Id)` supports both the match and the ordering.\n\n" +
            "**Interview mindset.** 'unordered pairs from one table' -> self-join plus `a.Id < b.Id`.",
          tsql:
            "SELECT a.Name AS Player1, b.Name AS Player2, a.Country\n" +
            "FROM dbo.Players a\n" +
            "JOIN dbo.Players b\n" +
            "  ON a.Country = b.Country   -- same country\n" +
            " AND a.Id < b.Id             -- one ordering, no self-pairs\n" +
            "ORDER BY a.Name, b.Name;",
          clean:
            "SELECT a.Name AS Player1, b.Name AS Player2, a.Country\n" +
            "FROM dbo.Players a\n" +
            "JOIN dbo.Players b ON a.Country = b.Country AND a.Id < b.Id\n" +
            "ORDER BY a.Name, b.Name;"
        }
      ],
      walkthrough: [
        { step: "Self-join on Country, keep a.Id < b.Id", note: "US players 1,2,4 give (1,2),(1,4),(2,4); UK players 3,5 give (3,5).",
          table: { columns: ["Player1","Player2","Country"],
            rows: [["Ann","Bob","US"],["Ann","Dee","US"],["Bob","Dee","US"],["Cid","Eli","UK"]] } }
      ],
      patternRecognition: [
        "'form pairs / combinations from one table' -> self-join with `a.Id < b.Id`.",
        "Strict `<` gives unordered pairs; `<>` gives ordered pairs (both directions)."
      ],
      interviewRecall: [
        "`a.Id < b.Id` simultaneously removes self-pairs and duplicate orderings.",
        "The inequality column must be a unique key for the dedup to be exact."
      ],
      commonMistakes: [
        "Joining only on Country and returning self-pairs plus every pair twice.",
        "Using `<=` (self-pairs return) or `<>` (both orderings return)."
      ]
    },

    {
      id: "joins2-sales-active-promotions",
      number: "DL 2489",
      platform: "DataLemur",
      title: "Promotions Active on Each Sale Date",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Marketing Analytics"],
      link: "https://datalemur.com/",
      meta: { pattern: "Range / non-equi join", sqlConcept: "Date-range join", technique: "Match on BETWEEN over a period" },
      descriptionBrief:
        "**Sales** records a `SaleDate`; **Promotions** each run from a `StartDate` to an `EndDate` " +
        "(inclusive). For every sale, list which promotions were **running on that date**. A sale can " +
        "fall inside several overlapping promotions, and a sale during no promotion is omitted.",
      schema: [
        { name: "Sales", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "SaleDate", type: "DATE" } ] },
        { name: "Promotions", columns: [
          { name: "Name", type: "VARCHAR(30)", note: "PK" },
          { name: "StartDate", type: "DATE" },
          { name: "EndDate", type: "DATE" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Sales','U') IS NOT NULL DROP TABLE dbo.Sales;\n" +
        "IF OBJECT_ID('dbo.Promotions','U') IS NOT NULL DROP TABLE dbo.Promotions;\n" +
        "CREATE TABLE dbo.Sales (Id INT PRIMARY KEY, SaleDate DATE);\n" +
        "CREATE TABLE dbo.Promotions (Name VARCHAR(30) PRIMARY KEY, StartDate DATE, EndDate DATE);\n" +
        "INSERT INTO dbo.Sales VALUES\n" +
        "  (1,'2024-01-05'),(2,'2024-01-15'),(3,'2024-02-10'),(4,'2024-03-01');\n" +
        "INSERT INTO dbo.Promotions VALUES\n" +
        "  ('NewYear','2024-01-01','2024-01-10'),\n" +
        "  ('Winter','2024-01-01','2024-01-31'),\n" +
        "  ('Spring','2024-03-01','2024-03-31');",
      sampleData: [
        { table: "Sales", columns: ["Id","SaleDate"],
          rows: [[1,"2024-01-05"],[2,"2024-01-15"],[3,"2024-02-10"],[4,"2024-03-01"]] },
        { table: "Promotions", columns: ["Name","StartDate","EndDate"],
          rows: [["NewYear","2024-01-01","2024-01-10"],["Winter","2024-01-01","2024-01-31"],["Spring","2024-03-01","2024-03-31"]] }
      ],
      expectedOutput: { columns: ["SaleId","SaleDate","Promotion"],
        rows: [[1,"2024-01-05","NewYear"],[1,"2024-01-05","Winter"],[2,"2024-01-15","Winter"],[4,"2024-03-01","Spring"]] },
      approaches: [
        {
          name: "Date-range non-equi join (recommended)",
          perfNote: "The join predicate is a range test, so each sale matches every promotion whose window contains it; a sale inside two overlapping promotions produces two rows.",
          dialectNote: "`BETWEEN` on DATE is inclusive of both endpoints, matching the 'runs through EndDate' rule.",
          logic:
            "**What it asks.** For each sale date, the promotions live on that day, expanding to one row per matching promotion.\n\n" +
            "**Why the naive idea fails.** There is no shared key between a sale and a promotion; a sale date does not equal any single promotion column. Membership in a period is a *condition*, not an equality.\n\n" +
            "**Key Idea.** Join on a range: `SaleDate BETWEEN StartDate AND EndDate`. Overlapping promotions each satisfy the predicate, so the join naturally fans out to all of them.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Sales s JOIN Promotions p ON s.SaleDate BETWEEN p.StartDate AND p.EndDate`.\n" +
            "2. Project the sale, its date, and the matching promotion name.\n" +
            "3. Order by sale id, then promotion.\n\n" +
            "**Why it works.** A non-equi join tests any boolean per (sale, promotion) combination; the range predicate is true for exactly the promotions covering that date, including several when windows overlap.\n\n" +
            "**Common Gotchas.** BETWEEN is inclusive on both ends, so a sale on a StartDate or EndDate counts. INNER JOIN drops sales that fall in no promotion (the Feb sale here) - switch to LEFT JOIN if you must keep them.\n\n" +
            "**Performance.** Range predicates can't use an equality hash join; the small Promotions table makes a nested-loop range scan cheap. A range index on `(StartDate, EndDate)` helps at scale.\n\n" +
            "**Interview mindset.** 'match a point to every covering interval' -> non-equi join on BETWEEN, expect fan-out on overlaps.",
          tsql:
            "SELECT s.Id AS SaleId, s.SaleDate, p.Name AS Promotion\n" +
            "FROM dbo.Sales s\n" +
            "JOIN dbo.Promotions p\n" +
            "  ON s.SaleDate BETWEEN p.StartDate AND p.EndDate   -- point-in-interval, non-equi\n" +
            "ORDER BY s.Id, p.Name;",
          clean:
            "SELECT s.Id AS SaleId, s.SaleDate, p.Name AS Promotion\n" +
            "FROM dbo.Sales s\n" +
            "JOIN dbo.Promotions p ON s.SaleDate BETWEEN p.StartDate AND p.EndDate\n" +
            "ORDER BY s.Id, p.Name;"
        }
      ],
      walkthrough: [
        { step: "Range-join each sale to covering promotions", note: "Jan 5 sits in NewYear and Winter; Jan 15 only in Winter; Feb 10 in none (dropped); Mar 1 in Spring.",
          table: { columns: ["SaleId","SaleDate","Promotion"],
            rows: [[1,"2024-01-05","NewYear"],[1,"2024-01-05","Winter"],[2,"2024-01-15","Winter"],[4,"2024-03-01","Spring"]] } }
      ],
      patternRecognition: [
        "'which intervals contain this point' -> non-equi join on `point BETWEEN start AND end`.",
        "Overlapping intervals fan a single point out to multiple rows."
      ],
      interviewRecall: [
        "BETWEEN is inclusive on both bounds; boundary dates match.",
        "INNER range join drops points covered by no interval; LEFT keeps them with NULLs."
      ],
      commonMistakes: [
        "Assuming a join must be an equality and missing that a range predicate is valid.",
        "Not expecting fan-out when promotion windows overlap."
      ]
    },

    {
      id: "joins2-actors-per-movie",
      number: "HR 4127",
      platform: "HackerRank",
      title: "Number of Actors per Movie",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins", "Aggregation & Grouping"],
      domains: ["Entertainment Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Bridge join then aggregate", sqlConcept: "Junction JOIN + COUNT", technique: "Count relationships per entity" },
      descriptionBrief:
        "**Movies** and **Actors** relate many-to-many through a **MovieCast** bridge of " +
        "`(MovieId, ActorId)` rows. Return each movie that has a cast alongside its **number of " +
        "distinct actors**, ordered by title. Movies with no cast are excluded.",
      schema: [
        { name: "Movies", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Title", type: "VARCHAR(50)" } ] },
        { name: "Actors", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "MovieCast", columns: [
          { name: "MovieId", type: "INT", note: "FK -> Movies.Id" },
          { name: "ActorId", type: "INT", note: "FK -> Actors.Id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.MovieCast','U') IS NOT NULL DROP TABLE dbo.MovieCast;\n" +
        "IF OBJECT_ID('dbo.Movies','U') IS NOT NULL DROP TABLE dbo.Movies;\n" +
        "IF OBJECT_ID('dbo.Actors','U') IS NOT NULL DROP TABLE dbo.Actors;\n" +
        "CREATE TABLE dbo.Movies (Id INT PRIMARY KEY, Title VARCHAR(50));\n" +
        "CREATE TABLE dbo.Actors (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.MovieCast (MovieId INT, ActorId INT);\n" +
        "INSERT INTO dbo.Movies VALUES (1,'Alpha'),(2,'Beta'),(3,'Gamma');\n" +
        "INSERT INTO dbo.Actors VALUES (1,'Amy'),(2,'Bo'),(3,'Cy'),(4,'Di');\n" +
        "INSERT INTO dbo.MovieCast VALUES (1,1),(1,2),(1,3),(2,2),(2,4);",
      sampleData: [
        { table: "Movies", columns: ["Id","Title"], rows: [[1,"Alpha"],[2,"Beta"],[3,"Gamma"]] },
        { table: "Actors", columns: ["Id","Name"], rows: [[1,"Amy"],[2,"Bo"],[3,"Cy"],[4,"Di"]] },
        { table: "MovieCast", columns: ["MovieId","ActorId"], rows: [[1,1],[1,2],[1,3],[2,2],[2,4]] }
      ],
      expectedOutput: { columns: ["Title","ActorCount"], rows: [["Alpha",3],["Beta",2]] },
      approaches: [
        {
          name: "Join through the bridge, then COUNT (recommended)",
          perfNote: "One INNER join of Movies to the bridge, grouped per movie; COUNT of bridge rows gives the cast size without touching the Actors table at all.",
          dialectNote: "",
          logic:
            "**What it asks.** Per movie, how many actors are cast in it.\n\n" +
            "**Why the naive idea fails.** The count of actors is not a column anywhere - it must be derived by counting the relationship rows. And a plain count without grouping collapses the whole table to one number instead of one per movie.\n\n" +
            "**Key Idea.** Join Movies to the MovieCast bridge, `GROUP BY` movie, and `COUNT` the bridge rows: each bridge row is one actor-in-movie relationship.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Movies m JOIN MovieCast mc ON mc.MovieId = m.Id`.\n" +
            "2. `GROUP BY m.Id, m.Title`.\n" +
            "3. `COUNT(mc.ActorId)` (or `COUNT(*)`) for the cast size.\n" +
            "4. Order by title.\n\n" +
            "**Why it works.** The bridge stores one row per (movie, actor) pair, so counting the rows in each movie's group is exactly its actor count. Joining Actors is unnecessary unless you need names.\n\n" +
            "**Common Gotchas.** INNER JOIN drops movies with an empty cast (Gamma) - use LEFT JOIN plus `COUNT(mc.ActorId)` (which counts non-NULLs as 0) to include them. Group by the unique movie key and carry Title along.\n\n" +
            "**Performance.** One join plus a grouped aggregate; an index on `MovieCast(MovieId)` speeds the grouping.\n\n" +
            "**Interview mindset.** 'how many related rows per entity' -> join to the bridge, GROUP BY entity, COUNT.",
          tsql:
            "SELECT m.Title, COUNT(mc.ActorId) AS ActorCount\n" +
            "FROM dbo.Movies m\n" +
            "JOIN dbo.MovieCast mc ON mc.MovieId = m.Id   -- one row per cast member\n" +
            "GROUP BY m.Id, m.Title\n" +
            "ORDER BY m.Title;",
          clean:
            "SELECT m.Title, COUNT(mc.ActorId) AS ActorCount\n" +
            "FROM dbo.Movies m\n" +
            "JOIN dbo.MovieCast mc ON mc.MovieId = m.Id\n" +
            "GROUP BY m.Id, m.Title\n" +
            "ORDER BY m.Title;"
        },
        {
          name: "LEFT JOIN to include empty-cast movies",
          perfNote: "Keeps every movie; COUNT of the bridge key returns 0 for movies with no cast rows, since COUNT ignores NULLs.",
          dialectNote: "",
          logic:
            "**Key Idea.** To report every movie including those with no cast, LEFT JOIN the bridge and count the bridge key so unmatched movies score 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `LEFT JOIN MovieCast mc ON mc.MovieId = m.Id`.\n" +
            "2. `GROUP BY m.Id, m.Title`.\n" +
            "3. `COUNT(mc.ActorId)` - NULLs from unmatched movies are not counted, giving 0.\n\n" +
            "**Why it works.** LEFT JOIN emits a NULL-filled row for a cast-less movie; `COUNT(column)` ignores that NULL and returns 0, whereas `COUNT(*)` would wrongly return 1.\n\n" +
            "**Common Gotchas.** Count the bridge column, not `*` - `COUNT(*)` counts the single NULL row as 1 for empty-cast movies.\n\n" +
            "**Performance.** Same shape as the INNER version with an outer join.\n\n" +
            "**Interview mindset.** 'include the zeros' -> LEFT JOIN + `COUNT(child.key)`, never `COUNT(*)`.",
          tsql:
            "SELECT m.Title, COUNT(mc.ActorId) AS ActorCount\n" +
            "FROM dbo.Movies m\n" +
            "LEFT JOIN dbo.MovieCast mc ON mc.MovieId = m.Id\n" +
            "GROUP BY m.Id, m.Title\n" +
            "ORDER BY m.Title;",
          clean:
            "SELECT m.Title, COUNT(mc.ActorId) AS ActorCount\n" +
            "FROM dbo.Movies m\n" +
            "LEFT JOIN dbo.MovieCast mc ON mc.MovieId = m.Id\n" +
            "GROUP BY m.Id, m.Title\n" +
            "ORDER BY m.Title;"
        }
      ],
      walkthrough: [
        { step: "Join Movies to the cast bridge", note: "Alpha has three bridge rows, Beta two, Gamma none (dropped by INNER).",
          table: { columns: ["Title","ActorId"],
            rows: [["Alpha",1],["Alpha",2],["Alpha",3],["Beta",2],["Beta",4]] } },
        { step: "GROUP BY movie, COUNT rows",
          table: { columns: ["Title","ActorCount"], rows: [["Alpha",3],["Beta",2]] } }
      ],
      patternRecognition: [
        "'count of related items per entity' -> join to the bridge, GROUP BY entity, COUNT.",
        "Include zero-count entities with LEFT JOIN + `COUNT(child.key)`."
      ],
      interviewRecall: [
        "Each bridge row is one relationship; counting them per group gives the relationship count.",
        "`COUNT(col)` ignores NULLs (0 for unmatched); `COUNT(*)` would return 1."
      ],
      commonMistakes: [
        "Using `COUNT(*)` with a LEFT JOIN and reporting 1 for empty-cast movies.",
        "Joining the Actors table needlessly when only a count is required."
      ]
    },

    {
      id: "joins2-bought-a-not-b",
      number: "LC 1327",
      platform: "LeetCode",
      title: "Customers Who Bought A But Not B",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Retail Analytics"],
      link: "https://leetcode.com/",
      meta: { pattern: "Anti-join variant", sqlConcept: "EXISTS + NOT EXISTS", technique: "Presence in one set, absence in another" },
      descriptionBrief:
        "**Customers** and their **Purchases** (`CustomerId`, `Category`). Return the customers who " +
        "bought at least one **Electronics** item but have **never** bought a **Books** item. Combine a " +
        "presence test with an absence test.",
      schema: [
        { name: "Customers", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" } ] },
        { name: "Purchases", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "CustomerId", type: "INT", note: "FK -> Customers.Id" },
          { name: "Category", type: "VARCHAR(30)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Purchases','U') IS NOT NULL DROP TABLE dbo.Purchases;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (Id INT PRIMARY KEY, Name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Purchases (Id INT PRIMARY KEY, CustomerId INT, Category VARCHAR(30));\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cid'),(4,'Dee');\n" +
        "INSERT INTO dbo.Purchases VALUES\n" +
        "  (1,1,'Electronics'),(2,1,'Books'),(3,2,'Electronics'),\n" +
        "  (4,3,'Books'),(5,4,'Electronics'),(6,4,'Toys');",
      sampleData: [
        { table: "Customers", columns: ["Id","Name"], rows: [[1,"Ana"],[2,"Ben"],[3,"Cid"],[4,"Dee"]] },
        { table: "Purchases", columns: ["Id","CustomerId","Category"],
          rows: [[1,1,"Electronics"],[2,1,"Books"],[3,2,"Electronics"],[4,3,"Books"],[5,4,"Electronics"],[6,4,"Toys"]] }
      ],
      expectedOutput: { columns: ["Name"], rows: [["Ben"],["Dee"]] },
      approaches: [
        {
          name: "EXISTS + NOT EXISTS (recommended)",
          perfNote: "Two correlated semi-joins: EXISTS confirms an Electronics purchase, NOT EXISTS confirms no Books purchase. Both short-circuit on the first matching row.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers with an Electronics purchase and zero Books purchases.\n\n" +
            "**Why the naive idea fails.** Filtering purchases to `Category = 'Electronics'` finds Electronics buyers but cannot express 'and never bought Books' on the same filtered rows - a customer's Books purchase is a different row. A single WHERE over one row set can't test presence and absence across the customer's whole history at once.\n\n" +
            "**Key Idea.** Keep a customer only when an Electronics purchase EXISTS *and* a Books purchase does NOT EXIST. Each test scans that customer's purchases independently.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Customers c`.\n" +
            "2. `WHERE EXISTS (SELECT 1 FROM Purchases WHERE CustomerId = c.Id AND Category = 'Electronics')`.\n" +
            "3. `AND NOT EXISTS (SELECT 1 FROM Purchases WHERE CustomerId = c.Id AND Category = 'Books')`.\n" +
            "4. Project the name; order by name.\n\n" +
            "**Why it works.** The two correlated subqueries evaluate over each customer's full purchase set, so presence of one category and absence of another are checked together per customer, not per row.\n\n" +
            "**Common Gotchas.** Prefer NOT EXISTS over `NOT IN`: a NULL CustomerId in the Books subquery would make NOT IN return no rows. Both subqueries must correlate on `c.Id`.\n\n" +
            "**Performance.** Anti/semi joins on `Purchases(CustomerId, Category)`; an index on those columns turns each test into a seek.\n\n" +
            "**Interview mindset.** 'has an X but no Y' -> EXISTS for X, NOT EXISTS for Y, correlated on the entity.",
          tsql:
            "SELECT c.Name\n" +
            "FROM dbo.Customers c\n" +
            "WHERE EXISTS (\n" +
            "        SELECT 1 FROM dbo.Purchases p\n" +
            "        WHERE p.CustomerId = c.Id AND p.Category = 'Electronics')   -- bought Electronics\n" +
            "  AND NOT EXISTS (\n" +
            "        SELECT 1 FROM dbo.Purchases p\n" +
            "        WHERE p.CustomerId = c.Id AND p.Category = 'Books')         -- never bought Books\n" +
            "ORDER BY c.Name;",
          clean:
            "SELECT c.Name\n" +
            "FROM dbo.Customers c\n" +
            "WHERE EXISTS (SELECT 1 FROM dbo.Purchases p WHERE p.CustomerId = c.Id AND p.Category = 'Electronics')\n" +
            "  AND NOT EXISTS (SELECT 1 FROM dbo.Purchases p WHERE p.CustomerId = c.Id AND p.Category = 'Books')\n" +
            "ORDER BY c.Name;"
        },
        {
          name: "Conditional aggregation with HAVING",
          perfNote: "One pass over purchases grouped by customer; HAVING tests both conditions with filtered counts. A single scan instead of two correlated subqueries.",
          dialectNote: "",
          logic:
            "**Key Idea.** Group purchases by customer and use `HAVING` to require at least one Electronics row and exactly zero Books rows, via conditional counts.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Purchases GROUP BY CustomerId`.\n" +
            "2. `HAVING COUNT(CASE WHEN Category='Electronics' THEN 1 END) > 0`.\n" +
            "3. `AND COUNT(CASE WHEN Category='Books' THEN 1 END) = 0`.\n" +
            "4. Join back to Customers for the name.\n\n" +
            "**Why it works.** Each conditional COUNT tallies rows of one category within the customer's group; the HAVING encodes 'some Electronics, no Books' directly.\n\n" +
            "**Common Gotchas.** A customer with no purchases at all never appears in the grouped set - fine here, since they bought no Electronics either.\n\n" +
            "**Performance.** Single grouped scan of Purchases; often competitive with the double-subquery form.\n\n" +
            "**Interview mindset.** Offer conditional aggregation as the set-based twin of EXISTS/NOT EXISTS.",
          tsql:
            "SELECT c.Name\n" +
            "FROM dbo.Customers c\n" +
            "JOIN (\n" +
            "    SELECT CustomerId\n" +
            "    FROM dbo.Purchases\n" +
            "    GROUP BY CustomerId\n" +
            "    HAVING COUNT(CASE WHEN Category = 'Electronics' THEN 1 END) > 0\n" +
            "       AND COUNT(CASE WHEN Category = 'Books' THEN 1 END) = 0\n" +
            ") q ON q.CustomerId = c.Id\n" +
            "ORDER BY c.Name;",
          clean:
            "SELECT c.Name\n" +
            "FROM dbo.Customers c\n" +
            "JOIN (\n" +
            "    SELECT CustomerId\n" +
            "    FROM dbo.Purchases\n" +
            "    GROUP BY CustomerId\n" +
            "    HAVING COUNT(CASE WHEN Category = 'Electronics' THEN 1 END) > 0\n" +
            "       AND COUNT(CASE WHEN Category = 'Books' THEN 1 END) = 0\n" +
            ") q ON q.CustomerId = c.Id\n" +
            "ORDER BY c.Name;"
        }
      ],
      walkthrough: [
        { step: "Test each customer for Electronics-present, Books-absent", note: "Ana has both (out); Ben Electronics only (in); Cid Books only (out); Dee Electronics+Toys, no Books (in).",
          table: { columns: ["Name","HasElectronics","HasBooks"],
            rows: [["Ana","yes","yes"],["Ben","yes","no"],["Cid","no","yes"],["Dee","yes","no"]] } },
        { step: "Keep Electronics=yes AND Books=no",
          table: { columns: ["Name"], rows: [["Ben"],["Dee"]] } }
      ],
      patternRecognition: [
        "'has an X but not a Y' -> EXISTS for X combined with NOT EXISTS for Y.",
        "Presence-and-absence across an entity's rows -> correlated subqueries or conditional aggregation."
      ],
      interviewRecall: [
        "EXISTS and NOT EXISTS each scan the entity's related rows independently.",
        "NOT EXISTS is NULL-safe where NOT IN is not."
      ],
      commonMistakes: [
        "Filtering to Electronics rows and then trying to also exclude Books on the same rows.",
        "Using NOT IN with a subquery that can yield NULL and getting an empty result."
      ]
    },

    {
      id: "joins2-employees-optional-parking",
      number: "HR 3308",
      platform: "HackerRank",
      title: "Employees and Their Optional Parking Spot",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins"],
      domains: ["Facilities Analytics"],
      link: "https://www.hackerrank.com/",
      meta: { pattern: "Preserve-left join", sqlConcept: "LEFT JOIN vs INNER/RIGHT/FULL", technique: "Keep unmatched rows on the chosen side" },
      descriptionBrief:
        "**Employees** may (or may not) be assigned a **ParkingSpots** row via a nullable `SpotId`. " +
        "List **every employee** with their spot location, showing `NULL` for those without a spot. " +
        "Some spots may also be unassigned to anyone.",
      schema: [
        { name: "ParkingSpots", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Location", type: "VARCHAR(20)" } ] },
        { name: "Employees", columns: [
          { name: "Id", type: "INT", note: "PK" },
          { name: "Name", type: "VARCHAR(50)" },
          { name: "SpotId", type: "INT", note: "FK -> ParkingSpots.Id (nullable)" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "IF OBJECT_ID('dbo.ParkingSpots','U') IS NOT NULL DROP TABLE dbo.ParkingSpots;\n" +
        "CREATE TABLE dbo.ParkingSpots (Id INT PRIMARY KEY, Location VARCHAR(20));\n" +
        "CREATE TABLE dbo.Employees (Id INT PRIMARY KEY, Name VARCHAR(50), SpotId INT);\n" +
        "INSERT INTO dbo.ParkingSpots VALUES (10,'A1'),(20,'B2'),(30,'C3');\n" +
        "INSERT INTO dbo.Employees VALUES (1,'Ana',10),(2,'Ben',NULL),(3,'Cid',20);",
      sampleData: [
        { table: "ParkingSpots", columns: ["Id","Location"], rows: [[10,"A1"],[20,"B2"],[30,"C3"]] },
        { table: "Employees", columns: ["Id","Name","SpotId"], rows: [[1,"Ana",10],[2,"Ben",null],[3,"Cid",20]] }
      ],
      expectedOutput: { columns: ["Name","Location"], rows: [["Ana","A1"],["Ben",null],["Cid","B2"]] },
      approaches: [
        {
          name: "LEFT JOIN preserving all employees (recommended)",
          perfNote: "LEFT JOIN keeps every employee row; the spot lookup is a PK seek, and unassigned employees carry NULL for the spot columns.",
          dialectNote: "",
          logic:
            "**What it asks.** Every employee, with their parking location or NULL if they have none.\n\n" +
            "**Why the naive idea fails.** An INNER JOIN keeps only employees whose SpotId matches a spot, so Ben (no spot) would vanish - but the task explicitly wants all employees.\n\n" +
            "**Key Idea.** LEFT JOIN from Employees to ParkingSpots: the left (employee) side is preserved in full, and unmatched employees get NULLs from the spot side.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM Employees e` as the preserved side.\n" +
            "2. `LEFT JOIN ParkingSpots s ON s.Id = e.SpotId`.\n" +
            "3. Project the name and `s.Location` (NULL when unmatched).\n" +
            "4. Order by name.\n\n" +
            "**Why it works.** LEFT JOIN emits every left row regardless of a match; when `SpotId` is NULL or matches nothing, the joined spot columns are NULL, exactly the required output.\n\n" +
            "**Common Gotchas.** The choice of *which* table is the preserved side matters: LEFT keeps all employees but drops the unassigned spot C3. A RIGHT JOIN would keep all spots instead; a FULL OUTER JOIN would keep both employees and the empty spot. Pick the side the question asks to preserve.\n\n" +
            "**Performance.** One outer join on the PK of ParkingSpots; a seek per employee.\n\n" +
            "**Interview mindset.** 'list all of X with optional Y' -> LEFT JOIN with X on the left.",
          tsql:
            "SELECT e.Name, s.Location\n" +
            "FROM dbo.Employees e\n" +
            "LEFT JOIN dbo.ParkingSpots s ON s.Id = e.SpotId   -- keep every employee\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name, s.Location\n" +
            "FROM dbo.Employees e\n" +
            "LEFT JOIN dbo.ParkingSpots s ON s.Id = e.SpotId\n" +
            "ORDER BY e.Name;"
        },
        {
          name: "RIGHT JOIN reversed (same result, different anchor)",
          perfNote: "Equivalent output by flipping the anchor: spots on the right of a RIGHT JOIN preserves the employee side. Shown to make the LEFT/RIGHT symmetry explicit.",
          dialectNote: "A RIGHT JOIN is a LEFT JOIN with the tables swapped; SQL Server supports both.",
          logic:
            "**Key Idea.** The same 'keep all employees' result comes from writing ParkingSpots first and RIGHT JOINing Employees, since a RIGHT JOIN preserves the *right* table.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `FROM ParkingSpots s RIGHT JOIN Employees e ON s.Id = e.SpotId`.\n" +
            "2. The right side (Employees) is preserved; unmatched employees get NULL locations.\n" +
            "3. Project name and location; order by name.\n\n" +
            "**Why it works.** RIGHT JOIN is the mirror of LEFT JOIN; whichever table sits on the preserved side keeps all its rows.\n\n" +
            "**Common Gotchas.** RIGHT JOINs read less naturally and are easy to misattribute - most authors standardize on LEFT JOIN. Do not confuse which side is preserved.\n\n" +
            "**Performance.** Identical plan to the LEFT form; the optimizer treats them the same.\n\n" +
            "**Interview mindset.** Know that LEFT and RIGHT are mirror images; prefer LEFT for readability.",
          tsql:
            "SELECT e.Name, s.Location\n" +
            "FROM dbo.ParkingSpots s\n" +
            "RIGHT JOIN dbo.Employees e ON s.Id = e.SpotId   -- Employees (right) preserved\n" +
            "ORDER BY e.Name;",
          clean:
            "SELECT e.Name, s.Location\n" +
            "FROM dbo.ParkingSpots s\n" +
            "RIGHT JOIN dbo.Employees e ON s.Id = e.SpotId\n" +
            "ORDER BY e.Name;"
        }
      ],
      walkthrough: [
        { step: "LEFT JOIN employees to spots", note: "Ana->A1, Cid->B2; Ben has NULL SpotId so no spot matches -> NULL location. Spot C3 (unassigned) is not shown.",
          table: { columns: ["Name","Location"], rows: [["Ana","A1"],["Ben",null],["Cid","B2"]] } }
      ],
      patternRecognition: [
        "'all of X, plus Y when it exists' -> LEFT JOIN with X preserved.",
        "INNER drops unmatched X; RIGHT preserves the other table; FULL preserves both."
      ],
      interviewRecall: [
        "LEFT JOIN keeps every left row; unmatched right columns come back NULL.",
        "RIGHT JOIN is LEFT JOIN with the tables swapped; FULL OUTER keeps unmatched rows from both."
      ],
      commonMistakes: [
        "Using INNER JOIN and dropping employees with no assigned spot.",
        "Assuming the join also surfaces spots that no employee occupies (it does not, under LEFT)."
      ]
    }

  ]);
})();
