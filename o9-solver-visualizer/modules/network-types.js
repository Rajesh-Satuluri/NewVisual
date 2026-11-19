import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Name the three network types SCS supports, the SCOR operation each maps to, and one building block for each.',
    a: '<strong>Manufacturing</strong> → SCOR <em>MAKE</em>: transform components into product; building blocks are <strong>Bill of Material (BOM)</strong> and <strong>Routing</strong>. <strong>Distribution</strong> → SCOR <em>DELIVER</em>: move an item between locations; building blocks are <strong>Bill of Distribution (BOD)</strong> and <strong>Transport Mode</strong>. <strong>Procurement</strong> → SCOR <em>SOURCE</em>: buy from a <strong>Supplier</strong>. A real model chains all three.',
    tip: 'MAKE/MOVE/BUY, each with a named artefact — BOM, BOD, Supplier — is the crisp way to answer.' },
  { q: 'What is a composite activity node, and why is it useful?',
    a: 'An activity in SCS can be modelled as a single activity dimension, or as a <strong>composite</strong> of several component dimensions. For Manufacturing it is typically a composite of <strong>BOM + Routing</strong>; for Distribution a composite of <strong>BOD + Transport Mode</strong>. The composite lets one activity edge carry all the properties of its parts (yield, lead time, lot size, mode) while still being a single node the solver traverses — and it is optional: you can represent activity as one dimension throughout.',
    tip: 'Say "composite = one activity node assembled from BOM+Routing (or BOD+TransMode) component dimensions".' },
  { q: 'A material node has several production edges (alternate producers). How does the solver choose between them?',
    a: 'It sorts the alternate producers by: <strong>1) Activity Priority</strong> (lower number = higher; static, time-varying, or via DemandAttributeAssociationProperties); <strong>2)</strong> an edge with <strong>proportion enabled</strong> gets higher priority; <strong>3) Activity key</strong> (lower member key first, in configured Activity Node Components order); <strong>4) Activity node end date</strong> (later end date wins). It uses the next attribute only when the earlier ones tie.',
    tip: 'Lead with Activity Priority; mention the end-date tie-break last — it surprises people.' },
];

