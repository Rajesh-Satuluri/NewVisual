/* ============================================================
   Redshift — Interview Bank. Keyed by module id.
   Each: { q, a, difficulty }. Consumed by the shared enhance layer.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  viz.P.redshift.interviewBank = {
    architecture: [
      { q: 'What does the leader node do, and do clients ever talk to compute nodes?', a: 'The leader node parses SQL, builds the query plan, compiles it to C++ segments, distributes work, and performs the final aggregation/sort. Clients connect only to the leader (via JDBC/ODBC) — never directly to compute nodes. On a single-node cluster the one node acts as both.', difficulty: 'easy' },
      { q: 'What is a slice and why does it matter?', a: 'A slice is a partition of a compute node with its own share of memory and disk. Slices are the unit of parallelism: each processes its data shard independently. Node type fixes the slice count (e.g. ra3.4xlarge = 4 slices, ra3.16xlarge = 16). A table\'s distribution style decides which slice stores each row.', difficulty: 'medium' },
      { q: 'Why is minimizing data redistribution important in Redshift?', a: 'Compute nodes exchange data over the network between query steps (e.g. for joins/aggregations). Redistribution (DS_DIST_BOTH in EXPLAIN) is expensive. Choosing distribution keys so join partners co-locate (DS_DIST_NONE) avoids it and is one of the biggest performance levers.', difficulty: 'hard' },
    ],
    'ra3-managed-storage': [
      { q: 'What problem do RA3 nodes solve versus DC2/DS2?', a: 'DC2/DS2 couple compute and storage, so scaling storage forces you to pay for compute you don\'t need (and vice versa). RA3 decouples them: you size compute by node type and pay for Redshift Managed Storage (RMS) separately, backed by S3.', difficulty: 'easy' },
      { q: 'How does RA3 keep queries fast if data lives in S3-backed RMS?', a: 'RA3 automatically caches hot blocks on fast local SSD and evicts cold data to RMS, fetching it on demand. Working sets stay on-node for speed while capacity scales in managed storage.', difficulty: 'medium' },
    ],
    serverless: [
      { q: 'What is an RPU and how are you billed in Serverless?', a: 'An RPU (Redshift Processing Unit) is the unit of Serverless compute; 1 RPU = 16 GB memory. You\'re billed in RPU-hours on a per-second basis while queries run (60-second minimum), with no compute charge when idle. Storage is billed separately as RMS.', difficulty: 'medium' },
      { q: 'What do base and max capacity control?', a: 'Base capacity is the compute floor (and a performance lever for big ETL); max capacity is the ceiling Serverless can auto-scale up to, which caps spend. Base was configurable 8–512 RPUs (newer regions allow a 4-RPU minimum and up to 1024).', difficulty: 'medium' },
    ],
    'columnar-storage': [
      { q: 'How do zone maps speed up scans?', a: 'Redshift stores columnar data in 1 MB blocks and keeps each block\'s min/max values in metadata (the zone map). For range-restricted predicates, the query processor compares the range to the zone map and skips blocks that can\'t match — reading far less data. No indexes are needed.', difficulty: 'medium' },
      { q: 'Why does sort order make zone maps more effective?', a: 'If rows are sorted on the filter column, each block holds a tight, non-overlapping value range, so a range predicate eliminates most blocks. Unsorted data has overlapping ranges per block, so few blocks can be skipped — which is why sort keys matter.', difficulty: 'hard' },
    ],
    'distribution-styles': [
      { q: 'Compare KEY, EVEN, ALL, and AUTO distribution.', a: 'KEY places rows by a column hash so tables sharing that join key co-locate (no redistribution). EVEN spreads rows round-robin (balanced, but joins may redistribute). ALL replicates the whole table to every node (great for small dimensions). AUTO (default) lets Redshift start small as ALL and switch to EVEN/KEY as the table grows.', difficulty: 'medium' },
      { q: 'What is distribution skew and how do you avoid it?', a: 'Skew is when a KEY column\'s values are uneven, so one slice holds disproportionately many rows and becomes the bottleneck. Avoid it by choosing a high-cardinality, evenly distributed join key — or use EVEN/AUTO when no good key exists.', difficulty: 'hard' },
    ],
    'sort-keys': [
      { q: 'When would you choose interleaved over compound sort keys?', a: 'Compound (default) is best when queries filter on a prefix of the sort columns and for tables with frequent INSERT/UPDATE/DELETE. Interleaved gives equal weight to each of up to 8 columns, helping when queries filter on different secondary columns — but it needs VACUUM REINDEX as it skews and is slower to maintain.', difficulty: 'hard' },
    ],
    'vacuum-analyze': [
      { q: 'What do VACUUM and ANALYZE each do?', a: 'VACUUM reclaims space from deleted rows and restores sort order (FULL = both; SORT ONLY / DELETE ONLY do one job; REINDEX for interleaved keys). ANALYZE refreshes table statistics so the planner picks good join orders/methods. Redshift auto-maintains both, but run them manually after large loads/deletes.', difficulty: 'medium' },
    ],
    'result-caching': [
      { q: 'When does Redshift serve a result from cache, and when is it invalidated?', a: 'The leader caches results and returns them instantly for an identical query (same SQL and permissions) using no compute. It\'s invalidated when the underlying data changes, so results are never stale. You can disable it per session with enable_result_cache_for_session for benchmarking.', difficulty: 'easy' },
    ],
    'materialized-views': [
      { q: 'What makes materialized views powerful for BI in Redshift?', a: 'They store precomputed join/aggregate results so dashboards read a small table instead of scanning billions of rows. With AUTO REFRESH YES, Redshift refreshes them (incrementally when possible), and automatic query rewrite can route base-table queries to a matching MV — even ones that never referenced it.', difficulty: 'medium' },
    ],
    wlm: [
      { q: 'What is Automatic WLM and why prefer it?', a: 'Automatic WLM lets Redshift set per-query memory and concurrency dynamically based on estimated needs, instead of hand-tuning static queues. It\'s recommended for most workloads; combine with query priorities and query monitoring rules (QMR) to control runaway queries.', difficulty: 'medium' },
    ],
    'concurrency-scaling': [
      { q: 'How does concurrency scaling work and what does it cost?', a: 'When queries routed to a queue exceed its concurrency, eligible (mostly read) queries run on transient scaling clusters added automatically, then results merge back. You earn up to one hour of free credits per day of cluster use; beyond that it\'s billed per second. AWS suggests enabling it when >15 queries must run in parallel.', difficulty: 'medium' },
    ],
    spectrum: [
      { q: 'How is Redshift Spectrum different from COPY?', a: 'COPY loads data into Redshift-managed storage; Spectrum queries data in place in S3 via external tables (backed by the Glue Data Catalog) with a separate elastic fleet, billed by data scanned. Use Spectrum for cold/historical lake data and COPY for hot data you query often.', difficulty: 'medium' },
    ],
    datashares: [
      { q: 'How do datashares avoid copying data across teams?', a: 'A producer publishes schemas/tables/views as a datashare — a live pointer into RA3 managed storage. Consumer clusters/workgroups query it read-only with their own compute (no contention), across accounts and regions. No ETL, one governed copy. For shared lake tables, the consumer pays for its own scans.', difficulty: 'medium' },
    ],
    'redshift-ml': [
      { q: 'Walk through Redshift ML end to end.', a: 'CREATE MODEL points at a training SELECT; Redshift exports the data and uses SageMaker (Autopilot) to select and train a model. The trained model is registered as a SQL function, and you call it in queries to run inference in-database at scale — no data movement or separate serving infrastructure.', difficulty: 'medium' },
    ],
    'copy-unload': [
      { q: 'How do you make COPY fast?', a: 'Split source data into multiple files (ideally a multiple of the slice count) so every slice loads in parallel; compress files (gzip/zstd/parquet); use an IAM role for S3 access; and COPY into empty tables to trigger automatic compression encoding. UNLOAD similarly writes to S3 in parallel.', difficulty: 'medium' },
    ],
    'iam-rbac': [
      { q: 'How do IAM and database RBAC differ in Redshift?', a: 'IAM controls AWS-level access — who can administer the cluster and what AWS services it can reach (an attached IAM role authorizes COPY/UNLOAD/Spectrum to S3/Glue without embedded keys). Database RBAC controls in-database privileges via roles granted to users, down to column- and row-level. They\'re complementary layers.', difficulty: 'medium' },
    ],
  };
})();
