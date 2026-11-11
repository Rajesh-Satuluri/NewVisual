// ── News-feed fan-out: push vs pull (live canvas sim) ───────────────────────
// The central design decision for a feed. PUSH (fan-out on write) copies each
// post into every follower's inbox the moment it's posted — reads are instant,
// but a celebrity with millions of followers triggers millions of writes per
// post. PULL (fan-out on read) stores the post once and assembles each feed
// when it's opened — cheap writes, but every read fans out. Watch both, then
// flip the author to a celebrity and see push fall apart.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let mode = 'push';          // push | pull
  let celeb = false;
  let posts = 0, writes = 0, reads = 0;
  const packets = [];         // {ax,ay,bx,by,t,speed,color,onArrive}

  const AX = 150, AY = 150;   // author position
  const FOLLOWERS = [0, 1, 2, 3, 4, 5].map((_, i) => ({ x: 520, y: 40 + i * 44, flash: 0, has: false }));
  const followerCount = () => celeb ? 2_000_000 : 6;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ff-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ff-post">✍️ New post</button>
        <button class="sd-btn" id="ff-open">📲 Followers open app</button>
        <span class="wg-seg" role="group" aria-label="Model">
          <button class="wg-seg-btn active" data-mode="push">Push (fan-out on write)</button>
          <button class="wg-seg-btn" data-mode="pull">Pull (fan-out on read)</button>
        </span>
        <label class="wg-switch"><input type="checkbox" id="ff-celeb"> Celebrity author (2M followers)</label>
      </div>`,
    caption: 'Push makes reads free but writes expensive — the "celebrity problem". Pull makes writes free but reads expensive. Real systems blend them: push for normal users, pull for celebrities.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ff-note');

  function fly(bx, by, color, onArrive) {
    packets.push({ ax: AX, ay: AY, bx, by, t: 0, speed: 1.4 + Math.random() * 0.3, color, onArrive });
  }
  function flyFrom(ax, ay, color, onArrive) {
    packets.push({ ax, ay, bx: AX, by: AY, t: 0, speed: 1.5, color, onArrive });
  }

  function post() {
    posts++;
    if (mode === 'push') {
      writes += followerCount();
      FOLLOWERS.forEach(f => fly(f.x, f.y, pal.accent, () => { f.flash = 1; f.has = true; }));
    } else {
      writes += 1; // one write to the author's post store
      FOLLOWERS.forEach(f => f.has = false); // their inboxes are not updated
    }
    render();
  }
  function open() {
    if (mode === 'pull') {
      reads += followerCount();
      FOLLOWERS.forEach(f => flyFrom(f.x, f.y, pal.amber, () => {
        fly(f.x, f.y, pal.green, () => { f.flash = 1; f.has = true; });
      }));
    } else {
      reads += FOLLOWERS.length; // cheap: read own inbox
      FOLLOWERS.forEach(f => { if (f.has) f.flash = 1; });
    }
    render();
  }

  $('#ff-post').addEventListener('click', post);
  $('#ff-open').addEventListener('click', open);
  $('#ff-celeb').addEventListener('change', e => { celeb = e.target.checked; render(); });
  controls.querySelectorAll('.wg-seg-btn').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    controls.querySelectorAll('.wg-seg-btn').forEach(x => x.classList.toggle('active', x === b));
    FOLLOWERS.forEach(f => f.has = false);
    render();
  }));

  function fnum(n) { return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : '' + n; }

  function render() {
    const fc = followerCount();
    const costLabel = mode === 'push'
      ? `Push → <b>${fnum(fc)}</b> inbox writes per post, reads are O(1).`
      : `Pull → <b>1</b> write per post, but <b>${fnum(fc)}</b> reads when the feed is opened.`;
    const warn = (mode === 'push' && celeb) ? ' <b style="color:var(--red)">⚠ write amplification explodes for celebrities.</b>'
      : (mode === 'pull' && celeb) ? ' <b style="color:var(--green)">✓ pull keeps a celebrity\'s posts cheap to publish.</b>' : '';
    note.innerHTML = `Model <b>${mode === 'push' ? 'PUSH' : 'PULL'}</b> · followers <b>${fnum(fc)}</b> · ${costLabel}${warn}`;
  }

  function step(dt) {
    for (const p of packets) {
      p.t += p.speed * dt;
      if (p.t >= 1) { p.t = 1; if (p.onArrive) { const f = p.onArrive; p.onArrive = null; f(); } }
    }
    for (let i = packets.length - 1; i >= 0; i--) if (packets[i].t >= 1) packets.splice(i, 1);
    FOLLOWERS.forEach(f => { if (f.flash > 0) f.flash = Math.max(0, f.flash - dt * 2); });
  }

  function node(x, y, w, h, stroke, fillA, text, textCol) {
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = withAlpha(stroke, fillA); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
    if (text) label(ctx, text, x + w / 2, y + h / 2, { color: textCol || pal.text, size: 11, weight: 700 });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    // links author→followers
    FOLLOWERS.forEach(f => {
      ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(AX + 55, AY); ctx.lineTo(f.x, f.y + 15); ctx.stroke(); ctx.setLineDash([]);
    });
    // author
    node(AX - 55, AY - 24, 110, 48, pal.accent, 0.14, '', null);
    label(ctx, '✍️ Author', AX, AY - 6, { color: pal.text, size: 13, weight: 800 });
    label(ctx, mode === 'push' ? 'writes to inboxes' : 'posts stored once', AX, AY + 11, { color: pal.text3, size: 10 });
    // followers
    FOLLOWERS.forEach((f, i) => {
      const lit = f.flash > 0;
      node(f.x, f.y, 100, 30, lit ? pal.green : pal.text3, lit ? 0.22 + f.flash * 0.3 : 0.06, '', null);
      label(ctx, `📥 Follower ${i + 1}`, f.x + 50, f.y + 15, { color: f.has ? pal.text : pal.text3, size: 10.5, weight: 600 });
    });
    label(ctx, celeb ? '…and ~2,000,000 more' : 'followers', 570, 40 + 6 * 44 + 2, { color: pal.text3, size: 10, align: 'center' });
    // packets
    for (const p of packets) {
      const x = p.ax + (p.bx - p.ax) * p.t, y = p.ay + (p.by - p.ay) * p.t;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  render();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
