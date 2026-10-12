import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine } from '../components/story-ui.js';

// ── Mode definitions ──────────────────────────────────────────────────────
const MODES = {
  batch: {
    id: 'batch', name: 'Batch Processing', icon: '📦',
    color: '#F59E0B', colorDim: 'rgba(245,158,11,0.12)',
    tag: 'Hadoop / Hive era',
    desc: 'All data is collected first, then processed as one big chunk. Like waiting until midnight to process all the day\'s GPS data.',
    latencyLabel: '30–60 min', latencyPct: 100,
    throughputLabel: 'High (but delayed)', throughputPct: 70,
    flushMs: 5000,
    uberImpact: 'Fraud runs after trip ends. Driver completes 6 more fraudulent trips.',
    uberColor: '#F87171',
  },
  microbatch: {
    id: 'microbatch', name: 'Micro-Batch', icon: '⚡',
    color: '#EC4899', colorDim: 'rgba(236,72,153,0.12)',
    tag: 'Spark Streaming',
    desc: 'Stream split into small time windows (500ms–10s). Better than batch but still not true streaming — every event waits for its window to close.',
    latencyLabel: '500ms–2s', latencyPct: 45,
    throughputLabel: 'High', throughputPct: 75,
    flushMs: 1200,
    uberImpact: 'ETA is 500ms+ stale. GPS events from tunnels arrive in wrong batch.',
    uberColor: '#FCD34D',
  },
  streaming: {
    id: 'streaming', name: 'True Streaming', icon: '🌊',
    color: '#34D399', colorDim: 'rgba(52,211,153,0.12)',
    tag: 'Apache Flink',
    desc: 'Each event processed the moment it arrives. No buffering. No waiting. A GPS ping from a driver goes through the entire pipeline in under 10ms.',
    latencyLabel: '< 10ms', latencyPct: 3,
    throughputLabel: 'Very High', throughputPct: 95,
    flushMs: 0,
    uberImpact: 'Fraud detected before next trip. ETA recalculated every GPS ping.',
    uberColor: '#34D399',
  },
};

const DRIVER_COLORS = ['#FF6B35','#38BDF8','#34D399','#A78BFA','#FCD34D','#F87171','#22D3EE','#FB923C'];

