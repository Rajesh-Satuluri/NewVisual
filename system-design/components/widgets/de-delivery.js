// ── Delivery guarantees (live canvas sim) ───────────────────────────────────
// Messages cross an unreliable channel from producer to sink. At-most-once never
// retries (may lose); at-least-once retries (may duplicate); exactly-once is
// at-least-once plus an idempotent sink that dedupes re-deliveries. Switch mode
// and watch the delivered / lost / duplicated tallies.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let mode = 'atleast';       // atmost | atleast | exactly
  let seq = 0, spawnAcc = 0;
  let delivered = 0, lost = 0, dup = 0, deduped = 0;
  const seen = new Set();
  const msgs = [];            // {id, x, y, fate, kind}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="dv-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn" id="dv-most">① At-most-once</button>
        <button class="sd-btn sd-btn-primary" id="dv-least">② At-least-once</button>
        <button class="sd-btn" id="dv-exact">③ Exactly-once</button>
      </div>`,
    caption: 'The hazard is a lost ack: retry and you risk a duplicate, don’t and you risk a loss. At-most-once drops some; at-least-once redelivers some as duplicates; exactly-once keeps at-least-once delivery but an idempotent sink dedupes the redeliveries — no loss, no duplicates.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#dv-note');

  const PX = 70, SX = 560, Y = 150;

  function reset() { delivered = lost = dup = deduped = 0; seen.clear(); msgs.length = 0; seq = 0; }
  $('#dv-most').addEventListener('click', () => { mode = 'atmost'; reset(); });
  $('#dv-least').addEventListener('click', () => { mode = 'atleast'; reset(); });
  $('#dv-exact').addEventListener('click', () => { mode = 'exactly'; reset(); });

  function spawn() {
    const id = ++seq;
    let fate = 'ok';
    const r = Math.random();
    if (mode === 'atmost') { if (r < 0.2) fate = 'lost'; }
    else { if (r < 0.25) fate = 'dup'; }        // ack lost → will redeliver
    msgs.push({ id, x: PX, fate, kind: 'normal', loseAt: 280 + Math.random() * 60 });
  }

  function arrive(m) {
    if (m.kind === 'retry') {
      // a redelivery of an already-seen id
      if (mode === 'exactly') deduped++;         // idempotent sink drops it
      else dup++;                                 // at-least-once applies it again
      return;
    }
    // normal first arrival
    delivered++; seen.add(m.id);
    if (m.fate === 'dup') msgs.push({ id: m.id, x: PX, fate: 'ok', kind: 'retry', loseAt: 9999 });
  }

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.7) { spawnAcc -= 0.7; spawn(); }
    const sp = 185;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]; m.x += sp * dt;
      if (m.fate === 'lost' && m.kind === 'normal' && m.x >= m.loseAt) { lost++; msgs.splice(i, 1); continue; }
      if (m.x >= SX - 44) { arrive(m); msgs.splice(i, 1); }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // producer + sink
    roundRect(ctx, PX - 46, Y - 26, 80, 52, 9); ctx.fillStyle = withAlpha(pal.amber, 0.12); ctx.fill();
    ctx.strokeStyle = pal.amber; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '📤 producer', PX - 6, Y, { color: pal.text, size: 10, weight: 700 });

    const sinkCol = mode === 'exactly' ? pal.green : pal.blue;
    roundRect(ctx, SX - 44, Y - 30, 96, 60, 10); ctx.fillStyle = withAlpha(sinkCol, 0.12); ctx.fill();
    ctx.strokeStyle = sinkCol; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, '🎯 sink', SX + 4, Y - 8, { color: pal.text, size: 11, weight: 800 });
    label(ctx, mode === 'exactly' ? 'idempotent' : 'plain', SX + 4, Y + 10, { color: pal.text3, size: 9, weight: 600 });

    // channel
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX + 34, Y); ctx.lineTo(SX - 44, Y); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, '⚠️ unreliable channel (acks can be lost)', 330, Y - 56, { color: pal.text3, size: 10, weight: 600 });

    // messages
    for (const m of msgs) {
      const retry = m.kind === 'retry';
      const col = m.fate === 'lost' ? pal.red : retry ? pal.amber : pal.accent;
      roundRect(ctx, m.x - 10, Y - 8 + (retry ? 16 : 0), 20, 15, 3);
      ctx.fillStyle = withAlpha(col, 0.85); ctx.fill();
      label(ctx, `${m.id}`, m.x, Y + (retry ? 16 : 0), { color: '#fff', size: 9, weight: 800 });
      if (retry) label(ctx, '↻ dup', m.x, Y + 30, { color: pal.amber, size: 8, weight: 700 });
    }

    const MODES = { atmost: 'At-most-once', atleast: 'At-least-once', exactly: 'Exactly-once' };
    note.innerHTML = `<b style="color:var(--accent)">${MODES[mode]}</b> · delivered <b style="color:var(--green)">${delivered}</b> · lost <b style="color:var(--red)">${lost}</b> · duplicated <b style="color:var(--amber)">${dup}</b>${mode === 'exactly' ? ` · deduped <b style="color:var(--green)">${deduped}</b>` : ''}`;
  }

  spawn(); spawn();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
