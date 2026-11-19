import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What exactly is pegging in SCS, when does it run, and how does it differ from the Flow Plan?',
    a: 'Pegging gives <strong>planners the ability to link a demand to the supply that satisfies it</strong>, be it material or capacity. The wiki defines it as <em>"linking the quantities of item/resources that are produced/consumed at various material/capacity nodes across time buckets towards fulfilment of a particular order."</em> The key contrast with the <strong>Flow Plan</strong>: the Flow Plan gives information about the <em>aggregate</em> flow of goods across material nodes, whereas <strong>pegging tells you how many "units" are pegged to individual orders</strong> — the actual supply path a given order took through the network. Crucially, <strong>pegging is a <em>post-process</em></strong>: <em>"computed after the planning run and before the export."</em> It does not change the plan; it explains it. And <em>"SCS uses FIFO (first-in-first-out) pegging to match the producers to consumers on any node (material or capacity)."</em>',
    tip: 'Lead with: "pegging = links demand ⇄ the supply that fulfils it, as a post-process after planning, using FIFO." Flow Plan = aggregate flow; pegging = per-order traceability.' },
  { q: 'Walk through FIFO pegging versus Preferential (Pegging ID) pegging. When does Pegging ID win, and when is it overruled?',
    a: 'The solver <strong>always tries to maintain FIFO across the planning horizon</strong>. Preferential pegging is purely an <strong>intra-bucket tie-breaker</strong>: when multiple producers and consumers sit in the <em>same</em> bucket, ties are broken by <em>"assigning the lowest available pegging ID producer to the lowest available pegging ID consumer."</em> For Pegging ID, <strong>lower number = higher priority</strong>, and <em>consumptions do not need a pegging ID — they inherit the demand priority as pegging ID internally</em>. Enable it with the Boolean <code>Pegging Id Based Pegging</code> (default false). <strong>FIFO overrules it</strong>: in the non-chronological case, a BOH lot with pegging ID 1 is still pegged to the <em>earlier-due</em> demand because <em>"the solver will try to maintain the FIFO logic at all the times."</em> There is also the <strong>gap exception</strong>: <em>"In case of a gap between the start bucket and current bucket, irrespective of pegging ID, the onhand supplies get pegged first."</em> Finally, in <strong>Hard pegging / Class-based pegging the solver picks up the <em>latest</em> supplies</strong>, so earlier supplies stay available for lower-priority demands that may be JIT on earlier buckets.',
    tip: 'Pegging ID only breaks same-bucket ties (lower = higher priority); FIFO always wins across buckets; and the gap exception pegs on-hand first regardless of ID.' },
  { q: 'Name the pegging tables SCS produces, what "supply pegged to demand" means in each, and where leftover supply goes.',
    a: 'There are four core pegging graphs, all configured on the <strong>Manufacturing tab of the SCS Config UI</strong>, all with the <strong>Demand Node / [Order].[Order Name]</strong> as the "To" side: <strong>(1) Material Consumption Pegging</strong> (<code>Consumption_Pegging</code>) — the consumption path an order takes through intermediate material nodes; edge <em>Material consumption pegged quantity</em>. <strong>(2) Material Production Pegging</strong> — all production activities fulfilling the order, and it stores the constraint report; <em>when BOH is pegged to an order it means the order is fulfilled through existing stock; when Expected Receipts is pegged, it is fulfilled from projected supply</em>. <strong>(3) Capacity Consumption Pegging</strong> — the amount of capacity (<strong>Regular and Flex</strong>) consumed at resources per bucket for a unique order; edge <em>Capacity Pegged Quantity</em>, with <code>Overtime1</code>/<code>Overtime2</code> holding Flex Capacity / Capacity Band info. <strong>(4) Storage Pegging</strong> — unit-space of storage used per bucket, with <em>Band_1 / Band_2 Storage Pegged Quantity</em>. <strong>Leftover supply</strong>: <em>"the unutilized inventory is pegged to <strong>Inventory Demand</strong>"</em>, a mandatory member in the Customer and Order dimensions. For performance, the <strong><code>No Peggings</code></strong> flag (TRUE) skips exporting pegging info (constraint reports for non-JIT orders are still exported).',
    tip: 'Four tables: Material Consumption, Material Production, Capacity Consumption, Storage — all pegged to the Order. BOH pegged = from stock; ER pegged = from projected supply; leftover = Inventory Demand.' },
];

