export const MODULES = [
  // Group: Foundation
  { id: 'm01', title: 'Why Apache Flink',       icon: '⚡', group: 'Foundation',    num: '01' },
  { id: 'm02', title: 'Streaming Fundamentals',  icon: '🌊', group: 'Foundation',    num: '02' },
  // Group: Architecture
  { id: 'm03', title: 'Flink Architecture',      icon: '🏛️', group: 'Architecture',  num: '03' },
  { id: 'm04', title: 'Job Lifecycle',           icon: '🔄', group: 'Architecture',  num: '04' },
  { id: 'm05', title: 'Parallelism',             icon: '⚙️', group: 'Architecture',  num: '05' },
  { id: 'm06', title: 'Operators',               icon: '🔧', group: 'Architecture',  num: '06' },
  { id: 'm07', title: 'Sources & Sinks',         icon: '🔗', group: 'Architecture',  num: '07' },
  // Group: Time & Windows
  { id: 'm08', title: 'Time Concepts',           icon: '⏱️', group: 'Time & Windows', num: '08' },
  { id: 'm09', title: 'Watermarks',              icon: '💧', group: 'Time & Windows', num: '09' },
  { id: 'm10', title: 'Windows',                 icon: '🪟', group: 'Time & Windows', num: '10' },
  // Group: State & Fault Tolerance
  { id: 'm11', title: 'State Management',        icon: '🗄️', group: 'State & Fault',  num: '11' },
  { id: 'm12', title: 'Checkpointing',           icon: '✅', group: 'State & Fault',  num: '12' },
  { id: 'm13', title: 'Fault Tolerance',         icon: '🛡️', group: 'State & Fault',  num: '13' },
  { id: 'm14', title: 'Backpressure',            icon: '🌡️', group: 'State & Fault',  num: '14' },
  // Group: APIs & Connectors
  { id: 'm15', title: 'Flink SQL & Table API',   icon: '📊', group: 'APIs & Connectors', num: '15' },
  { id: 'm16', title: 'Connectors',              icon: '🔌', group: 'APIs & Connectors', num: '16' },
  { id: 'm17', title: 'Flink SQL',               icon: '📊', group: 'APIs & Connectors', num: '17' },
  { id: 'm18', title: 'Performance',             icon: '🚀', group: 'APIs & Connectors', num: '18' },
  { id: 'm19', title: 'Uber Pipeline',           icon: '🗺️', group: 'End-to-End',     num: '19' },
];

// Synthetic entries that live in the sidebar but aren't numbered modules.
// They don't count toward course progress or the prev/next pager.
export const EXTRAS = [
  { id: 'learning-path', title: 'Learning Path', icon: '🧭', group: 'Start', num: '▶' },
  { id: 'master-map', title: 'Master Map',       icon: '🗺️', group: 'Reference', num: '' },
  { id: 'comparison', title: 'Engine Comparison', icon: '⚖️', group: 'Reference', num: '' },
  { id: 'glossary',   title: 'Glossary',          icon: '📖', group: 'Reference', num: '' },
  { id: 'cheatsheet', title: 'Cheat Sheet',       icon: '📋', group: 'Reference', num: '' },
  { id: 'study',      title: 'Study Hub',         icon: '📚', group: 'Review',    num: '★' },
];
const REVIEW = EXTRAS;

// Home is not shown as a nav row (the sidebar brand links to it), but callers
// still need its metadata for breadcrumbs.
const HOME = { id: 'home', title: 'Home', icon: '🏠', group: 'Start', num: '' };

// Look up any routable entry (numbered module, reference page, or home).
export function getNavItem(id) {
  return MODULES.find(m => m.id === id) || EXTRAS.find(e => e.id === id) ||
         (id === 'home' ? HOME : null);
}

const COLLAPSE_KEY = 'flink_nav_collapsed';
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
  // Append synthetic groups (Reference, Review) preserving their declared order.
  [...new Set(EXTRAS.map(e => e.group))].forEach(name => {
    groups.push({ name, items: EXTRAS.filter(e => e.group === name) });
  });
  // Float the "Start" synthetic group to the very top so the guided path is
  // the first thing in the sidebar (purely a display reorder).
  groups.sort((a, b) => (a.name === 'Start' ? -1 : b.name === 'Start' ? 1 : 0));
  return groups;
}

export function renderNav(activeId, doneSet) {
  const list = document.getElementById('nav-list');
  if (!list) return;

  const collapsed = loadCollapsed();
  const groups = buildGroups();

  list.innerHTML = `
    <div class="nav-tools">
      <input class="nav-filter" type="text" placeholder="Filter modules…" aria-label="Filter modules" />
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
            <div class="nav-item ${m.id === activeId ? 'active' : ''} ${doneSet.has(m.id) ? 'done' : ''}"
                 data-module="${m.id}" role="button" tabindex="0">
              <span class="nav-icon">${m.icon}</span>
              <span class="nav-label">${m.title}</span>
              <span class="nav-number">${m.num}</span>
            </div>`).join('')}
        </div></div>
      </div>`;
    }).join('')}
  `;

  // Navigate on item click / keyboard.
  list.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { window.location.hash = el.dataset.module; });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = el.dataset.module; }
    });
  });

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

  // Filter: hide non-matching items, auto-expand groups with matches, restore on clear.
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

export function updateProgress(doneSet) {
  const count = document.getElementById('progress-count');
  const fill  = document.getElementById('progress-fill');
  const real  = [...doneSet].filter(id => MODULES.some(m => m.id === id)).length;
  if (count) count.textContent = `${real} / ${MODULES.length}`;
  if (fill)  fill.style.width  = `${(real / MODULES.length) * 100}%`;
}
