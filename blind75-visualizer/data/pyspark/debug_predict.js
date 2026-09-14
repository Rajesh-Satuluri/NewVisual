/*
 * PySpark Interview Lab — Debug & Predict Output (interview simulation)
 * Schema identical to DataFrame Basics. Each problem poses a snippet and asks
 * "what does this output?" or "what's the bug?" — the diagnostic muscle real
 * interviews test. The answer + reasoning live in approaches; the fix in the code.
 */
(function () {
  var CAT = "Debug & Predict Output";
  window.PYSPARK.register(CAT, [

    {
      id: "predict-partitions-after-shuffle",
      lc: 284,
      title: "Predict: partition count after a groupBy",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Predict output", transformation: "Read + Wide (shuffle)", functions: "getNumPartitions, groupBy" },
      description:
        "A 1 GB Parquet dataset is read and aggregated. **Predict the two printed partition counts.**\n\n```\ndf = spark.read.parquet('/data/sales')   # 1 GB, splittable\nprint(df.rdd.getNumPartitions())          # (A)\nagg = df.groupBy('country').count()\nprint(agg.rdd.getNumPartitions())         # (B)\n```",
      examples: [
        { input: "1 GB splittable Parquet, default configs", output: "(A) ≈ 8   (B) = 200", reasoning: "Read splits by ~128MB (1024/128≈8); groupBy shuffles to spark.sql.shuffle.partitions (default 200)." }
      ],
      approaches: [
        {
          name: "Read partitions vs shuffle partitions",
          whenToUse: "Any 'how many partitions?' question.",
          logic:
            "**What it asks.** The partition count right after the read, and again after a wide transform.\n\n" +
            "**Key Idea.** Two different knobs: the *read* splits by `spark.sql.files.maxPartitionBytes` (128 MB), the *shuffle* uses `spark.sql.shuffle.partitions` (200).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. (A) 1 GB / 128 MB ≈ **8** read partitions (splittable Parquet).\n" +
            "2. (B) `groupBy` is wide → an Exchange repartitions to **200**.\n\n" +
            "**Why it works.** Read parallelism tracks block/file size; post-shuffle parallelism tracks the shuffle config, independent of the input.\n\n" +
            "**Common Gotchas.**\n" +
            "- People assume it stays ~8; the shuffle resets it to 200.\n" +
            "- With AQE on, 200 may be coalesced down at runtime.\n\n" +
            "**Interview mindset.** Say the two numbers and name both configs.",
          rcs:
            "df = spark.read.parquet('/data/sales')\n" +
            "print(df.rdd.getNumPartitions())          # ~8  (1GB / 128MB maxPartitionBytes)\n" +
            "agg = df.groupBy('country').count()\n" +
            "print(agg.rdd.getNumPartitions())         # 200 (spark.sql.shuffle.partitions)\n" +
            "# AQE (spark.sql.adaptive.enabled) may coalesce the 200 at runtime.",
          plain:
            "df = spark.read.parquet('/data/sales')\n" +
            "df.rdd.getNumPartitions()                 # ~8\n" +
            "df.groupBy('country').count().rdd.getNumPartitions()   # 200"
        }
      ],
      sparkInternals:
        "The read planner packs file splits up to `maxPartitionBytes` (128 MB), so a 1 GB splittable file is ~8 partitions. The first wide op inserts an `Exchange hashpartitioning(country, 200)` — 200 is `spark.sql.shuffle.partitions`. These two partition counts have nothing to do with each other; confusing them is a classic tell.",
      sparkSql:
        "-- Execution question, not SQL. The SQL equivalent (GROUP BY country)\n-- would also shuffle to 200 post-shuffle partitions under the same config.",
      recognizeRecall: [
        "**Spot it:** \"how many partitions after…\".",
        "**Say it:** read = size/128MB; post-shuffle = 200 (shuffle.partitions).",
        "**Trap:** the shuffle resets partition count; it doesn't carry over from the read."
      ]
    },

    {
      id: "predict-sum-ignores-nulls",
      lc: 285,
      title: "Predict: sum with all-null values",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Predict output", transformation: "Wide (shuffle)", functions: "groupBy, sum, coalesce" },
      description:
        "**Predict the output** for customer `c3`, whose only order has a null amount.\n\n```\n# orders: (c1,100),(c1,50),(c2,90),(c3,null)\norders.groupBy('customer_id').agg(sum('amount').alias('total')).show()\n```",
      examples: [
        { input: "(c1,100),(c1,50),(c2,90),(c3,null)", output: "c1→150, c2→90, c3→null", reasoning: "sum ignores nulls; a group with only nulls yields null, not 0." }
      ],
      approaches: [
        {
          name: "Null-aware aggregation",
          whenToUse: "Any aggregate over nullable columns.",
          logic:
            "**What it asks.** What `sum` returns when every value in a group is null.\n\n" +
            "**Key Idea.** SQL/Spark aggregates **skip nulls**; a group of only nulls sums to **null**, not 0.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. c1: 100+50 = 150. c2: 90. c3: only null → null.\n" +
            "2. If you want 0, wrap with `coalesce(sum(...), lit(0))`.\n\n" +
            "**Why it works.** `sum` accumulates non-null values; with none, the result is null by definition.\n\n" +
            "**Common Gotchas.**\n" +
            "- `count('amount')` for c3 is 0, but `sum` is null — different null semantics.\n" +
            "- `avg` also ignores nulls (denominator excludes them).\n\n" +
            "**Interview mindset.** State the null-skipping rule and the `coalesce`-to-zero fix.",
          rcs:
            "from pyspark.sql.functions import sum as _sum, coalesce, lit\n" +
            "orders.groupBy('customer_id').agg(\n" +
            "    coalesce(_sum('amount'), lit(0)).alias('total')   # null group -> 0\n" +
            ").show()",
          plain:
            "from pyspark.sql.functions import sum as _sum, coalesce, lit\n" +
            "orders.groupBy('customer_id').agg(coalesce(_sum('amount'), lit(0)).alias('total')).show()"
        }
      ],
      sparkInternals:
        "Aggregate functions are null-skipping by the SQL standard: `sum`/`avg`/`max` fold over non-null inputs. An all-null group produces null because there is nothing to fold. This is per-group, computed after the shuffle in the final aggregate.",
      sparkSql:
        "SELECT customer_id, COALESCE(SUM(amount), 0) AS total\nFROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"what does sum return when all values are null?\".",
        "**Say it:** aggregates skip nulls → all-null group = null; coalesce to 0.",
        "**Trap:** null ≠ 0; count(col)=0 but sum=null for the same group."
      ]
    },

    {
      id: "bug-dataframe-immutable",
      lc: 286,
      title: "Bug: withColumn without reassignment",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Spot the bug", transformation: "Narrow", functions: "withColumn, immutability" },
      description:
        "The new column never appears. **Find the bug.**\n\n```\ndf = spark.read.parquet('/data/orders')\ndf.withColumn('tax', col('amount') * 0.1)\ndf.select('order_id', 'tax').show()   # AnalysisException: cannot resolve 'tax'\n```",
      examples: [
        { input: "any orders DataFrame", output: "AnalysisException: cannot resolve 'tax'", reasoning: "DataFrames are immutable; withColumn returns a NEW df that was discarded." }
      ],
      approaches: [
        {
          name: "Reassign the result",
          whenToUse: "Every transformation — they return new DataFrames.",
          logic:
            "**What it asks.** Why `tax` doesn't exist despite calling `withColumn`.\n\n" +
            "**Key Idea.** DataFrames are **immutable**. `withColumn` returns a *new* DataFrame; the original `df` is unchanged. The result was thrown away.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Capture the return: `df = df.withColumn('tax', ...)`.\n" +
            "2. Or chain directly into the `select`.\n\n" +
            "**Why it works.** Reassigning `df` points the name at the new plan that includes `tax`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Same trap with `filter`, `drop`, `withColumnRenamed` — all return new DataFrames.\n" +
            "- There is no in-place mutation in Spark.\n\n" +
            "**Interview mindset.** \"DataFrames are immutable\" is the one-line answer.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "df = df.withColumn('tax', col('amount') * 0.1)   # reassign!\n" +
            "df.select('order_id', 'tax').show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "df = df.withColumn('tax', col('amount') * 0.1)\n" +
            "df.select('order_id', 'tax').show()"
        }
      ],
      sparkInternals:
        "Each transformation appends a node to the logical plan and returns a new DataFrame wrapping it; the parent plan is never mutated. Immutability is what lets Spark build and optimize a plan safely — but it means an unassigned transformation is a no-op.",
      sparkSql:
        "-- Not a SQL bug; it's the DataFrame immutability model.\n-- Equivalent intent: SELECT order_id, amount*0.1 AS tax FROM orders;",
      recognizeRecall: [
        "**Spot it:** \"my new column/filter didn't take effect\".",
        "**Say it:** DataFrames are immutable; transforms return a new df — reassign it.",
        "**Trap:** withColumn/filter/drop don't mutate in place."
      ]
    },

    {
      id: "bug-join-fanout-duplicates",
      lc: 287,
      title: "Bug: join inflates the row count",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Spot the bug", transformation: "Wide (shuffle)", functions: "join, fan-out" },
      description:
        "After joining orders to a `customers` lookup, `SUM(amount)` is suddenly too high. **Explain why and fix it.**\n\n```\n# customers has DUPLICATE rows per customer_id (dirty dimension)\norders.join(customers, 'customer_id').agg(sum('amount')).show()  # inflated!\n```",
      examples: [
        { input: "1 order (amount 100); customers has customer_id twice", output: "SUM = 200, not 100", reasoning: "The inner join fans out — the order row matches both customer rows, duplicating amount." }
      ],
      approaches: [
        {
          name: "De-duplicate the dimension before joining",
          whenToUse: "Joining to a lookup that may have duplicate keys.",
          logic:
            "**What it asks.** Why totals inflate after a join.\n\n" +
            "**Key Idea.** A join is a **many-to-many match**. If the right side has duplicate keys, each left row matches multiple right rows — **row fan-out** — double-counting the measure.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Confirm: `customers.groupBy('customer_id').count().filter('count > 1')`.\n" +
            "2. De-dup the dimension to one row per key before the join.\n" +
            "3. Then aggregate.\n\n" +
            "**Why it works.** A unique right key makes the join one-to-one on that key, so no measure is duplicated.\n\n" +
            "**Common Gotchas.**\n" +
            "- The bug is silent — no error, just wrong numbers.\n" +
            "- Aggregate *before* the join if you only need the measure.\n\n" +
            "**Interview mindset.** Name 'fan-out from a non-unique join key' — the go-to explanation for inflated aggregates.",
          rcs:
            "from pyspark.sql.functions import sum as _sum\n" +
            "dim = customers.dropDuplicates(['customer_id'])   # one row per key\n" +
            "orders.join(dim, 'customer_id').agg(_sum('amount')).show()",
          plain:
            "from pyspark.sql.functions import sum as _sum\n" +
            "dim = customers.dropDuplicates(['customer_id'])\n" +
            "orders.join(dim, 'customer_id').agg(_sum('amount')).show()"
        }
      ],
      sparkInternals:
        "The join operator emits one output row per matching (left, right) pair. A duplicated right key multiplies matching left rows before any aggregate runs, so the shuffle-side sum sees inflated input. De-duplicating (or pre-aggregating) the dimension restores a 1:N relationship.",
      sparkSql:
        "SELECT SUM(o.amount)\nFROM orders o\nJOIN (SELECT DISTINCT customer_id, ... FROM customers) c\n  ON o.customer_id = c.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"totals doubled/inflated after a join\".",
        "**Say it:** non-unique join key → fan-out → double-counted measures.",
        "**Trap:** silent bug; dropDuplicates the dimension or pre-aggregate."
      ]
    },

    {
      id: "bug-broadcast-too-large",
      lc: 288,
      title: "Bug: broadcasting a table that isn't small",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Spot the bug", transformation: "Join", functions: "broadcast, autoBroadcastJoinThreshold" },
      description:
        "Someone wraps a 4 GB table in `F.broadcast` to 'speed up' a join and executors start dying. **Explain and fix.**\n\n```\nbig_fact.join(F.broadcast(four_gb_table), 'key')   # executors OOM\n```",
      examples: [
        { input: "four_gb_table wrapped in broadcast", output: "Executor OutOfMemoryError (or the hint is ignored)", reasoning: "A broadcast copies the whole table into every executor's heap; 4 GB per executor OOMs." }
      ],
      approaches: [
        {
          name: "Only broadcast genuinely small sides",
          whenToUse: "Join tuning; deciding broadcast vs sort-merge.",
          logic:
            "**What it asks.** Why forcing a broadcast of a large table fails.\n\n" +
            "**Key Idea.** Broadcast join ships the *entire* small side to **every executor's memory**. That only works when it's small (default auto threshold `spark.sql.autoBroadcastJoinThreshold` = 10 MB). Force-broadcasting 4 GB copies 4 GB per executor → OOM.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Drop the `broadcast` hint; let it be a sort-merge join (both sides shuffle, can spill, survives).\n" +
            "2. Or shrink the side (select only join key + needed cols; filter) until it truly is small.\n\n" +
            "**Why it works.** Sort-merge join distributes both sides across the cluster instead of replicating one whole.\n\n" +
            "**Common Gotchas.**\n" +
            "- Above ~8 GB Spark may silently ignore the hint anyway.\n" +
            "- Verify with `explain()`: BroadcastHashJoin vs SortMergeJoin.\n\n" +
            "**Interview mindset.** 'Broadcast copies the whole side to every executor — only for small dims.'",
          rcs:
            "# Let it sort-merge (both sides shuffle, can spill):\n" +
            "big_fact.join(four_gb_table, 'key')\n" +
            "# Only broadcast when the side is genuinely small:\n" +
            "big_fact.join(F.broadcast(small_dim.select('key','name')), 'key')",
          plain:
            "big_fact.join(four_gb_table, 'key')\n" +
            "# or: big_fact.join(F.broadcast(small_dim.select('key','name')), 'key')"
        }
      ],
      sparkInternals:
        "A BroadcastHashJoin builds a hash table of the small side on the driver and ships it to every executor via a BroadcastExchange, where it lives in the executor heap. Memory cost is O(table) per executor — fine at 10 MB, fatal at 4 GB. Sort-merge join instead shuffles both sides by key and can spill, so it scales to large-large joins.",
      sparkSql:
        "-- Hint syntax: SELECT /*+ BROADCAST(small_dim) */ ...\n-- Only apply to a genuinely small side.",
      recognizeRecall: [
        "**Spot it:** \"executor OOM right after a broadcast join\".",
        "**Say it:** broadcast copies whole side to every executor; only for small (~10MB) dims.",
        "**Trap:** forcing broadcast on a big table OOMs; use sort-merge instead."
      ]
    },

    {
      id: "predict-count-star-vs-col",
      lc: 289,
      title: "Predict: count(*) vs count(col) vs countDistinct",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Predict output", transformation: "Wide (shuffle)", functions: "count, countDistinct" },
      description:
        "**Predict all three outputs.** The `email` column has one null and one duplicate.\n\n```\n# users emails: ['a@x', 'a@x', null, 'b@x']\ndf.select(count('*'), count('email'), countDistinct('email')).show()\n```",
      examples: [
        { input: "['a@x','a@x',null,'b@x']", output: "count(*)=4, count(email)=3, countDistinct(email)=2", reasoning: "count(*) counts rows; count(col) skips nulls; countDistinct skips nulls AND dupes." }
      ],
      approaches: [
        {
          name: "Three counting semantics",
          whenToUse: "Any counting question with nulls/duplicates.",
          logic:
            "**What it asks.** How the three count variants treat nulls and duplicates.\n\n" +
            "**Key Idea.** `count('*')` counts **rows**; `count(col)` counts **non-null** values; `countDistinct(col)` counts **distinct non-null** values.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Rows = 4 → count(*) = 4.\n" +
            "2. Non-null emails = a@x, a@x, b@x → count(email) = 3.\n" +
            "3. Distinct non-null = a@x, b@x → countDistinct = 2.\n\n" +
            "**Why it works.** Each variant applies a different filter (none / not-null / not-null+distinct) before counting.\n\n" +
            "**Common Gotchas.**\n" +
            "- `countDistinct` is a wide, relatively expensive op; use `approx_count_distinct` on huge data.\n\n" +
            "**Interview mindset.** Recite the three rules in one breath.",
          rcs:
            "from pyspark.sql.functions import count, countDistinct\n" +
            "df.select(\n" +
            "    count('*').alias('rows'),           # 4\n" +
            "    count('email').alias('non_null'),   # 3\n" +
            "    countDistinct('email').alias('uniq')# 2\n" +
            ").show()",
          plain:
            "from pyspark.sql.functions import count, countDistinct\n" +
            "df.select(count('*'), count('email'), countDistinct('email')).show()"
        }
      ],
      sparkInternals:
        "All three lower to a HashAggregate. count(*) needs no column; count(col) increments only on non-null; countDistinct must track distinct values (an extra distinct/aggregate step), which is why it's pricier and why approx_count_distinct (HyperLogLog) exists for scale.",
      sparkSql:
        "SELECT COUNT(*), COUNT(email), COUNT(DISTINCT email) FROM users;",
      recognizeRecall: [
        "**Spot it:** \"count(*) vs count(col) difference\".",
        "**Say it:** rows / non-null / distinct-non-null.",
        "**Trap:** count(col) skips nulls; countDistinct is expensive → approx on big data."
      ]
    },

    {
      id: "bug-python-udf-no-pushdown",
      lc: 290,
      title: "Bug: a Python UDF makes the read slow",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Spot the bug", transformation: "Narrow (UDF)", functions: "udf, predicate pushdown" },
      description:
        "A filter that 'should' push down reads the whole table. **Why, and what does explain() show?**\n\n```\n@udf('boolean')\ndef keep(s): return s == 'OK'\ndf.filter(keep(col('status'))).explain()   # no PushedFilters; slow\n```",
      examples: [
        { input: "df.filter(keep(col('status')))", output: "explain shows BatchEvalPython + FileScan with NO PushedFilters (full scan)", reasoning: "A Python UDF is opaque to Catalyst, so the filter can't push into the scan." }
      ],
      approaches: [
        {
          name: "Replace the UDF with a built-in expression",
          whenToUse: "Any filter/derivation currently done via a Python UDF.",
          logic:
            "**What it asks.** Why a UDF-based filter can't push down.\n\n" +
            "**Key Idea.** Catalyst can't see inside a **Python UDF** — it's an opaque `BatchEvalPython` wall. Predicate pushdown and column pruning stop at it, so every row is read and serialized to a Python worker.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Rewrite with built-in `F.*`: `df.filter(col('status') == 'OK')`.\n" +
            "2. `explain()` now shows `PushedFilters: [EqualTo(status,OK)]`.\n\n" +
            "**Why it works.** Built-in expressions are transparent to Catalyst, so the predicate is pushed into the scan and rows are dropped at the source.\n\n" +
            "**Common Gotchas.**\n" +
            "- If you truly need custom logic, a vectorized `pandas_udf` is faster than a row UDF (but still no pushdown).\n\n" +
            "**Interview mindset.** 'UDFs block pushdown; prefer F.* built-ins' — verify in explain().",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "df.filter(col('status') == 'OK').explain()\n" +
            "# FileScan ... PushedFilters: [EqualTo(status,OK)]  -> rows dropped at scan",
          plain:
            "from pyspark.sql.functions import col\n" +
            "df.filter(col('status') == 'OK')"
        }
      ],
      sparkInternals:
        "A Python UDF runs in a separate Python process; the JVM serializes each row out and back (`BatchEvalPython`/`ArrowEvalPython`). Because Catalyst can't reason about its logic, it won't move a filter below it or prune columns around it — the scan reads everything. Built-in `F.*` functions compile into the plan (and whole-stage codegen), enabling pushdown.",
      sparkSql:
        "SELECT * FROM t WHERE status = 'OK';   -- built-in predicate pushes down",
      recognizeRecall: [
        "**Spot it:** \"filter is slow / explain shows no PushedFilters\".",
        "**Say it:** Python UDF = opaque BatchEvalPython wall, blocks pushdown.",
        "**Trap:** rewrite with F.* built-ins; UDFs also serialize row-by-row."
      ]
    },

    {
      id: "predict-window-frame-default",
      lc: 291,
      title: "Predict: window running sum with ties",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Predict output", transformation: "Window", functions: "Window, sum, rowsBetween, rangeBetween" },
      description:
        "A running total over a column with **tied order keys** surprises people. **Predict the running total for the two rows tied at day=2.**\n\n```\nw = Window.orderBy('day')   # no explicit frame\ndf.withColumn('rt', sum('amt').over(w)).show()\n# rows: (day1,10),(day2,20),(day2,30),(day3,5)\n```",
      examples: [
        { input: "(d1,10),(d2,20),(d2,30),(d3,5)", output: "d1→10, d2→60, d2→60, d3→65", reasoning: "With orderBy and no frame, the default is RANGE unboundedPreceding→currentRow; tied rows share one cumulative value (both d2 = 10+20+30 = 60)." }
      ],
      approaches: [
        {
          name: "RANGE (default) vs ROWS frame",
          whenToUse: "Running totals / moving windows where ties can occur.",
          logic:
            "**What it asks.** How tied order keys behave in a default-framed window.\n\n" +
            "**Key Idea.** An ordered window with **no explicit frame** defaults to `RANGE BETWEEN unboundedPreceding AND currentRow`. RANGE includes **all rows with the same order value**, so tied rows get the *same* cumulative sum.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. d1: 10. Both d2 rows: 10+20+30 = **60** each (RANGE ties share). d3: 65.\n" +
            "2. Want per-row accumulation instead? Use `.rowsBetween(Window.unboundedPreceding, Window.currentRow)` → d2 rows become 30 and 60.\n\n" +
            "**Why it works.** RANGE frames by *value*; ROWS frames by *physical row position*.\n\n" +
            "**Common Gotchas.**\n" +
            "- The RANGE-vs-ROWS difference only shows up on ties — easy to miss in testing.\n\n" +
            "**Interview mindset.** State the default frame and the ROWS fix explicitly.",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import sum as _sum\n" +
            "# per-row running total (not tie-shared):\n" +
            "w = Window.orderBy('day').rowsBetween(Window.unboundedPreceding, Window.currentRow)\n" +
            "df.withColumn('rt', _sum('amt').over(w)).show()",
          plain:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import sum as _sum\n" +
            "w = Window.orderBy('day').rowsBetween(Window.unboundedPreceding, Window.currentRow)\n" +
            "df.withColumn('rt', _sum('amt').over(w)).show()"
        }
      ],
      sparkInternals:
        "An ordered window with no frame clause defaults to RANGE unboundedPreceding→currentRow. RANGE treats peer rows (equal ORDER BY value) as one boundary, so ties receive an identical aggregate. ROWS counts physical rows, giving distinct running values on ties. Also note: a window with no partitionBy funnels all rows to one partition — fine for a demo, dangerous at scale.",
      sparkSql:
        "SELECT *, SUM(amt) OVER (ORDER BY day\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rt\nFROM t;",
      recognizeRecall: [
        "**Spot it:** \"running total looks wrong on tied dates\".",
        "**Say it:** default frame = RANGE unboundedPreceding→currentRow; ties share.",
        "**Trap:** use rowsBetween for per-row accumulation; add partitionBy at scale."
      ]
    },

    {
      id: "bug-collect-driver-oom",
      lc: 292,
      title: "Bug: collect() to loop over rows",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Spot the bug", transformation: "Action", functions: "collect, driver OOM" },
      description:
        "This works on samples and OOMs the driver in production. **Explain and fix.**\n\n```\nfor row in huge_df.collect():        # pulls ALL rows to the driver\n    process(row)\n```",
      examples: [
        { input: "huge_df with 500M rows", output: "Driver java.lang.OutOfMemoryError", reasoning: "collect() materializes every row in the single driver JVM, which can't spill." }
      ],
      approaches: [
        {
          name: "Stay distributed; never collect big results",
          whenToUse: "Any per-row processing over a large DataFrame.",
          logic:
            "**What it asks.** Why a `collect()` loop OOMs at scale.\n\n" +
            "**Key Idea.** `collect()` moves **every row into the driver's heap**, which cannot spill. Small results are fine; large ones kill the driver regardless of executor memory.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Express the work as DataFrame transforms so it runs on executors.\n" +
            "2. If you must go row-wise, use `foreach`/`mapPartitions` (runs on executors) or write out and read back.\n" +
            "3. For a peek, use `take(n)`/`show(n)`, never `collect()`.\n\n" +
            "**Why it works.** Executor-side processing scales with the cluster; only tiny results should reach the driver.\n\n" +
            "**Common Gotchas.**\n" +
            "- `toPandas()` is the same trap.\n\n" +
            "**Interview mindset.** 'collect pulls everything to the driver — keep it distributed.'",
          rcs:
            "# Do the work as transformations (runs on executors):\n" +
            "result = huge_df.withColumn('out', process_expr(col('x')))\n" +
            "result.write.parquet('/out')\n" +
            "# Or executor-side row work without materializing on the driver:\n" +
            "huge_df.foreach(lambda row: side_effect(row))",
          plain:
            "result = huge_df.withColumn('out', process_expr(col('x')))\n" +
            "result.write.parquet('/out')"
        }
      ],
      sparkInternals:
        "`collect()` triggers a job whose results are sent from every executor to the driver and assembled in the driver JVM heap — no spill, no backpressure. It's O(result) driver memory. `foreach`/`mapPartitions` run the closure on executors; `take(n)` returns from only as many partitions as needed.",
      sparkSql:
        "-- Not SQL: it's a driver-memory anti-pattern. Prefer set-based transforms\n-- and write() over pulling rows to the driver.",
      recognizeRecall: [
        "**Spot it:** \"driver OOM after collect()/toPandas()\".",
        "**Say it:** collect pulls all rows to the driver heap (no spill).",
        "**Trap:** use transforms + write, foreach/mapPartitions, or take(n)."
      ]
    },

    {
      id: "predict-cache-lazy",
      lc: 293,
      title: "Predict: does cache() do anything here?",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Predict output", transformation: "Caching", functions: "cache, persist, lazy eval" },
      description:
        "**Predict:** how many times is the expensive read+filter computed?\n\n```\ndf = spark.read.parquet('/big').filter(col('ok'))\ndf.cache()          # (no action yet)\nprint(df.count())   # action 1\nprint(df.count())   # action 2\n```",
      examples: [
        { input: "cache() then two counts", output: "Computed twice for action 1 region? No — once to fill cache (action 1), then served from cache (action 2)", reasoning: "cache() is lazy: the first action materializes AND caches; the second reads from cache." }
      ],
      approaches: [
        {
          name: "cache is lazy — the first action fills it",
          whenToUse: "Reusing a DataFrame across multiple actions.",
          logic:
            "**What it asks.** When caching actually saves work.\n\n" +
            "**Key Idea.** `cache()`/`persist()` are **lazy** — they mark the DataFrame but compute nothing. The **first action** computes it *and* stores the blocks; **subsequent actions** read from cache.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `cache()` alone: no computation.\n" +
            "2. count #1: reads+filters `/big`, populates cache.\n" +
            "3. count #2: served from cache (no re-read).\n\n" +
            "**Why it works.** Caching pays off only with **≥2 actions**; one action = pure overhead.\n\n" +
            "**Common Gotchas.**\n" +
            "- If you cache and use it once, you wasted memory.\n" +
            "- A wide transform before the count still shuffles on the first action.\n\n" +
            "**Interview mindset.** 'cache is lazy; first action materializes; only reuse justifies it.'",
          rcs:
            "df = spark.read.parquet('/big').filter(col('ok'))\n" +
            "df.cache()\n" +
            "df.count()   # computes + caches\n" +
            "df.count()   # from cache (fast)\n" +
            "# df.unpersist() when done to free memory",
          plain:
            "df = spark.read.parquet('/big').filter(col('ok'))\n" +
            "df.cache()\n" +
            "df.count(); df.count()"
        }
      ],
      sparkInternals:
        "`cache()` sets the storage level (MEMORY_AND_DISK for DataFrames) and marks the plan for caching, but it's lazy — the CacheManager fills blocks during the first action's job. Later actions hit the cached blocks instead of recomputing. Caching a DataFrame used only once adds cost with no benefit; always pair with reuse and `unpersist()` when done.",
      sparkSql:
        "-- CACHE TABLE t;  (eagerly caches in SQL, unlike df.cache() which is lazy)\n-- Note the difference: SQL CACHE TABLE is eager; DataFrame .cache() is lazy.",
      recognizeRecall: [
        "**Spot it:** \"does cache() help / when does it compute?\".",
        "**Say it:** cache is lazy; first action fills it, later actions reuse.",
        "**Trap:** caching for a single action is wasted; unpersist when done."
      ]
    }

  ]);
})();
