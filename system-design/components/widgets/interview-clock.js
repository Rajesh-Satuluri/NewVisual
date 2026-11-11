// ── Interview time-budget clock (interactive sim) ───────────────────────────
// A 45-minute system-design interview lives or dies on time management. This
// walks a playhead through the phases with the minute budget each deserves, so
// you internalise the pacing: don't spend 20 minutes on requirements and leave
// none for the deep dive. Press play and rehearse the clock.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const PHASES = [
    { name: 'Requirements', mins: 5, tip: 'Functional + non-functional. Pin scale, read/write ratio, SLAs. Agree scope out loud.' },
    { name: 'Estimation', mins: 5, tip: 'Back-of-envelope: QPS, storage, bandwidth. Sets up every later decision.' },
    { name: 'API + data model', mins: 5, tip: 'Core endpoints and the main entities/tables. Keep it tight.' },
    { name: 'High-level design', mins: 10, tip: 'Boxes and arrows: clients → LB → services → storage/cache/queue. The skeleton.' },
    { name: 'Deep dive', mins: 15, tip: 'Where senior signal lives. Pick 2–3 hard parts and go deep on trade-offs.' },
    { name: 'Wrap-up', mins: 5, tip: 'Bottlenecks, failure modes, scaling, what you\'d do with more time.' },
  ];
  const TOTAL = PHASES.reduce((s, p) => s + p.mins, 0);
  const SPEED = 2.2;          // interview-minutes per real second
  let t = 0, playing = true;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ic-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ic-play">⏸ Pause</button>
        <button class="sd-btn" id="ic-reset">↺ Restart</button>
        <span class="wg-seg" role="group" aria-label="Jump to phase" id="ic-jumps"></span>
      </div>`,
    caption: 'Budget guide for a 45-minute round: the deep dive should get the most time and requirements the least. The single most common failure is over-investing early and running out of clock before the part that actually differentiates seniors.',
  });

  const ctx = fitCanvas(canvas, 640, 260);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ic-note');

  // phase jump buttons
  $('#ic-jumps').innerHTML = PHASES.map((p, i) => `<button class="wg-seg-btn" data-i="${i}">${p.name.split(' ')[0]}</button>`).join('');
  let starts = []; { let a = 0; PHASES.forEach(p => { starts.push(a); a += p.mins; }); }
  $('#ic-jumps').querySelectorAll('.wg-seg-btn').forEach(b => b.addEventListener('click', () => { t = starts[+b.dataset.i]; }));
  $('#ic-play').addEventListener('click', (e) => { playing = !playing; e.target.textContent = playing ? '⏸ Pause' : '▶ Play'; });
  $('#ic-reset').addEventListener('click', () => { t = 0; });

  function curPhase() { let a = 0; for (let i = 0; i < PHASES.length; i++) { if (t < a + PHASES[i].mins) return { i, into: t - a }; a += PHASES[i].mins; } return { i: PHASES.length - 1, into: PHASES[PHASES.length - 1].mins }; }

  function step(dt) { if (playing) { t += dt * SPEED; if (t >= TOTAL) { t = TOTAL; playing = false; $('#ic-play').textContent = '▶ Play'; } } }

  function draw() {
    ctx.clearRect(0, 0, 640, 260);
    const { i: ci } = curPhase();
    // timeline bar
    const x0 = 20, w = 600, y = 50, h = 46;
    let x = x0;
    PHASES.forEach((p, i) => {
      const pw = (p.mins / TOTAL) * w, on = i === ci, done = i < ci;
      roundRect(ctx, x + 1, y, pw - 2, h, 6);
      ctx.fillStyle = on ? withAlpha(pal.accent, 0.3) : done ? withAlpha(pal.green, 0.14) : withAlpha(pal.border, 0.3); ctx.fill();
      if (on) { ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke(); }
      label(ctx, `${p.mins}m`, x + pw / 2, y + 16, { color: on ? pal.text : pal.text2, size: 12, weight: 800 });
      label(ctx, p.name.split(' ')[0], x + pw / 2, y + 33, { color: on ? pal.text : pal.text3, size: 9.5 });
      x += pw;
    });
    // playhead
    const px = x0 + (t / TOTAL) * w;
    ctx.strokeStyle = pal.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y - 8); ctx.lineTo(px, y + h + 8); ctx.stroke();
    ctx.fillStyle = pal.red; ctx.beginPath(); ctx.moveTo(px, y - 8); ctx.lineTo(px - 5, y - 16); ctx.lineTo(px + 5, y - 16); ctx.closePath(); ctx.fill();
    // minute readout
    label(ctx, `${Math.floor(t)}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')} / ${TOTAL}:00`, 320, 20, { color: pal.text2, size: 13, weight: 800 });
    // current phase card
    const p = PHASES[ci];
    roundRect(ctx, 20, 130, 600, 100, 12); ctx.fillStyle = withAlpha(pal.accent, 0.06); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = withAlpha(pal.accent, 0.3); ctx.stroke();
    label(ctx, `▶ ${p.name}`, 36, 154, { color: pal.accent, size: 16, weight: 800, align: 'left' });
    label(ctx, `${p.mins} min`, 604, 154, { color: pal.text3, size: 12, align: 'right' });
    // wrap tip across lines
    const words = p.tip.split(' '); let line = '', ly = 182;
    ctx.font = '13px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = pal.text2;
    for (const wd of words) { if (ctx.measureText(line + wd).width > 560) { ctx.fillText(line, 36, ly); line = wd + ' '; ly += 20; } else line += wd + ' '; }
    ctx.fillText(line, 36, ly);
    note.innerHTML = `phase <b style="color:var(--accent)">${p.name}</b> · ${Math.floor(t)} of ${TOTAL} min elapsed · deep dive gets the most time (<b>15m</b>), requirements the least (<b>5m</b>)`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
