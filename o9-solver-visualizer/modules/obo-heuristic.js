import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';
import { sortDemands } from '../sim/scs-engine.js';

export const IQ = [
  { q: 'Is the o9 Supply Chain Solver an optimiser (LP/MIP) or a heuristic, and why does it matter?',
    a: 'It is a <strong>heuristic</strong>. It plans one demand at a time, in a fixed priority order, honouring hard constraints and relaxing soft ones per the Objective Rank List — rather than solving one global cost function. This makes it fast and predictable at the scale of a real network, and fully explainable: every unit traces to a priority and a constraint. The trade-off is a good, rule-consistent plan, not a provably optimal one.',
    tip: 'Say “the Objective Rank List IS the objective” — there is no hidden cost model overruling the order.' },
  { q: 'Two equally-shippable demands need the same scarce stock on the same day. Which one is served, and why?',
    a: 'The <strong>higher-priority</strong> demand, because it is planned first. Planning is strictly sequential: the first demand consumes the available stock, and the next demand sees only what remains. Quantity, due date and key are tie-breakers <em>after</em> priority (and fair-share priority).',
    tip: 'This is the whole point of OBO — reorder the demands and you change who is met on time.' },
  { q: 'What are the three timing phases the solver tries for each demand, and in what order?',
    a: '<strong>JIT → Build-Ahead → Build-Late.</strong> It first tries to arrive exactly on the due date (JIT). If that is infeasible it builds earlier and carries stock, up to the Build-Ahead Limit. If still unmet it allows late supply up to the Build-Late Limit, minimising lateness. Past the Build-Late Limit the demand is short and gets an RCA reason.',
    tip: 'BAL and BLL are how planners trade service level against inventory and shortages without changing solver logic.' },
];

// Pre-sorted demand set for the animation (priority order).
const PLAN = [
  { key: 'D-High', priority: 1, need: 50 },
  { key: 'D-Mid',  priority: 2, need: 40 },
  { key: 'D-Low',  priority: 3, need: 50 },
];
const DC_START = 60;

