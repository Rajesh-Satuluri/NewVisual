/* ============================================================
   Interview Mode Module
   12 senior-level Apache Iceberg interview questions with
   reveal-on-click answers. Covers fundamentals, ACID, snapshots,
   partitioning, schema evolution, performance, and operations.
   Each answer includes a ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('iv-int-styles')) return;
    const s = document.createElement('style');
    s.id = 'iv-int-styles';
    s.textContent = `
.int-page {
  display:flex; flex-direction:column; height:100%; overflow:hidden;
}
.int-header {
  padding:16px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:16px;
  flex-wrap:wrap;
}
.int-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.int-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.int-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.int-progress-text { font-size:12px; color:var(--text-muted); }
.int-btn {
  padding:6px 14px; border-radius:6px; border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:12px;
  cursor:pointer; transition:background .12s, color .12s;
}
.int-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.int-btn.active { background:rgba(74,174,255,.15); border-color:var(--blue); color:var(--blue); }
.int-body { flex:1; overflow-y:auto; padding:20px 24px; }
.int-qa-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.int-card {
  border:1px solid var(--border-default); border-radius:10px;
  background:var(--bg-2); overflow:hidden;
  transition:border-color .15s;
}
.int-card:hover { border-color:var(--blue); }
.int-card.revealed { border-color:var(--border-default); }
.int-q-row {
  display:flex; align-items:flex-start; gap:12px; padding:14px 18px;
  cursor:pointer; user-select:none;
}
.int-q-num {
  width:26px; height:26px; border-radius:50%; background:var(--bg-3);
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:var(--text-muted);
  flex-shrink:0; margin-top:1px;
}
.int-card.revealed .int-q-num { background:rgba(63,185,80,.15); border-color:var(--green); color:var(--green); }
.int-q-main { flex:1; }
.int-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.int-tags { display:flex; gap:6px; flex-wrap:wrap; }
.int-tag {
  font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px;
  text-transform:uppercase; letter-spacing:.04em;
}
.int-tag.beginner     { background:rgba(63,185,80,.15);   color:var(--green); }
.int-tag.intermediate { background:rgba(74,174,255,.15);  color:var(--blue); }
.int-tag.advanced     { background:rgba(163,113,247,.15); color:var(--purple); }
.int-tag.senior       { background:rgba(248,81,73,.15);   color:var(--red); }
.int-q-chevron {
  color:var(--text-muted); flex-shrink:0; transition:transform .2s;
  display:flex; align-items:center; padding-top:2px;
}
.int-card.revealed .int-q-chevron { transform:rotate(180deg); }
.int-answer {
  display:none; border-top:1px solid var(--border-subtle);
  padding:16px 18px; background:var(--bg-1);
}
.int-card.revealed .int-answer { display:block; }
.int-answer-text {
  font-size:13px; color:var(--text-secondary); line-height:1.65;
  margin-bottom:12px;
}
.int-answer-code {
  font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary);
  background:var(--bg-2); border:1px solid var(--border-subtle);
  border-radius:6px; padding:12px 14px; line-height:1.7;
  white-space:pre; overflow-x:auto; margin-bottom:10px;
}
.int-answer-code .hi-kw  { color:var(--blue); }
.int-answer-code .hi-str { color:var(--green); }
.int-answer-code .hi-num { color:var(--orange); }
.int-answer-code .hi-cm  { color:var(--text-muted); font-style:italic; }
.int-shopkart-note {
  font-size:11.5px; color:var(--text-muted);
  background:rgba(74,174,255,.06); border-left:3px solid var(--blue);
  border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55;
}
.int-shopkart-note strong { color:var(--blue); }
.int-filter-row {
  display:flex; gap:6px; align-items:center; flex-wrap:wrap;
}
.int-filter-label { font-size:11px; color:var(--text-muted); margin-right:4px; }
.int-empty {
  text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px;
}
`;
    document.head.appendChild(s);
  }

  /* ── QA Data ─────────────────────────────────────────────── */
  const QA = [
    {
      q: 'What is Apache Iceberg and what problems does it solve compared to a plain Hive table?',
      tags: ['beginner'],
      answer: `Iceberg is an open table format for huge analytic datasets. Unlike Hive tables (which are just a folder of files with a metastore pointer), Iceberg adds:

1. <strong>ACID transactions</strong> — snapshot isolation, no partial reads
2. <strong>Schema evolution</strong> — add/drop/rename/reorder columns safely
3. <strong>Hidden partitioning</strong> — partition by functions (months, buckets) without exposing them in queries
4. <strong>Time travel</strong> — query any past snapshot by timestamp or id
5. <strong>Metadata statistics</strong> — per-file column min/max enables massive file skipping
6. <strong>Concurrent writers</strong> — OCC (optimistic concurrency) instead of table-level locks`,
      code: `<span class="hi-cm">-- Hive table: no ACID, no schema evolution</span>
<span class="hi-kw">CREATE TABLE</span> hive_orders (order_id BIGINT, …)
<span class="hi-kw">LOCATION</span> <span class="hi-str">'s3://bucket/orders/'</span>;
<span class="hi-cm">-- Problem: writers overwrite each other
--          readers see partial results
--          no column stats → full scan always</span>

<span class="hi-cm">-- Iceberg: full ACID + metadata hierarchy</span>
<span class="hi-kw">CREATE TABLE</span> shopkart.orders.events (…)
<span class="hi-kw">USING</span> iceberg
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_date))
<span class="hi-kw">TBLPROPERTIES</span>(<span class="hi-str">'format-version'</span>=<span class="hi-str">'2'</span>);`,
      shopkart: '<strong>ShopKart:</strong> Migrated 21.5 billion order rows from Hive to Iceberg in 2021. Hive queries on orders took 4–6 hours; Iceberg queries now return in under 1 second via partition + column stats pruning.',
    },
    {
      q: 'Explain the Iceberg metadata hierarchy: catalog → metadata.json → manifest list → manifest files → data files.',
      tags: ['beginner', 'intermediate'],
      answer: `Iceberg uses a 5-level metadata hierarchy, each level adding resolution:

<strong>1. Catalog</strong> — maps table name → current metadata.json path. No data here.
<strong>2. metadata.json</strong> — holds table schema, partition spec, snapshots list, current-snapshot-id. Usually a few KB.
<strong>3. Manifest list</strong> — one per snapshot. Lists all manifest files for this snapshot with their partition summaries.
<strong>4. Manifest files (.avro)</strong> — lists DataFile entries. Each entry has file path, format, partition, record count, column stats.
<strong>5. Data files (.parquet/.orc/.avro)</strong> — the actual rows.

Query engines walk top-down, pruning at each level. They never read data files they can skip.`,
      code: `<span class="hi-cm">Catalog
  └─ metadata/v00042.metadata.json
       └─ snapshots[current]:
            manifest-list: snap-9821443009.avro
              └─ manifests[]:
                   snap-9821443009-m0.avro
                     └─ data_files[]:
                          event_date=2026-08-01/
                          orders-t0.parquet</span>`,
      shopkart: '<strong>ShopKart:</strong> The orders.events table has 800M data files, ~22K manifest files, and ~1,048 snapshots. Reading a manifest list costs ~2 MB; reading all manifests costs ~200 MB — a tiny fraction of the 6 PB data.',
    },
    {
      q: 'How does Iceberg snapshot isolation work? What guarantees does it provide?',
      tags: ['intermediate'],
      answer: `Every write operation (INSERT, UPDATE, DELETE, MERGE) produces a new immutable snapshot. Readers always read from a specific snapshot — the current one when they started. Key guarantees:

<strong>Isolation:</strong> A reader's snapshot doesn't change during the query, even if writers commit new snapshots concurrently.
<strong>No dirty reads:</strong> A snapshot only becomes "current" after the atomic metadata commit succeeds.
<strong>No lost updates:</strong> Writers use OCC — they commit only if the table's current snapshot matches what they read. If not, they retry.
<strong>Rollback:</strong> Any snapshot can become current again (time travel rollback).`,
      code: `<span class="hi-cm">-- Snapshot timeline</span>
snap_A  → snap_B  → snap_C  (current)
                    ↑ metadata.json
                    "current-snapshot-id": snap_C

<span class="hi-cm">-- Reader R started at snap_B:</span>
<span class="hi-cm">-- Still reads snap_B even after snap_C commits</span>
<span class="hi-cm">-- No partial or torn reads possible</span>

<span class="hi-cm">-- Writer W trying to commit snap_D:</span>
<span class="hi-kw">if</span> current == snap_C:
  commit snap_D  <span class="hi-cm">→ success</span>
<span class="hi-kw">else</span>:
  retry with new snapshot-id`,
      shopkart: '<strong>ShopKart:</strong> The real-time dashboard queries orders.events while Kafka micro-batches write every 30 seconds. Snapshot isolation means the dashboard always sees a consistent picture, never partially-written batches.',
    },
    {
      q: 'What is hidden partitioning and why is it better than Hive-style partitioning?',
      tags: ['intermediate'],
      answer: `<strong>Hive partitioning:</strong> Partition columns are stored in the data and appear in queries. Users must write WHERE event_date_dt = '2026-08-01' exactly as a string; the engine doesn't know that '2026-08-01' maps to partition folder date=2026-08-01.

<strong>Iceberg hidden partitioning:</strong> The partition transform is metadata-only. You define PARTITIONED BY (days(event_date)), but event_date stays as a timestamp column in the data. The engine automatically translates WHERE event_date = '2026-08-01' into a partition prune — no user-facing partition column needed.

Benefits: no accidental full-scans, partition evolution without data rewrite, cleaner query syntax, bucket/truncate/hour transforms.`,
      code: `<span class="hi-cm">-- Hive: partition column in data AND query</span>
<span class="hi-kw">WHERE</span> event_date_part = <span class="hi-str">'2026-08-01'</span>  <span class="hi-cm">← must match exactly</span>
<span class="hi-cm">-- If you filter on event_date_ts → full scan!</span>

<span class="hi-cm">-- Iceberg: partition is hidden</span>
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_date))
<span class="hi-kw">WHERE</span> event_date >= <span class="hi-str">'2026-08-01'</span>
  <span class="hi-kw">AND</span> event_date  < <span class="hi-str">'2026-08-02'</span>
<span class="hi-cm">→ Iceberg auto-prunes to 1 day partition
→ No duplicate column in schema</span>`,
      shopkart: '<strong>ShopKart:</strong> Before hidden partitioning, analysts frequently forgot to add the dt partition column and ran multi-hour full scans. After migration, partition pruning is automatic for any event_date predicate.',
    },
    {
      q: 'Explain OCC (Optimistic Concurrency Control) in Iceberg. What happens on a write conflict?',
      tags: ['advanced'],
      answer: `Iceberg uses OCC rather than pessimistic locking. The workflow:

1. Writer reads the current metadata.json, notes current-snapshot-id.
2. Writer writes data files and manifest (no lock held yet).
3. Writer attempts to commit: CAS (compare-and-swap) on metadata.json — succeeds only if current-snapshot-id still matches.
4. If another writer committed first (current-snapshot-id changed), this writer's commit fails.
5. Iceberg retries by re-reading the new metadata and re-applying its changes if compatible (append-only operations almost always succeed; updates/deletes may conflict and throw CommitFailedException).

This means locks are held for milliseconds (~metadata write time only), not during data file writes.`,
      code: `<span class="hi-cm">-- Two concurrent writers: W1 and W2</span>
W1 reads: current = snap_100
W2 reads: current = snap_100

W1 writes files… W2 writes files…

W1 commits: CAS(current=snap_100 → snap_101)
  → success ✓  (first to commit wins)

W2 tries: CAS(current=snap_100 → snap_101)
  → FAIL ✗  (current is now snap_101)

W2 retries: reload metadata (snap_101)
  → re-check: is my write compatible?
  → If append: yes, commit as snap_102 ✓
  → If update same rows: throw CommitFailed`,
      shopkart: '<strong>ShopKart:</strong> The incident SK-2023-0412 was caused by a custom writer that ignored CommitFailedException. It silently discarded retries, losing 2.3 million CDC updates. OCC retry logic must always be implemented correctly.',
    },
    {
      q: 'What is the difference between Copy-on-Write (CoW) and Merge-on-Read (MoR) for DELETE/UPDATE?',
      tags: ['advanced'],
      answer: `Both strategies implement row-level deletes. They trade write cost vs. read cost:

<strong>Copy-on-Write (CoW):</strong> On DELETE/UPDATE, the affected Parquet files are fully rewritten (old rows removed, updated rows included). Reads are fast (no merge needed). Writes are expensive (full file rewrite). Best for low-update-rate, read-heavy tables.

<strong>Merge-on-Read (MoR):</strong> On DELETE/UPDATE, a small delete-file (positional or equality) is written. The original data file is NOT rewritten. Reads must merge data + delete files. Writes are fast. Best for high-update-rate, CDC, and near-real-time ingestion.

Iceberg v2 uses positional delete files (filename + row position) and equality delete files (column-value-based).`,
      code: `<span class="hi-cm">-- Table properties controlling strategy</span>
write.delete.mode  = <span class="hi-str">'copy-on-write'</span>   <span class="hi-cm">← default</span>
write.delete.mode  = <span class="hi-str">'merge-on-read'</span>

<span class="hi-cm">-- CoW DELETE: rewrites file</span>
<span class="hi-cm">   old-file.parquet (1M rows) → DELETED</span>
<span class="hi-cm">   new-file.parquet (999,999) ← written</span>

<span class="hi-cm">-- MoR DELETE: writes delete file only</span>
<span class="hi-cm">   old-file.parquet (1M rows) ← UNTOUCHED</span>
<span class="hi-cm">   old-file-deletes.avro     ← 1 row ref</span>

<span class="hi-cm">-- Compact MoR files with:</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'binpack'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> The CDC upsert pipeline uses MoR for fast writes (30-second latency). A nightly OPTIMIZE job compacts MoR delete files via rewrite_data_files, keeping read performance fast during the day.',
    },
    {
      q: 'How does schema evolution work in Iceberg? What operations are safe vs. unsafe?',
      tags: ['intermediate'],
      answer: `Iceberg identifies columns by unique integer field IDs (not by name or position). This makes schema changes non-destructive:

<strong>Safe operations:</strong>
- ADD column (new field ID; old files return null)
- DROP column (metadata only; old files still have data but it's ignored)
- RENAME column (field ID unchanged; column-stats still valid)
- REORDER columns (field IDs unchanged; no data change)
- WIDEN column type (int→long, float→double, decimal scale increase)

<strong>Unsafe operations:</strong>
- Narrowing types (long→int) — rejected by Iceberg
- Changing semantics without rename — no protection against this

Old data files are NEVER rewritten for schema changes.`,
      code: `<span class="hi-cm">-- Safe schema changes (no data rewrite)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ADD COLUMN</span> loyalty_points BIGINT;
<span class="hi-cm">-- old files: loyalty_points = null (safe)</span>

<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">DROP COLUMN</span> legacy_flag;
<span class="hi-cm">-- data still in old files; metadata ignores it</span>

<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ALTER COLUMN</span> order_amount TYPE DOUBLE;
<span class="hi-cm">-- widening float → double: safe</span>

<span class="hi-cm">-- Iceberg tracks by field_id, not name/pos:
-- field_id=7 was "amount", rename to "total"
-- Column stats / bloom filters still valid</span>`,
      shopkart: '<strong>ShopKart:</strong> In 2023, 5 new columns were added to orders.events (returns_flag, loyalty_tier, experiment_group, referral_code, app_version) without any downtime or data migration. Old Parquet files simply returned null for the new columns.',
    },
    {
      q: 'How does time travel work in Iceberg? How do you query a specific snapshot?',
      tags: ['intermediate'],
      answer: `Every write creates an immutable snapshot with a timestamp and snapshot-id. Because old snapshots reference their own manifest lists and data files (which are never deleted until explicitly expired), you can query any past state.

Time travel methods:
1. AS OF TIMESTAMP — query the snapshot current at a given time
2. AS OF VERSION — query a specific snapshot-id
3. RESTORE — make a past snapshot the new current snapshot

Snapshots are retained until EXPIRE SNAPSHOTS is run (which removes snapshot metadata and unreferenced data files).`,
      code: `<span class="hi-cm">-- Query snapshot at a specific time</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">TIMESTAMP AS OF</span> <span class="hi-str">'2026-07-31 23:00:00'</span>;

<span class="hi-cm">-- Query by snapshot-id</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">VERSION AS OF</span> <span class="hi-num">9821443008</span>;

<span class="hi-cm">-- Rollback to past snapshot (RESTORE)</span>
<span class="hi-kw">CALL</span> shopkart.system.rollback_to_snapshot(
  table => <span class="hi-str">'orders.events'</span>,
  snapshot_id => <span class="hi-num">9821443008</span>
);

<span class="hi-cm">-- List all snapshots</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events.snapshots;`,
      shopkart: '<strong>ShopKart:</strong> Incident SK-2023-0412 — a MERGE INTO pipeline wrote 2.3M incorrect updates. Recovered in 4 minutes by running ROLLBACK to the snapshot before the erroneous pipeline started. No data loss, no manual repair.',
    },
    {
      q: 'What is partition evolution? How does Iceberg handle it without data rewrite?',
      tags: ['advanced'],
      answer: `Partition evolution lets you change the partition spec of a table without rewriting existing data. Iceberg achieves this through partition spec versioning:

- Each data file records which partition spec it was written with (spec_id).
- A new partition spec gets a new spec_id.
- Old files are still queryable under the old spec.
- New writes use the new spec.
- Iceberg handles mixed-spec scans transparently.

This means you can switch from PARTITIONED BY (months(event_date)) to PARTITIONED BY (days(event_date)) and old monthly-partitioned files and new daily-partitioned files coexist in the same table.`,
      code: `<span class="hi-cm">-- ShopKart: orders.events partition evolution</span>
<span class="hi-cm">-- Phase 1: monthly (spec_id=0)</span>
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">months</span>(event_date))

<span class="hi-cm">-- Phase 2: daily after 2025 growth (spec_id=1)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">REPLACE PARTITION FIELD</span>
  <span class="hi-fn">months</span>(event_date)
  <span class="hi-kw">WITH</span> <span class="hi-fn">days</span>(event_date);

<span class="hi-cm">-- Old monthly files: still readable ✓
-- New daily files: written with spec_id=1
-- Engine handles both specs transparently
-- Zero data files rewritten</span>`,
      shopkart: '<strong>ShopKart:</strong> In Jan 2025, orders grew to 20M/day. Monthly partitions caused 300+ MB/query scans. Partition evolution to daily partitions took 1 SQL statement and 0 bytes of data rewrite. Old files remained untouched.',
    },
    {
      q: 'What maintenance operations does Iceberg provide? When should you run them?',
      tags: ['intermediate', 'advanced'],
      answer: `Iceberg provides three main maintenance procedures:

<strong>1. OPTIMIZE / rewrite_data_files</strong> — Compacts small files into larger ones (target ~128–512 MB). Run when many small files accumulate (streaming ingestion, frequent updates). Also merges MoR delete files.

<strong>2. EXPIRE SNAPSHOTS</strong> — Removes old snapshot metadata and unreferenced data files. Run daily with a retention window. Does NOT touch files still referenced by live snapshots.

<strong>3. REMOVE ORPHAN FILES</strong> — Deletes S3/HDFS files that have no metadata entry (left behind by failed writes). Run weekly. Read-only scan of metadata + filesystem diff.

Best practice: run OPTIMIZE daily on streaming tables, EXPIRE SNAPSHOTS daily with 7-day retention, REMOVE ORPHAN FILES weekly.`,
      code: `<span class="hi-cm">-- 1. Compact small files (nightly ETL)</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table    => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'binpack'</span>,
  options  => map(<span class="hi-str">'target-file-size-bytes'</span>,
                  <span class="hi-str">'134217728'</span>) <span class="hi-cm">-- 128 MB</span>
);

<span class="hi-cm">-- 2. Expire old snapshots (daily)</span>
<span class="hi-kw">CALL</span> shopkart.system.expire_snapshots(
  table               => <span class="hi-str">'orders.events'</span>,
  older_than          => <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-07-25'</span>,
  retain_last         => <span class="hi-num">7</span>
);

<span class="hi-cm">-- 3. Remove orphan files (weekly)</span>
<span class="hi-kw">CALL</span> shopkart.system.remove_orphan_files(
  table  => <span class="hi-str">'orders.events'</span>,
  older_than => <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-07-25'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> Without EXPIRE SNAPSHOTS, the orders.events metadata directory grew to 900 GB in 6 months (1,048 snapshots × manifests). After enabling daily expiry with 7-day retention, metadata stabilised at ~8 GB.',
    },
    {
      q: 'How does Iceberg handle MERGE INTO for CDC upserts? Walk through the execution.',
      tags: ['advanced', 'senior'],
      answer: `MERGE INTO combines INSERT, UPDATE, and DELETE in a single atomic operation. For CDC upserts:

1. Source table (CDC events) is joined to target table (orders) on match key (order_id).
2. WHEN MATCHED AND source.op='U' → UPDATE target row.
3. WHEN MATCHED AND source.op='D' → DELETE target row.
4. WHEN NOT MATCHED AND source.op='I' → INSERT new row.
5. Iceberg writes the result as: new Parquet data files (updated/inserted rows) + delete files (for CoW: rewritten; for MoR: positional deletes).
6. A new snapshot is committed atomically.

On conflict (another writer committed between read and commit), Iceberg retries if the conflict is on non-overlapping rows.`,
      code: `<span class="hi-cm">-- ShopKart CDC: MySQL binlog → Kafka → Iceberg</span>
<span class="hi-kw">MERGE INTO</span> shopkart.orders.events t
<span class="hi-kw">USING</span> staging.cdc_batch s
  <span class="hi-kw">ON</span> t.order_id = s.order_id
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'U'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">UPDATE SET</span>
    t.order_status = s.order_status,
    t.updated_at   = s.updated_at
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'D'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">DELETE</span>
<span class="hi-kw">WHEN NOT MATCHED THEN</span>
  <span class="hi-kw">INSERT</span> *;

<span class="hi-cm">-- 5.2M CDC events processed in one MERGE
-- Result: 2.8M updates + 1.1M inserts + 0.3M deletes
-- One new snapshot committed atomically</span>`,
      shopkart: '<strong>ShopKart:</strong> The MySQL binlog-to-Iceberg pipeline runs MERGE INTO every 5 minutes, processing ~5M CDC events per batch. End-to-end CDC latency: 5–8 minutes from MySQL commit to Iceberg visibility.',
    },
    {
      q: 'What is the difference between a positional delete file and an equality delete file in Iceberg v2?',
      tags: ['senior'],
      answer: `Both are MoR delete mechanisms but they identify rows differently:

<strong>Positional delete file:</strong> Identifies rows by (file_path, row_position). Extremely precise. The file stores pairs of (data file path, row index). Only works for deletes on a specific version of a file. Engine must join on file + position.

<strong>Equality delete file:</strong> Identifies rows by column value(s). Stores the delete predicate's key columns (e.g. {order_id: 12345, …}). Engine must test every data file row against the equality condition — more expensive at read time but doesn't depend on row positions.

Positional deletes are preferred for UPDATE and simple DELETE. Equality deletes are used for DELETE WHERE column IN (...) when positions aren't known upfront.`,
      code: `<span class="hi-cm">-- Positional delete file content (Avro)</span>
{
  <span class="hi-str">"file_path"</span>: <span class="hi-str">"s3://…/orders-t0.parquet"</span>,
  <span class="hi-str">"pos"</span>: <span class="hi-num">41231</span>
}
<span class="hi-cm">-- Row at position 41231 in that file is deleted</span>

<span class="hi-cm">-- Equality delete file content (Avro)</span>
{
  <span class="hi-str">"order_id"</span>: <span class="hi-num">9000012345</span>,
  <span class="hi-str">"event_date"</span>: <span class="hi-str">"2026-08-01"</span>
}
<span class="hi-cm">-- Any row with order_id=9000012345 is deleted
-- Engine scans all matching files and filters</span>

<span class="hi-cm">-- Table property to prefer positional deletes:</span>
write.delete.mode = <span class="hi-str">'merge-on-read'</span>
write.pos-delete.enabled = <span class="hi-kw">true</span>`,
      shopkart: '<strong>ShopKart:</strong> The GDPR "right to be forgotten" workflow uses equality delete files (delete by customer_id). The CDC upsert pipeline uses positional deletes (faster write, precise row targeting). Both coexist in the same table.',
    },
    {
      q: 'Copy-on-Write vs Merge-on-Read: how do they differ and when do you choose each?',
      tags: ['intermediate', 'advanced'],
      answer: `Both implement row-level UPDATE/DELETE; they trade write cost against read cost.

<strong>Copy-on-Write (CoW):</strong> rewrites every data file that contains an affected row, minus/with the changes. Writes are expensive (whole-file rewrite), but reads are as fast as a plain scan — no delete merging.
<strong>Merge-on-Read (MoR):</strong> writes small delete files (position or equality) plus any new data files. Writes are cheap and fast, but every read must merge deletes against data files, so read cost grows until you compact.

<strong>Choose CoW when</strong> reads dominate and updates are infrequent/bulk (e.g. nightly restatements).
<strong>Choose MoR when</strong> writes are frequent/low-latency (streaming CDC, GDPR deletes) — then schedule regular compaction to keep reads fast.`,
      code: `<span class="hi-cm">-- Per-operation or per-table</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events <span class="hi-kw">SET</span> <span class="hi-kw">TBLPROPERTIES</span> (
  <span class="hi-str">'write.update.mode'</span> = <span class="hi-str">'merge-on-read'</span>,
  <span class="hi-str">'write.delete.mode'</span> = <span class="hi-str">'merge-on-read'</span>,
  <span class="hi-str">'write.merge.mode'</span>  = <span class="hi-str">'copy-on-write'</span>
);</span>`,
      shopkart: '<strong>ShopKart:</strong> streaming CDC into orders.events uses MoR for sub-second commits; the analytics-facing orders_curated table uses CoW so BI dashboards never pay a merge cost. A 2 AM compaction job rewrites MoR deletes away.',
    },
    {
      q: 'Walk through how an Iceberg commit stays atomic and how conflicts are detected.',
      tags: ['advanced', 'senior'],
      answer: `Iceberg uses <strong>optimistic concurrency control (OCC)</strong> over an atomic pointer swap — no lock service.

<strong>1.</strong> The writer reads the current metadata.json and remembers its snapshot id (the base).
<strong>2.</strong> It writes new data files, manifest file(s), and a manifest list <em>speculatively</em> — none of this is visible yet.
<strong>3.</strong> It asks the catalog to swap the table pointer from base → new metadata, conditional on the base still being current (compare-and-swap).
<strong>4.</strong> If the base is still current, the swap succeeds — that instant is the commit. If another writer committed first, the CAS fails.
<strong>5.</strong> On failure the writer re-reads the new current snapshot, re-validates its changes against it (e.g. did the other commit touch the same partitions?), and retries.

Conflict validation depends on the operation's isolation level (serializable vs snapshot) and what the write asserted (appends rarely conflict; overwrites/deletes on the same partition can).`,
      shopkart: '<strong>ShopKart:</strong> during Black Friday, 40+ concurrent Spark writers hit orders.events. Appends almost never conflict (they only add files); the occasional MERGE conflict retries in <1s. No central lock, no downtime.',
    },
    {
      q: 'Your Spark planning time jumped from seconds to 20+ minutes. Diagnose and fix.',
      tags: ['advanced', 'senior'],
      answer: `Almost always a <strong>metadata explosion</strong> — too many manifests and/or tiny data files from high-frequency commits (streaming micro-batches).

<strong>Diagnose:</strong> inspect the metadata tables — <code>files</code> (count + avg size), <code>manifests</code> (count), <code>snapshots</code> (commit frequency). Millions of small files or tens of thousands of manifests is the smoking gun.

<strong>Fix:</strong>
<strong>1.</strong> <code>rewriteManifests</code> — consolidate many small manifests into a few large ones (cuts planning directly).
<strong>2.</strong> <code>rewriteDataFiles</code> (compaction) — merge small files toward ~128–512 MB.
<strong>3.</strong> Reduce commit frequency — larger Flink/Spark checkpoints so each commit adds fewer, bigger files.
<strong>4.</strong> <code>expireSnapshots</code> — drop old snapshots so their manifests are collectable.`,
      code: `<span class="hi-cm">-- Consolidate manifests, then compact files</span>
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">rewrite_manifests</span>(<span class="hi-str">'shopkart.orders.events'</span>);
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">rewrite_data_files</span>(
  table => <span class="hi-str">'shopkart.orders.events'</span>,
  options => <span class="hi-kw">map</span>(<span class="hi-str">'target-file-size-bytes'</span>, <span class="hi-str">'536870912'</span>)
);</span>`,
      shopkart: '<strong>ShopKart:</strong> a Flink job checkpointing every 10s produced ~4M manifests. rewrite_manifests + a 512 MB compaction dropped planning from 22 min to 9 s; checkpoint interval was raised to 2 min to stop recurrence.',
    },
    {
      q: 'Compare Apache Iceberg, Delta Lake, and Apache Hudi at a high level.',
      tags: ['senior'],
      answer: `All three are open table formats adding ACID + time travel over columnar files. Key differences:

<strong>Iceberg:</strong> immutable snapshot tree with a manifest hierarchy. Engine-agnostic (Spark, Flink, Trino, Dremio, Snowflake, BigQuery), strong hidden partitioning + partition/schema evolution, REST catalog spec. Scales to millions of files via metadata pruning.
<strong>Delta Lake:</strong> transaction log (_delta_log) of JSON/Parquet actions replayed from checkpoints. Tightly integrated with Spark/Databricks; strong tooling; historically Spark-centric (broadening via delta-kernel + UniForm).
<strong>Hudi:</strong> record-key centric with primary keys, upsert/CDC as first-class, Copy-on-Write and Merge-on-Read table types, built-in indexing and incremental pulls. Great for streaming upsert workloads.

<strong>Rule of thumb:</strong> Iceberg for multi-engine lakehouse + huge tables; Delta for Databricks-centric shops; Hudi for heavy record-level streaming upserts.`,
      shopkart: '<strong>ShopKart:</strong> chose Iceberg because the same tables are queried by Spark (ETL), Trino (ad-hoc), and Snowflake (BI) — the engine-neutral catalog and metadata format avoided lock-in.',
    },
    {
      q: 'How do you ingest a stream into Iceberg with exactly-once semantics?',
      tags: ['advanced', 'senior'],
      answer: `Exactly-once comes from tying the engine's checkpoint to Iceberg's atomic commit.

<strong>Flink:</strong> the Iceberg sink is a two-phase commit participant. Files are written during the checkpoint; the Iceberg snapshot commit happens on checkpoint completion. If a task fails, the incomplete files are simply never committed (orphans) — no partial snapshot, no duplicates.
<strong>Spark Structured Streaming:</strong> each micro-batch commits one snapshot; the batch id is tracked so a replayed batch does not double-commit.

<strong>Costs to manage:</strong> frequent commits ⇒ small files/manifests. Tune checkpoint interval, enable fanout/target file size, and schedule compaction. Clean up orphan files from failed writes with <code>remove_orphan_files</code>.`,
      code: `<span class="hi-cm">-- Flink: commit on checkpoint = exactly-once</span>
env.<span class="hi-fn">enableCheckpointing</span>(<span class="hi-str">120000</span>); <span class="hi-cm">// 2 min → fewer, bigger commits</span>
FlinkSink.<span class="hi-fn">forRowData</span>(stream)
  .<span class="hi-fn">tableLoader</span>(loader)
  .<span class="hi-fn">upsert</span>(<span class="hi-kw">true</span>)
  .<span class="hi-fn">append</span>();</span>`,
      shopkart: '<strong>ShopKart:</strong> clickstream lands via Flink with 2-minute checkpoints (exactly-once), then a Spark job compacts hourly. Duplicate events are impossible even across task restarts.',
    },
    {
      q: 'What catalog options exist, and why is the REST catalog significant?',
      tags: ['intermediate'],
      answer: `The catalog maps table name → current metadata.json and performs the atomic commit. Options:

<strong>Hive Metastore:</strong> classic, ubiquitous, but a shared-DB bottleneck and Hive-centric.
<strong>AWS Glue:</strong> managed metastore on AWS; convenient but AWS-bound.
<strong>Hadoop/FileSystem:</strong> pointer file in the table dir; simplest, but weak multi-writer guarantees on some object stores.
<strong>JDBC:</strong> catalog state in a relational DB.
<strong>Nessie:</strong> git-like catalog with branches/tags across tables.
<strong>REST catalog:</strong> a <em>specification</em> — an HTTP API any engine can call and any provider can implement.

<strong>Why REST matters:</strong> it decouples engines from a specific metastore. Providers (Tabular/Polaris, Unity, Nessie, Gravitino) implement one API; Spark/Flink/Trino/Snowflake all speak it. It also enables server-side commit coordination, credential vending, and governance.`,
      shopkart: '<strong>ShopKart:</strong> migrated from Hive Metastore to a REST catalog so Trino, Spark, and Snowflake share one governed catalog with centralized access control and no metastore DB contention.',
    },
    {
      q: 'Explain Iceberg branching and tagging, and the write-audit-publish pattern.',
      tags: ['advanced'],
      answer: `<strong>Branch:</strong> a named, mutable reference to a snapshot — an isolated line of commits.
<strong>Tag:</strong> a named, immutable reference to a specific snapshot — for milestones/compliance.

<strong>Write-Audit-Publish (WAP):</strong>
<strong>1. Write</strong> the nightly load to a staging branch (e.g. <code>audit</code>) instead of main — production readers never see it.
<strong>2. Audit</strong> — run data-quality checks against the branch (row counts, null rates, referential checks).
<strong>3. Publish</strong> — if checks pass, fast-forward main to the branch atomically. If they fail, discard the branch; main was never touched.

This gives you staged, all-or-nothing publishing without copying data.`,
      code: `<span class="hi-kw">ALTER TABLE</span> orders.events <span class="hi-kw">CREATE BRANCH</span> audit;
<span class="hi-cm">-- write + validate on the branch, then:</span>
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">fast_forward</span>(<span class="hi-str">'orders.events'</span>, <span class="hi-str">'main'</span>, <span class="hi-str">'audit'</span>);
<span class="hi-cm">-- compliance milestone</span>
<span class="hi-kw">ALTER TABLE</span> orders.events <span class="hi-kw">CREATE TAG</span> <span class="hi-str">\`q3-2026-close\`</span> <span class="hi-kw">RETAIN</span> <span class="hi-str">2555</span> DAYS;</span>`,
      shopkart: '<strong>ShopKart:</strong> finance tables use WAP — the nightly close writes to an audit branch, a dbt test suite validates it, and only green runs fast-forward to main. Quarter-end snapshots are tagged for 7-year retention.',
    },
    {
      q: 'What are sort orders and clustering (Z-order), and why do they matter?',
      tags: ['advanced'],
      answer: `A <strong>sort order</strong> tells writers how to order rows within data files. <strong>Clustering / Z-ordering</strong> interleaves multiple columns so nearby values co-locate in multi-dimensional space.

<strong>Why it matters:</strong> pruning depends on per-file min/max stats. If a filter column is scattered across all files, every file's min/max spans the whole range and nothing prunes. If rows are sorted/clustered on that column, each file covers a narrow range, so the planner skips most files for selective queries.

Sort orders are metadata; you set them and compaction/writes honor them. Z-order is applied during rewriteDataFiles for multi-column locality.`,
      code: `<span class="hi-kw">ALTER TABLE</span> orders.events <span class="hi-kw">WRITE ORDERED BY</span> event_date, country_code;

<span class="hi-cm">-- Multi-dimensional clustering during compaction</span>
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">rewrite_data_files</span>(
  table => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'sort'</span>,
  sort_order => <span class="hi-str">'zorder(country_code, customer_id)'</span>
);</span>`,
      shopkart: '<strong>ShopKart:</strong> queries filter by country_code + date. Z-ordering on those columns cut files scanned per query by ~85%, turning 12 s dashboards into sub-second ones.',
    },
    {
      q: 'What are Puffin files and table statistics used for in Iceberg?',
      tags: ['senior'],
      answer: `<strong>Puffin</strong> is Iceberg's format for auxiliary statistics and indexes stored alongside a table. The most common blob is an <strong>NDV (number of distinct values) sketch</strong> — a Theta/HLL sketch per column.

<strong>Why it matters:</strong> cost-based optimizers (Trino, Spark CBO) need cardinality estimates to pick join orders and strategies. Column min/max in manifests help pruning, but they do not give distinct counts. Puffin sketches provide fast, approximate NDV so the optimizer plans joins well on huge tables.

You generate them with an analyze/compute-stats action; the optimizer reads the Puffin blobs referenced from metadata.`,
      code: `<span class="hi-cm">-- Compute NDV sketches for the optimizer</span>
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">compute_table_stats</span>(
  table => <span class="hi-str">'shopkart.orders.events'</span>,
  columns => <span class="hi-kw">array</span>(<span class="hi-str">'customer_id'</span>, <span class="hi-str">'product_id'</span>)
);</span>`,
      shopkart: '<strong>ShopKart:</strong> after computing NDV sketches, Trino reordered a 5-table join on orders — the CBO now builds the hash side from the smaller relation, cutting a reporting query from 90 s to 14 s.',
    },
    {
      q: 'How do time travel, rollback, and snapshot retention work together?',
      tags: ['intermediate'],
      answer: `<strong>Time travel</strong> reads a historical snapshot with <code>VERSION AS OF &lt;snapshot-id&gt;</code> or <code>TIMESTAMP AS OF &lt;ts&gt;</code> — the current pointer is untouched.
<strong>Rollback</strong> makes a past snapshot current again by writing a new metadata.json that points to it — an O(1) metadata operation, no data movement.
<strong>Retention</strong> bounds how far back you can go: <code>expireSnapshots</code> drops snapshots older than the window and garbage-collects files no live snapshot references.

The tension: long retention enables deep time travel/rollback but keeps more files (storage + planning cost); short retention reclaims storage but limits history and can break long-running readers. Tag important snapshots so retention never expires them.`,
      code: `<span class="hi-cm">-- Read + rollback</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> orders.events <span class="hi-kw">TIMESTAMP AS OF</span> <span class="hi-str">'2026-08-25 00:00:00'</span>;
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">rollback_to_snapshot</span>(<span class="hi-str">'orders.events'</span>, <span class="hi-str">3821904756</span>);
<span class="hi-cm">-- Retention: keep 30 days, min 5 snapshots</span>
<span class="hi-kw">CALL</span> catalog.system.<span class="hi-fn">expire_snapshots</span>(<span class="hi-str">'orders.events'</span>, <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-07-26 00:00:00'</span>, <span class="hi-str">5</span>);</span>`,
      shopkart: '<strong>ShopKart:</strong> a bad batch double-counted revenue; on-call rolled back orders.events to the prior snapshot in seconds while the pipeline was fixed — no restore-from-backup needed.',
    },
    {
      q: 'In Iceberg v2, how are delete files resolved against data files?',
      tags: ['senior'],
      answer: `Every snapshot (and the files it adds) carries a monotonically increasing <strong>sequence number</strong>. Delete files also carry one, and that ordering is how deletes apply.

<strong>Rule:</strong> a delete file with sequence number <em>S</em> applies to data files with sequence number <strong>≤ S</strong>. This ensures a delete only affects rows that existed when the delete was written, and never rows inserted afterward.

Two delete kinds:
<strong>Position deletes</strong> — (file_path, row_position) pairs; precise and cheap to apply, used by MoR update/delete on known rows.
<strong>Equality deletes</strong> — column-value predicates (e.g. customer_id = X); apply wherever they match across qualifying data files, used for CDC/GDPR where positions are unknown.

At read time the engine loads the relevant delete files for each data file (by sequence number + partition) and filters rows out during the scan.`,
      shopkart: '<strong>ShopKart:</strong> GDPR erasure emits equality deletes on customer_id; the CDC pipeline emits position deletes for updated orders. Sequence numbers guarantee a re-inserted order after an erasure is not wrongly deleted.',
    },
    {
      q: 'What is hidden partitioning, and how does it avoid classic Hive partitioning pitfalls?',
      tags: ['beginner', 'intermediate'],
      answer: `In Hive, partitioning is a physical directory layout and users must filter on the exact partition column (e.g. a separate <code>dt</code> string). Forget it and you full-scan; get the format wrong and you miss partitions.

<strong>Hidden partitioning:</strong> Iceberg stores a <em>partition transform</em> (e.g. <code>day(event_ts)</code>) in metadata and derives partition values itself. Users filter on the natural column (<code>event_ts</code>) and Iceberg prunes automatically. Benefits:

<strong>No leaky partition column</strong> — no synthetic <code>dt</code> to maintain or mis-format.
<strong>Correct pruning</strong> — the engine applies the transform to the predicate, so filters always prune.
<strong>Partition evolution</strong> — you can change the transform later without rewriting old data.

Transforms: identity, bucket(N), truncate(W), year/month/day/hour.`,
      code: `<span class="hi-kw">CREATE TABLE</span> orders.events (event_ts <span class="hi-kw">timestamp</span>, ...)
<span class="hi-kw">USING</span> iceberg <span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_ts));

<span class="hi-cm">-- User filters the natural column; Iceberg prunes partitions</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> orders.events
<span class="hi-kw">WHERE</span> event_ts &gt;= <span class="hi-str">'2026-08-01'</span> <span class="hi-kw">AND</span> event_ts &lt; <span class="hi-str">'2026-08-02'</span>;</span>`,
      shopkart: '<strong>ShopKart:</strong> the old Hive table needed a <code>dt=YYYY-MM-DD</code> column; analysts who filtered on the raw timestamp scanned everything. Hidden partitioning removed that footgun entirely.',
    },
    {
      q: 'You have a 10 TB Hive/Parquet table. How would you migrate it to Iceberg with minimal risk and no long downtime?',
      tags: ['advanced', 'senior'],
      answer: `The key realisation: migration generates <strong>metadata only</strong> — the existing Parquet files are reused in place, so a 10 TB table converts in minutes, not hours. There are three procedures:

<strong>1. snapshot</strong> — creates an independent Iceberg table that shares the source's data files. The source stays a Hive table. Use this first to test queries/engines against Iceberg with zero risk (it's throwaway).
<strong>2. migrate</strong> — in-place conversion. Keeps the table name, reuses the files, and leaves the original as <code>&lt;table&gt;__BACKUP_</code> so rollback is just re-pointing the name.
<strong>3. add_files</strong> — imports existing Parquet files into an already-created Iceberg table (handy when you want a custom schema/spec first). <code>register_table</code> instead attaches an orphaned metadata.json.

Playbook: snapshot → validate row counts & sample queries → migrate → re-validate → keep the backup for a cooldown window → drop it.`,
      code: `<span class="hi-cm">-- 1. Test safely (source untouched)</span>
<span class="hi-kw">CALL</span> catalog.system.snapshot(
  <span class="hi-str">'hive_db.orders'</span>, <span class="hi-str">'ice_db.orders_test'</span>);

<span class="hi-cm">-- 2. Convert in place (keeps the name)</span>
<span class="hi-kw">CALL</span> catalog.system.migrate(<span class="hi-str">'hive_db.orders'</span>);
<span class="hi-cm">-- original preserved as orders__BACKUP_</span>

<span class="hi-cm">-- 3. Import files into an existing Iceberg table</span>
<span class="hi-kw">CALL</span> catalog.system.add_files(
  table => <span class="hi-str">'ice_db.orders'</span>,
  source_table => <span class="hi-str">'hive_db.orders'</span>);`,
      shopkart: '<strong>ShopKart:</strong> migrated the 21.5B-row orders table from Hive using snapshot → migrate. Total data rewritten: 0 bytes. The cutover was a single atomic catalog pointer swap; the backup was kept for 14 days before being dropped.',
    },
    {
      q: 'What exactly happens to the data files during snapshot/migrate — are they copied or rewritten?',
      tags: ['intermediate'],
      answer: `Neither. Migration only <strong>reads Parquet footers</strong> (row counts, column min/max/null stats) to build Iceberg manifest files that <em>point at</em> the existing files. The row data is never read or copied.

Consequences to state in an interview:
<strong>Fast & cheap:</strong> cost is proportional to file <em>count</em> (metadata), not data <em>size</em>.
<strong>Files stay put:</strong> the Parquet files keep their original S3 paths; Iceberg just references them.
<strong>Layout is inherited:</strong> if the old table had millions of tiny files, the new Iceberg table has them too — schedule a <code>rewrite_data_files</code> compaction after migrating.
<strong>Don't delete the source files:</strong> after <code>add_files</code> the Iceberg table references the original files, so removing them (or the Hive table's storage) breaks the Iceberg table.`,
      shopkart: '<strong>ShopKart:</strong> right after migrating, planning was still slow because the Hive table had 4M tiny files. A one-off <code>rewrite_data_files</code> to 512 MB targets fixed it — the migration itself touched no data.',
    },
    {
      q: 'You need to feed only the CHANGES from an Iceberg table to a downstream mart every 5 minutes. How do you read changes out (not write them)?',
      tags: ['advanced', 'senior'],
      answer: `Two mechanisms, depending on what "changes" means:

<strong>1. Incremental append scan</strong> — read only files appended between two snapshots by setting <code>start-snapshot-id</code> and <code>end-snapshot-id</code> (or start/end timestamps). Cheap and simple, but it surfaces <em>appended files only</em> — it does NOT see row-level updates or deletes on existing rows.
<strong>2. Changelog view</strong> — <code>create_changelog_view</code> emits one row per change with <code>_change_type</code> (INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE), plus <code>_commit_snapshot_id</code> and <code>_change_ordinal</code>. This captures updates and deletes, i.e. true row-level CDC.

Resumable pattern: persist the last consumed snapshot id; next run uses it as the new <code>start</code>. Tie that to your engine's checkpoint for exactly-once, resumable sync.`,
      code: `<span class="hi-cm">-- Incremental append scan (Spark)</span>
spark.read.format(<span class="hi-str">"iceberg"</span>)
  .option(<span class="hi-str">"start-snapshot-id"</span>, lastId)
  .option(<span class="hi-str">"end-snapshot-id"</span>,   currentId)
  .load(<span class="hi-str">"prod.orders"</span>);

<span class="hi-cm">-- Row-level CDC out (updates + deletes)</span>
<span class="hi-kw">CALL</span> catalog.system.create_changelog_view(
  table => <span class="hi-str">'prod.orders'</span>,
  options => map(<span class="hi-str">'start-snapshot-id'</span>,<span class="hi-str">'S1'</span>,
                 <span class="hi-str">'end-snapshot-id'</span>,<span class="hi-str">'S4'</span>));
<span class="hi-kw">SELECT</span> _change_type, order_id, amount <span class="hi-kw">FROM</span> orders_changes;`,
      shopkart: '<strong>ShopKart:</strong> the curated orders mart syncs every 5 min via an incremental append scan for new orders, and a nightly changelog run to apply status updates and GDPR deletes — the last snapshot id is checkpointed so a restart never double-applies.',
    },
    {
      q: 'What are the gotchas of incremental reads in Iceberg?',
      tags: ['senior'],
      answer: `Three that senior interviewers look for:

<strong>1. Append scan is append-only.</strong> It reads files added between snapshots. Merge-on-Read deletes, overwrites, and row updates are invisible to it — use the <strong>changelog view</strong> when you need those.
<strong>2. The start snapshot must still exist.</strong> <code>expire_snapshots</code> can remove the snapshot your cursor points at, breaking the incremental bound. Keep retention longer than your worst-case downstream lag (and tag critical snapshots).
<strong>3. Requirements & ordering.</strong> Changelog needs format-version 2 and the snapshots in the range retained. Use <code>_change_ordinal</code> / <code>_commit_snapshot_id</code> to apply changes in the right order downstream; an UPDATE arrives as a matched BEFORE/AFTER pair.`,
      shopkart: '<strong>ShopKart:</strong> an incremental job broke after retention was cut to 3 days while a downstream consumer lagged 4 days — the start snapshot had been expired. Fix: 14-day retention floor, plus alerting when consumer lag approaches the retention window.',
    },
    {
      q: 'What is new in Iceberg format-version 3 compared to v2?',
      tags: ['advanced', 'senior'],
      answer: `The headline change is <strong>deletion vectors</strong>, plus several data-model additions:

<strong>Deletion vectors</strong> — a single compressed roaring bitmap per data file (stored in a Puffin file) replaces v2's pile of positional delete <em>files</em>. One vector per file instead of many small .avro deletes → far fewer files, faster planning and scans on high-churn tables.
<strong>Row lineage</strong> — every row gets a stable <code>_row_id</code> and a <code>_last_updated_sequence_number</code>, making change tracking / incremental processing cheap without diffing snapshots.
<strong>New types</strong> — <code>variant</code> (semi-structured JSON), <code>geometry</code>/<code>geography</code> (spatial), and nanosecond timestamps.
<strong>Default column values</strong> — a newly added column can carry a real default instead of only null.

Adopt v3 only when <em>every</em> engine that reads or writes the table supports it — a mixed fleet on older readers can't read v3 tables.`,
      shopkart: '<strong>ShopKart:</strong> the CDC-heavy orders table was accumulating millions of positional delete files between compactions. Moving it to v3 deletion vectors cut delete-side file count ~1000× and dropped read planning noticeably — after confirming Spark, Trino, and the Flink sink were all on v3-capable versions.',
    },
    {
      q: 'How do deletion vectors differ from v2 positional delete files, and why do they matter?',
      tags: ['senior'],
      answer: `Both implement Merge-on-Read deletes (mark rows deleted without rewriting the data file), but the storage differs:

<strong>v2 positional delete files:</strong> each delete operation writes a separate file of (file_path, row_position) pairs. Over time a hot data file can have hundreds or thousands of associated delete files, and every read must open and merge all of them.
<strong>v3 deletion vectors:</strong> one deletion vector per data file — a roaring bitmap of deleted row positions, stored in a Puffin blob and updated in place as more rows are deleted. A read applies a single bitmap.

Why it matters: it removes the delete-side small-file problem. Read cost stops scaling with the number of delete operations, planning is simpler, and compaction has far less delete-file cleanup to do. Positionally it's the same concept (delete by position); the win is the compact, single-file representation.`,
      shopkart: '<strong>ShopKart:</strong> before v3, a nightly job existed purely to compact positional delete files on the orders table. With deletion vectors that job largely went away — the vector is maintained per data file instead of spawning new delete files.',
    },
    {
      q: 'You run compaction nightly but still see thousands of tiny files each morning. What is wrong and how do you fix it at write time?',
      tags: ['advanced', 'senior'],
      answer: `Compaction is the safety net, not the fix — the files are being created tiny <em>on write</em>. The usual culprit is <code>write.distribution-mode = none</code>: with no shuffle, every writer task emits a file into every partition it holds rows for, so <code>tasks × partitions</code> tiny files land per commit.

Fix it where the files are made:
<strong>1. distribution-mode = hash</strong> — shuffle rows by partition key so each partition is written by few tasks (the sensible default for partitioned tables).
<strong>2. distribution-mode = range</strong> — range-partition on the sort order for the fewest, largest files <em>and</em> tight per-file min/max (best for clustered reads).
<strong>3. write.target-file-size-bytes</strong> — size files as they're written (512 MB default).
<strong>4. fanout-enabled</strong> — lets unsorted input still land in the right per-partition files (costs memory) instead of forcing a global pre-sort.

Then compaction only mops up the occasional straggler instead of doing the primary work.`,
      code: `<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events <span class="hi-kw">SET</span> <span class="hi-kw">TBLPROPERTIES</span> (
  <span class="hi-str">'write.distribution-mode'</span>      = <span class="hi-str">'hash'</span>,
  <span class="hi-str">'write.target-file-size-bytes'</span> = <span class="hi-str">'536870912'</span>,
  <span class="hi-str">'write.spark.fanout.enabled'</span>   = <span class="hi-str">'true'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> a Spark job with distribution-mode=none was producing ~2,000 sub-10 MB files per run on the orders table. Switching to hash distribution + a 512 MB target cut it to ~120 well-sized files per commit — before compaction even ran.',
    },
    {
      q: 'What are metrics modes (write.metadata.metrics) and how do they affect pruning?',
      tags: ['senior'],
      answer: `Manifests store per-column statistics (min/max bounds, null and value counts) that drive file pruning. <code>write.metadata.metrics</code> controls how much stat is stored per column:

<strong>full</strong> — full min/max/null/value counts. Best pruning, largest manifests.
<strong>truncate(N)</strong> — bounds truncated to N chars/bytes (default is truncate(16)). Balanced; the default.
<strong>counts</strong> — only null/value counts, no min/max → no range pruning on that column.
<strong>none</strong> — nothing stored → no pruning at all on that column.

The trade-off is manifest size vs pruning power. Wide columns (long strings, blobs, JSON payloads) with full metrics bloat manifests and slow planning while rarely being filtered on — turn those down to <code>counts</code> or <code>none</code>, and keep filter/join-key columns on <code>full</code> or <code>truncate</code>.`,
      code: `<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events <span class="hi-kw">SET</span> <span class="hi-kw">TBLPROPERTIES</span> (
  <span class="hi-str">'write.metadata.metrics.default'</span>          = <span class="hi-str">'truncate(16)'</span>,
  <span class="hi-str">'write.metadata.metrics.column.order_id'</span>   = <span class="hi-str">'full'</span>,
  <span class="hi-str">'write.metadata.metrics.column.raw_payload'</span> = <span class="hi-str">'none'</span>
);`,
      shopkart: '<strong>ShopKart:</strong> a 4 KB JSON payload column on full metrics was inflating manifests and slowing planning. Setting that one column to <code>none</code> (keeping order_id/customer_id on full) shrank manifests ~40% and sped up planning, with no pruning lost on the columns that are actually filtered.',
    },
    {
      q: 'What catalog options does Iceberg support, and how do you choose between them?',
      tags: ['intermediate'],
      answer: `The catalog maps a table name to its current metadata.json and performs the atomic commit. Options:

<strong>REST catalog</strong> — an HTTP spec any engine can call and any provider can implement (Tabular/Polaris, Unity, Nessie, Gravitino). Decouples engines from a specific metastore and enables server-side commit coordination, credential vending, and governance. The modern default for multi-engine shops.
<strong>Hive Metastore</strong> — classic and ubiquitous, but a shared-DB bottleneck and Hive-centric.
<strong>AWS Glue</strong> — managed metastore on AWS; convenient but AWS-bound.
<strong>JDBC</strong> — catalog state in a relational DB; simple to run.
<strong>Hadoop / filesystem</strong> — a pointer file in the table dir; simplest, but weak multi-writer guarantees on some object stores.
<strong>Nessie</strong> — git-like catalog with cross-table branches/tags.

Rule of thumb: REST for a governed, multi-engine lakehouse; Glue if you're all-in on AWS; Hive only for legacy compatibility; Hadoop for quick local/testing. (See the Catalog Explorer and Engine Integrations screens for the exact Spark/Trino/Flink config.)`,
      shopkart: '<strong>ShopKart:</strong> moved off Hive Metastore to a REST catalog so Spark (ETL), Trino (ad-hoc), and Snowflake (BI) share one governed catalog with centralized access control and no metastore-DB contention during Black Friday.',
    },
  ];

  /* ── Render ──────────────────────────────────────────────── */
  function _render(container) {
    _injectStyles();

    let activeFilter = 'all';
    let revealCount = 0;

    function _buildList() {
      const filtered = QA.filter(qa =>
        activeFilter === 'all' || qa.tags.includes(activeFilter)
      );
      if (!filtered.length) return '<div class="int-empty">No questions match this filter.</div>';
      return `<div class="int-qa-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="int-card" data-idx="${gi}">
          <div class="int-q-row">
            <div class="int-q-num">${i + 1}</div>
            <div class="int-q-main">
              <div class="int-q-text">${qa.q}</div>
              <div class="int-tags">
                ${qa.tags.map(t => `<span class="int-tag ${t}">${t}</span>`).join('')}
              </div>
            </div>
            <div class="int-q-chevron">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </div>
          </div>
          <div class="int-answer">
            <div class="int-answer-text">${qa.answer}</div>
            ${qa.code ? `<div class="int-answer-code">${qa.code}</div>` : ''}
            <div class="int-shopkart-note">${qa.shopkart}</div>
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    container.innerHTML = `
<div class="int-page">
  <div class="int-header">
    <div class="int-header-left">
      <h1>Interview Mode</h1>
      <p>Apache Iceberg — ${QA.length} interview questions across all levels. Click any question to reveal the answer.</p>
    </div>
    <div class="int-header-right">
      <div class="int-filter-row">
        <span class="int-filter-label">Filter:</span>
        <button class="int-btn active" data-filter="all">All</button>
        <button class="int-btn" data-filter="beginner">Beginner</button>
        <button class="int-btn" data-filter="intermediate">Intermediate</button>
        <button class="int-btn" data-filter="advanced">Advanced</button>
        <button class="int-btn" data-filter="senior">Senior</button>
      </div>
      <span class="int-progress-text" id="int-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="int-body" id="int-body">
    ${_buildList()}
  </div>
</div>`;

    function _updateProgress() {
      const revealed = container.querySelectorAll('.int-card.revealed').length;
      const prog = container.querySelector('#int-progress');
      if (prog) prog.textContent = `${revealed} / ${QA.length} revealed`;
    }

    container.querySelector('#int-body').addEventListener('click', (e) => {
      const card = e.target.closest('.int-card');
      if (!card) return;
      card.classList.toggle('revealed');
      _updateProgress();
    });

    container.querySelectorAll('.int-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.int-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        container.querySelector('#int-body').innerHTML = _buildList();
        _updateProgress();
        container.querySelector('#int-body').addEventListener('click', (e) => {
          const card = e.target.closest('.int-card');
          if (!card) return;
          card.classList.toggle('revealed');
          _updateProgress();
        });
      });
    });
  }

  IV.modules['interview'] = {
    id: 'interview',
    title: 'Interview Mode',
    group: 'learn',
    render: _render,
    destroy() {},
  };
})();
