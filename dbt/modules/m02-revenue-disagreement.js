import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'Finance shows revenue as $9.8M but Marketing shows $12.4M for the same period. How do you investigate and resolve this as the data engineering lead?',
    a: `<ol>
      <li><strong>Align on definition first:</strong> Call a 30-min sync with Finance and Marketing. Ask each team to walk through their SQL query line by line. The divergence is almost always in: (a) refund handling, (b) cancellation timing, (c) currency conversion, (d) which events count as "revenue".</li>
      <li><strong>Document the gap:</strong> Write a one-pager listing all definition differences. This becomes your alignment doc. Get both teams to sign off on what the <em>canonical</em> definition should be.</li>
      <li><strong>Build a single source-of-truth model:</strong> Create <code>fct_revenue</code> in dbt with the agreed definition. Add model-level documentation explaining every inclusion/exclusion decision.</li>
      <li><strong>Add a reconciliation test:</strong> A dbt singular test that joins your mart against both the old Finance query and the old Marketing query and asserts the difference is within an acceptable threshold (e.g., &lt;0.5%).</li>
      <li><strong>Migrate both dashboards</strong> to read from <code>fct_revenue</code>. Archive the old SQL. Add a data contract so future dashboards can't recreate the divergence.</li>
    </ol>`,
    tip: 'The "call a 30-min sync" step is what separates a senior engineer\'s answer from a junior one. The technical fix is the easy part — the political alignment is where the real work happens.',
  },
  {
    q: 'What is a "semantic layer" and when does it solve the metric inconsistency problem better than dbt models alone?',
    a: `<strong>dbt models alone</strong> create a trusted mart, but they don't stop a BI analyst from writing a new Tableau workbook that pulls from raw tables and redefines revenue.
    <br><br>
    <strong>A semantic layer</strong> (e.g., dbt Semantic Layer, Cube.js, Looker LookML) sits between the warehouse and every BI tool. All queries are expressed as business metrics — <code>revenue</code>, <code>active_users</code> — and the semantic layer compiles them to the canonical SQL.
    <br><br>
    <strong>When to use the semantic layer instead of dbt models alone:</strong>
    <ul>
      <li>Large org (50+ analysts) where you can't prevent direct warehouse access</li>
      <li>Multiple BI tools (Tableau, Looker, Excel) that each have their own SQL dialects</li>
      <li>Metrics that are queried at many different grains (daily, weekly, by region, by product)</li>
      <li>When metric consistency is a compliance requirement (finance reporting, GDPR)</li>
    </ul>`,
    tip: 'Knowing the difference between dbt models (a transformation layer) and a semantic layer (an access/query layer) is a signal of real-world data stack experience.',
  },
  {
    q: 'Design a system that guarantees a single source of truth for revenue across a 50-team organization like Amazon.',
    a: `<ol>
      <li><strong>Single canonical model:</strong> One dbt mart model <code>fct_revenue</code> owned by a central data platform team. Uses dbt model contracts to enforce column types and names.</li>
      <li><strong>Metric governance:</strong> All revenue variants (<code>gross_revenue</code>, <code>net_revenue</code>, <code>recognized_revenue</code>) defined as dbt Metrics — not raw SQL — with business logic versioned in Git.</li>
      <li><strong>Semantic layer enforcement:</strong> BI tools connect through a semantic layer. Direct warehouse access requires a request and documentation of why the mart model is insufficient.</li>
      <li><strong>Automated cross-validation:</strong> Nightly dbt test that compares <code>fct_revenue</code> total with the GL system of record. Alert on divergence &gt;0.1%.</li>
      <li><strong>Ownership model:</strong> Each metric has a designated owner in <code>schema.yml</code>. PRs that change metric logic require approval from the owner. Breaking changes trigger automated Slack notifications to all downstream dashboard owners.</li>
    </ol>`,
    tip: 'The most impressive addition: describe the feedback loop — how metric owners get notified when something downstream breaks. That shows you\'re thinking about the full lifecycle, not just the initial build.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'The Revenue Disagreement',
    subtitle: 'Same company. Same week. Three teams report three different revenue numbers. The CEO is confused. Who is right?',
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
  ctrl.innerHTML = `<button class="ctrl-btn" id="m02-reset">↺ Restart</button>
    <span class="ctrl-label">Click a dashboard to see its revenue formula</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const PANELS = [
    {
      team: 'Marketing',
      color: '#FF6B35',
      formula: 'Revenue = Gross Sales',
      value: 12.4,
      sql: 'SELECT SUM(order_total)\nFROM raw_orders\nWHERE status != \'cancelled\'',
      note: 'Includes pending refunds'
    },
    {
      team: 'Finance',
      color: '#4ECDC4',
      formula: 'Revenue = Gross − Refunds',
      value: 9.8,
      sql: 'SELECT SUM(o.order_total) - SUM(r.amount)\nFROM raw_orders o\nLEFT JOIN raw_refunds r\n  ON o.id = r.order_id\nWHERE o.status = \'complete\'',
      note: 'Correct per GAAP'
    },
    {
      team: 'Exec Board',
      color: '#F59E0B',
      formula: 'Revenue = Recognized (accrual)',
      value: 11.1,
      sql: 'SELECT SUM(recognized_amount)\nFROM revenue_recognition_log\nWHERE fiscal_period = \'Q4\'',
      note: 'Blends two methodologies'
    },
  ];

  let state;
  function init() {
    state = {
      time: 0,
      panelOp: PANELS.map(() => 0),
      counters: PANELS.map(() => 0),
      selected: -1,
      ceoOp: 0,
    };
  }
  init();
  ctrl.querySelector('#m02-reset').addEventListener('click', init);

  const PW = 210, PH = 240, PY = 100;
  const PXS = [30, 305, 580];

  function panelHit(px, mx, my) {
    return mx >= px && mx <= px + PW && my >= PY && my <= PY + PH;
  }

  cv.addEventListener('click', e => {
    const rect = cv.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    let hit = -1;
    PXS.forEach((px, i) => { if (panelHit(px, sx, sy)) hit = i; });
    state.selected = state.selected === hit ? -1 : hit;
  });
  cv.style.cursor = 'pointer';

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

    // Fade in panels
    state.panelOp = state.panelOp.map((op, i) =>
      Math.min(1, op + (state.time > 0.3 + i * 0.4 ? 1 : 0) * dt * 4)
    );
    state.ceoOp = Math.min(1, state.ceoOp + (state.time > 1.5 ? 1 : 0) * dt * 3);

    // Animate counters
    PANELS.forEach((p, i) => {
      if (state.panelOp[i] > 0.5) {
        const speed = p.value * 0.8;
        state.counters[i] = Math.min(p.value, state.counters[i] + speed * dt);
      }
    });

    // Draw
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Header
    ctx.globalAlpha = state.ceoOp;
    ctx.fillStyle = '#8895AA';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Q4 2024  ·  Amazon Retail Revenue  ·  Three teams, three dashboards', W/2, 28);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('👔  CEO: "What was our revenue last quarter?"', W/2, 52);
    ctx.globalAlpha = 1;

    // Panels
    PANELS.forEach((panel, i) => {
      const op = state.panelOp[i];
      if (op < 0.02) return;
      const px = PXS[i];
      const isSelected = state.selected === i;
      ctx.save();
      ctx.globalAlpha = op;

      // Panel bg
      rr(ctx, px, PY, PW, PH, 10,
        '#131D2E',
        isSelected ? panel.color : panel.color + '55'
      );
      if (isSelected) { ctx.lineWidth = 2; }

      // Header stripe
      rr(ctx, px, PY, PW, 38, 10, panel.color + '22', null);
      rr(ctx, px + PW - 30, PY, 30, 38, 0, panel.color + '22', null);
      ctx.fillStyle = panel.color;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(panel.team, px + PW/2, PY + 24);

      // Revenue label
      ctx.fillStyle = '#8895AA';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Revenue (Q4)', px + PW/2, PY + 58);

      // Big number
      const displayed = state.counters[i];
      ctx.fillStyle = state.counters[i] >= panel.value ? panel.color : '#CBD4E6';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillText('$' + displayed.toFixed(1) + 'M', px + PW/2, PY + 102);

      // Formula
      ctx.fillStyle = '#4B5E78';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(panel.formula, px + PW/2, PY + 124);

      // SQL preview
      const lines = panel.sql.split('\n');
      ctx.fillStyle = isSelected ? '#CBD4E6' : '#3A4D65';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      lines.forEach((line, li) => {
        ctx.fillText(line, px + 10, PY + 148 + li * 14);
      });

      // Note
      rr(ctx, px + 6, PY + PH - 34, PW - 12, 24, 4,
        panel.note.includes('Correct') ? '#10B98120' : '#EF444418', null);
      ctx.fillStyle = panel.note.includes('Correct') ? '#10B981' : '#EF4444';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(panel.note, px + PW/2, PY + PH - 17);

      ctx.restore();
    });

    // "Which is correct?" arrow
    if (state.ceoOp > 0.7 && state.time > 2) {
      const fade = Math.min(1, (state.time - 2) * 0.5);
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑  ↑  ↑', W/2, PY + PH + 30);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#8895AA';
      ctx.fillText('Three dashboards. Three SQL queries. Which revenue is correct?', W/2, PY + PH + 52);
      ctx.globalAlpha = 1;
    }

    // Selected detail hint
    if (state.selected >= 0) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#1E2D43';
      ctx.fillRect(0, H - 30, W, 30);
      ctx.fillStyle = PANELS[state.selected].color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${PANELS[state.selected].team}: ${PANELS[state.selected].formula}`, W/2, H - 12);
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Why revenue is never just "revenue"</h3>
      <p>Revenue is the most political metric in any company. Marketing optimizes for growth, so they want the biggest defensible number. Finance is conservative by law. The Exec team often uses a blended view that fits their narrative for the board. All three definitions can be internally consistent — and all three can produce genuinely different numbers from the same underlying transaction data.</p>
    </div>
    <div class="detail-section">
      <h3>The three SQL definitions compared</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Formula</th>
              <th>Includes refunds?</th>
              <th>Includes pending?</th>
              <th>GAAP compliant?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Marketing</td><td>Gross Sales</td><td class="bad">No</td><td class="bad">Yes</td><td class="bad">No</td></tr>
            <tr><td>Finance</td><td>Gross − Refunds</td><td class="good">Yes</td><td class="bad">No</td><td class="good">Yes</td></tr>
            <tr><td>Exec Board</td><td>Recognized (accrual)</td><td class="good">Yes</td><td class="good">Partial</td><td class="good">Yes</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>This problem across industries</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#FF6B35">
          <div class="info-card-title">Uber</div>
          <div class="info-card-tag" style="color:#FF6B35;background:#FF6B3522">Rides + Eats + Freight</div>
          <div class="info-card-body">Gross Bookings vs Net Revenue vs Adjusted Net Revenue — three legitimate revenue definitions used across different investor communications in the same quarter.</div>
        </div>
        <div class="info-card" style="border-left-color:#4ECDC4">
          <div class="info-card-title">Flipkart</div>
          <div class="info-card-tag" style="color:#4ECDC4;background:#4ECDC422">E-commerce</div>
          <div class="info-card-body">Marketplace GMV (total order value) vs Net Revenue (commission earned) vs Platform Revenue (ads + logistics fees). Finance and Business heads use different ones.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Netflix</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Streaming</div>
          <div class="info-card-body">ARM (Average Revenue per Membership) requires an exact subscriber count definition. Is a paused account "active"? Depending on the query, ARM swings ±8%.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did this module show?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Without a shared transformation layer, every team writes their own SQL — and every team gets a different answer to the same question.</p>
    </div>
  `;
}
