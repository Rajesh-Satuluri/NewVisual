import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What are the two kinds of node in an SCS network, and how are they connected?',
    a: 'A <strong>material node</strong> is an item at a location (<code>Item × Location</code>) — what exists or is needed there. An <strong>activity node</strong> is the <code>Activity</code> that transforms or moves material. They are connected by <strong>graphs</strong>: every graph edge has a <strong>FROM node, a TO node, and the edge</strong> itself. The solver walks material → activity → upstream material, repeatedly.',
    tip: 'Say "material node = Item×Location, activity node = Activity, linked by FROM/TO/EDGE graphs".' },
  { q: 'Name the three input graphs the solver reads, and what each asserts.',
    a: '<strong>Material Consumption Graph</strong> — whether an activity <em>consumes</em> a product at a location (+ Consumption Qty Per). <strong>Material Production Graph</strong> — whether an activity <em>produces</em> a product at a location (+ Production Qty Per and <strong>Production Priority</strong>). <strong>Capacity Consumption Graph</strong> — whether an activity node is <em>constrained by capacity</em> from the resource it is attached to. Each has a Boolean <strong>Association</strong> (1 = edge active, 0 = inactive).',
    tip: 'Consumption = material in, Production = material out, Capacity = resource constraint. The Association boolean switches an edge on/off.' },
  { q: 'How does Material Production Priority encode precedence, and what do NULL and negative values mean?',
    a: 'It is numeric and <strong>lower = higher priority; 0 is the highest</strong>. When multiple activities produce into the same material node, the priority tells the solver which path takes precedence. <strong>NULL</strong> is treated as priority <strong>32,767</strong> (effectively lowest). A value <strong>n &lt; 0 means the path is blocked</strong> — the solver will not use that production edge at all.',
    tip: 'The three gotchas: 0 = top priority, NULL = 32767, negative = blocked. Interviewers love the negative-means-blocked detail.' },
];

