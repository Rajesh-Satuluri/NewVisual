/* Delta Lake — Schema Evolution (metadata-only), animated */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'schema-evolution', title: 'Schema Evolution', group: 'log',
    caption: 'ShopKart Delta Lake — ALTER TABLE ADD COLUMN (metadata only)',
    intro: 'Adding a column is a metadata-only commit — a new metaData action. No data files are rewritten; existing files are read back with the new column as null. Press Play.',
    table: 'orders', version: 52, op: 'ADD COLUMNS',
    initial: [
      { label: 'part-0051', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
      { label: 'part-0009', sub: 'country=IN' },
    ],
    newFiles: [],
    priorCommits: ['…0051.json  WRITE', '…0052.json  MERGE'],
    actions: [
      { t: '{ metaData: schemaString +=', c: '#c9b6f7' },
      { t: '    "fulfilment_status STRING",', c: '#c9b6f7' },
      { t: '  configuration:{columnMapping:"name"} }', c: '#c9b6f7' },
      { t: '{ commitInfo: "ADD COLUMNS",', c: '#8b949e' },
      { t: '    operationParameters:{columns:[…]} }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run ALTER TABLE', desc: 'ALTER TABLE orders ADD COLUMNS (fulfilment_status STRING). At ShopKart this exact change once took an 11-hour file rewrite on plain Parquet.', sql: true },
      { label: 'No data rewrite', desc: 'Delta does not touch a single data file. The existing part-0051/0002/0009 files stay byte-for-byte identical — the change is purely to the table’s metadata.' },
      { label: 'Write a metaData action', desc: 'The new commit carries one metaData action with the updated schema string. Column mapping (name mode) lets old files omit the column entirely.', commit: true },
      { label: 'Append the commit', desc: 'The metaData + commitInfo are written to 000…53.json atomically. Total work is a few kilobytes, not terabytes.', commit: true },
      { label: 'New column is live', desc: 'Version 53 is live in milliseconds. Reads of old files return NULL for fulfilment_status; new writes populate it. Safe add / rename / reorder — no outage.', commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">ALTER TABLE</span> orders
<span class="dk-kw">ADD COLUMNS</span> (fulfilment_status <span class="dk-kw">STRING</span>);</div>
      <div class="dk-micro">Cost</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files rewritten</div><div class="dk-stat-v green">0</div><div class="dk-stat-s">metadata only</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Duration</div><div class="dk-stat-v green">ms</div><div class="dk-stat-s">vs 11 hours</div></div>
      </div>`,
  });
})();
