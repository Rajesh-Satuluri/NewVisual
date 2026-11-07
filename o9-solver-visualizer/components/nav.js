// nav.js — the MODULES registry (single source of truth for the curriculum)
// plus the sidebar renderer. Same architecture as the Kafka tool: a flat
// MODULES list grouped by `group`, rendered into #nav-list, with Playground /
// Reference / Practice / Review sections below.
export const MODULES = [
  // ── Foundations ────────────────────────────────────────────────────────────
  { id:'sc-basics',          label:'Supply Chain Basics',        icon:'🔗', group:'Foundations',        desc:'Nodes, flows, echelons — the vocabulary the solver plans over' },
  { id:'planning-landscape', label:'MRP · DRP · MPS · S&OP',      icon:'🗺️', group:'Foundations',        desc:'Where the Supply Chain Solver sits in the planning stack' },
  // ── Meet the Solver ────────────────────────────────────────────────────────
  { id:'what-is-solver',     label:'What is the o9 Solver',      icon:'🧠', group:'Meet the Solver',    desc:'A heuristic plugin in the GraphCube server — not an LP/MIP' },
  { id:'why-solver',         label:'Why a Solver',               icon:'❓', group:'Meet the Solver',    desc:'Why manual multi-echelon balancing is infeasible' },
  { id:'obo-heuristic',      label:'Order-by-Order Heuristic',   icon:'🔢', group:'Meet the Solver',    desc:'Plan one demand at a time, in priority order, backward' },
  { id:'demand-sorting',     label:'Demand Sorting',             icon:'↕️', group:'Meet the Solver',    desc:'Priority → Fair-Share → Due Date → Qty → key' },
  { id:'three-phases',       label:'JIT · Build-Ahead · Late',   icon:'⏱️', group:'Meet the Solver',    desc:'The three timing phases the solver tries, in order' },
  { id:'objectives',         label:'Objective Rank List',        icon:'🎯', group:'Meet the Solver',    desc:'The ordered list of soft constraints — the objective itself' },
  // ── Network & Data Model ───────────────────────────────────────────────────
  { id:'nodes',              label:'Nodes & Node Types',         icon:'⬢', group:'Network & Data Model', desc:'Material, Activity, Demand, Capacity, Storage nodes' },
  { id:'network-types',      label:'Mfg · Distribution · Proc',  icon:'🕸️', group:'Network & Data Model', desc:'BOM+Routing · BOD+Mode · Supplier+Mode' },
  { id:'multi-echelon',      label:'Multi-Echelon Flow',         icon:'🏭', group:'Network & Data Model', desc:'Demand propagation up a multi-tier network' },
  // ── Solver Inputs ──────────────────────────────────────────────────────────
  { id:'inventory-inputs',   label:'Inventory (BOH / ER)',       icon:'📦', group:'Solver Inputs',      desc:'On-hand buckets and expected receipts' },
  { id:'demand-inputs',      label:'Demand with Attributes',     icon:'📨', group:'Solver Inputs',      desc:'Priority, policy, proportional, BAL/BLL' },
  { id:'supply-order-inputs',label:'In-Flight Supply',           icon:'🚚', group:'Solver Inputs',      desc:'POs, STOs and ASNs as scheduled receipts' },
  { id:'capacity-inputs',    label:'Capacity',                   icon:'⚙️', group:'Solver Inputs',      desc:'Capacity bands, MRU, categories' },
  { id:'safety-stock',       label:'Safety Stock',               icon:'🛟', group:'Solver Inputs',      desc:'Target / WOS / Min-Max; HSS vs SSS' },
  // ── Constraints & Timing ───────────────────────────────────────────────────
  { id:'hard-vs-soft',       label:'Hard vs Soft Constraints',   icon:'🧱', group:'Constraints & Timing', desc:'What the solver must honour vs what it may relax' },
  { id:'quantity-constraints', label:'Lot Size · Min/Mult/Max',  icon:'📏', group:'Constraints & Timing', desc:'Minimum order qty, order multiple, maximum' },
  { id:'calendar-constraints', label:'Calendar & Holidays',      icon:'📅', group:'Constraints & Timing', desc:'Working days, lead-time offset, freeze windows' },
  // ── Solver Decisions ───────────────────────────────────────────────────────
  { id:'net-requirements',   label:'Net Requirements',           icon:'➖', group:'Solver Decisions',   desc:'max(0, demand − on-hand + safety stock)' },
  { id:'timing-logic',       label:'Timing Logic',               icon:'🕰️', group:'Solver Decisions',   desc:'Backward lead-time offset over working days' },
  { id:'sourcing-logic',     label:'Sourcing Logic',             icon:'🔀', group:'Solver Decisions',   desc:'Alternates, split %, priority & proportion' },
  { id:'shortage-handling',  label:'Shortage Handling',          icon:'⚠️', group:'Solver Decisions',   desc:'Partial fill, late, or short — and why' },
  { id:'allocation',         label:'Allocation / Fair Share',    icon:'⚖️', group:'Solver Decisions',   desc:'Sharing scarce supply across demands' },
  { id:'pegging',            label:'Pegging',                    icon:'🔗', group:'Solver Decisions',   desc:'Trace supply back to demand, from→to grain' },
  // ── Outputs & RCA ──────────────────────────────────────────────────────────
  { id:'solver-outputs',     label:'Solver Outputs',             icon:'📤', group:'Outputs & RCA',      desc:'Flow, inventory, delivery, pegging plans' },
  { id:'inventory-plan',     label:'Inventory Plan',             icon:'🗃️', group:'Outputs & RCA',      desc:'BOH → EOH across the inventory buckets' },
  { id:'rca',                label:'Root Cause Analysis',        icon:'🔎', group:'Outputs & RCA',      desc:'Problem Type + suggested available date' },
  // ── Supported Models ───────────────────────────────────────────────────────
  { id:'lot-based',          label:'Lot-Based Planning',         icon:'🏷️', group:'Supported Models',   desc:'Lot-level pegging and genealogy' },
  { id:'shelf-life',         label:'Shelf Life',                 icon:'⏳', group:'Supported Models',   desc:'Expiry-aware planning' },
  { id:'no-carry',           label:'No Inventory Hold',          icon:'🚫', group:'Supported Models',   desc:'No-carry push behaviour' },
  { id:'class-based-planning', label:'Class-Based Planning',     icon:'🧬', group:'Supported Models',   desc:'The hard-peg → class hinge' },
  // ── Optimization & Ops ─────────────────────────────────────────────────────
  { id:'optimization',       label:'Optimization Passes',        icon:'🚀', group:'Optimization & Ops', desc:'ORL, WIP sweep, reallocation, multipass' },
  { id:'performance',        label:'Performance & Scale',        icon:'📈', group:'Optimization & Ops', desc:'Telescopic buckets, segmentation, memoization' },
  { id:'debug',              label:'Debug & Diagnostics',        icon:'🩺', group:'Optimization & Ops', desc:'Pipeline-as-debugger; Σ Pegging = Plan' },
];

