/* ============================================================
   Cloud DE Visualizer — End-to-end Project Tracks (Phase 4 / L4.1).

   Portfolio-grade, multi-stage projects that chain real services
   into something you can build in your own account and show in an
   interview — not single-service labs. Each track gives the goal,
   the architecture, ordered STAGES (objective + steps + the
   services used + a concrete deliverable + verification), the
   skills it demonstrates, cert/interview mapping, and official
   references. The app has no execution sandbox, so these are
   guided build plans you run yourself and self-mark per stage
   (persisted; also feeds TV.Progress when available).

   Shape:
     { id, title, cloud, level, summary, outcome,
       architecture:[...], skills:[...],
       stages:[{ id, title, objective, services:[...], steps:[...],
                 deliverable, verify:[...] }],
       certMapping:[{label, certId?}], refs:[{label,url}] }
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const TRACKS = [
    {
      id: 'aws-batch-lakehouse',
      title: 'AWS batch lakehouse, end to end',
      cloud: 'aws',
      level: 'Intermediate',
      summary: 'Build a governed, cost-aware batch analytics platform on AWS: land raw data in S3, catalog it, transform it with Glue, query with Athena, and secure it with Lake Formation — orchestrated and monitored.',
      outcome: 'A working raw→curated S3 lakehouse that Athena queries cheaply, with fine-grained access and failure alerting — the reference AWS data-platform you can demo.',
      architecture: [
        'Source files → S3 Bronze (partitioned, encrypted)',
        'Glue crawler → Glue Data Catalog',
        'Glue (PySpark) job with bookmarks → S3 Silver/Gold (Parquet)',
        'Athena queries the catalog; Lake Formation governs access',
        'Step Functions orchestrates; CloudWatch alerts on failure',
      ],
      skills: ['Partitioned lake design', 'Schema cataloging', 'Incremental Spark ETL', 'Cost-aware querying', 'Fine-grained governance', 'Orchestration & alerting'],
      stages: [
        { id: 's1', title: 'Land raw data in an S3 lake', objective: 'Create a partitioned, encrypted Bronze zone.', services: ['s3'],
          steps: ['Create a bucket with bronze/ silver/ gold/ prefixes', 'Upload sample data partitioned as dt=YYYY-MM-DD/', 'Enable SSE-KMS default encryption + Block Public Access'],
          deliverable: 'A Bronze prefix of partitioned, encrypted objects.', verify: ['Partition layout visible', 'New objects encrypted', 'No public access'] },
        { id: 's2', title: 'Catalog it', objective: 'Make the files queryable as tables.', services: ['glue-catalog', 'athena'],
          steps: ['Create a Glue database', 'Create + run a crawler over bronze/', 'Query the inferred table in Athena'],
          deliverable: 'A catalog table with registered partitions.', verify: ['Columns + partitions inferred', 'Athena returns rows'] },
        { id: 's3', title: 'Transform incrementally', objective: 'Build Silver/Gold with a bookmarked Glue job.', services: ['glue-etl', 's3'],
          steps: ['Author a Glue PySpark job reading the Bronze table', 'Enable job bookmarks (transformation_ctx per source)', 'Clean/aggregate → write partitioned Parquet to silver/ and gold/', 'Run twice, adding new files between runs'],
          deliverable: 'Silver + Gold Parquet tables, built incrementally.', verify: ['Second run processes only new files', 'No duplicate rows', 'Right-sized Parquet files'] },
        { id: 's4', title: 'Govern access', objective: 'Enforce column/row security on curated data.', services: ['lake-formation'],
          steps: ['Register the S3 location with Lake Formation', 'Grant SELECT on specific columns to a test role', 'Add a row-level filter', 'Query as the role to confirm'],
          deliverable: 'A role that sees only permitted columns/rows.', verify: ['Restricted columns hidden', 'Row filter limits results'] },
        { id: 's5', title: 'Orchestrate + alert', objective: 'Run the pipeline on a schedule and alert on failure.', services: ['step-functions'],
          steps: ['Wrap crawler + Glue job in a Step Functions state machine', 'Schedule it (EventBridge)', 'Create a CloudWatch alarm on ExecutionsFailed → SNS email', 'Force a failure and confirm the alert'],
          deliverable: 'A scheduled, monitored end-to-end pipeline.', verify: ['Pipeline runs on schedule', 'A forced failure pages you within minutes'] },
      ],
      certMapping: [{ label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01' }],
      refs: [
        { label: 'AWS: analytics lens / lake house', url: 'https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/analytics-lens.html' },
        { label: 'AWS Glue developer guide', url: 'https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html' },
      ],
    },

    {
      id: 'databricks-streaming-medallion',
      title: 'Databricks streaming medallion pipeline',
      cloud: 'databricks',
      level: 'Advanced',
      summary: 'Build an incremental, quality-gated medallion pipeline on Databricks: ingest files with Auto Loader, refine with declarative pipelines, govern with Unity Catalog, and serve with Databricks SQL.',
      outcome: 'A continuously-updating Bronze→Silver→Gold lakehouse with data-quality expectations, lineage and a BI-ready Gold layer.',
      architecture: [
        'Landing files → Auto Loader (incremental) → Bronze Delta',
        'Declarative pipeline (DLT): Bronze → Silver (expectations) → Gold',
        'Unity Catalog governs tables + lineage',
        'Databricks SQL / dashboard reads Gold',
      ],
      skills: ['Incremental file ingestion', 'Delta Lake & MERGE', 'Declarative ETL + data quality', 'Governance & lineage', 'SQL serving'],
      stages: [
        { id: 's1', title: 'Incremental ingest with Auto Loader', objective: 'Stream new files into Bronze exactly once.', services: ['auto-loader', 'delta-lake'],
          steps: ['Point Auto Loader (cloudFiles) at a landing path', 'Enable schema inference + evolution', 'Write to a Bronze Delta table (checkpointed)', 'Drop new files and watch them appear'],
          deliverable: 'A Bronze Delta table that ingests new files automatically.', verify: ['New files ingested once', 'Schema evolves without failure', 'Checkpoint survives restart'] },
        { id: 's2', title: 'Refine with a declarative pipeline', objective: 'Build Silver/Gold with quality gates.', services: ['delta-live-tables', 'delta-lake'],
          steps: ['Define Bronze → Silver with EXPECT constraints (drop/quarantine bad rows)', 'MERGE/APPLY CHANGES for dedupe/CDC into Silver', 'Aggregate Silver → Gold', 'Run the pipeline and inspect data-quality metrics'],
          deliverable: 'A DLT pipeline with passing expectations.', verify: ['Bad rows quarantined/dropped per expectation', 'Gold aggregates correct', 'Pipeline graph shows all tables'] },
        { id: 's3', title: 'Govern with Unity Catalog', objective: 'Secure tables and capture lineage.', services: ['unity-catalog'],
          steps: ['Register tables under catalog.schema', 'GRANT SELECT to an analyst group; add a column mask on PII', 'Open the lineage graph for a Gold column'],
          deliverable: 'Governed tables with masking + visible lineage.', verify: ['Analyst sees masked PII only', 'Column lineage traces Gold → source'] },
        { id: 's4', title: 'Serve to BI', objective: 'Expose Gold for low-latency querying.', services: ['databricks-sql'],
          steps: ['Create a SQL warehouse', 'Build a dashboard/query over Gold', 'Confirm grants are honored in DBSQL'],
          deliverable: 'A dashboard reading governed Gold tables.', verify: ['Dashboard renders', 'Unauthorized user is blocked'] },
      ],
      certMapping: [
        { label: 'Databricks Data Engineer Associate', certId: 'dbx-de-associate' },
        { label: 'Databricks Data Engineer Professional', certId: 'dbx-de-professional' },
      ],
      refs: [
        { label: 'Databricks: medallion architecture', url: 'https://docs.databricks.com/lakehouse/medallion.html' },
        { label: 'Databricks: Auto Loader', url: 'https://docs.databricks.com/ingestion/auto-loader/index.html' },
      ],
    },

    {
      id: 'fabric-realtime-lakehouse',
      title: 'Microsoft Fabric: real-time + lakehouse',
      cloud: 'fabric',
      level: 'Intermediate',
      summary: 'Build an end-to-end Fabric solution: ingest a live stream with Eventstream, land + refine in a Lakehouse on OneLake, orchestrate with pipelines, and serve Power BI with Direct Lake.',
      outcome: 'A Fabric workspace where a live feed and batch data converge in OneLake and power a Direct Lake Power BI report — the DP-700 reference build.',
      architecture: [
        'Live events → Eventstream → Eventhouse / Lakehouse',
        'Batch source → Pipeline / Dataflow Gen2 → Lakehouse (OneLake Delta)',
        'Spark notebooks refine Bronze → Silver → Gold',
        'Power BI Direct Lake reads Gold with no import',
      ],
      skills: ['Real-time ingestion', 'Lakehouse on OneLake', 'Spark transformation', 'Pipeline orchestration', 'Direct Lake serving', 'OneLake governance'],
      stages: [
        { id: 's1', title: 'Create the Lakehouse', objective: 'Stand up OneLake storage + Spark.', services: ['onelake', 'fabric-lakehouse'],
          steps: ['Create a workspace on a Fabric capacity', 'Create a Lakehouse (Files + Tables)', 'Load a sample batch file into Files'],
          deliverable: 'A Lakehouse with raw files in OneLake.', verify: ['Files visible in OneLake', 'SQL analytics endpoint available'] },
        { id: 's2', title: 'Ingest a live stream', objective: 'Route events into Fabric in real time.', services: ['eventstream'],
          steps: ['Create an Eventstream with a sample/Event Hubs source', 'Route it to an Eventhouse (KQL) and/or Lakehouse table', 'Confirm events arriving'],
          deliverable: 'A live stream landing in Fabric.', verify: ['Events flow within seconds', 'Destination table grows'] },
        { id: 's3', title: 'Refine with notebooks', objective: 'Build medallion Delta tables.', services: ['fabric-spark', 'onelake'],
          steps: ['Notebook: Bronze → Silver (clean, dedupe) as Delta', 'Silver → Gold aggregates', 'Apply V-Order / OPTIMIZE'],
          deliverable: 'Gold Delta tables on OneLake.', verify: ['Delta tables queryable via SQL endpoint', 'Gold aggregates correct'] },
        { id: 's4', title: 'Orchestrate', objective: 'Schedule the batch refinement.', services: ['fabric-data-pipelines'],
          steps: ['Create a pipeline: copy/dataflow → notebook run', 'Schedule it', 'Monitor runs in the Monitoring Hub'],
          deliverable: 'A scheduled, monitored pipeline.', verify: ['Pipeline runs on schedule', 'Runs visible in Monitoring Hub'] },
        { id: 's5', title: 'Serve with Direct Lake', objective: 'Power BI over Gold, no import.', services: ['fabric-lakehouse'],
          steps: ['Build a Direct Lake semantic model over Gold', 'Create a report', 'Secure with OneLake data-access roles / labels'],
          deliverable: 'A Direct Lake Power BI report on governed Gold.', verify: ['Report reads live Gold', 'Access restricted to permitted folders'] },
      ],
      certMapping: [{ label: 'DP-700 Fabric Data Engineer', certId: 'ms-dp700' }],
      refs: [
        { label: 'Microsoft Learn: Fabric end-to-end', url: 'https://learn.microsoft.com/fabric/get-started/end-to-end-tutorials' },
        { label: 'Fabric: Direct Lake', url: 'https://learn.microsoft.com/fabric/get-started/direct-lake-overview' },
      ],
    },

    {
      id: 'cdc-to-analytics-build',
      title: 'CDC from an operational DB to analytics',
      cloud: 'multi-cloud',
      level: 'Advanced',
      summary: 'Capture inserts/updates/deletes from an operational database and keep an analytics table a correct current image within minutes — without hammering production. Cloud-agnostic build with per-stack options.',
      outcome: 'A near-real-time analytics replica of an OLTP table, kept correct by ordered MERGE/APPLY CHANGES, with hard deletes handled.',
      architecture: [
        'Operational DB (WAL / transaction log)',
        '→ log-based CDC (Debezium / DMS / Fabric Mirroring)',
        '→ change events on a streaming log or managed mirror',
        '→ ACID lake table via MERGE / APPLY CHANGES (commit order)',
        '→ current-state analytics table',
      ],
      skills: ['Log-based CDC', 'Change-event transport', 'Idempotent MERGE / APPLY CHANGES', 'Ordering & delete handling', 'Correctness verification'],
      stages: [
        { id: 's1', title: 'Enable log-based capture', objective: 'Emit every change including deletes, with low source load.', services: [],
          steps: ['Configure the source for logical replication / CDC (WAL level, permissions)', 'Choose a capture tool (Debezium/Kafka Connect, AWS DMS, or Fabric Mirroring)', 'Start capture on one table'],
          deliverable: 'A stream of change events (I/U/D) from one table.', verify: ['Inserts, updates AND deletes captured', 'Source query load stays low'] },
        { id: 's2', title: 'Transport changes to the lake', objective: 'Ship ordered, replayable change events.', services: [],
          steps: ['Land change events on a streaming log or managed mirror', 'Persist a raw change feed (Bronze)', 'Confirm ordering metadata (LSN/commit ts) is present'],
          deliverable: 'A durable, ordered Bronze change feed.', verify: ['Events durable + replayable', 'Each event carries a commit/LSN order key'] },
        { id: 's3', title: 'Apply to a current-state table', objective: 'Keep the analytics table correct.', services: [],
          steps: ['MERGE / APPLY CHANGES INTO a Silver ACID table, ordered by commit key', 'Handle deletes (remove, not ignore)', 'Make it idempotent (replay-safe)'],
          deliverable: 'A Silver table that mirrors current source state.', verify: ['Updates reflected', 'Deletes remove rows (no ghosts)', 'Replaying events changes nothing'] },
        { id: 's4', title: 'Verify correctness & latency', objective: 'Prove it is right and timely.', services: [],
          steps: ['Row-count + checksum Silver vs source', 'Measure source-change → Silver latency', 'Test an out-of-order event does not resurrect a deleted row'],
          deliverable: 'A correctness + latency test you can re-run.', verify: ['Counts/checksums match', 'Latency within minutes', 'Ordering edge case handled'] },
      ],
      certMapping: [
        { label: 'AWS DEA-C01', certId: 'aws-dea-c01' },
        { label: 'Databricks DE Professional', certId: 'dbx-de-professional' },
        { label: 'DP-700 Fabric Data Engineer', certId: 'ms-dp700' },
      ],
      refs: [
        { label: 'Databricks: APPLY CHANGES INTO (CDC)', url: 'https://docs.databricks.com/delta-live-tables/cdc.html' },
        { label: 'AWS DMS: ongoing replication (CDC)', url: 'https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html' },
      ],
    },

    {
      id: 'production-hardening',
      title: 'Take a pipeline to production',
      cloud: 'multi-cloud',
      level: 'Advanced',
      summary: 'Turn a working-but-fragile pipeline into a production-grade one: observability, retries & idempotency, cost control, security, and disaster recovery. Cloud-agnostic hardening checklist with real deliverables.',
      outcome: 'A pipeline that is monitored, cheap, secure, and recoverable — the difference between a demo and a system an on-call engineer trusts.',
      architecture: [
        'Pipeline + metrics/logs → monitoring & alerting',
        'Idempotent, retried tasks with failure branches',
        'Right-sized compute + file layout → cost control',
        'Least-privilege identity + secrets manager',
        'Backups / replication + runbook → DR',
      ],
      skills: ['Observability & alerting', 'Idempotency & retries', 'Cost optimization', 'Security hardening', 'Disaster recovery', 'Runbooks'],
      stages: [
        { id: 's1', title: 'Observability', objective: 'Know within minutes when something breaks.', services: [],
          steps: ['Emit run metrics + structured logs to your monitoring stack', 'Alert on failure, SLA breach, and data-freshness lag', 'Build a one-glance run dashboard'],
          deliverable: 'Alerts + a dashboard for the pipeline.', verify: ['A forced failure alerts within minutes', 'Freshness lag is visible'] },
        { id: 's2', title: 'Reliability', objective: 'Make reruns safe.', services: [],
          steps: ['Make each task idempotent (MERGE/overwrite-by-partition, not blind append)', 'Add retries with backoff + failure/compensation branches', 'Add incremental checkpoints/bookmarks'],
          deliverable: 'A pipeline safe to rerun from failure.', verify: ['Rerun produces no duplicates', 'Transient failure auto-recovers'] },
        { id: 's3', title: 'Cost control', objective: 'Cut spend without breaking correctness.', services: [],
          steps: ['Push down partition/column pruning (read less)', 'Right-size compute; use auto-stop / Spot where safe', 'Compact small files; schedule OPTIMIZE'],
          deliverable: 'A measured before/after cost reduction.', verify: ['Bytes scanned / DBU-hours down', 'SLA still met'] },
        { id: 's4', title: 'Security', objective: 'Enforce least privilege.', services: [],
          steps: ['Replace keys with managed identity / IAM roles', 'Move secrets to a vault (referenced, not inlined)', 'Scope grants to exactly what the pipeline needs'],
          deliverable: 'A pipeline with no inline secrets + least-privilege access.', verify: ['No secrets in code/config', 'Over-broad grants removed'] },
        { id: 's5', title: 'Disaster recovery', objective: 'Be able to recover.', services: [],
          steps: ['Enable versioning/backups on critical data', 'Document RPO/RTO + a restore runbook', 'Do a restore drill to a scratch location'],
          deliverable: 'A tested restore runbook with RPO/RTO.', verify: ['Restore drill succeeds', 'RPO/RTO documented + met'] },
      ],
      certMapping: [
        { label: 'AWS DEA-C01', certId: 'aws-dea-c01' },
        { label: 'Databricks DE Professional', certId: 'dbx-de-professional' },
        { label: 'DP-700 Fabric Data Engineer', certId: 'ms-dp700' },
      ],
      refs: [
        { label: 'AWS Well-Architected: reliability pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html' },
        { label: 'Azure: data pipeline reliability guidance', url: 'https://learn.microsoft.com/azure/well-architected/reliability/' },
      ],
    },
  ];

  const byId = {};
  TRACKS.forEach(t => { byId[t.id] = t; });

  TV.ProjectTracks = {
    all() { return TRACKS.slice(); },
    byId(id) { return byId[id] || null; },
    byCloud(cloud) { return TRACKS.filter(t => t.cloud === cloud); },
    ids() { return TRACKS.map(t => t.id); },
    count() { return TRACKS.length; },
    stageCount(t) { return ((t && t.stages) || []).length; },
  };
})();
