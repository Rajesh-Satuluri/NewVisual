// Global search page — one box across every content type. Reads ?q= from the
// hash for deep links (e.g. #search?q=watermark).
import { rankMatches, typeCounts, TYPES } from '../data/search-index.js';

function parseQuery() {
  const h = window.location.hash.slice(1); // e.g. search?q=foo
  const qi = h.indexOf('?');
  if (qi === -1) return '';
  const params = new URLSearchParams(h.slice(qi + 1));
  return params.get('q') || '';
}

export function mount(container) {
  const state = { query: parseQuery(), type: 'all' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🔍 Search</div>
        <h1 class="module-title">Search everything</h1>
        <p class="module-subtitle">Modules, glossary, config settings, advanced topics, interview Q&amp;A, decision drills, scenarios and the cheat sheet — all in one index.</p>
      </div>
      <div class="tab-content active">
        <input class="search-box" type="search" placeholder="Search all content…" aria-label="Search all content" value="${state.query.replace(/"/g, '&quot;')}" />
        <div class="search-chips" id="search-chips"></div>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>`;

  const box = container.querySelector('.search-box');
  const chipsEl = container.querySelector('#search-chips');
  const resultsEl = container.querySelector('#search-results');

  function renderChips() {
    const { total, counts } = typeCounts(state.query);
    if (!state.query.trim()) { chipsEl.innerHTML = ''; return; }
    const chip = (val, label, n) => `<button class="search-chip ${state.type === val ? 'active' : ''}" data-type="${val}">${label}${n != null ? ` <span class="search-chip-n">${n}</span>` : ''}</button>`;
    chipsEl.innerHTML = chip('all', 'All', total) +
      TYPES.filter(t => counts[t]).map(t => chip(t, t, counts[t])).join('');
  }

  function render() {
    renderChips();
    const q = state.query.trim();
    if (!q) {
      resultsEl.innerHTML = `<div class="search-empty">Start typing to search across the whole platform.</div>`;
      return;
    }
    const rows = rankMatches(q, { type: state.type });
    if (!rows.length) {
      resultsEl.innerHTML = `<div class="search-empty">No matches for “${q}”.</div>`;
      return;
    }
    resultsEl.innerHTML = `
      <div class="search-count">${rows.length} result${rows.length > 1 ? 's' : ''}</div>
      ${rows.map(r => `
        <a class="search-result" href="#${r.hash}">
          <span class="search-ic">${r.icon || '•'}</span>
          <span class="search-body">
            <span class="search-rtitle">${r.title}</span>
            <span class="search-rsnippet">${r.snippet}</span>
          </span>
          <span class="search-rtype">${r.type}</span>
        </a>`).join('')}`;
  }

  let t = null;
  box.addEventListener('input', () => {
    state.query = box.value;
    clearTimeout(t);
    t = setTimeout(render, 90);
    // keep the hash shareable without re-triggering a full navigation
    try {
      const base = 'search' + (state.query.trim() ? `?q=${encodeURIComponent(state.query.trim())}` : '');
      history.replaceState(null, '', '#' + base);
    } catch (e) {}
  });
  chipsEl.addEventListener('click', e => {
    const chip = e.target.closest('.search-chip');
    if (!chip) return;
    state.type = chip.dataset.type;
    render();
  });

  render();
  box.focus();
  return () => { clearTimeout(t); };
}
