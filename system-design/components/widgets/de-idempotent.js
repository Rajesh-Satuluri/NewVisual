// ── Idempotent pipeline writes (live canvas sim) ────────────────────────────
// A task writes the 4 rows for one partition. Run it repeatedly (as retries and
// backfills do). In append mode each run duplicates the slice and the count
// climbs; in overwrite mode each run replaces the partition and the count stays
// correct — idempotent by construction.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const SLICE = 4;

export function mount(container) {
  let mode = 'append';          // 'append' | 'overwrite'
  let runs = 0, gen = 0;
  const rows = [];              // {gen, y}
  const incoming = [];          // {p, gen, slot}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="id-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="id-run">▶ Run task (again)</button>
        <button class="sd-btn" id="id-mode">🧱 Mode: append</button>
      </div>`,
    caption: 'The task writes the 4 rows for partition D. Retries and backfills re-run it, so a blind INSERT (append) duplicates the slice every time. Overwrite-by-partition deletes then writes the slice, so any number of re-runs leaves exactly 4 correct rows — idempotent.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#id-note');

  function run() {
    runs++; gen++;
    if (mode === 'overwrite') { rows.length = 0; }   // delete partition first
    for (let i = 0; i < SLICE; i++) incoming.push({ p: 0, gen, slot: i });
  }
  $('#id-run').addEventListener('click', run);
  $('#id-mode').addEventListener('click', (e) => { mode = mode === 'append' ? 'overwrite' : 'append'; e.target.textContent = `🧱 Mode: ${mode}`; rows.length = 0; incoming.length = 0; runs = 0; });

  function step(dt) {
    for (let i = incoming.length - 1; i >= 0; i--) {
      const m = incoming[i]; m.p += dt * 1.3;
      if (m.p >= 1) { rows.push({ gen: m.gen }); incoming.splice(i, 1); }
    }
  }

  const TASKX = 120, PARTX = 470, PTOP = 60;

  function draw() {
    ctx.clearRect(0, 0, 660, 300);

    // task box
    roundRect(ctx, TASKX - 56, 120, 112, 60, 10);
    ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '⚙️ write task', TASKX, 142, { color: pal.text, size: 11, weight: 700 });
    label(ctx, `partition D · ${SLICE} rows`, TASKX, 160, { color: pal.text3, size: 9, weight: 600 });

    // partition box
    const correct = rows.length === SLICE;
    const over = rows.length > SLICE;
    const pcol = correct ? pal.green : over ? pal.red : pal.amber;
    roundRect(ctx, PARTX - 70, PTOP - 26, 180, 236, 10);
    ctx.fillStyle = withAlpha(pcol, 0.06); ctx.fill();
    ctx.strokeStyle = withAlpha(pcol, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, '🎯 target · partition D', PARTX + 20, PTOP - 38, { color: pcol, size: 11, weight: 800 });

    // rows stacked
    rows.slice(0, 11).forEach((r, i) => {
      const y = PTOP + i * 18;
      roundRect(ctx, PARTX - 60, y, 160, 15, 3);
      const c = ['blue', 'green', 'amber', 'accent2', 'accent'][r.gen % 5];
      ctx.fillStyle = withAlpha(pal[c] || pal.accent, 0.4); ctx.fill();
      label(ctx, `row · from run ${r.gen}`, PARTX + 20, y + 8, { color: pal.text2, size: 8.5, weight: 600 });
    });
    if (rows.length > 11) label(ctx, `+${rows.length - 11} more`, PARTX + 20, PTOP + 11 * 18 + 6, { color: pal.text3, size: 9 });

    // flying rows
    for (const m of incoming) {
      const x = (TASKX + 56) + (PARTX - 60 - TASKX - 56) * m.p;
      const y = 150 + (PTOP + m.slot * 18 - 150) * m.p;
      ctx.fillStyle = pal.accent; roundRect(ctx, x - 7, y - 5, 14, 11, 3); ctx.fill();
    }

    note.innerHTML = `runs: <b>${runs}</b> · rows in partition: <b style="color:var(--${over ? 'red' : correct ? 'green' : 'amber'})">${rows.length}</b> / expected ${SLICE} ${over ? '— <b style="color:var(--red)">DUPLICATED ✕</b>' : correct ? '— <b style="color:var(--green)">correct ✓</b>' : ''}`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
