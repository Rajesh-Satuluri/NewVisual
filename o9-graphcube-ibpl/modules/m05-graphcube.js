import { createModuleShell, createIQSection } from '../components/module-shell.js';

// Sparse population rules for the CAT tenant demo.
// Items: 320D Excavator Pump, 330 Final Drive, 340 Turbo, D6 Track Link
const ITEMS = ['RM_320D-Pump','FG_330-Drive','INT_340-Turbo','D6-TrackLink'];
const LCS   = ['DC-Dallas','DC-LosAngeles','DC-Toronto','DC-Sydney'];
const WEEKS = ['W01','W02','W03','W04','W05','W06'];
const VERS  = ['CurrentWorkingView','Scenario_Aggressive','Snapshot_W04'];

// Which (item,lc,week) are STORED (sparse) — everything else is EMPTY/never stored.
function isStored(vi, item, lc, wi) {
  // New part INT_340-Turbo only launched — W01..W03 only
  if (item === 'INT_340-Turbo' && wi > 2) return false;
  // Sydney DC just opened — only W01
  if (lc === 'DC-Sydney' && wi > 0) return false;
  // Snapshot is a frozen archive at W04+
  if (vi === 2 && wi < 3) return false;
  return true;
}

function measures(item, lc, wi) {
  const base = (item.length * 7 + lc.length * 3 + wi * 11) % 90 + 10;
  return {
    'Forecast Quantity': base * 12,
    'Actual Sales': Math.round(base * 12 * (0.85 + (wi % 3) * 0.05)),
    'Safety Stock': base * 2,
    'On-Hand Inventory': base * 4 + wi * 5,
    'Forecast Revenue ($)': base * 12 * 48,
  };
}

