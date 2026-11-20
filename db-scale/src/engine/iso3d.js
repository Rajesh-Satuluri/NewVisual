/* iso3d.js — the polished isometric vocabulary, reverse-engineered from the
   "Designed to Scale" renderer: gradient-shaded faces, rounded corners, a soft
   blurred white sheen, blurred ground shadows, glossy cylinders with a sheen +
   rim highlight, and a faded iso grid. Everything is plain SVG strings.

   Geometry: a 2:1 isometric basis. Each form is anchored by the BACK-TOP corner
   of its top face in screen space (ax,ay); w = width along iso-x, d = depth along
   iso-y, h = vertical height (all screen px). */

const UX = 0.866, UY = 0.5;                 // iso basis (down-right / down-left)
const A = (n) => Math.round(n * 100) / 100;

/* pastel material gradients — copied from the original palette (vr) */
export const MATS = {
  blue:   { top: ['#dfebf9', '#cde0f5'], side: ['#bcd3ef', '#a9c5e8'] },
  green:  { top: ['#e2f2d7', '#d1e9c2'], side: ['#c3e1b2', '#b3d79f'] },
  yellow: { top: ['#fff3d6', '#fee7b8'], side: ['#fcdb9c', '#f6cd82'] },
  orange: { top: ['#fee6cc', '#fcd4ad'], side: ['#f9c697', '#f3b47f'] },
  purple: { top: ['#f2eaf9', '#e6dbf4'], side: ['#d9cbef', '#cbbae6'] },
  store:  { top: ['#f6f1fa', '#ece4f4'], side: ['#e2d8ee', '#d6c9e6'] },
  slab:   { top: ['#f7f0e7', '#f0e7dc'], side: ['#ece2d5', '#e3d7c8'] },
  teal:   { top: ['#d8f2ec', '#c3e9df'], side: ['#a9ddd0', '#92d0c0'] },
};

/* the <defs> block: one gradient pair per material + sheen + blur filters + grid fade */
export function iso3dDefs() {
  let g = '';
  for (const [m, c] of Object.entries(MATS)) {
    g += `<linearGradient id="g-${m}-top" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="${c.top[0]}"/><stop offset="1" stop-color="${c.top[1]}"/></linearGradient>
      <linearGradient id="g-${m}-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.side[0]}"/><stop offset="1" stop-color="${c.side[1]}"/></linearGradient>`;
  }
  return `<defs>
    ${g}
    <linearGradient id="cyl-sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".3" stop-color="#fff" stop-opacity=".40"/>
      <stop offset=".55" stop-color="#fff" stop-opacity=".06"/>
      <stop offset="1" stop-color="#4b2f6b" stop-opacity=".08"/>
    </linearGradient>
    <radialGradient id="grid-fade" cx="50%" cy="46%" r="62%">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset=".6" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="grid-mask"><rect x="-200" y="-200" width="3000" height="3000" fill="url(#grid-fade)"/></mask>
    <filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="blur-md" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="blur-lg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="iso-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" class="arrowhead"/>
    </marker>
  </defs>`;
}

/* a closed path through pts with each corner rounded by radius r */
function roundedPoly(pts, r) {
  const n = pts.length, P = (p) => A(p[0]) + ' ' + A(p[1]);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = (v) => Math.hypot(v[0], v[1]) || 1;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (v, s) => [v[0] * s, v[1] * s];
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v1 = sub(p0, p1), v2 = sub(p2, p1);
    const a = Math.min(r, len(v1) / 2, len(v2) / 2);
    const c1 = add(p1, mul(v1, a / len(v1))), c2 = add(p1, mul(v2, a / len(v2)));
    d += (i === 0 ? 'M' + P(c1) : 'L' + P(c1)) + 'Q' + P(p1) + ' ' + P(c2);
  }
  return d + 'Z';
}
const poly = (pts) => 'M' + pts.map(p => A(p[0]) + ' ' + A(p[1])).join('L') + 'Z';

/* corners of a prism from its back-top anchor */
function corners(ax, ay, w, d, h) {
  const Tb = [ax, ay];
  const Tr = [ax + w * UX, ay + w * UY];
  const Tf = [ax + (w - d) * UX, ay + (w + d) * UY];
  const Tl = [ax - d * UX, ay + d * UY];
  return {
    Tb, Tr, Tf, Tl,
    Br: [Tr[0], Tr[1] + h], Bf: [Tf[0], Tf[1] + h], Bl: [Tl[0], Tl[1] + h],
    topMid: [ax + (w - d) / 2 * UX, ay + (w + d) / 2 * UY],
    botMid: [ax + (w - d) / 2 * UX, Tf[1] + h],
    frontY: Tf[1] + h,
  };
}

