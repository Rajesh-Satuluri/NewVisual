// ── Data lake architecture (live canvas sim) ────────────────────────────────
// A data lake accepts any shape of data — structured tables, semi-structured
// logs/JSON, unstructured files, streaming events — and stores it as-is on
// cheap object storage in open formats (schema-on-read). Downstream, BI, SQL
// and ML read straight from the lake. Watch heterogeneous sources land, then
// queries pull curated data back out.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const SOURCES = [
  { icon: '🗄️', name: 'OLTP DB', tone: 'blue' },
  { icon: '📜', name: 'App logs', tone: 'amber' },
  { icon: '🖼️', name: 'Files / media', tone: 'accent2' },
  { icon: '📡', name: 'Event stream', tone: 'green' },
];
const SINKS = [
  { icon: '📊', name: 'BI' },
  { icon: '🔍', name: 'SQL' },
  { icon: '🤖', name: 'ML' },
];

export function mount(container) {
  const inbound = [];     // {t, lane, tone}
  const outbound = [];    // {t, lane}
  let stored = 0, queries = 0, ingestAcc = 0, queryAcc = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="dl-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="dl-ingest">⬇️ Ingest burst</button>
        <button class="sd-btn" id="dl-query">🔍 Run query</button>
      </div>`,
    caption: 'One cheap store, any format. The lake never rejects data for not fitting a schema — structure is applied on read, not on write. That makes it the universal landing zone every warehouse, notebook and ML job reads from.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#dl-note');

  const SRCX = 86, LAKEX = 330, SINKX = 590;
  const srcY = i => 58 + i * 60;
  const sinkY = i => 78 + i * 68;
  const LY = 150;

  function toneCol(t) { return pal[t] || pal.accent; }

  function ingest(n = 1) {
    for (let i = 0; i < n; i++) {
      const lane = Math.floor(Math.random() * SOURCES.length);
      inbound.push({ t: 0, lane, tone: SOURCES[lane].tone });
    }
  }
  function query() { outbound.push({ t: 0, lane: Math.floor(Math.random() * SINKS.length) }); queries++; }
  $('#dl-ingest').addEventListener('click', () => ingest(6));
  $('#dl-query').addEventListener('click', query);

  function step(dt) {
    ingestAcc += dt;
    while (ingestAcc >= 0.5) { ingestAcc -= 0.5; ingest(1); }
    queryAcc += dt;
    while (queryAcc >= 2.4) { queryAcc -= 2.4; query(); }

    for (let i = inbound.length - 1; i >= 0; i--) {
      inbound[i].t += dt * 0.9;
      if (inbound[i].t >= 1) { stored++; inbound.splice(i, 1); }
    }
    for (let i = outbound.length - 1; i >= 0; i--) {
      outbound[i].t += dt * 0.9;
      if (outbound[i].t >= 1) outbound.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);

    // ── the lake (object storage) ──
    roundRect(ctx, LAKEX - 78, 54, 156, 196, 16);
    ctx.fillStyle = withAlpha(pal.blue, 0.1); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = withAlpha(pal.blue, 0.8); ctx.stroke();
    label(ctx, '🏞️ Data lake', LAKEX, 40, { color: pal.blue, size: 13, weight: 800 });
    label(ctx, 'object storage · open formats', LAKEX, 72, { color: pal.text3, size: 10, weight: 600 });
    // fill level by stored count
    const fillPct = Math.min(1, stored / 60);
    const fh = (196 - 34) * fillPct;
    roundRect(ctx, LAKEX - 70, 244 - fh, 140, fh, 8);
    ctx.fillStyle = withAlpha(pal.blue, 0.22); ctx.fill();
    label(ctx, `${stored} objects`, LAKEX, 232, { color: pal.text, size: 11, weight: 700 });

    // ── sources ──
    SOURCES.forEach((s, i) => {
      const y = srcY(i);
      roundRect(ctx, SRCX - 58, y - 16, 116, 32, 8);
      ctx.fillStyle = withAlpha(toneCol(s.tone), 0.12); ctx.fill();
      ctx.strokeStyle = withAlpha(toneCol(s.tone), 0.7); ctx.lineWidth = 1.5; ctx.stroke();
      label(ctx, `${s.icon} ${s.name}`, SRCX, y, { color: pal.text, size: 11, weight: 600 });
    });
    // ── sinks ──
    SINKS.forEach((s, i) => {
      const y = sinkY(i);
      roundRect(ctx, SINKX - 48, y - 17, 96, 34, 8);
      ctx.fillStyle = withAlpha(pal.accent, 0.1); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.accent, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
      label(ctx, `${s.icon} ${s.name}`, SINKX, y, { color: pal.text, size: 11, weight: 700 });
    });

    // inbound packets: source → lake
    for (const p of inbound) {
      const y0 = srcY(p.lane), x0 = SRCX + 58;
      const x = x0 + (LAKEX - 78 - x0) * p.t;
      const y = y0 + (LY - y0) * p.t;
      ctx.fillStyle = toneCol(p.tone);
      roundRect(ctx, x - 6, y - 5, 12, 10, 3); ctx.fill();
    }
    // outbound packets: lake → sink
    for (const p of outbound) {
      const y1 = sinkY(p.lane), x0 = LAKEX + 78;
      const x = x0 + (SINKX - 48 - x0) * p.t;
      const y = LY + (y1 - LY) * p.t;
      ctx.fillStyle = pal.accent2;
      roundRect(ctx, x - 6, y - 5, 12, 10, 3); ctx.fill();
    }

    note.innerHTML = `stored <b style="color:var(--blue)">${stored}</b> objects · queries served <b style="color:var(--accent)">${queries}</b> · <span style="color:var(--text3)">any format, schema-on-read</span>`;
  }

  ingest(5);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
