/* iso3d.js — the "Designed to Scale" isometric visual vocabulary, rebuilt to
   match the original Storage-Engines renderer (designed-to-scale.vercel.app).

   The signature form is a ROUNDED ISOMETRIC CUBE: a 2:1 iso prism with every
   outer corner rounded (a rounded hexagon silhouette), three-tone face shading
   (top lightest → left → right darkest), a crisp near-black warm outline with
   round joins, a soft blurred ground shadow, an icon glyph on the top face and
   a label on the body. Palette sampled pixel-exact from the original.

   Exports: iso3dDefs(), isoCube(), isoTile(), pill(), edge(), region(),
   isoGrid(), PAL, ISO. */

import { ICON_PATHS } from './icons.js';

/* ── geometry helpers ─────────────────────────────────────────────────── */
const A = (n) => Math.round(n * 100) / 100;          // trim float noise
const V = (x, y) => ({ x, y });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const OUTLINE = '#26211b';   // sampled ~#211e1b, warmed a touch
let _uid = 0;

/* face fills, sampled from the original scene (top / left / right) */
export const PAL = {
  blue:  { t: '#e3ecf8', l: '#afc8e8', r: '#a1bbd9' },   // App / client
  green: { t: '#e2f0d7', l: '#b3d6a1', r: '#a5ca92' },   // MemTable (in RAM)
  amber: { t: '#fcf0d4', l: '#f3cd86', r: '#e8bf76' },   // Log / WAL
  lilac: { t: '#ece4f6', l: '#d2c4ec', r: '#c5b6e3' },   // SSTable (on disk)
  rose:  { t: '#f7e2df', l: '#e7b2ab', r: '#de9f97' },   // probed / hot
  slate: { t: '#eaeef3', l: '#c3ccd7', r: '#b5bfcc' },   // neutral
};

/* closed rounded path through polygon points (corner-cutting with quadratics) */
function rpath(pts, r) {
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const a = V(p1.x + (p0.x - p1.x) / d1 * rr, p1.y + (p0.y - p1.y) / d1 * rr);
    const b = V(p1.x + (p2.x - p1.x) / d2 * rr, p1.y + (p2.y - p1.y) / d2 * rr);
    d += (i === 0 ? `M${A(a.x)} ${A(a.y)}` : `L${A(a.x)} ${A(a.y)}`);
    d += ` Q${A(p1.x)} ${A(p1.y)} ${A(b.x)} ${A(b.y)}`;
  }
  return d + 'Z';
}

