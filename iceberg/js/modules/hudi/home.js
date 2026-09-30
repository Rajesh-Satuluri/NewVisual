/* ============================================================
   Apache Hudi — Home (landing)
   Self-contained; scoped .hhome-* styles; brand tokens so it
   recolors teal→emerald automatically. Cards use [data-nav].
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const D = () => TV.Data;

  function html() {
    const s = D().shopkart.stats;
    return `
<style>
.hhome { height:100%; overflow-y:auto; }
.hhome-hero { position:relative; text-align:center; padding:64px 32px 48px;
  background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-1) 100%);
  border-bottom:1px solid var(--border-default); overflow:hidden; }
.hhome-hero::before { content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 80% 60% at 50% 0%, var(--brand-glow) 0%, transparent 70%); opacity:.5; }
.hhome-eyebrow { position:relative; display:inline-flex; align-items:center; gap:8px; padding:6px 14px;
  border:1px solid var(--border-default); border-radius:999px; font-size:11px; font-weight:700;
  letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin-bottom:20px; background:var(--bg-2); }
.hhome-logo { margin-bottom:18px; }
.hhome-h1 { position:relative; font-size:clamp(30px,5vw,52px); font-weight:800; letter-spacing:-.03em; line-height:1.1; margin-bottom:16px; color:var(--text-primary); }
.hhome-h1 .grad { background:var(--brand-gradient); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.hhome-sub { position:relative; max-width:620px; margin:0 auto 28px; font-size:clamp(14px,1.8vw,18px); color:var(--text-secondary); line-height:1.65; }
.hhome-cta { position:relative; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:40px; }
.hhome-cta .btn-primary, .hhome-cta .btn-secondary { padding:11px 22px; font-size:14px; font-weight:600; border-radius:var(--radius); }
.hhome-stats { position:relative; display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
.hhome-stat { text-align:center; }
.hhome-stat b { display:block; font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; }
.hhome-stat.c1 b{color:var(--purple);} .hhome-stat.c2 b{color:var(--orange);} .hhome-stat.c3 b{color:var(--green);} .hhome-stat.c4 b{color:var(--brand);} .hhome-stat.c5 b{color:var(--yellow);}
.hhome-stat span { display:block; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-top:4px; }
.hhome-body { padding:44px 32px 64px; max-width:1080px; margin:0 auto; }
.hhome-sech { text-align:center; margin-bottom:8px; font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); }
.hhome-sec2 { text-align:center; font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:28px; }
.hhome-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
.hhome-card { text-align:left; background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:18px 18px 16px; cursor:pointer; }
.hhome-card h3 { font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
.hhome-card p { font-size:12.5px; color:var(--text-secondary); line-height:1.55; }
.hhome-ic { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; background:var(--brand-glow); color:var(--brand); font-size:17px; }
</style>
<div class="hhome page-enter">
  <div class="hhome-hero">
    <div class="hhome-eyebrow">🐦 Interactive Learning Platform</div>
    <div class="hhome-logo">
      <svg viewBox="0 0 40 40" width="60" height="60" fill="none" aria-hidden="true">
        <defs><linearGradient id="hh-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs>
        <rect x="6" y="8"  width="28" height="8" rx="2.5" fill="url(#hh-g)" opacity=".95"/>
        <rect x="6" y="19" width="28" height="5" rx="2" fill="url(#hh-g)" opacity=".55"/>
        <rect x="6" y="27" width="28" height="5" rx="2" fill="url(#hh-g)" opacity=".35"/>
      </svg>
    </div>
    <h1 class="hhome-h1">Master Apache Hudi <span class="grad">Visually</span></h1>
    <p class="hhome-sub">An interactive, animation-driven tour of Apache Hudi — the timeline, Copy-on-Write vs Merge-on-Read,
      file groups &amp; slices, record-level upserts and indexing — through the lens of the ShopKart Global E-Commerce lakehouse.</p>
    <div class="hhome-cta">
      <button class="btn-primary" data-nav="architecture">▶ Start Learning</button>
      <button class="btn-secondary" data-nav="why-hudi">Why Hudi?</button>
    </div>
    <div class="hhome-stats">
      <div class="hhome-stat c1"><b>${s.customers.replace(' million','M')}</b><span>Daily Customers</span></div>
      <div class="hhome-stat c2"><b>${s.ordersPerDay.replace(' million','M')}</b><span>Orders / Day</span></div>
      <div class="hhome-stat c3"><b>${s.dataPerDay}</b><span>New Data / Day</span></div>
      <div class="hhome-stat c4"><b>${s.historicalData}</b><span>Historical Data</span></div>
      <div class="hhome-stat c5"><b>${s.countries}</b><span>Countries</span></div>
    </div>
  </div>
  <div class="hhome-body">
    <div class="hhome-sech">What you'll master</div>
    <div class="hhome-sec2">Every Apache Hudi concept, visualized</div>
    <div class="hhome-grid">
      <div class="hhome-card" data-nav="architecture"><div class="hhome-ic">🏛</div><h3>The Timeline</h3><p>How the .hoodie timeline of instants — commit, deltacommit, compaction, clean — is the source of truth over file groups.</p></div>
      <div class="hhome-card" data-nav="table-types"><div class="hhome-ic">⚖️</div><h3>CoW vs MoR</h3><p>Copy-on-Write rewrites base files; Merge-on-Read appends log files and merges on read. Hudi's defining choice.</p></div>
      <div class="hhome-card" data-nav="upsert"><div class="hhome-ic">🔀</div><h3>Record Upserts</h3><p>Watch an upsert use the index to find the right file group and apply changes — the workhorse of CDC ingestion.</p></div>
      <div class="hhome-card" data-nav="timeline-explorer"><div class="hhome-ic">🕒</div><h3>Explore the Timeline</h3><p>Open real instants and inspect their action, state, and metadata across the table's history.</p></div>
      <div class="hhome-card" data-nav="record-keys"><div class="hhome-ic">🔑</div><h3>Keys & Precombine</h3><p>Record keys, partition paths, and the precombine field that decides the winning version of a record.</p></div>
      <div class="hhome-card" data-nav="why-hudi"><div class="hhome-ic">🛡</div><h3>Why Hudi?</h3><p>The streaming-ingestion problems Hudi solves — fast upserts, incremental pulls, and near-real-time freshness.</p></div>
    </div>
  </div>
</div>`;
  }

  TV.registerModule('hudi', {
    id: 'home', title: 'Home', group: 'start', format: 'hudi',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
