// ── Consistent-hash ring (E16) ──────────────────────────────────────────────
// Keys and nodes are placed on a hash ring. Each key is owned by the next node
// clockwise. Add or remove a node and the widget reports how FEW keys actually
// move — the whole point of consistent hashing vs. plain modulo.
//
// mount(container) → cleanup()

const SVGNS = 'http://www.w3.org/2000/svg';
function fnv(str) { // tiny stable hash → [0,1)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export function mount(container) {
  const KEYS = Array.from({ length: 12 }, (_, i) => 'key' + (i + 1));
  let nodes = ['Node-A', 'Node-B', 'Node-C'];
  const VNODES = 1; // keep it visually simple
  let seq = 4;      // next node letter index (D…)

  const root = document.createElement('div');
  root.className = 'wg wg-ring';
  root.innerHTML = `
    <div class="wg-ring-stage">
      <svg id="ring-svg" viewBox="0 0 320 320" width="100%" style="max-width:360px"></svg>
    </div>
    <div class="wg-ring-side">
      <div class="wg-note" id="ring-note">Each key is served by the first node clockwise. Add or remove a node and watch how few keys move.</div>
      <div class="wg-ring-legend" id="ring-legend"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ring-add">＋ Add node</button>
        <button class="sd-btn" id="ring-rm">－ Remove node</button>
      </div>
    </div>`;
  container.appendChild(root);

  const svg = root.querySelector('#ring-svg');
  const noteEl = root.querySelector('#ring-note');
  const legend = root.querySelector('#ring-legend');

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899'];
  const cx = 160, cy = 160, R = 120;

  function nodePoints() {
    // returns [{name, pos, color}] sorted by pos
    const pts = [];
    nodes.forEach((n, ni) => {
      for (let v = 0; v < VNODES; v++) pts.push({ name: n, pos: fnv(n + '#' + v), color: COLORS[ni % COLORS.length] });
    });
    return pts.sort((a, b) => a.pos - b.pos);
  }
  function ownerOf(pos, pts) {
    for (const p of pts) if (p.pos >= pos) return p;
    return pts[0]; // wrap
  }
  function assignment() {
    const pts = nodePoints();
    const map = {};
    KEYS.forEach(k => { map[k] = pts.length ? ownerOf(fnv(k), pts).name : null; });
    return map;
  }

  function polar(pos) { const a = pos * 2 * Math.PI - Math.PI / 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }
  function mk(tag, attrs) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

  let prev = assignment();

  function draw(moved) {
    const pts = nodePoints();
    svg.innerHTML = '';
    svg.appendChild(mk('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--border)', 'stroke-width': 2 }));
    // keys
    const map = assignment();
    KEYS.forEach(k => {
      const [x, y] = polar(fnv(k));
      const col = pts.length ? (pts.find(p => p.name === map[k]) || {}).color : 'var(--text3)';
      const g = mk('g', {});
      const c = mk('circle', { cx: x, cy: y, r: moved && moved.has(k) ? 7 : 5, fill: col || 'var(--text3)', stroke: moved && moved.has(k) ? 'var(--text)' : 'none', 'stroke-width': 2 });
      if (moved && moved.has(k)) c.setAttribute('class', 'wg-ring-moved');
      g.appendChild(c);
      svg.appendChild(g);
    });
    // nodes
    pts.forEach(p => {
      const [x, y] = polar(p.pos);
      svg.appendChild(mk('rect', { x: x - 9, y: y - 9, width: 18, height: 18, rx: 4, fill: p.color, stroke: 'var(--bg)', 'stroke-width': 2 }));
      const t = mk('text', { x, y: y - 14, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text2)', 'font-weight': 700 });
      t.textContent = p.name.replace('Node-', '');
      svg.appendChild(t);
    });
    // legend
    const counts = {};
    Object.values(map).forEach(n => { if (n) counts[n] = (counts[n] || 0) + 1; });
    legend.innerHTML = nodes.map((n, i) =>
      `<span class="wg-leg"><span class="wg-leg-dot" style="background:${COLORS[i % COLORS.length]}"></span>${n} · ${counts[n] || 0} keys</span>`).join('');
  }

  function diff(after) {
    const moved = new Set();
    KEYS.forEach(k => { if (prev[k] !== after[k]) moved.add(k); });
    return moved;
  }

  function update(action) {
    const after = assignment();
    const moved = diff(after);
    const pct = Math.round(moved.size / KEYS.length * 100);
    noteEl.innerHTML = `${action} → <b>${moved.size} of ${KEYS.length}</b> keys moved (${pct}%). ` +
      (moved.size === 0 ? 'No keys changed owner.' : 'Plain <code>hash % N</code> would have remapped <b>most</b> keys.');
    prev = after;
    draw(moved);
  }

  root.querySelector('#ring-add').addEventListener('click', () => {
    if (nodes.length >= 6) { noteEl.textContent = 'Max 6 nodes for this demo.'; return; }
    const name = 'Node-' + String.fromCharCode(64 + seq); seq++;
    nodes.push(name);
    update(`Added ${name}`);
  });
  root.querySelector('#ring-rm').addEventListener('click', () => {
    if (nodes.length <= 1) { noteEl.textContent = 'Need at least one node.'; return; }
    const name = nodes.pop();
    update(`Removed ${name}`);
  });

  draw(null);
  return () => { root.remove(); };
}
