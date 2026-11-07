import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'In one sentence, what problem does a supply chain planning solver actually solve?',
    a: 'It <strong>matches time-phased supply to prioritised demand across a network of constraints</strong> — deciding what to make, move and buy, <em>where</em> and <em>when</em>, so that the most important orders are met as close to on-time as the network physically allows.',
    tip: 'Frame it as a matching problem over three axes: WHAT (item), WHERE (node/lane) and WHEN (time bucket). The solver answers all three at once.' },
  { q: 'Demand "pulls" and supply "pushes". Which direction does the o9 solver traverse, and why?',
    a: 'It traverses <strong>backward — from the customer (downstream) toward the supplier (upstream)</strong>. It starts at the demand, asks the immediate upstream node for the quantity needed, and recurses up the network until it reaches a node that can supply (on-hand, an expected receipt, or fresh production/procurement). Supply is then confirmed forward. Backward traversal is what lets it honour the due date: it works out the latest feasible start that still arrives on time.',
    tip: 'Say "demand-driven, backward propagation" — the solver is pulled by orders, not pushed by capacity.' },
  { q: 'What are the three network types an o9 model is built from, and which SCOR operation does each map to?',
    a: '<strong>Manufacturing</strong> (the SCOR <em>MAKE</em> operation — transform components into product, via BOM + Routing); <strong>Distribution</strong> (SCOR <em>DELIVER</em> — move an item between locations, via Bill of Distribution + Transport Mode); and <strong>Procurement</strong> (SCOR <em>SOURCE</em> — buy from a supplier). A real network chains all three: buy raw material → make the product → distribute it to the customer.',
    tip: 'Anchor each to a verb — MAKE / MOVE / BUY — and name one building block for each (BOM, BOD, Supplier).' },
];

