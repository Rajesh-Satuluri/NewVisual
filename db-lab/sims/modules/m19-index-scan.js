import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// B+ tree nodes for the visualization
// Root → 2 internal → 4 leaves, then heap
const TREE_STEPS = [
  {
    label: 'Start: B+ tree root',
    highlight: 'root',
    desc: 'The index scan starts at the B+ tree root page. For products with 350M rows and ~2KB per row, the tree is ~3–4 levels deep. Root is always in buffer pool (pinned).',
    heapFetch: false,
  },
  {
    label: 'Level 2: Internal node',
    highlight: 'internal1',
    desc: "Root key 'M00000000' — our search key 'B08N5WRWNW' < 'M00000000', so we go left. One page read: root was cached, this internal node may not be.",
    heapFetch: false,
  },
  {
    label: 'Level 3: Leaf node',
    highlight: 'leaf2',
    desc: "Internal key 'C00000000' — 'B08N5WRWNW' > 'C00000000', go right. Another page read. Now at the leaf level.",
    heapFetch: false,
  },
  {
    label: 'Leaf: Found product_id',
    highlight: 'leaf2',
    desc: "Leaf node contains: B07XYZ1234, B08N5WRWNW, B09ABC5678. Found 'B08N5WRWNW' at position 2. The leaf stores the tuple ID (TID) = (page 1847203, slot 12).",
    heapFetch: false,
  },
  {
    label: 'Heap fetch: Page 1847203, slot 12',
    highlight: 'heap',
    desc: 'Using the TID from the leaf, fetch heap page 1847203. Random I/O — this page is unlikely to be in the buffer pool. Slot 12 on this page contains our product row.',
    heapFetch: true,
  },
];

