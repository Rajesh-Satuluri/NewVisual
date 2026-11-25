// Spark Structured Streaming — navigation & curriculum.
// Numbered MODULES count toward progress + the prev/next pager.
// EXTRAS are synthetic sidebar entries (reference pages, labs, review).
export const MODULES = [
  // Group: Foundation
  { id: 'm01', title: 'Why Structured Streaming', icon: '🔥', group: 'Foundation', num: '01' },
  { id: 'm02', title: 'The Unbounded Table',      icon: '🧱', group: 'Foundation', num: '02' },
  // Group: Architecture
  { id: 'm03', title: 'Architecture & Components', icon: '🏛️', group: 'Architecture', num: '03' },
  { id: 'm04', title: 'Sources & Schema',          icon: '🔗', group: 'Architecture', num: '04' },
  { id: 'm05', title: 'Micro-Batch & Triggers',    icon: '⏭️', group: 'Architecture', num: '05' },
  { id: 'm06', title: 'Continuous Processing',     icon: '➿', group: 'Architecture', num: '06' },
  // Group: Time & Windows
  { id: 'm07', title: 'Event vs Processing Time',  icon: '⏱️', group: 'Time & Windows', num: '07' },
  { id: 'm08', title: 'Watermarks',                icon: '💧', group: 'Time & Windows', num: '08' },
  { id: 'm09', title: 'Windows',                   icon: '🪟', group: 'Time & Windows', num: '09' },
  // Group: State & Output
  { id: 'm10', title: 'Stateful Aggregations',     icon: '🗄️', group: 'State & Output', num: '10' },
  { id: 'm11', title: 'Arbitrary State',           icon: '🧩', group: 'State & Output', num: '11' },
  { id: 'm12', title: 'Output Modes',              icon: '📤', group: 'State & Output', num: '12' },
  { id: 'm13', title: 'Deduplication',             icon: '🧹', group: 'State & Output', num: '13' },
  // Group: Sinks & Reliability
  { id: 'm14', title: 'Sinks & foreachBatch',      icon: '🪣', group: 'Sinks & Reliability', num: '14' },
  { id: 'm15', title: 'Checkpoint & Offset Log',   icon: '✅', group: 'Sinks & Reliability', num: '15' },
  { id: 'm16', title: 'Fault Tolerance & EOS',     icon: '🛡️', group: 'Sinks & Reliability', num: '16' },
  // Group: Joins
  { id: 'm17', title: 'Stream–Static Joins',       icon: '🔀', group: 'Joins', num: '17' },
  { id: 'm18', title: 'Stream–Stream Joins',       icon: '🔗', group: 'Joins', num: '18' },
  // Group: Lakehouse & Operations
  { id: 'm19', title: 'Delta Sink & MERGE',        icon: '🔼', group: 'Lakehouse & Ops', num: '19' },
  { id: 'm20', title: 'Performance & Tuning',      icon: '🚀', group: 'Lakehouse & Ops', num: '20' },
  { id: 'm21', title: 'Monitoring & Listeners',    icon: '📡', group: 'Lakehouse & Ops', num: '21' },
  // Group: End-to-End
  { id: 'm22', title: 'ShopStream Capstone',       icon: '🗺️', group: 'End-to-End', num: '22' },
];

// Synthetic entries — not numbered modules (no progress / pager).
export const EXTRAS = [
  { id: 'dashboard',      title: 'Dashboard',       icon: '📊', group: 'Start', num: '' },
  { id: 'learning-path',  title: 'Learning Path',   icon: '🧭', group: 'Start', num: '▶' },
  { id: 'search',         title: 'Search',          icon: '🔍', group: 'Start', num: '' },
  { id: 'master-map',     title: 'Master Map',      icon: '🗺️', group: 'Reference', num: '' },
  { id: 'comparison',     title: 'Engine Comparison', icon: '⚖️', group: 'Reference', num: '' },
  { id: 'glossary',       title: 'Glossary',        icon: '📖', group: 'Reference', num: '' },
  { id: 'cheatsheet',     title: 'Cheat Sheet',     icon: '📋', group: 'Reference', num: '' },
  { id: 'config-reference', title: 'Config Reference', icon: '⚙️', group: 'Reference', num: '' },
  { id: 'microbatch-lab', title: 'Micro-Batch Lab', icon: '⏭️', group: 'Labs', num: '' },
  { id: 'watermark-lab',  title: 'Watermark Lab',   icon: '💧', group: 'Labs', num: '' },
  { id: 'output-mode-lab', title: 'Output-Mode Lab', icon: '📤', group: 'Labs', num: '' },
  { id: 'review',         title: 'Review Center',   icon: '🔁', group: 'Review', num: '' },
  { id: 'study',          title: 'Study Hub',       icon: '📚', group: 'Review', num: '★' },
];

const HOME = { id: 'home', title: 'Home', icon: '🏠', group: 'Start', num: '' };

export function getNavItem(id) {
  return MODULES.find(m => m.id === id) || EXTRAS.find(e => e.id === id) ||
         (id === 'home' ? HOME : null);
}

const COLLAPSE_KEY = 'spark_nav_collapsed';
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

  list.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { window.location.hash = el.dataset.module; });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = el.dataset.module; }
    });
  });

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
