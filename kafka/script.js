import { MODULES, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ } from './components/module-shell.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { createSelfExplain, initSelfExplain } from './components/self-explain.js';
import { QUIZ_BANK } from './data/quiz-bank.js';
import { SELF_EXPLAIN } from './data/self-explain.js';

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('kafka-done') || '[]'));
let currentId = null;
let cleanupFn = null;

// ── Module loaders ─────────────────────────────────────────────────────────
const LOADERS = {
  study: () => import('./modules/study.js'),
  m01: () => import('./modules/m01-intro.js'),
  m02: () => import('./modules/m02-messaging.js'),
  m03: () => import('./modules/m03-architecture.js'),
  m04: () => import('./modules/m04-producer.js'),
  m05: () => import('./modules/m05-broker.js'),
  m06: () => import('./modules/m06-partitions.js'),
  m07: () => import('./modules/m07-replication.js'),
  m08: () => import('./modules/m08-consumer-groups.js'),
  m09: () => import('./modules/m09-offsets.js'),
  m10: () => import('./modules/m10-retention.js'),
  m11: () => import('./modules/m11-delivery.js'),
  m12: () => import('./modules/m12-connect.js'),
  m13: () => import('./modules/m13-streams.js'),
  m14: () => import('./modules/m14-schema-registry.js'),
  m15: () => import('./modules/m15-security.js'),
  m16: () => import('./modules/m16-monitoring.js'),
  m17: () => import('./modules/m17-performance.js'),
  m18: () => import('./modules/m18-failure.js'),
  m19: () => import('./modules/m19-amazon-pipeline.js'),
  m20: () => import('./modules/m20-competitors.js'),
  m21: () => import('./modules/m21-mirrormaker.js'),
  m22: () => import('./modules/m22-partition-reassignment.js'),
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
  localStorage.setItem('kafka-done', JSON.stringify([...done]));
  updateProgress(done);
  renderNav(currentId, done);
  if (isNew) {
    const mod = MODULES.find(m => m.id === id);
    if (mod) toast(`Module complete — ${mod.label}`, { icon: '✅' });
    const real = [...done].filter(x => MODULES.some(m => m.id === x)).length;
    if (real === MODULES.length) toast('All 22 modules complete!', { icon: '🏆', duration: 4200 });
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
const savedTheme = localStorage.getItem('kafka-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('kafka-theme', next);
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
