/*
 * data/pyspark/concepts_execution.js — PySpark "Learn" Execution & Internals.
 * Registered into window.LEARN under the "spark" stack. Covers how Spark
 * actually executes: the RDD API, the job/stage/task hierarchy, how a read
 * becomes partitions, and how to read explain(). Reuses existing PYVIZ builders
 * (clusterRun, shuffleStages, partitionOps, catalyst).
 */
window.LEARN.register("spark", "Execution & Internals", [
  {
    id: "rdd-api-reducebykey",
    title: "RDD API & reduceByKey vs groupByKey",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 2,
    tagline: "DataFrames are the modern default, but interviews still ask \"what's an RDD?\" and \"reduceByKey vs groupByKey?\" — because the second question is really \"do you understand map-side combine?\"",

    whatIsIt: [
      "An <b>RDD</b> (Resilient Distributed Dataset) is Spark's original low-level abstraction: an immutable, partitioned collection of objects with no schema and no Catalyst optimizer. You build one with <code>sc.parallelize(...)</code> or <code>sc.textFile(...)</code> and transform it with <code>map</code>, <code>flatMap</code>, <code>filter</code>, <code>reduceByKey</code>, <code>groupByKey</code>. Transformations are <b>lazy</b>; actions (<code>collect</code>, <code>count</code>, <code>saveAsTextFile</code>) trigger the job — the same lazy model DataFrames inherit.",
      "<b>DataFrame vs RDD:</b> DataFrames carry a schema and go through Catalyst + Tungsten (whole-stage codegen, column pruning, predicate pushdown), so they're faster and terser for structured data. RDDs give you full control over arbitrary objects and custom partitioning — useful for unstructured data or algorithms that don't fit the relational model. Rule: <b>use DataFrames unless you have a specific reason not to.</b>",
      "The headline RDD question is <b>reduceByKey vs groupByKey</b>. Both group values by key, but <code>reduceByKey</code> does a <b>map-side combine</b>: it pre-aggregates each partition <i>before</i> the shuffle, so only one partial value per key crosses the network. <code>groupByKey</code> shuffles <b>every raw value</b> and combines only after — far more network traffic and a real OOM risk on a hot key.",
      "This is the exact idea behind a MapReduce <b>combiner</b>, and it's why DataFrame <code>groupBy().agg(F.sum(...))</code> is efficient: built-in aggregates get partial aggregation for free. So the practical takeaway survives even if you never write an RDD — <b>prefer the operation that combines before the shuffle.</b>"
    ],

    showMe: {
      code:
        "sc = spark.sparkContext\n" +
        "words = sc.textFile('/data/book.txt').flatMap(lambda line: line.split())\n" +
        "pairs = words.map(lambda w: (w, 1))\n" +
        "\n" +
        "# GOOD — reduceByKey: combines per partition BEFORE the shuffle\n" +
        "counts = pairs.reduceByKey(lambda a, b: a + b)   # (word, total)\n" +
        "#   partition-local sums shuffle; tiny network traffic\n" +
        "\n" +
        "# BAD — groupByKey: shuffles every (word, 1) then sums\n" +
        "counts = pairs.groupByKey().mapValues(sum)        # same answer, huge shuffle\n" +
        "\n" +
        "counts.collect()   # action -> triggers the job\n" +
        "\n" +
        "# The DataFrame equivalent gets map-side combine automatically:\n" +
        "df.groupBy('word').agg(F.sum('n'))                # partial aggregation built in",
      viz: {
        type: "clusterRun",
        data: {
          executors: 3,
          ops: [
            { key: "textFile",    label: "sc.textFile(...)",   where: "executors", caption: "Each executor reads its own file splits as partitions — one task per split. The driver only builds the lineage." },
            { key: "flatMap",     label: ".flatMap(split)",    where: "executors", caption: "Narrow: each line explodes into words locally, in parallel. No data moves." },
            { key: "map",         label: ".map(w -> (w,1))",   where: "executors", caption: "Narrow: pair each word with 1, still per-partition. No shuffle yet." },
            { key: "reduceByKey", label: ".reduceByKey(+)",    where: "shuffle",   caption: "Map-side combine sums each partition FIRST, so only one partial per word shuffles — the cheap wide step. (groupByKey would shuffle every raw (w,1).)" },
            { key: "collect",     label: ".collect()",         where: "driver", warn: true, caption: "Action: pulls the final (word, total) pairs to the driver. Fine when the vocabulary is small; use saveAsTextFile for large output." }
          ]
        }
      },
      caption:
        "Walk the RDD word-count through the cluster. reduceByKey combines per partition before the Exchange, so the shuffle carries one partial per word instead of every raw (word, 1) — the whole reason it beats groupByKey."
    },

    whyMatters:
      "<p>Even in a DataFrame-first shop, RDD questions screen for depth: they reveal whether you understand what happens <i>below</i> the DataFrame API. The reduceByKey/groupByKey contrast is the classic, and it generalizes.</p>" +
      "<ul>" +
      "<li><b>reduceByKey / aggregateByKey</b> — combine before the shuffle; small network, safe on hot keys.</li>" +
      "<li><b>groupByKey</b> — shuffles every value; big network, OOM risk when one key is huge. Avoid unless you truly need every raw value grouped.</li>" +
      "<li><b>DataFrames win by default</b> — schema + Catalyst + codegen; drop to RDDs only for arbitrary objects, custom partitioners, or non-relational algorithms.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">reduceByKey:  partition sums -> shuffle 1 partial/key   (like a MapReduce combiner)\ngroupByKey:   shuffle every value -> then combine        (network heavy, OOM on skew)\nDataFrame groupBy().agg(sum): partial aggregation for free</pre>",

    recognize: [
      { q: "\"What's the difference between an RDD and a DataFrame?\"", think: "RDD: low-level, no schema, no Catalyst — full control over objects/partitioning. DataFrame: schema + optimizer + codegen — faster and terser for structured data. Default to DataFrames." },
      { q: "\"reduceByKey vs groupByKey?\"", think: "reduceByKey combines map-side before the shuffle (little network); groupByKey shuffles all raw values then combines (heavy, OOM on hot keys). Prefer reduceByKey." },
      { q: "\"When would you actually use the RDD API today?\"", think: "Unstructured data, custom partitioning, or algorithms that don't map to relational ops. Otherwise DataFrames are faster and clearer." },
      { q: "\"Why is my groupByKey job OOMing on one key?\"", think: "All raw values for that key shuffle to one task and pile up in memory. Switch to reduceByKey/aggregateByKey so it combines before the shuffle (or salt the key)." },
      { q: "\"How does DataFrame groupBy avoid that problem?\"", think: "Built-in aggregates get partial (map-side) aggregation automatically — the same map-side combine, applied for you by Catalyst." }
    ],

    matchTags: ["rdd", "reducebykey", "groupbykey", "map-side combine", "combiner", "flatmap", "parallelize",
                "textfile", "aggregatebykey", "rdd vs dataframe", "low-level", "partial aggregation", "sparkcontext"],

    traps: [
      {
        bad: "pairs.groupByKey().mapValues(sum)     # shuffles every (word, 1)",
        good: "pairs.reduceByKey(lambda a, b: a + b) # combines per partition first",
        why: "groupByKey moves every raw value across the network and can OOM a task on a hot key. reduceByKey pre-aggregates each partition, so only one partial value per key is shuffled — same result, a fraction of the traffic."
      },
      {
        bad: "# dropping to RDDs for a normal structured aggregation 'for control'",
        good: "df.groupBy('k').agg(F.sum('v'))       # Catalyst + codegen + partial agg",
        why: "RDDs bypass Catalyst, column pruning, predicate pushdown, and whole-stage codegen. For structured data the DataFrame API is faster and shorter; reserve RDDs for cases the relational model can't express."
      },
      {
        bad: "big_rdd.collect()                      # pulls all elements to the driver",
        good: "big_rdd.saveAsTextFile(path)          # or take(n) for a peek",
        why: "collect() on an RDD moves every element into the driver JVM, which can't spill — a classic driver OOM. Write results out or sample them instead."
      }
    ],

    complexity: [
      { op: "reduceByKey", big_o: "O(n) + small shuffle", note: "Map-side combine means the shuffle carries one partial per key per partition, not every value." },
      { op: "groupByKey", big_o: "O(n) + large shuffle", note: "Every raw value is shuffled before combining; network and memory scale with the data, not the key count." },
      { op: "map / flatMap / filter", big_o: "O(n), narrow", note: "Per-partition, no shuffle — fused into one stage like DataFrame narrow transforms." },
      { op: "RDD vs DataFrame agg", big_o: "DataFrame faster", note: "DataFrames add Catalyst optimization and Tungsten codegen the RDD API doesn't get." },
      { op: "collect()", big_o: "O(result) on driver", note: "Materializes everything in the driver JVM — OOM risk on large results." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>reduceByKey</code> and <code>aggregateByKey</code> run a <b>combiner</b> inside the map task's shuffle write path: values for a key are folded together per partition before being written to the shuffle files, so the shuffle read side receives far fewer records. <code>groupByKey</code> has no combiner — it writes every value out, so the reduce side must hold all of a key's values to combine them.</p>" +
      "<p><b>Why DataFrames don't need you to choose.</b> A DataFrame <code>groupBy().agg()</code> with built-in functions is planned as a <code>HashAggregate</code> with a partial (map-side) phase and a final (reduce-side) phase — the combiner, applied automatically. That's why the RDD-era advice (\"prefer reduceByKey\") is baked into the DataFrame engine.</p>" +
      "<p><b>Resilience.</b> The \"R\" in RDD is <b>lineage</b>: Spark records the graph of transformations, so a lost partition is recomputed from its parents rather than replicated. DataFrames sit on the same lineage machinery.</p>",

    challenge: {
      prompt:
        "A word-count over 200 GB of logs runs fine on small samples but OOMs a single reduce task in production. The code uses rdd.map(lambda w: (w, 1)).groupByKey().mapValues(lambda vs: sum(vs)). Explain the failure and give the one-line fix — and say why the DataFrame version wouldn't hit it.",
      starter:
        "counts = (rdd.map(lambda w: (w, 1))\n" +
        "             .groupByKey()\n" +
        "             .mapValues(lambda vs: sum(vs)))\n" +
        "# OOMs one reduce task at 200GB. why? one-line fix?",
      solution:
        "# Diagnosis: groupByKey shuffles EVERY (word, 1) to the reduce side, and a\n" +
        "# few hot words (stopwords like 'the') send millions of 1s to one task,\n" +
        "# which must hold them all in memory to sum -> that task OOMs while others\n" +
        "# finish. It's fine on samples because no key is large there.\n" +
        "\n" +
        "# One-line fix: combine map-side before the shuffle.\n" +
        "counts = rdd.map(lambda w: (w, 1)).reduceByKey(lambda a, b: a + b)\n" +
        "# Now each partition pre-sums its words; only one partial per word shuffles,\n" +
        "# so no single task holds millions of raw values.\n" +
        "\n" +
        "# Why the DataFrame version is immune: df.groupBy('word').agg(F.count('*'))\n" +
        "# plans a HashAggregate with a partial (map-side) phase -> the same combine,\n" +
        "# automatically. Prefer DataFrames; if you must use RDDs, prefer reduceByKey."
    }
  },

  {
    id: "jobs-stages-tasks",
    title: "Jobs, Stages & Tasks",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "The Spark UI speaks in jobs, stages, and tasks. Knowing exactly what creates each one turns \"my job is slow\" into \"stage 3 is skewed\" — the difference between guessing and diagnosing.",

    whatIsIt: [
      "A <b>job</b> is triggered by one <b>action</b> (<code>count</code>, <code>collect</code>, <code>write</code>, <code>show</code>). One action = one job. All your lazy transformations do nothing until an action forces a job to run.",
      "A job is split into <b>stages</b> at every <b>shuffle</b> boundary. A run of narrow transformations (<code>filter</code>, <code>select</code>, <code>withColumn</code>) fuses into a single stage; the moment a wide transformation needs an <b>Exchange</b> (<code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>, <code>repartition</code>), the current stage ends and a new one begins. So: <b>count the shuffles to count the stage boundaries.</b>",
      "A <b>task</b> is one stage's work on <b>one partition</b>. A stage with 200 partitions runs 200 tasks — the unit Spark actually schedules onto executor cores. Tasks in a stage run in parallel up to your total executor cores; if there are more tasks than cores, they run in waves.",
      "The hierarchy — <b>action → job → stages (split by shuffle) → tasks (one per partition)</b> — is exactly what the Spark UI shows. Reading it is how you localize a problem: a slow <i>stage</i> points at a shuffle; a single slow <i>task</i> in a stage points at skew."
    ],

    showMe: {
      code:
        "df = (spark.read.parquet('/sales')      # stage 1 starts (read)\n" +
        "        .filter(F.col('amount') > 0)     # narrow -> same stage\n" +
        "        .withColumn('tax', F.col('amount') * 0.1)  # narrow -> same stage\n" +
        "        .groupBy('country').agg(F.sum('amount'))    # SHUFFLE -> stage 2\n" +
        "        .orderBy('sum(amount)'))         # SHUFFLE -> stage 3\n" +
        "\n" +
        "df.write.parquet('/out')   # ACTION -> 1 job, 3 stages\n" +
        "\n" +
        "# tasks per stage = number of partitions in that stage:\n" +
        "#   stage 1: one task per input file split (e.g. 40 blocks -> 40 tasks)\n" +
        "#   stage 2/3: spark.sql.shuffle.partitions tasks (default 200)\n" +
        "\n" +
        "df.explain()   # count the Exchange nodes = shuffles = stage boundaries",
      viz: {
        type: "shuffleStages",
        data: {
          ops: [
            { t: "spark.read.parquet(...)",      kind: "source", note: "Stage 1 begins. One task per file split — the read is the start of the first stage." },
            { t: ".filter(amount > 0)",          kind: "narrow", note: "Narrow: fuses into stage 1. No new stage, no shuffle." },
            { t: ".withColumn('tax', ...)",      kind: "narrow", note: "Narrow: still stage 1 — narrow ops pipeline together in one pass per partition." },
            { t: ".groupBy('country').agg(sum)", kind: "wide",   note: "Wide: an Exchange (shuffle) ends stage 1 and starts stage 2. Its task count is spark.sql.shuffle.partitions (default 200)." },
            { t: ".orderBy('total')",            kind: "wide",   note: "Wide: a range shuffle ends stage 2 and starts stage 3 — the second shuffle, the third stage." },
            { t: ".write.parquet(...)",          kind: "action", note: "Action: fires ONE job. The job ran as 3 stages; each stage ran one task per partition." }
          ]
        }
      },
      caption:
        "One action = one job. Each Exchange is a stage boundary — count the shuffles (2) to get the stages (3). Within a stage, one task runs per partition. This is exactly the tree the Spark UI draws."
    },

    whyMatters:
      "<p>Every performance conversation and half the interview questions use this vocabulary. If you can map your code to jobs/stages/tasks, the Spark UI stops being noise and becomes a diagnosis.</p>" +
      "<ul>" +
      "<li><b>Too many jobs</b> — you have more actions than you think (every <code>count()</code>/<code>show()</code> in a loop is a job). Cache or restructure.</li>" +
      "<li><b>A slow stage</b> — look at the shuffle that starts it; that's where the cost usually is.</li>" +
      "<li><b>One slow task in a stage</b> — data skew: one partition is far bigger than the rest.</li>" +
      "<li><b>Fewer tasks than cores</b> — under-parallelized (too few partitions); more tasks than cores run in waves.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">action  -> 1 job\nshuffle -> new stage         (stages = shuffles + 1)\npartition (in a stage) -> 1 task\nSpark UI: Jobs tab -> Stages tab -> Tasks per stage</pre>",

    recognize: [
      { q: "\"How does Spark decide stage boundaries?\"", think: "At every shuffle (Exchange). Narrow ops fuse into one stage; each wide op starts a new one. Stages = number of shuffles + 1." },
      { q: "\"What's a task, concretely?\"", think: "One stage's computation on one partition. A 200-partition stage = 200 tasks, scheduled onto executor cores." },
      { q: "\"Why did one action create three jobs?\"", think: "Some operations (e.g. inferSchema, pivot without values, certain writes) trigger extra jobs internally. Check the SQL tab — usually a hidden scan/agg." },
      { q: "\"My stage has 200 tasks but I have 40 cores.\"", think: "Tasks run in ~5 waves (200/40). That's normal; tune spark.sql.shuffle.partitions if partitions are far too many or too few." },
      { q: "\"One task takes 10× longer than the others.\"", think: "Skew — that partition holds most of a key's rows. Salt the key, raise partitions, or enable AQE skew join." }
    ],

    matchTags: ["job", "stage", "task", "action", "shuffle", "exchange", "spark ui", "partition",
                "stage boundary", "narrow", "wide", "parallelism", "waves", "skew", "diagnose"],

    traps: [
      {
        bad: "for c in categories:\n    df.filter(F.col('cat')==c).count()   # one JOB per iteration",
        good: "df.groupBy('cat').count().collect()      # one job, one pass",
        why: "Each count() is an action = a separate job that re-scans the data. A loop of actions multiplies jobs and re-reads. Do it set-based in one pass, or cache df if you truly must iterate."
      },
      {
        bad: "df.repartition(2000)   # 'more parallelism' on a small dataset",
        good: "df.repartition(sensible_n)   # match partitions to data + cores",
        why: "Far more tasks than there is data (or cores) means tiny tasks whose scheduling overhead dominates. Task count should track data size and available cores, not be maximized blindly."
      },
      {
        bad: "# blaming 'the cluster' when one task in a stage runs forever",
        good: "# read the Stages tab: one long task = skew -> salt / AQE skew join",
        why: "A single straggler task in an otherwise-fast stage is almost always data skew, not a cluster problem. The Spark UI's task duration distribution tells you immediately."
      }
    ],

    complexity: [
      { op: "action", big_o: "1 job", note: "Exactly one job per action; nothing runs until an action is called." },
      { op: "shuffle (Exchange)", big_o: "+1 stage", note: "Each wide transformation's shuffle is a stage boundary; stages = shuffles + 1." },
      { op: "task", big_o: "1 per partition", note: "A stage runs one task per partition of its input; this is the unit scheduled onto cores." },
      { op: "parallelism", big_o: "min(tasks, total cores)", note: "Tasks beyond available cores run in waves; fewer tasks than cores means idle cores." },
      { op: "straggler task", big_o: "stage time = slowest task", note: "A stage finishes only when its last task does, so one skewed partition drags the whole stage." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> The DAGScheduler turns the logical plan into a DAG of stages, cutting a new stage at each <b>ShuffleDependency</b>. Each stage becomes a <b>TaskSet</b> — one task per partition — handed to the TaskScheduler, which places tasks on executor cores honoring locality. Shuffle-map stages write shuffle files; the next stage's tasks read them.</p>" +
      "<p><b>Reading the UI.</b> The <b>Jobs</b> tab lists one row per action; drill into a job to see its <b>Stages</b>; drill into a stage to see the <b>task</b> duration/shuffle-read/spill distribution. A long tail in that distribution is skew; uniformly slow tasks with heavy shuffle-read point at the shuffle itself.</p>" +
      "<p><b>AQE twist.</b> With Adaptive Query Execution, Spark can coalesce shuffle partitions and split skewed ones <i>at runtime</i>, so the task counts you see may differ from spark.sql.shuffle.partitions — that's AQE reshaping stages using real statistics.</p>",

    challenge: {
      prompt:
        "In the Spark UI you see: 1 job, 3 stages. Stage 1 has 40 tasks (all ~2s). Stage 2 has 200 tasks — 199 finish in ~1s but ONE runs 90s. Stage 3 has 200 tasks (all ~1s). Where is the problem, what's the root cause, and what's your first fix?",
      starter:
        "# Job: 3 stages.\n" +
        "# Stage 1: 40 tasks ~2s each.\n" +
        "# Stage 2: 200 tasks, 199 ~1s, 1 task ~90s.  <-- ?\n" +
        "# Stage 3: 200 tasks ~1s each.\n" +
        "# where's the problem? root cause? first fix?",
      solution:
        "# Where: Stage 2 — specifically its single 90s straggler task. The stage\n" +
        "# can't finish until that task does, so it dominates the whole job.\n" +
        "#\n" +
        "# Root cause: DATA SKEW. Stage 2 follows a shuffle (groupBy/join); one\n" +
        "# shuffle key holds ~all the rows, so one partition (one task) is huge\n" +
        "# while the other 199 are tiny. Not a cluster problem — the task\n" +
        "# duration distribution proves it.\n" +
        "#\n" +
        "# First fix (pick per the operation):\n" +
        "#  - Enable AQE skew join: spark.sql.adaptive.enabled=true +\n" +
        "#    spark.sql.adaptive.skewJoin.enabled=true (splits the hot partition).\n" +
        "#  - Or SALT the hot key so its rows spread across tasks:\n" +
        "N = 32\n" +
        "salted = df.withColumn('salt', (F.rand()*N).cast('int'))\n" +
        "part = salted.groupBy('key','salt').agg(F.sum('v').alias('s'))\n" +
        "final = part.groupBy('key').agg(F.sum('s').alias('v'))\n" +
        "# Adding more executors would NOT help — the work is stuck in one task."
    }
  },

  {
    id: "read-partitioning-splits",
    title: "Read Partitioning & Splits",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 2,
    tagline: "\"Why did my read create N partitions?\" isn't luck — it's a formula over file size, block size, and a couple of configs. Knowing it explains both single-threaded reads and 200-partition shuffles.",

    whatIsIt: [
      "The number of partitions a <b>read</b> produces sets the initial parallelism — one task per partition. For a large <b>splittable</b> file, Spark targets partitions of about <code>spark.sql.files.maxPartitionBytes</code> (default <b>128 MB</b>, mirroring the HDFS block), so a 1 GB Parquet file reads as roughly 8 partitions.",
      "Two configs shape it. <code>maxPartitionBytes</code> caps a partition's size; <code>spark.sql.files.openCostInBytes</code> (default <b>4 MB</b>) is the assumed cost of opening a file, used to <b>pack many small files together</b> into one partition instead of wasting a task per tiny file. So lots of small files don't each become a partition — they're bin-packed up to the max.",
      "<b>Splittability</b> is the catch. A splittable source (Parquet, ORC, or plain/​bzip2 text) can be divided mid-file, so a big file becomes many partitions. A <b>non-splittable</b> file — a single <code>.csv.gz</code> — cannot, so the whole file is <b>one partition and one task</b> no matter its size. That's the usual answer to \"why is my huge read single-threaded?\"",
      "This is the <i>read-side</i> partition count. It's separate from <b>shuffle</b> partitions, which default to <code>spark.sql.shuffle.partitions</code> = <b>200</b> after any wide transformation, and from later <code>repartition</code>/<code>coalesce</code>. Reads set where you start; shuffles and repartition reshape it from there."
    ],

    showMe: {
      code:
        "# One 1 GB splittable Parquet -> ~8 read partitions (1024MB / 128MB):\n" +
        "df = spark.read.parquet('/data/sales')\n" +
        "df.rdd.getNumPartitions()      # ~8\n" +
        "\n" +
        "# Tune the target partition size (smaller = more, smaller partitions):\n" +
        "spark.conf.set('spark.sql.files.maxPartitionBytes', 64*1024*1024)  # 64MB\n" +
        "\n" +
        "# Many tiny files are BIN-PACKED (openCostInBytes) — not one task each:\n" +
        "spark.read.json('/data/lots_of_small/')   # thousands of files -> far fewer partitions\n" +
        "\n" +
        "# NON-splittable: one gzipped CSV = ONE partition, regardless of size\n" +
        "spark.read.csv('/data/huge.csv.gz').rdd.getNumPartitions()   # 1  (single task!)\n" +
        "\n" +
        "# After a wide transform, partition count jumps to the shuffle default:\n" +
        "df.groupBy('country').count().rdd.getNumPartitions()   # 200",
      viz: {
        type: "partitionOps",
        data: { input: [128, 128, 128, 40, 4, 4], keys: ["US", "IN", "UK"] }
      },
      caption:
        "The input partitions are what the read produced (128 MB blocks, plus small files bin-packed). repartition full-shuffles to rebalance, coalesce merges locally without a shuffle, partitionBy is a write-time disk layout — three different ways to reshape what the read handed you."
    },

    whyMatters:
      "<p>Read partitioning explains two of the most common Spark surprises, and it's a frequent interview follow-up to \"how does Spark read a file?\"</p>" +
      "<ul>" +
      "<li><b>\"My big job only uses one core.\"</b> — a non-splittable <code>.csv.gz</code> (or one huge unsplittable file) = one partition = one task. Convert to Parquet or split the input.</li>" +
      "<li><b>\"Thousands of tiny files but few partitions.\"</b> — bin-packing via <code>openCostInBytes</code>; that's Spark being smart, not broken (though the small-files problem still hurts the NameNode/listing).</li>" +
      "<li><b>\"Where does 200 come from?\"</b> — that's the <i>shuffle</i> default, not the read; don't confuse the two.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">splittable big file : ceil(size / maxPartitionBytes[128MB]) partitions\nmany small files    : bin-packed up to maxPartitionBytes (openCostInBytes=4MB)\n.csv.gz (non-split) : 1 partition, 1 task  (the single-core trap)\nafter a shuffle     : spark.sql.shuffle.partitions = 200</pre>",

    recognize: [
      { q: "\"Why did reading this file create N partitions?\"", think: "For a splittable file, ~ceil(size / maxPartitionBytes) (128MB default). Small files are bin-packed together up to that size." },
      { q: "\"My 10 GB read runs as a single task.\"", think: "Non-splittable source — almost certainly a single .csv.gz. Convert to Parquet (or bzip2) so it can be split across tasks." },
      { q: "\"How do I get more parallelism on the read?\"", think: "Lower spark.sql.files.maxPartitionBytes for more, smaller partitions — or repartition after reading if the source can't be split." },
      { q: "\"Thousands of small files became only ~30 partitions.\"", think: "Bin-packing via openCostInBytes packs small files into ~128MB partitions. Efficient for reads, but fix the small-files problem upstream." },
      { q: "\"Why is my partition count exactly 200 after a groupBy?\"", think: "That's spark.sql.shuffle.partitions (the shuffle default), not the read partitioning — a different knob." }
    ],

    matchTags: ["read partitions", "maxpartitionbytes", "opencostinbytes", "splittable", "block size", "128mb",
                "getnumpartitions", "small files", "shuffle partitions", "200", "input split", "parallelism"],

    traps: [
      {
        bad: "spark.read.csv('/data/events.csv.gz')   # 12GB, one partition, one task",
        good: "spark.read.parquet('/data/events/')     # splittable -> many partitions",
        why: "Gzip is not splittable, so the whole file is a single partition and the read can't parallelize. Store as Parquet (splittable, columnar) or, if you must keep text, use bzip2."
      },
      {
        bad: "# assuming 'my file is 1GB' means 1 partition",
        good: "df.rdd.getNumPartitions()   # ~8 for a splittable 1GB file at 128MB",
        why: "A splittable file is divided into ~maxPartitionBytes chunks, so 1 GB is ~8 partitions, not 1. Check getNumPartitions() rather than assuming file-count == partition-count."
      },
      {
        bad: "df.repartition(1000).write.parquet(out)  # after a small read, no reason",
        good: "# size partitions to data + cores; avoid gratuitous shuffles",
        why: "Read partitioning already sized the parallelism sensibly. Slapping repartition(1000) on top forces a full shuffle and produces tiny tasks — cost with no benefit unless you're deliberately rebalancing."
      }
    ],

    complexity: [
      { op: "splittable big file", big_o: "ceil(size / 128MB)", note: "maxPartitionBytes (default 128MB) sets the target chunk; more, smaller partitions if you lower it." },
      { op: "many small files", big_o: "bin-packed to ~128MB", note: "openCostInBytes (4MB) makes Spark pack small files together rather than one task per file." },
      { op: "non-splittable (.gz)", big_o: "1 partition", note: "The whole file is one task regardless of size — the single-core read trap." },
      { op: "after a wide transform", big_o: "200 (default)", note: "spark.sql.shuffle.partitions governs post-shuffle partition count, independent of the read." },
      { op: "repartition(n) / coalesce(n)", big_o: "n partitions", note: "Explicit reshaping after the read; repartition shuffles, coalesce merges without one." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> The <code>FileSourceScanExec</code> planner lists the input files, then builds partitions by walking file splits and packing them until a partition reaches <code>maxPartitionBytes</code>, charging <code>openCostInBytes</code> per file so many tiny files don't each cost a task. Splittable formats expose sub-file split boundaries (Parquet row groups, block-aligned text); non-splittable ones expose only the whole file, forcing one partition.</p>" +
      "<p><b>Two different 'partition' numbers.</b> Read partitioning (above) sets the first stage's task count. <code>spark.sql.shuffle.partitions</code> (default 200) sets every post-shuffle stage's task count. AQE can then coalesce those 200 down to fit the actual data — so the number you see after a shuffle may be smaller.</p>" +
      "<p><b>Practical tuning.</b> Too few read partitions (giant non-splittable files) → under-parallelized; too many tiny ones → scheduling overhead. Aim for partitions in the ~64–256 MB range and fix the small-files problem at the source rather than relying on bin-packing.</p>",

    challenge: {
      prompt:
        "Two reads, same 20 GB of data. Read A: one 20 GB events.csv.gz. Read B: the same data as 160 Parquet files of ~128 MB. On a 100-core cluster, how many tasks does each initial read get, why, and which will finish the scan far faster?",
      starter:
        "# A: spark.read.csv('/data/events.csv.gz')      # one 20GB gzip\n" +
        "# B: spark.read.parquet('/data/events/')        # 160 x ~128MB Parquet\n" +
        "# tasks for each read? which is faster? why?",
      solution:
        "# Read A: 1 task. Gzip is NOT splittable, so the entire 20 GB file is a\n" +
        "#   single partition -> one task on one core. 99 cores sit idle; the scan\n" +
        "#   is effectively single-threaded (and also single-threaded decompression).\n" +
        "#\n" +
        "# Read B: ~160 tasks (one per ~128MB split; Parquet is splittable and\n" +
        "#   already ~maxPartitionBytes-sized). On 100 cores that's ~2 waves, so the\n" +
        "#   scan runs ~100x more in parallel than A.\n" +
        "#\n" +
        "# B finishes the scan dramatically faster. Fix for A: convert to Parquet\n" +
        "# (or at least split into many files / use bzip2). If stuck with A for one\n" +
        "# run, you can repartition AFTER the (still single-threaded) read to\n" +
        "# parallelize the downstream work — but the read itself stays 1 task."
    }
  },

  {
    id: "reading-explain",
    title: "Reading explain()",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "explain() is the ground truth for what Spark will actually do. Learning to read it — bottom-up, spotting Exchanges, PushedFilters, and BroadcastHashJoin — is how you verify a fix instead of hoping.",

    whatIsIt: [
      "<code>df.explain()</code> prints the <b>physical plan</b> Spark will execute; <code>df.explain(True)</code> also shows the parsed, analyzed, and optimized logical plans. You read the physical plan <b>bottom-up</b>: the leaves are the scans, and data flows upward through each operator to the root.",
      "The operators to recognize: <b>Scan</b> (with <code>PushedFilters</code> and the pruned column list), <b>Filter</b>/<b>Project</b> (narrow), <b>Exchange</b> (a shuffle — the thing to minimize), the join operators (<b>BroadcastHashJoin</b> vs <b>SortMergeJoin</b>), and <b>HashAggregate</b> (partial + final). A <code>*</code> prefix (or a WholeStageCodegen box) marks operators fused into generated code.",
      "The two highest-value reads: <b>count the Exchanges</b> — each is a shuffle and a stage boundary, so fewer is better; and <b>check the Scan line</b> for <code>PushedFilters</code> and a short column list, which confirm predicate pushdown and column pruning actually happened.",
      "This is how you <b>verify optimizations rather than assume them</b>. Broadcasted the small side of a join? The plan should say <code>BroadcastHashJoin</code>, not <code>SortMergeJoin</code> (with no Exchange on the big side). Added a filter? It should appear as a <code>PushedFilter</code> on the scan. If a Python UDF sits in the chain, you'll see the filter stuck <i>above</i> it — pushdown blocked."
    ],

    showMe: {
      code:
        "(orders.join(F.broadcast(customers), 'customer_id')\n" +
        "        .select('region', 'amount', 'name')\n" +
        "        .filter(F.col('amount') > 100)).explain()\n" +
        "\n" +
        "# == Physical Plan ==\n" +
        "# *(2) Project [region, amount, name]\n" +
        "# +- *(2) BroadcastHashJoin [customer_id], [customer_id], Inner   <- no Exchange on orders!\n" +
        "#    :- *(2) Filter (amount > 100)\n" +
        "#    :  +- *(2) ColumnarToRow\n" +
        "#    :     +- FileScan parquet orders[customer_id,amount,region]   <- pruned cols\n" +
        "#    :        PushedFilters: [IsNotNull(amount), GreaterThan(amount,100)]  <- pushdown!\n" +
        "#    +- BroadcastExchange HashedRelationBroadcastMode      <- small side broadcast\n" +
        "#       +- FileScan parquet customers[customer_id,name]\n" +
        "#\n" +
        "# Read bottom-up: scans -> filter pushed into orders scan -> broadcast join\n" +
        "# (no shuffle of the big table) -> project. Count Exchanges: 0 shuffles of orders.",
      viz: {
        type: "catalyst",
        data: {
          hint: "Press <b>▶ Optimize</b> to watch the plan explain() prints — filter pushed into the scan, columns pruned, join shrunk. Then toggle a Python UDF to see pushdown hit a wall.",
          written: [
            { t: "FileScan orders", detail: "all columns", why: "As written, nothing has told the scan which columns or rows matter." },
            { t: "FileScan customers", detail: "all columns", why: "Same — the plan reads everything from both sides." },
            { t: "join on customer_id", detail: "SortMergeJoin?", why: "Without a broadcast hint, a large-large join shuffles both sides (an Exchange each) — what you'd see as SortMergeJoin in explain()." },
            { t: "Project region, amount, name", detail: "", why: "Projection lands after the join in the written order." },
            { t: "Filter amount > 100", detail: "runs last ⤵", why: "As typed the filter is last — every row is scanned and joined before most are discarded." }
          ],
          optimized: [
            { t: "FileScan orders", detail: "3 cols · PushedFilters ⤵", changed: true, why: "explain() shows a short column list and PushedFilters: [GreaterThan(amount,100)] — pruning + pushdown confirmed at the scan." },
            { t: "FileScan customers", detail: "customer_id, name", changed: true, why: "Column pruning: only the columns the query needs are read." },
            { t: "BroadcastHashJoin", detail: "no Exchange on orders", changed: true, why: "With the small side broadcast, the big table isn't shuffled — the plan says BroadcastHashJoin, and there's no Exchange above the orders scan." },
            { t: "Project region, amount, name", detail: "cheap", why: "The final projection runs on far fewer rows and columns." }
          ],
          steps: [
            { title: "Check the Scan line", caption: "PushedFilters + a short column list on FileScan = predicate pushdown and column pruning happened.", w: [0, 1], o: [0, 1] },
            { title: "Count the Exchanges", caption: "The filter pushed into the scan; the broadcast means no Exchange on the big side — count 0 shuffles of orders.", w: [4], o: [0] },
            { title: "Read the join type", caption: "BroadcastHashJoin (not SortMergeJoin) confirms the small side was broadcast — exactly what you intended.", w: [2], o: [2] }
          ],
          done: "That's how you verify a fix: explain() shows PushedFilters, pruned columns, and BroadcastHashJoin — proof the optimizations you expected actually happened.",
          udf: {
            optimized: [
              { t: "FileScan orders", detail: "all columns", why: "A downstream Python UDF is opaque, so Catalyst can't prove which columns are unused — nothing is pruned." },
              { t: "FileScan customers", detail: "all columns", why: "Same: no pruning around an opaque UDF." },
              { t: "join on customer_id", detail: "all rows", why: "The filter can't move below the UDF, so the join runs on every row." },
              { t: "🐍 BatchEvalPython keep(amount)", detail: "opaque wall", wall: true, why: "In explain() a Python UDF shows as BatchEvalPython (or ArrowEvalPython) — a wall Catalyst won't push filters through." },
              { t: "Filter keep(amount)", detail: "no PushedFilter", wall: true, why: "The scan line has NO PushedFilters and the full column list — the tell-tale sign a UDF blocked pushdown." }
            ],
            steps: [
              { title: "Spot the UDF operator", caption: "BatchEvalPython/ArrowEvalPython in the plan marks the opaque region Catalyst can't optimize through.", w: [0, 1], o: [0, 1] },
              { title: "No PushedFilters", caption: "With the UDF in the way, the scan shows the full column list and no PushedFilters — pushdown was blocked.", w: [4], o: [3, 4] }
            ],
            done: "Reading explain() catches this instantly: a BatchEvalPython operator plus a scan with no PushedFilters means a UDF killed pushdown. Swap it for F.* built-ins."
          }
        }
      },
      caption:
        "Left: the plan as written. Right: what explain() actually prints — PushedFilters on the scan, pruned columns, BroadcastHashJoin with no Exchange on the big side. Press ▶ Optimize to walk the reads; toggle 🐍 to see the UDF wall (BatchEvalPython, no PushedFilters)."
    },

    whyMatters:
      "<p>explain() turns tuning from guesswork into verification. Interviewers love \"how would you confirm your join is broadcasting?\" — the answer is \"read the plan,\" and knowing the operators proves you've actually done it.</p>" +
      "<ul>" +
      "<li><b>Count Exchanges</b> — each is a shuffle/stage boundary; a fix that removes one is a real win you can see.</li>" +
      "<li><b>Check the Scan</b> — <code>PushedFilters</code> + a short column list confirm pushdown and pruning; their absence flags a UDF or an un-pushable predicate.</li>" +
      "<li><b>Read the join type</b> — <code>BroadcastHashJoin</code> vs <code>SortMergeJoin</code> tells you whether your broadcast took effect.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">read bottom-up: leaves (FileScan) -> up to the root\nExchange        = shuffle (count them; fewer is better)\nPushedFilters   = predicate pushdown worked\nshort col list  = column pruning worked\nBroadcastHashJoin vs SortMergeJoin = did my broadcast happen?\nBatchEvalPython = a Python UDF (blocks pushdown)</pre>",

    recognize: [
      { q: "\"How do I confirm my join is broadcasting?\"", think: "explain() — look for BroadcastHashJoin and the absence of an Exchange on the big side. SortMergeJoin means it didn't broadcast." },
      { q: "\"Did my filter actually push down?\"", think: "Check the FileScan line for PushedFilters: [...]. If the predicate isn't there, it didn't push (often a UDF or a non-pushable expression)." },
      { q: "\"How many shuffles does my query do?\"", think: "Count the Exchange nodes in the physical plan — that's your shuffle (and stage-boundary) count." },
      { q: "\"Why isn't pushdown/pruning happening?\"", think: "Look for BatchEvalPython/ArrowEvalPython — a Python UDF is an opaque wall. The scan will show all columns and no PushedFilters." },
      { q: "\"What does the * / WholeStageCodegen mean in the plan?\"", think: "Those operators were fused into one generated Java function (Tungsten whole-stage codegen) — good; it means no per-row interpretation overhead there." }
    ],

    matchTags: ["explain", "physical plan", "logical plan", "exchange", "pushedfilters", "predicate pushdown",
                "column pruning", "broadcasthashjoin", "sortmergejoin", "wholestagecodegen", "batchevalpython", "catalyst", "diagnose"],

    traps: [
      {
        bad: "# assuming a broadcast happened because you wrote F.broadcast(dim)",
        good: "joined.explain()  # confirm 'BroadcastHashJoin' + no Exchange on the big side",
        why: "A broadcast hint can be ignored if the 'small' side exceeds the broadcast threshold. Only the plan tells you the truth — verify BroadcastHashJoin instead of assuming it."
      },
      {
        bad: "# tuning by trial and error, re-running the whole job each time",
        good: "df.explain()  # read the plan first: Exchanges, PushedFilters, join type",
        why: "explain() is nearly free and shows the plan without running the job. Reading it first tells you what to fix, instead of guessing across expensive full runs."
      },
      {
        bad: "df.filter(my_python_udf('amount')).explain()  # expecting a PushedFilter",
        good: "df.filter(F.col('amount') > 100).explain()    # pushes down; UDF does not",
        why: "A Python UDF shows as BatchEvalPython and blocks pushdown — the scan will list all columns and no PushedFilters. Built-in F.* expressions push down; UDFs don't."
      }
    ],

    complexity: [
      { op: "explain() / explain(True)", big_o: "O(1), no job", note: "Prints the plan without executing; explain(True) adds parsed/analyzed/optimized logical plans." },
      { op: "Exchange", big_o: "shuffle", note: "Each one is a shuffle and a stage boundary — the primary thing to count and reduce." },
      { op: "FileScan PushedFilters", big_o: "rows dropped at scan", note: "Confirms predicate pushdown; fewer rows leave storage before the rest of the plan." },
      { op: "BroadcastHashJoin", big_o: "no big-side shuffle", note: "Small side broadcast to every executor; verify it appears instead of SortMergeJoin." },
      { op: "BatchEvalPython", big_o: "row-by-row UDF", note: "A Python UDF boundary — opaque to Catalyst, blocks pushdown and codegen through it." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>explain()</code> prints <code>SparkPlan</code> (the physical plan); <code>explain(True)</code> prints all four stages Catalyst produces — parsed, analyzed, optimized logical plans, then the selected physical plan. Reading bottom-up follows data flow: leaves are <code>FileScan</code>/<code>Scan</code> nodes, and each parent consumes its children's output.</p>" +
      "<p><b>Key markers.</b> <code>Exchange</code> = a shuffle (hashpartitioning or rangepartitioning). <code>*(n)</code> prefixes and <code>WholeStageCodegen (n)</code> boxes mark operators compiled into one generated function. On <code>FileScan</code>, <code>PushedFilters</code> and <code>ReadSchema</code> reveal what was pushed and pruned. <code>BroadcastExchange</code> + <code>BroadcastHashJoin</code> confirm a broadcast join; <code>SortMergeJoin</code> means both sides shuffled.</p>" +
      "<p><b>With AQE.</b> After execution, the SQL tab shows the <i>final</i> adaptive plan with <code>AdaptiveSparkPlan isFinalPlan=true</code> and any <code>AQEShuffleRead</code> coalescing — the plan explain() prints up front is the pre-AQE version, so cross-check the UI for what actually ran.</p>",

    challenge: {
      prompt:
        "You broadcast a dimension table (F.broadcast(dim)) to speed a join, but the job is as slow as before. explain() shows: SortMergeJoin, an Exchange above BOTH scans, and the fact scan lists all 30 columns with no PushedFilters (there's a BatchEvalPython node just below the filter). Name the two problems the plan reveals and the fix for each.",
      starter:
        "fact.filter(clean_udf('status')=='OK') \\\n" +
        "    .join(F.broadcast(dim), 'dim_id').explain()\n" +
        "# plan: SortMergeJoin + Exchange on both sides; FileScan fact[30 cols], no PushedFilters;\n" +
        "#       BatchEvalPython below the filter. why slow? two fixes?",
      solution:
        "# Problem 1 — the broadcast didn't take. explain() shows SortMergeJoin with\n" +
        "#   an Exchange on BOTH sides, not BroadcastHashJoin. The 'dim' table is\n" +
        "#   above spark.sql.autoBroadcastJoinThreshold (default 10MB), so Spark\n" +
        "#   ignored the hint and shuffled both sides.\n" +
        "#   Fix: raise the threshold if dim really is small\n" +
        "#     spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 50*1024*1024)\n" +
        "#   or shrink dim (select only join key + needed cols) so it fits.\n" +
        "\n" +
        "# Problem 2 — no pushdown/pruning. The scan lists all 30 columns and has\n" +
        "#   NO PushedFilters, with a BatchEvalPython (Python UDF) below the filter.\n" +
        "#   The UDF is an opaque wall: the filter can't push into the scan and\n" +
        "#   columns can't be pruned around it.\n" +
        "#   Fix: replace the UDF with a built-in expression:\n" +
        "fact.filter(F.col('status') == 'OK') \\\n" +
        "    .select('dim_id', 'amount', 'status') \\\n" +
        "    .join(F.broadcast(dim.select('dim_id', 'name')), 'dim_id')\n" +
        "# Now explain() should show PushedFilters:[EqualTo(status,OK)], a pruned\n" +
        "# column list, and BroadcastHashJoin with no Exchange on the fact side."
    }
  }
]);