export const IQ = [
  { q: 'What does it mean that the GraphCube is "sparse", and why does it matter at scale?',
    a: 'Sparse means only populated intersections are physically stored — empty cells are never allocated. A dense OLAP cube pre-allocates every combination of every dimension member, so a model with Item × Location × Customer × Week × Version explodes into billions of cells, most of them empty. The GraphCube stores only the cells that actually have a value (e.g. a new part that only has 3 weeks of history stores 3 cells, not the full timeline). This is what makes planning at retail-SKU granularity feasible in memory.',
    tip: 'Tie it to a real number: "a new part with 3 weeks of data stores 3 cells, not 52 × every location."' },
  { q: 'How is a single fact physically addressed and stored in the GraphCube?',
    a: 'Each dimension member is dictionary-encoded to a compact id (e.g. RM_320D-Pump→i7, DC-Dallas→l3, W32→t32). The composite key (i7, l3, t32, version) addresses exactly one cell. Stored values become columnar arrays — one array per measure (Forecast[], Sales[], Inventory[]) holding only the cells that exist. Hot data stays in memory; cold data persists as versioned snapshots. The graph (nodes + edges) is stored alongside to drive roll-up.',
    tip: 'The phrase to use: "dictionary-encoded composite key → one cell; measures stored as per-measure columnar arrays."' },
  { q: 'When you query a measure at an aggregate level, how does the engine compute it?',
    a: 'The query names a level, not raw cells (e.g. Forecast at Product-Family × Month). The graph expands the aggregate member to its leaves (family ⊃ its items, month ⊃ its weeks), the engine scans only the relevant measure array, selects the matching leaf keys, and sums (or applies the measure\'s aggregation policy) along the edges — e.g. 500 + 320 + 260 + 200 = 1,280. Aggregates are computed on read, not stored, so they are always consistent with the leaves.',
    tip: 'Say "aggregates are computed on read along graph edges" — it explains why there\'s never a stale roll-up.' },
  { q: 'How does the GraphCube differ from a traditional OLAP cube? Give at least three dimensions.',
    a: 'Storage: GraphCube is sparse (only populated cells); OLAP is dense (all intersections pre-allocated). Relationships: GraphCube has native typed edges between members (BOM, pegging, sourcing); OLAP has none. Write-back: GraphCube supports native aggregate-level edits via scope: / DistributeToLeaves with spreading rules; OLAP write-back is limited or absent. Versioning: GraphCube has first-class versions (CWV / scenario / snapshot) with isolation; OLAP typically has none.',
    tip: 'Memorize the 4-row table: Storage, Edges, Write-back, Versioning. Interviewers love the head-to-head.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M05 · GraphCube',
    title: 'GraphCube — How Data Is Stored',
    subtitle: 'Not an OLAP cube. Dimensions are nodes in a graph, measures live at intersections, and values aggregate along edges. Explore it cell by cell.',
    tabs: [
      { id: 'explorer', label: '🧊 Intersection Explorer' },
      { id: 'flow',     label: '🔄 Architecture & Flow' },
      { id: 'storage',  label: '💾 Insert · Store · Retrieve' },
      { id: 'olap',     label: '⚔️ vs Traditional OLAP' },
      { id: 'iq',       label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  // ── Tab 1 — Intersection Explorer ──────────────────────────────────────────
  const ex = container.querySelector('#tab-explorer');
  ex.innerHTML = `
    <div class="section-pad">
      <p class="lead">Pick a coordinate on four dimensions. The cube tells you whether that intersection is <b>STORED</b> or <b>EMPTY</b> (never allocated), and shows the measures that live there. The CAT tenant is deliberately sparse — notice which cells don't exist.</p>
      <div class="pill-rows"></div>
      <div class="coord-status" style="margin:16px 0"></div>
      <div class="measure-cards card-grid"></div>
      <div style="margin-top:20px">
        <div class="code-cap">Item × Week population (CurrentWorkingView · DC-Dallas) — click a cell</div>
        <div class="heatmap"></div>
      </div>
    </div>`;

  const state = { v: 0, item: 0, lc: 0, w: 0 };
  const dims = [
    { key:'v',    label:'Version',         opts: VERS },
    { key:'item', label:'Item',            opts: ITEMS },
    { key:'lc',   label:'Logistics Center', opts: LCS },
    { key:'w',    label:'Week',            opts: WEEKS },
  ];

  const pillRows = ex.querySelector('.pill-rows');
  function renderPills() {
    pillRows.innerHTML = dims.map(d => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
        <span style="width:130px;font-size:12px;font-weight:700;color:var(--text2)">${d.label}</span>
        ${d.opts.map((o,i) => `<button class="pill ${state[d.key]===i?'on':''}" data-dim="${d.key}" data-i="${i}">${o}</button>`).join('')}
      </div>`).join('');
  }

  function renderStatus() {
    const stored = isStored(state.v, ITEMS[state.item], LCS[state.lc], state.w);
    const status = ex.querySelector('.coord-status');
    status.innerHTML = `
      <div class="card" style="border-left:4px solid ${stored?'var(--green)':'var(--red)'}">
        <h4>${stored ? '🟢 STORED' : '⚪ EMPTY — never allocated'}</h4>
        <p style="font-family:monospace;color:var(--text2)">
          key = { ${VERS[state.v]}, ${ITEMS[state.item]}, ${LCS[state.lc]}, ${WEEKS[state.w]} }
        </p>
        ${stored ? '' : '<p style="margin-top:6px">This intersection has no value, so the GraphCube stores nothing here. A dense OLAP cube would have pre-allocated it anyway.</p>'}
      </div>`;
    const mc = ex.querySelector('.measure-cards');
    if (!stored) { mc.innerHTML = ''; return; }
    const m = measures(ITEMS[state.item], LCS[state.lc], state.w);
    mc.innerHTML = Object.entries(m).map(([k,val]) => `
      <div class="card"><h4 style="color:var(--accent)">${k}</h4><p style="font-size:20px;font-weight:800;color:var(--text)">${val.toLocaleString()}</p></div>`).join('');
  }

  function renderHeatmap() {
    const hm = ex.querySelector('.heatmap');
    hm.innerHTML = `<div style="display:inline-grid;grid-template-columns:140px repeat(${WEEKS.length},1fr);gap:4px;font-size:11px">
      <div></div>${WEEKS.map(w=>`<div style="text-align:center;font-weight:700;color:var(--text2)">${w}</div>`).join('')}
      ${ITEMS.map((it,ii)=>`
        <div style="font-weight:700;color:var(--text2);display:flex;align-items:center">${it}</div>
        ${WEEKS.map((w,wi)=>{
          const s = isStored(0, it, 'DC-Dallas', wi);
          const sel = (state.item===ii && state.w===wi);
          return `<button class="hm-cell" data-ii="${ii}" data-wi="${wi}" title="${it} · ${w}"
            style="height:34px;border-radius:6px;border:1px solid ${sel?'var(--accent)':'var(--border)'};cursor:pointer;
            background:${s?'var(--accent-lo)':'transparent'};color:${s?'var(--accent)':'var(--text3)'};font-weight:700">
            ${s?'●':'○'}</button>`;
        }).join('')}
      `).join('')}
    </div>
    <p style="font-size:11.5px;color:var(--text3);margin-top:10px">● stored · ○ never allocated. INT_340-Turbo launched at W01 (only W01–W03 exist); other rows run the full horizon.</p>`;
  }

  function renderAll() { renderPills(); renderStatus(); renderHeatmap(); }
  renderAll();

  const onEx = (e) => {
    const pill = e.target.closest('.pill[data-dim]');
    if (pill) { state[pill.dataset.dim] = +pill.dataset.i; renderAll(); return; }
    const cell = e.target.closest('.hm-cell');
    if (cell) { state.item = +cell.dataset.ii; state.w = +cell.dataset.wi; state.lc = 0; state.v = 0; renderAll(); }
  };
  ex.addEventListener('click', onEx);

  // ── Tab 2 & 3 — embedded explainers (lazy iframes) ─────────────────────────
  container.querySelector('#tab-flow').innerHTML = `
    <div class="section-pad">
      <p class="lead">The 4-layer architecture and the two master flows: <b>data load</b> (bottom-up) and <b>query · plan · write-back</b> (top-down). Animated — press Play inside the frame. Dimensions form a graph; values travel <i>along edges</i> to roll up.</p>
      <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0b1120">
        <iframe data-src="assets/o9-gcs-flow.html" title="o9 GraphCube architecture & flow" style="width:100%;height:640px;border:0;display:block"></iframe>
      </div>
      <p style="font-size:11.5px;color:var(--text3);margin-top:8px">Conceptual explainer — not o9's proprietary internal storage format. Loads GSAP from CDN; shows a static diagram offline.</p>
    </div>`;

  container.querySelector('#tab-storage').innerHTML = `
    <div class="section-pad">
      <p class="lead">The honest mental model of storage: a <b>sparse, columnar, key-addressed</b> store with a <b>graph on top</b> driving aggregation. Walk the three acts — Insert (dictionary-encode a fact into one cell), Store (columnar arrays, hot/cold), Retrieve (graph expands the query, engine scans and sums along edges to 1,280).</p>
      <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0b1120">
        <iframe data-src="assets/o9-gcs-storage.html" title="o9 GraphCube insert / store / retrieve" style="width:100%;height:640px;border:0;display:block"></iframe>
      </div>
      <p style="font-size:11.5px;color:var(--text3);margin-top:8px">Conceptual model — not o9's proprietary internal storage format.</p>
    </div>`;

  // Lazy-load iframes only when their tab is first shown (keeps initial load light).
  const loadIframe = (tabId) => {
    const f = container.querySelector(`#tab-${tabId} iframe[data-src]`);
    if (f) { f.src = f.dataset.src; f.removeAttribute('data-src'); }
  };
  const onTab = (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn && (btn.dataset.tab === 'flow' || btn.dataset.tab === 'storage')) loadIframe(btn.dataset.tab);
  };
  container.addEventListener('click', onTab);

  // ── Tab 4 — vs OLAP ────────────────────────────────────────────────────────
  container.querySelector('#tab-olap').innerHTML = `
    <div class="section-pad">
      <p class="lead">The head-to-head interviewers ask for. The GraphCube is a different data structure, not a faster OLAP cube.</p>
      <table class="o9-table">
        <thead><tr><th>Dimension</th><th>o9 GraphCube</th><th>Traditional OLAP</th></tr></thead>
        <tbody>
          <tr><td><b>Storage</b></td><td>Sparse — only populated cells stored</td><td>Dense — all intersections pre-allocated</td></tr>
          <tr><td><b>Empty cells</b></td><td>Never stored</td><td>Pre-allocated (consume memory)</td></tr>
          <tr><td><b>Relationships</b></td><td>Native typed graph edges (BOM, pegging, sourcing)</td><td>Not supported</td></tr>
          <tr><td><b>Aggregation</b></td><td>Computed on read, along graph edges</td><td>Pre-aggregated or MDX roll-up</td></tr>
          <tr><td><b>Write-back</b></td><td>Native — <code>scope:</code> / <code>DistributeToLeaves</code> + spreading</td><td>Limited or none</td></tr>
          <tr><td><b>Versioning</b></td><td>First-class — CWV / scenario / snapshot, isolated</td><td>Typically none</td></tr>
          <tr><td><b>Query language</b></td><td>IBPL (dimensional, graph-aware)</td><td>MDX / SQL</td></tr>
          <tr><td><b>Edit granularity</b></td><td>Any level; spreads to leaves by rule</td><td>Leaf-level or read-only</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>One-liner:</b> "OLAP stores every cell and roll-ups are baked in; the GraphCube stores only real cells and computes roll-ups on read by walking the graph — and it lets you write back at any level."</div>
    </div>`;

  return () => { ex.removeEventListener('click', onEx); container.removeEventListener('click', onTab); };
}
