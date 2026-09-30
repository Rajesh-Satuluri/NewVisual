/* ============================================================
   Apache Hudi concepts — glossary for palette/tooltips (per format).
   Stored at TV.HudiConcepts; grown in later partitions.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.HudiConcepts = {
    glossary: [
      { term: 'Timeline', definition: 'The ordered log of all actions on a Hudi table, stored in .hoodie/. Each entry is an instant with an action type and a state.' },
      { term: 'Instant', definition: 'A single point on the timeline: an action (commit, deltacommit, compaction, clean, rollback, replacecommit) plus a state (requested → inflight → completed) and a monotonic time.' },
      { term: 'Table type', definition: 'Copy-on-Write (CoW) rewrites base files on write; Merge-on-Read (MoR) appends Avro log files and merges on read. A first-class choice in Hudi.' },
      { term: 'File group', definition: 'A logical group of files identified by a FileID that holds all versions (file slices) of a set of records within a partition.' },
      { term: 'File slice', definition: 'One version of a file group: a base Parquet file plus any Avro log files written against it since the last compaction.' },
      { term: 'Base file / log file', definition: 'The base file is columnar Parquet. Log files are row-oriented Avro deltas (MoR) merged into the base during compaction.' },
      { term: 'Record key', definition: 'The primary key that uniquely identifies a record. Hudi is record-key centric, which makes upserts and deletes first-class.' },
      { term: 'Precombine field', definition: 'A field (often a timestamp/version) used to pick the winning record when two updates share the same key in a batch.' },
      { term: 'Index', definition: 'Maps a record key to the file group that holds it, so upserts can find and update the right file. Types: Bloom, simple, bucket, record-level (RLI).' },
      { term: 'Compaction', definition: 'A MoR table service that merges Avro log files into a new base Parquet file, producing a fresh file slice.' },
      { term: 'Clustering', definition: 'Reorganizes data (sort/co-locate) into new file groups for better skipping, without changing record values.' },
      { term: 'Cleaning', definition: 'Removes old file slices beyond the retention policy to reclaim storage while preserving enough history for readers and time travel.' },
      { term: 'Incremental query', definition: 'Reads only the records that changed between two instants — Hudi’s signature capability for efficient downstream pipelines.' },
      { term: 'Metadata table', definition: 'An internal MoR Hudi table under .hoodie/metadata that stores the file list, column stats, bloom filters, and record index to avoid slow file listings.' },
    ],
  };
})();
