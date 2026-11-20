/* lsm-scene.js — the LSM-Tree scene in the "Designed to Scale" visual language,
   rebuilt to match the original Storage-Engines renderer: rounded isometric
   cubes with icon glyphs and body labels, a glossy-free three-tone shade, soft
   ground shadows, cascading SSTable tiles, pill badges, routed connectors and a
   faded iso grid.

   Input: a kernel snapshot { mem, wal, levels, note }. Guided steps and the live
   lab render through this same code. Output: { svg, layer, rail, note }. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, PAL, ISO } from '../engine/iso3d.js';

const { A } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

function memEntries(mem) {
  return Object.keys(mem || {}).map(Number).sort((a, b) => a - b)
    .map(k => ({ key: k, value: mem[k].value, tomb: mem[k].tomb }));
}

/* a flat chip-strip of keys, rendered as a foreignObject below a form */
function chipStrip(cx, topY, entries, { hiKey = null, cap = 8, w = 250, tone = 'green' } = {}) {
  if (!entries) return '';
  let inner;
  if (!entries.length) {
    inner = `<span class="kc kc--empty">empty</span>`;
  } else {
    inner = entries.slice(0, cap).map(e => {
      const t = e.tomb ? 'red' : (hiKey != null && e.key === hiKey) ? 'hi' : tone;
      return `<span class="kc kc--${t}">${esc(e.tomb ? '⌀' + e.key : e.key)}</span>`;
    }).join('') + (entries.length > cap ? `<span class="kc kc--more">+${entries.length - cap}</span>` : '');
  }
  const H = 30, x = cx - w / 2;
  return `<foreignObject x="${A(x)}" y="${A(topY)}" width="${A(w)}" height="${H}" class="kc-fo">
    <div xmlns="http://www.w3.org/1999/xhtml" class="kc-wrap">${inner}</div>
  </foreignObject>`;
}

