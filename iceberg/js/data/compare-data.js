/* ============================================================
   Compare mode dataset — Iceberg vs Delta Lake vs Apache Hudi.
   Single source of truth for the comparison matrix and the
   concept-by-concept side-by-side modules. Each row/concept carries
   an iceberg, delta, and hudi entry; CompareKit renders whichever
   formats are present (3-way when hudi exists).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const MATRIX = [
    { dim: 'Metadata model',
      iceberg: 'Immutable snapshot tree: metadata.json → manifest list → manifest files → data files.',
      delta:   'Ordered transaction log (_delta_log): JSON commits + periodic Parquet checkpoints.',
      hudi:    'Timeline of instants (.hoodie) over file groups; file slices = base Parquet + Avro log files.' },
    { dim: 'Source of truth',
      iceberg: 'The current metadata.json pointer held by the catalog.',
      delta:   'The latest version file in _delta_log (replayed from the last checkpoint).',
      hudi:    'The latest completed instants on the .hoodie timeline.' },
    { dim: 'Commit mechanism',
      iceberg: 'Atomic swap of the metadata pointer (compare-and-swap) via the catalog.',
      delta:   'Atomic put-if-absent of the next numbered commit file (version N).',
      hudi:    'Atomic timeline transition of an instant to completed (requested → inflight → completed).' },
    { dim: 'Concurrency',
      iceberg: 'Optimistic concurrency; conflict detection on the pointer swap, then retry.',
      delta:   'Optimistic concurrency; loser of the version race re-reads and retries.',
      hudi:    'Single-writer needs no lock; multi-writer uses OCC + a lock provider (ZK/HMS/DynamoDB).' },
    { dim: 'Row-level deletes',
      iceberg: 'Copy-on-write, or merge-on-read via positional / equality delete files (v2).',
      delta:   'Copy-on-write, or merge-on-read via deletion vectors (row-position bitmaps).',
      hudi:    'Keyed deletes: CoW rewrites base files; MoR appends a delete block to a log file.' },
    { dim: 'Record keys',
      iceberg: 'No primary key; row identity is by file + position.',
      delta:   'No primary key; MERGE matches on a user-supplied condition.',
      hudi:    'First-class record key + precombine field — upserts/deletes are keyed and de-duplicated.' },
    { dim: 'Schema evolution',
      iceberg: 'Columns tracked by permanent field IDs; add/drop/rename/reorder, safe widening.',
      delta:   'Schema in the metaData action; add is metadata-only; rename/drop need column mapping.',
      hudi:    'Schema-on-write with Avro compatibility rules; add columns freely, compatible type changes.' },
    { dim: 'Partitioning / layout',
      iceberg: 'Hidden partitioning via transforms; partition evolution without rewrite.',
      delta:   'Directory partitioning or generated columns; liquid clustering as the modern default.',
      hudi:    'Directory partitioning by partitionpath; clustering re-lays-out; bucket index for even sizing.' },
    { dim: 'Data skipping',
      iceberg: 'Per-file column stats in manifests; two-level (manifest, then file) pruning.',
      delta:   'Per-file min/max stats in add actions; file pruning after partition pruning.',
      hudi:    'Metadata-table column stats + partition pruning; record index for point upserts.' },
    { dim: 'Time travel',
      iceberg: 'VERSION AS OF <snapshot-id> or TIMESTAMP AS OF; rollback via RESTORE / procedures.',
      delta:   'VERSION AS OF <n> or TIMESTAMP AS OF; rollback via RESTORE TABLE.',
      hudi:    'Read as.of.instant; restore to an instant; savepoints pin recovery points.' },
    { dim: 'Retention / cleanup',
      iceberg: 'expire_snapshots + remove_orphan_files; bounds time-travel depth.',
      delta:   'VACUUM removes tombstoned files past retention; bounds time-travel depth.',
      hudi:    'Cleaning removes old file slices past the retention policy; bounds time-travel depth.' },
    { dim: 'Compaction',
      iceberg: 'rewrite_data_files (binpack / sort / zorder) + rewrite_manifests.',
      delta:   'OPTIMIZE (bin-pack) and OPTIMIZE … ZORDER BY; auto-optimize options.',
      hudi:    'Compaction merges MoR log files into base files; clustering sorts/right-sizes.' },
    { dim: 'Incremental / change feed',
      iceberg: 'Changelog scans read incremental changes between snapshots.',
      delta:   'Change Data Feed: row-level inserts/deletes and update pre/post images.',
      hudi:    'Incremental queries read only records changed between two instants (first-class).' },
    { dim: 'Ecosystem tilt',
      iceberg: 'Broadly engine-neutral: Spark, Flink, Trino, Dremio, Snowflake, BigQuery; REST catalog.',
      delta:   'Spark/Databricks-first, broadening via the open protocol, delta-kernel, delta-rs, UniForm.',
      hudi:    'Spark/Flink-first with strong streaming ingestion (DeltaStreamer); read via Hive, Trino, Presto.' },
    { dim: 'Best-fit shops',
      iceberg: 'Multi-engine lakehouses and very large tables that must avoid engine lock-in.',
      delta:   'Databricks-centric platforms wanting the deepest first-party tooling.',
      hudi:    'Record-level streaming / CDC ingestion needing fast upserts and incremental pulls.' },
  ];

  const CONCEPTS = {
    'metadata-model': {
      title: 'Metadata Model',
      intro: 'How each format records which files and schema make up the table at a given version — the core architectural difference everything else follows from.',
      iceberg: {
        points: [
          'A tree of immutable snapshots. Each write creates a new snapshot.',
          'metadata.json holds schema, partition specs, and the snapshot list.',
          'A manifest list per snapshot points to manifest files; manifests list data files with per-column stats.',
          'Readers walk top-down, pruning at each level.',
        ],
        code: `metadata.json
 └─ snapshot → manifest-list
     └─ manifest → data files`,
      },
      delta: {
        points: [
          'An ordered transaction log: one JSON commit per version.',
          'Each commit is a list of actions (protocol, metaData, add, remove…).',
          'Table state = replay of add/remove from the last checkpoint.',
          'A Parquet checkpoint every ~10 commits bounds replay.',
        ],
        code: `_delta_log/
 ...0010.checkpoint.parquet
 ...0011.json  ← replay from here`,
      },
      hudi: {
        points: [
          'A timeline of instants in .hoodie is the source of truth.',
          'Data lives in file groups; a file slice = base Parquet + Avro logs.',
          'A record key maps (via the index) to exactly one file group.',
          'An internal metadata table serves the file list + stats.',
        ],
        code: `.hoodie/  timeline (instants)
country=BR/ fileId-a8f base.parquet
            .a8f .log.1`,
      },
      takeaway: 'Iceberg snapshots point at a file tree; Delta replays a commit log; Hudi advances a timeline over keyed file groups. All give an immutable, versioned view — Hudi adds record-level identity on top.',
    },
    'writes-deletes': {
      title: 'Writes & Deletes',
      intro: 'All three support full DML. The split is how row-level UPDATE/DELETE avoids rewriting whole files — and, for Hudi, how record keys make it keyed rather than predicate-based.',
      iceberg: {
        points: [
          'Copy-on-write rewrites affected files; reads stay clean.',
          'Merge-on-read (v2) writes delete files instead of rewriting.',
          'Positional deletes = (file, pos); equality = column predicates.',
          'Sequence numbers order deletes vs data files.',
        ],
        code: `positional: {file, pos}
equality:   {customer_id = 7841290}`,
      },
      delta: {
        points: [
          'Copy-on-write rewrites files (remove old + add new).',
          'Merge-on-read uses deletion vectors (row-position bitmaps).',
          'The data file is untouched; reads skip flagged rows.',
          'OPTIMIZE materializes the deletes later.',
        ],
        code: `deletion vector: roaring bitmap
  of deleted row positions`,
      },
      hudi: {
        points: [
          'Writes are keyed by the record key; the index finds the file group.',
          'CoW rewrites the base file; MoR appends an update/delete log block.',
          'Precombine field resolves same-key conflicts (last wins).',
          'Compaction merges logs into a new base slice.',
        ],
        code: `upsert → index → file group
MoR: append .log (update/delete block)
CoW: rewrite base file`,
      },
      takeaway: 'Same write-vs-read cost trade-off everywhere. Iceberg writes delete files, Delta writes deletion-vector bitmaps, Hudi appends keyed log blocks — and only Hudi routes by a primary key, making upserts first-class.',
    },
    'time-travel': {
      title: 'Time Travel & Rollback',
      intro: 'Query the table as it was, and undo a bad batch. All three do this; the limit is always retention.',
      iceberg: {
        points: [
          'VERSION AS OF <snapshot-id> or TIMESTAMP AS OF <ts>.',
          'Rollback via rollback_to_snapshot / RESTORE (O(1) metadata).',
          'Snapshots reference their own files, untouched until expiry.',
          'expire_snapshots bounds how far back you can travel.',
        ],
        code: `SELECT * FROM t VERSION AS OF 9821443008;`,
      },
      delta: {
        points: [
          'VERSION AS OF <n> or TIMESTAMP AS OF <ts>.',
          'Rollback via RESTORE TABLE … TO VERSION AS OF.',
          'Historical files survive because remove is a tombstone.',
          'VACUUM retention bounds time-travel depth.',
        ],
        code: `RESTORE TABLE t TO VERSION AS OF 842;`,
      },
      hudi: {
        points: [
          'Read an old state with as.of.instant.',
          'Restore rolls the table back to an instant.',
          'Savepoints pin an instant so cleaning keeps its files.',
          'Cleaning retention bounds time-travel depth.',
        ],
        code: `read.option("as.of.instant","2026…")
CALL restore_to_instant('orders','2026…')`,
      },
      takeaway: 'Near-identical semantics: read the past, restore the present, and retention (expire_snapshots / VACUUM / cleaning) caps how far back you can go. Hudi’s savepoints add an explicit “protect this instant” pin.',
    },
    'concurrency': {
      title: 'Concurrency Control',
      intro: 'None use a lock service for the happy path; all reconcile at commit. The primitive differs.',
      iceberg: {
        points: [
          'Reads current snapshot id (the base).',
          'Writes data + manifests speculatively.',
          'Commit = compare-and-swap of the metadata pointer.',
          'On conflict, re-read and retry; appends rarely conflict.',
        ],
        code: `if current == base: swap → commit
else: re-read + retry`,
      },
      delta: {
        points: [
          'Reads the latest version N (the base).',
          'Stages new data files.',
          'Commit = atomic put-if-absent of (N+1).json.',
          'If (N+1) exists, re-read and retry as N+2.',
        ],
        code: `put_if_absent(version = N+1)`,
      },
      hudi: {
        points: [
          'A single writer needs no external lock (timeline serializes).',
          'Multi-writer uses OCC with a lock provider at commit.',
          'Overlapping file groups → later writer aborts and retries.',
          'Table services can run async to avoid contention.',
        ],
        code: `write.concurrency.mode =
  optimistic_concurrency_control
lock.provider = zookeeper | dynamodb`,
      },
      takeaway: 'All three are optimistic. Iceberg swaps a pointer, Delta claims the next version number, Hudi transitions a timeline instant — and Hudi is the one that often runs single-writer + async services, sidestepping multi-writer locking entirely.',
    },
    'layout': {
      title: 'Partitioning & Layout',
      intro: 'How data is physically organized for skipping — and how each format lets you change that as the table grows.',
      iceberg: {
        points: [
          'Hidden partitioning via transforms (days, bucket, truncate).',
          'Queries filter the natural column; engine prunes automatically.',
          'Partition evolution changes the spec without rewriting old data.',
          'Sort orders + Z-order tighten multi-column skipping.',
        ],
        code: `PARTITIONED BY (days(event_date))`,
      },
      delta: {
        points: [
          'Directory partitioning or generated columns.',
          'Liquid clustering is the modern default — no rigid dirs.',
          'Clustering keys can evolve; data re-clusters incrementally.',
          'OPTIMIZE … ZORDER BY tightens skipping.',
        ],
        code: `CLUSTER BY (customer_id, order_date)`,
      },
      hudi: {
        points: [
          'Directory partitioning by the partitionpath field.',
          'Clustering re-lays-out data (sort + right-size) into new file groups.',
          'Bucket index gives even file-group sizing for streaming.',
          'File groups keep a key’s data co-located over time.',
        ],
        code: `partitionpath.field = "country"
clustering.sort.columns =
  "country,order_date"`,
      },
      takeaway: 'Iceberg leans on hidden partitioning + evolution, Delta on liquid clustering, Hudi on directory partitions + clustering + bucketing. All three fight the same small-file/skew problems of classic Hive partitioning.',
    },
    'ecosystem': {
      title: 'Ecosystem & Engines',
      intro: 'All are open specs many engines can read — but their centers of gravity differ, which usually decides it.',
      iceberg: {
        points: [
          'Designed engine-neutral from the start.',
          'Spark, Flink, Trino, Dremio, Snowflake, BigQuery, and more.',
          'REST catalog spec decouples engines from any one metastore.',
          'Strong where multiple engines share the same tables.',
        ],
        code: `Spark · Flink · Trino · Snowflake
BigQuery · (REST catalog)`,
      },
      delta: {
        points: [
          'Spark/Databricks-first, deepest first-party tooling.',
          'Open protocol + delta-kernel / delta-rs broaden support.',
          'Trino, DuckDB, Polars, Flink read via the protocol.',
          'UniForm can expose Delta as Iceberg metadata.',
        ],
        code: `Spark/Databricks · Trino · DuckDB
delta-rs · (UniForm → Iceberg)`,
      },
      hudi: {
        points: [
          'Spark/Flink-first, built for streaming ingestion.',
          'DeltaStreamer / Hudi Streamer for turnkey CDC pipelines.',
          'Read from Hive, Trino, Presto, and Spark.',
          'Strongest when record-level upserts are the access pattern.',
        ],
        code: `Spark · Flink · Hive · Trino/Presto
Hudi Streamer (CDC ingestion)`,
      },
      takeaway: 'Iceberg for multi-engine neutrality at huge scale, Delta for Databricks-centric platforms, Hudi for streaming record-level ingestion. Increasingly interoperable (UniForm, XTable) — the access pattern, not lock-in, should drive the choice.',
    },
  };

  TV.CompareData = { matrix: MATRIX, concepts: CONCEPTS };
})();