/* a gradient 3D box. opts: { r:cornerRadius, pulse } → returns { shadow, body, topMid, frontY } */
export function isoBox(ax, ay, w, d, h, mat, opts = {}) {
  const c = corners(ax, ay, w, d, h);
  const r = opts.r == null ? 7 : opts.r;
  const { Tb, Tr, Tf, Tl, Br, Bf, Bl, topMid } = c;
  const sil = roundedPoly([Tb, Tr, Br, Bf, Bl, Tl], r);          // outer silhouette (side gradient)
  const top = roundedPoly([Tb, Tr, Tf, Tl], r);                  // top face (top gradient)
  const right = poly([Tr, Tf, Bf, Br]);                          // right face (subtle shade)
  const sheen = roundedPoly([Tb, Tr, Tf, Tl].map(p => [p[0], p[1] - 2.5]), r);
  const rim = `M${A(Tl[0])} ${A(Tl[1])}L${A(Tb[0])} ${A(Tb[1])}L${A(Tr[0])} ${A(Tr[1])}`;
  const shadow = `<ellipse cx="${A(c.botMid[0])}" cy="${A(c.frontY + 4)}" rx="${A((w + d) * UX * .5 + 4)}" ry="${A((w + d) * UY * .42 + 3)}" fill="#2a2016" opacity=".12" filter="url(#blur-md)"/>`;
  const body = `<g class="iso-box ${opts.pulse ? 'is-pulse' : ''}">
      <path d="${sil}" fill="url(#g-${mat}-side)"/>
      <path d="${right}" fill="#2a1c0c" opacity=".06"/>
      <path d="${top}" fill="url(#g-${mat}-top)"/>
      <path d="${sheen}" fill="#fff" opacity=".22" filter="url(#blur-sm)"/>
      <path d="${rim}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${top}" fill="none" stroke="#5a4a63" stroke-opacity=".18" stroke-width="1"/>
    </g>`;
  return { shadow, body, topMid, frontY: c.frontY, corners: c };
}

/* a glossy cylinder (database/store). center = top-ellipse centre (cx,cy), rx = horizontal radius,
   h = body height. opts: { fill:0..1 level, fillColor:[fill,stroke], pulse } */
export function isoCyl(cx, cy, rx, h, mat, opts = {}) {
  const ry = rx * UY;                       // 2:1
  const topY = cy, botY = cy + h;
  const side = `M${A(cx - rx)} ${A(topY)} V${A(botY)} A${A(rx)} ${A(ry)} 0 0 0 ${A(cx + rx)} ${A(botY)} V${A(topY)}`;
  let fillStr = '';
  if (opts.fill > 0.004) {
    const fy = botY - Math.min(1, opts.fill) * h;
    const [fc, sc] = opts.fillColor || ['#cfe8c0', '#5fa95a'];
    const fillPath = `M${A(cx - rx)} ${A(fy)} A${A(rx)} ${A(ry)} 0 0 0 ${A(cx + rx)} ${A(fy)} V${A(botY)} A${A(rx)} ${A(ry)} 0 0 1 ${A(cx - rx)} ${A(botY)} Z`;
    const line = `M${A(cx - rx + 1)} ${A(fy)} A${A(rx - 1)} ${A(ry - .5)} 0 0 0 ${A(cx + rx - 1)} ${A(fy)}`;
    fillStr = `<path d="${fillPath}" fill="${fc}" opacity=".92"/>${opts.fill < .995 ? `<path d="${line}" fill="none" stroke="${sc}" stroke-width="1.6" stroke-linecap="round"/>` : ''}`;
  }
  const shadow = `<ellipse cx="${A(cx)}" cy="${A(botY + 5)}" rx="${A(rx + 2)}" ry="${A(ry + 1)}" fill="#2a2016" opacity=".15" filter="url(#blur-md)"/>`;
  const body = `<g class="iso-cyl ${opts.pulse ? 'is-pulse' : ''}">
      <path d="${side}" fill="url(#g-${mat}-side)"/>
      ${fillStr}
      <path d="${side}" fill="url(#cyl-sheen)"/>
      <ellipse cx="${A(cx)}" cy="${A(topY)}" rx="${A(rx)}" ry="${A(ry)}" fill="url(#g-${mat}-top)"/>
      <path d="M${A(cx - rx + 3)} ${A(topY + 2)} A${A(rx - 3)} ${A(ry - 1.5)} 0 0 0 ${A(cx + rx - 3)} ${A(topY + 2)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>
      <ellipse cx="${A(cx)}" cy="${A(topY)}" rx="${A(rx)}" ry="${A(ry)}" fill="none" stroke="#5a4a63" stroke-opacity=".2" stroke-width="1"/>
    </g>`;
  return { shadow, body, topMid: [cx, topY], frontY: botY };
}

/* a faint iso grid on the floor plane, masked to fade at the edges */
export function isoGrid(cx, cy, cols, rows, cell) {
  const p = (gx, gy) => [cx + (gx - gy) * cell * UX, cy + (gx + gy) * cell * UY];
  let lines = '';
  for (let i = 0; i <= cols; i++) { const a = p(i, 0), b = p(i, rows); lines += `<line x1="${A(a[0])}" y1="${A(a[1])}" x2="${A(b[0])}" y2="${A(b[1])}"/>`; }
  for (let j = 0; j <= rows; j++) { const a = p(0, j), b = p(cols, j); lines += `<line x1="${A(a[0])}" y1="${A(a[1])}" x2="${A(b[0])}" y2="${A(b[1])}"/>`; }
  return `<g class="iso-grid" mask="url(#grid-mask)">${lines}</g>`;
}

export const ISO = { UX, UY, A };
