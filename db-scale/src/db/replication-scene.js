/* replication-scene.js — the "Replication" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one node, SPOF + read bottleneck), 'leader' (leader streams
   to followers), 'reads' (reads fan out across replicas), 'failover' (leader
   dies, a follower is promoted), 'tradeoff' (sync vs async), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderReplicationScene(snap, opts = {}) {
  const view = snap.view || 'leader';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // a client on the left issues requests
  function client(cy, label) {
    const c = isoCube(150, cy, 50, 56, 'blue', { icon: 'app', label: 'Client', sub: label, iconSize: 22 });
    shadows.push(c.shadow); solids.push(c.g);
    return c;
  }
  // a database node
  function node(cx, cy, mat, label, sub, o = {}) {
    const c = isoCube(cx, cy, o.rx || 66, o.h || 58, mat, {
      icon: o.icon || 'database', label, sub, iconSize: 20,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  }

  /* ── TRADE-OFF: two columns, sync vs async ───────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 412, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 240 }));
      const head = node(x + 150, 168, mat, title.split(' ')[0], '', { rx: 58, h: 52, icon });
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'Synchronous', 'check', 'green', [
      '+ zero data loss on failover',
      '+ replicas always current',
      '− writes wait for replicas',
      '− one slow replica stalls all',
    ]);
    col(630, 'Asynchronous', 'bolt', 'amber', [
      '+ fast local-speed writes',
      '+ a slow replica never blocks',
      '− failover can lose recent writes',
      '− replicas lag behind the leader',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── SINGLE: one node, single point of failure ───────────────────────── */
  if (view === 'single') {
    const cl = client(236, 'reads + writes');
    const n = node(560, 236, 'slate', 'DB node', 'the only copy', { rx: 92, h: 78 });
    const ei = edge([V(cl.verts.E.x - 2, cl.front[1]), V((cl.verts.E.x + n.verts.W.x) / 2, 236), V(n.verts.W.x - 6, n.verts.W.y + 8)], { arrow: true });
    guides.push(ei.guide); railIn = ei.d;
    badges.push(region(452, 150, 320, 250, '', { r: 22 }));
    badges.push(pill(612, 130, 'single point of failure', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(560, 400, 'every read & write hits one box', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(cap(560, 470, 'if it dies, the data is gone with it'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEADER / READS / FAILOVER / RECAP: a leader + three followers ───── */
  const LEADER = { x: 430, y: 236 };
  const FOLL = [{ x: 760, y: 120 }, { x: 790, y: 270 }, { x: 760, y: 420 }];

  if (view === 'leader' || view === 'recap') {
    const cl = client(236, view === 'recap' ? 'one logical DB' : 'writes');
    const leader = node(LEADER.x, LEADER.y, 'amber', 'Leader', 'takes writes', { rx: 74, h: 64, halo: true });
    // client → leader (write)
    const ei = edge([V(cl.verts.E.x - 2, cl.front[1]), V((cl.verts.E.x + leader.verts.W.x) / 2, 236), V(leader.verts.W.x - 6, leader.verts.W.y + 8)], { arrow: true });
    guides.push(ei.guide); railIn = ei.d;
    // leader → each follower (replication = write)
    FOLL.forEach((f, i) => {
      const fol = node(f.x, f.y, 'green', 'Follower', 'copy', { rx: 58, h: 52 });
      const e = edge([V(leader.verts.E.x - 2, leader.front[1]), V((leader.verts.E.x + fol.verts.W.x) / 2, (LEADER.y + f.y) / 2), V(fol.verts.W.x - 6, fol.verts.W.y + 8)], { arrow: true, dashed: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill(cl ? 270 : 270, 150, view === 'recap' ? 'clients' : 'writes', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(600, 190, 'change log streamed', { icon: 'merge', cls: 'pill--sst' }));
    if (view === 'recap') {
      ['durable copies', 'read scale', 'high availability'].forEach((t, i) => badges.push(pill(922, 150 + i * 52, t, { icon: 'check', w: 176 })));
      badges.push(cap(560, 500, 'many copies, one agreed leader'));
    } else {
      badges.push(cap(560, 500, 'one writer, N synchronized copies'));
    }
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'reads') {
    const cl = client(236, 'reads');
    const leader = node(LEADER.x, LEADER.y, 'amber', 'Leader', 'writes only', { rx: 74, h: 64 });
    // reads fan out to followers instead of the leader
    FOLL.forEach((f, i) => {
      const fol = node(f.x, f.y, 'green', 'Follower', 'serves reads', { rx: 58, h: 52, halo: i === 1 });
      // leader keeps streaming (dashed, behind)
      const rep = edge([V(leader.verts.E.x - 2, leader.front[1]), V((leader.verts.E.x + fol.verts.W.x) / 2, (LEADER.y + f.y) / 2), V(fol.verts.W.x - 6, fol.verts.W.y + 8)], { dashed: true });
      guides.push(rep.guide);
      // client → follower (read)
      const e = edge([V(cl.verts.E.x - 2, cl.front[1] + (i - 1) * 10), V(300, f.y), V(fol.verts.W.x - 6, fol.verts.W.y + 8)], { arrow: true });
      guides.push(e.guide); if (i === 0) railIn = e.d;
    });
    badges.push(pill(leader.top[0], 150, 'leader spared', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(600, 300, 'read any replica', { icon: 'search', cls: 'pill--sst' }));
    badges.push(cap(560, 500, 'read throughput scales with replica count'));
    flows.push({ id: 'in', kind: 'read', speed: 190, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'failover') {
    const cl = client(236, 'writes resume');
    // dead leader
    const dead = node(LEADER.x, LEADER.y, 'slate', 'Leader', 'crashed', { rx: 74, h: 64, ghost: true });
    badges.push(pill(LEADER.x, 150, 'leader DOWN', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${A(LEADER.x)}" y="${A(LEADER.y + 10)}" text-anchor="middle">✕</text>`);
    FOLL.forEach((f, i) => {
      const promoted = i === 0;
      const fol = node(f.x, f.y, promoted ? 'amber' : 'green', promoted ? 'New leader' : 'Follower', promoted ? 'promoted' : 'copy', { rx: 58, h: 52, halo: promoted });
      if (promoted) {
        // client → new leader
        const e = edge([V(cl.verts.E.x - 2, cl.front[1]), V(420, 120), V(fol.verts.W.x - 6, fol.verts.W.y + 8)], { arrow: true });
        guides.push(e.guide); railIn = e.d;
        badges.push(pill(f.x, f.y - 86, 'elected leader', { icon: 'check', cls: 'pill--sst' }));
      } else {
        // new leader → remaining followers
        const nl = FOLL[0];
        const e = edge([V(nl.x, nl.y + 40), V((nl.x + f.x) / 2, (nl.y + f.y) / 2 + 20), V(fol.verts.N.x, fol.verts.N.y - 2)], { arrow: true, dashed: true });
        guides.push(e.guide); if (i === 1) railOut = e.d;
      }
    });
    badges.push(cap(560, 510, 'a follower takes over — writes continue, no data lost'));
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  // fallback
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
  <svg class="scene scene--replication" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Replication across nodes">
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
