/*
 * PySpark Interview Lab — Performance & Optimization (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Theme: control the shuffle. Broadcast small sides, salt hot keys, prune
 * partitions on read, partition on write, filter before joining, and know
 * repartition (full shuffle) vs coalesce (narrow) — read the plan to confirm.
 */
(function () {
  var CAT = "Performance & Optimization";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q141
    {
      id: "broadcast-fact-dimension-join",
      lc: 141,
      title: "Broadcast join a large fact with a small dimension",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Broadcast (map-side) join", transformation: "Narrow (broadcast)", functions: "broadcast, join" },
      description:
        "Given a large `fact` DataFrame (e.g. `sales` with `product_id`, `amount`) and a small `dim` DataFrame (e.g. `products` with `product_id`, `category`), implement the join so the **large side is never shuffled**. Wrap the small side in `broadcast()` so Spark ships it to every executor and joins locally.",
      examples: [
        {
          input: "fact: millions of rows keyed by product_id; dim: ~500 products (product_id, category)",
          output: "The plan shows BroadcastHashJoin — dim is broadcast, fact stays on its existing partitions.",
          reasoning: "The tiny dim table fits in memory, so shipping a copy to each executor is far cheaper than hash-partitioning the huge fact table across the cluster."
        }
      ],
      approaches: [
        {
          name: "wrap the small side in broadcast()",
          whenToUse: "One side of the join is small enough to fit in each executor's memory (roughly under a few hundred MB).",
          logic:
            "**What it asks.** Join a huge fact to a tiny dimension without shuffling the fact.\n\n" +
            "**Key Idea.** `fact.join(broadcast(dim), on='product_id', how='inner')`. `broadcast()` forces a **broadcast hash join**: the small side is collected to the driver, shipped to every executor, and probed locally by each fact partition — no shuffle of the large side.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Identify the small side (`dim`).\n" +
            "2. `from pyspark.sql.functions import broadcast`.\n" +
            "3. `fact.join(broadcast(dim), on='product_id', how='inner')`.\n" +
            "4. `explain()` and confirm you see `BroadcastHashJoin`.\n\n" +
            "**Why it works.** Replacing the shuffle with an in-memory hash lookup removes the most expensive part of the join; the fact table is read and probed in place.\n\n" +
            "**Common Gotchas.**\n" +
            "- Only broadcast a side that comfortably fits in memory — broadcasting something large OOMs the driver or executors.\n" +
            "- Spark auto-broadcasts any side under `spark.sql.autoBroadcastJoinThreshold` (default 10MB); the hint forces it when stats are missing or the side is a bit larger.\n" +
            "- Set the threshold to `-1` to disable auto-broadcast entirely (useful when debugging).\n\n" +
            "**Interview mindset.** Volunteer 'broadcast join' for any large-fact / small-dimension lookup — it is the single most common join optimization.",
          rcs:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "result = fact.join(                    # large fact table (not shuffled)\n" +
            "    broadcast(dim),                    # small dim shipped to every executor\n" +
            "    on='product_id',                   # shared key -> single output column\n" +
            "    how='inner',\n" +
            ")\n" +
            "result.explain()                       # expect BroadcastHashJoin in the plan\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "result = fact.join(broadcast(dim), on='product_id', how='inner')\n" +
            "result.explain()\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A default equi-join is **wide**: both sides are hash-partitioned by the key (sort-merge join), and the shuffle of the huge fact table dominates the cost. `broadcast(dim)` turns it **narrow**: the small side is materialized on the driver, broadcast to every executor as a hash table, and each fact partition probes it locally — the fact is never moved. Spark auto-broadcasts sides under `spark.sql.autoBroadcastJoinThreshold` (default 10MB) using table statistics; the hint overrides missing/underestimated stats. AQE can also convert a sort-merge join to a broadcast join at runtime once it sees the actual shuffle sizes. The optimization scales with how lopsided the two sides are.",
      sparkSql:
        "SELECT /*+ BROADCAST(dim) */ f.product_id, f.amount, dim.category\n" +
        "FROM fact f JOIN dim ON f.product_id = dim.product_id;",
      recognizeRecall: [
        "**Spot it:** \"large fact joined to a small lookup/dimension\", \"avoid shuffling the big table\".",
        "**Say it:** `fact.join(broadcast(dim), on='key')` -> BroadcastHashJoin, no shuffle of the fact.",
        "**Trap:** only broadcast what fits in memory; a too-large broadcast OOMs the driver/executors."
      ]
    },

    // ------------------------------------------------------------------ Q142
    {
      id: "salting-skewed-customer-join",
      lc: 142,
      title: "Fix a skewed customer_id join with salting",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Salting for skew", transformation: "Wide (shuffle)", functions: "rand, concat, explode, lit" },
      description:
        "A join (or aggregation) on `customer_id` is slow because a few `customer_id` values are **hot** — they carry a hugely disproportionate share of rows, so one or two partitions do most of the work (data skew). First **identify** the skewed keys by counting rows per `customer_id`, then rewrite the join using **salting**: append a random salt to the hot key on the big side, and **explode** the small side across every salt value so matches still line up.",
      examples: [
        {
          input: "orders: 90% of rows have customer_id=7; customers: one row per customer_id",
          output: "After salting with N=10, the rows for customer 7 spread across 10 salted keys (7_0..7_9), so 10 partitions share the load instead of 1.",
          reasoning: "The salt splits one giant key group into N smaller groups; exploding the small side to all N salts guarantees every big-side row still finds its match."
        }
      ],
      approaches: [
        {
          name: "identify hot keys, then salt-and-explode",
          whenToUse: "A single stage runs far longer than the rest and the Spark UI shows one/two partitions with most of the records — classic key skew.",
          logic:
            "**What it asks.** Find the keys causing skew, then join without letting one partition do all the work.\n\n" +
            "**Key Idea.** (1) `groupBy('customer_id').count().orderBy(desc('count'))` reveals the hot keys. (2) **Salting**: on the big side add `salt = floor(rand()*N)` and build `customer_id_salted = concat(customer_id, '_', salt)`; on the small side, **explode** a range of `0..N-1` into a `salt` column and build the same salted key. Join on `customer_id_salted` so each hot key is split into N partitions, then aggregate and (if needed) re-aggregate to strip the salt.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Diagnose: `orders.groupBy('customer_id').count().orderBy(col('count').desc()).show()`.\n" +
            "2. Pick a salt factor `N` (e.g. 10) covering the hot keys.\n" +
            "3. Big side: `withColumn('salt', (rand()*N).cast('int'))`, then `withColumn('cust_salted', concat(col('customer_id'), lit('_'), col('salt')))`.\n" +
            "4. Small side: `withColumn('salt', explode(array([lit(i) for i in range(N)])))`, then the same `cust_salted`.\n" +
            "5. Join on `cust_salted`; aggregate as usual.\n\n" +
            "**Why it works.** The random salt spreads one oversized key group across N partitions, so the shuffle load is balanced; exploding the small side to every salt value preserves correctness — every big-side row still finds its (salted) partner.\n\n" +
            "**Common Gotchas.**\n" +
            "- You must explode the **small** side across all N salts, or salted rows on the big side lose their match.\n" +
            "- Salt only the hot keys (or all keys) — over-salting cold keys wastes work; a common refinement salts only keys above a count threshold.\n" +
            "- Modern Spark: enable **AQE skew join** (`spark.sql.adaptive.skewJoin.enabled=true`) which splits skewed partitions automatically — mention it as the built-in alternative.\n\n" +
            "**Interview mindset.** Say the words 'data skew' and 'salting', and stress the explode-the-small-side step — that is the correctness half most candidates forget.",
          rcs:
            "from pyspark.sql.functions import col, rand, concat, lit, explode, array\n" +
            "\n" +
            "# 1) Identify the skewed keys\n" +
            "orders.groupBy('customer_id').count() \\\n" +
            "    .orderBy(col('count').desc()).show()          # hot keys sit at the top\n" +
            "\n" +
            "N = 10                                            # salt factor\n" +
            "\n" +
            "# 2) Big side: attach a random salt and a salted key\n" +
            "orders_salted = (orders\n" +
            "    .withColumn('salt', (rand() * N).cast('int'))\n" +
            "    .withColumn('cust_salted',\n" +
            "                concat(col('customer_id'), lit('_'), col('salt'))))\n" +
            "\n" +
            "# 3) Small side: explode across ALL salts so every match survives\n" +
            "customers_salted = (customers\n" +
            "    .withColumn('salt', explode(array([lit(i) for i in range(N)])))\n" +
            "    .withColumn('cust_salted',\n" +
            "                concat(col('customer_id'), lit('_'), col('salt'))))\n" +
            "\n" +
            "# 4) Join on the salted key -> load spread across N partitions\n" +
            "result = orders_salted.join(customers_salted, on='cust_salted', how='inner')\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, rand, concat, lit, explode, array\n" +
            "\n" +
            "orders.groupBy('customer_id').count() \\\n" +
            "    .orderBy(col('count').desc()).show()\n" +
            "\n" +
            "N = 10\n" +
            "\n" +
            "orders_salted = (orders\n" +
            "    .withColumn('salt', (rand() * N).cast('int'))\n" +
            "    .withColumn('cust_salted',\n" +
            "                concat(col('customer_id'), lit('_'), col('salt'))))\n" +
            "\n" +
            "customers_salted = (customers\n" +
            "    .withColumn('salt', explode(array([lit(i) for i in range(N)])))\n" +
            "    .withColumn('cust_salted',\n" +
            "                concat(col('customer_id'), lit('_'), col('salt'))))\n" +
            "\n" +
            "result = orders_salted.join(customers_salted, on='cust_salted', how='inner')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Skew is a **shuffle** problem: a hash join/aggregate partitions by `customer_id`, so all rows for one key land on a single partition (and one task). A hot key makes that task run orders of magnitude longer than the rest — the whole stage waits on the straggler. **Salting** changes the effective key from `customer_id` to `customer_id + salt`, so one giant hash bucket becomes N balanced buckets and the load spreads across N tasks. The cost is that the small side must be replicated N-fold (the `explode`), which is cheap because it is small. Since Spark 3, **Adaptive Query Execution** can detect skewed shuffle partitions at runtime and split them automatically (`spark.sql.adaptive.enabled` + `spark.sql.adaptive.skewJoin.enabled`); manual salting is still the go-to when AQE is off or the skew is in an aggregation it does not handle.",
      sparkSql:
        "SELECT o.customer_id, COUNT(*) AS n\n" +
        "FROM orders o\n" +
        "GROUP BY o.customer_id\n" +
        "ORDER BY n DESC;",
      recognizeRecall: [
        "**Spot it:** \"one task/partition takes forever\", \"a few keys dominate\", \"data skew on customer_id\".",
        "**Say it:** salt the hot key on the big side, explode the small side across all salts, join on the salted key.",
        "**Trap:** forgetting to explode the small side breaks correctness; also mention AQE skewJoin as the built-in fix."
      ]
    },

    // ------------------------------------------------------------------ Q145
    {
      id: "partitioned-parquet-write-year-month",
      lc: 145,
      title: "Write sales partitioned by year and month as Parquet",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Partitioned write", transformation: "Narrow (write)", functions: "partitionBy, write.parquet, year, month" },
      description:
        "Given a `sales` DataFrame with an `order_date` (and `amount`), write it to disk as **Parquet partitioned by year and month** so that downstream reads can prune to specific periods. Derive `sale_year`/`sale_month` from the date, then use `.write.partitionBy(...).parquet(path)`.",
      examples: [
        {
          input: "sales rows spanning 2023-2024, written to /data/sales",
          output: "Directory layout: /data/sales/sale_year=2023/sale_month=1/part-*.parquet, .../sale_year=2024/sale_month=12/...",
          reasoning: "partitionBy encodes the partition columns as directory names (Hive-style), so each year/month lives in its own folder and can be skipped on read."
        }
      ],
      approaches: [
        {
          name: "derive year/month, then write.partitionBy",
          whenToUse: "Output will be queried by time range and you want cheap partition pruning later.",
          logic:
            "**What it asks.** Persist sales as Parquet laid out by year and month.\n\n" +
            "**Key Idea.** Add partition columns with `year()`/`month()` on `order_date`, then `df.write.partitionBy('sale_year', 'sale_month').mode('overwrite').parquet(path)`. Spark writes one directory per distinct (year, month), Hive-style (`sale_year=2024/sale_month=3`).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `withColumn('sale_year', year('order_date'))` and `withColumn('sale_month', month('order_date'))`.\n" +
            "2. `.write.partitionBy('sale_year', 'sale_month')`.\n" +
            "3. `.mode('overwrite').parquet('/data/sales')`.\n\n" +
            "**Why it works.** `partitionBy` physically groups rows by the partition columns into separate folders; the column values become directory names and are dropped from the data files, enabling later partition pruning.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do not partition on a **high-cardinality** column (e.g. `customer_id`) — it creates millions of tiny files (the 'small files problem').\n" +
            "- Partition columns are stored as directory names, not inside the Parquet files; on read Spark reconstructs them.\n" +
            "- Consider `repartition('sale_year', 'sale_month')` before writing to avoid many small files per partition.\n\n" +
            "**Interview mindset.** Choose partition columns by how the data will be **queried** (time range) and keep cardinality low.",
          rcs:
            "from pyspark.sql.functions import year, month\n" +
            "\n" +
            "out = (sales\n" +
            "    .withColumn('sale_year', year('order_date'))    # partition col 1\n" +
            "    .withColumn('sale_month', month('order_date')))  # partition col 2\n" +
            "\n" +
            "(out.write\n" +
            "    .partitionBy('sale_year', 'sale_month')          # one folder per (year, month)\n" +
            "    .mode('overwrite')\n" +
            "    .parquet('/data/sales'))",
          plain:
            "from pyspark.sql.functions import year, month\n" +
            "\n" +
            "out = (sales\n" +
            "    .withColumn('sale_year', year('order_date'))\n" +
            "    .withColumn('sale_month', month('order_date')))\n" +
            "\n" +
            "(out.write\n" +
            "    .partitionBy('sale_year', 'sale_month')\n" +
            "    .mode('overwrite')\n" +
            "    .parquet('/data/sales'))"
        }
      ],
      sparkInternals:
        "`partitionBy` is a **write-time** layout, not a shuffle: each task writes its rows into the appropriate `col=value` subdirectory, so a task holding many distinct (year, month) values emits many small files. That is why a pre-write `repartition('sale_year','sale_month')` (or `spark.sql.maxRecordsPerFile`) is common — it consolidates each partition's rows into fewer, larger Parquet files. On read, Hive-style directory names let Catalyst do **partition pruning**: a filter on `sale_year`/`sale_month` skips whole folders without opening files. Partition columns are encoded only in the path, keeping the data files smaller. High-cardinality partition keys are the classic anti-pattern — they explode the file count and metadata overhead.",
      sparkSql:
        "CREATE TABLE sales_partitioned\n" +
        "USING parquet\n" +
        "PARTITIONED BY (sale_year, sale_month)\n" +
        "AS SELECT amount, YEAR(order_date) AS sale_year, MONTH(order_date) AS sale_month\n" +
        "FROM sales;",
      recognizeRecall: [
        "**Spot it:** \"write partitioned by year/month\", \"lay out output for time-range queries\".",
        "**Say it:** derive year/month, `df.write.partitionBy('sale_year','sale_month').parquet(path)`.",
        "**Trap:** never partition on a high-cardinality column — it creates millions of tiny files."
      ]
    },

    // ------------------------------------------------------------------ Q146
    {
      id: "partition-pruning-read",
      lc: 146,
      title: "Read only the needed year/month partitions (pruning)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Partition pruning", transformation: "Narrow (read)", functions: "read.parquet, filter (partition cols)" },
      description:
        "Given a Parquet dataset partitioned by `sale_year`/`sale_month` (as written in the previous problem), read **only** the partitions you need — e.g. March 2024 — so Spark opens just those directories. Filter on the **partition columns** and let Catalyst prune the rest.",
      examples: [
        {
          input: "Dataset at /data/sales partitioned by sale_year, sale_month; want sale_year=2024, sale_month=3",
          output: "Only /data/sales/sale_year=2024/sale_month=3/ is scanned; other folders are never opened.",
          reasoning: "A filter on partition columns is pushed into file listing, so Spark skips non-matching directories entirely (partition pruning)."
        }
      ],
      approaches: [
        {
          name: "filter on partition columns after read.parquet",
          whenToUse: "Reading a partitioned dataset but only a slice of the partitions is needed.",
          logic:
            "**What it asks.** Scan only the relevant year/month folders.\n\n" +
            "**Key Idea.** Read the dataset root and immediately filter on the partition columns: `spark.read.parquet('/data/sales').filter((col('sale_year')==2024) & (col('sale_month')==3))`. Because `sale_year`/`sale_month` are partition columns, Catalyst prunes to just those directories before any file is read.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `df = spark.read.parquet('/data/sales')` (Spark discovers the partition schema).\n" +
            "2. `df.filter((col('sale_year') == 2024) & (col('sale_month') == 3))`.\n" +
            "3. `explain()` — check `PartitionFilters` and a reduced number of files scanned.\n\n" +
            "**Why it works.** Partition pruning happens during file listing: only directories matching the predicate are enumerated, so the pruned data is never read from disk.\n\n" +
            "**Common Gotchas.**\n" +
            "- Filter on the **partition columns** to prune; filtering on a non-partition column only does row-level pushdown, not directory skipping.\n" +
            "- Pointing `read.parquet` directly at `/data/sales/sale_year=2024/sale_month=3` also works but you lose the partition columns unless you use `basePath`.\n" +
            "- Verify pruning in `explain()` under `PartitionFilters` — do not assume it happened.\n\n" +
            "**Interview mindset.** Say 'partition pruning' and point at the `PartitionFilters` line in the physical plan as proof.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "df = spark.read.parquet('/data/sales')     # partition schema auto-discovered\n" +
            "\n" +
            "march_2024 = df.filter(\n" +
            "    (col('sale_year') == 2024) &            # partition col -> prunes folders\n" +
            "    (col('sale_month') == 3))               # partition col -> prunes folders\n" +
            "\n" +
            "march_2024.explain()                        # look for PartitionFilters\n" +
            "march_2024.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "df = spark.read.parquet('/data/sales')\n" +
            "\n" +
            "march_2024 = df.filter(\n" +
            "    (col('sale_year') == 2024) &\n" +
            "    (col('sale_month') == 3))\n" +
            "\n" +
            "march_2024.explain()\n" +
            "march_2024.show()"
        }
      ],
      sparkInternals:
        "Partition pruning is a **read-time** optimization Catalyst applies to Hive-style partitioned sources. When you filter on a partition column, the predicate becomes a `PartitionFilter` used during file listing, so Spark enumerates and opens only the matching `col=value` directories — the pruned data never touches disk I/O. This is distinct from **predicate pushdown**, which pushes non-partition filters into the Parquet reader to skip row groups via column statistics (min/max). Both reduce scanned bytes, but pruning skips whole files/folders while pushdown skips row groups within files. Dynamic partition pruning (DPP) extends this to prune based on a join with a dimension table at runtime.",
      sparkSql:
        "SELECT *\n" +
        "FROM parquet.`/data/sales`\n" +
        "WHERE sale_year = 2024 AND sale_month = 3;",
      recognizeRecall: [
        "**Spot it:** \"read only certain months/partitions\", \"don't scan the whole dataset\".",
        "**Say it:** filter on the partition columns (`sale_year`/`sale_month`) so Catalyst prunes directories.",
        "**Trap:** filtering a non-partition column does row-group pushdown, not directory pruning — check `PartitionFilters`."
      ]
    },

    // ------------------------------------------------------------------ Q148
    {
      id: "filter-before-join-shuffle",
      lc: 148,
      title: "Filter orders before joining to shrink the shuffle",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Predicate pushdown / filter-before-join", transformation: "Wide (shuffle)", functions: "filter, select, join" },
      description:
        "Given `orders` and `customers`, you only need recent, completed orders. Apply the row filter (and column projection) **before** the join so far fewer rows and narrower columns are shuffled. Reducing each side up front is the cheapest way to speed up a join.",
      examples: [
        {
          input: "orders: 100M rows, only 2M are status='completed' and recent; customers: 1M rows",
          output: "Only 2M pre-filtered order rows enter the join shuffle instead of 100M.",
          reasoning: "Shuffle cost is proportional to bytes moved; filtering and projecting before the join cuts the shuffled data ~50x here."
        }
      ],
      approaches: [
        {
          name: "filter and project each side, then join",
          whenToUse: "You join, then filter — flip it so the filter runs first and the join sees less data.",
          logic:
            "**What it asks.** Reduce shuffled data by filtering before, not after, the join.\n\n" +
            "**Key Idea.** Push the row filter and column selection ahead of the join: `orders.filter(status=='completed').select(needed_cols).join(customers.select(needed_cols), on='customer_id')`. Smaller inputs mean a smaller shuffle.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Filter each side to the rows you actually need (`orders.filter(col('status') == 'completed')`).\n" +
            "2. `select` only the columns used downstream on each side.\n" +
            "3. Join the reduced DataFrames.\n\n" +
            "**Why it works.** The shuffle exchanges bytes across the network; fewer rows and narrower rows mean fewer bytes hashed, sorted, and transferred — the join runs on a fraction of the data.\n\n" +
            "**Common Gotchas.**\n" +
            "- Catalyst already pushes many filters/projections down automatically, but writing them early makes intent explicit and helps when the optimizer can't prove safety (e.g. after UDFs).\n" +
            "- Only filter the side whose rows you truly want to drop — filtering the wrong side of an outer join changes results.\n" +
            "- Column pruning matters as much as row filtering for wide tables — `select` the minimal set.\n\n" +
            "**Interview mindset.** State the rule: 'filter and project before you join'; the shuffle is the cost and you are shrinking its input.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "orders_small = (orders\n" +
            "    .filter(col('status') == 'completed')          # drop rows before shuffle\n" +
            "    .select('order_id', 'customer_id', 'amount'))  # drop columns too\n" +
            "\n" +
            "customers_small = customers.select('customer_id', 'name')\n" +
            "\n" +
            "result = orders_small.join(                         # join sees far less data\n" +
            "    customers_small,\n" +
            "    on='customer_id',\n" +
            "    how='inner',\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "orders_small = (orders\n" +
            "    .filter(col('status') == 'completed')\n" +
            "    .select('order_id', 'customer_id', 'amount'))\n" +
            "\n" +
            "customers_small = customers.select('customer_id', 'name')\n" +
            "\n" +
            "result = orders_small.join(\n" +
            "    customers_small,\n" +
            "    on='customer_id',\n" +
            "    how='inner',\n" +
            ")\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A join is a **wide** operation: each side is hash-partitioned by the key and exchanged across the network (sort-merge join). Its cost scales with the bytes shuffled, so shrinking the inputs first is the highest-leverage tuning. **Catalyst** performs **predicate pushdown** and **column pruning** automatically in most cases — pushing filters below joins and even into the Parquet scan (skipping row groups via min/max stats). But it cannot always reorder safely (e.g. across nondeterministic UDFs or certain outer joins), so writing `filter`/`select` before the join guarantees the reduction and documents intent. For outer joins, be careful which side you filter — filtering the preserved side of a left join drops rows you meant to keep.",
      sparkSql:
        "SELECT o.order_id, o.customer_id, o.amount, c.name\n" +
        "FROM (SELECT order_id, customer_id, amount FROM orders WHERE status = 'completed') o\n" +
        "JOIN (SELECT customer_id, name FROM customers) c\n" +
        "  ON o.customer_id = c.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"join is slow\", \"only need a subset of rows/columns\", \"reduce data shuffled\".",
        "**Say it:** filter and `select` each side BEFORE the join to shrink the shuffle input.",
        "**Trap:** don't filter the preserved side of an outer join; column pruning matters as much as row filtering."
      ]
    },

    // ------------------------------------------------------------------ Q149
    {
      id: "repartition-by-customer-aggregate",
      lc: 149,
      title: "Repartition by customer_id, then aggregate per customer",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Repartition (hash) + aggregate", transformation: "Wide (shuffle)", functions: "repartition, groupBy, agg, sum" },
      description:
        "Repartition a DataFrame by `customer_id` and compute customer-level aggregates (e.g. total and count of `amount`). `repartition('customer_id')` hash-partitions rows so all rows for a customer are co-located, which co-locates the subsequent `groupBy('customer_id')`.",
      examples: [
        {
          input: "orders (order_id, customer_id, amount), repartition by customer_id then groupBy customer_id",
          output: "Per-customer rows: (customer_id, total_amount, order_count), each customer's rows computed on a single partition.",
          reasoning: "Hash-partitioning by the same key the groupBy uses means matching keys already sit together, so the aggregate reduces locally after the (single) exchange."
        }
      ],
      approaches: [
        {
          name: "repartition by key, then groupBy the same key",
          whenToUse: "You will do several operations keyed by customer_id and want them co-partitioned, or you must control partition count/distribution before a wide op.",
          logic:
            "**What it asks.** Group rows by customer and aggregate, with rows co-located by `customer_id`.\n\n" +
            "**Key Idea.** `df.repartition('customer_id')` performs a **hash** repartition on the key (a full shuffle), placing all rows of a customer on the same partition. A following `groupBy('customer_id').agg(...)` then reduces within partitions.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `repartitioned = orders.repartition('customer_id')`.\n" +
            "2. `.groupBy('customer_id')`.\n" +
            "3. `.agg(sum('amount').alias('total_amount'), count('*').alias('order_count'))`.\n\n" +
            "**Why it works.** `repartition(col)` uses hash partitioning identical to what `groupBy` needs; once keys are co-located, the aggregation is a local reduce over each partition.\n\n" +
            "**Common Gotchas.**\n" +
            "- `groupBy` already shuffles by the key, so an explicit `repartition('customer_id')` right before a single `groupBy` is often redundant — it pays off when you reuse the partitioning across multiple keyed ops or need a specific partition count.\n" +
            "- `repartition(n)` (int) round-robins to `n` partitions; `repartition('col')` hash-partitions by the column; `repartition(n, 'col')` does both.\n" +
            "- Repartition is a **full shuffle** — do not use it just to 'reduce partitions' (use `coalesce` for that).\n\n" +
            "**Interview mindset.** Distinguish `repartition(col)` (hash, full shuffle, controls distribution) from `coalesce` (narrow, only reduces count).",
          rcs:
            "from pyspark.sql.functions import sum as _sum, count\n" +
            "\n" +
            "repartitioned = orders.repartition('customer_id')  # hash shuffle by key\n" +
            "\n" +
            "result = (repartitioned\n" +
            "    .groupBy('customer_id')                        # keys already co-located\n" +
            "    .agg(_sum('amount').alias('total_amount'),\n" +
            "         count('*').alias('order_count')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import sum as _sum, count\n" +
            "\n" +
            "repartitioned = orders.repartition('customer_id')\n" +
            "\n" +
            "result = (repartitioned\n" +
            "    .groupBy('customer_id')\n" +
            "    .agg(_sum('amount').alias('total_amount'),\n" +
            "         count('*').alias('order_count')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`repartition('customer_id')` is a **wide** transformation: it hash-partitions every row by the key across `spark.sql.shuffle.partitions` partitions (default 200), a full network shuffle. The payoff is co-location — because `groupBy('customer_id')` needs the same hash partitioning, the keys are already together and the aggregate is a local reduce (map-side pre-aggregation still applies). Note that a bare `groupBy` already induces this exchange, so an extra `repartition` before a single aggregate is usually redundant; it earns its cost when the partitioning is reused (multiple joins/aggregates on the same key) or when you need to override the default partition count to fix too-few/too-many partitions. Contrast with `coalesce`, which only merges partitions without a full shuffle.",
      sparkSql:
        "SELECT customer_id,\n" +
        "       SUM(amount) AS total_amount,\n" +
        "       COUNT(*)    AS order_count\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"repartition by key\", \"customer-level aggregates\", \"co-locate rows before grouping\".",
        "**Say it:** `repartition('customer_id')` hash-shuffles by key; then `groupBy('customer_id').agg(...)`.",
        "**Trap:** `repartition` is a FULL shuffle and a bare groupBy already shuffles — don't add it needlessly."
      ]
    },

    // ------------------------------------------------------------------ Q150
    {
      id: "coalesce-reduce-partitions-write",
      lc: 150,
      title: "Coalesce 1000 partitions down before writing",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Coalesce (narrow) before write", transformation: "Narrow (no full shuffle)", functions: "coalesce, write" },
      description:
        "A DataFrame has 1000 partitions but the result is small, so writing it produces 1000 tiny files. Reduce the partition count **before** writing with `coalesce(n)` — a narrow operation that merges partitions without a full shuffle — so the output is a handful of right-sized files.",
      examples: [
        {
          input: "df with 1000 partitions, ~50MB of result data, written to /data/out",
          output: "coalesce(4) -> 4 output files instead of 1000 tiny ones.",
          reasoning: "coalesce merges existing partitions locally (no full shuffle), cutting the file count while avoiding the cost of a repartition."
        }
      ],
      approaches: [
        {
          name: "coalesce(n) immediately before write",
          whenToUse: "Reducing the number of partitions (especially to avoid tiny output files) without needing an even redistribution.",
          logic:
            "**What it asks.** Fewer output files by lowering the partition count before writing.\n\n" +
            "**Key Idea.** `df.coalesce(n).write...`. `coalesce` **reduces** partitions by merging adjacent ones on the same executor — a **narrow** transformation with no full shuffle — which is far cheaper than `repartition` when you only need to shrink the count.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Estimate target files by output size (aim for ~128MB-1GB per file).\n" +
            "2. `df.coalesce(4)` (or an appropriate `n`).\n" +
            "3. `.write.mode('overwrite').parquet('/data/out')`.\n\n" +
            "**Why it works.** `coalesce` collapses partitions locally without redistributing rows across the network, so it avoids the shuffle that `repartition` would incur while still cutting the number of output files.\n\n" +
            "**Common Gotchas.**\n" +
            "- `coalesce` only **reduces** partitions; asking for more than you have is a no-op (use `repartition` to increase).\n" +
            "- Coalescing to a very small `n` shrinks **parallelism** of the stage that produces the data (fewer tasks) — it can slow an upstream heavy computation, so coalesce late.\n" +
            "- If you need an **even** distribution (skewed partitions), `repartition(n)` (full shuffle) is the right tool despite the cost.\n\n" +
            "**Interview mindset.** `coalesce` = cheap narrow shrink (great before write); `repartition` = full shuffle for balance/increase. Name the difference.",
          rcs:
            "# df currently has 1000 partitions -> would write 1000 tiny files\n" +
            "(df.coalesce(4)                          # merge partitions, NO full shuffle\n" +
            "   .write\n" +
            "   .mode('overwrite')\n" +
            "   .parquet('/data/out'))               # -> 4 right-sized files",
          plain:
            "(df.coalesce(4)\n" +
            "   .write\n" +
            "   .mode('overwrite')\n" +
            "   .parquet('/data/out'))"
        }
      ],
      sparkInternals:
        "`coalesce(n)` is a **narrow** transformation: it merges existing partitions into `n` by combining ones that already live on the same executor, so **no data crosses the network** (no full shuffle). That makes it the cheap way to reduce the file count before a write. The trade-off is that it also lowers the number of tasks for the stage that feeds it — coalescing to 4 means only 4 tasks produce the data, which can bottleneck a heavy upstream computation; place the coalesce as late as possible (right before write). `repartition(n)`, by contrast, is **wide** — it round-robins rows through a full shuffle to get `n` evenly sized partitions, and is the tool when you need to *increase* partitions or rebalance skew. Rule of thumb: reduce -> coalesce, increase/balance -> repartition.",
      sparkSql:
        "-- No direct SQL for coalesce; the DataFrame API controls output partitioning.\n" +
        "-- The closest hint influences shuffle partitioning of the SELECT feeding a write:\n" +
        "SELECT /*+ COALESCE(4) */ * FROM big_df;",
      recognizeRecall: [
        "**Spot it:** \"too many small output files\", \"reduce partitions before writing\", \"1000 partitions, small result\".",
        "**Say it:** `df.coalesce(n).write...` — narrow, no full shuffle, just merges partitions.",
        "**Trap:** coalesce only reduces (increase needs repartition) and lowers upstream parallelism — coalesce late."
      ]
    },

    // ------------------------------------------------------------------ Q154
    {
      id: "explain-broadcast-vs-shuffle-join",
      lc: 154,
      title: "Use explain() to tell broadcast join from shuffle join",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Read the physical plan", transformation: "Wide vs narrow (diagnostic)", functions: "explain, broadcast" },
      description:
        "Given a large join, inspect whether Spark is doing a **broadcast join** or a **shuffle (sort-merge) join** by reading `explain()`. Look for `BroadcastHashJoin` (map-side, no shuffle) versus `SortMergeJoin` (two `Exchange` shuffles). This is the diagnostic step behind every join-tuning decision.",
      examples: [
        {
          input: "result = big.join(other, on='customer_id'); result.explain()",
          output: "Plan shows either 'BroadcastHashJoin ... BuildRight' or 'SortMergeJoin' with two 'Exchange hashpartitioning' nodes below it.",
          reasoning: "BroadcastHashJoin means one side was broadcast (no shuffle); SortMergeJoin with Exchange nodes means both sides were hash-partitioned across the network."
        }
      ],
      approaches: [
        {
          name: "call explain() and read the join operator",
          whenToUse: "Diagnosing why a join is slow, or confirming a broadcast hint actually took effect.",
          logic:
            "**What it asks.** Determine the join strategy Spark chose from the physical plan.\n\n" +
            "**Key Idea.** `result.explain()` (or `explain(True)` for all four plan stages) prints the physical plan. The join node names the strategy: `BroadcastHashJoin` (small side shipped, no shuffle) vs `SortMergeJoin` preceded by two `Exchange hashpartitioning` nodes (full shuffle of both sides).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the join and call `result.explain()`.\n" +
            "2. Find the join operator: `BroadcastHashJoin`/`BroadcastNestedLoopJoin` vs `SortMergeJoin`/`ShuffledHashJoin`.\n" +
            "3. Look for `Exchange` nodes — their presence signals a shuffle.\n" +
            "4. If you expected a broadcast but see sort-merge, add `broadcast(small_df)` or raise `autoBroadcastJoinThreshold` and re-check.\n\n" +
            "**Why it works.** The physical plan is the source of truth for what Spark will actually execute; the operator name and the presence/absence of `Exchange` nodes tell you the strategy directly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Two `Exchange hashpartitioning` nodes under a `SortMergeJoin` = the shuffle you want to avoid.\n" +
            "- With AQE on, the *final* strategy may differ from the initial plan — use `explain('formatted')` or check the SQL tab in the Spark UI for the runtime plan.\n" +
            "- `explain()` does not run the job; it only shows the plan (cheap to call).\n\n" +
            "**Interview mindset.** Reading `explain()` is the credibility move — describe what `BroadcastHashJoin` vs `SortMergeJoin` + `Exchange` look like.",
          rcs:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "# Default: likely a SortMergeJoin with two Exchange (shuffle) nodes\n" +
            "shuffle_join = big.join(other, on='customer_id', how='inner')\n" +
            "shuffle_join.explain()                  # look for 'SortMergeJoin' + 'Exchange'\n" +
            "\n" +
            "# Forced broadcast: should show BroadcastHashJoin, no Exchange on big side\n" +
            "bcast_join = big.join(broadcast(other), on='customer_id', how='inner')\n" +
            "bcast_join.explain()                    # look for 'BroadcastHashJoin'",
          plain:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "shuffle_join = big.join(other, on='customer_id', how='inner')\n" +
            "shuffle_join.explain()\n" +
            "\n" +
            "bcast_join = big.join(broadcast(other), on='customer_id', how='inner')\n" +
            "bcast_join.explain()"
        }
      ],
      sparkInternals:
        "`explain()` renders the **physical plan** Catalyst produced. A **BroadcastHashJoin** is **narrow**: one side (marked `BuildLeft`/`BuildRight`) is broadcast to every executor and probed locally — no `Exchange` on the large side. A **SortMergeJoin** (or **ShuffledHashJoin**) is **wide**: you will see two `Exchange hashpartitioning(customer_id)` nodes that hash-partition both sides across the network before the merge — that is the shuffle. Spark picks broadcast automatically when a side's estimated size is below `spark.sql.autoBroadcastJoinThreshold` (default 10MB); missing/wrong statistics are the usual reason it falls back to sort-merge, which a `broadcast()` hint overrides. With **AQE** enabled, the plan can change at runtime (e.g. sort-merge converted to broadcast once real sizes are known), so confirm the final plan via `explain('formatted')` or the Spark UI's SQL tab.",
      sparkSql:
        "EXPLAIN\n" +
        "SELECT b.customer_id, b.amount, o.name\n" +
        "FROM big b JOIN other o ON b.customer_id = o.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"is Spark broadcasting or shuffling this join?\", \"why is my join slow?\", \"did the hint work?\".",
        "**Say it:** `result.explain()` — BroadcastHashJoin = no shuffle; SortMergeJoin + two Exchange = full shuffle.",
        "**Trap:** AQE can change the plan at runtime — verify the final plan in `explain('formatted')` or the SQL UI."
      ]
    }

  ]);
})();
