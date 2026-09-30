import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
const IDX_STEPS = [
  {
    active: null,
    desc: 'PostgreSQL supports 5 built-in index types: B-Tree, Hash, GIN, GiST, and BRIN. Each is optimized for a different query pattern. Choosing the wrong index type can make queries slower — or fail to use the index at all.',
  },
  {
    active: 'btree',
    desc: 'B-Tree (default): balanced tree of sorted keys. Supports =, <, >, BETWEEN, IS NULL, LIKE \'prefix%\'. The only type that supports multi-column and covering indexes efficiently. Orders table: CREATE INDEX ON orders(order_date) uses B-Tree by default.',
  },
  {
    active: 'hash',
    desc: 'Hash: maps key → hash bucket for O(1) exact equality. Only supports =. Smaller than B-Tree for equality-only workloads. Not WAL-safe before PostgreSQL 10 (now it is). Rarely needed — B-Tree handles equality just as well in most cases.',
  },
  {
    active: 'gin',
    desc: 'GIN (Generalized Inverted Index): inverted index — each element points to the set of rows containing it. Ideal for arrays, JSONB, and full-text search (tsvector). Slow to build, fast to query. Example: CREATE INDEX ON products USING GIN(tags) for array @> operator.',
  },
  {
    active: 'brin',
    desc: 'BRIN (Block Range Index): stores MIN and MAX value per range of heap pages. Tiny size (~10 KB even for a billion-row table). Only useful when column value correlates strongly with physical storage order. Perfect for order_date on an append-only orders table — Prime Day timestamps are naturally sequential.',
  },
  {
    active: 'partial',
    desc: 'Partial indexes: a WHERE clause limits which rows are indexed. CREATE INDEX ON orders(customer_id) WHERE status=\'placed\' — only indexes unshipped orders. Much smaller than a full index, fits in cache, dramatically faster for the common case query.',
  },
  {
    active: 'compare',
    desc: 'Summary: choose the index type based on the operator, data type, and query pattern. B-Tree covers 90% of OLTP needs. GIN for documents/arrays. BRIN for time-series append-only data. Partial indexes for high-selectivity filtered queries.',
  },
];

/* ── Index visual layouts ──────────────────────────────────────────────────── */
const BTREE_NODES = [
  { label:'30  60', x:0.5, y:0.12, color:'#4F46E5', w:100 },
  { label:'10  20', x:0.22, y:0.37, color:'#818CF8', w:90 },
  { label:'35  50', x:0.5,  y:0.37, color:'#818CF8', w:90 },
  { label:'65  80', x:0.78, y:0.37, color:'#818CF8', w:90 },
  { label:'5',   x:0.1,  y:0.62, color:'#10B981', w:44 },
  { label:'15',  x:0.22, y:0.62, color:'#10B981', w:44 },
  { label:'25',  x:0.34, y:0.62, color:'#10B981', w:44 },
  { label:'33',  x:0.45, y:0.62, color:'#10B981', w:44 },
  { label:'40',  x:0.55, y:0.62, color:'#10B981', w:44 },
  { label:'58',  x:0.65, y:0.62, color:'#10B981', w:44 },
  { label:'70',  x:0.75, y:0.62, color:'#10B981', w:44 },
  { label:'90',  x:0.88, y:0.62, color:'#10B981', w:44 },
];
const BTREE_EDGES = [[0,1],[0,2],[0,3],[1,4],[1,5],[1,6],[2,7],[2,8],[2,9],[3,10],[3,11]];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawBTree(ctx, w, h) {
  const nodeH = 22;
  BTREE_EDGES.forEach(([a, b]) => {
    const na = BTREE_NODES[a], nb = BTREE_NODES[b];
    ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(na.x * w, na.y * h + nodeH);
    ctx.lineTo(nb.x * w, nb.y * h);
    ctx.stroke();
  });
  BTREE_NODES.forEach(n => {
    const nx = n.x * w - n.w / 2, ny = n.y * h;
    ctx.fillStyle = n.color; ctx.strokeStyle = n.color + 'CC'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, n.w, nodeH, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x * w, ny + 14);
  });
}