// material nodes + two alternate activity producers + a resource
const RM  = { id: 'rm',  x: 30,  y: 128, w: 110, h: 54, label: 'RM @ Plant', sub: 'material node', color: '#64748B', cx: 85, cy: 155 };
const FG  = { id: 'fg',  x: 690, y: 128, w: 110, h: 54, label: 'FG @ Plant', sub: 'material node', color: '#64748B', cx: 745, cy: 155 };
const ACTS = [
  { id: 'a', label: 'Assemble-A', prio: 1, x: 330, y: 70,  w: 150, h: 48, cx: 405, cy: 94, blocked: false },
  { id: 'b', label: 'Assemble-B', prio: 2, x: 330, y: 196, w: 150, h: 48, cx: 405, cy: 220, blocked: false },
];
const RES = { id: 'res', x: 352, y: 128, w: 106, h: 42, label: 'Line-1', sub: 'resource', color: '#F59E0B', cx: 405, cy: 149 };

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Network & Data Model',
    title: 'Nodes, Edges & Graphs',
    subtitle: 'The network is just material nodes and activity nodes, wired by three input graphs — consumption, production and capacity. Watch how the Production Priority picks the winning producer, and what happens when you block a path.',
    tabs: [
      { id: 'nodes',  label: '🔵 Nodes & Edges' },
      { id: 'graphs', label: '🗂️ The 3 Input Graphs', content: graphsTab() },
      { id: 'prio',   label: '🔢 Production Priority', content: prioTab() },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-nodes');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Two activities can produce <b>FG @ Plant</b>, both consuming <b>RM</b> and both using <b>Line-1</b>'s capacity. <b style="color:#38BDF8">Blue</b> = consumption edges, <b style="color:#10B981">green</b> = production edges, <b style="color:#F59E0B">amber</b> = capacity edges. Press <b>Solve</b> — the solver picks the producer with the best Production Priority. Then block the primary and solve again.</div>
      <canvas id="ng-canvas" width="820" height="290" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="ng-solve">▶ Solve (pick producer)</button>
        <button class="ctrl-btn" id="ng-block">🚫 Block Assemble-A (n&lt;0)</button>
        <button class="ctrl-btn" id="ng-reset">↺ Reset</button>
        <span class="ctrl-label" id="ng-status">Press Solve.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each edge carries a Boolean <strong>Association</strong>: 1 means the edge is active in the network, 0 means inactive. On the production edges there is also a <strong>Production Priority</strong> — lower is higher, 0 is the top. With both producers active, the solver takes <strong>Assemble-A (priority 1)</strong>. Set Assemble-A's production priority to a <strong>negative</strong> value and that edge is <em>blocked</em>; the solver falls through to <strong>Assemble-B (priority 2)</strong>.</p>
      <p>This is the raw material of every network: the solver never "sees" plants and lanes — it sees material nodes, activity nodes, and the association/priority/qty-per numbers on the graph edges between them.</p>
    </div>`;

  const canvas = tab.querySelector('#ng-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let chosen = null;     // 'a' | 'b' | null
  let pulse = 0;

  function solve() {
    const avail = ACTS.filter(a => !a.blocked).sort((x, y) => x.prio - y.prio);
    chosen = avail.length ? avail[0].id : null;
    pulse = 40;
    const st = tab.querySelector('#ng-status');
    if (!chosen) st.textContent = 'No producer available — both paths blocked → FG is short.';
    else {
      const a = ACTS.find(x => x.id === chosen);
      const blockedNote = ACTS.some(x => x.blocked) ? ' (Assemble-A blocked, fell through)' : '';
      st.textContent = `Chosen: ${a.label} — Production Priority ${a.prio}${blockedNote}. RM consumed, Line-1 capacity used, FG produced.`;
    }
  }
  function toggleBlock() {
    ACTS[0].blocked = !ACTS[0].blocked;
    const btn = tab.querySelector('#ng-block');
    btn.textContent = ACTS[0].blocked ? '✅ Unblock Assemble-A' : '🚫 Block Assemble-A (n<0)';
    chosen = null; tab.querySelector('#ng-status').textContent = ACTS[0].blocked ? 'Assemble-A production priority set to −1 (blocked). Press Solve.' : 'Assemble-A active again. Press Solve.';
  }
  function reset() { ACTS[0].blocked = false; chosen = null; pulse = 0; tab.querySelector('#ng-block').textContent = '🚫 Block Assemble-A (n<0)'; tab.querySelector('#ng-status').textContent = 'Press Solve.'; }

  function edge(x1, y1, x2, y2, color, on, chosenEdge) {
    ctx.save();
    ctx.globalAlpha = on ? (chosenEdge ? 1 : 0.55) : 0.18;
    drawArrow(ctx, x1, y1, x2, y2, color, chosenEdge ? 3 : 1.6);
    ctx.restore();
  }

  let raf = null;
  function draw(ts) {
    if (pulse > 0) pulse--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ACTS.forEach(a => {
      const sel = chosen === a.id;
      // consumption edge RM → activity (blue)
      edge(RM.x + RM.w, RM.cy, a.x, a.cy, '#38BDF8', !a.blocked, sel);
      // production edge activity → FG (green)
      edge(a.x + a.w, a.cy, FG.x, FG.cy, '#10B981', !a.blocked, sel);
      // capacity edge resource → activity (amber, from res center)
      edge(RES.cx, a.id === 'a' ? RES.y : RES.y + RES.h, a.cx, a.id === 'a' ? a.y + a.h : a.y, '#F59E0B', !a.blocked, sel);
    });

    // material nodes
    [RM, FG].forEach(n => {
      drawRoundRect(ctx, n.x, n.y, n.w, n.h, 9, '#111827', '#64748B99');
      ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1'; ctx.fillText(n.label, n.cx, n.y + 23);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText(n.sub, n.cx, n.y + 40);
    });
    // resource
    drawRoundRect(ctx, RES.x, RES.y, RES.w, RES.h, 8, '#1a1206', '#F59E0B99');
    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#F59E0B'; ctx.fillText(RES.label, RES.cx, RES.y + 18);
    ctx.font = '8px system-ui'; ctx.fillStyle = '#92712b'; ctx.fillText(RES.sub, RES.cx, RES.y + 32);

    // activity nodes
    ACTS.forEach(a => {
      const sel = chosen === a.id;
      const col = a.blocked ? '#EF4444' : (sel ? '#10B981' : '#A78BFA');
      const bg = a.blocked ? '#2a0f0f' : (sel && pulse > 0 ? '#10B98122' : '#140f24');
      drawRoundRect(ctx, a.x, a.y, a.w, a.h, 9, bg, col);
      ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = col;
      ctx.fillText(a.label, a.cx, a.y + 20);
      ctx.font = '9px system-ui'; ctx.fillStyle = a.blocked ? '#EF4444' : '#8A98AE';
      ctx.fillText(a.blocked ? 'priority −1 · BLOCKED' : 'activity node · priority ' + a.prio, a.cx, a.y + 37);
    });

    // edge-type legend near top
    ctx.textAlign = 'left'; ctx.font = '9px system-ui';
    ctx.fillStyle = '#38BDF8'; ctx.fillText('→ consumption', 30, 24);
    ctx.fillStyle = '#10B981'; ctx.fillText('→ production', 140, 24);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('→ capacity', 240, 24);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#ng-solve').addEventListener('click', solve);
  tab.querySelector('#ng-block').addEventListener('click', toggleBlock);
  tab.querySelector('#ng-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function graphsTab() {
  const rows = [
    ['Material Consumption Graph', 'Does an activity <strong>consume</strong> a product at a location?', 'Consumption Association (1/0) · Consumption Qty Per', '<code>Consumption Graph Measure Name</code>'],
    ['Material Production Graph', 'Does an activity <strong>produce</strong> a product at a location?', 'Production Association (1/0) · Production Qty Per · <strong>Production Priority</strong> · Min/Mul Qty', '<code>Production Graph Measure Name</code>'],
    ['Capacity Consumption Graph', 'Is the activity node <strong>constrained by capacity</strong> from its resource?', 'Capacity Association (1/0) · Capacity Qty Per', '<code>Capacity Consumption Graph…</code>'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three input graphs</div><div class="section-desc">Graphs are how the network is built: each edge has a FROM node, a TO node, and an edge. These are the solver's inputs (there are OUTPUT graphs for the plan too).</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Input graph</th><th>Asserts</th><th>Key edge properties</th><th>SCS config</th></tr></thead>
          <tbody>${rows.map(([g, a, p, c]) => `<tr><td style="font-weight:600;color:var(--text)">${g}</td><td>${a}</td><td style="color:var(--text2)">${p}</td><td>${c}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Association = 1/0 switch</div><div class="info-card-body">Every graph edge has a Boolean <strong>Association</strong>: 1 = the edge is active in the network, 0 = inactive. It's how you turn a lane or a producer on/off without deleting it.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Qty Per = the recipe</div><div class="info-card-body"><strong>Consumption Qty Per</strong> = how many of the component an activity uses; <strong>Production Qty Per</strong> = how many it yields. Together they are the BOM arithmetic the solver nets against.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Granularity</div><div class="info-card-body">Edges are at <code>Activity × Item × Location × Version</code> — which is why the same activity can have different associations/priorities per item, location and scenario version.</div></div>
      </div>
    </div>`;
}

function prioTab() {
  const rows = [
    ['0', 'Highest priority — tried first.'],
    ['1, 2, 3 …', 'Lower number = higher priority. Ordinary precedence between alternate producers.'],
    ['NULL', 'Treated as 32,767 — effectively the lowest priority (a fallback path).'],
    ['n < 0 (negative)', 'The path is <strong>blocked</strong> — the solver will not use this production edge at all.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Material Production Priority</div><div class="section-desc">When multiple activities produce into one material node, this numeric edge property decides precedence.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Value</th><th>Meaning</th></tr></thead>
          <tbody>${rows.map(([v, m]) => `<tr><td style="font-weight:700;color:var(--accent)"><code>${v}</code></td><td>${m}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><h3>Static, time-varying, or attribute-driven</h3>
        <p>Production/Activity Priority can be a <strong>static</strong> number, a <strong>time-varying</strong> value (different priority per bucket — e.g. favour a producer only in peak season), or driven by <strong>DemandAttributeAssociationProperties</strong> (priority that depends on the demand being planned). The full producer-sort — priority, then proportion-enabled, then activity key, then end date — is covered in the <em>Sourcing & Alternates</em> module; here the takeaway is that priority is the first and dominant key, and a negative value is the "off switch".</p>
      </div>
    </div>`;
}