const GROUP_ORDER = ['Foundations','Meet the Solver','Network & Data Model','Solver Inputs','Constraints & Timing','Solver Decisions','Outputs & RCA','Supported Models','Optimization & Ops'];
const PLAYGROUND = [
  { id:'playground', label:'Solver Playground', icon:'🎮' },
  { id:'sim-lab',    label:'Scenario Lab',      icon:'🧪' },
];
const REFERENCE = [
  { id:'master-map',      label:'Master Map',      icon:'🗺️' },
  { id:'glossary',        label:'Glossary',        icon:'📖' },
  { id:'config-reference',label:'Config Reference',icon:'⚙️' },
  { id:'cheatsheet',      label:'Cheat Sheet',     icon:'📋' },
];
const PRACTICE = [
  { id:'mock-interview', label:'Mock Interview',  icon:'🎤' },
  { id:'decisions',      label:'Decision Drills', icon:'🧭' },
  { id:'rca-clinic',     label:'RCA Clinic',      icon:'🚑' },
  { id:'interview',      label:'Interview Q&A',   icon:'🎯' },
];
const REVIEW = [
  { id:'dashboard', label:'Dashboard',     icon:'📊' },
  { id:'review',    label:'Review Center',  icon:'🔁' },
  { id:'study',     label:'Study Hub',      icon:'📚' },
];

