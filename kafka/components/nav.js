export const MODULES = [
  // ── Foundation ───────────────────────────────────────────────────────────
  { id:'m01', label:'Why Kafka',               icon:'📜', group:'Foundation',   desc:'LinkedIn origins, messaging history, event streaming need' },
  { id:'m02', label:'Messaging Fundamentals',  icon:'📨', group:'Foundation',   desc:'Producers, brokers, topics, consumers, pub/sub vs queue' },
  { id:'m03', label:'Kafka Architecture',      icon:'🏗️', group:'Foundation',   desc:'Giant interactive cluster diagram — every component clickable' },
  // ── Core Internals ───────────────────────────────────────────────────────
  { id:'m04', label:'Producer Deep Dive',      icon:'⚡', group:'Core Internals', desc:'Serializer → Partitioner → Batch → acks — fully animated' },
  { id:'m05', label:'Broker Internals',        icon:'🖥️', group:'Core Internals', desc:'Log segments, page cache, index files, replication' },
  { id:'m06', label:'Partitions',              icon:'🗂️', group:'Core Internals', desc:'Distribution, ordering, parallelism, hot partition' },
  { id:'m07', label:'Replication',             icon:'🔁', group:'Core Internals', desc:'Leader, ISR, follower lag — kill a broker and watch recovery' },
  // ── Consumer Side ────────────────────────────────────────────────────────
  { id:'m08', label:'Consumer Groups',         icon:'👥', group:'Consumer Side', desc:'Assignment, rebalancing, cooperative vs stop-the-world' },
  { id:'m09', label:'Offsets',                 icon:'📍', group:'Consumer Side', desc:'Committed vs current, lag, replay, seek controls' },
  { id:'m10', label:'Retention & Compaction',  icon:'🗑️', group:'Consumer Side', desc:'Time/size retention, log compaction, tombstone records' },
  // ── Delivery ─────────────────────────────────────────────────────────────
  { id:'m11', label:'Delivery Guarantees',     icon:'🛡️', group:'Delivery',      desc:'At-most-once, at-least-once, exactly-once — live 3-lane comparison' },
  // ── Ecosystem ────────────────────────────────────────────────────────────
  { id:'m12', label:'Kafka Connect',           icon:'🔌', group:'Ecosystem',     desc:'Source & sink connectors, SMT, dead-letter queue' },
  { id:'m13', label:'Kafka Streams',           icon:'🌊', group:'Ecosystem',     desc:'DSL builder — map, filter, aggregate, join, state store' },
  { id:'m14', label:'Schema Registry',         icon:'📋', group:'Ecosystem',     desc:'Avro/Protobuf/JSON, backward/forward/full compatibility' },
  { id:'m20', label:'Kafka vs Competitors',    icon:'📊', group:'Ecosystem',     desc:'Kinesis, Pub/Sub, Pulsar, RabbitMQ — head-to-head matrix' },
  // ── Operations ───────────────────────────────────────────────────────────
  { id:'m15', label:'Security',                icon:'🔐', group:'Operations',    desc:'TLS handshake, SASL, ACL matrix, encrypted tunnel' },
  { id:'m16', label:'Monitoring',              icon:'📊', group:'Operations',    desc:'Live Grafana-style dashboard — lag, throughput, ISR, disk' },
  { id:'m17', label:'Performance Tuning',      icon:'🚀', group:'Operations',    desc:'Producer/consumer/broker configs with animated impact meters' },
  { id:'m22', label:'Partition Reassignment',  icon:'🔀', group:'Operations',    desc:'Add brokers, rebalance leaders, decommission nodes safely' },
  // ── Advanced ─────────────────────────────────────────────────────────────
  { id:'m18', label:'Failure Simulation',      icon:'💥', group:'Advanced',      desc:'Kill producers, brokers, leaders — watch recovery cascade' },
  { id:'m19', label:'Amazon Pipeline',         icon:'🛒', group:'Advanced',      desc:'End-to-end: order → Kafka → 8 services → Snowflake → BI' },
  { id:'m21', label:'MirrorMaker 2',           icon:'🌐', group:'Advanced',      desc:'Cross-cluster replication, active-active DR, offset translation' },
];

