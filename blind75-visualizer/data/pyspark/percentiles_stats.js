/*
 * PySpark Interview Lab — Percentiles & Distribution Stats (Aggregations & GroupBy)
 * Median, p90/p95, quartiles and outliers — the statistics interviewers ask for
 * beyond sum/avg. Registers into the "Aggregations & GroupBy" category.
 */
(function () {
  var CAT = "Aggregations & GroupBy";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q260
    {
      id: "median-order-amount-per-customer",
      lc: 260,
      title: "Median order amount per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + percentile", transformation: "Wide (shuffle)", functions: "groupBy, agg, percentile_approx" },
      description:
        "Given `orders` (`order_id`, `customer_id`, `order_amount`, `order_date`), compute the **median** order amount per customer.\n\n" +
        "The median (the 50th percentile) is the middle value — half the customer's orders are below it, half above. Unlike `avg`, it is not dragged around by a single huge or tiny order, so it is the honest \"typical order\" number interviewers ask for. Use `F.percentile_approx(col, 0.5)` inside `agg` (available as a `functions` API in Spark 3.1+).",
      examples: [
        {
          input: "orders: (1,c1,100),(2,c1,200),(3,c1,900),(4,c2,50)",
          output: "c1 → 200, c2 → 50",
          reasoning: "c1's sorted amounts are 100,200,900 → the middle value is 200 (avg would be 400, skewed by the 900). c2 has one order, so its median is 50."
        }
      ],
      approaches: [
        {
          name: "groupBy + percentile_approx(col, 0.5)",
          whenToUse: "A robust 'typical value' per key at scale; the default choice for median over big data.",
          logic:
            "**What it asks.** One row per customer holding the middle order amount (the 50th percentile).\n\n" +
            "**Key Idea.** `orders.groupBy('customer_id').agg(F.percentile_approx('order_amount', 0.5).alias('median_amount'))` — group by key, then ask each group for its 0.5 quantile.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')` so every customer's orders form one group.\n" +
            "2. Call `F.percentile_approx('order_amount', 0.5)` inside `.agg(...)`.\n" +
            "3. `.alias('median_amount')` so the column is readable, not `percentile_approx(...)`.\n" +
            "4. Optionally pass a third accuracy argument (default 10000) to trade memory for precision.\n\n" +
            "**Why it works.** `percentile_approx` builds a bounded-memory Greenwald-Khanna sketch of each group's distribution, then reads the value at the requested rank. It is a wide aggregation, but the sketch is tiny, so far less data crosses the network than a full sort would move.\n\n" +
            "**Common Gotchas.**\n" +
            "- It returns an *approximate* percentile; for an exact median use `F.expr(\"percentile(order_amount, 0.5)\")` (slower — see Q262).\n" +
            "- Nulls in `order_amount` are ignored, so the median is over non-null orders only.\n" +
            "- The quantile must be a Python float in [0,1]; `0.5`, not `50`.\n\n" +
            "**Interview mindset.** Say median = 50th percentile, explain it resists outliers where `avg` does not, and name `percentile_approx` (3.1+) as the scalable tool with a tunable accuracy knob.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')                                   # one group per customer\n" +
            "    .agg(F.percentile_approx('order_amount', 0.5)             # 0.5 = median (50th pct)\n" +
            "          .alias('median_amount')))                          # readable column name\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(F.percentile_approx('order_amount', 0.5).alias('median_amount')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`percentile_approx` is a wide aggregation: rows must be shuffled by `customer_id` so a whole group can be summarized together. But it does not sort the raw data — each partition builds a compact Greenwald-Khanna sketch (bounded memory, default accuracy 10000), those sketches merge across the shuffle, and the requested rank is read off the merged sketch. This keeps memory flat regardless of group size and moves only the sketches over the network. The trade-off is that the result is approximate within an error bound set by the accuracy argument. An exact `percentile` (Q262) instead needs the full ordered data and is markedly more expensive.",
      sparkSql:
        "SELECT customer_id,\n" +
        "       percentile_approx(order_amount, 0.5) AS median_amount\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"median\", \"typical\", \"middle value per …\", \"robust to outliers\".",
        "**Say it:** `groupBy(key).agg(F.percentile_approx(col, 0.5))` — median is the 0.5 quantile.",
        "**Trap:** it's approximate (use `percentile` for exact); quantile is a float in [0,1], and nulls are ignored."
      ]
    },

    // ------------------------------------------------------------------ Q261
    {
      id: "p90-p95-latency-per-service",
      lc: 261,
      title: "p90 and p95 request latency per service",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + percentile array", transformation: "Wide (shuffle)", functions: "groupBy, agg, percentile_approx" },
      description:
        "Given `requests` (`request_id`, `service`, `latency_ms`), compute the **p90 and p95 latency** per service.\n\n" +
        "Tail latency is what users feel: p95 = 950ms means 5% of requests are slower than 950ms. Averages hide this. Pass `F.percentile_approx('latency_ms', [0.9, 0.95])` an **array** of quantiles to get both in a single pass, returning an array `[p90, p95]` you can index or explode into columns.",
      examples: [
        {
          input: "requests: 100 rows for service 'api' with latencies 10..1000ms",
          output: "api → p90 ≈ 900, p95 ≈ 950 (returned as [900, 950])",
          reasoning: "90% of api requests finished under ~900ms and 95% under ~950ms; one array call yields both tail markers."
        }
      ],
      approaches: [
        {
          name: "percentile_approx with an array of quantiles",
          whenToUse: "You need several percentiles for the same column and want to compute them in one scan/sketch.",
          logic:
            "**What it asks.** Per service, the latency thresholds below which 90% and 95% of requests fall.\n\n" +
            "**Key Idea.** `requests.groupBy('service').agg(F.percentile_approx('latency_ms', [0.9, 0.95]).alias('p'))` returns an array; then read `p[0]` (p90) and `p[1]` (p95).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('service')`.\n" +
            "2. In `.agg(...)`, pass `F.percentile_approx('latency_ms', [0.9, 0.95])` — a list of quantiles.\n" +
            "3. `.alias('p')` the resulting array column.\n" +
            "4. Split it: `.withColumn('p90', F.col('p')[0]).withColumn('p95', F.col('p')[1])`.\n\n" +
            "**Why it works.** With an array of quantiles, one Greenwald-Khanna sketch is built per group and read at both ranks — cheaper than two separate `percentile_approx` calls that would each build their own sketch.\n\n" +
            "**Common Gotchas.**\n" +
            "- With an array argument the result is an **array**, not a scalar — index it or you'll show `[900, 950]` in one cell.\n" +
            "- Keep quantiles ordered and in [0,1]; passing `90` instead of `0.9` errors.\n" +
            "- Tail percentiles are the whole point — don't report `avg(latency_ms)` and call it p95.\n\n" +
            "**Interview mindset.** Lead with 'tail latency, not average', then show the single array call yielding p90 and p95 together and mention the accuracy knob for tighter tails.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (requests\n" +
            "    .groupBy('service')                                          # per service\n" +
            "    .agg(F.percentile_approx('latency_ms', [0.9, 0.95])          # array of quantiles\n" +
            "          .alias('p'))                                           # p = [p90, p95]\n" +
            "    .withColumn('p90', F.col('p')[0])                            # index 0 -> p90\n" +
            "    .withColumn('p95', F.col('p')[1]))                           # index 1 -> p95\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (requests\n" +
            "    .groupBy('service')\n" +
            "    .agg(F.percentile_approx('latency_ms', [0.9, 0.95]).alias('p'))\n" +
            "    .withColumn('p90', F.col('p')[0])\n" +
            "    .withColumn('p95', F.col('p')[1]))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Like all percentile work this is a wide aggregation: `latency_ms` values shuffle by `service` so each service is summarized as a unit. Passing an array of quantiles is the efficient path — one bounded-memory Greenwald-Khanna sketch per group is built and probed at every requested rank, versus building a fresh sketch per separate call. The sketches merge across the shuffle and the ranks are read off the merged result, so memory stays flat and only sketches travel the network. Tail quantiles (p95, p99) sit where the sketch is sparsest, so if the tail needs to be tight, raise the accuracy argument to shrink the error bound at the cost of more memory.",
      sparkSql:
        "SELECT service,\n" +
        "       percentile_approx(latency_ms, array(0.9, 0.95)) AS p\n" +
        "FROM requests GROUP BY service;",
      recognizeRecall: [
        "**Spot it:** \"p90 / p95 / p99\", \"tail latency\", \"SLA percentile per …\".",
        "**Say it:** `agg(F.percentile_approx(col, [0.9, 0.95]))` returns an array; index `[0]`, `[1]`.",
        "**Trap:** array arg → array result (index it); quantiles are floats in [0,1]; avg ≠ p95."
      ]
    },

    // ------------------------------------------------------------------ Q262
    {
      id: "exact-vs-approx-percentile",
      lc: 262,
      title: "Exact vs approximate percentile",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + percentile (exact vs approx)", transformation: "Wide (shuffle)", functions: "expr(percentile), percentile_approx" },
      description:
        "Given `orders` (`order_id`, `customer_id`, `order_amount`, `order_date`), compute the median **two ways** and explain the trade-off:\n\n" +
        "- **Exact:** `F.expr(\"percentile(order_amount, 0.5)\")` — sorts the full data to find the true rank.\n" +
        "- **Approximate:** `F.percentile_approx('order_amount', 0.5)` — reads a bounded-memory sketch, with an optional third **accuracy** argument.\n\n" +
        "`percentile` gives the exact answer but pays a full sort/shuffle; `percentile_approx` is far cheaper and, with a higher accuracy value, arbitrarily close. Knowing when each is worth it is the interview point.",
      examples: [
        {
          input: "orders: c1 amounts 100,200,900",
          output: "exact_median = 200; approx_median = 200 (approx may differ on large/skewed data unless accuracy is raised)",
          reasoning: "On small data both agree. At scale, `percentile` is exact but expensive; `percentile_approx` is fast and within an error bound set by the accuracy argument (default 10000)."
        }
      ],
      approaches: [
        {
          name: "expr(percentile) vs percentile_approx(col, q, accuracy)",
          whenToUse: "Exact `percentile` when correctness is contractual and data is small/moderate; `percentile_approx` for dashboards and big data.",
          logic:
            "**What it asks.** The same median computed exactly and approximately, with the cost/accuracy trade-off named.\n\n" +
            "**Key Idea.** Exact: `F.expr(\"percentile(order_amount, 0.5)\")` orders every value and reads the true rank. Approx: `F.percentile_approx('order_amount', 0.5, 100000)` reads a sketch; the third arg (accuracy) trades memory for a tighter error bound.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('customer_id')`.\n" +
            "2. Add the exact aggregate `F.expr(\"percentile(order_amount, 0.5)\").alias('exact_median')`.\n" +
            "3. Add the approx aggregate `F.percentile_approx('order_amount', 0.5).alias('approx_median')`.\n" +
            "4. To tighten the approximation, pass accuracy: `F.percentile_approx('order_amount', 0.5, 100000)`.\n\n" +
            "**Why it works.** `percentile` must fully order the data to locate an exact rank, so it moves and sorts everything — accurate but heavy. `percentile_approx` summarizes each group with a Greenwald-Khanna sketch whose worst-case error is roughly `1/accuracy`; larger accuracy → smaller error, more memory, still no full sort.\n\n" +
            "**Common Gotchas.**\n" +
            "- `percentile` is a SQL function only — reach it through `F.expr(...)`, there is no `F.percentile(...)` DataFrame helper.\n" +
            "- Higher accuracy is not free — it costs memory per group; don't crank it blindly.\n" +
            "- `percentile_approx` as a `functions` API needs Spark 3.1+; before that, use `F.expr(\"percentile_approx(...)\")`.\n\n" +
            "**Interview mindset.** Frame it as exact-but-expensive vs approximate-but-scalable, then mention the accuracy argument as the dial that closes the gap when the error matters.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(\n" +
            "        F.expr('percentile(order_amount, 0.5)')                  # exact: full sort, true rank\n" +
            "          .alias('exact_median'),\n" +
            "        F.percentile_approx('order_amount', 0.5)                 # approx: sketch, default accuracy 10000\n" +
            "          .alias('approx_median'),\n" +
            "        F.percentile_approx('order_amount', 0.5, 100000)         # accuracy arg -> tighter, more memory\n" +
            "          .alias('approx_tight')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (orders\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(\n" +
            "        F.expr('percentile(order_amount, 0.5)').alias('exact_median'),\n" +
            "        F.percentile_approx('order_amount', 0.5).alias('approx_median'),\n" +
            "        F.percentile_approx('order_amount', 0.5, 100000).alias('approx_tight')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Both are wide, but they cost very differently. `percentile` (exact) has to fully order each group's values to locate the true rank, so it drives a heavy sort and shuffle that scales poorly as groups grow. `percentile_approx` instead builds a bounded-memory Greenwald-Khanna sketch per partition, merges the sketches across the shuffle, and reads the rank off the merge — no full sort, memory independent of group size. Its worst-case rank error is about `1/accuracy` (default 10000, so ~0.01%), and raising the accuracy argument shrinks that error at the cost of proportionally more memory per group. The rule of thumb: reach for `percentile_approx` by default, and only pay for exact `percentile` when the data is small or the answer is contractual.",
      sparkSql:
        "SELECT customer_id,\n" +
        "       percentile(order_amount, 0.5)              AS exact_median,\n" +
        "       percentile_approx(order_amount, 0.5)       AS approx_median,\n" +
        "       percentile_approx(order_amount, 0.5, 100000) AS approx_tight\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"exact percentile\", \"how accurate\", \"why is percentile slow\", \"accuracy argument\".",
        "**Say it:** exact `F.expr('percentile(x,0.5)')` sorts everything; `percentile_approx(x,0.5,accuracy)` uses a sketch, error ≈ 1/accuracy.",
        "**Trap:** no `F.percentile` helper (use `F.expr`); higher accuracy costs memory; approx API is 3.1+."
      ]
    },

    // ------------------------------------------------------------------ Q263
    {
      id: "quartiles-iqr-per-group",
      lc: 263,
      title: "Quartiles (p25, p50, p75) and IQR per group",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + percentile array", transformation: "Wide (shuffle)", functions: "groupBy, agg, percentile_approx" },
      description:
        "Given `employees` (`employee_id`, `department_id`, `salary`), compute the **quartiles** — p25 (Q1), p50 (median), p75 (Q3) — and the **interquartile range** `IQR = p75 - p25` per department.\n\n" +
        "Quartiles summarize a distribution's shape in one row; the IQR measures spread using the middle 50% of values, so it ignores extreme tails and is the basis of Tukey outlier fences (Q264). Compute all three quantiles at once with `F.percentile_approx('salary', [0.25, 0.5, 0.75])`.",
      examples: [
        {
          input: "employees dept 10 salaries: 40,50,60,70,80 (k)",
          output: "dept 10 → p25=50, p50=60, p75=70, IQR=20",
          reasoning: "Q1=50, median=60, Q3=70; IQR = 70 - 50 = 20 describes the spread of the central half."
        }
      ],
      approaches: [
        {
          name: "percentile_approx([0.25,0.5,0.75]) then subtract",
          whenToUse: "A compact five-number-style summary or a precursor to outlier fences.",
          logic:
            "**What it asks.** Per department, the three quartile salaries and the width of the middle 50%.\n\n" +
            "**Key Idea.** One array call `F.percentile_approx('salary', [0.25, 0.5, 0.75])` returns `[q1, median, q3]`; split it and compute `IQR = q3 - q1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('department_id')`.\n" +
            "2. `.agg(F.percentile_approx('salary', [0.25, 0.5, 0.75]).alias('q'))`.\n" +
            "3. Pull out `p25 = F.col('q')[0]`, `p50 = F.col('q')[1]`, `p75 = F.col('q')[2]`.\n" +
            "4. `.withColumn('iqr', F.col('p75') - F.col('p25'))`.\n\n" +
            "**Why it works.** All three ranks come from a single Greenwald-Khanna sketch per group, so the quartiles are mutually consistent and cheap; IQR is then a plain subtraction of two columns.\n\n" +
            "**Common Gotchas.**\n" +
            "- List the quantiles in order and index the result array to match — mixing up `[0]`/`[2]` silently swaps Q1 and Q3.\n" +
            "- IQR is `p75 - p25`, not `max - min` (that's the full range and is outlier-sensitive).\n" +
            "- These are approximate; on small groups the quartiles can look 'off' versus a hand calculation.\n\n" +
            "**Interview mindset.** Describe quartiles as the distribution's shape and IQR as robust spread, then show one array call feeding both the columns and the subtraction.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department_id')                                     # per department\n" +
            "    .agg(F.percentile_approx('salary', [0.25, 0.5, 0.75])         # q = [Q1, median, Q3]\n" +
            "          .alias('q'))\n" +
            "    .withColumn('p25', F.col('q')[0])                             # Q1\n" +
            "    .withColumn('p50', F.col('q')[1])                             # median\n" +
            "    .withColumn('p75', F.col('q')[2])                             # Q3\n" +
            "    .withColumn('iqr', F.col('p75') - F.col('p25')))              # spread of middle 50%\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department_id')\n" +
            "    .agg(F.percentile_approx('salary', [0.25, 0.5, 0.75]).alias('q'))\n" +
            "    .withColumn('p25', F.col('q')[0])\n" +
            "    .withColumn('p50', F.col('q')[1])\n" +
            "    .withColumn('p75', F.col('q')[2])\n" +
            "    .withColumn('iqr', F.col('p75') - F.col('p25')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This is a wide aggregation: salaries shuffle by `department_id` so each department is summarized as a whole. Requesting the quartiles as one array means a single bounded-memory Greenwald-Khanna sketch per group is built and probed at ranks 0.25, 0.5 and 0.75, which is both cheaper and internally consistent versus three separate percentile calls. The sketches merge across the shuffle and the ranks are read off the merge, so memory stays flat regardless of department size. The IQR is a cheap post-aggregation subtraction of two already-computed columns and adds no extra shuffle.",
      sparkSql:
        "SELECT department_id,\n" +
        "       percentile_approx(salary, 0.25) AS p25,\n" +
        "       percentile_approx(salary, 0.5)  AS p50,\n" +
        "       percentile_approx(salary, 0.75) AS p75,\n" +
        "       percentile_approx(salary, 0.75) - percentile_approx(salary, 0.25) AS iqr\n" +
        "FROM employees GROUP BY department_id;",
      recognizeRecall: [
        "**Spot it:** \"quartiles\", \"Q1/Q3\", \"IQR\", \"spread of the middle 50%\", \"five-number summary\".",
        "**Say it:** `agg(F.percentile_approx(col, [0.25,0.5,0.75]))`, index it, `IQR = p75 - p25`.",
        "**Trap:** IQR ≠ max-min; keep quantile order aligned with array indices; results are approximate."
      ]
    },

    // ------------------------------------------------------------------ Q264
    {
      id: "outlier-detection-tukey-fences",
      lc: 264,
      title: "Outlier detection with Tukey (1.5*IQR) fences",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "GroupBy fences + join back + flag", transformation: "Wide (shuffle + join)", functions: "percentile_approx, join, when" },
      description:
        "Given `employees` (`employee_id`, `department_id`, `salary`), **flag salary outliers within each department** using Tukey fences: a value is an outlier if it falls below `Q1 - 1.5*IQR` (lower fence) or above `Q3 + 1.5*IQR` (upper fence), where `IQR = Q3 - Q1`.\n\n" +
        "This is a two-stage job: (1) aggregate per-department fences, then (2) **join** those fences back onto every employee row and compare each salary to its own department's fences with `F.when`. Fences are computed per group, so an outlier is relative to that department, not the company.",
      examples: [
        {
          input: "dept 10 salaries: 40,50,55,60,300 → Q1=50, Q3=60, IQR=10; upper fence=60+15=75",
          output: "the 300 row is flagged is_outlier=true; 40,50,55,60 are within [35, 75]",
          reasoning: "300 > upper fence 75, so it's a Tukey outlier for dept 10; the rest sit inside the fences and are not flagged."
        }
      ],
      approaches: [
        {
          name: "per-group fences → join back → when flag",
          whenToUse: "Row-level outlier flags where the threshold is group-relative (per department, per service, ...).",
          logic:
            "**What it asks.** Keep every employee row but add a boolean saying whether that salary is a Tukey outlier for its department.\n\n" +
            "**Key Idea.** Build a small `fences` DataFrame (`department_id`, `lower`, `upper`) with `percentile_approx`, then `join` it back to `employees` on `department_id` and flag with `F.when(salary < lower OR salary > upper, True)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Aggregate: `employees.groupBy('department_id').agg(F.percentile_approx('salary', [0.25, 0.75]).alias('q'))`.\n" +
            "2. Derive fences: `q1 = q[0]`, `q3 = q[1]`, `iqr = q3 - q1`, `lower = q1 - 1.5*iqr`, `upper = q3 + 1.5*iqr`.\n" +
            "3. `join` the fences (department_id, lower, upper) back onto `employees` on `department_id`.\n" +
            "4. Flag: `.withColumn('is_outlier', F.when((F.col('salary') < F.col('lower')) | (F.col('salary') > F.col('upper')), True).otherwise(False))`.\n\n" +
            "**Why it works.** Fences depend on group statistics, so they must be computed once per department, then broadcast back to each row. The join is the mechanism that carries a group-level number down to row level; `when` does the per-row comparison. Because `fences` is tiny (one row per department), Spark can broadcast it and skip a big shuffle join.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `|` (bitwise OR on Column) with parentheses around each comparison — `<`/`>` bind looser than `|`, so missing parens misparse.\n" +
            "- Fences are per department; don't compute one company-wide fence and apply it to all groups.\n" +
            "- `broadcast(fences)` the small side to avoid a full shuffle join; without it Spark may shuffle both sides.\n" +
            "- 1.5 is the standard Tukey multiplier; 3.0 marks 'far' outliers — keep it a parameter.\n\n" +
            "**Interview mindset.** Name the two stages out loud — aggregate fences, then join-back-and-flag — and mention broadcasting the small fences DataFrame as the performance move.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "fences = (employees\n" +
            "    .groupBy('department_id')\n" +
            "    .agg(F.percentile_approx('salary', [0.25, 0.75]).alias('q'))     # q = [Q1, Q3]\n" +
            "    .withColumn('q1', F.col('q')[0])\n" +
            "    .withColumn('q3', F.col('q')[1])\n" +
            "    .withColumn('iqr', F.col('q3') - F.col('q1'))                     # spread of middle 50%\n" +
            "    .withColumn('lower', F.col('q1') - 1.5 * F.col('iqr'))            # Tukey lower fence\n" +
            "    .withColumn('upper', F.col('q3') + 1.5 * F.col('iqr'))            # Tukey upper fence\n" +
            "    .select('department_id', 'lower', 'upper'))\n" +
            "\n" +
            "result = (employees\n" +
            "    .join(F.broadcast(fences), 'department_id', 'left')              # carry fences to each row\n" +
            "    .withColumn('is_outlier',\n" +
            "        F.when((F.col('salary') < F.col('lower')) |                  # below lower fence\n" +
            "               (F.col('salary') > F.col('upper')), True)            # above upper fence\n" +
            "         .otherwise(False)))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "fences = (employees\n" +
            "    .groupBy('department_id')\n" +
            "    .agg(F.percentile_approx('salary', [0.25, 0.75]).alias('q'))\n" +
            "    .withColumn('q1', F.col('q')[0])\n" +
            "    .withColumn('q3', F.col('q')[1])\n" +
            "    .withColumn('iqr', F.col('q3') - F.col('q1'))\n" +
            "    .withColumn('lower', F.col('q1') - 1.5 * F.col('iqr'))\n" +
            "    .withColumn('upper', F.col('q3') + 1.5 * F.col('iqr'))\n" +
            "    .select('department_id', 'lower', 'upper'))\n" +
            "\n" +
            "result = (employees\n" +
            "    .join(F.broadcast(fences), 'department_id', 'left')\n" +
            "    .withColumn('is_outlier',\n" +
            "        F.when((F.col('salary') < F.col('lower')) |\n" +
            "               (F.col('salary') > F.col('upper')), True)\n" +
            "         .otherwise(False)))\n" +
            "result.show()",
        }
      ],
      sparkInternals:
        "This is two wide stages. First, `percentile_approx` shuffles salaries by `department_id` and reads Q1/Q3 off a bounded-memory Greenwald-Khanna sketch per group — the fences fall out as cheap column arithmetic afterward. Second, those per-department fences must be carried back to every employee row, which is a join: since the fences DataFrame is one row per department (tiny), wrapping it in `F.broadcast(...)` ships it to every executor and turns the join into a broadcast hash join, avoiding a second full shuffle of the large `employees` side. The final `when` comparison is a narrow, row-local operation. So the real costs are the percentile shuffle and, if you forget to broadcast, an unnecessary shuffle join.",
      sparkSql:
        "WITH fences AS (\n" +
        "  SELECT department_id,\n" +
        "         percentile_approx(salary, 0.25) AS q1,\n" +
        "         percentile_approx(salary, 0.75) AS q3\n" +
        "  FROM employees GROUP BY department_id\n" +
        ")\n" +
        "SELECT e.employee_id, e.department_id, e.salary,\n" +
        "       (e.salary < f.q1 - 1.5*(f.q3-f.q1) OR\n" +
        "        e.salary > f.q3 + 1.5*(f.q3-f.q1)) AS is_outlier\n" +
        "FROM employees e JOIN fences f USING (department_id);",
      recognizeRecall: [
        "**Spot it:** \"flag outliers\", \"1.5*IQR\", \"Tukey fences\", \"anomalies per group\", \"beyond upper/lower bound\".",
        "**Say it:** aggregate per-group Q1/Q3 → fences `Q1-1.5*IQR` / `Q3+1.5*IQR` → broadcast-join back → `when` flag.",
        "**Trap:** parenthesize each comparison around `|`; fences are per group; broadcast the small fences side."
      ]
    },

    // ------------------------------------------------------------------ Q265
    {
      id: "stddev-coefficient-of-variation-per-group",
      lc: 265,
      title: "Standard deviation and coefficient of variation per group",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "GroupBy + dispersion", transformation: "Wide (shuffle)", functions: "groupBy, agg, stddev, stddev_samp, avg" },
      description:
        "Given `employees` (`employee_id`, `department_id`, `salary`), compute per department the **standard deviation** of salary and the **coefficient of variation** `CV = stddev / avg`.\n\n" +
        "Standard deviation measures absolute spread in the same units as the data; CV normalizes that spread by the mean so you can compare volatility across departments with very different pay scales. Use `F.stddev` (sample std, same as `F.stddev_samp`) and `F.avg`, then divide.",
      examples: [
        {
          input: "dept 10 salaries: 50,50,50 ; dept 20 salaries: 20,60,100 (k)",
          output: "dept 10 → stddev=0, cv=0 ; dept 20 → stddev=40, avg=60, cv≈0.67",
          reasoning: "Dept 10 pay is identical (no spread). Dept 20 varies widely; CV≈0.67 says the spread is about 67% of the mean, comparable across pay scales."
        }
      ],
      approaches: [
        {
          name: "groupBy + stddev / avg",
          whenToUse: "Quantifying and comparing dispersion or volatility across groups.",
          logic:
            "**What it asks.** Per department, absolute spread (stddev) and relative spread (CV = stddev/avg).\n\n" +
            "**Key Idea.** `employees.groupBy('department_id').agg(F.stddev('salary').alias('sd'), F.avg('salary').alias('mean'))`, then `cv = sd / mean`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('department_id')`.\n" +
            "2. In `.agg(...)` compute both `F.stddev('salary').alias('sd')` and `F.avg('salary').alias('mean')`.\n" +
            "3. `.withColumn('cv', F.col('sd') / F.col('mean'))`.\n" +
            "4. Optionally guard against a zero mean with `F.when(F.col('mean') != 0, F.col('sd')/F.col('mean'))`.\n\n" +
            "**Why it works.** `stddev`/`avg` are algebraic aggregates — Spark accumulates running counts and sums of `x` and `x^2` per partition (map-side), shuffles only those small partials by key, and finishes the formula. CV is then a cheap post-aggregation division of two columns.\n\n" +
            "**Common Gotchas.**\n" +
            "- `F.stddev` is the **sample** std (`stddev_samp`, dividing by n-1); use `F.stddev_pop` if you truly want the population std (divide by n).\n" +
            "- Sample stddev is `null` for a single-row group (n-1 = 0) — handle it if groups can be size 1.\n" +
            "- CV is undefined when the mean is 0 (and misleading when the mean is negative); guard the division.\n" +
            "- Nulls are ignored by both, so stddev and avg are over non-null salaries.\n\n" +
            "**Interview mindset.** Distinguish absolute vs relative spread, call out sample-vs-population stddev, and note these are map-side pre-aggregated so they scale like `sum`/`count`.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department_id')                              # per department\n" +
            "    .agg(F.stddev('salary').alias('sd'),                   # sample std (= stddev_samp)\n" +
            "         F.avg('salary').alias('mean'))                    # group mean\n" +
            "    .withColumn('cv',\n" +
            "        F.when(F.col('mean') != 0,                         # guard divide-by-zero\n" +
            "               F.col('sd') / F.col('mean'))))              # relative spread\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (employees\n" +
            "    .groupBy('department_id')\n" +
            "    .agg(F.stddev('salary').alias('sd'),\n" +
            "         F.avg('salary').alias('mean'))\n" +
            "    .withColumn('cv',\n" +
            "        F.when(F.col('mean') != 0, F.col('sd') / F.col('mean'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`stddev` and `avg` are algebraic (distributive) aggregates, so this scales like `sum`/`count` despite being a wide operation. Each partition maintains small running accumulators — count, sum of `x`, and sum of `x^2` — as a map-side partial, then only those partials shuffle by `department_id` and the driver-side reduce assembles the final mean and variance. That means the network moves one partial per (group, partition), not the raw salaries, keeping it far lighter than percentile work which needs a distribution sketch. `F.stddev` is `stddev_samp` (n-1 denominator, `null` for single-row groups); `stddev_pop` uses n. The coefficient of variation is a trivial post-aggregation division and adds no shuffle.",
      sparkSql:
        "SELECT department_id,\n" +
        "       stddev_samp(salary) AS sd,\n" +
        "       avg(salary)         AS mean,\n" +
        "       stddev_samp(salary) / NULLIF(avg(salary), 0) AS cv\n" +
        "FROM employees GROUP BY department_id;",
      recognizeRecall: [
        "**Spot it:** \"standard deviation\", \"volatility\", \"coefficient of variation\", \"how spread out / consistent per …\".",
        "**Say it:** `agg(F.stddev(col), F.avg(col))` then `cv = sd/mean`; stddev/avg are map-side pre-aggregated.",
        "**Trap:** `F.stddev` is sample (null for n=1; use `stddev_pop` for population); guard CV against mean 0."
      ]
    }

  ]);
})();
