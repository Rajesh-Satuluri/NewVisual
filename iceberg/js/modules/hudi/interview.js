/* ============================================================
   Apache Hudi — Interview Mode
   Senior-level Hudi interview questions, reveal-on-click, level
   filter, ShopKart context. Registers in the hudi bucket and
   exposes TV.HudiInterview for the Study Deck. Uses brand tokens
   (teal→emerald) via var(--brand).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('hint-styles')) return;
    const s = document.createElement('style');
    s.id = 'hint-styles';
    s.textContent = `
.hint-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.hint-header { padding:16px 24px; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.hint-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.hint-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.hint-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.hint-btn { padding:6px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default); background:var(--bg-3); color:var(--text-secondary); font-size:12px; cursor:pointer; }
.hint-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.hint-btn.active { background:var(--brand-glow); border-color:var(--brand); color:var(--brand); }
.hint-progress-text { font-size:12px; color:var(--text-muted); }
.hint-body { flex:1; overflow-y:auto; padding:20px 24px; }
.hint-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.hint-card { border:1px solid var(--border-default); border-radius:var(--radius); background:var(--bg-2); overflow:hidden; transition:border-color .15s; }
.hint-card:hover { border-color:var(--brand); }
.hint-q-row { display:flex; align-items:flex-start; gap:12px; padding:14px 18px; cursor:pointer; user-select:none; }
.hint-q-num { width:26px; height:26px; border-radius:50%; background:var(--bg-3); border:1.5px solid var(--border-default); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--text-muted); flex-shrink:0; margin-top:1px; }
.hint-card.revealed .hint-q-num { background:var(--green-subtle); border-color:var(--green); color:var(--green); }
.hint-q-main { flex:1; }
.hint-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.hint-tags { display:flex; gap:6px; flex-wrap:wrap; }
.hint-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.hint-tag.basic { background:var(--green-subtle); color:var(--green); }
.hint-tag.intermediate { background:var(--yellow-subtle); color:var(--yellow); }
.hint-tag.advanced { background:var(--red-subtle); color:var(--red); }
.hint-tag.senior { background:var(--purple-subtle); color:var(--purple); }
.hint-q-chevron { color:var(--text-muted); flex-shrink:0; transition:transform .2s; display:flex; align-items:center; padding-top:2px; }
.hint-card.revealed .hint-q-chevron { transform:rotate(180deg); }
.hint-answer { display:none; border-top:1px solid var(--border-subtle); padding:16px 18px; background:var(--bg-1); }
.hint-card.revealed .hint-answer { display:block; }
.hint-answer-text { font-size:13px; color:var(--text-secondary); line-height:1.65; margin-bottom:12px; display:flex; flex-direction:column; gap:10px; }
.hint-a-p { margin:0; }
.hint-a-ol, .hint-a-ul { margin:0; padding-left:22px; }
.hint-a-ol li, .hint-a-ul li { line-height:1.6; margin:4px 0; }
.hint-a-ol li::marker { color:var(--brand); font-weight:700; }
.hint-a-head { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); margin:4px 0 0; }
.hint-a-def { display:flex; flex-direction:column; gap:2px; padding:2px 0 2px 12px; border-left:2px solid var(--brand); }
.hint-a-term { font-size:13px; font-weight:700; color:var(--text-primary); }
.hint-a-desc { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.hint-answer-text code { font-family:var(--font-mono); font-size:.88em; color:var(--text-primary); background:var(--code-bg); border:1px solid var(--border-subtle); border-radius:4px; padding:1px 5px; }
.hint-answer-code { font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:12px 14px; line-height:1.7; white-space:pre; overflow-x:auto; margin-bottom:10px; }
.hint-answer-code .k { color:var(--brand); font-weight:600; } .hint-answer-code .s { color:var(--orange); } .hint-answer-code .c { color:var(--text-muted); font-style:italic; }
.hint-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; }
.hint-note b { color:var(--brand); }
.hint-empty { text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px; }
`;
    document.head.appendChild(s);
  }

  const QA = [
    { level: 'basic', q: 'What is Apache Hudi, and what is it optimized for?',
      a: `Hudi (Hadoop Upserts, Deletes and Incrementals) is an open table format built around record-level writes. It layers a timeline and file-group structure over columnar files to provide:
• first-class upserts and deletes keyed by a record key
• incremental queries (read only what changed)
• two table types (Copy-on-Write, Merge-on-Read) as an explicit choice
• built-in table services (compaction, clustering, cleaning)

Its center of gravity is streaming / CDC ingestion where fast, correct upserts and low-latency freshness matter most.`,
      note: '<strong>ShopKart:</strong> the orders table takes ~5M CDC events every few minutes as a MoR Hudi table — cheap log appends now, async compaction to keep reads fast.' },
    { level: 'basic', q: 'What is the Hudi timeline?',
      a: `The timeline is the ordered log of every action on the table, stored in .hoodie/. Each entry is an instant:
• action — commit, deltacommit, compaction, clean, rollback, replacecommit, savepoint
• state — requested → inflight → completed
• time — a monotonically increasing instant time

It is the source of truth: readers use the latest completed instants to resolve the current file slices; writers add an instant only after data is safely written.` },
    { level: 'intermediate', q: 'Explain file groups and file slices.',
      a: `A file group is all versions of a set of records within a partition, identified by a stable FileID. A file slice is one version of that group: a base Parquet file plus any Avro log files written against it since the last compaction.

Because a record key maps to exactly one file group (via the index), a write touches a bounded set of files — never the whole table. Compaction turns a base+logs slice into a fresh base slice.`,
      code: `<span class="c">file group a8f (country=BR)</span>
slice t1: base_t1.parquet
slice t2: base_t1.parquet + .log.1   <span class="c"># MoR append</span>
slice t4: base_t4.parquet             <span class="c"># after compaction</span>` },
    { level: 'intermediate', q: 'Copy-on-Write vs Merge-on-Read — how do they differ and when do you choose each?',
      a: `CoW rewrites the affected base files on every write, so reads are clean columnar scans (no merge) — heavier writes, fast reads. Best for read-heavy, lower-churn tables.

MoR appends updates/deletes to Avro log files and merges them with the base on read — cheap, low-latency writes; reads pay a merge until compaction. Best for high-frequency streaming upserts.

It's a per-table choice via hoodie.datasource.write.table.type; MoR then relies on compaction to keep reads fast.` },
    { level: 'intermediate', q: 'How does an upsert work end to end?',
      a: `1. Incoming records are de-duplicated within the batch using the precombine field (highest wins).
2. The index maps each record key to its file group (or tags it new).
3. Records are routed to their file groups.
4. CoW rewrites those base files; MoR appends a log file.
5. A new instant (commit for CoW, deltacommit for MoR) is written and transitioned to completed atomically.` },
    { level: 'intermediate', q: 'What are record key, partition path, and precombine field?',
      a: `• recordkey.field — the primary key uniquely identifying a record; drives index lookups and upsert/delete targeting.
• partitionpath.field — determines the storage partition; a key is unique within its partition (non-global index).
• precombine.field — the tie-breaker when two records share a key in one batch; the larger value wins (last-writer-wins).

Together they give clean, order-independent de-duplication on ingest.` },
    { level: 'advanced', q: 'Explain Hudi indexing and the main index types.',
      a: `The index maps a record key to the file group holding it, so upserts/deletes find the right files without scanning the table.
• Bloom — bloom filters in base-file footers; probe candidates then confirm. Good general default.
• Simple — join incoming keys against stored keys; no filter upkeep.
• Bucket — hash keys into a fixed number of buckets (file groups); O(1) routing, ideal for steady streaming.
• Record-level (RLI) — a metadata-table partition mapping every key → location; fast and global.
• HBase — external store for a global key→location map.

Non-global indexes enforce uniqueness within a partition; global (RLI/HBase) across the whole table.` },
    { level: 'advanced', q: 'What is an incremental query and why is it powerful?',
      a: `An incremental query reads only the records that changed between two instants (begin/end), instead of scanning the whole table. Downstream pipelines — marts, materialized views, replication, fraud scoring — process just the delta each run and record the last instant consumed, so the next run resumes exactly where it left off. This is Hudi's signature capability for efficient, near-real-time chaining.`,
      code: `.<span class="k">option</span>(<span class="s">"hoodie.datasource.query.type"</span>, <span class="s">"incremental"</span>)
.<span class="k">option</span>(<span class="s">"...read.begin.instanttime"</span>, <span class="s">"t2"</span>)` },
    { level: 'advanced', q: 'What do compaction, clustering, and cleaning each do?',
      a: `• Compaction (MoR) merges a file group's log files into a new base file — a fresh slice so reads stop paying a merge.
• Clustering rewrites data into new file groups sorted/sized for better skipping — without changing record values.
• Cleaning removes old file slices beyond the retention policy to reclaim storage while preserving enough history for time travel and in-flight readers.

All can run inline or async so ingestion latency isn't affected.`,
      note: '<strong>ShopKart:</strong> async compaction every few commits, nightly clustering on (country, order_date), cleaning retains the last 10 commits.' },
    { level: 'advanced', q: 'What is the metadata table and why does it matter at scale?',
      a: `An internal Merge-on-Read Hudi table under .hoodie/metadata that stores the file list, per-file column stats, bloom filters, and a record-level index. On object storage, listing millions of files is often the slowest part of planning — the metadata table turns that into a fast lookup and drives data skipping without opening files. Being MoR itself, its own updates are cheap log appends compacted over time.` },
    { level: 'advanced', q: 'How does Hudi handle concurrent writers?',
      a: `A single writer needs no external locking — Hudi serializes its own actions on the timeline, and table services can run async. For multiple independent writers, Hudi uses optimistic concurrency control: each writes optimistically, then takes a brief lock (via a lock provider — Zookeeper, Hive Metastore, DynamoDB, or filesystem) at commit and checks for overlapping file groups. Non-overlapping writes both commit; overlapping ones abort the later writer, which retries.` },
    { level: 'senior', q: 'Compare Hudi, Iceberg, and Delta Lake.',
      a: `All three add ACID, time travel, and schema evolution over columnar files; they differ in metadata design and heritage.
• Hudi — record-key centric with primary keys, pluggable indexes, first-class upserts and incremental queries, CoW/MoR table types. Best for streaming record-level ingestion.
• Iceberg — immutable snapshot tree with a manifest hierarchy; strongly engine-neutral, powerful hidden partitioning + partition evolution.
• Delta — a transaction log of JSON actions replayed from checkpoints; deepest Spark/Databricks integration.

Rule of thumb: Hudi for heavy streaming upserts, Iceberg for multi-engine neutrality at scale, Delta for Databricks-centric platforms.`,
      note: '<strong>ShopKart:</strong> chose Hudi for the orders pipeline because sub-minute CDC upserts and incremental downstream pulls are the dominant access pattern.' },
    { level: 'senior', q: 'Snapshot reads on a MoR table have gotten slow. Diagnose and fix.',
      a: `Slow snapshot reads on MoR almost always mean log files have piled up faster than compaction merges them, so every read merges many logs.

Diagnose: check the number/size of log files per file group and how often compaction actually runs (delta commits since last compaction).

Fix: run/tune compaction (e.g. hoodie.compact.inline.max.delta.commits lower, or a dedicated async compaction job); for read-heavy analytics use the read-optimized view; consider clustering to right-size files. If writes are bursty, raise the trigger interval so each deltacommit adds fewer, larger logs.` },
    { level: 'senior', q: 'How does Hudi recover from a bad batch, and how is that different from time travel?',
      a: `Recovery uses savepoints, restore, and markers. A savepoint pins an instant so cleaning won't remove its files — a guaranteed recovery point. Restore rolls the whole table back to a chosen instant by undoing later commits. Markers track the files a write is creating so a failed write's partial files can be deleted on rollback.

Time travel only reads a past instant (the head doesn't move); restore actually resets the table to that instant. Savepoints ensure the target instant survives cleaning so a restore stays possible within the recovery window.` },

    /* ---- Ingestion, write ops & timeline management ---- */
    { level: 'intermediate', q: 'What is Hudi Streamer (DeltaStreamer) and when do you use it?',
      a: `Hudi Streamer (formerly DeltaStreamer) is a ready-made ingestion utility that pulls from a source and writes a Hudi table — so you get CDC/streaming ingestion without hand-writing a Spark job.

Key capabilities:
• Sources — Kafka, DFS/files, JDBC, SQL, and pluggable custom sources; Avro/JSON/Parquet/Protobuf formats.
• Modes — run-once for batch, or continuous mode for an always-on streaming loop.
• Schema — integrates with a schema registry (e.g. Confluent) so schema changes flow through.
• Transforms — SQL-based transformers before the write.
• Checkpointing — tracks the last consumed source offset in the commit metadata, so restarts resume exactly where they stopped.
• Multi-table — one job can fan out to many tables (MultiTableStreamer).

Use it as the default for Kafka-to-lake or files-to-lake CDC when you don't need bespoke write logic.`,
      code: `spark-submit HoodieStreamer \\
  --source-class ...KafkaSource --target-table orders \\
  --table-type MERGE_ON_READ --op UPSERT \\
  --continuous --min-sync-interval-seconds <span class="s">60</span>`,
      note: '<strong>ShopKart:</strong> orders are ingested by a continuous Hudi Streamer job reading the checkout Kafka topic, upserting into a MoR table with async compaction enabled.' },

    { level: 'intermediate', q: 'What are the main Hudi write operations and how do they differ?',
      a: `• insert — writes without an index lookup; faster than upsert but may create duplicates if keys repeat. Good for append-mostly data.
• upsert — the default; index lookup per key, updating existing records or inserting new ones. Correct, but pays the index cost.
• bulk_insert — optimized for the first big load: no index, sorts and sizes files well, lowest memory overhead. Use for initial backfills.
• insert_overwrite — replaces the data in the touched partitions (a replacecommit); good for recomputing a partition.
• insert_overwrite_table — replaces the whole table's data.
• delete — removes records by key (an upsert of tombstones).
• delete_partition — drops entire partitions via a replacecommit.

Rule of thumb: bulk_insert to seed, upsert to maintain, insert_overwrite to recompute.`,
      note: '<strong>ShopKart:</strong> the historical 38 TB orders backfill used bulk_insert; the live CDC stream uses upsert; a corrupted day is fixed with insert_overwrite on that partition.' },

    { level: 'intermediate', q: 'What is the difference between cleaning and timeline archival?',
      a: `They manage two different kinds of buildup.

<strong>Cleaning</strong> reclaims storage by deleting old file slices (data) past the retention policy — e.g. keep the last N commits or a time window. It controls how much version history of the data survives, and therefore how far back time travel and incremental reads can reach.

<strong>Archival</strong> trims the active timeline metadata: once instants are old enough and safely beyond retention, their small timeline files in .hoodie are moved into archived timeline files so the active timeline stays small and planning stays fast. It does not delete data.

So cleaning = old data files; archival = old timeline entries. Set cleaning retention to cover your longest incremental consumer and time-travel need; archival should always retain at least as much as cleaning keeps reachable.`,
      note: '<strong>ShopKart:</strong> cleaning keeps the last 10 commits of data; archival keeps the active timeline lean so hundreds of daily deltacommits do not slow planning.' },

    { level: 'intermediate', q: 'How does schema evolution work in Hudi?',
      a: `Hudi stores the table schema in commit metadata and validates writes against it. Backward-compatible changes work out of the box:
• add a nullable column
• promote a safely-widenable type (int -> long, float -> double)

Full schema evolution (hoodie.schema.on.read.enable) adds the harder operations without rewriting data:
• rename a column
• drop a column
• reorder columns
• change a type within allowed promotions

How it stays cheap: evolution is a metadata change; existing base/log files keep their old schema and are reconciled to the latest schema on read. Incompatible changes (e.g. narrowing a type) are rejected to prevent corruption.`,
      note: '<strong>ShopKart:</strong> adding an optional loyalty_tier column to orders was a metadata-only change; old files simply read null for it.' },

    /* ---- Keys, merging, migration & layout ---- */
    { level: 'advanced', q: 'What are key generators, and which one do you pick?',
      a: `A key generator derives the record key and partition path from each incoming record's fields. The choice shapes both uniqueness and physical layout.

<strong>SimpleKeyGenerator</strong> one field for the key and one for the partition — the common case.
<strong>ComplexKeyGenerator</strong> composite key and/or multiple partition fields, concatenated.
<strong>TimestampBasedKeyGenerator</strong> derives the partition from a timestamp field with a format (e.g. date -> yyyy/MM/dd), so time-partitioning is consistent.
<strong>NonpartitionedKeyGenerator</strong> no partitioning — the whole table is one partition (pairs well with a global index).
<strong>CustomKeyGenerator</strong> mixes field types (SIMPLE / TIMESTAMP) per partition column for flexible schemes.

Getting this right at table creation matters: the partition path and key definition are effectively fixed, and changing them later means a rewrite.`,
      code: `hoodie.datasource.write.recordkey.field = order_id
hoodie.datasource.write.partitionpath.field = order_ts
hoodie.datasource.write.keygenerator.class = <span class="s">...TimestampBasedKeyGenerator</span>`,
      note: '<strong>ShopKart:</strong> orders uses a TimestampBasedKeyGenerator on order_ts so partitions land as country/yyyy-MM-dd regardless of event-time formatting upstream.' },

    { level: 'advanced', q: 'What are record payloads and merge modes, and why do they matter for correctness?',
      a: `When two versions of the same key exist (a new write vs. the stored record, or multiple log entries), Hudi must decide which wins and how to combine them. That logic lives in the record payload / merge mode.

Built-in payloads:
<strong>OverwriteWithLatestAvroPayload</strong> the incoming record always overwrites — simple last-writer-wins by arrival.
<strong>DefaultHoodieRecordPayload</strong> honors the precombine field, so a record wins only if its precombine value is greater — correct for out-of-order events.
<strong>PartialUpdateAvroPayload</strong> merges field-by-field, letting a partial update fill only the columns it carries.
<strong>Custom payloads</strong> implement combineAndGetUpdateValue / preCombine for domain rules (e.g. never move an order status backward).

Newer Hudi reframes this as RecordMergeMode: EVENT_TIME_ORDERING (precombine-based), COMMIT_TIME_ORDERING (arrival-based), or CUSTOM. Choosing EVENT_TIME_ORDERING is what makes late, out-of-order CDC safe — a stale event loses even though it arrived last.`,
      note: '<strong>ShopKart:</strong> orders uses event-time ordering on the CDC commit timestamp, so a delayed "created" event can never overwrite a later "shipped" state.' },

    { level: 'advanced', q: 'What is Hudi bootstrap, and how does it migrate an existing table cheaply?',
      a: `Bootstrap turns an existing directory of Parquet files into a Hudi table without rewriting all the data — it generates Hudi metadata (file groups, index, timeline) that points at the original files.

Two modes, chosen per partition:
<strong>METADATA_ONLY</strong> generate only Hudi metadata and skeleton files that reference the original Parquet; no data copy. Cheapest and fastest, but the original files must stay in place.
<strong>FULL_RECORD</strong> actually rewrite the records into Hudi format, producing a fully native table. More expensive, but self-contained and immediately upsertable with no indirection.

A common pattern is metadata-only for cold historical partitions and full-record for the hot/recent ones you will upsert into. After bootstrap, new writes go through Hudi normally.`,
      note: '<strong>ShopKart:</strong> the 5-year order archive was bootstrapped METADATA_ONLY (no rewrite of cold data), while the current quarter was FULL_RECORD so live CDC upserts run natively.' },

    { level: 'advanced', q: 'How does clustering work, and how is it different from compaction?',
      a: `Clustering reorganizes data layout for better query performance without changing record values — it rewrites data into new file groups that are better sized and sorted on chosen columns, improving file sizes and data skipping.

Mechanics:
• It commits as a replacecommit — old file groups are logically replaced by new ones atomically, so readers never see a half-clustered state.
• Sort columns (hoodie.clustering.plan.strategy.sort.columns) decide the co-location, much like Z-ordering elsewhere.
• It can run inline (after a commit) or async (a separate job), and can target only small files.

Clustering vs compaction: compaction (MoR only) merges a file group's log files into a new base file to stop read-time merges — it is about the base/log structure. Clustering is about layout and file sizing across file groups, and applies to both CoW and MoR. You often run both: compaction to materialize logs, clustering to right-size and sort.`,
      note: '<strong>ShopKart:</strong> nightly async clustering sorts orders by (country, order_date) so analytics scans skip aggressively, while compaction handles the MoR logs during the day.' },

    /* ---- Query, engines & metadata ---- */
    { level: 'advanced', q: 'What are the Hudi query types, and how do engines read them?',
      a: `Hudi exposes three query types:
<strong>Snapshot</strong> the latest committed state. On MoR this merges base + log files at read time; on CoW it is a plain columnar scan. Freshest, but MoR pays the merge.
<strong>Read-optimized</strong> (MoR only) reads only the compacted base files, ignoring un-compacted logs. Faster reads, but data is only as fresh as the last compaction.
<strong>Incremental</strong> only the records changed between two instants — the basis for efficient downstream pipelines.

Engine support: Spark and Flink are first-class for read and write. Query engines like Trino/Presto, Hive, and Athena read Hudi tables (snapshot and read-optimized), typically via the metadata table for fast planning. The read-optimized vs snapshot trade-off is how you tune freshness against latency per consumer — BI dashboards often use read-optimized, while correctness-critical jobs use snapshot.`,
      note: '<strong>ShopKart:</strong> Trino dashboards query the read-optimized view for speed; the fraud-scoring job uses incremental queries to process only new orders each minute.' },

    { level: 'advanced', q: 'How does the metadata table speed up reads and point lookups?',
      a: `The metadata table (.hoodie/metadata, itself a MoR Hudi table) holds several partitions, each a different acceleration structure:
<strong>files</strong> the authoritative file listing per partition, so planning avoids slow recursive storage listings.
<strong>column_stats</strong> per-file min/max/null stats for data skipping, so the planner prunes files without opening them.
<strong>bloom_filters</strong> centralized bloom filters for the bloom index, avoiding footer reads.
<strong>record_index (RLI)</strong> a global key -> file-group mapping, turning an upsert's index lookup and a point query into an O(1) lookup instead of a scan.

Why it matters at scale: on object storage, LIST and per-file metadata reads dominate planning time. Consolidating them into one MoR table (cheap log-append updates, periodic compaction) is what keeps planning fast as a table grows to millions of files.`,
      note: '<strong>ShopKart:</strong> enabling the record-level index cut single-order point lookups from a partition scan to a direct file-group fetch, and the column_stats partition drives skipping for Trino.' },

    { level: 'advanced', q: 'How does Hudi integrate with Flink for streaming writes?',
      a: `Hudi has a first-class Flink writer, so a Flink job can continuously upsert into a Hudi table with low latency.

Pipeline shape:
• A streaming source (Kafka, or CDC via Flink CDC) feeds the Hudi sink connector.
• The writer buffers records and flushes on Flink checkpoints — each successful checkpoint corresponds to a Hudi commit/deltacommit, giving exactly-once aligned with Flink's checkpoint barrier.
• MoR is the usual choice so each checkpoint is a cheap log append; compaction runs async (inline-scheduled, offline-executed, or within the Flink job).
• Streaming-friendly indexes (bucket index, or the Flink-state-backed index) keep per-record routing fast without a heavy lookup.

This is the standard for sub-minute freshness when the platform is Flink-centric rather than Spark-centric.`,
      note: '<strong>ShopKart:</strong> a Flink CDC job mirrors the orders OLTP into Hudi MoR, committing on a 30-second checkpoint interval with a bucket index for steady routing.' },

    { level: 'advanced', q: 'Global versus non-global index — what is the trade-off, and how do you choose an index?',
      a: `<strong>Non-global index</strong> enforces key uniqueness only within a partition, so the lookup is scoped to the record's partition — fast and cheap. The catch: if a record's partition value can change (e.g. a status-based partition), the same key could exist in two partitions, creating a duplicate.

<strong>Global index</strong> enforces uniqueness across the whole table and can relocate a record when its partition changes, at the cost of a table-wide lookup. Record-level index (RLI) and HBase index are global.

Choosing an index:
• Bucket index — steady high-throughput streaming; O(1) hash routing, no filter upkeep, but a fixed bucket count you must size.
• Bloom index — good general default for batch upserts; filters in file footers.
• Simple index — small/medium tables or when bloom upkeep is not worth it.
• Record-level index — fast global lookups / point queries without an external store.
• HBase — very large global index with an existing HBase cluster.

Decide on: partition stability (global vs non-global), throughput pattern (bucket for streaming), and whether you need point lookups (RLI).`,
      note: '<strong>ShopKart:</strong> orders partitions by date (immutable once set), so a non-global bucket index is safe and gives steady routing for the CDC stream.' },

    { level: 'advanced', q: 'What is Non-Blocking Concurrency Control (NBCC), and how does it differ from OCC?',
      a: `Optimistic concurrency control (OCC) lets writers proceed in parallel but, at commit, takes a lock and aborts any writer whose file groups overlap another's — the loser must retry. Under heavy multi-writer upserts to the same partitions, that means wasted work and contention.

Non-Blocking Concurrency Control (NBCC), introduced for MoR, lets multiple writers commit to the same file group concurrently without aborting each other. Each writer appends its own log file; ordering and conflict resolution are deferred to read time and compaction, using the completion time and the record merge logic (precombine / merge mode) to decide the final value deterministically.

Net effect: writers don't block or fail on overlap — throughput stays high with many concurrent streaming writers — while correctness is preserved because the merge mode resolves which record version wins. It trades some read/compaction-time work for conflict-free ingestion.`,
      note: '<strong>ShopKart:</strong> during peak sale events several writers hit the same hot partitions; NBCC on the MoR orders table lets them all commit without the OCC retry storms.' },

    /* ---- Scenario & system design ---- */
    { level: 'senior', q: 'Design a sub-minute CDC pipeline from an OLTP database into Hudi. Cover ingestion, table type, index, and services.',
      a: `<strong>Ingestion:</strong> capture row changes with Debezium to Kafka (or Flink CDC directly), then ingest with Hudi Streamer in continuous mode (or a Flink Hudi sink). Offset tracking in commit metadata gives exactly-once resume.

<strong>Table type:</strong> Merge-on-Read, so each micro-batch is a cheap Avro log append — the only way to hit sub-minute freshness without constantly rewriting base files.

<strong>Keys & ordering:</strong> record key = primary key; merge mode = EVENT_TIME_ORDERING on the source commit timestamp so late/out-of-order events resolve correctly; handle deletes via the CDC op flag (hard delete).

<strong>Index:</strong> bucket index (or RLI) for fast, steady routing at high throughput; non-global if the partition is stable.

<strong>Table services:</strong> async compaction (every N deltacommits) to keep snapshot reads fast; async clustering nightly to right-size files; cleaning to bound history; metadata table + column stats on for planning and skipping.

<strong>Consumption:</strong> downstream marts use incremental queries from the last consumed instant; BI reads the read-optimized view.`,
      note: '<strong>ShopKart:</strong> this is the orders pipeline — Debezium to Kafka, continuous Hudi Streamer into MoR with a bucket index, async compaction + nightly clustering, incremental pulls downstream.' },

    { level: 'senior', q: 'A GDPR request requires erasing a customer from a Hudi table. How do you do a true hard delete?',
      a: `Hudi distinguishes soft and hard deletes:
<strong>Soft delete</strong> nulls the record's data columns but keeps the key — the row still exists, so it does NOT satisfy erasure.
<strong>Hard delete</strong> actually removes the record. Issue delete operations for the customer's keys (an upsert of tombstones), dropping them from the current file slices.

But removal from the current slice is not enough for compliance, because older file slices and log files still physically contain the data and are reachable via time travel / incremental reads until cleaning removes them. The full flow:
1. Hard-delete the customer's records (by key, or delete_partition if isolated to partitions).
2. Ensure compaction materializes the deletes into new base files (MoR).
3. Let cleaning remove the old file slices that still hold the data — within the legal deadline; you may need to tighten retention so the slices actually age out.
4. Check savepoints — a savepoint pins old slices against cleaning, so any savepoint covering the data must be released.
5. Purge copies: incremental consumers, downstream tables, and any bootstrapped original Parquet files.`,
      note: '<strong>ShopKart:</strong> erasure requests hard-delete by customer key, then rely on compaction + tightened cleaning to physically remove old slices inside the 30-day window, and drop any savepoint that would preserve them.' },

    { level: 'senior', q: 'Migrate a 50 TB Hive/Parquet table to Hudi with minimal downtime. Walk through it.',
      a: `The goal is to avoid a 50 TB rewrite and a long freeze.

1. <strong>Bootstrap the history:</strong> run bootstrap METADATA_ONLY on the cold historical partitions — Hudi generates metadata/skeleton files pointing at the existing Parquet, so no data is copied. For the hot recent partitions you will upsert into, use FULL_RECORD so they are native.
2. <strong>Cutover writes:</strong> start writing new data through Hudi (Hudi Streamer or Spark) while the old pipeline still runs, pausing writes only briefly for the final switch.
3. <strong>Validate:</strong> row counts and checksums per partition between the Hive and Hudi tables; sample point lookups via the record index.
4. <strong>Repoint readers:</strong> switch query engines (Trino/Hive/Spark) to the Hudi table; the metadata table keeps planning fast.
5. <strong>Enable services:</strong> turn on cleaning, compaction (if MoR), and clustering, and schedule them.
6. <strong>Decommission:</strong> once validated and readers migrated, retire the old pipeline — but keep the original Parquet while any METADATA_ONLY partitions still reference it.

Downtime is limited to the brief final cutover; the bulk of the data is never rewritten.`,
      note: '<strong>ShopKart:</strong> the legacy Hive orders table was bootstrapped (metadata-only for the archive, full-record for the current quarter), validated per partition, then readers were repointed with no long freeze.' },

    { level: 'senior', q: 'For a high-ingest table that is also queried by BI, would you pick CoW or MoR, and which index? Defend it.',
      a: `Start from the write/read ratio and the freshness need.

<strong>Heavy, frequent ingest (streaming CDC) with sub-minute freshness:</strong> MoR. Writes become cheap log appends instead of full base-file rewrites, so you can commit often. Pay the read-time merge only where you need the freshest data; serve BI from the read-optimized view and run async compaction so that view stays close to current. Index: bucket index for steady O(1) routing at high throughput (or RLI if you also need point lookups).

<strong>Periodic/batch writes, read-heavy with strict query latency:</strong> CoW. Reads are plain columnar scans with no merge, which is what BI wants, and the heavier write cost is acceptable because writes are infrequent. Index: bloom (good default) or simple.

The trap to avoid: CoW with frequent small upserts causes severe write amplification (rewriting big base files for a few changed rows), and MoR without disciplined compaction causes slow snapshot reads. State the compaction/clustering plan as part of the answer — the table type is only half the decision.`,
      note: '<strong>ShopKart:</strong> orders is MoR (sub-minute CDC) with a bucket index; BI uses the read-optimized view and async compaction keeps it fresh — CoW here would rewrite multi-GB files for a handful of changed rows.' },

    { level: 'senior', q: 'Two streaming jobs plus async table services all write the same Hudi table. How do you keep them from corrupting each other?',
      a: `You need a concurrency model, a lock provider, and a service-execution plan.

<strong>Concurrency control:</strong>
• For writers whose file groups rarely overlap, OCC is enough — configure a lock provider so commit-time conflict checks are coordinated.
• For MoR with writers hitting the same partitions hard, prefer NBCC so concurrent writers append logs without aborting each other; the merge mode resolves final values deterministically.

<strong>Lock provider:</strong> OCC needs an external lock to coordinate the commit check — Zookeeper, DynamoDB, Hive Metastore, or a filesystem lock. Without one, two writers can corrupt the timeline. Pick one all writers share.

<strong>Table services:</strong> compaction, clustering, and cleaning also mutate the table, so they participate in concurrency control too. Run them async with the same lock provider, and ideally schedule them from a single coordinator (or let one writer own them) to avoid two jobs planning the same compaction.

<strong>Ordering/merge:</strong> set a precombine / event-time merge mode so that regardless of which writer commits first, the record with the correct version wins.

Summary: shared lock provider + OCC or NBCC + coordinated async services + event-time merge = safe multi-writer.`,
      note: '<strong>ShopKart:</strong> the CDC writer and a late-correction batch job share a DynamoDB lock provider; MoR + NBCC lets them both commit during peaks, and compaction is owned by a single scheduled job.' },
  ];

  TV.HudiInterview = QA;
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
    function flushPara() { if (para.length) { out.push('<p class="hint-a-p">' + para.join(' ') + '</p>'); para = []; } }
    function flushList() {
      if (listItems.length) {
        out.push('<' + listType + ' class="hint-a-' + listType + '">' +
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
        flushAll(); out.push('<div class="hint-a-head">' + m[1].trim() + '</div>'); continue;
      }
      if ((m = line.match(_RE_LABEL))) {
        flushAll();
        const term = m[1].trim().replace(/:$/, ''), desc = m[2].trim().replace(/^[—:-]\s*/, '');
        out.push('<div class="hint-a-def"><span class="hint-a-term">' + term +
          '</span><span class="hint-a-desc">' + desc + '</span></div>');
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
      if (!filtered.length) return '<div class="hint-empty">No questions match this filter.</div>';
      return `<div class="hint-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="hint-card" data-idx="${gi}">
          <div class="hint-q-row">
            <div class="hint-q-num">${i + 1}</div>
            <div class="hint-q-main">
              <div class="hint-q-text">${qa.q}</div>
              <div class="hint-tags"><span class="hint-tag ${qa.level}">${levelLabel(qa.level)}</span></div>
            </div>
            <div class="hint-q-chevron"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M2 4l4 4 4-4"/></svg></div>
          </div>
          <div class="hint-answer">
            <div class="hint-answer-text">${_formatAnswer(qa.a)}</div>
            ${qa.code ? `<div class="hint-answer-code">${qa.code}</div>` : ''}
            ${qa.note ? `<div class="hint-note">${qa.note}</div>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    }
    container.className = '';
    container.innerHTML = `
<div class="hint-page page-enter">
  <div class="hint-header">
    <div class="hint-header-left"><h1>Interview Mode</h1><p>Apache Hudi — ${QA.length} interview questions across all levels. Click any question to reveal the answer.</p></div>
    <div class="hint-header-right">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Filter:</span>
        <button class="hint-btn active" data-filter="all">All</button>
        <button class="hint-btn" data-filter="basic">Beginner</button>
        <button class="hint-btn" data-filter="intermediate">Intermediate</button>
        <button class="hint-btn" data-filter="advanced">Advanced</button>
        <button class="hint-btn" data-filter="senior">Senior</button>
      </div>
      <span class="hint-progress-text" id="hint-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="hint-body" id="hint-body">${buildList()}</div>
</div>`;
    function updateProgress() {
      const r = container.querySelectorAll('.hint-card.revealed').length;
      const p = container.querySelector('#hint-progress');
      if (p) p.textContent = `${r} / ${QA.length} revealed`;
    }
    function wire() {
      container.querySelector('#hint-body').addEventListener('click', (e) => {
        const card = e.target.closest('.hint-card');
        if (!card) return;
        card.classList.toggle('revealed'); updateProgress();
      });
    }
    wire();
    container.querySelectorAll('.hint-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.hint-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); activeFilter = btn.dataset.filter;
        // Re-render the list only. #hint-body itself persists, so the delegated
        // click handler keeps working — do NOT call wire() again here, or each
        // filter change would stack another listener and toggle cards twice.
        container.querySelector('#hint-body').innerHTML = buildList(); updateProgress();
      });
    });

    // Editable, cross-device-synced Q&A overlay (additive; no-op if absent).
    if (TV.interviewEdits) {
      TV.interviewEdits.enhance(container, {
        prefix: 'hint', fmt: 'hudi', QA: QA, answerField: 'a', formatAnswer: _formatAnswer
      });
    }
  }

  TV.registerModule('hudi', {
    id: 'interview', title: 'Interview Mode', group: 'learn', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