export function renderLsmScene(snap, opts = {}) {
  const mem = memEntries(snap.mem);
  const levels = snap.levels && snap.levels.length ? snap.levels : [[]];
  const walN = snap.wal || 0;
  const { hiKey = null, pulse = null, probe = [] } = opts;

  const VW = 1040, TOP = 0;
  const DISK_TOP = 372, LVL_GAP = 118;
  const VH = DISK_TOP + (levels.length - 1) * LVL_GAP + 150;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];

  /* faded isometric ground */
  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── RAM band: Client · MemTable · WAL ────────────────────────────────── */
  const client = isoCube(180, 162, 70, 58, 'blue', {
    icon: 'server', label: 'Client', sub: 'PUT · GET · DEL', pulse: pulse === 'write',
  });
  const memx = isoCube(470, 138, 76, 64, 'green', {
    icon: 'listOrdered', label: 'MemTable', sub: `sorted · ${mem.length} key${mem.length === 1 ? '' : 's'}`,
    halo: true, pulse: pulse === 'flush' || pulse === 'write',
  });
  const wal = isoCube(686, 206, 60, 54, 'amber', {
    icon: 'scroll', label: 'WAL', sub: `${walN} rec${walN === 1 ? '' : 's'}`, pulse: pulse === 'write',
  });

  // WAL append-only region sits behind the WAL cube, log growing to the right
  const rgX = 616, rgY = 236, rgW = 346, rgH = 118;
  badges.push(region(rgX, rgY, rgW, rgH, 'LOG · APPEND-ONLY', { rot: 7 }));

  [client, memx, wal].forEach(c => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); });

  // memtable key chips just under the cube
  overlays.push(chipStrip(memx.base[0], memx.base[1] + 20, mem, { hiKey, w: 260 }));

  // record dots trailing along the lower edge of the append-only region
  let recDots = '';
  const rn = Math.min(walN, 8);
  for (let i = 0; i < rn; i++) {
    const t = (i + 0.5) / (Math.max(rn, 5) + 0.3);
    recDots += `<circle class="rec-dot" cx="${A(rgX + 74 + t * (rgW - 120))}" cy="${A(rgY + rgH - 30 + t * 14)}" r="3.4"/>`;
  }
  overlays.push(recDots);

  /* ── RAM / disk divider ───────────────────────────────────────────────── */
  const dY = DISK_TOP - 44;
  badges.push(`<line class="band-rule" x1="40" y1="${A(dY + 34)}" x2="${VW - 40}" y2="${A(dY - 6)}"/>
    <text class="band-label" x="46" y="${A(dY + 8)}">in RAM ↑</text>
    <text class="band-label" x="46" y="${A(dY + 28)}">on disk ↓</text>`);

  /* ── disk band: leveled SSTable cascades ─────────────────────────────── */
  badges.push(pill(400, DISK_TOP + 6, 'sorted files (SSTables)', { icon: 'file', cls: 'pill--sst' }));
  let l0Tile = null;
  levels.forEach((lvl, n) => {
    const baseY = DISK_TOP + 42 + n * LVL_GAP;
    badges.push(`<text class="level-label" x="96" y="${A(baseY + 6)}">L${n}</text>`);

    if (!lvl.length) {
      const ghost = isoTile(236, baseY, 46, 'lilac', { ghost: true });
      solids.push(ghost.g);
      badges.push(`<text class="level-empty" x="300" y="${A(baseY + 4)}">— empty —</text>`);
      return;
    }
    lvl.forEach((ss, i) => {
      const cx = 236 + i * 108;
      const cy = baseY + i * 14;
      const probed = probe.includes(ss.id);
      const tile = isoTile(cx, cy, 46, probed ? 'rose' : 'lilac', { pulse: pulse === 'compact', halo: probed });
      shadows.push(tile.shadow); if (tile.halo) halos.push(tile.halo); solids.push(tile.g);
      if (n === 0 && i === 0) l0Tile = tile;
      badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(tile.base[1] + 16)}" text-anchor="middle">#${ss.id} · ${esc(ss.min)}–${esc(ss.max)}</text>`);
    });
  });
  if (!l0Tile) l0Tile = { top: [236, DISK_TOP + 42] };

  /* ── routed connectors (write path + flush) ──────────────────────────── */
  const { V } = ISO;
  // Client → MemTable  (write)
  const wPts = [
    V(client.top[0], client.top[1] - 2),
    V((client.top[0] + memx.top[0]) / 2, Math.min(client.top[1], memx.top[1]) - 46),
    V(memx.verts.W.x - 6, memx.verts.W.y),
  ];
  const writeEdge = edge(wPts, { arrow: true, cls: 'edge--write' });
  // MemTable → WAL  (durability)
  const dPts = [V(memx.base[0] + 24, memx.base[1] - 6), V((memx.base[0] + wal.top[0]) / 2 + 30, wal.top[1] - 36), V(wal.top[0], wal.top[1] - 2)];
  const walEdge = edge(dPts, { arrow: true, cls: 'edge--wal' });
  // MemTable → L0  (flush) — exits the left-bottom corner so it clears the chips
  const fPts = [V(memx.verts.Wb.x + 6, memx.verts.Wb.y), V(memx.verts.Wb.x - 60, (memx.verts.Wb.y + l0Tile.top[1]) / 2 + 30), V(l0Tile.top[0] + 26, l0Tile.top[1] - 4)];
  const flushEdge = edge(fPts, { arrow: true, dashed: true, cls: 'edge--flush' });

  const svgStr = `
  <svg class="scene scene--lsm" viewBox="0 ${TOP} ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="LSM-Tree write path">
    ${iso3dDefs()}
    ${grid}
    <g class="ground">${halos.join('')}${shadows.join('')}</g>
    <g class="regions">${badges.filter(b => b.includes('iso-region')).join('')}</g>
    ${writeEdge.guide}${walEdge.guide}${flushEdge.guide}
    <path id="rail-write" class="rail" d="${writeEdge.d}"/>
    <path id="rail-flush" class="rail" d="${flushEdge.d}"/>
    <g class="solids">${solids.join('')}</g>
    <g class="overlays">${overlays.join('')}</g>
    <g class="badges">${badges.filter(b => !b.includes('iso-region')).join('')}</g>
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
