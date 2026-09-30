/* ============================================================
   Performance Simulation Module
   Animated 7-step query optimization walkthrough showing how
   Iceberg layers prune files at each metadata level, achieving
   99.7% file skipping on a 6 PB / 800M-file lakehouse.
   ShopKart: orders.events query on 2026-08-01 for high-value
   customers in Electronics and Fashion categories.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('pf-styles')) return;
    const s = document.createElement('style');
    s.id = 'pf-styles';
    s.textContent = `
.pf-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.pf-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.pf-canvas {
  flex:1; display:flex; flex-direction:column; align-items:stretch;
  padding:20px 24px; background:var(--bg-1); overflow-y:auto; gap:16px;
}
.pf-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.pf-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.pf-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.pf-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:54px; }
.pf-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:240px;
}
.pf-step-item {
  display:flex; align-items:center; gap:10px; padding:7px 14px;
  cursor:pointer; transition:background .12s;
}
.pf-step-item:hover { background:var(--bg-3); }
.pf-step-item.active { background:rgba(74,174,255,.1); }
.pf-step-num {
  width:22px; height:22px; border-radius:50%; border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; color:var(--text-muted); flex-shrink:0;
}
.pf-step-item.active .pf-step-num { border-color:var(--blue); color:var(--blue); }
.pf-step-item.done .pf-step-num { background:var(--green); border-color:var(--green); color:#fff; font-size:0; }
.pf-step-item.done .pf-step-num::after { content:'✓'; font-size:10px; }
.pf-step-label { font-size:12px; color:var(--text-secondary); line-height:1.35; }
.pf-step-item.active .pf-step-label { color:var(--text-primary); font-weight:500; }
.pf-code-panel { flex:1; overflow:hidden; display:flex; flex-direction:column; }
.pf-code-block {
  flex:1; overflow-y:auto; padding:14px 16px;
  font-family:var(--font-mono); font-size:11.5px;
  color:var(--text-secondary); line-height:1.7; white-space:pre;
}
.pf-code-block .hi-kw  { color:var(--blue); }
.pf-code-block .hi-str { color:var(--green); }
.pf-code-block .hi-num { color:var(--orange); }
.pf-code-block .hi-cm  { color:var(--text-muted); font-style:italic; }
.pf-code-block .hi-fn  { color:#e8c07a; }

/* Funnel visualization */
.pf-funnel { display:flex; flex-direction:column; gap:10px; }
.pf-funnel-row {
  display:flex; align-items:center; gap:12px;
}
.pf-funnel-label {
  width:180px; font-size:11px; color:var(--text-secondary); flex-shrink:0; text-align:right;
}
.pf-funnel-bar-wrap {
  flex:1; height:32px; background:var(--bg-3); border-radius:4px; overflow:hidden;
  position:relative;
}
.pf-funnel-bar {
  height:100%; border-radius:4px; transition:width .6s ease;
  display:flex; align-items:center; justify-content:flex-end; padding-right:8px;
  min-width:2px;
}
.pf-funnel-bar.total   { background:rgba(248,81,73,.5); }
.pf-funnel-bar.prune-p { background:rgba(232,192,122,.6); }
.pf-funnel-bar.prune-m { background:rgba(163,113,247,.6); }
.pf-funnel-bar.prune-s { background:rgba(74,174,255,.6); }
.pf-funnel-bar.bloom   { background:rgba(63,185,80,.5); }
.pf-funnel-bar.read    { background:rgba(63,185,80,.85); }
.pf-funnel-val {
  width:90px; font-size:11px; font-weight:700; color:var(--text-primary);
  font-family:var(--font-mono); flex-shrink:0;
}
.pf-funnel-skip {
  font-size:10px; color:var(--green); width:80px; flex-shrink:0; font-weight:600;
}
.pf-query-box {
  background:var(--bg-2); border:1px solid var(--border-default); border-radius:10px;
  padding:14px 18px;
}
.pf-query-title { font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:10px; }
.pf-query-sql {
  font-family:var(--font-mono); font-size:11.5px;
  color:var(--text-secondary); line-height:1.7; white-space:pre;
}
.pf-query-sql .hi-kw  { color:var(--blue); }
.pf-query-sql .hi-str { color:var(--green); }
.pf-query-sql .hi-num { color:var(--orange); }
.pf-query-sql .hi-cm  { color:var(--text-muted); font-style:italic; }
.pf-metrics-grid {
  display:grid; grid-template-columns:repeat(4,1fr); gap:10px;
}
.pf-metric-card {
  background:var(--bg-2); border:1px solid var(--border-default); border-radius:8px;
  padding:12px; text-align:center;
}
.pf-metric-val { font-size:22px; font-weight:700; margin-bottom:4px; }
.pf-metric-label { font-size:10px; color:var(--text-muted); }
.pf-metric-sub { font-size:9.5px; color:var(--text-muted); margin-top:2px; }
.pf-section-title {
  font-size:12px; font-weight:700; color:var(--text-muted);
  text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px;
}
`;
    document.head.appendChild(s);
  }

  /* ── Query constant ──────────────────────────────────────── */
  const QUERY_SQL = `<span class="hi-kw">SELECT</span> c.customer_id, c.tier,
       <span class="hi-kw">SUM</span>(e.order_amount) <span class="hi-kw">AS</span> daily_spend
