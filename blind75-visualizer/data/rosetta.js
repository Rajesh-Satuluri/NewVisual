/*
 * data/rosetta.js — the "Rosetta Stone" dataset (M5.3): one common data task,
 * expressed in every dialect side by side. Powers both the cross-stack compare
 * view and the per-stack quick-reference (same data, filtered to one column).
 *
 * Conventions used in the snippets:
 *   SQL      — table orders(id, customer, region, amount, ts); ANSI + notes.
 *   sparksql — the same query run via spark.sql("..."); Spark SQL dialect,
 *              which is close to ANSI but has its own functions and quirks
 *              (FILTER (WHERE ...), PERCENTILE_APPROX, date_format/to_date,
 *              backtick quoting, LATERAL VIEW explode, no QUALIFY, array/map/
 *              struct, collect_list, broadcast hints).
 *   pandas   — a DataFrame `df` (import pandas as pd).
 *   spark    — a DataFrame `df`; assumes `from pyspark.sql import functions as F, Window`.
 *   python   — plain rows: a list[dict] called `rows` (shown when it maps cleanly).
 *
 * window.ROSETTA.tasks: [{ id, group, task, note, code:{sql,sparksql,pandas,spark,python?} }]
 */
window.ROSETTA = {
  groups: ["Filtering", "Shaping", "Aggregation", "Joins", "Windows", "Columns", "Text & Dates", "Reshape", "Ranking & Dedup", "Nulls & Types"],
  tasks: [
    // -------------------------------------------------- Filtering
    {
      id: "filter-rows", group: "Filtering", task: "Filter rows by a condition",
      note: "Keep rows where amount > 100.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE amount > 100;",
        sparksql: "SELECT *\nFROM orders\nWHERE amount > 100",
        pandas: "df[df['amount'] > 100]",
        spark: "df.filter(F.col('amount') > 100)",
        python: "[r for r in rows if r['amount'] > 100]"
      }
    },
    {
      id: "filter-multi", group: "Filtering", task: "Multiple conditions (AND / OR)",
      note: "region is 'US' AND amount > 100. Note pandas/Spark need & and parentheses.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE region = 'US' AND amount > 100;",
        sparksql: "SELECT *\nFROM orders\nWHERE region = 'US' AND amount > 100",
        pandas: "df[(df['region'] == 'US') & (df['amount'] > 100)]",
        spark: "df.filter(\n  (F.col('region') == 'US') &\n  (F.col('amount') > 100))",
        python: "[r for r in rows if r['region'] == 'US' and r['amount'] > 100]"
      }
    },
    {
      id: "filter-in", group: "Filtering", task: "Membership (IN a set)",
      note: "region is one of a fixed list.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE region IN ('US', 'EU');",
        sparksql: "SELECT *\nFROM orders\nWHERE region IN ('US', 'EU')",
        pandas: "df[df['region'].isin(['US', 'EU'])]",
        spark: "df.filter(F.col('region').isin('US', 'EU'))"
      }
    },
    {
      id: "filter-between", group: "Filtering", task: "Range (BETWEEN)",
      note: "amount in [50, 200] inclusive. pandas has Series.between; Spark uses .between too.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE amount BETWEEN 50 AND 200;",
        sparksql: "SELECT *\nFROM orders\nWHERE amount BETWEEN 50 AND 200",
        pandas: "df[df['amount'].between(50, 200)]",
        spark: "df.filter(F.col('amount').between(50, 200))",
        python: "[r for r in rows if 50 <= r['amount'] <= 200]"
      }
    },
    // -------------------------------------------------- Shaping
    {
      id: "select-cols", group: "Shaping", task: "Select specific columns",
      note: "Project just customer and amount.",
      code: {
        sql: "SELECT customer, amount\nFROM orders;",
        sparksql: "SELECT customer, amount\nFROM orders",
        pandas: "df[['customer', 'amount']]",
        spark: "df.select('customer', 'amount')",
        python: "[{'customer': r['customer'], 'amount': r['amount']} for r in rows]"
      }
    },
    {
      id: "sort", group: "Shaping", task: "Sort / order by",
      note: "Highest amount first.",
      code: {
        sql: "SELECT *\nFROM orders\nORDER BY amount DESC;",
        sparksql: "SELECT *\nFROM orders\nORDER BY amount DESC",
        pandas: "df.sort_values('amount', ascending=False)",
        spark: "df.orderBy(F.col('amount').desc())",
        python: "sorted(rows, key=lambda r: r['amount'], reverse=True)"
      }
    },
    {
      id: "top-n", group: "Shaping", task: "Top-N rows",
      note: "The 5 largest by amount.",
      code: {
        sql: "SELECT *\nFROM orders\nORDER BY amount DESC\nLIMIT 5;",
        sparksql: "SELECT *\nFROM orders\nORDER BY amount DESC\nLIMIT 5",
        pandas: "df.nlargest(5, 'amount')",
        spark: "df.orderBy(F.col('amount').desc()).limit(5)",
        python: "sorted(rows, key=lambda r: r['amount'], reverse=True)[:5]"
      }
    },
    {
      id: "distinct", group: "Shaping", task: "Distinct values",
      note: "Unique regions.",
      code: {
        sql: "SELECT DISTINCT region\nFROM orders;",
        sparksql: "SELECT DISTINCT region\nFROM orders",
        pandas: "df['region'].drop_duplicates()",
        spark: "df.select('region').distinct()",
        python: "set(r['region'] for r in rows)"
      }
    },
    // -------------------------------------------------- Aggregation
    {
      id: "groupby-sum", group: "Aggregation", task: "Group by + aggregate",
      note: "Total amount per region.",
      code: {
        sql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region",
        pandas: "df.groupby('region')['amount'].sum()",
        spark: "df.groupBy('region').agg(\n  F.sum('amount').alias('total'))"
      }
    },
    {
      id: "count-per-group", group: "Aggregation", task: "Count rows per group",
      note: "How many orders per region.",
      code: {
        sql: "SELECT region, COUNT(*) AS n\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region, COUNT(*) AS n\nFROM orders\nGROUP BY region",
        pandas: "df.groupby('region').size()",
        spark: "df.groupBy('region').count()"
      }
    },
    {
      id: "having", group: "Aggregation", task: "Filter groups (HAVING)",
      note: "Only regions whose total exceeds 1000.",
      code: {
        sql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region\nHAVING SUM(amount) > 1000;",
        sparksql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region\nHAVING SUM(amount) > 1000",
        pandas: "g = df.groupby('region')['amount'].sum()\ng[g > 1000]",
        spark: "(df.groupBy('region')\n   .agg(F.sum('amount').alias('total'))\n   .filter(F.col('total') > 1000))"
      }
    },
    {
      id: "distinct-count", group: "Aggregation", task: "Count distinct",
      note: "Number of unique customers.",
      code: {
        sql: "SELECT COUNT(DISTINCT customer) AS n\nFROM orders;",
        sparksql: "SELECT COUNT(DISTINCT customer) AS n\nFROM orders",
        pandas: "df['customer'].nunique()",
        spark: "df.select(F.countDistinct('customer')).show()"
      }
    },
    {
      id: "multi-agg", group: "Aggregation", task: "Multiple aggregates at once",
      note: "Count, sum and average of amount per region in one pass.",
      code: {
        sql: "SELECT region,\n  COUNT(*)      AS n,\n  SUM(amount)   AS total,\n  AVG(amount)   AS avg_amt\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region,\n  COUNT(*)      AS n,\n  SUM(amount)   AS total,\n  AVG(amount)   AS avg_amt\nFROM orders\nGROUP BY region",
        pandas: "df.groupby('region').agg(\n    n=('amount', 'size'),\n    total=('amount', 'sum'),\n    avg_amt=('amount', 'mean'))",
        spark: "df.groupBy('region').agg(\n    F.count('*').alias('n'),\n    F.sum('amount').alias('total'),\n    F.avg('amount').alias('avg_amt'))"
      }
    },
    {
      id: "conditional-agg", group: "Aggregation", task: "Conditional aggregation (SUM CASE / FILTER)",
      note: "Total US amount per region. ANSI/Spark also allow FILTER (WHERE ...); Spark SQL supports it too. pandas masks before summing.",
      code: {
        sql: "SELECT region,\n  SUM(CASE WHEN region = 'US' THEN amount ELSE 0 END) AS us_total,\n  SUM(amount) FILTER (WHERE region = 'US')            AS us_total2\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region,\n  SUM(CASE WHEN region = 'US' THEN amount ELSE 0 END) AS us_total,\n  SUM(amount) FILTER (WHERE region = 'US')            AS us_total2\nFROM orders\nGROUP BY region",
        pandas: "df.assign(us_amt=df['amount'].where(df['region'] == 'US', 0)) \\\n  .groupby('region')['us_amt'].sum()",
        spark: "df.groupBy('region').agg(\n    F.sum(F.when(F.col('region') == 'US', F.col('amount'))\n           .otherwise(0)).alias('us_total'))"
      }
    },
    {
      id: "median-pct", group: "Aggregation", task: "Median / percentile",
      note: "Median amount per region. Spark SQL: PERCENTILE_APPROX (or exact PERCENTILE); pandas: .median(); Spark DF: F.percentile_approx.",
      code: {
        sql: "SELECT region,\n  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median_amt\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region,\n  PERCENTILE_APPROX(amount, 0.5)     AS median_amt,\n  PERCENTILE_APPROX(amount, 0.95)    AS p95\nFROM orders\nGROUP BY region",
        pandas: "df.groupby('region')['amount'].median()",
        spark: "df.groupBy('region').agg(\n    F.percentile_approx('amount', 0.5).alias('median_amt'))"
      }
    },
    {
      id: "first-last", group: "Aggregation", task: "First / last value per group",
      note: "Amount of the earliest and latest order per region. Spark SQL FIRST/LAST take an ordering via a subquery or window; simplest is MIN/MAX of a struct.",
      code: {
        sql: "SELECT region,\n  (ARRAY_AGG(amount ORDER BY ts))[1]                     AS first_amt,\n  (ARRAY_AGG(amount ORDER BY ts DESC))[1]                AS last_amt\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region,\n  MIN_BY(amount, ts) AS first_amt,\n  MAX_BY(amount, ts) AS last_amt\nFROM orders\nGROUP BY region",
        pandas: "s = df.sort_values('ts').groupby('region')['amount']\ns.first().to_frame('first_amt').assign(last_amt=s.last())",
        spark: "df.groupBy('region').agg(\n    F.min_by('amount', 'ts').alias('first_amt'),\n    F.max_by('amount', 'ts').alias('last_amt'))"
      }
    },
    // -------------------------------------------------- Joins
    {
      id: "inner-join", group: "Joins", task: "Inner join two tables",
      note: "Match orders to customers on the customer key.",
      code: {
        sql: "SELECT *\nFROM orders o\nJOIN customers c ON o.customer = c.id;",
        sparksql: "SELECT *\nFROM orders o\nJOIN customers c ON o.customer = c.id",
        pandas: "orders.merge(customers, left_on='customer', right_on='id')",
        spark: "orders.join(customers,\n  orders.customer == customers.id, 'inner')"
      }
    },
    {
      id: "left-join", group: "Joins", task: "Left join (keep all left rows)",
      note: "All orders, customer info where it matches.",
      code: {
        sql: "SELECT *\nFROM orders o\nLEFT JOIN customers c ON o.customer = c.id;",
        sparksql: "SELECT *\nFROM orders o\nLEFT JOIN customers c ON o.customer = c.id",
        pandas: "orders.merge(customers, left_on='customer', right_on='id', how='left')",
        spark: "orders.join(customers,\n  orders.customer == customers.id, 'left')"
      }
    },
    {
      id: "full-join", group: "Joins", task: "Full outer join",
      note: "Keep unmatched rows from both sides.",
      code: {
        sql: "SELECT *\nFROM orders o\nFULL OUTER JOIN customers c ON o.customer = c.id;",
        sparksql: "SELECT *\nFROM orders o\nFULL OUTER JOIN customers c ON o.customer = c.id",
        pandas: "orders.merge(customers, left_on='customer', right_on='id', how='outer')",
        spark: "orders.join(customers,\n  orders.customer == customers.id, 'outer')"
      }
    },
    {
      id: "anti-join", group: "Joins", task: "Anti-join (rows with no match)",
      note: "Orders whose customer is not in customers. Spark has a native 'left_anti'; SQL uses NOT EXISTS; pandas uses indicator + filter.",
      code: {
        sql: "SELECT o.*\nFROM orders o\nWHERE NOT EXISTS (\n  SELECT 1 FROM customers c WHERE c.id = o.customer);",
        sparksql: "SELECT o.*\nFROM orders o\nLEFT ANTI JOIN customers c ON o.customer = c.id",
        pandas: "m = orders.merge(customers, left_on='customer', right_on='id',\n                 how='left', indicator=True)\nm[m['_merge'] == 'left_only']",
        spark: "orders.join(customers,\n  orders.customer == customers.id, 'left_anti')"
      }
    },
    {
      id: "semi-join", group: "Joins", task: "Semi-join (rows that have a match)",
      note: "Orders whose customer exists, without pulling customer columns. Spark 'left_semi'; SQL EXISTS / IN.",
      code: {
        sql: "SELECT o.*\nFROM orders o\nWHERE EXISTS (\n  SELECT 1 FROM customers c WHERE c.id = o.customer);",
        sparksql: "SELECT o.*\nFROM orders o\nLEFT SEMI JOIN customers c ON o.customer = c.id",
        pandas: "orders[orders['customer'].isin(customers['id'])]",
        spark: "orders.join(customers,\n  orders.customer == customers.id, 'left_semi')"
      }
    },
    {
      id: "broadcast-join", group: "Joins", task: "Broadcast (map-side) join",
      note: "Force the small table to be broadcast. Spark SQL uses a BROADCAST(t) join hint; DF API uses F.broadcast(). No pandas/SQL analog (planner decides).",
      code: {
        sql: "-- ANSI SQL has no broadcast hint; the optimizer decides.\nSELECT *\nFROM orders o\nJOIN customers c ON o.customer = c.id;",
        sparksql: "SELECT /*+ BROADCAST(c) */ *\nFROM orders o\nJOIN customers c ON o.customer = c.id",
        pandas: "# pandas always builds the join in memory\norders.merge(customers, left_on='customer', right_on='id')",
        spark: "orders.join(F.broadcast(customers),\n  orders.customer == customers.id, 'inner')"
      }
    },
    {
      id: "self-join", group: "Joins", task: "Self-join",
      note: "Pair each order with other orders from the same customer.",
      code: {
        sql: "SELECT a.id, b.id\nFROM orders a\nJOIN orders b\n  ON a.customer = b.customer AND a.id < b.id;",
        sparksql: "SELECT a.id, b.id\nFROM orders a\nJOIN orders b\n  ON a.customer = b.customer AND a.id < b.id",
        pandas: "a = df.rename(columns={'id': 'id_a'})\nb = df.rename(columns={'id': 'id_b'})\na.merge(b, on='customer').query('id_a < id_b')",
        spark: "a = df.alias('a')\nb = df.alias('b')\na.join(b, (F.col('a.customer') == F.col('b.customer')) &\n           (F.col('a.id') < F.col('b.id')))"
      }
    },
    {
      id: "cross-join", group: "Joins", task: "Cross join (cartesian)",
      note: "Every order paired with every region row.",
      code: {
        sql: "SELECT *\nFROM orders\nCROSS JOIN regions;",
        sparksql: "SELECT *\nFROM orders\nCROSS JOIN regions",
        pandas: "orders.merge(regions, how='cross')",
        spark: "orders.crossJoin(regions)"
      }
    },
    // -------------------------------------------------- Windows
    {
      id: "row-number", group: "Windows", task: "Rank within a group (row_number)",
      note: "Number rows per region, biggest amount first.",
      code: {
        sql: "SELECT *,\n  ROW_NUMBER() OVER (\n    PARTITION BY region ORDER BY amount DESC) AS rn\nFROM orders;",
        sparksql: "SELECT *,\n  ROW_NUMBER() OVER (\n    PARTITION BY region ORDER BY amount DESC) AS rn\nFROM orders",
        pandas: "df['rn'] = (df.sort_values('amount', ascending=False)\n          .groupby('region').cumcount() + 1)",
        spark: "w = Window.partitionBy('region').orderBy(F.col('amount').desc())\ndf.withColumn('rn', F.row_number().over(w))"
      }
    },
    {
      id: "rank-dense", group: "Windows", task: "rank vs dense_rank",
      note: "RANK leaves gaps after ties, DENSE_RANK does not. pandas: method='min' vs 'dense'.",
      code: {
        sql: "SELECT *,\n  RANK()       OVER (PARTITION BY region ORDER BY amount DESC) AS rnk,\n  DENSE_RANK() OVER (PARTITION BY region ORDER BY amount DESC) AS drnk\nFROM orders;",
        sparksql: "SELECT *,\n  RANK()       OVER (PARTITION BY region ORDER BY amount DESC) AS rnk,\n  DENSE_RANK() OVER (PARTITION BY region ORDER BY amount DESC) AS drnk\nFROM orders",
        pandas: "g = df.groupby('region')['amount']\ndf['rnk']  = g.rank(method='min', ascending=False)\ndf['drnk'] = g.rank(method='dense', ascending=False)",
        spark: "w = Window.partitionBy('region').orderBy(F.col('amount').desc())\ndf.withColumn('rnk', F.rank().over(w)) \\\n  .withColumn('drnk', F.dense_rank().over(w))"
      }
    },
    {
      id: "running-total", group: "Windows", task: "Running total",
      note: "Cumulative amount per region over time.",
      code: {
        sql: "SELECT *,\n  SUM(amount) OVER (\n    PARTITION BY region ORDER BY ts) AS run_total\nFROM orders;",
        sparksql: "SELECT *,\n  SUM(amount) OVER (\n    PARTITION BY region ORDER BY ts) AS run_total\nFROM orders",
        pandas: "df['run_total'] = (df.sort_values('ts')\n          .groupby('region')['amount'].cumsum())",
        spark: "w = Window.partitionBy('region').orderBy('ts')\ndf.withColumn('run_total', F.sum('amount').over(w))"
      }
    },
    {
      id: "moving-avg", group: "Windows", task: "Moving average (ROWS BETWEEN)",
      note: "3-row trailing average per region. The frame ROWS BETWEEN 2 PRECEDING AND CURRENT ROW is explicit; pandas uses rolling(3).",
      code: {
        sql: "SELECT *,\n  AVG(amount) OVER (\n    PARTITION BY region ORDER BY ts\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3\nFROM orders;",
        sparksql: "SELECT *,\n  AVG(amount) OVER (\n    PARTITION BY region ORDER BY ts\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3\nFROM orders",
        pandas: "df['ma3'] = (df.sort_values('ts')\n          .groupby('region')['amount']\n          .transform(lambda s: s.rolling(3, min_periods=1).mean()))",
        spark: "w = (Window.partitionBy('region').orderBy('ts')\n     .rowsBetween(-2, 0))\ndf.withColumn('ma3', F.avg('amount').over(w))"
      }
    },
    {
      id: "lag-lead", group: "Windows", task: "Previous / next row (lag / lead)",
      note: "Prior order's amount per region. pandas: groupby().shift().",
      code: {
        sql: "SELECT *,\n  LAG(amount)  OVER (PARTITION BY region ORDER BY ts) AS prev_amt,\n  LEAD(amount) OVER (PARTITION BY region ORDER BY ts) AS next_amt\nFROM orders;",
        sparksql: "SELECT *,\n  LAG(amount)  OVER (PARTITION BY region ORDER BY ts) AS prev_amt,\n  LEAD(amount) OVER (PARTITION BY region ORDER BY ts) AS next_amt\nFROM orders",
        pandas: "g = df.sort_values('ts').groupby('region')['amount']\ndf['prev_amt'] = g.shift(1)\ndf['next_amt'] = g.shift(-1)",
        spark: "w = Window.partitionBy('region').orderBy('ts')\ndf.withColumn('prev_amt', F.lag('amount').over(w)) \\\n  .withColumn('next_amt', F.lead('amount').over(w))"
      }
    },
    {
      id: "ntile", group: "Windows", task: "Quartiles / buckets (ntile)",
      note: "Split each region's orders into 4 amount buckets. pandas: qcut.",
      code: {
        sql: "SELECT *,\n  NTILE(4) OVER (PARTITION BY region ORDER BY amount) AS quartile\nFROM orders;",
        sparksql: "SELECT *,\n  NTILE(4) OVER (PARTITION BY region ORDER BY amount) AS quartile\nFROM orders",
        pandas: "df['quartile'] = (df.groupby('region')['amount']\n          .transform(lambda s: pd.qcut(s, 4, labels=False) + 1))",
        spark: "w = Window.partitionBy('region').orderBy('amount')\ndf.withColumn('quartile', F.ntile(4).over(w))"
      }
    },
    {
      id: "top-n-per-group", group: "Windows", task: "Top-N per group",
      note: "Top 3 orders by amount within each region. Spark SQL has NO QUALIFY, so wrap the window in a subquery and filter. pandas: groupby head after sort.",
      code: {
        sql: "-- some engines support QUALIFY:\nSELECT *\nFROM orders\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY region ORDER BY amount DESC) <= 3;",
        sparksql: "SELECT *\nFROM (\n  SELECT *,\n    ROW_NUMBER() OVER (\n      PARTITION BY region ORDER BY amount DESC) AS rn\n  FROM orders) t\nWHERE rn <= 3",
        pandas: "(df.sort_values('amount', ascending=False)\n   .groupby('region').head(3))",
        spark: "w = Window.partitionBy('region').orderBy(F.col('amount').desc())\n(df.withColumn('rn', F.row_number().over(w))\n   .filter(F.col('rn') <= 3))"
      }
    },
    // -------------------------------------------------- Columns
    {
      id: "add-col", group: "Columns", task: "Add a computed column",
      note: "fee = 10% of amount.",
      code: {
        sql: "SELECT *, amount * 0.1 AS fee\nFROM orders;",
        sparksql: "SELECT *, amount * 0.1 AS fee\nFROM orders",
        pandas: "df.assign(fee=df['amount'] * 0.1)",
        spark: "df.withColumn('fee', F.col('amount') * 0.1)"
      }
    },
    {
      id: "case-when", group: "Columns", task: "Conditional column (CASE WHEN)",
      note: "Label each order big/small.",
      code: {
        sql: "SELECT *,\n  CASE WHEN amount > 100 THEN 'big'\n       ELSE 'small' END AS size\nFROM orders;",
        sparksql: "SELECT *,\n  CASE WHEN amount > 100 THEN 'big'\n       ELSE 'small' END AS size\nFROM orders",
        pandas: "import numpy as np\ndf['size'] = np.where(df['amount'] > 100, 'big', 'small')",
        spark: "df.withColumn('size',\n  F.when(F.col('amount') > 100, 'big').otherwise('small'))"
      }
    },
    {
      id: "rename", group: "Columns", task: "Rename a column",
      note: "amount → total.",
      code: {
        sql: "SELECT amount AS total\nFROM orders;",
        sparksql: "SELECT amount AS total\nFROM orders",
        pandas: "df.rename(columns={'amount': 'total'})",
        spark: "df.withColumnRenamed('amount', 'total')"
      }
    },
    {
      id: "round", group: "Columns", task: "Round a number",
      note: "Round amount to 2 decimals.",
      code: {
        sql: "SELECT ROUND(amount, 2) AS amount\nFROM orders;",
        sparksql: "SELECT ROUND(amount, 2) AS amount\nFROM orders",
        pandas: "df['amount'].round(2)",
        spark: "df.withColumn('amount', F.round('amount', 2))"
      }
    },
    // -------------------------------------------------- Nulls & Types
    {
      id: "fillna", group: "Nulls & Types", task: "Replace nulls",
      note: "Missing amount → 0.",
      code: {
        sql: "SELECT COALESCE(amount, 0) AS amount\nFROM orders;",
        sparksql: "SELECT COALESCE(amount, 0) AS amount\nFROM orders",
        pandas: "df['amount'].fillna(0)",
        spark: "df.fillna({'amount': 0})"
      }
    },
    {
      id: "coalesce-multi", group: "Nulls & Types", task: "First non-null (coalesce)",
      note: "Use region, else 'unknown'. COALESCE returns the first non-null argument.",
      code: {
        sql: "SELECT COALESCE(region, 'unknown') AS region\nFROM orders;",
        sparksql: "SELECT COALESCE(region, 'unknown') AS region\nFROM orders",
        pandas: "df['region'].fillna('unknown')",
        spark: "df.withColumn('region',\n  F.coalesce('region', F.lit('unknown')))"
      }
    },
    {
      id: "drop-nulls", group: "Nulls & Types", task: "Drop rows with nulls",
      note: "Remove rows where amount is null.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE amount IS NOT NULL;",
        sparksql: "SELECT *\nFROM orders\nWHERE amount IS NOT NULL",
        pandas: "df.dropna(subset=['amount'])",
        spark: "df.dropna(subset=['amount'])",
        python: "[r for r in rows if r['amount'] is not None]"
      }
    },
    {
      id: "cast-type", group: "Nulls & Types", task: "Cast / change type",
      note: "amount as an integer. Spark SQL CAST(... AS INT); pandas astype; Spark .cast().",
      code: {
        sql: "SELECT CAST(amount AS INTEGER) AS amount_int\nFROM orders;",
        sparksql: "SELECT CAST(amount AS INT) AS amount_int\nFROM orders",
        pandas: "df['amount'].astype('int64')",
        spark: "df.withColumn('amount_int',\n  F.col('amount').cast('int'))"
      }
    },
    // -------------------------------------------------- Text & Dates
    {
      id: "str-contains", group: "Text & Dates", task: "String contains / LIKE",
      note: "customer contains 'acme'.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE customer LIKE '%acme%';",
        sparksql: "SELECT *\nFROM orders\nWHERE customer LIKE '%acme%'",
        pandas: "df[df['customer'].str.contains('acme', na=False)]",
        spark: "df.filter(F.col('customer').contains('acme'))"
      }
    },
    {
      id: "str-ops", group: "Text & Dates", task: "String transforms (upper/trim/substr)",
      note: "Uppercase + trim customer, first 3 chars. Spark SQL: upper/trim/substr.",
      code: {
        sql: "SELECT UPPER(TRIM(customer))    AS cust,\n       SUBSTRING(customer, 1, 3) AS prefix\nFROM orders;",
        sparksql: "SELECT UPPER(TRIM(customer)) AS cust,\n       SUBSTR(customer, 1, 3) AS prefix\nFROM orders",
        pandas: "df.assign(\n    cust=df['customer'].str.strip().str.upper(),\n    prefix=df['customer'].str[:3])",
        spark: "df.withColumn('cust', F.upper(F.trim('customer'))) \\\n  .withColumn('prefix', F.substring('customer', 1, 3))"
      }
    },
    {
      id: "concat", group: "Text & Dates", task: "Concatenate strings",
      note: "customer + ' (' + region + ')'. Spark SQL: concat() or ||.",
      code: {
        sql: "SELECT customer || ' (' || region || ')' AS label\nFROM orders;",
        sparksql: "SELECT CONCAT(customer, ' (', region, ')') AS label\nFROM orders",
        pandas: "df['customer'] + ' (' + df['region'] + ')'",
        spark: "df.withColumn('label',\n  F.concat_ws('', F.col('customer'), F.lit(' ('),\n              F.col('region'), F.lit(')')))"
      }
    },
    {
      id: "regexp-replace", group: "Text & Dates", task: "Regex replace",
      note: "Strip non-digits from customer. Spark SQL: regexp_replace.",
      code: {
        sql: "SELECT REGEXP_REPLACE(customer, '[^0-9]', '') AS digits\nFROM orders;",
        sparksql: "SELECT REGEXP_REPLACE(customer, '[^0-9]', '') AS digits\nFROM orders",
        pandas: "df['customer'].str.replace(r'[^0-9]', '', regex=True)",
        spark: "df.withColumn('digits',\n  F.regexp_replace('customer', '[^0-9]', ''))"
      }
    },
    {
      id: "date-part", group: "Text & Dates", task: "Extract a date part",
      note: "Year from the timestamp.",
      code: {
        sql: "SELECT EXTRACT(YEAR FROM ts) AS yr\nFROM orders;  -- or YEAR(ts)",
        sparksql: "SELECT YEAR(ts) AS yr,\n       MONTH(ts) AS mo\nFROM orders",
        pandas: "df['ts'].dt.year",
        spark: "df.withColumn('yr', F.year('ts'))"
      }
    },
    {
      id: "date-trunc-month", group: "Text & Dates", task: "Bucket dates by month",
      note: "Truncate ts to the first of the month. Spark SQL: date_trunc('month', ts) or trunc(ts,'MM').",
      code: {
        sql: "SELECT DATE_TRUNC('month', ts) AS month\nFROM orders;",
        sparksql: "SELECT DATE_TRUNC('month', ts) AS month,\n       DATE_FORMAT(ts, 'yyyy-MM') AS ym\nFROM orders",
        pandas: "df['ts'].dt.to_period('M').dt.to_timestamp()",
        spark: "df.withColumn('month', F.date_trunc('month', 'ts'))"
      }
    },
    {
      id: "date-diff", group: "Text & Dates", task: "Days between dates",
      note: "Days from ts to today. Spark SQL: datediff(end, start); pandas subtracts datetimes.",
      code: {
        sql: "SELECT CURRENT_DATE - CAST(ts AS DATE) AS days_ago\nFROM orders;",
        sparksql: "SELECT DATEDIFF(CURRENT_DATE, CAST(ts AS DATE)) AS days_ago\nFROM orders",
        pandas: "(pd.Timestamp('today').normalize() -\n df['ts'].dt.normalize()).dt.days",
        spark: "df.withColumn('days_ago',\n  F.datediff(F.current_date(), F.to_date('ts')))"
      }
    },
    {
      id: "date-add", group: "Text & Dates", task: "Add days to a date",
      note: "ts plus 7 days. Spark SQL: date_add(ts, 7); pandas: + Timedelta.",
      code: {
        sql: "SELECT ts + INTERVAL '7' DAY AS due\nFROM orders;",
        sparksql: "SELECT DATE_ADD(ts, 7) AS due\nFROM orders",
        pandas: "df['ts'] + pd.Timedelta(days=7)",
        spark: "df.withColumn('due', F.date_add('ts', 7))"
      }
    },
    {
      id: "parse-date", group: "Text & Dates", task: "Parse a string to date",
      note: "Turn a 'yyyy-MM-dd' string into a date. Spark SQL: to_date(str, fmt); pandas: to_datetime.",
      code: {
        sql: "SELECT CAST(order_date AS DATE) AS d\nFROM orders;",
        sparksql: "SELECT TO_DATE(order_date, 'yyyy-MM-dd') AS d\nFROM orders",
        pandas: "pd.to_datetime(df['order_date'], format='%Y-%m-%d')",
        spark: "df.withColumn('d',\n  F.to_date('order_date', 'yyyy-MM-dd'))"
      }
    },
    {
      id: "union", group: "Text & Dates", task: "Stack two tables (UNION)",
      note: "Append rows of b onto a (same columns).",
      code: {
        sql: "SELECT * FROM a\nUNION ALL\nSELECT * FROM b;",
        sparksql: "SELECT * FROM a\nUNION ALL\nSELECT * FROM b",
        pandas: "pd.concat([a, b], ignore_index=True)",
        spark: "a.unionByName(b)"
      }
    },
    // -------------------------------------------------- Reshape
    {
      id: "pivot", group: "Reshape", task: "Pivot (long → wide)",
      note: "Sum of amount per customer, one column per region. Spark SQL: PIVOT clause; DF: groupBy().pivot().",
      code: {
        sql: "SELECT customer,\n  SUM(CASE WHEN region = 'US' THEN amount END) AS US,\n  SUM(CASE WHEN region = 'EU' THEN amount END) AS EU\nFROM orders\nGROUP BY customer;",
        sparksql: "SELECT * FROM orders\nPIVOT (\n  SUM(amount) FOR region IN ('US', 'EU'))",
        pandas: "df.pivot_table(index='customer', columns='region',\n               values='amount', aggfunc='sum')",
        spark: "(df.groupBy('customer').pivot('region', ['US', 'EU'])\n   .agg(F.sum('amount')))"
      }
    },
    {
      id: "unpivot", group: "Reshape", task: "Unpivot / melt (wide → long)",
      note: "Turn US and EU columns back into region/amount rows. Spark SQL: STACK in a LATERAL/SELECT; pandas: melt.",
      code: {
        sql: "SELECT customer, 'US' AS region, us AS amount FROM wide\nUNION ALL\nSELECT customer, 'EU' AS region, eu AS amount FROM wide;",
        sparksql: "SELECT customer, region, amount\nFROM wide\nLATERAL VIEW STACK(2, 'US', us, 'EU', eu) t AS region, amount",
        pandas: "wide.melt(id_vars='customer',\n          value_vars=['US', 'EU'],\n          var_name='region', value_name='amount')",
        spark: "wide.selectExpr('customer',\n  \"stack(2, 'US', US, 'EU', EU) as (region, amount)\")"
      }
    },
    {
      id: "explode", group: "Reshape", task: "Explode an array into rows",
      note: "One row per tag in an array column `tags`. Spark SQL: LATERAL VIEW explode; DF: F.explode; pandas: explode().",
      code: {
        sql: "-- ANSI has no array explode; engine-specific.\n-- Postgres: SELECT id, UNNEST(tags) AS tag FROM orders;",
        sparksql: "SELECT id, tag\nFROM orders\nLATERAL VIEW EXPLODE(tags) t AS tag",
        pandas: "df.explode('tags').rename(columns={'tags': 'tag'})",
        spark: "df.select('id', F.explode('tags').alias('tag'))"
      }
    },
    {
      id: "collect-list", group: "Reshape", task: "Aggregate rows into an array",
      note: "All amounts per region as an array. Spark SQL: collect_list / array_agg; pandas: groupby().agg(list).",
      code: {
        sql: "SELECT region, ARRAY_AGG(amount) AS amounts\nFROM orders\nGROUP BY region;",
        sparksql: "SELECT region, COLLECT_LIST(amount) AS amounts\nFROM orders\nGROUP BY region",
        pandas: "df.groupby('region')['amount'].agg(list)",
        spark: "df.groupBy('region').agg(\n    F.collect_list('amount').alias('amounts'))"
      }
    },
    // -------------------------------------------------- Ranking & Dedup
    {
      id: "dedup-distinct", group: "Ranking & Dedup", task: "Drop duplicate rows",
      note: "Remove exact duplicate rows.",
      code: {
        sql: "SELECT DISTINCT *\nFROM orders;",
        sparksql: "SELECT DISTINCT *\nFROM orders",
        pandas: "df.drop_duplicates()",
        spark: "df.dropDuplicates()"
      }
    },
    {
      id: "latest-per-key", group: "Ranking & Dedup", task: "Latest row per key",
      note: "Keep the most recent order per customer. Classic ROW_NUMBER() = 1 pattern; Spark SQL needs a subquery (no QUALIFY). pandas: sort then drop_duplicates(keep='last').",
      code: {
        sql: "SELECT *\nFROM (\n  SELECT *,\n    ROW_NUMBER() OVER (\n      PARTITION BY customer ORDER BY ts DESC) AS rn\n  FROM orders) t\nWHERE rn = 1;",
        sparksql: "SELECT *\nFROM (\n  SELECT *,\n    ROW_NUMBER() OVER (\n      PARTITION BY customer ORDER BY ts DESC) AS rn\n  FROM orders) t\nWHERE rn = 1",
        pandas: "(df.sort_values('ts')\n   .drop_duplicates('customer', keep='last'))",
        spark: "w = Window.partitionBy('customer').orderBy(F.col('ts').desc())\n(df.withColumn('rn', F.row_number().over(w))\n   .filter(F.col('rn') == 1).drop('rn'))"
      }
    }
  ]
};
