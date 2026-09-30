import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// ── Diagram data ───────────────────────────────────────────────────────────
const BOXES = {
  client:  { x: 340, y: 20,  w: 120, h: 36, label: '💻 Client App',     color: '#334155', text: '#94A3B8' },
  parser:  { x: 200, y: 100, w: 120, h: 36, label: '📝 Parser',          color: '#4F46E5', text: '#fff' },
  planner: { x: 340, y: 100, w: 120, h: 36, label: '📋 Planner',         color: '#4F46E5', text: '#fff' },
  optim:   { x: 480, y: 100, w: 120, h: 36, label: '🎯 Optimizer',       color: '#4F46E5', text: '#fff' },
  exec:    { x: 340, y: 170, w: 120, h: 36, label: '▶️ Executor',         color: '#4F46E5', text: '#fff' },
  txn:     { x: 160, y: 250, w: 120, h: 36, label: '💳 Txn Manager',     color: '#06B6D4', text: '#fff' },
  lock:    { x: 80,  y: 310, w: 110, h: 36, label: '🔐 Lock Manager',    color: '#06B6D4', text: '#fff' },
  wal:     { x: 200, y: 310, w: 110, h: 36, label: '📝 WAL Manager',     color: '#06B6D4', text: '#fff' },
  buf:     { x: 380, y: 250, w: 120, h: 36, label: '🏊 Buffer Pool',     color: '#10B981', text: '#fff' },
  idx:     { x: 320, y: 310, w: 110, h: 36, label: '🌳 Index Engine',    color: '#10B981', text: '#fff' },
  disk:    { x: 450, y: 310, w: 110, h: 36, label: '💾 Disk Manager',    color: '#10B981', text: '#fff' },
  log:     { x: 150, y: 390, w: 100, h: 36, label: '📄 WAL Log',         color: '#1E293B', text: '#64748B' },
  dbfiles: { x: 380, y: 390, w: 140, h: 36, label: '🗄️ DB Files / Pages',color: '#1E293B', text: '#64748B' },
};

const EDGES = [
  ['client','parser'],['client','planner'],['client','optim'],
  ['parser','planner'],['planner','optim'],['optim','exec'],
  ['exec','txn'],['exec','buf'],
  ['txn','lock'],['txn','wal'],
  ['buf','idx'],['buf','disk'],
  ['wal','log'],['disk','dbfiles'],['idx','dbfiles'],
];

// Animated steps — highlight which path lights up for a "Buy Now"
const STEPS = [
  { label: 'SQL arrives at parser', color: '#4F46E5', nodes: ['client','parser'] },
  { label: 'Planner builds logical plan', color: '#4F46E5', nodes: ['parser','planner'] },
  { label: 'Optimizer chooses physical plan', color: '#4F46E5', nodes: ['planner','optim'] },
  { label: 'Executor runs operators', color: '#4F46E5', nodes: ['optim','exec'] },
  { label: 'Transaction Manager takes over', color: '#06B6D4', nodes: ['exec','txn'] },
  { label: 'Lock Manager grants row lock', color: '#06B6D4', nodes: ['txn','lock'] },
  { label: 'WAL Manager writes log record', color: '#06B6D4', nodes: ['txn','wal','log'] },
  { label: 'Buffer Pool loads page into memory', color: '#10B981', nodes: ['exec','buf'] },
  { label: 'Index Engine traverses B+ tree', color: '#10B981', nodes: ['buf','idx'] },
  { label: 'Disk Manager flushes to storage', color: '#10B981', nodes: ['idx','disk','dbfiles'] },
];