const IQS = [
  {
    q: 'Explain the fundamental difference between batch, micro-batch, and true streaming processing.',
    a: `<strong>Batch processing</strong> reads a finite dataset, processes it completely, and produces output — then stops. The "unit of work" is the entire dataset. Latency is measured in minutes to hours.<br><br>
    <strong>Micro-batch</strong> (Spark Streaming's model) artificially breaks an infinite stream into small time windows and processes each window as a batch. The "unit of work" is a time window (e.g., 500ms of events). Minimum latency equals the window size plus processing time.<br><br>
    <strong>True streaming</strong> (Flink, Storm) processes each event individually as it arrives. The "unit of work" is a single event. Latency is bounded only by processing time, typically < 10ms.<br><br>
    The key insight: micro-batch is an optimization of batch, not a streaming model. True streaming is fundamentally different — operators maintain state across events without batching.`,
    tip: 'Say: "The unit of work is the key distinction — dataset, window, or individual event."',
  },
  {
    q: 'Why can\'t you just use a very small batch window (say 10ms) in Spark Streaming to achieve streaming-like latency?',
    a: `Several problems arise with very small micro-batch windows:<br><br>
    1. <strong>Scheduling overhead</strong>: Each batch requires Spark to schedule a new job, allocate resources, and serialize/deserialize state. At 10ms windows, scheduling overhead exceeds processing time.<br><br>
    2. <strong>State management</strong>: Batch systems treat each window as independent. Maintaining state across windows (e.g., running averages, fraud score history) requires manual RDD checkpointing with significant overhead.<br><br>
    3. <strong>Out-of-order events</strong>: A 10ms window with a 5ms network jitter means events from the same "moment" land in different batches, producing wrong aggregation results.<br><br>
    4. <strong>JVM GC pressure</strong>: Creating and destroying batch objects at 100 batches/second causes GC pauses that spike latency unpredictably.<br><br>
    Flink avoids all of this by processing events in a continuous loop, not scheduling discrete jobs.`,
    tip: 'Mention scheduling overhead + GC pressure — these show system-level understanding.',
  },
  {
    q: 'In a Flink pipeline processing Uber GPS events, what does "true streaming" mean at the code level?',
    a: `At the operator level, Flink's runtime calls <strong>processElement()</strong> for every arriving event. There is no buffer, no accumulation — the method fires immediately.<br><br>
    <code>class GPSMapper(MapFunction):<br>
    &nbsp;&nbsp;def map(self, e):<br>
    &nbsp;&nbsp;&nbsp;&nbsp;# Called once per GPS ping, immediately on arrival<br>
    &nbsp;&nbsp;&nbsp;&nbsp;return {"driver_id": e["driver_id"], "lat": e["lat"],<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"lon": e["lon"], "ts": e["event_time"]}</code><br><br>
    The Flink runtime wraps this in a network buffer (default 32KB) for efficiency, but conceptually each event triggers an immediate call. The buffer fills in microseconds at high throughput, so effective latency stays < 10ms.`,
    tip: 'Mention network buffers — shows you know Flink optimizes throughput without sacrificing streaming semantics.',
  },
  {
    q: 'How does Flink\'s stream processing model compare to Kafka Streams?',
    a: `Both are true streaming engines processing one event at a time. Key differences:<br><br>
    <strong>Deployment</strong>: Kafka Streams runs as a library embedded in your application (no separate cluster). Flink runs as a dedicated cluster (JobManager + TaskManagers).<br><br>
    <strong>Source flexibility</strong>: Kafka Streams requires Kafka for everything — source and sink. Flink connects to Kafka, Kinesis, S3, JDBC, Iceberg, Snowflake, and custom sources.<br><br>
    <strong>Complex analytics</strong>: Flink supports 4 window types, temporal joins, CEP (complex event processing), and SQL. Kafka Streams has basic windowing and KTable joins.<br><br>
    <strong>Scalability</strong>: Flink scales operators independently. Kafka Streams scales by partition count — you can't have more parallelism than partitions.<br><br>
    For Uber's use case (joining GPS + pricing + history from multiple sources), Flink was the only viable option.`,
    tip: 'The embedded vs cluster distinction is often the first follow-up question.',
  },
];

// ── Mount ─────────────────────────────────────────────────────────────────
export function mount(container) {
  container.innerHTML = rideSpine({ active: ['LOCATION_UPDATED'] }) + createModuleShell({
    tag: '02 · Foundation · Uber Edition',
    title: 'Streaming Fundamentals',
    subtitle: 'Visualize the difference between batch, micro-batch, and true streaming — by watching 1M Uber GPS events per second flow through each processing model in real time.',
    tabs: [
      { id: 'sim',        label: '🎮 Live Simulation' },
      { id: 'concept',    label: '📖 Concepts' },
      { id: 'code',       label: '💻 Code' },
      { id: 'interview',  label: '🎤 Interview Q&A' },
    ],
  });

  initTabs(container);
  initRideSpine(container);

  container.querySelector('#tab-sim').innerHTML      = buildSimTab();
  container.querySelector('#tab-concept').innerHTML  = buildConceptTab();
  container.querySelector('#tab-code').innerHTML     = buildCodeTab();
  container.querySelector('#tab-interview').innerHTML = createIQSection(IQS);
  initIQ(container);

  const cleanup = initSimulation(container);
  return cleanup;
}

