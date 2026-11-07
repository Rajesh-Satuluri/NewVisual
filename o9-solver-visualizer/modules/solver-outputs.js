import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, easeCubicOut } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'After a constrained SCS run, which output plans does the solver write, and what is the difference between the Demand Fulfilment Report and the Delivery Plan?',
    a: 'A successful run writes several plan/report tables. The <strong>Demand Fulfilment Report</strong> "<em>outlines the quantity of demand satisfied by the solver for an Order based on the available Inventory</em>" — its edge property <code>Demand Fulfilment Quantity</code> (SUM) stores, per Order/Demand, the amount that was <strong>fulfilled</strong> after the solver runs successfully. The <strong>Delivery Plan</strong> goes further: it is the key plan-analysis artefact that splits each demand into "<em>the quantity that is met on time in full, the quantity that is short and the quantity that is fulfilled late</em>". So fulfilment answers <em>how much did we satisfy</em>; the Delivery Plan answers <em>how well</em> — on-time vs late vs short. Alongside these the solver writes the <strong>Flow Plans</strong> (Material Consumption / Material Production / Capacity Consumption / Storage), the <strong>Inventory Plan</strong> (BOH / EOH profile per material node), and the <strong>Feasible WIP Plan Export</strong>. Root-cause (RCA) output is a separate concern.',
    tip: 'Fulfilment = "how much satisfied" (one quantity per order); Delivery Plan = "how well" (met-on-time / late / short split). Then name the flow, inventory and WIP plans.' },
  { q: 'A demand ends up partly short and partly late. Walk through the Delivery Plan measures that capture this, including how Weighted Late Quantity and Maximum Lateness Buckets are computed.',
    a: 'When a <strong>constrained</strong> plan runs, "<em>chances are that some demands may be short, or built late</em>", and SCS writes this into the Delivery Plan measures. The core four: <strong>Total MetOnTime Quantity</strong> (units satisfied in the JIT bucket), <strong>Total Short Quantity</strong> (quantity that could not be satisfied), <strong>Total Late Quantity</strong> (units built later than the requested time), and <strong>Weighted Late Quantity</strong> = <code>Sum(late qty × time buckets from current)</code> — the wiki example: <em>10 units late by 1 bucket and 1 unit late by 2 buckets ⇒ 10×1 + 1×2 = 12</em>. <strong>Maximum Lateness Buckets</strong> reports the largest lateness when a demand is split: <em>demand incident on T1, met partially in T2/T3/T4 ⇒ T4−T1 = 3</em>. There is also <strong>Commit Date</strong> (the committed bucket — last late bucket, or Target, or the max of the two) and <strong>Demand Planning Sequence</strong> (the order the solver planned the demands in). Post-processing rollups add counts — <em>Total Late Quantity Count</em>, <em>Total Short Quantity Count</em>, <em>Total Fulfilled Quantity</em>, etc.',
    tip: 'Met-on-time / Short / Late are the raw quantities; Weighted Late = Σ(late qty × buckets late) = 12 in the example; Max Lateness Buckets = last-met-bucket minus incidence bucket.' },
  { q: 'Contrast the Flow Plans with the Inventory Plan, and say what the Feasible WIP Plan Export and the Where-Used report each add.',
    a: 'The <strong>Flow Plans</strong> describe the <em>aggregate flow of goods across material nodes</em> and come in four: <strong>Material Consumption Plan</strong> (a row = "<em>in bucket T an activity A will consume N quantities of Item I … at Location L</em>"), <strong>Material Production Plan</strong> (produce N), <strong>Capacity Consumption Plan</strong> (consume C capacity of Resource R), and the <strong>Storage Plan</strong>. The <strong>Inventory Plan</strong> is the stock view at each material node: <strong>Beginning On Hand</strong> and <strong>Ending On Hand</strong> so planners see the profile — <em>what comes in as supply, what goes out as demand, what remains</em>. It is deliberately <em>not</em> written for a node with no demand, no consumption flow and no production flow incident on it. The <strong>Feasible WIP Plan Export</strong> tells the business "<em>how much WIP is feasible in constrained WIP planning</em>" via three measures — <strong>Feasible OnTime</strong>, <strong>Feasible Late</strong> (subject to WIP BLL) and <strong>InFeasible/Short</strong> (e.g. a 100-unit WIP that only plans 50 ⇒ 50 OnTime, 50 Infeasible). The <strong>Where-Used</strong> report is a structural traversal between two material nodes giving <strong>Cumulative Lead Time</strong>, <strong>Cumulative Yield</strong> (two 0.8 activities ⇒ 0.64) and <strong>Level</strong> (number of activities between them). RCA output is covered separately.',
    tip: 'Flow = movement (consume / produce / capacity / storage); Inventory = stock (BOH → EOH, skipped for nodes with no flow); Feasible WIP = ontime/late/infeasible; Where-Used = cumulative LT, yield, level between two nodes.' },
];

