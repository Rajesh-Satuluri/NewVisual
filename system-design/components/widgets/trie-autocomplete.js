// ── Trie autocomplete (live canvas sim) ─────────────────────────────────────
// Search autocomplete walks a trie (prefix tree): the typed prefix traces a
// path down the tree, and the suggestions are the highest-frequency words that
// hang off that node. Type and watch the path light up and the ranked
// completions update — no scanning the dictionary, just a walk down the prefix.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  // word -> search frequency (popularity)
  const DICT = {
    system: 95, systematic: 20, synthesis: 12, syntax: 30, sync: 44,
    design: 90, designer: 25, desk: 15, destiny: 10,
    data: 88, database: 70, datacenter: 33, dataset: 28,
    cache: 60, caching: 40, capacity: 35, cap: 22,
    scale: 66, scaling: 50, scalable: 42, scanner: 8,
    redis: 55, replica: 48, replication: 52, retry: 30,
  };

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="wg-btnrow" style="margin-top:0">
        <label class="wg-switch">prefix
          <input type="text" id="tr-in" value="sy" maxlength="12" autocomplete="off" spellcheck="false"
            style="width:160px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px">
        </label>
      </div>
      <div class="sim-note" id="tr-note" style="margin-top:12px"></div>`,
    caption: 'The prefix is a path from the root; at the node it lands on, the subtree holds every word with that prefix. Suggestions are just those words ranked by popularity — so lookup cost depends on the length of what you typed, not on how big the dictionary is.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#tr-note');
  const input = $('#tr-in');
  let prefix = 'sy';
  input.addEventListener('input', () => { prefix = input.value.toLowerCase().replace(/[^a-z]/g, ''); });

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    // prefix chain of letter nodes
    const n = prefix.length;
    const startX = 40, dx = Math.min(70, (560) / Math.max(1, n));
    label(ctx, 'root', 20, 70, { color: pal.text3, size: 11, align: 'left' });
    let px = startX, py = 70;
    ctx.strokeStyle = withAlpha(pal.accent, 0.5); ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = startX + 30 + i * dx;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x - 16, py); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, py, 15, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(pal.accent, 0.18); ctx.fill(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, prefix[i], x, py, { color: pal.text, size: 14, weight: 800 });
      ctx.strokeStyle = withAlpha(pal.accent, 0.5);
      px = x + 15;
    }
    const nodeX = n ? startX + 30 + (n - 1) * dx : startX;
    // matches
    const matches = Object.entries(DICT).filter(([w]) => w.startsWith(prefix) && prefix.length)
      .sort((a, b) => b[1] - a[1]).slice(0, 6);
    label(ctx, prefix.length ? `completions of "${prefix}"` : 'type a prefix…', 40, 120, { color: pal.text3, size: 12, weight: 600, align: 'left' });
    const maxF = matches.length ? matches[0][1] : 1;
    matches.forEach(([w, f], i) => {
      const y = 140 + i * 25;
      // branch line from prefix node to suggestion
      ctx.strokeStyle = withAlpha(pal.accent2, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nodeX + 15, 85); ctx.lineTo(44, y + 9); ctx.stroke();
      const barW = 40 + (f / maxF) * 360;
      roundRect(ctx, 44, y, barW, 20, 5); ctx.fillStyle = withAlpha(i === 0 ? pal.green : pal.accent, 0.16); ctx.fill();
      ctx.strokeStyle = withAlpha(i === 0 ? pal.green : pal.accent, 0.5); ctx.lineWidth = 1; ctx.stroke();
      // highlight typed prefix in bold
      label(ctx, w, 54, y + 10, { color: pal.text, size: 12, weight: i === 0 ? 800 : 600, align: 'left' });
      label(ctx, `${f}`, 44 + barW - 8, y + 10, { color: pal.text2, size: 10, align: 'right' });
    });
    if (prefix.length && !matches.length) label(ctx, 'no matches in dictionary', 44, 150, { color: pal.text3, size: 12, align: 'left' });
    note.innerHTML = `dictionary <b>${Object.keys(DICT).length}</b> words · prefix "<b>${prefix || '∅'}</b>" · <b style="color:var(--green)">${matches.length}</b> completions, ranked by popularity · lookup touches <b>${prefix.length}</b> nodes, not the whole dictionary`;
  }

  const stopRaf = rafLoop(() => draw());
  return () => { stopRaf(); stopPal(); };
}
