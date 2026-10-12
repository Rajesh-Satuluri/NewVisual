/* ============================================================
   Conceptual visualizer: row vs columnar storage.

   Models why analytical engines store data by column: how a columnar
   layout (Parquet/ORC) reads fewer bytes for an aggregate query,
   compresses better, and enables vectorized execution. Conceptual
   only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const cell = (v, cls) => `<div class="viz-box ${cls || ''}" style="min-width:40px;padding:6px 7px">${v}</div>`;

  TV.Viz.register({
    id: 'row-vs-columnar',
    title: 'Row vs columnar storage',
    subtitle: 'Why analytical systems store data by column — the layout decision behind Parquet, ORC, and every columnar warehouse.',
    vendor: 'multi',
    tags: ['parquet', 'orc', 'columnar', 'row store', 'oltp', 'olap', 'compression', 'vectorized', 'warehouse'],
    steps: [
      {
        title: 'The logical table',
        caption: 'Consider a wide events table. A query asks: SELECT AVG(amount) FROM events. Logically it needs one column — but physical layout decides how much data the engine must actually read.',
        diagram: `<div class="viz-col"><div class="viz-row">${cell('id', 'is-active') + cell('user', 'is-active') + cell('ts', 'is-active') + cell('amount', 'is-active') + cell('…', 'is-active')}</div>
          <small style="color:var(--text-muted)">query needs only <b>amount</b></small></div>`,
      },
      {
        title: 'Row storage (OLTP layout)',
        caption: 'A row store writes all columns of row 1, then all of row 2, and so on. Great for "fetch/update one whole record" (transactional apps). But AVG(amount) must read every row — every column — and discard most of it.',
        diagram: `<div class="viz-col">
          <div class="viz-row">${cell('r1:id,user,ts,amt', 'is-dim')}</div>
          <div class="viz-row">${cell('r2:id,user,ts,amt', 'is-dim')}</div>
          <div class="viz-row">${cell('r3:id,user,ts,amt', 'is-dim')}</div>
          <span class="viz-tag viz-tag--shuffle">reads all columns to sum one</span></div>`,
      },
      {
        title: 'Columnar storage (OLAP layout)',
        caption: 'A columnar format stores all values of a column contiguously: all ids, then all users, then all amounts. The AVG query reads only the amount column’s blocks and skips the rest entirely — far fewer bytes off disk.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-lane-h" style="width:60px">id</div>${cell('…', 'is-dim')}</div>
          <div class="viz-row"><div class="viz-lane-h" style="width:60px">user</div>${cell('…', 'is-dim')}</div>
          <div class="viz-row"><div class="viz-lane-h" style="width:60px">amount</div>${cell('9', 'is-active') + cell('4', 'is-active') + cell('7', 'is-active')}</div>
          <span class="viz-tag viz-tag--narrow">reads only the amount column</span></div>`,
      },
      {
        title: 'Compression loves columns',
        caption: 'Values in one column share a type and often repeat, so columnar data compresses far better (run-length, dictionary, delta encodings). Less storage and less I/O — a double win for scans.',
        diagram: `<div class="viz-col"><div class="viz-row">
            ${cell('USD,USD,USD,USD', 'is-dim')}<span class="viz-arrow">→</span>${cell('USD ×4 (dict)', 'is-done')}</div>
          <small style="color:var(--text-muted)">dictionary / run-length encoding on a single-type column</small></div>`,
      },
      {
        title: 'Vectorized execution',
        caption: 'Because a column is a contiguous array of one type, the engine processes it in batches through CPU SIMD instructions instead of row-by-row. Columnar layout + vectorization is why warehouses scan billions of rows per second.',
        diagram: `<div class="viz-col"><div class="viz-row">${cell('9', 'is-active') + cell('4', 'is-active') + cell('7', 'is-active') + cell('2', 'is-active')}<span class="viz-arrow">→</span><div class="viz-box is-done">batch sum (SIMD)</div></div></div>`,
      },
      {
        title: 'Right tool for the workload',
        caption: 'Row stores win for point lookups and single-record writes (transactional apps); columnar wins for scans and aggregates (analytics). Lakehouse formats are columnar — which is why they serve BI well but are not a drop-in for an OLTP database.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">Row<small>OLTP · lookups/writes</small></div>
            <div class="viz-box is-active">Columnar<small>OLAP · scans/aggregates</small></div>
          </div></div>`,
      },
    ],
  });
})();
