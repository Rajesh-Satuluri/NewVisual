/* Apache Hudi — UPSERT (animated write op, MoR) */
(function () {
  'use strict';
  const K = window.TableViz.HudiKit;
  K.writeOpModule({
    id: 'upsert', title: 'Upsert', group: 'write-ops',
    caption: 'ShopKart Apache Hudi — UPSERT (Merge-on-Read)',
    intro: 'Upsert is Hudi’s signature write. The index locates the file group for each record key, then updates land as a log file (MoR). Press Play.',
    fileGroup: 'fg-0001', tableType: 'MoR', instant: 't3', action: 'deltacommit', op: 'upsert',
    initial: [
      { label: 'base .parquet', sub: 'fg-0001 · 4 records' },
    ],
    newFiles: [
      { label: '.log.1 (avro)', sub: 'ord_4410 v2 · ord_8800 new', kind: 'log' },
    ],
    actions: [
      { t: '{ fileId: fg-0001,', c: '#2dd4bf' },
      { t: '  logBlock: [update ord_4410,', c: '#2dd4bf' },
      { t: '             insert ord_8800] }', c: '#2dd4bf' },
      { t: '{ operationType: UPSERT }', c: '#8b949e' },
      { t: '{ writeStats: 1 log file, 2 recs }', c: '#8b949e' },
    ],
    steps: [
      { label: 'Submit upsert', desc: 'A CDC batch arrives keyed by order_id — a mix of updates and inserts. Hudi de-duplicates within the batch using the precombine field (latest wins).', sql: true },
      { label: 'Index lookup', desc: 'The index maps each record key to its file group. ord_4410 already exists in fg-0001 (an update); ord_8800 is new (an insert tagged to fg-0001).' },
      { label: 'Append a log file', desc: 'Because this is a Merge-on-Read table, the changes are appended as a small Avro log file against the existing base file — the base parquet is not rewritten.', show: [0], log: [0] },
      { label: 'Write the deltacommit', desc: 'A new instant records the log block, the operation type (UPSERT), and write statistics.', show: [0], log: [0], commit: true },
      { label: 'Commit t3.deltacommit', desc: 'The timeline transitions the instant to completed — the upsert is now visible. Readers merge the base file with the log file until compaction runs.', show: [0], log: [0], commit: true, done: true },
    ],
    panelHTML: `
      <div class="hk-micro">Code</div>
      <div class="hk-sql">df.<span class="hk-fn">write</span>.<span class="hk-fn">format</span>(<span class="hk-str">"hudi"</span>)
  .<span class="hk-fn">option</span>(<span class="hk-str">"hoodie.datasource.write.operation"</span>, <span class="hk-str">"upsert"</span>)
  .<span class="hk-fn">option</span>(RECORDKEY, <span class="hk-str">"order_id"</span>)
  .<span class="hk-fn">option</span>(PRECOMBINE, <span class="hk-str">"updated_at"</span>)
  .<span class="hk-fn">mode</span>(<span class="hk-str">"append"</span>).<span class="hk-fn">save</span>(path)</div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">Log files</div><div class="hk-stat-v teal">+1</div><div class="hk-stat-s">base untouched</div></div>
        <div class="hk-stat"><div class="hk-stat-l">Base rewrites</div><div class="hk-stat-v">0</div><div class="hk-stat-s">MoR</div></div>
      </div>`,
  });
})();
