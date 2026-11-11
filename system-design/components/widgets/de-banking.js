// ── Banking ledger & reconciliation (live canvas sim) ───────────────────────
// Transactions post to an immutable, append-only ledger as balanced double-entry
// (debit = credit). Reconciliation continuously checks the books balance. Post a
// tampered unbalanced entry and watch reconciliation flag it — then append a
// compensating correction (never edit) to rebalance.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const ledger = [];      // {id, debit, credit, kind}
  const flying = [];
  let seq = 0, sumD = 0, sumC = 0, autoAcc = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="bk-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="bk-post">💸 Post transaction</button>
        <button class="sd-btn" id="bk-tamper">⚠️ Tamper (unbalanced)</button>
        <button class="sd-btn" id="bk-fix">↩️ Post correction</button>
      </div>`,
    caption: 'Money is recorded as immutable, append-only double-entry postings — debits equal credits, so the books net to zero. Reconciliation runs continuously; an unbalanced entry is flagged as an incident. You never edit a record — you append a compensating correction, keeping the audit trail provable.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#bk-note');

  function post(debit, credit, kind) { const e = { id: ++seq, debit, credit, kind }; flying.push({ e, p: 0 }); }
  function amt() { return (Math.floor(Math.random() * 90) + 10) * 10; }
  $('#bk-post').addEventListener('click', () => { const a = amt(); post(a, a, 'ok'); });
  $('#bk-tamper').addEventListener('click', () => { const a = amt(); post(a, a - 50, 'bad'); });
  $('#bk-fix').addEventListener('click', () => { const diff = sumD - sumC; if (diff !== 0) post(diff < 0 ? -diff : 0, diff > 0 ? diff : 0, 'fix'); });

  function step(dt) {
    autoAcc += dt; if (autoAcc >= 1.6) { autoAcc = 0; const a = amt(); post(a, a, 'ok'); }
    for (let i = flying.length - 1; i >= 0; i--) { const f = flying[i]; f.p += dt * 1.4; if (f.p >= 1) { ledger.unshift(f.e); sumD += f.e.debit; sumC += f.e.credit; flying.splice(i, 1); } }
  }

  const LX = 360, LTOP = 60, RH = 24;

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // posting source
    roundRect(ctx, 30, 120, 70, 54, 9); ctx.fillStyle = withAlpha(pal.accent, 0.12); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, '💸 post', 65, 142, { color: pal.text, size: 11, weight: 700 }); label(ctx, 'CDC', 65, 160, { color: pal.text3, size: 8, weight: 600 });

    // immutable ledger
    label(ctx, '📒 immutable ledger (append-only)', LX + 20, 40, { color: pal.text2, size: 11, weight: 800 });
    roundRect(ctx, LX - 70, LTOP - 8, 300, 210, 10); ctx.fillStyle = withAlpha(pal.bg3, 0.3); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.border, 0.8); ctx.lineWidth = 1; ctx.stroke();
    ledger.slice(0, 7).forEach((e, i) => {
      const y = LTOP + i * (RH + 3);
      const col = e.kind === 'bad' ? pal.red : e.kind === 'fix' ? pal.amber : pal.green;
      roundRect(ctx, LX - 62, y, 284, RH, 4); ctx.fillStyle = withAlpha(col, 0.14); ctx.fill();
      label(ctx, `#${e.id}`, LX - 44, y + RH / 2, { color: pal.text3, size: 9, weight: 700 });
      label(ctx, `Dr ${e.debit}`, LX + 20, y + RH / 2, { color: pal.blue, size: 9, weight: 600 });
      label(ctx, `Cr ${e.credit}`, LX + 110, y + RH / 2, { color: pal.accent2, size: 9, weight: 600 });
      label(ctx, e.kind === 'bad' ? '✕' : e.kind === 'fix' ? '↩' : '✓', LX + 200, y + RH / 2, { color: col, size: 10, weight: 800 });
    });

    // flying postings
    for (const f of flying) { const x = 100 + (LX - 62 - 100) * f.p; ctx.fillStyle = f.e.kind === 'bad' ? pal.red : pal.green; roundRect(ctx, x - 10, 142, 20, 14, 3); ctx.fill(); }

    // reconciliation
    const balanced = sumD === sumC;
    const rcol = balanced ? pal.green : pal.red;
    label(ctx, '🧮 reconciliation', 100, 212, { color: pal.text2, size: 11, weight: 800, align: 'left' });
    const maxV = Math.max(sumD, sumC, 1), bw = 180;
    roundRect(ctx, 40, 226, bw * (sumD / maxV), 14, 4); ctx.fillStyle = withAlpha(pal.blue, 0.6); ctx.fill();
    label(ctx, `debits ${sumD}`, 230, 233, { color: pal.blue, size: 9, weight: 700, align: 'left' });
    roundRect(ctx, 40, 246, bw * (sumC / maxV), 14, 4); ctx.fillStyle = withAlpha(pal.accent2, 0.6); ctx.fill();
    label(ctx, `credits ${sumC}`, 230, 253, { color: pal.accent2, size: 9, weight: 700, align: 'left' });
    roundRect(ctx, 330, 228, 150, 30, 6); ctx.fillStyle = withAlpha(rcol, 0.15); ctx.fill(); ctx.strokeStyle = rcol; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, balanced ? '✓ books balanced' : '🚨 OUT OF BALANCE', 405, 243, { color: rcol, size: 11, weight: 800 });

    note.innerHTML = `entries <b>${ledger.length}</b> · debits <b style="color:var(--blue)">${sumD}</b> · credits <b style="color:var(--accent2)">${sumC}</b> · ${balanced ? '<b style="color:var(--green)">reconciled ✓</b>' : `<b style="color:var(--red)">off by ${Math.abs(sumD - sumC)} — post a correction</b>`}`;
  }

  const a0 = amt(); post(a0, a0, 'ok');
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
