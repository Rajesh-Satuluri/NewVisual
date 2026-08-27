/*
 * PySpark Interview Lab — Window Functions (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Window functions partitionBy a key, which triggers a WIDE (shuffle) transformation:
 * rows are shuffled by the partition key, then sorted within each partition.
 */
(function () {
  var CAT = "Window Functions";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q71
    {
      id: "running-revenue-per-customer",
      lc: 71,
      title: "Cumulative (running) revenue per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Running total (cumulative sum)", transformation: "Wide (shuffle)", functions: "Window, sum, over, rowsBetween" },
      description:
        "Given a `transactions` DataFrame (`customer_id`, `txn_date`, `amount`), add a `running_revenue` column that accumulates each customer's spending **in date order** — a running (cumulative) sum that resets per customer. Every original row is kept; nothing is collapsed.",
      examples: [
        {
          input: "transactions: (c1, 2026-01-01, 100), (c1, 2026-01-05, 40), (c1, 2026-01-09, 60), (c2, 2026-01-02, 500)",
          output: "c1 rows -> 100, 140, 200 ; c2 row -> 500",
          reasoning: "Within customer c1, ordered by date, each row adds its amount to the sum of all earlier-or-equal rows; c2 restarts its own running total."
        }
      ],
      approaches: [
        {
          name: "Window.partitionBy + rowsBetween(unboundedPreceding, currentRow)",
          whenToUse: "Any running/cumulative total that must be reported alongside every original row.",
          logic:
            "**What it asks.** For each transaction, the sum of that customer's amounts from their first transaction up to and including the current one, in date order.\n\n" +
            "**Key Idea.** A window frame `rowsBetween(unboundedPreceding, currentRow)` over a window partitioned by `customer_id` and ordered by `txn_date` makes `sum('amount')` accumulate row-by-row within each customer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the window: `Window.partitionBy('customer_id').orderBy('txn_date')`.\n" +
            "2. Restrict the frame to all rows up to now: `.rowsBetween(Window.unboundedPreceding, Window.currentRow)`.\n" +
            "3. Add the column: `withColumn('running_revenue', _sum('amount').over(w))`.\n" +
            "4. The aggregate now returns a per-row cumulative value, not one collapsed total.\n\n" +
            "**Why it works.** A window function computes an aggregate over a *frame* of rows relative to the current row instead of collapsing the group. `unboundedPreceding..currentRow` is exactly the 'everything so far' frame that defines a running total.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without an explicit `orderBy` on the window, the default frame for an aggregate is the whole partition — you'd get the grand total on every row, not a running one.\n" +
            "- `rowsBetween` (physical row offsets) is what you want here; `rangeBetween` would instead frame by matching `txn_date` values and lump ties together.\n" +
            "- Ties on `txn_date` fall in the same frame position; add a tie-breaker column to the `orderBy` for a deterministic order.\n\n" +
            "**Interview mindset.** Say 'running total = aggregate over a window with an ORDER BY and an unboundedPreceding..currentRow frame' — and contrast it with a `groupBy` that would collapse the rows.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                      # one running total per customer\n" +
            "     .orderBy('txn_date')                             # accumulate in date order\n" +
            "     .rowsBetween(Window.unboundedPreceding,          # from the first row...\n" +
            "                  Window.currentRow))                 # ...up to the current one\n" +
            "\n" +
            "result = transactions.withColumn(\n" +
            "    'running_revenue',\n" +
            "    _sum('amount').over(w))                           # cumulative sum, per row\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('txn_date')\n" +
            "     .rowsBetween(Window.unboundedPreceding,\n" +
            "                  Window.currentRow))\n" +
            "\n" +
            "result = transactions.withColumn(\n" +
            "    'running_revenue',\n" +
            "    _sum('amount').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A window with `partitionBy('customer_id')` is **wide**: Spark hash-shuffles rows so each customer's rows land on one partition, then **sorts** them by `txn_date` within that partition. The running sum is then a single sequential scan per partition. `rowsBetween(unboundedPreceding, currentRow)` defines the frame by physical row position; because an ORDER BY is present, the aggregate becomes cumulative rather than a whole-partition total. Cost is dominated by the shuffle + sort; a heavily skewed customer (one giant partition) becomes the straggler, so watch for key skew.",
      sparkSql:
        "SELECT customer_id, txn_date, amount,\n" +
        "       SUM(amount) OVER (\n" +
        "         PARTITION BY customer_id ORDER BY txn_date\n" +
        "         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
        "       ) AS running_revenue\n" +
        "FROM transactions;",
      recognizeRecall: [
        "**Spot it:** 'running total', 'cumulative', 'so far', 'to-date' while keeping every row.",
        "**Say it:** `sum(...).over(Window.partitionBy(key).orderBy(date).rowsBetween(unboundedPreceding, currentRow))`.",
        "**Trap:** forgetting the ORDER BY gives the grand total on every row; use rowsBetween, not rangeBetween, for row-by-row accumulation."
      ]
    },

    // ------------------------------------------------------------------ Q73
    {
      id: "running-order-count-per-customer",
      lc: 73,
      title: "Running order count per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Running count (cumulative)", transformation: "Wide (shuffle)", functions: "Window, count, over, rowsBetween" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `order_id`), add a `running_orders` column that tells, for each order, how many orders that customer has placed up to and including this one (in date order). It is the count analogue of the running sum.",
      examples: [
        {
          input: "orders: (c1, 2026-03-01), (c1, 2026-03-04), (c1, 2026-03-08), (c2, 2026-03-02)",
          output: "c1 rows -> 1, 2, 3 ; c2 row -> 1",
          reasoning: "Ordered by date within each customer, each row counts itself plus all earlier orders; c2 starts its own count."
        }
      ],
      approaches: [
        {
          name: "count over an ordered running frame",
          whenToUse: "A per-row 'how many so far' sequence number driven by count rather than sum.",
          logic:
            "**What it asks.** For every order, the cumulative number of that customer's orders from their first up to the current one.\n\n" +
            "**Key Idea.** `count('*')` over `Window.partitionBy('customer_id').orderBy('order_date')` with a `rowsBetween(unboundedPreceding, currentRow)` frame counts the rows in the running frame.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. Add the running frame `.rowsBetween(Window.unboundedPreceding, Window.currentRow)`.\n" +
            "3. `withColumn('running_orders', count('*').over(w))`.\n\n" +
            "**Why it works.** With an ORDER BY and an unboundedPreceding..currentRow frame, the count only sees rows up to the current one, so it increments 1, 2, 3, ... per customer.\n\n" +
            "**Common Gotchas.**\n" +
            "- `row_number().over(w)` gives the same 1..N sequence and is often clearer — but `row_number` never ties, whereas `count('*')` over a `rangeBetween` frame would count all rows sharing the same date.\n" +
            "- As always, an ORDER BY is required or the count collapses to the partition size on every row.\n\n" +
            "**Interview mindset.** Note the two idioms — `count('*')` over a running frame vs `row_number()` — and when ties make them differ.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import count\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                      # per-customer sequence\n" +
            "     .orderBy('order_date')                           # in chronological order\n" +
            "     .rowsBetween(Window.unboundedPreceding,          # all prior rows...\n" +
            "                  Window.currentRow))                 # ...through the current\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'running_orders',\n" +
            "    count('*').over(w))                              # cumulative row count\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import count\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date')\n" +
            "     .rowsBetween(Window.unboundedPreceding,\n" +
            "                  Window.currentRow))\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'running_orders',\n" +
            "    count('*').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Same **wide** profile as the running sum: hash-shuffle by `customer_id`, sort by `order_date` within each partition, then a sequential scan applies the cumulative count. `count('*')` over a running frame and `row_number()` compile to nearly identical physical plans; the difference is only in tie handling (row_number is strictly monotonic; a count over a value-based `rangeBetween` frame is not). Skewed customers dominate the runtime because one reducer holds the whole partition.",
      sparkSql:
        "SELECT customer_id, order_date, order_id,\n" +
        "       COUNT(*) OVER (\n" +
        "         PARTITION BY customer_id ORDER BY order_date\n" +
        "         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
        "       ) AS running_orders\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'nth order', 'orders so far', 'running count', a per-customer sequence number.",
        "**Say it:** `count('*').over(partitionBy(key).orderBy(date).rowsBetween(unboundedPreceding, currentRow))`, or `row_number()` for a strict 1..N.",
        "**Trap:** rowsBetween counts by position; a rangeBetween frame would count all same-date ties together."
      ]
    },

    // ------------------------------------------------------------------ Q74
    {
      id: "previous-order-amount-lag",
      lc: 74,
      title: "Previous order amount per customer (lag)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Access prior row (lag)", transformation: "Wide (shuffle)", functions: "Window, lag, over" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `order_amount`), add a `prev_amount` column holding the **previous** order's amount for the same customer, in date order. The first order of each customer has no predecessor, so its `prev_amount` is null.",
      examples: [
        {
          input: "orders: (c1, 2026-02-01, 100), (c1, 2026-02-10, 250), (c1, 2026-02-15, 80)",
          output: "prev_amount -> null, 100, 250",
          reasoning: "Each row looks back one position within customer c1; the earliest row has nothing before it."
        }
      ],
      approaches: [
        {
          name: "lag over an ordered window",
          whenToUse: "Comparing each row to the immediately preceding row within a group (period-over-period).",
          logic:
            "**What it asks.** For each order, the amount of that customer's immediately prior order.\n\n" +
            "**Key Idea.** `lag('order_amount')` over `Window.partitionBy('customer_id').orderBy('order_date')` returns the value from the row one position back within the partition.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')` — no frame needed for lag/lead.\n" +
            "2. `withColumn('prev_amount', lag('order_amount').over(w))`.\n" +
            "3. Optionally pass an offset (`lag('order_amount', 2)`) or a default (`lag('order_amount', 1, 0)`).\n\n" +
            "**Why it works.** `lag` is a navigation function: it reads a value from a fixed row offset relative to the current row after the partition is ordered, without collapsing anything.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first row per customer returns null (no prior row) unless you pass a default value.\n" +
            "- `lag`/`lead` do **not** take a `rowsBetween` frame — the offset argument is the whole story; adding a frame is a mistake.\n" +
            "- The `orderBy` is mandatory and defines 'previous'.\n\n" +
            "**Interview mindset.** Call `lag` the go-to for period-over-period comparisons and stress that the first row is null by design.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                      # look back within a customer\n" +
            "     .orderBy('order_date'))                          # 'previous' = earlier date\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'prev_amount',\n" +
            "    lag('order_amount').over(w))                     # value one row back (null on first)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'prev_amount',\n" +
            "    lag('order_amount').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: rows shuffle by `customer_id` and sort by `order_date` within each partition, then `lag` reads the value at offset -1 during a single sequential pass — no extra shuffle beyond the partition-and-sort. `lag`/`lead` are frameless navigation functions; unlike aggregate windows they ignore `rowsBetween`/`rangeBetween`. Boundary rows (partition start for `lag`) yield the default (null unless supplied). Skew on the partition key is again the main performance risk.",
      sparkSql:
        "SELECT customer_id, order_date, order_amount,\n" +
        "       LAG(order_amount) OVER (\n" +
        "         PARTITION BY customer_id ORDER BY order_date\n" +
        "       ) AS prev_amount\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'previous', 'prior', 'last order', 'compared to the one before' within a group.",
        "**Say it:** `lag('order_amount').over(partitionBy(key).orderBy(date))`; pass a default to avoid the leading null.",
        "**Trap:** lag/lead take an offset, not a frame; the first row is null by design."
      ]
    },

    // ------------------------------------------------------------------ Q75
    {
      id: "next-order-amount-lead",
      lc: 75,
      title: "Next order amount per customer (lead)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Access following row (lead)", transformation: "Wide (shuffle)", functions: "Window, lead, over" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `order_amount`), add a `next_amount` column holding the **next** order's amount for the same customer, in date order. The last order of each customer has no successor, so its `next_amount` is null.",
      examples: [
        {
          input: "orders: (c1, 2026-02-01, 100), (c1, 2026-02-10, 250), (c1, 2026-02-15, 80)",
          output: "next_amount -> 250, 80, null",
          reasoning: "Each row looks forward one position within customer c1; the latest row has nothing after it."
        }
      ],
      approaches: [
        {
          name: "lead over an ordered window",
          whenToUse: "Looking ahead to the following row within a group (e.g. time to / value of the next event).",
          logic:
            "**What it asks.** For each order, the amount of that customer's immediately following order.\n\n" +
            "**Key Idea.** `lead('order_amount')` over `Window.partitionBy('customer_id').orderBy('order_date')` returns the value from the row one position forward within the partition — the mirror image of `lag`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. `withColumn('next_amount', lead('order_amount').over(w))`.\n" +
            "3. Optionally supply an offset and/or default: `lead('order_amount', 1, 0)`.\n\n" +
            "**Why it works.** `lead` reads a value at a positive row offset after the partition is ordered, keeping every row intact.\n\n" +
            "**Common Gotchas.**\n" +
            "- The last row per customer returns null (no following row) unless a default is given.\n" +
            "- Like `lag`, `lead` uses an offset, not a `rowsBetween` frame.\n" +
            "- The same window drives both `lag` and `lead`; reuse it rather than redefining it.\n\n" +
            "**Interview mindset.** Present `lead` as the forward-looking twin of `lag` and mention reusing one window object for both.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lead\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                      # look ahead within a customer\n" +
            "     .orderBy('order_date'))                          # 'next' = later date\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'next_amount',\n" +
            "    lead('order_amount').over(w))                    # value one row ahead (null on last)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lead\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "result = orders.withColumn(\n" +
            "    'next_amount',\n" +
            "    lead('order_amount').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Identical execution to `lag` (Q74): **wide** shuffle by `customer_id`, sort by `order_date`, then a single pass reads offset +1. `lead` is a frameless navigation function, so `rowsBetween`/`rangeBetween` are ignored. The partition-end boundary (last row) produces the default. Because both `lag` and `lead` share the same window spec, Spark can compute them in one window operator over a single shuffle when you add both columns from the same `w`.",
      sparkSql:
        "SELECT customer_id, order_date, order_amount,\n" +
        "       LEAD(order_amount) OVER (\n" +
        "         PARTITION BY customer_id ORDER BY order_date\n" +
        "       ) AS next_amount\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'next', 'following', 'subsequent', 'the order after this' within a group.",
        "**Say it:** `lead('order_amount').over(partitionBy(key).orderBy(date))`; last row is null.",
        "**Trap:** lead uses an offset, not a frame; reuse one window for both lag and lead."
      ]
    },

    // ------------------------------------------------------------------ Q76
    {
      id: "diff-vs-previous-order",
      lc: 76,
      title: "Difference between current and previous order amount",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Lag + arithmetic (delta)", transformation: "Wide (shuffle)", functions: "Window, lag, over, col" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `order_amount`), add an `amount_diff` column equal to the current order amount minus the previous order amount for the same customer, in date order. The first order per customer has no previous amount, so its difference is null.",
      examples: [
        {
          input: "orders: (c1, 2026-04-01, 100), (c1, 2026-04-05, 250), (c1, 2026-04-11, 200)",
          output: "amount_diff -> null, 150, -50",
          reasoning: "150 = 250 - 100 and -50 = 200 - 250; the first row has no predecessor so the difference is null."
        }
      ],
      approaches: [
        {
          name: "current minus lag",
          whenToUse: "Measuring the raw change from one row to the previous within a group.",
          logic:
            "**What it asks.** The signed change in order amount versus each customer's prior order.\n\n" +
            "**Key Idea.** Compute `lag('order_amount')` over the ordered window, then subtract it from the current `order_amount`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. Capture the prior value: `prev = lag('order_amount').over(w)`.\n" +
            "3. Subtract: `withColumn('amount_diff', col('order_amount') - prev)`.\n\n" +
            "**Why it works.** `lag` supplies the previous amount aligned to the current row; ordinary column arithmetic then produces the delta without collapsing rows.\n\n" +
            "**Common Gotchas.**\n" +
            "- Any arithmetic with a null (the first row's `lag`) yields null — that's the correct 'no baseline' behavior; only pass a default if a concrete baseline (e.g. 0) is truly intended.\n" +
            "- Do the subtraction as current minus previous, not the reverse, so growth is positive.\n\n" +
            "**Interview mindset.** Frame it as 'lag to fetch the baseline, then subtract'; note nulls propagate on the first row.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag, col\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev = lag('order_amount').over(w)                   # previous order's amount\n" +
            "result = orders.withColumn(\n" +
            "    'amount_diff',\n" +
            "    col('order_amount') - prev)                     # current - previous (null on first)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag, col\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev = lag('order_amount').over(w)\n" +
            "result = orders.withColumn(\n" +
            "    'amount_diff',\n" +
            "    col('order_amount') - prev)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `lag` drives the **wide** step (shuffle by `customer_id`, sort by `order_date`); the subtraction is a **narrow**, codegen-friendly expression evaluated in the same pass, so it adds no extra shuffle. Null arithmetic on the leading row is standard three-valued logic: `current - null = null`. Keep the delta as built-in column arithmetic (no UDF) so Catalyst can fuse it with the window operator.",
      sparkSql:
        "SELECT customer_id, order_date, order_amount,\n" +
        "       order_amount - LAG(order_amount) OVER (\n" +
        "         PARTITION BY customer_id ORDER BY order_date\n" +
        "       ) AS amount_diff\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'change from last time', 'delta', 'increase/decrease vs previous order'.",
        "**Say it:** `col('order_amount') - lag('order_amount').over(w)` where w is partitionBy(key).orderBy(date).",
        "**Trap:** first row is null (nulls propagate through arithmetic); subtract current minus previous for correct sign."
      ]
    },

    // ------------------------------------------------------------------ Q77
    {
      id: "pct-change-vs-previous-order",
      lc: 77,
      title: "Percentage change between current and previous order",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Lag + percentage change", transformation: "Wide (shuffle)", functions: "Window, lag, over, round" },
      description:
        "Given an `orders` DataFrame (`customer_id`, `order_date`, `order_amount`), add a `pct_change` column giving the percentage change from each customer's previous order to the current one, in date order: `(current - previous) / previous * 100`. The first order per customer has no previous value, so its percentage change is null.",
      examples: [
        {
          input: "orders: (c1, 2026-05-01, 200), (c1, 2026-05-07, 250), (c1, 2026-05-12, 200)",
          output: "pct_change -> null, 25.0, -20.0",
          reasoning: "(250-200)/200*100 = 25.0 and (200-250)/250*100 = -20.0; the first row has no baseline so it is null."
        }
      ],
      approaches: [
        {
          name: "lag then relative-change formula",
          whenToUse: "Growth/decline expressed as a percentage relative to the prior period.",
          logic:
            "**What it asks.** The period-over-period percentage change in order amount within each customer.\n\n" +
            "**Key Idea.** Fetch the previous amount with `lag`, then apply the relative-change formula `(current - prev) / prev * 100`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy('order_date')`.\n" +
            "2. `prev = lag('order_amount').over(w)`.\n" +
            "3. `withColumn('pct_change', _round((col('order_amount') - prev) / prev * 100, 2))`.\n\n" +
            "**Why it works.** `lag` aligns the baseline to the current row; dividing the delta by the baseline and scaling by 100 yields the percentage, all as column expressions.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first row's `prev` is null, so the whole expression is null — that is the desired 'no baseline' result and needs no special handling.\n" +
            "- Guard against a **zero** previous amount: dividing by 0 gives null/infinity, so wrap with a `when(prev != 0, ...)` if zero baselines can occur.\n" +
            "- Round only for display; compare/store on the unrounded value if precision matters.\n\n" +
            "**Interview mindset.** Recite the formula, call out the null-on-first-row behavior, and proactively mention the divide-by-zero guard.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag, col, round as _round\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev = lag('order_amount').over(w)                   # previous order's amount\n" +
            "result = orders.withColumn(\n" +
            "    'pct_change',\n" +
            "    _round((col('order_amount') - prev) / prev * 100, 2))  # % change (null on first / null prev)\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import lag, col, round as _round\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('order_date'))\n" +
            "\n" +
            "prev = lag('order_amount').over(w)\n" +
            "result = orders.withColumn(\n" +
            "    'pct_change',\n" +
            "    _round((col('order_amount') - prev) / prev * 100, 2))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `lag` is the only **wide** part (shuffle by `customer_id`, sort by `order_date`); the arithmetic and `round` are **narrow** expressions fused into the same stage. Null baselines (first row) propagate to a null result automatically. A zero baseline is the real hazard: `x / 0` produces null (or infinity for floats) rather than an error, so a `when(prev != 0, ...)` guard makes intent explicit. Keep it all in built-in expressions so codegen applies.",
      sparkSql:
        "SELECT customer_id, order_date, order_amount,\n" +
        "       ROUND(\n" +
        "         (order_amount - LAG(order_amount) OVER (PARTITION BY customer_id ORDER BY order_date))\n" +
        "         / LAG(order_amount) OVER (PARTITION BY customer_id ORDER BY order_date) * 100, 2\n" +
        "       ) AS pct_change\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** 'percentage change', 'percent growth', 'MoM/WoW % vs previous'.",
        "**Say it:** `(current - lag)/lag*100` over partitionBy(key).orderBy(date); round for display.",
        "**Trap:** first row and a zero previous both need thought — null baseline is fine, zero baseline needs a when() guard."
      ]
    },

    // ------------------------------------------------------------------ Q89
    {
      id: "seven-day-rolling-avg-sales",
      lc: 89,
      title: "7-day rolling average of sales per store",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Time-based rolling average (rangeBetween)", transformation: "Wide (shuffle)", functions: "Window, avg, rangeBetween, datediff" },
      description:
        "Given a `sales` DataFrame (`store_id`, `sale_date`, `sales_amount`), add a `rolling_7d_avg` column: the average of `sales_amount` over a trailing **7-day calendar window** (the current day and the 6 days before it) for each store. Because the window is measured in *days* rather than a fixed number of rows, it must frame on the date value itself.",
      examples: [
        {
          input: "store s1: (2026-06-01, 100), (2026-06-02, 200), (2026-06-08, 800)",
          output: "rolling_7d_avg -> 100.0, 150.0, 500.0",
          reasoning: "On 06-02 the window covers 06-01..06-02 -> avg(100,200)=150. On 06-08 the window is 06-02..06-08, so 06-01 has dropped out -> avg(200,800)=500."
        }
      ],
      approaches: [
        {
          name: "rangeBetween on a day-number ordering column",
          whenToUse: "Rolling windows defined by a span of TIME (last 7/30/90 days) rather than a fixed row count.",
          logic:
            "**What it asks.** A trailing 7-calendar-day mean per store that correctly skips missing days and collapses same-day rows into the same window.\n\n" +
            "**Key Idea.** `rangeBetween` frames rows by the *value* of the ORDER BY column, so if you order by an integer day-number and use `rangeBetween(-6, 0)`, the frame is 'all rows whose day-number is within 6 of the current one' — exactly a 7-day span. Convert the date to a day-number with `datediff(sale_date, lit('1970-01-01'))` (days since epoch).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Add an integer ordering key: `withColumn('day_num', datediff(col('sale_date'), lit('1970-01-01')))`.\n" +
            "2. Build `w = Window.partitionBy('store_id').orderBy('day_num').rangeBetween(-6, 0)` — 6 days back through today, inclusive (7 days).\n" +
            "3. `withColumn('rolling_7d_avg', _round(avg('sales_amount').over(w), 2))`.\n\n" +
            "**Why it works.** `rangeBetween(-6, 0)` on a day-number means 'current value minus 6 up to current value', so days with no sales simply contribute no rows and multiple sales on one day all share the frame — a true calendar window, not a row-count one.\n\n" +
            "**Common Gotchas.**\n" +
            "- You must order by a **numeric** column for `rangeBetween` (a raw date is not directly usable for a numeric range) — hence the `datediff`-to-day-number trick.\n" +
            "- `rangeBetween(-6, 0)` is 7 days *inclusive*; `-7` would be an 8-day span. Off-by-one here is a classic mistake.\n" +
            "- `rowsBetween(-6, 0)` would instead average the last 7 *rows*, which is wrong when a store has multiple sales per day or gaps between days.\n\n" +
            "**Interview mindset.** The headline is 'rows vs range': a *time* window needs `rangeBetween` over a numeric day column, not `rowsBetween`. Say that clearly and get the -6 (inclusive) count right.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, avg, round as _round\n" +
            "\n" +
            "# rangeBetween needs a NUMERIC order key -> days since the epoch.\n" +
            "sales_d = sales.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('sale_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('store_id')                         # per store\n" +
            "     .orderBy('day_num')                              # ordered by day number\n" +
            "     .rangeBetween(-6, 0))                            # today + previous 6 days = 7-day span\n" +
            "\n" +
            "result = sales_d.withColumn(\n" +
            "    'rolling_7d_avg',\n" +
            "    _round(avg('sales_amount').over(w), 2))          # trailing 7-day mean\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, avg, round as _round\n" +
            "\n" +
            "sales_d = sales.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('sale_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('store_id')\n" +
            "     .orderBy('day_num')\n" +
            "     .rangeBetween(-6, 0))\n" +
            "\n" +
            "result = sales_d.withColumn(\n" +
            "    'rolling_7d_avg',\n" +
            "    _round(avg('sales_amount').over(w), 2))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: shuffle by `store_id`, sort by `day_num` within each partition. The crucial distinction is the frame type. `rowsBetween(a, b)` counts **physical rows** relative to the current one; `rangeBetween(a, b)` selects rows whose **ORDER BY value** falls within `[current+a, current+b]`. A calendar window must use `rangeBetween` over a numeric day-number (from `datediff`) so that gaps and same-day duplicates are handled correctly — a row-count frame would silently give the wrong window whenever daily counts vary. `rangeBetween(-6, 0)` is inclusive of both ends, i.e. a 7-day span. Cost is the per-store shuffle+sort; a dominant store is the skew risk.",
      sparkSql:
        "SELECT store_id, sale_date, sales_amount,\n" +
        "       ROUND(AVG(sales_amount) OVER (\n" +
        "         PARTITION BY store_id\n" +
        "         ORDER BY datediff(sale_date, DATE'1970-01-01')\n" +
        "         RANGE BETWEEN 6 PRECEDING AND CURRENT ROW\n" +
        "       ), 2) AS rolling_7d_avg\n" +
        "FROM sales;",
      recognizeRecall: [
        "**Spot it:** 'last 7 days', 'rolling/trailing N-day average', a window measured in TIME not rows.",
        "**Say it:** order by a numeric day-number (`datediff(date, '1970-01-01')`) and use `rangeBetween(-6, 0)` for a 7-day inclusive span.",
        "**Trap:** rowsBetween counts rows (wrong with gaps/duplicates); rangeBetween counts by value; -6 inclusive = 7 days, not 8."
      ]
    },

    // ------------------------------------------------------------------ Q90
    {
      id: "thirty-day-rolling-revenue",
      lc: 90,
      title: "30-day rolling revenue per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Time-based rolling sum (rangeBetween)", transformation: "Wide (shuffle)", functions: "Window, sum, rangeBetween, datediff" },
      description:
        "Given a `transactions` DataFrame (`customer_id`, `txn_date`, `amount`), add a `rolling_30d_revenue` column: the total `amount` over a trailing **30-day calendar window** (the current day and the 29 days before it) for each customer. Like the 7-day average, the window is a span of days, so it must frame on the date value, not a row count.",
      examples: [
        {
          input: "customer c1: (2026-01-01, 100), (2026-01-20, 50), (2026-02-15, 200)",
          output: "rolling_30d_revenue -> 100, 150, 200",
          reasoning: "On 01-20 the 30-day window (12-22..01-20) includes 01-01 and 01-20 -> 150. By 02-15 the window (01-17..02-15) has dropped 01-01 and 01-20, leaving only 200."
        }
      ],
      approaches: [
        {
          name: "rangeBetween(-29, 0) on a day-number ordering column",
          whenToUse: "A trailing sum over a fixed number of calendar days (30/60/90-day revenue, spend, activity).",
          logic:
            "**What it asks.** A trailing 30-calendar-day revenue total per customer that correctly handles gaps and multiple transactions per day.\n\n" +
            "**Key Idea.** Same rows-vs-range principle as the 7-day average: order by an integer day-number and use `rangeBetween(-29, 0)` so the frame spans 30 inclusive days, then apply `sum`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Add the numeric key: `withColumn('day_num', datediff(col('txn_date'), lit('1970-01-01')))`.\n" +
            "2. Build `w = Window.partitionBy('customer_id').orderBy('day_num').rangeBetween(-29, 0)` — 29 days back through today, inclusive (30 days).\n" +
            "3. `withColumn('rolling_30d_revenue', _sum('amount').over(w))`.\n\n" +
            "**Why it works.** `rangeBetween(-29, 0)` frames on the day-number value, so exactly the transactions within the last 30 calendar days are summed regardless of how many rows fall in that span.\n\n" +
            "**Common Gotchas.**\n" +
            "- `rangeBetween(-29, 0)` is 30 days inclusive; using `-30` would span 31 days. Count the endpoints carefully.\n" +
            "- Must order by a numeric column for `rangeBetween`; frame on `datediff` day-numbers, not the raw date.\n" +
            "- `rowsBetween(-29, 0)` would sum the last 30 *rows*, wrong whenever transaction frequency varies.\n\n" +
            "**Interview mindset.** Reuse the rows-vs-range talking point and emphasize `rangeBetween` over a day-number for any 'last N days' rollup; get the inclusive offset right.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, sum as _sum\n" +
            "\n" +
            "# rangeBetween needs a NUMERIC order key -> days since the epoch.\n" +
            "txn_d = transactions.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('txn_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                      # per customer\n" +
            "     .orderBy('day_num')                              # ordered by day number\n" +
            "     .rangeBetween(-29, 0))                           # today + previous 29 days = 30-day span\n" +
            "\n" +
            "result = txn_d.withColumn(\n" +
            "    'rolling_30d_revenue',\n" +
            "    _sum('amount').over(w))                          # trailing 30-day total\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, datediff, lit, sum as _sum\n" +
            "\n" +
            "txn_d = transactions.withColumn(\n" +
            "    'day_num',\n" +
            "    datediff(col('txn_date'), lit('1970-01-01')))\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy('day_num')\n" +
            "     .rangeBetween(-29, 0))\n" +
            "\n" +
            "result = txn_d.withColumn(\n" +
            "    'rolling_30d_revenue',\n" +
            "    _sum('amount').over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: shuffle by `customer_id`, sort by `day_num` within each partition, then a running window sum over the value-based frame. As with the 7-day average, `rangeBetween` (value offsets on the ORDER BY column) is mandatory for a calendar window — `rowsBetween` (physical row offsets) would produce a last-N-rows sum, not a last-N-days sum, and would be wrong whenever transaction density varies or days are missing. `rangeBetween(-29, 0)` is inclusive of both ends (30 days). The per-customer shuffle+sort dominates cost; a whale customer with many transactions is the skew hotspot.",
      sparkSql:
        "SELECT customer_id, txn_date, amount,\n" +
        "       SUM(amount) OVER (\n" +
        "         PARTITION BY customer_id\n" +
        "         ORDER BY datediff(txn_date, DATE'1970-01-01')\n" +
        "         RANGE BETWEEN 29 PRECEDING AND CURRENT ROW\n" +
        "       ) AS rolling_30d_revenue\n" +
        "FROM transactions;",
      recognizeRecall: [
        "**Spot it:** 'last 30 days', 'trailing 30-day revenue/spend', a running total over a TIME span.",
        "**Say it:** order by `datediff(date, '1970-01-01')` and use `rangeBetween(-29, 0)` for a 30-day inclusive window, then sum.",
        "**Trap:** rangeBetween (by value) not rowsBetween (by row); -29 inclusive = 30 days, and you must order by a numeric day-number."
      ]
    }

  ]);
})();
