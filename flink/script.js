import { MODULES, EXTRAS, getNavItem, renderNav, updateProgress } from './components/nav.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderPager } from './components/pager.js';
import { toast } from './components/toast.js';
import { maybeRunTour } from './components/tour.js';
import { createQuiz, initQuiz } from './components/quiz.js';
import { QUIZ_BANK } from './data/quiz-bank.js';
import { markVisited } from './data/progress-store.js';
import { createSelfExplain, initSelfExplain, createDecisionDrill, initDecisionDrill } from './components/practice.js';
import { SELF_EXPLAIN } from './data/self-explain.js';
import { DECISIONS } from './data/decisions.js';
import { highlightCodeBlocks } from './components/highlight.js';

// ── Module loaders (lazy) ─────────────────────────────────────────────────
// Cache-busting build tag: appended to every lazily-imported module URL so a
// fresh deploy is fetched immediately instead of served from the browser/CDN
// cache (a hard-reload does not reliably re-fetch dynamic import() subresources).
// Bump this on each deploy that changes module code.
const BUILD = '20261022e';
const imp = (p) => import(`${p}?v=${BUILD}`);
const LOADERS = {
  home:  () => imp('./modules/home.js'),
  'learning-path': () => imp('./modules/learning-path.js'),
  m01: () => imp('./modules/m01-intro.js'),
  m02: () => imp('./modules/m02-streaming-fundamentals.js'),
  m03: () => imp('./modules/m03-architecture.js'),
  m04: () => imp('./modules/m04-job-lifecycle.js'),
  m05: () => imp('./modules/m05-parallelism.js'),
  m06: () => imp('./modules/m06-data-flow.js'),
  m07: () => imp('./modules/m07-operators.js'),
  m08: () => imp('./modules/m08-time-concepts.js'),
  m09: () => imp('./modules/m09-watermarks.js'),
  m10: () => imp('./modules/m10-windows.js'),
  m11: () => imp('./modules/m11-state-management.js'),
  m12: () => imp('./modules/m12-checkpointing.js'),
  m13: () => imp('./modules/m13-savepoints.js'),
  m13b: () => imp('./modules/m13b-savepoints.js'),
  m14: () => imp('./modules/m14-fault-tolerance.js'),
  m15: () => imp('./modules/m15-backpressure.js'),
  m16: () => imp('./modules/m16-connectors.js'),
  m17: () => imp('./modules/m17-flink-sql.js'),
  m18: () => imp('./modules/m18-performance.js'),
  m19: () => imp('./modules/m19-uber-pipeline.js'),
  // Reference & review
  'master-map': () => imp('./modules/master-map.js'),
  comparison:   () => imp('./modules/comparison.js'),
  glossary:     () => imp('./modules/glossary.js'),
  cheatsheet:   () => imp('./modules/cheatsheet.js'),
  'config-reference': () => imp('./modules/config-reference.js'),
  advanced:     () => imp('./modules/advanced.js'),
  sizing:       () => imp('./modules/sizing.js'),
  search:       () => imp('./modules/search.js'),
  dashboard:    () => imp('./modules/dashboard.js'),
  review:       () => imp('./modules/review.js'),
  'rescale-lab': () => imp('./modules/rescale-lab.js'),
  'watermark-lab': () => imp('./modules/watermark-lab.js'),
  study:        () => imp('./modules/study.js'),
};

// ── State ─────────────────────────────────────────────────────────────────
const done = new Set(JSON.parse(localStorage.getItem('flink_done') || '[]'));
let activeId = null;
let activeCleanup = null;

