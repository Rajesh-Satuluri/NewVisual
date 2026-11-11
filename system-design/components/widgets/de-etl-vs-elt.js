// ── ETL vs ELT (live canvas sim) ────────────────────────────────────────────
// The same source down two pipelines. ETL transforms on a separate engine
// before loading, so only modeled data lands and no raw copy is kept. ELT loads
// raw into the warehouse first (a retained Bronze copy), then transforms in
// place with SQL. Watch where the transform box sits.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const etl = [];    // packets on the ETL lane
  const elt = [];
  let spawnAcc = 0, etlLoaded = 0, eltRaw = 0, eltModeled = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ee-note"></div>
      <div class="wg-btnrow"><button class="sd-btn sd-btn-primary" id="ee-emit">⬇️ Extract batch</button></div>`,
    caption: 'ETL transforms on a separate engine before loading, so only modeled data lands — and the raw detail is gone. ELT loads raw into the warehouse first (kept as Bronze), then transforms in place with SQL, so you can always re-derive. Cheap storage + elastic compute made ELT the default.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ee-note');

  const SX = 46, TBX = 300, WX = 560, ETLY = 90, ELTY = 210;

  function emit(n = 1) {
    for (let i = 0; i < n; i++) { etl.push({ x: SX, transformed: false }); elt.push({ x: SX, transformed: false }); }
  }
  $('#ee-emit').addEventListener('click', () => emit(5));

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.7) { spawnAcc -= 0.7; emit(1); }
    const sp = 150;
    for (let i = etl.length - 1; i >= 0; i--) {
      const p = etl[i]; p.x += sp * dt;
      if (p.x >= TBX && !p.transformed) p.transformed = true;       // transform before load
      if (p.x >= WX) { etlLoaded++; etl.splice(i, 1); }
    }
    for (let i = elt.length - 1; i >= 0; i--) {
      const p = elt[i]; p.x += sp * dt;
      if (p.x >= WX && !p.landed) { p.landed = true; eltRaw++; p.x = WX; p.tIn = 0; }
      if (p.landed) { p.tIn += dt; if (p.tIn >= 0.7) { eltModeled++; elt.splice(i, 1); } }   // transform inside warehouse
    }
  }

  function lane(y, title, col) {
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(SX + 18, y); ctx.lineTo(WX - 30, y); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, title, SX + 18, y - 40, { color: col, size: 12, weight: 800, align: 'left' });
  }

  function box(x, y, w, h, col, title, sub) {
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = withAlpha(col, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.85); ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, title, x, y - 4, { color: pal.text, size: 10, weight: 700 });
    if (sub) label(ctx, sub, x, y + 10, { color: pal.text3, size: 8, weight: 600 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // sources
    for (const y of [ETLY, ELTY]) box(SX, y, 44, 40, pal.text3, '📤', 'source');
    lane(ETLY, '🔧 ETL — transform, then load', pal.amber);
    lane(ELTY, '📥 ELT — load raw, then transform', pal.green);

    // ETL: transform box mid-lane, warehouse at end (no raw kept)
    box(TBX, ETLY, 70, 46, pal.amber, '⚙️ transform', 'separate engine');
    box(WX, ETLY, 76, 50, pal.blue, '🏢 warehouse', 'modeled only');

    // ELT: warehouse at end with transform INSIDE
    box(WX, ELTY, 90, 60, pal.blue, '🏢 warehouse', 'raw + SQL T');
    label(ctx, '⚙️ transform in-place', WX, ELTY + 42, { color: pal.green, size: 9, weight: 700 });

    for (const p of etl) { ctx.fillStyle = p.transformed ? pal.green : pal.amber; ctx.beginPath(); ctx.arc(Math.min(p.x, WX), ETLY, 6, 0, Math.PI * 2); ctx.fill(); }
    for (const p of elt) { ctx.fillStyle = p.landed ? pal.green : pal.text2; ctx.beginPath(); ctx.arc(Math.min(p.x, WX), ELTY + (p.landed ? (Math.sin(p.tIn * 8) * 3) : 0), 6, 0, Math.PI * 2); ctx.fill(); }

    note.innerHTML = `ETL loaded <b style="color:var(--amber)">${etlLoaded}</b> (raw discarded) · ELT raw kept <b style="color:var(--green)">${eltRaw}</b>, modeled <b style="color:var(--blue)">${eltModeled}</b>`;
  }

  emit(3);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
