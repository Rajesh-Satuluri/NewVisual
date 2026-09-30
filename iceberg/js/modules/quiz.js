/* ============================================================
   Quiz Module
   10-question multiple-choice quiz covering Apache Iceberg
   fundamentals through advanced topics. Tracks score, shows
   explanations, and provides a final summary report.
   ShopKart context woven through all questions.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('qz-styles')) return;
    const s = document.createElement('style');
    s.id = 'qz-styles';
    s.textContent = `
.qz-page {
  display:flex; flex-direction:column; height:100%; overflow:hidden;
}
.qz-header {
  padding:14px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  flex-wrap:wrap;
}
.qz-header-title { font-size:16px; font-weight:700; color:var(--text-primary); }
.qz-header-meta { font-size:12px; color:var(--text-muted); }
.qz-progress-bar {
  height:4px; background:var(--bg-3); position:relative;
  flex-shrink:0;
}
.qz-progress-fill {
  height:100%; background:var(--blue); transition:width .3s ease; border-radius:0 2px 2px 0;
}
.qz-body { flex:1; overflow-y:auto; padding:24px; display:flex; justify-content:center; }
.qz-card {
  width:100%; max-width:720px;
}
.qz-q-header {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:8px;
}
.qz-q-num { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; }
.qz-q-score-badge {
  font-size:11px; font-weight:700; padding:3px 10px; border-radius:4px;
}
.qz-q-score-badge.correct { background:rgba(63,185,80,.15); color:var(--green); }
.qz-q-score-badge.incorrect { background:rgba(248,81,73,.15); color:var(--red); }
.qz-q-text {
  font-size:16px; font-weight:600; color:var(--text-primary);
  line-height:1.45; margin-bottom:20px;
}
.qz-options { display:flex; flex-direction:column; gap:10px; }
.qz-option {
  display:flex; align-items:flex-start; gap:12px;
  padding:13px 16px; border-radius:8px;
  border:1.5px solid var(--border-default);
  background:var(--bg-2); cursor:pointer;
  transition:border-color .12s, background .12s;
  user-select:none;
}
.qz-option:hover:not(.answered) { border-color:var(--blue); background:rgba(74,174,255,.05); }
.qz-option.selected { border-color:var(--blue); background:rgba(74,174,255,.1); }
.qz-option.correct-ans { border-color:var(--green); background:rgba(63,185,80,.1); }
.qz-option.wrong-ans { border-color:var(--red); background:rgba(248,81,73,.08); }
.qz-option.answered { cursor:default; }
.qz-opt-letter {
  width:26px; height:26px; border-radius:50%;
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:var(--text-muted);
  flex-shrink:0;
}
.qz-option.selected    .qz-opt-letter { border-color:var(--blue);  color:var(--blue); }
.qz-option.correct-ans .qz-opt-letter { border-color:var(--green); color:var(--green); background:rgba(63,185,80,.2); }
.qz-option.wrong-ans   .qz-opt-letter { border-color:var(--red);   color:var(--red); }
.qz-opt-text { font-size:13.5px; color:var(--text-secondary); line-height:1.4; padding-top:3px; }
.qz-option.correct-ans .qz-opt-text,
.qz-option.selected    .qz-opt-text { color:var(--text-primary); }
.qz-explanation {
  margin-top:16px; padding:14px 16px; border-radius:8px;
  background:var(--bg-3); border:1px solid var(--border-subtle);
  font-size:13px; color:var(--text-secondary); line-height:1.6;
  display:none;
}
.qz-explanation.visible { display:block; }
.qz-explanation strong { color:var(--text-primary); }
.qz-explanation .qz-exp-correct { color:var(--green); font-weight:700; }
.qz-explanation .qz-exp-wrong   { color:var(--red);   font-weight:700; }
.qz-nav-row {
  display:flex; justify-content:space-between; align-items:center;
  margin-top:24px;
}
.qz-btn {
  padding:9px 20px; border-radius:8px; border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:13px;
  cursor:pointer; font-weight:600; transition:all .12s;
}
.qz-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.qz-btn.primary { background:var(--blue); border-color:var(--blue); color:#fff; }
.qz-btn.primary:hover { opacity:.9; }
.qz-btn:disabled { opacity:.35; cursor:not-allowed; }
.qz-dot-row { display:flex; gap:6px; }
.qz-dot {
  width:10px; height:10px; border-radius:50%;
  background:var(--bg-4); border:1.5px solid var(--border-default);
  transition:background .2s;
}
.qz-dot.current  { border-color:var(--blue); background:var(--blue); }
.qz-dot.correct  { background:var(--green); border-color:var(--green); }
.qz-dot.incorrect { background:var(--red); border-color:var(--red); }

/* Results screen */
.qz-results { text-align:center; padding:40px 24px; max-width:600px; margin:0 auto; }
.qz-results-score {
  font-size:72px; font-weight:800; line-height:1; margin-bottom:4px;
}
.qz-results-label { font-size:14px; color:var(--text-muted); margin-bottom:32px; }
.qz-results-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; }
.qz-results-cell {
  background:var(--bg-2); border:1px solid var(--border-default); border-radius:10px;
  padding:16px; text-align:center;
}
.qz-results-cell-val { font-size:28px; font-weight:700; margin-bottom:4px; }
.qz-results-cell-label { font-size:11px; color:var(--text-muted); }
.qz-results-grade {
  font-size:18px; font-weight:700; margin-bottom:8px; color:var(--text-primary);
}
.qz-results-desc { font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:28px; }
`;
    document.head.appendChild(s);
  }

  /* ── Quiz data ───────────────────────────────────────────── */
  const QUESTIONS = [
    {
      q: 'ShopKart\'s orders.events query filters on event_date = \'2026-08-01\'. The table has 800M files. What is the FIRST layer of pruning Iceberg applies?',
      options: [
        'Column-level min/max statistics in manifest files',
        'Partition pruning — skip partitions not matching event_date',
        'Bloom filter lookup on the event_date column',
        'The query planner reads all 800M Parquet file footers',
      ],
      correct: 1,
      explanation: 'Partition pruning is the first and most powerful layer. Iceberg reads the manifest list (small, MB-range) and skips all partitions whose event_date bounds don\'t match 2026-08-01. Column stats and Bloom filters come later.',
    },
    {
      q: 'In Iceberg\'s metadata hierarchy, which file contains the current-snapshot-id?',
      options: [
        'The manifest list (.avro file)',
        'A manifest file (.avro)',
        'metadata.json',
        'The Parquet data file footer',
      ],
      correct: 2,
      explanation: 'metadata.json is the root of the Iceberg metadata hierarchy. It contains the current-snapshot-id, all snapshot objects, the schema, partition specs, and sort orders. The catalog maps table name → metadata.json path.',
    },
    {
      q: 'ShopKart runs a DELETE on orders.events in CoW mode. What happens to the original Parquet files?',
      options: [
        'A small delete file (.avro) is written alongside the original file',
        'The original file is marked as DELETED in the manifest — no rewrite',
        'The affected Parquet files are fully rewritten without the deleted rows',
        'The rows are soft-deleted with a tombstone flag in the Parquet footer',
      ],
      correct: 2,
      explanation: 'In Copy-on-Write (CoW) mode, the entire affected data file is rewritten with the deleted rows removed. A new data file is added and the old one is removed from the new manifest. This makes reads fast but writes expensive.',
    },
    {
      q: 'After a schema evolution ALTER TABLE … ADD COLUMN loyalty_points BIGINT, what happens when a query reads old Parquet files written before this change?',
      options: [
        'The query fails — old files have a different schema',
        'Old files return NULL for loyalty_points — no rewrite needed',
        'Iceberg automatically backfills the column with 0',
        'The query engine must use a schema compatibility mode flag',
      ],
      correct: 1,
      explanation: 'Iceberg tracks columns by integer field IDs, not names or positions. When a new column is added, old files simply return NULL for the new field. No data rewrite is required. This is one of Iceberg\'s core value propositions.',
    },
    {
      q: 'ShopKart\'s Writer W1 and Writer W2 both start writing at the same time. W1 commits successfully. What happens to W2\'s commit?',
      options: [
        'W2 fails with a lock timeout exception',
        'W2\'s data files are discarded; it must start over',
        'W2\'s CAS check fails; it retries by reloading metadata and re-applying changes',
        'Both commits succeed and are merged automatically by Iceberg',
      ],
      correct: 2,
      explanation: 'Iceberg uses Optimistic Concurrency Control (OCC). W2\'s compare-and-swap fails because the current snapshot changed. Iceberg then retries: it reloads the new metadata and re-applies W2\'s changes if compatible (usually succeeds for appends, may throw CommitFailedException for conflicting row updates).',
    },
    {
      q: 'Which Iceberg maintenance operation should ShopKart run to keep the orders.events table\'s metadata directory from growing unbounded?',
      options: [
        'CALL system.rewrite_data_files(…) with binpack strategy',
        'CALL system.expire_snapshots(…) with an older_than timestamp',
        'CALL system.remove_orphan_files(…) with a weekly schedule',
        'ALTER TABLE … SET TBLPROPERTIES (\'history.expire.max-snapshot-age-ms\'=…)',
      ],
      correct: 1,
      explanation: 'expire_snapshots removes old snapshot metadata AND the unreferenced data files, manifests, and manifest lists that are no longer needed. Without it, every committed snapshot (and all its files) remains forever. rewrite_data_files compacts data but does NOT remove old metadata.',
    },
    {
      q: 'ShopKart uses hidden partitioning with PARTITIONED BY (days(event_date)). An analyst writes WHERE event_date_ts > \'2026-08-01\'. What happens?',
      options: [
        'Full table scan — Iceberg can\'t apply hidden partition pruning to predicates on raw columns',
        'Iceberg automatically translates the timestamp predicate into a partition prune',
        'The query fails with a partition mismatch error',
        'Only the event_date_part column triggers pruning, not event_date_ts',
      ],
      correct: 1,
      explanation: 'This is the key advantage of hidden partitioning. Iceberg automatically translates predicates on the source column (event_date_ts) into partition bounds using the partition transform (days). The analyst doesn\'t need to know about or reference the partition column.',
    },
    {
      q: 'In Iceberg v2 Merge-on-Read (MoR), what does a positional delete file store?',
      options: [
        'The column values of deleted rows (e.g. WHERE customer_id = 7841290)',
        'A hash of each deleted row for fast lookup',
        '(file_path, row_position) pairs — the exact location of each deleted row',
        'The snapshot_id and timestamp when the delete occurred',
      ],
      correct: 2,
      explanation: 'Positional delete files store (data_file_path, row_position) pairs. This precisely identifies which rows to skip in a specific data file version. They\'re used for DELETE and UPDATE operations. Equality delete files (the other type) store column values and are used for DELETE WHERE column IN (...).',
    },
    {
      q: 'ShopKart wants to change orders.events partition spec from monthly to daily granularity. They have 5 years of historical monthly-partitioned data. What is the correct approach?',
      options: [
        'Run INSERT OVERWRITE on all historical data to rewrite it with daily partitions',
        'Drop and recreate the table — partition changes require full data migration',
        'Use ALTER TABLE REPLACE PARTITION FIELD — old files keep their spec, new writes use daily',
        'Add a new partition column event_date_day alongside the existing monthly partition',
      ],
      correct: 2,
      explanation: 'Iceberg partition evolution (REPLACE PARTITION FIELD) is non-destructive. Each data file records which partition spec (spec_id) it was written with. Old monthly-partitioned files remain valid and queryable; new writes use the daily spec. Zero bytes rewritten.',
    },
    {
      q: 'What is the minimum set of files Iceberg writes when an INSERT INTO creates 3 new Parquet data files?',
      options: [
        '3 Parquet files only — no metadata files needed',
        '3 Parquet files + 1 manifest file + updated metadata.json',
        '3 Parquet files + 1 manifest file + 1 manifest list + updated metadata.json',
        '3 Parquet files + 3 manifest entries + 1 manifest list + 1 new metadata.json version',
      ],
      correct: 2,
      explanation: 'Every write produces: (1) the data files, (2) one new manifest file (.avro) listing the data files, (3) a new manifest list (.avro) listing all manifests for the new snapshot, and (4) a new version of metadata.json with the new snapshot and updated current-snapshot-id. The manifest list always references ALL manifests (new + inherited from parent snapshot).',
    },
    {
      q: 'ShopKart must apply a heavy hourly UPDATE on orders.events but reads must stay fast. Which delete/update mode fits, and why?',
      options: [
        'Merge-on-Read — cheap writes, and reads are unaffected',
        'Copy-on-Write — rewrites touched files so reads never merge deletes',
        'Merge-on-Read — because reads merge delete files at query time for free',
        'Neither; UPDATE is not supported on Iceberg',
      ],
      correct: 1,
      explanation: 'Copy-on-Write rewrites the affected data files, so readers never pay a merge cost — ideal when reads must be fast and writes can absorb the rewrite. Merge-on-Read is the opposite trade-off (cheap writes, merge-on-read cost).',
    },
    {
      q: 'ShopKart runs rewriteDataFiles nightly. What target file size is a sensible default for analytical Parquet?',
      options: ['1–4 MB', '128–512 MB', '2–4 GB', '10 KB'],
      correct: 1,
      explanation: 'Compaction typically targets ~128–512 MB files — large enough to amortize open/planning overhead, small enough for parallelism and pruning. Tiny files kill planning; multi-GB files hurt parallelism and pruning granularity.',
    },
    {
      q: 'Two Flink jobs commit to the same table at the same instant. Under Iceberg optimistic concurrency, what happens?',
      options: [
        'Both silently succeed and one set of data is lost',
        'One wins the atomic pointer swap; the other detects the conflict and retries against the new state',
        'The table locks until one finishes',
        'The table is corrupted',
      ],
      correct: 1,
      explanation: 'Iceberg uses OCC: exactly one writer wins the atomic compare-and-swap of the metadata pointer. The loser re-reads the current snapshot and retries (or fails per its conflict policy). No lock service is required.',
    },
    {
      q: 'ShopKart partitions orders by customer_id, which is very high-cardinality. Which transform avoids millions of tiny partitions?',
      options: [
        'identity(customer_id)',
        'bucket(64, customer_id)',
        'day(customer_id)',
        'truncate(1, customer_id)',
      ],
      correct: 1,
      explanation: 'bucket(N, col) hashes a high-cardinality column into a fixed number of buckets, giving even file sizes and good pruning without exploding the partition count. identity() on customer_id would create a partition per customer.',
    },
    {
      q: 'What does a sort order (or Z-order clustering) primarily improve?',
      options: [
        'Write throughput',
        'Data locality so column min/max stats prune more files for range/point queries',
        'Snapshot expiration speed',
        'Catalog lookups',
      ],
      correct: 1,
      explanation: 'Sorting/clustering co-locates similar values, tightening per-file min/max bounds. Tighter bounds mean the planner skips more files for filtered queries — a big win on selective predicates.',
    },
    {
      q: 'ShopKart wants to validate a nightly load before analysts see it. Which Iceberg feature enables write-audit-publish?',
      options: [
        'Snapshot expiration',
        'Branches and tags (write to a branch, audit, then fast-forward main)',
        'Hidden partitioning',
        'Copy-on-Write',
      ],
      correct: 1,
      explanation: 'Branches let you stage writes on a named ref (e.g. audit), run quality checks, then atomically publish by fast-forwarding main. Tags mark immutable milestones (e.g. quarter-end) for compliance.',
    },
    {
      q: 'Which query reads ShopKart orders as they existed last Tuesday?',
      options: [
        'SELECT * FROM orders AS PAST(\'last tuesday\')',
        "SELECT * FROM orders TIMESTAMP AS OF '2026-08-25 00:00:00'",
        'SELECT * FROM orders ROLLBACK 7',
        'SELECT * FROM orders.snapshot(7d)',
      ],
      correct: 1,
      explanation: 'Time travel uses TIMESTAMP AS OF <ts> or VERSION AS OF <snapshot-id>. It reads the historical snapshot without moving the current pointer, so live queries are unaffected.',
    },
    {
      q: 'An analyst renamed a column last year, then dropped and re-added a different column with the same name. Old Parquet files still read correctly because…',
      options: [
        'Iceberg rewrote all old files on rename',
        'Columns are tracked by permanent integer IDs, not names',
        'Parquet stores the table name mapping',
        'The catalog keeps a name history',
      ],
      correct: 1,
      explanation: 'Iceberg assigns each column a permanent ID. Reads resolve by ID, so renames/reorders/re-adds never require rewriting data and never confuse an old file with a same-named new column.',
    },
    {
      q: 'Where does Iceberg store the per-column min/max/null statistics used to skip data files?',
      options: [
        'metadata.json',
        'The manifest files (one entry per data file)',
        'The manifest list',
        'The catalog',
      ],
      correct: 1,
      explanation: 'Manifest files hold per-data-file column stats (lower/upper bounds, null counts). The manifest list holds partition-range summaries per manifest. Two levels of pruning: manifest-level, then file-level.',
    },
    {
      q: 'ShopKart\'s streaming pipeline commits every 30 seconds and planning has crept to minutes. Root cause and fix?',
      options: [
        'Too few columns; add more',
        'Manifest/small-file explosion from frequent commits; run rewriteManifests + rewriteDataFiles and commit less often',
        'The catalog is down; restart it',
        'Schema drift; freeze the schema',
      ],
      correct: 1,
      explanation: 'High-frequency micro-batches create many tiny files and manifests, inflating planning. Consolidate with rewriteManifests, compact with rewriteDataFiles, and reduce commit frequency (larger checkpoints).',
    },
    {
      q: 'What is the role of the sequence number assigned to each snapshot in Iceberg v2?',
      options: [
        'It compresses data',
        'It orders operations so delete files apply only to data files written at or before them',
        'It names the Parquet files',
        'It is the catalog port number',
      ],
      correct: 1,
      explanation: 'Sequence numbers give a global ordering. A delete file with sequence number N applies to data files with sequence number ≤ N, which is how Merge-on-Read resolves which rows a delete affects.',
    },
    {
      q: 'INSERT OVERWRITE with dynamic partition mode on ShopKart\'s daily-partitioned table replaces…',
      options: [
        'The whole table every run',
        'Only the partitions the new data lands in',
        'Nothing — it always appends',
        'Only metadata.json',
      ],
      correct: 1,
      explanation: 'Dynamic overwrite replaces only the partitions produced by the query (e.g. today\'s date), leaving history intact. Static overwrite replaces everything matching the overwrite filter.',
    },
    {
      q: 'ShopKart migrates a 10 TB Hive table to Iceberg with CALL system.migrate(...). How much data is rewritten?',
      options: [
        'All 10 TB — every Parquet file is converted to Iceberg format',
        'Zero bytes — only metadata (manifests + metadata.json) is generated; existing files are reused',
        'Half — only the partitioned files are rewritten',
        'It depends on the target file size property',
      ],
      correct: 1,
      explanation: 'Migration reads Parquet footers (stats) and writes manifests that point at the existing files. No row data is copied or rewritten — that\'s why a 10 TB table migrates in minutes. Iceberg is a table format over the same files.',
    },
    {
      q: 'Which procedure lets ShopKart test Iceberg against a Hive table WITHOUT changing the original table?',
      options: [
        'system.migrate — converts in place',
        'system.snapshot — creates an independent Iceberg copy sharing the data files; source stays Hive',
        'system.add_files — imports files and deletes the source',
        'system.register_table — renames the Hive table',
      ],
      correct: 1,
      explanation: 'snapshot creates a throwaway Iceberg table that shares the source\'s data files while leaving the source as a Hive table — ideal for risk-free testing. migrate is the in-place conversion (and leaves a __BACKUP_ table).',
    },
    {
      q: 'A downstream mart must sync only rows appended to orders since its last run. Which read is the cheap, correct choice?',
      options: [
        'SELECT * FROM orders (full scan each time)',
        'An incremental append scan with start-snapshot-id and end-snapshot-id',
        'TIMESTAMP AS OF the last run',
        'expire_snapshots then re-read',
      ],
      correct: 1,
      explanation: 'An incremental append scan reads only the files appended between the two snapshots — a fraction of the table. A full scan re-reads everything; TIMESTAMP AS OF gives a whole historical state, not the delta.',
    },
    {
      q: 'ShopKart needs row-level INSERT/UPDATE/DELETE changes (not just appends) out of Iceberg for CDC. What do they use?',
      options: [
        'An incremental append scan — it includes updates and deletes',
        'The changelog view (create_changelog_view), which emits _change_type per row',
        'Time travel between two snapshots and diff manually',
        'remove_orphan_files with dry_run',
      ],
      correct: 1,
      explanation: 'The changelog view emits per-row changes with _change_type = INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE. An append scan only surfaces appended files — it misses row-level updates and Merge-on-Read deletes.',
    },
    {
      q: 'What is the headline change in Iceberg format-version 3 over v2?',
      options: [
        'A new Parquet replacement file format',
        'Deletion vectors — one roaring bitmap per data file instead of many positional delete files',
        'Removal of ACID transactions',
        'Mandatory Hive Metastore catalog',
      ],
      correct: 1,
      explanation: 'v3\'s headline feature is deletion vectors: a single compressed bitmap per data file (Puffin-backed) replaces v2\'s pile of positional delete files. v3 also adds row lineage, the variant/geo types, nanosecond timestamps, and default column values.',
    },
    {
      q: 'In v2, a hot data file has accumulated 3,000 positional delete files. How does a v3 deletion vector improve this?',
      options: [
        'It compresses the 3,000 files with gzip',
        'It replaces them with one bitmap per data file, updated in place — reads apply a single vector',
        'It deletes the data file and rewrites it',
        'It moves the delete files to a separate bucket',
      ],
      correct: 1,
      explanation: 'A deletion vector is one roaring bitmap of deleted positions per data file, maintained in place. The reader applies a single bitmap instead of merging thousands of delete files, so read cost stops scaling with the number of delete operations.',
    },
    {
      q: 'ShopKart compacts nightly but still gets thousands of tiny files each morning. The most likely root cause is…',
      options: [
        'Snapshots are not expired',
        'write.distribution-mode = none — every task writes into every partition on each commit',
        'Bloom filters are disabled',
        'The schema has too many columns',
      ],
      correct: 1,
      explanation: 'With distribution-mode = none there is no shuffle, so tasks × partitions tiny files are created on every write. Fix it at write time with hash or range distribution plus write.target-file-size-bytes; compaction is the safety net, not the primary tool.',
    },
    {
      q: 'You set write.metadata.metrics for a large free-text payload column to \'none\'. What is the effect?',
      options: [
        'The column is dropped from the table',
        'No min/max/counts are stored for it — smaller manifests, but no pruning on that column',
        'The column is compressed more aggressively',
        'Queries on that column fail',
      ],
      correct: 1,
      explanation: 'Metrics modes (full / truncate / counts / none) trade manifest size against pruning. Setting a rarely-filtered wide column to none keeps manifests small and planning fast; keep filter/join-key columns on full or truncate so they still prune.',
    },
    {
      q: 'ShopKart queries the same tables from Spark, Trino, and Snowflake and wants one governed catalog with no metastore-DB contention. Which catalog fits best?',
      options: [
        'Hadoop/filesystem catalog',
        'A REST catalog (e.g. Polaris/Tabular, Unity, Nessie, Gravitino)',
        'A per-engine JDBC catalog each',
        'Hive Metastore',
      ],
      correct: 1,
      explanation: 'A REST catalog is an HTTP spec any engine can call and any provider can implement, decoupling engines from a specific metastore and enabling server-side commit coordination, credential vending, and governance — ideal for multi-engine lakehouses. Hive/Glue are metastore-bound; Hadoop has weak multi-writer guarantees.',
    },
  ];

  /* ── Render ──────────────────────────────────────────────── */
  function _render(container) {
    _injectStyles();

    let current = 0;
    let answered = new Array(QUESTIONS.length).fill(null);
    let score = 0;

    function _getGrade(s, total) {
      const pct = s / total;
      if (pct >= 0.9) return { grade: 'Iceberg Expert', color: 'var(--green)', desc: 'Outstanding! You have a deep understanding of Iceberg\'s internals, performance characteristics, and operational best practices. Ready for senior data engineering interviews.' };
      if (pct >= 0.7) return { grade: 'Proficient', color: 'var(--blue)', desc: 'Strong foundational knowledge. You understand Iceberg\'s core concepts and most advanced topics. Review the questions you missed and you\'ll be fully prepared.' };
      if (pct >= 0.5) return { grade: 'Developing', color: 'var(--orange)', desc: 'You have a good base but some gaps in advanced topics (OCC, delete modes, partition evolution). Work through the Architecture and Write Operations modules to strengthen these areas.' };
      return { grade: 'Beginner', color: 'var(--red)', desc: 'Start with the Why Iceberg? and Architecture modules to build foundational knowledge, then return to the quiz. Iceberg\'s metadata hierarchy is the key concept to understand first.' };
    }

    function _dots() {
      return QUESTIONS.map((_, i) => {
        let cls = 'qz-dot';
        if (i === current) cls += ' current';
        else if (answered[i] !== null) cls += answered[i] ? ' correct' : ' incorrect';
        return `<div class="${cls}"></div>`;
      }).join('');
    }

    function _renderQuestion() {
      const q = QUESTIONS[current];
      const isAnswered = answered[current] !== null;
      const chosen = isAnswered ? answered[current] : null;

      container.querySelector('#qz-body').innerHTML = `
