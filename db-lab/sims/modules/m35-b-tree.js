import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// B-Tree (original Bayer-McCreight): order-3, keys in both internal and leaf nodes
// Tree structure: root has [30, 70], left subtree [10,20], middle [40,60], right [80,90]
const BTREE_NODES = [
  { id: 'root', keys: [30, 70], x: 400, y: 40, type: 'internal', color: '#4F46E5' },
  { id: 'n1',   keys: [10, 20], x: 160, y: 140, type: 'leaf', color: '#10B981' },
  { id: 'n2',   keys: [40, 60], x: 400, y: 140, type: 'leaf', color: '#10B981' },
  { id: 'n3',   keys: [80, 90], x: 640, y: 140, type: 'leaf', color: '#10B981' },
];
const BTREE_EDGES = [['root','n1'],['root','n2'],['root','n3']];

const BTREE_STEPS = [
  { active: [], desc: 'B-Tree (Bayer & McCreight, 1972). Order-d: each node holds 1 to 2d keys and 2 to 2d+1 children. ALL keys have associated data pointers — internal and leaf nodes both store full data records.' },
  { active: ['root'], desc: 'Root node: keys [30, 70]. Three child pointers: left (keys < 30), middle (30 ≤ keys < 70), right (keys ≥ 70). Data record for key=30 and key=70 is stored HERE in the root.' },
  { active: ['root','n1'], desc: 'Left subtree: keys [10, 20]. Both have data records at this node. Search for key=10: root → left (10 < 30) → found at n1. No "leaf-only data" constraint — records anywhere.' },
  { active: ['root','n2'], desc: 'Middle subtree: keys [40, 60]. Records here too. B-Tree property: every node\'s keys are in sorted order; all keys in left subtree < parent keys < right subtree keys.' },
  { active: ['root','n3'], desc: 'Right subtree: keys [80, 90]. Leaf nodes (no children). B-Tree guarantees all leaves are at the same depth — perfectly balanced. Height = O(log_d N).' },
  { active: ['root','n1','n2','n3'], desc: 'Problem with B-Tree for databases: (1) Range scans require back-tracking up through internal nodes — no sibling pointers between leaves. (2) Internal nodes storing data reduces branching factor (fewer keys per node). B+ Tree solves both.' },
];

