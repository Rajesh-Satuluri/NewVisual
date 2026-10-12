/* ============================================================
   Conceptual visualizer: change data capture (CDC) & mirroring.

   Models how changes in a source database are captured from its
   transaction log and continuously applied to an analytics table
   (Fabric Mirroring / Debezium+MERGE / DMS): snapshot, log tailing,
   change events, MERGE apply, and handling deletes. Conceptual only.
   Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const rows = (items) => `<div class="viz-col" style="gap:4px">${items.map(r =>
    `<div class="viz-box ${r.cls || ''}" style="min-width:150px">${r.t}</div>`).join('')}</div>`;

  TV.Viz.register({
    id: 'cdc-mirroring',
    title: 'Change data capture & mirroring',
    subtitle: 'How a source database is continuously replicated into analytics — without heavy full reloads — by tailing its transaction log and merging changes.',
    vendor: 'multi',
    tags: ['cdc', 'change data capture', 'mirroring', 'fabric mirroring', 'debezium', 'dms', 'merge', 'replication', 'binlog', 'upsert'],
    steps: [
      {
        title: 'The naive way: full reload',
        caption: 'Re-copying the whole source table on a schedule is simple but expensive and stale: it is heavy on the source, slow, and only as fresh as the last batch. CDC exists to avoid exactly this.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">Source table (10M rows)</div><span class="viz-arrow">⇒ copy all</span><div class="viz-box is-hot">Analytics copy</div></div>
          <small style="color:var(--text-muted)">heavy + stale between runs</small></div>`,
      },
      {
        title: 'Initial snapshot',
        caption: 'CDC starts with a one-time consistent snapshot of the source at a known log position (the LSN / SCN / binlog offset). After this, only changes are shipped — never the whole table again.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">Snapshot @ LSN 1000</div><span class="viz-arrow">→</span><div class="viz-box is-done">Target table</div></div></div>`,
      },
      {
        title: 'Tail the transaction log',
        caption: 'Databases already write every change to a durable transaction log (WAL / binlog / redo). CDC reads that log instead of querying tables — so it captures every insert/update/delete with almost no load on the source.',
        diagram: `<div class="viz-col">${rows([
          { t: 'LSN 1001  INSERT id=42', cls: 'is-active' },
          { t: 'LSN 1002  UPDATE id=7', cls: 'is-active' },
          { t: 'LSN 1003  DELETE id=3', cls: 'is-hot' },
        ])}<small style="color:var(--text-muted)">ordered change events from the log</small></div>`,
      },
      {
        title: 'Change events carry before/after',
        caption: 'Each event records the operation, the key, and (for updates) before and after images, plus the commit order. That ordering is what lets the target apply changes correctly even under concurrency.',
        diagram: `<div class="viz-col">${rows([
          { t: 'op=u key=7 before={q:1} after={q:5}', cls: 'is-active' },
        ])}</div>`,
      },
      {
        title: 'Apply with MERGE (upsert)',
        caption: 'The target applies events idempotently with a MERGE on the primary key: insert new keys, update changed ones. Idempotent apply means a replay or retry is safe — essential for exactly-once-ish semantics.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">change events</div><span class="viz-arrow">→ MERGE ON key →</span><div class="viz-box is-done">target (upserted)</div></div></div>`,
      },
      {
        title: 'Deletes & soft-deletes',
        caption: 'A delete in the source must be reflected downstream. Depending on policy, the target hard-deletes the row or marks it is_deleted=true (soft delete) to preserve history for analytics and time travel. The result is a near-real-time mirror at a fraction of full-reload cost.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">DELETE id=3</div><span class="viz-arrow">→</span><div class="viz-box is-done">row removed / is_deleted=true</div></div></div>`,
      },
    ],
  });
})();
