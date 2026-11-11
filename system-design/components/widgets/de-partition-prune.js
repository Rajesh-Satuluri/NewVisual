// ── Partition pruning (live canvas sim) ─────────────────────────────────────
// A table partitioned by date is a set of directories. A query filtering on the
// partition column scans only the matching directories and prunes the rest;
// filtering on a non-partition column prunes nothing. Pick a filter and watch
// how much of the table the engine skips.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const N = 8;

export function mount(container) {
  let mode = 'last2';      // last2 | last4 | nonpart
  let scan = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="pp-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="pp-2">🗓 Filter: last 2 days</button>
        <button class="sd-btn" id="pp-4">🗓 Last 4 days</button>
        <button class="sd-btn" id="pp-x">⚠️ Filter on non-partition col</button>
      </div>`,
    caption: 'On a table partitioned by event_date, a date filter lets the engine skip whole partitions it can’t match — scanning days, not years. Filter on a column the table isn’t partitioned by and no directory can be ruled out, so the whole table is scanned.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#pp-note');

  function setMode(m, el) { mode = m; scan = 0; }
  $('#pp-2').addEventListener('click', () => setMode('last2'));
  $('#pp-4').addEventListener('click', () => setMode('last4'));
  $('#pp-x').addEventListener('click', () => setMode('nonpart'));

  function scanned(i) {
    if (mode === 'last2') return i >= N - 2;
    if (mode === 'last4') return i >= N - 4;
    return true;            // nonpart: everything scanned (no pruning)
  }

  function step(dt) { if (scan < N) scan = Math.min(N, scan + dt * 5); }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const PW = 64, GAP = 12, baseY = 230, fileH = 14;
    const totalW = N * PW + (N - 1) * GAP;
    const ox = (660 - totalW) / 2;
    const shown = Math.floor(scan + 0.001);

    let scannedCount = 0;
    for (let i = 0; i < N; i++) {
      const x = ox + i * (PW + GAP);
      const isScan = scanned(i);
      const revealed = i < shown || scan >= N;
      const pruned = !isScan;
      const col = mode === 'nonpart' ? pal.amber : pal.green;

      // directory header
      label(ctx, `date=${i}`, x + PW / 2, 60, { color: pruned ? pal.text3 : pal.text2, size: 9, weight: 700 });
      // stacked files
      for (let f = 0; f < 3; f++) {
        const y = baseY - f * (fileH + 4) - fileH;
        roundRect(ctx, x, y, PW, fileH, 3);
        if (revealed && isScan) { ctx.fillStyle = withAlpha(col, 0.45); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); }
        else if (pruned) { ctx.fillStyle = withAlpha(pal.bg3, 0.4); ctx.fill(); }
        else { ctx.fillStyle = withAlpha(pal.bg3, 0.7); ctx.fill(); }
      }
      // status chip
      if (revealed) {
        if (isScan) { scannedCount++; label(ctx, 'scan', x + PW / 2, baseY + 16, { color: col, size: 9, weight: 700 }); }
        else label(ctx, 'pruned', x + PW / 2, baseY + 16, { color: pal.text3, size: 9, weight: 600 });
      }
    }

    const pct = Math.round((1 - scannedCount / N) * 100);
    const msg = mode === 'nonpart'
      ? `<b style="color:var(--amber)">no pruning</b> — filter not on the partition key · full scan (${scannedCount}/${N})`
      : `scanned <b style="color:var(--green)">${scannedCount}</b> of ${N} partitions · <b>${pct}%</b> pruned`;
    note.innerHTML = msg;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