function drawDiagram(ctx, activeNodes, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Draw group backgrounds
  const groups = [
    { label: 'Query Processor', x: 160, y: 80, w: 480, h: 140, color: 'rgba(79,70,229,.08)' },
    { label: 'Transaction Manager', x: 60, y: 230, w: 280, h: 140, color: 'rgba(6,182,212,.08)' },
    { label: 'Storage Engine', x: 300, y: 230, w: 290, h: 140, color: 'rgba(16,185,129,.08)' },
  ];
  groups.forEach(g => {
    ctx.fillStyle = g.color;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, g.x, g.y, g.w, g.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.font = '10px system-ui';
    ctx.fillText(g.label.toUpperCase(), g.x + 10, g.y + 14);
  });

  // Draw edges
  EDGES.forEach(([a, b]) => {
    const A = BOXES[a], B = BOXES[b];
    const ax = A.x + A.w/2, ay = A.y + A.h;
    const bx = B.x + B.w/2, by = B.y;
    const active = activeNodes.includes(a) && activeNodes.includes(b);
    ctx.strokeStyle = active ? '#818CF8' : '#1E293B';
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash(active ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(ax, ay + 20, bx, by - 20, bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    if (active) {
      // arrowhead
      ctx.fillStyle = '#818CF8';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - 6);
      ctx.lineTo(bx + 5, by - 6);
      ctx.lineTo(bx, by);
      ctx.fill();
    }
  });

  // Draw boxes
  Object.entries(BOXES).forEach(([key, box]) => {
    const active = activeNodes.includes(key);
    ctx.fillStyle = active ? box.color : '#0F172A';
    ctx.strokeStyle = active ? box.color : '#1E293B';
    ctx.lineWidth = active ? 2 : 1;
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = active ? box.text : '#475569';
    ctx.font = `${active ? 600 : 400} 11px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(box.label, box.x + box.w/2, box.y + box.h/2 + 4);
    ctx.textAlign = 'left';
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M03',
    title: 'DBMS Architecture',
    subtitle: 'Three layers — Query Processor, Transaction Manager, Storage Engine — and how a "Buy Now" click flows through all three.',
    tabs: [
      { id: 'diagram',    label: '🏗️ Architecture Diagram' },
      { id: 'layers',     label: '📋 Layer Deep-Dive' },
      { id: 'iq',         label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Tab: Diagram ──────────────────────────────────────────────────────────
  const diagTab = container.querySelector('#tab-diagram');
  diagTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:16px">
      <canvas width="800" height="450" style="width:100%;max-height:450px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="arch-explainer">
        <h3>DBMS Three-Layer Architecture</h3>
        <p>Click <strong>Play</strong> to trace an Amazon "Buy Now" click through every layer.
           Active nodes glow — watch the SQL travel from client all the way to the WAL log file and disk pages.</p>
      </div>
    </div>
  `;

  const canvas = diagTab.querySelector('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 800, H = 450;

  const engine = new SimulationEngine({
    initialState: { stepIdx: -1 },
    steps: STEPS.map((s, i) => ({
      label: s.label,
      duration: 1600,
      mutate: state => { state.stepIdx = i; },
    })),
    onRender: (state) => {
      const active = state.stepIdx >= 0 ? STEPS[state.stepIdx].nodes : [];
      drawDiagram(ctx, active, W, H);
      const el = diagTab.querySelector('#arch-explainer');
      if (el && state.stepIdx >= 0) {
        const s = STEPS[state.stepIdx];
        el.innerHTML = `
          <h3 style="color:${s.color}">${s.label}</h3>
          <p>Active components: <strong>${s.nodes.join(' → ')}</strong></p>
        `;
      }
    },
  });

  SimulationEngine.renderControls(diagTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(diagTab.querySelector('.canvas-wrap'), engine);
  drawDiagram(ctx, [], W, H);
  engine.reset();

  // ── Tab: Layer Deep-Dive ──────────────────────────────────────────────────
  container.querySelector('#tab-layers').innerHTML = `
    <div class="info-grid">
      ${[
        {
          icon:'🔍', title:'Query Processor', color:'#4F46E5',
          items:[
            'Parser: tokenises SQL, validates syntax, builds a parse tree',
            'Planner: converts parse tree to logical relational algebra plan',
            'Optimizer: rewrites plan for minimum cost using statistics',
            'Executor: runs operators top-down via Volcano iterator model',
          ]
        },
        {
          icon:'💳', title:'Transaction Manager', color:'#06B6D4',
          items:[
            'Assigns transaction IDs (XID) at BEGIN',
            'Lock Manager: grants S/X row-level locks, detects deadlocks',
            'WAL Manager: writes log records before modifying pages (Write-Ahead)',
            'Handles commit/rollback, enforces isolation level guarantees',
          ]
        },
        {
          icon:'💾', title:'Storage Engine', color:'#10B981',
          items:[
            'Buffer Pool: in-memory page cache, LRU eviction, dirty tracking',
            'Index Engine: B+ tree traversal for point & range lookups',
            'Disk Manager: reads/writes 8 KB pages, manages file extents',
            'Catalog: stores schema, statistics, index metadata',
          ]
        },
      ].map(layer => `
        <div class="info-card" style="border-color:${layer.color}33">
          <div class="info-card-icon">${layer.icon}</div>
          <div class="info-card-title" style="color:${layer.color}">${layer.title}</div>
          <ul style="padding-left:16px;margin-top:8px">
            ${layer.items.map(it => `<li class="info-card-body" style="margin-bottom:6px">${it}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>

    <div class="scroll-content" style="padding-top:8px">
      <div class="prose">
        <h3>Why separate into three layers?</h3>
        <p>Each layer can evolve independently. PostgreSQL replaced its query optimizer multiple times
           without touching the storage engine. InnoDB (MySQL's storage engine) can be swapped for
           RocksDB (MyRocks) without changing SQL parsing. The layers communicate through clean interfaces:
           page IDs (storage ↔ buffer pool) and operator trees (planner ↔ executor).</p>
        <h3>Where does Amazon Prime Day stress each layer?</h3>
        <p><strong>Query Processor:</strong> Thousands of concurrent SELECT queries hit the optimizer simultaneously.
           Poor cardinality estimates cause bad join orders → slow queries.</p>
        <p><strong>Transaction Manager:</strong> Millions of inventory decrements cause lock contention.
           Amazon moved to optimistic concurrency (MVCC) to avoid blocking reads.</p>
        <p><strong>Storage Engine:</strong> The buffer pool must keep hot inventory pages in RAM.
           Cold eviction of an inventory page causes a disk read that stalls checkout.</p>
      </div>
    </div>
  `;

  // ── Tab: Interview Q&A ────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does the query processor interact with the storage engine?',
      a: 'The executor calls storage engine operators: <code>open()</code>, <code>next()</code>, <code>close()</code> (the Volcano/iterator model). <code>next()</code> returns one tuple at a time, fetched from the buffer pool (or disk). The storage engine is completely unaware of SQL — it speaks in page IDs and tuple offsets. This separation lets the query layer be rewritten without touching storage.',
      tip: 'Draw the open/next/close call tree — interviewers love seeing you know the iterator model.',
    },
    {
      q: 'What happens inside the transaction manager when you call COMMIT?',
      a: '(1) WAL manager flushes the commit log record to disk — this is the durable point. (2) Lock manager releases all locks held by this transaction. (3) MVCC version chain marks the transaction\'s rows as visible to future readers. (4) If using a group commit, the commit waits for others in the batch to share one fsync. Steps 1 (WAL flush) is the only I/O that MUST complete before the client sees "OK".',
      tip: 'Emphasise that WAL flush precedes lock release — the WAL record makes the commit durable; releasing locks lets other transactions see the changes.',
    },
    {
      q: 'What is the Volcano iterator model and what are its tradeoffs?',
      a: 'The Volcano model (Gray & Graefe, 1994) organises operators as a tree. The root calls <code>next()</code> on its child, which calls its child, and so on. Each operator is pulled one tuple at a time. <strong>Pros:</strong> low memory (processes one tuple at a time, no materialisation), easy to compose operators. <strong>Cons:</strong> many virtual function calls — modern columnar databases use vectorised execution (process 1,000+ tuples per call) to reduce overhead.',
      tip: 'Mention vectorised execution (Snowflake, DuckDB) as the modern answer to Volcano\'s per-tuple overhead.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
