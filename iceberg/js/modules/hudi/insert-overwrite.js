/* Apache Hudi — INSERT OVERWRITE (animated write op, replacecommit) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'insert-overwrite', title: 'Insert Overwrite', group: 'write-ops',
    caption: 'ShopKart Apache Hudi — INSERT OVERWRITE (replacecommit)',
    intro: 'Insert overwrite replaces the data in the targeted partitions: old file groups are logically replaced, new ones added — recorded as a replacecommit. Press Play.',
    fileGroup: 'country=BR', tableType: 'CoW', instant: 't5', action: 'replacecommit', op: 'insert_overwrite',
    initial: [
      { label: 'base .parquet', sub: 'fg-BR-01 (old)' },
      { label: 'base .parquet', sub: 'fg-BR-02 (old)' },
    ],
    newFiles: [
      { label: 'base .parquet', sub: 'fg-BR-09 (new)' },
    ],
    actions: [
      { t: '{ replacedFileGroups:', c: '#f85149' },
      { t: '    [fg-BR-01, fg-BR-02],', c: '#f85149' },
      { t: '  add: fg-BR-09 base.parquet }', c: '#56d364' },
      { t: '{ operationType: INSERT_OVERWRITE }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit insert overwrite', desc: 'ShopKart rebuilds the BR partition from a corrected source. Insert overwrite replaces the partition’s data rather than merging into it.', sql: true },
      { label: 'Write the replacement', desc: 'A new base file (fg-BR-09) is written with the corrected records for the BR partition.', show: [0] },
      { label: 'Mark old file groups replaced', desc: 'The old BR file groups are flagged as replaced — not physically deleted, so time travel to before this instant still works.', show: [0], remove: [0, 1] },
      { label: 'Write the replacecommit', desc: 'A replacecommit instant records both the replaced file groups and the newly added ones — atomic partition-level replacement.', show: [0], remove: [0, 1], commit: true },
      { label: 'Commit t5.replacecommit', desc: 'The timeline transitions to completed. Readers now see only the new BR data; cleaning removes the replaced files later per retention.', show: [0], remove: [0, 1], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">Code</div>
      <div class="hk-sql"><span class="hk-kw">INSERT OVERWRITE</span> orders
<span class="hk-kw">PARTITION</span> (country = <span class="hk-str">'BR'</span>)
<span class="hk-kw">SELECT</span> * <span class="hk-kw">FROM</span> corrected_br;</div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">Replaced</div><div class="hk-stat-v red">2 fg</div><div class="hk-stat-s">logical</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Added</div><div class="hk-stat-v green">+1 fg</div><div class="hk-stat-s">BR only</div></div>
      </div>`,
  });
})();
