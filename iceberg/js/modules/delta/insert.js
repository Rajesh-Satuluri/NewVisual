/* Delta Lake — INSERT / APPEND (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'insert', title: 'INSERT / APPEND', group: 'write-ops',
    caption: 'ShopKart Delta Lake — INSERT (append)',
    intro: 'An append writes new Parquet files and records them as add actions in a new commit. Existing files are untouched. Press Play.',
    table: 'orders', version: 47, op: 'WRITE (append)',
    initial: [
      { label: 'part-0001', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
    ],
    newFiles: [
      { label: 'part-0048a', sub: 'country=BR · +842K rows' },
      { label: 'part-0048b', sub: 'country=IN · +610K rows' },
    ],
    actions: [
      { t: '{ add: country=BR/part-0048a.parquet,', c: '#56d364' },
      { t: '    stats:{numRecords:842000, min/max…} }', c: '#56d364' },
      { t: '{ add: country=IN/part-0048b.parquet,', c: '#56d364' },
      { t: '    stats:{numRecords:610000} }', c: '#56d364' },
      { t: '{ commitInfo: WRITE, mode=Append }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit append', desc: 'A batch of new orders is written with mode("append"). Delta first writes the data as brand-new immutable Parquet files.', sql: true },
      { label: 'Write new data files', desc: 'Two new Parquet files are written (BR and IN partitions). Nothing existing is modified — Delta never edits a file in place.', show: [0, 1] },
      { label: 'Compute per-file stats', desc: 'As each file is written, Delta records min/max/nullCount for its columns and the row count. These statistics are what later let queries skip files without reading them.', show: [0, 1] },
      { label: 'Record add actions', desc: 'The new commit lists one add action per file, each carrying the path, size, partition values, and the column stats just computed.', show: [0, 1], commit: true },
      { label: 'Commit version 48', desc: 'Creating 0000…48.json atomically makes both new files visible at once. A concurrent reader sees either v47 or v48 — never a half-written batch.', show: [0, 1], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">Code</div>
      <div class="dk-sql">df.<span class="dk-fn">write</span>.<span class="dk-fn">format</span>(<span class="dk-str">"delta"</span>)
  .<span class="dk-fn">mode</span>(<span class="dk-str">"append"</span>)
  .<span class="dk-fn">saveAsTable</span>(<span class="dk-str">"orders"</span>)</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files added</div><div class="dk-stat-v green">+2</div><div class="dk-stat-s">1.45M rows</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Files removed</div><div class="dk-stat-v">0</div><div class="dk-stat-s">append only</div></div>
      </div>`,
  });
})();
