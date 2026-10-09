// Module 6 — Operators & Transformations
// Pick an operator category, see Uber GPS event flow through it,
// with live input→output animation and code snippets.

import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const GPS_EVENTS = [
  { driverId: 'D-001', lat: 37.773, lon: -122.431, speed: 28, ts: 1000 },
  { driverId: 'D-002', lat: 37.781, lon: -122.445, speed:  0, ts: 1010 },
  { driverId: 'D-001', lat: 37.774, lon: -122.432, speed: 95, ts: 1020 },
  { driverId: 'D-003', lat: 37.765, lon: -122.418, speed: 31, ts: 1030 },
  { driverId: 'D-002', lat: 37.782, lon: -122.446, speed: 12, ts: 1040 },
  { driverId: 'D-001', lat: 37.776, lon: -122.433, speed: 29, ts: 1050 },
  { driverId: 'D-003', lat: 37.768, lon: -122.419, speed:  0, ts: 1060 },
  { driverId: 'D-003', lat: 37.769, lon: -122.420, speed: 45, ts: 1070 },
];

const OPS = [
  {
    id: 'map',
    label: 'map()',
    icon: '🔄',
    category: 'Transformation',
    tagline: '1-to-1 transformation — every record in, every record out (transformed)',
    desc: '<strong>map()</strong> applies a function to each element and emits exactly one output per input. It\'s a stateless, embarrassingly parallel operator — perfect for field extraction, type conversion, or enrichment.',
    uber: 'Extract just the fields needed for fraud scoring: <code>{driverId, speed, lat, lon}</code> → <code>{driverId, isSpeeding: speed>80}</code>',
    code: `stream.map(
    lambda e: {"driver_id": e["driver_id"],
               "is_speeding": e["speed"] > 80},
    output_type=Types.MAP(Types.STRING(), Types.STRING()))`,
    transform: events => events.map(e => ({
      ...e,
      isSpeeding: e.speed > 80,
      _label: `{driverId:${e.driverId}, speed:${e.speed}, isSpeeding:${e.speed > 80}}`,
    })),
    inputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}}`,
    outputLabel: e => `{driverId:${e.driverId}, isSpeeding:${e.speed > 80}}`,
    outputColor: e => e.speed > 80 ? '#ef4444' : '#10b981',
  },
  {
    id: 'filter',
    label: 'filter()',
    icon: '🚫',
    category: 'Transformation',
    tagline: 'Conditional pass-through — only records matching the predicate flow downstream',
    desc: '<strong>filter()</strong> passes only events that satisfy a boolean predicate. Non-matching records are dropped entirely. Stateless. Think of it as a gate: open for matching events, closed for others.',
    uber: 'Drop GPS pings from idle drivers (speed == 0) before feeding the fraud model — reduces load by ~30%.',
    code: `(stream.filter(lambda e: e["speed"] > 0)      # drop idle pings
       .filter(lambda e: e["speed"] < 200))   # sanity bound (GPS glitch)`,
    transform: events => events.filter(e => e.speed > 0),
    inputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}}`,
    outputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}} ✓`,
    outputColor: () => '#10b981',
    droppedColor: () => '#ef444480',
    isDropped: e => e.speed === 0,
  },
  {
    id: 'flatmap',
    label: 'flatMap()',
    icon: '📋',
    category: 'Transformation',
    tagline: '1-to-N: each input can emit zero, one, or many output records',
    desc: '<strong>flatMap()</strong> is like map + flatten. Each input element produces a collection (or nothing). Useful for exploding nested data or emitting multiple derived events from one source event.',
    uber: 'From each GPS ping, emit one "location update" record AND (if speed > 80) an additional "speed alert" record. One ping → two downstream events.',
    code: `def expand(e):
    yield ("LocationUpdate", e)
    if e["speed"] > 80:
        yield ("SpeedAlert", e)

stream.flat_map(expand)   # one ping -> 1 or 2 records`,
    transform: events => events.flatMap(e => {
      const out = [{ ...e, _type: 'LocationUpdate', _label: `LocationUpdate{${e.driverId}}` }];
      if (e.speed > 80) out.push({ ...e, _type: 'SpeedAlert', _label: `SpeedAlert{${e.driverId}, speed:${e.speed}}` });
      return out;
    }),
    inputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}}`,
    outputLabel: e => e._type === 'SpeedAlert' ? `⚠ SpeedAlert{${e.driverId}}` : `LocationUpdate{${e.driverId}}`,
    outputColor: e => e._type === 'SpeedAlert' ? '#ef4444' : '#6366f1',
  },
  {
    id: 'keyby',
    label: 'keyBy()',
    icon: '🔑',
    category: 'Partitioning',
    tagline: 'Hash-routes each event to the same subtask by key — enabling per-key state',
    desc: '<strong>keyBy()</strong> is not a transformation — it\'s a <strong>shuffle</strong>. Records are hash-routed so all events with the same key always arrive at the same operator subtask. This is what makes per-driver stateful processing possible.',
    uber: 'keyBy(driverId) ensures all GPS pings for driver D-001 go to FraudDetector[0] — which holds that driver\'s history in ValueState. No cross-subtask coordination needed.',
    code: `(stream
   .key_by(lambda e: e["driver_id"])   # hash(driver_id) % parallelism
   # D-001 always -> subtask[1]
   # D-002 always -> subtask[0]
   .process(FraudDetector()))`,
    transform: events => {
      const keys = [...new Set(events.map(e => e.driverId))];
      return events.map(e => ({ ...e, _bucket: keys.indexOf(e.driverId) % 3 }));
    },
    inputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}}`,
    outputLabel: e => `→ subtask[${['D-001','D-002','D-003'].indexOf(e.driverId)}]{${e.driverId}}`,
    outputColor: e => ['#6366f1','#f59e0b','#10b981'][['D-001','D-002','D-003'].indexOf(e.driverId)],
  },
  {
    id: 'reduce',
    label: 'reduce() / aggregate()',
    icon: '📊',
    category: 'Stateful',
    tagline: 'Fold incoming records into running state — e.g. running max, sum, or count',
    desc: '<strong>reduce()</strong> combines two consecutive values into one using an associative function. <strong>aggregate()</strong> is more flexible: separate accumulator type, add/merge/getResult phases. Both are <strong>stateful</strong> — the accumulator lives in the operator\'s managed state.',
    uber: 'Track the max speed seen so far per driver. When a new GPS ping arrives, compare to stored max — emit an alert if a new record speed is detected.',
    code: `keyed_stream.reduce(
    lambda prev, curr: curr if curr["speed"] > prev["speed"] else prev)
# Output: running max speed per driver`,
    transform: events => {
      const maxSpeed = {};
      return events.map(e => {
        maxSpeed[e.driverId] = Math.max(maxSpeed[e.driverId] || 0, e.speed);
        return { ...e, _maxSpeed: maxSpeed[e.driverId] };
      });
    },
    inputLabel: e => `{driverId:${e.driverId}, speed:${e.speed}}`,
    outputLabel: e => `{driverId:${e.driverId}, maxSpeed:${e._maxSpeed}}`,
    outputColor: () => '#FF6B35',
  },
  {
    id: 'process',
    label: 'process() / KeyedProcessFunction',
    icon: '⚙️',
    category: 'Stateful',
    tagline: 'Full access to state, timers, and side outputs — the most powerful operator',
    desc: '<strong>KeyedProcessFunction</strong> gives you: (1) arbitrary <code>ValueState/ListState/MapState</code>, (2) event-time and processing-time timers you can set per key, (3) side outputs for routing events to different streams. The Swiss Army knife of Flink operators.',
    uber: 'FraudDetector uses KeyedProcessFunction: state stores last 5 trip timestamps per driver. On each GPS ping, check if ≥3 trips in 10 min → fraud. Register a cleanup timer for 10 min after the last event to clear stale state.',
    code: `class FraudDetector(KeyedProcessFunction):
    def open(self, ctx):
        self.trip_times = ctx.get_state(
            ListStateDescriptor("trip_times", Types.LONG()))

    def process_element(self, e, ctx):
        times = [t for t in self.trip_times.get()] + [e["event_time"]]
        cutoff = ctx.timestamp() - 600_000          # last 10 min
        times = [t for t in times if t >= cutoff]
        self.trip_times.update(times)
        if len(times) >= 3:
            yield {"driver_id": e["driver_id"], "alert": "FRAUD"}
        # timer to clear state after inactivity
        ctx.timer_service().register_event_time_timer(
            ctx.timestamp() + 600_000)`,
    transform: events => {
      const history = {};
      return events.map(e => {
        if (!history[e.driverId]) history[e.driverId] = [];
        history[e.driverId].push(e.ts);
        const isFraud = history[e.driverId].length >= 3;
        return { ...e, _fraud: isFraud, _trips: history[e.driverId].length };
      });
    },
    inputLabel: e => `{driverId:${e.driverId}, ts:${e.ts}}`,
    outputLabel: e => e._fraud ? `⚠ FRAUD Alert {${e.driverId}, trips:${e._trips}}` : `OK {${e.driverId}, trips:${e._trips}}`,
    outputColor: e => e._fraud ? '#ef4444' : '#10b981',
  },
];

