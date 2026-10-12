// Module 18 — Performance Tuning
// Interactive checklist: 6 categories, click a category to expand
import { rideSpine, initRideSpine } from '../components/story-ui.js';
// its tuning items with before/after config and Uber impact.

const CATEGORIES = [
  {
    id:'parallelism', label:'Parallelism & Slots', icon:'⚙️', color:'#6366f1',
    summary:'Right-sizing parallelism eliminates both under-use (idle cores) and over-use (excess scheduling overhead).',
    items:[
      { title:'Set parallelism per operator, not globally', impact:'High',
        before:`env.set_parallelism(1)  # default — single-threaded`,
        after:`env.set_parallelism(4)  # global default
# Override for bottleneck:
stream.key_by(...).process(fraud).set_parallelism(8)`,
        uber:'Uber sets source parallelism = Kafka partitions, window aggregation = 2× source, sink = source. Avoids unnecessary shuffles at boundary changes.' },
      { title:'Enable slot sharing (default) — don\'t disable it', impact:'High',
        before:`# Accidentally disabled:\nenv.disable_operator_chaining()\n# Now each operator needs its own slot`,
        after:`# Leave default ON:\n# slot sharing = 4 slots for 4-operator pipeline at p=4\n# instead of 16 slots without sharing`,
        uber:'Uber\'s 4-operator fraud pipeline at p=256 needs 256 slots (not 1024). Saves ~768 TaskManager threads.' },
      { title:'Avoid global operator chaining disable for debugging', impact:'Medium',
        before:`env.disable_operator_chaining()  # "for debugging"`,
        after:`# Debug one operator at a time:\nstream.map(fn).start_new_chain()  # break here only\n# Or use .slot_sharing_group() to isolate`,
        uber:'Disabling global chaining on a 6-operator pipeline at p=256 adds 5 extra network hops per event — 1.5ms extra latency at Uber scale.' },
    ],
  },
  {
    id:'state', label:'State & Memory', icon:'🗄️', color:'#FF6B35',
    summary:'State backend choice and TTL configuration are the biggest levers for memory stability at scale.',
    items:[
      { title:'Use RocksDB + incremental checkpoints for large state', impact:'Critical',
        before:`env.set_state_backend(HashMapStateBackend())\n# 600MB driver state -> GC pauses every 30s`,
        after:`env.set_state_backend(\n    EmbeddedRocksDBStateBackend(enable_incremental_checkpointing=True))\n# Checkpoint: only changed SSTables -> 5-20MB vs 600MB`,
        uber:'Switching to RocksDB + incremental checkpoints cut Uber\'s fraud pipeline checkpoint time from 45s to 4s. GC pauses dropped from 2s to zero.' },
      { title:'Set state TTL to prevent unbounded growth', impact:'High',
        before:`# No TTL — state grows forever\ndesc = ValueStateDescriptor("trips", Types.LONG())\n# After 1 week: 50GB of stale driver state`,
        after:`ttl = (StateTtlConfig\n    .new_builder(Time.hours(24))\n    .set_update_type(StateTtlConfig.UpdateType.OnCreateAndWrite)\n    .cleanup_in_rocksdb_compact_filter(1000)\n    .build())\ndesc.enable_time_to_live(ttl)`,
        uber:'TTL of 24h on driver state keeps RocksDB size stable at ~800MB regardless of how many distinct drivers are seen.' },
      { title:'Tune RocksDB block cache and write buffer', impact:'Medium',
        before:`# Default: 64MB block cache — too small\n# state.backend.rocksdb.block.cache-size: 64mb`,
        after:`# flink-conf.yaml:\nstate.backend.rocksdb.block.cache-size: 256mb\nstate.backend.rocksdb.writebuffer.size: 64mb\nstate.backend.rocksdb.writebuffer.count: 3\n# Cuts read amplification by ~3x on hot keys`,
        uber:'Uber sets 512MB block cache for the fraud detection TMs. Cache hit rate: 94%, reducing RocksDB read latency from 0.8ms to 0.12ms.' },
    ],
  },
  {
    id:'checkpoints', label:'Checkpointing', icon:'✅', color:'#10b981',
    summary:'Checkpoint tuning prevents checkpoint lag from blocking processing and keeps recovery time predictable.',
    items:[
      { title:'Set min pause between checkpoints, not just interval', impact:'High',
        before:`env.enable_checkpointing(30_000)\n# If checkpoint takes 28s, next starts 2s after last ends\n# -> 95% of time spent checkpointing`,
        after:`env.enable_checkpointing(30_000)\ncfg.set_min_pause_between_checkpoints(10_000)\n# Guaranteed 10s gap between end and next start\n# -> processing-first, checkpoint-second`,
        uber:'Without min pause, Uber\'s 600MB state checkpoint cascaded — each 35s checkpoint overlapped the next. Min pause=10s stabilized throughput.' },
      { title:'Enable unaligned checkpoints under backpressure', impact:'Medium',
        before:`// Default aligned: barrier waits for all inputs\n// Under backpressure → barrier takes 60s+ to propagate`,
        after:`env.get_checkpoint_config().enable_unaligned_checkpoints()\n# Barrier passes immediately; in-flight records\n# included in snapshot. Checkpoint completes in <5s.`,
        uber:'Flink team recommends unaligned checkpoints when checkpoint duration > 80% of interval. Uber enables it on their high-traffic pipelines.' },
      { title:'Retain checkpoints on cancellation', impact:'Low',
        before:`// Default: delete checkpoint on cancel\n// Manual savepoint required before stopping`,
        after:`cfg.set_externalized_checkpoint_cleanup(\n    cfg.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION)\n# Job can be restarted from last checkpoint\n# without a manual savepoint`,
        uber:'Uber ops always sets RETAIN_ON_CANCELLATION on production jobs — allows quick restart after accidental kill without data replay from hours back.' },
    ],
  },
  {
    id:'network', label:'Network & Serialization', icon:'🌐', color:'#f59e0b',
    summary:'Network buffer tuning and serialization format choice determine throughput ceiling.',
    items:[
      { title:'Prefer POJO or Avro types over generic serializers', impact:'High',
        before:`# Kryo/pickle fallback (slow, large):\nstream = ...  # output_type defaults to generic pickling\n# reflective serialization -> 3x slower`,
        after:`# Explicit Types (Flink native serializer):\nstream = raw.map(parse, output_type=Types.ROW_NAMED(\n    ["driver_id", "speed"], [Types.STRING(), Types.INT()]))\n# zero-reflection serializer generated from the schema`,
        uber:'Converting Uber\'s GPS event from Map<String,Object> to GPSEvent POJO reduced serialization cost from 18% to 4% of CPU.' },
      { title:'Tune network buffer count per channel', impact:'Medium',
        before:`# Default:\ntaskmanager.network.memory.buffers-per-channel: 2\ntaskmanager.network.memory.floating-buffers-per-gate: 8`,
        after:`# For high-throughput, increase buffers:\ntaskmanager.network.memory.buffers-per-channel: 4\ntaskmanager.network.memory.floating-buffers-per-gate: 16\n# Reduces credit starvation under burst traffic`,
        uber:'Doubling buffer count reduced Uber\'s GPS pipeline tail latency (p99) from 120ms to 65ms during traffic spikes.' },
      { title:'Enable object reuse for hot paths', impact:'Low',
        before:`# Default: new object per record\nenv.get_config().disable_object_reuse()  # (default)`,
        after:`env.get_config().enable_object_reuse()\n# Flink reuses record objects across operator calls\n# WARNING: never store a reference to a reused record\n# Saves ~20% GC on high-throughput maps`,
        uber:'Enabled only on stateless map/filter operators. Operators that store references (like ProcessFunction with state) must use .copy() explicitly.' },
    ],
  },
  {
    id:'sql', label:'SQL Optimization', icon:'📊', color:'#8b5cf6',
    summary:'Flink SQL tuning closes the performance gap between SQL and hand-written DataStream code.',
    items:[
      { title:'Enable mini-batch for aggregations', impact:'High',
        before:`# Default: process every record immediately\n# 1M events/sec → 1M state accesses/sec`,
        after:`table.exec.mini-batch.enabled: true\ntable.exec.mini-batch.allow-latency: 5s\ntable.exec.mini-batch.size: 5000\n# Buffer 5000 records or 5s, then process batch\n# Reduces state access by ~50x`,
        uber:'Mini-batch on the hourly driver stats aggregation reduced RocksDB write amplification from 1M/s to 20K/s.' },
      { title:'Use EXPLAIN to catch missing predicate pushdown', impact:'High',
        before:`-- Without pushdown:\nSELECT * FROM gps_events WHERE speed > 80\n-- EXPLAIN shows: Filter(speed>80) after TableScan\n-- → reads all records, filters after`,
        after:`-- With Kafka connector that supports pushdown:\n-- EXPLAIN shows: TableSourceScan(push_down=[speed>80])\n-- → broker-side filter, 60% fewer records deserialized\n-- Note: pushdown support depends on connector`,
        uber:'Uber pushes partition pruning filters into their internal Kafka connector, reducing broker reads for fraud-alert queries by 65%.' },
      { title:'Two-phase aggregation verification', impact:'Medium',
        before:`-- EXPLAIN missing LocalWindowAggregate:\n-- only GlobalWindowAggregate\n-- → all records shuffled before aggregation`,
        after:`-- EXPLAIN should show both phases:\n-- LocalWindowAggregate (pre-agg per subtask)\n-- → GlobalWindowAggregate (merge)\n-- Enable: table.optimizer.agg-phase-strategy: TWO_PHASE`,
        uber:'Two-phase agg on the 10-min GPS window reduced shuffle data from 1M rows/window to ~4K partial aggregates.' },
    ],
  },
  {
    id:'jvm', label:'JVM & GC', icon:'☕', color:'#ef4444',
    summary:'GC tuning prevents stop-the-world pauses from spiking latency and missing checkpoints.',
    items:[
      { title:'Use G1GC with tuned region size', impact:'High',
        before:`# Default JVM heap settings — no explicit GC config\n-Xms512m -Xmx4g\n# G1GC with default 1MB regions for large heap → long marking`,
        after:`# flink-conf.yaml:\nenv.java.opts.taskmanager: >-\n  -XX:+UseG1GC\n  -XX:G1HeapRegionSize=32m\n  -XX:MaxGCPauseMillis=200\n  -XX:InitiatingHeapOccupancyPercent=35\n  -Xms8g -Xmx8g  # pre-size to avoid resize pauses`,
        uber:'G1GC with 32MB regions and pre-sized heap reduced Uber\'s GC pause frequency from 8/min to 1/min on fraud TMs.' },
      { title:'Pre-allocate off-heap memory for RocksDB', impact:'Medium',
        before:`# RocksDB allocates off-heap at runtime\n# Causes JVM native memory OOM under traffic burst`,
        after:`# Reserve explicit managed memory for RocksDB:\ntaskmanager.memory.managed.fraction: 0.4\n# 40% of TM memory goes to RocksDB block cache\n# + write buffers, preventing OOM surprises`,
        uber:'Uber sets managed.fraction=0.5 on RocksDB TMs — 50% heap for JVM, 50% off-heap for RocksDB. OOM incidents dropped to zero.' },
      { title:'Profile with async-profiler before tuning', impact:'Critical',
        before:`// Guess-based tuning: "maybe it's the state?"\n// Tune RocksDB, no improvement. Tune GC, no improvement.\n// Wasted 3 hours.`,
        after:`# Run async-profiler on bottleneck TM:\n./profiler.sh -d 60 -f /tmp/flame.html <pid>\n# Flamegraph shows: 45% time in UDFDescriptors.decode()\n# → fix the Kryo deserialization, not RocksDB`,
        uber:'Uber found that 30% of FraudDetector CPU was spent deserializing Avro CDC events. Switching to binary Protobuf cut CPU by 25% total.' },
    ],
  },
];

