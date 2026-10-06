/* ============================================================
   Cloud DE Visualizer — Certification comparison tables (C7).

   "Which service, and when" pairings the exams lean on heavily. Each
   comparison: when to use A, when to use B, and the exam-relevant note
   (usually: pick the APPROPRIATE service, not the most powerful).
   Keyed by vendor so the cram sheet can pull the relevant set.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  TV.CertCompare = {
    aws: [
      { a: 'AWS Glue', b: 'Amazon EMR', whenA: 'Serverless, scheduled/light Spark ETL with minimal ops', whenB: 'Large, long-running or heavily customized Spark/Hadoop needing cluster control + Spot', note: 'Exam favours the appropriate (cheaper, lower-ops) choice, not the most powerful.' },
      { a: 'Amazon Athena', b: 'Amazon Redshift', whenA: 'Ad-hoc, occasional SQL over S3; pay per TB scanned', whenB: 'Repeated, low-latency, high-concurrency BI on modeled data', note: 'Serverless pay-per-scan vs provisioned MPP. Redshift Spectrum bridges to S3.' },
      { a: 'Kinesis Data Streams', b: 'Amazon MSK', whenA: 'AWS-native streaming, low ops', whenB: 'Kafka API/ecosystem compatibility, very high fan-out', note: 'Both are brokers; choose on ecosystem + ops, not throughput alone.' },
      { a: 'Step Functions', b: 'MWAA (Airflow)', whenA: 'Serverless state-machine orchestration of AWS services', whenB: 'Complex Python-defined DAGs + the Airflow ecosystem', note: 'Least-infra vs ecosystem/flexibility.' },
      { a: 'AWS DMS', b: 'AWS Glue', whenA: 'Database migration + ongoing CDC replication', whenB: 'Transformation / ETL of data', note: 'DMS moves data (incl. CDC); Glue shapes it. Often used together.' },
      { a: 'Amazon S3', b: 'Amazon EFS', whenA: 'Scalable object storage for a data lake', whenB: 'Shared POSIX file system for apps/compute', note: 'Object store vs file system — a classic storage-type trap.' },
    ],
    databricks: [
      { a: 'Auto Loader', b: 'COPY INTO', whenA: 'Continuous/incremental ingest, millions of files, exactly-once', whenB: 'Simpler idempotent batch loads of smaller/periodic data', note: 'Auto Loader scales on file count via notifications; COPY INTO is SQL-simple.' },
      { a: 'Lakeflow Jobs', b: 'Lakeflow Declarative Pipelines (DLT)', whenA: 'Orchestrate arbitrary tasks (notebooks/JARs/SQL)', whenB: 'Declarative managed ETL with data-quality expectations', note: 'General orchestration vs managed declarative pipeline.' },
      { a: 'Serverless compute', b: 'Classic clusters', whenA: 'Instant start, managed, no cluster tuning', whenB: 'Fine-grained control of instance types/config', note: 'Trade control for simplicity + fast startup.' },
      { a: 'Z-ORDER', b: 'Liquid Clustering', whenA: 'Manual multi-column clustering via OPTIMIZE (static)', whenB: 'Adaptive, incremental clustering with no re-cluster jobs', note: 'Liquid Clustering is the newer, lower-maintenance successor.' },
      { a: 'Managed tables', b: 'External tables', whenA: 'Unity Catalog owns storage + lifecycle (DROP deletes data)', whenB: 'Data stays in place on DROP (UC manages metadata only)', note: 'Lifecycle ownership is the exam distinction.' },
      { a: 'Delta Lake', b: 'Apache Iceberg', whenA: 'Native lakehouse format on Databricks (log-based ACID)', whenB: 'Open format for cross-engine interop (via UniForm/federation)', note: 'Both are open table formats; Delta is native, Iceberg maximizes interop.' },
    ],
    azure: [
      { a: 'Fabric Pipeline', b: 'Dataflow Gen2', whenA: 'Orchestrate/move data + control flow', whenB: 'Low-code Power Query transformations', note: 'Orchestration vs transformation (notebooks add code-first option).', supplementary: true },
      { a: 'Fabric Lakehouse', b: 'Fabric Warehouse', whenA: 'Spark + files + Delta tables on OneLake', whenB: 'T-SQL warehouse with full DML', note: 'Spark/open-files vs T-SQL engine over the same OneLake.', supplementary: true },
      { a: 'Eventstream', b: 'Spark Structured Streaming', whenA: 'Low-code real-time ingestion/routing', whenB: 'Code-first stateful stream processing', note: 'Low-ops routing vs rich transforms.', supplementary: true },
      { a: 'OneLake shortcut', b: 'Copied data', whenA: 'Reference data in place (no copy, always fresh)', whenB: 'Physically duplicate data', note: 'Shortcuts avoid duplication + drift.', supplementary: true },
    ],
  };
})();
