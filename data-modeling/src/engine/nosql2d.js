/* nosql2d.js — the NoSQL & access-pattern visual vocabulary.

   Where schema2d draws the RELATIONAL world (flat tables, crow's-foot joins, PK/FK
   badges), NoSQL modeling is a different world: data is shaped by the QUERIES that
   read it, not by normalization. So this engine draws documents (nested JSON
   trees), key→value slots, partition buckets that items route into and sort within,
   heterogeneous items sharing one key-space (single-table design), and access
   patterns that sweep a contiguous run of items in a single read.

   Motion is CSS, keyed off a fresh mount each step:
     • document lines UNFOLD / cascade open (deeper keys later)
     • items DROP + ROUTE into their partition bucket, then SETTLE into sort order
     • a query SWEEP reveals an item collection left-to-right (one read)
     • a hot partition GLOWS / pulses; a pointer ARROW draws itself

   Everything returns plain SVG strings the scene assembles. Coordinates are in a
   0 0 1040 600 viewBox. Colors come from the shared theme tokens, so light/dark
   just work. The shell contract (assemble → { svg, layer, rail, flows, note }) is
   identical to schema2d, so these scenes drop into the same course shell. */

import { icon } from './icons.js';

export const VW = 1040, VH = 600;
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const TONE = { slate: '--ink-2', accent: '--accent', amber: '--amber', green: '--green', violet: '--violet', rose: '--red' };
const toneVar = (t) => TONE[t] || TONE.accent;

