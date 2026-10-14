/* ============================================================
   Fabric — Internals & Data (authentic, Microsoft-Learn aligned)
   directlake · capacities · shortcuts · mirroring ·
   cross-db-queries · semantic-models
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    directlake: {
      eyebrow: 'Internals', title: 'Direct Lake Mode',
      subtitle: 'Direct Lake lets Power BI read Delta tables in OneLake directly — the speed of import with the freshness of DirectQuery, and no data duplication. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview',
      stage: { caption: 'Three ways Power BI gets data',
        groups: [
          { id: 'modes', label: 'Storage modes', nodes: [
            { id: 'import', label: 'Import', sub: 'fast, but a copy' },
            { id: 'dq', label: 'DirectQuery', sub: 'fresh, but slower' },
            { id: 'dl', label: 'Direct Lake', sub: 'fast + fresh' } ], connectorAfter: 'Direct Lake reads Delta' },
          { id: 'lake', label: 'OneLake', nodes: [{ id: 'delta', label: 'Delta tables (V-Order)' }], connectorAfter: 'loads on demand' },
          { id: 'report', label: 'Power BI report', nodes: [{ id: 'viz', label: 'Visuals' }] },
        ] },
      steps: [
        { label: 'Modes', title: 'Import vs DirectQuery trade-off', on: { spot: ['modes'], flow: ['import', 'dq'] },
          body: 'Classic Power BI trades off: <strong>Import</strong> is fast but duplicates and must refresh; <strong>DirectQuery</strong> is fresh but sends queries to the source every time.',
          facts: ['Import: fast queries, stale copy, refresh cost', 'DirectQuery: always fresh, slower per query'] },
        { label: 'Direct Lake', title: 'Direct Lake = best of both', on: { spot: ['dl', 'lake'], conn: ['modes'], flow: ['delta'] },
          body: '<strong>Direct Lake</strong> reads the Delta/Parquet files in OneLake <em>directly</em> into the Power BI engine — import-like speed with DirectQuery-like freshness, and no separate copy.',
          facts: ['Loads Delta columns on demand into memory', 'No scheduled refresh, no duplicate data', 'V-Order makes the Parquet reads fast'] },
        { label: 'Guardrails', title: 'Capacity guardrails & fallback', on: { spot: ['report'], conn: ['lake'], flow: ['viz'] },
          body: 'Direct Lake needs a Fabric <strong>capacity</strong>; guardrails (rows, file counts, model size) scale with the F-SKU, and queries can fall back to DirectQuery if exceeded.',
          facts: ['Requires a Fabric capacity (not Free/Pro alone)', 'Guardrails grow with the SKU (e.g. model-size cap lifts at F64+)', 'Falls back to DirectQuery beyond limits', 'Model must be in the same region as its data'] },
      ],
      takeaways: [
        'Direct Lake reads Delta in OneLake directly — import speed + DirectQuery freshness',
        'No data duplication and no scheduled refresh; V-Order keeps reads fast',
        'Requires a Fabric capacity; guardrails scale with the SKU, else fall back to DirectQuery',
      ],
    },

    capacities: {
      eyebrow: 'Internals', title: 'Capacities & F-SKUs',
      subtitle: 'Fabric compute is bought as a capacity (an F-SKU) measured in Capacity Units; all workloads share it, with smoothing and bursting. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/enterprise/licenses',
      stage: { caption: 'One capacity powers every workload',
        groups: [
          { id: 'sku', label: 'F-SKU', sub: 'F2 … F2048', nodes: [{ id: 'cu', label: 'Capacity Units (CU)' }, { id: 'f64', label: 'F64 ≈ P1', sub: 'free-viewer tier' }], connectorAfter: 'shared pool' },
          { id: 'work', label: 'All workloads draw from it', nodes: [{ id: 'wh', label: 'Warehouse' }, { id: 'spark', label: 'Spark' }, { id: 'df', label: 'Pipelines' }, { id: 'bi', label: 'Power BI' }], connectorAfter: 'smoothing / bursting' },
          { id: 'mgmt', label: 'Elastic', nodes: [{ id: 'burst', label: 'Burst for spikes' }, { id: 'smooth', label: 'Smooth over time' }] },
        ] },
      steps: [
        { label: 'CU', title: 'Capacity measured in CUs', on: { spot: ['sku'], flow: ['cu'] },
          body: 'You buy a <strong>capacity</strong> (an F-SKU such as F2, F8, F64 … F2048) measured in <strong>Capacity Units</strong>. One capacity powers every Fabric workload.',
          facts: ['F-SKUs range from F2 to F2048', 'CUs = the shared compute currency', 'P-SKUs map to F-SKUs (P1 ≈ F64)'] },
        { label: 'Shared', title: 'All workloads share it', on: { spot: ['work'], conn: ['sku'], flow: ['wh', 'spark', 'df', 'bi'] },
          body: 'Warehouse, Spark, pipelines, and Power BI all draw from the same capacity — no per-engine clusters to size.',
          facts: ['One pool for every workload', 'No separate cluster provisioning', 'F64+ lets Free users consume Power BI content'] },
        { label: 'Elastic', title: 'Smoothing & bursting', on: { spot: ['mgmt'], conn: ['work'], flow: ['burst', 'smooth'] },
          body: 'Fabric <strong>bursts</strong> to finish spikes quickly and <strong>smooths</strong> the cost over time, so short peaks don\'t require buying a bigger SKU.',
          facts: ['Bursting: use more CUs briefly to go faster', 'Smoothing: spreads usage to avoid throttling', 'Pause/resume capacity to control cost'] },
      ],
      takeaways: [
        'Compute is a capacity (F-SKU) measured in Capacity Units, shared by all workloads',
        'P-SKUs map to F-SKUs (P1 ≈ F64); F64+ unlocks free-viewer Power BI consumption',
        'Bursting + smoothing absorb spikes; pause/resume controls cost',
      ],
    },

    shortcuts: {
      eyebrow: 'Internals', title: 'Shortcuts',
      subtitle: 'Shortcuts virtualize data from other locations (ADLS, S3, GCS, Dataverse, other OneLake items) into OneLake — queried in place, no copy. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-shortcuts',
      stage: { caption: 'Bring data in without moving it',
        groups: [
          { id: 'ext', label: 'External / other sources', nodes: [{ id: 's3', label: 'Amazon S3' }, { id: 'adls', label: 'ADLS Gen2' }, { id: 'gcs', label: 'Google Cloud Storage' }, { id: 'onelake', label: 'Another OneLake item' }], connectorAfter: 'shortcut (pointer)' },
          { id: 'lh', label: 'Your Lakehouse', sub: 'data appears here', nodes: [{ id: 'virt', label: 'Virtualized tables/files' }], connectorAfter: 'query in place' },
          { id: 'q', label: 'Any engine', nodes: [{ id: 'use', label: 'Spark · T-SQL · Direct Lake' }] },
        ] },
      steps: [
        { label: 'Point', title: 'A shortcut is a pointer', on: { spot: ['ext'], flow: ['s3', 'adls', 'gcs', 'onelake'] },
          body: 'A <strong>shortcut</strong> references data where it already lives — Amazon S3, ADLS Gen2, Google Cloud Storage, Dataverse, or another OneLake item — without copying it.',
          facts: ['Sources: S3, ADLS Gen2, GCS, Dataverse, OneLake', 'No data movement or duplication', 'Avoids extra storage cost and drift'] },
        { label: 'Appear', title: 'Data appears in OneLake', on: { spot: ['lh'], conn: ['ext'], flow: ['virt'] },
          body: 'The shortcut makes the external data appear as tables/files inside your Lakehouse, as if it were local.',
          facts: ['Shows up like native tables/files', 'Delta tables via shortcut appear in the SQL endpoint', 'Permissions still respect the source'] },
        { label: 'Query', title: 'Query in place, any engine', on: { spot: ['q'], conn: ['lh'], flow: ['use'] },
          body: 'Spark, T-SQL, and Direct Lake all query the shortcut data in place — great for cross-cloud analytics without ETL.',
          facts: ['Query with Spark, T-SQL, Direct Lake', 'Cross-cloud (e.g. S3) without copying', 'Combine with local data in one query'] },
      ],
      takeaways: [
        'Shortcuts virtualize external data (S3/ADLS/GCS/Dataverse/OneLake) into OneLake — no copy',
        'Virtualized data appears like native tables; Delta shortcuts show in the SQL endpoint',
        'Query in place with Spark, T-SQL, or Direct Lake — cross-cloud without ETL',
      ],
    },

    mirroring: {
      eyebrow: 'Internals', title: 'Mirroring',
      subtitle: 'Mirroring continuously replicates external databases (Snowflake, Cosmos DB, Azure SQL, PostgreSQL…) into OneLake as Delta, in near real time. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/overview',
      stage: { caption: 'Near-real-time replicas, no ETL',
        groups: [
          { id: 'src', label: 'Source databases', nodes: [{ id: 'snow', label: 'Snowflake' }, { id: 'cosmos', label: 'Cosmos DB' }, { id: 'sql', label: 'Azure SQL / PostgreSQL' }], connectorAfter: 'CDC replication' },
          { id: 'mirror', label: 'Mirrored database', sub: 'in OneLake as Delta', nodes: [{ id: 'delta', label: 'Delta replica' }], connectorAfter: 'query like native' },
          { id: 'use', label: 'Fabric', nodes: [{ id: 'wh', label: 'Cross-DB queries' }, { id: 'dl', label: 'Direct Lake BI' }] },
        ] },
      steps: [
        { label: 'Replicate', title: 'Continuous replication', on: { spot: ['src'], flow: ['snow', 'cosmos', 'sql'] },
          body: 'Mirroring continuously replicates a source database into OneLake in <strong>near real time</strong> (change-data-capture), with no pipelines to build.',
          facts: ['Sources include Snowflake, Cosmos DB, Azure SQL, PostgreSQL', 'Near-real-time, CDC-based', 'No ETL to author'] },
        { label: 'As Delta', title: 'Lands as Delta in OneLake', on: { spot: ['mirror'], conn: ['src'], flow: ['delta'] },
          body: 'The replica lands as <strong>Delta tables</strong> in OneLake, so it behaves like any other Fabric data.',
          facts: ['Replica stored as open Delta', 'Mirroring sync compute doesn\'t consume your CUs', 'Free mirrored storage up to the SKU allowance'] },
        { label: 'Use', title: 'Query & join instantly', on: { spot: ['use'], conn: ['mirror'], flow: ['wh', 'dl'] },
          body: 'Join the mirrored data with warehouses/lakehouses via cross-database queries, and report on it with Direct Lake — all on fresh data.',
          facts: ['Cross-database joins with other Fabric data', 'Direct Lake BI on the replica', 'Analytics without touching the source system'] },
      ],
      takeaways: [
        'Mirroring continuously replicates external DBs (Snowflake/Cosmos/SQL/PostgreSQL) into OneLake as Delta',
        'Near-real-time CDC with no ETL; sync compute is free of your CUs',
        'Query, join, and report (Direct Lake) on the replica without loading the source',
      ],
    },

    'crossDbQueries': {
      eyebrow: 'Internals', title: 'Cross-Database Queries',
      subtitle: 'Because everything is in OneLake, a single T-SQL query can span multiple warehouses and lakehouse SQL endpoints using three-part names. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/query-warehouse',
      stage: { caption: 'One query across items',
        groups: [
          { id: 'items', label: 'Workspace items', nodes: [{ id: 'wh1', label: 'sales_wh' }, { id: 'lh1', label: 'events_lakehouse' }, { id: 'mir', label: 'mirrored_crm' }], connectorAfter: 'three-part names' },
          { id: 'q', label: 'Single T-SQL query', nodes: [{ id: 'join', label: 'JOIN across items' }] },
        ] },
      steps: [
        { label: 'No copy', title: 'No cross-system ETL', on: { spot: ['items'], flow: ['wh1', 'lh1', 'mir'] },
          body: 'Warehouses, lakehouse SQL endpoints, and mirrored databases all live in OneLake — so you query across them without copying data between systems.',
          facts: ['All items share OneLake storage', 'No federation/linked-server plumbing'] },
        { label: 'Three-part', title: 'Reference with three-part names', on: { spot: ['q'], conn: ['items'], flow: ['join'] },
          body: 'Use <code>database.schema.table</code> three-part names in one T-SQL query to join a warehouse with a lakehouse endpoint or a mirrored database.',
          facts: ['Syntax: [item].[schema].[table]', 'Join warehouse + lakehouse + mirrored data', 'Must be within the same workspace scope'] },
      ],
      code: { title: 'Cross-database join', lang: 'sql', src:
`SELECT  s.title_id, SUM(s.revenue) AS rev, e.plays
FROM    sales_wh.dbo.sales            AS s
JOIN    events_lakehouse.dbo.plays    AS e  ON e.title_id = s.title_id
JOIN    mirrored_crm.dbo.customers    AS c  ON c.id = s.customer_id
GROUP BY s.title_id, e.plays;` },
      takeaways: [
        'OneLake lets one T-SQL query span warehouses, lakehouse endpoints, and mirrored DBs',
        'Reference items with three-part names (item.schema.table) — no ETL between systems',
        'Great for joining operational (mirrored) + warehouse + lake data',
      ],
    },

    'semanticModels': {
      eyebrow: 'Internals', title: 'Semantic Models',
      subtitle: 'A semantic model is the BI layer — tables, relationships, and measures — that Power BI reports read, often bound to OneLake via Direct Lake. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview',
      stage: { caption: 'The shared business layer',
        groups: [
          { id: 'data', label: 'OneLake data', nodes: [{ id: 'delta', label: 'Delta tables' }], connectorAfter: 'Direct Lake binding' },
          { id: 'model', label: 'Semantic model', sub: 'business logic', nodes: [{ id: 'rel', label: 'Relationships' }, { id: 'measures', label: 'DAX measures' }, { id: 'rls', label: 'RLS roles' }], connectorAfter: 'consumed by' },
          { id: 'consume', label: 'Consumers', nodes: [{ id: 'reports', label: 'Power BI reports' }, { id: 'excel', label: 'Excel / tools' }] },
        ] },
      steps: [
        { label: 'Layer', title: 'The reusable BI layer', on: { spot: ['model'], flow: ['rel', 'measures'] },
          body: 'A semantic model defines <strong>relationships, DAX measures, and formatting</strong> once, so every report shares consistent business logic.',
          facts: ['Tables + relationships + measures (DAX)', 'Define metrics once, reuse everywhere', 'Can enforce RLS at the model level'] },
        { label: 'Bind', title: 'Bound to OneLake (Direct Lake)', on: { spot: ['data', 'model'], conn: ['data'], flow: ['delta'] },
          body: 'In Fabric the model is typically bound to Delta tables in OneLake via <strong>Direct Lake</strong> — no import, always fresh.',
          facts: ['Direct Lake binding = fresh, fast, no copy', 'Also supports Import/DirectQuery', 'Shortcuts can feed model tables'] },
        { label: 'Consume', title: 'Reports read the model', on: { spot: ['consume'], conn: ['model'], flow: ['reports', 'excel'] },
          body: 'Power BI reports, Excel, and other tools all read the semantic model — one governed definition of the business.',
          facts: ['One model → many reports', 'Consistent KPIs across the org', 'RLS roles flow to all consumers'] },
      ],
      takeaways: [
        'A semantic model is the shared BI layer: relationships, DAX measures, RLS',
        'In Fabric it is typically bound to OneLake via Direct Lake — fresh, no copy',
        'One model serves many reports with consistent, governed metrics',
      ],
    },
  };

  Kit.registerAll('fabric', SPECS);
})();