<span class="hi-kw">FROM</span> shopkart.orders.events e
<span class="hi-kw">JOIN</span> shopkart.customers.profiles c
  <span class="hi-kw">ON</span> e.customer_id = c.customer_id
<span class="hi-kw">WHERE</span> e.event_date = <span class="hi-str">'2026-08-01'</span>
  <span class="hi-kw">AND</span> e.product_category <span class="hi-kw">IN</span> (<span class="hi-str">'Electronics'</span>,<span class="hi-str">'Fashion'</span>)
  <span class="hi-kw">AND</span> c.customer_id = <span class="hi-num">7841290</span>
<span class="hi-kw">GROUP BY</span> <span class="hi-num">1</span>,<span class="hi-num">2</span>
<span class="hi-kw">ORDER BY</span> daily_spend <span class="hi-kw">DESC</span>;`;

  /* ── Funnel data per step ────────────────────────────────── */
  const FUNNEL_STEPS = [
    { files: '800M', bytes: '6 PB',   pct: 100,  skip: null,  label: 'Total files (no pruning)' },
    { files: '2.2M', bytes: '16.5 TB', pct: 0.28, skip: '99.72%', label: 'After partition prune' },
    { files: '184K', bytes: '1.4 TB',  pct: 0.023, skip: '99.98%', label: 'After manifest prune' },
    { files: '8,400', bytes: '63 GB',  pct: 0.001, skip: '99.999%', label: 'After column stats' },
    { files: '12',   bytes: '91 MB',  pct: 0.0000015, skip: '≈100%', label: 'After bloom filter' },
    { files: '12',   bytes: '8 MB',   pct: 0.0000015, skip: '≈100%', label: 'Projected columns only' },
  ];

  /* ── Steps ───────────────────────────────────────────────── */
  const STEPS = [
    {
      label: 'Baseline: full table scan',
      desc: 'Without pruning, the query would need to scan all 800 million data files across 6 PB of storage. At ShopKart\'s scale this would take hours. Iceberg\'s metadata layers progressively eliminate files.',
      code: `<span class="hi-cm">-- ShopKart orders.events table baseline</span>
Table format    : Iceberg v2
Total data files: <span class="hi-num">800,000,000</span>  (<span class="hi-num">800M</span>)
Total bytes     : <span class="hi-num">6,442,450,944,000</span>  (<span class="hi-num">6 PB</span>)
Total rows      : <span class="hi-num">21,483,725,000</span>  (<span class="hi-num">21.5B</span>)
Partitioned by  : event_date (days), product_category
Sorted by       : customer_id, order_id

<span class="hi-cm">-- Without Iceberg metadata pruning:</span>
Files to open   : <span class="hi-num">800,000,000</span>
Est. scan time  : <span class="hi-num">4–6 hours</span>  ← unacceptable

<span class="hi-cm">-- Iceberg will reduce this to ~12 files
-- Each metadata layer eliminates more</span>`,
    },
    {
      label: 'Layer 1: Partition pruning',
      desc: 'The partition spec (event_date=days, product_category=identity) lets Iceberg skip 99.72% of files immediately. Only partitions where event_date=2026-08-01 AND category IN (Electronics, Fashion) are kept.',
      code: `<span class="hi-cm">-- Partition spec on orders.events</span>
