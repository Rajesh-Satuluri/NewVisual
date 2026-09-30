import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A hiring manager says "dbt is just SQL macros." How do you correct this in 60 seconds?',
    a: `<strong>dbt is a transformation framework. Here's what that actually means:</strong>
    <ul>
      <li><strong>Dependency resolution:</strong> <code>ref()</code> calls build a DAG. dbt executes models in topological order — no Makefile, no orchestration glue needed.</li>
      <li><strong>Testing built-in:</strong> <code>schema.yml</code> declares <code>not_null</code>, <code>unique</code>, <code>relationships</code>, <code>accepted_values</code>. These run on every CI push before anything reaches production.</li>
      <li><strong>Documentation-as-code:</strong> Column descriptions in <code>schema.yml</code>. <code>dbt docs generate</code> publishes a searchable data catalog from the same file.</li>
      <li><strong>Environment isolation:</strong> Profiles separate dev/staging/prod. An analyst runs <code>dbt run --target dev</code> and writes to their personal schema — never production.</li>
      <li><strong>Compiled SQL:</strong> Every model compiles to plain SQL you can inspect. The warehouse runs it; dbt only orchestrates order and dependencies.</li>
    </ul>
    <strong>One-liner:</strong> "dbt is engineering best practices applied to SQL: version control, testing, documentation, dependency management, and CI/CD for the analytics workflow."`,
    tip: '"Engineering best practices for SQL" is the line that lands in interviews. It frames dbt as methodology, not a product — explaining why it works across Snowflake, BigQuery, Redshift, and Databricks alike.',
  },
  {
    q: 'Walk me through the three-layer dbt architecture (staging, intermediate, marts) and explain why each boundary exists.',
    a: `<strong>Staging layer (stg_*)</strong>
    <ul>
      <li>1:1 with raw source tables. One staging model per source table.</li>
      <li>Job: light transformations only — rename columns, cast types, deduplicate. Zero business logic.</li>
      <li>Why it exists: isolates source volatility. When the source renames <code>order_total</code> to <code>total_amount</code>, you change ONE staging model, not 12 downstream models.</li>
    </ul>
    <strong>Intermediate layer (int_*)</strong>
    <ul>
      <li>Joins and aggregations across staging models.</li>
      <li>Job: business logic that combines entities — <code>int_order_items</code> joins orders + products + discounts.</li>
      <li>Why it exists: keeps mart models clean. A mart reads like a business definition; the JOIN chain lives in intermediate.</li>
    </ul>
    <strong>Mart layer (fct_*, dim_*)</strong>
    <ul>
      <li>Consumes intermediate models. BI tools query marts directly.</li>
      <li>Job: stable, business-facing definitions. <code>fct_revenue</code>, <code>dim_customers</code>.</li>
      <li>Why it exists: stable contract for stakeholders. Mart columns change rarely even as upstream plumbing evolves.</li>
    </ul>`,
    tip: 'Frame each boundary as a stability contract: staging absorbs source volatility, intermediates absorb join complexity, marts absorb stakeholder churn. This framing shows architectural thinking, not just pattern recall.',
  },
  {
    q: 'How does dbt handle multi-environment deployment (dev/staging/prod) at Amazon scale?',
    a: `<strong>dbt uses profiles.yml to isolate environments:</strong>
    <ol>
      <li><strong>profiles.yml targets:</strong> dev points to analyst's personal schema (<code>analytics_dev_alice</code>), staging to CI schema (<code>analytics_staging</code>), prod to production (<code>analytics</code>). Same code, different destination.</li>
      <li><strong>CI pipeline:</strong> GitHub Actions runs <code>dbt build --target staging</code> on every PR. If any model or test fails, the PR can't merge.</li>
      <li><strong>Slim CI:</strong> On large projects (500+ models), run only what changed: <code>dbt build --select state:modified+</code>. Compares current branch's manifest to production manifest. PR touching 3 models runs 3 models, not all 500.</li>
      <li><strong>dbt Cloud jobs:</strong> Production runs on a schedule with <code>--target prod</code>. Freshness checks alert if source tables haven't been updated.</li>
    </ol>
    <strong>What this prevents at scale:</strong> An analyst developing locally writes to their personal schema. Bad code never touches production until it's CI-validated. The entire audit trail lives in Git.`,
    tip: 'Mentioning slim CI (<code>state:modified+</code>) shows you\'ve worked on large dbt projects where running all 500 models on every PR is impractical. It\'s a senior-level detail most candidates miss.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M09 · Introduction',
    title: 'Introducing dbt',
    subtitle: 'After 8 modules of SQL chaos, meet the tool that brings engineering discipline to analytics.',
    tabs: [
      { id: 'visual', label: '🎬 Before & After' },
      { id: 'detail', label: '📋 What is dbt?' },
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
  ctrl.innerHTML = `
    <button class="ctrl-btn" id="m09-reveal">🦆 Reveal dbt Solution</button>
    <button class="ctrl-btn" id="m09-chaos">💥 Back to Chaos</button>
    <span class="ctrl-label" id="m09-lbl">The old world: 5 teams, 5 schemas, zero shared definitions</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const TEAMS = [
    { name: 'Analytics', y: 70,  color: '#3B82F6', sql: 'SELECT *, NOW() FROM orders' },
    { name: 'Marketing', y: 150, color: '#FF6B35', sql: 'SELECT user_id, SUM(rev)...' },
    { name: 'Finance',   y: 225, color: '#4ECDC4', sql: 'SELECT order_id, total...' },
    { name: 'Product',   y: 300, color: '#8B5CF6', sql: 'SELECT event_type, COUNT...' },
    { name: 'Data Eng',  y: 370, color: '#F59E0B', sql: 'INSERT INTO staging...' },
  ];

  const SNODES = [
    { name: 'stg_orders',    x: 230, y: 90  },
    { name: 'stg_customers', x: 230, y: 200 },
    { name: 'stg_events',    x: 230, y: 315 },
  ];
  const INODES = [
    { name: 'int_order_items',     x: 430, y: 145 },
    { name: 'int_customer_orders', x: 430, y: 265 },
  ];
  const MNODES = [
    { name: 'fct_revenue',   x: 630, y: 110 },
    { name: 'dim_customers', x: 630, y: 210 },
    { name: 'fct_events',    x: 630, y: 310 },
  ];

  let state = { phase: 'before', tr: 0, bOp: 1, aOp: 0 };

  ctrl.querySelector('#m09-reveal').addEventListener('click', () => {
    if (state.phase === 'before') state.phase = 'toAfter';
  });
  ctrl.querySelector('#m09-chaos').addEventListener('click', () => {
    state = { phase: 'before', tr: 0, bOp: 1, aOp: 0 };
    container.querySelector('#m09-lbl').textContent = 'The old world: 5 teams, 5 schemas, zero shared definitions';
  });

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function arw(ctx, x1, y1, x2, y2, col) {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy);
    if (len < 2) return;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath(); ctx.moveTo(x1,y1);
    ctx.lineTo(x2-ux*8, y2-uy*8);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2-ux*9-uy*4, y2-uy*9+ux*4);
    ctx.lineTo(x2-ux*9+uy*4, y2-uy*9-ux*4);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    if (state.phase === 'toAfter') {
      state.tr = Math.min(1, state.tr + dt * 1.0);
      state.bOp = Math.max(0, 1 - state.tr * 2.5);
      state.aOp = Math.max(0, (state.tr - 0.4) * 2.5);
      if (state.tr >= 1) {
        state.phase = 'after';
        container.querySelector('#m09-lbl').textContent = 'dbt: every model tested, documented, version-controlled';
      }
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // BEFORE
    if (state.bOp > 0.01) {
      ctx.save(); ctx.globalAlpha = state.bOp;

      rr(ctx, 610, 110, 168, 200, 10, '#1A0A0A', '#EF4444');
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Amazon Warehouse', 694, 138);
      ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif';
      ctx.fillText('100+ tables', 694, 158);
      ctx.fillText('no tests · no docs', 694, 174);
      ctx.fillText('no ownership', 694, 190);
      ctx.fillStyle = '#EF4444'; ctx.font = '28px Inter, sans-serif';
      ctx.fillText('⚠', 694, 238);

      TEAMS.forEach((t, i) => {
        const cp1x = 290 + (i % 3 - 1) * 50;
        ctx.beginPath(); ctx.moveTo(138, t.y);
        ctx.quadraticCurveTo(cp1x, t.y + (i % 2 === 0 ? -25 : 25), 610, 210);
        ctx.strokeStyle = t.color + '44'; ctx.lineWidth = 1;
        ctx.setLineDash(i % 2 === 0 ? [4, 4] : []);
        ctx.stroke(); ctx.setLineDash([]);

        rr(ctx, 30, t.y-16, 108, 32, 6, '#131D2E', t.color + '88');
        ctx.fillStyle = t.color; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(t.name, 84, t.y - 1);
        ctx.fillStyle = '#4B5E78'; ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillText(t.sql.substring(0, 24) + '…', 84, t.y + 12);
      });

      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('5 teams · 5 conflicting schemas · zero shared definitions', W/2, H - 14);
      ctx.restore();
    }

    // AFTER
    if (state.aOp > 0.01) {
      ctx.save(); ctx.globalAlpha = state.aOp;

      ['SOURCES', 'STAGING', 'INTERMEDIATE', 'MARTS'].forEach((lbl, i) => {
        ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(lbl, [80, 230, 430, 630][i], 24);
      });

      ['raw_orders', 'raw_customers', 'raw_events'].forEach((name, i) => {
        const y = 90 + i * 113;
        rr(ctx, 30, y-13, 100, 26, 5, '#131D2E', '#4B5E7866');
        ctx.fillStyle = '#4B5E78'; ctx.font = '8px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(name, 80, y + 4);
        arw(ctx, 130, y, SNODES[i].x - 58, SNODES[i].y, '#4B5E7855');
      });

      SNODES.forEach(n => {
        rr(ctx, n.x-58, n.y-16, 116, 32, 6, '#0D1F3C', '#3B82F6');
        ctx.fillStyle = '#3B82F6'; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + 4);
        ctx.fillStyle = '#10B981'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText('✓', n.x + 46, n.y - 2);
      });

      arw(ctx, SNODES[0].x+58, SNODES[0].y,   INODES[0].x-78, INODES[0].y-6,  '#3B82F655');
      arw(ctx, SNODES[1].x+58, SNODES[1].y,   INODES[0].x-78, INODES[0].y+6,  '#3B82F655');
      arw(ctx, SNODES[1].x+58, SNODES[1].y,   INODES[1].x-78, INODES[1].y-6,  '#3B82F655');
      arw(ctx, SNODES[2].x+58, SNODES[2].y,   INODES[1].x-78, INODES[1].y+6,  '#3B82F655');

      INODES.forEach(n => {
        rr(ctx, n.x-78, n.y-16, 156, 32, 6, '#12102A', '#8B5CF6');
        ctx.fillStyle = '#8B5CF6'; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + 4);
        ctx.fillStyle = '#10B981'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText('✓', n.x + 66, n.y - 2);
      });

      arw(ctx, INODES[0].x+78, INODES[0].y,   MNODES[0].x-50, MNODES[0].y,    '#8B5CF655');
      arw(ctx, INODES[0].x+78, INODES[0].y+6, MNODES[1].x-50, MNODES[1].y-6,  '#8B5CF655');
      arw(ctx, INODES[1].x+78, INODES[1].y-6, MNODES[1].x-50, MNODES[1].y+6,  '#8B5CF655');
      arw(ctx, INODES[1].x+78, INODES[1].y,   MNODES[2].x-50, MNODES[2].y,    '#8B5CF655');

      const mColors = ['#10B981', '#F59E0B', '#10B981'];
      MNODES.forEach((n, i) => {
        rr(ctx, n.x-50, n.y-16, 100, 32, 6, '#0A1F14', mColors[i]);
        ctx.fillStyle = mColors[i]; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + 4);
        ctx.fillStyle = '#10B981'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText('✓', n.x + 38, n.y - 2);
      });

      ctx.fillStyle = '#10B981'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✓  All models tested · documented · version-controlled · one canonical definition per metric', W/2, H - 14);
      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>What dbt actually is</h3>
      <p>dbt (data build tool) is a command-line tool that lets analysts transform data in their warehouse using SQL. The key insight: <em>dbt doesn't move data</em>. Your ELT pipeline loads raw data; dbt transforms it into models, metrics, tests, and documentation — all in one framework, all in Git.</p>
      <div class="code-block">-- Without dbt: standalone SQL, no tests, no lineage, no docs
SELECT customer_id, SUM(order_total) as ltv
FROM raw_orders WHERE status = 'completed' GROUP BY 1;

-- With dbt: a model that declares its dependencies
-- File: models/marts/fct_customer_ltv.sql
SELECT c.customer_id, SUM(o.order_total) as lifetime_value
FROM {{ ref('stg_orders') }} o
JOIN {{ ref('stg_customers') }} c USING (customer_id)
WHERE o.status = 'completed'
GROUP BY 1
-- schema.yml: not_null on customer_id, unique on customer_id</div>
    </div>
    <div class="detail-section">
      <h3>Five capabilities that change everything</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">ref() — Dependency DAG</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Lineage</div>
          <div class="info-card-body"><code>{{ ref('stg_orders') }}</code> tells dbt that stg_orders must run first. dbt compiles a full DAG and executes in topological order — no manual orchestration.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">schema.yml — Tests & Docs</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Quality</div>
          <div class="info-card-body">Declare <code>not_null</code>, <code>unique</code>, <code>relationships</code>, <code>accepted_values</code> in YAML. <code>dbt test</code> validates. <code>dbt docs generate</code> publishes a searchable catalog.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Materializations</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Performance</div>
          <div class="info-card-body"><code>view</code>, <code>table</code>, <code>incremental</code>, <code>ephemeral</code> — choose how each model persists. Change the strategy in one config line without rewriting SQL.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Multi-environment</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Safety</div>
          <div class="info-card-body">Dev/staging/prod isolated by profiles. <code>dbt run --target dev</code> writes to your personal schema. CI validates in staging. Production only gets CI-passed code.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The three-layer architecture</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Layer</th><th>Prefix</th><th>Job</th><th>Stability contract</th></tr></thead>
          <tbody>
            <tr><td>Staging</td><td><code>stg_</code></td><td>1:1 with source, light cleaning only</td><td>Absorbs source schema volatility</td></tr>
            <tr><td>Intermediate</td><td><code>int_</code></td><td>Joins + business logic, internal only</td><td>Absorbs join complexity</td></tr>
            <tr><td>Mart</td><td><code>fct_</code>/<code>dim_</code></td><td>Business-facing, BI-queryable</td><td>Stable API for stakeholders</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did dbt solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">SQL was being written like the 1990s — no tests, no docs, no version control, no dependency tracking. dbt brought software engineering discipline to analytics without requiring analysts to become software engineers.</p>
    </div>
  `;
}
