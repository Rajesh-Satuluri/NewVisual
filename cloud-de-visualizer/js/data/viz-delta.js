/* ============================================================
   Conceptual visualizer: Delta Lake transaction log (_delta_log).

   Models how an ACID commit works on a Delta table: data files are
   written first, then an atomic JSON commit makes them visible; the
   log enables snapshot isolation, time travel, OPTIMIZE and VACUUM.
   Conceptual only — no live table. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const log = (versions, hi) => `<div class="viz-lane">
    <div class="viz-lane-h">_delta_log/</div>
    <div class="viz-row" style="justify-content:flex-start">${versions.map(v =>
      `<div class="viz-box ${v === hi ? 'is-active' : 'is-done'}">${String(v).padStart(20, '0').slice(-6)}.json<small>v${v}</small></div>`).join('')}</div>
  </div>`;

  TV.Viz.register({
    id: 'delta-transaction',
    title: 'Delta Lake transaction log',
    subtitle: 'How Delta gives a data lake ACID commits, snapshot isolation, and time travel — all through an ordered log of JSON actions.',
    vendor: 'databricks',
    tags: ['delta', 'acid', 'transaction log', 'time travel', 'optimize', 'vacuum', 'databricks', 'fabric'],
    steps: [
      {
        title: 'Starting snapshot (version 3)',
        caption: 'A Delta table is a directory of Parquet data files plus a _delta_log/ of ordered JSON commits. The current version is the result of replaying every commit up to the latest.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-done">part-0.parquet</div><div class="viz-box is-done">part-1.parquet</div></div>
          ${log([0, 1, 2, 3], 3)}
        </div>`,
      },
      {
        title: 'Write data files first',
        caption: 'A writer (e.g. MERGE or INSERT) writes new Parquet files to the table directory. At this point they are NOT yet part of the table — readers still see version 3. Nothing is visible until the commit lands.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-done">part-0</div><div class="viz-box is-done">part-1</div><div class="viz-box is-active">part-2<small>new, uncommitted</small></div></div>
          <span class="viz-tag">not yet visible to readers</span>
          ${log([0, 1, 2, 3], 3)}
        </div>`,
      },
      {
        title: 'Atomic commit → version 4',
        caption: 'The writer attempts to create 000004.json listing add/remove actions. Creating that file is atomic: either it succeeds (the new files become part of the table) or it fails and the orphaned Parquet is ignored. This is the ACID boundary.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-active">000004.json<small>add part-2 · stats · schema</small></div>
          <span class="viz-arrow">↓ atomic create</span>
          ${log([0, 1, 2, 3, 4], 4)}
        </div>`,
      },
      {
        title: 'Snapshot isolation for concurrent readers',
        caption: 'A reader that started before the commit keeps reading version 3; a reader that starts after sees version 4. Nobody sees a half-written table. Concurrent writers use optimistic concurrency — a conflicting commit retries against the new version.',
        diagram: `<div class="viz-col">
          <div class="viz-row">
            <div class="viz-box">Reader A<small>pinned to v3</small></div>
            <div class="viz-box is-active">Reader B<small>sees v4</small></div>
          </div>
          <small style="color:var(--text-muted)">Both are consistent — isolation comes from reading a fixed log position.</small>
        </div>`,
      },
      {
        title: 'Time travel',
        caption: 'Because every version is just a log position, you can query the table AS OF version 3 (or a timestamp). Delta replays the log up to that point. Great for audits, reproducible reports, and recovering from a bad write.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-active">SELECT * FROM t VERSION AS OF 3</div>
          <span class="viz-arrow">↓ replay log 0..3</span>
          ${log([0, 1, 2, 3, 4], 3)}
        </div>`,
      },
      {
        title: 'OPTIMIZE and VACUUM',
        caption: 'OPTIMIZE compacts many small files into fewer large ones (a new commit that removes the small files and adds compacted ones). VACUUM then physically deletes files no longer referenced and older than the retention window. Time travel only works within what VACUUM has kept.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-hot">small files ×9</div><span class="viz-arrow">→</span><div class="viz-box is-done">compacted ×2</div></div>
          <span class="viz-tag viz-tag--narrow">OPTIMIZE (new commit)</span>
          <span class="viz-tag">VACUUM removes unreferenced files past retention</span>
        </div>`,
      },
    ],
  });
})();
