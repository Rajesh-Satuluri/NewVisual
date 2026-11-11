// ── E-commerce analytics platform (live canvas sim) ─────────────────────────
// Operational sources (orders via CDC, inventory, clickstream, catalog) flow
// into a warehouse modeled as a star schema, which fans out to BI, ops, and
// recommendations. Watch many sources converge into one conformed model, then
// serve many consumers.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const SOURCES = [
  { name: 'orders DB', ing: 'CDC', tone: 'green', y: 50 },
  { name: 'inventory', ing: 'CDC', tone: 'blue', y: 105 },
  { name: 'clickstream', ing: 'stream', tone: 'amber', y: 195 },
  { name: 'catalog', ing: 'batch', tone: 'accent2', y: 250 },
];
const SINKS = [
  { name: '📊 BI', y: 70 },
  { name: '🖥️ ops', y: 150 },
  { name: '🤖 recs', y: 230 },
];

export function mount(container) {
  const inp = [], outp = [];
  let spawnAcc = 0, outAcc = 0, loaded = 0, served = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ec-note"></div>
      <div class="wg-btnrow"><button class="sd-btn sd-btn-primary" id="ec-run">▶ Ingest & serve</button></div>`,
    caption: 'Each source uses the right ingestion — CDC for the transactional databases (no load on production), streaming for clickstream, batch for reference data. All converge into one conformed star schema (fact + shared dimensions), so BI, ops, and recommendations read a single source of truth and their numbers reconcile.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ec-note');

  const SRCX = 86, WX = 340, WY = 150, SINKX = 600;

  function ingest() { const s = Math.floor(Math.random() * SOURCES.length); inp.push({ s, p: 0 }); }
  function serve() { const k = Math.floor(Math.random() * SINKS.length); outp.push({ k, p: 0 }); served++; }
  $('#ec-run').addEventListener('click', () => { for (let i = 0; i < 4; i++) ingest(); });

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.45) { spawnAcc -= 0.45; ingest(); }
    outAcc += dt; while (outAcc >= 0.7) { outAcc -= 0.7; if (loaded > served) serve(); }
    for (let i = inp.length - 1; i >= 0; i--) { inp[i].p += dt * 1.2; if (inp[i].p >= 1) { loaded++; inp.splice(i, 1); } }
    for (let i = outp.length - 1; i >= 0; i--) { outp[i].p += dt * 1.2; if (outp[i].p >= 1) outp.splice(i, 1); }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // sources
    SOURCES.forEach(s => {
      roundRect(ctx, SRCX - 58, s.y - 16, 116, 32, 7); ctx.fillStyle = withAlpha(pal[s.tone], 0.12); ctx.fill();
      ctx.strokeStyle = withAlpha(pal[s.tone], 0.7); ctx.lineWidth = 1.3; ctx.stroke();
      label(ctx, s.name, SRCX - 6, s.y - 2, { color: pal.text, size: 9.5, weight: 700 });
      label(ctx, s.ing, SRCX - 6, s.y + 9, { color: pal.text3, size: 7.5, weight: 600 });
      ctx.strokeStyle = withAlpha(pal.border, 0.6); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(SRCX + 58, s.y); ctx.lineTo(WX - 66, WY); ctx.stroke(); ctx.setLineDash([]);
    });

    // warehouse (star schema)
    roundRect(ctx, WX - 66, WY - 66, 132, 132, 12); ctx.fillStyle = withAlpha(pal.accent, 0.07); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.accent, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '🏢 warehouse', WX, WY - 76, { color: pal.accent, size: 11, weight: 800 });
    // dims around fact
    const dims = [[WX, WY - 44], [WX - 44, WY + 30], [WX + 44, WY + 30]];
    dims.forEach(d => { roundRect(ctx, d[0] - 20, d[1] - 11, 40, 22, 4); ctx.fillStyle = withAlpha(pal.blue, 0.25); ctx.fill(); ctx.strokeStyle = withAlpha(pal.blue, 0.6); ctx.lineWidth = 1; ctx.stroke(); label(ctx, 'dim', d[0], d[1], { color: pal.text2, size: 8, weight: 700 }); ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(WX, WY); ctx.stroke(); });
    roundRect(ctx, WX - 24, WY - 12, 48, 26, 5); ctx.fillStyle = withAlpha(pal.accent, 0.35); ctx.fill(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.3; ctx.stroke();
    label(ctx, '⭐fact', WX, WY + 1, { color: pal.text, size: 9, weight: 800 });

    // sinks
    SINKS.forEach(s => {
      roundRect(ctx, SINKX - 42, s.y - 16, 84, 32, 7); ctx.fillStyle = withAlpha(pal.green, 0.1); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.green, 0.7); ctx.lineWidth = 1.3; ctx.stroke();
      label(ctx, s.name, SINKX, s.y, { color: pal.text, size: 10, weight: 700 });
      ctx.strokeStyle = withAlpha(pal.border, 0.6); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(WX + 66, WY); ctx.lineTo(SINKX - 42, s.y); ctx.stroke(); ctx.setLineDash([]);
    });

    // packets
    for (const e of inp) { const s = SOURCES[e.s]; const x = (SRCX + 58) + (WX - 66 - SRCX - 58) * e.p, y = s.y + (WY - s.y) * e.p; ctx.fillStyle = pal[s.tone]; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const e of outp) { const s = SINKS[e.k]; const x = (WX + 66) + (SINKX - 42 - WX - 66) * e.p, y = WY + (s.y - WY) * e.p; ctx.fillStyle = pal.green; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }

    note.innerHTML = `rows modeled into star schema <b style="color:var(--accent)">${loaded}</b> · served to BI / ops / recs <b style="color:var(--green)">${served}</b> · <span style="color:var(--text3)">one conformed model, many consumers</span>`;
  }

  for (let i = 0; i < 4; i++) ingest();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
