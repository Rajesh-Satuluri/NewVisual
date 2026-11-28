/* schema2d.js — the Data Modeling visual vocabulary.

   Unlike the db-scale course (isometric 3D "machinery"), data modeling is about
   logical STRUCTURE, so this is a flat, top-down "schema canvas" — the surface a
   modeler draws on. Tables are flat cards (a tinted header + typed rows),
   relationships are self-drawing connectors with crow's-foot cardinality, keys
   are badges. Motion is CSS, keyed off a fresh mount each step: cards rise in,
   connectors draw on, keys/chips pop-and-settle. No particle flows.

   Everything returns plain SVG strings the scene assembles. Coordinates are in a
   0 0 1040 600 viewBox. Colors come from the shared theme tokens, so light/dark
   just work. */

import { icon } from './icons.js';

export const VW = 1040, VH = 600;
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const HEAD_H = 42, ROW_H = 32;

/* tone → the accent CSS variable used for header tint, stripe and icon */
const TONE = { slate: '--ink-2', accent: '--accent', amber: '--amber', green: '--green', violet: '--violet', rose: '--red' };
const toneVar = (t) => TONE[t] || TONE.slate;

/* ── defs: patterns, filters, crow's-foot markers, and all animation CSS ─────── */
export function schema2dDefs() {
  return `<defs>
    <pattern id="sc-dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" class="sc-dot"/>
    </pattern>
    <filter id="sc-shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="var(--shadow, rgba(16,24,40,.14))" flood-opacity="1"/>
    </filter>
    <marker id="sc-many" viewBox="0 0 12 14" refX="11" refY="7" markerWidth="12" markerHeight="14" orient="auto-start-reverse">
      <path d="M1 1 L11 7 L1 13" class="sc-foot"/>
    </marker>
    <marker id="sc-one" viewBox="0 0 10 14" refX="7" refY="7" markerWidth="10" markerHeight="14" orient="auto-start-reverse">
      <path d="M5 2 V12" class="sc-foot"/>
    </marker>
    <style>
      .sc-canvas { fill: var(--scene-bg, #f7f8fa); }
      .sc-dot { fill: var(--line-2, #d6dae1); opacity: .5; }
      .sc-card { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.2; }
      .sc-head { stroke: none; }
      .sc-stripe { stroke: none; }
      .sc-ename { fill: var(--ink, #15202b); font: 700 16px var(--sans, system-ui); }
      .sc-rowname { fill: var(--ink, #15202b); font: 500 14px var(--sans, system-ui); }
      .sc-rowname.pk { font-weight: 700; }
      .sc-rowtype { fill: var(--ink-2, #6b7682); font: 500 12.5px var(--mono, ui-monospace); }
      .sc-div { stroke: var(--line, #eceef1); stroke-width: 1; }
      .sc-rowhot { fill: color-mix(in srgb, var(--accent) 12%, transparent); }
      .sc-badge { font: 700 10px var(--sans, system-ui); }
      .sc-glyph { width: 14px; height: 14px; }
      .sc-conn { fill: none; stroke: var(--accent, #1f9d72); stroke-width: 2.4; }
      .sc-conn--ghost { stroke: var(--ink-2, #8a94a0); stroke-dasharray: 5 5; }
      .sc-foot { fill: none; stroke: var(--accent, #1f9d72); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
      .sc-chip { fill: var(--surface, #fff); stroke: var(--line, #e3e6ea); stroke-width: 1.2; }
      .sc-chip__t { fill: var(--ink, #15202b); font: 700 12px var(--sans, system-ui); }
      .sc-cap { fill: var(--ink-2, #6b7682); font: 500 13px var(--sans, system-ui); }
      .sc-band { fill: color-mix(in srgb, var(--accent) 4%, var(--surface)); stroke: var(--line, #e3e6ea); stroke-width: 1.2; stroke-dasharray: 2 5; }
      .sc-band__t { fill: var(--ink, #15202b); font: 700 13px var(--sans, system-ui); letter-spacing: .04em; text-transform: uppercase; }
      .sc-band__s { fill: var(--ink-2, #6b7682); font: 500 12px var(--sans, system-ui); }

      .sc-rise { opacity: 0; animation: sc-rise .5s cubic-bezier(.2,.7,.3,1) forwards; }
      .sc-row { opacity: 0; animation: sc-rowin .4s ease forwards; }
      .sc-pop { opacity: 0; transform-box: fill-box; transform-origin: center; animation: sc-pop .5s cubic-bezier(.2,1.5,.4,1) forwards; }
      .sc-drawn { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: sc-draw .8s ease forwards; }
      .sc-fade { opacity: 0; animation: sc-fade .5s ease forwards; }
      @keyframes sc-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      @keyframes sc-rowin { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
      @keyframes sc-pop { 0% { opacity: 0; transform: scale(.5); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes sc-draw { to { stroke-dashoffset: 0; } }
      @keyframes sc-fade { to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .sc-rise, .sc-row, .sc-pop, .sc-fade { animation: none; opacity: 1; transform: none; }
        .sc-drawn { animation: none; stroke-dashoffset: 0; }
      }
    </style>
  </defs>`;
}

