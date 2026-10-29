// ── Email delivery pipeline (live canvas sim) ───────────────────────────────
// Outbound email is a queue problem: a submitted message enters an outbound
// queue, a worker attempts delivery to the recipient's mail server, and the
// outcome is delivered, a transient failure (requeue and retry with backoff),
// or a hard bounce (give up). Send mail and watch the queue drain through those
// three outcomes.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const queue = [];           // {id, attempts}
  const flying = [];          // {t, outcome, y0}
  let delivered = 0, bounced = 0, retries = 0, idSeq = 1;
  let workAcc = 0;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="em-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="em-send">✉️ Send email</button>
        <button class="sd-btn" id="em-burst">Burst ×8</button>
      </div>`,
    caption: 'Submission is decoupled from delivery by a queue, so a slow or flaky recipient never blocks the sender. Transient failures retry with backoff; only a hard bounce is given up on — the reliability model every mail system uses.',
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#em-note');

  function enqueue(n = 1) { for (let i = 0; i < n; i++) queue.push({ id: idSeq++, attempts: 0 }); }
  $('#em-send').addEventListener('click', () => enqueue(1));
  $('#em-burst').addEventListener('click', () => enqueue(8));

  function attempt() {
    const m = queue.shift(); if (!m) return;
    m.attempts++;
    const r = Math.random();
    let outcome;
    if (r < 0.55) outcome = 'delivered';
    else if (m.attempts >= 3) outcome = 'bounced';           // give up after retries
    else outcome = 'retry';
    flying.push({ t: 0, outcome, m });
    if (outcome === 'delivered') delivered++;
    else if (outcome === 'bounced') bounced++;
    else { retries++; }
  }

  function step(dt) {
    workAcc += dt;
    while (workAcc >= 0.7) { workAcc -= 0.7; attempt(); }        // worker cadence
    for (const f of flying) {
      f.t += dt * 1.3;
      if (f.t >= 1 && !f.done) { f.done = true; if (f.outcome === 'retry') queue.push(f.m); }
    }
    for (let i = flying.length - 1; i >= 0; i--) if (flying[i].t >= 1.4) flying.splice(i, 1);
  }

  const QX = 60, WX = 300, MX = 540, Y = 150;

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    // queue box
    roundRect(ctx, QX - 40, 70, 120, 150, 12); ctx.fillStyle = withAlpha(pal.amber, 0.08); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(pal.amber, 0.7); ctx.stroke();
    label(ctx, '📥 outbound queue', QX + 20, 58, { color: pal.text2, size: 11, weight: 700 });
    queue.slice(0, 7).forEach((m, i) => {
      roundRect(ctx, QX - 30, 200 - i * 22, 100, 18, 4); ctx.fillStyle = withAlpha(pal.amber, 0.25); ctx.fill();
      label(ctx, `msg#${m.id}${m.attempts ? ` · try ${m.attempts + 1}` : ''}`, QX + 20, 209 - i * 22, { color: pal.text, size: 10 });
    });
    if (queue.length > 7) label(ctx, `+${queue.length - 7} more`, QX + 20, 70, { color: pal.text3, size: 10 });
    // worker
    roundRect(ctx, WX - 45, Y - 26, 90, 52, 9); ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke();
    label(ctx, '⚙️ MTA worker', WX, Y, { color: pal.text, size: 11, weight: 700 });
    // recipient
    roundRect(ctx, MX - 40, Y - 26, 92, 52, 9); ctx.fillStyle = withAlpha(pal.green, 0.1); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(pal.green, 0.7); ctx.stroke();
    label(ctx, '📮 recipient MX', MX + 6, Y, { color: pal.text, size: 11, weight: 700 });
    // links
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(QX + 70, Y); ctx.lineTo(WX - 45, Y); ctx.moveTo(WX + 45, Y); ctx.lineTo(MX - 40, Y); ctx.stroke(); ctx.setLineDash([]);
    // flying attempts
    for (const f of flying) {
      const x = WX + (MX - 45 - WX) * Math.min(1, f.t);
      const col = f.outcome === 'delivered' ? pal.green : f.outcome === 'bounced' ? pal.red : pal.amber;
      let y = Y;
      if (f.t > 1) { // deflect on retry/bounce
        if (f.outcome === 'retry') y = Y + (f.t - 1) * 120;
        else if (f.outcome === 'bounced') y = Y - (f.t - 1) * 120;
      }
      ctx.fillStyle = col; ctx.globalAlpha = f.t > 1 ? Math.max(0, 1.4 - f.t) / 0.4 : 1;
      roundRect(ctx, x - 9, y - 6, 18, 12, 3); ctx.fill(); ctx.globalAlpha = 1;
    }
    label(ctx, '✅ delivered', MX + 6, Y + 40, { color: pal.green, size: 10, weight: 600 });
    label(ctx, '↩︎ retry (backoff)', WX, Y + 54, { color: pal.amber, size: 10, weight: 600 });
    label(ctx, '⛔ hard bounce', MX + 6, Y - 44, { color: pal.red, size: 10, weight: 600 });
    note.innerHTML = `queued <b>${queue.length}</b> · delivered <b style="color:var(--green)">${delivered}</b> · retries <b style="color:var(--amber)">${retries}</b> · bounced <b style="color:var(--red)">${bounced}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
