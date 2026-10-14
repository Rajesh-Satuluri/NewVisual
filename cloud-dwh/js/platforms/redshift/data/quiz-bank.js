/* ============================================================
   Redshift — Quiz Bank. Keyed by module id.
   Each: { q, choices, answer (index), explain }.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  viz.P.redshift.quizBank = {
    architecture: [
      { q: 'Which component compiles the query plan and performs final aggregation?', choices: ['A compute node', 'The leader node', 'A slice', 'Amazon S3'], answer: 1, explain: 'The leader node parses, plans, compiles to C++ segments, and does the final aggregation; clients connect only to it.' },
      { q: 'What determines how many slices a compute node has?', choices: ['The distribution style', 'The number of tables', 'The node type', 'The sort key'], answer: 2, explain: 'Slice count is fixed by node type — e.g. ra3.4xlarge has 4 slices, ra3.16xlarge has 16.' },
    ],
    'ra3-managed-storage': [
      { q: 'What is the main advantage of RA3 nodes?', choices: ['They are always free', 'Compute and storage scale independently', 'They remove the leader node', 'They disable compression'], answer: 1, explain: 'RA3 decouples compute from Redshift Managed Storage (S3-backed), so you size and pay for each separately.' },
    ],
    serverless: [
      { q: 'How much memory does 1 RPU provide?', choices: ['1 GB', '8 GB', '16 GB', '64 GB'], answer: 2, explain: 'One Redshift Processing Unit provides 16 GB of memory. Billing is per-second RPU-hours while active (60s minimum).' },
    ],
    'columnar-storage': [
      { q: 'What is stored in a zone map?', choices: ['A full copy of the block', 'The min and max values per 1 MB block', 'The sort key definition', 'User permissions'], answer: 1, explain: 'Zone maps hold per-block min/max metadata so range-restricted predicates can skip non-matching 1 MB blocks.' },
    ],
    'distribution-styles': [
      { q: 'Which distribution style replicates a full copy of the table to every node?', choices: ['KEY', 'EVEN', 'ALL', 'AUTO'], answer: 2, explain: 'ALL replicates the whole table to each node — ideal for small dimension tables so joins never redistribute them.' },
      { q: 'What causes distribution skew?', choices: ['Using EVEN distribution', 'A KEY column with uneven/low-cardinality values', 'Enabling result caching', 'Running VACUUM'], answer: 1, explain: 'A lopsided KEY column sends too many rows to one slice, making it the bottleneck. Choose a high-cardinality, even key.' },
    ],
    'sort-keys': [
      { q: 'Which maintenance command restores an interleaved sort key\'s performance?', choices: ['ANALYZE', 'VACUUM REINDEX', 'COPY', 'REFRESH MATERIALIZED VIEW'], answer: 1, explain: 'Interleaved keys skew as data grows; VACUUM REINDEX re-analyzes them (an extra, slower pass).' },
    ],
    'result-caching': [
      { q: 'When is a cached result NOT returned?', choices: ['When the query is identical', 'When the underlying data has changed', 'When the leader node is used', 'When permissions match'], answer: 1, explain: 'The cache is invalidated when underlying data changes, so results are never stale.' },
    ],
    'concurrency-scaling': [
      { q: 'Concurrency scaling primarily helps with…', choices: ['Loading data faster', 'Bursts of concurrent (mostly read) queries', 'Encrypting data', 'Reducing storage cost'], answer: 1, explain: 'It adds transient clusters when a queue\'s concurrency is exceeded, mostly benefiting read queries; daily free credits apply.' },
    ],
    spectrum: [
      { q: 'Redshift Spectrum lets you…', choices: ['Load S3 data into Redshift', 'Query data in S3 without loading it', 'Encrypt the cluster', 'Resize the cluster'], answer: 1, explain: 'Spectrum queries S3 in place via external tables; it\'s billed by the amount of data scanned.' },
    ],
    'redshift-ml': [
      { q: 'Which service powers model training behind CREATE MODEL?', choices: ['Amazon EMR', 'Amazon SageMaker', 'AWS Glue', 'Amazon Athena'], answer: 1, explain: 'Redshift ML uses Amazon SageMaker (Autopilot) to train; the model is exposed as a SQL function for in-database inference.' },
    ],
    'copy-unload': [
      { q: 'How do you maximize COPY throughput?', choices: ['Use one large file', 'Split data into many slice-aligned files', 'Disable compression', 'Load into a non-empty table'], answer: 1, explain: 'Multiple files (ideally a multiple of the slice count) let all slices load in parallel; COPY into empty tables also auto-compresses.' },
    ],
  };
})();