function drawHash(ctx, w, h) {
  const buckets = 5;
  const bW = 80, bH = 28, gap = 16;
  const startX = (w - (bW + gap) * buckets + gap) / 2;

  ctx.fillStyle = '#334155'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Hash Function: h(key) mod 5', w / 2, 28);

  for (let i = 0; i < buckets; i++) {
    const bx = startX + i * (bW + gap), by = 42;
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bW, bH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#818CF8'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Bucket ' + i, bx + bW / 2, by + 17);
  }

  // TID pointers in buckets
  const entries = [
    { bucket:0, tids:['(12,3)', '(45,1)'] },
    { bucket:1, tids:['(8,7)'] },
    { bucket:2, tids:['(21,4)', '(33,2)', '(67,5)'] },
    { bucket:3, tids:['(5,1)'] },
    { bucket:4, tids:['(19,8)'] },
  ];
  entries.forEach(e => {
    const bx = startX + e.bucket * (bW + gap);
    e.tids.forEach((tid, j) => {
      const ty = 80 + j * 20;
      ctx.fillStyle = '#10B98133'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.roundRect(bx + 6, ty, bW - 12, 16, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#10B981'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText(tid, bx + bW / 2, ty + 11);
    });
  });
}

function drawGIN(ctx, w, h) {
  // inverted index: term → posting list
  const terms = [
    { word:'prime',    posts:['row 1', 'row 3', 'row 7'] },
    { word:'sale',     posts:['row 1', 'row 2'] },
    { word:'deal',     posts:['row 2', 'row 5'] },
    { word:'flash',    posts:['row 3', 'row 6', 'row 9'] },
    { word:'shipping', posts:['row 4', 'row 7'] },
  ];
  const tX = 24, pX = 160;
  ctx.fillStyle = '#334155'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Token (term / array element)', tX, 24);
  ctx.fillText('Posting list (heapctids)', pX, 24);

  terms.forEach((t, i) => {
    const ty = 38 + i * 38;
    // term box
    ctx.fillStyle = '#4F46E522'; ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tX, ty, 110, 24, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#818CF8'; ctx.font = '700 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(t.word, tX + 8, ty + 15);

    // arrow
    ctx.strokeStyle = '#334155'; ctx.beginPath();
    ctx.moveTo(tX + 114, ty + 12); ctx.lineTo(pX - 6, ty + 12); ctx.stroke();

    // posting boxes
    t.posts.forEach((p, j) => {
      const px = pX + j * 64;
      ctx.fillStyle = '#10B98122'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.roundRect(px, ty, 58, 24, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#10B981'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(p, px + 29, ty + 15);
    });
  });
}

function drawBRIN(ctx, w, h) {
  const blocks = 6;
  const bW = (w - 80) / blocks, bH = 60;
  const startX = 40, by = 40;

  ctx.fillStyle = '#334155'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Heap blocks (order_date values — naturally sequential)', w / 2, 24);

  const ranges = [
    { min:'Jan 1', max:'Jan 3' },
    { min:'Jan 3', max:'Jan 6' },
    { min:'Jan 6', max:'Jan 10' },
    { min:'Jan 10', max:'Jan 15' },
    { min:'Jan 15', max:'Jan 21' },
    { min:'Jan 21', max:'Jan 31' },
  ];
  const colors = ['#4F46E5','#818CF8','#10B981','#06B6D4','#F59E0B','#A78BFA'];

  ranges.forEach((r, i) => {
    const bx = startX + i * bW;
    ctx.fillStyle = colors[i] + '33'; ctx.strokeStyle = colors[i]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, bW - 4, bH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors[i]; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Block ' + i, bx + bW / 2 - 2, by + 16);
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(r.min, bx + bW / 2 - 2, by + 32);
    ctx.fillText('→ ' + r.max, bx + bW / 2 - 2, by + 44);
  });

  // BRIN entry
  const ey = by + bH + 24;
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(startX, ey, w - 80, 30, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F59E0B'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('BRIN index: ~5 rows  (one per 128-page range) — entire table covered with kilobytes of index data', startX + 10, ey + 18);
}

function drawPartial(ctx, w, h) {
  const allH = 160, filtH = 100;
  const col1X = 20, col2X = w / 2 + 10, colW = w / 2 - 30;

  // full index
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#64748B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(col1X, 30, colW, allH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#64748B'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Full Index on customer_id', col1X + 8, 48);
  ctx.fillStyle = '#475569'; ctx.font = '8px system-ui';
  ctx.fillText('10,000,000 rows', col1X + 8, 62);
  ctx.fillText('all statuses included:', col1X + 8, 76);
  const all = ['placed','shipped','delivered','cancelled','refunded'];
  all.forEach((s, i) => {
    ctx.fillStyle = '#475569'; ctx.fillText('• ' + s, col1X + 14, 92 + i * 16);
  });
  ctx.fillStyle = '#EF4444'; ctx.font = '700 8px system-ui';
  ctx.fillText('Size: ~650 MB', col1X + 8, 200);

  // partial index
  ctx.fillStyle = '#071C10'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(col2X, 30, colW, filtH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#10B981'; ctx.font = '700 9px system-ui';
  ctx.fillText("Partial Index WHERE status='placed'", col2X + 8, 48);
  ctx.fillStyle = '#34D399'; ctx.font = '8px system-ui';
  ctx.fillText('~250,000 rows (active orders only)', col2X + 8, 62);
  ctx.fillText('• placed', col2X + 14, 80);
  ctx.fillStyle = '#10B981'; ctx.font = '700 8px system-ui';
  ctx.fillText('Size: ~16 MB  (fits in L3 cache!)', col2X + 8, 105);
  ctx.fillStyle = '#064E3B'; ctx.font = '8px system-ui';
  ctx.fillText('97% smaller — faster scans, less I/O', col2X + 8, 120);
}

function drawCompare(ctx, w, h) {
  const types = ['B-Tree','Hash','GIN','BRIN','Partial'];
  const cols  = ['Operators','Best for','Size','Build speed'];
  const data = [
    ['=  <  >  BETWEEN  LIKE\'x%\'','OLTP, multi-col, covering','Medium','Fast'],
    ['= only','High-cardinality eq lookups','Small','Fast'],
    ['@>  @@  ?  &&','Arrays, JSONB, full-text','Large (inverted)','Slow'],
    ['= (range scan)','Append-only time-series','Tiny','Instant'],
    ['Any (+ WHERE)','Filtered subsets','Smallest','Fast'],
  ];
  const cW = (w - 32) / (cols.length + 1), rowH = 30;
  const startY = 30, startX = 16;

  // header
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(startX, startY, w - 32, rowH);
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Type', startX + 6, startY + 19);
  cols.forEach((c, i) => ctx.fillText(c, startX + (i + 1) * cW + 6, startY + 19));

  const typeColors = ['#4F46E5','#10B981','#F59E0B','#06B6D4','#A78BFA'];
  data.forEach((row, ri) => {
    const ry = startY + (ri + 1) * rowH;
    ctx.fillStyle = ri % 2 === 0 ? '#0A0F1A' : '#0F172A';
    ctx.fillRect(startX, ry, w - 32, rowH);
    ctx.fillStyle = typeColors[ri]; ctx.font = '700 9px system-ui';
    ctx.fillText(types[ri], startX + 6, ry + 19);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    row.forEach((cell, ci) => ctx.fillText(cell, startX + (ci + 1) * cW + 6, ry + 19));
  });

  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= data.length + 1; i++) {
    const y = startY + i * rowH;
    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + w - 32, y); ctx.stroke();
  }
  ctx.textAlign = 'left';
}

const DRAWERS = { btree:drawBTree, hash:drawHash, gin:drawGIN, brin:drawBRIN, partial:drawPartial, compare:drawCompare };

function drawIndex(ctx, stepIdx, w, h) {
  const step = IDX_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  if (!step.active) {
    // overview grid of 5 boxes
    const boxes = [
      { name:'B-Tree', color:'#4F46E5', desc:'Range + equality\nDefault type' },
      { name:'Hash',   color:'#10B981', desc:'Equality only\nO(1) lookup' },
      { name:'GIN',    color:'#F59E0B', desc:'Arrays, JSONB\nFull-text search' },
      { name:'BRIN',   color:'#06B6D4', desc:'Block ranges\nTime-series data' },
      { name:'Partial',color:'#A78BFA', desc:'Filtered rows\nSmallest size' },
    ];
    const bW = (w - 80) / boxes.length, bH = 90;
    const startX = 20, startY = h / 2 - bH / 2;
    boxes.forEach((b, i) => {
      const bx = startX + i * (bW + 10);
      ctx.fillStyle = b.color + '22'; ctx.strokeStyle = b.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx, startY, bW, bH, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b.color; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(b.name, bx + bW / 2, startY + 24);
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
      b.desc.split('\n').forEach((line, li) => {
        ctx.fillText(line, bx + bW / 2, startY + 42 + li * 15);
      });
    });
    ctx.textAlign = 'left';
    return;
  }

  const drawer = DRAWERS[step.active];
  if (drawer) {
    // badge
    const labels = { btree:'B-Tree', hash:'Hash', gin:'GIN', brin:'BRIN', partial:'Partial Index', compare:'Comparison' };
    const colors  = { btree:'#4F46E5', hash:'#10B981', gin:'#F59E0B', brin:'#06B6D4', partial:'#A78BFA', compare:'#64748B' };
    const lbl = labels[step.active], col = colors[step.active];
    ctx.fillStyle = col + '22'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(16, 6, 90, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(lbl, 61, 19);
    ctx.textAlign = 'left';

    ctx.save();
    ctx.translate(0, 32);
    drawer(ctx, w, h - 32);
    ctx.restore();
  }
}

/* ── When-to-use tab ───────────────────────────────────────────────────────── */
function renderUsageTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">When to Use Each Index Type</h3>
  ${[
    { name:'B-Tree', color:'#4F46E5', when:'Default choice for almost everything — single-column, multi-column, and covering indexes. Use for ORDER BY, BETWEEN, range predicates, and any equality query. The only type supporting compound indexes across mixed types.', sql:"CREATE INDEX ON orders(order_date);\nCREATE INDEX ON orders(customer_id, created_at) INCLUDE (total);" },
    { name:'Hash', color:'#10B981', when:'Only when the column has very high cardinality (many distinct values), queries use ONLY equality (=), and index size matters. In practice, B-Tree handles equality just as efficiently — Hash has narrow value in modern PostgreSQL.', sql:"CREATE INDEX ON sessions USING HASH (session_token);" },
    { name:'GIN', color:'#F59E0B', when:'Arrays (products.tags @> \'{prime,sale}\'), JSONB (metadata @> \'{\"category\":\"electronics\"}\'), and tsvector full-text search. GIN is an inverted index — each element maps to all rows containing it. Build once, query many times.', sql:"CREATE INDEX ON products USING GIN(tags);\nCREATE INDEX ON items USING GIN(metadata jsonb_ops);" },
    { name:'BRIN', color:'#06B6D4', when:'Append-only tables where column values correlate with physical insert order. A Prime Day orders table with order_date is ideal: each block range covers a narrow date window. BRIN is ~100× smaller than a B-Tree on the same column.', sql:"CREATE INDEX ON orders USING BRIN(order_date) WITH (pages_per_range=32);" },
    { name:'Partial', color:'#A78BFA', when:'Highly selective predicates that you always include in queries. Index only active orders, unshipped items, or non-null values. The index fits in RAM and is scanned exclusively — perfect for \"give me all pending orders\" workflows.', sql:"CREATE INDEX ON orders(customer_id) WHERE status = 'placed';\nCREATE INDEX ON events(user_id) WHERE processed_at IS NULL;" },
  ].map(t => `
    <div style="margin-bottom:20px;border-left:3px solid ${t.color};padding-left:14px">
      <h4 style="margin:0 0 6px;color:${t.color}">${t.name}</h4>
      <p style="margin:0 0 8px;font-size:12px">${t.when}</p>
      <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:4px;padding:10px;font-size:10.5px;color:#94A3B8;overflow-x:auto;margin:0">${t.sql}</pre>
    </div>`).join('')}
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'When would you choose a BRIN index over a B-Tree index for an order_date column?',
      a: `BRIN is the right choice when three conditions hold: (1) the column has a <strong>strong physical correlation with heap storage order</strong> — i.e., rows are inserted in roughly sorted order of that column; (2) the query accesses a <strong>date range</strong> rather than a single value; (3) the table is <strong>very large and append-mostly</strong> (orders, events, logs).<br><br>
For a Prime Day orders table with billions of rows, BRIN stores one (min_date, max_date) entry per 128 pages. The entire index is a few kilobytes versus a B-Tree that might be gigabytes. BRIN queries work by eliminating block ranges whose max < query_start or min > query_end, then scanning all remaining pages. The tradeoff: BRIN is only efficient for range scans over recent data. For point lookups (WHERE order_id = 12345) or heavily out-of-order data, use B-Tree.`,
    },
    {
      q: 'What is a covering index and how does it eliminate heap fetches?',
      a: `A covering index contains all columns needed by a query, so PostgreSQL can satisfy the query entirely from the index without visiting the heap at all — an <strong>index-only scan</strong>.<br><br>
Standard index: <code>CREATE INDEX ON orders(customer_id)</code> — the index leaf holds (customer_id, TID). PostgreSQL follows TID → heap page → fetches row to get other columns like order_date and total.<br><br>
Covering index: <code>CREATE INDEX ON orders(customer_id) INCLUDE (order_date, total)</code> — the leaf also stores order_date and total. A query <code>SELECT order_date, total FROM orders WHERE customer_id = 42</code> never touches the heap. For Prime Day customer-history pages fetching recent orders per customer, this eliminates millions of random heap reads.`,
    },
    {
      q: 'When would you use a GIN index and what are its tradeoffs versus a B-Tree?',
      a: `GIN (Generalized Inverted Index) is designed for <strong>multi-valued columns</strong> — arrays, JSONB, tsvector. It builds an inverted mapping: each distinct element or key points to a list of heap tuples containing it. This makes <code>WHERE tags @> '{prime, sale}'</code> (find rows containing ALL of these tags) extremely efficient — intersect two short posting lists.<br><br>
Tradeoffs: (1) <strong>Slow writes</strong> — every INSERT/UPDATE must update potentially many posting lists; GIN has a "pending list" buffer to batch updates (gin_pending_list_limit); (2) <strong>Large size</strong> — the inverted structure can be larger than a B-Tree on the same column; (3) No range support — GIN doesn't support <, >, ORDER BY on indexed values.<br><br>
B-Tree GIN choice: if the column is a scalar with range queries → B-Tree. If the column is array/JSONB/tsvector with containment/overlap/text search → GIN.`,
    },
  ]);
}

/* ── Mount ─────────────────────────────────────────────────────────────────── */
export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Storage',
    title: 'Index Types',
    subtitle: 'B-Tree, Hash, GIN, BRIN, and partial indexes — choosing the right structure for each query pattern',
    tabs: [
      { id: 'anim',  label: 'Index Types' },
      { id: 'usage', label: 'When to Use' },
      { id: 'iq',    label: 'Interview Q&A' },
    ],
  });

  const { tabs, body } = shell;

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:300px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = IDX_STEPS.map((s, i) => ({
        label: `Step ${i + 1}`,
        duration: 2800,
        mutate: state => { state.stepIdx = i; },
      }));

      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d');
          const pr  = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          ctx.scale(pr, pr);
          drawIndex(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = IDX_STEPS[i].desc; });
      desc.textContent = IDX_STEPS[0].desc;

      return () => engine.destroy();
    },
    usage: renderUsageTab,
    iq:    renderIQ,
  });

  return null;
}
