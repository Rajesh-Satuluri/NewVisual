/* Delta Lake — CREATE TABLE (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'create-table', title: 'CREATE TABLE', group: 'write-ops',
    caption: 'ShopKart Delta Lake — CREATE TABLE',
    intro: 'Creating a Delta table writes version 0 of the log — protocol + metaData — with no data files yet. Press Play.',
    table: 'orders', version: -1, initialVerText: '(new)', doneVerText: 'v0',
    op: 'CREATE TABLE', initial: [], newFiles: [],
    priorCommits: ['(empty — table does not exist yet)'],
    actions: [
      { t: '{ protocol: minReader 3, minWriter 7 }', c: '#8b949e' },
      { t: '{ metaData: schema(order_id, country,', c: '#c9b6f7' },
      { t: '    order_date, total_amount, …),', c: '#c9b6f7' },
      { t: '  partitionColumns: ["country"] }', c: '#c9b6f7' },
      { t: '{ commitInfo: "CREATE TABLE" }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run CREATE TABLE', desc: 'Spark parses the DDL. No files are written — a Delta table begins life as a single commit describing its protocol and schema.', sql: true },
      { label: 'Write the protocol action', desc: 'The protocol action declares the minimum reader/writer feature versions (here 3/7) needed to read and write the table — this is how table features like deletion vectors are negotiated.', sql: true, commit: true },
      { label: 'Write the metaData action', desc: 'The metaData action records the full schema (columns + types) and the partition columns ([country]). This is what makes the table strongly typed and partition-aware.', sql: true, commit: true },
      { label: 'Append 0000…0.json', desc: 'The two actions plus a commitInfo are written into the first log file, 00000000000000000000.json, created atomically in _delta_log.', commit: true },
      { label: 'Table exists at version 0', desc: 'The commit lands. The table now exists at version 0 — empty, fully typed, transactional, and ready for writes. No data files yet, just the log.', commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">CREATE TABLE</span> orders (
  order_id <span class="dk-kw">BIGINT</span>, country <span class="dk-kw">STRING</span>,
  order_date <span class="dk-kw">DATE</span>, total_amount <span class="dk-kw">DECIMAL</span>
) <span class="dk-kw">USING</span> DELTA
<span class="dk-kw">PARTITIONED BY</span> (country);</div>
      <div class="dk-micro">Result</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Version</div><div class="dk-stat-v green">0</div><div class="dk-stat-s">first commit</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Data files</div><div class="dk-stat-v">0</div><div class="dk-stat-s">log only</div></div>
      </div>`,
  });
})();
