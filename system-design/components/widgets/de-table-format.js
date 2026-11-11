// ── Open table format (live canvas sim) ─────────────────────────────────────
// A transaction log over data files. Each commit (append / overwrite / delete)
// atomically produces a new snapshot pointing at a set of files. Readers pin a
// snapshot, so writes are all-or-nothing and you can time-travel to an older
// version while new commits keep landing.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  let fileSeq = 3;
  const versions = [{ op: 'create', files: ['f1', 'f2'] }];   // v0
  let pinned = null;          // null = follow latest (live)
  let flash = 0, autoAcc = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="tf-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="tf-app">＋ Append</button>
        <button class="sd-btn" id="tf-ovr">✎ Overwrite</button>
        <button class="sd-btn" id="tf-del">🗑 Delete</button>
        <button class="sd-btn" id="tf-tt">⏪ Time travel</button>
        <button class="sd-btn" id="tf-live">⏭ Live</button>
      </div>`,
    caption: 'Each commit atomically swaps the table to a new snapshot — readers never see a partial write. Time-travel pins a reader to an older version while new commits land on top: snapshot isolation plus the ability to roll back or query the past.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#tf-note');

  function latest() { return versions.length - 1; }
  function commit(op) {
    const prev = versions[latest()].files.slice();
    let files = prev;
    if (op === 'append') files = [...prev, 'f' + (++fileSeq)];
    else if (op === 'overwrite') files = [...prev.slice(0, -1), 'f' + (++fileSeq)];
    else if (op === 'delete') files = prev.slice(0, Math.max(1, prev.length - 1));
    versions.push({ op, files });
    flash = 0.5;
    if (pinned === null) { /* reader follows latest */ }   // live readers advance
  }
  $('#tf-app').addEventListener('click', () => commit('append'));
  $('#tf-ovr').addEventListener('click', () => commit('overwrite'));
  $('#tf-del').addEventListener('click', () => commit('delete'));
  $('#tf-tt').addEventListener('click', () => { pinned = (pinned === null ? latest() : pinned) - 1; if (pinned < 0) pinned = 0; });
  $('#tf-live').addEventListener('click', () => { pinned = null; });

  function step(dt) {
    if (flash > 0) flash -= dt;
    autoAcc += dt;
    if (autoAcc >= 3.6) { autoAcc = 0; commit(['append', 'append', 'overwrite', 'delete'][Math.floor(Math.random() * 4)]); }
  }

  const OPICON = { create: '✨', append: '＋', overwrite: '✎', delete: '🗑' };

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const readerV = pinned === null ? latest() : pinned;

    // ── commit log (left) ──
    label(ctx, '📜 Commit log', 130, 28, { color: pal.text2, size: 12, weight: 800 });
    const show = versions.slice(-6);
    const startIdx = versions.length - show.length;
    show.forEach((v, k) => {
      const vi = startIdx + k;
      const y = 52 + k * 36;
      const isReader = vi === readerV;
      const isLatest = vi === latest();
      roundRect(ctx, 30, y, 200, 30, 6);
      const col = isReader ? pal.accent : pal.border;
      ctx.fillStyle = withAlpha(isReader ? pal.accent : pal.bg3, isLatest && flash > 0 ? 0.3 : 0.14); ctx.fill();
      ctx.strokeStyle = withAlpha(col, 0.9); ctx.lineWidth = isReader ? 2 : 1; ctx.stroke();
      label(ctx, `v${vi}`, 48, y + 15, { color: pal.text, size: 11, weight: 800, align: 'center' });
      label(ctx, `${OPICON[v.op] || '•'} ${v.op}`, 72, y + 15, { color: pal.text2, size: 10, weight: 600, align: 'left' });
      label(ctx, `${v.files.length} files`, 210, y + 15, { color: pal.text3, size: 9, weight: 600, align: 'right' });
      if (isReader) label(ctx, '👁 reader', 258, y + 15, { color: pal.accent, size: 9, weight: 700, align: 'left' });
    });

    // ── reader's snapshot (right) ──
    label(ctx, `🔎 Reader snapshot · v${readerV}`, 470, 28, { color: pal.text2, size: 12, weight: 800 });
    const files = versions[readerV].files;
    roundRect(ctx, 370, 44, 260, 210, 12);
    ctx.fillStyle = withAlpha(pal.blue, 0.06); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.blue, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    files.slice(0, 9).forEach((f, i) => {
      const x = 390 + (i % 3) * 78, y = 64 + Math.floor(i / 3) * 56;
      roundRect(ctx, x, y, 66, 44, 6);
      ctx.fillStyle = withAlpha(pal.blue, 0.22); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.blue, 0.7); ctx.lineWidth = 1; ctx.stroke();
      label(ctx, '🧊', x + 33, y + 16, { color: pal.text, size: 13 });
      label(ctx, f + '.parquet', x + 33, y + 33, { color: pal.text2, size: 8, weight: 600 });
    });

    const status = pinned === null
      ? `<b style="color:var(--green)">live</b> — reading latest v${latest()}`
      : `<b style="color:var(--amber)">time-traveled</b> — pinned at v${pinned} while latest is v${latest()}`;
    note.innerHTML = `${status} · ${versions[readerV].files.length} files in snapshot · commits: ${versions.length}`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
