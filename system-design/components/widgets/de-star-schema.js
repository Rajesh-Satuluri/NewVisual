// ── Star vs snowflake schema (live canvas sim) ──────────────────────────────
// A fact table sits at the centre; dimension tables radiate out. A query joins
// the fact to the dimensions it needs — in a star that's a single hop per
// dimension. Toggle to snowflake and one dimension normalizes into a sub-table,
// adding an extra join hop. Watch query pulses travel the join edges.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let snowflake = false;
  const pulses = [];       // {edge, t}
  let factGlow = 0, queryAcc = 0, joins = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ss-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ss-query">▶ Run query</button>
        <button class="sd-btn" id="ss-mode">❄️ Snowflake: off</button>
      </div>`,
    caption: 'In a star, every dimension is one join hop from the fact — simple, fast aggregate queries. Snowflake normalizes a dimension into sub-tables: less redundancy, but each extra level is another join. Default to the star; snowflake only where it clearly pays.',
  });

  const ctx = fitCanvas(canvas, 660, 320);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ss-note');

  const FX = 330, FY = 170;
  const dims = [
    { name: 'date_dim', x: 140, y: 70, tone: 'blue' },
    { name: 'product_dim', x: 520, y: 70, tone: 'amber' },
    { name: 'customer_dim', x: 140, y: 270, tone: 'green' },
    { name: 'store_dim', x: 520, y: 270, tone: 'accent2' },
  ];
  // snowflake sub-table off product_dim
  const sub = { name: 'category_dim', x: 625, y: 150, tone: 'amber', parent: 1 };

  function edges() {
    const e = dims.map((d, i) => ({ x1: d.x, y1: d.y, x2: FX, y2: FY, tone: d.tone, i }));
    if (snowflake) e.push({ x1: sub.x, y1: sub.y, x2: dims[1].x, y2: dims[1].y, tone: 'amber', i: 99 });
    return e;
  }

  function runQuery() {
    const es = edges();
    // pick 2-3 dimensions to join
    const pick = es.filter(() => Math.random() < 0.7);
    const chosen = pick.length ? pick : [es[0]];
    chosen.forEach(e => pulses.push({ edge: e, t: 0 }));
    joins += chosen.length;
  }
  $('#ss-query').addEventListener('click', runQuery);
  $('#ss-mode').addEventListener('click', (e) => {
    snowflake = !snowflake;
    e.target.textContent = `❄️ Snowflake: ${snowflake ? 'on' : 'off'}`;
  });

  function step(dt) {
    queryAcc += dt;
    while (queryAcc >= 2.2) { queryAcc -= 2.2; runQuery(); }
    factGlow = Math.max(0, factGlow - dt * 1.4);
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].t += dt * 1.1;
      if (pulses[i].t >= 1 && !pulses[i].hit) { pulses[i].hit = true; factGlow = 1; }
      if (pulses[i].t >= 1.1) pulses.splice(i, 1);
    }
  }

  function tableBox(x, y, name, tone, w = 108, h = 46) {
    const col = pal[tone] || pal.accent;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = withAlpha(col, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.8); ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '📐 dim', x, y - 8, { color: pal.text3, size: 9, weight: 600 });
    label(ctx, name, x, y + 8, { color: pal.text, size: 11, weight: 700 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 320);
    // edges
    for (const e of edges()) {
      ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
    }
    // pulses along edges
    for (const p of pulses) {
      const e = p.edge, t = Math.min(1, p.t);
      const x = e.x1 + (e.x2 - e.x1) * t, y = e.y1 + (e.y2 - e.y1) * t;
      ctx.fillStyle = pal[e.tone] || pal.accent;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
    // dims
    dims.forEach(d => tableBox(d.x, d.y, d.name, d.tone));
    if (snowflake) tableBox(sub.x, sub.y, sub.name, sub.tone, 96, 40);
    // fact (centre)
    const fw = 132, fh = 58;
    roundRect(ctx, FX - fw / 2, FY - fh / 2, fw, fh, 10);
    ctx.fillStyle = withAlpha(pal.accent, 0.14 + factGlow * 0.35); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2 + factGlow * 1.5; ctx.stroke();
    label(ctx, '⭐ FACT', FX, FY - 12, { color: pal.accent, size: 10, weight: 800 });
    label(ctx, 'fact_sales', FX, FY + 6, { color: pal.text, size: 13, weight: 800 });
    label(ctx, 'amount · qty · fks', FX, FY + 22, { color: pal.text3, size: 9, weight: 600 });

    note.innerHTML = `schema <b style="color:var(--${snowflake ? 'blue' : 'accent'})">${snowflake ? 'snowflake' : 'star'}</b> · join hops this query <b>${pulses.length || '—'}</b> · total joins run <b>${joins}</b>`;
  }

  runQuery();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
