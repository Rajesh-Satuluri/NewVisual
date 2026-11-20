/* lsm-scene.js — the LSM-Tree scene in the polished "Designed to Scale" visual
   language: gradient-shaded 3D forms (isoBox / isoCyl), a faded iso grid, soft
   blurred shadows, glossy sheens and rim highlights. Databases on disk (the
   SSTables) are rendered as real glossy cylinders.

   Input: a kernel snapshot { mem, wal, levels, note }. Guided steps and the live
   lab render through this same code. Output: { svg, layer, rail, note }. */

import { iso3dDefs, isoBox, isoCyl, isoGrid, ISO } from '../engine/iso3d.js';

const { UX, UY, A } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const f2 = (n) => Number(n).toFixed(2);

/* a flat floating label card, centred on cx, bottom-anchored just above topY */
function tag(cx, topY, html, { w = 130, cls = '' } = {}) {
  const H = 96, pad = 26, baseY = topY - 12, x = cx - (w + pad) / 2, y = baseY - H;
  return `
    <line class="stem" x1="${f2(cx)}" y1="${f2(topY - 5)}" x2="${f2(cx)}" y2="${f2(baseY)}"/>
    <circle class="stem-dot" cx="${f2(cx)}" cy="${f2(topY - 4)}" r="2.4"/>
    <foreignObject x="${f2(x)}" y="${f2(y)}" width="${w + pad}" height="${H}" class="tag-fo">
      <div xmlns="http://www.w3.org/1999/xhtml" class="tag-wrap">
        <div class="scene-tag ${cls}" style="max-width:${w}px">${html}</div>
      </div>
    </foreignObject>`;
}

function chip(k, tomb, hi) {
  const tone = tomb ? 'red' : hi ? 'violet' : 'green';
  return `<span class="chip chip--${tone}">${esc(tomb ? '⌀' + k : k)}</span>`;
}
function chips(entries, hiKey, cap = 7) {
  if (!entries || !entries.length) return `<span class="muted">empty</span>`;
  const shown = entries.slice(0, cap).map(e => chip(e.key, e.tomb, hiKey != null && e.key === hiKey)).join('');
  return shown + (entries.length > cap ? `<span class="chip chip--more">+${entries.length - cap}</span>` : '');
}
function memEntries(mem) {
  return Object.keys(mem || {}).map(Number).sort((a, b) => a - b)
    .map(k => ({ key: k, value: mem[k].value, tomb: mem[k].tomb }));
}

