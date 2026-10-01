// Sidebar navigation + progress. Numbered modules plus synthetic "extras"
// (reference & review pages). Groups are collapsible and filterable.

export const MODULES = [
  // ── Foundation — The Pain Era ────────────────────────────────────────────
  { id:'m01', title:'The Data Chaos',        icon:'💥', group:'Foundation',     num:'01', desc:'Raw tables, six teams, SQL explosion' },
  { id:'m02', title:'Revenue Disagreement',  icon:'💰', group:'Foundation',     num:'02', desc:'Three teams, three different revenue numbers' },
  { id:'m03', title:'The Duplication Trap',  icon:'📋', group:'Foundation',     num:'03', desc:'One SQL copied 12 times — maintenance nightmare' },
  { id:'m04', title:'Broken Dashboards',     icon:'📉', group:'Foundation',     num:'04', desc:'One column change breaks everything downstream' },
  { id:'m05', title:'Onboarding Nightmare',  icon:'😵', group:'Foundation',     num:'05', desc:'600 SQL files, no docs, no dependencies' },
  { id:'m06', title:'The Trust Crisis',      icon:'🤔', group:'Foundation',     num:'06', desc:'CEO asks one question, gets three different answers' },
  // ── ELT Revolution ──────────────────────────────────────────────────────
  { id:'m07', title:'The ETL Era',           icon:'🔧', group:'ELT Revolution', num:'07', desc:'How data pipelines worked before cloud warehouses' },
  { id:'m08', title:'Why ELT Won',           icon:'⚡', group:'ELT Revolution', num:'08', desc:'Cloud warehouses changed transformation forever' },
  // ── Introduction ────────────────────────────────────────────────────────
  { id:'m09', title:'Introducing dbt',       icon:'🦆', group:'Introduction',   num:'09', desc:'The tool that finally solved the chaos' },
  // ── Core Features ───────────────────────────────────────────────────────
  { id:'m10', title:'dbt Models',            icon:'🏗️', group:'Core Features',  num:'10', desc:'Reusable, versioned SQL transformations' },
  { id:'m11', title:'dbt Tests',             icon:'🧪', group:'Core Features',  num:'11', desc:'Catch bad data before it reaches dashboards' },
  { id:'m12', title:'Snapshots',             icon:'📸', group:'Core Features',  num:'12', desc:'Track slowly changing data over time' },
  { id:'m13', title:'Incremental Models',    icon:'⏩', group:'Core Features',  num:'13', desc:'Process only new records, not the full table' },
  { id:'m14', title:'Macros & Reuse',        icon:'♻️', group:'Core Features',  num:'14', desc:'Write SQL once, call it everywhere' },
  { id:'m15', title:'Lineage & DAG',         icon:'🕸️', group:'Core Features',  num:'15', desc:'Know exactly what depends on what' },
  // ── Advanced ────────────────────────────────────────────────────────────
  { id:'m16', title:'When NOT to Use dbt',   icon:'🚫', group:'Advanced',       num:'16', desc:'Where dbt fits and where it does not belong' },
  // ── dbt Internals ───────────────────────────────────────────────────────
  { id:'m17', title:'Internals Visualizer',  icon:'🔬', group:'dbt Internals',  num:'17', desc:'What happens between dbt run and SQL hitting the warehouse' },
  { id:'m18', title:'Compile vs Execute',    icon:'⚙️', group:'dbt Internals',  num:'18', desc:'One templated model → compiled SQL → execution, step by step' },
  { id:'m19', title:'Manifest & Artifacts',  icon:'🗂️', group:'dbt Internals',  num:'19', desc:'Browse manifest/run_results/catalog; trace any node' },
  // ── Selection & Incrementals ─────────────────────────────────────────────
  { id:'m20', title:'State & Selection',      icon:'🎯', group:'Selection & Incrementals', num:'20', desc:'Pick a changed model, apply selectors, see what builds (Slim CI)' },
  { id:'m21', title:'Incremental Strategies', icon:'⏩', group:'Selection & Incrementals', num:'21', desc:'append/merge/delete+insert/insert_overwrite/microbatch + pitfalls' },
  // ── Data Quality ─────────────────────────────────────────────────────────
  { id:'m22', title:'Testing & Data Quality', icon:'🧪', group:'Data Quality', num:'22', desc:'Generic, singular, custom, unit tests + contracts; run rollup' },
  { id:'m23', title:'Source & Freshness',     icon:'📥', group:'Data Quality', num:'23', desc:'Freshness gates + the five source failures + classification' },
  // ── Production & Debugging ───────────────────────────────────────────────
  { id:'m24', title:'Failure Simulator',     icon:'🚨', group:'Production & Debugging', num:'24', desc:'Ten real dbt incidents: symptom → root cause → fix → prevent' },
];

