// ── IoT analytics platform (live canvas sim) ────────────────────────────────
// A swarm of devices streams readings through a gateway into a time-series
// store, which downsamples into a rollup pyramid (raw → 1-min → 1-hour →
// 1-day). Readings over a threshold fire alerts. Watch volume collapse as data
// rolls up to coarser, cheaper resolutions.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const devices = Array.from({ length: 12 }, (_, i) => ({ x: 40 + (i % 3) * 32, y: 60 + Math.floor(i / 3) * 48, t: Math.random() }));
  const reads = [];
  let spawnAcc = 0, raw = 0, mins = 0, hrs = 0, days = 0, alerts = 0, flashT = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="io-note"></div>
      <div class="wg-btnrow"><button class="sd-btn sd-btn-primary" id="io-spike">⚠️ Spike a device</button></div>`,
    caption: 'Millions of devices make full-resolution storage unaffordable, so the platform keeps raw data briefly and rolls it up into 1-min, 1-hour, and 1-day aggregates — each far smaller. Queries read the coarsest resolution that answers them; a streaming path alerts on threshold breaches in real time.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#io-note');

  const GWX = 210, STX = 320;

  function emit(d, high) { reads.push({ x: d.x, y: d.y, p: 0, high }); }
  $('#io-spike').addEventListener('click', () => { emit(devices[Math.floor(Math.random() * devices.length)], true); });

  function step(dt) {
    for (const d of devices) { d.t += dt; if (d.t > 0.6 + Math.random() * 0.4) { d.t = 0; emit(d, Math.random() < 0.05); } }
    for (let i = reads.length - 1; i >= 0; i--) {
      const r = reads[i]; r.p += dt * 1.3;
      if (r.p >= 1) {
        raw++;
        if (r.high) { alerts++; flashT = 0.5; }
        if (raw % 8 === 0) mins++;
        if (mins > 0 && mins % 6 === 0 && raw % 8 === 0) hrs++;
        if (hrs > 0 && hrs % 4 === 0 && mins % 6 === 0 && raw % 8 === 0) days++;
        reads.splice(i, 1);
      }
    }
    if (flashT > 0) flashT -= dt;
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, '📡 devices', 72, 30, { color: pal.text2, size: 11, weight: 800 });
    for (const d of devices) {
      const pulse = 0.5 + 0.5 * Math.sin(d.t * 8);
      ctx.fillStyle = withAlpha(pal.blue, 0.4 + pulse * 0.4);
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    // gateway + store
    roundRect(ctx, GWX - 24, 120, 48, 56, 8); ctx.fillStyle = withAlpha(pal.amber, 0.12); ctx.fill();
    ctx.strokeStyle = pal.amber; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, '📶', GWX, 140, { color: pal.text, size: 14 }); label(ctx, 'gateway', GWX, 162, { color: pal.text3, size: 8, weight: 600 });
    roundRect(ctx, STX - 24, 120, 50, 56, 8); ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, '🕒', STX + 1, 140, { color: pal.text, size: 14 }); label(ctx, 'TS store', STX + 1, 162, { color: pal.text3, size: 8, weight: 600 });

    // reading particles → funnel toward gateway then store
    for (const r of reads) {
      const midx = GWX, midy = 148;
      let x, y;
      if (r.p < 0.5) { const q = r.p / 0.5; x = r.x + (midx - r.x) * q; y = r.y + (midy - r.y) * q; }
      else { const q = (r.p - 0.5) / 0.5; x = midx + (STX - midx) * q; y = midy; }
      ctx.fillStyle = r.high ? pal.red : pal.blue; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }

    // rollup pyramid
    label(ctx, '⬇️ downsampling rollup pyramid', 510, 30, { color: pal.text2, size: 10, weight: 800 });
    const levels = [
      { n: 'raw', c: raw, w: 240, tone: 'red', ret: 'days' },
      { n: '1-min', c: mins, w: 180, tone: 'amber', ret: 'weeks' },
      { n: '1-hour', c: hrs, w: 120, tone: 'blue', ret: 'months' },
      { n: '1-day', c: days, w: 70, tone: 'green', ret: 'years' },
    ];
    levels.forEach((lv, i) => {
      const y = 70 + i * 44, cx = 510;
      roundRect(ctx, cx - lv.w / 2, y, lv.w, 30, 5);
      ctx.fillStyle = withAlpha(pal[lv.tone], 0.3); ctx.fill(); ctx.strokeStyle = pal[lv.tone]; ctx.lineWidth = 1.2; ctx.stroke();
      label(ctx, `${lv.n}: ${lv.c}`, cx, y + 11, { color: pal.text, size: 10, weight: 700 });
      label(ctx, `kept ${lv.ret}`, cx, y + 23, { color: pal.text3, size: 7.5, weight: 600 });
    });

    // alert banner
    if (flashT > 0) { roundRect(ctx, 400, 250, 220, 24, 6); ctx.fillStyle = withAlpha(pal.red, 0.25); ctx.fill(); ctx.strokeStyle = pal.red; ctx.lineWidth = 1.4; ctx.stroke(); label(ctx, '🚨 threshold breach — alert fired', 510, 262, { color: pal.red, size: 10, weight: 800 }); }

    note.innerHTML = `raw readings <b style="color:var(--red)">${raw}</b> → 1-min <b style="color:var(--amber)">${mins}</b> → 1-hr <b style="color:var(--blue)">${hrs}</b> → 1-day <b style="color:var(--green)">${days}</b> · alerts <b style="color:var(--red)">${alerts}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