// Combined network: Supplier →(procure)→ RM@Plant →(make)→ FG@Plant →(distribute)→ FG@DC → Customer
const NODES = [
  { id: 'sup',  x: 24,  y: 150, w: 110, h: 54, label: 'Supplier',    sub: 'procure',     color: '#F59E0B', cx: 79 },
  { id: 'rm',   x: 196, y: 150, w: 120, h: 54, label: 'RM @ Plant',  sub: 'material node',color: '#64748B', cx: 256 },
  { id: 'fgp',  x: 378, y: 150, w: 120, h: 54, label: 'FG @ Plant',  sub: 'material node',color: '#64748B', cx: 438 },
  { id: 'fgd',  x: 560, y: 150, w: 120, h: 54, label: 'FG @ DC',     sub: 'material node',color: '#64748B', cx: 620 },
  { id: 'cust', x: 718, y: 150, w: 94,  h: 54, label: 'Customer',    sub: 'demand',       color: '#10B981', cx: 765 },
];
// activity edges between consecutive material nodes
const EDGES = [
  { from: 0, to: 1, type: 'Procurement',   scor: 'SOURCE',  color: '#F59E0B', blocks: 'Supplier' },
  { from: 1, to: 2, type: 'Manufacturing', scor: 'MAKE',    color: '#A78BFA', blocks: 'BOM + Routing' },
  { from: 2, to: 3, type: 'Distribution',  scor: 'DELIVER', color: '#38BDF8', blocks: 'BOD + Transport Mode' },
  { from: 3, to: 4, type: 'Delivery',      scor: 'DELIVER', color: '#10B981', blocks: 'customer lane' },
];
const YC = 177;

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Network & Data Model',
    title: 'Manufacturing · Distribution · Procurement',
    subtitle: 'Every o9 model is assembled from three kinds of network — MAKE, DELIVER and SOURCE — each with its own building blocks. See how one product chains all three, and how the solver picks between alternate producers.',
    tabs: [
      { id: 'build', label: '🏗️ Build a Network' },
      { id: 'make',  label: '🏭 Manufacturing', content: makeTab() },
      { id: 'move',  label: '🚚 Distribution & Procurement', content: moveTab() },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-build');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A finished good reaches the customer across <b>three network types</b> chained end to end. Grey boxes are <b>material nodes</b> (item @ location); the coloured edges between them are <b>activity nodes</b> — procure, make, distribute. Click a segment to light it up and see its building blocks, or <b>Trace the Path</b>.</div>
      <canvas id="nt-canvas" width="820" height="300" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" data-seg="0">📦 Procurement</button>
        <button class="ctrl-btn" data-seg="1">🏭 Manufacturing</button>
        <button class="ctrl-btn" data-seg="2">🚚 Distribution</button>
        <button class="ctrl-btn" id="nt-trace">▶ Trace the Path</button>
      </div>
      <div id="nt-info" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The solver sees the whole chain as alternating <strong>material nodes</strong> and <strong>activity nodes</strong>. A material node is an <em>item at a location</em> (raw material at the plant, finished good at the DC). An activity node is the edge that <em>transforms or moves</em> material between two material nodes — and it is one of exactly three kinds: <strong>Procurement</strong> (buy from a supplier), <strong>Manufacturing</strong> (make via BOM + Routing), <strong>Distribution</strong> (move via BOD + Transport Mode).</p>
      <p>Specifying the distribution and manufacturing <em>composite</em> activity nodes is optional — you can model activity as a single dimension throughout — but the three network types are always what the edges mean. When the backward traversal from the next module hops upstream, each hop crosses one of these activity edges.</p>
    </div>`;

  const canvas = tab.querySelector('#nt-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let active = -1;       // highlighted edge index
  let packets = [];
  let tracing = false;

  function showInfo(i) {
    const e = EDGES[i];
    const el = tab.querySelector('#nt-info');
    el.innerHTML = `
      <div class="info-card" style="border-left:3px solid ${e.color}">
        <div class="info-card-title">${e.type} <span class="pill" style="background:${e.color}22;color:${e.color}">SCOR · ${e.scor}</span></div>
        <div class="info-card-body">Edge from <b>${NODES[e.from].label}</b> → <b>${NODES[e.to].label}</b>. Building block${e.blocks.includes('+') ? 's' : ''}: <b>${e.blocks}</b>.</div>
      </div>`;
  }

  function trace() {
    if (tracing) return;
    tracing = true; active = -1;
    tab.querySelector('#nt-info').innerHTML = '';
    let i = 0;
    const step = () => {
      if (i >= EDGES.length) { tracing = false; return; }
      const e = EDGES[i];
      active = i;
      packets.push(new EventPacket({
        label: e.type === 'Delivery' ? 'deliver' : e.scor.toLowerCase(), color: e.color, speed: 1.8,
        path: [{ x: NODES[e.from].cx, y: YC }, { x: NODES[e.to].cx, y: YC }],
      }));
      if (i < 3) showInfo(i);
      i++;
      setTimeout(step, 1050);
    };
    step();
  }

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // edges
    EDGES.forEach((e, i) => {
      const a = NODES[e.from], b = NODES[e.to];
      const on = active === i;
      ctx.strokeStyle = on ? e.color : '#1E293B';
      ctx.lineWidth = on ? 3 : 1.5;
      ctx.setLineDash(on ? [] : [5, 4]);
      ctx.beginPath(); ctx.moveTo(a.x + a.w, YC); ctx.lineTo(b.x, YC); ctx.stroke();
      ctx.setLineDash([]);
      // edge label
      const mx = (a.x + a.w + b.x) / 2;
      ctx.textAlign = 'center'; ctx.font = (on ? 'bold ' : '') + '9px system-ui';
      ctx.fillStyle = on ? e.color : '#475569';
      ctx.fillText(e.type, mx, YC - 10);
      if (on) { ctx.font = '8px system-ui'; ctx.fillStyle = e.color + 'cc'; ctx.fillText(e.blocks, mx, YC + 18); }
    });

    // nodes
    NODES.forEach(n => {
      drawRoundRect(ctx, n.x, n.y, n.w, n.h, 9, '#111827', n.color + '99');
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = n.color === '#64748B' ? '#CBD5E1' : n.color;
      ctx.fillText(n.label, n.cx, n.y + 23);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText(n.sub, n.cx, n.y + 40);
    });

    // legend
    ctx.textAlign = 'left'; ctx.font = '9px system-ui'; ctx.fillStyle = '#475569';
    ctx.fillText('◼ material node = item @ location     ▭ activity node = procure / make / distribute (the edges)', 24, 275);

    packets.forEach(p => p.update(dt));
    packets.forEach(p => p.draw(ctx));
    packets = packets.filter(p => !p.done);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.seg; active = i; showInfo(i);
    packets.push(new EventPacket({ label: EDGES[i].scor.toLowerCase(), color: EDGES[i].color, speed: 1.8, path: [{ x: NODES[EDGES[i].from].cx, y: YC }, { x: NODES[EDGES[i].to].cx, y: YC }] }));
  }));
  tab.querySelector('#nt-trace').addEventListener('click', trace);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function makeTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Manufacturing — the MAKE operation</div><div class="section-desc">Parts and components are transformed into intermediates or finished goods. Built from two artefacts.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Bill of Material (BOM)</div><div class="info-card-body">Specifies the <strong>produced part</strong> and its <strong>components</strong> — e.g. 4 legs + 1 top → a table. Supports alternate BOMs, alternate components, date-effective components, inter-site BOM.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Routing</div><div class="info-card-body">The <strong>process lane</strong> and resources used to make the part. A part can be made on different routes with different characteristics and attached resources.</div></div>
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Activity Node Components</div><div class="info-card-body">By default an activity node represents a manufacturing activity. Modelling it as a <strong>composite of BOM + Routing</strong> is optional — you may instead use a single activity dimension throughout the chain.</div></div>
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">BOH & Expected Receipts</div><div class="info-card-body">Mandatory for BOM/Routing: Beginning-On-Hand and Expected-Receipts activity are configured on the <strong>Inventory tab</strong> of the SCS config.</div></div>
      </div>
      <div class="canvas-explainer"><h3>Alternates = flexibility</h3><p>The richness of Manufacturing modelling — alternate BOMs, alternate components, time-varying yields — is what lets the solver find a feasible make path when the primary one is capacity- or material-constrained. Choosing between those alternate producers is exactly the producer-sort covered in the Sourcing module.</p></div>
    </div>`;
}

function moveTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Distribution — the DELIVER operation</div><div class="section-desc">Moving an item from one location to another: the connection between a source and a destination.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Bill of Distribution (BOD)</div><div class="info-card-body">Represents the <strong>movement</strong> of an item from source to destination, and can carry properties like lot size and effectivity. A component of the distribution activity node.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Transport Mode</div><div class="info-card-body">Truck, rail, ship, air — differing lead times and cost; some used only on exception. The producing graph represents the <strong>primary / secondary / tertiary</strong> modes for receiving at a material node.</div></div>
      </div>
      <div class="section-header" style="margin-top:20px"><div class="section-title">Procurement — the SOURCE operation</div><div class="section-desc">Buying the item (or its components) into the network.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Supplier</div><div class="info-card-body">The most-upstream node — where backward traversal <strong>terminates</strong>. Modelled with supplier activity node components, subject to supplier lead time and capacity.</div></div>
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Optional composites</div><div class="info-card-body">Both Distribution (BOD + Transport Mode) and Procurement activity nodes are <strong>optional composites</strong> — specify them only when you need that structure; otherwise a single activity dimension suffices.</div></div>
      </div>
    </div>`;
}
