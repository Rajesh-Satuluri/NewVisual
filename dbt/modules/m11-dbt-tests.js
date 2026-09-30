import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What are the four generic dbt tests, and when would you apply each one?',
    a: `<strong>not_null</strong>
    <ul><li>Fails if any row has NULL in the column. Use on every primary key, every foreign key, every column that drives a business metric.</li></ul>
    <strong>unique</strong>
    <ul><li>Fails if any value appears more than once. Use on primary keys and any column that should be a natural key.</li></ul>
    <strong>relationships</strong>
    <ul><li>Fails if a foreign key in this model points to a value that doesn't exist in the referenced model. Use on every FK/PK join between models — catches referential integrity failures before they silently create incorrect aggregations.</li></ul>
    <strong>accepted_values</strong>
    <ul><li>Fails if a column contains a value outside a specified list. Use on status fields, type enums, category columns. Catches when a source system adds a new status that your downstream logic hasn't handled.</li></ul>
    <strong>Application rule:</strong> Apply not_null + unique to every primary key automatically. Apply relationships to every foreign key. Apply accepted_values to every status/enum column that drives a CASE statement downstream.`,
    tip: 'The "apply not_null + unique to every PK automatically" rule shows you have production dbt experience. In practice, this catches 60% of data quality issues without writing a single custom test.',
  },
  {
    q: 'How do you write a custom singular test? Give a real-world example.',
    a: `<strong>Singular tests</strong> are SQL files in <code>tests/</code> that return rows when something is wrong. If the query returns 0 rows, the test passes. If it returns any rows, the test fails.
    <br><br>
    <strong>Example: revenue reconciliation test</strong>
    <div style="margin:8px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
      -- tests/revenue_matches_finance_gl.sql<br>
      -- Fails if dbt revenue deviates from Finance GL by > 0.5%<br>
      WITH dbt_rev AS (SELECT SUM(revenue) AS total FROM {{ ref('fct_revenue') }}),<br>
      &nbsp;&nbsp;&nbsp;&nbsp; gl_rev  AS (SELECT SUM(amount) AS total FROM {{ source('finance', 'gl_entries') }})<br>
      SELECT 'MISMATCH' AS reason, d.total AS dbt_total, g.total AS gl_total<br>
      FROM dbt_rev d, gl_rev g<br>
      WHERE ABS(d.total - g.total) / NULLIF(g.total, 0) > 0.005
    </div>
    <strong>Other real examples:</strong>
    <ul>
      <li>Every order must have at least one order line item</li>
      <li>Refund amounts must never exceed original order total</li>
      <li>Active Prime subscribers must have a valid payment method</li>
      <li>No orders with <code>status = 'shipped'</code> and NULL <code>shipped_at</code></li>
    </ul>`,
    tip: 'The revenue reconciliation test is the most impressive example because it validates business logic across two independent systems. It\'s the kind of test that prevents the CFO from ever citing a different number than the data team.',
  },
  {
    q: 'A dbt test fails in CI. What are all the options, and when would you choose each?',
    a: `<strong>Option 1: Fix the data (upstream)</strong>
    <ul><li>Best when the source system is sending bad data. Work with the source team to fix the root cause. This is the right answer but not always immediately possible.</li></ul>
    <strong>Option 2: Fix the model (handle the bad case)</strong>
    <ul><li>Add a COALESCE, a WHERE filter, or a CASE to handle the unexpected value. Document WHY the defensive logic exists. Best for edge cases that are structurally valid but shouldn't reach downstream.</li></ul>
    <strong>Option 3: Change test severity to warn</strong>
    <ul><li><code>config: severity: warn</code> — test still runs, but a failure doesn't block CI. Use as a temporary measure while you investigate, or for known borderline cases you want to monitor without blocking deploys.</li></ul>
    <strong>Option 4: Add a test exclusion with justification</strong>
    <ul><li>In <code>schema.yml</code>: <code>config: where: "customer_id IS NOT NULL"</code> — test only runs on the subset you care about. Use when the test is correct but there's legitimate dirty historical data that will never be cleaned.</li></ul>
    <strong>Option 5: Quarantine the bad records</strong>
    <ul><li>Create a quarantine model that captures bad records, passing clean records downstream. Best for high-volume pipelines where you can't block on data quality but need visibility into the bad records.</li></ul>`,
    tip: 'Most candidates say "fix the data" and stop. The severity:warn / quarantine options show production experience — sometimes you can\'t block a pipeline for days while an upstream team cleans 3-year-old data.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Core Features',
    title: 'dbt Tests',
    subtitle: 'Bad data gets caught before it reaches the CEO dashboard. Watch the test gate in action.',
    tabs: [
      { id: 'visual', label: '🎬 Test Gate' },
      { id: 'detail', label: '📋 How Tests Work' },
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
    <button class="ctrl-btn" id="m11-toggle">🛡 Tests: ON</button>
    <button class="ctrl-btn" id="m11-bad">💣 Send Bad Data</button>
    <button class="ctrl-btn" id="m11-reset">↺ Reset</button>
    <span class="ctrl-label" id="m11-lbl">Good data flows through; bad data gets caught at the gate</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const GATE_X = 400;
  const ROW_TYPES = [
    { type: 'null_id',    label: 'NULL customer_id',    test: 'not_null test',      color: '#EF4444', y: 175 },
    { type: 'duplicate',  label: 'duplicate order #42', test: 'unique test',         color: '#F59E0B', y: 215 },
    { type: 'invalid',    label: 'status: "maybe"',     test: 'accepted_values test',color: '#8B5CF6', y: 255 },
  ];

  let state;

  function init() {
    state = {
      testsOn: true,
      rows: [],
      alerts: [],
      dashBadOp: 0,
      dashGoodCount: 0,
      spawnTimer: 0,
      time: 0,
    };
  }
  init();

  const toggleBtn = ctrl.querySelector('#m11-toggle');

  toggleBtn.addEventListener('click', () => {
    state.testsOn = !state.testsOn;
    toggleBtn.textContent = state.testsOn ? '🛡 Tests: ON' : '⚠ Tests: OFF';
    toggleBtn.style.borderColor = state.testsOn ? '#10B981' : '#EF4444';
    toggleBtn.style.color = state.testsOn ? '#10B981' : '#EF4444';
  });

  ctrl.querySelector('#m11-bad').addEventListener('click', () => {
    ROW_TYPES.forEach(rt => {
      state.rows.push({ ...rt, x: 185, speed: 70, opacity: 1, caught: false, passed: false });
    });
    // two good rows
    [190, 240].forEach(y => {
      state.rows.push({ type: 'good', label: 'valid row', test: '', color: '#10B981', y, x: 185, speed: 80, opacity: 1, caught: false, passed: false });
    });
  });

  ctrl.querySelector('#m11-reset').addEventListener('click', () => {
    init();
    toggleBtn.textContent = '🛡 Tests: ON';
    toggleBtn.style.borderColor = '';
    toggleBtn.style.color = '';
    container.querySelector('#m11-lbl').textContent = 'Good data flows through; bad data gets caught at the gate';
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

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    state.time += dt;

    // Auto-spawn good rows
    state.spawnTimer += dt;
    if (state.spawnTimer > 1.8) {
      state.spawnTimer = 0;
      const yOpts = [175, 215, 255];
      const y = yOpts[Math.floor(state.time * 3) % 3];
      state.rows.push({ type: 'good', label: 'valid row', test: '', color: '#10B981', y, x: 185, speed: 75, opacity: 1, caught: false, passed: false });
    }

    // Update rows
    state.rows.forEach(row => {
      if (row.caught) {
        row.opacity = Math.max(0, row.opacity - dt * 1.5);
        return;
      }
      row.x += row.speed * dt;

      // Test gate
      if (row.x >= GATE_X && !row.passed) {
        if (row.type !== 'good' && state.testsOn) {
          row.caught = true;
          state.alerts.push({
            x: GATE_X, y: row.y, msg: `✗ ${row.test}`, color: row.color,
            msgDetail: row.label, opacity: 1, vy: -40, timer: 0,
          });
          // pulse ring
          state.alerts.push({ isPulse: true, x: GATE_X, y: row.y, r: 0, maxR: 45, color: row.color, opacity: 0.8, timer: 0 });
        } else {
          row.passed = true;
          if (row.type !== 'good') {
            state.dashBadOp = 1.0;
          } else {
            state.dashGoodCount++;
          }
        }
      }

      if (row.x > 800) row.opacity = 0;
    });

    // Update alerts
    state.alerts.forEach(a => {
      a.timer += dt;
      if (a.isPulse) {
        a.r = Math.min(a.maxR, a.r + 90 * dt);
        a.opacity = Math.max(0, 0.8 - a.timer * 1.2);
      } else {
        a.y += a.vy * dt;
        a.opacity = Math.max(0, 1 - a.timer * 0.8);
      }
    });
    state.alerts = state.alerts.filter(a => a.opacity > 0);
    state.rows = state.rows.filter(r => r.opacity > 0);
    state.dashBadOp = Math.max(0, state.dashBadOp - dt * 0.4);

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Flow lane background
    ctx.fillStyle = '#0D1520'; ctx.fillRect(185, 155, GATE_X + 270, 120);
    ctx.strokeStyle = '#1E2D43'; ctx.lineWidth = 1; ctx.strokeRect(185, 155, GATE_X + 270, 120);

    // SOURCE box
    const srcCol = '#3B82F6';
    rr(ctx, 20, 160, 165, 110, 8, '#0D1F3C', srcCol);
    ctx.fillStyle = srcCol; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('📦 Data Source', 102, 185);
    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Orders, customers,', 102, 203);
    ctx.fillText('events streaming in', 102, 218);
    ctx.fillStyle = '#10B981'; ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText(`${state.dashGoodCount} rows passed`, 102, 250);

    // TEST GATE line
    const gateCol = state.testsOn ? '#10B981' : '#EF4444';
    ctx.save();
    ctx.strokeStyle = gateCol; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(GATE_X, 40); ctx.lineTo(GATE_X, H - 40); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Gate label
    ctx.save();
    ctx.translate(GATE_X + 14, 215);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = gateCol; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.testsOn ? 'TEST GATE (ON)' : 'TEST GATE (OFF)', 0, 0);
    ctx.restore();

    // DASHBOARD box
    const dashBad = state.dashBadOp > 0.1;
    const dashCol = dashBad ? `rgba(239,68,68,${0.3 + state.dashBadOp * 0.5})` : '#10B981';
    const dashBg  = dashBad ? `rgba(42,10,10,${state.dashBadOp})` : '#0A1F14';
    rr(ctx, 640, 160, 165, 110, 8, dashBg, dashCol);
    ctx.fillStyle = dashCol; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(dashBad ? '⚠ CEO Dashboard' : '✓ CEO Dashboard', 722, 185);
    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText(dashBad ? 'BAD DATA IN PROD!' : 'All metrics clean', 722, 205);
    if (dashBad) {
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('ALERT!', 722, 242);
    }

    // Data rows
    state.rows.forEach(row => {
      ctx.save(); ctx.globalAlpha = row.opacity;
      rr(ctx, row.x - 38, row.y - 11, 76, 22, 5, row.color + '28', row.color);
      ctx.fillStyle = row.color; ctx.font = '8px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(row.label.substring(0, 16), row.x, row.y + 4);
      ctx.restore();
    });

    // Pulse rings
    state.alerts.filter(a => a.isPulse).forEach(a => {
      ctx.save(); ctx.globalAlpha = a.opacity;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.strokeStyle = a.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });

    // Alert labels
    state.alerts.filter(a => !a.isPulse).forEach(a => {
      ctx.save(); ctx.globalAlpha = a.opacity;
      ctx.fillStyle = a.color; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(a.msg, GATE_X - 160, a.y);
      ctx.fillStyle = '#8895AA'; ctx.font = '9px Inter, sans-serif';
      ctx.fillText(a.msgDetail, GATE_X - 160, a.y + 13);
      ctx.restore();
    });

    // Legend
    ROW_TYPES.forEach((rt, i) => {
      const lx = 22, ly = H - 70 + i * 20;
      ctx.fillStyle = rt.color + 'cc'; ctx.fillRect(lx, ly - 6, 10, 10);
      ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${rt.label}  →  caught by ${rt.test}`, lx + 14, ly + 3);
    });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Tests run as SQL assertions</h3>
      <p>Every dbt test compiles to a SQL query that returns rows when something is wrong. If the query returns 0 rows, the test passes. If it returns any rows, the test fails. You declare tests in <code>schema.yml</code> next to your model definitions — no separate test framework to learn.</p>
      <div class="code-block">-- schema.yml
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - not_null        # fails if any order_id is NULL
          - unique          # fails if any order_id appears twice
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id   # fails if FK has no matching PK
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']</div>
    </div>
    <div class="detail-section">
      <h3>When tests run</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">dbt test</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">On demand</div>
          <div class="info-card-body">Run all tests manually. Pass <code>--select model_name</code> to test only one model. Use for debugging a specific data quality issue.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">dbt build</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Build + test</div>
          <div class="info-card-body">Runs models AND their downstream tests in a single command. A model is only marked successful if its tests pass. The production-safe way to deploy.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">CI Gate</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Pre-merge</div>
          <div class="info-card-body">GitHub Actions runs <code>dbt build --target staging</code> on every PR. A failing test blocks the merge. Nothing bad reaches prod without passing CI.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Severity levels</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Flexibility</div>
          <div class="info-card-body"><code>severity: error</code> (default) fails the run. <code>severity: warn</code> logs but continues. Use warn for known borderline cases while you investigate root causes.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Custom singular tests for business logic</h3>
      <p>Generic tests cover structural quality (nulls, uniqueness). Singular tests cover business logic that can't be expressed as column-level assertions.</p>
      <div class="code-block">-- tests/no_refund_exceeds_order.sql
-- Fails if any refund is larger than the original order total
SELECT r.order_id, r.refund_amount, o.order_total
FROM {{ ref('fct_refunds') }} r
JOIN {{ ref('fct_orders') }} o USING (order_id)
WHERE r.refund_amount > o.order_total</div>
    </div>
    <div class="detail-section">
      <h3>What problem did dbt tests solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Bad data used to reach production silently and surface in a board meeting. dbt tests create a quality gate that runs automatically on every deployment — no custom monitoring infrastructure required.</p>
    </div>
  `;
}
