// ── Snowflake ID generator (live canvas sim) ────────────────────────────────
// Distributed unique IDs without coordination: a 64-bit Snowflake packs a
// timestamp, a machine id, and a per-millisecond sequence number into one
// integer. The timestamp prefix makes IDs roughly time-sortable; the machine
// bits keep two servers from colliding; the sequence disambiguates IDs minted
// in the same millisecond. Generate some and watch the bits fill.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const EPOCH = 1700000000000n;
  const MACHINE = 7n;
  let lastMs = 0n, seq = 0n;
  let recent = [];           // {id, ts, machine, seq}
  let flash = 0;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="sf-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="sf-gen">🆔 Generate ID</button>
        <button class="sd-btn" id="sf-burst">⚡ Burst ×6 (same ms)</button>
      </div>`,
    caption: '41 timestamp bits + 10 machine bits + 12 sequence bits = 64. The timestamp leads, so IDs sort by creation time; the machine bits let every server mint IDs independently; the sequence counts up to 4096 IDs per machine per millisecond before waiting for the next tick.',
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#sf-note');

  function gen(sameMs) {
    let ms = sameMs && lastMs ? lastMs : BigInt(Date.now());
    if (ms === lastMs) seq = (seq + 1n) & 4095n; else { seq = 0n; lastMs = ms; }
    const tsPart = ms - EPOCH;
    const id = (tsPart << 22n) | (MACHINE << 12n) | seq;
    recent.unshift({ id, ts: tsPart, machine: MACHINE, seq }); if (recent.length > 5) recent.pop();
    flash = 1;
  }
  $('#sf-gen').addEventListener('click', () => gen(false));
  $('#sf-burst').addEventListener('click', () => { lastMs = BigInt(Date.now()); for (let i = 0; i < 6; i++) gen(true); });

  function step(dt) { if (flash > 0) flash = Math.max(0, flash - dt * 1.5); }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    const cur = recent[0];
    // 64-bit strip (show as 3 segments, not literally 64 cells)
    const segs = [
      { label: 'timestamp', bits: 41, col: pal.blue },
      { label: 'machine', bits: 10, col: pal.accent2 },
      { label: 'sequence', bits: 12, col: pal.green },
    ];
    const total = 63, x0 = 20, w = 600;
    let x = x0;
    label(ctx, '64-bit Snowflake ID layout', 320, 28, { color: pal.text2, size: 12, weight: 700 });
    segs.forEach(s => {
      const sw = (s.bits / total) * w;
      roundRect(ctx, x, 50, sw - 4, 56, 8);
      ctx.fillStyle = withAlpha(s.col, 0.16 + (cur ? flash * 0.4 : 0)); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(s.col, 0.8); ctx.stroke();
      label(ctx, s.label, x + (sw - 4) / 2, 68, { color: pal.text, size: 12, weight: 700 });
      label(ctx, `${s.bits} bits`, x + (sw - 4) / 2, 88, { color: pal.text3, size: 10 });
      x += sw;
    });
    if (cur) {
      label(ctx, 'value:', x0, 128, { color: pal.text3, size: 11, align: 'left' });
      x = x0; const vals = [{ v: cur.ts.toString(), col: pal.blue, bits: 41 }, { v: cur.machine.toString(), col: pal.accent2, bits: 10 }, { v: cur.seq.toString(), col: pal.green, bits: 12 }];
      vals.forEach(o => { const sw = (o.bits / total) * w; label(ctx, o.v, x + (sw - 4) / 2, 128, { color: o.col, size: 13, weight: 800 }); x += sw; });
      label(ctx, `ID = ${cur.id.toString()}`, 320, 158, { color: pal.text, size: 14, weight: 800 });
    }
    // recent list (monotonic)
    label(ctx, 'recent IDs (monotonically increasing):', 20, 186, { color: pal.text3, size: 11, align: 'left' });
    recent.forEach((r, i) => {
      const y = 198 + i * 18;
      roundRect(ctx, 20, y, 600, 16, 4); ctx.fillStyle = withAlpha(pal.accent, i === 0 ? 0.12 : 0.05); ctx.fill();
      label(ctx, r.id.toString(), 28, y + 8, { color: i === 0 ? pal.text : pal.text2, size: 11, weight: i === 0 ? 700 : 400, align: 'left' });
      label(ctx, `seq ${r.seq}`, 612, y + 8, { color: pal.text3, size: 10, align: 'right' });
    });
    note.innerHTML = cur
      ? `machine <b style="color:var(--accent2)">${cur.machine}</b> · last ID <b>${cur.id.toString()}</b> · sequence this ms <b style="color:var(--green)">${cur.seq}</b>/4095 · IDs are time-sortable by construction`
      : 'press Generate to mint a Snowflake ID';
  }

  gen(false);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
