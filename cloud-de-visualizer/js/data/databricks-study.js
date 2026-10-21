/* ============================================================
   Cloud DE Visualizer — Databricks study enrichment.
   Authored level + pedagogical callouts merged onto the Databricks
   service catalogue by _service-detail.js. Purely additive.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.StudyEnrich = TV.StudyEnrich || {};

  TV.StudyEnrich.databricks = {
    'delta-lake': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Delta = Parquet files + a transaction log (_delta_log). That JSON/checkpoint log is what adds ACID, time travel, and schema enforcement on top of plain object storage.' }],
        how: [{ kind: 'gotcha', body: 'The log also creates the small-files and stale-metadata problems: run OPTIMIZE (and Z-ORDER) to compact, and VACUUM to retire old files — but VACUUM too aggressively and you break time travel.' }],
      },
    },
    'unity-catalog': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Unity Catalog is the account-level governance layer — a three-level namespace (catalog.schema.table), one place for grants, lineage, and audit across every workspace.' }],
        how: [{ kind: 'interview', body: 'Know the three-level namespace and that governance is centralized above the workspace. Contrast with the legacy Hive metastore, which was per-workspace with no unified lineage.' }],
      },
    },
    'delta-live-tables': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'DLT is declarative pipelines: you describe the target tables and quality rules, and Databricks manages the dependency DAG, incremental execution, and retries for you.' }],
        how: [{ kind: 'interview', body: 'Expectations are the headline feature — declarative data-quality constraints that can warn, drop, or fail the pipeline. Be ready to explain streaming vs materialized tables in DLT.' }],
      },
    },
    'auto-loader': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Auto Loader (cloudFiles) incrementally ingests new files as they land, tracking what it has already seen so you never rescan the whole directory.' }],
        how: [{ kind: 'gotcha', body: 'At high file volumes, directory listing gets slow — switch to file-notification mode (cloud queue events) instead of listing. Knowing when to make that switch is a common interview probe.' }],
      },
    },
    'structured-streaming': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'The core engine under most Databricks streaming: treat a stream as an unbounded table and run the same DataFrame code as batch — micro-batches under the hood.' }],
        runtime: [{ kind: 'gotcha', body: 'The checkpoint is sacred: it stores offsets and state for exactly-once. Delete or move it and you lose progress or replay data — never share one checkpoint across two queries.' }],
      },
    },
    'change-data-feed': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'insight', body: 'CDF makes a Delta table emit its row-level changes (insert/update/delete with _change_type) so downstream consumers process just the deltas instead of re-reading the whole table.' }],
        how: [{ kind: 'interview', body: 'The canonical use is incremental MERGE into Silver/Gold: read only changed rows from Bronze via CDF. It must be enabled on the table (delta.enableChangeDataFeed) before changes are tracked.' }],
      },
    },
    workflows: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Workflows is native Databricks orchestration — multi-task job DAGs (notebooks, JARs, DLT pipelines, SQL) with dependencies, retries, and scheduling, no external Airflow required.' }],
      },
    },
    photon: {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'Photon is a vectorized C++ execution engine that silently accelerates Spark SQL/DataFrame workloads — same code, faster scans and aggregations, better price/performance.' }],
        runtime: [{ kind: 'gotcha', body: 'It is not universal: Photon speeds up SQL/DataFrame operations but falls back to the JVM for unsupported ops and most UDFs — so a Python UDF can quietly erase the speedup.' }],
      },
    },
    clusters: {
      level: 'core',
      callouts: {
        how: [{ kind: 'interview', body: 'Know the three shapes: all-purpose (interactive, shared, pricey) for dev; job clusters (spun up per run, cheaper) for production; serverless for instant start with no infra to size. Picking the right one is a cost-and-latency tradeoff.' }],
      },
    },
    'databricks-sql': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Databricks SQL brings a warehouse experience — SQL warehouses (often Photon-powered), dashboards, and BI connectors — directly over Delta tables in the lakehouse, no separate warehouse to load.' }],
      },
    },
    mlflow: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'MLflow is the lifecycle layer: Tracking logs params/metrics/artifacts, the Model Registry versions and stages models, so experiments are reproducible and promotable.' }],
      },
    },
    'delta-sharing': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'An open protocol for sharing live Delta data across orgs and platforms without copying — the recipient reads your tables directly, even from non-Databricks tools.' }],
      },
    },
  };
})();
