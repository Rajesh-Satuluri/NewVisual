// Databricks streaming curriculum (Gate 5c). Facts validated I51 against official
// Databricks docs + Spark docs (docs/technical-accuracy-review.md §5). Authored at the
// full 4-tab depth from the start — Concept · Mechanics · In-scenario · Interview Q&A —
// matching the Kafka/Flink bar. Scenario tokens {ENTITY}/{KEY}/{ID} are filled live.
import { iqSection, flowDiagram, compareTable, codeBlock } from '../components/lesson-shell.js';

const T = (concept, mechanics, scenario, iq) => ([
  { id: 'why', label: '📖 Concept', body: concept },
  { id: 'mech', label: '🔧 Mechanics', body: mechanics },
  { id: 'scn', label: '🎬 In your scenario', body: scenario },
  { id: 'iq', label: '🎯 Interview Q&A', body: iqSection(iq) },
]);

export const DATABRICKS = {
  id: 'databricks', name: 'Databricks', icon: '🧮', accent: '#FF3621',
  blurb: 'Streaming on Databricks — Structured Streaming, Auto Loader, Delta Lake, Lakeflow Declarative Pipelines (formerly DLT) and the medallion architecture. Every fact validated against official Databricks docs.',
  modules: [

    // ── 01 ────────────────────────────────────────────────────────────────
    { id: 'databricks01', num: '01', icon: '🗺️', title: 'Databricks streaming landscape', idea: 'One lakehouse engine for ingest, process, and serve — Structured Streaming on Delta, orchestrated by Lakeflow.',
      tabs: T(
        `<h3>The lakehouse approach to streaming</h3>
         <p>Kafka/Flink and the cloud brokers you've seen treat the <i>log</i> and the <i>processor</i> as
         separate systems. Databricks takes a different angle: the same <b>Delta</b> tables are both your
         <i>storage</i> and a <b>streaming source and sink</b>, and the same <b>Spark Structured Streaming</b>
         engine runs your batch and streaming code with one API.</p>
         <ul class="clean">
           <li><b>Structured Streaming</b> — the streaming engine (micro-batch by default). Your "stream" is a DataFrame that never stops growing.</li>
           <li><b>Delta Lake</b> — ACID storage layer; a Delta table can be read as a stream and written to as a stream.</li>
           <li><b>Auto Loader</b> — incrementally ingests files landing in cloud storage, exactly once.</li>
           <li><b>Lakeflow Declarative Pipelines</b> (formerly <b>Delta Live Tables / DLT</b>) — declarative pipelines with built-in quality checks and orchestration.</li>
           <li><b>Unity Catalog</b> — governance + lineage · <b>Photon</b> — the vectorized C++ query engine.</li>
         </ul>
         <div class="lx-callout lx-info"><b>Mental model.</b><div>It's the same streaming backbone from Foundations —
         ingest → process → serve — but the <i>table is the stream</i>. You write SQL/PySpark, not a bespoke job.</div></div>`,
        `<h3>How data flows</h3>
         ${flowDiagram(['Sources (Kafka / files / Delta)', 'Auto Loader / readStream', 'Structured Streaming', 'Delta tables (bronze→silver→gold)', 'BI / ML / serving'])}
         <h3>Pick the right tool</h3>
         ${compareTable(['Need', 'Use'], [
           ['Ingest files landing in S3/ADLS/GCS', 'Auto Loader (cloudFiles)'],
           ['Read a message broker', 'Structured Streaming Kafka / Event Hubs / Kinesis source'],
           ['Stateful processing (windows, joins, dedup)', 'Structured Streaming on a cluster'],
           ['Declarative, managed, quality-checked pipeline', 'Lakeflow Declarative Pipelines (DLT)'],
           ['Store + serve with ACID + time travel', 'Delta Lake tables'],
         ])}
         <div class="lx-callout lx-warn"><b>Framing note.</b><div>Databricks Structured Streaming is
         <b>micro-batch by default</b> — it processes small batches on a trigger, not one event at a time like
         Flink's native streaming. A separate low-latency "real-time mode" exists; OSS continuous mode is not supported here.</div></div>`,
        `<h3>{ID} on Databricks</h3>
         <p>For the <b>{ENTITY}</b> stream, {ENTITY} events land from the broker (or files) and
         <b>readStream</b> pulls them into a <b>bronze</b> Delta table keyed on <code>{KEY}</code>.
         Structured Streaming cleans and aggregates into <b>silver</b> and <b>gold</b> tables; a serving
         layer and BI dashboards read gold. One Lakeflow pipeline orchestrates the whole chain and checks
         quality at each hop.</p>`,
        [
          { q: 'How is Databricks streaming different from running Flink?', a: 'Databricks uses <b>Spark Structured Streaming</b>, which is <b>micro-batch by default</b> — it processes data in small batches on a trigger interval rather than one event at a time. The same API covers batch and streaming, and Delta tables double as source and sink. Flink is natively per-event with lower tail latency; Databricks trades a little latency for a unified lakehouse and SQL-first ergonomics.' },
          { q: 'What makes Delta central to streaming here?', a: 'A <b>Delta table is both a streaming source and sink</b> with ACID guarantees. That lets you chain streams table-to-table (the medallion pattern), get <b>exactly-once</b> on Delta-to-Delta pipelines, and use <b>time travel</b> to reprocess — without a separate log system.' },
          { q: 'What is Lakeflow Declarative Pipelines?', a: 'It\'s the <b>rebrand of Delta Live Tables (DLT)</b>: a declarative framework where you define streaming tables and materialized views and the platform manages orchestration, dependencies, retries, and data-quality <b>expectations</b>. Existing DLT code runs with no migration.' },
        ]),
    },

    // ── 02 ────────────────────────────────────────────────────────────────
    { id: 'databricks02', num: '02', icon: '🏞️', title: 'The lakehouse & Delta Lake', idea: 'Delta adds ACID transactions, schema enforcement, and time travel on top of cheap object storage.',
      tabs: T(
        `<h3>Why Delta exists</h3>
         <p>A plain "data lake" (Parquet files in S3) is cheap but has no transactions: a partial write,
         two concurrent writers, or a reader catching a half-written directory all corrupt your view.
         <b>Delta Lake</b> is a storage layer over those same Parquet files that adds a <b>transaction log</b>
         (the <code>_delta_log</code>) to give you database guarantees on object storage.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">What Delta adds</div><ul class="clean">
           <li><b>ACID transactions</b> — writes are all-or-nothing; readers always see a consistent snapshot.</li>
           <li><b>Schema enforcement</b> — rejects writes that don't match the table schema; opt-in schema evolution.</li>
           <li><b>Time travel</b> — query or restore any past version by version number or timestamp.</li>
           <li><b>Streaming source & sink</b> — read a table as a stream; append a stream to a table.</li>
           <li><b>Upserts/deletes</b> — <code>MERGE</code>, <code>UPDATE</code>, <code>DELETE</code> on files.</li>
         </ul></div>`,
        `<h3>The transaction log</h3>
         <p>Every commit writes a JSON entry to <code>_delta_log</code> describing which Parquet files were
         added/removed. Readers replay the log to compute the current snapshot; this is how Delta gets
         atomicity and snapshot isolation without locking.</p>
         ${flowDiagram(['Writer commits', '_delta_log/00..N.json', 'Snapshot = add − remove files', 'Reader sees consistent version'])}
         <h3>Time travel</h3>
         ${codeBlock('sql', `-- by version\nSELECT * FROM {ENTITY}s VERSION AS OF 42;\n-- by timestamp\nSELECT * FROM {ENTITY}s TIMESTAMP AS OF '2026-10-10';\n-- restore after a bad run\nRESTORE TABLE {ENTITY}s TO VERSION AS OF 42;`)}
         ${compareTable(['Capability', 'Plain Parquet lake', 'Delta Lake'], [
           ['ACID writes', '❌', '✅'],
           ['Concurrent writers', 'corruption risk', 'serialized via log'],
           ['Time travel / rollback', '❌', '✅'],
           ['Streaming source/sink', '❌', '✅'],
           ['MERGE / UPDATE / DELETE', '❌', '✅'],
         ])}`,
        `<h3>{ID} on Delta</h3>
         <p>Raw <b>{ENTITY}</b> events append to a bronze Delta table. Because writes are ACID, a failed
         streaming batch never leaves a half-written partition for downstream jobs to trip over. If a bad
         deployment corrupts the silver <b>{ENTITY}</b> table, you <code>RESTORE</code> it to the version
         before the deploy and replay — no backups to juggle. Analysts can even query "<b>{ENTITY}</b> state
         as of yesterday 6pm" with <code>TIMESTAMP AS OF</code>.</p>`,
        [
          { q: 'How does Delta give ACID on object storage without locks?', a: 'Via the <b>transaction log</b> (<code>_delta_log</code>). Each commit atomically writes a numbered log entry listing files added/removed. Readers compute a snapshot by replaying the log, so they always see a consistent version; concurrent writers are serialized through <b>optimistic concurrency</b> on the log, not file locks.' },
          { q: 'What is schema enforcement vs schema evolution?', a: '<b>Enforcement</b>: Delta rejects a write whose columns/types don\'t match the table schema, preventing silent corruption. <b>Evolution</b>: you opt in (e.g. <code>mergeSchema</code>) to let new columns be added automatically. Enforcement is the default safety net; evolution is the controlled escape hatch.' },
          { q: 'When is time travel actually used in streaming?', a: 'Rollback after a bad pipeline run (<code>RESTORE</code>), reproducible reprocessing (pin a source version), auditing/debugging ("what did the table look like when this alert fired"), and GDPR-style point-in-time queries. It relies on retained file versions, so it\'s bounded by your <code>VACUUM</code> retention.' },
        ]),
    },

    // ── 03 ────────────────────────────────────────────────────────────────
    { id: 'databricks03', num: '03', icon: '🔁', title: 'Delta as a streaming source & sink', idea: 'A Delta table is a replayable, ordered stream — read it with readStream, write to it with writeStream.',
      tabs: T(
        `<h3>The table is the stream</h3>
         <p>This is the idea that makes the lakehouse tick: you can <b>read</b> a Delta table as an unbounded
         stream (new appended files become new records) and <b>write</b> a stream into a Delta table. Chaining
         these gives the medallion pipeline — bronze stream → silver table → silver stream → gold table — with
         ACID and exactly-once between each hop.</p>
         <div class="lx-callout lx-info"><b>Why this matters.</b><div>You don't need Kafka <i>between</i> your
         own processing stages. Delta itself is the durable, replayable log connecting them.</div></div>`,
        `<h3>Read & write</h3>
         ${codeBlock('python', `# Delta table as a streaming SOURCE\nbronze = (spark.readStream\n            .format("delta")\n            .table("{ENTITY}s_bronze"))\n\n# Delta table as a streaming SINK\n(bronze.writeStream\n   .format("delta")\n   .option("checkpointLocation", "/chk/{ENTITY}s_silver")\n   .outputMode("append")\n   .trigger(availableNow=True)\n   .toTable("{ENTITY}s_silver"))`)}
         <h3>Controlling the read rate</h3>
         ${compareTable(['Option', 'Effect'], [
           ['maxFilesPerTrigger', 'Cap files processed per micro-batch'],
           ['maxBytesPerTrigger', 'Cap bytes processed per micro-batch (soft)'],
           ['startingVersion / startingTimestamp', 'Where to begin reading the table'],
           ['ignoreChanges / skipChangeCommits', 'Handle updates/deletes in the source table'],
         ])}
         <div class="lx-callout lx-warn"><b>Append-mostly.</b><div>Streaming reads of Delta assume
         <b>appends</b>. Updates/deletes in the source need <code>skipChangeCommits</code> (ignore them) or
         Change Data Feed (process them) — a plain stream read can otherwise error on non-append commits.</div></div>`,
        `<h3>{ID} through the medallion</h3>
         <p>The bronze <b>{ENTITY}</b> table is written by the ingest stream and simultaneously <i>read</i> as a
         stream by the silver job, which cleans and dedupes. The silver table is in turn read by the gold job
         that computes per-<code>{KEY}</code> aggregates. Each arrow is a Delta-to-Delta stream with its own
         checkpoint — so the whole chain is exactly-once and independently restartable.</p>`,
        [
          { q: 'What does it mean that "a Delta table is a stream"?', a: 'New files appended to the table become new streaming records on the next trigger. <code>spark.readStream.table(...)</code> tails the transaction log for appends, so a table written by one job is a live source for the next — no external broker needed between stages.' },
          { q: 'What happens if the source Delta table gets UPDATEs or DELETEs?', a: 'A plain streaming read expects appends and will <b>fail</b> on non-append commits. Use <code>skipChangeCommits</code> to ignore them, <code>ignoreChanges</code> to re-emit touched files (with possible duplicates you must handle), or <b>Change Data Feed</b> to consume row-level changes properly.' },
          { q: 'Why chain Delta-to-Delta instead of using Kafka between stages?', a: 'Delta is already a durable, replayable, ordered log with ACID and <b>exactly-once</b> between stages via checkpoints. Keeping intermediate state in Delta means fewer systems, built-in time travel/reprocessing, and SQL access to every layer — you add Kafka only at the true ingress edge.' },
        ]),
    },

    // ── 04 ────────────────────────────────────────────────────────────────
    { id: 'databricks04', num: '04', icon: '🧩', title: 'Structured Streaming model', idea: 'Treat a stream as an unbounded table; the engine keeps results incrementally correct.',
      tabs: T(
        `<h3>The unbounded table abstraction</h3>
         <p>Structured Streaming's core idea: a data stream is an <b>unbounded input table</b> that grows
         forever. You write the <i>same</i> DataFrame/SQL query you'd write against a static table, and the
         engine incrementally updates a <b>result table</b> as new rows arrive — you never reason about
         individual messages or offsets by hand.</p>
         ${flowDiagram(['Input table (grows)', 'Your query (batch-like)', 'Result table', 'Output (sink)'])}
         <div class="lx-callout lx-info"><b>One API, two modes.</b><div>The exact same code runs as a batch job
         over a bounded table or as a streaming job over an unbounded one. That's the "unified" promise.</div></div>`,
        `<h3>The micro-batch loop</h3>
         <p>By default the engine runs a loop: on each <b>trigger</b> it figures out the new input since the
         last batch (via the checkpoint's offsets), runs the query incrementally, writes results to the sink,
         and commits progress. Each iteration is a <b>micro-batch</b>.</p>
         ${flowDiagram(['Trigger fires', 'Read new offsets', 'Incremental compute', 'Write to sink', 'Commit to checkpoint'])}
         ${codeBlock('python', `df = (spark.readStream.format("kafka")\n        .option("subscribe", "{ENTITY}s").load())\n\nresult = (df.selectExpr("CAST(value AS STRING)")\n            .groupBy("{KEY}").count())\n\n(result.writeStream\n   .outputMode("update")\n   .option("checkpointLocation", "/chk/{ENTITY}s")\n   .toTable("{ENTITY}_counts"))`)}`,
        `<h3>{ID} as an unbounded table</h3>
         <p>Think of every <b>{ENTITY}</b> event as a new row appended to an infinite table. A query like
         "count events per <code>{KEY}</code>" is written exactly as it would be for a one-off batch report —
         the engine just keeps the counts current as new <b>{ENTITY}</b> rows stream in. The same notebook you
         prototyped on yesterday's data runs unchanged in production as a live stream.</p>`,
        [
          { q: 'What is the central abstraction of Structured Streaming?', a: 'A stream is modeled as an <b>unbounded input table</b> that grows as data arrives. You express computation as a normal (batch-style) query; the engine maintains a <b>result table</b> incrementally. This removes manual offset/record handling and unifies batch and streaming code.' },
          { q: 'What is a micro-batch?', a: 'One iteration of the engine\'s loop: on a trigger it reads the new input since the last committed offsets, runs the query incrementally, writes to the sink, and commits progress to the checkpoint. Databricks is micro-batch by default; batches can be as frequent as the trigger allows (processingTime=0 = back-to-back).' },
          { q: 'How can the same code be batch and streaming?', a: 'Because the query is written against the table abstraction, not against a stream API. <code>spark.read</code> gives a bounded table (batch); <code>spark.readStream</code> gives an unbounded one (streaming). The transformation logic in between is identical, which is the "unified analytics" selling point.' },
        ]),
    },

    // ── 05 ────────────────────────────────────────────────────────────────
    { id: 'databricks05', num: '05', icon: '📥', title: 'Reading from brokers', idea: 'Kafka, Event Hubs, and Kinesis all plug in as Structured Streaming sources.',
      tabs: T(
        `<h3>Brokers as sources</h3>
         <p>Structured Streaming reads message brokers directly. The most common is the <b>Kafka</b> source,
         which also works against <b>Azure Event Hubs</b> (via its Kafka protocol surface) and <b>Amazon MSK</b>.
         <b>Kinesis</b> has its own connector. The broker gives you the durable, replayable log; Databricks
         gives you the processing.</p>
         <div class="lx-callout lx-info"><b>Division of labor.</b><div>The broker owns ordering, retention, and
         offsets. Structured Streaming owns stateful transformation and delivery into Delta.</div></div>`,
        `<h3>The Kafka source</h3>
         ${codeBlock('python', `raw = (spark.readStream.format("kafka")\n   .option("kafka.bootstrap.servers", "...:9092")\n   .option("subscribe", "{ENTITY}s")\n   .option("startingOffsets", "latest")   # or earliest / JSON\n   .option("maxOffsetsPerTrigger", 500000) # rate limit\n   .load())\n\n# value is binary; parse your payload\nevents = raw.selectExpr(\n  "CAST(key AS STRING)   AS {KEY}",\n  "CAST(value AS STRING) AS json",\n  "timestamp AS kafka_ts")`)}
         ${compareTable(['Column from Kafka source', 'Meaning'], [
           ['key / value', 'Raw bytes — cast & parse yourself'],
           ['topic / partition / offset', 'Provenance of each record'],
           ['timestamp', 'Kafka record timestamp (not your event time)'],
         ])}
         ${compareTable(['Broker', 'How to connect'], [
           ['Apache Kafka / MSK', 'format("kafka") + bootstrap.servers'],
           ['Azure Event Hubs', 'Kafka protocol endpoint via format("kafka")'],
           ['Amazon Kinesis', 'Kinesis connector (format("kinesis"))'],
         ])}`,
        `<h3>Ingesting {ID}</h3>
         <p>The <b>{ENTITY}</b> topic is read with the Kafka source, keyed on <code>{KEY}</code>. The raw
         <code>value</code> bytes are parsed into typed columns and appended to the bronze Delta table. We set
         <code>maxOffsetsPerTrigger</code> so a backlog (say after a maintenance window) is drained in bounded
         micro-batches instead of one giant batch that blows up memory.</p>`,
        [
          { q: 'What columns does the Kafka source expose?', a: '<code>key</code> and <code>value</code> as <b>binary</b> (you cast/parse them), plus <code>topic</code>, <code>partition</code>, <code>offset</code>, and <code>timestamp</code> (the Kafka record timestamp — often not your business event time, so extract that from the payload).' },
          { q: 'How do you rate-limit a Kafka read?', a: '<code>maxOffsetsPerTrigger</code> caps records per micro-batch. It\'s essential when recovering from a backlog so each batch stays bounded in memory/time instead of attempting to process everything at once.' },
          { q: 'Can one connector read Event Hubs and MSK?', a: 'Yes — the <b>Kafka</b> source works against Azure Event Hubs (which exposes a Kafka-protocol endpoint) and Amazon MSK (managed Kafka). Only native Kinesis needs its own connector. This portability is a reason teams standardize on the Kafka protocol.' },
        ]),
    },

    // ── 06 ────────────────────────────────────────────────────────────────
    { id: 'databricks06', num: '06', icon: '📂', title: 'Auto Loader (cloudFiles)', idea: 'Incrementally and exactly-once ingest files as they land in cloud storage.',
      tabs: T(
        `<h3>The file-ingestion problem</h3>
         <p>Lots of data arrives as <b>files dropped into object storage</b> — exports, logs, partner feeds.
         Naively re-listing the whole bucket each run is slow and risks double-processing. <b>Auto Loader</b>
         (the <code>cloudFiles</code> source) solves this: it tracks which files it has already seen and
         ingests only new ones, exactly once, with scalable discovery.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">What you get</div><ul class="clean">
           <li><b>Exactly-once</b> file ingestion (dedup via its own checkpoint).</li>
           <li><b>Scalable discovery</b> — directory listing or file-notification/events.</li>
           <li><b>Schema inference & evolution</b> built in.</li>
           <li>Handles millions of files without re-listing everything each trigger.</li>
         </ul></div>`,
        `<h3>Two discovery modes</h3>
         ${compareTable(['Mode', 'How it finds new files', 'Best for'], [
           ['Directory listing (default)', 'LISTs the directory each trigger', 'Small dirs, backfills, no setup'],
           ['File notification / file events', 'Cloud events push new-file notices', 'Large/busy dirs (recommended)'],
         ])}
         <div class="lx-callout lx-warn"><b>Why notification scales.</b><div>Directory listing must scan the
         whole source each trigger, so cost grows with directory size. File notification/events reacts to new
         files without re-listing — Databricks recommends it for large or high-volume directories.</div></div>
         ${codeBlock('python', `df = (spark.readStream.format("cloudFiles")\n   .option("cloudFiles.format", "json")\n   .option("cloudFiles.schemaLocation", "/chk/{ENTITY}s/schema")\n   # .option("cloudFiles.useManagedFileEvents", "true")  # scale\n   .load("s3://bucket/{ENTITY}s/incoming/"))\n\n(df.writeStream\n   .option("checkpointLocation", "/chk/{ENTITY}s/al")\n   .trigger(availableNow=True)\n   .toTable("{ENTITY}s_bronze"))`)}`,
        `<h3>{ID} from file drops</h3>
         <p>Suppose a partner delivers <b>{ENTITY}</b> extracts as hourly JSON files to a bucket. Auto Loader
         watches the drop folder and ingests each new file exactly once into the bronze <b>{ENTITY}</b> table —
         even if thousands of files accumulate overnight, it never re-lists the whole history. Pair it with
         <code>trigger(availableNow=True)</code> for a cheap "process everything new, then stop" scheduled run.</p>`,
        [
          { q: 'What problem does Auto Loader solve over a plain file read?', a: 'It <b>incrementally</b> ingests only new files, <b>exactly once</b>, tracking seen files in its own checkpoint. A plain read would re-list and re-process the whole directory, which is slow at scale and risks duplicates. Auto Loader also adds schema inference/evolution.' },
          { q: 'Directory listing vs file notification — when to use which?', a: '<b>Directory listing</b> (default) needs no setup but LISTs the directory each trigger, so cost grows with size — fine for small dirs or backfills. <b>File notification / file events</b> reacts to cloud new-file events without re-listing and is recommended for large/high-volume directories.' },
          { q: 'How does Auto Loader pair with trigger modes?', a: 'Commonly with <code>availableNow</code>: ingest all files that have arrived since the last run, then stop — ideal for scheduled incremental batch jobs. For always-on ingestion you use a continuously-running trigger instead.' },
        ]),
    },

    // ── 07 ────────────────────────────────────────────────────────────────
    { id: 'databricks07', num: '07', icon: '🧬', title: 'Schema inference & evolution', idea: 'Infer a schema once, then let new columns flow in safely — or quarantine the surprises.',
      tabs: T(
        `<h3>Schemas that change under you</h3>
         <p>Real feeds add fields over time. If your pipeline hard-codes a schema it breaks on the first new
         column; if it blindly accepts anything it silently corrupts downstream types. Auto Loader threads this
         needle: it <b>infers</b> a schema, persists it to a <b>schema location</b>, and <b>evolves</b> it by a
         policy you choose — while capturing anything it can't parse in a <code>_rescued_data</code> column.</p>`,
        `<h3>Evolution modes</h3>
         ${compareTable(['cloudFiles.schemaEvolutionMode', 'Behavior'], [
           ['addNewColumns (default)', 'New columns added to the schema; stream restarts to pick them up'],
           ['addNewColumnsWithTypeWidening', 'Also widens compatible types (e.g. int→long)'],
           ['rescue', 'Keep schema fixed; unexpected data goes to _rescued_data'],
           ['none', 'Ignore new columns entirely'],
           ['failOnNewColumns', 'Stop the stream when a new column appears'],
         ])}
         ${codeBlock('python', `df = (spark.readStream.format("cloudFiles")\n   .option("cloudFiles.format", "json")\n   .option("cloudFiles.schemaLocation", "/chk/{ENTITY}s/schema")\n   .option("cloudFiles.schemaEvolutionMode", "addNewColumns")\n   .option("cloudFiles.schemaHints", "amount double, ts timestamp")\n   .load("s3://bucket/{ENTITY}s/"))`)}
         <div class="lx-callout lx-info"><b>Two helpers.</b><div><code>schemaHints</code> pin types for known
         fields so inference can't guess wrong; <code>_rescued_data</code> is a JSON column that catches any
         field that didn't fit — so you never silently lose data.</div></div>`,
        `<h3>{ID} schema drift</h3>
         <p>When the <b>{ENTITY}</b> producers add a new field (say a loyalty flag), <code>addNewColumns</code>
         picks it up automatically on the next restart and it flows to bronze — no code change. We pin
         <code>{KEY}</code> and the timestamp via <code>schemaHints</code> so a stray value never re-types a
         critical column, and we alert on any growth in <code>_rescued_data</code> as an early warning that an
         upstream {ENTITY} format changed unexpectedly.</p>`,
        [
          { q: 'What is the default schema evolution mode and what does it do?', a: '<code>addNewColumns</code>: when a new column appears, Auto Loader adds it to the stored schema and the stream restarts to pick it up (run under a job so it auto-restarts). It requires <code>cloudFiles.schemaLocation</code> to persist the evolving schema.' },
          { q: 'What is _rescued_data for?', a: 'A column that captures any data that didn\'t match the inferred/declared schema — wrong types, extra fields in <code>rescue</code> mode, etc. It guarantees <b>no silent data loss</b>; you can inspect or alert on it to detect upstream format changes.' },
          { q: 'How do you stop inference from guessing a column wrong?', a: 'Use <code>cloudFiles.schemaHints</code> to pin types for known fields (e.g. <code>amount double</code>). Inference handles the rest, but your critical columns keep stable, intended types across files.' },
        ]),
    },

    // ── 08 ────────────────────────────────────────────────────────────────
    { id: 'databricks08', num: '08', icon: '⏱️', title: 'Event time & watermarks', idea: 'Use the event\'s own timestamp and a watermark to bound how long late data is accepted.',
      tabs: T(
        `<h3>Event time vs processing time</h3>
         <p>Same distinction as in Foundations and Flink: <b>event time</b> is when the {ENTITY} thing happened;
         <b>processing time</b> is when Databricks saw it. Networks and retries mean events arrive late and out
         of order. Correct windowed results must key off <b>event time</b> — and that forces the question: how
         long do we wait for stragglers before closing a window and freeing state?</p>
         <div class="lx-callout lx-info"><b>The answer is a watermark.</b><div>A watermark is a moving threshold:
         "I will not accept data older than (max event time seen − delay)." It bounds <b>state</b> and decides
         when results finalize.</div></div>`,
        `<h3>Declaring a watermark</h3>
         ${codeBlock('python', `from pyspark.sql.functions import window, col\n\n(events\n  .withWatermark("event_time", "10 minutes")   # allow 10 min lateness\n  .groupBy(window("event_time", "5 minutes"), "{KEY}")\n  .count())`)}
         ${compareTable(['Concept', 'Meaning'], [
           ['withWatermark(col, delay)', 'Declares event-time column + max lateness'],
           ['Watermark value', 'max(event_time seen) − delay'],
           ['Late data', 'Older than the watermark → dropped from stateful ops'],
           ['Global watermark', 'With multiple inputs, engine uses the slowest stream'],
         ])}
         <div class="lx-callout lx-warn"><b>Trade-off.</b><div>A longer delay catches more late data but holds
         state longer (more memory) and delays final results. Short delay = lean + fast but drops more
         stragglers. Tune to your real tail of lateness.</div></div>`,
        `<h3>Watermarking {ID}</h3>
         <p><b>{ENTITY}</b> events can arrive seconds-to-minutes late (mobile dead zones, retries). We extract
         the event's own timestamp, declare <code>withWatermark("event_time", "10 minutes")</code>, and window
         per <code>{KEY}</code>. A {ENTITY} event that shows up 12 minutes late falls outside the watermark and
         is excluded from the aggregate — a deliberate correctness/latency choice, not a bug — while state for
         closed windows is released so memory stays bounded.</p>`,
        [
          { q: 'What does a watermark actually control?', a: 'Two things: <b>when stateful results finalize</b> (a window can close once the watermark passes its end) and <b>how long state is retained</b> (state older than the watermark is dropped). It\'s the mechanism that lets an unbounded stream do bounded-memory stateful work.' },
          { q: 'What is the watermark\'s value at any moment?', a: '<code>max(event_time observed) − configured delay</code>. It only moves forward. Records with event time below the current watermark are considered too late for stateful operators and are dropped from them.' },
          { q: 'What happens with multiple input streams and watermarks?', a: 'Structured Streaming keeps a single <b>global watermark</b> driven by the <b>slowest</b> input. So one lagging source holds back finalization for all stateful operators — a reason to monitor per-source lateness.' },
        ]),
    },

    // ── 09 ────────────────────────────────────────────────────────────────
    { id: 'databricks09', num: '09', icon: '🪟', title: 'Windowed aggregations', idea: 'Tumbling, sliding, and session windows over event time, bounded by the watermark.',
      tabs: T(
        `<h3>Grouping time into windows</h3>
         <p>To answer "events per 5 minutes per <code>{KEY}</code>" you group the unbounded stream into
         <b>time windows</b>. Structured Streaming supports <b>tumbling</b> (fixed, non-overlapping),
         <b>sliding</b> (fixed size, overlapping by a slide interval), and <b>session</b> (gap-based, variable
         length) windows — all over event time and all bounded by the watermark.</p>`,
        `<h3>The three window types</h3>
         ${compareTable(['Window', 'Shape', 'Use for'], [
           ['Tumbling', 'Fixed size, no overlap (window(ts,"5 min"))', 'Per-interval totals'],
           ['Sliding', 'Fixed size, overlap (window(ts,"10 min","5 min"))', 'Moving averages / rolling metrics'],
           ['Session', 'Gap-based, variable (session_window(ts,"15 min"))', 'Activity bursts per key'],
         ])}
         ${codeBlock('python', `from pyspark.sql.functions import window, session_window, col\n\n# tumbling 5-min count per key\ntumbling = (events.withWatermark("event_time","10 minutes")\n  .groupBy(window("event_time","5 minutes"), "{KEY}").count())\n\n# session: close after 15 min of inactivity\nsessions = (events.withWatermark("event_time","20 minutes")\n  .groupBy(session_window("event_time","15 minutes"), "{KEY}")\n  .count())`)}
         <div class="lx-callout lx-info"><b>Windows + watermark.</b><div>A window's result finalizes once the
         watermark passes the window end. Until then it may update as late (but not-too-late) data lands.</div></div>`,
        `<h3>{ID} over windows</h3>
         <p><b>Tumbling</b>: count <b>{ENTITY}</b> events per 5-minute bucket per <code>{KEY}</code> for
         dashboards. <b>Sliding</b>: a 10-minute moving rate (slide 1 min) to catch spikes early for surge /
         demand signals. <b>Session</b>: group a <code>{KEY}</code>'s bursts of activity separated by 15-minute
         idle gaps — e.g. a continuous {ENTITY} session vs a new one after the driver/customer went quiet.</p>`,
        [
          { q: 'Tumbling vs sliding windows?', a: '<b>Tumbling</b> are fixed, non-overlapping buckets — each event belongs to exactly one (per-interval totals). <b>Sliding</b> have a size and a smaller slide, so they overlap and an event lands in several — used for rolling/moving metrics. Sliding windows cost more state because of the overlap.' },
          { q: 'What is a session window?', a: 'A <b>gap-based</b>, variable-length window that stays open while events keep arriving within a timeout and closes after a period of inactivity. Great for grouping bursts of activity per key (a user session, an active trip) without a fixed duration.' },
          { q: 'When does a window emit its final result?', a: 'Once the <b>watermark</b> passes the window\'s end time, the window is considered complete, its result finalizes, and its state is released. Before that, in update mode it can emit evolving partial results as more data arrives.' },
        ]),
    },

    // ── 10 ────────────────────────────────────────────────────────────────
    { id: 'databricks10', num: '10', icon: '🧠', title: 'Stateful streaming & the state store', idea: 'Aggregations, joins, and dedup keep state between batches — managed, checkpointed, and watermark-bounded.',
      tabs: T(
        `<h3>What "stateful" means</h3>
         <p>A stateless map/filter needs nothing from past batches. But a running count, a windowed aggregate,
         a stream-stream join, or deduplication must <b>remember</b> something across micro-batches. That memory
         is the <b>state store</b>: a keyed, versioned store the engine checkpoints so a restart resumes exactly
         where it left off.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">Stateful operations</div><ul class="clean">
           <li>Windowed & keyed <b>aggregations</b> (counts, sums, etc.).</li>
           <li><b>Stream-stream joins</b>.</li>
           <li><b>Deduplication</b> (<code>dropDuplicates</code>).</li>
           <li>Arbitrary state: <code>applyInPandasWithState</code> / <code>transformWithState</code>.</li>
         </ul></div>`,
        `<h3>How state is managed</h3>
         ${flowDiagram(['Micro-batch', 'Read/update state by key', 'Checkpoint state version', 'Watermark expires old state'])}
         ${compareTable(['Piece', 'Role'], [
           ['State store', 'Keyed store of in-flight aggregates/join buffers'],
           ['Checkpoint', 'Persists state versions for fault-tolerant restart'],
           ['Watermark', 'Evicts state too old to matter → bounded memory'],
           ['Provider', 'Default in-memory+HDFS, or RocksDB for large state'],
         ])}
         <div class="lx-callout lx-warn"><b>State is the scaling limit.</b><div>Unbounded keys or missing
         watermarks make state grow forever until the job OOMs. Bound it with watermarks and size it with the
         right state-store provider (see the RocksDB module).</div></div>`,
        `<h3>{ID} state</h3>
         <p>Counting <b>{ENTITY}</b> events per <code>{KEY}</code> in 5-minute windows keeps one state entry per
         (key, window). The watermark expires windows after their lateness bound so the number of live entries
         stays proportional to <i>active</i> {KEY}s × open windows — not the all-time total. That's what lets the
         job run for months on bounded memory.</p>`,
        [
          { q: 'Which operations are stateful and why does it matter?', a: 'Windowed/keyed aggregations, stream-stream joins, deduplication, and arbitrary stateful ops (<code>applyInPandasWithState</code>/<code>transformWithState</code>). It matters because state must be checkpointed for fault tolerance and <b>bounded</b> (via watermarks) or it grows until the job fails.' },
          { q: 'How does state survive a restart?', a: 'It\'s written to the <b>checkpoint</b> as versioned state. On restart the engine reloads the last committed state version and resumes, so counts/joins continue correctly — this is central to exactly-once stateful processing.' },
          { q: 'What bounds state size?', a: 'The <b>watermark</b> evicts state older than the lateness threshold, and your <b>keyspace</b> determines breadth. Unbounded keys or no watermark = unbounded state. For large but bounded state, switch the state-store provider to RocksDB.' },
        ]),
    },

    // ── 11 ────────────────────────────────────────────────────────────────
    { id: 'databricks11', num: '11', icon: '🔗', title: 'Stream-stream joins', idea: 'Join two live streams within a time bound — watermarks on both sides keep state finite.',
      tabs: T(
        `<h3>Joining two moving targets</h3>
         <p>Sometimes both sides are streams — e.g. {ENTITY} events joined to a related event stream. Neither
         side is complete, so a match may arrive on either side at any time. Structured Streaming buffers both
         sides in state and emits matches as they form. To keep that buffer finite you must <b>watermark both
         inputs</b> and give a <b>time-interval</b> join condition.</p>`,
        `<h3>Mechanics & constraints</h3>
         ${codeBlock('python', `left  = clicks.withWatermark("click_time",  "30 minutes")\nright = {ENTITY}s.withWatermark("event_time", "30 minutes")\n\njoined = left.join(right,\n  expr("""\n    click_id = {KEY} AND\n    event_time >= click_time AND\n    event_time <= click_time + interval 1 hour\n  """))   # time-bounded!`)}
         ${compareTable(['Join type', 'Watermark needed?', 'Notes'], [
           ['Inner', 'Recommended on both', 'State cleaned once past the interval'],
           ['Left/right/full outer', 'Required', 'Unmatched rows emitted only after watermark passes'],
           ['Semi / anti', 'Required for correctness', 'Follows the same bounding rules'],
         ])}
         <div class="lx-callout lx-warn"><b>Outer joins need watermarks.</b><div>An outer join can\'t decide a row
         is unmatched until it\'s sure no match will ever arrive — that certainty comes only from the watermark
         passing the time bound. Hence outer joins <b>require</b> a watermark + time condition.</div></div>`,
        `<h3>{ID} stream-stream join</h3>
         <p>Join the <b>{ENTITY}</b> stream to a correlated event stream (e.g. a request or payment stream) on
         <code>{KEY}</code> within a 1-hour window. Both sides are watermarked at 30 minutes so the join buffer
         only holds recent, join-eligible records. Matched pairs emit as they form; with a left outer join, a
         {ENTITY} event with no counterpart is emitted as unmatched once the hour+watermark elapses.</p>`,
        [
          { q: 'Why must stream-stream joins be time-bounded?', a: 'Both sides are unbounded, so without a time constraint the engine would have to buffer <b>all</b> history on both sides forever. A time-interval condition + watermarks let it evict state once a record can no longer find a match, keeping the join buffer finite.' },
          { q: 'Why do outer joins require a watermark but inner joins only recommend one?', a: 'An outer join must emit unmatched rows, but it can only be <b>sure</b> a row is unmatched once no future match is possible — the watermark passing the time bound provides that guarantee. Inner joins just emit matches, so they work without a watermark but leak state without one.' },
          { q: 'What output mode do stream-stream joins use?', a: '<b>Append</b> mode — rows are emitted once and not updated. Matches (and finalized unmatched rows for outer joins) are produced after the relevant watermark/time-bound conditions are met.' },
        ]),
    },

    // ── 12 ────────────────────────────────────────────────────────────────
    { id: 'databricks12', num: '12', icon: '📎', title: 'Stream-static & Delta joins', idea: 'Enrich a stream with a dimension table — and keep the dimension fresh with a Delta join.',
      tabs: T(
        `<h3>Enrichment joins</h3>
         <p>The most common join in practice isn't stream-stream — it's a <b>stream joined to a lookup/dimension
         table</b> (customer, driver, product). Structured Streaming supports <b>stream-static</b> joins (stream
         ⋈ static DataFrame) and, better for freshness, joining a stream to a <b>Delta table</b> so updates to
         the dimension are picked up.</p>`,
        `<h3>Two flavors</h3>
         ${compareTable(['Join', 'Freshness of dimension', 'Notes'], [
           ['Stream ⋈ static DataFrame', 'Snapshot at query start', 'Simple; stale if dim changes'],
           ['Stream ⋈ Delta table', 'Re-read per micro-batch', 'Picks up dimension updates'],
           ['Stream ⋈ via foreachBatch MERGE', 'Full control', 'Point lookups / upserts per batch'],
         ])}
         ${codeBlock('python', `# stream enriched with a Delta dimension\ndim = spark.read.table("{KEY}_dim")   # re-read each batch\n\nenriched = ({ENTITY}s.join(dim, "{KEY}", "left"))\n\n(enriched.writeStream\n   .option("checkpointLocation","/chk/{ENTITY}s_enriched")\n   .toTable("{ENTITY}s_silver"))`)}
         <div class="lx-callout lx-info"><b>No watermark needed.</b><div>Stream-static joins don't buffer the
         stream side, so they don't need a watermark — the static/Delta side is just looked up. That makes them
         cheap and the default choice for enrichment.</div></div>`,
        `<h3>Enriching {ID}</h3>
         <p>Each <b>{ENTITY}</b> event carries only <code>{KEY}</code>; to make silver useful we join to a
         <code>{KEY}</code> dimension (profile, tier, region) stored as a Delta table. Reading the dimension as a
         Delta table means when a <code>{KEY}</code>'s attributes change, later {ENTITY} events pick up the new
         values automatically — no pipeline restart, no stale snapshot.</p>`,
        [
          { q: 'Stream-static vs stream-stream join — which is more common and why?', a: '<b>Stream-static</b> (enrichment) is far more common: you attach dimension attributes to events. It needs no watermark and buffers no stream state, so it\'s cheap. Stream-stream is reserved for genuinely correlating two live feeds within a time window.' },
          { q: 'How do you keep the dimension fresh in a long-running stream?', a: 'Join to a <b>Delta table</b> rather than a cached static DataFrame — the engine re-reads it per micro-batch, so dimension updates are reflected. For point lookups or upsert semantics, do a <code>MERGE</code> inside <code>foreachBatch</code>.' },
          { q: 'Why don\'t stream-static joins need a watermark?', a: 'Because the stream side isn\'t buffered waiting for matches — each event just looks up the static/Delta side and proceeds. There\'s no accumulating join state to bound, so no watermark is required.' },
        ]),
    },

    // ── 13 ────────────────────────────────────────────────────────────────
    { id: 'databricks13', num: '13', icon: '♻️', title: 'Deduplication', idea: 'Drop duplicate events within a watermark so at-least-once delivery becomes effectively once.',
      tabs: T(
        `<h3>Why dedup is needed</h3>
         <p>Upstream brokers and producers deliver <b>at least once</b>: retries and re-deliveries mean the same
         {ENTITY} event can appear twice. For correct counts and downstream idempotency you often dedup on an
         event id. Structured Streaming offers <code>dropDuplicates</code> and the watermark-aware
         <code>dropDuplicatesWithinWatermark</code>.</p>`,
        `<h3>Two operators</h3>
         ${compareTable(['Operator', 'Behavior'], [
           ['dropDuplicates(cols)', 'Dedup on exact column values; needs watermark to bound state'],
           ['dropDuplicatesWithinWatermark(cols)', 'Dedup within the lateness window even if other fields (e.g. event-time) differ'],
         ])}
         ${codeBlock('python', `# dedup on event id within the watermark window\ndeduped = ({ENTITY}s\n  .withWatermark("event_time", "1 hour")\n  .dropDuplicatesWithinWatermark(["event_id"]))`)}
         <div class="lx-callout lx-info"><b>Why "within watermark".</b><div>Plain <code>dropDuplicates</code>
         must match all specified columns exactly and keeps state until the watermark expires. If the duplicate
         can carry a slightly different event time, <code>dropDuplicatesWithinWatermark</code> still catches it
         within the lateness threshold — but it can\'t catch duplicates arriving after the watermark passes.</div></div>`,
        `<h3>Dedup for {ID}</h3>
         <p>The <b>{ENTITY}</b> producer may resend an event after a network blip, so the same
         <code>event_id</code> arrives twice. We <code>dropDuplicatesWithinWatermark(["event_id"])</code> with a
         1-hour watermark, so a retry within the hour is collapsed to one — making the downstream count of
         {ENTITY} events accurate and the silver table safe to treat as deduplicated.</p>`,
        [
          { q: 'How does dedup turn at-least-once into effectively-once?', a: 'Upstream delivery is at-least-once, so duplicates are expected. Deduping on a stable <b>event id</b> within a watermark window drops the repeats, so stateful results (counts, aggregates) and idempotent sinks behave as if each event were processed once.' },
          { q: 'dropDuplicates vs dropDuplicatesWithinWatermark?', a: 'Plain <code>dropDuplicates</code> dedups on exact column matches and bounds state via the watermark. <code>dropDuplicatesWithinWatermark</code> guarantees dedup within the lateness threshold even when duplicates differ in other fields (like event-time), which is the more robust choice when timestamps on retries can vary.' },
          { q: 'What\'s the limit of watermark-based dedup?', a: 'It only dedups within the watermark window — a duplicate arriving after the watermark has advanced past the original is <b>not</b> caught (its state has been evicted). Set the watermark to cover your realistic duplicate-arrival window.' },
        ]),
    },

    // ── 14 ────────────────────────────────────────────────────────────────
    { id: 'databricks14', num: '14', icon: '📤', title: 'Output modes', idea: 'Append, update, or complete — how results are written each trigger depends on the query.',
      tabs: T(
        `<h3>Three ways to emit results</h3>
         <p>Each trigger, the engine writes the <i>changes</i> to the result table. <b>Output mode</b> decides
         what "changes" means — and not every mode is valid for every query. Choosing the right one is a common
         source of confusion and errors.</p>
         <ul class="clean">
           <li><b>Append</b> — only brand-new, finalized rows. Default; needs the row to be "done" (e.g. window closed).</li>
           <li><b>Update</b> — rows that changed since last trigger (evolving aggregates).</li>
           <li><b>Complete</b> — the entire result table every trigger (small aggregates only).</li>
         </ul>`,
        `<h3>Which mode for which query</h3>
         ${compareTable(['Query', 'Append', 'Update', 'Complete'], [
           ['Stateless map/filter', '✅', '✅', '❌'],
           ['Aggregation WITHOUT watermark', '❌', '✅', '✅'],
           ['Aggregation WITH watermark', '✅ (on close)', '✅', '✅'],
           ['Stream-stream inner join', '✅', '—', '❌'],
           ['Stream-stream outer join', '✅ (needs wm)', '—', '❌'],
         ])}
         <div class="lx-callout lx-warn"><b>Why append needs a watermark for aggregations.</b><div>Append only
         emits a row once it\'s final. An aggregate isn\'t final until its window closes — which only happens
         when the <b>watermark</b> passes the window end. Without a watermark the engine can never decide a group
         is done, so append is disallowed.</div></div>`,
        `<h3>{ID} output modes</h3>
         <p>Writing deduplicated silver <b>{ENTITY}</b> rows to Delta → <b>append</b>. A live
         "events-per-<code>{KEY}</code>" dashboard that must reflect running counts as they change →
         <b>update</b>. A tiny "total {ENTITY} count by status" table you rewrite each trigger →
         <b>complete</b>. Most medallion writes are append; dashboards use update.</p>`,
        [
          { q: 'What are the three output modes?', a: '<b>Append</b> (only new finalized rows — the default), <b>Update</b> (rows changed since last trigger — good for evolving aggregates), and <b>Complete</b> (the whole result table each trigger — only feasible for small aggregates).' },
          { q: 'Why can\'t you use append on an aggregation without a watermark?', a: 'Append emits a row only when it\'s <b>final</b>, and an aggregate becomes final only when its window closes — which requires a watermark to decide no more data will arrive for that window. No watermark → the engine can never finalize → append is rejected.' },
          { q: 'When is complete mode a bad idea?', a: 'When the result table is large — complete mode rewrites the <b>entire</b> result every trigger, which doesn\'t scale. It\'s fine only for small, bounded aggregates (e.g. counts over a handful of statuses).' },
        ]),
    },

    // ── 15 ────────────────────────────────────────────────────────────────
    { id: 'databricks15', num: '15', icon: '⏯️', title: 'Trigger modes', idea: 'processingTime, availableNow, or real-time — control how often micro-batches run.',
      tabs: T(
        `<h3>How often does the engine run?</h3>
         <p>The <b>trigger</b> controls the cadence of micro-batches. Picking it right balances latency, cost,
         and whether the job is always-on or a scheduled incremental run.</p>
         <ul class="clean">
           <li><b>processingTime="N seconds"</b> — fixed interval; <code>"0 seconds"</code> = run back-to-back (lowest latency).</li>
           <li><b>availableNow</b> — process all available data in (possibly several) batches, then stop. The modern replacement for the deprecated <code>Trigger.Once</code>.</li>
           <li><b>real-time mode</b> — a separate low-latency mode (<code>trigger(realTime=...)</code>) for operational sub-second workloads.</li>
         </ul>
         <div class="lx-callout lx-warn"><b>No OSS continuous mode.</b><div>Databricks does <b>not</b> support
         Spark's open-source <code>continuous</code> trigger. For low latency use real-time mode, not continuous.</div></div>`,
        `<h3>Choosing a trigger</h3>
         ${compareTable(['Goal', 'Trigger'], [
           ['Always-on, steady latency', 'processingTime="10 seconds"'],
           ['Lowest micro-batch latency', 'processingTime="0 seconds"'],
           ['Scheduled "process new, then stop"', 'availableNow=True'],
           ['Sub-second operational', 'real-time mode'],
           ['Serverless compute', 'availableNow (time-based triggers restricted)'],
         ])}
         ${codeBlock('python', `# scheduled incremental batch\n.trigger(availableNow=True)\n\n# always-on, 10s cadence\n.trigger(processingTime="10 seconds")\n\n# lowest latency micro-batch\n.trigger(processingTime="0 seconds")`)}
         <div class="lx-callout lx-info"><b>Trigger.Once is deprecated.</b><div>Since DBR 11.3 LTS, use
         <code>availableNow</code> for incremental batch — it processes a large backlog in multiple bounded
         batches instead of one, avoiding OOM.</div></div>`,
        `<h3>{ID} triggers</h3>
         <p>For the live <b>{ENTITY}</b> dashboard we run always-on at <code>processingTime="10 seconds"</code> —
         fresh enough, cheap enough. For the nightly partner-file ingest via Auto Loader we use
         <code>availableNow=True</code>: the scheduled job wakes, drains everything that landed since yesterday in
         bounded batches, writes to bronze, and shuts the cluster down — no idle compute cost.</p>`,
        [
          { q: 'What trigger modes does Databricks support?', a: '<b>processingTime</b> (fixed interval; <code>0</code> = back-to-back), <b>availableNow</b> (process all available data then stop — the modern incremental-batch trigger), and <b>real-time mode</b> for sub-second operational latency. Databricks does <b>not</b> support OSS <code>continuous</code> mode.' },
          { q: 'Why use availableNow instead of Trigger.Once?', a: '<code>Trigger.Once</code> is deprecated (DBR 11.3 LTS+). <code>availableNow</code> does the same "process everything new then stop" but across <b>multiple bounded micro-batches</b>, so a large backlog won\'t overwhelm memory the way a single Once batch could.' },
          { q: 'How do you get the lowest latency on Databricks?', a: 'Either <code>processingTime="0 seconds"</code> (back-to-back micro-batches — the production recommendation for lowest micro-batch latency) or, for true sub-second operational needs, <b>real-time mode</b>. Not continuous mode, which isn\'t supported.' },
        ]),
    },

    // ── 16 ────────────────────────────────────────────────────────────────
    { id: 'databricks16', num: '16', icon: '💾', title: 'Checkpoints', idea: 'The checkpoint records offsets and state so a restart resumes exactly where it stopped.',
      tabs: T(
        `<h3>The engine's memory of progress</h3>
         <p>Every streaming query needs a <b>checkpoint location</b>. It persists what the query has processed —
         the source <b>offsets</b> per micro-batch, which batches were <b>committed</b> to the sink, and any
         <b>state</b>. On restart the engine reads the checkpoint and resumes from exactly the right place, which
         is the foundation of fault tolerance and exactly-once.</p>
         <div class="lx-callout lx-warn"><b>One checkpoint per query.</b><div>Never share a checkpoint between two
         queries, and don't point two streams at the same location — it corrupts progress tracking.</div></div>`,
        `<h3>What's inside</h3>
         ${compareTable(['Checkpoint component', 'Records'], [
           ['offsets/', 'Source offsets planned for each micro-batch'],
           ['commits/', 'Which micro-batches were committed to the sink'],
           ['state/', 'Versioned stateful operator data'],
           ['metadata', 'Query id and config'],
         ])}
         ${codeBlock('python', `(df.writeStream\n   .option("checkpointLocation", "/chk/{ENTITY}s_silver")  # required\n   .outputMode("append")\n   .toTable("{ENTITY}s_silver"))`)}
         <div class="lx-callout lx-warn"><b>Some changes break restart.</b><div>Altering the query in incompatible
         ways (e.g. changing a stream-stream join type, or dedup/join state schema) can make the checkpoint
         incompatible — the stream won\'t restart from it. Plan state-affecting changes carefully.</div></div>`,
        `<h3>Checkpointing {ID}</h3>
         <p>Each stage of the <b>{ENTITY}</b> pipeline (bronze→silver→gold) has its own checkpoint. When the
         silver job is redeployed or the cluster bounces, it reloads its checkpoint: the exact Kafka offsets it
         had consumed and the window state it held. It resumes without re-reading already-processed {ENTITY}
         events and without losing in-flight aggregates — no gaps, no duplicates.</p>`,
        [
          { q: 'What does a checkpoint store and why is it required?', a: 'It stores the planned source <b>offsets</b> per micro-batch, the <b>commits</b> (which batches reached the sink), and <b>state</b>. It\'s required because it\'s how a restarted query knows exactly where to resume — the basis of fault tolerance and exactly-once.' },
          { q: 'Can two streaming queries share a checkpoint location?', a: 'No. Each query must have its <b>own</b> checkpoint location. Sharing one corrupts offset/commit tracking and breaks correctness. Give every <code>writeStream</code> a distinct <code>checkpointLocation</code>.' },
          { q: 'What kinds of query changes can break a checkpoint?', a: 'Changes that alter state semantics — e.g. changing a stream-stream join type, or the schema/keys of dedup or join state. Those make the stored state incompatible, so the query can\'t restart from the old checkpoint; such changes often require a new checkpoint (and a reprocess plan).' },
        ]),
    },

    // ── 17 ────────────────────────────────────────────────────────────────
    { id: 'databricks17', num: '17', icon: '🎯', title: 'Exactly-once & fault tolerance', idea: 'Replayable source + checkpoint + idempotent/transactional sink = exactly-once end to end.',
      tabs: T(
        `<h3>The exactly-once recipe</h3>
         <p>"Exactly-once" is not magic from one setting — it's a property of the <b>whole pipeline</b>. It holds
         when three things line up: a <b>replayable source</b> (can re-deliver after failure), a <b>checkpoint</b>
         (tracks offsets + commits), and an <b>idempotent or transactional sink</b> (re-applying a batch has no
         extra effect). Miss any one and you fall back to at-least-once.</p>
         <div class="lx-callout lx-info"><b>Delta-to-Delta is exactly-once.</b><div>Because Delta is replayable
         <i>and</i> transactional, a pipeline whose stages are all Delta is exactly-once end to end with no extra
         work.</div></div>`,
        `<h3>How it recovers</h3>
         ${flowDiagram(['Failure mid-batch', 'Restart reads checkpoint', 'Replay same offsets', 'Sink dedups / tx skips', 'No dup, no loss'])}
         ${compareTable(['Sink', 'Guarantee', 'How'], [
           ['Delta table', 'Exactly-once', 'Transactional commit keyed to batch'],
           ['Delta via txnAppId/txnVersion', 'Exactly-once', 'Duplicate batch writes ignored'],
           ['foreachBatch (naive)', 'At-least-once', 'You must dedup using batchId'],
           ['External non-idempotent sink', 'At-least-once', 'Make writes idempotent yourself'],
         ])}
         <div class="lx-callout lx-warn"><b>Honest framing.</b><div>Never attribute exactly-once to the checkpoint
         alone. The checkpoint guarantees correct <i>replay</i>; the <b>sink</b> must make that replay harmless.
         A non-idempotent external sink is at-least-once no matter what.</div></div>`,
        `<h3>Exactly-once for {ID}</h3>
         <p>The <b>{ENTITY}</b> broker is replayable; each stage checkpoints; silver/gold are Delta tables. So if
         the silver job dies mid-batch, it restarts, replays the same offsets, and Delta's transactional commit
         ensures the re-run batch doesn't double-write — the {ENTITY} count stays exact. The one place we're
         careful is the external alerting sink: there we dedup on <code>batchId</code> so a replay can't fire a
         duplicate {ENTITY} alert.</p>`,
        [
          { q: 'What three ingredients make a pipeline exactly-once?', a: 'A <b>replayable source</b> (re-delivers after failure), a <b>checkpoint</b> (tracks offsets + which batches committed), and an <b>idempotent/transactional sink</b> (re-applying a batch is harmless). All three together give end-to-end exactly-once; missing one drops you to at-least-once.' },
          { q: 'Is foreachBatch exactly-once?', a: 'No — on its own it\'s <b>at-least-once</b>. You achieve exactly-once by using the provided <code>batchId</code> to make the write idempotent (e.g. a <code>MERGE</code> keyed on batchId, or Delta <code>txnAppId</code>/<code>txnVersion</code>). The engine replays a batch on failure, so the sink must tolerate re-application.' },
          { q: 'Why is Delta-to-Delta exactly-once for free?', a: 'Delta is both replayable (as a source) and transactional (as a sink). The sink commit is atomic and tied to the batch, so a replayed batch can\'t double-write. Combined with the checkpoint\'s offset tracking, the whole Delta-to-Delta chain is exactly-once without custom idempotency code.' },
        ]),
    },

    // ── 18 ────────────────────────────────────────────────────────────────
    { id: 'databricks18', num: '18', icon: '🛠️', title: 'foreachBatch & arbitrary sinks', idea: 'Run any batch code per micro-batch — MERGE, multi-sink writes, external systems.',
      tabs: T(
        `<h3>The escape hatch</h3>
         <p>Not every destination is a built-in sink. <code>foreachBatch</code> hands you each micro-batch as a
         normal (batch) DataFrame plus its <code>batchId</code>, and lets you run <b>any</b> code: upsert with
         <code>MERGE</code>, write to several sinks at once, call an external API, or use batch-only operations
         not available in streaming.</p>
         <div class="lx-callout lx-info"><b>When you need it.</b><div>Upserts/SCD into Delta, writing to a
         non-streaming sink, fan-out to multiple tables, or applying batch DataFrame ops inside a stream.</div></div>`,
        `<h3>Pattern: idempotent MERGE</h3>
         ${codeBlock('python', `def upsert(batch_df, batch_id):\n    (tgt.alias("t").merge(\n        batch_df.alias("s"), "t.{KEY} = s.{KEY}")\n     .whenMatchedUpdateAll()\n     .whenNotMatchedInsertAll()\n     .execute())\n\n(stream.writeStream\n   .foreachBatch(upsert)\n   .option("checkpointLocation","/chk/{ENTITY}s_upsert")\n   .trigger(processingTime="30 seconds")\n   .start())`)}
         <div class="lx-callout lx-warn"><b>foreachBatch is at-least-once.</b><div>The same <code>batchId</code>
         is passed on a retry. Make the body idempotent — a <code>MERGE</code> keyed on a business key, or skip
         work if that <code>batchId</code> was already processed — or you\'ll double-apply on failures.</div></div>
         ${compareTable(['Use foreachBatch for', 'Instead of'], [
           ['Upserts / SCD into Delta', 'append-only writeStream'],
           ['Writing to multiple sinks', 'two separate streams'],
           ['External API / JDBC sink', 'a built-in connector (none exists)'],
         ])}`,
        `<h3>{ID} upserts</h3>
         <p>The gold <b>{ENTITY}</b> table is a current-state table (one row per <code>{KEY}</code>), so we can't
         just append — we <code>foreachBatch</code> and <code>MERGE</code> each batch into it, updating existing
         {KEY} rows and inserting new ones. Because the MERGE is keyed on <code>{KEY}</code> it's idempotent: a
         replayed batch produces the same final state, preserving exactly-once despite foreachBatch's at-least-once
         nature.</p>`,
        [
          { q: 'What does foreachBatch give you that built-in sinks don\'t?', a: 'Each micro-batch arrives as a normal <b>batch DataFrame</b> with its <code>batchId</code>, so you can run arbitrary batch code: <code>MERGE</code>/upserts, multi-sink fan-out, external API/JDBC writes, and batch-only operations unavailable in streaming.' },
          { q: 'How do you make foreachBatch exactly-once?', a: 'Use the <code>batchId</code> for idempotency: a <code>MERGE</code> keyed on a business key, Delta <code>txnAppId</code>/<code>txnVersion</code> write options, or a guard that skips a batchId already processed. On its own foreachBatch is at-least-once because the engine re-runs a batch (same batchId) after failure.' },
          { q: 'Give a concrete reason to use foreachBatch.', a: 'Maintaining a <b>current-state</b> (upserted) table — you need <code>MERGE</code>, which isn\'t a streaming output mode. foreachBatch lets you MERGE each micro-batch into the target, giving SCD/upsert semantics a plain append can\'t.' },
        ]),
    },

    // ── 19 ────────────────────────────────────────────────────────────────
    { id: 'databricks19', num: '19', icon: '🗄️', title: 'RocksDB state store', idea: 'Swap the state-store provider to RocksDB for large state; add changelog & async checkpointing.',
      tabs: T(
        `<h3>When default state isn't enough</h3>
         <p>The default state store keeps state on the JVM heap (backed by the checkpoint). For <b>large</b> state —
         millions of keys, big windows, heavy joins — that pressures GC and memory. The <b>RocksDB</b> state-store
         provider keeps state in a native, off-heap embedded store on local disk, so you scale to much larger state
         without OOM.</p>
         <div class="lx-callout lx-info"><b>Databricks recommendation.</b><div>Use RocksDB with <b>changelog
         checkpointing</b> for stateful streams with large state — it\'s the recommended configuration.</div></div>`,
        `<h3>Enabling it</h3>
         ${codeBlock('python', `spark.conf.set(\n  "spark.sql.streaming.stateStore.providerClass",\n  "com.databricks.sql.streaming.state.RocksDBStateStoreProvider")\n\n# changelog checkpointing (recommended for large state)\nspark.conf.set(\n  "spark.sql.streaming.stateStore.rocksdb.changelogCheckpointing.enabled",\n  "true")`)}
         ${compareTable(['Provider', 'Where state lives', 'Best for'], [
           ['Default (HDFS-backed)', 'JVM heap + checkpoint', 'Small/moderate state'],
           ['RocksDB', 'Off-heap, local disk', 'Large state (millions of keys)'],
         ])}
         ${compareTable(['Feature', 'Benefit'], [
           ['Changelog checkpointing', 'Only writes state deltas → faster, cheaper commits'],
           ['Async state checkpointing', 'Checkpoint off the critical path → lower batch latency'],
         ])}
         <div class="lx-callout lx-warn"><b>Requires RocksDB.</b><div>Both changelog and asynchronous state
         checkpointing need the RocksDB provider — they aren\'t available on the default state store.</div></div>`,
        `<h3>{ID} at scale</h3>
         <p>If we dedup <b>{ENTITY}</b> events on <code>event_id</code> across a 1-hour watermark at high volume,
         the state can reach millions of keys. We switch to the <b>RocksDB</b> provider with changelog
         checkpointing so that state lives off-heap on disk and commits write only deltas — keeping the {ENTITY}
         job stable and its micro-batch latency low even as the active keyspace grows.</p>`,
        [
          { q: 'When should you switch to the RocksDB state store?', a: 'When state is <b>large</b> — millions of keys, big windows, or heavy stream-stream joins — where the default heap-backed store causes GC pressure or OOM. RocksDB keeps state off-heap on local disk and is Databricks\' recommended provider for large stateful streams.' },
          { q: 'What is changelog checkpointing and why use it?', a: 'Instead of snapshotting the whole state each commit, it writes only the <b>changes (deltas)</b> since the last checkpoint — making commits faster and cheaper for large state. It requires the RocksDB provider and is the recommended config for big state.' },
          { q: 'What does async state checkpointing buy you?', a: 'It moves state checkpointing <b>off the critical path</b> of the micro-batch, so the batch doesn\'t block on writing state — lowering end-to-end latency for stateful queries. Like changelog checkpointing, it requires RocksDB.' },
        ]),
    },

    // ── 20 ────────────────────────────────────────────────────────────────
    { id: 'databricks20', num: '20', icon: '🧮', title: 'Arbitrary stateful processing', idea: 'When built-in operators aren\'t enough, manage custom per-key state and timers yourself.',
      tabs: T(
        `<h3>Beyond aggregates and joins</h3>
         <p>Some logic needs <b>custom</b> state machines — session logic, pattern detection, alert
         de-bouncing, "fire if no event in N minutes." Structured Streaming exposes low-level operators to keep
         arbitrary per-key state with <b>timers</b>: <code>applyInPandasWithState</code> (Python) and the newer
         <code>transformWithState</code> API, mirroring Flink's keyed-state + timers.</p>`,
        `<h3>The shape of it</h3>
         ${flowDiagram(['Group by key', 'Per-key state object', 'Update on each event', 'Timer / timeout fires', 'Emit output + expire state'])}
         ${compareTable(['Capability', 'What you implement'], [
           ['Per-key state', 'Arbitrary object (counters, buffers, FSM)'],
           ['Timers / timeouts', 'Event-time or processing-time callbacks'],
           ['Emit on condition', 'Output when your logic decides, not fixed windows'],
           ['Expire state', 'Clean up when a key goes idle'],
         ])}
         <div class="lx-callout lx-warn"><b>Power = responsibility.</b><div>You now own correctness and state
         cleanup. Forgetting to expire idle keys reintroduces the unbounded-state problem the built-in operators
         solve for you. Reach for this only when built-ins genuinely can\'t express the logic.</div></div>`,
        `<h3>Custom {ID} logic</h3>
         <p>Suppose we must raise a <b>{ENTITY}</b> alert when a <code>{KEY}</code> has activity and then goes
         <i>silent</i> for 10 minutes mid-lifecycle (a stuck {ENTITY}). No window expresses "absence of events,"
         so we keep per-<code>{KEY}</code> state with a processing-time <b>timer</b>: each {ENTITY} event resets
         the timer; if it fires, we emit a stuck-{ENTITY} alert and expire the state. That's arbitrary stateful
         processing doing what built-in operators can't.</p>`,
        [
          { q: 'When do you need arbitrary stateful processing?', a: 'When the logic can\'t be expressed with built-in aggregations/joins/dedup — custom state machines, pattern/sequence detection, de-bouncing, or <b>timeout-based</b> logic like "alert if no event for N minutes." You manage per-key state and timers directly via <code>transformWithState</code> / <code>applyInPandasWithState</code>.' },
          { q: 'What are the main responsibilities you take on?', a: 'Correct <b>state updates</b> per event, <b>timer/timeout</b> handling, deciding <b>when to emit</b>, and crucially <b>expiring idle state</b>. The built-in operators manage state cleanup via watermarks for you; here you must do it or state grows unbounded.' },
          { q: 'How does this compare to Flink\'s keyed state?', a: 'It\'s the same concept — keyed per-key state plus event-time/processing-time timers and callbacks. Databricks exposes it through <code>transformWithState</code> (and the older <code>applyInPandasWithState</code>), giving Flink-like low-level control within Spark\'s micro-batch model.' },
        ]),
    },

    // ── 21 ────────────────────────────────────────────────────────────────
    { id: 'databricks21', num: '21', icon: '🏗️', title: 'Lakeflow Declarative Pipelines (DLT)', idea: 'Declare tables and quality rules; the platform builds the dependency graph and runs it.',
      tabs: T(
        `<h3>Declarative instead of imperative</h3>
         <p>Writing and wiring many <code>writeStream</code> jobs by hand is error-prone. <b>Lakeflow Declarative
         Pipelines</b> — the rebrand of <b>Delta Live Tables (DLT)</b> — flips it: you <i>declare</i> the tables
         you want and the queries that define them, and the platform infers the dependency graph, orchestrates
         execution, manages checkpoints/retries, and enforces data-quality <b>expectations</b>.</p>
         <div class="lx-callout lx-info"><b>Rename, not rewrite.</b><div>DLT is now Lakeflow Declarative Pipelines.
         Existing DLT code runs with <b>no migration</b>; some Python decorators were updated
         (<code>@dlt</code>→<code>@dp</code>, plus <code>@table</code> / <code>@materialized_view</code>).</div></div>`,
        `<h3>What the platform manages</h3>
         ${compareTable(['You declare', 'Platform handles'], [
           ['Table definitions (SQL/Python)', 'Dependency graph & order'],
           ['Streaming table vs materialized view', 'Checkpoints & incremental refresh'],
           ['Expectations (quality rules)', 'Retries, error handling, scaling'],
           ['continuous or triggered mode', 'Orchestration & monitoring UI'],
         ])}
         ${codeBlock('python', `from pyspark import pipelines as dp\n\n@dp.table\ndef {ENTITY}s_bronze():\n    return (spark.readStream.format("kafka")\n              .option("subscribe","{ENTITY}s").load())\n\n@dp.table\ndef {ENTITY}s_silver():\n    return dp.read_stream("{ENTITY}s_bronze").dropDuplicates(["event_id"])`)}
         <div class="lx-callout lx-info"><b>Modes.</b><div>A pipeline runs <b>triggered</b> (process available
         data then stop) or <b>continuous</b> (always-on). You pick per pipeline; the platform does the rest.</div></div>`,
        `<h3>{ID} as a pipeline</h3>
         <p>We declare the whole <b>{ENTITY}</b> medallion as one Lakeflow pipeline: bronze (ingest), silver
         (dedup + enrich), gold (aggregate per <code>{KEY}</code>). The platform sees that silver depends on
         bronze and gold on silver, runs them in order, checkpoints each, and shows one lineage/quality
         dashboard — replacing three hand-wired streaming jobs with one declarative definition.</p>`,
        [
          { q: 'What is Lakeflow Declarative Pipelines and its relationship to DLT?', a: 'It\'s the <b>rebrand of Delta Live Tables (DLT)</b>: a declarative framework where you define tables/views and quality rules and the platform builds the dependency graph, orchestrates, checkpoints, retries, and monitors. Existing DLT code runs unchanged (no migration); some Python decorators were renamed.' },
          { q: 'What does declarative buy you over hand-written streams?', a: 'Automatic <b>dependency ordering</b>, managed checkpoints/retries, built-in <b>expectations</b> (data quality), lineage, and a monitoring UI — all from table definitions. You stop wiring and babysitting individual <code>writeStream</code> jobs and declare intent instead.' },
          { q: 'Triggered vs continuous pipeline mode?', a: '<b>Triggered</b> processes currently-available data and stops (good for scheduled/incremental, cost-efficient). <b>Continuous</b> runs always-on for low-latency streaming. You choose per pipeline; it\'s the pipeline-level analog of the stream trigger modes.' },
        ]),
    },

    // ── 22 ────────────────────────────────────────────────────────────────
    { id: 'databricks22', num: '22', icon: '🧱', title: 'Streaming tables vs materialized views', idea: 'Append-only incremental tables vs incrementally-refreshed precomputed results.',
      tabs: T(
        `<h3>Two kinds of pipeline dataset</h3>
         <p>Inside a Lakeflow pipeline you define two kinds of object. A <b>streaming table</b> processes each
         input row <b>once</b> (append-only sources) — ideal for ingestion and incremental transforms. A
         <b>materialized view</b> holds a <b>precomputed query result</b> that's kept current via incremental
         refresh — ideal when the source can be updated/deleted or you need correct aggregates.</p>`,
        `<h3>When to use which</h3>
         ${compareTable(['', 'Streaming table', 'Materialized view'], [
           ['Processing', 'Each row once (incremental)', 'Result recomputed/refreshed to stay correct'],
           ['Source', 'Append-only', 'Can change (updates/deletes)'],
           ['Best for', 'Bronze/silver ingestion & transforms', 'Gold aggregates, serving layers'],
           ['Semantics', 'Row-by-row append', 'Always reflects current source state'],
         ])}
         ${codeBlock('python', `@dp.table                       # streaming table (append-only)\ndef {ENTITY}s_silver():\n    return dp.read_stream("{ENTITY}s_bronze").dropDuplicates(["event_id"])\n\n@dp.materialized_view            # kept correct via refresh\ndef {ENTITY}s_by_{KEY}():\n    return spark.read.table("{ENTITY}s_silver").groupBy("{KEY}").count()`)}
         <div class="lx-callout lx-info"><b>Rule of thumb.</b><div>Append-only, process-once → <b>streaming
         table</b>. Needs to reflect updates/deletes or be a correct aggregate → <b>materialized view</b>.</div></div>`,
        `<h3>{ID} layers</h3>
         <p>Bronze and silver <b>{ENTITY}</b> tables are <b>streaming tables</b> — each {ENTITY} event flows
         through once. The gold "events per <code>{KEY}</code>" and "current {ENTITY} status counts" are
         <b>materialized views</b>: if upstream corrections update silver rows, the views refresh to stay correct,
         which a pure append-only streaming aggregate couldn't guarantee.</p>`,
        [
          { q: 'Streaming table vs materialized view — core difference?', a: 'A <b>streaming table</b> processes each input row exactly once and is append-oriented (ingestion/incremental transforms). A <b>materialized view</b> stores a precomputed query result kept current by <b>incremental refresh</b>, so it stays correct even when source rows are updated or deleted.' },
          { q: 'When would you pick a materialized view over a streaming table?', a: 'When the source can <b>change</b> (updates/deletes) or you need a <b>correct aggregate/serving</b> layer that always reflects current state — typically gold-layer rollups. Streaming tables assume append-only and can\'t retroactively reflect changed source rows.' },
          { q: 'How do these map to the medallion layers?', a: 'Bronze and often silver are <b>streaming tables</b> (append-only ingestion and incremental cleansing); gold aggregates/serving tables are frequently <b>materialized views</b> so business metrics stay correct as data is corrected upstream.' },
        ]),
    },

    // ── 23 ────────────────────────────────────────────────────────────────
    { id: 'databricks23', num: '23', icon: '✅', title: 'Expectations (data quality)', idea: 'Declare SQL constraints; warn, drop, or fail on bad rows — and log the metrics.',
      tabs: T(
        `<h3>Quality as code</h3>
         <p>Bad data silently poisoning downstream tables is a classic streaming failure. Lakeflow
         <b>expectations</b> make quality a first-class, declarative part of the pipeline: a named <b>SQL boolean
         constraint</b> plus an action for rows that fail. Results are logged to the pipeline event log so you can
         track quality over time.</p>`,
        `<h3>Three actions on failure</h3>
         ${compareTable(['Action', 'What happens to failing rows', 'Use when'], [
           ['Warn (expect)', 'Kept; failure counted in metrics', 'Observe quality, don\'t block'],
           ['Drop (expect_or_drop)', 'Removed from the target', 'Quarantine bad rows'],
           ['Fail (expect_or_fail)', 'Pipeline run stops', 'Violation must never pass'],
         ])}
         ${codeBlock('python', `@dp.table\n@dp.expect("valid_{KEY}", "{KEY} IS NOT NULL")\n@dp.expect_or_drop("positive_amount", "amount > 0")\n@dp.expect_or_fail("has_event_time", "event_time IS NOT NULL")\ndef {ENTITY}s_silver():\n    return dp.read_stream("{ENTITY}s_bronze")`)}
         <div class="lx-callout lx-info"><b>Always measured.</b><div>Regardless of action, every expectation
         emits pass/fail <b>metrics</b> to the event log — so even "warn" gives you a data-quality trend line and
         alerting hooks.</div></div>`,
        `<h3>{ID} quality gates</h3>
         <p>On the silver <b>{ENTITY}</b> table we <b>fail</b> the run if <code>event_time</code> is missing
         (we can't window without it), <b>drop</b> rows with a non-positive amount into quarantine, and
         <b>warn</b> on a null <code>{KEY}</code> so we can watch the trend without blocking. The event log then
         shows exactly how many {ENTITY} rows failed each rule per run — quality becomes observable, not a
         surprise in a dashboard three weeks later.</p>`,
        [
          { q: 'What is an expectation?', a: 'A named <b>SQL boolean constraint</b> on a Lakeflow table plus an action for rows that violate it. It makes data quality declarative and part of the pipeline definition rather than ad-hoc checks bolted on afterward.' },
          { q: 'What are the three failure actions?', a: '<b>Warn</b> (keep the row, count the failure in metrics), <b>drop</b> (remove failing rows — quarantine), and <b>fail</b> (stop the pipeline run). You pick per constraint based on how severe a violation is.' },
          { q: 'Do expectations cost you visibility if you only "warn"?', a: 'No — <b>every</b> expectation, including warn, emits pass/fail <b>metrics</b> to the pipeline event log. So you always get a data-quality trend you can chart and alert on, regardless of whether you chose to block, drop, or merely observe.' },
        ]),
    },

    // ── 24 ────────────────────────────────────────────────────────────────
    { id: 'databricks24', num: '24', icon: '🥇', title: 'The medallion architecture', idea: 'Bronze (raw) → silver (clean) → gold (business) — rising quality, each a Delta table.',
      tabs: T(
        `<h3>A layered quality ladder</h3>
         <p>The <b>medallion architecture</b> organizes a lakehouse into three layers of rising quality, each a
         Delta table and each a stream feeding the next:</p>
         <ul class="clean">
           <li><b>Bronze</b> — raw ingested data, <b>append-only</b>, retains full history for reprocessing/audit.</li>
           <li><b>Silver</b> — cleaned, validated, deduplicated, conformed; the trustworthy source of truth.</li>
           <li><b>Gold</b> — enriched, aggregated, denormalized for specific business consumers / BI / ML.</li>
         </ul>
         <div class="lx-callout lx-info"><b>Why layer at all?</b><div>Separation of concerns: bronze keeps raw
         history so you can always reprocess; silver centralizes cleaning once; gold tailors to consumers. A bad
         gold table is rebuilt from silver; a bad silver from bronze.</div></div>`,
        `<h3>The flow</h3>
         ${flowDiagram(['Sources', 'Bronze (raw)', 'Silver (clean/dedup/join)', 'Gold (aggregate/serve)', 'BI / ML'])}
         ${compareTable(['Layer', 'Content', 'Typical object'], [
           ['Bronze', 'Raw, append-only, historical', 'Streaming table'],
           ['Silver', 'Validated, deduped, conformed', 'Streaming table'],
           ['Gold', 'Aggregated, business-facing', 'Materialized view'],
         ])}
         <div class="lx-callout lx-info"><b>Unity Catalog tip.</b><div>Give each layer its own schema
         (e.g. <code>{ENTITY}.bronze_*</code>, <code>silver_*</code>, <code>gold_*</code>) for clean governance
         and lineage.</div></div>`,
        `<h3>{ID} medallion</h3>
         <p><b>Bronze {ENTITY}</b>: every raw {ENTITY} event, append-only — if we discover a bug we reprocess from
         here. <b>Silver {ENTITY}</b>: deduped on <code>event_id</code>, enriched with the <code>{KEY}</code>
         dimension, quality-checked. <b>Gold {ENTITY}</b>: per-<code>{KEY}</code> rollups and current-status
         counts powering the live dashboard. Each layer is a Delta table streamed into the next, governed in
         Unity Catalog.</p>`,
        [
          { q: 'What are the medallion layers and what\'s in each?', a: '<b>Bronze</b> = raw, append-only, full history (reprocess/audit). <b>Silver</b> = cleaned, validated, deduplicated, conformed (trusted source of truth). <b>Gold</b> = enriched, aggregated, denormalized for specific consumers/BI/ML. Quality rises left to right.' },
          { q: 'Why keep a raw bronze layer instead of cleaning on ingest?', a: 'Bronze preserves <b>raw history</b>, so if a cleaning bug or a new requirement appears you can <b>reprocess</b> from the original data rather than having lost it. It also decouples ingestion from transformation and gives an audit trail.' },
          { q: 'How does medallion map to Databricks objects?', a: 'Each layer is a <b>Delta table</b> streamed into the next. Bronze/silver are typically <b>streaming tables</b> (append/incremental); gold is often <b>materialized views</b> for correct aggregates. In Lakeflow the whole chain is one declarative pipeline, and each layer usually gets its own Unity Catalog schema.' },
        ]),
    },

    // ── 25 ────────────────────────────────────────────────────────────────
    { id: 'databricks25', num: '25', icon: '🔀', title: 'CDC & SCD with streaming', idea: 'Apply change feeds to keep a table current — SCD Type 1 and Type 2 from a stream.',
      tabs: T(
        `<h3>Streaming changes, not just inserts</h3>
         <p>Many sources emit <b>change data</b> — inserts, updates, deletes (CDC) from an operational database.
         To mirror that into the lakehouse you can't just append; you must <b>apply</b> changes to keep a target
         current. Databricks offers <code>APPLY CHANGES</code> (a.k.a. <code>AUTO CDC</code> in Lakeflow) and
         Delta <b>Change Data Feed</b> to do this declaratively, including <b>SCD Type 1/2</b> history.</p>`,
        `<h3>SCD types & the tools</h3>
         ${compareTable(['Concept', 'Meaning'], [
           ['SCD Type 1', 'Overwrite — keep only current value per key'],
           ['SCD Type 2', 'Keep history — new row per change with valid-from/to'],
           ['APPLY CHANGES / AUTO CDC', 'Declaratively apply CDC to a target with ordering'],
           ['Change Data Feed (CDF)', 'Read row-level changes from a Delta table as a stream'],
         ])}
         ${codeBlock('sql', `-- Lakeflow: apply a CDC stream as SCD Type 2\nCREATE OR REFRESH STREAMING TABLE {ENTITY}_dim;\n\nAPPLY CHANGES INTO live.{ENTITY}_dim\nFROM stream(cdc_feed)\nKEYS ({KEY})\nSEQUENCE BY commit_ts        -- ordering for correctness\nSTORED AS SCD TYPE 2;`)}
         <div class="lx-callout lx-warn"><b>Ordering matters.</b><div>CDC must be applied in the right order or an
         older update can clobber a newer one. <code>SEQUENCE BY</code> (a monotonically increasing column) tells
         the engine how to order changes per key.</div></div>`,
        `<h3>{ID} dimension upkeep</h3>
         <p>The <code>{KEY}</code> dimension (profile/tier/region) changes over time. We stream its CDC feed and
         <code>APPLY CHANGES ... STORED AS SCD TYPE 2</code>, sequenced by commit timestamp, so the dimension
         keeps <b>full history</b>: a {ENTITY} event from last month joins to the attributes that were valid
         <i>then</i>, while today's events see today's values — essential for correct historical {ENTITY}
         analytics.</p>`,
        [
          { q: 'What problem does CDC solve in a streaming pipeline?', a: 'Mirroring a source that emits <b>inserts/updates/deletes</b> (not just appends) into the lakehouse. You must <b>apply</b> those changes to keep a target table current — <code>APPLY CHANGES</code>/AUTO CDC and Delta Change Data Feed do this declaratively, with correct ordering.' },
          { q: 'SCD Type 1 vs Type 2?', a: '<b>Type 1</b> overwrites — the table holds only the current value per key (no history). <b>Type 2</b> preserves history — each change creates a new versioned row with valid-from/valid-to, so you can reconstruct the state at any past time.' },
          { q: 'Why is SEQUENCE BY important in APPLY CHANGES?', a: 'CDC events can arrive out of order; without an ordering column an older update could overwrite a newer one. <code>SEQUENCE BY</code> a monotonic column (commit timestamp/LSN) tells the engine the correct per-key order so the latest change wins.' },
        ]),
    },

    // ── 26 ────────────────────────────────────────────────────────────────
    { id: 'databricks26', num: '26', icon: '🚦', title: 'Governance, Photon & performance', idea: 'Unity Catalog governs and tracks lineage; Photon and good layout keep streams fast and cheap.',
      tabs: T(
        `<h3>Govern it, then make it fast</h3>
         <p>A production streaming lakehouse needs <b>governance</b> (who can see what, where did this data come
         from) and <b>performance</b> (latency and cost under control). On Databricks those are <b>Unity Catalog</b>
         and a mix of <b>Photon</b> + table-layout features.</p>
         <ul class="clean">
           <li><b>Unity Catalog</b> — central access control, auditing, and <b>data lineage</b> across catalogs/schemas/tables.</li>
           <li><b>Photon</b> — a vectorized C++ engine, Spark-API compatible, that accelerates SQL/DataFrame work.</li>
           <li><b>Layout</b> — partitioning, <b>liquid clustering</b>/Z-order, <b>OPTIMIZE</b> compaction to fight small files.</li>
         </ul>`,
        `<h3>Performance levers</h3>
         ${compareTable(['Lever', 'Helps with'], [
           ['Photon', 'Faster query/aggregation execution'],
           ['maxFilesPerTrigger / maxBytesPerTrigger', 'Bounded, steady micro-batches'],
           ['OPTIMIZE / auto-compaction', 'Small-file problem from frequent streaming writes'],
           ['Liquid clustering / Z-order', 'Faster reads by clustering on query columns'],
           ['RocksDB + async/changelog', 'Scaling large state cheaply'],
         ])}
         <div class="lx-callout lx-warn"><b>The small-file trap.</b><div>Frequent streaming appends create many
         tiny files, slowing reads. Regular <code>OPTIMIZE</code> / auto-compaction keeps the table healthy — a
         standard part of streaming operations, not an afterthought.</div></div>`,
        `<h3>{ID} in production</h3>
         <p>Unity Catalog governs the <b>{ENTITY}</b> tables: analysts get gold, engineers get silver, raw bronze
         is restricted — and lineage shows exactly how a gold metric traces back to raw {ENTITY} events. Photon
         accelerates the per-<code>{KEY}</code> aggregations, bounded triggers keep micro-batches steady, and a
         scheduled <code>OPTIMIZE</code> compacts the frequent small writes so the {ENTITY} dashboard queries stay
         fast and cheap.</p>`,
        [
          { q: 'What does Unity Catalog provide for streaming pipelines?', a: 'Centralized <b>governance</b> — access control and auditing — plus <b>data lineage</b> across catalogs/schemas/tables, so you can see how a gold metric derives from raw bronze data. Best practice is a schema per medallion layer for clean permissions and lineage.' },
          { q: 'What is Photon?', a: 'Databricks\' <b>vectorized query engine written in C++</b>, compatible with the Spark APIs. It accelerates SQL and DataFrame execution (aggregations, joins, scans) without code changes — you benefit by running on Photon-enabled compute.' },
          { q: 'How do you keep a streaming Delta table performant over time?', a: 'Fight the <b>small-file problem</b> that frequent appends cause: run <code>OPTIMIZE</code>/auto-compaction regularly, cluster data on query columns (<b>liquid clustering</b>/Z-order), bound micro-batches (<code>maxBytes/FilesPerTrigger</code>), and use RocksDB with async/changelog checkpointing for large state.' },
        ]),
    },

    // ── 27 ────────────────────────────────────────────────────────────────
    { id: 'databricks27', num: '27', icon: '🏁', title: `End-to-end: {ID} on Databricks`, idea: 'Put it together — broker/files → bronze → silver → gold, as one governed, exactly-once lakehouse pipeline.',
      tabs: T(
        `<h3>The whole picture</h3>
         <p>Everything in this track assembles into one pipeline. Events enter from the broker (or files via Auto
         Loader), land in <b>bronze</b>, get cleaned/deduped/enriched in <b>silver</b>, and roll up into
         <b>gold</b> for serving — all Delta, all checkpointed, governed by Unity Catalog, orchestrated by
         Lakeflow, and exactly-once end to end because every stage is Delta.</p>
         <div class="lx-callout lx-info"><b>One mental model.</b><div>Ingest → bronze → silver → gold → serve.
         Watermarks bound state, expectations guard quality, checkpoints give fault tolerance, and the table <i>is</i>
         the stream at every hop.</div></div>`,
        `<h3>Reference architecture</h3>
         ${flowDiagram(['Broker / files', 'Auto Loader / Kafka read', 'Bronze (raw)', 'Silver (clean+join)', 'Gold (aggregate)', 'BI / ML / serving'])}
         <div id="databricks27-pipeline"></div>
         ${compareTable(['Stage', 'Tech', 'Guarantee'], [
           ['Ingest', 'Kafka source / Auto Loader', 'Exactly-once file/offset tracking'],
           ['Bronze→Silver→Gold', 'Structured Streaming on Delta', 'Exactly-once (Delta-to-Delta)'],
           ['Quality', 'Lakeflow expectations', 'Warn/drop/fail + metrics'],
           ['Orchestration', 'Lakeflow Declarative Pipelines', 'Dependency graph, retries'],
           ['Governance', 'Unity Catalog', 'Access control + lineage'],
         ])}`,
        `<h3>{ID}, start to finish</h3>
         <p>{ENTITY} events stream from the broker keyed on <code>{KEY}</code> into <b>bronze</b> (raw, append-only).
         <b>Silver</b> dedups on <code>event_id</code> within a watermark, joins the <code>{KEY}</code> dimension
         (SCD Type 2), and applies expectations. <b>Gold</b> materializes per-<code>{KEY}</code> aggregates and
         current {ENTITY} status for the live dashboard. One Lakeflow pipeline runs it, Unity Catalog governs it,
         and because it's Delta-to-Delta it's exactly-once — a complete, production-shaped {ENTITY} streaming
         system on the lakehouse.</p>`,
        [
          { q: 'Walk through an end-to-end Databricks streaming architecture.', a: 'Ingest from a broker (Kafka/Event Hubs/Kinesis source) or files (Auto Loader) → <b>bronze</b> raw Delta → <b>silver</b> (dedup within watermark, enrich via stream-static/Delta join, apply expectations) → <b>gold</b> (materialized aggregates) → BI/ML/serving. Orchestrated by Lakeflow, governed by Unity Catalog, exactly-once because stages are Delta-to-Delta.' },
          { q: 'Where do watermarks, checkpoints, and expectations each fit?', a: '<b>Watermarks</b> bound state in silver\'s dedup/joins/aggregations. <b>Checkpoints</b> on every stage give fault-tolerant, exactly-once restart. <b>Expectations</b> enforce data quality (warn/drop/fail) with logged metrics. Together they make the pipeline correct, recoverable, and observable.' },
          { q: 'Why is this architecture exactly-once end to end?', a: 'Because each hop is <b>Delta-to-Delta</b>: replayable sources, checkpoints tracking offsets/commits, and transactional Delta sinks. Replayed batches can\'t double-write. The only place you\'d add manual idempotency is a non-Delta/external sink (via <code>foreachBatch</code> + <code>batchId</code>).' },
        ]),
    },

  ],
};
