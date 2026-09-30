export const MODULES = [
  // ── Foundation — The Pain Era ────────────────────────────────────────────
  { id:'m01', label:'The Data Chaos',        icon:'💥', group:'Foundation',     desc:'Raw tables, six teams, SQL explosion' },
  { id:'m02', label:'Revenue Disagreement',  icon:'💰', group:'Foundation',     desc:'Three teams, three different revenue numbers' },
  { id:'m03', label:'The Duplication Trap',  icon:'📋', group:'Foundation',     desc:'One SQL copied 12 times — maintenance nightmare' },
  { id:'m04', label:'Broken Dashboards',     icon:'📉', group:'Foundation',     desc:'One column change breaks everything downstream' },
  { id:'m05', label:'Onboarding Nightmare',  icon:'😵', group:'Foundation',     desc:'600 SQL files, no docs, no dependencies' },
  { id:'m06', label:'The Trust Crisis',      icon:'🤔', group:'Foundation',     desc:'CEO asks one question, gets three different answers' },
  // ── ELT Revolution ──────────────────────────────────────────────────────
  { id:'m07', label:'The ETL Era',           icon:'🔧', group:'ELT Revolution', desc:'How data pipelines worked before cloud warehouses' },
  { id:'m08', label:'Why ELT Won',           icon:'⚡', group:'ELT Revolution', desc:'Cloud warehouses changed transformation forever' },
  // ── Introduction ────────────────────────────────────────────────────────
  { id:'m09', label:'Introducing dbt',       icon:'🦆', group:'Introduction',   desc:'The tool that finally solved the chaos' },
  // ── Core Features ───────────────────────────────────────────────────────
  { id:'m10', label:'dbt Models',            icon:'🏗️', group:'Core Features',  desc:'Reusable, versioned SQL transformations' },
  { id:'m11', label:'dbt Tests',             icon:'🧪', group:'Core Features',  desc:'Catch bad data before it reaches dashboards' },
  { id:'m12', label:'Snapshots',             icon:'📸', group:'Core Features',  desc:'Track slowly changing data over time' },
  { id:'m13', label:'Incremental Models',    icon:'⏩', group:'Core Features',  desc:'Process only new records, not the full table' },
  { id:'m14', label:'Macros & Reuse',        icon:'♻️', group:'Core Features',  desc:'Write SQL once, call it everywhere' },
  { id:'m15', label:'Lineage & DAG',         icon:'🕸️', group:'Core Features',  desc:'Know exactly what depends on what' },
  // ── Advanced ────────────────────────────────────────────────────────────
  { id:'m16', label:'When NOT to Use dbt',   icon:'🚫', group:'Advanced',       desc:'Where dbt fits and where it does not belong' },
];

const GROUP_ORDER = ['Foundation', 'ELT Revolution', 'Introduction', 'Core Features', 'Advanced'];

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;
  const groups = {};
  MODULES.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });
  nav.innerHTML = GROUP_ORDER.map(g => `
    <div class="nav-group">
      <div class="nav-group-label">${g}</div>
      ${(groups[g] || []).map(m => `
        <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
          <span class="nav-icon">${m.icon}</span>
          <span class="nav-label">${m.label}</span>
          ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
        </a>
      `).join('')}
    </div>
  `).join('');
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  if (fill) fill.style.width = `${(done.size / MODULES.length) * 100}%`;
  if (count) count.textContent = `${done.size} / ${MODULES.length}`;
}