// ── Router ────────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!LOADERS[id]) { renderWelcome(); return; }
  if (id === activeId) return;

  if (activeCleanup) { try { activeCleanup(); } catch(e) {} }
  activeCleanup = null;
  activeId = id;

  const canvas = document.getElementById('module-canvas');
  canvas.innerHTML = '<div class="welcome-screen"><div class="welcome-logo" style="font-size:48px;animation:glow-pulse 2s infinite">⚡</div></div>';

  const mod = MODULES.find(m => m.id === id); // numbered module only (progress + pager)
  updateBreadcrumb(getNavItem(id));
  renderNav(id, done);

  try {
    const module = await LOADERS[id]();
    if (activeId !== id) return;
    canvas.innerHTML = '';
    activeCleanup = module.mount(canvas) || null;

    // Auto-inject the "Test Yourself" quiz (where a bank exists) + Prev/Next pager.
    enhanceModule(id);
    // Syntax-highlight every code block (incl. the just-injected practice ones)
    // before the copy buttons attach — copy reads innerText, so spans are safe.
    highlightCodeBlocks(canvas);
    injectCopyButtons(canvas);

    // Honest progress: opening a module records a "visit" only. Mastery is
    // earned by passing the module quiz (see the flink:quiz-graded listener).
    if (mod) markVisited(id);
    updateProgress(done);
  } catch(err) {
    console.error('Module load error:', err);
    canvas.innerHTML = `<div class="welcome-screen" role="alert">
      <div style="font-size:48px">⚠️</div>
      <div class="welcome-title" style="font-size:28px;margin-top:16px">Couldn't load this section</div>
      <p class="welcome-sub">Something went wrong loading this page. Check your connection and try again — a hard refresh usually fixes a stale cache.</p>
      <div class="welcome-actions"><button class="btn btn-primary" onclick="location.reload()">Reload</button></div>
    </div>`;
  }
}

// Inject the quiz section (if a bank exists for this module) and the pager.
function enhanceModule(id) {
  const canvas = document.getElementById('module-canvas');
  const page = canvas.querySelector('.module-page');
  if (page) {
    const appendHTML = (html) => {
      if (!html) return false;
      const holder = document.createElement('div');
      holder.innerHTML = html;
      if (holder.firstElementChild) { page.appendChild(holder.firstElementChild); return true; }
      return false;
    };
    if (QUIZ_BANK[id] && appendHTML(createQuiz(id, QUIZ_BANK[id]))) initQuiz(page);
    if (SELF_EXPLAIN[id] && appendHTML(createSelfExplain(id, SELF_EXPLAIN[id]))) initSelfExplain(page);
    if (DECISIONS[id] && appendHTML(createDecisionDrill(id, DECISIONS[id]))) initDecisionDrill(page);
  }
  renderPager(id);
}

// Add a copy button to every code block in the mounted module (non-invasive:
// modules keep authoring plain .code-block markup).
function injectCopyButtons(root) {
  root.querySelectorAll('.code-block').forEach(block => {
    if (block.querySelector('.code-copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      const src = block.querySelector('pre, code') || block;
      const text = src.innerText.replace(/\bCopy\b\s*$/, '').trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const r = document.createRange(); r.selectNodeContents(src);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand('copy'); } catch (_) {}
        sel.removeAllRanges();
      }
      btn.textContent = 'Copied ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
    });
    block.appendChild(btn);
  });
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

