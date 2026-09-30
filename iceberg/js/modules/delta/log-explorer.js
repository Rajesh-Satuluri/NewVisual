/* ============================================================
   Delta Lake — Transaction Log Explorer (interactive, static)
   Click a commit in _delta_log to inspect its actions. No engine;
   scrolls via the .page-enter bridge.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const COMMITS = [
    { v: 0, file: '00000000000000000000.json', op: 'CREATE TABLE', when: '2024-01-15 02:00',
      actions: [
        '{ "protocol": { "minReaderVersion": 3, "minWriterVersion": 7 } }',
        '{ "metaData": { "schemaString": "order_id, country, order_date, total_amount…", "partitionColumns": ["country"] } }',
        '{ "commitInfo": { "operation": "CREATE TABLE", "engineInfo": "Spark 3.5" } }',
      ] },
    { v: 1, file: '00000000000000000001.json', op: 'WRITE (append)', when: '2024-01-16 00:00',
      actions: [
        '{ "add": { "path": "country=BR/part-0001.parquet", "size": 268435456, "stats": {"numRecords":842000,"minValues":{"order_date":"2024-01-16"},"maxValues":{"order_date":"2024-01-16"}} } }',
        '{ "add": { "path": "country=US/part-0002.parquet", "size": 301989888, "stats": {"numRecords":1200000} } }',
        '{ "commitInfo": { "operation": "WRITE", "operationMetrics": {"numFiles":"2","numOutputRows":"2042000"} } }',
      ] },
    { v: 2, file: '00000000000000000002.json', op: 'MERGE', when: '2024-01-17 06:12',
      actions: [
        '{ "remove": { "path": "country=BR/part-0001.parquet", "deletionTimestamp": 1705..., "dataChange": true } }',
        '{ "add": { "path": "country=BR/part-0007.parquet", "size": 271581184, "stats": {"numRecords":851200} } }',
        '{ "commitInfo": { "operation": "MERGE", "operationMetrics": {"numTargetRowsUpdated":"9200","numTargetRowsInserted":"4100"} } }',
      ] },
    { v: 3, file: '00000000000000000003.json', op: 'DELETE (deletion vector)', when: '2024-01-18 09:40',
      actions: [
        '{ "add": { "path": "country=US/part-0002.parquet", "deletionVector": {"storageType":"u","cardinality":1830}, "dataChange": true } }',
        '{ "commitInfo": { "operation": "DELETE", "operationMetrics": {"numDeletedRows":"1830","numRemovedFiles":"0"} } }',
      ] },
    { v: 10, file: '00000000000000000010.checkpoint.parquet', op: 'CHECKPOINT', when: '2024-01-25 00:00', checkpoint: true,
      actions: [
        '# Parquet snapshot of cumulative table state at version 10.',
        '# Contains every still-live add action + protocol + metaData,',
        '# so readers start here and replay only commits 11+.',
      ] },
  ];

  function html() {
    const rows = COMMITS.map((c, i) => `
      <button class="dle-row${i === 0 ? ' active' : ''}${c.checkpoint ? ' ckpt' : ''}" data-i="${i}" type="button">
        <span class="dle-ico">${c.checkpoint ? '📦' : '📄'}</span>
        <span class="dle-file">${c.file}</span>
        <span class="dle-op">${c.op}</span>
      </button>`).join('');
    return `
<style>
.dle { height:100%; overflow-y:auto; padding:28px 32px 60px; }
.dle-wrap { max-width:1000px; margin:0 auto; }
.dle-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:6px; }
.dle-lead { font-size:13.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:22px; max-width:720px; }
.dle-cols { display:grid; grid-template-columns:minmax(280px,360px) 1fr; gap:16px; align-items:start; }
@media (max-width:760px){ .dle-cols{ grid-template-columns:1fr; } }
.dle-tree { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); overflow:hidden; }
.dle-treehdr { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--purple); padding:10px 14px; border-bottom:1px solid var(--border-default); }
.dle-row { width:100%; display:flex; align-items:center; gap:8px; padding:9px 14px; background:none; border:none; border-left:3px solid transparent; text-align:left; cursor:pointer; }
.dle-row:hover { background:var(--bg-3); }
.dle-row.active { background:var(--brand-glow); border-left-color:var(--brand); }
.dle-ico { flex-shrink:0; }
.dle-file { font-family:var(--font-mono); font-size:10.5px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.dle-row.active .dle-file { color:var(--text-primary); }
.dle-op { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); flex-shrink:0; }
.dle-row.ckpt .dle-op { color:var(--orange); }
.dle-detail { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px 18px; min-height:280px; }
.dle-dhead { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.dle-dtitle { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-primary); }
.dle-dwhen { font-size:11px; color:var(--text-muted); }
.dle-action { font-family:var(--font-mono); font-size:11px; line-height:1.6; color:var(--text-secondary); background:var(--bg-1); border:1px solid var(--border-default); border-radius:8px; padding:8px 10px; margin-bottom:8px; white-space:pre-wrap; word-break:break-word; }
.dle-action.add { border-left:3px solid var(--green); }
.dle-action.remove { border-left:3px solid var(--red); }
.dle-action.meta { border-left:3px solid var(--purple); }
.dle-action.info { border-left:3px solid var(--text-muted); }
.dle-note { font-size:12px; color:var(--text-secondary); line-height:1.6; margin-top:10px; padding:10px 12px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:8px; }
</style>
<div class="dle page-enter">
  <div class="dle-wrap">
    <h1 class="dle-h1">Transaction Log Explorer</h1>
    <p class="dle-lead">Everything Delta knows about the <code>orders</code> table lives in <code>_delta_log/</code> as ordered
      commit files. Click a commit to inspect its <strong>actions</strong> — the atomic set of protocol / metaData / add / remove
      / commitInfo records that define that version.</p>
    <div class="dle-cols">
      <div class="dle-tree">
        <div class="dle-treehdr">s3://shopkart/orders/_delta_log/</div>
        ${rows}
      </div>
      <div class="dle-detail" id="dle-detail"></div>
    </div>
  </div>
</div>`;
  }

  function cls(a) {
    if (a.indexOf('"add"') >= 0) return 'add';
    if (a.indexOf('"remove"') >= 0) return 'remove';
    if (a.indexOf('"metaData"') >= 0 || a.indexOf('"protocol"') >= 0) return 'meta';
    if (a.indexOf('#') === 0) return 'info';
    return 'info';
  }

  function renderDetail(root, i) {
    const c = COMMITS[i];
    const detail = root.querySelector('#dle-detail');
    detail.innerHTML =
      `<div class="dle-dhead"><span class="dle-dtitle">${c.file}</span><span class="dle-dwhen">v${c.v} · ${c.op} · ${c.when} UTC</span></div>` +
      c.actions.map(a => `<div class="dle-action ${cls(a)}">${a.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</div>`).join('') +
      (c.checkpoint
        ? `<div class="dle-note">A checkpoint is written every ${TV.DeltaData.checkpointEvery} commits. Without it, a reader would replay every JSON commit from version 0 — checkpoints keep read latency flat as history grows.</div>`
        : `<div class="dle-note">Applying commits 0…${c.v} in order reconstructs the exact live file set and schema at version ${c.v}. That replay <em>is</em> the table.</div>`);
    root.querySelectorAll('.dle-row').forEach((el, j) => el.classList.toggle('active', j === i));
  }

  TV.registerModule('delta', {
    id: 'log-explorer', title: 'Transaction Log', group: 'start', format: 'delta',
    render(container) {
      container.className = '';
      container.innerHTML = html();
      const root = container.querySelector('.dle');
      root.querySelectorAll('.dle-row').forEach(btn =>
        btn.addEventListener('click', () => renderDetail(root, parseInt(btn.dataset.i, 10))));
      renderDetail(root, 0);
      const cols = root.querySelector('.dle-cols');
      if (cols && TV.SplitPane) {
        this._split = TV.SplitPane.attach(cols, {
          key: 'delta/log-explorer',
          disableBelow: 760,
          tracks: [
            { min: 220, max: 520, def: 320 },  // commit list
            { flex: true, min: 300 },          // commit detail
          ],
        });
      }
    },
    destroy() {
      if (this._split) { this._split.detach(); this._split = null; }
      TV.AnimationControls.hide();
    },
  });
})();
