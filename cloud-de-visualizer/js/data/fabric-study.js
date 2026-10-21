/* ============================================================
   Cloud DE Visualizer — Microsoft Fabric study enrichment.
   Authored level + pedagogical callouts merged onto the Fabric
   service catalogue by _service-detail.js. Purely additive.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.StudyEnrich = TV.StudyEnrich || {};

  TV.StudyEnrich.fabric = {
    onelake: {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'OneLake is "OneDrive for data" — one tenant-wide lake, automatically provisioned, that every Fabric workload reads and writes. Storage stops being something each team stands up separately.' }],
        why: [{ kind: 'insight', body: 'The headline is "one copy": all engines store Delta/Parquet in OneLake, and Shortcuts point at data in place (ADLS, S3, other workspaces) with no copy — so you avoid the sprawl of duplicating data per tool.' }],
      },
    },
    'fabric-lakehouse': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'A Lakehouse holds Delta tables plus unstructured files in OneLake, and auto-exposes a read-only SQL analytics endpoint — so Spark writes tables and analysts query them in T-SQL without a separate load.' }],
        how: [{ kind: 'interview', body: 'Know Direct Lake: Power BI reads the Delta files in OneLake directly — no import refresh and no DirectQuery round-trip — which is the Fabric performance story to name.' }],
      },
    },
    'fabric-warehouse': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'The Warehouse is full T-SQL with multi-table transactions and DML (INSERT/UPDATE/DELETE) over Delta in OneLake — the lakehouse gives you read SQL; the warehouse adds write SQL and transactional guarantees.' }],
        how: [{ kind: 'interview', body: 'Lakehouse vs Warehouse is the classic Fabric question: Lakehouse = Spark/files-first with a read-only SQL endpoint; Warehouse = T-SQL-first with full DML. Both store Delta in OneLake and can query each other.' }],
      },
    },
    'dataflow-gen2': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'Dataflow Gen2 is Power Query as cloud ETL: low-code, 150+ connectors, visual transforms, output to Lakehouse/Warehouse — the approachable ingestion path for analysts, versus Spark or pipelines for engineers.' }],
      },
    },
    'fabric-data-pipelines': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Data Pipelines are Fabric’s orchestration — the same Azure Data Factory engine and activities (Copy, notebook, dataflow, control flow) hosted inside Fabric to schedule and chain work.' }],
        how: [{ kind: 'interview', body: 'Pipelines orchestrate; Dataflows transform. Interviewers check you use a pipeline to move/sequence and a dataflow (or notebook) to do the actual transformation, rather than conflating the two.' }],
      },
    },
    'fabric-spark': {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'Fabric Spark gives managed notebooks on starter pools that attach in seconds, writing Delta to OneLake — the engine for heavy or code-first transformation that Dataflows are not built for.' }],
        runtime: [{ kind: 'tip', body: 'Starter pools cut cold-start to seconds; capacity is shared across the workspace. The V-Order write optimization lays Parquet out for fast Direct Lake reads downstream.' }],
      },
    },
    eventstream: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Eventstream is no-code streaming ingest and routing: pull from Event Hubs / Kafka / sources, transform in-flight, and fan out to an Eventhouse or Lakehouse — streaming without hand-written consumers.' }],
      },
    },
    eventhouse: {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'Eventhouse is the Kusto/ADX engine inside Fabric: a time-series/telemetry database queried with KQL, built for high-volume append-only event data and fast scans over time windows.' }],
        how: [{ kind: 'interview', body: 'Reach for Eventhouse (KQL) over a warehouse when the data is high-velocity logs/telemetry and queries are time-windowed — that workload is what KQL and its ingestion are tuned for.' }],
      },
    },
    'fabric-mirroring': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'insight', body: 'Mirroring continuously replicates an operational database (Azure SQL, Cosmos DB, Snowflake, …) into OneLake as Delta in near-real-time — analytics on fresh operational data with no ETL to build.' }],
        why: [{ kind: 'interview', body: 'It is CDC-as-a-feature: the source’s change feed lands as queryable Delta, so you get up-to-date analytics without a pipeline and without loading the source system.' }],
      },
    },
    'fabric-copy-job': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'Copy Job is a simplified, guided bulk/incremental copy — pick source and destination and it handles full-load then incremental, without authoring a full pipeline.' }],
      },
    },
    'fabric-sql-db': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Fabric SQL Database is an operational (OLTP) Azure SQL engine inside Fabric whose data is automatically mirrored to OneLake as Delta — so the same rows serve transactions and analytics without a separate pipeline.' }],
      },
    },
    'fabric-mlv': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'insight', body: 'Materialized Lake Views declare a transformation whose result is materialized as a managed Delta table in the lakehouse and kept current — declarative, dependency-tracked pipelines (conceptually like DLT) over OneLake.' }],
      },
    },
    'fabric-monitoring-hub': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'The Monitoring Hub is the single pane for run history across pipelines, dataflows, notebooks and more — where you watch status, durations and failures instead of checking each item separately.' }],
      },
    },
    'fabric-deployment-pipelines': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Deployment Pipelines + Git give Fabric real ALM: dev → test → prod stages and git-backed source control for workspace items, so changes are versioned and promoted rather than hand-edited in production.' }],
        how: [{ kind: 'interview', body: 'The ALM story is the point: git integration for version control and deployment pipelines for staged promotion — the answer to "how do you not develop straight in prod in Fabric".' }],
      },
    },
  };
})();
