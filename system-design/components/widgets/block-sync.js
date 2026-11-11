// ── Block-level delta sync (live canvas sim) ────────────────────────────────
// A file-sync service (Dropbox/Drive) doesn't re-upload a whole file when you
// change one line. It splits the file into fixed blocks, hashes each, and
// uploads only the blocks whose hash changed — deduping the rest against what
// the server already has. Edit a block and watch just that one chunk sync.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const BLOCK_KB = 256;
  let blocks = [];
  let flying = [];            // {i, t}
  let uploadedKB = 0, syncs = 0;
  function seed(n) { blocks = Array.from({ length: n }, () => ({ h: (Math.random() * 0xffff | 0), dirty: false })); }
  seed(8);

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="bs-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="bs-edit">✏️ Edit a block</button>
        <button class="sd-btn" id="bs-edit3">Edit 3 blocks</button>
        <button class="sd-btn" id="bs-add">＋ Append block</button>
        <button class="sd-btn" id="bs-sync">☁️ Sync changed</button>
      </div>`,
    caption: `The file is chunked into ${BLOCK_KB}KB blocks, each identified by a content hash. Only blocks whose hash changed are uploaded; unchanged blocks are deduped against the copy the server already holds. Editing one block of a large file costs one block of upload, not the whole file.`,
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#bs-note');

  function edit(n) { for (let k = 0; k < n; k++) { const i = Math.floor(Math.random() * blocks.length); blocks[i].h = (Math.random() * 0xffff | 0); blocks[i].dirty = true; } }
  $('#bs-edit').addEventListener('click', () => edit(1));
  $('#bs-edit3').addEventListener('click', () => edit(3));
  $('#bs-add').addEventListener('click', () => { if (blocks.length < 12) blocks.push({ h: (Math.random() * 0xffff | 0), dirty: true }); });
  $('#bs-sync').addEventListener('click', () => {
    const dirty = blocks.map((b, i) => ({ b, i })).filter(o => o.b.dirty);
    if (!dirty.length) return;
    syncs++;
    dirty.forEach(o => flying.push({ i: o.i, t: 0 }));
    uploadedKB += dirty.length * BLOCK_KB;
  });

  function step(dt) {
    for (const f of flying) { f.t += dt * 1.1; if (f.t >= 1 && !f.done) { f.done = true; blocks[f.i] && (blocks[f.i].dirty = false); } }
    flying = flying.filter(f => f.t < 1.2);
  }

  function blockX(i, n) { const bw = Math.min(60, (600) / n - 8); return { x: 40 + i * (bw + 8), w: bw }; }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    const n = blocks.length;
    label(ctx, '💻 local file', 40, 40, { color: pal.text2, size: 12, weight: 700, align: 'left' });
    label(ctx, '☁️ server (deduped blocks)', 40, 210, { color: pal.text2, size: 12, weight: 700, align: 'left' });
    blocks.forEach((b, i) => {
      const { x, w } = blockX(i, n);
      // local
      roundRect(ctx, x, 55, w, 70, 8);
      ctx.fillStyle = withAlpha(b.dirty ? pal.amber : pal.blue, 0.16); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(b.dirty ? pal.amber : pal.blue, 0.8); ctx.stroke();
      label(ctx, `#${i + 1}`, x + w / 2, 72, { color: pal.text3, size: 10 });
      label(ctx, b.h.toString(16).padStart(4, '0'), x + w / 2, 95, { color: pal.text, size: 11, weight: 700 });
      if (b.dirty) label(ctx, 'changed', x + w / 2, 113, { color: pal.amber, size: 9, weight: 700 });
      // server block (shows last-synced hash — same as local when clean)
      roundRect(ctx, x, 225, w, 48, 8);
      ctx.fillStyle = withAlpha(pal.green, 0.1); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = withAlpha(pal.green, 0.5); ctx.stroke();
      label(ctx, b.dirty ? '—' : b.h.toString(16).padStart(4, '0'), x + w / 2, 249, { color: b.dirty ? pal.text3 : pal.text2, size: 10 });
    });
    // flying uploads
    for (const f of flying) {
      const { x, w } = blockX(f.i, n);
      const y = 125 + (225 - 125) * Math.min(1, f.t);
      ctx.fillStyle = pal.green; roundRect(ctx, x + w / 2 - 8, y - 6, 16, 12, 3); ctx.fill();
    }
    const dirty = blocks.filter(b => b.dirty).length;
    const fullKB = n * BLOCK_KB;
    note.innerHTML = `blocks <b>${n}</b> (${fullKB}KB total) · changed <b style="color:var(--amber)">${dirty}</b> · this sync uploads <b style="color:var(--green)">${dirty * BLOCK_KB}KB</b> instead of ${fullKB}KB · total uploaded <b>${uploadedKB}KB</b> over ${syncs} syncs`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
