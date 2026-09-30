/* Apache Hudi — DELETE (animated write op, MoR) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'delete', title: 'Delete', group: 'write-ops',
    caption: 'ShopKart Apache Hudi — DELETE (Merge-on-Read)',
    intro: 'Hudi deletes are keyed like upserts: the index finds the file group, and a delete block is appended (MoR) or the base rewritten (CoW). Press Play.',
    fileGroup: 'fg-0001', tableType: 'MoR', instant: 't4', action: 'deltacommit', op: 'delete',
    initial: [
      { label: 'base .parquet', sub: 'fg-0001 · 4 records' },
    ],
    newFiles: [
      { label: '.log.2 (avro)', sub: 'delete block: ord_3277', kind: 'log' },
    ],
    actions: [
      { t: '{ fileId: fg-0001,', c: '#2dd4bf' },
      { t: '  logBlock: DELETE [ord_3277] }', c: '#f85149' },
      { t: '{ operationType: DELETE }', c: '#8b949e' },
      { t: '{ writeStats: 1 log, 1 deleted }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit delete', desc: 'A GDPR erasure removes order ord_3277 by key. Hudi treats deletes as keyed writes, so it can target the exact file group.', sql: true },
      { label: 'Index lookup', desc: 'The index maps ord_3277 to file group fg-0001 — no full-table scan to find the record.' },
      { label: 'Append a delete block', desc: 'On this Merge-on-Read table, a delete block is appended to a new Avro log file. The base Parquet file is left untouched.', show: [0], log: [0] },
      { label: 'Write the deltacommit', desc: 'A new instant records the delete log block, operation type, and stats.', show: [0], log: [0], commit: true },
      { label: 'Commit t4.deltacommit', desc: 'The delete is visible: readers merge the base with the delete block and skip ord_3277. Compaction later materializes the removal into a new base slice.', show: [0], log: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">Code</div>
      <div class="hk-sql"><span class="hk-kw">DELETE FROM</span> orders
<span class="hk-kw">WHERE</span> order_id = <span class="hk-str">'ord_3277'</span>;
<span class="hk-com"># keyed delete → targets one file group</span></div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">Log files</div><div class="hk-stat-v teal">+1</div><div class="hk-stat-s">delete block</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Base rewrites</div><div class="hk-stat-v">0</div><div class="hk-stat-s">until compaction</div></div>
      </div>`,
  });
})();
