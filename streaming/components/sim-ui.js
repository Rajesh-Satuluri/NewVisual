// Reusable simulation UI primitives (I29) — canvas drawing helpers shared by
// the Foundations simulators. Canvas backgrounds are hardcoded dark for
// theme-independent legibility (same rule as the Kafka/Flink apps).

export const CANVAS_BG = '#0A0E1A';
export const C = {
  grid: '#1E293B', axis: '#334155', text: '#94A3B8', textHi: '#E2E8F0',
  cyan: '#06B6D4', cyan2: '#22D3EE', ok: '#10B981', warn: '#F59E0B', err: '#EF4444',
  keyA: '#06B6D4', keyB: '#A78BFA', late: '#EF4444', wm: '#F59E0B',
};

// Set up a crisp canvas for the device pixel ratio. Returns {ctx,w,h}.
export function setupCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}

export function clear(ctx, w, h) { ctx.fillStyle = CANVAS_BG; ctx.fillRect(0, 0, w, h); }

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A horizontal metrics row (label + value chips).
export function metricsPanel(metrics) {
  return `<div class="sim-metrics">${metrics.map(m =>
    `<div class="sim-metric"><div class="sim-metric-v" style="color:${m.color || 'var(--accent2)'}">${m.value}</div>
     <div class="sim-metric-l">${m.label}</div></div>`).join('')}</div>`;
}

// A small control row (buttons / sliders container markup).
export function controlRow(inner) { return `<div class="sim-controls">${inner}</div>`; }
export function btn(id, label, primary = false) {
  return `<button id="${id}" class="btn${primary ? ' primary' : ''}" style="padding:8px 14px;font-size:13px">${label}</button>`;
}
export function slider(id, label, min, max, val, step = 1) {
  return `<label class="sim-slider"><span>${label}: <b id="${id}-val">${val}</b></span>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
}

export function legendRow(items) {
  return `<div class="sim-legend">${items.map(i =>
    `<span class="sim-legend-i"><span class="sim-swatch" style="background:${i.color}"></span>${i.label}</span>`).join('')}</div>`;
}
