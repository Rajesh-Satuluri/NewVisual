/* Delta Lake — Deletion Vectors (merge-on-read lifecycle), animated */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'deletion-vectors', title: 'Deletion Vectors', group: 'advanced',
    caption: 'ShopKart Delta Lake — deletion vector lifecycle',
    intro: 'Deletion vectors mark deleted/updated rows in a bitmap so writes avoid rewriting whole files. Reads merge the bitmap; OPTIMIZE materializes it later. Press Play.',
    table: 'orders', version: 60, op: 'DELETE / merge-on-read',
    initial: [{ label: 'part-0002', sub: 'country=US · 1.2M rows' }],
    newFiles: [{ label: 'part-0071', sub: 'country=US · DV applied' }],
    priorCommits: ['…0059.json  WRITE', '…0060.json  MERGE'],
    actions: [
      { t: '{ add: part-0002.parquet,', c: '#56d364' },
      { t: '    deletionVector:{cardinality:1830} }', c: '#ffb020' },
      { t: '{ commitInfo: DELETE,', c: '#8b949e' },
      { t: '    numDeletedRows:1830,', c: '#8b949e' },
      { t: '    numRemovedFiles:0 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Delete marks rows', desc: 'A DELETE of 1,830 fraud rows in part-0002 writes a deletion-vector bitmap marking those row positions — the 1.2M-row data file is not rewritten.', sql: true, dv: [0] },
      { label: 'Reads merge the DV', desc: 'Any query over part-0002 loads its deletion vector and skips the marked rows on the fly. This is merge-on-read: cheap writes, a small read-time cost.', dv: [0] },
      { label: 'DVs accumulate', desc: 'As more deletes/updates hit the file, its deletion vector grows and read overhead rises. Delta tracks the deleted-row ratio per file.', dv: [0] },
      { label: 'OPTIMIZE materializes', desc: 'A later OPTIMIZE physically rewrites part-0002 into a clean part-0071 with the deleted rows gone, and drops the deletion vector — restoring full read speed.', dv: [0], show: [0], remove: [0] },
      { label: 'Committed', desc: 'The materialization is a normal commit (remove the DV-tagged file, add the clean file). Writes stayed fast when it mattered; cleanup happened in the background.', show: [0], remove: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">Enable</div>
      <div class="dk-sql"><span class="dk-kw">ALTER TABLE</span> orders <span class="dk-kw">SET TBLPROPERTIES</span>
  (<span class="dk-str">'delta.enableDeletionVectors'</span> = <span class="dk-str">'true'</span>);</div>
      <div class="dk-micro">Trade-off</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Write cost</div><div class="dk-stat-v green">low</div><div class="dk-stat-s">no rewrite</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Read cost</div><div class="dk-stat-v orange">small</div><div class="dk-stat-s">merge bitmap</div></div>
      </div>`,
  });
})();
