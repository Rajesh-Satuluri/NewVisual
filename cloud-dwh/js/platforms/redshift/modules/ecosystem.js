/* ============================================================
   Redshift — Ecosystem & Integration (authentic, AWS-doc aligned)
   spectrum · federated-query · datashares · redshift-ml ·
   super-partiql · copy-unload
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    spectrum: {
      eyebrow: 'Ecosystem', title: 'Redshift Spectrum',
      subtitle: 'Spectrum queries data directly in Amazon S3 using external tables — no loading required. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-overview.html',
      stage: { caption: 'Query the S3 data lake in place',
        groups: [
          { id: 'rs', label: 'Redshift', nodes: [{ id: 'ext', label: 'External schema', sub: 'Glue Data Catalog' }, { id: 'join', label: 'Join local + external' }], connectorAfter: 'Spectrum layer scans S3' },
          { id: 'spectrum', label: 'Spectrum fleet', sub: 'serverless scan', nodes: [{ id: 'scan', label: 'Parallel S3 scan' }, { id: 'filter', label: 'Predicate pushdown' }], connectorAfter: '↓' },
          { id: 's3', label: 'Amazon S3 data lake', nodes: [{ id: 'parquet', label: 'Parquet / ORC', sub: 'partitioned' }] },
        ] },
      steps: [
        { label: 'External table', title: 'Define an external table', on: { spot: ['rs'], flow: ['ext'] },
          body: 'A <code>CREATE EXTERNAL TABLE</code> (in an external schema backed by the Glue Data Catalog) describes columns, file format, and the S3 location — no data is copied.',
          facts: ['External schema maps to the Glue Data Catalog', 'Definition points at S3; nothing loads into Redshift'] },
        { label: 'Scan', title: 'Spectrum scans S3 in parallel', on: { spot: ['spectrum'], conn: ['rs'], flow: ['scan', 'filter'] },
          body: 'A separate, elastic Spectrum fleet reads the files from S3 in parallel, pushing filters and projections down so it scans less.',
          facts: ['Scales independently of your cluster', 'Partitioning + columnar formats cut data scanned', 'Billed by the amount of S3 data scanned'] },
        { label: 'Join', title: 'Join lake data with local tables', on: { spot: ['rs'], flow: ['join'] },
          body: 'Results flow back and join seamlessly with local Redshift tables — hot data local, cold/historical in S3.',
          facts: ['One query spans local + lake data', 'Materialized views on Spectrum tables boost cost/perf', 'Updates to S3 files are immediately queryable'] },
      ],
      code: { title: 'External schema + table', lang: 'sql', src:
`CREATE EXTERNAL SCHEMA lake
FROM DATA CATALOG DATABASE 'netflix_lake'
IAM_ROLE 'arn:aws:iam::123:role/SpectrumRole';

CREATE EXTERNAL TABLE lake.watch_archive (
    user_id BIGINT, title_id INT, minutes INT
)
PARTITIONED BY (watch_year INT)
STORED AS PARQUET
LOCATION 's3://netflix-lake/watch/';` },
      takeaways: [
        'Spectrum queries S3 in place via external tables — no loading',
        'A separate elastic fleet scans in parallel; billed by S3 data scanned',
        'Partition + use columnar formats; MVs on Spectrum tables improve cost/perf',
      ],
    },

    federatedQuery: {
      eyebrow: 'Ecosystem', title: 'Federated Query',
      subtitle: 'Federated query reads live data in Aurora/RDS PostgreSQL and MySQL directly from Redshift — no ETL. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/federated-overview.html',
      stage: { caption: 'Reach live operational data',
        groups: [
          { id: 'rs', label: 'Redshift query', nodes: [{ id: 'q', label: 'SELECT across sources' }], connectorAfter: 'pushdown' },
          { id: 'fed', label: 'Federated connection', sub: 'via Secrets Manager', nodes: [{ id: 'pg', label: 'Aurora/RDS PostgreSQL' }, { id: 'my', label: 'Aurora/RDS MySQL' }] },
        ] },
      steps: [
        { label: 'Live data', title: 'Query live sources, no copy', on: { spot: ['fed'], flow: ['pg', 'my'] },
          body: 'Federated query lets Redshift read current rows straight from Aurora/RDS PostgreSQL and MySQL — useful to blend fresh operational data with the warehouse.',
          facts: ['Supports Aurora/RDS PostgreSQL and MySQL', 'Credentials managed via AWS Secrets Manager'] },
        { label: 'Pushdown', title: 'Push filters to the source', on: { spot: ['rs'], conn: ['rs'], flow: ['q'] },
          body: 'Redshift pushes predicates to the source database so only relevant rows cross the wire.',
          facts: ['Predicate pushdown limits data transferred', 'Great for small, selective live lookups'] },
        { label: 'Blend', title: 'Blend with warehouse + lake', on: { spot: ['rs', 'fed'] },
          body: 'Combine live operational rows, warehouse tables, and (with Spectrum) S3 — in one SQL statement.',
          facts: ['One query spans live DB + warehouse + lake', 'Avoids extra ETL for freshness'] },
      ],
      takeaways: [
        'Federated query reads live Aurora/RDS PostgreSQL & MySQL from Redshift',
        'Credentials via Secrets Manager; predicates push down to the source',
        'Blend live + warehouse + lake data without ETL',
      ],
    },

    datashares: {
      eyebrow: 'Ecosystem', title: 'Data Sharing (Datashares)',
      subtitle: 'Datashares give live, read-only access to the same data across clusters and accounts — no copying, no ETL. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/datashare-overview.html',
      stage: { caption: 'One copy of data, many consumers',
        groups: [
          { id: 'producer', label: 'Producer cluster', sub: 'owns the data (RMS)', nodes: [{ id: 'share', label: 'Datashare', sub: 'schemas, tables, views' }], connectorAfter: 'grant access' },
          { id: 'consumers', label: 'Consumer clusters', sub: 'live read-only', nodes: [
            { id: 'c1', label: 'Analytics cluster' }, { id: 'c2', label: 'Finance (other account)' }, { id: 'c3', label: 'Serverless workgroup' } ] },
        ] },
      steps: [
        { label: 'Share', title: 'Producer publishes a datashare', on: { spot: ['producer'], flow: ['share'] },
          body: 'The producer adds schemas, tables, and views to a <strong>datashare</strong> — a live pointer to data in Redshift Managed Storage.',
          facts: ['No data is copied — consumers read live', 'Enabled by RA3 managed storage'] },
        { label: 'Consume', title: 'Consumers read live, isolated', on: { spot: ['consumers'], conn: ['producer'], flow: ['c1', 'c2', 'c3'] },
          body: 'Consumer clusters/workgroups query the shared data with their own compute — <strong>read-only</strong>, fully isolated from the producer.',
          facts: ['Each consumer uses its own compute (no contention)', 'Cross-account and cross-region sharing supported', 'Works to/from Serverless'] },
        { label: 'Lake', title: 'Even share data-lake tables', on: { spot: ['producer'] },
          body: 'You can also share data-lake (Glue) tables via a datashare; when a consumer scans the lake, the <strong>scan cost is billed to the consumer</strong>.',
          facts: ['Data-lake tables can be shared too', 'Consumer is billed for lake scans', 'Governed centrally, consumed widely'] },
      ],
      takeaways: [
        'Datashares give live, read-only cross-cluster/cross-account access — no copies',
        'Each consumer uses its own compute, isolated from the producer (RA3/RMS-powered)',
        'Lake tables can be shared; consumers pay for their own lake scans',
      ],
    },

    redshiftMl: {
      eyebrow: 'Ecosystem', title: 'Redshift ML',
      subtitle: 'Redshift ML lets you create and use machine-learning models with plain SQL, powered by Amazon SageMaker. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/machine_learning.html',
      stage: { caption: 'Train and predict in SQL',
        groups: [
          { id: 'train', label: 'CREATE MODEL', sub: 'SQL → SageMaker', nodes: [{ id: 'sql', label: 'Training SELECT' }, { id: 'sm', label: 'SageMaker Autopilot' }], connectorAfter: 'deploy function' },
          { id: 'predict', label: 'Predict in SQL', nodes: [{ id: 'fn', label: 'Model function' }, { id: 'inline', label: 'In-database inference' }] },
        ] },
      steps: [
        { label: 'Create', title: 'CREATE MODEL from a query', on: { spot: ['train'], flow: ['sql', 'sm'] },
          body: 'Point <code>CREATE MODEL</code> at a training query. Redshift exports data and uses <strong>Amazon SageMaker (Autopilot)</strong> to pick and train a model automatically.',
          facts: ['Training data comes from a SQL SELECT', 'SageMaker Autopilot handles algorithm selection', 'Supports regression, classification, and more'] },
        { label: 'Function', title: 'Model becomes a SQL function', on: { spot: ['predict'], conn: ['train'], flow: ['fn'] },
          body: 'When training completes, the model is registered as a <strong>SQL function</strong> in your database.',
          facts: ['No separate serving infra to manage', 'Function is callable like any other'] },
        { label: 'Predict', title: 'Inference inside the warehouse', on: { spot: ['predict'], flow: ['inline'] },
          body: 'Call the function in a query to score rows at warehouse scale — inference runs <strong>in-database</strong>, no data movement.',
          facts: ['Score millions of rows with SQL', 'Inference runs locally on the cluster', 'Keeps data governed inside Redshift'] },
      ],
      code: { title: 'Model in SQL', lang: 'sql', src:
`CREATE MODEL churn_model
FROM (SELECT tenure, plan, monthly_minutes, churned
      FROM subscriber_features)
TARGET churned
FUNCTION predict_churn
IAM_ROLE 'arn:aws:iam::123:role/RedshiftML';

SELECT user_id, predict_churn(tenure, plan, monthly_minutes)
FROM   subscribers;` },
      takeaways: [
        'Redshift ML trains models from SQL using SageMaker Autopilot',
        'Trained models become callable SQL functions',
        'Inference runs in-database at scale — no data movement',
      ],
    },

    superPartiql: {
      eyebrow: 'Ecosystem', title: 'SUPER & PartiQL',
      subtitle: 'The SUPER type stores schemaless/semi-structured data (JSON); PartiQL queries it with familiar SQL. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/super-overview.html',
      stage: { caption: 'Semi-structured data, first-class',
        groups: [
          { id: 'ingest', label: 'Ingest JSON', nodes: [{ id: 'json', label: 'Event JSON' }, { id: 'super', label: 'SUPER column' }], connectorAfter: 'PartiQL' },
          { id: 'query', label: 'Query with PartiQL', nodes: [{ id: 'nav', label: 'Dot / array navigation' }, { id: 'unnest', label: 'Unnest arrays' }] },
        ] },
      steps: [
        { label: 'Store', title: 'SUPER holds nested JSON', on: { spot: ['ingest'], flow: ['json', 'super'] },
          body: 'A <strong>SUPER</strong> column stores JSON/semi-structured documents without a fixed schema — ideal for event payloads with varying shapes.',
          facts: ['Schemaless, nested data in one column', 'Ingest JSON directly; no flattening needed upfront'] },
        { label: 'Query', title: 'PartiQL navigates structure', on: { spot: ['query'], conn: ['ingest'], flow: ['nav'] },
          body: '<strong>PartiQL</strong> extends SQL with dot and array notation to reach nested fields naturally.',
          facts: ['Dot notation: payload.device.os', 'Array indexing and navigation', 'Familiar SQL on flexible data'] },
        { label: 'Unnest', title: 'Unnest arrays into rows', on: { spot: ['query'], flow: ['unnest'] },
          body: 'Flatten arrays into rows for aggregation, joining semi-structured data with your relational tables.',
          facts: ['Unnest to relational rows for analytics', 'Blend SUPER with normal columns'] },
      ],
      code: { title: 'PartiQL over SUPER', lang: 'sql', src:
`CREATE TABLE events (id BIGINT, payload SUPER);

SELECT  id,
        payload.device.os::varchar   AS os,
        d.title_id
FROM    events AS e,
        e.payload.titles AS d;   -- unnest an array` },
      takeaways: [
        'SUPER stores schemaless JSON/semi-structured data in a single column',
        'PartiQL extends SQL with dot/array navigation and array unnesting',
        'Blend semi-structured and relational data in one query',
      ],
    },

    copyUnload: {
      eyebrow: 'Ecosystem', title: 'COPY & UNLOAD',
      subtitle: 'COPY bulk-loads from S3 in parallel across slices; UNLOAD exports query results back to S3 in parallel. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html',
      stage: { caption: 'High-throughput bulk I/O with S3',
        groups: [
          { id: 's3in', label: 'Amazon S3 (source)', nodes: [{ id: 'files', label: 'Many split files', sub: 'gzip/parquet' }], connectorAfter: 'COPY (parallel)' },
          { id: 'cluster', label: 'Redshift slices', nodes: [{ id: 'sl1', label: 'slice 0' }, { id: 'sl2', label: 'slice 1' }, { id: 'sl3', label: 'slice 2' }, { id: 'sl4', label: 'slice 3' }], connectorAfter: 'UNLOAD (parallel)' },
          { id: 's3out', label: 'Amazon S3 (target)', nodes: [{ id: 'out', label: 'Exported files' }] },
        ] },
      steps: [
        { label: 'COPY', title: 'COPY loads in parallel', on: { spot: ['s3in', 'cluster'], conn: ['s3in'], flow: ['sl1', 'sl2', 'sl3', 'sl4'] },
          body: '<code>COPY</code> is the fast way to load. Split your data into <strong>multiple files</strong> (ideally a multiple of the slice count) so every slice loads in parallel.',
          facts: ['Parallelism scales with number of files', 'COPY into empty tables applies automatic compression', 'Supports CSV, JSON, Parquet, Avro, columnar formats'] },
        { label: 'UNLOAD', title: 'UNLOAD exports in parallel', on: { spot: ['cluster', 's3out'], conn: ['cluster'], flow: ['out'] },
          body: '<code>UNLOAD</code> writes query results to S3 in parallel — great for sharing extracts or feeding the lake.',
          facts: ['Parallel write across slices', 'Can output Parquet for the lake', 'Optionally partition output by column'] },
        { label: 'Best practice', title: 'Split files, pick the right key', on: { spot: ['s3in'], flow: ['files'] },
          body: 'Even file sizes and counts aligned to slices maximize throughput; IAM roles authorize S3 access.',
          facts: ['Even, slice-aligned file counts = best speed', 'Access via IAM role, not keys', 'Compress source files (gzip/zstd/parquet)'] },
      ],
      code: { title: 'COPY and UNLOAD', lang: 'sql', src:
`COPY watch_events FROM 's3://netflix-raw/watch/'
IAM_ROLE 'arn:aws:iam::123:role/LoadRole'
FORMAT AS PARQUET;

UNLOAD ('SELECT * FROM watch_events WHERE watch_date = current_date')
TO 's3://netflix-exports/daily/'
IAM_ROLE 'arn:aws:iam::123:role/LoadRole'
FORMAT AS PARQUET PARTITION BY (country);` },
      takeaways: [
        'COPY bulk-loads from S3 in parallel — split into slice-aligned files',
        'UNLOAD exports query results to S3 in parallel (incl. Parquet, partitioned)',
        'Use IAM roles for S3 access; COPY into empty tables auto-compresses',
      ],
    },
  };

  Kit.registerAll('redshift', SPECS);
})();
