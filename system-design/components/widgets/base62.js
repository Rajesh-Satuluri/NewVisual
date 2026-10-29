// ── URL shortener: base62 encoding (live canvas sim) ────────────────────────
// The clean way to mint short codes is a monotonic counter encoded in base62
// (0-9 a-z A-Z). Each new URL gets the next integer id, converted to a short
// string — collision-free by construction, and 7 characters already cover
// 62^7 ≈ 3.5 trillion URLs. Shorten some URLs and watch the id become a code.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function base62(n) { if (n === 0) return '0'; let s = ''; while (n > 0) { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } return s; }

export function mount(container) {
  let counter = 100000;      // start mid-range so codes are a few chars
  let recent = [];           // {long, id, code}
  let flash = 0;
  const SAMPLE = ['news.site/2026/story', 'shop.co/p/42719', 'blog.dev/a/b/c', 'docs.app/v/9281', 'maps.io/place/88'];

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="wg-btnrow" style="margin-top:0">
        <input type="text" id="b62-in" value="example.com/a/very/long/path?x=1" maxlength="60" autocomplete="off" spellcheck="false"
          style="flex:1;min-width:200px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px">
        <button class="sd-btn sd-btn-primary" id="b62-go">🔗 Shorten</button>
        <button class="sd-btn" id="b62-rand">🎲 Random URL</button>
      </div>
      <div class="sim-note" id="b62-note" style="margin-top:12px"></div>`,
    caption: 'A counter guarantees uniqueness with no hashing and no collision checks; base62 keeps the code short and URL-safe. The id is reversible back to the row, so resolving a short link is a single primary-key lookup.',
  });

  const ctx = fitCanvas(canvas, 640, 290);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#b62-note');
  const input = $('#b62-in');

  function shorten(url) {
    url = (url || '').trim(); if (!url) return;
    const id = counter++; const code = base62(id);
    recent.unshift({ long: url, id, code }); if (recent.length > 5) recent.pop();
    flash = 1;
  }
  $('#b62-go').addEventListener('click', () => shorten(input.value));
  $('#b62-rand').addEventListener('click', () => { input.value = SAMPLE[Math.floor(Math.random() * SAMPLE.length)]; shorten(input.value); });

  function step(dt) { if (flash > 0) flash = Math.max(0, flash - dt * 1.4); }

  function draw() {
    ctx.clearRect(0, 0, 640, 290);
    const cur = recent[0];
    if (cur) {
      // long url
      roundRect(ctx, 20, 30, 600, 40, 8); ctx.fillStyle = withAlpha(pal.text3, 0.08); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = withAlpha(pal.border, 1); ctx.stroke();
      label(ctx, 'long URL', 30, 44, { color: pal.text3, size: 10, align: 'left' });
      const shown = cur.long.length > 60 ? cur.long.slice(0, 57) + '…' : cur.long;
      label(ctx, shown, 30, 59, { color: pal.text, size: 13, align: 'left' });
      // transform row: id -> base62 digits -> code
      label(ctx, `counter id`, 70, 100, { color: pal.text3, size: 10 });
      roundRect(ctx, 20, 108, 100, 34, 7); ctx.fillStyle = withAlpha(pal.blue, 0.16 + flash * 0.4); ctx.fill(); ctx.strokeStyle = pal.blue; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, `${cur.id}`, 70, 126, { color: pal.text, size: 15, weight: 800 });
      label(ctx, '→ base62 →', 170, 126, { color: pal.text3, size: 12, weight: 700 });
      // digit tiles
      const digits = cur.code.split('');
      digits.forEach((d, i) => {
        const x = 250 + i * 40;
        roundRect(ctx, x, 108, 34, 34, 7); ctx.fillStyle = withAlpha(pal.green, 0.18 + flash * 0.4); ctx.fill(); ctx.strokeStyle = withAlpha(pal.green, 0.8); ctx.lineWidth = 2; ctx.stroke();
        label(ctx, d, x + 17, 126, { color: pal.text, size: 16, weight: 800 });
      });
      // short url
      label(ctx, 'short URL', 30, 168, { color: pal.text3, size: 10, align: 'left' });
      roundRect(ctx, 20, 176, 600, 38, 8); ctx.fillStyle = withAlpha(pal.accent, 0.12 + flash * 0.3); ctx.fill(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, `sho.rt/${cur.code}`, 30, 195, { color: pal.accent, size: 17, weight: 800, align: 'left' });
    }
    // recent table
    label(ctx, 'mapping table (code → row):', 20, 234, { color: pal.text3, size: 11, align: 'left' });
    recent.forEach((r, i) => {
      const y = 246 + i * 16;
      label(ctx, `sho.rt/${r.code}`, 24, y + 7, { color: i === 0 ? pal.accent : pal.text2, size: 11, weight: i === 0 ? 700 : 400, align: 'left' });
      label(ctx, `id ${r.id}  →  ${r.long.length > 48 ? r.long.slice(0, 45) + '…' : r.long}`, 150, y + 7, { color: pal.text3, size: 10, align: 'left' });
    });
    note.innerHTML = cur
      ? `next id <b>${counter}</b> · last code <b style="color:var(--accent)">${cur.code}</b> (${cur.code.length} chars) · 62⁷ ≈ <b>3.5 trillion</b> codes · collision-free by construction`
      : 'enter a URL and press Shorten';
  }

  shorten(input.value);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
