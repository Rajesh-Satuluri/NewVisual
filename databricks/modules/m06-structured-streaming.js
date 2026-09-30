import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · Compute',
    title: 'Structured Streaming',
    subtitle: 'Micro-batch and continuous processing, triggers, watermarks, checkpointing',
    tabs: [
      { id: 'overview', label: '🌊 Overview' },
      { id: 'state',    label: '⏱️ Watermarks & State' },
      { id: 'io',       label: '🔌 Sources & Sinks' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  /* ── Tab 1: Overview — model, processing modes, triggers ──────────────────── */
  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Incremental Query Execution on an Unbounded Table</div>
        <div class="section-desc">A stream is modeled as an ever-growing input table; every trigger runs the same query against the newly appended rows and updates a result table</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Micro-batch</div><div class="stat-label">Default execution model</div></div>
        <div class="stat-box"><div class="stat-val">~100ms</div><div class="stat-label">Continuous mode latency</div></div>
        <div class="stat-box"><div class="stat-val">Exactly-once</div><div class="stat-label">End-to-end guarantee</div></div>
        <div class="stat-box"><div class="stat-val">Same API</div><div class="stat-label">As batch DataFrames</div></div>
      </div>

      <div class="prose" style="margin-top:24px">
        <p>Structured Streaming reuses the <strong>batch DataFrame/Dataset API</strong>. You write a query as if over a static table; the engine runs it <strong>incrementally</strong>, tracking what input has already been processed via offsets. The developer's mental model is a table that grows with every new record — the same <code>groupBy</code>, <code>join</code>, and <code>filter</code> you'd write in batch produce a continuously updated result.</p>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Micro-batch vs. Continuous Processing</div>
        <div class="section-desc">Two execution engines with very different latency / semantics trade-offs</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead>
            <tr><th>Aspect</th><th>Micro-batch (default)</th><th>Continuous processing</th></tr>
          </thead>
          <tbody>
            <tr><td>Latency</td><td class="tag-warn">~seconds (100ms floor)</td><td class="tag-good">~1 ms end-to-end</td></tr>
            <tr><td>How it runs</td><td>Discretizes the stream into small deterministic jobs; each batch reads a fixed offset range</td><td>Long-running tasks poll the source continuously, records flow one at a time</td></tr>
            <tr><td>Throughput</td><td class="tag-good">High — vectorized, whole-stage codegen</td><td class="tag-warn">Lower per-core</td></tr>
            <tr><td>Supported ops</td><td class="tag-good">Full: aggregations, joins, dedup, stateful</td><td class="tag-bad">Map-only (select/where/map); no aggregations</td></tr>
            <tr><td>Fault tolerance</td><td class="tag-good">Exactly-once</td><td class="tag-warn">At-least-once</td></tr>
            <tr><td>Checkpointing</td><td>Per micro-batch commit</td><td>Asynchronous, epoch-based</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tip" style="margin:16px 40px 0">Continuous processing is a specialized, rarely-used mode. In practice ~99% of production pipelines run micro-batch — it's what you get by default, supports every operation, and hits sub-second latency with a small trigger interval.</div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Trigger Intervals — how often a micro-batch fires</div>
        <div class="section-desc">Passed to <code>.trigger(...)</code> on the DataStreamWriter</div>
      </div>
      <div class="config-grid">
        <div class="config-card">
          <div class="config-name">Trigger.ProcessingTime</div>
          <div class="config-val">trigger(processingTime="30 seconds")</div>
          <div class="config-desc">Fire a micro-batch on a fixed wall-clock cadence. If a batch takes longer than the interval, the next one starts immediately (no overlap). This is the standard always-on streaming trigger.</div>
          <div class="config-impact impact-medium">Continuous cluster · steady latency</div>
        </div>
        <div class="config-card">
          <div class="config-name">Trigger.AvailableNow</div>
          <div class="config-val">trigger(availableNow=True)</div>
          <div class="config-desc">Process ALL data available at start, in multiple micro-batches (respecting maxFilesPerTrigger / maxOffsetsPerTrigger), then stop. The modern replacement for Trigger.Once — gives incremental-batch economics without a giant single batch.</div>
          <div class="config-impact impact-low">Cost-efficient · job-scheduled runs</div>
        </div>
        <div class="config-card">
          <div class="config-name">Trigger.Once</div>
          <div class="config-val">trigger(once=True)</div>
          <div class="config-desc">Process all available data in a SINGLE micro-batch, then stop. Deprecated in favor of AvailableNow because one huge batch ignores rate limits and can OOM. Runs the stream like a scheduled batch job while still using the streaming checkpoint.</div>
          <div class="config-impact impact-high">Deprecated · single batch</div>
        </div>
        <div class="config-card">
          <div class="config-name">(default — no trigger)</div>
          <div class="config-val">.start()</div>
          <div class="config-desc">With no trigger specified, Spark fires the next micro-batch as soon as the previous one finishes — maximizing throughput and minimizing latency, at the cost of many tiny output files under low load.</div>
          <div class="config-impact impact-medium">Lowest latency · small-file risk</div>
        </div>
      </div>
    </div>`;

  /* ── Tab 2: Watermarks & State ────────────────────────────────────────────── */
  container.querySelector('#tab-state').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Event Time, Watermarks & Late Data</div>
        <div class="section-desc">Windowed aggregations key off event time (when it happened), not processing time (when Spark saw it) — the watermark bounds how long state is kept</div>
      </div>

      <div class="prose">
        <p>A <strong>watermark</strong> declares the maximum lateness you'll tolerate: <code>.withWatermark("event_time", "10 minutes")</code>. Spark tracks the <strong>max event_time seen across all partitions</strong>; the watermark trails it by the configured delay. Any record with <code>event_time &lt; (max_event_time − delay)</code> is considered late — it's dropped from aggregations and its window's state is safe to evict. Without a watermark, stateful queries keep state for <strong>all time</strong>, and the state store grows without bound until the job OOMs.</p>
      </div>

      <div style="margin-top:8px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Windowed aggregation with a watermark</div>
        <div class="code-block"><span class="cmt"># 5-minute tumbling windows on event time, dropping data > 10 min late</span>
<span class="kw">from</span> pyspark.sql.functions <span class="kw">import</span> window, count

counts = (events
  .withWatermark(<span class="str">"event_time"</span>, <span class="str">"10 minutes"</span>)
  .groupBy(
      window(<span class="str">"event_time"</span>, <span class="str">"5 minutes"</span>),   <span class="cmt"># tumbling</span>
      <span class="str">"device_id"</span>)
  .agg(count(<span class="str">"*"</span>).alias(<span class="str">"events"</span>)))

(counts.writeStream
  .outputMode(<span class="str">"append"</span>)          <span class="cmt"># emit each window once its watermark passes</span>
  .format(<span class="str">"delta"</span>)
  .option(<span class="str">"checkpointLocation"</span>, <span class="str">"s3://lake/_checkpoints/win_counts"</span>)
  .toTable(<span class="str">"gold.window_counts"</span>))</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">A window closes (and its result is emitted in append mode) only once the watermark advances past <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">window.end</code>. Until then, state for that window is retained so late-but-in-bounds records still update the count.</div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Output Modes</div>
        <div class="section-desc">Which rows of the result table get written to the sink each trigger</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead>
            <tr><th>Mode</th><th>What it writes</th><th>Requires</th><th>Typical use</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>append</strong></td><td>Only NEW rows that will never change again</td><td class="tag-warn">Watermark for aggregations (so windows can finalize)</td><td>Windowed counts to Delta; raw event ingestion</td></tr>
            <tr><td><strong>update</strong></td><td>Only rows that CHANGED this trigger</td><td class="tag-good">Nothing special</td><td>Running aggregations, upserts via foreachBatch</td></tr>
            <tr><td><strong>complete</strong></td><td>The ENTIRE result table every trigger</td><td class="tag-bad">Bounded state (unbounded key space = OOM)</td><td>Small global aggregations / dashboards</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Arbitrary Stateful Processing</div>
        <div class="section-desc">When built-in aggregations aren't enough — custom sessionization, dedup, timeout logic</div>
      </div>
      <div class="info-grid" style="padding:0">
        <div class="info-card">
          <div class="info-card-icon">🔁</div>
          <div class="info-card-title">flatMapGroupsWithState</div>
          <div class="info-card-body">Per-key custom state that can emit <strong>zero, one, or many</strong> rows per group per batch. Works with append or update output mode. Ideal for session windows: accumulate events per user, emit a session record when a gap timeout fires.</div>
          <div class="info-card-tag">0..N outputs</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">1️⃣</div>
          <div class="info-card-title">mapGroupsWithState</div>
          <div class="info-card-body">Same per-key state machine but emits <strong>exactly one</strong> row per key. Only supports update output mode. Use for maintaining a current-value-per-key (e.g. latest device status) from a stream of updates.</div>
          <div class="info-card-tag">1 output/key</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⏰</div>
          <div class="info-card-title">GroupState timeouts</div>
          <div class="info-card-body">Register <code>EventTimeTimeout</code> (driven by the watermark) or <code>ProcessingTimeTimeout</code> to fire callbacks on idle keys — how you close sessions and expire stale state explicitly with <code>state.remove()</code>.</div>
          <div class="info-card-tag">Explicit eviction</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🗄️</div>
          <div class="info-card-title">State store backend</div>
          <div class="info-card-body">State lives in-memory on executors, backed by the checkpoint (HDFSStateStoreProvider, or RocksDB for large state to avoid JVM GC/OOM). Snapshotted to the checkpoint each batch for exactly-once recovery.</div>
          <div class="info-card-tag">RocksDB for scale</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Checkpointing — the durability contract</div>
        <div class="section-desc">A stable, unique <code>checkpointLocation</code> on S3/ADLS is what makes restarts exactly-once</div>
      </div>
      <div style="max-width:760px;background:var(--bg2);border-radius:10px;padding:18px 20px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Checkpoint directory layout on S3</div>
        <pre style="font-size:12px;color:var(--text2);line-height:1.8;margin:0">s3://lake/_checkpoints/win_counts/
├── offsets/          <span style="color:var(--text3)">← WAL: input offset range PLANNED per batch (write-ahead)</span>
│   ├── 0
│   └── 1
├── commits/          <span style="color:var(--text3)">← which batches actually FINISHED writing to the sink</span>
│   ├── 0
│   └── 1
├── state/            <span style="color:var(--text3)">← aggregation / GroupState snapshots + deltas per batch</span>
│   └── 0/            <span style="color:var(--text3)">   (operator 0, partitioned by shuffle partition)</span>
└── metadata          <span style="color:var(--text3)">← immutable query id</span></pre>
      </div>
      <div class="info-grid" style="padding:16px 0 0">
        <div class="info-card">
          <div class="info-card-icon">📥</div>
          <div class="info-card-title">offsets (write-ahead log)</div>
          <div class="info-card-body">Before processing batch N, Spark writes the exact source offset range it WILL read (e.g. Kafka partition 3 offsets 847,050–847,195) to <code>offsets/N</code>. On restart it replays from the last planned-but-uncommitted batch, deterministically re-reading the same range.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">✅</div>
          <div class="info-card-title">commits</div>
          <div class="info-card-body">After the sink write succeeds, batch N is marked in <code>commits/N</code>. If a batch appears in offsets/ but not commits/, it was in-flight during a crash and is re-run — idempotent/transactional sinks make this exactly-once.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧊</div>
          <div class="info-card-title">state store</div>
          <div class="info-card-body">Stateful operators snapshot their keyed state per batch so recovery restores exact aggregation values. Never share one checkpoint dir between two queries — offsets and state would collide and corrupt both.</div>
        </div>
      </div>
    </div>`;

  /* ── Tab 3: Sources & Sinks ───────────────────────────────────────────────── */
  container.querySelector('#tab-io').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Kafka Source</div>
        <div class="section-desc">The canonical streaming source — offsets are tracked in the checkpoint, not committed back to Kafka</div>
      </div>
      <div style="max-width:800px;background:var(--bg2);border-radius:10px;padding:18px 20px">
        <div class="code-block"><span class="cmt"># Read from Kafka; startingOffsets applies only on the FIRST run of a</span>
<span class="cmt"># new checkpoint — afterwards Spark resumes from committed offsets.</span>
raw = (spark.readStream
  .format(<span class="str">"kafka"</span>)
  .option(<span class="str">"kafka.bootstrap.servers"</span>, <span class="str">"b-1.msk:9092"</span>)
  .option(<span class="str">"subscribe"</span>, <span class="str">"orders"</span>)
  .option(<span class="str">"startingOffsets"</span>, <span class="str">"earliest"</span>)   <span class="cmt"># or "latest" / explicit JSON per partition</span>
  .option(<span class="str">"maxOffsetsPerTrigger"</span>, <span class="num">500000</span>)   <span class="cmt"># rate limit → back-pressure</span>
  .option(<span class="str">"failOnDataLoss"</span>, <span class="str">"true"</span>)
  .load())

<span class="cmt"># key/value arrive as binary; parse the JSON payload</span>
<span class="kw">from</span> pyspark.sql.functions <span class="kw">import</span> col, from_json
orders = (raw
  .select(from_json(col(<span class="str">"value"</span>).cast(<span class="str">"string"</span>), order_schema).alias(<span class="str">"d"</span>),
          col(<span class="str">"timestamp"</span>).alias(<span class="str">"kafka_ts"</span>))
  .select(<span class="str">"d.*"</span>, <span class="str">"kafka_ts"</span>))</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6"><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">startingOffsets</code> is a bootstrap option — it is <strong>ignored once the checkpoint has committed offsets</strong>. To reprocess, point the stream at a fresh checkpoint. Accepts <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">earliest</code>, <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">latest</code>, or per-partition JSON like <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">{"orders":{"0":847000}}</code>.</div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Delta Sink + Upserts via foreachBatch</div>
        <div class="section-desc">Streaming append is trivial; upserts/SCD need MERGE, which only exists in the batch API — <code>foreachBatch</code> bridges the two</div>
      </div>
      <div style="max-width:800px;background:var(--bg2);border-radius:10px;padding:18px 20px">
        <div class="code-block"><span class="kw">from</span> delta.tables <span class="kw">import</span> DeltaTable

<span class="kw">def</span> <span class="kw">upsert_to_delta</span>(micro_batch_df, batch_id):
    <span class="cmt"># dedupe within the batch so MERGE gets one row per key</span>
    latest = (micro_batch_df
        .withWatermark(<span class="str">"event_time"</span>, <span class="str">"10 minutes"</span>)
        .dropDuplicates([<span class="str">"order_id"</span>]))
    tgt = DeltaTable.forName(micro_batch_df.sparkSession, <span class="str">"silver.orders"</span>)
    (tgt.alias(<span class="str">"t"</span>)
        .merge(latest.alias(<span class="str">"s"</span>), <span class="str">"t.order_id = s.order_id"</span>)
        .whenMatchedUpdateAll(condition=<span class="str">"s.event_time > t.event_time"</span>)
        .whenNotMatchedInsertAll()
        .execute())

(orders.writeStream
    .foreachBatch(upsert_to_delta)     <span class="cmt"># runs batch MERGE per micro-batch</span>
    .option(<span class="str">"checkpointLocation"</span>, <span class="str">"s3://lake/_checkpoints/orders_upsert"</span>)
    .trigger(processingTime=<span class="str">"1 minute"</span>)
    .start())</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Spark may re-invoke <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">foreachBatch</code> for the same <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">batch_id</code> after a failure, so the write must be idempotent. MERGE keyed on <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">order_id</code> is naturally idempotent; re-running the same batch produces the same table state.</div>
      </div>
      <div class="tip" style="margin:16px 0 0;max-width:800px">Plain append to Delta (<code>.format("delta").toTable(...)</code>) is exactly-once on its own — Delta records the streaming <code>txnAppId</code>/<code>txnVersion</code> in each commit and rejects duplicate batch writes. You only reach for <code>foreachBatch</code> when you need MERGE, multiple sinks, or any batch-only operation inside the stream.</div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title">Auto Loader (cloudFiles) — incremental file ingestion</div>
        <div class="section-desc">Efficiently ingest billions of files landing in cloud storage, without re-listing the whole directory each run</div>
      </div>
      <div class="info-grid" style="padding:0">
        <div class="info-card">
          <div class="info-card-icon">📁</div>
          <div class="info-card-title">Two discovery modes</div>
          <div class="info-card-body"><strong>Directory listing</strong> (default) diffs the object store; <strong>File notification</strong> mode subscribes to S3 → SNS/SQS events for near-real-time, list-free discovery at massive scale. Discovered files are checkpointed via RocksDB so each file is processed once.</div>
          <div class="info-card-tag">once-per-file</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧬</div>
          <div class="info-card-title">Schema evolution</div>
          <div class="info-card-body">Infers and persists schema to <code>schemaLocation</code>. On a new column, <code>schemaEvolutionMode=addNewColumns</code> fails the batch, updates the stored schema, and the next auto-restart picks it up. Unexpected fields are captured in <code>_rescued_data</code> rather than dropped.</div>
          <div class="info-card-tag">no data loss</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚙️</div>
          <div class="info-card-title">cloudFiles format</div>
          <div class="info-card-body">It's just a streaming source: <code>readStream.format("cloudFiles")</code> with <code>cloudFiles.format</code> set to json/csv/parquet. Pairs with any sink — usually a Delta bronze table in a medallion pipeline.</div>
          <div class="info-card-tag">source only</div>
        </div>
      </div>
      <div style="max-width:800px;background:var(--bg2);border-radius:10px;padding:18px 20px;margin-top:16px">
        <div class="code-block"><span class="cmt"># Incrementally ingest JSON landing in S3 → Delta bronze, schema evolving</span>
bronze = (spark.readStream
  .format(<span class="str">"cloudFiles"</span>)
  .option(<span class="str">"cloudFiles.format"</span>, <span class="str">"json"</span>)
  .option(<span class="str">"cloudFiles.schemaLocation"</span>, <span class="str">"s3://lake/_schemas/orders"</span>)
  .option(<span class="str">"cloudFiles.schemaEvolutionMode"</span>, <span class="str">"addNewColumns"</span>)
  .option(<span class="str">"cloudFiles.useNotifications"</span>, <span class="str">"true"</span>)   <span class="cmt"># SQS-driven discovery</span>
  .load(<span class="str">"s3://landing/orders/"</span>))

(bronze.writeStream
  .option(<span class="str">"checkpointLocation"</span>, <span class="str">"s3://lake/_checkpoints/bronze_orders"</span>)
  .option(<span class="str">"mergeSchema"</span>, <span class="str">"true"</span>)
  .trigger(availableNow=<span class="kw">True</span>)         <span class="cmt"># drain everything, then stop (scheduled job)</span>
  .toTable(<span class="str">"bronze.orders"</span>))</div>
      </div>
    </div>`;

  /* ── Tab 4: Interview Q&A (preserved verbatim + one added) ─────────────────── */
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How do watermarks handle late-arriving data in Structured Streaming?',
      a: 'A watermark tells Spark the maximum expected lateness: .withWatermark("event_time", "10 minutes"). Spark tracks the maximum event_time seen across all partitions (the "watermark boundary"). Any event whose event_time is older than (max_event_time - watermark_delay) is considered late and dropped (or handled with dropDuplicates). State for time windows is kept until the watermark passes the window\'s end — then it\'s committed and freed. Without a watermark, Spark keeps state for ALL time, causing unbounded memory growth. Trade-off: a larger watermark = more late data accepted, but more memory held.'
    },
    {
      q: 'What is checkpointing in Structured Streaming and what does it store?',
      a: 'Checkpointing writes streaming query progress to durable storage (S3/ADLS) so a query can restart exactly where it left off after a failure. The checkpoint directory stores: (1) offsets — the source offset range for each micro-batch (e.g., Kafka partition offsets 847,050–847,195); (2) commits — which micro-batches have been successfully written; (3) state — aggregation state (for stateful queries). On restart, Spark reads the latest committed offset and resumes from there. Without checkpointing, a restart starts from scratch (or from latest offset) causing data loss or reprocessing. Location must be stable and unique per query — never share checkpoint dirs between queries.'
    },
    {
      q: 'How does Structured Streaming achieve end-to-end exactly-once semantics?',
      a: 'Exactly-once requires three cooperating pieces. (1) A REPLAYABLE source: Kafka and Auto Loader let Spark re-read a precise offset/file range. Before each batch, Spark records the exact range it will process in the checkpoint\'s offsets/ write-ahead log — so on restart it deterministically reads the same input again. (2) DETERMINISTIC processing: the query and its state store snapshots are recovered from the checkpoint so re-running a batch yields identical output. (3) An IDEMPOTENT or TRANSACTIONAL sink: the Delta sink writes the streaming appId + batchId (txnVersion) into each commit and refuses to apply the same batchId twice; foreachBatch upserts use MERGE keyed on a business key so re-running is a no-op. A batch that appears in offsets/ but not commits/ was in-flight during a crash and is safely re-executed. Break any leg — a non-replayable source, non-deterministic logic like a random/current-timestamp key, or an at-least-once sink like a plain REST POST — and you drop to at-least-once.'
    },
  ]);
}
