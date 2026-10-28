// Global Search — one box across every content source: modules, glossary,
// configs, advanced topics, decisions, incidents, and interview questions.
// Registered as the #search PAGE.
import { buildStaticIndex, loadFullIndex, rankMatches } from '../data/search-index.js';

const TYPES = ['All', 'Module', 'Glossary', 'Config', 'Advanced', 'Decision', 'Incident', 'Coding', 'Interview', 'Interview Q'];

// Read ?q= from the hash (e.g. #search?q=rebalance), set by the command palette.
function initialQuery() {
  const h = location.hash;
  const i = h.indexOf('?');
  if (i === -1) return '';
  try { return new URLSearchParams(h.slice(i + 1)).get('q') || ''; } catch (e) { return ''; }
}

export function mount(container) {
  let index = buildStaticIndex();
  let typeFilter = null;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🔎 · Search</div>
        <h1 class="module-title">Search everything</h1>
        <p class="module-subtitle">One box across all ${index.length}+ entries — modules, glossary, configs, advanced topics, decision drills, incidents, and every interview question. Type a concept, a config, or a symptom.</p>
      </div>
      <div class="srch-tools">
        <input class="srch-input nav-filter" type="search" placeholder="Search Kafka — e.g. rebalance, min.insync.replicas, hot partition, exactly-once…" aria-label="Search all content" autocomplete="off" />
        <div class="srch-chips" role="tablist" aria-label="Filter by type">
          ${TYPES.map((t, i) => `<button class="srch-chip${i === 0 ? ' active' : ''}" data-type="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="srch-results" id="srch-results" aria-live="polite"></div>
    </div>`;

  const input = container.querySelector('.srch-input');
  const results = container.querySelector('#srch-results');
  const chips = [...container.querySelectorAll('.srch-chip')];

  const render = () => {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = `<div class="srch-hint">Start typing to search. Tip: press <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> anywhere to jump to a module.</div>`;
      return;
    }
    const matches = rankMatches(index, q, typeFilter).slice(0, 60);
    if (!matches.length) {
      results.innerHTML = `<div class="srch-hint">No matches for “${q}”${typeFilter ? ` in ${typeFilter}` : ''}. Try fewer or different words.</div>`;
      return;
    }
    results.innerHTML = `
      <div class="srch-count">${matches.length} result${matches.length === 1 ? '' : 's'}</div>
      ${matches.map(e => `
        <a class="srch-item" href="${e.hash}">
          <span class="srch-item-icon">${e.icon || '•'}</span>
          <span class="srch-item-body">
            <span class="srch-item-title">${e.title}</span>
            <span class="srch-item-snip">${e.snippet || ''}</span>
          </span>
          <span class="srch-type srch-type-${e.typeClass}">${e.type}</span>
        </a>`).join('')}`;
  };

  input.addEventListener('input', render);
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    typeFilter = c.dataset.type === 'All' ? null : c.dataset.type;
    render();
  }));

  // Enrich with interview questions (async) without blocking first paint.
  loadFullIndex().then(full => { index = full; if (input.value.trim()) render(); });

  const q0 = initialQuery();
  if (q0) input.value = q0;
  input.focus();
  render();
  return () => {};
}