<div class="qz-card">
  <div class="qz-q-header">
    <div class="qz-q-num">Question ${current + 1} of ${QUESTIONS.length}</div>
    ${isAnswered ? `<div class="qz-q-score-badge ${answered[current] ? 'correct' : 'incorrect'}">${answered[current] ? '✓ Correct' : '✗ Incorrect'}</div>` : ''}
  </div>
  <div class="qz-q-text">${q.q}</div>
  <div class="qz-options">
    ${q.options.map((opt, oi) => {
      let cls = 'qz-option';
      if (isAnswered) {
        cls += ' answered';
        if (oi === q.correct) cls += ' correct-ans';
        else if (oi === chosen && oi !== q.correct) cls += ' wrong-ans';
        else if (oi === chosen) cls += ' selected';
      }
      return `<div class="${cls}" data-opt="${oi}">
        <div class="qz-opt-letter">${String.fromCharCode(65 + oi)}</div>
        <div class="qz-opt-text">${opt}</div>
      </div>`;
    }).join('')}
  </div>
  <div class="qz-explanation${isAnswered ? ' visible' : ''}">
    ${isAnswered ? `<span class="${answered[current] ? 'qz-exp-correct' : 'qz-exp-wrong'}">${answered[current] ? '✓ Correct!' : '✗ Incorrect.'}</span> ${q.explanation}` : ''}
  </div>
  <div class="qz-nav-row">
    <div class="qz-dot-row">${_dots()}</div>
    <div style="display:flex;gap:10px">
      <button class="qz-btn" id="qz-prev" ${current === 0 ? 'disabled' : ''}>← Prev</button>
      ${current < QUESTIONS.length - 1
        ? `<button class="qz-btn primary" id="qz-next" ${!isAnswered ? 'disabled' : ''}>Next →</button>`
        : `<button class="qz-btn primary" id="qz-finish" ${!isAnswered ? 'disabled' : ''}>See Results</button>`
      }
    </div>
  </div>
