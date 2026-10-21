/*
 * PySpark Interview Lab — Diagnose Executor OOM from metrics (Hard)
 * Schema identical to data/pyspark/performance_optimization.js; registers into the
 * existing "Performance & Optimization" category. The concept cards cover Memory/
 * Spill/OOM in theory; this is the missing *diagnostic* practice item: read task,
 * partition and spill metrics, name the cause, apply the fix. The salted-aggregation
 * remediation was executed on Spark 3.5.3 and verified to match the naive totals.
 */
(function () {
  var CAT = "Performance & Optimization";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q318
    {
      id: "diagnose-executor-oom-metrics",
      lc: 318,
      title: "Diagnose executor OOM from task, partition and spill metrics",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "OOM root-cause from Spark UI metrics -> targeted fix", transformation: "Wide (skewed shuffle) + salted two-stage agg", functions: "Spark UI metrics, salt, repartition, approx, broadcast" },
      description:
        "An executor dies with <code>OutOfMemoryError</code> during a <code>groupBy</code> aggregation. From the Spark UI you see: most tasks finish in seconds reading ~128&nbsp;MB, but <b>one task</b> reads 9&nbsp;GB of shuffle, shows huge <b>spill (memory/disk)</b>, and then the executor OOMs. Diagnose the cause from these metrics and apply the fix &mdash; distinguishing a <b>spill</b> (survivable, slow) from a true <b>OOM</b> (something must be held in memory whole).",
      examples: [
        {
          input: "Stage metrics: 199 tasks ~2s / 128MB each; 1 task 9GB shuffle read, 40GB spill, then OOM. groupBy('customer_id').",
          output: "Diagnosis: data skew &mdash; one customer_id key has a giant share of rows, so its single reduce task can't fit/spill-merge in execution memory. Fix: salt the hot key into a two-stage aggregation (or enable AQE skew join/coalesce).",
          reasoning: "The symptom signature is one task far larger than the rest (uneven shuffle read) plus heavy spill then OOM. Spill means Spark tried to survive by going to disk; the OOM despite spill points to a single oversized key/partition whose working set can't be bounded. Salting splits that key across many tasks."
        }
      ],
      approaches: [
        {
          name: "read the metric signature, separate spill from OOM, then salt the skewed key into a two-stage agg",
          whenToUse: "A job OOMs or stalls on one straggler task during a shuffle-heavy groupBy/join, with the UI showing one partition far larger than the rest.",
          logic:
            "**What it asks.** Turn Spark UI numbers into a root cause and the right remedy, instead of blindly bumping executor memory.\n\n" +
            "**Key Idea.** Read the <b>metric signature</b>. Even task times and shuffle sizes + spill = healthy pressure (give more/smaller partitions or memory; it will complete). <b>One</b> task with huge shuffle read + large spill + then OOM = <b>skew</b>: a single key's partition is too big, and because an aggregation for one key must accumulate in one task, it can't be bounded by spilling. The fix is to <b>break the hot key</b>: add a random <code>salt</code> so one key becomes many sub-keys aggregated in parallel (stage 1), then re-aggregate the partials by the real key (stage 2). Distinguish the causes first: <b>spill</b> is Spark surviving by writing sorted runs to disk (slow, OK); <b>OOM</b> is something that must be held whole &mdash; a skewed key, a `collect()`/`toPandas()` to the driver, a too-large broadcast, a giant `explode`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In the UI, compare task max vs median for shuffle read / duration &mdash; a big ratio = skew.\n" +
            "2. Check spill (memory & disk) and whether the OOM is on an executor (skewed task) or the driver (`collect`).\n" +
            "3. If skew: salt &mdash; `withColumn('salt', (rand()*N).cast('int'))`, `groupBy(key, salt).agg(partial)`, then `groupBy(key).agg(combine(partial))`.\n" +
            "4. Prefer built-ins: enable <b>AQE skew handling</b> (`spark.sql.adaptive.enabled`, `skewJoin.enabled`) which splits skewed partitions automatically.\n" +
            "5. If driver OOM: remove the `collect()`/`toPandas()`; if broadcast OOM: drop/raise the broadcast threshold.\n" +
            "6. Re-run and confirm task sizes are even and spill is gone.\n\n" +
            "**Why it works.** Salting distributes one oversized key's rows across N partitions so no single reduce task holds the whole key's working set &mdash; the two-stage agg is algebraic (sum of partial sums = total sum), so the result is identical. AQE does the equivalent at the engine level by coalescing/splitting partitions from runtime statistics. Fixing the actual cause (skew, driver pull, broadcast) beats raising memory, which only delays the same OOM.\n\n" +
            "**Common Gotchas.**\n" +
            "- Only <b>algebraic</b> aggregates (sum, count, min, max, avg-as-sum/count) split cleanly across salt; holistic ones (exact median/distinct) need care &mdash; use approx variants.\n" +
            "- Raising `spark.executor.memory` treats the symptom; a skewed key will OOM again at a bigger scale.\n" +
            "- A driver OOM from `collect()`/`toPandas()` is not fixed by executor memory at all &mdash; different knob.\n" +
            "- Too many salt buckets create tiny tasks; size N to the skew, or just let AQE handle it.\n" +
            "- `spark.sql.shuffle.partitions` too low makes every partition large (spill everywhere) &mdash; that's uniform pressure, not skew.\n\n" +
            "**Interview mindset.** 'One fat task + spill + OOM = skew; salt the key into a two-stage algebraic agg or enable AQE skew handling. Spill is survivable, OOM means something can't be bounded &mdash; name which: skewed key, collect to driver, or oversized broadcast.'",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "# --- Diagnosis from the UI ---\n" +
            "# 199 tasks ~128MB / 2s, but 1 task 9GB shuffle + 40GB spill then OOM\n" +
            "#   -> classic DATA SKEW on the groupBy key (one hot customer_id).\n" +
            "\n" +
            "# --- Fix: salt the hot key into a two-stage aggregation ---\n" +
            "N = 16                                            # salt buckets ~ skew factor\n" +
            "salted = (df.withColumn('salt', (F.rand() * N).cast('int'))\n" +
            "            .groupBy('customer_id', 'salt')\n" +
            "            .agg(F.sum('amount').alias('partial')))   # stage 1: parallel partials\n" +
            "\n" +
            "result = (salted.groupBy('customer_id')\n" +
            "            .agg(F.sum('partial').alias('total')))     # stage 2: combine partials\n" +
            "\n" +
            "# Or let the engine do it (preferred when available):\n" +
            "#   spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
            "#   spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\n" +
            "# Driver OOM instead? remove collect()/toPandas(). Broadcast OOM? lower the threshold.",
          plain:
            "from pyspark.sql import functions as F\n" +
            "N = 16\n" +
            "salted = (df.withColumn('salt', (F.rand()*N).cast('int'))\n" +
            "            .groupBy('customer_id','salt').agg(F.sum('amount').alias('partial')))\n" +
            "result = salted.groupBy('customer_id').agg(F.sum('partial').alias('total'))"
        }
      ],
      sparkInternals:
        "Each executor JVM splits its heap into the <b>unified</b> region (<code>spark.memory.fraction</code>, execution + storage) and <b>user</b> memory. Execution-memory operations (sort, shuffle, aggregation) are <b>spill-capable</b>: when a task exceeds its share it writes sorted runs to local disk and merges them &mdash; slower but it completes, and the UI shows spill (memory) / spill (disk). An <b>OutOfMemoryError</b> happens when something cannot spill and must be held whole: a single skewed aggregation key whose rows all route to one reduce task, a <code>collect()</code>/<code>toPandas()</code> materializing the result on the driver, an oversized broadcast, or a giant <code>explode</code>. The metric tell for skew is one task's shuffle-read / duration far above the median. Salting rewrites the hot key as (key, salt) so its rows hash to N partitions; the two-stage agg is valid because the aggregate is <b>algebraic</b> (partial sums combine to the true sum). AQE achieves the same from runtime partition statistics by splitting skewed shuffle partitions and coalescing tiny ones, which is why enabling it often removes the straggler with no code change.",
      sparkSql:
        "-- two-stage salted aggregation (what AQE does automatically)\n" +
        "SELECT customer_id, SUM(partial) AS total FROM (\n" +
        "  SELECT customer_id, CAST(rand()*16 AS INT) AS salt, SUM(amount) AS partial\n" +
        "  FROM orders GROUP BY customer_id, CAST(rand()*16 AS INT)\n" +
        ") GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** 'one task huge / others tiny', 'big spill then OOM', 'straggler on a groupBy/join'.",
        "**Say it:** skew -> salt the hot key into a two-stage algebraic agg, or enable AQE skew handling.",
        "**Trap:** spill is survivable, OOM means can't-be-bounded; name it (skewed key / collect-to-driver / big broadcast); more memory just delays it.",
        "**Follow-up:** Why does salting break for an exact median? (It's holistic, not algebraic &mdash; partials don't combine; use approx_percentile.)",
        "**Follow-up:** Executor OOM vs driver OOM &mdash; how do the fixes differ? (Executor: skew/partitions/memory; driver: stop collect()/toPandas(), lower broadcast threshold.)"
      ]
    }

  ]);
})();
