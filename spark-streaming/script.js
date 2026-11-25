import { MODULES, EXTRAS, getNavItem, renderNav, updateProgress } from './components/nav.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';

// ── Module loaders (lazy) ──────────────────────────────────────────────────
// Cache-busting build tag: appended to every lazily-imported module URL so a
// fresh deploy is fetched immediately. Bump on each deploy that changes code.
const BUILD = '20261125h';
const imp = (p) => import(`${p}?v=${BUILD}`);

// SCAFFOLD: home has a real page; every other route renders the shared
// placeholder (reads its own id from the hash). As modules are built, point
// their id at a dedicated file, e.g. m01: () => imp('./modules/m01-intro.js').
const placeholder = () => imp('./modules/placeholder.js');
const LOADERS = { home: () => imp('./modules/home.js') };
[...MODULES, ...EXTRAS].forEach(m => { LOADERS[m.id] = placeholder; });
// Built modules (point their id at a dedicated file, off the shared placeholder):
LOADERS['output-mode-lab'] = () => imp('./modules/output-mode-lab.js'); // L1
LOADERS['microbatch-lab'] = () => imp('./modules/microbatch-lab.js');   // L2
LOADERS['m01'] = () => imp('./modules/m01-intro.js');                   // M01
LOADERS['m02'] = () => imp('./modules/m02-unbounded-table.js');         // M02
LOADERS['m03'] = () => imp('./modules/m03-architecture.js');            // M03
LOADERS['m04'] = () => imp('./modules/m04-sources-schema.js');          // M04
LOADERS['m05'] = () => imp('./modules/m05-microbatch-triggers.js');     // M05
LOADERS['m06'] = () => imp('./modules/m06-continuous.js');              // M06
LOADERS['m07'] = () => imp('./modules/m07-event-vs-processing.js');     // M07
LOADERS['m08'] = () => imp('./modules/m08-watermarks.js');              // M08
LOADERS['m09'] = () => imp('./modules/m09-windows.js');                 // M09
LOADERS['m10'] = () => imp('./modules/m10-stateful-aggregations.js');   // M10
LOADERS['m12'] = () => imp('./modules/m12-output-modes.js');            // M12
LOADERS['m13'] = () => imp('./modules/m13-deduplication.js');           // M13
LOADERS['m15'] = () => imp('./modules/m15-checkpoint.js');              // M15
LOADERS['m16'] = () => imp('./modules/m16-fault-tolerance.js');         // M16

// ── State ──────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('spark_done') || '[]'));
let activeId = null;
let activeCleanup = null;

// ── Router ─────────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!LOADERS[id]) { navigate('home'); return; }
  if (id === activeId) return;

  if (activeCleanup) { try { activeCleanup(); } catch (e) {} }
  activeCleanup = null;
  activeId = id;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="welcome-screen"><div class="welcome-logo" style="font-size:48px;animation:glow-pulse 2s infinite">🔥</div></div>';

  const mod = MODULES.find(m => m.id === id);
  updateBreadcrumb(getNavItem(id));
  renderNav(id, done);

  try {
    const module = await LOADERS[id]();
    if (activeId !== id) return;
    canvas.innerHTML = '';
    activeCleanup = module.mount(canvas) || null;
    if (mod) renderPager(id);
    updateProgress(done);
  } catch (err) {
    console.error('Module load error:', err);
    canvas.innerHTML = `<div class="welcome-screen" role="alert">
      <div style="font-size:48px">⚠️</div>
      <div class="welcome-title" style="font-size:28px;margin-top:16px">Couldn't load this section</div>
      <p class="welcome-sub">Something went wrong. Check your connection and try again — a hard refresh usually fixes a stale cache.</p>
      <div class="welcome-actions"><button class="btn btn-primary" onclick="location.reload()">Reload</button></div>
    </div>`;
  }
}

function updateBreadcrumb(mod) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (!mod) { bc.innerHTML = ''; return; }
  bc.innerHTML = `
    <span class="breadcrumb-group">${mod.group}</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-title">${mod.icon} ${mod.title}</span>
  `;
}

// ── Hash routing ────────────────────────────────────────────────────────────
function onHashChange() {
  const raw = window.location.hash.slice(1) || 'home';
  const id = raw.split('?')[0];
  navigate(LOADERS[id] ? id : 'home');
}

// ── Skip link ──────────────────────────────────────────────────────────────
document.getElementById('skip-link')?.addEventListener('click', e => {
  e.preventDefault();
  const c = document.getElementById('module-canvas');
  if (c) { c.setAttribute('tabindex', '-1'); c.focus(); }
});

// ── Sidebar toggle ──────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
});

// ── Brand → Home ───────────────────────────────────────────────────────────
const brandEl = document.querySelector('.brand');
if (brandEl) {
  brandEl.style.cursor = 'pointer';
  brandEl.setAttribute('role', 'button');
  brandEl.setAttribute('tabindex', '0');
  brandEl.setAttribute('title', 'Home');
  brandEl.addEventListener('click', () => { window.location.hash = 'home'; });
  brandEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = 'home'; }
  });
}

// ── Theme toggle ────────────────────────────────────────────────────────────
const storedTheme = localStorage.getItem('spark_theme') || 'dark';
document.documentElement.setAttribute('data-theme', storedTheme);
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('spark_theme', next);
});

// ── Tooltip ─────────────────────────────────────────────────────────────────
const ttEl = document.getElementById('tooltip');
document.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tip]');
  if (target && ttEl) { ttEl.textContent = target.dataset.tip; ttEl.classList.remove('hidden'); }
});
document.addEventListener('mousemove', e => {
  if (ttEl && !ttEl.classList.contains('hidden')) {
    ttEl.style.left = (e.clientX + 14) + 'px';
    ttEl.style.top  = (e.clientY - 6)  + 'px';
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]') && ttEl) ttEl.classList.add('hidden');
});

// ── Keyboard nav (numbered modules only) ─────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!activeId) return;
  const idx = MODULES.findIndex(m => m.id === activeId);
  if (idx === -1) return;
  if (e.key === 'ArrowRight' && idx < MODULES.length - 1) window.location.hash = MODULES[idx + 1].id;
  if (e.key === 'ArrowLeft'  && idx > 0)                  window.location.hash = MODULES[idx - 1].id;
});

// ── Mobile navigation drawer ─────────────────────────────────────────────────
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');
  const openNav  = () => document.body.classList.add('nav-open');
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

// ── Swipe between modules (touch) ────────────────────────────────────────────
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
    if (el && el.closest('table, .timeline-wrap, .compare-table, pre, .code-block, .quiz-opts, [data-no-swipe]')) return;
    const idx = MODULES.findIndex(m => m.id === activeId);
    if (idx === -1) return;
    if (dx < 0 && idx < MODULES.length - 1) window.location.hash = MODULES[idx + 1].id;
    else if (dx > 0 && idx > 0) window.location.hash = MODULES[idx - 1].id;
  }, { passive: true });
})();

// ── Boot ───────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', onHashChange);
renderNav(null, done);
onHashChange();
initCommandPalette();
setTimeout(() => maybeRunTour(), 1000);
