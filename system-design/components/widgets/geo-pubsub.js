// ── Nearby-friends geo pub/sub (live canvas sim) ────────────────────────────
// "Friends nearby" is a geospatial publish/subscribe problem: you subscribe to
// location updates only from friends inside a radius around you, and they stop
// streaming the moment they wander out. Watch friends roam; those inside the
// radius ping you with live positions, those outside go quiet. Drag the radius.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, withAlpha, label } from './_sim.js';

export function mount(container) {
  let radius = 110;
  const ME = { x: 320, y: 150 };
  const friends = [];
  let updates = 0, acc = 0;

  function addFriend() {
    friends.push({ x: 40 + Math.random() * 560, y: 30 + Math.random() * 240, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, ping: 0 });
  }
  for (let i = 0; i < 8; i++) addFriend();

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="gp-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="gp-add">＋ Add friend</button>
        <button class="sd-btn" id="gp-rm">－ Remove friend</button>
        <label class="wg-switch">radius
          <input type="range" id="gp-r" min="50" max="180" step="5" value="110" style="width:120px">
          <b id="gp-rv" style="color:var(--text)">110</b>
        </label>
      </div>`,
    caption: 'You only subscribe to friends within your radius, so a user with thousands of distant friends isn\'t streamed thousands of updates — the geo-index prunes to a local neighbourhood. As friends cross the boundary, subscriptions start and stop automatically.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#gp-note');

  $('#gp-add').addEventListener('click', addFriend);
  $('#gp-rm').addEventListener('click', () => friends.pop());
  $('#gp-r').addEventListener('input', e => { radius = +e.target.value; $('#gp-rv').textContent = radius; });

  function step(dt) {
    acc += dt;
    const tick = acc >= 0.5; if (tick) acc = 0;
    for (const f of friends) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < 20 || f.x > 620) f.vx *= -1;
      if (f.y < 20 || f.y > 280) f.vy *= -1;
      f.x = Math.max(20, Math.min(620, f.x)); f.y = Math.max(20, Math.min(280, f.y));
      if (Math.random() < 0.02) { f.vx += (Math.random() - 0.5) * 20; f.vy += (Math.random() - 0.5) * 20; }
      const inR = Math.hypot(f.x - ME.x, f.y - ME.y) <= radius;
      if (inR && tick) { f.ping = 1; updates++; }
      if (f.ping > 0) f.ping = Math.max(0, f.ping - dt * 1.6);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    // radius
    ctx.beginPath(); ctx.arc(ME.x, ME.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(pal.accent, 0.07); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.accent, 0.6); ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    let inCount = 0;
    for (const f of friends) {
      const inR = Math.hypot(f.x - ME.x, f.y - ME.y) <= radius;
      if (inR) inCount++;
      if (inR && f.ping > 0) {
        ctx.strokeStyle = withAlpha(pal.green, f.ping); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ME.x, ME.y); ctx.lineTo(f.x, f.y); ctx.stroke();
      }
      ctx.fillStyle = inR ? pal.green : withAlpha(pal.text3, 0.7);
      ctx.beginPath(); ctx.arc(f.x, f.y, inR ? 7 : 5, 0, Math.PI * 2); ctx.fill();
      if (inR && f.ping > 0.3) { ctx.strokeStyle = withAlpha(pal.green, f.ping); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 7 + (1 - f.ping) * 10, 0, Math.PI * 2); ctx.stroke(); }
    }
    // me
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(ME.x, ME.y, 10, 0, Math.PI * 2); ctx.fill();
    label(ctx, '🧍 you', ME.x, ME.y - 20, { color: pal.text, size: 11, weight: 800 });
    note.innerHTML = `friends <b>${friends.length}</b> · in radius <b style="color:var(--green)">${inCount}</b> (streaming) · out of radius <b>${friends.length - inCount}</b> (quiet) · updates received <b>${updates}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