export function canvas() {
  // transparent base — the .scene-box already paints the themed --scene-bg
  // gradient; we overlay only the dot grid.
  return `<rect x="0" y="0" width="${VW}" height="${VH}" fill="url(#sc-dots)"/>`;
}

/* glyph helper — an engine icon sized for the canvas, tinted to a tone var */
function glyph(name, x, y, size, varName) {
  const raw = icon(name) || '';
  const svg = raw.replace('<svg', `<svg x="${x}" y="${y}" width="${size}" height="${size}" style="color:var(${varName})"`);
  return svg;
}

/* ── a flat table/entity card ────────────────────────────────────────────────
   opts: { name, icon, tone, cols:[{name,type,key,fk,hot,ghost}], delay, w }
   returns anchors: { svg, x, y, w, h, cx, cy, left, right, top, bottom,
                      headCy, rowCy(i) } */
export function tableCard(x, y, opts = {}) {
  const w = opts.w || 250;
  const cols = opts.cols || [];
  const tv = toneVar(opts.tone);
  const h = HEAD_H + cols.length * ROW_H;
  const delay = opts.delay || 0;
  const style = `style="animation-delay:${delay}s"`;

  let s = `<g class="sc-rise" ${style}>`;
  // card body + shadow
  s += `<rect class="sc-card" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" filter="url(#sc-shadow)"/>`;
  // header: tinted fill + top accent stripe
  s += `<path class="sc-head" d="${roundedTop(x, y, w, HEAD_H, 13)}" fill="color-mix(in srgb, var(${tv}) 15%, var(--surface))"/>`;
  s += `<path class="sc-stripe" d="${roundedTop(x, y, w, 4, 13)}" fill="var(${tv})"/>`;
  s += glyph(opts.icon || 'grid', x + 14, y + HEAD_H / 2 - 9, 18, tv);
  s += `<text class="sc-ename" x="${x + 40}" y="${y + HEAD_H / 2 + 6}">${esc(opts.name || '')}</text>`;

  cols.forEach((c, i) => {
    const ry = y + HEAD_H + i * ROW_H;
    const mid = ry + ROW_H / 2;
    const rowStyle = `style="animation-delay:${(delay + 0.12 + i * 0.07).toFixed(2)}s"`;
    s += `<g class="sc-row" ${rowStyle}${c.ghost ? ' opacity="0.45"' : ''}>`;
    if (c.hot) s += `<rect class="sc-rowhot" x="${x + 1.2}" y="${ry}" width="${w - 2.4}" height="${ROW_H}"/>`;
    if (i > 0) s += `<line class="sc-div" x1="${x + 12}" y1="${ry}" x2="${x + w - 12}" y2="${ry}"/>`;
    // left key/fk badge
    if (c.key) s += glyph('key', x + 14, mid - 7, 14, '--amber');
    else if (c.fk) s += glyph('merge', x + 14, mid - 7, 14, '--accent');
    const nameX = (c.key || c.fk) ? x + 36 : x + 16;
    s += `<text class="sc-rowname${c.key ? ' pk' : ''}" x="${nameX}" y="${mid + 5}">${esc(c.name)}</text>`;
    if (c.type) s += `<text class="sc-rowtype" x="${x + w - 14}" y="${mid + 5}" text-anchor="end">${esc(c.type)}</text>`;
    s += `</g>`;
  });
  s += `</g>`;

  return {
    svg: s, x, y, w, h,
    cx: x + w / 2, cy: y + h / 2,
    left: x, right: x + w, top: y, bottom: y + h,
    headCy: y + HEAD_H / 2,
    rowCy: (i) => y + HEAD_H + i * ROW_H + ROW_H / 2,
  };
}

