// M04 · Sources & Schema — Architecture
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

const IQ = [
  { q: 'What streaming sources does Structured Streaming support, and which are production-grade?', a: '<p><b>Production:</b> <b>Kafka</b> (replayable offsets, the default for anything serious), file sources (<b>auto-loader</b>/cloudFiles on Databricks, or the open-source file source), and Kinesis/Event Hubs via connectors. <b>Testing only:</b> <code>rate</code> (synthetic rows/sec), <code>socket</code> (text over TCP) — neither is replayable, so they give <b>no fault-tolerance</b>. The real question is always: <i>does the source provide replayable offsets?</i> Kafka does; socket does not.</p>', tip: 'Split by replayability. Kafka/files = fault-tolerant; rate/socket = demo only. That distinction is the whole point.' },
  { q: 'Why must a streaming source be replayable?', a: '<p>Exactly-once (and even at-least-once) recovery works by <b>re-reading a batch\'s offset range</b> after a failure. If the source can\'t be asked for "give me records from offset X to Y again," a crash loses the in-flight batch. Kafka retains data and serves any offset range; a socket throws the bytes away once read. That\'s why <code>socket</code>/<code>rate</code> are unusable in production.</p>', tip: 'Replayable = the checkpoint\'s offset log can actually be acted on. No replay, no recovery.' },
  { q: 'How does schema handling differ for streaming vs batch reads?', a: '<p>Batch can <b>infer</b> schema by scanning files. Streaming <b>cannot infer by default</b> — it would need to peek at unbounded future data — so you must <b>supply the schema explicitly</b> (e.g. <code>.schema(ordersSchema)</code> for file sources). Kafka always returns a <b>fixed binary schema</b> (key, value, topic, partition, offset, timestamp); you parse the <code>value</code> yourself with <code>from_json</code>/<code>from_avro</code> against your schema.</p>', tip: 'Streaming = schema is explicit. Kafka gives you bytes; you own the parse. Mention from_json / schema registry.' },
  { q: 'What columns does the Kafka source expose?', a: '<p><code>key</code> (binary), <code>value</code> (binary — your payload), <code>topic</code>, <code>partition</code>, <code>offset</code>, <code>timestamp</code>, and <code>timestampType</code>. The <b>event body is in <code>value</code></b> as bytes — you <code>CAST(value AS STRING)</code> then <code>from_json(..., schema)</code>, or use <code>from_avro</code> with a Schema Registry. Kafka\'s <code>timestamp</code> is the <b>broker/producer time</b>, not necessarily your business event time — extract event time from the parsed payload (M07).</p>', tip: 'Six columns; payload lives in value as bytes. And Kafka timestamp ≠ your event time — a classic trap.' },
  { q: 'How do you control how much data each micro-batch pulls (backpressure)?', a: '<p>With explicit source limits — Kafka <code>maxOffsetsPerTrigger</code> (cap records/batch) or <code>maxBytesPerTrigger</code>; file source <code>maxFilesPerTrigger</code>. This bounds batch size so processing stays under the trigger interval after a lag spike. Structured Streaming has <b>no automatic backpressure</b> like old DStreams — you set the cap deliberately (M20).</p>', tip: 'maxOffsetsPerTrigger / maxFilesPerTrigger. Emphasize: explicit, not automatic.' },
  { q: 'Where does a Kafka read start — earliest, latest, or specific offsets?', a: '<p><code>startingOffsets</code> = <code>latest</code> (default — only new data), <code>earliest</code> (whole retained topic), or a JSON of specific per-partition offsets. But <b>this only applies on the first run</b>: once a checkpoint exists, Spark <b>ignores startingOffsets and resumes from the committed offset</b>. To re-read from earliest you must use a fresh checkpoint.</p>', tip: 'startingOffsets matters only on first start; after that the checkpoint wins. A very common gotcha.' },
  { q: 'What happens if a new field appears in the incoming JSON (schema evolution)?', a: '<p>With a fixed <code>from_json</code> schema, <b>unknown fields are dropped</b> and missing fields become <code>null</code> — the query keeps running (safe but you silently lose the new field). To pick it up you update the schema and redeploy. Options like <b>schema-registry/Avro</b> enforce compatibility; Databricks auto-loader supports <code>schemaEvolutionMode</code> (addNewColumns/rescue). A malformed record under <code>from_json</code> yields <code>null</code> unless you add a corrupt-record column.</p>', tip: 'Fixed schema = extra fields dropped, missing = null, query survives. Mention rescued-data / schema registry for evolution.' },
  { q: 'File source vs Databricks Auto Loader — why prefer Auto Loader?', a: '<p>The plain file source lists the directory each trigger — <b>O(files) and slow</b> once a folder has millions of files. <b>Auto Loader</b> (<code>cloudFiles</code>) uses either incremental <b>file notifications</b> (cloud events) or an optimized <b>RocksDB-backed file-state log</b>, so it scales to huge directories, tracks processed files exactly-once, and supports schema inference + evolution. For cloud object storage it\'s the standard choice.</p>', tip: 'Directory listing doesn\'t scale; Auto Loader uses notifications + a file-state log. Scale is the reason.' },
  { q: 'Can you read from multiple topics / add a source to a running query?', a: '<p>One <code>readStream</code> can <b>subscribe to multiple topics</b> (<code>subscribe = "a,b"</code>) or a <code>subscribePattern</code> regex, and you can <b>union</b> several streaming DataFrames. But you <b>cannot add or remove a source from an existing query</b> — the set of sources is fixed in the checkpoint. Changing sources means a new query/checkpoint.</p>', tip: 'Multi-topic yes (subscribe/subscribePattern/union); changing the source set on a live query, no.' },
  { q: 'How do you parse an Avro Kafka payload with a Schema Registry?', a: '<p>Use <code>from_avro(value, schemaOrSubject, options)</code> with the Confluent Schema Registry URL in options; it strips the magic byte + schema id and decodes against the registered schema, giving you compile-time-ish safety and enforced <b>compatibility rules</b> (backward/forward). This is the robust alternative to hand-written JSON schemas when many producers evolve independently.</p>', tip: 'from_avro + Schema Registry = enforced compatibility. The grown-up answer to schema evolution.' },
  { q: 'What is the "rate" source good for, and why never in prod?', a: '<p><code>rate</code> emits <code>(timestamp, value)</code> at <code>rowsPerSecond</code> — perfect for <b>benchmarking, demos and testing</b> windowing/watermark logic without wiring Kafka. It\'s <b>not replayable</b> and generates synthetic data, so it gives no fault tolerance and no real business meaning — strictly a sandbox tool.</p>', tip: 'rate = synthetic generator for tests/benchmarks. Not replayable → never production.' },
];

