// Module 17b — Complex Event Processing (CEP)
// Detecting PATTERNS across a stream, not just filtering single events: the
// Pattern API (begin / next / followedBy / within), quantifiers, conditions and
// after-match skip strategies, plus MATCH_RECOGNIZE in Flink SQL. Centrepiece is
// a canvas pattern-matcher that streams payment/ride events through an NFA and
// fires a fraud alert when "≥2 failed card attempts → ride start" occurs inside
// a time window — exactly the card-testing pattern Uber watches for.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { casesByModule } from '../data/interview-cases.js';

// ── Tab 1: pattern API ───────────────────────────────────────────────────────
const PATTERN = `
  <div class="sm-def card">
    <div class="sm-def-ic">🧩</div>
    <div>
      <div class="sm-def-eyebrow">CEP finds patterns across events, not single events</div>
      <p class="sm-def-lead">A filter asks "is <em>this</em> event bad?" CEP asks "did this <b>sequence</b> happen, in order, within a time window?" — e.g. <b>two failed card attempts followed by a ride start inside 2 minutes</b>. Flink CEP compiles your pattern into an <b>NFA</b> that it runs over the keyed, <b>watermarked</b> stream, tracking every partial match. It is how Uber flags card-testing on R-4471.</p>
    </div>
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">The Pattern API</div>
    <div class="section-desc">Compose a pattern from named stages, contiguity, conditions and a time bound.</div>
  </div>
  <div class="sm-why-grid">
    ${[
      ['🧱', 'begin / next / followedBy', '<code>begin("a")</code> starts it. <b>next</b> = strict contiguity (the very next event must match). <b>followedBy</b> = relaxed (other events may occur between). <b>followedByAny</b> = non-deterministic relaxed (match every option).'],
      ['🔁', 'Quantifiers', '<code>times(n)</code>, <code>oneOrMore()</code>, <code>timesOrMore(n)</code>, <code>optional()</code>, <code>greedy()</code> — "≥2 failed attempts" is <code>failed.timesOrMore(2)</code>.'],
      ['🧪', 'Conditions', '<code>where(...)</code> filters a stage; <b>iterative conditions</b> can reference events already matched (e.g. amount greater than the previous one) and accumulated state.'],
      ['⏱️', 'within(Time)', 'The whole pattern must complete inside this window, measured in <b>event time</b> against the watermark. Partial matches that age out of the window are discarded (optionally to a timed-out side output).'],
    ].map(([i, t, b]) => `<div class="sm-why"><div class="sm-why-ic">${i}</div><div class="sm-why-title">${t}</div><p>${b}</p></div>`).join('')}
  </div>

  <div class="section-header" style="margin:26px 0 12px">
    <div class="section-title">After-match skip strategies</div>
    <div class="section-desc">Once a match fires, where does the NFA resume? This controls overlapping matches.</div>
  </div>
  <div class="sm-keyed card">
    <ul>
      <li><b>NO_SKIP</b> — emit every possible match, including overlaps (most matches, can be noisy).</li>
      <li><b>SKIP_TO_NEXT</b> — discard matches that start at the same event as the emitted one.</li>
      <li><b>SKIP_PAST_LAST_EVENT</b> — resume after the last event of the match (non-overlapping matches — usually what you want for alerts).</li>
      <li><b>SKIP_TO_FIRST/LAST(pattern)</b> — resume relative to a named stage.</li>
    </ul>
  </div>

  <div class="sm-def card" style="margin:22px 0 6px;border-left:3px solid #FF6B35">
    <div class="sm-def-ic">🧭</div>
    <div>
      <div class="sm-def-eyebrow">CEP is stateful + watermark-driven</div>
      <p class="sm-def-lead" style="font-size:0.95rem">The NFA keeps partial matches in <b>keyed state</b> and advances/expires them by the <b>watermark</b>, so everything from <a href="#m09" style="color:#FF6B35;font-weight:600">Watermarks (09)</a>, <a href="#m10" style="color:#FF6B35;font-weight:600">Windows (10)</a> and <a href="#m11" style="color:#FF6B35;font-weight:600">State (11)</a> applies — out-of-order events and idle partitions affect CEP exactly as they affect windows.</p>
    </div>
  </div>
`;

