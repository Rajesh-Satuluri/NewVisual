/* ============================================================
   Fabric — Interview Bank. Keyed by module id. { q, a, difficulty }.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  viz.P.fabric.interviewBank = {
    onelake: [
      { q: 'What is OneLake and how many does a tenant have?', a: 'OneLake is a single, tenant-wide logical data lake ("OneDrive for data") built on ADLS Gen2. Each tenant gets exactly one, created automatically. All Fabric items store tabular data in it as open Delta/Parquet, so every engine reads one copy.', difficulty: 'easy' },
      { q: 'How does OneLake avoid data duplication across engines?', a: 'Because everything is stored once as Delta in OneLake, Spark, T-SQL, KQL, and Power BI (Direct Lake) all read the same files. Shortcuts bring external data in by reference, so there is no copying between systems.', difficulty: 'medium' },
    ],
    'warehouse-vs-lakehouse': [
      { q: 'When would you choose a Warehouse over a Lakehouse in Fabric?', a: 'Both store Delta in OneLake and share the SQL engine. Choose the Warehouse for T-SQL-centric, structured workloads needing full read/write and multi-table transactions. Choose the Lakehouse for Spark/notebook work and structured + unstructured data; its SQL analytics endpoint is read-only.', difficulty: 'medium' },
    ],
    'polaris-engine': [
      { q: 'How does the Fabric Warehouse engine scale?', a: 'It is a distributed, serverless query engine (the Polaris lineage from Synapse) that separates compute from OneLake storage and from transaction state. Queries run MPP-style over open Delta, and compute scales with the capacity (CUs) rather than fixed clusters — while still supporting multi-table ACID transactions.', difficulty: 'hard' },
    ],
    'delta-storage': [
      { q: 'What is V-Order and why does it matter?', a: 'V-Order is a Fabric write-time optimization (special sorting/encoding within Parquet) that makes Delta files much faster to read, especially for Power BI/Direct Lake. It stays compatible with the open Delta spec, so other engines can still read the files.', difficulty: 'medium' },
    ],
    'sql-endpoint': [
      { q: 'What is the SQL analytics endpoint and its key limitation?', a: 'It is an automatically generated T-SQL front door over a Lakehouse\'s Delta tables. Key limitation: it is read-only (SELECT, views, functions) and only exposes Delta tables — not raw parquet/csv files. For writes and multi-table transactions you use a Warehouse.', difficulty: 'medium' },
    ],
    directlake: [
      { q: 'Explain Direct Lake and how it differs from Import and DirectQuery.', a: 'Direct Lake loads Delta/Parquet columns from OneLake directly into the Power BI engine on demand — import-like speed with DirectQuery-like freshness and no duplicate copy or scheduled refresh. Import duplicates and refreshes; DirectQuery queries the source each time. Direct Lake needs a Fabric capacity and falls back to DirectQuery if guardrails are exceeded.', difficulty: 'hard' },
    ],
    capacities: [
      { q: 'How is Fabric compute purchased and shared?', a: 'As a capacity — an F-SKU (F2…F2048) measured in Capacity Units (CUs). One capacity is shared by all workloads (Warehouse, Spark, pipelines, Power BI). Bursting handles spikes and smoothing spreads cost; P-SKUs map to F-SKUs (P1 ≈ F64, which also unlocks free-viewer Power BI consumption).', difficulty: 'medium' },
    ],
    shortcuts: [
      { q: 'What problem do shortcuts solve?', a: 'Shortcuts virtualize data from other locations (ADLS Gen2, Amazon S3, GCS, Dataverse, or another OneLake item) into your Lakehouse without copying it. The data appears like native tables/files and can be queried in place by Spark, T-SQL, and Direct Lake — enabling cross-cloud analytics with no ETL or duplicate storage.', difficulty: 'medium' },
    ],
    mirroring: [
      { q: 'What is mirroring and when would you use it?', a: 'Mirroring continuously replicates an external database (Snowflake, Cosmos DB, Azure SQL, PostgreSQL…) into OneLake as Delta in near real time via CDC — no pipelines to build. The sync compute does not consume your CUs. Use it to analyze and join operational data in Fabric (cross-database queries, Direct Lake) without touching the source system.', difficulty: 'medium' },
    ],
    'cross-db-queries': [
      { q: 'How do cross-database queries work in Fabric?', a: 'Because warehouses, lakehouse SQL endpoints, and mirrored databases all live in OneLake, one T-SQL query can join across them using three-part names (item.schema.table) — no federation plumbing or copying between systems.', difficulty: 'medium' },
    ],
    'semantic-models': [
      { q: 'What is a semantic model and how does it relate to Direct Lake?', a: 'A semantic model is the reusable BI layer — tables, relationships, DAX measures, and RLS — that reports read. In Fabric it is typically bound to OneLake Delta tables via Direct Lake, giving fresh, fast reporting with no import. One model serves many reports with consistent metrics.', difficulty: 'medium' },
    ],
    'rls-cls-masking': [
      { q: 'Compare RLS, CLS, and dynamic data masking in Fabric.', a: 'RLS restricts which rows a user sees (security predicate by role/identity); CLS restricts which columns (GRANT/DENY at column level); dynamic data masking changes how values appear in results without altering stored data (UNMASK reveals originals). Masking alone is not full protection — layer it with CLS/RLS.', difficulty: 'medium' },
    ],
    purview: [
      { q: 'What role does Microsoft Purview play with Fabric?', a: 'Purview governs data tenant-wide: cataloging/discovery, automatic classification, sensitivity labels that travel with the data, and end-to-end lineage from source through pipelines to reports — supporting impact analysis, audit, and compliance.', difficulty: 'medium' },
    ],
    medallion: [
      { q: 'Explain the medallion architecture.', a: 'A lakehouse organization pattern: Bronze (raw, as-ingested, append-only), Silver (cleaned, deduped, conformed), Gold (curated, aggregated, business-ready star schemas). All layers are Delta in OneLake; Gold feeds Direct Lake semantic models and reports.', difficulty: 'easy' },
    ],
    'data-factory': [
      { q: 'What does Data Factory do in Fabric?', a: 'It orchestrates ingestion and activities with pipelines — Copy (hundreds of connectors), notebooks, dataflows, and control flow (If/ForEach/Until) — run on a schedule or event trigger with built-in monitoring. It is the Fabric evolution of Azure Data Factory.', difficulty: 'easy' },
    ],
    'dataflows-gen2': [
      { q: 'Dataflows Gen2 vs pipelines — when each?', a: 'Dataflows Gen2 are low-code Power Query transformations with explicit destinations (Lakehouse/Warehouse) — great for analyst-driven prep. Pipelines are the orchestrator that runs activities (including a Dataflow activity) with scheduling/control flow. Use dataflows for transformation, pipelines for orchestration.', difficulty: 'medium' },
    ],
    'git-deployment': [
      { q: 'How do Git integration and deployment pipelines differ?', a: 'Git integration puts a workspace under source control (GitHub/Azure DevOps) for commit/sync and change tracking. Deployment pipelines promote content across Dev → Test → Prod stages (full/selective/backward). Common pattern: Git on Dev, deployment pipelines for promotion onward.', difficulty: 'medium' },
    ],
  };
})();
