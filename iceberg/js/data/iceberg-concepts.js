/* ============================================================
   Iceberg Concepts — glossary, interview questions, summaries
   ============================================================ */

window.IcebergViz = window.IcebergViz || {};

window.IcebergViz.Concepts = {

  glossary: [
    { term: 'Table Format', definition: 'A specification defining how a set of files on object storage are organized and described. Iceberg is a table format, not a storage or query engine.' },
    { term: 'Snapshot', definition: 'An immutable pointer to the complete state of an Iceberg table at a specific point in time. Every write creates a new snapshot atomically.' },
    { term: 'Manifest List', definition: 'An Avro file (snap-*.avro) that lists all manifest files belonging to a snapshot, with partition-level statistics for each manifest.' },
    { term: 'Manifest File', definition: 'An Avro file that lists individual data files, including column statistics (min/max/null counts) for each file.' },
    { term: 'Metadata File', definition: 'A JSON file (metadata.json) that is the brain of an Iceberg table — contains schema, partition specs, snapshot history, and table properties.' },
    { term: 'Catalog', definition: 'An external service that maps a table name to the location of the current metadata.json file. Examples: AWS Glue, Hive Metastore, Nessie, REST Catalog.' },
    { term: 'Hidden Partitioning', definition: 'Iceberg derives partition values from raw column values using transform functions. Users filter on business columns; Iceberg handles partition pruning automatically.' },
    { term: 'Partition Evolution', definition: 'Changing a table\'s partition strategy without rewriting existing data. Old and new data files coexist and are both queryable.' },
    { term: 'Schema Evolution', definition: 'Safe changes to a table\'s schema (add, rename, drop, reorder, widen columns) without rewriting data, enabled by Iceberg\'s column ID system.' },
    { term: 'Column ID', definition: 'A permanent integer assigned to each column when it is first created. Column names can change; IDs never change. Enables safe schema evolution.' },
    { term: 'Sequence Number', definition: 'A monotonically increasing integer assigned to each snapshot. Used in Iceberg v2 to resolve position deletes and equality deletes.' },
    { term: 'Position Delete File', definition: 'A delete file containing (file_path, position) pairs identifying rows that have been deleted in specific data files.' },
    { term: 'Equality Delete File', definition: 'A delete file containing column values that identify rows to be deleted across all data files, regardless of position.' },
    { term: 'Snapshot Expiration', definition: 'The process of removing old snapshots and their associated orphaned data/manifest files, controlled by retention policies.' },
    { term: 'Time Travel', definition: 'Reading historical data as of a specific snapshot ID or timestamp, using VERSION AS OF or TIMESTAMP AS OF syntax.' },
    { term: 'Rollback', definition: 'Changing the current snapshot pointer back to a previous snapshot. O(1) operation — only metadata.json is rewritten.' },
    { term: 'Branch', definition: 'A named mutable reference to a snapshot. Enables isolated development workflows without affecting the main branch.' },
    { term: 'Tag', definition: 'A named immutable reference to a specific snapshot. Used for compliance, auditing, and milestone markers.' },
    { term: 'Compaction', definition: 'Rewriting small files into larger files to improve query performance (rewriteDataFiles). Produces a replace snapshot.' },
    { term: 'Manifest Rewrite', definition: 'Merging many small manifest files into fewer large manifests to reduce planning time (rewriteManifests).' },
    { term: 'Orphan Files', definition: 'Data or metadata files on S3 that no snapshot references, typically from failed writes. Cleaned up by removeOrphanFiles.' },
  ],

  interviewQuestions: {
    basic: [
      { q: 'What is Apache Iceberg and what problem does it solve?', a: 'Apache Iceberg is a table format specification that solves ACID transactions, schema evolution, partition evolution, and time travel on object storage without a central locking service.' },
      { q: 'What are the five layers of the Iceberg metadata hierarchy?', a: 'Catalog → metadata.json → manifest-list (.avro) → manifest file (.avro) → data files (.parquet/.orc). Each layer provides statistics that enable query pruning at that level.' },
      { q: 'What is hidden partitioning?', a: 'Partition values are derived from business columns using transform functions (year, month, day, hour, bucket, truncate). Users filter on business columns naturally; Iceberg applies partition pruning automatically.' },
      { q: 'What is a snapshot?', a: 'An immutable pointer to the complete state of the table at a point in time. Every write operation creates a new snapshot atomically. Readers always read a committed snapshot — never partial data.' },
      { q: 'What is the difference between Iceberg and Parquet?', a: 'Parquet is a columnar storage file format. Iceberg is a table format that describes how a collection of Parquet (or ORC/Avro) files constitute a table with ACID transactions, schema evolution, and time travel.' },
      { q: 'When you migrate a Hive table to Iceberg, are the data files rewritten?', a: 'No. Migration reads Parquet footers (row counts and column stats) and writes Iceberg manifests that point at the existing files. Zero row data is copied, so even a multi-TB table converts in minutes. Its cost scales with file count, not data size.' },
      { q: 'What is the headline change in Iceberg format-version 3?', a: 'Deletion vectors — a single compressed roaring bitmap per data file (stored in a Puffin file) replaces v2\'s many positional delete files, so reads apply one bitmap instead of merging many small delete files. v3 also adds row lineage, the variant and geometry/geography types, nanosecond timestamps, and default column values.' },
    ],
    intermediate: [
      { q: 'Explain how Iceberg achieves ACID transactions on object storage.', a: 'Iceberg uses optimistic concurrency. Writers generate new data files and metadata independently, then atomically swap the catalog\'s metadata_location pointer. The swap is the "commit." If two writers race, one wins and the other\'s commit fails (retried). No locking service required.' },
      { q: 'What information is stored in a manifest file?', a: 'File path, format, partition values, record count, file size, per-column statistics (null counts, lower-bound, upper-bound), status (ADDED/EXISTING/DELETED), and sequence number.' },
      { q: 'How does Iceberg perform partition evolution without rewriting data?', a: 'ALTER TABLE writes a new metadata.json with a new partition spec ID but does not touch data files. Old manifests describe files under the old spec. New writes use the new spec. At query time, Iceberg translates predicates into the correct partition format for each spec.' },
      { q: 'Why does Iceberg use column IDs instead of column names?', a: 'Column IDs are permanent integers that never change when a column is renamed, reordered, or re-typed. Old Parquet files written before a rename are still readable because the reader resolves columns by ID, not by name.' },
      { q: 'What is the manifest list and how does it differ from a manifest file?', a: 'The manifest list (snap-*.avro) lists all manifest files for a snapshot with partition-level statistics. A manifest file lists individual data files with column-level statistics. The manifest list enables manifest-level pruning without opening any manifest files.' },
      { q: 'How do you read only new rows appended since a previous run?', a: 'Use an incremental append scan: set start-snapshot-id (the last consumed snapshot) and end-snapshot-id (the current one). Iceberg returns only the files appended between them — far cheaper than a full scan. It surfaces appends only, not row-level updates or deletes.' },
      { q: 'What are the three ways to migrate an existing table to Iceberg?', a: 'snapshot (an independent Iceberg copy that shares the data files while the source stays Hive — for testing), migrate (in-place conversion that keeps the name and leaves a __BACKUP_), and add_files (import existing Parquet files into an already-created Iceberg table). register_table attaches an orphaned metadata.json.' },
      { q: 'What catalog options does Iceberg support and when do you pick each?', a: 'REST (an HTTP spec any engine can call — decouples engines, enables governance/credential vending; the modern default for multi-engine), Hive Metastore (legacy, shared-DB bottleneck), AWS Glue (managed but AWS-bound), JDBC (state in a relational DB), Hadoop/filesystem (a pointer file; weak multi-writer guarantees on some object stores), and Nessie (git-like cross-table branches). REST for a governed multi-engine lakehouse; Glue if all-in on AWS; Hadoop for local/testing.' },
    ],
    advanced: [
      { q: 'Explain the complete read path from catalog lookup to data file reads.', a: '1) Read Glue/catalog for metadata_location pointer → 2) Read metadata.json, extract current-snapshot-id → 3) Read manifest-list.avro, apply partition predicate to skip manifests → 4) Read included manifests, apply column predicates to skip files → 5) Read qualifying data files, apply row-level filters.' },
      { q: 'A Spark query takes 45 minutes just for planning. What is the cause and fix?', a: 'Manifest explosion from streaming micro-batch writes creating millions of small manifests. Fix: run rewriteManifests to consolidate, set write.metadata.metrics.max-inferred-column-defaults, and configure Flink checkpointing to produce fewer, larger manifests.' },
      { q: 'How would you design a snapshot retention strategy for a compliance-heavy environment?', a: 'Use Iceberg named tags for quarter-end snapshots with 7-year max-ref-age-ms. Set history.expire.max-snapshot-age-ms = 2592000000 (30 days) for untagged snapshots. Automate expire_snapshots in a daily Airflow DAG. Monitor metadata.json size and alert if > 500 MB.' },
      { q: 'Compare Iceberg\'s snapshot model vs Delta Lake\'s transaction log.', a: 'Iceberg uses an immutable snapshot tree with per-snapshot manifest files. Delta uses a transaction log (JSON/Parquet) that replays from checkpoints. Iceberg scales better for very large tables (the manifest hierarchy enables O(1) file lookups). Delta\'s log is simpler operationally but requires reading the full log from the last checkpoint.' },
      { q: 'What happens when two Spark jobs simultaneously write to the same Iceberg table?', a: 'Both writers generate data files and manifests independently. Each then tries to atomically update the catalog metadata pointer. The first to succeed wins. The second detects a conflict, retries the commit (re-reading the current state), and either succeeds or fails based on the conflict resolution strategy configured.' },
      { q: 'How do you emit row-level CDC (updates and deletes) out of Iceberg, and what are the caveats?', a: 'Use create_changelog_view to get per-row changes with _change_type (INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE), _commit_snapshot_id, and _change_ordinal. Caveats: an incremental append scan alone sees appends only (misses MoR deletes/overwrites); the start snapshot must still exist, so expire_snapshots with short retention can break the cursor; changelog needs format-version 2 with the snapshots in range retained. Apply changes downstream in _change_ordinal order and checkpoint the last snapshot id for resumable, exactly-once sync.' },
      { q: 'You compact nightly but still get thousands of tiny files. What is the write-time fix, and how do metrics modes fit in?', a: 'The files are made tiny on write, usually because write.distribution-mode = none makes every task write into every partition (tasks × partitions files per commit). Fix at write time: distribution-mode = hash (shuffle by partition; default) or range (range + sort → fewest/largest files and tight min/max), plus write.target-file-size-bytes and fanout-enabled to avoid a pre-sort. Separately, write.metadata.metrics (full / truncate(16) / counts / none) controls how much per-column stat lands in manifests — trade manifest size for pruning by keeping filter/join keys on full/truncate and turning wide blob columns down to counts/none.' },
    ],
  },

  innovations: [
    {
      number: 1,
      title: 'Metadata-First Architecture',
      icon: '📋',
      color: '--blue',
      description: 'Instead of listing directories, Iceberg maintains a complete metadata tree describing every file including partition values, column statistics, and snapshot membership. A query planner reads only metadata to determine exactly which files to read.',
      impact: 'Eliminates O(n) directory listing. Planning a 6 PB table takes the same time as a 10 GB table.',
    },
    {
      number: 2,
      title: 'Snapshot Isolation',
      icon: '📸',
      color: '--purple',
      description: 'Every write produces a new immutable snapshot. Readers always read a consistent snapshot. Writers create new snapshots atomically via a single catalog pointer swap. No locking, no coordinator, no distributed transaction protocol.',
      impact: 'ACID transactions on S3. Multiple readers + writers with full isolation, zero coordination overhead.',
    },
    {
      number: 3,
      title: 'Open Specification',
      icon: '📖',
      color: '--orange',
      description: 'The Iceberg Table Spec (v1, v2, v3 in progress) is a public Apache standard. Spark, Trino, Flink, Snowflake, Athena, Dremio all implement it independently. The same files are readable by any engine without translation.',
      impact: 'No vendor lock-in. Multi-engine architectures (Spark + Trino + Flink + Snowflake) on shared data.',
    },
  ],
};