/* ── defs: dot grid, shadow, arrowhead, and all animation CSS ─────────────────── */
export function nosqlDefs() {
  return `<defs>
    <pattern id="ns-dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" class="ns-dot"/>
    </pattern>
    <filter id="ns-shadow" x="-20%" y="-20%" width="140%" height="170%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="var(--shadow, rgba(16,24,40,.14))" flood-opacity="1"/>
    </filter>
    <filter id="ns-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="var(--red, #e5484d)" flood-opacity="0.9"/>
    </filter>
    <marker id="ns-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M1 1 L9 5 L1 9" class="ns-arrowhead"/>
    </marker>
    <style>
      .ns-dot { fill: var(--line-2, #d6dae1); opacity: .5; }
      .ns-card { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.2; }
      .ns-head { stroke: none; }
      .ns-stripe { stroke: none; }
      .ns-title { fill: var(--ink, #15202b); font: 700 15px var(--sans, system-ui); }
      .ns-sub { fill: var(--ink-2, #6b7682); font: 500 12px var(--sans, system-ui); }
      .ns-key { fill: var(--ink, #15202b); font: 600 13px var(--mono, ui-monospace); }
      .ns-val { fill: var(--accent, #1f9d72); font: 500 13px var(--mono, ui-monospace); }
      .ns-punct { fill: var(--ink-2, #8a94a0); font: 500 13px var(--mono, ui-monospace); }
      .ns-embedbg { fill: color-mix(in srgb, var(--violet) 10%, transparent); stroke: color-mix(in srgb, var(--violet) 35%, transparent); stroke-width: 1; stroke-dasharray: 3 3; }
      .ns-hotbg { fill: color-mix(in srgb, var(--amber) 16%, transparent); }
      .ns-kv-k { fill: var(--surface, #fff); }
      .ns-kv-khole { fill: color-mix(in srgb, var(--accent) 13%, var(--surface)); stroke: var(--line, #e3e6ea); stroke-width: 1.1; }
      .ns-kv-v { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.1; }
      .ns-kv-kt { fill: var(--ink, #15202b); font: 700 12.5px var(--mono, ui-monospace); }
      .ns-kv-vt { fill: var(--ink-2, #6b7682); font: 500 12.5px var(--mono, ui-monospace); }
      .ns-bin { fill: color-mix(in srgb, var(--accent) 4%, var(--surface)); stroke: var(--line, #e3e6ea); stroke-width: 1.3; }
      .ns-bin--hot { stroke: var(--red, #e5484d); stroke-width: 1.8; }
      .ns-binlabel { fill: var(--ink, #15202b); font: 700 12.5px var(--mono, ui-monospace); }
      .ns-binsub { fill: var(--ink-2, #6b7682); font: 600 10px var(--sans, system-ui); letter-spacing: .05em; text-transform: uppercase; }
      .ns-item { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.1; }
      .ns-itemt { fill: var(--ink, #15202b); font: 600 12px var(--mono, ui-monospace); }
      .ns-pill { stroke: none; }
      .ns-pillt { font: 700 10.5px var(--sans, system-ui); }
      .ns-chip { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.2; }
      .ns-chipt { fill: var(--ink, #15202b); font: 700 12px var(--sans, system-ui); }
      .ns-cap { fill: var(--ink-2, #6b7682); font: 500 13px var(--sans, system-ui); }
      .ns-band { fill: color-mix(in srgb, var(--accent) 4%, var(--surface)); stroke: var(--line, #e3e6ea); stroke-width: 1.2; stroke-dasharray: 2 5; }
      .ns-bandt { fill: var(--ink, #15202b); font: 700 13px var(--sans, system-ui); letter-spacing: .04em; text-transform: uppercase; }
      .ns-bands { fill: var(--ink-2, #6b7682); font: 500 12px var(--sans, system-ui); }
      .ns-sweep { fill: color-mix(in srgb, var(--accent) 16%, transparent); stroke: var(--accent, #1f9d72); stroke-width: 1.5; stroke-dasharray: 4 3; }
      .ns-conn { fill: none; stroke: var(--accent, #1f9d72); stroke-width: 2.3; }
      .ns-conn--ghost { stroke: var(--ink-2, #8a94a0); stroke-dasharray: 5 5; }
      .ns-arrowhead { fill: none; stroke: var(--accent, #1f9d72); stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
      .ns-glyph { width: 15px; height: 15px; }

      .ns-unfold { opacity: 0; animation: ns-unfold .42s cubic-bezier(.2,.7,.3,1) forwards; }
      .ns-rise  { opacity: 0; animation: ns-rise .5s cubic-bezier(.2,.7,.3,1) forwards; }
      .ns-drop  { opacity: 0; animation: ns-drop .5s cubic-bezier(.25,.9,.3,1) forwards; }
      .ns-pop   { opacity: 0; transform-box: fill-box; transform-origin: center; animation: ns-pop .5s cubic-bezier(.2,1.5,.4,1) forwards; }
      .ns-fade  { opacity: 0; animation: ns-fade .5s ease forwards; }
      .ns-drawn { stroke-dasharray: 1600; stroke-dashoffset: 1600; animation: ns-draw .85s ease forwards; }
      .ns-reveal { opacity: 0; transform-box: fill-box; transform-origin: left center; animation: ns-reveal .6s cubic-bezier(.2,.7,.3,1) forwards; }
      .ns-hot   { animation: ns-pulse 1.3s ease-in-out infinite; }
      @keyframes ns-unfold { from { opacity: 0; transform: translateY(-7px); } to { opacity: 1; transform: none; } }
      @keyframes ns-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      @keyframes ns-drop { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; } }
      @keyframes ns-pop { 0% { opacity: 0; transform: scale(.5); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes ns-fade { to { opacity: 1; } }
      @keyframes ns-draw { to { stroke-dashoffset: 0; } }
      @keyframes ns-reveal { from { opacity: 0; transform: scaleX(.02); } to { opacity: 1; transform: scaleX(1); } }
      @keyframes ns-pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
      @media (prefers-reduced-motion: reduce) {
        .ns-unfold, .ns-rise, .ns-drop, .ns-pop, .ns-fade, .ns-reveal { animation: none; opacity: 1; transform: none; }
        .ns-drawn { animation: none; stroke-dashoffset: 0; }
        .ns-hot { animation: none; }
      }
    </style>
  </defs>`;
}

