// Module 6 — Operators & Transformations
// Pick an operator category, see Uber GPS event flow through it,
// with live input→output animation and code snippets.

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
    code: `stream.map(event -> new SpeedRecord(
    event.driverId,
    event.speed > 80 // isSpeeding
));`,
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
    code: `stream.filter(event -> event.speed > 0)
     // drops idle pings
     .filter(event -> event.speed < 200);
     // sanity bound (GPS glitch)`,
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
    code: `stream.flatMap((event, out) -> {
    out.collect(new LocationUpdate(event));
    if (event.speed > 80) {
        out.collect(new SpeedAlert(event));
    }
});`,
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
    code: `stream
  .keyBy(event -> event.driverId)
  // ↑ hash(driverId) % parallelism
  // D-001 always → subtask[1]
  // D-002 always → subtask[0]
  .process(new FraudDetector());`,
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
    code: `keyedStream
  .reduce((prev, curr) -> {
      return curr.speed > prev.speed
          ? curr   // new speed record
          : prev;  // keep existing max
  });
// Output: running max speed per driver`,
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
    code: `class FraudDetector extends KeyedProcessFunction<...> {
    ValueState<List<Long>> tripTimes;

    public void processElement(GPSEvent e, Context ctx,
                               Collector<Alert> out) {
        List<Long> times = tripTimes.value();
        times.add(e.timestamp);
        // keep only last 10 min
        long cutoff = ctx.timestamp() - 600_000;
        times.removeIf(t -> t < cutoff);
        tripTimes.update(times);
        if (times.size() >= 3) out.collect(new Alert(e));
        // timer to clear state after inactivity
        ctx.timerService().registerEventTimeTimer(
            ctx.timestamp() + 600_000);
    }
}`,
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

export function mount(container) {
  let selectedOp = OPS[0];
  let animFrame = null;
  let animStep = 0;
  let animTimer = null;

  container.innerHTML = `
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 6</span>
        <h1 class="module-title">Operators &amp; Transformations</h1>
        <p class="module-subtitle">Click an operator to see Uber GPS events transform — input on the left, output on the right, code in the middle.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="sim">Operator Explorer</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="sim">
      <div class="op-picker" id="op-picker"></div>
      <div class="op-arena" id="op-arena"></div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq6-section"></div>
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
          <div class="code-block" style="margin-top:12px;font-size:11px;max-height:180px;overflow-y:auto"><pre>${op.code}</pre></div>
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
