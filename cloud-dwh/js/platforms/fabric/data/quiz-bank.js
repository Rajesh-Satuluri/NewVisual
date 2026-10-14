/* ============================================================
   Fabric — Quiz Bank. Keyed by module id. { q, choices, answer, explain }.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  viz.P.fabric.quizBank = {
    onelake: [
      { q: 'How many OneLakes does a Fabric tenant have?', choices: ['One per workspace', 'Exactly one per tenant', 'One per item', 'Unlimited'], answer: 1, explain: 'Each tenant gets exactly one OneLake, created automatically — a single logical lake on ADLS Gen2.' },
      { q: 'What format does OneLake store tabular data in?', choices: ['Proprietary', 'CSV', 'Delta Lake (Parquet)', 'Avro'], answer: 2, explain: 'All tabular data is stored as open Delta/Parquet, so every engine reads one copy.' },
    ],
    'warehouse-vs-lakehouse': [
      { q: 'Which supports multi-table transactions?', choices: ['Lakehouse SQL endpoint', 'Warehouse', 'Neither', 'Both equally'], answer: 1, explain: 'The Warehouse supports full T-SQL read/write with multi-table transactions; the Lakehouse SQL analytics endpoint is read-only.' },
    ],
    'delta-storage': [
      { q: 'What does V-Order optimize?', choices: ['Network routing', 'Parquet files for faster reads', 'User permissions', 'Billing'], answer: 1, explain: 'V-Order is a write-time Parquet optimization that speeds reads (especially Power BI/Direct Lake) while staying Delta-compatible.' },
    ],
    'sql-endpoint': [
      { q: 'The Lakehouse SQL analytics endpoint is…', choices: ['Read/write', 'Read-only', 'Write-only', 'Spark-only'], answer: 1, explain: 'It is an auto-generated, read-only T-SQL endpoint exposing only Delta tables. Use a Warehouse for writes.' },
    ],
    directlake: [
      { q: 'Direct Lake gives you…', choices: ['A duplicate import copy', 'Import speed + DirectQuery freshness, no copy', 'Slower queries', 'Offline reports'], answer: 1, explain: 'Direct Lake reads Delta in OneLake directly — import-like speed, DirectQuery-like freshness, no duplication; falls back to DirectQuery beyond capacity guardrails.' },
    ],
    capacities: [
      { q: 'Fabric compute is measured in…', choices: ['DWUs', 'RPUs', 'Capacity Units (CUs)', 'vCores'], answer: 2, explain: 'Capacity is bought as an F-SKU measured in Capacity Units, shared across all workloads, with bursting and smoothing.' },
    ],
    shortcuts: [
      { q: 'A OneLake shortcut…', choices: ['Copies data in nightly', 'References external data without copying', 'Deletes the source', 'Only works for CSV'], answer: 1, explain: 'Shortcuts virtualize data (S3/ADLS/GCS/Dataverse/OneLake) by reference — queried in place, no copy.' },
    ],
    mirroring: [
      { q: 'Mirroring brings an external database into OneLake as…', choices: ['A nightly CSV', 'Near-real-time Delta via CDC', 'A read-only screenshot', 'A linked server'], answer: 1, explain: 'Mirroring continuously replicates sources (Snowflake/Cosmos/SQL/PostgreSQL) into OneLake as Delta via CDC; sync does not consume your CUs.' },
    ],
    'rls-cls-masking': [
      { q: 'Which controls WHICH ROWS a user sees?', choices: ['Column-level security', 'Dynamic data masking', 'Row-level security', 'V-Order'], answer: 2, explain: 'RLS filters rows by a security predicate; CLS limits columns; masking changes how values appear.' },
    ],
    medallion: [
      { q: 'Correct medallion order?', choices: ['Gold → Silver → Bronze', 'Bronze → Silver → Gold', 'Raw → Gold → Silver', 'Silver → Bronze → Gold'], answer: 1, explain: 'Bronze (raw) → Silver (cleaned/conformed) → Gold (business-ready), all as Delta in OneLake.' },
    ],
    'git-deployment': [
      { q: 'Deployment pipelines promote content across…', choices: ['Workspaces randomly', 'Dev → Test → Prod stages', 'Only production', 'Git branches only'], answer: 1, explain: 'Deployment pipelines promote across Dev/Test/Prod (full/selective/backward); Git integration handles source control.' },
    ],
  };
})();
