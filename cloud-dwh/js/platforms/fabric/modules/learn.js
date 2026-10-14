/* ============================================================
   Fabric — Learn / Fundamentals (authentic, Microsoft-Learn aligned)
   home · intro · onelake · warehouse-vs-lakehouse · polaris-engine ·
   delta-storage · sql-endpoint
   Netflix workload used illustratively (Netflix is not a Fabric customer).
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit; // platform-agnostic kit
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  const B = (viz.P.fabric.Modules = viz.P.fabric.Modules || {});

  B.home = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = document.createElement('div'); page.className = 'mod-page';
      page.innerHTML = `
        <div class="rk-hero">
          <div class="home-hero-badge">Microsoft Fabric · Data Warehouse</div>
          <h1>A unified analytics platform on <span class="acc">Microsoft Fabric</span></h1>
          <p>A guided, interactive tour of the Fabric Data Warehouse — OneLake, Warehouse vs Lakehouse, the distributed T-SQL engine, Delta-native storage, Direct Lake, capacities, shortcuts and mirroring — illustrated with a Netflix-style analytics workload.</p>
          <div class="stub-note">Illustrative: the Netflix workload is a teaching scenario. Netflix is not a Microsoft Fabric customer; the architecture lessons are real.</div>
          <div class="rk-stats">
            <div class="rk-stat"><div class="rk-stat-num">OneLake</div><div class="rk-stat-label">One logical lake</div></div>
            <div class="rk-stat"><div class="rk-stat-num">Delta</div><div class="rk-stat-label">Native format</div></div>
            <div class="rk-stat"><div class="rk-stat-num">Direct Lake</div><div class="rk-stat-label">BI, no import</div></div>
            <div class="rk-stat"><div class="rk-stat-num">F-SKU</div><div class="rk-stat-label">Capacity units</div></div>
          </div>
        </div>
        <div class="rk-takeaways" style="max-width:820px;margin:1.75rem auto 0;">
          <div class="rk-takeaways-title">What you'll learn</div>
          <ul>
            <li><strong>Fundamentals</strong> — OneLake, Warehouse vs Lakehouse, the distributed engine, Delta storage, SQL analytics endpoint</li>
            <li><strong>Internals</strong> — Direct Lake, capacities &amp; F-SKUs, shortcuts, mirroring, cross-database queries, semantic models</li>
            <li><strong>Platform &amp; governance</strong> — workspaces/domains, Data Factory, Dataflows Gen2, Git &amp; deployment, Copilot, RLS/CLS/masking, Purview</li>
          </ul>
        </div>`;
      canvas.appendChild(page);
      return { destroy() {} };
    },
  };

  const SPECS = {
    intro: {
      eyebrow: 'Introduction', title: 'Why Microsoft Fabric?',
      subtitle: 'Fabric is a unified SaaS analytics platform where every workload writes to one lake (OneLake) in open Delta format. Press Play to see what that unifies.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview',
      stage: { caption: 'One platform, one copy of data',
        groups: [
          { id: 'before', label: 'Before — stitched tools', nodes: [{ id: 'adf', label: 'Separate ETL' }, { id: 'adls', label: 'Separate lake' }, { id: 'syn', label: 'Separate DW' }, { id: 'pbi', label: 'Separate BI' }], connectorAfter: 'copies & connectors everywhere' },
          { id: 'fabric', label: 'Fabric — unified SaaS', sub: 'all on OneLake', nodes: [{ id: 'df', label: 'Data Factory' }, { id: 'lh', label: 'Lakehouse' }, { id: 'wh', label: 'Warehouse' }, { id: 'bi', label: 'Power BI' }], connectorAfter: 'one copy · Delta' },
          { id: 'lake', label: 'OneLake', sub: 'single logical lake', nodes: [{ id: 'delta', label: 'Delta tables' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'Stitched-together stacks', on: { spot: ['before'], flow: ['adf', 'adls', 'syn', 'pbi'] },
          body: 'Traditional analytics bolts together separate ETL, lake, warehouse, and BI products — each with its own copy of data and connectors to maintain.',
          facts: ['Multiple copies drift and cost storage', 'Integration glue is brittle'] },
        { label: 'Unified', title: 'Fabric unifies the workloads', on: { spot: ['fabric'], flow: ['df', 'lh', 'wh', 'bi'] },
          body: 'Fabric is one SaaS product with all workloads — Data Factory, Data Engineering (Lakehouse), Data Warehouse, and Power BI — on a single foundation.',
          facts: ['One product, one bill, one security model', 'No servers to provision — fully SaaS'] },
        { label: 'OneLake', title: 'One copy of data in OneLake', on: { spot: ['lake'], conn: ['fabric'], flow: ['delta'] },
          body: 'Every workload reads and writes the <strong>same</strong> data in OneLake, stored in open <strong>Delta Lake</strong> format — no copying between engines.',
          facts: ['OneLake = one logical lake for the whole tenant', 'Open Delta/Parquet — not a proprietary silo', 'Warehouse and Lakehouse share the same storage'] },
      ],
      takeaways: [
        'Fabric is a unified SaaS analytics platform — ETL, lake, warehouse, BI in one',
        'All workloads use one copy of data in OneLake, in open Delta format',
        'No infrastructure to manage; billing is by capacity (CUs)',
      ],
    },

    onelake: {
      eyebrow: 'Fundamentals', title: 'OneLake',
      subtitle: 'OneLake is a single, tenant-wide logical data lake — "OneDrive for data" — built on ADLS Gen2 and storing everything as Delta/Parquet. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview',
      stage: { caption: 'One lake for the whole tenant',
        groups: [
          { id: 'tenant', label: 'Tenant', sub: 'exactly one OneLake', nodes: [{ id: 'ol', label: 'OneLake', sub: 'built on ADLS Gen2' }], connectorAfter: 'contains' },
          { id: 'ws', label: 'Workspaces', nodes: [{ id: 'w1', label: 'Analytics WS' }, { id: 'w2', label: 'Finance WS' }], connectorAfter: 'contain items' },
          { id: 'items', label: 'Items', sub: 'all write Delta to OneLake', nodes: [{ id: 'lh', label: 'Lakehouse' }, { id: 'wh', label: 'Warehouse' }, { id: 'sm', label: 'Semantic model' }] },
        ] },
      steps: [
        { label: 'One', title: 'One lake per tenant', on: { spot: ['tenant'], flow: ['ol'] },
          body: 'Every Fabric tenant gets exactly one OneLake automatically — no provisioning. Think "OneDrive for data": a single namespace for all analytics data.',
          facts: ['One OneLake per tenant, created automatically', 'Built on Azure Data Lake Storage Gen2', 'Hierarchical: workspaces → items → files/tables'] },
        { label: 'Open', title: 'Open Delta/Parquet format', on: { spot: ['items'], conn: ['ws'], flow: ['lh', 'wh', 'sm'] },
          body: 'Every item (Lakehouse, Warehouse, semantic model) stores its tables as <strong>Delta Lake</strong> (Parquet) in OneLake — so all engines read the same open files.',
          facts: ['Tabular data stored as Delta tables', 'All compute engines share one copy', 'No proprietary lock-in'] },
        { label: 'Access', title: 'One namespace, many engines', on: { spot: ['ol', 'items'] },
          body: 'Because it is one lake, Spark, T-SQL, KQL, and Power BI all access the same data without copying — and external tools can reach it via ADLS/OneLake APIs.',
          facts: ['Spark, T-SQL, KQL, Power BI over one copy', 'Reachable via ADLS Gen2 APIs & OneLake file explorer', 'Shortcuts bring external data in without copying'] },
      ],
      takeaways: [
        'OneLake = one automatic, tenant-wide logical lake on ADLS Gen2',
        'Everything is stored as open Delta/Parquet — one copy, all engines',
        'Workspaces organize items; shortcuts pull external data in without copies',
      ],
    },

    'warehouseVsLakehouse': {
      eyebrow: 'Fundamentals', title: 'Warehouse vs Lakehouse',
      subtitle: 'Both store Delta tables in OneLake and share a SQL engine — they differ mainly in development style, data types, and transactions. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/decision-guide-lakehouse-warehouse',
      stage: { caption: 'Same storage, different front doors',
        groups: [
          { id: 'lake', label: 'Lakehouse', sub: 'Spark-first', nodes: [{ id: 'spark', label: 'Apache Spark' }, { id: 'notebook', label: 'Notebooks' }, { id: 'unstruct', label: 'Structured + unstructured' }, { id: 'ep', label: 'Read-only SQL endpoint' }] },
          { id: 'wh', label: 'Warehouse', sub: 'T-SQL-first', nodes: [{ id: 'tsql', label: 'Full T-SQL (read/write)' }, { id: 'txn', label: 'Multi-table transactions' }, { id: 'struct', label: 'Structured data' }] },
          { id: 'store', label: 'Shared storage', sub: 'OneLake · Delta', nodes: [{ id: 'delta', label: 'Delta tables' }] },
        ] },
      steps: [
        { label: 'Shared', title: 'Both sit on the same Delta storage', on: { spot: ['store'], flow: ['delta'] },
          body: 'Warehouse and Lakehouse both store data as <strong>Delta tables in OneLake</strong> and share the same SQL engine — the choice is about how you work, not where data lives.',
          facts: ['Same Delta storage in OneLake', 'Same underlying SQL engine', 'You can use both together'] },
        { label: 'Lakehouse', title: 'Lakehouse — Spark & all data', on: { spot: ['lake'], flow: ['spark', 'notebook', 'unstruct', 'ep'] },
          body: 'The <strong>Lakehouse</strong> is Spark-first: notebooks, structured <em>and</em> unstructured data, and an auto-generated <strong>read-only SQL analytics endpoint</strong>.',
          facts: ['Primary tool: Apache Spark + notebooks', 'Handles structured and unstructured data', 'SQL analytics endpoint is read-only'] },
        { label: 'Warehouse', title: 'Warehouse — full T-SQL', on: { spot: ['wh'], flow: ['tsql', 'txn', 'struct'] },
          body: 'The <strong>Warehouse</strong> is T-SQL-first with full read/write and <strong>multi-table transactions</strong> — the familiar data-warehouse experience over the same lake.',
          facts: ['Full T-SQL, read and write', 'Multi-table transactions (Lakehouse endpoint is read-only)', 'Best for structured, SQL-centric teams'] },
      ],
      takeaways: [
        'Both store Delta in OneLake and share the SQL engine',
        'Lakehouse = Spark-first, all data types, read-only SQL endpoint',
        'Warehouse = full T-SQL read/write with multi-table transactions',
      ],
    },

    'polarisEngine': {
      eyebrow: 'Fundamentals', title: 'The Distributed Query Engine',
      subtitle: "Fabric Warehouse runs on a distributed, cloud-native query engine (the Polaris lineage from Synapse) that separates compute from storage and scales transparently. Press Play.",
      doc: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing',
      stage: { caption: 'Distributed T-SQL over OneLake',
        groups: [
          { id: 'sql', label: 'T-SQL query', nodes: [{ id: 'q', label: 'SELECT / INSERT ...' }], connectorAfter: 'distributed plan' },
          { id: 'engine', label: 'Distributed engine', sub: 'compute separated from state', nodes: [{ id: 'dist', label: 'Query distribution' }, { id: 'pool', label: 'Elastic compute' }, { id: 'txn', label: 'Transaction mgr' }], connectorAfter: 'reads/writes' },
          { id: 'store', label: 'OneLake (Delta)', nodes: [{ id: 'delta', label: 'Delta tables' }] },
        ] },
      steps: [
        { label: 'Separation', title: 'Compute separated from storage', on: { spot: ['engine', 'store'], flow: ['pool'] },
          body: 'The engine separates compute from the data (in OneLake) and from transaction state, so compute can scale independently and transparently.',
          facts: ['Compute is decoupled from Delta storage', 'No cluster sizing — scales automatically with capacity'] },
        { label: 'Distribute', title: 'Queries run distributed', on: { spot: ['engine'], conn: ['sql'], flow: ['dist'] },
          body: 'A T-SQL query is parsed and distributed across elastic compute that reads the Delta files in parallel — the classic MPP idea, serverless.',
          facts: ['MPP-style parallel execution', 'Reads open Delta/Parquet directly', 'No data movement into a proprietary store'] },
        { label: 'Transactions', title: 'Full transactions on the lake', on: { spot: ['engine'], flow: ['txn'] },
          body: 'Unlike a read-only endpoint, the Warehouse engine supports <strong>multi-table ACID transactions</strong> written back as Delta.',
          facts: ['Multi-table ACID transactions', 'Commits land as Delta in OneLake', 'Scales with the capacity (CUs), not fixed nodes'] },
      ],
      takeaways: [
        'Fabric Warehouse uses a distributed, serverless T-SQL engine (Polaris lineage)',
        'Compute is separated from OneLake storage and transaction state',
        'MPP-style parallelism with full multi-table ACID transactions on Delta',
      ],
    },

    'deltaStorage': {
      eyebrow: 'Fundamentals', title: 'Delta-Native Storage & V-Order',
      subtitle: 'Fabric stores all tabular data as Delta Lake (Parquet + a transaction log), and applies V-Order to optimize files for fast reads. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/delta-lake-interoperability',
      stage: { caption: 'Open Delta tables, optimized for reads',
        groups: [
          { id: 'delta', label: 'Delta table', nodes: [{ id: 'parquet', label: 'Parquet data files' }, { id: 'log', label: '_delta_log', sub: 'transactions' }], connectorAfter: 'V-Order + optimize' },
          { id: 'opt', label: 'Write optimizations', nodes: [{ id: 'vorder', label: 'V-Order' }, { id: 'compact', label: 'File compaction' }] },
          { id: 'read', label: 'Any engine', nodes: [{ id: 'spark', label: 'Spark' }, { id: 'tsql', label: 'T-SQL' }, { id: 'dl', label: 'Direct Lake' }] },
        ] },
      steps: [
        { label: 'Delta', title: 'Everything is a Delta table', on: { spot: ['delta'], flow: ['parquet', 'log'] },
          body: 'A Delta table is columnar <strong>Parquet</strong> files plus a transaction log (<code>_delta_log</code>) that gives ACID, time travel, and schema enforcement.',
          facts: ['Parquet data + _delta_log transaction log', 'ACID, time travel, schema enforcement', 'Open format — read by any Delta-aware engine'] },
        { label: 'V-Order', title: 'V-Order speeds reads', on: { spot: ['opt'], conn: ['delta'], flow: ['vorder', 'compact'] },
          body: '<strong>V-Order</strong> is a Fabric write-time optimization (sorting/encoding within Parquet) that makes files much faster to read — especially for Power BI / Direct Lake.',
          facts: ['V-Order: write-time Parquet optimization', 'Big read speedups for BI workloads', 'Compaction keeps file counts healthy'] },
        { label: 'Interop', title: 'One format, every engine', on: { spot: ['read'], conn: ['opt'], flow: ['spark', 'tsql', 'dl'] },
          body: 'Because it is open Delta, Spark, T-SQL, and Direct Lake all read the same files — no conversions, no duplicate copies.',
          facts: ['Spark + T-SQL + Direct Lake over one copy', 'V-Order stays compatible with the open Delta spec', 'External Delta readers work too'] },
      ],
      takeaways: [
        'All Fabric tabular data is open Delta Lake (Parquet + _delta_log)',
        'V-Order optimizes Parquet at write time for fast reads (great for BI)',
        'One open format read by Spark, T-SQL, and Direct Lake — no copies',
      ],
    },

    'sqlEndpoint': {
      eyebrow: 'Fundamentals', title: 'SQL Analytics Endpoint',
      subtitle: 'Every Lakehouse gets an automatically generated, read-only T-SQL endpoint over its Delta tables. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-sql-analytics-endpoint',
      stage: { caption: 'T-SQL on a Lakehouse — read-only',
        groups: [
          { id: 'lh', label: 'Lakehouse', sub: 'Spark writes Delta', nodes: [{ id: 'delta', label: 'Delta tables' }, { id: 'files', label: 'Files (parquet/csv)' }], connectorAfter: 'auto-generated' },
          { id: 'ep', label: 'SQL analytics endpoint', sub: 'read-only T-SQL', nodes: [{ id: 'query', label: 'SELECT / views' }, { id: 'sec', label: 'RLS/CLS/masking' }], connectorAfter: 'serves' },
          { id: 'bi', label: 'Consumers', nodes: [{ id: 'pbi', label: 'Power BI / tools' }] },
        ] },
      steps: [
        { label: 'Auto', title: 'Generated automatically', on: { spot: ['lh', 'ep'], conn: ['lh'] },
          body: 'Create a Lakehouse and Fabric automatically provisions a <strong>SQL analytics endpoint</strong> — a T-SQL front door over its Delta tables.',
          facts: ['Auto-provisioned with the Lakehouse', 'Only Delta tables appear (not raw parquet/csv files)', 'Warehouses and SQL databases also expose an endpoint'] },
        { label: 'Read-only', title: 'Read-only T-SQL', on: { spot: ['ep'], flow: ['query'] },
          body: 'The endpoint supports <strong>read</strong> T-SQL (SELECT, views, functions) — not the full read/write surface of a Warehouse. Use it to query lake data with SQL.',
          facts: ['SELECT, views, functions — read-only', 'Not the full Warehouse T-SQL surface', 'For writes/transactions use a Warehouse'] },
        { label: 'Secure', title: 'Security + BI on top', on: { spot: ['ep', 'bi'], conn: ['ep'], flow: ['sec', 'pbi'] },
          body: 'Apply RLS/CLS/masking at the endpoint and connect Power BI and other tools — including via Direct Lake.',
          facts: ['RLS, CLS, and dynamic data masking apply here', 'Power BI connects (import, DirectQuery, or Direct Lake)'] },
      ],
      takeaways: [
        'Each Lakehouse auto-provisions a read-only T-SQL SQL analytics endpoint',
        'Only Delta tables are exposed; use a Warehouse for writes/transactions',
        'Apply RLS/CLS/masking at the endpoint and connect BI (incl. Direct Lake)',
      ],
    },
  };

  Kit.registerAll('fabric', SPECS);
})();
