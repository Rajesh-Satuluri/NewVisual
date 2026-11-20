/* lsm-scene.js — the database visual language for LSM-Trees.
   Input: a snapshot-shaped object { mem, wal, levels, note } — identical to the
   LSM kernel's snapshot(), so GUIDED steps (hand-authored states) and the LIVE
   LAB (real kernel state) render through the exact same code. That shared
   renderer is the whole point of the "superset" design.

   Output: an <svg> element + named anchor paths the flow system animates along. */

const NS = 'http://www.w3.org/2000/svg';
const VW = 960, VH = 560, VTOP = -28;   // headroom above y=0 so node tags aren't clipped

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

/* a key chip; tomb = deletion marker (red), hi = highlighted (violet) */
function chip(k, v, tomb, hi) {
  const tone = tomb ? 'red' : hi ? 'violet' : 'green';
  const label = tomb ? '⌀' + k : (v == null ? k : k);
  return `<span class="chip chip--${tone}">${esc(label)}</span>`;
}

function keyRow(entries, hiKey) {
  if (!entries || !entries.length) return `<span class="muted">empty</span>`;
  return entries.map(e => chip(e.key, e.value, e.tomb, hiKey != null && e.key === hiKey)).join('');
}

function memEntries(mem) {
  return Object.keys(mem || {}).map(Number).sort((a, b) => a - b)
    .map(k => ({ key: k, value: mem[k].value, tomb: mem[k].tomb }));
}

/* Build the scene. opts: { hiKey, pulse:'flush'|'compact'|null, probe:[tableIds] } */
export function renderLsmScene(snap, opts = {}) {
  const mem = memEntries(snap.mem);
  const levels = snap.levels || [[]];
  const walN = snap.wal || 0;
  const { hiKey = null, pulse = null, probe = [] } = opts;

  // WAL record ticks
  const walTicks = Array.from({ length: Math.min(walN, 8) }, (_, i) =>
    `<rect class="wal__tick" x="${250 + i * 20}" y="18" width="13" height="26" rx="2"/>`).join('');

  // Levels: each level is a shelf row of SSTable cards
  let levelsHTML = '', ly = 250;
  const LVL_H = 86;
  levels.forEach((lvl, n) => {
    const shelfY = ly + n * LVL_H;
    const tables = lvl.map((ss, i) => {
      const x = 250 + i * 150;
      const probed = probe.includes(ss.id);
      const ents = ss.entries.map(e => chip(e.key, e.value, e.tomb, hiKey != null && e.key === hiKey)).join('');
      return `
        <g class="sst ${probed ? 'is-probed' : ''}" transform="translate(${x} ${shelfY})">
          <path class="sst__side" d="M0 46 L10 52 L10 22 L0 16 Z"/>
          <rect class="sst__top" x="0" y="0" width="128" height="46" rx="6"/>
          <text class="sst__id" x="8" y="15">SSTable #${ss.id}</text>
          <text class="sst__range" x="120" y="15" text-anchor="end">${ss.min}–${ss.max}</text>
          <foreignObject x="6" y="20" width="116" height="22">
            <div xmlns="http://www.w3.org/1999/xhtml" class="sst__keys">${ents}</div>
          </foreignObject>
        </g>`;
    }).join('');
    const hasData = lvl.length > 0;
    levelsHTML += `
      <g class="level ${hasData ? '' : 'is-empty'} ${pulse === 'compact' && n <= 1 ? 'is-pulse' : ''}">
        <text class="level__label" x="200" y="${shelfY + 28}" text-anchor="end">L${n}</text>
        <line class="level__rule" x1="212" y1="${shelfY + 48}" x2="${VW - 30}" y2="${shelfY + 48}"/>
        ${tables || `<text class="level__empty" x="250" y="${shelfY + 30}">—</text>`}
      </g>`;
  });

  const svgStr = `
  <svg class="scene scene--lsm" viewBox="0 ${VTOP} ${VW} ${VH - VTOP}" preserveAspectRatio="xMidYMin meet" role="img">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" class="arrowhead"/>
      </marker>
    </defs>

    <!-- client -->
    <g class="node node--client" transform="translate(40 60)">
      <rect x="0" y="0" width="150" height="54" rx="10"/>
      <text class="node__title" x="16" y="24">Client / App</text>
      <text class="node__sub" x="16" y="42">PUT · DELETE · GET</text>
    </g>

    <!-- WAL append-only log -->
    <g class="node node--wal ${pulse === 'write' ? 'is-pulse' : ''}" transform="translate(0 0)">
      <rect x="244" y="10" width="300" height="44" rx="8" class="wal__box"/>
      <text class="node__tag" x="250" y="8">WAL · append-only log</text>
      ${walTicks}
      <text class="wal__count" x="534" y="37" text-anchor="end">${walN} rec</text>
    </g>

    <!-- MemTable -->
    <g class="node node--mem ${pulse === 'flush' ? 'is-pulse' : ''}" transform="translate(600 10)">
      <rect x="0" y="0" width="320" height="100" rx="10" class="mem__box"/>
      <text class="node__tag" x="6" y="-4">MemTable · sorted, in RAM</text>
      <foreignObject x="10" y="34" width="300" height="56">
        <div xmlns="http://www.w3.org/1999/xhtml" class="mem__keys">${keyRow(mem, hiKey)}</div>
      </foreignObject>
      <text class="mem__meta" x="10" y="26">${mem.length} key${mem.length === 1 ? '' : 's'}</text>
    </g>

    <!-- flow paths (invisible rails the particles follow) -->
    <path id="rail-write" class="rail" d="M190 84 L244 32 M544 32 L600 60" />
    <path id="rail-flush" class="rail" d="M760 110 L760 250" marker-end="url(#arrow)"/>

    <!-- on-disk levels -->
    <text class="disk__label" x="30" y="236">on disk ↓</text>
    ${levelsHTML}

    <!-- particle layer (populated by the flow system) -->
    <g class="flow-layer"></g>
  </svg>`;

  const tmp = document.createElementNS(NS, 'g');
  // parse the SVG string into a real element
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
