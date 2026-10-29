import { renderNav } from './components/nav.js';
import { mount as mountQuestion } from './components/question-renderer.js';
import { mount as mountConcept } from './components/concept-renderer.js';
import { mount as mountHome } from './components/home.js';
import { mount as mountGlossary } from './components/glossary.js';
import { mount as mountCheatsheet } from './components/cheatsheet.js';
import { mount as mountDashboard } from './components/dashboard.js';
import { mount as mountDecisions } from './components/decisions.js';
import { mount as mountTiered } from './components/tiered.js';
import { createCommandPalette } from './components/command-palette.js';
import { toast } from './components/toast.js';
import {
  QUESTIONS, LOADERS, CATEGORY_LABEL,
} from './content/index.js';
import {
  CONCEPTS, CONCEPT_LOADERS, CONCEPT_PREFIX, conceptMeta, builtConceptCount,
} from './content/concepts.js';

// ── Persistence ────────────────────────────────────────────────────────────
const DONE_KEY = 'system-design-done';
const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));
function saveDone() {
  localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
}

// ── UI references ──────────────────────────────────────────────────────────
const root            = document.getElementById('module-root');
const sidebar         = document.getElementById('sidebar');
const themeBtn        = document.getElementById('theme-btn');
const sidebarToggle   = document.getElementById('sidebar-toggle');
const sidebarClose    = document.getElementById('sidebar-close');
const markDoneBtn     = document.getElementById('mark-done');
const progressFill    = document.getElementById('progress-fill');
const progressText    = document.getElementById('progress-text');
const breadcrumbGroup = document.getElementById('breadcrumb-group');
const breadcrumbTitle = document.getElementById('breadcrumb-title');

let currentCleanup = null;
let currentId = null;     // full hash value (e.g. "c:rate-limiter" or a question id)

const TOTAL = QUESTIONS.length + builtConceptCount();

// ── Static reference/practice pages ──────────────────────────────────────────
const PAGE_PREFIX = 'p:';
const PAGES = {
  glossary:   { title: 'Glossary',          group: 'Reference', icon: '📖', mount: mountDashboardProxy(mountGlossary) },
  cheatsheet: { title: 'Cheat sheet',        group: 'Reference', icon: '📋', mount: mountDashboardProxy(mountCheatsheet) },
  dashboard:  { title: 'Dashboard',          group: 'Reference', icon: '📊', mount: (el) => mountDashboard(el, { done }) },
  decisions:  { title: 'Choose the approach', group: 'Practice',  icon: '🧭', mount: mountDashboardProxy(mountDecisions) },
  answers:    { title: 'Level up your answer', group: 'Practice', icon: '🎯', mount: mountDashboardProxy(mountTiered) },
};
// glossary/cheatsheet take (container) only; wrap so all share one signature.
function mountDashboardProxy(fn) { return (el) => fn(el); }
export const PAGE_LIST = Object.entries(PAGES).map(([id, p]) => ({ id, ...p }));

// ── Theme ──────────────────────────────────────────────────────────────────
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let theme = localStorage.getItem('system-design-theme') ||
            (prefersDark.matches ? 'dark' : 'light');
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('system-design-theme', t);
}
applyTheme(theme);
themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
});

// ── Sidebar toggle ─────────────────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
sidebarClose.addEventListener('click',  () => sidebar.classList.add('collapsed'));

