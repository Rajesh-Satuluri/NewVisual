/*
 * data/sql/practice_extra.js — additional SQL practice problems.
 * Three classic interview patterns authored fresh for this tool (not copied
 * from any source): an anti-join, a HAVING threshold, and a correlated
 * anti-join against the same table. T-SQL for SQL Server 2019/2022, runnable
 * as-is in SSMS 19/21. Ids prefixed "px-".
 */
(function () {

  /* ================================================================== */
  /* 1) Anti-join -> Joins                                               */
  /* ================================================================== */
  window.SQLLAB.register("Joins", [
    {
      id: "px-customers-never-ordered",
      number: "LC 183",
      platform: "Classic",
      title: "Customers Who Never Ordered",
      difficulty: "Easy",
      category: "Joins",
      topics: ["Joins", "Filtering & Subqueries"],
      domains: ["E-commerce Analytics"],
      link: "https://leetcode.com/problems/customers-who-never-order/",
      meta: { pattern: "Anti-join", sqlConcept: "LEFT JOIN ... IS NULL / NOT EXISTS", technique: "Find rows in A with no match in B" },
      descriptionBrief:
        "Given a **Customers** table (`id`, `name`) and an **Orders** table (`id`, `customer_id`), " +
        "return the names of all customers who have **never placed an order**.",
      schema: [
        { name: "Customers", columns: [
          { name: "id", type: "INT", note: "PK" },
          { name: "name", type: "VARCHAR(50)" } ] },
        { name: "Orders", columns: [
          { name: "id", type: "INT", note: "PK" },
          { name: "customer_id", type: "INT", note: "FK -> Customers.id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Orders','U')    IS NOT NULL DROP TABLE dbo.Orders;\n" +
        "IF OBJECT_ID('dbo.Customers','U') IS NOT NULL DROP TABLE dbo.Customers;\n" +
        "CREATE TABLE dbo.Customers (id INT PRIMARY KEY, name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Orders (id INT PRIMARY KEY, customer_id INT);\n" +
        "INSERT INTO dbo.Customers VALUES (1,'Joe'),(2,'Henry'),(3,'Sam'),(4,'Max');\n" +
        "INSERT INTO dbo.Orders VALUES (1,3),(2,1);",
      sampleData: [
        { table: "Customers", columns: ["id","name"], rows: [[1,"Joe"],[2,"Henry"],[3,"Sam"],[4,"Max"]] },
        { table: "Orders", columns: ["id","customer_id"], rows: [[1,3],[2,1]] }
      ],
      expectedOutput: { columns: ["name"], rows: [["Henry"],["Max"]] },
      approaches: [
        {
          name: "LEFT JOIN ... IS NULL (recommended)",
          perfNote: "One left join; an index on Orders(customer_id) lets the engine probe matches efficiently and the IS NULL filter keeps only the non-matches.",
          dialectNote: "",
          logic:
            "**What it asks.** Customers with zero orders -- the rows of Customers that have *no* partner in Orders. This is the textbook **anti-join**.\n\n" +
            "**Key Idea.** LEFT JOIN keeps every customer and fills NULLs where no order matched; a customer with no orders therefore has NULL in the order columns. Filter for exactly those.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. LEFT JOIN Customers to Orders on `Orders.customer_id = Customers.id`.\n" +
            "2. A customer who never ordered produces rows with NULL order columns.\n" +
            "3. Keep them with `WHERE o.customer_id IS NULL`.\n" +
            "4. Select the customer name.\n\n" +
            "**Why it works.** The LEFT JOIN guarantees every customer appears at least once; only customers with no matching order get a NULL on the right side, so `IS NULL` isolates exactly the never-ordered set.\n\n" +
            "**Common Gotchas.** Don't filter on the join column in a way that turns the LEFT JOIN back into an inner join -- the `IS NULL` test must be in WHERE on the right table's column.\n\n" +
            "**Performance.** A single join; index `Orders(customer_id)` to speed the match.\n\n" +
            "**Interview mindset.** 'who has none / never' -> anti-join: LEFT JOIN + IS NULL, or NOT EXISTS.",
          tsql:
            "SELECT c.name\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.customer_id = c.id\n" +
            "WHERE o.customer_id IS NULL;",
          clean:
            "SELECT c.name\n" +
            "FROM dbo.Customers c\n" +
            "LEFT JOIN dbo.Orders o ON o.customer_id = c.id\n" +
            "WHERE o.customer_id IS NULL;"
        },
        {
          name: "NOT EXISTS",
          perfNote: "Correlated existence check; the engine can stop at the first matching order per customer, and it is NULL-safe unlike NOT IN.",
          dialectNote: "",
          logic:
            "**Key Idea.** Keep a customer only when *no* order exists for them.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan Customers as the outer query.\n" +
            "2. For each, test `NOT EXISTS (SELECT 1 FROM Orders o WHERE o.customer_id = c.id)`.\n" +
            "3. Keep the ones for which no such order exists.\n\n" +
            "**Why it works.** EXISTS returns true as soon as one matching order is found; NOT EXISTS is therefore true exactly for customers with no orders.\n\n" +
            "**Common Gotchas.** Prefer NOT EXISTS over `NOT IN (SELECT customer_id FROM Orders)` -- if any `customer_id` were NULL, NOT IN would return zero rows. NOT EXISTS is NULL-safe.\n\n" +
            "**Performance.** Short-circuits at the first match; index `Orders(customer_id)`.\n\n" +
            "**Interview mindset.** NOT EXISTS is the most robust anti-join form -- reach for it when NULLs might lurk in the child column.",
          tsql:
            "SELECT c.name\n" +
            "FROM dbo.Customers c\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.Orders o\n" +
            "    WHERE o.customer_id = c.id\n" +
            ");",
          clean:
            "SELECT c.name\n" +
            "FROM dbo.Customers c\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Orders o WHERE o.customer_id = c.id);"
        }
      ]
    }
  ]);

  /* ================================================================== */
  /* 2) HAVING threshold -> Aggregation & Grouping                      */
  /* ================================================================== */
  window.SQLLAB.register("Aggregation & Grouping", [
    {
      id: "px-departments-fewer-than-n",
      number: "DZ 0471",
      platform: "Classic",
      title: "Departments With Fewer Than N Employees",
      difficulty: "Medium",
      category: "Aggregation & Grouping",
      topics: ["Aggregation & Grouping", "Joins"],
      domains: ["HR & People Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Group threshold", sqlConcept: "GROUP BY + HAVING", technique: "Count per group, filter on the count, keep empty groups" },
      descriptionBrief:
        "Given **Employees** (`id`, `name`, `dept_id`) and **Departments** (`id`, `name`), return each " +
        "department's name and its employee count for departments with **fewer than 3 employees** " +
        "(including departments with **zero** employees), fewest first.",
      schema: [
        { name: "Departments", columns: [
          { name: "id", type: "INT", note: "PK" },
          { name: "name", type: "VARCHAR(50)" } ] },
        { name: "Employees", columns: [
          { name: "id", type: "INT", note: "PK" },
          { name: "name", type: "VARCHAR(50)" },
          { name: "dept_id", type: "INT", note: "FK -> Departments.id" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U')   IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "IF OBJECT_ID('dbo.Departments','U') IS NOT NULL DROP TABLE dbo.Departments;\n" +
        "CREATE TABLE dbo.Departments (id INT PRIMARY KEY, name VARCHAR(50));\n" +
        "CREATE TABLE dbo.Employees (id INT PRIMARY KEY, name VARCHAR(50), dept_id INT);\n" +
        "INSERT INTO dbo.Departments VALUES (1,'Engineering'),(2,'Sales'),(3,'Legal'),(4,'Facilities');\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Ann',1),(2,'Bo',1),(3,'Cy',1),(4,'Di',1),  -- Engineering: 4\n" +
        "  (5,'Ed',2),(6,'Fi',2),                          -- Sales: 2\n" +
        "  (7,'Gu',3);                                     -- Legal: 1  (Facilities: 0)",
      sampleData: [
        { table: "Departments", columns: ["id","name"], rows: [[1,"Engineering"],[2,"Sales"],[3,"Legal"],[4,"Facilities"]] },
        { table: "Employees", columns: ["id","name","dept_id"],
          rows: [[1,"Ann",1],[2,"Bo",1],[3,"Cy",1],[4,"Di",1],[5,"Ed",2],[6,"Fi",2],[7,"Gu",3]] }
      ],
      expectedOutput: { columns: ["name","emp_count"], rows: [["Facilities",0],["Legal",1],["Sales",2]] },
      approaches: [
        {
          name: "LEFT JOIN + GROUP BY + HAVING (recommended)",
          perfNote: "One grouped pass over the join; COUNT of a non-null employee column keeps empty departments at zero instead of miscounting them as one.",
          dialectNote: "",
          logic:
            "**What it asks.** Departments staffed by fewer than 3 people -- and crucially, empty departments (0) must appear too.\n\n" +
            "**Why a plain INNER JOIN fails.** An inner join drops departments with no employees entirely, so a 0-count department would never show up. You must keep every department.\n\n" +
            "**Key Idea.** LEFT JOIN Departments to Employees, group by department, and `COUNT(e.id)` -- counting a column from the *employee* side so NULLs (no employees) count as 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. LEFT JOIN Departments d to Employees e on `e.dept_id = d.id`.\n" +
            "2. `GROUP BY d.id, d.name`.\n" +
            "3. `COUNT(e.id)` -> employees per department (0 for empty ones, since COUNT skips NULL).\n" +
            "4. `HAVING COUNT(e.id) < 3`.\n" +
            "5. Order by the count ascending.\n\n" +
            "**Why it works.** The LEFT JOIN preserves every department; counting the nullable employee key (not `COUNT(*)`) makes empty departments total 0, and HAVING filters on the aggregate after grouping.\n\n" +
            "**Common Gotchas.** `COUNT(*)` would count the single NULL-filled row of an empty department as 1 -- use `COUNT(e.id)`. And the count threshold must be in HAVING, not WHERE (WHERE can't see aggregates).\n\n" +
            "**Performance.** One grouped scan; index `Employees(dept_id)`.\n\n" +
            "**Interview mindset.** 'per group, include empty groups, filter on the count' -> LEFT JOIN + GROUP BY + COUNT(child_key) + HAVING.",
          tsql:
            "SELECT d.name, COUNT(e.id) AS emp_count\n" +
            "FROM dbo.Departments d\n" +
            "LEFT JOIN dbo.Employees e ON e.dept_id = d.id\n" +
            "GROUP BY d.id, d.name\n" +
            "HAVING COUNT(e.id) < 3\n" +
            "ORDER BY emp_count ASC;",
          clean:
            "SELECT d.name, COUNT(e.id) AS emp_count\n" +
            "FROM dbo.Departments d\n" +
            "LEFT JOIN dbo.Employees e ON e.dept_id = d.id\n" +
            "GROUP BY d.id, d.name\n" +
            "HAVING COUNT(e.id) < 3\n" +
            "ORDER BY emp_count ASC;"
        },
        {
          name: "Correlated count subquery",
          perfNote: "Computes each department's headcount with a scalar subquery; one probe per department, cheap with an index on Employees(dept_id).",
          dialectNote: "",
          logic:
            "**Key Idea.** For each department, count its employees inline, then filter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan Departments d.\n" +
            "2. Compute `(SELECT COUNT(*) FROM Employees e WHERE e.dept_id = d.id)` as the headcount.\n" +
            "3. Keep departments where that count < 3; order ascending.\n\n" +
            "**Why it works.** The correlated subquery naturally returns 0 for a department with no matching employees, so empty departments are included without any special handling.\n\n" +
            "**Common Gotchas.** Repeating the subquery in both SELECT and WHERE duplicates work; surface it once via a derived table/CTE if the engine doesn't fold it.\n\n" +
            "**Performance.** One count probe per department; index `Employees(dept_id)`.\n\n" +
            "**Interview mindset.** A correlated COUNT is the subquery mirror of GROUP BY and sidesteps the COUNT(*)-vs-COUNT(col) empty-group trap.",
          tsql:
            "SELECT d.name,\n" +
            "       (SELECT COUNT(*) FROM dbo.Employees e WHERE e.dept_id = d.id) AS emp_count\n" +
            "FROM dbo.Departments d\n" +
            "WHERE (SELECT COUNT(*) FROM dbo.Employees e WHERE e.dept_id = d.id) < 3\n" +
            "ORDER BY emp_count ASC;",
          clean:
            "SELECT d.name, cnt.emp_count\n" +
            "FROM dbo.Departments d\n" +
            "CROSS APPLY (SELECT COUNT(*) AS emp_count FROM dbo.Employees e WHERE e.dept_id = d.id) cnt\n" +
            "WHERE cnt.emp_count < 3\n" +
            "ORDER BY cnt.emp_count ASC;"
        }
      ]
    }
  ]);

  /* ================================================================== */
  /* 3) Correlated anti-join on the same table -> Joins                 */
  /* ================================================================== */
  window.SQLLAB.register("Joins", [
    {
      id: "px-employee-no-manager-same-dept",
      number: "DZ 0472",
      platform: "Classic",
      title: "Employees With No Manager in Their Department",
      difficulty: "Medium",
      category: "Joins",
      topics: ["Joins", "Filtering & Subqueries"],
      domains: ["HR & People Analytics"],
      link: "https://www.stratascratch.com/",
      meta: { pattern: "Correlated anti-join (self)", sqlConcept: "NOT EXISTS on the same table", technique: "Row has no partner row satisfying a per-group condition" },
      descriptionBrief:
        "Given **Employees** (`id`, `name`, `dept_id`, `role`), return the employees whose department " +
        "contains **no one with role = 'Manager'** (i.e. teams with no manager at all). Order by `id`.",
      schema: [
        { name: "Employees", columns: [
          { name: "id", type: "INT", note: "PK" },
          { name: "name", type: "VARCHAR(50)" },
          { name: "dept_id", type: "INT" },
          { name: "role", type: "VARCHAR(20)", note: "'Manager' or 'IC'" } ] }
      ],
      setupSql:
        "IF OBJECT_ID('dbo.Employees','U') IS NOT NULL DROP TABLE dbo.Employees;\n" +
        "CREATE TABLE dbo.Employees (id INT PRIMARY KEY, name VARCHAR(50), dept_id INT, role VARCHAR(20));\n" +
        "INSERT INTO dbo.Employees VALUES\n" +
        "  (1,'Ann',10,'Manager'),(2,'Bo',10,'IC'),      -- dept 10 HAS a manager\n" +
        "  (3,'Cy',20,'IC'),(4,'Di',20,'IC'),            -- dept 20 has NO manager\n" +
        "  (5,'Ed',30,'IC');                             -- dept 30 has NO manager",
      sampleData: [
        { table: "Employees", columns: ["id","name","dept_id","role"],
          rows: [[1,"Ann",10,"Manager"],[2,"Bo",10,"IC"],[3,"Cy",20,"IC"],[4,"Di",20,"IC"],[5,"Ed",30,"IC"]] }
      ],
      expectedOutput: { columns: ["id","name","dept_id","role"],
        rows: [[3,"Cy",20,"IC"],[4,"Di",20,"IC"],[5,"Ed",30,"IC"]] },
      approaches: [
        {
          name: "NOT EXISTS on the same table (recommended)",
          perfNote: "A correlated existence check per employee; the subquery stops at the first manager found in the department, and an index on Employees(dept_id, role) makes each probe a short seek.",
          dialectNote: "",
          logic:
            "**What it asks.** Every employee who sits in a department that has *no* manager. The condition is about the employee's whole department, not the employee's own row.\n\n" +
            "**Key Idea.** For each employee, ask: does *anyone* in my department have role 'Manager'? Keep the employee only if the answer is no -- a correlated **anti-join against the same table**.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan Employees as the outer row `e`.\n" +
            "2. Correlate a subquery on the same table, aliased `m`, where `m.dept_id = e.dept_id AND m.role = 'Manager'`.\n" +
            "3. Keep `e` with `NOT EXISTS (...)` -- no manager in that department.\n" +
            "4. Order by id.\n\n" +
            "**Why it works.** EXISTS is true the moment one manager is found in the department; NOT EXISTS is therefore true exactly for employees whose department has none -- which correctly returns *all* members of a manager-less team.\n\n" +
            "**Common Gotchas.** This is a per-department property: don't filter `WHERE e.role <> 'Manager'`, which would merely drop managers, not whole teams. The test must look across the department via the correlated subquery.\n\n" +
            "**Performance.** One short-circuiting probe per row; index `Employees(dept_id, role)`.\n\n" +
            "**Interview mindset.** 'members of groups that lack a row of type X' -> correlated NOT EXISTS on the same table, correlated by the group key.",
          tsql:
            "SELECT e.id, e.name, e.dept_id, e.role\n" +
            "FROM dbo.Employees e\n" +
            "WHERE NOT EXISTS (\n" +
            "    SELECT 1 FROM dbo.Employees m\n" +
            "    WHERE m.dept_id = e.dept_id\n" +
            "      AND m.role = 'Manager'\n" +
            ")\n" +
            "ORDER BY e.id;",
          clean:
            "SELECT e.id, e.name, e.dept_id, e.role\n" +
            "FROM dbo.Employees e\n" +
            "WHERE NOT EXISTS (SELECT 1 FROM dbo.Employees m\n" +
            "                  WHERE m.dept_id = e.dept_id AND m.role = 'Manager')\n" +
            "ORDER BY e.id;"
        },
        {
          name: "Window flag over the department",
          perfNote: "A single partitioned pass tags each row with whether its department has any manager, avoiding a per-row correlated re-scan.",
          dialectNote: "",
          logic:
            "**Key Idea.** In one pass, compute per department whether a manager exists, then keep rows where it doesn't.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In a CTE, add `MAX(CASE WHEN role = 'Manager' THEN 1 ELSE 0 END) OVER (PARTITION BY dept_id)` as `has_mgr`.\n" +
            "2. In the outer query keep rows where `has_mgr = 0`.\n" +
            "3. Order by id.\n\n" +
            "**Why it works.** The windowed MAX over the department is 1 if any member is a manager, 0 otherwise; every row in a manager-less department carries 0, so the filter keeps exactly those teams.\n\n" +
            "**Common Gotchas.** A window function can't go in WHERE directly -- compute `has_mgr` in a CTE/derived table first, then filter.\n\n" +
            "**Performance.** One partitioned window pass; typically beats the correlated form on large tables.\n\n" +
            "**Interview mindset.** When a per-group yes/no drives the filter, a partitioned MAX(CASE...) flag is the one-pass alternative to NOT EXISTS.",
          tsql:
            "WITH E AS (\n" +
            "    SELECT id, name, dept_id, role,\n" +
            "           MAX(CASE WHEN role = 'Manager' THEN 1 ELSE 0 END)\n" +
            "             OVER (PARTITION BY dept_id) AS has_mgr\n" +
            "    FROM dbo.Employees\n" +
            ")\n" +
            "SELECT id, name, dept_id, role\n" +
            "FROM E\n" +
            "WHERE has_mgr = 0\n" +
            "ORDER BY id;",
          clean:
            "WITH E AS (\n" +
            "    SELECT id, name, dept_id, role,\n" +
            "           MAX(CASE WHEN role='Manager' THEN 1 ELSE 0 END) OVER (PARTITION BY dept_id) AS has_mgr\n" +
            "    FROM dbo.Employees\n" +
            ")\n" +
            "SELECT id, name, dept_id, role FROM E WHERE has_mgr = 0 ORDER BY id;"
        }
      ]
    }
  ]);

})();
