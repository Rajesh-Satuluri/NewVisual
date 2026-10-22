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
  {
    q: 'Mechanically, how does a dbt test work — what does "the test passed" actually mean?',
    a: `A dbt test compiles to a plain <code>select</code> that returns the <strong>rows that violate the rule</strong>. dbt runs it and counts the result: <strong>0 rows → pass; ≥1 row → fail</strong> (and the returned rows are the evidence, stored so you can inspect exactly what broke).
    <ul>
      <li>A <strong>generic test</strong> (<code>not_null</code>, <code>unique</code>, …) is a reusable macro that templates that query for a given model/column.</li>
      <li>A <strong>singular test</strong> is a <code>.sql</code> file in <code>tests/</code> you write yourself — any query whose returned rows mean "something is wrong."</li>
    </ul>
    So "passed" never means "dbt checked and it's fine" in some abstract sense — it means "the failures query came back empty." That is why a test is only as good as the query behind it.`,
    tip: 'Say "pass = the failures query returns zero rows." It reframes testing from magic to SQL, and it is exactly what the Lab tab shows.',
  },
  {
    q: 'What is the difference between a data test and a model contract, and when do you need each?',
    a: `<strong>Data test</strong> — runs <em>after</em> the model builds, querying its output for bad <em>values</em> (nulls, duplicates, orphaned FKs, out-of-range numbers). It guarantees <strong>content</strong>.
    <br><br>
    <strong>Model contract</strong> (<code>contract: {enforced: true}</code> with a declared <code>columns</code> block) — enforced <em>at build time</em>. dbt builds the relation with exactly the declared column names and data types; if the model's SQL would produce a different shape, the <code>create</code> fails before any rows exist. It guarantees <strong>schema/shape</strong>.
    <br><br>
    <strong>When:</strong> use contracts on models other teams or BI tools depend on, where a surprise column rename or type change would break consumers — you want that caught at the boundary, not three models downstream. Use data tests everywhere for value-level quality. They're complementary, not alternatives.`,
    tip: 'Shape vs content is the crisp framing. Add "contracts fail the create; data tests fail after the create" to show you know they act at different stages.',
  },
  {
    q: 'How does `dbt build` sequence tests relative to models, and why does that matter vs `dbt run` then `dbt test`?',
    a: `<code>dbt build</code> interleaves resources in DAG order: it builds a model, immediately runs that model's tests, and only proceeds to its <strong>downstream children if those tests pass</strong>. A failing <code>error</code>-severity test causes the children to be <strong>skipped</strong>.
    <br><br>
    Contrast with <code>dbt run</code> followed by <code>dbt test</code>: <code>run</code> builds the <em>entire</em> project first, then <code>test</code> checks everything. By the time a test fails, the bad data has already propagated into every downstream table — the dashboards are already wrong; you just find out afterwards.
    <br><br>
    So <code>build</code> turns tests into a <strong>circuit breaker</strong> (stop the blast radius), while <code>run</code>+<code>test</code> makes them a <strong>post-hoc alarm</strong>. For production deploys, <code>build</code> is almost always what you want.`,
    tip: 'Circuit breaker vs post-hoc alarm is the memorable contrast. Mention that build skips (not fails) downstream children — the precise behaviour.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Core Features',
    title: 'dbt Tests',
    subtitle: 'Bad data gets caught before it reaches the CEO dashboard. Watch the test gate in action.',
    tabs: [
      { id: 'visual', label: '🎬 Test Gate' },
      { id: 'lab',    label: '🔬 Lab · Break a test' },
      { id: 'detail', label: '📋 How Tests Work' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Lab F · Break a test ──────────────────────────────────────────────────────
// Inject bad records into fct_orders and watch each generic/singular test catch
// them. Every test is the actual failures-returning query dbt would run; a test
// passes when that query returns zero rows. Deterministic evaluation against a
// tiny in-memory table — no warehouse. Run the real thing in the Coding Studio.
const esc11 = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DIM_CUSTOMERS = [10, 11, 12, 13];
const ACCEPTED = ['placed', 'shipped', 'completed', 'returned'];
const BASE_ROWS = [
  { order_id: 1, customer_id: 10, status: 'placed',    amount: 40 },
  { order_id: 2, customer_id: 11, status: 'shipped',   amount: 15 },
  { order_id: 3, customer_id: 12, status: 'completed', amount: 80 },
  { order_id: 4, customer_id: 10, status: 'returned',  amount: 25 },
];
const INJECTIONS = [
  { id: 'null_pk',    label: 'NULL order_id',               row: { order_id: null, customer_id: 11, status: 'placed',    amount: 12 } },
  { id: 'dup_pk',     label: 'duplicate order_id = 2',      row: { order_id: 2,    customer_id: 12, status: 'shipped',   amount: 30 } },
  { id: 'bad_status', label: `status = 'maybe'`,            row: { order_id: 5,    customer_id: 12, status: 'maybe',     amount: 20 } },
  { id: 'orphan_fk',  label: 'customer_id = 99 (no parent)', row: { order_id: 6,   customer_id: 99, status: 'placed',    amount: 50 } },
  { id: 'neg_amount', label: 'amount = -5',                 row: { order_id: 7,    customer_id: 13, status: 'completed', amount: -5 } },
];
const REL = '"analytics"."fct_orders"';

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  const on = {}; INJECTIONS.forEach(i => on[i.id] = false);

  tab.innerHTML = `
    <div class="cf-lab">
      <div class="cf-lab-intro">
        <strong>Break a test on purpose.</strong> Inject bad rows into <code>fct_orders</code> and run the
        test suite. Each test is the real failures query dbt issues — it <em>passes</em> when that query
        returns zero rows. <code>status</code>'s test is configured <code>severity: warn</code>; the rest are
        <code>error</code>. Watch which ones block a deploy.
        <span class="cf-sim">🧪 Deterministic evaluation against a tiny table — no warehouse. Run real tests in <a href="#studio" style="color:inherit;text-decoration:underline">Coding Studio</a>.</span>
      </div>
      <div class="cf-controls" id="m11-inject">
        ${INJECTIONS.map(i => `<label class="cf-field" style="flex-direction:row;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" data-inj="${i.id}" style="accent-color:var(--accent)"> <span>Inject: ${i.label}</span></label>`).join('')}
      </div>
      <div class="cf-two">
        <div class="cf-pane"><div class="cf-pane-h">fct_orders · model output</div>
          <div style="overflow-x:auto;padding:10px"><table class="cf-simtable" id="m11-data"></table></div></div>
        <div class="cf-pane"><div class="cf-pane-h">dbt test · results</div>
          <div style="padding:10px" id="m11-results"></div></div>
      </div>
      <div class="cf-readout" id="m11-verdict"></div>
    </div>`;

  const rows = () => {
    const r = BASE_ROWS.map(x => ({ ...x, bad: null }));
    INJECTIONS.forEach(i => { if (on[i.id]) r.push({ ...i.row, bad: i.id }); });
    return r;
  };

  // Each test → { name, type, severity, sql, fails(rows) → failing row array }
  const TESTS = [
    { name: 'not_null(order_id)', type: 'generic', severity: 'error',
      sql: `select order_id\nfrom ${REL}\nwhere order_id is null`,
      fails: rs => rs.filter(r => r.order_id === null || r.order_id === undefined) },
    { name: 'unique(order_id)', type: 'generic', severity: 'error',
      sql: `select order_id\nfrom ${REL}\nwhere order_id is not null\ngroup by order_id\nhaving count(*) > 1`,
      fails: rs => {
        const c = {}; rs.forEach(r => { if (r.order_id != null) c[r.order_id] = (c[r.order_id] || 0) + 1; });
        const bad = new Set(Object.keys(c).filter(k => c[k] > 1).map(Number));
        return rs.filter(r => bad.has(r.order_id));
      } },
    { name: 'accepted_values(status)', type: 'generic', severity: 'warn',
      sql: `select status\nfrom ${REL}\nwhere status not in ('placed','shipped','completed','returned')`,
      fails: rs => rs.filter(r => !ACCEPTED.includes(r.status)) },
    { name: 'relationships(customer_id → dim_customers)', type: 'generic', severity: 'error',
      sql: `select o.customer_id\nfrom ${REL} o\nleft join "analytics"."dim_customers" c\n    on o.customer_id = c.customer_id\nwhere c.customer_id is null and o.customer_id is not null`,
      fails: rs => rs.filter(r => r.customer_id != null && !DIM_CUSTOMERS.includes(r.customer_id)) },
    { name: 'assert_positive_amount (singular)', type: 'singular', severity: 'error',
      sql: `-- tests/assert_positive_amount.sql\nselect order_id, amount\nfrom ${REL}\nwhere amount <= 0`,
      fails: rs => rs.filter(r => r.amount <= 0) },
  ];

  function render() {
    const rs = rows();

    // data table
    container.querySelector('#m11-data').innerHTML = `
      <thead><tr><th>order_id</th><th>customer_id</th><th>status</th><th>amount</th></tr></thead>
      <tbody>${rs.map(r => `<tr class="${r.bad ? 'cf-row-miss' : ''}">
        <td>${r.order_id === null ? '<span style="color:var(--error)">NULL</span>' : r.order_id}</td>
        <td>${r.customer_id}</td><td>${esc11(r.status)}</td><td>${r.amount}</td></tr>`).join('')}</tbody>`;

    // results
    let errors = 0, warns = 0, passed = 0;
    const html = TESTS.map(t => {
      const f = t.fails(rs);
      const failed = f.length > 0;
      if (!failed) passed++; else if (t.severity === 'error') errors++; else warns++;
      const badge = !failed ? `<span class="cf-tag new">PASS</span>`
        : t.severity === 'error' ? `<span class="cf-tag miss">FAIL · error</span>`
        : `<span class="cf-tag dup">WARN</span>`;
      return `<details class="cf-det"${failed ? ' open' : ''}><summary>${badge} &nbsp;<code>${esc11(t.name)}</code>${failed ? ` — ${f.length} failing row(s)` : ''}</summary>
        <p style="color:var(--text-3);font-size:11.5px;margin:10px 0 4px">The query dbt runs (passes when it returns 0 rows):</p>
        <pre style="margin:0 0 8px;font-family:var(--font-mono);font-size:11.5px;white-space:pre-wrap;color:var(--text)">${esc11(t.sql)}</pre>
        ${failed ? `<p style="color:var(--text-3);font-size:11.5px;margin:0 0 4px">Returned ${f.length} row(s):</p>
          <table class="cf-simtable"><thead><tr>${Object.keys(f[0]).filter(k => k !== 'bad').map(k => `<th>${k}</th>`).join('')}</tr></thead>
          <tbody>${f.map(r => `<tr class="cf-row-miss">${Object.keys(r).filter(k => k !== 'bad').map(k => `<td>${r[k] === null ? 'NULL' : esc11(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
      </details>`;
    }).join('');
    container.querySelector('#m11-results').innerHTML = html;

    // verdict
    const ro = container.querySelector('#m11-verdict');
    const blocked = errors > 0;
    ro.className = `cf-readout ${errors === 0 && warns === 0 ? 'ok' : 'bad'}`;
    ro.innerHTML = `
      <div class="cf-ro-head">${blocked ? '⛔' : warns > 0 ? '⚠️' : '✅'} dbt test — ${passed} passed · ${errors} error${errors !== 1 ? 's' : ''} · ${warns} warning${warns !== 1 ? 's' : ''}</div>
      <div class="cf-ro-row ${blocked ? 'err' : warns > 0 ? 'warn' : 'ok'}">
        ${blocked
          ? `Deploy is <strong>BLOCKED</strong>. An <code>error</code>-severity test failed — <code>dbt build</code> stops and downstream models of this one are skipped, so the bad data never reaches a dashboard. Fix the data or the model, then re-run.`
          : warns > 0
            ? `Deploy <strong>proceeds</strong>, but <code>${warns}</code> warning(s) were recorded. <code>severity: warn</code> surfaces the issue without blocking — use it for borderline cases you want to monitor, not ignore.`
            : `All tests pass — zero failing rows across the suite. This is the gate that keeps bad data out of production.`}
      </div>`;
  }

  tab.querySelector('#m11-inject').addEventListener('change', e => {
    const cb = e.target.closest('input[data-inj]'); if (!cb) return;
    on[cb.dataset.inj] = cb.checked; render();
  });
  render();
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 820 * DPR; cv.height = 420 * DPR;
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
  ctx.scale(DPR, DPR);
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
      <div class="code-block" data-lang="yaml"># schema.yml — tests are declared next to the model, not in a separate framework
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
        <div class="info-card" style="border-left-color:var(--info)">
          <div class="info-card-title">dbt test</div>
          <div class="info-card-tag" style="color:var(--info);background:color-mix(in srgb, var(--info) 13%, transparent)">On demand</div>
          <div class="info-card-body">Run all tests manually. Pass <code>--select model_name</code> to test only one model. Use for debugging a specific data quality issue.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--success)">
          <div class="info-card-title">dbt build</div>
          <div class="info-card-tag" style="color:var(--success);background:color-mix(in srgb, var(--success) 13%, transparent)">Build + test</div>
          <div class="info-card-body">Runs models AND their downstream tests in a single command. A model is only marked successful if its tests pass. The production-safe way to deploy.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--warn)">
          <div class="info-card-title">CI Gate</div>
          <div class="info-card-tag" style="color:var(--warn);background:color-mix(in srgb, var(--warn) 13%, transparent)">Pre-merge</div>
          <div class="info-card-body">GitHub Actions runs <code>dbt build --target staging</code> on every PR. A failing test blocks the merge. Nothing bad reaches prod without passing CI.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--purple)">
          <div class="info-card-title">Severity levels</div>
          <div class="info-card-tag" style="color:var(--purple);background:color-mix(in srgb, var(--purple) 13%, transparent)">Flexibility</div>
          <div class="info-card-body"><code>severity: error</code> (default) fails the run. <code>severity: warn</code> logs but continues. Use warn for known borderline cases while you investigate root causes.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Custom singular tests for business logic</h3>
      <p>Generic tests cover structural quality (nulls, uniqueness). Singular tests cover business logic that can't be expressed as column-level assertions.</p>
      <div class="code-block" data-lang="sql">-- tests/no_refund_exceeds_order.sql
-- A singular test = a SELECT that returns the BAD rows. 0 rows = pass.
SELECT r.order_id, r.refund_amount, o.order_total
FROM {{ ref('fct_refunds') }} r
JOIN {{ ref('fct_orders') }} o USING (order_id)
WHERE r.refund_amount > o.order_total</div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>Every test is a "return the failures" query</summary>
        <p>There is no special test engine. A dbt test compiles to a <code>select</code> that returns the <strong>failing rows</strong>; the test <strong>passes when that query returns zero rows</strong>. A generic test like <code>not_null</code> is a macro that templates <code>select … where column is null</code>; a singular test is a hand-written <code>.sql</code> file in <code>tests/</code> that does the same. That is the whole model — see each compiled query live in the Lab tab.</p>
      </details>
      <details class="cf-det"><summary>severity, error_if / warn_if, and the deploy gate</summary>
        <p>A test's <code>severity</code> decides what a failure <em>does</em>: <code>error</code> (default) fails the run and, under <code>dbt build</code>, skips the tested model's downstream children so bad data can't propagate; <code>warn</code> records the failure but lets the run proceed. You can make severity conditional with thresholds: <code>error_if: "&gt;100"</code>, <code>warn_if: "&gt;0"</code> — warn on any failures, but only hard-fail once more than 100 rows are bad. Use <code>warn</code> for borderline/legacy data you want visible but not blocking.</p>
      </details>
      <details class="cf-det"><summary>Data tests vs model contracts (not the same thing)</summary>
        <p>A <strong>data test</strong> runs <em>after</em> a model is built and inspects its rows (did any slip through?). A <strong>model contract</strong> (<code>contract: {enforced: true}</code> + a declared <code>columns</code> spec) is enforced <em>at build time</em>: dbt tells the warehouse to create the relation with exactly those column names and data types, so a mismatch fails the <code>create</code> itself — before any row exists. Contracts guarantee <em>shape</em> (schema); data tests guarantee <em>content</em> (values). Mature projects use both.</p>
      </details>
      <details class="cf-det"><summary>The <code>where</code> and <code>limit</code> test configs</summary>
        <p><code>config: {where: "created_at &gt; '2024-01-01'"}</code> scopes a test to a subset — useful when legitimately-dirty historical data would otherwise fail a correct test forever. <code>limit</code> caps how many failing rows are returned (the test still fails, but stores fewer rows). Both keep tests actionable rather than permanently red.</p>
      </details>
    </div>
    <div class="detail-section">
      <h3>What problem did dbt tests solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Bad data used to reach production silently and surface in a board meeting. dbt tests create a quality gate that runs automatically on every deployment — no custom monitoring infrastructure required.</p>
    </div>
  `;
}