<span class="hi-kw">PARTITIONED BY</span> (
  <span class="hi-fn">days</span>(event_date),
  product_category
)

<span class="hi-cm">-- Partition predicate matching:</span>
event_date      = <span class="hi-str">'2026-08-01'</span>  → <span class="hi-num">1</span> day bucket
product_category <span class="hi-kw">IN</span> (
  <span class="hi-str">'Electronics'</span>, <span class="hi-str">'Fashion'</span>
)  → <span class="hi-num">2</span> category values

<span class="hi-cm">-- Files after partition prune:</span>
Before  : <span class="hi-num">800,000,000</span> files
After   :   <span class="hi-num">2,200,000</span> files  (<span class="hi-num">0.28%</span>)
Skipped : <span class="hi-num">797,800,000</span> files  (<span class="hi-num">99.72%</span> ✓)`,
    },
    {
      label: 'Layer 2: Manifest pruning',
      desc: 'Each manifest file stores partition summary statistics (min/max per partition field). Iceberg reads the manifest list (~MB) and skips entire manifests whose partition bounds don\'t overlap with the query predicates.',
      code: `<span class="hi-cm">-- Manifest list scan (fast, only ~MB)</span>
<span class="hi-cm">-- Each manifest has partition_summary:</span>
{
  <span class="hi-str">"lower_bound"</span>: <span class="hi-str">"2026-08-01"</span>,
  <span class="hi-str">"upper_bound"</span>: <span class="hi-str">"2026-08-01"</span>,
  <span class="hi-str">"contains_null"</span>: <span class="hi-kw">false</span>
}

<span class="hi-cm">-- Manifests examined : 22,000
-- Manifests matching : 184
-- Files in matched   : 184,000

After manifest prune:</span>
Before  : <span class="hi-num">2,200,000</span> files
After   :   <span class="hi-num">184,000</span> files  (<span class="hi-num">0.023%</span>)
Skipped :   additional <span class="hi-num">2,016,000</span>  (<span class="hi-num">91.6%</span> more ✓)`,
    },
    {
      label: 'Layer 3: Column-level statistics',
      desc: 'Inside each matching manifest, every DataFile entry stores column min/max bounds. For the customer_id=7841290 predicate, Iceberg checks lower_bounds ≤ 7841290 ≤ upper_bounds and eliminates 95.4% of remaining files.',
      code: `<span class="hi-cm">-- DataFile entry stats in manifest.avro</span>
{
  <span class="hi-str">"lower_bounds"</span>: {
    <span class="hi-num">3</span>: <span class="hi-num">7800000</span>   <span class="hi-cm">// col 3 = customer_id</span>
  },
  <span class="hi-str">"upper_bounds"</span>: {
    <span class="hi-num">3</span>: <span class="hi-num">7900000</span>
  }
}
<span class="hi-cm">-- 7841290 ∈ [7800000, 7900000] → KEEP
-- 7841290 ∉ [1000000, 2000000] → SKIP</span>

After column stats prune:
Before  : <span class="hi-num">184,000</span> files
After   :   <span class="hi-num">8,400</span> files  (<span class="hi-num">0.001%</span>)
Skipped :   additional <span class="hi-num">175,600</span>  (<span class="hi-num">95.4%</span> more ✓)`,
    },
    {
      label: 'Layer 4: Bloom filter lookup',
      desc: 'Iceberg v2 supports Parquet Bloom filters on high-cardinality columns like customer_id. The filter is a compact probabilistic structure (~KB). Iceberg tests customer_id=7841290 and eliminates 99.86% of the remaining 8,400 files.',
      code: `<span class="hi-cm">-- Bloom filter test (per Parquet file)</span>
<span class="hi-cm">-- Filter stored in Parquet file footer</span>
<span class="hi-cm">-- Size: ~4 KB per file · read once</span>

bloom_test(customer_id = <span class="hi-num">7841290</span>)
  → <span class="hi-kw">false</span>  : definitely NOT present → SKIP
  → <span class="hi-kw">true</span>   : probably present → KEEP
             (false positive rate: <span class="hi-num">1%</span>)

<span class="hi-cm">-- Bloom filter in Iceberg table properties:</span>
write.parquet.bloom-filter-enabled.column\
  .customer_id = <span class="hi-kw">true</span>
