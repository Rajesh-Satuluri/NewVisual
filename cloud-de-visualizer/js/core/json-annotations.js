/* ============================================================
   JSON Annotations — plain-English notes for Iceberg metadata
   fields. Used by CodeViewer to render inline "// comments"
   next to each JSON line so learners can read the metadata
   without prior knowledge.

   Lookup is convention-agnostic: keys are normalised by
   lower-casing and collapsing '-' / '_' to a single space, so
   one entry covers both spec-style ("file-path") and
   Avro/snake_case ("file_path") spellings.
   ============================================================ */

(function () {
  'use strict';

  /* fieldName → short explanation (kept to ~1 line each) */
  const NOTES = {
    /* ── metadata.json (table root) ── */
    'format version': 'Iceberg table format version — v2/v3 add row-level deletes',
    'table uuid': 'Permanent unique ID for this table (survives renames)',
    'location': 'Root S3/warehouse path where all table files live',
    'last updated ms': 'When this metadata was written (epoch milliseconds)',
    'last column id': 'Highest column ID ever assigned — IDs are never reused',
    'last partition id': 'Highest partition-field ID ever assigned',
    'last sequence number': 'Latest sequence number — increments on every commit',
    'current schema id': 'Which schema in "schemas" is active right now',
    'current partition spec': 'Which partition spec is active for new writes',
    'default sort order id': 'Which sort order writers cluster new files by',
    'current snapshot id': 'The snapshot a normal SELECT reads from',
    'metadata log': 'History of previous metadata.json files (for rollback)',

    /* ── schema / fields ── */
    'schemas': 'Full history of table schemas — old ones kept for time travel',
    'schema id': 'Identifier for this schema version',
    'fields': 'The columns defined in this schema',
    'field id': 'Permanent ID for a column — tracks it across renames',
    'source id': 'Column ID this partition field is derived from',
    'required': 'true = column may not be null',
    'doc': 'Human-readable description of this field',

    /* ── partitioning ── */
    'partition specs': 'History of partition layouts (partition evolution)',
    'partition spec': 'How data files are grouped into partitions',
    'partition spec id': 'Which partition spec produced this file/manifest',
    'spec id': 'Identifier for this partition spec',
    'transform': 'How the source column is converted to a partition value',
    'partition': 'The partition this file belongs to',
    'partitions': 'Per-partition min/max bounds — enables partition pruning',
    'order date day': 'day(order_date) — hidden partition transform value',
    'country code': 'The country_code partition value for this file',
    'order date': 'The order_date value / bound for this file',

    /* ── sort order ── */
    'sort orders': 'History of sort orders used when writing files',
    'order id': 'Identifier for this sort order',

    /* ── snapshots ── */
    'snapshots': 'Every committed version of the table (the snapshot chain)',
    'snapshot id': 'Unique ID of this snapshot (version)',
    'snapshot type': 'What kind of operation produced this snapshot',
    'parent snapshot id': 'The snapshot this one was built on top of',
    'added snapshot id': 'Snapshot that first added this manifest',
    'sequence number': 'Commit order — higher means newer',
    'timestamp ms': 'When this snapshot/commit happened (epoch ms)',
    'timestamp': 'When this event happened',
    'manifest list': 'Avro file listing every manifest for this snapshot',
    'operation': 'Write type: append, overwrite, delete, or replace',
    'summary': 'Roll-up statistics describing what this commit changed',

    /* ── refs (branches / tags) ── */
    'refs': 'Named branches and tags pointing at snapshots',
    'main': 'The default branch reference',
    'tag': 'A named, immutable pointer to a snapshot',
    'max ref age ms': 'How long this branch/tag is retained before expiry',
    'max snapshot age ms': 'How long snapshots are kept before they can expire',
    'min snapshots to keep': 'Floor on snapshots retained during expiry',

    /* ── snapshot summary metrics ── */
    'added data files': 'Number of data files added in this snapshot',
    'added data files count': 'Number of data files added in this snapshot',
    'added files size': 'Total bytes of files added in this snapshot',
    'added records': 'Number of rows added in this snapshot',
    'total records': 'Total rows in the table at this snapshot',
    'total files size': 'Total bytes of all data files at this snapshot',
    'total data files': 'Total number of data files at this snapshot',
    'changed partition count': 'How many partitions this commit touched',
    'deleted data files count': 'Number of data files removed in this snapshot',
    'existing data files count': 'Data files carried over unchanged',

    /* ── manifest list entries ── */
    'manifest path': 'S3 path to this manifest (Avro) file',
    'manifest length': 'Size of the manifest file in bytes',
    'manifests': 'The manifest files that make up this snapshot',
    'manifest': 'A manifest file describing a group of data files',
    'content': '0 = data files, 1 = position deletes, 2 = equality deletes',
    'contains null': 'Whether any file in this partition has null values',
    'lower bound': 'Smallest value seen for this column (for pruning)',
    'upper bound': 'Largest value seen for this column (for pruning)',

    /* ── manifest file / data-file entries ── */
    'status': '0 = EXISTING, 1 = ADDED, 2 = DELETED',
    'data files': 'The actual data files listed by this manifest',
    'data file': 'One data file and its column statistics',
    'file path': 'Exact S3 path to this data file',
    'file format': 'Storage format — PARQUET, ORC, or AVRO',
    'file size in bytes': 'Size of this data file on disk',
    'record count': 'Number of rows stored in this file',
    'column sizes': 'Bytes per column — used to estimate scan cost',
    'value counts': 'Number of values per column',
    'null value counts': 'Number of nulls per column',
    'lower bounds': 'Per-column minimum values — enables data-file skipping',
    'upper bounds': 'Per-column maximum values — enables data-file skipping',
    'deletion vector': 'Compact bitmap marking deleted rows in this file',
    'cardinality': 'How many rows the deletion vector marks as deleted',

    /* ── table properties ── */
    'properties': 'Table-level configuration knobs',
    'write.target-file-size-bytes': 'Target size writers aim for per data file',
    'write.parquet.compression-codec': 'Compression used for Parquet files',
    'write.distribution-mode': 'How rows are shuffled across write tasks',
    'history.expire.max-snapshot-age-ms': 'Age after which snapshots may expire',
    'history.expire.min-snapshots-to-keep': 'Minimum snapshots kept on expiry',

    /* ── Avro schema shape ── */
    'type': 'The data type (or a nested record/map/list definition)',
    'name': 'Name of this field or record',

    /* ── AWS Glue / catalog entry ── */
    'metadata location': 'Pointer to the current metadata.json — reads start here',
    'table type': 'Catalog table type (ICEBERG)',
  };

  function normalize(key) {
    return String(key || '')
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Pre-normalise the map so keys written in any convention resolve. */
  const MAP = Object.create(null);
  Object.keys(NOTES).forEach((k) => { MAP[normalize(k)] = NOTES[k]; });

  function lookup(key) {
    if (!key) return '';
    return MAP[normalize(key)] || '';
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.JsonAnnotations = { lookup, normalize };
})();
