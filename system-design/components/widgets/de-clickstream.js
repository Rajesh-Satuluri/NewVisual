// ── Clickstream platform (live canvas sim) ──────────────────────────────────
// Events flow through a collector into a durable log, then fan to two paths: a
// speed path (streaming → live dashboard, seconds) and a batch path (lake →
// warehouse, flushed in bulk). Watch the real-time lane update instantly while
// the batch lane accumulates and processes periodically.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const inflow = [], speed = [], batch = [], flush = [];
  let spawnAcc = 0, flushAcc = 0, realtime = 0, warehouse = 0, buffer = 0, flashT = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="cs-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="cs-ev">🖱️ Send events</button>
        <button class="sd-btn" id="cs-spike">📈 Traffic spike</button>
      </div>`,
    caption: 'One durable log feeds two paths. The speed path streams to a live dashboard in seconds (approximate); the batch path lands events in the lake and loads the warehouse in bulk (complete, cheap). Both read the same immutable log, so they never diverge at the source.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#cs-note');

  const CLX = 40, COLX = 140, KX = 260, DASHX = 600, LAKEX = 440, WHX = 600, MIDY = 150, UPY = 74, DNY = 226;

  function emit(n = 1) { for (let i = 0; i < n; i++) inflow.push({ x: CLX, p: 0 }); }
  $('#cs-ev').addEventListener('click', () => emit(5));
  $('#cs-spike').addEventListener('click', () => emit(16));

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.45) { spawnAcc -= 0.45; emit(1); }
    const sp = 170;
    for (let i = inflow.length - 1; i >= 0; i--) { const e = inflow[i]; e.x += sp * dt; if (e.x >= KX) { realtime++; buffer++; speed.push({ p: 0 }); batch.push({ p: 0 }); inflow.splice(i, 1); } }
    for (let i = speed.length - 1; i >= 0; i--) { speed[i].p += dt * 1.6; if (speed[i].p >= 1) speed.splice(i, 1); }
    for (let i = batch.length - 1; i >= 0; i--) { batch[i].p += dt * 1.1; if (batch[i].p >= 1) batch.splice(i, 1); }
    flushAcc += dt; if (flashT > 0) flashT -= dt;
    if (flushAcc >= 3.2) { flushAcc = 0; if (buffer > 0) { warehouse += buffer; for (let k = 0; k < Math.min(buffer, 8); k++) flush.push({ p: 0 }); buffer = 0; flashT = 0.4; } }
    for (let i = flush.length - 1; i >= 0; i--) { flush[i].p += dt * 1.3; if (flush[i].p >= 1) flush.splice(i, 1); }
  }

  function box(x, y, w, h, col, title, sub) {
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 8); ctx.fillStyle = withAlpha(col, 0.12); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, title, x, y - (sub ? 6 : 0), { color: pal.text, size: 10, weight: 700 });
    if (sub) label(ctx, sub, x, y + 10, { color: pal.text3, size: 8, weight: 600 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // clients + collector + kafka
    box(CLX + 6, MIDY, 44, 44, pal.text3, '📱', 'clients');
    box(COLX, MIDY, 70, 48, pal.amber, '📥 collector', 'validate');
    box(KX, MIDY, 60, 70, pal.accent, '📬 Kafka', 'log');
    // links
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CLX + 28, MIDY); ctx.lineTo(COLX - 35, MIDY); ctx.moveTo(COLX + 35, MIDY); ctx.lineTo(KX - 30, MIDY); ctx.stroke(); ctx.setLineDash([]);

    // speed path
    box(DASHX, UPY, 90, 48, pal.green, '📊 live dash', 'seconds');
    label(ctx, '⚡ speed path', (KX + DASHX) / 2, UPY - 30, { color: pal.green, size: 9, weight: 700 });
    // batch path
    box(LAKEX, DNY, 64, 48, pal.blue, '🏞️ lake', `buf ${buffer}`);
    box(WHX, DNY, 90, 48, pal.amber, '🏢 warehouse', 'bulk load');
    label(ctx, '🗓️ batch path', (KX + LAKEX) / 2, DNY + 34, { color: pal.amber, size: 9, weight: 700 });

    // kafka fork links
    ctx.strokeStyle = withAlpha(pal.border, 0.7); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(KX + 30, MIDY - 10); ctx.lineTo(DASHX - 45, UPY); ctx.moveTo(KX + 30, MIDY + 10); ctx.lineTo(LAKEX - 32, DNY); ctx.moveTo(LAKEX + 32, DNY); ctx.lineTo(WHX - 45, DNY); ctx.stroke(); ctx.setLineDash([]);
    if (flashT > 0) { ctx.strokeStyle = pal.amber; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(LAKEX + 32, DNY); ctx.lineTo(WHX - 45, DNY); ctx.stroke(); }

    // particles
    for (const e of inflow) { ctx.fillStyle = pal.text2; ctx.beginPath(); ctx.arc(Math.min(e.x, KX), MIDY, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const s of speed) { const x = (KX + 30) + (DASHX - 45 - KX - 30) * s.p, y = (MIDY - 10) + (UPY - MIDY + 10) * s.p; ctx.fillStyle = pal.green; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const bt of batch) { const x = (KX + 30) + (LAKEX - 32 - KX - 30) * bt.p, y = (MIDY + 10) + (DNY - MIDY - 10) * bt.p; ctx.fillStyle = pal.blue; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const f of flush) { const x = (LAKEX + 32) + (WHX - 45 - LAKEX - 32) * f.p; ctx.fillStyle = pal.amber; roundRect(ctx, x - 6, DNY - 5, 12, 10, 2); ctx.fill(); }

    note.innerHTML = `⚡ realtime processed <b style="color:var(--green)">${realtime}</b> (live) · 🗓️ warehouse <b style="color:var(--amber)">${warehouse}</b> (bulk) · pending in lake <b style="color:var(--blue)">${buffer}</b>`;
  }

  emit(4);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
