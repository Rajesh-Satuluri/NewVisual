/* Delta Lake — MERGE INTO (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'merge', title: 'MERGE INTO', group: 'write-ops',
    caption: 'ShopKart Delta Lake — MERGE INTO (upsert)',
    intro: 'MERGE upserts: matched rows update existing files, unmatched rows insert new files — all resolved into one atomic commit. Press Play.',
    table: 'orders', version: 50, op: 'MERGE',
    initial: [
      { label: 'part-0049', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
    ],
    newFiles: [
      { label: 'part-0051', sub: 'country=BR · updated' },
      { label: 'part-0052', sub: 'country=CA · inserted' },
    ],
    actions: [
      { t: '{ remove: country=BR/part-0049.parquet }', c: '#f85149' },
      { t: '{ add: country=BR/part-0051.parquet }', c: '#56d364' },
      { t: '{ add: country=CA/part-0052.parquet }', c: '#56d364' },
      { t: '{ commitInfo: MERGE, updated=9200,', c: '#8b949e' },
      { t: '    inserted=4100 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run MERGE', desc: 'A CDC batch is merged on order_id: WHEN MATCHED THEN UPDATE, WHEN NOT MATCHED THEN INSERT. Delta joins the source against target files located via stats.', sql: true },
      { label: 'Matched → rewrite target file', desc: 'Updated BR orders live in part-0049. Delta rewrites it as part-0051 with the new values (copy-on-write for the matched rows).', show: [0] },
      { label: 'Tombstone the old target', desc: 'The old part-0049 gets a remove action — replaced by the rewritten part-0051.', show: [0], remove: [0] },
      { label: 'Not matched → insert new file', desc: 'New CA orders have no target match, so they’re written as a brand-new file part-0052 (an add). One MERGE produces both updates and inserts.', show: [0, 1], remove: [0] },
      { label: 'Commit version 51', desc: 'A single atomic commit carries the remove + two adds. The upsert is all-or-nothing — the workhorse pattern for streaming CDC into a lakehouse.', show: [0, 1], remove: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">MERGE INTO</span> orders t
<span class="dk-kw">USING</span> updates s <span class="dk-kw">ON</span> t.order_id = s.order_id
<span class="dk-kw">WHEN MATCHED THEN UPDATE SET</span> *
<span class="dk-kw">WHEN NOT MATCHED THEN INSERT</span> *;</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Updated</div><div class="dk-stat-v orange">9,200</div><div class="dk-stat-s">matched</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Inserted</div><div class="dk-stat-v green">4,100</div><div class="dk-stat-s">not matched</div></div>
      </div>`,
  });
})();
