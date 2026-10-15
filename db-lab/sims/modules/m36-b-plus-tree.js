/* ============================================================
   m36-b-plus-tree.js — ⚡ Interactive Lab: B+Tree index.
   Renderer for sims/kernels/bplustree.mjs. Insert / delete / search /
   range-scan a real B+Tree; the drawn tree, node occupancy, height and
   highlighted search path are the kernel's actual state.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createBPlusTree } from '../kernels/bplustree.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Storage Engine',
    title: 'B+Tree Index',
    subtitle: "Insert, delete, search and range-scan a live B+Tree. Splits, merges, borrows and height changes are the kernel's real state — every node stays within its occupancy bounds and every leaf at equal depth.",
    tabs: [{ id: 'lab', label: 'Lab' }, { id: 'how', label: 'How it works' }, { id: 'iq', label: 'Interview' }],
  });
  const teardown = initTabs(shell.tabs, shell.body, {
    lab: (panel) => mountLab(panel),
    how: (panel) => { panel.innerHTML = howHTML(); },
    iq: (panel) => { const iq = createIQSection(); panel.appendChild(iq.el); initIQ(iq, IQ); },
  });
  return { destroy() { if (typeof teardown === 'function') teardown(); } };
}

function mountLab(panel) {
  let order = 3;
  let kernel = createBPlusTree({ order: order });
  // seed a small tree so the first view is interesting
  [10, 20, 5, 15, 25, 30, 1, 8].forEach((key) => kernel.dispatch({ type: 'insert', key: key }));

  const root = document.createElement('div');
  root.className = 'bt-lab';
  panel.appendChild(root);

  function rebuild(seed) {
    kernel = createBPlusTree({ order: order });
    if (seed) seed.forEach((key) => kernel.dispatch({ type: 'insert', key: key }));
    render();
  }
  function dispatch(op) { try { kernel.dispatch(op); } catch (e) {} render(); }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    const kv = () => Number(root.querySelector('#bt-key').value);
    if (a === 'insert') return dispatch({ type: 'insert', key: kv() });
    if (a === 'delete') return dispatch({ type: 'delete', key: kv() });
    if (a === 'search') return dispatch({ type: 'search', key: kv() });
    if (a === 'range') return dispatch({ type: 'range', lo: Number(root.querySelector('#bt-lo').value), hi: Number(root.querySelector('#bt-hi').value) });
    if (a === 'insert-rand') {
      const key = 1 + Math.floor(deterministicNext(kernel) % 99);
      return dispatch({ type: 'insert', key: key });
    }
    if (a === 'build') return rebuild(range(1, 15));
    if (a === 'bulk') return rebuild(shuffleSeed(range(1, 20)));
    if (a === 'clear') return rebuild(null);
  });
  root.addEventListener('change', (ev) => {
    if (ev.target.id === 'bt-order') { order = Number(ev.target.value); rebuild([10, 20, 5, 15, 25, 30, 1, 8]); }
  });

  function render() { root.innerHTML = labHTML(kernel, order); }
  render();
}

/* deterministic "random" key from current tree size (no Math.random → replayable feel) */
function deterministicNext(k) { return (k.state.inserted.length * 37 + 13) * 2654435761 % 100; }
function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }
function shuffleSeed(arr) { // fixed deterministic shuffle
  let seed = 9973; const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const j = seed % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

function labHTML(k, order) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const orders = [3, 4, 5].map((o) => `<option ${o === order ? 'selected' : ''}>${o}</option>`).join('');

  // compute highlight sets from the last op
  const hiNodes = new Set(), hiKeys = new Set();
  let rangeLeaves = null;
  if (s.lastOp) {
    if (s.lastOp.kind === 'search') { markSearchPath(s.root, s.lastOp.key, hiNodes); if (s.lastOp.found) hiKeys.add(s.lastOp.key); }
    else if (s.lastOp.kind === 'range') { rangeLeaves = { lo: s.lastOp.lo, hi: s.lastOp.hi }; s.lastOp.keys.forEach((x) => hiKeys.add(x)); }
    else if ((s.lastOp.kind === 'insert' || s.lastOp.kind === 'delete') && !s.lastOp.dup && !s.lastOp.absent) hiKeys.add(s.lastOp.key);
  }

  const tree = s.root ? renderNode(s.root, order, hiNodes, hiKeys, rangeLeaves) : '<div class="bt-empty">Empty tree — insert a key.</div>';

  return `
  <div class="bt-controls">
    <div class="bt-row">
      <label class="bp-lbl">order</label><select id="bt-order" class="bp-in">${orders}</select>
      <span class="bp-sep"></span>
      <label class="bp-lbl">key</label><input id="bt-key" class="bp-in bp-num" type="number" value="12" />
      <button class="bp-btn bp-primary" data-act="insert">Insert</button>
      <button class="bp-btn" data-act="delete">Delete</button>
      <button class="bp-btn" data-act="search">Search</button>
      <button class="bp-btn" data-act="insert-rand">+ Random</button>
    </div>
    <div class="bt-row">
      <label class="bp-lbl">range</label>
      <input id="bt-lo" class="bp-in bp-num" type="number" value="8" /><span class="bp-lbl">to</span>
      <input id="bt-hi" class="bp-in bp-num" type="number" value="20" />
      <button class="bp-btn" data-act="range">Range scan</button>
      <span class="bp-sep"></span>
      <button class="bp-chip" data-act="build">Build 1–15</button>
      <button class="bp-chip" data-act="bulk">Bulk + shuffle</button>
      <button class="bp-chip" data-act="clear">Clear</button>
    </div>
  </div>

  <div class="bt-canvas"><div class="bt-tree">${tree}</div></div>

  <div class="bp-metrics">
    ${metric('Height', m.height)}
    ${metric('Nodes', m.nodes)}
    ${metric('Leaves', m.leaves)}
    ${metric('Keys', m.keys)}
    ${metric('Fill', (m.fill * 100).toFixed(0) + '%')}
  </div>

  <div class="wal-invariants">
    ${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}
  </div>

  <div class="bt-explain"><span>${opIcon(s.lastOp)}</span> ${opText(s.lastOp)}</div>`;
}

