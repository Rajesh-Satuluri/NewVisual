/* Apache Hudi — Compaction (animated table service, MoR) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'compaction', title: 'Compaction', group: 'services',
    caption: 'ShopKart Apache Hudi — COMPACTION (MoR log → base)',
    intro: 'Compaction is the MoR table service that merges Avro log files into a fresh base Parquet file, producing a new file slice so reads stay fast. Press Play.',
    fileGroup: 'fg-0001', tableType: 'MoR', instant: 't5', action: 'compaction', op: 'compact',
    initial: [
      { label: 'base .parquet', sub: 'fg-0001 (old slice)' },
      { label: '.log.1 (avro)', sub: 'updates', kind: 'log' },
      { label: '.log.2 (avro)', sub: 'updates + deletes', kind: 'log' },
    ],
    newFiles: [
      { label: 'base .parquet', sub: 'fg-0001 (new slice)' },
    ],
    actions: [
      { t: '{ compact fileId fg-0001:', c: '#34d399' },
      { t: '   base + log.1 + log.2 → new base }', c: '#34d399' },
      { t: '{ operationType: COMPACT }', c: '#8b949e' },
      { t: '{ new file slice at t5 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Schedule compaction', desc: 'A compaction plan is scheduled (inline or async) for file groups whose log files have grown past a threshold — here fg-0001 has two log files.', sql: true },
      { label: 'Read base + logs', desc: 'The compactor reads the current base Parquet file and replays its log files (updates and deletes) in order to compute the merged records.' },
      { label: 'Write a new base file', desc: 'The merged records are written as a brand-new base Parquet file — a fresh file slice for the same file group.', show: [0] },
      { label: 'Supersede the old slice', desc: 'The old base + log files are superseded by the new base file (kept on disk until cleaning removes them, so time travel still works).', show: [0], remove: [0, 1, 2] },
      { label: 'Commit t5.compaction', desc: 'The timeline records the compaction instant. Reads now hit a single clean base file — no log merge — so read-optimized and snapshot queries converge.', show: [0], remove: [0, 1, 2], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">Why compact</div>
      <div class="hk-sql"><span class="hk-com"># too many logs → slow snapshot reads</span>
hoodie.compact.inline = <span class="hk-str">true</span>
hoodie.compact.inline.max.delta.commits = <span class="hk-str">5</span></div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">Logs merged</div><div class="hk-stat-v green">2 → 0</div><div class="hk-stat-s">into base</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Read cost</div><div class="hk-stat-v teal">merge → scan</div><div class="hk-stat-s">faster</div></div>
      </div>`,
  });
})();
