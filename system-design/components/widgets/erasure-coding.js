// ── Erasure coding for durability (live canvas sim) ─────────────────────────
// Object storage survives disk failures without paying 3× for replication by
// using erasure coding: an object is split into k data shards plus m parity
// shards across k+m nodes, and ANY k of the k+m shards can rebuild the whole
// object — so it tolerates up to m failures. Fail nodes and watch the object
// rebuild, until too many are gone.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const K = 4, M = 2, N = K + M;   // 4 data + 2 parity
  // shard state per node: 'ok' | 'down' | 'rebuilding'
  let shards = [];
  function store() { shards = Array.from({ length: N }, (_, i) => ({ type: i < K ? 'D' + (i + 1) : 'P' + (i - K + 1), state: 'ok', rb: 0 })); }
  store();

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ec-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ec-fail">💥 Fail a node</button>
        <button class="sd-btn" id="ec-repair">🔧 Repair</button>
        <button class="sd-btn" id="ec-store">📦 Re-store object</button>
      </div>`,
    caption: `With k=${K} data + m=${M} parity shards, any ${K} of the ${N} shards can reconstruct the object, so it survives up to ${M} simultaneous failures — at ${((N / K)).toFixed(1)}× storage overhead instead of 3× for triple replication. Lose more than ${M} and the object is unrecoverable.`,
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ec-note');

  const alive = () => shards.filter(s => s.state === 'ok').length;

  $('#ec-fail').addEventListener('click', () => {
    const up = shards.filter(s => s.state === 'ok');
    if (up.length) up[Math.floor(Math.random() * up.length)].state = 'down';
  });
  $('#ec-repair').addEventListener('click', () => {
    if (alive() >= K) shards.forEach(s => { if (s.state === 'down') { s.state = 'rebuilding'; s.rb = 0; } });
  });
  $('#ec-store').addEventListener('click', store);

  function step(dt) {
    shards.forEach(s => { if (s.state === 'rebuilding') { s.rb += dt * 0.8; if (s.rb >= 1) s.state = 'ok'; } });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    const up = alive(), lost = shards.filter(s => s.state === 'down').length;
    const recoverable = up >= K;
    label(ctx, '🗂 object → split into shards', 320, 28, { color: pal.text2, size: 12, weight: 700 });
    const bw = 80, gap = (640 - N * bw) / (N + 1);
    shards.forEach((s, i) => {
      const x = gap + i * (bw + gap), y = 80, h = 110;
      const isData = s.type[0] === 'D';
      let col = isData ? pal.blue : pal.accent2;
      if (s.state === 'down') col = pal.red;
      roundRect(ctx, x, y, bw, h, 10);
      ctx.fillStyle = withAlpha(col, s.state === 'down' ? 0.08 : 0.16); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(col, 0.8);
      if (s.state === 'down') ctx.setLineDash([4, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `node ${i + 1}`, x + bw / 2, y - 12, { color: pal.text3, size: 10 });
      if (s.state === 'down') { label(ctx, '✖', x + bw / 2, y + h / 2 - 6, { color: pal.red, size: 26, weight: 800 }); label(ctx, 'lost', x + bw / 2, y + h / 2 + 20, { color: pal.red, size: 10 }); }
      else {
        label(ctx, s.type, x + bw / 2, y + h / 2 - 6, { color: pal.text, size: 20, weight: 800 });
        label(ctx, isData ? 'data' : 'parity', x + bw / 2, y + h / 2 + 18, { color: pal.text3, size: 10 });
        if (s.state === 'rebuilding') { roundRect(ctx, x + 8, y + h - 16, (bw - 16) * s.rb, 6, 3); ctx.fillStyle = pal.green; ctx.fill(); }
      }
    });
    const vcol = up < K ? pal.red : lost > 0 ? pal.amber : pal.green;
    const status = up < K ? `⚠ DATA LOST — only ${up} of ${N} shards left, need ${K}` : lost > 0 ? `degraded: ${lost} down, still recoverable (any ${K} of ${N})` : 'healthy — all shards present';
    label(ctx, status, 320, 230, { color: vcol, size: 13, weight: 700 });
    note.innerHTML = `shards alive <b>${up}/${N}</b> · tolerates <b>${M}</b> failures · <b style="color:var(--${up < K ? 'red' : 'green'})">${recoverable ? 'recoverable' : 'UNRECOVERABLE'}</b> · overhead <b>${(N / K).toFixed(2)}×</b> (vs 3× replication)`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
