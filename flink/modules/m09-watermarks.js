// Module 9 — Watermark Simulator
// Interactive: add GPS events with custom event times, set the allowed
// lateness / out-of-orderness bound, watch the watermark advance,
// and see which events trigger windows vs. are flagged as late.

import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const WINDOW_SIZE = 10; // seconds

const IQS = [
  { q: 'What is a watermark and why does Flink need it?', a: 'A watermark is a monotonically increasing timestamp injected into the data stream that asserts "no event with event time < W will arrive after this point." Flink uses watermarks to know when it is safe to close a time window and produce a result. Without watermarks, a window operator would have to wait forever (or use processing time). Watermarks let Flink work with event time while still making forward progress in real time.' },
  { q: 'What is bounded out-of-orderness and how does it translate to a watermark?', a: 'Bounded out-of-orderness assumes events arrive at most Δ seconds late relative to their event time. The watermark formula is: W(t) = max(observed_event_time) − Δ. With Δ=5s, if the latest event seen has event time 100s, the watermark is 95s — meaning the operator is confident it has seen all events up to 95s. A window [80s, 90s) closes when the watermark passes 90s, i.e., when Flink sees an event with event time ≥ 95s.' },
  { q: 'What happens to late events (event time < watermark)?', a: 'By default, late events are silently dropped after the window closes. You have three options: (1) allowedLateness(Duration) — keep the window alive for an additional period after the watermark passes; late events re-trigger the window and produce updated results. (2) sideOutputLateData(tag) — route late events to a side output stream for separate handling (e.g., a correction pipeline). (3) Both together: allow lateness for a window, plus capture anything beyond the late deadline to a side output.' },
  { q: 'How do watermarks propagate through multiple parallel operators?', a: 'Each source subtask generates its own watermark independently. When watermarks from multiple partitions/subtasks meet at a downstream operator (e.g., after a keyBy), Flink takes the minimum across all incoming watermarks — the "lowest watermark wins" rule. This is conservative: the downstream operator cannot advance past the slowest upstream source. A single stalled source partition (or idle subtask) blocks ALL downstream watermarks. To avoid this, mark idle sources with WatermarkStrategy.withIdleness(Duration).' },
  { q: 'What is the difference between a periodic watermark and a punctuated watermark?', a: 'A periodic watermark is generated at a fixed wall-clock interval (e.g., every 200ms) by calling getCurrentWatermark() on the WatermarkGenerator. Flink\'s built-in BoundedOutOfOrdernessWatermarks is periodic. A punctuated watermark is emitted on specific events — you call ctx.emitWatermark() from onEvent() when a sentinel event (e.g., a "flush" message) appears. Periodic is simpler and common; punctuated is used when the stream itself carries reliable timestamp signals (e.g., Kafka end-of-partition markers).' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '🔀', title: 'Events arrive out of order', body: 'A tunnel delays R-4471\'s <code>t=21</code> ping so it lands <em>after</em> <code>t=27</code>. Real streams are never perfectly ordered — processing can\'t assume arrival order equals event order.' },
  { icon: '✅', title: 'Decide "I\'m done"', body: 'A watermark is Flink\'s declaration: "I believe I\'ve now seen everything up to time T." That belief is what lets a window close and emit a result.' },
  { icon: '⏱️', title: 'Fire windows on event time', body: 'Without watermarks, a window would either wait forever or fire on wall-clock time (wrong). The watermark passing a window\'s end is the trigger to compute it.' },
  { icon: '🏷️', title: 'Classify late data', body: 'Any event with <code>event_time &lt; watermark</code> is "late." The watermark is the dividing line that lets Flink drop, re-fire, or side-output it — deliberately, not by accident.' },
  { icon: '📉', title: 'Bound the wait', body: 'Out-of-orderness Δ trades latency for completeness: <code>W = max(eventTime) − Δ</code>. Bigger Δ catches more stragglers but delays results.' },
  { icon: '🧊', title: 'Survive idle sources', body: 'A watermark at an operator is the <em>minimum</em> across inputs, so one silent partition freezes everything. <code>withIdleness()</code> excludes it — a classic incident fix.' },
];

