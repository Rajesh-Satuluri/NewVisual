/* consistency-scene.js — the "Consistency" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (replicas disagree), 'strong' (coordinated, all latest),
   'eventual' (diverge then converge), 'causal' (read-your-writes),
   'spectrum' (the strong→causal→eventual dial), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* three replicas across the middle band */
const RY = 338, RRX = 64, RBH = 52;
const REPL = [{ k: 'R1', x: 312 }, { k: 'R2', x: 540 }, { k: 'R3', x: 768 }];

export function renderConsistencyScene(snap, opts = {}) {
  const view = snap.view || 'problem';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── SPECTRUM: a three-rung dial, no replica row ───────────────────────── */
  if (view === 'spectrum') {
    const rungs = [
      { x: 250, y: 408, mat: 'green', label: 'Strong', sub: 'linearizable', note: 'freshest · most coordination' },
      { x: 540, y: 300, mat: 'blue',  label: 'Causal', sub: 'session',      note: 'ordered where it matters' },
      { x: 830, y: 192, mat: 'amber', label: 'Eventual', sub: 'converges',  note: 'cheapest · can be stale' },
    ];
    const cubes = rungs.map(r => {
      const c = isoCube(r.x, r.y, 70, 58, r.mat, { icon: 'database', label: r.label, sub: r.sub, iconSize: 20, halo: true });
      shadows.push(c.shadow); halos.push(c.halo); solids.push(c.g);
      return c;
    });
    // climbing connector strong → causal → eventual
    for (let i = 0; i < cubes.length - 1; i++) {
      const a = cubes[i], b = cubes[i + 1];
      const e = edge([V(a.verts.E.x - 2, a.verts.E.y - 6), V((rungs[i].x + rungs[i + 1].x) / 2, (rungs[i].y + rungs[i + 1].y) / 2 - 20), V(b.verts.W.x + 2, b.verts.W.y - 6)], { arrow: true, dashed: true });
      guides.push(e.guide);
    }
    rungs.forEach(r => badges.push(cap(r.x, r.y + 86, r.note)));
    badges.push(pill(250, 150, 'fresher reads ↑', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(830, 486, 'lower latency · more available ↓', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(120, 150, 800, 360, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="178" text-anchor="middle">ONE DIAL · CAP &amp; PACELC IN A PICTURE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RECAP: a labelled dial from strong to eventual ────────────────────── */
  if (view === 'recap') {
    badges.push(region(228, 180, 584, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="210" text-anchor="middle">CONSISTENCY IS A DIAL, NOT A YES / NO</text>`);
    const ends = [
      { x: 330, mat: 'green', label: 'Strong', sub: 'bank ledger' },
      { x: 540, mat: 'blue',  label: 'Causal', sub: 'social feed' },
      { x: 750, mat: 'amber', label: 'Eventual', sub: 'like counter' },
    ];
    ends.forEach(e => {
      const c = isoCube(e.x, 300, 60, 52, e.mat, { icon: 'database', label: e.label, sub: e.sub, iconSize: 18 });
      shadows.push(c.shadow); solids.push(c.g);
    });
    const tags = ['pick the weakest model that is still correct', 'stronger = fresher reads, more coordination', 'weaker = lower latency, higher availability'];
    tags.forEach((t, i) => badges.push(pill(VW / 2, 420 + i * 44, t, { icon: 'check', w: 440 })));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── replica-row views: problem / strong / eventual / causal ───────────── */
  // per-view version + styling for each replica
  let state, client = null, title = '';
  if (view === 'problem') {
    state = { R1: { sub: 'v7', mat: 'green', halo: true }, R2: { sub: 'v6', mat: 'slate' }, R3: { sub: 'v5', mat: 'rose', halo: true } };
    client = { side: 'right', label: 'Reader', q: '?' };
    title = 'mid-propagation · replicas disagree';
  } else if (view === 'strong') {
    state = { R1: { sub: 'v7', mat: 'green', halo: true }, R2: { sub: 'v7', mat: 'green', halo: true }, R3: { sub: 'v7', mat: 'green', halo: true } };
    client = { side: 'right', label: 'Reader', q: 'v7' };
    title = 'linearizable · one logical copy';
  } else if (view === 'eventual') {
    state = { R1: { sub: 'v7', mat: 'green', halo: true }, R2: { sub: 'v6', mat: 'amber' }, R3: { sub: 'v5', mat: 'amber' } };
    client = { side: 'right', label: 'Reader', q: 'v5?' };
    title = 'answers now · converges later';
  } else { // causal
    state = { R1: { sub: 'v7', mat: 'green', halo: true }, R2: { sub: 'v6', mat: 'amber' }, R3: { sub: 'v5', mat: 'amber' } };
    client = { side: 'left', label: 'You', q: 'v7' };
    title = 'read-your-writes · monotonic';
  }

  badges.push(pill(VW / 2, 92, title, { icon: 'database', cls: 'pill--sst' }));

  const cubes = {};
  REPL.forEach(r => {
    const st = state[r.k];
    const c = isoCube(r.x, RY, RRX, RBH, st.mat, { icon: 'database', label: r.k, sub: st.sub, iconSize: 20, halo: !!st.halo });
    cubes[r.k] = c;
    shadows.push(c.shadow); if (st.halo) halos.push(c.halo); solids.push(c.g);
  });

  // client cube
  const clX = client.side === 'right' ? 904 : 150, clY = 168;
  const cl = isoCube(clX, clY, 48, 52, 'blue', { icon: 'app', label: client.label, iconSize: 20 });
  shadows.push(cl.shadow); solids.push(cl.g);

  // read connector(s) between client and replica(s)
  function readEdge(repl, animate, dashed) {
    const c = cubes[repl];
    const from = client.side === 'right'
      ? [V(cl.verts.W.x - 2, cl.front[1]), V((clX + REPL.find(r => r.k === repl).x) / 2, cl.front[1] + 48), V(c.verts.N.x, c.verts.N.y - 2)]
      : [V(cl.verts.E.x - 2, cl.front[1]), V((clX + REPL.find(r => r.k === repl).x) / 2, cl.front[1] + 48), V(c.verts.N.x, c.verts.N.y - 2)];
    const e = edge(from, { arrow: true, dashed: !!dashed });
    guides.push(e.guide);
    if (animate) railIn = e.d;
  }

  if (view === 'problem') {
    ['R1', 'R2', 'R3'].forEach((k, i) => readEdge(k, i === 0, true));
    badges.push(pill(clX, 230, 'read x → ?', { icon: 'search', cls: 'pill--sst' }));
    REPL.forEach((r, i) => {
      const v = state[r.k].sub;
      badges.push(cap(r.x, cubes[r.k].base[1] + 16, 'answers ' + v));
    });
    badges.push(region(688, 430, 300, 110, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="838" y="474" text-anchor="middle">WHICH ONE IS x?</text>`);
    badges.push(cap(838, 506, 'three replicas, three answers'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  else if (view === 'strong') {
    // reads route through a coordination band, then to replicas
    readEdge('R2', true, false);
    badges.push(region(228, 268, 624, 150, 'coordination · quorum / consensus', { r: 22 }));
    badges.push(pill(clX, 230, 'read → latest', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 470, 'every read sees v7 · reads never go backwards', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 508, 'correctness bought with coordination latency'));
    flows.push({ id: 'in', kind: 'read', speed: 110, size: 5 });
  }

  else if (view === 'eventual') {
    readEdge('R3', true, true);
    // gossip arrows R1 → R2 → R3 (background propagation)
    const g1 = edge([V(cubes.R1.verts.E.x - 2, cubes.R1.front[1]), V((REPL[0].x + REPL[1].x) / 2, RY + 70), V(cubes.R2.verts.W.x + 2, cubes.R2.front[1])], { arrow: true, dashed: true });
    const g2 = edge([V(cubes.R2.verts.E.x - 2, cubes.R2.front[1]), V((REPL[1].x + REPL[2].x) / 2, RY + 70), V(cubes.R3.verts.W.x + 2, cubes.R3.front[1])], { arrow: true, dashed: true });
    guides.push(g1.guide); guides.push(g2.guide);
    railOut = g1.d;
    badges.push(cap((REPL[0].x + REPL[2].x) / 2, RY + 96, 'writes propagate in the background → all converge to v7'));
    badges.push(pill(clX, 230, 'read → maybe stale', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(688, 436, 300, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="838" y="474" text-anchor="middle">STALE, THEN CORRECT</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
  }

  else { // causal
    // the client wrote v7 to R1 and always reads it back from R1
    const w = edge([V(cl.verts.E.x - 2, cl.front[1]), V((clX + REPL[0].x) / 2, cl.front[1] + 48), V(cubes.R1.verts.N.x, cubes.R1.verts.N.y - 2)], { arrow: true });
    guides.push(w.guide); railOut = w.d;
    readEdge('R1', true, true);
    badges.push(pill(clX, 230, 'wrote v7', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(cap(cubes.R1.top[0], cubes.R1.base[1] + 16, 'your write'));
    badges.push(cap(cubes.R2.top[0], cubes.R2.base[1] + 16, 'others still lag'));
    badges.push(cap(cubes.R3.top[0], cubes.R3.base[1] + 16, 'others still lag'));
    badges.push(region(300, 436, 440, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="474" text-anchor="middle">YOU ALWAYS SEE YOUR OWN WRITE</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--consistency" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Consistency models across replicas">
    ${iso3dDefs()}
    ${grid}
    <g class="ground">${halos.join('')}${shadows.join('')}</g>
    <g class="regions">${regionBadges.join('')}</g>
    ${guides.join('')}
    ${rails}
    <g class="solids">${solids.join('')}</g>
    <g class="overlays">${overlays.join('')}</g>
    <g class="badges">${otherBadges.join('')}</g>
    <g class="flow-layer"></g>
  </svg>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = svgStr;
  const svg = wrap.querySelector('svg');
  return {
    svg,
    layer: svg.querySelector('.flow-layer'),
    rail: (id) => svg.querySelector('#rail-' + id),
    flows: flows || [],
    note: note || '',
  };
}
