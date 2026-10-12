/* ============================================================
   Conceptual visualizer: partitioning vs bucketing vs Z-ordering.

   Models the three main physical data-layout techniques for
   skipping work at read time, how each one organizes files, and
   when each helps or hurts. Conceptual only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'data-layout',
    title: 'Partitioning vs bucketing vs Z-order',
    subtitle: 'The three physical data-layout techniques that let a query read less — directory partitioning, hash bucketing, and multi-dimensional Z-ordering — and the trade-off that makes each one right only for certain access patterns.',
    vendor: 'multi',
    tags: ['partitioning', 'bucketing', 'z-order', 'z-ordering', 'data skipping', 'file pruning', 'clustering', 'small files', 'layout', 'spark', 'delta', 'performance'],
    steps: [
      {
        title: 'Reading less is the whole game',
        caption: 'Query speed on large tables is dominated by how much data has to be read. All three layout techniques aim at the same goal: let the engine skip files it can prove are irrelevant, so it scans a fraction of the table.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box">file</div><div class="viz-box">file</div><div class="viz-box">file</div>
            <div class="viz-box">file</div><div class="viz-box">file</div><div class="viz-box">file</div></div>
          <span class="viz-tag">goal: read only the files that can match</span></div>`,
      },
      {
        title: 'Partitioning: one directory per value',
        caption: 'Partitioning physically groups rows into separate directories by a column (commonly date). A filter on that column prunes whole directories before any file is opened. It is the strongest pruning there is — for the one or two columns you partition by.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-dim">dt=01-01</div><div class="viz-box is-dim">dt=01-02</div>
            <div class="viz-box is-done">dt=01-03 ✓</div><div class="viz-box is-dim">dt=01-04</div></div>
          <span class="viz-tag viz-tag--narrow">WHERE dt='01-03' → scan one directory</span></div>`,
      },
      {
        title: 'Partitioning’s failure mode: small files',
        caption: 'Partition on a high-cardinality column (user_id, timestamp-to-the-second) and you get millions of tiny directories and files. Metadata overhead and the "small files problem" then make everything slower. Partition only on low-cardinality columns you actually filter on.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">id=1</div><div class="viz-box is-hot">id=2</div><div class="viz-box is-hot">id=3</div>
            <div class="viz-box is-hot">id=4</div><div class="viz-box is-hot">…millions</div></div>
          <span class="viz-tag viz-tag--shuffle">high cardinality → small-file explosion</span></div>`,
      },
      {
        title: 'Bucketing: fixed hash buckets',
        caption: 'Bucketing hashes a column into a fixed number of buckets, each a file. It does not explode with cardinality, and because both sides of a join can be bucketed the same way, matching rows pre-co-locate — enabling a shuffle-free join. Great for high-cardinality join keys.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">bucket 0</div><div class="viz-box is-done">bucket 1</div>
            <div class="viz-box is-done">bucket 2</div><div class="viz-box is-done">bucket 3</div></div>
          <span class="viz-tag viz-tag--narrow">hash(key) % N → shuffle-free join on key</span></div>`,
      },
      {
        title: 'Z-order: cluster on several columns at once',
        caption: 'Z-ordering sorts data along a space-filling curve so rows close in multiple dimensions land in the same files. Combined with per-file min/max statistics, a filter on any of the Z-ordered columns skips most files — without creating a directory per value.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">z-order (country, product)</div></div>
          <div class="viz-row">
            <div class="viz-box is-dim">file min/max excludes</div>
            <div class="viz-box is-done">file matches ✓</div>
            <div class="viz-box is-dim">file min/max excludes</div></div>
          <span class="viz-tag viz-tag--narrow">multi-column skipping, no dir explosion</span></div>`,
      },
      {
        title: 'Pick by access pattern',
        caption: 'There is no universal best. Partition on the low-cardinality column you always filter by (date). Bucket a high-cardinality join key to kill the shuffle. Z-order when queries filter on several high-cardinality columns in varying combinations. Many tables use partitioning plus Z-order together.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">partition<small>date filter</small></div>
            <div class="viz-box is-done">bucket<small>join key</small></div>
            <div class="viz-box is-done">z-order<small>multi-col filters</small></div></div>
          <span class="viz-tag viz-tag--narrow">match the layout to how you query</span></div>`,
      },
    ],
  });
})();