// ── Tab 3: MATCH_RECOGNIZE ───────────────────────────────────────────────────
const SQL = `
  <div class="sm-def card">
    <div class="sm-def-ic">🔤</div>
    <div>
      <div class="sm-def-eyebrow">MATCH_RECOGNIZE — CEP in Flink SQL</div>
      <p class="sm-def-lead">The SQL standard's <code>MATCH_RECOGNIZE</code> expresses the same patterns declaratively: a <b>PARTITION BY</b> (the key), <b>ORDER BY</b> (event time), a regex-like <b>PATTERN</b>, per-variable <b>DEFINE</b> conditions, and a <b>MEASURES</b> projection. Same NFA engine underneath — just no Java/Python NFA code.</p>
    </div>
  </div>
  <div class="code-block fs-11"><span class="lang-tag">Flink SQL — card-testing: 2+ failed attempts then a ride start, within 2 minutes</span><pre>SELECT *
FROM payment_events
MATCH_RECOGNIZE (
  PARTITION BY user_id
  ORDER BY event_time
  MEASURES
    FIRST(F.event_time) AS first_fail,
    LAST(F.event_time)  AS last_fail,
    R.event_time        AS ride_time,
    COUNT(F.*)          AS fail_count
  ONE ROW PER MATCH
  AFTER MATCH SKIP PAST LAST ROW
  PATTERN (F{2,} R) WITHIN INTERVAL '2' MINUTE
  DEFINE
    F AS F.type = 'PAYMENT_FAILED',
    R AS R.type = 'RIDE_STARTED'
) AS m;</pre></div>
  <div class="sm-why-grid" style="margin-top:18px">
    ${[
      ['🧩', 'PATTERN (F{2,} R)', 'Regex-like: two-or-more <code>F</code> rows then one <code>R</code>. Maps to <code>failed.timesOrMore(2).followedBy(ride)</code>.'],
      ['⏱️', 'WITHIN INTERVAL', 'The event-time window the whole match must fit in — the SQL form of <code>.within(...)</code>.'],
      ['↪️', 'AFTER MATCH SKIP', 'Same skip strategies as the Pattern API; <code>SKIP PAST LAST ROW</code> = non-overlapping matches.'],
      ['📐', 'DEFINE / MEASURES', 'DEFINE gives each pattern variable its condition; MEASURES projects values out of the matched rows.'],
    ].map(([i, t, b]) => `<div class="sm-why"><div class="sm-why-ic">${i}</div><div class="sm-why-title">${t}</div><p>${b}</p></div>`).join('')}
  </div>
`;

// ── Tab 4: PyFlink ───────────────────────────────────────────────────────────
const SETUP = `
  <div class="section-header" style="margin:4px 0 12px">
    <div class="section-title">The same pattern, two ways</div>
    <div class="section-desc">PyFlink users typically express CEP through SQL MATCH_RECOGNIZE (above); the Java Pattern API shows the NFA structure explicitly.</div>
  </div>
  <div class="code-block pyflink fs-11"><span class="py-tier">PyFlink · Table API runs the MATCH_RECOGNIZE SQL</span><pre>from pyflink.table import StreamTableEnvironment

t_env = StreamTableEnvironment.create(env)
t_env.create_temporary_view("payment_events", payments_stream, schema)

fraud = t_env.sql_query("""
  SELECT user_id, first_fail, ride_time, fail_count
  FROM payment_events
  MATCH_RECOGNIZE (
    PARTITION BY user_id
    ORDER BY event_time
    MEASURES FIRST(F.event_time) AS first_fail,
             R.event_time AS ride_time,
             COUNT(F.*) AS fail_count
    AFTER MATCH SKIP PAST LAST ROW
    PATTERN (F{2,} R) WITHIN INTERVAL '2' MINUTE
    DEFINE F AS F.type = 'PAYMENT_FAILED',
           R AS R.type = 'RIDE_STARTED'
  )
""")
fraud.execute_insert("fraud_alerts")</pre></div>

  <div class="code-block fs-11"><span class="lang-tag">Java Pattern API — the NFA made explicit (for reference)</span><pre>Pattern&lt;Event, ?&gt; cardTesting = Pattern.&lt;Event&gt;begin("fails")
    .where(e -&gt; e.type.equals("PAYMENT_FAILED"))
    .timesOrMore(2)
    .followedBy("ride")
    .where(e -&gt; e.type.equals("RIDE_STARTED"))
    .within(Time.minutes(2));

PatternStream&lt;Event&gt; ps = CEP.pattern(events.keyBy(e -&gt; e.userId), cardTesting)
    .inProcessingTime(false);                      // event time
OutputTag&lt;Event&gt; timedOut = new OutputTag&lt;&gt;("timed-out"){};
DataStream&lt;Alert&gt; alerts = ps.select(timedOut, timeoutFn, matchFn);</pre></div>
`;

