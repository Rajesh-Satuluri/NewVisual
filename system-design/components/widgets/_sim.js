// ── Shared scaffolding for live-animated canvas simulations ──────────────────
// Kafka-grade continuous-motion canvas sims, but theme-aware: every colour is
// read from the page's CSS custom properties, so the animation follows light/
// dark automatically. Each sim builds its DOM with makeScaffold(), reads a live
// palette from makePalette(), sizes a crisp hi-DPI canvas with fitCanvas(), and
// drives motion with rafLoop().

const TOKENS = ['bg', 'bg2', 'bg3', 'border', 'text', 'text2', 'text3',
  'accent', 'accent2', 'green', 'amber', 'red', 'blue'];

// Live palette that re-reads when the theme toggles (data-theme on <html>).
export function makePalette(el) {
  const pal = {};
  function refresh() {
    const cs = getComputedStyle(el);
    for (const n of TOKENS) pal[n] = (cs.getPropertyValue('--' + n).trim()) || '#888';
  }
  refresh();
  const obs = new MutationObserver(refresh);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return { pal, refresh, stop: () => obs.disconnect() };
}

// Builds: stage(canvas) + controls row + optional caption. Returns handles.
export function makeScaffold(container, { controls = '', caption = '', className = '' } = {}) {
  const root = document.createElement('div');
  root.className = 'wg wg-sim ' + className;
  root.innerHTML = `
    <div class="sim-stage"><canvas class="sim-canvas"></canvas></div>
    <div class="sim-controls">${controls}</div>
    ${caption ? `<p class="sim-caption">${caption}</p>` : ''}`;
  container.appendChild(root);
  return {
    root,
    canvas: root.querySelector('.sim-canvas'),
    controls: root.querySelector('.sim-controls'),
    caption: root.querySelector('.sim-caption'),
    $: sel => root.querySelector(sel),
  };
}

// Hi-DPI canvas sized in a logical WxH coordinate space (0..W, 0..H).
// Returns a 2d context already transformed so you draw in logical units.
export function fitCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = '100%';
  canvas.style.maxWidth = w + 'px';
  canvas.style.aspectRatio = `${w} / ${h}`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.W = w; ctx.H = h;
  return ctx;
}

// requestAnimationFrame loop with clamped delta-time. Returns a stop() fn.
export function rafLoop(fn) {
  let id = null, last = performance.now(), running = true;
  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    try { fn(dt, now); } catch (e) { running = false; return; }
    id = requestAnimationFrame(tick);
  }
  id = requestAnimationFrame(tick);
  return () => { running = false; if (id) cancelAnimationFrame(id); };
}

// ── small canvas drawing helpers ────────────────────────────────────────────
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// colour with alpha, accepting #rgb/#rrggbb/rgb() from CSS vars.
export function withAlpha(col, a) {
  col = (col || '').trim();
  if (col.startsWith('#')) {
    let h = col.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  if (col.startsWith('rgb(')) return col.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  return col;
}

export function label(ctx, text, x, y, { color, size = 11, weight = 600, align = 'center' } = {}) {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}