// ── Progress bar ───────────────────────────────────────────────────────────
function updateProgress() {
  const pct = TOTAL ? (done.size / TOTAL) * 100 : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${done.size} / ${TOTAL}`;
}

// ── Mark done ──────────────────────────────────────────────────────────────
markDoneBtn.addEventListener('click', () => toggleDone());

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function setLoading() {
  root.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><p>Loading…</p></div>';
}
function showError(msg) {
  root.innerHTML = `<div class="coming-soon"><div class="coming-soon-icon">⚠️</div><h3>Unavailable</h3><p>${esc(msg)}</p></div>`;
}

// ── Concept route ────────────────────────────────────────────────────────────
async function navigateConcept(id) {
  const meta = conceptMeta(id);
  if (!meta) { showHome(); return; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  currentId = CONCEPT_PREFIX + id;

  breadcrumbGroup.textContent = meta.group;
  breadcrumbTitle.textContent = meta.title;
  markDoneBtn.style.display = 'flex';
  markDoneBtn.style.color = done.has(currentId) ? 'var(--green)' : '';

  if (!meta.built || !CONCEPT_LOADERS[id]) {
    root.innerHTML = `<div class="coming-soon">
      <div class="coming-soon-icon">${meta.icon || '🧭'}</div>
      <h3>${esc(meta.title)}</h3>
      <p>This concept is on the roadmap and lands in a coming wave.</p>
      <p class="coming-soon-sub">${esc(meta.summary || '')}</p></div>`;
    renderNav(currentId, done);
    document.getElementById('module-canvas').scrollTo(0, 0);
    return;
  }

  setLoading();
  try {
    const mod = await CONCEPT_LOADERS[id]();
    const data = mod.default || mod;
    root.innerHTML = '';
    const cleanup = mountConcept(root, data, { meta });
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } catch (e) {
    showError(e.message);
  }
  renderNav(currentId, done);
  document.getElementById('module-canvas').scrollTo(0, 0);
}

// ── Page route (reference / practice) ─────────────────────────────────────────
function navigatePage(id) {
  const page = PAGES[id];
  if (!page) { showHome(); return; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  currentId = PAGE_PREFIX + id;
  breadcrumbGroup.textContent = page.group;
  breadcrumbTitle.textContent = page.title;
  markDoneBtn.style.display = 'none';
  root.innerHTML = '';
  const cleanup = page.mount(root);
  if (typeof cleanup === 'function') currentCleanup = cleanup;
  renderNav(currentId, done);
  document.getElementById('module-canvas').scrollTo(0, 0);
}

// ── Question route ────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!id) { showHome(); return; }
  if (id.startsWith(CONCEPT_PREFIX)) { navigateConcept(id.slice(CONCEPT_PREFIX.length)); return; }
  if (id.startsWith(PAGE_PREFIX)) { navigatePage(id.slice(PAGE_PREFIX.length)); return; }
  if (!LOADERS[id]) { showHome(); return; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  currentId = id;
  setLoading();

  const meta = QUESTIONS.find(q => q.id === id);
  if (meta) {
    breadcrumbGroup.textContent = CATEGORY_LABEL[meta.category] || meta.category;
    breadcrumbTitle.textContent = meta.question;
    markDoneBtn.style.display = 'flex';
    markDoneBtn.style.color = done.has(id) ? 'var(--green)' : '';
  }

  try {
    const mod = await LOADERS[id]();
    const data = mod.default || mod;
    root.innerHTML = '';
    const cleanup = mountQuestion(root, data, { label: meta && meta.question });
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } catch (e) {
    showError(e.message);
  }

  renderNav(id, done);
  document.getElementById('module-canvas').scrollTo(0, 0);
}

// ── Home ───────────────────────────────────────────────────────────────────
function showHome() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  currentId = null;
  markDoneBtn.style.display = 'none';
  breadcrumbGroup.textContent = 'System Design';
  breadcrumbTitle.textContent = 'Home';
  root.innerHTML = '';
  const cleanup = mountHome(root, { done });
  if (typeof cleanup === 'function') currentCleanup = cleanup;
  renderNav(null, done);
}

// ── Command palette ──────────────────────────────────────────────────────────
const BUILT_CONCEPTS = CONCEPTS.filter(c => c.built).sort((a, b) => a.chapter - b.chapter);

function searchIndex() {
  const items = [];
  items.push({ hash: '', title: 'Home', subtitle: 'Concepts & question explorer', icon: '🏠', group: 'Pages' });
  PAGE_LIST.forEach(p => items.push({
    hash: PAGE_PREFIX + p.id, title: p.title, subtitle: p.group, icon: p.icon, group: 'Pages',
  }));
  BUILT_CONCEPTS.forEach(c => items.push({
    hash: CONCEPT_PREFIX + c.id,
    title: c.title,
    subtitle: `Ch ${c.chapter} · ${c.group}`,
    icon: c.icon || '🧭',
    group: 'Concepts',
  }));
  QUESTIONS.forEach(q => items.push({
    hash: q.id,
    title: q.question,
    subtitle: CATEGORY_LABEL[q.category] || q.category || '',
    icon: q.icon || '📘',
    group: 'Questions',
  }));
  return items;
}

const palette = createCommandPalette({ getItems: searchIndex });
const searchBtn = document.getElementById('search-btn');
if (searchBtn) searchBtn.addEventListener('click', () => palette.open());

// ── Prev / next concept navigation ───────────────────────────────────────────
function stepConcept(dir) {
  if (!currentId || !currentId.startsWith(CONCEPT_PREFIX)) return;
  const id = currentId.slice(CONCEPT_PREFIX.length);
  const idx = BUILT_CONCEPTS.findIndex(c => c.id === id);
  if (idx < 0) return;
  const next = BUILT_CONCEPTS[idx + dir];
  if (next) location.hash = CONCEPT_PREFIX + next.id;
}

// ── Keyboard shortcuts ───────────────────────────────────────────────────────
function toggleDone() {
  if (!currentId) return;
  if (done.has(currentId)) { done.delete(currentId); toast('Marked as not done', { tone: 'note' }); }
  else { done.add(currentId); toast('Marked as done', { tone: 'good' }); }
  saveDone();
  updateProgress();
  renderNav(currentId, done);
  markDoneBtn.style.color = done.has(currentId) ? 'var(--green)' : '';
}

let helpOverlay = null;
function toggleHelp() {
  if (helpOverlay) { helpOverlay.remove(); helpOverlay = null; return; }
  helpOverlay = document.createElement('div');
  helpOverlay.className = 'sd-help-overlay';
  helpOverlay.innerHTML = `
    <div class="sd-help-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div class="sd-help-head"><h2>Keyboard shortcuts</h2><button class="sd-help-close" aria-label="Close">✕</button></div>
      <table class="sd-help-table">
        <tr><td><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Open command palette</td></tr>
        <tr><td><kbd>/</kbd></td><td>Search everything</td></tr>
        <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>Previous / next concept</td></tr>
        <tr><td><kbd>d</kbd></td><td>Mark current page done</td></tr>
        <tr><td><kbd>t</kbd></td><td>Toggle light / dark theme</td></tr>
        <tr><td><kbd>h</kbd></td><td>Go home</td></tr>
        <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
        <tr><td><kbd>esc</kbd></td><td>Close overlays</td></tr>
      </table>
    </div>`;
  document.body.appendChild(helpOverlay);
  const kill = () => { if (helpOverlay) { helpOverlay.remove(); helpOverlay = null; } };
  helpOverlay.addEventListener('mousedown', e => { if (e.target === helpOverlay) kill(); });
  helpOverlay.querySelector('.sd-help-close').addEventListener('click', kill);
}

document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

  // palette toggle works everywhere
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); palette.toggle(); return;
  }
  if (e.key === 'Escape') {
    if (helpOverlay) { toggleHelp(); return; }
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.key) {
    case '/': e.preventDefault(); palette.open(); break;
    case '?': e.preventDefault(); toggleHelp(); break;
    case 't': theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); break;
    case 'd': if (currentId) { e.preventDefault(); toggleDone(); } break;
    case 'h': if (location.hash) location.hash = ''; break;
    case 'ArrowLeft': stepConcept(-1); break;
    case 'ArrowRight': stepConcept(1); break;
  }
});

// ── Routing + init ──────────────────────────────────────────────────────────
window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || null));
updateProgress();
navigate(location.hash.slice(1) || null);
