/* Delta Lake — Version History (interactive, static) */
(function () {
  'use strict';
  const TV = window.TableViz;

  const VERS = [
    { v: 849, op: 'OPTIMIZE', ts: '2024-01-24 02:00', m: { numRemovedFiles: 24210, numAddedFiles: 9640, zOrderBy: 'country, order_date' }, note: 'Bin-packing + Z-ORDER compacted 24,210 small files into 9,640 larger ones — dashboards sped up 6×.' },
    { v: 848, op: 'WRITE', ts: '2024-01-23 00:00', m: { numFiles: 210, numOutputRows: 842000, mode: 'Append' }, note: 'Nightly streaming append of the previous day’s orders.' },
    { v: 847, op: 'MERGE', ts: '2024-01-22 06:12', m: { numTargetRowsUpdated: 9200, numTargetRowsInserted: 4100 }, note: 'CDC upsert from the OLTP system.' },
    { v: 846, op: 'OVERWRITE ⚠', ts: '2024-01-21 14:03', m: { numRemovedFiles: 24000, numAddedFiles: 19880 }, note: 'Accidental full overwrite with a bad extract — rolled back via RESTORE the same day.' },
    { v: 845, op: 'DELETE', ts: '2024-01-20 09:40', m: { numDeletedRows: 1830, numRemovedFiles: 0, deletionVectors: 1 }, note: 'Fraud cleanup using a deletion vector — no files rewritten.' },
  ];

  function metrics(m) {
    return Object.entries(m).map(([k, v]) =>
      `<div class="dve-m"><span>${k}</span><b>${typeof v === 'number' ? v.toLocaleString() : v}</b></div>`).join('');
  }

  function html() {
    const rows = VERS.map((V, i) => {
      const bad = V.op.indexOf('⚠') >= 0;
      return `<button class="dve-row${i === 0 ? ' active' : ''}${bad ? ' bad' : ''}" data-i="${i}" type="button">
        <span class="dve-v">v${V.v}</span><span class="dve-op">${V.op}</span><span class="dve-ts">${V.ts}</span></button>`;
    }).join('');
    return `
<style>
.dve { height:100%; overflow-y:auto; padding:28px 32px 60px; }
.dve-wrap { max-width:1000px; margin:0 auto; }
.dve-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:6px; }
.dve-lead { font-size:13.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:20px; max-width:720px; }
.dve-lead code { font-family:var(--font-mono); font-size:12px; color:var(--brand); background:var(--bg-3); padding:2px 6px; border-radius:5px; }
.dve-cols { display:grid; grid-template-columns:minmax(280px,360px) 1fr; gap:16px; align-items:start; }
@media (max-width:760px){ .dve-cols{ grid-template-columns:1fr; } }
.dve-list { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); overflow:hidden; }
.dve-row { width:100%; display:flex; align-items:center; gap:10px; padding:11px 14px; background:none; border:none; border-left:3px solid transparent; text-align:left; cursor:pointer; }
.dve-row:hover { background:var(--bg-3); }
.dve-row.active { background:var(--brand-glow); border-left-color:var(--brand); }
.dve-v { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-primary); width:44px; }
.dve-op { font-size:11px; font-weight:700; color:var(--text-secondary); flex:1; }
.dve-row.bad .dve-op { color:var(--red); }
.dve-ts { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); }
.dve-detail { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:18px; min-height:260px; }
.dve-dh { font-family:var(--font-mono); font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:4px; }
.dve-dts { font-size:11px; color:var(--text-muted); margin-bottom:14px; }
.dve-mgrid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
.dve-m { background:var(--bg-1); border:1px solid var(--border-default); border-radius:8px; padding:8px 10px; }
.dve-m span { display:block; font-size:9.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); margin-bottom:3px; }
.dve-m b { font-family:var(--font-mono); font-size:13px; color:var(--text-primary); }
.dve-note { font-size:12.5px; color:var(--text-secondary); line-height:1.6; padding:10px 12px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:8px; }
</style>
<div class="dve page-enter">
  <div class="dve-wrap">
    <h1 class="dve-h1">Version History</h1>
    <p class="dve-lead"><code>DESCRIBE HISTORY orders</code> reads the commitInfo of every commit. Each version records its
      operation and <strong>operationMetrics</strong> — the audit trail that powers time travel, rollback, and lineage. Click a version.</p>
    <div class="dve-cols">
      <div class="dve-list">${rows}</div>
      <div class="dve-detail" id="dve-detail"></div>
    </div>
  </div>
</div>`;
  }

  function renderDetail(root, i) {
    const V = VERS[i];
    root.querySelector('#dve-detail').innerHTML =
      `<div class="dve-dh">version ${V.v} · ${V.op.replace(' ⚠', '')}</div>
       <div class="dve-dts">${V.ts} UTC</div>
       <div class="dve-mgrid">${metrics(V.m)}</div>
       <div class="dve-note">${V.note}</div>`;
    root.querySelectorAll('.dve-row').forEach((el, j) => el.classList.toggle('active', j === i));
  }

  TV.registerModule('delta', {
    id: 'version-explorer', title: 'Version History', group: 'log', format: 'delta',
    render(container) {
      container.className = '';
      container.innerHTML = html();
      const root = container.querySelector('.dve');
      root.querySelectorAll('.dve-row').forEach(b => b.addEventListener('click', () => renderDetail(root, parseInt(b.dataset.i, 10))));
      renderDetail(root, 0);
      const cols = root.querySelector('.dve-cols');
      if (cols && TV.SplitPane) {
        this._split = TV.SplitPane.attach(cols, {
          key: 'delta/version-explorer',
          disableBelow: 760,
          tracks: [
            { min: 220, max: 520, def: 320 },  // version list
            { flex: true, min: 300 },          // version detail
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
