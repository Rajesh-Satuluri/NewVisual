import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';
import { initCommandPalette } from './components/command-palette.js';
import { initKeyboard } from './components/keyboard.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { createSelfExplain, initSelfExplain } from './components/self-explain.js';
import { QUIZ_BANK } from './data/quiz-bank.js';
import { SELF_EXPLAIN } from './data/self-explain.js';
import { record } from './data/progress-store.js';
import { initCloudSync } from './components/cloudsync.js';
import { initCloudSyncUI } from './components/cloudsync-ui.js';

// A module counts as "complete" only when its quiz is passed at this ratio —
// mastery, not merely opening the page. Honest progress.
const QUIZ_PASS_RATIO = 2 / 3;

// Non-module pages (not tracked in progress). Value = breadcrumb HTML.
const PAGES = {
  home: `<strong>🏠 Home</strong>`,
  playground: `Playground &rsaquo; <strong>🎮 Solver Playground</strong>`,
  'sim-lab': `Playground &rsaquo; <strong>🧪 Scenario Lab</strong>`,
  'master-map': `Reference &rsaquo; <strong>🗺️ Master Map</strong>`,
  glossary: `Reference &rsaquo; <strong>📖 Glossary</strong>`,
  'config-reference': `Reference &rsaquo; <strong>⚙️ Config Reference</strong>`,
  cheatsheet: `Reference &rsaquo; <strong>📋 Cheat Sheet</strong>`,
  'mock-interview': `Practice &rsaquo; <strong>🎤 Mock Interview</strong>`,
  decisions: `Practice &rsaquo; <strong>🧭 Decision Drills</strong>`,
  'rca-clinic': `Practice &rsaquo; <strong>🚑 RCA Clinic</strong>`,
  interview: `Practice &rsaquo; <strong>🎯 Interview Q&amp;A</strong>`,
  dashboard: `Review &rsaquo; <strong>📊 Dashboard</strong>`,
  review: `Review &rsaquo; <strong>🔁 Review Center</strong>`,
  study: `Review &rsaquo; <strong>📚 Study Hub</strong>`,
};

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('o9scs-done') || '[]'));
let currentId = null;
let cleanupFn = null;

// ── Module loaders ─────────────────────────────────────────────────────────
// Only built screens have a loader; everything else in MODULES/PAGES renders
// the "Coming Soon" placeholder (the curriculum is visible, nothing is broken).
const LOADERS = {
  home: () => import('./modules/home.js'),
  glossary: () => import('./modules/glossary.js'),
  'sc-basics': () => import('./modules/sc-basics.js'),
  'what-is-solver': () => import('./modules/what-is-solver.js'),
  'obo-heuristic': () => import('./modules/obo-heuristic.js'),
  'demand-sorting': () => import('./modules/demand-sorting.js'),
  'three-phases': () => import('./modules/three-phases.js'),
  'network-types': () => import('./modules/network-types.js'),
  'nodes-graphs': () => import('./modules/nodes-graphs.js'),
  'planning-horizon': () => import('./modules/planning-horizon.js'),
};

function comingSoon(mod, id) {
  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = `
    <div class="coming-soon">
      <div class="coming-soon-icon">🚧</div>
      <h3>Coming Soon</h3>
      <p>${mod ? mod.desc : 'This screen is on the build roadmap. The platform shell, navigation, progress and design system are live.'}</p>
      <p style="margin-top:14px"><a class="nav-item" style="display:inline-flex" href="#home">← Back to Home</a></p>
    </div>`;
}

// ── Navigate ───────────────────────────────────────────────────────────────
async function navigate(id) {
  let mod = MODULES.find(m => m.id === id);
  if (!mod && !PAGES[id]) { id = 'home'; }

  if (currentId === id) return;
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }

  currentId = id;
  renderNav(id, done);

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = PAGES[id] || (mod ? `${mod.group} &rsaquo; <strong>${mod.label}</strong>` : '');
  }

  const canvas = document.getElementById('module-canvas');
  canvas.scrollTop = 0;

  const loader = LOADERS[id];
  if (!loader) { comingSoon(mod, id); return; }

  canvas.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><h3>Loading…</h3></div>';
  try {
    const m = await loader();
    canvas.innerHTML = '';
    cleanupFn = m.mount(canvas) || null;
    initTabs(canvas); initIQ(canvas);
    if (mod) {
      enhanceModule(id);
      canvas.querySelectorAll('canvas:not([aria-label])').forEach(c => {
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', `${mod.label} — interactive visualization. The explanation and tables on this page describe it in text.`);
      });
      try { record('visited', id, { label: mod.label }); } catch (e) {}
    }
  } catch (e) {
    console.error('Module load error', e);
    comingSoon(mod, id);
  }
}

// Inject the self-explain + quiz sections (if banks exist) and the Prev/Next pager.
function enhanceModule(id) {
  const canvas = document.getElementById('module-canvas');
  const page = canvas.querySelector('.module-page');
  if (page && SELF_EXPLAIN[id]) {
    const holder = document.createElement('div');
    holder.innerHTML = createSelfExplain(id, SELF_EXPLAIN[id]);
    if (holder.firstElementChild) { page.appendChild(holder.firstElementChild); initSelfExplain(page); }
  }
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
  localStorage.setItem('o9scs-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
  if (isNew) {
    const mod = MODULES.find(m => m.id === id);
    if (mod) toast(`Module mastered — ${mod.label}`, { icon: '✅' });
    const real = [...done].filter(x => MODULES.some(m => m.id === x)).length;
    if (real === MODULES.length) toast(`All ${MODULES.length} modules mastered!`, { icon: '🏆', duration: 4200 });
  }
}

// Honest progress: a module is "complete" when its quiz is passed. The quiz
// component dispatches 'o9scs:quiz-graded' with { id, score, total, best }.
window.addEventListener('o9scs:quiz-graded', e => {
  const { id, score, total, best } = e.detail || {};
  if (!id || !total) return;
  const bestScore = Number.isFinite(best) ? best : score;
  const passed = bestScore / total >= QUIZ_PASS_RATIO;
  try { record('quiz', id, { score, total, best: bestScore, passed }); } catch (err) {}
  if (passed && MODULES.some(m => m.id === id)) markDone(id);
});

// ── Router ─────────────────────────────────────────────────────────────────
function getHash() {
  const h = location.hash.slice(1).split('?')[0];
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

// ── Sidebar toggle ─────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── Theme toggle ───────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('o9scs-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('o9scs-theme', next);
});

// ── Cloud sync (optional; inert until configured) ────────────────────────────
initCloudSyncUI();
initCloudSync();

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
  const closeNav = () => document.body.classList.remove('nav-open');
  document.getElementById('nav-open')?.addEventListener('click', () => document.body.classList.add('nav-open'));
  document.getElementById('nav-backdrop')?.addEventListener('click', closeNav);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => { if (mq.matches) closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  document.getElementById('nav-list')?.addEventListener('click', e => { if (mq.matches && e.target.closest('.nav-item')) closeNav(); });
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
initKeyboard();
setTimeout(() => maybeRunTour(), 1000);
