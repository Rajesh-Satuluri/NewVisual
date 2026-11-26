/* hud.js — the metrics HUD (Designed-to-Scale's "numbers move" device) and the
   particle legend, in database vocabulary. */

import { h } from '../engine/h.js';
import { icon } from '../engine/icons.js';

/* metric display config: key -> { label, fmt, good: 'low'|'high'|null, ic } */
export const METRICS = {
  memtable:  { label: 'MemTable keys', fmt: v => v, ic: 'listOrdered' },
  sstables:  { label: 'SSTables', fmt: v => v, ic: 'file' },
  levels:    { label: 'Levels w/ data', fmt: v => v, ic: 'layers' },
  liveKeys:  { label: 'Live keys', fmt: v => v, ic: 'key' },
  writeAmp:  { label: 'Write amp', fmt: v => v.toFixed(2) + '×', good: 'low', ic: 'scale' },
  readAmp:   { label: 'Read amp', fmt: v => v + ' tbl', good: 'low', ic: 'search' },
  spaceAmp:  { label: 'Space amp', fmt: v => v.toFixed(2) + '×', good: 'low', ic: 'database' },
  flushes:   { label: 'Flushes', fmt: v => v, ic: 'flush' },
  compactions: { label: 'Compactions', fmt: v => v, ic: 'merge' },
  // ── DBMS foundations ──
  clients:   { label: 'Clients', fmt: v => v, ic: 'server' },
  tables:    { label: 'Tables', fmt: v => v, ic: 'grid' },
  rows:      { label: 'Rows', fmt: v => v.toLocaleString(), ic: 'listOrdered' },
  queries:   { label: 'Queries/s', fmt: v => v, ic: 'search' },
  latency:    { label: 'p99 latency', fmt: v => v + ' ms', good: 'low', ic: 'clock' },
  integrity:  { label: 'Integrity', fmt: v => v + '%', good: 'high', ic: 'check' },
  relations:  { label: 'Relations', fmt: v => v, ic: 'layers' },
  columns:    { label: 'Columns', fmt: v => v, ic: 'grid' },
  constraints:{ label: 'Constraints', fmt: v => v, ic: 'key' },
  ops:        { label: 'Operators', fmt: v => v, ic: 'merge' },
  tiers:      { label: 'Tiers', fmt: v => v, ic: 'layers' },
  // ── query engine ──
  tokens:     { label: 'Tokens', fmt: v => v, ic: 'listOrdered' },
  nodes:      { label: 'Plan nodes', fmt: v => v, ic: 'layers' },
  cost:       { label: 'Est. cost', fmt: v => v.toLocaleString(), good: 'low', ic: 'gauge' },
  plans:      { label: 'Plans tried', fmt: v => v, ic: 'target' },
  pages:      { label: 'Pages read', fmt: v => v.toLocaleString(), good: 'low', ic: 'file' },
  workers:    { label: 'Workers', fmt: v => v, ic: 'server' },
  groups:     { label: 'Groups', fmt: v => v, ic: 'layers' },
  memory:     { label: 'Memory', fmt: v => v + ' MB', good: 'low', ic: 'database' },
  // ── storage engine ──
  pageSize:   { label: 'Page size', fmt: v => v + ' KB', ic: 'file' },
  slots:      { label: 'Slots used', fmt: v => v, ic: 'grid' },
  fillFactor: { label: 'Fill factor', fmt: v => v + '%', good: 'high', ic: 'gauge' },
  hitRate:    { label: 'Cache hit rate', fmt: v => v + '%', good: 'high', ic: 'check' },
  evictions:  { label: 'Evictions', fmt: v => v, good: 'low', ic: 'trash' },
  ioOps:      { label: 'Disk I/O ops', fmt: v => v.toLocaleString(), good: 'low', ic: 'database' },
  seeks:      { label: 'Seeks', fmt: v => v.toLocaleString(), good: 'low', ic: 'search' },
  throughput: { label: 'Throughput', fmt: v => v + ' MB/s', good: 'high', ic: 'bolt' },
  height:     { label: 'Tree height', fmt: v => v, good: 'low', ic: 'layers' },
  fanout:     { label: 'Fan-out', fmt: v => v, good: 'high', ic: 'merge' },
};

export function renderHud(metrics, show, prev) {
  const keys = show || Object.keys(metrics);
  return h('div.hud', keys.map(k => {
    const cfg = METRICS[k]; if (!cfg) return null;
    const val = metrics[k];
    const was = prev ? prev[k] : undefined;
    let dir = '';
    if (was != null && typeof val === 'number' && val !== was) {
      const better = cfg.good === 'low' ? val < was : cfg.good === 'high' ? val > was : null;
      dir = better == null ? 'is-changed' : better ? 'is-good' : 'is-bad';
    }
    return h('div.hud__tile.' + (dir || 'is-flat'), [
      h('div.hud__label', [h('span.hud__ic', { html: icon(cfg.ic || 'gauge') }), h('span', { text: cfg.label })]),
      h('div.hud__val', { text: cfg.fmt(val) }),
    ]);
  }).filter(Boolean));
}

const LEGEND = {
  write:   ['Write', 'PUT/DELETE → WAL + MemTable'],
  flush:   ['Flush', 'MemTable → SSTable (L0)'],
  compact: ['Compaction', 'merge SSTables downward'],
  read:    ['Read', 'probe MemTable → L0 → Ln'],
};
export function renderLegend(kinds) {
  return h('div.legend', (kinds || Object.keys(LEGEND)).map(k => {
    const [name, desc] = LEGEND[k] || [k, ''];
    return h('div.legend__item', { title: desc }, [
      h('span.legend__swatch.flow--' + k), h('span.legend__name', { text: name }),
    ]);
  }));
}
