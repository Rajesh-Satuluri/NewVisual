// ── Data lineage (live canvas sim) ──────────────────────────────────────────
// A lineage graph from sources through staging and marts to reports. Focus a
// node and its upstream (ancestors → root cause) and downstream (descendants →
// impact) light up, with a pulse flowing down the dependents. Cycle the focus
// to trace different assets.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const NODES = {
  s1:    { name: 'orders_raw', x: 86, y: 80, deps: [], kind: 'src' },
  s2:    { name: 'users_raw', x: 86, y: 210, deps: [], kind: 'src' },
  stg_a: { name: 'stg_orders', x: 250, y: 70, deps: ['s1'], kind: 'stg' },
  stg_b: { name: 'stg_users', x: 250, y: 200, deps: ['s1', 's2'], kind: 'stg' },
  mart_x:{ name: 'fct_sales', x: 430, y: 85, deps: ['stg_a', 'stg_b'], kind: 'mart' },
  mart_y:{ name: 'dim_user', x: 430, y: 215, deps: ['stg_b'], kind: 'mart' },
  rpt:   { name: 'revenue_dash', x: 600, y: 150, deps: ['mart_x', 'mart_y'], kind: 'rpt' },
};
const ORDER = Object.keys(NODES);

export function mount(container) {
  let focus = 'stg_b', autoAcc = 0;
  const pulses = [];

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="lg-note"></div>
      <div class="wg-btnrow"><button class="sd-btn sd-btn-primary" id="lg-next">🔎 Trace next asset</button></div>`,
    caption: 'Lineage answers the two questions a big platform lives on: downstream (what breaks if I change this?) and upstream (what caused this wrong number?). Focus an asset and its ancestors and dependents light up — automatic, column-level lineage makes change and incident response tractable.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#lg-note');

  function ancestors(id, acc = new Set()) { NODES[id].deps.forEach(d => { acc.add(d); ancestors(d, acc); }); return acc; }
  function dependents(id) {
    const out = new Set();
    let changed = true; const frontier = new Set([id]);
    while (changed) { changed = false; for (const k of ORDER) if (!out.has(k) && NODES[k].deps.some(d => frontier.has(d) || out.has(d))) { out.add(k); frontier.add(k); changed = true; } }
    return out;
  }
  function edgesDownstream(desc) {
    const es = [];
    for (const k of ORDER) for (const d of NODES[k].deps) if ((desc.has(k) || k === focus) && (desc.has(d) || d === focus)) es.push([d, k]);
    return es;
  }

  function setFocus(id) { focus = id; pulses.length = 0; const es = edgesDownstream(dependents(id)); es.forEach(e => pulses.push({ e, p: Math.random() * -0.5 })); }
  $('#lg-next').addEventListener('click', () => { const i = ORDER.indexOf(focus); setFocus(ORDER[(i + 1) % ORDER.length]); });

  function step(dt) {
    autoAcc += dt; if (autoAcc >= 3.6) { autoAcc = 0; const i = ORDER.indexOf(focus); setFocus(ORDER[(i + 1) % ORDER.length]); }
    for (const pu of pulses) { pu.p += dt * 0.7; if (pu.p >= 1) pu.p = -0.2; }
  }

  const KINDCOL = { src: 'blue', stg: 'accent2', mart: 'amber', rpt: 'green' };

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const anc = ancestors(focus), desc = dependents(focus);

    // edges
    for (const k of ORDER) for (const d of NODES[k].deps) {
      const a = NODES[d], b = NODES[k];
      const onUp = (anc.has(d) || d === focus) && (anc.has(k) || k === focus);
      const onDown = (desc.has(k) || k === focus) && (desc.has(d) || d === focus);
      ctx.strokeStyle = onDown ? withAlpha(pal.amber, 0.8) : onUp ? withAlpha(pal.blue, 0.8) : withAlpha(pal.border, 0.6);
      ctx.lineWidth = (onUp || onDown) ? 1.8 : 1;
      ctx.beginPath(); ctx.moveTo(a.x + 42, a.y); ctx.lineTo(b.x - 42, b.y); ctx.stroke();
    }
    // downstream pulses
    for (const pu of pulses) {
      if (pu.p < 0) continue;
      const a = NODES[pu.e[0]], b = NODES[pu.e[1]];
      const x = (a.x + 42) + (b.x - 42 - a.x - 42) * pu.p, y = a.y + (b.y - a.y) * pu.p;
      ctx.fillStyle = pal.amber; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }

    // nodes
    for (const k of ORDER) {
      const n = NODES[k];
      const isFocus = k === focus, isAnc = anc.has(k), isDesc = desc.has(k);
      const base = pal[KINDCOL[n.kind]];
      const col = isFocus ? pal.accent : isAnc ? pal.blue : isDesc ? pal.amber : base;
      const dim = !isFocus && !isAnc && !isDesc;
      roundRect(ctx, n.x - 44, n.y - 18, 88, 36, 8);
      ctx.fillStyle = withAlpha(col, dim ? 0.06 : isFocus ? 0.25 : 0.14); ctx.fill();
      ctx.strokeStyle = withAlpha(col, dim ? 0.3 : 1); ctx.lineWidth = isFocus ? 2.2 : 1.3; ctx.stroke();
      label(ctx, n.name, n.x, n.y - 2, { color: dim ? pal.text3 : pal.text, size: 9, weight: 700 });
      label(ctx, n.kind, n.x, n.y + 10, { color: pal.text3, size: 7.5, weight: 600 });
    }
    // legend
    label(ctx, '● focus', 70, 282, { color: pal.accent, size: 9, weight: 700, align: 'left' });
    label(ctx, '● upstream (root cause)', 150, 282, { color: pal.blue, size: 9, weight: 700, align: 'left' });
    label(ctx, '● downstream (impact)', 350, 282, { color: pal.amber, size: 9, weight: 700, align: 'left' });

    note.innerHTML = `tracing <b style="color:var(--accent)">${NODES[focus].name}</b> · <b style="color:var(--blue)">${anc.size}</b> upstream · <b style="color:var(--amber)">${desc.size}</b> downstream affected`;
  }

  setFocus(focus);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
