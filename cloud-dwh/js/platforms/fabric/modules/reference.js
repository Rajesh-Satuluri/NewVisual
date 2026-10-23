/* ============================================================
   Fabric — Reference: glossary/cheat-sheet, comparison matrix,
   certification map (DP-600 / DP-700), and an E2E capstone.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  const B = (viz.P.fabric.Modules = viz.P.fabric.Modules || {});

  const GLOSSARY = [
    ['OneLake', 'One tenant-wide logical lake on ADLS Gen2; stores everything as Delta.'],
    ['Lakehouse', 'Spark-first item; structured + unstructured data; read-only SQL analytics endpoint.'],
    ['Warehouse', 'T-SQL item with full read/write and multi-table transactions over Delta.'],
    ['SQL analytics endpoint', 'Auto-generated, read-only T-SQL over a Lakehouse\'s Delta tables.'],
    ['Direct Lake', 'Power BI reads Delta in OneLake directly — import speed + DirectQuery freshness.'],
    ['V-Order', 'Write-time Parquet optimization that speeds reads (esp. Direct Lake).'],
    ['Capacity (F-SKU)', 'Purchased compute (F2…F2048) measured in Capacity Units, shared by all workloads.'],
    ['Capacity Unit (CU)', 'The shared compute currency; bursting + smoothing manage spikes.'],
    ['Shortcut', 'Virtualizes external data (S3/ADLS/GCS/OneLake) into OneLake without copying.'],
    ['Mirroring', 'Near-real-time Delta replica of an external DB (Snowflake/Cosmos/SQL) via CDC.'],
    ['Semantic model', 'BI layer (tables, relationships, DAX, RLS); often Direct Lake-bound.'],
    ['Domain', 'Grouping of workspaces for federated, business-aligned governance.'],
    ['Dataflow Gen2', 'Low-code Power Query transformation with a chosen destination.'],
    ['Medallion', 'Bronze (raw) → Silver (cleaned) → Gold (business-ready) Delta layers.'],
  ];
  const CHEATS = [
    ['Query a warehouse', 'SELECT country, SUM(minutes) FROM dbo.watch_events GROUP BY country;'],
    ['Cross-database join', 'SELECT * FROM sales_wh.dbo.sales s JOIN events_lakehouse.dbo.plays p ON p.id=s.id;'],
    ['Dedup (no QUALIFY)', 'SELECT * FROM (SELECT *, ROW_NUMBER() OVER(PARTITION BY id ORDER BY ts DESC) rn FROM t) WHERE rn=1;'],
    ['Idempotent upsert', 'MERGE tgt USING src ON tgt.id=src.id WHEN MATCHED ... WHEN NOT MATCHED ...;'],
    ['Row-level security', 'CREATE SECURITY POLICY ... ADD FILTER PREDICATE ... ON dbo.t;'],
    ['Dynamic data masking', 'ALTER TABLE t ALTER COLUMN email ADD MASKED WITH (FUNCTION = \'email()\');'],
  ];
  B.reference = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">📚 Reference</div>' +
      '<h1 class="mod-title">Glossary &amp; Cheat Sheet</h1>' +
      '<p class="mod-subtitle">Quick reference for the core Fabric terms and the commands you reach for most.</p></div>' +
      '<div class="section-title">Glossary</div>' +
      '<div class="rk-ref-grid">' + GLOSSARY.map(([t, d]) =>
        '<div class="rk-ref-item"><div class="rk-ref-term">' + t + '</div><div class="rk-ref-def">' + d + '</div></div>').join('') + '</div>' +
      '<div class="section-title" style="margin-top:2rem;">Cheat sheet</div>' +
      '<div class="rk-ref-cheats">' + CHEATS.map(([t, c]) =>
        '<div class="rk-cheat"><div class="rk-cheat-label">' + t + '</div><pre class="rk-cheat-code"><code>' +
        c.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code></pre></div>').join('') + '</div>';
    canvas.appendChild(page);
    return { destroy() {} };
  }};

  const COLS = ['Dimension', 'Microsoft Fabric', 'Snowflake', 'Amazon Redshift', 'Google BigQuery'];
  const ROWS = [
    ['Model', 'SaaS / OneLake', 'Multi-cluster shared data', 'Provisioned MPP + Serverless', 'Serverless (Dremel)'],
    ['Storage', 'Delta (Parquet) in OneLake', 'Micro-partitions', 'Columnar 1 MB blocks (RA3/RMS)', 'Capacitor columnar'],
    ['Compute', 'Capacity (CUs), shared', 'Virtual warehouses (credits)', 'RA3 nodes / RPUs', 'Slots (autoscale)'],
    ['BI integration', 'Direct Lake (native)', 'Connectors', 'Connectors', 'Connectors'],
    ['Query the lake', 'Shortcuts (no copy)', 'External tables', 'Spectrum (S3)', 'BigLake / external'],
    ['Replicate sources', 'Mirroring (CDC)', 'Connectors/Streams', 'Federated query', 'Datastream/external'],
    ['Governance', 'Purview + RLS/CLS/DDM', 'RBAC + masking/policies', 'IAM/RBAC + Lake Formation', 'IAM + policy tags'],
    ['Open format', 'Delta Lake (open)', 'Proprietary + Iceberg', 'Proprietary + Spectrum', 'Proprietary + BigLake'],
    ['Best fit', 'Microsoft/Power BI shops', 'Cross-cloud, concurrency', 'AWS-centric analytics', 'GCP, pay-per-scan'],
  ];
  B.comparison = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">🔬 Reference</div>' +
      '<h1 class="mod-title">Fabric vs the Field</h1>' +
      '<p class="mod-subtitle">How Microsoft Fabric compares with Snowflake, Redshift, and BigQuery across the dimensions that matter in interviews and design reviews.</p></div>' +
      '<div class="rk-table-wrap"><table class="rk-table"><thead><tr>' +
      COLS.map((c, i) => '<th' + (i === 1 ? ' class="rk-th-accent"' : '') + '>' + c + '</th>').join('') +
      '</tr></thead><tbody>' +
      ROWS.map(r => '<tr>' + r.map((c, i) =>
        (i === 0 ? '<td class="rk-td-dim">' + c + '</td>' : '<td' + (i === 1 ? ' class="rk-td-accent"' : '') + '>' + c + '</td>')).join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      '<div class="rk-takeaways" style="margin-top:1.5rem;"><div class="rk-takeaways-title">How to pick</div><ul>' +
      '<li><strong>Fabric</strong> — one SaaS lake (OneLake), native Direct Lake BI; ideal for Microsoft/Power BI shops.</li>' +
      '<li><strong>Snowflake</strong> — cross-cloud, effortless multi-cluster concurrency and sharing.</li>' +
      '<li><strong>Redshift</strong> — deep AWS integration (S3, Glue, SageMaker).</li>' +
      '<li><strong>BigQuery</strong> — fully serverless, pay-per-scan, strong on GCP.</li>' +
      '</ul></div>';
    canvas.appendChild(page);
    return { destroy() {} };
  }};

  const CERT = [
    ['Ingest & store (OneLake, Delta)', ['onelake', 'delta-storage', 'shortcuts', 'mirroring'], 'OneLake, Delta storage, shortcuts, mirroring'],
    ['Model & query', ['warehouse-vs-lakehouse', 'sql-endpoint', 'cross-db-queries', 'polaris-engine'], 'Warehouse vs Lakehouse, SQL endpoint, cross-DB queries, the engine'],
    ['Serve BI (Direct Lake)', ['directlake', 'semantic-models', 'capacities'], 'Direct Lake, semantic models, capacities & F-SKUs'],
    ['Orchestrate (Data Factory)', ['data-factory', 'dataflows-gen2', 'git-deployment'], 'Pipelines, Dataflows Gen2, Git & deployment pipelines'],
    ['Secure & govern', ['rls-cls-masking', 'purview', 'workspaces-domains', 'medallion'], 'RLS/CLS/masking, Purview, workspaces/domains, medallion'],
  ];
  B.certification = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">🎓 Reference</div>' +
      '<h1 class="mod-title">Fabric Certification Map</h1>' +
      '<p class="mod-subtitle">Fabric is covered by <strong>DP-600 (Fabric Analytics Engineer)</strong> and <strong>DP-700 (Fabric Data Engineer)</strong>. Map each study area to the modules in this tool.</p></div>' +
      CERT.map(([area, ids, blurb]) =>
        '<div class="home-module-group"><div class="home-module-group-title">' + area + '</div>' +
        '<p class="home-wh-purpose">' + blurb + '</p>' +
        '<div class="rk-chiprow">' + ids.map(id =>
          '<button class="rk-chip" data-go="' + id + '">' + id + '</button>').join('') + '</div></div>').join('');
    canvas.appendChild(page);
    page.querySelectorAll('.rk-chip').forEach(b => b.addEventListener('click', () => viz.navigate && viz.navigate(b.dataset.go)));
    return { destroy() {} };
  }};

  B.e2eFlow = (Kit ? Kit.makeModule({
    eyebrow: '🎯 Reference', title: 'End-to-End Capstone Flow',
    subtitle: 'Follow a Netflix-style request from raw events to a fast, governed dashboard on Fabric, touching every layer you\'ve learned. Press Play. (Illustrative.)',
    stage: { caption: 'Raw events → governed insight',
      groups: [
        { id: 'ingest', label: '1 · Ingest', nodes: [{ id: 'pipe', label: 'Pipelines' }, { id: 'sc', label: 'Shortcut (S3)' }, { id: 'mir', label: 'Mirror (op DB)' }], connectorAfter: 'land' },
        { id: 'model', label: '2 · Medallion', nodes: [{ id: 'bronze', label: 'Bronze' }, { id: 'silver', label: 'Silver' }, { id: 'gold', label: 'Gold' }], connectorAfter: 'serve' },
        { id: 'serve', label: '3 · Serve', nodes: [{ id: 'sm', label: 'Semantic model' }, { id: 'dl', label: 'Direct Lake' }], connectorAfter: 'govern' },
        { id: 'govern', label: '4 · Govern & ship', nodes: [{ id: 'sec', label: 'RLS/CLS/DDM' }, { id: 'pur', label: 'Purview' }, { id: 'git', label: 'Git + deploy' }] },
      ] },
    steps: [
      { label: 'Ingest', title: 'Land the data (no over-copying)', on: { spot: ['ingest'], flow: ['pipe', 'sc', 'mir'] },
        body: 'Pipelines ingest streams/batches into Bronze; shortcut existing S3 data (no copy); mirror the operational DB as near-real-time Delta.',
        facts: ['Pipelines for ingest/orchestration', 'Shortcuts reference external data', 'Mirroring replicates operational DBs via CDC'] },
      { label: 'Medallion', title: 'Refine Bronze → Silver → Gold', on: { spot: ['model'], flow: ['bronze', 'silver', 'gold'] },
        body: 'Transform with notebooks/Dataflows Gen2 into cleaned Silver and business-ready Gold marts — all Delta in OneLake.',
        facts: ['Progressive refinement, one copy', 'Gold = curated star schemas', 'V-Order/compact for fast reads'] },
      { label: 'Serve', title: 'Fast, fresh BI', on: { spot: ['serve'], flow: ['sm', 'dl'] },
        body: 'Build a semantic model on Gold bound via Direct Lake — import speed, DirectQuery freshness, no copy — sized to stay within capacity guardrails.',
        facts: ['Direct Lake semantic model', 'No refresh, no duplication', 'Watch SKU guardrails'] },
      { label: 'Govern', title: 'Govern & ship', on: { spot: ['govern'], flow: ['sec', 'pur', 'git'] },
        body: 'Secure with RLS/CLS/masking, govern with Purview (catalog/lineage/labels), organize under a domain, and ship with Git + deployment pipelines.',
        facts: ['RLS/CLS/DDM on sensitive data', 'Purview catalog + lineage + labels', 'Git + Dev→Test→Prod deployment'] },
    ],
    takeaways: [
      'One request exercises ingest → medallion → Direct Lake serve → govern end to end',
      'Prefer no-copy ingestion (shortcuts/mirroring); refine via medallion in OneLake',
      'Serve with Direct Lake; secure with RLS/CLS/DDM + Purview; ship with Git + deployment pipelines',
    ],
  }) : { render(c) { c.innerHTML = '<div class="placeholder-msg"><p>Kit unavailable.</p></div>'; return { destroy() {} }; } });
})();