function renderNode(node, order, hiNodes, hiKeys, rangeLeaves) {
  const hot = hiNodes.has(node);
  const inRange = (k) => rangeLeaves && k >= rangeLeaves.lo && k <= rangeLeaves.hi;
  const keys = node.keys.map((k) =>
    `<span class="bt-key ${hiKeys.has(k) ? 'hi' : ''} ${node.leaf && inRange(k) ? 'inrange' : ''}">${esc(k)}</span>`).join('');
  const box = `<div class="bt-node ${node.leaf ? 'leaf' : 'internal'} ${hot ? 'onpath' : ''}">${keys || '∅'}</div>`;
  if (node.leaf) return `<div class="bt-wrap">${box}</div>`;
  const kids = node.children.map((c) => renderNode(c, order, hiNodes, hiKeys, rangeLeaves)).join('');
  return `<div class="bt-wrap">${box}<div class="bt-children">${kids}</div></div>`;
}

function markSearchPath(node, key, set) {
  if (!node) return;
  set.add(node);
  if (node.leaf) return;
  let i = 0; while (i < node.keys.length && key >= node.keys[i]) i++;
  markSearchPath(node.children[i], key, set);
}

function opIcon(op) { if (!op) return '▸'; return { insert: '➕', delete: '➖', search: '🔍', range: '↔' }[op.kind] || '▸'; }
function opText(op) {
  if (!op) return 'Insert, delete, search or range-scan to see the tree respond.';
  if (op.kind === 'insert') return op.dup ? `Key ${op.key} already present — ignored (keys are unique).` : `Inserted ${op.key}. A leaf split propagates upward only if a node overflowed.`;
  if (op.kind === 'delete') return op.absent ? `Key ${op.key} not in the tree — nothing to delete.` : `Deleted ${op.key}. An underflowing node borrows from a sibling, or merges and may shrink the tree's height.`;
  if (op.kind === 'search') return op.found ? `Found ${op.key} after ${op.comparisons} node${op.comparisons === 1 ? '' : 's'} on the root-to-leaf path (that's the height — the I/O cost of a lookup).` : `${op.key} not found — the search still descended ${op.comparisons} node(s) to the leaf where it would live.`;
  if (op.kind === 'range') return `Range [${op.lo}, ${op.hi}] → ${op.keys.length} key(s): descend once to the first leaf, then follow leaves in order. That sequential leaf scan is why B+Trees beat hash indexes for ranges.`;
  return '';
}
function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }

