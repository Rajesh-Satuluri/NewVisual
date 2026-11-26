// B8 viewer · Global search — one box over modules, glossary, configs, labs,
// reference pages, and interview surfaces. Powered by data/search-index.js.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { SEARCH_INDEX, searchIndex } from '../data/search-index.js';

const KIND_COLOR = {
  Module: 'var(--cyan,#06B6D4)', Glossary: 'var(--purple,#8B5CF6)', Config: 'var(--yellow,#F59E0B)',
  Lab: 'var(--green,#10B981)', Reference: 'var(--blue,#3B82F6)', Interview: 'var(--red,#EF4444)', Review: 'var(--accent)', Page: 'var(--text-muted)',
};

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p>Search everything — <b>${SEARCH_INDEX.length}</b> indexed entries across modules, glossary terms, config keys, labs, reference pages, and interview surfaces. Type a concept, API, or config key.</p>
  </div>
  <div class="ss-controls">
    <input id="se-q" placeholder="Search watermark, foreachBatch, exactly-once, maxOffsetsPerTrigger…" autofocus
      style="flex:1;min-width:260px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:9px 13px;font-size:14px">
    <span id="se-count" style="font-size:12px;color:var(--text-muted)"></span>
  </div>
  <div id="se-results"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Start · Search',
    title: '🔍 Search',
    subtitle: `One box over ${SEARCH_INDEX.length} modules, terms, configs, and surfaces`,
    tabs: [{ id: 'search', label: '🔍 Search', content: intro }],
  });
  initTabs(container);

  const q = container.querySelector('#se-q');
  const results = container.querySelector('#se-results');
  const countEl = container.querySelector('#se-count');

  function render() {
    const hits = searchIndex(q.value);
    countEl.textContent = q.value.trim() ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : '';
    if (!q.value.trim()) { results.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:14px">Start typing to search.</p>'; return; }
    if (!hits.length) { results.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:14px">No matches.</p>'; return; }
    results.innerHTML = hits.map((e) => `
      <a href="#${e.hash}" style="display:block;text-decoration:none;padding:10px 12px;border-top:1px solid color-mix(in srgb,var(--border) 55%,transparent)">
        <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${KIND_COLOR[e.kind] || 'var(--text-muted)'};border:1px solid ${KIND_COLOR[e.kind] || 'var(--border)'};border-radius:5px;padding:1px 6px">${e.kind}</span>
          <b style="color:var(--text-primary);font-size:13.5px">${esc(e.title)}</b>
          <span style="color:var(--text-muted);font-size:12px">${esc(e.sub)}</span>
        </div>
      </a>`).join('');
  }

  q.addEventListener('input', render);
  render();
  setTimeout(() => q.focus(), 60);
  return null;
}

export default { mount };
