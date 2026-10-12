/* ============================================================
   Conceptual visualizer: query result caching & materialized views.

   Models the layers that make a repeated query fast — result cache,
   materialized views, and their refresh/invalidation — and the
   staleness trade-off each one carries. Conceptual only.
   Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'query-caching',
    title: 'Result caching & materialized views',
    subtitle: 'How warehouses make a repeated query return instantly — the result cache, materialized views, and their refresh and invalidation — and the staleness trade-off each layer forces you to reason about.',
    vendor: 'multi',
    tags: ['result cache', 'materialized view', 'query cache', 'refresh', 'invalidation', 'incremental refresh', 'staleness', 'warehouse', 'performance', 'cost'],
    steps: [
      {
        title: 'The same query runs again and again',
        caption: 'Dashboards and reports re-issue the same heavy aggregations constantly. Recomputing from raw data every time is slow and expensive. Caching layers exist to avoid repeating work that has not changed.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">dashboard</div><span class="viz-arrow">→ same SELECT ×1000 →</span>
            <div class="viz-box is-hot">full scan + aggregate<small>slow, costly</small></div></div></div>`,
      },
      {
        title: 'Result cache: reuse the exact answer',
        caption: 'A result cache keys on the normalized query text (and the underlying data version). An identical query returns the stored result with no compute at all — often in milliseconds. It is the cheapest layer but also the most fragile: almost any change invalidates it.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">query hash</div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">cache HIT<small>stored result</small></div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">instant</div></div>
          <span class="viz-tag viz-tag--narrow">no compute on hit</span></div>`,
      },
      {
        title: 'Why the result cache misses',
        caption: 'The result cache is all-or-nothing. Change the data in a referenced table, change the query by even one character, or in some engines just cross a time boundary, and you get a miss — back to a full recompute. It helps identical, repeated reads, not evolving ones.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">base table changed</div>
            <div class="viz-box is-hot">query text differs</div>
            <span class="viz-arrow">→</span>
            <div class="viz-box is-hot">cache MISS → recompute</div></div>
          <span class="viz-tag viz-tag--shuffle">brittle: exact match only</span></div>`,
      },
      {
        title: 'Materialized view: precompute and store',
        caption: 'A materialized view stores the result of a query as a real, queryable object. Unlike a plain view (which re-runs every time), it is already computed — and the optimizer can even rewrite other queries to read from it. It survives small query variations the result cache cannot.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">heavy aggregate</div><span class="viz-arrow">→ precomputed →</span>
            <div class="viz-box is-done">MV: daily_sales<small>stored rows</small></div></div>
          <span class="viz-tag viz-tag--narrow">optimizer can auto-rewrite to the MV</span></div>`,
      },
      {
        title: 'Refresh: full vs incremental',
        caption: 'A materialized view goes stale as its base tables change, so it must be refreshed. A full refresh recomputes everything — simple but costly. An incremental refresh applies only the changed partitions or rows — far cheaper, but only possible when the engine can track what changed.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">full refresh<small>recompute all</small></div>
            <div class="viz-box is-done">incremental<small>only new/changed rows</small></div></div>
          <span class="viz-tag viz-tag--shuffle">full = costly</span>
          <span class="viz-tag viz-tag--narrow">incremental = cheap when trackable</span></div>`,
      },
      {
        title: 'The staleness contract',
        caption: 'Every cache layer trades freshness for speed. Pick the bound deliberately: result cache for identical reads, a materialized view with scheduled or on-commit refresh for near-real-time, raw query when the answer must be exact to the second. State the tolerated staleness — do not let it be an accident.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">result cache<small>fastest, most stale-prone</small></div>
            <div class="viz-box is-active">MV + refresh<small>fast, bounded staleness</small></div>
            <div class="viz-box">raw query<small>exact, slowest</small></div></div>
          <span class="viz-tag viz-tag--narrow">choose the staleness bound on purpose</span></div>`,
      },
    ],
  });
})();
