// Module 11 — State Backends
// Interactive comparison: HashMap (heap) vs RocksDB (disk-based).
// Simulate read/write latency, checkpoint size, and GC pressure
// at different state sizes. Uber fraud detection as the running example.

import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const METRICS = {
  hashmap: {
    readLatency:   (stateSize) => 0.01 + stateSize * 0.0001,  // ms
    writeLatency:  (stateSize) => 0.02 + stateSize * 0.0002,
    checkpointMs:  (stateSize) => stateSize * 0.5,             // ms per checkpoint
    memoryMB:      (stateSize) => stateSize * 0.8,
    gcRisk:        (stateSize) => Math.min(100, stateSize * 2),
    maxStateMB:    () => 'Bounded by JVM heap',
  },
  rocksdb: {
    readLatency:   (stateSize) => 0.3 + stateSize * 0.001,
    writeLatency:  (stateSize) => 0.4 + stateSize * 0.0005,
    checkpointMs:  (stateSize) => stateSize * 0.1,
    memoryMB:      (stateSize) => Math.min(stateSize * 0.1, 512),
    gcRisk:        () => 5,
    maxStateMB:    () => 'Unbounded (disk)',
  },
};

const FEATURES = [
  { label:'Storage location',       hm:'JVM heap (on-heap)',      rdb:'Native heap + disk (off-heap)' },
  { label:'Read latency',           hm:'~0.01 ms (HashMap lookup)',rdb:'~0.3–1 ms (point read)' },
  { label:'Write latency',          hm:'~0.02 ms',               rdb:'~0.4–2 ms (LSM write)' },
  { label:'Checkpoint cost',        hm:'Full copy (slow for large)',rdb:'Incremental (only changed SSTs)' },
  { label:'State size limit',       hm:'JVM heap size',           rdb:'Disk capacity (TB-scale)' },
  { label:'GC pressure',            hm:'High with large state',   rdb:'None (off-heap)' },
  { label:'Incremental checkpoints',hm:'No',                      rdb:'Yes' },
  { label:'Best for',               hm:'<1 GB state, low latency',rdb:'>1 GB state, large-scale' },
];

const STATE_TYPES = [
  { id:'value',     label:'ValueState<T>',        icon:'📦', desc:'Single value per key. Most common. Used for: last known speed, fraud flag, trip start time.', uber:'FraudDetector stores last trip timestamp per driver as ValueState<Long>.' },
  { id:'list',      label:'ListState<T>',          icon:'📋', desc:'Ordered list per key. Append-efficient. Used for: event history, window buffers.', uber:'Store last 5 GPS pings per driver as ListState<GPSEvent> for trajectory analysis.' },
  { id:'map',       label:'MapState<K,V>',         icon:'🗺️', desc:'Key-value map per keyed stream key. Efficient partial updates.', uber:'Per-driver trip count by hour: MapState<Integer, Long> (hour→count).' },
  { id:'reducing',  label:'ReducingState<T>',      icon:'📊', desc:'Automatically reduces with a ReduceFunction. Always holds one value (the running reduction).', uber:'Running sum of GPS distance per driver per window.' },
  { id:'aggregating',label:'AggregatingState<IN,ACC,OUT>',icon:'➕', desc:'Like ReducingState but input/accumulator/output can differ. Flexible.', uber:'Running (count, totalSpeed) accumulator → avg speed output.' },
];

const IQS = [
  { q:'When should you choose RocksDB over HashMap state backend?', a:'Choose RocksDB when: (1) your total keyed state exceeds available JVM heap (TB-scale driver state at Uber), (2) you need incremental checkpoints — RocksDB only uploads changed SSTables, reducing checkpoint time from minutes to seconds for large state, (3) you experience GC pauses affecting latency — RocksDB is off-heap so it doesn\'t trigger GC. Choose HashMap when latency is critical (<1ms reads) and state fits comfortably in heap — fraud feature scoring at low cardinality, for example.' },
  { q:'What is an incremental checkpoint and why does RocksDB support it but HashMap doesn\'t?', a:'An incremental checkpoint uploads only the state changes since the last checkpoint, not the full state. RocksDB is built on an LSM (Log-Structured Merge) tree: new writes go to immutable SSTables that never change. Flink tracks which SSTables are new since the last checkpoint and only uploads those to S3. HashMap backend stores state as a Java heap object — a single snapshot means serializing and uploading the entire in-memory map every time, with no delta concept.' },
  { q:'How does Flink\'s state TTL (Time-To-Live) work?', a:'StateTtlConfig attaches a timestamp to every state entry. On each read or write, Flink checks if the entry has expired. Expired entries are cleaned up lazily (on next access) or eagerly in the background (RocksDB compaction filter). This avoids unbounded state growth: at Uber, driver state that hasn\'t seen an event in 24 hours is auto-expired, preventing the state backend from growing to TBs for rarely-active drivers.' },
  { q:'What happens to in-flight state during a failover?', a:'Flink restores operator state from the latest completed checkpoint stored in the state backend (S3/HDFS). For HashMap, Flink downloads the full serialized snapshot and deserializes into the JVM heap. For RocksDB, Flink downloads SSTables and opens a new RocksDB instance pointing at them. The state is then exactly as it was at checkpoint time — all writes after the checkpoint are discarded and will be replayed from source (Kafka rewind to checkpointed offsets).' },
  { q:'Can different operators in the same job use different state backends?', a:'Yes — state backend is configured per-operator using env.set_state_backend() globally or stateBackend annotation per transform. You might use HashMap for a latency-sensitive scoring operator and RocksDB for a large windowed aggregation in the same pipeline. Checkpoints still coordinate across all operators through the barrier protocol; each operator serializes its state to its configured backend\'s target path.' },
];

