// ── Adaptive bitrate streaming (live canvas sim) ────────────────────────────
// A video player downloads small segments and continuously picks the highest
// quality rendition the measured bandwidth can sustain, while keeping a buffer
// to ride out dips. Drop the network and watch the player step down the ladder
// (and rebuffer if the buffer empties) rather than freeze on one fixed quality.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const LADDER = [
    { name: '4K', kbps: 16000 }, { name: '1080p', kbps: 8000 }, { name: '720p', kbps: 5000 },
    { name: '480p', kbps: 2500 }, { name: '360p', kbps: 1000 }, { name: '240p', kbps: 400 },
  ];
  let bw = 8000;              // measured bandwidth kbps
  let auto = true;
  let buffer = 8;            // seconds buffered
  let cur = 1;              // index into LADDER
  let stalls = 0, switches = 0, stalling = false;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ab-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ab-drop">📉 Network drop</button>
        <button class="sd-btn" id="ab-boost">📈 Network recover</button>
        <label class="wg-switch"><input type="checkbox" id="ab-auto" checked> auto-fluctuate</label>
        <label class="wg-switch">bandwidth
          <input type="range" id="ab-bw" min="300" max="18000" step="100" value="8000" style="width:120px">
        </label>
      </div>`,
    caption: 'The player measures throughput and chooses the top rendition that fits, keeping a buffer as a shock absorber. If bandwidth falls below the current bitrate and the buffer drains to zero, playback stalls — so the player steps down early to avoid it.',
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ab-note');
  const bwEl = $('#ab-bw');

  $('#ab-drop').addEventListener('click', () => { bw = Math.max(300, bw * 0.35); bwEl.value = Math.round(bw); });
  $('#ab-boost').addEventListener('click', () => { bw = Math.min(18000, bw * 2.2); bwEl.value = Math.round(bw); });
  $('#ab-auto').addEventListener('change', e => auto = e.target.checked);
  bwEl.addEventListener('input', e => { bw = +e.target.value; });

  function chooseRendition() {
    // highest rendition whose bitrate ≤ 0.9*bandwidth (headroom)
    let idx = LADDER.length - 1;
    for (let i = 0; i < LADDER.length; i++) { if (LADDER[i].kbps <= bw * 0.9) { idx = i; break; } }
    if (idx !== cur) { cur = idx; switches++; }
  }

  function step(dt) {
    if (auto) { bw += (Math.random() - 0.48) * 600; bw = Math.max(300, Math.min(18000, bw)); bwEl.value = Math.round(bw); }
    chooseRendition();
    // buffer dynamics: fill rate depends on bandwidth vs current bitrate
    const need = LADDER[cur].kbps;
    const fill = (bw / need) - 1;          // >0 fills, <0 drains
    buffer += fill * dt * 2.2;
    buffer = Math.max(0, Math.min(12, buffer));
    stalling = buffer <= 0.05 && bw < need;
    if (stalling) { if (!step._was) { stalls++; } }
    step._was = stalling;
    if (!stalling) buffer = Math.max(buffer, 0.1 + buffer); // consume while playing handled by fill
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    // player screen
    roundRect(ctx, 30, 30, 300, 170, 12);
    ctx.fillStyle = withAlpha(stalling ? pal.red : pal.accent, 0.1); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(stalling ? pal.red : pal.accent, 0.7); ctx.stroke();
    label(ctx, stalling ? '⏳ rebuffering…' : '▶ playing', 180, 70, { color: stalling ? pal.red : pal.text2, size: 13, weight: 700 });
    label(ctx, LADDER[cur].name, 180, 120, { color: pal.text, size: 40, weight: 800 });
    label(ctx, `${(LADDER[cur].kbps / 1000).toFixed(1)} Mbps rendition`, 180, 160, { color: pal.text3, size: 11 });
    // buffer bar
    label(ctx, 'buffer', 30, 220, { color: pal.text3, size: 10, align: 'left' });
    roundRect(ctx, 30, 228, 300, 14, 7); ctx.fillStyle = withAlpha(pal.border, 0.6); ctx.fill();
    const bf = buffer / 12; const bc = buffer < 2 ? pal.red : buffer < 5 ? pal.amber : pal.green;
    roundRect(ctx, 30, 228, 300 * bf, 14, 7); ctx.fillStyle = bc; ctx.fill();
    label(ctx, `${buffer.toFixed(1)}s`, 340, 235, { color: pal.text2, size: 10, align: 'left' });
    // bandwidth gauge
    label(ctx, 'measured bandwidth', 400, 44, { color: pal.text3, size: 10, align: 'left' });
    label(ctx, `${(bw / 1000).toFixed(1)} Mbps`, 400, 66, { color: pal.blue, size: 20, weight: 800, align: 'left' });
    // ladder
    LADDER.forEach((r, i) => {
      const y = 90 + i * 30, on = i === cur, fits = r.kbps <= bw * 0.9;
      roundRect(ctx, 400, y, 210, 24, 6);
      ctx.fillStyle = on ? withAlpha(pal.accent, 0.3) : withAlpha(fits ? pal.green : pal.text3, 0.08); ctx.fill();
      if (on) { ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke(); }
      label(ctx, r.name, 412, y + 12, { color: on ? pal.text : pal.text2, size: 11, weight: on ? 800 : 600, align: 'left' });
      label(ctx, `${(r.kbps / 1000).toFixed(1)} Mbps ${fits ? '✓' : '✗'}`, 602, y + 12, { color: fits ? pal.green : pal.text3, size: 10, align: 'right' });
    });
    note.innerHTML = `now playing <b>${LADDER[cur].name}</b> · bandwidth <b style="color:var(--blue)">${(bw / 1000).toFixed(1)} Mbps</b> · buffer <b>${buffer.toFixed(1)}s</b> · quality switches <b>${switches}</b> · stalls <b style="color:var(--red)">${stalls}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
