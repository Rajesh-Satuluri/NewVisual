/* ============================================================
   Fabric — New topic pages (P2-4): Spark & notebooks, capacity &
   throttling deep-dive, warehouse ingestion + maintenance,
   permission matrix, Real-Time Intelligence. Shared RedshiftKit.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;
  if (!Kit) return;

  const SPECS = {

    /* ── spark-notebooks ──────────────────────────────────────── */
    sparkNotebooks: {
      id: 'spark-notebooks',
      eyebrow: 'Platform & Orchestration',
      title: 'Spark & Notebooks',
      subtitle: 'Fabric data engineering runs Apache Spark over OneLake. Notebooks (PySpark/Spark SQL/Scala/R) read and write Delta tables, with starter pools for fast session startup. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-engineering/spark-compute',
      stage: { caption: 'Notebook → Spark pool → Delta in OneLake',
        groups: [
          { id: 'nb', label: 'Notebook', sub: 'PySpark / Spark SQL / Scala / R', nodes: [{ id: 'code', label: 'Transform code' }], connectorAfter: 'runs on' },
          { id: 'pool', label: 'Spark pool', sub: 'starter pool (fast start) or custom', nodes: [{ id: 'exec', label: 'Executors' }], connectorAfter: 'reads/writes' },
          { id: 'lake', label: 'OneLake', sub: 'Delta tables', nodes: [{ id: 'bronze', label: 'Bronze' }, { id: 'silver', label: 'Silver' }, { id: 'gold', label: 'Gold' }] },
        ] },
      steps: [
        { label: 'Author', title: 'Write transforms in a notebook', on: { spot: ['nb'], flow: ['code'] },
          body: 'Data engineers use notebooks (PySpark, Spark SQL, Scala, R) in a Lakehouse to clean and shape data — the heavy-lifting complement to low-code dataflows.',
          facts: ['Multi-language cells', 'Great for complex/large transforms', 'Attached to a Lakehouse'] },
        { label: 'Run', title: 'Execute on a Spark pool', on: { spot: ['pool'], flow: ['exec'], conn: ['nb'] },
          body: 'Code runs on a Spark pool. Starter pools give near-instant session startup; custom pools let you size executors. Compute draws on the capacity\'s CUs.',
          facts: ['Starter pools = fast start', 'Custom pools for sizing', 'Consumes capacity CUs'] },
        { label: 'Persist', title: 'Write Delta to OneLake', on: { spot: ['lake'], flow: ['bronze', 'silver', 'gold'], conn: ['pool'] },
          body: 'Results are written as Delta tables in OneLake (e.g. Bronze→Silver→Gold), instantly queryable by T-SQL endpoint and Direct Lake — one copy, every engine.',
          facts: ['Writes open Delta', 'Shared with SQL + Power BI', 'No export/copy'] },
      ],
      code: { lang: 'python', title: 'Notebook: Silver transform', src:
        "df = spark.read.format('delta').load('Tables/bronze_orders')\nclean = (df.dropDuplicates(['order_id'])\n           .filter('amount > 0')\n           .withColumn('order_date', to_date('order_ts')))\nclean.write.format('delta').mode('overwrite').saveAsTable('silver_orders')" },
      takeaways: [
        'Fabric notebooks run Spark (PySpark/Spark SQL/Scala/R) over OneLake for heavy data engineering.',
        'Starter pools give fast session startup; custom pools size executors — both consume the capacity\'s CUs.',
        'Notebook output is Delta in OneLake, instantly available to the SQL endpoint and Direct Lake.',
      ],
    },

    /* ── capacity-throttling ──────────────────────────────────── */
    capacityThrottling: {
      id: 'capacity-throttling',
      eyebrow: 'Learn — Internals & Data',
      title: 'Capacity & Throttling Deep-Dive',
      subtitle: 'Fabric smooths consumption over time and bursts for spikes — but sustained overload throttles. Understanding smoothing windows and the Capacity Metrics app is how you avoid surprise slowdowns. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/enterprise/throttling',
      stage: { caption: 'Usage → smoothing → burst/throttle decision',
        groups: [
          { id: 'use', label: 'Workload demand', sub: 'queries · Spark · refresh', nodes: [{ id: 'spike', label: 'Spikes + baseline' }], connectorAfter: 'smoothed over time' },
          { id: 'smooth', label: 'Smoothing + bursting', sub: 'averaged; future capacity borrowed', nodes: [{ id: 'win', label: 'Smoothing window' }], connectorAfter: 'if sustained over 100%' },
          { id: 'throttle', label: 'Throttling stages', nodes: [{ id: 'delay', label: 'Interactive delay' }, { id: 'reject', label: 'Reject requests' }] },
        ] },
      steps: [
        { label: 'Demand', title: 'Mixed, spiky consumption', on: { spot: ['use'], flow: ['spike'] },
          body: 'All workloads (warehouse queries, Spark jobs, pipeline runs, Power BI refreshes) draw on one capacity\'s CUs, so demand is bursty.',
          facts: ['One shared capacity', 'Bursty, mixed workloads', 'Measured in CUs'] },
        { label: 'Smoothing', title: 'Spread cost, burst for spikes', on: { spot: ['smooth'], flow: ['win'], conn: ['use'] },
          body: 'Fabric bursts to absorb short spikes and smooths consumption over a window, effectively borrowing against future capacity so occasional peaks don\'t immediately throttle.',
          facts: ['Bursting absorbs spikes', 'Smoothing averages over time', 'Interactive vs background differ'] },
        { label: 'Throttle', title: 'Sustained overload throttles', on: { spot: ['throttle'], flow: ['delay', 'reject'], conn: ['smooth'] },
          body: 'If you stay over 100% too long, throttling kicks in progressively: first interactive delays, then rejection of requests. Diagnose with the Capacity Metrics app and scale, schedule, or optimize the offenders.',
          facts: ['Delay → then reject', 'Capacity Metrics app to diagnose', 'Scale / isolate / optimize'] },
      ],
      takeaways: [
        'One capacity is shared by all Fabric workloads; consumption is smoothed over time and bursts for spikes.',
        'Sustained over-consumption throttles progressively — interactive delays first, then request rejection.',
        'Use the Microsoft Fabric Capacity Metrics app to find heavy items, then scale the F-SKU, isolate workloads, or optimize them.',
      ],
    },

    /* ── warehouse-ingestion ──────────────────────────────────── */
    warehouseIngestion: {
      id: 'warehouse-ingestion',
      eyebrow: 'Learn — Internals & Data',
      title: 'Warehouse Ingestion & Maintenance',
      subtitle: 'Load the Fabric Warehouse with COPY INTO (bulk from files) or CTAS/INSERT, and keep Delta healthy with OPTIMIZE and VACUUM. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/ingest-data',
      stage: { caption: 'Files → COPY INTO / CTAS → Delta → maintain',
        groups: [
          { id: 'src', label: 'Source files', sub: 'Parquet / CSV in OneLake or ADLS', nodes: [{ id: 'files', label: 'Staged files' }], connectorAfter: 'bulk load' },
          { id: 'load', label: 'Load into Warehouse', sub: 'COPY INTO · CTAS · INSERT', nodes: [{ id: 'copy', label: 'COPY INTO' }, { id: 'ctas', label: 'CREATE TABLE AS' }], connectorAfter: 'stored as' },
          { id: 'maint', label: 'Delta tables + maintenance', nodes: [{ id: 'tbl', label: 'Delta tables' }, { id: 'opt', label: 'OPTIMIZE / VACUUM' }] },
        ] },
      steps: [
        { label: 'Stage', title: 'Point at source files', on: { spot: ['src'], flow: ['files'] },
          body: 'Bulk ingestion reads Parquet or CSV staged in OneLake or ADLS. Parquet is preferred — typed, columnar, and faster to load.',
          facts: ['Parquet or CSV', 'In OneLake or ADLS', 'Parquet loads fastest'] },
        { label: 'Load', title: 'COPY INTO or CTAS', on: { spot: ['load'], flow: ['copy', 'ctas'], conn: ['src'] },
          body: 'COPY INTO bulk-loads files into a table; CREATE TABLE AS SELECT builds a table from a query; INSERT…SELECT appends. All write open Delta under the covers.',
          facts: ['COPY INTO = bulk from files', 'CTAS = from a query', 'INSERT…SELECT to append'] },
        { label: 'Maintain', title: 'Keep Delta healthy', on: { spot: ['maint'], flow: ['tbl', 'opt'], conn: ['load'] },
          body: 'Over time many small files slow reads. OPTIMIZE compacts them (with V-Order); VACUUM removes files no longer referenced by the Delta log, reclaiming storage within the retention window.',
          facts: ['OPTIMIZE compacts small files', 'VACUUM reclaims old files', 'V-Order for fast reads/BI'] },
      ],
      code: { lang: 'sql', title: 'COPY INTO + CTAS', src:
        "-- bulk load Parquet from a OneLake/ADLS path\nCOPY INTO dbo.orders\nFROM 'https://onelake.../Files/orders/*.parquet'\nWITH (FILE_TYPE = 'PARQUET');\n\n-- build a curated Gold table from a query\nCREATE TABLE dbo.sales_by_region AS\nSELECT region, SUM(amount) AS total\nFROM   dbo.orders GROUP BY region;" },
      takeaways: [
        'COPY INTO bulk-loads Parquet/CSV into the Warehouse; CTAS and INSERT…SELECT build/append from queries.',
        'Everything persists as open Delta in OneLake — instantly shared with the SQL endpoint and Direct Lake.',
        'Maintain Delta with OPTIMIZE (compact small files, V-Order) and VACUUM (remove unreferenced files) to keep reads fast.',
      ],
    },

    /* ── permission-matrix ────────────────────────────────────── */
    permissionMatrix: {
      id: 'permission-matrix',
      eyebrow: 'Security & Governance',
      title: 'Permission Model & Matrix',
      subtitle: 'Fabric access is layered: workspace roles, item permissions, OneLake data-access roles, and SQL object security (RLS/CLS/masking). Knowing which layer does what prevents over- or under-granting. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/security/permission-model',
      stage: { caption: 'Four layers from workspace down to columns',
        groups: [
          { id: 'ws', label: 'Workspace roles', sub: 'Admin · Member · Contributor · Viewer', nodes: [{ id: 'roles', label: 'Broad access' }], connectorAfter: 'then per-item' },
          { id: 'item', label: 'Item permissions', sub: 'share a specific item', nodes: [{ id: 'share', label: 'Read / ReadData / Build' }], connectorAfter: 'then data layer' },
          { id: 'data', label: 'SQL + OneLake security', sub: 'object-level + RLS/CLS/masking', nodes: [{ id: 'obj', label: 'GRANT on tables' }, { id: 'rls', label: 'RLS / CLS / masking' }] },
        ] },
      steps: [
        { label: 'Workspace', title: 'Start with workspace roles', on: { spot: ['ws'], flow: ['roles'] },
          body: 'Workspace roles grant broad access: Admin/Member/Contributor can build and edit; Viewer can consume. This is the coarsest layer — assign it carefully.',
          facts: ['Admin/Member/Contributor/Viewer', 'Broadest grant', 'Team-level access'] },
        { label: 'Item', title: 'Share individual items', on: { spot: ['item'], flow: ['share'], conn: ['ws'] },
          body: 'Beyond the workspace, you can share a specific item (a warehouse, semantic model, report) with granular permissions like Read, ReadData, or Build — without granting the whole workspace.',
          facts: ['Per-item sharing', 'Read / ReadData / Build', 'Least-privilege for one asset'] },
        { label: 'Data', title: 'Enforce at the data layer', on: { spot: ['data'], flow: ['obj', 'rls'], conn: ['item'] },
          body: 'Inside the warehouse/endpoint, T-SQL GRANT/DENY controls object access, and RLS/CLS/masking restrict rows/columns/values. OneLake data-access roles can also scope folder access. Layer these for true least-privilege.',
          facts: ['GRANT/DENY on objects', 'RLS/CLS/masking', 'OneLake data-access roles'] },
      ],
      takeaways: [
        'Fabric security is layered: workspace roles (broad) → item permissions (per-asset) → SQL object security + RLS/CLS/masking (fine-grained) → OneLake data-access roles.',
        'Prefer item-level sharing and data-layer controls over granting whole-workspace roles when only specific access is needed.',
        'Enforce sensitive-data rules at the data layer (warehouse/endpoint) so every consumer path is covered, not just reports.',
      ],
    },

    /* ── real-time-intelligence ───────────────────────────────── */
    realTimeIntelligence: {
      id: 'real-time-intelligence',
      eyebrow: 'Platform & Orchestration',
      title: 'Real-Time Intelligence',
      subtitle: 'Fabric Real-Time Intelligence ingests streaming/event data into an Eventhouse (KQL database), queried with KQL, with Eventstreams for routing and Activator for alerts. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/overview',
      stage: { caption: 'Events → Eventstream → Eventhouse (KQL) → act',
        groups: [
          { id: 'ev', label: 'Event sources', sub: 'Event Hubs · Kafka · IoT', nodes: [{ id: 'stream', label: 'High-velocity events' }], connectorAfter: 'route with Eventstream' },
          { id: 'house', label: 'Eventhouse', sub: 'KQL database, time-series optimized', nodes: [{ id: 'kql', label: 'Query with KQL' }], connectorAfter: 'visualize / alert' },
          { id: 'act', label: 'Act', nodes: [{ id: 'dash', label: 'Real-time dashboards' }, { id: 'activator', label: 'Activator alerts' }] },
        ] },
      steps: [
        { label: 'Ingest', title: 'Stream events in', on: { spot: ['ev'], flow: ['stream'] },
          body: 'Real-Time Intelligence ingests high-velocity data from Event Hubs, Kafka, IoT, and more. Eventstreams route and lightly transform events with no code.',
          facts: ['Event Hubs / Kafka / IoT', 'Eventstreams route events', 'Low/no-code ingestion'] },
        { label: 'Store & query', title: 'Land in an Eventhouse (KQL)', on: { spot: ['house'], flow: ['kql'], conn: ['ev'] },
          body: 'Events land in an Eventhouse — a KQL database optimized for time-series and log analytics. You query with KQL (Kusto Query Language) for fast analytics over huge event volumes. Data can also land in OneLake as Delta.',
          facts: ['Eventhouse = KQL database', 'KQL for time-series/logs', 'Also available as Delta in OneLake'] },
        { label: 'Act', title: 'Dashboards and alerts', on: { spot: ['act'], flow: ['dash', 'activator'], conn: ['house'] },
          body: 'Build real-time dashboards, and use Data Activator (Reflex) to watch for conditions and trigger alerts or actions automatically — closing the loop from event to response.',
          facts: ['Real-time dashboards', 'Activator = condition-based alerts', 'Event → insight → action'] },
      ],
      takeaways: [
        'Real-Time Intelligence ingests streaming/event data via Eventstreams into an Eventhouse (a KQL database) for time-series/log analytics.',
        'Query with KQL; data can also be made available as Delta in OneLake for the rest of Fabric.',
        'Close the loop with real-time dashboards and Data Activator alerts that trigger on conditions.',
      ],
    },

  };

  Kit.registerAll('fabric', SPECS);
})();
