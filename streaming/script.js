// Streaming Engineering Master Lab — app bootstrap & hash router (I06)
import { SECTIONS, byId, PRIMARY_IDS } from './data/registry.js';
import { renderNav, setActive, updateProgress } from './components/nav.js';
import { initScenarioSwitcher } from './components/scenario-switcher.js';
import { markVisited } from './data/progress-store.js';

const BUILD = '20261011a'; // cache-buster — bump on each deploy
const imp = (p) => import(`${p}?v=${BUILD}`);

// Lazy loaders. 'home' has its own module; every other section uses the generic
// section renderer until its gate ships a dedicated module.
const LOADERS = {
  home: () => imp('./modules/home.js'),
  __section: () => imp('./modules/section.js'),
};

let cleanupFn = null;

async function route() {
  const id = (location.hash.replace(/^#/, '') || 'home');
  const section = byId(id) || byId('home');
  const resolvedId = section.id;

  // cleanup previous view
  if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }

  const canvas = document.getElementById('module-canvas');
  const crumb = document.getElementById('breadcrumb');
  if (crumb) crumb.innerHTML = section.breadcrumb || `<strong>${section.title}</strong>`;

  setActive(resolvedId);
  markVisited(resolvedId);
  updateProgress();
  closeMobileNav();
  window.scrollTo(0, 0);

  try {
    let mod;
    if (resolvedId === 'home') {
      mod = await LOADERS.home();
      cleanupFn = mod.mount(canvas) || null;
    } else {
      mod = await LOADERS.__section();
      cleanupFn = mod.mount(canvas, resolvedId) || null;
    }
  } catch (err) {
    canvas.innerHTML = `<div class="card"><h3>Could not load this section</h3>
      <p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`;
    console.error(err);
  }
}

// ── Theme ────────────────────────────────────────────────────
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sml-theme', next); } catch (e) {}
  });
}

// ── Mobile nav ───────────────────────────────────────────────
function closeMobileNav() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('nav-scrim')?.classList.remove('show');
}
function initMobileNav() {
  const open = document.getElementById('nav-open');
  const scrim = document.getElementById('nav-scrim');
  const sidebar = document.getElementById('sidebar');
  open?.addEventListener('click', () => { sidebar?.classList.add('open'); scrim?.classList.add('show'); });
  scrim?.addEventListener('click', closeMobileNav);
}

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  const badge = document.getElementById('build-badge');
  if (badge) badge.textContent = `build ${BUILD}`;
  renderNav((location.hash.replace(/^#/, '') || 'home'));
  initTheme();
  initMobileNav();
  initScenarioSwitcher(() => route()); // re-render current view on scenario change
  window.addEventListener('hashchange', route);
  route();
}

boot();