function drawIndexScan(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to trace B+ tree traversal for product_id = B08N5WRWNW', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = TREE_STEPS[stepIdx];

  // B+ tree structure
  const nodes = {
    root:      { label: 'Root\n[H00… | M00… | T00…]', x: 400, y: 50,  w: 200, h: 36, color: '#4F46E5' },
    internal1: { label: 'Internal\n[A00… | C00… | G00…]', x: 220, y: 140, w: 180, h: 36, color: '#06B6D4' },
    internal2: { label: 'Internal\n[M00… | P00… | R00…]', x: 580, y: 140, w: 180, h: 36, color: '#06B6D4' },
    leaf1:     { label: 'Leaf\nA00…  B07XYZ  B08ABC', x: 100, y: 240, w: 160, h: 36, color: '#10B981' },
    leaf2:     { label: '★ Leaf\nB07XYZ  B08N5W  B09ABC', x: 320, y: 240, w: 180, h: 36, color: '#10B981' },
    leaf3:     { label: 'Leaf\nG00…  H00…  I00…', x: 540, y: 240, w: 160, h: 36, color: '#10B981' },
    leaf4:     { label: 'Leaf\nM00…  N00…  O00…', x: 720, y: 240, w: 160, h: 36, color: '#10B981' },
    heap:      { label: 'Heap Page 1847203\n→ slot 12: B08N5WRWNW', x: 320, y: 340, w: 200, h: 40, color: '#F59E0B' },
  };

  const edges = [
    ['root','internal1'], ['root','internal2'],
    ['internal1','leaf1'], ['internal1','leaf2'],
    ['internal2','leaf3'], ['internal2','leaf4'],
    ['leaf2','heap'],
  ];

  const pathNodes = {
    0: ['root'],
    1: ['root', 'internal1'],
    2: ['root', 'internal1', 'leaf2'],
    3: ['root', 'internal1', 'leaf2'],
    4: ['root', 'internal1', 'leaf2', 'heap'],
  };
  const activePath = new Set(pathNodes[stepIdx] || []);

  // Draw edges
  edges.forEach(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    const onPath = activePath.has(a) && activePath.has(b);
    ctx.strokeStyle = onPath ? '#4F46E5' : '#1E293B';
    ctx.lineWidth = onPath ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y + na.h/2 + 1); ctx.lineTo(nb.x, nb.y - na.h/2 + 14); ctx.stroke();
  });

  // Leaf linked list arrow
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  [[nodes.leaf1, nodes.leaf2],[nodes.leaf2,nodes.leaf3],[nodes.leaf3,nodes.leaf4]].forEach(([a,b]) => {
    ctx.beginPath(); ctx.moveTo(a.x + a.w/2, a.y); ctx.lineTo(b.x - b.w/2, b.y); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Draw nodes
  Object.entries(nodes).forEach(([id, n]) => {
    if (id === 'heap' && !step.heapFetch) return;
    const isActive = id === step.highlight;
    const onPath = activePath.has(id);
    const lines = n.label.split('\n');
    ctx.fillStyle = isActive ? n.color : (onPath ? n.color + '33' : '#0F172A');
    ctx.strokeStyle = isActive ? n.color : (onPath ? n.color + '88' : '#1E293B');
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(n.x - n.w/2, n.y - n.h/2, n.w, n.h, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : (onPath ? n.color : '#475569');
    ctx.font = (isActive ? '600' : '400') + ' 9px monospace';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, n.x, n.y - (lines.length-1)*6 + i*13 + 2));
    ctx.textAlign = 'left';
  });

  // Stats bar
  const reads = stepIdx + 1;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, h - 55, w - 40, 46, 6); ctx.fill();
  ctx.fillStyle = '#4F46E5'; ctx.font = '700 11px system-ui';
  ctx.fillText(`Page reads so far: ${reads} of 3–4 total (vs 5,250,000 for SeqScan)`, 30, h - 35);
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(`TID location: ${step.heapFetch ? '(page 1847203, slot 12) → fetching heap page' : 'still traversing index'}`, 30, h - 18);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M19',
    title: 'Index Scan',
    subtitle: 'B+ tree traversal from root to leaf to heap — 3 page reads vs 5.25 million for a full scan.',
    tabs: [
      { id: 'scan',  label: '🔍 Traversal' },
      { id: 'types', label: '📑 Scan Types' },
      { id: 'iq',    label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const scanTab = container.querySelector('#tab-scan');
  scanTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="idx-explainer">
        <h3>B+ Tree Index Scan</h3>
        <p>For <code>product_id = 'B08N5WRWNW'</code>, the query engine traverses the B+ tree:
           root → internal nodes → leaf → heap tuple. Total: 3–4 page reads.
           Press <strong>Play</strong> to trace each step.</p>
      </div>
    </div>
  `;

  const canvas = scanTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: TREE_STEPS.map((s, i) => ({ label: s.label, duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawIndexScan(ctx, state.step, 800, 400);
      const el = scanTab.querySelector('#idx-explainer');
      if (el && state.step >= 0) { const s = TREE_STEPS[state.step]; el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(scanTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(scanTab.querySelector('.canvas-wrap'), engine);
  drawIndexScan(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-types').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Index Scan Variants</div>
        <div class="section-desc">PostgreSQL supports five distinct index access methods</div>
      </div>
      <div class="info-grid">
        ${[
          { name: 'Index Scan', color: '#4F46E5', icon: '🔍',
            when: 'Highly selective predicate (< 5% of rows)',
            how: 'Traverse B+ tree, fetch each heap tuple by TID. Random I/O per row.',
            cost: '3 index reads + 1 heap read = 4 random I/Os for 1 row' },
          { name: 'Index Only Scan', color: '#10B981', icon: '⚡',
            when: 'All needed columns are in the index (covering index)',
            how: 'Traverse B+ tree only — no heap fetch needed. Fastest possible.',
            cost: '3 index reads total — no heap I/O' },
          { name: 'Bitmap Index Scan', color: '#06B6D4', icon: '🗺️',
            when: '1–10% selectivity with low heap correlation',
            how: 'First pass: traverse index, collect ALL matching TIDs into bitmap. Second pass: read heap pages in physical order (avoids random I/O).',
            cost: 'Index pass + sequential(-ish) heap pass' },
          { name: 'Multi-Column Index Scan', color: '#F59E0B', icon: '🔗',
            when: 'Composite index (a, b) with predicates on both columns',
            how: 'Index contains values for both columns — filter both during traversal. Leftmost prefix rule: index (a,b,c) — can use for a=x, a=x AND b=y, but NOT b=y alone.',
            cost: 'Same as IndexScan but filters more rows at index level' },
          { name: 'Loose Index Scan', color: '#8B5CF6', icon: '📌',
            when: 'SELECT DISTINCT col FROM table or MIN/MAX queries',
            how: 'Jump directly to the first/last entry of each distinct value in the leaf level. Skips intermediate values.',
            cost: 'O(n_distinct) reads — not O(n_rows)' },
        ].map(s => `
          <div class="info-card" style="border-color:${s.color}33">
            <div class="info-card-title" style="color:${s.color}">${s.icon} ${s.name}</div>
            <div style="font-size:11px;margin-bottom:6px"><strong>When:</strong> ${s.when}</div>
            <div style="font-size:11px;margin-bottom:6px"><strong>How:</strong> ${s.how}</div>
            <div style="background:var(--bg3);padding:6px;border-radius:4px;font-size:10px;color:${s.color}">Cost: ${s.cost}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does a B+ tree index scan work step by step?',
      a: 'Step 1: Start at the root page (always buffer-pool pinned). Compare search key against key array to pick child pointer direction. Step 2: Follow child pointer to internal node at level 2. Repeat binary search. Step 3: Arrive at leaf node. Leaf contains (key, TID) pairs sorted by key. Binary search finds the target key (or range start). Step 4: Extract TID = (page_number, slot_offset). Step 5: Fetch heap page using TID — random I/O to the actual row storage. Step 6: Verify visibility (MVCC check — is this version visible to our transaction?). Step 7: Return matching row. For a range scan, follow the leaf-to-leaf linked list for additional matching TIDs.',
      tip: 'The tree height determines the number of page reads. A 350M-row table with 4KB index pages has a tree height of ~4. More disk I/Os = taller tree.',
    },
    {
      q: 'What is the leftmost prefix rule for composite indexes?',
      a: 'A composite index on (a, b, c) sorts entries first by a, then b within equal a\'s, then c within equal (a, b). This means: (1) The index can answer predicates on a alone; (2) The index can answer predicates on a AND b; (3) The index can answer predicates on a AND b AND c; (4) The index CANNOT efficiently answer predicates on b alone or c alone — entries are sorted by a first, so b values are scattered across the entire leaf level without a being specified. Example: index on (status, created_at) — works for WHERE status=\'shipped\' AND created_at > \'2024-01-01\'; works for WHERE status=\'shipped\'; does NOT help WHERE created_at > \'2024-01-01\' alone.',
      tip: 'Design composite indexes in order of most-selective to least-selective for equality predicates; put range predicates at the end.',
    },
    {
      q: 'What is a Bitmap Index Scan and when does PostgreSQL use it?',
      a: 'A Bitmap Index Scan is a two-pass approach: <strong>Pass 1 (index scan)</strong>: traverse the B+ tree, collect all matching TIDs (tuple identifiers) into an in-memory bitmap (one bit per heap page). <strong>Pass 2 (heap scan)</strong>: read heap pages in physical order (bit order) — this converts random I/O into semi-sequential I/O. PostgreSQL uses it when selectivity is 1–10%: too selective for SeqScan, too many random I/Os for a plain IndexScan. PostgreSQL can also combine multiple bitmap scans with BitmapAnd/BitmapOr for multi-predicate queries: <code>WHERE status=\'shipped\' AND category=\'Electronics\'</code> — two separate index scans, AND their bitmaps.',
      tip: 'Bitmap Index Scan is PostgreSQL\'s smart middle ground. MySQL does not have this — it relies on ICP (Index Condition Pushdown) instead.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
