/* flows.js — the particle system. A single requestAnimationFrame loop walks
   particles along SVG <path> elements via getPointAtLength (exactly how
   Designed to Scale animates request traffic). Respects reduced-motion. */

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFlowSystem(layer) {
  // layer: an SVG <g> to hold particle dots
  let flows = [];          // { path, kind, speed, from, size, t, el, loop }
  let raf = null, last = 0;

  function dot(kind, size) {
    const ns = 'http://www.w3.org/2000/svg';
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('r', size || 4);
    c.setAttribute('class', 'flow flow--' + kind);
    layer.appendChild(c);
    return c;
  }

  function add({ path, kind = 'read', speed = 220, size = 4, loop = true, onArrive }) {
    if (!path) return;
    const total = path.getTotalLength();
    const f = { path, kind, speed, size, total, t: 0, el: dot(kind, size), loop, onArrive, dead: false };
    flows.push(f);
    place(f);
    start();
    return f;
  }

  function place(f) {
    const len = Math.min(f.t, f.total);
    const p = f.path.getPointAtLength(len);
    f.el.setAttribute('cx', p.x);
    f.el.setAttribute('cy', p.y);
    const fade = f.total ? 1 - Math.abs(0.5 - len / f.total) * 0.6 : 1;
    f.el.setAttribute('opacity', fade.toFixed(2));
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    for (const f of flows) {
      if (f.dead) continue;
      f.t += f.speed * dt;
      if (f.t >= f.total) {
        if (f.onArrive) f.onArrive(f);
        if (f.loop && !REDUCED) f.t = 0;
        else { f.dead = true; f.el.remove(); continue; }
      }
      place(f);
    }
    flows = flows.filter(f => !f.dead);
    if (flows.length) raf = requestAnimationFrame(frame);
    else raf = null;
  }

  function start() {
    if (REDUCED) { flows.forEach(place); return; }   // settle, don't loop
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function clear() {
    if (raf) cancelAnimationFrame(raf), raf = null;
    flows.forEach(f => f.el.remove());
    flows = [];
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }

  return { add, clear, get count() { return flows.length; } };
}
