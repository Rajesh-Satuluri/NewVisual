/* Delta Lake — replaceWhere (predicate overwrite, animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'overwrite', title: 'replaceWhere', group: 'write-ops',
    caption: 'ShopKart Delta Lake — replaceWhere (predicate overwrite)',
    intro: 'replaceWhere atomically overwrites only the rows matching a predicate — replacing the BR partition while US and IN stay untouched. Press Play.',
    table: 'orders', version: 51, op: 'WRITE (replaceWhere)',
    initial: [
      { label: 'part-0051', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
      { label: 'part-0009', sub: 'country=IN' },
    ],
    newFiles: [
      { label: 'part-0053', sub: 'country=BR · reloaded' },
    ],
    actions: [
      { t: '{ remove: country=BR/part-0051.parquet }', c: '#f85149' },
      { t: '{ add: country=BR/part-0053.parquet,', c: '#56d364' },
      { t: '    stats:{numRecords:903400,…} }', c: '#56d364' },
      { t: '{ commitInfo: WRITE,', c: '#8b949e' },
      { t: '    predicate:"country=\'BR\'" }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run replaceWhere', desc: 'A corrected BR extract is reloaded with replaceWhere("country = \'BR\'"). Delta validates that the new data only touches the BR predicate.', sql: true },
      { label: 'Match the predicate', desc: 'Only files satisfying country=\'BR\' are in scope — part-0051. The US and IN files are outside the predicate and will be left completely untouched.', },
      { label: 'Remove matched files', desc: 'The existing BR file part-0051 is tombstoned with a remove action. A full overwrite would remove everything — replaceWhere scopes it to just BR.', remove: [0] },
      { label: 'Write replacement data', desc: 'The corrected BR rows are written as a new file part-0053 (an add). US and IN partitions never move.', show: [0], remove: [0] },
      { label: 'Commit version 52', desc: 'One atomic commit swaps BR’s data — remove + add — while the rest of the table is byte-for-byte identical. A safe, surgical partition reload.', show: [0], remove: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">Code</div>
      <div class="dk-sql">df.<span class="dk-fn">write</span>.<span class="dk-fn">format</span>(<span class="dk-str">"delta"</span>)
  .<span class="dk-fn">mode</span>(<span class="dk-str">"overwrite"</span>)
  .<span class="dk-fn">option</span>(<span class="dk-str">"replaceWhere"</span>, <span class="dk-str">"country = 'BR'"</span>)
  .<span class="dk-fn">saveAsTable</span>(<span class="dk-str">"orders"</span>)</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Partition</div><div class="dk-stat-v orange">BR only</div><div class="dk-stat-s">scoped</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Untouched</div><div class="dk-stat-v green">US · IN</div><div class="dk-stat-s">no rewrite</div></div>
      </div>`,
  });
})();
