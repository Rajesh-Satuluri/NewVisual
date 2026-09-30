import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// B+ Tree: internal nodes = routing keys only, leaf nodes = keys + TID data, leaves linked
const BPT_NODES = [
  { id: 'root',  keys: [30, 70],     x: 400, y: 40,  type: 'internal', color: '#4F46E5' },
  { id: 'i1',   keys: [10, 20],     x: 180, y: 140, type: 'internal', color: '#818CF8' },
  { id: 'i2',   keys: [40, 60],     x: 400, y: 140, type: 'internal', color: '#818CF8' },
  { id: 'i3',   keys: [80, 90],     x: 620, y: 140, type: 'internal', color: '#818CF8' },
  { id: 'l1',   keys: [5,10],       x: 80,  y: 260, type: 'leaf', color: '#10B981' },
  { id: 'l2',   keys: [15,20],      x: 200, y: 260, type: 'leaf', color: '#10B981' },
  { id: 'l3',   keys: [25,30],      x: 320, y: 260, type: 'leaf', color: '#10B981' },
  { id: 'l4',   keys: [40,50,60],   x: 440, y: 260, type: 'leaf', color: '#10B981' },
  { id: 'l5',   keys: [70,80,90],   x: 600, y: 260, type: 'leaf', color: '#10B981' },
  { id: 'l6',   keys: [95,99],      x: 720, y: 260, type: 'leaf', color: '#10B981' },
];
const BPT_EDGES = [
  ['root','i1'],['root','i2'],['root','i3'],
  ['i1','l1'],['i1','l2'],['i2','l3'],['i2','l4'],['i3','l5'],['i3','l6'],
];
const LEAF_CHAIN = ['l1','l2','l3','l4','l5','l6'];

const BPT_STEPS = [
  { highlight: [], chains: false, desc: 'B+ Tree: internal nodes hold ROUTING KEYS ONLY (no data). Leaf nodes hold all keys with TID data pointers. All leaves linked in a doubly-linked list at the same depth.' },
  { highlight: ['root'], chains: false, desc: 'Root: keys [30, 70] — routing only. Three child pointers: left subtree (< 30), middle (30–70), right (≥ 70). No data records here — just routing information.' },
  { highlight: ['i1','i2','i3'], chains: false, desc: 'Internal level: three nodes with routing keys only. Keys are COPIES of leaf keys promoted upward during splits. No heap TID here — data is always in leaves.' },
  { highlight: ['l1','l2','l3','l4','l5','l6'], chains: false, desc: 'Leaf level: all keys with TID (heap page, slot) pointers. Keys are in sorted order across all leaves. This is where actual data lives.' },
  { highlight: ['l1','l2','l3','l4','l5','l6'], chains: true, desc: 'Leaf linked list: each leaf has a right-sibling pointer (and left for backward scan). Range scan [20, 60]: find leaf with 20, follow chain → l2 → l3 → l4 until key > 60. O(K) sequential I/O.' },
  { highlight: ['root','i1','l1'], chains: true, desc: 'Point lookup for key=10: root (10 < 30 → left) → i1 (10 ≤ 10 → l1) → leaf l1 → found. 3 page reads for internal nodes + 1 leaf = 4 I/Os total.' },
];