write.parquet.bloom-filter-max-bytes       = <span class="hi-num">1048576</span>

After bloom filter:
Before  : <span class="hi-num">8,400</span> files
After   :    <span class="hi-num">12</span> files  (± FP)
Skipped :   <span class="hi-num">8,388</span> files  (<span class="hi-num">99.86%</span> more ✓)`,
    },
    {
      label: 'Layer 5: Vectorized columnar read',
      desc: 'Only the 12 remaining files are opened. Parquet column projection means only 4 of 32 columns are decoded. Dictionary encoding on product_category further reduces CPU. ShopKart reads 8 MB instead of 91 MB.',
      code: `<span class="hi-cm">-- Parquet column projection (push-down)</span>
<span class="hi-cm">-- Query needs only 4 columns:</span>
Required columns: [
  customer_id,       <span class="hi-cm">// filter + group-by</span>
  order_amount,      <span class="hi-cm">// SUM aggregate</span>
  event_date,        <span class="hi-cm">// partition filter</span>
  product_category   <span class="hi-cm">// IN predicate</span>
]
Total columns in schema: <span class="hi-num">32</span>
Columns projected       :  <span class="hi-num">4</span>  (<span class="hi-num">12.5%</span>)

<span class="hi-cm">-- Parquet column group sizes:</span>
customer_id      :  <span class="hi-num">0.8</span> MB / file
order_amount     :  <span class="hi-num">1.2</span> MB / file
event_date       :  <span class="hi-num">0.2</span> MB / file  (dict enc.)
product_category :  <span class="hi-num">0.2</span> MB / file  (dict enc.)
<span class="hi-cm">→ 2.4 MB × 12 files ≈ 8 MB read total</span>`,
    },
    {
      label: 'Final metrics: 99.999% files skipped',
      desc: 'Result: from 800M files (6 PB) Iceberg read only 12 files (8 MB) — 99.999% skip rate. Query returned in 340 ms including Spark planning. This is the Iceberg advantage at ShopKart scale.',
      code: `<span class="hi-cm">-- Final query execution summary</span>

Files in table    : <span class="hi-num">800,000,000</span>  (<span class="hi-num">800M</span>)
Files opened      :          <span class="hi-num">12</span>
Skip rate         :      <span class="hi-num">99.9999985%</span>  ✓

Bytes in table    : <span class="hi-num">6,442,450,944,000</span>  (<span class="hi-num">6 PB</span>)
Bytes read        :       <span class="hi-num">8,388,608</span>  (<span class="hi-num">8 MB</span>)
Data reduction    :         <span class="hi-num">765,734×</span>

Spark planning    :        <span class="hi-num">85</span> ms
File open + read  :       <span class="hi-num">190</span> ms
Aggregation       :        <span class="hi-num">65</span> ms
<span class="hi-cm">──────────────────────────────────</span>
Total query time  :       <span class="hi-num">340</span> ms  ✓
(vs ~5 hours full scan)`,
    },
  ];

  /* ── Build funnel HTML ───────────────────────────────────── */
  function _buildFunnel(upToStep) {
    const rows = [
      { label: 'Total (no pruning)',       val: '800M files / 6 PB',     pct: 100,   cls: 'total',   skip: null },
      { label: '→ Partition pruning',      val: '2.2M files / 16.5 TB',  pct: 28,    cls: 'prune-p', skip: '−99.72%' },
      { label: '→ Manifest pruning',       val: '184K files / 1.4 TB',   pct: 2.3,   cls: 'prune-m', skip: '−91.6%' },
      { label: '→ Column stats',           val: '8,400 files / 63 GB',   pct: 0.105, cls: 'prune-s', skip: '−95.4%' },
      { label: '→ Bloom filter',           val: '12 files / 91 MB',      pct: 0.0015,cls: 'bloom',   skip: '−99.86%' },
      { label: '→ Column projection',      val: '12 files / 8 MB',       pct: 0.001, cls: 'read',    skip: '−91%' },
    ];

    return rows.map((r, idx) => {
      const active = idx <= upToStep;
      const opacity = active ? 1 : 0.25;
      const barWidth = active ? Math.max(r.pct, 0.001) : 0;
      const displayPct = active ? Math.max(barWidth, 0.5) : 0;
      return `<div class="pf-funnel-row" style="opacity:${opacity}">
        <div class="pf-funnel-label">${r.label}</div>
        <div class="pf-funnel-bar-wrap">
          <div class="pf-funnel-bar ${r.cls}" style="width:${displayPct}%">
          </div>
        </div>
        <div class="pf-funnel-val" style="font-size:11px">${active ? r.val : '—'}</div>
        <div class="pf-funnel-skip">${active && r.skip ? r.skip : ''}</div>
      </div>`;
    }).join('');
  }

  /* ── Render ──────────────────────────────────────────────── */
  let _engine = null;

  function _render(container) {
    _injectStyles();

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 1800,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          const t = el.querySelector('#pf-step-title');
          const d = el.querySelector('#pf-step-desc');
          const c = el.querySelector('#pf-code-content');
          const funnelEl = el.querySelector('#pf-funnel-body');
          if (t) t.textContent = STEPS[si].label;
          if (d) d.textContent = STEPS[si].desc;
          if (c) c.innerHTML = STEPS[si].code;
          if (funnelEl) funnelEl.innerHTML = _buildFunnel(si);
          el.querySelectorAll('.pf-step-item').forEach((el2, j) => {
            el2.classList.toggle('active', j === si);
            el2.classList.toggle('done', j < si);
          });
        },
      })),
    });

    container.innerHTML = `
