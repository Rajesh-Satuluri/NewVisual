/*
 * PySpark Interview Lab — Schema Drift & Dynamic Data-Quality (Medium)
 * Schema identical to data/pyspark/bad_data_ingest.js; registers into the existing
 * "Nulls & Data Quality" category. Covers two ingestion-hardening skills not yet in
 * the bank: reconciling a column whose TYPE drifts across daily files (the existing
 * schema-evolution problem is additive-column only), and generating a column-level
 * data-quality report generically for ANY DataFrame. Both solutions were executed
 * on Spark 3.5.3 against the sample data shown.
 */
(function () {
  var CAT = "Nulls & Data Quality";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q316
    {
      id: "schema-drift-type-changes",
      lc: 316,
      title: "Handle schema drift when a column's type changes across daily files",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Type-drift reconciliation to a canonical schema", transformation: "Read + cast + union", functions: "cast, select, unionByName, try_cast" },
      description:
        "Daily files for the same feed disagree on a column's <b>type</b>: yesterday <code>amount</code> arrived as a string (<code>'100'</code>), today as an integer, tomorrow maybe a double. A plain <code>unionByName</code> across days fails or mis-types the result. Conform every day's DataFrame to one <b>canonical target schema</b> (safe casts) before combining, so the unified DataFrame has stable, correct types. (Distinct from additive schema evolution &mdash; here the column exists everywhere but its type changes.)",
      examples: [
        {
          inputs: [
            { name: "day1 (amount: string)", columns: ["id", "amount"],
              rows: [[1, "100"]] },
            { name: "day2 (amount: int)", columns: ["id", "amount"],
              rows: [[2, 200]] }
          ],
          output: { name: "unified (amount cast to DOUBLE)", columns: ["id", "amount"],
            rows: [[1, "100.0"], [2, "200.0"]] },
          reasoning: "Each day is cast to the canonical (id int, amount double) before union, so the string '100' and the int 200 both become doubles and unionByName aligns identically-typed columns instead of erroring on the string-vs-int mismatch."
        }
      ],
      approaches: [
        {
          name: "define a canonical schema, cast each file to it (safe/try_cast), then unionByName",
          whenToUse: "Appending multiple source files/days whose shared columns disagree on type (string vs numeric, int vs long, date vs string) and you need one well-typed table.",
          logic:
            "**What it asks.** Combine files whose common columns have inconsistent types into a single DataFrame with one deterministic type per column.\n\n" +
            "**Key Idea.** Pick a <b>canonical target schema</b> (the widest safe type per column: string->double is fine, mixed numerics -> double, anything ambiguous -> string) and <b>conform each file to it before union</b>. `unionByName` requires matching types per name; casting first removes the mismatch. Use `try_cast` (or validate casts, as in the failed-cast problem) so a value that cannot convert becomes null and quarantinable rather than throwing under ANSI mode.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide the canonical schema: `target = [('id','int'), ('amount','double'), ...]`.\n" +
            "2. Write a `conform(df)` that selects every target column `cast` to its target type (and adds missing ones as null literals).\n" +
            "3. Apply `conform` to each day's DataFrame.\n" +
            "4. `reduce(DataFrame.unionByName, conformed_list)` &mdash; now all types match.\n" +
            "5. Optionally split out rows where a value failed to cast (non-null before, null after) for a reject audit.\n\n" +
            "**Why it works.** Casting is the normalization step that makes the schemas identical, so `unionByName` aligns columns by name over a consistent type set instead of failing on the first type clash. Centralizing the target schema means drift in any single file is absorbed at the edge, not propagated downstream.\n\n" +
            "**Common Gotchas.**\n" +
            "- `unionByName(allowMissingColumns=True)` tolerates <i>missing</i> columns but NOT differing types &mdash; you still must cast.\n" +
            "- Plain `cast` turns bad values silently to null; under ANSI mode it throws &mdash; use `try_cast` and audit the nulls.\n" +
            "- Narrowing casts lose data (double->int truncates); always cast toward the <b>wider</b> type.\n" +
            "- Reading with `inferSchema` per file is what creates the drift in the first place &mdash; prefer reading each file with an explicit schema, or read as string and cast centrally.\n\n" +
            "**Interview mindset.** 'Pick a canonical schema, cast each file to it (try_cast + audit), then unionByName. allowMissingColumns handles missing columns, not type clashes.'",
          rcs:
            "from functools import reduce\n" +
            "from pyspark.sql import DataFrame\n" +
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "# canonical target schema: widest safe type per column\n" +
            "target = [('id', 'int'), ('amount', 'double')]\n" +
            "\n" +
            "def conform(df):\n" +
            "    cols = []\n" +
            "    for name, typ in target:\n" +
            "        if name in df.columns:\n" +
            "            cols.append(F.col(name).cast(typ).alias(name))   # safe cast to canonical type\n" +
            "        else:\n" +
            "            cols.append(F.lit(None).cast(typ).alias(name))   # missing column -> typed null\n" +
            "    return df.select(*cols)\n" +
            "\n" +
            "unified = reduce(DataFrame.unionByName, [conform(day1), conform(day2)])\n" +
            "# unified.schema -> amount: double; values 100.0, 200.0",
          plain:
            "from functools import reduce\n" +
            "from pyspark.sql import DataFrame, functions as F\n" +
            "target = [('id','int'), ('amount','double')]\n" +
            "def conform(df):\n" +
            "    return df.select(*[F.col(n).cast(t).alias(n) for n,t in target])\n" +
            "unified = reduce(DataFrame.unionByName, [conform(day1), conform(day2)])"
        }
      ],
      sparkInternals:
        "<code>unionByName</code> is a <b>narrow</b> transformation &mdash; it stacks partitions with no shuffle &mdash; but it compiles only when the by-name columns share a type, which is why the per-file `cast` (also narrow, a pipelined projection) must come first. Each `cast` is pushed into the file scan where possible, so conforming adds no extra pass over the data. The canonical-schema pattern keeps Catalyst's analyzed plan stable across days even as input types drift, so downstream plans don't need rewriting. Reading each file with an explicit schema avoids the extra inference job and is the real fix for the drift; casting is the reconciliation when you cannot control the producers. <code>try_cast</code> compiles to the same scan-level conversion but yields null instead of failing, keeping the job alive under ANSI mode.",
      sparkSql:
        "-- conform each file to the canonical types, then UNION ALL BY NAME\n" +
        "SELECT CAST(id AS INT) id, CAST(amount AS DOUBLE) amount FROM day1\n" +
        "UNION ALL BY NAME\n" +
        "SELECT CAST(id AS INT) id, CAST(amount AS DOUBLE) amount FROM day2;",
      recognizeRecall: [
        "**Spot it:** 'column type changes between files/days', 'union fails on type mismatch', 'string one day, int the next'.",
        "**Say it:** canonical target schema, cast each file to it (try_cast), then unionByName.",
        "**Trap:** allowMissingColumns handles missing cols NOT type clashes; cast toward the wider type; audit failed casts.",
        "**Follow-up:** How is this different from mergeSchema/autoMerge? (Those add new columns; they don't reconcile a column whose type changed.)",
        "**Follow-up:** How would you catch drift automatically? (Compare each file's inferred schema to the canonical one and alert/quarantine on mismatch.)"
      ]
    },

    // ------------------------------------------------------------------ Q317
    {
      id: "dynamic-column-dq-report",
      lc: 317,
      title: "Generate a dynamic column-level data-quality report for any DataFrame",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Schema-agnostic column profiling", transformation: "Single wide agg", functions: "df.columns loop, count/when, countDistinct, agg" },
      description:
        "Write a function that takes <b>any</b> DataFrame and returns a data-quality report with one row <b>per column</b>: total rows, null count, null %, and distinct count. It must work for arbitrary schemas (you don't know the columns ahead of time), computing all metrics in a <b>single pass</b> rather than one job per column.",
      examples: [
        {
          inputs: [
            { name: "df", columns: ["id", "cat", "val"],
              rows: [[1, "a", null], [2, "a", 5], [3, null, 5]] }
          ],
          output: { name: "dq_report", columns: ["column", "total", "nulls", "null_pct", "distinct"],
            rows: [["id", 3, 0, "0.0", 3], ["cat", 3, 1, "33.33", 1], ["val", 3, 1, "33.33", 1]] },
          reasoning: "Iterating df.columns builds a null-count and distinct-count aggregation for every column; one agg() computes them all together, then the single result row is reshaped into one report row per column."
        }
      ],
      approaches: [
        {
          name: "build per-column aggregations by looping df.columns, run one agg(), reshape the result row",
          whenToUse: "Profiling an unknown/evolving schema, pre-ingestion data-quality gates, or a reusable DQ utility that must not hard-code column names.",
          logic:
            "**What it asks.** A reusable profiler: given any DataFrame, report null and cardinality metrics for every column without naming columns in advance, cheaply.\n\n" +
            "**Key Idea.** Iterate `df.columns` to <b>programmatically build</b> a list of aggregate expressions &mdash; for each column a `count(when(col.isNull(),1))` and a `countDistinct(col)` &mdash; then run them all in a <b>single `agg()`</b>. That one job returns a single wide row; reshape it on the driver into one report row per column. Because the expressions are generated from the schema, the same function profiles any DataFrame.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `total = df.count()` (one job).\n" +
            "2. Loop `df.columns`, appending `F.count(F.when(F.col(c).isNull(), 1)).alias(c+'__n')` and `F.countDistinct(F.col(c)).alias(c+'__d')`.\n" +
            "3. `row = df.agg(*aggs).collect()[0].asDict()` (one job for all columns).\n" +
            "4. Build `[(c, total, row[c+'__n'], 100*row[c+'__n']/total, row[c+'__d']) for c in df.columns]`.\n" +
            "5. `spark.createDataFrame(report, ['column','total','nulls','null_pct','distinct'])`.\n\n" +
            "**Why it works.** All per-column metrics are independent aggregates over the same rows, so Spark computes them together in one scan+shuffle instead of one job per column. Generating the expressions from `df.columns` makes the profiler schema-agnostic; reshaping the single result row is pure driver-side work.\n\n" +
            "**Common Gotchas.**\n" +
            "- Looping `df.select(c)....count()` per column runs N jobs over the data &mdash; collapse into one `agg()`.\n" +
            "- `countDistinct` is exact and shuffle-heavy on high-cardinality columns; use `approx_count_distinct` for big data.\n" +
            "- `count(when(isNull,1))` counts nulls; for strings also consider empty/whitespace as 'effectively null'.\n" +
            "- Deriving null% needs `total` as a float; guard against an empty DataFrame (total 0).\n" +
            "- Mixing incompatible metrics (min/max on a string vs numeric) across arbitrary types needs per-type branching on `df.dtypes`.\n\n" +
            "**Interview mindset.** 'Generate aggregate expressions from df.columns, run ONE agg for all of them, reshape the single row into per-column report rows. approx_count_distinct for scale.'",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "def dq_report(df):\n" +
            "    total = df.count()\n" +
            "    aggs = []\n" +
            "    for c in df.columns:                 # schema-agnostic: build exprs from columns\n" +
            "        aggs.append(F.count(F.when(F.col(c).isNull(), F.lit(1))).alias(c + '__n'))\n" +
            "        aggs.append(F.countDistinct(F.col(c)).alias(c + '__d'))\n" +
            "    row = df.agg(*aggs).collect()[0].asDict()        # ONE job, all columns\n" +
            "    report = [(c, total, row[c + '__n'],\n" +
            "               round(100.0 * row[c + '__n'] / total, 2) if total else None,\n" +
            "               row[c + '__d']) for c in df.columns]\n" +
            "    return spark.createDataFrame(\n" +
            "        report, ['column', 'total', 'nulls', 'null_pct', 'distinct'])\n" +
            "\n" +
            "dq_report(df).show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "def dq_report(df):\n" +
            "    total = df.count()\n" +
            "    aggs = []\n" +
            "    for c in df.columns:\n" +
            "        aggs += [F.count(F.when(F.col(c).isNull(),1)).alias(c+'__n'),\n" +
            "                 F.countDistinct(F.col(c)).alias(c+'__d')]\n" +
            "    row = df.agg(*aggs).collect()[0].asDict()\n" +
            "    rep = [(c, total, row[c+'__n'], row[c+'__d']) for c in df.columns]\n" +
            "    return spark.createDataFrame(rep, ['column','total','nulls','distinct'])"
        }
      ],
      sparkInternals:
        "The key efficiency move is collapsing N per-column passes into a <b>single aggregation</b>: all the `count(when(isNull))` and `countDistinct` expressions ride one scan and one shuffle, so profiling a 100-column table is one job, not 100. `countDistinct` plans as a shuffle+aggregate per column and dominates cost on high-cardinality data; <code>approx_count_distinct</code> (HyperLogLog) replaces it with a bounded-memory sketch and a fraction of the shuffle. The final `collect()` pulls a single tiny row to the driver, and the report DataFrame is built from a handful of Python tuples &mdash; negligible. Because the aggregate list is generated from `df.columns`, the physical plan adapts to whatever schema arrives, which is what makes the utility reusable.",
      sparkSql:
        "-- per column (SQL can't loop); build one SELECT of all metrics, e.g. for 'cat':\n" +
        "SELECT count(*) AS total,\n" +
        "       count(CASE WHEN cat IS NULL THEN 1 END) AS cat_nulls,\n" +
        "       count(DISTINCT cat) AS cat_distinct\n" +
        "FROM t;  -- the PySpark loop generates this across all columns dynamically",
      recognizeRecall: [
        "**Spot it:** 'profile any DataFrame', 'null % per column', 'generic data-quality report', 'unknown schema'.",
        "**Say it:** build agg exprs from df.columns, ONE agg() for all, reshape the single row into per-column rows.",
        "**Trap:** don't run one job per column; countDistinct is heavy -> approx_count_distinct; guard total==0.",
        "**Follow-up:** Add min/max/mean per column. (Branch on df.dtypes; numeric-only metrics guarded by type.)",
        "**Follow-up:** How would you gate ingestion on this? (Fail/quarantine when null% exceeds a per-column threshold before writing.)"
      ]
    }

  ]);
})();