// ── Canvas: live CEP pattern matcher ─────────────────────────────────────────
// Labelled SIMULATION of the NFA. Faithful to the mechanism: partial matches are
// kept per key, advanced by incoming events, and EXPIRED by the time window
// (within). The pattern is "≥2 PAYMENT_FAILED followedBy RIDE_STARTED within W".
function themePalette() {
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  return dark
    ? { bg: '#0b1220', line: 'rgba(148,163,184,0.22)', text: '#e2e8f0', mut: '#94a3b8', track: '#1b2740' }
    : { bg: '#ffffff', line: 'rgba(100,116,139,0.26)', text: '#1e293b', mut: '#64748b', track: '#e2e8f0' };
}
const BLUE = '#3b82f6', GREEN = '#10b981', ORANGE = '#FF6B35', RED = '#ef4444', AMBER = '#f59e0b', PURPLE = '#a855f7';
const EV = {
  fail: { icon: '💳✗', label: 'payment failed', color: RED },
  ok: { icon: '💳✓', label: 'payment ok', color: GREEN },
  ride: { icon: '🚗', label: 'ride started', color: BLUE },
  gps: { icon: '📍', label: 'gps ping', color: PURPLE },
};

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function buildCEP(container) {
  const host = container.querySelector('#tab-matcher');
  host.innerHTML = `
    <div class="sim-note">⚙️ <b>NFA simulation.</b> Faithful to the mechanism: the engine keeps partial matches and <b>expires</b> them by the time
      window. Pattern = <b>≥2 payment-failed → ride-started within <span id="cep-w-lbl">W</span></b>. Inject events or auto-stream, and watch a fraud match fire.</div>
    <div class="sim-grid">
      <div class="sim-controls">
        <div class="sim-ctl-row"><label>Inject event</label></div>
        <div class="sim-actions" id="cep-inject">
          <button class="ctrl-btn" data-ev="fail">💳✗ Failed</button>
          <button class="ctrl-btn" data-ev="ok">💳✓ OK</button>
          <button class="ctrl-btn" data-ev="ride">🚗 Ride start</button>
          <button class="ctrl-btn" data-ev="gps">📍 GPS</button>
        </div>
        <div class="sim-ctl-row" style="margin-top:8px">
          <label for="cep-w">within window <span id="cep-w-val" class="sim-badge">12</span></label>
          <input type="range" id="cep-w" min="6" max="24" value="12" class="sim-range" />
        </div>
        <div class="sim-actions" style="margin-top:8px">
          <button class="ctrl-btn" id="cep-auto">▶ Auto-stream</button>
          <button class="ctrl-btn" id="cep-reset">↺ Reset</button>
        </div>
        <div class="sim-stats" id="cep-stats"></div>
      </div>
      <div class="sim-stage">
        <canvas id="cep-canvas" width="700" height="460" style="width:100%;max-width:720px"></canvas>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Events for one user stream left-to-right along the timeline. The pattern — <b>two or more failed card attempts, then a ride start, all within the window</b> — is drawn as a little state machine at the top. As failed-payment events land inside the window, the NFA advances (0 → 1 → ≥2 fails); when a <b>ride start</b> arrives while ≥2 failures are still in the window, the full pattern matches and a <b>fraud alert</b> fires. Payment-OK and GPS events don't advance the fraud pattern (that's <code>followedBy</code>'s relaxed contiguity — unrelated events are simply skipped).</p>
      <p>The yellow bracket is the <b>within</b> window. Failed attempts that age past it are <b>expired</b> from the partial match — drop the window with the slider and you'll see matches stop firing because the two failures can no longer coexist with a ride start in time. That expiry is driven by event time / the watermark, exactly like windows.</p>
      <p><b>Interview angle:</b> CEP compiles the pattern to an NFA kept in keyed state and advanced by the watermark; <code>within</code> bounds and expires partial matches; <b>after-match skip strategy</b> decides overlaps (use SKIP PAST LAST for non-overlapping alerts). Prefer <code>MATCH_RECOGNIZE</code> in SQL for readability.</p>
    </div>`;

  const canvas = host.querySelector('#cep-canvas');
  const ctx = canvas.getContext('2d');
  const statsEl = host.querySelector('#cep-stats');
  const wLbl = host.querySelector('#cep-w-lbl'), wVal = host.querySelector('#cep-w-val');
  let W = 12, auto = false, matches = 0, lastMatchFlash = 0;
  let S, raf = null, acc = 0, lastT = performance.now(), rng = mulberry32(7);
  const TICK_MS = 120;

  function reset() { S = { t: 0, events: [], failTs: [] }; matches = 0; lastMatchFlash = 0; rng = mulberry32(7); }
  reset();

  function inject(type) {
    S.events.push({ type, t: S.t, age: 0 });
    if (S.events.length > 24) S.events.shift();
    if (type === 'fail') S.failTs.push(S.t);
    // expire failures outside window
    S.failTs = S.failTs.filter(ts => ts > S.t - W);
    if (type === 'ride') {
      const inWin = S.failTs.filter(ts => ts > S.t - W);
      if (inWin.length >= 2) { matches += 1; lastMatchFlash = 1; S.failTs = []; S.events[S.events.length - 1].match = true; }
    }
    if (type === 'ok') { /* a success doesn't clear the card-testing trail in this model */ }
  }

  function step() {
    S.t += 1;
    S.failTs = S.failTs.filter(ts => ts > S.t - W);   // continuous expiry
    if (auto) {
      const r = rng();
      // weighted stream: mostly gps/ok, some fails, occasional ride
      if (r < 0.14) inject('fail'); else if (r < 0.22) inject('ride'); else if (r < 0.5) inject('ok'); else inject('gps');
    }
    if (lastMatchFlash > 0) lastMatchFlash = Math.max(0, lastMatchFlash - 0.04);
  }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function renderStats() {
    const inWin = S.failTs.filter(ts => ts > S.t - W).length;
    const stage = inWin >= 2 ? 'armed → await ride' : inWin === 1 ? '1 failure seen' : 'idle';
    statsEl.innerHTML =
      `<div class="sim-stat ${inWin >= 2 ? 'sim-stat-hot' : ''}"><span>Failures in window</span><b>${inWin}</b></div>` +
      `<div class="sim-stat"><span>NFA state</span><b>${stage}</b></div>` +
      `<div class="sim-stat"><span>Window (within)</span><b>${W} ticks</b></div>` +
      `<div class="sim-stat ${matches ? 'sim-stat-hot' : 'sim-stat-ok'}"><span>Fraud matches</span><b>${matches}</b></div>`;
  }

  function draw() {
    const pal = themePalette();
    const Wd = canvas.width, H = canvas.height;
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, Wd, H);
    const inWin = S.failTs.filter(ts => ts > S.t - W).length;

    // pattern state machine (top)
    ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Pattern NFA:  (payment-failed){2,}  →  ride-started   within window', 20, 24);
    const nodes = [
      { lbl: 'start', on: true },
      { lbl: '1 fail', on: inWin >= 1 },
      { lbl: '≥2 fails', on: inWin >= 2 },
      { lbl: 'MATCH', on: lastMatchFlash > 0.1, match: true },
    ];
    const nx0 = 40, ny = 56, gap = 150, rNode = 26;
    nodes.forEach((n, i) => {
      const cx = nx0 + i * gap, cy = ny + rNode;
      if (i < nodes.length - 1) { ctx.strokeStyle = pal.mut; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + rNode, cy); ctx.lineTo(cx + gap - rNode, cy); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, rNode, 0, 7);
      ctx.fillStyle = n.match ? (n.on ? RED : pal.track) : (n.on ? GREEN : pal.track);
      ctx.fill();
      ctx.strokeStyle = n.match ? RED : (n.on ? GREEN : pal.line); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = n.on || n.match ? '#fff' : pal.mut; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(n.lbl, cx, cy + 3);
    });

    // event timeline (middle) — newest on the right; window bracket covers in-window events
    ctx.textAlign = 'left'; ctx.fillStyle = pal.text; ctx.font = 'bold 12px system-ui';
    ctx.fillText('Event stream (one user) — newest on the right →', 20, 170);
    const tlY = 230, tlX = 20, tlW = Wd - 40;
    const span = 22, stepX = (tlW - 28) / span;
    const vis = S.events.slice(-span);
    const n = vis.length;
    const xOf = idx => tlX + tlW - 14 - (n - 1 - idx) * stepX;   // newest at the right edge
    const inWinCount = vis.filter(e => e.t > S.t - W).length;
    const brRight = tlX + tlW;
    const brX = inWinCount > 0 ? xOf(n - inWinCount) - stepX / 2 : brRight - 4;
    ctx.fillStyle = 'rgba(245,158,11,0.10)'; ctx.fillRect(brX, tlY - 70, brRight - brX, 140);
    ctx.strokeStyle = AMBER; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeRect(brX, tlY - 70, brRight - brX, 140); ctx.setLineDash([]);
    ctx.fillStyle = AMBER; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('within window', (brX + brRight) / 2, tlY - 76);
    ctx.strokeStyle = pal.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tlX, tlY); ctx.lineTo(tlX + tlW, tlY); ctx.stroke();

    vis.forEach((e, idx) => {
      const x = xOf(idx), inWindow = e.t > S.t - W;
      const spec = EV[e.type];
      const y = e.type === 'fail' ? tlY - 34 : e.type === 'ride' ? tlY + 34 : tlY;
      // connector tick
      ctx.strokeStyle = pal.line; ctx.beginPath(); ctx.moveTo(x, tlY); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = inWindow ? 1 : 0.35;
      ctx.fillStyle = e.match ? RED : spec.color;
      ctx.beginPath(); ctx.arc(x, y, e.match ? 12 : 9, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(spec.icon, x, y + 3);
      if (e.match) { ctx.fillStyle = RED; ctx.font = 'bold 9px system-ui'; ctx.fillText('⚠', x, y - 16); }
    });

    // legend
    let lx = 20; const ly = H - 40;
    Object.values(EV).forEach(spec => {
      ctx.fillStyle = spec.color; ctx.beginPath(); ctx.arc(lx + 6, ly, 6, 0, 7); ctx.fill();
      ctx.fillStyle = pal.mut; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(spec.label, lx + 16, ly + 3); lx += 16 + ctx.measureText(spec.label).width + 20;
    });

    // match banner
    if (lastMatchFlash > 0.05) {
      ctx.fillStyle = `rgba(239,68,68,${0.5 * lastMatchFlash})`;
      ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚠ FRAUD PATTERN MATCHED — card testing', Wd / 2, H - 70);
    }

    renderStats();
  }

  function loop(now) {
    const dt = now - lastT; lastT = now;
    if (auto) { acc += dt; while (acc >= TICK_MS) { step(); acc -= TICK_MS; } }
    else { S.t += 0; }   // manual: time only advances via injects? keep t stable but expire relative — advance slowly
    // advance a slow clock even when manual so the window visibly slides
    if (!auto) { acc += dt; while (acc >= TICK_MS * 3) { S.t += 1; S.failTs = S.failTs.filter(ts => ts > S.t - W); if (lastMatchFlash > 0) lastMatchFlash = Math.max(0, lastMatchFlash - 0.04); acc -= TICK_MS * 3; } }
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  host.querySelector('#cep-inject').addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) inject(b.dataset.ev); });
  host.querySelector('#cep-w').addEventListener('input', e => { W = +e.target.value; wVal.textContent = W; wLbl.textContent = W + ' ticks'; });
  const autoBtn = host.querySelector('#cep-auto');
  autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.textContent = auto ? '⏸ Stop stream' : '▶ Auto-stream'; autoBtn.classList.toggle('active', auto); });
  host.querySelector('#cep-reset').addEventListener('click', reset);
  wLbl.textContent = W + ' ticks';

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export function mount(container) {
  container.innerHTML = rideSpine({ active: ['PAYMENT_COMPLETED'] }) + createModuleShell({
    tag: '17b · APIs & Connectors · Uber Edition',
    title: 'Complex Event Processing (CEP)',
    subtitle: 'Detecting patterns across a stream — the Pattern API (begin/next/followedBy/within, quantifiers, conditions, skip strategies) and MATCH_RECOGNIZE in Flink SQL — to catch sequences like card-testing fraud on ride R-4471.',
    tabs: [
      { id: 'pattern', label: '🧩 Pattern API', content: PATTERN },
      { id: 'matcher', label: '🎯 Live Pattern Matcher', content: '' },
      { id: 'sql', label: '🔤 MATCH_RECOGNIZE (SQL)', content: SQL },
      { id: 'setup', label: '💻 PyFlink & SQL', content: SETUP },
      { id: 'iq', label: '🎤 Interview Q&A', content: createIQSection(IQ_BANK.m17b || []) },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  const cases = casesByModule('m17b');
  if (cases && cases.length) {
    container.querySelector('#tab-pattern').insertAdjacentHTML('beforeend',
      `<div class="section-header" style="margin:22px 0 12px"><div class="section-title">Corner cases — R-4471</div><div class="section-desc">The CEP questions a senior interview actually asks.</div></div>${scenarioList(cases)}`);
  }
  const cleanup = buildCEP(container);
  initIQ(container);
  return cleanup;
}
