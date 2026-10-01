// M20 · State / Defer / Selection Lab
// The node-selection graph syntax made visual. Pick the "modified" model, then
// apply a selector and watch exactly which nodes dbt would build. This is the
// mechanism behind Slim CI (state:modified+) and defer.
import { createModuleShell, createIQSection } from '../components/module-shell.js';

// ── Sample DAG ───────────────────────────────────────────────────────────────
// positions are top-left of a 130×44 box on an 820×300 canvas.
const NODES = {
  stg_orders:        { label: 'stg_orders',        layer: 0, x: 40,  y: 34,  kind: 'stg' },
  stg_customers:     { label: 'stg_customers',     layer: 0, x: 40,  y: 118, kind: 'stg' },
  stg_payments:      { label: 'stg_payments',      layer: 0, x: 40,  y: 202, kind: 'stg' },
  fct_orders:        { label: 'fct_orders',        layer: 1, x: 255, y: 76,  kind: 'fct' },
  fct_payments:      { label: 'fct_payments',      layer: 1, x: 255, y: 190, kind: 'fct' },
  fct_revenue:       { label: 'fct_revenue',       layer: 2, x: 470, y: 118, kind: 'fct' },
  dashboard_revenue: { label: 'dashboard_revenue', layer: 3, x: 655, y: 118, kind: 'dash' },
};
const EDGES = [
  ['stg_orders', 'fct_orders'], ['stg_customers', 'fct_orders'],
  ['stg_payments', 'fct_payments'],
  ['fct_orders', 'fct_revenue'], ['fct_payments', 'fct_revenue'],
  ['fct_revenue', 'dashboard_revenue'],
];
const KIND_COLOR = { stg: '#3B82F6', fct: '#FF694B', dash: '#8B5CF6' };

const parents = id => EDGES.filter(e => e[1] === id).map(e => e[0]);
const children = id => EDGES.filter(e => e[0] === id).map(e => e[1]);
function walk(id, dir, acc = new Set()) {
  (dir === 'up' ? parents(id) : children(id)).forEach(n => { if (!acc.has(n)) { acc.add(n); walk(n, dir, acc); } });
  return acc;
}
const ancestors = id => walk(id, 'up');
const descendants = id => walk(id, 'down');

const SELECTORS = [
  { id: 'modified',  label: 'state:modified',   desc: 'Only the changed node itself.' },
  { id: 'modified+', label: 'state:modified+',  desc: 'The change + everything downstream. The Slim CI default.' },
  { id: '+sel',      label: '+model',           desc: 'The model + all upstream parents (what it depends on).' },
  { id: 'sel+',      label: 'model+',           desc: 'The model + all downstream children (what depends on it).' },
  { id: '+sel+',     label: '+model+',          desc: 'Full upstream and downstream — the entire connected lineage.' },
  { id: '@sel',      label: '@model',           desc: 'The model, its descendants, AND all ancestors of those descendants (so the descendants can build).' },
  { id: 'exclude',   label: 'model+ --exclude dashboard_revenue', desc: 'Downstream, minus a node you deliberately skip.' },
];

function selectSet(sel, n) {
  const self = new Set([n]);
  const up = ancestors(n), down = descendants(n);
  switch (sel) {
    case 'modified': return self;
    case 'modified+': return new Set([n, ...down]);
    case '+sel': return new Set([...up, n]);
    case 'sel+': return new Set([n, ...down]);
    case '+sel+': return new Set([...up, n, ...down]);
    case '@sel': {
      const s = new Set([n, ...down]);
      down.forEach(d => ancestors(d).forEach(a => s.add(a)));
      return s;
    }
    case 'exclude': { const s = new Set([n, ...down]); s.delete('dashboard_revenue'); return s; }
    default: return self;
  }
}

