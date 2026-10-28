import { renderNav } from './components/nav.js';
import {
  QUESTIONS, LOADERS, CATEGORY_ORDER, CATEGORY_LABEL,
} from './content/index.js';

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
let currentId = null;

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
  const pct = QUESTIONS.length ? (done.size / QUESTIONS.length) * 100 : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${done.size} / ${QUESTIONS.length}`;
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
const DIFF_CLASS = {
  Fundamental: 'diff-fundamental',
  Intermediate: 'diff-intermediate',
  Advanced: 'diff-advanced',
};

// ── Placeholder question view (full renderer arrives in Block B) ────────────
function renderQuestion(data) {
  const diffClass = DIFF_CLASS[data.difficulty] || '';
  const tags = (data.tags || [])
    .map(t => `<span class="sd-tag">${esc(t)}</span>`).join('');
  root.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="sd-badges">
          <span class="sd-diff ${diffClass}">${esc(data.difficulty || '')}</span>
          ${data.draft ? '<span class="sd-draft">draft</span>' : ''}
          <span class="sd-cat">${esc(CATEGORY_LABEL[data.category] || data.category)}</span>
        </div>
        <h1 class="module-title">${esc(data.question)}</h1>
        ${data.tldr ? `<p class="module-subtitle"><strong>TL;DR</strong> ${esc(data.tldr)}</p>` : ''}
        <div class="sd-tags">${tags}</div>
      </div>
      <div class="sd-placeholder">
        <div class="sd-placeholder-icon">🚧</div>
        <p>The interactive answer view is built in <strong>Block B</strong>.
        This question has <strong>${(data.steps || []).length}</strong> answer step(s),
        ${data.flow ? 'a flow diagram, ' : ''}${(data.checklist || []).length} checklist item(s)
        ${data.widget ? `, and a <strong>${esc(data.widget)}</strong> widget` : ''} ready in its data.</p>
      </div>
    </div>`;
  return null;
}

// ── Router ─────────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!id || !LOADERS[id]) { showHome(); return; }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  currentId = id;
  root.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><p>Loading…</p></div>';

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
    const cleanup = renderQuestion(data);
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } catch (e) {
    root.innerHTML = `<div class="coming-soon">
      <div class="coming-soon-icon">⚠️</div><h3>Question unavailable</h3>
      <p>${esc(e.message)}</p></div>`;
  }

  renderNav(id, done);
  document.getElementById('module-canvas').scrollTo(0, 0);
}

// ── Home ───────────────────────────────────────────────────────────────────
function showHome() {
  currentId = null;
  markDoneBtn.style.display = 'none';
  breadcrumbGroup.textContent = 'System Design';
  breadcrumbTitle.textContent = 'Welcome';

  const cats = CATEGORY_ORDER
    .map(c => [c, QUESTIONS.filter(q => q.category === c).length])
    .filter(([, n]) => n > 0);

  root.innerHTML = `
    <div class="module-page">
      <div class="module-hero" style="text-align:center;padding:64px 40px 48px">
        <div class="module-tag">Visual Learning Lab</div>
        <h1 class="module-title" style="font-size:clamp(22px,4vw,40px);margin-bottom:14px">
          System Design<br>Knowledge Base
        </h1>
        <p class="module-subtitle" style="margin:0 auto;text-align:center">
          A searchable, visual collection of real-world system-design questions and
          model answers — browse by topic, difficulty, and tag.
        </p>
      </div>

      <div class="stats-row" style="justify-content:center;padding:32px 40px 0">
        <div class="stat-box"><div class="stat-val">${QUESTIONS.length}</div><div class="stat-label">Questions</div></div>
        <div class="stat-box"><div class="stat-val">${cats.length}</div><div class="stat-label">Categories</div></div>
        <div class="stat-box"><div class="stat-val">${done.size}</div><div class="stat-label">Completed</div></div>
      </div>

      <div class="info-grid" style="padding-top:32px">
        ${cats.map(([c, n]) => {
          const first = QUESTIONS.find(q => q.category === c);
          return `
          <a href="#${first ? first.id : ''}" class="info-card" style="text-decoration:none;cursor:pointer">
            <div class="info-card-icon">${first ? (first.icon || '📚') : '📚'}</div>
            <div class="info-card-title">${esc(CATEGORY_LABEL[c] || c)}</div>
            <div class="info-card-body">${esc(c)}</div>
            <span class="info-card-tag">${n} question${n === 1 ? '' : 's'} →</span>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  renderNav(null, done);
}

// ── Routing + init ──────────────────────────────────────────────────────────
window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || null));
updateProgress();
navigate(location.hash.slice(1) || null);
