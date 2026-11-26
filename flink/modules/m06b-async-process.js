// Module 06b — Async I/O, ProcessFunction, Timers & Side Outputs
// The operator-level tools a senior Flink engineer reaches for: Async I/O for
// external enrichment (ordered vs unordered, capacity, timeout), the low-level
// (Keyed)ProcessFunction with event/processing-time timers, and side outputs
// (OutputTag) for late data and dead-letter routing. Centrepiece is a canvas
// that races a BLOCKING sync lookup against Async I/O so you can see why async
// enrichment is non-negotiable at 1M GPS pings/sec.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { casesByModule } from '../data/interview-cases.js';

// ── Tab 1: async I/O ─────────────────────────────────────────────────────────
const ASYNC = `
  <div class="sm-def card">
    <div class="sm-def-ic">🔀</div>
    <div>
      <div class="sm-def-eyebrow">Why you never block in a Flink operator</div>
      <p class="sm-def-lead">To enrich R-4471's GPS pings with driver profiles, you must call an external store. Do it with a plain synchronous <code>map()</code> and the operator <b>blocks on every record</b> — one in-flight request at a time, throughput capped at <code>1 / latency</code>. At 1M pings/sec and 10ms lookups that is a catastrophe. <b>Async I/O</b> keeps many requests in flight at once, so throughput is bounded by concurrency, not round-trip time.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Ordered vs unordered, capacity &amp; timeout</div>
    <div class="section-desc">The three knobs that define an Async I/O operator.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🔢', 'Ordered', 'Results are emitted in input order. Flink buffers completed results until their predecessors finish — correct when downstream depends on order (e.g. event-time watermarks), but adds latency if one request is slow.'],
      ['🏃', 'Unordered', 'Results are emitted as soon as they return. Highest throughput and lowest latency, but output order ≠ input order. Fine when order does not matter downstream.'],
      ['📦', 'Capacity', 'Max in-flight requests per subtask. This is the real throughput lever — throughput ≈ capacity / latency. Too low starves throughput; too high can overwhelm the external system (backpressure is applied once capacity is full).'],
      ['⏱️', 'Timeout', 'How long to wait for a response before the request is considered failed. You must handle timeouts (retry or emit a default) or the job fails — a required piece people forget.'],
    ].map(([i, t, b]) => `<div class="sm-why"><div class="sm-why-ic">${i}</div><div class="sm-why-title">${t}</div><p>${b}</p></div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #3b82f6">
    <div class="sm-def-ic">💡</div>
    <div>
      <div class="sm-def-eyebrow">Async needs a genuinely async client</div>
      <p class="sm-def-lead" style="font-size:0.95rem">Async I/O only helps if the client is <b>actually non-blocking</b> (returns a future). Wrapping a blocking JDBC call in Async I/O just moves the blocking into a thread pool — you gain little. Use an async DB/HTTP client, or a dedicated executor, and complete the <code>ResultFuture</code> from its callback.</p>
    </div>
  </div>
