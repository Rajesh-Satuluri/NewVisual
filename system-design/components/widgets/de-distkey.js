// ── Warehouse dist & sort keys (live canvas sim) ────────────────────────────
// Rows spread across MPP nodes. A matching distribution key co-locates a join so
// it runs node-local; a mismatch forces redistribution across the network. The
// sort key orders data so a filter skips blocks via zone maps. Toggle each and
// watch movement and scan.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const NODES = 3;

export function mount(container) {
  let matched = true, sortOn = true;
  const flying = [];
  let moved = 0, runs = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="dk-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="dk-dist">🧲 DIST key: matched</button>
        <button class="sd-btn" id="dk-sort">🪜 SORT key: on</button>
        <button class="sd-btn" id="dk-run">▶ Run query</button>
      </div>`,
    caption: 'Distribute both tables on the join key and matching rows share a node — the join is local, nothing moves. Mismatch, and one table must redistribute across the network first (a shuffle). The sort key orders rows so zone maps skip blocks a filter can’t match.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#dk-note');

  const nodeX = i => 150 + i * 190, NY = 110;

  function run() {
    runs++;
    if (!matched) {
      // redistribute table B across nodes so keys meet
      for (let n = 0; n < NODES; n++) for (let k = 0; k < 3; k++) {
        const to = (n + 1 + Math.floor(Math.random() * (NODES - 1))) % NODES;
        flying.push({ from: n, to, p: Math.random() * -0.2 });
        moved++;
      }
    }
  }
  $('#dk-dist').addEventListener('click', (e) => { matched = !matched; moved = 0; runs = 0; flying.length = 0; e.target.textContent = `🧲 DIST key: ${matched ? 'matched' : 'mismatched'}`; });
  $('#dk-sort').addEventListener('click', (e) => { sortOn = !sortOn; e.target.textContent = `🪜 SORT key: ${sortOn ? 'on' : 'off'}`; });
  $('#dk-run').addEventListener('click', run);

  let autoAcc = 0;
  function step(dt) {
    autoAcc += dt; if (autoAcc >= 3) { autoAcc = 0; run(); }
    for (let i = flying.length - 1; i >= 0; i--) { flying[i].p += dt * 0.8; if (flying[i].p >= 1.2) flying.splice(i, 1); }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, 'MPP warehouse — join fact ⋈ dimension', 330, 26, { color: pal.text2, size: 12, weight: 800 });

    for (let n = 0; n < NODES; n++) {
      const x = nodeX(n);
      roundRect(ctx, x - 72, NY - 40, 144, 120, 10);
      ctx.fillStyle = withAlpha(pal.accent, 0.06); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.accent, 0.5); ctx.lineWidth = 1.3; ctx.stroke();
      label(ctx, `🖥️ node ${n}`, x, NY - 48, { color: pal.text2, size: 10, weight: 700 });
      // table A rows (blue) — always on node by key
      for (let k = 0; k < 3; k++) { roundRect(ctx, x - 60 + k * 20, NY - 28, 15, 12, 2); ctx.fillStyle = withAlpha(pal.blue, 0.55); ctx.fill(); }
      label(ctx, 'A', x - 66, NY - 22, { color: pal.blue, size: 9, weight: 800, align: 'left' });
      // table B rows (amber) — aligned if matched
      for (let k = 0; k < 3; k++) { roundRect(ctx, x - 60 + k * 20, NY - 8, 15, 12, 2); ctx.fillStyle = withAlpha(pal.amber, 0.55); ctx.fill(); }
      label(ctx, 'B', x - 66, NY - 2, { color: pal.amber, size: 9, weight: 800, align: 'left' });
      // join status
      if (matched) label(ctx, '⋈ local join ✓', x, NY + 20, { color: pal.green, size: 9, weight: 700 });
      else label(ctx, '⋈ needs redistribute', x, NY + 20, { color: pal.red, size: 9, weight: 700 });

      // sort-key scan strip
      const blocks = 8;
      for (let b = 0; b < blocks; b++) {
        const pruned = sortOn && (b < 2 || b > 4);
        roundRect(ctx, x - 60 + b * 15, NY + 40, 12, 14, 2);
        ctx.fillStyle = pruned ? withAlpha(pal.bg3, 0.5) : withAlpha(pal.green, 0.5); ctx.fill();
      }
      label(ctx, sortOn ? 'scan: pruned' : 'scan: full', x, NY + 66, { color: sortOn ? pal.green : pal.amber, size: 8, weight: 700 });
    }

    // redistribution packets
    for (const f of flying) {
      if (f.p < 0) continue;
      const p = Math.min(1, f.p);
      const x = nodeX(f.from) + (nodeX(f.to) - nodeX(f.from)) * p;
      const y = NY - 8 - Math.sin(p * Math.PI) * 30;
      ctx.fillStyle = pal.amber; roundRect(ctx, x - 6, y - 5, 12, 10, 2); ctx.fill();
    }

    const scanPct = sortOn ? 62 : 0;
    note.innerHTML = `dist <b style="color:var(--${matched ? 'green' : 'red'})">${matched ? 'matched → local join' : 'mismatched → redistribute'}</b> · rows moved <b style="color:var(--${matched ? 'green' : 'red'})">${moved}</b> · sort key <b style="color:var(--amber)">${sortOn ? `skips ${scanPct}% of blocks` : 'off — full scan'}</b>`;
  }

  run();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