export function canvas() {
  // transparent base — the .scene-box already paints the themed --scene-bg gradient
  return `<rect x="0" y="0" width="${VW}" height="${VH}" fill="url(#ns-dots)"/>`;
}

function glyph(name, x, y, size, varName) {
  const raw = icon(name) || '';
  return raw.replace('<svg', `<svg x="${x}" y="${y}" width="${size}" height="${size}" style="color:var(${varName})"`);
}

/* rounded-top rect path (both top corners rounded, bottom square) */
function roundedTop(x, y, w, h, r) {
  return `M${x} ${y + h} V${y + r} a${r} ${r} 0 0 1 ${r} ${-r} H${x + w - r} a${r} ${r} 0 0 1 ${r} ${r} V${y + h} Z`;
}

/* ── a DOCUMENT card: a nested JSON tree that unfolds ──────────────────────────
   opts: { name, icon, tone, w, delay,
           lines: [ { k, v, depth, embed, ref, hot } ] }
   A line is one row of the document. `k` is the key (may be absent for a bare
   brace/bracket line), `v` is the value text (scalar, "{", "}", "[ … ]", etc.).
   depth indents by 20px. embed → violet dashed row bg (an embedded sub-doc).
   ref → a "→ ref" pill at the right + a right-edge anchor. hot → amber row bg.
   returns anchors: { svg, x, y, w, h, cx, cy, left, right, top, bottom,
                      headCy, lineY(i), refAnchor(i) } */
export function docCard(x, y, opts = {}) {
  const HEAD = 40, LINE = 26, PADV = 10;
  const lines = opts.lines || [];
  const w = opts.w || 300;
  const tv = toneVar(opts.tone);
  const h = HEAD + PADV + lines.length * LINE + PADV;
  const delay = opts.delay || 0;

  let s = `<g class="ns-rise" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-card" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" filter="url(#ns-shadow)"/>`;
  s += `<path class="ns-head" d="${roundedTop(x, y, w, HEAD, 14)}" fill="color-mix(in srgb, var(${tv}) 15%, var(--surface))"/>`;
  s += `<path class="ns-stripe" d="${roundedTop(x, y, w, 4, 14)}" fill="var(${tv})"/>`;
  s += glyph(opts.icon || 'file', x + 14, y + HEAD / 2 - 8, 17, tv);
  s += `<text class="ns-title" x="${x + 38}" y="${y + HEAD / 2 + 5}">${esc(opts.name || 'document')}</text>`;

  const lineY = (i) => y + HEAD + PADV + i * LINE + LINE / 2;
  lines.forEach((ln, i) => {
    const cy = lineY(i);
    const d = (delay + 0.18 + i * 0.06).toFixed(2);
    const ind = x + 16 + (ln.depth || 0) * 20;
    s += `<g class="ns-unfold" style="animation-delay:${d}s">`;
    if (ln.embed) s += `<rect class="ns-embedbg" x="${x + 8 + (ln.depth || 0) * 20}" y="${cy - LINE / 2 + 2}" width="${w - 16 - (ln.depth || 0) * 20}" height="${LINE - 4}" rx="6"/>`;
    else if (ln.hot) s += `<rect class="ns-hotbg" x="${x + 6}" y="${cy - LINE / 2 + 2}" width="${w - 12}" height="${LINE - 4}" rx="6"/>`;
    if (ln.k != null) {
      s += `<text class="ns-key" x="${ind}" y="${cy + 4.5}">${esc(ln.k)}<tspan class="ns-punct">:</tspan></text>`;
      const vx = ind + (String(ln.k).length + 1) * 7.9 + 8;
      if (ln.v != null) s += `<text class="${ln.ref ? 'ns-punct' : 'ns-val'}" x="${vx}" y="${cy + 4.5}">${esc(ln.v)}</text>`;
    } else if (ln.v != null) {
      s += `<text class="ns-punct" x="${ind}" y="${cy + 4.5}">${esc(ln.v)}</text>`;
    }
    if (ln.ref) s += `<g>${pillRaw(x + w - 58, cy - 10, 48, 20, 'ref', 'violet')}</g>`;
    s += `</g>`;
  });
  s += `</g>`;

  return {
    svg: s, x, y, w, h,
    cx: x + w / 2, cy: y + h / 2,
    left: x, right: x + w, top: y, bottom: y + h,
    headCy: y + HEAD / 2,
    lineY,
    refAnchor: (i) => ({ x: x + w, y: lineY(i), side: 'right' }),
  };
}

