// ── Quorum (N / W / R) explorer (live canvas sim) ───────────────────────────
// A Dynamo-style key-value store keeps N replicas of each key. A write waits
// for W acks; a read gathers R replicas and takes the newest version it sees.
// The magic rule is W + R > N: it forces the read set and the write set to
// overlap, so a read is *guaranteed* to see the latest write. Dial W and R,
// fire writes and reads, and watch fresh vs. stale.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let N = 5, W = 3, R = 3;
  let latest = 1;
  let reps = [];
  const packets = [];
  let lastRead = null;        // { fresh, ver, queried:Set }

  function initReps() { reps = Array.from({ length: N }, () => ({ ver: latest, flash: 0, queried: 0 })); }
  initReps();

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="q-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="q-write">✏️ Write new version</button>
        <button class="sd-btn" id="q-read">🔍 Read</button>
        <span class="q-steppers">
          <span class="q-step">N <button data-k="N" data-d="-1">−</button><b id="q-N">5</b><button data-k="N" data-d="1">+</button></span>
          <span class="q-step">W <button data-k="W" data-d="-1">−</button><b id="q-W">3</b><button data-k="W" data-d="1">+</button></span>
          <span class="q-step">R <button data-k="R" data-d="-1">−</button><b id="q-R">3</b><button data-k="R" data-d="1">+</button></span>
        </span>
      </div>`,
    caption: 'When W + R > N the read set must overlap the write set, so a read always sees the latest write (strong-ish). When W + R ≤ N, a read can miss every up-to-date replica and return stale data — try W=1, R=1 and keep reading.',
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#q-note');

  const CX = 90, GAP = () => (640 - 140) / Math.max(1, N - 1);
  const repPos = i => ({ x: 70 + i * GAP(), y: 120 });

  function clamp() { N = Math.max(3, Math.min(6, N)); W = Math.max(1, Math.min(N, W)); R = Math.max(1, Math.min(N, R)); }

  function doWrite() {
    latest++;
    // the W fastest replicas receive the new version
    const idx = [...reps.keys()].sort(() => Math.random() - 0.5).slice(0, W);
    const got = new Set(idx);
    reps.forEach((r, i) => {
      packets.push({ fromX: CX, fromY: 40, i, t: 0, color: pal.accent, kind: 'write', ack: got.has(i) });
    });
    setTimeout(() => { got.forEach(i => { reps[i].ver = latest; reps[i].flash = 1; }); render(); }, 420);
    lastRead = null; render();
  }

  function doRead() {
    const idx = [...reps.keys()].sort(() => Math.random() - 0.5).slice(0, R);
    const queried = new Set(idx);
    reps.forEach((r, i) => { r.queried = queried.has(i) ? 1 : 0; });
    reps.forEach((r, i) => {
      if (queried.has(i)) packets.push({ fromX: CX, fromY: 250, i, t: 0, color: pal.blue, kind: 'read' });
    });
    const seen = Math.max(...idx.map(i => reps[i].ver));
    const fresh = seen === latest;
    lastRead = { fresh, ver: seen, queried };
    render();
  }

  $('#q-write').addEventListener('click', doWrite);
  $('#q-read').addEventListener('click', doRead);
  controls.querySelectorAll('.q-step button').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k, d = +b.dataset.d;
    if (k === 'N') { N += d; clamp(); initReps(); }
    else { ({ W: () => W += d, R: () => R += d })[k](); clamp(); }
    $('#q-N').textContent = N; $('#q-W').textContent = W; $('#q-R').textContent = R;
    lastRead = null; render();
  }));

  function render() {
    const overlap = W + R > N;
    const verdict = overlap
      ? `<b style="color:var(--green)">W + R = ${W} + ${R} = ${W + R} &gt; ${N}</b> → read set overlaps write set → <b>reads always fresh</b>.`
      : `<b style="color:var(--amber)">W + R = ${W} + ${R} = ${W + R} ≤ ${N}</b> → sets may not overlap → <b>reads can be stale</b>.`;
    let r = '';
    if (lastRead) r = ` · last read returned <b>v${lastRead.ver}</b> ${lastRead.fresh ? '<b style="color:var(--green)">✓ fresh</b>' : '<b style="color:var(--red)">✗ STALE</b>'}`;
    note.innerHTML = `Latest write <b>v${latest}</b> · ${verdict}${r}`;
  }

  function step(dt) {
    for (const p of packets) p.t += dt * 2.4;
    for (let i = packets.length - 1; i >= 0; i--) if (packets[i].t >= 1) packets.splice(i, 1);
    reps.forEach(r => { if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.6); });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    // coordinator
    roundRect(ctx, CX - 55, 20, 110, 40, 8); ctx.fillStyle = withAlpha(pal.accent, 0.14); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, '🪄 Coordinator', CX, 40, { color: pal.text, size: 11, weight: 700 });
    label(ctx, '✏️ write', 40, 250, { color: pal.accent, size: 11, weight: 700, align: 'left' });
    label(ctx, '🔍 read', 40, 268, { color: pal.blue, size: 11, weight: 700, align: 'left' });

    // replicas
    reps.forEach((rp, i) => {
      const { x, y } = repPos(i);
      const stale = rp.ver < latest;
      const q = rp.queried > 0;
      const base = stale ? pal.amber : pal.green;
      ctx.lineWidth = q ? 3 : 2;
      ctx.strokeStyle = q ? pal.blue : withAlpha(base, 0.8);
      roundRect(ctx, x - 34, y - 26, 68, 52, 9);
      ctx.fillStyle = withAlpha(base, 0.12 + rp.flash * 0.4); ctx.fill(); ctx.stroke();
      label(ctx, `R${i + 1}`, x, y - 9, { color: pal.text2, size: 10, weight: 700 });
      label(ctx, `v${rp.ver}`, x, y + 9, { color: stale ? pal.amber : pal.green, size: 15, weight: 800 });
    });
    // packets (coordinator → replica)
    for (const p of packets) {
      const { x, y } = repPos(p.i);
      const px = p.fromX + (x - p.fromX) * p.t, py = p.fromY + (y - p.fromY) * p.t;
      ctx.fillStyle = p.color; ctx.globalAlpha = p.kind === 'write' && !p.ack ? 0.35 : 1;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // legend
    label(ctx, '🟢 up-to-date   🟡 stale   🔵 queried by this read', 320, 282, { color: pal.text3, size: 10.5 });
  }

  render();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
