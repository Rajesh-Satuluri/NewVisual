/*
 * PySpark Interview Lab — Joins (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Most joins are WIDE (shuffle) unless one side is small enough to broadcast.
 */
(function () {
  var CAT = "Joins";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q51
    {
      id: "inner-join-customers-orders",
      lc: 51,
      title: "Inner join customers and orders on customer_id",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Inner join", transformation: "Wide (shuffle)", functions: "join, col" },
      description:
        "Given `customers` (`customer_id`, `name`) and `orders` (`order_id`, `customer_id`, `order_amount`), return one row per order enriched with the customer's `name`. Use an **inner** join on `customer_id` so only orders that have a matching customer (and customers who have orders) survive.",
      examples: [
        {
          input: "customers: (1, 'Mira'), (2, 'Kabir'); orders: (10, 1, 200), (11, 3, 90)",
          output: "one row: (10, 1, 200, 'Mira')",
          reasoning: "Order 10 matches customer 1. Order 11 (customer 3) has no matching customer, and customer 2 has no order, so both drop under inner join."
        }
      ],
      approaches: [
        {
          name: "join with how='inner'",
          whenToUse: "You only want records that exist on both sides.",
          logic:
            "**What it asks.** Combine each order with its customer, keeping only matched pairs.\n\n" +
            "**Key Idea.** `customers.join(orders, on='customer_id', how='inner')`. When both DataFrames share the key name, pass `on='customer_id'` (a string) so Spark coalesces the key into a **single** output column.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Confirm both sides have `customer_id`.\n" +
            "2. Call `join(orders, on='customer_id', how='inner')`.\n" +
            "3. `select` the columns you actually need.\n\n" +
            "**Why it works.** An inner join keeps a row only when the key matches on both sides; unmatched keys on either side are dropped.\n\n" +
            "**Common Gotchas.**\n" +
            "- Joining on the string key `on='customer_id'` avoids a duplicate key column; joining on an expression (`c.customer_id == o.customer_id`) leaves **two** key columns you must drop.\n" +
            "- `inner` is the default `how`, but state it for clarity.\n\n" +
            "**Interview mindset.** Say \"inner\" out loud and note it silently drops unmatched rows on both sides — the top source of 'missing rows' bugs.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = customers.join(               # left side\n" +
            "    orders,                            # right side\n" +
            "    on='customer_id',                  # shared key -> single output column\n" +
            "    how='inner',                       # keep only matched pairs\n" +
            ")\n" +
            "result.select('order_id', 'customer_id', 'name', 'order_amount').show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = customers.join(orders, on='customer_id', how='inner')\n" +
            "result.select('order_id', 'customer_id', 'name', 'order_amount').show()"
        }
      ],
      sparkInternals:
        "A default equi-join is **wide**: Spark uses a **sort-merge join** (or **shuffle hash join**) — both sides are hash-partitioned by `customer_id` so matching keys land on the same partition, then merged. That shuffle is the cost. If one side is small, a **broadcast join** avoids it entirely (see Q56). Joining on the string key (`on='customer_id'`) produces one key column; joining on an expression yields two identical key columns you must drop. Filter and project **before** the join to shrink what gets shuffled.",
      sparkSql:
        "SELECT o.order_id, o.customer_id, c.name, o.order_amount\n" +
        "FROM customers c JOIN orders o ON c.customer_id = o.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"combine A and B where the key matches\", \"enrich orders with customer info\".",
        "**Say it:** `a.join(b, on='key', how='inner')`; string key = one output column.",
        "**Trap:** inner drops unmatched rows on BOTH sides — use a left join if you must keep all of one side."
      ]
    },

    // ------------------------------------------------------------------ Q52
    {
      id: "left-join-customers-orders",
      lc: 52,
      title: "Left join customers with orders",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Left outer join", transformation: "Wide (shuffle)", functions: "join (how='left')" },
      description:
        "Keep **every** customer, attaching their order details where they exist. Use a `left` (left outer) join from `customers` to `orders` on `customer_id`. Customers with no orders still appear, with null order columns.",
      examples: [
        {
          input: "customers: (1, 'Mira'), (2, 'Kabir'); orders: (10, 1, 200)",
          output: "(1, 'Mira', 10, 200) and (2, 'Kabir', null, null)",
          reasoning: "Kabir has no order, so he is retained with nulls in the order columns — that is the difference from an inner join."
        }
      ],
      approaches: [
        {
          name: "join with how='left'",
          whenToUse: "You must retain every row of the left DataFrame regardless of matches.",
          logic:
            "**What it asks.** All customers, with orders where available.\n\n" +
            "**Key Idea.** `customers.join(orders, on='customer_id', how='left')` preserves all left rows; unmatched right columns come back **null**.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Put the DataFrame you must keep on the left.\n" +
            "2. `join(orders, on='customer_id', how='left')`.\n" +
            "3. Optionally `fillna(0, subset=['order_amount'])` if nulls should read as zero.\n\n" +
            "**Why it works.** A left outer join emits every left row; when no right match exists, right-side fields are filled with null.\n\n" +
            "**Common Gotchas.**\n" +
            "- `left`, `left_outer` and `leftouter` are all the same.\n" +
            "- Nulls in the result mean 'no match', not 'value was null' — decide whether to `fillna`.\n" +
            "- Aggregating after a left join: `count('order_id')` (non-null) counts real orders, `count('*')` counts customers-with-a-row.\n\n" +
            "**Interview mindset.** Left join = 'keep everyone on the left'; the null columns are the tell that a row had no match.",
          rcs:
            "result = customers.join(               # keep all customers\n" +
            "    orders,\n" +
            "    on='customer_id',\n" +
            "    how='left',                        # left outer: unmatched -> null order cols\n" +
            ")\n" +
            "result.show()",
          plain:
            "result = customers.join(orders, on='customer_id', how='left')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Still **wide** — same hash-partition-by-key shuffle as an inner join. The only difference is the join operator emits unmatched left rows with null right columns instead of dropping them, so output can be larger than an inner join. If `orders` is small, broadcasting it turns this into a broadcast left join with no shuffle. Because the left side is preserved in full, filtering the **right** side before the join is safe, but filtering the left side changes which rows you keep.",
      sparkSql:
        "SELECT c.customer_id, c.name, o.order_id, o.order_amount\n" +
        "FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"all customers, including those with no orders\", \"keep everyone on the left\".",
        "**Say it:** `how='left'`; unmatched right columns come back null.",
        "**Trap:** `count('*')` vs `count('order_id')` after a left join count different things."
      ]
    },

    // ------------------------------------------------------------------ Q53
    {
      id: "customers-never-ordered-anti",
      lc: 53,
      title: "Customers who never placed an order (left_anti)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Left anti join", transformation: "Wide (shuffle)", functions: "join (how='left_anti')" },
      description:
        "Return the customers who appear in `customers` but have **no** matching row in `orders`. A `left_anti` join keeps only the left rows that fail to match — the clean, null-safe way to express 'not in'.",
      examples: [
        {
          input: "customers: (1, 'Mira'), (2, 'Kabir'); orders: (10, 1, 200)",
          output: "(2, 'Kabir')",
          reasoning: "Customer 1 has an order so is excluded; customer 2 has none, so the anti-join keeps only her — and it returns left columns only."
        }
      ],
      approaches: [
        {
          name: "join with how='left_anti'",
          whenToUse: "'Rows in A that have no match in B' — non-buyers, orphans, unmatched keys.",
          logic:
            "**What it asks.** Customers with zero orders.\n\n" +
            "**Key Idea.** `customers.join(orders, on='customer_id', how='left_anti')` returns exactly the left rows with **no** match, and only the left columns.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Left = the set you are filtering (`customers`).\n" +
            "2. Right = the presence check (`orders`).\n" +
            "3. `join(orders, on='customer_id', how='left_anti')`.\n\n" +
            "**Why it works.** An anti-join is the complement of the inner join: it emits a left row precisely when the key is absent on the right.\n\n" +
            "**Common Gotchas.**\n" +
            "- The result has **only left columns** — there is nothing to select from `orders`.\n" +
            "- Prefer this over `WHERE customer_id NOT IN (SELECT customer_id FROM orders)`: `NOT IN` is **null-unsafe** — a single null in the subquery makes the whole predicate return no rows.\n\n" +
            "**Interview mindset.** Name it: 'left_anti is NOT EXISTS done right — null-safe and one shuffle.'",
          rcs:
            "result = customers.join(               # left = who we filter\n" +
            "    orders,                            # right = presence check\n" +
            "    on='customer_id',\n" +
            "    how='left_anti',                   # keep left rows with NO match\n" +
            ")\n" +
            "result.show()                          # only customer columns come back",
          plain:
            "result = customers.join(orders, on='customer_id', how='left_anti')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A left anti join is **wide** (hash-partition by key), but the executor keeps only left rows whose key finds no partner, and never materializes right-side columns — so it is often cheaper than a full outer join. Why it beats `NOT IN`: SQL `NOT IN (subquery)` uses three-valued logic — if the subquery yields **any** null, every `NOT IN` test evaluates to UNKNOWN and the query returns **nothing**. `left_anti` (like `NOT EXISTS`) has no such null trap and lets Catalyst pick sort-merge or broadcast. Broadcast the right side when it is small to skip the shuffle.",
      sparkSql:
        "-- Preferred: null-safe anti-join semantics\n" +
        "SELECT c.* FROM customers c\n" +
        "LEFT ANTI JOIN orders o ON c.customer_id = o.customer_id;\n" +
        "-- Equivalent, also null-safe:\n" +
        "SELECT * FROM customers c\n" +
        "WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);",
      recognizeRecall: [
        "**Spot it:** \"never ordered\", \"has no matching…\", \"in A but not in B\".",
        "**Say it:** `how='left_anti'`; returns left columns only; it's NOT EXISTS, null-safe.",
        "**Trap:** never use `NOT IN` with a nullable subquery — one null returns zero rows."
      ]
    },

    // ------------------------------------------------------------------ Q54
    {
      id: "orphan-orders-anti",
      lc: 54,
      title: "Orders whose customer_id does not exist in customers",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Left anti join (orders side)", transformation: "Wide (shuffle)", functions: "join (how='left_anti')" },
      description:
        "Find **orphan** orders — rows in `orders` whose `customer_id` has no match in `customers` (a referential-integrity check). Put `orders` on the left of a `left_anti` join so unmatched orders are returned.",
      examples: [
        {
          input: "orders: (10, 1, 200), (11, 3, 90); customers: (1, 'Mira'), (2, 'Kabir')",
          output: "(11, 3, 90)",
          reasoning: "Order 11 references customer 3, who is absent from customers, so the anti-join keeps it. Order 10 matches customer 1 and is dropped."
        }
      ],
      approaches: [
        {
          name: "left_anti with orders as the left side",
          whenToUse: "Detecting dangling foreign keys / dirty data before an inner join.",
          logic:
            "**What it asks.** Orders pointing at a non-existent customer.\n\n" +
            "**Key Idea.** Same anti-join as Q53 but with the sides swapped: `orders.join(customers, on='customer_id', how='left_anti')`. Whatever is on the **left** is what you filter.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Left = `orders` (the rows you want to inspect).\n" +
            "2. Right = `customers` (the dimension that should contain every key).\n" +
            "3. `join(customers, on='customer_id', how='left_anti')`.\n\n" +
            "**Why it works.** The anti-join returns each left (order) row whose `customer_id` is missing from the right (customers).\n\n" +
            "**Common Gotchas.**\n" +
            "- Direction matters: anti-join is **not** symmetric — Q53 filters customers, Q54 filters orders.\n" +
            "- Result carries only the **order** columns.\n" +
            "- As in Q53, avoid `customer_id NOT IN (SELECT customer_id FROM customers)` — nulls in the customer key would silently return nothing.\n\n" +
            "**Interview mindset.** Frame it as a data-quality check: orphan foreign keys you'd otherwise lose in an inner join.",
          rcs:
            "result = orders.join(                  # left = orders (rows to inspect)\n" +
            "    customers,                         # right = the dimension of valid keys\n" +
            "    on='customer_id',\n" +
            "    how='left_anti',                   # orders whose customer_id is missing\n" +
            ")\n" +
            "result.show()                          # only order columns come back",
          plain:
            "result = orders.join(customers, on='customer_id', how='left_anti')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Mechanically identical to Q53 — a **wide** anti-join — but the swapped sides change the meaning entirely: anti-join is directional. It is the idiomatic **referential-integrity** probe (dangling foreign keys) and is null-safe, unlike `NOT IN`, whose three-valued logic collapses to an empty result if the customer key column contains any null. Broadcast `customers` when it is the small dimension table to avoid shuffling `orders`.",
      sparkSql:
        "SELECT o.* FROM orders o\n" +
        "LEFT ANTI JOIN customers c ON o.customer_id = c.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"orders with an invalid/unknown customer\", \"orphan rows\", \"foreign key not found\".",
        "**Say it:** `orders.join(customers, on='customer_id', how='left_anti')`; direction chooses which side you keep.",
        "**Trap:** anti-join isn't symmetric — the LEFT side is the one you filter."
      ]
    },

    // ------------------------------------------------------------------ Q55
    {
      id: "join-employees-departments",
      lc: 55,
      title: "Join employees with departments on department_id",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Inner join (dimension lookup)", transformation: "Narrow (broadcast)", functions: "join, broadcast" },
      description:
        "Attach each employee's department **name** by joining `employees` (`employee_id`, `name`, `department_id`) to a small `departments` lookup (`department_id`, `department_name`) on `department_id`. This is a classic large-fact-to-small-dimension join.",
      examples: [
        {
          input: "employees: (1, 'Nadia', 10), (2, 'Omar', 20); departments: (10, 'Engineering'), (20, 'Sales')",
          output: "(1, 'Nadia', 'Engineering'), (2, 'Omar', 'Sales')",
          reasoning: "Each employee's department_id is matched to the department row and the name is attached."
        }
      ],
      approaches: [
        {
          name: "broadcast the small departments table",
          whenToUse: "One side (the dimension) is small enough to fit in each executor's memory.",
          logic:
            "**What it asks.** Enrich each employee with their department name.\n\n" +
            "**Key Idea.** `employees.join(broadcast(departments), on='department_id', how='inner')`. Because `departments` is tiny, wrapping it in `broadcast()` ships a copy to every executor and joins **locally** — no shuffle of the large `employees` side.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Identify the small side (`departments`).\n" +
            "2. `from pyspark.sql.functions import broadcast`.\n" +
            "3. `employees.join(broadcast(departments), on='department_id')`.\n\n" +
            "**Why it works.** A broadcast (map-side) join replaces the shuffle with a local hash lookup against the in-memory copy of the small table.\n\n" +
            "**Common Gotchas.**\n" +
            "- Only broadcast tables that comfortably fit in memory (default auto-broadcast threshold is ~10MB; the hint forces it).\n" +
            "- A missing `department_id` drops the employee under an inner join — use `left` if every employee must survive.\n\n" +
            "**Interview mindset.** Volunteer 'broadcast join' for any large-fact / small-dimension lookup — it's the single most common join optimization.",
          rcs:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "result = employees.join(               # large fact table\n" +
            "    broadcast(departments),            # small dim -> shipped to every executor\n" +
            "    on='department_id',                # shared key -> one output column\n" +
            "    how='inner',\n" +
            ")\n" +
            "result.select('employee_id', 'name', 'department_name').show()",
          plain:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "result = employees.join(broadcast(departments), on='department_id', how='inner')\n" +
            "result.select('employee_id', 'name', 'department_name').show()"
        }
      ],
      sparkInternals:
        "With `broadcast(departments)` this is effectively **narrow**: Spark builds a hash table of the small side on the driver, ships it to every executor, and each `employees` partition probes it locally — **no shuffle** of the big table. Spark also auto-broadcasts any side under `spark.sql.autoBroadcastJoinThreshold` (default 10MB); the explicit hint forces it when stats are missing. Without broadcast this falls back to a wide sort-merge join. The win scales with how lopsided the two sides are.",
      sparkSql:
        "SELECT /*+ BROADCAST(d) */ e.employee_id, e.name, d.department_name\n" +
        "FROM employees e JOIN departments d ON e.department_id = d.department_id;",
      recognizeRecall: [
        "**Spot it:** \"look up the department/category name\", large table joined to a small reference table.",
        "**Say it:** `join(broadcast(small_df), on='key')` — map-side, no shuffle.",
        "**Trap:** only broadcast tables that fit in memory; inner join drops unmatched employees."
      ]
    },

    // ------------------------------------------------------------------ Q56
    {
      id: "revenue-by-product-category",
      lc: 56,
      title: "Total revenue by product category",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Join + groupBy aggregate", transformation: "Wide (shuffle)", functions: "join, broadcast, groupBy, sum" },
      description:
        "Join `orders` (`order_id`, `product_id`, `order_amount`) to `products` (`product_id`, `category`) to attach each order's category, then compute **total revenue per category** by summing `order_amount` within each category.",
      examples: [
        {
          input: "orders: (1, p1, 200), (2, p2, 50), (3, p1, 100); products: (p1, 'Books'), (p2, 'Toys')",
          output: "Books -> 300, Toys -> 50",
          reasoning: "Orders 1 and 3 map to Books (200+100=300); order 2 maps to Toys (50)."
        }
      ],
      approaches: [
        {
          name: "broadcast products, then groupBy category",
          whenToUse: "A fact table (orders) joined to a small dimension (products), then rolled up.",
          logic:
            "**What it asks.** Revenue summed per product category.\n\n" +
            "**Key Idea.** Two steps: (1) `orders.join(broadcast(products), on='product_id')` to attach `category`, then (2) `groupBy('category').agg(sum('order_amount'))`. Broadcasting the small `products` table skips one shuffle; the groupBy still needs its own.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `orders.join(broadcast(products), on='product_id', how='inner')`.\n" +
            "2. `.groupBy('category')`.\n" +
            "3. `.agg(sum('order_amount').alias('total_revenue'))`.\n" +
            "4. `orderBy(col('total_revenue').desc())` for a report.\n\n" +
            "**Why it works.** The broadcast join enriches each order with its category locally; the groupBy then reduces by category after a single (aggregate) shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- Alias the aggregate or you get `sum(order_amount)` as the column name.\n" +
            "- `sum` ignores nulls; an order with a null amount contributes nothing (not zero rows).\n" +
            "- Project only `product_id`, `order_amount`, `category` before the groupBy to shrink the shuffle.\n\n" +
            "**Interview mindset.** Call out the two shuffles you avoided vs. incurred: broadcast removes the join shuffle, the aggregate still costs one.",
          rcs:
            "from pyspark.sql.functions import broadcast, sum as _sum, col\n" +
            "\n" +
            "enriched = orders.join(                # attach category to each order\n" +
            "    broadcast(products),               # small dim -> no shuffle on orders\n" +
            "    on='product_id',\n" +
            "    how='inner',\n" +
            ")\n" +
            "result = (enriched\n" +
            "    .groupBy('category')               # reduce by category (aggregate shuffle)\n" +
            "    .agg(_sum('order_amount').alias('total_revenue'))\n" +
            "    .orderBy(col('total_revenue').desc()))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import broadcast, sum as _sum, col\n" +
            "\n" +
            "enriched = orders.join(broadcast(products), on='product_id', how='inner')\n" +
            "result = (enriched\n" +
            "    .groupBy('category')\n" +
            "    .agg(_sum('order_amount').alias('total_revenue'))\n" +
            "    .orderBy(col('total_revenue').desc()))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two operators, two very different costs. The **join** is made **narrow** by `broadcast(products)`: Spark ships the small product dimension to every executor and each `orders` partition probes it in memory — no shuffle of the large fact table. The **groupBy-sum** is **wide** but map-side pre-aggregated (each partition pre-sums per category, then only partials shuffle). If `products` were large, the join would become a sort-merge join and you'd pay two shuffles. Broadcasting the dimension is the standard star-schema optimization.",
      sparkSql:
        "SELECT /*+ BROADCAST(p) */ p.category, SUM(o.order_amount) AS total_revenue\n" +
        "FROM orders o JOIN products p ON o.product_id = p.product_id\n" +
        "GROUP BY p.category ORDER BY total_revenue DESC;",
      recognizeRecall: [
        "**Spot it:** \"revenue/total by category\" where category lives in a separate products table.",
        "**Say it:** `join(broadcast(products))` then `groupBy('category').agg(sum(...))`.",
        "**Trap:** broadcast removes the join shuffle but the groupBy still shuffles — don't claim 'no shuffle'."
      ]
    },

    // ------------------------------------------------------------------ Q57
    {
      id: "three-way-join-customer-revenue",
      lc: 57,
      title: "Three-way join for customer-level revenue",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Multi-way join + aggregate", transformation: "Wide (shuffle)", functions: "join, broadcast, groupBy, sum" },
      description:
        "Join three DataFrames — `customers` (`customer_id`, `name`), `orders` (`order_id`, `customer_id`, `product_id`, `quantity`), and `products` (`product_id`, `price`) — to compute each customer's **total revenue**, where a line's revenue is `quantity * price`. Group the result by customer.",
      examples: [
        {
          input: "customers: (1,'Mira'); orders: (10,1,p1,2),(11,1,p2,1); products: (p1,50),(p2,30)",
          output: "Mira -> 130",
          reasoning: "Line 10: 2*50=100; line 11: 1*30=30; Mira's total = 130."
        }
      ],
      approaches: [
        {
          name: "chain joins, broadcast the small dimensions, then aggregate",
          whenToUse: "A fact table linked to two (or more) small dimension tables that must be rolled up per entity.",
          logic:
            "**What it asks.** Revenue per customer across a fact table and two dimensions.\n\n" +
            "**Key Idea.** Chain the joins on the fact table, `broadcast` the small dimensions, compute the line revenue, then `groupBy('customer_id')`. `orders` is the fact (large); `customers` and `products` are dimensions (small enough to broadcast).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `orders.join(broadcast(products), on='product_id')` to get `price`.\n" +
            "2. `.join(broadcast(customers), on='customer_id')` to get `name`.\n" +
            "3. `.withColumn('revenue', col('quantity') * col('price'))`.\n" +
            "4. `.groupBy('customer_id', 'name').agg(sum('revenue').alias('total_revenue'))`.\n\n" +
            "**Why it works.** Each broadcast join enriches the fact rows locally; the final groupBy reduces by customer in a single aggregate shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compute `quantity * price` **after** the join (price comes from products), before the aggregate.\n" +
            "- Group by both `customer_id` and `name` (or join name back later) so `name` survives the aggregation.\n" +
            "- Broadcast only the sides that fit in memory; if a dimension is large, let it fall back to sort-merge.\n\n" +
            "**Interview mindset.** Say you broadcast every small dimension so the only real shuffle is the final groupBy.",
          rcs:
            "from pyspark.sql.functions import broadcast, col, sum as _sum\n" +
            "\n" +
            "enriched = (orders\n" +
            "    .join(broadcast(products), on='product_id', how='inner')   # bring in price\n" +
            "    .join(broadcast(customers), on='customer_id', how='inner') # bring in name\n" +
            "    .withColumn('revenue', col('quantity') * col('price')))    # line revenue\n" +
            "\n" +
            "result = (enriched\n" +
            "    .groupBy('customer_id', 'name')                            # per customer\n" +
            "    .agg(_sum('revenue').alias('total_revenue')))              # single agg shuffle\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import broadcast, col, sum as _sum\n" +
            "\n" +
            "enriched = (orders\n" +
            "    .join(broadcast(products), on='product_id', how='inner')\n" +
            "    .join(broadcast(customers), on='customer_id', how='inner')\n" +
            "    .withColumn('revenue', col('quantity') * col('price')))\n" +
            "\n" +
            "result = (enriched\n" +
            "    .groupBy('customer_id', 'name')\n" +
            "    .agg(_sum('revenue').alias('total_revenue')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Multi-way joins execute pairwise. By wrapping both dimensions in `broadcast()`, each join becomes a **map-side broadcast hash join** — the small `products` and `customers` tables are shipped to every executor and probed locally, so the large `orders` fact table is **never shuffled** for the joins. The only **wide** step is the final `groupBy('customer_id')` aggregate, and it is map-side pre-summed. Contrast: without broadcasts, three sort-merge joins would each shuffle the growing fact table — far costlier. This broadcast-the-dimensions pattern is the backbone of star-schema queries. Watch executor memory: broadcasting a dimension that is actually large can OOM.",
      sparkSql:
        "SELECT /*+ BROADCAST(p), BROADCAST(c) */ c.customer_id, c.name,\n" +
        "       SUM(o.quantity * p.price) AS total_revenue\n" +
        "FROM orders o\n" +
        "JOIN products p ON o.product_id = p.product_id\n" +
        "JOIN customers c ON o.customer_id = c.customer_id\n" +
        "GROUP BY c.customer_id, c.name;",
      recognizeRecall: [
        "**Spot it:** \"join three tables\", star schema (one fact + several dimensions), revenue per entity.",
        "**Say it:** chain joins on the fact, `broadcast` each small dimension, then one `groupBy`.",
        "**Trap:** compute derived measures (quantity*price) after the join; keep grouping keys + name intact."
      ]
    },

    // ------------------------------------------------------------------ Q58
    {
      id: "join-different-column-names",
      lc: 58,
      title: "Join on columns with different names",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Join on expression (mismatched keys)", transformation: "Wide (shuffle)", functions: "join (expression), drop" },
      description:
        "Join two DataFrames whose join keys have **different names** — e.g. `orders_ext` has `cust_id` while `customers` has `customer_id`. Because there is no shared column name, join on an explicit equality **expression** rather than a string key, then drop the duplicate key.",
      examples: [
        {
          input: "orders_ext: (10, cust_id=1, 200); customers: (customer_id=1, 'Mira')",
          output: "(10, 1, 200, 'Mira')  (after dropping the duplicate key)",
          reasoning: "cust_id (1) matches customer_id (1); the expression join keeps BOTH key columns, so one is dropped."
        }
      ],
      approaches: [
        {
          name: "join on an equality expression, then drop the duplicate key",
          whenToUse: "The two sides name the same concept with different column names.",
          logic:
            "**What it asks.** Match rows where `cust_id` equals `customer_id` despite the name mismatch.\n\n" +
            "**Key Idea.** Pass a boolean **column expression** as the join condition: `df1.join(df2, df1.cust_id == df2.customer_id, 'inner')`. Unlike the string-key form, this keeps **both** key columns, so drop the redundant one afterward.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write the condition `orders_ext.cust_id == customers.customer_id`.\n" +
            "2. `orders_ext.join(customers, <condition>, 'inner')`.\n" +
            "3. `.drop(customers.customer_id)` (or rename one side first) to remove the duplicate key.\n\n" +
            "**Why it works.** The expression tells Spark exactly which columns to equate; it does not coalesce them the way `on='key'` does, hence the leftover duplicate.\n\n" +
            "**Common Gotchas.**\n" +
            "- Reference each key through its DataFrame handle (`df1.cust_id`, `df2.customer_id`) to avoid an ambiguous-column error.\n" +
            "- Alternatively, `withColumnRenamed('cust_id', 'customer_id')` first and then use the clean `on='customer_id'` string form — no duplicate to drop.\n" +
            "- After the join, selecting a bare `'customer_id'` when both exist raises 'Reference is ambiguous'.\n\n" +
            "**Interview mindset.** Two clean options: expression-join-then-drop, or rename-then-string-join. Mention both.",
          rcs:
            "# Option A: join on an expression, then drop the duplicate key column\n" +
            "result = orders_ext.join(\n" +
            "    customers,\n" +
            "    orders_ext.cust_id == customers.customer_id,   # explicit equality\n" +
            "    'inner',\n" +
            ").drop(customers.customer_id)                      # remove duplicate key\n" +
            "\n" +
            "# Option B: rename first, then the clean string-key join\n" +
            "result = (orders_ext\n" +
            "    .withColumnRenamed('cust_id', 'customer_id')   # names now match\n" +
            "    .join(customers, on='customer_id', how='inner'))\n" +
            "result.show()",
          plain:
            "result = orders_ext.join(\n" +
            "    customers,\n" +
            "    orders_ext.cust_id == customers.customer_id,\n" +
            "    'inner',\n" +
            ").drop(customers.customer_id)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Still a **wide** equi-join (hash-partition by the key), and broadcastable when one side is small. The subtlety is purely about the output schema: joining on `on='key'` (a string, requires identical names) coalesces the key into **one** column, whereas joining on an **expression** keeps both source columns, leaving a duplicate you must `drop` — and any later bare reference to that name throws 'Reference is ambiguous'. Renaming one side up front (`withColumnRenamed`) sidesteps the whole issue and lets you use the tidy string-key form.",
      sparkSql:
        "SELECT o.order_id, o.cust_id, o.order_amount, c.name\n" +
        "FROM orders_ext o JOIN customers c ON o.cust_id = c.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"join where the keys are named differently\" (cust_id vs customer_id).",
        "**Say it:** `df1.join(df2, df1.cust_id == df2.customer_id, 'inner')` then drop the duplicate key; or rename first and use `on='key'`.",
        "**Trap:** expression joins leave two key columns — a later bare reference is 'ambiguous'."
      ]
    }

  ]);
})();