const IQS = [
  { q: 'What is the difference between map() and flatMap() in Flink?', a: 'map() is a 1-to-1 transformation — each input produces exactly one output. flatMap() is 1-to-N — each input can produce zero, one, or many outputs via a Collector. Use flatMap when you need to skip records (filter-like), explode nested collections, or derive multiple events from one input (e.g., one GPS ping → one location update + one speed alert if speeding).' },
  { q: 'Why does keyBy() matter for correctness, not just performance?', a: 'keyBy() is a correctness requirement for per-key stateful operators. It guarantees all events with the same key are processed by the same subtask in order. Without keyBy(), a stateful operator would see an interleaved mix of keys — each subtask would hold incomplete state and produce wrong results. Flink\'s ValueState/ListState is implicitly scoped to the current key; calling it outside a keyed context throws a runtime exception.' },
  { q: 'What is the difference between reduce() and aggregate() in Flink?', a: 'reduce() requires the accumulator and output to have the same type as the input — limiting but simple. aggregate() separates the accumulator type (ACC), input type (IN), and output type (OUT), and provides three functions: add(IN, ACC), merge(ACC, ACC) for combining partial aggregates across sessions, and getResult(ACC) for the final output. Use aggregate() whenever your accumulator needs a different shape than the raw input.' },
  { q: 'What makes KeyedProcessFunction more powerful than map/filter?', a: 'Three capabilities: (1) Arbitrary state — ValueState, ListState, MapState, AggregatingState all scoped per key. (2) Timers — you can register callbacks at future event-time or processing-time instants per key (e.g., "alert if I don\'t see a heartbeat in 60s"). (3) Side outputs — emit records to multiple parallel downstream streams with different types. map/filter/reduce are specializations with less surface area; KeyedProcessFunction is the general case.' },
  { q: 'What is an operator chain and when does Flink break it?', a: 'Flink chains consecutive operators with the same parallelism and a FORWARD data exchange into a single task thread — data passes as Java objects, no serialization or network. A chain breaks when: (1) parallelism changes (forcing a data exchange), (2) the exchange strategy is not FORWARD (e.g., keyBy introduces a hash shuffle), (3) you call .startNewChain() or .disableChaining() explicitly, or (4) you set a different slot-sharing group. Breaking a chain adds a network hop but also isolates operator resources.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
// Grounds the reader before the Operator Explorer: what an operator IS,
// why a raw stream is useless without them, and the problems they solve.
const WHY_REASONS = [
  { icon: '✂️', title: 'Reshape every record', body: 'A raw GPS ping carries ~20 fields; the fraud model needs 3. <code>map()</code> trims and derives fields so downstream stages stay cheap.' },
  { icon: '🚫', title: 'Drop the noise', body: 'Idle drivers (<code>speed == 0</code>) emit pings too. <code>filter()</code> gates them out before they ever reach the model — ~30% less load.' },
  { icon: '📋', title: 'Fan one event into many', body: '<code>flatMap()</code> lets one ping emit a location update <em>and</em> a speed alert — 1 input, 0..N outputs.' },
  { icon: '🔑', title: 'Route by key', body: '<code>keyBy(driverId)</code> hash-routes every event for a driver to the same subtask — the prerequisite for per-driver state.' },
  { icon: '📊', title: 'Fold into a running result', body: '<code>reduce()</code>/<code>aggregate()</code> turn a stream of pings into one evolving answer per driver (max speed, trip count).' },
  { icon: '⚙️', title: 'Arbitrary logic + timers', body: '<code>KeyedProcessFunction</code> adds state, per-key timers, and side outputs — the general case behind every other operator.' },
];

const PROBLEMS = [
  { naive: 'Push the raw Kafka stream straight into the fraud model.', fail: 'Idle pings, GPS glitches and 20 unused fields flood the model — cost and latency explode.', fix: 'Compose <code>filter()</code> + <code>map()</code> to clean and trim before the expensive stage.' },
  { naive: 'Process all drivers in one operator instance with a shared dict.', fail: 'Subtasks see an interleaved mix of every driver — per-driver counts are wrong and un-parallelizable.', fix: '<code>keyBy(driverId)</code> guarantees one driver → one subtask, so state is correct and scales.' },
  { naive: 'Use <code>map()</code> when one event must become several.', fail: 'map() is strictly 1-to-1 — you can\'t split a ping into "update + alert" or skip a bad record.', fix: '<code>flatMap()</code> emits 0, 1, or many records per input via a Collector.' },
  { naive: 'Recompute the max speed by re-reading history every event.', fail: 'Re-scanning the stream per ping is O(n²) and needs unbounded memory.', fix: '<code>reduce()</code>/<code>aggregate()</code> keep a tiny running accumulator in managed state.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🔀</div>
      <div>
        <div class="sm-def-eyebrow">What is an operator?</div>
        <p class="sm-def-lead">An <b>operator</b> is a single processing step that takes a stream in and emits a stream out. <b>Transformations</b> are how you chain operators to reshape, filter, route, and aggregate an unbounded stream — turning a firehose of raw GPS pings into decisions. On ride <b>R-4471</b>, operators are everything that happens between Kafka and the fraud alert.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Stateless vs. stateful operators</div>
      <div class="section-desc">The single distinction that decides how an operator behaves, scales, and recovers.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">Stateless</div>
        <p class="sm-vs-sub">Output depends only on the current record. No memory between events.</p>
        <ul>
          <li><code>map()</code> — 1-to-1 reshape</li>
          <li><code>filter()</code> — conditional pass-through</li>
          <li><code>flatMap()</code> — 1-to-N expand</li>
        </ul>
        <div class="sm-vs-note">Embarrassingly parallel — any subtask can process any record.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">Stateful</div>
        <p class="sm-vs-sub">Output depends on past records too — the operator remembers something per key.</p>
        <ul>
          <li><code>reduce()</code> / <code>aggregate()</code> — running fold</li>
          <li><code>KeyedProcessFunction</code> — state + timers</li>
          <li>windows, joins, dedup</li>
        </ul>
        <div class="sm-vs-note">Requires <code>keyBy()</code> first so each key's history lands on one subtask.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why a stream needs operators</div>
      <div class="section-desc">A raw event stream is just noise — six jobs operators do to make it useful.</div>
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
      <div class="section-title">The problem operators solve</div>
      <div class="section-desc">Four ways a pipeline breaks when you reach for the wrong operator — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Operator</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">keyBy() — the shuffle that enables everything stateful</div>
    </div>
    <div class="sm-keyed card">
      <p><code>keyBy()</code> is not a transformation — it's a <b>partitioning</b> step. Records are hash-routed so that every event for a key always arrives at the same operator subtask, in order.</p>
      <ul>
        <li><b>Isolation</b> — driver D-001's state is never touched by D-002's events.</li>
        <li><b>Distribution</b> — keys spread across subtasks, so throughput scales with parallelism.</li>
        <li><b>Correctness</b> — <code>ValueState</code>/<code>ListState</code> is implicitly scoped to the current key; without keyBy() it throws.</li>
      </ul>
      <div class="sm-keyed-flow">
        <code>ride-events</code> <span class="sm-arrow">→</span> <b>keyBy(driver_id)</b> <span class="sm-arrow">→</span> <code>hash % parallelism</code> <span class="sm-arrow">→</span> D-001 → subtask[1], D-002 → subtask[0] <span class="sm-arrow">→</span> stateful process()
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now watch the records flow</div>
        <p>You know <b>what</b> each operator does and <b>why</b> — see Uber GPS events transform live, input → output, with the PyFlink code.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="sim">Open the Operator Explorer →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selectedOp = OPS[0];
  let animFrame = null;
  let animStep = 0;
  let animTimer = null;

  container.innerHTML = `
    ${rideSpine({ active: ['RIDE_REQUESTED', 'DRIVER_SEARCHING'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 6</span>
        <h1 class="module-title">Operators &amp; Transformations</h1>
        <p class="module-subtitle">Click an operator to see Uber GPS events transform — input on the left, output on the right, code in the middle.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="sim">Operator Explorer</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="sim">
      ${rideCallout('RIDE_REQUESTED', { openEvent: false })}
      <div class="op-picker" id="op-picker"></div>
      <div class="op-arena" id="op-arena"></div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Operator-level questions (async enrichment, dedup) anchored to the ride.</div>
      </div>
      <div id="op-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More operator Q&amp;A</div></div>
      <div class="iq-section" id="iq6-section"></div>
    </div>
  `;

  initRideSpine(container);
  const opScen = container.querySelector('#op-scenarios');
  if (opScen) opScen.innerHTML = scenarioList(casesByModule('m06'));

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Operator Explorer tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // IQ
  const iqSection = container.querySelector('#iq6-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq6-${i}">
      <div class="iq-question" data-idx="${i}">
        <span>${item.q}</span><span class="iq-chevron">›</span>
      </div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq6-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Operator picker
  const picker = container.querySelector('#op-picker');
  picker.innerHTML = OPS.map(op => `
    <button class="op-pill${op.id === selectedOp.id ? ' active' : ''}" data-op="${op.id}">
      ${op.icon} ${op.label}
      <span class="op-pill-cat">${op.category}</span>
    </button>
  `).join('');
  picker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedOp = OPS.find(o => o.id === btn.dataset.op);
      picker.querySelectorAll('.op-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderArena();
    });
  });

  function renderArena() {
    const arena = container.querySelector('#op-arena');
    const op = selectedOp;
    const outputs = op.transform(GPS_EVENTS);

    arena.innerHTML = `
      <div class="op-info-bar">
        <div class="op-info-icon">${op.icon}</div>
        <div>
          <div class="op-info-title">${op.label} <span class="badge" style="background:var(--surface2);color:var(--text-secondary);font-size:11px">${op.category}</span></div>
          <div class="op-info-tagline">${op.tagline}</div>
        </div>
      </div>
      <div class="op-flow-grid">
        <div class="op-col">
          <div class="op-col-header">INPUT (GPS Events)</div>
          <div class="op-col-body" id="op-inputs">
            ${GPS_EVENTS.map((e, i) => `
              <div class="op-record${op.isDropped && op.isDropped(e) ? ' op-record-dropped' : ''}" id="inp-${i}" data-idx="${i}">
                ${op.inputLabel(e)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="op-col op-col-center">
          <div class="op-col-header">OPERATOR</div>
          <div class="op-box">
            <div class="op-box-name">${op.icon} ${op.label}</div>
            <div class="op-box-desc">${op.desc}</div>
          </div>
          <div class="code-block" style="margin-top:12px;font-size:11px;max-height:220px;overflow-y:auto"><span class="lang-tag">PyFlink</span><pre>${op.code}</pre></div>
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber</div>
            <p class="fs-12">${op.uber}</p>
          </div>
        </div>
        <div class="op-col">
          <div class="op-col-header">OUTPUT</div>
          <div class="op-col-body" id="op-outputs">
            ${outputs.map((e, i) => `
              <div class="op-record" id="out-${i}" style="border-color:${op.outputColor(e)};color:${op.outputColor(e)}">
                ${op.outputLabel(e)}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ${op.id === 'filter' ? `<div class="op-legend"><span class="op-legend-dot" style="background:#10b981"></span> Passes &nbsp; <span class="op-legend-dot" style="background:#ef4444"></span> Dropped</div>` : ''}
    `;
  }

  renderArena();
}
