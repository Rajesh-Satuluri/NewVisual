/* ============================================================
   Cloud DE Visualizer — placeholder home for formats that are
   registered in the switcher but not yet built out. Keeps every
   tab clickable and honest ("coming soon") without shipping a
   half-empty nav.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function styleTag() {
    return `
<style id="stub-styles">
.stub { height:100%; overflow-y:auto; display:flex; align-items:center; justify-content:center; padding:32px; }
.stub-card { max-width:560px; text-align:center; }
.stub-badge { display:inline-block; font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
  color:var(--brand); background:var(--brand-glow); border-radius:999px; padding:5px 14px; margin-bottom:18px; }
.stub-card h1 { font-size:30px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 12px; }
.stub-card p { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 auto 20px; max-width:460px; }
.stub-list { text-align:left; display:inline-grid; gap:8px; margin-top:6px; }
.stub-item { display:flex; align-items:center; gap:10px; font-size:13.5px; color:var(--text-secondary); }
.stub-dot { width:7px; height:7px; border-radius:50%; background:var(--brand); flex-shrink:0; }
.stub-cta { margin-top:26px; }
.stub-cta a { display:inline-block; background:var(--brand-gradient); color:#fff; font-weight:700; font-size:13.5px;
  text-decoration:none; padding:10px 20px; border-radius:9px; }
</style>`;
  }

  function register(format, meta) {
    TV.registerModule(format, {
      id: 'home', title: meta.title || 'Coming soon', group: 'overview', format,
      render(container) {
        container.className = '';
        const styles = document.getElementById('stub-styles') ? '' : styleTag();
        const items = (meta.roadmap || []).map(t =>
          `<div class="stub-item"><span class="stub-dot"></span>${t}</div>`).join('');
        container.innerHTML = `${styles}
<div class="stub page-enter">
  <div class="stub-card">
    <span class="stub-badge">Coming soon</span>
    <h1>${meta.title}</h1>
    <p>${meta.subtitle}</p>
    <div class="stub-list">${items}</div>
    ${meta.ctaHref ? `<div class="stub-cta"><a href="${meta.ctaHref}">${meta.ctaLabel || 'Explore what\'s live'}</a></div>` : ''}
  </div>
</div>`;
      },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
  }

  TV.StubHome = { register };
})();
