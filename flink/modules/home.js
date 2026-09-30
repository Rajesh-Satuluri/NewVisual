// Home — landing page. Hero + stat strip + learning paths (module grid) +
// Uber story. Replaces the old bare welcome splash.
import { MODULES } from '../components/nav.js';

// One-line "what you'll learn" per module, keyed by id.
const BLURB = {
  m01: 'Why streaming beats batch — Hadoop → Storm → Spark → Flink.',
  m02: 'Bounded vs unbounded, true streaming vs micro-batch.',
  m03: 'JobManager, TaskManagers, slots — the cluster anatomy.',
  m04: 'From code to running job: submit, schedule, execute.',
  m05: 'Parallel subtasks, slot sharing, and how to scale.',
  m06: 'How records move: forward, hash, rebalance, broadcast.',
  m07: 'map / filter / keyBy / process — the transformation toolkit.',
  m08: 'Event time vs processing time vs ingestion time.',
  m09: 'Watermarks, out-of-orderness, and late-event handling.',
  m10: 'Tumbling, sliding, session — windowing in practice.',
  m11: 'Keyed vs operator state; heap vs RocksDB backends.',
  m12: 'Chandy-Lamport checkpoints for exactly-once state.',
  m13: 'Savepoints: upgrades, rescaling, and time travel.',
  m14: 'Recovery, restart strategies, and end-to-end guarantees.',
  m15: 'Detect and relieve backpressure before it cascades.',
  m16: 'Kafka, filesystem, JDBC — sources & sinks with 2PC.',
  m17: 'Flink SQL & the Table API for declarative streaming.',
  m18: 'Tuning: serialization, state, parallelism, network.',
  m19: 'The full Uber real-time pipeline, end to end.',
};

const STATS = [
  { val: '19', label: 'Modules', sub: 'Foundation → Advanced' },
  { val: '10+', label: 'Interactive Sims', sub: 'Watermarks, windows, more' },
  { val: '100+', label: 'Interview Qs', sub: 'Senior DE level' },
  { val: '1', label: 'Real Platform', sub: "Uber's data stack" },
];

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('flink_done') || '[]'));

  const groups = [...new Set(MODULES.map(m => m.group))].map(name => ({
    name, items: MODULES.filter(m => m.group === name),
  }));

  const nextId = MODULES.find(m => !done.has(m.id))?.id || 'm01';
  const nextMod = MODULES.find(m => m.id === nextId);

  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <div class="home-badge">⚡ Uber Edition · Interactive</div>
        <h1 class="home-title">Master Apache Flink, one interactive concept at a time</h1>
        <p class="home-sub">
          A hands-on learning platform for real-time stream processing, told through
          Uber's production data platform — from your first watermark to interview-ready.
        </p>
        <div class="home-cta">
          <button class="btn btn-primary" data-goto="${nextId}">
            ${done.size ? 'Continue' : 'Start'} — ${nextMod ? nextMod.icon + ' ' + nextMod.title : 'Begin'} <span>→</span>
          </button>
          <button class="btn btn-secondary" data-goto="master-map">🗺️ See the big picture</button>
          <button class="btn btn-ghost" data-goto="comparison">⚖️ Flink vs Spark vs Kafka Streams</button>
        </div>
      </div>

      <div class="home-stats">
        ${STATS.map(s => `
          <div class="home-stat">
            <div class="home-stat-val">${s.val}</div>
            <div class="home-stat-label">${s.label}</div>
            <div class="home-stat-sub">${s.sub}</div>
          </div>`).join('')}
      </div>

      <div class="uber-story-banner" style="margin: 0 40px 44px;">
        <div class="story-label">The running example</div>
        <h3>Every concept, grounded in Uber's real-time platform</h3>
        <p>
          One million GPS pings a second. Fraud caught in milliseconds, not 45 minutes.
          Surge pricing that reacts to demand as it happens. You'll build the mental model
          for each Flink concept by seeing exactly where it lives in this pipeline.
        </p>
        <div class="uber-stats">
          <div class="uber-stat"><span class="stat-val">1M/s</span><span class="stat-label">GPS events</span></div>
          <div class="uber-stat"><span class="stat-val">&lt;100ms</span><span class="stat-label">Fraud latency</span></div>
          <div class="uber-stat"><span class="stat-val">1024</span><span class="stat-label">Kafka partitions</span></div>
          <div class="uber-stat"><span class="stat-val">Exactly-once</span><span class="stat-label">Guarantee</span></div>
        </div>
      </div>

      <div class="home-section">
        <div class="home-section-title">The curriculum</div>
        <div class="home-section-sub">${done.size} of ${MODULES.length} complete · pick any module or follow the path top to bottom.</div>
        ${groups.map(g => `
          <div class="home-path">
            <div class="home-path-head">
              <span class="home-path-name">${g.name}</span>
              <span class="home-path-line"></span>
            </div>
            <div class="home-cards">
              ${g.items.map(m => `
                <button class="home-mod-card ${done.has(m.id) ? 'done' : ''}" data-goto="${m.id}">
                  <span class="home-mod-ic">${m.icon}</span>
                  <span class="home-mod-body">
                    <span class="home-mod-num">MODULE ${m.num}</span>
                    <div class="home-mod-title">${m.title}</div>
                    <div class="home-mod-desc">${BLURB[m.id] || ''}</div>
                  </span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <div class="home-section">
        <div class="home-section-title">Reference & review</div>
        <div class="home-section-sub">Jump-off points once you've got the fundamentals.</div>
        <div class="home-cards">
          <button class="home-mod-card" data-goto="master-map"><span class="home-mod-ic">🗺️</span><span class="home-mod-body"><div class="home-mod-title">Master Map</div><div class="home-mod-desc">Every concept on one page, wired into the Uber pipeline.</div></span></button>
          <button class="home-mod-card" data-goto="comparison"><span class="home-mod-ic">⚖️</span><span class="home-mod-body"><div class="home-mod-title">Engine Comparison</div><div class="home-mod-desc">Flink vs Spark Structured Streaming vs Kafka Streams.</div></span></button>
          <button class="home-mod-card" data-goto="glossary"><span class="home-mod-ic">📖</span><span class="home-mod-body"><div class="home-mod-title">Glossary</div><div class="home-mod-desc">Every Flink term, searchable and defined.</div></span></button>
          <button class="home-mod-card" data-goto="cheatsheet"><span class="home-mod-ic">📋</span><span class="home-mod-body"><div class="home-mod-title">Cheat Sheet</div><div class="home-mod-desc">APIs, configs and CLI you'll actually reach for.</div></span></button>
          <button class="home-mod-card" data-goto="study"><span class="home-mod-ic">📚</span><span class="home-mod-body"><div class="home-mod-title">Study Hub</div><div class="home-mod-desc">All interview questions in one filterable place.</div></span></button>
        </div>
      </div>
    </div>
  `;

  const onClick = (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn) window.location.hash = btn.dataset.goto;
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
