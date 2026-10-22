// Config Reference — the Flink settings a senior engineer actually tunes.
// Live filter across every field; grouped by category; each row links to the
// module where the setting matters.
import { CONFIGS } from '../data/configs.js';
import { MODULES } from '../components/nav.js';

const titleOf = id => (MODULES.find(m => m.id === id) || {}).title || id;
const CATS = ['All', ...[...new Set(CONFIGS.map(c => c.category))]];

export function mount(container) {
  let cat = 'All';
  let query = '';

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">⚙️ Reference · Config</div>
        <h1 class="module-title">Config Reference</h1>
        <p class="module-subtitle">The ${CONFIGS.length} Flink settings that actually move the needle — default, the value you'd run in production, and what breaks when it's wrong.</p>
      </div>
      <div class="tab-content active">
        <div class="ref-toolbar">
          <input class="ref-search" type="text" placeholder="Search keys, descriptions, failure modes…" aria-label="Search config settings" />
        </div>
        <div class="ref-toolbar" id="cfg-cats">
          ${CATS.map(c => `<button class="ref-chip ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div id="cfg-list"></div>
        <div class="ref-empty" id="cfg-empty" hidden>No settings match your search.</div>
      </div>
    </div>`;

  const list = container.querySelector('#cfg-list');
  const empty = container.querySelector('#cfg-empty');

  function render() {
    const q = query.toLowerCase();
    const rows = CONFIGS.filter(c =>
      (cat === 'All' || c.category === cat) &&
      (!q || (c.key + ' ' + c.what + ' ' + c.breaks + ' ' + (c.typical || '')).toLowerCase().includes(q)));
    empty.hidden = rows.length > 0;

    // group by category for display
    const byCat = {};
    rows.forEach(c => (byCat[c.category] || (byCat[c.category] = [])).push(c));

    list.innerHTML = Object.keys(byCat).map(category => `
      <div class="cfg-group">
        <div class="cfg-group-head">${category} <span class="cfg-count">${byCat[category].length}</span></div>
        ${byCat[category].map(c => `
          <div class="cfg-row">
            <div class="cfg-key"><code>${c.key}</code></div>
            <div class="cfg-meta">
              <span class="cfg-pill">default: <b>${c.default}</b></span>
              <span class="cfg-pill cfg-pill-accent">typical: <b>${c.typical || '—'}</b></span>
              ${c.module ? `<a class="cfg-pill cfg-pill-link" href="#${c.module}">${titleOf(c.module)} →</a>` : ''}
            </div>
            <div class="cfg-what">${c.what}</div>
            <div class="cfg-breaks">⚠️ ${c.breaks}</div>
          </div>`).join('')}
      </div>`).join('');
  }

  container.querySelector('.ref-search').addEventListener('input', e => { query = e.target.value; render(); });
  container.querySelector('#cfg-cats').addEventListener('click', e => {
    const chip = e.target.closest('.ref-chip');
    if (!chip) return;
    cat = chip.dataset.cat;
    container.querySelectorAll('#cfg-cats .ref-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });

  render();
  return () => {};
}