function drawBPlusTree(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const step = BPT_STEPS[Math.max(0, stepIdx)];
  const activeSet = new Set(step.highlight);

  // Edges
  BPT_EDGES.forEach(([a, b]) => {
    const na = BPT_NODES.find(n => n.id === a), nb = BPT_NODES.find(n => n.id === b);
    const isActive = activeSet.has(a) || activeSet.has(b);
    ctx.strokeStyle = isActive ? '#4F46E5' + '88' : '#1E293B'; ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(na.x, na.y + 22); ctx.lineTo(nb.x, nb.y - 22); ctx.stroke();
  });

  // Leaf chain
  if (step.chains) {
    for (let i = 0; i < LEAF_CHAIN.length - 1; i++) {
      const na = BPT_NODES.find(n => n.id === LEAF_CHAIN[i]);
      const nb = BPT_NODES.find(n => n.id === LEAF_CHAIN[i + 1]);
      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(na.x + 50, na.y + 6); ctx.lineTo(nb.x - 50, nb.y + 6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10B981'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('→', (na.x + 50 + nb.x - 50) / 2, na.y + 9);
      ctx.textAlign = 'left';
    }
  }

  // Nodes
  BPT_NODES.forEach(n => {
    const isActive = activeSet.has(n.id);
    const nodeW = n.keys.length * 44 + 16;
    const nodeH = 44;
    const nx = n.x - nodeW / 2, ny = n.y - nodeH / 2;

    ctx.fillStyle = isActive ? n.color + '33' : '#0A0F1A';
    ctx.strokeStyle = isActive ? n.color : '#1E293B';
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 6); ctx.fill(); ctx.stroke();

    n.keys.forEach((k, ki) => {
      if (ki > 0) {
        ctx.strokeStyle = isActive ? n.color + '55' : '#1E293B'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(nx + ki * 44, ny + 4); ctx.lineTo(nx + ki * 44, ny + nodeH - 4); ctx.stroke();
      }
      ctx.fillStyle = isActive ? n.color : '#475569';
      ctx.font = (isActive ? '700' : '400') + ' 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(k, nx + ki * 44 + 22, ny + nodeH / 2 - 2);
      if (n.type === 'leaf') {
        ctx.fillStyle = isActive ? '#F59E0B' : '#334155';
        ctx.font = '7px system-ui';
        ctx.fillText('TID', nx + ki * 44 + 22, ny + nodeH / 2 + 10);
      } else {
        ctx.fillStyle = '#334155'; ctx.font = '7px system-ui';
        ctx.fillText('→', nx + ki * 44 + 22, ny + nodeH / 2 + 10);
      }
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = isActive ? n.color : '#334155';
    ctx.font = '8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.type, n.x, ny + nodeH + 12);
    ctx.textAlign = 'left';
  });

  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to explore B+ Tree structure and leaf chain', w/2, h/2);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(20, h - 52, w - 40, 44, 4); ctx.fill();
    const words = step.desc.split(' ');
    let line = '', ly = h - 36;
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
    tag: 'Storage Engine · M36',
    title: 'B+ Tree',
    subtitle: 'B+ Tree: routing keys in internal nodes, all data in leaf nodes, leaves linked for range scans.',
    tabs: [
      { id: 'bptree', label: '🌳 B+ Tree Structure' },
      { id: 'leaf',   label: '🍃 Leaf Chain Scan' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const bptTab = container.querySelector('#tab-bptree');
  bptTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="bpt-explainer">
        <h3>B+ Tree — The Standard Database Index</h3>
        <p>All production databases (PostgreSQL, MySQL InnoDB, SQL Server, Oracle) use B+ Trees.
           Internal nodes route the search; leaf nodes hold the data. Leaves form a sorted linked list
           for range scans. Press <strong>Play</strong> to explore.</p>
      </div>
    </div>
  `;
  const canvas = bptTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: BPT_STEPS.map((s, i) => ({ label: `Step ${i+1}`, duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawBPlusTree(ctx, state.step, 800, 360);
      const el = bptTab.querySelector('#bpt-explainer');
      if (el && state.step >= 0) { el.innerHTML = `<h3>Step ${state.step + 1}</h3><p>${BPT_STEPS[state.step].desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(bptTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(bptTab.querySelector('.canvas-wrap'), engine);
  drawBPlusTree(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-leaf').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Leaf Node Linked List — Range Scans in O(K)</div>
        <div class="section-desc">The key advantage of B+ Tree over B-Tree for database range queries</div>
      </div>
      <div class="prose">
        <h3>Range Scan Algorithm</h3>
        <div class="code-block">
Range query: WHERE order_id BETWEEN 1001 AND 1050

1. Root → internal node: navigate as point lookup to first key ≥ 1001
2. Arrive at leaf L containing key 1001
3. Scan L sequentially (keys are sorted within each leaf)
4. Follow right-sibling pointer → next leaf (sequential I/O)
5. Continue until key > 1050 or EOF
6. For each key found: fetch heap page by TID (ctid)

Cost: O(log N) to find first leaf + O(K/f) to scan K rows across leaves
      where f = keys per leaf page (fill factor)
        </div>
        <h3>Backward Scan (ORDER BY DESC)</h3>
        <p>PostgreSQL B+ Tree leaves have BOTH left and right sibling pointers.
           For <code>ORDER BY order_id DESC LIMIT 10</code>: navigate to the rightmost leaf,
           follow left-sibling pointers. No sort needed — index provides the order.</p>
      </div>
      <div class="info-grid">
        ${[
          { label: 'Leaf page size', color: '#10B981', desc: 'Each leaf page holds ~500 keys (8 KB page / 16 bytes per int8 key + TID). A range scan of 5000 rows = ~10 leaf page reads — 10 sequential I/Os.' },
          { label: 'Right/left sibling pointers', color: '#4F46E5', desc: 'BTPageOpaqueData stores btpo_prev and btpo_next (sibling page numbers). Forward and backward scans follow these pointers without returning to parent nodes.' },
          { label: 'Index-Only Scan', color: '#06B6D4', desc: 'If all SELECT columns are in the index, PostgreSQL uses Index-Only Scan: reads the leaf page but skips the heap fetch. Checks the Visibility Map to confirm all-visible (no MVCC heap visit needed).' },
          { label: 'Loose index scan (missing feature)', color: '#F59E0B', desc: 'PostgreSQL lacks "loose index scan" for SELECT DISTINCT or GROUP BY on an index. Without it, GROUP BY category on an index must scan all index entries. Workaround: recursive CTE technique for sparse distinct values.' },
        ].map(e => `
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does a B+ Tree leaf linked list enable efficient range scans in PostgreSQL?',
      a: 'Every B+ Tree leaf page has a btpo_next pointer (right sibling page number stored in BTPageOpaqueData). A range scan (WHERE order_id BETWEEN 1001 AND 1050): (1) Descend from root to the first leaf containing 1001 — O(log N) page reads, typically 3–4. (2) Scan the leaf sequentially — keys are sorted within a leaf. (3) Follow btpo_next to the next leaf — a direct page number lookup, no tree traversal. (4) Repeat until key > 1050. This makes range scan cost O(log N + K/f) where K = rows returned and f ≈ 500 keys/leaf. For 1000 rows: log(350M) + 1000/500 ≈ 4 + 2 = 6 page reads. Without the leaf chain (as in B-Tree), each successive key might require re-traversing internal nodes — potentially 3–4× more I/Os. PostgreSQL also supports backward scan via btpo_prev — no separate DESC index needed.',
      tip: 'Index-Only Scan avoids the heap entirely for queries where all needed columns are in the index. Condition: all-visible bit set in the Visibility Map (no dead tuples on the leaf\'s corresponding heap page).',
    },
    {
      q: 'Why do internal B+ Tree nodes store "routing keys" that are copies of leaf keys?',
      a: 'Internal nodes store separator keys that partition the key space for child subtrees. The separator key between two children must be any value K such that: all keys in the left child ≤ K, and all keys in the right child > K. A common choice is to copy the first key of the right child up to the parent — this is called a "copy-up" operation (vs "push-up" in some B-Tree variants). In PostgreSQL, internal node keys may be actual copies of leaf keys (not minimal separators) — this simplifies implementation. The duplicate is acceptable because internal nodes don\'t hold data records, only routing keys. Implication: a key can appear in both an internal node and a leaf. This is the "B+ Tree" invariant: leaf keys are the definitive data; internal keys are navigation aids only. Delete may remove a leaf key while leaving the corresponding routing key in internal nodes — it still works as a valid separator.',
      tip: 'Some B+ Tree implementations use the "smallest key of right subtree" as the separator — this is what PostgreSQL does for B+ Tree page splits: the new page\'s first key is inserted into the parent.',
    },
    {
      q: 'What is a "covering index" and how does it eliminate heap fetches?',
      a: 'A covering index (PostgreSQL calls it an Index-Only Scan) includes all columns needed by the query — the heap page is never read. Example: SELECT order_id, created_at FROM orders WHERE order_id BETWEEN 1001 AND 2000. If an index on (order_id, created_at) exists: the leaf page contains both columns → no heap fetch needed. PostgreSQL still checks the Visibility Map: if the all-visible bit is set for the heap page, heap is skipped entirely. If not (dead tuples exist), heap is read for visibility check. Creating a covering index: <code>CREATE INDEX idx_orders_covering ON orders (order_id) INCLUDE (created_at, total)</code>. INCLUDE columns are stored in leaf nodes only (not routing nodes) — they don\'t affect the tree structure but make leaf reads self-sufficient. At Amazon scale: a covering index on (product_id, price) eliminates heap fetches for price-lookup queries — dramatically reduces I/O during Prime Day product page loads.',
      tip: 'The INCLUDE clause (PostgreSQL 11+) adds columns to leaf nodes without using them as sort keys — they don\'t affect search but can satisfy SELECT columns without heap reads.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
