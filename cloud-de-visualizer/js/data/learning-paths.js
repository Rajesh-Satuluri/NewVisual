/* ============================================================
   Cloud DE Visualizer — curated learning paths.

   Ordered sequences of existing taxonomy topic ids that form a
   coherent journey toward a goal. The engine (generateLearningPath)
   annotates each step with the user's current state — done / active /
   upcoming, plus weak + reinforce flags — so a path adapts to progress
   instead of being a static checklist.

   Steps reference the same canonical topic ids as taxonomy.js:
     - service pages  → service id        e.g. "delta-lake"
     - interview drills → "iq-" + id       e.g. "iq-spark-arch"

   Add paths here; the dashboard picks them up automatically.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  TV.LearningPaths = [
    {
      id: 'databricks-production',
      title: 'Production-Ready Databricks',
      goal: 'From Spark fundamentals to running reliable, governed Databricks pipelines in production.',
      icon: 'zap',
      cloud: 'databricks',
      steps: [
        'iq-spark-arch', 'iq-transformations', 'iq-partitioning', 'iq-joins',
        'iq-caching', 'iq-optimization', 'delta-lake', 'change-data-feed',
        'auto-loader', 'structured-streaming', 'unity-catalog', 'workflows',
      ],
    },
    {
      id: 'azure-foundations',
      title: 'Azure Data Engineering Foundations',
      goal: 'Build the core Azure stack: lake storage, ingestion with ADF, streaming, warehousing and security.',
      icon: 'layers',
      cloud: 'azure',
      steps: [
        'adls-gen2', 'blob-storage', 'data-factory', 'iq-adf-fundamentals',
        'iq-adf-pipeline', 'iq-adf-incremental', 'event-hubs', 'stream-analytics',
        'synapse-analytics', 'synapse-serverless', 'entra-id', 'key-vault',
      ],
    },
    {
      id: 'aws-lakehouse',
      title: 'Build an AWS Lakehouse',
      goal: 'Assemble a governed AWS analytics platform from S3 and Glue through Athena, Redshift and streaming.',
      icon: 'folder',
      cloud: 'aws',
      steps: [
        's3', 'glue-catalog', 'glue-etl', 'athena', 'lake-formation',
        'redshift', 'redshift-spectrum', 'emr', 'kinesis', 'step-functions',
      ],
    },
    {
      id: 'streaming-across-clouds',
      title: 'Streaming Across Clouds',
      goal: 'Master real-time ingestion and processing and how the brokers and engines map across AWS, Azure and Databricks.',
      icon: 'activity',
      cloud: 'multi-cloud',
      steps: [
        'event-hubs', 'kinesis', 'msk', 'stream-analytics',
        'structured-streaming', 'auto-loader', 'change-data-feed',
      ],
    },
  ];
})();