/* rounded-top rect path (both top corners rounded, bottom square) */
function roundedTop(x, y, w, h, r) {
  return `M${x} ${y + h} V${y + r} a${r} ${r} 0 0 1 ${r} ${-r} H${x + w - r} a${r} ${r} 0 0 1 ${r} ${r} V${y + h} Z`;
}

/* ── a self-drawing relationship connector between two anchor points ──────────
   a, b: { x, y, side:'left'|'right' } edge anchors
   opts: { from:'one'|'many', to:'one'|'many', label, delay, ghost } */
export function connector(a, b, opts = {}) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  const ax2 = a.x + (a.side === 'left' ? -dx : dx);
  const bx2 = b.x + (b.side === 'left' ? -dx : dx);
  const d = `M${a.x} ${a.y} C${ax2} ${a.y} ${bx2} ${b.y} ${b.x} ${b.y}`;
  const delay = opts.delay || 0;
  const cls = `sc-conn sc-drawn${opts.ghost ? ' sc-conn--ghost' : ''}`;
  const markers = `${opts.from ? `marker-start="url(#sc-${opts.from})"` : ''} ${opts.to ? `marker-end="url(#sc-${opts.to})"` : ''}`;
  let s = `<path class="${cls}" d="${d}" ${markers} style="animation-delay:${delay}s"/>`;
  let mid = null;
  if (opts.label) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    s += chip(mx, my, opts.label, { delay: delay + 0.5 });
    mid = { x: mx, y: my };
  }
  return { svg: s, d, mid };
}

/* ── a flat chip (cardinality, badge, legend) ───────────────────────────────── */
export function chip(cx, cy, text, opts = {}) {
  const padX = 11, iconW = opts.icon ? 18 : 0;
  const w = opts.w || Math.max(44, text.length * 7.2 + iconW + padX * 2);
  const h = 26, x = cx - w / 2, y = cy - h / 2;
  const delay = opts.delay || 0;
  let s = `<g class="sc-pop" style="animation-delay:${delay}s">`;
  s += `<rect class="sc-chip" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" filter="url(#sc-shadow)"/>`;
  if (opts.icon) s += glyph(opts.icon, x + padX, cy - 8, 16, opts.iconVar || '--accent');
  s += `<text class="sc-chip__t" x="${x + padX + iconW}" y="${cy + 4.5}">${esc(text)}</text>`;
  s += `</g>`;
  return s;
}

/* ── a labelled level band (conceptual / logical / physical) ─────────────────── */
export function band(x, y, w, h, label, opts = {}) {
  const delay = opts.delay || 0;
  let s = `<g class="sc-fade" style="animation-delay:${delay}s">`;
  s += `<rect class="sc-band" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>`;
  s += `<text class="sc-band__t" x="${x + 18}" y="${y + 24}">${esc(label)}</text>`;
  if (opts.sub) s += `<text class="sc-band__s" x="${x + 18}" y="${y + 42}">${esc(opts.sub)}</text>`;
  s += `</g>`;
  return s;
}

export function caption(cx, y, text, opts = {}) {
  const delay = opts.delay || 0;
  return `<text class="sc-cap sc-fade" x="${cx}" y="${y}" text-anchor="middle" style="animation-delay:${delay}s">${esc(text)}</text>`;
}

/* assemble the final SVG in a stable layer order. Returns the shell contract
   { svg, layer, rail, flows, note }. Motion is CSS, so flows stays empty. */
export function assemble({ slug, aria, body, note }) {
  const svgStr = `
  <svg class="scene scene--${slug}" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="${esc(aria || '')}">
    ${schema2dDefs()}
    ${canvas()}
    <g class="sc-stage">${body}</g>
    <g class="flow-layer"></g>
  </svg>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = svgStr;
  const svg = wrap.querySelector('svg');
  return {
    svg,
    layer: svg.querySelector('.flow-layer'),
    rail: () => null,
    flows: [],
    note: note || '',
  };
}
