/*
 * data/pyspark/concepts_performance.js — PySpark "Learn" performance topics.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Spark execution semantics; teaching structure mirrors the Python lab.
 */
window.LEARN.register("spark", "Performance", [
  {
    id: "partitioning-skew",
    title: "Partitioning & Skew",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "How your data is split across the cluster — and whether one key hogs a partition — decides whether work spreads evenly or a single task drags the whole job.",

    whatIsIt: [
      "A DataFrame is physically split into <b>partitions</b>, each processed by one task on one executor core. Even parallelism means every partition holds roughly the same amount of data; the job is only as fast as its <b>slowest</b> partition.",
      "<b>repartition(n)</b> reshuffles the whole dataset into <code>n</code> partitions (a full shuffle) and can <b>increase or decrease</b> the count. <b>coalesce(n)</b> only <b>reduces</b> the count and avoids a shuffle by merging existing partitions locally — cheaper, but it can leave you with lopsided partitions.",
      "<b>Skew</b> is when one key dominates: after a shuffle on that key, all its rows land in a single partition, so one task processes millions of rows while the rest finish in seconds. That straggler task can also <b>spill</b> to disk or OOM.",
      "The fix is to spread the hot key: <b>salt</b> it (append a random bucket so its rows split across partitions) or let <b>AQE skew join</b> split the skewed partition automatically at runtime."
    ],

    showMe: {
      code:
        "# How many partitions do I have right now?\n" +
        "df.rdd.getNumPartitions()\n" +
        "\n" +
        "# repartition — FULL SHUFFLE, can grow or shrink, evens out sizes\n" +
        "even = df.repartition(200, 'country')   # hash-partition by country\n" +
        "\n" +
        "# coalesce — NO SHUFFLE, only reduces (e.g. before writing fewer files)\n" +
        "few = df.coalesce(10)                   # merge down to 10 partitions\n" +
        "\n" +
        "# Detect skew: count rows per partition\n" +
        "from pyspark.sql import functions as F\n" +
        "(df.groupBy(F.spark_partition_id())\n" +
        "   .count()\n" +
        "   .orderBy(F.desc('count'))\n" +
        "   .show(5))   # one partition far bigger than the rest = SKEW\n" +
        "\n" +
        "# Salt a hot join key: split it across N buckets\n" +
        "N = 16\n" +
        "big_salted = big.withColumn('salt', (F.rand() * N).cast('int'))\n" +
        "small_exploded = (small\n" +
        "    .withColumn('salt', F.explode(F.array([F.lit(i) for i in range(N)]))))\n" +
        "joined = big_salted.join(small_exploded, ['key', 'salt'])",
      caption:
        "repartition hash-shuffles into a chosen count; coalesce only merges down without a shuffle. spark_partition_id() reveals skew, and salting the join key spreads one hot key across N partitions."
    },

    whyMatters:
      "<p>Skew is the single most common reason a Spark job \"hangs at 99%\": 199 tasks finish, one runs for an hour. Because a stage can't complete until its slowest task does, one fat partition throws away all your parallelism — and often spills to disk or OOMs the executor.</p>" +
      "<p>Choosing between repartition and coalesce is the other everyday call:</p>" +
      "<ul>" +
      "<li><b>coalesce(n)</b> — use to <i>reduce</i> partitions cheaply (e.g. write fewer output files); no shuffle, but sizes may stay uneven.</li>" +
      "<li><b>repartition(n)</b> — use to <i>increase</i> partitions or force even sizes; always a full shuffle.</li>" +
      "<li><b>salt / AQE skew join</b> — use when one key dominates a shuffle.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">before salt:  key='US' -> 1 partition, 40M rows   (straggler)\n" +
      "after salt:   key='US' x salt[0..15] -> 16 partitions, ~2.5M rows each</pre>",

    recognize: [
      { q: "\"My job is stuck at 99% — 199 done, 1 running forever.\"", think: "Classic skew. One shuffle key holds most rows; salt the key or enable AQE skew join (spark.sql.adaptive.skewJoin.enabled)." },
      { q: "\"I want to write fewer, bigger output files.\"", think: "coalesce(n) down to the file count you want — no shuffle. Avoid repartition(1) on large data; it forces everything through one task." },
      { q: "\"After a filter I have thousands of tiny partitions.\"", think: "Too many small tasks = scheduling overhead. coalesce to fewer partitions, or let AQE coalesce shuffle partitions." },
      { q: "\"How do I even know if I'm skewed?\"", think: "groupBy(spark_partition_id()).count() — if one partition dwarfs the others, that's skew." },
      { q: "\"repartition or coalesce here?\"", think: "Increasing count or need even sizes -> repartition (shuffle). Only reducing count cheaply -> coalesce (no shuffle)." }
    ],

    matchTags: ["partition", "repartition", "coalesce", "skew", "salt", "shuffle partitions",
                "spill", "tuning", "performance", "optimization", "aqe", "adaptive"],

    traps: [
      {
        bad: "df.repartition(10)          # full shuffle just to shrink partitions",
        good: "df.coalesce(10)            # merges down locally, no shuffle",
        why: "If you only need FEWER partitions, coalesce avoids the shuffle entirely. repartition always shuffles the whole dataset, so use it only when growing the count or when you need evenly sized partitions."
      },
      {
        bad: "df.coalesce(1).write.parquet(path)   # one task writes everything",
        good: "df.repartition(1).write.parquet(path)  # or write more files",
        why: "coalesce(1) collapses upstream parallelism onto a single task and can OOM. If you truly need one file, repartition(1) at least keeps upstream stages parallel; better still, write several files and combine downstream."
      },
      {
        bad: "big.join(small, 'user_id')   # 'user_id' is skewed -> one giant task",
        good: "big.join(F.broadcast(small), 'user_id')  # or salt the key / enable AQE skew join",
        why: "A skewed join key sends all matching rows to one partition. Broadcasting the small side removes the shuffle; if both sides are large, salt the hot key or turn on AQE skew join to split it at runtime."
      }
    ],

    complexity: [
      { op: "repartition(n [, cols])", big_o: "O(n) + full shuffle", note: "Hash-partitions the entire dataset across the network; use it to increase partition count or to even out skewed sizes, never merely to shrink." },
      { op: "coalesce(n)", big_o: "O(n) local merge", note: "Merges adjacent partitions without moving data across the network, so it can only reduce the count and may leave partitions unevenly sized." },
      { op: "salted join", big_o: "O(n) + shuffle", note: "Appending a random salt bucket to a hot key splits its rows across N partitions, trading a bigger small-side (exploded N times) for balanced parallelism." },
      { op: "spark_partition_id() count", big_o: "O(n) + shuffle", note: "Aggregating row counts per partition is a cheap diagnostic that exposes which partition is oversized before you tune anything." },
      { op: "AQE skew-join split", big_o: "runtime adaptive", note: "Spark measures partition sizes after the shuffle and splits the skewed one into sub-partitions, so you often avoid manual salting entirely in Spark 3.x." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>repartition</code> triggers a <b>full shuffle</b> (an Exchange in the plan) and can raise or lower the partition count; <code>coalesce</code> issues <b>no shuffle</b> — it stitches existing partitions together on the same executors, so it can only lower the count.</p>" +
      "<p>The post-shuffle partition count defaults to <code>spark.sql.shuffle.partitions=200</code>. Too high wastes scheduling overhead on tiny tasks; too low underuses the cluster and invites spill.</p>" +
      "<p>In Spark 3.x, <b>Adaptive Query Execution</b> (<code>spark.sql.adaptive.enabled</code>) handles much of this at runtime: it <b>coalesces</b> small shuffle partitions, splits <b>skewed</b> partitions in skew joins (<code>spark.sql.adaptive.skewJoin.enabled</code>), and converts sort-merge joins to broadcast joins when it discovers a side is small.</p>",

    challenge: {
      prompt:
        "You join a 3-billion-row clicks table to a users table on user_id, but 60% of clicks come from a handful of bot accounts, so those user_ids are heavily skewed. The join hangs on one task. Without broadcasting (users is too big), how do you fix the skew, and would AQE help?",
      starter:
        "clicks \\\n" +
        "  .join(users, 'user_id')   # one bot user_id -> one giant partition\n" +
        "  .groupBy('country').count()\n" +
        "# how do you spread the hot key? what AQE flag helps?",
      solution:
        "from pyspark.sql import functions as F\n" +
        "N = 32\n" +
        "# 1) salt the big side with a random bucket\n" +
        "clicks_s = clicks.withColumn('salt', (F.rand() * N).cast('int'))\n" +
        "# 2) replicate the small-ish side across all N buckets\n" +
        "users_s = users.withColumn('salt',\n" +
        "    F.explode(F.array([F.lit(i) for i in range(N)])))\n" +
        "# 3) join on (user_id, salt) -> the bot key now spans N partitions\n" +
        "out = (clicks_s.join(users_s, ['user_id', 'salt'])\n" +
        "               .groupBy('country').count())\n" +
        "# AQE alternative: spark.sql.adaptive.enabled=true +\n" +
        "#                  spark.sql.adaptive.skewJoin.enabled=true\n" +
        "# lets Spark split the skewed partition automatically at runtime."
    }
  },

  {
    id: "caching-persistence",
    title: "Caching & Persistence",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Caching a DataFrame pays off only when you reuse it — otherwise it just burns memory for a plan Spark would happily recompute.",

    whatIsIt: [
      "Spark is <b>lazy</b>: a DataFrame is a plan, not stored data. Every action re-runs that plan from the source. If you use the same DataFrame in several actions, Spark recomputes it every time — reading and re-shuffling from scratch.",
      "<b>cache()</b> / <b>persist()</b> tell Spark to keep the computed partitions after the first action, so later actions read the stored copy instead of recomputing. <code>cache()</code> is shorthand for <code>persist(MEMORY_AND_DISK)</code> (the default storage level for DataFrames).",
      "Both are <b>lazy</b>: nothing is stored until the first action materializes the DataFrame. After that, subsequent actions hit the cache. When you're done, <code>unpersist()</code> frees the memory — Spark also evicts cached blocks under memory pressure (LRU).",
      "Caching helps <b>only when a DataFrame is reused multiple times</b>. Cache something used once and you pay the memory cost with no benefit — and you may evict blocks that would have helped elsewhere."
    ],

    showMe: {
      code:
        "from pyspark import StorageLevel\n" +
        "\n" +
        "# Expensive base: a filter + join + groupBy you will reuse several times\n" +
        "base = (events.filter(F.col('valid'))\n" +
        "              .join(F.broadcast(dim), 'id')\n" +
        "              .groupBy('country').agg(F.sum('amt').alias('total')))\n" +
        "\n" +
        "# cache() = persist(MEMORY_AND_DISK); lazy until the first action\n" +
        "base.cache()\n" +
        "base.count()            # ACTION -> materializes and fills the cache\n" +
        "\n" +
        "# these reuse the cache instead of recomputing the whole plan\n" +
        "top = base.orderBy(F.desc('total')).limit(10)\n" +
        "base.write.parquet('/out/by_country')\n" +
        "\n" +
        "# pick a storage level explicitly when memory is tight\n" +
        "base.persist(StorageLevel.MEMORY_AND_DISK)   # spill to disk if needed\n" +
        "base.persist(StorageLevel.DISK_ONLY)         # never hold in memory\n" +
        "\n" +
        "# free it when finished\n" +
        "base.unpersist()",
      caption:
        "Cache the expensive base once, trigger it with an action, then reuse it across several downstream queries. cache() defaults to MEMORY_AND_DISK; choose the storage level explicitly when RAM is scarce, and unpersist when done."
    },

    whyMatters:
      "<p>The whole value of caching is <b>amortizing an expensive computation across multiple reuses</b>. If a DataFrame that took a big shuffle to build is consumed by three downstream queries, caching it once turns three recomputations into one. If it's consumed once, caching does nothing but occupy memory.</p>" +
      "<p>Rules of thumb that follow directly:</p>" +
      "<ul>" +
      "<li><b>Cache only reused DataFrames</b> — two or more actions on the same plan is the trigger.</li>" +
      "<li><b>Materialize before reuse</b> — cache is lazy, so run one action (or <code>count()</code>) to actually fill it.</li>" +
      "<li><b>unpersist when done</b> — stale cached blocks evict useful ones under memory pressure.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">no cache:  build(base) x 3 actions  -> 3 full recomputes\n" +
      "cache:     build(base) x 1 + read x 3 -> 1 compute, 3 cheap reads</pre>",

    recognize: [
      { q: "\"I run several reports off the same filtered/joined table.\"", think: "Reuse -> cache the shared base once, materialize with count(), then run the reports off the cache." },
      { q: "\"I cached everything and now executors OOM / evict constantly.\"", think: "Caching used-once data wastes memory and evicts useful blocks. Cache only reused DataFrames; unpersist when finished." },
      { q: "\"I called cache() but the plan still recomputes.\"", think: "cache() is lazy — it does nothing until an action materializes it. Trigger one action first, then reuse." },
      { q: "\"Cache doesn't fit in memory.\"", think: "MEMORY_AND_DISK (the default) spills to disk instead of dropping blocks; DISK_ONLY avoids RAM entirely. Pick the level to match your memory budget." },
      { q: "\"Iterative ML / graph algorithm reuses the same base each iteration.\"", think: "Textbook cache case — persist the reused DataFrame so each iteration reads it instead of recomputing from source." }
    ],

    matchTags: ["cache", "persist", "storage level", "performance", "optimization",
                "tuning", "spill", "shuffle partitions"],

    traps: [
      {
        bad: "df.cache()                 # then use df exactly once",
        good: "df                         # used once -> don't cache at all",
        why: "Caching only pays off when the DataFrame is reused. A single-use cache costs memory (and eviction pressure on other blocks) for zero benefit; Spark would compute it once anyway."
      },
      {
        bad: "df.cache()\ndf.orderBy(...).show()   # first action already reused",
        good: "df.cache()\ndf.count()               # materialize first, THEN reuse",
        why: "cache() is lazy. If your very first action IS the reuse, nothing was cached in time. Run a cheap action (count) to populate the cache before the queries that should benefit."
      },
      {
        bad: "# cache large tables and never release them",
        good: "df.unpersist()             # free once the reuse phase is done",
        why: "Cached blocks stay until evicted or unpersisted. Holding them past their usefulness pushes out other cached data (LRU) and can starve later stages of memory."
      }
    ],

    complexity: [
      { op: "cache() / persist()", big_o: "O(1) to declare", note: "Both are lazy metadata calls that cost nothing until an action materializes the DataFrame and fills the cache." },
      { op: "first action after cache", big_o: "O(n) + store", note: "The first action computes the full plan AND writes the partitions to the chosen storage level, so it is no faster than an uncached run." },
      { op: "reused action (cache hit)", big_o: "O(n) read", note: "Later actions read stored partitions from memory or disk instead of recomputing the plan, which is where all the savings come from." },
      { op: "MEMORY_AND_DISK spill", big_o: "O(n) + disk I/O", note: "When partitions do not fit in RAM, Spark spills the overflow to local disk rather than dropping it, trading memory for slower reads." },
      { op: "unpersist()", big_o: "O(partitions)", note: "Marks the cached blocks for removal so their memory returns to the pool for later stages; cheap and worth doing once reuse is over." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>cache()</code> and <code>persist()</code> are <b>lazy</b> — they register the DataFrame for storage but store nothing until an <b>action</b> materializes it. The first action therefore pays the full compute cost plus the write into the cache; only later actions read back cheaply.</p>" +
      "<p><code>cache()</code> is exactly <code>persist(StorageLevel.MEMORY_AND_DISK)</code>, the <b>default storage level for DataFrames</b>: partitions live in memory and spill to local disk when they don't fit, rather than being dropped. Other levels — <code>MEMORY_ONLY</code>, <code>DISK_ONLY</code>, and their <code>_SER</code> / replicated variants — trade RAM, CPU, and fault tolerance.</p>" +
      "<p>Cached blocks are evicted <b>LRU</b> under memory pressure, so a recompute can silently reappear. Call <code>unpersist()</code> when the reuse phase ends to return memory to the pool.</p>",

    challenge: {
      prompt:
        "You build a heavily-filtered, joined DataFrame `sessions`, then (a) count its rows, (b) write it to Parquet, and (c) join it to another table. It's recomputing the whole plan three times. Where do you cache, how do you make sure the cache is actually used, and when do you release it?",
      starter:
        "sessions = (raw.filter(...).join(dim, 'id').withColumn(...))\n" +
        "sessions.count()                 # recompute 1\n" +
        "sessions.write.parquet(out)      # recompute 2\n" +
        "sessions.join(other, 'k').show() # recompute 3\n" +
        "# where to cache? how to guarantee a cache hit? when to free?",
      solution:
        "sessions = (raw.filter(...).join(dim, 'id').withColumn(...))\n" +
        "sessions.cache()          # = persist(MEMORY_AND_DISK), still lazy\n" +
        "sessions.count()          # ACTION -> materializes + fills the cache\n" +
        "                          # (this count is now the materializing pass)\n" +
        "sessions.write.parquet(out)       # cache hit, no recompute\n" +
        "sessions.join(other, 'k').show()  # cache hit, no recompute\n" +
        "sessions.unpersist()      # release memory once reuse is done\n" +
        "# 3 recomputes -> 1 compute + 2 cheap reads."
    }
  },

  {
    id: "aqe-tuning",
    title: "AQE & Tuning",
    difficulty: "Advanced",
    estMinutes: 13,
    relevance: 2,
    tagline: "Adaptive Query Execution re-optimizes your query with real runtime statistics — often fixing partition counts, skew, and join strategy that static tuning gets wrong.",

    whatIsIt: [
      "Spark's planner normally decides everything <b>before</b> the job runs, from rough estimates. Those estimates are frequently wrong, so it picks a bad shuffle-partition count, misses a broadcast opportunity, or ignores skew.",
      "<b>Adaptive Query Execution (AQE)</b> — <code>spark.sql.adaptive.enabled</code>, on by default since Spark 3.2 — re-plans <b>at runtime</b> using the actual sizes of completed shuffle stages. It does three big things: <b>coalesce</b> small post-shuffle partitions into fewer, right-sized ones; <b>convert</b> a sort-merge join to a broadcast join when it discovers a side is small; and <b>split</b> skewed partitions in a skew join.",
      "The classic static knob is <b>spark.sql.shuffle.partitions</b> (default <b>200</b>): the post-shuffle partition count. Too high and you drown in tiny tasks; too low and you underuse the cluster and spill. AQE coalescing largely removes the need to hand-tune this.",
      "Other everyday <code>spark.sql</code> knobs: <b>autoBroadcastJoinThreshold</b> (when a side auto-broadcasts, default 10MB), and the AQE sub-flags <b>coalescePartitions.enabled</b> and <b>skewJoin.enabled</b>."
    ],

    showMe: {
      code:
        "# Turn AQE on (default true in Spark 3.2+) and its sub-features\n" +
        "spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\n" +
        "\n" +
        "# The classic static knob: post-shuffle partition count (default 200)\n" +
        "spark.conf.set('spark.sql.shuffle.partitions', '200')\n" +
        "\n" +
        "# When a side is small enough to auto-broadcast (default 10MB)\n" +
        "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 10 * 1024 * 1024)\n" +
        "\n" +
        "# Read a value back\n" +
        "spark.conf.get('spark.sql.shuffle.partitions')\n" +
        "\n" +
        "# With AQE on, the plan shows AdaptiveSparkPlan and rewrites at runtime\n" +
        "result = big.join(small, 'id').groupBy('country').count()\n" +
        "result.explain()\n" +
        "# == Physical Plan ==\n" +
        "# AdaptiveSparkPlan isFinalPlan=false\n" +
        "# +- ... Exchange ...      <- AQE may coalesce / convert this at runtime",
      caption:
        "Enable AQE and its coalesce/skew sub-flags via spark.conf.set. shuffle.partitions (200) and autoBroadcastJoinThreshold (10MB) are the static knobs; explain() shows AdaptiveSparkPlan, meaning Spark will rewrite the plan using real stage sizes."
    },

    whyMatters:
      "<p>Most hand-tuning of <code>spark.sql.shuffle.partitions</code> is guesswork — the right value depends on data sizes the planner can't know up front, and it changes per query. AQE replaces that guessing with runtime measurement, which is why it's the first thing to enable before manually tuning partition counts.</p>" +
      "<p>What AQE fixes automatically:</p>" +
      "<ul>" +
      "<li><b>Too many tiny partitions</b> — coalesces small post-shuffle partitions into right-sized ones.</li>" +
      "<li><b>A missed broadcast</b> — converts sort-merge to broadcast join once it sees a side is small.</li>" +
      "<li><b>Skew</b> — splits an oversized partition in a skew join so no single task straggles.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">static:  shuffle.partitions=200 always, even for a 5MB result\n" +
      "AQE:     measures the shuffle, coalesces 200 -> a handful of right-sized tasks</pre>",

    recognize: [
      { q: "\"What should I set spark.sql.shuffle.partitions to?\"", think: "First enable AQE and let coalescePartitions size them from real stage stats; only hand-tune if AQE is off or the query is unusual." },
      { q: "\"My result is tiny but Spark still made 200 partitions.\"", think: "That's the static default. AQE coalescePartitions merges those small partitions down at runtime." },
      { q: "\"A join I expected to broadcast is doing a sort-merge.\"", think: "Raise autoBroadcastJoinThreshold, or rely on AQE to convert it once it sees the side is small; F.broadcast() forces it." },
      { q: "\"One task in a join is a straggler.\"", think: "Enable spark.sql.adaptive.skewJoin.enabled so AQE splits the skewed partition, or salt the key manually." },
      { q: "\"Is AQE even on?\"", think: "spark.conf.get('spark.sql.adaptive.enabled'); explain() shows AdaptiveSparkPlan when it is." }
    ],

    matchTags: ["aqe", "adaptive", "shuffle partitions", "tuning", "performance",
                "optimization", "skew", "partition", "spill"],

    traps: [
      {
        bad: "spark.conf.set('spark.sql.shuffle.partitions', '2000')  # guess high",
        good: "spark.conf.set('spark.sql.adaptive.enabled', 'true')   # let AQE size it",
        why: "Hard-coding a large partition count creates thousands of tiny tasks whose scheduling overhead dominates. AQE coalesces post-shuffle partitions to real sizes, so enable it before hand-tuning the count."
      },
      {
        bad: "# assume AQE will broadcast anything small\nbig.join(small, 'id')",
        good: "big.join(F.broadcast(small), 'id')   # force it when you're sure",
        why: "AQE only converts to broadcast after the small side's shuffle stage completes and comes in under the threshold; if it's borderline or stats are missing, an explicit F.broadcast() guarantees the strategy."
      },
      {
        bad: "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', -1)  # disable",
        good: "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 10 * 1024 * 1024)",
        why: "Setting the threshold to -1 turns off auto-broadcast entirely, forcing sort-merge joins that shuffle both sides. Keep a sensible threshold so small dimension tables broadcast instead of shuffling."
      }
    ],

    complexity: [
      { op: "AQE coalesce partitions", big_o: "runtime adaptive", note: "After a shuffle completes, Spark merges small output partitions into fewer right-sized ones, cutting task-scheduling overhead without a re-shuffle." },
      { op: "AQE broadcast conversion", big_o: "runtime adaptive", note: "If a join side's completed stage is under the broadcast threshold, Spark switches sort-merge to broadcast, eliminating the big side's shuffle mid-query." },
      { op: "AQE skew-join split", big_o: "runtime adaptive", note: "Spark detects an oversized partition from real stats and splits it into sub-partitions so no single task straggles on a hot key." },
      { op: "spark.sql.shuffle.partitions (static)", big_o: "fixed count", note: "Sets the post-shuffle partition count to 200 by default regardless of data size, which is why it so often needs tuning when AQE is off." },
      { op: "explain() with AQE", big_o: "O(plan) inspect", note: "Shows an AdaptiveSparkPlan node, signalling that the printed plan is provisional and will be rewritten from runtime statistics." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Without AQE, the physical plan is fixed before execution from cost estimates. AQE (<code>spark.sql.adaptive.enabled</code>, default true in Spark 3.2+) inserts an <b>AdaptiveSparkPlan</b> that re-optimizes each stage using the <b>actual</b> sizes of completed shuffle stages.</p>" +
      "<p>At runtime it does three things: <b>coalesces</b> small post-shuffle partitions (so the static <code>spark.sql.shuffle.partitions</code>=200 rarely needs hand-tuning), <b>converts</b> a sort-merge join to a broadcast join when a side lands under <code>spark.sql.autoBroadcastJoinThreshold</code>, and <b>splits</b> skewed partitions when <code>spark.sql.adaptive.skewJoin.enabled</code> is on.</p>" +
      "<p>The trade-off: AQE can only react to stages that have already run, so it helps queries with shuffles and materialized stats, not a single narrow scan. Read <code>explain()</code> — an <code>AdaptiveSparkPlan isFinalPlan=false</code> means the printed plan will still change.</p>",

    challenge: {
      prompt:
        "A nightly query joins two large tables, groups by day, and writes a small result. It's slow: 200 shuffle partitions for a result that's a few MB, one straggler task, and a sort-merge join even though the dimension side turns out small. Which spark.sql settings fix each symptom, and why prefer AQE over hand-setting shuffle.partitions?",
      starter:
        "# symptoms: 200 tiny partitions, 1 straggler, missed broadcast\n" +
        "fact.join(dim, 'id').groupBy('day').agg(F.sum('amt')).write.parquet(out)\n" +
        "# which knobs address each? why AQE over a fixed partition count?",
      solution:
        "# Enable AQE so Spark re-plans from real runtime stats:\n" +
        "spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
        "# 1) tiny result / 200 partitions -> AQE coalesces them:\n" +
        "spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'true')\n" +
        "# 2) straggler from skew -> AQE splits the skewed partition:\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\n" +
        "# 3) missed broadcast -> AQE converts once it sees dim is small,\n" +
        "#    or force it explicitly:\n" +
        "fact.join(F.broadcast(dim), 'id').groupBy('day').agg(F.sum('amt')) \\\n" +
        "    .write.parquet(out)\n" +
        "# Prefer AQE over a fixed spark.sql.shuffle.partitions because the\n" +
        "# ideal count depends on per-query data sizes the planner can't know\n" +
        "# up front; AQE measures the real shuffle and sizes partitions to it."
    }
  }
]);