export function renderLsmScene(snap, opts = {}) {
  const mem = memEntries(snap.mem);
  const levels = snap.levels && snap.levels.length ? snap.levels : [[]];
  const walN = snap.wal || 0;
  const { hiKey = null, pulse = null, probe = [] } = opts;

  const VW = 980, TOP = -84;
  const DISK_Y = 300, LVL_GAP = 126;
  const bottom = DISK_Y + (levels.length - 1) * LVL_GAP + 150;
  const VH = bottom - TOP;

  const shadows = [], bodies = [], labels = [];

  /* faded iso grid floor */
  const grid = isoGrid(VW / 2, 250, 26, 18, 30);

  /* ── RAM band ─────────────────────────────────────────────────────── */
  const client = isoBox(110, 96, 72, 58, 48, 'blue', { r: 9, pulse: pulse === 'write' });
  shadows.push(client.shadow); bodies.push(client.body);
  labels.push(tag(client.topMid[0], client.corners.Tb[1],
    `<b>Client / App</b><span class="scene-tag__sub">PUT · DELETE · GET</span>`, { w: 128 }));

  // WAL — long thin append-only log with record grooves on its top face
  const wal = isoBox(318, 92, 236, 40, 15, 'yellow', { r: 6, pulse: pulse === 'write' });
  shadows.push(wal.shadow);
  let grooves = '';
  const gN = Math.min(walN, 12);
  const Tb = wal.corners.Tb, Tr = wal.corners.Tr;
  for (let i = 0; i < gN; i++) {
    const fx = (i + 0.7) / (Math.max(gN, 6) + 0.6);
    const bx = Tb[0] + fx * (Tr[0] - Tb[0]), by = Tb[1] + fx * (Tr[1] - Tb[1]);
    grooves += `<line x1="${f2(bx - 2 * UX)}" y1="${f2(by - 2 * UY)}" x2="${f2(bx - 34 * UX)}" y2="${f2(by + 34 * UY)}" stroke="#c99a3e" stroke-opacity=".5" stroke-width="1.4"/>`;
  }
  bodies.push(wal.body.replace('</g>', grooves + '</g>'));
  labels.push(tag(wal.topMid[0], wal.corners.Tb[1],
    `<b>WAL</b><span class="scene-tag__sub">append-only · ${walN} rec</span>`, { w: 150, cls: 't-wal' }));

  // MemTable — green tray in RAM
  const memx = isoBox(662, 118, 158, 74, 14, 'green', { r: 8, pulse: pulse === 'flush' });
  shadows.push(memx.shadow); bodies.push(memx.body);
  labels.push(tag(memx.topMid[0], memx.corners.Tb[1],
    `<div class="scene-tag__head"><b>MemTable</b><span>sorted · ${mem.length} key${mem.length === 1 ? '' : 's'}</span></div>
     <div class="scene-tag__chips">${chips(mem, hiKey, 8)}</div>`, { w: 248, cls: 't-mem' }));

  /* ── RAM / disk divider ───────────────────────────────────────────── */
  const dy = DISK_Y - 44;
  bodies.push(`<line class="band-rule" x1="40" y1="${dy + 40}" x2="${VW - 40}" y2="${dy}"/>
    <text class="band-label" x="46" y="${dy + 12}">in RAM ↑</text>
    <text class="band-label" x="46" y="${dy + 32}">on disk ↓</text>`);

  /* ── disk band: SSTables as glossy store cylinders, one row per level ─ */
  const ROW_X = 258, STEP = 118, CYL_R = 40, CYL_H = 46;
  let l0Center = null;
  levels.forEach((lvl, n) => {
    const baseY = DISK_Y + n * LVL_GAP;
    labels.push(`<text class="level-label" x="120" y="${f2(baseY + 6)}">L${n}</text>`);

    if (!lvl.length) {
      bodies.push(`<ellipse class="level-ghost" cx="${f2(ROW_X)}" cy="${f2(baseY)}" rx="${CYL_R}" ry="${CYL_R * UY}"/>`);
      labels.push(`<text class="level-empty" x="${f2(ROW_X + 54)}" y="${f2(baseY + 2)}">— empty —</text>`);
      return;
    }
    lvl.forEach((ss, i) => {
      const cx = ROW_X + i * STEP * UX * 1.9;
      const cy = baseY + i * STEP * UY * 0.5;
      const probed = probe.includes(ss.id);
      const live = (ss.entries || []).filter(e => !e.tomb).length;
      const cap = Math.max(live, (ss.max - ss.min) || 1, 5);
      const fillFrac = Math.max(0.28, Math.min(0.92, live / (cap + 2) + 0.3));
      const cyl = isoCyl(cx, cy, CYL_R, CYL_H, probed ? 'purple' : 'store', {
        pulse: pulse === 'compact',
        fill: fillFrac,
        fillColor: probed ? ['#e6d8fb', '#9a6fd8'] : ['#e3d8ef', '#9c82c8'],
      });
      shadows.push(cyl.shadow); bodies.push(cyl.body);
      if (n === 0 && i === 0) l0Center = cyl.topMid;
      const ents = (ss.entries || []).map(e => ({ key: e.key, tomb: e.tomb }));
      labels.push(tag(cyl.topMid[0], cyl.topMid[1],
        `<div class="scene-tag__head"><b>#${ss.id}</b><span>${esc(ss.min)}–${esc(ss.max)}</span></div>
         <div class="scene-tag__chips">${chips(ents, hiKey, 5)}</div>`,
        { w: 150, cls: 't-sst' + (probed ? ' is-probed' : '') }));
    });
  });
  if (!l0Center) l0Center = [ROW_X, DISK_Y];

  /* ── flow rails ───────────────────────────────────────────────────── */
  const cW = client.topMid, wC = wal.topMid, mC = memx.topMid;
  const writeRail = `M${f2(cW[0])} ${f2(cW[1])} Q ${f2((cW[0] + wC[0]) / 2)} ${f2(Math.min(cW[1], wC[1]) - 30)} ${f2(wC[0])} ${f2(wC[1])} S ${f2((wC[0] + mC[0]) / 2)} ${f2(Math.min(wC[1], mC[1]) - 34)} ${f2(mC[0])} ${f2(mC[1])}`;
  const flushRail = `M${f2(mC[0])} ${f2(mC[1])} C ${f2(mC[0])} ${f2(mC[1] + 110)} ${f2(l0Center[0] + 70)} ${f2(l0Center[1] - 70)} ${f2(l0Center[0])} ${f2(l0Center[1])}`;

  const svgStr = `
  <svg class="scene scene--lsm" viewBox="0 ${TOP} ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="LSM-Tree write path">
    ${iso3dDefs()}
    ${grid}
    <g class="ground">${shadows.join('')}</g>
    <path class="rail-guide rail-guide--write" d="${writeRail}"/>
    <path class="rail-guide rail-guide--flush" d="${flushRail}" marker-end="url(#arrow)"/>
    <path id="rail-write" class="rail" d="${writeRail}"/>
    <path id="rail-flush" class="rail" d="${flushRail}"/>
    <g class="solids">${bodies.join('')}</g>
    <g class="labels">${labels.join('')}</g>
    <g class="flow-layer"></g>
  </svg>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = svgStr;
  const svg = wrap.querySelector('svg');
  return {
    svg,
    layer: svg.querySelector('.flow-layer'),
    rail: (id) => svg.querySelector('#rail-' + id),
    note: snap.note || '',
  };
}
