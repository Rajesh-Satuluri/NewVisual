/* wide-column-modeling-scene.js — "Wide-Column Modeling" on the NoSQL canvas
   (engine/nosql2d.js). The hero is a partition as a map of maps: a partition key over
   a wide, sparse, dynamic, sorted set of column→value cells.

   Input: a view-snapshot { view, note }.
   Views: 'maps', 'widerow', 'dynamic', 'sorted', 'sparse', 'recap'. Unknown → recap. */

import { partition, kvStore, chip, tag, band, caption, assemble, VW } from '../engine/nosql2d.js';

export function renderWideColumnModelingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── maps: two partitions, each its own column map, different columns ───── */
  if (view === 'maps') {
    const a = partition(150, 150, {
      label: 'user#42', sub: 'partition key', tone: 'accent', w: 300, h: 230, delay: 0.3,
      items: [
        { t: 'name       = "Ada"', tone: 'accent' },
        { t: 'tier       = "gold"', tone: 'accent' },
        { t: 'last_login = ts#0931', tone: 'violet' },
      ],
    });
    const b = partition(590, 150, {
      label: 'user#43', sub: 'partition key', tone: 'green', w: 300, h: 230, delay: 0.6,
      items: [
        { t: 'name     = "Lin"', tone: 'green' },
        { t: 'referrer = "ad#7"', tone: 'violet' },
      ],
    });
    body += a.svg + b.svg;
    body += chip(VW / 2, 100, 'partition key → (column → value)', { icon: 'grid', w: 300, delay: 1.0 });
    body += caption(VW / 2, 440, 'A map of maps: each partition holds its own column→value map — the two rows carry different columns.', { delay: 1.3 });
    return assemble({ slug: 'wide-column-modeling', aria: 'Two partitions holding different column maps', body, note: snap.note });
  }

  /* ── dynamic: two writes add two differently-named columns to one row ───── */
  if (view === 'dynamic') {
    const p = partition(300, 150, {
      label: 'user#42', sub: 'partition', tone: 'accent', w: 360, h: 250, delay: 0.3,
      items: [
        { t: 'name        = "Ada"', tone: 'slate' },
        { t: 'ts#0931 = "login"', tone: 'accent', hot: true },
        { t: 'ts#1104 = "purchase"', tone: 'violet', hot: true },
      ],
    });
    body += p.svg;
    body += chip(p.right + 150, p.slotCy(1), 'write → column appears', { icon: 'wal', iconVar: '--accent', w: 220, delay: 1.0 });
    body += chip(p.right + 150, p.slotCy(2), 'no ALTER TABLE', { icon: 'bolt', iconVar: '--green', w: 176, delay: 1.2 });
    body += caption(VW / 2, p.bottom + 36, 'Each write names its own column key — the column springs into existence for this row only.', { delay: 1.5 });
    return assemble({ slug: 'wide-column-modeling', aria: 'Dynamic columns created per write', body, note: snap.note });
  }

  /* ── widerow: one partition holding a very wide run of columns ──────────── */
  if (view === 'widerow') {
    const p = partition(310, 130, {
      label: 'user#42', sub: 'one wide row', tone: 'accent', w: 420, h: 300, delay: 0.3,
      items: [
        { t: 'ts#0001 = "login"', tone: 'accent' },
        { t: 'ts#0002 = "view p#9"', tone: 'accent' },
        { t: 'ts#0003 = "add cart"', tone: 'accent' },
        { t: '…       (2,397 more)', tone: 'slate' },
        { t: 'ts#2400 = "logout"', tone: 'violet' },
      ],
    });
    body += p.svg;
    body += tag(p.cx, p.top - 22, '2,400 columns in one row', { tone: 'violet', delay: 1.1 });
    body += chip(p.right + 120, p.slotCy(2), 'columns are the data', { icon: 'layers', iconVar: '--accent', w: 196, delay: 1.3 });
    body += caption(VW / 2, p.bottom + 36, 'A per-user event stream: thousands of columns under one partition, read in a single seek.', { delay: 1.6 });
    return assemble({ slug: 'wide-column-modeling', aria: 'One very wide partition of event columns', body, note: snap.note });
  }

  /* ── sparse: two sparse rows vs a null-padded relational grid ───────────── */
  if (view === 'sparse') {
    body += band(70, 120, 420, 320, 'Wide-column — sparse', { sub: 'store only what each row wrote', delay: 0.3 });
    const a = partition(100, 190, {
      label: 'user#42', sub: 'partition', tone: 'accent', w: 160, h: 150, delay: 0.5,
      items: [{ t: 'name', tone: 'accent' }, { t: 'tier', tone: 'accent' }, { t: 'phone', tone: 'accent' }],
    });
    const b = partition(300, 190, {
      label: 'user#43', sub: 'partition', tone: 'green', w: 160, h: 150, delay: 0.7,
      items: [{ t: 'name', tone: 'green' }, { t: 'referrer', tone: 'violet' }],
    });
    body += a.svg + b.svg;

    body += band(540, 120, 430, 320, 'Relational — fixed grid', { sub: 'every row carries every column', delay: 0.4 });
    const grid = kvStore(570, 185, {
      title: 'users', icon: 'grid', tone: 'rose', w: 370, delay: 0.9,
      rows: [
        { k: 'name',     v: 'Ada      · Lin' },
        { k: 'tier',     v: 'gold     · NULL' },
        { k: 'phone',    v: '555-01   · NULL' },
        { k: 'referrer', v: 'NULL     · ad#7' },
      ],
    });
    body += grid.svg;
    body += chip(755, 155, 'NULLs stored & scanned', { icon: 'alert', iconVar: '--amber', w: 220, delay: 1.3 });
    body += caption(VW / 2, 500, 'Absent columns cost nothing on the left; the relational grid materializes a NULL for every column a row lacks.', { delay: 1.6 });
    return assemble({ slug: 'wide-column-modeling', aria: 'Sparse rows versus a null-padded relational grid', body, note: snap.note });
  }

  /* ── sorted / recap: a partition of timestamp-sorted columns, range-read ── */
  const p = partition(340, 130, {
    label: 'user#42', sub: 'partition', tone: 'accent', w: 360, h: 280, delay: 0.3,
    items: [
      { t: 'ts#0931 = "login"', tone: 'slate' },
      { t: 'ts#1104 = "view p#9"', tone: 'slate' },
      { t: 'ts#1340 = "add cart"', tone: 'accent', hot: true },
      { t: 'ts#1512 = "checkout"', tone: 'accent', hot: true },
      { t: 'ts#1618 = "logout"', tone: 'accent', hot: true },
    ],
  });
  body += p.svg;
  body += chip(p.right + 140, p.slotCy(0), 'sorted by ts', { icon: 'listOrdered', iconVar: '--accent', w: 160, delay: 1.0 });
  const label = view === 'recap' ? 'partition + range → one sweep' : 'last-N = column-range slice';
  body += chip(p.right + 140, p.slotCy(3), label, { icon: 'target', iconVar: '--green', w: 230, delay: 1.2 });
  body += caption(VW / 2, p.bottom + 34, 'Columns kept in sorted order, so “the most recent events” is one contiguous range read inside the partition.', { delay: 1.5 });
  return assemble({ slug: 'wide-column-modeling', aria: 'Sorted columns sliced by a range read', body, note: snap.note });
}