</div>`;

      container.querySelectorAll('.qz-option:not(.answered)').forEach(el => {
        el.addEventListener('click', () => {
          const oi = parseInt(el.dataset.opt, 10);
          if (answered[current] !== null) return;
          const isCorrect = oi === QUESTIONS[current].correct;
          answered[current] = isCorrect;
          if (isCorrect) score++;
          container.querySelector('#qz-score').textContent = `${score}/${QUESTIONS.length}`;
          _renderQuestion();
        });
      });

      const prevBtn = container.querySelector('#qz-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => { current--; _renderQuestion(); });

      const nextBtn = container.querySelector('#qz-next');
      if (nextBtn) nextBtn.addEventListener('click', () => { current++; _renderQuestion(); });

      const finBtn = container.querySelector('#qz-finish');
      if (finBtn) finBtn.addEventListener('click', _renderResults);
    }

    function _renderResults() {
      const { grade, color, desc } = _getGrade(score, QUESTIONS.length);
      const pct = Math.round((score / QUESTIONS.length) * 100);
      container.querySelector('#qz-body').innerHTML = `
<div class="qz-results">
  <div class="qz-results-score" style="color:${color}">${pct}%</div>
  <div class="qz-results-label">Quiz Complete</div>
  <div class="qz-results-grid">
    <div class="qz-results-cell">
      <div class="qz-results-cell-val" style="color:var(--green)">${score}</div>
      <div class="qz-results-cell-label">Correct</div>
    </div>
    <div class="qz-results-cell">
      <div class="qz-results-cell-val" style="color:var(--red)">${QUESTIONS.length - score}</div>
      <div class="qz-results-cell-label">Incorrect</div>
    </div>
  </div>
  <div class="qz-results-grade" style="color:${color}">${grade}</div>
  <div class="qz-results-desc">${desc}</div>
  <button class="qz-btn primary" id="qz-retry" style="padding:10px 32px;font-size:14px">Retry Quiz</button>