`;

// ── Tab 3: ProcessFunction / timers / side outputs ───────────────────────────
const PROCESS = `
  <div class="sm-def card">
    <div class="sm-def-ic">⏱️</div>
    <div>
      <div class="sm-def-eyebrow">ProcessFunction — the low-level escape hatch</div>
      <p class="sm-def-lead"><code>KeyedProcessFunction</code> gives you everything the DSL hides: per-key <b>state</b>, <b>timers</b> (event- or processing-time), and <b>side outputs</b>. When <code>map/filter/window</code> can't express the logic — custom session gaps, timeout detection, de-duplication, routing — this is what you drop down to.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Timers</div>
    <div class="section-desc">Register a callback to fire at a future time — the basis of timeout and custom-window logic.</div>
  </div>
  <div class="sm-keyed card">
    <ul>
      <li><b>Event-time timers</b> fire when the <em>watermark</em> passes the registered time — aligned with your data's time, used for windowing/timeouts that must be correct under replay.</li>
      <li><b>Processing-time timers</b> fire on wall-clock — used for real-world timeouts ("no heartbeat for 30s").</li>
      <li>Timers are <b>scoped to a key</b> and <b>checkpointed</b>, so they survive failures. <code>onTimer()</code> is your callback; register with <code>ctx.timerService().registerEventTimeTimer(t)</code>.</li>
      <li>Classic use on R-4471: register a timer when a ride starts; if no "completed" event arrives before it fires, emit a "stuck ride" alert.</li>
    </ul>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">Side outputs (OutputTag)</div>
    <div class="section-desc">A second (or third) typed output stream from one operator — no extra pass over the data.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🕒', 'Late data', 'Window operators route events later than <code>allowedLateness</code> to a side output instead of dropping them — you keep them for reconciliation. The canonical watermark safety net.'],
      ['☠️', 'Dead-letter queue', 'Un-parseable or invalid pings go to a DLQ side output; the main stream stays clean and the job never crashes on one bad record.'],
      ['🔀', 'Split by type', 'One ProcessFunction can emit normal rides to the main output and fraud-suspect rides to a side output, each strongly typed, in a single pass.'],
      ['🏷️', 'How', 'Define an <code>OutputTag</code>, emit with <code>ctx.output(tag, value)</code>, then read the branch with <code>stream.get_side_output(tag)</code>.'],
    ].map(([i, t, b]) => `<div class="sm-why"><div class="sm-why-ic">${i}</div><div class="sm-why-title">${t}</div><p>${b}</p></div>`).join('')}
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">Related modules</div>
      <p class="sm-def-lead" style="font-size:0.95rem">Operators &amp; the DSL: <a href="#m06" style="color:#FF6B35;font-weight:600">Module 06</a>; late data &amp; <code>allowedLateness</code>: <a href="#m09" style="color:#FF6B35;font-weight:600">Watermarks (09)</a> and <a href="#m10" style="color:#FF6B35;font-weight:600">Windows (10)</a>; keyed state: <a href="#m11" style="color:#FF6B35;font-weight:600">State (11)</a>.</p>
    </div>
  </div>
`;

// ── Tab 4: PyFlink ───────────────────────────────────────────────────────────
const SETUP = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">Async I/O enrichment (PyFlink)</div>
    <div class="section-desc">Unordered for max throughput; always set capacity + timeout.</div>
  </div>
  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · DataStream</span><pre>from pyflink.datastream import AsyncFunction, AsyncDataStream, AsyncRetryStrategies
from pyflink.common.time import Time

class EnrichDriver(AsyncFunction):
    def open(self, ctx):
        self.client = AsyncDriverStore()         # a NON-blocking client

    async def async_invoke(self, ping, result_future):
        profile = await self.client.lookup(ping.driver_id)
        result_future.complete([{**ping, 'tier': profile.tier}])

    def timeout(self, ping, result_future):
        result_future.complete([{**ping, 'tier': 'unknown'}])   # must handle timeout

enriched = AsyncDataStream.unordered_wait(
    pings, EnrichDriver(),
    timeout=Time.milliseconds(200),
    capacity=100)                                 # up to 100 in-flight per subtask</pre></div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">KeyedProcessFunction with a timer + side output</div>
    <div class="section-desc">Detect a stuck ride; route late pings to a side output.</div>
  </div>
  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · KeyedProcessFunction</span><pre>from pyflink.datastream import KeyedProcessFunction, OutputTag
from pyflink.common.typeinfo import Types

late_tag = OutputTag("late-pings", Types.STRING())

class RideWatchdog(KeyedProcessFunction):
    def open(self, ctx):
        self.deadline = ctx.get_state(ValueStateDescriptor("deadline", Types.LONG()))

    def process_element(self, ping, ctx):
        if ping.type == "RIDE_STARTED":
            fire = ctx.timestamp() + 30 * 60 * 1000          # 30 min event-time
            ctx.timer_service().register_event_time_timer(fire)
            self.deadline.update(fire)
        if ping.event_time < ctx.timer_service().current_watermark():
            ctx.output(late_tag, f"late:{ping.id}")          # side output, not dropped
        else:
            yield enrich(ping)

    def on_timer(self, ts, ctx):
        yield alert(f"stuck-ride driver={ctx.get_current_key()}")   # timer fired → no completion

# read the side-output branch
late = enriched.get_side_output(late_tag)</pre></div>
`;

