/* Apache Hudi — INSERT (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'insert', title: 'Insert', group: 'write-ops',
    caption: 'ShopKart Apache Hudi — INSERT',
    intro: 'Insert writes new records into new (or existing) file groups. Unlike upsert it does not require an index lookup for existing keys. Press Play.',
    fileGroup: 'fg-0002', tableType: 'MoR', instant: 't3', action: 'commit', op: 'insert',
    initial: [
      { label: 'base .parquet', sub: 'fg-0001 · existing' },
    ],
    newFiles: [
      { label: 'base .parquet', sub: 'fg-0002 · +842K recs' },
      { label: 'base .parquet', sub: 'fg-0003 · +610K recs' },
    ],
    actions: [
      { t: '{ add: fg-0002 base.parquet,', c: '#56d364' },
      { t: '  add: fg-0003 base.parquet }', c: '#56d364' },
      { t: '{ operationType: INSERT }', c: '#8b949e' },
      { t: '{ writeStats: 2 files, 1.45M }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit insert', desc: 'A batch of brand-new orders is written with operation "insert". These are known-new records, so no index probe for existing keys is needed.', sql: true },
      { label: 'Size the file groups', desc: 'Hudi sizes output to the target file size, creating new file groups (fg-0002, fg-0003) rather than appending to an unrelated group.' },
      { label: 'Write base files', desc: 'Two new base Parquet files are written for the new file groups. Existing file groups are untouched.', show: [0, 1] },
      { label: 'Record the commit', desc: 'A commit instant lists the new base files, the operation type, and write statistics.', show: [0, 1], commit: true },
      { label: 'Commit t3.commit', desc: 'The timeline transitions to completed and both new file groups become visible atomically — a reader sees all of them or none.', show: [0, 1], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">Insert vs Upsert</div>
      <div class="hk-sql"><span class="hk-com"># insert = no index lookup for updates</span>
operation = <span class="hk-str">"insert"</span>
<span class="hk-com"># faster when records are known-new</span></div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">File groups</div><div class="hk-stat-v green">+2</div><div class="hk-stat-s">1.45M rows</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Index probe</div><div class="hk-stat-v">skipped</div><div class="hk-stat-s">vs upsert</div></div>
      </div>`,
  });
})();
