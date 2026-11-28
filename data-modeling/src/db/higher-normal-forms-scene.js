/* higher-normal-forms-scene.js — the "4NF & 5NF" scene, on the flat schema
   CANVAS (engine/schema2d.js). Hero visual is DECOMPOSITION: a flat table that
   crams two independent many-to-many facts together (offending columns tinted
   rose + an alert chip naming the cartesian blow-up), split into independent
   relations joined only through the shared key.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'table', 'mvd', '4nf', '5nf', 'rare', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the flat table mixing two independent multivalued facts */
const MIXED = [
  { name: 'person', type: 'text', key: true },
  { name: 'skill', type: 'text', key: true },
  { name: 'language', type: 'text', key: true },
];
const PERSON_SKILLS = [
  { name: 'person', type: 'text', key: true },
  { name: 'skill', type: 'text', key: true },
];
const PERSON_LANGS = [
  { name: 'person', type: 'text', key: true },
  { name: 'language', type: 'text', key: true },
];

export function renderHigherNormalFormsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── flat-table views: table / mvd ─────────────────────────────────────── */
  if (view === 'table' || view === 'mvd') {
    const mvd = view === 'mvd';
    const cols = MIXED.map((c, i) => ({ ...c, hot: mvd && (i === 1 || i === 2) }));
    const x = 330, y = 120, w = 300;
    const card = tableCard(x, y, { name: 'person_skills_languages', icon: 'grid', tone: mvd ? 'rose' : 'accent', cols, w });
    body += card.svg;

    if (mvd) {
      body += chip(card.cx, card.bottom + 46, 'rows = skills × languages', { icon: 'alert', iconVar: '--red', w: 254, delay: 0.7 });
      // a 2×2 explosion grid underneath, to make the cartesian product visible
      const gx = card.cx - 150, gy = card.bottom + 86, cw = 150, ch = 34;
      const grid = [
        ['weld · French', 'weld · German'],
        ['plumb · French', 'plumb · German'],
      ];
      grid.forEach((rowArr, r) => rowArr.forEach((t, c) => {
        body += chip(gx + c * (cw + 12) + cw / 2, gy + r * (ch + 10) + ch / 2, t, { w: cw, delay: 0.95 + (r * 2 + c) * 0.1 });
      }));
      body += caption(card.cx, gy + 2 * (ch + 10) + 36, 'Two independent facts forced into a cartesian product — each real fact duplicated across the other dimension.', { delay: 1.5 });
    } else {
      body += chip(card.right + 150, card.rowCy(1), 'person ↠ skill', { icon: 'merge', iconVar: '--accent', w: 186, delay: 0.6 });
      body += chip(card.right + 150, card.rowCy(2), 'person ↠ language', { icon: 'merge', iconVar: '--accent', w: 214, delay: 0.75 });
      body += caption(card.cx, card.bottom + 46, 'One person, two independent lists — skills and languages — unrelated, yet pinned into the same rows.', { delay: 0.95 });
    }
    return assemble({ slug: 'higher-normal-forms', aria: 'A table mixing two independent multivalued facts', body, note: snap.note });
  }

  /* ── 4NF view: two independent relations ───────────────────────────────── */
  if (view === '4nf' || view === 'recap') {
    const skills = tableCard(150, 200, { name: 'person_skills', icon: 'grid', tone: 'accent', cols: PERSON_SKILLS, w: 250 });
    const langs = tableCard(640, 200, { name: 'person_languages', icon: 'globe', tone: 'green', cols: PERSON_LANGS, w: 250 });
    body += skills.svg + langs.svg;

    // they meet only on the shared person key — a ghost link, not a FK chain
    body += connector(
      { x: skills.right, y: skills.rowCy(0), side: 'right' },
      { x: langs.left, y: langs.rowCy(0), side: 'left' },
      { from: 'one', to: 'one', label: 'person', delay: 0.7, ghost: true }).svg;

    if (view === 'recap') {
      const checks = ['3NF', 'BCNF', '4NF', '5NF'];
      const gap = 140, startX = VW / 2 - (checks.length - 1) * gap / 2;
      checks.forEach((t, i) => { body += chip(startX + i * gap, 430, t, { icon: 'check', iconVar: i >= 2 ? '--green' : '--accent', w: 112, delay: 1.1 + i * 0.1 }); });
      body += caption(VW / 2, 500, 'Independent M:N facts, each its own relation — 4NF and 5NF complete the ladder beyond functional dependencies.', { delay: 1.6 });
    } else {
      body += chip(VW / 2, 430, 'rows: skills + languages', { icon: 'check', iconVar: '--green', w: 234, delay: 1.0 });
      body += caption(VW / 2, 500, 'Each multivalued fact in its own table, joined only through person — the cartesian explosion is gone. 4NF.', { delay: 1.3 });
    }
    return assemble({ slug: 'higher-normal-forms', aria: 'Two independent relations joined through a shared key', body, note: snap.note });
  }

  /* ── 5NF view: a three-way relationship into three binary tables ───────── */
  if (view === '5nf') {
    const SP = [{ name: 'supplier', type: 'text', key: true }, { name: 'part', type: 'text', key: true }];
    const SJ = [{ name: 'supplier', type: 'text', key: true }, { name: 'project', type: 'text', key: true }];
    const PJ = [{ name: 'part', type: 'text', key: true }, { name: 'project', type: 'text', key: true }];
    const sp = tableCard(90, 150, { name: 'supplier_part', icon: 'merge', tone: 'accent', cols: SP, w: 240 });
    const sj = tableCard(400, 320, { name: 'supplier_project', icon: 'merge', tone: 'violet', cols: SJ, w: 240 });
    const pj = tableCard(710, 150, { name: 'part_project', icon: 'merge', tone: 'green', cols: PJ, w: 240 });
    body += sp.svg + sj.svg + pj.svg;

    // a triangle of binary relations whose lossless join rebuilds the whole
    body += connector({ x: sp.right, y: sp.rowCy(1), side: 'right' }, { x: sj.left, y: sj.rowCy(0), side: 'left' }, { label: 'supplier', delay: 0.7, ghost: true }).svg;
    body += connector({ x: sj.right, y: sj.rowCy(1), side: 'right' }, { x: pj.left, y: pj.rowCy(1), side: 'left' }, { label: 'project', delay: 0.85, ghost: true }).svg;
    body += connector({ x: sp.right, y: sp.rowCy(0), side: 'right' }, { x: pj.left, y: pj.rowCy(0), side: 'left' }, { label: 'part', delay: 1.0, ghost: true }).svg;

    body += chip(VW / 2, 540, 'natural join rebuilds the original — no phantom rows', { icon: 'check', iconVar: '--green', w: 388, delay: 1.3 });
    return assemble({ slug: 'higher-normal-forms', aria: 'A three-way relationship decomposed into three binary tables', body, note: snap.note });
  }

  /* ── rare view: the full normalization ladder ──────────────────────────── */
  const LADDER = [
    { nf: 'UNF', note: 'one wide, redundant table' },
    { nf: '1NF', note: 'atomic cells, a key per row' },
    { nf: '2NF', note: 'no partial-key dependence' },
    { nf: '3NF', note: 'no transitive dependence' },
    { nf: 'BCNF', note: 'every determinant a key' },
    { nf: '4NF', note: 'one multivalued fact per table' },
    { nf: '5NF', note: 'lossless join dependencies' },
  ];
  const n = LADDER.length, gap = (VW - 180) / (n - 1);
  LADDER.forEach((r, i) => {
    const cx = 90 + i * gap;
    const stop = i <= 4; // most schemas stop at 3NF/BCNF
    body += chip(cx, 150 + i * 56, r.nf, {
      icon: i >= 5 ? 'target' : 'check',
      iconVar: i >= 5 ? '--accent' : '--green',
      w: 96, delay: i * 0.12,
    });
    body += caption(cx, 150 + i * 56 + 34, r.note, { delay: i * 0.12 + 0.2 });
    if (i < n - 1) {
      body += connector(
        { x: cx + 48, y: 150 + i * 56 },
        { x: 90 + (i + 1) * gap - 48, y: 150 + (i + 1) * 56 },
        { side: 'right', delay: i * 0.12 + 0.3, ghost: true }).svg;
    }
  });
  body += caption(VW / 2, 560, 'Normalize to 3NF, verify BCNF; 4NF and 5NF are a diagnosis, reached only when a specific anomaly demands it.', { delay: 1.4 });
  return assemble({ slug: 'higher-normal-forms', aria: 'The full normalization ladder from UNF to 5NF', body, note: snap.note });
}