// ── Canvas: sync-vs-async enrichment race ────────────────────────────────────
// Labelled SIMULATION. Faithful to the mechanism: a synchronous lookup processes
// ONE request at a time (throughput = 1/latency); Async I/O keeps up to
// `capacity` requests in flight (throughput ≈ capacity/latency until input-bound).
// Ordered mode holds completed results in a reorder buffer until predecessors emit.
function themePalette() {
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  return dark
    ? { bg: '#0b1220', line: 'rgba(148,163,184,0.22)', text: '#e2e8f0', mut: '#94a3b8', track: '#1b2740' }
    : { bg: '#ffffff', line: 'rgba(100,116,139,0.26)', text: '#1e293b', mut: '#64748b', track: '#e2e8f0' };
}
const BLUE = '#3b82f6', GREEN = '#10b981', ORANGE = '#FF6B35', AMBER = '#f59e0b', RED = '#ef4444';
const LAT = 9;                 // latency in ticks per external call

function buildAsyncSim(container) {
  const host = container.querySelector('#tab-sim');
  host.innerHTML = `
    <div class="sim-note">⚙️ <b>Enrichment simulation.</b> Faithful to the mechanism: a synchronous lookup does <b>one</b> request at a time
      (throughput = 1/latency); Async I/O keeps up to <b>capacity</b> requests in flight (throughput ≈ capacity/latency). Each external
      call takes the same ${LAT} ticks — only concurrency differs.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row"><label>Mode</label></div>
        <div class="sim-actions" id="as-mode">
          <button class="ctrl-btn" data-mode="sync">🐌 Sync map()</button>
          <button class="ctrl-btn active" data-mode="async">🔀 Async I/O</button>
        </div>
        <div class="sim-ctl-row" style="margin-top:8px">
          <label for="as-cap">Capacity <span id="as-cap-val" class="sim-badge">8</span></label>
          <input type="range" id="as-cap" min="1" max="12" value="8" class="sim-range" />
        </div>
        <div class="sim-ctl-row" style="margin-top:6px">
          <label><input type="checkbox" id="as-ordered"> Ordered output</label>
        </div>
        <div class="sim-actions" style="margin-top:8px">
          <button class="ctrl-btn active" id="as-run">▶ Running</button>
          <button class="ctrl-btn" id="as-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="as-stats"></div>
      </div>
      <div class="sim-stage">
        <canvas id="as-canvas" width="700" height="440" style="width:100%;max-width:720px"></canvas>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>GPS pings arrive on the left and must be enriched by a call to the driver store (each call takes the same fixed time). In <b>Sync map()</b> only <b>one</b> request is in flight — the operator blocks until it returns, so the incoming queue backs up and throughput is pinned at <code>1 / latency</code>. Switch to <b>Async I/O</b> and up to <b>capacity</b> requests run concurrently; throughput jumps to roughly <code>capacity / latency</code> and the queue drains. The speed-up vs sync is shown live.</p>
      <p>Turn on <b>Ordered output</b> and watch the <b>reorder buffer</b>: a request that finishes while an earlier one is still in flight must wait, preserving input order at the cost of some latency. <b>Unordered</b> emits immediately — fastest, but output order ≠ input order.</p>
      <p><b>Interview angle:</b> capacity is the throughput lever (≈ capacity/latency), and backpressure kicks in once capacity is full. Use unordered unless downstream needs order; always set a timeout and handle it. And remember — Async I/O only helps with a genuinely non-blocking client.</p>
    </div>`;

  const canvas = host.querySelector('#as-canvas');
  const ctx = canvas.getContext('2d');
  const statsEl = host.querySelector('#as-stats');
  let mode = 'async', ordered = false, capacity = 8, running = true;
  let S, raf = null, acc = 0, lastT = performance.now();
  const TICK_MS = 90;

  function reset() {
    S = { seq: 0, queue: [], inflight: [], done: 0, emitted: 0, nextEmit: 1, reorder: [], emitWindow: [], t: 0, recentOut: [] };
  }
  reset();

  function effCap() { return mode === 'sync' ? 1 : capacity; }

  function step() {
    S.t += 1;
    // arrivals: steady supply (2/tick) so the operator is the bottleneck
    for (let i = 0; i < 2; i++) S.queue.push({ id: ++S.seq });
    if (S.queue.length > 60) S.queue.length = 60;      // cap visual queue
    // admit into in-flight up to capacity
    while (S.inflight.length < effCap() && S.queue.length) {
      const r = S.queue.shift(); r.prog = 0; S.inflight.push(r);
    }
    // advance in-flight
    const stillInflight = [];
    for (const r of S.inflight) {
      r.prog += 1;
      if (r.prog >= LAT) {
        S.done += 1;
        if (ordered) S.reorder.push(r);
        else { S.emitted += 1; S.emitWindow.push(S.t); pushOut(r.id); }
      } else stillInflight.push(r);
    }
    S.inflight = stillInflight;
    // ordered emit: release in input order
    if (ordered) {
      S.reorder.sort((a, b) => a.id - b.id);
      while (S.reorder.length && S.reorder[0].id === S.nextEmit) {
        const r = S.reorder.shift(); S.emitted += 1; S.nextEmit += 1; S.emitWindow.push(S.t); pushOut(r.id);
      }
      // nextEmit may skip ids still in flight; advance past already-emitted/absent
      if (S.reorder.length && !S.inflight.some(x => x.id === S.nextEmit) && S.reorder[0].id > S.nextEmit) {
        S.nextEmit = S.reorder[0].id;
      }
    } else {
      S.nextEmit = S.seq;
    }
    // throughput window (last 40 ticks)
    S.emitWindow = S.emitWindow.filter(t => t > S.t - 40);
  }
  function pushOut(id) { S.recentOut.push({ id, age: 0 }); if (S.recentOut.length > 14) S.recentOut.shift(); }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function renderStats() {
    const thr = (S.emitWindow.length / 40).toFixed(2);              // emitted per tick
    const syncThr = (1 / LAT);
    const speed = (thr / syncThr);
    statsEl.innerHTML =
      `<div class="sim-stat"><span>Mode</span><b>${mode === 'sync' ? 'Sync' : 'Async'}</b></div>` +
      `<div class="sim-stat"><span>In flight</span><b>${S.inflight.length}/${effCap()}</b></div>` +
      `<div class="sim-stat ${S.queue.length > 30 ? 'sim-stat-hot' : ''}"><span>Queue (backlog)</span><b>${S.queue.length}</b></div>` +
      `<div class="sim-stat"><span>Throughput</span><b>${(thr * 100 / 2).toFixed(0)}% of input</b></div>` +
      `<div class="sim-stat ${speed > 1.5 ? 'sim-stat-ok' : ''}"><span>vs sync map()</span><b>${speed.toFixed(1)}×</b></div>` +
      (ordered ? `<div class="sim-stat ${S.reorder.length ? 'sim-stat-hot' : ''}"><span>Reorder buffer</span><b>${S.reorder.length}</b></div>` : `<div class="sim-stat sim-stat-ok"><span>Emit</span><b>unordered</b></div>`);
  }

  function draw() {
    const pal = themePalette();
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui';

    // columns: queue | operator (in-flight) | reorder | output
    // queue
    ctx.fillStyle = pal.text; ctx.fillText('Incoming pings', 20, 24);
    const qx = 20, qy = 36, qw = 120, qh = 360;
    ctx.strokeStyle = pal.line; ctx.setLineDash([4, 4]); ctx.strokeRect(qx, qy, qw, qh); ctx.setLineDash([]);
    const shown = Math.min(S.queue.length, 36);
    for (let i = 0; i < shown; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      ctx.fillStyle = BLUE; ctx.beginPath();
      ctx.arc(qx + 18 + col * 28, qy + 18 + row * 20, 6, 0, 7); ctx.fill();
    }
    ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${S.queue.length} queued`, qx + qw / 2, qy + qh - 8);

    // operator (in-flight slots)
    const ox = 180, oy = 36, ow = 220, oh = 360;
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`Driver-store lookups (${mode === 'sync' ? '1 slot' : capacity + ' slots'})`, ox, 24);
    ctx.strokeStyle = pal.line; ctx.strokeRect(ox, oy, ow, oh);
    const cap = effCap();
    const cols = cap <= 1 ? 1 : 2, rows = Math.ceil(cap / cols);
    const cw = (ow - 30) / cols, chh = Math.min(40, (oh - 30) / rows);
    for (let i = 0; i < cap; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = ox + 10 + c * (cw + 10), y = oy + 10 + r * (chh + 8);
      const rec = S.inflight[i];
      ctx.fillStyle = pal.track; roundRect(x, y, cw, chh, 5); ctx.fill();
      if (rec) {
        ctx.fillStyle = (rec.prog >= LAT - 1 ? GREEN : ORANGE) + 'cc';
        roundRect(x, y, cw * (rec.prog / LAT), chh, 5); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('#' + rec.id, x + cw / 2, y + chh / 2 + 3);
      }
    }
    // arrow
    ctx.strokeStyle = pal.mut; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(qx + qw, oy + 20); ctx.lineTo(ox, oy + 20); ctx.stroke();

    // reorder buffer (ordered only)
    const rxx = 420;
    if (ordered) {
      ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('Reorder buffer', rxx, 24);
      ctx.strokeStyle = AMBER; ctx.setLineDash([4, 4]); ctx.strokeRect(rxx, 36, 130, 300); ctx.setLineDash([]);
      S.reorder.slice(0, 20).forEach((r, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        ctx.fillStyle = AMBER + 'cc'; roundRect(rxx + 10 + col * 40, 46 + row * 30, 34, 22, 4); ctx.fill();
        ctx.fillStyle = '#111'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('#' + r.id, rxx + 27 + col * 40, 61 + row * 30);
      });
      ctx.fillStyle = pal.mut; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('waiting for order', rxx + 65, 330);
    }

    // output
    const outX = ordered ? 570 : 460;
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Enriched out', outX, 24);
    ctx.fillStyle = GREEN; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(String(S.emitted), outX, 70);
    ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.fillText('emitted', outX, 86);
    S.recentOut.forEach((o, i) => {
      o.age += 1;
      const y = 110 + i * 20;
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(outX + 8, y, 6, 0, 7); ctx.fill();
      ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('#' + o.id, outX + 20, y + 3);
    });

    renderStats();
  }

  function loop(now) {
    const dt = now - lastT; lastT = now;
    if (running) { acc += dt; while (acc >= TICK_MS) { step(); acc -= TICK_MS; } }
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  host.querySelector('#as-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    mode = b.dataset.mode; reset();
    host.querySelectorAll('#as-mode .ctrl-btn').forEach(x => x.classList.toggle('active', x.dataset.mode === mode));
  });
  const capVal = host.querySelector('#as-cap-val');
  host.querySelector('#as-cap').addEventListener('input', e => { capacity = +e.target.value; capVal.textContent = capacity; });
  host.querySelector('#as-ordered').addEventListener('change', e => { ordered = e.target.checked; reset(); });
  const runBtn = host.querySelector('#as-run');
  runBtn.addEventListener('click', () => { running = !running; runBtn.textContent = running ? '▶ Running' : '⏸ Paused'; runBtn.classList.toggle('active', running); });
  host.querySelector('#as-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['LOCATION_UPDATED'] }) + createModuleShell({
    tag: '06b · Architecture · Uber Edition',
    title: 'Async I/O, ProcessFunction & Side Outputs',
    subtitle: 'The operator-level tools for production streams: non-blocking external enrichment with Async I/O (ordered/unordered, capacity, timeout), the low-level KeyedProcessFunction with event/processing-time timers, and side outputs for late data and dead-letter routing.',
    tabs: [
      { id: 'async', label: '🔀 Async I/O', content: ASYNC },
      { id: 'sim', label: '🏁 Sync vs Async Sim', content: '' },
      { id: 'process', label: '⏱️ ProcessFn · Timers · Side Outputs', content: PROCESS },
      { id: 'setup', label: '💻 PyFlink', content: SETUP },
      { id: 'iq', label: '🎤 Interview Q&A', content: createIQSection(IQ_BANK.m06b || []) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  const cases = casesByModule('m06b');
  if (cases && cases.length) {
    container.querySelector('#tab-async').insertAdjacentHTML('beforeend',
      `<div class="section-header" style="margin:22px 0 12px"><div class="section-title">Corner cases — R-4471</div><div class="section-desc">The enrichment / ProcessFunction questions a senior interview asks.</div></div>${scenarioList(cases)}`);
  }
  const cleanup = buildAsyncSim(container);
  initIQ(container);
  return cleanup;
}
