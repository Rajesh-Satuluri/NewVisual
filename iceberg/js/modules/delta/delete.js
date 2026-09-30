/* Delta Lake — DELETE (animated write op) */
(function () {
  'use strict';
  const K = window.TableViz.DeltaKit;
  K.writeOpModule({
    id: 'delete', title: 'DELETE', group: 'write-ops',
    caption: 'ShopKart Delta Lake — DELETE (merge-on-read via deletion vectors)',
    intro: 'With deletion vectors enabled, DELETE marks rows in a bitmap instead of rewriting whole files — a fast, merge-on-read delete. Press Play.',
    table: 'orders', version: 49, op: 'DELETE',
    initial: [
      { label: 'part-0049', sub: 'country=BR' },
      { label: 'part-0002', sub: 'country=US' },
      { label: 'part-0009', sub: 'country=IN' },
    ],
    newFiles: [],
    actions: [
      { t: '{ add: country=US/part-0002.parquet,', c: '#56d364' },
      { t: '    deletionVector:{storageType:"u",', c: '#ffb020' },
      { t: '      cardinality:1830}, dataChange:true }', c: '#ffb020' },
      { t: '{ commitInfo: DELETE, deletedRows=1830,', c: '#8b949e' },
      { t: '    numRemovedFiles=0 }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Run DELETE', desc: 'DELETE FROM orders WHERE status=\'fraud\' AND country=\'US\'. Delta uses file stats to find files that may contain matching rows.', sql: true },
      { label: 'Locate matching rows', desc: 'Only part-0002 (US) holds matching rows. BR and IN files are proven irrelevant by stats and left untouched. Rewriting the whole US file for 1,830 rows would be wasteful.', },
      { label: 'Write a deletion vector', desc: 'With deletion vectors enabled, Delta writes a bitmap marking the 1,830 deleted row positions in part-0002 instead of rewriting the file — a merge-on-read delete.', dv: [1] },
      { label: 'Record the commit', desc: 'The commit re-adds part-0002 with a deletionVector reference and dataChange:true. numRemovedFiles is 0 — no data file was rewritten.', dv: [1], commit: true },
      { label: 'Commit version 50', desc: 'The commit lands atomically. Readers now apply the deletion vector to skip deleted rows at read time; a later OPTIMIZE materializes the deletes by rewriting the file.', dv: [1], commit: true, done: true },
    ],
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">DELETE FROM</span> orders
<span class="dk-kw">WHERE</span> status = <span class="dk-str">'fraud'</span>
  <span class="dk-kw">AND</span> country = <span class="dk-str">'US'</span>;</div>
      <div class="dk-micro">This commit</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Rows deleted</div><div class="dk-stat-v red">1,830</div><div class="dk-stat-s">via bitmap</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Files rewritten</div><div class="dk-stat-v green">0</div><div class="dk-stat-s">merge-on-read</div></div>
      </div>`,
  });
})();
