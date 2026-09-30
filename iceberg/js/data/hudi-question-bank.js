/* ============================================================
   Apache Hudi question bank — per-screen MCQs, format-keyed.
   Shape: TV.QuestionBank.hudi[screenId] = [{ q, options, correct,
   explanation, difficulty }]. Grown per partition; the
   Test-Yourself modal shows its button only where a bank exists.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.QuestionBank = TV.QuestionBank || {};
  TV.QuestionBank.hudi = TV.QuestionBank.hudi || {};

  Object.assign(TV.QuestionBank.hudi, {
    'why-hudi': [
      {
        q: 'What is Apache Hudi optimized for that sets it apart from a plain columnar table?',
        options: ['Batch-only appends', 'Record-level upserts and incremental processing', 'Graph queries', 'Full-text search'],
        correct: 1,
        explanation: 'Hudi is record-key centric: upserts, deletes, and incremental queries are first-class, which is why it shines for streaming/CDC ingestion.',
        difficulty: 'basic',
      },
      {
        q: 'Where does Hudi record every action taken on a table?',
        options: ['A Hive table', 'The timeline under .hoodie/', 'Each Parquet footer', 'A manifest list'],
        correct: 1,
        explanation: 'The timeline in .hoodie/ is an ordered log of instants (action + state + time) — the source of truth for the table’s history.',
        difficulty: 'basic',
      },
    ],
    'architecture': [
      {
        q: 'A Hudi file slice consists of what?',
        options: ['Only a Parquet base file', 'A base Parquet file plus any Avro log files since the last compaction', 'Two Parquet files', 'A JSON commit'],
        correct: 1,
        explanation: 'A file slice is one version of a file group: the base Parquet file and the row-based Avro log files written against it (for MoR).',
        difficulty: 'intermediate',
      },
    ],
    'table-types': [
      {
        q: 'How does a Merge-on-Read (MoR) table handle an update?',
        options: ['Rewrites the base file immediately', 'Appends the change to an Avro log file, merged on read', 'Ignores it until VACUUM', 'Creates a new table'],
        correct: 1,
        explanation: 'MoR appends updates to log files (cheap writes) and merges them with the base file at read time, until compaction materializes a new base file.',
        difficulty: 'intermediate',
      },
      {
        q: 'Copy-on-Write (CoW) trades which way?',
        options: ['Cheap writes, costly reads', 'Costly writes (rewrite base files), fast clean reads', 'No time travel', 'No indexing'],
        correct: 1,
        explanation: 'CoW rewrites the affected base files on every write, so reads are clean columnar scans with no merge — at the cost of heavier writes.',
        difficulty: 'intermediate',
      },
    ],
    'upsert': [
      {
        q: 'During an upsert, what does Hudi use to find which file group a record key belongs to?',
        options: ['A full table scan', 'The index (Bloom / bucket / record-level)', 'The Parquet footer', 'The catalog'],
        correct: 1,
        explanation: 'The index maps record keys to file groups, so an upsert can locate and update the right files instead of scanning everything.',
        difficulty: 'intermediate',
      },
    ],
    'indexing': [
      {
        q: 'What does a Hudi index map?',
        options: ['Column → data type', 'Record key → the file group holding it', 'Partition → size', 'Instant → action'],
        correct: 1,
        explanation: 'The index maps each record key to its file group, so upserts and deletes target the right files instead of scanning the whole table.',
        difficulty: 'basic',
      },
      {
        q: 'Which index gives O(1) routing by hashing keys into a fixed number of file groups?',
        options: ['Bloom index', 'Bucket index', 'Simple index', 'No index'],
        correct: 1,
        explanation: 'The bucket index hashes keys into a fixed number of buckets (file groups), so routing needs no probe — great for high-throughput streaming.',
        difficulty: 'intermediate',
      },
    ],
    'incremental-query': [
      {
        q: 'An incremental query returns what?',
        options: ['The whole table', 'Only records changed between two instants', 'Only the schema', 'Only deleted rows'],
        correct: 1,
        explanation: 'Incremental queries read just the records changed between a begin and end instant — Hudi’s signature for efficient downstream pipelines.',
        difficulty: 'intermediate',
      },
    ],
    'query-types': [
      {
        q: 'On a Merge-on-Read table, which query type reads base files only (fastest, may lag)?',
        options: ['Snapshot', 'Read-optimized', 'Incremental', 'Time-travel'],
        correct: 1,
        explanation: 'The read-optimized query reads only compacted base files — fastest columnar reads, but it may miss un-compacted updates until compaction runs.',
        difficulty: 'intermediate',
      },
    ],
    'compaction': [
      {
        q: 'What does compaction do on a Merge-on-Read table?',
        options: ['Deletes old commits', 'Merges Avro log files into a new base Parquet file', 'Changes the schema', 'Rebalances partitions'],
        correct: 1,
        explanation: 'Compaction merges a file group’s log files into a fresh base file (a new file slice), so reads no longer pay a merge cost.',
        difficulty: 'intermediate',
      },
    ],
    'concurrency': [
      {
        q: 'Hudi multi-writer concurrency uses which model?',
        options: ['Table-level locks for the whole write', 'Optimistic concurrency control with an external lock provider at commit', 'No coordination', 'Two-phase commit'],
        correct: 1,
        explanation: 'Multiple writers use OCC: they write optimistically and, at commit, take a brief lock (Zookeeper/HMS/DynamoDB/filesystem); overlapping file groups cause the later writer to abort and retry.',
        difficulty: 'advanced',
      },
    ],
    'savepoint-restore': [
      {
        q: 'How do savepoint/restore differ from a time-travel query?',
        options: ['They are identical', 'Time travel reads the past; restore resets the table to a past instant', 'Restore only reads data', 'Savepoints delete data'],
        correct: 1,
        explanation: 'A time-travel query views an old instant without moving the head; restore actually rolls the table back. A savepoint pins an instant so cleaning keeps its files for recovery.',
        difficulty: 'intermediate',
      },
    ],
  });
})();
