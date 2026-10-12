/* ============================================================
   Conceptual visualizer: query optimizer join strategies.

   Models how a cost-based optimizer picks a physical join — broadcast
   hash join, shuffle hash join, sort-merge join — and why skew and
   missing stats hurt. Conceptual only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'join-strategies',
    title: 'Query optimizer: join strategies',
    subtitle: 'How a cost-based optimizer chooses a physical join — and why the choice, driven by table size and statistics, can make the same query 100× faster or slower.',
    vendor: 'multi',
    tags: ['join', 'optimizer', 'broadcast join', 'shuffle hash join', 'sort merge join', 'cbo', 'statistics', 'skew', 'spark', 'warehouse'],
    steps: [
      {
        title: 'A join needs matching rows together',
        caption: 'To join two tables on a key, the engine must get rows with the same key onto the same machine. How it does that — the physical join strategy — is the optimizer’s most consequential decision.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">orders (big)</div><span class="viz-arrow">⋈ on customer_id</span><div class="viz-box is-active">customers (?)</div></div></div>`,
      },
      {
        title: 'Statistics drive the decision',
        caption: 'A cost-based optimizer estimates each side’s size from table statistics (row counts, column histograms). Stale or missing stats are the #1 cause of a bad plan — the optimizer guesses wrong and picks the expensive strategy.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">orders ≈ 1B rows</div><div class="viz-box is-done">customers ≈ 5M rows</div></div>
          <span class="viz-tag">optimizer compares estimated sizes</span></div>`,
      },
      {
        title: 'Broadcast hash join (small side)',
        caption: 'If one side is small enough to fit in memory, the engine broadcasts a copy to every node and builds a hash table there. No shuffle of the big table — by far the cheapest join. This is why a broadcast threshold exists and why keeping dimension tables small matters.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">customers (small)</div><span class="viz-arrow">→ broadcast →</span>
            <div class="viz-box is-active">every node joins locally</div></div>
          <span class="viz-tag viz-tag--narrow">no shuffle of the big table</span></div>`,
      },
      {
        title: 'Shuffle hash / sort-merge (both large)',
        caption: 'When both sides are large, neither can be broadcast. The engine shuffles both by the join key so matching keys co-locate, then joins — hash join if a side fits per-partition, else sort-merge (sort both, merge in order). Correct but costly: a full shuffle of both tables.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">orders</div><div class="viz-box is-hot">line_items</div></div>
          <span class="viz-tag viz-tag--shuffle">shuffle both by key → sort-merge</span></div>`,
      },
      {
        title: 'Skew breaks the balance',
        caption: 'If one key is hugely over-represented (a null customer_id, a mega-account), its partition dwarfs the others and one task becomes a straggler. Fixes: salting the skewed key, adaptive skew-join splitting, or filtering the junk key.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">key a</div><div class="viz-box is-done">key b</div><div class="viz-box is-hot">key null (90%)</div></div>
          <span class="viz-tag viz-tag--shuffle">one giant partition → straggler</span></div>`,
      },
      {
        title: 'Adaptive query execution',
        caption: 'Modern engines re-plan at runtime (AQE): they see actual shuffle sizes and can switch a planned sort-merge to a broadcast, coalesce tiny partitions, or split a skewed one. Good stats + AQE is why the same SQL keeps getting faster without you rewriting it.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">planned: sort-merge</div><span class="viz-arrow">→ AQE sees sizes →</span><div class="viz-box is-done">switched: broadcast</div></div></div>`,
      },
    ],
  });
})();
