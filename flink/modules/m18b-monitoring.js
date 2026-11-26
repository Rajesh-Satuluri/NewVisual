// Module 18b — Monitoring & Observability
// How you SEE a running Flink job: the metric system (scopes, groups, reporters),
// the handful of metrics that actually matter (throughput, busyTime,
// backpressure, checkpoint duration, watermark lag), the REST API / Web UI, and
// what to alert on. Centrepiece is a deterministic, theme-aware canvas that
// simulates a live Flink dashboard for ride R-4471's 1M-ping/sec location stream
// — inject backpressure / a checkpoint stall / a lag spike and watch the metrics
// move exactly as they would on a real on-call dashboard.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { casesByModule } from '../data/interview-cases.js';

// ── Tab 1: metric system ─────────────────────────────────────────────────────
const SYSTEM = `
  <div class="sm-def card">
    <div class="sm-def-ic">📡</div>
    <div>
      <div class="sm-def-eyebrow">Why observability is its own discipline</div>
      <p class="sm-def-lead">A Flink job is a <b>distributed, always-on dataflow</b>. It does not "finish" and print a result — it runs for months. The only way to know it is healthy is the <b>metric system</b>: every operator subtask continuously reports counters and gauges, a <b>reporter</b> ships them to Prometheus/Datadog, and you watch a few key signals. On ride <b>R-4471</b>, the 1M-ping/sec location stream is invisible until you instrument it.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The metric system — scopes & groups</div>
    <div class="section-desc">Every metric is namespaced so you can slice by job, task, operator and subtask.</div>
  </div>
  <div class="sm-keyed card">
    <ul>
      <li><b>Metric groups</b> — metrics live in a hierarchy: <code>JobManager</code>, <code>TaskManager</code>, <code>Job</code>, <code>Task</code>, <code>Operator</code>. Each registers counters, gauges, meters and histograms.</li>
      <li><b>Scope</b> — the fully-qualified name is built from a <em>scope format</em>, e.g. <code>&lt;host&gt;.taskmanager.&lt;tm_id&gt;.&lt;job_name&gt;.&lt;operator_name&gt;.&lt;subtask_index&gt;.numRecordsInPerSecond</code>. Configurable via <code>metrics.scope.*</code>.</li>
      <li><b>Reporters</b> — <code>metrics.reporter.prom</code> (Prometheus), Datadog, InfluxDB, Slf4j, JMX. Flink pushes/exposes on an interval (<code>metrics.reporter.*.interval</code>).</li>
      <li><b>System vs user metrics</b> — Flink ships hundreds of system metrics; you add your own with <code>getRuntimeContext().getMetricGroup().counter("fraud_alerts")</code>.</li>
    </ul>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The metrics that actually matter</div>
    <div class="section-desc">Ignore the hundreds; these are the ones an interviewer and an on-call engineer live by.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🚰', 'numRecordsInPerSecond / OutPerSecond', 'Throughput per operator. The headline number — and the first thing that drops when something is wrong.'],
      ['🔥', 'busyTimeMsPerSecond', 'Of each 1000ms, how long the operator spent doing work. ~1000 = saturated (this operator is a bottleneck).'],
      ['🧯', 'backPressuredTimeMsPerSecond', 'How long the operator was blocked because its <em>downstream</em> could not keep up. High here = the bottleneck is further down the chain.'],
      ['💾', 'lastCheckpointDuration / Size', 'How long the last checkpoint took and how big it was. A climbing duration is the earliest warning of trouble.'],
      ['⏱️', 'currentOutputWatermark', 'The event-time frontier. Subtract from wall-clock to get <b>watermark lag</b> — how far behind real time the job is.'],
      ['📉', 'pendingRecords / consumer lag', 'Source-reported backlog (e.g. Kafka records-lag-max). Rising lag = you are falling behind the input.'],
      ['♻️', 'numRestarts / uptime', 'Restart count and time since last restart. A job that keeps restarting is in a crash loop — check the exception.'],
      ['🧮', 'Managed memory / GC', 'RocksDB + network buffers live here; long GC pauses show up as latency and failed checkpoints.'],
    ].map(([icon, title, body]) => `
      <div class="sm-why">
        <div class="sm-why-ic">${icon}</div>
        <div class="sm-why-title">${title}</div>
        <p>${body}</p>
      </div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">Read backpressure like a sentence</div>
      <p class="sm-def-lead" style="font-size:0.95rem">Walk the chain from the <b>sink backward</b>. The <b>first operator that is busy (~100%) but NOT backpressured is the bottleneck</b>. Everything upstream of it shows high backpressure (they are blocked waiting to hand off); everything downstream is idle (starved). Related: <a href="#m15" style="color:#FF6B35;font-weight:600">Module 15 — Backpressure</a>, <a href="#m12" style="color:#FF6B35;font-weight:600">Module 12 — Checkpointing</a>.</p>
    </div>
  </div>
