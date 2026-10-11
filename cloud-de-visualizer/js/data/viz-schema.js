/* ============================================================
   Conceptual visualizer: schema evolution & schema drift.

   Models how a table format (Delta / Iceberg / Parquet-backed)
   handles additive schema changes, how readers stay compatible,
   and how unmanaged "schema drift" from upstream sources breaks
   pipelines. Conceptual only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'schema-evolution',
    title: 'Schema evolution & drift',
    subtitle: 'How a modern table format evolves its schema safely over time — adding, widening and renaming columns — and why unmanaged drift from upstream sources is a leading cause of broken pipelines.',
    vendor: 'multi',
    tags: ['schema evolution', 'schema drift', 'delta', 'iceberg', 'parquet', 'mergeSchema', 'column mapping', 'backward compatible', 'data quality', 'pipeline'],
    steps: [
      {
        title: 'A table has a schema and files',
        caption: 'A table format separates the logical schema (column names, types, nullability) from the physical data files. Readers resolve columns through the schema, not by file position — the key that makes safe evolution possible.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">schema v1<small>id, name, amount</small></div>
            <span class="viz-arrow">→</span>
            <div class="viz-box">file A<small>3 columns</small></div>
            <div class="viz-box">file B<small>3 columns</small></div></div></div>`,
      },
      {
        title: 'Additive change: a new column',
        caption: 'Adding a nullable column is the safe, backward-compatible change. The schema advances to v2; old files simply return null for the new column. No rewrite of historical data is required — reads of old files stay correct.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">schema v2<small>+ currency (nullable)</small></div></div>
          <div class="viz-row">
            <div class="viz-box">old file A<small>currency → null</small></div>
            <div class="viz-box is-active">new file C<small>currency = USD</small></div></div>
          <span class="viz-tag viz-tag--narrow">backward compatible, no rewrite</span></div>`,
      },
      {
        title: 'Widening a type is safe; narrowing is not',
        caption: 'Promoting int → long or float → double is a safe widening: every old value still fits. Narrowing (long → int) or an incompatible retype can lose or corrupt data, so engines reject it unless you explicitly rewrite and overwrite the column.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">amount: int → long ✓</div>
            <div class="viz-box is-hot">amount: long → int ✗</div></div>
          <span class="viz-tag viz-tag--narrow">widen = safe</span>
          <span class="viz-tag viz-tag--shuffle">narrow = rejected</span></div>`,
      },
      {
        title: 'Rename without rewriting: column mapping',
        caption: 'Formats with column mapping assign each column a stable internal ID, so a rename only updates metadata — the underlying files are untouched. Without column mapping, a rename means rewriting every file, because readers would otherwise match by the old physical name.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">name → full_name</div>
            <span class="viz-arrow">→</span>
            <div class="viz-box is-done">metadata only<small>col id #2 unchanged</small></div></div>
          <span class="viz-tag viz-tag--narrow">files not rewritten</span></div>`,
      },
      {
        title: 'Schema drift: the upstream changes on you',
        caption: 'Drift is schema change you did not plan for — a source adds a field, reorders columns, or changes a type. A strict writer rejects the batch (pipeline fails); a blind one silently mismatches columns (data corruption). Neither is acceptable without a policy.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">source batch<small>+ region, amount now string</small></div>
            <span class="viz-arrow">→</span>
            <div class="viz-box is-hot">target expects v2<small>mismatch</small></div></div>
          <span class="viz-tag viz-tag--shuffle">unplanned drift → failure or corruption</span></div>`,
      },
      {
        title: 'Manage drift deliberately',
        caption: 'Decide the policy up front: auto-merge safe additive changes (mergeSchema), quarantine or dead-letter rows that violate the contract, and fail loudly on unsafe changes. A data contract plus enforced evolution turns drift from an outage into a reviewed, logged event.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">additive → auto-merge</div>
            <div class="viz-box is-active">violating rows → quarantine</div>
            <div class="viz-box is-hot">unsafe type → fail + alert</div></div>
          <span class="viz-tag viz-tag--narrow">contract + policy = controlled evolution</span></div>`,
      },
    ],
  });
})();
