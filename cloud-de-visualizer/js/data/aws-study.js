/* ============================================================
   Cloud DE Visualizer — AWS study enrichment.
   Authored study metadata merged onto the AWS service catalogue by
   _service-detail.js: a difficulty `level` and pedagogical `callouts`
   (insight / gotcha / interview / analogy / tip) placed on the depth
   sections. Purely additive — no service loses any existing content.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.StudyEnrich = TV.StudyEnrich || {};

  TV.StudyEnrich.aws = {
    s3: {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'Think coat-check, not filing cabinet: you hand over an object and get a ticket (the key). There are no drawers or folders — "folders" are an illusion the console paints from key prefixes.' }],
        why: [{ kind: 'insight', body: 'Decoupling storage from compute is the whole reason the lakehouse works — it is why five different engines can point at the same bytes and clusters can be thrown away between jobs.' }],
        how: [{ kind: 'gotcha', body: 'There is no atomic directory rename. "Renaming" a prefix is a copy-then-delete of every object — slow and historically non-atomic, which is exactly why S3-optimized committers and manifest-based table formats (Iceberg/Delta/Hudi) exist.' }],
      },
    },
    'glue-catalog': {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'The catalog is a library card index, not the books: it records where each table lives on S3 and its shape, but the data itself never moves into it.' }],
        how: [{ kind: 'gotcha', body: 'New partitions do not appear by magic. Until a crawler, MSCK REPAIR TABLE, or partition projection registers them, a freshly written dt=… prefix is invisible to Athena and Spectrum.' }],
      },
    },
    'glue-etl': {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'Serverless Spark means you pay per DPU-second with no cluster to babysit — great for spiky or scheduled ETL, but cold starts and per-job provisioning make it a poor fit for sub-second work.' }],
        how: [{ kind: 'interview', body: 'Know the difference between a Glue job (Spark ETL you author) and a Glue crawler (schema inference into the catalog) — interviewers often probe whether you conflate them.' }],
      },
    },
    'lake-formation': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'insight', body: 'Lake Formation expresses permissions against catalog databases/tables/columns/rows rather than S3 paths — it is IAM for the data, layered on top of the Glue Data Catalog.' }],
        how: [{ kind: 'gotcha', body: 'LF and raw IAM/S3 policies both apply. If a principal can still reach the bucket directly, LF fine-grained grants can be silently bypassed — the hybrid access model trips people up.' }],
      },
    },
    emr: {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'EMR is the "bring your own open-source engine" option — full control of Spark/Hive/Presto versions and tuning, at the cost of running (and paying for) the cluster yourself.' }],
        runtime: [{ kind: 'tip', body: 'EMR on transient clusters + Spot for task nodes is the classic cost pattern: core nodes on-demand for HDFS stability, task nodes on Spot for cheap burst compute.' }],
      },
    },
    athena: {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'Athena has no storage and no cluster — it is serverless Presto/Trino over S3 via the Glue catalog. Zero to query in seconds, but you give up the fine-grained tuning EMR offers.' }],
        how: [{ kind: 'interview', body: 'You pay per byte scanned, so the cost answer is always the same three levers: partition pruning, columnar format (Parquet/ORC), and compression. Say those and you have answered most Athena cost questions.' }],
      },
    },
    redshift: {
      level: 'core',
      callouts: {
        how: [{ kind: 'gotcha', body: 'Distribution and sort keys make or break Redshift. A bad DISTKEY causes data skew and network-heavy joins; the wrong SORTKEY kills zone-map pruning. This is the #1 Redshift performance topic.' }],
        why: [{ kind: 'insight', body: 'Redshift is a true MPP warehouse — columnar storage, data distributed across node slices, queries run in parallel. It shines on big aggregations, not on high-concurrency single-row lookups.' }],
      },
    },
    'redshift-spectrum': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'Spectrum lets Redshift reach outside its own walls to query S3 in place — external tables you JOIN against local warehouse tables in a single query.' }],
        how: [{ kind: 'interview', body: 'Classic use: keep hot data in Redshift, age cold history to S3, and query both together through Spectrum. Be ready to contrast it with Athena (same S3 data, different engine and billing).' }],
      },
    },
    kinesis: {
      level: 'core',
      callouts: {
        what: [{ kind: 'gotcha', body: 'Throughput is per shard (1 MB/s or 1000 records/s in, 2 MB/s out). Hot shards from a skewed partition key are the usual Kinesis scaling pain — choose the key carefully.' }],
        how: [{ kind: 'interview', body: 'Know Data Streams vs Firehose: Streams is a durable, replayable log you consume yourself; Firehose is zero-admin delivery that batches straight to S3/Redshift/OpenSearch with no consumer code.' }],
      },
    },
    msk: {
      level: 'advanced',
      callouts: {
        why: [{ kind: 'insight', body: 'MSK is managed Apache Kafka — pick it over Kinesis when you need real Kafka APIs, the consumer-group ecosystem, longer retention, or portability across clouds/on-prem.' }],
        runtime: [{ kind: 'tip', body: 'Consumer groups + partitions govern parallelism and ordering: order is guaranteed only within a partition, so the partition key decides both your ordering and your maximum consumer parallelism.' }],
      },
    },
    'step-functions': {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'Step Functions is serverless orchestration as a state machine — retries, catch, and parallel branches are declarative, so you stop hand-coding error handling between Lambdas.' }],
        how: [{ kind: 'interview', body: 'Contrast with MWAA/Airflow: Step Functions is event-driven, pay-per-transition, AWS-native; Airflow is schedule-first DAGs with a huge operator ecosystem. The choice is usually "AWS-native glue" vs "portable data pipelines".' }],
      },
    },
    mwaa: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'MWAA is managed Apache Airflow — you get the familiar DAGs/operators/scheduler without running the web server, scheduler, and workers yourself.' }],
        runtime: [{ kind: 'tip', body: 'The scheduler fires on data/time dependencies, not sub-second events. MWAA orchestrates batch pipelines; reach for Step Functions or EventBridge when you need event-driven, low-latency triggering.' }],
      },
    },
    lambda: {
      level: 'foundational',
      callouts: {
        why: [{ kind: 'insight', body: 'Lambda is the event glue of a pipeline — tiny, stateless functions that react to an S3 put, a stream record, or a schedule. Perfect for triggers and light transforms, wrong for long or memory-heavy Spark work.' }],
        how: [{ kind: 'gotcha', body: 'Hard limits shape the design: 15-minute max runtime, /tmp and memory caps, and cold starts. Heavy or long jobs belong on Glue/EMR; Lambda kicks them off.' }],
      },
    },
    dms: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'DMS does full-load + CDC: it bulk-copies a source database, then streams ongoing changes so the target stays in sync — the standard way to land operational data into the lake/warehouse with minimal downtime.' }],
        how: [{ kind: 'interview', body: 'CDC is the keyword. Be ready to explain how DMS reads the source transaction log (redo/binlog/WAL) to capture inserts/updates/deletes continuously, and why that beats repeated full snapshots.' }],
      },
    },
    iam: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'IAM authorizes every AWS request — identities (users/roles), JSON policies, and the allow/deny evaluation. In data pipelines you almost always use roles, not long-lived user keys.' }],
        how: [{ kind: 'interview', body: 'Know roles vs users and why roles win for services: a role is assumed for short-lived temporary credentials, so nothing long-lived is stored. "Least privilege" and resource-level policies are the phrases to reach for.' }],
      },
    },
    kms: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'KMS manages encryption keys and performs encrypt/decrypt under IAM control, so data at rest (S3, EBS, Redshift, RDS) is encrypted with keys you govern and audit rather than raw key material you handle.' }],
        how: [{ kind: 'tip', body: 'Envelope encryption is the model: KMS protects a data key, the data key encrypts the data. For SSE-KMS on S3, enable an S3 Bucket Key to cut per-object KMS calls (and cost) at scale.' }],
      },
    },
    cloudwatch: {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'CloudWatch is the metrics/logs/alarms plane: service and pipeline metrics, log groups, dashboards, and alarms that trigger actions — the first place you look when a job is slow or failing.' }],
      },
    },
    cloudtrail: {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'CloudTrail records API activity across the account — who did what, when, from where. It is the audit/forensics trail (distinct from CloudWatch, which watches operational health); querying CloudTrail logs in the lake is a common governance pattern.' }],
      },
    },
  };
})();
