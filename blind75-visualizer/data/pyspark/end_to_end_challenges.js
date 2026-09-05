/*
 * PySpark Interview Lab — End-to-End Challenges (Medium/Hard)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * These are the capstones: they COMPOSE the earlier techniques — groupBy
 * aggregates, window functions (row_number / dense_rank / lag / rolling
 * rangeBetween), joins, and date functions — into one coherent pipeline.
 * Recurring cost themes: reduce (filter/aggregate) before you join, cache a
 * DataFrame reused by multiple actions, and read the plan to count exchanges.
 */
(function () {
  var CAT = "End-to-End Challenges";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q152
    {
      id: "cache-reused-dataframe-multiple-actions",
      lc: 152,
      title: "Cache a transformed DataFrame reused by multiple actions",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Cache / persist a reused DataFrame", transformation: "Narrow (cache) + reused wide lineage", functions: "cache, persist, StorageLevel, unpersist" },
      description:
        "You build an expensive `enriched` DataFrame (filter + join + aggregate) and then run **several actions** on it — a `count()`, a `show()`, and a `write`. Without caching, Spark re-executes the whole lineage from scratch for **each** action. Use `cache()` (or `persist(StorageLevel...)`) to materialize the result once, reuse it across actions, and `unpersist()` when done to free the memory.",
      examples: [
        {
          input: "enriched = orders.filter(...).join(customers, 'customer_id').groupBy('customer_id').agg(...); then enriched.count(); enriched.show(); enriched.write.parquet(path)",
          output: "With enriched.cache() before the first action, the filter+join+aggregate runs ONCE; count/show/write reuse the cached partitions.",
          reasoning: "Each action triggers a fresh job. A DataFrame is a lazy plan, not stored data, so without cache the shuffle-heavy lineage recomputes three times; cache pins the materialized result in memory (and disk) for reuse."
        }
      ],
      approaches: [
        {
          name: "cache() before the first action, unpersist() after the last",
          whenToUse: "Any DataFrame with an expensive lineage that is consumed by two or more actions (count, show, write, multiple downstream branches).",
          logic:
            "**What it asks.** Avoid recomputing an expensive DataFrame that several actions read.\n\n" +
            "**Key Idea.** A DataFrame is a **lazy plan**; every action re-runs that plan. Mark the reused DataFrame with `cache()` (shorthand for `persist(StorageLevel.MEMORY_AND_DISK)`) so its partitions are materialized on the **first** action and every later action reads the stored blocks instead of recomputing the filter/join/aggregate. Call `unpersist()` to release it once you are finished.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the expensive DataFrame: `enriched = orders.filter(...).join(customers, 'customer_id').groupBy('customer_id').agg(...)`.\n" +
            "2. Mark it for caching: `enriched.cache()` (lazy — nothing is stored yet).\n" +
            "3. Trigger materialization with the first action: `enriched.count()` now runs the lineage once and fills the cache.\n" +
            "4. Reuse across further actions: `enriched.show()` and `enriched.write.parquet(path)` read cached partitions.\n" +
            "5. Free the memory when done: `enriched.unpersist()`.\n\n" +
            "**Why it works.** `cache`/`persist` register the DataFrame with the block manager; the first action stores each partition (in memory, spilling to disk with the default `MEMORY_AND_DISK` level), so the shuffle-heavy plan executes exactly once and subsequent actions skip straight to the stored blocks.\n\n" +
            "**Common Gotchas.**\n" +
            "- `cache()` is **lazy**: it does nothing until an action materializes it — a common surprise is expecting data to be cached immediately.\n" +
            "- Only cache what is genuinely reused; caching a DataFrame used once wastes memory and can evict more useful blocks.\n" +
            "- Choose the `StorageLevel` deliberately: `MEMORY_ONLY` (fast, may recompute on eviction), `MEMORY_AND_DISK` (cache default, spills instead of recomputing), `MEMORY_AND_DISK_SER` (serialized, smaller footprint, more CPU).\n" +
            "- Always `unpersist()` when finished so cached blocks do not linger and starve later stages.\n\n" +
            "**Interview mindset.** Say 'a DataFrame is a lazy plan, so N actions = N recomputes; cache materializes it once'. Name `MEMORY_AND_DISK` as the safe default and remember to `unpersist`.",
          rcs:
            "from pyspark.sql.functions import col, sum as _sum, count as _count\n" +
            "from pyspark.storagelevel import StorageLevel\n" +
            "\n" +
            "# Expensive lineage: filter + join + aggregate (a full shuffle).\n" +
            "enriched = (orders\n" +
            "    .filter(col('status') == 'completed')          # narrow filter\n" +
            "    .join(customers, 'customer_id')                # WIDE: shuffle join\n" +
            "    .groupBy('customer_id')                        # WIDE: shuffle aggregate\n" +
            "    .agg(_sum('amount').alias('total_revenue'),\n" +
            "         _count('*').alias('order_count')))\n" +
            "\n" +
            "# Mark for caching (lazy) — MEMORY_AND_DISK is what cache() uses.\n" +
            "enriched.persist(StorageLevel.MEMORY_AND_DISK)     # same as enriched.cache()\n" +
            "\n" +
            "n = enriched.count()                               # 1st action: runs lineage, fills cache\n" +
            "enriched.show()                                    # 2nd action: reads cached blocks\n" +
            "enriched.write.mode('overwrite').parquet('/data/enriched')  # 3rd action: cached again\n" +
            "\n" +
            "enriched.unpersist()                               # release the cached partitions",
          plain:
            "from pyspark.sql.functions import col, sum as _sum, count as _count\n" +
            "from pyspark.storagelevel import StorageLevel\n" +
            "\n" +
            "enriched = (orders\n" +
            "    .filter(col('status') == 'completed')\n" +
            "    .join(customers, 'customer_id')\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('amount').alias('total_revenue'),\n" +
            "         _count('*').alias('order_count')))\n" +
            "\n" +
            "enriched.persist(StorageLevel.MEMORY_AND_DISK)\n" +
            "\n" +
            "n = enriched.count()\n" +
            "enriched.show()\n" +
            "enriched.write.mode('overwrite').parquet('/data/enriched')\n" +
            "\n" +
            "enriched.unpersist()"
        }
      ],
      sparkInternals:
        "The lineage has two **wide** stages — the `join` and the `groupBy`, each an `Exchange` (shuffle). Because a DataFrame is a lazy plan, each of the three actions (`count`, `show`, `write`) would independently re-trigger those two shuffles: three full recomputations. `cache()`/`persist()` register the DataFrame with the **block manager**; the first action materializes each partition and stores it (memory, spilling to disk at the default `MEMORY_AND_DISK` level). Subsequent actions short-circuit their scan to the stored blocks — the `InMemoryTableScan`/`InMemoryRelation` node replaces the upstream exchanges in the plan. `MEMORY_ONLY` risks recomputation if a block is evicted; `MEMORY_AND_DISK` spills instead; the `_SER` variants trade CPU for a smaller footprint. `unpersist()` evicts the blocks so they do not compete with later stages. Rule: cache pays off exactly when an expensive (shuffle-bearing) plan is read more than once.",
      sparkSql:
        "-- Cache the reused result once, then read it across statements.\n" +
        "CACHE TABLE enriched AS\n" +
        "SELECT o.customer_id,\n" +
        "       SUM(o.amount) AS total_revenue,\n" +
        "       COUNT(*)      AS order_count\n" +
        "FROM orders o\n" +
        "JOIN customers c ON o.customer_id = c.customer_id\n" +
        "WHERE o.status = 'completed'\n" +
        "GROUP BY o.customer_id;\n" +
        "SELECT COUNT(*) FROM enriched;\n" +
        "SELECT * FROM enriched;\n" +
        "UNCACHE TABLE enriched;",
      recognizeRecall: [
        "**Spot it:** 'reused by multiple actions', 'recomputes every time', 'count then show then write the same DataFrame'.",
        "**Say it:** `df.cache()` (or `persist(StorageLevel.MEMORY_AND_DISK)`) before the first action, `unpersist()` after the last.",
        "**Trap:** cache is lazy (materializes on the first action); only cache what is truly reused; pick the StorageLevel deliberately."
      ]
    },

    // ------------------------------------------------------------------ Q153
    {
      id: "explain-slow-groupby-physical-plan",
      lc: 153,
      title: "Inspect the physical plan of a slow groupBy",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Read the physical plan of an aggregate", transformation: "Wide (shuffle) — diagnostic", functions: "explain, groupBy, agg" },
      description:
        "A `groupBy('customer_id').agg(...)` is slow and you want to understand why. Use `explain(True)` (all plan stages) or `explain(mode=\"formatted\")` (a clean, numbered physical plan) to read the execution plan. Learn to spot the two-phase aggregate (`HashAggregate` partial then final) split by an `Exchange hashpartitioning` — that `Exchange` is the shuffle that dominates the cost.",
      examples: [
        {
          input: "agg = orders.groupBy('customer_id').agg(sum('amount')); agg.explain(mode='formatted')",
          output: "Plan shows: HashAggregate(partial) -> Exchange hashpartitioning(customer_id) -> HashAggregate(final).",
          reasoning: "Spark aggregates locally per partition (partial), shuffles the partial results by key (the Exchange), then combines them (final). The Exchange node is the shuffle you are paying for."
        }
      ],
      approaches: [
        {
          name: "explain(True) / explain(mode='formatted') and read the aggregate + Exchange",
          whenToUse: "Diagnosing a slow aggregation or join, or confirming that a two-phase aggregate and a single shuffle are what you expect.",
          logic:
            "**What it asks.** Read the physical plan to see how the `groupBy` executes and where the shuffle is.\n\n" +
            "**Key Idea.** `agg.explain(True)` prints all four plans (parsed, analyzed, optimized logical, and physical); `agg.explain(mode=\"formatted\")` prints just the physical plan as a numbered tree with per-operator details. For a `groupBy(...).agg(...)` you should see a **two-phase aggregate**: a partial `HashAggregate` (map-side pre-aggregation), an `Exchange hashpartitioning(customer_id)` (the shuffle), and a final `HashAggregate` — read bottom-up.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the aggregate: `agg = orders.groupBy('customer_id').agg(_sum('amount').alias('total'))`.\n" +
            "2. Print the physical plan: `agg.explain(mode=\"formatted\")` (or `agg.explain(True)` for logical stages too).\n" +
            "3. Read bottom-up: `Scan` -> partial `HashAggregate` -> `Exchange hashpartitioning(customer_id, 200)` -> final `HashAggregate`.\n" +
            "4. The `Exchange` is the shuffle; note its partition count (`spark.sql.shuffle.partitions`, default 200) and whether AQE (`AdaptiveSparkPlan`) will coalesce it.\n" +
            "5. If the aggregate is not hash-based (e.g. `SortAggregate` on a non-mergeable expression), that is a red flag for the slowness.\n\n" +
            "**Why it works.** The physical plan is the exact operator tree Spark executes; the presence, key, and partition count of the `Exchange` node tell you precisely what is shuffled and how widely, which is the source of aggregation cost.\n\n" +
            "**Common Gotchas.**\n" +
            "- Read the plan **bottom-up**: leaves (scans) run first, the root last.\n" +
            "- A single `Exchange` under a two-phase `HashAggregate` is healthy; **two** exchanges or a missing partial aggregate signals a plan that does not pre-aggregate map-side.\n" +
            "- With AQE on, the printed plan shows `AdaptiveSparkPlan isFinalPlan=false` — the real plan is decided at runtime; check the SQL tab or `explain('formatted')` after execution.\n" +
            "- `explain()` does not run the job; it only prints the plan (cheap).\n\n" +
            "**Interview mindset.** Describe the partial/Exchange/final shape out loud and point at the `Exchange hashpartitioning` as the shuffle — that is the credibility move for diagnosing an aggregate.",
          rcs:
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "agg = (orders\n" +
            "    .groupBy('customer_id')                        # WIDE: forces an Exchange\n" +
            "    .agg(_sum('amount').alias('total_revenue')))\n" +
            "\n" +
            "# Formatted physical plan: numbered operators, easiest to read.\n" +
            "agg.explain(mode='formatted')                      # HashAggregate/Exchange/HashAggregate\n" +
            "\n" +
            "# All plan stages (parsed, analyzed, optimized logical, physical).\n" +
            "agg.explain(True)                                  # bottom-up: Scan -> partial -> Exchange -> final",
          plain:
            "from pyspark.sql.functions import sum as _sum\n" +
            "\n" +
            "agg = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('amount').alias('total_revenue')))\n" +
            "\n" +
            "agg.explain(mode='formatted')\n" +
            "\n" +
            "agg.explain(True)"
        }
      ],
      sparkInternals:
        "A `groupBy(...).agg(...)` compiles to a **two-phase hash aggregate** around one **wide** `Exchange`. Bottom-up: the `Scan` feeds a **partial `HashAggregate`** that pre-aggregates within each input partition (map-side combine — one partial sum per key per partition), then `Exchange hashpartitioning(customer_id, N)` hash-shuffles those partials by the key (N = `spark.sql.shuffle.partitions`, default 200), and a **final `HashAggregate`** merges them per key. Partial aggregation is why `sum`/`count`/`avg` scale well — only tiny partial results cross the network. The `Exchange` is the cost center: its width (partition count) and any key **skew** (a hot `customer_id` landing on one reducer) drive the runtime. `explain(mode=\"formatted\")` renders this as a numbered tree; `explain(True)` also shows the logical plans. With AQE, the plan is `AdaptiveSparkPlan` and the shuffle partition count is coalesced at runtime, so the final plan can differ from the printed one.",
      sparkSql:
        "EXPLAIN FORMATTED\n" +
        "SELECT customer_id, SUM(amount) AS total_revenue\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** 'why is my groupBy slow?', 'read the physical plan', 'how many shuffles does this aggregate do?'.",
        "**Say it:** `df.explain(mode=\"formatted\")` — expect partial HashAggregate -> Exchange hashpartitioning -> final HashAggregate; the Exchange is the shuffle.",
        "**Trap:** read bottom-up; AQE means the printed plan may not be the final one — check the SQL UI."
      ]
    },

    // ------------------------------------------------------------------ Q155
    {
      id: "per-customer-purchase-summary",
      lc: 155,
      title: "Per-customer purchase summary with first/second purchase gap",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Group aggregates + ranked first/second dates", transformation: "Wide (shuffle)", functions: "Window, row_number, groupBy, agg, datediff" },
      description:
        "From a `transactions` DataFrame (`customer_id`, `order_date`, `amount`), produce one row per customer with: `first_purchase_date`, `second_purchase_date`, `total_orders`, `total_revenue`, `average_order_value`, `largest_order`, and `days_between_first_second_purchase`. This composes a standard group aggregate with a window to isolate the first and second dated purchases.",
      examples: [
        {
          input: "transactions: (c1, 2026-01-01, 100), (c1, 2026-01-06, 40), (c1, 2026-02-01, 260), (c2, 2026-03-10, 500)",
          output: "c1 -> first 2026-01-01, second 2026-01-06, total_orders 3, total_revenue 400, avg 133.33, largest 260, gap 5 ; c2 -> first/second 2026-03-10/null, orders 1, revenue 500, avg 500, largest 500, gap null",
          reasoning: "c1's ranked dates give first=01-01 and second=01-06 (gap 5 days); the aggregates sum/count/avg/max over all three rows. c2 has only one order, so second_purchase_date and the gap are null."
        }
      ],
      approaches: [
        {
          name: "aggregate for the metrics, window row_number for first/second dates, then join",
          whenToUse: "A per-entity summary that mixes plain aggregates (sum/count/avg/max) with position-specific values (the 1st and 2nd event).",
          logic:
            "**What it asks.** One summary row per customer combining volume/revenue aggregates with the dates of their first and second purchases and the gap between them.\n\n" +
            "**Key Idea.** Split the work into two shapes and join. (1) A `groupBy('customer_id').agg(...)` yields `total_orders`, `total_revenue`, `average_order_value`, and `largest_order`. (2) A `row_number()` window ordered by `order_date` labels each purchase 1, 2, 3...; pivot rows 1 and 2 into `first_purchase_date` and `second_purchase_date`. Join the two on `customer_id` and compute `datediff(second, first)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Aggregates: `agg = transactions.groupBy('customer_id').agg(_count('*').alias('total_orders'), _sum('amount').alias('total_revenue'), _round(avg('amount'), 2).alias('average_order_value'), _max('amount').alias('largest_order'))`.\n" +
            "2. Rank purchases: `w = Window.partitionBy('customer_id').orderBy('order_date')`, `ranked = transactions.withColumn('rn', row_number().over(w))`.\n" +
            "3. Isolate first/second dates with a conditional aggregate: `dates = ranked.groupBy('customer_id').agg(_max(when(col('rn') == 1, col('order_date'))).alias('first_purchase_date'), _max(when(col('rn') == 2, col('order_date'))).alias('second_purchase_date'))`.\n" +
            "4. Join: `result = agg.join(dates, 'customer_id')`.\n" +
            "5. Gap: `result.withColumn('days_between_first_second_purchase', datediff(col('second_purchase_date'), col('first_purchase_date')))`.\n\n" +
            "**Why it works.** `row_number` gives a strict, tie-free ordinal so 'first' and 'second' are unambiguous; the `max(when(rn==k, date))` trick collapses each ordinal onto the single customer row without a self-join. The plain aggregates run over all rows in one pass, and the final `datediff` measures the gap (null when there is no second purchase).\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `row_number` (strict), not `rank`/`dense_rank`, so two same-day purchases do not both become 'first'.\n" +
            "- Single-order customers have no rn=2, so `second_purchase_date` and the gap are correctly null.\n" +
            "- `average_order_value` should be `total_revenue / total_orders` — use `avg('amount')` (or divide the two aggregates) and round; do not average per-day subtotals.\n" +
            "- Order the window by a real `DateType`; a string date only sorts correctly if zero-padded ISO.\n\n" +
            "**Interview mindset.** Announce the two-shape decomposition: 'aggregates for the metrics, a row_number window for the positional dates, join them'. That framing scales to every 'summary with the Nth event' problem.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff, avg,\n" +
            "                                   sum as _sum, count as _count,\n" +
            "                                   max as _max, round as _round)\n" +
            "\n" +
            "# 1) Volume / revenue aggregates over all rows.\n" +
            "agg = (transactions\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_count('*').alias('total_orders'),\n" +
            "         _sum('amount').alias('total_revenue'),\n" +
            "         _round(avg('amount'), 2).alias('average_order_value'),\n" +
            "         _max('amount').alias('largest_order')))\n" +
            "\n" +
            "# 2) Rank purchases by date, isolate the 1st and 2nd.\n" +
            "w = Window.partitionBy('customer_id').orderBy('order_date')\n" +
            "ranked = transactions.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "dates = (ranked\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_max(when(col('rn') == 1, col('order_date'))).alias('first_purchase_date'),\n" +
            "         _max(when(col('rn') == 2, col('order_date'))).alias('second_purchase_date')))\n" +
            "\n" +
            "# 3) Join the two shapes, then compute the gap.\n" +
            "result = (agg.join(dates, 'customer_id')\n" +
            "    .withColumn('days_between_first_second_purchase',\n" +
            "                datediff(col('second_purchase_date'), col('first_purchase_date'))))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff, avg,\n" +
            "                                   sum as _sum, count as _count,\n" +
            "                                   max as _max, round as _round)\n" +
            "\n" +
            "agg = (transactions\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_count('*').alias('total_orders'),\n" +
            "         _sum('amount').alias('total_revenue'),\n" +
            "         _round(avg('amount'), 2).alias('average_order_value'),\n" +
            "         _max('amount').alias('largest_order')))\n" +
            "\n" +
            "w = Window.partitionBy('customer_id').orderBy('order_date')\n" +
            "ranked = transactions.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "dates = (ranked\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_max(when(col('rn') == 1, col('order_date'))).alias('first_purchase_date'),\n" +
            "         _max(when(col('rn') == 2, col('order_date'))).alias('second_purchase_date')))\n" +
            "\n" +
            "result = (agg.join(dates, 'customer_id')\n" +
            "    .withColumn('days_between_first_second_purchase',\n" +
            "                datediff(col('second_purchase_date'), col('first_purchase_date'))))\n" +
            "result.show()",
        }
      ],
      sparkInternals:
        "Three **wide** steps. The `groupBy('customer_id').agg(...)` is one `Exchange` softened by map-side partial aggregation. The `row_number()` window is a second `Exchange` (hash-partition by `customer_id`) plus a sort by `order_date` within each partition. The conditional `max(when(...))` collapses the ranked rows in a third aggregate — though Catalyst can often fuse it with the window's partitioning since both key on `customer_id`, saving an exchange. The final `join` on `customer_id` is another shuffle, but both inputs are already one row per customer and identically partitioned, so it is cheap (and either side is small enough to broadcast). `datediff` and `round` are **narrow**. Key skew on a customer with an enormous history is the main risk; the `max(when(rn==k, ...))` pattern avoids a self-join, which would otherwise fan out that customer's rows quadratically.",
      sparkSql:
        "WITH ranked AS (\n" +
        "  SELECT customer_id, order_date, amount,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS rn\n" +
        "  FROM transactions\n" +
        ")\n" +
        "SELECT customer_id,\n" +
        "       MAX(CASE WHEN rn = 1 THEN order_date END) AS first_purchase_date,\n" +
        "       MAX(CASE WHEN rn = 2 THEN order_date END) AS second_purchase_date,\n" +
        "       COUNT(*)          AS total_orders,\n" +
        "       SUM(amount)       AS total_revenue,\n" +
        "       ROUND(AVG(amount), 2) AS average_order_value,\n" +
        "       MAX(amount)       AS largest_order,\n" +
        "       DATEDIFF(MAX(CASE WHEN rn = 2 THEN order_date END),\n" +
        "                MAX(CASE WHEN rn = 1 THEN order_date END)) AS days_between_first_second_purchase\n" +
        "FROM ranked\n" +
        "GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** 'per-customer summary', 'first and second purchase', 'total/avg/largest order plus the gap between first two'.",
        "**Say it:** aggregates for the metrics, a `row_number()` window for first/second dates via `max(when(rn==k, date))`, then `datediff`.",
        "**Trap:** row_number (not rank); single-order customers give null second date/gap; avg = revenue/orders, not an average of subtotals."
      ]
    },

    // ------------------------------------------------------------------ Q156
    {
      id: "customer-summary-ranked-by-revenue",
      lc: 156,
      title: "Customer order summary ranked globally by revenue",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Group aggregates + global dense_rank", transformation: "Wide (shuffle)", functions: "Window, dense_rank, groupBy, agg" },
      description:
        "From an `orders` DataFrame (`customer_id`, `order_date`, `amount`), produce one row per customer with `first_order_date`, `last_order_date`, `total_orders`, `total_revenue`, `average_order_value`, and `revenue_rank` — customers ranked **globally** by total revenue (highest revenue = rank 1). This composes a group aggregate with a global (unpartitioned) ranking window.",
      examples: [
        {
          input: "orders: (c1, 2026-01-01, 300), (c1, 2026-02-01, 200), (c2, 2026-01-15, 900), (c3, 2026-01-20, 500)",
          output: "c2 -> revenue 900, rank 1 ; c3 -> revenue 500, rank 2 ; c1 -> revenue 500, rank 3(dense: 2) ... e.g. c1 first 2026-01-01, last 2026-02-01, orders 2, revenue 500, avg 250",
          reasoning: "Aggregate to one row per customer (min/max dates, count, sum, avg), then rank those customer rows by total_revenue descending across the whole result."
        }
      ],
      approaches: [
        {
          name: "aggregate per customer, then dense_rank over the whole result by revenue",
          whenToUse: "A per-entity summary that must also carry the entity's global position on some aggregated metric.",
          logic:
            "**What it asks.** A per-customer summary plus each customer's global rank by total revenue.\n\n" +
            "**Key Idea.** First collapse orders to one row per customer with `groupBy('customer_id').agg(...)` for the dates, counts, revenue, and average. Then apply a **global** ranking window — `Window.orderBy(col('total_revenue').desc())` with **no** `partitionBy` — and `dense_rank()` (or `rank()`) to number customers by revenue.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Aggregate: `summary = orders.groupBy('customer_id').agg(_min('order_date').alias('first_order_date'), _max('order_date').alias('last_order_date'), _count('*').alias('total_orders'), _sum('amount').alias('total_revenue'), _round(avg('amount'), 2).alias('average_order_value'))`.\n" +
            "2. Build the global ranking window: `w = Window.orderBy(col('total_revenue').desc())`.\n" +
            "3. Rank: `result = summary.withColumn('revenue_rank', dense_rank().over(w))`.\n\n" +
            "**Why it works.** Ranking after aggregation ranks the collapsed customer rows (not raw orders). A window with no `partitionBy` treats the whole DataFrame as one group, so `dense_rank()` orders every customer against every other by revenue.\n\n" +
            "**Common Gotchas.**\n" +
            "- Rank **after** aggregating; ranking raw orders would rank individual orders, not customers.\n" +
            "- A window with no `partitionBy` funnels all rows to a **single partition** — fine for a per-customer summary (one row each), but say so; it does not parallelize.\n" +
            "- `dense_rank` gives ties the same rank with no gaps (1,2,2,3); `rank` leaves gaps (1,2,2,4); `row_number` breaks ties arbitrarily. Pick per the tie semantics you want.\n" +
            "- Use a safe alias like `revenue_rank`, never the reserved bare word `rank`.\n\n" +
            "**Interview mindset.** 'Aggregate first, then a partitionBy-less window to rank the summary rows globally'. Flag the single-partition caveat and the dense_rank vs rank tie choice.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, dense_rank, avg,\n" +
            "                                   sum as _sum, count as _count,\n" +
            "                                   min as _min, max as _max, round as _round)\n" +
            "\n" +
            "# 1) One row per customer.\n" +
            "summary = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_date').alias('first_order_date'),\n" +
            "         _max('order_date').alias('last_order_date'),\n" +
            "         _count('*').alias('total_orders'),\n" +
            "         _sum('amount').alias('total_revenue'),\n" +
            "         _round(avg('amount'), 2).alias('average_order_value')))\n" +
            "\n" +
            "# 2) Global rank by revenue (no partitionBy -> whole result is one group).\n" +
            "w = Window.orderBy(col('total_revenue').desc())\n" +
            "result = summary.withColumn('revenue_rank', dense_rank().over(w))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, dense_rank, avg,\n" +
            "                                   sum as _sum, count as _count,\n" +
            "                                   min as _min, max as _max, round as _round)\n" +
            "\n" +
            "summary = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_min('order_date').alias('first_order_date'),\n" +
            "         _max('order_date').alias('last_order_date'),\n" +
            "         _count('*').alias('total_orders'),\n" +
            "         _sum('amount').alias('total_revenue'),\n" +
            "         _round(avg('amount'), 2).alias('average_order_value')))\n" +
            "\n" +
            "w = Window.orderBy(col('total_revenue').desc())\n" +
            "result = summary.withColumn('revenue_rank', dense_rank().over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two **wide** steps. The `groupBy('customer_id').agg(...)` is one `Exchange` with map-side partial aggregation of `min`/`max`/`count`/`sum`. The ranking window is the subtle cost: `Window.orderBy(...)` **without a partitionBy** collapses every customer row into a **single partition** on one executor to compute a global order, so the ranking stage does not scale — acceptable here because the input is already reduced to one row per customer, but a genuine full-data global rank would be a bottleneck. `dense_rank` requires a total sort of that single partition. `round` is **narrow**. If you only needed a top-N rather than a full ranking, `orderBy(...).limit(N)` would be far cheaper than materializing every rank.",
      sparkSql:
        "WITH summary AS (\n" +
        "  SELECT customer_id,\n" +
        "         MIN(order_date) AS first_order_date,\n" +
        "         MAX(order_date) AS last_order_date,\n" +
        "         COUNT(*)        AS total_orders,\n" +
        "         SUM(amount)     AS total_revenue,\n" +
        "         ROUND(AVG(amount), 2) AS average_order_value\n" +
        "  FROM orders\n" +
        "  GROUP BY customer_id\n" +
        ")\n" +
        "SELECT summary.*,\n" +
        "       DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank\n" +
        "FROM summary;",
      recognizeRecall: [
        "**Spot it:** 'rank customers by total revenue', 'per-customer summary with a global ranking', 'top spenders'.",
        "**Say it:** `groupBy` for the metrics, then `dense_rank().over(Window.orderBy(total_revenue.desc()))` — rank after aggregating.",
        "**Trap:** a partitionBy-less window is single-partition; use a safe alias (revenue_rank, not `rank`); dense_rank vs rank tie semantics."
      ]
    },

    // ------------------------------------------------------------------ Q157
    {
      id: "sales-daily-monthly-rolling-metrics",
      lc: 157,
      title: "Daily, monthly, ranked, and 7-day rolling sales metrics",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Multi-grain rollups + rank + rolling window", transformation: "Wide (shuffle)", functions: "Window, dense_rank, sum, rangeBetween, date_format" },
      description:
        "From a `sales` DataFrame (`store_id`, `product_id`, `sale_date`, `quantity`, `price`) compute revenue at several grains: `daily_revenue` (per product per day), `monthly_revenue` (per product per month), `monthly_rank` (rank of each product within its month by monthly revenue), and `rolling_7d_revenue` (a trailing 7-day revenue per product). This composes date bucketing, group aggregates, a ranking window, and a time-based rolling window. Alias names are chosen to never start with a digit.",
      examples: [
        {
          input: "sales for product p1: (2026-03-01, qty 2, price 10), (2026-03-02, qty 1, price 10), (2026-03-08, qty 3, price 10)",
          output: "daily_revenue: 20, 10, 30 ; monthly_revenue (2026-03): 60 ; monthly_rank: p1 ranked vs other products in 2026-03 ; rolling_7d_revenue on 03-08 = 30 (03-01 and 03-02 fall outside the trailing 7 days)",
          reasoning: "Daily revenue sums quantity*price per product per day; monthly sums per product per month; monthly_rank ranks products within each month; the rolling window sums the last 7 days by actual date, so 03-08's window excludes 03-01/03-02."
        }
      ],
      approaches: [
        {
          name: "compute revenue, roll up to daily, then month + monthly rank + a rangeBetween 7-day window",
          whenToUse: "A metrics table that must report the same measure at day, month, ranked, and rolling grains side by side.",
          logic:
            "**What it asks.** Per-product revenue at daily and monthly grains, each product's rank within its month, and a trailing 7-day rolling revenue.\n\n" +
            "**Key Idea.** Build up in layers. (1) Row revenue = `quantity * price`. (2) `daily` = `groupBy(product_id, sale_date).sum(revenue)`. (3) Add a `sale_month` bucket and a **monthly** aggregate; rank products within each month with `dense_rank()` over a window partitioned by month ordered by monthly revenue desc. (4) On the daily grain, a **rolling 7-day** sum uses a window ordered by `sale_date` cast to a day number with `rangeBetween(-6, 0)` so the frame is defined by calendar distance, not row count.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Row revenue: `s = sales.withColumn('revenue', col('quantity') * col('price'))`.\n" +
            "2. Daily: `daily = s.groupBy('product_id', 'sale_date').agg(_sum('revenue').alias('daily_revenue'))`.\n" +
            "3. Month bucket: `daily = daily.withColumn('sale_month', date_format(col('sale_date'), 'yyyy-MM'))`.\n" +
            "4. Monthly revenue per product: `monthly = daily.groupBy('product_id', 'sale_month').agg(_sum('daily_revenue').alias('monthly_revenue'))`.\n" +
            "5. Monthly rank: `wm = Window.partitionBy('sale_month').orderBy(col('monthly_revenue').desc())`, `monthly = monthly.withColumn('monthly_rank', dense_rank().over(wm))`.\n" +
            "6. Rolling 7 days: convert the date to a day number for a range frame — `wr = Window.partitionBy('product_id').orderBy(datediff(col('sale_date'), lit('1970-01-01'))).rangeBetween(-6, 0)` — then `daily.withColumn('rolling_7d_revenue', _sum('daily_revenue').over(wr))`.\n" +
            "7. Join `monthly` back to `daily` on `product_id`+`sale_month` if you want all columns in one row.\n\n" +
            "**Why it works.** Each grain is a separate aggregation over the layer below it, so revenue is never double-counted. `dense_rank` over `partitionBy('sale_month')` ranks within each month independently. For the rolling window, `rangeBetween(-6, 0)` on an integer day-number frames by **actual dates** (last 7 calendar days including today), which correctly skips missing days — unlike `rowsBetween`, which would count 7 rows regardless of gaps.\n\n" +
            "**Common Gotchas.**\n" +
            "- Never start a SQL identifier with a digit: use `rolling_7d_revenue`, `monthly_rank`, `sale_month` — not `7_day_revenue` or `rank`.\n" +
            "- For a true calendar rolling window use `rangeBetween` over a **numeric day value** (a date cast to a day number); `rangeBetween` cannot order directly by a raw `DateType` for a `-6..0` numeric frame, so convert with `datediff`/`unix` first.\n" +
            "- `rangeBetween(-6, 0)` = today and the 6 days before it (7 days inclusive); `rowsBetween(-6, 0)` would instead be the previous 7 *rows*, wrong when days are missing.\n" +
            "- Aggregate to the daily grain **before** the rolling window so each day contributes once.\n\n" +
            "**Interview mindset.** Narrate the layering: row revenue -> daily -> monthly + monthly rank -> rolling. Emphasize `rangeBetween` over a day-number for a real calendar window, and the digit-leading-identifier trap.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, lit, date_format, datediff,\n" +
            "                                   dense_rank, sum as _sum)\n" +
            "\n" +
            "# 1) Row-level revenue.\n" +
            "s = sales.withColumn('revenue', col('quantity') * col('price'))\n" +
            "\n" +
            "# 2) Daily revenue per product, plus a month bucket.\n" +
            "daily = (s.groupBy('product_id', 'sale_date')\n" +
            "    .agg(_sum('revenue').alias('daily_revenue'))\n" +
            "    .withColumn('sale_month', date_format(col('sale_date'), 'yyyy-MM')))\n" +
            "\n" +
            "# 3) Monthly revenue per product + rank within the month.\n" +
            "wm = Window.partitionBy('sale_month').orderBy(col('monthly_revenue').desc())\n" +
            "monthly = (daily.groupBy('product_id', 'sale_month')\n" +
            "    .agg(_sum('daily_revenue').alias('monthly_revenue'))\n" +
            "    .withColumn('monthly_rank', dense_rank().over(wm)))\n" +
            "\n" +
            "# 4) Trailing 7-day rolling revenue (frame by calendar day, not row count).\n" +
            "day_num = datediff(col('sale_date'), lit('1970-01-01'))    # date -> integer day number\n" +
            "wr = (Window.partitionBy('product_id')\n" +
            "      .orderBy(day_num)\n" +
            "      .rangeBetween(-6, 0))                                # today + previous 6 days\n" +
            "daily = daily.withColumn('rolling_7d_revenue', _sum('daily_revenue').over(wr))\n" +
            "\n" +
            "# 5) Combine grains into one row per product-day.\n" +
            "result = daily.join(monthly, ['product_id', 'sale_month'], 'left')\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, lit, date_format, datediff,\n" +
            "                                   dense_rank, sum as _sum)\n" +
            "\n" +
            "s = sales.withColumn('revenue', col('quantity') * col('price'))\n" +
            "\n" +
            "daily = (s.groupBy('product_id', 'sale_date')\n" +
            "    .agg(_sum('revenue').alias('daily_revenue'))\n" +
            "    .withColumn('sale_month', date_format(col('sale_date'), 'yyyy-MM')))\n" +
            "\n" +
            "wm = Window.partitionBy('sale_month').orderBy(col('monthly_revenue').desc())\n" +
            "monthly = (daily.groupBy('product_id', 'sale_month')\n" +
            "    .agg(_sum('daily_revenue').alias('monthly_revenue'))\n" +
            "    .withColumn('monthly_rank', dense_rank().over(wm)))\n" +
            "\n" +
            "day_num = datediff(col('sale_date'), lit('1970-01-01'))\n" +
            "wr = (Window.partitionBy('product_id')\n" +
            "      .orderBy(day_num)\n" +
            "      .rangeBetween(-6, 0))\n" +
            "daily = daily.withColumn('rolling_7d_revenue', _sum('daily_revenue').over(wr))\n" +
            "\n" +
            "result = daily.join(monthly, ['product_id', 'sale_month'], 'left')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This stacks several **wide** stages. The daily `groupBy(product_id, sale_date)` and the monthly `groupBy(product_id, sale_month)` are two `Exchange`s (each with map-side partials). The `dense_rank()` window adds an `Exchange hashpartitioning(sale_month)` plus a sort by monthly revenue within each month. The rolling window adds an `Exchange hashpartitioning(product_id)` plus a sort by the day number. The final `join` on `product_id`+`sale_month` is another shuffle, though Catalyst may reuse the monthly partitioning. The key correctness/perf note is the frame type: `rangeBetween(-6, 0)` over an **integer day number** makes Spark evaluate the frame by value distance (calendar days), which naturally skips absent days; `rowsBetween` would frame by physical rows and miscount when days are missing. Aggregating to daily before rolling keeps each day a single contributing row and shrinks every downstream shuffle.",
      sparkSql:
        "WITH daily AS (\n" +
        "  SELECT product_id, sale_date,\n" +
        "         DATE_FORMAT(sale_date, 'yyyy-MM') AS sale_month,\n" +
        "         SUM(quantity * price) AS daily_revenue\n" +
        "  FROM sales\n" +
        "  GROUP BY product_id, sale_date, DATE_FORMAT(sale_date, 'yyyy-MM')\n" +
        "),\n" +
        "monthly AS (\n" +
        "  SELECT product_id, sale_month,\n" +
        "         SUM(daily_revenue) AS monthly_revenue,\n" +
        "         DENSE_RANK() OVER (PARTITION BY sale_month ORDER BY SUM(daily_revenue) DESC) AS monthly_rank\n" +
        "  FROM daily\n" +
        "  GROUP BY product_id, sale_month\n" +
        ")\n" +
        "SELECT d.product_id, d.sale_date, d.sale_month, d.daily_revenue,\n" +
        "       m.monthly_revenue, m.monthly_rank,\n" +
        "       SUM(d.daily_revenue) OVER (\n" +
        "         PARTITION BY d.product_id\n" +
        "         ORDER BY DATEDIFF(d.sale_date, DATE('1970-01-01'))\n" +
        "         RANGE BETWEEN 6 PRECEDING AND CURRENT ROW\n" +
        "       ) AS rolling_7d_revenue\n" +
        "FROM daily d\n" +
        "LEFT JOIN monthly m\n" +
        "  ON d.product_id = m.product_id AND d.sale_month = m.sale_month;",
      recognizeRecall: [
        "**Spot it:** 'daily and monthly revenue', 'rank product within month', '7-day rolling revenue', multi-grain metrics.",
        "**Say it:** layer it — row revenue -> daily groupBy -> monthly groupBy + `dense_rank` per month -> `sum().over(rangeBetween(-6,0))` on a day-number for the rolling window.",
        "**Trap:** never lead an identifier with a digit (rolling_7d_revenue); use rangeBetween over a numeric day for a true calendar window, not rowsBetween."
      ]
    },

    // ------------------------------------------------------------------ Q158
    {
      id: "events-funnel-first-purchase-timing",
      lc: 158,
      title: "Per-user event funnel: first event to first/second purchase",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Conditional first/Nth events + gap", transformation: "Wide (shuffle)", functions: "Window, row_number, when, min, datediff" },
      description:
        "From an `events` DataFrame (`user_id`, `event_name`, `event_ts`) compute, per user: `first_event` (timestamp of their earliest event of any kind), `first_purchase` and `second_purchase` (timestamps of their 1st and 2nd `purchase` events), `days_to_first_purchase` (from first event to first purchase), and `total_purchases`. This composes conditional aggregation with a window that ranks only the purchase events.",
      examples: [
        {
          input: "events for u1: (view, 2026-01-01 09:00), (view, 2026-01-02 10:00), (purchase, 2026-01-05 11:00), (purchase, 2026-01-09 12:00)",
          output: "u1 -> first_event 2026-01-01 09:00, first_purchase 2026-01-05 11:00, second_purchase 2026-01-09 12:00, days_to_first_purchase 4, total_purchases 2",
          reasoning: "first_event is the min timestamp over all events; the purchase events ranked by time give first/second purchase; the gap is datediff(first_purchase, first_event); total_purchases counts purchase rows."
        }
      ],
      approaches: [
        {
          name: "min over all events for first_event; row_number over purchases only for 1st/2nd; count purchases",
          whenToUse: "Funnel / time-to-conversion questions that mix an all-events milestone with position-specific values of one event type.",
          logic:
            "**What it asks.** Per user: their very first event, the timing of their first and second purchases, the days from first event to first purchase, and how many purchases they made.\n\n" +
            "**Key Idea.** `first_event` is `min('event_ts')` over **all** events. The purchase-specific fields come from ranking **only** the `purchase` events with `row_number()` ordered by time and pivoting ranks 1 and 2. `total_purchases` is a conditional count. Bring these together per user and compute the gap with `datediff`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. First event over all rows: `fe = events.groupBy('user_id').agg(_min('event_ts').alias('first_event'))`.\n" +
            "2. Isolate purchases and rank them: `purchases = events.filter(col('event_name') == 'purchase')`, `w = Window.partitionBy('user_id').orderBy('event_ts')`, `pr = purchases.withColumn('rn', row_number().over(w))`.\n" +
            "3. Pivot 1st/2nd + count: `pagg = pr.groupBy('user_id').agg(_max(when(col('rn') == 1, col('event_ts'))).alias('first_purchase'), _max(when(col('rn') == 2, col('event_ts'))).alias('second_purchase'), _count('*').alias('total_purchases'))`.\n" +
            "4. Join to first-event and compute the gap: `result = fe.join(pagg, 'user_id', 'left').withColumn('days_to_first_purchase', datediff(col('first_purchase'), col('first_event')))`.\n\n" +
            "**Why it works.** Separating the two shapes — an all-events min vs a purchases-only ranking — keeps each measure correct. Filtering to purchases before `row_number` guarantees rank 1/2 are the first two *purchases*, not the first two events. The left join preserves users who browsed but never bought (their purchase fields stay null).\n\n" +
            "**Common Gotchas.**\n" +
            "- Avoid the reserved bare word `event`; name the column `event_name` (and the timestamp `event_ts`).\n" +
            "- Rank purchases **after** filtering to `event_name == 'purchase'`, or rank 1 could be a view.\n" +
            "- Use a **left** join from first-event so non-buyers survive with null purchase columns and null `days_to_first_purchase`.\n" +
            "- `datediff` on timestamps returns whole days; if you need finer granularity use a unix-timestamp difference instead.\n\n" +
            "**Interview mindset.** State the decomposition: 'min over all events, row_number over purchases only, conditional count, then join and datediff'. Call out the left join so non-buyers are not dropped.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff,\n" +
            "                                   min as _min, max as _max, count as _count)\n" +
            "\n" +
            "# 1) Earliest event of ANY kind, per user.\n" +
            "fe = events.groupBy('user_id').agg(_min('event_ts').alias('first_event'))\n" +
            "\n" +
            "# 2) Rank ONLY the purchase events by time.\n" +
            "purchases = events.filter(col('event_name') == 'purchase')\n" +
            "w = Window.partitionBy('user_id').orderBy('event_ts')\n" +
            "pr = purchases.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "# 3) 1st / 2nd purchase timestamps + total purchases.\n" +
            "pagg = (pr.groupBy('user_id')\n" +
            "    .agg(_max(when(col('rn') == 1, col('event_ts'))).alias('first_purchase'),\n" +
            "         _max(when(col('rn') == 2, col('event_ts'))).alias('second_purchase'),\n" +
            "         _count('*').alias('total_purchases')))\n" +
            "\n" +
            "# 4) Join (left keeps non-buyers) and compute the gap.\n" +
            "result = (fe.join(pagg, 'user_id', 'left')\n" +
            "    .withColumn('days_to_first_purchase',\n" +
            "                datediff(col('first_purchase'), col('first_event'))))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff,\n" +
            "                                   min as _min, max as _max, count as _count)\n" +
            "\n" +
            "fe = events.groupBy('user_id').agg(_min('event_ts').alias('first_event'))\n" +
            "\n" +
            "purchases = events.filter(col('event_name') == 'purchase')\n" +
            "w = Window.partitionBy('user_id').orderBy('event_ts')\n" +
            "pr = purchases.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "pagg = (pr.groupBy('user_id')\n" +
            "    .agg(_max(when(col('rn') == 1, col('event_ts'))).alias('first_purchase'),\n" +
            "         _max(when(col('rn') == 2, col('event_ts'))).alias('second_purchase'),\n" +
            "         _count('*').alias('total_purchases')))\n" +
            "\n" +
            "result = (fe.join(pagg, 'user_id', 'left')\n" +
            "    .withColumn('days_to_first_purchase',\n" +
            "                datediff(col('first_purchase'), col('first_event'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Three **wide** stages, all keyed by `user_id`. The `min('event_ts')` aggregate is one `Exchange` (partial min map-side). The `row_number()` over purchases is a second `Exchange` plus a within-partition sort by `event_ts`; note it runs only on the filtered purchase rows, so it moves less data. The conditional `max(when(...))` + `count` aggregate is a third `Exchange`, though Catalyst can fuse it with the window since both key on `user_id`. The final `join` is on `user_id`; because all inputs are one row per user and identically partitioned, it is cheap and often broadcastable. Filtering purchases early is the main optimization — it shrinks the ranking shuffle. `datediff` is **narrow**. Skew on a hyperactive user is the usual risk; the `max(when(rn==k, ...))` pattern avoids a self-join that would blow up on such a user.",
      sparkSql:
        "WITH ranked_purchases AS (\n" +
        "  SELECT user_id, event_ts,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_ts) AS rn\n" +
        "  FROM events\n" +
        "  WHERE event_name = 'purchase'\n" +
        "),\n" +
        "purchase_agg AS (\n" +
        "  SELECT user_id,\n" +
        "         MAX(CASE WHEN rn = 1 THEN event_ts END) AS first_purchase,\n" +
        "         MAX(CASE WHEN rn = 2 THEN event_ts END) AS second_purchase,\n" +
        "         COUNT(*) AS total_purchases\n" +
        "  FROM ranked_purchases\n" +
        "  GROUP BY user_id\n" +
        "),\n" +
        "first_events AS (\n" +
        "  SELECT user_id, MIN(event_ts) AS first_event\n" +
        "  FROM events\n" +
        "  GROUP BY user_id\n" +
        ")\n" +
        "SELECT f.user_id, f.first_event,\n" +
        "       p.first_purchase, p.second_purchase,\n" +
        "       DATEDIFF(p.first_purchase, f.first_event) AS days_to_first_purchase,\n" +
        "       p.total_purchases\n" +
        "FROM first_events f\n" +
        "LEFT JOIN purchase_agg p ON f.user_id = p.user_id;",
      recognizeRecall: [
        "**Spot it:** 'time to first purchase', 'first event vs first purchase', 'funnel', 'first and second conversion per user'.",
        "**Say it:** `min(ts)` over all events, `row_number` over purchases only for 1st/2nd, conditional count, left join + `datediff`.",
        "**Trap:** filter to purchases before ranking; left join to keep non-buyers; use safe names (event_name/event_ts), not `event`."
      ]
    },

    // ------------------------------------------------------------------ Q159
    {
      id: "high-value-fast-repeat-customers",
      lc: 159,
      title: "High-value fast-repeat customers with multi-condition filter",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Multi-metric aggregate + compound HAVING", transformation: "Wide (shuffle)", functions: "Window, row_number, countDistinct, sum, datediff, filter" },
      description:
        "From an `orders` DataFrame (`customer_id`, `order_date`, `amount`, `product_id`), identify customers who satisfy **all** of: at least 3 orders, more than 5000 total spent, a second purchase within 14 days of the first, and at least 3 **distinct** products purchased. This composes several aggregates (count, sum, countDistinct), a ranked first/second date, and a compound filter.",
      examples: [
        {
          input: "customer c1: 4 orders totaling 6200, first 2026-01-01, second 2026-01-08 (7 days), 3 distinct products; customer c2: 5 orders totaling 8000 but second purchase 40 days after first",
          output: "c1 qualifies ; c2 fails (second purchase not within 14 days)",
          reasoning: "c1 meets all four gates: orders>=3, spend>5000, second-within-14-days, distinct products>=3. c2 passes count/spend/products but its first-to-second gap exceeds 14 days, so it is excluded."
        }
      ],
      approaches: [
        {
          name: "aggregate all metrics per customer (incl. first/second dates), then apply the compound filter",
          whenToUse: "'Qualified customer' segmentation where membership depends on several independent aggregate conditions at once.",
          logic:
            "**What it asks.** Customers passing four simultaneous gates: order count, total spend, speed to second purchase, and product variety.\n\n" +
            "**Key Idea.** Reduce each customer to one row carrying every metric, then filter on the conjunction. Use a `row_number()` window to pull the first and second purchase dates, and in the same per-customer aggregation compute `total_orders` (count), `total_spent` (sum), and `distinct_products` (countDistinct). Finally keep rows where all four conditions hold, using `datediff(second, first) <= 14` for the speed gate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Rank orders by date: `w = Window.partitionBy('customer_id').orderBy('order_date')`, `ranked = orders.withColumn('rn', row_number().over(w))`.\n" +
            "2. Aggregate every metric per customer: `agg = ranked.groupBy('customer_id').agg(_count('*').alias('total_orders'), _sum('amount').alias('total_spent'), countDistinct('product_id').alias('distinct_products'), _max(when(col('rn') == 1, col('order_date'))).alias('first_date'), _max(when(col('rn') == 2, col('order_date'))).alias('second_date'))`.\n" +
            "3. Compound filter: keep where `total_orders >= 3` AND `total_spent > 5000` AND `distinct_products >= 3` AND `datediff(second_date, first_date) <= 14`.\n" +
            "4. A customer with no second purchase has null `second_date`, so the `datediff` is null and the row is dropped — correct, since 'second within 14 days' implies a second purchase exists.\n\n" +
            "**Why it works.** Collapsing to one row per customer lets a single `filter` express the four-way AND cleanly. `countDistinct('product_id')` handles variety; `max(when(rn==k, date))` extracts the positional dates without a self-join; the `<= 14` day test uses the two extracted dates.\n\n" +
            "**Common Gotchas.**\n" +
            "- `distinct_products` needs `countDistinct('product_id')`, not `count('product_id')` (which counts rows, including repeats).\n" +
            "- Watch the boundary wording: 'more than 5000' is `> 5000` (strict), while '>=3 orders' and 'within 14 days' are inclusive (`>=`, `<= 14`).\n" +
            "- Null `second_date` makes `datediff` null; a null fails the `<= 14` predicate and the customer is excluded — the intended behavior.\n" +
            "- `countDistinct` cannot fully pre-aggregate map-side, so it is the most expensive metric here; it is fine at customer grain but worth naming.\n\n" +
            "**Interview mindset.** 'One row per customer with every metric, then a single compound filter.' Call out `countDistinct` vs `count` and the strict-vs-inclusive boundaries.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff, countDistinct,\n" +
            "                                   sum as _sum, count as _count, max as _max)\n" +
            "\n" +
            "# 1) Rank each customer's orders by date (to find 1st and 2nd).\n" +
            "w = Window.partitionBy('customer_id').orderBy('order_date')\n" +
            "ranked = orders.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "# 2) One row per customer carrying every metric.\n" +
            "agg = (ranked.groupBy('customer_id').agg(\n" +
            "    _count('*').alias('total_orders'),\n" +
            "    _sum('amount').alias('total_spent'),\n" +
            "    countDistinct('product_id').alias('distinct_products'),\n" +
            "    _max(when(col('rn') == 1, col('order_date'))).alias('first_date'),\n" +
            "    _max(when(col('rn') == 2, col('order_date'))).alias('second_date')))\n" +
            "\n" +
            "# 3) Keep customers passing ALL four gates.\n" +
            "result = agg.filter(\n" +
            "    (col('total_orders') >= 3) &\n" +
            "    (col('total_spent') > 5000) &\n" +
            "    (col('distinct_products') >= 3) &\n" +
            "    (datediff(col('second_date'), col('first_date')) <= 14))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, row_number, when, datediff, countDistinct,\n" +
            "                                   sum as _sum, count as _count, max as _max)\n" +
            "\n" +
            "w = Window.partitionBy('customer_id').orderBy('order_date')\n" +
            "ranked = orders.withColumn('rn', row_number().over(w))\n" +
            "\n" +
            "agg = (ranked.groupBy('customer_id').agg(\n" +
            "    _count('*').alias('total_orders'),\n" +
            "    _sum('amount').alias('total_spent'),\n" +
            "    countDistinct('product_id').alias('distinct_products'),\n" +
            "    _max(when(col('rn') == 1, col('order_date'))).alias('first_date'),\n" +
            "    _max(when(col('rn') == 2, col('order_date'))).alias('second_date')))\n" +
            "\n" +
            "result = agg.filter(\n" +
            "    (col('total_orders') >= 3) &\n" +
            "    (col('total_spent') > 5000) &\n" +
            "    (col('distinct_products') >= 3) &\n" +
            "    (datediff(col('second_date'), col('first_date')) <= 14))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Two **wide** stages keyed by `customer_id`: the `row_number()` window (an `Exchange` + within-partition sort by `order_date`) and the `groupBy(...).agg(...)`. Catalyst can share the `customer_id` partitioning between them, so the aggregate may not need a second full shuffle. Within the aggregate, `count`/`sum`/`max` pre-aggregate map-side, but **`countDistinct('product_id')` cannot fully combine partially** — Spark must gather the distinct product set per customer, so it shuffles more and is the dominant cost of this plan (an approximate alternative is `approx_count_distinct`). The final `filter` is **narrow** and, because it runs on the collapsed one-row-per-customer result, is essentially free. Null `second_date` propagates through `datediff` to exclude never-repeated customers automatically. Skew on a whale customer is the usual watch-out.",
      sparkSql:
        "WITH ranked AS (\n" +
        "  SELECT customer_id, order_date, amount, product_id,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS rn\n" +
        "  FROM orders\n" +
        "),\n" +
        "agg AS (\n" +
        "  SELECT customer_id,\n" +
        "         COUNT(*) AS total_orders,\n" +
        "         SUM(amount) AS total_spent,\n" +
        "         COUNT(DISTINCT product_id) AS distinct_products,\n" +
        "         MAX(CASE WHEN rn = 1 THEN order_date END) AS first_date,\n" +
        "         MAX(CASE WHEN rn = 2 THEN order_date END) AS second_date\n" +
        "  FROM ranked\n" +
        "  GROUP BY customer_id\n" +
        ")\n" +
        "SELECT customer_id\n" +
        "FROM agg\n" +
        "WHERE total_orders >= 3\n" +
        "  AND total_spent > 5000\n" +
        "  AND distinct_products >= 3\n" +
        "  AND DATEDIFF(second_date, first_date) <= 14;",
      recognizeRecall: [
        "**Spot it:** 'customers who did A AND B AND C AND D', 'high-value fast-repeat buyers', multi-condition segmentation.",
        "**Say it:** aggregate every metric per customer (count, sum, `countDistinct`, first/second date via `max(when(rn==k,...))`), then one compound filter.",
        "**Trap:** countDistinct (not count) for variety and it is the costly metric; strict `>5000` vs inclusive `>=3`/`<=14`; null second date excludes non-repeaters."
      ]
    },

    // ------------------------------------------------------------------ Q160
    {
      id: "end-to-end-orders-pipeline",
      lc: 160,
      title: "End-to-end orders pipeline: clean, join, aggregate, rank",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Full ETL pipeline (clean -> join -> aggregate -> rank)", transformation: "Wide (shuffle)", functions: "filter, dropDuplicates, fillna, join, groupBy, agg, dense_rank" },
      description:
        "The capstone. From a raw `orders` DataFrame (`order_id`, `customer_id`, `product_id`, `order_date`, `quantity`, `price`) plus `customers` and `products` dimensions, build one coherent pipeline: filter invalid records, drop duplicate orders, handle nulls, join the dimensions, calculate revenue, compute customer-level aggregates, and rank customers by revenue. This is every technique in the tool composed into a single flow.",
      examples: [
        {
          input: "raw orders with some null/zero quantities, a duplicate order_id, and a couple of orphan customer_ids; customers(customer_id, name); products(product_id, category)",
          output: "One clean row per customer: (customer_id, name, total_orders, total_revenue, average_order_value, revenue_rank) with invalid/duplicate rows removed and revenue = quantity*price summed.",
          reasoning: "Each stage narrows or reshapes: filter drops invalid rows, dropDuplicates removes repeated orders, fillna handles nulls, the joins attach dimension attributes, revenue is derived per row, the aggregate collapses to per-customer metrics, and dense_rank orders customers by revenue."
        }
      ],
      approaches: [
        {
          name: "stage the pipeline: clean -> dedup -> nulls -> join -> revenue -> aggregate -> rank",
          whenToUse: "A realistic ETL task where raw data must be cleaned and conformed before any metric is trustworthy — the canonical interview 'walk me through a pipeline' question.",
          logic:
            "**What it asks.** A single, ordered pipeline that turns messy raw orders into a ranked per-customer revenue summary.\n\n" +
            "**Key Idea.** Sequence the stages so each one shrinks or conforms the data before the next, and push the cheap, reducing operations (filter, dedup) **before** the expensive shuffles (join, aggregate). Clean -> deduplicate -> handle nulls -> join dimensions -> derive revenue -> aggregate per customer -> rank globally.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. **Filter invalid records** (narrow, first — shrinks everything downstream): drop rows with null keys or non-positive quantity/price: `clean = orders.filter(col('customer_id').isNotNull() & (col('quantity') > 0) & (col('price') > 0))`.\n" +
            "2. **Drop duplicates**: `clean = clean.dropDuplicates(['order_id'])` (an order_id should appear once).\n" +
            "3. **Handle nulls** on non-key fields: `clean = clean.fillna({'quantity': 0, 'price': 0.0})` (or a domain default) for any residual nulls.\n" +
            "4. **Derive revenue** per row: `clean = clean.withColumn('revenue', col('quantity') * col('price'))`.\n" +
            "5. **Join dimensions** (reduce first, then join): `enriched = clean.join(broadcast(customers), 'customer_id', 'left').join(broadcast(products), 'product_id', 'left')` — broadcast the small dims.\n" +
            "6. **Aggregate per customer**: `agg = enriched.groupBy('customer_id', 'name').agg(_count('*').alias('total_orders'), _sum('revenue').alias('total_revenue'), _round(avg('revenue'), 2).alias('average_order_value'))`.\n" +
            "7. **Rank customers** globally by revenue: `w = Window.orderBy(col('total_revenue').desc())`, `result = agg.withColumn('revenue_rank', dense_rank().over(w))`.\n\n" +
            "**Why it works.** Each stage is a well-understood transformation, and the ordering is the point: filtering and de-duplicating first minimizes the bytes that hit the join and aggregate shuffles; broadcasting the small dimensions avoids shuffling the large fact; revenue is derived once at row grain so the aggregate simply sums it; ranking runs last on the already-collapsed per-customer rows.\n\n" +
            "**Common Gotchas.**\n" +
            "- Order matters: clean and dedup **before** joining/aggregating so the shuffles see the least data (and so duplicates do not inflate revenue).\n" +
            "- `dropDuplicates(['order_id'])` keeps an arbitrary row per id; if you need a specific one (e.g. latest), use a `row_number()` window and keep `rn == 1` instead.\n" +
            "- Choose join type deliberately: a **left** join from the fact keeps orders whose customer/product is missing from the dimension (they get null attributes) — an inner join would silently drop them.\n" +
            "- `broadcast()` the dimensions only if they are small enough to fit in executor memory.\n" +
            "- The final ranking window has no `partitionBy`, so it funnels to a single partition — fine at customer grain, but say so.\n\n" +
            "**Interview mindset.** Narrate the pipeline as an ordered story and justify the ordering by cost: 'reduce early, shuffle late, broadcast the small side, rank last'. That reasoning is what the capstone is really testing.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, broadcast, dense_rank, avg,\n" +
            "                                   sum as _sum, count as _count, round as _round)\n" +
            "\n" +
            "# 1) Filter invalid records (narrow, do it first to shrink everything).\n" +
            "clean = orders.filter(\n" +
            "    col('customer_id').isNotNull() &\n" +
            "    (col('quantity') > 0) &\n" +
            "    (col('price') > 0))\n" +
            "\n" +
            "# 2) Drop duplicate orders, 3) handle residual nulls.\n" +
            "clean = (clean\n" +
            "    .dropDuplicates(['order_id'])\n" +
            "    .fillna({'quantity': 0, 'price': 0.0}))\n" +
            "\n" +
            "# 4) Derive per-row revenue.\n" +
            "clean = clean.withColumn('revenue', col('quantity') * col('price'))\n" +
            "\n" +
            "# 5) Join the small dimensions (broadcast -> no shuffle of the fact).\n" +
            "enriched = (clean\n" +
            "    .join(broadcast(customers), 'customer_id', 'left')\n" +
            "    .join(broadcast(products), 'product_id', 'left'))\n" +
            "\n" +
            "# 6) Customer-level aggregates.\n" +
            "agg = (enriched\n" +
            "    .groupBy('customer_id', 'name')\n" +
            "    .agg(_count('*').alias('total_orders'),\n" +
            "         _sum('revenue').alias('total_revenue'),\n" +
            "         _round(avg('revenue'), 2).alias('average_order_value')))\n" +
            "\n" +
            "# 7) Rank customers globally by revenue.\n" +
            "w = Window.orderBy(col('total_revenue').desc())\n" +
            "result = agg.withColumn('revenue_rank', dense_rank().over(w))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, broadcast, dense_rank, avg,\n" +
            "                                   sum as _sum, count as _count, round as _round)\n" +
            "\n" +
            "clean = orders.filter(\n" +
            "    col('customer_id').isNotNull() &\n" +
            "    (col('quantity') > 0) &\n" +
            "    (col('price') > 0))\n" +
            "\n" +
            "clean = (clean\n" +
            "    .dropDuplicates(['order_id'])\n" +
            "    .fillna({'quantity': 0, 'price': 0.0}))\n" +
            "\n" +
            "clean = clean.withColumn('revenue', col('quantity') * col('price'))\n" +
            "\n" +
            "enriched = (clean\n" +
            "    .join(broadcast(customers), 'customer_id', 'left')\n" +
            "    .join(broadcast(products), 'product_id', 'left'))\n" +
            "\n" +
            "agg = (enriched\n" +
            "    .groupBy('customer_id', 'name')\n" +
            "    .agg(_count('*').alias('total_orders'),\n" +
            "         _sum('revenue').alias('total_revenue'),\n" +
            "         _round(avg('revenue'), 2).alias('average_order_value')))\n" +
            "\n" +
            "w = Window.orderBy(col('total_revenue').desc())\n" +
            "result = agg.withColumn('revenue_rank', dense_rank().over(w))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This pipeline mixes narrow and wide steps, and the whole art is ordering them so the wide ones see the least data. The `filter` and the `withColumn('revenue', ...)` are **narrow** (fused into the scan, filter pushed down to Parquet). `dropDuplicates(['order_id'])` is **wide** — it hash-partitions by `order_id` to find duplicates (an `Exchange`). The two dimension joins are made **narrow** by `broadcast()`: each small dim is shipped to every executor and probed locally, so the large fact is never shuffled for them. The `groupBy('customer_id','name').agg(...)` is a **wide** `Exchange` softened by map-side partials. The final `dense_rank()` over a **partitionBy-less** window funnels the per-customer rows to a **single partition** for the global sort — cheap here because the data is already reduced. Net shuffle count: one for the dedup, one for the aggregate, one for the ranking sort (the joins add none thanks to broadcasting). Reducing early (filter/dedup before join/aggregate) is what keeps every downstream `Exchange` small.",
      sparkSql:
        "WITH clean AS (\n" +
        "  SELECT DISTINCT order_id, customer_id, product_id, order_date, quantity, price\n" +
        "  FROM orders\n" +
        "  WHERE customer_id IS NOT NULL AND quantity > 0 AND price > 0\n" +
        "),\n" +
        "enriched AS (\n" +
        "  SELECT c.customer_id, cust.name, c.quantity * c.price AS revenue\n" +
        "  FROM clean c\n" +
        "  LEFT JOIN customers cust ON c.customer_id = cust.customer_id\n" +
        "  LEFT JOIN products prod ON c.product_id = prod.product_id\n" +
        "),\n" +
        "agg AS (\n" +
        "  SELECT customer_id, name,\n" +
        "         COUNT(*) AS total_orders,\n" +
        "         SUM(revenue) AS total_revenue,\n" +
        "         ROUND(AVG(revenue), 2) AS average_order_value\n" +
        "  FROM enriched\n" +
        "  GROUP BY customer_id, name\n" +
        ")\n" +
        "SELECT agg.*,\n" +
        "       DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank\n" +
        "FROM agg;",
      recognizeRecall: [
        "**Spot it:** 'build the full pipeline', 'clean then join then aggregate then rank', end-to-end ETL / 'walk me through it'.",
        "**Say it:** filter invalid -> dropDuplicates -> fillna -> derive revenue -> broadcast-join dims -> groupBy aggregate -> dense_rank; reduce early, shuffle late.",
        "**Trap:** clean/dedup before the join+aggregate; left join to keep orphans; broadcast only small dims; the final rank window is single-partition."
      ]
    }

  ]);
})();
