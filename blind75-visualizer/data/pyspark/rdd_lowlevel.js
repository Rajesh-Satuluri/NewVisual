/*
 * PySpark Interview Lab — RDD & Low-Level API. The pre-DataFrame layer that
 * interviews still probe for depth: word count, reduceByKey vs groupByKey,
 * RDD<->DataFrame conversion, and mapPartitions. Modern jobs are DataFrame-first,
 * so these are "know it, reach for DataFrames" problems.
 */
(function () {
  var CAT = "RDD & Low-Level API";
  window.PYSPARK.register(CAT, [

    {
      id: "rdd-word-count",
      lc: 297,
      title: "Word count with the RDD API",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "RDD map/reduce", transformation: "Wide (shuffle)", functions: "flatMap, map, reduceByKey" },
      description:
        "The classic. Given a text file, count occurrences of each word using the **RDD API**, and do it efficiently (combine before the shuffle).",
      examples: [
        { input: "'to be or to be'", output: "(to,2),(be,2),(or,1)", reasoning: "flatMap splits to words, map pairs each with 1, reduceByKey sums per word with a map-side combine." }
      ],
      approaches: [
        {
          name: "flatMap → map → reduceByKey",
          whenToUse: "The canonical RDD aggregation shape.",
          logic:
            "**What it asks.** Per-word counts via RDDs, with minimal shuffle.\n\n" +
            "**Key Idea.** `flatMap` explodes lines into words, `map` makes `(word, 1)`, `reduceByKey` sums per key — combining each partition **before** the shuffle.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `textFile` → lines.\n" +
            "2. `flatMap(split)` → words; `map(w -> (w,1))`.\n" +
            "3. `reduceByKey(add)` → (word, total).\n\n" +
            "**Why it works.** reduceByKey pre-aggregates locally, so only one partial per word crosses the network.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `reduceByKey`, not `groupByKey().mapValues(sum)` (see next problem).\n" +
            "- Normalize case/punctuation if the spec needs it.\n\n" +
            "**Interview mindset.** Mention the map-side combine as the reason it scales.",
          rcs:
            "from operator import add\n" +
            "counts = (sc.textFile('/data/book.txt')\n" +
            "            .flatMap(lambda line: line.split())   # lines -> words\n" +
            "            .map(lambda w: (w, 1))                 # word -> (word, 1)\n" +
            "            .reduceByKey(add))                     # sum per word (map-side combine)\n" +
            "counts.take(5)",
          plain:
            "from operator import add\n" +
            "counts = (sc.textFile('/data/book.txt')\n" +
            "            .flatMap(lambda line: line.split())\n" +
            "            .map(lambda w: (w, 1))\n" +
            "            .reduceByKey(add))"
        }
      ],
      sparkInternals:
        "reduceByKey runs a combiner in the map task's shuffle-write path, so per-partition partials (not raw pairs) are shuffled. The equivalent DataFrame is `df.groupBy('word').count()`, which plans a HashAggregate with the same partial+final phases automatically.",
      sparkSql:
        "SELECT word, COUNT(*) FROM (SELECT explode(split(line,' ')) AS word FROM lines)\nGROUP BY word;",
      recognizeRecall: [
        "**Spot it:** \"word count / count occurrences with RDDs\".",
        "**Say it:** flatMap → map(w,1) → reduceByKey(add).",
        "**Trap:** prefer reduceByKey over groupByKey for the combine."
      ]
    },

    {
      id: "rdd-reducebykey-vs-groupbykey",
      lc: 298,
      title: "Average per key: reduceByKey vs groupByKey",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "RDD aggregation", transformation: "Wide (shuffle)", functions: "reduceByKey, aggregateByKey, groupByKey" },
      description:
        "Compute the **average value per key** from an RDD of `(key, value)` pairs — the efficient way (map-side combine), not `groupByKey`. Note the twist: an average needs both a sum and a count.",
      examples: [
        { input: "(a,10),(a,20),(b,5)", output: "(a,15.0),(b,5.0)", reasoning: "Carry (sum,count) through reduceByKey, then divide — combines per partition, unlike groupByKey which shuffles every value." }
      ],
      approaches: [
        {
          name: "Carry (sum, count) through reduceByKey",
          whenToUse: "Any keyed average/mean over an RDD.",
          logic:
            "**What it asks.** Mean per key without shuffling every raw value.\n\n" +
            "**Key Idea.** Average isn't directly reducible, but `(sum, count)` is. Map each value to `(v, 1)`, `reduceByKey` by summing both components (map-side combine), then divide.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `map(lambda (k,v): (k, (v, 1)))`.\n" +
            "2. `reduceByKey(lambda a,b: (a[0]+b[0], a[1]+b[1]))`.\n" +
            "3. `mapValues(lambda sc: sc[0]/sc[1])`.\n\n" +
            "**Why it works.** Sum and count are both associative/commutative, so they combine per partition; only partials shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- `groupByKey().mapValues(mean)` shuffles every value → OOM on a hot key.\n" +
            "- `aggregateByKey` does the same with explicit zero/seq/comb functions.\n\n" +
            "**Interview mindset.** 'Make the average reducible by carrying (sum,count).'",
          rcs:
            "avg = (pairs\n" +
            "    .map(lambda kv: (kv[0], (kv[1], 1)))                 # (k, (value, 1))\n" +
            "    .reduceByKey(lambda a, b: (a[0]+b[0], a[1]+b[1]))    # sum & count, combined\n" +
            "    .mapValues(lambda s: s[0] / s[1]))                   # sum/count = mean\n" +
            "avg.collect()",
          plain:
            "avg = (pairs\n" +
            "    .map(lambda kv: (kv[0], (kv[1], 1)))\n" +
            "    .reduceByKey(lambda a, b: (a[0]+b[0], a[1]+b[1]))\n" +
            "    .mapValues(lambda s: s[0] / s[1]))"
        }
      ],
      sparkInternals:
        "reduceByKey/aggregateByKey combine map-side, so the shuffle carries one `(sum,count)` partial per key per partition. groupByKey has no combiner: it shuffles every value and the reduce side must hold all of a key's values in memory — the OOM-on-skew failure mode. The DataFrame `groupBy(k).avg(v)` gets the combine for free.",
      sparkSql:
        "SELECT key, AVG(value) FROM pairs GROUP BY key;",
      recognizeRecall: [
        "**Spot it:** \"average/mean per key with RDDs\".",
        "**Say it:** carry (sum,count) via reduceByKey, then divide.",
        "**Trap:** groupByKey shuffles all values → OOM on hot keys."
      ]
    },

    {
      id: "rdd-to-dataframe",
      lc: 299,
      title: "Convert an RDD to a DataFrame",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "RDD ↔ DataFrame", transformation: "Narrow", functions: "toDF, createDataFrame, Row, StructType" },
      description:
        "You have an RDD of tuples `(name, age)` produced by low-level parsing. Convert it to a **DataFrame with a proper schema** so you can use the DataFrame API / SQL from here on.",
      examples: [
        { input: "rdd = [('alice', 30), ('bob', 25)]", output: "DataFrame[name: string, age: int]", reasoning: "Attach column names and types via toDF/createDataFrame with an explicit schema." }
      ],
      approaches: [
        {
          name: "createDataFrame with an explicit schema",
          whenToUse: "Bridging low-level RDD work into the DataFrame world.",
          logic:
            "**What it asks.** Give a tuple RDD names and types as a DataFrame.\n\n" +
            "**Key Idea.** `spark.createDataFrame(rdd, schema)` (or `rdd.toDF([...])`) attaches structure. Prefer an **explicit schema** so types/nullability are pinned rather than inferred from the first rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build a `StructType` (name:string, age:int).\n" +
            "2. `spark.createDataFrame(rdd, schema)`.\n" +
            "3. Continue with DataFrame ops / register a temp view.\n\n" +
            "**Why it works.** The RDD's tuples map positionally to the declared fields, producing a schema-carrying DataFrame that Catalyst can optimize.\n\n" +
            "**Common Gotchas.**\n" +
            "- `toDF()` without a schema infers from a sample — can mistype.\n" +
            "- Go the other way with `df.rdd` when you truly need the RDD API.\n\n" +
            "**Interview mindset.** 'Convert early — DataFrames get Catalyst + codegen the RDD doesn't.'",
          rcs:
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "schema = StructType([StructField('name', StringType()),\n" +
            "                     StructField('age', IntegerType())])\n" +
            "df = spark.createDataFrame(rdd, schema)   # tuples -> typed columns\n" +
            "df.printSchema(); df.show()",
          plain:
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "schema = StructType([StructField('name', StringType()), StructField('age', IntegerType())])\n" +
            "df = spark.createDataFrame(rdd, schema)"
        }
      ],
      sparkInternals:
        "createDataFrame wraps the RDD in a logical relation with the given schema; from that point Catalyst and Tungsten apply. `df.rdd` converts back (deserializing rows into JVM/Python objects), losing the optimizer — so only drop to RDDs for logic the DataFrame API can't express, then convert back.",
      sparkSql:
        "-- After conversion: df.createOrReplaceTempView('people');\n-- SELECT name, age FROM people;",
      recognizeRecall: [
        "**Spot it:** \"turn an RDD of tuples into a DataFrame\".",
        "**Say it:** createDataFrame(rdd, StructType) (or rdd.toDF(names)).",
        "**Trap:** prefer explicit schema over inference; df.rdd goes back."
      ]
    },

    {
      id: "rdd-mappartitions",
      lc: 300,
      title: "mapPartitions for per-partition setup",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Partition-level RDD op", transformation: "Narrow", functions: "mapPartitions, map" },
      description:
        "You must enrich each record with a lookup that requires an **expensive per-call setup** (open a client / load a model). Doing it in `map` re-creates the resource for every row. Rewrite so the setup happens **once per partition**.",
      examples: [
        { input: "1M rows, a client that costs 50ms to construct", output: "map: 1M constructions; mapPartitions: ~#partitions constructions", reasoning: "mapPartitions runs the function once per partition over an iterator, so setup is amortized across all rows in that partition." }
      ],
      approaches: [
        {
          name: "mapPartitions: set up once, process the iterator",
          whenToUse: "Expensive per-record setup (connections, models, buffers).",
          logic:
            "**What it asks.** Amortize an expensive setup across a partition's rows.\n\n" +
            "**Key Idea.** `map` calls your function **per row**; `mapPartitions` calls it **per partition**, handing you an iterator of that partition's rows. Do the costly setup once at the top, then yield per row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `f(rows)` that builds the client once, then loops `rows`.\n" +
            "2. `rdd.mapPartitions(f)`.\n" +
            "3. Yield transformed records lazily.\n\n" +
            "**Why it works.** Setup cost is paid ~once per partition instead of once per row — a huge win when there are millions of rows and few partitions.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return/yield an iterator, not a list, to stay memory-friendly.\n" +
            "- The DataFrame analog for expensive vectorizable work is a `pandas_udf` (batches per partition).\n\n" +
            "**Interview mindset.** 'mapPartitions amortizes per-partition setup; pandas_udf is the DataFrame equivalent.'",
          rcs:
            "def enrich(rows):\n" +
            "    client = build_client()          # ONCE per partition\n" +
            "    for r in rows:\n" +
            "        yield (r[0], client.lookup(r[0]))\n" +
            "result = rdd.mapPartitions(enrich)   # not map() -> avoids 1M setups",
          plain:
            "def enrich(rows):\n" +
            "    client = build_client()\n" +
            "    for r in rows:\n" +
            "        yield (r[0], client.lookup(r[0]))\n" +
            "result = rdd.mapPartitions(enrich)"
        }
      ],
      sparkInternals:
        "Both map and mapPartitions are narrow transformations, but map wraps a per-element call while mapPartitions passes the whole partition iterator to your closure. That lets you hoist expensive initialization out of the per-row path. In the DataFrame world, a `pandas_udf` (grouped/scalar) is the vectorized equivalent — it receives batches per partition rather than one row at a time.",
      sparkSql:
        "-- No SQL equivalent; it's an executor-side resource-amortization pattern.\n-- DataFrame analog for vectorized work: a pandas_udf.",
      recognizeRecall: [
        "**Spot it:** \"expensive setup per row / open a connection per record\".",
        "**Say it:** mapPartitions — build the resource once, iterate the partition.",
        "**Trap:** yield an iterator; pandas_udf is the DataFrame analog."
      ]
    }

  ]);
})();
