// ── Cost optimization / storage tiering (live canvas sim) ───────────────────
// Data lands hot and ages. With a lifecycle policy it transitions to cheaper
// warm then cold tiers (and expires), so spend drops; without it, everything
// stays on pricey hot storage. Toggle the policy and watch the monthly bill.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const WARM = 4, COLD = 8, EXPIRE = 12;          // age thresholds (s)
const TIER = [
  { name: 'HOT', sub: 'standard · $$$', cost: 3, tone: 'red' },
  { name: 'WARM', sub: 'infrequent · $$', cost: 1, tone: 'amber' },
  { name: 'COLD', sub: 'archive · $', cost: 0.3, tone: 'blue' },
];

export function mount(container) {
  let lifecycle = true, spawnAcc = 0;
  const objs = [];        // {age, y}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="co-note"></div>
      <div class="wg-btnrow"><button class="sd-btn sd-btn-primary" id="co-life">♻️ Lifecycle policy: on</button></div>`,
    caption: 'Recent data is queried constantly; old data almost never. A lifecycle policy moves aging data to cheaper tiers automatically and expires what’s past retention — so you stop paying hot-tier prices for cold data. Without it, everything sits hot and the bill compounds.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#co-note');

  $('#co-life').addEventListener('click', (e) => { lifecycle = !lifecycle; e.target.textContent = `♻️ Lifecycle policy: ${lifecycle ? 'on' : 'off'}`; });

  function tierOf(age) {
    if (!lifecycle) return 0;
    if (age < WARM) return 0;
    if (age < COLD) return 1;
    return 2;
  }

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.4) { spawnAcc -= 0.4; objs.push({ age: 0, y: 0 }); }
    for (let i = objs.length - 1; i >= 0; i--) { objs[i].age += dt; if (objs[i].age >= EXPIRE) objs.splice(i, 1); }
  }

  const laneY = t => 80 + t * 70;

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // tier lanes
    TIER.forEach((ti, t) => {
      const y = laneY(t), col = pal[ti.tone];
      roundRect(ctx, 150, y - 26, 470, 52, 8);
      ctx.fillStyle = withAlpha(col, 0.06); ctx.fill(); ctx.strokeStyle = withAlpha(col, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
      label(ctx, ti.name, 90, y - 6, { color: col, size: 12, weight: 800, align: 'left' });
      label(ctx, ti.sub, 90, y + 10, { color: pal.text3, size: 8, weight: 600, align: 'left' });
    });

    // objects grouped by tier
    const counts = [0, 0, 0];
    for (const o of objs) {
      const t = tierOf(o.age);
      const idx = counts[t]++;
      const x = 162 + (idx % 28) * 16;
      const y = laneY(t) - 10 + Math.floor(idx / 28) * 14;
      if (x > 610) continue;
      ctx.fillStyle = withAlpha(pal[TIER[t].tone], 0.6); roundRect(ctx, x, y, 12, 9, 2); ctx.fill();
    }

    // cost meters
    const cost = counts.reduce((s, c, t) => s + c * TIER[t].cost, 0);
    const allHot = objs.length * TIER[0].cost;
    label(ctx, '💵 relative monthly spend', 150, 258, { color: pal.text2, size: 10, weight: 800, align: 'left' });
    const maxC = Math.max(allHot, 1);
    roundRect(ctx, 150, 268, 360 * (cost / maxC), 14, 4); ctx.fillStyle = withAlpha(pal.green, 0.6); ctx.fill();
    label(ctx, `with policy: ${cost.toFixed(0)}`, 520, 275, { color: pal.green, size: 9, weight: 700, align: 'left' });

    const saved = allHot > 0 ? Math.round((1 - cost / allHot) * 100) : 0;
    note.innerHTML = `lifecycle <b style="color:var(--${lifecycle ? 'green' : 'red'})">${lifecycle ? 'on' : 'off'}</b> · hot ${counts[0]} · warm ${counts[1]} · cold ${counts[2]} · spend <b style="color:var(--green)">${cost.toFixed(0)}</b> vs all-hot <b style="color:var(--red)">${allHot.toFixed(0)}</b>${lifecycle ? ` · <b style="color:var(--green)">${saved}% saved</b>` : ''}`;
  }

  for (let i = 0; i < 20; i++) objs.push({ age: Math.random() * EXPIRE, y: 0 });
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
