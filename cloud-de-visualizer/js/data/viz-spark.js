/* ============================================================
   Conceptual visualizer: Apache Spark job execution.

   Models the lifecycle of a Spark action through the DAG scheduler:
   logical plan → stage split at the shuffle boundary → task
   execution per partition → shuffle → final stage → result to driver.
   Technically faithful at the conceptual level; NOT a live execution.
   Registered on TV.Viz (see viz-framework.js).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  // 4 input partitions carried through the job.
  const P = [0, 1, 2, 3];

  const parts = (cls, label) => `<div class="viz-row">${P.map(p =>
    `<div class="viz-box ${cls}">P${p}${label ? `<small>${label}</small>` : ''}</div>`).join('')}</div>`;

  function stage0(active) {
    return `<div class="viz-col">
      <span class="viz-tag viz-tag--narrow">Stage 0 · narrow transforms</span>
      <div class="viz-row">${P.map(p =>
        `<div class="viz-box ${active ? 'is-active' : 'is-done'}">P${p}<small>read → filter → map</small></div>`).join('')}</div>
      <small style="color:var(--text-muted)">Each partition is processed independently — no data movement.</small>
    </div>`;
  }

  TV.Viz.register({
    id: 'spark-execution',
    title: 'Spark job execution',
    subtitle: 'How one action becomes stages, tasks, a shuffle, and a result — the core mental model behind every Spark and Databricks job.',
    vendor: 'databricks',
    tags: ['spark', 'dag', 'shuffle', 'stages', 'partitions', 'databricks'],
    steps: [
      {
        title: 'An action triggers a job',
        caption: 'Transformations (filter, map, groupBy) are lazy — nothing runs until an action such as count(), collect(), or write() is called. The action submits one job to the driver.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-active">Driver<small>df.groupBy(k).agg(...).write()</small></div>
          <span class="viz-arrow">↓</span>
          <span class="viz-tag">Job submitted</span>
        </div>`,
      },
      {
        title: 'DAG scheduler builds the plan',
        caption: 'The driver turns the logical plan into a DAG of stages. A stage boundary is created wherever a wide transformation (one that needs a shuffle) appears. Here: one boundary at groupBy.',
        diagram: `<div class="viz-col">
          <div class="viz-row">
            <div class="viz-box is-active">Stage 0<small>read·filter·map</small></div>
            <span class="viz-arrow">→</span>
            <div class="viz-box is-active" style="border-style:dashed">shuffle</div>
            <span class="viz-arrow">→</span>
            <div class="viz-box">Stage 1<small>agg·write</small></div>
          </div>
          <small style="color:var(--text-muted)">Narrow transforms pipeline inside a stage; the wide groupBy splits the DAG.</small>
        </div>`,
      },
      {
        title: 'Stage 0 — tasks run per partition',
        caption: 'The scheduler launches one task per input partition. Tasks run in parallel across executor cores. Narrow transforms (filter, map) are fused and applied row-by-row with no data movement.',
        diagram: () => stage0(true),
      },
      {
        title: 'Shuffle write',
        caption: 'Because groupBy regroups rows by key, each Stage 0 task writes its output to local shuffle files, partitioned by the target hash of the key. This is the expensive part — data hits disk and crosses the network.',
        diagram: `<div class="viz-col">
          <div class="viz-lane-h">Stage 0 tasks write shuffle blocks</div>
          <div class="viz-row">${P.map(p =>
            `<div class="viz-box is-done">P${p}<small>write by hash(key)</small></div>`).join('')}</div>
          <span class="viz-arrow">↓</span>
          <span class="viz-tag viz-tag--shuffle">Shuffle · disk + network</span>
        </div>`,
      },
      {
        title: 'Shuffle read + Stage 1',
        caption: 'Stage 1 tasks fetch the shuffle blocks for the keys they own, then run the aggregation. The number of Stage 1 tasks is set by spark.sql.shuffle.partitions (default 200) — a classic small-files / skew tuning knob.',
        diagram: `<div class="viz-col">
          <span class="viz-tag viz-tag--shuffle">Shuffle read — fetch blocks by key</span>
          <span class="viz-arrow">↓</span>
          <div class="viz-row">
            <div class="viz-box is-active">R0<small>agg keys a–h</small></div>
            <div class="viz-box is-active">R1<small>agg keys i–q</small></div>
            <div class="viz-box is-hot">R2<small>skewed key → slow task</small></div>
          </div>
          <small style="color:var(--text-muted)">A single hot key lands all its rows on one task — the usual cause of one straggler.</small>
        </div>`,
      },
      {
        title: 'Result returned to the driver',
        caption: 'Stage 1 writes the output (or returns rows to the driver for collect()). The job is complete. Fewer shuffles, balanced partitions, and avoiding skew are what make the whole DAG fast.',
        diagram: `<div class="viz-col">
          <div class="viz-row">
            <div class="viz-box is-done">R0 ✓</div>
            <div class="viz-box is-done">R1 ✓</div>
            <div class="viz-box is-done">R2 ✓</div>
          </div>
          <span class="viz-arrow">↓</span>
          <div class="viz-box is-done">Output written<small>job complete</small></div>
        </div>`,
      },
    ],
  });
})();
