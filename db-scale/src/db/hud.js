/* hud.js — the metrics HUD (Designed-to-Scale's "numbers move" device) and the
   particle legend, in database vocabulary. */

import { h } from '../engine/h.js';

/* metric display config: key -> { label, fmt, good: 'low'|'high'|null } */
export const METRICS = {
  memtable:  { label: 'MemTable keys', fmt: v => v },
  sstables:  { label: 'SSTables', fmt: v => v },
  levels:    { label: 'Levels w/ data', fmt: v => v },
  liveKeys:  { label: 'Live keys', fmt: v => v },
  writeAmp:  { label: 'Write amp', fmt: v => v.toFixed(2) + '×', good: 'low' },
  readAmp:   { label: 'Read amp', fmt: v => v + ' tbl', good: 'low' },
  spaceAmp:  { label: 'Space amp', fmt: v => v.toFixed(2) + '×', good: 'low' },
  flushes:   { label: 'Flushes', fmt: v => v },
  compactions: { label: 'Compactions', fmt: v => v },
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
      h('div.hud__val', { text: cfg.fmt(val) }),
      h('div.hud__label', { text: cfg.label }),
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
