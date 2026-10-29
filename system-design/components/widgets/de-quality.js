// ── Data quality gates (live canvas sim) ────────────────────────────────────
// Records stream through validation gates — schema, null, range, uniqueness.
// Passing rows reach the clean table; failing rows are routed to quarantine
// with their reason, not silently dropped. Watch the pass rate and reasons.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const GATES = ['schema', 'not-null', 'range', 'unique'];

export function mount(container) {
  const recs = [];        // {x, y, lane, failAt, phase}
  let spawnAcc = 0, passed = 0, idSeq = 0;
  const failCounts = [0, 0, 0, 0];

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="dq-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="dq-batch">⬇️ Ingest batch</button>
        <button class="sd-btn" id="dq-bad">💥 Inject dirty batch</button>
      </div>`,
    caption: 'Each record is checked against rules at the raw→clean boundary. A failing row is quarantined to a reject table with the rule it broke — never silently dropped, which would hide the loss. The pass rate and per-rule failures are themselves a monitored health signal.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#dq-note');

  const INX = 40, gateX = i => 150 + i * 110, CLEANX = 600, QY = 250, LANEY = 120;

  function spawn(dirtyRate) {
    const bad = Math.random() < dirtyRate;
    const failAt = bad ? Math.floor(Math.random() * GATES.length) : -1;
    recs.push({ id: ++idSeq, x: INX, failAt, phase: 0, y: LANEY, dropY: 0, fade: 1 });
  }
  $('#dq-batch').addEventListener('click', () => { for (let i = 0; i < 6; i++) spawn(0.25); });
  $('#dq-bad').addEventListener('click', () => { for (let i = 0; i < 6; i++) spawn(0.8); });

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.5) { spawnAcc -= 0.5; spawn(0.3); }
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i];
      if (r.quarantined) { r.dropY += dt * 120; r.fade -= dt * 1.2; if (r.fade <= 0) recs.splice(i, 1); continue; }
      r.x += dt * 150;
      // check if it hits its failing gate
      if (r.failAt >= 0 && r.x >= gateX(r.failAt)) { r.quarantined = true; r.x = gateX(r.failAt); failCounts[r.failAt]++; continue; }
      if (r.x >= CLEANX - 30) { passed++; recs.splice(i, 1); }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // inflow
    label(ctx, '📥 raw', INX + 4, LANEY - 24, { color: pal.text3, size: 10, weight: 700 });
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(INX + 20, LANEY); ctx.lineTo(CLEANX - 30, LANEY); ctx.stroke(); ctx.setLineDash([]);

    // gates
    GATES.forEach((g, i) => {
      const x = gateX(i);
      roundRect(ctx, x - 10, LANEY - 40, 20, 80, 5);
      ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.accent, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
      label(ctx, g, x, LANEY - 50, { color: pal.text2, size: 9, weight: 700 });
      label(ctx, `✕${failCounts[i]}`, x, LANEY + 54, { color: pal.red, size: 9, weight: 700 });
    });

    // clean table
    roundRect(ctx, CLEANX - 24, LANEY - 34, 54, 68, 8);
    ctx.fillStyle = withAlpha(pal.green, 0.12); ctx.fill(); ctx.strokeStyle = pal.green; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '✅ clean', CLEANX + 3, LANEY, { color: pal.text, size: 10, weight: 700 });

    // quarantine box
    roundRect(ctx, 150, QY - 18, 360, 40, 8);
    ctx.fillStyle = withAlpha(pal.red, 0.07); ctx.fill(); ctx.strokeStyle = withAlpha(pal.red, 0.6); ctx.lineWidth = 1.3; ctx.stroke();
    label(ctx, '⛔ quarantine (reject table + reason)', 330, QY + 2, { color: pal.red, size: 10, weight: 700 });

    // records
    for (const r of recs) {
      const col = r.quarantined ? pal.red : pal.blue;
      ctx.globalAlpha = r.fade;
      ctx.fillStyle = col; roundRect(ctx, r.x - 7, r.y - 6 + r.dropY, 14, 12, 3); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const totalFail = failCounts.reduce((a, b) => a + b, 0);
    const rate = (passed + totalFail) ? Math.round(passed / (passed + totalFail) * 100) : 100;
    note.innerHTML = `passed to clean <b style="color:var(--green)">${passed}</b> · quarantined <b style="color:var(--red)">${totalFail}</b> · pass rate <b>${rate}%</b>`;
  }

  for (let i = 0; i < 4; i++) spawn(0.3);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
