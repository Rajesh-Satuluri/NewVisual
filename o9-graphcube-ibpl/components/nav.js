export const MODULES = [
  // ── Platform ───────────────────────────────────────────────────────────────
  { id:'m01', label:'Platform Overview',     icon:'🧠', group:'Platform',   desc:'o9 Digital Brain, mPower, Enterprise Knowledge Graph & GraphCube' },
  { id:'m02', label:'Data Model',            icon:'🗃️', group:'Platform',   desc:'Dimensions, levels, members, measure groups, measures, edges' },
  { id:'m03', label:'Planning Engine',       icon:'⚙️', group:'Platform',   desc:'Solvers, optimization, constraints — the computation layer' },
  { id:'m04', label:'Workflow Engine',       icon:'🔀', group:'Platform',   desc:'Planning cycles, approvals, exception queues, commit-or-cancel' },
  // ── GraphCube ──────────────────────────────────────────────────────────────
  { id:'m05', label:'GraphCube — Storage',   icon:'🧊', group:'GraphCube',  desc:'Intersection explorer, sparse columnar storage, edges, vs OLAP' },
  { id:'m15', label:'Graph Relationships',   icon:'🕸️', group:'GraphCube',  desc:'From/To/Edge/RelationshipType — traversing the knowledge graph' },
  // ── IBPL Language ───────────────────────────────────────────────────────────
  { id:'m06', label:'IBPL — Select',         icon:'🔎', group:'IBPL Language', desc:'Select syntax, where vs .filter(), orderby, memberproperties' },
  { id:'m07', label:'IBPL — Scope & Write',  icon:'✍️', group:'IBPL Language', desc:'The 7 scopes: cartesian, regular, recurrence, spread, graph…' },
  { id:'m08', label:'IBPL — Rules',          icon:'📐', group:'IBPL Language', desc:'Computed measures, operators, analytical & time functions' },
  { id:'m09', label:'IBPL — Commands',       icon:'⌨️', group:'IBPL Language', desc:'createmember, update, copymeasure, grant/resetaccesscontrol' },
  // ── Data Model Deep Dive ────────────────────────────────────────────────────
  { id:'m10', label:'Dimensions & Members',  icon:'📂', group:'Data Model Deep Dive', desc:'Regular vs Time, Version dimension, member keys & properties' },
  { id:'m11', label:'Hierarchies & Levels',  icon:'🌳', group:'Data Model Deep Dive', desc:'Levels, alternate hierarchies, ancestors, hanging members' },
  { id:'m12', label:'Measure Groups',        icon:'📊', group:'Data Model Deep Dive', desc:'MeasureGroup grain, measure data types, editable flag' },
  { id:'m13', label:'Aggregation & Spread',  icon:'↕️', group:'Data Model Deep Dive', desc:'Aggregation policies, CopyToLeaves vs DistributeToLeaves, basis' },
  { id:'m14', label:'Version Management',    icon:'🗂️', group:'Data Model Deep Dive', desc:'CWV / Scenario / Snapshot, version key semantics, isolation' },
  // ── Operations ──────────────────────────────────────────────────────────────
  { id:'m16', label:'Access Control',        icon:'🔐', group:'Operations', desc:'UI roles, data roles, grant/deny read/write, resetaccesscontrol' },
  { id:'m17', label:'DistributeToLeaves',    icon:'💧', group:'Operations', desc:'Leaf-level write-back and distribution logic in detail' },
  { id:'m18', label:'Integrations',          icon:'🔌', group:'Operations', desc:'Ingestion (SFTP/REST/streaming), connectors, downstream exports' },
  { id:'m20', label:'Performance & Scale',   icon:'🚀', group:'Operations', desc:'Sparsity at scale, MaxIntersections, query tuning tips' },
  // ── Practice ────────────────────────────────────────────────────────────────
  { id:'m19', label:'Use Cases',             icon:'🏭', group:'Practice',   desc:'CAT demand, supply & inventory planning walkthroughs' },
  { id:'m21', label:'Interview Master',      icon:'🎯', group:'Practice',   desc:'Senior scenario Q&A across all topics, grounded in CAT tenant' },
];

const GROUP_ORDER = ['Platform','GraphCube','IBPL Language','Data Model Deep Dive','Operations','Practice'];
const REFERENCE = [
  { id:'master-map', label:'Master Map', icon:'🗺️' },
  { id:'glossary',   label:'Glossary',   icon:'📖' },
];

const COLLAPSE_KEY = 'o9gc_nav_collapsed';
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

  const section = (name, items) => {
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
        </div></div>
      </div>`;
  };

  nav.innerHTML = `
    <div class="nav-tools">
      <input class="nav-filter" type="text" placeholder="Filter modules…" aria-label="Filter modules" />
      <button class="icon-btn nav-collapse-all" title="Collapse / expand all" aria-label="Collapse or expand all sections">⇕</button>
    </div>
    ${GROUP_ORDER.map(g => section(g, groups[g] || [])).join('')}
    ${section('Reference', REFERENCE)}
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
