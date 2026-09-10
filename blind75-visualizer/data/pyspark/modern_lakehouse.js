/*
 * PySpark Interview Lab — Lakehouse & Streaming (Medium/Hard)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header) and
 * mirrors data/pyspark/advanced_patterns.js field-for-field.
 * These problems cover the modern Delta Lake + Structured Streaming layer of a
 * lakehouse: MERGE upserts, time travel, OPTIMIZE/Z-ORDER and file compaction,
 * event-time windowed aggregations and watermarks, stream-static enrichment,
 * CDC apply, schema evolution, exactly-once/idempotent writes, foreachBatch
 * upserts, and VACUUM retention. Recurring cost themes: Delta is copy-on-write
 * (MERGE/UPDATE/DELETE rewrite whole files), the transaction log commits each
 * change atomically as a new version, streaming keeps state in a checkpointed
 * state store bounded by watermarks, and small files/skew are the usual enemies.
 */
(function () {
  var CAT = "Lakehouse & Streaming";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q211
    {
      id: "delta-merge-upsert",
      lc: 211,
      title: "Upsert a batch into a Delta table with MERGE INTO",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Upsert (insert + update) via Delta MERGE", transformation: "Delta write", functions: "DeltaTable, merge, whenMatchedUpdateAll, whenNotMatchedInsertAll, execute" },
      description:
        "You receive a micro-batch of <code>updates</code> keyed by a business key (<code>customer_id</code>) and must apply it to a Delta table <code>customers</code> so that existing keys are <b>updated</b> in place and new keys are <b>inserted</b> &mdash; a classic upsert. Use <code>DeltaTable.forName(spark, 'customers').alias('t').merge(updates.alias('s'), 't.customer_id = s.customer_id')</code> with <code>whenMatchedUpdateAll()</code> and <code>whenNotMatchedInsertAll()</code>. Deduplicate the source to one row per key first, because a MERGE that matches multiple source rows to one target row fails.",
      examples: [
        {
          input: "customers has (c1, NYC), (c2, LA). updates: (c1, SF), (c3, SEA).",
          output: "After merge: (c1, SF) [updated], (c2, LA) [untouched], (c3, SEA) [inserted].",
          reasoning: "c1 matches an existing key so whenMatchedUpdateAll overwrites its columns; c2 is not in the source so it is left as-is; c3 has no matching target row so whenNotMatchedInsertAll adds it."
        }
      ],
      approaches: [
        {
          name: "DeltaTable.merge on the business key: updateAll matched, insertAll not-matched",
          whenToUse: "Applying a periodic batch of new/changed records to a keyed Delta table where each key must appear once with its latest values.",
          logic:
            "**What it asks.** Blend a batch of incoming rows into a Delta table: overwrite rows whose key already exists, append rows whose key is new, in one atomic operation.\n\n" +
            "**Key Idea.** `DeltaTable.forName(spark, 't')` gives a handle whose `.merge(source, condition)` builds a MERGE plan. The ON `condition` names the business key (`t.customer_id = s.customer_id`); `whenMatchedUpdateAll()` copies every source column onto the matched target row and `whenNotMatchedInsertAll()` inserts the source row when no target matches. `.execute()` commits it as a single new table version. The one hard precondition: the **source must be one row per key** — otherwise Delta cannot decide which source row wins and throws 'multiple source rows matched'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Dedupe the source to one row per key (e.g. `row_number()` over the key ordered by an update timestamp desc, keep `rn == 1`).\n" +
            "2. Get the Delta handle: `tgt = DeltaTable.forName(spark, 'customers')`.\n" +
            "3. Build the merge: `tgt.alias('t').merge(updates.alias('s'), 't.customer_id = s.customer_id')`.\n" +
            "4. `.whenMatchedUpdateAll()` — update existing keys with all source columns.\n" +
            "5. `.whenNotMatchedInsertAll()` — insert brand-new keys.\n" +
            "6. `.execute()` to commit the transaction.\n\n" +
            "**Why it works.** MERGE is a single logical statement over a keyed join: matched keys route to the update branch, unmatched source keys to the insert branch, and unmatched target rows are left alone. Because Delta commits the whole thing as one atomic version, a reader sees either the pre-merge or post-merge snapshot, never a half-applied state.\n\n" +
            "**Common Gotchas.**\n" +
            "- Dedupe the source to one row per key first, or the MERGE fails with 'cannot perform MERGE as multiple source rows matched a target row'.\n" +
            "- `updateAll`/`insertAll` require the source schema to match the target; add `whenMatchedUpdate(set=...)` / explicit `values` when they differ.\n" +
            "- Add a partition predicate to the ON clause when the table is partitioned so Delta prunes files and rewrites fewer of them.\n" +
            "- MERGE is copy-on-write: even a one-row change rewrites every Parquet file that held a matched row.\n" +
            "- A no-op update (source equals target) still rewrites the file; add `whenMatchedUpdateAll(condition=...)` to skip unchanged rows if churn matters.\n\n" +
            "**Interview mindset.** Say 'MERGE on the business key: updateAll on match, insertAll on not-match, commit atomically — and dedupe the source to one row per key first'. Mention copy-on-write file rewrites and partition pruning as the cost story.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "# 0) Dedupe source to ONE row per business key (latest wins).\n" +
            "w = Window.partitionBy('customer_id').orderBy(col('update_ts').desc())\n" +
            "src = (updates\n" +
            "    .withColumn('rn', row_number().over(w))    # rank by recency\n" +
            "    .filter(col('rn') == 1)                    # one row per key\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "# 1) Delta handle for the target table.\n" +
            "tgt = DeltaTable.forName(spark, 'customers')\n" +
            "\n" +
            "# 2) Upsert: update matched keys, insert new keys, commit atomically.\n" +
            "(tgt.alias('t')\n" +
            "    .merge(src.alias('s'), 't.customer_id = s.customer_id')  # ON business key\n" +
            "    .whenMatchedUpdateAll()                    # existing key -> overwrite columns\n" +
            "    .whenNotMatchedInsertAll()                 # new key -> insert row\n" +
            "    .execute())                                # one new table version",
          plain:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = Window.partitionBy('customer_id').orderBy(col('update_ts').desc())\n" +
            "src = (updates\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "tgt = DeltaTable.forName(spark, 'customers')\n" +
            "\n" +
            "(tgt.alias('t')\n" +
            "    .merge(src.alias('s'), 't.customer_id = s.customer_id')\n" +
            "    .whenMatchedUpdateAll()\n" +
            "    .whenNotMatchedInsertAll()\n" +
            "    .execute())"
        }
      ],
      sparkInternals:
        "Delta MERGE runs as <b>two internal jobs</b>. Phase one is an inner join between the source and the target to find which target data files contain matched keys &mdash; a <b>wide</b> shuffle keyed by the merge condition. Phase two re-reads only those <b>touched files</b> and rewrites them: Delta is <b>copy-on-write</b>, so each matched Parquet file is rewritten whole (matched rows updated, unmatched rows copied through) as new files, and the old files are tombstoned in the transaction log &mdash; nothing is edited in place. Cost therefore scales with the number of <b>files touched</b>, not rows changed, so partitioning the table and adding the partition column to the ON clause lets Delta skip untouched partitions entirely. The commit appends one JSON action set to <code>_delta_log</code>, giving snapshot isolation: concurrent readers see the whole old or whole new version, never a partial merge.",
      sparkSql:
        "-- Dedupe source to one row per key, then upsert.\n" +
        "MERGE INTO customers t\n" +
        "USING (\n" +
        "  SELECT * FROM (\n" +
        "    SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY update_ts DESC) AS rn\n" +
        "    FROM updates\n" +
        "  ) WHERE rn = 1\n" +
        ") s\n" +
        "  ON t.customer_id = s.customer_id\n" +
        "WHEN MATCHED THEN UPDATE SET *\n" +
        "WHEN NOT MATCHED THEN INSERT *;",
      recognizeRecall: [
        "**Spot it:** 'upsert', 'insert new and update existing', 'apply a batch keyed by id', 'merge into the table'.",
        "**Say it:** `DeltaTable.forName(...).merge(src, 't.id = s.id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()`.",
        "**Trap:** dedupe source to one row per key first (else MERGE errors); copy-on-write rewrites whole files; add a partition predicate to prune."
      ]
    },

    // ------------------------------------------------------------------ Q212
    {
      id: "delta-time-travel",
      lc: 212,
      title: "Time-travel a Delta table and diff two versions",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Delta time travel (versionAsOf / timestampAsOf) + version diff", transformation: "Delta write", functions: "read.format('delta'), option('versionAsOf'), option('timestampAsOf'), DESCRIBE HISTORY, subtract, exceptAll" },
      description:
        "A bad batch corrupted the <code>orders</code> Delta table and you must inspect an earlier state and see exactly what changed. Read a prior snapshot with <code>spark.read.format('delta').option('versionAsOf', 3).load(path)</code> (or <code>option('timestampAsOf', '2026-09-01')</code>), list the change log with <code>DESCRIBE HISTORY</code>, and <b>diff two versions</b> with <code>exceptAll</code> to find rows added/removed between them. Delta keeps every committed version as long as its files survive the retention window.",
      examples: [
        {
          input: "orders version 4 = {o1, o2, o3}; version 5 = {o1, o2x (amount changed), o4}.",
          output: "v5 EXCEPT v4 -> {o2x, o4} (new/changed rows); v4 EXCEPT v5 -> {o2, o3} (removed/pre-change rows).",
          reasoning: "Reading each version gives its full snapshot; exceptAll of new-minus-old yields rows present only in v5 (inserts + post-change), and old-minus-new yields rows present only in v4 (deletes + pre-change). DESCRIBE HISTORY shows the operation (MERGE/WRITE) behind each version."
        }
      ],
      approaches: [
        {
          name: "read versionAsOf / timestampAsOf snapshots, inspect DESCRIBE HISTORY, diff with exceptAll",
          whenToUse: "Auditing, debugging a bad write, reproducing a report as-of a date, or rolling back after a mistaken batch.",
          logic:
            "**What it asks.** Look at the table as it was at an earlier version or timestamp, understand its change history, and compute the row-level difference between two versions.\n\n" +
            "**Key Idea.** Every Delta commit is a numbered <b>version</b> recorded in `_delta_log`. `spark.read.format('delta').option('versionAsOf', n).load(path)` (or `.option('timestampAsOf', ts)`) reconstructs the exact snapshot at that version by replaying the log up to it. `DESCRIBE HISTORY t` lists each version with its operation, timestamp, and metrics. To diff two versions, read both as DataFrames and use `exceptAll` (or `subtract`) both directions: `new.exceptAll(old)` = rows added/changed, `old.exceptAll(new)` = rows removed/pre-change.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Inspect history: `spark.sql('DESCRIBE HISTORY delta.`' + path + '`')` (or `DESCRIBE HISTORY orders`) to find version numbers and operations.\n" +
            "2. Read the old snapshot: `old = spark.read.format('delta').option('versionAsOf', 4).load(path)`.\n" +
            "3. Read the new snapshot: `new = spark.read.format('delta').option('versionAsOf', 5).load(path)`.\n" +
            "4. Rows added or changed: `added = new.exceptAll(old)`.\n" +
            "5. Rows removed or pre-change: `removed = old.exceptAll(new)`.\n" +
            "6. To recover: `RESTORE TABLE orders TO VERSION AS OF 4` (or overwrite from the old snapshot).\n\n" +
            "**Why it works.** The transaction log is an ordered record of add/remove file actions, so any past version is deterministically reconstructable as long as its data files have not been vacuumed. `exceptAll` is a set-difference that keeps duplicates, so comparing two full snapshots surfaces exactly the rows that differ — the practical definition of 'what changed between v4 and v5'.\n\n" +
            "**Common Gotchas.**\n" +
            "- Time travel only reaches versions whose files still exist; `VACUUM` past the retention window makes older versions unreadable ('file not found').\n" +
            "- `timestampAsOf` picks the latest version at or before that instant — it is not an exact-time query; use the version number when you need precision.\n" +
            "- Use `exceptAll` (keeps duplicates) not `except`/`distinct` when row multiplicity matters.\n" +
            "- Diffing full snapshots is a shuffle-heavy set operation; for large tables prefer Delta's Change Data Feed (`readChangeFeed`) instead.\n" +
            "- `versionAsOf` numbering starts at 0 (the create/first write).\n\n" +
            "**Interview mindset.** Say 'every commit is a version in the log; read versionAsOf/timestampAsOf to reconstruct a past snapshot, DESCRIBE HISTORY to audit, exceptAll both directions to diff, RESTORE to roll back — bounded by the vacuum retention window'.",
          rcs:
            "path = '/lake/orders'\n" +
            "\n" +
            "# 1) What changed and when? List every committed version.\n" +
            "spark.sql(\"DESCRIBE HISTORY delta.`\" + path + \"`\").show(truncate=False)\n" +
            "\n" +
            "# 2) Reconstruct two past snapshots by version number.\n" +
            "old = spark.read.format('delta').option('versionAsOf', 4).load(path)   # or timestampAsOf\n" +
            "new = spark.read.format('delta').option('versionAsOf', 5).load(path)\n" +
            "\n" +
            "# (timestamp form: latest version at or before the instant)\n" +
            "# asof = spark.read.format('delta').option('timestampAsOf', '2026-09-01 00:00:00').load(path)\n" +
            "\n" +
            "# 3) Row-level diff (exceptAll keeps duplicates).\n" +
            "added   = new.exceptAll(old)   # rows present only in v5 (inserts + post-change)\n" +
            "removed = old.exceptAll(new)   # rows present only in v4 (deletes + pre-change)\n" +
            "added.show();  removed.show()\n" +
            "\n" +
            "# 4) Roll back the table to the good version if needed.\n" +
            "spark.sql('RESTORE TABLE orders TO VERSION AS OF 4')",
          plain:
            "path = '/lake/orders'\n" +
            "\n" +
            "spark.sql(\"DESCRIBE HISTORY delta.`\" + path + \"`\").show(truncate=False)\n" +
            "\n" +
            "old = spark.read.format('delta').option('versionAsOf', 4).load(path)\n" +
            "new = spark.read.format('delta').option('versionAsOf', 5).load(path)\n" +
            "\n" +
            "added   = new.exceptAll(old)\n" +
            "removed = old.exceptAll(new)\n" +
            "added.show();  removed.show()\n" +
            "\n" +
            "spark.sql('RESTORE TABLE orders TO VERSION AS OF 4')"
        }
      ],
      sparkInternals:
        "Time travel is <b>metadata replay</b>, not a copy: reading <code>versionAsOf n</code> replays the <code>_delta_log</code> JSON (and checkpoint Parquet) up to version <code>n</code> to compute the exact set of active data files, then scans only those &mdash; so an old snapshot costs the same as a normal read of that many files, with no rewrite. <code>DESCRIBE HISTORY</code> reads only the log, not the data. The <code>exceptAll</code> diff is a <b>wide</b> set-difference: Spark hash-shuffles both snapshots by the whole row and anti-joins them, so it scans both versions in full &mdash; cheap for a small table, expensive for a large one, where Delta's Change Data Feed is the targeted alternative. <code>RESTORE</code> does not delete newer data files; it writes a <b>new</b> commit whose active-file set equals the old version's, so the rollback is itself a versioned, reversible operation. All of this is bounded by retention: once <code>VACUUM</code> removes a version's unreferenced files, that version can no longer be read.",
      sparkSql:
        "-- History / audit\n" +
        "DESCRIBE HISTORY orders;\n" +
        "\n" +
        "-- Query past snapshots\n" +
        "SELECT * FROM orders VERSION AS OF 4;\n" +
        "SELECT * FROM orders TIMESTAMP AS OF '2026-09-01 00:00:00';\n" +
        "\n" +
        "-- Diff two versions (rows added/changed between v4 and v5)\n" +
        "SELECT * FROM orders VERSION AS OF 5\n" +
        "EXCEPT ALL\n" +
        "SELECT * FROM orders VERSION AS OF 4;\n" +
        "\n" +
        "-- Roll back\n" +
        "RESTORE TABLE orders TO VERSION AS OF 4;",
      recognizeRecall: [
        "**Spot it:** 'query the table as it was', 'as-of a date/version', 'what changed between versions', 'roll back a bad write', 'audit history'.",
        "**Say it:** `read.format('delta').option('versionAsOf'|'timestampAsOf', ...)`; `DESCRIBE HISTORY`; `exceptAll` both ways to diff; `RESTORE ... TO VERSION AS OF`.",
        "**Trap:** VACUUM past retention makes old versions unreadable; timestampAsOf snaps to the latest version at-or-before; version numbering starts at 0."
      ]
    },

    // ------------------------------------------------------------------ Q213
    {
      id: "delta-optimize-zorder",
      lc: 213,
      title: "Fix small files with OPTIMIZE and cluster with ZORDER BY",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Compaction (OPTIMIZE) + data skipping (ZORDER)", transformation: "Delta write", functions: "OPTIMIZE, ZORDER BY, DeltaTable.optimize().executeCompaction(), executeZOrderBy, dataSkipping" },
      description:
        "Streaming appends have left the <code>events</code> Delta table with thousands of tiny Parquet files, and analysts filter it by <code>user_id</code>. Run <code>OPTIMIZE events</code> to bin-pack small files into ~1 GB files, and <code>OPTIMIZE events ZORDER BY (user_id)</code> to co-locate rows with similar <code>user_id</code> so Delta can <b>skip files</b> on that filter. Explain when Z-order actually helps (high-cardinality columns used in selective filters/joins) and when it does not.",
      examples: [
        {
          input: "events: 5,000 files averaging 4 MB; queries filter WHERE user_id = 123.",
          output: "After OPTIMIZE: ~20 files of ~1 GB (fewer tasks, less overhead). After ZORDER BY (user_id): each file's min/max user_id is tight, so a user_id = 123 query reads only the 1-2 files that can contain it.",
          reasoning: "Compaction removes per-file task and metadata overhead; Z-ordering sorts data along a space-filling curve so correlated user_id values land together, tightening per-file min/max stats and letting the data-skipping index prune files the query cannot need."
        }
      ],
      approaches: [
        {
          name: "OPTIMIZE to bin-pack, ZORDER BY the selective filter column for file skipping",
          whenToUse: "A table with many small files (streaming/CDC output) that is repeatedly filtered or joined on one or two high-cardinality columns.",
          logic:
            "**What it asks.** Consolidate many small files into few large ones, and physically cluster the data on the column analysts filter by so queries scan far fewer files.\n\n" +
            "**Key Idea.** Two distinct wins. (1) `OPTIMIZE t` <b>bin-packs</b> small files into ~1 GB files, cutting the task count and per-file overhead — pure compaction, no reordering. (2) `OPTIMIZE t ZORDER BY (user_id)` additionally sorts rows along a Z-order (space-filling) curve so rows with nearby `user_id` values share files; this tightens each file's per-column min/max statistics, and Delta's <b>data-skipping</b> index then prunes any file whose min/max range cannot contain the filter value. Z-order pays off only for <b>high-cardinality</b> columns used in <b>selective</b> filters or joins.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Confirm the symptom: `DESCRIBE DETAIL events` shows `numFiles` huge and `sizeInBytes / numFiles` tiny.\n" +
            "2. Compact: `spark.sql('OPTIMIZE events')` (bin-pack only).\n" +
            "3. Cluster for the hot filter: `spark.sql('OPTIMIZE events ZORDER BY (user_id)')`.\n" +
            "4. Scope big tables by partition to bound the rewrite: `OPTIMIZE events WHERE date = '2026-09-10' ZORDER BY (user_id)`.\n" +
            "5. Verify skipping: run the filter query and check the scan reads few files (Spark UI / `numFilesScanned`).\n" +
            "6. Later, reclaim the tombstoned small files with `VACUUM`.\n\n" +
            "**Why it works.** Fewer, larger files mean fewer tasks and less driver/metadata overhead per query, and Parquet's own compression/row-group skipping works better on big files. Z-ordering makes a column's values contiguous across files, so the file-level min/max stats become tight and non-overlapping — turning 'scan everything' into 'scan the one file whose range covers 123'. On a low-cardinality or rarely-filtered column the min/max ranges overlap heavily and skip little, so Z-order adds cost without benefit.\n\n" +
            "**Common Gotchas.**\n" +
            "- Z-order helps only <b>high-cardinality</b> columns in <b>selective</b> predicates; on a boolean/low-cardinality column it wastes a rewrite.\n" +
            "- Z-ordering on too many columns dilutes the benefit for each; pick the 1-2 most-filtered.\n" +
            "- OPTIMIZE is a full <b>rewrite</b> of the affected files (copy-on-write) — expensive; run it off-peak and scope by partition.\n" +
            "- It is not automatic; schedule it, and note the partition column need not be Z-ordered (partitioning already skips it).\n" +
            "- Compaction leaves the old small files as tombstones until `VACUUM`, so storage temporarily grows.\n\n" +
            "**Interview mindset.** Say 'OPTIMIZE bin-packs small files; ZORDER clusters a high-cardinality filter column so data-skipping prunes files — but it is a full rewrite and only helps selective, high-cardinality predicates'. Distinguish partitioning (coarse, low-cardinality) from Z-order (fine, high-cardinality).",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "# 0) Diagnose the small-files problem.\n" +
            "spark.sql('DESCRIBE DETAIL events').select('numFiles', 'sizeInBytes').show()\n" +
            "\n" +
            "# 1) Bin-pack small files into ~1 GB files (compaction only, no reorder).\n" +
            "spark.sql('OPTIMIZE events')\n" +
            "\n" +
            "# 2) Cluster on the selective, high-cardinality filter column for file skipping.\n" +
            "#    Scope by partition on big tables to bound the rewrite.\n" +
            "spark.sql(\"OPTIMIZE events WHERE date = '2026-09-10' ZORDER BY (user_id)\")\n" +
            "\n" +
            "# Python API equivalent:\n" +
            "dt = DeltaTable.forName(spark, 'events')\n" +
            "dt.optimize().executeCompaction()                 # = OPTIMIZE\n" +
            "dt.optimize().where(\"date = '2026-09-10'\").executeZOrderBy('user_id')  # = ZORDER BY\n" +
            "\n" +
            "# 3) Later: reclaim the tombstoned small files.\n" +
            "# spark.sql('VACUUM events')",
          plain:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "spark.sql('DESCRIBE DETAIL events').select('numFiles', 'sizeInBytes').show()\n" +
            "\n" +
            "spark.sql('OPTIMIZE events')\n" +
            "\n" +
            "spark.sql(\"OPTIMIZE events WHERE date = '2026-09-10' ZORDER BY (user_id)\")\n" +
            "\n" +
            "dt = DeltaTable.forName(spark, 'events')\n" +
            "dt.optimize().executeCompaction()\n" +
            "dt.optimize().where(\"date = '2026-09-10'\").executeZOrderBy('user_id')"
        }
      ],
      sparkInternals:
        "<code>OPTIMIZE</code> reads the small files and writes new bin-packed files targeting <code>spark.databricks.delta.optimize.maxFileSize</code> (~1 GB by default), then commits one transaction that <b>adds</b> the big files and <b>removes</b> (tombstones) the small ones &mdash; a copy-on-write rewrite, so the data moves once and the log records the swap atomically. Adding <code>ZORDER BY (col)</code> makes the rewrite also <b>sort</b> rows along an interleaved-bits Z-curve so multi-dimensional locality is preserved; the writer records per-file min/max (and null counts) for the leading columns in the log. At query time Delta's <b>data-skipping</b> reads those stats and prunes any file whose min/max range cannot satisfy the predicate, so a selective filter touches a handful of files instead of all of them. Statistics are collected only for the first N columns (default 32), and skipping strength depends on how non-overlapping the per-file ranges are &mdash; which is exactly what high cardinality plus Z-order buys and what a low-cardinality column cannot. The rewrite itself is a large shuffle/sort job; the old files linger as tombstones until <code>VACUUM</code>.",
      sparkSql:
        "-- Diagnose\n" +
        "DESCRIBE DETAIL events;\n" +
        "\n" +
        "-- Compact small files (bin-pack only)\n" +
        "OPTIMIZE events;\n" +
        "\n" +
        "-- Compact + cluster on the selective filter column, scoped by partition\n" +
        "OPTIMIZE events WHERE date = '2026-09-10' ZORDER BY (user_id);\n" +
        "\n" +
        "-- Reclaim tombstoned small files afterward\n" +
        "VACUUM events;",
      recognizeRecall: [
        "**Spot it:** 'thousands of small files', 'slow filtered queries', 'compact the table', 'cluster/skip on a column', 'streaming output fragmentation'.",
        "**Say it:** `OPTIMIZE t` to bin-pack; `OPTIMIZE t ZORDER BY (col)` to cluster a high-cardinality filter column so data-skipping prunes files.",
        "**Trap:** Z-order helps only selective high-cardinality predicates; it's a full rewrite (run off-peak, scope by partition); VACUUM afterward to reclaim space."
      ]
    },

    // ------------------------------------------------------------------ Q214
    {
      id: "streaming-windowed-agg",
      lc: 214,
      title: "Event-time windowed count with a watermark for late data",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Structured Streaming event-time window + watermark", transformation: "Streaming", functions: "readStream, withWatermark, window, groupBy, count, writeStream, outputMode, checkpointLocation" },
      description:
        "Consume a stream of click events and compute a <b>count per 5-minute event-time window</b>, tolerating events that arrive late by up to 10 minutes. Use <code>withWatermark('event_time', '10 minutes')</code> then <code>groupBy(window('event_time', '5 minutes'))</code>. The watermark bounds how long window state is kept and lets you use <code>append</code> output mode &mdash; a window is emitted once it can no longer receive data.",
      examples: [
        {
          input: "5-min windows; watermark 10 min. Events at 10:02, 10:04 (window 10:00-10:05); a late event stamped 10:03 arrives at wall-clock 10:08.",
          output: "Window 10:00-10:05 counts the 10:03 event too (it is within the 10-min watermark). Once the watermark passes 10:15, the 10:00-10:05 window is finalized and emitted; an event stamped 10:03 arriving after that is dropped.",
          reasoning: "The watermark = max observed event_time minus 10 minutes; the 10:03 event is still above the watermark when it arrives at 10:08, so it updates the open window. When the watermark exceeds the window end + allowed lateness, the window is closed, emitted in append mode, and its state is dropped."
        }
      ],
      approaches: [
        {
          name: "withWatermark + window groupBy, append output, checkpointed",
          whenToUse: "Event-time aggregations (counts, sums, rates per time bucket) over an unbounded stream where some events arrive out of order / late.",
          logic:
            "**What it asks.** Aggregate a stream into fixed event-time buckets, counting late-but-not-too-late events correctly, and emit each bucket once when it is safe to consider it complete.\n\n" +
            "**Key Idea.** Aggregate on <b>event time</b> (the timestamp in the data), not processing time. `withWatermark('event_time', '10 minutes')` tells Spark the maximum lateness to tolerate: the watermark trails the max observed event time by 10 minutes, and any event older than the current watermark is dropped. `groupBy(window('event_time', '5 minutes')).count()` buckets events into tumbling 5-minute windows. With `outputMode('append')`, a window's result is emitted exactly once, when the watermark passes its end (plus lateness) so no more rows can land in it. A checkpoint makes the whole thing restartable exactly-once.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Read the stream: `events = spark.readStream.format('kafka')...load()` and parse `event_time` as a timestamp.\n" +
            "2. Declare lateness: `.withWatermark('event_time', '10 minutes')` — this must come before the aggregation.\n" +
            "3. Window + aggregate: `.groupBy(window('event_time', '5 minutes')).count()`.\n" +
            "4. Choose output mode: `append` (emit finalized windows only) or `update` (emit windows as they change).\n" +
            "5. Write with a checkpoint: `.writeStream.outputMode('append').option('checkpointLocation', ckpt).start()`.\n\n" +
            "**Why it works.** The watermark is Spark's answer to 'how long do I keep a window open?': it is a moving low bound on event time, so state older than it can be dropped and late events beyond it can be ignored — bounding memory. Windowing on event time makes results deterministic regardless of when data physically arrives, and append mode's 'emit when the watermark passes the window' rule guarantees each window is output once and never revised.\n\n" +
            "**Common Gotchas.**\n" +
            "- `withWatermark` must be applied to the same event-time column used in `window(...)`, and <b>before</b> the aggregation, or it is ignored.\n" +
            "- `append` output emits a window only after the watermark passes it (delayed results); `update` emits partial counts sooner but restates them.\n" +
            "- `complete` mode keeps <b>all</b> windows forever (no state dropping) — avoid it for unbounded streams.\n" +
            "- Aggregating on processing time instead of event time makes counts depend on arrival timing — wrong for late data.\n" +
            "- Always set a `checkpointLocation`; without it the stream cannot recover offsets or state.\n\n" +
            "**Interview mindset.** Say 'aggregate on event time, `withWatermark` before the `window` groupBy to bound state and drop too-late events, append mode to emit each window once when the watermark passes it, checkpoint for recovery'.",
          rcs:
            "from pyspark.sql.functions import window, col\n" +
            "\n" +
            "# 1) Source stream with a parsed event_time timestamp column.\n" +
            "events = (spark.readStream\n" +
            "    .format('kafka')\n" +
            "    .option('subscribe', 'clicks')\n" +
            "    .load()\n" +
            "    .selectExpr(\"CAST(value AS STRING) AS json\")\n" +
            "    .selectExpr(\"from_json(json, 'event_time TIMESTAMP, user_id STRING') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "# 2) Watermark BEFORE the aggregation: tolerate up to 10 min of lateness.\n" +
            "# 3) Tumbling 5-minute event-time windows, counted.\n" +
            "counts = (events\n" +
            "    .withWatermark('event_time', '10 minutes')          # bound state + drop older\n" +
            "    .groupBy(window('event_time', '5 minutes'))         # tumbling buckets\n" +
            "    .count())\n" +
            "\n" +
            "# 4/5) Emit each window once when the watermark passes it; checkpoint to recover.\n" +
            "q = (counts.writeStream\n" +
            "    .outputMode('append')                               # finalized windows only\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/click_counts')\n" +
            "    .toTable('click_counts'))",
          plain:
            "from pyspark.sql.functions import window, col\n" +
            "\n" +
            "events = (spark.readStream\n" +
            "    .format('kafka')\n" +
            "    .option('subscribe', 'clicks')\n" +
            "    .load()\n" +
            "    .selectExpr(\"CAST(value AS STRING) AS json\")\n" +
            "    .selectExpr(\"from_json(json, 'event_time TIMESTAMP, user_id STRING') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "counts = (events\n" +
            "    .withWatermark('event_time', '10 minutes')\n" +
            "    .groupBy(window('event_time', '5 minutes'))\n" +
            "    .count())\n" +
            "\n" +
            "q = (counts.writeStream\n" +
            "    .outputMode('append')\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/click_counts')\n" +
            "    .toTable('click_counts'))"
        }
      ],
      sparkInternals:
        "Each micro-batch shuffles incoming rows by the <b>window key</b> (a wide exchange) and updates a keyed aggregate held in the <b>state store</b> &mdash; a versioned key/value store checkpointed to the <code>checkpointLocation</code> so counts survive restarts. The watermark is recomputed per batch as <code>max(event_time) &minus; delay</code>; Spark then <b>evicts</b> state for windows whose end is below the watermark and <b>drops</b> arriving rows older than it, which is what keeps state bounded on an unbounded stream. In <code>append</code> mode a window's row is written only once, in the batch where the watermark first passes the window's end, so downstream sees each window exactly once and never a restatement; <code>update</code> mode instead emits the changed windows every batch. The checkpoint stores source offsets plus the state store, giving exactly-once semantics against a replayable source; the DataFrame API and its Catalyst plan are identical to a batch groupBy &mdash; only the incremental execution and state management differ.",
      sparkSql:
        "-- Structured Streaming has no streaming DDL for this; equivalent batch query:\n" +
        "SELECT window(event_time, '5 minutes') AS w, COUNT(*) AS cnt\n" +
        "FROM clicks\n" +
        "GROUP BY window(event_time, '5 minutes');\n" +
        "\n" +
        "-- In a streaming SQL context the watermark is declared on the source, e.g.:\n" +
        "-- (Spark) events.withWatermark('event_time', '10 minutes') then the GROUP BY window above.",
      recognizeRecall: [
        "**Spot it:** 'count per N-minute window', 'event-time aggregation', 'handle late/out-of-order events', 'tumbling window on a stream'.",
        "**Say it:** `withWatermark('event_time','10 minutes')` before `groupBy(window('event_time','5 minutes')).count()`, `append` output, `checkpointLocation`.",
        "**Trap:** watermark before the aggregation and on the same column; append emits windows late (once watermark passes); never `complete` mode on an unbounded stream."
      ]
    },

    // ------------------------------------------------------------------ Q215
    {
      id: "streaming-dedup-watermark",
      lc: 215,
      title: "Streaming deduplication bounded by a watermark",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Watermark-bounded streaming dedup", transformation: "Streaming", functions: "withWatermark, dropDuplicatesWithinWatermark, dropDuplicates, writeStream, checkpointLocation" },
      description:
        "An at-least-once source (Kafka) can redeliver the same <code>event_id</code>, so your stream must drop duplicates without keeping every id ever seen. Use <code>dropDuplicatesWithinWatermark(['event_id'])</code> (Spark 3.5+) after <code>withWatermark('event_time', '1 hour')</code>, or the classic <code>withWatermark(...).dropDuplicates(['event_id', 'event_time'])</code>. The watermark bounds the dedup state so ids older than the window are forgotten instead of accumulating forever.",
      examples: [
        {
          input: "watermark 1 hour on event_time. Events: (e1, 10:00), (e1, 10:00) [redelivered 10:05], (e1, 12:30).",
          output: "First (e1, 10:00) passes; its 10:05 redelivery is dropped as a duplicate. The (e1, 12:30) event passes: by 12:30 the watermark has advanced past 10:00 + 1h, so e1's earlier state was evicted and it is treated as new.",
          reasoning: "Within the 1-hour watermark window, a repeated event_id is suppressed. Once the watermark moves beyond the retained window, the id's dedup state is dropped to bound memory, so a much-later reuse of the same id is not deduplicated against the expired one."
        }
      ],
      approaches: [
        {
          name: "withWatermark then dropDuplicatesWithinWatermark (or dropDuplicates including event_time)",
          whenToUse: "Deduplicating an at-least-once stream (Kafka/Kinesis redeliveries, retries) where you cannot store the full set of seen keys.",
          logic:
            "**What it asks.** Suppress duplicate events by key on a stream, keeping only bounded dedup state so memory does not grow without limit.\n\n" +
            "**Key Idea.** Naive `dropDuplicates(['event_id'])` on a stream would remember <b>every</b> id forever — unbounded state. Adding a watermark caps how long an id is remembered. Two forms: (Spark 3.5+) `withWatermark('event_time', '1 hour').dropDuplicatesWithinWatermark(['event_id'])` dedups on the key alone and evicts each id's state once the watermark passes; (older) `withWatermark('event_time', '1 hour').dropDuplicates(['event_id', 'event_time'])` requires the event-time column in the key set so Spark knows when to expire it. Either way, duplicates within the window are dropped and state is bounded.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Ensure each event carries a stable dedup key (`event_id`) and an `event_time` timestamp.\n" +
            "2. Declare the retention window: `.withWatermark('event_time', '1 hour')`.\n" +
            "3. Dedup (3.5+): `.dropDuplicatesWithinWatermark(['event_id'])` — key only, state expires by watermark.\n" +
            "4. Or (portable): `.dropDuplicates(['event_id', 'event_time'])` — event_time in the key lets state expire.\n" +
            "5. Write with a checkpoint so the dedup state survives restarts.\n\n" +
            "**Why it works.** The dedup operator stores seen keys in the state store keyed by (dedup key), tagged with an event-time bound. When the watermark advances past that bound, the entry is evicted — so within the window redeliveries are recognized and dropped, and beyond it the state is reclaimed. `dropDuplicatesWithinWatermark` is the purpose-built form: it lets the redelivered copy carry a slightly different `event_time` (common with retries) yet still be deduped on `event_id` alone, which plain `dropDuplicates(['event_id','event_time'])` cannot.\n\n" +
            "**Common Gotchas.**\n" +
            "- Plain `dropDuplicates(['event_id'])` <b>without</b> a watermark keeps state for every id forever — the memory bug this problem exists to avoid.\n" +
            "- Classic `dropDuplicates` needs the event-time column <b>in</b> the key list to be able to expire; `dropDuplicatesWithinWatermark` does not.\n" +
            "- Set the watermark to your real redelivery/lateness horizon: too short lets late duplicates through, too long bloats state.\n" +
            "- A duplicate arriving <b>after</b> its state expired will not be caught — dedup is only within the window.\n" +
            "- Always checkpoint; the dedup state must be recovered on restart or duplicates slip through after a failure.\n\n" +
            "**Interview mindset.** Say 'dedup on a stream must be watermark-bounded or state grows forever; `dropDuplicatesWithinWatermark(['event_id'])` after `withWatermark` in 3.5+, else include `event_time` in `dropDuplicates`'. Tie the watermark length to the redelivery horizon.",
          rcs:
            "# 1) Source stream: each event has a stable event_id and an event_time.\n" +
            "events = (spark.readStream\n" +
            "    .format('kafka').option('subscribe', 'orders').load()\n" +
            "    .selectExpr(\"from_json(CAST(value AS STRING),\n" +
            "                'event_id STRING, event_time TIMESTAMP, amount DOUBLE') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "# 2/3) Watermark bounds the dedup state; dedup on the key alone (Spark 3.5+).\n" +
            "deduped = (events\n" +
            "    .withWatermark('event_time', '1 hour')             # remember ids for 1h only\n" +
            "    .dropDuplicatesWithinWatermark(['event_id']))      # drop redeliveries by id\n" +
            "\n" +
            "# Portable form on older Spark (event_time MUST be in the key set to expire):\n" +
            "# deduped = (events\n" +
            "#     .withWatermark('event_time', '1 hour')\n" +
            "#     .dropDuplicates(['event_id', 'event_time']))\n" +
            "\n" +
            "# 4) Checkpoint so dedup state survives restarts.\n" +
            "q = (deduped.writeStream\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/orders_dedup')\n" +
            "    .toTable('orders_clean'))",
          plain:
            "events = (spark.readStream\n" +
            "    .format('kafka').option('subscribe', 'orders').load()\n" +
            "    .selectExpr(\"from_json(CAST(value AS STRING),\n" +
            "                'event_id STRING, event_time TIMESTAMP, amount DOUBLE') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "deduped = (events\n" +
            "    .withWatermark('event_time', '1 hour')\n" +
            "    .dropDuplicatesWithinWatermark(['event_id']))\n" +
            "\n" +
            "q = (deduped.writeStream\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/orders_dedup')\n" +
            "    .toTable('orders_clean'))"
        }
      ],
      sparkInternals:
        "Streaming dedup is a <b>stateful</b> operator: it hash-shuffles by the dedup key and stores each seen key in the checkpointed <b>state store</b>, emitting a row only the first time a key appears. Without a watermark that state grows with the number of distinct keys forever; the watermark tags each stored key with an event-time expiry and <b>evicts</b> it once <code>max(event_time) &minus; delay</code> passes, so memory is bounded by the window, not the lifetime of the stream. <code>dropDuplicatesWithinWatermark</code> (Spark 3.5+) stores only the key and an expiry, so a redelivery whose <code>event_time</code> differs is still matched on the key alone; the older <code>dropDuplicates([key, event_time])</code> must fold the timestamp into the stored key, which is why the timestamp has to be part of the dedup set for state to expire. The state store is versioned per micro-batch and checkpointed, so on restart the dedup memory is restored and exactly-once suppression holds across failures against a replayable source.",
      sparkSql:
        "-- No streaming SQL DDL; the batch analogue of dedup-to-first-per-key:\n" +
        "SELECT * FROM (\n" +
        "  SELECT *, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY event_time) AS rn\n" +
        "  FROM events\n" +
        ") WHERE rn = 1;\n" +
        "\n" +
        "-- Streaming (Spark): events.withWatermark('event_time','1 hour')\n" +
        "--                          .dropDuplicatesWithinWatermark(['event_id'])",
      recognizeRecall: [
        "**Spot it:** 'at-least-once source', 'drop duplicate events', 'Kafka redelivery', 'dedup a stream without unbounded state'.",
        "**Say it:** `withWatermark('event_time','1 hour')` then `dropDuplicatesWithinWatermark(['event_id'])` (3.5+), else `dropDuplicates(['event_id','event_time'])`.",
        "**Trap:** dedup without a watermark keeps every id forever; classic dropDuplicates needs event_time in the key to expire; a duplicate after expiry slips through."
      ]
    },

    // ------------------------------------------------------------------ Q216
    {
      id: "stream-static-join",
      lc: 216,
      title: "Enrich a stream by joining to a static dimension",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Stream-static (broadcast) join enrichment", transformation: "Streaming", functions: "readStream, join, broadcast, writeStream, outputMode, checkpointLocation" },
      description:
        "Enrich a stream of transaction events with attributes from a small, slowly-changing <code>products</code> dimension (name, category) by joining the streaming DataFrame to the <b>static</b> DataFrame on <code>product_id</code>. A stream-static join is stateless: each micro-batch joins against the current dimension, and a broadcast makes it a map-side lookup. Use <code>stream.join(broadcast(dim), 'product_id')</code> and write with <code>append</code> and a checkpoint.",
      examples: [
        {
          input: "stream: (t1, product_id=p1, amt=20). static products: (p1, 'Widget', 'Hardware'), (p2, 'Gadget', 'Electronics').",
          output: "Enriched: (t1, p1, 20, name='Widget', category='Hardware'). Each event gains the dimension attributes for its product_id.",
          reasoning: "The stream-static inner join looks up each event's product_id in the broadcast dimension and appends its columns. Because the dimension is broadcast, no shuffle of the stream is needed; the join runs entirely map-side per micro-batch."
        }
      ],
      approaches: [
        {
          name: "stream.join(broadcast(static_dim), key) — stateless map-side enrichment, append output",
          whenToUse: "Adding reference/dimension attributes (product, store, user profile) to a stream from a table small enough to broadcast.",
          logic:
            "**What it asks.** Attach dimension attributes to every streaming event by looking up a key in a small static table, cheaply and without accumulating state.\n\n" +
            "**Key Idea.** A stream-static join is <b>stateless</b>: for each micro-batch, Spark joins that batch's rows against the current snapshot of the static DataFrame — there is no watermark and no state store because the static side is fully known. Wrapping the dimension in `broadcast(...)` ships it to every executor so the join is a map-side hash lookup with <b>no shuffle of the stream</b>. An inner join drops events with no matching dimension row; a left join keeps them with nulls. Output mode is `append` (each enriched row is final).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Read the static dimension as a normal (non-streaming) DataFrame: `dim = spark.read.table('products')`.\n" +
            "2. Read the stream: `txns = spark.readStream...load()`.\n" +
            "3. Join, broadcasting the small dimension: `enriched = txns.join(broadcast(dim), 'product_id')`.\n" +
            "4. Use a left join if unmatched events must be kept: `.join(broadcast(dim), 'product_id', 'left')`.\n" +
            "5. Write append + checkpoint: `.writeStream.outputMode('append').option('checkpointLocation', ckpt).start()`.\n\n" +
            "**Why it works.** Because one side is static, the join needs no state — each batch is self-contained, so memory stays flat regardless of stream volume. Broadcasting replaces a shuffle join with a per-partition hash-table probe, which is ideal for a small dimension and keeps latency low. The static side is re-read per micro-batch, so dimension updates are picked up on the next batch (eventually), which suits slowly-changing reference data.\n\n" +
            "**Common Gotchas.**\n" +
            "- The static side must be a batch DataFrame; two streaming DataFrames make it a stateful stream-stream join (needs watermarks) — different problem.\n" +
            "- Broadcast only when the dimension truly fits in memory; a large static side should be a normal (shuffle) join or a `foreachBatch` lookup.\n" +
            "- Stream-static <b>outer</b> joins are restricted (the stream must be the outer side); a right join with the stream on the left is unsupported.\n" +
            "- Dimension refresh is per-batch snapshot; there is no guarantee an in-flight batch sees the very latest dimension edit.\n" +
            "- Still set a `checkpointLocation` for offset recovery even though the join itself is stateless.\n\n" +
            "**Interview mindset.** Say 'stream-static join is stateless — each micro-batch joins the current static snapshot; broadcast the small dimension for a map-side lookup, append output, and remember only the stream side can be the outer side of an outer join'.",
          rcs:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "# 1) Static (batch) dimension — small, slowly changing.\n" +
            "dim = spark.read.table('products')          # product_id, name, category\n" +
            "\n" +
            "# 2) The event stream.\n" +
            "txns = (spark.readStream\n" +
            "    .format('kafka').option('subscribe', 'txns').load()\n" +
            "    .selectExpr(\"from_json(CAST(value AS STRING),\n" +
            "                'txn_id STRING, product_id STRING, amt DOUBLE') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "# 3) Stateless enrichment: broadcast the dimension -> map-side lookup, no shuffle.\n" +
            "enriched = txns.join(broadcast(dim), 'product_id')   # 'left' to keep unmatched events\n" +
            "\n" +
            "# 4) Append output + checkpoint (join is stateless; checkpoint tracks offsets).\n" +
            "q = (enriched.writeStream\n" +
            "    .outputMode('append')\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/txn_enrich')\n" +
            "    .toTable('txns_enriched'))",
          plain:
            "from pyspark.sql.functions import broadcast\n" +
            "\n" +
            "dim = spark.read.table('products')\n" +
            "\n" +
            "txns = (spark.readStream\n" +
            "    .format('kafka').option('subscribe', 'txns').load()\n" +
            "    .selectExpr(\"from_json(CAST(value AS STRING),\n" +
            "                'txn_id STRING, product_id STRING, amt DOUBLE') AS e\")\n" +
            "    .select('e.*'))\n" +
            "\n" +
            "enriched = txns.join(broadcast(dim), 'product_id')\n" +
            "\n" +
            "q = (enriched.writeStream\n" +
            "    .outputMode('append')\n" +
            "    .format('delta')\n" +
            "    .option('checkpointLocation', '/ckpt/txn_enrich')\n" +
            "    .toTable('txns_enriched'))"
        }
      ],
      sparkInternals:
        "A stream-static join carries <b>no state store and no watermark</b>: each micro-batch's plan joins the batch against a freshly-read snapshot of the static side, so the operator is stateless and memory is independent of stream duration. With <code>broadcast(dim)</code> Catalyst plans a <b>BroadcastHashJoin</b> &mdash; the static side is collected to the driver, broadcast to every executor, and built into an in-memory hash table that each stream partition probes locally, so the <b>stream is never shuffled</b> and latency stays low. Without the broadcast hint, a large static side forces a SortMergeJoin with a shuffle of both sides per batch. The static DataFrame is re-resolved per micro-batch, so edits to the underlying table are picked up on subsequent batches (snapshot-per-batch semantics, not intra-batch). Only append output and stream-outer-side outer joins are supported, reflecting that the streaming side drives incremental execution while the static side is a lookup.",
      sparkSql:
        "-- No streaming DDL; the enrichment as a batch join (broadcast the small dim):\n" +
        "SELECT /*+ BROADCAST(p) */\n" +
        "       t.txn_id, t.product_id, t.amt, p.name, p.category\n" +
        "FROM txns t\n" +
        "JOIN products p ON t.product_id = p.product_id;\n" +
        "\n" +
        "-- In Structured Streaming: streamDF.join(broadcast(spark.table('products')), 'product_id')",
      recognizeRecall: [
        "**Spot it:** 'enrich the stream with dimension attributes', 'look up product/store/user info per event', 'join stream to a small reference table'.",
        "**Say it:** `stream.join(broadcast(static_dim), 'key')` — stateless map-side lookup, `append` output, checkpoint for offsets.",
        "**Trap:** static side must be a batch DF (two streams = stateful stream-stream join); only the stream can be the outer side; broadcast only if the dim fits in memory."
      ]
    },

    // ------------------------------------------------------------------ Q217
    {
      id: "incremental-cdc-merge",
      lc: 217,
      title: "Apply a CDC change feed (I/U/D) incrementally via MERGE",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Incremental CDC apply (insert/update/delete)", transformation: "Delta write", functions: "Window, row_number, DeltaTable, merge, whenMatchedDelete, whenMatchedUpdateAll, whenNotMatchedInsert", },
      description:
        "A change feed <code>cdc</code> (<code>id</code>, columns, <code>op</code> in {<code>I</code>, <code>U</code>, <code>D</code>}, <code>seq</code>) from Debezium/DMS must be applied incrementally to a Delta <code>target</code>: inserts and updates upsert the row, deletes remove it. Collapse the batch to the <b>latest</b> change per id with <code>row_number()</code> over <code>seq</code> desc, then run a three-branch Delta <code>MERGE</code> &mdash; <code>whenMatchedDelete(op = 'D')</code>, <code>whenMatchedUpdateAll(op &lt;&gt; 'D')</code>, <code>whenNotMatchedInsertAll(op &lt;&gt; 'D')</code>.",
      examples: [
        {
          input: "target has (7, city=NYC). cdc for id=7: (U, city=LA, seq=10), (U, city=SF, seq=11), (D, seq=12).",
          output: "Latest change for id=7 is the D at seq 12, so id=7 is DELETED. The intermediate LA/SF updates are collapsed away.",
          reasoning: "row_number() desc on seq keeps only the last event per id (the delete). The MERGE then applies that net change: op='D' matched-deletes the row; had the latest op been I/U it would upsert the row's values instead."
        }
      ],
      approaches: [
        {
          name: "dedupe to latest event per key with row_number(seq desc), then three-branch MERGE",
          whenToUse: "Applying a micro-batch of database change events where a key may appear several times and only the net-latest change should be applied.",
          logic:
            "**What it asks.** Fold a batch of ordered change events down to one net change per key, then apply it: delete when the latest op is a delete, upsert otherwise.\n\n" +
            "**Key Idea.** Two stages. (1) <b>Dedupe to latest</b>: `row_number()` over `partitionBy('id').orderBy(seq.desc())`, keep `rn == 1` — the newest event per id, so superseded intermediate changes disappear and each key reaches the merge once (a MERGE that matches multiple source rows to one target row errors). (2) <b>Three-branch MERGE</b> on `id`: `whenMatchedDelete(op == 'D')` removes rows whose latest change is a delete; `whenMatchedUpdateAll(op <> 'D')` updates existing keys; `whenNotMatchedInsertAll(op <> 'D')` inserts new keys. A stray delete for a key not in the target simply falls through (no-op).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Rank events per key by sequence/LSN: `w = Window.partitionBy('id').orderBy(col('seq').desc())`.\n" +
            "2. Keep the latest: `latest = cdc.withColumn('rn', row_number().over(w)).filter(col('rn') == 1).drop('rn')`.\n" +
            "3. Delta handle: `tgt = DeltaTable.forName(spark, 'target')`.\n" +
            "4. Merge on the key: `tgt.alias('t').merge(latest.alias('s'), 't.id = s.id')`.\n" +
            "5. `.whenMatchedDelete(condition=\"s.op = 'D'\")`.\n" +
            "6. `.whenMatchedUpdateAll(condition=\"s.op <> 'D'\")` and `.whenNotMatchedInsertAll(condition=\"s.op <> 'D'\")`.\n" +
            "7. `.execute()`.\n\n" +
            "**Why it works.** Ordering by a monotonic sequence (`seq`/LSN) makes 'latest' precise even with several events per key in one batch, and keeping only `rn == 1` guarantees a well-formed MERGE (one source row per key). The `op` flag routes each surviving key: a final delete removes the row, a final insert/update writes its values. Delivering the net change once is both correct and idempotent — re-applying the same collapsed batch yields the same target.\n\n" +
            "**Common Gotchas.**\n" +
            "- Dedupe to one row per key <b>before</b> MERGE, or Delta throws 'multiple source rows matched a target row'.\n" +
            "- Order by a real monotonic sequence/LSN, not wall-clock, so ordering is deterministic under equal timestamps.\n" +
            "- A latest `op = 'D'` for a key absent from the target is a no-op — the `op <> 'D'` conditions on the insert branch prevent inserting a delete.\n" +
            "- Use `row_number` (exactly one survivor), not `rank` (ties keep several).\n" +
            "- If the feed can reorder across batches, dedupe against the target's stored sequence too, not just within the batch.\n\n" +
            "**Interview mindset.** Say 'collapse the CDC batch to the latest event per key with a row_number window on the sequence, then a three-branch MERGE: matched-delete on D, updateAll/insertAll otherwise'. Stress the one-row-per-key requirement and the monotonic ordering column.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "# 1) Collapse the change feed to the LATEST event per key (by sequence/LSN).\n" +
            "w = Window.partitionBy('id').orderBy(col('seq').desc())\n" +
            "latest = (cdc\n" +
            "    .withColumn('rn', row_number().over(w))     # newest change = rn 1\n" +
            "    .filter(col('rn') == 1)                     # one row per id (MERGE precondition)\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "# 2) Three-branch upsert: delete on D, update/insert otherwise.\n" +
            "tgt = DeltaTable.forName(spark, 'target')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(latest.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedDelete(condition=\"s.op = 'D'\")            # latest change deletes the row\n" +
            "    .whenMatchedUpdateAll(condition=\"s.op <> 'D'\")        # existing key -> update\n" +
            "    .whenNotMatchedInsertAll(condition=\"s.op <> 'D'\")     # new key -> insert (skip stray D)\n" +
            "    .execute())",
          plain:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = Window.partitionBy('id').orderBy(col('seq').desc())\n" +
            "latest = (cdc\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "tgt = DeltaTable.forName(spark, 'target')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(latest.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedDelete(condition=\"s.op = 'D'\")\n" +
            "    .whenMatchedUpdateAll(condition=\"s.op <> 'D'\")\n" +
            "    .whenNotMatchedInsertAll(condition=\"s.op <> 'D'\")\n" +
            "    .execute())"
        }
      ],
      sparkInternals:
        "Two cost centers. The <b>dedupe</b> is a <b>wide</b> window: Spark hash-shuffles the batch by <code>id</code> and sorts each partition by <code>seq</code> desc to assign <code>row_number</code>; a hot key with thousands of events is the skew risk, though the CDC batch is usually small next to the target. The <b>MERGE</b> then runs Delta's two-phase apply: an inner join of <code>latest</code> against the target to locate matched <b>files</b> (another shuffle), then a <b>copy-on-write</b> rewrite of only the touched Parquet files &mdash; updated rows re-emitted, deleted rows dropped, unaffected rows copied through &mdash; with the old files tombstoned in the log and the whole change committed atomically as one version. Cost tracks files touched, so partitioning the target and adding the partition predicate to the ON clause prunes the rewrite. Because <code>latest</code> is one row per key the join is well-formed and small, and deduping first is what makes the MERGE both correct and cheap; re-running the same collapsed batch is idempotent since the net change is the same.",
      sparkSql:
        "MERGE INTO target t\n" +
        "USING (\n" +
        "  SELECT * FROM (\n" +
        "    SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY seq DESC) AS rn\n" +
        "    FROM cdc\n" +
        "  ) WHERE rn = 1\n" +
        ") s\n" +
        "  ON t.id = s.id\n" +
        "WHEN MATCHED AND s.op = 'D' THEN DELETE\n" +
        "WHEN MATCHED AND s.op <> 'D' THEN UPDATE SET *\n" +
        "WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT *;",
      recognizeRecall: [
        "**Spot it:** 'CDC change feed', 'I/U/D op flag', 'apply inserts/updates/deletes', 'Debezium/DMS incremental apply'.",
        "**Say it:** `row_number()` over `seq` desc keep rn=1, then a three-branch MERGE: matched-delete on 'D', updateAll/insertAll on op<>'D'.",
        "**Trap:** dedupe to one row per key first (else MERGE errors); order by a monotonic seq/LSN; a stray 'D' on a missing key is a no-op."
      ]
    },

    // ------------------------------------------------------------------ Q218
    {
      id: "small-file-compaction",
      lc: 218,
      title: "Compact many small output files before writing",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Small-file compaction (repartition/coalesce, OPTIMIZE)", transformation: "Delta write", functions: "repartition, coalesce, maxRecordsPerFile, OPTIMIZE, executeCompaction, DESCRIBE DETAIL" },
      description:
        "A job that writes with a high shuffle-partition count produces hundreds of tiny files per partition, hurting downstream read performance. Fix it at <b>write time</b> by controlling output parallelism (<code>repartition(n)</code> or <code>coalesce(n)</code>, plus <code>maxRecordsPerFile</code>), and fix an <b>existing</b> table with <code>OPTIMIZE</code> compaction. Know when <code>coalesce</code> (narrow, no shuffle) is safe versus when you need <code>repartition</code> (wide, even sizes).",
      examples: [
        {
          input: "Writing 2 GB across 800 shuffle partitions -> ~800 files of ~2.5 MB each.",
          output: "coalesce(8) or repartition(8) before write -> ~8 files of ~250 MB. Existing table: OPTIMIZE bin-packs the small files into ~1 GB files.",
          reasoning: "Fewer output partitions means fewer files. coalesce merges partitions without a shuffle (may be uneven); repartition shuffles to n even partitions. maxRecordsPerFile caps file size. OPTIMIZE fixes tables already written small."
        }
      ],
      approaches: [
        {
          name: "control write parallelism (coalesce/repartition + maxRecordsPerFile); OPTIMIZE for existing tables",
          whenToUse: "Output has too many tiny files — from high spark.sql.shuffle.partitions, many small append batches, or over-partitioning.",
          logic:
            "**What it asks.** Stop producing (or clean up) a swarm of tiny Parquet files so downstream reads open fewer, larger files.\n\n" +
            "**Key Idea.** File count at write time equals the number of output partitions (per table partition). Reduce it before writing: `coalesce(n)` merges partitions <b>without a shuffle</b> (narrow, cheap, but can leave uneven sizes and reduce upstream parallelism), while `repartition(n)` does a <b>full shuffle</b> to `n` evenly-sized partitions (costlier, but balanced). Cap per-file size with `.option('maxRecordsPerFile', N)`. For a table that is <b>already</b> fragmented, `OPTIMIZE t` bin-packs existing small files into ~1 GB files as a separate maintenance step.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Size the target: aim for ~128 MB-1 GB files; `n = ceil(total_bytes / target_file_bytes)`.\n" +
            "2. If reducing partitions and even sizes are not critical: `df.coalesce(n).write...` (no shuffle).\n" +
            "3. If data is skewed or you need balance: `df.repartition(n).write...` (shuffle to even partitions).\n" +
            "4. Cap file size: `.option('maxRecordsPerFile', 1000000)`.\n" +
            "5. Partitioned output: `df.repartition('date').write.partitionBy('date')...` so each date yields few files.\n" +
            "6. Existing table: `spark.sql('OPTIMIZE t')` (or `dt.optimize().executeCompaction()`).\n\n" +
            "**Why it works.** Each write task emits one file per output partition, so cutting partitions cuts files directly. `coalesce` only <b>merges adjacent</b> partitions on the same executors — no network shuffle — which is why it is cheap but can be lopsided; `repartition` hash/round-robin shuffles for even files at the cost of a full exchange. Large files amortize per-file open/metadata/footer overhead and give Parquet bigger row groups, so downstream scans launch fewer tasks and skip more efficiently.\n\n" +
            "**Common Gotchas.**\n" +
            "- `coalesce(n)` reduces <b>upstream</b> parallelism too (the stage feeding it runs with n tasks) — it can slow the whole job; use `repartition` when the compute stage needs more parallelism than the write.\n" +
            "- `coalesce` cannot increase partitions; `coalesce(1)` funnels everything through one task (OOM risk).\n" +
            "- `repartition` fixes skew and gives even files but always costs a shuffle.\n" +
            "- On partitioned tables, repartition by the partition column so each partition writes few files, not one file per (partition x task).\n" +
            "- `OPTIMIZE` is the right tool for <b>already-written</b> tables; don't rewrite historical data by re-reading and re-writing manually.\n\n" +
            "**Interview mindset.** Say 'files = output partitions; coalesce to cut them without a shuffle (uneven, reduces parallelism), repartition for even sizes at a shuffle cost, maxRecordsPerFile to cap size — and OPTIMIZE to compact a table already written small'.",
          rcs:
            "# --- WRITE-TIME: control output parallelism so few files are produced ---\n" +
            "# coalesce: narrow, NO shuffle (cheap, but sizes may be uneven; cuts upstream parallelism).\n" +
            "(df.coalesce(8)\n" +
            "    .write.format('delta').mode('overwrite')\n" +
            "    .option('maxRecordsPerFile', 1000000)      # cap file size\n" +
            "    .saveAsTable('events'))\n" +
            "\n" +
            "# repartition: WIDE shuffle to n EVEN partitions (use when skewed / need balance).\n" +
            "(df.repartition(8)\n" +
            "    .write.format('delta').mode('overwrite').saveAsTable('events'))\n" +
            "\n" +
            "# Partitioned output: repartition BY the partition col -> few files per partition.\n" +
            "(df.repartition('date')\n" +
            "    .write.format('delta').partitionBy('date').mode('overwrite').saveAsTable('events'))\n" +
            "\n" +
            "# --- EXISTING TABLE: bin-pack the small files that are already there ---\n" +
            "spark.sql('DESCRIBE DETAIL events').select('numFiles', 'sizeInBytes').show()\n" +
            "spark.sql('OPTIMIZE events')                   # compaction, one atomic commit",
          plain:
            "(df.coalesce(8)\n" +
            "    .write.format('delta').mode('overwrite')\n" +
            "    .option('maxRecordsPerFile', 1000000)\n" +
            "    .saveAsTable('events'))\n" +
            "\n" +
            "(df.repartition(8)\n" +
            "    .write.format('delta').mode('overwrite').saveAsTable('events'))\n" +
            "\n" +
            "(df.repartition('date')\n" +
            "    .write.format('delta').partitionBy('date').mode('overwrite').saveAsTable('events'))\n" +
            "\n" +
            "spark.sql('DESCRIBE DETAIL events').select('numFiles', 'sizeInBytes').show()\n" +
            "spark.sql('OPTIMIZE events')"
        }
      ],
      sparkInternals:
        "Each write task emits one file per output partition, so the small-files problem is really a partition-count problem. <code>coalesce(n)</code> is a <b>narrow</b> transformation: it merges existing partitions into <code>n</code> without moving data across the network, but because it also caps the <b>upstream</b> stage at <code>n</code> tasks it can throttle the compute that feeds the write. <code>repartition(n)</code> inserts a full <b>shuffle</b> (round-robin or hash exchange) that rebalances into <code>n</code> even partitions, decoupling write parallelism from compute parallelism at the cost of an exchange. <code>maxRecordsPerFile</code> makes each task roll a new file after N rows, bounding file size regardless of partition size. <code>OPTIMIZE</code> is the post-hoc fix: it reads the small files and rewrites bin-packed ~1 GB files, committing an atomic add/remove in the transaction log (copy-on-write) &mdash; the old files become tombstones reclaimed later by <code>VACUUM</code>. Fewer, larger files cut per-file footer/open overhead and let downstream scans launch fewer tasks with better row-group skipping.",
      sparkSql:
        "-- Existing table: compact small files\n" +
        "DESCRIBE DETAIL events;\n" +
        "OPTIMIZE events;\n" +
        "\n" +
        "-- Write-time control lives in the DataFrame API (coalesce/repartition/maxRecordsPerFile);\n" +
        "-- CTAS with a low shuffle-partition count is the closest SQL analogue:\n" +
        "SET spark.sql.shuffle.partitions = 8;\n" +
        "CREATE OR REPLACE TABLE events AS SELECT /*+ REPARTITION(8) */ * FROM staging;",
      recognizeRecall: [
        "**Spot it:** 'too many small files', 'hundreds of tiny outputs', 'slow reads from fragmentation', 'reduce the number of output files'.",
        "**Say it:** `coalesce(n)` (no shuffle, uneven) or `repartition(n)` (shuffle, even) + `maxRecordsPerFile` at write; `OPTIMIZE` to compact an existing table.",
        "**Trap:** coalesce also throttles upstream parallelism and can be lopsided; coalesce(1) risks OOM; repartition by the partition column for partitioned writes."
      ]
    },

    // ------------------------------------------------------------------ Q219
    {
      id: "idempotent-exactly-once",
      lc: 219,
      title: "Idempotent, exactly-once batch write safe to re-run",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Idempotent / exactly-once Delta write", transformation: "Delta write", functions: "merge, whenNotMatchedInsertAll, txnAppId, txnVersion, DataFrameWriter.option", },
      description:
        "A daily batch job can be retried after a failure, and you must guarantee it does not double-write rows if it runs twice for the same input partition. Make the write <b>idempotent</b> two ways: (1) a <code>MERGE</code> keyed by a business/idempotency key that only inserts not-matched rows, and (2) Delta's transactional <code>txnAppId</code> + <code>txnVersion</code> options, which cause Delta to <b>skip</b> a write it has already committed for that app/version. Both make a re-run a no-op.",
      examples: [
        {
          input: "Job for batch_date=2026-09-10 (txnAppId='daily_etl', txnVersion=20260910) inserts 1M rows, then the orchestrator retries it.",
          output: "First run inserts 1M rows and records (app='daily_etl', version=20260910) in the log. The retry with the same txnAppId/txnVersion is detected as already-committed and SKIPPED — still 1M rows, no duplicates.",
          reasoning: "Delta stores the highest committed txnVersion per txnAppId in the transaction log. A write whose (appId, version) is not greater than what is already recorded is ignored, so the retry is a no-op. The MERGE-by-key approach achieves the same by only inserting keys not already present."
        }
      ],
      approaches: [
        {
          name: "MERGE insert-if-absent by key, or txnAppId/txnVersion transactional idempotency",
          whenToUse: "Any batch/streaming write that an orchestrator may retry, where re-processing the same input must not create duplicates.",
          logic:
            "**What it asks.** Make a write safe to run more than once for the same input: a retry must not duplicate rows.\n\n" +
            "**Key Idea.** Two complementary techniques. (1) <b>MERGE by key</b>: `MERGE ... ON t.k = s.k WHEN NOT MATCHED THEN INSERT *` inserts only rows whose key is absent, so re-running with the same source inserts nothing the second time — naturally idempotent. (2) <b>Transactional txn options</b>: `.option('txnAppId', 'daily_etl').option('txnVersion', 20260910)` stamps the write; Delta records the highest committed `txnVersion` per `txnAppId` in the log and <b>silently skips</b> any write whose version it has already seen — so a literal re-execution of the same append is a no-op, even a plain `append` (no key needed). Use MERGE when dedup is by content key; use txn options for whole-batch replay safety.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Choose the guarantee: content-level dedup (MERGE) or batch-level replay skip (txn options).\n" +
            "2. MERGE form: `tgt.alias('t').merge(src.alias('s'), 't.k = s.k').whenNotMatchedInsertAll().execute()` (add `whenMatchedUpdateAll` if updates are wanted too).\n" +
            "3. Txn form: derive a deterministic version from the input (e.g. the batch date/offset), then `df.write.format('delta').option('txnAppId', app).option('txnVersion', v).mode('append').saveAsTable(t)`.\n" +
            "4. In streaming `foreachBatch`, use the provided `batchId` as `txnVersion` so each micro-batch commits at most once.\n" +
            "5. Verify: re-run the job; row count is unchanged.\n\n" +
            "**Why it works.** MERGE's not-matched-insert is a set operation: inserting only absent keys is idempotent by construction because the second run finds every key already present. The txn options give Delta a durable dedup token — it compares the incoming `(appId, version)` against the max committed version for that app in the transaction log and refuses to re-commit a version it already has, so retries collapse to no-ops atomically. Both push the exactly-once guarantee into the commit itself rather than relying on the orchestrator not to retry.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `txnVersion` must be <b>deterministic per input</b> (batch date, Kafka offset, micro-batch id) — a random/increasing-by-wallclock version defeats the skip.\n" +
            "- Delta skips a version only if it is <b>not greater</b> than the last committed one for that appId; monotonic, input-derived versions are required.\n" +
            "- MERGE-insert-only still <b>rewrites files</b> that gain rows (copy-on-write); it is idempotent but not free.\n" +
            "- A plain `append` with `mode('append')` and no key and no txn option is <b>not</b> idempotent — a retry doubles the data.\n" +
            "- In `foreachBatch`, if you write to multiple tables, stamp each with the same `batchId` version so a retried batch skips them all.\n\n" +
            "**Interview mindset.** Say 'push exactly-once into the write: MERGE insert-if-absent by key, or txnAppId/txnVersion so Delta skips an already-committed version — with a deterministic, input-derived version'. Mention foreachBatch's batchId as the natural version.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "# --- Option A: MERGE insert-if-absent (idempotent by business key) ---\n" +
            "tgt = DeltaTable.forName(spark, 'facts')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(batch.alias('s'), 't.event_key = s.event_key')  # dedup key\n" +
            "    .whenNotMatchedInsertAll()                             # insert only new keys\n" +
            "    .execute())                                            # re-run inserts nothing new\n" +
            "\n" +
            "# --- Option B: transactional txnAppId/txnVersion (Delta skips a re-committed version) ---\n" +
            "app = 'daily_etl'\n" +
            "version = 20260910                       # DETERMINISTIC per input (e.g. batch date)\n" +
            "(batch.write.format('delta')\n" +
            "    .option('txnAppId', app)             # who is writing\n" +
            "    .option('txnVersion', version)       # which input version\n" +
            "    .mode('append')\n" +
            "    .saveAsTable('facts'))               # retry with same (app, version) -> SKIPPED\n" +
            "\n" +
            "# In streaming foreachBatch, use batchId as the version:\n" +
            "# def upsert(df, batchId):\n" +
            "#     df.write.format('delta').option('txnAppId', 'stream_etl') \\\n" +
            "#       .option('txnVersion', batchId).mode('append').saveAsTable('facts')\n" +
            "# stream.writeStream.foreachBatch(upsert).option('checkpointLocation', ck).start()",
          plain:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "tgt = DeltaTable.forName(spark, 'facts')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(batch.alias('s'), 't.event_key = s.event_key')\n" +
            "    .whenNotMatchedInsertAll()\n" +
            "    .execute())\n" +
            "\n" +
            "app = 'daily_etl'\n" +
            "version = 20260910\n" +
            "(batch.write.format('delta')\n" +
            "    .option('txnAppId', app)\n" +
            "    .option('txnVersion', version)\n" +
            "    .mode('append')\n" +
            "    .saveAsTable('facts'))"
        }
      ],
      sparkInternals:
        "Delta commits are atomic log appends, and both idempotency techniques piggyback on the log. With <code>txnAppId</code>/<code>txnVersion</code>, Delta writes a <code>txn</code> action recording <code>(appId, version)</code>; on the next write it reads the highest committed version for that <code>appId</code> from the log and, if the incoming version is not greater, <b>aborts the commit without writing data</b> &mdash; a genuine no-op, so a retried job neither duplicates rows nor rewrites files. The MERGE approach instead pays the normal two-phase MERGE cost (join to find matched files, then <b>copy-on-write</b> rewrite of touched files), but because the not-matched-insert only adds absent keys, a second run finds no not-matched rows and commits nothing. The key contrast: a plain <code>append</code> has no dedup token in the log, so a retry appends a second, independent set of files. Deterministic, input-derived versions (batch date, Kafka offset, or a streaming <code>batchId</code>) are what make the log's monotonic-version check a reliable exactly-once guard.",
      sparkSql:
        "-- Idempotent MERGE (insert only absent keys)\n" +
        "MERGE INTO facts t\n" +
        "USING batch s ON t.event_key = s.event_key\n" +
        "WHEN NOT MATCHED THEN INSERT *;\n" +
        "\n" +
        "-- txnAppId/txnVersion is a writer option, not SQL DML; set via the DataFrame writer:\n" +
        "-- df.write.format('delta').option('txnAppId','daily_etl').option('txnVersion',20260910)\n" +
        "--   .mode('append').saveAsTable('facts')  -- a re-committed version is skipped",
      recognizeRecall: [
        "**Spot it:** 'safe to re-run', 'retry must not duplicate', 'exactly-once write', 'idempotent ingestion', 'orchestrator retries the job'.",
        "**Say it:** MERGE insert-if-absent by key, or `txnAppId`+`txnVersion` so Delta skips an already-committed version (use batchId in foreachBatch).",
        "**Trap:** txnVersion must be deterministic/input-derived and monotonic; plain append is not idempotent; MERGE-insert still rewrites touched files."
      ]
    },

    // ------------------------------------------------------------------ Q220
    {
      id: "merge-schema-evolution",
      lc: 220,
      title: "Handle an added column with schema evolution",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Schema evolution on append / MERGE (mergeSchema, autoMerge)", transformation: "Delta write", functions: "option('mergeSchema'), autoMerge.enabled, whenMatchedUpdateAll, whenNotMatchedInsertAll, ALTER TABLE ADD COLUMN" },
      description:
        "An upstream producer added a new column (<code>loyalty_tier</code>) to the incoming data, but the Delta target does not have it yet. Let Delta <b>evolve the schema</b> automatically: on append use <code>.option('mergeSchema', 'true')</code>; for a <code>MERGE</code> with <code>updateAll</code>/<code>insertAll</code>, enable <code>spark.databricks.delta.schema.autoMerge.enabled = true</code> so the new column is added to the table and populated (older rows get null). Contrast with a manual <code>ALTER TABLE ADD COLUMN</code>.",
      examples: [
        {
          input: "target columns: (id, name). Incoming batch adds a column: (id, name, loyalty_tier). Append/MERGE with schema evolution enabled.",
          output: "Target evolves to (id, name, loyalty_tier); new/updated rows carry the tier, pre-existing rows show loyalty_tier = null.",
          reasoning: "With mergeSchema/autoMerge, Delta unions the incoming schema into the table schema, adding loyalty_tier as a nullable column. Existing rows are not rewritten to backfill, so they read as null for the new column until updated."
        }
      ],
      approaches: [
        {
          name: "mergeSchema on append / autoMerge for MERGE; ALTER TABLE ADD COLUMN as the explicit alternative",
          whenToUse: "Upstream schema drifts by adding columns and you want the pipeline to absorb the new field without failing or a manual DDL step each time.",
          logic:
            "**What it asks.** Absorb a newly-added source column into the Delta table automatically, without the write failing on a schema mismatch and without hand-editing the schema every time.\n\n" +
            "**Key Idea.** By default Delta <b>rejects</b> a write whose schema does not match the table (schema enforcement). To allow additive evolution: on a plain <b>append</b>, set `.option('mergeSchema', 'true')` — Delta unions the new columns into the table schema. For a <b>MERGE</b> using `updateAll`/`insertAll`, set the session flag `spark.databricks.delta.schema.autoMerge.enabled = true` so the `*` expands to include the new column and the schema evolves. New columns are added as <b>nullable</b>; existing rows are not backfilled (they read null). The explicit alternative is `ALTER TABLE t ADD COLUMN loyalty_tier STRING` before the write.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide the policy: auto-evolve (drift-tolerant) vs strict enforcement (fail on unexpected columns).\n" +
            "2. Append form: `df.write.format('delta').option('mergeSchema', 'true').mode('append').saveAsTable('customers')`.\n" +
            "3. MERGE form: `spark.conf.set('spark.databricks.delta.schema.autoMerge.enabled', 'true')` then the usual `merge(...).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()`.\n" +
            "4. Or evolve explicitly first: `spark.sql('ALTER TABLE customers ADD COLUMN loyalty_tier STRING')`, then a normal write.\n" +
            "5. Confirm: `DESCRIBE customers` shows the new nullable column; old rows read null.\n\n" +
            "**Why it works.** Delta's schema lives in the transaction log, so evolving it is a cheap metadata commit — the union of old and new columns becomes the new table schema, and because Parquet is columnar, existing files simply lack the new column and are read as null for it (no rewrite of history). `mergeSchema`/`autoMerge` automate exactly this union at write time, while `ALTER TABLE ADD COLUMN` performs the same metadata change explicitly and up front.\n\n" +
            "**Common Gotchas.**\n" +
            "- `mergeSchema` handles <b>additive</b> changes (new columns, some safe widenings); it does <b>not</b> silently drop columns or narrow/incompatibly change a type — those still error (or need `overwriteSchema`).\n" +
            "- For MERGE you need the session flag `autoMerge.enabled`; `mergeSchema` as a writer option does not apply to MERGE.\n" +
            "- New columns are nullable and existing rows are <b>not</b> backfilled — plan a separate backfill if you need non-null history.\n" +
            "- Auto-evolution weakens schema enforcement; keep it off where you want a drifting producer to fail loudly instead.\n" +
            "- A type <b>change</b> (int -> string) is not additive evolution; that requires an explicit rewrite/overwriteSchema.\n\n" +
            "**Interview mindset.** Say 'Delta enforces schema by default; allow additive drift with mergeSchema on append or autoMerge.enabled for MERGE — new columns are nullable, history is not backfilled, and ALTER TABLE ADD COLUMN is the explicit equivalent'.",
          rcs:
            "# --- APPEND with an added column: mergeSchema unions it into the table ---\n" +
            "(incoming                                     # has a new 'loyalty_tier' column\n" +
            "    .write.format('delta')\n" +
            "    .option('mergeSchema', 'true')            # allow additive schema evolution\n" +
            "    .mode('append')\n" +
            "    .saveAsTable('customers'))                # old rows read loyalty_tier = null\n" +
            "\n" +
            "# --- MERGE with an added column: enable autoMerge so updateAll/insertAll pick it up ---\n" +
            "spark.conf.set('spark.databricks.delta.schema.autoMerge.enabled', 'true')\n" +
            "\n" +
            "from delta.tables import DeltaTable\n" +
            "tgt = DeltaTable.forName(spark, 'customers')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(incoming.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedUpdateAll()                    # '*' expands to include the new column\n" +
            "    .whenNotMatchedInsertAll()\n" +
            "    .execute())\n" +
            "\n" +
            "# --- Explicit alternative: evolve the schema up front, then write normally ---\n" +
            "# spark.sql('ALTER TABLE customers ADD COLUMN loyalty_tier STRING')",
          plain:
            "(incoming\n" +
            "    .write.format('delta')\n" +
            "    .option('mergeSchema', 'true')\n" +
            "    .mode('append')\n" +
            "    .saveAsTable('customers'))\n" +
            "\n" +
            "spark.conf.set('spark.databricks.delta.schema.autoMerge.enabled', 'true')\n" +
            "\n" +
            "from delta.tables import DeltaTable\n" +
            "tgt = DeltaTable.forName(spark, 'customers')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(incoming.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedUpdateAll()\n" +
            "    .whenNotMatchedInsertAll()\n" +
            "    .execute())",
        }
      ],
      sparkInternals:
        "A Delta table's schema is stored in the <code>metaData</code> action of the transaction log, so evolving it is a <b>metadata commit</b>, not a data rewrite. With <code>mergeSchema</code> (append) or <code>schema.autoMerge.enabled</code> (MERGE), the writer computes the <b>union</b> of the table schema and the incoming schema, appends new columns as nullable, and commits the new schema alongside the data files in one transaction. Existing Parquet files are untouched: because Parquet is columnar and Delta resolves columns by name, a file that predates the new column is simply read with <code>null</code> for it &mdash; no backfill, no history rewrite. Schema <b>enforcement</b> (the default) is what these flags relax: normally a mismatched write is rejected at analysis time before any files are written. Only additive changes (and a few safe type widenings) go through this path; an incompatible type change requires <code>overwriteSchema</code> and an actual rewrite. <code>ALTER TABLE ADD COLUMN</code> performs the identical metadata-only commit explicitly.",
      sparkSql:
        "-- Explicit evolution\n" +
        "ALTER TABLE customers ADD COLUMN loyalty_tier STRING;\n" +
        "\n" +
        "-- Auto-evolution for MERGE (session flag), then a normal MERGE with UPDATE/INSERT *\n" +
        "SET spark.databricks.delta.schema.autoMerge.enabled = true;\n" +
        "MERGE INTO customers t\n" +
        "USING incoming s ON t.id = s.id\n" +
        "WHEN MATCHED THEN UPDATE SET *\n" +
        "WHEN NOT MATCHED THEN INSERT *;\n" +
        "\n" +
        "-- Append with evolution is a writer option: .option('mergeSchema','true')",
      recognizeRecall: [
        "**Spot it:** 'upstream added a column', 'schema changed', 'write fails on new field', 'evolve the table schema', 'absorb schema drift'.",
        "**Say it:** `.option('mergeSchema','true')` on append; `spark.databricks.delta.schema.autoMerge.enabled=true` for MERGE updateAll/insertAll; or `ALTER TABLE ADD COLUMN`.",
        "**Trap:** only additive changes (new cols) — type changes still error; new cols are nullable and history is not backfilled; mergeSchema option doesn't apply to MERGE."
      ]
    },

    // ------------------------------------------------------------------ Q221
    {
      id: "foreachbatch-upsert",
      lc: 221,
      title: "Stream into Delta with foreachBatch + MERGE upsert",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Streaming upsert sink via foreachBatch + MERGE", transformation: "Streaming", functions: "writeStream, foreachBatch, DeltaTable.merge, whenMatchedUpdateAll, whenNotMatchedInsertAll, checkpointLocation" },
      description:
        "You need a streaming sink that <b>upserts</b> each micro-batch into a Delta table (there is no built-in MERGE sink). Use <code>writeStream.foreachBatch(fn)</code>: the function receives the batch DataFrame and its <code>batchId</code>, dedupes to one row per key, and runs a Delta <code>MERGE</code> (<code>whenMatchedUpdateAll</code> / <code>whenNotMatchedInsertAll</code>). Make it re-run-safe (the same <code>batchId</code> may be reprocessed after a failure), and set a <code>checkpointLocation</code>.",
      examples: [
        {
          input: "Micro-batch b: (k1, v=9, ts=2), (k1, v=7, ts=1), (k2, v=3). target has (k1, v=5).",
          output: "Dedupe to latest per key -> (k1, v=9), (k2, v=3). MERGE: k1 updated to 9, k2 inserted. If batch b is reprocessed, the same MERGE yields the same state (idempotent).",
          reasoning: "foreachBatch turns each micro-batch into a normal DataFrame so batch-only operations like MERGE are usable. Deduping to one row per key satisfies MERGE's single-match rule; because MERGE upserts by key it is idempotent under reprocessing of the same batch."
        }
      ],
      approaches: [
        {
          name: "writeStream.foreachBatch(fn) that dedupes then runs DeltaTable.merge, checkpointed",
          whenToUse: "A streaming pipeline whose sink must upsert (update existing keys, insert new) into Delta — MERGE, which has no native streaming sink.",
          logic:
            "**What it asks.** Continuously upsert a stream into a keyed Delta table, using MERGE (which is a batch operation) once per micro-batch, safely across retries.\n\n" +
            "**Key Idea.** `foreachBatch(fn)` is the escape hatch that hands you each micro-batch as an <b>ordinary batch DataFrame</b> plus a monotonic `batchId`, so you can run any batch API — including Delta `MERGE` — that the built-in streaming sinks do not offer. Inside `fn`: dedupe the batch to one row per key (MERGE requires a single match), then `DeltaTable.forName(...).merge(batch, key).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()`. Because MERGE-by-key is idempotent, reprocessing the same `batchId` after a failure re-derives the same target — the sink is exactly-once by construction. A `checkpointLocation` tracks source offsets so recovery is correct.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `def upsert_batch(micro_df, batch_id):`.\n" +
            "2. Inside, dedupe to latest per key: `row_number()` over the key ordered by an event/sequence column desc, keep `rn == 1`.\n" +
            "3. Get the Delta handle and MERGE: `tgt.alias('t').merge(latest.alias('s'), 't.k = s.k').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()`.\n" +
            "4. Wire it: `stream.writeStream.foreachBatch(upsert_batch).option('checkpointLocation', ckpt).trigger(availableNow=True).start()`.\n" +
            "5. (Optional) stamp the write with `batchId` as `txnVersion` if you fan out to several tables.\n\n" +
            "**Why it works.** Structured Streaming has no MERGE sink, but every micro-batch is internally a finite DataFrame; `foreachBatch` exposes that, letting the full batch MERGE machinery run per trigger. Deduping first satisfies MERGE's one-source-row-per-target rule. The exactly-once story rests on two things: source offsets are checkpointed (so batches are not lost or double-consumed), and MERGE-by-key is idempotent (so a batch re-executed after a mid-write crash converges to the same result rather than duplicating).\n\n" +
            "**Common Gotchas.**\n" +
            "- Dedupe to one row per key <b>inside</b> `fn`, or the MERGE throws 'multiple source rows matched'.\n" +
            "- `foreachBatch` gives <b>at-least-once</b> delivery of batches; rely on the idempotent MERGE (or `txnVersion = batchId`) for exactly-once, since a batch can be retried.\n" +
            "- The function runs on the driver; the MERGE itself is distributed, but avoid collecting the batch to the driver.\n" +
            "- Set `checkpointLocation`; without it offsets are not tracked and recovery is broken.\n" +
            "- Output mode is irrelevant with `foreachBatch` (you control the write) — don't also set an incompatible `outputMode`.\n\n" +
            "**Interview mindset.** Say 'no native MERGE sink, so foreachBatch hands each micro-batch to batch code: dedupe to one row per key, then DeltaTable.merge updateAll/insertAll; checkpoint offsets and lean on idempotent MERGE (or txnVersion=batchId) for exactly-once under retries'.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "# The per-micro-batch upsert: receives a BATCH DataFrame and a monotonic batchId.\n" +
            "def upsert_batch(micro_df, batch_id):\n" +
            "    # 1) Dedupe to ONE row per key (MERGE requires a single match).\n" +
            "    w = Window.partitionBy('k').orderBy(col('ts').desc())\n" +
            "    latest = (micro_df\n" +
            "        .withColumn('rn', row_number().over(w))\n" +
            "        .filter(col('rn') == 1)\n" +
            "        .drop('rn'))\n" +
            "    # 2) MERGE upsert into Delta (idempotent by key -> safe to reprocess).\n" +
            "    tgt = DeltaTable.forName(spark, 'state_table')\n" +
            "    (tgt.alias('t')\n" +
            "        .merge(latest.alias('s'), 't.k = s.k')\n" +
            "        .whenMatchedUpdateAll()\n" +
            "        .whenNotMatchedInsertAll()\n" +
            "        .execute())\n" +
            "\n" +
            "# Wire the sink: foreachBatch runs batch code per trigger; checkpoint tracks offsets.\n" +
            "q = (stream.writeStream\n" +
            "    .foreachBatch(upsert_batch)\n" +
            "    .option('checkpointLocation', '/ckpt/state_upsert')\n" +
            "    .trigger(availableNow=True)                 # or processingTime='1 minute'\n" +
            "    .start())",
          plain:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "def upsert_batch(micro_df, batch_id):\n" +
            "    w = Window.partitionBy('k').orderBy(col('ts').desc())\n" +
            "    latest = (micro_df\n" +
            "        .withColumn('rn', row_number().over(w))\n" +
            "        .filter(col('rn') == 1)\n" +
            "        .drop('rn'))\n" +
            "    tgt = DeltaTable.forName(spark, 'state_table')\n" +
            "    (tgt.alias('t')\n" +
            "        .merge(latest.alias('s'), 't.k = s.k')\n" +
            "        .whenMatchedUpdateAll()\n" +
            "        .whenNotMatchedInsertAll()\n" +
            "        .execute())\n" +
            "\n" +
            "q = (stream.writeStream\n" +
            "    .foreachBatch(upsert_batch)\n" +
            "    .option('checkpointLocation', '/ckpt/state_upsert')\n" +
            "    .trigger(availableNow=True)\n" +
            "    .start())"
        }
      ],
      sparkInternals:
        "<code>foreachBatch</code> materializes each micro-batch as a finite DataFrame and invokes your function <b>on the driver</b> with that DataFrame and a monotonically increasing <code>batchId</code>; the operations you call inside still run <b>distributed</b> across executors. The MERGE within is Delta's usual two-phase apply &mdash; a shuffle join to locate matched files, then a <b>copy-on-write</b> rewrite of touched Parquet files committed atomically as one version &mdash; and the dedup window is a wide shuffle by key. Streaming's <b>checkpoint</b> records source offsets per batch; on failure Structured Streaming re-invokes <code>foreachBatch</code> for the incomplete <code>batchId</code>, giving <b>at-least-once</b> execution of the function, which is why the write itself must be idempotent (MERGE-by-key, or <code>txnVersion = batchId</code> so Delta skips an already-committed batch). There is no state store here (the aggregation state lives in the Delta table, not the stream), so memory stays flat; the cost per trigger is one MERGE proportional to the files the batch touches.",
      sparkSql:
        "-- No SQL sink for streaming MERGE; foreachBatch runs this MERGE per micro-batch:\n" +
        "MERGE INTO state_table t\n" +
        "USING (\n" +
        "  SELECT * FROM (\n" +
        "    SELECT *, ROW_NUMBER() OVER (PARTITION BY k ORDER BY ts DESC) AS rn\n" +
        "    FROM micro_batch\n" +
        "  ) WHERE rn = 1\n" +
        ") s\n" +
        "  ON t.k = s.k\n" +
        "WHEN MATCHED THEN UPDATE SET *\n" +
        "WHEN NOT MATCHED THEN INSERT *;",
      recognizeRecall: [
        "**Spot it:** 'upsert a stream into Delta', 'MERGE per micro-batch', 'no streaming MERGE sink', 'apply each batch to a keyed table'.",
        "**Say it:** `writeStream.foreachBatch(fn)`; inside fn dedupe to one row per key then `DeltaTable.merge(...).whenMatchedUpdateAll().whenNotMatchedInsertAll()`; checkpoint.",
        "**Trap:** dedupe to one row per key inside fn; foreachBatch is at-least-once so make the write idempotent (MERGE-by-key or txnVersion=batchId); set checkpointLocation."
      ]
    },

    // ------------------------------------------------------------------ Q222
    {
      id: "vacuum-retention",
      lc: 222,
      title: "VACUUM old files safely within a retention window",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "VACUUM retention vs time-travel tradeoff", transformation: "Delta write", functions: "VACUUM, RETAIN HOURS, DESCRIBE HISTORY, deletedFileRetentionDuration, retentionDurationCheck", },
      description:
        "After many MERGE/OPTIMIZE operations, a Delta table's storage is bloated with <b>tombstoned</b> (logically deleted) data files that time travel still references. Reclaim space with <code>VACUUM t RETAIN 168 HOURS</code>, which physically deletes files no longer referenced by the current version and older than the retention window. Understand the tradeoff: the default 7-day retention protects recent time-travel/rollback, and you <b>cannot</b> time-travel to a version whose files have been vacuumed.",
      examples: [
        {
          input: "orders has 5 GB of live data + 20 GB of tombstoned files from past MERGE/OPTIMIZE rewrites. VACUUM orders RETAIN 168 HOURS.",
          output: "Files unreferenced by the current version AND older than 168 hours are physically deleted, reclaiming most of the 20 GB. Versions whose files were removed can no longer be read via time travel.",
          reasoning: "MERGE/OPTIMIZE tombstone old files but leave them on disk so time travel works; VACUUM removes those past the retention window. Keeping 168 hours preserves 7 days of time travel; anything older loses its data files and becomes unreadable."
        }
      ],
      approaches: [
        {
          name: "VACUUM with an explicit RETAIN window sized to your time-travel/rollback needs",
          whenToUse: "Reclaiming storage from tombstoned files on a churny Delta table, while preserving enough history for audits/rollback.",
          logic:
            "**What it asks.** Physically delete the stale data files that MERGE/OPTIMIZE/DELETE left behind, without breaking the time-travel/rollback window you rely on.\n\n" +
            "**Key Idea.** Delta operations are copy-on-write: they write new files and <b>tombstone</b> old ones in the log but leave them on disk so past versions remain readable. Storage therefore grows until you `VACUUM`. `VACUUM t RETAIN 168 HOURS` physically deletes files that are (a) <b>not referenced by the current version</b> and (b) <b>older than the retention window</b>. The retention window is the crux of the tradeoff: it is the horizon of time travel you keep. The default is 168 hours (7 days), and Delta <b>refuses</b> a retention below that unless you disable the safety check — because a shorter window can delete files an in-flight reader or a recent version still needs.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide how far back you must time-travel/rollback (audit, recovery SLA); size the window to that.\n" +
            "2. Dry run to preview: `VACUUM orders RETAIN 168 HOURS DRY RUN` lists files that would be deleted.\n" +
            "3. Vacuum: `spark.sql('VACUUM orders RETAIN 168 HOURS')` (or `DeltaTable.forName(...).vacuum(168)`).\n" +
            "4. To go below the default (dangerous): set `spark.databricks.delta.retentionDurationCheck.enabled = false` first.\n" +
            "5. Tune the default per table via `TBLPROPERTIES ('delta.deletedFileRetentionDuration' = 'interval 7 days')`.\n\n" +
            "**Why it works.** VACUUM only removes files the current snapshot does not reference and that have been tombstoned longer than the window, so the live table is never harmed. The window exists to protect (1) time travel/rollback to recent versions and (2) long-running readers/writers that may still hold references to files being retired; setting it too low risks deleting a file a concurrent query is mid-scan on. Keeping ~7 days is the common balance between storage cost and a usable recovery/audit horizon.\n\n" +
            "**Common Gotchas.**\n" +
            "- After VACUUM you <b>cannot</b> time-travel to a version whose files were deleted — 'FileNotFound' on that version.\n" +
            "- Delta blocks `RETAIN` below the configured minimum (default 7 days); overriding via `retentionDurationCheck=false` risks corrupting concurrent readers — avoid unless certain no reader/writer is active.\n" +
            "- VACUUM does <b>not</b> compact files or improve query speed — that is `OPTIMIZE`; VACUUM only reclaims space.\n" +
            "- Always `DRY RUN` first to see what will be deleted.\n" +
            "- Very frequent tiny VACUUMs are wasteful; schedule it (e.g. daily/weekly) rather than after every write.\n\n" +
            "**Interview mindset.** Say 'copy-on-write leaves tombstoned files on disk so time travel works; VACUUM RETAIN N HOURS reclaims those older than the window, which is exactly your time-travel horizon — the default 7 days is a safety floor, and you cannot time-travel past what you vacuum'.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "# 0) Preview what would be deleted BEFORE touching anything.\n" +
            "spark.sql('VACUUM orders RETAIN 168 HOURS DRY RUN').show(truncate=False)\n" +
            "\n" +
            "# 1) Reclaim tombstoned files older than the 7-day (168h) retention window.\n" +
            "#    Files still referenced by the current version are never deleted.\n" +
            "spark.sql('VACUUM orders RETAIN 168 HOURS')\n" +
            "\n" +
            "# Python API equivalent (hours):\n" +
            "dt = DeltaTable.forName(spark, 'orders')\n" +
            "dt.vacuum(168)\n" +
            "\n" +
            "# --- Going BELOW the default is dangerous: it can break time travel and\n" +
            "#     concurrent readers. Only with the safety check disabled, and knowingly. ---\n" +
            "# spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')\n" +
            "# spark.sql('VACUUM orders RETAIN 24 HOURS')   # only 1 day of time travel survives\n" +
            "\n" +
            "# Tune the per-table default retention:\n" +
            "# ALTER TABLE orders SET TBLPROPERTIES\n" +
            "#   ('delta.deletedFileRetentionDuration' = 'interval 7 days')",
          plain:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "spark.sql('VACUUM orders RETAIN 168 HOURS DRY RUN').show(truncate=False)\n" +
            "\n" +
            "spark.sql('VACUUM orders RETAIN 168 HOURS')\n" +
            "\n" +
            "dt = DeltaTable.forName(spark, 'orders')\n" +
            "dt.vacuum(168)"
        }
      ],
      sparkInternals:
        "Every copy-on-write operation (MERGE, UPDATE, DELETE, OPTIMIZE) commits <code>remove</code> actions in the log that <b>tombstone</b> old files logically while leaving the bytes on storage, so time travel can still read them &mdash; which is why storage grows without bound until vacuumed. <code>VACUUM</code> lists the storage directory, cross-references the log to find files <b>not referenced by the current snapshot</b>, and physically deletes those whose tombstone age exceeds the <code>RETAIN</code> window; it is a metadata-driven <b>delete</b>, doing no data rewrite and improving no query speed (that is <code>OPTIMIZE</code>'s job). The retention window doubles as the time-travel horizon: once a version's files are deleted, replaying the log to that version finds missing files and fails. Delta enforces a minimum retention (default 7 days via <code>delta.deletedFileRetentionDuration</code>) because a long-running reader or a not-yet-committed writer may still reference files within that window; the <code>retentionDurationCheck</code> guard prevents a too-aggressive VACUUM from deleting files out from under concurrent operations.",
      sparkSql:
        "-- Preview\n" +
        "VACUUM orders RETAIN 168 HOURS DRY RUN;\n" +
        "\n" +
        "-- Reclaim files older than the retention window (files in the current version are kept)\n" +
        "VACUUM orders RETAIN 168 HOURS;\n" +
        "\n" +
        "-- Inspect history to understand what will/won't remain time-travelable\n" +
        "DESCRIBE HISTORY orders;\n" +
        "\n" +
        "-- Tune the per-table default retention\n" +
        "ALTER TABLE orders SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = 'interval 7 days');\n" +
        "\n" +
        "-- Going below the floor requires disabling the safety check (dangerous)\n" +
        "SET spark.databricks.delta.retentionDurationCheck.enabled = false;\n" +
        "VACUUM orders RETAIN 24 HOURS;",
      recognizeRecall: [
        "**Spot it:** 'reclaim storage', 'remove old/tombstoned files', 'table storage bloated after merges', 'clean up Delta files', 'retention window'.",
        "**Say it:** `VACUUM t RETAIN 168 HOURS` (DRY RUN first) deletes unreferenced files older than the window; the window = your time-travel horizon; default floor is 7 days.",
        "**Trap:** can't time-travel past vacuumed files; RETAIN below the default needs retentionDurationCheck=false and risks concurrent readers; VACUUM reclaims space, OPTIMIZE speeds queries."
      ]
    }

  ]);
})();
