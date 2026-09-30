import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STATS_EXAMPLES = [
  { stat: 'reltuples', table: 'products',  value: '350,000,000', meaning: 'Estimated row count — updated by ANALYZE' },
  { stat: 'relpages',  table: 'products',  value: '5,250,000',   meaning: 'Physical page count (8KB each = ~42 GB)' },
  { stat: 'n_distinct', table: 'products.product_id', value: '-1 (all unique)', meaning: 'Negative = fraction; -1 = 100% unique → perfect for index' },
  { stat: 'most_common_vals', table: 'products.category', value: "['Electronics','Books','Clothing']", meaning: 'Most frequent values + their frequencies for MCV selectivity' },
  { stat: 'histogram_bounds', table: 'products.price', value: '[0.99, 9.99, 24.99, 49.99 … 999.99]', meaning: '100 equal-frequency buckets for range predicate estimation' },
  { stat: 'correlation', table: 'products.product_id', value: '0.98 (nearly 1.0)', meaning: 'Physical vs logical order correlation — high → index-only scan safe' },
];

const SELECTIVITY_STEPS = [
  {
    label: 'Predicate: product_id = B08N5WRWNW',
    sel: 1 / 350_000_000,
    display: '1 / 350,000,000 = 0.0000000029',
    reason: 'product_id is UNIQUE (n_distinct = -1.0). Exactly 1 row matches.',
    rows: 1, color: '#10B981',
  },
  {
    label: 'Predicate: quantity > 0',
    sel: 0.95,
    display: '95% — from histogram on inventory.quantity',
    reason: 'Histogram shows quantity = 0 for ~5% of inventory rows. So 95% survive qty > 0.',
    rows: 2_000_000, color: '#F59E0B',
  },
  {
    label: 'Join selectivity: product_id = product_id',
    sel: 1 / 350_000_000,
    display: '1 / max(n_distinct_products, n_distinct_inventory)',
    reason: 'Equijoin on unique key. Each inventory row matches at most 1 products row. Join output ≈ min(|products|, |inventory|) = 2M rows in the worst case.',
    rows: 2, color: '#06B6D4',
  },
];

