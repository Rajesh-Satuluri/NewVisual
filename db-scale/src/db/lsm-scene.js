/* lsm-scene.js — the database visual language for LSM-Trees, rendered as a true
   isometric 3D scene (the "Designed to Scale" look): shaded 3D forms for every
   structure, with keys/ranges carried in flat floating label cards that hover
   above them (never painted onto a skewed face).

   Input: a snapshot-shaped object { mem, wal, levels, note } — identical to the
   LSM kernel's snapshot(), so GUIDED steps (hand-authored states) and the LIVE
   LAB (real kernel state) render through the exact same code.

   Output: an <svg> element + named anchor paths the flow system animates along. */

const NS = 'http://www.w3.org/2000/svg';

/* ── isometric basis (2:1, 30°) ───────────────────────────────────────── */
const A = 30 * Math.PI / 180, UX = Math.cos(A), UY = Math.sin(A);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const f2 = (n) => n.toFixed(2);
const poly = (...pts) => 'M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';

/* A 3D rectangular prism. (ax,ay) = screen pos of the top face's back corner;
   w = width along iso-x, d = depth along iso-y, h = vertical height (all screen px).
   Returns the three visible face paths + useful anchor points. */
function prism(ax, ay, w, d, h) {
  const Tb = [ax, ay];
  const Tr = [ax + w * UX, ay + w * UY];
  const Tf = [ax + (w - d) * UX, ay + (w + d) * UY];
  const Tl = [ax - d * UX, ay + d * UY];
  const Br = [Tr[0], Tr[1] + h], Bf = [Tf[0], Tf[1] + h], Bl = [Tl[0], Tl[1] + h];
  return {
    top: poly(Tb, Tr, Tf, Tl),
    right: poly(Tr, Tf, Bf, Br),
    left: poly(Tl, Tf, Bf, Bl),
    topMid: [ax + (w - d) / 2 * UX, ay + (w + d) / 2 * UY],   // centre of the top face
    topBack: Tb,
    front: Bf,
    botMid: [ax + (w - d) / 2 * UX, Bf[1]],
  };
}

/* material palettes: [top, right, left] — saturated so they read on either theme */
const MAT = {
  client: ['#7c9ff0', '#5c80df', '#4567c4'],
  wal:    ['#efbf63', '#e0a641', '#c58d2b'],
  mem:    ['#74cf98', '#52b87c', '#3c9c62'],
  sst:    ['#4cc0ad', '#2f9d8c', '#217a6c'],
  sstHi:  ['#b49be6', '#977bd2', '#795cb6'],
  shelf:  ['#c9c2b4', '#aba493', '#948d7c'],
};

function faces(p, mat, cls = '') {
  const [t, r, l] = MAT[mat];
  return `<g class="solid ${cls}">
      <path d="${p.left}"  fill="${l}"/>
      <path d="${p.right}" fill="${r}"/>
      <path d="${p.top}"   fill="${t}"/>
    </g>`;
}

/* a flat floating label card, horizontally centred on cx, sitting just above topY,
   with a thin stem pointing down at the form. html is trusted inner markup. */
function tag(cx, topY, html, { w = 130, cls = '' } = {}) {
  const H = 96, pad = 24;              // FO box; card bottom-aligns to its base
  const baseY = topY - 12;             // where the card's bottom edge lands
  const x = cx - (w + pad) / 2, y = baseY - H;
  return `
    <line class="stem" x1="${f2(cx)}" y1="${f2(topY - 5)}" x2="${f2(cx)}" y2="${f2(baseY)}"/>
    <circle class="stem-dot" cx="${f2(cx)}" cy="${f2(topY - 4)}" r="2.4"/>
    <foreignObject x="${f2(x)}" y="${f2(y)}" width="${w + pad}" height="${H}" class="tag-fo">
      <div xmlns="http://www.w3.org/1999/xhtml" class="tag-wrap">
        <div class="scene-tag ${cls}" style="max-width:${w}px">${html}</div>
      </div>
    </foreignObject>`;
}

/* a key chip; tomb = deletion marker, hi = highlighted */
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

