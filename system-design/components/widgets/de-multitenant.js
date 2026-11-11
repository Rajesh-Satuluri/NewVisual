// ── Multi-tenant analytics (live canvas sim) ────────────────────────────────
// Tenants write into one shared table tagged by tenant_id. A query is scoped to
// its tenant by row-level security, so it sees only its own rows. Toggle
// isolation off and the same query leaks every tenant's data — the catastrophic
// failure RLS prevents.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const TENANTS = [{ id: 'A', tone: 'blue' }, { id: 'B', tone: 'green' }, { id: 'C', tone: 'amber' }];
const COLS = 6, ROWS = 4, CAP = COLS * ROWS;

export function mount(container) {
  let isolation = true, queryIdx = 0, queryAcc = 0, spawnAcc = 0, returned = 0, leaked = 0;
  const table = [];       // {t}
  const flying = [];

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="mt-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="mt-q">🔎 Next tenant query</button>
        <button class="sd-btn" id="mt-iso">🛡️ Row-level security: on</button>
      </div>`,
    caption: 'Many tenants share one table tagged by tenant_id. Row-level security injects the tenant filter into every query automatically, so each tenant sees only its own rows — isolation enforced centrally, not by trusting each query. Turn it off and the same query leaks everyone’s data: a single missing filter is a cross-tenant breach.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#mt-note');

  const SRCX = 74, TX = 330, TY = 80, CW = 30, CH = 26, GAP = 5, RQX = 600;

  function ingest() { const ti = Math.floor(Math.random() * TENANTS.length); flying.push({ ti, p: 0 }); }
  function runQuery() {
    queryIdx = (queryIdx + 1) % TENANTS.length;
    const cur = TENANTS[queryIdx].id;
    returned = table.filter(r => r.t === cur).length;
    leaked = isolation ? 0 : table.filter(r => r.t !== cur).length;
  }
  $('#mt-q').addEventListener('click', runQuery);
  $('#mt-iso').addEventListener('click', (e) => { isolation = !isolation; e.target.textContent = `🛡️ Row-level security: ${isolation ? 'on' : 'off'}`; runQuery(); });

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.5) { spawnAcc -= 0.5; ingest(); }
    queryAcc += dt; if (queryAcc >= 2.4) { queryAcc = 0; runQuery(); }
    for (let i = flying.length - 1; i >= 0; i--) { flying[i].p += dt * 1.2; if (flying[i].p >= 1) { table.push({ t: TENANTS[flying[i].ti].id }); if (table.length > CAP) table.shift(); flying.splice(i, 1); } }
  }

  function cellPos(i) { return { x: TX - (COLS * (CW + GAP)) / 2 + (i % COLS) * (CW + GAP) + CW / 2, y: TY + Math.floor(i / COLS) * (CH + GAP) + CH / 2 }; }
  function toneOf(id) { return pal[TENANTS.find(t => t.id === id).tone]; }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const cur = TENANTS[queryIdx].id;

    // tenants
    TENANTS.forEach((t, i) => {
      const y = 70 + i * 80;
      roundRect(ctx, SRCX - 44, y - 16, 88, 32, 7); ctx.fillStyle = withAlpha(pal[t.tone], 0.14); ctx.fill();
      ctx.strokeStyle = pal[t.tone]; ctx.lineWidth = 1.4; ctx.stroke();
      label(ctx, `🏢 tenant ${t.id}`, SRCX, y, { color: pal.text, size: 10, weight: 700 });
    });

    // shared table
    label(ctx, '🗄️ shared table (tenant_id)', TX, TY - 24, { color: pal.text2, size: 11, weight: 800 });
    for (let i = 0; i < CAP; i++) {
      const p = cellPos(i); const r = table[i];
      roundRect(ctx, p.x - CW / 2, p.y - CH / 2, CW, CH, 4);
      if (r) {
        const match = r.t === cur;
        const show = match || !isolation;
        ctx.fillStyle = withAlpha(toneOf(r.t), show ? 0.6 : 0.18); ctx.fill();
        if (show) { ctx.strokeStyle = toneOf(r.t); ctx.lineWidth = match ? 1.6 : 1; ctx.stroke(); }
        label(ctx, r.t, p.x, p.y, { color: show ? '#fff' : pal.text3, size: 9, weight: 800 });
      } else { ctx.fillStyle = withAlpha(pal.bg3, 0.4); ctx.fill(); }
    }

    // flying ingests
    for (const f of flying) { const dest = cellPos(Math.min(table.length, CAP - 1)); const y0 = 70 + f.ti * 80; const x = (SRCX + 44) + (dest.x - SRCX - 44) * f.p, y = y0 + (dest.y - y0) * f.p; ctx.fillStyle = pal[TENANTS[f.ti].tone]; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }

    // requester
    const leak = !isolation;
    roundRect(ctx, RQX - 48, 110, 96, 80, 9); ctx.fillStyle = withAlpha(leak ? pal.red : toneOf(cur), 0.1); ctx.fill();
    ctx.strokeStyle = leak ? pal.red : toneOf(cur); ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, `query: ${cur}`, RQX, 128, { color: pal.text, size: 10, weight: 800 });
    label(ctx, `${returned} own rows`, RQX, 146, { color: toneOf(cur), size: 9, weight: 700 });
    if (leak && leaked > 0) label(ctx, `🚨 +${leaked} leaked`, RQX, 164, { color: pal.red, size: 9, weight: 800 });
    else label(ctx, '✓ isolated', RQX, 164, { color: pal.green, size: 9, weight: 700 });
    // link
    ctx.strokeStyle = withAlpha(leak ? pal.red : toneOf(cur), 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(TX + (COLS * (CW + GAP)) / 2, 150); ctx.lineTo(RQX - 48, 150); ctx.stroke(); ctx.setLineDash([]);

    note.innerHTML = `querying tenant <b style="color:var(--${TENANTS[queryIdx].tone})">${cur}</b> · returns <b>${returned}</b> own rows${leak ? ` · <b style="color:var(--red)">LEAKED ${leaked} other-tenant rows</b>` : ' · <b style="color:var(--green)">no leakage</b>'}`;
  }

  for (let i = 0; i < 14; i++) table.push({ t: TENANTS[Math.floor(Math.random() * 3)].id });
  runQuery();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