/* open rounded polyline (for routed connectors) */
function rpolyline(pts, r) {
  if (pts.length < 2) return '';
  let d = `M${A(pts[0].x)} ${A(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const a = V(p1.x + (p0.x - p1.x) / d1 * rr, p1.y + (p0.y - p1.y) / d1 * rr);
    const b = V(p1.x + (p2.x - p1.x) / d2 * rr, p1.y + (p2.y - p1.y) / d2 * rr);
    d += ` L${A(a.x)} ${A(a.y)} Q${A(p1.x)} ${A(p1.y)} ${A(b.x)} ${A(b.y)}`;
  }
  const e = pts[pts.length - 1];
  d += ` L${A(e.x)} ${A(e.y)}`;
  return d;
}

/* a nested, upright SVG icon centred on (cx,cy) — stroke uses currentColor */
function iconSvg(name, cx, cy, size, cls = 'iso-ic') {
  const p = ICON_PATHS[name] || '';
  return `<svg class="${cls}" x="${A(cx - size / 2)}" y="${A(cy - size / 2)}" width="${A(size)}" height="${A(size)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

/* ── defs: shadow blur, halo glow, arrow marker, grid fade ─────────────── */
export function iso3dDefs() {
  return `<defs>
    <filter id="iso-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
    </filter>
    <filter id="iso-halo" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="9"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="arrow-fill" d="M1 1 L9 5 L1 9 Z"/>
    </marker>
    <radialGradient id="grid-fade" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="62%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="grid-mask"><rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#grid-fade)"/></mask>
  </defs>`;
}

/* ── the rounded isometric cube ────────────────────────────────────────── *
 * cx,cy  = centre of the TOP rhombus;  rx = half-width;  bodyH = prism height
 * opts: { icon, label, sub, halo, ghost, pulse, r }
 * returns { shadow, halo, g, top, front, base, verts }                      */
export function isoCube(cx, cy, rx, bodyH, matName, opts = {}) {
  const m = PAL[matName] || PAL.slate;
  const ry = rx * 0.5;
  const uid = 'cb' + (_uid++);
  const r = opts.r != null ? opts.r : Math.min(16, rx * 0.16);

  const N = V(cx, cy - ry), E = V(cx + rx, cy), S = V(cx, cy + ry), W = V(cx - rx, cy);
  const Eb = V(cx + rx, cy + bodyH), Sb = V(cx, cy + ry + bodyH), Wb = V(cx - rx, cy + bodyH);
  const sil = [N, E, Eb, Sb, Wb, W];
  const topf = [N, E, S, W], leftf = [W, S, Sb, Wb], rightf = [E, Eb, Sb, S];
  const poly = pts => pts.map(p => `${A(p.x)},${A(p.y)}`).join(' ');
  const clip = rpath(sil, r);

  const shY = cy + bodyH + ry * 0.58;
  const shadow = `<ellipse class="iso-shadow" cx="${A(cx)}" cy="${A(shY)}" rx="${A(rx * 1.0)}" ry="${A(ry * 0.52)}" filter="url(#iso-shadow)"/>`;
  const halo = opts.halo
    ? `<ellipse class="iso-halo halo--${matName}" cx="${A(cx)}" cy="${A(cy + bodyH * 0.42)}" rx="${A(rx * 1.12)}" ry="${A((ry + bodyH) * 0.62)}" filter="url(#iso-halo)"/>`
    : '';

  const faces = `<g clip-path="url(#${uid})">
      <polygon points="${poly(leftf)}" fill="${m.l}"/>
      <polygon points="${poly(rightf)}" fill="${m.r}"/>
      <polygon points="${poly(topf)}" fill="${m.t}"/>
      <polygon points="${poly([N, E, S, W])}" fill="#fff" opacity=".10"/>
    </g>`;
  const seam = `<path class="iso-seam" d="M${A(W.x)} ${A(W.y)} L${A(S.x)} ${A(S.y)} L${A(E.x)} ${A(E.y)} M${A(S.x)} ${A(S.y)} L${A(Sb.x)} ${A(Sb.y)}"/>`;
  const outline = `<path class="iso-outline" d="${clip}"/>`;

  const glyph = opts.icon ? iconSvg(opts.icon, cx, cy - ry * 0.02, opts.iconSize || Math.min(30, rx * 0.44)) : '';

  // the front is full-width only between the top rhombus (cy+ry) and the bottom
  // corners (cy+bodyH); below that it tapers to a point. Centre the label block
  // inside that band so text never crosses the tapering edges.
  const bandMid = cy + (ry + bodyH) / 2;
  const lblY = opts.sub ? bandMid - 3 : bandMid + 5;
  let label = '';
  if (opts.label) {
    label = `<text class="iso-label" x="${A(cx)}" y="${A(lblY)}" text-anchor="middle">${esc(opts.label)}</text>`;
    if (opts.sub) label += `<text class="iso-sub" x="${A(cx)}" y="${A(lblY + 16)}" text-anchor="middle">${esc(opts.sub)}</text>`;
  }
  const bodyMid = bandMid;

  const cls = 'iso-cube' + (opts.ghost ? ' is-ghost' : '') + (opts.pulse ? ' is-pulse' : '');
  const g = `<g class="${cls}"><defs><clipPath id="${uid}"><path d="${clip}"/></clipPath></defs>${faces}${seam}${outline}${glyph}${label}</g>`;

  return {
    shadow, halo, g,
    top: [cx, cy], front: [cx, bodyMid], base: [cx, cy + ry + bodyH],
    verts: { N, E, S, W, Eb, Sb, Wb }, rx, ry, bodyH,
  };
}

/* a flat SSTable tile — a short, wide rounded cube, no icon/label */
export function isoTile(cx, cy, rx, matName, opts = {}) {
  return isoCube(cx, cy, rx, opts.h != null ? opts.h : rx * 0.34, matName, {
    r: opts.r != null ? opts.r : Math.min(11, rx * 0.2),
    ghost: opts.ghost, pulse: opts.pulse, halo: opts.halo,
  });
}

/* ── rounded pill badge with optional icon ─────────────────────────────── */
export function pill(cx, cy, text, opts = {}) {
  const h = 30, padX = 13, iconW = opts.icon ? 20 : 0;
  const w = Math.max(opts.w || 0, text.length * 7.3 + iconW + padX * 2);
  const x = cx - w / 2, y = cy - h / 2;
  const ic = opts.icon ? iconSvg(opts.icon, x + padX + 7, cy, 15, 'iso-pill__ic') : '';
  const tx = x + padX + iconW;
  return `<g class="iso-pill ${opts.cls || ''}">
    <rect x="${A(x)}" y="${A(y)}" width="${A(w)}" height="${h}" rx="${h / 2}"/>
    ${ic}
    <text class="iso-pill__t" x="${A(tx)}" y="${A(cy + 4.5)}">${esc(text)}</text>
  </g>`;
}

/* ── routed connector edge (thick, rounded elbows, optional arrow/dash) ─── */
export function edge(pts, opts = {}) {
  const d = rpolyline(pts, opts.r || 16);
  const cls = 'iso-edge' + (opts.dashed ? ' is-dashed' : '') + (opts.cls ? ' ' + opts.cls : '');
  const marker = opts.arrow ? ' marker-end="url(#arrow)"' : '';
  return { guide: `<path class="${cls}" d="${d}"${marker}/>`, d };
}

/* ── dashed logical region with an optional (rotatable) label ───────────── */
export function region(x, y, w, h, label, opts = {}) {
  const r = opts.r || 20;
  let t = '';
  if (label) {
    const cxm = x + w / 2, cym = y + h / 2, rot = opts.rot || 0;
    t = `<text class="iso-region__t" x="${A(cxm)}" y="${A(cym)}" text-anchor="middle" transform="rotate(${rot} ${A(cxm)} ${A(cym)})">${esc(label)}</text>`;
  }
  return `<g class="iso-region"><rect x="${A(x)}" y="${A(y)}" width="${A(w)}" height="${A(h)}" rx="${r}"/>${t}</g>`;
}

/* ── faint isometric ground grid, radially faded at the edges ──────────── */
export function isoGrid(cx, cy, cols, rows, cell) {
  const UX = 0.866, UY = 0.5;
  let lines = '';
  const w = cols * cell, hgt = rows * cell;
  for (let i = -rows; i <= rows; i++) {
    const oy = i * cell;
    lines += `<line x1="${A(cx - w * UX)}" y1="${A(cy + oy - w * UY)}" x2="${A(cx + w * UX)}" y2="${A(cy + oy + w * UY)}"/>`;
  }
  for (let i = -cols; i <= cols; i++) {
    const ox = i * cell;
    lines += `<line x1="${A(cx + ox * UX)}" y1="${A(cy - ox * UY - hgt * UY)}" x2="${A(cx + ox * UX)}" y2="${A(cy - ox * UY + hgt * UY)}"/>`;
  }
  return `<g class="iso-grid" mask="url(#grid-mask)">${lines}</g>`;
}

export const ISO = { A, V };