function howHTML() {
  const cmu = src('cmu-15445'), sq = src('sqlite-fileformat');
  const cite = (x, label) => x ? ` <a class="wal-cite" href="${x.url}" target="_blank" rel="noopener">${label}↗</a>` : '';
  return `<div class="wal-how">
    <h3>Why B+Trees run the world's indexes</h3>
    <p>A B+Tree keeps data <em>sorted</em> and <em>balanced</em>: every leaf sits at the same depth, so a lookup costs a fixed, shallow number of page reads even as the table grows to billions of rows. All real values live in the leaves; internal nodes hold only separator keys to route the search.${cite(sq, 'SQLite')}</p>
    <h3>Insert → split</h3>
    <p>Insert walks to the correct leaf and adds the key in order. If the leaf overflows (more than <code>order</code> keys), it splits in two and <em>copies up</em> the new leaf's first key as a separator. A cascade of splits can reach the root and add one level — the only way a B+Tree grows taller.</p>
    <h3>Delete → borrow / merge</h3>
    <p>Delete removes the key; if a node drops below its minimum occupancy it <em>borrows</em> a key from a sibling, or <em>merges</em> with one (pulling a separator down). Merges can cascade and shrink the height. Watch the occupancy invariant stay green throughout.${cite(cmu, 'CMU 15-445')}</p>
    <h3>Range scans</h3>
    <p>Because leaves are sorted and linked, a range query descends once to the low end and then walks leaves sequentially — the pattern a hash index cannot do. Try a range scan and watch the matched leaves light up.</p>
  </div>`;
}

const IQ = [
  { q: 'Why do databases use B+Trees instead of binary search trees for on-disk indexes?',
    a: 'Disk/SSD I/O is done in pages, and latency dominates. A B+Tree is wide (hundreds of keys per node) and shallow, so a lookup touches only a handful of pages; a balanced BST is O(log₂ n) pointer-chases, far deeper and not page-aligned. B+Trees also keep leaves linked for efficient range scans.',
    tip: 'Frame it as minimizing page reads: high fan-out → low height → few I/Os.' },
  { q: 'Why keep all values in the leaves (B+Tree) rather than in internal nodes (B-Tree)?',
    a: 'Internal nodes then hold only keys, so fan-out is higher and the tree is shallower; and the linked leaves give ordered, sequential range scans. The small cost is that a point lookup always descends to a leaf, even for a key stored higher in a B-Tree.',
    tip: 'Two wins: higher fan-out and sequential range scans via the leaf chain.' },
  { q: 'What keeps a B+Tree balanced as it grows and shrinks?',
    a: 'Splits on overflow and borrow/merge on underflow. Both operate bottom-up and preserve the invariant that every leaf is at the same depth; the tree only changes height at the root (split of the root grows it; merge that empties the root shrinks it).',
    tip: 'Emphasize that height only changes at the root — that is what keeps it balanced.' },
  { q: 'How does page/node occupancy affect index performance?',
    a: 'Higher occupancy means higher fan-out, a shorter tree and fewer I/Os, but costly splits under heavy inserts; lower occupancy wastes space and deepens the tree. Engines target ~50–70% fill and sometimes bulk-load or rebuild to restore it (vs. index bloat).',
    tip: 'Mention fill-factor and bulk loading — and the tie-in to index bloat/rebuilds.' },
];
