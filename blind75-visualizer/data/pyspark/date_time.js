/*
 * PySpark Interview Lab — Date & Time (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Date functions (datediff, date_format, date_sub, to_date) are NARROW per-row
 * expressions; the moment you groupBy or partitionBy a window, the step becomes
 * WIDE (shuffle). Pure row filters on a date (Q119) stay narrow and are
 * pushdown / partition-pruning friendly.
 */
(function () {
  var CAT = "Date & Time";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q44
    {
      id: "first-purchase-month-per-customer",
      lc: 44,
      title: "First purchase month for every customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Earliest date per group + format", transformation: "Wide (shuffle)", functions: "min, date_format, groupBy" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find each customer's **first** purchase and report the month it happened in as a `yyyy-MM` string. Take the minimum `order_date` per customer, then format that date into a year-month label.",
      examples: [
        {
          input: "orders: (c1, 2026-03-14), (c1, 2026-05-02), (c2, 2026-01-30), (c2, 2026-02-11)",
          output: "(c1, 2026-03) ; (c2, 2026-01)",
          reasoning: "c1's earliest order is 2026-03-14 -> month 2026-03; c2's earliest is 2026-01-30 -> month 2026-01."
        }
      ],
      approaches: [
        {
          name: "groupBy + min(order_date) then date_format",
          whenToUse: "Any 'first/earliest event per key' where you then bucket the result by month.",
          logic:
            "**What it asks.** For every customer, the calendar month (yyyy-MM) of their very first order.\n\n" +
            "**Key Idea.** The earliest order per customer is `min('order_date')` after a `groupBy('customer_id')`. Once you hold that single date, `date_format(date, 'yyyy-MM')` renders it as a year-month string.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Make sure `order_date` is a real date (cast with `to_date` first if it is a string).\n" +
            "2. `orders.groupBy('customer_id').agg(_min('order_date').alias('first_order_date'))`.\n" +
            "3. Add the label: `withColumn('first_month', date_format(col('first_order_date'), 'yyyy-MM'))`.\n" +
            "4. Select the columns you want to report.\n\n" +
            "**Why it works.** `min` over a date column returns the chronologically earliest date because dates compare in calendar order; `date_format` then truncates it to a month label without changing the underlying value.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do the `min` on a true `DateType`; a string min compares lexicographically, which only accidentally works for zero-padded ISO dates.\n" +
            "- Format with `yyyy-MM` (capital M = month); lowercase `mm` means minutes and is a classic bug.\n" +
            "- Format the aggregated date, not every row — otherwise you re-introduce the rows you just collapsed.\n\n" +
            "**Interview mindset.** Say 'earliest per key = min after groupBy', then 'date_format to bucket into a month'; call out the yyyy-MM vs mm trap.",
          rcs:
            "from pyspark.sql.functions import col, date_format, min as _min\n" +
            "\n" +
            "first_orders = (orders\n" +
            "    .groupBy('customer_id')                              # one row per customer\n" +
            "    .agg(_min('order_date').alias('first_order_date')))  # earliest order date\n" +
            "\n" +
            "result = first_orders.withColumn(\n" +
            "    'first_month',\n" +
            "    date_format(col('first_order_date'), 'yyyy-MM'))     # year-month label\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, date_format, min as _min\n" +
            "\n" +
            "first_orders = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_date').alias('first_order_date')))\n" +
            "\n" +
            "result = first_orders.withColumn(\n" +
            "    'first_month',\n" +
            "    date_format(col('first_order_date'), 'yyyy-MM'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `groupBy('customer_id').agg(min(...))` is **wide**: Spark hash-shuffles rows by `customer_id` so each customer's orders meet, then keeps the minimum date per group. `min` supports a **partial (map-side) aggregate**, so each partition emits its local minimum before the shuffle, which keeps the amount of shuffled data tiny (one candidate date per key per partition). `date_format` runs afterward as a **narrow**, codegen-friendly per-row expression on the already-collapsed result. Key skew (a customer with a huge order history) is the only real cost risk, and partial aggregation blunts even that.",
      sparkSql:
        "SELECT customer_id,\n" +
        "       DATE_FORMAT(MIN(order_date), 'yyyy-MM') AS first_month\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** 'first/earliest purchase', 'signup month', 'cohort month' per customer.",
        "**Say it:** `groupBy(key).agg(min(date))` then `date_format(min_date, 'yyyy-MM')`.",
        "**Trap:** min on a real DateType (not a string), and use yyyy-MM (capital M), never mm."
      ]
    },

    // ------------------------------------------------------------------ Q78
    {
      id: "days-between-consecutive-orders",
      lc: 78,
      title: "Number of days between consecutive orders per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Lag on date + datediff (gap)", transformation: "Wide (shuffle)", functions: "Window, lag, datediff" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), add a `days_since_prev` column giving how many days passed since that customer's previous order, in date order. The first order per customer has no predecessor, so its gap is null.",
      examples: [
        {
          input: "orders: (c1, 2026-01-01), (c1, 2026-01-05), (c1, 2026-01-20)",
          output: "days_since_prev -> null, 4, 15",
          reasoning: "4 = 2026-01-05 minus 2026-01-01; 15 = 2026-01-20 minus 2026-01-05; the first order has nothing before it."
        }
      ],
      approaches: [
        {
          name: "lag(order_date) then datediff(current, previous)",
          whenToUse: "Measuring the time gap between one event and the prior event within a group.",
          logic:
            "**What it asks.** For each order, the number of days since the same customer's immediately preceding order.\n\n" +
            "**Key Idea.** Fetch the previous order date with `lag('order_date')` over a window partitioned by customer and ordered by date, then take `datediff(current_date_col, previous_date_col)`. `datediff(end, start)` returns `end - start` in whole days.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. Capture the prior date: `prev_date = lag('order_date').over(w)`.\n" +
            "3. Compute the gap: `withColumn('days_since_prev', datediff(col('order_date'), prev_date))`.\n\n" +
            "**Why it works.** `lag` aligns each customer's previous order date onto the current row after ordering; `datediff` then subtracts the two dates as a day count, all without collapsing any rows.\n\n" +
            "**Common Gotchas.**\n" +
            "- Argument order matters: `datediff(order_date, prev_date)` gives a positive forward gap; reversing it flips the sign.\n" +
            "- The first order per customer has a null `prev_date`, so `datediff` returns null — the correct 'no prior order' result.\n" +
            "- Order the window by a real `DateType`, not a string, so 'previous' is chronological.\n\n" +
            "**Interview mindset.** 'lag to fetch the previous date, datediff(current, previous) for the gap' — and state the argument order out loud.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # gaps within one customer\n" +
            "     .orderBy('order_date'))                             # in chronological order\n" +
            "\n" +
            "prev_date = lag('order_date').over(w)                    # previous order's date\n" +
            "result = orders.withColumn(\n" +
            "    'days_since_prev',\n" +
            "    datediff(col('order_date'), prev_date))             # end - start, in days (null on first)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, lag, datediff\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev_date = lag('order_date').over(w)\n" +
            "result = orders.withColumn(\n" +
            "    'days_since_prev',\n" +
            "    datediff(col('order_date'), prev_date))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `lag` drives the **wide** step: Spark shuffles rows by `customer_id` and sorts by `order_date` within each partition, then reads the value one row back in a single sequential pass. `datediff` is a **narrow**, codegen-friendly expression fused into the same stage — it just subtracts two integer day-numbers under the hood. Null propagates automatically on the leading row (`datediff(x, null) = null`). Partition-key skew (a customer with a very long order history landing on one reducer) is the main performance risk.",
      sparkSql:
        "SELECT customer_id, order_date,\n" +
        "       DATEDIFF(order_date,\n" +
        "                LAG(order_date) OVER (\n" +
        "                  PARTITION BY customer_id ORDER BY order_date)) AS days_since_prev\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'days between orders', 'time since last purchase', 'gap between consecutive events'.",
        "**Say it:** `datediff(col('order_date'), lag('order_date').over(partitionBy(key).orderBy(date)))`.",
        "**Trap:** datediff(end, start) — get the argument order right; first row is null by design."
      ]
    },

    // ------------------------------------------------------------------ Q83
    {
      id: "second-purchase-within-7-days",
      lc: 83,
      title: "Customers whose second purchase was within 7 days of the first",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Rank rows + datediff threshold", transformation: "Wide (shuffle)", functions: "Window, row_number, datediff" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find the customers whose **second** order happened within 7 days of their **first** order. Rank each customer's orders by date, isolate orders #1 and #2, and keep the customer only when the gap between them is 7 days or less.",
      examples: [
        {
          input: "orders: (c1, 2026-01-01), (c1, 2026-01-05), (c2, 2026-02-01), (c2, 2026-03-20)",
          output: "c1 qualifies (gap 4 days) ; c2 does not (gap 47 days)",
          reasoning: "c1's first two orders are 4 days apart (<= 7). c2's are 47 days apart, so c2 is excluded."
        }
      ],
      approaches: [
        {
          name: "row_number to tag orders, then compare #1 and #2",
          whenToUse: "Any 'the Nth event relative to the first/Mth event' condition within a group.",
          logic:
            "**What it asks.** Which customers made their second purchase no more than 7 days after their first.\n\n" +
            "**Key Idea.** Number each customer's orders in date order with `row_number()`. Keep only rows 1 and 2, pivot them side by side (a self-join on `customer_id`, or `lag`), and test `datediff(second_date, first_date) <= 7`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. `ranked = orders.withColumn('rn', row_number().over(w))`.\n" +
            "3. Split out `first = ranked.filter(col('rn') == 1)` and `second = ranked.filter(col('rn') == 2)`.\n" +
            "4. Join them on `customer_id` and compute `datediff(second.order_date, first.order_date)`.\n" +
            "5. Keep rows where that gap is `<= 7`.\n\n" +
            "**Why it works.** `row_number` gives a strict 1..N sequence with no ties, so rows 1 and 2 are unambiguous; `datediff` then measures the gap between exactly those two dates.\n\n" +
            "**Common Gotchas.**\n" +
            "- Customers with only one order have no row #2 and are correctly dropped by the join.\n" +
            "- Use `row_number` (strict) rather than `rank`/`dense_rank`, which can tie two same-day orders at rank 1.\n" +
            "- `datediff(second, first)` (end, start) keeps the gap non-negative; `<= 7` is inclusive of exactly 7 days.\n\n" +
            "**Interview mindset.** 'row_number to label first and second, then datediff between them with a <= 7 filter'; mention that single-order customers drop out naturally.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number, datediff\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                         # rank within a customer\n" +
            "     .orderBy('order_date'))                             # earliest order = rn 1\n" +
            "\n" +
            "ranked = orders.withColumn('rn', row_number().over(w))   # 1, 2, 3, ... per customer\n" +
            "\n" +
            "first = ranked.filter(col('rn') == 1).select(            # each customer's 1st order\n" +
            "    col('customer_id'), col('order_date').alias('first_date'))\n" +
            "second = ranked.filter(col('rn') == 2).select(           # each customer's 2nd order\n" +
            "    col('customer_id'), col('order_date').alias('second_date'))\n" +
            "\n" +
            "result = (first\n" +
            "    .join(second, 'customer_id')                         # only customers with a 2nd order\n" +
            "    .filter(datediff(col('second_date'), col('first_date')) <= 7))  # gap <= 7 days\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number, datediff\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "ranked = orders.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "first = ranked.filter(col('rn') == 1).select(\n" +
            "    col('customer_id'), col('order_date').alias('first_date'))\n" +
            "second = ranked.filter(col('rn') == 2).select(\n" +
            "    col('customer_id'), col('order_date').alias('second_date'))\n" +
            "\n" +
            "result = (first\n" +
            "    .join(second, 'customer_id')\n" +
            "    .filter(datediff(col('second_date'), col('first_date')) <= 7))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two **wide** steps stack here. First, `row_number()` shuffles by `customer_id` and sorts by `order_date` within each partition. Then the `join` on `customer_id` shuffles both sides by the same key again (though Catalyst may reuse the existing partitioning to avoid a second shuffle when the keys already line up). The `datediff` comparison is a **narrow** predicate applied after the join. An equivalent single-window variant uses `lag('order_date')` and keeps rows where `rn == 2 AND datediff(order_date, prev) <= 7`, which avoids the self-join entirely — worth mentioning as the leaner plan.",
      sparkSql:
        "WITH ranked AS (\n" +
        "  SELECT customer_id, order_date,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS rn,\n" +
        "         LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_date\n" +
        "  FROM orders\n" +
        ")\n" +
        "SELECT customer_id\n" +
        "FROM ranked\n" +
        "WHERE rn = 2 AND DATEDIFF(order_date, prev_date) <= 7;",
      recognizeRecall: [
        "**Spot it:** 'second purchase within N days of the first', 'quick repeat buyer', 'time to second order'.",
        "**Say it:** `row_number()` to tag orders 1 and 2, then keep where `datediff(second, first) <= 7`.",
        "**Trap:** use row_number (not rank) for a strict order; single-order customers drop out; datediff arg order."
      ]
    },

    // ------------------------------------------------------------------ Q84
    {
      id: "first-purchase-within-30-days-of-registration",
      lc: 84,
      title: "Customers whose first purchase was within 30 days of registration",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Join two dates + datediff threshold", transformation: "Wide (shuffle)", functions: "min, join, datediff" },
      description:
        "Given a `customers` DataFrame (`customer_id`, `registration_date`) and an `orders` DataFrame (`customer_id`, `order_date`), find the customers who placed their **first** order within 30 days of registering. Take each customer's earliest order date, join it back to the registration date, and keep those where the gap is 30 days or less.",
      examples: [
        {
          input: "customers: (c1, 2026-01-01), (c2, 2026-01-01) ; orders: (c1, 2026-01-10), (c2, 2026-03-15)",
          output: "c1 qualifies (9 days) ; c2 does not (73 days)",
          reasoning: "c1's first order is 9 days after signup (<= 30). c2's first order is 73 days later, so c2 is excluded."
        }
      ],
      approaches: [
        {
          name: "min(order_date) per customer, join to registration, datediff <= 30",
          whenToUse: "Comparing a per-customer milestone (first order) against an attribute held in another table (signup date).",
          logic:
            "**What it asks.** Which customers converted (placed their first order) within 30 days of registration.\n\n" +
            "**Key Idea.** The first order date is `min('order_date')` per customer; join that to `registration_date` and keep customers where `datediff(first_order, registration_date) <= 30`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Collapse orders to one row per customer: `orders.groupBy('customer_id').agg(_min('order_date').alias('first_order_date'))`.\n" +
            "2. Join to `customers` on `customer_id` to bring in `registration_date`.\n" +
            "3. Compute the gap: `datediff(col('first_order_date'), col('registration_date'))`.\n" +
            "4. Filter to `<= 30` (optionally also `>= 0` to guard against pre-registration orders in dirty data).\n\n" +
            "**Why it works.** Aggregating first, then joining, keeps the join small (one row per customer). `datediff(first_order, registration)` measures the conversion window directly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Aggregate the orders **before** the join, not after — joining raw orders then aggregating shuffles far more data.\n" +
            "- An inner join drops customers who never ordered, which is usually what you want; use a left join if you must report them.\n" +
            "- `datediff(first_order, registration)` (end, start) keeps the gap positive; `<= 30` is inclusive.\n\n" +
            "**Interview mindset.** 'Reduce orders to first-order-per-customer, join to signup, datediff <= 30' — and stress aggregating before the join to shrink the shuffle.",
          rcs:
            "from pyspark.sql.functions import col, datediff, min as _min\n" +
            "\n" +
            "first_orders = (orders\n" +
            "    .groupBy('customer_id')                              # one row per customer\n" +
            "    .agg(_min('order_date').alias('first_order_date')))  # earliest order\n" +
            "\n" +
            "result = (customers\n" +
            "    .join(first_orders, 'customer_id')                   # bring in registration_date\n" +
            "    .filter(datediff(col('first_order_date'),\n" +
            "                     col('registration_date')) <= 30))   # converted within 30 days\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, datediff, min as _min\n" +
            "\n" +
            "first_orders = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_date').alias('first_order_date')))\n" +
            "\n" +
            "result = (customers\n" +
            "    .join(first_orders, 'customer_id')\n" +
            "    .filter(datediff(col('first_order_date'),\n" +
            "                     col('registration_date')) <= 30))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two **wide** stages. The `groupBy('customer_id').agg(min(...))` shuffles orders by customer (with map-side partial aggregation, so only one candidate date per key per partition crosses the network). The `join` on `customer_id` then shuffles both small sides by the key — and because `first_orders` is one row per customer it is often small enough that Catalyst chooses a **broadcast hash join**, skipping the shuffle on the large side entirely. `datediff` and the `<= 30` filter are **narrow** and applied post-join. Aggregating before the join is the key optimization: it minimizes both the join input size and the shuffle.",
      sparkSql:
        "WITH first_orders AS (\n" +
        "  SELECT customer_id, MIN(order_date) AS first_order_date\n" +
        "  FROM orders GROUP BY customer_id\n" +
        ")\n" +
        "SELECT c.customer_id, c.registration_date, f.first_order_date\n" +
        "FROM customers c\n" +
        "JOIN first_orders f ON c.customer_id = f.customer_id\n" +
        "WHERE DATEDIFF(f.first_order_date, c.registration_date) <= 30;",
      recognizeRecall: [
        "**Spot it:** 'first order within N days of signup', 'time to first purchase', 'converted within a month'.",
        "**Say it:** `min(order_date)` per customer, join to `registration_date`, keep `datediff(first_order, registration) <= 30`.",
        "**Trap:** aggregate before joining; datediff arg order; inner join drops never-ordered customers."
      ]
    },

    // ------------------------------------------------------------------ Q92
    {
      id: "month-over-month-revenue-growth",
      lc: 92,
      title: "Month-over-month revenue growth",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Monthly rollup + lag % growth", transformation: "Wide (shuffle)", functions: "date_format, sum, lag, round" },
      description:
        "Given a `transactions` DataFrame (`txn_date`, `amount`), compute total revenue per calendar month and then the month-over-month percentage growth versus the previous month. Bucket each transaction into a `yyyy-MM` month, sum revenue per month, then compare each month to the one before it. The earliest month has no prior month, so its growth is null.",
      examples: [
        {
          input: "monthly revenue: (2026-01, 1000), (2026-02, 1500), (2026-03, 1200)",
          output: "growth_pct -> null, 50.0, -20.0",
          reasoning: "(1500-1000)/1000*100 = 50.0 ; (1200-1500)/1500*100 = -20.0 ; the first month has no baseline so it is null."
        }
      ],
      approaches: [
        {
          name: "date_format to month, sum, then lag over ordered months",
          whenToUse: "Any period-over-period growth on a time series aggregated to a coarser grain (month/week).",
          logic:
            "**What it asks.** For each month, total revenue and its percentage change from the previous month.\n\n" +
            "**Key Idea.** First reduce transactions to one row per month with `date_format(txn_date, 'yyyy-MM')` as the key and `sum('amount')` as revenue. Then order those monthly rows and use `lag('revenue')` to fetch the prior month, applying `(revenue - prev) / prev * 100`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Bucket to month: `withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))`.\n" +
            "2. Aggregate: `groupBy('month').agg(_sum('amount').alias('revenue'))`.\n" +
            "3. Build an ordered window over all months: `w = Window.orderBy('month')`.\n" +
            "4. `prev = lag('revenue').over(w)`.\n" +
            "5. `withColumn('growth_pct', _round((col('revenue') - prev) / prev * 100, 2))`.\n\n" +
            "**Why it works.** The `yyyy-MM` string sorts in chronological order (zero-padded), so `Window.orderBy('month')` visits months in time order and `lag` correctly returns the immediately preceding month's revenue.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first month's `prev` is null, so its growth is null — the intended 'no baseline' result.\n" +
            "- This window has **no partitionBy**, so all months land in a single partition; fine for a monthly series (small) but a genuine full-data shuffle to one reducer.\n" +
            "- Guard a zero previous month with `when(prev != 0, ...)` if a month could have zero revenue.\n" +
            "- Missing months are simply absent rows; `lag` compares to the previous *present* month, not a calendar-adjacent one.\n\n" +
            "**Interview mindset.** 'Aggregate to month, order the months, lag for the baseline, then percent-change'; call out the null first month and the single-partition window.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, lag, sum as _sum, round as _round\n" +
            "\n" +
            "monthly = (transactions\n" +
            "    .withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))  # bucket to yyyy-MM\n" +
            "    .groupBy('month')\n" +
            "    .agg(_sum('amount').alias('revenue')))               # total revenue per month\n" +
            "\n" +
            "w = Window.orderBy('month')                              # months in chronological order\n" +
            "prev = lag('revenue').over(w)                            # previous month's revenue\n" +
            "\n" +
            "result = monthly.withColumn(\n" +
            "    'growth_pct',\n" +
            "    _round((col('revenue') - prev) / prev * 100, 2))     # MoM % growth (null on first month)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, lag, sum as _sum, round as _round\n" +
            "\n" +
            "monthly = (transactions\n" +
            "    .withColumn('month', date_format(col('txn_date'), 'yyyy-MM'))\n" +
            "    .groupBy('month')\n" +
            "    .agg(_sum('amount').alias('revenue')))\n" +
            "\n" +
            "w = Window.orderBy('month')\n" +
            "prev = lag('revenue').over(w)\n" +
            "\n" +
            "result = monthly.withColumn(\n" +
            "    'growth_pct',\n" +
            "    _round((col('revenue') - prev) / prev * 100, 2))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two shuffles. The `groupBy('month').agg(sum(...))` is **wide** but cheap thanks to map-side partial sums — only per-month subtotals cross the network. The `lag` over `Window.orderBy('month')` **with no partitionBy** is the subtle cost: a window without a partition key funnels every row into a **single partition** on one executor, so it does not scale. For a monthly series that is a handful of rows and totally fine, but say so — on a partitioned time series (e.g. per store) you would `partitionBy` the entity to parallelize. `date_format`, the subtraction, and `round` are **narrow**. First-month null and zero-baseline division are the correctness notes.",
      sparkSql:
        "WITH monthly AS (\n" +
        "  SELECT DATE_FORMAT(txn_date, 'yyyy-MM') AS month, SUM(amount) AS revenue\n" +
        "  FROM transactions GROUP BY DATE_FORMAT(txn_date, 'yyyy-MM')\n" +
        ")\n" +
        "SELECT month, revenue,\n" +
        "       ROUND((revenue - LAG(revenue) OVER (ORDER BY month))\n" +
        "             / LAG(revenue) OVER (ORDER BY month) * 100, 2) AS growth_pct\n" +
        "FROM monthly;",
      recognizeRecall: [
        "**Spot it:** 'month-over-month growth', 'MoM %', 'revenue change vs last month'.",
        "**Say it:** `date_format(date,'yyyy-MM')` + `sum` to get monthly revenue, then `(rev - lag(rev))/lag(rev)*100` over `orderBy('month')`.",
        "**Trap:** first month is null; a partitionBy-less window goes to one partition; guard zero-revenue months."
      ]
    },

    // ------------------------------------------------------------------ Q93
    {
      id: "year-over-year-revenue-growth",
      lc: 93,
      title: "Year-over-year revenue growth",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Yearly rollup + lag % growth", transformation: "Wide (shuffle)", functions: "date_format, sum, lag, round" },
      description:
        "Given a `transactions` DataFrame (`txn_date`, `amount`), compute total revenue per calendar year and then the year-over-year percentage growth versus the previous year. Bucket each transaction into a `yyyy` year, sum revenue per year, then compare each year to the one before it. The earliest year has no prior year, so its growth is null.",
      examples: [
        {
          input: "yearly revenue: (2024, 50000), (2025, 65000), (2026, 58500)",
          output: "growth_pct -> null, 30.0, -10.0",
          reasoning: "(65000-50000)/50000*100 = 30.0 ; (58500-65000)/65000*100 = -10.0 ; the first year has no baseline so it is null."
        }
      ],
      approaches: [
        {
          name: "date_format to year, sum, then lag over ordered years",
          whenToUse: "Year-over-year (or any coarse-grain period-over-period) growth on a time series.",
          logic:
            "**What it asks.** For each year, total revenue and its percentage change from the previous year.\n\n" +
            "**Key Idea.** Identical shape to month-over-month, just a coarser bucket: use `date_format(txn_date, 'yyyy')` (or `year(txn_date)`) as the grouping key, `sum('amount')` for revenue, then `lag` over years ordered ascending with `(revenue - prev) / prev * 100`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Bucket to year: `withColumn('year', date_format(col('txn_date'), 'yyyy'))`.\n" +
            "2. Aggregate: `groupBy('year').agg(_sum('amount').alias('revenue'))`.\n" +
            "3. Order years: `w = Window.orderBy('year')`.\n" +
            "4. `prev = lag('revenue').over(w)`.\n" +
            "5. `withColumn('growth_pct', _round((col('revenue') - prev) / prev * 100, 2))`.\n\n" +
            "**Why it works.** The `yyyy` label sorts chronologically, so ordering by it walks years in time order and `lag` returns the prior year's revenue for the percent-change formula.\n\n" +
            "**Common Gotchas.**\n" +
            "- First year's `prev` is null -> growth null, as intended.\n" +
            "- `date_format(..., 'yyyy')` yields a **string** ('2026'); `year(...)` yields an **int**. Either sorts correctly, but be consistent about the type you carry forward.\n" +
            "- Same single-partition caveat: `Window.orderBy('year')` has no partitionBy, so all years go to one partition (trivial for a yearly series).\n" +
            "- Guard a zero previous year with `when(prev != 0, ...)` if that is possible.\n\n" +
            "**Interview mindset.** 'Same as MoM, coarser bucket' — show you recognize the reusable pattern: aggregate to the period, order, lag, percent-change.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, lag, sum as _sum, round as _round\n" +
            "\n" +
            "yearly = (transactions\n" +
            "    .withColumn('year', date_format(col('txn_date'), 'yyyy'))  # bucket to yyyy\n" +
            "    .groupBy('year')\n" +
            "    .agg(_sum('amount').alias('revenue')))               # total revenue per year\n" +
            "\n" +
            "w = Window.orderBy('year')                               # years in chronological order\n" +
            "prev = lag('revenue').over(w)                            # previous year's revenue\n" +
            "\n" +
            "result = yearly.withColumn(\n" +
            "    'growth_pct',\n" +
            "    _round((col('revenue') - prev) / prev * 100, 2))     # YoY % growth (null on first year)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, date_format, lag, sum as _sum, round as _round\n" +
            "\n" +
            "yearly = (transactions\n" +
            "    .withColumn('year', date_format(col('txn_date'), 'yyyy'))\n" +
            "    .groupBy('year')\n" +
            "    .agg(_sum('amount').alias('revenue')))\n" +
            "\n" +
            "w = Window.orderBy('year')\n" +
            "prev = lag('revenue').over(w)\n" +
            "\n" +
            "result = yearly.withColumn(\n" +
            "    'growth_pct',\n" +
            "    _round((col('revenue') - prev) / prev * 100, 2))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Same execution profile as month-over-month (Q92). The `groupBy('year').agg(sum(...))` is a **wide** shuffle softened by map-side partial aggregation. The `lag` over `Window.orderBy('year')` again has **no partitionBy**, so it collapses to a **single partition** — negligible for a yearly series (a few rows), but the pattern does not parallelize and you should name that limitation. `date_format`/`year`, subtraction, and `round` are **narrow**. Note the type choice: `date_format` returns a string year while `year()` returns an int; both order correctly but pick one deliberately.",
      sparkSql:
        "WITH yearly AS (\n" +
        "  SELECT DATE_FORMAT(txn_date, 'yyyy') AS year, SUM(amount) AS revenue\n" +
        "  FROM transactions GROUP BY DATE_FORMAT(txn_date, 'yyyy')\n" +
        ")\n" +
        "SELECT year, revenue,\n" +
        "       ROUND((revenue - LAG(revenue) OVER (ORDER BY year))\n" +
        "             / LAG(revenue) OVER (ORDER BY year) * 100, 2) AS growth_pct\n" +
        "FROM yearly;",
      recognizeRecall: [
        "**Spot it:** 'year-over-year growth', 'YoY %', 'annual revenue change'.",
        "**Say it:** `date_format(date,'yyyy')` (or `year()`) + `sum`, then `(rev - lag(rev))/lag(rev)*100` over `orderBy('year')`.",
        "**Trap:** first year null; date_format gives a string year vs year() an int; partitionBy-less window is single-partition."
      ]
    },

    // ------------------------------------------------------------------ Q100
    {
      id: "january-buyers-no-repeat-within-30-days",
      lc: 100,
      title: "January buyers who did not purchase again within 30 days",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self-join on gap + anti-condition", transformation: "Wide (shuffle)", functions: "date_format, datediff, join, when/agg" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`), find customers who made a purchase in **January** but did **not** purchase again within the next 30 days of that January order. For each January order, check whether the same customer has any later order within 30 days; keep the customers for whom no such follow-up exists.",
      examples: [
        {
          input: "orders: (c1, 2026-01-05), (c1, 2026-01-20), (c2, 2026-01-10), (c2, 2026-03-01)",
          output: "c2 qualifies ; c1 does not",
          reasoning: "c1 bought again on 01-20, only 15 days after 01-05 (a repeat within 30 days), so c1 is excluded. c2's next order is 50 days later, so c2 had no repeat within 30 days and qualifies."
        }
      ],
      approaches: [
        {
          name: "isolate January orders, self-join for a follow-up within 30 days, keep those with none",
          whenToUse: "'Bought once but not again within a window' churn/retention questions.",
          logic:
            "**What it asks.** Customers with a January purchase whose next order (if any) is more than 30 days after that January order.\n\n" +
            "**Key Idea.** Take each January order, then left-join every *later* order of the same customer and test whether any lands within 30 days. A customer qualifies when **no** follow-up order falls in the (0, 30]-day window after their January order.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Isolate January orders: `jan = orders.filter(date_format(col('order_date'), 'MM') == '01')` (add a year filter if needed), aliased as the left side.\n" +
            "2. Left-join the full `orders` (aliased right) on `customer_id` where the right order is strictly later: `r.order_date > j.order_date`.\n" +
            "3. Flag follow-ups within 30 days: `datediff(r.order_date, j.order_date) <= 30`.\n" +
            "4. Group by the January order and mark whether any follow-up existed; keep January orders where the follow-up flag is never true (no repeat within 30 days).\n\n" +
            "**Why it works.** The self-join pairs each January order with the customer's subsequent orders; `datediff <= 30` identifies a fast repeat. Filtering to groups with zero such repeats yields exactly the customers who did not come back within a month.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a **left** join and an anti-condition (no matching follow-up), not an inner join — an inner join would only find customers who *did* return.\n" +
            "- Require `r.order_date > j.order_date` so an order is never compared to itself.\n" +
            "- 'within the next 30 days' is `datediff(follow_up, january_order) <= 30` (and `> 0`); mind the inclusive boundary.\n" +
            "- Filter to January explicitly with `date_format(..., 'MM') == '01'` (and a year if the data spans several).\n\n" +
            "**Interview mindset.** Frame it as a retention/anti-join: 'January buyers minus those with a repeat within 30 days'. Mention the left-join-then-check-for-absence pattern.",
          rcs:
            "from pyspark.sql.functions import col, date_format, datediff, when, max as _max\n" +
            "\n" +
            "jan = (orders\n" +
            "    .filter(date_format(col('order_date'), 'MM') == '01')  # January orders only\n" +
            "    .select(col('customer_id'),\n" +
            "            col('order_date').alias('jan_date')))\n" +
            "\n" +
            "# Left-join every later order of the same customer.\n" +
            "paired = (jan.join(\n" +
            "        orders.select(col('customer_id'),\n" +
            "                      col('order_date').alias('next_date')),\n" +
            "        'customer_id', 'left')\n" +
            "    .withColumn(\n" +
            "        'repeat_within_30',\n" +
            "        when((col('next_date') > col('jan_date')) &\n" +
            "             (datediff(col('next_date'), col('jan_date')) <= 30), 1).otherwise(0)))\n" +
            "\n" +
            "# Keep January orders with NO follow-up within 30 days.\n" +
            "result = (paired\n" +
            "    .groupBy('customer_id', 'jan_date')\n" +
            "    .agg(_max('repeat_within_30').alias('has_repeat'))\n" +
            "    .filter(col('has_repeat') == 0)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, date_format, datediff, when, max as _max\n" +
            "\n" +
            "jan = (orders\n" +
            "    .filter(date_format(col('order_date'), 'MM') == '01')\n" +
            "    .select(col('customer_id'),\n" +
            "            col('order_date').alias('jan_date')))\n" +
            "\n" +
            "paired = (jan.join(\n" +
            "        orders.select(col('customer_id'),\n" +
            "                      col('order_date').alias('next_date')),\n" +
            "        'customer_id', 'left')\n" +
            "    .withColumn(\n" +
            "        'repeat_within_30',\n" +
            "        when((col('next_date') > col('jan_date')) &\n" +
            "             (datediff(col('next_date'), col('jan_date')) <= 30), 1).otherwise(0)))\n" +
            "\n" +
            "result = (paired\n" +
            "    .groupBy('customer_id', 'jan_date')\n" +
            "    .agg(_max('repeat_within_30').alias('has_repeat'))\n" +
            "    .filter(col('has_repeat') == 0)\n" +
            "    .select('customer_id').distinct())\n" +
            "result.show()",
        }
      ],
      sparkInternals:
        "The self-`join` on `customer_id` is the dominant **wide** step: both copies of `orders` shuffle by the key so a customer's January orders meet all their other orders. The `groupBy('customer_id', 'jan_date').agg(max(...))` is a second **wide** aggregation (with map-side partials). `date_format`, `datediff`, and the `when` flag are **narrow** expressions. The `max(flag)` trick converts 'does any matching row exist?' into an aggregate — 1 if any repeat within 30 days, 0 if none — which is a clean way to express an anti-condition without a separate anti-join. Watch for key skew on heavy customers, since the self-join fans out their rows quadratically within the partition.",
      sparkSql:
        "WITH jan AS (\n" +
        "  SELECT customer_id, order_date AS jan_date\n" +
        "  FROM orders WHERE DATE_FORMAT(order_date, 'MM') = '01'\n" +
        ")\n" +
        "SELECT DISTINCT j.customer_id\n" +
        "FROM jan j\n" +
        "LEFT JOIN orders o\n" +
        "  ON o.customer_id = j.customer_id\n" +
        " AND o.order_date > j.jan_date\n" +
        " AND DATEDIFF(o.order_date, j.jan_date) <= 30\n" +
        "GROUP BY j.customer_id, j.jan_date\n" +
        "HAVING COUNT(o.order_date) = 0;",
      recognizeRecall: [
        "**Spot it:** 'bought in X but not again within N days', 'one-time buyers', 'no repeat purchase / churn within a window'.",
        "**Say it:** isolate the January orders, left-join later orders, and keep those with no follow-up where `datediff(next, jan) <= 30`.",
        "**Trap:** left join + absence check (not inner); require next_date > jan_date; mind the inclusive 30-day boundary."
      ]
    },

    // ------------------------------------------------------------------ Q119
    {
      id: "filter-last-30-days",
      lc: 119,
      title: "Filter a transactions DataFrame to only the last 30 days",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Row-level date range filter", transformation: "Narrow (no shuffle)", functions: "col, current_date, date_sub" },
      description:
        "Given a `transactions` DataFrame (`txn_id`, `txn_date`, `amount`), keep only the rows from the **last 30 days**. Compare `txn_date` against a cutoff of 30 days before today with `date_sub(current_date(), 30)`, or against a fixed cutoff date when reproducibility matters.",
      examples: [
        {
          input: "today = 2026-08-27 ; transactions: (t1, 2026-08-20), (t2, 2026-07-10), (t3, 2026-08-27)",
          output: "t1 and t3 (t2 is 48 days old and dropped)",
          reasoning: "The cutoff is 2026-07-28 (30 days before 2026-08-27). t1 and t3 are on/after the cutoff; t2 (2026-07-10) is before it and is filtered out."
        }
      ],
      approaches: [
        {
          name: "filter txn_date >= date_sub(current_date(), 30)",
          whenToUse: "Trimming an event/transaction table to a recent trailing window.",
          logic:
            "**What it asks.** Keep only transactions whose date falls within the last 30 days.\n\n" +
            "**Key Idea.** Compute the cutoff once as `date_sub(current_date(), 30)` (today minus 30 days) and keep rows where `txn_date >= cutoff`. This is a plain row-level predicate — no grouping, no window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Ensure `txn_date` is a `DateType` (cast with `to_date` if it arrives as a string).\n" +
            "2. Filter: `transactions.filter(col('txn_date') >= date_sub(current_date(), 30))`.\n" +
            "3. For a reproducible run, replace `current_date()` with a fixed `lit('2026-08-27')` cast to date so re-runs are deterministic.\n\n" +
            "**Why it works.** `date_sub(current_date(), 30)` is a single date value evaluated per query; the `>=` comparison is applied independently to each row, so it is a pure narrow filter with no data movement.\n\n" +
            "**Common Gotchas.**\n" +
            "- `current_date()` changes every day, so results are not reproducible — use a fixed cutoff date for tests and backfills.\n" +
            "- Decide the boundary: `>=` includes exactly the 30th-day-ago date; use `>` if you want strictly newer.\n" +
            "- Comparing a **string** `txn_date` to a date silently mis-sorts; cast to date first.\n\n" +
            "**Interview mindset.** Emphasize this is a narrow filter and, crucially, that on a table partitioned by date it triggers **partition pruning** and predicate pushdown, so Spark reads only the recent partitions.",
          rcs:
            "from pyspark.sql.functions import col, current_date, date_sub\n" +
            "\n" +
            "cutoff = date_sub(current_date(), 30)                    # today - 30 days\n" +
            "result = transactions.filter(col('txn_date') >= cutoff)  # keep the last 30 days\n" +
            "result.show()\n" +
            "\n" +
            "# Reproducible variant: pin the cutoff to a fixed date instead of current_date().\n" +
            "# from pyspark.sql.functions import lit, to_date, date_sub\n" +
            "# cutoff = date_sub(to_date(lit('2026-08-27')), 30)\n" +
            "# result = transactions.filter(col('txn_date') >= cutoff)",
          plain:
            "from pyspark.sql.functions import col, current_date, date_sub\n" +
            "\n" +
            "cutoff = date_sub(current_date(), 30)\n" +
            "result = transactions.filter(col('txn_date') >= cutoff)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This is a **narrow** transformation — a per-row predicate with **no shuffle**. Its performance story is all about reading less. Catalyst applies **predicate pushdown**: on columnar sources (Parquet/ORC) the `txn_date >= cutoff` filter is pushed to the scan, and per-row-group min/max statistics let Spark **skip** blocks entirely outside the range (data skipping). Even better, if the table is **partitioned by date** (e.g. `partitionBy('txn_date')` or a derived `dt` column), the filter enables **partition pruning**: Spark lists and reads only the directories for the last ~30 days and never touches the older partitions on disk — often the single biggest I/O win for time-windowed queries. One caveat: `current_date()` is evaluated at query planning time, so partition pruning still works with it, but a fixed literal makes plans and results reproducible.",
      sparkSql:
        "SELECT *\n" +
        "FROM transactions\n" +
        "WHERE txn_date >= DATE_SUB(CURRENT_DATE(), 30);",
      recognizeRecall: [
        "**Spot it:** 'last 30 days', 'recent transactions', 'trailing window', 'trim to a date cutoff'.",
        "**Say it:** `filter(col('txn_date') >= date_sub(current_date(), 30))` — a narrow filter; pin the cutoff for reproducibility.",
        "**Trap:** on a date-partitioned table this triggers partition pruning + predicate pushdown (read only recent partitions); cast string dates first."
      ]
    }

  ]);
})();