const SOURCES = {
  kafka: {
    name: 'Kafka', emoji: '📨', grade: 'Production',
    replay: 'Yes — replayable offsets', schema: 'Fixed binary (key/value/…); you parse value',
    rate: 'maxOffsetsPerTrigger / maxBytesPerTrigger',
    desc: 'The default production source. Durable, partitioned log; the source exposes a replayable offset range per partition, which the checkpoint records. Payload arrives as bytes in <code>value</code> — you decode it with <code>from_json</code> / <code>from_avro</code> against your own schema.',
    good: true,
  },
  files: {
    name: 'Files / Auto Loader', emoji: '📁', grade: 'Production',
    replay: 'Yes — file-state log tracks processed files',
    schema: 'Explicit schema required (or Auto Loader inference)',
    rate: 'maxFilesPerTrigger',
    desc: 'Reads new files landing in a directory (JSON/CSV/Parquet/Delta). Plain file source lists the dir each trigger (slow at scale); <b>Auto Loader</b> (<code>cloudFiles</code>) uses notifications + a RocksDB file-state log and supports schema evolution — the standard for cloud object storage.',
    good: true,
  },
  rate: {
    name: 'Rate', emoji: '⏱️', grade: 'Testing only',
    replay: 'No — synthetic, not replayable',
    schema: 'Fixed (timestamp, value)', rate: 'rowsPerSecond',
    desc: 'Generates synthetic <code>(timestamp, value)</code> rows at a fixed rate. Ideal for benchmarking and for exercising windowing/watermark logic without Kafka. <b>Not replayable</b> and carries no business meaning — demos and tests only.',
    good: false,
  },
  socket: {
    name: 'Socket', emoji: '🔌', grade: 'Testing only',
    replay: 'No — bytes discarded once read',
    schema: 'Text lines (value: string)', rate: '—',
    desc: 'Reads text lines from a TCP socket (the classic word-count demo). The simplest way to see a stream move, but it throws data away after reading, so a crash loses the in-flight batch. <b>Never production.</b>',
    good: false,
  },
};

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>Everything a streaming query can recover from begins at the <b>source</b>. The single question that matters: <b>can the source replay an offset range on demand?</b> If yes, the checkpoint's offset log is actionable and you get fault tolerance. If no, a crash loses in-flight data.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>📨 Kafka — the default</h4><p>Replayable per-partition offsets. Returns a fixed binary schema; you decode <code>value</code> yourself. Rate-limit with <code>maxOffsetsPerTrigger</code>.</p></div>
      <div class="ss-card"><h4>📁 Files / Auto Loader</h4><p>New files in a dir. Auto Loader scales to millions of files via notifications + a file-state log, with schema evolution.</p></div>
      <div class="ss-card"><h4>⏱️ Rate (test)</h4><p>Synthetic rows/sec for benchmarks and windowing tests. Not replayable.</p></div>
      <div class="ss-card"><h4>🔌 Socket (test)</h4><p>Text lines over TCP. The demo source — discards data, no recovery.</p></div>
    </div>
    <h3>Schema is explicit, not inferred</h3>
    <p>Batch can scan files to infer a schema; streaming <b>can't peek at unbounded future data</b>, so you <b>supply the schema</b>. Kafka always hands you bytes in <code>value</code> — <code>CAST(value AS STRING)</code> then <code>from_json(value, schema)</code> (or <code>from_avro</code> + Schema Registry). Extra incoming fields are dropped, missing ones become <code>null</code>, malformed rows become <code>null</code> — the query keeps running, which is safe but silent.</p>
    <div class="ss-callout"><b>startingOffsets gotcha:</b> <code>earliest</code>/<code>latest</code> apply only on the <i>first</i> run. Once a checkpoint exists, Spark resumes from the <b>committed offset</b> and ignores <code>startingOffsets</code>. Re-reading from earliest needs a fresh checkpoint.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Pick a source and see whether it survives a crash, how its schema works, and how you rate-limit it. The replayability verdict is the one that decides production-readiness.</p></div>
  <div class="ss-controls" id="m04-src-btns">
    ${Object.entries(SOURCES).map(([k, s], i) => `<button class="ss-btn${i === 0 ? ' primary' : ''}" data-src="${k}">${s.emoji} ${s.name}</button>`).join('')}
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Grade</div><div class="v" id="m04-grade" style="font-size:15px">—</div></div>
    <div class="ss-metric"><div class="k">Replayable?</div><div class="v" id="m04-replay" style="font-size:13px">—</div></div>
    <div class="ss-metric"><div class="k">Rate limit knob</div><div class="v" id="m04-rate" style="font-size:12px">—</div></div>
  </div>
  <div class="ss-callout" id="m04-desc">—</div>
  <div class="ss-callout" id="m04-crash" style="border-left-color:var(--yellow,#F59E0B)">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's ingestion layer</h3>
    <p>ShopStream's order service and web app both publish to <b>Kafka</b>: <code>shopstream.orders</code> (24 partitions) and <code>shopstream.clicks</code> (48 partitions). Each message's <code>value</code> is JSON; the revenue pipeline decodes it with a fixed <code>from_json</code> schema and extracts <b>event time</b> from the payload's <code>ts</code> field — <i>not</i> Kafka's broker timestamp, which can lag during producer retries.</p>
    <p>During the Black Friday spike the consumer fell behind by 40M offsets. Because the job sets <code>maxOffsetsPerTrigger = 2.5M</code>, each micro-batch stayed bounded and finished under the 10s trigger, so the pipeline <b>caught up steadily</b> instead of trying to process 40M rows in one giant batch and timing out.</p>
    <div class="ss-callout">A nightly <b>catalog export</b> lands as Parquet files in S3; ShopStream reads it with <b>Auto Loader</b> (<code>cloudFiles</code>) so adding new product columns doesn't break the stream — schema evolution adds the columns and keeps going.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>A real Kafka read + JSON decode, with event time pulled from the payload and an explicit rate limit:</p></div>
  ${codeBlock('PySpark', `from pyspark.sql.functions import from_json, col, to_timestamp
from pyspark.sql.types import StructType, StringType, DoubleType, LongType

order_schema = (StructType()
    .add("order_id", StringType()).add("category", StringType())
    .add("amount", DoubleType()).add("ts", LongType()))   # ts = event time (epoch ms)

raw = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "shopstream.orders")
    .option("startingOffsets", "latest")        # first run only; checkpoint wins after
    .option("maxOffsetsPerTrigger", 2500000)    # explicit backpressure
    .load())

orders = (raw
    .select(from_json(col("value").cast("string"), order_schema).alias("o"))
    .select("o.*")
    .withColumn("event_time", to_timestamp(col("ts") / 1000)))  # NOT kafka 'timestamp'`)}
  ${codeBlock('Scala', `val raw = spark.readStream.format("kafka")
  .option("kafka.bootstrap.servers", "broker:9092")
  .option("subscribe", "shopstream.orders")
  .option("maxOffsetsPerTrigger", 2500000)
  .load()

val orders = raw
  .select(from_json($"value".cast("string"), orderSchema).as("o"))
  .select("o.*")
  .withColumn("event_time", to_timestamp($"ts" / 1000))`)}
  ${codeBlock('Auto Loader (files) + schema evolution', `catalog = (spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "parquet")
    .option("cloudFiles.schemaLocation", "s3://shopstream/chk/catalog_schema")
    .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
    .load("s3://shopstream/catalog/"))`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M04 · Architecture',
    title: 'Sources & Schema',
    subtitle: 'Replayable vs not, explicit schemas, Kafka decoding, and backpressure',
    definition: {
      formal: 'A streaming source supplies input as a sequence of replayable offset ranges; Structured Streaming records those offsets in the checkpoint so a batch can be re-read after failure. Schemas must be supplied explicitly (streaming cannot infer from unbounded data); Kafka returns a fixed binary schema whose payload you decode with from_json/from_avro, and input volume per batch is bounded by explicit rate-limit options.',
      easy: 'The source is where data comes in. If it can replay old data on request (like Kafka), your pipeline can crash and recover; if it throws data away after reading (like a socket), it can\'t. You always tell Spark the shape of the data yourself, and you cap how much each batch pulls so a backlog doesn\'t swamp the cluster.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🔗 Source Explorer', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const grade = container.querySelector('#m04-grade');
  const replay = container.querySelector('#m04-replay');
  const rate = container.querySelector('#m04-rate');
  const desc = container.querySelector('#m04-desc');
  const crash = container.querySelector('#m04-crash');

  function selectSrc(k) {
    const s = SOURCES[k];
    grade.textContent = s.grade;
    grade.style.color = s.good ? 'var(--green,#10B981)' : 'var(--yellow,#F59E0B)';
    replay.textContent = s.replay;
    rate.textContent = s.rate;
    desc.innerHTML = `<b>${s.emoji} ${esc(s.name)} — schema:</b> ${s.schema}.<br>${s.desc}`;
    crash.innerHTML = s.good
      ? '💥 <b>Crash test:</b> a failure mid-batch is safe — Spark re-reads the same offset range from the source on restart. <b>No data loss.</b>'
      : '💥 <b>Crash test:</b> a failure mid-batch <b>loses the in-flight data</b> — the source cannot replay it. Fine for a demo, unusable in production.';
    container.querySelectorAll('#m04-src-btns .ss-btn').forEach((b) =>
      b.classList.toggle('primary', b.dataset.src === k));
  }
  container.querySelector('#m04-src-btns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]'); if (b) selectSrc(b.dataset.src);
  });
  selectSrc('kafka');
}

export default { mount };
