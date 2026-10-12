import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const IQS = [
  {
    q: 'What is the difference between event time, processing time, and ingestion time in Flink?',
    a: `<strong>Event time</strong>: The timestamp embedded in the event itself — when the event actually happened. For a GPS ping, it's when the driver's phone captured the location. Independent of when Flink receives it.<br><br>
    <strong>Processing time</strong>: When Flink's operator processes the event — i.e., "wall clock time right now." Simple to implement but produces incorrect results when events arrive out-of-order or late.<br><br>
    <strong>Ingestion time</strong>: When the event first enters the Flink source operator. A compromise — less skew than processing time, but doesn't recover the original event time if events are delayed in Kafka.<br><br>
    For production use-cases at Uber, <strong>event time is almost always correct</strong>. A GPS ping from a tunnel arrives 30 seconds late; you want it counted in the window when the driver was in the tunnel, not when it arrived.`,
    tip: 'Define all three clearly, then say: "Event time is the most correct but requires watermarks to handle late arrivals — that\'s the tradeoff."',
  },
  {
    q: 'Why does processing time produce incorrect results for windowed aggregations?',
    a: `Consider a 5-minute window aggregating Uber trips by driver. A driver completes a trip at 12:00:00 but the event arrives at Flink at 12:05:05 due to network delay.<br><br>
    With <strong>processing time</strong>: The event is assigned to the 12:05–12:10 window (when it arrived), not the 12:00–12:05 window (when it happened). The 12:00–12:05 window closes with the trip missing. The 12:05–12:10 window gains a trip that didn't happen in that period.<br><br>
    With <strong>event time</strong>: The event is assigned to the 12:00–12:05 window based on its embedded timestamp. With watermarks allowing late arrivals, it's included in the correct window.<br><br>
    For fraud detection: a fraudulent trip at 12:00 must be in the 12:00 fraud window. Using processing time, it might slip into the next window — missing the fraud spike threshold.`,
    tip: 'Use a concrete numeric example like above. Interviewers remember specifics.',
  },
  {
    q: 'When would you choose processing time over event time?',
    a: `Processing time is appropriate when:<br><br>
    1. <strong>Events are generated and consumed almost instantly</strong> — negligible delay between event creation and Flink processing (< 100ms). In-process event buses, direct socket streams.<br><br>
    2. <strong>You need the absolute lowest complexity</strong> — no watermark configuration, no late data handling. Useful for operational dashboards where slight inaccuracy is acceptable.<br><br>
    3. <strong>The business logic is "what are we processing right now"</strong> — live monitoring dashboards showing Flink's current throughput, not historical accuracy.<br><br>
    4. <strong>Events cannot have embedded timestamps</strong> — some IoT sensors don't include timestamps.<br><br>
    At Uber, processing time is used only for <strong>internal Flink health metrics</strong> (how many events per second is Flink processing right now). All business-facing pipelines use event time.`,
    tip: 'Saying "processing time is fine for operational monitoring but wrong for business logic" shows practical judgment.',
  },
  {
    q: 'What is ingestion time and when would it be useful?',
    a: `Ingestion time assigns the wall-clock timestamp when the event first enters Flink (at the source). It\'s automatically set by Flink, unlike event time which requires the event to carry a timestamp field.<br><br>
    <strong>Advantages over processing time</strong>: Events in the same "logical moment" get the same ingestion time even if processed by different operators at different clock times. Reduces skew within a pipeline.<br><br>
    <strong>Advantages over event time</strong>: No need for the event schema to include a timestamp. No watermark configuration needed.<br><br>
    <strong>Disadvantage</strong>: If events sit in Kafka for 10 minutes before Flink reads them, ingestion time is wrong by 10 minutes. Doesn't recover the original event time.<br><br>
    Use case: <strong>Semi-real-time ETL</strong> where source data doesn't have timestamps and you need something better than processing time but don't need exact event-time accuracy.`,
    tip: 'Ingestion time is rarely used in production. Knowing it exists and why it\'s a compromise shows depth.',
  },
  {
    q: 'A Uber GPS event arrives 45 seconds late to Flink due to a driver going through a tunnel. How does Flink handle it with event time?',
    a: `With event time and watermarks, Flink has a configured <strong>allowed lateness</strong> or <strong>watermark lag</strong>:<br><br>
    1. The GPS event has an embedded timestamp of T=12:00:00 (when phone captured it).<br>
    2. It arrives at Flink at T=12:00:45 (45s late due to tunnel).<br>
    3. If the watermark is configured with a 60s lag: <code>WatermarkStrategy.for_bounded_out_of_orderness(Duration.of_seconds(60))</code><br>
    4. The current watermark might be 11:59:30 (60s behind the latest event time seen). The event at 12:00:00 is still within the allowed lag — it's accepted into the correct 12:00 window.<br>
    5. The 12:00–12:05 window won't close (fire) until the watermark advances past 12:05. This happens when Flink sees events with timestamps ≥ 12:06:00.<br><br>
    If the event arrived 90 seconds late with a 60s watermark, it would be a "late element." You can either drop it, route it to a side output, or configure <code>allowedLateness()</code> to re-trigger the window.`,
    tip: 'Mention the three options for late elements: drop, side output, or allowedLateness re-trigger. This shows completeness.',
  },
];

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['DRIVER_ACCEPTED', 'RIDE_COMPLETED'] }) + createModuleShell({
    tag: '08 · Time & Windows · Uber Edition',
    title: 'Time Concepts in Flink',
    subtitle: 'Why does it matter WHEN a GPS ping happened vs when Flink saw it? Understand Event Time, Processing Time, and Ingestion Time — and why getting this wrong breaks Uber\'s fraud detection.',
    tabs: [
      { id: 'sim',       label: '🎮 Live Demo' },
      { id: 'concept',   label: '📖 Concepts' },
      { id: 'code',      label: '💻 Code' },
      { id: 'interview', label: '🎤 Interview Q&A' },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  container.querySelector('#tab-sim').innerHTML      = buildSimTab();
  container.querySelector('#tab-concept').innerHTML  = rideCallout('DRIVER_ACCEPTED', { openEvent: false }) + buildConceptTab();
  container.querySelector('#tab-code').innerHTML     = buildCodeTab();
  container.querySelector('#tab-interview').innerHTML =
    '<div class="section-header" style="margin-bottom:8px"><div class="section-title">Interview corner cases — on ride R-4471</div><div class="section-desc">Scenario-style questions answered against a real moment in the ride.</div></div>'
    + scenarioList(casesByModule('m08'))
    + '<div class="section-header" style="margin:22px 0 8px"><div class="section-title">More time Q&amp;A</div></div>'
    + createIQSection(IQS);
  initIQ(container);

  initDemo(container);
  return () => {};
}

// ── Demo Tab ──────────────────────────────────────────────────────────────
function buildSimTab() {
  return `
    <div style="margin-bottom:24px">
      <div class="section-header">
        <div class="section-title">The Uber Tunnel Problem</div>
        <div class="section-desc">Driver goes through a tunnel → GPS events arrive 30–60s late → which window do they belong to?</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:700">SCENARIO</div>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
            Driver A enters a tunnel at <strong class="t-pri">12:00:10</strong>.
            Their GPS pings buffer in the phone and burst-transmit at <strong class="t-pri">12:00:45</strong>
            when they exit the tunnel. Flink receives events 35 seconds after they happened.
          </p>
        </div>
        <div style="padding:14px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:700">THE QUESTION</div>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
            We have a 30-second fraud detection window. If the driver made a suspicious detour at 12:00:10,
            does that event appear in the <strong class="t-red">12:00 window</strong> or the
            <strong style="color:var(--yellow)">12:00:45 window</strong>?
          </p>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px" id="time-mode-btns">
        <button class="btn btn-secondary time-mode-btn active flex-1" data-tmode="processing">
          ⏰ Processing Time
        </button>
        <button class="btn btn-secondary time-mode-btn flex-1" data-tmode="ingestion">
          📥 Ingestion Time
        </button>
        <button class="btn btn-secondary time-mode-btn flex-1" data-tmode="event">
          📡 Event Time
        </button>
      </div>

      <div id="time-demo-area" style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span id="tmode-label" style="font-size:13px;font-weight:700;color:var(--yellow)">Processing Time</span>
          <button id="inject-late-btn" class="btn btn-primary" style="font-size:12px;padding:6px 14px">
            🚇 Inject Tunnel Event
          </button>
        </div>
        <div id="time-timeline" style="padding:24px 20px;min-height:240px;position:relative"></div>
        <div id="tmode-result" style="padding:14px 20px;border-top:1px solid var(--border);font-size:13px;color:var(--text-secondary)"></div>
      </div>
    </div>

    <div style="background:var(--bg-elevated);border-radius:10px;padding:16px 20px">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.5px">LEGEND</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div class="legend-row">
          <div style="width:12px;height:12px;border-radius:50%;background:#38BDF8"></div> Normal GPS event
        </div>
        <div class="legend-row">
          <div style="width:12px;height:12px;border-radius:50%;background:#F87171"></div> Tunnel / late event
        </div>
        <div class="legend-row">
          <div style="width:24px;height:3px;background:linear-gradient(90deg,#34D399,transparent)"></div> Watermark line
        </div>
        <div class="legend-row">
          <div style="width:24px;height:10px;background:rgba(255,107,53,0.15);border:1px solid rgba(255,107,53,0.3);border-radius:3px"></div> Window boundary
        </div>
      </div>
    </div>
  `;
}

// ── Demo Logic ────────────────────────────────────────────────────────────
function initDemo(container) {
  const modeBtns   = container.querySelectorAll('.time-mode-btn');
  const timeline   = container.querySelector('#time-timeline');
  const tmodeLabel = container.querySelector('#tmode-label');
  const tResult    = container.querySelector('#tmode-result');
  const injectBtn  = container.querySelector('#inject-late-btn');

  let currentMode = 'processing';

  // Base events (normal GPS pings, on time)
  const baseEvents = [
    { id: 1, eventT: 0,    arriveT: 0.5,  label: 'D-001 GPS', late: false },
    { id: 2, eventT: 5,    arriveT: 5.8,  label: 'D-002 GPS', late: false },
    { id: 3, eventT: 10,   arriveT: 10.3, label: 'D-001 GPS', late: false },
    { id: 4, eventT: 15,   arriveT: 15.6, label: 'D-003 GPS', late: false },
    { id: 5, eventT: 20,   arriveT: 20.4, label: 'D-002 GPS', late: false },
    { id: 6, eventT: 25,   arriveT: 25.7, label: 'D-004 GPS', late: false },
  ];

  let lateInjected = false;
  const lateEvent = { id: 99, eventT: 10, arriveT: 45, label: '🚇 D-001 TUNNEL', late: true };

  function getWindowAssignment(mode, event, isLate) {
    // 30-second windows
    const windowSize = 30;
    if (mode === 'processing' || mode === 'ingestion') {
      const t = mode === 'processing' ? event.arriveT : event.arriveT;
      const windowIdx = Math.floor(t / windowSize);
      return windowIdx * windowSize;
    } else {
      // event time
      const windowIdx = Math.floor(event.eventT / windowSize);
      return windowIdx * windowSize;
    }
  }

  function render() {
    const events = lateInjected ? [...baseEvents, lateEvent] : [...baseEvents];
    const mode = currentMode;

    // SVG timeline
    const svgW = 700, svgH = 180;
    const tMin = 0, tMax = 60;
    const scale = (t) => 20 + (t / tMax) * (svgW - 40);
    const tLabel = (t) => t + 's';

    // Windows: 0–30, 30–60
    const windows = [{ start: 0, end: 30, label: 'Window A\n0–30s' }, { start: 30, end: 60, label: 'Window B\n30–60s' }];

    const modeColors = { processing: '#FCD34D', ingestion: '#A78BFA', event: '#34D399' };
    const accentColor = modeColors[mode];

    const windowFills = windows.map(w => {
      const wEvents = events.filter(e => {
        const t = mode === 'event' ? e.eventT : e.arriveT;
        return t >= w.start && t < w.end;
      });
      return wEvents.length;
    });

    const svgLines = [];

    // Window backgrounds
    windows.forEach((w, i) => {
      const x1 = scale(w.start), x2 = scale(w.end);
      const alpha = 0.08 + windowFills[i] * 0.02;
      svgLines.push(`<rect x="${x1}" y="30" width="${x2-x1}" height="90" rx="6" fill="rgba(255,107,53,${alpha})" stroke="rgba(255,107,53,0.2)" stroke-width="1"/>`);
      svgLines.push(`<text x="${(x1+x2)/2}" y="24" text-anchor="middle" font-size="10" fill="rgba(255,107,53,0.7)" font-weight="700">Win ${i===0?'A':'B'} (${windowFills[i]} events)</text>`);
    });

    // Time axis
    svgLines.push(`<line x1="20" y1="140" x2="${svgW-20}" y2="140" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`);
    [0, 10, 20, 30, 40, 50, 60].forEach(t => {
      const x = scale(t);
      svgLines.push(`<line x1="${x}" y1="137" x2="${x}" y2="143" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`);
      svgLines.push(`<text x="${x}" y="155" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.3)">${t}s</text>`);
    });

    // Labels for rows
    svgLines.push(`<text x="14" y="75" text-anchor="end" font-size="9" fill="rgba(255,255,255,0.4)" transform="translate(-10,0)">Event ⏰</text>`);
    svgLines.push(`<text x="14" y="110" text-anchor="end" font-size="9" fill="rgba(255,255,255,0.4)" transform="translate(-10,0)">Arrive 📥</text>`);

    // Draw watermark line (event time only)
    if (mode === 'event' && lateInjected) {
      const wmX = scale(Math.max(...events.map(e => e.arriveT)) - 10);
      svgLines.push(`<line x1="${wmX}" y1="30" x2="${wmX}" y2="135" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>`);
      svgLines.push(`<text x="${wmX+3}" y="42" font-size="9" fill="${accentColor}" opacity="0.8">watermark</text>`);
    }

    // Draw events
    events.forEach(e => {
      const ex = scale(e.eventT);
      const ax = scale(e.arriveT);
      const col = e.late ? '#F87171' : '#38BDF8';

      // Dot on event-time row (y=70)
      svgLines.push(`<circle cx="${ex}" cy="70" r="5" fill="${col}" opacity="0.85"/>`);

      // Dot on arrive-time row (y=105)
      svgLines.push(`<circle cx="${ax}" cy="105" r="5" fill="${col}" opacity="0.85"/>`);

      // Connector line
      if (Math.abs(ex - ax) > 3) {
        svgLines.push(`<line x1="${ex}" y1="75" x2="${ax}" y2="100" stroke="${col}" stroke-width="1" opacity="0.3" stroke-dasharray="3,2"/>`);
      }

      // Highlight which window it's assigned to
      const assignT = mode === 'event' ? e.eventT : e.arriveT;
      const dotX = scale(assignT);
      svgLines.push(`<circle cx="${dotX}" cy="${mode==='event'?70:105}" r="7" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.9"/>`);

      // Label
      if (e.late) {
        svgLines.push(`<text x="${ax}" y="${105+16}" text-anchor="middle" font-size="8" fill="${col}">${e.label}</text>`);
      }
    });

    timeline.innerHTML = `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="overflow:visible">${svgLines.join('')}</svg>`;

    // Result message
    const lateW = lateInjected ? getWindowAssignment(mode, lateEvent) : null;
    const modeNames = { processing: 'Processing Time', ingestion: 'Ingestion Time', event: 'Event Time' };

    if (!lateInjected) {
      tResult.innerHTML = `<strong>Click "Inject Tunnel Event"</strong> to send the late GPS event and see how <span style="color:${accentColor}">${modeNames[mode]}</span> handles it.`;
    } else {
      const correctW = 0; // event happened in window 0–30
      const assignedW = lateW;
      const correct = assignedW === correctW;
      tResult.innerHTML = `
        <strong style="color:${accentColor}">${modeNames[mode]}</strong>:
        The tunnel event (happened at t=10s) is assigned to
        <strong style="color:${correct?'var(--green)':'var(--red)'}">Window ${assignedW===0?'A (0–30s)':'B (30–60s)'}</strong>.
        ${correct
          ? '✅ <strong style="color:var(--green)">Correct!</strong> Event time puts the event in the right fraud window — Uber\'s 12:00 detour is caught.'
          : '❌ <strong class="t-red">Wrong window!</strong> The detour at t=10s appears in Window B because Flink assigns it by when it <em>arrived</em> (t=45s), not when it <em>happened</em>. Fraud detection misses the spike in Window A.'
        }
      `;
    }
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
      });
      btn.classList.add('active');
      const colors = { processing: '#FCD34D', ingestion: '#A78BFA', event: '#34D399' };
      const c = colors[btn.dataset.tmode];
      btn.style.background = `${c}1a`;
      btn.style.color = c;
      btn.style.borderColor = `${c}66`;
      currentMode = btn.dataset.tmode;
      const labels = { processing: 'Processing Time', ingestion: 'Ingestion Time', event: 'Event Time ✅' };
      tmodeLabel.textContent = labels[currentMode];
      tmodeLabel.style.color = c;
      render();
    });
  });

  injectBtn.addEventListener('click', () => {
    lateInjected = true;
    injectBtn.disabled = true;
    injectBtn.textContent = '🚇 Tunnel Event Injected';
    render();
  });

  render();
}

