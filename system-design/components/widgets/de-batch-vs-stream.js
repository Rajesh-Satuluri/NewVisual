// ── Batch vs streaming (live canvas sim) ────────────────────────────────────
// The same event stream down two lanes. The batch lane lets events pile in a
// buffer and flushes them on a schedule, so each record waits up to the batch
// interval. The streaming lane processes each event the instant it arrives, so
// latency stays low. Watch the latency numbers diverge.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const batch = [];     // {x, arrived, state}
  const stream = [];    // {x, arrived}
  let T = 0, spawnAcc = 0, flushAcc = 0, flashT = 0;
  let doneBatch = 0, doneStream = 0, lastBL = 0, lastSL = 0;
  const INTERVAL = 3.2, SPEED = 175;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="bs-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="bs-ev">＋ Emit event</button>
        <button class="sd-btn" id="bs-flush">⚡ Flush batch now</button>
      </div>`,
    caption: 'Both lanes see the same events. Batch amortizes work across a scheduled run — cheap and simple, but every record waits up to one interval. Streaming processes each event on arrival — fresh within seconds, at the cost of an always-on system. Freshness requirement decides which you build.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#bs-note');

  const SRCX = 56, BUFX = 330, OUTX = 600, BY = 95, SY = 215;

  function emit() { batch.push({ x: SRCX, arrived: T, state: 'move' }); stream.push({ x: SRCX, arrived: T }); }
  function flush() { let n = 0; for (const e of batch) if (e.state === 'buf') { e.state = 'flush'; n++; } if (n) flashT = 0.4; flushAcc = 0; }
  $('#bs-ev').addEventListener('click', emit);
  $('#bs-flush').addEventListener('click', flush);

  function step(dt) {
    T += dt;
    spawnAcc += dt; while (spawnAcc >= 0.8) { spawnAcc -= 0.8; emit(); }
    flushAcc += dt; if (flashT > 0) flashT -= dt;
    if (flushAcc >= INTERVAL) flush();

    for (let i = batch.length - 1; i >= 0; i--) {
      const e = batch[i];
      if (e.state === 'move') { e.x += SPEED * dt; if (e.x >= BUFX) { e.x = BUFX; e.state = 'buf'; } }
      else if (e.state === 'flush') { e.x += SPEED * dt; if (e.x >= OUTX) { doneBatch++; lastBL = T - e.arrived; batch.splice(i, 1); } }
    }
    for (let i = stream.length - 1; i >= 0; i--) {
      const e = stream[i];
      e.x += SPEED * dt;
      if (e.x >= OUTX) { doneStream++; lastSL = T - e.arrived; stream.splice(i, 1); }
    }
  }

  function lane(y, title, col) {
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(SRCX + 20, y); ctx.lineTo(OUTX - 16, y); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, title, SRCX + 20, y - 34, { color: col, size: 12, weight: 800, align: 'left' });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // source + output posts
    for (const y of [BY, SY]) {
      roundRect(ctx, SRCX - 22, y - 16, 36, 32, 6); ctx.fillStyle = withAlpha(pal.text3, 0.18); ctx.fill();
      label(ctx, '📨', SRCX - 4, y, { color: pal.text, size: 13 });
    }
    lane(BY, '🗓️ Batch — flush every ' + INTERVAL + 's', pal.amber);
    lane(SY, '🌊 Streaming — per event', pal.green);

    // batch buffer box
    const buffered = batch.filter(e => e.state === 'buf').length;
    roundRect(ctx, BUFX - 26, BY - 24, 52, 48, 7);
    ctx.fillStyle = withAlpha(pal.amber, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.amber, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'buffer', BUFX, BY - 34, { color: pal.text3, size: 9, weight: 700 });
    label(ctx, `${buffered}`, BUFX, BY, { color: pal.text, size: 15, weight: 800 });

    // outputs
    const flash = flashT > 0;
    roundRect(ctx, OUTX - 14, BY - 20, 44, 40, 7);
    ctx.fillStyle = withAlpha(pal.amber, flash ? 0.4 : 0.1); ctx.fill();
    ctx.strokeStyle = pal.amber; ctx.lineWidth = flash ? 2.4 : 1.4; ctx.stroke();
    label(ctx, '⚙️', OUTX + 8, BY, { color: pal.text, size: 13 });
    roundRect(ctx, OUTX - 14, SY - 20, 44, 40, 7);
    ctx.fillStyle = withAlpha(pal.green, 0.12); ctx.fill();
    ctx.strokeStyle = pal.green; ctx.lineWidth = 1.4; ctx.stroke();
    label(ctx, '⚙️', OUTX + 8, SY, { color: pal.text, size: 13 });

    // events
    for (const e of batch) { ctx.fillStyle = e.state === 'flush' ? pal.amber : withAlpha(pal.amber, 0.8); ctx.beginPath(); ctx.arc(e.x, BY, 6, 0, Math.PI * 2); ctx.fill(); }
    for (const e of stream) { ctx.fillStyle = pal.green; ctx.beginPath(); ctx.arc(e.x, SY, 6, 0, Math.PI * 2); ctx.fill(); }

    const countdown = Math.max(0, INTERVAL - flushAcc).toFixed(1);
    note.innerHTML = `next flush in <b style="color:var(--amber)">${countdown}s</b> · batch latency <b style="color:var(--amber)">${lastBL.toFixed(1)}s</b> (${doneBatch}) · streaming latency <b style="color:var(--green)">${lastSL.toFixed(1)}s</b> (${doneStream})`;
  }

  emit(); emit();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
