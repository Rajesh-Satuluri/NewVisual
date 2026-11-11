import { reg } from '../content/registry.js';

const COLLAPSE_KEY = 'system-design-nav-collapsed';
const PAGE_PREFIX = 'p:';
const PAGE_INFO = {
  dashboard:  { id: 'dashboard',  title: 'Dashboard',  icon: '📊' },
  glossary:   { id: 'glossary',   title: 'Glossary',   icon: '📖' },
  cheatsheet: { id: 'cheatsheet', title: 'Cheat sheet', icon: '📋' },
  decisions:  { id: 'decisions', title: 'Choose the approach', icon: '🧭' },
  answers:    { id: 'answers',   title: 'Level up your answer', icon: '🎯' },
};

export function renderNav(activeHash, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const { QUESTIONS, CATEGORY_ORDER, CATEGORY_LABEL, CONCEPTS, CONCEPT_GROUPS, CONCEPT_PREFIX, track } = reg;
  const REFERENCE_PAGES = (track.refPages || []).map(id => PAGE_INFO[id]).filter(Boolean);
  const PRACTICE_PAGES = (track.practicePages || []).map(id => PAGE_INFO[id]).filter(Boolean);

  const collapsed = new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]'));

  const isConcept = activeHash && activeHash.startsWith(CONCEPT_PREFIX);
  const isPage = activeHash && activeHash.startsWith(PAGE_PREFIX);
  const activeConceptId = isConcept ? activeHash.slice(CONCEPT_PREFIX.length) : null;
  const activePageId = isPage ? activeHash.slice(PAGE_PREFIX.length) : null;
  const activeQuestionId = activeHash && !isConcept && !isPage ? activeHash : null;

  // Auto-expand the active item's group.
  if (activeQuestionId) {
    const aq = QUESTIONS.find(q => q.id === activeQuestionId);
    if (aq) collapsed.delete(aq.category);
  }
  if (activeConceptId) {
    const ac = CONCEPTS.find(c => c.id === activeConceptId);
    if (ac) collapsed.delete('cg:' + ac.group);
  }

  // ── Concepts section ────────────────────────────────────────────────────────
  const conByGroup = {};
  CONCEPTS.forEach(c => { (conByGroup[c.group] = conByGroup[c.group] || []).push(c); });

  const conceptHtml = CONCEPT_GROUPS.map(group => {
    const items = conByGroup[group] || [];
    if (!items.length) return '';
    const key = 'cg:' + group;
    const isCollapsed = collapsed.has(key);
    const doneCount = items.filter(c => done.has(CONCEPT_PREFIX + c.id)).length;
    return `
      <div class="nav-group${isCollapsed ? ' collapsed' : ''}" data-group="${esc(key)}">
        <div class="nav-group-label" data-toggle="${esc(key)}">
          <span class="nav-group-text">${esc(group)}</span>
          <span class="nav-group-meta">
            <span class="nav-group-count">${doneCount}/${items.length}</span>
            <svg class="nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
        <div class="nav-group-items">
          ${items.map(c => {
            const isActive = c.id === activeConceptId;
            const isDone = done.has(CONCEPT_PREFIX + c.id);
            if (!c.built) {
              return `<span class="nav-item nav-soon" title="${esc(c.title)} — coming soon">
                <span class="nav-icon">${c.icon || '•'}</span>
                <span class="nav-label">${esc(c.title)}</span>
                <span class="nav-soon-badge">soon</span></span>`;
            }
            return `<a href="#${CONCEPT_PREFIX}${c.id}"
                 class="nav-item${isActive ? ' active' : ''}${isDone ? ' done' : ''}"
                 data-id="${CONCEPT_PREFIX}${c.id}" title="${esc(c.title)}">
              <span class="nav-icon">${c.icon || '•'}</span>
              <span class="nav-label">${esc(c.title)}</span>
              ${isDone ? '<span class="nav-check">✓</span>' : ''}</a>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  // ── Questions section ───────────────────────────────────────────────────────
  const groups = {};
  QUESTIONS.forEach(q => { (groups[q.category] = groups[q.category] || []).push(q); });

  const questionHtml = CATEGORY_ORDER.map(cat => {
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
            <svg class="nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
        <div class="nav-group-items">
          ${items.map(q => `
            <a href="#${q.id}"
               class="nav-item${q.id === activeQuestionId ? ' active' : ''}${done.has(q.id) ? ' done' : ''}"
               data-id="${q.id}" title="${esc(q.question)}">
              <span class="nav-icon">${q.icon || '•'}</span>
              <span class="nav-label">${esc(q.question)}</span>
              ${done.has(q.id) ? '<span class="nav-check">✓</span>' : ''}
            </a>`).join('')}
        </div>
      </div>`;
  }).join('');

  const pageLink = p => `
    <a href="#${PAGE_PREFIX}${p.id}" class="nav-item${p.id === activePageId ? ' active' : ''}" data-id="${PAGE_PREFIX}${p.id}" title="${esc(p.title)}">
      <span class="nav-icon">${p.icon}</span>
      <span class="nav-label">${esc(p.title)}</span>
    </a>`;
  const referenceHtml = REFERENCE_PAGES.map(pageLink).join('');
  const practiceHtml = PRACTICE_PAGES.map(pageLink).join('');

  nav.innerHTML = `
    ${referenceHtml ? `<div class="nav-section-label">📚 Reference</div>
    <div class="nav-group"><div class="nav-group-items">${referenceHtml}</div></div>` : ''}
    ${practiceHtml ? `<div class="nav-section-label">🎯 Practice</div>
    <div class="nav-group"><div class="nav-group-items">${practiceHtml}</div></div>` : ''}
    <div class="nav-section-label">🧭 Concepts</div>
    ${conceptHtml}
    ${questionHtml ? `<div class="nav-section-label">❓ Questions</div>
    ${questionHtml}` : ''}`;

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
