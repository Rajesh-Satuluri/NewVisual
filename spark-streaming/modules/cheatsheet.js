// R4 · Cheat Sheet — the one-page PySpark/Scala Structured Streaming reference + decision rules
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

export function mount(container) {
  injectModStyles();

  const apis = `
  <div class="ss-prose"><p>The API surface you actually use, end to end. Copy-ready PySpark (Scala is nearly identical — swap <code>.load()</code> chains for <code>val</code>s and <code>$"col"</code>).</p></div>
  ${codeBlock('Read a source', `# Kafka
df = (spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", "host:9092")
        .option("subscribe", "orders")
        .option("startingOffsets", "latest")      # or "earliest"
        .option("maxOffsetsPerTrigger", 50000)    # rate limit / batch size
        .load())

# File source (schema REQUIRED for streaming)
df = spark.readStream.schema(schema).json("/path")
# Rate source (testing)
df = spark.readStream.format("rate").option("rowsPerSecond", 10).load()`)}
  ${codeBlock('Parse + event time + watermark', `from pyspark.sql.functions import col, from_json, window, sum, count, expr

parsed = (df.select(from_json(col("value").cast("string"), schema).alias("o"))
            .select("o.*")
            .withWatermark("event_time", "10 minutes"))   # max(eventTime) - 10m`)}
  ${codeBlock('Windowed aggregation', `agg = (parsed.groupBy(window("event_time", "5 minutes", "1 minute"),  # size, slide
                       col("country"))
             .agg(sum("amount").alias("revenue"), count("*").alias("n")))
# Tumbling = omit the slide arg. Session = session_window(col, "5 minutes").`)}
  ${codeBlock('Joins', `# stream-static (enrichment, no watermark needed on static side)
enriched = stream.join(dim_table, "product_id")

# stream-stream (time bound + watermark on BOTH sides are MANDATORY)
j = (impr.withWatermark("i_time","1 hour")
         .join(clk.withWatermark("c_time","1 hour"),
               expr("""i_id = c_id AND
                       c_time BETWEEN i_time AND i_time + interval 1 hour"""),
               "leftOuter"))   # outer nulls emit at watermark eviction`)}
  ${codeBlock('Write a sink', `q = (agg.writeStream
        .outputMode("append")                 # append | update | complete
        .format("delta")                      # kafka | console | memory | parquet
        .option("checkpointLocation", "s3://.../_ckpt")   # REQUIRED for recovery
        .trigger(processingTime="30 seconds") # or availableNow=True / once=True
        .start())

# Escape hatch: arbitrary/idempotent sink logic
def upsert(batch_df, batch_id):
    (delta_tbl.alias("t").merge(batch_df.alias("s"), "t.id = s.id")
        .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())
agg.writeStream.foreachBatch(upsert).option("checkpointLocation", ckpt).start()`)}
  ${codeBlock('Operate', `q.awaitTermination()        # block
q.status                    # current state
q.lastProgress              # StreamingQueryProgress (rates, state, watermark)
q.recentProgress            # last N
spark.streams.addListener(MyListener())   # StreamingQueryListener`)}`;

  const rules = `
  <div class="ss-prose"><p>Fast decision rules for the choices interviewers (and prod) force on you.</p>
    <h3>Output mode</h3>
    <ul>
      <li><b>append</b> → final rows that never change: closed windows (emitted at watermark), plain maps/filters. Default. Most sinks support it.</li>
      <li><b>update</b> → a live dashboard of still-changing aggregates (only changed rows each batch). Great for low-latency ops views.</li>
      <li><b>complete</b> → the <i>entire</i> result every batch. Only for small, fully-recomputable aggregations; never evicts state.</li>
    </ul>
    <h3>Trigger</h3>
    <ul>
      <li><b>processingTime="N s"</b> → steady micro-batches every N (throughput + predictable latency). The workhorse.</li>
      <li><b>availableNow=True</b> → drain all available data in batches, then stop. Great for scheduled/incremental batch jobs.</li>
      <li><b>once=True</b> → one batch then stop (legacy; availableNow is better).</li>
      <li><b>continuous="1 second"</b> → ~ms latency, at-least-once, limited ops. Rarely needed.</li>
    </ul>
    <h3>Watermark delay</h3>
    <ul>
      <li>Set it to your <b>real max out-of-orderness</b> (p99 lateness), not a guess. Too small → drop valid late data; too large → more state + later emission.</li>
      <li>Mandatory for append-mode windows, stream-stream joins, and <code>dropDuplicatesWithinWatermark</code>.</li>
    </ul>
    <h3>Sink / exactly-once</h3>
    <ul>
      <li>Need exactly-once? Use a <b>replayable source</b> + a <b>transactional/idempotent sink</b> (Delta, or Kafka txns, or <code>foreachBatch</code> MERGE). Append-only files → at-least-once.</li>
      <li>Custom target → <code>foreachBatch</code> with a <b>batch-id-keyed idempotent write</b>.</li>
    </ul>
    <h3>State blowing up?</h3>
    <ul>
      <li>Check <code>lastProgress.stateOperators</code>. Usual causes: missing/too-large watermark, too-wide join window, high-cardinality keys.</li>
      <li>Fixes: define/tighten the watermark, narrow the join time range (biggest lever), switch to the <b>RocksDB</b> state store, reduce key cardinality.</li>
    </ul>
  </div>
  <div class="ss-callout"><b>Checkpoint rule:</b> never change aggregation keys, window definitions, or add/remove stateful operators against an existing checkpoint — the state layout won't match. Those need a fresh checkpoint.</div>`;

  container.innerHTML = createModuleShell({
    tag: 'Reference · R4',
    title: '📋 Cheat Sheet',
    subtitle: 'The one-page Structured Streaming API + decision rules',
    tabs: [
      { id: 'api', label: '💻 API surface', content: apis },
      { id: 'rules', label: '🧭 Decision rules', content: rules },
    ],
  });
  initTabs(container);
  return null;
}

export default { mount };