export function mount(container) {
  let stateSize = 10; // thousands of keys
  let selectedType = STATE_TYPES[0];

  container.innerHTML = `
    ${rideSpine({ active: ['DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 11</span>
        <h1 class="module-title">State Backends</h1>
        <p class="module-subtitle">HashMap vs RocksDB — see how your choice of state backend affects latency, checkpoint cost, and GC pressure at Uber scale.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="compare">Comparison</button>
      <button class="tab-btn" data-tab="types">State Types</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="compare">
      <div class="sb-controls card">
        <label class="ctrl-label">Keyed state entries: <strong id="ss-val">${stateSize}K drivers</strong></label>
        <input type="range" id="ss-slider" min="1" max="100" value="${stateSize}" style="width:200px">
        <span style="font-size:12px;color:var(--text-secondary);margin-left:16px">Drag to simulate Uber scale (1M = 1000K entries)</span>
      </div>
      <div id="sb-metrics-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0"></div>
      <div class="card p-24">
        <h3 style="margin:0 0 16px">Feature Comparison</h3>
        <div class="scroll-x">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr>
                ${['Feature','HashMap (Heap)','RocksDB (Off-heap)'].map(h => `<th style="padding:10px 14px;text-align:left;border-bottom:1px solid var(--border);color:var(--text-secondary);font-weight:600">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${FEATURES.map((f,i) => `
                <tr style="border-bottom:1px solid var(--border)${i===FEATURES.length-1?';border-bottom:none':''}">
                  <td style="padding:10px 14px;color:var(--text-secondary)">${f.label}</td>
                  <td style="padding:10px 14px;color:var(--text);font-family:var(--font-mono,monospace);font-size:12px">${f.hm}</td>
                  <td style="padding:10px 14px;color:var(--text);font-family:var(--font-mono,monospace);font-size:12px">${f.rdb}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="grid-2" style="gap:20px;margin-top:20px">
        <div class="card p-24">
          <h4 style="margin:0 0 12px;color:#6366f1">HashMap Backend — Config</h4>
          ${pyCode('hashmap_backend')}
        </div>
        <div class="card p-24">
          <h4 style="margin:0 0 12px;color:#FF6B35">RocksDB Backend — Config</h4>
          ${pyCode('rocksdb_backend')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="types">
      <div style="padding:20px 28px 0;display:flex;flex-wrap:wrap;gap:10px" id="state-type-picker"></div>
      <div id="state-type-detail" style="padding:20px 28px 28px"></div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">State questions interviewers push on, answered against the ride.</div>
      </div>
      <div id="state-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More state Q&amp;A</div></div>
      <div class="iq-section" id="iq11-section"></div>
    </div>
  `;

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // IQ
  const iqSection = container.querySelector('#iq11-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq11-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq11-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  initRideSpine(container);
  const stateScen = container.querySelector('#state-scenarios');
  if (stateScen) stateScen.innerHTML = scenarioList(casesByModule('m11'));

  // State type picker
  const typePicker = container.querySelector('#state-type-picker');
  typePicker.innerHTML = STATE_TYPES.map(t => `
    <button class="op-pill${t.id === selectedType.id ? ' active' : ''}" data-tid="${t.id}">${t.icon} ${t.label}</button>
  `).join('');
  typePicker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = STATE_TYPES.find(t => t.id === btn.dataset.tid);
      typePicker.querySelectorAll('.op-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStateTypeDetail();
    });
  });

  function renderStateTypeDetail() {
    const t = selectedType;
    container.querySelector('#state-type-detail').innerHTML = `
      <div class="card p-24">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          <span class="fs-36">${t.icon}</span>
          <div>
            <div style="font-size:20px;font-weight:700;color:var(--text);font-family:var(--font-mono)">${t.label}</div>
            <div style="color:var(--text-secondary);font-size:13px;margin-top:4px">${t.desc}</div>
          </div>
        </div>
        <div class="lc-uber-box">
          <div class="lc-uber-label">🚗 Uber Example</div>
          <p style="font-size:13px">${t.uber}</p>
        </div>
        <div class="mt-16">
          <div class="section-eyebrow">Usage Pattern</div>
          <div class="code-block fs-11"><span class="lang-tag">PyFlink</span><pre>${stateCodeFor(t.id)}</pre></div>
        </div>
        <div style="margin-top:16px;padding:14px;background:var(--surface2);border-radius:8px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-secondary);margin-bottom:8px">State TTL (auto-expiry)</div>
          ${pyCode('state_ttl')}
        </div>
      </div>
    `;
  }

  // PyFlink usage patterns per state type (verified-shape; mirrors the
  // pyflink.datastream.state API used inside a KeyedProcessFunction).
  function stateCodeFor(id) {
    const snippets = {
      value: `# In open(self, ctx: RuntimeContext):
desc = ValueStateDescriptor("last_trip_ts", Types.LONG())
self.last_trip_ts = ctx.get_state(desc)

# In process_element():
last = self.last_trip_ts.value()      # None on first event
self.last_trip_ts.update(event["event_time"])`,
      list: `desc = ListStateDescriptor("recent_pings", Types.PICKLED_BYTE_ARRAY())
self.recent_pings = ctx.get_list_state(desc)

self.recent_pings.add(event)          # append
pings = list(self.recent_pings.get()) # read all`,
      map: `desc = MapStateDescriptor("trips_by_hour", Types.INT(), Types.LONG())
self.trips_by_hour = ctx.get_map_state(desc)

hour = (event["event_time"] // 3_600_000) % 24
prev = self.trips_by_hour.get(hour) or 0
self.trips_by_hour.put(hour, prev + 1)`,
      reducing: `desc = ReducingStateDescriptor(
    "total_dist", lambda a, b: a + b, Types.DOUBLE())
self.total_dist = ctx.get_reducing_state(desc)

self.total_dist.add(event["distance_delta"])  # auto-reduces with sum
total = self.total_dist.get()`,
      aggregating: `desc = AggregatingStateDescriptor(
    "avg_speed", SpeedAggregate(), Types.PICKLED_BYTE_ARRAY())
self.avg_speed = ctx.get_aggregating_state(desc)

self.avg_speed.add(event)   # accumulate (count, sum)
avg = self.avg_speed.get()  # -> output`,
    };
    return snippets[id] || '';
  }

  // Metrics render
  const ssSlider = container.querySelector('#ss-slider');
  const ssVal = container.querySelector('#ss-val');

  function renderMetrics() {
    const grid = container.querySelector('#sb-metrics-grid');
    const m = METRICS;

    const mkCard = (backend, label, color) => {
      const r = m[backend];
      const read  = r.readLatency(stateSize).toFixed(2);
      const write = r.writeLatency(stateSize).toFixed(2);
      const ckpt  = r.checkpointMs(stateSize) > 1000
        ? (r.checkpointMs(stateSize)/1000).toFixed(1)+'s'
        : r.checkpointMs(stateSize).toFixed(0)+'ms';
      const mem   = r.memoryMB(stateSize).toFixed(0)+'MB';
      const gc    = r.gcRisk(stateSize).toFixed(0)+'%';

      const bars = [
        { label:'Read latency',    val: +read,   max:5,   unit:'ms', color },
        { label:'Write latency',   val: +write,  max:10,  unit:'ms', color },
        { label:'GC Risk',         val: +r.gcRisk(stateSize), max:100, unit:'%', color: r.gcRisk(stateSize) > 50 ? '#ef4444' : '#10b981' },
      ];

      return `
        <div class="card" style="padding:24px;border-top:4px solid ${color}">
          <h3 style="margin:0 0 16px;color:${color}">${label}</h3>
          ${bars.map(b => `
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:4px">
                <span>${b.label}</span><span style="font-weight:600;color:var(--text)">${b.val.toFixed(2)}${b.unit}</span>
              </div>
              <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.min(100, (b.val/b.max)*100)}%;background:${b.color};border-radius:3px;transition:width .3s"></div>
              </div>
            </div>
          `).join('')}
          <div class="grid-2" style="gap:12px;margin-top:16px">
            ${[['Checkpoint cost',ckpt],['Heap used',mem],['Incremental ckpt', backend==='rocksdb'?'✓ Yes':'✗ No'],['Max state',r.maxStateMB()]].map(([k,v]) => `
              <div style="padding:10px;background:var(--surface2);border-radius:8px">
                <div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${k}</div>
                <div style="font-size:13px;font-weight:600;color:${v.toString().startsWith('✓')?'#10b981':v.toString().startsWith('✗')?'#ef4444':'var(--text)}'}">${v}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    grid.innerHTML = mkCard('hashmap','HashMap (Heap)','#6366f1') + mkCard('rocksdb','RocksDB (Off-heap)','#FF6B35');
  }

  ssSlider.addEventListener('input', () => {
    stateSize = +ssSlider.value;
    ssVal.textContent = stateSize + 'K drivers';
    renderMetrics();
  });

  renderMetrics();
  renderStateTypeDetail();
}
