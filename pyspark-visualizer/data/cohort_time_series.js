/*
 * PySpark Interview Lab — Cohort & Time-Series (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * These problems teach the gaps-and-islands pattern (row_number over an ordered
 * date minus a day-number -> a constant group id per consecutive run), lag/lead
 * comparisons for consecutive events, time-based rolling windows via the
 * datediff day-number trick + rangeBetween, and N-consecutive-increase detection
 * with chained lag comparisons or a run-length count. Every partitionBy/groupBy
 * here is a WIDE (shuffle) step; per-row date math is NARROW.
 */
(function () {
  var CAT = "Cohort & Time-Series";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q80
    {
      id: "three-consecutive-increasing-orders",
      lc: 80,
      title: "Customers whose order amount increased for 3 consecutive purchases",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Chained lag comparisons (N increases)", transformation: "Wide (shuffle)", functions: "Window, lag, filter" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `amount`), find the customers who had **three consecutive purchases** (in date order) where each order's `amount` was strictly greater than the one before — i.e. a run of the shape `a < b < c` across three back-to-back orders. Compare each order to its two predecessors with `lag` and keep customers where such a triple exists.",
      examples: [
        {
          input: "orders: (c1, 2026-01-01, 10), (c1, 2026-01-05, 20), (c1, 2026-01-09, 30), (c2, 2026-01-01, 50), (c2, 2026-01-04, 40)",
          output: "c1 qualifies",
          reasoning: "c1's three orders 10 < 20 < 30 form a strictly increasing run of three. c2 decreases (50 -> 40) and never has a 3-order rising run, so c2 is excluded."
        }
      ],
      approaches: [
        {
          name: "two lags to look back at the prior two orders, test a rising triple",
          whenToUse: "Detecting a fixed-length monotonic run (N increases/decreases in a row) within a group.",
          logic:
            "**What it asks.** Which customers ever made three back-to-back orders whose amounts strictly increased.\n\n" +
            "**Key Idea.** Order each customer's orders by date and, on every row, fetch the previous two amounts with `lag('amount', 1)` and `lag('amount', 2)`. The current row is the top of a strictly rising triple when `prev2 < prev1 < amount`. A customer qualifies if any row satisfies that.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. Capture the two prior amounts: `prev1 = lag('amount', 1).over(w)`, `prev2 = lag('amount', 2).over(w)`.\n" +
            "3. Flag the triple: keep rows where `(prev2 < prev1) & (prev1 < amount)`.\n" +
            "4. `select('customer_id').distinct()` for the qualifying customers.\n\n" +
            "**Why it works.** Three consecutive rising orders means the current amount, and the two immediately before it in date order, satisfy `a < b < c`. `lag(1)` and `lag(2)` line those two predecessors up on the current row so the whole condition is a single per-row predicate.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first two orders of each customer have a null `prev2`/`prev1`, so the comparison is null (not true) and they never falsely qualify — correct by design.\n" +
            "- Use strict `<` for 'increased'; `<=` would let a flat amount count as an increase.\n" +
            "- Order the window by a real `DateType` (add `order_id` as a tie-breaker if two orders share a date) so 'consecutive' is deterministic.\n\n" +
            "**Interview mindset.** Say 'a fixed run of 3 = chained lags: compare the row to lag(1) and lag(2)'; note the leading nulls handle the edges for free.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # within one customer\n" +
            "     .orderBy('order_date'))                             # in date order\n" +
            "\n" +
            "prev1 = lag('amount', 1).over(w)                         # the immediately prior order\n" +
            "prev2 = lag('amount', 2).over(w)                         # two orders back\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('amount')))              # prev2 < prev1 < amount (rising triple)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev1 = lag('amount', 1).over(w)\n" +
            "prev2 = lag('amount', 2).over(w)\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('amount')))\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The two `lag` calls share one **wide** step: Spark hash-shuffles rows by `customer_id` and sorts by `order_date` within each partition, then reads offsets -1 and -2 in a single sequential pass (both lags reuse the same window spec, so there is one window operator over one shuffle). The `filter` and the `<` comparisons are **narrow** predicates fused into the same stage; null `prev1`/`prev2` on the first two rows evaluate the predicate to null, which `filter` treats as not-kept. The final `distinct()` adds a small **wide** dedupe shuffle on `customer_id`. Key skew (a customer with an enormous order history) is the main cost risk.",
      sparkSql:
        "WITH lagged AS (\n" +
        "  SELECT customer_id, order_date, amount,\n" +
        "         LAG(amount, 1) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev1,\n" +
        "         LAG(amount, 2) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev2\n" +
        "  FROM orders\n" +
        ")\n" +
        "SELECT DISTINCT customer_id\n" +
        "FROM lagged\n" +
        "WHERE prev2 < prev1 AND prev1 < amount;",
      recognizeRecall: [
        "**Spot it:** 'increased for 3 consecutive', 'three rising orders in a row', 'N back-to-back increases'.",
        "**Say it:** two lags — `lag(amt,1)` and `lag(amt,2)` over `partitionBy(cust).orderBy(date)` — keep `prev2 < prev1 < amt`.",
        "**Trap:** use strict < (not <=); leading nulls drop the first two rows automatically; add a date tie-breaker."
      ]
    },

    // ------------------------------------------------------------------ Q85
    {
      id: "orders-on-consecutive-days",
      lc: 85,
      title: "Customers who placed orders on consecutive days",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Lag on date + datediff == 1", transformation: "Wide (shuffle)", functions: "Window, lag, datediff" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find the customers who ordered on **two consecutive calendar days** — i.e. some order is exactly one day after that customer's previous distinct order day. Deduplicate to one row per customer per day, then check whether any adjacent pair of order days is exactly 1 day apart.",
      examples: [
        {
          input: "orders: (c1, 2026-03-01), (c1, 2026-03-02), (c2, 2026-03-01), (c2, 2026-03-05)",
          output: "c1 qualifies",
          reasoning: "c1 ordered on 03-01 and 03-02 — one day apart. c2's order days (03-01, 03-05) are 4 days apart, so c2 is excluded."
        }
      ],
      approaches: [
        {
          name: "distinct order days, lag the previous day, keep datediff == 1",
          whenToUse: "Detecting any back-to-back-day activity (two consecutive days) within a group.",
          logic:
            "**What it asks.** Which customers have at least one pair of consecutive calendar days on which they ordered.\n\n" +
            "**Key Idea.** Reduce to distinct `(customer_id, order_date)` days so multiple same-day orders count once. Order those days per customer and use `lag('order_date')` to get the previous order day; a consecutive pair is exactly `datediff(order_date, prev_day) == 1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Deduplicate days: `days = orders.select('customer_id', 'order_date').distinct()`.\n" +
            "2. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "3. `prev_day = lag('order_date').over(w)`.\n" +
            "4. Keep rows where `datediff(col('order_date'), prev_day) == 1`, then `select('customer_id').distinct()`.\n\n" +
            "**Why it works.** After deduping, adjacent rows in the ordered window are a customer's successive order days; `datediff == 1` is precisely 'the day right after the previous order day'. If any such adjacency exists, the customer ordered on consecutive days.\n\n" +
            "**Common Gotchas.**\n" +
            "- Deduplicate first — without it, two orders on the same day give `datediff == 0` noise and can mask real adjacencies.\n" +
            "- The first day per customer has a null `prev_day`, so `datediff` is null and it is correctly not counted.\n" +
            "- `datediff(order_date, prev_day)` (end, start) is +1 forward; get the argument order right so 1 means 'next day'.\n\n" +
            "**Interview mindset.** 'Distinct days, lag the previous day, keep datediff == 1' — mention the dedupe as the correctness step.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff\n" +
            "\n" +
            "days = orders.select('customer_id', 'order_date').distinct()  # one row per customer per day\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # within one customer\n" +
            "     .orderBy('order_date'))                             # order days chronologically\n" +
            "\n" +
            "prev_day = lag('order_date').over(w)                     # previous distinct order day\n" +
            "result = (days\n" +
            "    .withColumn('gap', datediff(col('order_date'), prev_day))  # days since previous order day\n" +
            "    .filter(col('gap') == 1)                            # exactly the next calendar day\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff\n" +
            "\n" +
            "days = orders.select('customer_id', 'order_date').distinct()\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev_day = lag('order_date').over(w)\n" +
            "result = (days\n" +
            "    .withColumn('gap', datediff(col('order_date'), prev_day))\n" +
            "    .filter(col('gap') == 1)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `distinct()` on `(customer_id, order_date)` is a **wide** dedupe shuffle (hash by both columns). The `lag` over `partitionBy('customer_id').orderBy('order_date')` is a second **wide** step (shuffle by customer, sort by date), though Catalyst can sometimes reuse the partitioning from the distinct. `datediff` and the `== 1` filter are **narrow**, codegen-friendly per-row expressions; the leading null `prev_day` yields a null gap that the filter drops. A final `distinct()` on `customer_id` is a small dedupe shuffle. Deduping days up front also shrinks every later shuffle. Watch for skew on very active customers.",
      sparkSql:
        "WITH days AS (\n" +
        "  SELECT DISTINCT customer_id, order_date FROM orders\n" +
        "),\n" +
        "lagged AS (\n" +
        "  SELECT customer_id, order_date,\n" +
        "         DATEDIFF(order_date,\n" +
        "                  LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gap\n" +
        "  FROM days\n" +
        ")\n" +
        "SELECT DISTINCT customer_id\n" +
        "FROM lagged\n" +
        "WHERE gap = 1;",
      recognizeRecall: [
        "**Spot it:** 'consecutive days', 'ordered two days in a row', 'back-to-back day activity'.",
        "**Say it:** distinct days, then keep where `datediff(order_date, lag(order_date)) == 1` over `partitionBy(cust).orderBy(date)`.",
        "**Trap:** dedupe days first (same-day orders give datediff 0); first day is null; datediff arg order = +1 forward."
      ]
    },

    // ------------------------------------------------------------------ Q86
    {
      id: "at-least-three-consecutive-days",
      lc: 86,
      title: "Customers who placed orders on at least 3 consecutive days",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Gaps-and-islands (row_number - day)", transformation: "Wide (shuffle)", functions: "Window, row_number, datediff, groupBy" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find the customers who ordered on **three or more consecutive calendar days**. This is the classic gaps-and-islands problem: dedupe to distinct order days, then subtract a per-customer sequence number from each day's day-number so consecutive days collapse to a constant group id, and keep groups (runs) of length >= 3.",
      examples: [
        {
          input: "orders: (c1, 2026-05-01), (c1, 2026-05-02), (c1, 2026-05-03), (c2, 2026-05-01), (c2, 2026-05-02)",
          output: "c1 qualifies",
          reasoning: "c1 ordered on 05-01, 05-02, 05-03 — a run of 3 consecutive days. c2's longest run is only 2 days (05-01, 05-02), so c2 is excluded."
        }
      ],
      approaches: [
        {
          name: "gaps-and-islands: (day_number - row_number) is constant within a run",
          whenToUse: "Any 'N consecutive periods' streak/run-length question over a date sequence.",
          logic:
            "**What it asks.** Which customers have a run of at least three consecutive calendar days with orders.\n\n" +
            "**Key Idea.** The gaps-and-islands trick: for a customer's distinct order days sorted ascending, both the day-number (`datediff(order_date, epoch)`) and the `row_number()` increase by 1 each step *within a consecutive run*, so their **difference is constant** across the whole run and changes only when a gap appears. Group by `(customer_id, that difference)` to get one group per run, and count the days in each.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Dedupe days: `days = orders.select('customer_id', 'order_date').distinct()`.\n" +
            "2. Add a day-number: `withColumn('day_num', datediff(col('order_date'), lit('1970-01-01')))`.\n" +
            "3. Number days per customer: `rn = row_number().over(Window.partitionBy('customer_id').orderBy('day_num'))`.\n" +
            "4. Form the island id: `withColumn('grp', col('day_num') - col('rn'))` — constant inside a run.\n" +
            "5. `groupBy('customer_id', 'grp').count()`, then keep `count >= 3` and take distinct `customer_id`.\n\n" +
            "**Why it works.** Inside a consecutive run, `day_num` and `rn` step together (+1, +1), so `day_num - rn` stays fixed; a missing day makes `day_num` jump while `rn` still increments by 1, so the difference changes and a new island begins. The number of rows per island is exactly the run length.\n\n" +
            "**Common Gotchas.**\n" +
            "- Deduplicate days first, or duplicate same-day rows break the row_number/day_number lockstep.\n" +
            "- Use `row_number` (strict 1..N), not `rank`/`dense_rank`, so the +1 lockstep holds.\n" +
            "- `>= 3` for 'at least 3'; adjust the threshold for other run lengths.\n" +
            "- The `grp` value itself is meaningless — it is only a run label; never interpret it as a date.\n\n" +
            "**Interview mindset.** Name it out loud: 'gaps-and-islands — day-number minus row-number is constant within a run'; it is the reusable backbone for every streak question.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, row_number\n" +
            "\n" +
            "days = orders.select('customer_id', 'order_date').distinct()  # one row per customer per day\n" +
            "\n" +
            "days = days.withColumn(\n" +
            "    'day_num', datediff(col('order_date'), lit('1970-01-01')))  # integer day index\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # per customer\n" +
            "     .orderBy('day_num'))                                # days in order\n" +
            "\n" +
            "islands = (days\n" +
            "    .withColumn('rn', row_number().over(w))              # 1, 2, 3, ... per customer\n" +
            "    .withColumn('grp', col('day_num') - col('rn')))     # constant within a consecutive run\n" +
            "\n" +
            "result = (islands\n" +
            "    .groupBy('customer_id', 'grp')                       # one group per run\n" +
            "    .count()\n" +
            "    .filter(col('count') >= 3)                          # runs of >= 3 days\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, row_number\n" +
            "\n" +
            "days = orders.select('customer_id', 'order_date').distinct()\n" +
            "\n" +
            "days = days.withColumn(\n" +
            "    'day_num', datediff(col('order_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('day_num'))\n" +
            "\n" +
            "islands = (days\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .withColumn('grp', col('day_num') - col('rn')))\n" +
            "\n" +
            "result = (islands\n" +
            "    .groupBy('customer_id', 'grp')\n" +
            "    .count()\n" +
            "    .filter(col('count') >= 3)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Three **wide** steps. The `distinct()` dedupes days by hash shuffle on `(customer_id, order_date)`. The `row_number()` window shuffles by `customer_id` and sorts by `day_num` within each partition. The `groupBy('customer_id', 'grp').count()` shuffles by that composite key (with map-side partial counts, so only per-group subtotals cross the network). `datediff` and the subtraction that forms `grp` are **narrow**. The genius of gaps-and-islands is that it turns 'consecutive run detection' into a plain equality/groupBy — no self-join and no recursion. Skewed customers dominate the window shuffle; the final `distinct()` is a small dedupe.",
      sparkSql:
        "WITH days AS (\n" +
        "  SELECT DISTINCT customer_id, order_date,\n" +
        "         DATEDIFF(order_date, DATE'1970-01-01') AS day_num\n" +
        "  FROM orders\n" +
        "),\n" +
        "islands AS (\n" +
        "  SELECT customer_id, day_num,\n" +
        "         day_num - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day_num) AS grp\n" +
        "  FROM days\n" +
        ")\n" +
        "SELECT DISTINCT customer_id\n" +
        "FROM islands\n" +
        "GROUP BY customer_id, grp\n" +
        "HAVING COUNT(*) >= 3;",
      recognizeRecall: [
        "**Spot it:** 'at least 3 consecutive days', 'N days in a row', 'run of consecutive periods'.",
        "**Say it:** gaps-and-islands — `day_num - row_number()` is constant per run; groupBy that and keep `count >= 3`.",
        "**Trap:** dedupe days first; use row_number (strict, not rank); the group id is a label, not a date."
      ]
    },

    // ------------------------------------------------------------------ Q88
    {
      id: "longest-gap-between-purchases",
      lc: 88,
      title: "Customer with the longest gap between two consecutive purchases",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Lag gap + global max", transformation: "Wide (shuffle)", functions: "Window, lag, datediff, max" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find the customer whose largest gap between two **consecutive** purchases (in date order) is the biggest across all customers. Compute each order's gap from the previous order with `lag` + `datediff`, take each customer's maximum gap, then pick the customer with the overall maximum.",
      examples: [
        {
          input: "orders: (c1, 2026-01-01), (c1, 2026-01-10), (c2, 2026-01-01), (c2, 2026-04-01)",
          output: "c2 (max gap 90 days)",
          reasoning: "c1's only gap is 9 days; c2's only gap is 90 days. c2 has the largest single gap between consecutive purchases across all customers."
        }
      ],
      approaches: [
        {
          name: "lag gap per order, max gap per customer, then the global top gap",
          whenToUse: "Finding the entity with the extreme (max/min) inter-event interval.",
          logic:
            "**What it asks.** The customer with the single longest wait between two of their consecutive orders.\n\n" +
            "**Key Idea.** Within each customer, `datediff(order_date, lag(order_date))` gives the gap to the previous order. The customer's worst gap is the `max` of those per-order gaps; the answer is the customer whose max gap is the largest overall.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. Per-order gap: `withColumn('gap', datediff(col('order_date'), lag('order_date').over(w)))`.\n" +
            "3. Per-customer worst gap: `groupBy('customer_id').agg(_max('gap').alias('max_gap'))`.\n" +
            "4. Pick the global top: order by `max_gap` descending and take the first (or filter to the overall `max`).\n\n" +
            "**Why it works.** `lag` + `datediff` measures each consecutive interval; the per-customer `max` reduces those to one worst-case gap per customer, and a final ordering/limit selects the extreme customer.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first order per customer has a null gap (no predecessor); `max` ignores nulls, so single-order customers get a null max and drop out naturally.\n" +
            "- `datediff(order_date, prev)` (end, start) keeps gaps non-negative; get the argument order right.\n" +
            "- If ties for the largest gap are possible and you must return all of them, filter to `max_gap == overall_max` instead of `limit(1)`.\n\n" +
            "**Interview mindset.** 'lag+datediff for each gap, max per customer, then the global max' — mention the null-first-order and the tie-handling choice.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff, max as _max\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # within one customer\n" +
            "     .orderBy('order_date'))                             # in date order\n" +
            "\n" +
            "gaps = orders.withColumn(\n" +
            "    'gap',\n" +
            "    datediff(col('order_date'), lag('order_date').over(w)))  # days since previous order\n" +
            "\n" +
            "per_customer = (gaps\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_max('gap').alias('max_gap')))                 # each customer's worst gap\n" +
            "\n" +
            "result = per_customer.orderBy(col('max_gap').desc()).limit(1)  # the overall longest gap\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff, max as _max\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "gaps = orders.withColumn(\n" +
            "    'gap',\n" +
            "    datediff(col('order_date'), lag('order_date').over(w)))\n" +
            "\n" +
            "per_customer = (gaps\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_max('gap').alias('max_gap')))\n" +
            "\n" +
            "result = per_customer.orderBy(col('max_gap').desc()).limit(1)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `lag` is the first **wide** step (shuffle by `customer_id`, sort by `order_date`); `datediff` is a **narrow** expression on top of it. The `groupBy('customer_id').agg(max(...))` is a second **wide** aggregation, but `max` supports **map-side partial aggregation**, so only one candidate max per key per partition crosses the network. The final `orderBy(...).limit(1)` triggers a **top-N**: Spark keeps the largest few per partition and merges, which is far cheaper than a full sort. `max` skips nulls, so first-order customers with a null gap fall out. Skew on heavy customers is the main risk in the window step.",
      sparkSql:
        "WITH gaps AS (\n" +
        "  SELECT customer_id,\n" +
        "         DATEDIFF(order_date,\n" +
        "                  LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gap\n" +
        "  FROM orders\n" +
        "),\n" +
        "per_customer AS (\n" +
        "  SELECT customer_id, MAX(gap) AS max_gap FROM gaps GROUP BY customer_id\n" +
        ")\n" +
        "SELECT customer_id, max_gap\n" +
        "FROM per_customer\n" +
        "ORDER BY max_gap DESC\n" +
        "LIMIT 1;",
      recognizeRecall: [
        "**Spot it:** 'longest gap between purchases', 'biggest wait between orders', 'largest inter-event interval'.",
        "**Say it:** `datediff(date, lag(date))` for each gap, `max` per customer, then the global max via `orderBy(desc).limit(1)`.",
        "**Trap:** first order gap is null (single-order customers drop out); datediff arg order; filter for ties if needed."
      ]
    },

    // ------------------------------------------------------------------ Q91
    {
      id: "seven-day-rolling-order-count",
      lc: 91,
      title: "7-day rolling order count per product",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Time-based rolling count (rangeBetween)", transformation: "Wide (shuffle)", functions: "Window, count, rangeBetween, datediff" },
      description:
        "Given an `orders` DataFrame (`product_id`, `order_date`, `order_id`), add a `rolling_7d_orders` column: for each row, the number of orders for that product over a trailing **7-day calendar window** (the current day and the 6 days before it). Because the window spans *days* rather than a fixed number of rows, it must frame on the date value via the datediff day-number trick.",
      examples: [
        {
          input: "product p1: (2026-06-01), (2026-06-02), (2026-06-02), (2026-06-10)",
          output: "rolling_7d_orders -> 1, 3, 3, 1",
          reasoning: "On 06-02 the window covers 06-01..06-02 and sees 3 orders (one on 06-01, two on 06-02). On 06-10 the window is 06-04..06-10, so all the June-1/2 orders have dropped out, leaving just 1."
        }
      ],
      approaches: [
        {
          name: "rangeBetween(-6, 0) on a day-number ordering column",
          whenToUse: "A rolling COUNT over a span of TIME (last 7/30 days) rather than a fixed number of rows.",
          logic:
            "**What it asks.** A trailing 7-calendar-day order count per product that correctly handles gaps and multiple orders per day.\n\n" +
            "**Key Idea.** `rangeBetween` frames rows by the *value* of the ORDER BY column. Convert the date to an integer day-number with `datediff(order_date, lit('1970-01-01'))`, order by it, and use `rangeBetween(-6, 0)` — 'all rows whose day-number is within 6 of the current one', a 7-day span — then `count`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Add the numeric key: `withColumn('day_num', datediff(col('order_date'), lit('1970-01-01')))`.\n" +
            "2. Build `w = Window.partitionBy('product_id').orderBy('day_num').rangeBetween(-6, 0)` — 6 days back through today, inclusive (7 days).\n" +
            "3. `withColumn('rolling_7d_orders', count('*').over(w))`.\n\n" +
            "**Why it works.** `rangeBetween(-6, 0)` on a day-number means 'current value minus 6 up to current value', so every order within the last 7 calendar days is counted no matter how many rows share a day, and missing days simply contribute no rows.\n\n" +
            "**Common Gotchas.**\n" +
            "- You must order by a **numeric** column for `rangeBetween`; a raw date is not directly usable for a numeric range, hence the day-number.\n" +
            "- `rangeBetween(-6, 0)` is 7 days *inclusive*; `-7` would be an 8-day span — a classic off-by-one.\n" +
            "- `rowsBetween(-6, 0)` would count the last 7 *rows*, which is wrong when a product has multiple orders per day or gaps between days.\n\n" +
            "**Interview mindset.** The headline is 'rows vs range': a *time* window needs `rangeBetween` over a numeric day column, not `rowsBetween`; get the -6 (inclusive) count right.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, count\n" +
            "\n" +
            "# rangeBetween needs a NUMERIC order key -> days since the epoch.\n" +
            "orders_d = orders.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('order_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('product_id')                         # per product\n" +
            "     .orderBy('day_num')                                # ordered by day number\n" +
            "     .rangeBetween(-6, 0))                              # today + previous 6 days = 7-day span\n" +
            "\n" +
            "result = orders_d.withColumn(\n" +
            "    'rolling_7d_orders',\n" +
            "    count('*').over(w))                                # trailing 7-day order count\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, count\n" +
            "\n" +
            "orders_d = orders.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('order_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('product_id')\n" +
            "     .orderBy('day_num')\n" +
            "     .rangeBetween(-6, 0))\n" +
            "\n" +
            "result = orders_d.withColumn(\n" +
            "    'rolling_7d_orders',\n" +
            "    count('*').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: shuffle by `product_id`, sort by `day_num` within each partition, then a windowed count over the value-based frame. The crucial distinction is the frame type: `rowsBetween(a, b)` counts **physical rows** relative to the current one, while `rangeBetween(a, b)` selects rows whose **ORDER BY value** falls in `[current+a, current+b]`. A calendar window must use `rangeBetween` over a numeric day-number (from `datediff`) so gaps and same-day duplicates are handled correctly — a row-count frame would silently give the wrong window whenever daily counts vary. `rangeBetween(-6, 0)` is inclusive of both ends (7 days). Cost is the per-product shuffle+sort; a dominant product is the skew hotspot.",
      sparkSql:
        "SELECT product_id, order_date, order_id,\n" +
        "       COUNT(*) OVER (\n" +
        "         PARTITION BY product_id\n" +
        "         ORDER BY datediff(order_date, DATE'1970-01-01')\n" +
        "         RANGE BETWEEN 6 PRECEDING AND CURRENT ROW\n" +
        "       ) AS rolling_7d_orders\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** '7-day rolling count', 'orders in the last 7 days', a COUNT over a TIME span not a row count.",
        "**Say it:** order by `datediff(date, '1970-01-01')` and use `rangeBetween(-6, 0)` for a 7-day inclusive window, then count.",
        "**Trap:** rangeBetween (by value) not rowsBetween (by row); -6 inclusive = 7 days; must order by a numeric day-number."
      ]
    },

    // ------------------------------------------------------------------ Q96
    {
      id: "three-consecutive-months-revenue-increase-product",
      lc: 96,
      title: "Products whose monthly revenue increased for 3 consecutive months",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Monthly rollup + chained lag increases", transformation: "Wide (shuffle)", functions: "date_format, sum, Window, lag" },
      description:
        "Given a `sales` DataFrame (`product_id`, `sale_date`, `amount`), find the products whose monthly revenue **increased for three consecutive months** — three back-to-back months where each month's revenue is strictly greater than the previous month's. Roll revenue up to `product_id` x month, then compare each month to its two predecessors per product.",
      examples: [
        {
          input: "p1 monthly revenue: (2026-01, 100), (2026-02, 150), (2026-03, 200) ; p2: (2026-01, 100), (2026-02, 90)",
          output: "p1 qualifies",
          reasoning: "p1's revenue rises 100 < 150 < 200 across three consecutive months. p2 falls in February, so it never has a 3-month rising run and is excluded."
        }
      ],
      approaches: [
        {
          name: "aggregate to product-month, then two lags for a rising triple",
          whenToUse: "Detecting N consecutive increases on a per-entity time series aggregated to a period.",
          logic:
            "**What it asks.** Which products had three consecutive months of strictly increasing revenue.\n\n" +
            "**Key Idea.** First reduce sales to one revenue figure per `product_id` per month using `date_format(sale_date, 'yyyy-MM')` and `sum('amount')`. Then, per product, order the months and fetch the previous two months' revenue with `lag(1)` and `lag(2)`; a rising triple is `prev2 < prev1 < revenue`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Bucket to month: `withColumn('month', date_format(col('sale_date'), 'yyyy-MM'))`.\n" +
            "2. Aggregate: `groupBy('product_id', 'month').agg(_sum('amount').alias('revenue'))`.\n" +
            "3. Build `w = Window.partitionBy('product_id').orderBy('month')`.\n" +
            "4. `prev1 = lag('revenue', 1).over(w)`, `prev2 = lag('revenue', 2).over(w)`.\n" +
            "5. Keep rows where `(prev2 < prev1) & (prev1 < revenue)`, then take distinct `product_id`.\n\n" +
            "**Why it works.** The `yyyy-MM` label sorts chronologically (zero-padded), so ordering by it walks a product's months in time order; `lag(1)`/`lag(2)` line up the two prior months so a strictly rising triple is a single per-row predicate.\n\n" +
            "**Common Gotchas.**\n" +
            "- `lag` compares to the previous *present* month, not a calendar-adjacent one — a product with a gap month (no sales) has adjacent rows that are not truly consecutive calendar months. If strict calendar adjacency is required, densify the month series first.\n" +
            "- Use strict `<` for 'increased'; `<=` lets a flat month count.\n" +
            "- The first two months per product have null `prev1`/`prev2`, so they never falsely qualify.\n\n" +
            "**Interview mindset.** 'Aggregate to product-month, then chained lags for the rising triple' — and flag the gap-month caveat, which separates a strong answer from a naive one.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, sum as _sum, lag\n" +
            "\n" +
            "monthly = (sales\n" +
            "    .withColumn('month', date_format(col('sale_date'), 'yyyy-MM'))  # bucket to yyyy-MM\n" +
            "    .groupBy('product_id', 'month')\n" +
            "    .agg(_sum('amount').alias('revenue')))               # revenue per product per month\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('product_id')                         # within one product\n" +
            "     .orderBy('month'))                                 # months chronologically\n" +
            "\n" +
            "prev1 = lag('revenue', 1).over(w)                       # previous month's revenue\n" +
            "prev2 = lag('revenue', 2).over(w)                       # two months back\n" +
            "\n" +
            "result = (monthly\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('revenue')))            # prev2 < prev1 < revenue (rising triple)\n" +
            "    .select('product_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, sum as _sum, lag\n" +
            "\n" +
            "monthly = (sales\n" +
            "    .withColumn('month', date_format(col('sale_date'), 'yyyy-MM'))\n" +
            "    .groupBy('product_id', 'month')\n" +
            "    .agg(_sum('amount').alias('revenue')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('product_id')\n" +
            "     .orderBy('month'))\n" +
            "\n" +
            "prev1 = lag('revenue', 1).over(w)\n" +
            "prev2 = lag('revenue', 2).over(w)\n" +
            "\n" +
            "result = (monthly\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('revenue')))\n" +
            "    .select('product_id').distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two **wide** steps plus a dedupe. The `groupBy('product_id', 'month').agg(sum(...))` shuffles by the composite key (map-side partial sums keep it cheap). The two `lag` calls share one window operator over a single shuffle by `product_id` (sorted by `month`). `date_format`, the `<` comparisons, and the `filter` are **narrow**; leading nulls on the first two months make the predicate null (dropped). The final `distinct()` on `product_id` is a small dedupe shuffle. The gap-month subtlety is a correctness note, not a performance one: `lag` is positional over present rows, so absent months are invisible to it.",
      sparkSql:
        "WITH monthly AS (\n" +
        "  SELECT product_id, DATE_FORMAT(sale_date, 'yyyy-MM') AS month, SUM(amount) AS revenue\n" +
        "  FROM sales GROUP BY product_id, DATE_FORMAT(sale_date, 'yyyy-MM')\n" +
        "),\n" +
        "lagged AS (\n" +
        "  SELECT product_id, month, revenue,\n" +
        "         LAG(revenue, 1) OVER (PARTITION BY product_id ORDER BY month) AS prev1,\n" +
        "         LAG(revenue, 2) OVER (PARTITION BY product_id ORDER BY month) AS prev2\n" +
        "  FROM monthly\n" +
        ")\n" +
        "SELECT DISTINCT product_id\n" +
        "FROM lagged\n" +
        "WHERE prev2 < prev1 AND prev1 < revenue;",
      recognizeRecall: [
        "**Spot it:** 'revenue increased 3 consecutive months', 'three rising months in a row' per product.",
        "**Say it:** aggregate to product-month, then keep `prev2 < prev1 < revenue` via `lag(1)`/`lag(2)` over `partitionBy(product).orderBy(month)`.",
        "**Trap:** lag skips gap months (densify if strict calendar adjacency matters); strict <; first two months are null."
      ]
    },

    // ------------------------------------------------------------------ Q104
    {
      id: "longest-consecutive-login-streak",
      lc: 104,
      title: "Each user's longest consecutive login streak",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Gaps-and-islands + max run length", transformation: "Wide (shuffle)", functions: "Window, row_number, datediff, groupBy, max" },
      description:
        "Given a `logins` DataFrame (`user_id`, `login_date`), compute each user's **longest consecutive-day login streak** — the maximum number of back-to-back calendar days they logged in. This is gaps-and-islands: dedupe login days, subtract a per-user row number from each day-number to label consecutive runs, count each run, and take the longest per user.",
      examples: [
        {
          input: "logins: (u1, 2026-07-01), (u1, 2026-07-02), (u1, 2026-07-03), (u1, 2026-07-10), (u2, 2026-07-05)",
          output: "u1 -> 3, u2 -> 1",
          reasoning: "u1's days 07-01..07-03 form a 3-day streak, then 07-10 starts a separate 1-day run; the longest is 3. u2 has a single login, so its longest streak is 1."
        }
      ],
      approaches: [
        {
          name: "gaps-and-islands to label runs, count each, take the max per user",
          whenToUse: "Longest streak / maximum consecutive-run length per entity over a date sequence.",
          logic:
            "**What it asks.** For every user, the length of their longest run of consecutive login days.\n\n" +
            "**Key Idea.** Same gaps-and-islands backbone as the 'at least 3 consecutive days' problem, but now you *measure* every run and keep the biggest. Dedupe login days, convert to a day-number, subtract a per-user `row_number()` to get a constant island id per run, `count` each island, then `max` those counts per user.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Dedupe days: `days = logins.select('user_id', 'login_date').distinct()`.\n" +
            "2. Day-number: `withColumn('day_num', datediff(col('login_date'), lit('1970-01-01')))`.\n" +
            "3. `rn = row_number().over(Window.partitionBy('user_id').orderBy('day_num'))`.\n" +
            "4. Island id: `withColumn('grp', col('day_num') - col('rn'))` — constant within a run.\n" +
            "5. Run lengths: `groupBy('user_id', 'grp').count()`.\n" +
            "6. Longest per user: `groupBy('user_id').agg(_max('count').alias('longest_streak'))`.\n\n" +
            "**Why it works.** Within a consecutive run, `day_num` and `rn` both step by 1, so `day_num - rn` is constant and identifies the run; a gap changes the difference and starts a new island. Each island's row count is its streak length, and the per-user `max` of those is the longest streak.\n\n" +
            "**Common Gotchas.**\n" +
            "- Dedupe days first, or repeated same-day logins break the row_number/day_number lockstep.\n" +
            "- Use `row_number` (strict 1..N), not `rank`/`dense_rank`.\n" +
            "- A user with logins always yields at least a streak of 1, so no user is spuriously dropped.\n\n" +
            "**Interview mindset.** 'Gaps-and-islands to label runs, count per island, max per user' — call out that this is the same trick as the consecutive-days problem with a max on top.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, row_number, max as _max\n" +
            "\n" +
            "days = logins.select('user_id', 'login_date').distinct()  # one row per user per day\n" +
            "\n" +
            "days = days.withColumn(\n" +
            "    'day_num', datediff(col('login_date'), lit('1970-01-01')))  # integer day index\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')                            # per user\n" +
            "     .orderBy('day_num'))                               # days in order\n" +
            "\n" +
            "islands = (days\n" +
            "    .withColumn('rn', row_number().over(w))             # 1, 2, 3, ... per user\n" +
            "    .withColumn('grp', col('day_num') - col('rn')))    # constant within a run\n" +
            "\n" +
            "run_lengths = (islands\n" +
            "    .groupBy('user_id', 'grp')\n" +
            "    .count())                                          # length of each streak\n" +
            "\n" +
            "result = (run_lengths\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(_max('count').alias('longest_streak')))       # longest streak per user\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, row_number, max as _max\n" +
            "\n" +
            "days = logins.select('user_id', 'login_date').distinct()\n" +
            "\n" +
            "days = days.withColumn(\n" +
            "    'day_num', datediff(col('login_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')\n" +
            "     .orderBy('day_num'))\n" +
            "\n" +
            "islands = (days\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .withColumn('grp', col('day_num') - col('rn')))\n" +
            "\n" +
            "run_lengths = (islands\n" +
            "    .groupBy('user_id', 'grp')\n" +
            "    .count())\n" +
            "\n" +
            "result = (run_lengths\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(_max('count').alias('longest_streak')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Four **wide** steps chained: a `distinct()` dedupe (hash on `(user_id, login_date)`), the `row_number()` window (shuffle by `user_id`, sort by `day_num`), the `groupBy('user_id', 'grp').count()` (composite-key shuffle with map-side partials), and the `groupBy('user_id').agg(max(...))` (another partial-aggregated shuffle). `datediff` and the subtraction forming `grp` are **narrow**. The two stacked groupBys could be fused conceptually, but the run-length count must complete before the per-user max. Gaps-and-islands again replaces any self-join or recursion with plain equality grouping. Heavy users are the skew hotspot in the window and the first groupBy.",
      sparkSql:
        "WITH days AS (\n" +
        "  SELECT DISTINCT user_id, login_date,\n" +
        "         DATEDIFF(login_date, DATE'1970-01-01') AS day_num\n" +
        "  FROM logins\n" +
        "),\n" +
        "islands AS (\n" +
        "  SELECT user_id, day_num,\n" +
        "         day_num - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day_num) AS grp\n" +
        "  FROM days\n" +
        "),\n" +
        "run_lengths AS (\n" +
        "  SELECT user_id, grp, COUNT(*) AS streak FROM islands GROUP BY user_id, grp\n" +
        ")\n" +
        "SELECT user_id, MAX(streak) AS longest_streak\n" +
        "FROM run_lengths\n" +
        "GROUP BY user_id;",
      recognizeRecall: [
        "**Spot it:** 'longest login streak', 'max consecutive days', 'longest run of back-to-back days'.",
        "**Say it:** gaps-and-islands — `day_num - row_number()` labels runs; count per island, then max per user.",
        "**Trap:** dedupe days first; row_number (strict); every user with a login has a streak of at least 1."
      ]
    },

    // ------------------------------------------------------------------ Q133
    {
      id: "three-consecutive-months-spending-increase-customer",
      lc: 133,
      title: "Customers whose monthly spending increased for 3 consecutive months",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Monthly rollup + chained lag increases", transformation: "Wide (shuffle)", functions: "date_format, sum, Window, lag" },
      description:
        "Given a `transactions` DataFrame (`customer_id`, `txn_date`, `amount`), find the customers whose monthly spending **increased for three consecutive months** — three back-to-back months where each month's total spend is strictly greater than the previous month's. Roll spend up to `customer_id` x month, then compare each month to its two predecessors per customer.",
      examples: [
        {
          input: "c1 monthly spend: (2026-01, 200), (2026-02, 300), (2026-03, 350) ; c2: (2026-01, 200), (2026-02, 180)",
          output: "c1 qualifies",
          reasoning: "c1's spend rises 200 < 300 < 350 across three consecutive months. c2 drops in February, so it never has a 3-month rising run and is excluded."
        }
      ],
      approaches: [
        {
          name: "aggregate to customer-month, then two lags for a rising triple",
          whenToUse: "Detecting N consecutive increases in a per-customer spend/activity time series.",
          logic:
            "**What it asks.** Which customers had three consecutive months of strictly increasing spend.\n\n" +
            "**Key Idea.** Reduce transactions to one spend figure per `customer_id` per month with `date_format(txn_date, 'yyyy-MM')` and `sum('amount')`. Then, per customer, order the months and fetch the previous two months' spend with `lag(1)` and `lag(2)`; a rising triple is `prev2 < prev1 < spend`. (Same shape as the product-revenue version — recognize the reusable pattern.)\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Bucket to month: `withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))`.\n" +
            "2. Aggregate: `groupBy('customer_id', 'month').agg(_sum('amount').alias('spend'))`.\n" +
            "3. Build `w = Window.partitionBy('customer_id').orderBy('month')`.\n" +
            "4. `prev1 = lag('spend', 1).over(w)`, `prev2 = lag('spend', 2).over(w)`.\n" +
            "5. Keep rows where `(prev2 < prev1) & (prev1 < spend)`, then take distinct `customer_id`.\n\n" +
            "**Why it works.** The `yyyy-MM` label sorts chronologically, so ordering by it walks each customer's months in time order; `lag(1)`/`lag(2)` line up the two prior months so a strictly rising triple is a single per-row predicate.\n\n" +
            "**Common Gotchas.**\n" +
            "- `lag` compares to the previous *present* month, so a customer with a no-spend gap month has adjacent rows that are not truly consecutive calendar months; densify the month series if strict adjacency is required.\n" +
            "- Use strict `<` for 'increased'; `<=` would let a flat month qualify.\n" +
            "- The first two months per customer have null `prev1`/`prev2` and never falsely qualify.\n\n" +
            "**Interview mindset.** 'Aggregate to customer-month, chained lags for the rising triple' — and note it is the same template as any N-consecutive-increase question, just re-keyed.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, sum as _sum, lag\n" +
            "\n" +
            "monthly = (transactions\n" +
            "    .withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))  # bucket to yyyy-MM\n" +
            "    .groupBy('customer_id', 'month')\n" +
            "    .agg(_sum('amount').alias('spend')))                 # spend per customer per month\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # within one customer\n" +
            "     .orderBy('month'))                                  # months chronologically\n" +
            "\n" +
            "prev1 = lag('spend', 1).over(w)                          # previous month's spend\n" +
            "prev2 = lag('spend', 2).over(w)                          # two months back\n" +
            "\n" +
            "result = (monthly\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('spend')))               # prev2 < prev1 < spend (rising triple)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, sum as _sum, lag\n" +
            "\n" +
            "monthly = (transactions\n" +
            "    .withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))\n" +
            "    .groupBy('customer_id', 'month')\n" +
            "    .agg(_sum('amount').alias('spend')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('month'))\n" +
            "\n" +
            "prev1 = lag('spend', 1).over(w)\n" +
            "prev2 = lag('spend', 2).over(w)\n" +
            "\n" +
            "result = (monthly\n" +
            "    .withColumn('prev1', prev1)\n" +
            "    .withColumn('prev2', prev2)\n" +
            "    .filter((col('prev2') < col('prev1')) &\n" +
            "            (col('prev1') < col('spend')))\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Same profile as the product-revenue version (Q96). The `groupBy('customer_id', 'month').agg(sum(...))` is a **wide** composite-key shuffle softened by map-side partial sums. The two `lag` calls share one window operator over a single shuffle by `customer_id` (sorted by `month`). `date_format`, the `<` comparisons, and the `filter` are **narrow**; leading nulls on the first two months are dropped by the predicate. The trailing `distinct()` on `customer_id` is a small dedupe shuffle. The gap-month caveat (lag is positional over present rows) is a correctness note. Skew on high-frequency customers is the main cost in the aggregation and window.",
      sparkSql:
        "WITH monthly AS (\n" +
        "  SELECT customer_id, DATE_FORMAT(txn_date, 'yyyy-MM') AS month, SUM(amount) AS spend\n" +
        "  FROM transactions GROUP BY customer_id, DATE_FORMAT(txn_date, 'yyyy-MM')\n" +
        "),\n" +
        "lagged AS (\n" +
        "  SELECT customer_id, month, spend,\n" +
        "         LAG(spend, 1) OVER (PARTITION BY customer_id ORDER BY month) AS prev1,\n" +
        "         LAG(spend, 2) OVER (PARTITION BY customer_id ORDER BY month) AS prev2\n" +
        "  FROM monthly\n" +
        ")\n" +
        "SELECT DISTINCT customer_id\n" +
        "FROM lagged\n" +
        "WHERE prev2 < prev1 AND prev1 < spend;",
      recognizeRecall: [
        "**Spot it:** 'spending increased 3 consecutive months', 'three rising months of spend in a row' per customer.",
        "**Say it:** aggregate to customer-month, then keep `prev2 < prev1 < spend` via `lag(1)`/`lag(2)` over `partitionBy(cust).orderBy(month)`.",
        "**Trap:** lag skips gap months (densify if calendar adjacency matters); strict <; first two months are null."
      ]
    }

  ]);
})();