const PROBLEMS = [
  { naive: 'Close a window only once "all" events have arrived.', fail: 'In an unbounded stream there is no "all" — the window <b>never fires</b> and results never come.', fix: 'A watermark asserts completeness up to time T, so the window fires when T passes its end.' },
  { naive: 'Trigger windows on processing (arrival) time.', fail: 'A tunnel-delayed ping lands in the <b>wrong window</b> — trip distance and fraud counts are computed on the wrong minutes.', fix: 'Event-time windows keyed on the embedded timestamp put each ping in its true window regardless of arrival.' },
  { naive: 'Fire the moment the latest timestamp reaches the window end.', fail: 'Slightly out-of-order pings arrive <b>after</b> the window closed and are silently dropped — undercounted results.', fix: '<code>W = max(eventTime) − Δ</code> holds the window open by Δ to absorb normal reordering.' },
  { naive: 'Take the max watermark across input partitions.', fail: 'One partition racing ahead closes windows before slow partitions deliver — <b>mass data loss</b>.', fix: 'Flink takes the <b>minimum</b> watermark across inputs; <code>withIdleness()</code> drops only truly silent ones.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🌊</div>
      <div>
        <div class="sm-def-eyebrow">What is a watermark?</div>
        <p class="sm-def-lead">A <b>watermark</b> is a timestamp marker flowing in the stream that asserts <em>"no event with event time earlier than this will arrive anymore."</em> It's how Flink reconciles <b>event time</b> (when something happened) with the need to make <b>forward progress</b> in real time — the signal that says a time window is complete and safe to emit. On ride <b>R-4471</b>, it's what decides whether a tunnel-delayed GPS ping still counts toward the trip.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Processing time vs. event time</div>
      <div class="section-desc">Watermarks exist only because these two clocks disagree.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">⏰ Processing time</div>
        <p class="sm-vs-sub">When the event <em>arrives</em> at the operator (wall clock).</p>
        <ul>
          <li>Simple, low latency</li>
          <li>No watermarks needed</li>
          <li>Results depend on network speed</li>
        </ul>
        <div class="sm-vs-note">A tunnel-delayed ping lands in whatever window is open now — wrong answer.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">🕐 Event time</div>
        <p class="sm-vs-sub">When the event actually <em>happened</em> (embedded timestamp).</p>
        <ul>
          <li>Correct, reproducible results</li>
          <li>Needs watermarks to make progress</li>
          <li>Tolerates out-of-order arrival</li>
        </ul>
        <div class="sm-vs-note">The ping counts toward its real minute — the watermark just delays firing to catch it.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why a stream needs watermarks</div>
      <div class="section-desc">Six jobs the watermark does that a plain timestamp can't.</div>
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
      <div class="section-title">The problem watermarks solve</div>
      <div class="section-desc">Four ways time-based processing breaks without them — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Watermark</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The one formula to remember</div>
    </div>
    <div class="sm-keyed card">
      <p>Every watermark is just this: the latest event time seen, minus the lateness you're willing to tolerate.</p>
      <div class="sm-keyed-flow" style="justify-content:center;font-size:15px">
        <b>W(t)</b> <span class="sm-arrow">=</span> <code>max(eventTime)</code> <span class="sm-arrow">−</span> <b>Δ</b> <span style="color:var(--text-muted)">(out-of-orderness bound)</span>
      </div>
      <ul style="margin-top:14px">
        <li><b>Δ = 0</b> — fire the instant the window end is reached; any reordering is lost.</li>
        <li><b>Δ larger</b> — hold windows open longer, catch more stragglers, add latency.</li>
        <li>A window <code>[a, b)</code> fires when <b>W ≥ b</b>; events after that are "late."</li>
      </ul>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now tune it yourself</div>
        <p>You know <b>what</b> a watermark is and <b>why</b> — drag the Δ slider, add out-of-order pings, and watch which window gets each event and what happens to late ones.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="sim">Open the Simulator →</button>
    </div>
  </div>
`;

export function mount(container) {
  let allowedLateness = 5; // seconds — the out-of-orderness bound
  let sideOutputEnabled = false;
  // R-4471's GPS pings (seconds into the ride). Arrival order = array order;
  // event time = et. The tunnel ping (#5, et=21) and the stuck ping (#7, et=19)
  // arrive out of order — this is DEFECT-1 and DEFECT-2 from the ride story.
  let events = [
    { id: 1, et: 15, label: 'R-4471 GPS t=15 (arriving)' },
    { id: 2, et: 19, label: 'R-4471 GPS t=19' },
    { id: 3, et: 23, label: 'R-4471 GPS t=23' },
    { id: 4, et: 27, label: 'R-4471 GPS t=27' },
    { id: 5, et: 21, label: 'R-4471 GPS t=21 ⚠ tunnel (DEFECT-1)' },
    { id: 6, et: 31, label: 'R-4471 GPS t=31' },
    { id: 7, et: 19, label: 'R-4471 GPS t=19 ⚠ stuck 3m+ (DEFECT-2)' },
    { id: 8, et: 35, label: 'R-4471 GPS t=35' },
  ];
  let nextId = 9;

  container.innerHTML = `
    ${rideSpine({ active: ['DRIVER_ARRIVING', 'LOCATION_UPDATED'], incidents: ['DEFECT-1', 'DEFECT-3'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 9</span>
        <h1 class="module-title">Watermark Simulator</h1>
        <p class="module-subtitle">Add GPS events, tune out-of-orderness, and watch the watermark decide which window gets each event — and what happens to late arrivals.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="sim">Simulator</button>
      <button class="tab-btn" data-tab="concept">Concepts</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="sim">
      <div class="wm-controls card">
        <div class="wm-ctrl-row">
          <div class="wm-ctrl-group">
            <label class="ctrl-label">Out-of-orderness bound (Δ): <strong id="ool-val">${allowedLateness}s</strong></label>
            <input type="range" id="ool-slider" min="0" max="15" value="${allowedLateness}" style="width:180px">
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <label class="ctrl-label">Side output for late events</label>
            <button id="side-toggle" class="btn btn-secondary" style="min-width:72px">OFF</button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-left:auto">
            <input id="new-et" type="number" min="0" max="60" value="35" style="width:70px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:13px">
            <button class="btn btn-primary" id="add-evt-btn">+ Add Event (t=<span id="new-et-display">35</span>s)</button>
          </div>
        </div>
      </div>
      <div id="wm-timeline-wrap" style="margin:20px 0;overflow-x:auto"></div>
      <div class="grid-2 gap-20">
        <div id="wm-event-list" class="card p-20"></div>
        <div id="wm-window-list" class="card p-20"></div>
      </div>
      <div class="wm-legend">
        <span><span class="wm-dot" style="background:#10b981"></span> On-time</span>
        <span><span class="wm-dot" style="background:#ef4444"></span> Late (dropped)</span>
        <span><span class="wm-dot" style="background:#f59e0b"></span> Late → side output</span>
        <span><span class="wm-dot" style="background:#6366f1"></span> Pending (window open)</span>
      </div>
    </div>

    <div class="tab-content" data-tab="concept">
      ${rideCallout('DRIVER_ARRIVING', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">The Watermark Formula</h3>
          <div style="text-align:center;padding:20px;background:var(--surface2);border-radius:8px;font-size:18px;font-weight:700;color:var(--accent);font-family:var(--font-mono,monospace)">W(t) = max(eventTime) − Δ</div>
          <p style="color:var(--text-secondary);margin-top:16px;line-height:1.7">The watermark at any point is the maximum event time seen so far, minus the out-of-orderness bound Δ. A window <code>[a, b)</code> closes when the watermark exceeds <code>b</code>, meaning Flink is confident no event with event time in <code>[a, b)</code> will arrive anymore. For R-4471 this is how Flink decides whether a tunnel-delayed GPS ping still counts toward the trip’s distance.</p>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Watermark strategy for R-4471’s GPS</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 10px">The strategy that reads <code>event_time</code> off each ping, tolerates 10s of tunnel reordering, and — critically — marks a quiet city partition idle so it can’t freeze every window (DEFECT-3).</p>
          ${pyCode('watermark_strategy')}
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Late ping → re-fire, then side output</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 10px">The tunnel ping (et=21) arrives after the watermark but inside <code>allowedLateness</code> → the window re-fires. The ping stuck 3m+ (DEFECT-2) is past that → diverted to a side stream, never silently dropped.</p>
          ${pyCode('late_data_side_output')}
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Idle partition stalls everything (DEFECT-3)</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 10px">An operator’s watermark is the <strong>minimum</strong> across its input partitions. At 03:10 a silent partition pins that minimum in the past, so <em>no</em> window fires though data is flowing. <code>withIdleness(15s)</code> excludes the quiet partition from the min.</p>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0">See the <code>.with_idleness(Duration.of_seconds(15))</code> line in the strategy above — that single call is the fix for the classic “my windows stopped firing” incident.</p>
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">The hard, scenario-style watermark questions, each answered against a real moment in the ride.</div>
      </div>
      <div id="wm-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px">
        <div class="section-title">More watermark Q&amp;A</div>
      </div>
      <div class="iq-section" id="iq9-section"></div>
    </div>
  `;

  // Ride lifecycle spine (click a stage to jump to the module that teaches it)
  initRideSpine(container);

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Simulator tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Interview corner-case scenario cards (R-4471 anchored)
  const scen = container.querySelector('#wm-scenarios');
  if (scen) scen.innerHTML = scenarioList(casesByModule('m09'));

  // IQ
  const iqSection = container.querySelector('#iq9-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq9-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq9-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Controls
  const oolSlider = container.querySelector('#ool-slider');
  const oolVal = container.querySelector('#ool-val');
  const sideToggle = container.querySelector('#side-toggle');
  const newEtInput = container.querySelector('#new-et');
  const newEtDisplay = container.querySelector('#new-et-display');
  const addBtn = container.querySelector('#add-evt-btn');

  oolSlider.addEventListener('input', () => {
    allowedLateness = +oolSlider.value;
    oolVal.textContent = allowedLateness + 's';
    render();
  });
  sideToggle.addEventListener('click', () => {
    sideOutputEnabled = !sideOutputEnabled;
    sideToggle.textContent = sideOutputEnabled ? 'ON' : 'OFF';
    sideToggle.className = sideOutputEnabled ? 'btn btn-primary' : 'btn btn-secondary';
    render();
  });
  newEtInput.addEventListener('input', () => { newEtDisplay.textContent = newEtInput.value; });
  addBtn.addEventListener('click', () => {
    const et = +newEtInput.value;
    if (isNaN(et) || et < 0) return;
    events.push({ id: nextId++, et, label: `New GPS t=${et}s` });
    events.sort((a, b) => a.et - b.et);
    render();
  });

  function classify(evt, watermark) {
    if (evt.et >= watermark) return 'pending';
    if (!sideOutputEnabled) return 'late';
    return 'side-output';
  }

  function computeState() {
    // Process events in arrival order (sort by et for sim simplicity)
    const sorted = [...events].sort((a, b) => a.et - b.et);
    let maxEt = 0;
    let watermark = -Infinity;
    const results = [];

    // Two passes: first compute final watermark from all events
    for (const e of sorted) maxEt = Math.max(maxEt, e.et);
    watermark = maxEt - allowedLateness;

    // Classify: events at et <= watermark arrived "after" window closed
    // For simulation: we process events in order by et, and watermark advances
    let runningMax = 0;
    let runningWM = -Infinity;
    for (const e of sorted) {
      // What was the watermark WHEN this event arrived?
      // In reality events arrive with jitter; we simulate by saying the previous
      // events already advanced the watermark.
      const wmAtArrival = runningMax - allowedLateness;
      let state;
      if (e.et > wmAtArrival) {
        state = 'on-time';
      } else {
        state = sideOutputEnabled ? 'side-output' : 'late';
      }
      runningMax = Math.max(runningMax, e.et);
      results.push({ ...e, state, wmAtArrival });
    }
    return { results, finalWM: watermark, maxEt };
  }

  function buildWindows(results) {
    const maxEt = Math.max(...results.map(r => r.et));
    const windows = [];
    for (let w = 0; w * WINDOW_SIZE < maxEt + WINDOW_SIZE; w++) {
      const start = w * WINDOW_SIZE;
      const end = start + WINDOW_SIZE;
      const members = results.filter(r => r.et >= start && r.et < end);
      windows.push({ start, end, members });
    }
    return windows.filter(w => w.members.length > 0 || w.start <= maxEt);
  }

  function render() {
    const { results, finalWM, maxEt } = computeState();
    const windows = buildWindows(results);
    renderTimeline(container, results, finalWM, maxEt, allowedLateness);
    renderEventList(container, results);
    renderWindowList(container, windows, finalWM);
  }

  render();
}

function renderTimeline(container, results, finalWM, maxEt, delta) {
  const wrap = container.querySelector('#wm-timeline-wrap');
  const W = 720, H = 120;
  const PAD = 40;
  const maxT = Math.max(maxEt + 5, 35);
  const scale = x => PAD + (x / maxT) * (W - PAD * 2);

  // Window boundaries
  const windows = [];
  for (let w = 0; w * WINDOW_SIZE < maxT; w++) windows.push(w * WINDOW_SIZE);

  let svg = `<svg width="${W}" height="${H}" style="font-family:var(--font-sans,sans-serif);min-width:${W}px">`;

  // Window bands
  windows.forEach((ws, i) => {
    const x1 = scale(ws), x2 = scale(ws + WINDOW_SIZE);
    svg += `<rect x="${x1}" y="20" width="${x2 - x1}" height="60" fill="${i % 2 === 0 ? 'rgba(99,102,241,0.05)' : 'rgba(255,107,53,0.05)'}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    svg += `<text x="${(x1 + x2) / 2}" y="16" text-anchor="middle" font-size="9" fill="var(--text-secondary)">W${ws}–${ws + WINDOW_SIZE}</text>`;
  });

  // Time axis
  svg += `<line x1="${PAD}" y1="80" x2="${W - PAD}" y2="80" stroke="var(--border)" stroke-width="1"/>`;
  for (let t = 0; t <= maxT; t += 5) {
    const x = scale(t);
    svg += `<line x1="${x}" y1="78" x2="${x}" y2="82" stroke="var(--border)" stroke-width="1"/>`;
    svg += `<text x="${x}" y="92" text-anchor="middle" font-size="9" fill="var(--text-secondary)">${t}s</text>`;
  }

  // Watermark line
  const wmX = scale(Math.max(finalWM, 0));
  svg += `<line x1="${wmX}" y1="20" x2="${wmX}" y2="80" stroke="#FF6B35" stroke-width="2" stroke-dasharray="5,3"/>`;
  svg += `<text x="${wmX + 4}" y="35" font-size="9" fill="#FF6B35">WM=${Math.max(finalWM, 0).toFixed(0)}s</text>`;

  // Events
  results.forEach((r, i) => {
    const x = scale(r.et);
    const color = evtColor(r.state);
    svg += `<circle cx="${x}" cy="55" r="7" fill="${color}" opacity="0.9"/>`;
    svg += `<text x="${x}" y="58" text-anchor="middle" font-size="8" fill="#fff" font-weight="700">${r.id}</text>`;
  });

  svg += `</svg>`;
  wrap.innerHTML = svg;
}

function renderEventList(container, results) {
  const el = container.querySelector('#wm-event-list');
  el.innerHTML = `
    <h4 style="margin:0 0 14px">Events (sorted by event time)</h4>
    ${results.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="width:20px;height:20px;border-radius:50%;background:${evtColor(r.state)};display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;flex-shrink:0">${r.id}</span>
        <div class="flex-1">
          <div style="font-size:13px;color:var(--text)">${r.label}</div>
          <div style="font-size:11px;color:var(--text-secondary)">WM at arrival: ${Math.max(r.wmAtArrival, 0).toFixed(0)}s</div>
        </div>
        <span class="badge" style="background:${evtColor(r.state)}22;color:${evtColor(r.state)};border:1px solid ${evtColor(r.state)}44;font-size:10px">${r.state}</span>
      </div>
    `).join('')}
  `;
}

function renderWindowList(container, windows, finalWM) {
  const el = container.querySelector('#wm-window-list');
  el.innerHTML = `
    <h4 style="margin:0 0 14px">Windows (${WINDOW_SIZE}s tumbling)</h4>
    ${windows.map(w => {
      const closed = finalWM >= w.end;
      const onTime = w.members.filter(m => m.state === 'on-time');
      const late = w.members.filter(m => m.state !== 'on-time');
      return `
        <div style="padding:10px 12px;border-radius:8px;border:1px solid ${closed ? 'var(--accent)' : 'var(--border)'};margin-bottom:10px;background:${closed ? 'var(--accent)08' : 'var(--surface)'}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:13px;font-weight:600;color:var(--text)">[${w.start}s, ${w.end}s)</span>
            <span class="badge" style="font-size:10px;background:${closed ? '#10b98122' : '#6366f122'};color:${closed ? '#10b981' : '#6366f1'};border:1px solid ${closed ? '#10b98144' : '#6366f144'}">${closed ? '✓ CLOSED' : 'OPEN'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${w.members.length === 0 ? 'No events' : `${onTime.length} on-time · ${late.length} late`}
            ${w.members.length > 0 ? ' · Events: ' + w.members.map(m => `<span style="color:${evtColor(m.state)}">#${m.id}</span>`).join(', ') : ''}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function evtColor(state) {
  if (state === 'on-time') return '#10b981';
  if (state === 'late') return '#ef4444';
  if (state === 'side-output') return '#f59e0b';
  return '#6366f1';
}
