// ── Reconciliation & dedup (live canvas sim) ────────────────────────────────
// At-least-once delivery sends some records twice. With dedup on, the target
// keeps one row per key and reconciliation shows source = target. With dedup
// off, duplicates inflate the target and reconciliation flags the mismatch.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let dedup = true;
  let srcUnique = 0, targetRows = 0, dupsCaught = 0, dupsCounted = 0, idSeq = 0, spawnAcc = 0;
  const seen = new Set();
  const flying = [];      // {id, dup, p}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="rc-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="rc-send">📤 Send records</button>
        <button class="sd-btn" id="rc-mode">🧹 Dedup: on</button>
      </div>`,
    caption: 'At-least-once delivery means retries resend records, so duplicates are normal. Dedup by key keeps one row per real event, so reconciliation shows source = target. Turn dedup off and duplicates inflate the target — reconciliation catches the mismatch that would otherwise silently skew every metric.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#rc-note');

  function send() {
    const isDup = seen.size > 0 && Math.random() < 0.3;
    let id;
    if (isDup) { const arr = [...seen]; id = arr[Math.floor(Math.random() * arr.length)]; }
    else { id = ++idSeq; srcUnique++; }
    flying.push({ id, dup: isDup, p: 0 });
  }
  $('#rc-send').addEventListener('click', () => { for (let i = 0; i < 5; i++) send(); });
  $('#rc-mode').addEventListener('click', (e) => { dedup = !dedup; e.target.textContent = `🧹 Dedup: ${dedup ? 'on' : 'off'}`; });

  function arrive(f) {
    const known = seen.has(f.id);
    if (known) {
      if (dedup) dupsCaught++;          // idempotent sink drops it
      else { targetRows++; dupsCounted++; }   // duplicate counted → inflation
    } else { seen.add(f.id); targetRows++; }
  }

  function step(dt) {
    spawnAcc += dt; while (spawnAcc >= 0.55) { spawnAcc -= 0.55; send(); }
    for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i]; f.p += dt * 1.1; if (f.p >= 1 && !f.done) { f.done = true; arrive(f); } if (f.p >= 1.1) flying.splice(i, 1); }
  }

  const SX = 110, TX = 480, Y = 110;

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // source
    roundRect(ctx, SX - 54, Y - 34, 108, 68, 10); ctx.fillStyle = withAlpha(pal.blue, 0.1); ctx.fill();
    ctx.strokeStyle = pal.blue; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, '🗄️ source', SX, Y - 12, { color: pal.text, size: 11, weight: 800 });
    label(ctx, `${srcUnique} unique`, SX, Y + 8, { color: pal.text2, size: 11, weight: 700 });
    label(ctx, 'at-least-once →', SX, Y + 48, { color: pal.amber, size: 9, weight: 600 });

    // target
    const match = targetRows === srcUnique;
    const tcol = match ? pal.green : pal.red;
    roundRect(ctx, TX - 60, Y - 34, 120, 68, 10); ctx.fillStyle = withAlpha(tcol, 0.1); ctx.fill();
    ctx.strokeStyle = tcol; ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, dedup ? '🎯 target (dedup)' : '🎯 target (raw)', TX, Y - 12, { color: pal.text, size: 10, weight: 800 });
    label(ctx, `${targetRows} rows`, TX, Y + 8, { color: pal.text2, size: 11, weight: 700 });

    // channel
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(SX + 54, Y); ctx.lineTo(TX - 60, Y); ctx.stroke(); ctx.setLineDash([]);

    // flying
    for (const f of flying) {
      const x = (SX + 54) + (TX - 60 - SX - 54) * Math.min(1, f.p);
      ctx.fillStyle = f.dup ? pal.amber : pal.blue;
      roundRect(ctx, x - 8, Y - 6, 16, 12, 3); ctx.fill();
      if (f.dup) label(ctx, '↻', x, Y, { color: '#fff', size: 9, weight: 800 });
    }

    // reconciliation panel
    label(ctx, '🧮 reconciliation', 330, 210, { color: pal.text2, size: 11, weight: 800 });
    const barW = 200, maxV = Math.max(srcUnique, targetRows, 1);
    roundRect(ctx, 150, 228, barW * (srcUnique / maxV), 16, 4); ctx.fillStyle = withAlpha(pal.blue, 0.6); ctx.fill();
    label(ctx, `source ${srcUnique}`, 360, 236, { color: pal.blue, size: 9, weight: 700, align: 'left' });
    roundRect(ctx, 150, 250, barW * (targetRows / maxV), 16, 4); ctx.fillStyle = withAlpha(tcol, 0.6); ctx.fill();
    label(ctx, `target ${targetRows}`, 360, 258, { color: tcol, size: 9, weight: 700, align: 'left' });
    label(ctx, match ? '✓ reconciled' : '✕ MISMATCH', 470, 244, { color: tcol, size: 11, weight: 800, align: 'left' });

    note.innerHTML = `dedup <b style="color:var(--${dedup ? 'green' : 'red'})">${dedup ? 'on' : 'off'}</b> · duplicates ${dedup ? `caught <b style="color:var(--green)">${dupsCaught}</b>` : `counted <b style="color:var(--red)">${dupsCounted}</b>`} · ${match ? '<b style="color:var(--green)">source = target</b>' : '<b style="color:var(--red)">target inflated</b>'}`;
  }

  for (let i = 0; i < 4; i++) send();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