// ── Simulation Tab ────────────────────────────────────────────────────────
function buildSimTab() {
  return `
    <div style="display:flex;gap:12px;margin-bottom:24px" id="mode-cards">
      ${Object.values(MODES).map(m => `
        <button class="mode-card ${m.id === 'streaming' ? 'active' : ''}" data-mode="${m.id}"
          style="flex:1;padding:16px;border-radius:12px;border:2px solid ${m.id==='streaming'?m.color:'var(--border)'};
                 background:${m.id==='streaming'?m.colorDim:'var(--bg-card)'};cursor:pointer;text-align:left;
                 transition:all 0.2s ease;color:var(--text-primary)">
          <div style="font-size:24px;margin-bottom:8px">${m.icon}</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:3px">${m.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${m.tag}</div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);color:${m.color}">${m.latencyLabel}</span>
            <span style="font-size:10px;color:var(--text-muted)">latency</span>
          </div>
        </button>
      `).join('')}
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:16px">
          <span id="mode-label" style="font-size:13px;font-weight:700;color:var(--text-secondary)">Mode: True Streaming</span>
          <span id="uber-impact" style="font-size:12px;padding:3px 10px;border-radius:99px;background:var(--green-dim);color:var(--green)"></span>
        </div>
        <div style="display:flex;gap:8px">
          <button id="sim-play" class="btn btn-secondary" style="padding:6px 14px;font-size:12px">⏸ Pause</button>
          <button id="sim-inject" class="btn btn-primary" style="padding:6px 14px;font-size:12px">+ Inject Event</button>
        </div>
      </div>
      <canvas id="stream-canvas" style="width:100%;height:200px;display:block"></canvas>
      <div style="padding:14px 20px;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <div>
          <div class="form-hint">Events Processed</div>
          <div id="stat-processed" style="font-size:20px;font-weight:800;font-family:var(--font-mono);color:var(--accent-text)">0</div>
        </div>
        <div>
          <div class="form-hint">Avg Latency</div>
          <div id="stat-latency" style="font-size:20px;font-weight:800;font-family:var(--font-mono);color:var(--green)">—</div>
        </div>
        <div>
          <div class="form-hint">Queue Depth</div>
          <div id="stat-queue" style="font-size:20px;font-weight:800;font-family:var(--font-mono);color:var(--yellow)">0</div>
        </div>
        <div>
          <div class="form-hint">Events/sec</div>
          <div id="stat-rate" style="font-size:20px;font-weight:800;font-family:var(--font-mono);color:var(--blue)">0</div>
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:20px;background:var(--bg-elevated);border-radius:10px;padding:14px 20px">
      <label style="font-size:12px;color:var(--text-secondary);white-space:nowrap">Event Speed</label>
      <input type="range" id="speed-slider" min="1" max="10" value="5"
        style="flex:1;accent-color:var(--accent)">
      <span id="speed-val" style="font-size:12px;font-family:var(--font-mono);color:var(--text-muted);width:32px">5x</span>
    </div>

    <div id="batch-indicator" style="display:none;margin-top:14px;padding:14px 20px;border-radius:10px;
         background:var(--yellow-dim);border:1px solid rgba(252,211,77,0.25);font-size:13px;color:var(--text-secondary)">
      <span id="batch-countdown"></span>
    </div>
  `;
}