const COLLAPSE_KEY = 'o9scs_nav_collapsed';
function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set])); } catch (e) {}
}

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const collapsed = loadCollapsed();
  const groups = {};
  MODULES.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });

  const section = (name, items, extra) => {
    const isCol = collapsed.has(name);
    return `
      <div class="nav-group ${isCol ? 'collapsed' : ''}" data-group="${name}">
        <button class="nav-group-label" aria-expanded="${!isCol}">
          <span>${name}</span><span class="nav-chevron">▾</span>
        </button>
        <div class="nav-group-items"><div class="nav-group-inner">
          ${items.map(m => `
            <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
              <span class="nav-icon">${m.icon}</span>
              <span class="nav-label">${m.label}</span>
              ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
            </a>`).join('')}
          ${extra || ''}
        </div></div>
      </div>`;
  };

  nav.innerHTML = `
    <div class="nav-tools">
      <input class="nav-filter" type="text" placeholder="Filter modules…" aria-label="Filter modules" />
      <button class="icon-btn nav-collapse-all" title="Collapse / expand all" aria-label="Collapse or expand all sections">⇕</button>
    </div>
    ${GROUP_ORDER.map(g => section(g, groups[g] || [])).join('')}
    ${section('Playground', PLAYGROUND)}
    ${section('Reference', REFERENCE)}
    ${section('Practice', PRACTICE)}
    ${section('Review', REVIEW)}
  `;

  nav.querySelectorAll('.nav-group-label').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-group');
      const nowCollapsed = group.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!nowCollapsed));
      const set = loadCollapsed();
      nowCollapsed ? set.add(group.dataset.group) : set.delete(group.dataset.group);
      saveCollapsed(set);
    });
  });

  nav.querySelector('.nav-collapse-all')?.addEventListener('click', () => {
    const gs = [...nav.querySelectorAll('.nav-group')];
    const allCollapsed = gs.every(g => g.classList.contains('collapsed'));
    const set = new Set();
    gs.forEach(g => {
      const collapse = !allCollapsed;
      g.classList.toggle('collapsed', collapse);
      g.querySelector('.nav-group-label')?.setAttribute('aria-expanded', String(!collapse));
      if (collapse) set.add(g.dataset.group);
    });
    saveCollapsed(set);
  });

  const filter = nav.querySelector('.nav-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    const stored = loadCollapsed();
    nav.querySelectorAll('.nav-group').forEach(group => {
      let anyVisible = false;
      group.querySelectorAll('.nav-item').forEach(item => {
        const match = !q || item.querySelector('.nav-label').textContent.toLowerCase().includes(q);
        item.hidden = !match;
        if (match) anyVisible = true;
      });
      const header = group.querySelector('.nav-group-label');
      if (q) {
        group.hidden = !anyVisible;
        group.classList.remove('collapsed');
        header?.setAttribute('aria-expanded', 'true');
      } else {
        group.hidden = false;
        const isCol = stored.has(group.dataset.group);
        group.classList.toggle('collapsed', isCol);
        header?.setAttribute('aria-expanded', String(!isCol));
      }
    });
  });
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  const real = [...done].filter(id => MODULES.some(m => m.id === id)).length;
  if (fill) fill.style.width = `${(real / MODULES.length) * 100}%`;
  if (count) count.textContent = `${real} / ${MODULES.length}`;
}