// ── palette ─────────────────────────────────────────────────────────────────
const BG = '#0A0E1A';
const GREEN = '#10B981', AMBER = '#F59E0B', RED = '#EF4444';
const VIOLET = '#A78BFA', BLUE = '#38BDF8', INDIGO = '#6366F1', SLATE = '#64748B';

// ── the output-plan scenarios (each writes a set of rows) ────────────────────
const SCEN = {
  fulfilment: {
    label: 'Demand Fulfilment Report',
    caption: 'Per-Order <b>quantity of demand satisfied</b> by the solver, based on available inventory. Edge: <code>Demand Fulfilment Quantity</code> (SUM).',
    max: 120,
    rows: [
      { name: 'Order_1 · FG_1,DC_1 · W05', segs: [{ v: 100, c: GREEN, k: 'Fulfilled' }] },
      { name: 'Order_2 · FG_2,DC_1 · W06', segs: [{ v: 80, c: GREEN, k: 'Fulfilled' }] },
      { name: 'Order_3 · FG_1,DC_2 · W07', segs: [{ v: 90, c: GREEN, k: 'Fulfilled' }, { v: 30, c: RED, k: 'Not fulfilled' }] },
    ],
    ledger: [
      { color: GREEN, title: 'Demand Fulfilment Quantity', body: 'The report "outlines the quantity of demand satisfied by the solver for an Order based on the available Inventory". The edge stores, per Order/Demand, the quantity <b>fulfilled</b> after a successful run.' },
      { color: SLATE, title: 'Grain', body: 'Written at <b>Order × Fiscal Week × Material Node</b> (Item × Location), optionally by Customer. Configured as a graph; the measure name is set in the <em>Demand</em> tab of the SCS Config UI.' },
      { color: RED, title: 'Order_3 partly unfulfilled', body: '90 of 120 units were satisfied — the fulfilment report records the fulfilled quantity; the shortfall shows up in the <b>Delivery Plan</b> as short/late.' },
    ],
  },
  delivery: {
    label: 'Delivery Plan',
    caption: 'Each demand split into <b style="color:#10B981">Met on time</b> / <b style="color:#F59E0B">Late</b> / <b style="color:#EF4444">Short</b>. In a constrained plan, demands may be short or built late.',
    max: 100,
    rows: [
      { name: 'D1 · W05', segs: [{ v: 100, c: GREEN, k: 'Met on time' }] },
      { name: 'D2 · W06', segs: [{ v: 60, c: GREEN, k: 'Met on time' }, { v: 40, c: AMBER, k: 'Late' }] },
      { name: 'D3 · W07', segs: [{ v: 50, c: GREEN, k: 'Met on time' }, { v: 30, c: AMBER, k: 'Late' }, { v: 20, c: RED, k: 'Short' }] },
    ],
    ledger: [
      { color: GREEN, title: 'Total MetOnTime Quantity', body: 'Units of demand satisfied in the <b>JIT bucket</b> — met on time, in full.' },
      { color: AMBER, title: 'Total Late + Weighted Late', body: '<b>Total Late Quantity</b> = units built later than requested. <b>Weighted Late</b> = Σ(late qty × buckets from current). Wiki example: 10 units late by 1 + 1 unit late by 2 = <b>12</b>.' },
      { color: RED, title: 'Total Short Quantity', body: 'If a demand cannot be satisfied at all, the quantity short is stored here. Counts (late/short/met) are rolled up as additional measures.' },
    ],
  },
  flow: {
    label: 'Flow Plans',
    caption: 'Aggregate <b>flow of goods across material nodes</b>. A row = "in bucket T, activity A consumes/produces N units of Item I at Location L". Four plans: Consumption, Production, Capacity, Storage.',
    max: 100,
    rows: [
      { name: 'Production · FG_1@Plant_1 · W05', segs: [{ v: 100, c: GREEN, k: 'Produced' }] },
      { name: 'Consumption · RM_1@Plant_1 · W04', segs: [{ v: 50, c: VIOLET, k: 'Consumed' }] },
      { name: 'Consumption · RM_2@Plant_1 · W04', segs: [{ v: 50, c: VIOLET, k: 'Consumed' }] },
      { name: 'Capacity · Final Assy · W05', segs: [{ v: 100, c: BLUE, k: 'Capacity used' }] },
    ],
    ledger: [
      { color: GREEN, title: 'Material Production Plan', body: 'A row means "in bucket T, activity A will <b>produce</b> N quantities of Item I (Lot x) at Location L". Written to the <em>Material Production Plan</em> measure (Manufacturing tab).' },
      { color: VIOLET, title: 'Material Consumption Plan', body: 'Mirror of production — activity A <b>consumes</b> N units of an input item. Aggregate delivery flows at a node can also be exported here.' },
      { color: BLUE, title: 'Capacity + Storage Plans', body: 'Capacity Consumption Plan records capacity C of Resource R consumed per bucket; the Storage Plan tracks stored material. Together they let planners validate the inventory balance at each node.' },
    ],
  },
  inventory: {
    label: 'Inventory Plan',
    caption: 'The <b>on-hand profile</b> at a material node across buckets. Solver writes <b>Beginning On Hand</b> and <b>Ending On Hand</b> so planners see supply in, demand out, and what remains.',
    max: 1000,
    unit: '',
    rows: [
      { name: 'W01 · FG_1@Factory (BOH 1000)', segs: [{ v: 1000, c: INDIGO, k: 'EOH' }] },
      { name: 'W02', segs: [{ v: 1000, c: INDIGO, k: 'EOH' }] },
      { name: 'W03 · ship 600 (min-lot)', segs: [{ v: 400, c: INDIGO, k: 'EOH' }] },
      { name: 'W04', segs: [{ v: 400, c: INDIGO, k: 'EOH' }] },
      { name: 'W05', segs: [{ v: 400, c: INDIGO, k: 'EOH' }] },
    ],
    ledger: [
      { color: INDIGO, title: 'BOH → EOH', body: 'The plan captures the starting <b>Beginning On Hand</b> and the <b>Ending On Hand</b> for each material node that took part in planning, bucket by bucket — the inventory profile.' },
      { color: SLATE, title: 'When it is written', body: 'To avoid export overhead, the Inventory Plan is <b>not</b> written for a node that has no demand, no consumption flow and no production flow incident on it. Measures live in the <em>Inventory</em> tab of SCS Config.' },
      { color: AMBER, title: 'Example profile', body: '1000 units BOH on FG_1@Factory; a 600-unit shipment (min-lot) drops EOH to 400. Expected receipts from an unconstrained run are not shown in a node\'s inventory plan.' },
    ],
  },
  wip: {
    label: 'Feasible WIP Plan Export',
    caption: 'How much WIP is <b>feasible</b> in constrained WIP planning. Three measures for a WIP lot: <b style="color:#10B981">Feasible OnTime</b>, <b style="color:#F59E0B">Feasible Late</b> (WIP BLL), <b style="color:#EF4444">InFeasible/Short</b>.',
    max: 100,
    rows: [
      { name: 'Production WIP Feasible OnTime', segs: [{ v: 50, c: GREEN, k: 'Feasible OnTime' }] },
      { name: 'Production WIP Feasible Late (BLL)', segs: [{ v: 0, c: AMBER, k: 'Feasible Late' }] },
      { name: 'Production WIP InFeasible (Short)', segs: [{ v: 50, c: RED, k: 'InFeasible' }] },
    ],
    ledger: [
      { color: SLATE, title: 'WIP_0 · 100 planned', body: 'Wiki example: WIP_0 for FG_1@Plant_1 (W05) is planned for 100, but only <b>50</b> can be built in constrained WIP planning. <code>WIP Production Qty = 100</code>.' },
      { color: GREEN, title: 'Feasible OnTime / Late', body: '<b>Feasible OnTime</b> = 50 units buildable on time. <b>Feasible Late</b> (here 0) exports feasible WIP built late, subject to the <b>WIP BLL</b>.' },
      { color: RED, title: 'InFeasible Quantity', body: 'The remaining <b>50</b> units cannot be planned — exported as Infeasible/Short so planners can add material or capacity. Covers Production, Consumption and Capacity Consumption WIPs.' },
    ],
  },
};
const ORDER = ['fulfilment', 'delivery', 'flow', 'inventory', 'wip'];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Outputs & Diagnostics',
    title: 'Solver Outputs',
    subtitle: 'When an SCS run finishes it writes its answer as a set of plans and reports: the Demand Fulfilment Report, the Delivery Plan, the Flow Plans, the Inventory Plan and the Feasible WIP Plan Export. Watch the solver write a plan row by row, and switch between the outputs to see what each one contains.',
    tabs: [
      { id: 'write', label: '📝 Writing the Plan' },
      { id: 'plans', label: '📋 The SCS output plans', content: plansTab() },
      { id: 'metrics', label: '📐 Delivery metrics & Where-Used', content: metricsTab() },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildWrite(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the output-writing animation ──────────────────────────────────────
function buildWrite(container) {
  const tab = container.querySelector('#tab-write');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption" id="out-caption"></div>
      <canvas id="out-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="out-run">▶ Run (write plan)</button>
        <button class="ctrl-btn" id="out-step">⏭ Step row</button>
        <button class="ctrl-btn" id="out-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Output plan:</span>
        <button class="ctrl-btn" data-scen="fulfilment">Demand Fulfilment</button>
        <button class="ctrl-btn" data-scen="delivery">Delivery Plan</button>
        <button class="ctrl-btn" data-scen="flow">Flow Plan</button>
        <button class="ctrl-btn" data-scen="inventory">Inventory Plan</button>
        <button class="ctrl-btn" data-scen="wip">Feasible WIP</button>
      </div>
      <div id="out-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each panel is one of the plans SCS exports after a run, written <strong>row by row</strong> the way the solver streams its output into the plan tables. Press <strong>Run</strong> to let the whole plan fill, or <strong>Step row</strong> to write one line at a time. Switch the <strong>Output plan</strong> buttons to see a different artefact of the same run.</p>
      <p>The <strong>Demand Fulfilment Report</strong> records how much of each order was satisfied. The <strong>Delivery Plan</strong> splits every demand into met-on-time, late and short. The <strong>Flow Plans</strong> show the aggregate movement of material and capacity across nodes. The <strong>Inventory Plan</strong> shows the on-hand (BOH → EOH) profile. The <strong>Feasible WIP Plan</strong> reports how much work-in-process is feasible, late or infeasible. Root-cause detail (RCA) is a separate output, covered in its own module.</p>
    </div>`;

  const canvas = tab.querySelector('#out-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const LABEL_X = 14, LABEL_W = 206;
  const BAR_X = 228, BAR_W = canvas.width - BAR_X - 96;
  const ROWS_TOP = 70, ROW_H = 40, BAR_H = 22;
  const RATE = 0.028;   // rows per frame while running

  let scenKey = 'delivery';
  let prog = 0;         // 0 .. nRows (rows written)
  let writing = false;
  let finished = false;
  let blink = 0;

  const scen = () => SCEN[scenKey];
  const nRows = () => scen().rows.length;
  const rowTotal = (r) => r.segs.reduce((s, g) => s + g.v, 0);

  function setLedger(cards) {
    tab.querySelector('#out-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function syncCaption() {
    tab.querySelector('#out-caption').innerHTML = `Output: <b>${scen().label}</b>. ${scen().caption} Press <b>Run</b> to write it, or <b>Step row</b>.`;
  }

  function reset() {
    writing = false; finished = false; prog = 0;
    syncCaption();
    setLedger([{ color: SLATE, title: scen().label, body: `${scen().rows.length} rows to write. Press <b>Run</b> to stream the whole plan, or <b>Step row</b> to write one line at a time.` }]);
  }

  function finish() {
    writing = false; finished = true; prog = nRows();
    setLedger(scen().ledger);
  }

  function run() { if (prog >= nRows()) prog = 0; finished = false; writing = true; }

  function step() {
    writing = false;
    prog = Math.min(nRows(), Math.floor(prog + 1e-6) + 1);
    if (prog >= nRows() && !finished) finish();
  }

  // draw one plan row: label + track + filled segments, revealed by `reveal` (0..1)
  function drawRow(r, i, reveal) {
    const y = ROWS_TOP + i * ROW_H;
    const alpha = Math.max(0, Math.min(1, reveal * 4));
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;

    // label
    ctx.textAlign = 'left'; ctx.font = '11px system-ui'; ctx.fillStyle = '#CBD5E1';
    const label = r.name.length > 34 ? r.name.slice(0, 33) + '…' : r.name;
    ctx.fillText(label, LABEL_X, y + BAR_H / 2 + 4);

    // track (full width = scenario max)
    const sc = scen();
    const scale = BAR_W / sc.max;
    drawRoundRect(ctx, BAR_X, y, BAR_W, BAR_H, 4, '#0d1424', '#1E293B');

    // filled segments
    const total = rowTotal(r);
    const filledW = total * scale * easeCubicOut(Math.max(0, Math.min(1, reveal)));
    let cur = 0;
    for (const g of r.segs) {
      const segW = g.v * scale;
      const drawn = Math.max(0, Math.min(filledW - cur, segW));
      if (drawn > 0.5) {
        drawRoundRect(ctx, BAR_X + cur, y, drawn, BAR_H, 4, g.c + 'dd', g.c);
        if (drawn > 30) {
          ctx.fillStyle = '#071018'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(String(g.v), BAR_X + cur + drawn / 2, y + BAR_H / 2 + 4);
        }
      }
      cur += segW;
    }
    // zero-value marker (e.g. Feasible Late = 0)
    if (total === 0 && reveal > 0.2) {
      ctx.fillStyle = '#475569'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('0', BAR_X + 6, y + BAR_H / 2 + 4);
    }

    // row total on the right
    if (reveal > 0.85) {
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(String(total), BAR_X + BAR_W + 10, y + BAR_H / 2 + 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawLegend() {
    // unique segment keys for the current scenario
    const seen = {};
    const items = [];
    for (const r of scen().rows) for (const g of r.segs) {
      if (!seen[g.k]) { seen[g.k] = 1; items.push(g); }
    }
    let x = LABEL_X;
    ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    for (const g of items) {
      ctx.fillStyle = g.c; ctx.fillRect(x, 16, 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(g.k, x + 15, 25);
      x += 22 + ctx.measureText(g.k).width;
    }
    // "writing…" indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = writing ? GREEN : (finished ? BLUE : SLATE);
    ctx.fillText(writing ? '● writing plan…' : (finished ? '✓ plan written' : '○ idle'), canvas.width - 14, 25);
  }

  let raf = null;
  function draw() {
    blink += 0.08;
    if (writing) {
      prog += RATE;
      if (prog >= nRows()) { prog = nRows(); finish(); }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // panel title
    ctx.textAlign = 'left'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText(scen().label, LABEL_X, 48);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('solver → plan table', LABEL_X + ctx.measureText(scen().label).width + 10, 48);

    drawLegend();

    // header rule above rows
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LABEL_X, ROWS_TOP - 8); ctx.lineTo(canvas.width - 14, ROWS_TOP - 8); ctx.stroke();

    const n = nRows();
    for (let i = 0; i < n; i++) {
      const reveal = Math.max(0, Math.min(1, prog - i));
      drawRow(scen().rows[i], i, reveal);
    }

    // blinking write caret on the row currently being written
    if (writing) {
      const i = Math.min(n - 1, Math.floor(prog));
      const r = scen().rows[i];
      const scale = BAR_W / scen().max;
      const filledW = rowTotal(r) * scale * easeCubicOut(Math.max(0, Math.min(1, prog - i)));
      const cx = BAR_X + Math.max(2, filledW);
      const y = ROWS_TOP + i * ROW_H;
      if (Math.sin(blink * 3) > 0) {
        ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, y - 2); ctx.lineTo(cx, y + BAR_H + 2); ctx.stroke();
      }
    }

    // footer readout
    ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`rows written ${Math.min(n, Math.round(prog))} / ${n}   ·   measure max ${scen().max}`, LABEL_X, canvas.height - 12);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scenKey = b.dataset.scen; reset(); }));
  tab.querySelector('#out-run').addEventListener('click', run);
  tab.querySelector('#out-step').addEventListener('click', step);
  tab.querySelector('#out-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: compare table of the output plans ─────────────────────────────────
function plansTab() {
  const rows = [
    ['Demand Fulfilment Report', 'Quantity of demand <em>satisfied</em> for each Order, based on available inventory.', '<code>Demand Fulfilment Quantity</code> (SUM) per Order × Week × Material Node.'],
    ['Delivery Plan', 'How well each demand was served — the key plan-analysis artefact.', 'MetOnTime, Short, Late, Weighted Late, Max Lateness Buckets, Commit Date, Demand Planning Sequence.'],
    ['Flow Plans', 'Aggregate flow of goods across material / capacity nodes.', 'Material Consumption, Material Production, Capacity Consumption, Storage Plan.'],
    ['Inventory Plan', 'On-hand profile at each material node, bucket by bucket.', 'Beginning On Hand, Ending On Hand (skipped for nodes with no flow).'],
    ['Feasible WIP Plan Export', 'How much WIP is feasible in constrained WIP planning.', 'Feasible OnTime, Feasible Late (WIP BLL), InFeasible/Short, WIP Production Qty.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The plans an SCS run writes</div><div class="section-desc">When the solver finishes, it streams its answer into a family of plan and report tables. Each answers a different question about the same run.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Output</th><th>What it is</th><th>What it contains</th></tr></thead>
          <tbody>${rows.map(([p, w, c]) => `<tr><td style="font-weight:600;color:var(--text)">${p}</td><td style="color:var(--text2)">${w}</td><td style="color:var(--text2)">${c}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Fulfilment vs Delivery</div><div class="info-card-body">The <strong>Demand Fulfilment Report</strong> stores <em>how much</em> of each order was satisfied. The <strong>Delivery Plan</strong> splits that into <em>met on time, late and short</em> — "when a constrained plan is run, chances are that some demands may be short, or built late", and the Delivery Plan is where that lands.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Flow Plans — the movement</div><div class="info-card-body">A row in the <strong>Material Consumption Plan</strong> means "in bucket T an activity A will consume N quantities of Item I … at Location L"; the <strong>Production</strong> and <strong>Capacity Consumption</strong> plans mirror it. Setting <code>Export Supplies as Flow Plans</code> also writes expected receipts and delivery flows so the inventory balance reconciles.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Inventory Plan — the stock</div><div class="info-card-body"><strong>Beginning On Hand</strong> and <strong>Ending On Hand</strong> per material node give the inventory profile. To save export overhead it is <em>not</em> written for a node with no demand, no consumption flow and no production flow incident on it.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Feasible WIP Plan</div><div class="info-card-body">Reports <strong>Feasible OnTime</strong>, <strong>Feasible Late</strong> (subject to WIP BLL) and <strong>InFeasible</strong> quantities so planners can act on infeasible supply or capacity — for Production, Consumption and Capacity Consumption WIPs.</div></div>
      </div>

      <div class="canvas-explainer"><h3>Where RCA fits</h3>
        <p>These plans say <em>what</em> the solver decided. When a demand is short or late and you need <em>why</em>, that is the job of the <strong>Root-Cause Analysis (RCA)</strong> output — a separate artefact covered in its own module, not here.</p>
      </div>
    </div>`;
}

// ── Tab 3: Delivery metrics + Where-Used report ──────────────────────────────
function metricsTab() {
  const dm = [
    ['Total MetOnTime Quantity', 'Units of the demand satisfied in the <strong>JIT bucket</strong> — met on time, in full.'],
    ['Total Short Quantity', 'If a demand is not satisfied, the quantity <strong>short</strong> for that demand.'],
    ['Total Late Quantity', 'Units of the demand <strong>built late</strong> (not satisfied in JIT) — met later than the requested time.'],
    ['Weighted Late Quantity', '<code>Σ(late qty × buckets from current)</code>. Example: 10 units late by 1 bucket + 1 unit late by 2 buckets = <strong>10×1 + 1×2 = 12</strong>.'],
    ['Maximum Lateness Buckets', 'Largest lateness when a demand is split. Incident on T1, met partly in T2/T3/T4 ⇒ <strong>T4 − T1 = 3</strong>.'],
    ['Commit Date', 'The committed bucket — the last late bucket, the Target bucket, or the max of the two (if a Target is defined).'],
    ['Demand Planning Sequence', 'The order the solver planned the demands in (OBO). D2 → D1 → D3 ⇒ sequence 1, 2, 3.'],
  ];
  const wu = [
    ['Cumulative Lead Time', 'Summation of the lead times of all activities between the two nodes (consumption edge of the From node → production edge of the To node).'],
    ['Cumulative Yield', 'Product of the yields of activities between the nodes. Two activities each at 0.8 yield ⇒ <strong>0.64</strong>.'],
    ['Level', 'Number of activities between the two nodes. Two activities ⇒ Level = <strong>2</strong>.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Delivery Plan metrics</div><div class="section-desc">The measures the Delivery Plan writes for each demand so planners can analyse shortness and lateness, high level first, then slice down.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Measure</th><th>What it means</th></tr></thead>
          <tbody>${dm.map(([m, d]) => `<tr><td style="font-weight:600;color:var(--text)">${m}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:16px">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Rollup counts</div><div class="info-card-body">Post-processing measures aggregate the raw quantities: <strong>Total Fulfilled</strong> (MetOnTime + Late), <strong>Total Late Short</strong> (Short + Late), and counts of demands that are late / short / met on time.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Short vs Late</div><div class="info-card-body"><strong>Short</strong> = never built. <strong>Late</strong> = built, but after the requested bucket. A single demand can be partly met, partly late and partly short all at once.</div></div>
      </div>

      <div class="section-header" style="margin-top:24px"><div class="section-title">The Where-Used report</div><div class="section-desc">A structural report (available to all o9 Platform users) that explains the relative placement of two material nodes in the network.</div></div>
      <div class="prose">
        <p>In a multi-tiered network with primary and alternate paths it is hard to see how two material nodes relate. The <strong>Where-Used report</strong> answers it: the solver does an <strong>upstream traversal from the To node toward the From node</strong>, lists the activities and their lead times, and reports three figures. It is enabled by a Boolean <em>Need where used</em> measure at the material node — and "when this flag is set for a material node, it is considered that all the nodes upstream of this also have this flag set".</p>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Figure</th><th>Definition</th></tr></thead>
          <tbody>${wu.map(([m, d]) => `<tr><td style="font-weight:600;color:var(--text)">${m}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:16px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Where-Used Capacity</div><div class="info-card-body">A variant relates a <strong>resource</strong> node to a material node. Cumulative Yield folds in the capacity qty-per: qty-per 2 and production qty-per 0.5 ⇒ cumulative yield 0.25 — "1 unit of capacity will produce 0.25 units of FG@DC".</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Path IDs</div><div class="info-card-body">The full path trail is written to a <strong>PathID Map</strong> graph. The solver logs how many paths it identified vs exported; runtime flags can cap path discovery or fail the run if the Path ID dimension has too few members.</div></div>
      </div>
    </div>`;
}
