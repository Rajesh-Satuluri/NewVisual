/* ============================================================
   Redshift — New topic pages (P2-3): zero-ETL, streaming
   ingestion, system tables & EXPLAIN, row-level security &
   masking, snapshots & DR. Authored for the shared RedshiftKit.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;
  if (!Kit) return;

  const SPECS = {

    /* ── zero-etl ─────────────────────────────────────────────── */
    zeroEtl: {
      id: 'zero-etl',
      eyebrow: 'Ecosystem & Integration',
      title: 'Zero-ETL Integrations',
      subtitle: 'Zero-ETL replicates data from operational sources (Aurora, RDS MySQL/PostgreSQL, DynamoDB) into Redshift automatically and continuously — no pipelines to build or run. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.html',
      stage: { caption: 'Source changes land in Redshift with no pipeline',
        groups: [
          { id: 'src', label: 'Operational source', sub: 'Aurora / RDS / DynamoDB', nodes: [{ id: 'db', label: 'Live tables' }], connectorAfter: 'managed replication' },
          { id: 'zetl', label: 'Zero-ETL integration', sub: 'AWS-managed, near real-time', nodes: [{ id: 'repl', label: 'Change replication' }], connectorAfter: 'lands in' },
          { id: 'rs', label: 'Redshift', sub: 'query seconds-fresh data', nodes: [{ id: 'tbl', label: 'Replicated tables' }, { id: 'q', label: 'Analytics + joins' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'Pipelines are work to build and run', on: { spot: ['src'] },
          body: 'Traditionally you build CDC/ETL pipelines to move operational data into the warehouse — code to write, schedule, monitor, and fix.',
          facts: ['Custom CDC/ETL to maintain', 'Latency and failure handling', 'Operational burden'] },
        { label: 'Zero-ETL', title: 'AWS manages the replication', on: { spot: ['zetl'], flow: ['repl'], conn: ['src'] },
          body: 'A zero-ETL integration continuously replicates source changes into Redshift with no pipeline code — AWS handles the mechanics and keeps it near real-time.',
          facts: ['No pipeline to build', 'Near real-time (seconds)', 'Fully managed'] },
        { label: 'Analyze', title: 'Query seconds-fresh data', on: { spot: ['rs'], flow: ['tbl', 'q'], conn: ['zetl'] },
          body: 'The replicated tables are queryable in Redshift almost immediately, so you run analytics and joins on fresh operational data without moving it yourself.',
          facts: ['Seconds-fresh in Redshift', 'Join with existing warehouse data', 'No copy jobs'] },
      ],
      takeaways: [
        'Zero-ETL auto-replicates from Aurora, RDS MySQL/PostgreSQL, and DynamoDB into Redshift — no pipeline to build or operate.',
        'Data lands near real-time, so you analyze operational data within seconds of the source change.',
        'Use it to retire hand-built CDC/ETL for supported sources; still use COPY/Spectrum for files and lakes.',
      ],
    },

    /* ── streaming-ingestion ──────────────────────────────────── */
    streamingIngestion: {
      id: 'streaming-ingestion',
      eyebrow: 'Ecosystem & Integration',
      title: 'Streaming Ingestion',
      subtitle: 'Redshift can ingest directly from Kinesis Data Streams or Amazon MSK (Kafka) into a materialized view — low-latency, no staging in S3. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-streaming-ingestion.html',
      stage: { caption: 'Stream → external schema → materialized view',
        groups: [
          { id: 'stream', label: 'Streaming source', sub: 'Kinesis / MSK (Kafka)', nodes: [{ id: 'ev', label: 'Event stream' }], connectorAfter: 'map via external schema' },
          { id: 'mv', label: 'Streaming materialized view', sub: 'parses + lands records', nodes: [{ id: 'view', label: 'MV over the stream' }], connectorAfter: 'refresh' },
          { id: 'q', label: 'Analytics', nodes: [{ id: 'live', label: 'Query near-real-time' }] },
        ] },
      steps: [
        { label: 'Stream', title: 'Events arrive continuously', on: { spot: ['stream'], flow: ['ev'] },
          body: 'Clickstream/IoT/app events flow into Kinesis or MSK. You want them queryable in Redshift fast, without first staging files in S3.',
          facts: ['Kinesis Data Streams or MSK', 'High-velocity events', 'Low-latency requirement'] },
        { label: 'Materialized view', title: 'Ingest straight into an MV', on: { spot: ['mv'], flow: ['view'], conn: ['stream'] },
          body: 'You create an external schema for the stream and a materialized view that reads it; REFRESH pulls new records and can parse JSON via SUPER.',
          facts: ['No S3 staging step', 'MV maps + parses records', 'SUPER for JSON payloads'] },
        { label: 'Query', title: 'Analyze near-real-time', on: { spot: ['q'], flow: ['live'], conn: ['mv'] },
          body: 'Refresh the MV (manually or auto) and query it like any table — low-latency analytics directly on the stream\'s data.',
          facts: ['Seconds-fresh events', 'Standard SQL over the MV', 'Auto refresh available'] },
      ],
      code: { lang: 'sql', title: 'Streaming ingestion MV', src:
        "CREATE EXTERNAL SCHEMA kds\n  FROM KINESIS\n  IAM_ROLE 'arn:aws:iam::acct:role/redshift-stream';\n\nCREATE MATERIALIZED VIEW clicks_mv AUTO REFRESH YES AS\nSELECT approximate_arrival_timestamp AS ts,\n       JSON_PARSE(kinesis_data) AS payload   -- SUPER\nFROM   kds.\"clickstream\";\n\n-- query near-real-time\nSELECT payload.page::varchar, COUNT(*)\nFROM   clicks_mv\nGROUP  BY 1;" },
      takeaways: [
        'Redshift ingests directly from Kinesis or MSK into a materialized view — no S3 staging hop.',
        'The MV parses records (JSON via SUPER) and refreshes manually or automatically for low-latency analytics.',
        'Use it for clickstream/IoT/real-time dashboards; batch COPY still suits large periodic loads.',
      ],
    },

    /* ── system-tables ────────────────────────────────────────── */
    systemTables: {
      id: 'system-tables',
      eyebrow: 'Learn — Internals & Data',
      title: 'System Tables & EXPLAIN',
      subtitle: 'The STL/STV/SVL/SVV views and SYS monitoring views expose what Redshift is doing; EXPLAIN shows the plan before you run. Together they are how you diagnose performance. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/cm_chap_system-tables.html',
      stage: { caption: 'Plan with EXPLAIN, then inspect with system views',
        groups: [
          { id: 'explain', label: 'EXPLAIN', sub: 'estimated plan + data movement', nodes: [{ id: 'plan', label: 'DS_DIST_* / costs' }], connectorAfter: 'run the query' },
          { id: 'views', label: 'System views', sub: 'STL · STV · SVL · SVV · SYS', nodes: [
            { id: 'stl', label: 'STL — logged history' }, { id: 'stv', label: 'STV — live snapshots' }, { id: 'svl', label: 'SVL/SVV — aggregated' } ], connectorAfter: 'diagnose' },
          { id: 'fix', label: 'Act', nodes: [{ id: 'tune', label: 'Fix keys / WLM / stats' }] },
        ] },
      steps: [
        { label: 'EXPLAIN', title: 'Read the plan before running', on: { spot: ['explain'], flow: ['plan'] },
          body: 'EXPLAIN shows the estimated plan: join methods, costs, and crucially the data-movement labels (DS_DIST_NONE good; DS_DIST_BOTH/DS_BCAST expensive).',
          facts: ['Estimated cost + row counts', 'Join + distribution strategy', 'Spot shuffles before they run'] },
        { label: 'Inspect', title: 'Query the system views', on: { spot: ['views'], flow: ['stl', 'stv', 'svl'], conn: ['explain'] },
          body: 'STL = logged history (completed queries), STV = live/transient state, SVL/SVV = convenient aggregated views. SYS_* monitoring views unify this for provisioned and Serverless.',
          facts: ['STL_QUERY / SVL_QUERY_SUMMARY', 'STV_ for live state', 'SYS_QUERY_HISTORY (both deployments)'] },
        { label: 'Act', title: 'Turn evidence into a fix', on: { spot: ['fix'], flow: ['tune'], conn: ['views'] },
          body: 'Find the costly step — skew (SVV_TABLE_INFO), disk spill, bad distribution, stale stats — and fix dist/sort keys, run ANALYZE/VACUUM, or tune WLM memory.',
          facts: ['Skew + unsorted % in SVV_TABLE_INFO', 'Spill/queue time in query views', 'Target the biggest contributor'] },
      ],
      code: { lang: 'sql', title: 'Diagnose a slow query', src:
        "EXPLAIN\nSELECT c.region, SUM(o.amount)\nFROM   orders o JOIN customers c ON c.id = o.cust_id\nGROUP  BY 1;    -- look for DS_DIST_BOTH / DS_BCAST_INNER\n\n-- what actually ran (last day)\nSELECT query, elapsed/1000000.0 AS secs, label\nFROM   svl_query_summary\nORDER  BY secs DESC LIMIT 20;\n\n-- skew & unsorted %\nSELECT \"table\", skew_rows, unsorted, stats_off\nFROM   svv_table_info\nORDER  BY unsorted DESC;" },
      takeaways: [
        'EXPLAIN reveals the plan and data-movement steps BEFORE you run — the fastest way to catch a bad join.',
        'STL (history) / STV (live) / SVL+SVV (aggregated) and the newer SYS_* views expose execution detail; SYS_QUERY_HISTORY covers provisioned and Serverless.',
        'SVV_TABLE_INFO (skew, unsorted %, stats_off) points directly at dist/sort-key and VACUUM/ANALYZE fixes.',
      ],
    },

    /* ── row-level-security ───────────────────────────────────── */
    rowLevelSecurity: {
      id: 'row-level-security',
      eyebrow: 'Security & Governance',
      title: 'Row-Level Security & Column Masking',
      subtitle: 'Redshift enforces fine-grained access in-database: RLS policies filter which rows a user sees; dynamic data masking transforms sensitive column values by role. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/t_rls.html',
      stage: { caption: 'One table, different views per role',
        groups: [
          { id: 'tbl', label: 'Base table', sub: 'all rows + sensitive columns', nodes: [{ id: 'rows', label: 'Full data' }], connectorAfter: 'policies applied' },
          { id: 'pol', label: 'Policies', sub: 'RLS predicate + masking', nodes: [{ id: 'rls', label: 'RLS: row filter' }, { id: 'mask', label: 'Mask: column transform' }], connectorAfter: 'enforced per query' },
          { id: 'users', label: 'Users by role', nodes: [{ id: 'analyst', label: 'Analyst (region rows, masked PII)' }, { id: 'admin', label: 'Admin (all rows, clear)' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'One table, many trust levels', on: { spot: ['tbl'] },
          body: 'Different users should see different rows (their region) and different column detail (full vs masked PII) — without maintaining separate copies or views per team.',
          facts: ['Region-scoped visibility', 'PII must be masked for some', 'Avoid copy-per-team'] },
        { label: 'Policies', title: 'Attach RLS + masking', on: { spot: ['pol'], flow: ['rls', 'mask'], conn: ['tbl'] },
          body: 'An RLS policy adds a predicate so each role sees only matching rows; a masking policy transforms a column value (e.g. redact) based on the viewer\'s role. Both are enforced automatically on every query.',
          facts: ['RLS = row predicate per role', 'Masking = column transform per role', 'Enforced in-engine, always'] },
        { label: 'Result', title: 'Each role gets its own view', on: { spot: ['users'], flow: ['analyst', 'admin'], conn: ['pol'] },
          body: 'An analyst sees only their region\'s rows with PII masked; an admin sees all rows in the clear — from the same base table, no duplication.',
          facts: ['Least privilege by default', 'No duplicate tables/views', 'Auditable, central policy'] },
      ],
      code: { lang: 'sql', title: 'RLS + masking', src:
        "-- Row-level security: analysts see only their region\nCREATE RLS POLICY region_policy\n  WITH (region varchar) USING (region = current_user_region());\nATTACH RLS POLICY region_policy ON orders TO ROLE analyst;\nALTER TABLE orders ROW LEVEL SECURITY ON;\n\n-- Dynamic data masking: redact email for analysts\nCREATE MASKING POLICY mask_email\n  WITH (email varchar) USING ('***@' || split_part(email,'@',2));\nATTACH MASKING POLICY mask_email ON orders(email) TO ROLE analyst;" },
      takeaways: [
        'Row-level security attaches a predicate so each role sees only its rows — enforced on every query, no per-team copies.',
        'Dynamic data masking transforms sensitive column values by role (e.g. redact PII) at query time.',
        'Both are central, auditable, in-database policies — combine with RBAC roles for least-privilege governance.',
      ],
    },

    /* ── snapshots-dr ─────────────────────────────────────────── */
    snapshotsDr: {
      id: 'snapshots-dr',
      eyebrow: 'Security & Governance',
      title: 'Snapshots & Disaster Recovery',
      subtitle: 'Redshift backs clusters up as snapshots to S3 (automated + manual), supports cross-region copy, and restores to a new cluster — the backbone of backup and DR. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html',
      stage: { caption: 'Snapshot → S3 → (cross-region) → restore',
        groups: [
          { id: 'cluster', label: 'Cluster', sub: 'provisioned / workgroup', nodes: [{ id: 'data', label: 'Live data' }], connectorAfter: 'snapshot (incremental)' },
          { id: 'snap', label: 'Snapshots in S3', sub: 'automated + manual', nodes: [{ id: 'auto', label: 'Automated (retention)' }, { id: 'man', label: 'Manual (kept until deleted)' }], connectorAfter: 'copy cross-region' },
          { id: 'dr', label: 'DR region', nodes: [{ id: 'copy', label: 'Copied snapshot' }, { id: 'restore', label: 'Restore → new cluster' }] },
        ] },
      steps: [
        { label: 'Backup', title: 'Automated + manual snapshots', on: { spot: ['cluster', 'snap'], flow: ['data', 'auto', 'man'] },
          body: 'Redshift continuously takes incremental snapshots to S3. Automated snapshots follow a retention period; manual snapshots persist until you delete them.',
          facts: ['Incremental, stored in S3', 'Automated honor retention', 'Manual kept until deleted'] },
        { label: 'Replicate', title: 'Copy snapshots cross-region', on: { spot: ['dr'], flow: ['copy'], conn: ['snap'] },
          body: 'Enable cross-region snapshot copy so a recent backup always exists in a second region — the foundation of disaster recovery.',
          facts: ['Cross-region copy for DR', 'Encrypted with a regional key', 'Configurable copy retention'] },
        { label: 'Recover', title: 'Restore to a new cluster', on: { spot: ['dr'], flow: ['restore'], conn: ['dr'] },
          body: 'Restore any snapshot into a new cluster (same or other region). You can also restore individual tables from a snapshot without a full cluster restore.',
          facts: ['Restore to new cluster', 'Table-level restore supported', 'Meets RPO/RTO targets'] },
      ],
      takeaways: [
        'Redshift takes incremental snapshots to S3: automated (retention-bound) and manual (kept until deleted).',
        'Cross-region snapshot copy is the basis of DR — keep a recent backup in a second region.',
        'Restore a snapshot to a new cluster (any region) or restore individual tables; snapshots inherit cluster encryption.',
      ],
    },

  };

  Kit.registerAll('redshift', SPECS);
})();
