/* ============================================================
   Delta Lake concepts — glossary for palette/tooltips (per format).
   Stored at TV.DeltaConcepts; populated further in later partitions.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.DeltaConcepts = {
    glossary: [
      { term: 'Transaction log (_delta_log)', definition: 'An ordered set of JSON commit files (one per version) plus periodic Parquet checkpoints — the single source of truth for a Delta table.' },
      { term: 'Commit / version', definition: 'One atomic change to the table, written as NNNNNNNNNNNNNNNNNNNN.json in _delta_log; the version number increases by one per commit.' },
      { term: 'Action', definition: 'An entry inside a commit: protocol, metaData, add (AddFile), remove (RemoveFile), commitInfo, or cdc.' },
      { term: 'AddFile / RemoveFile', definition: 'Actions that add or tombstone a data file. Each add carries path, partitionValues, size, and per-column stats (min/max/nullCount) used for data skipping.' },
      { term: 'Checkpoint', definition: 'A Parquet snapshot of cumulative table state written every N commits (default 10) so readers replay from the last checkpoint instead of version 0.' },
      { term: 'Data skipping', definition: 'Using per-file min/max stats stored in the log to eliminate files that cannot match a query predicate before reading any data.' },
      { term: 'Deletion vector', definition: 'A bitmap marking deleted rows within a data file (merge-on-read), avoiding a full file rewrite; materialized later by OPTIMIZE.' },
      { term: 'Optimistic concurrency control', definition: 'Delta detects conflicts at commit time: a losing writer retries against the new version, so concurrent writers never corrupt the table.' },
      { term: 'OPTIMIZE / Z-ORDER', definition: 'Compacts many small files into right-sized files; ZORDER BY co-locates related data for stronger multi-column data skipping.' },
      { term: 'Time travel', definition: 'Query an earlier table state with VERSION AS OF n or TIMESTAMP AS OF t by replaying the log up to that version.' },
    ],
  };
})();
