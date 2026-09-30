import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));
let currentId = null;
let cleanupFn = null;

const LOADERS = {
  m01: () => import('./modules/m01-data-chaos.js'),
  m02: () => import('./modules/m02-revenue-disagreement.js'),
  m03: () => import('./modules/m03-duplication-trap.js'),
  m04: () => import('./modules/m04-broken-dashboards.js'),
  m05: () => import('./modules/m05-onboarding-nightmare.js'),
  m06: () => import('./modules/m06-trust-crisis.js'),
  m07: () => import('./modules/m07-etl-era.js'),
  m08: () => import('./modules/m08-elt-revolution.js'),
  m09: () => import('./modules/m09-introducing-dbt.js'),
  m10: () => import('./modules/m10-dbt-models.js'),
  m11: () => import('./modules/m11-dbt-tests.js'),
  m12: () => import('./modules/m12-snapshots.js'),
  m13: () => import('./modules/m13-incremental-models.js'),
  m14: () => import('./modules/m14-macros.js'),
  m15: () => import('./modules/m15-lineage-dag.js'),
  m16: () => import('./modules/m16-when-not-to-use.js'),
};

async function navigate(id) {
  const mod = MODULES.find(m => m.id === id);
  if (!mod) { id = MODULES[0].id; }
  if (currentId === id) return;
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }
  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = `${mod.group} &rsaquo; <strong>${mod.label}</strong>`;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const loader = LOADERS[id];
    if (!loader) throw new Error('No loader for ' + id);
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas);
    initIQ(canvas);
    markDone(id);
  } catch (e) {
    console.error('Module load error', e);
    canvas.innerHTML = `<div class="coming-soon"><div class="coming-soon-icon">🚧</div><h3>Coming Soon</h3><p>${mod.desc}</p></div>`;
  }
}

function markDone(id) {
  done.add(id);
  localStorage.setItem('dbt-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
}

function getHash() {
  const h = location.hash.slice(1);
  return MODULES.find(m => m.id === h) ? h : MODULES[0].id;
}

window.addEventListener('hashchange', () => navigate(getHash()));

document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) { e.preventDefault(); location.hash = item.dataset.id; }
});

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('dbt-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('dbt-theme', next);
});

renderNav(null, done);
updateProgress(done);
navigate(getHash());
