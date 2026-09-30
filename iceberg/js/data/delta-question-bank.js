/* ============================================================
   Delta Lake question bank — per-screen MCQs, format-keyed.
   Shape: TV.QuestionBank.delta[screenId] = [{ q, options, correct,
   explanation, difficulty }]. The Test-Yourself modal shows its
   button only on screens that have a bank here. Covers every
   built Delta screen (B6 completes the set).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.QuestionBank = TV.QuestionBank || {};
  TV.QuestionBank.delta = TV.QuestionBank.delta || {};

  Object.assign(TV.QuestionBank.delta, {
    'why-delta': [
      {
        q: 'What is the single source of truth for a Delta Lake table?',
        options: ['A Hive metastore row', 'The _delta_log transaction log', 'The newest Parquet file', 'A manifest list file'],
        correct: 1,
        explanation: 'Delta’s _delta_log — ordered JSON commits plus periodic Parquet checkpoints — defines exactly which files and schema make up the table at each version.',
        difficulty: 'basic',
      },
      {
        q: 'How does Delta give ACID guarantees on object storage?',
        options: ['Row locking in S3', 'Atomic creation of the next numbered commit file in _delta_log', 'A background daemon', 'Renaming the whole table directory'],
        correct: 1,
        explanation: 'A writer commits by atomically creating version N’s JSON. If two writers race, only one wins version N; the other detects the conflict and retries — snapshot isolation without corruption.',
        difficulty: 'intermediate',
      },
      {
        q: 'A plain "directory of Parquet files" lacks which guarantee that Delta adds?',
        options: ['Columnar compression', 'Atomic multi-file commits and consistent reads', 'Predicate pushdown', 'Splittable files'],
        correct: 1,
        explanation: 'Parquet gives columnar storage and pushdown on its own. Delta adds the transaction log so a set of file changes commits atomically and readers never see a half-written table.',
        difficulty: 'basic',
      },
    ],
    'architecture': [
      {
        q: 'A Delta reader with no checkpoint present must do what to learn the current file set?',
        options: ['Read every Parquet footer', 'Replay all JSON commits from version 0', 'Ask the catalog for the file list', 'List the directory'],
        correct: 1,
        explanation: 'Without a checkpoint the reader replays the ordered JSON commits from 0, applying add/remove actions. Checkpoints exist precisely to bound this replay.',
        difficulty: 'intermediate',
      },
      {
        q: 'Which layers make up a Delta table on storage?',
        options: ['Only Parquet data files', 'Parquet data files + the _delta_log (JSON commits + Parquet checkpoints)', 'A single ORC file', 'A relational database'],
        correct: 1,
        explanation: 'A Delta table is immutable Parquet data files plus the _delta_log directory. The log records which files belong to each version and the table schema.',
        difficulty: 'basic',
      },
    ],
    'log-explorer': [
      {
        q: 'What are the action types that can appear inside a Delta commit?',
        options: ['SELECT / INSERT / UPDATE', 'protocol / metaData / add / remove / commitInfo / cdc', 'CREATE / ALTER / DROP', 'begin / commit / rollback'],
        correct: 1,
        explanation: 'Each JSON commit is a list of actions: protocol (reader/writer versions & features), metaData (schema/partitioning), add & remove (file set changes), commitInfo (audit), and cdc (change data).',
        difficulty: 'intermediate',
      },
      {
        q: 'An AddFile action carries per-column statistics. What are they used for?',
        options: ['Encryption', 'Data skipping — eliminating files that cannot match a predicate', 'Compression ratio tuning', 'Access control'],
        correct: 1,
        explanation: 'Each add records min/max/nullCount per column. The planner uses those stats to skip files whose ranges cannot satisfy the query before reading any data.',
        difficulty: 'intermediate',
      },
    ],
    'create-table': [
      {
        q: 'Immediately after CREATE TABLE, what exists in _delta_log?',
        options: ['Nothing until the first insert', 'Version 0 with protocol + metaData actions', 'A checkpoint file', 'Only a commitInfo action'],
        correct: 1,
        explanation: 'CREATE writes version 0 (00…0.json) containing a protocol action and a metaData action (schema, partition columns, properties). No data files yet.',
        difficulty: 'basic',
      },
      {
        q: 'Where is a Delta table’s schema stored?',
        options: ['In each Parquet footer only', 'In the metaData action inside the transaction log', 'In the Hive metastore exclusively', 'In a .schema sidecar file'],
        correct: 1,
        explanation: 'The authoritative schema lives in the latest metaData action in the log. That is why schema evolution is a metadata-only commit.',
        difficulty: 'basic',
      },
    ],
    'insert': [
      {
        q: 'An INSERT / append into a Delta table produces which log actions?',
        options: ['remove actions only', 'add actions for the new data files', 'a metaData action', 'a protocol upgrade'],
        correct: 1,
        explanation: 'An append writes new Parquet files and commits a version whose actions are add entries pointing at them. No existing files are touched.',
        difficulty: 'basic',
      },
      {
        q: 'Does appending data rewrite or modify existing data files?',
        options: ['Yes, it merges into the last file', 'No — existing files are immutable; new files are added', 'Only if partitioning changed', 'Only under OPTIMIZE'],
        correct: 1,
        explanation: 'Delta data files are immutable. An append only adds files and records add actions; readers of older versions still see the old file set.',
        difficulty: 'basic',
      },
    ],
    'update': [
      {
        q: 'In copy-on-write mode, how does UPDATE change a matched file?',
        options: ['Edits rows in place', 'Rewrites the whole file with updated rows, then remove old + add new', 'Writes only a delete marker', 'Appends the changed rows'],
        correct: 1,
        explanation: 'Copy-on-write rewrites each file containing a matched row: the new file is added and the old file is removed in the same atomic commit.',
        difficulty: 'intermediate',
      },
      {
        q: 'Why can readers on the previous version still run during an UPDATE?',
        options: ['The table is locked but cached', 'Old files stay on disk until VACUUM; each version references its own file set', 'Updates are queued', 'Readers are paused'],
        correct: 1,
        explanation: 'Because remove is logical (the file is tombstoned, not deleted), a reader pinned to the prior version still resolves the old file set. Snapshot isolation holds.',
        difficulty: 'intermediate',
      },
    ],
    'delete': [
      {
        q: 'A copy-on-write DELETE that removes some rows from a file will…',
        options: ['Delete the physical file immediately', 'Rewrite the file without those rows (remove old, add new)', 'Only write a commitInfo action', 'Drop the partition'],
        correct: 1,
        explanation: 'Copy-on-write rewrites the surviving rows into a new file and tombstones the original with a remove action — all in one commit.',
        difficulty: 'basic',
      },
      {
        q: 'After DELETE, when is the old data physically removed from storage?',
        options: ['Instantly', 'When VACUUM runs after the retention window', 'On the next checkpoint', 'Never'],
        correct: 1,
        explanation: 'remove is a tombstone. The physical file remains (enabling time travel) until VACUUM deletes files past the retention period.',
        difficulty: 'intermediate',
      },
    ],
    'merge': [
      {
        q: 'What does MERGE INTO combine in a single atomic operation?',
        options: ['Only INSERT and UPDATE', 'INSERT, UPDATE, and DELETE driven by match conditions', 'Only schema changes', 'Compaction and vacuum'],
        correct: 1,
        explanation: 'MERGE joins a source to the target and applies WHEN MATCHED (update/delete) and WHEN NOT MATCHED (insert) clauses in one commit — the core of CDC upserts.',
        difficulty: 'intermediate',
      },
      {
        q: 'A MERGE runs in two logical passes. What is the first pass for?',
        options: ['Vacuuming old files', 'Finding which target files contain matching rows', 'Building a checkpoint', 'Upgrading the protocol'],
        correct: 1,
        explanation: 'Pass one scans to identify the target files touched by the match condition; pass two rewrites just those files with inserts/updates/deletes applied.',
        difficulty: 'advanced',
      },
    ],
    'overwrite': [
      {
        q: 'What does replaceWhere let you do?',
        options: ['Overwrite the entire table', 'Atomically replace only the rows/partitions matching a predicate', 'Rename a column', 'Delete the log'],
        correct: 1,
        explanation: 'replaceWhere performs a selective overwrite: files matching the predicate are removed and replacement data is added, all in one commit — the rest of the table is untouched.',
        difficulty: 'intermediate',
      },
      {
        q: 'A replaceWhere on country=\'BR\' commits which actions?',
        options: ['Only add', 'remove for the old BR files + add for the new BR data', 'metaData only', 'A protocol upgrade'],
        correct: 1,
        explanation: 'The predicate selects the BR files to tombstone (remove) and the replacement rows are written as new files (add), keeping other partitions intact.',
        difficulty: 'intermediate',
      },
    ],
    'read-path': [
      {
        q: 'What is the correct order of the Delta read path?',
        options: ['Read data → check log', 'Load latest checkpoint → replay commits after it → apply data skipping → read surviving files', 'List directory → read all files', 'Query catalog → read one file'],
        correct: 1,
        explanation: 'A reader loads the most recent checkpoint for the cumulative state, replays only the JSON commits after it, prunes files by stats, then reads just the survivors.',
        difficulty: 'intermediate',
      },
      {
        q: 'Why does a checkpoint make reads fast on a table with thousands of commits?',
        options: ['It compresses data', 'The reader replays from the checkpoint instead of version 0 — bounded work', 'It caches query results', 'It removes old data files'],
        correct: 1,
        explanation: 'The checkpoint is a Parquet snapshot of cumulative state, so replay is bounded to the handful of commits since it — turning O(n) log replay into near O(1).',
        difficulty: 'intermediate',
      },
    ],
    'write-path': [
      {
        q: 'How does a Delta writer commit a new version safely?',
        options: ['It overwrites the latest JSON', 'It atomically creates the next numbered commit file; if that number exists, it conflicts and retries', 'It locks the whole bucket', 'It edits the checkpoint'],
        correct: 1,
        explanation: 'The commit is an atomic put-if-absent of version N’s JSON. If another writer already created N, this writer re-reads and retries against N — optimistic concurrency.',
        difficulty: 'intermediate',
      },
      {
        q: 'Two writers both read version 12 and try to write version 13. What happens?',
        options: ['Both succeed and merge', 'One wins version 13; the loser retries as version 14 if changes don’t conflict', 'The table corrupts', 'Both fail permanently'],
        correct: 1,
        explanation: 'Only one can create 13. The loser re-reads the new state and, if its changes don’t conflict, re-commits as 14. Conflicting writes surface an exception.',
        difficulty: 'advanced',
      },
    ],
    'query-planner': [
      {
        q: 'Delta data skipping relies primarily on what?',
        options: ['Bloom filters only', 'Per-file min/max column stats in the log', 'Full-text indexes', 'A separate stats server'],
        correct: 1,
        explanation: 'The planner reads min/max/nullCount stats from add actions and drops files whose ranges cannot satisfy the predicate — before any data is read.',
        difficulty: 'intermediate',
      },
      {
        q: 'Partition pruning and data skipping differ how?',
        options: ['They are the same thing', 'Pruning eliminates whole partition directories; skipping eliminates individual files by stats', 'Pruning reads data, skipping does not', 'Skipping only works on strings'],
        correct: 1,
        explanation: 'Partition pruning removes partitions that cannot match; data skipping then removes individual files within surviving partitions using their column stats.',
        difficulty: 'intermediate',
      },
    ],
    'time-travel': [
      {
        q: 'Which syntax reads a specific historical Delta version?',
        options: ['AS OF SNAPSHOT n', 'VERSION AS OF n or TIMESTAMP AS OF t', 'ROLLBACK n', 'FROM HISTORY n'],
        correct: 1,
        explanation: 'Time travel uses VERSION AS OF <n> or TIMESTAMP AS OF <t>; Delta replays the log to that version and resolves the file set that was current then.',
        difficulty: 'basic',
      },
      {
        q: 'What bounds how far back time travel can go?',
        options: ['The checkpoint interval', 'VACUUM retention — files removed by VACUUM can no longer be read', 'The number of columns', 'The catalog type'],
        correct: 1,
        explanation: 'Time travel needs the historical data files. Once VACUUM deletes tombstoned files past the retention window, versions that referenced them can no longer be queried.',
        difficulty: 'intermediate',
      },
    ],
    'version-explorer': [
      {
        q: 'Which command lists a Delta table’s version history with operations and metrics?',
        options: ['SHOW SNAPSHOTS', 'DESCRIBE HISTORY', 'LIST VERSIONS', 'SELECT * FROM log'],
        correct: 1,
        explanation: 'DESCRIBE HISTORY returns one row per version with operation, parameters, user, timestamp, and operationMetrics (rows/files added & removed).',
        difficulty: 'basic',
      },
      {
        q: 'operationMetrics in the history come from which action?',
        options: ['protocol', 'commitInfo', 'metaData', 'add'],
        correct: 1,
        explanation: 'commitInfo is the audit action recorded with each commit; it carries the operation name, parameters, and metrics surfaced by DESCRIBE HISTORY.',
        difficulty: 'intermediate',
      },
    ],
    'commit-explorer': [
      {
        q: 'A remove action in a commit means what?',
        options: ['The file was physically deleted', 'The file is tombstoned — logically removed from this version onward', 'The schema changed', 'The partition was dropped'],
        correct: 1,
        explanation: 'remove tombstones a file: it is excluded from the table state going forward but stays on disk (for time travel) until VACUUM.',
        difficulty: 'intermediate',
      },
      {
        q: 'Which action upgrades the reader/writer features a table requires?',
        options: ['metaData', 'protocol', 'commitInfo', 'cdc'],
        correct: 1,
        explanation: 'The protocol action declares minimum reader/writer versions and table features (e.g. deletionVectors, columnMapping). Engines must support them to read/write.',
        difficulty: 'advanced',
      },
    ],
    'checkpoint': [
      {
        q: 'How often does Delta write a checkpoint by default?',
        options: ['Every commit', 'Every 10 commits', 'Every 100 commits', 'Only on VACUUM'],
        correct: 1,
        explanation: 'By default a Parquet checkpoint is written every 10 commits, snapshotting cumulative state so readers bound their log replay.',
        difficulty: 'basic',
      },
      {
        q: 'A checkpoint changes read cost from what to what?',
        options: ['O(1) to O(n)', 'O(n) replay of all commits to roughly O(1) from the last checkpoint', 'O(log n) to O(n)', 'No change',],
        correct: 1,
        explanation: 'Without checkpoints a reader replays every commit (O(n)). With checkpoints it loads the snapshot and replays only the few commits since — effectively O(1).',
        difficulty: 'intermediate',
      },
    ],
    'schema-evolution': [
      {
        q: 'Adding a nullable column to a Delta table requires what?',
        options: ['Rewriting all data files', 'A metadata-only commit (new metaData action)', 'A full VACUUM', 'Recreating the table'],
        correct: 1,
        explanation: 'ADD COLUMN just writes a new metaData action with the updated schema. Old files are untouched; the added column reads as null for them.',
        difficulty: 'basic',
      },
      {
        q: 'What does mergeSchema / schema evolution on write enable?',
        options: ['Automatic type narrowing', 'New columns in incoming data to be added to the table schema on write', 'Deleting columns automatically', 'Partition changes'],
        correct: 1,
        explanation: 'With schema evolution enabled, a write whose data has extra columns commits a metaData update that adds them, rather than failing on a schema mismatch.',
        difficulty: 'intermediate',
      },
    ],
    'partitioning': [
      {
        q: 'A generated column in Delta is…',
        options: ['A random id', 'A column computed from an expression over other columns (e.g. a date from a timestamp)', 'An auto-increment key', 'A hidden partition only'],
        correct: 1,
        explanation: 'Generated columns are defined by an expression; Delta can compute them on write and use them for partitioning and automatic partition-filter pushdown.',
        difficulty: 'intermediate',
      },
      {
        q: 'Why can over-partitioning (e.g. by a high-cardinality column) hurt?',
        options: ['It compresses badly', 'It creates many tiny files/partitions, inflating metadata and slowing reads', 'It disables time travel', 'It breaks ACID'],
        correct: 1,
        explanation: 'Each partition value becomes its own directory; a high-cardinality key yields countless small files, hurting planning and read throughput. Liquid clustering avoids this.',
        difficulty: 'intermediate',
      },
    ],
    'liquid-clustering': [
      {
        q: 'What problem does liquid clustering solve versus fixed partitioning?',
        options: ['It encrypts data', 'It adapts data layout to query patterns without rigid partition directories or full rewrites', 'It removes the log', 'It replaces checkpoints'],
        correct: 1,
        explanation: 'Liquid clustering clusters data by chosen keys and re-clusters incrementally, avoiding the small-file and skew problems of fixed partition columns.',
        difficulty: 'advanced',
      },
      {
        q: 'Can you change clustering keys on a liquid-clustered table later?',
        options: ['No, never', 'Yes — keys can evolve and new data clusters accordingly', 'Only by recreating the table', 'Only via VACUUM'],
        correct: 1,
        explanation: 'Liquid clustering keys can be changed; subsequent writes and OPTIMIZE cluster to the new keys without rewriting the whole table at once.',
        difficulty: 'advanced',
      },
    ],
    'concurrency': [
      {
        q: 'Delta uses which concurrency model?',
        options: ['Pessimistic table locks', 'Optimistic concurrency control with commit-time conflict detection', 'No concurrency control', 'Two-phase locking'],
        correct: 1,
        explanation: 'Writers proceed optimistically and detect conflicts when creating the next version file; the loser retries against the new state.',
        difficulty: 'intermediate',
      },
      {
        q: 'Two concurrent appends to the same table usually…',
        options: ['Always conflict', 'Do not conflict — appends only add files, so the loser retries and commits', 'Corrupt the table', 'Require a manual merge'],
        correct: 1,
        explanation: 'Blind appends touch disjoint file sets, so they rarely conflict; the writer that loses the version race simply re-commits at the next version.',
        difficulty: 'advanced',
      },
    ],
    'deletion-vectors': [
      {
        q: 'A deletion vector records what?',
        options: ['Which columns to drop', 'A bitmap of deleted row positions within a data file (merge-on-read)', 'The delete SQL text', 'The retention window'],
        correct: 1,
        explanation: 'A deletion vector marks rows as deleted inside an existing file without rewriting it; readers skip those positions. OPTIMIZE later materializes the changes.',
        difficulty: 'intermediate',
      },
      {
        q: 'What is the main benefit of deletion vectors over copy-on-write deletes?',
        options: ['Smaller schema', 'Fast deletes/updates that avoid rewriting whole files', 'They remove the log', 'They disable time travel'],
        correct: 1,
        explanation: 'Deletion vectors make DELETE/UPDATE cheap by avoiding full-file rewrites (merge-on-read); the cost shifts to a small read-time merge until OPTIMIZE compacts.',
        difficulty: 'advanced',
      },
    ],
    'optimize': [
      {
        q: 'What does OPTIMIZE do to a Delta table?',
        options: ['Deletes old versions', 'Bin-packs many small files into fewer right-sized files', 'Changes the schema', 'Vacuums tombstones'],
        correct: 1,
        explanation: 'OPTIMIZE compacts small files into larger ones (bin-packing), improving read throughput and reducing metadata overhead.',
        difficulty: 'basic',
      },
      {
        q: 'What does ZORDER BY add on top of compaction?',
        options: ['Encryption', 'Multi-dimensional data locality so several filter columns skip well together', 'Row-level security', 'Automatic partitioning'],
        correct: 1,
        explanation: 'ZORDER interleaves values of the chosen columns so co-filtered queries hit tighter min/max ranges per file, improving data skipping across multiple dimensions.',
        difficulty: 'advanced',
      },
    ],
    'vacuum': [
      {
        q: 'VACUUM permanently deletes which files?',
        options: ['All data files', 'Tombstoned files older than the retention window and no longer referenced', 'The checkpoint files', 'The latest data files'],
        correct: 1,
        explanation: 'VACUUM physically removes files that were tombstoned (removed) and are past the retention period, reclaiming storage.',
        difficulty: 'basic',
      },
      {
        q: 'What is the trade-off of a shorter VACUUM retention window?',
        options: ['Slower writes', 'Less storage used but shallower time travel / rollback', 'Bigger checkpoints', 'More partitions'],
        correct: 1,
        explanation: 'Shorter retention reclaims storage sooner but caps how far back you can time travel or roll back, since needed files get deleted. Default is 7 days.',
        difficulty: 'intermediate',
      },
    ],
    'change-data-feed': [
      {
        q: 'Change Data Feed (CDF) lets downstream jobs read what?',
        options: ['The whole table each run', 'Row-level inserts, deletes, and update pre/post images between versions', 'Only the schema', 'The checkpoint'],
        correct: 1,
        explanation: 'CDF emits the row-level changes between versions (insert, delete, update_preimage/postimage), so consumers process just what changed.',
        difficulty: 'intermediate',
      },
      {
        q: 'How do you read the changes between two versions once CDF is enabled?',
        options: ['DESCRIBE HISTORY', 'table_changes(\'t\', startVersion, endVersion) / readChangeFeed option', 'VACUUM DRY RUN', 'SHOW CHANGES'],
        correct: 1,
        explanation: 'After enabling delta.enableChangeDataFeed, read the feed with table_changes(...) in SQL or the readChangeFeed option with startingVersion in the DataFrame API.',
        difficulty: 'advanced',
      },
    ],
    'engine-integrations': [
      {
        q: 'Why can many engines read the same Delta table?',
        options: ['They share a driver', 'Delta is an open protocol; the log format is a documented spec', 'They all run on Spark', 'The catalog rewrites data per engine'],
        correct: 1,
        explanation: 'The transaction-log format is an open specification, so Spark, Trino, Flink, DuckDB, delta-rs and others implement it and operate on the same tables.',
        difficulty: 'basic',
      },
      {
        q: 'What determines whether a given engine can read a specific table?',
        options: ['The file count', 'Whether it supports the reader features the protocol action requires', 'The partition count', 'The table size'],
        correct: 1,
        explanation: 'The protocol action lists required reader/writer features (e.g. deletionVectors, columnMapping). An engine can read the table only if it supports every required reader feature.',
        difficulty: 'advanced',
      },
    ],
  });
})();
