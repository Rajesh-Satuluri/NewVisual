import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { QUIZ_BANK } from './data/quiz-bank.js';

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('databricks-done') || '[]'));
let currentId = null;
let cleanupFn = null;

// ── Module loaders ─────────────────────────────────────────────────────────
const LOADERS = {
  study: () => import('./modules/study.js'),
  m01: () => import('./modules/m01-why-databricks.js'),
  m02: () => import('./modules/m02-lakehouse-architecture.js'),
  m03: () => import('./modules/m03-delta-lake-internals.js'),
  m04: () => import('./modules/m04-clusters-runtimes.js'),
  m05: () => import('./modules/m05-photon-engine.js'),
  m06: () => import('./modules/m06-structured-streaming.js'),
  m07: () => import('./modules/m07-unity-catalog.js'),
  m08: () => import('./modules/m08-medallion-architecture.js'),
  m09: () => import('./modules/m09-delta-optimizations.js'),
  m10: () => import('./modules/m10-workflows-jobs.js'),
  m11: () => import('./modules/m11-mlflow-model-serving.js'),
  m12: () => import('./modules/m12-cost-performance.js'),
  m13: () => import('./modules/m13-interview.js'),
};

// ── Navigate ───────────────────────────────────────────────────────────────
async function navigate(id) {
  let mod = MODULES.find(m => m.id === id);
  if (!mod && id !== 'study') { id = MODULES[0].id; mod = MODULES[0]; }

  if (currentId === id) return;

  if (cleanupFn) { cleanupFn(); cleanupFn = null; }

  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = id === 'study'
      ? `Review &rsaquo; <strong>📚 Study Hub</strong>`
      : `${mod.group} &rsaquo; <strong>${mod.label}</strong>`;
  }

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  canvas.scrollTop = 0;

  try {
    const loader = LOADERS[id];
    if (!loader) throw new Error('No loader for ' + id);
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    if (id !== 'study') { initTabs(canvas); initIQ(canvas); }
    enhanceModule(id);
    if (mod) markDone(id); // Study Hub is not a trackable module
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

// Inject the quiz section (if a bank exists) and the Prev/Next pager.
function enhanceModule(id) {
  const canvas = document.getElementById('module-canvas');
  const page = canvas.querySelector('.module-page');
  if (page && QUIZ_BANK[id]) {
    const holder = document.createElement('div');
    holder.innerHTML = createQuiz(id, QUIZ_BANK[id]);
    if (holder.firstElementChild) { page.appendChild(holder.firstElementChild); initQuiz(page); }
  }
  renderPager(id);
}

function markDone(id) {
  const isNew = !done.has(id);
  done.add(id);
  localStorage.setItem('databricks-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
  if (isNew) {
    const mod = MODULES.find(m => m.id === id);
    if (mod) toast(`Module complete — ${mod.label}`, { icon: '✅' });
    const real = [...done].filter(x => MODULES.some(m => m.id === x)).length;
    if (real === MODULES.length) toast('All 13 modules complete!', { icon: '🏆', duration: 4200 });
  }
}

// ── Router ─────────────────────────────────────────────────────────────────
function getHash() {
  const h = location.hash.slice(1);
  if (h === 'study') return 'study';
  return MODULES.find(m => m.id === h) ? h : MODULES[0].id;
}

window.addEventListener('hashchange', () => navigate(getHash()));

document.getElementById('nav-list').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-id]');
  if (item) {
    e.preventDefault();
    location.hash = item.dataset.id;
  }
});

// ── Sidebar toggle ─────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── Theme toggle ───────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('databricks-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('databricks-theme', next);
});

// ── Tooltip ────────────────────────────────────────────────────────────────
export const tooltip = {
  el: document.getElementById('tooltip'),
  show(text, x, y) {
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    const tw = this.el.offsetWidth, th = this.el.offsetHeight;
    this.el.style.left = Math.min(x + 12, window.innerWidth - tw - 8) + 'px';
    this.el.style.top  = Math.min(y + 12, window.innerHeight - th - 8) + 'px';
  },
  hide() { this.el.classList.add('hidden'); }
};

// ── Mobile navigation drawer ───────────────────────────────────────────────
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');
  const openNav = () => document.body.classList.add('nav-open');
  const closeNav = () => document.body.classList.remove('nav-open');
  document.getElementById('nav-open')?.addEventListener('click', openNav);
  document.getElementById('nav-backdrop')?.addEventListener('click', closeNav);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => { if (mq.matches) closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  document.getElementById('nav-list')?.addEventListener('click', e => {
    if (mq.matches && e.target.closest('.nav-item')) closeNav();
  });
  mq.addEventListener('change', ev => { if (!ev.matches) closeNav(); });
})();

// ── Swipe between modules (touch) ───────────────────────────────────────────
(() => {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return;
  let x0 = null, y0 = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.closest('table, .compare-table, pre, .code-block, .quiz-opts, .canvas-wrap, [data-no-swipe]')) return;
    const idx = MODULES.findIndex(m => m.id === currentId);
    if (idx === -1) return;
    if (dx < 0 && idx < MODULES.length - 1) window.location.hash = MODULES[idx + 1].id;
    else if (dx > 0 && idx > 0) window.location.hash = MODULES[idx - 1].id;
  }, { passive: true });
})();

// ── Boot ───────────────────────────────────────────────────────────────────
renderNav(null, done);
updateProgress(done);
navigate(getHash());
initCommandPalette();
setTimeout(() => maybeRunTour(), 1000);
