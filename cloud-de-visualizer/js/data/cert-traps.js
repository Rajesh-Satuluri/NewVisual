/* ============================================================
   Cloud DE Visualizer — Common exam traps (C7).

   The mix-ups the exams deliberately test. Each: the trap, and the
   reality grounded in how the services actually behave. `vendor` lets
   the cram sheet show the relevant set ('all' = cross-vendor).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  TV.CertTraps = [
    { vendor: 'all', trap: 'Confusing storage with compute', reality: 'S3/ADLS/OneLake store data; Glue/EMR/Spark process it. "Where it lives" ≠ "what runs it".' },
    { vendor: 'all', trap: 'Confusing authentication with authorization', reality: 'IAM/Entra verify WHO you are; RBAC/Lake Formation/Unity Catalog decide WHAT you may do. KMS is encryption, not access.' },
    { vendor: 'all', trap: 'Confusing batch with streaming', reality: 'Batch = bounded, scheduled; streaming = unbounded, continuous. The latency/ordering requirements decide which.' },
    { vendor: 'all', trap: 'Full load vs incremental load', reality: 'Reprocessing everything is simple but costly; incremental (bookmarks / Auto Loader / watermarks) processes only new/changed data.' },
    { vendor: 'all', trap: 'Choosing the most powerful service, not the appropriate one', reality: 'Exams reward the option that meets requirements at the lowest cost/ops — e.g. Glue over EMR for light ETL.' },
    { vendor: 'all', trap: 'Ignoring cost and operational requirements', reality: 'A technically-correct answer that is needlessly expensive or high-ops is usually the wrong exam answer.' },
    { vendor: 'all', trap: 'A broker is not a processor', reality: 'Kinesis/MSK/Event Hubs/Eventstream buffer events; Spark/Flink/Structured Streaming process them. Databricks has no broker.' },
    { vendor: 'all', trap: 'Ordering is only guaranteed within a partition/shard', reality: 'Kinesis shards, Event Hubs partitions and Kafka partitions keep order per-partition — choose the partition key accordingly.' },
    { vendor: 'databricks', trap: 'Managed vs external tables', reality: 'DROP on a managed table deletes the data; on an external table it only removes metadata, leaving files in place.' },
    { vendor: 'databricks', trap: 'Partitioning vs clustering (Z-ORDER / Liquid)', reality: 'Partitioning splits by directory (low-cardinality); Z-ORDER/Liquid Clustering co-locate by common filter columns to skip files.' },
    { vendor: 'databricks', trap: 'VACUUM and time travel', reality: 'VACUUM deletes files past the retention window — it reclaims cost but truncates how far back you can time-travel.' },
    { vendor: 'aws', trap: 'RBAC/IAM vs data-level permissions', reality: 'IAM grants access to the service/bucket; Lake Formation adds table/column/row-level grants on catalog data.' },
    { vendor: 'azure', trap: 'DP-203 is not DP-700', reality: 'DP-203 (Azure DE) retired 2025-03-31; the active exam is DP-700 (Fabric), centred on OneLake/Fabric, not ADF/Synapse.' },
  ];

  TV.CertTrapsFor = function (vendor) {
    return TV.CertTraps.filter(t => t.vendor === 'all' || t.vendor === String(vendor || '').toLowerCase());
  };
})();
