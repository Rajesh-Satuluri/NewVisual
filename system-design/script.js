import { renderNav } from './components/nav.js';
import { mount as mountQuestion } from './components/question-renderer.js';
import { mount as mountConcept } from './components/concept-renderer.js';
import { mount as mountHome } from './components/home.js';
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
markDoneBtn.addEventListener('click', () => {
  if (!currentId) return;
  if (done.has(currentId)) done.delete(currentId);
  else done.add(currentId);
  saveDone();
  updateProgress();
  renderNav(currentId, done);
  markDoneBtn.style.color = done.has(currentId) ? 'var(--green)' : '';
});

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

// ── Question route ────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!id) { showHome(); return; }
  if (id.startsWith(CONCEPT_PREFIX)) { navigateConcept(id.slice(CONCEPT_PREFIX.length)); return; }
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

// ── Routing + init ──────────────────────────────────────────────────────────
window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || null));
updateProgress();
navigate(location.hash.slice(1) || null);
