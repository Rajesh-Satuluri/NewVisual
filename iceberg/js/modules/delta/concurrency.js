/* Delta Lake — Concurrency (OCC + isolation levels), reading/static */
(function () {
  'use strict';
  const TV = window.TableViz;
  function html() {
    return `
<style>
.dco { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dco-wrap { max-width:900px; margin:0 auto; }
.dco-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dco-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:22px; }
.dco-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:24px 0 10px; }
.dco-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:8px; }
@media (max-width:720px){ .dco-grid{grid-template-columns:1fr;} }
.dco-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px; }
.dco-card h3 { font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
.dco-card p { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dco-tablewrap { overflow-x:auto; }
.dco-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:560px; }
.dco-table th, .dco-table td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border-default); }
.dco-table th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; }
.dco-table td:first-child { color:var(--text-secondary); font-weight:600; }
.dco-ok { color:var(--green); font-weight:700; } .dco-no { color:var(--red); font-weight:700; }
.dco-callout { margin-top:18px; padding:12px 14px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:8px; font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dco-callout b { color:var(--text-primary); }
</style>
<div class="dco page-enter">
  <div class="dco-wrap">
    <h1 class="dco-h1">Concurrency — Optimistic Concurrency Control</h1>
    <p class="dco-lead">Delta never locks the table up front. Writers work optimistically and resolve conflicts at commit time:
      read a snapshot, do the work, then attempt an atomic commit at the next version. If another writer got there first, Delta
      checks whether the two changes actually conflict — and retries if they don’t.</p>

    <div class="dco-sec">Isolation levels</div>
    <div class="dco-grid">
      <div class="dco-card"><h3>WriteSerializable (default)</h3><p>Writes are serializable with respect to each other. Blind appends
        that don’t read the table can commit concurrently even if their logical order is ambiguous — the common, faster default.</p></div>
      <div class="dco-card"><h3>Serializable (strictest)</h3><p>Every operation — reads and writes — behaves as if executed in some
        serial order. Set per-table when you need the strongest guarantee (e.g. read-modify-write invariants).</p></div>
    </div>

    <div class="dco-sec">Does it conflict?</div>
    <div class="dco-tablewrap">
      <table class="dco-table">
        <thead><tr><th>Concurrent pair</th><th>Outcome</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>append + append</td><td class="dco-ok">✓ both commit</td><td>Disjoint new files; nothing read is invalidated.</td></tr>
          <tr><td>append + OPTIMIZE</td><td class="dco-ok">✓ retry wins</td><td>Compaction touches different files; the append retries onto the new version.</td></tr>
          <tr><td>DELETE + DELETE (same files)</td><td class="dco-no">✗ conflict</td><td>Both remove the same file — one wins, the other must re-run.</td></tr>
          <tr><td>MERGE + UPDATE (same partition)</td><td class="dco-no">✗ conflict</td><td>Overlapping row rewrites can’t both be applied blindly.</td></tr>
          <tr><td>OPTIMIZE + DELETE (same files)</td><td class="dco-no">✗ conflict</td><td>Compaction and deletion race on the same files.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="dco-callout"><b>ShopKart Black Friday, solved.</b> Two Spark jobs writing the same partition used to corrupt plain
      Parquet. With Delta, the losing writer’s create-if-absent for that version simply fails; it re-reads, confirms its files
      don’t overlap, and commits at the next version. No corruption, no lost data — exactly the incident that motivated the move.</div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'concurrency', title: 'Concurrency (OCC)', group: 'advanced', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
