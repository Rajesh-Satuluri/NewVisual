/*
 * data/pyspark/concepts_advanced.js — PySpark "Learn" advanced topics.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Spark execution semantics; teaching structure mirrors the Python lab.
 */
window.LEARN.register("spark", "Advanced", [
  {
    id: "spark-sql",
    title: "Spark SQL",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "The DataFrame API and raw SQL are two front doors to the SAME optimizer — pick whichever reads clearest, the speed is identical.",

    whatIsIt: [
      "Spark SQL lets you run ordinary SQL strings against your data with <code>spark.sql(\"SELECT ...\")</code>. To make a DataFrame visible to SQL, you first register it as a <b>temp view</b> — a named, session-scoped handle — with <code>df.createOrReplaceTempView(\"name\")</code>. After that, the name is queryable just like a table.",
      "The key insight: the DataFrame API (<code>df.groupBy(...).agg(...)</code>) and the equivalent SQL string both compile to the <b>same Catalyst logical plan</b>. There is no fast path and slow path — they are two syntaxes for describing the same computation, and Spark optimizes them identically.",
      "This means you can mix and match freely: build part of a pipeline with the DataFrame API, register the result as a view, and finish in SQL — or the reverse. Choose SQL for set-based joins/aggregations that read naturally as queries, and the DataFrame API for programmatic, composable transforms.",
      "Views come in flavors: <code>createOrReplaceTempView</code> is scoped to the current <code>SparkSession</code>; <code>createOrReplaceGlobalTempView</code> lives in the <code>global_temp</code> database and is shared across sessions in the same application."
    ],

    showMe: {
      code:
        "# Register a DataFrame as a temp view so SQL can see it\n" +
        "df.createOrReplaceTempView('orders')\n" +
        "\n" +
        "# Now query it with plain SQL — spark.sql returns a DataFrame\n" +
        "top = spark.sql('''\n" +
        "    SELECT country, SUM(amount) AS total\n" +
        "    FROM orders\n" +
        "    WHERE amount > 0\n" +
        "    GROUP BY country\n" +
        "    ORDER BY total DESC\n" +
        "''')\n" +
        "\n" +
        "# The EXACT same computation in the DataFrame API\n" +
        "top_api = (df.filter(F.col('amount') > 0)\n" +
        "             .groupBy('country')\n" +
        "             .agg(F.sum('amount').alias('total'))\n" +
        "             .orderBy(F.col('total').desc()))\n" +
        "\n" +
        "# Prove they are the same plan — identical optimized/physical plans\n" +
        "top.explain()       # == same Catalyst plan ==\n" +
        "top_api.explain()   # == as this one ==",
      caption:
        "createOrReplaceTempView names the DataFrame; spark.sql then queries it and hands back another DataFrame. The SQL and the DataFrame API versions lower to identical Catalyst plans — same optimizer, same speed. Confirm with explain()."
    },

    whyMatters:
      "<p>Teams argue about \"SQL vs DataFrames\" as if one were faster. It isn't. Both funnel through Catalyst, so the choice is about <b>readability and composability</b>, not performance. Knowing this frees you to use whichever expresses the intent best — and to hand SQL-fluent analysts a temp view they can query without learning the API.</p>" +
      "<p>Where each shines:</p>" +
      "<ul>" +
      "<li><b>SQL</b> — multi-table joins, window functions, and aggregations that read as declarative queries; onboarding people who already know SQL.</li>" +
      "<li><b>DataFrame API</b> — programmatic pipelines where columns/steps are built up in a loop or a function; type-checkable, unit-testable transforms.</li>" +
      "<li><b>Mix</b> — register intermediate results as views and cross the boundary whenever it reads cleaner.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">df.createOrReplaceTempView(\"t\")\n" +
      "spark.sql(\"SELECT k, COUNT(*) c FROM t GROUP BY k\")\n" +
      "  ==  df.groupBy(\"k\").agg(F.count(\"*\").alias(\"c\"))   # SAME plan, SAME speed</pre>",

    recognize: [
      { q: "\"Is SQL slower than the DataFrame API (or the other way round)?\"", think: "Neither — both compile to the same Catalyst plan. Call explain() on each; the optimized plans match. Choose on readability." },
      { q: "\"An analyst wants to query my DataFrame without learning PySpark.\"", think: "df.createOrReplaceTempView('name'), then they run spark.sql('SELECT ... FROM name')." },
      { q: "\"I need this intermediate result usable from SQL later in the pipeline.\"", think: "Register it as a temp view; SQL and the API can both read it from that point on." },
      { q: "\"My temp view disappeared in another notebook / session.\"", think: "createOrReplaceTempView is session-scoped. Use createOrReplaceGlobalTempView and query global_temp.name to share across sessions." },
      { q: "\"This multi-join with window functions is unreadable in the API.\"", think: "Write it as a SQL string in spark.sql(...) — same plan, far clearer for set-based logic." }
    ],

    matchTags: ["spark sql", "sql", "temp view", "createorreplacetempview", "spark.sql", "dataframe api"],

    traps: [
      {
        bad: "spark.sql('SELECT * FROM orders')     # view was never registered",
        good: "df.createOrReplaceTempView('orders')\nspark.sql('SELECT * FROM orders')",
        why: "spark.sql can only see names that exist as tables or registered views. Forgetting createOrReplaceTempView raises AnalysisException: Table or view not found."
      },
      {
        bad: "# rewriting a query in the DataFrame API 'to make it faster'",
        good: "# keep whichever is clearer — spark.sql(...) and the API share one plan",
        why: "There is no performance win from switching syntaxes; both lower to the same Catalyst plan. Rewriting for speed alone wastes effort and often hurts readability."
      },
      {
        bad: "spark.sql('SELECT * FROM my_global_view')  # global view, wrong db",
        good: "spark.sql('SELECT * FROM global_temp.my_global_view')",
        why: "Global temp views live in the reserved global_temp database. You must qualify the name with global_temp., or Spark cannot resolve it."
      }
    ],

    complexity: [
      { op: "createOrReplaceTempView(name)", big_o: "O(1) metadata", note: "Registers a name in the session catalog pointing at the existing logical plan; it moves no data and triggers no computation." },
      { op: "spark.sql('SELECT ...')", big_o: "same as the plan it builds", note: "The cost is whatever the query describes — a filter is narrow, a GROUP BY or JOIN shuffles — exactly as the equivalent DataFrame API would." },
      { op: "SQL query vs equivalent DataFrame API", big_o: "identical", note: "Both produce the same Catalyst logical plan, so the optimized physical plan and runtime are the same." },
      { op: "GROUP BY / JOIN in SQL", big_o: "O(n) + shuffle", note: "Set-based operations shuffle just as their API counterparts do; Catalyst inserts the same Exchange nodes either way." },
      { op: "createOrReplaceGlobalTempView(name)", big_o: "O(1) metadata", note: "Registers the view in the shared global_temp database so other sessions in the same application can query it; still no data movement." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> The DataFrame API and Spark SQL are just two parsers that produce the same <b>Catalyst logical plan</b>. From that point on the pipeline is identical — analysis, logical optimization, physical planning, and codegen — so their performance is <b>equivalent by construction</b>. This is why <code>explain()</code> on the SQL version and on the DataFrame version prints the same plan.</p>" +
      "<p>The practical corollary carries into the next topic: Catalyst can only optimize what it understands. A query built entirely from SQL or from built-in <code>F.*</code> functions is fully transparent to the optimizer (predicate pushdown, column pruning, whole-stage codegen). Drop in a plain Python UDF and that region becomes a <b>black box</b> — no pushdown, no codegen, and row-by-row serialization to a Python worker. So: prefer SQL or <code>F.*</code> built-ins; if you must go custom, prefer a vectorized <code>pandas_udf</code>.</p>",

    challenge: {
      prompt:
        "You have a DataFrame `sales` and an analyst who only knows SQL. Register it so they can query it, then write the SQL that returns total revenue per region for rows where status = 'paid'. Finally, state whether the equivalent DataFrame API call would run any faster.",
      starter:
        "# sales columns: region, status, amount\n" +
        "# 1) make it visible to SQL\n" +
        "# 2) SQL: total amount per region, only status = 'paid'\n" +
        "# 3) would df.groupBy(...).agg(...) be faster?",
      solution:
        "sales.createOrReplaceTempView('sales')\n" +
        "\n" +
        "rev = spark.sql('''\n" +
        "    SELECT region, SUM(amount) AS revenue\n" +
        "    FROM sales\n" +
        "    WHERE status = 'paid'\n" +
        "    GROUP BY region\n" +
        "''')\n" +
        "\n" +
        "# Equivalent DataFrame API — SAME Catalyst plan, SAME speed:\n" +
        "rev_api = (sales.filter(F.col('status') == 'paid')\n" +
        "                .groupBy('region')\n" +
        "                .agg(F.sum('amount').alias('revenue')))\n" +
        "\n" +
        "# No, it would not be faster. Both compile to one Catalyst plan.\n" +
        "# rev.explain() and rev_api.explain() print identical physical plans."
    }
  },

  {
    id: "udfs-vs-builtins",
    title: "UDFs vs Built-ins",
    difficulty: "Advanced",
    estMinutes: 12,
    relevance: 3,
    tagline: "A plain Python UDF is a black box that turns off Spark's optimizer and ships every row to Python — reach for built-in F.* functions first.",

    whatIsIt: [
      "A <b>User-Defined Function (UDF)</b> lets you call your own Python code on each row of a DataFrame. It feels convenient, but it is the single most common performance mistake in PySpark: a plain Python UDF is <b>opaque to Catalyst</b> and executes far slower than the equivalent built-in.",
      "Spark ships hundreds of <b>built-in functions</b> in <code>pyspark.sql.functions</code> (imported as <code>F</code>). These run inside the JVM, participate in whole-stage codegen, and are visible to the optimizer — so predicate pushdown and column pruning still work. Anything you can express with <code>F.*</code> should be, first.",
      "When a built-in genuinely does not exist, prefer a <b>pandas UDF</b> (a.k.a. vectorized UDF, <code>@F.pandas_udf</code>). It uses <b>Apache Arrow</b> to move whole columns to Python in batches as pandas Series, so per-row serialization overhead collapses and throughput is often an order of magnitude better than a plain UDF.",
      "The hierarchy to remember: <b>built-in <code>F.*</code></b> &gt; <b><code>pandas_udf</code> (vectorized)</b> &gt; <b>plain Python <code>udf</code></b> (last resort)."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "from pyspark.sql.types import DoubleType\n" +
        "import pandas as pd\n" +
        "\n" +
        "# BAD — a plain Python UDF: black box to Catalyst, row-by-row to Python\n" +
        "@F.udf(DoubleType())\n" +
        "def add_tax_udf(amount):\n" +
        "    return amount * 1.1\n" +
        "df1 = df.withColumn('gross', add_tax_udf(F.col('amount')))\n" +
        "\n" +
        "# GOOD — built-in expression: stays in the JVM, codegen'd, optimizable\n" +
        "df2 = df.withColumn('gross', F.col('amount') * 1.1)\n" +
        "\n" +
        "# WHEN A BUILT-IN WON'T DO — vectorized pandas UDF (Arrow, batched)\n" +
        "@F.pandas_udf(DoubleType())\n" +
        "def add_tax_vec(amount: pd.Series) -> pd.Series:\n" +
        "    return amount * 1.1        # operates on a whole column at once\n" +
        "df3 = df.withColumn('gross', add_tax_vec(F.col('amount')))",
      caption:
        "The plain udf blocks optimization and serializes each row to a Python worker. The F.* built-in stays in the JVM and is fully optimizable — always try this first. If you truly need custom logic, the pandas_udf uses Arrow to process columns in batches, recovering most of the speed."
    },

    whyMatters:
      "<p>A plain Python UDF forces Spark to serialize every row out of the JVM, send it to a Python worker process, run your function, and serialize the result back — one row at a time. On top of that, Catalyst treats the UDF as an opaque box: it cannot push a filter through it, cannot prune columns around it, and cannot fuse it into whole-stage codegen. You lose both raw throughput and the optimizer.</p>" +
      "<p>The decision order that keeps jobs fast:</p>" +
      "<ul>" +
      "<li><b>First, a built-in</b> — search <code>pyspark.sql.functions</code>; string ops, math, dates, conditionals, JSON, and more already exist as <code>F.*</code>.</li>" +
      "<li><b>Next, a <code>pandas_udf</code></b> — if no built-in fits, go vectorized: Arrow moves columns in batches, so it is typically 10×+ faster than a plain UDF.</li>" +
      "<li><b>Only then, a plain <code>udf</code></b> — reserve it for genuinely per-row Python that cannot be vectorized, and accept the cost.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">F.col(\"amount\") * 1.1          # optimizable, in-JVM, codegen'd\n" +
      "@F.udf(...) def f(x): x*1.1    # black box: no pushdown, row-by-row to Python\n" +
      "@F.pandas_udf(...)            # Arrow-vectorized: batched columns, ~10x the UDF</pre>",

    recognize: [
      { q: "\"My job got slow right after I added a helper function on a column.\"", think: "You probably added a plain Python UDF. Check whether a built-in F.* expression does the same thing; replace it." },
      { q: "\"Is there a built-in for uppercasing / rounding / parsing this date?\"", think: "Almost certainly yes — F.upper, F.round, F.to_date, F.regexp_extract, F.when, F.coalesce, etc. Search pyspark.sql.functions before writing a UDF." },
      { q: "\"I really do need custom logic Spark doesn't provide.\"", think: "Reach for @F.pandas_udf (vectorized, Arrow) rather than a plain @F.udf — same result, far better throughput." },
      { q: "\"Why isn't my filter being pushed down to the scan?\"", think: "A UDF sits between the scan and the filter — Catalyst can't push through the black box. Rewrite with built-ins so the optimizer sees the whole expression." },
      { q: "\"My pandas UDF errors or is slow to start.\"", think: "It needs PyArrow installed and enough columnar data to amortize batch overhead; annotate the pandas Series types and ensure Arrow is enabled." }
    ],

    matchTags: ["udf", "pandas udf", "user defined function", "built-in", "f function", "vectorized"],

    traps: [
      {
        bad: "@F.udf(StringType())\ndef up(s): return s.upper()\ndf.withColumn('u', up(F.col('name')))",
        good: "df.withColumn('u', F.upper(F.col('name')))",
        why: "F.upper already exists as a built-in — it runs in the JVM, is codegen'd, and stays optimizable. Wrapping str.upper() in a UDF adds row-by-row Python serialization for zero benefit."
      },
      {
        bad: "@F.udf(DoubleType())\ndef scale(x): return x * 2.0   # per-row Python",
        good: "@F.pandas_udf(DoubleType())\ndef scale(x: pd.Series) -> pd.Series: return x * 2.0",
        why: "If you must write a UDF, make it vectorized. The pandas_udf receives whole columns via Arrow and processes them in batches, avoiding per-row serialization — typically an order of magnitude faster."
      },
      {
        bad: "df.filter(my_udf(F.col('x')) > 0)   # filter can't push through the UDF",
        good: "df.filter(F.col('x') * 1.1 > 0)     # built-in expr, pushdown preserved",
        why: "Catalyst cannot push a predicate through an opaque UDF or prune columns around it, so more data is read and moved. Expressing the condition with built-ins keeps pushdown and pruning alive."
      }
    ],

    complexity: [
      { op: "built-in F.* expression", big_o: "O(n) in-JVM", note: "Runs inside the JVM with whole-stage codegen and stays visible to the optimizer, so predicate pushdown and column pruning still apply — the fastest option." },
      { op: "plain Python udf", big_o: "O(n) + per-row serde", note: "Each row is serialized from the JVM to a Python worker and back one at a time, and Catalyst treats it as a black box, disabling pushdown and codegen — the slowest option." },
      { op: "pandas_udf (vectorized)", big_o: "O(n) + batched Arrow", note: "Arrow transfers whole columns to Python in batches, so serialization overhead is amortized across many rows and throughput is typically an order of magnitude better than a plain UDF." },
      { op: "predicate pushdown around a UDF", big_o: "blocked", note: "Because a plain UDF is opaque, Spark cannot push filters through it, so it reads and shuffles more data than an equivalent built-in expression would." },
      { op: "choosing a UDF over a built-in", big_o: "avoidable cost", note: "Whenever an equivalent F.* built-in exists, using a UDF adds serialization and optimizer loss for no functional gain — always check for the built-in first." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> The DataFrame API and Spark SQL both lower to the same <b>Catalyst logical plan</b>, so their performance is equivalent — the syntax you pick is free. What is <i>not</i> free is stepping outside expressions Catalyst understands.</p>" +
      "<p>A plain Python <b>UDF is a black box</b> to Catalyst: no predicate pushdown, no column pruning, no whole-stage codegen. Worse, Spark must serialize each row out of the JVM to a Python worker, run your function, and serialize the result back — <b>row by row</b>. That serialization boundary, not your Python logic, is usually the bottleneck.</p>" +
      "<p><b>pandas/vectorized UDFs</b> attack exactly that boundary: they use <b>Apache Arrow</b> to hand Python whole columns in batches as pandas Series, so the per-row overhead collapses and throughput improves dramatically. They are still opaque to the optimizer, so they remain a fallback — but a far better one than a plain UDF.</p>" +
      "<p><b>Rule of thumb:</b> always prefer <code>F.*</code> built-ins; drop to a <code>pandas_udf</code> only when no built-in fits; use a plain <code>udf</code> only when even vectorization is impossible.</p>",

    challenge: {
      prompt:
        "A teammate wrote a UDF that lowercases a column and another that rounds a price to 2 decimals, and the job is slow. Rewrite both with built-ins. Then, for a genuinely custom transform Spark has no built-in for, show the preferred UDF form and say why it beats a plain one.",
      starter:
        "@F.udf(StringType())\n" +
        "def low(s): return s.lower()\n" +
        "@F.udf(DoubleType())\n" +
        "def r2(x): return round(x, 2)\n" +
        "df2 = df.withColumn('name_l', low(F.col('name'))) \\\n" +
        "        .withColumn('price_r', r2(F.col('price')))\n" +
        "# 1) replace both UDFs with built-ins\n" +
        "# 2) for a truly custom op, which UDF form and why?",
      solution:
        "# 1) Both have direct built-ins — no UDF needed:\n" +
        "df2 = (df.withColumn('name_l', F.lower(F.col('name')))\n" +
        "         .withColumn('price_r', F.round(F.col('price'), 2)))\n" +
        "# These stay in the JVM, are codegen'd, and remain optimizable.\n" +
        "\n" +
        "# 2) For custom logic with no built-in, prefer a vectorized pandas_udf:\n" +
        "@F.pandas_udf(DoubleType())\n" +
        "def custom(x: pd.Series) -> pd.Series:\n" +
        "    return x.apply(my_special_calc)   # column-at-a-time via Arrow\n" +
        "# Why: Arrow moves whole columns in batches instead of serializing\n" +
        "# row-by-row to Python, so it is typically ~10x faster than a plain udf."
    }
  }
]);
