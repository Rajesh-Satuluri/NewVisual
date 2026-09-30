export const MODULES = [
  // ── Foundation ──────────────────────────────────────────────────────────
  { id:'m01', label:'Why Databricks',        icon:'🏗️', group:'Foundation',        desc:'From Spark\'s academic roots to the Lakehouse — why Databricks exists' },
  { id:'m02', label:'Lakehouse Architecture',icon:'🏛️', group:'Foundation',        desc:'Data warehouse + data lake unified: Delta Lake, Unity Catalog, Photon' },
  { id:'m03', label:'Delta Lake Internals',  icon:'Δ',  group:'Foundation',        desc:'Transaction log, snapshots, schema enforcement, ACID on object storage' },
  // ── Compute ─────────────────────────────────────────────────────────────
  { id:'m04', label:'Clusters & Runtimes',   icon:'⚙️', group:'Compute',           desc:'All-purpose vs job clusters, Databricks Runtime, autoscaling, spot nodes' },
  { id:'m05', label:'Photon Engine',         icon:'⚡', group:'Compute',           desc:'Vectorized C++ engine — column batches, cache-friendly ops, vs JVM Spark' },
  { id:'m06', label:'Structured Streaming',  icon:'🌊', group:'Compute',           desc:'Micro-batch and continuous processing, triggers, watermarks, checkpointing' },
  // ── Storage & Governance ─────────────────────────────────────────────────
  { id:'m07', label:'Unity Catalog',         icon:'🗂️', group:'Governance',        desc:'3-level namespace, fine-grained access, data lineage, Delta Sharing' },
  { id:'m08', label:'Medallion Architecture',icon:'🥇', group:'Governance',        desc:'Bronze → Silver → Gold: incremental refinement at Amazon\'s data lake' },
  { id:'m09', label:'Delta Optimizations',   icon:'🗜️', group:'Governance',        desc:'OPTIMIZE, ZORDER, liquid clustering, vacuum, auto-compaction' },
  // ── Jobs & Orchestration ─────────────────────────────────────────────────
  { id:'m10', label:'Workflows & Jobs',      icon:'📋', group:'Orchestration',     desc:'Multi-task jobs, task dependencies, parameters, retries, alerts' },
  { id:'m11', label:'MLflow & Model Serving',icon:'🤖', group:'Orchestration',     desc:'Experiment tracking, model registry, real-time serving endpoints' },
  // ── Operations ──────────────────────────────────────────────────────────
  { id:'m12', label:'Cost & Performance',    icon:'💰', group:'Operations',        desc:'DBU pricing, cluster rightsizing, spot vs on-demand, cost attribution' },
  { id:'m13', label:'Interview Q&A',         icon:'🎯', group:'Operations',        desc:'Senior / staff level Databricks & Lakehouse interview prep' },
];

const GROUP_ORDER = ['Foundation', 'Compute', 'Governance', 'Orchestration', 'Operations'];
const REVIEW = { id:'study', label:'Study Hub', icon:'📚' };

const COLLAPSE_KEY = 'databricks_nav_collapsed';
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
    ${section('Review', [{ ...REVIEW }])}
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