/* ── build the scene ───────────────────────────────────────────────────── */
export function renderLsmScene(snap, opts = {}) {
  const mem = memEntries(snap.mem);
  const levels = snap.levels && snap.levels.length ? snap.levels : [[]];
  const walN = snap.wal || 0;
  const { hiKey = null, pulse = null, probe = [] } = opts;

  const VW = 980;
  const TOP = -78;                         // headroom for floating tags
  const DISK_Y = 286;                      // where the on-disk band begins
  const LVL_GAP = 112;
  const bottom = DISK_Y + levels.length * LVL_GAP + 70;
  const VH = bottom - TOP;

  const parts = [];

  /* soft ground shadows under the disk band for depth */
  const shadows = [];

  /* ── RAM band ─────────────────────────────────────────────────────── */
  // Client cube
  const client = prism(96, 96, 78, 60, 50);
  shadows.push(`<ellipse class="gshadow" cx="${f2(client.botMid[0])}" cy="${f2(client.front[1] + 4)}" rx="62" ry="15"/>`);
  parts.push(faces(client, 'client', pulse === 'write' ? 'is-pulse' : ''));
  parts.push(tag(client.topMid[0], client.topBack[1],
    `<b>Client / App</b><span class="scene-tag__sub">PUT · DELETE · GET</span>`, { w: 128, cls: 't-plain' }));

  // WAL — long thin append-only slab, segmented into record ticks
  const wal = prism(300, 92, 250, 44, 16);
  shadows.push(`<ellipse class="gshadow" cx="${f2(wal.botMid[0])}" cy="${f2(wal.front[1] + 3)}" rx="150" ry="18"/>`);
  parts.push(faces(wal, 'wal', pulse === 'write' ? 'is-pulse' : ''));
  // record ticks: small raised diamonds marching across the top face
  const ticks = Math.min(walN, 10);
  let tickStr = '';
  for (let i = 0; i < ticks; i++) {
    const fx = 0.06 + (i + 0.5) / 11;      // fraction along x
    const bx = 300 + fx * 250 * UX, by = 92 + fx * 250 * UY;
    const cx = bx - 22 * UX, cy = by + 22 * UY;   // nudge toward depth centre
    tickStr += `<path class="wal-tick" d="${poly([cx, cy - 5], [cx + 7 * UX, cy - 5 + 7 * UY], [cx, cy + 5], [cx - 7 * UX, cy + 5 - 7 * UY])}"/>`;
  }
  parts.push(`<g class="wal-ticks">${tickStr}</g>`);
  parts.push(tag(wal.topMid[0], wal.topBack[1],
    `<b>WAL</b><span class="scene-tag__sub">append-only · ${walN} rec</span>`, { w: 150, cls: 't-wal' }));

  // MemTable — green tray in RAM
  const memW = 168, mem3d = prism(662, 118, memW, 78, 14);
  shadows.push(`<ellipse class="gshadow" cx="${f2(mem3d.botMid[0])}" cy="${f2(mem3d.front[1] + 3)}" rx="112" ry="20"/>`);
  parts.push(faces(mem3d, 'mem', pulse === 'flush' ? 'is-pulse' : ''));
  parts.push(tag(mem3d.topMid[0], mem3d.topBack[1],
    `<div class="scene-tag__head"><b>MemTable</b><span>sorted · ${mem.length} key${mem.length === 1 ? '' : 's'}</span></div>
     <div class="scene-tag__chips">${chips(mem, hiKey, 8)}</div>`, { w: 248, cls: 't-mem' }));

  /* ── RAM / disk divider ───────────────────────────────────────────── */
  const dy = DISK_Y - 30;
  parts.push(`<line class="band-rule" x1="40" y1="${dy + 40}" x2="${VW - 40}" y2="${dy}"/>`);
  parts.push(`<text class="band-label" x="46" y="${dy + 12}">in RAM ↑</text>`);
  parts.push(`<text class="band-label" x="46" y="${dy + 32}">on disk ↓</text>`);

  /* ── disk band: one isometric shelf per level ─────────────────────── */
  const SHELF_X = 196, SHELF_W = 452, SHELF_D = 72, TILE_W = 96, TILE_D = 50, TILE_H = 30, TILE_STEP = 148;
  let l0Center = null;
  levels.forEach((lvl, n) => {
    const sy = DISK_Y + n * LVL_GAP;
    const shelf = prism(SHELF_X, sy, SHELF_W, SHELF_D, 6);
    const dim = lvl.length ? '' : 'is-empty';
    const pulseCls = (pulse === 'compact' && n <= 1) ? 'is-pulse' : '';
    parts.push(`<g class="shelf ${dim} ${pulseCls}">${faces(shelf, 'shelf')}</g>`);
    // level label — to the left of the shelf, clear of the band text
    parts.push(`<text class="level-label" x="${SHELF_X - 88}" y="${f2(sy + 44)}">L${n}</text>`);

    if (!lvl.length) {
      parts.push(`<text class="level-empty" x="${f2(shelf.topMid[0] - 20)}" y="${f2(shelf.topMid[1] + 4)}">— empty —</text>`);
      return;
    }
    lvl.forEach((ss, i) => {
      // sit the tile on the shelf top, marching along iso-x
      const ax = SHELF_X + (40 + i * TILE_STEP) * UX;
      const ay = sy + (40 + i * TILE_STEP) * UY - 2;
      const tile = prism(ax, ay, TILE_W, TILE_D, TILE_H);
      const probed = probe.includes(ss.id);
      shadows.push(`<ellipse class="gshadow gshadow--sst" cx="${f2(tile.botMid[0])}" cy="${f2(tile.front[1] + 2)}" rx="58" ry="12"/>`);
      parts.push(faces(tile, probed ? 'sstHi' : 'sst', probed ? 'is-probed' : ''));
      if (n === 0 && i === 0) l0Center = tile.topMid;
      const ents = (ss.entries || []).map(e => ({ key: e.key, tomb: e.tomb }));
      parts.push(tag(tile.topMid[0], tile.topBack[1],
        `<div class="scene-tag__head"><b>#${ss.id}</b><span>${esc(ss.min)}–${esc(ss.max)}</span></div>
         <div class="scene-tag__chips">${chips(ents, hiKey, 5)}</div>`,
        { w: 150, cls: 't-sst' + (probed ? ' is-probed' : '') }));
    });
  });
  if (!l0Center) l0Center = [prism(SHELF_X, DISK_Y, SHELF_W, SHELF_D, 9).topMid[0], DISK_Y + 20];

  /* ── flow rails (invisible guides for the particle system) ────────── */
  const cW = client.topMid, wC = wal.topMid, mC = mem3d.topMid;
  const writeRail = `M${f2(cW[0])} ${f2(cW[1])} Q ${f2((cW[0] + wC[0]) / 2)} ${f2(Math.min(cW[1], wC[1]) - 26)} ${f2(wC[0])} ${f2(wC[1])} S ${f2((wC[0] + mC[0]) / 2)} ${f2(Math.min(wC[1], mC[1]) - 30)} ${f2(mC[0])} ${f2(mC[1])}`;
  const flushRail = `M${f2(mC[0])} ${f2(mC[1])} C ${f2(mC[0])} ${f2(mC[1] + 90)} ${f2(l0Center[0] + 60)} ${f2(l0Center[1] - 60)} ${f2(l0Center[0])} ${f2(l0Center[1])}`;

  const svgStr = `
  <svg class="scene scene--lsm" viewBox="0 ${TOP} ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="LSM-Tree write path">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" class="arrowhead"/>
      </marker>
      <filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.18"/>
      </filter>
    </defs>

    <g class="ground">${shadows.join('')}</g>

    <!-- rails drawn as faint guide curves + particle rail paths -->
    <path class="rail-guide rail-guide--write" d="${writeRail}"/>
    <path class="rail-guide rail-guide--flush" d="${flushRail}" marker-end="url(#arrow)"/>
    <path id="rail-write" class="rail" d="${writeRail}"/>
    <path id="rail-flush" class="rail" d="${flushRail}"/>

    <g class="solids" filter="url(#softshadow)">${parts.join('')}</g>

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
