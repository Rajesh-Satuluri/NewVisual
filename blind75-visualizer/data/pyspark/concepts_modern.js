/*
 * data/pyspark/concepts_modern.js — PySpark "Learn" modern & production topics.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Delta Lake / Lakehouse and Structured Streaming semantics; teaching structure
 * mirrors the performance lab.
 */
window.LEARN.register("spark", "Modern & Production", [
  {
    id: "delta-lakehouse",
    title: "Delta Lake & the Lakehouse",
    difficulty: "Core",
    estMinutes: 14,
    relevance: 3,
    tagline: "Delta Lake bolts ACID transactions, updates, and time travel onto plain Parquet on object storage — turning a dumb file dump into a table you can trust.",

    whatIsIt: [
      "Plain Parquet on S3/ADLS/GCS is just files in a folder: no transactions, no updates, no deletes, no consistent snapshot. Two writers can corrupt a read, a failed job leaves half-written files, and there is no way to <code>UPDATE</code> or <code>MERGE</code> a row. <b>Delta Lake</b> is an open table format that adds a transaction log on top of those same Parquet files to fix all of this.",
      "The magic is the <b>_delta_log</b> directory beside the data. Every commit writes an ordered JSON file (<code>000...N.json</code>) listing which Parquet files were <i>added</i> and <i>removed</i> in that version. A reader replays the log to compute the exact set of live files — that is what gives you <b>ACID</b>: writers commit atomically by appending one log entry, and a reader always sees a consistent snapshot. Every ~10 commits Spark writes a <b>Parquet checkpoint</b> so replay stays fast.",
      "Because the log tracks versions, you get <b>time travel</b>: read the table <code>versionAsOf 42</code> or <code>timestampAsOf '2026-09-01'</code> to reproduce a past state for audits, debugging, or rollback. And because writes are transactional, <b>MERGE INTO</b> gives you upserts/deletes — the classic warehouse operation the data lake never had.",
      "Delta enforces <b>schema on write</b>: a write whose columns don't match the table is rejected rather than silently corrupting it. You opt into controlled change with <b>schema evolution</b> (<code>mergeSchema</code>). Maintenance operations <b>OPTIMIZE</b> (compact small files) with optional <b>ZORDER</b> (co-locate related values for data skipping) and <b>VACUUM</b> (physically delete files no longer referenced, past a retention window).",
      "A <b>lakehouse</b> is the resulting architecture: warehouse-grade ACID, governance, and performance served <i>directly on cheap data-lake object storage</i>, so BI, SQL, streaming, and ML all read one governed copy instead of copying data into a separate warehouse. Delta, Apache Iceberg, and Hudi are the three open table formats that make it possible."
    ],

    showMe: {
      code:
        "from delta.tables import DeltaTable\n" +
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# Write a Delta table (just Parquet + a _delta_log transaction log)\n" +
        "df.write.format('delta').mode('overwrite').save('/lake/silver/users')\n" +
        "\n" +
        "# MERGE INTO = upsert. Copy-on-write: matched files are rewritten.\n" +
        "tbl = DeltaTable.forPath(spark, '/lake/silver/users')\n" +
        "(tbl.alias('t')\n" +
        "    .merge(updates.alias('s'), 't.user_id = s.user_id')\n" +
        "    .whenMatchedUpdateAll()\n" +
        "    .whenNotMatchedInsertAll()\n" +
        "    .execute())\n" +
        "\n" +
        "# Time travel: read an earlier version for audit / rollback\n" +
        "old = spark.read.format('delta').option('versionAsOf', 42).load('/lake/silver/users')\n" +
        "asof = (spark.read.format('delta')\n" +
        "             .option('timestampAsOf', '2026-09-01').load('/lake/silver/users'))\n" +
        "\n" +
        "# Schema evolution: allow new columns to be added on write\n" +
        "df2.write.format('delta').option('mergeSchema', 'true').mode('append').save('/lake/silver/users')\n" +
        "\n" +
        "# Maintenance: compact small files, cluster by hot filter columns, then reclaim\n" +
        "spark.sql(\"OPTIMIZE delta.`/lake/silver/users` ZORDER BY (country, signup_date)\")\n" +
        "spark.sql(\"VACUUM delta.`/lake/silver/users` RETAIN 168 HOURS\")   # 7 days",
      caption:
        "MERGE upserts by key with copy-on-write file rewrites, versionAsOf/timestampAsOf reproduce past states, mergeSchema evolves the schema safely, and OPTIMIZE ZORDER + VACUUM keep the file layout and storage healthy."
    },

    whyMatters:
      "<p>The reason lakehouse questions dominate interviews is that they solve the two things a raw data lake cannot do: <b>correct concurrent writes</b> and <b>row-level updates</b>. GDPR deletes, late-arriving corrections, CDC upserts, and re-runnable pipelines all require transactional updates — impossible on plain Parquet, trivial on Delta.</p>" +
      "<p>The mental model to carry in:</p>" +
      "<ul>" +
      "<li><b>Data files are immutable Parquet</b>; the <b>_delta_log</b> is the source of truth for which files are live.</li>" +
      "<li><b>A commit is one atomic append</b> to the log (add/remove file actions), which is why concurrent readers never see a partial write.</li>" +
      "<li><b>MERGE is copy-on-write</b>: touched files are rewritten in full, so updating a few rows can rewrite whole files — layout matters.</li>" +
      "<li><b>VACUUM breaks time travel</b> beyond its retention window, because it physically deletes the old files older versions point at.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">/lake/silver/users/\n" +
      "  part-0000.parquet   part-0001.parquet   ...      &lt;- immutable data files\n" +
      "  _delta_log/\n" +
      "    00000000000000000000.json   add part-0000, part-0001\n" +
      "    00000000000000000001.json   remove part-0000, add part-0007   (a MERGE)\n" +
      "    00000000000000000010.checkpoint.parquet     &lt;- fast replay every ~10 commits</pre>",

    recognize: [
      { q: "\"We need to GDPR-delete specific users from the data lake.\"", think: "Plain Parquet can't delete rows. Delta DELETE / MERGE rewrites only the affected files transactionally; run VACUUM afterward to physically remove the old files carrying that data." },
      { q: "\"A downstream bug corrupted yesterday's table — can we roll back?\"", think: "Time travel. Read versionAsOf or timestampAsOf just before the bad run and RESTORE, provided VACUUM hasn't reclaimed those files yet." },
      { q: "\"Two jobs write the same table and we sometimes read garbage.\"", think: "That's the lack of ACID on Parquet. Delta commits are atomic log appends with optimistic concurrency, so readers always get a consistent snapshot." },
      { q: "\"Our upstream added a column and the pipeline broke.\"", think: "Delta schema enforcement rejected the mismatched write on purpose. Opt into the change with mergeSchema (or ALTER TABLE) rather than disabling enforcement." },
      { q: "\"Queries got slow and there are millions of tiny files.\"", think: "Run OPTIMIZE to compact, and ZORDER BY the common filter columns for data skipping; consider auto-compaction/optimized writes on the table." },
      { q: "\"Why a lakehouse instead of a warehouse?\"", think: "One governed ACID copy on cheap object storage serves SQL/BI, streaming, and ML together — no separate warehouse to copy data into and keep in sync." }
    ],

    matchTags: ["delta lake", "lakehouse", "transaction log", "acid", "merge", "upsert",
                "time travel", "schema evolution", "optimize", "zorder", "vacuum", "parquet"],

    traps: [
      {
        bad: "df.write.mode('overwrite').parquet(path)   # plain Parquet 'table'",
        good: "df.write.format('delta').mode('overwrite').save(path)  # ACID, updatable",
        why: "Plain Parquet has no transaction log: no atomic commits, no row-level UPDATE/DELETE/MERGE, no time travel, and a failed overwrite can leave the directory half-written. Delta adds all of that on the same Parquet files for essentially the same storage cost."
      },
      {
        bad: "spark.sql(\"VACUUM tbl RETAIN 0 HOURS\")    # reclaim everything now",
        good: "spark.sql(\"VACUUM tbl RETAIN 168 HOURS\")  # keep a safe retention window",
        why: "VACUUM with a tiny retention deletes files that in-flight readers or concurrent writers may still reference and destroys time travel. Delta guards this with a 7-day default (retentionDurationCheck); only shorten it deliberately when you understand the trade-off."
      },
      {
        bad: "for row in updates.collect():          # per-row UPDATE in a loop\n    tbl.update(cond=..., set=...)",
        good: "tbl.alias('t').merge(updates.alias('s'), 't.id = s.id') \\\n   .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()",
        why: "Each UPDATE is a full transaction that rewrites files and commits to the log; looping per row serializes thousands of commits and rewrites the same files repeatedly. A single MERGE applies the whole batch in one transaction with copy-on-write on just the affected files."
      }
    ],

    complexity: [
      { op: "append write", big_o: "O(new data)", note: "Writes new Parquet files and appends one add-file commit to the log; existing files are untouched, so appends are cheap and don't rewrite the table." },
      { op: "MERGE / UPDATE / DELETE", big_o: "full file rewrite", note: "Copy-on-write: every data file containing a matched row is read, rewritten without/with the change, and swapped in the log — cost scales with files touched, not rows changed." },
      { op: "log replay (snapshot)", big_o: "O(commits since checkpoint)", note: "A read reconstructs the live file set by replaying JSON commits from the latest Parquet checkpoint, which is why checkpoints every ~10 commits keep reads fast." },
      { op: "time travel read", big_o: "O(commits to version)", note: "Reads reconstruct the file set as of a version/timestamp from the log; free until VACUUM reclaims the files that version references." },
      { op: "OPTIMIZE (+ ZORDER)", big_o: "full rewrite of target", note: "Reads many small files and writes fewer large ones (ZORDER also sorts by the given columns), an expensive rewrite you run periodically, not per write." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A Delta table is a directory of immutable Parquet data files plus a <code>_delta_log</code>. Each transaction appends a numbered JSON file containing <b>actions</b> — mainly <code>add</code> and <code>remove</code> file entries plus metadata and stats. The current table state is the result of replaying every commit in order; to avoid replaying thousands of tiny JSONs, Delta writes a consolidated <b>Parquet checkpoint</b> roughly every 10 commits and readers start from the newest checkpoint.</p>" +
      "<p>Isolation is <b>optimistic concurrency control</b>: a writer reads the current version, does its work, then tries to commit version <code>N+1</code>. If another writer already claimed <code>N+1</code>, it re-checks whether the conflicting commit touched overlapping files and either retries or fails — so appends to disjoint partitions rarely conflict while two MERGEs on the same files will. Each <code>add</code> action stores <b>min/max stats per column</b>, which powers <b>data skipping</b>: the reader prunes whole files whose stats can't match the predicate, and <code>ZORDER</code> makes that pruning far more effective by clustering related values into the same files.</p>" +
      "<p><code>VACUUM</code> is the one destructive maintenance op: it deletes data files no longer referenced by the current version and older than the retention window (default 7 days). That reclaims storage from old MERGE/DELETE rewrites but also removes the ability to time-travel to versions that depended on those files.</p>",

    challenge: {
      prompt:
        "You ingest a daily CDC feed of customer records (inserts, updates, and deletes flagged by an op column) into a Delta 'silver' table keyed by customer_id. Rerunning yesterday's feed must not create duplicates, hard-deletes must actually remove rows, and analysts need to reproduce last week's state. Write the MERGE and say how time travel and OPTIMIZE fit in.",
      starter:
        "# cdc has columns: customer_id, ...fields..., op in ('I','U','D')\n" +
        "tbl = DeltaTable.forPath(spark, '/lake/silver/customers')\n" +
        "# upsert I/U, delete D, idempotently, keyed by customer_id\n" +
        "# then: how do analysts read last week? how do you keep files healthy?",
      solution:
        "from delta.tables import DeltaTable\n" +
        "tbl = DeltaTable.forPath(spark, '/lake/silver/customers')\n" +
        "# One MERGE handles insert, update AND delete keyed by the business key,\n" +
        "# so a re-run of the same batch is idempotent (same keys, same result).\n" +
        "(tbl.alias('t')\n" +
        "    .merge(cdc.alias('s'), 't.customer_id = s.customer_id')\n" +
        "    .whenMatchedDelete(condition=\"s.op = 'D'\")\n" +
        "    .whenMatchedUpdateAll(condition=\"s.op = 'U'\")\n" +
        "    .whenNotMatchedInsert(condition=\"s.op != 'D'\", values={\n" +
        "        'customer_id': 's.customer_id'  # ...map remaining columns...\n" +
        "    })\n" +
        "    .execute())\n" +
        "# Reproduce last week's state via time travel:\n" +
        "spark.read.format('delta').option('timestampAsOf', '2026-09-03').load('/lake/silver/customers')\n" +
        "# Keep layout healthy (MERGE rewrites files -> small-file growth):\n" +
        "spark.sql(\"OPTIMIZE delta.`/lake/silver/customers` ZORDER BY (customer_id)\")\n" +
        "spark.sql(\"VACUUM  delta.`/lake/silver/customers` RETAIN 336 HOURS\")  # 14d > audit need"
    }
  },

  {
    id: "structured-streaming",
    title: "Structured Streaming",
    difficulty: "Advanced",
    estMinutes: 15,
    relevance: 3,
    tagline: "Structured Streaming is the DataFrame API run on an unbounded table — you write a batch query and Spark incrementally executes it forever, with checkpoints for exactly-once and watermarks to bound state.",

    whatIsIt: [
      "The core idea is the <b>unbounded table</b>: a stream is modeled as a table that new rows are continuously appended to. You write the <i>same</i> DataFrame/SQL transformations you'd write on a static table, and Spark's engine turns them into an <b>incremental</b> query that processes only the new data on each run and updates the result. There is no separate streaming API to learn.",
      "Execution is <b>micro-batch</b> by default: Spark repeatedly runs a tiny batch job over the newly arrived data at a cadence set by the <b>trigger</b>. Options are <code>processingTime='30 seconds'</code> (fixed cadence), <code>availableNow=True</code> (drain all currently-available data in batches, then stop — great for scheduled incremental jobs), and the older <code>once=True</code>. A separate low-latency <b>continuous</b> mode exists but is rarely used.",
      "<b>Sources</b> read from Kafka, files landing in a directory, or a Delta table; <b>sinks</b> write to Kafka, files/Delta, the console, or arbitrary logic via <b>foreachBatch</b> (which hands you each micro-batch as a normal DataFrame — the escape hatch for MERGE-into-Delta, multi-sink writes, etc.). <b>outputMode</b> controls what's emitted each trigger: <code>append</code> (only new final rows), <code>update</code> (rows whose aggregate changed), or <code>complete</code> (the whole result table).",
      "For aggregations you group by <b>event time</b> (when the event happened) using tumbling/sliding <b>windows</b>. The hard problem is <b>late data</b> and unbounded state: Spark must keep every open window in memory in case a late row arrives. A <b>watermark</b> — <code>withWatermark('event_time', '10 minutes')</code> — tells the engine \"I won't wait for data more than 10 minutes late,\" so it can finalize and <b>drop old window state</b>, bounding memory and letting <code>append</code> mode emit finished windows.",
      "Fault tolerance is <b>checkpointing</b>: the query persists its source offsets and aggregation state to a checkpoint location. On restart it resumes from the last committed offsets, and combined with idempotent/transactional sinks (Delta, Kafka) this delivers <b>exactly-once</b> end-to-end. Stream-static joins (enrich a stream from a table) and stream-stream joins (with watermarks on both sides) are both supported."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# Source: read a Kafka topic as an unbounded DataFrame\n" +
        "raw = (spark.readStream.format('kafka')\n" +
        "            .option('kafka.bootstrap.servers', 'broker:9092')\n" +
        "            .option('subscribe', 'clicks')\n" +
        "            .load())\n" +
        "\n" +
        "events = (raw.select(F.from_json(F.col('value').cast('string'), schema).alias('e'))\n" +
        "             .select('e.*'))   # event_time, user_id, url, ...\n" +
        "\n" +
        "# Event-time windowed aggregation with a watermark to bound state\n" +
        "counts = (events\n" +
        "    .withWatermark('event_time', '10 minutes')      # allow 10 min lateness\n" +
        "    .groupBy(F.window('event_time', '5 minutes'), 'url')\n" +
        "    .count())\n" +
        "\n" +
        "# Sink: write to Delta, exactly-once via checkpoint, drain-then-stop trigger\n" +
        "q = (counts.writeStream\n" +
        "        .format('delta')\n" +
        "        .outputMode('append')            # emit windows once watermark passes\n" +
        "        .option('checkpointLocation', '/lake/_chk/click_counts')\n" +
        "        .trigger(availableNow=True)      # process all available, then stop\n" +
        "        .toTable('lake.gold.click_counts'))\n" +
        "\n" +
        "# foreachBatch: run arbitrary batch logic (e.g. MERGE) per micro-batch\n" +
        "def upsert(batch_df, batch_id):\n" +
        "    (DeltaTable.forName(spark, 'lake.silver.users').alias('t')\n" +
        "        .merge(batch_df.alias('s'), 't.id = s.id')\n" +
        "        .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())\n" +
        "\n" +
        "(events.writeStream\n" +
        "       .foreachBatch(upsert)\n" +
        "       .option('checkpointLocation', '/lake/_chk/user_upsert')\n" +
        "       .trigger(processingTime='1 minute').start())",
      caption:
        "Read Kafka as an unbounded DataFrame, aggregate by event-time window with a watermark that bounds state, and write to Delta exactly-once via a checkpoint; foreachBatch is the escape hatch for per-batch MERGE upserts."
    },

    whyMatters:
      "<p>Structured Streaming matters because it removes the biggest source of streaming bugs: you no longer maintain two codebases. The same transformations run on a bounded table (batch) or an unbounded one (stream). The whole interview then turns on three concepts that decide correctness and cost:</p>" +
      "<ul>" +
      "<li><b>Watermark</b> — bounds how long window/join state is kept; without it, stateful queries leak memory forever, and <code>append</code> mode can't know when a window is final.</li>" +
      "<li><b>outputMode</b> — must match the query: aggregations without a watermark can't use <code>append</code>; <code>complete</code> re-emits everything (only for small results); <code>update</code> emits changed keys.</li>" +
      "<li><b>Checkpoint</b> — the source of exactly-once. It stores committed offsets and state; delete it and you lose your position (reprocess or gap). It also pins the query's schema/state layout.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">event_time  09:07  (belongs to window 09:05-09:10)\n" +
      "max seen    09:19  ->  watermark = 09:19 - 10min = 09:09\n" +
      "window 09:05-09:10 stays OPEN (09:10 &gt; 09:09); a row for 08:50 is DROPPED as too late.\n" +
      "once watermark passes 09:10, that window is emitted (append) and its state freed.</pre>",

    recognize: [
      { q: "\"My streaming aggregation's memory grows without bound.\"", think: "No watermark, so every window's state is kept forever. Add withWatermark on the event-time column so old windows finalize and their state is dropped." },
      { q: "\"append output mode throws 'requires watermark' on my groupBy.\"", think: "Append can only emit a windowed aggregate once it's final; Spark needs a watermark to know that. Add withWatermark, or use update/complete mode." },
      { q: "\"I need to MERGE each micro-batch into a Delta table.\"", think: "Sinks don't support MERGE directly. Use foreachBatch(fn) — it hands you each batch as a normal DataFrame where you can run DeltaTable.merge idempotently by batch_id." },
      { q: "\"How do I run a streaming pipeline as a cheap scheduled incremental job?\"", think: "trigger(availableNow=True): it processes all data available now in micro-batches then stops, so a scheduler (or Airflow) runs it periodically instead of a 24/7 cluster." },
      { q: "\"After a crash, will I lose or double-count data?\"", think: "The checkpoint stores committed source offsets and state; on restart Spark resumes from them, and with a transactional sink (Delta/Kafka) you get exactly-once. Never delete or share the checkpoint dir." },
      { q: "\"Late events arrive hours later — do they count?\"", think: "Only if within the watermark's allowed lateness; beyond it they're dropped. Set the watermark to your real lateness tolerance, trading memory/latency for completeness." }
    ],

    matchTags: ["structured streaming", "streaming", "watermark", "event time", "window",
                "checkpoint", "exactly once", "foreachbatch", "kafka", "trigger", "outputmode", "micro-batch"],

    traps: [
      {
        bad: "events.groupBy(F.window('event_time','5 min')).count() \\\n  .writeStream.outputMode('append').start()   # no watermark",
        good: "events.withWatermark('event_time','10 minutes') \\\n  .groupBy(F.window('event_time','5 min')).count() \\\n  .writeStream.outputMode('append').start()",
        why: "Without a watermark Spark keeps every window's state forever (memory leak) and can't decide when a window is final, so append mode is rejected. The watermark bounds state and lets finished windows be emitted."
      },
      {
        bad: "q1.writeStream.option('checkpointLocation','/chk/shared').start()\nq2.writeStream.option('checkpointLocation','/chk/shared').start()",
        good: "q1.writeStream.option('checkpointLocation','/chk/q1').start()\nq2.writeStream.option('checkpointLocation','/chk/q2').start()",
        why: "A checkpoint directory stores one query's offsets and state and must be unique per streaming query. Sharing it corrupts offset tracking and state; each writeStream needs its own checkpointLocation."
      },
      {
        bad: "def batch_fn(df, bid):\n    df.write.format('delta').mode('append').save(path)  # non-idempotent on retry",
        good: "def batch_fn(df, bid):\n    if not already_processed(bid):        # or MERGE keyed by business id\n        df.write.format('delta').mode('append').save(path)",
        why: "foreachBatch can re-invoke a batch_id after a failure, so a blind append double-writes. Make the write idempotent: MERGE by business key, or use the batch_id/txn markers so a replayed batch is a no-op."
      }
    ],

    complexity: [
      { op: "per micro-batch scan", big_o: "O(new data)", note: "Each trigger processes only rows that arrived since the last committed offset, which is what makes streaming incremental rather than reprocessing the whole source." },
      { op: "stateful window agg", big_o: "O(open windows)", note: "State scales with the number of windows/keys kept alive; the watermark caps how many stay open, so a too-loose watermark inflates memory and shuffle." },
      { op: "watermark state cleanup", big_o: "incremental", note: "Once the watermark passes a window's end, its state is evicted and the window is emitted (in append mode), keeping memory bounded regardless of stream length." },
      { op: "checkpoint commit", big_o: "O(state + offsets)", note: "Each batch persists source offsets and updated state to the checkpoint; larger state means heavier checkpoint I/O, a real cost for wide keyed aggregations." },
      { op: "stream-stream join", big_o: "O(buffered rows within watermark)", note: "Both sides buffer rows until their watermarks allow a match to expire; without watermarks on both sides the buffers grow without bound." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A streaming query is a loop. Each trigger the engine asks every source for the range of new offsets, writes those offsets to the <b>checkpoint's offset log</b>, plans a micro-batch that reads exactly that range, executes it (a normal Spark job), updates any <b>state store</b>, then writes a <b>commit log</b> entry marking the batch done. On restart it reads the last committed batch and replays from there — reprocessing the last uncommitted batch, which is why sinks must be idempotent or transactional for exactly-once.</p>" +
      "<p>Stateful operators (windowed aggregations, dedup, stream-stream joins, <code>[flat]MapGroupsWithState</code>) keep key-partitioned state in a <b>state store</b> (default an in-memory + HDFS-backed store; RocksDB is the recommended backend for large state). The <b>watermark</b> is a moving timestamp = <code>max(event_time seen) - allowedLateness</code>; the engine uses it to (a) drop input rows older than the watermark and (b) evict state for windows/joins whose time has fully passed. Choosing the watermark is a direct <b>completeness vs. memory/latency</b> trade-off.</p>" +
      "<p><b>outputMode</b> is constrained by the query. Non-aggregating queries use <code>append</code>. Aggregations support <code>update</code> (emit changed keys each batch) and <code>complete</code> (re-emit the whole result — only viable for small results); <code>append</code> on an aggregation additionally <b>requires a watermark</b> so the engine knows a window is final before emitting it once.</p>",

    challenge: {
      prompt:
        "Build a streaming pipeline that reads a Kafka 'orders' topic, computes 1-hour tumbling revenue per store on event time, tolerates up to 15 minutes of late data, writes results to a Delta gold table exactly-once, and can be run as a periodic incremental job rather than a 24/7 stream. Name every setting that makes it correct.",
      starter:
        "raw = spark.readStream.format('kafka').option('subscribe','orders').load()\n" +
        "orders = raw.select(...)   # event_time, store_id, amount\n" +
        "# windowed revenue + late data + exactly-once + periodic run: fill in\n" +
        "orders.writeStream. ...",
      solution:
        "from pyspark.sql import functions as F\n" +
        "orders = (raw.select(F.from_json(F.col('value').cast('string'), schema).alias('o'))\n" +
        "             .select('o.*'))   # event_time, store_id, amount\n" +
        "\n" +
        "revenue = (orders\n" +
        "    .withWatermark('event_time', '15 minutes')          # allowed lateness\n" +
        "    .groupBy(F.window('event_time', '1 hour'), 'store_id')\n" +
        "    .agg(F.sum('amount').alias('revenue')))\n" +
        "\n" +
        "q = (revenue.writeStream\n" +
        "        .format('delta')\n" +
        "        .outputMode('append')            # emit each window once final (needs watermark)\n" +
        "        .option('checkpointLocation', '/lake/_chk/gold_revenue')  # exactly-once + resume\n" +
        "        .trigger(availableNow=True)      # drain available data then stop = periodic job\n" +
        "        .toTable('lake.gold.hourly_revenue'))\n" +
        "q.awaitTermination()\n" +
        "# Correctness knobs: withWatermark bounds state & enables append; the unique\n" +
        "# checkpointLocation gives exactly-once via committed Kafka offsets + Delta txn;\n" +
        "# availableNow makes it a schedulable incremental batch, not a 24/7 cluster."
    }
  },

  {
    id: "aqe-deep-dive",
    title: "Adaptive Query Execution (AQE) Deep-Dive",
    difficulty: "Advanced",
    estMinutes: 13,
    relevance: 3,
    tagline: "AQE lets Spark tear up its own physical plan mid-flight using the real sizes of finished shuffle stages — fixing partition counts, join strategy, and skew that the up-front optimizer guessed wrong.",

    whatIsIt: [
      "Spark's Catalyst optimizer normally freezes the <b>entire physical plan before execution</b>, using estimated statistics from table metadata. Those estimates are routinely off by orders of magnitude after filters and joins, so Spark picks the wrong shuffle-partition count, keeps a sort-merge join it should have broadcast, or ignores a skewed key. <b>Adaptive Query Execution</b> (<code>spark.sql.adaptive.enabled</code>, on by default since Spark 3.2) fixes this by <b>re-optimizing between stages</b>.",
      "The unit of adaptation is the <b>query stage</b>: a shuffle (Exchange) is a natural break point. When a stage finishes, Spark has <i>exact</i> statistics — real row counts and byte sizes of the shuffle output. It feeds those back into the optimizer to re-plan the <i>remaining</i> stages before launching them. The plan you see in <code>explain()</code> is an <code>AdaptiveSparkPlan isFinalPlan=false</code> — a placeholder that gets rewritten as stages complete.",
      "<b>Optimization 1 — dynamically coalesce shuffle partitions.</b> The static <code>spark.sql.shuffle.partitions</code>=200 is applied blindly; after a shuffle Spark sees the actual output is, say, 40MB and coalesces those 200 tiny partitions into a handful of ~64MB partitions (<code>advisoryPartitionSizeInBytes</code>), eliminating scheduling overhead from thousands of empty/tiny tasks.",
      "<b>Optimization 2 — switch sort-merge join to broadcast at runtime.</b> If, after a join side's shuffle stage completes, that side's real size is under <code>autoBroadcastJoinThreshold</code> (10MB default), Spark rewrites the still-pending join from a shuffle sort-merge into a <b>broadcast hash join</b>, avoiding the expensive shuffle of the large side. Up-front the optimizer couldn't know the side would shrink that much.",
      "<b>Optimization 3 — skew join handling.</b> With <code>spark.sql.adaptive.skewJoin.enabled</code>, Spark detects partitions whose size is both &gt; <code>skewedPartitionFactor</code>× the median and &gt; <code>skewedPartitionThresholdInBytes</code>, then <b>splits</b> each skewed partition into sub-partitions (replicating the matching side) so no single task straggles on a hot key — automating what you'd otherwise hand-salt."
    ],

    showMe: {
      code:
        "# AQE master switch (default true in Spark 3.2+) and its three features\n" +
        "spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\n" +
        "\n" +
        "# Target partition size AQE coalesces toward (tune instead of shuffle.partitions)\n" +
        "spark.conf.set('spark.sql.adaptive.advisoryPartitionSizeInBytes', 64 * 1024 * 1024)\n" +
        "\n" +
        "# Runtime broadcast conversion uses the normal broadcast threshold\n" +
        "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 10 * 1024 * 1024)\n" +
        "\n" +
        "# Skew detection thresholds: skewed = > factor*median AND > threshold bytes\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionFactor', '5')\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', '256m')\n" +
        "\n" +
        "result = fact.join(dim, 'id').groupBy('day').agg(F.sum('amt'))\n" +
        "\n" +
        "# Before running, the plan is provisional:\n" +
        "result.explain()\n" +
        "# == Physical Plan ==\n" +
        "# AdaptiveSparkPlan isFinalPlan=false\n" +
        "#   +- ... Exchange ...          <- coalesced / converted / split at runtime\n" +
        "\n" +
        "result.collect()          # after running, the final plan is materialized\n" +
        "# result.explain() now shows isFinalPlan=true with the rewritten operators",
      caption:
        "Enable AQE and its coalesce/skew sub-flags, tune advisoryPartitionSizeInBytes rather than a fixed shuffle.partitions, and read explain(): AdaptiveSparkPlan isFinalPlan=false means the plan will be rewritten from real stage statistics."
    },

    whyMatters:
      "<p>AQE matters because the optimizer's biggest failures come from <b>bad cardinality estimates</b> — and no amount of static tuning fixes an estimate that's wrong per query and per day. AQE replaces estimation with measurement at the exact moment the data is known. It's the first thing to turn on before hand-tuning partitions or join hints.</p>" +
      "<p>The three wins map to the three classic symptoms:</p>" +
      "<ul>" +
      "<li><b>Thousands of tiny tasks / a huge result split into 200 partitions</b> → coalesce shuffle partitions.</li>" +
      "<li><b>A sort-merge join where one side turned out small</b> → runtime broadcast conversion.</li>" +
      "<li><b>One straggler task at 99%</b> → skew-join split.</li>" +
      "</ul>" +
      "<p>Its limits are equally testable: AQE only reacts to <b>stages that have already run</b> (it needs a shuffle to get real stats), so a single-scan query with no exchange gets nothing, and it can't fix skew that lives in a source before any shuffle.</p>" +
      "<pre class=\"why-pre\">plan (before run):  SortMergeJoin  +  200 shuffle partitions\nstage 1 finishes -> dim side is 6MB (est. was 800MB!)  &lt; 10MB threshold\nAQE rewrites     -> BroadcastHashJoin, and coalesces 200 -> 4 partitions</pre>",

    recognize: [
      { q: "\"What's the right value for spark.sql.shuffle.partitions?\"", think: "With AQE on you mostly stop setting it — coalescePartitions sizes output from real stats toward advisoryPartitionSizeInBytes. Tune the advisory size, not the fixed count." },
      { q: "\"A join I expected to broadcast is running as sort-merge.\"", think: "Up-front the side looked big. AQE will convert to broadcast once the side's stage finishes under autoBroadcastJoinThreshold; if it's borderline, F.broadcast() forces it deterministically." },
      { q: "\"Job stuck at 99% with one straggler task in a join.\"", think: "Skew. Enable spark.sql.adaptive.skewJoin.enabled so AQE splits the oversized partition (> factor*median and > threshold bytes) into sub-partitions." },
      { q: "\"explain() shows AdaptiveSparkPlan isFinalPlan=false — is that a problem?\"", think: "No — it means AQE is active and the plan is provisional. The real operators (coalesce/broadcast/skew split) appear only after the stages run; check the SQL tab or re-explain post-run." },
      { q: "\"I enabled AQE but my narrow scan didn't get faster.\"", think: "AQE needs a shuffle stage to gather runtime stats. A single-scan/no-exchange query has nothing to adapt; the benefit shows up on joins and aggregations." }
    ],

    matchTags: ["aqe", "adaptive query execution", "coalesce partitions", "skew join",
                "broadcast", "runtime statistics", "query stage", "shuffle partitions", "tuning", "catalyst"],

    traps: [
      {
        bad: "spark.conf.set('spark.sql.shuffle.partitions', '4000')  # static guess",
        good: "spark.conf.set('spark.sql.adaptive.enabled', 'true')  # + advisoryPartitionSizeInBytes",
        why: "A hard-coded high count spawns thousands of tiny tasks whose scheduling overhead dominates on small stages, and is still too few on huge ones. AQE coalesces post-shuffle partitions toward a target byte size using real stats, adapting per stage."
      },
      {
        bad: "spark.conf.set('spark.sql.adaptive.enabled', 'false')  # 'for reproducible plans'",
        good: "spark.conf.set('spark.sql.adaptive.enabled', 'true')   # keep runtime re-optimization",
        why: "Disabling AQE forgoes coalescing, runtime broadcast conversion, and skew handling, sending you back to hand-tuning from stale estimates. Keep it on; if you need determinism for a specific op, add explicit hints (F.broadcast) rather than turning AQE off."
      },
      {
        bad: "# rely on AQE skew split but leave it disabled\nbig.join(bigger, 'hot_key')",
        good: "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\nbig.join(bigger, 'hot_key')",
        why: "Coalescing and broadcast conversion are on with AQE, but skew-join splitting is its own sub-flag with its own thresholds. If it's off, a hot key still produces a straggler even with AQE enabled — turn on skewJoin (or salt manually)."
      }
    ],

    complexity: [
      { op: "coalesce shuffle partitions", big_o: "runtime adaptive", note: "After a shuffle, merges small output partitions toward advisoryPartitionSizeInBytes using exact byte sizes, cutting task count with no extra shuffle." },
      { op: "sort-merge -> broadcast switch", big_o: "runtime adaptive", note: "When a completed join side's real size is under the broadcast threshold, rewrites the pending join to broadcast, eliminating the large side's shuffle mid-query." },
      { op: "skew-join split", big_o: "runtime adaptive", note: "Splits partitions exceeding factor*median and threshold bytes into sub-tasks (replicating the other side), removing the single-task straggler on a hot key." },
      { op: "re-optimize between stages", big_o: "O(remaining plan)", note: "At each stage boundary Spark re-runs the relevant optimizer rules on the not-yet-executed plan using materialized stats — cheap relative to the query it saves." },
      { op: "no-shuffle / single-scan query", big_o: "no adaptation", note: "With no Exchange there's no query-stage boundary and no runtime stats, so AQE has nothing to adapt — its wins are on joins and aggregations." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> AQE reframes execution around <b>query stages</b> split at shuffle (and materialization) boundaries. Spark submits the leaf stages, waits for them to <b>materialize</b>, and reads back <code>MapOutputStatistics</code> — the true per-partition byte sizes of the shuffle. It then re-runs a set of <b>physical optimizer rules</b> on the remaining, not-yet-submitted plan: <code>CoalesceShufflePartitions</code>, <code>OptimizeSkewedJoin</code>, and the logical-to-physical <code>DynamicJoinSelection</code> that can demote a sort-merge to a broadcast hash join. This repeats stage by stage until <code>isFinalPlan=true</code>.</p>" +
      "<p>Coalescing works because the static <code>spark.sql.shuffle.partitions</code> only sets an <i>upper bound</i> on partitions; AQE contiguously merges the resulting small partitions until each approaches <code>advisoryPartitionSizeInBytes</code> (default 64MB). Skew handling reads the same statistics: a partition is skewed if it exceeds both <code>skewedPartitionFactor</code>× the median partition size and <code>skewedPartitionThresholdInBytes</code>, and each skewed partition is divided into sub-partitions that join against a replicated copy of the matching side.</p>" +
      "<p>The fundamental limitation follows from the mechanism: AQE can only use statistics from stages that have <b>already completed</b>, so it needs at least one shuffle to act, and it can't preempt skew or misestimation that never crosses a stage boundary. That's why it complements — rather than replaces — good partitioning, broadcast hints, and file layout.</p>",

    challenge: {
      prompt:
        "A report joins a 2TB fact to a dimension the planner estimated at 900MB, groups by region, and writes a ~20MB result. In production the dimension is actually 7MB after upstream filtering, the job runs a sort-merge join, produces 200 near-empty output partitions, and one task straggles on a dominant region. Which AQE settings address each symptom, and where does AQE fall short?",
      starter:
        "# symptoms: unwanted sort-merge, 200 tiny output partitions, 1 straggler\n" +
        "fact.join(dim, 'id').groupBy('region').agg(F.sum('amt')).write.parquet(out)\n" +
        "# map each symptom to an AQE flag; note AQE's limit",
      solution:
        "# Turn on AQE + all three features:\n" +
        "spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
        "# 1) sort-merge although dim is really 7MB -> runtime broadcast conversion\n" +
        "#    (uses autoBroadcastJoinThreshold; happens once dim's stage finishes)\n" +
        "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 10 * 1024 * 1024)\n" +
        "# 2) 200 tiny output partitions for a 20MB result -> coalesce\n" +
        "spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.advisoryPartitionSizeInBytes', 64 * 1024 * 1024)\n" +
        "# 3) dominant region straggler -> skew-join split\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')\n" +
        "\n" +
        "fact.join(dim, 'id').groupBy('region').agg(F.sum('amt')).write.parquet(out)\n" +
        "# Limit: AQE only adapts AFTER a shuffle stage materializes real stats.\n" +
        "# It can't fix skew that never crosses a shuffle, and a single-scan query\n" +
        "# with no Exchange gets no adaptation at all. For a guaranteed broadcast,\n" +
        "# F.broadcast(dim) removes the dependence on the runtime estimate."
    }
  },

  {
    id: "file-layout",
    title: "File Layout: Partitioning, Bucketing & Compaction",
    difficulty: "Core",
    estMinutes: 13,
    relevance: 3,
    tagline: "How your data is physically laid out on disk — partition directories, bucket files, file sizes, and column clustering — decides how much Spark can skip reading, and skipping is where most speed comes from.",

    whatIsIt: [
      "Query speed on a lake is dominated by <b>how little you have to read</b>. Three physical-layout levers control that: <b>partitioning</b> (directory layout for pruning), <b>bucketing</b> (pre-hashed files to avoid shuffles), and <b>file sizing/clustering</b> (compaction + Z-order for efficient scans and data skipping). All sit on top of <b>Parquet</b>, a columnar format that already lets Spark read only the columns you select and skip row groups via footer statistics.",
      "<b>Partitioning</b> (<code>partitionBy('date')</code>) writes a directory per partition value (<code>date=2026-09-10/</code>). A query filtering on that column reads only the matching directories — <b>partition pruning</b> — skipping the rest entirely. The trap is <b>over-partitioning</b>: partition on a high-cardinality column (like user_id) and you get millions of tiny directories, each a few KB — the <b>small-files problem</b>, which cripples the metadata/listing step and wastes I/O. Rule of thumb: partition on low-cardinality columns you filter on, aiming for partitions of at least ~128MB–1GB.",
      "<b>Bucketing</b> (<code>bucketBy(n, 'user_id')</code>, saved as a table) hash-distributes rows into a fixed number of files by a key <i>at write time</i>. Two tables bucketed the same way on the join key can be <b>joined without a shuffle</b> (and aggregations on the bucket key skip the exchange too), because matching keys are already co-located in corresponding buckets. It's the pre-shuffle you pay once on write to save on every read.",
      "<b>Compaction</b> fixes small files after the fact: rewrite many tiny files into fewer right-sized ones. In Delta that's <code>OPTIMIZE</code>; in plain Parquet it's a <code>repartition(...).write</code> rewrite. <b>Z-ordering</b> (<code>OPTIMIZE ... ZORDER BY (a, b)</code>) goes further — it sorts data along a space-filling curve so rows with similar values of <i>multiple</i> columns land in the same files, making min/max <b>data skipping</b> effective on all of them at once (unlike partitioning, which only helps one dimension).",
      "Underneath, <b>Parquet</b> gives you three free wins the layout amplifies: <b>column pruning</b> (read only selected columns), <b>predicate pushdown</b> (skip row groups whose min/max footer stats can't match the filter), and efficient compression. Good file layout exists to make pruning and pushdown skip as much as possible."
    ],

    showMe: {
      code:
        "from pyspark.sql import functions as F\n" +
        "\n" +
        "# Partitioning: directory per low-cardinality value -> partition pruning\n" +
        "(events.write.format('delta')\n" +
        "        .partitionBy('event_date')      # NOT user_id (too high-cardinality!)\n" +
        "        .mode('append').save('/lake/events'))\n" +
        "\n" +
        "# A filter on the partition column reads only matching directories\n" +
        "spark.read.format('delta').load('/lake/events').filter(F.col('event_date') == '2026-09-10')\n" +
        "\n" +
        "# Bucketing: pre-hash by join key so joins skip the shuffle (table API)\n" +
        "(orders.write.bucketBy(256, 'user_id').sortBy('user_id')\n" +
        "        .mode('overwrite').saveAsTable('orders_bucketed'))\n" +
        "(users.write.bucketBy(256, 'user_id').sortBy('user_id')\n" +
        "        .mode('overwrite').saveAsTable('users_bucketed'))\n" +
        "# join on user_id -> no exchange, both sides already co-located\n" +
        "spark.table('orders_bucketed').join(spark.table('users_bucketed'), 'user_id')\n" +
        "\n" +
        "# Compaction + multi-dimensional clustering (Delta)\n" +
        "spark.sql(\"OPTIMIZE delta.`/lake/events` ZORDER BY (country, user_id)\")\n" +
        "\n" +
        "# Plain-Parquet compaction: rewrite many small files into fewer big ones\n" +
        "(spark.read.parquet('/raw/tiny_files')\n" +
        "      .repartition(64)\n" +
        "      .write.mode('overwrite').parquet('/raw/compacted'))",
      caption:
        "partitionBy prunes whole directories on low-cardinality filters, bucketBy pre-shuffles both sides of a join by key, and OPTIMIZE ZORDER (or a repartition rewrite) compacts small files while clustering related values for multi-column data skipping."
    },

    whyMatters:
      "<p>Layout is leverage: you pay a one-time write cost to make every future read cheaper. The two failure modes it prevents are the ones that show up constantly in production — <b>reading too much</b> (no pruning) and the <b>small-files problem</b> (too many tiny reads and huge file-listing overhead).</p>" +
      "<ul>" +
      "<li><b>Partition</b> on low-cardinality columns you filter on → directory pruning. Over-partitioning creates the small-files problem you were trying to avoid.</li>" +
      "<li><b>Bucket</b> on a join/aggregation key → skip the shuffle on every read, at the cost of a fixed bucket count decided at write time.</li>" +
      "<li><b>Compact + Z-order</b> → right-sized files and multi-column data skipping when a single partition column isn't enough.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">over-partitioned by user_id:  50M dirs x ~3KB each   -> listing dominates, tasks starve\npartition by event_date:      365 dirs x ~500MB each -> prune to 1 dir on a date filter\n+ ZORDER BY (country,user_id): min/max skipping on BOTH cols within each date</pre>",

    recognize: [
      { q: "\"Queries scan the whole table even with a WHERE on date.\"", think: "The table isn't partitioned (or is partitioned on a different column). partitionBy the filter column so Spark prunes directories; verify pruning in the scan's 'PartitionFilters' in explain()." },
      { q: "\"We have millions of tiny files and listing takes forever.\"", think: "Small-files problem, usually from over-partitioning or streaming appends. Compact with OPTIMIZE (Delta) or a repartition rewrite, and stop partitioning on a high-cardinality column." },
      { q: "\"This big join shuffles both sides every single run.\"", think: "If it's a recurring join on a stable key, bucketBy both tables on that key with the same bucket count so the join is shuffle-free thereafter." },
      { q: "\"I filter on several columns and partitioning only one doesn't help.\"", think: "Partitioning helps one dimension. ZORDER BY the multiple filter columns so min/max data skipping is effective on all of them together." },
      { q: "\"How big should my files be?\"", think: "Aim for ~128MB-1GB per file: big enough to amortize open/listing overhead and get full row groups, small enough for parallelism. Compaction/advisory sizing gets you there." }
    ],

    matchTags: ["partitioning", "partitionby", "bucketing", "bucketby", "compaction",
                "small files", "z-order", "data skipping", "predicate pushdown", "parquet", "partition pruning", "optimize"],

    traps: [
      {
        bad: "df.write.partitionBy('user_id').parquet(path)   # high-cardinality!",
        good: "df.write.partitionBy('event_date').parquet(path)  # low-cardinality filter col",
        why: "Partitioning on a high-cardinality column creates one tiny directory per value — millions of KB-sized files whose listing and task overhead dwarf the actual read. Partition on low-cardinality columns you filter on; use ZORDER for high-cardinality skipping."
      },
      {
        bad: "orders.join(users, 'user_id')   # recurring join, both re-shuffled every run",
        good: "# pre-bucket both on user_id once, then join shuffle-free\norders.write.bucketBy(256,'user_id').saveAsTable('orders_b')",
        why: "For a stable, repeated join key, shuffling both large sides on every query is wasted work. Bucketing both tables by the same key and count co-locates matching rows, so subsequent joins skip the exchange."
      },
      {
        bad: "stream.writeStream.format('delta').start(path)  # never compacted",
        good: "# schedule OPTIMIZE (or enable auto-compaction) to merge streaming files\nspark.sql(\"OPTIMIZE delta.`/lake/events`\")",
        why: "Streaming and frequent small appends accumulate many tiny files, degrading every downstream read. Periodic OPTIMIZE (or Delta auto-compaction / optimizeWrite) rewrites them into right-sized files without changing query results."
      }
    ],

    complexity: [
      { op: "partition pruning", big_o: "O(matching partitions)", note: "A filter on the partition column lists and reads only matching directories, so cost scales with selected partitions, not table size — the biggest single-lever speedup." },
      { op: "over-partitioning (small files)", big_o: "O(#files) overhead", note: "High-cardinality partitioning makes file listing and task scheduling dominate; per-file open cost swamps the tiny reads, the classic small-files problem." },
      { op: "bucketed join", big_o: "no shuffle", note: "Matching keys are co-located in corresponding buckets at write time, so a join/aggregation on the bucket key skips the Exchange entirely — pay once on write, save every read." },
      { op: "OPTIMIZE / compaction", big_o: "full rewrite of target", note: "Reads many small files and writes fewer large ones (ZORDER also sorts by the given columns); expensive, so it's scheduled periodically rather than per write." },
      { op: "predicate pushdown / skipping", big_o: "O(surviving row groups)", note: "Parquet footer + Delta min/max stats let Spark skip whole files/row groups that can't match; ZORDER clustering maximizes how many get skipped." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Partitioning is nothing but <b>directory structure</b>: <code>partitionBy('event_date')</code> encodes the value in the path (<code>event_date=2026-09-10/</code>), and the query planner turns a matching filter into <b>PartitionFilters</b> that prune directories before any file is opened — you can see them in <code>explain()</code>. Because the value lives in the path, the partition column may not even be stored in the files. The danger is cardinality: one directory per value, so a high-cardinality key explodes into millions of tiny files.</p>" +
      "<p>Bucketing is <b>hash pre-partitioning persisted to disk</b>: rows are assigned to <code>bucket = hash(key) % n</code> and written into <code>n</code> files per partition. When two tables share the same bucket key and count, Spark knows matching keys are already co-located and marks the join's exchange as unnecessary, so a <b>SortMergeJoin</b> runs without a shuffle. The cost is rigidity — the bucket count is fixed at write time and both sides must agree on it.</p>" +
      "<p>Data skipping rests on <b>statistics</b>: Parquet stores per-row-group min/max in the footer, and Delta stores per-file min/max in the log. For a predicate like <code>country = 'US'</code>, any file/row-group whose <code>[min,max]</code> can't contain 'US' is skipped unread. Partitioning gives perfect skipping on <i>one</i> column; <b>Z-ordering</b> reorders rows along a space-filling curve so multiple columns' values cluster together, making min/max ranges tight (and thus skipping effective) across <i>several</i> columns simultaneously.</p>",

    challenge: {
      prompt:
        "A 5TB clickstream Delta table is queried two ways: dashboards filter by event_date, and ad-hoc analysis filters by country and user_id. It's currently partitioned by user_id, has ~40M tiny files, and every join to a users dimension shuffles. Redesign the physical layout — partitioning, clustering, compaction, and the recurring join — and justify each choice.",
      starter:
        "# current: partitionBy('user_id') -> 40M tiny files; join re-shuffles daily\n" +
        "clicks.write.partitionBy('user_id').format('delta').save('/lake/clicks')\n" +
        "# fix partitioning, small files, multi-col filtering, and the join",
      solution:
        "# 1) Repartition physically by the LOW-cardinality dashboard filter:\n" +
        "(clicks.write.format('delta')\n" +
        "       .partitionBy('event_date')          # ~ hundreds of dirs, not 40M\n" +
        "       .mode('overwrite').save('/lake/clicks'))\n" +
        "# 2) Cluster within each date for the ad-hoc country/user_id filters and\n" +
        "#    compact the tiny files in one pass (multi-dim data skipping):\n" +
        "spark.sql(\"OPTIMIZE delta.`/lake/clicks` ZORDER BY (country, user_id)\")\n" +
        "# 3) Recurring join to users: bucket both by user_id so it's shuffle-free:\n" +
        "(clicks.write.bucketBy(512,'user_id').sortBy('user_id')\n" +
        "       .mode('overwrite').saveAsTable('clicks_bucketed'))\n" +
        "(users.write.bucketBy(512,'user_id').sortBy('user_id')\n" +
        "       .mode('overwrite').saveAsTable('users_bucketed'))\n" +
        "spark.table('clicks_bucketed').join(spark.table('users_bucketed'), 'user_id')\n" +
        "# Why: partition on event_date (low cardinality, dashboard filter) for\n" +
        "# directory pruning without the small-files blowup; ZORDER(country,user_id)\n" +
        "# gives min/max skipping on the ad-hoc dimensions a single partition can't;\n" +
        "# OPTIMIZE compacts 40M files to right-sized ones; bucketing removes the\n" +
        "# daily join shuffle. Schedule OPTIMIZE to absorb ongoing appends."
    }
  },

  {
    id: "production-patterns",
    title: "Production Patterns: CDC, Idempotency & Data Quality",
    difficulty: "Advanced",
    estMinutes: 14,
    relevance: 3,
    tagline: "Production pipelines are judged not on the happy path but on what happens when a job re-runs, an upstream schema drifts, or bad data arrives — idempotency, CDC upserts, and enforced data quality are how you survive all three.",

    whatIsIt: [
      "The organizing pattern is the <b>medallion architecture</b>: <b>bronze</b> (raw, append-only ingest exactly as received), <b>silver</b> (cleaned, deduplicated, conformed, business keys enforced), and <b>gold</b> (aggregated, business-level tables for BI/ML). Each layer is a Delta table; you reprocess forward from bronze without re-fetching from source. Data-quality and CDC logic live mostly at the bronze→silver boundary.",
      "<b>Idempotency</b> is the property that running the same batch twice produces the same result — mandatory because schedulers, retries, and backfills <i>will</i> re-run jobs. Two mechanisms: (1) <b>MERGE keyed by a business key</b>, so re-applying a batch updates the same rows instead of duplicating them; (2) Delta's <b>idempotent writes</b> via <code>txnAppId</code> + <code>txnVersion</code> — Spark records the last committed version per writer app and silently skips a replay of an already-committed batch (also how Structured Streaming's <code>foreachBatch</code> achieves exactly-once with a batch_id).",
      "<b>CDC (Change Data Capture)</b> ingests a stream of row-level changes (insert/update/delete, from Debezium, database logs, or vendor feeds) rather than full snapshots. You apply it with an incremental <b>MERGE</b>: match on the primary key, <code>whenMatchedUpdate</code> for updates, <code>whenMatchedDelete</code> for deletes, <code>whenNotMatchedInsert</code> for new rows — dedup to the <i>latest</i> change per key first (by sequence/commit timestamp) so out-of-order events don't clobber newer state.",
      "When history matters, <b>SCD Type 2</b> keeps every version of a row: instead of overwriting, you close the current row (set <code>end_ts</code>/<code>is_current=false</code>) and insert a new current row on each change, so gold can answer \"what did this customer look like on date X.\" MERGE implements it with an insert for the new version and an update that closes the prior one.",
      "<b>Data quality</b> is enforced, not hoped for: Delta <b>CHECK constraints</b> and <b>NOT NULL</b> reject bad rows at write time (the transaction fails rather than committing garbage); <b>schema enforcement</b> blocks unexpected columns (opt into change with <code>mergeSchema</code>); and expectation frameworks (Delta Live Tables expectations, or explicit assertion queries / quarantine tables) let you drop, quarantine, or fail on rows that violate rules — with the metrics logged so you can alert on quality regressions."
    ],

    showMe: {
      code:
        "from delta.tables import DeltaTable\n" +
        "from pyspark.sql import functions as F, Window\n" +
        "\n" +
        "# --- CDC upsert into silver, idempotent, latest-change-wins ---\n" +
        "# cdc: pk, ...fields..., op in ('I','U','D'), seq (commit order)\n" +
        "latest = (cdc.withColumn('rn', F.row_number().over(\n" +
        "                Window.partitionBy('pk').orderBy(F.col('seq').desc())))\n" +
        "             .filter('rn = 1').drop('rn'))          # dedup to newest per key\n" +
        "\n" +
        "(DeltaTable.forName(spark, 'silver.customers').alias('t')\n" +
        "    .merge(latest.alias('s'), 't.pk = s.pk')\n" +
        "    .whenMatchedDelete(condition=\"s.op = 'D'\")\n" +
        "    .whenMatchedUpdateAll(condition=\"s.op = 'U'\")\n" +
        "    .whenNotMatchedInsertAll(condition=\"s.op != 'D'\")\n" +
        "    .execute())\n" +
        "\n" +
        "# --- Idempotent write for a re-runnable batch job (txn markers) ---\n" +
        "(batch_df.write.format('delta').mode('append')\n" +
        "         .option('txnAppId', 'daily_orders_load')\n" +
        "         .option('txnVersion', batch_id)     # replay of same id is skipped\n" +
        "         .save('/lake/bronze/orders'))\n" +
        "\n" +
        "# --- Data-quality constraints: reject bad rows at write time ---\n" +
        "spark.sql(\"ALTER TABLE silver.customers ADD CONSTRAINT valid_email \"\n" +
        "          \"CHECK (email RLIKE '@')\")\n" +
        "spark.sql(\"ALTER TABLE silver.customers ALTER COLUMN pk SET NOT NULL\")\n" +
        "\n" +
        "# --- Quarantine pattern: split good vs bad instead of failing the batch ---\n" +
        "checked = incoming.withColumn('_valid', F.col('amount') >= 0)\n" +
        "checked.filter('_valid').write.format('delta').mode('append').saveAsTable('silver.orders')\n" +
        "checked.filter('not _valid').write.format('delta').mode('append').saveAsTable('quarantine.orders')",
      caption:
        "Dedup CDC to the latest change per key then MERGE (update/delete/insert) idempotently; txnAppId+txnVersion make a re-run a no-op; CHECK/NOT NULL constraints reject bad rows at write time, or split good/bad into a quarantine table."
    },

    whyMatters:
      "<p>Interviewers probe production patterns because they separate someone who can write a transformation from someone who can operate a pipeline. The recurring question is always <b>\"what happens on a re-run?\"</b> — and the acceptable answer is \"nothing changes,\" which only idempotency delivers.</p>" +
      "<ul>" +
      "<li><b>Idempotency</b> (MERGE by business key, or <code>txnAppId</code>/<code>txnVersion</code>) makes retries, backfills, and reprocessing safe — no duplicates, no double-counting.</li>" +
      "<li><b>CDC + incremental MERGE</b> keeps silver in sync with a source using only the changes, dedup'd to latest-per-key so out-of-order events don't corrupt state.</li>" +
      "<li><b>Data quality</b> (constraints, schema enforcement, quarantine) stops bad data at the boundary instead of letting it silently poison gold and every dashboard downstream.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">re-run WITHOUT idempotency:  append batch #7 again -> rows duplicated, sums doubled\nre-run WITH MERGE by key:    upsert batch #7 again -> same keys, identical result\nre-run WITH txnVersion=7:     Delta sees v7 already committed -> write skipped</pre>",

    recognize: [
      { q: "\"Our nightly job sometimes double-counts after a retry.\"", think: "Non-idempotent append. Switch to MERGE keyed by the business key, or tag writes with txnAppId+txnVersion so a replayed batch is skipped." },
      { q: "\"We get a feed of inserts/updates/deletes from the source DB.\"", think: "CDC. Dedup to the latest change per primary key by commit sequence, then MERGE with whenMatchedUpdate/Delete and whenNotMatchedInsert into silver." },
      { q: "\"Out-of-order CDC events overwrite newer data with older values.\"", think: "You're applying changes without ordering. Rank by sequence/commit_ts per key and keep only the latest before the MERGE (or add a condition that only updates when s.seq > t.seq)." },
      { q: "\"Business needs point-in-time history of dimension changes.\"", think: "SCD Type 2: don't overwrite — close the current row (end_ts/is_current=false) and insert a new current version on each change, implemented via MERGE." },
      { q: "\"Bad rows (negative amounts, null keys) reached our gold tables.\"", think: "No enforced quality at the boundary. Add Delta CHECK/NOT NULL constraints (fail the write) or a quarantine split, and log expectation metrics to alert on regressions." },
      { q: "\"How do you reprocess a month of data safely?\"", think: "Reprocess forward from bronze with idempotent MERGE/txn writes so replays don't duplicate; medallion layering means you never re-hit the source, and time travel lets you validate against a prior state." }
    ],

    matchTags: ["cdc", "change data capture", "idempotency", "exactly once", "merge",
                "scd type 2", "data quality", "constraints", "medallion", "bronze silver gold", "txnversion", "quarantine"],

    traps: [
      {
        bad: "cdc.write.format('delta').mode('append').save(path)   # append raw CDC",
        good: "# dedup to latest per key, then MERGE update/delete/insert\ntbl.merge(latest, 't.pk=s.pk').whenMatchedUpdateAll()...execute()",
        why: "Appending a CDC feed accumulates every historical change as new rows — updates and deletes never take effect and the table balloons with stale versions. Dedup to the latest change per key and MERGE so the target reflects current state (or SCD2 if you want history)."
      },
      {
        bad: "def batch_fn(df, bid):\n    df.write.format('delta').mode('append').save(path)  # replay duplicates",
        good: "def batch_fn(df, bid):\n    df.write.format('delta').mode('append') \\\n      .option('txnAppId','job').option('txnVersion',bid).save(path)",
        why: "foreachBatch (and any scheduler) can re-run a batch after failure; a blind append double-writes. txnAppId+txnVersion make Delta record and skip an already-committed batch id, giving exactly-once without custom bookkeeping."
      },
      {
        bad: "# validate in a notebook, trust the data afterward\nspark.sql('SELECT count(*) FROM t WHERE amount < 0').show()",
        good: "spark.sql(\"ALTER TABLE t ADD CONSTRAINT nonneg CHECK (amount >= 0)\")",
        why: "A one-off validation query doesn't stop the next bad write. Delta CHECK/NOT NULL constraints are enforced on every commit — a violating write fails the transaction — so quality is guaranteed structurally instead of by manual vigilance."
      }
    ],

    complexity: [
      { op: "CDC MERGE upsert", big_o: "full file rewrite (touched)", note: "Copy-on-write rewrites every file containing a matched key; cost scales with files touched, so good layout / partition pruning on the merge predicate keeps it bounded." },
      { op: "dedup latest-per-key", big_o: "O(n) + shuffle", note: "A window row_number or groupBy-max over the change key shuffles the batch once to keep only the newest change, preventing out-of-order clobbering before the MERGE." },
      { op: "idempotent txn write", big_o: "O(1) skip on replay", note: "Delta checks the recorded (txnAppId, txnVersion); if that version already committed the write is a no-op, so retries cost nothing and never duplicate." },
      { op: "SCD Type 2 apply", big_o: "rewrite touched + insert", note: "Each changed key closes one current row (update) and inserts a new version, so history grows monotonically — more write cost than Type 1 in exchange for point-in-time queries." },
      { op: "constraint / quality check", big_o: "O(n) per write", note: "CHECK/NOT NULL are evaluated over the incoming rows at commit; a violation aborts the transaction, adding a scan-time cost that buys guaranteed correctness downstream." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Idempotent Delta writes work because the transaction log stores, per writer, the highest committed <code>txnVersion</code> for a given <code>txnAppId</code> as a <code>SetTransaction</code> action. Before committing, Spark checks whether this app has already committed this version; if so it skips the write entirely. That's exactly how Structured Streaming's <code>foreachBatch</code> gets exactly-once — the monotonic <code>batch_id</code> is the version — and it's why a replayed backfill produces no duplicates.</p>" +
      "<p><b>MERGE</b> is the workhorse of CDC and it's <b>copy-on-write</b>: Delta finds every data file containing a matched key, rewrites those files with the inserts/updates/deletes applied, and commits the add/remove file set atomically. Because whole files are rewritten, MERGE cost is driven by <i>files touched</i>, not rows changed — so partitioning or Z-ordering on the merge key, and pre-filtering the source to the relevant partitions, are what keep MERGE fast at scale. Deletion vectors (newer Delta) soften this by marking rows deleted without immediately rewriting.</p>" +
      "<p><b>Data-quality</b> enforcement is part of the commit protocol: schema enforcement compares the write's schema to the table metadata and aborts on mismatch (unless <code>mergeSchema</code> opts in); <code>CHECK</code> and <code>NOT NULL</code> constraints are stored in table metadata and evaluated against every incoming batch, failing the transaction on any violation. Because these run <i>before</i> the commit is visible, readers never see a partial or invalid state — the same ACID guarantee that makes the lakehouse trustworthy is what makes quality enforcement reliable.</p>",

    challenge: {
      prompt:
        "You own the bronze->silver step for a 'customers' table fed by a Debezium CDC topic (op = c/u/d, ts_ms ordering). Requirements: exactly-once even when the batch job is retried, correct handling of out-of-order and deleted rows, a hard guarantee that customer_id is never null and email contains '@', and the ability to reprocess a bad day. Write the pipeline and justify each safeguard.",
      starter:
        "# cdc_batch: customer_id, email, ...fields..., op in ('c','u','d'), ts_ms\n" +
        "# make it: idempotent on retry, latest-wins, delete-aware, quality-enforced\n" +
        "silver = DeltaTable.forName(spark, 'silver.customers')\n" +
        "# fill in dedup + MERGE + constraints + reprocessing note",
      solution:
        "from pyspark.sql import functions as F, Window\n" +
        "from delta.tables import DeltaTable\n" +
        "\n" +
        "# 0) Enforce quality structurally (once): violations fail the commit.\n" +
        "spark.sql(\"ALTER TABLE silver.customers ALTER COLUMN customer_id SET NOT NULL\")\n" +
        "spark.sql(\"ALTER TABLE silver.customers ADD CONSTRAINT email_at CHECK (email RLIKE '@')\")\n" +
        "\n" +
        "# 1) Dedup CDC to the LATEST change per key (out-of-order safe):\n" +
        "latest = (cdc_batch.withColumn('rn', F.row_number().over(\n" +
        "               Window.partitionBy('customer_id').orderBy(F.col('ts_ms').desc())))\n" +
        "          .filter('rn = 1').drop('rn'))\n" +
        "\n" +
        "# 2) MERGE: update on 'u', delete on 'd', insert new, keyed by business key.\n" +
        "(DeltaTable.forName(spark, 'silver.customers').alias('t')\n" +
        "    .merge(latest.alias('s'), 't.customer_id = s.customer_id')\n" +
        "    .whenMatchedDelete(condition=\"s.op = 'd'\")\n" +
        "    .whenMatchedUpdateAll(condition=\"s.op = 'u'\")\n" +
        "    .whenNotMatchedInsertAll(condition=\"s.op <> 'd'\")\n" +
        "    .execute())\n" +
        "\n" +
        "# If driven by Structured Streaming foreachBatch(df, batch_id), the MERGE\n" +
        "# keyed by customer_id is already idempotent; for a plain append staging\n" +
        "# step use .option('txnAppId','cust_cdc').option('txnVersion', batch_id).\n" +
        "#\n" +
        "# Why each safeguard:\n" +
        "#  - dedup-by-ts_ms: newer change wins, so replayed/out-of-order events\n" +
        "#    never overwrite current state with stale values.\n" +
        "#  - MERGE by customer_id: re-running the same batch upserts the same keys\n" +
        "#    -> idempotent, no duplicates or double counts.\n" +
        "#  - whenMatchedDelete: tombstones actually remove rows (append never would).\n" +
        "#  - NOT NULL + CHECK: bad rows abort the transaction, never reaching gold.\n" +
        "#  - Reprocess a bad day: replay bronze through this same MERGE (idempotent),\n" +
        "#    and use Delta time travel to validate silver against the prior version."
    }
  }
]);