/* small solid-tinted pill used as a tag/badge (returns raw svg string) */
function pillRaw(x, y, w, h, text, tone) {
  const tv = toneVar(tone);
  let s = `<rect class="ns-pill" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="color-mix(in srgb, var(${tv}) 20%, var(--surface))"/>`;
  s += `<text class="ns-pillt" x="${x + w / 2}" y="${y + h / 2 + 3.5}" text-anchor="middle" style="fill:var(${tv})">${esc(text)}</text>`;
  return s;
}
/* public tag pill with its own pop animation */
export function tag(cx, cy, text, opts = {}) {
  const w = opts.w || Math.max(34, text.length * 7.4 + 18), h = 20;
  const delay = opts.delay || 0;
  return `<g class="ns-pop" style="animation-delay:${delay}s">${pillRaw(cx - w / 2, cy - h / 2, w, h, text, opts.tone || 'accent')}</g>`;
}

/* ── a KEY→VALUE store: a titled stack of [ key │ value ] slots ────────────────
   opts: { title, icon, tone, w, delay, rows: [ { k, v, hot } ] }
   hot → the slot glows (an O(1) GET landing). keyW is the key-cell width.
   returns { svg, x, y, w, h, left, right, top, bottom, rowCy(i) } */
export function kvStore(x, y, opts = {}) {
  const HEAD = opts.title ? 34 : 6, ROW = 34, PAD = 8;
  const rows = opts.rows || [];
  const w = opts.w || 320;
  const keyW = opts.keyW || Math.round(w * 0.42);
  const tv = toneVar(opts.tone);
  const h = HEAD + PAD + rows.length * ROW + PAD;
  const delay = opts.delay || 0;

  let s = `<g class="ns-rise" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-card" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" filter="url(#ns-shadow)"/>`;
  if (opts.title) {
    s += `<path class="ns-head" d="${roundedTop(x, y, w, HEAD, 13)}" fill="color-mix(in srgb, var(${tv}) 13%, var(--surface))"/>`;
    s += glyph(opts.icon || 'key', x + 12, y + HEAD / 2 - 7, 15, tv);
    s += `<text class="ns-title" x="${x + 34}" y="${y + HEAD / 2 + 5}" style="font-size:13px">${esc(opts.title)}</text>`;
  }
  const rowCy = (i) => y + HEAD + PAD + i * ROW + ROW / 2;
  rows.forEach((r, i) => {
    const ry = y + HEAD + PAD + i * ROW, cy = rowCy(i);
    const d = (delay + 0.16 + i * 0.07).toFixed(2);
    s += `<g class="ns-drop" style="animation-delay:${d}s"${r.hot ? ' filter="url(#ns-shadow)"' : ''}>`;
    s += `<rect class="ns-kv-khole${r.hot ? '' : ''}" x="${x + 8}" y="${ry + 3}" width="${keyW}" height="${ROW - 6}" rx="7"${r.hot ? ' style="stroke:var(--accent);stroke-width:1.8"' : ''}/>`;
    s += `<rect class="ns-kv-v" x="${x + 8 + keyW + 6}" y="${ry + 3}" width="${w - keyW - 28}" height="${ROW - 6}" rx="7"/>`;
    s += `<text class="ns-kv-kt" x="${x + 18}" y="${cy + 4.5}">${esc(r.k)}</text>`;
    s += `<text class="ns-kv-vt" x="${x + 8 + keyW + 16}" y="${cy + 4.5}">${esc(r.v)}</text>`;
    s += `</g>`;
  });
  s += `</g>`;
  return { svg: s, x, y, w, h, cx: x + w / 2, cy: y + h / 2, left: x, right: x + w, top: y, bottom: y + h, rowCy };
}

