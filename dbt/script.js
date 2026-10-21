import { MODULES, EXTRAS, getNavItem, renderNav, updateProgress } from './components/nav.js';
import { initTabs, initIQ, injectCodeEnhancements } from './components/module-shell.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { QUIZ_BANK } from './data/quiz-bank.js';
import { MODULE_FILES } from './data/loader-map.js';

const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));
let currentId = null;
let cleanupFn = null;
let completeCleanup = null;

// Derived from the shared loader map (data/loader-map.js) so routes can never
// drift between the router and the Build Health harness.
const LOADERS = Object.fromEntries(
  Object.entries(MODULE_FILES).map(([id, file]) => [id, () => import(`./modules/${file}`)])
);

async function navigate(id) {
  if (!LOADERS[id]) id = 'home';
  if (currentId === id) return;
  if (cleanupFn) { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
  if (completeCleanup) { try { completeCleanup(); } catch (e) {} completeCleanup = null; }
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

    // Announce the route change to assistive tech and move focus to the new
    // heading, so keyboard/screen-reader users land on the fresh content
    // instead of having focus silently dropped to <body>.
    const heading = canvas.querySelector('.module-title, .home-title, h1, h2');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    const announce = document.getElementById('route-announce');
    if (announce && nav) announce.textContent = `Loaded: ${nav.title}`;

    // Completion is earned, not timed: passing the module quiz (strongest
    // signal), or reading to the end / dwelling on a short page. No passive
    // "open it for 25 seconds = done".
    if (isModule && !done.has(id)) {
      completeCleanup = setupCompletion(id, canvas);
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

// Earn completion through engagement, not a stopwatch. Returns a teardown fn
// the router calls when navigating away.
function setupCompletion(id, canvas) {
  let settled = false;
  const complete = () => {
    if (settled || currentId !== id || done.has(id)) return;
    settled = true;
    markDone(id);
    const mod = MODULES.find(mm => mm.id === id);
    if (mod) toast(`Module complete — ${mod.title}`, { icon: '✅' });
    if ([...done].filter(x => MODULES.some(mm => mm.id === x)).length === MODULES.length) {
      toast(`All ${MODULES.length} modules complete! 🏆`, { icon: '🏆', duration: 4200 });
    }
    teardown();
  };

  // 1) Passing the module's quiz is the strongest learning signal.
  const onQuizPass = e => { if (e.detail && e.detail.id === id) complete(); };
  document.addEventListener('dbt-quiz-passed', onQuizPass);

  // 2) Reading to the bottom (after a minimum dwell, so skimming doesn't count).
  const start = Date.now();
  const MIN_READ_MS = 12000;
  const onScroll = () => {
    if (Date.now() - start < MIN_READ_MS) return;
    if (canvas.scrollTop + canvas.clientHeight >= canvas.scrollHeight - 160) complete();
  };
  canvas.addEventListener('scroll', onScroll, { passive: true });

  // 3) Short pages that never scroll: dwelling on them counts as reading.
  const shortTimer = setTimeout(() => {
    if (canvas.scrollHeight <= canvas.clientHeight + 160) complete();
  }, 20000);

  function teardown() {
    document.removeEventListener('dbt-quiz-passed', onQuizPass);
    canvas.removeEventListener('scroll', onScroll);
    clearTimeout(shortTimer);
  }
  return teardown;
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
const themeIcon = document.getElementById('theme-icon');
const root = document.documentElement;
const SUN = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
const MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
function applyThemeUI(theme) {
  // Show the icon for the action the button performs: a moon while light
  // (click → go dark), a sun while dark (click → go light).
  if (themeIcon) themeIcon.innerHTML = theme === 'dark' ? SUN : MOON;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  themeToggle.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
const savedTheme = localStorage.getItem('dbt-theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
applyThemeUI(savedTheme);
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('dbt-theme', next);
  applyThemeUI(next);
});

// Skip-link: focus the content without touching the hash (which would re-route).
document.querySelector('.skip-link')?.addEventListener('click', e => {
  e.preventDefault();
  const c = document.getElementById('module-canvas');
  if (c) { c.setAttribute('tabindex', '-1'); c.focus(); }
});

renderNav(null, done);
updateProgress(done);
const palette = initCommandPalette();

// Visible triggers for touch users (the ⌘/Ctrl-K palette and the tour are
// otherwise keyboard-only / first-run-only).
document.getElementById('search-btn')?.addEventListener('click', () => palette.open());
document.getElementById('help-btn')?.addEventListener('click', () => {
  try { maybeRunTour({ force: true }); } catch (e) {}
});

navigate(getHash()).then(() => { try { maybeRunTour(); } catch (e) {} });