// Network nodes for the backward-traversal animation (customer on the right).
const NODES = [
  { id: 'sup',   x: 40,  y: 150, w: 128, h: 58, label: 'Supplier',  sub: 'procure · buy',   color: '#F59E0B', cx: 104 },
  { id: 'plant', x: 232, y: 150, w: 128, h: 58, label: 'Plant',     sub: 'make · BOM',      color: '#A78BFA', cx: 296 },
  { id: 'dc',    x: 424, y: 150, w: 128, h: 58, label: 'DC',        sub: 'distribute · BOD',color: '#38BDF8', cx: 488 },
  { id: 'cust',  x: 632, y: 150, w: 128, h: 58, label: 'Customer',  sub: 'demand · order',  color: '#10B981', cx: 696 },
];
const YC = 179;

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations',
    title: 'Supply, Demand & the Match',
    subtitle: 'Before any solver logic: a supply chain is a network that must match time-phased supply to prioritised demand. Watch a single order pull a plan backward from customer to supplier — the shape of every plan the solver makes.',
    tabs: [
      { id: 'network', label: '🔗 The Network' },
      { id: 'types',   label: '🏭 Three Networks', content: typesTab() },
      { id: 'match',   label: '🎯 The Match',       content: matchTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildNetwork(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: backward-traversal network animation ───────────────────────────────
function buildNetwork(container) {
  const tab = container.querySelector('#tab-network');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A customer orders <b>100 units</b> due on a date. The order <b>pulls</b> a plan <b>backward</b> — Customer → DC → Plant → Supplier — each node asking the one upstream for what it needs. When an upstream node can supply, product is <b>built forward</b> back down to the customer. Press <b>Pull Demand</b>.</div>
      <canvas id="scb-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="scb-pull">◀ Pull Demand (backward)</button>
        <button class="ctrl-btn" id="scb-reset">↺ Reset</button>
        <span class="ctrl-label" id="scb-status">Idle — press Pull Demand.</span>
      </div>
      <div id="scb-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>This is the <strong>demand-driven, backward</strong> motion at the heart of the o9 solver. Planning doesn't start at the factory and push product outward; it starts at the <strong>order</strong> and works upstream, asking "who can give me this, and by when?" Only when it reaches real supply — on-hand stock, an expected receipt, or a fresh make/buy — does it commit, then confirm the flow forward.</p>
      <p>Each hop also carries a <strong>lead time</strong>: the plant needs time to build, the lane needs time to ship. Traversing backward from the due date is how the solver finds the <strong>latest start that still arrives on time</strong> — the Just-In-Time ideal you'll meet in the next modules.</p>
      <p><strong>Interview angle:</strong> "why backward?" — because the <em>due date</em> is the fixed point. You can only know when to start by walking the lead times back from when the customer needs it.</p>
    </div>`;

  const canvas = tab.querySelector('#scb-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let state = fresh();
  function fresh() { return { packets: [], flash: {}, phase: 'idle', ledger: [] }; }

  function setStatus(t) { const el = tab.querySelector('#scb-status'); if (el) el.textContent = t; }
  function renderLedger() {
    const el = tab.querySelector('#scb-ledger');
    el.innerHTML = state.ledger.map(r => `
      <div class="info-card" style="border-left:3px solid ${r.color}">
        <div class="info-card-title">${r.title}</div>
        <div class="info-card-body">${r.body}</div>
      </div>`).join('');
  }

  // Spawn a pill from node a to node b (indices into NODES). dir -1 = backward.
  function hop(ai, bi, color, label, onArrive) {
    const a = NODES[ai], b = NODES[bi];
    state.packets.push(new EventPacket({
      label, color, speed: 1.7,
      path: [{ x: a.cx, y: YC }, { x: b.cx, y: YC }],
      onArrive: () => { state.flash[b.id] = 32; if (onArrive) onArrive(); },
    }));
  }

  function pull() {
    if (state.phase !== 'idle') return;
    state.phase = 'running';
    state.ledger = [];
    setStatus('Backward pass: the order asks upstream, node by node…');

    // Backward: Customer(3) → DC(2) → Plant(1) → Supplier(0)
    state.ledger.push({ color: '#10B981', title: 'Order placed', body: 'Customer needs <b>100</b> on the due date. Net requirement = 100 (no on-hand).' });
    renderLedger();
    hop(3, 2, '#F59E0B', 'need 100', () => {
      state.ledger.push({ color: '#38BDF8', title: 'DC asked', body: 'DC has no stock → must be shipped in. Asks the Plant (offset by ship lead time).' });
      renderLedger();
      hop(2, 1, '#F59E0B', 'need 100', () => {
        state.ledger.push({ color: '#A78BFA', title: 'Plant asked', body: 'Plant must <b>make</b> it (BOM + Routing) → asks the Supplier for components (offset by build lead time).' });
        renderLedger();
        hop(1, 0, '#F59E0B', 'need comp', () => {
          state.ledger.push({ color: '#F59E0B', title: 'Supplier reached', body: 'Supplier can procure the components. <b>Supply found</b> — now confirm forward. ◀ end of backward pass.' });
          renderLedger();
          setStatus('Supply found at the supplier. Forward pass: building the product back to the customer…');
          // Forward: Supplier(0) → Plant(1) → DC(2) → Customer(3)
          setTimeout(() => forward(), 700);
        });
      });
    });
  }

  function forward() {
    hop(0, 1, '#10B981', 'components', () => {
      state.ledger.push({ color: '#A78BFA', title: 'Plant builds', body: 'Components consumed; <b>100 produced</b> on the routing. Ready to distribute.' });
      renderLedger();
      hop(1, 2, '#10B981', 'build 100', () => {
        state.ledger.push({ color: '#38BDF8', title: 'DC ships', body: 'Transport mode moves <b>100</b> to the DC, then on to the customer.' });
        renderLedger();
        hop(2, 3, '#10B981', 'ship 100', () => {
          state.ledger.push({ color: '#10B981', title: '✓ Demand met', body: 'The <b>100</b> arrives on the due date — a Just-In-Time fill, traced end-to-end (this trace is the <em>pegging</em>).' });
          renderLedger();
          setStatus('Done — 100 met on time. Every hop is pegged: order → lane → plant → supplier.');
          state.phase = 'done';
        });
      });
    });
  }

  function reset() { state = fresh(); renderLedger(); setStatus('Idle — press Pull Demand.'); }

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    Object.keys(state.flash).forEach(k => { if (state.flash[k] > 0) state.flash[k]--; });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // lanes between nodes
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    for (let i = 0; i < NODES.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(NODES[i].x + NODES[i].w, YC); ctx.lineTo(NODES[i + 1].x, YC); ctx.stroke();
    }
    ctx.setLineDash([]);

    // direction hints
    ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#F59E0B'; ctx.fillText('◀  demand pulls backward  (customer → supplier)', 400, 110);
    ctx.fillStyle = '#10B981'; ctx.fillText('supply builds forward  (supplier → customer)  ▶', 400, 262);

    // nodes
    NODES.forEach(n => {
      const f = state.flash[n.id] > 0;
      drawRoundRect(ctx, n.x, n.y, n.w, n.h, 10, f ? n.color + '33' : '#111827', f ? n.color : n.color + '99');
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = n.color; ctx.fillText(n.label, n.cx, n.y + 25);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#8A98AE'; ctx.fillText(n.sub, n.cx, n.y + 43);
    });

    state.packets.forEach(p => p.update(dt));
    state.packets.forEach(p => p.draw(ctx));
    state.packets = state.packets.filter(p => !p.done || p.traveled < p.pathLen + 1);
    while (state.packets.length > 10) state.packets.shift();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#scb-pull').addEventListener('click', pull);
  tab.querySelector('#scb-reset').addEventListener('click', reset);
  renderLedger();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: three network types ────────────────────────────────────────────────
function typesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three networks the solver supports</div><div class="section-desc">A real supply chain model is built by chaining these three. Each maps to a SCOR operation and has its own building blocks (per the SCS "Types of Network Supported" documentation).</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #A78BFA">
          <div class="info-card-title">🏭 Manufacturing — <span style="color:var(--text3)">MAKE</span></div>
          <div class="info-card-body">Transform components into intermediates or finished goods. Building blocks: <strong>Bill of Material (BOM)</strong> — the produced part and the components it consumes (4 legs + 1 top → a table) — and <strong>Routing</strong>, the process lane and resources used. Supports alternate BOMs, alternate components, date-effective components, time-varying yields.</div>
        </div>
        <div class="info-card" style="border-left:3px solid #38BDF8">
          <div class="info-card-title">🚚 Distribution — <span style="color:var(--text3)">DELIVER</span></div>
          <div class="info-card-body">Move an item from one location to another — the connection between a source and a destination. Building blocks: <strong>Bill of Distribution (BOD)</strong> (the move, plus lot size / effectivity) and <strong>Transport Mode</strong> (truck, rail, ship, air — differing lead times and cost, primary/secondary/tertiary).</div>
        </div>
        <div class="info-card" style="border-left:3px solid #F59E0B">
          <div class="info-card-title">📦 Procurement — <span style="color:var(--text3)">SOURCE</span></div>
          <div class="info-card-body">Buy the item (or its components) from a <strong>Supplier</strong>. This is where backward traversal terminates: the most-upstream node that can bring material into the network, subject to supplier lead time and capacity.</div>
        </div>
      </div>
      <div class="canvas-explainer"><h3>Material nodes & activity nodes</h3>
        <p>Every network is drawn with two kinds of node. A <strong>material node</strong> is an item at a location (what exists / is needed <em>there</em>). An <strong>activity node</strong> is the edge that transforms or moves material — a make, a move, or a buy — carrying the lead time, capacity and yield. The solver walks material node → activity node → upstream material node, over and over, which is exactly the backward hop you saw in <em>The Network</em>.</p>
      </div>
    </div>`;
}

// ── Tab 3: the match ──────────────────────────────────────────────────────────
function matchTab() {
  const rows = [
    ['WHAT', 'Which item (and which components it needs, via BOM)', 'Make the finished good, or buy the raw part?'],
    ['WHERE', 'Which node / lane carries it', 'Ship from DC-East or DC-West? Make at Plant-1 or Plant-2?'],
    ['WHEN', 'Which time bucket it is produced / moved / received', 'Build now and carry, or build later and risk lateness?'],
    ['HOW MUCH', 'Quantity, after netting on-hand and rounding to lot size', 'Need 100, have 30 on-hand, lot multiple 50 → make 100'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Planning is a matching problem over four axes</div><div class="section-desc">"Make a plan" means answering all of these, for every order, consistently with the network and its constraints.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Axis</th><th>The question</th><th>Example decision</th></tr></thead>
          <tbody>${rows.map(([a, q, e]) => `<tr><td style="font-weight:700;color:var(--accent)">${a}</td><td>${q}</td><td style="color:var(--text2)">${e}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="section-header" style="margin-top:22px"><div class="section-title">What makes a plan "good"?</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Feasible</div><div class="info-card-body">Respects hard constraints — lead times, lot sizes, material and capacity availability. A plan that can't physically happen is worthless.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">On-time, by priority</div><div class="info-card-body">The most important demands are met Just-In-Time; lateness and shortage are pushed onto the least important orders first.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Lean</div><div class="info-card-body">No more early build / carried inventory than needed — build ahead only when on-time delivery requires it.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Explainable</div><div class="info-card-body">Every unit traces to an order (pegging), and every shortfall has a reason (RCA). You can always answer "why?".</div></div>
      </div>
      <div class="canvas-explainer"><h3>The through-line</h3><p>The o9 solver is a <strong>heuristic</strong> that produces a feasible, priority-respecting, lean, explainable plan by handling one order at a time in backward traversal. Everything in the Foundations group — order-by-order planning, demand sorting, the three timing phases — is just <em>how</em> it makes this match reliably and at scale.</p></div>
    </div>`;
}
