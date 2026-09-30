// Shared Canvas animation primitives — used across all Kafka modules

// ── Easing functions ──────────────────────────────────────────────────────
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
export function easeCubicOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
export function easeElasticOut(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

// ── EventPacket ───────────────────────────────────────────────────────────
// An animated pill that travels along a polyline path
export class EventPacket {
  constructor({ label, color = '#FF6900', path, speed = 1, onArrive = null }) {
    this.label = label;
    this.color = color;
    this.path = path;         // array of {x, y} waypoints
    this.speed = speed;
    this.onArrive = onArrive;
    this.pathLen = this._calcLength();
    this.traveled = 0;
    this.done = false;
    this.trail = [];          // past positions for trail effect
    this.opacity = 1;
  }

  _calcLength() {
    let len = 0;
    for (let i = 1; i < this.path.length; i++) {
      const dx = this.path[i].x - this.path[i-1].x;
      const dy = this.path[i].y - this.path[i-1].y;
      len += Math.sqrt(dx*dx + dy*dy);
    }
    return len || 1;
  }

  _posAt(dist) {
    let remaining = dist;
    for (let i = 1; i < this.path.length; i++) {
      const dx = this.path[i].x - this.path[i-1].x;
      const dy = this.path[i].y - this.path[i-1].y;
      const seg = Math.sqrt(dx*dx + dy*dy);
      if (remaining <= seg) {
        const t = remaining / seg;
        return { x: this.path[i-1].x + dx*t, y: this.path[i-1].y + dy*t };
      }
      remaining -= seg;
    }
    return this.path[this.path.length - 1];
  }

  update(dt) {
    if (this.done) return;
    const pos = this._posAt(this.traveled);
    this.trail.push({ x: pos.x, y: pos.y, age: 0 });
    if (this.trail.length > 12) this.trail.shift();
    this.trail.forEach(t => t.age++);

    this.traveled += this.speed * dt * 60;
    if (this.traveled >= this.pathLen) {
      this.traveled = this.pathLen;
      this.done = true;
      if (this.onArrive) this.onArrive();
    }
  }

  draw(ctx) {
    if (this.done && this.opacity <= 0) return;

    // Draw trail
    this.trail.forEach((t, i) => {
      const alpha = (i / this.trail.length) * 0.35 * this.opacity;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2,'0');
      ctx.fill();
    });

    const pos = this._posAt(this.traveled);
    const label = this.label;
    ctx.font = 'bold 10px system-ui';
    const tw = ctx.measureText(label).width;
    const pw = tw + 16, ph = 18, rx = 9;
    const x = pos.x - pw/2, y = pos.y - ph/2;

    // Pill background
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + pw - rx, y);
    ctx.quadraticCurveTo(x + pw, y, x + pw, y + rx);
    ctx.lineTo(x + pw, y + ph - rx);
    ctx.quadraticCurveTo(x + pw, y + ph, x + pw - rx, y + ph);
    ctx.lineTo(x + rx, y + ph);
    ctx.quadraticCurveTo(x, y + ph, x, y + ph - rx);
    ctx.lineTo(x, y + rx);
    ctx.quadraticCurveTo(x, y, x + rx, y);
    ctx.closePath();

    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(label, pos.x - tw/2, pos.y + 4);
    ctx.globalAlpha = 1;
  }
}

// ── PulseRing ─────────────────────────────────────────────────────────────
// Expanding ring animation at a point (e.g. leader election)
export class PulseRing {
  constructor({ x, y, color = '#FF6900', maxR = 40, duration = 1.0 }) {
    this.x = x; this.y = y;
    this.color = color;
    this.maxR = maxR;
    this.duration = duration;
    this.t = 0;
    this.done = false;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt / this.duration;
    if (this.t >= 1) { this.t = 1; this.done = true; }
  }

