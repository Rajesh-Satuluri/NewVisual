/* Delta Lake — VACUUM (physical cleanup), reading/static */
(function () {
  'use strict';
  const TV = window.TableViz;
  function html() {
    return `
<style>
.dv2 { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dv2-wrap { max-width:880px; margin:0 auto; }
.dv2-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dv2-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:22px; }
.dv2-legend { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:12px; font-size:11.5px; color:var(--text-secondary); }
.dv2-dot { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:middle; }
.dv2-files { display:grid; grid-template-columns:repeat(auto-fill,minmax(84px,1fr)); gap:8px; margin-bottom:8px; }
.dv2-f { border-radius:8px; padding:12px 8px; text-align:center; font-family:var(--font-mono); font-size:9.5px; border:1px solid; }
.dv2-f.live { background:#0a1f10; border-color:#3fb950; color:#7ee787; }
.dv2-f.keep { background:#1a1408; border-color:#e3b341; color:#e3b341; }
.dv2-f.gone { background:#1a1010; border-color:#f85149; color:#f8a49f; text-decoration:line-through; }
.dv2-code { font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; margin:16px 0; }
.dv2-code .k { color:var(--brand); font-weight:600; } .dv2-code .c { color:var(--text-muted); }
.dv2-warn { padding:12px 14px; background:var(--bg-1); border-left:3px solid var(--red); border-radius:8px; font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dv2-warn b { color:var(--text-primary); }
.dv2-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:22px 0 10px; }
</style>
<div class="dv2 page-enter">
  <div class="dv2-wrap">
    <h1 class="dv2-h1">VACUUM</h1>
    <p class="dv2-lead">Every UPDATE, DELETE, MERGE and OPTIMIZE tombstones old files rather than erasing them — that’s what makes
      time travel and rollback possible. Those files still cost storage. <strong>VACUUM</strong> permanently deletes tombstoned
      files that are older than the retention window and no longer referenced by any live version.</p>

    <div class="dv2-sec">Files on disk</div>
    <div class="dv2-legend">
      <span><span class="dv2-dot" style="background:#3fb950"></span>live (referenced)</span>
      <span><span class="dv2-dot" style="background:#e3b341"></span>tombstoned, within retention — kept</span>
      <span><span class="dv2-dot" style="background:#f85149"></span>tombstoned, past retention — VACUUM deletes</span>
    </div>
    <div class="dv2-files">
      <div class="dv2-f live">part-70<br>live</div><div class="dv2-f live">part-71<br>live</div>
      <div class="dv2-f live">part-80<br>live</div><div class="dv2-f keep">part-49<br>2d old</div>
      <div class="dv2-f keep">part-51<br>5d old</div><div class="dv2-f gone">part-07<br>19d old</div>
      <div class="dv2-f gone">part-02<br>26d old</div><div class="dv2-f gone">part-a<br>31d old</div>
    </div>

    <div class="dv2-code"><span class="c">-- default retention is 7 days</span>
<span class="k">VACUUM</span> orders;                       <span class="c">-- delete files &gt; 7 days tombstoned</span>
<span class="k">VACUUM</span> orders <span class="k">RETAIN</span> 168 <span class="k">HOURS</span>;      <span class="c">-- explicit window</span>
<span class="k">VACUUM</span> orders <span class="k">DRY RUN</span>;               <span class="c">-- list what would be deleted</span></div>

    <div class="dv2-sec">The trade-off</div>
    <div class="dv2-warn"><b>VACUUM caps how far back you can time travel.</b> Once a file is vacuumed, any version that referenced
      it can no longer be read. The default 7-day window balances storage against recoverability — never shrink it below your
      longest-running readers or your rollback needs. Delta refuses a retention below 7 days unless you explicitly override the
      safety check.</div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'vacuum', title: 'VACUUM', group: 'advanced', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
