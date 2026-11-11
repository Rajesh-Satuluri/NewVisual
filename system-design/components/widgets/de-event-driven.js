// ── Event-driven architecture (live canvas sim) ─────────────────────────────
// A producer emits events to a broker; each event fans out to every subscribed
// consumer, which reacts independently. Add or remove a consumer live and watch
// the producer stay completely unaffected — the point of decoupling via events.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const ALL = [
  { name: 'email', icon: '✉️', tone: 'blue' },
  { name: 'analytics', icon: '📊', tone: 'green' },
  { name: 'inventory', icon: '📦', tone: 'amber' },
  { name: 'fraud', icon: '🛡️', tone: 'accent2' },
  { name: 'search', icon: '🔎', tone: 'accent' },
];

export function mount(container) {
  let active = 3;                 // number of subscribed consumers
  const pulses = [];              // {ci, p}
  const counts = ALL.map(() => 0);
  let emitAcc = 0, emitted = 0, down = -1;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ed-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ed-emit">⚡ Emit event</button>
        <button class="sd-btn" id="ed-add">＋ Add consumer</button>
        <button class="sd-btn" id="ed-rm">－ Remove consumer</button>
        <button class="sd-btn" id="ed-down">💥 Toggle 'fraud' down</button>
      </div>`,
    caption: 'One event fans out to every subscribed consumer, each reacting on its own. The producer never knows who is listening, so you add or remove consumers — or one goes down — without touching it. A down consumer simply catches up from the log when it recovers.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ed-note');

  function emit() {
    emitted++;
    for (let ci = 0; ci < active; ci++) pulses.push({ ci, p: 0 });
  }
  $('#ed-emit').addEventListener('click', emit);
  $('#ed-add').addEventListener('click', () => { active = Math.min(ALL.length, active + 1); });
  $('#ed-rm').addEventListener('click', () => { active = Math.max(1, active - 1); });
  $('#ed-down').addEventListener('click', () => { down = down === 3 ? -1 : 3; });

  const BX = 330, BY = 150, PRX = 70;

  function step(dt) {
    emitAcc += dt; while (emitAcc >= 1.1) { emitAcc -= 1.1; emit(); }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i]; pu.p += dt * 1.1;
      if (pu.p >= 1 && !pu.done) { pu.done = true; if (pu.ci !== down) counts[pu.ci]++; }
      if (pu.p >= 1.05) pulses.splice(i, 1);
    }
  }

  function consumerPos(ci) { const y = 56 + ci * ((300 - 90) / Math.max(1, active - 1 || 1)); return { x: 580, y: active === 1 ? 150 : y }; }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // producer
    roundRect(ctx, PRX - 42, BY - 26, 84, 52, 9); ctx.fillStyle = withAlpha(pal.amber, 0.12); ctx.fill();
    ctx.strokeStyle = pal.amber; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '📤 producer', PRX, BY - 4, { color: pal.text, size: 10, weight: 700 });
    label(ctx, 'OrderPlaced', PRX, BY + 12, { color: pal.text3, size: 8, weight: 600 });

    // broker
    roundRect(ctx, BX - 40, BY - 30, 80, 60, 10); ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, '📨 broker', BX, BY - 6, { color: pal.text, size: 11, weight: 800 });
    label(ctx, 'event log', BX, BY + 12, { color: pal.text3, size: 8, weight: 600 });
    // producer→broker link
    ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(PRX + 42, BY); ctx.lineTo(BX - 40, BY); ctx.stroke();

    // consumers
    for (let ci = 0; ci < active; ci++) {
      const c = ALL[ci]; const pos = consumerPos(ci);
      const isDown = ci === down;
      ctx.strokeStyle = withAlpha(isDown ? pal.red : pal[c.tone], 0.5); ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(BX + 40, BY); ctx.lineTo(pos.x - 44, pos.y); ctx.stroke(); ctx.setLineDash([]);
      roundRect(ctx, pos.x - 44, pos.y - 17, 88, 34, 8);
      ctx.fillStyle = withAlpha(isDown ? pal.red : pal[c.tone], 0.14); ctx.fill();
      ctx.strokeStyle = isDown ? pal.red : pal[c.tone]; ctx.lineWidth = 1.5; ctx.stroke();
      label(ctx, `${c.icon} ${c.name}`, pos.x, pos.y - 3, { color: pal.text, size: 10, weight: 700 });
      label(ctx, isDown ? 'down — will catch up' : `${counts[ci]} handled`, pos.x, pos.y + 10, { color: isDown ? pal.red : pal.text3, size: 8, weight: 600 });
    }

    // pulses broker→consumer
    for (const pu of pulses) {
      const pos = consumerPos(pu.ci);
      const x = (BX + 40) + (pos.x - 44 - BX - 40) * Math.min(1, pu.p);
      const y = BY + (pos.y - BY) * Math.min(1, pu.p);
      ctx.fillStyle = pu.ci === down ? pal.red : pal[ALL[pu.ci].tone];
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }

    note.innerHTML = `events emitted <b style="color:var(--amber)">${emitted}</b> · subscribed consumers <b style="color:var(--accent)">${active}</b> · <span style="color:var(--text3)">producer unchanged as consumers come and go</span>`;
  }

  emit();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