// ── Concept Tab ───────────────────────────────────────────────────────────
function buildConceptTab() {
  return `
    <div class="section-header">
      <div class="section-title">Processing Models Explained</div>
      <div class="section-desc">Three fundamentally different ways to handle data — each with different trade-offs</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px">
      ${Object.values(MODES).map(m => `
        <div class="card" style="border-color:${m.colorDim};background:linear-gradient(135deg,${m.colorDim},transparent)">
          <div style="display:flex;align-items:flex-start;gap:16px">
            <div style="font-size:36px;flex-shrink:0">${m.icon}</div>
            <div class="flex-1">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:18px;font-weight:800;letter-spacing:-0.3px">${m.name}</span>
                <span style="font-size:11px;padding:3px 8px;border-radius:99px;background:${m.colorDim};color:${m.color};font-weight:600">${m.tag}</span>
              </div>
              <p style="font-size:14px;color:var(--text-secondary);line-height:1.65;margin-bottom:16px">${m.desc}</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div>
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:700;letter-spacing:0.5px">LATENCY</div>
                  <div style="height:6px;background:var(--bg-elevated);border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${m.latencyPct}%;background:${m.color};border-radius:99px"></div>
                  </div>
                  <div style="font-size:12px;font-family:var(--font-mono);color:${m.color};margin-top:4px">${m.latencyLabel}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:700;letter-spacing:0.5px">THROUGHPUT</div>
                  <div style="height:6px;background:var(--bg-elevated);border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${m.throughputPct}%;background:${m.color};border-radius:99px"></div>
                  </div>
                  <div style="font-size:12px;font-family:var(--font-mono);color:${m.color};margin-top:4px">${m.throughputLabel}</div>
                </div>
              </div>
              <div style="margin-top:14px;padding:10px 14px;background:var(--bg-elevated);border-radius:8px;border-left:3px solid ${m.color}">
                <span style="font-size:11px;font-weight:700;color:${m.color};letter-spacing:0.5px">🚗 UBER: </span>
                <span style="font-size:13px;color:var(--text-secondary)">${m.uberImpact}</span>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:32px">
      <div class="section-header">
        <div class="section-title">The River of Events</div>
        <div class="section-desc">Think of streaming data like a river — you can't stop it to process it</div>
      </div>
      <div class="card mt-16">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div>
            <div style="font-weight:700;margin-bottom:10px;color:var(--red)">❌ Batch thinking</div>
            <p class="prose-sm">
              You build a dam, wait for the river to fill the reservoir, then open the floodgate to process all water at once. The river keeps flowing while you process. Data is always stale.
            </p>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:10px;color:var(--green)">✅ Stream thinking</div>
            <p class="prose-sm">
              You stand at the river with a machine. Every drop of water is processed the moment it arrives. The river keeps flowing, you keep processing. Data is always fresh.
            </p>
          </div>
        </div>
        <div style="margin-top:16px;padding:14px;background:var(--bg-elevated);border-radius:8px;font-size:13.5px;color:var(--text-secondary);line-height:1.7">
          🚗 <strong class="t-pri">Uber's river</strong>: 3 million active drivers each sending a GPS ping every second = 3M events/sec. You cannot dam this river. Flink stands at the river and processes each ping the instant it arrives.
        </div>
      </div>
    </div>
  `;
}

// ── Code Tab ──────────────────────────────────────────────────────────────
function buildCodeTab() {
  return `
    <div class="section-header">
      <div class="section-title">Code Comparison</div>
      <div class="section-desc">Same GPS processing logic — three different processing models</div>
    </div>

    <div class="mb-20">
      <div style="font-size:13px;font-weight:700;color:var(--yellow);margin-bottom:10px">📦 Batch (Hadoop/Hive SQL)</div>
      <div class="code-block">
        <span class="lang-tag">HiveQL</span>
<span class="cc">-- Runs at midnight. Processes all GPS pings from the day.</span>
<span class="ck">SELECT</span> driver_id, <span class="cf">AVG</span>(speed) <span class="ck">as</span> avg_speed, <span class="cf">COUNT</span>(*) <span class="ck">as</span> trip_count
<span class="ck">FROM</span> gps_events_<span class="cn">2024_01_15</span>
<span class="ck">WHERE</span> event_date = <span class="cs">'2024-01-15'</span>
<span class="ck">GROUP BY</span> driver_id;
<span class="cc">-- Latency: 30–60 minutes. Fraud already completed.</span>
      </div>
    </div>

    <div class="mb-20">
      <div style="font-size:13px;font-weight:700;color:var(--purple);margin-bottom:10px">⚡ Micro-Batch (Spark Streaming)</div>
      <div class="code-block">
        <span class="lang-tag">Scala</span>
<span class="ck">val</span> <span class="ct">spark</span> = SparkSession.builder().getOrCreate()
<span class="ck">val</span> gpsStream = spark
  .readStream
  .format(<span class="cs">"kafka"</span>)
  .option(<span class="cs">"subscribe"</span>, <span class="cs">"uber-gps"</span>)
  .load()

<span class="cc">// Spark groups events into 500ms micro-batches</span>
<span class="cc">// Every event waits up to 500ms before processing</span>
<span class="ck">val</span> result = gpsStream
  .withWatermark(<span class="cs">"event_time"</span>, <span class="cs">"2 minutes"</span>)
  .groupBy(<span class="cf">window</span>(<span class="ct">col</span>(<span class="cs">"event_time"</span>), <span class="cs">"500ms"</span>), <span class="ct">col</span>(<span class="cs">"driver_id"</span>))
  .agg(<span class="cf">avg</span>(<span class="cs">"speed"</span>))

result.writeStream.trigger(<span class="cf">Trigger.ProcessingTime</span>(<span class="cs">"500 milliseconds"</span>)).start()
<span class="cc">// Latency: 500ms+ (window must close before processing)</span>
      </div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:10px">🌊 True Streaming (Apache Flink)</div>
      <div class="code-block">
        <span class="lang-tag">PyFlink</span>
<span class="ct">env</span> = StreamExecutionEnvironment.get_execution_environment()

gps = env.<span class="cf">from_source</span>(kafka_source, ride_watermarks, <span class="cs">"Kafka GPS"</span>)

<span class="cc"># Each GPS ping processed IMMEDIATELY on arrival — no buffering</span>
result = (gps
  .<span class="cf">map</span>(<span class="ck">lambda</span> e: {<span class="cs">"driver_id"</span>: e[<span class="cs">"driver_id"</span>], <span class="cs">"lat"</span>: e[<span class="cs">"lat"</span>], <span class="cs">"lon"</span>: e[<span class="cs">"lon"</span>]})
  .<span class="cf">key_by</span>(<span class="ck">lambda</span> e: e[<span class="cs">"driver_id"</span>])
  .<span class="cf">process</span>(FraudDetection()))  <span class="cc"># stateful, per-event</span>

result.<span class="cf">sink_to</span>(iceberg_sink)
env.<span class="cf">execute</span>(<span class="cs">"Uber GPS Real-Time Pipeline"</span>)
<span class="cc"># Latency: &lt; 10ms. Fraud detected before next trip starts.</span>
      </div>
    </div>
  `;
}

// ── Canvas Simulation ─────────────────────────────────────────────────────
function initSimulation(container) {
  const canvas  = container.querySelector('#stream-canvas');
  const ctx     = canvas.getContext('2d');
  const modeCards = container.querySelectorAll('.mode-card');
  const playBtn = container.querySelector('#sim-play');
  const injectBtn = container.querySelector('#sim-inject');
  const speedSlider = container.querySelector('#speed-slider');
  const speedVal    = container.querySelector('#speed-val');
  const statProcessed = container.querySelector('#stat-processed');
  const statLatency   = container.querySelector('#stat-latency');
  const statQueue     = container.querySelector('#stat-queue');
  const statRate      = container.querySelector('#stat-rate');
  const modeLabel     = container.querySelector('#mode-label');
  const uberImpact    = container.querySelector('#uber-impact');
  const batchIndicator = container.querySelector('#batch-indicator');
  const batchCountdown = container.querySelector('#batch-countdown');

  let dpr = window.devicePixelRatio || 1;
  let W, H;
  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }
  resize();

  const state = {
    mode: 'streaming',
    speed: 5,
    paused: false,
    events: [],
    buffer: [],
    processed: 0,
    lastFlush: performance.now(),
    lastEventTime: 0,
    eventInterval: 400,
    totalLatency: 0,
    latencyCount: 0,
    rateCount: 0,
    rateWindow: performance.now(),
    animId: null,
  };

  // Spawn one event
  function spawnEvent() {
    const color = DRIVER_COLORS[Math.floor(Math.random() * DRIVER_COLORS.length)];
    const driverId = 'D' + (1000 + Math.floor(Math.random() * 9000));
    state.events.push({
      id: Math.random(),
      x: 0,
      y: H * 0.35 + (Math.random() - 0.5) * H * 0.25,
      color,
      driverId,
      spawnTime: performance.now(),
      state: 'flowing',  // flowing | buffered | processing | done
      opacity: 1,
      scale: 1,
    });
    state.rateCount++;
  }

  function setMode(mode) {
    state.mode = mode;
    state.buffer = [];
    state.lastFlush = performance.now();
    const m = MODES[mode];
    modeLabel.textContent = `Mode: ${m.name}`;
    uberImpact.textContent = m.uberImpact;
    uberImpact.style.background = mode === 'streaming' ? 'var(--green-dim)' : mode === 'microbatch' ? 'var(--yellow-dim)' : 'var(--red-dim)';
    uberImpact.style.color = m.uberColor;

    modeCards.forEach(c => {
      const cm = MODES[c.dataset.mode];
      const isActive = c.dataset.mode === mode;
      c.style.borderColor = isActive ? cm.color : 'var(--border)';
      c.style.background  = isActive ? cm.colorDim : 'var(--bg-card)';
    });

    if (mode === 'batch') {
      batchIndicator.style.display = 'block';
    } else if (mode === 'microbatch') {
      batchIndicator.style.display = 'block';
    } else {
      batchIndicator.style.display = 'none';
    }
  }

  modeCards.forEach(c => c.addEventListener('click', () => setMode(c.dataset.mode)));
  setMode('streaming');

  playBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    playBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  });

  injectBtn.addEventListener('click', () => {
    for (let i = 0; i < 5; i++) spawnEvent();
  });

  speedSlider.addEventListener('input', () => {
    state.speed = parseInt(speedSlider.value);
    speedVal.textContent = state.speed + 'x';
    state.eventInterval = Math.max(60, 500 - state.speed * 45);
  });

  let last = performance.now();
  function loop(now) {
    state.animId = requestAnimationFrame(loop);
    const dt = Math.min(now - last, 50);
    last = now;

    if (!state.paused) {
      // Spawn events
      if (now - state.lastEventTime > state.eventInterval) {
        spawnEvent();
        state.lastEventTime = now;
      }

      const mode = MODES[state.mode];
      const speed = state.speed * 1.8;

      // Update events
      for (let i = state.events.length - 1; i >= 0; i--) {
        const e = state.events[i];
        if (e.state === 'flowing') {
          if (state.mode === 'streaming') {
            e.x += speed * (dt / 16);
            if (e.x > W) {
              const latency = now - e.spawnTime;
              state.totalLatency += latency;
              state.latencyCount++;
              state.processed++;
              state.events.splice(i, 1);
            }
          } else {
            // Move to buffer zone (left 30%)
            const bufX = W * 0.28;
            if (e.x < bufX) {
              e.x += speed * 0.6 * (dt / 16);
            }
            if (e.x >= bufX) {
              e.x = bufX;
              e.state = 'buffered';
              e.y = H * 0.35 + (Math.random() - 0.5) * H * 0.35;
              state.buffer.push(e);
            }
          }
        } else if (e.state === 'buffered') {
          // Just sit
        } else if (e.state === 'processing') {
          e.x += speed * 1.2 * (dt / 16);
          e.scale = Math.min(1.3, e.scale + 0.05);
          if (e.x > W) {
            state.processed++;
            state.events.splice(i, 1);
          }
        } else if (e.state === 'done') {
          e.opacity -= 0.05;
          if (e.opacity <= 0) state.events.splice(i, 1);
        }
      }

      // Flush logic for batch/microbatch
      if (state.mode !== 'streaming' && state.buffer.length > 0) {
        const elapsed = now - state.lastFlush;
        const flushMs = mode.flushMs;
        const pct = Math.min(1, elapsed / flushMs);

        if (state.mode === 'batch') {
          batchCountdown.textContent = `📦 Batch accumulating — flushing in ${((flushMs - elapsed) / 1000).toFixed(1)}s · ${state.buffer.length} events queued`;
        } else {
          batchCountdown.textContent = `⚡ Micro-batch window — flushing in ${((flushMs - elapsed) / 1000).toFixed(2)}s · ${state.buffer.length} events queued`;
        }

        if (elapsed >= flushMs) {
          const flushed = [...state.buffer];
          state.buffer = [];
          state.lastFlush = now;
          flushed.forEach(e => {
            e.state = 'processing';
            e.x = W * 0.32;
            const latency = now - e.spawnTime;
            state.totalLatency += latency;
            state.latencyCount++;
          });
        }
      }

      // Rate tracking
      if (now - state.rateWindow > 1000) {
        statRate.textContent = state.rateCount;
        state.rateCount = 0;
        state.rateWindow = now;
      }

      statProcessed.textContent = state.processed.toLocaleString();
      statQueue.textContent = state.buffer.length;
      if (state.latencyCount > 0) {
        const avg = state.totalLatency / state.latencyCount;
        statLatency.textContent = avg < 1000 ? Math.round(avg) + 'ms' : (avg / 1000).toFixed(1) + 's';
        const latColor = avg < 100 ? 'var(--green)' : avg < 2000 ? 'var(--yellow)' : 'var(--red)';
        statLatency.style.color = latColor;
      }
    }

    draw(now);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Background pipeline tube
    const tubeY = H * 0.35;
    const tubeH = H * 0.3;
    const grad = ctx.createLinearGradient(0, tubeY, 0, tubeY + tubeH);
    grad.addColorStop(0, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(20, tubeY, W - 40, tubeH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Source label
    drawLabel(ctx, 20, tubeY - 18, '🛰 Kafka GPS Stream', 'rgba(56,189,248,0.8)');

    // Batch buffer zone divider
    if (state.mode !== 'streaming') {
      const bufX = W * 0.28;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(252,211,77,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bufX, tubeY + 4);
      ctx.lineTo(bufX, tubeY + tubeH - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      drawLabel(ctx, bufX + 4, tubeY - 18, 'Buffer Zone', 'rgba(252,211,77,0.6)');

      // Fill bar
      const flushPct = Math.min(1, (now - state.lastFlush) / MODES[state.mode].flushMs);
      ctx.fillStyle = `rgba(252,211,77,${0.04 + flushPct * 0.08})`;
      ctx.fillRect(21, tubeY + 1, (bufX - 22) * flushPct, tubeH - 2);
    }

    // Sink label
    drawLabel(ctx, W - 120, tubeY - 18, '📊 Iceberg / Dashboard', 'rgba(52,211,153,0.8)');

    // Draw events
    state.events.forEach(e => {
      ctx.save();
      ctx.globalAlpha = e.opacity;
      const r = 7 * e.scale;
      ctx.beginPath();
      ctx.arc(e.x + 20, e.y, r, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();

      // Glow for processing state
      if (e.state === 'processing') {
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    });

    // Flow arrow hints
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 60; x < W - 60; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, H * 0.5 - 5);
      ctx.lineTo(x + 12, H * 0.5);
      ctx.lineTo(x, H * 0.5 + 5);
      ctx.stroke();
    }
  }

  function drawLabel(ctx, x, y, text, color) {
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = color || 'rgba(255,255,255,0.4)';
    ctx.fillText(text, x, y);
  }

  state.animId = requestAnimationFrame(loop);

  return () => {
    if (state.animId) cancelAnimationFrame(state.animId);
  };
}
