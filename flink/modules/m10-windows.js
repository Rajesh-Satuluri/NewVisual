// Module 10 — Windows
// Interactive window builder: choose Tumbling / Sliding / Session,
// tweak parameters, watch GPS events fall into windows and fire.

import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const RAW_EVENTS = [
  { id:1,  et:2,  driverId:'D-001', speed:28 },
  { id:2,  et:5,  driverId:'D-002', speed:35 },
  { id:3,  et:8,  driverId:'D-001', speed:91 },
  { id:4,  et:11, driverId:'D-003', speed:12 },
  { id:5,  et:14, driverId:'D-002', speed:60 },
  { id:6,  et:17, driverId:'D-001', speed:29 },
  { id:7,  et:23, driverId:'D-003', speed:44 },
  { id:8,  et:26, driverId:'D-001', speed:85 },
  { id:9,  et:31, driverId:'D-002', speed:19 },
  { id:10, et:34, driverId:'D-003', speed:72 },
  { id:11, et:38, driverId:'D-001', speed:33 },
  { id:12, et:42, driverId:'D-002', speed:50 },
];

const WINDOW_TYPES = [
  { id:'tumbling', label:'Tumbling', icon:'⬜' },
  { id:'sliding',  label:'Sliding',  icon:'🔲' },
  { id:'session',  label:'Session',  icon:'💬' },
];

const COLORS = { 'D-001':'#6366f1', 'D-002':'#f59e0b', 'D-003':'#10b981' };

const IQS = [
  { q:'What is the difference between tumbling and sliding windows?', a:'Tumbling windows are non-overlapping, fixed-size intervals — each event belongs to exactly one window. Sliding windows have a fixed size but advance by a slide interval smaller than the size, so events can belong to multiple overlapping windows. Example: a 10s sliding window advancing every 5s means event at t=7 appears in [0,10) and [5,15). Use tumbling for period aggregates (hourly trip counts); use sliding for rolling metrics (5-min average speed over the last 15 min).' },
  { q:'When should you use session windows over tumbling/sliding?', a:'Session windows are event-driven — they open on the first event and close after a gap of inactivity. They\'re ideal when the "natural unit" is user activity rather than a fixed clock interval. Uber uses session windows for trip sessions: the window starts when the driver accepts a trip and closes 2 minutes after the last GPS ping (the driver went offline or finished). Session windows handle variable-length sessions without you picking an arbitrary fixed size.' },
  { q:'What is "allowed lateness" and how does it interact with windows?', a:'After a window fires (watermark passes its end), Flink can keep the window state alive for an additional allowedLateness duration. Late events arriving within the lateness window re-trigger the window and produce an updated result (the trigger fires again). Events arriving after both the window end and the allowed lateness period are dropped (or sent to a side output). This trades memory (window state persists longer) for correctness (fewer dropped late events).' },
  { q:'How does keyBy interact with window operations?', a:'keyBy(driverId) partitions the stream so all events for the same driver go to the same subtask. Windows are then computed per-key independently — each driver has their own set of windows. Without keyBy (GlobalWindow), all events across all drivers feed into a single window per subtask, which requires custom triggers and is rarely what you want. The pattern keyBy().window().aggregate() is the idiomatic Flink pipeline for per-entity aggregations.' },
  { q:'What triggers a window to fire in event-time mode?', a:'A window fires when the watermark advances past the window\'s end time. For a tumbling [0,10) window, it fires when watermark ≥ 10. With allowedLateness(5s), it fires again for each late event arriving while watermark is in [10, 15). At watermark=15, the window is purged. You can also use custom triggers: CountTrigger (fire after N events), ContinuousEventTimeTrigger (fire every Δt within the window), or PurgingTrigger (clear state after firing).' },
];

function computeTumbling(events, size) {
  const map = new Map();
  for (const e of events) {
    const wStart = Math.floor(e.et / size) * size;
    const key = `${wStart}-${wStart+size}`;
    if (!map.has(key)) map.set(key, { start:wStart, end:wStart+size, events:[] });
    map.get(key).events.push(e);
  }
  return [...map.values()].sort((a,b) => a.start - b.start);
}

