/* ============================================================
   Cost & Performance Module
   Warehouse sizing, resource monitors, an interactive cost
   calculator, and query optimization techniques.
   ============================================================ */

(function () {
  'use strict';

  // Credits/hour double with each T-shirt size.
  const SIZES = [
    { s: 'XS', c: 1 }, { s: 'S', c: 2 }, { s: 'M', c: 4 }, { s: 'L', c: 8 },
    { s: 'XL', c: 16 }, { s: '2XL', c: 32 }, { s: '3XL', c: 64 }, { s: '4XL', c: 128 },
  ];

  const OPTIMIZATIONS = [
    { n: 'Micro-partition pruning', d: 'The default speedup — selective WHERE clauses skip partitions via min/max metadata. Free and automatic.' },
    { n: 'Clustering keys', d: 'Co-locate related values on huge tables (>1TB) so pruning stays effective as data grows. Costs credits to maintain.' },
    { n: 'Search Optimization Service', d: 'Point-lookup accelerator for highly selective equality/IN queries on large tables. Adds storage + maintenance cost.' },
    { n: 'Materialized Views', d: 'Pre-computed, auto-maintained results for expensive recurring aggregations. Best for stable, frequently-read queries.' },
    { n: 'Query Acceleration (QAS)', d: 'Offloads scan-heavy portions of outlier queries to serverless compute, reducing warehouse contention.' },
    { n: 'Right-size, don\'t over-provision', d: 'Scale UP for slow single queries; scale OUT (multi-cluster) for concurrency. Set aggressive auto-suspend.' },
  ];

  const MONITOR_SQL = `-- Cap spend with a Resource Monitor and attach it to a warehouse
CREATE RESOURCE MONITOR analytics_rm WITH
  CREDIT_QUOTA = 1000                 -- monthly credit budget
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 75  PERCENT DO NOTIFY          -- warn at 75%
    ON 90  PERCENT DO SUSPEND         -- stop new queries at 90%
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;

ALTER WAREHOUSE analytics_wh
  SET RESOURCE_MONITOR = analytics_rm
      AUTO_SUSPEND = 60;             -- suspend after 60s idle`;

  const CPModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Operations',
        'Cost & Performance',
        'The skill that separates Snowflake users from Snowflake experts: pay only for the compute you need, cap it with guardrails, and make queries scan less. Netflix runs ~2.5M credits/month — small percentage wins are enormous.'
      ));

      /* Sizing (6a) */
      const zSec = _section('Warehouse Sizing — credits double per size');
      const info = _el('div', 'info-box');
      info.innerHTML = `Each size up <strong>doubles</strong> credits/hour <em>and</em> compute. A query that takes 60s on M may take 30s on L — same credits, half the wall-clock. Size <strong>up</strong> for slow queries; scale <strong>out</strong> (multi-cluster) for many concurrent queries.`;
      zSec.appendChild(info);
      const sizeRow = _el('div', 'cp-size-row');
      SIZES.forEach(x => {
        const el = _el('div', 'cp-size');
        el.innerHTML = `<div class="cp-size-name">${x.s}</div><div class="cp-size-credit">${x.c}<span>cr/hr</span></div>`;
        sizeRow.appendChild(el);
      });
      zSec.appendChild(sizeRow);
      page.appendChild(zSec);

      /* Cost calculator (6b) */
      const cSec = _section('💰 Interactive Cost Calculator');
      cSec.appendChild(_calculator());
      page.appendChild(cSec);

      /* Resource monitors (6a) */
      const mSec = _section('Resource Monitors — budget guardrails');
      if (cv) mSec.appendChild(cv.create(MONITOR_SQL, 'sql', 'Cap and auto-suspend'));
      page.appendChild(mSec);

      /* Query optimization (6c) */
      const oSec = _section('Query Optimization Toolkit');
      const grid = _el('div', 'ss-grid');
      OPTIMIZATIONS.forEach(o => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${o.n}</div><div class="ss-card-desc">${o.d}</div>`;
        grid.appendChild(c);
      });
      oSec.appendChild(grid);
      const tip = _el('div', 'info-box');
      tip.innerHTML = `<strong>Read the Query Profile first.</strong> Before optimizing, open the profile in Snowsight and look for: high "Bytes scanned" (poor pruning), "Bytes spilled to local/remote storage" (warehouse too small), and exploding join "Rows" (bad join order or missing filter).`;
      oSec.appendChild(tip);
      page.appendChild(oSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _calculator() {
    const box = _el('div', 'cp-calc');
    box.innerHTML = `
      <div class="cp-calc-grid">
        ${_field('Warehouse size', `<select id="cp-size">${SIZES.map(s => `<option value="${s.c}">${s.s} (${s.c} cr/hr)</option>`).join('')}</select>`)}
        ${_field('Clusters (avg)', `<input id="cp-clusters" type="number" min="1" max="10" value="1">`)}
        ${_field('Active hours / day', `<input id="cp-hours" type="number" min="0" max="24" step="0.5" value="8">`)}
        ${_field('Days / month', `<input id="cp-days" type="number" min="1" max="31" value="22">`)}
        ${_field('$ per credit', `<input id="cp-rate" type="number" min="0" step="0.1" value="3">`)}
      </div>
      <div class="cp-calc-out">
        <div class="cp-out-cell"><div class="cp-out-val" id="cp-credits">—</div><div class="cp-out-lbl">Credits / month</div></div>
        <div class="cp-out-cell"><div class="cp-out-val cp-out-cost" id="cp-cost">—</div><div class="cp-out-lbl">Estimated $ / month</div></div>
      </div>`;
    const recalc = () => {
      const v = id => parseFloat(box.querySelector('#' + id).value) || 0;
      const credits = v('cp-size') * v('cp-clusters') * v('cp-hours') * v('cp-days');
      box.querySelector('#cp-credits').textContent = credits.toLocaleString(undefined, { maximumFractionDigits: 0 });
      box.querySelector('#cp-cost').textContent = '$' + (credits * v('cp-rate')).toLocaleString(undefined, { maximumFractionDigits: 0 });
    };
    box.addEventListener('input', recalc);
    box.addEventListener('change', recalc);
    setTimeout(recalc, 0);
    return box;
  }
  function _field(label, control) {
    return `<label class="cp-field"><span class="cp-field-lbl">${label}</span>${control}</label>`;
  }
  function _section(title) {
    const s = _el('div', 'mod-section');
    const t = _el('div', 'mod-section-title'); t.textContent = title; s.appendChild(t);
    return s;
  }
  function _header(eyebrow, title, subtitle) {
    const h = _el('div', 'mod-header');
    h.innerHTML = `<div class="mod-eyebrow">${eyebrow}</div><h1 class="mod-title">${title}</h1><p class="mod-subtitle">${subtitle}</p>`;
    return h;
  }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.costPerformance = CPModule;
})();