`;

// ── Tab 4: setup / PyFlink / REST ────────────────────────────────────────────
const SETUP = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">Turn on the Prometheus reporter</div>
    <div class="section-desc">flink-conf.yaml — the TaskManagers then expose a /metrics endpoint Prometheus scrapes.</div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">flink-conf.yaml</span><pre>metrics.reporter.prom.factory.class: org.apache.flink.metrics.prometheus.PrometheusReporterFactory
metrics.reporter.prom.port: 9249
metrics.reporter.prom.interval: 15 SECONDS

# Keep operator scope stable so Grafana dashboards don't break on redeploy:
metrics.scope.operator: &lt;host&gt;.taskmanager.&lt;tm_id&gt;.&lt;job_name&gt;.&lt;operator_name&gt;.&lt;subtask_index&gt;

# Latency tracking is OFF by default (it is expensive). Turn on sparingly:
metrics.latency.interval: 0          # ms; 0 = disabled</pre></div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Register a custom metric in PyFlink</div>
    <div class="section-desc">Business metrics (fraud alerts/sec) sit beside the system metrics on the same dashboard.</div>
  </div>
  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · DataStream</span><pre>from pyflink.datastream import KeyedProcessFunction

class FraudDetector(KeyedProcessFunction):
    def open(self, ctx):
        g = ctx.get_metrics_group()
        # Counter: total alerts raised by this subtask
        self.alerts = g.counter("fraud_alerts_total")
        # Gauge: current model score threshold (read live in Grafana)
        self._score = 0.0
        g.gauge("fraud_score_current", lambda: int(self._score * 1000))
        # Meter: alerts-per-second (Flink maintains the rate for you)
        self.alert_rate = g.meter("fraud_alerts_per_sec", time_span_in_seconds=60)

    def process_element(self, ping, ctx):
        self._score = score(ping)
        if self._score > 0.9:
            self.alerts.inc()
            self.alert_rate.mark_event()
            yield alert(ping)</pre></div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The REST API &amp; Web UI</div>
    <div class="section-desc">Everything the UI shows is just the REST API — scriptable for health checks and CI.</div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">JobManager REST — the endpoints you actually use</span><pre>GET /jobs/&lt;jid&gt;                         # overall state: RUNNING / RESTARTING / FAILED
GET /jobs/&lt;jid&gt;/vertices/&lt;vid&gt;/backpressure   # per-subtask backpressure ratio (ok/low/high)
GET /jobs/&lt;jid&gt;/checkpoints                # counts, last duration/size, failed count
GET /jobs/&lt;jid&gt;/metrics?get=...           # arbitrary metric values
GET /taskmanagers                         # slots, heap, managed memory per TM</pre></div>

  <div class="code-block pyflink fs-11"><span class="py-tier">on-call one-liner</span><pre># "Is the job keeping up?" — alert if any subtask is >50% backpressured:
curl -s $JM/jobs/$JID/vertices/$VID/backpressure | \\
  jq -e '.subtasks | map(select(.ratio > 0.5)) | length == 0'</pre></div>
`;

