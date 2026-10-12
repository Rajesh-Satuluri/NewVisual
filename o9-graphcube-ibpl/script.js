import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';

// Non-module pages (not tracked in progress). Value = breadcrumb HTML.
const PAGES = {
  home: `<strong>🏠 Home</strong>`,
  'master-map': `Reference &rsaquo; <strong>🗺️ Master Map</strong>`,
  glossary: `Reference &rsaquo; <strong>📖 Glossary</strong>`,
};

const done = new Set(JSON.parse(localStorage.getItem('o9gc-done') || '[]'));
let currentId = null;
let cleanupFn = null;

const LOADERS = {
  home: () => import('./modules/home.js'),
  'master-map': () => import('./modules/master-map.js'),
  glossary: () => import('./modules/glossary.js'),
  m01: () => import('./modules/m01-overview.js'),
  m02: () => import('./modules/m02-data-model.js'),
  m03: () => import('./modules/m03-planning-engine.js'),
  m04: () => import('./modules/m04-workflow-engine.js'),
  m05: () => import('./modules/m05-graphcube.js'),
  m06: () => import('./modules/m06-ibpl-select.js'),
  m07: () => import('./modules/m07-ibpl-scope.js'),
  m08: () => import('./modules/m08-ibpl-rules.js'),
  m09: () => import('./modules/m09-ibpl-commands.js'),
  m10: () => import('./modules/m10-dimensions.js'),
  m11: () => import('./modules/m11-hierarchies.js'),
  m12: () => import('./modules/m12-measure-groups.js'),
  m13: () => import('./modules/m13-aggregation.js'),
  m14: () => import('./modules/m14-versions.js'),
  m15: () => import('./modules/m15-graph-relationships.js'),
  m16: () => import('./modules/m16-access-control.js'),
  m17: () => import('./modules/m17-distribute.js'),
  m18: () => import('./modules/m18-integrations.js'),
  m19: () => import('./modules/m19-use-cases.js'),
  m20: () => import('./modules/m20-performance.js'),
  m21: () => import('./modules/m21-interview.js'),
};

async function navigate(id) {
  let mod = MODULES.find(m => m.id === id);
  if (!mod && !PAGES[id]) { id = 'home'; }
  if (currentId === id) return;
  if (cleanupFn) { try { cleanupFn(); } catch (e) {} cleanupFn = null; }

  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = PAGES[id] || `${mod.group} &rsaquo; <strong>${mod.label}</strong>`;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const loader = LOADERS[id];
    if (!loader) throw new Error('No loader for ' + id);
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas); initIQ(canvas);
    if (mod) markDone(id);
  } catch (e) {
    console.error('Module load error', e);
    canvas.innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h3>Coming Soon</h3>
        <p>${mod ? mod.desc : ''}</p>
      </div>`;
  }
}

function markDone(id) {
  const isNew = !done.has(id);
  done.add(id);
  localStorage.setItem('o9gc-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
}

function getHash() {
  const h = location.hash.slice(1);
  if (PAGES[h]) return h;
  return MODULES.find(m => m.id === h) ? h : 'home';
}

window.addEventListener('hashchange', () => navigate(getHash()));

const brandEl = document.querySelector('.brand');
brandEl?.addEventListener('click', () => { location.hash = 'home'; });
brandEl?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = 'home'; } });

document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) { e.preventDefault(); location.hash = item.dataset.id; }
});

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// Theme
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
root.setAttribute('data-theme', localStorage.getItem('o9gc-theme') || 'dark');
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('o9gc-theme', next);
});

// Mobile nav drawer
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');
  const closeNav = () => document.body.classList.remove('nav-open');
  document.getElementById('nav-open')?.addEventListener('click', () => document.body.classList.add('nav-open'));
  document.getElementById('nav-backdrop')?.addEventListener('click', closeNav);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => { if (mq.matches) closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  document.getElementById('nav-list')?.addEventListener('click', e => { if (mq.matches && e.target.closest('.nav-item')) closeNav(); });
})();

// Boot
renderNav(null, done);
updateProgress(done);
navigate(getHash());
