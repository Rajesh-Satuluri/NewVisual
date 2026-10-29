// ── Change data capture (live canvas sim) ───────────────────────────────────
// Instead of reloading a whole table, CDC tails the source database's commit
// log and streams only the row-level changes — inserts, updates, deletes — to a
// target, which applies them and stays in sync. Mutate the source and watch
// change events flow; compare the bytes moved against a full reload.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let seq = 1;
  const source = [];      // {id, val, flash, fcol}
  const target = [];      // {id, val, flash, fcol}
  const events = [];      // {op, id, val, t}
  let changes = 0, cdcBytes = 0, reloadBytes = 0;
  const ROWBYTES = 1;     // abstract "unit" per row

  function seedRow() { const r = { id: seq++, val: rnd(), flash: 0, fcol: null }; source.push(r); target.push({ ...r }); }
  function rnd() { return Math.floor(100 + Math.random() * 900); }

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="cdc-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="cdc-ins">＋ Insert</button>
        <button class="sd-btn" id="cdc-upd">✎ Update</button>
        <button class="sd-btn" id="cdc-del">🗑 Delete</button>
        <button class="sd-btn" id="cdc-reload">♻️ Full reload</button>
      </div>`,
    caption: 'CDC moves only what changed — a few row events instead of re-copying the whole table every run. That is what makes near-real-time replication to a lake or warehouse cheap, and keeps the target continuously in sync with the source.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#cdc-note');

  const SX = 120, LX = 330, TX = 540, TOP = 70, RH = 26;
  const OPCOL = { I: 'green', U: 'amber', D: 'red' };

  function emit(op, id, val) {
    events.push({ op, id, val, t: 0 });
    changes++; cdcBytes += ROWBYTES;
  }
  function flashRow(row, col) { if (row) { row.flash = 1; row.fcol = col; } }

  $('#cdc-ins').addEventListener('click', () => {
    const r = { id: seq++, val: rnd(), flash: 1, fcol: 'green' };
    source.push(r); emit('I', r.id, r.val);
  });
  $('#cdc-upd').addEventListener('click', () => {
    if (!source.length) return;
    const r = source[Math.floor(Math.random() * source.length)];
    r.val = rnd(); flashRow(r, 'amber'); emit('U', r.id, r.val);
  });
  $('#cdc-del').addEventListener('click', () => {
    if (!source.length) return;
    const idx = Math.floor(Math.random() * source.length);
    const r = source[idx]; source.splice(idx, 1); emit('D', r.id, null);
  });
  $('#cdc-reload').addEventListener('click', () => {
    // a full reload re-streams every current row regardless of whether it changed
    reloadBytes += Math.max(source.length, 1) * ROWBYTES;
    source.forEach(r => { r.flash = 1; r.fcol = 'blue'; events.push({ op: 'R', id: r.id, val: r.val, t: 0 }); });
  });

  function applyEvent(e) {
    if (e.op === 'D') { const i = target.findIndex(r => r.id === e.id); if (i >= 0) target.splice(i, 1); return; }
    const row = target.find(r => r.id === e.id);
    if (row) { row.val = e.val; flashRow(row, e.op === 'R' ? 'blue' : OPCOL[e.op] === 'green' ? 'green' : 'amber'); }
    else { target.push({ id: e.id, val: e.val, flash: 1, fcol: 'green' }); }
  }

  function step(dt) {
    for (const r of source) if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.5);
    for (const r of target) if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.5);
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      e.t += dt * 1.1;
      if (e.t >= 1 && !e.applied) { e.applied = true; applyEvent(e); }
      if (e.t >= 1.15) events.splice(i, 1);
    }
  }

  function tableBox(x, title, rows, col) {
    roundRect(ctx, x - 62, TOP - 28, 124, 230, 10);
    ctx.fillStyle = withAlpha(col, 0.06); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, title, x, TOP - 40, { color: col, size: 12, weight: 800 });
    rows.slice(0, 6).forEach((r, i) => {
      const y = TOP + i * (RH + 4);
      const fc = r.flash > 0 ? withAlpha(pal[r.fcol] || pal.accent, 0.18 + r.flash * 0.3) : withAlpha(pal.bg3, 0.6);
      roundRect(ctx, x - 52, y, 104, RH, 5); ctx.fillStyle = fc; ctx.fill();
      if (r.flash > 0) { ctx.strokeStyle = pal[r.fcol] || pal.accent; ctx.lineWidth = 1.4; ctx.stroke(); }
      label(ctx, `#${r.id}`, x - 34, y + RH / 2, { color: pal.text3, size: 10, weight: 700, align: 'center' });
      label(ctx, `${r.val}`, x + 18, y + RH / 2, { color: pal.text, size: 11, weight: 600, align: 'center' });
    });
    if (rows.length > 6) label(ctx, `+${rows.length - 6}`, x, TOP + 6 * (RH + 4) + 8, { color: pal.text3, size: 10 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    tableBox(SX, '🗄️ Source DB', source, pal.blue);

    // log reader in the middle
    roundRect(ctx, LX - 40, 120, 80, 60, 9);
    ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, '📖 log', LX, 142, { color: pal.text, size: 11, weight: 700 });
    label(ctx, 'reader', LX, 158, { color: pal.text2, size: 10, weight: 600 });

    tableBox(TX, '🎯 Target', target, pal.green);

    // links
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(SX + 62, 150); ctx.lineTo(LX - 40, 150); ctx.moveTo(LX + 40, 150); ctx.lineTo(TX - 62, 150); ctx.stroke();
    ctx.setLineDash([]);

    // flying change events
    for (const e of events) {
      // source→reader on first half, reader→target on second half
      let x, y = 150;
      if (e.t < 0.5) { const p = e.t / 0.5; x = (SX + 62) + (LX - 40 - SX - 62) * p; }
      else { const p = (e.t - 0.5) / 0.5; x = (LX + 40) + (TX - 62 - LX - 40) * Math.min(1, p); }
      const col = pal[OPCOL[e.op] || 'blue'] || pal.accent;
      roundRect(ctx, x - 13, y - 9, 26, 18, 4); ctx.fillStyle = withAlpha(col, 0.9); ctx.fill();
      label(ctx, e.op, x, y, { color: '#fff', size: 11, weight: 800 });
    }

    const synced = JSON.stringify(source.map(r => [r.id, r.val]).sort()) === JSON.stringify(target.map(r => [r.id, r.val]).sort());
    note.innerHTML = `change events <b style="color:var(--accent)">${changes}</b> · CDC moved <b style="color:var(--green)">${cdcBytes}</b> rows · full-reload moved <b style="color:var(--red)">${reloadBytes}</b> rows · ${synced ? '<b style="color:var(--green)">in sync ✓</b>' : '<b style="color:var(--amber)">syncing…</b>'}`;
  }

  for (let i = 0; i < 4; i++) seedRow();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
