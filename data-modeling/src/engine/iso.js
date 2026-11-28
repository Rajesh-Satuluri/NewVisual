/* iso.js — lightweight isometric projection + path helpers.
   Logical grid coords (x,y,z) → screen (sx,sy). z raises things "up".
   The angle gives the signature Designed-to-Scale 2:1 isometric look. */

const A = 30 * Math.PI / 180;          // iso angle
export const ISO = {
  ux: Math.cos(A), uy: Math.sin(A),    // x axis unit on screen
};

export function project(x, y, z = 0, s = 1) {
  const sx = (x - y) * ISO.ux * s;
  const sy = (x + y) * ISO.uy * s - z * s;
  return [sx, sy];
}

/* Build an SVG path string from a list of [x,y] screen points. */
export function polyPath(pts, close = false) {
  if (!pts.length) return '';
  let d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
  for (let i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
  return close ? d + 'Z' : d;
}

/* An isometric top face (a diamond) centered at screen (cx,cy), half-extents hw,hh. */
export function diamond(cx, cy, hw, hh) {
  return polyPath([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]], true);
}

/* Deterministic hash → [0,1): organic jitter without Math.random (replayable). */
export function hash01(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
