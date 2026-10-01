import { MODULES, EXTRAS, getNavItem, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ, injectCodeEnhancements } from './components/module-shell.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { QUIZ_BANK } from './data/quiz-bank.js';

const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));
let currentId = null;
let cleanupFn = null;
let completeTimer = null;

const LOADERS = {
  home:         () => import('./modules/home.js'),
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
  m17: () => import('./modules/m17-dbt-internals.js'),
  m18: () => import('./modules/m18-compile-vs-execute.js'),
  m19: () => import('./modules/m19-manifest-explorer.js'),
  m20: () => import('./modules/m20-state-selection.js'),
  m21: () => import('./modules/m21-incremental-strategies.js'),
  m22: () => import('./modules/m22-testing-lab.js'),
  m23: () => import('./modules/m23-source-freshness.js'),
  m24: () => import('./modules/m24-failure-simulator.js'),
  m25: () => import('./modules/m25-debugging-tree.js'),
  m26: () => import('./modules/m26-performance-lab.js'),
  m27: () => import('./modules/m27-cicd-lab.js'),
  m28: () => import('./modules/m28-environments.js'),
  m29: () => import('./modules/m29-adapters-warehouses.js'),
  m30: () => import('./modules/m30-dbt-airflow.js'),
  m31: () => import('./modules/m31-case-studies.js'),
  m32: () => import('./modules/m32-command-playground.js'),
  // Reference & review
  'modes':     () => import('./modules/modes.js'),
  'readiness': () => import('./modules/readiness.js'),
  'interview-bank': () => import('./modules/interview-bank.js'),
  'interview-sim':  () => import('./modules/interview-sim.js'),
  'master-map': () => import('./modules/master-map.js'),
  comparison:   () => import('./modules/comparison.js'),
  glossary:     () => import('./modules/glossary.js'),
  cheatsheet:   () => import('./modules/cheatsheet.js'),
  study:        () => import('./modules/study.js'),
};

async function navigate(id) {
  if (!LOADERS[id]) id = 'home';
  if (currentId === id) return;
  if (cleanupFn) { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
  if (completeTimer) { clearTimeout(completeTimer); completeTimer = null; }
  currentId = id;
  renderNav(id, done);

  const nav = getNavItem(id);
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb && nav) {
    breadcrumb.innerHTML = id === 'home'
      ? `<strong>${nav.title}</strong>`
      : `${nav.group} &rsaquo; <strong>${nav.title}</strong>`;
  }

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const m = await LOADERS[id]();
    if (currentId !== id) return;
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas);
    initIQ(canvas);

    // Auto-inject "Test Yourself" (numbered modules with a bank) + pager.
    const isModule = MODULES.some(mm => mm.id === id);
    if (isModule && QUIZ_BANK[id]) {
      canvas.insertAdjacentHTML('beforeend', createQuiz(id, QUIZ_BANK[id]));
      initQuiz(canvas);
    }
    injectCodeEnhancements(canvas);
    renderPager(id);

    // Mark real modules complete after 25s of viewing.
    if (isModule && !done.has(id)) {
      completeTimer = setTimeout(() => {
        if (currentId !== id) return;
        markDone(id);
        const mod = MODULES.find(mm => mm.id === id);
        toast(`Module complete — ${mod.title}`, { icon: '✅' });
        if ([...done].filter(x => MODULES.some(mm => mm.id === x)).length === MODULES.length) {
          toast('All 16 modules complete! 🏆', { icon: '🏆', duration: 4200 });
        }
      }, 25000);
    }
  } catch (e) {
    console.error('Module load error', e);
    const nv = getNavItem(id);
    canvas.innerHTML = `<div class="coming-soon"><div class="coming-soon-icon">🚧</div><h3>Coming Soon</h3><p>${nv ? nv.desc || '' : ''}</p></div>`;
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
  return LOADERS[h] ? h : 'home';
}

window.addEventListener('hashchange', () => navigate(getHash()));

// Nav item click / keyboard (delegated).
document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) { e.preventDefault(); location.hash = item.dataset.id; }
});
document.getElementById('nav-list').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const item = e.target.closest('.nav-item[data-id]');
  if (item) { e.preventDefault(); location.hash = item.dataset.id; }
});

// Brand → home.
const brand = document.querySelector('.brand');
if (brand) {
  brand.style.cursor = 'pointer';
  brand.setAttribute('role', 'button');
  brand.setAttribute('tabindex', '0');
  brand.addEventListener('click', () => { location.hash = 'home'; });
  brand.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = 'home'; } });
}

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
initCommandPalette();
navigate(getHash()).then(() => { try { maybeRunTour(); } catch (e) {} });
