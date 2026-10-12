/* ============================================================
   Cloud DE Visualizer — Microsoft Fabric interview questions (Phase 2 / I2.9)
   Topic-wise, interview-recall model answers. Consumed by
   js/modules/_interview-qa.js (TV.InterviewQA.register('fabric', ...)).
   Shape: [ { id, label, icon?, blurb?, questions:[ { q, a } ] } ]
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;

  const TOPICS = [
    {
      id: 'onelake', label: 'OneLake & storage', icon: 'database',
      blurb: 'The single, tenant-wide data lake under Fabric.',
      questions: [
        { q: 'What is OneLake and how does it relate to ADLS Gen2 and Delta?', a: 'OneLake is Fabric’s single, tenant-wide logical data lake — one copy of data for the whole organization, built on ADLS Gen2 and automatically provisioned with the tenant. Every workspace and item (lakehouse, warehouse) stores its data in OneLake, and tabular data is stored as Delta/Parquet. Think "OneDrive for data": one namespace, no silos, open Delta format so any engine can read it.' },
        { q: 'What are OneLake shortcuts and why do they matter?', a: 'Shortcuts are pointers that make data in another location (another OneLake item, ADLS Gen2, S3, GCS, Dataverse) appear as if it lives in your lakehouse — without copying it. They let you compose data across sources and domains in place, avoiding duplication and stale copies. Access to external-source shortcut data depends on the caller’s permission to the underlying source.' },
        { q: 'Why does "one copy" matter for a data platform?', a: 'Because copies drift, cost money and multiply governance surface. OneLake keeps a single physical copy in open Delta format that Spark, the SQL endpoint, the Warehouse, Power BI (Direct Lake) and external tools all read — so you compute many ways over one governed copy instead of ETL-ing between silos.' },
        { q: 'How is data physically organized in OneLake for a lakehouse?', a: 'A lakehouse exposes Tables/ (managed Delta tables, queryable via the SQL endpoint and Spark) and Files/ (unstructured/semi-structured files). Tables are Delta; shortcuts can appear under either. The SQL analytics endpoint auto-discovers Delta tables for T-SQL querying.' },
      ],
    },
    {
      id: 'lakehouse-warehouse', label: 'Lakehouse vs Warehouse', icon: 'layers',
      blurb: 'Choosing between the two analytical stores.',
      questions: [
        { q: 'When would you choose a Lakehouse vs a Warehouse in Fabric?', a: 'Lakehouse when you want Spark + files + Delta tables, data-engineering and data-science workloads, and a read-only SQL endpoint; it suits unstructured/semi-structured data and notebook transforms. Warehouse when you want a full T-SQL, multi-table-transaction, read/write relational warehouse for BI/SQL developers. Both store Delta in OneLake and interoperate; the choice is about the primary engine and persona (Spark/files vs T-SQL writes).' },
        { q: 'Can the Lakehouse SQL endpoint write data? Why does that matter?', a: 'No — the lakehouse SQL analytics endpoint is read-only T-SQL over the Delta tables; you write via Spark/notebooks or pipelines/dataflows. The Warehouse, by contrast, supports T-SQL INSERT/UPDATE/DELETE and multi-table transactions. If a team needs to write with T-SQL, that points to a Warehouse.' },
        { q: 'Both are Delta in OneLake — so how do they interoperate?', a: 'Because both persist open Delta tables in OneLake, a Warehouse can query a lakehouse’s tables (and vice versa via shortcuts/cross-database queries), and Power BI can build a single semantic model spanning them. You pick the write/compute engine per workload without copying data between them.' },
        { q: 'A SQL-first BI team needs stored procedures and T-SQL writes. Which do you pick?', a: 'A Warehouse — it gives full T-SQL DDL/DML, multi-table ACID transactions and a familiar SQL surface. A lakehouse would force them into Spark for writes.' },
      ],
    },
    {
      id: 'pipelines', label: 'Data pipelines', icon: 'git-branch',
      blurb: 'Orchestration in Fabric Data Factory.',
      questions: [
        { q: 'What is a Fabric Data pipeline and how does it differ from Dataflow Gen2?', a: 'A Data pipeline orchestrates activities (Copy, Notebook, Dataflow, Stored Proc, control-flow like ForEach/If) with dependencies, parameters, retries and scheduling — it moves and coordinates. Dataflow Gen2 is the Power Query-based transformation tool for ingesting and shaping data into a destination. Pipelines orchestrate; dataflows transform. A pipeline often runs a dataflow or notebook as a step.' },
        { q: 'How do you make a pipeline resilient to a transient activity failure?', a: 'Set activity retry count + interval for transient errors, use success (not just completion) dependencies so downstream only runs on good data, add failure paths/alerts, and design idempotent loads (staging + MERGE) so a retry does not duplicate.' },
        { q: 'How do you parameterize a pipeline across dev/test/prod?', a: 'Use pipeline parameters and variables for environment-specific values (connections, paths), supply per-environment values, and promote via deployment pipelines with data-source rules so each stage binds to its own lakehouse/warehouse. Avoid hard-coded endpoints.' },
        { q: 'How do you monitor pipeline runs and catch failures fast?', a: 'Use the Monitor hub / pipeline run history for activity-level status and durations, configure failure alerts, and track SLA-critical runs; investigate queued vs running times when capacity contention delays starts.' },
      ],
    },
    {
      id: 'dataflow-gen2', label: 'Dataflow Gen2', icon: 'filter',
      blurb: 'Power Query ingestion and transformation.',
      questions: [
        { q: 'What is Dataflow Gen2 and when do you use it over a Spark notebook?', a: 'Dataflow Gen2 is the low-code, Power Query (M) way to ingest and transform data into a Fabric destination (lakehouse/warehouse). Use it for connector-rich ingestion and citizen-developer transforms. Use a Spark notebook when you need code, large-scale/complex transforms, custom logic, or performance control. They complement each other inside a pipeline.' },
        { q: 'How do you make a dataflow resilient to source schema changes?', a: 'Avoid brittle hard-coded column references and fragile "Changed Type" steps, handle added/renamed columns gracefully, validate against source changes in a non-prod workspace, and keep the destination mapping tolerant of additive changes.' },
        { q: 'What is staging in Dataflow Gen2?', a: 'Dataflow Gen2 can stage data (in a Fabric-managed lakehouse/warehouse behind the scenes) to enable scalable compute and fast loads; it separates the transform from the final destination write. You can toggle staging per query to tune performance.' },
      ],
    },
    {
      id: 'spark-notebooks', label: 'Spark & notebooks', icon: 'code',
      blurb: 'Fabric Spark compute for data engineering.',
      questions: [
        { q: 'How does Spark compute work in Fabric (starter pools, capacity)?', a: 'Fabric provides Spark via live pools: starter pools give fast session startup, and you can define custom pools (node sizes, autoscale). Spark runs on the workspace’s Fabric capacity (CUs), so Spark competes with other workloads for capacity — watch utilization and throttling. You write PySpark/Scala/SQL/R in notebooks against lakehouse Delta tables.' },
        { q: 'When do you reach for a notebook vs a pipeline or dataflow?', a: 'Notebook for code-first, complex or large-scale transforms, ML, and custom logic over Delta/files; pipeline to orchestrate and schedule; dataflow for low-code connector ingestion. A common pattern: pipeline triggers a notebook that does the heavy Spark transform into Silver/Gold.' },
        { q: 'How do notebooks read and write lakehouse data?', a: 'Attach a lakehouse to the notebook; read/write Delta tables under Tables/ and files under Files/ via Spark APIs (spark.read.table / saveAsTable) — data lands in OneLake as open Delta, instantly queryable by the SQL endpoint and Direct Lake.' },
      ],
    },
    {
      id: 'eventstream', label: 'Eventstream & Eventhouse', icon: 'activity',
      blurb: 'Real-time Intelligence in Fabric.',
      questions: [
        { q: 'What are Eventstreams and Eventhouse in Fabric?', a: 'Eventstream ingests and routes streaming events (from Event Hubs, Kafka, IoT, etc.) with a no-code editor to destinations like an Eventhouse or lakehouse. Eventhouse (backed by KQL databases) stores and queries high-volume time-series/event data with KQL. Together they are Fabric’s Real-Time Intelligence path: ingest → route → store → analyze streaming data.' },
        { q: 'When do you use an Eventhouse/KQL database vs a lakehouse table?', a: 'Eventhouse/KQL for high-velocity, time-series and log/telemetry data needing fast ad-hoc analytics and retention policies; lakehouse Delta for batch/engineered analytical tables. You can also land streaming data into a lakehouse for batch use via eventstream routing.' },
        { q: 'How do you get streaming data into a report with low latency?', a: 'Eventstream → Eventhouse (KQL) with real-time dashboards, or route to a lakehouse and use Direct Lake on the Delta tables; choose based on latency and query pattern (KQL for sub-second telemetry analytics).' },
      ],
    },
    {
      id: 'direct-lake', label: 'Direct Lake & semantic models', icon: 'eye',
      blurb: 'Fast BI over Delta without import or DirectQuery.',
      questions: [
        { q: 'What is Direct Lake mode and why is it significant?', a: 'Direct Lake lets a Power BI semantic model read Delta tables directly from OneLake into memory on demand — no scheduled import and no per-query DirectQuery round-trip to a source. You get import-like speed on fresh lake data. It is unique to Fabric and is a big reason the lakehouse can serve BI directly.' },
        { q: 'When does Direct Lake fall back to DirectQuery, and why does it matter?', a: 'If the model exceeds the capacity SKU’s Direct Lake guardrails (row/size limits) or hits unsupported features, queries fall back to DirectQuery, which is slower. So you design models within the guardrails (aggregations, fewer columns, optimized Delta files) or move to a larger SKU to keep the fast path.' },
        { q: 'How does Direct Lake stay fresh as the lake updates?', a: 'The semantic model is "framed" against the current Delta version; when underlying tables update, reframing picks up the new data so reports reflect current lake state without a full import refresh.' },
      ],
    },
    {
      id: 'security-governance', label: 'Security & governance', icon: 'shield',
      blurb: 'Access control, lineage and compliance in Fabric.',
      questions: [
        { q: 'How is access controlled across workspaces and items in Fabric?', a: 'Workspace roles (Admin/Member/Contributor/Viewer) grant broad access; item-level permissions and sharing refine it; OneLake data access can use OneLake security and (for warehouses/lakehouse SQL) object/row/column-level controls. Identity is Microsoft Entra ID. Shortcut access to external sources depends on the caller’s permission to the source.' },
        { q: 'How do you enforce row-level or column-level security for BI?', a: 'In the semantic model use RLS roles (and OLS for columns); in the Warehouse use T-SQL row-level security / column-level controls and dynamic data masking. Choose based on where consumers query (model vs warehouse) and keep policies central rather than duplicating tables.' },
        { q: 'How do you trace what a report depends on for a compliance review?', a: 'Use Fabric lineage view and the Purview/Microsoft governance integration to see item-to-item lineage (source → lakehouse → model → report) and sensitivity labels; this answers "what feeds this report and where did the data come from".' },
        { q: 'What do sensitivity labels do in Fabric?', a: 'Microsoft Purview sensitivity labels classify and protect items (and flow downstream through lineage, e.g. into exported files), enforcing encryption/access policies and supporting compliance — classification travels with the data rather than stopping at one item.' },
      ],
    },
    {
      id: 'capacity', label: 'Capacity & performance', icon: 'gauge',
      blurb: 'CUs, smoothing and throttling.',
      questions: [
        { q: 'How does Fabric capacity (CUs) work and what is throttling?', a: 'Fabric runs on capacity measured in Capacity Units (CUs) via F-SKUs, shared by all workloads (Spark, warehouse, pipelines, Power BI) in assigned workspaces. Fabric smooths bursty usage over time, but sustained overage triggers throttling — first interactive delays, then rejection of operations. You monitor with the Capacity Metrics app.' },
        { q: 'A capacity is throttling every afternoon — how do you investigate and fix?', a: 'Open the Capacity Metrics app to find peak CU and the top-consuming items; reschedule heavy Spark/dataflow jobs off the interactive report peak, optimize the worst offenders, and scale the capacity or isolate workloads onto a separate capacity. Throttling across unrelated items is the signature of an over-subscribed shared capacity.' },
        { q: 'How do you keep an SLA-critical workload safe from noisy neighbors?', a: 'Isolate it on its own capacity (or schedule heavy jobs away from its window), monitor CU headroom, and alert on overage — so a runaway Spark job or refresh cannot throttle the critical workload.' },
      ],
    },
    {
      id: 'cicd-git', label: 'CI/CD & Git', icon: 'git-merge',
      blurb: 'Deployment pipelines and source control.',
      questions: [
        { q: 'How do you promote Fabric content from dev to prod safely?', a: 'Use deployment pipelines with dev/test/prod stages and deployment rules (data-source rules) so each stage binds to its own lakehouse/warehouse/connection — never hard-code endpoints. Combine with Git integration for source control and reviewed changes. This avoids promoting dev bindings into prod.' },
        { q: 'What does Git integration give you in Fabric?', a: 'Workspace items can be connected to a Git repo (Azure DevOps/GitHub) so item definitions are versioned, changes are reviewed via branches/PRs, and you can sync/commit from the workspace — enabling proper ALM instead of manual copying.' },
        { q: 'Why avoid manual edits in prod after a deployment?', a: 'Because they drift from source control and the deployment pipeline, are unreviewed and unrepeatable, and get overwritten on the next promotion. The fix is parameterization + deployment rules so promotion is correct without hand edits.' },
      ],
    },
  ];

  TOPICS.push({
    id: 'senior-architecture', label: 'Senior & Architecture', icon: 'layers',
    blurb: 'Senior-level design, trade-off and troubleshooting rounds. Reveal the model answer, check it against the rubric, rate yourself, and prepare for the follow-ups.',
    questions: [
      { q: 'Design an end-to-end analytics solution in Microsoft Fabric from ingestion to BI, covering storage, compute, serving and governance.', level: 'senior', tags: ['architecture'],
        a: 'Ingest via Data pipelines (Copy) and/or Dataflow Gen2 / Eventstream into OneLake. Land raw in a Lakehouse (Files/ + Bronze Delta), transform with Spark notebooks to Silver/Gold Delta (or a Warehouse for T-SQL writes). Serve BI with a semantic model in Direct Lake over the Gold Delta tables for import-like speed on fresh data. Govern with workspace roles + OneLake/warehouse security (RLS/CLS), lineage and Purview sensitivity labels. Run on a right-sized capacity (watch CU), promote dev→prod with deployment pipelines + Git, and monitor via the Monitor hub and Capacity Metrics app.',
        rubric: ['Ingestion options (pipelines/dataflow/eventstream) into OneLake', 'Lakehouse vs Warehouse choice + medallion Delta', 'Direct Lake serving for BI', 'Governance (roles, RLS/CLS, lineage, labels)', 'Capacity management + CI/CD + monitoring'],
        followUps: ['When Warehouse over Lakehouse here?', 'How do you keep Direct Lake from falling back to DirectQuery?', 'How do you isolate this from noisy-neighbor throttling?'] },
      { q: 'Lakehouse vs Warehouse in Fabric — defend a choice for a mixed SQL + Spark team.', level: 'senior', tags: ['trade-offs'],
        a: 'Both store Delta in OneLake and interoperate, so you can use both. Lakehouse gives Spark + files + Delta with a read-only SQL endpoint — best for data engineering/science and file-based or semi-structured work. Warehouse gives full T-SQL read/write with multi-table ACID transactions — best for SQL developers and relational marts. For a mixed team: engineer Bronze/Silver in the Lakehouse with Spark, and expose Gold via a Warehouse (or the SQL endpoint) for SQL consumers — picking the write engine per persona without copying data.',
        rubric: ['Both are Delta in OneLake and interoperate', 'Lakehouse = Spark/files + read-only SQL endpoint', 'Warehouse = full T-SQL writes + transactions', 'Persona-driven split (engineer in LH, serve via WH)', 'No data duplication'],
        followUps: ['Can the Lakehouse SQL endpoint write? Implication?', 'How do you query across a Lakehouse and Warehouse?', 'Where does Direct Lake fit?'] },
      { q: 'A Fabric capacity throttles every afternoon across reports and pipelines. Diagnose and fix.', level: 'senior', tags: ['troubleshooting'],
        a: 'Open the Capacity Metrics app: CU pinned at 100% with overage carry-forward and throttling (interactive delay → rejection) is an over-subscribed shared capacity. Identify top CU consumers (a heavy Spark job + large dataflow refresh overlapping the report peak), reschedule them off-peak, optimize the worst items, and scale the capacity or isolate workloads onto a separate capacity. Throttling across unrelated items is the signature.',
        rubric: ['Capacity Metrics app evidence (CU, overage, throttling)', 'Identify top consumers + overlap with peak', 'Reschedule/optimize heavy jobs', 'Scale or isolate capacity', 'Recognize shared-capacity contention signature'],
        followUps: ['How does smoothing/throttling work in Fabric?', 'When do you split workloads across capacities?', 'How do you protect an SLA-critical workload?'] },
      { q: 'Explain Direct Lake and how you keep a large semantic model on the fast path.', level: 'senior', tags: ['architecture'],
        a: 'Direct Lake reads Delta from OneLake directly into memory on demand — import-like speed without scheduled import or per-query DirectQuery. It falls back to DirectQuery (slower) if the model exceeds the SKU’s Direct Lake guardrails or hits unsupported features. Keep it fast by staying within guardrails: fewer/narrower columns, pre-aggregated Gold tables, OPTIMIZE the Delta tables (fewer, larger files), and a right-sized capacity. Reframing picks up new Delta versions so reports stay fresh.',
        rubric: ['Direct Lake = in-memory read of Delta, no import/DirectQuery', 'Fallback conditions (guardrails/SKU/unsupported)', 'Model slimming + pre-aggregation', 'Delta file optimization', 'Framing/freshness + capacity sizing'],
        followUps: ['What triggers DirectQuery fallback exactly?', 'How does Delta file layout affect Direct Lake?', 'How does framing keep data current?'] },
      { q: 'How do you set up governance and safe dev→prod promotion for a Fabric workspace?', level: 'senior', tags: ['security', 'architecture'],
        a: 'Govern with workspace roles (Admin/Member/Contributor/Viewer), item sharing, and data-level security (RLS/CLS in the model/warehouse, OneLake security); use lineage and Purview sensitivity labels for classification and audit. Promote with deployment pipelines (dev/test/prod) plus deployment/data-source rules so each stage binds to its own Lakehouse/connection, and connect items to Git for versioned, reviewed changes. Never hand-edit prod — it drifts from source control and gets overwritten.',
        rubric: ['Workspace roles + item security + RLS/CLS', 'Lineage + sensitivity labels (Purview)', 'Deployment pipelines + data-source rules per stage', 'Git integration for versioned/reviewed changes', 'No manual prod edits'],
        followUps: ['How do deployment rules handle environment bindings?', 'How does a shortcut’s access model affect governance?', 'How do you answer "what feeds this report" for an auditor?'] },
    ],
  });

  TV.FabricInterviewQA = TOPICS;
})();
