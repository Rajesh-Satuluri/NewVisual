/* ============================================================
   Cheat Sheets Module
   5-tab reference guide for Apache Iceberg:
   DDL, DML, Time Travel, Maintenance, and Table Properties.
   All examples use ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('cs-styles')) return;
    const s = document.createElement('style');
    s.id = 'cs-styles';
    s.textContent = `
.cs-page {
  display:flex; flex-direction:column; height:100%; overflow:hidden;
}
.cs-header {
  padding:14px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
}
.cs-header h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 2px; }
.cs-header p { font-size:12px; color:var(--text-muted); margin:0; }
.cs-tabs {
  display:flex; gap:0; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0; overflow-x:auto;
}
.cs-tab {
  padding:10px 20px; font-size:12px; font-weight:600;
  color:var(--text-muted); cursor:pointer; border:none; background:none;
  border-bottom:2px solid transparent; transition:color .12s, border-color .12s;
  white-space:nowrap;
}
.cs-tab:hover { color:var(--text-secondary); }
.cs-tab.active { color:var(--blue); border-bottom-color:var(--blue); }
.cs-body { flex:1; overflow-y:auto; padding:20px 24px; }
.cs-content { max-width:920px; margin:0 auto; display:none; }
.cs-content.visible { display:block; }
.cs-section { margin-bottom:32px; }
.cs-section-title {
  font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:8px;
}
.cs-section-title::after {
  content:''; flex:1; height:1px; background:var(--border-subtle);
}
.cs-snippet-group { display:flex; flex-direction:column; gap:12px; }
.cs-snippet {
  border:1px solid var(--border-default); border-radius:8px;
  background:var(--bg-2); overflow:hidden;
}
.cs-snippet-header {
  padding:8px 14px; display:flex; align-items:center;
  justify-content:space-between; border-bottom:1px solid var(--border-subtle);
  background:var(--bg-3);
}
.cs-snippet-title { font-size:12px; font-weight:600; color:var(--text-secondary); }
.cs-copy-btn {
  font-size:10px; padding:3px 8px; border-radius:4px;
  border:1px solid var(--border-default); background:var(--bg-4);
  color:var(--text-muted); cursor:pointer; transition:all .12s;
}
.cs-copy-btn:hover { background:var(--bg-3); color:var(--text-primary); }
.cs-copy-btn.copied { color:var(--green); border-color:var(--green); }
.cs-code {
  padding:14px 16px; font-family:var(--font-mono); font-size:11.5px;
  color:var(--text-secondary); line-height:1.7; white-space:pre; overflow-x:auto;
}
.cs-code .hi-kw  { color:var(--blue); }
.cs-code .hi-str { color:var(--green); }
.cs-code .hi-num { color:var(--orange); }
.cs-code .hi-cm  { color:var(--text-muted); font-style:italic; }
.cs-code .hi-fn  { color:#e8c07a; }
.cs-code .hi-type { color:var(--purple); }
.cs-two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cs-note {
  font-size:11.5px; color:var(--text-muted); background:rgba(74,174,255,.06);
  border-left:3px solid var(--blue); border-radius:0 6px 6px 0;
  padding:8px 12px; line-height:1.55; margin-bottom:12px;
}
.cs-note strong { color:var(--blue); }
.cs-props-table { width:100%; border-collapse:collapse; }
.cs-props-table th {
  text-align:left; font-size:11px; font-weight:700; color:var(--text-muted);
  text-transform:uppercase; letter-spacing:.05em;
  padding:6px 12px; border-bottom:1px solid var(--border-default);
}
.cs-props-table td {
  padding:7px 12px; border-bottom:1px solid var(--border-subtle);
  font-size:12px; color:var(--text-secondary); vertical-align:top;
}
.cs-props-table tr:last-child td { border-bottom:none; }
.cs-props-table td:first-child {
  font-family:var(--font-mono); font-size:11px; color:var(--green);
  white-space:nowrap;
}
.cs-props-table td:nth-child(2) {
  font-family:var(--font-mono); font-size:11px; color:var(--orange);
}
@media (max-width:640px) {
  .cs-two-col { grid-template-columns:1fr; }
}
`;
    document.head.appendChild(s);
  }

  /* ── Tab data ────────────────────────────────────────────── */
  const TABS = [
    { id: 'ddl',         label: 'DDL' },
    { id: 'dml',         label: 'DML' },
    { id: 'timetravel',  label: 'Time Travel' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'properties',  label: 'Properties' },
  ];

  /* ── DDL snippets ────────────────────────────────────────── */
  const DDL_SECTIONS = [
    {
      title: 'CREATE TABLE',
      snippets: [
        {
          title: 'Basic Iceberg table (ShopKart orders)',
          code: `<span class="hi-cm">-- Spark SQL</span>
<span class="hi-kw">CREATE TABLE</span> shopkart.orders.events (
  order_id         <span class="hi-type">BIGINT</span>        <span class="hi-kw">NOT NULL</span>,
  customer_id      <span class="hi-type">BIGINT</span>        <span class="hi-kw">NOT NULL</span>,
  event_date       <span class="hi-type">DATE</span>          <span class="hi-kw">NOT NULL</span>,
  product_category <span class="hi-type">STRING</span>,
  order_amount     <span class="hi-type">DECIMAL(12,2)</span>,
  order_status     <span class="hi-type">STRING</span>,
  created_at       <span class="hi-type">TIMESTAMP</span>
)
<span class="hi-kw">USING</span> iceberg
<span class="hi-kw">PARTITIONED BY</span> (<span class="hi-fn">days</span>(event_date), product_category)
<span class="hi-kw">TBLPROPERTIES</span> (
  <span class="hi-str">'format-version'</span> = <span class="hi-str">'2'</span>,
  <span class="hi-str">'write.target-file-size-bytes'</span> = <span class="hi-str">'134217728'</span>
);`,
        },
        {
          title: 'CREATE TABLE AS SELECT (CTAS)',
          code: `<span class="hi-kw">CREATE TABLE</span> shopkart.analytics.daily_summary
<span class="hi-kw">USING</span> iceberg
<span class="hi-kw">PARTITIONED BY</span> (event_date)
<span class="hi-kw">AS SELECT</span>
  event_date,
  product_category,
  <span class="hi-fn">COUNT</span>(*) <span class="hi-kw">AS</span> order_count,
  <span class="hi-fn">SUM</span>(order_amount) <span class="hi-kw">AS</span> total_revenue
<span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">GROUP BY</span> <span class="hi-num">1</span>, <span class="hi-num">2</span>;`,
        },
      ],
    },
    {
      title: 'ALTER TABLE — Schema Evolution',
      snippets: [
        {
          title: 'Add, rename, drop, widen columns',
          code: `<span class="hi-cm">-- Add column (old files return NULL)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ADD COLUMN</span> loyalty_points <span class="hi-type">BIGINT</span>;

<span class="hi-cm">-- Rename column (field_id unchanged)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">RENAME COLUMN</span> order_amount <span class="hi-kw">TO</span> total_amount;

<span class="hi-cm">-- Drop column (data stays in old files)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">DROP COLUMN</span> legacy_flag;

<span class="hi-cm">-- Widen column type (safe widening only)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
  <span class="hi-kw">ALTER COLUMN</span> order_amount <span class="hi-kw">TYPE</span> <span class="hi-type">DOUBLE</span>;`,
        },
        {
          title: 'Partition evolution',
          code: `<span class="hi-cm">-- Replace monthly with daily partition</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">REPLACE PARTITION FIELD</span>
  <span class="hi-fn">months</span>(event_date)
  <span class="hi-kw">WITH</span> <span class="hi-fn">days</span>(event_date);

<span class="hi-cm">-- Add partition field (multi-level)</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">ADD PARTITION FIELD</span> <span class="hi-fn">truncate</span>(customer_id, <span class="hi-num">1000</span>);

<span class="hi-cm">-- Remove partition field</span>
<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">DROP PARTITION FIELD</span> product_category;`,
        },
      ],
    },
    {
      title: 'Table Properties',
      snippets: [
        {
          title: 'Set and unset table properties',
          code: `<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">SET TBLPROPERTIES</span> (
  <span class="hi-str">'write.delete.mode'</span>          = <span class="hi-str">'merge-on-read'</span>,
  <span class="hi-str">'write.target-file-size-bytes'</span> = <span class="hi-str">'268435456'</span>,
  <span class="hi-str">'read.split.target-size'</span>       = <span class="hi-str">'134217728'</span>
);

<span class="hi-kw">ALTER TABLE</span> shopkart.orders.events
<span class="hi-kw">UNSET TBLPROPERTIES</span> (<span class="hi-str">'write.delete.mode'</span>);`,
        },
      ],
    },
  ];

  /* ── DML snippets ────────────────────────────────────────── */
  const DML_SECTIONS = [
    {
      title: 'Write Operations',
      snippets: [
        {
          title: 'INSERT INTO (append)',
          code: `<span class="hi-cm">-- Append rows from Kafka batch</span>
<span class="hi-kw">INSERT INTO</span> shopkart.orders.events
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> kafka_stream
<span class="hi-kw">WHERE</span> offset <span class="hi-kw">BETWEEN</span> <span class="hi-num">9821000</span> <span class="hi-kw">AND</span> <span class="hi-num">9946000</span>;`,
        },
        {
          title: 'INSERT OVERWRITE (Dynamic Partition Overwrite)',
          code: `<span class="hi-cm">-- Overwrite only the partitions produced by the SELECT</span>
<span class="hi-cm">-- (Dynamic Partition Overwrite — default in Iceberg)</span>
<span class="hi-kw">INSERT OVERWRITE</span> shopkart.analytics.daily_summary
<span class="hi-kw">SELECT</span>
  event_date,
  product_category,
  <span class="hi-fn">COUNT</span>(*) <span class="hi-kw">AS</span> order_count,
  <span class="hi-fn">SUM</span>(order_amount) <span class="hi-kw">AS</span> total_revenue
<span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">WHERE</span> event_date = <span class="hi-str">'2026-08-01'</span>
<span class="hi-kw">GROUP BY</span> <span class="hi-num">1</span>, <span class="hi-num">2</span>;
<span class="hi-cm">-- Only event_date=2026-08-01 partitions are replaced</span>`,
        },
        {
          title: 'UPDATE rows',
          code: `<span class="hi-cm">-- Update order status (CoW by default)</span>
<span class="hi-kw">UPDATE</span> shopkart.orders.events
<span class="hi-kw">SET</span> order_status = <span class="hi-str">'DELIVERED'</span>,
    updated_at   = <span class="hi-fn">CURRENT_TIMESTAMP</span>()
<span class="hi-kw">WHERE</span> order_id = <span class="hi-num">9000012345</span>
  <span class="hi-kw">AND</span> event_date = <span class="hi-str">'2026-08-01'</span>;`,
        },
        {
          title: 'DELETE rows',
          code: `<span class="hi-cm">-- GDPR deletion by customer_id</span>
<span class="hi-kw">DELETE FROM</span> shopkart.orders.events
<span class="hi-kw">WHERE</span> customer_id = <span class="hi-num">7841290</span>;

<span class="hi-cm">-- Partition-scoped delete (faster)</span>
<span class="hi-kw">DELETE FROM</span> shopkart.orders.events
<span class="hi-kw">WHERE</span> event_date = <span class="hi-str">'2026-07-15'</span>
  <span class="hi-kw">AND</span> order_status = <span class="hi-str">'CANCELLED'</span>;`,
        },
        {
          title: 'MERGE INTO (CDC upsert)',
          code: `<span class="hi-kw">MERGE INTO</span> shopkart.orders.events t
<span class="hi-kw">USING</span> staging.cdc_batch s
  <span class="hi-kw">ON</span> t.order_id = s.order_id
  <span class="hi-kw">AND</span> t.event_date = s.event_date
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'U'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">UPDATE SET</span> *
<span class="hi-kw">WHEN MATCHED AND</span> s.op = <span class="hi-str">'D'</span> <span class="hi-kw">THEN</span>
  <span class="hi-kw">DELETE</span>
<span class="hi-kw">WHEN NOT MATCHED THEN</span>
  <span class="hi-kw">INSERT</span> *;`,
        },
      ],
    },
  ];

  /* ── Time Travel snippets ────────────────────────────────── */
  const TT_SECTIONS = [
    {
      title: 'Query Historical Snapshots',
      snippets: [
        {
          title: 'AS OF TIMESTAMP',
          code: `<span class="hi-cm">-- Query data as it was at a specific time</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">TIMESTAMP AS OF</span> <span class="hi-str">'2026-07-31 23:59:59'</span>;

<span class="hi-cm">-- With predicate</span>
<span class="hi-kw">SELECT</span> <span class="hi-fn">COUNT</span>(*) <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">TIMESTAMP AS OF</span> <span class="hi-str">'2026-07-31 23:59:59'</span>
<span class="hi-kw">WHERE</span> event_date = <span class="hi-str">'2026-07-31'</span>;`,
        },
        {
          title: 'AS OF snapshot-id',
          code: `<span class="hi-cm">-- Query a specific snapshot by ID</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events
<span class="hi-kw">VERSION AS OF</span> <span class="hi-num">9821443008</span>;

<span class="hi-cm">-- List all snapshots to find the right one</span>
<span class="hi-kw">SELECT</span> snapshot_id, committed_at, operation,
       summary[<span class="hi-str">'added-records'</span>] <span class="hi-kw">AS</span> added_rows
<span class="hi-kw">FROM</span> shopkart.orders.events.snapshots
<span class="hi-kw">ORDER BY</span> committed_at <span class="hi-kw">DESC</span>
<span class="hi-kw">LIMIT</span> <span class="hi-num">10</span>;`,
        },
      ],
    },
    {
      title: 'Rollback & Restore',
      snippets: [
        {
          title: 'ROLLBACK to snapshot (Spark)',
          code: `<span class="hi-cm">-- ShopKart incident recovery: rollback 4 min</span>
<span class="hi-kw">CALL</span> shopkart.system.rollback_to_snapshot(
  table       => <span class="hi-str">'orders.events'</span>,
  snapshot_id => <span class="hi-num">9821443008</span>
);

<span class="hi-cm">-- Or rollback to a timestamp</span>
<span class="hi-kw">CALL</span> shopkart.system.rollback_to_timestamp(
  table       => <span class="hi-str">'orders.events'</span>,
  timestamp   => <span class="hi-kw">TIMESTAMP</span> <span class="hi-str">'2026-08-01 01:30:00'</span>
);`,
        },
        {
          title: 'Metadata tables for inspection',
          code: `<span class="hi-cm">-- Snapshot history</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events.history;

<span class="hi-cm">-- Manifest files in current snapshot</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events.manifests;

<span class="hi-cm">-- All data files with stats</span>
<span class="hi-kw">SELECT</span> file_path, record_count, file_size_in_bytes
<span class="hi-kw">FROM</span> shopkart.orders.events.files
<span class="hi-kw">ORDER BY</span> file_size_in_bytes <span class="hi-kw">DESC</span>
<span class="hi-kw">LIMIT</span> <span class="hi-num">20</span>;

<span class="hi-cm">-- Partition statistics</span>
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> shopkart.orders.events.partitions;`,
        },
      ],
    },
    {
      title: 'Incremental & Changelog Reads (CDC out)',
      snippets: [
        {
          title: 'Incremental append scan (appended rows only)',
          code: `<span class="hi-cm">-- Spark: read only files appended between two snapshots</span>
spark.read.format(<span class="hi-str">"iceberg"</span>)
  .option(<span class="hi-str">"start-snapshot-id"</span>, <span class="hi-num">9821443008</span>)  <span class="hi-cm">-- last consumed</span>
  .option(<span class="hi-str">"end-snapshot-id"</span>,   <span class="hi-num">9821443991</span>)  <span class="hi-cm">-- current</span>
  .load(<span class="hi-str">"shopkart.orders.events"</span>);
<span class="hi-cm">-- Appends only — does NOT include updates/deletes.
-- Checkpoint end-snapshot-id → next run's start.</span>`,
        },
        {
          title: 'Changelog view — row-level INSERT/UPDATE/DELETE',
          code: `<span class="hi-kw">CALL</span> shopkart.system.create_changelog_view(
  table   => <span class="hi-str">'orders.events'</span>,
  options => map(
    <span class="hi-str">'start-snapshot-id'</span>, <span class="hi-str">'9821443008'</span>,
    <span class="hi-str">'end-snapshot-id'</span>,   <span class="hi-str">'9821443991'</span>),
  changelog_view => <span class="hi-str">'orders_changes'</span>
);

<span class="hi-kw">SELECT</span> _change_type,   <span class="hi-cm">-- INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE</span>
       _commit_snapshot_id, _change_ordinal,
       order_id, order_status
<span class="hi-kw">FROM</span> orders_changes
<span class="hi-kw">ORDER BY</span> _change_ordinal;`,
        },
      ],
    },
  ];

  /* ── Maintenance snippets ────────────────────────────────── */
  const MAINT_SECTIONS = [
    {
      title: 'Compaction',
      snippets: [
        {
          title: 'rewrite_data_files — compact small files',
          code: `<span class="hi-cm">-- Binpack: merge small files into ~128 MB</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table    => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'binpack'</span>,
  options  => map(
    <span class="hi-str">'target-file-size-bytes'</span>, <span class="hi-str">'134217728'</span>,
    <span class="hi-str">'min-input-files'</span>,       <span class="hi-str">'5'</span>
  )
);

<span class="hi-cm">-- Sort: compacts + sorts by cluster key</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_data_files(
  table    => <span class="hi-str">'orders.events'</span>,
  strategy => <span class="hi-str">'sort'</span>,
  sort_order => <span class="hi-str">'customer_id ASC NULLS LAST,
                 event_date ASC'</span>
);`,
        },
        {
          title: 'rewrite_manifests — compact manifest files',
          code: `<span class="hi-cm">-- Compact many small manifest files into fewer</span>
<span class="hi-kw">CALL</span> shopkart.system.rewrite_manifests(
  table => <span class="hi-str">'orders.events'</span>
);
<span class="hi-cm">-- Run after many small appends (streaming)
-- Reduces manifest scan overhead at query time</span>`,
        },
      ],
    },
    {
      title: 'Snapshot Expiry & Orphan Cleanup',
      snippets: [
        {
          title: 'expire_snapshots',
          code: `<span class="hi-cm">-- Remove snapshots older than 7 days</span>
<span class="hi-kw">CALL</span> shopkart.system.expire_snapshots(
  table               => <span class="hi-str">'orders.events'</span>,
  older_than          => <span class="hi-fn">TIMESTAMPADD</span>(<span class="hi-type">DAY</span>, -<span class="hi-num">7</span>,
                            <span class="hi-fn">CURRENT_TIMESTAMP</span>()),
  retain_last         => <span class="hi-num">7</span>,
  max_concurrent_deletes => <span class="hi-num">4</span>
);
<span class="hi-cm">-- Deletes: snapshot metadata + unreferenced
--          manifest lists, manifests, data files</span>`,
        },
        {
          title: 'remove_orphan_files',
          code: `<span class="hi-cm">-- Delete files not referenced by any snapshot</span>
<span class="hi-kw">CALL</span> shopkart.system.remove_orphan_files(
  table      => <span class="hi-str">'orders.events'</span>,
  older_than => <span class="hi-fn">TIMESTAMPADD</span>(<span class="hi-type">DAY</span>, -<span class="hi-num">7</span>,
                  <span class="hi-fn">CURRENT_TIMESTAMP</span>()),
  dry_run    => <span class="hi-kw">false</span>
);
<span class="hi-cm">-- Safe: reads all metadata first, then diffs
-- Run dry_run=true first to preview
-- Schedule: weekly</span>`,
        },
      ],
    },
    {
      title: 'Migrate from Hive / Parquet',
      snippets: [
        {
          title: 'snapshot · migrate · add_files (no data rewrite)',
          code: `<span class="hi-cm">-- 1. Test safely: independent copy, source stays Hive</span>
<span class="hi-kw">CALL</span> shopkart.system.snapshot(
  <span class="hi-str">'hive_db.orders'</span>, <span class="hi-str">'shopkart.orders.events_test'</span>
);

<span class="hi-cm">-- 2. In-place conversion (keeps name; leaves __BACKUP_)</span>
<span class="hi-kw">CALL</span> shopkart.system.migrate(<span class="hi-str">'hive_db.orders'</span>);

<span class="hi-cm">-- 3. Import existing Parquet into an Iceberg table</span>
<span class="hi-kw">CALL</span> shopkart.system.add_files(
  table        => <span class="hi-str">'shopkart.orders.events'</span>,
  source_table => <span class="hi-str">'hive_db.orders'</span>
);
<span class="hi-cm">-- Only metadata is written — 0 bytes of data rewritten.
-- After migrating, compact tiny files with rewrite_data_files.</span>`,
        },
      ],
    },
  ];

  /* ── Properties table data ───────────────────────────────── */
  const PROPERTIES = [
    { key: 'format-version', default: '1', desc: 'Iceberg spec version: 2 = row-level deletes + OCC; 3 = deletion vectors, row lineage, variant/geo types, default values (upgrade only when all engines support it)' },
    { key: 'write.target-file-size-bytes', default: '536870912', desc: 'Target output file size (512 MB). Tune smaller for streaming.' },
    { key: 'write.delete.mode', default: 'copy-on-write', desc: 'Row delete strategy: copy-on-write or merge-on-read' },
    { key: 'write.update.mode', default: 'copy-on-write', desc: 'Row update strategy: copy-on-write or merge-on-read' },
    { key: 'write.merge.mode', default: 'copy-on-write', desc: 'MERGE INTO strategy: copy-on-write or merge-on-read' },
    { key: 'write.distribution-mode', default: 'none', desc: 'Output distribution: none (no shuffle → tiny files) | hash (shuffle by partition) | range (range+sort → fewest/largest files, tight min/max)' },
    { key: 'write.spark.fanout.enabled', default: 'false', desc: 'Keep one open writer per partition so unsorted input lands in the right files without a pre-sort (costs memory)' },
    { key: 'write.metadata.metrics.default', default: 'truncate(16)', desc: 'Per-column stats stored in manifests: full | truncate(N) | counts | none. Override per column with write.metadata.metrics.column.<name>' },
    { key: 'write.parquet.bloom-filter-enabled.column.X', default: 'false', desc: 'Enable Bloom filter for column X (high-cardinality join keys)' },
    { key: 'read.split.target-size', default: '134217728', desc: 'Target bytes per Spark task (128 MB default)' },
    { key: 'read.split.open-file-cost', default: '4194304', desc: 'Assumed cost to open a file (4 MB). Increase for object stores.' },
    { key: 'history.expire.max-snapshot-age-ms', default: null, desc: 'Auto-expire snapshots older than N ms (requires catalog support)' },
    { key: 'write.metadata.delete-after-commit.enabled', default: 'false', desc: 'Auto-delete old metadata.json files after each commit' },
    { key: 'write.metadata.previous-versions-max', default: '100', desc: 'Max old metadata.json versions to keep' },
    { key: 'commit.retry.num-retries', default: '4', desc: 'OCC commit retry count on conflict' },
    { key: 'commit.retry.min-wait-ms', default: '100', desc: 'Minimum ms to wait before OCC retry' },
    { key: 'commit.retry.max-wait-ms', default: '60000', desc: 'Maximum ms to wait before OCC retry' },
  ];

  /* ── Render helpers ─────────────────────────────────────── */
  function _snippetHtml(snip) {
    const escapedCode = snip.code.replace(/`/g, '\\`');
    return `<div class="cs-snippet">
      <div class="cs-snippet-header">
        <div class="cs-snippet-title">${snip.title}</div>
        <button class="cs-copy-btn" data-code="${encodeURIComponent(snip.code.replace(/<[^>]+>/g, ''))}">Copy</button>
      </div>
      <div class="cs-code">${snip.code}</div>
    </div>`;
  }

  function _sectionHtml(sec) {
    return `<div class="cs-section">
      <div class="cs-section-title">${sec.title}</div>
      <div class="cs-snippet-group">${sec.snippets.map(_snippetHtml).join('')}</div>
    </div>`;
  }

  /* ── Render ──────────────────────────────────────────────── */
  function _render(container) {
    _injectStyles();

    const propsRows = PROPERTIES.map(p =>
      `<tr>
        <td>${p.key}</td>
        <td>${p.default || '—'}</td>
        <td>${p.desc}</td>
      </tr>`
    ).join('');

    container.innerHTML = `
<div class="cs-page">
  <div class="cs-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div>
      <h1>Cheat Sheets</h1>
      <p>Apache Iceberg — quick reference for DDL, DML, time travel, maintenance, and properties</p>
    </div>
    <button class="btn-secondary cs-print" type="button" onclick="window.print()" title="Print or save as PDF" style="flex-shrink:0">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>Print / Save PDF
    </button>
  </div>
  <div class="cs-tabs">
    ${TABS.map((t, i) => `<button class="cs-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
  </div>
  <div class="cs-body">

    <!-- DDL -->
    <div class="cs-content visible" id="cs-ddl">
      <div class="cs-note"><strong>ShopKart context:</strong> All DDL examples use the shopkart catalog (REST). Format version 2 enables row-level deletes and OCC. Hidden partitioning via <code>days(event_date)</code> is the standard at ShopKart.</div>
      ${DDL_SECTIONS.map(_sectionHtml).join('')}
    </div>

    <!-- DML -->
    <div class="cs-content" id="cs-dml">
      <div class="cs-note"><strong>Write modes:</strong> ShopKart streaming tables use <code>merge-on-read</code> for INSERT/UPDATE/DELETE (fast writes). Batch aggregation tables use <code>copy-on-write</code> (fast reads). MERGE INTO handles the CDC pipeline every 5 minutes.</div>
      ${DML_SECTIONS.map(_sectionHtml).join('')}
    </div>

    <!-- Time Travel -->
    <div class="cs-content" id="cs-timetravel">
      <div class="cs-note"><strong>Incident recovery:</strong> Incident SK-2023-0412 was resolved in 4 minutes using <code>CALL system.rollback_to_snapshot()</code>. Always note the snapshot-id before running any bulk DML — it's your escape hatch.</div>
      ${TT_SECTIONS.map(_sectionHtml).join('')}
    </div>

    <!-- Maintenance -->
    <div class="cs-content" id="cs-maintenance">
      <div class="cs-note"><strong>ShopKart schedule:</strong> rewrite_data_files runs nightly (2 AM UTC), expire_snapshots runs daily (3 AM UTC, 7-day retention), remove_orphan_files runs weekly (Sunday 4 AM UTC). rewrite_manifests runs after every streaming ingestion window.</div>
      ${MAINT_SECTIONS.map(_sectionHtml).join('')}
    </div>

    <!-- Properties -->
    <div class="cs-content" id="cs-properties">
      <div class="cs-note"><strong>Key defaults to change:</strong> Set <code>format-version=2</code> for all new tables. For streaming tables, set <code>write.delete.mode=merge-on-read</code> and <code>write.target-file-size-bytes=67108864</code> (64 MB). Enable Bloom filters on join-key columns.</div>
      <div class="cs-section">
        <div class="cs-section-title">Table Properties Reference</div>
        <div class="cs-snippet">
          <div style="overflow-x:auto">
            <table class="cs-props-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>${propsRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>`;

    container.querySelectorAll('.cs-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cs-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.querySelectorAll('.cs-content').forEach(c => c.classList.remove('visible'));
        const target = container.querySelector(`#cs-${btn.dataset.tab}`);
        if (target) target.classList.add('visible');
      });
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.cs-copy-btn');
      if (!btn) return;
      const raw = decodeURIComponent(btn.dataset.code);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
        }).catch(() => {});
      }
    });
  }

  IV.modules['cheatsheet'] = {
    id: 'cheatsheet',
    title: 'Cheat Sheets',
    group: 'learn',
    render: _render,
    destroy() {},
  };
})();