</div>`;
      container.querySelector('#qz-retry').addEventListener('click', () => {
        current = 0;
        answered = new Array(QUESTIONS.length).fill(null);
        score = 0;
        container.querySelector('#qz-score').textContent = `0/${QUESTIONS.length}`;
        _renderQuestion();
      });
    }

    container.innerHTML = `
<div class="qz-page">
  <div class="qz-header">
    <div>
      <div class="qz-header-title">Quiz Mode</div>
      <div class="qz-header-meta">Apache Iceberg · ${QUESTIONS.length} questions · Multiple choice</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="font-size:12px;color:var(--text-muted)">Score:</span>
      <span id="qz-score" style="font-size:16px;font-weight:700;color:var(--text-primary)">0/${QUESTIONS.length}</span>
    </div>
  </div>
  <div class="qz-progress-bar">
    <div class="qz-progress-fill" id="qz-pfill" style="width:0%"></div>
  </div>
  <div class="qz-body" id="qz-body"></div>
</div>`;

    container.addEventListener('click', () => {
      const done = answered.filter(a => a !== null).length;
      const fill = container.querySelector('#qz-pfill');
      if (fill) fill.style.width = `${(done / QUESTIONS.length) * 100}%`;
    });

    _renderQuestion();
  }

  IV.modules['quiz'] = {
    id: 'quiz',
    title: 'Quiz Mode',
    group: 'learn',
    render: _render,
    destroy() {},
  };
})();
