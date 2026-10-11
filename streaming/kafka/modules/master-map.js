// Master Map — the end-to-end journey of an event through Kafka, as clickable
// stages that deep-link into the module covering each one. Plus a concept map
// grouping every module by theme.

const STAGES = [
  { n: '01', icon: '🛒', m: 'm04', title: 'Produce',       sub: 'Serialize → partition → batch → acks',        note: 'An order event is keyed, routed to a partition, batched, and acknowledged.' },
  { n: '02', icon: '🖥️', m: 'm05', title: 'Store',         sub: 'Append to log segment · page cache',           note: 'The broker appends to the active segment; zero-copy keeps it fast.' },
  { n: '03', icon: '🔁', m: 'm07', title: 'Replicate',      sub: 'Leader → ISR followers · HWM',                 note: 'Followers fetch from the leader; the high watermark advances once in-sync.' },
  { n: '04', icon: '🗂️', m: 'm06', title: 'Partition',      sub: 'Ordering · parallelism · keys',                note: 'Order holds within a partition; keys decide which one — and parallelism.' },
  { n: '05', icon: '👥', m: 'm08', title: 'Consume',        sub: 'Group · assignment · rebalance',               note: 'A consumer group divides partitions; membership changes trigger rebalances.' },
  { n: '06', icon: '📍', m: 'm09', title: 'Track offsets',  sub: 'Commit · lag · replay',                        note: 'Committed offsets record progress; lag is the health metric; seek to replay.' },
  { n: '07', icon: '🛡️', m: 'm11', title: 'Guarantee',      sub: 'At-least / exactly-once',                      note: 'Idempotence + transactions turn duplicates into exactly-once processing.' },
  { n: '08', icon: '🌊', m: 'm13', title: 'Process',        sub: 'Streams · Connect · sink',                     note: 'Kafka Streams transforms in flight; Connect sinks to the warehouse.' },
];

const GROUPS = [
  { title: 'Foundation', icon: '📜', color: 'var(--accent)', items: [['m01', 'Why Kafka'], ['m02', 'Messaging Fundamentals'], ['m03', 'Architecture']] },
  { title: 'Core Internals', icon: '⚙️', color: 'var(--blue)', items: [['m04', 'Producer'], ['m05', 'Broker Internals'], ['m06', 'Partitions'], ['m07', 'Replication']] },
  { title: 'Consumer Side', icon: '👥', color: 'var(--green)', items: [['m08', 'Consumer Groups'], ['m09', 'Offsets'], ['m10', 'Retention & Compaction']] },
  { title: 'Delivery', icon: '🛡️', color: 'var(--amber)', items: [['m11', 'Delivery Guarantees']] },
  { title: 'Ecosystem', icon: '🔌', color: 'var(--accent2, var(--accent))', items: [['m12', 'Kafka Connect'], ['m13', 'Kafka Streams'], ['m14', 'Schema Registry'], ['m20', 'vs Competitors']] },
  { title: 'Operations', icon: '🔧', color: 'var(--blue)', items: [['m15', 'Security'], ['m16', 'Monitoring'], ['m17', 'Performance'], ['m22', 'Reassignment']] },
  { title: 'Advanced', icon: '🚀', color: 'var(--red)', items: [['m18', 'Failure Simulation'], ['m19', 'Amazon Pipeline'], ['m21', 'MirrorMaker 2']] },
];

export function mount(container) {
  const stage = s => `
    <a class="mm-stage" href="#${s.m}">
      <span class="mm-stage-top"><span class="mm-stage-num">${s.n}</span><span class="mm-stage-icon">${s.icon}</span></span>
      <span class="mm-stage-title">${s.title}</span>
      <span class="mm-stage-sub">${s.sub}</span>
      <span class="mm-stage-note">${s.note}</span>
    </a>`;

  const group = g => `
    <div class="mm-group">
      <div class="mm-group-head" style="border-left:3px solid ${g.color}">
        <span class="mm-group-icon">${g.icon}</span><span class="mm-group-title">${g.title}</span>
      </div>
      <div class="mm-group-items">
        ${g.items.map(([id, label]) => `<a class="mm-chip" href="#${id}"><span class="mm-chip-num">${id.replace(/^m/, '')}</span>${label}</a>`).join('')}
      </div>
    </div>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🗺️ · Reference · Amazon Edition</div>
        <h1 class="module-title">Master Map</h1>
        <p class="module-subtitle">Follow one event end to end — from an Amazon order all the way to the warehouse — then jump into any stage. Every node links into its module.</p>
      </div>

      <div class="section-header"><div class="section-title">The journey of an event</div>
        <div class="section-desc">Produce → store → replicate → consume → process. Click any stage.</div></div>
      <div class="mm-flow">
        ${STAGES.map(stage).join('<span class="mm-arrow">→</span>')}
      </div>

      <div class="section-header"><div class="section-title">Concept map</div>
        <div class="section-desc">All 22 modules, grouped by theme.</div></div>
      <div class="mm-groups">
        ${GROUPS.map(group).join('')}
      </div>
    </div>`;

  return () => {};
}
