// ── Glossary page ─────────────────────────────────────────────────────────────
// Searchable, grouped glossary. Each term optionally links to a concept.
// mount(container) → cleanup

import { GLOSSARY, GLOSSARY_GROUPS } from '../content/glossary.js';
import { CONCEPTS, CONCEPT_PREFIX } from '../content/concepts.js';
import { esc, fmt } from './render-helpers.js';

const conceptTitle = id => (CONCEPTS.find(c => c.id === id) || {}).title || id;

export function mount(container) {
  const byGroup = {};
  GLOSSARY.forEach(t => { (byGroup[t.group] = byGroup[t.group] || []).push(t); });

  container.innerHTML = `
    <div class="module-page sd-ref-page">
      <div class="module-hero">
        <div class="module-tag">📖 · Reference</div>
        <h1 class="module-title">Glossary</h1>
        <p class="sd-tldr"><span class="sd-tldr-tag">${GLOSSARY.length} terms</span> Every key system-design term in one line — search it, or jump to the concept that uses it.</p>
      </div>

      <div class="sd-ref-search-wrap">
        <input type="search" id="gl-search" class="sd-search" placeholder="Search terms & definitions…" autocomplete="off" />
        <span id="gl-count" class="sd-ref-count"></span>
      </div>

      <div id="gl-body"></div>
      <div class="sd-empty" id="gl-empty" hidden><div class="sd-empty-icon">🔍</div><p>No terms match.</p></div>
    </div>`;

  const body = container.querySelector('#gl-body');
  const empty = container.querySelector('#gl-empty');
  const countEl = container.querySelector('#gl-count');
  const search = container.querySelector('#gl-search');

  function card(t) {
    const see = t.see ? `<a class="sd-gl-see" href="#${CONCEPT_PREFIX}${t.see}">${esc(conceptTitle(t.see))} →</a>` : '';
    return `<div class="sd-gl-item">
      <div class="sd-gl-term">${esc(t.term)}</div>
      <div class="sd-gl-def">${fmt(t.def)}</div>
      ${see}
    </div>`;
  }

  function render(q) {
    const query = (q || '').trim().toLowerCase();
    let shown = 0;
    body.innerHTML = GLOSSARY_GROUPS.map(group => {
      const items = (byGroup[group] || []).filter(t =>
        !query || (t.term + ' ' + t.def).toLowerCase().includes(query));
      if (!items.length) return '';
      shown += items.length;
      return `<section class="sd-gl-group">
        <h2 class="sd-gl-group-title">${esc(group)} <span class="sd-gl-group-n">${items.length}</span></h2>
        <div class="sd-gl-grid">${items.map(card).join('')}</div>
      </section>`;
    }).join('');
    empty.hidden = shown > 0;
    countEl.textContent = query ? `${shown} of ${GLOSSARY.length}` : `${GLOSSARY.length} terms`;
  }

  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => render(search.value), 110);
  });
  render('');

  return () => clearTimeout(timer);
}
