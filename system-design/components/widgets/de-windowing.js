// ── Windowing (live canvas sim) ─────────────────────────────────────────────
// A scrolling event-time timeline. Events stream in and are grouped into
// windows you can aggregate. Toggle tumbling (fixed, non-overlapping), sliding
// (fixed size, overlapping), and session (activity-gap) windows and watch each
// window close and emit a count.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const VSPAN = 12, WIN = 3, SLIDE = 1, GAP = 1.3;

export function mount(container) {
  let mode = 'tumbling';
  let T = 8, nextSpawn = 0, emitted = 0, lastClosedKey = -1;
  const events = [];      // {ts}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="wd-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="wd-tum">▦ Tumbling</button>
        <button class="sd-btn" id="wd-sli">▤ Sliding</button>
        <button class="sd-btn" id="wd-ses">◍ Session</button>
      </div>`,
    caption: 'Every streaming aggregate is per-window. Tumbling windows are fixed and non-overlapping (periodic totals); sliding windows overlap for moving averages; session windows grow with activity and close after a gap. Windows bucket by event time, and close to emit a result.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#wd-note');

  function setMode(m) { mode = m; emitted = 0; lastClosedKey = -1; }
  $('#wd-tum').addEventListener('click', () => setMode('tumbling'));
  $('#wd-sli').addEventListener('click', () => setMode('sliding'));
  $('#wd-ses').addEventListener('click', () => setMode('session'));

  let burstLeft = 5;
  function scheduleNext() {
    if (burstLeft > 0) { burstLeft--; nextSpawn = T + 0.2 + Math.random() * 0.35; }
    else { burstLeft = 3 + Math.floor(Math.random() * 4); nextSpawn = T + GAP + 0.4 + Math.random() * 1.2; }  // inactivity gap → new session
  }

  const LEFT = 60, RIGHT = 624, Y = 165;
  const xFor = ts => LEFT + ((ts - (T - VSPAN)) / VSPAN) * (RIGHT - LEFT);

  function step(dt) {
    T += dt * 0.8;
    if (T >= nextSpawn) { events.push({ ts: T }); scheduleNext(); }
    while (events.length && events[0].ts < T - VSPAN - 1) events.shift();
    // count tumbling closes for the tally
    if (mode === 'tumbling') {
      const justClosed = Math.floor((T) / WIN) - 1;
      if (justClosed > lastClosedKey && justClosed >= 0) { lastClosedKey = justClosed; emitted++; }
    }
  }

  function bandsTumbling() {
    const bands = [];
    const startK = Math.floor((T - VSPAN) / WIN);
    const endK = Math.floor(T / WIN);
    for (let k = startK; k <= endK; k++) {
      const a = k * WIN, b = a + WIN;
      const count = events.filter(e => e.ts >= a && e.ts < b).length;
      bands.push({ a, b, count, closed: T >= b, k });
    }
    return bands;
  }
  function bandsSliding() {
    // show the current window plus a couple of overlapping prior ones
    const bands = [];
    for (let i = 0; i < 4; i++) {
      const b = T - i * SLIDE, a = b - WIN;
      const count = events.filter(e => e.ts >= a && e.ts <= b).length;
      bands.push({ a, b, count, closed: i > 0, current: i === 0 });
    }
    return bands;
  }
  function bandsSession() {
    const sorted = events.slice().sort((e, f) => e.ts - f.ts);
    const bands = []; let cur = null;
    for (const e of sorted) {
      if (!cur || e.ts - cur.b > GAP) { cur = { a: e.ts, b: e.ts, count: 1 }; bands.push(cur); }
      else { cur.b = e.ts; cur.count++; }
    }
    bands.forEach(bd => bd.closed = T - bd.b > GAP);
    return bands;
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, `${mode} windows · bucketed by event time`, 330, 36, { color: pal.text2, size: 12, weight: 800 });

    const bands = mode === 'tumbling' ? bandsTumbling() : mode === 'sliding' ? bandsSliding() : bandsSession();
    for (const bd of bands) {
      let x0 = Math.max(LEFT, xFor(bd.a)), x1 = Math.min(RIGHT, xFor(bd.b));
      if (x1 <= LEFT || x0 >= RIGHT) continue;
      const h = mode === 'sliding' ? 90 - (bd.current ? 0 : 0) : 90;
      const col = bd.closed ? pal.green : bd.current || !bd.closed ? pal.accent : pal.amber;
      roundRect(ctx, x0, Y - 55, Math.max(2, x1 - x0), 110, 5);
      ctx.fillStyle = withAlpha(col, mode === 'sliding' ? 0.08 : 0.12); ctx.fill();
      ctx.strokeStyle = withAlpha(col, bd.current ? 0.9 : 0.5); ctx.lineWidth = bd.current ? 2 : 1; ctx.stroke();
      if (x1 - x0 > 26) label(ctx, `Σ${bd.count}`, (x0 + x1) / 2, Y - 42, { color: col, size: 11, weight: 800 });
      if (bd.closed && mode !== 'sliding' && x1 - x0 > 30) label(ctx, '✓ emitted', (x0 + x1) / 2, Y + 44, { color: pal.green, size: 8, weight: 700 });
    }

    // timeline axis
    ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(LEFT, Y); ctx.lineTo(RIGHT, Y); ctx.stroke();
    // events
    for (const e of events) {
      const x = xFor(e.ts); if (x < LEFT - 4 || x > RIGHT + 4) continue;
      ctx.fillStyle = pal.blue; ctx.beginPath(); ctx.arc(x, Y, 5, 0, Math.PI * 2); ctx.fill();
    }
    // now marker
    label(ctx, '▲ now', RIGHT, Y + 22, { color: pal.text3, size: 9, weight: 700, align: 'right' });

    note.innerHTML = `mode <b style="color:var(--accent)">${mode}</b> · events shown <b style="color:var(--blue)">${events.length}</b>${mode === 'tumbling' ? ` · windows emitted <b style="color:var(--green)">${emitted}</b>` : ''}`;
  }

  for (let i = 0; i < 6; i++) events.push({ ts: T - VSPAN + 2 + i * 1.3 });
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
