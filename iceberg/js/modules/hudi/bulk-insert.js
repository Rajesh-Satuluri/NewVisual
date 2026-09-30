/* Apache Hudi — BULK INSERT (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'bulk-insert', title: 'Bulk Insert', group: 'write-ops',
    caption: 'ShopKart Apache Hudi — BULK INSERT (initial load)',
    intro: 'Bulk insert is the fast path for loading large datasets: no index bookkeeping, tuned sort/partitioning, right-sized files. Press Play.',
    fileGroup: 'fg-new', tableType: 'CoW', instant: 't1', action: 'commit', op: 'bulk_insert',
    initial: [],
    newFiles: [
      { label: 'base .parquet', sub: 'fg-1001 · 128MB' },
      { label: 'base .parquet', sub: 'fg-1002 · 128MB' },
      { label: 'base .parquet', sub: 'fg-1003 · 128MB' },
      { label: 'base .parquet', sub: 'fg-1004 · 128MB' },
    ],
    priorInstants: ['(empty table — first load)'],
    initialVerText: 'head: —',
    actions: [
      { t: '{ add: fg-1001 … fg-1004,', c: '#56d364' },
      { t: '  each ~128MB base file }', c: '#56d364' },
      { t: '{ operationType: BULK_INSERT }', c: '#8b949e' },
      { t: '{ writeStats: 4 files, 40M recs }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit bulk insert', desc: 'A large historical backfill (40M orders) is loaded. Bulk insert skips the per-record index tagging that upsert/insert do — the fastest way to seed a table.', sql: true },
      { label: 'Sort & partition', desc: 'A configurable sort mode lays records out (e.g. by partition + key) so the resulting files are well-clustered and right-sized.' },
      { label: 'Write right-sized files', desc: 'Records stream directly into target-sized base files across new file groups — no small-file explosion.', show: [0, 1, 2, 3] },
      { label: 'Record the commit', desc: 'One commit instant lists all new base files with their write statistics.', show: [0, 1, 2, 3], commit: true },
      { label: 'Commit t1.commit', desc: 'The initial load lands atomically. From here, incremental upserts maintain the table.', show: [0, 1, 2, 3], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">When to use</div>
      <div class="hk-sql"><span class="hk-com"># initial loads / backfills</span>
operation = <span class="hk-str">"bulk_insert"</span>
sort_mode  = <span class="hk-str">"PARTITION_SORT"</span></div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">Base files</div><div class="hk-stat-v green">+4</div><div class="hk-stat-s">~128MB each</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Index cost</div><div class="hk-stat-v">none</div><div class="hk-stat-s">fastest load</div></div>
      </div>`,
  });
})();
