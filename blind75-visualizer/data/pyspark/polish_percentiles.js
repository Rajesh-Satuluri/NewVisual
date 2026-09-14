/*
 * PySpark Interview Lab — P2 polish: more percentile/stats problems
 * (folded into "Aggregations & GroupBy").
 */
(function () {
  var CAT = "Aggregations & GroupBy";
  window.PYSPARK.register(CAT, [

    {
      id: "median-per-group-approx",
      lc: 305,
      title: "Median per group",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Percentile", transformation: "Wide (shuffle)", functions: "percentile_approx, expr" },
      description:
        "Compute the **median** `salary` per `department`. Use the scalable approach for large data.",
      examples: [
        { input: "eng: [100,120,140]; ops: [80,90]", output: "eng→120, ops→85", reasoning: "Median is the 0.5 quantile; percentile_approx computes it without a full sort/collect." }
      ],
      approaches: [
        {
          name: "percentile_approx(col, 0.5)",
          whenToUse: "Median/quantile per group at scale.",
          logic:
            "**What it asks.** The 50th percentile of salary within each department.\n\n" +
            "**Key Idea.** `percentile_approx(col, 0.5)` computes an approximate quantile in a single distributed pass — no global sort, no collect. Exact `percentile` exists but is far heavier at scale.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('department')`.\n" +
            "2. `agg(percentile_approx('salary', 0.5).alias('median'))`.\n" +
            "3. Tune accuracy with the optional 3rd arg if needed.\n\n" +
            "**Why it works.** It builds compact per-partition summaries and merges them, so cost scales with the summary, not the data.\n\n" +
            "**Common Gotchas.**\n" +
            "- It's approximate; raise the accuracy parameter for tighter results.\n" +
            "- A window-based median (row_number tricks) is far more expensive.\n\n" +
            "**Interview mindset.** 'percentile_approx for quantiles at scale' — mention approximate vs exact.",
          rcs:
            "from pyspark.sql.functions import percentile_approx\n" +
            "med = (emp.groupBy('department')\n" +
            "          .agg(percentile_approx('salary', 0.5).alias('median_salary')))\n" +
            "med.show()",
          plain:
            "from pyspark.sql.functions import percentile_approx\n" +
            "med = emp.groupBy('department').agg(percentile_approx('salary', 0.5).alias('median_salary'))"
        }
      ],
      sparkInternals:
        "percentile_approx uses a bounded-error quantile summary (GK-style) computed per partition and merged — a wide aggregate with a small state, so it scales. Exact percentile must effectively order all values per group, which is much costlier.",
      sparkSql:
        "SELECT department, percentile_approx(salary, 0.5) AS median_salary\nFROM emp GROUP BY department;",
      recognizeRecall: [
        "**Spot it:** \"median / 50th percentile per group\".",
        "**Say it:** percentile_approx(col, 0.5) in a groupBy.",
        "**Trap:** it's approximate; exact percentile is heavy at scale."
      ]
    },

    {
      id: "latency-percentiles-p90-p99",
      lc: 306,
      title: "P90 / P95 / P99 latency per endpoint",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Multi-percentile", transformation: "Wide (shuffle)", functions: "percentile_approx (array)" },
      description:
        "For each `endpoint`, compute the **P90, P95, and P99** of `latency_ms` in one aggregate.",
      examples: [
        { input: "endpoint /a with 1000 latencies", output: "/a → p90, p95, p99", reasoning: "percentile_approx accepts an array of quantiles, returning all three from one summary." }
      ],
      approaches: [
        {
          name: "percentile_approx with a quantile array",
          whenToUse: "Reporting multiple percentiles (SLO/latency dashboards).",
          logic:
            "**What it asks.** Three tail percentiles per endpoint together.\n\n" +
            "**Key Idea.** `percentile_approx(col, array(0.90, 0.95, 0.99))` returns an **array**; pass all quantiles at once so the summary is built a single time.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `groupBy('endpoint')`.\n" +
            "2. `agg(percentile_approx('latency_ms', array(lit(.9),lit(.95),lit(.99))).alias('p'))`.\n" +
            "3. Index `p[0]/p[1]/p[2]` into named columns.\n\n" +
            "**Why it works.** One quantile summary answers all three cutoffs — cheaper than three separate calls.\n\n" +
            "**Common Gotchas.**\n" +
            "- Passing the array beats three separate percentile_approx calls.\n" +
            "- Raise accuracy for the extreme tail (P99).\n\n" +
            "**Interview mindset.** 'Array of quantiles in one percentile_approx' for latency SLOs.",
          rcs:
            "from pyspark.sql.functions import percentile_approx, array, lit, col\n" +
            "lat = (req.groupBy('endpoint').agg(\n" +
            "        percentile_approx('latency_ms', array(lit(.90), lit(.95), lit(.99))).alias('p')))\n" +
            "lat = lat.select('endpoint', col('p')[0].alias('p90'),\n" +
            "                 col('p')[1].alias('p95'), col('p')[2].alias('p99'))",
          plain:
            "from pyspark.sql.functions import percentile_approx, array, lit, col\n" +
            "lat = req.groupBy('endpoint').agg(\n" +
            "        percentile_approx('latency_ms', array(lit(.90),lit(.95),lit(.99))).alias('p'))\n" +
            "lat = lat.select('endpoint', col('p')[0].alias('p90'), col('p')[1].alias('p95'), col('p')[2].alias('p99'))"
        }
      ],
      sparkInternals:
        "A single quantile summary per group answers a vector of cutoffs, so the array form does one pass where three scalar calls would build three summaries. The result array is then projected into columns — a narrow step.",
      sparkSql:
        "SELECT endpoint, percentile_approx(latency_ms, array(0.9,0.95,0.99)) AS p\nFROM req GROUP BY endpoint;",
      recognizeRecall: [
        "**Spot it:** \"P90/P95/P99 latency, tail metrics\".",
        "**Say it:** percentile_approx(col, array(...)) → index the result.",
        "**Trap:** pass the array once; bump accuracy for P99."
      ]
    },

    {
      id: "decile-buckets-ntile",
      lc: 307,
      title: "Assign customers to spend deciles",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Bucketing", transformation: "Window", functions: "ntile" },
      description:
        "Rank customers by `total_spend` and split them into **10 equal-sized buckets (deciles)**, 1 = lowest spenders, 10 = highest.",
      examples: [
        { input: "100 customers by spend", output: "each customer tagged decile 1..10 (~10 each)", reasoning: "ntile(10) over spend order divides ranked rows into 10 near-equal groups." }
      ],
      approaches: [
        {
          name: "ntile(10) over the spend ordering",
          whenToUse: "Equal-count buckets (deciles/quartiles), not equal-width.",
          logic:
            "**What it asks.** Equal-sized rank buckets by spend.\n\n" +
            "**Key Idea.** `ntile(n)` over an ordered window splits rows into `n` groups of (nearly) equal count — deciles = `ntile(10)`. This is equal-*count*, unlike a value-range bucket.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `w = Window.orderBy('total_spend')`.\n" +
            "2. `decile = ntile(10).over(w)`.\n" +
            "3. Optionally `partitionBy` a segment for per-segment deciles.\n\n" +
            "**Why it works.** ntile distributes ranked rows as evenly as possible across the buckets, remainder going to the earliest buckets.\n\n" +
            "**Common Gotchas.**\n" +
            "- No `partitionBy` = a single global window (all rows to one partition) — fine for modest data, risky at scale.\n" +
            "- For value ranges (0-100, 100-500) use a CASE/`bucketize`, not ntile.\n\n" +
            "**Interview mindset.** 'ntile = equal count; width-buckets = CASE/Bucketizer.'",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import ntile\n" +
            "w = Window.orderBy('total_spend')\n" +
            "deciled = cust.withColumn('decile', ntile(10).over(w))",
          plain:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import ntile\n" +
            "deciled = cust.withColumn('decile', ntile(10).over(Window.orderBy('total_spend')))"
        }
      ],
      sparkInternals:
        "ntile is a ranking window: it needs a total order, so a global (no-partition) ntile funnels all rows through one partition to assign contiguous bucket ids. Partition by a segment when you can, to parallelize and to get per-segment deciles.",
      sparkSql:
        "SELECT *, NTILE(10) OVER (ORDER BY total_spend) AS decile FROM cust;",
      recognizeRecall: [
        "**Spot it:** \"deciles/quartiles, equal-sized buckets by rank\".",
        "**Say it:** ntile(n) over the ordering.",
        "**Trap:** equal-count (ntile) vs equal-width (CASE); global window = 1 partition."
      ]
    }

  ]);
})();
