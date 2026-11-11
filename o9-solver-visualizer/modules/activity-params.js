import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow, EventPacket } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is an activity in SCS, and what does the Activity Lead Time measure represent?',
    a: 'An activity <strong>either transforms or transports material between two material nodes</strong> — it is the edge of the network. <strong>Activity Lead Time</strong> denotes the lead time of the activity, i.e. the time an activity takes to complete itself, and it is given as a <strong>number of buckets</strong>. It is a <strong>mandatory</strong> measure, with granularity <code>&lt;Activity&gt; &lt;VersionName&gt;</code>. Supply-chain constraints are modelled through the activity\'s parameters.',
    tip: 'Say "an activity transforms or transports material between two material nodes; lead time is mandatory and measured in buckets".' },
  { q: 'How do the Effectivity dates control when an activity can be planned?',
    a: 'An activity is inactive <strong>before its Solver Activity Start Date</strong> and <strong>after its Solver Activity End Date</strong>; by default it is effective throughout the planning horizon. <strong>Flows are planned on an activity only when both start and end date are active.</strong> For example, if lead time is 5 buckets and the start date is week 2 and the end date is W5, <strong>nothing is planned</strong> on this activity. Planners use the start period to model a new route and the end date to cancel a route.',
    tip: 'The lead-time-5, start-W2, end-W5 → "nothing planned" example is the one interviewers want to hear.' },
  { q: 'What does the Frozen Horizon offset do, and what happens if both time-varying and expedited lead time are modelled on one activity?',
    a: 'The <strong>Activity Freeze Time Bucket Offset</strong> is numeric: it is the number of buckets from the current bucket up to which the solver <strong>will not consider producing fresh starts</strong> — no new activity plans are created in that window, and build-ahead will not build new supplies there (plans near term are fixed for execution). Separately, on the same activity <strong>time-varying lead time and expedited (reduced) lead time will not both work</strong>; if both are defined, <strong>time-varying lead time takes precedence</strong>.',
    tip: 'Frozen horizon = "no fresh starts in the near term". The precedence gotcha: time-varying LT beats expedite LT.' },
];

// ── Canvas model ─────────────────────────────────────────────────────────────
// An activity EDGE between an upstream material node (consumes RM) and a
// downstream material node (produces FG). A bucket timeline shows how Lead Time
// places the consumption (start) bucket earlier than the production (JIT) bucket,
// and how Effectivity and the Frozen Horizon can stop a plan being created.
const BUCKETS = ['W01','W02','W03','W04','W05','W06','W07','W08','W09','W10','W11','W12'];
const START_X = 50, BUCKET_W = 60, LANE_Y = 208;
const JIT_IDX = 7;            // production (JIT) at W08
const bx = i => START_X + i * BUCKET_W + BUCKET_W / 2;

