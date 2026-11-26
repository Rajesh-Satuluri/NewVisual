// R1 · Master Map — the 22-module concept/dependency graph (clickable) + ShopStream overlay
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles } from './_mod-ui.js';

// node: id, label, column (0..5), row within column, group color
const C = {
  found: '#06B6D4', arch: '#3B82F6', time: '#8B5CF6', state: '#F59E0B',
  sink: '#10B981', join: '#EF4444', ops: '#EC4899', end: '#FACC15',
};
const NODES = [
  { id: 'm01', n: '01', label: 'Why SS', col: 0, row: 0, c: C.found },
  { id: 'm02', n: '02', label: 'Unbounded Table', col: 0, row: 1, c: C.found },
  { id: 'm03', n: '03', label: 'Architecture', col: 1, row: 0, c: C.arch },
  { id: 'm04', n: '04', label: 'Sources & Schema', col: 1, row: 1, c: C.arch },
  { id: 'm05', n: '05', label: 'Micro-Batch & Triggers', col: 1, row: 2, c: C.arch },
  { id: 'm06', n: '06', label: 'Continuous', col: 1, row: 3, c: C.arch },
  { id: 'm07', n: '07', label: 'Event vs Proc Time', col: 2, row: 0, c: C.time },
  { id: 'm08', n: '08', label: 'Watermarks', col: 2, row: 1, c: C.time },
  { id: 'm09', n: '09', label: 'Windows', col: 2, row: 2, c: C.time },
  { id: 'm10', n: '10', label: 'Stateful Aggs', col: 3, row: 0, c: C.state },
  { id: 'm11', n: '11', label: 'Arbitrary State', col: 3, row: 1, c: C.state },
  { id: 'm12', n: '12', label: 'Output Modes', col: 3, row: 2, c: C.state },
  { id: 'm13', n: '13', label: 'Deduplication', col: 3, row: 3, c: C.state },
  { id: 'm14', n: '14', label: 'Sinks & foreachBatch', col: 4, row: 0, c: C.sink },
  { id: 'm15', n: '15', label: 'Checkpoint', col: 4, row: 1, c: C.sink },
  { id: 'm16', n: '16', label: 'Fault Tolerance', col: 4, row: 2, c: C.sink },
  { id: 'm17', n: '17', label: 'Stream-Static Join', col: 2, row: 3, c: C.join },
  { id: 'm18', n: '18', label: 'Stream-Stream Join', col: 3, row: 4, c: C.join },
  { id: 'm19', n: '19', label: 'Delta & MERGE', col: 5, row: 0, c: C.ops },
  { id: 'm20', n: '20', label: 'Performance', col: 5, row: 1, c: C.ops },
  { id: 'm21', n: '21', label: 'Monitoring', col: 5, row: 2, c: C.ops },
  { id: 'm22', n: '22', label: 'Capstone', col: 5, row: 4, c: C.end },
];
// directed dependency edges (from → to)
const EDGES = [
  ['m01', 'm02'], ['m02', 'm03'], ['m03', 'm04'], ['m04', 'm05'], ['m05', 'm06'],
  ['m05', 'm07'], ['m07', 'm08'], ['m08', 'm09'], ['m09', 'm10'], ['m08', 'm10'],
  ['m10', 'm11'], ['m10', 'm12'], ['m12', 'm13'], ['m10', 'm14'], ['m14', 'm15'],
  ['m15', 'm16'], ['m09', 'm17'], ['m17', 'm18'], ['m08', 'm18'], ['m14', 'm19'],
  ['m10', 'm20'], ['m05', 'm21'], ['m16', 'm22'], ['m18', 'm22'], ['m21', 'm22'], ['m19', 'm22'], ['m20', 'm22'],
];

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p>Every module and how it depends on the ones before it. Arrows point from a prerequisite to what it unlocks; the path converges on the <b>capstone (M22)</b>. Click any node to jump to that module.</p>
  </div>
  <div class="ss-canvas-wrap"><canvas id="map-canvas" width="760" height="520" style="cursor:pointer"></canvas></div>
  <div class="ss-caption" id="map-hint">Hover a node to highlight its dependencies; click to open it.</div>`;

  const overlay = `
  <div class="ss-prose">
    <h3>The same map, told as one ShopStream pipeline</h3>
    <p>Every concept on the graph is a stage ShopStream actually runs:</p>
    <div class="ss-grid">
      <div class="ss-card"><h4 style="color:#06B6D4">Foundation (01–02)</h4><p>ShopStream's orders + clickstream are <b>unbounded tables</b> — the same SQL as the batch warehouse, running forever.</p></div>
      <div class="ss-card"><h4 style="color:#3B82F6">Architecture (03–06)</h4><p>Orders arrive from <b>Kafka</b>, planned into <b>micro-batches</b> on a schedule.</p></div>
      <div class="ss-card"><h4 style="color:#8B5CF6">Time & Windows (07–09)</h4><p><b>Event time</b> + <b>watermarks</b> turn out-of-order orders into correct <b>windowed revenue</b>.</p></div>
      <div class="ss-card"><h4 style="color:#F59E0B">State & Output (10–13)</h4><p>Running revenue lives in the <b>state store</b>; <b>output modes</b> feed the warehouse (append) and the live dashboard (update).</p></div>
      <div class="ss-card"><h4 style="color:#10B981">Sinks & Reliability (14–16)</h4><p><b>Checkpoint</b> + a <b>Delta</b> sink make the whole thing <b>exactly-once</b> — it survived a Black-Friday node failure.</p></div>
      <div class="ss-card"><h4 style="color:#EF4444">Joins (17–18)</h4><p>Enrich orders with a <b>product dimension</b> (stream-static); correlate <b>cart ⋈ purchase</b> for conversions (stream-stream).</p></div>
      <div class="ss-card"><h4 style="color:#EC4899">Lakehouse & Ops (19–21)</h4><p><b>MERGE</b> maintains current-state tables; <b>tuning</b> + <b>monitoring</b> keep batch duration under the trigger.</p></div>
      <div class="ss-card"><h4 style="color:#FACC15">End-to-End (22)</h4><p>The <b>capstone</b> runs all of it as one query under one checkpoint and one watermark.</p></div>
    </div>
  </div>`;

  container.innerHTML = createModuleShell({
    tag: 'Reference · R1',
    title: '🗺️ Master Map',
    subtitle: 'The 22-module dependency graph, converging on the ShopStream capstone',
    tabs: [
      { id: 'map', label: '🗺️ Dependency graph', content: intro },
      { id: 'overlay', label: '🛒 ShopStream overlay', content: overlay },
    ],
  });
  initTabs(container);

  const canvas = container.querySelector('#map-canvas');
  const hint = container.querySelector('#map-hint');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const padX = 70, padTop = 30, colGap = (W - padX * 2) / 5;
  const NW = 116, NH = 40, rowGap = 92;

  const pos = {};
  NODES.forEach((nd) => {
    pos[nd.id] = { x: padX + nd.col * colGap, y: padTop + nd.row * rowGap + 20 };
  });

  let hoverId = null;

  function depsOf(id) {
    // highlight edges touching id (both directions) + neighbor nodes
    const nodes = new Set([id]); const edges = new Set();
    EDGES.forEach(([a, b], i) => { if (a === id || b === id) { edges.add(i); nodes.add(a); nodes.add(b); } });
    return { nodes, edges };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
    const hl = hoverId ? depsOf(hoverId) : null;

    // edges
    EDGES.forEach(([a, b], i) => {
      const pa = pos[a], pb = pos[b];
      const on = hl ? hl.edges.has(i) : false;
      ctx.strokeStyle = on ? '#E2E8F0' : 'rgba(148,163,184,0.22)';
      ctx.lineWidth = on ? 2 : 1;
      const x1 = pa.x + NW / 2, y1 = pa.y + NH, x2 = pb.x + NW / 2, y2 = pb.y;
      ctx.beginPath(); ctx.moveTo(x1, y1);
      const my = (y1 + y2) / 2;
      ctx.bezierCurveTo(x1, my, x2, my, x2, y2); ctx.stroke();
      // arrowhead
      ctx.fillStyle = on ? '#E2E8F0' : 'rgba(148,163,184,0.3)';
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 4, y2 - 7); ctx.lineTo(x2 + 4, y2 - 7); ctx.closePath(); ctx.fill();
    });

    // nodes
    NODES.forEach((nd) => {
      const p = pos[nd.id];
      const dim = hl && !hl.nodes.has(nd.id);
      ctx.globalAlpha = dim ? 0.3 : 1;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = nd.id === hoverId ? '#E2E8F0' : nd.c;
      ctx.lineWidth = nd.id === hoverId ? 2.5 : 1.5;
      ctx.beginPath(); ctx.roundRect(p.x, p.y, NW, NH, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = nd.c; ctx.font = 'bold 11px ui-monospace,monospace'; ctx.textAlign = 'left';
      ctx.fillText(nd.n, p.x + 9, p.y + 16);
      ctx.fillStyle = '#E2E8F0'; ctx.font = '10.5px ui-monospace,monospace';
      ctx.fillText(nd.label, p.x + 9, p.y + 30);
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
  }

  function nodeAt(mx, my) {
    return NODES.find((nd) => { const p = pos[nd.id]; return mx >= p.x && mx <= p.x + NW && my >= p.y && my <= p.y + NH; });
  }
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toCanvas(e);
    const nd = nodeAt(x, y);
    const id = nd ? nd.id : null;
    if (id !== hoverId) { hoverId = id; draw(); hint.textContent = nd ? `${nd.n} · ${nd.label} — click to open` : 'Hover a node to highlight its dependencies; click to open it.'; }
  });
  canvas.addEventListener('mouseleave', () => { if (hoverId) { hoverId = null; draw(); } });
  canvas.addEventListener('click', (e) => { const { x, y } = toCanvas(e); const nd = nodeAt(x, y); if (nd) location.hash = '#' + nd.id; });

  draw();
  return null;
}

export default { mount };