const IQ = [
  {
    q: 'Explain how `dbt build --select state:modified+` makes CI cheap.',
    a: `<code>state:modified</code> diffs the current manifest (the PR branch) against a <strong>deferred manifest</strong> from production (passed via <code>--state</code>) to find which nodes actually changed. The <code>+</code> expands that to all downstream children.
    <br><br>So CI builds <em>only</em> what you touched and what depends on it — not the whole warehouse. Combined with <code>--defer</code>, unchanged upstream models resolve to the existing production tables instead of being rebuilt. On a 2,000-model project, a one-model PR might build 3 nodes instead of 2,000.`,
    tip: 'Say the two halves: "modified comes from a manifest diff; the + is downstream graph expansion." That shows you know it is graph selection, not a dbt guess.',
  },
  {
    q: 'What is the difference between `+model`, `model+`, and `@model`?',
    a: `<ul>
      <li><code>+model</code> — the model plus everything <strong>upstream</strong> (its parents, recursively). "Build what I depend on."</li>
      <li><code>model+</code> — the model plus everything <strong>downstream</strong> (its children). "Build what depends on me."</li>
      <li><code>@model</code> — the model, its descendants, AND the ancestors of those descendants. It is <code>model+</code> plus whatever else is needed so the downstream nodes can actually build from scratch.</li>
    </ul>
    Use <code>+model</code> to build a model locally with its upstreams; <code>model+</code> to see blast radius; <code>@model</code> when rebuilding a subtree in a fresh schema.`,
    tip: 'The "@ builds the downstream AND their other parents, so the subtree is self-contained" explanation is the one most candidates miss.',
  },
  {
    q: 'What does `--defer` do, and when would you use it?',
    a: `<code>--defer</code> tells dbt that any <code>ref()</code> to a model <em>not selected in this run</em> should resolve to a <strong>previously-built</strong> version (from the deferred manifest / environment) instead of failing or forcing a rebuild.
    <br><br>The classic use is Slim CI: you build only <code>state:modified+</code> in a temporary CI schema, and every unchanged upstream <code>ref()</code> defers to the production tables. You get a correct, fully-resolved run without rebuilding the entire project — fast and cheap. It is also handy for building a single downstream model locally without first building all its parents.`,
    tip: 'Pair it in your answer: "state:modified+ selects what to build; --defer resolves the unbuilt refs to prod." Together they ARE Slim CI.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M20 · Selection & Incrementals',
    title: 'State / Defer / Selection Lab',
    subtitle: 'Pick a changed model, apply a selector, and see exactly which nodes dbt would build. The mechanism behind Slim CI.',
    tabs: [
      { id: 'lab',    label: '🎯 Selection Lab' },
      { id: 'detail', label: '📋 Selector & state syntax' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function nodeSvg(id, sel) {
  const n = NODES[id];
  const on = sel.has(id);
  const c = KIND_COLOR[n.kind];
  return `
    <g class="dag-node" data-node="${id}" style="cursor:pointer">
      <rect x="${n.x}" y="${n.y}" width="130" height="44" rx="8"
            fill="${on ? c + '28' : 'var(--surface)'}" stroke="${on ? c : 'var(--border)'}"
            stroke-width="${on ? 2.5 : 1.3}" opacity="${on ? 1 : 0.5}"/>
      <text x="${n.x + 65}" y="${n.y + 26}" text-anchor="middle"
            font-family="JetBrains Mono, monospace" font-size="11"
            fill="${on ? c : 'var(--text-3)'}" font-weight="${on ? 700 : 400}">${n.label}</text>
    </g>`;
}
function edgeSvg([a, b], sel) {
  const A = NODES[a], B = NODES[b];
  const x1 = A.x + 130, y1 = A.y + 22, x2 = B.x, y2 = B.y + 22;
  const on = sel.has(a) && sel.has(b);
  const mx = (x1 + x2) / 2;
  return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
    fill="none" stroke="${on ? 'var(--accent)' : 'var(--border)'}" stroke-width="${on ? 2.2 : 1.2}"
    opacity="${on ? 0.9 : 0.4}" marker-end="url(#m20arrow)"/>`;
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  let modified = 'fct_orders';
  let sel = 'modified+';

  tab.innerHTML = `
    <p class="lab-intro">Click any node to mark it the <strong>modified</strong> model, then choose a selector.
    Highlighted nodes are what <code>dbt build</code> would run.</p>
    <div class="lab-picker" id="m20-sel">
      ${SELECTORS.map((s, i) => `<button class="lab-chip ${s.id === sel ? 'active' : ''}" data-sel="${s.id}">${s.label}</button>`).join('')}
    </div>
    <div class="dag-wrap">
      <svg id="m20-svg" viewBox="0 0 800 270" width="100%" style="max-width:800px">
        <defs><marker id="m20arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--text-3)"/></marker></defs>
      </svg>
    </div>
    <div class="dag-readout" id="m20-readout"></div>
  `;

  const svg = tab.querySelector('#m20-svg');
  const readout = tab.querySelector('#m20-readout');
  const defsHtml = svg.innerHTML;

  function render() {
    const set = selectSet(sel, modified);
    svg.innerHTML = defsHtml
      + EDGES.map(e => edgeSvg(e, set)).join('')
      + Object.keys(NODES).map(id => nodeSvg(id, set)).join('')
      // mark the modified node with a ring
      + `<circle cx="${NODES[modified].x + 65}" cy="${NODES[modified].y - 6}" r="4" fill="var(--warn)"/>
         <text x="${NODES[modified].x + 65}" y="${NODES[modified].y - 12}" text-anchor="middle" font-size="9" fill="var(--warn)" font-family="Inter">modified</text>`;
    const selDef = SELECTORS.find(s => s.id === sel);
    const ran = [...set];
    readout.innerHTML = `
      <div class="dag-ro-head"><span class="dag-ro-sel">${selDef.label.replace(/model|sel/g, modified)}</span>
        <span class="dag-ro-count">${ran.length} / ${Object.keys(NODES).length} nodes build</span></div>
      <div class="dag-ro-desc">${selDef.desc}</div>
      <div class="dag-ro-nodes">${ran.map(id => `<span class="mx-chip mx-model">${NODES[id].label}</span>`).join('') || '<em>none</em>'}</div>`;
  }

  tab.querySelector('#m20-sel').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m20-sel .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    sel = chip.dataset.sel; render();
  });
  svg.addEventListener('click', e => {
    const g = e.target.closest('[data-node]');
    if (g) { modified = g.dataset.node; render(); }
  });

  render();
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Graph operators</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">➕ Graph selectors</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Model + upstream</div><div class="cheat-v">+my_model</div></div>
          <div class="cheat-row"><div class="cheat-k">Model + downstream</div><div class="cheat-v">my_model+</div></div>
          <div class="cheat-row"><div class="cheat-k">Full lineage</div><div class="cheat-v">+my_model+</div></div>
          <div class="cheat-row"><div class="cheat-k">N layers up/down</div><div class="cheat-v">2+my_model+3</div></div>
          <div class="cheat-row"><div class="cheat-k">Model + descendants + their ancestors</div><div class="cheat-v">@my_model</div></div>
          <div class="cheat-row"><div class="cheat-k">Exclude a node</div><div class="cheat-v">my_model+ --exclude dashboard_revenue</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🔁 State & defer</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Changed nodes</div><div class="cheat-v">--select state:modified</div></div>
          <div class="cheat-row"><div class="cheat-k">Changed + downstream (Slim CI)</div><div class="cheat-v">state:modified+</div></div>
          <div class="cheat-row"><div class="cheat-k">Compare against prior manifest</div><div class="cheat-v">--state path/to/prod-artifacts</div></div>
          <div class="cheat-row"><div class="cheat-k">Resolve unbuilt refs to prod</div><div class="cheat-v">--defer --state ...</div></div>
          <div class="cheat-row"><div class="cheat-k">New/modified tests only</div><div class="cheat-v">state:new, result:fail+</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🏷️ Other selection methods</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">By tag</div><div class="cheat-v">tag:nightly</div></div>
          <div class="cheat-row"><div class="cheat-k">By path</div><div class="cheat-v">path:models/marts</div></div>
          <div class="cheat-row"><div class="cheat-k">By config</div><div class="cheat-v">config.materialized:incremental</div></div>
          <div class="cheat-row"><div class="cheat-k">By resource type</div><div class="cheat-v">resource_type:source</div></div>
          <div class="cheat-row"><div class="cheat-k">Intersection (AND)</div><div class="cheat-v">tag:nightly,config.materialized:table</div></div>
        </div></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Why this is the most important CI optimization in dbt</h3>
      <p>Without state selection, every PR rebuilds the whole project — slow and expensive as the project grows. With <code>state:modified+ --defer</code>, CI builds only what changed and its children, resolving everything else to production. That turns a 40-minute full build into a 2-minute targeted one.</p>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">state:modified+ decides WHAT to build; --defer decides how unbuilt refs resolve. Together they are Slim CI.</p>
    </div>
  `;
}
