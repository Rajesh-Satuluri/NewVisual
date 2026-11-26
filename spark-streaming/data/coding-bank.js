// B2 · Coding Bank — 30+ PySpark/Scala Structured Streaming problems with worked solutions.
// Shape: { m, title, diff: 'easy'|'med'|'hard', prompt, approach, py, scala }
export const CODING = [
  { m: 'm04', title: 'Read a Kafka topic as a stream', diff: 'easy',
    prompt: 'Create a streaming DataFrame reading JSON orders from Kafka topic "orders", starting from the latest offsets, with a parsed schema (order_id, user_id, amount, event_time).',
    approach: 'readStream.format("kafka") → cast value to string → from_json with an explicit schema → select the struct fields.',
    py: `from pyspark.sql.functions import col, from_json
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType

schema = (StructType()
    .add("order_id", StringType()).add("user_id", StringType())
    .add("amount", DoubleType()).add("event_time", TimestampType()))

orders = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "orders")
    .option("startingOffsets", "latest")
    .load()
    .select(from_json(col("value").cast("string"), schema).alias("o"))
    .select("o.*"))`,
    scala: `val schema = new StructType()
  .add("order_id", StringType).add("user_id", StringType)
  .add("amount", DoubleType).add("event_time", TimestampType)

val orders = spark.readStream.format("kafka")
  .option("kafka.bootstrap.servers", "broker:9092")
  .option("subscribe", "orders").option("startingOffsets", "latest")
  .load()
  .select(from_json($"value".cast("string"), schema).as("o"))
  .select("o.*")` },

  { m: 'm09', title: 'Revenue per 5-minute tumbling window', diff: 'easy',
    prompt: 'Compute total revenue per 5-minute tumbling event-time window, tolerating 10 minutes of lateness, and output only finalized windows.',
    approach: 'withWatermark → groupBy(window(...)) → sum → append output mode (emits closed windows).',
    py: `from pyspark.sql.functions import window, sum as _sum, col
rev = (orders.withWatermark("event_time", "10 minutes")
    .groupBy(window("event_time", "5 minutes"))
    .agg(_sum("amount").alias("revenue")))
q = rev.writeStream.outputMode("append").format("console") \\
    .option("checkpointLocation", "/ckpt/rev").start()`,
    scala: `val rev = orders.withWatermark("event_time", "10 minutes")
  .groupBy(window($"event_time", "5 minutes"))
  .agg(sum("amount").as("revenue"))
rev.writeStream.outputMode("append").format("console")
  .option("checkpointLocation", "/ckpt/rev").start()` },

  { m: 'm09', title: 'Sliding window click counts', diff: 'med',
    prompt: 'Count clicks per page over a 10-minute window that slides every 1 minute.',
    approach: 'window(col, size, slide) with both size and slide arguments; group by page too.',
    py: `from pyspark.sql.functions import window, count, col
clicks_w = (clicks.withWatermark("ts", "5 minutes")
    .groupBy(window("ts", "10 minutes", "1 minute"), col("page"))
    .agg(count("*").alias("clicks")))`,
    scala: `val clicksW = clicks.withWatermark("ts", "5 minutes")
  .groupBy(window($"ts", "10 minutes", "1 minute"), $"page")
  .agg(count("*").as("clicks"))` },

  { m: 'm09', title: 'Session windows per user', diff: 'med',
    prompt: 'Group a user\'s events into sessions that end after 15 minutes of inactivity; count events per session.',
    approach: 'Use session_window(col, gap); group by user and the session window.',
    py: `from pyspark.sql.functions import session_window, count, col
sessions = (events.withWatermark("ts", "15 minutes")
    .groupBy(col("user_id"), session_window("ts", "15 minutes"))
    .agg(count("*").alias("events")))`,
    scala: `val sessions = events.withWatermark("ts", "15 minutes")
  .groupBy($"user_id", session_window($"ts", "15 minutes"))
  .agg(count("*").as("events"))` },

  { m: 'm08', title: 'Add a watermark to bound state', diff: 'easy',
    prompt: 'A windowed aggregation is growing state unbounded. Fix it so state is bounded to 20 minutes of lateness.',
    approach: 'withWatermark must be applied on the event-time column before the groupBy; it enables eviction.',
    py: `agg = (df.withWatermark("event_time", "20 minutes")   # <-- the fix
    .groupBy(window("event_time", "5 minutes"), "key")
    .count())`,
    scala: `val agg = df.withWatermark("event_time", "20 minutes")
  .groupBy(window($"event_time", "5 minutes"), $"key").count()` },

  { m: 'm12', title: 'Live running totals (update mode)', diff: 'easy',
    prompt: 'Feed a dashboard with running per-country revenue that updates every batch (only changed rows).',
    approach: 'Use outputMode("update") so only changed aggregate rows are emitted per batch.',
    py: `agg = df.groupBy("country").agg(_sum("amount").alias("rev"))
q = (agg.writeStream.outputMode("update").format("memory")
    .queryName("rev_live").option("checkpointLocation","/ckpt/live").start())`,
    scala: `val agg = df.groupBy("country").agg(sum("amount").as("rev"))
agg.writeStream.outputMode("update").format("memory")
  .queryName("rev_live").option("checkpointLocation","/ckpt/live").start()` },

  { m: 'm13', title: 'Deduplicate with bounded state', diff: 'med',
    prompt: 'Deduplicate orders by order_id but keep dedup state finite.',
    approach: 'Use dropDuplicatesWithinWatermark after setting a watermark, instead of plain dropDuplicates.',
    py: `deduped = (orders.withWatermark("event_time", "1 hour")
    .dropDuplicatesWithinWatermark(["order_id"]))`,
    scala: `val deduped = orders.withWatermark("event_time", "1 hour")
  .dropDuplicatesWithinWatermark("order_id")` },

  { m: 'm17', title: 'Enrich a stream with a static dimension', diff: 'easy',
    prompt: 'Join a stream of orders to a static product dimension table on product_id.',
    approach: 'Read the dimension as a normal (batch) DataFrame and join; the static side needs no watermark.',
    py: `dim = spark.read.table("dim_product")   # static
enriched = orders.join(dim, "product_id")   # stream-static`,
    scala: `val dim = spark.read.table("dim_product")
val enriched = orders.join(dim, "product_id")` },

  { m: 'm18', title: 'Impressions ⋈ clicks within 1 hour', diff: 'hard',
    prompt: 'Join an impressions stream to a clicks stream where the click occurs within 1 hour after the impression, same ad_id.',
    approach: 'Watermark both sides; join on equality key + a time-range condition (mandatory to bound state).',
    py: `impr = impr.withWatermark("i_time", "1 hour")
clk  = clk.withWatermark("c_time", "1 hour")
joined = impr.join(clk, expr("""
    i_ad = c_ad AND
    c_time >= i_time AND c_time <= i_time + interval 1 hour"""))`,
    scala: `val joined = impr.withWatermark("i_time","1 hour")
  .join(clk.withWatermark("c_time","1 hour"),
    expr("""i_ad = c_ad AND c_time >= i_time AND
            c_time <= i_time + interval 1 hour"""))` },

  { m: 'm18', title: 'Abandoned carts (left outer join)', diff: 'hard',
    prompt: 'Find carts with no purchase within 30 minutes (abandoned) using a stream-stream left outer join.',
    approach: 'leftOuter join of carts to purchases with a 30-min time bound; filter where purchase side is null. Nulls emit at watermark eviction.',
    py: `carts = carts.withWatermark("cart_t", "30 minutes")
buys  = buys.withWatermark("buy_t", "30 minutes")
abandoned = (carts.join(buys, expr("""
      cart_user = buy_user AND
      buy_t BETWEEN cart_t AND cart_t + interval 30 minutes"""), "leftOuter")
    .where("buy_user IS NULL"))`,
    scala: `val abandoned = carts.withWatermark("cart_t","30 minutes")
  .join(buys.withWatermark("buy_t","30 minutes"),
    expr("cart_user = buy_user AND buy_t BETWEEN cart_t AND cart_t + interval 30 minutes"),
    "leftOuter").where($"buy_user".isNull)` },

  { m: 'm14', title: 'Idempotent upsert via foreachBatch', diff: 'hard',
    prompt: 'Write streaming aggregates to a Delta table as an idempotent MERGE upsert keyed by id.',
    approach: 'Use foreachBatch; inside, run a Delta MERGE matching on the key.',
    py: `from delta.tables import DeltaTable
def upsert(batch_df, batch_id):
    tgt = DeltaTable.forName(spark, "gold.metrics")
    (tgt.alias("t").merge(batch_df.alias("s"), "t.id = s.id")
        .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())

q = (agg.writeStream.foreachBatch(upsert)
    .option("checkpointLocation", "/ckpt/upsert").start())`,
    scala: `agg.writeStream.foreachBatch { (batchDF: DataFrame, id: Long) =>
  DeltaTable.forName(spark, "gold.metrics").as("t")
    .merge(batchDF.as("s"), "t.id = s.id")
    .whenMatched.updateAll().whenNotMatched.insertAll().execute()
}.option("checkpointLocation", "/ckpt/upsert").start()` },

  { m: 'm05', title: 'Scheduled incremental batch (availableNow)', diff: 'easy',
    prompt: 'Process all new data since last run in bounded batches, then stop — for a job scheduled hourly.',
    approach: 'Trigger.AvailableNow drains the backlog in batches and terminates; the checkpoint remembers progress.',
    py: `q = (df.writeStream.format("delta")
    .option("checkpointLocation", "/ckpt/inc")
    .trigger(availableNow=True).toTable("bronze.events"))
q.awaitTermination()`,
    scala: `df.writeStream.format("delta")
  .option("checkpointLocation", "/ckpt/inc")
  .trigger(Trigger.AvailableNow).toTable("bronze.events")` },

  { m: 'm05', title: 'Fixed-interval trigger with rate limit', diff: 'easy',
    prompt: 'Fire a batch every 30 seconds, reading at most 100k Kafka records per batch.',
    approach: 'Set maxOffsetsPerTrigger on the source and Trigger.ProcessingTime on the sink.',
    py: `df = (spark.readStream.format("kafka")
    .option("subscribe","orders")
    .option("maxOffsetsPerTrigger", 100000).load())
q = df.writeStream.trigger(processingTime="30 seconds") \\
    .option("checkpointLocation","/ckpt/x").format("console").start()`,
    scala: `spark.readStream.format("kafka").option("subscribe","orders")
  .option("maxOffsetsPerTrigger", 100000).load()
  .writeStream.trigger(Trigger.ProcessingTime("30 seconds"))
  .option("checkpointLocation","/ckpt/x").format("console").start()` },

  { m: 'm11', title: 'Abandoned-cart state machine', diff: 'hard',
    prompt: 'Using flatMapGroupsWithState, emit an "abandoned" event when a user adds to cart but does not purchase within 30 minutes.',
    approach: 'Keep per-user GroupState; set an event-time timeout; on timeout emit abandoned and clear state.',
    py: `# PySpark uses applyInPandasWithState; pseudo-logic shown
def cart_fn(key, rows, state):
    for r in rows:
        if r["type"] == "add": state.update({"t": r["ts"]})
        elif r["type"] == "buy": state.remove(); return
    state.setTimeoutTimestamp(state.get()["t"] + 30*60*1000)
    if state.hasTimedOut:
        state.remove(); yield (key, "abandoned")`,
    scala: `events.groupByKey(_.user)
  .flatMapGroupsWithState(OutputMode.Append, GroupStateTimeout.EventTimeTimeout) {
    (user, rows, state: GroupState[CartState]) =>
      // update on add, remove on buy, set 30-min event-time timeout;
      // on timeout emit Abandoned(user) and clear state
      ...
  }` },

  { m: 'm15', title: 'Make a query recoverable', diff: 'easy',
    prompt: 'A query restarts from scratch every time it is redeployed. Fix it.',
    approach: 'Set a stable checkpointLocation so offsets/state/commits persist across restarts.',
    py: `q = (df.writeStream.format("delta")
    .option("checkpointLocation", "s3://bucket/app/_ckpt")  # <-- stable path
    .toTable("silver.events"))`,
    scala: `df.writeStream.format("delta")
  .option("checkpointLocation", "s3://bucket/app/_ckpt")
  .toTable("silver.events")` },

  { m: 'm20', title: 'Switch to the RocksDB state store', diff: 'med',
    prompt: 'A stateful job suffers long GC pauses from large on-heap state. Move state off-heap.',
    approach: 'Set the state store provider to RocksDB at the Spark session/config level.',
    py: `spark.conf.set(
  "spark.sql.streaming.stateStore.providerClass",
  "org.apache.spark.sql.execution.streaming.state.RocksDBStateStoreProvider")`,
    scala: `spark.conf.set(
  "spark.sql.streaming.stateStore.providerClass",
  "org.apache.spark.sql.execution.streaming.state.RocksDBStateStoreProvider")` },

  { m: 'm21', title: 'Alert on lag via a listener', diff: 'med',
    prompt: 'Log a warning whenever input rate exceeds processing rate (the query is falling behind).',
    approach: 'Register a StreamingQueryListener; in onQueryProgress compare inputRowsPerSecond vs processedRowsPerSecond.',
    py: `class LagListener(StreamingQueryListener):
    def onQueryProgress(self, event):
        p = event.progress
        if p.inputRowsPerSecond and p.processedRowsPerSecond \\
           and p.inputRowsPerSecond > p.processedRowsPerSecond * 1.2:
            print(f"WARN lag: in={p.inputRowsPerSecond} proc={p.processedRowsPerSecond}")
    def onQueryStarted(self, e): pass
    def onQueryTerminated(self, e): pass
spark.streams.addListener(LagListener())`,
    scala: `spark.streams.addListener(new StreamingQueryListener {
  def onQueryProgress(e: QueryProgressEvent): Unit = {
    val p = e.progress
    if (p.inputRowsPerSecond > p.processedRowsPerSecond * 1.2)
      logWarning(s"lag in=\${p.inputRowsPerSecond} proc=\${p.processedRowsPerSecond}")
  }
  def onQueryStarted(e: QueryStartedEvent): Unit = {}
  def onQueryTerminated(e: QueryTerminatedEvent): Unit = {}
})` },

  { m: 'm19', title: 'CDC merge into a current-state table', diff: 'hard',
    prompt: 'Apply a change stream (op = insert/update/delete) to keep a Delta table mirroring the source.',
    approach: 'foreachBatch + MERGE with whenMatchedDelete for op="delete", else upsert.',
    py: `def apply_cdc(b, _):
    t = DeltaTable.forName(spark, "mirror")
    (t.alias("t").merge(b.alias("s"), "t.pk = s.pk")
      .whenMatchedDelete("s.op = 'delete'")
      .whenMatchedUpdateAll("s.op = 'update'")
      .whenNotMatchedInsertAll("s.op != 'delete'").execute())
cdc.writeStream.foreachBatch(apply_cdc) \\
    .option("checkpointLocation","/ckpt/cdc").start()`,
    scala: `cdc.writeStream.foreachBatch { (b: DataFrame, _: Long) =>
  DeltaTable.forName(spark, "mirror").as("t")
    .merge(b.as("s"), "t.pk = s.pk")
    .whenMatched("s.op = 'delete'").delete()
    .whenMatched("s.op = 'update'").updateAll()
    .whenNotMatched("s.op != 'delete'").insertAll().execute()
}.option("checkpointLocation","/ckpt/cdc").start()` },

  { m: 'm07', title: 'Parse event time from a string column', diff: 'easy',
    prompt: 'The event timestamp arrives as an ISO string "ts_str". Convert it to a timestamp for windowing.',
    approach: 'Use to_timestamp; then withWatermark on the resulting column.',
    py: `from pyspark.sql.functions import to_timestamp
df2 = df.withColumn("event_time", to_timestamp("ts_str")) \\
        .withWatermark("event_time", "10 minutes")`,
    scala: `val df2 = df.withColumn("event_time", to_timestamp($"ts_str"))
  .withWatermark("event_time", "10 minutes")` },

  { m: 'm14', title: 'Write to Kafka', diff: 'easy',
    prompt: 'Publish aggregated results to a Kafka topic "metrics" as JSON in the value column.',
    approach: 'Build a "value" string column (to_json of a struct) and write with format("kafka").',
    py: `from pyspark.sql.functions import to_json, struct, col
out = agg.select(to_json(struct("*")).alias("value"))
q = (out.writeStream.format("kafka")
    .option("kafka.bootstrap.servers","broker:9092")
    .option("topic","metrics")
    .option("checkpointLocation","/ckpt/out").start())`,
    scala: `val out = agg.select(to_json(struct("*")).as("value"))
out.writeStream.format("kafka")
  .option("kafka.bootstrap.servers","broker:9092")
  .option("topic","metrics").option("checkpointLocation","/ckpt/out").start()` },

  { m: 'm10', title: 'Top-N is not directly supported — why?', diff: 'med',
    prompt: 'A candidate asks Spark to compute a streaming global Top-10 with orderBy().limit(10) in append mode. Explain the issue and give a workaround.',
    approach: 'Sorting a stream in append mode is unsupported (would need the whole stream). Aggregate, then compute Top-N per batch in foreachBatch.',
    py: `# Unsupported: agg.orderBy(desc("rev")).limit(10)  (append)
def top_n(b, _):
    (b.orderBy(b["rev"].desc()).limit(10)
       .write.mode("overwrite").saveAsTable("gold.top10"))
agg.writeStream.outputMode("complete").foreachBatch(top_n) \\
   .option("checkpointLocation","/ckpt/top").start()`,
    scala: `agg.writeStream.outputMode("complete").foreachBatch {
  (b: DataFrame, _: Long) =>
    b.orderBy($"rev".desc).limit(10)
     .write.mode("overwrite").saveAsTable("gold.top10")
}.option("checkpointLocation","/ckpt/top").start()` },

  { m: 'm16', title: 'Guarantee exactly-once to a custom store', diff: 'hard',
    prompt: 'Your sink is a REST API with no transactions. Achieve exactly-once.',
    approach: 'foreachBatch + record the committed batchId in the target (or a side table); skip a batch whose id is already present (idempotent by batchId).',
    py: `def write_once(b, batch_id):
    if target_has_batch(batch_id):   # already committed -> skip (replay)
        return
    payload = b.toJSON().collect()
    post_to_api(payload, batch_id)   # include batch_id so the API dedupes
    mark_committed(batch_id)
stream.writeStream.foreachBatch(write_once) \\
    .option("checkpointLocation","/ckpt/api").start()`,
    scala: `stream.writeStream.foreachBatch { (b: DataFrame, id: Long) =>
  if (!targetHasBatch(id)) { postToApi(b.toJSON.collect(), id); markCommitted(id) }
}.option("checkpointLocation","/ckpt/api").start()` },

  { m: 'm12', title: 'Choose the right output mode', diff: 'med',
    prompt: 'You aggregate windowed counts and write to a Parquet/Delta warehouse table. Which output mode and why?',
    approach: 'append — windowed results are finalized once (at the watermark); most file/warehouse sinks require append.',
    py: `agg = (df.withWatermark("ts","10 minutes")
    .groupBy(window("ts","5 minutes")).count())
agg.writeStream.outputMode("append").format("delta") \\
   .option("checkpointLocation","/ckpt/w").toTable("gold.counts")`,
    scala: `df.withWatermark("ts","10 minutes")
  .groupBy(window($"ts","5 minutes")).count()
  .writeStream.outputMode("append").format("delta")
  .option("checkpointLocation","/ckpt/w").toTable("gold.counts")` },

  { m: 'm04', title: 'Handle missing Kafka offsets', diff: 'med',
    prompt: 'A topic\'s retention deleted offsets the checkpoint expects, crashing the job. Make it tolerate the gap (accepting possible loss).',
    approach: 'Set failOnDataLoss=false on the Kafka source (document the at-least-once / possible-loss tradeoff).',
    py: `df = (spark.readStream.format("kafka")
    .option("subscribe","orders")
    .option("failOnDataLoss","false")   # tolerate missing offsets
    .load())`,
    scala: `spark.readStream.format("kafka").option("subscribe","orders")
  .option("failOnDataLoss","false").load()` },

  { m: 'm21', title: 'Inspect state size at runtime', diff: 'easy',
    prompt: 'Print the number of state rows for each stateful operator from the last progress.',
    approach: 'Read query.lastProgress.stateOperators.',
    py: `for op in query.lastProgress["stateOperators"]:
    print(op["numRowsTotal"], op.get("memoryUsedBytes"))`,
    scala: `query.lastProgress.stateOperators.foreach { op =>
  println(op.numRowsTotal, op.memoryUsedBytes) }` },

  { m: 'm08', title: 'Debug: windows never emit in append mode', diff: 'med',
    prompt: 'A tumbling-window append query shows no output. The stream is live. What is wrong and how do you fix it?',
    approach: 'Append emits a window only when the watermark passes its end — often no watermark is set, or data stops so the watermark never advances. Add withWatermark and/or enable no-data batches.',
    py: `agg = (df.withWatermark("event_time","5 minutes")   # ensure this exists
    .groupBy(window("event_time","1 minute")).count())
# ensure noDataMicroBatches enabled (default true) so wm advances when quiet`,
    scala: `val agg = df.withWatermark("event_time","5 minutes")
  .groupBy(window($"event_time","1 minute")).count()` },

  { m: 'm22', title: 'End-to-end pipeline skeleton', diff: 'hard',
    prompt: 'Wire a full pipeline: Kafka orders → windowed revenue → Delta warehouse, exactly-once, 30s batches.',
    approach: 'Combine source + watermark + windowed agg + Delta sink + checkpoint + processingTime trigger.',
    py: `orders = (spark.readStream.format("kafka").option("subscribe","orders")
    .load().select(from_json(col("value").cast("string"), schema).alias("o"))
    .select("o.*").withWatermark("event_time","10 minutes"))
rev = orders.groupBy(window("event_time","5 minutes")).agg(_sum("amount").alias("rev"))
(rev.writeStream.format("delta").outputMode("append")
    .option("checkpointLocation","s3://s/_ckpt/rev")
    .trigger(processingTime="30 seconds").toTable("gold.revenue"))`,
    scala: `val rev = orders.withWatermark("event_time","10 minutes")
  .groupBy(window($"event_time","5 minutes")).agg(sum("amount").as("rev"))
rev.writeStream.format("delta").outputMode("append")
  .option("checkpointLocation","s3://s/_ckpt/rev")
  .trigger(Trigger.ProcessingTime("30 seconds")).toTable("gold.revenue")` },

  { m: 'm13', title: 'Deduplicate keeping the first event', diff: 'med',
    prompt: 'Keep only the first occurrence of each event_id seen within an hour.',
    approach: 'dropDuplicatesWithinWatermark keeps the first row per key within the watermark horizon.',
    py: `first = (df.withWatermark("ts","1 hour")
    .dropDuplicatesWithinWatermark(["event_id"]))`,
    scala: `val first = df.withWatermark("ts","1 hour")
  .dropDuplicatesWithinWatermark("event_id")` },

  { m: 'm10', title: 'Multiple aggregations in one query', diff: 'med',
    prompt: 'Per window, compute count, sum(amount), and approx distinct users.',
    approach: 'One groupBy with multiple agg expressions.',
    py: `from pyspark.sql.functions import count, sum as _sum, approx_count_distinct
agg = (df.withWatermark("ts","10 minutes")
    .groupBy(window("ts","5 minutes"))
    .agg(count("*").alias("n"), _sum("amount").alias("rev"),
         approx_count_distinct("user_id").alias("users")))`,
    scala: `val agg = df.withWatermark("ts","10 minutes")
  .groupBy(window($"ts","5 minutes"))
  .agg(count("*").as("n"), sum("amount").as("rev"),
       approx_count_distinct("user_id").as("users"))` },

  { m: 'm06', title: 'Enable continuous processing', diff: 'med',
    prompt: 'Run a simple map/filter pipeline with ~1 second continuous trigger for low latency.',
    approach: 'Use Trigger.Continuous; note only map-like ops and certain sources/sinks are supported.',
    py: `q = (df.selectExpr("value").writeStream.format("kafka")
    .option("topic","out").option("checkpointLocation","/ckpt/c")
    .trigger(continuous="1 second").start())`,
    scala: `df.selectExpr("value").writeStream.format("kafka")
  .option("topic","out").option("checkpointLocation","/ckpt/c")
  .trigger(Trigger.Continuous("1 second")).start()` },

  { m: 'm20', title: 'Right-size shuffle partitions for state', diff: 'med',
    prompt: 'A stateful streaming job over-shards state with the default 200 partitions on a small cluster. What do you set, and what is the catch?',
    approach: 'Lower spark.sql.shuffle.partitions BEFORE first run — it fixes state parallelism and cannot change against an existing checkpoint.',
    py: `# Set BEFORE the first run against a checkpoint; immutable afterward.
spark.conf.set("spark.sql.shuffle.partitions", "16")`,
    scala: `spark.conf.set("spark.sql.shuffle.partitions", "16")` },
];
