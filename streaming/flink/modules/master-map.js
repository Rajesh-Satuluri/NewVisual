// Master Map — the whole curriculum on one page, organised as the journey a
// GPS event takes through Uber's Flink pipeline. Every node jumps to its module.
const STAGES = [
  { name: 'Ingest', color: '#38BDF8', nodes: [
    ['m16', '🔌', 'Connectors', '1M GPS events/sec land from Kafka'],
    ['m02', '🌊', 'Streaming Fundamentals', 'Unbounded stream, not a batch'],
    ['m08', '⏱️', 'Time Concepts', 'Each ping carries an event time'],
  ]},
  { name: 'Distribute', color: '#A78BFA', nodes: [
    ['m03', '🏛️', 'Architecture', 'JobManager schedules, TMs execute'],
    ['m05', '⚙️', 'Parallelism', '256 subtasks share the load'],
    ['m06', '🔧', 'Operators', 'map / filter / process the records'],
    ['m07', '🔗', 'Sources & Sinks', 'Kafka source & sink, exactly-once'],
  ]},
  { name: 'Reason about time', color: '#FF6B35', nodes: [
    ['m09', '💧', 'Watermarks', 'Handle drivers in tunnels (late GPS)'],
    ['m10', '🪟', 'Windows', 'Aggregate trips per 10s window'],
    ['m15', '📊', 'Flink SQL & Table API', 'SQL & Table API over streams'],
    ['m17', '📊', 'Flink SQL', 'Surge pricing as a continuous query'],
  ]},
  { name: 'Remember & survive', color: '#34D399', nodes: [
    ['m11', '🗄️', 'State Management', 'Per-driver state in RocksDB'],
    ['m12', '✅', 'Checkpointing', 'Snapshot state for exactly-once'],
    ['m13', '🛡️', 'Fault Tolerance', 'Recover a dead TaskManager'],
    ['m13b', '💾', 'Savepoints', 'Upgrade the fraud model safely'],
    ['m14', '🌡️', 'Backpressure', 'Absorb the Friday-night surge'],
  ]},
  { name: 'Deliver & optimise', color: '#FCD34D', nodes: [
    ['m18', '🚀', 'Performance', 'Tune serialization, state, network'],
    ['m19', '🗺️', 'Uber Pipeline', 'The full end-to-end system'],
  ]},
];

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🗺️ Reference · Master Map</div>
        <h1 class="module-title">The Big Picture</h1>
        <p class="module-subtitle">Follow one GPS ping through Uber's real-time platform. Every concept in this course lives somewhere on this path — click any node to jump straight to it.</p>
      </div>
      <div class="tab-content active">
        <div class="mm-legend">
          ${STAGES.map(s => `<span><span class="mm-dot" style="background:${s.color}"></span>${s.name}</span>`).join('')}
        </div>
        ${STAGES.map(s => `
          <div class="mm-stage">
            <div class="mm-stage-title" style="color:${s.color}">
              ${s.name}<span class="mm-stage-line" style="background:${s.color};opacity:.25"></span>
            </div>
            <div class="mm-nodes">
              ${s.nodes.map(([id, ic, t, sub]) => `
                <button class="mm-node" data-goto="${id}" style="--nodeColor:${s.color}">
                  <span class="mm-node-ic">${ic}</span>
                  <span>
                    <div class="mm-node-t">${t}</div>
                    <div class="mm-node-s">${sub}</div>
                  </span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
        <div class="card accent" style="margin-top:24px">
          <h3 style="margin:0 0 8px;font-size:15px">💡 How to use this map</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0">
            Reading top-to-bottom mirrors the order concepts fire in a real job: data arrives, gets distributed
            across parallel tasks, is reasoned about in event time, is remembered as fault-tolerant state, and is
            finally optimised and delivered. If a topic ever feels abstract, come back here and place it on the path.
          </p>
        </div>
      </div>
    </div>
  `;
  const onClick = (e) => {
    const n = e.target.closest('[data-goto]');
    if (n) window.location.hash = n.dataset.goto;
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
