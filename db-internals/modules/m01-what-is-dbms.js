import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const LAYERS = [
  { label: 'Client Application',  color: '#4F46E5', icon: '💻', desc: 'Amazon storefront sends SQL queries via JDBC/ODBC' },
  { label: 'Query Processor',     color: '#818CF8', icon: '🔍', desc: 'Parser → Planner → Optimizer → Executor' },
  { label: 'Transaction Manager', color: '#06B6D4', icon: '💳', desc: 'ACID guarantees: locks, WAL, MVCC' },
  { label: 'Storage Engine',      color: '#10B981', icon: '💾', desc: 'Buffer Pool → B+ Tree → Disk pages' },
  { label: 'Disk Storage',        color: '#64748B', icon: '🗄️', desc: 'Physical files: data pages, WAL, indexes' },
];

function drawStack(ctx, highlightIdx, w, h) {
  const layerH = 64;
  const totalH = LAYERS.length * (layerH + 8);
  const startY = (h - totalH) / 2;
  const boxW   = Math.min(560, w - 80);
  const startX = (w - boxW) / 2;

  LAYERS.forEach((layer, i) => {
    const y = startY + i * (layerH + 8);
    const active = i === highlightIdx;

    ctx.fillStyle = active ? layer.color : '#1E293B';
    ctx.strokeStyle = active ? layer.color : '#334155';
    ctx.lineWidth = active ? 2 : 1;
    roundRect(ctx, startX, y, boxW, layerH, 10);
    ctx.fill();
    ctx.stroke();

    // icon
    ctx.font = '20px system-ui';
    ctx.fillText(layer.icon, startX + 18, y + layerH / 2 + 7);

    // label
    ctx.fillStyle = active ? '#fff' : '#94A3B8';
    ctx.font = `${active ? 700 : 500} 13px system-ui`;
    ctx.fillText(layer.label, startX + 52, y + layerH / 2 - 4);

    // desc
    ctx.fillStyle = active ? 'rgba(255,255,255,.7)' : '#475569';
    ctx.font = '11px system-ui';
    ctx.fillText(layer.desc, startX + 52, y + layerH / 2 + 14);

    // Arrow connector (skip last)
    if (i < LAYERS.length - 1) {
      const arrowY = y + layerH + 1;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, arrowY);
      ctx.lineTo(w / 2, arrowY + 6);
      ctx.stroke();
      // arrowhead
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(w/2 - 5, arrowY + 5);
      ctx.lineTo(w/2 + 5, arrowY + 5);
      ctx.lineTo(w/2, arrowY + 10);
      ctx.fill();
    }
  });

  // "Buy Now" packet travelling down on hover
  if (highlightIdx >= 0) {
    const y = startY + highlightIdx * (layerH + 8) + layerH / 2;
    ctx.fillStyle = LAYERS[highlightIdx].color;
    ctx.beginPath();
    ctx.arc(startX - 28, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Q', startX - 28, y + 4);
    ctx.textAlign = 'left';
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const STEPS = LAYERS.map((l, i) => ({
  label: l.label,
  duration: 1400,
  mutate: s => { s.highlight = i; },
}));

const IQ = [
  {
    q: 'What is the difference between a DBMS and a file system?',
    a: 'A file system stores raw bytes with no understanding of structure or relationships. A DBMS adds: (1) a query language for structured access, (2) ACID transaction guarantees so concurrent writes don\'t corrupt data, (3) crash recovery via WAL so committed data survives power failures, (4) access control and security, and (5) an optimizer that picks efficient access paths. On Prime Day, a file system can\'t handle 300M concurrent users safely — a DBMS can.',
    tip: 'Always tie the answer to concurrency, crash-safety, and query optimization — these are the three hardest problems a DBMS solves.',
  },
  {
    q: 'Explain the three-layer architecture of a DBMS.',
    a: '<strong>Query Processor:</strong> Parses SQL → builds an AST → generates a logical plan → optimizes it → executes it.<br><br><strong>Transaction Manager:</strong> Assigns transaction IDs, acquires locks, writes WAL records before modifying pages, enforces isolation levels.<br><br><strong>Storage Engine:</strong> Manages the buffer pool (in-memory page cache), reads/writes disk pages, maintains B+ tree indexes.',
    tip: 'Draw the three layers top-to-bottom and show data flowing through all three for a single INSERT.',
  },
  {
    q: 'What is the role of the buffer pool in a DBMS?',
    a: 'The buffer pool is the DBMS\'s in-memory page cache — a fixed-size pool of frames, each holding one disk page. When the query executor needs page P: (1) check buffer pool (cache hit → return frame), (2) cache miss → pick a victim frame (LRU/Clock policy), write it to disk if dirty, load page P into it. This amortizes expensive disk I/O across many queries. On Prime Day, a well-tuned buffer pool keeps 90%+ of hot pages in memory.',
    tip: 'Quote real numbers: a buffer pool hit takes ~100ns (DRAM), a miss requires a disk read at 100μs (SSD) or 10ms (HDD).',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M01',
    title: 'What is a DBMS?',
    subtitle: 'A Database Management System is the engine that safely stores and retrieves Amazon\'s 350 million products, 300 million customers, and billions of orders.',
    tabs: [
      { id: 'stack',     label: '🏗️ Architecture Stack' },
      { id: 'overview',  label: '📋 Core Components' },
      { id: 'iq',        label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Tab: Architecture Stack ────────────────────────────────────────────────
  const stackTab = container.querySelector('#tab-stack');
  stackTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:16px">
      <canvas width="800" height="430" style="width:100%;max-height:430px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="stack-explainer">
        <h3>Amazon Prime Day — "Buy Now" journey</h3>
        <p>Press <strong>Play</strong> to trace a single <code>SELECT + INSERT + COMMIT</code> through all five DBMS layers.
           Each highlighted layer shows what it does when a customer clicks "Buy Now".</p>
      </div>
    </div>
  `;

  const canvas = stackTab.querySelector('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 800, H = 430;

  const engine = new SimulationEngine({
    initialState: { highlight: -1 },
    steps: STEPS,
    onRender: (state) => {
      ctx.clearRect(0, 0, W, H);
      drawStack(ctx, state.highlight, W, H);
      const explainer = stackTab.querySelector('#stack-explainer');
      if (explainer && state.highlight >= 0) {
        const l = LAYERS[state.highlight];
        explainer.innerHTML = `
          <h3>${l.icon} ${l.label}</h3>
          <p>${l.desc}</p>
          <p style="margin-top:8px">The query packet (blue circle) is currently being processed here.</p>
        `;
      }
    },
  });

  SimulationEngine.renderControls(stackTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(stackTab.querySelector('.canvas-wrap'), engine);
  engine.reset();

  // ── Tab: Core Components ───────────────────────────────────────────────────
  container.querySelector('#tab-overview').innerHTML = `
    <div class="info-grid">
      ${[
        ['🔍','Query Processor','Parses SQL text into an AST, builds a logical relational algebra plan, optimizes it with cost estimates, then executes via the Volcano iterator model.','#4F46E5'],
        ['💳','Transaction Manager','Grants locks before reads/writes, writes WAL records before modifying pages, manages commit/rollback, and enforces ACID isolation levels.','#06B6D4'],
        ['💾','Storage Engine','Manages the buffer pool (page cache), handles disk I/O, maintains B+ tree and hash indexes, and ensures pages are written durably.','#10B981'],
        ['📋','Catalog Manager','Stores metadata: table schemas, column types, index definitions, statistics (row counts, histograms) used by the optimizer.','#F59E0B'],
        ['🛡️','Access Control','Authenticates users, enforces role-based permissions (GRANT/REVOKE), and audits sensitive data access.','#EF4444'],
        ['🔄','Recovery Manager','On crash restart, reads WAL from last checkpoint, redoes committed transactions, undoes uncommitted ones (ARIES protocol).','#8B5CF6'],
      ].map(([icon,title,body,clr]) => `
        <div class="info-card">
          <div class="info-card-icon">${icon}</div>
          <div class="info-card-title">${title}</div>
          <div class="info-card-body">${body}</div>
          <span class="info-card-tag" style="color:${clr};background:${clr}22">Core Component</span>
        </div>
      `).join('')}
    </div>
  `;

  // ── Tab: Interview Q&A ────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  initIQ(container);

  return () => engine.destroy();
}