function computeSliding(events, size, slide) {
  const maxEt = Math.max(...events.map(e => e.et));
  const windows = [];
  for (let s = 0; s <= maxEt; s += slide) {
    const end = s + size;
    const members = events.filter(e => e.et >= s && e.et < end);
    if (members.length > 0) windows.push({ start:s, end, events:members });
  }
  return windows;
}

function computeSession(events, gap) {
  const sorted = [...events].sort((a,b) => a.et - b.et);
  const sessions = [];
  let cur = null;
  for (const e of sorted) {
    if (!cur || e.et - cur.lastEt > gap) {
      cur = { start:e.et, end:e.et+gap, lastEt:e.et, events:[] };
      sessions.push(cur);
    }
    cur.lastEt = e.et;
    cur.end = e.et + gap;
    cur.events.push(e);
  }
  return sessions;
}

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '♾️', title: 'Bound the unbounded', body: 'A GPS stream never ends, so "the average speed" has no answer. A window carves the infinite stream into finite buckets you <em>can</em> compute.' },
  { icon: '📊', title: 'Aggregate over time', body: 'Trips-per-10-min, rolling max speed, per-trip distance — every time-based metric is really "aggregate the events that fall in this window."' },
  { icon: '🚦', title: 'Emit on a schedule', body: 'A window gives a natural moment to produce a result: when it closes. Downstream (surge pricing, dashboards) gets a steady beat of outputs.' },
  { icon: '🧮', title: 'Keep state bounded', body: 'Instead of remembering every event forever, the operator holds only the current window\'s accumulator, then purges — memory stays flat.' },
  { icon: '🔑', title: 'Per-key windows', body: '<code>keyBy(driverId).window(...)</code> gives every driver their own independent windows — D-001\'s trips never mix with D-002\'s.' },
  { icon: '⏳', title: 'Shape by activity', body: 'Session windows open on the first ping and close after a gap — matching a real trip\'s variable length instead of an arbitrary fixed clock.' },
];