// ── Concept Tab ───────────────────────────────────────────────────────────
function buildConceptTab() {
  return `
    <div class="section-header">
      <div class="section-title">Three Notions of Time</div>
      <div class="section-desc">Flink supports all three — choosing the right one determines whether your pipeline produces correct results</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:32px">
      ${[
        {
          icon:'⏰', name:'Event Time', color:'#34D399',
          who:'Set by the event source',
          what:'The timestamp embedded in the event itself. When did the GPS ping actually fire? When did the payment actually complete?',
          uber:'GPS ping captured at 12:00:10 in a tunnel. Even if Flink receives it at 12:00:45, event time = 12:00:10.',
          pros:['Produces correct results even with late/out-of-order events', 'Same result whether processing live or replaying history', 'Required for accurate windowed aggregations'],
          cons:['Requires watermarks to know when a window can close', 'Late events require handling strategy (drop/side-output/re-trigger)'],
          recommended: true,
        },
        {
          icon:'🖥️', name:'Processing Time', color:'#FCD34D',
          who:'Set by Flink when the operator processes it',
          what:'Wall clock time when Flink\'s operator processes the event. Simplest to implement — no watermarks needed.',
          uber:'GPS ping arrives at Flink at 12:00:45. Processing time = 12:00:45, regardless of when it was captured.',
          pros:['Zero configuration — no watermarks', 'Lowest latency for simple pipelines', 'Good for internal operational metrics'],
          cons:['Wrong results with out-of-order events', 'Non-deterministic: replaying history gives different results', 'Windows affected by processing bottlenecks'],
          recommended: false,
        },
        {
          icon:'📥', name:'Ingestion Time', color:'#A78BFA',
          who:'Set by Flink\'s source operator on intake',
          what:'Timestamp assigned when the event first enters Flink at the source. Between event time and processing time in accuracy.',
          uber:'GPS ping captured at 12:00:10, sits in Kafka for 5 minutes, enters Flink at 12:05:15. Ingestion time = 12:05:15.',
          pros:['More stable than processing time within a pipeline', 'No need for the event to carry a timestamp'],
          cons:['Wrong if events are delayed in Kafka/queue before source', 'Cannot recover original event time for historical replay'],
          recommended: false,
        },
      ].map(t => `
        <div class="card" style="border-color:${t.recommended?t.color+'44':'var(--border)'}">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span class="fs-28">${t.icon}</span>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:17px;font-weight:800">${t.name}</span>
                ${t.recommended?`<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${t.color}22;color:${t.color};font-weight:700;border:1px solid ${t.color}44">✓ Recommended for production</span>`:''}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${t.who}</div>
            </div>
          </div>
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.65;margin-bottom:12px">${t.what}</p>
          <div style="padding:10px 14px;background:var(--accent-dim);border-left:3px solid var(--accent);border-radius:0 6px 6px 0;margin-bottom:12px;font-size:13px;color:var(--text-secondary)">
            🚗 <strong class="t-pri">Uber:</strong> ${t.uber}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <div style="font-size:11px;color:var(--green);font-weight:700;margin-bottom:6px">✓ PROS</div>
              ${t.pros.map(p=>`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:flex;gap:6px"><span style="color:var(--green)">+</span>${p}</div>`).join('')}
            </div>
            <div>
              <div style="font-size:11px;color:var(--red);font-weight:700;margin-bottom:6px">✗ CONS</div>
              ${t.cons.map(c=>`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:flex;gap:6px"><span class="t-red">−</span>${c}</div>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Code Tab ──────────────────────────────────────────────────────────────
function buildCodeTab() {
  return `
    <div class="section-header">
      <div class="section-title">Configuring Time in Flink</div>
      <div class="section-desc">How to set up each time characteristic and watermark strategy in code</div>
    </div>

    <div class="mb-20">
      <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:10px">📡 Event Time (recommended for Uber GPS / billing)</div>
      ${pyCode('watermark_strategy')}
    </div>

    <div class="mb-20">
      <div style="font-size:13px;font-weight:700;color:var(--yellow);margin-bottom:10px">⏰ Processing Time (internal liveness metrics only)</div>
      ${pyCode('processing_time_window')}
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:var(--purple);margin-bottom:10px">📥 Ingestion Time</div>
      ${pyCode('ingestion_time')}
    </div>

    <div style="margin-top:20px;padding:16px;background:var(--green-dim);border-radius:10px;border:1px solid rgba(52,211,153,0.2)">
      <div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:8px">💡 Uber Best Practice</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.65">
        All Uber production Flink pipelines use <strong class="t-pri">event time with bounded out-of-orderness watermarks</strong>.
        The watermark lag is tuned per pipeline: GPS events use 60s (tunnel delay), payment events use 5s (near-instant),
        and surge pricing events use 120s (delayed mobile network in surge zones).
      </div>
    </div>
  `;
}
