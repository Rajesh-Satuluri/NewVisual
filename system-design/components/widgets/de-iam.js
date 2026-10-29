// ── IAM / RBAC access gates (live canvas sim) ───────────────────────────────
// A query passes through layered gates: authenticate, authorize by role,
// row-level filter, column mask. Switch the requester's role and watch the same
// query clear or get denied at different gates — least privilege in layers.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

// what each role is allowed at each gate
const ROLES = {
  viewer:  { label: '👁 viewer', rows: 'own region', cols: 'masked', write: false },
  analyst: { label: '📊 analyst', rows: 'all regions', cols: 'masked', write: false },
  admin:   { label: '🛠️ admin', rows: 'all regions', cols: 'clear', write: true },
};
const GATES = ['authenticate', 'authorize (role)', 'row-level', 'column mask'];

export function mount(container) {
  let role = 'analyst';
  const reqs = [];        // {x, denyAt, phase}
  let spawnAcc = 0, allowed = 0, masked = 0, denied = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ia-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn" id="ia-viewer">👁 viewer</button>
        <button class="sd-btn sd-btn-primary" id="ia-analyst">📊 analyst</button>
        <button class="sd-btn" id="ia-admin">🛠️ admin</button>
      </div>`,
    caption: 'Access is layered gates, not one wall: authenticate, then authorize by role, then row-level filtering and column masking. The same query clears different gates for different roles — a viewer sees only its region with PII masked; an admin sees everything clear. Least privilege, enforced in depth.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ia-note');

  $('#ia-viewer').addEventListener('click', () => { role = 'viewer'; });
  $('#ia-analyst').addEventListener('click', () => { role = 'analyst'; });
  $('#ia-admin').addEventListener('click', () => { role = 'admin'; });

  const INX = 46, gateX = i => 150 + i * 118, DBX = 620, Y = 120;

  function spawn() {
    // every request authenticates + authorizes here (all roles are valid users);
    // outcome is governed by row filter + column mask, so no hard deny in this demo
    reqs.push({ x: INX, role, result: null });
  }
  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.8) { spawnAcc -= 0.8; spawn(); }
    for (let i = reqs.length - 1; i >= 0; i--) {
      const r = reqs[i]; r.x += dt * 160;
      if (r.x >= DBX - 30 && !r.counted) {
        r.counted = true;
        const cfg = ROLES[r.role];
        if (cfg.cols === 'masked') masked++; allowed++;
        reqs.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const cfg = ROLES[role];
    label(ctx, `requester: ${cfg.label}`, 330, 28, { color: pal.accent, size: 12, weight: 800 });

    // request source
    roundRect(ctx, INX - 26, Y - 18, 50, 36, 7); ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.4; ctx.stroke();
    label(ctx, '🔑', INX - 1, Y, { color: pal.text, size: 13 });

    // gates with per-role status
    GATES.forEach((g, i) => {
      const x = gateX(i);
      let status = '✓', scol = pal.green, sub = '';
      if (i === 2) { sub = cfg.rows; }
      if (i === 3) { sub = cfg.cols; if (cfg.cols === 'masked') scol = pal.amber; }
      roundRect(ctx, x - 12, Y - 44, 24, 88, 6);
      ctx.fillStyle = withAlpha(scol, 0.14); ctx.fill(); ctx.strokeStyle = withAlpha(scol, 0.8); ctx.lineWidth = 1.4; ctx.stroke();
      label(ctx, g, x, Y - 54, { color: pal.text2, size: 9, weight: 700 });
      label(ctx, status, x, Y, { color: scol, size: 13, weight: 800 });
      if (sub) label(ctx, sub, x, Y + 56, { color: scol, size: 8, weight: 700 });
    });

    // data store
    roundRect(ctx, DBX - 26, Y - 28, 54, 56, 8); ctx.fillStyle = withAlpha(pal.blue, 0.12); ctx.fill();
    ctx.strokeStyle = pal.blue; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '🗄️', DBX, Y - 6, { color: pal.text, size: 14 });
    label(ctx, 'data', DBX, Y + 12, { color: pal.text3, size: 8, weight: 600 });

    // path line
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(INX + 24, Y); ctx.lineTo(DBX - 26, Y); ctx.stroke(); ctx.setLineDash([]);

    // requests
    for (const r of reqs) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(Math.min(r.x, DBX - 30), Y, 6, 0, Math.PI * 2); ctx.fill(); }

    // outcome summary card
    label(ctx, '🔎 what this role sees', 330, 210, { color: pal.text2, size: 11, weight: 800 });
    label(ctx, `rows: ${cfg.rows}  ·  columns: ${cfg.cols === 'clear' ? 'full (clear)' : 'PII masked (***)'}  ·  write: ${cfg.write ? 'yes' : 'no'}`, 330, 232, { color: pal.text, size: 10, weight: 600 });

    note.innerHTML = `role <b style="color:var(--accent)">${role}</b> · requests allowed <b style="color:var(--green)">${allowed}</b> · with masked columns <b style="color:var(--amber)">${masked}</b> · least privilege: ${cfg.rows} / ${cfg.cols}`;
  }

  spawn();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