const GROUP_ORDER = ['Foundation','Core Internals','Consumer Side','Delivery','Ecosystem','Operations','Advanced'];
const REVIEW = { id:'study', label:'Study Hub', icon:'📚' };

const COLLAPSE_KEY = 'kafka_nav_collapsed';
function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set])); } catch (e) {}
}

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const collapsed = loadCollapsed();
  const groups = {};
  MODULES.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });

  const section = (name, items, extra) => {
    const isCol = collapsed.has(name);
    return `
      <div class="nav-group ${isCol ? 'collapsed' : ''}" data-group="${name}">
        <button class="nav-group-label" aria-expanded="${!isCol}">
          <span>${name}</span><span class="nav-chevron">▾</span>
        </button>
        <div class="nav-group-items"><div class="nav-group-inner">
          ${items.map(m => `
            <a href="#${m.id}" class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}" data-id="${m.id}">
              <span class="nav-icon">${m.icon}</span>
              <span class="nav-label">${m.label}</span>
              ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
            </a>`).join('')}
          ${extra || ''}
        </div></div>
      </div>`;
  };

  nav.innerHTML = `
    <div class="nav-tools">
      <input class="nav-filter" type="text" placeholder="Filter modules…" aria-label="Filter modules" />
      <button class="icon-btn nav-collapse-all" title="Collapse / expand all" aria-label="Collapse or expand all sections">⇕</button>
    </div>
    ${GROUP_ORDER.map(g => section(g, groups[g] || [])).join('')}
    ${section('Review', [{ ...REVIEW }])}
  `;

  // Toggle a single section.
  nav.querySelectorAll('.nav-group-label').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-group');
      const nowCollapsed = group.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!nowCollapsed));
      const set = loadCollapsed();
      nowCollapsed ? set.add(group.dataset.group) : set.delete(group.dataset.group);
      saveCollapsed(set);
    });
  });

  // Collapse-all / expand-all.
  nav.querySelector('.nav-collapse-all')?.addEventListener('click', () => {
    const gs = [...nav.querySelectorAll('.nav-group')];
    const allCollapsed = gs.every(g => g.classList.contains('collapsed'));
    const set = new Set();
    gs.forEach(g => {
      const collapse = !allCollapsed;
      g.classList.toggle('collapsed', collapse);
      g.querySelector('.nav-group-label')?.setAttribute('aria-expanded', String(!collapse));
      if (collapse) set.add(g.dataset.group);
    });
    saveCollapsed(set);
  });

  // Filter: hide non-matching items, auto-expand groups with matches.
  const filter = nav.querySelector('.nav-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    const stored = loadCollapsed();
    nav.querySelectorAll('.nav-group').forEach(group => {
      let anyVisible = false;
      group.querySelectorAll('.nav-item').forEach(item => {
        const match = !q || item.querySelector('.nav-label').textContent.toLowerCase().includes(q);
        item.hidden = !match;
        if (match) anyVisible = true;
      });
      const header = group.querySelector('.nav-group-label');
      if (q) {
        group.hidden = !anyVisible;
        group.classList.remove('collapsed');
        header?.setAttribute('aria-expanded', 'true');
      } else {
        group.hidden = false;
        const isCol = stored.has(group.dataset.group);
        group.classList.toggle('collapsed', isCol);
        header?.setAttribute('aria-expanded', String(!isCol));
      }
    });
  });
}

export function updateProgress(done) {
  const fill = document.getElementById('progress-fill');
  const count = document.getElementById('progress-count');
  const real = [...done].filter(id => MODULES.some(m => m.id === id)).length;
  if (fill) fill.style.width = `${(real / MODULES.length) * 100}%`;
  if (count) count.textContent = `${real} / ${MODULES.length}`;
}
