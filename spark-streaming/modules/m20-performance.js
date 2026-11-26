// M20 · Performance & Tuning — Lakehouse & Ops  (tuning model: deterministic)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

export const IQ = [
  { q: 'What are the main tuning knobs for a streaming query?', a: '<p><b>Parallelism:</b> source partitions (Kafka), executor <b>cores</b>, and <code>spark.sql.shuffle.partitions</code> (stateful task count — fixed by checkpoint). <b>Ingest rate:</b> <code>maxOffsetsPerTrigger</code> / <code>maxFilesPerTrigger</code>. <b>Trigger:</b> interval vs default. <b>State:</b> watermark delay, RocksDB state store. <b>Writes:</b> file compaction, sink batching. You balance these so <b>batchDuration &lt; trigger interval</b> while keeping state bounded (M05, M08, M10).</p>', tip: 'Parallelism (partitions/cores/shuffle.partitions), ingest rate, trigger, state (watermark/RocksDB), writes. Balance for batchDuration < trigger.' },
  { q: 'How does shuffle.partitions affect a stateful streaming job?', a: '<p>It sets the number of <b>stateful tasks</b>, and state is <b>partitioned across exactly that many partitions</b> — <b>baked into the checkpoint</b>, so it <b>can\'t change</b> on a running query. Too <b>low</b> → under-parallelized, hot partitions, big per-task state. Too <b>high</b> → many tiny tasks, overhead, small-file pressure. Size it for <b>peak</b> key volume up front; changing it needs a new checkpoint (M03).</p>', tip: 'Stateful task + state partition count, fixed by checkpoint. Too low=hotspots, too high=overhead. Size for peak up front.' },
  { q: 'When and why use the RocksDB state store?', a: '<p>When state is <b>large</b> (millions of keys / GBs). The default state store is <b>on-heap</b> → GC pressure and OOM at scale. <b>RocksDB</b> keeps state <b>off-heap / on local disk</b> with an in-memory cache, scaling to very large state without blowing the JVM heap, plus <b>changelog checkpointing</b> for faster, cheaper commits. Small latency cost; essential for big stateful jobs (M10).</p>', tip: 'RocksDB = off-heap/on-disk state → avoids GC/OOM for large state + changelog checkpoint. Essential at scale.' },
  { q: 'How do you reduce per-batch processing time?', a: '<p><b>More parallelism</b> (partitions + cores), <b>less state</b> (tighter watermark, lower cardinality, RocksDB), <b>less shuffle</b> (broadcast small dims, fewer wide ops), <b>bounded batch size</b> (rate limits so a backlog doesn\'t create a giant batch), and <b>efficient encoders/formats</b>. Use the <code>durationMs</code> phase breakdown to target the actual bottleneck (addBatch vs getOffset vs walCommit) (M21).</p>', tip: 'Parallelism, less state, less shuffle (broadcast), bounded batches, efficient formats. Target the dominant durationMs phase.' },
  { q: 'What is the small-files problem and how do you fix it?', a: '<p>Frequent small micro-batches write <b>many tiny files</b> to the sink (and many state/log files) → slow reads, metadata bloat, degraded performance. Fixes: <b>OPTIMIZE</b>/auto-compaction and <b>optimizeWrite</b> (Delta), a <b>larger trigger interval</b> (bigger batches, fewer files), periodic <b>VACUUM</b>, and state-store snapshot/compaction tuning. A classic cost of high-frequency streaming writes (M19).</p>', tip: 'Many small batches → tiny files. Fix: OPTIMIZE/auto-compact, optimizeWrite, bigger trigger, VACUUM. Classic streaming cost.' },
  { q: 'How does trigger interval trade off latency vs efficiency?', a: '<p>A <b>shorter</b> interval (or default trigger) → lower latency but <b>smaller batches</b> (more overhead per row, more files, more frequent checkpoints). A <b>longer</b> interval → higher latency but <b>larger, more efficient</b> batches (better throughput, fewer files, cheaper checkpointing). Pick the <b>largest interval that meets your latency SLA</b> to maximize efficiency (M05).</p>', tip: 'Shorter trigger=lower latency, more overhead/files. Longer=efficient, higher latency. Pick largest interval meeting the SLA.' },
  { q: 'What causes data skew in a streaming job and how do you handle it?', a: '<p>A <b>hot key</b> (one category/user dominating) overloads one state partition/task → that task\'s batch time dominates. Handle it by <b>salting</b> the key (split a hot key into sub-keys, aggregate in two stages), increasing parallelism, or pre-aggregating. Skew shows up as one slow task while others idle — visible in the Spark UI task timeline (M21).</p>', tip: 'Hot key → one overloaded partition. Fix: salt the key (2-stage agg), more parallelism, pre-aggregate. Skew = one slow task.' },
  { q: 'How do rate limits help performance and stability?', a: '<p><code>maxOffsetsPerTrigger</code>/<code>maxFilesPerTrigger</code> <b>bound batch size</b>, so after a lag spike the backlog is processed in <b>many steady batches</b> instead of one oversized batch that overruns the trigger / OOMs. This keeps <b>batchDuration predictable</b> and the job stable while it catches up. There\'s no automatic backpressure, so you set these explicitly (M04).</p>', tip: 'Rate limits bound batch size → steady catch-up, predictable batchDuration, no OOM on backlog. Explicit, not automatic.' },
  { q: 'What role does serialization / state encoding play at scale?', a: '<p>State is serialized into the store each batch; a heavy/ inefficient state object inflates <b>memory and checkpoint IO</b>. Keep state <b>compact</b> (primitive-friendly, minimal fields), use efficient encoders, and avoid large per-key objects. For arbitrary state (<code>[flat]mapGroupsWithState</code>) the state class design directly drives memory and commit cost (M11).</p>', tip: 'Compact state objects → less memory + checkpoint IO. Efficient encoders; small per-key state. Matters most for arbitrary state.' },
  { q: 'Walk through diagnosing a job that can\'t keep up.', a: '<p>(1) Confirm via <b>batchDuration ≥ trigger</b> / <b>input &gt; processed rate</b> (M21). (2) Read <b>durationMs</b> phases: <b>addBatch</b> high → compute/state (add parallelism, RocksDB, tighter watermark); <b>getOffset</b> high → slow source; <b>walCommit</b> high → slow checkpoint storage. (3) Check <b>state/memory</b> trend (leak?) and <b>task skew</b> in the UI. (4) Apply the matching fix and re-measure. Iterate.</p>', tip: 'Confirm lag → read durationMs phases → check state/skew → apply targeted fix → re-measure. Methodical, metric-driven.' },
];