  draw(ctx) {
    if (this.done) return;
    const r = this.maxR * easeCubicOut(this.t);
    const alpha = 1 - this.t;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── GlowNode ──────────────────────────────────────────────────────────────
// A node that pulses (breathes) when active
export class GlowNode {
  constructor({ x, y, r = 20, color = '#FF6900', label = '', active = true }) {
    this.x = x; this.y = y; this.r = r;
    this.color = color;
    this.label = label;
    this.active = active;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.phase += dt * 2;
  }

  draw(ctx) {
    const pulse = this.active ? 0.15 * Math.sin(this.phase) : 0;
    const r = this.r * (1 + pulse);

    // Glow
    if (this.active) {
      const grad = ctx.createRadialGradient(this.x, this.y, r * 0.5, this.x, this.y, r * 2);
      grad.addColorStop(0, this.color + '44');
      grad.addColorStop(1, this.color + '00');
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.active ? this.color : '#334155';
    ctx.fill();
    ctx.strokeStyle = this.active ? '#fff3' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    if (this.label) {
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x, this.y + 4);
    }
  }
}

// ── SegmentFill ───────────────────────────────────────────────────────────
// A log-segment rectangle that fills left-to-right as bytes arrive
export class SegmentFill {
  constructor({ x, y, w, h, color = '#FF6900', label = '' }) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = color;
    this.label = label;
    this.fill = 0;   // 0→1
  }

  addBytes(amount) {
    this.fill = Math.min(1, this.fill + amount);
  }

  draw(ctx) {
    // Background
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    // Fill
    if (this.fill > 0) {
      const grad = ctx.createLinearGradient(this.x, 0, this.x + this.w * this.fill, 0);
      grad.addColorStop(0, this.color + 'cc');
      grad.addColorStop(1, this.color);
      ctx.fillStyle = grad;
      ctx.fillRect(this.x + 1, this.y + 1, (this.w - 2) * this.fill, this.h - 2);
    }

    // Label
    if (this.label) {
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(this.label, this.x + 4, this.y + this.h + 12);
    }

    // Percentage
    ctx.font = 'bold 9px system-ui';
    ctx.fillStyle = this.fill > 0.4 ? '#fff' : '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(this.fill * 100) + '%', this.x + this.w - 4, this.y + this.h / 2 + 3);
  }
}

// ── SparkLine ─────────────────────────────────────────────────────────────
// Rolling 60-point animated line chart on canvas
export class SparkLine {
  constructor({ x, y, w, h, color = '#FF6900', label = '', maxVal = 100 }) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = color;
    this.label = label;
    this.maxVal = maxVal;
    this.points = new Array(60).fill(0);
    this.current = 0;
  }

  push(val) {
    this.points.shift();
    this.points.push(val);
    this.current = val;
  }

  draw(ctx) {
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    // Grid lines
    for (let i = 1; i < 4; i++) {
      const gy = this.y + (this.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(this.x, gy);
      ctx.lineTo(this.x + this.w, gy);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Area fill
    const pts = this.points;
    const mx = Math.max(...pts, 1);
    const scaleY = (v) => this.y + this.h - (v / mx) * (this.h - 4) - 2;
    const scaleX = (i) => this.x + (i / (pts.length - 1)) * this.w;

    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(pts[0]));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(pts[i]));
    }
    ctx.lineTo(scaleX(pts.length - 1), this.y + this.h);
    ctx.lineTo(scaleX(0), this.y + this.h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, this.y, 0, this.y + this.h);
    grad.addColorStop(0, this.color + '55');
    grad.addColorStop(1, this.color + '05');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(pts[0]));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(pts[i]));
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Label + value
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(this.label, this.x + 4, this.y + 12);
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(this.current), this.x + this.w - 4, this.y + 14);
  }
}

// ── LagBar ────────────────────────────────────────────────────────────────
// Consumer lag visualization — fills amber when behind
export class LagBar {
  constructor({ x, y, w, h, label = '' }) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.label = label;
    this.lag = 0;    // 0→1 ratio
    this.target = 0;
  }

  setLag(ratio) { this.target = Math.max(0, Math.min(1, ratio)); }

  update(dt) {
    this.lag += (this.target - this.lag) * Math.min(1, dt * 4);
  }

  draw(ctx) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    const color = this.lag > 0.7 ? '#EF4444' : this.lag > 0.35 ? '#F59E0B' : '#10B981';
    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.w * this.lag, this.h);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.font = '10px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(this.label, this.x, this.y - 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText(Math.round(this.lag * 100) + '%', this.x + this.w, this.y - 4);
  }
}

// ── drawArrow ─────────────────────────────────────────────────────────────
export function drawArrow(ctx, x1, y1, x2, y2, color = '#475569', width = 1.5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ── drawRoundRect ─────────────────────────────────────────────────────────
export function drawRoundRect(ctx, x, y, w, h, r, fill, stroke) {
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
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}
