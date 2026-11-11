// ── Small-file compaction (live canvas sim) ─────────────────────────────────
// Streaming ingestion scatters tiny files, each with fixed per-file overhead.
// Compaction merges them into a few right-sized files, collapsing the scan
// overhead. Ingest to create the problem, compact to fix it, and watch the
// overhead meter.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const BIG_SLOTS = 4;

export function mount(container) {
  const smalls = [];       // {x, y, vx, vy, target}
  const bigs = Array.from({ length: BIG_SLOTS }, (_, i) => ({ count: 0 }));
  let ingestAcc = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="cp-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="cp-ing">🌊 Ingest ×10 (streaming)</button>
        <button class="sd-btn" id="cp-opt">🧰 Compact (OPTIMIZE)</button>
      </div>`,
    caption: 'Each tiny file costs a list + open + metadata read + a scheduled task, so overhead grows with file count, not data size. Compaction bin-packs them into ~128MB–1GB files, so the engine reads data instead of bookkeeping — the core lake-maintenance job.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#cp-note');

  function spawn(n) {
    for (let i = 0; i < n; i++) smalls.push({ x: 40 + Math.random() * 560, y: 55 + Math.random() * 110, vx: 0, vy: 0, target: null });
  }
  function compact() {
    smalls.forEach((s, i) => { s.target = i % BIG_SLOTS; });
  }
  $('#cp-ing').addEventListener('click', () => spawn(10));
  $('#cp-opt').addEventListener('click', compact);

  const slotX = i => 120 + i * 150;
  const SLOT_Y = 236;

  function step(dt) {
    ingestAcc += dt;
    while (ingestAcc >= 1.4) { ingestAcc -= 1.4; spawn(3); }   // steady streaming trickle
    for (let i = smalls.length - 1; i >= 0; i--) {
      const s = smalls[i];
      if (s.target !== null) {
        const tx = slotX(s.target), ty = SLOT_Y;
        s.x += (tx - s.x) * Math.min(1, dt * 6);
        s.y += (ty - s.y) * Math.min(1, dt * 6);
        if (Math.abs(s.x - tx) < 6 && Math.abs(s.y - ty) < 6) { bigs[s.target].count++; smalls.splice(i, 1); }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, '🗂 partition files', 330, 30, { color: pal.text2, size: 12, weight: 800 });

    // compacted big files (bottom)
    bigs.forEach((b, i) => {
      if (b.count === 0) return;
      const w = Math.min(120, 44 + b.count * 3);
      const x = slotX(i) - w / 2;
      roundRect(ctx, x, SLOT_Y - 20, w, 40, 7);
      ctx.fillStyle = withAlpha(pal.green, 0.3); ctx.fill();
      ctx.strokeStyle = pal.green; ctx.lineWidth = 1.5; ctx.stroke();
      label(ctx, '🧊 big', slotX(i), SLOT_Y - 4, { color: pal.text, size: 10, weight: 700 });
      label(ctx, `${b.count} merged`, slotX(i), SLOT_Y + 10, { color: pal.text3, size: 9, weight: 600 });
    });

    // small files
    for (const s of smalls) {
      const moving = s.target !== null;
      roundRect(ctx, s.x - 7, s.y - 7, 14, 14, 3);
      ctx.fillStyle = withAlpha(moving ? pal.green : pal.amber, 0.7); ctx.fill();
      ctx.strokeStyle = moving ? pal.green : pal.amber; ctx.lineWidth = 1; ctx.stroke();
    }

    // overhead meter
    const bigCount = bigs.filter(b => b.count > 0).length;
    const fileCount = smalls.length + bigCount;
    const overhead = Math.min(1, smalls.length / 60);
    roundRect(ctx, 40, 285, 300, 10, 5); ctx.fillStyle = withAlpha(pal.bg3, 0.6); ctx.fill();
    roundRect(ctx, 40, 285, 300 * overhead, 10, 5); ctx.fillStyle = overhead > 0.5 ? pal.red : overhead > 0.2 ? pal.amber : pal.green; ctx.fill();
    label(ctx, 'per-file scan overhead', 350, 290, { color: pal.text3, size: 9, weight: 600, align: 'left' });

    note.innerHTML = `small files <b style="color:var(--amber)">${smalls.length}</b> · compacted files <b style="color:var(--green)">${bigCount}</b> · total to open <b>${fileCount}</b>`;
  }

  spawn(24);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