// Synthetic entries: reference & review pages. They live in the sidebar but
// don't count toward course progress or the prev/next pager.
export const EXTRAS = [
  { id:'master-map', title:'Master Map',       icon:'🗺️', group:'Reference', num:'', desc:'The whole dbt project on one page — sources to marts.' },
  { id:'comparison', title:'ETL vs ELT vs dbt', icon:'⚖️', group:'Reference', num:'', desc:'Feature matrix, when-to-use, interview Q&A.' },
  { id:'glossary',   title:'Glossary',          icon:'📖', group:'Reference', num:'', desc:'Every dbt term, searchable and defined.' },
  { id:'cheatsheet', title:'Cheat Sheet',       icon:'📋', group:'Reference', num:'', desc:'CLI, Jinja, config and test quick reference.' },
  { id:'study',      title:'Study Hub',         icon:'📚', group:'Review',    num:'★', desc:'All interview questions in one filterable place.' },
];

const HOME = { id:'home', title:'Home', icon:'🦆', group:'Start', num:'' };

// Look up any routable entry (numbered module, reference page, or home).
export function getNavItem(id) {
  return MODULES.find(m => m.id === id) || EXTRAS.find(e => e.id === id) ||
         (id === 'home' ? HOME : null);
}

const COLLAPSE_KEY = 'dbt-nav-collapsed';
function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set])); } catch (e) {}
}

function buildGroups() {
  const order = [...new Set(MODULES.map(m => m.group))];
  const groups = order.map(name => ({ name, items: MODULES.filter(m => m.group === name) }));
  [...new Set(EXTRAS.map(e => e.group))].forEach(name => {
    groups.push({ name, items: EXTRAS.filter(e => e.group === name) });
  });
  return groups;
}

export function renderNav(activeId, done) {
  const list = document.getElementById('nav-list');
  if (!list) return;

  const collapsed = loadCollapsed();
  const groups = buildGroups();

  list.innerHTML = `
    <div class="nav-tools">
      <input class="nav-filter" type="text" placeholder="Filter…" aria-label="Filter modules" />
      <button class="icon-btn nav-collapse-all" title="Collapse / expand all" aria-label="Collapse or expand all sections">⇕</button>
    </div>
    ${groups.map(g => {
      const isCol = collapsed.has(g.name);
      return `
      <div class="nav-group ${isCol ? 'collapsed' : ''}" data-group="${g.name}">
        <button class="nav-group-header" aria-expanded="${!isCol}">
          <span class="nav-group-name">${g.name}</span>
          <span class="nav-chevron">▾</span>
        </button>
        <div class="nav-group-items"><div class="nav-group-inner">
          ${g.items.map(m => `
            <div class="nav-item ${m.id === activeId ? 'active' : ''} ${done.has(m.id) ? 'done' : ''}"
                 data-id="${m.id}" role="button" tabindex="0">
              <span class="nav-icon">${m.icon}</span>
              <span class="nav-label">${m.title}</span>
              <span class="nav-number">${done.has(m.id) ? '✓' : m.num}</span>
            </div>`).join('')}
        </div></div>
      </div>`;
    }).join('')}
  `;

  // Toggle a single section.
  list.querySelectorAll('.nav-group-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-group');
      const nowCollapsed = group.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!nowCollapsed));
      const set = loadCollapsed();
      nowCollapsed ? set.add(group.dataset.group) : set.delete(group.dataset.group);
      saveCollapsed(set);
    });
  });

  // Collapse-all / expand-all.
  list.querySelector('.nav-collapse-all')?.addEventListener('click', () => {
    const gs = [...list.querySelectorAll('.nav-group')];
    const allCollapsed = gs.every(g => g.classList.contains('collapsed'));
    const set = new Set();
    gs.forEach(g => {
      const collapse = !allCollapsed;
      g.classList.toggle('collapsed', collapse);
      g.querySelector('.nav-group-header')?.setAttribute('aria-expanded', String(!collapse));
      if (collapse) set.add(g.dataset.group);
    });
    saveCollapsed(set);
  });

  // Filter: hide non-matching items, auto-expand groups with matches.
  const filter = list.querySelector('.nav-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    const stored = loadCollapsed();
    list.querySelectorAll('.nav-group').forEach(group => {
      let anyVisible = false;
      group.querySelectorAll('.nav-item').forEach(item => {
        const match = !q || item.querySelector('.nav-label').textContent.toLowerCase().includes(q);
        item.hidden = !match;
        if (match) anyVisible = true;
      });
      const header = group.querySelector('.nav-group-header');
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
