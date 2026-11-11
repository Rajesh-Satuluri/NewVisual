// ── Medallion architecture (live canvas sim) ────────────────────────────────
// Data is refined in layers. Raw records land in Bronze exactly as received —
// some dirty (nulls, duplicates). Moving to Silver they are cleaned: bad rows
// are fixed or dropped (dedup/validation). Silver rows are then aggregated into
// business-ready Gold tables. Inject records and watch them flow through the
// three quality tiers.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  // items flow left→right through 3 segments:
  //   seg 0: inlet → Bronze   seg 1: Bronze → Silver   seg 2: Silver → Gold
  const items = [];       // {id, seg, p, lane, dirty, dropping}
  let idSeq = 1;
  let ingested = 0, cleaned = 0, dropped = 0, goldRows = 0, goldAccum = 0;
  let spawnAcc = 0;
  const GOLD_EVERY = 4;   // silver rows per gold aggregate row

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="md-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="md-inject">➕ Inject records</button>
        <button class="sd-btn" id="md-dirty">💥 Inject dirty batch</button>
      </div>`,
    caption: 'Bronze keeps raw data exactly as it arrived (cheap, replayable). Silver is the cleaned, de-duplicated, validated layer. Gold holds business-ready aggregates. Each hop is a quality checkpoint — you can always rebuild a higher layer from the one below.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#md-note');

  const BX = 150, SX = 370, GX = 590, Y0 = 70, Y1 = 250;
  const lanes = 5;
  const laneY = l => Y0 + 24 + (Y1 - Y0 - 40) * (l / (lanes - 1));
  const segX = seg => [60, BX, SX, GX][seg];

  function spawn(dirty) {
    items.push({ id: idSeq++, seg: 0, p: 0, lane: Math.floor(Math.random() * lanes), dirty: !!dirty, dropping: false, fade: 1 });
  }
  function injectBatch(dirtyRate) {
    for (let i = 0; i < 6; i++) spawn(Math.random() < dirtyRate);
  }
  $('#md-inject').addEventListener('click', () => injectBatch(0.25));
  $('#md-dirty').addEventListener('click', () => injectBatch(0.8));

  function step(dt) {
    spawnAcc += dt;
    while (spawnAcc >= 1.1) { spawnAcc -= 1.1; spawn(Math.random() < 0.3); }

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.dropping) {
        it.dropY = (it.dropY || 0) + dt * 160;
        it.fade -= dt * 1.6;
        if (it.fade <= 0) items.splice(i, 1);
        continue;
      }
      it.p += dt * 0.65;
      if (it.p >= 1) {
        it.p = 0;
        it.seg++;
        if (it.seg === 1) ingested++;            // arrived in Bronze
        else if (it.seg === 2) {                  // arrived in Silver (post-clean)
          if (it.dirty) {
            // half the dirty rows are repaired, half dropped (dedup/validation)
            if (Math.random() < 0.5) { it.dirty = false; cleaned++; }
            else { it.dropping = true; dropped++; continue; }
          } else cleaned++;
        } else if (it.seg === 3) {                // arrived in Gold
          goldAccum++;
          if (goldAccum % GOLD_EVERY === 0) goldRows++;
          items.splice(i, 1);
        }
      }
    }
  }

  function zone(x, title, sub, col, count) {
    roundRect(ctx, x - 62, Y0, 124, Y1 - Y0, 12);
    ctx.fillStyle = withAlpha(col, 0.09); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(col, 0.75); ctx.stroke();
    label(ctx, title, x, Y0 - 24, { color: col, size: 13, weight: 800 });
    label(ctx, sub, x, Y0 - 8, { color: pal.text3, size: 10, weight: 600 });
    label(ctx, count, x, Y1 + 16, { color: pal.text2, size: 11, weight: 700 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // connectors
    ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(BX + 62, (Y0 + Y1) / 2); ctx.lineTo(SX - 62, (Y0 + Y1) / 2);
    ctx.moveTo(SX + 62, (Y0 + Y1) / 2); ctx.lineTo(GX - 62, (Y0 + Y1) / 2);
    ctx.stroke(); ctx.setLineDash([]);

    zone(BX, '🥉 Bronze', 'raw · as-is', pal.amber, `${ingested} ingested`);
    zone(SX, '🥈 Silver', 'cleaned · deduped', pal.text2, `${cleaned} clean · ${dropped} dropped`);
    zone(GX, '🥇 Gold', 'aggregated', pal.accent, `${goldRows} tables`);

    // gold aggregate tiles
    for (let g = 0; g < Math.min(goldRows, 5); g++) {
      roundRect(ctx, GX - 44, Y1 - 34 - g * 30, 88, 24, 5);
      ctx.fillStyle = withAlpha(pal.accent, 0.3); ctx.fill();
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 1; ctx.stroke();
      label(ctx, `∑ metric ${g + 1}`, GX, Y1 - 22 - g * 30, { color: pal.text, size: 10, weight: 700 });
    }

    // flowing items
    for (const it of items) {
      const x0 = segX(it.seg), x1 = segX(it.seg + 1);
      const x = x0 + (x1 - x0) * it.p;
      let y = laneY(it.lane);
      if (it.dropping) y += it.dropY || 0;
      const col = it.dirty ? pal.red : it.seg >= 2 ? pal.green : pal.amber;
      ctx.globalAlpha = it.fade;
      roundRect(ctx, x - 11, y - 8, 22, 16, 4);
      ctx.fillStyle = withAlpha(col, it.seg >= 2 ? 0.45 : 0.35); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
      if (it.dirty) label(ctx, '✗', x, y, { color: col, size: 10, weight: 800 });
      ctx.globalAlpha = 1;
    }

    note.innerHTML = `ingested <b style="color:var(--amber)">${ingested}</b> · cleaned <b style="color:var(--green)">${cleaned}</b> · dropped <b style="color:var(--red)">${dropped}</b> · gold tables <b style="color:var(--accent)">${goldRows}</b>`;
  }

  // prime with a couple of records
  injectBatch(0.3);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
