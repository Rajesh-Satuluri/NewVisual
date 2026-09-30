/* ============================================================
   Question Bank — per-screen MCQs, keyed by screen id.
   Shape: { screenId: [{ q, options, correct, explanation, difficulty }] }
   difficulty: 'basic' | 'intermediate' | 'advanced'
   Consumed by the Study Deck (js/modules/study.js) and Quiz Mode.
   ============================================================ */
window.IcebergViz = window.IcebergViz || {};

window.IcebergViz.QuestionBank = {
  'format-v3': [
    {
      q: 'What is the headline feature of Iceberg format-version 3?',
      options: [
        'A new file format replacing Parquet',
        'Deletion vectors — one roaring bitmap per data file instead of many positional delete files',
        'Removal of time travel',
        'Mandatory REST catalog',
      ],
      correct: 1,
      explanation: 'v3\'s headline change is deletion vectors: a single compressed bitmap per data file (Puffin-backed) that replaces v2\'s many positional delete files. v3 also adds row lineage, variant/geo types, nanosecond timestamps, and default column values.',
      difficulty: 'basic',
    },
    {
      q: 'How does a v3 deletion vector improve on v2 positional delete files for a high-churn table?',
      options: [
        'It rewrites the data file on every delete',
        'One bitmap per data file, maintained in place — reads apply a single vector instead of merging many files',
        'It stores deletes inside the Parquet footer',
        'It disables Merge-on-Read',
      ],
      correct: 1,
      explanation: 'A deletion vector is one roaring bitmap of deleted positions per data file. Read cost stops scaling with the number of delete operations, and the delete-side small-file problem goes away.',
      difficulty: 'intermediate',
    },
    {
      q: 'What must be true before you switch a production table to format-version 3?',
      options: [
        'The table must be empty',
        'Every engine that reads or writes it must support v3',
        'You must first run expire_snapshots',
        'The catalog must be Hive Metastore',
      ],
      correct: 1,
      explanation: 'v3 changes the on-disk spec (deletion vectors, row lineage, new types). A reader or writer on a v3-incapable version cannot use the table, so upgrade only once the whole fleet supports v3.',
      difficulty: 'advanced',
    },
  ],

  'write-tuning': [
    {
      q: 'Why can you still get thousands of tiny files even though you run compaction nightly?',
      options: [
        'Snapshots are not expired',
        'write.distribution-mode = none creates tasks × partitions tiny files on every write',
        'Bloom filters are off',
        'The target file size is too large',
      ],
      correct: 1,
      explanation: 'With no shuffle (distribution-mode = none), each task writes into every partition it holds, producing many tiny files on write. Shape files at write time with hash/range distribution + target file size; compaction is the safety net.',
      difficulty: 'basic',
    },
    {
      q: 'Which write.distribution-mode gives the fewest, largest files AND the tightest per-file min/max for pruning?',
      options: ['none', 'hash', 'range', 'random'],
      correct: 2,
      explanation: 'range range-partitions rows on the sort order, so each file covers a narrow key range — fewest/largest files and tight bounds for pruning. hash shuffles by partition key (good default); none does no shuffle.',
      difficulty: 'intermediate',
    },
    {
      q: 'You set write.metadata.metrics to \'none\' for a large JSON payload column. What happens?',
      options: [
        'The column is dropped',
        'No stats are stored for it: smaller manifests, but no pruning on that column',
        'Queries on it fail',
        'It is stored uncompressed',
      ],
      correct: 1,
      explanation: 'Metrics modes (full / truncate / counts / none) trade manifest size against pruning. Turning a rarely-filtered wide column to none keeps manifests small; keep filter/join keys on full or truncate so they still prune.',
      difficulty: 'advanced',
    },
  ],

  'migrate-to-iceberg': [
    {
      q: 'How much data is rewritten when you migrate a Hive/Parquet table to Iceberg?',
      options: [
        'The whole table is converted to a new format',
        'Zero — only metadata is generated; the existing Parquet files are reused in place',
        'Only the partition columns are rewritten',
        'It rewrites files that are smaller than the target size',
      ],
      correct: 1,
      explanation: 'Migration reads Parquet footers for stats and writes manifests that point at the existing files. No row data is copied, so even a 10 TB table converts in minutes. Cost is proportional to file count, not data size.',
      difficulty: 'basic',
    },
    {
      q: 'Which procedure converts a Hive table to Iceberg in place while keeping the table name?',
      options: ['snapshot', 'migrate', 'add_files', 'register_table'],
      correct: 1,
      explanation: 'migrate does an in-place conversion, keeps the name, and leaves the original as <table>__BACKUP_ for rollback. snapshot makes a throwaway copy (source stays Hive); add_files imports files into an already-created Iceberg table.',
      difficulty: 'intermediate',
    },
    {
      q: 'After add_files imports existing Parquet files into an Iceberg table, why must you NOT delete the source files?',
      options: [
        'The catalog caches them',
        'The Iceberg table references those exact files — deleting them corrupts the table',
        'They are needed for schema inference only',
        'You can delete them; Iceberg copied them',
      ],
      correct: 1,
      explanation: 'add_files does not copy data; the Iceberg manifests point at the original file paths. Removing the source files (or the Hive table\'s storage) breaks the Iceberg table. Use snapshot/migrate semantics carefully around cleanup.',
      difficulty: 'advanced',
    },
  ],

  'incremental-reads': [
    {
      q: 'What does an incremental append scan (start-snapshot-id / end-snapshot-id) return?',
      options: [
        'The entire current table',
        'Only the files appended between the two snapshots',
        'A row-level diff including updates and deletes',
        'The metadata.json history',
      ],
      correct: 1,
      explanation: 'An incremental append scan reads only files added between the start and end snapshots — a cheap way to pull new data. It surfaces appends only; it does not include row-level updates or deletes.',
      difficulty: 'basic',
    },
    {
      q: 'You need INSERT/UPDATE/DELETE row-level changes out of Iceberg for CDC. Which feature emits them?',
      options: [
        'An incremental append scan',
        'The changelog view (create_changelog_view) with _change_type per row',
        'TIMESTAMP AS OF',
        'rewrite_manifests',
      ],
      correct: 1,
      explanation: 'The changelog view emits per-row changes with _change_type = INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE, plus _commit_snapshot_id and _change_ordinal — capturing updates and deletes, not just appends.',
      difficulty: 'intermediate',
    },
    {
      q: 'Why can an incremental read job break if snapshot retention is too short?',
      options: [
        'Manifests get compacted',
        'expire_snapshots can remove the start snapshot the cursor points at, invalidating the bound',
        'The schema evolves',
        'Bloom filters expire',
      ],
      correct: 1,
      explanation: 'Incremental reads reference a start snapshot id. If expire_snapshots removes it (retention shorter than downstream lag), the bound is gone and the job fails. Keep retention longer than worst-case consumer lag and tag critical snapshots.',
      difficulty: 'advanced',
    },
  ],

  'why-iceberg': [
    {
      q: 'What core problem does Apache Iceberg solve that plain Parquet-on-S3 does not?',
      options: [
        'Faster column compression',
        'ACID transactions, schema/partition evolution, and time travel on object storage',
        'A new columnar file format that replaces Parquet',
        'A distributed query engine',
      ],
      correct: 1,
      explanation: 'Iceberg is a table format. It adds ACID commits, safe schema/partition evolution, and time travel over immutable files on object storage — it is not a storage or query engine.',
      difficulty: 'basic',
    },
    {
      q: 'Why does directory-listing-based partitioning (Hive-style) break down at scale?',
      options: [
        'S3 charges per byte listed',
        'Listing millions of directories/files is O(n) and dominates query planning',
        'Parquet footers become too large',
        'It cannot store column statistics',
      ],
      correct: 1,
      explanation: 'Hive relies on listing directories to find files, which is O(n) and slow on object stores. Iceberg keeps a metadata tree so planning reads only metadata — a 6 PB table plans as fast as a 10 GB one.',
      difficulty: 'intermediate',
    },
  ],

  architecture: [
    {
      q: 'What are the five layers of the Iceberg metadata hierarchy, top to bottom?',
      options: [
        'metadata.json → catalog → manifest list → manifest → data files',
        'Catalog → metadata.json → manifest list → manifest files → data files',
        'Catalog → snapshot → schema → partition spec → data files',
        'Data files → manifests → manifest list → metadata.json → catalog',
      ],
      correct: 1,
      explanation: 'Catalog points to the current metadata.json, which references a manifest list (snap-*.avro) per snapshot, which lists manifest files, which list the data files. Each layer carries statistics for pruning.',
      difficulty: 'basic',
    },
    {
      q: 'Which layer enables skipping whole groups of files without opening any manifest?',
      options: [
        'The Parquet footer',
        'The manifest list (snap-*.avro), via partition-level stats',
        'The catalog',
        'metadata.json',
      ],
      correct: 1,
      explanation: 'The manifest list stores partition-range stats per manifest, so the planner can skip entire manifests before ever opening one.',
      difficulty: 'intermediate',
    },
    {
      q: 'Why does metadata-first design beat Hive-style directory listing at scale?',
      options: [
        'It compresses data better',
        'Planning reads a small metadata tree instead of an O(n) listing of millions of files/directories',
        'It uses fewer columns',
        'It avoids Parquet',
      ],
      correct: 1,
      explanation: 'Hive must list directories to discover files — O(n) and slow on object stores. Iceberg records every file with stats in metadata, so planning is metadata-only and independent of table size.',
      difficulty: 'advanced',
    },
  ],

  'metadata-explorer': [
    {
      q: 'Which file is the "brain" of an Iceberg table, holding schema, snapshots, and the current-snapshot-id?',
      options: ['manifest list (.avro)', 'a manifest file (.avro)', 'metadata.json', 'the catalog entry'],
      correct: 2,
      explanation: 'metadata.json holds the schema, partition specs, sort orders, snapshot log, and current-snapshot-id. The catalog only maps the table name to the current metadata.json location.',
      difficulty: 'basic',
    },
  ],

  'create-table': [
    {
      q: 'When you CREATE TABLE in Iceberg, what does the catalog store?',
      options: [
        'The full table data',
        'A pointer to the current metadata.json location',
        'The manifest list only',
        'A copy of the schema as SQL DDL',
      ],
      correct: 1,
      explanation: 'The catalog maps table identifier → current metadata.json path. Committing a change is an atomic swap of that pointer.',
      difficulty: 'basic',
    },
  ],

  insert: [
    {
      q: 'A successful INSERT into an Iceberg table produces what?',
      options: [
        'An in-place edit of existing data files',
        'New data files + a new snapshot committed atomically',
        'A row-level update to metadata.json only',
        'A lock on the table until the writer finishes',
      ],
      correct: 1,
      explanation: 'Writers stage new data files and metadata, then atomically commit a new snapshot. Readers always see a fully committed snapshot — never partial writes.',
      difficulty: 'basic',
    },
    {
      q: 'Two INSERTs commit concurrently. How does Iceberg keep them consistent without a lock service?',
      options: [
        'It serializes writes through the catalog queue',
        'Optimistic concurrency: each swaps the metadata pointer; the loser retries',
        'It merges both writers\' files automatically',
        'The second write is silently dropped',
      ],
      correct: 1,
      explanation: 'Iceberg uses optimistic concurrency. Each writer attempts an atomic compare-and-swap of the metadata pointer; on conflict the loser re-reads current state and retries.',
      difficulty: 'advanced',
    },
  ],

  delete: [
    {
      q: 'In Copy-on-Write (CoW) DELETE mode, what happens to an affected data file?',
      options: [
        'A small delete file is written next to it',
        'The whole file is rewritten without the deleted rows',
        'Rows are tombstoned in the Parquet footer',
        'Nothing — only metadata.json changes',
      ],
      correct: 1,
      explanation: 'CoW rewrites the entire affected data file minus the deleted rows: fast reads, expensive writes. Merge-on-Read instead writes small delete files and resolves them at read time.',
      difficulty: 'intermediate',
    },
    {
      q: 'In Merge-on-Read, how do position deletes differ from equality deletes?',
      options: [
        'They are identical',
        'Position deletes target (file_path, row position); equality deletes match column values across files',
        'Position deletes rewrite data files',
        'Equality deletes are JSON',
      ],
      correct: 1,
      explanation: 'Position deletes point at exact rows in specific files (precise, cheap). Equality deletes specify values (e.g. customer_id=X) and apply wherever they match — ideal for CDC/GDPR without knowing row positions.',
      difficulty: 'advanced',
    },
  ],

  merge: [
    {
      q: 'What makes MERGE INTO powerful for upserts in Iceberg?',
      options: [
        'It bypasses snapshots for speed',
        'It matches source vs target and applies insert/update/delete in one atomic commit',
        'It locks the target table during execution',
        'It only supports append-only inserts',
      ],
      correct: 1,
      explanation: 'MERGE INTO expresses matched/not-matched clauses (update, delete, insert) and commits them as one atomic snapshot — the standard upsert/CDC pattern.',
      difficulty: 'intermediate',
    },
    {
      q: 'MERGE INTO is the canonical pattern for which workload?',
      options: [
        'Full table scans',
        'CDC upserts — insert new, update changed, optionally delete — in one atomic commit',
        'Compaction',
        'Schema migration',
      ],
      correct: 1,
      explanation: 'MERGE matches a source change feed against the target and applies insert/update/delete atomically — the standard change-data-capture / upsert workflow.',
      difficulty: 'intermediate',
    },
  ],

  'schema-evolution': [
    {
      q: 'How can Iceberg rename a column without rewriting any data files?',
      options: [
        'It rewrites Parquet footers lazily',
        'Columns are tracked by permanent integer IDs, not names',
        'It keeps a name-mapping table in the catalog',
        'It cannot — renames require a full rewrite',
      ],
      correct: 1,
      explanation: 'Each column gets a permanent ID at creation. Readers resolve by ID, so renames, reorders, and type widening are metadata-only operations.',
      difficulty: 'intermediate',
    },
    {
      q: 'Which schema change is NOT guaranteed safe in Iceberg?',
      options: ['Adding an optional column', 'Renaming a column', 'Widening int → long', 'Narrowing long → int'],
      correct: 3,
      explanation: 'Add, drop, rename, reorder, and widening promotions (int→long, float→double, decimal precision increase) are safe. Narrowing a type (long→int) can lose data and is not a safe evolution.',
      difficulty: 'advanced',
    },
  ],

  'hidden-partitioning': [
    {
      q: 'With hidden partitioning, how does a user get partition pruning on a daily partition?',
      options: [
        'They must filter on a synthetic event_day column',
        'They filter on the raw timestamp; Iceberg applies the day() transform automatically',
        'They must add a PARTITION hint to the query',
        'Pruning only works if the data is pre-sorted',
      ],
      correct: 1,
      explanation: 'Iceberg stores the partition transform (e.g. day(ts)) and derives partition values itself, so filtering on the business column prunes partitions with no extra user column.',
      difficulty: 'intermediate',
    },
    {
      q: 'Which is NOT a standard Iceberg partition transform?',
      options: ['bucket(N, col)', 'truncate(W, col)', 'day / month / year / hour', 'sort(col)'],
      correct: 3,
      explanation: 'Partition transforms are identity, bucket, truncate, and the temporal year/month/day/hour. Sorting is a sort order, not a partition transform.',
      difficulty: 'intermediate',
    },
  ],

  'partition-evolution': [
    {
      q: 'What happens to existing data when you change a table\'s partition spec?',
      options: [
        'All data is rewritten under the new spec',
        'Old files keep the old spec; new writes use the new spec, both queryable',
        'The table must be recreated',
        'Old data becomes unreadable',
      ],
      correct: 1,
      explanation: 'Partition evolution is metadata-only. Old manifests describe files under the old spec; new writes use the new spec. The planner translates predicates per-spec at query time.',
      difficulty: 'advanced',
    },
  ],

  'snapshot-explorer': [
    {
      q: 'What is an Iceberg snapshot?',
      options: [
        'A cached query result',
        'An immutable pointer to the complete table state at a point in time',
        'A backup copy of all data files',
        'The Parquet row group index',
      ],
      correct: 1,
      explanation: 'Every write creates a new immutable snapshot atomically. Snapshots enable isolation, time travel, and rollback.',
      difficulty: 'basic',
    },
  ],

  'time-travel': [
    {
      q: 'How is a rollback to a previous snapshot an O(1) operation?',
      options: [
        'It restores data files from a backup',
        'It only rewrites metadata.json to point at the old snapshot id',
        'It replays the write log in reverse',
        'It re-runs all past transactions',
      ],
      correct: 1,
      explanation: 'Snapshots are immutable and retained, so rollback just repoints current-snapshot-id in a new metadata.json — no data movement.',
      difficulty: 'intermediate',
    },
    {
      q: 'Which SQL reads the table as of a past state?',
      options: [
        'SELECT ... AS PAST',
        'SELECT ... VERSION AS OF <snapshot-id>  /  TIMESTAMP AS OF <ts>',
        'SELECT ... ROLLBACK',
        'SELECT ... SNAPSHOT()',
      ],
      correct: 1,
      explanation: 'Time travel uses VERSION AS OF <snapshot-id> or TIMESTAMP AS OF <timestamp> (syntax varies slightly by engine). It reads the historical snapshot without changing the current pointer.',
      difficulty: 'basic',
    },
  ],

  'read-path': [
    {
      q: 'Put the read path in order: (1) manifests, (2) catalog, (3) manifest list, (4) metadata.json, (5) data files.',
      options: [
        '2 → 4 → 3 → 1 → 5',
        '4 → 2 → 3 → 1 → 5',
        '2 → 3 → 4 → 1 → 5',
        '1 → 2 → 3 → 4 → 5',
      ],
      correct: 0,
      explanation: 'Catalog → metadata.json (current snapshot) → manifest list (skip manifests by partition) → manifests (skip files by column stats) → qualifying data files.',
      difficulty: 'advanced',
    },
    {
      q: 'How does column-level pruning inside a manifest skip files?',
      options: [
        'It reads every Parquet footer first',
        'It compares the predicate to each file’s min/max/null stats and drops files that cannot match',
        'It uses the catalog',
        'It scans the manifest list only',
      ],
      correct: 1,
      explanation: 'Each manifest entry carries per-column lower/upper bounds and null counts, so the planner eliminates non-matching files before opening any data file.',
      difficulty: 'intermediate',
    },
  ],

  'query-planner': [
    {
      q: 'A Spark query spends 45 minutes just planning. Most likely cause?',
      options: [
        'Too few executors',
        'Manifest explosion from many tiny streaming commits',
        'Parquet compression set too high',
        'The catalog is unreachable',
      ],
      correct: 1,
      explanation: 'Millions of small manifests from frequent micro-batches blow up planning. Fix with rewriteManifests / compaction and fewer, larger commits.',
      difficulty: 'advanced',
    },
  ],

  concurrency: [
    {
      q: 'Iceberg\'s optimistic concurrency means a losing writer will…',
      options: [
        'Corrupt the table',
        'Re-read the latest metadata and retry its commit',
        'Block until the winner finishes',
        'Silently discard its data',
      ],
      correct: 1,
      explanation: 'The atomic pointer swap has exactly one winner; the loser retries against the new current state (or fails per its conflict policy). No central lock is needed.',
      difficulty: 'intermediate',
    },
  ],

  maintenance: [
    {
      q: 'Which maintenance action reduces the number of small data files to speed up reads?',
      options: ['expireSnapshots', 'rewriteDataFiles (compaction)', 'removeOrphanFiles', 'rewriteManifests'],
      correct: 1,
      explanation: 'rewriteDataFiles compacts many small files into fewer large ones (a replace snapshot). rewriteManifests consolidates manifests; expireSnapshots/removeOrphanFiles reclaim storage.',
      difficulty: 'intermediate',
    },
    {
      q: 'What does expireSnapshots do, and what is the risk of an aggressive retention window?',
      options: [
        'Deletes data files immediately on every commit',
        'Removes old snapshots + their now-unreferenced files; too-short retention breaks time travel and in-flight readers',
        'Compacts manifests only',
        'Rewrites the schema',
      ],
      correct: 1,
      explanation: 'expireSnapshots drops snapshots older than the retention window and garbage-collects files no live snapshot references. Set it too aggressively and you lose time-travel history and can pull files out from under long-running readers.',
      difficulty: 'advanced',
    },
  ],

  update: [
    {
      q: 'In Copy-on-Write mode, an UPDATE that touches rows in one data file causes what?',
      options: [
        'A delete file is written next to the original',
        'The entire data file is rewritten with the updated rows; old file dropped from the new manifest',
        'metadata.json is edited in place',
        'Only the changed rows are patched inside the Parquet file',
      ],
      correct: 1,
      explanation: 'Copy-on-Write rewrites the whole affected data file with the new values. Fast reads (no merge), expensive writes. Merge-on-Read instead writes a delete file + a small data file and resolves them at read time.',
      difficulty: 'intermediate',
    },
    {
      q: 'A Merge-on-Read UPDATE produces which files?',
      options: [
        'Only a rewritten data file',
        'A delete file (invalidating the old rows) plus a new data file with the updated rows',
        'Only a new metadata.json',
        'A manifest list only',
      ],
      correct: 1,
      explanation: 'MoR marks the old rows deleted via a delete file and appends the new versions in a new data file. Cheap writes, but reads must merge deletes — which is why you periodically compact.',
      difficulty: 'advanced',
    },
  ],

  overwrite: [
    {
      q: 'On a partitioned table, dynamic INSERT OVERWRITE replaces what?',
      options: [
        'The entire table',
        'Only the partitions produced by the query',
        'Nothing — it always appends',
        'The metadata.json but no data',
      ],
      correct: 1,
      explanation: 'Dynamic overwrite (partitionOverwriteMode=dynamic) replaces only the partitions the incoming data lands in, leaving other partitions untouched. Static overwrite replaces everything matching the overwrite filter.',
      difficulty: 'intermediate',
    },
    {
      q: 'Why is INSERT OVERWRITE safe for readers mid-operation?',
      options: [
        'It locks the table',
        'It commits a new snapshot atomically — readers see the old or new state, never a partial one',
        'It pauses all queries',
        'It writes to a temp table first, then renames directories',
      ],
      correct: 1,
      explanation: 'Like every Iceberg write, overwrite is an atomic snapshot commit. There is no window where a reader sees half-replaced data.',
      difficulty: 'basic',
    },
  ],

  append: [
    {
      q: 'What makes a "fast append" cheap compared with other writes?',
      options: [
        'It rewrites all manifests each time',
        'It adds new data files and a new manifest without rewriting existing manifests',
        'It skips the snapshot commit',
        'It edits data files in place',
      ],
      correct: 1,
      explanation: 'Fast append only writes new manifest entries for the added files and inherits the parent snapshot’s existing manifests, so the commit stays O(new files) rather than O(table).',
      difficulty: 'intermediate',
    },
    {
      q: 'Frequent streaming appends can hurt query performance because they',
      options: [
        'Corrupt the schema',
        'Create many small files and manifests, inflating planning time until compaction',
        'Delete old snapshots',
        'Disable partition pruning',
      ],
      correct: 1,
      explanation: 'Each micro-batch commit adds files and manifests. Without periodic rewriteDataFiles / rewriteManifests, the metadata explodes and planning slows — the classic streaming-into-Iceberg pitfall.',
      difficulty: 'intermediate',
    },
  ],

  'write-path': [
    {
      q: 'Put the Iceberg write path in order.',
      options: [
        'Commit metadata → write data files → write manifests',
        'Stage data files → write manifest file(s) → write manifest list → atomically swap metadata pointer',
        'Swap metadata pointer → write data → write manifests',
        'Write manifest list → stage data → commit',
      ],
      correct: 1,
      explanation: 'A writer first stages data files, then writes manifest file(s) describing them, then a manifest list for the new snapshot, then commits by atomically swapping the catalog’s current-metadata pointer.',
      difficulty: 'advanced',
    },
    {
      q: 'The "commit" in an Iceberg write is precisely',
      options: [
        'Flushing Parquet files to S3',
        'The atomic compare-and-swap of the catalog pointer to the new metadata.json',
        'Writing the manifest list',
        'Acquiring a table lock',
      ],
      correct: 1,
      explanation: 'Data and metadata are written speculatively; the transaction becomes real only when the catalog pointer is atomically swapped. That single atomic operation is the commit.',
      difficulty: 'intermediate',
    },
  ],

  'catalog-explorer': [
    {
      q: 'What does a REST catalog offer over a Hive Metastore?',
      options: [
        'It stores the actual data',
        'A vendor-neutral HTTP API for catalog + commit operations, enabling managed, multi-engine catalogs',
        'Faster Parquet compression',
        'Automatic compaction',
      ],
      correct: 1,
      explanation: 'The REST catalog spec decouples engines from a specific metastore implementation. Providers (Tabular/Polaris/Unity/Nessie) implement the API, and any Iceberg engine can talk to it.',
      difficulty: 'intermediate',
    },
    {
      q: 'The single responsibility every Iceberg catalog must provide is',
      options: [
        'Running queries',
        'Mapping a table identifier to its current metadata.json and performing the atomic commit swap',
        'Storing column statistics',
        'Compacting data files',
      ],
      correct: 1,
      explanation: 'A catalog resolves table name → current metadata pointer and guarantees the atomic swap on commit. Everything else (Glue, Hive, Nessie, REST, JDBC, Hadoop) is an implementation of that contract.',
      difficulty: 'basic',
    },
  ],

  performance: [
    {
      q: 'Where does Iceberg’s biggest query-planning speedup come from?',
      options: [
        'Compressing data more aggressively',
        'Pruning files via partition + column stats in metadata, avoiding directory listing and file scans',
        'Caching query results',
        'Running on more executors',
      ],
      correct: 1,
      explanation: 'Planning reads only metadata and skips non-matching manifests (partition stats) and files (column min/max/null stats). A 6 PB table plans as fast as a small one because no O(n) listing happens.',
      difficulty: 'advanced',
    },
    {
      q: 'A table has millions of tiny files and slow queries. Best first fix?',
      options: [
        'Add more partitions',
        'Compact with rewriteDataFiles (and rewriteManifests), targeting a sensible file size',
        'Drop column statistics',
        'Switch to Hive tables',
      ],
      correct: 1,
      explanation: 'Small-file problems are solved by compaction (rewriteDataFiles to ~128–512 MB targets) plus manifest consolidation. This cuts both open costs and planning time.',
      difficulty: 'intermediate',
    },
  ],

  'manifest-explorer': [
    {
      q: 'What does a single manifest FILE store for each data file it lists?',
      options: [
        'The full rows',
        'Path, partition values, record count, and column stats (min/max/null counts) + status',
        'Only the file path',
        'The table schema',
      ],
      correct: 1,
      explanation: 'A manifest file lists DataFile entries with per-column min/max/null stats, partition tuple, record/file counts, and ADDED/EXISTING/DELETED status — this is what powers file-level pruning.',
      difficulty: 'intermediate',
    },
    {
      q: 'How does the manifest LIST differ from a manifest FILE?',
      options: [
        'They are the same thing',
        'The list points to manifests with partition-level summaries; a manifest file points to data files with column-level stats',
        'The list stores data; the file stores schema',
        'The list is JSON; the file is CSV',
      ],
      correct: 1,
      explanation: 'The manifest list (snap-*.avro, one per snapshot) enables manifest-level pruning by partition range; each manifest file then enables file-level pruning by column stats. Two resolution levels.',
      difficulty: 'basic',
    },
  ],
};

/* Per-screen Q&A collector: prefer a curated Q&A bank (none yet), else
   derive from the quiz bank (question + explanation-as-answer). Consumed
   by the Study Deck and available to any module that wants inline Q&A. */
window.IcebergViz.QABank = window.IcebergViz.QABank || {};
window.IcebergViz.collectQA = function (screenId) {
  const curated = window.IcebergViz.QABank[screenId];
  if (curated && curated.length) return curated.slice();
  const qb = window.IcebergViz.QuestionBank[screenId] || [];
  return qb.map(x => ({ q: x.q, a: x.explanation, difficulty: x.difficulty }));
};
