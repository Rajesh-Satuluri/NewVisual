/*
 * PySpark Function Cheatsheet — senior/L6 depth.
 * Consumed by a renderer: window.PYSPARK_CHEAT = { groups: [...], fns: [...] }.
 * Rendering rules:
 *   - summary, params[].desc, notes  -> innerHTML (escape < > & ; <code>/<b> allowed)
 *   - example, output                -> textContent (PLAIN text, real newlines)
 * Assume: from pyspark.sql import functions as F, Window ; a DataFrame `df`.
 */
window.PYSPARK_CHEAT = {
  groups: [
    "DataFrame",
    "Column",
    "Aggregation",
    "Joins",
    "Window",
    "Functions",
    "Dates",
    "I/O",
    "Performance"
  ],

  // Global usage ranking — most-used-in-interviews-and-real-pipelines first.
  // Drives the cheatsheet's default "Most used" sort, the within-category order,
  // and the ★ essential badge (top tier). Ordering is deliberate (not
  // alphabetical); any id not listed here falls to the end. See cheatsheet.js.
  rankOrder: [
    // ── Tier 1: the everyday core you reach for in almost every job/problem ──
    "select", "filter", "withColumn", "col", "lit", "alias-col", "when",
    "groupBy", "agg", "join", "orderBy", "count-agg", "sum", "avg", "min",
    "withColumnRenamed", "distinct", "dropDuplicates", "drop", "cast", "isnull",
    "window-partitionBy", "window-orderBy", "row_number",
    // ── Tier 2: very common — you hit these on most non-trivial problems ──
    "countDistinct", "rank", "lag", "coalesce-f", "isin", "expr", "concat_ws",
    "split", "explode", "regexp_replace", "substring", "to_date", "datediff",
    "date_add", "date_format", "year", "collect_list-agg", "broadcast", "union",
    "show", "between", "like", "operators", "round", "count", "selectExpr",
    "limit", "join-on-conditions", "concat", "regexp_extract", "to_timestamp",
    "current_date", "read-parquet", "read-csv", "write", "cache",
    // ── Tier 3: situational / advanced — reach for when the problem calls ──
    "running-sum", "rowsBetween", "window-sentinels", "rangeBetween", "pivot",
    "first-agg", "ntile", "greatest", "array", "struct", "array_contains",
    "size", "upper", "length", "lpad", "nvl", "floor", "months_between",
    "date_trunc", "unix_timestamp", "collect_list-f", "posexplode", "map_keys",
    "getitem", "getfield", "substr", "columns", "first", "collect", "toDF",
    "alias-df", "explain", "cume_dist", "stddev", "percentile_approx", "nanvl",
    "sample", "repartition", "coalesce-df", "crossJoin", "read-json",
    "saveAsTable", "createOrReplaceTempView", "window-tumbling",
    "perf-broadcast", "perf-repartition-coalesce", "perf-cache",
    "perf-partitionBy", "perf-aqe", "perf-salting"
  ],

  // Number of top-ranked functions that get the ★ essential badge (Tier 1).
  essentialCount: 24,
  fns: [

    // ============================================================ DataFrame
    {
      id: "select",
      group: "DataFrame",
      name: "DataFrame.select",
      signature: "df.select(*cols)",
      summary: "Project or derive columns; returns a <b>new</b> DataFrame (a narrow transformation, lazy).",
      returns: "DataFrame",
      params: [
        { name: "*cols", type: "str | Column | list", desc: "Column names or <code>Column</code> expressions to keep/derive. A single <code>'*'</code> keeps all columns; you may mix <code>'*'</code> with extra derived columns. Passing a Python <code>list</code> is equivalent to unpacking it. Duplicate output names are allowed but ambiguous downstream." }
      ],
      example: "df.select('id',\n  (F.col('amount') * 1.1).alias('amt'))",
      output: "DataFrame[id, amt]",
      notes: "Use <code>selectExpr</code> for SQL-string expressions. <code>select</code> cannot reference an alias defined earlier in the same call."
    },
    {
      id: "selectExpr",
      group: "DataFrame",
      name: "DataFrame.selectExpr",
      signature: "df.selectExpr(*expr)",
      summary: "Like <code>select</code> but each argument is a <b>SQL expression string</b> parsed by Spark SQL.",
      returns: "DataFrame",
      params: [
        { name: "*expr", type: "str", desc: "One or more SQL projection strings, e.g. <code>'amount * 1.1 AS amt'</code>, <code>'CASE WHEN x>0 THEN 1 ELSE 0 END'</code>. Supports <code>AS</code> aliasing, casts (<code>CAST(x AS int)</code>), and any built-in SQL function. No access to Python <code>Column</code> objects." }
      ],
      example: "df.selectExpr('id',\n  'amount * 1.1 AS amt',\n  'upper(name) AS n')",
      output: "DataFrame[id, amt, n]",
      notes: "Handy when porting SQL; identical plan to the equivalent <code>select</code>+<code>F.expr</code>."
    },
    {
      id: "filter",
      group: "DataFrame",
      name: "DataFrame.filter / where",
      signature: "df.filter(condition)   # where is an alias",
      summary: "Keep only rows where the boolean condition is true. Rows where the predicate is <code>null</code> are <b>dropped</b>.",
      returns: "DataFrame",
      params: [
        { name: "condition", type: "Column | str", desc: "A boolean <code>Column</code> (<code>F.col('a') &gt; 5</code>) or a SQL string (<code>'a &gt; 5 AND b IS NOT NULL'</code>). Combine Column predicates with <code>&amp;</code> <code>|</code> <code>~</code> and parenthesize each comparison. Three-valued logic: only <code>true</code> rows survive; <code>null</code>/<code>false</code> are removed." }
      ],
      example: "df.filter((F.col('age') >= 18) & F.col('active'))\n# or: df.where('age >= 18 AND active')",
      output: "DataFrame (subset of rows)",
      notes: "<code>where</code> is a pure alias of <code>filter</code>. Predicate pushdown moves this into the scan for Parquet/ORC."
    },
    {
      id: "withColumn",
      group: "DataFrame",
      name: "DataFrame.withColumn",
      signature: "df.withColumn(colName, col)",
      summary: "Add a new column or <b>replace</b> an existing one of the same name; returns a new DataFrame.",
      returns: "DataFrame",
      params: [
        { name: "colName", type: "str", desc: "Output column name. If it already exists, that column is <b>overwritten</b> (schema position preserved); otherwise it is appended." },
        { name: "col", type: "Column", desc: "A <code>Column</code> expression evaluated per row. Must be a Column — a literal must be wrapped in <code>F.lit(...)</code>. Can reference existing columns including the one being replaced." }
      ],
      example: "df.withColumn('amt_tax',\n  F.col('amount') * F.lit(1.2))",
      output: "DataFrame[..., amt_tax]",
      notes: "Chaining many <code>withColumn</code> calls builds a deep plan; prefer a single <code>select</code>/<code>withColumns</code> for dozens of columns."
    },
    {
      id: "withColumnRenamed",
      group: "DataFrame",
      name: "DataFrame.withColumnRenamed",
      signature: "df.withColumnRenamed(existing, new)",
      summary: "Rename one column; a <b>no-op</b> (no error) if <code>existing</code> is not present.",
      returns: "DataFrame",
      params: [
        { name: "existing", type: "str", desc: "Current column name to rename. If no column matches, the DataFrame is returned unchanged with no error raised." },
        { name: "new", type: "str", desc: "New name. If it collides with another existing column you get two columns of the same name (ambiguous)." }
      ],
      example: "df.withColumnRenamed('amount', 'amt')",
      output: "DataFrame with 'amt' instead of 'amount'",
      notes: "For many renames use <code>toDF(*names)</code> or <code>withColumnsRenamed({...})</code> (Spark 3.4+)."
    },
    {
      id: "drop",
      group: "DataFrame",
      name: "DataFrame.drop",
      signature: "df.drop(*cols)",
      summary: "Remove one or more columns; silently ignores names that don't exist.",
      returns: "DataFrame",
      params: [
        { name: "*cols", type: "str | Column", desc: "Column names (or <code>Column</code> refs) to drop. Unknown names are ignored (no error). Passing a <code>Column</code> object matches by exact reference, useful to drop one side of a self-join's duplicate column." }
      ],
      example: "df.drop('tmp', 'debug_col')",
      output: "DataFrame without dropped columns",
      notes: "Dropping by string name that is ambiguous (duplicated) drops <b>all</b> matches."
    },
    {
      id: "distinct",
      group: "DataFrame",
      name: "DataFrame.distinct",
      signature: "df.distinct()",
      summary: "Return rows that are unique across <b>all</b> columns. A wide transformation (shuffle).",
      returns: "DataFrame",
      params: [
        { name: "(no args)", type: "-", desc: "Takes no arguments — every column participates in the equality. To dedupe on a subset use <code>dropDuplicates(subset)</code>. NULLs are treated as equal to one another, so all-null duplicate rows collapse to one." }
      ],
      example: "df.select('country', 'city').distinct()",
      output: "DataFrame with duplicate rows removed",
      notes: "Equivalent to <code>dropDuplicates()</code> with no subset. NULLs are treated as equal to each other."
    },
    {
      id: "dropDuplicates",
      group: "DataFrame",
      name: "DataFrame.dropDuplicates",
      signature: "df.dropDuplicates(subset=None)",
      summary: "Drop duplicate rows, optionally considering only a <b>subset</b> of columns for equality.",
      returns: "DataFrame",
      params: [
        { name: "subset", type: "list[str] | None", desc: "Columns that define a duplicate. When <code>None</code> (default) all columns are used (same as <code>distinct</code>). When given, the <b>first</b> row per key group is kept but which row is arbitrary — order it first (e.g. via a window) if you need a specific one." }
      ],
      example: "(df.orderBy(F.desc('ts'))\n  .dropDuplicates(['user_id']))",
      output: "One row per user_id",
      notes: "For deterministic 'latest per key' prefer <code>row_number()</code> over a window; <code>dropDuplicates</code> row choice is not guaranteed by a preceding sort across a shuffle."
    },
    {
      id: "orderBy",
      group: "DataFrame",
      name: "DataFrame.orderBy / sort",
      signature: "df.orderBy(*cols, ascending=...)",
      summary: "Globally sort rows. A wide transformation that forces a full shuffle (range partitioning).",
      returns: "DataFrame",
      params: [
        { name: "*cols", type: "str | Column", desc: "Sort keys. Use <code>F.col('c').desc()</code> / <code>.asc()</code>, and <code>.desc_nulls_last()</code> / <code>.asc_nulls_first()</code> to control NULL placement (default: nulls first on asc, last on desc)." },
        { name: "ascending", type: "bool | list[bool]", desc: "Direction when keys are plain strings. A single bool applies to all; a list must match the number of keys, e.g. <code>ascending=[True, False]</code>. Ignored if you pass <code>.desc()</code> Columns." }
      ],
      example: "df.orderBy(F.col('dept'), F.col('salary').desc())\n# or: df.orderBy('dept', 'salary', ascending=[True, False])",
      output: "Globally sorted DataFrame",
      notes: "<code>sort</code> is an alias. For top-N prefer <code>orderBy(...).limit(n)</code> which Spark optimizes to a partial (heap) sort."
    },
    {
      id: "limit",
      group: "DataFrame",
      name: "DataFrame.limit",
      signature: "df.limit(num)",
      summary: "Return at most <code>num</code> rows as a new DataFrame (lazy, unlike <code>take</code>).",
      returns: "DataFrame",
      params: [
        { name: "num", type: "int", desc: "Maximum number of rows. Which rows are returned is arbitrary unless preceded by <code>orderBy</code>. <code>0</code> yields an empty DataFrame keeping the schema." }
      ],
      example: "df.orderBy(F.desc('score')).limit(10)",
      output: "DataFrame with <= num rows",
      notes: "Unlike <code>take(n)</code>/<code>head(n)</code> (actions returning Rows), <code>limit</code> stays a DataFrame you can keep transforming."
    },
    {
      id: "union",
      group: "DataFrame",
      name: "DataFrame.union / unionByName",
      signature: "df.union(other)  |  df.unionByName(other, allowMissingColumns=False)",
      summary: "Concatenate rows of two DataFrames (bag union — duplicates kept).",
      returns: "DataFrame",
      params: [
        { name: "other", type: "DataFrame", desc: "The DataFrame to append. <code>union</code> matches columns strictly by <b>position</b> (schemas must line up); <code>unionByName</code> matches by <b>name</b> regardless of order." },
        { name: "allowMissingColumns", type: "bool", desc: "(<code>unionByName</code> only) When <code>True</code>, columns present in only one side are kept and filled with <code>null</code> on the other; when <code>False</code> (default) a name mismatch raises." }
      ],
      example: "df.unionByName(df2, allowMissingColumns=True)",
      output: "DataFrame with rows of both",
      notes: "Neither dedups — chain <code>.distinct()</code> for a set union. <code>union</code> by position is a classic source of silently swapped columns."
    },
    {
      id: "sample",
      group: "DataFrame",
      name: "DataFrame.sample",
      signature: "df.sample(withReplacement=False, fraction, seed=None)",
      summary: "Return a random sampled subset of rows (approximate size).",
      returns: "DataFrame",
      params: [
        { name: "withReplacement", type: "bool", desc: "If <code>True</code> a row can be selected multiple times (Poisson sampling); if <code>False</code> (default) each row is included at most once (Bernoulli)." },
        { name: "fraction", type: "float", desc: "Expected fraction of rows in <code>[0.0, 1.0]</code> (may exceed 1 with replacement). It is a <b>probability per row</b>, not an exact count — the result size varies around <code>fraction * count</code>." },
        { name: "seed", type: "int | None", desc: "RNG seed for reproducibility. Same seed + same partitioning gives the same sample." }
      ],
      example: "df.sample(fraction=0.1, seed=42)",
      output: "~10% of rows",
      notes: "For exact-count or per-key sampling use <code>sampleBy(col, fractions)</code> (stratified)."
    },
    {
      id: "repartition",
      group: "DataFrame",
      name: "DataFrame.repartition",
      signature: "df.repartition(numPartitions=None, *cols)",
      summary: "Reshuffle data into a new number of partitions and/or by key. Always a <b>full shuffle</b>.",
      returns: "DataFrame",
      params: [
        { name: "numPartitions", type: "int", desc: "Target partition count. Can increase or decrease. If omitted and columns are given, defaults to <code>spark.sql.shuffle.partitions</code> (200)." },
        { name: "*cols", type: "str | Column", desc: "Hash-partition keys. Rows with the same key land in the same partition (co-locates for a later join/aggregation), and each key's rows are together. Without cols, rows are round-robin distributed for even balance." }
      ],
      example: "df.repartition(200, 'customer_id')",
      output: "DataFrame with 200 partitions keyed by customer_id",
      notes: "Use to <b>increase</b> parallelism or fix skew; use <code>coalesce</code> to reduce partitions without a shuffle."
    },
    {
      id: "coalesce-df",
      group: "DataFrame",
      name: "DataFrame.coalesce",
      signature: "df.coalesce(numPartitions)",
      summary: "<b>Reduce</b> the number of partitions by merging existing ones — no full shuffle (narrow).",
      returns: "DataFrame",
      params: [
        { name: "numPartitions", type: "int", desc: "Target partition count, which must be <b>less than or equal</b> to the current count (increasing does nothing useful). Merges local partitions without moving data across the network, so it is cheap but can create skewed/uneven partitions and reduce upstream parallelism." }
      ],
      example: "df.coalesce(1).write.parquet('/out')  # single output file",
      output: "DataFrame with fewer partitions",
      notes: "<code>coalesce(1)</code> before a wide upstream stage can starve parallelism — repartition earlier instead. Not to be confused with <code>F.coalesce</code> (null-fill)."
    },
    {
      id: "cache",
      group: "DataFrame",
      name: "DataFrame.cache / persist",
      signature: "df.cache()  |  df.persist(storageLevel=MEMORY_AND_DISK)",
      summary: "Mark a DataFrame to be materialized and reused across actions. <b>Lazy</b> — populated on the first action.",
      returns: "DataFrame (self)",
      params: [
        { name: "storageLevel", type: "StorageLevel", desc: "(<code>persist</code> only) Where/how to store: <code>MEMORY_ONLY</code> (recompute on eviction), <code>MEMORY_AND_DISK</code> (default for DataFrames — spill to disk), <code>DISK_ONLY</code>, or <code>*_SER</code>/<code>*_2</code> variants (serialized / 2x replicated). <code>cache()</code> == <code>persist(MEMORY_AND_DISK)</code>." }
      ],
      example: "from pyspark import StorageLevel\ndf2 = df.filter('active').persist(StorageLevel.MEMORY_AND_DISK)\ndf2.count()  # triggers materialization",
      output: "Same DataFrame, now cached",
      notes: "Call an action to fill the cache. Release with <code>df.unpersist()</code>. Only cache if reused &gt;= 2 times."
    },
    {
      id: "alias-df",
      group: "DataFrame",
      name: "DataFrame.alias",
      signature: "df.alias(name)",
      summary: "Give the whole DataFrame a table alias, so its columns can be qualified in joins.",
      returns: "DataFrame",
      params: [
        { name: "name", type: "str", desc: "The alias/table name. After aliasing, refer to columns as <code>F.col('name.col')</code> to disambiguate identically-named columns from both sides of a join." }
      ],
      example: "a = df.alias('a'); b = df2.alias('b')\na.join(b, F.col('a.id') == F.col('b.id')).select('a.id', 'b.name')",
      output: "DataFrame usable in qualified joins",
      notes: "Different from <code>Column.alias</code> which renames a single column."
    },
    {
      id: "toDF",
      group: "DataFrame",
      name: "DataFrame.toDF",
      signature: "df.toDF(*cols)",
      summary: "Return a new DataFrame with all columns renamed by <b>position</b>.",
      returns: "DataFrame",
      params: [
        { name: "*cols", type: "str", desc: "New names for every column, in order. The count <b>must equal</b> the current number of columns or it raises. Fastest way to rename all columns at once." }
      ],
      example: "df.toDF('id', 'name', 'amount')",
      output: "DataFrame[id, name, amount]",
      notes: "Also used to attach column names to an RDD-derived / schema-less DataFrame."
    },
    {
      id: "columns",
      group: "DataFrame",
      name: "DataFrame.columns / dtypes / schema",
      signature: "df.columns  |  df.dtypes  |  df.printSchema()",
      summary: "Inspect the schema (metadata only — no job runs).",
      returns: "list / list[tuple] / None",
      params: [
        { name: "columns", type: "property -> list[str]", desc: "List of column names in order." },
        { name: "dtypes", type: "property -> list[(str,str)]", desc: "List of <code>(name, typeString)</code> pairs, e.g. <code>('amount','double')</code>." },
        { name: "printSchema", type: "method -> None", desc: "Pretty-prints the (possibly nested) schema tree to stdout including nullability, e.g. <code>|-- amount: double (nullable = true)</code>." }
      ],
      example: "df.columns\ndf.dtypes\ndf.printSchema()",
      output: "['id','name','amount']\n[('id','int'),('name','string'),('amount','double')]",
      notes: "<code>df.schema</code> returns the full <code>StructType</code> object for programmatic use."
    },
    {
      id: "show",
      group: "DataFrame",
      name: "DataFrame.show",
      signature: "df.show(n=20, truncate=True, vertical=False)",
      summary: "<b>Action</b>: print the first rows in a formatted table to stdout.",
      returns: "None",
      params: [
        { name: "n", type: "int", desc: "Number of rows to display (default 20). Triggers a job to fetch just those rows." },
        { name: "truncate", type: "bool | int", desc: "<code>True</code> (default) trims cell strings to 20 chars; an int truncates to that width; <code>False</code> shows full values." },
        { name: "vertical", type: "bool", desc: "When <code>True</code>, prints each row as key: value lines (readable for very wide schemas)." }
      ],
      example: "df.show(5, truncate=False)",
      output: "+---+-----+------+\n| id| name|amount|\n+---+-----+------+\n...",
      notes: "For notebooks, <code>df.limit(n).toPandas()</code> gives a richer table but pulls data to the driver."
    },
    {
      id: "collect",
      group: "DataFrame",
      name: "DataFrame.collect",
      signature: "df.collect()",
      summary: "<b>Action</b>: bring <b>all</b> rows to the driver as a Python list of <code>Row</code>.",
      returns: "list[Row]",
      params: [
        { name: "(no args)", type: "-", desc: "Takes no arguments and pulls the <b>entire</b> result to the driver — memory scales with row count. Cap the size first with <code>limit(n)</code>/<code>take(n)</code>, or write to storage instead, to avoid a driver OOM." }
      ],
      example: "rows = df.filter('id < 10').collect()\nvals = [r['name'] for r in rows]",
      output: "[Row(id=1, name='a', ...), ...]",
      notes: "Dangerous on large data — collects everything to the driver (OOM risk). Prefer <code>take(n)</code>, <code>limit</code>, or writing out."
    },
    {
      id: "count",
      group: "DataFrame",
      name: "DataFrame.count",
      signature: "df.count()",
      summary: "<b>Action</b>: return the exact number of rows as a Python int (triggers a full scan).",
      returns: "int",
      params: [
        { name: "(no args)", type: "-", desc: "Takes no arguments; counts all rows of the current (possibly filtered) DataFrame. Re-runs the whole lineage on every call unless the DataFrame is cached. Distinct from <code>F.count(col)</code> the aggregate, which counts non-null values." }
      ],
      example: "n = df.filter('active').count()",
      output: "12345",
      notes: "Each call re-runs the job unless the DataFrame is cached. For a fast estimate on huge data consider approximate methods."
    },
    {
      id: "first",
      group: "DataFrame",
      name: "DataFrame.first / head / take",
      signature: "df.first()  |  df.head(n=1)  |  df.take(n)",
      summary: "<b>Action</b>: pull the first row(s) to the driver.",
      returns: "Row | list[Row]",
      params: [
        { name: "n", type: "int", desc: "For <code>head(n)</code>/<code>take(n)</code>, the number of rows to return as a list. <code>head()</code> with no arg and <code>first()</code> return a single <code>Row</code> (or <code>None</code> if empty). Rows are arbitrary unless preceded by <code>orderBy</code>." }
      ],
      example: "df.orderBy(F.desc('ts')).first()['id']",
      output: "Row(id=99, ...) -> 99",
      notes: "<code>take(n)</code> and <code>head(n)</code> are equivalent; they short-circuit and only scan enough partitions to gather n rows."
    },
    {
      id: "explain",
      group: "DataFrame",
      name: "DataFrame.explain",
      signature: "df.explain(extended=False, mode=None)",
      summary: "Print the query plan — the key tool for reasoning about shuffles, joins, and pushdown.",
      returns: "None",
      params: [
        { name: "extended", type: "bool", desc: "When <code>True</code>, prints all four plans (parsed, analyzed, optimized, physical) instead of just the physical plan." },
        { name: "mode", type: "str", desc: "One of <code>'simple'</code>, <code>'extended'</code>, <code>'codegen'</code>, <code>'cost'</code> (shows row/size estimates), <code>'formatted'</code> (numbered, readable). Overrides <code>extended</code>." }
      ],
      example: "df.join(df2, 'id').explain(mode='formatted')",
      output: "== Physical Plan ==\n*(2) BroadcastHashJoin ...",
      notes: "Look for <code>Exchange</code> (shuffle), <code>BroadcastHashJoin</code> vs <code>SortMergeJoin</code>, and <code>PushedFilters</code>."
    },

    // ============================================================ Column
    {
      id: "col",
      group: "Column",
      name: "F.col / F.column",
      signature: "F.col(name)",
      summary: "Reference an existing column by name, producing a <code>Column</code> to build expressions.",
      returns: "Column",
      params: [
        { name: "name", type: "str", desc: "Column name. Supports dotted paths for structs (<code>'addr.city'</code>) and backticks for odd names (<code>'`weird name`'</code>). <code>'*'</code> expands to all columns in some contexts. Does not verify existence until the plan is analyzed." }
      ],
      example: "df.select(F.col('amount') * 2)",
      output: "Column",
      notes: "<code>df['amount']</code> and <code>df.amount</code> are equivalent but bound to that DataFrame (useful to disambiguate joins)."
    },
    {
      id: "lit",
      group: "Column",
      name: "F.lit",
      signature: "F.lit(value)",
      summary: "Wrap a Python literal as a constant <code>Column</code>.",
      returns: "Column",
      params: [
        { name: "value", type: "Any", desc: "A scalar (int/float/str/bool), <code>None</code> (typed null), or list/dict (Spark 3.4+ maps to array/map). Needed anywhere a Column is required but you have a constant, e.g. <code>withColumn('flag', F.lit(1))</code>." }
      ],
      example: "df.withColumn('src', F.lit('batch'))",
      output: "Column (constant)",
      notes: "Use <code>F.lit(None).cast('int')</code> to add a typed null column."
    },
    {
      id: "alias-col",
      group: "Column",
      name: "Column.alias / name",
      signature: "col.alias(*names, metadata=None)",
      summary: "Rename a column expression in the output.",
      returns: "Column",
      params: [
        { name: "*names", type: "str", desc: "The output name. Passing multiple names is only valid when the expression returns multiple columns (e.g. <code>posexplode</code>)." },
        { name: "metadata", type: "dict", desc: "Optional column metadata (e.g. ML attribute info) attached to the schema field." }
      ],
      example: "df.select(\n  (F.col('a') + F.col('b')).alias('total'))",
      output: "DataFrame[total]",
      notes: "<code>name</code> is an alias of <code>alias</code>."
    },
    {
      id: "cast",
      group: "Column",
      name: "Column.cast / astype",
      signature: "col.cast(dataType)",
      summary: "Convert a column to another type. Invalid conversions become <code>null</code> (no error).",
      returns: "Column",
      params: [
        { name: "dataType", type: "str | DataType", desc: "Target type as a string (<code>'int'</code>, <code>'double'</code>, <code>'string'</code>, <code>'date'</code>, <code>'timestamp'</code>, <code>'decimal(10,2)'</code>) or a <code>DataType</code> object. A value that can't be parsed to the target yields <code>null</code>, silently — validate first if that matters." }
      ],
      example: "df.withColumn('amount',\n  F.col('amount').cast('decimal(12,2)'))",
      output: "Column of new type",
      notes: "<code>astype</code> is an alias. String-&gt;number of a non-numeric string gives null, a common silent data-loss bug."
    },
    {
      id: "when",
      group: "Column",
      name: "F.when / Column.otherwise",
      signature: "F.when(condition, value).when(...).otherwise(default)",
      summary: "Vectorized if/elif/else. Builds a <code>CASE WHEN</code> expression.",
      returns: "Column",
      params: [
        { name: "condition", type: "Column", desc: "A boolean Column tested per row. Chain multiple <code>.when()</code> for elif branches; the <b>first</b> true branch wins." },
        { name: "value", type: "Column | scalar", desc: "Result when the condition is true. Scalars are auto-lifted to <code>lit</code>." },
        { name: "default (otherwise)", type: "Column | scalar", desc: "Result when no condition matched. If <code>otherwise</code> is omitted, unmatched rows get <code>null</code>." }
      ],
      example: "df.withColumn('tier',\n  F.when(F.col('spend') > 1000, 'gold')\n   .when(F.col('spend') > 100, 'silver')\n   .otherwise('bronze'))",
      output: "Column with tier per row",
      notes: "Conditions are evaluated top-down; put the most specific first."
    },
    {
      id: "isnull",
      group: "Column",
      name: "Column.isNull / isNotNull",
      signature: "col.isNull()  |  col.isNotNull()",
      summary: "Boolean test for SQL <code>NULL</code> (the only correct null check — do not use <code>== None</code>).",
      returns: "Column",
      params: [
        { name: "(no args)", type: "-", desc: "Called on a <code>Column</code> with no arguments. <code>isNull()</code> is true only for SQL NULL; <code>isNotNull()</code> is its complement. Note <code>NaN</code> is <b>not</b> null (use <code>F.isnan</code>), and <code>col == None</code> yields null (never true), so always use these methods." }
      ],
      example: "df.filter(F.col('email').isNotNull())",
      output: "Boolean Column",
      notes: "<code>NaN</code> is not null — use <code>F.isnan(col)</code> for float NaN. Comparing to null with <code>==</code> yields null (never true)."
    },
    {
      id: "isin",
      group: "Column",
      name: "Column.isin",
      signature: "col.isin(*values)",
      summary: "True when the column value is in the given set of literals.",
      returns: "Column",
      params: [
        { name: "*values", type: "scalar | list", desc: "The allowed values, passed as varargs or a single list. Equivalent to SQL <code>IN (...)</code>. A <code>null</code> column value yields null (not matched). Negate with <code>~col.isin(...)</code>." }
      ],
      example: "df.filter(F.col('country').isin('US', 'CA', 'MX'))",
      output: "Boolean Column",
      notes: "For a large or dynamic set, a semi-join is usually faster than a huge <code>isin</code>."
    },
    {
      id: "between",
      group: "Column",
      name: "Column.between",
      signature: "col.between(lower, upper)",
      summary: "True when <code>lower &lt;= col &lt;= upper</code> (both bounds <b>inclusive</b>).",
      returns: "Column",
      params: [
        { name: "lower", type: "scalar | Column", desc: "Inclusive lower bound." },
        { name: "upper", type: "scalar | Column", desc: "Inclusive upper bound. Works for numbers, dates and strings (lexicographic)." }
      ],
      example: "df.filter(F.col('age').between(18, 65))",
      output: "Boolean Column",
      notes: "Inclusive on both ends — subtract one from <code>upper</code> for a half-open range."
    },
    {
      id: "like",
      group: "Column",
      name: "Column.like / rlike / ilike",
      signature: "col.like(pattern)  |  col.rlike(regex)  |  col.ilike(pattern)",
      summary: "Pattern matching: SQL wildcards (<code>like</code>) or full regex (<code>rlike</code>).",
      returns: "Column",
      params: [
        { name: "pattern (like/ilike)", type: "str", desc: "SQL LIKE pattern where <code>%</code> matches any run of chars and <code>_</code> matches one char. <code>ilike</code> is the case-insensitive variant." },
        { name: "regex (rlike)", type: "str", desc: "A Java regular expression matched anywhere in the string (not anchored). Use <code>^</code>/<code>$</code> to anchor. Backslashes must be escaped in Python strings (or use raw strings)." }
      ],
      example: "df.filter(F.col('name').rlike('^A.*n$'))\ndf.filter(F.col('sku').like('ABC-%'))",
      output: "Boolean Column",
      notes: "<code>rlike</code> maps to SQL <code>RLIKE</code>/<code>REGEXP</code>; prefer it for anything beyond simple wildcards."
    },
    {
      id: "operators",
      group: "Column",
      name: "Column operators (& | ~ comparisons)",
      signature: "(a > 5) & (b == 'x') | ~c",
      summary: "Combine and compare Column expressions with Python operators (overloaded to Spark SQL).",
      returns: "Column",
      params: [
        { name: "comparison", type: "== != > >= < <=", desc: "Element-wise comparisons producing a boolean Column. <code>==</code> with null yields null." },
        { name: "&amp; | ~", type: "and / or / not", desc: "Boolean combinators — <b>bitwise</b> operators, not Python <code>and</code>/<code>or</code>/<code>not</code>. Each operand <b>must be parenthesized</b> because <code>&amp;</code> binds tighter than comparisons." },
        { name: "+ - * / %", type: "arithmetic", desc: "Element-wise math; division of integers yields double. <code>%</code> is modulo." }
      ],
      example: "df.filter((F.col('a') > 5) & ~(F.col('b') == 'x'))",
      output: "Boolean Column",
      notes: "Using Python <code>and</code>/<code>or</code> on Columns raises or silently misbehaves — always use <code>&amp;</code> <code>|</code> <code>~</code>."
    },
    {
      id: "getitem",
      group: "Column",
      name: "Column.getItem",
      signature: "col.getItem(key)  |  col[key]",
      summary: "Index into an array (by position) or map (by key).",
      returns: "Column",
      params: [
        { name: "key", type: "int | str", desc: "An <b>int</b> index for an array column (0-based; out-of-range -&gt; null), or a <b>str</b> key for a map column (missing key -&gt; null). <code>col[key]</code> is shorthand." }
      ],
      example: "df.select(F.col('tags').getItem(0),\n  F.col('props')['color'])",
      output: "Element Column",
      notes: "For arrays you can also use <code>F.element_at(col, i)</code> which is <b>1-based</b> and supports negative indexing."
    },
    {
      id: "getfield",
      group: "Column",
      name: "Column.getField",
      signature: "col.getField(name)  |  col.name",
      summary: "Extract a field from a struct column.",
      returns: "Column",
      params: [
        { name: "name", type: "str", desc: "The struct field name to pull out. Dotted access (<code>F.col('addr.city')</code>) does the same. A missing field name fails at analysis time." }
      ],
      example: "df.select(F.col('address').getField('city'))",
      output: "Field Column",
      notes: "Use <code>withField</code>/<code>dropFields</code> (Spark 3.1+) to modify nested struct fields in place."
    },
    {
      id: "substr",
      group: "Column",
      name: "Column.substr",
      signature: "col.substr(startPos, length)",
      summary: "Extract a fixed-length substring by position (1-based).",
      returns: "Column",
      params: [
        { name: "startPos", type: "int | Column", desc: "Starting position, <b>1-based</b> (position 1 = first char). Negative counts from the end (Spark 3+)." },
        { name: "length", type: "int | Column", desc: "Number of characters to take. If it runs past the end, the available characters are returned." }
      ],
      example: "df.select(\n  F.col('code').substr(1, 3).alias('prefix'))",
      output: "3-char prefix Column",
      notes: "Equivalent to <code>F.substring(col, pos, len)</code>. Positions are 1-based, unlike Python slicing."
    },

    // ============================================================ Functions
    {
      id: "concat",
      group: "Functions",
      name: "F.concat",
      signature: "F.concat(*cols)",
      category: "Column function · string / array",
      summary: "Concatenate strings (or arrays) end-to-end. <b>Null-propagating</b>: if any argument is null, the whole result is null.",
      returns: "Column",
      params: [
        { name: "*cols", type: "Column | str", desc: "Two or more string (or array) columns/literals to join. If <b>any</b> argument is <code>null</code>, the whole result is <code>null</code> — use <code>concat_ws</code> to skip nulls. For array columns it merges them into one array." }
      ],
      example: "df.select(\n  F.concat(F.col('first'), F.lit(' '), F.col('last')))",
      output: "Concatenated string Column",
      works: "Any null anywhere in the list nukes the entire row." +
        "<table><thead><tr><th>first</th><th>last</th><th>concat</th></tr></thead><tbody>" +
        "<tr><td>'Ann'</td><td>'Lee'</td><td>'Ann Lee'</td></tr>" +
        "<tr><td>'Ann'</td><td>null</td><td>null</td></tr></tbody></table>",
      patterns: [
        { label: "Null-safe full name (guard each arg)", code: "df.withColumn('full_name',\n  F.concat(\n    F.coalesce('first', F.lit('')),\n    F.lit(' '),\n    F.coalesce('last', F.lit(''))))" },
        { label: "Merge two array columns", code: "df.withColumn('all_tags',\n  F.concat('sys_tags', 'user_tags'))" }
      ],
      gotchas: [
        "<b>Null propagation</b> is the classic trap — one null argument makes the whole result null. Wrap each arg in <code>F.coalesce(c, F.lit(''))</code>, or use <code>concat_ws</code>.",
        "String literals must be <code>F.lit(' ')</code>, not a bare Python <code>' '</code> in most positions."
      ],
      related: "<table><thead><tr><th>Function</th><th>Null behavior</th></tr></thead><tbody>" +
        "<tr><td><code>F.concat</code></td><td>Any null → whole result <b>null</b>.</td></tr>" +
        "<tr><td><code>F.concat_ws(sep, ...)</code></td><td><b>Skips</b> nulls, inserts a separator. Preferred for keys/paths.</td></tr></tbody></table>",
      interview: [
        { q: "What happens if one column in <code>F.concat</code> is null?", a: "The entire result is null (null-propagating). Use <code>F.concat_ws</code> (skips nulls) or <code>F.coalesce</code> each argument first." }
      ],
      notes: "For building delimited keys/paths, reach for <code>concat_ws</code> instead — nulls won't nuke the value.",
      memory: "<b>concat = null poisons the whole thing; concat_ws = null skipped.</b>"
    },
    {
      id: "concat_ws",
      group: "Functions",
      name: "F.concat_ws",
      signature: "F.concat_ws(sep, *cols)",
      category: "Column function · string",
      summary: "Concatenate with a separator, <b>skipping nulls</b> (no doubled delimiters).",
      returns: "Column",
      params: [
        { name: "sep", type: "str", desc: "The delimiter placed between values, e.g. <code>','</code> or <code>' - '</code>. A plain Python string is fine here (it is not a Column argument)." },
        { name: "*cols", type: "Column | str | array", desc: "Columns (or a single array column) to join. <code>null</code> values are <b>omitted</b> — no doubled separators. Pass an array column directly to join its elements." }
      ],
      example: "df.select(\n  F.concat_ws('-', 'year', 'month', 'day'))",
      output: "'2026-09-10'",
      works: "Nulls are dropped, so the separator count adapts:" +
        "<table><thead><tr><th>city</th><th>state</th><th>zip</th><th>concat_ws(', ')</th></tr></thead><tbody>" +
        "<tr><td>'Austin'</td><td>'TX'</td><td>'73301'</td><td>'Austin, TX, 73301'</td></tr>" +
        "<tr><td>'Austin'</td><td>null</td><td>'73301'</td><td>'Austin, 73301'</td></tr></tbody></table>",
      patterns: [
        { label: "Build a natural key from columns", code: "df.withColumn('nk',\n  F.concat_ws('|', 'country', 'store_id', 'sku'))" },
        { label: "Flatten an array column to a string", code: "df.withColumn('tags_csv',\n  F.concat_ws(',', F.col('tags')))" }
      ],
      gotchas: [
        "Skips nulls but <b>not empty strings</b> — <code>''</code> still produces a doubled separator. Convert <code>''</code> to null first if that matters.",
        "All non-null values are cast to string; numeric columns join fine without an explicit cast."
      ],
      related: "See <code>F.concat</code> (null-propagating, no separator) — <code>concat_ws</code> is almost always the safer choice for keys and paths.",
      interview: [
        { q: "Why prefer <code>concat_ws</code> over <code>concat</code> for a composite key?", a: "It skips nulls instead of returning null for the whole row, and it inserts the separator automatically — so a missing middle field doesn't poison or malform the key." }
      ],
      notes: "The go-to for keys/paths/CSV lines because nulls don't nuke the whole value.",
      memory: "<b>concat_ws = separator + skips nulls — the safe join.</b>"
    },
    {
      id: "substring",
      group: "Functions",
      name: "F.substring / substring_index",
      signature: "F.substring(str, pos, len)",
      category: "Column function · string",
      summary: "Fixed-length substring by position (function form of <code>Column.substr</code>). Positions are <b>1-based</b>.",
      returns: "Column",
      params: [
        { name: "str", type: "Column | str", desc: "The source string column." },
        { name: "pos", type: "int", desc: "Start position, <b>1-based</b> (position 1 = first char, unlike Python's 0-based slicing). Negative counts from the end." },
        { name: "len", type: "int", desc: "Number of characters to extract; if it runs past the end, the available characters are returned." }
      ],
      example: "df.select(\n  F.substring('phone', 1, 3).alias('area'))",
      output: "3-char Column",
      patterns: [
        { label: "Fixed-width field slice (mainframe extract)", code: "df.select(\n  F.substring('record', 1, 8).alias('acct'),\n  F.substring('record', 9, 2).alias('type'))" },
        { label: "Domain from an email (delimiter-based)", code: "df.withColumn('domain',\n  F.substring_index('email', '@', -1))" }
      ],
      gotchas: [
        "Positions are <b>1-based</b>, not 0-based — <code>substring(s, 1, 3)</code> takes the first three chars.",
        "For variable-length extraction driven by content, use <code>regexp_extract</code> or <code>substring_index</code> instead of hard-coded positions."
      ],
      related: "<code>F.substring_index(str, delim, count)</code> returns everything before the <code>count</code>-th delimiter (negative = from the right) — handy for paths, domains, and file extensions. <code>Column.substr</code> is the method form.",
      memory: "<b>substring = 1-based fixed slice; substring_index = split-by-delimiter slice.</b>"
    },
    {
      id: "split",
      group: "Functions",
      name: "F.split",
      signature: "F.split(str, pattern, limit=-1)",
      category: "Column function · string → array",
      summary: "Split a string by a <b>regex</b> into an <code>array&lt;string&gt;</code>.",
      returns: "Column (array<string>)",
      params: [
        { name: "str", type: "Column | str", desc: "Source string column." },
        { name: "pattern", type: "str", desc: "A <b>regular expression</b> delimiter — <b>not a literal</b>. Escape regex metacharacters like <code>.</code> <code>|</code> <code>(</code> — splitting on a dot needs <code>'\\\\.'</code>." },
        { name: "limit", type: "int", desc: "Max number of pieces. <code>&lt;= 0</code> (default) splits with no limit and trailing empty strings are removed. <code>&gt; 0</code> caps the array at that many elements, leaving the unsplit remainder in the last one." }
      ],
      example: "df.select(F.split('csv', ',', 3))",
      output: "['a','b','c,d,e']  (limit=3)",
      patterns: [
        { label: "Take the first token", code: "df.withColumn('area_code',\n  F.split('phone', '-').getItem(0))" },
        { label: "Split then explode to rows", code: "df.select('id',\n  F.explode(F.split('csv_tags', ',')).alias('tag'))" },
        { label: "Split on a literal dot (escaped)", code: "df.withColumn('parts',\n  F.split('filename', '\\\\.'))" }
      ],
      gotchas: [
        "<code>pattern</code> is a <b>regex</b>, not a literal string — <code>F.split(s, '.')</code> splits on every character (dot matches all). Use <code>'\\\\.'</code>.",
        "Indexing past the end via <code>getItem(i)</code> returns <code>null</code>, not an error.",
        "Default <code>limit=-1</code> drops trailing empty strings; pass a positive limit to keep them."
      ],
      related: "Pairs with <code>getItem(i)</code> / <code>[i]</code> to pick a token, or <code>explode</code> to fan out to rows. Inverse of <code>concat_ws</code>.",
      interview: [
        { q: "<code>F.split('ip', '.')</code> returns an array of empty strings — why?", a: "The second argument is a regex and <code>.</code> matches any character, so every position is a delimiter. Escape it: <code>F.split('ip', '\\\\.')</code>." }
      ],
      memory: "<b>split = regex delimiter → array; escape your dots.</b>"
    },
    {
      id: "regexp_replace",
      group: "Functions",
      name: "F.regexp_replace",
      signature: "F.regexp_replace(str, pattern, replacement)",
      category: "Column function · string / regex",
      summary: "Replace <b>all</b> regex matches in a string (global).",
      returns: "Column",
      params: [
        { name: "str", type: "Column | str", desc: "Source string column." },
        { name: "pattern", type: "str", desc: "Java regex to match — matches <b>all</b> occurrences. Backslashes need double-escaping in a Python string (<code>'\\\\d'</code> for a digit)." },
        { name: "replacement", type: "str", desc: "Replacement text. Supports capture-group backreferences like <code>$1</code> from groups defined in <code>pattern</code>." }
      ],
      example: "df.select(F.regexp_replace('phone', '[^0-9]', ''))",
      output: "Digits-only string",
      patterns: [
        { label: "Strip everything but digits", code: "df.withColumn('digits',\n  F.regexp_replace('phone', '[^0-9]', ''))" },
        { label: "Collapse repeated whitespace", code: "df.withColumn('clean',\n  F.regexp_replace('desc', '\\\\s+', ' '))" },
        { label: "Reformat with a backreference", code: "df.withColumn('masked',\n  F.regexp_replace('ssn', '(\\\\d{3})\\\\d{2}(\\\\d{4})', '$1-**-$2'))" }
      ],
      gotchas: [
        "Backslashes double up in Python strings: a digit is <code>'\\\\d'</code>, not <code>'\\d'</code>. Or use an <code>r'...'</code> raw string.",
        "It is <b>global</b> — replaces every match. There is no first-match-only variant here.",
        "For a literal replacement (not regex), escape metacharacters in <code>pattern</code> or the match won't behave literally."
      ],
      related: "<table><thead><tr><th>Function</th><th>Use for</th></tr></thead><tbody>" +
        "<tr><td><code>regexp_replace</code></td><td>Rewrite / scrub text (all matches).</td></tr>" +
        "<tr><td><code>regexp_extract</code></td><td>Pull one capture group out.</td></tr>" +
        "<tr><td><code>rlike</code> / <code>like</code></td><td>Boolean match test in a filter.</td></tr></tbody></table>",
      perf: "Row-wise, no shuffle. Complex or backtracking-prone patterns can be CPU-heavy over billions of rows — keep the regex tight and anchored.",
      interview: [
        { q: "How do you keep only digits from a phone column?", a: "<code>F.regexp_replace('phone', '[^0-9]', '')</code> — replace every non-digit with empty." },
        { q: "Why does <code>'\\d'</code> not work in the pattern?", a: "Python consumes the backslash before Spark sees it. Double-escape (<code>'\\\\d'</code>) or use a raw string <code>r'\\d'</code>." }
      ],
      memory: "<b>regexp_replace = scrub/rewrite all matches; double-escape backslashes.</b>"
    },
    {
      id: "regexp_extract",
      group: "Functions",
      name: "F.regexp_extract",
      signature: "F.regexp_extract(str, pattern, idx)",
      category: "Column function · string / regex",
      summary: "Extract one capture group from the <b>first</b> regex match. No match → <b>empty string</b> (not null).",
      returns: "Column",
      params: [
        { name: "str", type: "Column | str", desc: "Source string column." },
        { name: "pattern", type: "str", desc: "Java regex with capture groups <code>( )</code>. Double-escape backslashes (<code>'\\\\d'</code>) or use a raw string." },
        { name: "idx", type: "int", desc: "Which group to return: <code>0</code> = the whole match, <code>1</code> = first group, etc. If nothing matches, returns an <b>empty string</b> — not null." }
      ],
      example: "df.select(\n  F.regexp_extract('email', '@(.+)$', 1).alias('domain'))",
      output: "'example.com'",
      patterns: [
        { label: "Domain from an email", code: "df.withColumn('domain',\n  F.regexp_extract('email', '@(.+)$', 1))" },
        { label: "Extract + null-out non-matches", code: "domain = F.regexp_extract('email', '@(.+)$', 1)\ndf.withColumn('domain',\n  F.when(domain == '', None).otherwise(domain))" }
      ],
      gotchas: [
        "<b>No match returns <code>''</code>, not null.</b> Convert with a <code>when(x=='', None)</code> guard if you need proper nulls (e.g. for counting matches).",
        "Only the <b>first</b> match is returned. For every match use <code>regexp_extract_all</code> (Spark 3.4+).",
        "<code>idx=0</code> is the full match; group indices start at 1."
      ],
      related: "<code>regexp_replace</code> rewrites matches; <code>rlike</code> tests for a match in a filter; <code>regexp_extract_all</code> (3.4+) returns an array of all matches.",
      interview: [
        { q: "What does <code>regexp_extract</code> return when the pattern doesn't match?", a: "An empty string <code>''</code>, never null. This trips up match-counting — guard with a <code>when(x=='', None)</code> to get real nulls." },
        { q: "How do you get every match, not just the first?", a: "<code>F.regexp_extract_all(str, pattern, idx)</code> (Spark 3.4+) returns an array of all matches." }
      ],
      memory: "<b>regexp_extract = first match, group idx; no match = '' not null.</b>"
    },
    {
      id: "upper",
      group: "Functions",
      name: "F.upper / lower / trim / initcap",
      signature: "F.upper(col) | F.lower(col) | F.trim(col) | F.ltrim/rtrim | F.initcap(col)",
      category: "Column function · string",
      summary: "Case and whitespace normalization for strings — the standard cleanup before joins/dedup.",
      returns: "Column",
      params: [
        { name: "upper / lower", type: "Column", desc: "Uppercase / lowercase the string." },
        { name: "trim / ltrim / rtrim", type: "Column", desc: "Strip whitespace from both ends / left / right." },
        { name: "initcap", type: "Column", desc: "Capitalize the first letter of each whitespace-separated word." }
      ],
      example: "df.select(F.initcap(F.trim(F.col('name'))))",
      output: "'  john  ' -> 'John'",
      patterns: [
        { label: "Normalize a join/dedup key", code: "df.withColumn('email_key',\n  F.lower(F.trim('email')))" }
      ],
      gotchas: [
        "Case-fold columns <b>before</b> joining or deduping — <code>'Ann'</code> and <code>'ann'</code> are different keys otherwise.",
        "<code>trim</code> only strips whitespace by default; <code>F.trim(col, trimStr)</code> (Spark 3.4+) trims custom characters."
      ],
      memory: "<b>lower(trim(col)) = the standard key-cleanup combo.</b>"
    },
    {
      id: "lpad",
      group: "Functions",
      name: "F.lpad / rpad",
      signature: "F.lpad(col, len, pad)",
      category: "Column function · string",
      summary: "Pad a string to a fixed width on the left (<code>lpad</code>) or right (<code>rpad</code>). <b>Truncates</b> if already longer.",
      returns: "Column",
      params: [
        { name: "col", type: "Column | str", desc: "Source string. Cast numbers to string first." },
        { name: "len", type: "int", desc: "Target total length. If the string is <b>longer</b> than <code>len</code>, it is <b>truncated</b> to <code>len</code>." },
        { name: "pad", type: "str", desc: "The padding string, repeated to fill the gap on the left (<code>lpad</code>) or right (<code>rpad</code>)." }
      ],
      example: "df.select(\n  F.lpad(F.col('id').cast('string'), 6, '0'))",
      output: "'42' -> '000042'",
      patterns: [
        { label: "Zero-pad an integer ID", code: "df.withColumn('id6',\n  F.lpad(F.col('id').cast('string'), 6, '0'))" }
      ],
      gotchas: [
        "It <b>truncates</b> inputs longer than <code>len</code> — an 8-char value with <code>len=6</code> loses two chars. Size <code>len</code> to your widest value.",
        "Pad a numeric column? Cast to string first, or you'll pad a number's default string form."
      ],
      memory: "<b>lpad = left-pad to width; longer inputs get truncated.</b>"
    },
    {
      id: "length",
      group: "Functions",
      name: "F.length",
      signature: "F.length(col)",
      category: "Column function · string",
      summary: "Number of characters in a string (or bytes for binary). <code>null</code> in → <code>null</code> out.",
      returns: "Column (int)",
      params: [
        { name: "col", type: "Column | str", desc: "String or binary column. Returns character count for strings; <code>null</code> input gives <code>null</code>. Trailing spaces <b>are</b> counted — <code>trim</code> first if that's unwanted." }
      ],
      example: "df.filter(F.length('name') > 0)",
      output: "int length Column",
      gotchas: [
        "Trailing spaces count toward the length — <code>length('ab  ')</code> is 4. <code>trim</code> first for a 'real content' check.",
        "Don't confuse with <code>F.size</code> (array/map element count) — different data types entirely."
      ],
      related: "<table><thead><tr><th>Function</th><th>Counts</th></tr></thead><tbody>" +
        "<tr><td><code>F.length</code></td><td>Characters in a string / bytes in binary.</td></tr>" +
        "<tr><td><code>F.size</code></td><td>Elements in an array / map.</td></tr></tbody></table>",
      memory: "<b>length = chars in a string; size = elements in an array.</b>"
    },
    {
      id: "coalesce-f",
      group: "Functions",
      name: "F.coalesce",
      signature: "F.coalesce(*cols)",
      category: "Column function · null-handling",
      summary: "Return the first <b>non-null</b> value across the given columns, evaluated left to right, per row.",
      returns: "Column",
      params: [
        { name: "*cols", type: "Column | str", desc: "Two or more columns/literals evaluated left to right; the first that is not <code>null</code> is returned. All arguments must share a common (or castable) type. A trailing <code>F.lit(default)</code> guarantees a non-null result." }
      ],
      example: "df.withColumn('name',\n  F.coalesce('nickname', 'legal_name', F.lit('N/A')))",
      output: "First non-null per row",
      works: "Row-wise; short-circuits at the first non-null argument, else falls through to the last." +
        "<table><thead><tr><th>nickname</th><th>legal_name</th><th>→ result</th></tr></thead><tbody>" +
        "<tr><td>null</td><td>'Ann Lee'</td><td>'Ann Lee'</td></tr>" +
        "<tr><td>'AJ'</td><td>'Ann Lee'</td><td>'AJ'</td></tr>" +
        "<tr><td>null</td><td>null</td><td>'N/A' <i>(lit fallback)</i></td></tr></tbody></table>",
      patterns: [
        { label: "Fallback chain for a display name", code: "df.withColumn('display',\n  F.coalesce('preferred_name', 'first_name', F.lit('Unknown')))" },
        { label: "Fill a metric with 0 before aggregating", code: "df.withColumn('revenue',\n  F.coalesce(F.col('revenue'), F.lit(0)))" },
        { label: "Pick the first populated source (CDC merge)", code: "df.withColumn('email',\n  F.coalesce('crm_email', 'signup_email', 'legacy_email'))" }
      ],
      gotchas: [
        "Every argument is a <b>Column</b> — wrap Python scalars in <code>F.lit(...)</code>: use <code>F.coalesce('a', F.lit(0))</code>, not <code>F.coalesce('a', 0)</code>.",
        "It tests <b>null only</b>. An empty string <code>''</code> or a <code>NaN</code> is <i>not</i> null and is returned as-is — use <code>F.nanvl</code> for NaN, or a <code>nullif</code>/<code>when</code> guard for <code>''</code>.",
        "Arguments must be a common type; mixing e.g. a string and an int column errors unless castable — <code>cast</code> first.",
        "Not the same as <code>df.coalesce(n)</code> (partition merge) — see below."
      ],
      related: "<table><thead><tr><th>Expression</th><th>What it does</th></tr></thead><tbody>" +
        "<tr><td><code>F.coalesce(*cols)</code></td><td><b>Column</b> op — first non-null value per row.</td></tr>" +
        "<tr><td><code>df.coalesce(n)</code></td><td><b>DataFrame</b> op — merge to <code>n</code> partitions (no shuffle). Unrelated.</td></tr>" +
        "<tr><td><code>F.nvl(a, b)</code> / <code>ifnull</code></td><td>Two-argument coalesce (Spark 3.5+ SQL funcs).</td></tr>" +
        "<tr><td><code>F.nanvl(a, b)</code></td><td>Replaces <b>NaN</b> (not null) in float/double columns.</td></tr></tbody></table>",
      interview: [
        { q: "Difference between <code>F.coalesce()</code> and <code>df.coalesce()</code>?", a: "<code>F.coalesce(*cols)</code> is a <b>column expression</b> returning the first non-null value per row. <code>df.coalesce(n)</code> is a <b>DataFrame transformation</b> that reduces the partition count by merging (narrow, no shuffle). Same name, unrelated operations — a classic trap." },
        { q: "Does it treat empty string or NaN as null?", a: "No — only SQL <code>NULL</code>. <code>''</code> and <code>NaN</code> are non-null and returned as-is; use <code>F.nanvl</code> for NaN or a guard for empty strings." },
        { q: "How do you guarantee a non-null result?", a: "End the argument list with a literal fallback, e.g. <code>F.coalesce(a, b, F.lit(0))</code>." }
      ],
      notes: "Prefer <code>coalesce</code> over chained <code>when(col.isNull(), ...)</code> — cleaner to read and a tidier plan.",
      memory: "<b>F.coalesce = first non-NULL value; df.coalesce = fewer partitions.</b>"
    },
    {
      id: "nvl",
      group: "Functions",
      name: "F.nvl / ifnull / nvl2 / nullif",
      signature: "F.nvl(col, default)  |  F.ifnull(col, default)",
      category: "Column function · null-handling",
      summary: "Two-argument null replacement — a readable subset of <code>coalesce</code>. Plus the <code>nvl2</code>/<code>nullif</code> siblings.",
      returns: "Column",
      params: [
        { name: "col", type: "Column | str", desc: "Value to test for null." },
        { name: "default", type: "Column | scalar", desc: "Returned when <code>col</code> is null. <code>nvl</code> and <code>ifnull</code> are synonyms." }
      ],
      example: "df.select(F.nvl('discount', F.lit(0)))",
      output: "0 where discount is null",
      works: "<table><thead><tr><th>Expression</th><th>Returns</th></tr></thead><tbody>" +
        "<tr><td><code>nvl(a, b)</code></td><td><code>a</code> if not null, else <code>b</code>.</td></tr>" +
        "<tr><td><code>nvl2(a, b, c)</code></td><td><code>b</code> if <code>a</code> not null, else <code>c</code>.</td></tr>" +
        "<tr><td><code>nullif(a, b)</code></td><td>null when <code>a == b</code>, else <code>a</code>.</td></tr></tbody></table>",
      patterns: [
        { label: "Default a nullable metric", code: "df.withColumn('discount',\n  F.nvl('discount', F.lit(0)))" },
        { label: "Turn a sentinel into null (nullif)", code: "df.withColumn('code',\n  F.expr(\"nullif(code, 'UNKNOWN')\"))" }
      ],
      gotchas: [
        "These are Spark <b>3.5+</b> Python functions; on older versions use <code>F.coalesce</code> or <code>F.expr('nvl(a, b)')</code>.",
        "<code>nvl</code> only checks null — not <code>''</code> or <code>NaN</code>.",
        "<code>nullif</code> is the clean way to convert a sentinel value (like <code>'UNKNOWN'</code>, <code>-1</code>) back to null."
      ],
      related: "<code>F.coalesce</code> generalizes <code>nvl</code> to N arguments and is available everywhere. Prefer <code>coalesce</code> for portability; <code>nvl</code>/<code>nullif</code> read a bit cleaner when porting SQL.",
      memory: "<b>nvl = 2-arg coalesce; nullif = value → null; nvl2 = present/absent picker.</b>"
    },
    {
      id: "nanvl",
      group: "Functions",
      name: "F.nanvl / isnan",
      signature: "F.nanvl(col1, col2)",
      category: "Column function · null / NaN-handling",
      summary: "Replace <b>NaN</b> (not null) in float/double columns with a fallback. NaN and null are different in Spark.",
      returns: "Column",
      params: [
        { name: "col1", type: "Column | str", desc: "A float/double column that may contain <code>NaN</code>." },
        { name: "col2", type: "Column | scalar", desc: "Returned when <code>col1</code> is <code>NaN</code>; otherwise <code>col1</code> passes through. Handles NaN only — use <code>coalesce</code> for null." }
      ],
      example: "df.withColumn('ratio',\n  F.nanvl('ratio', F.lit(0.0)))",
      output: "0.0 where ratio is NaN",
      gotchas: [
        "<b>NaN ≠ null</b> in Spark. <code>coalesce</code> won't catch NaN and <code>nanvl</code> won't catch null — you often need both.",
        "NaN only arises from float/double math (e.g. <code>0.0/0.0</code>); integer columns never hold NaN.",
        "Test with <code>F.isnan(col)</code>, not <code>col.isNull()</code>."
      ],
      patterns: [
        { label: "Clean both NaN and null in one pass", code: "df.withColumn('ratio',\n  F.coalesce(F.nanvl('ratio', F.lit(0.0)), F.lit(0.0)))" }
      ],
      related: "<table><thead><tr><th>Function</th><th>Catches</th></tr></thead><tbody>" +
        "<tr><td><code>F.nanvl</code> / <code>F.isnan</code></td><td>NaN (float/double).</td></tr>" +
        "<tr><td><code>F.coalesce</code> / <code>col.isNull()</code></td><td>SQL NULL.</td></tr></tbody></table>",
      interview: [
        { q: "In Spark, is NaN the same as null?", a: "No. NaN is a valid float value; null is absence. <code>coalesce</code>/<code>isNull</code> handle null, <code>nanvl</code>/<code>isnan</code> handle NaN. A robust float cleanup handles both." }
      ],
      memory: "<b>nanvl = fix NaN; coalesce = fix null; they're different things.</b>"
    },
    {
      id: "round",
      group: "Functions",
      name: "F.round / bround",
      signature: "F.round(col, scale=0)",
      category: "Column function · math",
      summary: "Round a numeric column to <code>scale</code> decimal places. <code>round</code> = HALF_UP, <code>bround</code> = HALF_EVEN (banker's).",
      returns: "Column",
      params: [
        { name: "col", type: "Column | str", desc: "Numeric column to round." },
        { name: "scale", type: "int", desc: "Number of decimal places (default 0). <b>Negative</b> scale rounds to tens/hundreds (<code>-2</code> → nearest 100)." }
      ],
      example: "df.select(F.round('price', 2),\n  F.round('big', -3))",
      output: "12.346 ; 1234 -> 1000",
      works: "<table><thead><tr><th>value</th><th>round(v,0)</th><th>bround(v,0)</th></tr></thead><tbody>" +
        "<tr><td>2.5</td><td>3</td><td>2</td></tr>" +
        "<tr><td>3.5</td><td>4</td><td>4</td></tr></tbody></table>",
      patterns: [
        { label: "Round money to cents", code: "df.withColumn('price',\n  F.round('price', 2))" },
        { label: "Bucket to nearest thousand", code: "df.withColumn('band',\n  F.round('salary', -3))" }
      ],
      gotchas: [
        "For <b>money</b>, cast to <code>decimal(p,s)</code> instead of relying on <code>round</code> over a double — binary floats drift (0.1 + 0.2 ≠ 0.3).",
        "<code>bround</code> (banker's rounding) reduces cumulative bias when summing many rounded values — used in finance."
      ],
      related: "<code>F.floor</code> / <code>F.ceil</code> for directional rounding; <code>cast('decimal(p,s)')</code> for exact monetary values.",
      interview: [
        { q: "Difference between <code>round</code> and <code>bround</code>?", a: "<code>round</code> rounds halves <b>up</b> (2.5→3); <code>bround</code> rounds halves to the <b>nearest even</b> (2.5→2, 3.5→4). Banker's rounding avoids systematic upward bias across large sums." }
      ],
      memory: "<b>round = half-up; bround = half-even (banker's). Money → decimal, not double.</b>"
    },
    {
      id: "floor",
      group: "Functions",
      name: "F.floor / ceil / abs",
      signature: "F.floor(col) | F.ceil(col) | F.abs(col)",
      category: "Column function · math",
      summary: "Elementary math: round down, round up, absolute value.",
      returns: "Column",
      params: [
        { name: "floor", type: "Column | str", desc: "Largest integer &lt;= value." },
        { name: "ceil", type: "Column | str", desc: "Smallest integer &gt;= value." },
        { name: "abs", type: "Column | str", desc: "Absolute value; preserves the input numeric type." }
      ],
      example: "df.select(F.floor('x'),\n  F.ceil('x'),\n  F.abs('delta'))",
      output: "Integer / same-type Columns",
      gotchas: [
        "<code>floor</code>/<code>ceil</code> return an integer type; <code>round(col, 0)</code> keeps the input's numeric type — pick per your downstream schema.",
        "For negatives, <code>floor(-2.1) = -3</code> and <code>ceil(-2.1) = -2</code> — they round toward −∞ / +∞, not toward zero."
      ],
      related: "<code>F.round</code>/<code>bround</code> for nearest-value rounding. Other math: <code>F.sqrt</code>, <code>F.pow</code>, <code>F.exp</code>, <code>F.log</code>, <code>F.pmod</code>.",
      memory: "<b>floor = down, ceil = up, round = nearest.</b>"
    },
    {
      id: "greatest",
      group: "Functions",
      name: "F.greatest / least",
      signature: "F.greatest(*cols)  |  F.least(*cols)",
      category: "Column function · row-wise comparison",
      summary: "Row-wise max / min <b>across columns</b> — not down a column (that's the <code>max</code>/<code>min</code> aggregate).",
      returns: "Column",
      params: [
        { name: "*cols", type: "Column | str", desc: "Two or more columns compared per row. <code>null</code> values are <b>skipped</b>; the result is null only if <b>all</b> inputs are null." }
      ],
      example: "df.withColumn('peak',\n  F.greatest('q1', 'q2', 'q3', 'q4'))",
      output: "Max of the four per row",
      works: "Compares <b>across columns within a row</b> (horizontal), unlike the aggregate which reduces down rows (vertical):" +
        "<table><thead><tr><th>q1</th><th>q2</th><th>q3</th><th>greatest</th></tr></thead><tbody>" +
        "<tr><td>10</td><td>null</td><td>40</td><td>40</td></tr></tbody></table>",
      patterns: [
        { label: "Latest of several date columns", code: "df.withColumn('last_seen',\n  F.greatest('web_ts', 'app_ts', 'email_ts'))" },
        { label: "Clamp a value to a floor", code: "df.withColumn('non_neg',\n  F.greatest('delta', F.lit(0)))" }
      ],
      gotchas: [
        "<b>Row-wise, not an aggregate.</b> <code>F.max(col)</code> reduces down a column to one value; <code>F.greatest(a,b,c)</code> compares columns within each row.",
        "Nulls are skipped (result is null only if every argument is null) — contrast with arithmetic where a null propagates."
      ],
      related: "<table><thead><tr><th>Function</th><th>Direction</th></tr></thead><tbody>" +
        "<tr><td><code>F.greatest</code> / <code>F.least</code></td><td>Across columns, per row (horizontal).</td></tr>" +
        "<tr><td><code>F.max</code> / <code>F.min</code> (agg)</td><td>Down rows, per group (vertical).</td></tr></tbody></table>",
      interview: [
        { q: "Row has columns q1..q4; how do you get the max of the four per row?", a: "<code>F.greatest('q1','q2','q3','q4')</code>. Using <code>F.max</code> would instead collapse a single column across all rows — wrong axis." }
      ],
      memory: "<b>greatest/least = max/min across columns (per row); max/min agg = down rows.</b>"
    },
    {
      id: "expr",
      group: "Functions",
      name: "F.expr",
      signature: "F.expr(sqlString)",
      category: "Column function · SQL escape hatch",
      summary: "Parse a Spark SQL expression string into a <code>Column</code> — the escape hatch for SQL not surfaced in the Python API.",
      returns: "Column",
      params: [
        { name: "sqlString", type: "str", desc: "Any Spark SQL expression, e.g. <code>'CASE WHEN a>0 THEN 1 ELSE 0 END'</code>, <code>'stack(2, ...)'</code>, or higher-order functions like <code>'transform(arr, x -> x*2)'</code> that have no clean Python wrapper." }
      ],
      example: "df.withColumn('flag',\n  F.expr('CASE WHEN amt > 100 THEN 1 ELSE 0 END'))",
      output: "Column",
      patterns: [
        { label: "Higher-order function on an array", code: "df.withColumn('doubled',\n  F.expr('transform(nums, x -> x * 2)'))" },
        { label: "Filter an array inline", code: "df.withColumn('big',\n  F.expr('filter(amounts, a -> a > 100)'))" },
        { label: "INTERVAL date math", code: "df.withColumn('due',\n  F.expr(\"order_date + INTERVAL 30 DAYS\"))" }
      ],
      gotchas: [
        "Column/table names inside the string are <b>not</b> escaped or validated at build time — a typo surfaces only at analysis. Keep expressions short.",
        "You lose Python-side static checks and IDE help; use native functions when one exists, reserve <code>expr</code> for what the API doesn't expose.",
        "The plan is identical to the equivalent native expression — no performance penalty, it's purely an authoring choice."
      ],
      related: "<code>df.selectExpr('...')</code> is <code>select</code> + <code>expr</code>. <code>F.expr</code> unlocks <code>stack</code>, <code>transform</code>, <code>filter</code>, <code>aggregate</code>, <code>INTERVAL</code> math, and other SQL-only constructs.",
      interview: [
        { q: "When would you use <code>F.expr</code> over native functions?", a: "When the operation isn't cleanly exposed in <code>pyspark.sql.functions</code> — higher-order array functions (<code>transform</code>/<code>filter</code>/<code>aggregate</code>), <code>stack</code>, or <code>INTERVAL</code> arithmetic. Same physical plan, so it's an authoring convenience, not a perf trade-off." }
      ],
      memory: "<b>expr = write SQL where the Python API falls short; same plan.</b>"
    },
    {
      id: "array",
      group: "Functions",
      name: "F.array",
      signature: "F.array(*cols)",
      category: "Column function · array builder",
      summary: "Build an <code>array</code> column from several columns/literals, in order.",
      returns: "Column (array)",
      params: [
        { name: "*cols", type: "Column | str", desc: "Columns/literals combined into one array per row, in order. They should share a common type (Spark up-casts to the widest). Nulls are <b>kept</b> as array elements." }
      ],
      example: "df.select(F.array('a', 'b', 'c').alias('vals'))",
      output: "[a, b, c] per row",
      patterns: [
        { label: "Bundle sibling columns then explode", code: "df.select('id',\n  F.explode(F.array('q1', 'q2', 'q3')).alias('q'))" },
        { label: "Distinct, sorted array from columns", code: "df.withColumn('vals',\n  F.array_sort(F.array_distinct(F.array('a', 'b', 'c'))))" }
      ],
      gotchas: [
        "All elements are coerced to a <b>single common type</b> — mixing string and int columns up-casts everything to string.",
        "Nulls are preserved as elements (unlike <code>concat_ws</code> which skips them)."
      ],
      related: "Companion array functions: <code>F.array_distinct</code>, <code>F.array_union</code>, <code>F.array_sort</code>/<code>sort_array</code>, <code>F.flatten</code>, <code>F.array_contains</code>, <code>F.size</code>.",
      memory: "<b>array = pack columns into one array (common type, nulls kept).</b>"
    },
    {
      id: "explode",
      group: "Functions",
      name: "F.explode / explode_outer",
      signature: "F.explode(col)  |  F.explode_outer(col)",
      category: "Generator function · array/map → rows",
      summary: "Turn each element of an array (or key/value of a map) into its own <b>row</b>. The workhorse for flattening nested data.",
      returns: "Column (generator)",
      params: [
        { name: "col", type: "Column | str", desc: "An array or map column. <code>explode</code> <b>drops</b> rows whose array is null or empty; <code>explode_outer</code> <b>keeps</b> them, emitting one row with <code>null</code>. For a map it yields two columns <code>key</code>, <code>value</code>." }
      ],
      example: "df.select('id', F.explode('items').alias('item'))",
      output: "One row per (id, item)",
      works: "One input row fans out to N output rows (N = array length); other columns are repeated:" +
        "<table><thead><tr><th>id</th><th>items</th><th>→ id</th><th>→ item</th></tr></thead><tbody>" +
        "<tr><td>1</td><td>[a, b]</td><td>1</td><td>a</td></tr>" +
        "<tr><td></td><td></td><td>1</td><td>b</td></tr>" +
        "<tr><td>2</td><td>[] / null</td><td colspan='2'>explode: dropped · explode_outer: (2, null)</td></tr></tbody></table>",
      patterns: [
        { label: "Flatten a CSV column to rows", code: "df.select('order_id',\n  F.explode(F.split('sku_csv', ',')).alias('sku'))" },
        { label: "Keep empty/null arrays (LEFT-join semantics)", code: "df.select('id',\n  F.explode_outer('items').alias('item'))" },
        { label: "Explode a map to key/value rows", code: "df.select('id',\n  F.explode('props').alias('k', 'v'))" }
      ],
      gotchas: [
        "Plain <code>explode</code> <b>drops</b> rows with null or empty arrays — use <code>explode_outer</code> to preserve them (the LEFT-join analogue).",
        "It's a <b>generator</b>: at most one per <code>select</code>, and it can't sit in the same projection as most other generators. Explode first, derive after.",
        "It <b>multiplies row count</b> — a 1M-row df with 100-element arrays becomes 100M rows. Filter/aggregate deliberately."
      ],
      related: "<table><thead><tr><th>Function</th><th>Adds</th></tr></thead><tbody>" +
        "<tr><td><code>explode</code></td><td>Element only; drops empty/null.</td></tr>" +
        "<tr><td><code>explode_outer</code></td><td>Element only; keeps empty/null as a null row.</td></tr>" +
        "<tr><td><code>posexplode</code> / <code>posexplode_outer</code></td><td>Element + its <code>pos</code> index.</td></tr>" +
        "<tr><td><code>inline</code></td><td>Explode an array of structs into columns.</td></tr></tbody></table>",
      perf: "Explosion is narrow (no shuffle by itself) but multiplies data volume — the shuffle/memory cost lands on the aggregation or join that follows. Project only needed columns before exploding.",
      interview: [
        { q: "<code>explode</code> vs <code>explode_outer</code>?", a: "<code>explode</code> emits nothing for a null or empty array (the row disappears). <code>explode_outer</code> emits a single row with null — like a LEFT join, preserving the parent row." },
        { q: "Why can't you put two <code>explode</code> calls in one <code>select</code>?", a: "They're generator functions; Spark allows only one generator per projection. Chain them: explode the first, then explode the second in a following select." }
      ],
      notes: "The canonical way to flatten arrays/maps of nested JSON, tags, or line items into a tidy row-per-element shape.",
      memory: "<b>explode = 1 row → N rows; _outer keeps the empties (LEFT-join style).</b>"
    },
    {
      id: "posexplode",
      group: "Functions",
      name: "F.posexplode / posexplode_outer",
      signature: "F.posexplode(col)",
      category: "Generator function · array → rows + index",
      summary: "Explode an array to rows <b>plus</b> each element's 0-based index — use when position matters.",
      returns: "Column (generator, two outputs)",
      params: [
        { name: "col", type: "Column | str", desc: "Array/map column. Emits <b>two</b> columns: <code>pos</code> (0-based index) and <code>col</code> (the element). <code>posexplode_outer</code> keeps null/empty arrays as a single null row." }
      ],
      example: "df.select('id',\n  F.posexplode('items').alias('idx', 'item'))",
      output: "id, idx(0..n-1), item",
      patterns: [
        { label: "Preserve line-item ordering", code: "df.select('order_id',\n  F.posexplode('line_items').alias('line_no', 'item'))" }
      ],
      gotchas: [
        "You must name <b>both</b> outputs: <code>.alias('idx', 'item')</code> — a single alias won't capture <code>pos</code>.",
        "Index is <b>0-based</b>; add 1 if you want human line numbers.",
        "Same generator rules as <code>explode</code> (one per select, multiplies rows)."
      ],
      related: "Use plain <code>explode</code> when you don't need the index; <code>posexplode_outer</code> to keep null/empty arrays.",
      memory: "<b>posexplode = explode + position; name both outputs.</b>"
    },
    {
      id: "array_contains",
      group: "Functions",
      name: "F.array_contains",
      signature: "F.array_contains(col, value)",
      category: "Column function · array predicate",
      summary: "True if the array column contains the given value — array membership test without exploding.",
      returns: "Column (bool)",
      params: [
        { name: "col", type: "Column | str", desc: "Array column to search." },
        { name: "value", type: "scalar", desc: "The value to look for — a <b>literal</b>, not a Column, in most versions. Returns <code>null</code> if the array itself is null; <code>false</code> if the array is present but lacks the value." }
      ],
      example: "df.filter(F.array_contains('tags', 'vip'))",
      output: "Boolean Column",
      patterns: [
        { label: "Filter rows whose array holds a value", code: "df.filter(F.array_contains('tags', 'vip'))" },
        { label: "Membership against another column (expr)", code: "df.filter(F.expr('array_contains(tags, required_tag)'))" }
      ],
      gotchas: [
        "The value is a <b>literal</b> in the Python signature — to test membership of <b>another column</b>, use <code>F.expr('array_contains(arr, other_col)')</code> or <code>F.exists</code>.",
        "Null array → null result (not false); guard in filters if you need false."
      ],
      related: "<code>F.arrays_overlap(a, b)</code> for any-common-element; <code>F.exists(arr, x -> ...)</code> for a predicate; <code>F.size</code> + explode when you need the matching elements.",
      memory: "<b>array_contains = does this array hold X? (X is a literal).</b>"
    },
    {
      id: "size",
      group: "Functions",
      name: "F.size / array_size",
      signature: "F.size(col)",
      category: "Column function · array/map length",
      summary: "Number of elements in an array or map. <b>Watch the −1-on-null trap.</b>",
      returns: "Column (int)",
      params: [
        { name: "col", type: "Column | str", desc: "Array or map column. Returns the element count. For a <b>null</b> input <code>size</code> returns <code>-1</code> (gotcha!), whereas <code>F.array_size</code> (Spark 3.4+) returns null. Empty gives 0." }
      ],
      example: "df.filter(F.size('items') > 0)",
      output: "int count Column",
      works: "<table><thead><tr><th>items</th><th>size</th><th>array_size (3.4+)</th></tr></thead><tbody>" +
        "<tr><td>[a, b, c]</td><td>3</td><td>3</td></tr>" +
        "<tr><td>[]</td><td>0</td><td>0</td></tr>" +
        "<tr><td>null</td><td><b>-1</b></td><td>null</td></tr></tbody></table>",
      patterns: [
        { label: "Null-safe element count", code: "df.withColumn('n',\n  F.when(F.col('items').isNull(), 0)\n   .otherwise(F.size('items')))" },
        { label: "Keep only non-empty arrays", code: "df.filter(F.size('items') > 0)" }
      ],
      gotchas: [
        "<b><code>size(null) = -1</code>, not 0 or null.</b> A filter like <code>size(col) > 0</code> silently excludes nulls; <code>size(col) >= 0</code> would <i>include</i> them. Guard explicitly.",
        "Use <code>F.array_size</code> (Spark 3.4+) for null-returns-null semantics.",
        "Don't confuse with <code>F.length</code> (string characters)."
      ],
      related: "<code>F.length</code> counts string chars; <code>F.array_size</code> is the null-safe variant; <code>F.cardinality</code> is a SQL synonym for <code>size</code>.",
      interview: [
        { q: "What does <code>F.size</code> return for a null array, and why does it matter?", a: "<code>-1</code>. It quietly breaks range filters (<code>size > 0</code> drops nulls, <code>size >= 0</code> keeps them). Wrap with a null check or use <code>array_size</code> (3.4+), which returns null." }
      ],
      memory: "<b>size(null) = -1 (the trap); array_size(null) = null.</b>"
    },
    {
      id: "collect_list-f",
      group: "Functions",
      name: "F.collect_list / collect_set",
      signature: "F.collect_list(col)  |  F.collect_set(col)",
      category: "Aggregate function · rows → array",
      summary: "Gather a group's values into an array. <code>collect_list</code> keeps dups; <code>collect_set</code> deduplicates. Both used in <code>agg</code>/window.",
      returns: "Column (array)",
      params: [
        { name: "col", type: "Column | str", desc: "Column to gather. <code>collect_list</code> keeps duplicates; <code>collect_set</code> deduplicates. Both <b>skip nulls</b>. Order is <b>not</b> guaranteed and memory scales with group size." }
      ],
      example: "df.groupBy('user').agg(\n  F.collect_set('page').alias('pages'))",
      output: "One array per user",
      patterns: [
        { label: "Distinct pages per user", code: "df.groupBy('user').agg(\n  F.collect_set('page').alias('pages'))" },
        { label: "Ordered event trail (sort by attaching key)", code: "trail = F.array_sort(\n  F.collect_list(F.struct('ts', 'event')))\ndf.groupBy('user').agg(trail.alias('events'))" }
      ],
      gotchas: [
        "<b>Order is not guaranteed.</b> To get a deterministic order, collect <code>struct(sort_key, value)</code> then <code>array_sort</code>, rather than trusting input order.",
        "Both <b>skip nulls</b> — a group of all-nulls yields an empty array.",
        "Materializes the whole group in memory on one executor — a skewed 'hot' key can OOM. Consider a top-N or approx approach for huge groups."
      ],
      related: "<table><thead><tr><th>Function</th><th>Duplicates</th></tr></thead><tbody>" +
        "<tr><td><code>collect_list</code></td><td>Kept.</td></tr>" +
        "<tr><td><code>collect_set</code></td><td>Removed (distinct).</td></tr></tbody></table>",
      perf: "A wide aggregate — shuffles by the group key and buffers each group. Skewed keys are the classic failure mode; salt or pre-aggregate if one key dominates.",
      interview: [
        { q: "Is <code>collect_list</code> order-preserving?", a: "No. Element order is non-deterministic across runs. If order matters, collect <code>struct(ts, value)</code> and <code>array_sort</code>, or apply a windowed ordering before collecting." },
        { q: "Risk of <code>collect_set</code> on a huge group?", a: "It buffers all distinct values for a key in executor memory — a hot/skewed key can OOM. Bound the group, pre-aggregate, or use an approximate structure." }
      ],
      memory: "<b>collect_list = keep dups; collect_set = distinct; neither guarantees order.</b>"
    },
    {
      id: "struct",
      group: "Functions",
      name: "F.struct",
      signature: "F.struct(*cols)",
      category: "Column function · struct builder",
      summary: "Bundle several columns into one nested <code>struct</code> — the key to the <code>max(struct(...))</code> 'latest value' idiom.",
      returns: "Column (struct)",
      params: [
        { name: "*cols", type: "str | Column", desc: "Columns to nest; each becomes a named field (use <code>.alias</code> to set field names). Lets you carry a composite value through <code>collect_list</code>, or keep a sort key attached to a value." }
      ],
      example: "df.groupBy('user').agg(\n  F.max(F.struct('ts', 'status')).alias('latest'))",
      output: "struct<ts, status>",
      works: "A struct compares <b>field by field, left to right</b> — so <code>max(struct(ts, status))</code> picks the row with the greatest <code>ts</code> and returns its <code>status</code>:" +
        "<table><thead><tr><th>rows (ts, status)</th><th>max(struct)</th><th>.status</th></tr></thead><tbody>" +
        "<tr><td>(9:00,'A'), (9:05,'B')</td><td>{9:05, 'B'}</td><td>'B'</td></tr></tbody></table>",
      patterns: [
        { label: "Value at the latest timestamp (no window)", code: "latest = F.max(F.struct('ts', 'status'))\ndf.groupBy('user').agg(\n  latest.status.alias('last_status'))" },
        { label: "Carry a payload through collect_list", code: "df.groupBy('user').agg(\n  F.collect_list(F.struct('ts', 'amount')).alias('txns'))" }
      ],
      gotchas: [
        "Put the <b>sort key first</b> in the struct — comparison is left-to-right by field. <code>struct(ts, status)</code> orders by <code>ts</code>, not <code>status</code>.",
        "Access a field with <code>col.field</code> or <code>col['field']</code> after aggregating."
      ],
      related: "<code>max(struct(ts, val)).val</code> is a shuffle-lighter alternative to a <code>row_number()</code> window for 'latest per group'. Pairs with <code>collect_list</code> to keep payloads together.",
      interview: [
        { q: "How do you get the status at each user's latest event without a window?", a: "<code>F.max(F.struct('ts','status'))</code> per group, then read <code>.status</code>. The struct compares by <code>ts</code> first, so max returns the latest event's fields — often cheaper than a <code>row_number()=1</code> window." }
      ],
      memory: "<b>struct sorts by first field → max(struct(ts, val)).val = latest value per group.</b>"
    },
    {
      id: "map_keys",
      group: "Functions",
      name: "F.map_keys / map_values / create_map",
      signature: "F.map_keys(col) | F.map_values(col) | F.create_map(*cols)",
      category: "Column function · map type",
      summary: "Build and inspect map-typed columns — keys array, values array, and map construction.",
      returns: "Column",
      params: [
        { name: "map_keys", type: "Column", desc: "Returns an array of the map's keys." },
        { name: "map_values", type: "Column", desc: "Returns an array of the map's values." },
        { name: "create_map (*cols)", type: "Column", desc: "Builds a map from alternating key, value columns: <code>create_map(k1, v1, k2, v2, ...)</code> — the argument count must be <b>even</b>." }
      ],
      example: "df.select(F.map_keys('props'),\n  F.map_values('props'))",
      output: "array of keys ; array of values",
      patterns: [
        { label: "Explode a map to key/value rows", code: "df.select('id',\n  F.explode('props').alias('k', 'v'))" },
        { label: "Look up one key", code: "df.withColumn('color',\n  F.col('props')['color'])" },
        { label: "Build a map from columns", code: "df.withColumn('m',\n  F.create_map(F.lit('k'), F.col('v')))" }
      ],
      gotchas: [
        "<code>create_map</code> needs an <b>even</b> number of arguments (key, value, key, value…) — an odd count errors.",
        "Access a value with <code>col['key']</code>; a missing key returns null, not an error.",
        "Map key ordering isn't guaranteed — use <code>map_keys</code>/<code>map_values</code> together, or explode, rather than assuming order."
      ],
      related: "<code>F.explode('map_col')</code> fans a map to <code>key</code>,<code>value</code> rows. <code>F.map_from_arrays(keys, vals)</code> builds a map from two array columns; <code>F.map_entries</code> returns an array of key/value structs.",
      memory: "<b>create_map = build (even args); map_keys/map_values = inspect; explode = to rows.</b>"
    },

    // ============================================================ Aggregation
    {
      id: "groupBy",
      group: "Aggregation",
      name: "DataFrame.groupBy",
      signature: "df.groupBy(*cols)",
      summary: "Group rows by keys, returning a <code>GroupedData</code> to aggregate. A wide transformation (shuffle).",
      returns: "GroupedData",
      params: [
        { name: "*cols", type: "str | Column", desc: "Grouping keys. With no args, aggregates the whole DataFrame as one group. Rows with equal key values (nulls form their own group) are combined; follow with <code>.agg(...)</code> or a shortcut like <code>.count()</code>." }
      ],
      example: "df.groupBy('dept').agg(\n  F.sum('salary').alias('total'))",
      output: "One row per dept",
      notes: "<code>groupBy(...).pivot(...)</code> reshapes wide. Partial aggregation runs map-side before the shuffle for algebraic aggregates."
    },
    {
      id: "agg",
      group: "Aggregation",
      name: "GroupedData.agg / DataFrame.agg",
      signature: "gd.agg(*exprs)  |  df.agg(*exprs)",
      summary: "Apply one or more aggregate expressions to each group (or the whole frame).",
      returns: "DataFrame",
      params: [
        { name: "*exprs", type: "Column | dict", desc: "Aggregate Columns (e.g. <code>F.sum('x').alias('sx')</code>), or a single <code>{'col':'agg'}</code> dict like <code>{'salary':'avg','age':'max'}</code>. Multiple aggregates in one <code>agg</code> share a single shuffle — cheaper than separate groupBys." }
      ],
      example: "df.groupBy('dept').agg(\n  F.sum('salary').alias('total'),\n  F.avg('age').alias('avg_age'))",
      output: "dept, total, avg_age",
      notes: "<code>df.agg(...)</code> without groupBy aggregates all rows to a single-row DataFrame."
    },
    {
      id: "count-agg",
      group: "Aggregation",
      name: "F.count / GroupedData.count",
      signature: "F.count(col)  |  df.groupBy(...).count()",
      summary: "Count rows (or non-null values of a column) per group.",
      returns: "Column | DataFrame",
      params: [
        { name: "col", type: "Column | str", desc: "<code>F.count('*')</code> or <code>F.count(F.lit(1))</code> counts <b>all</b> rows; <code>F.count('x')</code> counts only rows where <code>x</code> is <b>not null</b>. <code>GroupedData.count()</code> is the shortcut for count of all rows named <code>count</code>." }
      ],
      example: "df.groupBy('dept').agg(F.count('*').alias('n'),\n  F.count('email').alias('with_email'))",
      output: "dept, n, with_email",
      notes: "The null-skipping of <code>count(col)</code> is a common way to count non-null occurrences."
    },
    {
      id: "countDistinct",
      group: "Aggregation",
      name: "F.countDistinct / approx_count_distinct",
      signature: "F.countDistinct(*cols)  |  F.approx_count_distinct(col, rsd=0.05)",
      summary: "Count unique values — exact (expensive) or approximate (fast).",
      returns: "Column",
      params: [
        { name: "*cols (countDistinct)", type: "Column", desc: "One or more columns; multiple columns count distinct <b>tuples</b>. Exact but requires a heavy shuffle/sort." },
        { name: "col, rsd (approx)", type: "Column, float", desc: "<code>approx_count_distinct</code> uses HyperLogLog. <code>rsd</code> is the target relative standard error (default 0.05 = 5%); smaller = more accurate but more memory. Vastly cheaper at scale." }
      ],
      example: "df.agg(\n  F.approx_count_distinct('user_id', 0.01).alias('users'))",
      output: "~unique count",
      notes: "For dashboards on billions of rows, <code>approx_count_distinct</code> is the standard choice."
    },
    {
      id: "sum",
      group: "Aggregation",
      name: "F.sum / sum_distinct",
      signature: "F.sum(col)  |  F.sum_distinct(col)",
      summary: "Sum of a numeric column per group.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Numeric column. <code>null</code> values are <b>ignored</b>; a group of all-null (or empty) yields <code>null</code>, not 0. <code>sum_distinct</code> sums only distinct values." }
      ],
      example: "df.groupBy('dept').agg(F.sum('salary'))",
      output: "dept, sum(salary)",
      notes: "Wrap in <code>F.coalesce(F.sum('x'), F.lit(0))</code> if you need 0 for empty groups."
    },
    {
      id: "avg",
      group: "Aggregation",
      name: "F.avg / mean",
      signature: "F.avg(col)   # mean is an alias",
      summary: "Arithmetic mean of a numeric column per group.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Numeric column. <code>null</code>s are excluded from both numerator and denominator (average of non-null values). Result is a double." }
      ],
      example: "df.groupBy('dept').agg(\n  F.avg('salary').alias('avg_sal'))",
      output: "dept, avg_sal",
      notes: "<code>F.mean</code> is identical. Null-skipping means the average ignores missing values, not treats them as 0."
    },
    {
      id: "min",
      group: "Aggregation",
      name: "F.min / max / min_by / max_by",
      signature: "F.min(col) | F.max(col) | F.max_by(val, ord)",
      summary: "Extremes per group, optionally the value at the extreme of another column.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Column whose min/max is taken; works for numbers, strings (lexicographic), dates. Nulls are ignored." },
        { name: "val, ord (min_by/max_by)", type: "Column, Column", desc: "<code>max_by(val, ord)</code> returns <code>val</code> from the row where <code>ord</code> is maximal (Spark 3.0+) — a clean 'latest value' without a window." }
      ],
      example: "df.groupBy('user').agg(\n  F.max_by('status', 'ts').alias('last_status'))",
      output: "user, last_status",
      notes: "<code>max_by</code>/<code>min_by</code> replace the older <code>max(struct(ord,val))</code> trick."
    },
    {
      id: "first-agg",
      group: "Aggregation",
      name: "F.first / last",
      signature: "F.first(col, ignorenulls=False)",
      summary: "First / last value in each group (order-dependent).",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Column to pick." },
        { name: "ignorenulls", type: "bool", desc: "When <code>True</code>, skip nulls and return the first/last non-null. The 'first'/'last' notion is only meaningful after an explicit <code>orderBy</code> or inside an ordered window — otherwise it is nondeterministic." }
      ],
      example: "df.orderBy('ts').groupBy('user')\\\n  .agg(F.first('page', ignorenulls=True))",
      output: "First page per user",
      notes: "Prefer a window + <code>row_number</code> or <code>max_by</code> for deterministic first/last across shuffles."
    },
    {
      id: "stddev",
      group: "Aggregation",
      name: "F.stddev / variance / skewness",
      signature: "F.stddev(col)  |  F.stddev_pop(col)  |  F.variance(col)",
      summary: "Spread statistics per group.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Numeric column. <code>stddev</code>/<code>stddev_samp</code> use the <b>sample</b> formula (n-1 denominator); <code>stddev_pop</code> uses the <b>population</b> (n). <code>variance</code>=<code>var_samp</code>; also <code>var_pop</code>, <code>skewness</code>, <code>kurtosis</code>, <code>corr</code>, <code>covar_samp</code>." }
      ],
      example: "df.groupBy('sensor').agg(F.stddev('reading'))",
      output: "sensor, stddev(reading)",
      notes: "Know sample vs population: <code>stddev</code> defaults to sample."
    },
    {
      id: "collect_list-agg",
      group: "Aggregation",
      name: "F.collect_list / collect_set (agg)",
      signature: "F.collect_list(col)  |  F.collect_set(col)",
      summary: "Gather a group's values into an array (list keeps dups, set dedups).",
      returns: "Column (array)",
      params: [
        { name: "col", type: "Column", desc: "Column to accumulate per group. Nulls are skipped. Order within the array is <b>not</b> guaranteed. Beware memory: a hot key with millions of rows builds one giant array on a single task." }
      ],
      example: "df.groupBy('order_id').agg(\n  F.collect_list('sku').alias('skus'))",
      output: "order_id, [sku,...]",
      notes: "To preserve order, collect a struct of <code>(sort_key, value)</code> then <code>array_sort</code> and project the value."
    },
    {
      id: "percentile_approx",
      group: "Aggregation",
      name: "F.percentile_approx / median",
      signature: "F.percentile_approx(col, percentage, accuracy=10000)",
      summary: "Approximate quantile(s) of a column per group.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Numeric column." },
        { name: "percentage", type: "float | list[float]", desc: "A quantile in <code>[0,1]</code> (e.g. <code>0.5</code> = median) or a list (e.g. <code>[0.25,0.5,0.75]</code>) which returns an array." },
        { name: "accuracy", type: "int", desc: "Higher = more accurate but more memory (default 10000). Bounds the relative error to ~<code>1/accuracy</code>." }
      ],
      example: "df.groupBy('dept').agg(\n  F.percentile_approx('salary', [0.5, 0.9], 10000))",
      output: "[median, p90] per dept",
      notes: "<code>F.median</code> (Spark 3.4+) is exact-ish shorthand for the 0.5 quantile."
    },
    {
      id: "pivot",
      group: "Aggregation",
      name: "GroupedData.pivot",
      signature: "df.groupBy(...).pivot(col, values=None).agg(...)",
      summary: "Reshape long-to-wide: promote distinct values of a column into their own columns.",
      returns: "GroupedData",
      params: [
        { name: "col", type: "str", desc: "The column whose distinct values become new output columns. Only <b>one</b> pivot column is allowed." },
        { name: "values", type: "list | None", desc: "The explicit list of values to pivot into columns. Supplying it <b>skips a hidden distinct scan</b> and fixes column order/count; omitting it makes Spark run an extra job to discover them. Missing combinations become <code>null</code> cells." }
      ],
      example: "df.groupBy('product').pivot('month', ['Jan','Feb'])\\\n  .agg(F.sum('rev'))",
      output: "product, Jan, Feb",
      notes: "Always pass <code>values</code> in production. Reverse with <code>stack(...)</code> via <code>selectExpr</code> to unpivot."
    },

    // ============================================================ Window
    {
      id: "window-partitionBy",
      group: "Window",
      name: "Window.partitionBy",
      signature: "Window.partitionBy(*cols)",
      summary: "Define the partition (group) over which a window function computes — without collapsing rows.",
      returns: "WindowSpec",
      params: [
        { name: "*cols", type: "str | Column", desc: "Partition keys; the window function restarts independently per partition. With <b>no</b> <code>partitionBy</code>, the whole DataFrame is one partition (all data to one task — dangerous at scale)." }
      ],
      example: "w = Window.partitionBy('dept').orderBy(F.desc('salary'))\ndf.withColumn('rk', F.rank().over(w))",
      output: "Rank restarting per dept",
      notes: "Unlike <code>groupBy</code>, window keeps every input row and adds a computed column."
    },
    {
      id: "window-orderBy",
      group: "Window",
      name: "Window.orderBy",
      signature: "Window.orderBy(*cols)",
      summary: "Order rows within each window partition — required for ranking / lag / lead / running frames.",
      returns: "WindowSpec",
      params: [
        { name: "*cols", type: "str | Column", desc: "Sort keys within the partition; supports <code>.desc()</code>/<code>.asc_nulls_last()</code>. Ties share ranks (see the ranking functions). An ordered window with no explicit frame defaults to <code>rangeBetween(unboundedPreceding, currentRow)</code> for aggregates." }
      ],
      example: "w = Window.partitionBy('user').orderBy('ts')\ndf.withColumn('prev', F.lag('amt').over(w))",
      output: "Previous amt per user in ts order",
      notes: "Ranking functions (<code>row_number</code>, <code>rank</code>) require an <code>orderBy</code>."
    },
    {
      id: "rowsBetween",
      group: "Window",
      name: "WindowSpec.rowsBetween",
      signature: "w.rowsBetween(start, end)",
      summary: "Define a <b>physical</b> frame by row offsets relative to the current row.",
      returns: "WindowSpec",
      params: [
        { name: "start", type: "int", desc: "Frame start offset in rows: negative = preceding, <code>0</code> = current, or <code>Window.unboundedPreceding</code> for the partition start." },
        { name: "end", type: "int", desc: "Frame end offset: positive = following, <code>0</code> = current row, or <code>Window.unboundedFollowing</code> for the partition end. <code>rowsBetween(unboundedPreceding, currentRow)</code> = running total; <code>rowsBetween(-2, 0)</code> = trailing 3-row window." }
      ],
      example: "w = Window.partitionBy('id').orderBy('ts')\\\n  .rowsBetween(Window.unboundedPreceding, Window.currentRow)\ndf.withColumn('run_sum', F.sum('amt').over(w))",
      output: "Cumulative sum per id",
      notes: "<code>rowsBetween</code> counts rows; <code>rangeBetween</code> counts by the order-key <b>value</b>."
    },
    {
      id: "rangeBetween",
      group: "Window",
      name: "WindowSpec.rangeBetween",
      signature: "w.rangeBetween(start, end)",
      summary: "Define a <b>logical/value</b> frame: bounds are offsets on the ordering column's value.",
      returns: "WindowSpec",
      params: [
        { name: "start", type: "int | long", desc: "Lower bound as a value offset from the current row's order-key (e.g. <code>-7</code> over an epoch-day column = last 7 days). Rows with an order value within <code>[current+start, current+end]</code> are included — so all ties are pulled in together." },
        { name: "end", type: "int | long", desc: "Upper value offset, or <code>Window.currentRow</code> / <code>unboundedFollowing</code>. Requires a <b>single numeric</b> orderBy key; for dates, order by an epoch/unix number." }
      ],
      example: "days = lambda i: i*86400\nw = Window.partitionBy('id').orderBy('ts_unix')\\\n  .rangeBetween(-days(7), 0)\ndf.withColumn('rev_7d', F.sum('rev').over(w))",
      output: "Rolling 7-day sum",
      notes: "Use for time windows where consecutive rows are unevenly spaced; <code>rowsBetween</code> would miscount them."
    },
    {
      id: "window-sentinels",
      group: "Window",
      name: "Window sentinels",
      signature: "Window.unboundedPreceding / currentRow / unboundedFollowing",
      summary: "Special frame-boundary constants used with <code>rowsBetween</code>/<code>rangeBetween</code>.",
      returns: "int constants",
      params: [
        { name: "unboundedPreceding", type: "const", desc: "The first row (or lowest value) of the partition — a very small sentinel value." },
        { name: "currentRow", type: "const", desc: "The current row (offset 0)." },
        { name: "unboundedFollowing", type: "const", desc: "The last row (or highest value) of the partition. <code>(unboundedPreceding, unboundedFollowing)</code> = the whole partition, giving a group total on every row." }
      ],
      example: "w = Window.partitionBy('dept')\\\n  .rowsBetween(Window.unboundedPreceding, Window.unboundedFollowing)\ndf.withColumn('dept_total', F.sum('sal').over(w))",
      output: "Dept total repeated on each row",
      notes: "A whole-partition frame lets you compute share-of-total: <code>col / sum(col).over(w)</code>."
    },
    {
      id: "row_number",
      group: "Window",
      name: "F.row_number",
      signature: "F.row_number().over(w)",
      summary: "Assign a unique sequential integer (1,2,3,...) within each ordered partition.",
      returns: "Column (int)",
      params: [
        { name: "over(w)", type: "WindowSpec", desc: "Requires an <code>orderBy</code>. Always distinct even on ties (order of tied rows is arbitrary). The canonical tool for deterministic dedup / 'latest per key': filter <code>row_number == 1</code>." }
      ],
      example: "w = Window.partitionBy('user').orderBy(F.desc('ts'))\ndf.withColumn('rn', F.row_number().over(w)).filter('rn = 1')",
      output: "Latest row per user",
      notes: "Add a tie-break key to <code>orderBy</code> to make row 1 deterministic."
    },
    {
      id: "rank",
      group: "Window",
      name: "F.rank / dense_rank",
      signature: "F.rank().over(w)  |  F.dense_rank().over(w)",
      summary: "Rank rows within a partition; ties share a rank.",
      returns: "Column (int)",
      params: [
        { name: "over(w)", type: "WindowSpec", desc: "Ordered window. <code>rank</code> leaves <b>gaps</b> after ties (1,1,3); <code>dense_rank</code> leaves <b>no gaps</b> (1,1,2). Use <code>rank</code> for competition ranking, <code>dense_rank</code> for compact tiers / top-N-distinct-values." }
      ],
      example: "w = Window.partitionBy('dept').orderBy(F.desc('sal'))\ndf.withColumn('r', F.dense_rank().over(w)).filter('r <= 3')",
      output: "Top-3 distinct salaries per dept",
      notes: "For top-N <b>rows</b> (no ties allowed) use <code>row_number</code>; for top-N distinct values use <code>dense_rank</code>."
    },
    {
      id: "ntile",
      group: "Window",
      name: "F.ntile",
      signature: "F.ntile(n).over(w)",
      summary: "Bucket ordered rows into <code>n</code> roughly-equal groups (1..n).",
      returns: "Column (int)",
      params: [
        { name: "n", type: "int", desc: "Number of buckets. Rows are split as evenly as possible; when the count isn't divisible, earlier buckets get the extra row. <code>ntile(4)</code> = quartiles, <code>ntile(100)</code> = percentiles." }
      ],
      example: "w = Window.orderBy('score')\ndf.withColumn('quartile', F.ntile(4).over(w))",
      output: "Quartile 1-4 per row",
      notes: "Requires an ordered window; needs the whole partition, so watch skew with no <code>partitionBy</code>."
    },
    {
      id: "lag",
      group: "Window",
      name: "F.lag / lead",
      signature: "F.lag(col, offset=1, default=None).over(w)",
      summary: "Access a value from a row <code>offset</code> positions before (<code>lag</code>) or after (<code>lead</code>) the current row.",
      returns: "Column",
      params: [
        { name: "col", type: "Column", desc: "Column to fetch from the neighboring row." },
        { name: "offset", type: "int", desc: "How many rows back (<code>lag</code>) or forward (<code>lead</code>); default 1." },
        { name: "default", type: "Any", desc: "Value when the offset falls outside the partition (e.g. the first row's <code>lag</code>). Default <code>None</code> (null)." }
      ],
      example: "w = Window.partitionBy('user').orderBy('ts')\ndf.withColumn('delta', F.col('amt') - F.lag('amt', 1, 0).over(w))",
      output: "Change from previous row per user",
      notes: "Classic for period-over-period deltas, gap detection and sessionization."
    },
    {
      id: "cume_dist",
      group: "Window",
      name: "F.cume_dist / percent_rank",
      signature: "F.cume_dist().over(w)  |  F.percent_rank().over(w)",
      summary: "Relative position of a row within its ordered partition, as a fraction.",
      returns: "Column (double)",
      params: [
        { name: "over(w)", type: "WindowSpec", desc: "Ordered window. <code>cume_dist</code> = (# rows with value &lt;= current) / total, in <code>(0,1]</code>. <code>percent_rank</code> = (rank-1)/(n-1), in <code>[0,1]</code>. Both need <code>orderBy</code>." }
      ],
      example: "w = Window.orderBy('score')\ndf.withColumn('pct', F.percent_rank().over(w))",
      output: "Fractional standing 0..1",
      notes: "Use for percentile bands without bucketizing."
    },
    {
      id: "running-sum",
      group: "Window",
      name: "Running / cumulative aggregate pattern",
      signature: "F.sum(col).over(w.rowsBetween(unboundedPreceding, currentRow))",
      summary: "Any aggregate (<code>sum</code>, <code>avg</code>, <code>max</code>...) over an ordered, growing frame gives a running total.",
      returns: "Column",
      params: [
        { name: "aggregate", type: "Column", desc: "The aggregate applied over the window (e.g. <code>F.sum('amt')</code>). With <code>rowsBetween(unboundedPreceding, currentRow)</code> it accumulates from the partition start to the current row." },
        { name: "frame", type: "WindowSpec", desc: "The ordered frame. Swap to <code>rowsBetween(-6, 0)</code> for a moving 7-row average, or <code>rangeBetween</code> for a time-based rolling window." }
      ],
      example: "w = Window.partitionBy('acct').orderBy('ts')\\\n  .rowsBetween(Window.unboundedPreceding, 0)\ndf.withColumn('balance', F.sum('delta').over(w))",
      output: "Running account balance",
      notes: "Note: an ordered aggregate window without an explicit frame defaults to a <b>range</b> frame, which merges ties — set <code>rowsBetween</code> explicitly to avoid surprises."
    },

    // ============================================================ Dates
    {
      id: "current_date",
      group: "Dates",
      name: "F.current_date / current_timestamp",
      signature: "F.current_date()  |  F.current_timestamp()",
      summary: "The session's current date / timestamp, evaluated once per query.",
      returns: "Column",
      params: [
        { name: "(no args)", type: "-", desc: "Take no arguments. Both are pinned to the moment the query starts, so every row in one query sees the <b>same</b> value (deterministic within a query). Resolved in the session time zone <code>spark.sql.session.timeZone</code>." }
      ],
      example: "df.withColumn('loaded_on', F.current_date())",
      output: "date / timestamp constant",
      notes: "Fixed at query start (deterministic within one query), using the session time zone <code>spark.sql.session.timeZone</code>."
    },
    {
      id: "to_date",
      group: "Dates",
      name: "F.to_date",
      signature: "F.to_date(col, format=None)",
      summary: "Parse a string (or truncate a timestamp) into a <code>date</code>.",
      returns: "Column (date)",
      params: [
        { name: "col", type: "Column", desc: "String or timestamp to convert." },
        { name: "format", type: "str", desc: "Optional datetime pattern (<code>'yyyy-MM-dd'</code>, <code>'MM/dd/yyyy'</code>). If omitted, expects ISO <code>yyyy-MM-dd</code>. Unparseable values become <code>null</code> (or raise under the strict Spark 3+ time parser depending on <code>spark.sql.legacy.timeParserPolicy</code>)." }
      ],
      example: "df.withColumn('d',\n  F.to_date('date_str', 'MM/dd/yyyy'))",
      output: "date Column",
      notes: "Patterns use Java <code>DateTimeFormatter</code> letters (note <code>yyyy</code> vs <code>YYYY</code> week-year gotcha)."
    },
    {
      id: "to_timestamp",
      group: "Dates",
      name: "F.to_timestamp",
      signature: "F.to_timestamp(col, format=None)",
      summary: "Parse a string into a <code>timestamp</code> (date + time).",
      returns: "Column (timestamp)",
      params: [
        { name: "col", type: "Column", desc: "String to parse." },
        { name: "format", type: "str", desc: "Optional pattern, e.g. <code>'yyyy-MM-dd HH:mm:ss'</code> (note <code>HH</code> = 24-hour, <code>hh</code> = 12-hour needs <code>a</code> for AM/PM). Defaults to ISO. Bad input -&gt; null. Interpreted in the session time zone." }
      ],
      example: "df.withColumn('ts',\n  F.to_timestamp('raw', 'yyyy-MM-dd HH:mm:ss'))",
      output: "timestamp Column",
      notes: "For epoch seconds use <code>F.timestamp_seconds</code>; for offset-aware strings consider <code>to_timestamp</code> with an <code>XXX</code> pattern."
    },
    {
      id: "date_format",
      group: "Dates",
      name: "F.date_format",
      signature: "F.date_format(col, format)",
      summary: "Format a date/timestamp into a string.",
      returns: "Column (string)",
      params: [
        { name: "col", type: "Column", desc: "Date or timestamp column." },
        { name: "format", type: "str", desc: "Output pattern: <code>'yyyy-MM'</code> (month key), <code>'EEEE'</code> (weekday name), <code>'HH:mm'</code>, <code>'yyyy-'Q'Q'</code> etc. Uses Java pattern letters." }
      ],
      example: "df.withColumn('ym',\n  F.date_format('ts', 'yyyy-MM'))",
      output: "'2026-09'",
      notes: "The inverse of <code>to_date</code>/<code>to_timestamp</code>; great for building partition keys."
    },
    {
      id: "datediff",
      group: "Dates",
      name: "F.datediff",
      signature: "F.datediff(end, start)",
      summary: "Number of days between two dates (<code>end - start</code>).",
      returns: "Column (int)",
      params: [
        { name: "end", type: "Column", desc: "The later date." },
        { name: "start", type: "Column", desc: "The earlier date. Result is <code>end - start</code> in whole days (can be negative). Operates on <b>dates</b> — timestamps are truncated to date." }
      ],
      example: "df.withColumn('tenure',\n  F.datediff(F.current_date(), 'signup_date'))",
      output: "Days as int",
      notes: "For sub-day differences cast to long unix seconds and subtract, or use <code>F.timestampdiff</code> (Spark 3.5+)."
    },
    {
      id: "date_add",
      group: "Dates",
      name: "F.date_add / date_sub / add_months",
      signature: "F.date_add(start, days)  |  F.add_months(start, n)",
      summary: "Shift a date by a number of days or months.",
      returns: "Column (date)",
      params: [
        { name: "start", type: "Column", desc: "Base date." },
        { name: "days (date_add/date_sub)", type: "int | Column", desc: "Days to add (<code>date_add</code>) or subtract (<code>date_sub</code>). Negative flips direction." },
        { name: "n (add_months)", type: "int", desc: "Months to add; clamps to end-of-month (Jan 31 + 1 month -&gt; Feb 28/29)." }
      ],
      example: "df.withColumn('due',\n  F.date_add('invoice_date', 30))",
      output: "date + 30 days",
      notes: "<code>add_months</code> handles month-length edge cases correctly, unlike naive day arithmetic."
    },
    {
      id: "months_between",
      group: "Dates",
      name: "F.months_between",
      signature: "F.months_between(end, start, roundOff=True)",
      summary: "Fractional number of months between two timestamps/dates.",
      returns: "Column (double)",
      params: [
        { name: "end", type: "Column", desc: "Later date/timestamp." },
        { name: "start", type: "Column", desc: "Earlier date/timestamp. Assumes 31-day months for the fractional part; whole months when days match." },
        { name: "roundOff", type: "bool", desc: "When <code>True</code> (default) the result is rounded to 8 decimal places; <code>False</code> returns full precision." }
      ],
      example: "df.withColumn('m',\n  F.months_between(F.current_date(), 'start_date'))",
      output: "e.g. 14.5",
      notes: "Use <code>F.floor</code> for whole completed months."
    },
    {
      id: "year",
      group: "Dates",
      name: "F.year / month / dayofmonth / dayofweek / weekofyear / hour",
      signature: "F.year(col) | F.month(col) | F.dayofweek(col) | F.hour(col)",
      summary: "Extract calendar/time components from a date or timestamp.",
      returns: "Column (int)",
      params: [
        { name: "col", type: "Column", desc: "Date/timestamp source. <code>year</code>/<code>month</code>/<code>dayofmonth</code>/<code>dayofyear</code>/<code>weekofyear</code>/<code>quarter</code> and time parts <code>hour</code>/<code>minute</code>/<code>second</code>. <code>dayofweek</code> is <b>1=Sunday..7=Saturday</b>; <code>weekday</code> is 0=Monday..6=Sunday (mind the convention)." }
      ],
      example: "df.select(F.year('ts'),\n  F.month('ts'),\n  F.dayofweek('ts'))",
      output: "2026, 9, 5",
      notes: "The Sunday-vs-Monday indexing difference between <code>dayofweek</code> and <code>weekday</code> is a frequent bug."
    },
    {
      id: "date_trunc",
      group: "Dates",
      name: "F.date_trunc / trunc / last_day",
      signature: "F.date_trunc(format, timestamp)  |  F.trunc(date, format)",
      summary: "Truncate a timestamp/date down to a unit (start of hour/day/month...).",
      returns: "Column",
      params: [
        { name: "format (date_trunc)", type: "str", desc: "Unit to truncate a <b>timestamp</b> to: <code>'year'</code>,<code>'month'</code>,<code>'week'</code>,<code>'day'</code>,<code>'hour'</code>,<code>'minute'</code>,<code>'second'</code>,<code>'quarter'</code>. Note arg order is (format, ts)." },
        { name: "format (trunc)", type: "str", desc: "<code>F.trunc(date, 'month'|'year'|'week')</code> truncates a <b>date</b> (arg order reversed). <code>F.last_day(date)</code> gives the month's last day." }
      ],
      example: "df.withColumn('month_start',\n  F.date_trunc('month', 'ts'))",
      output: "2026-09-01 00:00:00",
      notes: "Watch the swapped argument order between <code>date_trunc</code> and <code>trunc</code>."
    },
    {
      id: "unix_timestamp",
      group: "Dates",
      name: "F.unix_timestamp / from_unixtime",
      signature: "F.unix_timestamp(col, format)  |  F.from_unixtime(col, format)",
      summary: "Convert between datetime and epoch seconds.",
      returns: "Column",
      params: [
        { name: "unix_timestamp(col, format)", type: "Column, str", desc: "Parse a string/timestamp to <b>epoch seconds</b> (long). Format defaults to <code>'yyyy-MM-dd HH:mm:ss'</code>; with no args uses the current time. Useful as a numeric orderBy key for <code>rangeBetween</code> time windows." },
        { name: "from_unixtime(col, format)", type: "Column, str", desc: "Inverse: epoch seconds -&gt; formatted string." }
      ],
      example: "df.withColumn('ts_unix', F.unix_timestamp('ts'))",
      output: "1789000000",
      notes: "For epoch <b>milliseconds</b> divide/multiply by 1000, or use <code>F.timestamp_millis</code>/<code>unix_millis</code> (Spark 3.5+)."
    },
    {
      id: "window-tumbling",
      group: "Dates",
      name: "F.window (tumbling / sliding)",
      signature: "F.window(timeColumn, windowDuration, slideDuration=None, startTime=None)",
      summary: "Bucket rows into fixed time windows — group time series into intervals.",
      returns: "Column (struct<start, end>)",
      params: [
        { name: "timeColumn", type: "Column", desc: "A timestamp column to bucket." },
        { name: "windowDuration", type: "str", desc: "Window length like <code>'10 minutes'</code>, <code>'1 hour'</code>, <code>'1 day'</code>." },
        { name: "slideDuration", type: "str | None", desc: "Step between windows. If omitted, equals <code>windowDuration</code> = non-overlapping <b>tumbling</b> windows; if smaller, produces overlapping <b>sliding</b> windows (rows land in multiple)." },
        { name: "startTime", type: "str | None", desc: "Offset to shift window boundaries, e.g. <code>'5 minutes'</code> to start on the :05." }
      ],
      example: "df.groupBy(F.window('ts', '1 hour')).agg(F.sum('rev'))\\\n  .select('window.start', 'window.end', 'sum(rev)')",
      output: "Hourly revenue buckets",
      notes: "Returns a struct — project <code>window.start</code>/<code>window.end</code>. Core of streaming aggregations."
    },

    // ============================================================ Joins
    {
      id: "join",
      group: "Joins",
      name: "DataFrame.join",
      signature: "df.join(other, on=None, how='inner')",
      summary: "Combine two DataFrames on a condition. The type (<code>how</code>) determines which unmatched rows survive.",
      returns: "DataFrame",
      params: [
        { name: "other", type: "DataFrame", desc: "The right-side DataFrame." },
        { name: "on", type: "str | list[str] | Column", desc: "The join condition. A <b>string/list of names</b> present in both frames does an equi-join and yields a <b>single</b> merged key column; a <b>Column</b> expression (<code>df.a == other.b</code>) allows arbitrary/inequality conditions but keeps <b>both</b> key columns (dedupe or alias to avoid ambiguity)." },
        { name: "how", type: "str", desc: "Join type: <code>'inner'</code> (only matching rows), <code>'left'</code>/<code>'left_outer'</code> (all left + matched right, nulls otherwise), <code>'right'</code> (mirror), <code>'outer'</code>/<code>'full'</code> (all rows both sides), <code>'left_semi'</code> (left rows that HAVE a match, right columns dropped — a filter), <code>'left_anti'</code> (left rows with NO match — 'not exists'), <code>'cross'</code> (Cartesian)." }
      ],
      example: "df.join(dim, on='dept_id', how='left')\ndf.join(other, df.id == other.fk, 'left_anti')",
      output: "Joined DataFrame",
      notes: "Equality on a name string avoids duplicate key columns. <code>left_semi</code>/<code>left_anti</code> are the idiomatic EXISTS / NOT EXISTS."
    },
    {
      id: "join-on-conditions",
      group: "Joins",
      name: "Join conditions (on=)",
      signature: "df.join(other, [conds], how)",
      summary: "How to express single, multi-key, and inequality join predicates.",
      returns: "DataFrame",
      params: [
        { name: "single name", type: "str", desc: "<code>on='id'</code> — equi-join, one merged <code>id</code> column in output." },
        { name: "list of names", type: "list[str]", desc: "<code>on=['country','city']</code> — AND of equalities, each key merged once." },
        { name: "Column expr", type: "Column", desc: "<code>on=(a.id==b.id) &amp; (a.ts &gt;= b.start) &amp; (a.ts &lt; b.end)</code> — supports ranges/inequalities but keeps both sides' columns; qualify with <code>alias</code> and <code>select</code> the wanted ones." }
      ],
      example: "a = df.alias('a'); b = dim.alias('b')\na.join(b, (F.col('a.k')==F.col('b.k')) & (F.col('a.d').between(F.col('b.lo'), F.col('b.hi'))))",
      output: "Range-joined DataFrame",
      notes: "Non-equi joins can't use hash/sort-merge on the inequality and may fall back to a broadcast nested loop — keep the broadcast side small."
    },
    {
      id: "broadcast",
      group: "Joins",
      name: "F.broadcast",
      signature: "F.broadcast(df)",
      summary: "Hint Spark to broadcast a small DataFrame to every executor, turning a shuffle join into a map-side broadcast-hash join.",
      returns: "DataFrame (hinted)",
      params: [
        { name: "df", type: "DataFrame", desc: "The <b>small</b> side to replicate to all executors (each node holds the whole thing in memory). Eliminates the large side's shuffle. Only wrap a side that comfortably fits in executor memory — roughly under <code>spark.sql.autoBroadcastJoinThreshold</code> (default 10MB) though the hint forces it beyond that." }
      ],
      example: "df.join(F.broadcast(small_dim), 'dept_id')",
      output: "Broadcast-hash-joined DataFrame",
      notes: "AQE can auto-broadcast at runtime, but the explicit hint helps when stats are missing. Broadcasting a too-large frame OOMs the driver/executors."
    },
    {
      id: "crossJoin",
      group: "Joins",
      name: "DataFrame.crossJoin",
      signature: "df.crossJoin(other)",
      summary: "Explicit Cartesian product — every left row paired with every right row.",
      returns: "DataFrame",
      params: [
        { name: "other", type: "DataFrame", desc: "Right side. Output row count is <code>left * right</code> — explodes fast, so only for tiny inputs (e.g. a calendar/parameter grid). Requires no condition; Spark blocks accidental cross products unless you use this or set <code>spark.sql.crossJoin.enabled</code>." }
      ],
      example: "dates.crossJoin(products)  # date x product grid",
      output: "N*M rows",
      notes: "Prefer this explicit call so an accidental missing join key doesn't silently become a Cartesian blowup."
    },

    // ============================================================ I/O
    {
      id: "read-parquet",
      group: "I/O",
      name: "spark.read.parquet",
      signature: "spark.read.parquet(*paths)",
      summary: "Read Parquet — the preferred columnar format (schema embedded, predicate/column pushdown).",
      returns: "DataFrame",
      params: [
        { name: "*paths", type: "str", desc: "One or more file/dir/glob paths. Directory reads combine part files; Hive-style <code>col=value</code> subdirs are auto-discovered as partition columns and enable partition pruning. Schema (including types) is read from the files — no inference pass." }
      ],
      example: "spark.read.parquet('/lake/events/dt=2026-09-10')",
      output: "DataFrame (schema from file)",
      notes: "Columnar pushdown means selecting few columns and filtering partitions is very cheap. Prefer Parquet/ORC over CSV/JSON for analytics."
    },
    {
      id: "read-csv",
      group: "I/O",
      name: "spark.read.csv",
      signature: "spark.read.csv(path, **options)",
      summary: "Read delimited text; needs options because CSV carries no schema.",
      returns: "DataFrame",
      params: [
        { name: "header", type: "bool", desc: "<code>True</code> uses the first line as column names (default False)." },
        { name: "inferSchema", type: "bool", desc: "<code>True</code> makes an <b>extra pass</b> over the data to guess types; default False (everything string). Prefer passing an explicit <code>schema</code> in production to skip the pass and avoid wrong guesses." },
        { name: "schema", type: "StructType | str", desc: "Explicit schema (DDL string like <code>'id INT, name STRING'</code>); fastest and safest — skips inference." },
        { name: "sep", type: "str", desc: "Field delimiter (default <code>','</code>); use <code>'\\t'</code> for TSV." },
        { name: "mode", type: "str", desc: "Malformed-row handling: <code>'PERMISSIVE'</code> (default — nulls the bad fields, stashes raw in <code>_corrupt_record</code>), <code>'DROPMALFORMED'</code> (discard bad rows), <code>'FAILFAST'</code> (raise on the first bad row)." }
      ],
      example: "spark.read.csv('/in/*.csv', header=True,\n  schema='id INT, name STRING, amt DOUBLE', mode='DROPMALFORMED')",
      output: "DataFrame",
      notes: "Other options: <code>quote</code>, <code>escape</code>, <code>nullValue</code>, <code>dateFormat</code>, <code>multiLine</code>."
    },
    {
      id: "read-json",
      group: "I/O",
      name: "spark.read.json",
      signature: "spark.read.json(path, **options)",
      summary: "Read JSON — one JSON object per line by default (JSON Lines).",
      returns: "DataFrame",
      params: [
        { name: "path", type: "str", desc: "File/dir/glob of JSON. By default expects one object per line; nested objects become struct columns." },
        { name: "multiLine", type: "bool", desc: "<code>True</code> to parse files that contain a single pretty-printed JSON (or array) spanning multiple lines; default False (line-delimited)." },
        { name: "schema", type: "StructType | str", desc: "Explicit schema to skip inference (which otherwise samples the data and can miss rare fields). Extra JSON fields not in the schema are dropped." },
        { name: "mode", type: "str", desc: "<code>PERMISSIVE</code>/<code>DROPMALFORMED</code>/<code>FAILFAST</code> as with CSV, controlling handling of unparseable records." }
      ],
      example: "spark.read.json('/in/events', multiLine=False)",
      output: "DataFrame (nested structs)",
      notes: "Access nested fields with dotted paths; explode arrays with <code>F.explode</code>."
    },
    {
      id: "write",
      group: "I/O",
      name: "DataFrame.write",
      signature: "df.write.mode(m).partitionBy(*c).format(f).save(path)",
      summary: "Write a DataFrame out. Configure via the <code>DataFrameWriter</code> builder before <code>save</code>.",
      returns: "None (action)",
      params: [
        { name: "mode", type: "str", desc: "Behavior if the target exists: <code>'overwrite'</code> (replace — with <code>partitionOverwriteMode=dynamic</code> only touched partitions), <code>'append'</code> (add files), <code>'error'</code>/<code>'errorifexists'</code> (default — raise), <code>'ignore'</code> (skip silently if present)." },
        { name: "partitionBy", type: "*str", desc: "Columns to write as Hive-style <code>col=value</code> directory partitions, enabling partition pruning on read. Choose low-cardinality columns; high cardinality creates a tiny-file explosion." },
        { name: "format", type: "str", desc: "<code>'parquet'</code> (default), <code>'delta'</code>, <code>'orc'</code>, <code>'csv'</code>, <code>'json'</code>. Shorthands: <code>.parquet(path)</code>, <code>.csv(path)</code> etc." }
      ],
      example: "df.write.mode('overwrite').partitionBy('dt')\\\n  .format('parquet').save('/lake/events')",
      output: "Files written to path",
      notes: "Control output file count with <code>repartition</code>/<code>coalesce</code> upstream; combine <code>partitionBy</code> with sane partition sizes (~128MB)."
    },
    {
      id: "saveAsTable",
      group: "I/O",
      name: "DataFrameWriter.saveAsTable / insertInto",
      signature: "df.write.mode(m).saveAsTable(name)",
      summary: "Persist as a managed/external table registered in the metastore (queryable via SQL).",
      returns: "None",
      params: [
        { name: "name", type: "str", desc: "Table name (<code>'db.table'</code>). <code>saveAsTable</code> matches columns by <b>name</b> and can create the table/schema; <code>insertInto(name)</code> requires an existing table and matches by <b>position</b>." },
        { name: "mode", type: "str", desc: "<code>overwrite</code>/<code>append</code>/etc. as with <code>save</code>. With partitioned tables, <code>overwrite</code> honors <code>spark.sql.sources.partitionOverwriteMode</code> (static replaces all, dynamic only affected partitions)." }
      ],
      example: "(df.write.mode('overwrite')\n  .saveAsTable('analytics.events'))",
      output: "Table registered in catalog",
      notes: "Managed tables store data under the warehouse dir; use <code>.option('path', ...)</code> for an external location."
    },
    {
      id: "createOrReplaceTempView",
      group: "I/O",
      name: "DataFrame.createOrReplaceTempView",
      signature: "df.createOrReplaceTempView(name)",
      summary: "Register a DataFrame as a session-scoped temp view so it can be queried with <code>spark.sql</code>.",
      returns: "None",
      params: [
        { name: "name", type: "str", desc: "View name for SQL. <b>Session-scoped</b> and lazy (no data materialized — it's just the plan). Use <code>createOrReplaceGlobalTempView</code> (queried as <code>global_temp.name</code>) to share across sessions." }
      ],
      example: "df.createOrReplaceTempView('events')\nspark.sql('SELECT dept, count(*) FROM events GROUP BY dept')",
      output: "Queryable via spark.sql",
      notes: "Not persisted and not in the metastore; disappears when the session ends. Cache the DataFrame if the view is hit repeatedly."
    },

    // ============================================================ Performance
    {
      id: "perf-repartition-coalesce",
      group: "Performance",
      name: "repartition vs coalesce",
      signature: "df.repartition(n[, *cols])  vs  df.coalesce(n)",
      summary: "Two ways to change partition count with very different cost and behavior.",
      returns: "DataFrame",
      params: [
        { name: "repartition", type: "shuffle", desc: "Full shuffle; can <b>increase or decrease</b> partitions and evenly (re)balance data, optionally hash-partitioning by key to co-locate for joins/aggs. Costly but fixes skew and low parallelism." },
        { name: "coalesce", type: "no shuffle", desc: "Merges existing partitions to a <b>smaller</b> count with no network shuffle (narrow) — cheap, but can leave uneven partitions and reduces upstream parallelism (the coalesced count flows back up the stage)." }
      ],
      example: "df.repartition(400, 'key')     # spread & co-locate\nresult.coalesce(1).write.parquet(out)  # one output file",
      output: "Re-partitioned DataFrame",
      notes: "Rule of thumb: <code>repartition</code> to grow/rebalance, <code>coalesce</code> to shrink cheaply right before write."
    },
    {
      id: "perf-broadcast",
      group: "Performance",
      name: "Broadcast join (skew & shuffle avoidance)",
      signature: "df.join(F.broadcast(small), key)",
      summary: "Replicate a small table to all executors so the big table never shuffles.",
      returns: "concept",
      params: [
        { name: "threshold", type: "spark.sql.autoBroadcastJoinThreshold", desc: "Tables estimated below this size (default 10MB) are auto-broadcast. Raise it, or use the explicit <code>F.broadcast</code> hint, to broadcast larger dimensions — bounded by executor/driver memory." },
        { name: "when to use", type: "guidance", desc: "Ideal for a large fact joined to a small dimension. Avoids the expensive sort-merge shuffle of both sides. Too-large a broadcast OOMs; then fall back to a shuffle sort-merge join or bucketing." }
      ],
      example: "fact.join(F.broadcast(dim_country), 'country_code')",
      output: "Broadcast-hash join (no big-side shuffle)",
      notes: "A broadcast join also sidesteps join-key skew because the big side is never partitioned by the key."
    },
    {
      id: "perf-cache",
      group: "Performance",
      name: "cache / persist + StorageLevel",
      signature: "df.persist(StorageLevel.MEMORY_AND_DISK)",
      summary: "Materialize a reused DataFrame once instead of recomputing its lineage per action.",
      returns: "concept",
      params: [
        { name: "StorageLevel", type: "enum", desc: "<code>MEMORY_ONLY</code> (fast, recompute if evicted), <code>MEMORY_AND_DISK</code> (default — spill to disk on pressure), <code>DISK_ONLY</code>, plus <code>_SER</code> (serialized, smaller/CPU cost) and <code>_2</code> (2x replicated for fault tolerance) variants." },
        { name: "when to use", type: "guidance", desc: "Only when a DataFrame is used by <b>2+</b> actions and its recompute is expensive. Must trigger an action to populate; free with <code>unpersist()</code> to reclaim memory and avoid cache thrash." }
      ],
      example: "base = df.filter('active').persist(StorageLevel.MEMORY_AND_DISK)\nbase.count(); base.groupBy('k').count().show()\nbase.unpersist()",
      output: "Cached DataFrame reused across actions",
      notes: "Caching a used-once DataFrame just wastes memory. Check the Storage tab to confirm it's cached and not evicted."
    },
    {
      id: "perf-partitionBy",
      group: "Performance",
      name: "partitionBy on write (partition pruning)",
      signature: "df.write.partitionBy('dt').parquet(path)",
      summary: "Lay out output in per-value directories so reads can skip (prune) irrelevant partitions.",
      returns: "concept",
      params: [
        { name: "column choice", type: "guidance", desc: "Partition on <b>low-cardinality</b>, frequently-filtered columns (e.g. date). Each distinct value becomes a directory; a filter on it reads only matching dirs (partition pruning), massively cutting scanned data." },
        { name: "cardinality trap", type: "guidance", desc: "High-cardinality partition columns (user_id) create millions of tiny files — the 'small files problem' that cripples the driver and scans. Keep files ~128MB–1GB; combine with bucketing for high-cardinality join keys instead." }
      ],
      example: "df.write.mode('overwrite').partitionBy('year', 'month')\\\n  .parquet('/lake/sales')",
      output: "/lake/sales/year=2026/month=09/...",
      notes: "Partition pruning happens only when the read filter references the partition column directly."
    },
    {
      id: "perf-aqe",
      group: "Performance",
      name: "Adaptive Query Execution (AQE)",
      signature: "spark.conf.set('spark.sql.adaptive.enabled', True)",
      summary: "Runtime re-optimization using actual shuffle statistics (on by default in Spark 3.2+).",
      returns: "concept",
      params: [
        { name: "spark.sql.adaptive.enabled", type: "bool", desc: "Master switch. When on, Spark rewrites the plan mid-query using real stats." },
        { name: "coalescePartitions", type: "sub-feature", desc: "<code>spark.sql.adaptive.coalescePartitions.enabled</code> merges tiny post-shuffle partitions automatically (reduces the fixed 200-partition tax)." },
        { name: "skewJoin", type: "sub-feature", desc: "<code>spark.sql.adaptive.skewJoin.enabled</code> detects skewed join partitions and splits them, and AQE can switch a sort-merge join to broadcast when a side turns out small." }
      ],
      example: "spark.conf.set('spark.sql.adaptive.enabled', 'true')\nspark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')",
      output: "Plan adapts at runtime",
      notes: "AQE reduces the need for manual repartition tuning but doesn't fix everything — extreme key skew may still need salting."
    },
    {
      id: "perf-salting",
      group: "Performance",
      name: "Salting for join/aggregation skew",
      signature: "add a random salt to the hot key, then join/group, then strip it",
      summary: "Break up a hot key by appending a random bucket so its rows spread across many partitions/tasks.",
      returns: "concept",
      params: [
        { name: "salt range N", type: "int", desc: "Number of salt buckets. The large/skewed side gets a random <code>salt in [0,N)</code> appended to the key; the small side is <b>exploded</b> into all N variants. Bigger N spreads a hotter key wider but multiplies the small side N-fold." },
        { name: "when to use", type: "guidance", desc: "For a few keys that dominate a join/groupBy and overload one task (straggler). After the salted join/agg, drop the salt and re-aggregate partials to a final result." }
      ],
      example: "N = 16\nbig = df.withColumn('salt', (F.rand()*N).cast('int'))\nsmall2 = small.withColumn('salt', F.explode(F.array(*[F.lit(i) for i in range(N)])))\nbig.join(small2, ['key', 'salt'])",
      output: "Skewed key spread over N tasks",
      notes: "Prefer AQE skew handling or a broadcast join first; salt only when those aren't enough."
    }

  ]
};
