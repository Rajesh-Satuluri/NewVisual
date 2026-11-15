/* ============================================================
   Fabric — Quiz Bank. Keyed by module id. { q, choices, answer, explain }.
   Densified to >= 3 questions per learn page (P2-4).
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  viz.P.fabric.quizBank = {

    /* ── Learn — Fundamentals ────────────────────────────────── */
    onelake: [
      { q: 'How many OneLakes does a Fabric tenant have?', choices: ['One per workspace', 'Exactly one per tenant', 'One per item', 'Unlimited'], answer: 1, explain: 'Each tenant gets exactly one OneLake, created automatically — a single logical lake on ADLS Gen2.' },
      { q: 'What format does OneLake store tabular data in?', choices: ['Proprietary', 'CSV', 'Delta Lake (Parquet)', 'Avro'], answer: 2, explain: 'All tabular data is stored as open Delta/Parquet, so every engine reads one copy.' },
      { q: 'A good analogy for OneLake is…', choices: ['A relational database', 'OneDrive for data', 'A message queue', 'A cache'], answer: 1, explain: 'OneLake is "OneDrive for data" — one tenant-wide, auto-provisioned lake every workspace/item shares.' },
    ],
    'warehouse-vs-lakehouse': [
      { q: 'Which supports multi-table transactions?', choices: ['Lakehouse SQL endpoint', 'Warehouse', 'Neither', 'Both equally'], answer: 1, explain: 'The Warehouse supports full T-SQL read/write with multi-table transactions; the Lakehouse SQL analytics endpoint is read-only.' },
      { q: 'Which item is built around Spark + notebooks and unstructured data?', choices: ['Warehouse', 'Lakehouse', 'Semantic model', 'Pipeline'], answer: 1, explain: 'The Lakehouse centers on Spark/notebooks and handles structured + unstructured files; the Warehouse is T-SQL-centric.' },
      { q: 'What do Warehouse and Lakehouse share underneath?', choices: ['Nothing', 'Delta tables in OneLake and the SQL engine', 'A single node', 'Only Power BI'], answer: 1, explain: 'Both persist Delta in OneLake and expose T-SQL; the difference is read/write (Warehouse) vs read-only endpoint + Spark (Lakehouse).' },
    ],
    'polaris-engine': [
      { q: 'The Fabric Warehouse engine (Polaris lineage) is best described as…', choices: ['A single-node database', 'A distributed, serverless MPP engine decoupled from storage', 'A spreadsheet', 'A cache layer'], answer: 1, explain: 'It is a distributed serverless engine (from Synapse\'s Polaris) running MPP over open Delta, separating compute from OneLake storage.' },
      { q: 'What does the Polaris-based engine separate?', choices: ['Rows from columns', 'Compute from storage and from transaction state', 'Users from roles', 'Tables from schemas'], answer: 1, explain: 'Decoupling compute, storage, and transaction management lets compute scale with capacity while supporting ACID transactions.' },
      { q: 'How does Warehouse compute scale in Fabric?', choices: ['Fixed clusters you size', 'With the purchased capacity (CUs), elastically', 'Only vertically', 'It does not scale'], answer: 1, explain: 'There are no clusters to size; the serverless engine draws on the capacity\'s CUs, bursting for spikes.' },
    ],
    'delta-storage': [
      { q: 'What does V-Order optimize?', choices: ['Network routing', 'Parquet files for faster reads', 'User permissions', 'Billing'], answer: 1, explain: 'V-Order is a write-time Parquet optimization that speeds reads (especially Power BI/Direct Lake) while staying Delta-compatible.' },
      { q: 'Is V-Order compatible with the open Delta spec?', choices: ['No, it is proprietary and unreadable elsewhere', 'Yes — other engines can still read the files', 'Only Spark can read it', 'Only Power BI can read it'], answer: 1, explain: 'V-Order sorts/encodes within standard Parquet, so any Delta-compatible engine reads the files normally.' },
      { q: 'Which maintenance operation compacts small Delta files?', choices: ['ANALYZE', 'OPTIMIZE (and VACUUM to remove old files)', 'COPY INTO', 'REFRESH'], answer: 1, explain: 'OPTIMIZE compacts small files (improving read performance); VACUUM removes files no longer referenced by the Delta log.' },
    ],
    'sql-endpoint': [
      { q: 'The Lakehouse SQL analytics endpoint is…', choices: ['Read/write', 'Read-only', 'Write-only', 'Spark-only'], answer: 1, explain: 'It is an auto-generated, read-only T-SQL endpoint exposing only Delta tables. Use a Warehouse for writes.' },
      { q: 'What does the SQL analytics endpoint expose?', choices: ['Raw CSV/Parquet files', 'Only the Lakehouse\'s Delta tables', 'Spark notebooks', 'Power BI reports'], answer: 1, explain: 'It surfaces the Lakehouse\'s Delta tables as T-SQL objects; raw files are not queryable through it.' },
      { q: 'If you need writes/transactions on top of Lakehouse data, you…', choices: ['Use the SQL endpoint', 'Use a Warehouse (and can cross-query the Lakehouse)', 'Edit files by hand', 'Use DirectQuery'], answer: 1, explain: 'The endpoint is read-only; a Warehouse provides read/write T-SQL and can join the Lakehouse via cross-database queries.' },
    ],

    /* ── Learn — Internals & Data ────────────────────────────── */
    directlake: [
      { q: 'Direct Lake gives you…', choices: ['A duplicate import copy', 'Import speed + DirectQuery freshness, no copy', 'Slower queries', 'Offline reports'], answer: 1, explain: 'Direct Lake reads Delta in OneLake directly — import-like speed, DirectQuery-like freshness, no duplication; falls back to DirectQuery beyond capacity guardrails.' },
      { q: 'What happens if a Direct Lake query exceeds capacity guardrails?', choices: ['It errors', 'It falls back to DirectQuery', 'It imports the data', 'It returns stale data'], answer: 1, explain: 'When a model/query exceeds the F-SKU guardrails, Direct Lake transparently falls back to DirectQuery against the SQL endpoint.' },
      { q: 'Does Direct Lake require a scheduled refresh to stay current?', choices: ['Yes, hourly', 'No — it reframes to the latest Delta version on query', 'Yes, daily', 'Only on weekends'], answer: 1, explain: 'There is no import copy; the model reframes to the newest committed Delta version, so data is fresh without scheduled refresh.' },
    ],
    capacities: [
      { q: 'Fabric compute is measured in…', choices: ['DWUs', 'RPUs', 'Capacity Units (CUs)', 'vCores'], answer: 2, explain: 'Capacity is bought as an F-SKU measured in Capacity Units, shared across all workloads, with bursting and smoothing.' },
      { q: 'Which single capacity is shared by Warehouse, Spark, pipelines, and Power BI?', choices: ['A separate SKU each', 'One F-SKU capacity', 'The free tier only', 'Per-user licenses'], answer: 1, explain: 'All Fabric workloads draw on one capacity\'s CUs — a key cost/throttling consideration.' },
      { q: 'What do bursting and smoothing do?', choices: ['Encrypt data', 'Let short spikes exceed the baseline, then spread the cost over time', 'Delete idle capacity', 'Resize nodes'], answer: 1, explain: 'Bursting allows temporary over-use for spikes; smoothing averages consumption over time so occasional peaks do not immediately throttle.' },
    ],
    shortcuts: [
      { q: 'A OneLake shortcut…', choices: ['Copies data in nightly', 'References external data without copying', 'Deletes the source', 'Only works for CSV'], answer: 1, explain: 'Shortcuts virtualize data (S3/ADLS/GCS/Dataverse/OneLake) by reference — queried in place, no copy.' },
      { q: 'Which sources can a shortcut point to?', choices: ['Only OneLake', 'ADLS Gen2, Amazon S3, GCS, Dataverse, and other OneLake items', 'Only S3', 'Only on-prem SQL'], answer: 1, explain: 'Shortcuts span multiple clouds and internal OneLake items, enabling cross-cloud analytics with no ETL.' },
      { q: 'How is shortcut data queried?', choices: ['Only after a copy job', 'In place by Spark, T-SQL, and Direct Lake, as if native', 'Only via REST', 'It cannot be queried'], answer: 1, explain: 'Shortcut targets appear like native tables/files and are read in place by all Fabric engines.' },
    ],
    mirroring: [
      { q: 'Mirroring brings an external database into OneLake as…', choices: ['A nightly CSV', 'Near-real-time Delta via CDC', 'A read-only screenshot', 'A linked server'], answer: 1, explain: 'Mirroring continuously replicates sources (Snowflake/Cosmos/SQL/PostgreSQL) into OneLake as Delta via CDC; sync does not consume your CUs.' },
      { q: 'Does mirroring sync consume your capacity (CUs)?', choices: ['Yes, heavily', 'No — the replication compute is free of your CUs', 'Only at night', 'Only for Snowflake'], answer: 1, explain: 'The mirroring replication runs outside your capacity, so it does not eat your CUs; you pay for the OneLake storage of the mirror.' },
      { q: 'A good use of mirroring is…', choices: ['Backing up Power BI', 'Analyzing/joining operational data (e.g. Snowflake, Cosmos) in Fabric without touching the source', 'Encrypting reports', 'Resizing capacity'], answer: 1, explain: 'Mirrored data is queryable via cross-database queries and Direct Lake without load on the source system.' },
    ],
    'cross-db-queries': [
      { q: 'How can one T-SQL query join a Warehouse, a Lakehouse endpoint, and a mirrored DB?', choices: ['It cannot', 'They all live in OneLake, so three-part names join them directly', 'Via a linked server', 'By exporting to CSV first'], answer: 1, explain: 'Because all items persist in OneLake, cross-database queries use item.schema.table names with no federation plumbing or copies.' },
      { q: 'What is the scope for cross-database queries?', choices: ['Any tenant', 'Items within the same workspace (use shortcuts to reach other workspaces)', 'Only one item', 'Only Power BI'], answer: 1, explain: 'Cross-database T-SQL spans items in the same workspace; OneLake shortcuts extend reach to other workspaces.' },
      { q: 'Cross-database queries avoid…', choices: ['Using SQL', 'Copying or federating data between separate systems', 'Delta format', 'Security'], answer: 1, explain: 'Since data already shares OneLake, there is no ETL copy or federation layer to maintain.' },
    ],
    'semantic-models': [
      { q: 'A semantic model provides…', choices: ['Raw file storage', 'The reusable BI layer — tables, relationships, DAX measures, RLS', 'A pipeline scheduler', 'Encryption keys'], answer: 1, explain: 'The semantic model is the governed metrics layer reports read, defining relationships, measures, and security.' },
      { q: 'In Fabric, a semantic model is typically bound to OneLake data via…', choices: ['Import only', 'Direct Lake', 'CSV export', 'A linked server'], answer: 1, explain: 'Direct Lake binds the model to OneLake Delta tables for fresh, fast reporting with no import.' },
      { q: 'Why centralize metrics in a semantic model?', choices: ['To slow reports', 'So many reports share consistent, governed definitions', 'To avoid Delta', 'To disable RLS'], answer: 1, explain: 'One model serving many reports keeps measures/relationships/security consistent instead of redefined per report.' },
    ],
    medallion: [
      { q: 'Correct medallion order?', choices: ['Gold → Silver → Bronze', 'Bronze → Silver → Gold', 'Raw → Gold → Silver', 'Silver → Bronze → Gold'], answer: 1, explain: 'Bronze (raw) → Silver (cleaned/conformed) → Gold (business-ready), all as Delta in OneLake.' },
      { q: 'Where do Direct Lake semantic models usually read from?', choices: ['Bronze', 'The Gold layer', 'Raw files', 'The pipeline logs'], answer: 1, explain: 'Gold holds business-ready dimensional models/aggregates that feed Direct Lake semantic models and reports.' },
      { q: 'What is the Bronze layer\'s job?', choices: ['Serve dashboards', 'Store raw, as-ingested data (append-only) for fidelity and reprocessing', 'Hold star schemas', 'Mask PII'], answer: 1, explain: 'Bronze preserves raw source data so you can reprocess Silver/Gold without re-ingesting.' },
    ],

    /* ── Platform & Orchestration ────────────────────────────── */
    'workspaces-domains': [
      { q: 'What is a Fabric workspace?', choices: ['A single table', 'A collaboration container for items, bound to a capacity', 'A billing SKU', 'A Spark cluster'], answer: 1, explain: 'A workspace groups related items (lakehouses, warehouses, models, reports) for a team and is assigned to a capacity.' },
      { q: 'What are domains used for?', choices: ['Encryption', 'Organizing workspaces by business area for governance (data mesh)', 'Running queries', 'Storing Delta files'], answer: 1, explain: 'Domains group workspaces by business area/line, enabling federated governance and a data-mesh model.' },
      { q: 'A workspace is assigned to…', choices: ['Every tenant', 'A capacity (which provides its compute)', 'A single user only', 'A Git repo only'], answer: 1, explain: 'Each workspace runs on an assigned capacity; its workloads consume that capacity\'s CUs.' },
    ],
    'data-factory': [
      { q: 'What does Data Factory provide in Fabric?', choices: ['Only Power BI', 'Pipelines to orchestrate ingestion and activities (Copy, notebooks, control flow)', 'Only encryption', 'Only semantic models'], answer: 1, explain: 'Data Factory pipelines orchestrate Copy (many connectors), notebooks, dataflows, and control flow on schedules/triggers.' },
      { q: 'The Copy activity is used to…', choices: ['Delete tables', 'Move data from sources into Fabric using hundreds of connectors', 'Train models', 'Mask columns'], answer: 1, explain: 'Copy ingests from a broad connector library into Lakehouse/Warehouse as part of a pipeline.' },
      { q: 'Which construct gives pipelines control flow?', choices: ['SELECT', 'If / ForEach / Until activities', 'OPTIMIZE', 'VACUUM'], answer: 1, explain: 'Pipelines use control-flow activities (conditionals, loops) plus triggers and monitoring — the Fabric evolution of Azure Data Factory.' },
    ],
    'dataflows-gen2': [
      { q: 'Dataflows Gen2 are built on…', choices: ['KQL', 'Power Query (low-code transformations)', 'Spark Scala only', 'DAX'], answer: 1, explain: 'Dataflows Gen2 use Power Query for low-code, analyst-friendly transformations with explicit output destinations.' },
      { q: 'When would you pick a Dataflow Gen2 over a pipeline?', choices: ['For orchestration/scheduling', 'For low-code data transformation/prep with a destination', 'For RLS', 'For capacity sizing'], answer: 1, explain: 'Use dataflows for transformation; pipelines orchestrate activities (and can run a Dataflow activity).' },
      { q: 'Where can a Dataflow Gen2 write its output?', choices: ['Nowhere', 'A Lakehouse or Warehouse destination', 'Only to email', 'Only to Power BI'], answer: 1, explain: 'Gen2 adds explicit destinations so transformed data lands in Lakehouse/Warehouse tables.' },
    ],
    'git-deployment': [
      { q: 'Deployment pipelines promote content across…', choices: ['Workspaces randomly', 'Dev → Test → Prod stages', 'Only production', 'Git branches only'], answer: 1, explain: 'Deployment pipelines promote across Dev/Test/Prod (full/selective/backward); Git integration handles source control.' },
      { q: 'Git integration in Fabric provides…', choices: ['Compute', 'Source control for a workspace (commit/sync with GitHub/Azure DevOps)', 'Encryption', 'Masking'], answer: 1, explain: 'Git integration puts workspace items under version control for commit/sync and change tracking.' },
      { q: 'A common ALM pattern is…', choices: ['No source control', 'Git on Dev, deployment pipelines to promote to Test/Prod', 'Edit prod directly', 'CSV backups only'], answer: 1, explain: 'Teams version Dev with Git and use deployment pipelines to promote validated content onward.' },
    ],
    copilot: [
      { q: 'What does Copilot in Fabric do?', choices: ['Replaces capacities', 'Assists with generating code/DAX/dataflows and insights via natural language', 'Encrypts OneLake', 'Mirrors databases'], answer: 1, explain: 'Copilot provides AI assistance across Fabric — generating queries/DAX, transformations, and narrative insights.' },
      { q: 'Using Copilot in Fabric requires…', choices: ['Nothing', 'A sufficient Fabric capacity (it consumes CUs) with the feature enabled', 'A separate database', 'A P-SKU only'], answer: 1, explain: 'Copilot runs on your capacity (consuming CUs) and must be enabled by the tenant admin; availability depends on SKU.' },
      { q: 'Copilot assistance is available across which experiences?', choices: ['Only Power BI', 'Data engineering (notebooks), warehouse, data factory, and Power BI', 'Only pipelines', 'Only the SQL endpoint'], answer: 1, explain: 'Copilot spans multiple Fabric workloads — notebooks, warehouse SQL, dataflows/pipelines, and Power BI.' },
    ],

    /* ── Security & Governance ───────────────────────────────── */
    'rls-cls-masking': [
      { q: 'Which controls WHICH ROWS a user sees?', choices: ['Column-level security', 'Dynamic data masking', 'Row-level security', 'V-Order'], answer: 2, explain: 'RLS filters rows by a security predicate; CLS limits columns; masking changes how values appear.' },
      { q: 'Column-level security (CLS) works by…', choices: ['Hiding rows', 'GRANT/DENY on specific columns', 'Reordering Parquet', 'Deleting data'], answer: 1, explain: 'CLS restricts access to specific columns via grants/denies, independent of row filters.' },
      { q: 'Dynamic data masking…', choices: ['Encrypts at rest', 'Changes how values appear in results without altering stored data (UNMASK reveals)', 'Deletes columns', 'Blocks all access'], answer: 1, explain: 'Masking transforms displayed values per permission; it is a display control, so layer it with CLS/RLS for real protection.' },
    ],
    purview: [
      { q: 'What does Microsoft Purview add for Fabric?', choices: ['Compute', 'Cataloging, classification, sensitivity labels, and lineage', 'Delta storage', 'Capacity bursting'], answer: 1, explain: 'Purview governs data tenant-wide: discovery/catalog, auto-classification, labels, and end-to-end lineage.' },
      { q: 'Sensitivity labels in Purview…', choices: ['Only color reports', 'Travel with the data and enforce protection across services', 'Resize capacity', 'Delete PII'], answer: 1, explain: 'Labels follow the data through pipelines and exports, enforcing protection and supporting compliance.' },
      { q: 'Lineage in Purview helps you…', choices: ['Encrypt disks', 'Trace data from source through pipelines to reports for impact analysis/audit', 'Mask columns', 'Scale Spark'], answer: 1, explain: 'End-to-end lineage shows how data flows, enabling impact analysis, audit, and troubleshooting.' },
    ],

  };
})();