function drawSelectivity(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to see how selectivity is estimated', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }
  const s = SELECTIVITY_STEPS[stepIdx];
  const barMaxW = w - 160;

  // Title
  ctx.fillStyle = '#94A3B8'; ctx.font = '600 12px system-ui';
  ctx.fillText(s.label, 20, 40);
  ctx.fillStyle = s.color; ctx.font = '700 18px system-ui';
  ctx.fillText(`Selectivity: ${s.display}`, 20, 72);

  // Bar showing selectivity
  const barY = 100, barH = 40;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, barY, barMaxW, barH, 4); ctx.fill();
  const selW = Math.max(4, s.rows > 1 ? 30 : 2);
  ctx.fillStyle = s.color;
  ctx.beginPath(); ctx.roundRect(20, barY, selW, barH, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText('All rows', 20, barY + barH + 16);
  ctx.fillStyle = s.color;
  ctx.fillText(`↑ Matching rows: ${s.rows.toLocaleString()}`, 22, barY + barH + 32);

  // Reason
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.roundRect(20, 180, w - 40, 80, 6); ctx.fill();
  ctx.fillStyle = '#94A3B8'; ctx.font = '600 11px system-ui';
  ctx.fillText('How the optimizer estimated this:', 30, 200);
  ctx.fillStyle = '#64748B'; ctx.font = '11px system-ui';
  const words = s.reason.split(' ');
  let line = '', cy = 218;
  words.forEach(w => {
    if ((line + w).length > 90) { ctx.fillText(line, 30, cy); line = w + ' '; cy += 14; } else line += w + ' ';
  });
  if (line) ctx.fillText(line, 30, cy);

  // Cost box
  const cost = s.rows * 0.01 + (s.rows > 100 ? s.rows / 50000 * 4 : 3);
  ctx.fillStyle = '#1E2D3D';
  ctx.beginPath(); ctx.roundRect(20, 280, w - 40, 50, 6); ctx.fill();
  ctx.fillStyle = '#4F46E5'; ctx.font = '700 11px system-ui';
  ctx.fillText(`Estimated plan cost contribution: ${cost.toFixed(2)} cost units`, 30, 302);
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(`(${s.rows.toLocaleString()} rows × cpu_tuple_cost 0.01 + page reads × random_page_cost 4.0)`, 30, 320);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M17',
    title: 'Cost-Based Optimization',
    subtitle: 'How the optimizer uses table statistics to estimate row counts and compare plan costs.',
    tabs: [
      { id: 'selectivity', label: '📊 Selectivity' },
      { id: 'statistics',  label: '📈 Statistics' },
      { id: 'iq',          label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const selTab = container.querySelector('#tab-selectivity');
  selTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="sel-explainer">
        <h3>Selectivity Estimation</h3>
        <p>Selectivity = fraction of rows that pass a predicate. The optimizer multiplies selectivities
           for AND predicates and uses statistics to estimate each one. Press <strong>Play</strong>
           to see how each predicate in our Prime Day query is estimated.</p>
      </div>
    </div>
  `;
  const canvas = selTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: SELECTIVITY_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawSelectivity(ctx, state.step, 800, 360);
      const el = selTab.querySelector('#sel-explainer');
      if (el && state.step >= 0) { const s = SELECTIVITY_STEPS[state.step]; el.innerHTML = `<h3>${s.label}</h3><p>Matching rows: <strong>${s.rows.toLocaleString()}</strong> — selectivity ${s.display}</p>`; }
    },
  });
  SimulationEngine.renderControls(selTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(selTab.querySelector('.canvas-wrap'), engine);
  drawSelectivity(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-statistics').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">PostgreSQL Statistics — pg_statistic</div>
        <div class="section-desc">Collected by ANALYZE / autovacuum — feeds the cost model</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Statistic</th><th>Table / Column</th><th>Value (Prime Day)</th><th>Optimizer Use</th></tr></thead>
          <tbody>
            ${STATS_EXAMPLES.map(s => `
              <tr>
                <td><code style="color:var(--accent)">${s.stat}</code></td>
                <td>${s.table}</td>
                <td style="font-family:monospace;font-size:11px;color:var(--text2)">${s.value}</td>
                <td style="font-size:11px">${s.meaning}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="prose" style="padding-top:20px">
        <h3>Selectivity Rules</h3>
        <ul>
          <li><strong>Equality on unique column:</strong> sel = 1 / n_distinct (or 1/reltuples for PK)</li>
          <li><strong>Equality on non-unique:</strong> sel = MCV frequency if in most_common_vals, else 1/n_distinct</li>
          <li><strong>Range predicate (&gt;, &lt;, BETWEEN):</strong> interpolate from histogram_bounds buckets</li>
          <li><strong>LIKE 'prefix%':</strong> estimate using histogram; LIKE '%suffix' → 1/3 of rows (heuristic)</li>
          <li><strong>AND predicates:</strong> multiply selectivities (assumes independence)</li>
          <li><strong>OR predicates:</strong> sel(A) + sel(B) – sel(A) × sel(B)</li>
        </ul>
        <h3>When Statistics Go Wrong</h3>
        <p>After a Prime Day bulk load of 50M new orders, autovacuum hasn't run yet. pg_statistic
           still shows 375M rows but the actual count is 425M. The optimizer underestimates
           join output size → picks NLJ when HashJoin would be 5× faster. Fix: run ANALYZE
           immediately after bulk loads.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is selectivity and how does the optimizer estimate it?',
      a: 'Selectivity is the fraction of rows passing a predicate: 0 = no rows, 1 = all rows. The optimizer estimates it from pg_statistic: (1) <strong>equality on unique column</strong>: 1/reltuples; (2) <strong>equality on non-unique</strong>: frequency from most_common_vals, or 1/n_distinct if not in MCV; (3) <strong>range predicate</strong>: interpolated from the 100-bucket histogram; (4) <strong>AND</strong>: multiply individual selectivities (independence assumption). For the Prime Day query: product_id = constant → selectivity = 1/350M ≈ 0.0000000029 → estimated 1 row. This tiny selectivity drives the optimizer to choose IndexScan over SeqScan.',
      tip: 'Always explain selectivity with a concrete formula. Interviewers want to know you understand the math, not just "it uses statistics".',
    },
    {
      q: 'How does running ANALYZE affect query performance?',
      a: 'ANALYZE samples ~30,000 rows (default statistics target = 100 histogram buckets) from each table and updates pg_statistic. Effect on performance: the optimizer gets accurate row count estimates → makes better plan choices → faster queries. In practice: run ANALYZE after bulk loads, after major deletes, after significant data distribution changes. Autovacuum runs ANALYZE automatically when > 20% of rows are modified (autovacuum_analyze_scale_factor = 0.2). For large tables, this can be too slow — tune autovacuum_analyze_threshold and scale_factor per table.',
      tip: 'ANALYZE does not lock the table. VACUUM + ANALYZE together reclaim dead tuple space and refresh statistics. Run both after big ETL jobs.',
    },
    {
      q: 'What is the independence assumption and when does it fail?',
      a: 'The optimizer estimates AND selectivity by multiplying individual predicate selectivities, assuming they are statistically independent. This fails when columns are correlated: <code>WHERE country = \'US\' AND state = \'CA\'</code> — California is 100% correlated with country = US, so sel(country=US) × sel(state=CA) grossly underestimates the fraction. The optimizer thinks far fewer rows pass → may choose NLJ when HashJoin is better. Fix: <code>CREATE STATISTICS ON (country, state) FROM customers</code> tells PostgreSQL to collect joint distribution statistics. Available since PG 10.',
      tip: 'Extended statistics (CREATE STATISTICS) is the cure for correlated column mis-estimation. Mention this as a production-level optimization technique.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