// ── Tab 3: alerting ──────────────────────────────────────────────────────────
const ALERTS = `
  <div class="sm-def card">
    <div class="sm-def-ic">🚨</div>
    <div>
      <div class="sm-def-eyebrow">Alert on symptoms the user feels, not on noise</div>
      <p class="sm-def-lead">A 1M-ping/sec job emits thousands of metrics. Page on the few that mean <b>"R-4471's surge/fraud decisions are now wrong or late"</b>. Everything else is a dashboard, not a page.</p>
    </div>
  </div>
  <div class="code-block" style="overflow-x:auto;margin-top:16px">
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
      <thead><tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)">Signal</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)">Alert when</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)">Because</th>
      </tr></thead>
      <tbody>
        ${[
          ['Watermark lag', '&gt; 60s for 5 min', 'Event-time results are stale — surge pricing is acting on old data.'],
          ['Backpressure', 'any subtask &gt; 50% for 10 min', 'A sustained bottleneck; throughput is clamped below input rate.'],
          ['Consumer lag', 'records-lag-max rising for 15 min', 'Falling behind Kafka; the backlog will never drain on its own.'],
          ['Checkpoint duration', '&gt; 50% of interval, or any failure', 'Alignment is stalling; one more push and checkpoints start timing out.'],
          ['numRestarts', '&gt; 0 in 10 min', 'Crash loop — exactly-once is fine but the job is not making progress.'],
          ['Job state', '!= RUNNING', 'The bluntest and most important check; everything else is secondary.'],
        ].map(([s, w, b]) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);font-weight:600">${s}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${w}</td>
            <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${b}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #3b82f6">
    <div class="sm-def-ic">💡</div>
    <div>
      <div class="sm-def-eyebrow">The golden pair</div>
      <p class="sm-def-lead" style="font-size:0.95rem">If you can only watch two numbers, watch <b>watermark lag</b> (are results fresh?) and <b>backpressure</b> (is anything clamping throughput?). Together they catch almost every "the job is quietly broken" incident before users do.</p>
    </div>
  </div>
`;

// ── Deterministic live-dashboard simulation ──────────────────────────────────
// Labelled SIMULATION of metric dynamics (not a connection to a real cluster),
// but the relationships are production-faithful: backpressure propagates UPSTREAM
// from the bottleneck, watermark lag integrates the backlog, and checkpoint
// duration grows with barrier-alignment time under backpressure.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPS = [
  { id: 'src', label: 'Kafka Source', cap: 1.30 },
  { id: 'parse', label: 'Parse / Map', cap: 1.30 },
  { id: 'window', label: 'KeyBy · Fraud Window', cap: 1.25 },
  { id: 'sink', label: 'Alerts Sink', cap: 1.30 },
];
const INPUT_BASE = 1.0;          // 1.0 = 1,000,000 records/sec
const CKPT_INTERVAL = 12;        // ticks between checkpoints
const CKPT_TIMEOUT = 10;         // seconds
const HIST = 80;                 // history ring length

function buildSimState() {
  return {
    t: 0, scenario: 'healthy', scenarioStart: 0,
    backlog: 0,                  // millions of records queued
    rng: mulberry32(1337),
    thr: [], lag: [], ckpts: [], // histories
    nextCkptAt: CKPT_INTERVAL,
    playing: true,
  };
}

// Pure-ish per-tick advance. Deterministic given (t, scenario timeline, seed).
function stepSim(S) {
  S.t += 1;
  const noise = (S.rng() - 0.5) * 0.06;         // ±3% seeded jitter
  const since = S.t - S.scenarioStart;
  // input rate (lag_spike = a transient 1.5x surge for ~10 ticks)
  let input = INPUT_BASE * (1 + noise);
  if (S.scenario === 'lag_spike' && since <= 10) input *= 1.5;

  // effective capacity of each operator (sink slows under backpressure scenario)
  const caps = OPS.map(o => o.cap);
  if (S.scenario === 'backpressure') caps[3] = 0.62;       // slow downstream sink
  const bottleneckCap = Math.min(...caps);
  const bottleneckIdx = caps.indexOf(bottleneckCap);

  const throughput = Math.min(input, bottleneckCap);
  // backlog integrates (input - throughput); drains when throughput > input
  S.backlog = Math.max(0, S.backlog + (input - throughput));
  // watermark lag ≈ base queueing + backlog drain time (seconds)
  const lagSec = 3 + (S.backlog / Math.max(0.05, throughput));

  // per-operator busy / backpressure ratios
  const ops = OPS.map((o, i) => {
    const demand = input / caps[i];
    const saturated = input > bottleneckCap + 1e-9;
    let busy, bp;
    if (!saturated) {                       // healthy: everyone below capacity
      busy = Math.min(0.98, demand);
      bp = Math.max(0, (S.rng() - 0.7)) * 0.1;
    } else if (i === bottleneckIdx) {       // the bottleneck: busy, not backpressured
      busy = 0.99; bp = 0.03;
    } else if (i < bottleneckIdx) {         // upstream: blocked → backpressured
      busy = 0.35 + (S.rng() * 0.1); bp = 0.80 + (S.rng() * 0.15);
    } else {                                // downstream: starved → idle
      busy = Math.min(0.9, throughput / caps[i]); bp = 0.02;
    }
    return { ...o, busy, bp: Math.min(1, bp) };
  });
  const maxBp = Math.max(...ops.map(o => o.bp));

  // checkpoint: alignment time grows with backpressure; stall scenario forces timeout
  if (S.t >= S.nextCkptAt) {
    let dur = 2.0 + maxBp * 7.5 + S.rng() * 0.6;
    if (S.scenario === 'ckpt_fail') dur += 7.0;
    const ok = dur <= CKPT_TIMEOUT;
    S.ckpts.push({ id: S.ckpts.length + 1, dur: Math.min(dur, CKPT_TIMEOUT + 2), ok });
    if (S.ckpts.length > 10) S.ckpts.shift();
    S.nextCkptAt = S.t + CKPT_INTERVAL;
  }

  S.thr.push({ input, throughput });
  S.lag.push(lagSec);
  if (S.thr.length > HIST) S.thr.shift();
  if (S.lag.length > HIST) S.lag.shift();

  S._frame = { input, throughput, lagSec, ops, maxBp };
  return S._frame;
}