function drawBTree(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const step = BTREE_STEPS[Math.max(0, stepIdx)];
  const activeSet = new Set(step.active);

  BTREE_EDGES.forEach(([a, b]) => {
    const na = BTREE_NODES.find(n => n.id === a), nb = BTREE_NODES.find(n => n.id === b);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(na.x, na.y + 22); ctx.lineTo(nb.x, nb.y - 22); ctx.stroke();
  });

  BTREE_NODES.forEach(n => {
    const isActive = activeSet.has(n.id);
    const keys = n.keys;
    const nodeW = keys.length * 50 + 20;
    const nodeH = 44;
    const nx = n.x - nodeW / 2, ny = n.y - nodeH / 2;

    ctx.fillStyle = isActive ? n.color + '33' : '#0F172A';
    ctx.strokeStyle = isActive ? n.color : '#1E293B';
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 6); ctx.fill(); ctx.stroke();

    keys.forEach((k, ki) => {
      const kx = nx + ki * 50;
      if (ki > 0) {
        ctx.strokeStyle = isActive ? n.color + '66' : '#1E293B';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(kx, ny + 4); ctx.lineTo(kx, ny + nodeH - 4); ctx.stroke();
      }
      ctx.fillStyle = isActive ? n.color : '#475569';
      ctx.font = (isActive ? '700' : '400') + ' 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(k, kx + 25, ny + nodeH / 2 + 4);
      // Data pointer dot
      ctx.fillStyle = isActive ? '#F59E0B' : '#334155';
      ctx.beginPath(); ctx.arc(kx + 25, ny + nodeH - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left';
    });

    // Label
    ctx.fillStyle = isActive ? n.color : '#334155';
    ctx.font = '8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.type === 'internal' ? 'internal' : 'leaf', n.x, n.y + nodeH / 2 + 16);
    ctx.textAlign = 'left';
  });

  // Legend: dot = data pointer
  ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(24, h - 28, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
  ctx.fillText('● = data record pointer (exists in EVERY node, not just leaves)', 32, h - 24);

  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to walk through the B-Tree structure', w/2, h/2);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(20, h - 56, w - 40, 40, 4); ctx.fill();
    const words = step.desc.split(' ');
    let line = '', ly = h - 38;
    ctx.fillStyle = '#94A3B8'; ctx.font = '9.5px system-ui';
    words.forEach(wd => {
      const test = line + (line ? ' ' : '') + wd;
      if (ctx.measureText(test).width > w - 50) { ctx.fillText(line, 28, ly); line = wd; ly += 13; } else line = test;
    });
    if (line) ctx.fillText(line, 28, ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M35',
    title: 'B-Tree',
    subtitle: 'The original Bayer-McCreight B-Tree (1972): all nodes hold data records, perfectly balanced height.',
    tabs: [
      { id: 'btree',  label: '🌲 B-Tree Structure' },
      { id: 'props',  label: '📐 Properties' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const btTab = container.querySelector('#tab-btree');
  btTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="340" style="width:100%;max-height:340px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="bt-explainer">
        <h3>B-Tree — Balanced Multi-Way Search Tree</h3>
        <p>The B-Tree (Bayer & McCreight 1972) stores data records in <em>every</em> node — internal and leaf alike.
           Every node has 1–2d keys. All leaves are at the same depth.
           Press <strong>Play</strong> to explore the structure.</p>
      </div>
    </div>
  `;

  const canvas = btTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: BTREE_STEPS.map((s, i) => ({ label: `Step ${i+1}`, duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawBTree(ctx, state.step, 800, 340);
      const el = btTab.querySelector('#bt-explainer');
      if (el && state.step >= 0) { el.innerHTML = `<h3>Step ${state.step + 1}</h3><p>${BTREE_STEPS[state.step].desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(btTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(btTab.querySelector('.canvas-wrap'), engine);
  drawBTree(ctx, -1, 800, 340);
  engine.reset();

  container.querySelector('#tab-props').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">B-Tree Properties and Why Databases Use It</div>
      </div>
      <div class="prose">
        <h3>Formal Definition (order d)</h3>
        <ul>
          <li>Every non-root node has at least d keys (and d+1 children if internal).</li>
          <li>Every node has at most 2d keys (and 2d+1 children).</li>
          <li>Root has at least 1 key (at least 2 children if not a leaf).</li>
          <li>All leaf nodes are at the same depth — tree is perfectly height-balanced.</li>
          <li>Keys within each node are sorted. For an internal node with keys [k1, k2, …], all keys in subtree i satisfy ki-1 ≤ key < ki.</li>
        </ul>
        <h3>Height Analysis</h3>
        <div class="code-block" style="font-size:11px">
N = number of keys, d = order (min keys per node), 2d = max keys

Height ≤ log_{d+1}(N)   (minimum — all nodes maximally full)
Height ≥ log_{2d+1}(N)  (maximum — all nodes minimally full)

For PostgreSQL B+ tree on orders (350M rows), d=508 (8 KB page / 8 bytes/key):
Max height = log_509(350M) ≈ 3.8 → height = 4
Meaning: every search traverses ≤ 4 page reads.
        </div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Property</th><th>B-Tree</th><th>B+ Tree</th></tr></thead>
          <tbody>
            ${[
              ['Data storage', 'All nodes (internal + leaf)', 'Leaf nodes only'],
              ['Internal node keys', 'Keys + data pointers', 'Keys only (routing info)'],
              ['Branching factor', 'Lower (data takes space)', 'Higher (keys only = more keys/node)'],
              ['Range scan', 'Requires traversal back up', 'Leaf linked list — O(K) scan'],
              ['Point lookup', 'May find data at any level', 'Always reaches leaf node'],
              ['Space efficiency', 'Internal nodes hold data → less wasted', 'Duplicate keys in internal nodes'],
              ['Used by', 'Some older systems', 'PostgreSQL, MySQL InnoDB, SQL Server, Oracle'],
            ].map(([p, bt, bpt]) => `<tr><td><strong>${p}</strong></td><td style="font-size:10px">${bt}</td><td style="font-size:10px">${bpt}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the key difference between a B-Tree and a B+ Tree?',
      a: 'B-Tree: data records are stored in EVERY node (internal and leaf). A search can terminate at any node where the key is found. Range scan is expensive — finding 100 consecutive keys requires traversing up and down the tree multiple times. B+ Tree: data records exist ONLY in leaf nodes. Internal nodes contain only routing keys (copies of some leaf keys) to guide the search. Leaf nodes are linked in a doubly-linked list. Advantages: (1) Higher branching factor — internal nodes hold more keys (no data pointers), keeping tree height lower. (2) Range scan is O(log N + K) — find the first leaf, then follow linked list for K pages. (3) Full scans are sequential I/O along the leaf chain. PostgreSQL uses B+ Tree exclusively for all indexes (CREATE INDEX uses btree method by default). Every PostgreSQL index is a B+ Tree, not a B-Tree.',
      tip: 'Trick question: "Does PostgreSQL use B-Tree or B+ Tree?" — B+ Tree. Despite the misleading name in PostgreSQL documentation (it says "B-tree" but means B+ Tree with leaf linked list).',
    },
    {
      q: 'How does the B-Tree guarantee that all leaf nodes are at the same depth?',
      a: 'The B-Tree (and B+ Tree) grows and shrinks from the root, not the leaves. Insert: data is always inserted at the leaf level. If a leaf overflows (exceeds 2d keys): it splits into two half-full nodes, and the middle key is pushed UP to the parent. If the parent overflows → it splits too → propagates upward. If the root splits → a new root is created with one key and two children → tree height increases by 1. Delete: if a node underflows (fewer than d keys): borrow from a sibling (rotation) or merge with a sibling, possibly pulling a key down from the parent. If merges cascade to the root and the root becomes empty → root is deleted → tree height decreases by 1. Because all structural changes are rooted at the top and leaves are always at the frontier, all leaves remain at the same depth after any operation.',
      tip: 'B-Tree height only increases when the root splits (insert) or decreases when the root empties (delete). This is why B-Trees are called "balanced" — the invariant is maintained structurally, not through rotations.',
    },
    {
      q: 'What is the typical branching factor of a PostgreSQL B+ Tree index and why does it matter?',
      a: 'The branching factor (d, or max keys per internal node) determines tree height. PostgreSQL uses 8 KB pages. An internal B+ Tree page holds: page header (24 B) + item IDs + IndexTuple entries. Each IndexTuple in an internal node: 4-byte TID (page pointer) + index key. For an int8 (8 B) key: ~16 bytes per entry → 8192 / 16 ≈ 512 entries per internal node. Height for N=350M keys: log_512(350M) ≈ 3.3 → height = 4. 4 page reads for any lookup in 350M rows. For a composite key (int8, text(50)): ~70 bytes per entry → ~117 entries/page → log_117(350M) ≈ 4.3 → height = 5. Implication: keep index keys small. Wide composite indexes (many columns, long text) reduce branching factor → increase tree height → add page reads per lookup. At Amazon scale, a height-4 index on orders_pkey reads exactly 4 pages: 3 internal + 1 leaf + 1 heap = 5 total I/Os for a point lookup.',
      tip: 'Branching factor ≈ page_size / key_size. PostgreSQL defaults to 8KB pages. Using 16KB pages (--with-blocksize=16) doubles the branching factor and reduces tree height by 1 for the same dataset.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
