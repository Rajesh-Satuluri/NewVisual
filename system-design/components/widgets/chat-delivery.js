// ── Chat message delivery (live canvas sim) ─────────────────────────────────
// A chat system routes a message from sender to recipient through a server over
// a persistent connection (WebSocket). If the recipient is online it's pushed
// instantly; if offline it's stored and delivered when they reconnect. Delivery
// state advances sent → delivered → read. Toggle presence and watch both paths.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let bOnline = true;
  const packets = [];         // {ax,ay,bx,by,t,leg,onArrive,color}
  const queued = [];          // messages stored for offline B
  let sent = 0, delivered = 0, read = 0;
  let bFlash = 0;

  const AX = 90, SX = 320, BX = 550, Y = 150;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ch-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ch-send">💬 Alice sends</button>
        <button class="sd-btn" id="ch-read">👁 Bob reads</button>
        <label class="wg-switch"><input type="checkbox" id="ch-on" checked> Bob online</label>
      </div>`,
    caption: 'Online delivery is an instant push over Bob\'s live connection. Offline, the message is stored at the server and flushed the moment Bob reconnects — so no message is lost, only delayed.',
  });

  const ctx = fitCanvas(canvas, 640, 280);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ch-note');

  function hop(ax, ay, bx, by, color, onArrive) { packets.push({ ax, ay, bx, by, t: 0, color, onArrive }); }

  function send() {
    sent++;
    hop(AX + 40, Y, SX, Y, pal.accent, () => {
      if (bOnline) hop(SX, Y, BX - 40, Y, pal.green, () => { delivered++; bFlash = 1; });
      else queued.push(1);
    });
  }
  function flush() {
    while (queued.length) { queued.pop(); hop(SX, Y, BX - 40, Y, pal.green, () => { delivered++; bFlash = 1; }); }
  }
  $('#ch-send').addEventListener('click', send);
  $('#ch-read').addEventListener('click', () => { if (delivered > read) read = delivered; });
  $('#ch-on').addEventListener('change', e => { bOnline = e.target.checked; if (bOnline) flush(); });

  function step(dt) {
    for (const p of packets) { p.t += dt * 1.6; if (p.t >= 1 && p.onArrive) { const f = p.onArrive; p.onArrive = null; f(); } }
    for (let i = packets.length - 1; i >= 0; i--) if (packets[i].t >= 1) packets.splice(i, 1);
    if (bFlash > 0) bFlash = Math.max(0, bFlash - dt * 2);
  }

  function user(x, label1, online) {
    roundRect(ctx, x - 40, Y - 30, 80, 60, 10);
    ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke();
    label(ctx, label1, x, Y - 4, { color: pal.text, size: 13, weight: 800 });
    ctx.fillStyle = online ? pal.green : pal.text3; ctx.beginPath(); ctx.arc(x - 24, Y + 16, 5, 0, Math.PI * 2); ctx.fill();
    label(ctx, online ? 'online' : 'offline', x + 4, Y + 16, { color: online ? pal.green : pal.text3, size: 10, weight: 600 });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 280);
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(AX + 40, Y); ctx.lineTo(BX - 40, Y); ctx.stroke(); ctx.setLineDash([]);
    // server
    roundRect(ctx, SX - 46, Y - 26, 92, 52, 9); ctx.fillStyle = withAlpha(pal.blue, 0.12); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = pal.blue; ctx.stroke();
    label(ctx, '🖧 Server', SX, Y - 4, { color: pal.text, size: 12, weight: 700 });
    label(ctx, queued.length ? `${queued.length} queued` : 'ws relay', SX, Y + 13, { color: queued.length ? pal.amber : pal.text3, size: 10, weight: queued.length ? 700 : 400 });
    user(AX, '👩 Alice', true);
    // Bob with flash
    if (bFlash > 0) { ctx.globalAlpha = bFlash * 0.5; roundRect(ctx, BX - 44, Y - 34, 88, 68, 12); ctx.fillStyle = pal.green; ctx.fill(); ctx.globalAlpha = 1; }
    user(BX, '🧑 Bob', bOnline);
    // delivery states
    label(ctx, `sent ✓ ${sent}   delivered ✓✓ ${delivered}   read 👁 ${read}`, 320, 250, { color: pal.text3, size: 11 });
    for (const p of packets) {
      const x = p.ax + (p.bx - p.ax) * p.t, y = p.ay + (p.by - p.ay) * p.t;
      ctx.fillStyle = p.color; roundRect(ctx, x - 10, y - 7, 20, 14, 4); ctx.fill();
    }
    note.innerHTML = `Bob is <b style="color:var(--${bOnline ? 'green' : 'text3'})">${bOnline ? 'online' : 'offline'}</b> · sent <b>${sent}</b> · delivered <b style="color:var(--green)">${delivered}</b> · read <b style="color:var(--blue)">${read}</b>${queued.length ? ` · <b style="color:var(--amber)">${queued.length} stored for later</b>` : ''}`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