const PROBLEMS = [
  { naive: 'Aggregate "all events" to get a trip\'s average speed.', fail: 'The stream is unbounded — the aggregate <b>never completes</b> and no result is ever emitted.', fix: 'A window bounds the computation to a finite interval that closes and fires.' },
  { naive: 'Buffer every event and recompute the metric on each arrival.', fail: 'State grows without limit — eventually <b>OOM</b>, and every recompute is more expensive.', fix: 'A window keeps only its accumulator and purges after firing — memory stays flat.' },
  { naive: 'Use one fixed 10s window for everything.', fail: 'A trip lasts a variable number of minutes — fixed windows <b>split one trip</b> across buckets or merge two.', fix: 'Session windows close on an inactivity gap, matching the trip\'s real boundary.' },
  { naive: 'Compute a rolling 15-min metric with back-to-back tumbling windows.', fail: 'Tumbling windows don\'t overlap, so the "last 15 min" <b>jumps</b> instead of sliding smoothly.', fix: 'Sliding windows (size 15m, slide 5m) overlap to give a continuously updated rolling metric.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🪟</div>
      <div>
        <div class="sm-def-eyebrow">What is a window?</div>
        <p class="sm-def-lead">A <b>window</b> slices an unbounded stream into finite, bounded chunks so you can aggregate over them — count, sum, average, max. It's the answer to <em>"over what span of events should this computation run?"</em> On ride <b>R-4471</b>, windows turn an endless flow of GPS pings into per-minute distance, rolling speed, and a per-trip session.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why you can't just "aggregate the stream"</div>
      <div class="section-desc">The whole topic exists because a stream has no end.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">❌ Without windows</div>
        <p class="sm-vs-sub">Aggregate over the entire stream.</p>
        <ul>
          <li>"Average speed" never finishes</li>
          <li>State grows forever → OOM</li>
          <li>No natural moment to emit</li>
        </ul>
        <div class="sm-vs-note">An unbounded aggregate is a question with no answer.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">✅ With windows</div>
        <p class="sm-vs-sub">Aggregate over bounded slices that close and fire.</p>
        <ul>
          <li>Each window produces one result</li>
          <li>Only the live window's state is held</li>
          <li>Firing is driven by watermarks</li>
        </ul>
        <div class="sm-vs-note">Finite buckets → finite, repeatable answers on a steady beat.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why a stream needs windows</div>
      <div class="section-desc">Six jobs windows do that a raw aggregate can't.</div>
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
      <div class="section-title">The problem windows solve</div>
      <div class="section-desc">Four ways aggregation breaks without the right window — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Window</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Every window's four-phase lifecycle</div>
    </div>
    <div class="sm-keyed card">
      <p>No matter the type, a window moves through the same phases — <b>watermarks</b> (not wall-clock) drive the trigger.</p>
      <ul>
        <li><b>Assign</b> — a WindowAssigner places each event in one or more windows.</li>
        <li><b>Accumulate</b> — the event folds into the window's state (count/sum/accumulator).</li>
        <li><b>Trigger</b> — fires when the watermark passes the window end (plus any allowed lateness).</li>
        <li><b>Purge</b> — window state is cleared, keeping memory bounded.</li>
      </ul>
      <div class="sm-keyed-flow">
        <code>event</code> <span class="sm-arrow">→</span> <b>Assign</b> <span class="sm-arrow">→</span> <b>Accumulate</b> <span class="sm-arrow">→</span> <code>watermark ≥ end</code> <span class="sm-arrow">→</span> <b>Trigger</b> (emit) <span class="sm-arrow">→</span> <b>Purge</b>
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now build each window type</div>
        <p>You know <b>why</b> windows exist — switch between Tumbling, Sliding, and Session, tune the parameters, and watch GPS events fall into windows and fire.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="sim">Open the Window Builder →</button>
    </div>
  </div>
`;

export function mount(container) {
  let winType = 'tumbling';
  let size = 10, slide = 5, gap = 8;
  let filterDriver = 'ALL';

  container.innerHTML = `
    ${rideSpine({ active: ['RIDE_STARTED', 'LOCATION_UPDATED', 'DRIVER_ARRIVED'], incidents: ['DEFECT-2'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 10</span>
        <h1 class="module-title">Windows</h1>
        <p class="module-subtitle">Tumbling, Sliding, Session — pick a window type, tune the parameters, and watch Uber GPS events fall into windows and fire.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="sim">Window Builder</button>
      <button class="tab-btn" data-tab="concept">Concepts</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="sim">
      <div class="win-ctl-bar card">
        <div class="win-type-row">
          ${WINDOW_TYPES.map(w => `<button class="win-type-btn${w.id==='tumbling'?' active':''}" data-wt="${w.id}">${w.icon} ${w.label}</button>`).join('')}
        </div>
        <div class="win-param-row" id="win-params"></div>
        <div class="win-filter-row">
          <label class="ctrl-label">Filter driver:</label>
          <select id="driver-filter" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:13px">
            <option value="ALL">All drivers</option>
            <option value="D-001">D-001 (indigo)</option>
            <option value="D-002">D-002 (amber)</option>
            <option value="D-003">D-003 (green)</option>
          </select>
        </div>
      </div>
      <div id="win-timeline-wrap" style="margin:20px 0;overflow-x:auto"></div>
      <div id="win-results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;padding:0 0 8px"></div>
    </div>

    <div class="tab-content" data-tab="concept">
      ${rideCallout('LOCATION_UPDATED', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">⬜ Tumbling Window</h3>
          <p class="prose">Fixed size, no overlap. Each event falls in exactly one window. Simple, deterministic. Use for period aggregates.</p>
          ${pyCode('keyby_window_agg')}
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber</div>
            <p class="fs-12">Count trips completed per driver per 10-minute window for surge pricing calculation.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">🔲 Sliding Window</h3>
          <p class="prose">Fixed size, overlapping. Slide interval &lt; window size means events appear in multiple windows. Good for rolling metrics.</p>
          ${pyCode('sliding_window')}
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber</div>
            <p class="fs-12">Rolling 15-min max speed per driver, updated every 5 min — feeds the speeding alert model.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">💬 Session Window</h3>
          <p class="prose">Opens on first event; closes after a gap of inactivity. Variable length. Perfect for user sessions or trip boundaries.</p>
          ${pyCode('session_window')}
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber</div>
            <p class="fs-12">A trip session: window opens on trip-start GPS, closes 2 min after last ping. Computes per-trip distance, duration, avg speed.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Window Lifecycle</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:12px">Every window goes through four phases:</p>
          ${[['Assign','Event arrives, WindowAssigner places it in one or more windows'],['Accumulate','WindowFunction/AggregateFunction accumulates the event into window state'],['Trigger','Trigger evaluates whether to fire. EventTimeTrigger fires when watermark ≥ window end'],['Purge','After firing (and any allowedLateness period), window state is cleared from the state backend']].map(([t,d]) => `<div style="display:flex;gap:10px;margin-bottom:8px"><span style="color:var(--accent);font-weight:700;width:80px;flex-shrink:0">${t}</span><span style="color:var(--text-secondary);font-size:13px">${d}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Window gotchas asked in interviews, anchored to real moments in the ride.</div>
      </div>
      <div id="win-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More window Q&amp;A</div></div>
      <div class="iq-section" id="iq10-section"></div>
    </div>
  `;

  initRideSpine(container);

  // Interview corner-case scenario cards
  const winScen = container.querySelector('#win-scenarios');
  if (winScen) winScen.innerHTML = scenarioList(casesByModule('m10'));

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Window Builder tab.
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
  const iqSection = container.querySelector('#iq10-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq10-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq10-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Window type buttons
  container.querySelectorAll('.win-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.win-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      winType = btn.dataset.wt;
      renderParams();
      render();
    });
  });

  container.querySelector('#driver-filter').addEventListener('change', e => {
    filterDriver = e.target.value;
    render();
  });

  function renderParams() {
    const p = container.querySelector('#win-params');
    if (winType === 'tumbling') {
      p.innerHTML = `<label class="ctrl-label">Window size: <strong id="sz-val">${size}s</strong></label><input type="range" id="sz-slider" min="5" max="20" value="${size}" style="width:160px">`;
      p.querySelector('#sz-slider').addEventListener('input', e => { size = +e.target.value; p.querySelector('#sz-val').textContent = size+'s'; render(); });
    } else if (winType === 'sliding') {
      p.innerHTML = `
        <label class="ctrl-label">Size: <strong id="sz-val">${size}s</strong></label><input type="range" id="sz-slider" min="5" max="20" value="${size}" style="width:120px">
        <label class="ctrl-label" style="margin-left:16px">Slide: <strong id="sl-val">${slide}s</strong></label><input type="range" id="sl-slider" min="2" max="10" value="${slide}" style="width:120px">
      `;
      p.querySelector('#sz-slider').addEventListener('input', e => { size = +e.target.value; p.querySelector('#sz-val').textContent = size+'s'; render(); });
      p.querySelector('#sl-slider').addEventListener('input', e => { slide = +e.target.value; p.querySelector('#sl-val').textContent = slide+'s'; render(); });
    } else {
      p.innerHTML = `<label class="ctrl-label">Session gap: <strong id="gap-val">${gap}s</strong></label><input type="range" id="gap-slider" min="3" max="20" value="${gap}" style="width:160px">`;
      p.querySelector('#gap-slider').addEventListener('input', e => { gap = +e.target.value; p.querySelector('#gap-val').textContent = gap+'s'; render(); });
    }
  }

  function render() {
    const events = filterDriver === 'ALL' ? RAW_EVENTS : RAW_EVENTS.filter(e => e.driverId === filterDriver);
    let windows;
    if (winType === 'tumbling') windows = computeTumbling(events, size);
    else if (winType === 'sliding') windows = computeSliding(events, size, slide);
    else windows = computeSession(events, gap);

    renderTimeline(container, events, windows);
    renderResults(container, windows);
  }

  renderParams();
  render();
}

function renderTimeline(container, events, windows) {
  const wrap = container.querySelector('#win-timeline-wrap');
  const W = 720, PAD = 40;
  const maxEt = Math.max(...events.map(e => e.et), ...windows.map(w => w.end)) + 2;
  const scale = x => PAD + (x / maxEt) * (W - PAD * 2);

  const ROW_H = 36;
  const EVT_ROW = 28;
  const WIN_TOP = 72;
  const H = WIN_TOP + windows.length * (ROW_H + 4) + 30;

  let svg = `<svg width="${W}" height="${H}" style="font-family:var(--font-sans,sans-serif);min-width:${W}px">`;

  // Time axis
  svg += `<line x1="${PAD}" y1="${EVT_ROW+14}" x2="${W-PAD}" y2="${EVT_ROW+14}" stroke="var(--border)" stroke-width="1"/>`;
  for (let t = 0; t <= maxEt; t += 5) {
    const x = scale(t);
    svg += `<line x1="${x}" y1="${EVT_ROW+12}" x2="${x}" y2="${EVT_ROW+16}" stroke="var(--border)" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${EVT_ROW+26}" text-anchor="middle" font-size="9" fill="var(--text-secondary)">${t}s</text>`;
  }

  // Events on timeline
  svg += `<text x="${PAD}" y="${EVT_ROW-6}" font-size="9" fill="var(--text-secondary)" font-weight="700">EVENTS</text>`;
  events.forEach(e => {
    const x = scale(e.et);
    const c = COLORS[e.driverId] || '#aaa';
    svg += `<circle cx="${x}" cy="${EVT_ROW}" r="8" fill="${c}" opacity="0.9"/>`;
    svg += `<text x="${x}" y="${EVT_ROW+4}" text-anchor="middle" font-size="8" fill="#fff" font-weight="700">${e.id}</text>`;
  });

  // Window bands
  svg += `<text x="${PAD}" y="${WIN_TOP-6}" font-size="9" fill="var(--text-secondary)" font-weight="700">WINDOWS</text>`;
  const winColors = ['#6366f1','#f59e0b','#10b981','#FF6B35','#3b82f6','#8b5cf6','#ec4899'];
  windows.forEach((w, i) => {
    const x1 = scale(w.start), x2 = scale(w.end);
    const y = WIN_TOP + i * (ROW_H + 4);
    const c = winColors[i % winColors.length];
    svg += `<rect x="${x1}" y="${y}" width="${x2-x1}" height="${ROW_H}" rx="5" fill="${c}25" stroke="${c}" stroke-width="1.5"/>`;
    svg += `<text x="${x1+4}" y="${y+14}" font-size="9" fill="${c}" font-weight="700">W${i+1} [${w.start}–${w.end})</text>`;
    // Event dots inside window band
    w.events.forEach(e => {
      const ex = scale(e.et);
      if (ex >= x1 && ex <= x2) {
        svg += `<line x1="${ex}" y1="${EVT_ROW+8}" x2="${ex}" y2="${y}" stroke="${COLORS[e.driverId]}" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/>`;
      }
    });
    svg += `<text x="${x2-4}" y="${y+26}" text-anchor="end" font-size="8" fill="${c}" opacity="0.8">${w.events.length} events</text>`;
  });

  svg += '</svg>';
  wrap.innerHTML = svg;
}

function renderResults(container, windows) {
  const el = container.querySelector('#win-results');
  const winColors = ['#6366f1','#f59e0b','#10b981','#FF6B35','#3b82f6','#8b5cf6','#ec4899'];
  el.innerHTML = windows.map((w, i) => {
    const c = winColors[i % winColors.length];
    const avgSpeed = w.events.length ? Math.round(w.events.reduce((s,e) => s+e.speed, 0) / w.events.length) : 0;
    const maxSpeed = w.events.length ? Math.max(...w.events.map(e => e.speed)) : 0;
    return `
      <div class="card" style="padding:16px;border-left:3px solid ${c}">
        <div style="font-size:13px;font-weight:700;color:${c};margin-bottom:8px">W${i+1}: [${w.start}s, ${w.end}s)</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">${w.events.length} events · avg speed ${avgSpeed} · max ${maxSpeed}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${w.events.map(e => `<span style="padding:2px 8px;border-radius:12px;font-size:10px;background:${COLORS[e.driverId]}22;color:${COLORS[e.driverId]};border:1px solid ${COLORS[e.driverId]}44">#${e.id} ${e.driverId} t=${e.et}s</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}
