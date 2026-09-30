/* Delta Lake — Commit Explorer (anatomy of a commit, interactive/static) */
(function () {
  'use strict';
  const TV = window.TableViz;

  const SPECS = {
    merge: {
      label: 'MERGE', title: '000…847.json',
      actions: [
        { k: 'remove', c: 'remove', j: '{ "remove": { "path": "country=BR/part-0049.parquet", "deletionTimestamp": 1705900000, "dataChange": true } }', why: 'Tombstones the old target file whose rows were updated. Still on disk for time travel until VACUUM.' },
        { k: 'add', c: 'add', j: '{ "add": { "path": "country=BR/part-0051.parquet", "size": 271581184, "stats": {"numRecords":851200,"minValues":{...},"maxValues":{...}} } }', why: 'The rewritten file with updated rows. Its stats feed future data skipping.' },
        { k: 'add', c: 'add', j: '{ "add": { "path": "country=CA/part-0052.parquet", "stats": {"numRecords":4100} } }', why: 'A brand-new file for not-matched inserts.' },
        { k: 'commitInfo', c: 'info', j: '{ "commitInfo": { "operation": "MERGE", "operationMetrics": {"numTargetRowsUpdated":"9200","numTargetRowsInserted":"4100"} } }', why: 'Human/audit metadata + the metrics surfaced by DESCRIBE HISTORY.' },
      ],
    },
    delete: {
      label: 'DELETE (DV)', title: '000…845.json',
      actions: [
        { k: 'add', c: 'add', j: '{ "add": { "path": "country=US/part-0002.parquet", "deletionVector": {"storageType":"u","cardinality":1830}, "dataChange": true } }', why: 'Re-adds the SAME file with a deletion-vector reference — rows are masked, not rewritten (merge-on-read).' },
        { k: 'commitInfo', c: 'info', j: '{ "commitInfo": { "operation": "DELETE", "operationMetrics": {"numDeletedRows":"1830","numRemovedFiles":"0"} } }', why: 'numRemovedFiles is 0 — the whole point of deletion vectors.' },
      ],
    },
    create: {
      label: 'CREATE', title: '000…000.json',
      actions: [
        { k: 'protocol', c: 'meta', j: '{ "protocol": { "minReaderVersion": 3, "minWriterVersion": 7, "readerFeatures": ["deletionVectors"], "writerFeatures": ["deletionVectors"] } }', why: 'Negotiates which reader/writer features (table features) are required.' },
        { k: 'metaData', c: 'meta', j: '{ "metaData": { "schemaString": "…", "partitionColumns": ["country"], "configuration": {"delta.enableDeletionVectors":"true"} } }', why: 'The schema, partition columns, and table properties — everything about the table’s shape.' },
        { k: 'commitInfo', c: 'info', j: '{ "commitInfo": { "operation": "CREATE TABLE" } }', why: 'Marks version 0.' },
      ],
    },
  };

  function esc(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  function html() {
    const tabs = Object.keys(SPECS).map((k, i) =>
      `<button class="dce-tab${i === 0 ? ' active' : ''}" data-k="${k}" type="button">${SPECS[k].label}</button>`).join('');
    return `
<style>
.dce { height:100%; overflow-y:auto; padding:28px 32px 60px; }
.dce-wrap { max-width:920px; margin:0 auto; }
.dce-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:6px; }
.dce-lead { font-size:13.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:18px; max-width:720px; }
.dce-tabs { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; }
.dce-tab { padding:7px 14px; border-radius:999px; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary); font-size:12px; font-weight:700; cursor:pointer; }
.dce-tab.active { background:var(--brand); color:var(--text-on-accent); border-color:var(--brand); box-shadow:0 0 12px var(--brand-glow); }
.dce-title { font-family:var(--font-mono); font-size:12px; color:var(--purple); margin-bottom:12px; }
.dce-action { margin-bottom:12px; }
.dce-json { font-family:var(--font-mono); font-size:10.5px; line-height:1.55; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:8px 8px 0 0; padding:10px 12px; white-space:pre-wrap; word-break:break-word; border-left:3px solid var(--border-muted); }
.dce-json.add { border-left-color:var(--green); } .dce-json.remove { border-left-color:var(--red); }
.dce-json.meta { border-left-color:var(--purple); } .dce-json.info { border-left-color:var(--text-muted); }
.dce-why { font-size:12px; color:var(--text-secondary); line-height:1.55; background:var(--bg-2); border:1px solid var(--border-default); border-top:none; border-radius:0 0 8px 8px; padding:8px 12px; }
.dce-why b { color:var(--text-primary); text-transform:uppercase; font-size:9.5px; letter-spacing:.05em; }
.dce-badge { display:inline-block; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:999px; margin-bottom:5px; }
.dce-badge.add{background:var(--green-subtle);color:var(--green);} .dce-badge.remove{background:var(--red-subtle);color:var(--red);}
.dce-badge.meta{background:var(--purple-subtle);color:var(--purple);} .dce-badge.info{background:var(--bg-4);color:var(--text-muted);}
</style>
<div class="dce page-enter">
  <div class="dce-wrap">
    <h1 class="dce-h1">Commit Explorer</h1>
    <p class="dce-lead">A commit is just a list of <strong>actions</strong>. Every operation — no matter how complex — reduces to
      add / remove / metaData / protocol / commitInfo records applied atomically. Pick an operation to dissect its commit.</p>
    <div class="dce-tabs">${tabs}</div>
    <div class="dce-title" id="dce-title"></div>
    <div id="dce-body"></div>
  </div>
</div>`;
  }

  function renderSpec(root, k) {
    const spec = SPECS[k];
    root.querySelector('#dce-title').textContent = spec.title;
    root.querySelector('#dce-body').innerHTML = spec.actions.map(a =>
      `<div class="dce-action">
        <span class="dce-badge ${a.c}">${a.k}</span>
        <div class="dce-json ${a.c}">${esc(a.j)}</div>
        <div class="dce-why"><b>Why:</b> ${a.why}</div>
      </div>`).join('');
    root.querySelectorAll('.dce-tab').forEach(t => t.classList.toggle('active', t.dataset.k === k));
  }

  TV.registerModule('delta', {
    id: 'commit-explorer', title: 'Commit Explorer', group: 'log', format: 'delta',
    render(container) {
      container.className = '';
      container.innerHTML = html();
      const root = container.querySelector('.dce');
      root.querySelectorAll('.dce-tab').forEach(t => t.addEventListener('click', () => renderSpec(root, t.dataset.k)));
      renderSpec(root, 'merge');
    },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