// ── palette ──────────────────────────────────────────────────────────────────
const BG = '#0A0E1A';
const INDIGO = '#6366F1', VIOLET = '#A78BFA', BLUE = '#38BDF8';
const GREEN = '#10B981', AMBER = '#F59E0B', RED = '#EF4444', SLATE = '#64748B';

// ── pegging scenarios, one per documented pegging kind ───────────────────────
// Each is a deterministic FIFO pegging result taken from the Pegging wiki.
const MODES = {
  material: {
    label: 'Material',
    node: 'Material Node · FG_1 @ Plant_1',
    blurb: 'Material Production / Consumption Pegging — BOH, Expected Receipts and fresh production pegged to the orders they fulfil.',
    supply: [
      { name: 'BOH · Lot1',       meta: 'On-hand stock · W1',       qty: 100, color: BLUE },
      { name: 'ER · Lot2',        meta: 'Expected Receipt · W1',    qty: 100, color: VIOLET },
      { name: 'Fresh · SCSo9Lot', meta: 'Fresh production · W6',    qty: 100, color: INDIGO },
    ],
    demand: [
      { name: 'Order D1', meta: 'W10 · priority 1', qty: 100 },
      { name: 'Order D2', meta: 'W10 · priority 2', qty: 150 },
      { name: 'Inventory Demand', meta: 'unused stock', qty: 50, inv: true },
    ],
    pegs: [
      { s: 0, d: 0, qty: 100, note: 'BOH ⇒ order filled from existing stock' },
      { s: 1, d: 1, qty: 100, note: 'ER ⇒ order filled from projected supply' },
      { s: 2, d: 1, qty: 50,  note: 'fresh production tops up D2 (partial fill)' },
      { s: 2, d: 2, qty: 50,  note: 'leftover supply ⇒ Inventory Demand' },
    ],
    invariant: 'D1 = 100, D2 = 100 + 50 = 150: the sum pegged to an order equals the quantity fulfilled. Every consumed unit is pegged — the 50 unused units of fresh supply are pegged to <b>Inventory Demand</b>.',
  },
  capacity: {
    label: 'Capacity',
    node: 'Capacity Node · Resource R1 @ Plant (W05)',
    blurb: 'Capacity Consumption Pegging — Regular capacity plus the Flex (Overtime) bands consumed for an order.',
    supply: [
      { name: 'Regular Capacity',    meta: 'R1 · W05 · 100 units', qty: 100, color: BLUE },
      { name: 'Overtime1 · Band1',   meta: 'R1 · W05 · Flex 50',   qty: 50,  color: VIOLET },
      { name: 'Overtime2 · Band2',   meta: 'R1 · W05 · Flex 50',   qty: 50,  color: AMBER },
    ],
    demand: [
      { name: 'Order D1', meta: 'W10 · needs 120', qty: 120 },
    ],
    pegs: [
      { s: 0, d: 0, qty: 100, note: 'Regular capacity consumed first' },
      { s: 1, d: 0, qty: 20,  note: 'Band1 Flex opened to cover the rest' },
    ],
    invariant: '100 Regular + 20 Band1 = 120 pegged to D1 (manufactured on W05). The remaining 30 of Band1 and all of Band2 are unused — <b>capacity expires at its bucket</b> and cannot be carried.',
  },
  lot: {
    label: 'Lot (Preferential)',
    node: 'Material Node · FG_1 @ Plant_1 · on-hand lots (W1)',
    blurb: 'Preferential Pegging using Pegging ID — the oldest on-hand lot (lowest Pegging ID) is pegged to the highest-priority demand.',
    supply: [
      { name: 'BOH · Lot2', meta: 'age 150d · Pegging ID 1', qty: 100, color: BLUE },
      { name: 'BOH · Lot3', meta: 'age 75d · Pegging ID 2',  qty: 100, color: VIOLET },
      { name: 'BOH · Lot1', meta: 'age 50d · Pegging ID 3',  qty: 100, color: INDIGO },
    ],
    demand: [
      { name: 'Order D1', meta: 'W10 · priority 1', qty: 100 },
      { name: 'Order D2', meta: 'W11 · priority 2', qty: 100 },
      { name: 'Order D3', meta: 'W12 · priority 3', qty: 100 },
    ],
    pegs: [
      { s: 0, d: 0, qty: 100, note: 'oldest lot (ID 1) ⇒ highest-priority D1' },
      { s: 1, d: 1, qty: 100, note: 'Lot3 ⇒ D2' },
      { s: 2, d: 2, qty: 100, note: 'newest lot (ID 3) ⇒ D3' },
    ],
    invariant: 'With preferential pegging the lots peg oldest-first: <b>Lot2 → D1, Lot3 → D2, Lot1 → D3</b>. Pegging ID only breaks ties — FIFO is always respected across buckets.',
  },
  storage: {
    label: 'Storage',
    node: 'Storage Node (illustrative)',
    blurb: 'Storage Pegging — unit-space of storage, plus Band_1 and Band_2 storage, pegged to the orders using it.',
    illustrative: true,
    supply: [
      { name: 'Storage (Regular)', meta: 'unit space', qty: 100, color: BLUE },
      { name: 'Band_1 Storage',    meta: 'flex space',  qty: 50,  color: VIOLET },
      { name: 'Band_2 Storage',    meta: 'flex space',  qty: 50,  color: AMBER },
    ],
    demand: [
      { name: 'Order D1', meta: 'JIT bucket', qty: 120 },
      { name: 'Order D2', meta: 'JIT bucket', qty: 40 },
    ],
    pegs: [
      { s: 0, d: 0, qty: 100, note: 'Storage Pegged Quantity' },
      { s: 1, d: 0, qty: 20,  note: 'Band_1 Storage Pegged Quantity' },
      { s: 1, d: 1, qty: 30,  note: 'Band_1 Storage ⇒ D2' },
      { s: 2, d: 1, qty: 10,  note: 'Band_2 Storage Pegged Quantity' },
    ],
    invariant: 'Storage Pegged Quantity + Band_1 + Band_2 records the unit-space used per bucket per order (numbers here are illustrative — the wiki gives no storage figures). If a demand is late or short, the storage constraint is reported in the <b>JIT bucket</b>.',
  },
};
const MODE_ORDER = ['material', 'capacity', 'lot', 'storage'];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'How It Solves',
    title: 'Pegging',
    subtitle: 'Pegging links a demand back to the supply that satisfies it. As a post-process after planning, SCS uses FIFO to match producers to consumers on every node — writing Material, Capacity, Storage and lot-level pegging tables that trace each order\'s supply path. Watch the peg links form one by one, and switch between the pegging kinds the solver documents.',
    tabs: [
      { id: 'peg',    label: '🔗 Live Pegging' },
      { id: 'tables', label: '📋 Pegging Tables', content: tablesTab() },
      { id: 'fifo',   label: '🔄 FIFO & Kinds', content: fifoTab() },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the live pegging animation ────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-peg');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Supply records (<b style="color:#38BDF8">producers</b>) on the left, demand records (<b style="color:#10B981">orders / consumers</b>) on the right. Pegging is a <b>post-process</b> that draws a <b>peg link</b> from each unit of supply to the order it fulfils, in <b>FIFO</b> order. Pick a pegging kind, then <b>Run</b> to form the pegs, or <b>Step</b> one at a time.</div>
      <canvas id="peg-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="peg-run">▶ Run (peg supply → demand)</button>
        <button class="ctrl-btn" id="peg-step">⏭ Step</button>
        <button class="ctrl-btn" id="peg-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Pegging kind:</span>
        <button class="ctrl-btn" data-mode="material">Material</button>
        <button class="ctrl-btn" data-mode="capacity">Capacity</button>
        <button class="ctrl-btn" data-mode="lot">Lot · Preferential</button>
        <button class="ctrl-btn" data-mode="storage">Storage</button>
      </div>
      <div id="peg-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>After the plan is built, SCS runs pegging to <strong>link demand to its incoming supply</strong>. On any node — material or capacity — it matches producers to consumers using <strong>FIFO (first-in-first-out)</strong>, then writes the result into the pegging tables. Each arrow is one peg: it says <em>this much of this supply fulfilled this order</em>. For <strong>Material</strong>, pegging a BOH lot means the order is met from existing stock, an ER means it is met from projected supply, and any <strong>leftover supply is pegged to Inventory Demand</strong>. For <strong>Capacity</strong>, Regular capacity is pegged first, then the Flex <strong>Overtime bands</strong>; unused capacity simply expires. For <strong>Lot (Preferential)</strong>, the <code>Pegging Id Based Pegging</code> tie-breaker pegs the oldest lot (lowest Pegging ID) to the highest-priority demand — but FIFO always wins across buckets.</p>
      <p>The invariant to remember: the <strong>sum of the quantities pegged to an order equals the quantity of that order the plan fulfilled</strong>, and every consumed unit of supply is pegged to some order (leftover stock to Inventory Demand). Pegging never invents supply — it only explains the plan.</p>
    </div>`;

  const canvas = tab.querySelector('#peg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const LX = 36, RX = 564, CARD_W = 200;
  const LX2 = LX + CARD_W;   // right edge of supply cards
  const TOP = 66, BOT = 288, GAP = 14, MAXH = 76;

  function layout(n) {
    let h = (BOT - TOP - (n - 1) * GAP) / n;
    h = Math.min(MAXH, h);
    const total = n * h + (n - 1) * GAP;
    const start = TOP + ((BOT - TOP) - total) / 2;
    return { h, y: (i) => start + i * (h + GAP) };
  }

  let mode = 'material';
  let pegIndex = 0;      // completed pegs
  let progress = 0;      // 0→1 for the currently-forming peg
  let running = false;
  let stopAtNext = false;
  const SPEED = 0.028;

  function M() { return MODES[mode]; }
  function pegs() { return M().pegs; }

  // how much of demand d / supply s is pegged at the current animation state
  function demPegged(di) {
    const P = pegs(); let q = 0;
    for (let i = 0; i < pegIndex; i++) if (P[i].d === di) q += P[i].qty;
    if (pegIndex < P.length && P[pegIndex].d === di) q += P[pegIndex].qty * progress;
    return q;
  }
  function supPegged(si) {
    const P = pegs(); let q = 0;
    for (let i = 0; i < pegIndex; i++) if (P[i].s === si) q += P[i].qty;
    if (pegIndex < P.length && P[pegIndex].s === si) q += P[pegIndex].qty * progress;
    return q;
  }

  function setLedger(cards) {
    tab.querySelector('#peg-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function headerCard() {
    const m = M();
    return { color: SLATE, title: `${m.label} Pegging · ${m.node}`, body: `${m.blurb} FIFO matches producers to consumers; pegging runs <b>after</b> the plan.` };
  }
  function pegCard(p, done) {
    const m = M();
    const sName = m.supply[p.s].name, dName = m.demand[p.d].name;
    const col = m.supply[p.s].color;
    return { color: done ? col : AMBER, title: `${sName} → ${dName}`, body: `<b>${p.qty}</b> units pegged — ${p.note}.` };
  }

  function updateLedger() {
    const cards = [headerCard()];
    for (let i = 0; i < pegIndex; i++) cards.push(pegCard(pegs()[i], true));
    setLedger(cards);
  }
  function reset() {
    pegIndex = 0; progress = 0; running = false; stopAtNext = false;
    setLedger([headerCard(), { color: SLATE, title: 'Ready', body: `Press <b>Run</b> to form the pegs, or <b>Step</b> to peg one supply→demand link at a time.` }]);
  }
  function finish() {
    running = false;
    const cards = [headerCard()];
    for (const p of pegs()) cards.push(pegCard(p, true));
    cards.push({ color: GREEN, title: '✓ Pegging complete · invariant', body: M().invariant });
    setLedger(cards);
  }
  function run() { if (pegIndex >= pegs().length) reset(); running = true; stopAtNext = false; }
  function step() { if (pegIndex >= pegs().length) return; running = true; stopAtNext = true; }

  function card(x, y, w, h, title, meta, accent, fillFrac, fillColor, right) {
    drawRoundRect(ctx, x, y, w, h, 6, '#0d1424', '#1E293B');
    // accent bar on the edge facing the links
    ctx.fillStyle = accent;
    if (right) drawRoundRect(ctx, x, y, 3, h, 1.5, accent, null);
    else drawRoundRect(ctx, x + w - 3, y, 3, h, 1.5, accent, null);
    // progress fill (consumed / pegged) along the bottom
    if (fillFrac > 0) {
      const bw = (w - 16) * Math.min(1, fillFrac);
      drawRoundRect(ctx, x + 8, y + h - 12, bw, 5, 2.5, (fillColor || accent) + 'cc', null);
    }
    drawRoundRect(ctx, x + 8, y + h - 12, w - 16, 5, 2.5, null, '#1E293B');
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText(title, x + 12, y + 20);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#8A98AE';
    ctx.fillText(meta, x + 12, y + 35);
  }

  let raf = null;
  function draw() {
    if (running && pegIndex < pegs().length) {
      progress += SPEED;
      if (progress >= 1) {
        progress = 0; pegIndex++;
        if (pegIndex >= pegs().length) finish();
        else { updateLedger(); if (stopAtNext) { running = false; stopAtNext = false; } }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const m = M();
    const supL = layout(m.supply.length);
    const demL = layout(m.demand.length);

    // column headers
    ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = BLUE;  ctx.fillText('SUPPLY · producers', LX, 26);
    ctx.textAlign = 'right';
    ctx.fillStyle = GREEN; ctx.fillText('DEMAND · orders', RX + CARD_W, 26);
    ctx.textAlign = 'center'; ctx.font = '10px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`${m.label} Pegging`, canvas.width / 2, 22);
    ctx.font = '9px system-ui'; ctx.fillStyle = SLATE;
    ctx.fillText('FIFO  ⇒', canvas.width / 2, 40);

    // centres
    const supCY = (i) => supL.y(i) + supL.h / 2;
    const demCY = (i) => demL.y(i) + demL.h / 2;

    // faint guide lines for pending pegs
    ctx.setLineDash([3, 4]);
    for (let i = pegIndex; i < pegs().length; i++) {
      const p = pegs()[i];
      ctx.beginPath();
      ctx.moveTo(LX2, supCY(p.s));
      ctx.lineTo(RX, demCY(p.d));
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.setLineDash([]);

    // completed peg arrows
    for (let i = 0; i < pegIndex; i++) {
      const p = pegs()[i];
      const col = m.supply[p.s].color;
      drawArrow(ctx, LX2, supCY(p.s), RX, demCY(p.d), col, 2);
      const mx = (LX2 + RX) / 2, my = (supCY(p.s) + demCY(p.d)) / 2;
      ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = BG; ctx.fillRect(mx - 14, my - 7, 28, 13);
      ctx.fillStyle = col; ctx.fillText(String(p.qty), mx, my + 3);
    }

    // currently forming peg
    if (running || stopAtNext) {
      if (pegIndex < pegs().length) {
        const p = pegs()[pegIndex];
        const col = m.supply[p.s].color;
        const sx = LX2, sy = supCY(p.s), ex = RX, ey = demCY(p.d);
        const cx = sx + (ex - sx) * progress, cy = sy + (ey - sy) * progress;
        drawArrow(ctx, sx, sy, cx, cy, col, 2.4);
        // travelling glow dot
        const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 9);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, col); grad.addColorStop(1, col + '00');
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
    }

    // supply cards
    for (let i = 0; i < m.supply.length; i++) {
      const s = m.supply[i];
      const frac = supPegged(i) / s.qty;
      card(LX, supL.y(i), CARD_W, supL.h, s.name, s.meta, s.color, frac, s.color, false);
      ctx.textAlign = 'right'; ctx.font = '9px system-ui'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${Math.round(supPegged(i))}/${s.qty} pegged`, LX + CARD_W - 12, supL.y(i) + 20);
    }

    // demand cards
    for (let i = 0; i < m.demand.length; i++) {
      const d = m.demand[i];
      const pq = demPegged(i);
      const full = pq >= d.qty - 0.01;
      const accent = d.inv ? SLATE : (full ? GREEN : (pq > 0 ? AMBER : SLATE));
      card(RX, demL.y(i), CARD_W, demL.h, d.name, d.meta, accent, pq / d.qty, full ? GREEN : AMBER, true);
      ctx.textAlign = 'right'; ctx.font = '9px system-ui'; ctx.fillStyle = full ? GREEN : '#94a3b8';
      ctx.fillText(`${Math.round(pq)}/${d.qty}`, RX + CARD_W - 12, demL.y(i) + 20);
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  function setMode(mo) {
    mode = mo;
    tab.querySelectorAll('[data-mode]').forEach(b => {
      const on = b.dataset.mode === mo;
      b.classList.toggle('active', on);
      b.style.borderColor = on ? INDIGO : '';
      b.style.color = on ? '#fff' : '';
    });
    reset();
  }

  tab.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  tab.querySelector('#peg-run').addEventListener('click', run);
  tab.querySelector('#peg-step').addEventListener('click', step);
  tab.querySelector('#peg-reset').addEventListener('click', reset);
  setMode('material');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: What pegging is & the pegging tables ──────────────────────────────
function tablesTab() {
  const rows = [
    ['Material Consumption Pegging', '<code>Consumption_Pegging</code>', 'Material consumption pegged quantity', 'The consumption path an order takes through intermediate material nodes, in each time bucket.'],
    ['Material Production Pegging', 'Material Production Pegging Graph', 'Material production pegged quantity', 'All production activities (incl. BOH &amp; Expected Receipts) fulfilling the order. Also stores the constraint report.'],
    ['Capacity Consumption Pegging', 'Capacity Consumption Pegging Graph', 'Capacity Pegged Quantity (+ Overtime1/Overtime2)', 'Amount of capacity — Regular and Flex — consumed at resources per bucket for a unique order. Also stores the constraint report.'],
    ['Storage Pegging', 'Storage Pegging Graph', 'Storage Pegged Quantity (+ Band_1 / Band_2)', 'Unit-space of storage used per bucket to fulfil a unique order. Also stores the constraint report.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">What pegging is</div><div class="section-desc">Pegging links the demand to the supply — material or capacity — that satisfies it, so planners can see the full supply path of any order.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Flow Plan vs Pegging</div><div class="info-card-body">The <strong>Flow Plan</strong> gives the <em>aggregate</em> flow of goods across material nodes. <strong>Pegging</strong> gives how many <strong>"units" are pegged to individual orders</strong> — linking the quantities produced/consumed at each material/capacity node across buckets toward one order's fulfilment.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">A post-process</div><div class="info-card-body">Pegging is <strong>computed after the planning run and before the export</strong>. It does not change the plan — it explains it, matching producers to consumers with <strong>FIFO</strong> on any node (material or capacity).</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">BOH vs ER</div><div class="info-card-body">When <strong>BOH</strong> is pegged to an order, that order is fulfilled through <strong>existing stock</strong>. When <strong>Expected Receipts</strong> is pegged, it is fulfilled from <strong>projected supply</strong>. Pegging tables also store the <strong>lot IDs</strong> that participated.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">The pegging tables (graphs)</div><div class="section-desc">All configured on the Manufacturing tab of the SCS Config UI. In every table the "To" node is the Demand Node / [Order].[Order Name].</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Pegging graph</th><th>Config name</th><th>Edge property</th><th>What it stores</th></tr></thead>
          <tbody>${rows.map(([a, b, c, d]) => `<tr><td style="font-weight:600;color:var(--text)">${a}</td><td>${b}</td><td>${c}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="prose"><p>Every table links a unique order to the supply that fulfils it, with the aggregation level <strong>sum</strong> — so the quantities pegged to an order add up to the quantity the plan fulfilled. Beyond these core tables the wiki also documents <strong>Intermediate</strong> and <strong>Bottom-Up</strong> pegging (flow-plan-to-flow-plan links across levels), <strong>RCA pegging</strong> (to explain short/late demands), and pegging with <strong>proportional sourcing</strong>.</p></div>
    </div>`;
}

// ── Tab 3: FIFO & the pegging kinds ──────────────────────────────────────────
function fifoTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">FIFO &amp; Preferential (Pegging ID) pegging</div><div class="section-desc">"SCS uses FIFO (first-in-first-out) pegging to match the producers to consumers on any node." Pegging ID is only a tie-breaker.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">FIFO always wins</div><div class="info-card-body">The solver <strong>always tries to maintain FIFO across the planning horizon</strong>. Even a supply with the best (lowest) Pegging ID is pegged to an earlier-due demand if that is what FIFO requires.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Pegging ID = intra-bucket tie-breaker</div><div class="info-card-body">When multiple producers and consumers sit in the <strong>same bucket</strong>, the <strong>lowest Pegging ID producer</strong> is pegged to the <strong>lowest Pegging ID consumer</strong>. Lower number = higher priority. Enable with <code>Pegging Id Based Pegging</code> (default false).</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Consumers inherit priority</div><div class="info-card-body">Consumptions need no explicit Pegging ID — they <strong>inherit the demand priority as pegging ID</strong> internally.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">The gap exception</div><div class="info-card-body">If there is a <strong>gap between the start bucket and the current bucket</strong>, the <strong>on-hand supplies get pegged first</strong>, irrespective of Pegging ID.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">The pegging kinds animated here</div><div class="section-desc">Each mode on the Live Pegging tab is one documented kind of pegging.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Mode</th><th>Pegging kind</th><th>Supply side (producers)</th><th>What it shows</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">material</td><td>Material Production / Consumption</td><td>BOH, Expected Receipts, fresh production (lots)</td><td>Existing stock + projected supply pegged to orders; leftover to Inventory Demand.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">capacity</td><td>Capacity Consumption</td><td>Regular + Overtime1 / Overtime2 (Flex bands)</td><td>Regular capacity pegged first, then the Flex Overtime bands; unused capacity expires.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">lot</td><td>Preferential (Pegging ID)</td><td>On-hand lots, aged, with Pegging IDs</td><td>Oldest lot (lowest Pegging ID) pegged to highest-priority demand.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">storage</td><td>Storage Pegging</td><td>Storage (Regular) + Band_1 / Band_2 storage</td><td>Unit-space pegged per order; late/short reports the constraint in the JIT bucket.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Inventory Demand</div><div class="info-card-body">When inventory is more than demand, the <strong>unutilized inventory is pegged to Inventory Demand</strong> — a mandatory member in the Customer and Order dimensions, so stock can be pegged to it.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Hard / Class-based pegging</div><div class="info-card-body">In Hard pegging and Class-based pegging the solver picks up the <strong>latest supplies</strong>, so earlier supplies stay available for lower-priority demands that may be JIT on earlier buckets.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">No Peggings (performance)</div><div class="info-card-body"><code>No Peggings = TRUE</code> skips exporting pegging info after the run (the constraint report is still exported for orders not built JIT on the primary path). FALSE/NULL (default) exports all pegging — slower on large datasets.</div></div>
      </div>

      <div class="canvas-explainer"><h3>The invariant</h3>
        <p>Pegging never creates supply. The <strong>sum of the quantities pegged to an order equals the quantity of that order the plan fulfilled</strong>, and every consumed unit of supply is pegged to some order — with leftover stock pegged to <strong>Inventory Demand</strong>. Partial fulfilments split a single supply across several orders (e.g. 100 of a lot pegged as 50 to D1 and 50 to D2). This is why pegging is a faithful, auditable explanation of the plan rather than a second optimisation.</p>
      </div>
    </div>`;
}
