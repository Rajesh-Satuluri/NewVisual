/*
 * data/pyspark/concepts_foundations.js — PySpark "Learn" Foundations topics.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Spark execution semantics; teaching structure mirrors the shuffle exemplar.
 */
window.LEARN.register("spark", "Foundations", [
  {
    id: "dataframe-model-lazy-eval",
    title: "DataFrame Model & Lazy Eval",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "A DataFrame is not a table of data sitting in memory — it's a recipe. Spark records what you asked for and does nothing until you demand a result.",

    whatIsIt: [
      "A Spark <b>DataFrame</b> is a distributed, <b>immutable</b> collection of rows organized into named, typed columns and spread across <b>partitions</b> on the cluster. It looks like a pandas table, but it holds <i>no data</i> until forced — it is a logical description of a computation.",
      "Every transformation you write (<code>select</code>, <code>filter</code>, <code>withColumn</code>, <code>join</code>) is <b>lazy</b>: instead of computing, Spark appends a node to a <b>logical plan</b> and hands you back a <i>new</i> DataFrame. The original is never mutated — <code>df.filter(...)</code> does not change <code>df</code>.",
      "Nothing actually runs until an <b>action</b> (<code>show</code>, <code>count</code>, <code>collect</code>, <code>write</code>) is called. At that moment the <b>Catalyst</b> optimizer rewrites the whole accumulated plan, and Spark launches a job. This is why you can chain twenty transformations cheaply — the cost lands only when you ask for output.",
      "The practical consequence: <b>lazy evaluation lets Spark see the entire pipeline at once</b> and optimize across it (push filters down, prune columns, reorder), which an eager, line-by-line engine could never do."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# Each line below is LAZY — nothing is computed yet.\n" +
        "df2 = (df.filter(F.col('amount') > 0)          # returns a NEW DataFrame\n" +
        "         .withColumn('tax', F.col('amount') * 0.1)\n" +
        "         .select('country', 'amount', 'tax'))\n" +
        "\n" +
        "# df is UNCHANGED — DataFrames are immutable.\n" +
        "df.columns        # still the original columns\n" +
        "df2.columns       # ['country', 'amount', 'tax']\n" +
        "\n" +
        "# Inspect the plan Spark has built up — still no job has run.\n" +
        "df2.explain()\n" +
        "# == Physical Plan ==\n" +
        "# *Project [country, amount, (amount * 0.1) AS tax]\n" +
        "# +- *Filter (amount > 0)\n" +
        "#    +- Scan ...\n" +
        "\n" +
        "# THIS is the moment work happens — the action triggers the job.\n" +
        "df2.show(5)       # ACTION: plan is optimized and executed",
      caption:
        "filter/withColumn/select just build a plan and return new DataFrames; df is never mutated. explain() prints the plan without running it. show() is the action that finally launches the job."
    },

    whyMatters:
      "<p>Lazy evaluation is the single mental model that explains most surprising Spark behavior. A cell of transformations that returns 'instantly' did no work; the <code>show()</code> ten cells later that 'hangs' is running <i>all</i> of it. Reading a pipeline as <b>a plan being built, then triggered</b> is what separates people who can debug Spark from people who guess.</p>" +
      "<p>Because Spark sees the whole plan before executing, it can:</p>" +
      "<ul>" +
      "<li><b>Push filters down</b> to the data source so less is read off disk.</li>" +
      "<li><b>Prune columns</b> you never select, skipping them entirely in columnar formats.</li>" +
      "<li><b>Combine narrow steps</b> into a single pass over each partition.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">transformations (lazy)        action (eager)\n" +
      "  filter --> withColumn --> select  ==>  show()  ==>  JOB RUNS\n" +
      "  |___________ build plan __________|      |____ Catalyst + execute ____|</pre>" +
      "<p>The corollary: if you call the same expensive DataFrame in several actions, Spark <b>re-runs the whole plan each time</b> unless you <code>cache()</code> it.</p>",

    recognize: [
      { q: "\"My transformation cell returned instantly but show() takes forever.\"", think: "Transformations are lazy — they only built a plan. All the real work is deferred to the action, so the time shows up at show()/count()/write(), not where you wrote the logic." },
      { q: "\"I filtered df but df still has the old rows.\"", think: "DataFrames are immutable. filter() returns a NEW DataFrame; you must assign it (df = df.filter(...)) or the original is untouched." },
      { q: "\"I ran count() then collect() and both were slow.\"", think: "Each action re-executes the full plan from scratch. If you reuse a DataFrame across actions, cache()/persist() it so the work is done once." },
      { q: "\"How do I see what Spark will do without running it?\"", think: "Call explain() — it prints the logical/physical plan built lazily, with no job triggered." },
      { q: "\"Why does Spark read fewer columns / rows than I expected?\"", think: "Because it optimized the whole plan up front: column pruning and predicate pushdown happen because evaluation was lazy." }
    ],

    matchTags: ["dataframe", "lazy", "transformation", "action", "select", "filter", "show", "collect", "count"],

    traps: [
      {
        bad: "df.filter(F.col('amount') > 0)   # result thrown away\ndf.show()                         # shows UNFILTERED rows",
        good: "df = df.filter(F.col('amount') > 0)  # reassign the new DataFrame\ndf.show()                            # now filtered",
        why: "DataFrames are immutable, so a transformation only takes effect if you keep its return value. Calling filter() for its 'side effect' does nothing — there is no side effect."
      },
      {
        bad: "big = df.join(dim, 'id').groupBy('k').sum('v')\nbig.count(); big.write.parquet(p)   # plan runs TWICE",
        good: "big = df.join(dim, 'id').groupBy('k').sum('v').cache()\nbig.count(); big.write.parquet(p)   # computed once, reused",
        why: "Each action re-triggers the entire lazy plan. Without cache()/persist(), an expensive DataFrame consumed by multiple actions is recomputed every time."
      },
      {
        bad: "for c in cols:\n    df = df.withColumn(c, F.col(c).cast('double'))  # deep lazy plan",
        good: "df = df.select(*[F.col(c).cast('double') if c in cols else c for c in df.columns])",
        why: "Chaining hundreds of lazy withColumn calls builds a very deep plan that is slow to analyze in Catalyst. A single select with all expressions is flatter and optimizes faster."
      }
    ],

    complexity: [
      { op: "filter / select / withColumn (build)", big_o: "O(1) to define", note: "Defining a transformation is nearly free — it only appends a node to the logical plan and returns a new DataFrame handle; no data is touched." },
      { op: "explain()", big_o: "O(plan size)", note: "Runs the optimizer to produce the plan text but launches no job, so it costs analysis time only, not execution time." },
      { op: "show(n) / take(n) (action)", big_o: "O(n) rows, partial", note: "Triggers a job but can short-circuit once n rows are found, so it often reads only the first partition or two rather than the whole dataset." },
      { op: "count() (action)", big_o: "O(total rows)", note: "Must execute the full plan across every partition to tally rows, so its cost reflects the entire pipeline you built up lazily." },
      { op: "second action on same DataFrame", big_o: "O(full plan) again", note: "Recomputes the whole lazy plan from the source unless the DataFrame was cached, so repeated actions multiply the cost." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Each transformation adds a node to an unresolved <b>logical plan</b> — a DAG describing what you want, not how to get it. Nothing executes while you build it.</p>" +
      "<p>When an action fires, <b>Catalyst</b> takes over: it <i>analyzes</i> the plan (resolving column names against the schema), <i>optimizes</i> it (predicate pushdown, column pruning, constant folding, combining projections), then produces one or more <i>physical plans</i> and picks one by cost. Only then is a Spark <b>job</b> submitted, split into stages at shuffle boundaries and into tasks per partition.</p>" +
      "<p>Execution runs on <b>Tungsten</b>: an off-heap, columnar/binary memory format with whole-stage code generation that fuses adjacent narrow operators into a single compiled loop over each partition — which is only possible because lazy evaluation exposed the whole chain to the optimizer first.</p>",

    challenge: {
      prompt:
        "Someone writes the pipeline below and complains 'the filter line is slow, but the count is instant.' Explain what is actually happening, and fix the immutability bug so the filter takes effect.",
      starter:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "df.filter(F.col('status') == 'active')   # they think this is the slow part\n" +
        "df.withColumn('yr', F.year('ts'))         # and this\n" +
        "df.count()                                # 'instant'? — what is it counting?",
      solution:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# Truth: the first two lines are LAZY and their results were discarded,\n" +
        "# so df is unchanged and count() just counts the ORIGINAL rows.\n" +
        "# The 'slow filter' impression is backwards — no work ran there at all;\n" +
        "# all execution happens at the action.\n" +
        "df = (df.filter(F.col('status') == 'active')   # reassign to keep it\n" +
        "        .withColumn('yr', F.year('ts')))\n" +
        "df.count()   # ACTION: now runs the full plan and counts ACTIVE rows only"
    }
  },

  {
    id: "execution-order-sql-vs-pyspark",
    title: "Order of Execution: SQL vs PySpark",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "The order you TYPE a query is not the order the engine RUNS it. In SQL the two disagree; in PySpark they line up — which is exactly why the chain feels natural once it clicks.",

    whatIsIt: [
      "Every relational engine runs a query in a fixed <b>logical order</b>: <code>FROM/JOIN</code> → <code>WHERE</code> → <code>GROUP BY</code> → <code>HAVING</code> → <code>SELECT</code> → <code>ORDER BY</code> → <code>LIMIT</code>. This is the order the <i>data</i> flows, and it never changes.",
      "But SQL forces you to <b>write</b> the clauses in a different order — <code>SELECT</code> first, even though it runs almost last (5th). That mismatch between what you type and what runs is the single biggest source of \"why won't this work?\" moments in SQL.",
      "PySpark's DataFrame API removes the mismatch: you <b>write the operations in the order they run</b>. <code>df.filter(...)</code> (WHERE) comes before <code>.groupBy()</code> comes before the post-agg <code>.filter(...)</code> (HAVING) comes before <code>.select(...)</code> comes before <code>.orderBy(...)</code>. The code reads top-to-bottom in execution order.",
      "So the two are two spellings of the <i>same</i> pipeline. Learn the one true run order once and it powers both — and it tells you, without memorizing rules, where each expression is allowed to appear."
    ],

    showMe: {
      code:
        "-- SQL: written order (numbers = the step where each clause actually RUNS)\n" +
        "SELECT   dept, AVG(salary) AS avg_sal   -- 5  project columns & aliases\n" +
        "FROM     employees                      -- 1  source rows\n" +
        "WHERE    hire_date > '2020-01-01'       -- 2  filter rows (pre-group)\n" +
        "GROUP BY dept                           -- 3  collapse into groups\n" +
        "HAVING   AVG(salary) > 50000            -- 4  filter groups (aggregates OK)\n" +
        "ORDER BY avg_sal DESC                    -- 6  sort (may use the alias!)\n" +
        "LIMIT 5;                                 -- 7  cut to final rows\n" +
        "\n" +
        "# PySpark: written order == run order — read it straight down, 1..7\n" +
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "(employees                                     # 1  source\n" +
        "   .filter(F.col('hire_date') > '2020-01-01')  # 2  WHERE  (pre-group filter)\n" +
        "   .groupBy('dept')                            # 3  GROUP BY\n" +
        "   .agg(F.avg('salary').alias('avg_sal'))      # 4  aggregate\n" +
        "   .filter(F.col('avg_sal') > 50000)           # 4  HAVING (post-agg filter)\n" +
        "   .select('dept', 'avg_sal')                  # 5  SELECT / project\n" +
        "   .orderBy(F.desc('avg_sal'))                 # 6  ORDER BY\n" +
        "   .limit(5))                                  # 7  LIMIT",
      viz: {
        type: "execOrder",
        data: {
          stages: [
            { key: "from",   sql: "FROM / JOIN",  spark: "spark.read / .join()",     note: "Assemble the source rows. Nothing has been filtered or grouped yet." },
            { key: "where",  sql: "WHERE",        spark: ".filter() / .where()",     note: "Filter individual rows — runs before grouping, so no aggregates and no SELECT aliases are available here." },
            { key: "group",  sql: "GROUP BY",     spark: ".groupBy().agg()",         note: "Collapse rows into groups and compute the aggregates for each group." },
            { key: "having", sql: "HAVING",       spark: ".filter() (post-agg)",     note: "Filter whole groups. Aggregates ARE allowed here — this is why HAVING exists and WHERE can't do it." },
            { key: "select", sql: "SELECT",       spark: ".select() / .withColumn()", note: "Project and compute output columns, assign aliases, and evaluate window functions. This is where names like avg_sal are born." },
            { key: "order",  sql: "ORDER BY",     spark: ".orderBy()",               note: "Sort the result. It runs AFTER SELECT, so it can reference SELECT aliases (unlike WHERE)." },
            { key: "limit",  sql: "LIMIT",        spark: ".limit()",                 note: "Cut down to the final N rows — the very last thing the engine does." }
          ],
          sqlWritten: ["select", "from", "where", "group", "having", "order", "limit"]
        }
      },
      caption:
        "Left = the order you type; right = the order it runs (numbered 1–7). The SQL wires cross because SELECT is written first but runs 5th; the PySpark wires stay straight because you write each step where it runs. Hover any step, or press Trace to watch the pipeline execute on both sides at once."
    },

    whyMatters:
      "<p>Almost every SQL \"gotcha\" is really a question of <b>which stage you're in</b>. Fix the run order in your head and the rules stop being arbitrary:</p>" +
      "<ul>" +
      "<li>An <b>alias in <code>WHERE</code></b> fails, but the same alias in <code>ORDER BY</code> works — because <code>WHERE</code> (step 2) runs before <code>SELECT</code> (step 5), and <code>ORDER BY</code> (step 6) runs after it.</li>" +
      "<li>An <b>aggregate in <code>WHERE</code></b> fails, but works in <code>HAVING</code> — <code>WHERE</code> is pre-group (step 2), <code>HAVING</code> is post-group (step 4).</li>" +
      "<li>A <b>window function in <code>WHERE</code></b> fails — windows compute at the <code>SELECT</code> stage (step 5), so you filter on them with a subquery/CTE (or <code>QUALIFY</code>).</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">SQL you WRITE      →  runs as       SELECT   FROM   WHERE   GROUP BY  HAVING  ORDER BY  LIMIT\n" +
      "                                   (5)      (1)    (2)     (3)       (4)     (6)       (7)\n" +
      "\n" +
      "PySpark you WRITE  →  runs as       .read  .filter  .groupBy/.agg  .filter  .select  .orderBy  .limit\n" +
      "                                   (1)     (2)      (3)/(4)        (4)      (5)      (6)       (7)</pre>" +
      "<p>This is also the clean answer to \"how do I translate SQL to PySpark?\": walk the SQL <i>execution</i> order and emit one method per stage. Because PySpark's writing order already <b>is</b> the execution order, the translation is mechanical — and reading a PySpark chain back tells you the exact query it represents.</p>",

    recognize: [
      { q: "\"Why can't I use my SELECT alias in WHERE?\"", think: "WHERE runs at step 2; the alias isn't created until SELECT at step 5. Repeat the expression, or wrap in a subquery/CTE. In PySpark the same truth holds: filter before the withColumn that names it." },
      { q: "\"Alias works fine in ORDER BY though — why?\"", think: "ORDER BY runs at step 6, AFTER SELECT (5). By then the alias exists. Same in PySpark: .orderBy() sits after .select()/.withColumn() in the chain." },
      { q: "\"COUNT(*) > 5 is rejected in WHERE.\"", think: "Aggregates need groups, and grouping (step 3) hasn't happened at WHERE (step 2). Use HAVING (step 4) — in PySpark, a .filter() placed AFTER .groupBy().agg()." },
      { q: "\"How do I filter on a ROW_NUMBER()/RANK()?\"", think: "Window functions evaluate at SELECT (step 5), so you can't put them in WHERE. Compute in a subquery/CTE then filter outside — in PySpark, .withColumn(rank, ...over(w)) then a following .filter()." },
      { q: "\"How do I turn this SQL into PySpark (or read PySpark back as SQL)?\"", think: "Go stage by stage in execution order — FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT — one DataFrame method per stage. The chain's order already matches, so it's a direct mapping." }
    ],

    matchTags: ["order of execution", "logical query processing", "written order", "run order", "where", "having", "group by", "select", "order by", "limit", "alias", "window", "qualify", "sql vs pyspark", "translate"],

    traps: [
      {
        bad: "SELECT dept, AVG(salary) AS avg_sal\nFROM employees\nWHERE avg_sal > 50000        -- ✗ alias & aggregate, both illegal in WHERE\nGROUP BY dept",
        good: "SELECT dept, AVG(salary) AS avg_sal\nFROM employees\nGROUP BY dept\nHAVING AVG(salary) > 50000   -- ✓ post-group filter",
        why: "WHERE runs at step 2 — before grouping (3) and before SELECT (5). It can see neither the aggregate nor the alias. Group-level conditions belong in HAVING (step 4)."
      },
      {
        bad: "# PySpark: HAVING placed like WHERE — before the aggregate exists\n(employees\n   .filter(F.col('avg_sal') > 50000)   # ✗ avg_sal doesn't exist yet\n   .groupBy('dept')\n   .agg(F.avg('salary').alias('avg_sal')))",
        good: "(employees\n   .groupBy('dept')\n   .agg(F.avg('salary').alias('avg_sal'))\n   .filter(F.col('avg_sal') > 50000))   # ✓ filter AFTER the agg = HAVING",
        why: "The chain's order IS the run order. A post-group filter (HAVING) must come after .groupBy().agg(); placing it earlier is the exact same mistake as an aggregate in WHERE."
      },
      {
        bad: "SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\nFROM employees\nWHERE rn = 1                 -- ✗ window not available in WHERE",
        good: "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\n  FROM employees)\nSELECT * FROM ranked WHERE rn = 1   -- ✓ filter after it's computed",
        why: "Window functions compute at the SELECT stage (step 5); WHERE (step 2) is too early. Isolate the window in a CTE/subquery (or use QUALIFY), then filter. In PySpark: .withColumn('rn', F.row_number().over(w)) then .filter(F.col('rn') == 1)."
      }
    ],

    engineNote:
      "<p><b>Logical vs physical.</b> The 1–7 sequence is the SQL standard's <i>logical</i> processing order — the semantics every engine must preserve. The <i>physical</i> plan the optimizer actually runs may look different: Spark's Catalyst (and every SQL planner) pushes filters down below joins, prunes columns before scanning, and reorders joins by cost. Those rewrites are legal precisely because they don't change the logical result. So you reason about correctness with the logical order, and trust the optimizer for speed.</p>",

    challenge: {
      prompt:
        "This query is rejected with 'column \"avg_sal\" does not exist' at WHERE. Explain which execution step is the problem, then rewrite it two ways: valid SQL, and the equivalent PySpark chain.",
      starter:
        "SELECT   dept, AVG(salary) AS avg_sal\n" +
        "FROM     employees\n" +
        "WHERE    avg_sal > 50000\n" +
        "GROUP BY dept\n" +
        "ORDER BY avg_sal DESC;",
      solution:
        "-- Problem: WHERE runs at step 2, before GROUP BY (3) and SELECT (5).\n" +
        "-- The aggregate/alias don't exist yet. Group-level filters go in HAVING.\n" +
        "SELECT   dept, AVG(salary) AS avg_sal\n" +
        "FROM     employees\n" +
        "GROUP BY dept\n" +
        "HAVING   AVG(salary) > 50000\n" +
        "ORDER BY avg_sal DESC;\n" +
        "\n" +
        "# Equivalent PySpark — each stage in run order, one method each:\n" +
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "(employees\n" +
        "   .groupBy('dept')                             # GROUP BY (3)\n" +
        "   .agg(F.avg('salary').alias('avg_sal'))       # aggregate (4)\n" +
        "   .filter(F.col('avg_sal') > 50000)            # HAVING (4)\n" +
        "   .orderBy(F.desc('avg_sal')))                 # ORDER BY (6)"
    }
  },

  {
    id: "where-code-runs-driver-executors",
    title: "Where Your Code Runs: Driver vs Executors",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Every line you write runs in one of two places: spread across the executors, or funnelled onto the single driver. Knowing which is the difference between a job that scales and one that crashes.",

    whatIsIt: [
      "A Spark application has <b>one driver</b> (the JVM running your <code>main</code> / notebook, where the SparkSession lives) and <b>many executors</b> (JVMs on the worker machines that actually hold the data, split into <b>partitions</b>, and run tasks).",
      "The driver's job is to <b>build the plan and hand out tasks</b> — it is a coordinator, not a workhorse. The real computation happens on the executors, <b>in parallel, one task per partition</b>. Transformations like <code>filter</code>, <code>select</code>, <code>groupBy</code> and <code>join</code> all run out there on the cluster.",
      "A few operations do the opposite: they <b>pull data back to the driver</b>. <code>collect()</code> and <code>toPandas()</code> bring <i>every</i> result row into that one JVM; <code>show(n)</code>/<code>take(n)</code> bring only a handful. Because the driver is a single machine, a big <code>collect()</code> is the classic way to make Spark crash with an out-of-memory error.",
      "<b>Python UDFs</b> add a third place: each row is shipped from the JVM executor to a separate <b>Python worker</b> process and back. It still runs on the executors, but the row-by-row serialization is slow and opaque to the optimizer — which is why built-in <code>F.*</code> functions (or pandas UDFs) are almost always faster."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# ── runs on the EXECUTORS, in parallel across partitions ──\n" +
        "big = (spark.read.parquet('s3://events/')      # each executor reads its slice\n" +
        "            .filter(F.col('country') == 'US')   # narrow: local to each partition\n" +
        "            .groupBy('user_id')                 # wide: SHUFFLE across executors\n" +
        "            .agg(F.sum('amount').alias('spend')))\n" +
        "\n" +
        "# ── these stay distributed — good ──\n" +
        "big.write.parquet('s3://out/')   # executors write their partitions in parallel\n" +
        "big.show(20)                     # only ~20 rows travel to the driver\n" +
        "\n" +
        "# ── these pull EVERYTHING onto the one driver JVM — danger ──\n" +
        "rows = big.collect()             # every row into the driver → OOM if big\n" +
        "pdf  = big.toPandas()            # same: whole result must fit in driver RAM\n" +
        "\n" +
        "# ── Python UDF: each row serialized JVM → Python worker → JVM ──\n" +
        "@F.udf('double')\n" +
        "def bonus(x): return x * 1.1     # opaque to Catalyst, row-by-row\n" +
        "slow = big.withColumn('b', bonus('spend'))\n" +
        "fast = big.withColumn('b', F.col('spend') * 1.1)   # built-in: runs in the JVM",
      viz: {
        type: "clusterRun",
        data: {
          executors: 3,
          ops: [
            { key: "read",    label: "spark.read",             where: "executors", caption: "Each executor reads its own slice of the files in parallel — one task per partition. The driver just builds the plan and hands out tasks." },
            { key: "filter",  label: ".filter() / .select()",  where: "executors", caption: "Narrow transforms run locally on each partition, in parallel, moving no data. The driver isn't involved." },
            { key: "groupBy", label: ".groupBy().agg()",       where: "shuffle",   caption: "A wide transform: rows are shuffled across executors so each key lands together. Still fully distributed — data never passes through the driver." },
            { key: "collect", label: ".collect() / .toPandas()", where: "driver", warn: true, caption: "Pulls EVERY result row into the single driver JVM. Fine for small results; on big ones the driver runs out of memory. Prefer show(n)/take(n), or write() to storage." },
            { key: "write",   label: ".write.parquet()",       where: "storage",   caption: "Executors write their partitions straight to storage in parallel — output scales with the cluster and never funnels through the driver." },
            { key: "udf",     label: "Python UDF",             where: "udf",       caption: "Each row is serialized from the JVM executor to a separate Python worker and back — slow, and invisible to Catalyst. Prefer built-in F.* functions or a pandas UDF." }
          ]
        }
      },
      caption:
        "Click each operation to see where it runs. read/filter/groupBy stay on the executors (green partitions light up; groupBy shuffles between them). collect() funnels every row up into the one driver — the red arrows and OOM risk. write() streams down to storage in parallel. A Python UDF spins up a py worker per executor. Press ▶ Run the job to follow read → filter → groupBy → collect."
    },

    whyMatters:
      "<p>\"It worked on a sample but died on the full data\" is almost always a <b>driver vs executor</b> mistake. The fix is to ask, for every line: <i>does this stay on the cluster, or pull to the driver?</i></p>" +
      "<ul>" +
      "<li><b>Never <code>collect()</code>/<code>toPandas()</code> a large DataFrame.</b> To inspect, use <code>show(n)</code>/<code>take(n)</code>; to move data, <code>write()</code> it to storage — the executors do that in parallel.</li>" +
      "<li><b>Don't loop in Python over Spark data.</b> A <code>for</code> loop with <code>collect()</code> drags everything to the driver and throws away all parallelism; express it as DataFrame transforms instead.</li>" +
      "<li><b>Prefer built-in <code>F.*</code> functions over Python UDFs.</b> Built-ins run inside the JVM and are optimized; a Python UDF pays per-row serialization and blocks optimization.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">DRIVER (1 JVM)                       EXECUTORS (N machines, the data lives here)\n" +
      "  builds the plan, schedules      -->   read · filter · groupBy · join · write  (parallel)\n" +
      "  collect()/toPandas()  <== ALL rows funnel back here  ==  OOM risk\n" +
      "  show(n)/take(n)       <== only n rows  ==  safe</pre>" +
      "<p>Rule of thumb: the driver should only ever receive <b>small, bounded</b> results — a count, a few sample rows, aggregated metrics. Anything unbounded belongs in storage.</p>",

    recognize: [
      { q: "\"Works on a sample, OutOfMemory on the driver with full data.\"", think: "Look for collect()/toPandas() on a big DataFrame — it pulls every row onto one JVM. Replace with show/take, or write() to storage." },
      { q: "\"My job barely uses the cluster — one machine is pinned.\"", think: "You're probably doing work on the driver: a Python loop over collected rows, or building results in plain Python. Push the logic into DataFrame transforms so it runs on executors." },
      { q: "\"My UDF is 10× slower than the same logic with F.*.\"", think: "Python UDFs serialize every row JVM→Python→JVM and can't be optimized. Rewrite with built-in functions, or use a pandas UDF for vectorized execution." },
      { q: "\"How do I peek at the data without risking OOM?\"", think: "show(n) or take(n) — they bring only n rows to the driver. Never collect() just to eyeball values." },
      { q: "\"Where does this line actually execute?\"", think: "If it returns a DataFrame, it's a transformation → runs on executors. If it returns rows/a value/None to your program (collect, toPandas, count, first), the result lands on the driver." }
    ],

    matchTags: ["driver", "executor", "collect", "toPandas", "show", "take", "out of memory", "oom", "udf", "python worker", "serialization", "partition", "parallel", "cluster", "where does code run"],

    traps: [
      {
        bad: "rows = df.collect()            # ALL rows onto the driver\nfor r in rows:\n    process(r)                 # single-threaded Python on one machine",
        good: "df.withColumn('out', transform_expr).write.parquet(path)   # stays distributed",
        why: "collect() + a Python loop drags the whole dataset onto the driver and processes it on one core. Express the work as DataFrame transforms so every executor runs it in parallel."
      },
      {
        bad: "pdf = big_df.toPandas()       # whole result must fit in driver RAM",
        good: "sample = big_df.limit(1000).toPandas()   # bound it first if you must go to pandas",
        why: "toPandas() materializes every row on the driver. Only convert small, bounded results; otherwise keep it in Spark or write to storage."
      },
      {
        bad: "@F.udf('double')\ndef tax(x): return x * 0.1        # per-row JVM↔Python hop, no optimization",
        good: "df.withColumn('tax', F.col('amount') * 0.1)   # built-in, runs in the JVM",
        why: "A Python UDF serializes each row to a Python worker and back and is opaque to Catalyst. Built-in F.* expressions run in the JVM and get optimized (and pushed down)."
      }
    ],

    engineNote:
      "<p><b>Under the hood.</b> When an action fires, the driver's <b>DAGScheduler</b> cuts the plan into <b>stages</b> at shuffle boundaries and submits <b>tasks</b> (one per partition) to executors via the cluster manager (YARN / Kubernetes / standalone). Executors run tasks on their slots, cache blocks, and report results. For <code>collect()</code> the results are streamed back to the driver and assembled in its heap — which is why <code>spark.driver.maxResultSize</code> and driver memory bound how much you can safely pull. Python UDFs run in a companion <b>PySpark worker</b> process next to each executor, with rows exchanged over a socket (Arrow batches for pandas UDFs, pickled rows for plain ones).</p>",

    challenge: {
      prompt:
        "A teammate's job reads 500M rows, and 'the last line is super slow and sometimes crashes the driver.' The last lines are below. Explain what's on the driver vs the executors, and rewrite it to stay distributed.",
      starter:
        "df = spark.read.parquet('s3://events/').filter(F.col('ok'))\n" +
        "rows = df.collect()                      # <- crashes here\n" +
        "total = sum(r['amount'] for r in rows)   # Python sum on the driver\n" +
        "print(total)",
      solution:
        "# read + filter run on the EXECUTORS (fine). collect() then tries to pull\n" +
        "# all 500M filtered rows into the single driver JVM — that's the crash,\n" +
        "# and the Python sum() would run single-threaded on the driver anyway.\n" +
        "# Do the aggregation on the cluster and bring back just ONE number.\n" +
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "total = (spark.read.parquet('s3://events/')\n" +
        "              .filter(F.col('ok'))\n" +
        "              .agg(F.sum('amount').alias('total'))   # runs on executors\n" +
        "              .first()['total'])                     # one row to the driver\n" +
        "print(total)"
    }
  },

  {
    id: "catalyst-written-vs-run",
    title: "What You Wrote vs What Spark Runs (Catalyst)",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "You write a plan for readability; Catalyst rewrites it for speed — pushing filters down, dropping columns you never use. Understanding the rewrite tells you how to write code it can actually optimize.",

    whatIsIt: [
      "When an action fires, Spark doesn't run your DataFrame chain line-by-line. The <b>Catalyst optimizer</b> takes the whole logical plan and <b>rewrites it</b> into an equivalent, cheaper plan before any data is read. What runs can look quite different from what you typed — while producing the identical result.",
      "The two rewrites you feel most: <b>predicate pushdown</b> — a <code>filter</code> is moved down <i>into the scan</i> so rows are dropped as they're read (and skipped entirely in Parquet/ORC via row-group stats); and <b>column pruning</b> — columns you never reference are never read off disk. Together they mean less I/O, less shuffled data, faster joins.",
      "This is the same lesson as <b>execution order</b>, one level down: just as SQL's written order isn't its run order, your DataFrame's written plan isn't the physical plan. You write for clarity; the optimizer handles the reordering.",
      "But the optimizer can only move what it can <b>see through</b>. A <b>Python UDF</b>, or a non-deterministic expression, is an opaque wall: Catalyst won't push a filter past it or prune around it. That single fact explains most \"why is this slow?\" surprises."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# You WRITE it in a natural, readable order:\n" +
        "result = (orders\n" +
        "            .join(customers, 'customer_id')\n" +
        "            .select('region', 'amount', 'name')\n" +
        "            .filter(F.col('amount') > 100))\n" +
        "\n" +
        "# Catalyst RUNS an equivalent, cheaper plan:\n" +
        "#   • filter amount>100 pushed DOWN into the orders scan (fewer rows read)\n" +
        "#   • only amount/region/customer_id/name read (other columns PRUNED)\n" +
        "#   • the join now sees far less data\n" +
        "result.explain()   # inspect the physical plan — see PushedFilters & pruned cols\n" +
        "\n" +
        "# A Python UDF is a WALL — Catalyst can't push the filter past it:\n" +
        "@F.udf('boolean')\n" +
        "def keep(a): return a > 100\n" +
        "slow = (orders.join(customers, 'customer_id')\n" +
        "              .filter(keep('amount')))     # filter stuck ABOVE the join, all rows read\n" +
        "fast = (orders.join(customers, 'customer_id')\n" +
        "              .filter(F.col('amount') > 100))   # built-in: pushes down",
      viz: {
        type: "catalyst",
        data: {
          hint: "Press <b>▶ Optimize</b> to watch Catalyst rewrite the plan — then toggle a Python UDF to see pushdown hit a wall.",
          written: [
            { t: "scan orders",              detail: "all columns", why: "As written, the scan reads every column of every row." },
            { t: "scan customers",           detail: "all columns", why: "Same — nothing has told it which columns matter yet." },
            { t: "join on customer_id",      detail: "", why: "The join processes every row from both sides." },
            { t: "select region, amount, name", detail: "", why: "Projection — but it comes after the join, so the join already did extra work." },
            { t: "filter amount > 100",      detail: "runs last ⤵", why: "As typed, the filter is the last step — every row was read and joined before most got thrown away." }
          ],
          optimized: [
            { t: "scan orders",     detail: "3 cols · amount>100 ⤵", changed: true, why: "Column pruning + predicate pushdown: only needed columns are read, and amount>100 is applied at the scan so most rows never leave disk." },
            { t: "scan customers",  detail: "customer_id, name, region", changed: true, why: "Column pruning: the other customer columns are never read." },
            { t: "join on customer_id", detail: "far fewer rows", changed: true, why: "Because the filter ran first, the join now sees a fraction of the rows." },
            { t: "select region, amount, name", detail: "", why: "The final projection — now cheap." }
          ],
          steps: [
            { title: "Column pruning", caption: "Spark reads only the columns you actually use; the rest are never loaded off disk.", w: [0, 1], o: [0, 1] },
            { title: "Predicate pushdown", caption: "The filter moves down into the orders scan — rows are dropped as they're read, before the join.", w: [4], o: [0] },
            { title: "Smaller join", caption: "With rows filtered and columns pruned first, the join processes far less data.", w: [2], o: [2] }
          ],
          done: "Same result, cheaper plan: you wrote it for clarity, Catalyst ran it for speed. Call explain() to see the PushedFilters and pruned columns yourself.",
          udf: {
            optimized: [
              { t: "scan orders",    detail: "all columns", why: "Nothing can be pruned or pushed — the UDF downstream is opaque." },
              { t: "scan customers", detail: "all columns", why: "Same: Catalyst can't tell which columns survive the UDF." },
              { t: "join on customer_id", detail: "all rows", why: "The join runs on every row because the filter can't move below it." },
              { t: "🐍 Python UDF keep(amount)", detail: "opaque wall", wall: true, why: "Catalyst can't see inside a Python UDF, so it won't push a filter past it or prune around it." },
              { t: "filter keep(amount)", detail: "runs last — nothing pushed", wall: true, why: "The filter is stuck above the UDF: every row is read and joined first. This is why a UDF-based filter is so much slower." }
            ],
            steps: [
              { title: "UDF blocks pruning", caption: "Because a Python UDF is opaque, Catalyst can't prove which columns are unused — so nothing is pruned.", w: [0, 1], o: [0, 1] },
              { title: "Pushdown hits the wall", caption: "The filter can't move below the UDF, so it stays above the join — every row is read and joined first.", w: [4], o: [3, 4] }
            ],
            done: "With a Python UDF in the chain, none of the speedups apply. Swap it for a built-in F.* expression and the filter pushes down again."
          }
        }
      },
      caption:
        "Left: the plan as you typed it. Right: what Catalyst actually runs — the filter pushed into the scan, columns pruned, the join now cheap. Press ▶ Optimize to watch each rewrite; toggle 🐍 Add a Python UDF to see the filter get stuck above an opaque wall."
    },

    whyMatters:
      "<p>You don't hand-optimize Spark the way you might micro-optimize a loop — Catalyst reorders for you. What you <i>do</i> control is whether your code is <b>optimizable</b>. Three habits keep the optimizer working for you:</p>" +
      "<ul>" +
      "<li><b>Select only the columns you need</b> (especially before wide ops). Even though pruning is automatic, an explicit narrow projection makes intent clear and helps in chains the optimizer can't fully see through.</li>" +
      "<li><b>Filter with built-in <code>F.*</code> expressions, not Python UDFs</b>, so predicates can push down to the scan. Reserve UDFs for logic that genuinely can't be expressed with built-ins.</li>" +
      "<li><b>Use columnar formats (Parquet/Delta)</b> so pushdown and pruning actually skip data via footer stats — on a CSV there's far less to skip.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">You WROTE:   scan(all) -> join -> select -> filter\n" +
      "Catalyst RUNS: scan(needed cols, amount>100) -> join(fewer rows) -> select\n" +
      "\n" +
      "…but a Python UDF is a wall:\n" +
      "  scan(all) -> join(all rows) -> UDF -> filter    (nothing pushed, nothing pruned)</pre>" +
      "<p><code>df.explain()</code> is how you check: look for <b>PushedFilters</b> and the reduced column list in the scan. If a filter you expected to push down isn't there, something above it (often a UDF) is blocking it.</p>",

    recognize: [
      { q: "\"My filter isn't pushing down — explain() shows it above the scan.\"", think: "Something opaque sits below it — usually a Python UDF or a non-deterministic expression. Move deterministic, built-in filters below the UDF, or replace the UDF." },
      { q: "\"Why is Spark reading columns I never selected?\"", think: "Either you selected * / didn't project, or a downstream UDF/opaque step prevents pruning. Add an explicit select of the needed columns and remove the wall." },
      { q: "\"Same query is fast on Parquet, slow on CSV.\"", think: "Pushdown and column pruning skip data using columnar footer stats. CSV is row-based with no stats, so there's little to skip — convert to Parquet/Delta." },
      { q: "\"Do I need to hand-order my transforms for speed?\"", think: "Usually no — Catalyst reorders filters/projections for you. Write for clarity; just keep the plan optimizable (built-ins over UDFs, columnar storage)." },
      { q: "\"How do I know what Spark will actually run?\"", think: "Call df.explain() (or explain(True) for all phases). Read the physical plan bottom-up and look for PushedFilters, pruned columns, and the join strategy." }
    ],

    matchTags: ["catalyst", "optimizer", "predicate pushdown", "column pruning", "explain", "physical plan", "logical plan", "pushedfilters", "udf", "parquet", "projection", "written vs run"],

    traps: [
      {
        bad: "df.select('*').filter(my_udf('amount'))   # UDF blocks pushdown; reads all cols/rows",
        good: "df.select('region', 'amount').filter(F.col('amount') > 100)   # pushes down, prunes",
        why: "A built-in predicate can be pushed into the scan and columns pruned; a Python UDF is opaque, so Spark reads everything and filters late."
      },
      {
        bad: "df.withColumn('x', udf_expr(...)).filter(F.col('amount') > 100)  # filter can't cross the UDF",
        good: "df.filter(F.col('amount') > 100).withColumn('x', udf_expr(...))  # filter first, UDF on fewer rows",
        why: "Catalyst won't reorder a deterministic filter below an opaque UDF automatically. Put the cheap, pushable filter first so the UDF runs on fewer rows."
      },
      {
        bad: "spark.read.csv(path).filter(F.col('dt') == '2024-01-01')   # little to skip",
        good: "spark.read.parquet(path).filter(F.col('dt') == '2024-01-01')  # row-group stats skip data",
        why: "Pushdown pays off on columnar formats with footer statistics. On CSV there are no stats, so Spark still scans the whole file."
      }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Catalyst runs in phases: <b>analysis</b> (resolve columns/types against the schema) → <b>logical optimization</b> (a rule set: predicate pushdown, column pruning, constant folding, projection collapse, boolean simplification) → <b>physical planning</b> (pick join strategies and produce one or more physical plans, chosen by cost) → <b>code generation</b> (Tungsten whole-stage codegen fuses operators into compiled loops). Pushdown reaches the data source through the <b>DataSource</b> API — Parquet/ORC/Delta accept <code>PushedFilters</code> and required columns and use footer/row-group statistics to skip blocks. UDFs and non-deterministic functions are treated as opaque, so the rule set leaves them in place. <code>explain(True)</code> prints all four phases.</p>",

    challenge: {
      prompt:
        "This runs much slower than expected and explain() shows the filter is NOT pushed to the scan. Explain why, and rewrite it so the predicate pushes down.",
      starter:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "@F.udf('boolean')\n" +
        "def is_big(x): return x > 1000\n" +
        "\n" +
        "res = (spark.read.parquet('s3://orders/')\n" +
        "            .filter(is_big('amount'))     # slow: not pushed down\n" +
        "            .select('region', 'amount'))",
      solution:
        "# is_big is a Python UDF — an opaque wall. Catalyst can't push it into the\n" +
        "# scan, so every row is read before filtering. Use a built-in expression and\n" +
        "# the predicate pushes down (and Parquet skips whole row groups via stats).\n" +
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "res = (spark.read.parquet('s3://orders/')\n" +
        "            .select('region', 'amount')       # prune early\n" +
        "            .filter(F.col('amount') > 1000))  # built-in → PushedFilters\n" +
        "res.explain()   # confirm: PushedFilters: [GreaterThan(amount,1000)]"
    }
  },

  {
    id: "transformations-vs-actions",
    title: "Transformations vs Actions",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Every Spark method is one of two kinds. Knowing which is which tells you exactly when your cluster does work — and when it moves data to your driver.",

    whatIsIt: [
      "A <b>transformation</b> returns a <b>new DataFrame</b> and runs nothing. <code>select</code>, <code>filter</code>, <code>withColumn</code>, <code>groupBy</code>, <code>join</code>, <code>orderBy</code>, and <code>drop</code> are all transformations — they extend the lazy plan and give you a fresh handle.",
      "An <b>action</b> returns a <b>non-DataFrame result</b> (a number, a list of Rows, None, or written files) and <b>triggers a job</b>. <code>show</code>, <code>count</code>, <code>collect</code>, <code>take</code>, <code>first</code>, <code>write</code>, and <code>foreach</code> are actions — they force the accumulated plan to execute.",
      "A quick test: <i>does it hand you back another DataFrame?</i> If yes, it's a lazy transformation. If it hands you a value, prints, or writes, it's an eager action.",
      "The dangerous actions are the ones that pull results to the <b>driver</b>. <code>collect()</code> and <code>toPandas()</code> bring the <i>entire</i> result into the single driver JVM/Python process — fine for small results, an <b>OutOfMemory</b> crash for large ones. Prefer <code>take(n)</code>, <code>show(n)</code>, or <code>write</code>."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# --- TRANSFORMATIONS (lazy, each returns a new DataFrame) ---\n" +
        "clean = (df.filter(F.col('amount') > 0)   # -> DataFrame\n" +
        "           .withColumn('tax', F.col('amount') * 0.1)  # -> DataFrame\n" +
        "           .groupBy('country')            # -> GroupedData\n" +
        "           .agg(F.sum('amount').alias('total')))       # -> DataFrame\n" +
        "# ...still nothing has executed.\n" +
        "\n" +
        "# --- ACTIONS (eager, each triggers a job) ---\n" +
        "clean.show(5)             # prints rows          -> None (job runs)\n" +
        "n = clean.count()         # number of rows       -> int  (job runs)\n" +
        "rows = clean.take(3)      # first 3 as [Row,...] -> list (job runs)\n" +
        "clean.write.parquet('/out/agg')   # writes files -> None (job runs)\n" +
        "\n" +
        "# DANGER: collect() / toPandas() move EVERYTHING to the driver.\n" +
        "all_rows = clean.collect()      # OK only if the result is small\n" +
        "pdf = clean.limit(1000).toPandas()   # bound it first with limit()",
      caption:
        "The whole top block is lazy and free. Each call in the bottom block launches a job. take/show/write scale; collect/toPandas pull the full result to the driver and risk OOM — bound them with limit()."
    },

    whyMatters:
      "<p>Classifying each call as transformation or action is how you predict a job's behavior before you run it. It answers the two questions that matter most: <b>when does the cluster do work</b>, and <b>does any step drag data back to the driver?</b></p>" +
      "<ul>" +
      "<li><b>Chain transformations freely</b> — they're cheap to define and Spark optimizes them together.</li>" +
      "<li><b>Count your actions</b> — each one re-runs the plan; reuse across actions means <code>cache()</code>.</li>" +
      "<li><b>Treat <code>collect()</code> / <code>toPandas()</code> as a cliff edge</b> — the executors are distributed, but the driver is one machine.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">TRANSFORMATION            ACTION\nselect / filter           show / count / take\nwithColumn / drop         collect / first / foreach\ngroupBy / join / orderBy  write / save\n  returns DataFrame          returns value / writes / triggers job</pre>",

    recognize: [
      { q: "\"Is this line going to run anything?\"", think: "Ask what it returns. Another DataFrame -> lazy transformation, runs nothing. A value, None, or written output -> action, triggers a job." },
      { q: "\"My driver ran out of memory.\"", think: "Look for collect() or toPandas() on a large result. Replace with take(n)/show(n), or write to storage; bound with limit() before toPandas()." },
      { q: "\"I need just a few rows to eyeball the data.\"", think: "Use show(n) or take(n) — they're actions that can stop after n rows instead of scanning everything." },
      { q: "\"Same DataFrame feeds a count() and a write() — is that wasteful?\"", think: "Yes: two actions = two full executions. cache()/persist() it so the plan runs once." },
      { q: "\"I want the result as a Python list / pandas frame.\"", think: "collect() gives [Row], toPandas() gives a DataFrame — both are driver-side actions; only safe when the result is small." }
    ],

    matchTags: ["transformation", "action", "collect", "show", "count", "select", "filter", "dataframe", "lazy"],

    traps: [
      {
        bad: "rows = big_df.collect()          # pulls ALL rows to the driver",
        good: "rows = big_df.take(20)           # or big_df.show(20) / write to storage",
        why: "collect() materializes the entire result in the single driver process and OOMs on large data. take(n)/show(n) return a bounded number of rows; write keeps results distributed."
      },
      {
        bad: "pdf = big_df.toPandas()          # whole DataFrame -> driver pandas frame",
        good: "pdf = big_df.limit(1000).toPandas()   # bound it before pulling",
        why: "toPandas() is collect() plus a pandas conversion, so it has the same driver-OOM risk. Always limit() (or aggregate) down to something a single machine can hold first."
      },
      {
        bad: "if df.count() > 0:              # full job just to test emptiness\n    df.show()                       # a SECOND full job",
        good: "if len(df.take(1)) > 0:        # stops after one row\n    df.show()",
        why: "count() executes the entire plan; to merely check for any rows, take(1) short-circuits. And running count() then show() is two separate executions of the same plan."
      }
    ],

    complexity: [
      { op: "select / filter / withColumn (transformation)", big_o: "O(1) to define", note: "Only builds the plan and returns a new DataFrame, so defining any number of transformations is effectively free until an action fires." },
      { op: "show(n) / take(n) (action)", big_o: "O(n), partial scan", note: "Triggers a job but can stop once n rows are collected, often reading only a partition or two rather than the whole dataset." },
      { op: "count() (action)", big_o: "O(total rows)", note: "Runs the full plan across all partitions to tally rows, so it costs as much as the entire pipeline it sits on." },
      { op: "collect() / toPandas() (action)", big_o: "O(result) at driver", note: "Executes the plan and then streams every result row into the single driver process, so memory, not just time, becomes the limit and large results OOM." },
      { op: "write.parquet(...) (action)", big_o: "O(total rows), distributed", note: "Runs the full plan but writes output from the executors in parallel, so it scales with the cluster and never funnels data through the driver." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Transformations only extend the Catalyst logical plan; no SparkContext job is submitted. An action calls into the scheduler, which optimizes the plan, cuts it into <b>stages</b> at shuffle boundaries, and dispatches <b>tasks</b> (one per partition) to executors.</p>" +
      "<p>Executor results for a driver-side action (<code>collect</code>, <code>toPandas</code>, <code>take</code>) are serialized and shipped back over the network to the driver and deserialized there — which is why the driver's memory, not the cluster's, bounds them. <code>write</code> instead has each executor persist its own partitions directly to storage, so nothing bottlenecks on the driver.</p>" +
      "<p>Because every action re-triggers plan execution from the source, Spark exposes <code>cache()</code>/<code>persist()</code> to materialize a DataFrame into memory (or disk) after its first action, so subsequent actions read the cached partitions in the Tungsten columnar format instead of recomputing.</p>",

    challenge: {
      prompt:
        "Label each line below T (transformation, lazy) or A (action, eager), say how many Spark jobs run in total, and flag the one line that risks crashing the driver. Then rewrite that line safely.",
      starter:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "a = df.filter(F.col('country') == 'US')\n" +
        "b = a.groupBy('city').agg(F.sum('amount').alias('total'))\n" +
        "b.orderBy(F.desc('total'))\n" +
        "print(b.count())\n" +
        "data = b.collect()\n" +
        "b.write.parquet('/out/by_city')",
      solution:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "a = df.filter(F.col('country') == 'US')                       # T (lazy)\n" +
        "b = a.groupBy('city').agg(F.sum('amount').alias('total'))     # T (lazy)\n" +
        "b.orderBy(F.desc('total'))       # T (lazy) AND result discarded -> no effect\n" +
        "print(b.count())                 # A  -> job 1\n" +
        "data = b.collect()               # A  -> job 2  <-- driver-OOM risk\n" +
        "b.write.parquet('/out/by_city')  # A  -> job 3\n" +
        "\n" +
        "# 3 jobs (b is recomputed each time -> cache() to run once).\n" +
        "# Fix the risky collect(): bound it, or keep it distributed.\n" +
        "data = b.orderBy(F.desc('total')).take(50)   # top rows only, no full pull"
    }
  },

  {
    id: "schemas-types",
    title: "Schemas & Types",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 2,
    tagline: "A DataFrame is columns plus their types. Letting Spark guess the schema costs an extra data pass and invites wrong guesses — an explicit schema fixes both.",

    whatIsIt: [
      "Every DataFrame carries a <b>schema</b>: an ordered list of columns, each with a name, a <b>data type</b> (<code>StringType</code>, <code>LongType</code>, <code>DoubleType</code>, <code>BooleanType</code>, <code>TimestampType</code>, ...), and a nullability flag. Inspect it with <code>df.printSchema()</code> or <code>df.dtypes</code>.",
      "When you read semi-structured data (CSV, JSON) with <code>inferSchema</code>, Spark makes an <b>extra pass over the data</b> to sample values and guess types. That pass costs time on large files, and the guesses can be wrong — a numeric ID with leading zeros becomes an integer that drops them, or a mixed column collapses to <code>StringType</code>.",
      "An <b>explicit schema</b> built from <code>StructType</code>/<code>StructField</code> skips the inference pass entirely and pins each type exactly. You pay a little verbosity up front and get faster reads, deterministic types, and an early, clear error when the data doesn't match.",
      "Types aren't fixed once set — <code>col.cast('double')</code> (or <code>.cast(DoubleType())</code>) returns a column converted to a new type, following the same <b>immutable, lazy</b> rules as any other transformation."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "from pyspark.sql.types import (StructType, StructField,\n" +
        "                               StringType, IntegerType, DoubleType)\n" +
        "\n" +
        "# INFERRED — convenient, but Spark makes an EXTRA pass to guess types.\n" +
        "df_inf = spark.read.csv('sales.csv', header=True, inferSchema=True)\n" +
        "df_inf.printSchema()\n" +
        "# root\n" +
        "#  |-- id: integer     <- 'zip'-like ids may lose leading zeros!\n" +
        "#  |-- amount: double\n" +
        "\n" +
        "# EXPLICIT — no inference pass, exact types, fails fast on bad data.\n" +
        "schema = StructType([\n" +
        "    StructField('id',      StringType(),  False),   # keep as string\n" +
        "    StructField('country', StringType(),  True),\n" +
        "    StructField('amount',  DoubleType(),  True),\n" +
        "])\n" +
        "df = spark.read.csv('sales.csv', header=True, schema=schema)\n" +
        "\n" +
        "# Types are transformable too (lazy, immutable).\n" +
        "df = df.withColumn('amount_int', F.col('amount').cast(IntegerType()))\n" +
        "df.dtypes   # [('id','string'), ('country','string'), ('amount','double'), ...]",
      caption:
        "inferSchema=True triggers a sampling pass and can mis-guess (ids losing leading zeros). Passing an explicit StructType schema skips that pass, pins each type, and errors early. cast() converts a column, lazily like any transformation."
    },

    whyMatters:
      "<p>Schema handling is where correctness and cost meet. Inference is a trap in two directions: it <b>reads your data twice</b> (once to sample, once to load), and it <b>silently makes decisions</b> — the wrong integer width, a dropped leading zero, a date read as a string. On a nightly pipeline over billions of rows, both matter.</p>" +
      "<ul>" +
      "<li><b>Provide an explicit schema for production reads</b> — deterministic types, one pass, and a loud failure when upstream data drifts instead of a silent bad cast.</li>" +
      "<li><b>Use <code>printSchema()</code> / <code>dtypes</code> constantly</b> — most 'my join returns nothing' and 'my sum is wrong' bugs are a type mismatch (string vs int key, double vs decimal).</li>" +
      "<li><b>Cast deliberately</b> — an invalid cast yields <code>null</code> rather than an error, so a column full of nulls after a cast means the source values didn't match the target type.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">inferSchema=True   ->  pass 1: sample &amp; guess types   pass 2: load  (slower, risky)\nexplicit schema    ->  pass 1: load with fixed types              (faster, safe)</pre>",

    recognize: [
      { q: "\"Reading this CSV is slow before any real work.\"", think: "inferSchema=True adds a full sampling pass. Supply an explicit StructType schema to read in a single pass." },
      { q: "\"My IDs lost their leading zeros / my zip codes are numbers.\"", think: "Inference guessed a numeric type. Pin the column to StringType in an explicit schema." },
      { q: "\"My join returns no matches even though keys look equal.\"", think: "Check dtypes on both sides — a string key won't match an integer key. Cast one side or fix the schema." },
      { q: "\"A column is all nulls after I cast it.\"", think: "An invalid cast produces null, not an error. The source values don't parse into the target type — inspect a few raw values." },
      { q: "\"What columns and types does this DataFrame actually have?\"", think: "df.printSchema() for the tree view, or df.dtypes for a list of (name, type) tuples." }
    ],

    matchTags: ["schema", "structtype", "printschema", "cast", "dtype", "createdataframe", "dataframe", "select"],

    traps: [
      {
        bad: "df = spark.read.csv('big.csv', header=True, inferSchema=True)",
        good: "df = spark.read.csv('big.csv', header=True, schema=my_struct_schema)",
        why: "inferSchema makes an extra pass over the whole file to guess types and can guess wrong. An explicit StructType reads once and fixes every type deterministically."
      },
      {
        bad: "spark.createDataFrame([('007', 5)], ['id', 'qty'])  # types guessed",
        good: "spark.createDataFrame([('007', 5)], schema=StructType([\n    StructField('id', StringType(), False),\n    StructField('qty', IntegerType(), True)]))",
        why: "Even for in-memory data, letting Spark infer from Python objects can pick a surprising type (and a numeric '007' would lose its zeros). Passing a schema pins names, types, and nullability."
      },
      {
        bad: "df.withColumn('amt', F.col('amount').cast('int'))  # silent nulls",
        good: "bad = df.filter(F.col('amount').cast('int').isNull() & F.col('amount').isNotNull())\n# inspect 'bad' to see values that failed the cast before trusting it",
        why: "An invalid cast returns null rather than raising, so a botched conversion is invisible. Validate by checking for rows that became null only because the cast failed."
      }
    ],

    complexity: [
      { op: "printSchema() / dtypes", big_o: "O(columns), no job", note: "Reads schema metadata already attached to the DataFrame, so it is instant and launches no Spark job regardless of data size." },
      { op: "read with explicit schema", big_o: "O(rows), one pass", note: "Loads the file in a single pass using the fixed types you supplied, with no sampling step, so it is the cheapest correct way to read." },
      { op: "read with inferSchema=True", big_o: "O(rows) x2 (sample + load)", note: "Spark scans the data once to sample and guess types, then again to load, so on large files it roughly doubles the read cost." },
      { op: "col.cast(type) (transformation)", big_o: "O(1) to define, O(rows) at action", note: "Casting only appends a lazy expression to the plan; the per-row conversion happens later when an action runs, fused with other narrow operators." },
      { op: "createDataFrame(rows, schema)", big_o: "O(rows) to parallelize", note: "Distributes the driver-side rows into partitions; supplying a schema avoids inferring types from the Python objects and pins them exactly." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A schema is a <code>StructType</code> tree of <code>StructField</code>s carried as metadata on every DataFrame. Catalyst uses it during the <i>analysis</i> phase to resolve column references and validate expression types before any job runs — which is why a wrong column name or an impossible operation fails at plan time, not mid-execution.</p>" +
      "<p><code>inferSchema</code> for CSV/JSON launches a real job to sample rows and reconcile types; for large inputs this pre-scan is pure overhead you remove by supplying the schema. Self-describing columnar formats like <b>Parquet</b> and <b>ORC</b> store the schema in their footer, so reads are already single-pass and typed — another reason to prefer them over CSV for pipeline stages.</p>" +
      "<p>Types also drive <b>Tungsten</b>'s memory layout: fixed-width types (<code>LongType</code>, <code>DoubleType</code>) pack into compact off-heap columnar buffers and enable vectorized reads, so accurate, narrow types make execution faster as well as safer.</p>",

    challenge: {
      prompt:
        "You read an orders CSV with inferSchema=True and downstream joins on order_id silently return nothing, while a nightly SLA is being missed on read time. Diagnose both problems and rewrite the read with an explicit schema that fixes them.",
      starter:
        "orders = spark.read.csv('orders.csv', header=True, inferSchema=True)\n" +
        "orders.printSchema()\n" +
        "# root\n" +
        "#  |-- order_id: integer     # but customers.order_id is a string...\n" +
        "#  |-- amount: string        # amounts read as text\n" +
        "joined = orders.join(customers, 'order_id')   # returns 0 rows",
      solution:
        "from pyspark.sql.types import (StructType, StructField,\n" +
        "                               StringType, DoubleType, TimestampType)\n" +
        "\n" +
        "# Problem 1: inferSchema made an extra pass -> slow read (SLA miss).\n" +
        "# Problem 2: it guessed order_id as integer, but customers.order_id\n" +
        "#            is a string, so the join keys never match -> 0 rows.\n" +
        "schema = StructType([\n" +
        "    StructField('order_id', StringType(),    False),  # match the join key\n" +
        "    StructField('amount',   DoubleType(),    True),   # numeric, not text\n" +
        "    StructField('ts',       TimestampType(), True),\n" +
        "])\n" +
        "orders = spark.read.csv('orders.csv', header=True, schema=schema)  # one pass\n" +
        "joined = orders.join(customers, 'order_id')   # keys are string=string -> matches"
    }
  }
]);
