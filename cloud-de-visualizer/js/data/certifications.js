/* ============================================================
   Cloud DE Visualizer — Certification data model (overlay).

   Certifications are a METADATA OVERLAY over the existing content, not
   a second copy of it. Each objective maps to taxonomy topic ids that
   already exist (services + interview drills); the UI deep-links to
   those pages. Only certification-specific metadata lives here:
   official domains + weightings, exam focus, official resources,
   version/last-verified/status, and `gaps` (objectives with no
   existing page yet — surfaced honestly, never faked).

   Facts verified 2026-10-06 against official vendor sources (see
   officialGuideUrl on each track). Certification objectives drift —
   re-verify before relying; the `lastVerified` + `version` + `status`
   fields and the CONTENT_UPDATE flag exist for exactly that.

   Topic id convention matches taxonomy.js:
     service page  → service id        e.g. "delta-lake"
     interview drill → "iq-" + id       e.g. "iq-spark-arch"
   Unmapped/official-only items go in `gaps` (shown as supplementary).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const LV = '2026-10-06'; // lastVerified for this build

  /* Concept depth tags (spec: FOUNDATION/INTERMEDIATE/ADVANCED/PROFESSIONAL) */
  const LEVEL = { F: 'FOUNDATION', I: 'INTERMEDIATE', A: 'ADVANCED', P: 'PROFESSIONAL' };

  const TRACKS = [

    /* ══════════════ AWS Certified Data Engineer – Associate ══════════════ */
    {
      certificationId: 'aws-dea-c01',
      vendor: 'AWS', name: 'AWS Certified Data Engineer – Associate', examCode: 'DEA-C01',
      level: 'Associate', status: 'active', difficulty: 'Intermediate',
      recommendedExperience: '2–3 yrs data engineering + 1–2 yrs hands-on AWS',
      examDuration: 130, questionCount: 65, passingScore: '720 / 1000', cost: '$150 USD', validity: '3 years',
      accent: 'aws',
      officialExamUrl: 'https://aws.amazon.com/certification/certified-data-engineer-associate/',
      officialGuideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html',
      officialTrainingUrl: 'https://skillbuilder.aws/',
      officialPracticeUrl: 'https://aws.amazon.com/certification/certification-prep/',
      version: 'DEA-C01', lastVerified: LV,
      domains: [
        { id: 'd1', name: 'Data Ingestion and Transformation', weight: 34, objectives: [
          { id: 'o1-1', statement: 'Perform data ingestion (batch and streaming)', level: LEVEL.I,
            topicIds: ['kinesis', 'msk', 'dms', 's3', 'lambda', 'iq-streaming'],
            services: ['Kinesis', 'MSK', 'DMS', 'S3', 'Lambda'],
            examFocus: ['Batch vs streaming ingestion', 'Kinesis Data Streams vs Firehose vs MSK', 'DMS full-load + CDC', 'Throughput/shards & ordering', 'Idempotent, replayable ingestion'],
            gaps: [] },
          { id: 'o1-2', statement: 'Transform and process data', level: LEVEL.I,
            topicIds: ['glue-etl', 'emr', 'lambda', 'athena'],
            services: ['Glue ETL', 'EMR', 'Lambda'],
            examFocus: ['Glue vs EMR (when to use each)', 'File formats (Parquet/Avro/ORC) & compression', 'Partitioning & predicate pushdown', 'Glue job bookmarks for incremental', 'Glue Data Quality'],
            gaps: ['Glue DataBrew'] },
          { id: 'o1-3', statement: 'Orchestrate data pipelines', level: LEVEL.I,
            topicIds: ['step-functions', 'mwaa', 'iq-orchestration'],
            services: ['Step Functions', 'MWAA', 'EventBridge'],
            examFocus: ['Step Functions vs MWAA', 'Event-driven triggers (EventBridge)', 'Retry / error handling / DLQ', 'Dependency & backfill patterns'],
            gaps: ['EventBridge'] },
          { id: 'o1-4', statement: 'Apply programming concepts (CI/CD, IaC, SQL/Python)', level: LEVEL.I,
            topicIds: ['glue-etl', 'lambda', 'iq-cicd-migration'],
            services: ['Glue', 'Lambda', 'CloudFormation/CDK'],
            examFocus: ['Idempotency & exactly-once', 'SQL vs Spark for transforms', 'Infrastructure as code', 'CI/CD for data pipelines'],
            gaps: ['CloudFormation/CDK', 'CodePipeline'] },
        ]},
        { id: 'd2', name: 'Data Store Management', weight: 26, objectives: [
          { id: 'o2-1', statement: 'Choose a data store for the use case', level: LEVEL.I,
            topicIds: ['s3', 'redshift', 'athena', 'redshift-spectrum', 'iq-redshift'],
            services: ['S3', 'Redshift', 'Athena', 'DynamoDB', 'RDS', 'Aurora'],
            examFocus: ['Lake (S3) vs warehouse (Redshift) vs lakehouse', 'Athena (serverless SQL) vs Redshift (provisioned MPP)', 'OLTP (RDS/Aurora/DynamoDB) vs OLAP', 'Cost/latency/access-pattern fit'],
            gaps: ['DynamoDB', 'RDS', 'Aurora'] },
          { id: 'o2-2', statement: 'Understand cataloging systems', level: LEVEL.F,
            topicIds: ['glue-catalog', 'lake-formation', 'iq-glue'],
            services: ['Glue Data Catalog', 'Glue Crawlers', 'Lake Formation'],
            examFocus: ['Catalog as shared metastore', 'Crawlers & schema inference', 'Partitions in the catalog'],
            gaps: [] },
          { id: 'o2-3', statement: 'Manage the lifecycle of data', level: LEVEL.I,
            topicIds: ['s3'],
            services: ['S3 storage classes', 'S3 Lifecycle', 'Glacier'],
            examFocus: ['Storage classes (Standard/IA/Glacier)', 'Lifecycle policies & archival', 'Retention & cost tiers'],
            gaps: [] },
          { id: 'o2-4', statement: 'Design data models and schema evolution', level: LEVEL.I,
            topicIds: ['redshift', 's3', 'iq-file-formats'],
            services: ['Redshift', 'Glue Catalog', 'S3'],
            examFocus: ['Dist/sort keys (Redshift)', 'Partitioning vs indexing', 'Schema evolution in the lake', 'Star schema / SCD'],
            gaps: [] },
        ]},
        { id: 'd3', name: 'Data Operations and Support', weight: 22, objectives: [
          { id: 'o3-1', statement: 'Automate data processing', level: LEVEL.I,
            topicIds: ['step-functions', 'lambda', 'mwaa'],
            services: ['Step Functions', 'Lambda', 'MWAA'],
            examFocus: ['Event-driven automation', 'Scheduling & triggers'], gaps: ['EventBridge Scheduler'] },
          { id: 'o3-2', statement: 'Analyze data using AWS services', level: LEVEL.F,
            topicIds: ['athena', 'redshift', 'redshift-spectrum', 'iq-athena'],
            services: ['Athena', 'Redshift', 'QuickSight'],
            examFocus: ['Athena query tuning & cost', 'Redshift Spectrum over S3'], gaps: ['QuickSight'] },
          { id: 'o3-3', statement: 'Maintain and monitor data pipelines', level: LEVEL.I,
            topicIds: ['cloudwatch', 'cloudtrail', 'step-functions', 'iq-orchestration'],
            services: ['CloudWatch', 'CloudTrail', 'Step Functions'],
            examFocus: ['Pipeline metrics/logs/alarms', 'Failure handling & retry', 'Troubleshooting slow Glue/EMR jobs'],
            gaps: [] },
          { id: 'o3-4', statement: 'Ensure data quality', level: LEVEL.I,
            topicIds: ['glue-etl'],
            services: ['Glue Data Quality', 'Deequ'],
            examFocus: ['Data-quality rules & gating', 'Dedup / completeness / freshness'], gaps: ['Glue Data Quality (DQDL)'] },
        ]},
        { id: 'd4', name: 'Data Security and Governance', weight: 18, objectives: [
          { id: 'o4-1', statement: 'Apply authentication & authorization', level: LEVEL.I,
            topicIds: ['iam', 'lake-formation', 'iq-security'],
            services: ['IAM', 'Lake Formation', 'IAM Identity Center'],
            examFocus: ['IAM roles/policies & least privilege', 'Authentication vs authorization', 'Lake Formation fine-grained grants', 'Cross-account access'],
            gaps: [] },
          { id: 'o4-2', statement: 'Ensure data encryption and masking', level: LEVEL.I,
            topicIds: ['kms', 's3'],
            services: ['KMS', 'S3 encryption', 'Secrets Manager'],
            examFocus: ['Encryption at rest/in transit', 'KMS key policies', 'Column masking / PII'],
            gaps: ['Secrets Manager'] },
          { id: 'o4-3', statement: 'Prepare logs for audit & ensure governance', level: LEVEL.I,
            topicIds: ['cloudtrail', 'lake-formation'],
            services: ['CloudTrail', 'Lake Formation', 'Macie'],
            examFocus: ['Audit logging', 'Data governance & lineage', 'PII detection & compliance'],
            gaps: ['Macie'] },
        ]},
      ],
      capstone: { title: 'Enterprise AWS Data Lake',
        flow: ['S3 (raw)', 'Glue Crawler + Catalog', 'Glue ETL → curated', 'Lake Formation grants', 'Athena / Redshift Spectrum', 'CloudWatch monitoring'] },
    },

    /* ══════════════ Databricks Certified Data Engineer Associate ══════════════ */
    {
      certificationId: 'dbx-de-associate',
      vendor: 'Databricks', name: 'Databricks Certified Data Engineer Associate', examCode: null,
      level: 'Associate', status: 'active', difficulty: 'Intermediate',
      recommendedExperience: '6+ months hands-on Databricks / Spark',
      examDuration: 90, questionCount: 45, passingScore: 'Pass/fail (~70%)', cost: '$200 USD', validity: '2 years',
      accent: 'databricks',
      officialExamUrl: 'https://www.databricks.com/learn/certification/data-engineer-associate',
      officialGuideUrl: 'https://www.databricks.com/learn/certification/data-engineer-associate',
      officialTrainingUrl: 'https://www.databricks.com/learn/training/home',
      officialPracticeUrl: 'https://www.databricks.com/learn/certification/data-engineer-associate',
      version: 'Guide Jul 2025', lastVerified: LV,
      domains: [
        { id: 's1', name: 'Databricks Intelligence Platform', weight: 10, objectives: [
          { id: 'a1-1', statement: 'Platform value, compute selection, performance features', level: LEVEL.F,
            topicIds: ['clusters', 'photon', 'databricks-sql', 'iq-pricing'],
            services: ['Clusters', 'Photon', 'Serverless', 'Databricks SQL'],
            examFocus: ['All-purpose vs job vs serverless compute', 'Photon speedups', 'When each compute fits'], gaps: [] },
        ]},
        { id: 's2', name: 'Development and Ingestion', weight: 30, objectives: [
          { id: 'a2-1', statement: 'Ingest with Auto Loader; notebooks & Databricks Connect', level: LEVEL.I,
            topicIds: ['auto-loader', 'iq-transformations', 'iq-pyspark-coding'],
            services: ['Auto Loader', 'Notebooks', 'Databricks Connect'],
            examFocus: ['Auto Loader sources & syntax', 'cloudFiles options', 'Exactly-once via checkpoints', 'COPY INTO vs Auto Loader'], gaps: [] },
          { id: 'a2-2', statement: 'Transform data with PySpark & SQL', level: LEVEL.I,
            topicIds: ['iq-spark-arch', 'iq-transformations', 'iq-joins', 'iq-pyspark-coding', 'databricks-sql'],
            services: ['PySpark', 'Spark SQL'],
            examFocus: ['DataFrame transforms & aggregations', 'Joins', 'DDL/DML'], gaps: [] },
        ]},
        { id: 's3', name: 'Data Processing & Transformations', weight: 31, objectives: [
          { id: 'a3-1', statement: 'Medallion architecture & Lakeflow Declarative Pipelines (ex-DLT)', level: LEVEL.I,
            topicIds: ['delta-live-tables', 'delta-lake', 'iq-delta'],
            services: ['Lakeflow Declarative Pipelines (DLT)', 'Delta Lake'],
            examFocus: ['Bronze/Silver/Gold', 'Declarative pipelines + expectations', 'Streaming vs batch tables'], gaps: [] },
          { id: 'a3-2', statement: 'Delta Lake operations & complex aggregations', level: LEVEL.I,
            topicIds: ['delta-lake', 'change-data-feed', 'iq-partitioning'],
            services: ['Delta Lake', 'MERGE', 'CDF'],
            examFocus: ['MERGE / upserts', 'Time travel & VACUUM', 'OPTIMIZE / Z-ORDER / Liquid Clustering'], gaps: [] },
        ]},
        { id: 's4', name: 'Productionizing Data Pipelines', weight: 18, objectives: [
          { id: 'a4-1', statement: 'Lakeflow Jobs, Asset Bundles (DAB), serverless, Spark UI', level: LEVEL.I,
            topicIds: ['workflows', 'iq-workflows', 'clusters', 'iq-optimization'],
            services: ['Lakeflow Jobs', 'Databricks Asset Bundles', 'Serverless'],
            examFocus: ['Deploy/repair/rerun jobs', 'DAB vs traditional deploy', 'Reading the Spark UI'], gaps: ['Databricks Asset Bundles (DAB)'] },
        ]},
        { id: 's5', name: 'Data Governance & Quality', weight: 11, objectives: [
          { id: 'a5-1', statement: 'Unity Catalog, managed vs external, Delta Sharing, lineage', level: LEVEL.I,
            topicIds: ['unity-catalog', 'iq-unity', 'delta-sharing'],
            services: ['Unity Catalog', 'Delta Sharing', 'Lakehouse Federation'],
            examFocus: ['Managed vs external tables', 'UC grants/roles & lineage', 'Delta Sharing types & limits', 'Lakehouse Federation use cases'], gaps: ['Lakehouse Federation'] },
        ]},
      ],
      capstone: { title: 'Production Lakehouse',
        flow: ['Auto Loader', 'Bronze', 'Silver (MERGE)', 'Gold', 'Unity Catalog', 'Databricks SQL'] },
    },

    /* ══════════════ Databricks Certified Data Engineer Professional ══════════════ */
    {
      certificationId: 'dbx-de-professional',
      vendor: 'Databricks', name: 'Databricks Certified Data Engineer Professional', examCode: null,
      level: 'Professional', status: 'active', difficulty: 'Advanced',
      recommendedExperience: '1+ yr production Databricks; strong Spark internals & Delta',
      examDuration: 120, questionCount: 59, passingScore: 'Pass/fail', cost: '$200 USD', validity: '2 years',
      accent: 'databricks',
      officialExamUrl: 'https://www.databricks.com/learn/certification/data-engineer-professional',
      officialGuideUrl: 'https://www.databricks.com/learn/certification/data-engineer-professional',
      officialTrainingUrl: 'https://www.databricks.com/learn/training/home',
      version: 'Guide Nov 30 2025', lastVerified: LV,
      domains: [
        { id: 'p1', name: 'Developing Code for Data Processing (Python & SQL)', weight: 22, objectives: [
          { id: 'pp1-1', statement: 'Advanced PySpark/SQL, performance-aware code', level: LEVEL.P,
            topicIds: ['iq-spark-arch', 'iq-pyspark-coding', 'iq-transformations', 'iq-joins', 'iq-optimization'],
            services: ['PySpark', 'Spark SQL'],
            examFocus: ['Advanced joins & window fns', 'Broadcast & skew handling', 'AQE', 'UDF cost'], gaps: [] },
        ]},
        { id: 'p2', name: 'Data Ingestion & Acquisition', weight: 7, objectives: [
          { id: 'pp2-1', statement: 'Advanced Auto Loader & streaming ingestion', level: LEVEL.A,
            topicIds: ['auto-loader', 'structured-streaming'],
            services: ['Auto Loader', 'Structured Streaming'],
            examFocus: ['Schema evolution', 'File-notification mode at scale'], gaps: [] },
        ]},
        { id: 'p3', name: 'Data Transformation, Cleansing & Quality', weight: 10, objectives: [
          { id: 'pp3-1', statement: 'CDC, SCD, dedup, late data with Delta', level: LEVEL.A,
            topicIds: ['change-data-feed', 'delta-lake', 'structured-streaming'],
            services: ['Delta CDF', 'MERGE', 'Structured Streaming'],
            examFocus: ['CDC with CDF', 'SCD Type 2 via MERGE', 'Watermarks & late data', 'Dedup'], gaps: [] },
        ]},
        { id: 'p4', name: 'Data Sharing & Federation', weight: 5, objectives: [
          { id: 'pp4-1', statement: 'Delta Sharing & Lakehouse Federation', level: LEVEL.A,
            topicIds: ['delta-sharing', 'unity-catalog'],
            services: ['Delta Sharing', 'Lakehouse Federation'],
            examFocus: ['Sharing types & cross-cloud cost', 'Federation vs ingest'], gaps: ['Lakehouse Federation'] },
        ]},
        { id: 'p5', name: 'Monitoring & Alerting', weight: 10, objectives: [
          { id: 'pp5-1', statement: 'Production monitoring, Spark UI, alerts', level: LEVEL.A,
            topicIds: ['iq-optimization', 'iq-memory-oom', 'workflows'],
            services: ['Spark UI', 'Lakeflow Jobs', 'System tables'],
            examFocus: ['Diagnosing stages/spill/skew', 'Job alerts & retries', 'OOM troubleshooting'], gaps: ['System tables'] },
        ]},
        { id: 'p6', name: 'Cost & Performance Optimization', weight: 13, objectives: [
          { id: 'pp6-1', statement: 'Tuning, clustering, Delta optimization', level: LEVEL.P,
            topicIds: ['iq-optimization', 'iq-partitioning', 'iq-caching', 'delta-lake', 'photon'],
            services: ['OPTIMIZE / Z-ORDER', 'Liquid Clustering', 'Photon', 'Serverless'],
            examFocus: ['Z-ORDER vs Liquid Clustering', 'Partition sizing & file compaction', 'Shuffle/AQE', 'Cost levers'], gaps: [] },
        ]},
        { id: 'p7', name: 'Data Security & Compliance', weight: 10, objectives: [
          { id: 'pp7-1', statement: 'Row/column security, masking, compliance', level: LEVEL.A,
            topicIds: ['unity-catalog', 'iq-unity'],
            services: ['Unity Catalog', 'Dynamic views'],
            examFocus: ['Row filters & column masks', 'Fine-grained grants', 'PII handling'], gaps: [] },
        ]},
        { id: 'p8', name: 'Data Governance', weight: 7, objectives: [
          { id: 'pp8-1', statement: 'UC governance, lineage, audit', level: LEVEL.A,
            topicIds: ['unity-catalog', 'delta-sharing'],
            services: ['Unity Catalog', 'Lineage', 'Audit logs'],
            examFocus: ['Lineage & audit', 'Catalog/schema design'], gaps: [] },
        ]},
        { id: 'p9', name: 'Debugging and Deploying', weight: 10, objectives: [
          { id: 'pp9-1', statement: 'Debug failed jobs; deploy & promote with DABs and Git CI/CD', level: LEVEL.P,
            topicIds: ['iq-memory-oom', 'iq-optimization', 'workflows', 'iq-workflows'],
            services: ['Spark UI', 'Databricks Asset Bundles', 'Lakeflow Jobs', 'Repos / CI-CD'],
            examFocus: ['Diagnose failed tasks from logs & the Spark UI', 'Repair & rerun strategies', 'DAB deploy/promote across dev→staging→prod', 'Git-based CI/CD for notebooks & jobs'],
            gaps: ['Databricks Asset Bundles (DAB)'] },
        ]},
        { id: 'p10', name: 'Data Modelling', weight: 6, objectives: [
          { id: 'pp10-1', statement: 'Medallion & dimensional modelling on Delta', level: LEVEL.A,
            topicIds: ['delta-lake', 'iq-partitioning', 'iq-delta'],
            services: ['Delta Lake', 'Medallion', 'SCD / star schema'],
            examFocus: ['Bronze/Silver/Gold design', 'SCD Type 1 vs Type 2 via MERGE', 'Star schema & grain', 'Partitioning / clustering to fit the model'],
            gaps: [] },
        ]},
      ],
      capstone: { title: 'Advanced Production Lakehouse',
        flow: ['Streaming + CDC ingest', 'SCD2 via MERGE', 'Optimized Delta (Z-ORDER/Liquid)', 'UC row/column security', 'Monitoring & alerts', 'DAB CI/CD'] },
    },

    /* ══════════════ Microsoft Fabric Data Engineer Associate (DP-700) ══════════════ */
    {
      certificationId: 'ms-dp700',
      vendor: 'Microsoft', name: 'Microsoft Certified: Fabric Data Engineer Associate', examCode: 'DP-700',
      level: 'Associate', status: 'active', difficulty: 'Intermediate',
      recommendedExperience: 'Experience with Microsoft Fabric, SQL, PySpark, KQL',
      examDuration: 100, questionCount: '40–60', passingScore: '700 / 1000', cost: '$165 USD', validity: '1 year (renewable)',
      accent: 'fabric',
      officialExamUrl: 'https://learn.microsoft.com/credentials/certifications/fabric-data-engineer-associate/',
      officialGuideUrl: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/dp-700',
      officialTrainingUrl: 'https://learn.microsoft.com/training/courses/dp-700t00',
      officialPracticeUrl: 'https://learn.microsoft.com/credentials/certifications/practice-assessments-for-microsoft-certifications',
      version: 'DP-700', lastVerified: LV, contentUpdate: true,
      domains: [
        { id: 'm1', name: 'Implement and manage an analytics solution', weight: '30–35', objectives: [
          { id: 'mm1-1', statement: 'Configure workspace, security & governance', level: LEVEL.I,
            topicIds: ['onelake', 'entra-id', 'purview', 'iq-security'],
            services: ['Fabric workspaces', 'OneLake security', 'Entra ID', 'Purview'],
            examFocus: ['Workspace/item access', 'Row/column/object-level security', 'Dynamic data masking', 'Sensitivity labels & audit logs'],
            gaps: [] },
          { id: 'mm1-2', statement: 'Orchestrate processes (pipelines, Dataflow Gen2, notebooks)', level: LEVEL.I,
            topicIds: ['fabric-data-pipelines', 'dataflow-gen2', 'fabric-spark'],
            services: ['Fabric Data Pipelines', 'Dataflow Gen2', 'Notebooks'],
            examFocus: ['Pipeline vs Dataflow Gen2 vs notebook', 'Schedules & event triggers', 'Parameters & dynamic expressions'],
            gaps: [] },
        ]},
        { id: 'm2', name: 'Ingest and transform data', weight: '30–35', objectives: [
          { id: 'mm2-1', statement: 'Design loading patterns (full, incremental, dimensional, streaming)', level: LEVEL.I,
            topicIds: ['fabric-data-pipelines', 'fabric-lakehouse', 'onelake', 'fabric-mirroring', 'delta-lake', 'eventstream'],
            services: ['Pipelines', 'Lakehouse/Delta', 'Shortcuts', 'Mirroring', 'Eventstream'],
            examFocus: ['Full vs incremental', 'Dimensional modeling', 'Shortcuts vs Mirroring vs copy', 'Streaming load patterns'],
            gaps: [] },
          { id: 'mm2-2', statement: 'Ingest & transform batch and streaming (PySpark, SQL, KQL)', level: LEVEL.I,
            topicIds: ['fabric-spark', 'fabric-lakehouse', 'eventhouse', 'fabric-warehouse', 'iq-transformations'],
            services: ['PySpark', 'T-SQL', 'KQL', 'Structured Streaming'],
            examFocus: ['PySpark/SQL transforms', 'Windowing', 'Dedup / missing / late data', 'KQL in Eventhouse'],
            gaps: [] },
        ]},
        { id: 'm3', name: 'Monitor and optimize an analytics solution', weight: '30–35', objectives: [
          { id: 'mm3-1', statement: 'Monitor ingestion, transformation & refresh; handle errors', level: LEVEL.I,
            topicIds: ['fabric-data-pipelines', 'eventstream', 'azure-monitor', 'iq-monitoring'],
            services: ['Fabric monitoring hub', 'Azure Monitor'],
            examFocus: ['Pipeline/Dataflow/notebook errors', 'Eventstream/Eventhouse errors', 'Semantic model refresh', 'Alerts'],
            gaps: ['Fabric monitoring hub'] },
          { id: 'mm3-2', statement: 'Optimize Lakehouse, warehouse, Spark & queries', level: LEVEL.A,
            topicIds: ['fabric-lakehouse', 'fabric-warehouse', 'fabric-spark', 'iq-spark-arch', 'iq-optimization', 'delta-lake'],
            services: ['Lakehouse', 'Warehouse', 'Spark'],
            examFocus: ['Lakehouse table optimization (V-Order/OPTIMIZE)', 'Spark & query tuning', 'Warehouse optimization', 'Eventhouse caching'],
            gaps: [] },
        ]},
      ],
      capstone: { title: 'Enterprise Fabric Analytics Platform',
        flow: ['OneLake', 'Lakehouse', 'Dataflow Gen2 / Pipelines', 'Spark notebooks', 'Warehouse', 'Real-Time Intelligence'] },
    },
  ];

  /* ── Retired / legacy (never presented as active) ───────────── */
  const RETIRED = [
    {
      certificationId: 'ms-dp203', vendor: 'Microsoft',
      name: 'Microsoft Certified: Azure Data Engineer Associate', examCode: 'DP-203',
      level: 'Associate', status: 'retired', retiredOn: '2025-03-31',
      replacedBy: 'ms-dp700', accent: 'azure', lastVerified: LV,
      officialExamUrl: 'https://learn.microsoft.com/credentials/certifications/retired-certifications',
      note: 'Retired 2025-03-31. Superseded by DP-700 (Fabric Data Engineer Associate). Shown for reference only.',
    },
  ];

  TV.Certifications = {
    lastVerified: LV,
    source: 'Official vendor exam guides (AWS / Microsoft Learn / Databricks), verified 2026-10-06',
    tracks: TRACKS,
    retired: RETIRED,
    byId(id) { return TRACKS.concat(RETIRED).find(c => c.certificationId === id) || null; },
    active() { return TRACKS; },
  };
})();
