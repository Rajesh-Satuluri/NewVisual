/* Delta Lake — UPDATE (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'update', title: 'UPDATE', group: 'write-ops',
    caption: 'ShopKart Delta Lake — UPDATE (copy-on-write)',
    intro: 'UPDATE rewrites only the files that contain matching rows: remove the old file, add a rewritten one — in one atomic commit. Press Play.',
    table: 'orders', version: 48, op: 'UPDATE',
    initial: [
      { label: 'part-0007', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
      { label: 'part-0009', sub: 'country=IN' },
    ],
    newFiles: [
      { label: 'part-0049', sub: 'country=BR · rewritten' },
    ],
    actions: [
      { t: '{ remove: country=BR/part-0007.parquet,', c: '#f85149' },
      { t: '    dataChange:true }', c: '#f85149' },
      { t: '{ add: country=BR/part-0049.parquet,', c: '#56d364' },
      { t: '    stats:{numRecords:851200,…} }', c: '#56d364' },
      { t: '{ commitInfo: UPDATE, rowsUpdated=9200 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run UPDATE', desc: 'UPDATE orders SET total_amount = total_amount*1.1 WHERE country=\'BR\'. Delta uses file stats to find which files could contain BR rows.', sql: true },
      { label: 'Locate matching files', desc: 'Only part-0007 (country=BR) contains matching rows. The US and IN files are proven irrelevant by their partition/stats and are left completely untouched.', },
      { label: 'Rewrite the file (copy-on-write)', desc: 'Delta reads part-0007, applies the change, and writes a new file part-0049 with the updated rows. The default UPDATE path is copy-on-write.', show: [0] },
      { label: 'Tombstone the old file', desc: 'The old part-0007 is marked with a remove action (a tombstone). It still exists on disk for time travel until VACUUM, but is no longer part of the live table.', show: [0], remove: [0] },
      { label: 'Commit version 49', desc: 'One atomic commit contains the remove + add. Readers switch from the old file to the new file instantly. (For frequent point updates, enabling deletion vectors avoids full rewrites — see Deletion Vectors.)', show: [0], remove: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">UPDATE</span> orders
<span class="dk-kw">SET</span> total_amount = total_amount * 1.1
<span class="dk-kw">WHERE</span> country = <span class="dk-str">'BR'</span>;</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files rewritten</div><div class="dk-stat-v orange">1</div><div class="dk-stat-s">BR only</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Rows updated</div><div class="dk-stat-v green">9,200</div><div class="dk-stat-s">copy-on-write</div></div>
      </div>`,
  });
})();