// Demand set for the engine-driven sort demo.
const DEMANDS = [
  { key: 'SO-1001', cust: 'Dealer-A', priority: 2, fairShare: 1, dueDate: '2026-02-10', qty: 120 },
  { key: 'SO-1002', cust: 'Dealer-B', priority: 1, fairShare: 1, dueDate: '2026-02-14', qty: 50 },
  { key: 'SO-1003', cust: 'Dealer-C', priority: 1, fairShare: 1, dueDate: '2026-02-09', qty: 80 },
  { key: 'SO-1004', cust: 'Dealer-D', priority: 2, fairShare: 1, dueDate: '2026-02-10', qty: 200 },
  { key: 'SO-1005', cust: 'Dealer-E', priority: 1, fairShare: 2, dueDate: '2026-02-05', qty: 300 },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Meet the Solver',
    title: 'The Order-by-Order Heuristic',
    subtitle: 'Plan one demand at a time, in priority order, backward from customer to supplier — watch priority order decide who is met Just-In-Time and who is forced late.',
    tabs: [
      { id: 'solve',  label: '🔁 Solve Animation' },
      { id: 'sort',   label: '↕️ Demand Sort' },
      { id: 'phases', label: '⏱️ Three Phases' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildSolve(container);
  buildSort(container);
  buildPhases(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the animated order-by-order solve ─────────────────────────────────
function buildSolve(container) {
  const tab = container.querySelector('#tab-solve');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The DC holds <b>${DC_START} units</b>. Three demands for the same item, same due date, want it — <b>D-High</b> (priority 1), <b>D-Mid</b> (2), <b>D-Low</b> (3). Press <b>Plan Next Demand</b> to plan them one at a time, in priority order. Each pill travels <b>Demand → LC-Store → DC</b>; if the DC runs dry it continues to the <b>Supplier</b> and is planned <b>Build-Late</b>.</div>
      <canvas id="obo-canvas" width="820" height="320" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="obo-next">▶ Plan Next Demand</button>
        <button class="ctrl-btn" id="obo-all">⚡ Run Full Solve</button>
        <button class="ctrl-btn" id="obo-reset">↺ Reset</button>
        <span class="ctrl-label" id="obo-status">DC on-hand: ${DC_START} · 0 of ${PLAN.length} demands planned</span>
      </div>
      <div id="obo-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The solver never looks at all three demands together. It takes the <strong>highest-priority</strong> demand first and plans it to completion — consuming on-hand at the DC (a <strong>Just-In-Time</strong> fill) — <em>before it even considers the next one.</em> By the time the lowest-priority demand is planned, the shared 60 units may be gone, so it is pushed upstream to the supplier and met <strong>Build-Late</strong> (or short).</p>
      <p>This is the whole model in one picture: <strong>the order of planning decides the outcome.</strong> There is no global optimiser re-balancing fairness — change the priorities (the Objective Rank List) and you change who wins the scarce supply. That is why demand sorting, not arithmetic, is the heart of the solver.</p>
      <p><strong>Interview angle:</strong> if asked “why did a high-value order ship late while a small one shipped on time?”, the answer is almost always <em>priority order</em> — the small order was simply planned first and took the last of the on-hand stock.</p>
    </div>`;

  const canvas = tab.querySelector('#obo-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const nodes = [
    { id: 'demand',   x: 40,  y: 140, w: 120, h: 56, label: 'Demand',    color: '#A78BFA', cx: 100 },
    { id: 'lc',       x: 240, y: 140, w: 120, h: 56, label: 'LC-Store',  color: '#38BDF8', cx: 300 },
    { id: 'dc',       x: 440, y: 140, w: 140, h: 56, label: 'DC',        color: '#6366F1', cx: 510 },
    { id: 'supplier', x: 660, y: 140, w: 130, h: 56, label: 'Supplier',  color: '#F59E0B', cx: 725 },
  ];
  const sub = { demand: 'priority queue', lc: 'demand node', dc: '', supplier: 'lead time 8d' };
  const YC = 168;

  let state = fresh();
  function fresh() { return { dcOnHand: DC_START, idx: 0, ledger: [], packets: [], flashDC: 0, flashSup: 0 }; }

  function renderLedger() {
    const el = tab.querySelector('#obo-ledger');
    el.innerHTML = state.ledger.map(r => `
      <div class="info-card" style="border-left:3px solid ${r.color}">
        <div class="info-card-title">${r.key} <span class="pill ${r.pill}">P${r.priority}</span></div>
        <div class="info-card-body">${r.text}</div>
      </div>`).join('');
    const st = tab.querySelector('#obo-status');
    if (st) st.textContent = `DC on-hand: ${state.dcOnHand} · ${state.idx} of ${PLAN.length} demands planned`;
  }

  function planNext() {
    if (state.idx >= PLAN.length) return;
    const d = PLAN[state.idx++];
    const fromDC = Math.min(d.need, state.dcOnHand);   // JIT portion from on-hand
    const shortfall = d.need - fromDC;                  // must come late from supplier
    state.dcOnHand -= fromDC;

    const late = shortfall > 0;
    const color = late ? '#F59E0B' : '#10B981';
    const path = late
      ? [{ x: 100, y: YC }, { x: 300, y: YC }, { x: 510, y: YC }, { x: 725, y: YC }]
      : [{ x: 100, y: YC }, { x: 300, y: YC }, { x: 510, y: YC }];

    state.packets.push(new EventPacket({
      label: d.key, color, speed: 1.5, path,
      onArrive: () => { if (late) state.flashSup = 36; else state.flashDC = 30; },
    }));

    const text = late
      ? (fromDC > 0
          ? `${fromDC}/${d.need} met JIT from DC; <b style="color:#F59E0B">${shortfall} Build-Late</b> from supplier (arrives ~3 days late).`
          : `DC empty → <b style="color:#F59E0B">all ${d.need} Build-Late</b> from supplier.`)
      : `<b style="color:#10B981">${fromDC}/${d.need} met Just-In-Time</b> from DC on-hand.`;
    state.ledger.push({ key: d.key, priority: d.priority, pill: d.priority === 1 ? 'pill-green' : 'pill-amber', color, text });
    renderLedger();
  }

  function runAll() { const step = () => { if (state.idx < PLAN.length) { planNext(); setTimeout(step, 1300); } }; step(); }
  function reset() { state = fresh(); renderLedger(); }

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    if (state.flashDC > 0) state.flashDC--;
    if (state.flashSup > 0) state.flashSup--;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // connectors
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, YC); ctx.lineTo(240, YC);
    ctx.moveTo(360, YC); ctx.lineTo(440, YC);
    ctx.moveTo(580, YC); ctx.lineTo(660, YC);
    ctx.stroke(); ctx.setLineDash([]);

    // nodes
    nodes.forEach(n => {
      const flash = (n.id === 'dc' && state.flashDC > 0) || (n.id === 'supplier' && state.flashSup > 0);
      drawRoundRect(ctx, n.x, n.y, n.w, n.h, 10, flash ? n.color + '33' : '#111827', flash ? n.color : n.color + '99');
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = n.color;
      ctx.fillText(n.label, n.cx, n.y + 24);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#8A98AE';
      const s = n.id === 'dc' ? `on-hand: ${state.dcOnHand}` : sub[n.id];
      if (s) ctx.fillText(s, n.cx, n.y + 42);
    });

    // backward-flow hint
    ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.textAlign = 'center';
    ctx.fillText('◀ backward traversal: customer → supplier', 410, 120);

    state.packets.forEach(p => p.update(dt));
    state.packets.forEach(p => p.draw(ctx));
    while (state.packets.length > 12) state.packets.shift();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#obo-next').addEventListener('click', planNext);
  tab.querySelector('#obo-all').addEventListener('click', () => { reset(); runAll(); });
  tab.querySelector('#obo-reset').addEventListener('click', reset);
  renderLedger();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: engine-driven demand sort ─────────────────────────────────────────
function demandRows(list, ranked) {
  return list.map((d, i) => `
    <tr>
      <td>${ranked ? `<strong>${i + 1}</strong>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td><code>${d.key}</code> <span style="color:var(--text3)">· ${d.cust}</span></td>
      <td><span class="pill ${d.priority === 1 ? 'pill-green' : 'pill-amber'}">${d.priority}</span></td>
      <td>${d.fairShare}</td><td>${d.dueDate}</td><td>${d.qty}</td>
    </tr>`).join('');
}
function buildSort(container) {
  const tab = container.querySelector('#tab-sort');
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Step 1 — Sort the demands</div><div class="section-desc">Order: Priority → Fair-Share → Due Date → Quantity → key. The button runs the real, unit-tested engine function <code>sortDemands()</code> from <code>sim/scs-engine.js</code>.</div></div>
      <div class="table-scroll">
        <table class="compare-table" id="obo-sort-table">
          <thead><tr><th>Rank</th><th>Order</th><th>Priority</th><th>Fair-Share</th><th>Due Date</th><th>Qty</th></tr></thead>
          <tbody id="obo-sort-body">${demandRows(DEMANDS, false)}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px">
        <button class="ctrl-btn" id="obo-sort-run">▶ Run the engine sort</button>
        <button class="ctrl-btn" id="obo-sort-reset" hidden>↺ Reset</button>
        <span id="obo-sort-note" class="ctrl-label"></span>
      </div>
    </div>`;
  const run = tab.querySelector('#obo-sort-run'), rst = tab.querySelector('#obo-sort-reset');
  const body = tab.querySelector('#obo-sort-body'), note = tab.querySelector('#obo-sort-note');
  run.addEventListener('click', () => {
    const s = sortDemands(DEMANDS);
    body.innerHTML = demandRows(s, true);
    note.innerHTML = `Sorted. <b>${s[0].key}</b> (priority ${s[0].priority}) planned first; <b>${s[s.length-1].key}</b> last.`;
    run.hidden = true; rst.hidden = false;
  });
  rst.addEventListener('click', () => { body.innerHTML = demandRows(DEMANDS, false); note.textContent = ''; rst.hidden = true; run.hidden = false; });
}

// ── Tab 3: three phases ──────────────────────────────────────────────────────
function buildPhases(container) {
  const tab = container.querySelector('#tab-phases');
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three timing phases</div><div class="section-desc">Tried in order, per demand, during its backward traversal.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">1 · JIT</div><div class="info-card-body">Arrive <strong>exactly on the due date</strong>. First and best choice — no early carrying, no lateness.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">2 · Build-Ahead</div><div class="info-card-body">If JIT is infeasible, build <strong>earlier</strong> and carry stock — up to the <strong>Build-Ahead Limit (BAL)</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">3 · Build-Late</div><div class="info-card-body">If still unmet, allow <strong>late</strong> supply up to the <strong>Build-Late Limit (BLL)</strong>, minimising lateness. Past it → shortage + RCA.</div></div>
      </div>
      <div class="canvas-explainer"><h3>Why it matters</h3><p>In the Solve Animation, D-High gets <strong>JIT</strong> from on-hand, while D-Low is forced to <strong>Build-Late</strong> from the supplier — not because of anything about D-Low itself, but because the earlier, higher-priority demands already consumed the JIT-able stock.</p></div>
    </div>`;
}