<div class="pf-page">
  <div class="pf-outer">
    <div class="pf-canvas">

      <!-- Query -->
      <div class="pf-query-box">
        <div class="pf-query-title">ShopKart Query — orders.events (21.5B rows, 6 PB)</div>
        <div class="pf-query-sql">${QUERY_SQL}</div>
      </div>

      <!-- Funnel -->
      <div>
        <div class="pf-section-title">File Pruning Funnel</div>
        <div class="pf-funnel" id="pf-funnel-body">
          ${_buildFunnel(0)}
        </div>
      </div>

      <!-- Final metrics (step 6 only) -->
      <div id="pf-metrics-section" style="display:none">
        <div class="pf-section-title">Query Execution Summary</div>
        <div class="pf-metrics-grid">
          <div class="pf-metric-card">
            <div class="pf-metric-val" style="color:var(--green)">12</div>
            <div class="pf-metric-label">files read</div>
            <div class="pf-metric-sub">of 800M total</div>
          </div>
          <div class="pf-metric-card">
            <div class="pf-metric-val" style="color:var(--blue)">8 MB</div>
            <div class="pf-metric-label">bytes read</div>
            <div class="pf-metric-sub">of 6 PB total</div>
          </div>
          <div class="pf-metric-card">
            <div class="pf-metric-val" style="color:var(--purple)">340ms</div>
            <div class="pf-metric-label">query time</div>
            <div class="pf-metric-sub">vs 5 hrs full scan</div>
          </div>
          <div class="pf-metric-card">
            <div class="pf-metric-val" style="color:var(--orange)">765K×</div>
            <div class="pf-metric-label">data reduction</div>
            <div class="pf-metric-sub">column projection</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pf-sidebar">
      <div class="pf-sidebar-header">
        <div class="pf-sidebar-title" id="pf-step-title">${STEPS[0].label}</div>
        <div class="pf-sidebar-desc" id="pf-step-desc">${STEPS[0].desc}</div>
      </div>
      <div class="pf-steps-list">
        ${STEPS.map((s, i) => `
          <div class="pf-step-item${i === 0 ? ' active' : ''}" data-step="${i}">
            <div class="pf-step-num">${i + 1}</div>
            <div class="pf-step-label">${s.label}</div>
          </div>`).join('')}
      </div>
      <div class="pf-code-panel">
        <div class="pf-code-block" id="pf-code-content">${STEPS[0].code}</div>
      </div>
    </div>
  </div>
</div>`;

    _engine.setContext({ el: container });

    container.querySelectorAll('.pf-step-item').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    _engine.on('stepchange', (idx) => {
      const ms = container.querySelector('#pf-metrics-section');
      if (ms) ms.style.display = idx === 6 ? 'block' : 'none';
    });

    IV.AnimationControls.register(_engine);
  }

  IV.modules['performance'] = {
    id: 'performance',
    title: 'Performance Sim',
    group: 'advanced',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
