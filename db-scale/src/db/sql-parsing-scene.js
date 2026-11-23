/* sql-parsing-scene.js — the "SQL Parsing" scene, in the same Designed-to-Scale
   isometric vocabulary as the DBMS / LSM lessons. A raw SQL string on the left
   is tokenized by a Lexer cube into a row of token tiles, then assembled by a
   Parser cube into a small tree.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'text', 'tokens', 'grammar', 'parse', 'error', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderSqlParsingScene(snap, opts = {}) {
  const view = snap.view || 'text';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [], guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const putCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };
  const putTile = (t) => { shadows.push(t.shadow); solids.push(t.g); };
  const capText = (x, y, t) => badges.push(`<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`);
  const regText = (x, y, t) => badges.push(`<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`);

  /* ── raw SQL panel (left) ─────────────────────────────────────────────── */
  function sqlPanel() {
    badges.push(region(40, 95, 285, 156, ''));
    badges.push(pill(182, 86, 'raw string', { icon: 'file' }));
    const lines = ['SELECT name', 'FROM users WHERE', 'total > 100'];
    lines.forEach((ln, i) => badges.push(`<text class="sst-cap" x="64" y="${A(150 + i * 30)}" text-anchor="start">${esc(ln)}</text>`));
  }

  /* ── token row ────────────────────────────────────────────────────────── */
  const TOKENS = ['SELECT', 'name', 'FROM', 'users', 'WHERE', '> 100'];
  const tokX = [560, 634, 708, 782, 856, 930];
  const tokY = 152;
  function tokenRow(badToken = -1) {
    tokX.forEach((x, i) => {
      const t = isoTile(x, tokY, 26, i === badToken ? 'rose' : 'slate', { h: 14 });
      putTile(t);
      capText(x, A(t.base[1] + 18), TOKENS[i]);
    });
  }

  const lexer = isoCube(458, 150, 54, 58, 'blue', { icon: 'search', label: 'Lexer' });
  const parser = isoCube(612, 338, 56, 62, 'amber', { icon: 'merge', label: 'Parser' });

  /* a small 3-node parse tree rooted near (820, 320) */
  function parseTree() {
    const root = isoCube(822, 316, 40, 42, 'amber', { icon: 'listOrdered', label: 'SELECT', iconSize: 16 });
    const left = isoCube(762, 440, 34, 36, 'green', { icon: 'database', label: 'FROM', iconSize: 14 });
    const right = isoCube(886, 440, 34, 36, 'lilac', { icon: 'search', label: 'WHERE', iconSize: 14 });
    putCube(root); putCube(left); putCube(right);
    guides.push(edge([V(root.base[0], root.base[1] - 6), V(left.top[0], left.top[1] - 2)], { arrow: true }).guide);
    guides.push(edge([V(root.base[0], root.base[1] - 6), V(right.top[0], right.top[1] - 2)], { arrow: true }).guide);
    capText(824, 300, 'parse tree');
  }

  /* ── per-view composition ─────────────────────────────────────────────── */
  if (view === 'text') {
    sqlPanel();
    putCube(lexer);
    const e = edge([V(330, 165), V(400, 155), V(lexer.verts.W.x - 6, lexer.verts.W.y + 6)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    regText(560, 150, 'SELECT name FROM users WHERE total > 100');
    capText(458, A(lexer.base[1] + 20), 'reads the string');
  } else if (view === 'tokens') {
    sqlPanel();
    putCube(lexer);
    tokenRow();
    const e0 = edge([V(330, 165), V(lexer.verts.W.x - 6, lexer.verts.W.y + 6)], { arrow: true });
    guides.push(e0.guide);
    const e = edge([V(lexer.verts.E.x + 2, lexer.front[1]), V(tokX[0] - 20, tokY)], { arrow: true });
    guides.push(e.guide);
    railIn = edge([V(tokX[0] - 10, tokY), V(tokX[tokX.length - 1] + 10, tokY)]).d;
    capText(745, 116, 'one classified token per piece of text');
  } else if (view === 'grammar') {
    sqlPanel();
    putCube(lexer);
    tokenRow();
    const e = edge([V(lexer.verts.E.x + 2, lexer.front[1]), V(tokX[0] - 20, tokY)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(region(620, 300, 390, 210, ''));
    badges.push(pill(815, 290, 'grammar', { icon: 'listOrdered' }));
    const rules = ['query → SELECT cols FROM tbl pred', 'cols  → name ( , name )*', 'pred  → col op literal'];
    rules.forEach((r, i) => badges.push(`<text class="sst-cap" x="645" y="${A(350 + i * 40)}" text-anchor="start">${esc(r)}</text>`));
  } else if (view === 'parse') {
    putCube(lexer);
    tokenRow();
    putCube(parser);
    parseTree();
    guides.push(edge([V(lexer.verts.E.x + 2, lexer.front[1]), V(tokX[0] - 20, tokY)], { arrow: true }).guide);
    const toParser = edge([V(tokX[2], A(tokY + 20)), V(parser.top[0], parser.verts.N.y - 6)], { arrow: true });
    guides.push(toParser.guide); railIn = toParser.d;
    guides.push(edge([V(parser.verts.E.x + 2, parser.front[1]), V(760, 300), V(parser.top[0] + 150, 316)], { arrow: true }).guide);
  } else if (view === 'error') {
    sqlPanel();
    putCube(parser);
    tokenRow(0);
    const e = edge([V(tokX[0], A(tokY + 20)), V(parser.top[0], parser.verts.N.y - 6)], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    regText(612, A(parser.base[1] + 34), 'SELCT  —  syntax error, rejected');
    capText(tokX[0], 110, 'unknown keyword');
  } else { // recap
    putCube(lexer);
    tokenRow();
    putCube(parser);
    parseTree();
    guides.push(edge([V(lexer.verts.E.x + 2, lexer.front[1]), V(tokX[0] - 20, tokY)], { arrow: true }).guide);
    const toParser = edge([V(tokX[2], A(tokY + 20)), V(parser.top[0], parser.verts.N.y - 6)], { arrow: true });
    guides.push(toParser.guide); railIn = toParser.d;
    guides.push(edge([V(parser.verts.E.x + 2, parser.front[1]), V(760, 300), V(972, 316)], { arrow: true }).guide);
    badges.push(pill(300, 120, 'characters → tree', { icon: 'check' }));
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="SQL parsing pipeline">
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
