/* ============================================================
   Delta Lake — Interview Mode
   Senior-level Delta Lake interview questions with reveal-on-click
   answers, difficulty filter, and ShopKart production context.
   Registers into the delta bucket and exposes TV.DeltaInterview so
   the Study Deck can aggregate the same Q&A.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('dint-styles')) return;
    const s = document.createElement('style');
    s.id = 'dint-styles';
    s.textContent = `
.dint-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.dint-header {
  padding:16px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
}
.dint-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.dint-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.dint-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.dint-progress-text { font-size:12px; color:var(--text-muted); }
.dint-btn {
  padding:6px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:12px;
  cursor:pointer; transition:background .12s, color .12s;
}
.dint-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.dint-btn.active { background:var(--brand-glow); border-color:var(--brand); color:var(--brand); }
.dint-body { flex:1; overflow-y:auto; padding:20px 24px; }
.dint-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.dint-card {
  border:1px solid var(--border-default); border-radius:var(--radius);
  background:var(--bg-2); overflow:hidden; transition:border-color .15s;
}
.dint-card:hover { border-color:var(--brand); }
.dint-q-row { display:flex; align-items:flex-start; gap:12px; padding:14px 18px; cursor:pointer; user-select:none; }
.dint-q-num {
  width:26px; height:26px; border-radius:50%; background:var(--bg-3);
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:var(--text-muted); flex-shrink:0; margin-top:1px;
}
.dint-card.revealed .dint-q-num { background:var(--green-subtle); border-color:var(--green); color:var(--green); }
.dint-q-main { flex:1; }
.dint-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.dint-tags { display:flex; gap:6px; flex-wrap:wrap; }
.dint-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.dint-tag.basic        { background:var(--green-subtle);  color:var(--green); }
.dint-tag.intermediate { background:var(--yellow-subtle); color:var(--yellow); }
.dint-tag.advanced     { background:var(--red-subtle);    color:var(--red); }
.dint-tag.senior       { background:var(--purple-subtle); color:var(--purple); }
.dint-q-chevron { color:var(--text-muted); flex-shrink:0; transition:transform .2s; display:flex; align-items:center; padding-top:2px; }
.dint-card.revealed .dint-q-chevron { transform:rotate(180deg); }
.dint-answer { display:none; border-top:1px solid var(--border-subtle); padding:16px 18px; background:var(--bg-1); }
.dint-card.revealed .dint-answer { display:block; }
.dint-answer-text { font-size:13px; color:var(--text-secondary); line-height:1.65; margin-bottom:12px; display:flex; flex-direction:column; gap:10px; }
.dint-a-p { margin:0; }
.dint-a-ol, .dint-a-ul { margin:0; padding-left:22px; }
.dint-a-ol li, .dint-a-ul li { line-height:1.6; margin:4px 0; }
.dint-a-ol li::marker { color:var(--brand); font-weight:700; }
.dint-a-head { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); margin:4px 0 0; }
.dint-a-def { display:flex; flex-direction:column; gap:2px; padding:2px 0 2px 12px; border-left:2px solid var(--brand); }
.dint-a-term { font-size:13px; font-weight:700; color:var(--text-primary); }
.dint-a-desc { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.dint-answer-text code { font-family:var(--font-mono); font-size:.88em; color:var(--text-primary); background:var(--code-bg); border:1px solid var(--border-subtle); border-radius:4px; padding:1px 5px; }
.dint-answer-code {
  font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary);
  background:var(--code-bg); border:1px solid var(--border-subtle);
  border-radius:var(--radius-sm); padding:12px 14px; line-height:1.7;
  white-space:pre; overflow-x:auto; margin-bottom:10px;
}
.dint-answer-code .k { color:var(--brand); font-weight:600; } .dint-answer-code .s { color:var(--orange); } .dint-answer-code .c { color:var(--text-muted); font-style:italic; }
.dint-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; }
.dint-note strong { color:var(--brand); }
.dint-empty { text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px; }
`;
    document.head.appendChild(s);
  }

  const QA = [
    {
      level: 'basic',
      q: 'What is Delta Lake, and what does it add over a plain directory of Parquet files?',
      a: `Delta Lake is an open table format that layers a transaction log over Parquet data files. A bare Parquet directory gives you columnar storage and predicate pushdown, but no consistency across a set of files.

Delta adds, via the _delta_log:
• ACID transactions — a set of file changes commits atomically
• Snapshot isolation — readers see a consistent version, never a half-written table
• Time travel — query any past version by number or timestamp
• Schema enforcement & evolution — the log holds the authoritative schema
• Data skipping — per-file min/max stats prune files before reads`,
      note: '<strong>ShopKart:</strong> the orders table (38.4 TB, ~24K files) moved from raw Parquet to Delta so Spark ingest and Trino/Databricks reads share one consistent, versioned table.',
    },
    {
      level: 'basic',
      q: 'Describe the physical layout of a Delta table on storage.',
      a: `Two parts under the table root:

1. Immutable Parquet data files (often in partition subdirectories).
2. A _delta_log/ directory containing:
   • NNN...NNN.json — one ordered JSON commit per version
   • NNN...NNN.checkpoint.parquet — a cumulative snapshot every N commits (default 10)
   • _last_checkpoint — a small pointer to the most recent checkpoint

The log, not the file listing, defines which files belong to the table at each version.`,
      code: `<span class="c">orders/</span>
  part-0000-....snappy.parquet
  country=BR/part-....parquet
  <span class="k">_delta_log/</span>
    00000000000000000000.json   <span class="c">-- v0 CREATE</span>
    00000000000000000001.json   <span class="c">-- v1 INSERT</span>
    ...
    00000000000000000010.checkpoint.parquet
    _last_checkpoint`,
    },
    {
      level: 'intermediate',
      q: 'What action types appear inside a Delta commit, and what does each do?',
      a: `Each JSON commit is a list of actions:

• protocol — minimum reader/writer versions and required table features
• metaData — schema, partition columns, table properties
• add (AddFile) — a data file joining the table, with size, partitionValues, and per-column stats
• remove (RemoveFile) — tombstones a file (logical delete)
• commitInfo — audit record: operation, parameters, metrics, user, timestamp
• cdc — change-data rows when Change Data Feed is enabled

Reconstructing table state = replaying add/remove across commits (from the last checkpoint).`,
      note: '<strong>ShopKart:</strong> an OPTIMIZE commit is a wall of remove (small files) + add (compacted files), all atomic, with a commitInfo recording the numFilesRemoved/Added metrics.',
    },
    {
      level: 'intermediate',
      q: 'How does Delta achieve ACID commits on object storage that lacks multi-file transactions?',
      a: `Delta reduces a commit to a single atomic action: creating the next numbered log file.

1. The writer reads the current version N and stages new data files.
2. It attempts an atomic put-if-absent of (N+1).json.
3. If it succeeds, that instant is the commit — all its add/remove actions become visible together.
4. If (N+1).json already exists, another writer won the race; this writer re-reads and retries.

So even on S3, the "transaction" is one atomic object creation, which storage can guarantee (directly, or via a commit-coordination service / catalog like Unity or DynamoDB for S3 multi-writer).`,
      note: '<strong>ShopKart:</strong> Unity Catalog coordinates commits, so dozens of concurrent Spark writers to orders never clobber a version.',
    },
    {
      level: 'intermediate',
      q: 'Walk through the Delta read path for a large table.',
      a: `1. Read _last_checkpoint to find the newest checkpoint.
2. Load that checkpoint Parquet — cumulative add set as of that version (bounded work).
3. Replay only the JSON commits after the checkpoint, applying add/remove.
4. Apply partition pruning, then data skipping using per-file min/max stats.
5. Read only the surviving data files.

The checkpoint is what keeps step 3 small: without it a reader would replay every commit from version 0.`,
      code: `<span class="c">-- effect of a checkpoint every 10 commits at v1,050</span>
without checkpoint: replay 1,050 JSON commits
with    checkpoint: load 1 parquet + replay ~0-9 commits`,
    },
    {
      level: 'intermediate',
      q: 'Compare copy-on-write and merge-on-read (deletion vectors) for DELETE/UPDATE.',
      a: `Copy-on-write (CoW): a matched file is rewritten without the affected rows — remove old, add new — in one commit. Writes are expensive (full-file rewrite); reads are clean (no merge).

Merge-on-read (MoR) via deletion vectors: instead of rewriting, Delta records a bitmap of deleted row positions for the file. Writes are cheap; reads skip flagged rows (a small merge). OPTIMIZE later materializes the deletes by rewriting.

Choose CoW for read-heavy, low-churn tables; deletion vectors for frequent point deletes/updates, then compact.`,
      note: '<strong>ShopKart:</strong> GDPR erasure by customer_id uses deletion vectors for fast commits; a nightly OPTIMIZE rewrites the affected files to reclaim the space.',
    },
    {
      level: 'intermediate',
      q: 'How does time travel work, and what limits how far back you can go?',
      a: `Every commit is an immutable version. VERSION AS OF n or TIMESTAMP AS OF t makes Delta replay the log to that version and resolve the file set current then — the historical Parquet files still exist because remove is only a tombstone.

The limit is VACUUM retention: once VACUUM physically deletes tombstoned files older than the retention window (default 7 days), any version that referenced them can no longer be read. Time travel depth = retention window.`,
      code: `<span class="k">SELECT</span> * <span class="k">FROM</span> orders <span class="k">VERSION AS OF</span> <span class="s">842</span>;
<span class="k">SELECT</span> * <span class="k">FROM</span> orders <span class="k">TIMESTAMP AS OF</span> <span class="s">'2026-08-01 00:00:00'</span>;
<span class="k">RESTORE TABLE</span> orders <span class="k">TO VERSION AS OF</span> <span class="s">842</span>;  <span class="c">-- roll back</span>`,
    },
    {
      level: 'advanced',
      q: 'Explain Delta’s optimistic concurrency control and how conflicts are resolved.',
      a: `Writers don’t lock. Each reads a base version, does its work, and attempts to commit the next version number.

• If the next number is free, the commit wins.
• If another writer already took it, this writer re-reads the newly committed actions and runs conflict detection: did the other commit touch files or rows this write depends on?
   – Disjoint changes (e.g. two blind appends): re-commit at the next version.
   – Genuine conflict (both modified the same files, or a concurrent delete removed files this write updated): throw a concurrency exception.

Isolation levels (WriteSerializable default, Serializable stricter) govern which concurrent combinations are allowed.`,
      note: '<strong>ShopKart:</strong> streaming appends and the hourly MERGE run together; appends retry silently, while a MERGE conflicting with a concurrent OPTIMIZE surfaces a retriable exception in the job.',
    },
    {
      level: 'advanced',
      q: 'What are deletion vectors, and why did they change Delta’s delete/update performance?',
      a: `A deletion vector is a compact bitmap (roaring bitmap) stored beside a data file marking which row positions are deleted. Reads apply it to skip those rows; the file itself is not rewritten.

Before deletion vectors, a single-row DELETE could force rewriting a multi-hundred-MB file (copy-on-write). With deletion vectors the delete is a tiny write, so point deletes and MERGE updates become cheap. The deferred cost is a read-time merge, which OPTIMIZE later removes by physically rewriting the flagged files.

Deletion vectors are a protocol table feature — engines must support the reader feature to read such a table.`,
    },
    {
      level: 'advanced',
      q: 'How do checkpoints work, and why are they essential at scale?',
      a: `A checkpoint is a Parquet file summarizing the cumulative set of actions (mostly the live add set plus protocol/metaData) up to a version. By default one is written every 10 commits; _last_checkpoint points at the newest.

Essential because read cost is proportional to how many commits must be replayed. On a table with thousands of versions, replaying from version 0 every query would be O(n) and slow. A checkpoint bounds replay to the handful of commits since it — effectively O(1). It is the single biggest reason Delta reads stay fast as history grows.`,
      code: `<span class="c">_delta_log/</span>
  ...0838.json
  ...0839.json
  ...0840.checkpoint.parquet   <span class="c">← reader starts here</span>
  ...0841.json ...0842.json    <span class="c">← replays only these</span>`,
    },
    {
      level: 'advanced',
      q: 'When would you choose liquid clustering over partitioning, and what does it fix?',
      a: `Fixed (Hive-style) partitioning creates one directory per partition value. High-cardinality or skewed keys produce many tiny files and uneven partitions, and you cannot change the partition columns without rewriting the table.

Liquid clustering instead clusters data by chosen keys and re-clusters incrementally as data lands (and during OPTIMIZE). Benefits:
• No small-file/skew explosion from bad partition choices
• Clustering keys can evolve without a full rewrite
• Good data skipping across the clustering columns

Use it for tables where you’d otherwise agonize over partition columns, or where access patterns change over time.`,
      note: '<strong>ShopKart:</strong> orders is clustered by (customer_id, order_date) instead of partitioned by date — even file sizes and strong skipping on both dimensions.',
    },
    {
      level: 'advanced',
      q: 'How does MERGE INTO execute, and how do you keep it performant for CDC?',
      a: `MERGE runs in two passes:
1. Inner-join the source to the target on the match condition to find which target files contain matching rows.
2. Rewrite just those files, applying WHEN MATCHED (update/delete) and WHEN NOT MATCHED (insert), and commit atomically.

Performance levers:
• Make the ON condition selective and, ideally, partition/cluster-aligned so pass 1 touches few files.
• Enable deletion vectors so matched files aren’t fully rewritten.
• Pre-filter the source and prune target partitions in the condition.
• Compact regularly so pass 1 doesn’t scan thousands of small files.`,
      code: `<span class="k">MERGE INTO</span> orders t <span class="k">USING</span> cdc s
  <span class="k">ON</span> t.order_id = s.order_id <span class="k">AND</span> t.order_date = s.order_date
<span class="k">WHEN MATCHED AND</span> s.op=<span class="s">'D'</span> <span class="k">THEN DELETE</span>
<span class="k">WHEN MATCHED</span> <span class="k">THEN UPDATE SET</span> *
<span class="k">WHEN NOT MATCHED</span> <span class="k">THEN INSERT</span> *;`,
    },
    {
      level: 'senior',
      q: 'A Delta read plan has slowed from seconds to minutes. Diagnose and fix.',
      a: `Almost always small-file / commit explosion from frequent streaming micro-batches:

Diagnose:
• DESCRIBE HISTORY — how often are commits happening?
• Check file counts/sizes (many KB-sized files = trouble) and whether checkpoints are being written.
• Look for missing/rare checkpoints forcing long log replay.

Fix:
• OPTIMIZE (bin-pack, optionally ZORDER) to compact small files.
• Increase the streaming trigger interval so each commit adds fewer, larger files.
• Ensure checkpointing cadence is healthy; VACUUM to clear tombstone buildup.
• Consider liquid clustering for ongoing layout maintenance.`,
      note: '<strong>ShopKart:</strong> a 10-second micro-batch created millions of tiny files; raising the trigger to 2 minutes plus nightly OPTIMIZE cut planning from minutes back to seconds.',
    },
    {
      level: 'senior',
      q: 'What is the protocol action, and how do table features affect engine compatibility?',
      a: `The protocol action declares the minimum reader and writer versions — and, in the newer model, the explicit set of table features a table uses (e.g. deletionVectors, columnMapping, changeDataFeed, timestampNtz).

An engine may read a table only if it supports every required reader feature, and write only if it supports every required writer feature. This is how Delta evolves safely: enabling deletion vectors bumps the protocol so an engine that can’t interpret them won’t silently return wrong results — it refuses to read.

Practical takeaway: before pointing a new engine (Trino, DuckDB, delta-rs) at a table, check its protocol/features against what that engine supports.`,
    },
    {
      level: 'senior',
      q: 'Compare Delta Lake, Apache Iceberg, and Apache Hudi at a high level.',
      a: `All three are open table formats adding ACID + time travel over columnar files; they differ in metadata design and heritage.

• Delta Lake — a transaction log (_delta_log) of JSON actions replayed from Parquet checkpoints. Deep Spark/Databricks integration; broadening to many engines via the open protocol, delta-kernel, delta-rs, and UniForm.
• Iceberg — an immutable snapshot tree with a manifest-list → manifest → data-file hierarchy. Strongly engine-neutral, powerful hidden partitioning and partition/schema evolution, REST catalog spec.
• Hudi — record-key centric with primary keys and first-class upserts/indexing; strong for streaming record-level upserts, with CoW and MoR table types.

Rule of thumb: Delta for Databricks-centric lakehouses, Iceberg for multi-engine neutrality at huge scale, Hudi for heavy streaming upserts.`,
      note: '<strong>ShopKart:</strong> chose Delta because the platform is Databricks + Unity Catalog centric, while still being readable from Trino and delta-rs jobs via the open protocol.',
    },

    /* ---- Maintenance, schema & storage mechanics ---- */
    {
      level: 'intermediate',
      q: 'What does VACUUM do, why is the default retention 7 days, and what breaks if you lower it?',
      a: `VACUUM physically deletes data files that are no longer referenced by the current table version AND are older than the retention window. A remove action only tombstones a file in the log; the Parquet bytes stay on storage until VACUUM removes them.

Why 7 days by default:
• Time travel and RESTORE depend on those tombstoned files still existing — retention is literally how far back you can query.
• In-flight readers and long-running jobs may still be reading a file that a newer commit tombstoned; the window protects them from having it deleted mid-scan.

Lowering it (e.g. to 0 hours) is dangerous:
• It can delete files a concurrent reader or an uncommitted writer still needs, corrupting that job.
• It destroys time-travel depth immediately.

Delta guards this with spark.databricks.delta.retentionDurationCheck.enabled — you must explicitly disable the check to vacuum below the configured window.`,
      code: `<span class="k">VACUUM</span> orders;                     <span class="c">-- default 7-day retention</span>
<span class="k">VACUUM</span> orders <span class="k">RETAIN</span> <span class="s">168</span> <span class="k">HOURS</span>;     <span class="c">-- explicit 7 days</span>
<span class="k">VACUUM</span> orders <span class="k">DRY RUN</span>;             <span class="c">-- list what WOULD be deleted</span>`,
      note: '<strong>ShopKart:</strong> VACUUM runs weekly with the default window; the time-travel SLA promised to auditors is "7 days", which is deliberately the same number as the retention.',
    },
    {
      level: 'intermediate',
      q: 'Explain schema enforcement versus schema evolution. When is a write rejected, and what does mergeSchema change?',
      a: `Schema enforcement (the default): the _delta_log holds the authoritative schema, and every write is validated against it. A write is rejected when it has columns the table does not know, a type that cannot be safely cast, or a case/nullability mismatch. This stops a malformed upstream batch from silently corrupting the table.

Schema evolution: an opt-in that lets a write ALTER the schema as part of the commit instead of failing.
• mergeSchema=true on an append/overwrite adds new columns (and widens some types) automatically.
• spark.databricks.delta.schema.autoMerge.enabled lets new source columns flow through a MERGE.
• ALTER TABLE ... ADD/CHANGE COLUMN does it explicitly via a metaData action.

What enforcement still rejects even with evolution on: narrowing a type (long to int), incompatible type changes, or dropping a column (that needs column mapping).`,
      code: `df.write.format(<span class="s">"delta"</span>)
  .option(<span class="s">"mergeSchema"</span>, <span class="s">"true"</span>)
  .mode(<span class="s">"append"</span>).saveAsTable(<span class="s">"orders"</span>)`,
      note: '<strong>ShopKart:</strong> the orders stream uses mergeSchema so a new optional column from the checkout service lands without a manual migration — but a type change still fails loudly and pages the on-call.',
    },
    {
      level: 'advanced',
      q: 'What is column mapping, and which operations require it?',
      a: `Column mapping decouples the logical column name you query from the physical name stored inside the Parquet files, by giving each column a stable ID (and a physical name). Two modes are set via delta.columnMapping.mode: name and id.

Why it exists — Parquet files are immutable, so without an indirection layer you cannot rename or drop a column without rewriting every file. Column mapping turns those into metadata-only operations.

Operations that require it:
• RENAME COLUMN — just updates the logical-name-to-ID mapping.
• DROP COLUMN — marks the column dropped in metadata; files are untouched.
• Columns with spaces or special characters that raw Parquet names disallow.

Cost: it is a protocol upgrade (reader + writer feature), so older engines that do not understand column mapping can no longer read the table — enabling it is effectively one-way.`,
      note: '<strong>ShopKart:</strong> renaming cust_id to customer_id across the 38 TB table was a sub-second metadata commit thanks to column mapping — no file rewrite.',
    },
    {
      level: 'advanced',
      q: 'How does data skipping work, and why are stats kept on only the first 32 columns by default?',
      a: `For every data file Delta stores per-column statistics (min, max, null count, row count) in the add action. At query time the planner compares a filter predicate against these stats and skips any file whose range cannot match — before reading a single byte.

The 32-column limit: computing and storing stats for every column is not free, and the stats live in the log and checkpoints, so they bloat metadata. By default Delta indexes only the first 32 columns of the schema (delta.dataSkippingNumIndexedCols). Columns past that get no stats and cannot be skipped on.

Tuning levers:
• Reorder columns (or raise delta.dataSkippingNumIndexedCols) so your real filter columns fall inside the indexed set.
• Long string / blob columns make stats huge and skipping weak — push them past the indexed range.
• Pair skipping with ZORDER or liquid clustering so each file's min/max range is tight enough to actually prune.`,
      note: '<strong>ShopKart:</strong> a rarely-filtered 4 KB JSON blob column was moved to the end of the schema so it stopped consuming one of the 32 stat slots that order_date and customer_id needed.',
    },

    /* ---- Streaming, change data & file layout ---- */
    {
      level: 'advanced',
      q: 'How do you use Delta as a streaming source and sink, and what gives exactly-once?',
      a: `As a sink: Structured Streaming writes each micro-batch as one atomic Delta commit. Exactly-once comes from two things working together:
1. The query checkpoint (checkpointLocation) records which source offsets have been processed.
2. The writer records (txnAppId, txnVersion) in the commit, so a replayed batch whose version was already committed is skipped instead of written twice.

As a source: Delta streams out new files commit by commit. Controls:
• maxFilesPerTrigger / maxBytesPerTrigger — cap batch size so a backfill does not overwhelm the job.
• ignoreDeletes / skipChangeCommits — decide how deletes and updates in the source are handled (a pure append stream cannot represent an in-place update).
• Change Data Feed as the source when you need the actual inserts/updates/deletes, not just new files.

The checkpoint, not the table, is the unit of fault tolerance — lose it and the stream reprocesses.`,
      code: `spark.readStream.format(<span class="s">"delta"</span>).table(<span class="s">"events"</span>)
  .writeStream.format(<span class="s">"delta"</span>)
  .option(<span class="s">"checkpointLocation"</span>, <span class="s">"/chk/orders"</span>)
  .trigger(processingTime=<span class="s">"2 minutes"</span>)
  .table(<span class="s">"orders"</span>)`,
      note: '<strong>ShopKart:</strong> a job restart after a crash replays the last micro-batch; the txnVersion guard makes the re-committed batch a no-op, so no duplicate orders land.',
    },
    {
      level: 'advanced',
      q: 'What is Change Data Feed, how is it stored, and when do you read it instead of the log?',
      a: `Change Data Feed (CDF) records the row-level changes a table undergoes — not just its latest state — so downstream consumers can process inserts, updates, and deletes incrementally.

Enabled with delta.enableChangeDataFeed=true. After that, change-producing operations emit change data that you read with table_changes():
• Pure appends are derived from the add files directly, with no extra storage.
• UPDATE/DELETE/MERGE write explicit change rows into a _change_data/ directory, tagged _change_type = insert / update_preimage / update_postimage / delete, plus _commit_version and _commit_timestamp.

Read CDF (not the raw add/remove log) when you need to propagate changes — materialized views, a downstream MERGE, syncing to a warehouse — because it gives you before/after images and clean delete markers that reconstructing from add/remove cannot.`,
      code: `<span class="k">SELECT</span> * <span class="k">FROM</span> table_changes(<span class="s">'orders'</span>, <span class="s">842</span>, <span class="s">850</span>)
<span class="k">WHERE</span> _change_type <span class="k">IN</span> (<span class="s">'update_postimage'</span>, <span class="s">'delete'</span>);`,
      note: '<strong>ShopKart:</strong> the warehouse mirror stays in sync by reading orders CDF every 5 minutes and MERGE-ing only the changed rows, instead of re-scanning 38 TB.',
    },
    {
      level: 'advanced',
      q: 'OPTIMIZE, ZORDER, optimized writes, and auto-compaction — what does each do and when do you use which?',
      a: `They all fight the small-file problem, at different points in the write lifecycle.

<strong>OPTIMIZE (bin-packing):</strong> a batch job that coalesces many small files into fewer ~1 GB files, committed as remove + add. Run it on a schedule.

<strong>ZORDER BY:</strong> an option on OPTIMIZE that co-locates rows sharing similar values of the chosen columns into the same files, so min/max data skipping on those columns becomes far more effective. Best for high-cardinality filter columns; costs a full rewrite of the optimized files.

<strong>Optimized writes (optimizeWrite):</strong> adds a shuffle before the write so each commit produces fewer, larger files up front — prevention, not cure.

<strong>Auto-compaction (autoCompact):</strong> after a write, if a partition has too many small files, Delta kicks off a small compaction automatically.

Modern alternative: liquid clustering replaces ZORDER + partitioning with incremental re-clustering, so you rarely run manual ZORDER on new tables.`,
      code: `<span class="k">OPTIMIZE</span> orders <span class="k">WHERE</span> order_date >= <span class="s">'2026-11-01'</span>
  <span class="k">ZORDER BY</span> (customer_id);`,
      note: '<strong>ShopKart:</strong> optimizeWrite is on for the stream to keep file sizes sane, and a nightly OPTIMIZE handles whatever still fragments.',
    },

    /* ---- Interop, migration & multi-writer ---- */
    {
      level: 'advanced',
      q: 'How do you migrate an existing Parquet table to Delta in place, and what are the gotchas?',
      a: `CONVERT TO DELTA writes a _delta_log over an existing directory of Parquet files without rewriting the data — it inventories the current files and emits an initial commit that adds them.

Steps and gotchas:
1. For a partitioned table you must declare the partition schema, because Delta cannot infer Hive-style partition columns from the path alone.
2. Stats collection — by default it collects file stats so data skipping works; NO STATISTICS skips that for a faster convert on huge tables (you lose skipping until a later OPTIMIZE).
3. Files added out-of-band afterwards are invisible until you CONVERT again — once converted, always write through Delta, never drop raw Parquet into the directory.
4. It is metadata-only, so it is fast and cheap, but any pre-existing small-file or schema mess is inherited — plan an OPTIMIZE afterwards.`,
      code: `<span class="k">CONVERT TO DELTA</span> parquet.<span class="s">\`s3://lake/orders\`</span>
  <span class="k">PARTITIONED BY</span> (country <span class="k">STRING</span>, order_date <span class="k">DATE</span>);`,
      note: '<strong>ShopKart:</strong> the original 38 TB Parquet orders dump was converted in minutes (metadata only), then OPTIMIZE + ZORDER brought reads up to the new standard.',
    },
    {
      level: 'advanced',
      q: 'What is UniForm, and how does it let Iceberg or Hudi readers see a Delta table?',
      a: `UniForm (Universal Format) makes a single Delta table readable by Iceberg and Hudi clients without copying the data. The Parquet files stay as the one physical copy; UniForm asynchronously generates the extra metadata those formats expect (Iceberg manifests and snapshot tree, Hudi metadata) alongside the _delta_log.

How it works:
• Enabled with delta.universalFormat.enabledFormats = iceberg (and/or hudi).
• After each Delta commit a background process writes the corresponding Iceberg/Hudi metadata, so an Iceberg-only engine (a Snowflake or Trino Iceberg reader, say) can query the same table.
• It is read interop — writers still write Delta, and the generated metadata trails the Delta commit slightly.

Why it matters: it defuses the "which format do we standardize on" argument — you can stay Delta-native and still serve Iceberg consumers.`,
      note: '<strong>ShopKart:</strong> a partner team standardized on Iceberg; UniForm lets them query orders through their Iceberg catalog while ShopKart keeps writing Delta.',
    },
    {
      level: 'intermediate',
      q: 'Explain shallow versus deep CLONE and when you would use each.',
      a: `CLONE creates a new table from an existing one by copying the Delta metadata.

<strong>Shallow clone</strong> copies only the transaction log / file references, not the data files. It is near-instant and cheap, and the clone points at the source's existing Parquet files — ideal for short-lived dev/test tables, isolated what-if OPTIMIZE or schema changes, and staging a risky change. Caveat: if the source is VACUUMed, files the shallow clone still references can disappear, so shallow clones are not durable backups.

<strong>Deep clone</strong> copies the data files as well as the metadata, producing a fully independent table. Use it for real backups, migrating a table to another location or region, or forking a table you will keep long-term. Slower and more expensive, but self-contained.

Both are incremental on re-clone — a repeat clone copies only what changed.`,
      code: `<span class="k">CREATE TABLE</span> orders_dev <span class="k">SHALLOW CLONE</span> orders;   <span class="c">-- instant sandbox</span>
<span class="k">CREATE TABLE</span> orders_bkp <span class="k">DEEP CLONE</span> orders;      <span class="c">-- real backup</span>`,
      note: '<strong>ShopKart:</strong> every risky migration is first tried on a shallow clone of orders; if it works, it is applied to the real table.',
    },
    {
      level: 'senior',
      q: 'How do you run Delta with multiple concurrent writers on S3 safely?',
      a: `The whole ACID story rests on an atomic put-if-absent of the next NNN.json log file. On ABFS (Azure) and GCS the filesystem provides that primitive, so multi-writer works directly. Classic S3 historically did NOT guarantee put-if-absent across clients, so two writers could both believe they created the same version.

Solutions:
• A commit coordinator that serializes log writes — the DynamoDB LogStore (S3DynamoDBLogStore) uses a DynamoDB table as the mutual-exclusion and ordering authority for log puts.
• A catalog that owns commits — Unity Catalog (or another coordinated catalog) brokers them so writers never collide.
• Single-writer discipline — route all writes through one job when coordination infrastructure is unavailable.

Note: S3 has since added conditional writes (if-none-match), which narrows the gap, but for production multi-writer the coordinated LogStore or catalog is still the standard answer.`,
      note: '<strong>ShopKart:</strong> on S3 the platform uses Unity Catalog to coordinate commits, so the streaming appends and the hourly MERGE target orders concurrently without a lost update.',
    },
    {
      level: 'senior',
      q: 'What are the main concurrency exceptions, and how do you design writes to avoid each?',
      a: `Optimistic concurrency throws a specific exception depending on what collided:

<strong>ConcurrentAppendException</strong> a concurrent transaction added files into a partition or condition your operation read. Fix: make conditions partition-specific so two writers touch disjoint partitions — e.g. include the date partition in the MERGE/DELETE predicate.

<strong>ConcurrentDeleteReadException</strong> your operation read a file that a concurrent transaction deleted (e.g. a MERGE racing an OPTIMIZE or VACUUM). Fix: schedule compaction away from heavy write windows, or let the job retry.

<strong>ConcurrentDeleteDeleteException</strong> two transactions tried to delete the same file. Fix: avoid overlapping delete/optimize jobs on the same data.

<strong>MetadataChangedException</strong> the schema or table properties changed under you. Fix: don't run schema changes concurrently with data writes.

General design: partition-align predicates, separate compaction windows, keep transactions short, and make jobs idempotent so an automatic retry is safe.`,
      note: '<strong>ShopKart:</strong> the hourly MERGE always filters on order_date, so it conflicts only with writers to the same day — appends to other days commit straight through.',
    },

    /* ---- Scenario & system design ---- */
    {
      level: 'senior',
      q: 'Design a CDC pipeline from a Postgres OLTP into Delta with a 5-minute freshness SLA. Cover layout, merge, and late/out-of-order events.',
      a: `<strong>Ingest:</strong> Debezium (or the DB's logical replication) streams row changes to Kafka. A Structured Streaming job reads Kafka with a 1-2 minute trigger, comfortably inside the 5-minute SLA.

<strong>Landing (bronze):</strong> write raw change events append-only to a bronze Delta table — an immutable, cheap, replayable audit trail.

<strong>Apply (silver):</strong> MERGE the latest change per key into the current-state table.
1. Dedupe the micro-batch to one row per primary key, keeping the row with the highest source LSN / commit timestamp — this is what handles out-of-order events.
2. MERGE on the primary key: WHEN MATCHED AND op='D' THEN DELETE, WHEN MATCHED THEN UPDATE, WHEN NOT MATCHED THEN INSERT.
3. Guard against stale updates: only apply when the incoming LSN exceeds the stored one, so a late event never overwrites a newer value.

<strong>Layout:</strong> liquid cluster (or partition) the target by the main query key; enable deletion vectors so each MERGE does not rewrite whole files; enable CDF if a gold layer consumes changes downstream.

<strong>Maintenance:</strong> optimizeWrite on the stream, nightly OPTIMIZE, scheduled VACUUM, and a checkpointed stream for exactly-once.`,
      note: '<strong>ShopKart:</strong> this is exactly the orders pipeline — Kafka to bronze append, then a 2-minute MERGE into silver keyed on order_id with an LSN high-water-mark guard.',
    },
    {
      level: 'senior',
      q: 'Implement SCD Type 2 on a dimension table in Delta. Walk through the MERGE.',
      a: `SCD Type 2 keeps full history: each change closes the old row (sets an end timestamp / is_current=false) and inserts a new current row.

The catch is that one MERGE cannot both close an old row and insert its replacement for the same key, so you stage the inserts first:
1. Build a source where each changed key appears twice — once as a "close the existing current row" instruction (matched on the business key) and once as the "new current row" to insert (with a null merge key so it never matches and always inserts).
2. MERGE on the business key AND is_current = true:
   - WHEN MATCHED AND the tracked attributes actually differ THEN UPDATE SET is_current=false, end_ts=now.
   - WHEN NOT MATCHED THEN INSERT the new current row with is_current=true, start_ts=now, end_ts=null.

What interviewers look for: only expire rows whose tracked attributes changed (hash the attributes to detect it), make it idempotent so a re-run does not create duplicate versions, and cluster/partition on the business key so the MERGE touches few files.`,
      code: `<span class="k">MERGE INTO</span> dim_customer t
<span class="k">USING</span> staged s
  <span class="k">ON</span> t.customer_id = s.mergeKey <span class="k">AND</span> t.is_current = <span class="k">true</span>
<span class="k">WHEN MATCHED AND</span> t.attr_hash <> s.attr_hash
  <span class="k">THEN UPDATE SET</span> is_current=<span class="k">false</span>, end_ts=current_timestamp()
<span class="k">WHEN NOT MATCHED</span>
  <span class="k">THEN INSERT</span> (customer_id, ..., is_current, start_ts, end_ts)
       <span class="k">VALUES</span> (s.customer_id, ..., <span class="k">true</span>, current_timestamp(), <span class="k">null</span>);`,
      note: '<strong>ShopKart:</strong> the customer dimension tracks address history as SCD2 so an order always joins to the address that was current on its order_date.',
    },
    {
      level: 'senior',
      q: 'A GDPR erasure request must remove one customer from a 40 TB table within 30 days without time travel leaking the data. Design the flow.',
      a: `The subtlety: a plain DELETE only tombstones files; the deleted rows are still physically present and readable via time travel until VACUUM removes the underlying files. Compliance requires the physical bytes to be gone.

Flow:
1. DELETE FROM orders WHERE customer_id = :id. With deletion vectors this is a fast metadata write and the rows become logically invisible immediately.
2. OPTIMIZE the affected files so the deletes are materialized — the rows are physically dropped from newly written Parquet and the old files are tombstoned.
3. VACUUM to physically delete the tombstoned old files. The retention window must have elapsed (or be deliberately shortened) so the files actually go — inside the 30-day legal deadline but respecting in-flight readers.
4. Purge every copy: CDF _change_data, the bronze/raw landing table, and any downstream mirrors must get the same deletion, or the data leaks there.

The interviewer's gotcha: time travel to a version before step 3 would still surface the customer, so retention/VACUUM must push the oldest reachable version past the deletion — document that the legal retention and Delta retention are reconciled.`,
      note: '<strong>ShopKart:</strong> erasure requests are batched weekly — DELETE (deletion vectors) to hide immediately, then OPTIMIZE + VACUUM inside the 30-day window across orders, its CDF, and the bronze landing table.',
    },
    {
      level: 'senior',
      q: 'A streaming job writes millions of files a day and Trino queries went from seconds to minutes. You are on-call — triage and fix.',
      a: `<strong>Confirm the symptom:</strong> DESCRIBE HISTORY orders to see commit frequency, and compare file count to table size — millions of tiny files against a modest dataset is the tell. DESCRIBE DETAIL gives numFiles directly.

<strong>Root cause:</strong> a too-short streaming trigger makes each micro-batch commit many KB-sized files; metadata (add entries, checkpoints) balloons and Trino spends its time in planning and listing, not scanning.

<strong>Immediate mitigation:</strong>
1. OPTIMIZE orders (bin-pack) to compact existing small files into ~1 GB files — restores read performance now.
2. Confirm checkpoints are being written (every ~10 commits); a missing _last_checkpoint forces long log replay and must be fixed.

<strong>Durable fix:</strong>
• Raise the streaming trigger interval (e.g. 10s to 2min) so each commit lands fewer, larger files.
• Turn on optimizeWrite / autoCompact so the stream self-manages file size.
• Schedule a nightly OPTIMIZE and a VACUUM to clear tombstone buildup.
• Consider liquid clustering for ongoing layout maintenance.

<strong>Verify:</strong> re-check DESCRIBE DETAIL numFiles and re-time the Trino query.`,
      note: '<strong>ShopKart:</strong> this incident actually happened — a 10-second trigger created millions of files; a 2-minute trigger plus nightly OPTIMIZE brought planning back to seconds.',
    },
    {
      level: 'senior',
      q: 'You must serve one Delta table to Databricks Spark, Trino, and a Python delta-rs job at once. What breaks, and how do protocol features, UniForm, and Delta Sharing factor in?',
      a: `The core risk is protocol/feature mismatch. Enabling a reader/writer feature on the table (deletion vectors, column mapping, v2 checkpoints, timestampNtz) bumps the protocol, and any engine that does not implement that reader feature will refuse to read — correctly, rather than returning wrong results.

What to check and do:
• Inventory each engine's supported protocol versions and features. Trino and delta-rs trail Databricks on newer features.
• If a consumer cannot support deletion vectors or column mapping, either do not enable those on this shared table, or give that consumer a different access path.
• UniForm: if a consumer speaks Iceberg more naturally, enable delta.universalFormat.enabledFormats=iceberg so it reads generated Iceberg metadata over the same files.
• Delta Sharing: for cross-org or cross-platform access without handing out storage credentials, publish the table via the Delta Sharing protocol; recipients read through the sharing server.
• Governance: a shared catalog (Unity) gives one place for permissions and commit coordination across writers.

Summary: pick the feature set to the lowest common denominator of your readers, or bridge the gap with UniForm / Delta Sharing rather than forking copies.`,
      note: '<strong>ShopKart:</strong> orders keeps deletion vectors on for Spark, exposes UniForm Iceberg for the Trino-on-Iceberg team, and shares a curated gold table externally through Delta Sharing.',
    },
    {
      level: 'senior',
      q: 'Choose between partitioning, Z-ordering, and liquid clustering for a table filtered by customer_id (point lookups) and order_date (range scans). Defend it.',
      a: `<strong>Partition by order_date:</strong> great for the date range scans (whole partitions pruned) but customer_id is far too high-cardinality to partition on — it would create millions of tiny directories. So date-only partitioning helps one access pattern and does nothing for the other.

<strong>Partition by date + ZORDER by customer_id:</strong> the classic pre-liquid answer. Date partitions prune the range scans; ZORDER co-locates customer_id within each partition so point lookups skip most files. It works, but ZORDER is a manual, periodic full rewrite of touched files, and you are locked into date as the partition column.

<strong>Liquid clustering by (order_date, customer_id):</strong> my default for a new table. It clusters on both keys at once, re-clusters incrementally as data lands (no periodic full ZORDER rewrite), avoids the small-file and skew traps of fixed partitioning, and lets the clustering keys evolve later without rewriting the table — good skipping on both dimensions at once.

<strong>Verdict:</strong> liquid clustering for a greenfield table; date-partition + ZORDER(customer_id) only if you must support an engine or runtime that cannot read liquid-clustered tables.`,
      note: '<strong>ShopKart:</strong> orders is liquid-clustered by (customer_id, order_date), replacing the old date-partition + ZORDER scheme and eliminating the nightly ZORDER rewrite.',
    },
  ];

  TV.DeltaInterview = QA;

  function levelLabel(l) { return l === 'basic' ? 'beginner' : l; }

  /* Turn the structured answer text (blank-line blocks, numbered points,
     "• " bullets, "<strong>Label:</strong>" rows) into real paragraphs,
     lists, sub-headings and labelled rows. Answer data is unchanged. */
  const _RE_OL_STRONG = /^<strong>\s*(\d+)\.\s*([\s\S]*?)<\/strong>\s*(.*)$/;
  const _RE_OL_PLAIN  = /^(\d+)\.\s+(.*)$/;
  const _RE_UL        = /^[-•]\s+(.*)$/;
  const _RE_HEAD      = /^<strong>(.+?):<\/strong>$/;
  const _RE_LABEL     = /^<strong>(.+?)<\/strong>\s+([\s\S]+)$/;

  function _formatAnswer(raw) {
    const lines = String(raw).replace(/\r/g, '').split('\n');
    const out = [];
    let para = [], listType = null, listItems = [];
    function flushPara() { if (para.length) { out.push('<p class="dint-a-p">' + para.join(' ') + '</p>'); para = []; } }
    function flushList() {
      if (listItems.length) {
        out.push('<' + listType + ' class="dint-a-' + listType + '">' +
          listItems.map(it => '<li>' + it + '</li>').join('') + '</' + listType + '>');
        listItems = []; listType = null;
      }
    }
    function flushAll() { flushPara(); flushList(); }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { flushAll(); continue; }
      let m;
      if ((m = line.match(_RE_OL_STRONG))) {
        flushPara(); if (listType && listType !== 'ol') flushList(); listType = 'ol';
        const label = m[2].trim(), rest = m[3].trim();
        listItems.push(label ? ('<strong>' + label + '</strong>' + (rest ? ' ' + rest : '')) : rest);
        continue;
      }
      if ((m = line.match(_RE_OL_PLAIN))) {
        flushPara(); if (listType && listType !== 'ol') flushList(); listType = 'ol';
        listItems.push(m[2].trim()); continue;
      }
      if ((m = line.match(_RE_UL))) {
        flushPara(); if (listType && listType !== 'ul') flushList(); listType = 'ul';
        listItems.push(m[1].trim()); continue;
      }
      if ((m = line.match(_RE_HEAD))) {
        flushAll(); out.push('<div class="dint-a-head">' + m[1].trim() + '</div>'); continue;
      }
      if ((m = line.match(_RE_LABEL))) {
        flushAll();
        const term = m[1].trim().replace(/:$/, ''), desc = m[2].trim().replace(/^[—:-]\s*/, '');
        out.push('<div class="dint-a-def"><span class="dint-a-term">' + term +
          '</span><span class="dint-a-desc">' + desc + '</span></div>');
        continue;
      }
      flushList(); para.push(line);
    }
    flushAll();
    return out.join('');
  }

  function render(container) {
    injectStyles();
    let activeFilter = 'all';

    function buildList() {
      const filtered = QA.filter(x => activeFilter === 'all' || x.level === activeFilter);
      if (!filtered.length) return '<div class="dint-empty">No questions match this filter.</div>';
      return `<div class="dint-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="dint-card" data-idx="${gi}">
          <div class="dint-q-row">
            <div class="dint-q-num">${i + 1}</div>
            <div class="dint-q-main">
              <div class="dint-q-text">${qa.q}</div>
              <div class="dint-tags"><span class="dint-tag ${qa.level}">${levelLabel(qa.level)}</span></div>
            </div>
            <div class="dint-q-chevron">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M2 4l4 4 4-4"/></svg>
            </div>
          </div>
          <div class="dint-answer">
            <div class="dint-answer-text">${_formatAnswer(qa.a)}</div>
            ${qa.code ? `<div class="dint-answer-code">${qa.code}</div>` : ''}
            ${qa.note ? `<div class="dint-note">${qa.note}</div>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    container.className = '';
    container.innerHTML = `
<div class="dint-page page-enter">
  <div class="dint-header">
    <div class="dint-header-left">
      <h1>Interview Mode</h1>
      <p>Delta Lake — ${QA.length} interview questions across all levels. Click any question to reveal the answer.</p>
    </div>
    <div class="dint-header-right">
      <div class="dint-filter-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Filter:</span>
        <button class="dint-btn active" data-filter="all">All</button>
        <button class="dint-btn" data-filter="basic">Beginner</button>
        <button class="dint-btn" data-filter="intermediate">Intermediate</button>
        <button class="dint-btn" data-filter="advanced">Advanced</button>
        <button class="dint-btn" data-filter="senior">Senior</button>
      </div>
      <span class="dint-progress-text" id="dint-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="dint-body" id="dint-body">${buildList()}</div>
</div>`;

    function updateProgress() {
      const revealed = container.querySelectorAll('.dint-card.revealed').length;
      const prog = container.querySelector('#dint-progress');
      if (prog) prog.textContent = `${revealed} / ${QA.length} revealed`;
    }
    function wireBody() {
      container.querySelector('#dint-body').addEventListener('click', (e) => {
        const card = e.target.closest('.dint-card');
        if (!card) return;
        card.classList.toggle('revealed');
        updateProgress();
      });
    }
    wireBody();
    container.querySelectorAll('.dint-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.dint-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        // Re-render the list only. #dint-body itself persists, so the delegated
        // click handler keeps working — do NOT call wireBody() again here, or each
        // filter change would stack another listener and toggle cards twice.
        container.querySelector('#dint-body').innerHTML = buildList();
        updateProgress();
      });
    });

    // Editable, cross-device-synced Q&A overlay (additive; no-op if absent).
    if (TV.interviewEdits) {
      TV.interviewEdits.enhance(container, {
        prefix: 'dint', fmt: 'delta', QA: QA, answerField: 'a', formatAnswer: _formatAnswer
      });
    }
  }

  TV.registerModule('delta', {
    id: 'interview', title: 'Interview Mode', group: 'learn', format: 'delta',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
