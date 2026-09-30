/* Delta Lake — OPTIMIZE & Z-ORDER (compaction), animated */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'optimize', title: 'OPTIMIZE & Z-Order', group: 'advanced',
    caption: 'ShopKart Delta Lake — OPTIMIZE (bin-packing) + ZORDER',
    intro: 'OPTIMIZE bin-packs many small files into few right-sized ones and can ZORDER BY to co-locate related data for stronger skipping. Press Play.',
    table: 'orders', version: 61, op: 'OPTIMIZE',
    initial: [
      { label: 'part-a', sub: '8 MB' }, { label: 'part-b', sub: '11 MB' },
      { label: 'part-c', sub: '6 MB' }, { label: 'part-d', sub: '9 MB' },
      { label: 'part-e', sub: '7 MB' }, { label: 'part-f', sub: '10 MB' },
    ],
    newFiles: [
      { label: 'part-0080', sub: '256 MB · z-ordered' },
      { label: 'part-0081', sub: '256 MB · z-ordered' },
    ],
    priorCommits: ['…0079.json  WRITE'],
    actions: [
      { t: '{ remove: part-a … part-f (6 files) }', c: '#f85149' },
      { t: '{ add: part-0080.parquet (256MB),', c: '#56d364' },
      { t: '    stats:{zOrderBy:["country","order_date"]} }', c: '#56d364' },
      { t: '{ add: part-0081.parquet (256MB) }', c: '#56d364' },
      { t: '{ commitInfo: OPTIMIZE,', c: '#8b949e' },
      { t: '    numRemovedFiles:6, numAddedFiles:2 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run OPTIMIZE', desc: 'Streaming appends left many tiny files. OPTIMIZE orders ZORDER BY (country, order_date) rewrites them into a few right-sized files.', sql: true },
      { label: 'Identify small files', desc: 'Delta selects files below the target size (≈256 MB) — here six small files totalling ~51 MB that make queries spend their time opening files.' },
      { label: 'Bin-pack + Z-order', desc: 'The rows are re-sorted along a space-filling (Z) curve on country and order_date so related rows land together, then written into two 256 MB files.', show: [0, 1] },
      { label: 'Tombstone the smalls', desc: 'All six original small files get remove actions. Data is unchanged — only the physical layout improves (dataChange:false).', show: [0, 1], remove: [0, 1, 2, 3, 4, 5] },
      { label: 'Commit version 62', desc: 'One commit swaps 6 files for 2. Fewer files + Z-order clustering mean tighter min/max stats and far more aggressive data skipping — ShopKart’s dashboards ran 6× faster.', show: [0, 1], remove: [0, 1, 2, 3, 4, 5], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">OPTIMIZE</span> orders
  <span class="dk-kw">WHERE</span> order_date &gt;= <span class="dk-str">'2024-01-01'</span>
  <span class="dk-kw">ZORDER BY</span> (country, order_date);</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files before</div><div class="dk-stat-v red">6</div><div class="dk-stat-s">tiny</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Files after</div><div class="dk-stat-v green">2</div><div class="dk-stat-s">right-sized</div></div>
      </div>`,
  });
})();
