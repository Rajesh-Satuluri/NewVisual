// ── Token-bucket rate limiter (live canvas sim) ─────────────────────────────
// Tokens drip into a bucket at a fixed refill rate up to a capacity. Each
// incoming request spends one token; when the bucket is empty, requests are
// rejected (HTTP 429). Watch a steady stream stay green, then a spike drain the
// bucket and start bouncing — the exact behaviour rate limiters are built for.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const CAP = 10;            // bucket capacity (tokens)
  let refill = 3;            // tokens per second
  let tokens = CAP;
  let mode = 'steady';       // steady | spike | paused
  const RATE = { steady: 4, spike: 14, paused: 0 };

  let allowed = 0, rejected = 0;
  const parts = [];          // request particles
  let spawnAcc = 0;

  const GATE_X = 320, LANE_Y = 150;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="tb-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="tb-send">Send request</button>
        <button class="sd-btn" id="tb-burst">Burst ×15</button>
        <span class="wg-seg" role="group" aria-label="Traffic">
          <button class="wg-seg-btn active" data-mode="steady">Steady</button>
          <button class="wg-seg-btn" data-mode="spike">Spike</button>
          <button class="wg-seg-btn" data-mode="paused">Pause</button>
        </span>
        <label class="wg-switch">refill
          <input type="range" id="tb-refill" min="1" max="8" step="1" value="3" style="width:90px">
          <b id="tb-refill-v" style="color:var(--text)">3/s</b>
        </label>
      </div>`,
    caption: 'Green = request spent a token and passed. Red = bucket was empty, request rejected (429). The bucket refills steadily, so short bursts are absorbed but sustained overload is shed.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#tb-note');

  function spawn(n = 1) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: 10, y: LANE_Y + (Math.random() * 40 - 20), vx: 150 + Math.random() * 40, state: 'travel', life: 1 });
    }
  }

  $('#tb-send').addEventListener('click', () => spawn(1));
  $('#tb-burst').addEventListener('click', () => spawn(15));
  $('#tb-refill').addEventListener('input', e => { refill = +e.target.value; $('#tb-refill-v').textContent = refill + '/s'; });
  controls.querySelectorAll('.wg-seg-btn').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    controls.querySelectorAll('.wg-seg-btn').forEach(x => x.classList.toggle('active', x === b));
  }));

  function step(dt) {
    // refill
    tokens = Math.min(CAP, tokens + refill * dt);
    // auto arrivals
    spawnAcc += RATE[mode] * dt;
    while (spawnAcc >= 1) { spawn(1); spawnAcc -= 1; }
    // advance particles
    for (const p of parts) {
      if (p.state === 'travel') {
        p.x += p.vx * dt;
        if (p.x >= GATE_X) {
          if (tokens >= 1) { tokens -= 1; p.state = 'allowed'; p.vy = 0; allowed++; }
          else { p.state = 'rejected'; p.vy = -90 - Math.random() * 40; rejected++; }
        }
      } else if (p.state === 'allowed') {
        p.x += p.vx * dt; p.life -= dt * 0.8;
      } else { // rejected
        p.x += 50 * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt * 0.9;
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0 || parts[i].x > 680) parts.splice(i, 1);
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    // lane
    ctx.strokeStyle = withAlpha(pal.border, 0.9);
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, LANE_Y); ctx.lineTo(GATE_X, LANE_Y); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'incoming requests', 70, LANE_Y - 42, { color: pal.text3, size: 11, align: 'left' });

    // bucket
    const bx = GATE_X, by = 70, bw = 120, bh = 160;
    const frac = tokens / CAP;
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fillStyle = withAlpha(pal.bg3, 0.6); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(pal.border, 1); ctx.stroke();
    // fill level
    const fh = (bh - 8) * frac;
    ctx.save(); roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 9); ctx.clip();
    const low = tokens < 1;
    ctx.fillStyle = withAlpha(low ? pal.red : pal.accent, 0.85);
    ctx.fillRect(bx + 4, by + bh - 4 - fh, bw - 8, fh);
    ctx.restore();
    label(ctx, '🪣 token bucket', bx + bw / 2, by - 16, { color: pal.text2, size: 12, weight: 700 });
    label(ctx, `${Math.floor(tokens)} / ${CAP}`, bx + bw / 2, by + bh / 2, { color: pal.text, size: 22, weight: 800 });
    label(ctx, `+${refill}/s`, bx + bw / 2, by + bh + 16, { color: pal.green, size: 11, weight: 700 });

    // served / rejected zones
    label(ctx, '✅ served', 560, 70, { color: pal.green, size: 12, weight: 700 });
    label(ctx, '⛔ 429 rejected', 560, 255, { color: pal.red, size: 12, weight: 700 });

    // particles
    for (const p of parts) {
      const col = p.state === 'rejected' ? pal.red : p.state === 'allowed' ? pal.green : pal.accent2;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const total = allowed + rejected;
    const rate = total ? Math.round(allowed / total * 100) : 100;
    note.innerHTML = `Tokens <b>${Math.floor(tokens)}/${CAP}</b> · refill <b>${refill}/s</b> · allowed <b style="color:var(--green)">${allowed}</b> · rejected <b style="color:var(--red)">${rejected}</b> · allow-rate <b>${rate}%</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });

  return () => { stopRaf(); stopPal(); };
}