/* ── a PARTITION bucket: a bin that items route into and sort within ───────────
   opts: { label, sub, tone, w, h, delay, hot, items: [ { t, tone, hot } ] }
   label = the partition-key value. items stack from the top, each ns-drop'd.
   hot → red stroke + a pulsing glow (a hot partition).
   returns { svg, x, y, w, h, cx, left, right, top, bottom, headCy, slotCy(i) } */
export function partition(x, y, opts = {}) {
  const HEAD = 30, SLOT = 28, PAD = 10;
  const items = opts.items || [];
  const w = opts.w || 200;
  const h = opts.h || (HEAD + PAD + Math.max(items.length, 1) * SLOT + PAD);
  const tv = toneVar(opts.tone);
  const delay = opts.delay || 0;

  let s = `<g class="ns-rise" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-bin${opts.hot ? ' ns-bin--hot' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"${opts.hot ? ' filter="url(#ns-glow)"' : ''}/>`;
  s += `<text class="ns-binsub" x="${x + 12}" y="${y + 13}">${esc(opts.sub || 'partition')}</text>`;
  s += `<text class="ns-binlabel" x="${x + 12}" y="${y + 27}">${esc(opts.label || '')}</text>`;
  if (opts.hot) s += `<g class="ns-hot">${glyph('bolt', x + w - 26, y + 7, 16, '--red')}</g>`;
  const slotCy = (i) => y + HEAD + PAD + i * SLOT + SLOT / 2;
  items.forEach((it, i) => {
    const iy = y + HEAD + PAD + i * SLOT, cy = slotCy(i);
    const d = (delay + 0.25 + i * 0.09).toFixed(2);
    const itv = toneVar(it.tone || opts.tone);
    s += `<g class="ns-drop" style="animation-delay:${d}s">`;
    s += `<rect class="ns-item" x="${x + 10}" y="${iy + 2}" width="${w - 20}" height="${SLOT - 5}" rx="7" style="stroke:color-mix(in srgb, var(${itv}) 45%, var(--line))"/>`;
    if (it.hot) s += `<rect x="${x + 10}" y="${iy + 2}" width="4" height="${SLOT - 5}" rx="2" fill="var(${itv})"/>`;
    s += `<text class="ns-itemt" x="${x + 22}" y="${cy + 4}">${esc(it.t)}</text>`;
    s += `</g>`;
  });
  s += `</g>`;
  return { svg: s, x, y, w, h, cx: x + w / 2, cy: y + h / 2, left: x, right: x + w, top: y, bottom: y + h, headCy: y + HEAD / 2, slotCy };
}

/* ── an ITEM row: PK + SK tags, heterogeneous cells, a type badge ──────────────
   For single-table / wide-column design. Stack many to form an item collection.
   opts: { pk, sk, type, tone, w, delay, hot, cells: [ 'k=v', ... ] }
   returns { svg, x, y, w, h, cx, cy, left, right, top, bottom } */
