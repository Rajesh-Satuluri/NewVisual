/*
 * data/pyspark/concepts_shuffle.js — PySpark "Learn" exemplar topic.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Spark execution semantics; teaching structure mirrors the Python lab.
 */
window.LEARN.register("spark", "Transformations", [
  {
    id: "narrow-vs-wide-shuffle",
    title: "Narrow vs Wide (Shuffle)",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Whether a transformation shuffles data across the cluster is the #1 thing that decides how fast your Spark job runs.",

    whatIsIt: [
      "Spark splits a DataFrame into <b>partitions</b> spread across executors. A <b>narrow</b> transformation lets each output partition be computed from a <b>single</b> input partition — no data crosses the network. <code>select</code>, <code>filter</code>, <code>withColumn</code>, and <code>map</code> are narrow.",
      "A <b>wide</b> transformation needs rows from <b>many</b> input partitions to land together — so Spark performs a <b>shuffle</b>: it writes intermediate files, moves them across the network, and re-reads them. <code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>, and <code>repartition</code> are wide.",
      "A shuffle is a <b>stage boundary</b>. Spark builds its plan lazily and only runs it when an <b>action</b> (<code>show</code>, <code>count</code>, <code>write</code>) fires — so the count of shuffles in your plan, not the number of lines of code, predicts the runtime."
    ],

    showMe: {
      code:
        "# NARROW — each partition handled independently, no network movement\n" +
        "df2 = (df.filter(F.col('amount') > 0)     # narrow\n" +
        "         .withColumn('tax', F.col('amount') * 0.1))  # narrow\n" +
        "\n" +
        "# WIDE — groupBy forces a shuffle: matching keys must meet on one executor\n" +
        "agg = df2.groupBy('country').agg(F.sum('amount').alias('total'))  # SHUFFLE\n" +
        "\n" +
        "# Inspect the plan: every 'Exchange' is a shuffle / stage boundary\n" +
        "agg.explain()\n" +
        "# == Physical Plan ==\n" +
        "# *HashAggregate(keys=[country])          <- partial agg (narrow, pre-shuffle)\n" +
        "# +- Exchange hashpartitioning(country)   <- THE SHUFFLE\n" +
        "#    +- *HashAggregate(keys=[country])\n" +
        "#       +- *Filter (amount > 0)",
      caption:
        "filter/withColumn stay on their own partition (narrow). groupBy inserts an Exchange — the shuffle — where rows with the same country are moved together. Read explain() and count the Exchanges."
    },

    whyMatters:
      "<p>Shuffles dominate the cost of almost every real Spark job: they hit disk, serialize data, and move it across the network — often 10–100× the cost of a narrow step. Interview questions and production tuning both come back to the same instinct: <b>which of my operations shuffle, and can I do fewer / cheaper shuffles?</b></p>" +
      "<p>The highest-value moves that follow directly from this concept:</p>" +
      "<ul>" +
      "<li><b>Filter early, project narrow columns early</b> — shrink the data <i>before</i> it hits a shuffle.</li>" +
      "<li><b>Broadcast the small side of a join</b> (<code>F.broadcast(dim)</code>) so the big side never shuffles at all.</li>" +
      "<li><b>Avoid needless <code>repartition</code> / <code>distinct</code> / <code>orderBy</code></b>; each is a full shuffle.</li>" +
      "</ul>",

    recognize: [
      { q: "\"Why is my job slow / spilling / stuck on one stage?\"", think: "Look for shuffles — call explain() and count the Exchange nodes; a slow stage usually sits right after one." },
      { q: "\"I'm joining a huge fact table to a small lookup table.\"", think: "Broadcast the small side: big_df.join(F.broadcast(small_df), 'key') — no shuffle of the big table." },
      { q: "\"One task runs forever while the rest finish.\"", think: "Data skew — one shuffle key holds most rows (salt the key, or enable AQE skew join)." },
      { q: "\"Do I actually need this step?\"", think: "distinct, orderBy, groupBy, repartition all shuffle. Drop or combine them where the result doesn't need global ordering/uniqueness." }
    ],

    matchTags: ["shuffle", "narrow", "wide", "partition", "repartition", "groupby", "aggregation",
                "join", "broadcast", "skew", "performance", "optimization", "exchange", "coalesce"],

    traps: [
      {
        bad: "big.join(small, 'id')            # both sides shuffle by id",
        good: "big.join(F.broadcast(small), 'id')  # small side broadcast, big side stays put",
        why: "A default (sort-merge) join shuffles BOTH sides on the join key. If one side fits in memory, broadcasting it eliminates the big table's shuffle entirely."
      },
      {
        bad: "df.repartition(200).filter(...)   # shuffle, THEN throw rows away",
        good: "df.filter(...).repartition(200)   # shrink first; repartition less data",
        why: "Order matters. Repartitioning before filtering shuffles rows you're about to discard. Do narrow, data-shrinking steps before any wide step."
      },
      {
        bad: "df.groupBy('k').count().collect()  # collect() pulls everything to the driver",
        good: "df.groupBy('k').count().write.parquet(path)  # keep it distributed",
        why: "count()/sum() as aggregations are fine, but collect()/toPandas() pull the whole result to the driver and can OOM it. Write out or take(n) instead."
      }
    ],

    complexity: [
      { op: "filter / select / withColumn (narrow)", big_o: "O(n) local", note: "Each partition processed independently on its executor; no network, no stage boundary. Essentially free relative to a shuffle." },
      { op: "groupBy + agg (wide)", big_o: "O(n) + shuffle", note: "Spark does a partial (map-side) aggregate first, shuffles the partial results by key, then finishes — so only partial sums cross the network, not raw rows." },
      { op: "join — sort-merge (wide)", big_o: "O(n log n) + shuffle", note: "Both sides shuffled and sorted on the key. The default for two large tables." },
      { op: "join — broadcast", big_o: "O(n) + broadcast", note: "The small side (default < 10MB, spark.sql.autoBroadcastJoinThreshold) is copied to every executor; the big side is never shuffled." },
      { op: "repartition(k) / distinct / orderBy", big_o: "O(n) + full shuffle", note: "A full shuffle of the whole dataset. orderBy is a global sort; coalesce(k) avoids the shuffle when only REDUCING partition count." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A shuffle writes map-output files to local disk, and reduce tasks fetch them over the network — this is why shuffles are slow and why disk/serialization tuning matters.</p>" +
      "<p>Modern Spark (3.x) <b>Adaptive Query Execution (AQE)</b> improves shuffles at runtime: it coalesces small shuffle partitions, converts sort-merge joins to broadcast joins when it discovers a side is small, and splits skewed partitions. Enable it with <code>spark.sql.adaptive.enabled=true</code> (on by default in Spark 3.2+).</p>" +
      "<p><code>spark.sql.shuffle.partitions</code> (default 200) sets the post-shuffle partition count; too high wastes scheduling overhead on tiny tasks, too low underuses the cluster — AQE tunes this for you.</p>",

    challenge: {
      prompt:
        "You join a 2-billion-row events table to a 500-row country_lookup table, then group by country. Sketch the transformations and mark each NARROW or WIDE. How many shuffles does the naive version have, and what single change removes one of them?",
      starter:
        "events \\\n" +
        "  .join(country_lookup, 'country_code')   # narrow or wide?\n" +
        "  .groupBy('country_name')                # narrow or wide?\n" +
        "  .agg(F.count('*'))\n" +
        "# how many shuffles? what change helps?",
      solution:
        "# Naive: join (WIDE, shuffles the 2B-row table) + groupBy (WIDE) = 2 shuffles.\n" +
        "events \\\n" +
        "  .join(F.broadcast(country_lookup), 'country_code')  # now NARROW: lookup broadcast,\n" +
        "                                                      # the 2B-row side is NOT shuffled\n" +
        "  .groupBy('country_name').agg(F.count('*'))          # still WIDE (1 shuffle)\n" +
        "# Broadcasting the tiny lookup removes the join's shuffle -> 2 shuffles down to 1."
    }
  }
]);