const IQS = [
  { q:'What is the first thing you check when a Flink job is slower than expected?', a:'Check the Flink UI Backpressure tab first — it tells you which operator is the bottleneck without any profiling. If FraudDetector shows 0.8+ backpressure ratio, that\'s the bottleneck. Next, check its busyTimeMsPerSecond vs idleTimeMsPerSecond. If busy is high → CPU-bound (profile with async-profiler). If idle is high with backpressure → it\'s waiting on downstream (sink is slow). Never guess-tune before you know the bottleneck.' },
  { q:'How do you diagnose a GC pause causing checkpoint timeouts?', a:'Evidence: TaskManager logs show "GC overhead limit exceeded" or "java.lang.OutOfMemoryError". Checkpoint completes intermittently at 2–3× normal time. Mitigation: (1) pre-size heap (-Xms=-Xmx), (2) tune G1GC regions, (3) move to RocksDB to reduce on-heap state. If GC is unavoidable, increase checkpoint timeout (cfg.set_checkpoint_timeout()) and tolerable failures (cfg.set_tolerable_checkpoint_failure_number(2)) to survive occasional long GC pauses without job failure.' },
  { q:'What is the managed memory fraction and why does it matter for RocksDB?', a:'Flink divides TaskManager memory into: framework heap, task heap (JVM objects), managed memory (off-heap, for RocksDB and batch operators), network buffers, and JVM overhead. taskmanager.memory.managed.fraction controls what percentage goes to managed memory. RocksDB\'s block cache and write buffers are allocated from managed memory. If it\'s too small, RocksDB allocates off-heap beyond the configured budget, causing native OOM. If too large, the JVM heap is starved. Uber uses 0.4–0.5 for state-heavy jobs.' },
  { q:'How do you handle hot-key skew causing one subtask to lag?', a:'Hot keys (e.g., one driver with 100× normal GPS ping rate) cause one keyBy subtask to receive disproportionate load. Solutions: (1) Pre-aggregate before keyBy using a two-step approach: first key by (driverId, random_0_to_N) for local partial aggregates, then keyBy(driverId) for merge. (2) Increase parallelism of the bottleneck operator (but keyBy partitioning doesn\'t help if the key itself is hot). (3) Use keyBy with a composite key that distributes the hot key across subtasks and then re-merge. (4) Identify and rate-limit the hot-key source.' },
  { q:'What tuning changes give the biggest performance gain in practice?', a:'In rough impact order: (1) Correct parallelism — 4× speedup from 1 to 4 subtasks. (2) RocksDB + incremental checkpoints — eliminates GC and cuts checkpoint time 10×. (3) State TTL — prevents state from growing unbounded (stability, not raw throughput). (4) Mini-batch for SQL aggregations — 50× reduction in state access frequency. (5) POJO/Avro over Kryo — 3× serialization speedup. (6) Operator chaining (usually on by default). Buffer tuning and JVM flags are marginal — rarely > 10% gain.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '⚙️', title: 'Parallelism & slots', body: 'Right-sizing parallelism is the single biggest lever — too little starves throughput, too much wastes scheduling. Slot sharing keeps the cluster small.' },
  { icon: '🗄️', title: 'State & memory', body: 'RocksDB + incremental checkpoints and State TTL are what keep memory flat and GC quiet as state grows to GBs.' },
  { icon: '✅', title: 'Checkpointing', body: 'Min-pause and unaligned checkpoints stop snapshots from eating the processing budget under load.' },
  { icon: '🌐', title: 'Network & serialization', body: 'POJO/Avro over reflective serializers and tuned buffers raise the throughput ceiling without more machines.' },
  { icon: '📊', title: 'SQL optimization', body: 'Mini-batch, two-phase aggregation, and predicate pushdown close the gap between SQL and hand-tuned DataStream.' },
  { icon: '☕', title: 'JVM & GC', body: 'G1GC tuning and managed-memory sizing prevent stop-the-world pauses that spike latency and miss checkpoints.' },
];

const PROBLEMS = [
  { naive: 'Run everything at the default parallelism of 1.', fail: 'A single-threaded operator <b>caps throughput</b> far below the hardware\'s capacity.', fix: 'Size parallelism per operator to the bottleneck; let slot sharing keep the slot count low.' },
  { naive: 'Keep all state on the JVM heap.', fail: 'Large heap state causes <b>multi-second GC pauses</b> and 600 MB full checkpoints every interval.', fix: 'RocksDB + incremental checkpoints cut checkpoints to MBs and eliminate GC pauses.' },
  { naive: 'Guess at the cause and tune blindly.', fail: 'Hours tuning RocksDB when the real cost was <b>Kryo deserialization</b> — no improvement.', fix: 'Profile first (backpressure tab, async-profiler) so you tune the actual bottleneck.' },
  { naive: 'Let state accumulate with no TTL.', fail: 'State grows unbounded — <b>50 GB of stale keys</b> after a week and eventual OOM.', fix: 'State TTL expires idle keys, keeping RocksDB size stable regardless of cardinality.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🚀</div>
      <div>
        <div class="sm-def-eyebrow">What is performance tuning?</div>
        <p class="sm-def-lead"><b>Performance tuning</b> is making a <em>correct</em> Flink job also <em>fast, stable, and cheap</em> — hitting its throughput and latency targets without GC pauses, checkpoint lag, or unbounded state. It spans six lever categories (parallelism, state, checkpoints, network, SQL, JVM), but its first rule is <b>measure before you tune</b>. On ride <b>R-4471</b>, it's what keeps the fraud pipeline at 1M events/sec with &lt;10ms latency through the airport surge (DEFECT-6).</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Guess-based vs. measure-first</div>
      <div class="section-desc">The methodology matters more than any single flag.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">❌ Guess-based tuning</div>
        <p class="sm-vs-sub">Change flags and hope.</p>
        <ul>
          <li>"Maybe it's the state backend?"</li>
          <li>Tune RocksDB, no change</li>
          <li>Hours wasted on the wrong lever</li>
        </ul>
        <div class="sm-vs-note">The bottleneck was Kryo deserialization all along.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">✅ Measure, then tune</div>
        <p class="sm-vs-sub">Find the bottleneck first.</p>
        <ul>
          <li>Backpressure tab names the slow operator</li>
          <li>busy vs idle time → CPU or downstream</li>
          <li>async-profiler flamegraph pinpoints it</li>
        </ul>
        <div class="sm-vs-note">Fix the one thing that actually costs time.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The six categories of levers</div>
      <div class="section-desc">Where Flink performance is won or lost.</div>
    </div>
    <div class="sm-why-grid">
      ${WHY_REASONS.map(r => `
        <div class="sm-why">
          <div class="sm-why-ic">${r.icon}</div>
          <div class="sm-why-title">${r.title}</div>
          <p>${r.body}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The problem tuning solves</div>
      <div class="section-desc">Four ways an untuned job underperforms — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Tuning</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The tuning loop</div>
    </div>
    <div class="sm-keyed card">
      <p>Effective tuning is a loop, always anchored on a measurement — never a guess.</p>
      <ul>
        <li><b>Measure</b> — the Flink UI backpressure tab finds the bottleneck operator for free.</li>
        <li><b>Diagnose</b> — busy vs idle time, GC logs, or an async-profiler flamegraph say <em>why</em>.</li>
        <li><b>Tune one lever</b> — change the single thing that matters, then re-measure to confirm.</li>
      </ul>
      <div class="sm-keyed-flow">
        <b>measure</b> (backpressure) <span class="sm-arrow">→</span> <b>diagnose</b> (profile) <span class="sm-arrow">→</span> tune one lever <span class="sm-arrow">→</span> <b>re-measure</b> <span class="sm-arrow">→</span> repeat
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now work the checklist</div>
        <p>You know <b>why</b> tuning is measure-first — browse all six categories with before/after config and real Uber impact numbers.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="checklist">Open the Tuning Checklist →</button>
    </div>
  </div>
`;

export function mount(container) {
  let openCat = CATEGORIES[0].id;
  let openItem = null;

  container.innerHTML = `
    ${rideSpine({ active: ['LOCATION_UPDATED'], incidents: ['DEFECT-6'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 18</span>
        <h1 class="module-title">Performance Tuning</h1>
        <p class="module-subtitle">Six categories of Flink performance levers — click any item to see before/after config and real-world Uber impact numbers.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="checklist">Tuning Checklist</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="checklist">
      <div class="perf-layout">
        <div class="perf-cat-list" id="perf-cats"></div>
        <div class="perf-items" id="perf-items"></div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq18-section"></div>
    </div>
  `;

  initRideSpine(container);

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Tuning Checklist tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const iqSec = container.querySelector('#iq18-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq18-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq18-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  function render() {
    const catList = container.querySelector('#perf-cats');
    const itemsEl = container.querySelector('#perf-items');
    const cat = CATEGORIES.find(c => c.id === openCat);

    catList.innerHTML = CATEGORIES.map(c => `
      <button class="perf-cat-btn${c.id === openCat ? ' active' : ''}" data-cid="${c.id}"
        style="${c.id === openCat ? `border-color:${c.color};color:${c.color}` : ''}">
        <span style="font-size:20px">${c.icon}</span>
        <span>${c.label}</span>
        <span class="badge" style="margin-left:auto;font-size:9px;background:var(--surface2)">${c.items.length}</span>
      </button>
    `).join('');
    catList.querySelectorAll('.perf-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => { openCat = btn.dataset.cid; openItem = null; render(); });
    });

    itemsEl.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${cat.color};margin-bottom:4px">${cat.icon} ${cat.label}</div>
        <p style="color:var(--text-secondary);font-size:13px;margin:0">${cat.summary}</p>
      </div>
      ${cat.items.map((item, i) => {
        const isOpen = openItem === i;
        const impactColor = item.impact === 'Critical' ? '#ef4444' : item.impact === 'High' ? '#f59e0b' : '#10b981';
        return `
          <div class="perf-item${isOpen ? ' open' : ''}" data-idx="${i}">
            <div class="perf-item-header">
              <span class="perf-item-title">${item.title}</span>
              <span class="badge" style="background:${impactColor}22;color:${impactColor};border:1px solid ${impactColor}44;font-size:10px;flex-shrink:0">${item.impact}</span>
              <span class="iq-chevron" style="margin-left:4px">${isOpen ? '↓' : '›'}</span>
            </div>
            ${isOpen ? `
              <div class="perf-item-body">
                <div class="grid-2" style="gap:12px;margin-bottom:12px">
                  <div>
                    <div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;margin-bottom:6px">Before ✗</div>
                    <div class="code-block" style="font-size:10.5px"><pre>${item.before}</pre></div>
                  </div>
                  <div>
                    <div style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;margin-bottom:6px">After ✓</div>
                    <div class="code-block" style="font-size:10.5px"><pre>${item.after}</pre></div>
                  </div>
                </div>
                <div class="lc-uber-box">
                  <div class="lc-uber-label">🚗 Uber Impact</div>
                  <p class="fs-125">${item.uber}</p>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;

    itemsEl.querySelectorAll('.perf-item').forEach(el => {
      el.querySelector('.perf-item-header').addEventListener('click', () => {
        const idx = +el.dataset.idx;
        openItem = openItem === idx ? null : idx;
        render();
      });
    });
  }

  render();
}
