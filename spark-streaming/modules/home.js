// Home — landing page. Hero + stat strip + ShopStream story + curriculum grid.
import { MODULES } from '../components/nav.js';

const BLURB = {
  m01: 'Why Structured Streaming — the unbounded table, vs legacy DStreams, vs Flink.',
  m02: 'Stream = an ever-growing input table; query = an incremental view.',
  m03: 'Driver, executors, the micro-batch planner, state store, offset log.',
  m04: 'Kafka / file / rate sources, schema, and starting offsets.',
  m05: 'The micro-batch model and every trigger: default, interval, availableNow, once.',
  m06: 'Continuous processing: millisecond latency and its trade-offs.',
  m07: 'Event time vs processing time; late and out-of-order data.',
  m08: 'Watermarks: the exact rule, monotonicity, and dropping late data.',
  m09: 'Tumbling, sliding, and session windows in practice.',
  m10: 'Keyed stateful aggregations and watermark-driven state eviction.',
  m11: 'Arbitrary state: flatMapGroupsWithState and timeouts.',
  m12: 'Output modes — append, update, complete — and what each emits.',
  m13: 'Deduplication, including dropDuplicatesWithinWatermark.',
  m14: 'Sinks and foreachBatch for idempotent, upsert writes.',
  m15: 'Checkpointing and the write-ahead offset/commit log.',
  m16: 'Fault tolerance and the conditions for exactly-once.',
  m17: 'Stream–static joins and how the static side refreshes.',
  m18: 'Stream–stream joins with watermark + time-range state cleanup.',
  m19: 'Delta Lake sink, MERGE/upserts, and CDC output.',
  m20: 'Tuning: RocksDB state store, shuffle partitions, maxOffsetsPerTrigger.',
  m21: 'StreamingQueryProgress metrics and StreamingQueryListener.',
  m22: 'The full ShopStream orders + clickstream pipeline, end to end.',
};

const META = {
  m01: ['Beginner', 12], m02: ['Beginner', 14], m03: ['Intermediate', 16], m04: ['Intermediate', 14],
  m05: ['Intermediate', 18], m06: ['Advanced', 14], m07: ['Beginner', 12], m08: ['Intermediate', 18],
  m09: ['Intermediate', 16], m10: ['Advanced', 18], m11: ['Advanced', 18], m12: ['Advanced', 18],
  m13: ['Intermediate', 12], m14: ['Intermediate', 16], m15: ['Advanced', 16], m16: ['Advanced', 18],
  m17: ['Intermediate', 14], m18: ['Advanced', 18], m19: ['Advanced', 18], m20: ['Advanced', 18],
  m21: ['Intermediate', 14], m22: ['Advanced', 22],
};
const levelClass = l => 'lvl-' + (l || '').toLowerCase();

const STATS = [
  { val: '22', label: 'Modules', sub: 'Foundation → Advanced' },
  { val: '3', label: 'Interactive Labs', sub: 'Micro-batch · watermark · output modes' },
  { val: '200+', label: 'Practice Qs', sub: 'Quizzes + interview Q&A' },
  { val: '1', label: 'Running Pipeline', sub: 'The ShopStream story' },
];

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('spark_done') || '[]'));

  const groups = [...new Set(MODULES.map(m => m.group))].map(name => ({
    name, items: MODULES.filter(m => m.group === name),
  }));

  const nextId = MODULES.find(m => !done.has(m.id))?.id || 'm01';
  const nextMod = MODULES.find(m => m.id === nextId);

  container.innerHTML = `
    <div class="home">
      <div class="home-hero">
        <div class="home-badge">🔥 ShopStream Edition · Interactive</div>
        <h1 class="home-title">Master Spark Structured Streaming, one interactive concept at a time</h1>
        <p class="home-sub">
          A hands-on learning platform for real-time stream processing with Apache Spark,
          told through an e-commerce orders + clickstream pipeline — from your first
          watermark to interview-ready.
        </p>
        <div class="home-cta">
          <button class="btn btn-primary" data-goto="learning-path">🧭 Follow the guided path <span>→</span></button>
          <button class="btn btn-secondary" data-goto="${nextId}">
            ${done.size ? 'Continue' : 'Start'} — ${nextMod ? nextMod.icon + ' ' + nextMod.title : 'Begin'} <span>→</span>
          </button>
          <button class="btn btn-ghost" data-goto="master-map">🗺️ See the big picture</button>
          <button class="btn btn-ghost" data-goto="comparison">⚖️ Spark vs Flink vs Kafka Streams</button>
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
        <h3>Every concept, grounded in the ShopStream pipeline</h3>
        <p>
          A high-traffic online store. Order events and clickstream pour in out of order
          and late. Real-time revenue per minute, sessionized browsing, fraud flags, and a
          Delta Lakehouse kept exactly-once. You'll build the mental model for each Spark
          concept by seeing exactly where it lives in this pipeline.
        </p>
        <div class="uber-stats">
          <div class="uber-stat"><span class="stat-val">250k/s</span><span class="stat-label">Events</span></div>
          <div class="uber-stat"><span class="stat-val">10s</span><span class="stat-label">Trigger interval</span></div>
          <div class="uber-stat"><span class="stat-val">5 min</span><span class="stat-label">Watermark delay</span></div>
          <div class="uber-stat"><span class="stat-val">Exactly-once</span><span class="stat-label">To Delta</span></div>
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
                    ${META[m.id] ? `<div class="home-mod-badges">
                      <span class="mod-badge ${levelClass(META[m.id][0])}">${META[m.id][0]}</span>
                      <span class="mod-badge mod-badge-time">⏱ ${META[m.id][1]} min</span>
                    </div>` : ''}
                  </span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <div class="home-section">
        <div class="home-section-title">Reference & labs</div>
        <div class="home-section-sub">Jump-off points once you've got the fundamentals.</div>
        <div class="home-cards">
          <button class="home-mod-card" data-goto="master-map"><span class="home-mod-ic">🗺️</span><span class="home-mod-body"><div class="home-mod-title">Master Map</div><div class="home-mod-desc">Every concept on one page, wired into ShopStream.</div></span></button>
          <button class="home-mod-card" data-goto="comparison"><span class="home-mod-ic">⚖️</span><span class="home-mod-body"><div class="home-mod-title">Engine Comparison</div><div class="home-mod-desc">Structured Streaming vs Flink vs Kafka Streams.</div></span></button>
          <button class="home-mod-card" data-goto="output-mode-lab"><span class="home-mod-ic">📤</span><span class="home-mod-body"><div class="home-mod-title">Output-Mode Lab</div><div class="home-mod-desc">Append vs update vs complete on one aggregation.</div></span></button>
          <button class="home-mod-card" data-goto="watermark-lab"><span class="home-mod-ic">💧</span><span class="home-mod-body"><div class="home-mod-title">Watermark Lab</div><div class="home-mod-desc">Drag event times and watch late data drop.</div></span></button>
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
