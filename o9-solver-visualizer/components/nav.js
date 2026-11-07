// nav.js — the MODULES registry (single source of truth for the curriculum)
// plus the sidebar renderer. Same architecture as the Kafka tool.
//
// Curriculum = a curated, beginner→mastery learning path grounded in the o9
// SCS wiki (consolidated where 1:1 pages would over-fragment the flow).
export const MODULES = [
  // ── Foundations — the mental model ──────────────────────────────────────────
  { id:'why-planning',     label:'Why Planning Is Hard',     icon:'🧱', group:'Foundations', desc:'Start here — the three walls (lead time, finite capacity, priority) that force a plan and make a solver necessary' },
  { id:'planning-language',label:'The Language of Planning', icon:'📖', group:'Foundations', desc:'Start here — demand, on-hand, net requirement, lead time, BOM, routing, pegging and buckets, taught once on one order' },
  { id:'sc-basics',        label:'Supply Chain & the Match', icon:'🔗', group:'Foundations', desc:'The three supply-chain functions and the demand–supply match the solver exists to make' },
  { id:'what-is-solver',   label:'What is the Solver',       icon:'🧠', group:'Foundations', desc:'A heuristic plugin inside the GraphCube server — not an LP/MIP optimiser' },
  { id:'obo-heuristic',    label:'Order-by-Order Heuristic', icon:'🔢', group:'Foundations', desc:'Plan one demand at a time, in priority order, backward downstream → upstream' },
  { id:'demand-sorting',   label:'Demand Sorting',           icon:'↕️', group:'Foundations', desc:'Priority → Fair-Share → Due Date → Quantity → key' },
  { id:'three-phases',     label:'JIT · Build-Ahead · Late', icon:'⏱️', group:'Foundations', desc:'The three timing phases the solver tries for every demand' },

  // ── Network & Data Model — the world it plans over ──────────────────────────
  { id:'network-types',    label:'Network Types',            icon:'🕸️', group:'Network & Data Model', desc:'Manufacturing (BOM + Routing), Distribution (BOD + Mode), Procurement (Supplier)' },
  { id:'nodes-graphs',     label:'Nodes & Graphs',           icon:'⬢', group:'Network & Data Model', desc:'Material / Activity / Demand / Capacity / Storage nodes and the association graphs' },
  { id:'planning-horizon', label:'Planning Horizon',         icon:'📆', group:'Network & Data Model', desc:'Plan Start / Current / End and how the horizon bounds demand and supply' },

  // ── Solver Inputs — what you feed it ────────────────────────────────────────
  { id:'inventory',        label:'Inventory (BOH / ER)',     icon:'📦', group:'Solver Inputs', desc:'Beginning on-hand buckets and expected receipts' },
  { id:'demand-inputs',    label:'Demand with Attributes',   icon:'📨', group:'Solver Inputs', desc:'Priority, fulfilment policy, proportional split, build-ahead/late limits' },
  { id:'activity-params',  label:'Activity & Parameters',    icon:'⚙️', group:'Solver Inputs', desc:'Activities, lead time, effectivity, and BOM component effectiveness' },
  { id:'capacity',         label:'Capacity',                 icon:'🏭', group:'Solver Inputs', desc:'Capacity buckets, bands and resource units' },
  { id:'safety-stock',     label:'Safety Stock',             icon:'🛟', group:'Solver Inputs', desc:'Target / WOS / Min-Max, and the safety-stock pass' },
  { id:'wip',              label:'WIP',                      icon:'🔧', group:'Solver Inputs', desc:'Work-in-process as in-flight supply' },
  { id:'lot-sizing',       label:'Lot Size · Max · Storage', icon:'📏', group:'Solver Inputs', desc:'Min / multiple / max order quantity, max stock and storage limits' },
  { id:'objective-rank-list', label:'Objective Rank List',   icon:'🎯', group:'Solver Inputs', desc:'The ordered soft constraints — the solver’s objective itself (Other Inputs)' },

  // ── How It Solves — the decisions ───────────────────────────────────────────
  { id:'sourcing-logic',   label:'Sourcing & Alternates',    icon:'🔀', group:'How It Solves', desc:'Choosing among alternate producers: priority, proportion, key, end-date' },
  { id:'pegging',          label:'Pegging',                  icon:'🔗', group:'How It Solves', desc:'FIFO order / material / capacity / lot pegging — supply traced to demand' },
  { id:'excess-cleanup',   label:'Excess Clean-Up',          icon:'🧹', group:'How It Solves', desc:'Releasing or moving out supply above ending-on-hand minus safety stock' },

  // ── Outputs & Diagnostics — what comes out ──────────────────────────────────
  { id:'solver-outputs',   label:'Solver Outputs',           icon:'📤', group:'Outputs & Diagnostics', desc:'Flow / inventory / delivery plans, fulfilment & load reports, where-used' },
  { id:'rca',              label:'Root Cause Analysis',      icon:'🔎', group:'Outputs & Diagnostics', desc:'Problem Type and suggested available date for every short or late demand' },
  { id:'debug',            label:'Debug a Plan',             icon:'🩺', group:'Outputs & Diagnostics', desc:'Σ pegging = plan, no negative on-hand, no capacity overload' },

  // ── Invocation ──────────────────────────────────────────────────────────────
  { id:'invocation',       label:'Invocation & Plan Types',  icon:'▶️', group:'Invocation', desc:'exec plugin; FULL / INCREMENTAL / IDENTIFY_SEGMENTS / EXPORT_ONLY' },

  // ── Models Supported — advanced capabilities ────────────────────────────────
  { id:'lot-based',        label:'Lot-Based Planning',       icon:'🏷️', group:'Models Supported', desc:'Lot-level pegging and genealogy' },
  { id:'supply-code',      label:'Supply Code (+ Mix&Match)',icon:'🧮', group:'Models Supported', desc:'Supply-code planning and mix-and-match supply codes' },
  { id:'shelf-life',       label:'Shelf Life (+ Class)',     icon:'⏳', group:'Models Supported', desc:'Expiry-aware planning, including class-based shelf life' },
  { id:'class-based-planning', label:'Class-Based Planning', icon:'🧬', group:'Models Supported', desc:'The hard-peg → class hinge' },
  { id:'no-carry',         label:'No Inventory Hold',        icon:'🚫', group:'Models Supported', desc:'No-carry push behaviour' },
  { id:'yield-time-varying', label:'Time-Varying Yield',     icon:'📉', group:'Models Supported', desc:'Time-varying production & consumption (yield)' },
  { id:'co-products',      label:'Co-Products',              icon:'⚗️', group:'Models Supported', desc:'One activity producing multiple outputs' },
  { id:'multi-step-routing', label:'Multi-Step Routing',     icon:'🪜', group:'Models Supported', desc:'Multi-operation routings, including WIP support' },
  { id:'special-models',   label:'Special Cases',            icon:'✨', group:'Models Supported', desc:'Alt-resource consolidation, campaign/batch, PSP, soft quarantine, holidays, transition & substitution' },

  // ── Optimization & Ops ──────────────────────────────────────────────────────
  { id:'optimization',     label:'Optimization Passes',      icon:'🚀', group:'Optimization & Ops', desc:'ORL passes, WIP sweep, material reallocation, multipass' },
  { id:'performance',      label:'Performance & Scale',      icon:'📈', group:'Optimization & Ops', desc:'Telescopic buckets, segmentation / parallelism, memoization' },
  { id:'config-ui',        label:'Solver Config UI',         icon:'🛠️', group:'Optimization & Ops', desc:'How a solver instance is configured — inputs, outputs, parameters' },
  { id:'deployment',       label:'Remote · Retail · ML',     icon:'🌐', group:'Optimization & Ops', desc:'Remote SCS, Retail SCS and the ML flow' },
];

const GROUP_ORDER = ['Foundations','Network & Data Model','Solver Inputs','How It Solves','Outputs & Diagnostics','Invocation','Models Supported','Optimization & Ops'];
const PLAYGROUND = [
  { id:'playground', label:'Solver Playground', icon:'🎮' },
  { id:'sim-lab',    label:'Scenario Lab',      icon:'🧪' },
];
const REFERENCE = [
  { id:'master-map',      label:'Master Map',      icon:'🗺️' },
  { id:'glossary',        label:'Glossary',        icon:'📖' },
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
