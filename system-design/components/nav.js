import { QUESTIONS, CATEGORY_ORDER, CATEGORY_LABEL } from '../content/index.js';

const COLLAPSE_KEY = 'system-design-nav-collapsed';

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const collapsed = new Set(
    JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')
  );

  // Auto-expand the active question's category.
  if (activeId) {
    const active = QUESTIONS.find(q => q.id === activeId);
    if (active) collapsed.delete(active.category);
  }

  const groups = {};
  QUESTIONS.forEach(q => {
    (groups[q.category] = groups[q.category] || []).push(q);
  });

  nav.innerHTML = CATEGORY_ORDER.map(cat => {
    const items = groups[cat] || [];
    if (!items.length) return '';
    const isCollapsed = collapsed.has(cat);
    const doneCount = items.filter(q => done.has(q.id)).length;
    return `
      <div class="nav-group${isCollapsed ? ' collapsed' : ''}" data-group="${esc(cat)}">
        <div class="nav-group-label" data-toggle="${esc(cat)}">
          <span class="nav-group-text">${esc(CATEGORY_LABEL[cat] || cat)}</span>
          <span class="nav-group-meta">
            <span class="nav-group-count">${doneCount}/${items.length}</span>
            <svg class="nav-chevron" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </span>
        </div>
        <div class="nav-group-items">
          ${items.map(q => `
            <a href="#${q.id}"
               class="nav-item${q.id === activeId ? ' active' : ''}${done.has(q.id) ? ' done' : ''}"
               data-id="${q.id}" title="${esc(q.question)}">
              <span class="nav-icon">${q.icon || '•'}</span>
              <span class="nav-label">${esc(q.question)}</span>
              ${done.has(q.id) ? '<span class="nav-check">✓</span>' : ''}
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  nav.querySelectorAll('.nav-group-label[data-toggle]').forEach(label => {
    label.addEventListener('click', () => {
      const g = label.dataset.toggle;
      const group = nav.querySelector(`.nav-group[data-group="${cssEsc(g)}"]`);
      group.classList.toggle('collapsed');
      if (group.classList.contains('collapsed')) collapsed.add(g);
      else collapsed.delete(g);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed]));
    });
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function cssEsc(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
}
