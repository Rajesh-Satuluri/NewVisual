/* time-series-modeling-scene.js — "Time-Series Modeling" on the NoSQL canvas
   (engine/nosql2d.js). The hero is a set of time-bucketed partitions holding
   timestamped readings sorted newest-first, contrasted against one unbounded
   per-sensor partition, with TTL expiry and raw→hourly→daily rollups.

   Input: a view-snapshot { view, note }.
   Views: 'workload', 'unbounded', 'bucket', 'rangeread', 'rollup', 'recap'. Unknown → recap. */

import { partition, accessList, itemRow, kvStore, sweep, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* three monthly buckets of one sensor, readings sorted newest-first */
const BUCKETS = [
  { label: 'sensor_42#2024-03', sub: 'bucket · Mar', items: [{ t: '03-31 23:59 · 71.2°' }, { t: '03-31 23:49 · 71.0°' }, { t: '03-31 23:39 · 70.9°' }] },
  { label: 'sensor_42#2024-02', sub: 'bucket · Feb', items: [{ t: '02-29 18:00 · 68.4°' }, { t: '02-14 09:00 · 66.1°' }, { t: '02-01 00:00 · 65.0°' }] },
  { label: 'sensor_42#2024-01', sub: 'bucket · Jan', items: [{ t: '01-31 22:10 · 64.8°' }, { t: '01-15 12:00 · 63.2°' }, { t: '01-01 00:00 · 60.0°' }] },
];
const BX = [70, 390, 710];

export function renderTimeSeriesModelingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── workload: append writes vs recent-range reads ─────────────────────── */
  if (view === 'workload') {
    const writes = kvStore(70, 160, {
      title: 'writes · append-only', icon: 'wal', tone: 'accent', w: 360, delay: 0.3,
      rows: [
        { k: 'sensor_42', v: 't=12:00:00 · 70.9°' },
        { k: 'sensor_42', v: 't=12:00:10 · 71.0°' },
        { k: 'sensor_42', v: 't=12:00:20 · 71.2°' },
        { k: '…', v: 'every 10s · forever', hot: true },
      ],
    });
    body += writes.svg;
    const reads = accessList(560, 160, {
      title: 'reads · recent range', icon: 'target', tone: 'violet', w: 400, delay: 0.5,
      patterns: [
        { t: 'last hour of sensor_42', done: true },
        { t: "today's readings for this device", done: true },
        { t: 'this week by entity + time range', done: true },
        { t: 'old data — rarely, in bulk', done: false },
      ],
    });
    body += reads.svg;
    body += chip(VW / 2, 110, 'append constantly · read recent windows', { icon: 'clock', iconVar: '--accent', w: 340, delay: 1.2 });
    body += caption(VW / 2, 430, 'The whole model serves exactly this: relentless append-only writes and recent-range-by-entity reads.', { delay: 1.4 });
    return assemble({ slug: 'time-series-modeling', aria: 'The time-series workload: append writes and recent-range reads', body, note: snap.note });
  }

  /* ── unbounded: one ever-growing per-sensor partition ──────────────────── */
  if (view === 'unbounded') {
    const part = partition(380, 120, {
      label: 'PK = sensor_42', sub: 'all history · one node', tone: 'rose', hot: true, w: 300, delay: 0.3,
      items: [
        { t: '2024-03-31 · newest', tone: 'rose', hot: true },
        { t: '2024-02-14', tone: 'rose' },
        { t: '2024-01-01', tone: 'rose' },
        { t: '2023-… · millions more', tone: 'rose', hot: true },
        { t: '↓ grows forever', tone: 'rose', hot: true },
      ],
    });
    body += part.svg;
    body += chip(part.right + 120, part.slotCy(0), 'hot write frontier', { icon: 'bolt', iconVar: '--red', w: 190, delay: 1.0 });
    body += chip(part.right + 120, part.slotCy(3), 'past size limit', { icon: 'alert', iconVar: '--amber', w: 176, delay: 1.2 });
    body += caption(VW / 2, part.bottom + 40, 'Entity-only key → one unbounded partition: hot on writes, over the size limit, and nothing ever expires.', { delay: 1.4 });
    return assemble({ slug: 'time-series-modeling', aria: 'A single unbounded per-sensor partition', body, note: snap.note });
  }

  /* ── bucket: entity + time-window partitions ───────────────────────────── */
  if (view === 'bucket') {
    BUCKETS.forEach((b, i) => {
      body += partition(BX[i], 160, {
        label: b.label, sub: b.sub, tone: i === 0 ? 'accent' : 'slate', w: 260, h: 230, delay: 0.3 + i * 0.14,
        items: b.items.map(it => ({ ...it, tone: i === 0 ? 'accent' : 'slate' })),
      }).svg;
    });
    body += chip(VW / 2, 110, 'PK = entity # time-window', { icon: 'grid', iconVar: '--accent', w: 280, delay: 1.1 });
    body += tag(BX[0] + 130, 140, 'current bucket', { tone: 'accent', delay: 1.3 });
    body += caption(VW / 2, 420, 'Each month is a bounded partition; the write target moves to a fresh bucket every window, spreading load over time.', { delay: 1.5 });
    return assemble({ slug: 'time-series-modeling', aria: 'Sensor readings split into bounded monthly buckets', body, note: snap.note });
  }

  /* ── rangeread: one bucket, ts DESC, a range sweep ─────────────────────── */
  if (view === 'rangeread') {
    const part = partition(360, 120, {
      label: 'sensor_42#2024-03', sub: 'clustered by ts DESC', tone: 'accent', w: 320, delay: 0.3,
      items: [
        { t: '23:59 · 71.2°  ← newest', tone: 'accent' },
        { t: '11:00 · 70.4°', tone: 'violet' },
        { t: '10:30 · 70.1°', tone: 'violet' },
        { t: '10:00 · 69.8°', tone: 'violet' },
        { t: '00:00 · 65.0°  ← oldest', tone: 'accent' },
      ],
    });
    body += part.svg;
    const top = part.slotCy(1) - 15;
    body += sweep(372, top, 296, part.slotCy(3) - top + 15, { delay: 1.1 });
    body += chip(part.cx, part.top - 22, 'range 10:00 – 11:00', { icon: 'search', iconVar: '--accent', w: 230, delay: 1.45 });
    body += chip(VW / 2, part.bottom + 28, 'one contiguous slice · already sorted', { icon: 'bolt', iconVar: '--green', w: 330, delay: 1.5 });
    body += caption(VW / 2, part.bottom + 68, 'Newest-first ordering makes "latest N" and a time range the same cheap read — one slice of an already-sorted partition.', { delay: 1.7 });
    return assemble({ slug: 'time-series-modeling', aria: 'A recent-range sweep over a timestamp-descending bucket', body, note: snap.note });
  }

  /* ── rollup: TTL expiry + raw→hourly→daily downsampling ─────────────────── */
  if (view === 'rollup') {
    const raw = partition(60, 150, {
      label: 'raw · TTL 7d', sub: '10-second points', tone: 'rose', w: 280, h: 230, delay: 0.3,
      items: [{ t: '12:00:10 · 71.0°' }, { t: '12:00:20 · 71.2°' }, { t: 'expiring…', tone: 'rose', hot: true }, { t: '✕ aged out', tone: 'rose', hot: true }].map(it => ({ ...it, tone: it.tone || 'rose' })),
    });
    const hourly = partition(400, 150, {
      label: 'hourly · TTL 90d', sub: 'avg per hour', tone: 'violet', w: 240, h: 230, delay: 0.6,
      items: [{ t: '12:00 · avg 71.1°' }, { t: '11:00 · avg 70.3°' }, { t: '10:00 · avg 69.9°' }].map(it => ({ ...it, tone: 'violet' })),
    });
    const daily = partition(700, 150, {
      label: 'daily · TTL 2y', sub: 'avg per day', tone: 'green', w: 260, h: 230, delay: 0.9,
      items: [{ t: '03-31 · avg 70.0°' }, { t: '03-30 · avg 68.5°' }].map(it => ({ ...it, tone: 'green' })),
    });
    body += raw.svg + hourly.svg + daily.svg;
    body += arrow({ x: raw.right, y: raw.headCy + 30, side: 'right' }, { x: hourly.left, y: hourly.headCy + 30, side: 'left' }, { label: 'roll up', delay: 1.2 }).svg;
    body += arrow({ x: hourly.right, y: hourly.headCy + 30, side: 'right' }, { x: daily.left, y: daily.headCy + 30, side: 'left' }, { label: 'roll up', delay: 1.4 }).svg;
    body += caption(VW / 2, 430, 'TTL expires raw points automatically; a rollup job downsamples raw → hourly → daily, each tier its own longer TTL.', { delay: 1.6 });
    return assemble({ slug: 'time-series-modeling', aria: 'TTL expiry and raw to hourly to daily rollups', body, note: snap.note });
  }

  /* ── recap: the full recipe ────────────────────────────────────────────── */
  BUCKETS.forEach((b, i) => {
    body += partition(BX[i], 150, {
      label: b.label, sub: b.sub, tone: i === 0 ? 'accent' : 'slate', w: 260, h: 215, delay: 0.3 + i * 0.12,
      items: b.items.slice(0, 2).map(it => ({ ...it, tone: i === 0 ? 'accent' : 'slate' })),
    }).svg;
  });
  body += chip(VW / 2, 110, 'bucket + ts DESC + TTL + rollups', { icon: 'clock', iconVar: '--accent', w: 340, delay: 1.0 });
  body += tag(BX[0] + 130, 130, 'ts DESC', { tone: 'accent', delay: 1.2 });
  body += caption(VW / 2, 400, 'Partition by entity+time, sort by time DESC, expire with TTL, downsample with rollups — bounded, append-fast, range-cheap.', { delay: 1.4 });
  body += caption(VW / 2, 440, 'For very high write rates, add a small shard suffix to the current bucket to avoid the hot "current time" partition.', { delay: 1.6 });
  return assemble({ slug: 'time-series-modeling', aria: 'The full time-series recipe: bucketed, ts-DESC, TTL, rollups', body, note: snap.note });
}
