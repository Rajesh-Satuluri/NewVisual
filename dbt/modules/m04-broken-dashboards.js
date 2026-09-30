import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A column in a source table gets renamed from `order_total` to `total_amount`. How do you find every downstream report that breaks, and how do you prevent this class of failure?',
    a: `<strong>Finding the blast radius (reactive):</strong>
    <ol>
      <li>Search your dbt project: <code>grep -r "order_total" models/</code> — finds all models referencing the column.</li>
      <li>Use dbt's lineage graph: in dbt Cloud or dbt-docs, click the staging model for <code>raw_orders</code> and see every downstream model visually.</li>
      <li>Check BI tool: most BI tools have a "column impact" feature in their catalog. Pull the list of dashboards that use the column.</li>
    </ol>
    <strong>Prevention (proactive):</strong>
    <ol>
      <li><strong>dbt source freshness + tests:</strong> Add <code>not_null</code> and <code>accepted_values</code> tests on the column. When the source renames the column, the test fails in CI before the PR merges.</li>
      <li><strong>Source contracts:</strong> Use dbt source contracts to define the expected schema. Any schema drift from the source system triggers an alert.</li>
      <li><strong>Staging layer as a buffer:</strong> Staging models rename source columns to canonical names once. Downstream models reference the canonical name. When the source renames, only the staging model needs updating — not 12 downstream models.</li>
    </ol>`,
    tip: 'The "staging layer as a buffer" is the most elegant architectural answer. It separates source schema volatility from business logic stability — and shows you understand layered architecture.',
  },
  {
    q: 'What is data lineage, and what specific capabilities does having it unlock for a data engineering team?',
    a: `<strong>Data lineage</strong> is a directed graph that maps every transformation a piece of data goes through — from source table to final dashboard. Each node is a table/model, each edge is a transformation.
    <br><br>
    <strong>What it unlocks:</strong>
    <ul>
      <li><strong>Impact analysis:</strong> "If I change this model, what else breaks?" — you can answer this in seconds instead of hours of SQL archaeology.</li>
      <li><strong>Root cause analysis:</strong> "This dashboard is wrong. Why?" — trace upstream from the dashboard to find where the bad data entered.</li>
      <li><strong>Deprecation safety:</strong> "Can I delete this table?" — check if anything downstream still references it.</li>
      <li><strong>Compliance/auditing:</strong> "Where does this PII column come from?" — trace the full provenance for GDPR or SOX.</li>
      <li><strong>Ownership:</strong> When a model breaks, lineage tells you which team owns the upstream source and who to page.</li>
    </ul>`,
    tip: 'Frame lineage as "making implicit dependencies explicit." In a no-lineage world, dependencies exist but are invisible — you only discover them when something breaks. Lineage makes them visible before the break.',
  },
  {
    q: 'The executive dashboard broke after a Finance SQL view change. Design a testing strategy that catches this before it reaches production.',
    a: `<ol>
      <li><strong>Unit tests (dbt tests):</strong> Add generic tests on the Finance view's output: <code>not_null</code> on key columns, <code>unique</code> on primary keys, <code>relationships</code> to ensure foreign keys are valid. These run on every PR.</li>
      <li><strong>Integration test:</strong> A dbt singular test that queries the downstream exec dashboard model and asserts: row count is within 5% of last week, key metrics are within an acceptable range, no NULLs in revenue fields.</li>
      <li><strong>CI pipeline gate:</strong> All dbt tests must pass before a PR can merge. The Finance view PR triggers downstream model tests automatically via dbt's <code>--select</code> with state-based diffing.</li>
      <li><strong>Column-level lineage:</strong> Tools like OpenLineage or Atlan track which columns flow into which downstream metrics. A column rename in Finance automatically identifies the exec dashboard as impacted and notifies the dashboard owner.</li>
      <li><strong>Canary deployment:</strong> Run the updated Finance view in parallel with the old one for 24h. A reconciliation test compares totals. Promote only if within threshold.</li>
    </ol>`,
    tip: 'The "canary deployment" pattern for SQL is rare knowledge — most candidates stop at "add dbt tests." Mentioning it signals production engineering experience, not just development.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M04 · Foundation',
    title: 'Broken Dashboards',
    subtitle: 'Finance changes one SQL view. Watch how a cascade of silent failures propagates through every downstream report.',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 The Problem' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  cv.width = 820; cv.height = 420;
  cv.style.cssText = 'width:100%;max-width:820px';
  wrap.appendChild(cv);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  ctrl.innerHTML = `<button class="ctrl-btn" id="m04-break">💣 Rename Column in Source</button>
    <button class="ctrl-btn" id="m04-reset">↺ Reset</button>
    <span class="ctrl-label">See the cascade: one change, ten broken dashboards</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const REPORTS = [
    'Exec Dashboard', 'Revenue Report', 'Mktg Dashboard', 'Finance P&L',
    'Ops Metrics', 'Product KPIs', 'Daily Digest', 'Investor Deck', 'Tax Report', 'Audit Log'
  ];

  const REPORT_COLORS = [
    '#FF694B','#3B82F6','#F59E0B','#10B981',
    '#8B5CF6','#EC4899','#4ECDC4','#96CEB4','#45B7D1','#FF6B35'
  ];

  const SRC_X = W/2, SRC_Y = 52;
  const reportPositions = REPORTS.map((_, i) => {
    const angle = -Math.PI * 0.85 + i * (Math.PI * 1.7 / (REPORTS.length - 1));
    const r = 140;
    return { x: SRC_X + r * Math.cos(angle), y: SRC_Y + 110 + r * Math.sin(angle) };
  });

  let state;
  function init() {
    state = {
      broken: new Array(REPORTS.length).fill(false),
      breakIdx: 0,
      phase: 'normal',
      breakTimer: 0,
      pulses: [],
    };
  }
  init();

  ctrl.querySelector('#m04-break').addEventListener('click', () => {
    if (state.phase === 'normal') state.phase = 'breaking';
  });
  ctrl.querySelector('#m04-reset').addEventListener('click', init);

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    if (state.phase === 'breaking') {
      state.breakTimer += dt;
      if (state.breakTimer > 0.35 && state.breakIdx < REPORTS.length) {
        state.broken[state.breakIdx] = true;
        const rp = reportPositions[state.breakIdx];
        state.pulses.push({ x: rp.x, y: rp.y, t: 0, duration: 0.6 });
        state.breakIdx++;
        state.breakTimer = 0;
        if (state.breakIdx >= REPORTS.length) state.phase = 'done';
      }
    }

    state.pulses = state.pulses.filter(p => p.t < p.duration);
    state.pulses.forEach(p => { p.t += dt; });

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Pulse rings
    state.pulses.forEach(p => {
      const prog = p.t / p.duration;
      const r = 50 * prog;
      ctx.save();
      ctx.globalAlpha = (1 - prog) * 0.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });

    // Draw edges
    REPORTS.forEach((_, i) => {
      const rp = reportPositions[i];
      ctx.save();
      const isBroken = state.broken[i];
      ctx.strokeStyle = isBroken ? '#EF4444' : '#1E2D43';
      ctx.lineWidth = isBroken ? 1.5 : 1;
      ctx.globalAlpha = isBroken ? 0.8 : 0.4;
      ctx.setLineDash(isBroken ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(SRC_X, SRC_Y + 30);
      ctx.lineTo(rp.x, rp.y - 18);
      ctx.stroke();
      ctx.restore();
    });

    // Source node
    const allBroken = state.broken.every(Boolean);
    const srcLabel = state.phase === 'normal' ? 'vw_orders_enriched' : 'vw_orders_enriched ← RENAMED!';
    rr(ctx, SRC_X - 120, SRC_Y - 18, 240, 52, 8,
      allBroken ? '#2A0A0A' : '#131D2E',
      allBroken ? '#EF4444' : '#FF694B'
    );
    ctx.fillStyle = allBroken ? '#EF4444' : '#FF694B';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(srcLabel, SRC_X, SRC_Y + 2);
    ctx.fillStyle = '#4B5E78';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('Finance SQL view  ·  feeds all reports', SRC_X, SRC_Y + 20);

    // Report nodes
    REPORTS.forEach((name, i) => {
      const rp = reportPositions[i];
      const broken = state.broken[i];
      const color = broken ? '#EF4444' : REPORT_COLORS[i];
      rr(ctx, rp.x - 64, rp.y - 18, 128, 36, 6,
        broken ? '#1A0808' : '#131D2E',
        broken ? '#EF4444' : color + '88'
      );
      ctx.fillStyle = color;
      ctx.font = `bold ${broken ? 11 : 10}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(broken ? '✗  ' + name : name, rp.x, rp.y - 1);
      if (broken) {
        ctx.fillStyle = '#EF444488';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('column not found', rp.x, rp.y + 13);
      }
    });

    // Status
    const brokenCount = state.broken.filter(Boolean).length;
    if (brokenCount > 0) {
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${brokenCount} / ${REPORTS.length} dashboards now showing errors`, W/2, H - 28);
      if (allBroken) {
        ctx.fillStyle = '#8895AA';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Nobody knew these dashboards all depended on that one view.', W/2, H - 12);
      }
    } else {
      ctx.fillStyle = '#4B5E78';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${REPORTS.length} dashboards depend on this one Finance SQL view. Rename one column →`, W/2, H - 12);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The hidden dependency problem</h3>
      <p>In a pre-dbt world, SQL views and tables are connected by invisible wires. A Finance analyst creates <code>vw_orders_enriched</code> and shares it with two colleagues. Those colleagues share it with two more. Three years later, 10 dashboards depend on this view — and no one knows they all do.</p>
      <p>Then the Finance analyst renames <code>order_total</code> to <code>total_amount</code>. It's a minor cleanup. They test their own queries. Everything looks fine. They push the change on a Friday afternoon.</p>
      <p>On Monday morning, 10 dashboards show errors. The Exec team's Revenue Review has wrong numbers. The Tax Report is failing. Nobody knows why — or which change caused it.</p>
    </div>
    <div class="detail-section">
      <h3>Why this is so hard to prevent without tooling</h3>
      <p>Without lineage, the only way to find hidden dependencies is:</p>
      <ul style="padding-left:20px;font-size:13px;color:var(--text-2);line-height:2">
        <li>Manually grep every SQL file you can find</li>
        <li>Ask everyone on Slack if they use the view (you'll miss the people on vacation)</li>
        <li>Search BI tool configuration — but only if you have access</li>
        <li>Wait for things to break and trace backward</li>
      </ul>
      <p style="margin-top:12px">All of these are slow, error-prone, and require human coordination. They don't scale beyond 5 people.</p>
    </div>
    <div class="detail-section">
      <h3>How dbt's DAG solves this</h3>
      <p>When you use <code>ref()</code> in dbt, every dependency is declared explicitly. dbt compiles a Directed Acyclic Graph (DAG) from these references. You can query it programmatically: "Find all models downstream of <code>stg_orders</code>." The answer is exact and instant.</p>
      <p>dbt Cloud's lineage explorer lets you visualize the full graph, click any node, and see everything upstream and downstream. A column rename PR triggers impact analysis automatically.</p>
    </div>
    <div class="detail-section">
      <h3>Real examples</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#EF4444">
          <div class="info-card-title">Healthcare company</div>
          <div class="info-card-tag" style="color:#EF4444;background:#EF444422">HIPAA Impact</div>
          <div class="info-card-body">A patient ID column was renamed for HIPAA compliance. Unknown dependency chain caused patient matching to fail in 6 downstream reports. Compliance team found out 3 weeks later during an audit.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Amazon</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Prime Day</div>
          <div class="info-card-body">A metrics view was updated 48h before Prime Day to add new product categories. Broke the real-time sales dashboard. The dependency chain had 12 intermediate views between the source and the dashboard.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did this module show?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Without explicit dependency tracking, every SQL change is a blind leap. You only discover what you broke after it's already broken in production.</p>
    </div>
  `;
}