// Deterministic tuning model: given knobs, estimate batchDuration, throughput, state.
const INGEST_RPS = 200000; // incoming orders/sec (fixed load)
const TRIGGER_S = 10;

function model({ partitions, watermarkMin, rocksdb, rateLimitM }) {
  const rowsPerBatch = Math.min(INGEST_RPS * TRIGGER_S, rateLimitM * 1e6);
  // per-partition work; more partitions -> less per task (with diminishing returns + overhead)
  const perPartition = rowsPerBatch / partitions;
  const overhead = partitions * 6; // ms scheduling overhead
  // state ~ distinct keys retained ~ proportional to watermark window; rocksdb cuts memory cost
  const stateRows = Math.round(40 * (watermarkMin / 5) * 1000); // ~keys retained
  const stateCostMs = (rocksdb ? 0.00018 : 0.00055) * stateRows; // on-heap GC-heavy vs off-heap
  const computeMs = perPartition * 0.0009; // ms per row per partition slice
  const batchMs = Math.round(300 + computeMs + stateCostMs + overhead);
  const triggerMs = TRIGGER_S * 1000;
  const healthy = batchMs < triggerMs;
  const throughput = Math.round(rowsPerBatch / (batchMs / 1000)); // rows/sec achievable
  const oomRisk = !rocksdb && stateRows > 60000;
  return { rowsPerBatch, batchMs, triggerMs, healthy, throughput, stateRows, stateMemMB: Math.round(stateRows * (rocksdb ? 0.12 : 0.9) / 100) / 10, oomRisk };
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>Tuning a streaming job is one balancing act: keep <b>batchDuration under the trigger interval</b> while keeping <b>state bounded</b> and <b>cost reasonable</b>. A handful of knobs move those three.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>⚡ Parallelism</h4><p>Source partitions + executor cores + <code>shuffle.partitions</code> (state partition count — <b>fixed by checkpoint</b>, size for peak). More = faster batches, to a point (overhead).</p></div>
      <div class="ss-card"><h4>🚦 Ingest rate limits</h4><p><code>maxOffsetsPerTrigger</code> bounds batch size → steady catch-up after a lag spike, predictable batchDuration, no OOM on a backlog.</p></div>
      <div class="ss-card"><h4>🗄️ State strategy</h4><p>Tighter <b>watermark</b> = less retained state. <b>RocksDB</b> store = off-heap, scales to millions of keys without GC/OOM.</p></div>
      <div class="ss-card"><h4>📁 Write efficiency</h4><p>Bigger <b>trigger</b> = fewer, larger files; <b>OPTIMIZE</b>/compaction + <b>VACUUM</b> fight the small-files problem.</p></div>
    </div>
    <h3>The latency ↔ throughput ↔ state triangle</h3>
    <p>Shorter trigger → lower latency but smaller, less efficient batches + more files. Bigger watermark → more completeness but more state + latency. More parallelism → faster but scheduling overhead and (for shuffle partitions) a checkpoint-pinned choice. You pick the point that meets the <b>SLA</b> at the lowest cost.</p>
    <div class="ss-callout"><b>Diagnose with metrics (M21):</b> read the <code>durationMs</code> phase breakdown — <b>addBatch</b> high → compute/state, <b>getOffset</b> → slow source, <b>walCommit</b> → slow checkpoint storage. Fix the dominant phase, then re-measure.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Turn the knobs and watch a <b>deterministic tuning model</b> estimate batch duration, throughput and state for a fixed <b>200k orders/sec</b> load on a <b>10s</b> trigger. Goal: keep the bar <b>green</b> (batchDuration under the trigger) without an OOM-risk state. <i>(A teaching model of the trade-offs, not a Spark benchmark.)</i></p></div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">shuffle.partitions:
      <input type="range" id="m20-part" min="20" max="400" step="20" value="100" style="vertical-align:middle">
      <span id="m20-part-v" style="font-family:var(--font-mono)">100</span></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">watermark (min):
      <input type="range" id="m20-wm" min="1" max="30" step="1" value="10" style="vertical-align:middle">
      <span id="m20-wm-v" style="font-family:var(--font-mono)">10</span></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">maxOffsets/trigger (M):
      <input type="range" id="m20-rate" min="1" max="4" step="0.5" value="4" style="vertical-align:middle">
      <span id="m20-rate-v" style="font-family:var(--font-mono)">4.0</span></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">
      <input type="checkbox" id="m20-rocks" style="vertical-align:middle"> RocksDB state store</label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m20-canvas" width="720" height="150"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">batchDuration</div><div class="v" id="m20-dur">—</div></div>
    <div class="ss-metric"><div class="k">throughput</div><div class="v" id="m20-tp" style="font-size:15px">—</div></div>
    <div class="ss-metric"><div class="k">state rows</div><div class="v" id="m20-state" style="font-size:15px">—</div></div>
    <div class="ss-metric"><div class="k">state memory</div><div class="v" id="m20-mem" style="font-size:15px">—</div></div>
  </div>
  <div class="ss-callout" id="m20-verdict">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream tunes for Black Friday</h3>
    <p>Baseline (100 shuffle partitions, default state store, 10-min watermark) ran at ~3s batches on normal load. Load-testing <b>5× Black Friday traffic</b> pushed batches past the 10s trigger and executors toward OOM as state grew. The team:</p>
    <ul>
      <li>Raised <code>shuffle.partitions</code> to <b>300</b> (pre-set, since it's checkpoint-pinned) for more parallelism.</li>
      <li>Switched to the <b>RocksDB</b> state store — state went off-heap, killing the GC/OOM risk.</li>
      <li>Set <code>maxOffsetsPerTrigger</code> so a lag spike caught up in steady batches instead of one giant one.</li>
      <li>Tightened the watermark from 10→<b>5 min</b> after measuring real skew, halving retained state.</li>
    </ul>
    <div class="ss-callout">Result: batches held at ~4s even at peak, state stayed bounded, no OOM. The decisive move was <b>RocksDB + the pre-sized partition count</b> — the one knob (shuffle.partitions) they <i>couldn't</i> change live, so getting it right up front mattered most.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark — the core tuning knobs', `spark.conf.set("spark.sql.shuffle.partitions", "300")          # state parallelism (FIXED by checkpoint)
spark.conf.set("spark.sql.streaming.stateStore.providerClass", # off-heap state for scale
    "org.apache.spark.sql.execution.streaming.state.RocksDBStateStoreProvider")

orders = (spark.readStream.format("kafka")
    .option("subscribe", "orders")
    .option("maxOffsetsPerTrigger", 2500000)                   # bound batch size (backpressure)
    .load())

(orders.withWatermark("event_time", "5 minutes")              # tighter watermark -> less state
    .groupBy(window("event_time", "5 minutes"), "category").agg(sum("amount"))
    .writeStream.format("delta")
    .option("checkpointLocation", "s3://shopstream/chk/rev")
    .trigger(processingTime="10 seconds")                      # largest interval meeting the SLA
    .start())`)}
  ${codeBlock('Delta write-side (small-files)', `# Auto-compaction + optimized writes keep file sizes healthy under streaming
spark.conf.set("spark.databricks.delta.autoCompact.enabled", "true")
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", "true")
# Periodic maintenance: OPTIMIZE table ZORDER BY (category); VACUUM table RETAIN 168 HOURS`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M20 · Lakehouse & Ops',
    title: 'Performance & Tuning',
    subtitle: 'The knobs that balance latency, throughput and state size',
    definition: {
      formal: 'Streaming performance tuning balances batch duration against the trigger interval while bounding state and cost, using parallelism (source partitions, cores, checkpoint-pinned shuffle.partitions), ingest rate limits (maxOffsetsPerTrigger), trigger interval, state strategy (watermark tightness, RocksDB off-heap state store), and write-side compaction (OPTIMIZE/optimizeWrite/VACUUM). Diagnosis uses the durationMs phase breakdown and state metrics to localize and fix the dominant bottleneck.',
      easy: 'Tuning means keeping each batch finishing before the next is due, without running out of memory, at a sensible cost. The main dials are: how many parallel tasks (set this for peak, it can\'t change later), how much data each batch pulls in, how long you keep time-windows (watermark), whether state lives off-heap (RocksDB), and how often you trigger. This demo lets you turn those dials and see batch time, throughput and state react.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🚀 Tuning Sandbox', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const part = container.querySelector('#m20-part'), partV = container.querySelector('#m20-part-v');
  const wm = container.querySelector('#m20-wm'), wmV = container.querySelector('#m20-wm-v');
  const rate = container.querySelector('#m20-rate'), rateV = container.querySelector('#m20-rate-v');
  const rocks = container.querySelector('#m20-rocks');
  const canvas = container.querySelector('#m20-canvas');
  const durEl = container.querySelector('#m20-dur'), tpEl = container.querySelector('#m20-tp');
  const stateEl = container.querySelector('#m20-state'), memEl = container.querySelector('#m20-mem');
  const verdictEl = container.querySelector('#m20-verdict');

  function drawBar(m) {
    const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
    const pad = 40, y = 60, h = 40;
    const scaleMax = Math.max(m.triggerMs * 1.3, m.batchMs * 1.1);
    const X = (v) => pad + (v / scaleMax) * (W - pad * 2);
    // trigger threshold
    ctx.fillStyle = 'rgba(239,68,68,0.12)'; ctx.fillRect(X(m.triggerMs), y - 14, (W - pad) - X(m.triggerMs), h + 28);
    ctx.strokeStyle = '#EF4444'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(m.triggerMs), y - 16); ctx.lineTo(X(m.triggerMs), y + h + 16); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#EF4444'; ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText('trigger ' + (m.triggerMs / 1000) + 's', X(m.triggerMs), y - 22);
    // batch bar
    ctx.fillStyle = m.healthy ? '#10B981' : '#EF4444';
    ctx.beginPath(); ctx.roundRect(pad, y, Math.max(X(m.batchMs) - pad, 4), h, 6); ctx.fill();
    ctx.fillStyle = '#0A0E1A'; ctx.font = 'bold 13px ui-monospace,monospace'; ctx.textAlign = 'left';
    ctx.fillText(` batchDuration ${m.batchMs}ms`, pad + 8, y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  function render() {
    partV.textContent = part.value; wmV.textContent = wm.value; rateV.textContent = (+rate.value).toFixed(1);
    const m = model({ partitions: +part.value, watermarkMin: +wm.value, rocksdb: rocks.checked, rateLimitM: +rate.value });
    drawBar(m);
    durEl.textContent = m.batchMs + 'ms';
    durEl.style.color = m.healthy ? 'var(--green,#10B981)' : 'var(--red,#EF4444)';
    tpEl.textContent = (m.throughput / 1000).toFixed(0) + 'k/s';
    stateEl.textContent = (m.stateRows / 1000).toFixed(0) + 'k';
    memEl.textContent = m.stateMemMB + ' MB';
    memEl.style.color = m.oomRisk ? 'var(--red,#EF4444)' : 'var(--text-primary)';
    verdictEl.innerHTML = (m.healthy
      ? `🟢 <b>Healthy:</b> batches finish in <b>${m.batchMs}ms</b>, under the ${m.triggerMs}ms trigger — the job keeps up at ${(m.throughput / 1000).toFixed(0)}k rows/s.`
      : `🔴 <b>Falling behind:</b> batchDuration <b>${m.batchMs}ms &gt; ${m.triggerMs}ms</b> trigger — lag will grow. Add parallelism, tighten the watermark, or rate-limit.`)
      + (m.oomRisk ? `<br>⚠️ <span style="color:var(--red,#EF4444)"><b>OOM risk:</b> ${m.stateMemMB}MB of on-heap state. Enable the RocksDB state store to move it off-heap.</span>` : '');
  }

  [part, wm, rate].forEach((el) => el.addEventListener('input', render));
  rocks.addEventListener('change', render);
  render();
}

export default { mount };
