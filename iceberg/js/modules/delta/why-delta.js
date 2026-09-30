/* ============================================================
   Delta Lake — Why Delta Lake?
   Reading module: the production problems Delta solves, recast as
   ShopKart incidents. Scrolls via the .page-enter bridge.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const INCIDENTS = [
    { tag: 'No ACID', sev: 'red', title: 'Black Friday write corruption',
      problem: 'Two Spark jobs wrote the same partition of plain Parquet-on-S3 at once; a half-written listing corrupted the table and 4 hours of orders were lost.',
      fix: 'Optimistic concurrency control + atomic log commit', how: 'Each writer stages files, then commits by atomically creating the next version’s JSON in _delta_log. If two race for version N, one wins and the other retries against N — readers only ever see committed snapshots.' },
    { tag: 'No schema evolution', sev: 'orange', title: '11-hour schema-change outage',
      problem: 'Adding a fulfilment_status column meant rewriting 847 files; the job ran 11 hours and the table was unreadable throughout.',
      fix: 'Metadata-only ALTER TABLE ADD COLUMN', how: 'Delta records the new column in a metaData action — milliseconds, no data rewrite. Column mapping lets existing files stay untouched while readers see the new schema.' },
    { tag: 'Small files', sev: 'yellow', title: 'Dashboards slowed to a crawl',
      problem: 'Millions of tiny streaming files made every query spend its time opening files instead of reading rows.',
      fix: 'OPTIMIZE bin-packing + ZORDER', how: 'OPTIMIZE rewrites many small files into right-sized ones (remove + add in one commit); ZORDER BY co-locates related rows so per-file min/max stats skip far more data.' },
    { tag: 'History cost', sev: 'purple', title: 'Reader latency crept up as history grew',
      problem: 'After tens of thousands of commits, opening the table meant replaying the entire JSON history from version 0.',
      fix: 'Checkpoints', how: 'Every 10 commits Delta writes a Parquet checkpoint of cumulative state. Readers load the latest checkpoint and replay only the handful of commits after it.' },
  ];

  function html() {
    const cards = INCIDENTS.map(i => `
      <div class="dwd-card">
        <div class="dwd-top">
          <span class="dwd-badge dwd-${i.sev}">${i.tag}</span>
          <h3>${i.title}</h3>
        </div>
        <p class="dwd-prob"><strong>What happened.</strong> ${i.problem}</p>
        <div class="dwd-fix">
          <div class="dwd-fixlabel">Delta fix — ${i.fix}</div>
          <p>${i.how}</p>
        </div>
      </div>`).join('');
    return `
<style>
.dwd { height:100%; overflow-y:auto; padding:32px 32px 64px; }
.dwd-wrap { max-width:900px; margin:0 auto; }
.dwd-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.dwd-h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:12px; }
.dwd-lead { font-size:15px; color:var(--text-secondary); line-height:1.7; margin-bottom:28px; max-width:720px; }
.dwd-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
.dwd-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:18px; }
.dwd-top { display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
.dwd-top h3 { font-size:15.5px; font-weight:700; color:var(--text-primary); }
.dwd-badge { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; padding:3px 8px; border-radius:999px; }
.dwd-red{background:var(--red-subtle);color:var(--red);} .dwd-orange{background:var(--orange-subtle);color:var(--orange);}
.dwd-yellow{background:var(--yellow-subtle);color:var(--yellow);} .dwd-purple{background:var(--purple-subtle);color:var(--purple);}
.dwd-prob { font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:12px; }
.dwd-prob strong, .dwd-fix strong { color:var(--text-primary); }
.dwd-fix { background:var(--bg-1); border-left:3px solid var(--green); border-radius:8px; padding:10px 12px; }
.dwd-fixlabel { font-size:11px; font-weight:800; color:var(--green); text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px; }
.dwd-fix p { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dwd-tablewrap { margin-top:30px; overflow-x:auto; }
.dwd-table { width:100%; border-collapse:collapse; font-size:13px; min-width:520px; }
.dwd-table th, .dwd-table td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border-default); }
.dwd-table th { font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; }
.dwd-table td:first-child { color:var(--text-secondary); }
.dwd-table td:last-child { color:var(--text-primary); font-weight:500; }
</style>
<div class="dwd page-enter">
  <div class="dwd-wrap">
    <div class="dwd-eyebrow">Why Delta Lake?</div>
    <h1 class="dwd-h1">A transaction log turns object storage into a real table</h1>
    <p class="dwd-lead">Plain Parquet-on-S3 has no atomicity, no safe schema change, no history. Delta Lake adds a
      transaction log — ordered JSON commits plus periodic checkpoints — that delivers ACID, schema evolution, data
      skipping and time travel over the same immutable files. Here are four ShopKart incidents it prevents.</p>
    <div class="dwd-grid">${cards}</div>
    <div class="dwd-tablewrap">
      <table class="dwd-table">
        <thead><tr><th>Plain Parquet on S3</th><th>With Delta Lake</th></tr></thead>
        <tbody>
          <tr><td>Concurrent writes can corrupt the table</td><td>Atomic log commits + optimistic concurrency</td></tr>
          <tr><td>Schema change = rewrite every file</td><td>Metadata-only ALTER via a metaData action</td></tr>
          <tr><td>No history / no rollback</td><td>Time travel by VERSION or TIMESTAMP AS OF</td></tr>
          <tr><td>Full scans read every file</td><td>Data skipping from per-file min/max stats in the log</td></tr>
          <tr><td>Deletes rewrite whole files</td><td>Deletion vectors mark rows (merge-on-read)</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`;
  }

  TV.registerModule('delta', {
    id: 'why-delta', title: 'Why Delta Lake?', group: 'start', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
