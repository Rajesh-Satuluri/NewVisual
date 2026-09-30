// Easing functions
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeCubicOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeElasticOut(t) {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

// Draw helpers
export function drawArrow(ctx, x1, y1, x2, y2, color, width = 1.5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRoundRect(ctx, x, y, w, h, r, fillColor, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 1; ctx.stroke(); }
}

// EventPacket — animated pill that travels a multi-waypoint path
export class EventPacket {
  constructor({ label, color, path, speed = 100, onArrive }) {
    this.label = label;
    this.color = color;
    this.path = path;
    this.speed = speed;
    this.onArrive = onArrive;
    this.segIdx = 0;
    this.t = 0;
    this.done = false;
  }

  get cx() {
    if (this.segIdx >= this.path.length - 1) return this.path[this.path.length - 1].x;
    const a = this.path[this.segIdx], b = this.path[this.segIdx + 1];
    return a.x + (b.x - a.x) * this.t;
  }

  get cy() {
    if (this.segIdx >= this.path.length - 1) return this.path[this.path.length - 1].y;
    const a = this.path[this.segIdx], b = this.path[this.segIdx + 1];
    return a.y + (b.y - a.y) * this.t;
  }

  update(dt) {
    if (this.done) return;
    if (this.segIdx >= this.path.length - 1) { this.done = true; if (this.onArrive) this.onArrive(); return; }
    const a = this.path[this.segIdx], b = this.path[this.segIdx + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.t += (this.speed * dt) / len;
    if (this.t >= 1) {
      this.segIdx++;
      this.t = this.t - 1;
      if (this.segIdx >= this.path.length - 1) {
        this.done = true;
        if (this.onArrive) this.onArrive();
      }
    }
  }

  draw(ctx) {
    if (this.done) return;
    const x = this.cx, y = this.cy;
    ctx.save();
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    const tw = ctx.measureText(this.label).width + 16;
    drawRoundRect(ctx, x - tw / 2, y - 10, tw, 20, 10, this.color, null);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, x, y);
    ctx.restore();
  }
}

// PulseRing — expanding transparent ring
export class PulseRing {
  constructor({ x, y, color, maxR = 40, duration = 0.8 }) {
    this.x = x; this.y = y; this.color = color;
    this.maxR = maxR; this.duration = duration;
    this.t = 0; this.done = false;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt / this.duration;
    if (this.t >= 1) { this.t = 1; this.done = true; }
  }

  draw(ctx) {
    if (this.done) return;
    const r = this.maxR * easeInOut(this.t);
    const alpha = 1 - this.t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// GlowNode — breathing glowing circle node
export class GlowNode {
  constructor({ x, y, r = 18, color, label, active = true }) {
    this.x = x; this.y = y; this.r = r;
    this.color = color; this.label = label; this.active = active;
    this.phase = 0;
  }

  update(dt) {
    if (this.active) this.phase += dt * 1.8;
  }

  draw(ctx) {
    const pulse = this.active ? 1 + 0.08 * Math.sin(this.phase) : 0.9;
    const r = this.r * pulse;
    ctx.save();
    // outer glow
    if (this.active) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '26';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '55';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
    if (this.label) {
      ctx.save();
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(203,212,230,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(this.label, this.x, this.y + r + 6);
      ctx.restore();
    }
  }
}

// SegmentFill — horizontal progress bar
export class SegmentFill {
  constructor({ x, y, w, h = 14, color, label }) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = color; this.label = label; this.fill = 0;
  }

  addBytes(amount) { this.fill = Math.min(1, this.fill + amount); }

  draw(ctx) {
    drawRoundRect(ctx, this.x, this.y, this.w, this.h, 4, '#1E2D43', '#2A3D57');
    if (this.fill > 0) {
      const fw = Math.max(0, (this.w - 2) * this.fill);
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(this.x + 1, this.y + 1, fw, this.h - 2, [3, fw < 6 ? 3 : 3, fw < 6 ? 3 : 3, 3]);
      } else {
        ctx.rect(this.x + 1, this.y + 1, fw, this.h - 2);
      }
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
    if (this.label) {
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8895AA';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.label, this.x, this.y - 2);
      ctx.restore();
    }
  }
}

// SparkLine — rolling 60-point area chart
export class SparkLine {
  constructor({ x, y, w, h = 40, color, label, maxVal = 100 }) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = color; this.label = label; this.maxVal = maxVal;
    this.data = [];
  }

  push(value) {
    this.data.push(value);
    if (this.data.length > 60) this.data.shift();
  }

  draw(ctx) {
    drawRoundRect(ctx, this.x, this.y, this.w, this.h, 4, '#1E2D43', null);
    if (this.data.length < 2) return;
    const pts = this.data.map((v, i) => ({
      x: this.x + (i / (this.data.length - 1)) * this.w,
      y: this.y + this.h - Math.max(0, (v / this.maxVal)) * this.h
    }));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, this.y + this.h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, this.y + this.h);
    ctx.closePath();
    ctx.fillStyle = this.color + '33';
    ctx.fill();
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // endpoint dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
    if (this.label) {
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8895AA';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.label, this.x, this.y - 2);
      ctx.restore();
    }
  }
}

// LagBar — lag indicator that smoothly transitions green→amber→red
export class LagBar {
  constructor({ x, y, w, h = 14, label }) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label;
    this.lag = 0; this.displayLag = 0;
  }

  setLag(value) { this.lag = Math.max(0, Math.min(1, value)); }

  update(dt) {
    this.displayLag += (this.lag - this.displayLag) * Math.min(1, dt * 4);
  }

  draw(ctx) {
    const d = this.displayLag;
    const color = d < 0.4 ? '#10B981' : d < 0.7 ? '#F59E0B' : '#EF4444';
    drawRoundRect(ctx, this.x, this.y, this.w, this.h, 4, '#1E2D43', null);
    if (d > 0.005) {
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(this.x + 1, this.y + 1, (this.w - 2) * d, this.h - 2, [3]);
      } else {
        ctx.rect(this.x + 1, this.y + 1, (this.w - 2) * d, this.h - 2);
      }
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    if (this.label) {
      ctx.save();
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8895AA';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.label, this.x, this.y - 2);
      ctx.restore();
    }
  }
}