const RM = { x: 36,  y: 40, w: 150, h: 52, cx: 111, cy: 66, label: 'RM @ Plant', sub: 'upstream material node' };
const FG = { x: 630, y: 40, w: 150, h: 52, cx: 705, cy: 66, label: 'FG @ Plant', sub: 'downstream material node' };

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Activity & Its Parameters',
    subtitle: 'An activity either transforms or transports material between two material nodes. Supply-chain constraints are modelled through its parameters — lead time, effectivity dates, frozen horizon, activity markers and holidays. Watch how lead time shifts the start bucket earlier, and how effectivity and the frozen horizon can stop a plan from being created at all.',
    tabs: [
      { id: 'activity', label: '⚙️ Activity Edge' },
      { id: 'params',   label: '📋 Core Parameters', content: paramsTab() },
      { id: 'timevar',  label: '⏱️ Time-Varying & Offsets', content: timevarTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-activity');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One <b style="color:#A78BFA">activity edge</b> links an upstream material node (where it <b style="color:#38BDF8">consumes</b>) to a downstream one (where it <b style="color:#10B981">produces</b>). Production lands on the demand/JIT bucket <b>W08</b>; the <b>consumption start bucket</b> sits <b>Lead Time</b> buckets earlier. Change the lead time, then switch on the <b>effectivity window</b> and the <b>frozen horizon</b> to see when the plan can no longer be created.</div>
      <canvas id="act-canvas" width="820" height="300" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="act-run">▶ Run (plan the activity)</button>
        <button class="ctrl-btn" id="act-lt-dec">− Lead Time</button>
        <button class="ctrl-btn" id="act-lt-inc">+ Lead Time</button>
        <button class="ctrl-btn" id="act-eff">📅 Effectivity window: off</button>
        <button class="ctrl-btn" id="act-frozen">❄️ Frozen horizon: off</button>
        <button class="ctrl-btn" id="act-reset">↺ Reset</button>
        <span class="ctrl-label" id="act-status">Lead time = 2 buckets. Press Run.</span>
      </div>
      <div id="act-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p><strong>Lead Time</strong> is the time the activity takes to complete itself, in <em>number of buckets</em> — a mandatory measure at <code>Activity × Version</code>. Supplies are consumed offset from the JIT bucket by the lead time, so raising the lead time pushes the <strong>consumption start bucket earlier</strong> (further left). This is the arithmetic behind build-ahead.</p>
      <p><strong>Effectivity</strong> makes the activity inactive before its <em>Solver Activity Start Date</em> and after its <em>Solver Activity End Date</em>; flows are planned only when both are active. Exactly as the wiki states — <em>lead time 5, start W2, end W5 → nothing is planned</em> — if a longer lead time pushes the start bucket out of the window, the plan disappears. The <strong>Frozen Horizon</strong> (Activity Freeze Time Bucket Offset) blocks <em>fresh starts</em> in the near-term buckets, so a start bucket that lands inside it cannot be created either.</p>
    </div>`;

  const canvas = tab.querySelector('#act-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const DEF = { leadTime: 2, eff: false, frozen: false };
  const EFF_START = 4, EFF_END = 10;   // effectivity window [W05 .. W11]
  const FROZEN_OFF = 3;                 // frozen horizon: W01..W03 (no fresh starts)

  let leadTime = DEF.leadTime, eff = DEF.eff, frozen = DEF.frozen;
  let packets = [], pulse = 0;

  const consIdx = () => JIT_IDX - leadTime;

  function status() {
    const ci = consIdx();
    if (ci < 0) return { ok: false, msg: `Start bucket is before the horizon (JIT − ${leadTime}) — nothing can start in time.` };
    if (eff && (ci < EFF_START || JIT_IDX > EFF_END))
      return { ok: false, msg: `Inactive — start bucket ${BUCKETS[ci]} is before the Solver Activity Start Date (${BUCKETS[EFF_START]}). Nothing is planned.` };
    if (frozen && ci < FROZEN_OFF)
      return { ok: false, msg: `No fresh start — start bucket ${BUCKETS[ci]} falls inside the frozen horizon (${BUCKETS[0]}–${BUCKETS[FROZEN_OFF-1]}).` };
    return { ok: true, msg: `Feasible — consume at ${BUCKETS[ci]}, produce at ${BUCKETS[JIT_IDX]} (offset by lead time ${leadTime}).` };
  }

  function updateLedger() {
    const ci = consIdx();
    const st = status();
    const el = tab.querySelector('#act-ledger');
    el.innerHTML = `
      <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Activity Lead Time</div><div class="info-card-body"><strong>${leadTime}</strong> bucket${leadTime === 1 ? '' : 's'} — mandatory, <code>Activity × Version</code>.</div></div>
      <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Consumption start bucket</div><div class="info-card-body">${ci < 0 ? '<span style="color:#EF4444">before horizon</span>' : '<strong>' + BUCKETS[ci] + '</strong>'} = JIT − lead time.</div></div>
      <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Production (JIT) bucket</div><div class="info-card-body"><strong>${BUCKETS[JIT_IDX]}</strong> — where the downstream demand is incident.</div></div>
      <div class="info-card" style="border-left:3px solid ${st.ok ? '#10B981' : '#EF4444'}"><div class="info-card-title">Plan status</div><div class="info-card-body">${st.ok ? '✅ ' : '🚫 '}${st.msg}</div></div>`;
  }

  function run() {
    const st = status();
    pulse = 46;
    tab.querySelector('#act-status').textContent = st.msg;
    if (st.ok) {
      packets.push(new EventPacket({ label: 'qty 100', color: '#A78BFA', speed: 2.0,
        path: [{ x: RM.cx, y: RM.cy }, { x: FG.cx, y: FG.cy }], onArrive: () => { pulse = 46; } }));
    }
    updateLedger();
  }
  function setLead(n) {
    leadTime = Math.max(1, Math.min(6, n));
    tab.querySelector('#act-status').textContent = `Lead time = ${leadTime} bucket${leadTime === 1 ? '' : 's'}. Press Run.`;
    updateLedger();
  }
  function toggleEff() { eff = !eff; tab.querySelector('#act-eff').textContent = `📅 Effectivity window: ${eff ? 'on' : 'off'}`; updateLedger(); }
  function toggleFrozen() { frozen = !frozen; tab.querySelector('#act-frozen').textContent = `❄️ Frozen horizon: ${frozen ? 'on' : 'off'}`; updateLedger(); }
  function reset() {
    leadTime = DEF.leadTime; eff = DEF.eff; frozen = DEF.frozen; packets = []; pulse = 0;
    tab.querySelector('#act-eff').textContent = '📅 Effectivity window: off';
    tab.querySelector('#act-frozen').textContent = '❄️ Frozen horizon: off';
    tab.querySelector('#act-status').textContent = 'Lead time = 2 buckets. Press Run.';
    updateLedger();
  }

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    if (pulse > 0) pulse--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const ci = consIdx();
    const st = status();

    // ── effectivity + frozen bands (behind the lane) ──
    const bandTop = 188, bandBot = 238;
    if (eff) {
      const x0 = START_X + EFF_START * BUCKET_W, x1 = START_X + (EFF_END + 1) * BUCKET_W;
      ctx.fillStyle = '#10B98115'; ctx.fillRect(x0, bandTop, x1 - x0, bandBot - bandTop);
      ctx.strokeStyle = '#10B98166'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.strokeRect(x0, bandTop, x1 - x0, bandBot - bandTop); ctx.setLineDash([]);
      ctx.fillStyle = '#10B981'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('effectivity window (start … end)', x0 + 4, bandTop - 4);
    }
    if (frozen) {
      const x0 = START_X, x1 = START_X + FROZEN_OFF * BUCKET_W;
      ctx.fillStyle = '#64748B22'; ctx.fillRect(x0, bandTop, x1 - x0, bandBot - bandTop);
      // hatch
      ctx.save(); ctx.beginPath(); ctx.rect(x0, bandTop, x1 - x0, bandBot - bandTop); ctx.clip();
      ctx.strokeStyle = '#64748B55'; ctx.lineWidth = 1;
      for (let hx = x0 - 50; hx < x1; hx += 8) { ctx.beginPath(); ctx.moveTo(hx, bandTop); ctx.lineTo(hx + 50, bandBot); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('frozen horizon — no fresh starts', x0 + 4, bandBot + 28);
    }

    // ── bucket lane ──
    BUCKETS.forEach((b, i) => {
      const x = START_X + i * BUCKET_W;
      const cur = i === 0;
      drawRoundRect(ctx, x + 3, LANE_Y, BUCKET_W - 6, 26, 5, cur ? '#141b2e' : '#111827', '#1E293B');
      ctx.textAlign = 'center'; ctx.font = (cur ? 'bold ' : '') + '10px system-ui';
      ctx.fillStyle = cur ? '#38BDF8' : '#64748B';
      ctx.fillText(b, x + BUCKET_W / 2, LANE_Y + 17);
    });
    ctx.textAlign = 'left'; ctx.font = '8px system-ui'; ctx.fillStyle = '#475569';
    ctx.fillText('current bucket', START_X + 4, LANE_Y + 46);

    // ── lead-time bracket between start and JIT ──
    if (ci >= 0) {
      const xA = bx(ci), xB = bx(JIT_IDX), yBr = 168;
      ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xA, yBr); ctx.lineTo(xB, yBr);
      ctx.moveTo(xA, yBr); ctx.lineTo(xA, yBr + 8);
      ctx.moveTo(xB, yBr); ctx.lineTo(xB, yBr + 8); ctx.stroke();
      ctx.fillStyle = '#A78BFA'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`lead time = ${leadTime} bucket${leadTime === 1 ? '' : 's'}`, (xA + xB) / 2, yBr - 5);
    }

    // ── markers on the lane: consumption (blue) + production (green) ──
    const okCons = st.ok;
    if (ci >= 0) marker(ctx, bx(ci), LANE_Y, '#38BDF8', 'consume', BUCKETS[ci], okCons ? 1 : 0.4, pulse > 0 && okCons);
    marker(ctx, bx(JIT_IDX), LANE_Y, '#10B981', 'produce · JIT', BUCKETS[JIT_IDX], okCons ? 1 : 0.5, pulse > 0 && okCons);

    // ── guide lines from nodes down to their lane markers ──
    ctx.save(); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.globalAlpha = okCons ? 0.5 : 0.2;
    if (ci >= 0) { ctx.strokeStyle = '#38BDF8'; ctx.beginPath(); ctx.moveTo(RM.cx, RM.y + RM.h); ctx.lineTo(bx(ci), LANE_Y - 10); ctx.stroke(); }
    ctx.strokeStyle = '#10B981'; ctx.beginPath(); ctx.moveTo(FG.cx, FG.y + FG.h); ctx.lineTo(bx(JIT_IDX), LANE_Y - 10); ctx.stroke();
    ctx.restore();

    // ── activity edge RM → FG ──
    const edgeCol = st.ok ? '#A78BFA' : '#64748B';
    ctx.save(); ctx.globalAlpha = st.ok ? 1 : 0.45;
    drawArrow(ctx, RM.x + RM.w, RM.cy, FG.x, FG.cy, edgeCol, st.ok ? 2.4 : 1.6);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.font = 'bold 10px system-ui'; ctx.fillStyle = edgeCol;
    ctx.fillText('activity edge — transforms / transports material', (RM.x + RM.w + FG.x) / 2, RM.cy - 10);
    ctx.font = '9px system-ui'; ctx.fillStyle = st.ok ? '#8A98AE' : '#EF4444';
    ctx.fillText(st.ok ? 'Assembly' : 'inactive — nothing planned', (RM.x + RM.w + FG.x) / 2, RM.cy + 16);

    // ── material nodes ──
    [RM, FG].forEach((n, i) => {
      const col = i === 0 ? '#38BDF8' : '#10B981';
      drawRoundRect(ctx, n.x, n.y, n.w, n.h, 9, '#111827', col + '99');
      ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
      ctx.fillText(n.label, n.cx, n.y + 22);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText(n.sub, n.cx, n.y + 38);
    });

    // ── packets ──
    packets.forEach(p => p.update(dt));
    packets.forEach(p => p.draw(ctx));
    packets = packets.filter(p => !p.done);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  function marker(c, x, y, color, label, sub, alpha, hot) {
    c.save(); c.globalAlpha = alpha;
    const r = hot ? 7 : 5;
    c.beginPath(); c.moveTo(x, y - 12 - r); c.lineTo(x - r, y - 12); c.lineTo(x + r, y - 12); c.closePath();
    c.fillStyle = color; c.fill();
    c.textAlign = 'center'; c.font = 'bold 9px system-ui'; c.fillStyle = color;
    c.fillText(label, x, y - 24);
    c.restore();
  }

  tab.querySelector('#act-run').addEventListener('click', run);
  tab.querySelector('#act-lt-dec').addEventListener('click', () => setLead(leadTime - 1));
  tab.querySelector('#act-lt-inc').addEventListener('click', () => setLead(leadTime + 1));
  tab.querySelector('#act-eff').addEventListener('click', toggleEff);
  tab.querySelector('#act-frozen').addEventListener('click', toggleFrozen);
  tab.querySelector('#act-reset').addEventListener('click', reset);
  updateLedger();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: core parameters table ─────────────────────────────────────────────
function paramsTab() {
  const rows = [
    ['Lead Time', '<code>Activity Lead Time</code>', 'The lead time of the activity — the time an activity takes to complete itself, given as a <strong>number of buckets</strong>. A <strong>mandatory</strong> measure.', '<code>&lt;Activity&gt; &lt;VersionName&gt;</code>'],
    ['Effectivity', '<code>Solver Activity Start Date</code> · <code>Solver Activity End Date</code>', 'Start date after which an activity is active; end date after which it is inactive. The solver will not consider the activity valid before the start date or after the end date.', 'Activity Node, VersionName (Date)'],
    ['Frozen Horizon', '<code>Activity Freeze Time Bucket Offset</code>', 'Numeric. Number of buckets up to which the solver will <strong>not consider producing fresh starts</strong> — no new activity plans are created in those buckets.', '<code>&lt;Activity&gt; &lt;VersionName&gt;</code> (Numeric)'],
    ['Inventory Sweep', '<code>Activity Marker</code> (Measure Name)', 'A list of arbitrary names assigned to mark an activity. Marked activities and their related upstream activities are blocked until no material is found via the exposed activities.', 'Activity Node, VersionName (String / list)'],
    ['Stretched Lead Time', '<code>Is Holiday</code>', '<strong>Boolean.</strong> <code>false</code>/Null = activity is working (not holiday) in the bucket; <code>true</code> = activity is on holiday. A holiday bucket between start and end <strong>cannot be counted toward lead time</strong>.', 'Activity, Time, VersionName (Boolean)'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Activity parameters</div><div class="section-desc">An activity either transforms or transports material between two material nodes. Various supply-chain constraints are modelled through these parameters.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Functionality</th><th>Measure</th><th>What it means</th><th>Granularity</th></tr></thead>
          <tbody>${rows.map(([f, m, d, g]) => `<tr><td style="font-weight:600;color:var(--text)">${f}</td><td>${m}</td><td style="color:var(--text2)">${d}</td><td>${g}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Lead time is in buckets</div><div class="info-card-body">The one mandatory measure. It is the number of buckets the activity takes to complete, so supplies are consumed <strong>offset from the JIT bucket</strong> by the lead time — the basis of build-ahead.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Effectivity = start/end dates</div><div class="info-card-body">By default an activity is effective throughout the horizon. Flows are planned <strong>only when both start and end date are active</strong> — model a new route with a start period, cancel one with an end date.</div></div>
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Frozen horizon = near-term lock</div><div class="info-card-body">Plans in the near term are fixed for execution. Within the freeze offset the solver <strong>triggers no fresh starts</strong> and build-ahead builds no new supplies.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: time-varying lead time, prebuild offsets, reduced lead time ────────
function timevarTab() {
  const tv = [
    ['W01–W03', '1'], ['W04–W06', '2'], ['W07–W11', '3'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Time-varying lead time &amp; the offsets</div><div class="section-desc">Lead time need not be static — and prebuild offsets let supply arrive earlier than the plain JIT math would place it.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Time Varying Activity Lead Time</div><div class="info-card-body">The solver supports lead time that <strong>changes over time buckets</strong> — both increasing and decreasing trends. Configured via <code>Activity Time Varying Lead Time Measure Name</code> (measure group <em>Activity Node Time Parameters</em>; granularity <code>&lt;Activity Node&gt; &lt;VersionName&gt; &lt;Time&gt;</code>).</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Limitation — no leapfrogging</div><div class="info-card-body">Any change in Activity Lead Time (ALT) <strong>has to be a one-bucket change</strong> at a time. Because time-varying LT is modelled internally as multiple activities, <strong>move-in across different lead-time zones is not supported</strong>.</div></div>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">Example — a shipment activity's lead time rising over time</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Bucket range</th><th>Lead Time</th></tr></thead>
          <tbody>${tv.map(([b, l]) => `<tr><td style="font-weight:600;color:var(--text)">${b}</td><td style="color:var(--accent);font-weight:700">${l}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><p>When a demand is planned on a later bucket, the solver uses the lead time in effect for that bucket — e.g. a demand consuming in the W07+ zone uses the raised lead time of <strong>3</strong>, not the earlier value.</p></div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">Mandatory Prebuild Offset (MPBO)</div><div class="section-desc">For bucketized planning, inflows may need to arrive earlier than normal so an outflow is feasible in its bucket.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Activity Mandatory Prebuild Offset</div><div class="info-card-body">The number of time buckets by which the specified downstream activity is delayed — i.e. the inflow must be made available that many buckets in advance of consumption.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Edge offsets &amp; precedence</div><div class="info-card-body">Offsets can sit on the production edge (<code>Prod Graph Mandatory Prebuild Offset</code>) or the consumption edge (<code>Component Mandatory Prebuild Offset</code>). If both a <strong>Consumption Edge Offset</strong> and the Activity Mandatory Prebuild Offset are defined, the <strong>consumption edge offset takes precedence</strong>; if both consumption and production edge offsets are defined, the <strong>net offset is their sum</strong>.</div></div>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">Reduced (Expedited) Lead Time</div><div class="section-desc">High-priority demands may be allowed a shorter-than-standard lead time.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Expedited Activity Lead Time</div><div class="info-card-body">An activity can carry two values — the regular <code>Lead Time</code> and a reduced (most-conservative) <code>Expedited Activity Lead Time</code>. The reduced LT is treated as a <strong>virtual alternate path</strong>: only when a flagged demand or WIP hits an upstream constraint on the primary path does the solver try the reduced-LT path. By default no demand or WIP follows a reduced lead time.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Precedence gotcha</div><div class="info-card-body">On the same activity, <strong>time-varying lead time and expedite lead time will not both work</strong>. If both are defined, <strong>time-varying lead time takes precedence</strong>.</div></div>
      </div>
    </div>`;
}
