/* ============================================================
   Conceptual visualizer: partition layout & query pruning.

   Models how physical file layout (partitioning + columnar files +
   statistics) lets an engine skip most of the data for a selective
   query — partition pruning, then file/row-group skipping via stats.
   Conceptual only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const DATES = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];
  const parts = (cls) => `<div class="viz-row">${DATES.map(d =>
    `<div class="viz-box ${typeof cls === 'function' ? cls(d) : cls}">dt=${d}<small>~250 MB</small></div>`).join('')}</div>`;

  TV.Viz.register({
    id: 'storage-pruning',
    title: 'Partition layout & query pruning',
    subtitle: 'Why physical layout decides query cost: how partitioning and column statistics let an engine read only the files it must.',
    vendor: 'multi',
    tags: ['storage', 'partitioning', 'partition pruning', 'parquet', 'predicate pushdown', 'small files', 'z-order', 'performance'],
    steps: [
      {
        title: 'A partitioned table',
        caption: 'The table is written partitioned by dt (date). On storage, each partition is a separate folder of columnar (Parquet) files. Partitioning is a physical layout choice — it is what makes pruning possible.',
        diagram: () => parts('is-done'),
      },
      {
        title: 'A selective query arrives',
        caption: 'Query: WHERE dt = \'2024-01-03\' AND amount > 1000. The optimizer looks at the predicate on the partition column first — before reading any data.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-active">SELECT ... WHERE dt='2024-01-03' AND amount>1000</div>
        </div>`,
      },
      {
        title: 'Partition pruning',
        caption: 'The engine lists partition folders and skips every one that cannot match the dt predicate. Three of four partitions are eliminated without opening a single data file — the single biggest lever on scan cost.',
        diagram: () => parts(d => d === '2024-01-03' ? 'is-active' : 'is-dim'),
      },
      {
        title: 'File & row-group skipping',
        caption: 'Within the surviving partition, Parquet footers and table statistics hold per-file min/max for amount. Files whose max(amount) ≤ 1000 are skipped; so are row groups inside a file. This is data skipping / predicate pushdown.',
        diagram: `<div class="viz-col">
          <div class="viz-lane-h">dt=2024-01-03 files (min/max amount)</div>
          <div class="viz-row">
            <div class="viz-box is-dim">f0<small>0–800 · skip</small></div>
            <div class="viz-box is-active">f1<small>600–5k · read</small></div>
            <div class="viz-box is-dim">f2<small>0–300 · skip</small></div>
          </div>
        </div>`,
      },
      {
        title: 'Only the needed bytes are read',
        caption: 'The engine reads one file, and only the amount + needed columns (columnar projection). A query that logically scans the whole table physically touches a tiny fraction of it.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-done">read: dt=2024-01-03/f1 · columns [dt, amount]</div>
          <span class="viz-tag viz-tag--narrow">≈1 file of 12 · a few columns</span>
        </div>`,
      },
      {
        title: 'When layout goes wrong',
        caption: 'Over-partitioning (e.g. by a high-cardinality id) creates millions of tiny files — the "small files problem" — and listing overhead dominates. Right-sized partitions, compaction (OPTIMIZE), and clustering (Z-order / liquid) keep pruning effective.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-hot">id=…×10⁶<small>tiny files</small></div><span class="viz-arrow">→</span><div class="viz-box is-done">dt + cluster<small>right-sized</small></div></div>
          <small style="color:var(--text-muted)">Partition on low-cardinality filters; cluster on the rest.</small>
        </div>`,
      },
    ],
  });
})();
