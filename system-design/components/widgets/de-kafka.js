// ── Kafka architecture (live canvas sim) ────────────────────────────────────
// A topic split into partitions, each an ordered append-only log. Producers
// append keyed messages (the key picks the partition); a consumer group shares
// the partitions out, each consumer advancing its offset. Add a consumer to
// trigger a rebalance.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const P = 3;                 // partitions
const KEYS = ['user:A', 'user:B', 'user:C', 'user:D', 'user:E'];
const CCOL = ['blue', 'green', 'accent2'];

export function mount(container) {
  const parts = Array.from({ length: P }, () => ({ msgs: [], offset: 0 }));  // msgs: {id}, offset = next to read
  const flying = [];         // {part, p, id}
  let consumers = 2, idSeq = 0, produceAcc = 0, consumeAcc = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="kf-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="kf-prod">📤 Produce</button>
        <button class="sd-btn" id="kf-add">＋ Add consumer</button>
        <button class="sd-btn" id="kf-rm">－ Remove consumer</button>
      </div>`,
    caption: 'A message’s key hashes to a partition, so events for one key stay ordered in one log. A consumer group splits partitions across members (one partition → one consumer), so adding consumers scales reads up to the partition count. Offsets are client-tracked, so the log persists and can be replayed.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#kf-note');

  function produce() {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    const part = key.charCodeAt(5) % P;                // stable hash of key → partition
    flying.push({ part, p: 0, id: ++idSeq, key });
  }
  $('#kf-prod').addEventListener('click', produce);
  $('#kf-add').addEventListener('click', () => { consumers = Math.min(P, consumers + 1); });
  $('#kf-rm').addEventListener('click', () => { consumers = Math.max(1, consumers - 1); });

  function assigned(part) { return part % consumers; }

  function step(dt) {
    produceAcc += dt; while (produceAcc >= 0.7) { produceAcc -= 0.7; produce(); }
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]; f.p += dt * 1.4;
      if (f.p >= 1) { parts[f.part].msgs.push({ id: f.id, key: f.key }); flying.splice(i, 1); }
    }
    // consumers advance offsets
    consumeAcc += dt;
    while (consumeAcc >= 0.5) {
      consumeAcc -= 0.5;
      for (let pi = 0; pi < P; pi++) if (parts[pi].offset < parts[pi].msgs.length) parts[pi].offset++;
    }
  }

  const PX = 110, PW = 420, pY = i => 66 + i * 64, MW = 26;

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // producer
    roundRect(ctx, 24, 120, 64, 60, 9); ctx.fillStyle = withAlpha(pal.amber, 0.12); ctx.fill();
    ctx.strokeStyle = pal.amber; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, '📤', 56, 142, { color: pal.text, size: 15 }); label(ctx, 'producer', 56, 164, { color: pal.text3, size: 9, weight: 600 });

    // partitions
    for (let pi = 0; pi < P; pi++) {
      const y = pY(pi);
      label(ctx, `P${pi}`, PX - 22, y, { color: pal.text2, size: 11, weight: 800, align: 'center' });
      roundRect(ctx, PX, y - 15, PW, 30, 6); ctx.fillStyle = withAlpha(pal.bg3, 0.4); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.lineWidth = 1; ctx.stroke();
      const part = parts[pi];
      const vis = part.msgs.slice(-Math.floor(PW / MW));
      const startIdx = part.msgs.length - vis.length;
      vis.forEach((m, k) => {
        const gi = startIdx + k;
        const x = PX + 4 + k * MW;
        const consumed = gi < part.offset;
        roundRect(ctx, x, y - 11, MW - 4, 22, 3);
        ctx.fillStyle = consumed ? withAlpha(pal.green, 0.35) : withAlpha(pal.amber, 0.5); ctx.fill();
        if (!consumed) { ctx.strokeStyle = pal.amber; ctx.lineWidth = 1; ctx.stroke(); }
        label(ctx, `${m.id}`, x + (MW - 4) / 2, y, { color: pal.text2, size: 8, weight: 700 });
      });
      // assignment line to consumer
      const ci = assigned(pi);
      ctx.strokeStyle = withAlpha(pal[CCOL[ci]], 0.6); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(PX + PW, y); ctx.lineTo(560, 70 + ci * 62); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `off ${part.offset}`, PX + PW + 2, y - 20, { color: pal.text3, size: 8, weight: 600, align: 'left' });
    }

    // flying messages
    for (const f of flying) {
      const y = pY(f.part); const x = 88 + (PX + 4 - 88) * f.p;
      ctx.fillStyle = pal.amber; roundRect(ctx, x - 9, y - 8, 18, 16, 3); ctx.fill();
    }

    // consumers (group)
    for (let ci = 0; ci < consumers; ci++) {
      const y = 70 + ci * 62;
      roundRect(ctx, 560, y - 18, 80, 40, 8);
      ctx.fillStyle = withAlpha(pal[CCOL[ci]], 0.14); ctx.fill();
      ctx.strokeStyle = pal[CCOL[ci]]; ctx.lineWidth = 1.6; ctx.stroke();
      label(ctx, `C${ci}`, 600, y - 4, { color: pal.text, size: 11, weight: 800 });
      const mine = []; for (let pi = 0; pi < P; pi++) if (assigned(pi) === ci) mine.push('P' + pi);
      label(ctx, mine.join(' '), 600, y + 10, { color: pal.text3, size: 8, weight: 600 });
    }
    label(ctx, '👥 consumer group', 600, 36, { color: pal.text2, size: 10, weight: 700 });

    const lag = parts.reduce((s, p) => s + (p.msgs.length - p.offset), 0);
    note.innerHTML = `partitions <b>${P}</b> · consumers <b>${consumers}</b> · unconsumed lag <b style="color:var(--amber)">${lag}</b> · <span style="color:var(--text3)">order held within each partition</span>`;
  }

  for (let i = 0; i < 5; i++) produce();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
