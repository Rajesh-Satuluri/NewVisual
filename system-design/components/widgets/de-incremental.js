// ── Incremental vs full load (live canvas sim) ──────────────────────────────
// A source table grows over time. A full load re-copies every row each run; an
// incremental load keeps a high-water mark and copies only rows above it, then
// advances the mark. Add rows and run each load to see the volume moved.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let seq = 0;
  const rows = [];           // {id, mark} mark = monotonic ts
  let clock = 10;
  let hwm = 0;               // high-water mark
  const moving = [];        // {id, x, y, mode}
  let fullMoved = 0, incMoved = 0;

  function addRows(n) { for (let i = 0; i < n; i++) { clock += 1 + Math.floor(Math.random() * 3); rows.push({ id: ++seq, mark: clock }); } }

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="in-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn" id="in-add">＋ Add rows to source</button>
        <button class="sd-btn sd-btn-primary" id="in-inc">⏫ Incremental load</button>
        <button class="sd-btn" id="in-full">♻️ Full load</button>
      </div>`,
    caption: 'The incremental load pulls only rows whose updated_at is above the high-water mark, then slides the mark forward — O(changes). The full load re-copies the whole table every run — O(table size). As the source grows, the gap between the two widens fast.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#in-note');

  const SX = 130, TX = 530, TOP = 60, RH = 22;

  function runIncremental() {
    const changed = rows.filter(r => r.mark > hwm);
    changed.forEach((r, i) => moving.push({ id: r.id, p: 0, lane: i % 8, mode: 'inc' }));
    incMoved += changed.length;
    hwm = rows.reduce((m, r) => Math.max(m, r.mark), hwm);
  }
  function runFull() {
    rows.forEach((r, i) => moving.push({ id: r.id, p: 0, lane: i % 8, mode: 'full' }));
    fullMoved += rows.length;
  }
  $('#in-add').addEventListener('click', () => addRows(4));
  $('#in-inc').addEventListener('click', runIncremental);
  $('#in-full').addEventListener('click', runFull);

  let autoAcc = 0;
  function step(dt) {
    autoAcc += dt; if (autoAcc >= 2.2) { autoAcc = 0; addRows(2); }
    for (let i = moving.length - 1; i >= 0; i--) { moving[i].p += dt * 0.9; if (moving[i].p >= 1) moving.splice(i, 1); }
  }

  function tableBox(x, title, col, highlightAbove) {
    roundRect(ctx, x - 58, TOP - 26, 116, 232, 10);
    ctx.fillStyle = withAlpha(col, 0.06); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, title, x, TOP - 38, { color: col, size: 12, weight: 800 });
    rows.slice(-8).forEach((r, i) => {
      const y = TOP + i * (RH + 3);
      const isNew = highlightAbove && r.mark > hwm;
      roundRect(ctx, x - 50, y, 100, RH, 4);
      ctx.fillStyle = isNew ? withAlpha(pal.green, 0.3) : withAlpha(pal.bg3, 0.6); ctx.fill();
      if (isNew) { ctx.strokeStyle = pal.green; ctx.lineWidth = 1.2; ctx.stroke(); }
      label(ctx, `#${r.id}`, x - 32, y + RH / 2, { color: pal.text3, size: 9, weight: 700 });
      label(ctx, `ts ${r.mark}`, x + 14, y + RH / 2, { color: pal.text2, size: 9, weight: 600 });
    });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    tableBox(SX, '🗄️ Source', pal.blue, true);
    tableBox(TX, '🎯 Target', pal.green, false);

    // high-water mark indicator
    label(ctx, `⚑ high-water mark: ts ${hwm}`, 330, 24, { color: pal.amber, size: 11, weight: 700 });

    // moving packets
    for (const m of moving) {
      const y = TOP + m.lane * (RH + 3) + RH / 2;
      const x = SX + 58 + (TX - 58 - SX - 58) * Math.min(1, m.p);
      ctx.fillStyle = m.mode === 'inc' ? pal.green : pal.amber;
      roundRect(ctx, x - 8, y - 6, 16, 12, 3); ctx.fill();
    }

    note.innerHTML = `source rows <b style="color:var(--blue)">${rows.length}</b> · incremental moved <b style="color:var(--green)">${incMoved}</b> · full-load moved <b style="color:var(--amber)">${fullMoved}</b>`;
  }

  addRows(6);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
