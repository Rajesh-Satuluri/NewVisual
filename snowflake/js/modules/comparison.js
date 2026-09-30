/* ============================================================
   Comparison Module — Snowflake vs Redshift, BigQuery,
   Databricks. Positioning, not tribalism.
   ============================================================ */

(function () {
  'use strict';

  const COLS = ['Dimension', 'Snowflake', 'Redshift', 'BigQuery', 'Databricks'];
  const ROWS = [
    ['Compute model', 'Virtual warehouses (per-second)', 'Provisioned/Serverless clusters', 'Serverless slots', 'Spark clusters / SQL warehouses'],
    ['Storage/compute split', 'Full separation', 'RA3 separates; older coupled', 'Full separation', 'Lakehouse on object store'],
    ['Scaling', 'Instant resize + multi-cluster', 'Resize (slower); concurrency scaling', 'Automatic slots', 'Cluster autoscaling'],
    ['Data sharing', 'Native zero-copy + Marketplace', 'Datashare (RA3)', 'Analytics Hub', 'Delta Sharing'],
    ['Semi-structured', 'VARIANT + FLATTEN', 'SUPER type', 'Native JSON/nested', 'Native (Spark)'],
    ['Best fit', 'Multi-workload cloud DW + sharing', 'AWS-centric shops', 'GCP + ad-hoc serverless', 'ML / data engineering + lakehouse'],
  ];

  const M = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');

      page.appendChild(_header(
        'Reference',
        'Snowflake vs the Field',
        'How Snowflake positions against Redshift, BigQuery, and Databricks. There is no universal winner — the right choice depends on cloud, workload mix, and whether you lead with SQL analytics or ML/lakehouse.'
      ));

      const tSec = _section('At a Glance');
      const scroll = _el('div', 'cmp-scroll');
      const table = _el('table', 'cmp-table');
      const thead = _el('thead', '');
      thead.innerHTML = '<tr>' + COLS.map((c, i) => `<th${i === 1 ? ' class="cmp-hl"' : ''}>${c}</th>`).join('') + '</tr>';
      table.appendChild(thead);
      const tbody = _el('tbody', '');
      ROWS.forEach(r => {
        tbody.innerHTML += '<tr>' + r.map((cell, i) =>
          i === 0 ? `<th scope="row">${cell}</th>` : `<td${i === 1 ? ' class="cmp-hl"' : ''}>${cell}</td>`
        ).join('') + '</tr>';
      });
      table.appendChild(tbody);
      scroll.appendChild(table);
      tSec.appendChild(scroll);
      page.appendChild(tSec);

      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>The honest take:</strong> pick <strong>Snowflake</strong> for multi-team SQL analytics with easy governance and best-in-class data sharing; <strong>BigQuery</strong> if you live in GCP and want zero-ops serverless; <strong>Databricks</strong> if ML and data engineering on a lakehouse lead; <strong>Redshift</strong> if you're deeply AWS-native and cost-tuning provisioned clusters.`;
      const iSec = _section('Which Should You Choose?');
      iSec.appendChild(info);
      page.appendChild(iSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(t) { const s = _el('div', 'mod-section'); const h = _el('div', 'mod-section-title'); h.textContent = t; s.appendChild(h); return s; }
  function _header(e, t, sub) { const h = _el('div', 'mod-header'); h.innerHTML = `<div class="mod-eyebrow">${e}</div><h1 class="mod-title">${t}</h1><p class="mod-subtitle">${sub}</p>`; return h; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.comparison = M;
})();
