/* ============================================================
   Delta Lake — Home (landing)
   Self-contained; scoped .dhome-* styles; brand tokens so it
   recolors red→amber automatically. Cards use [data-nav] to
   navigate within the active (Delta) format.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const D = () => TV.Data;

  function html() {
    const s = D().shopkart.stats;
    return `
<style>
.dhome { height:100%; overflow-y:auto; }
.dhome-hero {
  position:relative; text-align:center; padding:64px 32px 48px;
  background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-1) 100%);
  border-bottom:1px solid var(--border-default); overflow:hidden;
}
.dhome-hero::before { content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 80% 60% at 50% 0%, var(--brand-glow) 0%, transparent 70%); opacity:.5; }
.dhome-eyebrow { position:relative; display:inline-flex; align-items:center; gap:8px; padding:6px 14px;
  border:1px solid var(--border-default); border-radius:999px; font-size:11px; font-weight:700;
  letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin-bottom:20px; background:var(--bg-2); }
.dhome-logo { margin-bottom:18px; }
.dhome-h1 { position:relative; font-size:clamp(30px,5vw,52px); font-weight:800; letter-spacing:-.03em; line-height:1.1; margin-bottom:16px; color:var(--text-primary); }
.dhome-h1 .grad { background:var(--brand-gradient); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.dhome-sub { position:relative; max-width:600px; margin:0 auto 28px; font-size:clamp(14px,1.8vw,18px); color:var(--text-secondary); line-height:1.65; }
.dhome-cta { position:relative; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:40px; }
.dhome-cta .btn-primary, .dhome-cta .btn-secondary { padding:11px 22px; font-size:14px; font-weight:600; border-radius:var(--radius); }
.dhome-stats { position:relative; display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
.dhome-stat { text-align:center; }
.dhome-stat b { display:block; font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; }
.dhome-stat.c1 b{color:var(--purple);} .dhome-stat.c2 b{color:var(--orange);} .dhome-stat.c3 b{color:var(--green);} .dhome-stat.c4 b{color:var(--brand);} .dhome-stat.c5 b{color:var(--yellow);}
.dhome-stat span { display:block; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-top:4px; }
.dhome-body { padding:44px 32px 64px; max-width:1080px; margin:0 auto; }
.dhome-sech { text-align:center; margin-bottom:8px; font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); }
.dhome-sec2 { text-align:center; font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:28px; }
.dhome-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
.dhome-card { text-align:left; background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:18px 18px 16px; cursor:pointer; }
.dhome-card h3 { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
.dhome-card p { font-size:12.5px; color:var(--text-secondary); line-height:1.55; }
.dhome-ic { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;
  background:var(--brand-glow); color:var(--brand); font-size:17px; }
</style>
<div class="dhome page-enter">
  <div class="dhome-hero">
    <div class="dhome-eyebrow">🔺 Interactive Learning Platform</div>
    <div class="dhome-logo">
      <svg viewBox="0 0 40 40" width="60" height="60" fill="none" aria-hidden="true">
        <defs><linearGradient id="dh-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff5a3c"/><stop offset="100%" stop-color="#ffb020"/></linearGradient></defs>
        <polygon points="20,4 36,34 4,34" fill="url(#dh-g)" opacity=".92"/>
        <polygon points="20,14 28,30 12,30" fill="var(--bg-1)" opacity=".55"/>
      </svg>
    </div>
    <h1 class="dhome-h1">Master Delta Lake <span class="grad">Visually</span></h1>
    <p class="dhome-sub">An interactive, animation-driven tour of Delta Lake's transaction log — commits, checkpoints,
      data skipping, deletion vectors, OPTIMIZE and time travel — through the lens of the ShopKart Global E-Commerce lakehouse.</p>
    <div class="dhome-cta">
      <button class="btn-primary" data-nav="architecture">▶ Start Learning</button>
      <button class="btn-secondary" data-nav="why-delta">Why Delta Lake?</button>
    </div>
    <div class="dhome-stats">
      <div class="dhome-stat c1"><b>${s.customers.replace(' million','M')}</b><span>Daily Customers</span></div>
      <div class="dhome-stat c2"><b>${s.ordersPerDay.replace(' million','M')}</b><span>Orders / Day</span></div>
      <div class="dhome-stat c3"><b>${s.dataPerDay}</b><span>New Data / Day</span></div>
      <div class="dhome-stat c4"><b>${s.historicalData}</b><span>Historical Data</span></div>
      <div class="dhome-stat c5"><b>${s.countries}</b><span>Countries</span></div>
    </div>
  </div>
  <div class="dhome-body">
    <div class="dhome-sech">What you'll master</div>
    <div class="dhome-sec2">Every Delta Lake concept, visualized</div>
    <div class="dhome-grid">
      <div class="dhome-card" data-nav="architecture"><div class="dhome-ic">🏛</div><h3>The Transaction Log</h3><p>How the _delta_log — ordered JSON commits + Parquet checkpoints — is the source of truth over immutable Parquet files.</p></div>
      <div class="dhome-card" data-nav="log-explorer"><div class="dhome-ic">📂</div><h3>Explore a Commit</h3><p>Open real commit files and inspect their actions: protocol, metaData, add, remove, commitInfo.</p></div>
      <div class="dhome-card" data-nav="insert"><div class="dhome-ic">⬇</div><h3>Write Operations</h3><p>Watch INSERT, UPDATE, DELETE, MERGE and replaceWhere turn into atomic commits with add/remove actions.</p></div>
      <div class="dhome-card" data-nav="merge"><div class="dhome-ic">🔀</div><h3>MERGE Upserts</h3><p>See matched-update / not-matched-insert resolve into one atomic commit — the workhorse of CDC pipelines.</p></div>
      <div class="dhome-card" data-nav="create-table"><div class="dhome-ic">🧱</div><h3>Table Creation</h3><p>protocol + metaData actions establish version 0 — an empty, fully-typed, transactional table.</p></div>
      <div class="dhome-card" data-nav="why-delta"><div class="dhome-ic">🛡</div><h3>Why Delta Lake?</h3><p>The production incidents Delta prevents — corruption, schema outages, tiny-file slowdowns — and how.</p></div>
    </div>
  </div>
</div>`;
  }

  TV.registerModule('delta', {
    id: 'home', title: 'Home', group: 'start', format: 'delta',
    render(container) {
      container.className = '';
      container.innerHTML = html();   // <style> + <div class="dhome page-enter"> as direct children
    },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
