// ── Last-room booking race (live canvas sim) ────────────────────────────────
// The classic reservation bug: two guests book the last room at the same time.
// If each request reads "1 available" and then writes independently, both
// succeed and you've overbooked. An atomic conditional update (decrement only
// if > 0, or a row lock) serializes them so exactly one wins. Toggle the guard
// and watch the difference.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let atomic = true;
  let rooms = 1;
  let reqs = [];             // {x, lane, state, read, t}
  let confirmed = 0, soldout = 0, oversold = false;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="br-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="br-book">👥 Two guests book the last room</button>
        <button class="sd-btn" id="br-reset">↺ Reset (1 room)</button>
        <label class="wg-switch"><input type="checkbox" id="br-atomic" checked> atomic conditional update</label>
      </div>`,
    caption: 'Without a guard, two requests both read "1 available" before either writes — a lost-update race that overbooks. An atomic "decrement if > 0" (or SELECT … FOR UPDATE) forces them to take turns, so the inventory can never go negative.',
  });

  const ctx = fitCanvas(canvas, 640, 280);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#br-note');

  function reset() { rooms = 1; reqs = []; confirmed = 0; soldout = 0; oversold = false; }
  $('#br-reset').addEventListener('click', reset);
  $('#br-atomic').addEventListener('change', e => { atomic = e.target.checked; reset(); });
  $('#br-book').addEventListener('click', () => {
    reset();
    reqs = [
      { lane: 0, x: 0, t: 0, state: 'travel', read: null, guest: 'A' },
      { lane: 1, x: 0, t: 0.12, state: 'travel', read: null, guest: 'B' },
    ];
  });

  function resolve(r) {
    if (atomic) {
      // serialized: check-and-decrement atomically
      if (rooms > 0) { rooms--; r.state = 'confirmed'; confirmed++; }
      else { r.state = 'soldout'; soldout++; }
    } else {
      // both read the same stale value before either writes
      if (r.read == null) r.read = rooms;          // read phase
      if (r.read > 0) { r.state = 'confirmed'; confirmed++; }
      else { r.state = 'soldout'; soldout++; }
    }
  }

  function step(dt) {
    // non-atomic: both read current rooms at arrival, THEN both write → oversell
    for (const r of reqs) {
      if (r.state === 'travel') {
        r.t += dt;
        if (r.t > 0.6 && r.read == null && !atomic) r.read = rooms;   // concurrent read of "1"
        if (r.t > 1.0) resolve(r);
      }
    }
    if (!atomic && reqs.length === 2 && reqs.every(r => r.state === 'confirmed')) { rooms = 1 - confirmed; oversold = confirmed > 1; }
    else if (!atomic) { oversold = confirmed > 1; rooms = Math.min(rooms, 1 - confirmed); }
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 280);
    // inventory box
    const invCol = oversold ? pal.red : rooms > 0 ? pal.green : pal.amber;
    roundRect(ctx, 440, 90, 160, 100, 14); ctx.fillStyle = withAlpha(invCol, 0.12); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = invCol; ctx.stroke();
    label(ctx, '🏨 inventory', 520, 110, { color: pal.text2, size: 12, weight: 700 });
    label(ctx, `${rooms}`, 520, 145, { color: invCol, size: 40, weight: 800 });
    label(ctx, rooms === 1 ? 'room left' : oversold ? 'OVERBOOKED!' : 'rooms left', 520, 175, { color: invCol, size: 11, weight: 700 });
    // guests + requests
    reqs.forEach((r) => {
      const y = 70 + r.lane * 80;
      label(ctx, `🧑 Guest ${r.guest}`, 30, y, { color: pal.text, size: 12, weight: 700, align: 'left' });
      const prog = Math.min(1, r.t);
      const x = 120 + prog * 300;
      const col = r.state === 'confirmed' ? pal.green : r.state === 'soldout' ? pal.text3 : pal.accent2;
      ctx.fillStyle = col; roundRect(ctx, x - 12, y - 10, 24, 20, 5); ctx.fill();
      if (r.read != null && r.state === 'travel') label(ctx, `read: ${r.read} free`, x, y + 26, { color: pal.amber, size: 10, weight: 600 });
      if (r.state === 'confirmed') label(ctx, '✅ confirmed', 440, y, { color: pal.green, size: 12, weight: 700, align: 'left' });
      if (r.state === 'soldout') label(ctx, '⛔ sold out', 440, y, { color: pal.text3, size: 12, weight: 700, align: 'left' });
    });
    if (oversold) label(ctx, '💥 race condition: both read "1 available", both wrote → double-booked', 320, 250, { color: pal.red, size: 12, weight: 700 });
    else if (confirmed + soldout === 2) label(ctx, '✓ atomic update serialized the two requests — exactly one room sold', 320, 250, { color: pal.green, size: 12, weight: 700 });
    note.innerHTML = `guard <b style="color:var(--${atomic ? 'green' : 'red'})">${atomic ? 'ATOMIC (safe)' : 'none (racy)'}</b> · rooms left <b>${rooms}</b> · confirmed <b style="color:var(--green)">${confirmed}</b> · sold-out <b>${soldout}</b>${oversold ? ' · <b style="color:var(--red)">OVERBOOKED</b>' : ''}`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