export function itemRow(x, y, opts = {}) {
  const H = 38, w = opts.w || 560;
  const tv = toneVar(opts.tone);
  const delay = opts.delay || 0;
  const cy = y + H / 2;
  let s = `<g class="ns-drop" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-item" x="${x}" y="${y}" width="${w}" height="${H}" rx="9" filter="url(#ns-shadow)"${opts.hot ? ' style="stroke:var(--accent);stroke-width:1.8"' : ''}/>`;
  s += `<rect x="${x}" y="${y}" width="5" height="${H}" rx="2.5" fill="var(${tv})"/>`;
  let cx = x + 16;
  if (opts.pk != null) { const pw = Math.max(40, String(opts.pk).length * 7.2 + 26); s += pkTag(cx, cy, pw, 'PK', opts.pk, 'accent'); cx += pw + 8; }
  if (opts.sk != null) { const sw = Math.max(40, String(opts.sk).length * 7.2 + 26); s += pkTag(cx, cy, sw, 'SK', opts.sk, 'violet'); cx += sw + 12; }
  if (opts.cells) s += `<text class="ns-itemt" x="${cx}" y="${cy + 4}" style="fill:var(--ink-2)">${esc(opts.cells.join('   ·   '))}</text>`;
  if (opts.type != null) { const bw = Math.max(44, String(opts.type).length * 7 + 18); s += pillRaw(x + w - bw - 10, cy - 10, bw, 20, opts.type, opts.tone || 'slate'); }
  s += `</g>`;
  return { svg: s, x, y, w, h: H, cx: x + w / 2, cy, left: x, right: x + w, top: y, bottom: y + H };
}
/* a labelled key tag: [LABEL  value] used inside item rows */
function pkTag(x, cy, w, label, val, tone) {
  const tv = toneVar(tone), y = cy - 11, h = 22, lw = label.length * 7 + 10;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="color-mix(in srgb, var(${tv}) 12%, var(--surface))" stroke="color-mix(in srgb, var(${tv}) 40%, var(--line))" stroke-width="1"/>`;
  s += `<text class="ns-pillt" x="${x + 6}" y="${cy + 3.5}" style="fill:var(${tv})">${esc(label)}</text>`;
  s += `<text class="ns-itemt" x="${x + lw}" y="${cy + 4}" style="font-size:11.5px">${esc(val)}</text>`;
  return s;
}

/* ── an ACCESS-PATTERN list: the questions the app asks, which drive the model ──
   opts: { title, tone, w, delay, patterns: [ { t, done, hot } ] } */
export function accessList(x, y, opts = {}) {
  const HEAD = 34, ROW = 32, PAD = 8;
  const ps = opts.patterns || [];
  const w = opts.w || 360;
  const tv = toneVar(opts.tone || 'accent');
  const h = HEAD + PAD + ps.length * ROW + PAD;
  const delay = opts.delay || 0;
  let s = `<g class="ns-rise" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-card" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" filter="url(#ns-shadow)"/>`;
  s += `<path class="ns-head" d="${roundedTop(x, y, w, HEAD, 13)}" fill="color-mix(in srgb, var(${tv}) 13%, var(--surface))"/>`;
  s += glyph(opts.icon || 'target', x + 12, y + HEAD / 2 - 7, 15, tv);
  s += `<text class="ns-title" x="${x + 34}" y="${y + HEAD / 2 + 5}" style="font-size:13px">${esc(opts.title || 'Access patterns')}</text>`;
  ps.forEach((p, i) => {
    const cy = y + HEAD + PAD + i * ROW + ROW / 2;
    const d = (delay + 0.18 + i * 0.08).toFixed(2);
    s += `<g class="ns-unfold" style="animation-delay:${d}s">`;
    if (p.hot) s += `<rect class="ns-hotbg" x="${x + 6}" y="${cy - ROW / 2 + 2}" width="${w - 12}" height="${ROW - 4}" rx="7"/>`;
    s += glyph(p.done ? 'check' : 'chevron', x + 14, cy - 7, 14, p.done ? '--green' : '--ink-2');
    s += `<text class="ns-key" x="${x + 36}" y="${cy + 4.5}" style="font-family:var(--sans);font-weight:500;font-size:12.5px">${esc(p.t)}</text>`;
    s += `</g>`;
  });
  s += `</g>`;
  return { svg: s, x, y, w, h, cx: x + w / 2, cy: y + h / 2, left: x, right: x + w, top: y, bottom: y + h, rowCy: (i) => y + HEAD + PAD + i * ROW + ROW / 2 };
}

/* ── a SWEEP: a translucent band that reveals an item collection in one read ─── */
export function sweep(x, y, w, h, opts = {}) {
  const delay = opts.delay || 0;
  let s = `<g class="ns-reveal" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-sweep" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
  s += `</g>`;
  if (opts.label) s += tag(x + w / 2, y - 2, opts.label, { tone: 'accent', delay: delay + 0.35 });
  return s;
}