function themePalette() {
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  return dark
    ? { bg: '#0b1220', grid: 'rgba(148,163,184,0.16)', text: '#e2e8f0', mut: '#94a3b8', box: '#131c2e' }
    : { bg: '#ffffff', grid: 'rgba(100,116,139,0.18)', text: '#1e293b', mut: '#64748b', box: '#f1f5f9' };
}
const GREEN = '#10b981', AMBER = '#f59e0b', RED = '#ef4444', ORANGE = '#FF6B35', BLUE = '#3b82f6';
const bpColor = v => v < 0.2 ? GREEN : v < 0.6 ? AMBER : RED;
const fmtM = v => (v * 1000).toFixed(0) + 'k';   // millions → "650k" / "1000k"

function buildDashboard(container) {
  const host = container.querySelector('#tab-live');
  host.innerHTML = `
    <div class="sim-note">⚙️ <b>Deterministic simulation.</b> Not a live cluster — but the dynamics are production-faithful:
      backpressure propagates <b>upstream</b> from the bottleneck, watermark lag integrates the backlog, and checkpoint
      duration grows with barrier-alignment time. Same scenario ⇒ same curves; press <b>Reset</b> to replay.</div>
    <div class="sim-grid">
      <div class="sim-controls" id="mon-controls">
        <div class="sim-ctl-row"><label>Scenario</label></div>
        <div class="sim-actions" id="mon-scenarios">
          <button class="ctrl-btn active" data-sc="healthy">✅ Healthy</button>
          <button class="ctrl-btn" data-sc="backpressure">🧯 Backpressure (slow sink)</button>
          <button class="ctrl-btn" data-sc="ckpt_fail">💾 Checkpoint stall</button>
          <button class="ctrl-btn" data-sc="lag_spike">📈 Input lag spike</button>
        </div>
        <div class="sim-actions" style="margin-top:10px">
          <button class="ctrl-btn" id="mon-pause">⏸ Pause</button>
          <button class="ctrl-btn" id="mon-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="mon-stats"></div>
      </div>
      <div class="sim-stage">
        <canvas id="mon-canvas" width="700" height="540" style="width:100%;max-width:720px"></canvas>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>This is the on-call view of ride <b>R-4471</b>'s location pipeline: <code>Kafka Source → Parse → KeyBy·Fraud Window → Alerts Sink</code>, nominally <b>1M pings/sec</b>. The top row is the job graph, each operator coloured by <b>backpressure</b> (green→amber→red) with its busy% beneath. The two charts are <b>throughput vs input rate</b> and <b>watermark lag</b>; the bottom strip is the last ten <b>checkpoints</b> (green = completed, red = timed out).</p>
      <p><b>Inject backpressure</b> and the sink saturates (busy ~100%, not backpressured) while everything <em>upstream</em> turns red — that is how you locate a bottleneck. Throughput clamps below the input line, the gap accumulates as backlog, and <b>watermark lag climbs</b>. <b>Checkpoint stall</b> pushes barrier-alignment time past the 10s timeout so checkpoints start failing. <b>Lag spike</b> shows a transient 1.5× input surge the job absorbs, then drains.</p>
      <p><b>Interview angle:</b> the diagnostic walk is sink→source — the first operator that is <em>busy but not backpressured</em> is the bottleneck. Rising watermark lag with healthy backpressure means a slow source, not a slow operator. A checkpoint duration creeping toward the interval is the earliest warning you have, long before the job falls over.</p>
    </div>`;

  const canvas = host.querySelector('#mon-canvas');
  const ctx = canvas.getContext('2d');
  const statsEl = host.querySelector('#mon-stats');
  let S = buildSimState();
  let raf = null, acc = 0, last = performance.now();
  const TICK_MS = 240;

  function setScenario(sc) {
    S.scenario = sc; S.scenarioStart = S.t;
    host.querySelectorAll('#mon-scenarios .ctrl-btn')
      .forEach(b => b.classList.toggle('active', b.dataset.sc === sc));
  }

  function renderStats(f) {
    if (!f) return;
    const hottest = f.ops.reduce((a, b) => (b.bp > a.bp ? b : a));
    const lastCkpt = S.ckpts[S.ckpts.length - 1];
    const failed = S.ckpts.filter(c => !c.ok).length;
    const lagTone = f.lagSec > 30 ? 'sim-stat-hot' : 'sim-stat-ok';
    statsEl.innerHTML = `
      <div class="sim-stat"><span>Throughput</span><b>${fmtM(f.throughput)}/s</b></div>
      <div class="sim-stat"><span>Input rate</span><b>${fmtM(f.input)}/s</b></div>
      <div class="sim-stat ${lagTone}"><span>Watermark lag</span><b>${f.lagSec.toFixed(1)}s</b></div>
      <div class="sim-stat ${f.maxBp > 0.5 ? 'sim-stat-hot' : 'sim-stat-ok'}">
        <span>${f.maxBp > 0.5 ? '🧯 Backpressure' : '✓ Flow'}</span>
        <b>${f.maxBp > 0.5 ? hottest.label.split(' ')[0] + ' ' + Math.round(f.maxBp * 100) + '%' : 'clear'}</b></div>
      <div class="sim-stat"><span>Backlog</span><b>${(S.backlog * 1000).toFixed(0)}k</b></div>
      <div class="sim-stat ${failed ? 'sim-stat-hot' : 'sim-stat-ok'}">
        <span>Last checkpoint</span><b>${lastCkpt ? lastCkpt.dur.toFixed(1) + 's ' + (lastCkpt.ok ? '✓' : '✗') : '—'}</b></div>`;
  }

  function lineChart(x, y, w, h, title, series, pal, opts) {
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(title, x, y - 6);
    const maxV = Math.max(opts.min, ...series.flatMap(s => s.data));
    // gridlines
    ctx.strokeStyle = pal.grid; ctx.setLineDash([3, 4]);
    for (let g = 1; g < 3; g++) { const gy = y + (h * g) / 3; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
    ctx.setLineDash([]);
    series.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
      s.data.forEach((v, i) => {
        const px = x + (w * i) / (HIST - 1);
        const py = y + h - (Math.min(v, maxV) / maxV) * h;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    });
    // current value label
    const cur = series[0].data[series[0].data.length - 1];
    if (cur != null) {
      ctx.fillStyle = series[0].color; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(opts.fmt(cur), x + w - 4, y + 14);
    }
    if (opts.threshold != null) {
      const ty = y + h - (Math.min(opts.threshold, maxV) / maxV) * h;
      ctx.strokeStyle = RED; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function draw() {
    const pal = themePalette();
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
    const f = S._frame || stepSim(S);

    // ── pipeline row ──
    const n = OPS.length, padL = 16, gap = 12, boxW = (W - padL * 2 - gap * (n - 1)) / n, boxY = 20, boxH = 74;
    ctx.textAlign = 'center';
    f.ops.forEach((o, i) => {
      const x = padL + i * (boxW + gap);
      ctx.fillStyle = pal.box; ctx.strokeStyle = bpColor(o.bp); ctx.lineWidth = 2.5;
      roundRect(ctx, x, boxY, boxW, boxH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.text; ctx.font = 'bold 11px system-ui';
      wrapLabel(ctx, o.label, x + boxW / 2, boxY + 18, boxW - 10);
      // busy bar
      const bw = boxW - 20, bx = x + 10, by = boxY + boxH - 18;
      ctx.fillStyle = pal.grid; ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = o.busy > 0.9 ? RED : o.busy > 0.7 ? AMBER : GREEN;
      ctx.fillRect(bx, by, bw * o.busy, 7);
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui';
      ctx.fillText(`busy ${Math.round(o.busy * 100)}% · bp ${Math.round(o.bp * 100)}%`, x + boxW / 2, by - 4);
      if (i < n - 1) {
        ctx.strokeStyle = pal.mut; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x + boxW, boxY + boxH / 2); ctx.lineTo(x + boxW + gap, boxY + boxH / 2); ctx.stroke();
      }
    });

    // ── charts ──
    const chartX = 16, chartW = W - 32;
    lineChart(chartX, 150, chartW, 130, 'Throughput vs input rate (records/sec)',
      [{ data: S.thr.map(p => p.throughput), color: ORANGE }, { data: S.thr.map(p => p.input), color: BLUE }],
      pal, { min: 1.6, fmt: v => fmtM(v) + '/s' });
    ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = ORANGE; ctx.fillText('■ throughput', chartX + chartW - 168, 144);
    ctx.fillStyle = BLUE; ctx.fillText('■ input', chartX + chartW - 64, 144);

    lineChart(chartX, 330, chartW, 120, 'Watermark lag (seconds behind real time)',
      [{ data: S.lag, color: GREEN }], pal, { min: 70, fmt: v => v.toFixed(1) + 's', threshold: 60 });

    // ── checkpoint strip ──
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Checkpoints (last 10)', chartX, 484);
    const cw = 54, cgap = 8;
    S.ckpts.forEach((c, i) => {
      const x = chartX + i * (cw + cgap), y = 494, hh = 34;
      ctx.fillStyle = c.ok ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.25)';
      ctx.strokeStyle = c.ok ? GREEN : RED; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, cw, hh, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ok ? GREEN : RED; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(c.dur.toFixed(1) + 's', x + cw / 2, y + 15);
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui';
      ctx.fillText(c.ok ? 'done' : 'timeout', x + cw / 2, y + 28);
    });

    renderStats(f);
  }

  function loop(now) {
    const dt = now - last; last = now;
    if (S.playing) { acc += dt; while (acc >= TICK_MS) { stepSim(S); acc -= TICK_MS; } }
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  host.querySelector('#mon-scenarios').addEventListener('click', e => {
    const b = e.target.closest('[data-sc]'); if (b) setScenario(b.dataset.sc);
  });
  const pauseBtn = host.querySelector('#mon-pause');
  pauseBtn.addEventListener('click', () => {
    S.playing = !S.playing;
    pauseBtn.textContent = S.playing ? '⏸ Pause' : '▶ Play';
    pauseBtn.classList.toggle('active', !S.playing);
  });
  host.querySelector('#mon-reset').addEventListener('click', () => {
    const sc = S.scenario; S = buildSimState(); setScenario(sc); S.scenario = sc;
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// small canvas helpers
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapLabel(ctx, text, cx, y, maxW) {
  const words = text.split(' '); let line = ''; let yy = y;
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = w; yy += 13; }
    else line = test;
  });
  if (line) ctx.fillText(line, cx, yy);
}

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['LOCATION_UPDATED'] }) + createModuleShell({
    tag: '18b · Operations · Uber Edition',
    title: 'Monitoring & Observability',
    subtitle: 'How you see a running Flink job: the metric system, the handful of signals that matter (throughput, busyTime, backpressure, checkpoint duration, watermark lag), the REST API, and what to actually page on.',
    tabs: [
      { id: 'system', label: '📡 Metric System', content: SYSTEM },
      { id: 'live', label: '📊 Live Dashboard', content: '' },
      { id: 'alerts', label: '🚨 What to Alert On', content: ALERTS },
      { id: 'setup', label: '💻 Setup & REST', content: SETUP },
      { id: 'iq', label: '🎤 Interview Q&A', content: createIQSection(IQ_BANK.m18b || []) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  const cases = casesByModule('m18b');
  const scenHtml = cases && cases.length
    ? `<div class="section-header" style="margin:22px 0 12px"><div class="section-title">Corner cases — R-4471</div><div class="section-desc">The monitoring questions a senior interview actually asks.</div></div>${scenarioList(cases)}`
    : '';
  container.querySelector('#tab-system').insertAdjacentHTML('beforeend', scenHtml);
  const cleanup = buildDashboard(container);
  initIQ(container);
  return cleanup;
}
