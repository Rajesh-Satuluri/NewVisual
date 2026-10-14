/* ============================================================
   Compare — Snowflake vs Redshift vs Fabric, side by side.
   Same Netflix-style workload, three cloud warehouses.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});

  const P = {
    snowflake: { name: 'Snowflake', color: '#29b5e8' },
    redshift:  { name: 'Amazon Redshift', color: '#4da3e0' },
    fabric:    { name: 'Microsoft Fabric', color: '#13a884' },
  };

  // [dimension, snowflake, redshift, fabric]
  const ROWS = [
    ['Core model', 'Multi-cluster shared-data', 'Provisioned MPP + Serverless', 'Unified SaaS on OneLake'],
    ['Compute / storage', 'Fully separated', 'Separated on RA3 (RMS)', 'Separated (OneLake)'],
    ['Storage format', 'Micro-partitions (proprietary)', 'Columnar 1 MB blocks', 'Open Delta (Parquet)'],
    ['Data skipping', 'Partition metadata + clustering', 'Zone maps + sort keys', 'V-Order + statistics'],
    ['Compute unit', 'Virtual warehouse (credits)', 'RA3 nodes / RPUs', 'Capacity / CUs (F-SKU)'],
    ['Scaling', 'Resize + multi-cluster', 'Resize + concurrency scaling', 'Capacity autoscale (burst/smooth)'],
    ['Query the lake', 'External tables', 'Spectrum (S3)', 'Shortcuts (no copy)'],
    ['Replicate sources', 'Connectors / Streams', 'Federated query', 'Mirroring (CDC)'],
    ['BI integration', 'Connectors (BI tools)', 'Connectors (QuickSight…)', 'Direct Lake (native Power BI)'],
    ['In-database ML', 'Snowpark ML / Cortex', 'Redshift ML (SageMaker)', 'Fabric ML / Copilot'],
    ['Semi-structured', 'VARIANT', 'SUPER / PartiQL', 'Delta + Spark'],
    ['Governance', 'RBAC + masking/policies', 'IAM/RBAC + Lake Formation', 'Purview + RLS/CLS/DDM'],
    ['Sharing', 'Secure data sharing', 'Datashares', 'OneLake sharing'],
    ['Pricing', 'Per-second credits', 'Node-hours or RPU-seconds', 'Capacity (CUs) + storage'],
    ['Ecosystem fit', 'Cross-cloud (AWS/Azure/GCP)', 'AWS-native', 'Microsoft / Power BI'],
  ];

  const PICK = [
    ['snowflake', 'Choose Snowflake when', 'You need cross-cloud portability, effortless multi-cluster concurrency, and rich secure data sharing across orgs.'],
    ['redshift', 'Choose Redshift when', 'Your stack is AWS-native — tight S3, Glue, Lake Formation, and SageMaker integration, with Spectrum over the data lake.'],
    ['fabric', 'Choose Fabric when', "You're a Microsoft/Power BI shop wanting one SaaS lake (OneLake), open Delta, and native Direct Lake BI."],
  ];

  viz.Compare = viz.Compare || {};
  viz.Compare.render = function (canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';

    const head =
      '<div class="rk-hero" style="padding-bottom:1rem;">' +
      '<div class="home-hero-badge">⇄ Compare · same workload, three warehouses</div>' +
      '<h1><span style="color:' + P.snowflake.color + '">Snowflake</span> <span style="color:var(--text-muted)">vs</span> ' +
      '<span style="color:' + P.redshift.color + '">Redshift</span> <span style="color:var(--text-muted)">vs</span> ' +
      '<span style="color:' + P.fabric.color + '">Fabric</span></h1>' +
      '<p>How the three cloud data warehouses solve the same Netflix-style analytics workload — architecture, storage, scaling, ecosystem, governance, and cost, side by side.</p></div>';

    const th = '<tr><th>Dimension</th>' +
      '<th style="color:' + P.snowflake.color + '">Snowflake</th>' +
      '<th style="color:' + P.redshift.color + '">Amazon Redshift</th>' +
      '<th style="color:' + P.fabric.color + '">Microsoft Fabric</th></tr>';
    const body = ROWS.map(r =>
      '<tr><td class="rk-td-dim">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>').join('');
    const table = '<div class="rk-table-wrap"><table class="rk-table"><thead>' + th + '</thead><tbody>' + body + '</tbody></table></div>';

    const picks = '<div class="cmp-picks">' + PICK.map(function (p) {
      var id = p[0], title = p[1], bodyText = p[2];
      return '<div class="cmp-pick" style="border-top:3px solid ' + P[id].color + '">' +
        '<div class="cmp-pick-title" style="color:' + P[id].color + '">' + title + '</div>' +
        '<div class="cmp-pick-body">' + bodyText + '</div>' +
        '<button class="rk-chip cmp-pick-go" data-plat="' + id + '" style="margin-top:.75rem;color:' + P[id].color + ';border-color:' + P[id].color + '">Open ' + P[id].name + ' →</button>' +
        '</div>';
    }).join('') + '</div>';

    page.innerHTML = head +
      '<div class="section-title" style="margin-top:.5rem;">Feature-by-feature</div>' + table +
      '<div class="section-title" style="margin-top:2rem;">When to pick which</div>' + picks +
      '<p class="stub-foot" style="margin-top:1.5rem;">All three separate compute from storage and lean on columnar formats + data-skipping; they differ most in ecosystem fit, openness of the storage format, and how BI connects.</p>';
    canvas.appendChild(page);

    page.querySelectorAll('.cmp-pick-go').forEach(function (b) {
      b.addEventListener('click', function () { viz.setPlatform && viz.setPlatform(b.dataset.plat); });
    });
    return { destroy() {} };
  };
})();