function renderWelcome() {
  if (activeCleanup) { try { activeCleanup(); } catch(e) {} activeCleanup = null; }
  activeId = null;
  updateBreadcrumb(null);
  renderNav(null, done);
  document.getElementById('module-canvas').innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-logo">⚡</div>
      <h1 class="welcome-title">Apache Flink Visualizer</h1>
      <p class="welcome-sub">
        An interactive learning platform for Apache Flink, built around Uber's
        real-time data engineering platform. Go from zero to interview-ready.
      </p>
      <div class="welcome-meta">
        <span class="badge badge-orange">20 Modules</span>
        <span class="badge badge-blue">Fully Interactive</span>
        <span class="badge badge-green">Uber Examples</span>
        <span class="badge badge-purple">Interview Ready</span>
      </div>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="start-btn">
          Start Learning <span>→</span>
        </button>
      </div>
    </div>
  `;
  document.getElementById('start-btn')?.addEventListener('click', () => {
    window.location.hash = 'm01';
  });
  updateProgress(done);
}

// ── Hash routing ─────────────────────────────────────────────────────────
function onHashChange() {
  const raw = window.location.hash.slice(1) || 'home';
  const id = raw.split('?')[0]; // strip query (e.g. search?q=…)
  navigate(LOADERS[id] ? id : 'home');
}

// ── Skip link (hash-router-safe: focus main without changing the route) ─────
document.getElementById('skip-link')?.addEventListener('click', e => {
  e.preventDefault();
  const c = document.getElementById('module-canvas');
  if (c) { c.setAttribute('tabindex', '-1'); c.focus(); }
});

// ── Sidebar toggle ────────────────────────────────────────────────────────
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
});

// ── Brand → Home ────────────────────────────────────────────────────────────
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

// ── Theme toggle ──────────────────────────────────────────────────────────
const storedTheme = localStorage.getItem('flink_theme') || 'dark';
document.documentElement.setAttribute('data-theme', storedTheme);

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('flink_theme', next);
});

// ── Tooltip ───────────────────────────────────────────────────────────────
const ttEl = document.getElementById('tooltip');
document.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tip]');
  if (target && ttEl) {
    ttEl.textContent = target.dataset.tip;
    ttEl.classList.remove('hidden');
  }
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

// ── Keyboard nav ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!activeId) return;
  const idx = MODULES.findIndex(m => m.id === activeId);
  if (idx === -1) return; // not a numbered module (home / reference pages)
  if (e.key === 'ArrowRight' && idx < MODULES.length - 1) window.location.hash = MODULES[idx+1].id;
  if (e.key === 'ArrowLeft'  && idx > 0)                  window.location.hash = MODULES[idx-1].id;
});

// ── Mobile navigation drawer ───────────────────────────────────────────────
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');
  const openNav  = () => document.body.classList.add('nav-open');
  const closeNav = () => document.body.classList.remove('nav-open');

  document.getElementById('nav-open')?.addEventListener('click', openNav);
  document.getElementById('nav-backdrop')?.addEventListener('click', closeNav);

  // On mobile, the in-drawer hamburger closes the drawer instead of collapsing it.
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    if (mq.matches) closeNav();
  });

  // Close on Escape.
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  // Auto-close after choosing a module on mobile.
  document.getElementById('nav-list')?.addEventListener('click', e => {
    if (mq.matches && e.target.closest('.nav-item')) closeNav();
  });

  // If the viewport grows back to desktop, make sure the drawer state is cleared.
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
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // not a horizontal swipe
    // Don't hijack swipes that belong to horizontally-scrollable children.
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.closest('table, .timeline-wrap, .compare-table, pre, .code-block, .quiz-opts, [data-no-swipe]')) return;
    const idx = MODULES.findIndex(m => m.id === activeId);
    if (idx === -1) return;
    if (dx < 0 && idx < MODULES.length - 1) window.location.hash = MODULES[idx + 1].id;
    else if (dx > 0 && idx > 0) window.location.hash = MODULES[idx - 1].id;
  }, { passive: true });
})();

// ── Honest progress: master a module when its quiz is passed ────────────────
window.addEventListener('flink:quiz-graded', e => {
  const { id, passed } = e.detail || {};
  if (!passed || !id) return;
  const mod = MODULES.find(m => m.id === id);
  if (!mod || done.has(id)) return;
  done.add(id);
  try { localStorage.setItem('flink_done', JSON.stringify([...done])); } catch (_) {}
  renderNav(activeId, done);
  updateProgress(done);
  toast(`Module mastered — ${mod.title}`, { icon: '🎓' });
  if (done.size === MODULES.length) toast(`All ${MODULES.length} modules mastered!`, { icon: '🏆', duration: 4200 });
});

// ── Boot ──────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', onHashChange);
renderNav(null, done);
onHashChange();
initCommandPalette();
setTimeout(() => maybeRunTour(), 1000);
