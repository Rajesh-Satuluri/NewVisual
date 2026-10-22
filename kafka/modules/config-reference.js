// Config Reference — the production Kafka settings that matter, each with its
// default, a safe/typical value, and what BREAKS if you get it wrong. Live
// filter across every field. Registered as the #config-reference PAGE.
import { CONFIG_GROUPS } from '../data/configs.js';

const SCOPE_BADGE = {
  producer: { label: 'producer', color: '#FF6900' },
  consumer: { label: 'consumer', color: '#3B82F6' },
  broker: { label: 'broker / topic', color: '#10B981' },
};

export function mount(container) {
  const total = CONFIG_GROUPS.reduce((n, g) => n + g.items.length, 0);

  const row = it => `
    <div class="cfg-row" data-text="${(it.name + ' ' + it.default + ' ' + it.typical + ' ' + it.breaks).toLowerCase().replace(/"/g, '&quot;')}">
      <div class="cfg-main">
        <code class="cfg-name">${it.name}</code>
        <a class="cfg-link" href="#${it.moduleId}" title="Open the module that explains this">${it.moduleId} ↗</a>
      </div>
      <div class="cfg-meta">
        <span class="cfg-kv"><span class="cfg-k">default</span><code>${it.default}</code></span>
        <span class="cfg-kv"><span class="cfg-k">typical</span><code>${it.typical}</code></span>
      </div>
      <div class="cfg-breaks"><span class="cfg-breaks-tag">what breaks</span> ${it.breaks}</div>
    </div>`;

  const group = g => `
    <section class="cfg-group" data-group>
      <header class="cfg-group-head">
        <h3 class="cfg-group-title">${g.group}</h3>
        <span class="cfg-scope" style="--c:${SCOPE_BADGE[g.scope].color}">${SCOPE_BADGE[g.scope].label}</span>
      </header>
      <div class="cfg-rows">${g.items.map(row).join('')}</div>
    </section>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">⚙️ · Reference</div>
        <h1 class="module-title">Config Reference</h1>
        <p class="module-subtitle">The ${total} settings that decide whether Kafka is durable, fast, and stable — each with its default, a sensible production value, and the failure you get when it's wrong. Filter across every field; each links to the module that explains the mechanism.</p>
      </div>
      <div class="cfg-tools">
        <input class="cfg-filter nav-filter" type="text" placeholder="Filter configs (e.g. acks, retention, rebalance, disk)…" aria-label="Filter configs" />
        <span class="cfg-count" aria-live="polite"></span>
      </div>
      <div class="cfg-list">
        ${CONFIG_GROUPS.map(group).join('')}
      </div>
      <p class="home-tip" style="margin-top:18px">Print it (⌘/Ctrl-P) for a durability/perf checklist. Defaults reflect Kafka 3.x.</p>
    </div>`;

  const filter = container.querySelector('.cfg-filter');
  const countEl = container.querySelector('.cfg-count');
  const rows = [...container.querySelectorAll('.cfg-row')];
  const groups = [...container.querySelectorAll('[data-group]')];

  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    let visible = 0;
    rows.forEach(r => {
      const match = !q || r.dataset.text.includes(q);
      r.hidden = !match;
      if (match) visible++;
    });
    groups.forEach(g => {
      const any = [...g.querySelectorAll('.cfg-row')].some(r => !r.hidden);
      g.hidden = !any;
    });
    countEl.textContent = q ? `${visible} match${visible === 1 ? '' : 'es'}` : `${rows.length} settings`;
  };
  filter.addEventListener('input', apply);
  apply();

  return () => {};
}