/* ── a straight/elbow routing ARROW with an arrowhead (ref, routing, fan-out) ── */
export function arrow(a, b, opts = {}) {
  const dx = Math.max(30, Math.abs(b.x - a.x) * 0.45);
  const ax2 = a.x + (a.side === 'left' ? -dx : dx);
  const bx2 = b.x + (b.side === 'left' ? -dx : dx);
  const d = `M${a.x} ${a.y} C${ax2} ${a.y} ${bx2} ${b.y} ${b.x} ${b.y}`;
  const delay = opts.delay || 0;
  const cls = `ns-conn ns-drawn${opts.ghost ? ' ns-conn--ghost' : ''}`;
  let s = `<path class="${cls}" d="${d}" marker-end="url(#ns-arrow)" style="animation-delay:${delay}s"/>`;
  let mid = null;
  if (opts.label) { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; s += chip(mx, my, opts.label, { delay: delay + 0.45 }); mid = { x: mx, y: my }; }
  return { svg: s, d, mid };
}

/* ── shared helpers (chip / band / caption) — same look as schema2d ──────────── */
export function chip(cx, cy, text, opts = {}) {
  const padX = 11, iconW = opts.icon ? 18 : 0;
  const w = opts.w || Math.max(44, text.length * 7.2 + iconW + padX * 2);
  const h = 26, x = cx - w / 2, y = cy - h / 2;
  const delay = opts.delay || 0;
  let s = `<g class="ns-pop" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-chip" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" filter="url(#ns-shadow)"/>`;
  if (opts.icon) s += glyph(opts.icon, x + padX, cy - 8, 16, opts.iconVar || '--accent');
  s += `<text class="ns-chipt" x="${x + padX + iconW}" y="${cy + 4.5}">${esc(text)}</text>`;
  s += `</g>`;
  return s;
}
export function band(x, y, w, h, label, opts = {}) {
  const delay = opts.delay || 0;
  let s = `<g class="ns-fade" style="animation-delay:${delay}s">`;
  s += `<rect class="ns-band" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>`;
  s += `<text class="ns-bandt" x="${x + 18}" y="${y + 24}">${esc(label)}</text>`;
  if (opts.sub) s += `<text class="ns-bands" x="${x + 18}" y="${y + 42}">${esc(opts.sub)}</text>`;
  s += `</g>`;
  return s;
}
export function caption(cx, y, text, opts = {}) {
  const delay = opts.delay || 0;
  return `<text class="ns-cap ns-fade" x="${cx}" y="${y}" text-anchor="middle" style="animation-delay:${delay}s">${esc(text)}</text>`;
}

/* assemble the final SVG in a stable layer order. Returns the shell contract
   { svg, layer, rail, flows, note }. Motion is CSS, so flows stays empty. */
export function assemble({ slug, aria, body, note }) {
  const svgStr = `
  <svg class="scene scene--${slug}" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="${esc(aria || '')}">
    ${nosqlDefs()}
    ${canvas()}
    <g class="ns-stage">${body}</g>
    <g class="flow-layer"></g>
  </svg>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = svgStr;
  const svg = wrap.querySelector('svg');
  return { svg, layer: svg.querySelector('.flow-layer'), rail: () => null, flows: [], note: note || '' };
}
