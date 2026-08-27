/*
 * PySpark Interview Lab — Aggregations & GroupBy (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Every problem here is a groupBy → aggregate, which is a WIDE (shuffle) transformation.
 */
(function () {
  var CAT = "Aggregations & GroupBy";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q21
    {
      id: "revenue-per-customer",
      lc: 21,
      title: "Total revenue per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy aggregate", transformation: "Wide (shuffle)", functions: "groupBy, sum" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_amount`), compute the **total revenue** each customer generated: group by `customer_id` and sum `order_amount`.",
      examples: [
        {
          input: "orders: (c1, 100), (c1, 250), (c2, 90)",
          output: "c1 → 350, c2 → 90",
          reasoning: "Rows are grouped by customer_id and order_amount is summed within each group."
        }
      ],
      approaches: [
        {
          name: "groupBy + sum",
          whenToUse: "The canonical per-key total.",
          logic:
            "**What it asks.** One row per customer with the summed order amount.\n\n" +
            "**Key Idea.** `df.groupBy('customer_id').agg(sum('order_amount'))` — group, then reduce each group.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')`.\n" +
            "2. `.agg(sum('order_amount').alias('total_revenue'))`.\n" +
            "3. Optionally `orderBy` for a report.\n\n" +
            "**Why it works.** Spark shuffles rows so all of a customer's orders land on one partition, then sums locally.\n\n" +
            "**Common Gotchas.**\n" +
            "- Always `.alias(...)` aggregates or you get names like `sum(order_amount)`.\n" +
            "- Nulls are ignored by `sum`; a customer with only null amounts sums to null, not 0.\n\n" +
            "**Interview mindset.** Name the shuffle and mention partial (map-side) aggregation as the reason groupBy-sum scales.",
          rcs:
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')                       # one group per customer\n" +
            "    .agg(_sum('order_amount').alias('total_revenue')))  # reduce each group\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('order_amount').alias('total_revenue')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "groupBy-aggregate is **wide**. Spark does **partial aggregation** first (each partition pre-sums its own rows — map-side combine), then shuffles only the partial sums by key and finishes the reduce. That's why `sum`/`count` scale far better than a full row shuffle: the data crossing the network is one partial per (key, partition), not every row. Skewed keys (one huge customer) still bottleneck a single reducer — see salting (Q142).",
      sparkSql:
        "SELECT customer_id, SUM(order_amount) AS total_revenue\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"total per customer\", \"revenue by X\", \"sum for each…\".",
        "**Say it:** `groupBy(key).agg(sum(...).alias(...))`; wide, but map-side pre-aggregated.",
        "**Trap:** alias your aggregates; `sum` ignores nulls (→ null, not 0)."
      ]
    },

    // ------------------------------------------------------------------ Q22
    {
      id: "avg-order-value-per-customer",
      lc: 22,
      title: "Average order value per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy aggregate", transformation: "Wide (shuffle)", functions: "groupBy, avg" },
      description:
        "For each customer, compute the **average** order amount: group by `customer_id` and take `avg(order_amount)`.",
      examples: [
        {
          input: "orders: (c1, 100), (c1, 300), (c2, 90)",
          output: "c1 → 200.0, c2 → 90.0",
          reasoning: "avg = sum/count within each group; (100+300)/2 = 200."
        }
      ],
      approaches: [
        {
          name: "groupBy + avg",
          whenToUse: "Mean per key. Combine with sum/count in one agg when you need several.",
          logic:
            "**What it asks.** Mean order value for each customer.\n\n" +
            "**Key Idea.** `groupBy('customer_id').agg(avg('order_amount'))`. Multiple metrics go in one `agg`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')`.\n" +
            "2. `.agg(avg('order_amount').alias('avg_order_value'))`.\n\n" +
            "**Why it works.** `avg` is computed as sum/count per group after the shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- `avg` **ignores nulls** — the divisor is the count of non-null values, which may surprise you.\n" +
            "- Round for display with `round(avg(...), 2)`.\n\n" +
            "**Interview mindset.** Show you can stack metrics: `agg(sum(...), avg(...), count(...))` in one pass avoids re-shuffling.",
          rcs:
            "from pyspark.sql.functions import avg, round as _round\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_round(avg('order_amount'), 2).alias('avg_order_value')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import avg, round as _round\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_round(avg('order_amount'), 2).alias('avg_order_value')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Same **wide** groupBy machinery as Q21, and `avg` is also partially aggregated (each partition tracks a running sum and count, then combines). Stacking several aggregates in one `agg(...)` reuses the **single** shuffle — computing sum, avg, and count in separate statements would shuffle three times. Always batch metrics per groupBy.",
      sparkSql:
        "SELECT customer_id, ROUND(AVG(order_amount), 2) AS avg_order_value\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"average per…\", \"mean order value\".",
        "**Say it:** `groupBy(key).agg(avg(...))`; batch multiple metrics in one agg.",
        "**Trap:** `avg` ignores nulls in both numerator and denominator."
      ]
    },

    // ------------------------------------------------------------------ Q23
    {
      id: "min-max-order-per-customer",
      lc: 23,
      title: "Minimum and maximum order amount per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy aggregate", transformation: "Wide (shuffle)", functions: "groupBy, min, max" },
      description:
        "For each customer, return both the **smallest** and **largest** order amount in a single grouped aggregation.",
      examples: [
        {
          input: "orders: (c1, 100), (c1, 250), (c1, 40)",
          output: "c1 → min 40, max 250",
          reasoning: "min and max are computed together over the same group in one pass."
        }
      ],
      approaches: [
        {
          name: "groupBy + min + max",
          whenToUse: "Range/extremes per key; multiple aggregates in one shuffle.",
          logic:
            "**What it asks.** Per-customer min and max order amount.\n\n" +
            "**Key Idea.** Put both aggregates in one `agg`: `agg(min('order_amount'), max('order_amount'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')`.\n" +
            "2. `.agg(min(...).alias('min_order'), max(...).alias('max_order'))`.\n\n" +
            "**Why it works.** Both extremes reduce over the same shuffled group simultaneously.\n\n" +
            "**Common Gotchas.**\n" +
            "- `min`/`max` ignore nulls.\n" +
            "- To also know *which order* was the max, a window `row_number` is needed (that returns the whole row, not just the value).\n\n" +
            "**Interview mindset.** Distinguish \"the max value\" (agg) from \"the row with the max\" (window).",
          rcs:
            "from pyspark.sql.functions import min as _min, max as _max\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_amount').alias('min_order'),\n" +
            "         _max('order_amount').alias('max_order')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import min as _min, max as _max\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_amount').alias('min_order'),\n" +
            "         _max('order_amount').alias('max_order')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**, partially aggregated (each partition keeps its own running min/max, then combines) — very cheap on the wire. Returning the *value* of the extreme is an aggregate; returning the *record* that holds it needs a window (`row_number`/`rank`) or a self-join, which shuffles the full rows, not just the scalar.",
      sparkSql:
        "SELECT customer_id, MIN(order_amount) AS min_order, MAX(order_amount) AS max_order\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"smallest/largest per…\", \"range per group\".",
        "**Say it:** one `agg(min(...), max(...))` — a single shuffle.",
        "**Trap:** value-of-max = agg; row-of-max = window function."
      ]
    },

    // ------------------------------------------------------------------ Q24
    {
      id: "order-count-per-customer",
      lc: 24,
      title: "Number of orders per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy count", transformation: "Wide (shuffle)", functions: "groupBy, count" },
      description:
        "Count how many orders each customer placed: `groupBy('customer_id').count()`, or `agg(count('*'))` for a custom name.",
      examples: [
        {
          input: "orders: (c1), (c1), (c1), (c2)",
          output: "c1 → 3, c2 → 1",
          reasoning: "count() tallies the rows in each group."
        }
      ],
      approaches: [
        {
          name: "groupBy().count()",
          whenToUse: "Row tallies per key.",
          logic:
            "**What it asks.** Orders-per-customer counts.\n\n" +
            "**Key Idea.** `groupBy('customer_id').count()` adds a `count` column; use `agg(count('*').alias('n'))` to name it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')`.\n" +
            "2. `.count()` or `.agg(count('*').alias('order_count'))`.\n\n" +
            "**Why it works.** Each group's rows are tallied after the shuffle (with map-side partial counts).\n\n" +
            "**Common Gotchas.**\n" +
            "- `count('*')` counts rows; `count('col')` counts **non-null** values of that column — different results with nulls.\n" +
            "- `countDistinct('col')` for unique values, not total rows.\n\n" +
            "**Interview mindset.** Be precise about `count('*')` vs `count(col)` vs `countDistinct`.",
          rcs:
            "from pyspark.sql.functions import count\n" +
            "\n" +
            "result = orders.groupBy('customer_id').count()          # column named 'count'\n" +
            "# Custom name:\n" +
            "result = (orders.groupBy('customer_id')\n" +
            "    .agg(count('*').alias('order_count')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import count\n" +
            "\n" +
            "result = (orders.groupBy('customer_id')\n" +
            "    .agg(count('*').alias('order_count')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide** but among the cheapest aggregates: map-side partial counts mean only one integer per (key, partition) crosses the network. `count('*')` includes null-bearing rows; `count(col)` and `countDistinct(col)` change what's counted — distinct is the expensive one (it must dedupe values in the shuffle).",
      sparkSql:
        "SELECT customer_id, COUNT(*) AS order_count\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"how many per…\", \"number of orders each…\".",
        "**Say it:** `groupBy(key).count()` or `agg(count('*').alias(...))`.",
        "**Trap:** `count('*')` vs `count(col)` (non-null) vs `countDistinct`."
      ]
    },

    // ------------------------------------------------------------------ Q25
    {
      id: "customers-more-than-5-orders",
      lc: 25,
      title: "Customers who placed more than 5 orders",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + HAVING", transformation: "Wide (shuffle)", functions: "groupBy, count, filter" },
      description:
        "Find customers with more than 5 orders: aggregate the per-customer count, then **filter on the aggregate** (the DataFrame equivalent of SQL `HAVING`).",
      examples: [
        {
          input: "counts: c1 → 7, c2 → 3, c3 → 6",
          output: "c1, c3",
          reasoning: "Keep groups whose count exceeds 5."
        }
      ],
      approaches: [
        {
          name: "aggregate then filter (HAVING)",
          whenToUse: "Any 'groups where the aggregate satisfies a condition'.",
          logic:
            "**What it asks.** Customers whose order count > 5.\n\n" +
            "**Key Idea.** There is no separate `having` in the DataFrame API — you `groupBy().agg()` then `.filter()` on the aggregated column.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id').agg(count('*').alias('order_count'))`.\n" +
            "2. `.filter(col('order_count') > 5)`.\n\n" +
            "**Why it works.** The filter runs **after** aggregation, exactly like SQL HAVING.\n\n" +
            "**Common Gotchas.**\n" +
            "- Filtering before the groupBy (WHERE) filters rows; filtering after (HAVING) filters groups — don't confuse them.\n" +
            "- You can still push a pre-aggregation `filter` for unrelated row conditions to cut shuffle.\n\n" +
            "**Interview mindset.** Explicitly map post-agg `.filter` to SQL HAVING.",
          rcs:
            "from pyspark.sql.functions import count, col\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(count('*').alias('order_count'))\n" +
            "    .filter(col('order_count') > 5))            # HAVING count > 5\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import count, col\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(count('*').alias('order_count'))\n" +
            "    .filter(col('order_count') > 5))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `groupBy` is the **wide** step; the post-aggregation `filter` is **narrow** and runs on the already-small grouped result, so it's cheap. Order matters for cost: a WHERE-style filter on raw rows *before* the groupBy shrinks the shuffle; a HAVING-style filter *after* only trims the output.",
      sparkSql:
        "SELECT customer_id, COUNT(*) AS order_count\n" +
        "FROM orders GROUP BY customer_id HAVING COUNT(*) > 5;",
      recognizeRecall: [
        "**Spot it:** \"customers with more than N…\", \"groups where the total exceeds…\".",
        "**Say it:** aggregate → `.filter(...)` = HAVING; there's no `.having()`.",
        "**Trap:** WHERE (before) filters rows, HAVING (after) filters groups."
      ]
    },

    // ------------------------------------------------------------------ Q26
    {
      id: "customers-spend-over-10000",
      lc: 26,
      title: "Customers whose total spending exceeds 10000",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + HAVING", transformation: "Wide (shuffle)", functions: "groupBy, sum, filter" },
      description:
        "Identify high-value customers: sum each customer's `order_amount`, then keep those whose total is greater than 10000 (a HAVING on a summed aggregate).",
      examples: [
        {
          input: "totals: c1 → 12000, c2 → 8000",
          output: "c1",
          reasoning: "Only c1's summed spending exceeds 10000."
        }
      ],
      approaches: [
        {
          name: "sum then filter",
          whenToUse: "Threshold on a per-key total.",
          logic:
            "**What it asks.** Customers with summed spending > 10000.\n\n" +
            "**Key Idea.** `groupBy('customer_id').agg(sum('order_amount'))` then `.filter(total > 10000)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sum per customer, alias it `total_spending`.\n" +
            "2. `.filter(col('total_spending') > 10000)`.\n\n" +
            "**Why it works.** Same HAVING pattern as Q25, with `sum` instead of `count`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Null amounts drop out of the sum; a customer of all-null orders won't cross the threshold.\n" +
            "- If you also need only valid orders, filter `order_amount` (WHERE) before grouping.\n\n" +
            "**Interview mindset.** Reuse the aggregate-then-filter template; swap the aggregate.",
          rcs:
            "from pyspark.sql.functions import sum as _sum, col\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('order_amount').alias('total_spending'))\n" +
            "    .filter(col('total_spending') > 10000))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import sum as _sum, col\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('order_amount').alias('total_spending'))\n" +
            "    .filter(col('total_spending') > 10000))\n" +
            "result.show()",
        }
      ],
      sparkInternals:
        "Identical cost shape to Q25: one **wide** groupBy-sum (map-side pre-summed) plus a **narrow** post-filter. If the source has invalid/refunded rows, a pre-groupBy `filter` both fixes correctness and shrinks the shuffle — do it before the aggregate, not after.",
      sparkSql:
        "SELECT customer_id, SUM(order_amount) AS total_spending\n" +
        "FROM orders GROUP BY customer_id HAVING SUM(order_amount) > 10000;",
      recognizeRecall: [
        "**Spot it:** \"total spending over…\", \"whose sum exceeds…\".",
        "**Say it:** `groupBy.agg(sum).filter(...)` — HAVING on a sum.",
        "**Trap:** clean/validate rows with a WHERE before grouping."
      ]
    },

    // ------------------------------------------------------------------ Q33
    {
      id: "avg-salary-per-department",
      lc: 33,
      title: "Average salary per department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy aggregate", transformation: "Wide (shuffle)", functions: "groupBy, avg" },
      description:
        "Given an `employees` DataFrame (`department`, `salary`), compute the average salary for each department.",
      examples: [
        {
          input: "employees: (Eng, 120k), (Eng, 100k), (Sales, 80k)",
          output: "Eng → 110000, Sales → 80000",
          reasoning: "Group by department, average the salaries."
        }
      ],
      approaches: [
        {
          name: "groupBy + avg",
          whenToUse: "Per-category mean — the department analogue of Q22.",
          logic:
            "**What it asks.** Mean salary per department.\n\n" +
            "**Key Idea.** `groupBy('department').agg(avg('salary'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('department')`.\n" +
            "2. `.agg(round(avg('salary'), 2).alias('avg_salary'))`.\n\n" +
            "**Why it works.** Salaries shuffle by department; each group is averaged.\n\n" +
            "**Common Gotchas.**\n" +
            "- Null departments form their own group — clean with `fillna('Unknown')` (Q10) first if needed.\n" +
            "- This grouped result is the input to Q36-style \"above department average\" via a window or a join.\n\n" +
            "**Interview mindset.** Note that a **window** `avg` keeps every employee row alongside the dept average — useful when you don't want to collapse rows.",
          rcs:
            "from pyspark.sql.functions import avg, round as _round\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(_round(avg('salary'), 2).alias('avg_salary')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import avg, round as _round\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(_round(avg('salary'), 2).alias('avg_salary')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**, partially aggregated. Department cardinality is usually low, so the shuffle is tiny and the result fits in a broadcast — handy when you next join it back to the employees to compare each salary against its department average (broadcast join, Q141), avoiding a second large shuffle.",
      sparkSql:
        "SELECT department, ROUND(AVG(salary), 2) AS avg_salary\n" +
        "FROM employees GROUP BY department;",
      recognizeRecall: [
        "**Spot it:** \"average by department/category\".",
        "**Say it:** `groupBy('department').agg(avg('salary'))`.",
        "**Trap:** collapsing rows vs keeping them — window `avg` keeps every row."
      ]
    },

    // ------------------------------------------------------------------ Q34
    {
      id: "departments-avg-over-100000",
      lc: 34,
      title: "Departments with average salary above 100000",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + HAVING", transformation: "Wide (shuffle)", functions: "groupBy, avg, filter" },
      description:
        "Return departments whose **average** salary exceeds 100000 — average per department, then HAVING-filter on that average.",
      examples: [
        {
          input: "avgs: Eng → 110000, Sales → 80000",
          output: "Eng",
          reasoning: "Only Engineering's average exceeds 100000."
        }
      ],
      approaches: [
        {
          name: "avg then filter",
          whenToUse: "Threshold on a per-group average.",
          logic:
            "**What it asks.** Departments where avg salary > 100000.\n\n" +
            "**Key Idea.** `groupBy('department').agg(avg('salary'))` then `.filter(avg > 100000)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Average salary per department, alias it.\n" +
            "2. `.filter(col('avg_salary') > 100000)`.\n\n" +
            "**Why it works.** HAVING pattern on an averaged aggregate.\n\n" +
            "**Common Gotchas.**\n" +
            "- Filter the aggregated column, not raw `salary`.\n" +
            "- Rounding before comparison can flip a borderline department — compare on the raw avg, round only for display.\n\n" +
            "**Interview mindset.** Compare on the exact aggregate; round only in the output projection.",
          rcs:
            "from pyspark.sql.functions import avg, col, round as _round\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(avg('salary').alias('avg_salary'))\n" +
            "    .filter(col('avg_salary') > 100000)\n" +
            "    .withColumn('avg_salary', _round('avg_salary', 2)))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import avg, col, round as _round\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(avg('salary').alias('avg_salary'))\n" +
            "    .filter(col('avg_salary') > 100000)\n" +
            "    .withColumn('avg_salary', _round('avg_salary', 2)))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "One **wide** groupBy-avg then a **narrow** filter on the small grouped output — negligible cost after the aggregate. Rounding is a display concern: apply it *after* the comparison so a value like 100000.4 isn't wrongly excluded (or 99999.6 wrongly included) by pre-rounding.",
      sparkSql:
        "SELECT department, ROUND(AVG(salary), 2) AS avg_salary\n" +
        "FROM employees GROUP BY department HAVING AVG(salary) > 100000;",
      recognizeRecall: [
        "**Spot it:** \"departments/groups where the average exceeds…\".",
        "**Say it:** `groupBy.agg(avg).filter(...)` = HAVING AVG.",
        "**Trap:** compare on the raw average; round only for display."
      ]
    },

    // ------------------------------------------------------------------ Q35
    {
      id: "highest-salary-per-department",
      lc: 35,
      title: "Highest salary in each department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy aggregate", transformation: "Wide (shuffle)", functions: "groupBy, max" },
      description:
        "For each department, return the maximum salary. (If you need the *employee* earning it, that's a window/rank problem — this returns the value.)",
      examples: [
        {
          input: "employees: (Eng, 120k), (Eng, 100k), (Sales, 80k)",
          output: "Eng → 120000, Sales → 80000",
          reasoning: "max salary within each department group."
        }
      ],
      approaches: [
        {
          name: "groupBy + max",
          whenToUse: "The top value per group (not the top row).",
          logic:
            "**What it asks.** Max salary per department.\n\n" +
            "**Key Idea.** `groupBy('department').agg(max('salary'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('department')`.\n" +
            "2. `.agg(max('salary').alias('max_salary'))`.\n\n" +
            "**Why it works.** Reduces each department group to its maximum after the shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- Returns only the value; to get the top earner's *name*, use `row_number()`/`rank()` over a window partitioned by department (Q64–Q65) or join the max back.\n" +
            "- Ties: multiple employees can share the max — a value-agg hides that; `rank()` exposes it.\n\n" +
            "**Interview mindset.** Clearly separate \"max value\" (agg) from \"who earns it\" (window/join).",
          rcs:
            "from pyspark.sql.functions import max as _max\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(_max('salary').alias('max_salary')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import max as _max\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department')\n" +
            "    .agg(_max('salary').alias('max_salary')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide** and partially aggregated (per-partition max, then combine) — cheap on the wire. The classic follow-up, \"return the employee who earns the department max,\" is a **window** (`rank()`/`row_number()` partitioned by department) or a join of this result back to `employees`; both shuffle the full rows, unlike this scalar aggregate.",
      sparkSql:
        "SELECT department, MAX(salary) AS max_salary\n" +
        "FROM employees GROUP BY department;",
      recognizeRecall: [
        "**Spot it:** \"highest/top per department\".",
        "**Say it:** `groupBy('department').agg(max('salary'))` for the value.",
        "**Trap:** the person earning it → window `rank`/`row_number`, not `max`."
      ]
    },

    // ------------------------------------------------------------------ Q40
    {
      id: "monthly-revenue",
      lc: 40,
      title: "Monthly revenue from orders",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Time bucketing + aggregate", transformation: "Wide (shuffle)", functions: "date_format, groupBy, sum" },
      description:
        "Compute total revenue per calendar month: derive a month bucket from `order_date`, group by it, and sum `order_amount`.",
      examples: [
        {
          input: "orders: (2026-01-05, 100), (2026-01-20, 250), (2026-02-01, 90)",
          output: "2026-01 → 350, 2026-02 → 90",
          reasoning: "Rows are bucketed by year-month, then summed."
        }
      ],
      approaches: [
        {
          name: "date_format month key + sum",
          whenToUse: "Any monthly/period rollup.",
          logic:
            "**What it asks.** Revenue grouped by month.\n\n" +
            "**Key Idea.** Build a stable month key with `date_format(order_date, 'yyyy-MM')` (sortable, keeps the year), then `groupBy(month).agg(sum)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Ensure `order_date` is a date (Q15).\n" +
            "2. `withColumn('month', date_format('order_date', 'yyyy-MM'))`.\n" +
            "3. `groupBy('month').agg(sum('order_amount').alias('revenue'))`.\n" +
            "4. `orderBy('month')`.\n\n" +
            "**Why it works.** The `yyyy-MM` string groups all days of a month together and sorts chronologically.\n\n" +
            "**Common Gotchas.**\n" +
            "- Don't group by `month()` alone — it merges Januaries across different years.\n" +
            "- Use `yyyy-MM` (zero-padded) so string sort = chronological sort.\n\n" +
            "**Interview mindset.** Stress the year+month composite key to avoid cross-year collisions.",
          rcs:
            "from pyspark.sql.functions import date_format, sum as _sum\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('month', date_format('order_date', 'yyyy-MM'))  # year+month key\n" +
            "    .groupBy('month')\n" +
            "    .agg(_sum('order_amount').alias('revenue'))\n" +
            "    .orderBy('month'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import date_format, sum as _sum\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('month', date_format('order_date', 'yyyy-MM'))\n" +
            "    .groupBy('month')\n" +
            "    .agg(_sum('order_amount').alias('revenue'))\n" +
            "    .orderBy('month'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Deriving the key is **narrow**; the groupBy-sum is **wide** (map-side pre-summed). If `orders` is stored partitioned by year/month (Q145), Spark **prunes** to only the needed folders before this even runs. The `orderBy('month')` at the end is a second, small shuffle over the already-tiny monthly result — cheap.",
      sparkSql:
        "SELECT date_format(order_date, 'yyyy-MM') AS month, SUM(order_amount) AS revenue\n" +
        "FROM orders GROUP BY date_format(order_date, 'yyyy-MM') ORDER BY month;",
      recognizeRecall: [
        "**Spot it:** \"monthly/weekly/daily revenue\", \"per period\".",
        "**Say it:** `date_format(date, 'yyyy-MM')` key → `groupBy.agg(sum)`.",
        "**Trap:** `month()` alone collides across years — use `yyyy-MM`."
      ]
    },

    // ------------------------------------------------------------------ Q42
    {
      id: "daily-order-count",
      lc: 42,
      title: "Daily order count",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Time bucketing + count", transformation: "Wide (shuffle)", functions: "to_date, groupBy, count" },
      description:
        "Count the number of orders placed on each calendar day: group by the date and count rows.",
      examples: [
        {
          input: "orders on: 2026-01-05, 2026-01-05, 2026-01-06",
          output: "2026-01-05 → 2, 2026-01-06 → 1",
          reasoning: "Rows grouped by day, then counted."
        }
      ],
      approaches: [
        {
          name: "groupBy day + count",
          whenToUse: "Daily volume / time-series counts.",
          logic:
            "**What it asks.** Orders per day.\n\n" +
            "**Key Idea.** Group by the date (a `DateType` column, or `to_date` of a timestamp) and `count('*')`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Normalize to a day: `to_date('order_ts')` if there's a time component.\n" +
            "2. `groupBy('order_date').agg(count('*').alias('order_count'))`.\n" +
            "3. `orderBy('order_date')`.\n\n" +
            "**Why it works.** Timestamps collapse to their date, so all of a day's orders share a key.\n\n" +
            "**Common Gotchas.**\n" +
            "- Grouping by a raw **timestamp** buckets by the second, not the day — always `to_date` first.\n" +
            "- Missing days simply don't appear; a full calendar needs a left join to a date dimension.\n\n" +
            "**Interview mindset.** Mention the date-dimension join when the ask is 'every day, including zeros'.",
          rcs:
            "from pyspark.sql.functions import to_date, count\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('order_day', to_date('order_date'))       # collapse to the day\n" +
            "    .groupBy('order_day')\n" +
            "    .agg(count('*').alias('order_count'))\n" +
            "    .orderBy('order_day'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import to_date, count\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('order_day', to_date('order_date'))\n" +
            "    .groupBy('order_day')\n" +
            "    .agg(count('*').alias('order_count'))\n" +
            "    .orderBy('order_day'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Narrow `to_date` + **wide** groupBy-count (partial counts on the wire). Gaps in the output are a data-modeling issue, not a Spark one: to emit zero-count days you left-join a generated calendar (`sequence` + `explode`) against these counts. Grouping by an un-normalized timestamp explodes cardinality — one group per distinct instant.",
      sparkSql:
        "SELECT to_date(order_date) AS order_day, COUNT(*) AS order_count\n" +
        "FROM orders GROUP BY to_date(order_date) ORDER BY order_day;",
      recognizeRecall: [
        "**Spot it:** \"daily count\", \"orders per day\", time-series volume.",
        "**Say it:** `to_date` then `groupBy(day).count()`.",
        "**Trap:** group by timestamp = per-second; zero-days need a calendar join."
      ]
    },

    // ------------------------------------------------------------------ Q43
    {
      id: "unique-customers-per-month",
      lc: 43,
      title: "Unique customers per month",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Distinct within group", transformation: "Wide (shuffle)", functions: "date_format, countDistinct" },
      description:
        "For each month, count how many **distinct** customers placed at least one order — a distinct count within a time bucket.",
      examples: [
        {
          input: "2026-01: c1, c1, c2 ; 2026-02: c3",
          output: "2026-01 → 2, 2026-02 → 1",
          reasoning: "Within each month, count unique customer_ids (c1 counted once)."
        }
      ],
      approaches: [
        {
          name: "groupBy month + countDistinct",
          whenToUse: "Active/unique entities per period (MAU-style metrics).",
          logic:
            "**What it asks.** Distinct active customers each month.\n\n" +
            "**Key Idea.** `groupBy(month).agg(countDistinct('customer_id'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the `yyyy-MM` month key.\n" +
            "2. `groupBy('month').agg(countDistinct('customer_id').alias('active_customers'))`.\n\n" +
            "**Why it works.** Within each month group, duplicate customer ids collapse before counting.\n\n" +
            "**Common Gotchas.**\n" +
            "- `countDistinct` is heavier than `count` (it must dedupe in the shuffle); for huge scale use `approx_count_distinct`.\n" +
            "- A customer active in two months counts in **both** — that's correct for monthly actives.\n\n" +
            "**Interview mindset.** Offer `approx_count_distinct` as the scale variant and name it a HyperLogLog estimate.",
          rcs:
            "from pyspark.sql.functions import date_format, countDistinct\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('month', date_format('order_date', 'yyyy-MM'))\n" +
            "    .groupBy('month')\n" +
            "    .agg(countDistinct('customer_id').alias('active_customers'))\n" +
            "    .orderBy('month'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import date_format, countDistinct\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('month', date_format('order_date', 'yyyy-MM'))\n" +
            "    .groupBy('month')\n" +
            "    .agg(countDistinct('customer_id').alias('active_customers'))\n" +
            "    .orderBy('month'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The distinct count makes this the heaviest aggregate in this set: unlike `sum`/`count`, `countDistinct` cannot fully pre-aggregate map-side — it must carry distinct values into the shuffle to dedupe per group. At scale, `approx_count_distinct('customer_id', 0.02)` (HyperLogLog, ~2% error) slashes shuffle and memory. Bucket the month first so each group is bounded.",
      sparkSql:
        "SELECT date_format(order_date, 'yyyy-MM') AS month,\n" +
        "       COUNT(DISTINCT customer_id) AS active_customers\n" +
        "FROM orders GROUP BY date_format(order_date, 'yyyy-MM') ORDER BY month;",
      recognizeRecall: [
        "**Spot it:** \"unique/active customers per month\", MAU/DAU.",
        "**Say it:** `groupBy(month).agg(countDistinct('customer_id'))`.",
        "**Trap:** distinct is the costly aggregate — `approx_count_distinct` at scale."
      ]
    }

  ]);
})();
