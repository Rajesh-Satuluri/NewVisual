/* PyRef — PySpark Data */
window.PYREF_PYSPARK = {
  lang:'pyspark', label:'PySpark',
  groups:[
  {
    label:'DataFrame API',
    cats:[
    {
      key:'spark-create', label:'SparkSession & Creation',
      fns:[
      {
        id:'spark-session', name:'SparkSession', purpose:'Entry point to PySpark — create DataFrames, run SQL',
        badge:['pyspark'], snippet:'from pyspark.sql import SparkSession\nspark = SparkSession.builder.getOrCreate()',
        sig:'SparkSession.builder.appName(name).config(key,val).getOrCreate()',
        meta:{ ret:'SparkSession', mut:false, time:'O(1)', space:'O(1)' },
        params:[],
        code:
`from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder \\
    .appName("MyJob") \\
    .config("spark.sql.shuffle.partitions", "200") \\
    .getOrCreate()

# Read data
df = spark.read.csv("orders.csv", header=True, inferSchema=True)
df = spark.read.parquet("s3://bucket/orders/")
df = spark.read.table("my_catalog.schema.orders")

# Basic info
df.printSchema()           # column names + types
df.count()                 # triggers action, returns row count
df.show(5, truncate=False) # display first 5 rows`,
        related:['df.read','df.write','spark.sql()'],
        tags:['pyspark','session','entry point'],
        interview:[
          'SparkSession is a singleton — getOrCreate() returns existing session if one exists',
          'spark.sql.shuffle.partitions defaults to 200 — tune for your cluster and data size',
          'Databricks: spark is pre-configured; no need to create SparkSession',
        ],
        mistakes:['Calling df.count() frequently — it triggers a full scan. Cache first if used multiple times.'],
        notes:['SparkSession replaced SparkContext + SQLContext in Spark 2.0. Both are still accessible as spark.sparkContext.']
      },
      ]
    },
    {
      key:'spark-transform', label:'Transformations',
      fns:[
      {
        id:'spark-select', name:'select() / withColumn()', purpose:'Choose or compute columns in a DataFrame',
        badge:['pyspark'], snippet:'df.select("col1", F.col("col2") * 2)',
        sig:'df.select(*cols)   df.withColumn(name, col_expr)',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(1) — lazy', space:'O(1) plan only' },
        params:[
          { name:'*cols (select)', type:'str | Column', req:true, desc:'Column names or Column expressions to include.' },
          { name:'name (withColumn)', type:'str', req:true, desc:'New or existing column name.' }
        ],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")  # 500M rows

# Select columns
df.select("order_id","customer_id","amount")

# Expressions
df.select(
    F.col("amount"),
    (F.col("amount") * 1.1).alias("amount_with_tax"),
    F.upper("status").alias("status_upper")
)

# Add / replace a column
df.withColumn("year", F.year("order_date")) \\
  .withColumn("amount_usd", F.col("amount") / 100)

# Drop a column
df.drop("internal_id", "debug_flag")`,
        related:['df.filter()','df.groupBy()','F.col()'],
        tags:['pyspark','select','columns','lazy'],
        interview:[
          'All transformations are lazy — Spark builds a DAG; only actions trigger computation',
          'withColumn creates a new DataFrame — chain multiple for multiple columns',
          'For many columns, withColumns() (Spark 3.3+) is more efficient than chained withColumn()',
        ],
        mistakes:['Avoid chaining many withColumn() calls in a loop — use select() with a list of expressions for 10+ columns.'],
        notes:['df.select(F.col("*"), new_col) — F.col("*") expands all columns, then adds new_col.']
      },
      {
        id:'spark-filter', name:'filter() / where()', purpose:'Filter rows based on a condition',
        badge:['pyspark'], snippet:'df.filter(F.col("amount") > 1000)',
        sig:'df.filter(condition)   df.where(condition)   — identical',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(1) — lazy, O(n) at execution', space:'O(1)' },
        params:[{ name:'condition', type:'Column | str', req:true, desc:'Boolean column expression or SQL string.' }],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")

# Column expression
df.filter(F.col("amount") > 1000)
df.filter(F.col("status") == "COMPLETED")

# Multiple conditions
df.filter(
    (F.col("amount") > 100) &
    (F.col("status").isin("COMPLETED","SHIPPED"))
)

# SQL string
df.filter("amount > 100 AND status = 'COMPLETED'")

# Null handling
df.filter(F.col("amount").isNotNull())
df.filter(F.col("customer_id").isNull())

# After filter, count how many passed
df.filter(F.col("amount") > 1000).count()`,
        related:['df.select()','df.groupBy()','df.distinct()'],
        tags:['pyspark','filter','where','SQL'],
        interview:[
          'filter() and where() are identical — alias for SQL familiarity',
          'Avoid using Python operators == and != on columns — use F.col("c") == val',
          'Push filter predicates early in the pipeline — Catalyst optimizer often does this, but explicit is better',
        ],
        mistakes:["df.filter(df.col == None) doesn't work — None != null. Use .isNull()/.isNotNull()."],
        notes:['Spark\'s Catalyst optimizer pushes filters down to data source when using Parquet/Delta — predicate pushdown.']
      },
      {
        id:'spark-groupby', name:'groupBy() / agg()', purpose:'Group rows and apply aggregate functions',
        badge:['pyspark'], snippet:'df.groupBy("dept").agg(F.sum("amount").alias("total"))',
        sig:'df.groupBy(*cols).agg(*exprs)',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(n log n) — shuffle', space:'O(k) — k groups' },
        params:[
          { name:'*cols', type:'str | Column', req:true, desc:'Columns to group by.' },
          { name:'*exprs', type:'Column', req:true, desc:'Aggregate expressions. Can mix functions.' }
        ],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")  # 500M rows, cols: order_id, customer_id, amount, status, date

# Basic aggregation
df.groupBy("status").count()

# Multiple aggregations
df.groupBy("customer_id").agg(
    F.count("*").alias("num_orders"),
    F.sum("amount").alias("total_spend"),
    F.avg("amount").alias("avg_order"),
    F.max("date").alias("last_order_date")
)

# Group by multiple columns
df.groupBy("year", "month") \\
  .agg(F.sum("amount").alias("monthly_revenue")) \\
  .orderBy("year","month")`,
        related:['df.select()','df.window()','df.pivot()'],
        tags:['pyspark','groupBy','aggregation','SQL GROUP BY'],
        interview:[
          'groupBy triggers a shuffle — one of the most expensive Spark operations',
          'Use F.count("*") to count all rows including nulls; F.count("col") excludes nulls',
          'approx_count_distinct() is faster than countDistinct() for large cardinality',
        ],
        mistakes:['Grouping by high-cardinality columns (e.g. user_id) causes data skew if values are uneven.'],
        notes:['AQE (Adaptive Query Execution) can auto-coalesce shuffle partitions in Spark 3.0+.']
      },
      {
        id:'spark-join', name:'join()', purpose:'Joins two DataFrames on a key',
        badge:['pyspark'], snippet:'df1.join(df2, on="customer_id", how="left")',
        sig:'df.join(other, on=None, how="inner")',
        meta:{ ret:'DataFrame (lazy)', mut:false, time:'O(n log n) sort-merge, O(n) broadcast', space:'O(n)' },
        params:[
          { name:'other', type:'DataFrame', req:true, desc:'Right DataFrame.' },
          { name:'on', type:'str | list | Column', req:true, desc:'Join key column(s).' },
          { name:'how', type:'"inner"|"left"|"right"|"outer"|"semi"|"anti"', default:'"inner"', desc:'Join type.' }
        ],
        code:
`orders    = spark.table("orders")    # 500M rows
customers = spark.table("customers") # 2M rows

# Inner join
orders.join(customers, on="customer_id")

# Left join
orders.join(customers, on="customer_id", how="left")

# Broadcast join — broadcast small table to avoid shuffle
from pyspark.sql.functions import broadcast
orders.join(broadcast(customers), on="customer_id")

# Semi join — keep orders that have a matching customer
orders.join(customers, on="customer_id", how="left_semi")

# Anti join — keep orders with NO matching customer
orders.join(customers, on="customer_id", how="left_anti")`,
        related:['F.broadcast()','df.groupBy()','spark.sql()'],
        tags:['pyspark','join','SQL JOIN','broadcast'],
        interview:[
          'Broadcast join: if one table < ~10MB, broadcast it to avoid shuffle. Auto with spark.sql.autoBroadcastJoinThreshold.',
          'Sort-Merge Join (default for large tables): both sides sorted and merged — O(n log n) shuffle',
          'left_semi is like EXISTS in SQL; left_anti is like NOT EXISTS',
          'Skewed joins: use salting technique or Spark 3 AQE skew join handling',
        ],
        mistakes:['Joining on nullable columns: nulls never match (NULL != NULL) — filter them out before joining if needed.'],
        notes:['Check join type in the physical plan: spark.sql("...").explain() shows SortMergeJoin vs BroadcastHashJoin.']
      },
      {
        id:'spark-window', name:'Window Functions', purpose:'Compute values over a sliding window of rows (rank, lag, running totals)',
        badge:['pyspark'], snippet:'from pyspark.sql.window import Window\nw = Window.partitionBy("dept").orderBy("salary")',
        sig:'Window.partitionBy(*cols).orderBy(*cols).rowsBetween(...)',
        meta:{ ret:'Column expression', mut:false, time:'O(n log n) — sort within partition', space:'O(partition size)' },
        params:[],
        code:
`from pyspark.sql import functions as F
from pyspark.sql.window import Window

df = spark.table("orders")

# Rank within each customer
w = Window.partitionBy("customer_id").orderBy(F.desc("amount"))
df.withColumn("rank", F.rank().over(w)) \\
  .withColumn("dense_rank", F.dense_rank().over(w))

# Running total
w_running = Window.partitionBy("customer_id") \\
                  .orderBy("order_date") \\
                  .rowsBetween(Window.unboundedPreceding, Window.currentRow)
df.withColumn("cumulative_spend", F.sum("amount").over(w_running))

# Lag / Lead (previous / next row's value)
w_order = Window.partitionBy("customer_id").orderBy("order_date")
df.withColumn("prev_amount", F.lag("amount", 1).over(w_order)) \\
  .withColumn("next_amount", F.lead("amount", 1).over(w_order))`,
        related:['df.groupBy()','F.rank()','F.lag()','F.lead()'],
        tags:['pyspark','window functions','rank','lag','running total'],
        interview:[
          'rank() has gaps for ties (1,1,3); dense_rank() has no gaps (1,1,2); row_number() always unique',
          'rowsBetween vs rangeBetween: rows uses physical row offsets; range uses value ranges',
          'Partitioning is critical — windowBy without partitionBy operates on the entire dataset (one partition)',
        ],
        mistakes:['Window functions without partitionBy cause a single shuffle partition — OOM for large data.'],
        notes:['Window functions in Spark correspond directly to SQL OVER (PARTITION BY ... ORDER BY ...) clauses.']
      },
      ]
    },
    {
      key:'spark-advanced', label:'Advanced Transformations',
      fns:[
      {
        id:'spark-when', name:'F.when() / F.otherwise()', purpose:'Conditional column values — vectorized CASE WHEN in PySpark',
        badge:['pyspark'], snippet:'F.when(condition, value).when(...).otherwise(default)',
        sig:'F.when(condition, value).when(c2, v2).otherwise(default)',
        meta:{ ret:'Column expression', mut:false, time:'O(1) — lazy', space:'O(1)' },
        params:[
          { name:'condition', type:'Column (bool)', req:true, desc:'Boolean column expression.' },
          { name:'value', type:'Column | scalar', req:true, desc:'Value to use when condition is True.' }
        ],
        code:
`from pyspark.sql import functions as F

df = spark.table("orders")

# Simple conditional column
df.withColumn("size_label",
    F.when(F.col("amount") < 100, "small")
     .when(F.col("amount") < 1000, "medium")
     .otherwise("large")
)

# Null-safe conditional
df.withColumn("status_clean",
    F.when(F.col("status").isNull(), "UNKNOWN")
     .otherwise(F.col("status"))
)

# Equivalent SQL: CASE WHEN amount < 100 THEN 'small' ...

# Conditional aggregation
df.agg(
    F.sum(
        F.when(F.col("status") == "COMPLETED", F.col("amount"))
         .otherwise(0)
    ).alias("completed_revenue")
)

# F.coalesce: first non-null value
F.coalesce(F.col("amount"), F.lit(0))`,
        related:['F.col()','df.withColumn()','F.coalesce()'],
        tags:['pyspark','conditional','case when','coalesce'],
        interview:[
          'F.when is Spark\'s CASE WHEN — chain .when() for elif branches, always end with .otherwise()',
          'F.coalesce(col1, col2, ...) returns first non-null — null-handling without when',
          'F.nullif(col, value) returns null if col equals value — inverse of coalesce',
        ],
        mistakes:['Omitting .otherwise() — unmatched rows become null, which is often unexpected.'],
        notes:['F.when chains are lazy — they build a Column expression; data moves only when an action runs.']
      },
      {
        id:'spark-udf', name:'UDFs / pandas_udf', purpose:'Apply custom Python functions to Spark columns',
        badge:['pyspark'], snippet:'@udf(returnType=StringType())\ndef my_fn(col): ...',
        sig:'@udf(returnType)   @pandas_udf(returnType)',
        meta:{ ret:'Column expression', mut:false, time:'O(n) — slow row-UDF, faster pandas_udf', space:'O(batch)' },
        params:[
          { name:'returnType', type:'DataType', req:true, desc:'Spark return type: StringType(), IntegerType(), ArrayType(StringType()), etc.' }
        ],
        code:
`from pyspark.sql.types import StringType, DoubleType
from pyspark.sql.functions import udf, pandas_udf
import pandas as pd

# Row-level UDF — slow: serializes every row Python↔JVM
@udf(returnType=StringType())
def extract_domain(email):
    if email is None: return None
    return email.split("@")[-1]

df.withColumn("domain", extract_domain("email"))

# pandas UDF (vectorized) — fast: whole batches as pd.Series
@pandas_udf(DoubleType())
def normalize(col: pd.Series) -> pd.Series:
    return (col - col.mean()) / col.std()

df.withColumn("norm_amount", normalize("amount"))

# Register for SQL
spark.udf.register("extract_domain", extract_domain)
spark.sql("SELECT extract_domain(email) FROM users")`,
        related:['F.when()','F.expr()','df.withColumn()'],
        tags:['pyspark','UDF','pandas_udf','custom functions'],
        interview:[
          'Row UDF: data serialized Python↔JVM per row — 10–100x slower than built-in functions',
          'pandas_udf: operates on batches as pandas Series — vectorized, much faster',
          'Always prefer built-in F.* functions over UDFs — check the docs before writing a UDF',
          'UDF return type must match the declared returnType — mismatches cause runtime errors',
        ],
        mistakes:['Using a row-level UDF for something a built-in Spark function can do — always check F.* first.'],
        notes:['mapInPandas / mapInArrow for complex transformations requiring schema flexibility.']
      },
      {
        id:'spark-perf', name:'cache() / persist() / repartition()', purpose:'Control memory, persistence, and partition count for performance tuning',
        badge:['pyspark'], snippet:'df.cache()   df.persist(StorageLevel.MEMORY_AND_DISK)',
        sig:'df.cache()   df.persist(storageLevel)   df.repartition(n)   df.coalesce(n)',
        meta:{ ret:'DataFrame', mut:false, time:'O(n) on first action after cache', space:'O(n) in memory' },
        params:[
          { name:'storageLevel', type:'StorageLevel', default:'MEMORY_AND_DISK', desc:'MEMORY_ONLY, MEMORY_AND_DISK, DISK_ONLY.' },
          { name:'n', type:'int', req:true, desc:'Target partition count for repartition/coalesce.' }
        ],
        code:
`from pyspark import StorageLevel

df = spark.table("large_events")

# cache() — shortcut for MEMORY_AND_DISK
df_filtered = df.filter(F.col("date") == "2024-01-01").cache()
df_filtered.count()             # first action: materializes cache
df_filtered.groupBy(...).agg(...)  # hits cache — fast

# persist() — explicit storage level
df.persist(StorageLevel.MEMORY_AND_DISK)

# Unpersist when done — free executor memory
df_filtered.unpersist()

# Repartition — full shuffle, choose count or column
df.repartition(200)                    # 200 even partitions
df.repartition("year", "month")        # partition by column

# Coalesce — reduce partitions WITHOUT shuffle
df.repartition(500).coalesce(100)      # merge 500 → 100

# Check partition count
df.rdd.getNumPartitions()`,
        related:['df.write()','F.broadcast()','spark.conf.set()'],
        tags:['pyspark','cache','persist','partitioning','performance tuning'],
        interview:[
          'Cache only when a DataFrame is reused multiple times — materializes on first action',
          'repartition shuffles data (expensive); coalesce only merges adjacent partitions (no shuffle)',
          'Too few partitions: underutilizes cores. Too many: per-task overhead. Target ~128–256 MB/partition.',
          'AQE (Spark 3.0+) can dynamically coalesce shuffle partitions — enable with adaptive.enabled=true',
        ],
        mistakes:['Forgetting to unpersist() — cached DataFrames consume executor memory for the entire session.'],
        notes:['Spark 3.0+ AQE can auto-coalesce shuffle partitions — set spark.sql.adaptive.enabled=true.']
      },
      {
        id:'spark-array-struct', name:'F.array / F.struct / F.explode', purpose:'Create, transform, and unnest complex nested column types',
        badge:['pyspark'], snippet:'df.withColumn("skill", F.explode("skills"))\ndf.groupBy("id").agg(F.collect_list("item"))',
        sig:'F.array(*cols)  F.struct(*cols)  F.explode(col)  F.collect_list(col)  F.array_contains(col, val)',
        meta:{ ret:'Column expression', mut:false, time:'O(n) — explode increases row count proportionally', space:'O(n × avg_array_len)' },
        params:[],
        code:
`from pyspark.sql import functions as F

df = spark.createDataFrame([
    (1, "Alice", ["Python","Spark","SQL"]),
    (2, "Bob",   ["Java","Scala"]),
], ["id","name","skills"])

# explode — one row per array element
df.withColumn("skill", F.explode("skills"))
# Alice → 3 rows, Bob → 2 rows

# explode_outer — keeps rows with null/empty arrays (explode drops them)
df.withColumn("skill", F.explode_outer("skills"))

# posexplode — includes array index
df.withColumn("pos_skill", F.posexplode("skills"))
# (pos=0, skill='Python'), (pos=1, skill='Spark'), ...

# collect_list / collect_set — inverse of explode: rows → array per group
orders = spark.table("orders")
orders.groupBy("customer_id") \\
      .agg(F.collect_list("item").alias("items"),
           F.collect_set("category").alias("categories"))

# Array manipulation functions
F.array_contains(F.col("skills"), "Spark")  # boolean
F.array_size(F.col("skills"))               # length of array
F.array_distinct(F.col("skills"))           # deduplicate
F.sort_array(F.col("skills"))               # sorted copy

# struct — nest multiple columns into one struct column
df.withColumn("info", F.struct("id","name"))
# info = {id:1, name:'Alice'}   → access as df["info"]["id"]

# split string → array
F.split(F.col("csv_tags"), ",")   # "a,b,c" → ["a","b","c"]`,
        related:['F.explode()','F.collect_list()','F.from_json()','spark-schema'],
        tags:['pyspark','array','struct','explode','collect_list','nested data','complex types'],
        interview:[
          'explode is the inverse of collect_list — it unnests an array column into one row per element',
          'explode_outer preserves rows with null/empty arrays; plain explode silently drops them',
          'collect_list preserves duplicates; collect_set deduplicates — both produce ArrayType columns',
        ],
        mistakes:['explode on large arrays can massively inflate row count — watch for shuffle cost downstream.'],
        notes:['For JSON columns, use F.from_json(col, schema) to parse into a struct, then access nested fields with dot notation.']
      },
      {
        id:'spark-schema', name:'StructType / from_json / schema_of_json', purpose:'Define explicit schemas and parse JSON string columns into queryable structs',
        badge:['pyspark'], snippet:'schema = StructType([StructField("id", IntegerType(), True)])\ndf.withColumn("geo", F.from_json("geo_json", schema))',
        sig:'StructType([StructField(name, dataType, nullable)])   F.from_json(col, schema)   F.to_json(col)',
        meta:{ ret:'StructType | Column', mut:false, time:'O(1) schema definition, O(n) JSON parsing', space:'O(n)' },
        params:[
          { name:'name', type:'str', req:true, desc:'Column field name.' },
          { name:'dataType', type:'DataType', req:true, desc:'StringType, IntegerType, DoubleType, ArrayType, MapType, StructType, TimestampType...' },
          { name:'nullable', type:'bool', default:'True', desc:'Whether the field can contain null.' }
        ],
        code:
`from pyspark.sql.types import (
    StructType, StructField,
    StringType, IntegerType, DoubleType,
    ArrayType, MapType, TimestampType
)
from pyspark.sql import functions as F

# Explicit schema — faster than inferSchema for large files
schema = StructType([
    StructField("order_id",  IntegerType(), False),
    StructField("customer",  StringType(),  True),
    StructField("amount",    DoubleType(),  True),
    StructField("tags",      ArrayType(StringType()), True),
])
df = spark.read.schema(schema).json("/path/orders.json")

# DDL string — concise equivalent to StructType
ddl = "order_id INT NOT NULL, customer STRING, amount DOUBLE"
spark.read.schema(ddl).csv("/path/data.csv")

# Parse JSON string column → struct
geo_schema = StructType([
    StructField("lat", DoubleType(), True),
    StructField("lng", DoubleType(), True),
])
df.withColumn("geo", F.from_json(F.col("geo_json"), geo_schema)) \\
  .select("geo.lat", "geo.lng")

# Infer schema from a sample — handy for exploration
sample = '{"event":"click","user_id":42,"ts":"2024-01"}'
inferred = spark.range(1) \\
    .select(F.schema_of_json(F.lit(sample)).alias("s")) \\
    .collect()[0]["s"]  # → "STRUCT<event: STRING, ts: STRING, user_id: BIGINT>"

# Convert struct/array back to JSON string
df.withColumn("json_out", F.to_json(F.col("geo")))`,
        related:['spark.read()','F.from_json()','F.schema_of_json()','df.printSchema()'],
        tags:['pyspark','schema','StructType','StructField','from_json','JSON parsing','DDL'],
        interview:[
          'Always provide schema= instead of inferSchema=True in production — avoids a full scan to infer types',
          'from_json() + StructType parses a JSON string column into queryable struct fields (col.field notation)',
          'DDL string schema ("id INT, name STRING") is equivalent to StructType and far more readable',
        ],
        mistakes:['inferSchema=True reads the entire dataset twice — expensive at scale; never use in production pipelines.'],
        notes:['spark.read.json() infers schema by default; always pass schema= to avoid the extra scan and type surprises.']
      },
      ]
    },
    {
      key:'spark-io', label:'Read & Write',
      fns:[
      {
        id:'spark-read-write', name:'read / write', purpose:'Load and save DataFrames in various formats',
        badge:['pyspark'], snippet:'df.write.format("delta").mode("overwrite").save(path)',
        sig:'spark.read.format(fmt).option(k,v).load(path)   df.write.format(fmt).mode(m).save(path)',
        meta:{ ret:'DataFrame / None', mut:false, time:'O(n) — I/O bound', space:'O(n)' },
        params:[
          { name:'format', type:'str', req:true, desc:'"parquet","delta","csv","json","orc","avro"' },
          { name:'mode', type:'str', default:'"error"', desc:'"overwrite","append","ignore","error"' }
        ],
        code:
`# Read
df = spark.read.parquet("s3://bucket/orders/")
df = spark.read.format("delta").load("/mnt/delta/orders")
df = spark.read.csv("/path/data.csv", header=True, inferSchema=True)
df = spark.read.table("catalog.schema.orders")

# Write
df.write.parquet("/mnt/parquet/orders/")
df.write.format("delta").mode("overwrite").save("/mnt/delta/orders")
df.write.format("delta").mode("append").partitionBy("year","month") \\
   .save("/mnt/delta/orders")

# Save as table
df.write.format("delta").saveAsTable("my_catalog.schema.orders")`,
        related:['spark.sql()','df.cache()','DeltaTable'],
        tags:['pyspark','I/O','Delta Lake','parquet'],
        interview:[
          'Parquet is columnar — efficient for analytical reads of specific columns',
          'Delta Lake adds ACID transactions, time travel, and MERGE on top of Parquet',
          'partitionBy() in write creates directory partitions — improves filter pushdown on those columns',
        ],
        mistakes:['mode("overwrite") with partitionBy only overwrites matching partitions if you use dynamic partition overwrite config.'],
        notes:['Delta format recommended over plain Parquet on Databricks — adds Z-ordering, liquid clustering, CDC support.']
      },
      {
        id:'spark-delta-merge', name:'DeltaTable.merge() / MERGE INTO', purpose:'Upsert rows into a Delta table — update matched rows, insert new ones atomically',
        badge:['pyspark'], snippet:'DeltaTable.forPath(spark, path).alias("t")\n  .merge(updates.alias("u"), "t.id=u.id")\n  .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()',
        sig:'DeltaTable.merge(source, condition).whenMatched[Update|Delete](...).whenNotMatched[Insert](...).execute()',
        meta:{ ret:'None (side-effect write)', mut:true, time:'O(n) — rewrites affected files', space:'O(n)' },
        params:[
          { name:'source', type:'DataFrame', req:true, desc:'DataFrame containing new and updated rows.' },
          { name:'condition', type:'str | Column', req:true, desc:'JOIN predicate between target alias and source alias.' }
        ],
        code:
`from delta.tables import DeltaTable
from pyspark.sql import functions as F

target_path = "/mnt/delta/customers"
dt = DeltaTable.forPath(spark, target_path)

updates = spark.table("customer_updates")   # source DataFrame

# --- Simple upsert: update matches, insert new ---
dt.alias("t") \\
  .merge(
      updates.alias("u"),
      "t.customer_id = u.customer_id"
  ) \\
  .whenMatchedUpdateAll() \\
  .whenNotMatchedInsertAll() \\
  .execute()

# --- Selective: soft-delete matched + conditional insert ---
dt.alias("t") \\
  .merge(updates.alias("u"), "t.id = u.id") \\
  .whenMatchedUpdate(
      condition = "u.status = 'DELETED'",
      set       = {"is_active": F.lit(False), "updated_at": F.col("u.updated_at")}
  ) \\
  .whenMatchedUpdate(
      set = {"name": "u.name", "email": "u.email", "updated_at": "u.updated_at"}
  ) \\
  .whenNotMatchedInsert(
      values = {"id":"u.id","name":"u.name","email":"u.email","is_active":"true"}
  ) \\
  .execute()

# --- SQL equivalent ---
spark.sql("""
    MERGE INTO customers AS t
    USING customer_updates AS u
       ON t.customer_id = u.customer_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")

# --- Check history after merge ---
dt.history(3).select("version","timestamp","operation").show()`,
        related:['DeltaTable.forPath()','spark.read.format("delta")','df.write.format("delta")'],
        tags:['pyspark','delta lake','MERGE','upsert','SCD','DeltaTable','ACID'],
        interview:[
          'MERGE is the lakehouse upsert primitive — one atomic operation replaces separate read-modify-write jobs',
          'whenMatchedUpdateAll()/whenNotMatchedInsertAll() with * matches all source columns automatically',
          'Delta MERGE is ACID — concurrent readers always see a consistent snapshot during the write',
          'SCD Type 1: whenMatchedUpdateAll(). SCD Type 2: insert new row with version flag in whenMatched too.',
        ],
        mistakes:['MERGE without partitioning source similarly to target — triggers a full target table scan on every run.'],
        notes:['dt.history() shows full audit trail; dt.restoreToVersion(n) rolls back — Time Travel is built into Delta.']
      },
      ]
    },
    ]
  }
  ]
};
