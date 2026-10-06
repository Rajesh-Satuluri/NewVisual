/* ============================================================
   Cloud DE Visualizer — Hands-on lab playbooks (C6).

   The app has no execution sandbox, so labs are GUIDED PLAYBOOKS, not
   an executable environment: a clear objective, prerequisites, ordered
   steps, what to verify, an estimate, and the official doc to follow.
   You run them in your own AWS/Databricks account and self-mark
   completion — which feeds the certification "hands-on" readiness
   signal (TV.Progress.setLabDone / cert-engine).

   Shape: { id, title, certIds[], domainId, topicId, estMinutes,
            objective, prerequisites[], steps[], verify[],
            officialRef:{label,url} }
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const LABS = [
    /* ── AWS DEA-C01 ── */
    { id: 'lab-aws-s3-lake', title: 'Build an S3 data lake with lifecycle tiers', certIds: ['aws-dea-c01'], domainId: 'd2', topicId: 's3', estMinutes: 30,
      objective: 'Stand up a partitioned S3 lake layout and apply a lifecycle policy to tier cold data to cheaper storage.',
      prerequisites: ['AWS account', 'IAM permissions for S3'],
      steps: ['Create a bucket with raw/ and curated/ prefixes', 'Upload sample data partitioned by dt=YYYY-MM-DD', 'Add a Lifecycle rule: transition raw/ to Standard-IA after 30 days, Glacier after 90', 'Enable default encryption (SSE-KMS)'],
      verify: ['Objects show the partition layout', 'Lifecycle rule is active', 'New objects are encrypted'],
      officialRef: { label: 'S3 Lifecycle', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html' } },
    { id: 'lab-aws-glue-crawler', title: 'Catalog lake data with a Glue crawler', certIds: ['aws-dea-c01'], domainId: 'd2', topicId: 'glue-catalog', estMinutes: 25,
      objective: 'Crawl S3 data into the Glue Data Catalog so Athena can query it.',
      prerequisites: ['S3 lake with Parquet/CSV data'],
      steps: ['Create a Glue database', 'Create a crawler pointing at your S3 prefix', 'Run it and inspect the inferred table + partitions', 'Query the table in Athena'],
      verify: ['Table appears in the catalog with correct columns', 'Partitions are registered', 'Athena returns rows'],
      officialRef: { label: 'AWS Glue crawlers', url: 'https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html' } },
    { id: 'lab-aws-glue-incremental', title: 'Incremental Glue ETL with job bookmarks', certIds: ['aws-dea-c01'], domainId: 'd1', topicId: 'glue-etl', estMinutes: 40,
      objective: 'Build a Glue Spark job that processes only new files on each run using job bookmarks.',
      prerequisites: ['Cataloged source table', 'Target S3 prefix'],
      steps: ['Author a Glue (PySpark) job reading the source table', 'Enable job bookmarks in the job properties', 'Write Parquet partitioned output to the target', 'Run twice, adding new files between runs'],
      verify: ['Second run processes only the new files', 'No duplicate rows in the target', 'Output is partitioned Parquet'],
      officialRef: { label: 'Glue job bookmarks', url: 'https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html' } },
    { id: 'lab-aws-dms-cdc', title: 'CDC replication with DMS', certIds: ['aws-dea-c01'], domainId: 'd1', topicId: 'dms', estMinutes: 45,
      objective: 'Replicate a relational source to S3 with full load + ongoing CDC.',
      prerequisites: ['A source DB (RDS/PostgreSQL)', 'S3 target'],
      steps: ['Create source & target endpoints', 'Create a replication instance', 'Create a task: migrate existing data + replicate ongoing changes', 'Make a change at the source and watch it land'],
      verify: ['Full load completes', 'A source UPDATE appears in S3 as a change record'],
      officialRef: { label: 'AWS DMS', url: 'https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html' } },
    { id: 'lab-aws-athena', title: 'Cost-aware querying with Athena', certIds: ['aws-dea-c01'], domainId: 'd2', topicId: 'athena', estMinutes: 25,
      objective: 'Measure how Parquet + partitioning cut Athena bytes scanned.',
      prerequisites: ['Cataloged table (CSV and Parquet copies)'],
      steps: ['Run the same query over CSV and over partitioned Parquet', 'Compare "Data scanned" in the query stats', 'Add a partition filter and re-measure'],
      verify: ['Parquet scans far fewer bytes than CSV', 'Partition filter reduces scan further'],
      officialRef: { label: 'Athena performance', url: 'https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html' } },
    { id: 'lab-aws-lakeformation', title: 'Fine-grained access with Lake Formation', certIds: ['aws-dea-c01'], domainId: 'd4', topicId: 'lake-formation', estMinutes: 35,
      objective: 'Grant a principal access to specific columns/rows of a catalog table.',
      prerequisites: ['Lake Formation enabled', 'A catalog table'],
      steps: ['Register the S3 location with Lake Formation', 'Grant SELECT on specific columns to a role', 'Add a row-level filter', 'Query as that role to confirm enforcement'],
      verify: ['Restricted columns are hidden', 'Row filter limits results', 'Access is logged'],
      officialRef: { label: 'Lake Formation permissions', url: 'https://docs.aws.amazon.com/lake-formation/latest/dg/security-data-access.html' } },
    { id: 'lab-aws-monitor', title: 'Pipeline alerting with CloudWatch', certIds: ['aws-dea-c01'], domainId: 'd3', topicId: 'iq-orchestration', estMinutes: 20,
      objective: 'Alert within minutes when a job fails.',
      prerequisites: ['A Glue job or Step Functions workflow'],
      steps: ['Identify the failure metric (e.g. Glue job failure / SFN ExecutionsFailed)', 'Create a CloudWatch alarm on it', 'Wire the alarm to an SNS topic + email', 'Force a failure and confirm the alert'],
      verify: ['Alarm transitions to ALARM on failure', 'You receive the SNS notification'],
      officialRef: { label: 'CloudWatch alarms', url: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html' } },

    /* ── Databricks DE Associate ── */
    { id: 'lab-db-delta', title: 'Create a Delta table + time travel', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's3', topicId: 'delta-lake', estMinutes: 25,
      objective: 'Create a Delta table, make versions, and query history / time travel.',
      prerequisites: ['Databricks workspace', 'A cluster or serverless SQL'],
      steps: ['CREATE TABLE ... USING DELTA', 'INSERT, then UPDATE some rows', 'Run DESCRIBE HISTORY', 'SELECT ... VERSION AS OF an earlier version'],
      verify: ['History shows each commit', 'Time-travel query returns the old state'],
      officialRef: { label: 'Delta Lake', url: 'https://docs.databricks.com/delta/index.html' } },
    { id: 'lab-db-autoloader', title: 'Incremental ingestion with Auto Loader', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's2', topicId: 'auto-loader', estMinutes: 35,
      objective: 'Stream new files from cloud storage into a Delta table exactly once.',
      prerequisites: ['A cloud storage path receiving files'],
      steps: ['readStream with format("cloudFiles") + cloudFiles.format', 'Set a checkpointLocation', 'writeStream to a Delta table', 'Drop new files and confirm only they are processed'],
      verify: ['New files are ingested', 'Restart reprocesses nothing (checkpoint works)'],
      officialRef: { label: 'Auto Loader', url: 'https://docs.databricks.com/ingestion/auto-loader/index.html' } },
    { id: 'lab-db-merge', title: 'Upserts / SCD with Delta MERGE', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's3', topicId: 'delta-lake', estMinutes: 30,
      objective: 'Apply inserts + updates into a Silver table with MERGE INTO.',
      prerequisites: ['A target Delta table + a batch of changes'],
      steps: ['Stage a changes DataFrame', 'MERGE INTO target USING changes ON key', 'WHEN MATCHED THEN UPDATE / WHEN NOT MATCHED THEN INSERT', 'Re-run with overlapping keys'],
      verify: ['Existing rows update, new rows insert', 'No duplicates on the key'],
      officialRef: { label: 'Delta MERGE', url: 'https://docs.databricks.com/delta/merge.html' } },
    { id: 'lab-db-dlt', title: 'Declarative pipeline (Lakeflow / DLT)', certIds: ['dbx-de-associate'], domainId: 's3', topicId: 'delta-live-tables', estMinutes: 40,
      objective: 'Build a Bronze→Silver pipeline with data-quality expectations.',
      prerequisites: ['Auto Loader source'],
      steps: ['Define a bronze streaming table from Auto Loader', 'Define a silver table with @dlt.expect quality rules', 'Run the pipeline', 'Inspect the DAG + expectation metrics'],
      verify: ['Pipeline builds the DAG automatically', 'Bad rows are flagged/dropped by expectations'],
      officialRef: { label: 'Lakeflow Declarative Pipelines', url: 'https://docs.databricks.com/delta-live-tables/index.html' } },
    { id: 'lab-db-unity', title: 'Govern tables with Unity Catalog', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's5', topicId: 'unity-catalog', estMinutes: 30,
      objective: 'Create catalog/schema, grant access, and view lineage.',
      prerequisites: ['Unity Catalog-enabled workspace'],
      steps: ['CREATE CATALOG + SCHEMA', 'Create a managed table', 'GRANT SELECT to a group', 'Open the table lineage view'],
      verify: ['Grants enforce as expected', 'Lineage shows upstream/downstream'],
      officialRef: { label: 'Unity Catalog', url: 'https://docs.databricks.com/data-governance/unity-catalog/index.html' } },
    { id: 'lab-db-optimize', title: 'Optimize a Delta table (OPTIMIZE + Z-ORDER)', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's3', topicId: 'iq-optimization', estMinutes: 25,
      objective: 'Compact small files and cluster on a filter column; measure the read win.',
      prerequisites: ['A Delta table with many small files'],
      steps: ['Measure a filtered query runtime + files read', 'Run OPTIMIZE ... ZORDER BY (col) (or enable Liquid Clustering)', 'Re-run the query', 'Compare files scanned'],
      verify: ['File count drops after OPTIMIZE', 'Filtered query scans fewer files / runs faster'],
      officialRef: { label: 'Delta OPTIMIZE', url: 'https://docs.databricks.com/delta/optimize.html' } },
    { id: 'lab-db-jobs', title: 'Deploy a job with Asset Bundles', certIds: ['dbx-de-associate', 'dbx-de-professional'], domainId: 's4', topicId: 'workflows', estMinutes: 35,
      objective: 'Define and deploy a Lakeflow Job as code with a Databricks Asset Bundle.',
      prerequisites: ['Databricks CLI configured'],
      steps: ['databricks bundle init', 'Define a job + task in databricks.yml', 'databricks bundle deploy', 'Run it and repair a failed task'],
      verify: ['Job appears from the bundle', 'bundle deploy is repeatable across targets'],
      officialRef: { label: 'Databricks Asset Bundles', url: 'https://docs.databricks.com/dev-tools/bundles/index.html' } },
  ];

  TV.CertLabs = {
    list: LABS,
    byCert(certId) { return LABS.filter(l => (l.certIds || []).indexOf(certId) !== -1); },
  };
})();
