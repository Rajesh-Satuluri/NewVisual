/* ============================================================
   CompareKit — shared scaffold for Compare-mode modules.
   Provides the dual-tinted side-by-side layout (Iceberg blue |
   Delta amber), shared CSS, and a data-driven conceptModule()
   that renders one concept from TV.CompareData.concepts.

   These are reading pages (page-level scroll), never animation
   roots — so no height:100%/overflow:hidden constraint applies.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('cmp-styles')) return;
    const s = document.createElement('style');
    s.id = 'cmp-styles';
    s.textContent = `
.cmp-page { height:100%; overflow-y:auto; padding:28px 30px 64px; }
.cmp-wrap { max-width:1040px; margin:0 auto; }
.cmp-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.cmp-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 24px; max-width:820px; }
.cmp-cols { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.cmp-cols.cmp-cols--2 { grid-template-columns:1fr 1fr; }
.cmp-col { border:1px solid var(--border-default); border-radius:var(--radius-lg); background:var(--bg-2); overflow:hidden; }
.cmp-col__head { padding:12px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border-default); }
.cmp-col__badge { width:22px; height:22px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.cmp-col__title { font-size:14px; font-weight:800; letter-spacing:-.01em; }
.cmp-col--ice .cmp-col__head { background:linear-gradient(180deg, rgba(74,174,255,.12), transparent); }
.cmp-col--ice .cmp-col__title { color:#5ab0ff; }
.cmp-col--ice .cmp-col__badge { background:rgba(74,174,255,.16); }
.cmp-col--delta .cmp-col__head { background:linear-gradient(180deg, rgba(255,90,60,.12), transparent); }
.cmp-col--delta .cmp-col__title { color:#ff8a5c; }
.cmp-col--delta .cmp-col__badge { background:rgba(255,90,60,.16); }
.cmp-col--hudi .cmp-col__head { background:linear-gradient(180deg, rgba(20,184,166,.12), transparent); }
.cmp-col--hudi .cmp-col__title { color:#2dd4bf; }
.cmp-col--hudi .cmp-col__badge { background:rgba(20,184,166,.16); }
.cmp-col--hudi .cmp-points li::before { background:#14b8a6; }
.cmp-col__body { padding:14px 16px 18px; }
.cmp-points { list-style:none; margin:0 0 14px; padding:0; display:flex; flex-direction:column; gap:9px; }
.cmp-points li { position:relative; padding-left:20px; font-size:12.5px; color:var(--text-secondary); line-height:1.55; }
.cmp-points li::before { content:''; position:absolute; left:4px; top:7px; width:7px; height:7px; border-radius:2px; }
.cmp-col--ice   .cmp-points li::before { background:#4aaeff; }
.cmp-col--delta .cmp-points li::before { background:#ff5a3c; }
.cmp-code { font-family:var(--font-mono); font-size:11px; line-height:1.65; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-subtle); border-radius:8px; padding:11px 13px; white-space:pre; overflow-x:auto; }
.cmp-takeaway { margin-top:18px; display:flex; gap:12px; align-items:flex-start; padding:14px 16px; background:var(--bg-1); border:1px solid var(--border-default); border-left:3px solid var(--brand-2); border-radius:0 10px 10px 0; }
.cmp-takeaway__icon { flex-shrink:0; width:26px; height:26px; border-radius:50%; background:var(--brand-glow); display:flex; align-items:center; justify-content:center; color:var(--brand-2); }
.cmp-takeaway__txt { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.cmp-takeaway__txt b { color:var(--text-primary); }
.cmp-jump { margin-top:22px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.cmp-jump__label { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:700; margin-right:2px; }
.cmp-jump a { font-size:11.5px; padding:5px 11px; border-radius:var(--radius-full); border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary); text-decoration:none; }
.cmp-jump a:hover { border-color:var(--brand); color:var(--text-primary); }

/* Overview matrix */
.cmp-matrix-wrap { overflow-x:auto; border:1px solid var(--border-default); border-radius:var(--radius-lg); }
.cmp-matrix { width:100%; border-collapse:collapse; font-size:12.5px; min-width:880px; }
.cmp-matrix th { text-align:left; padding:12px 14px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; background:var(--bg-3); border-bottom:1px solid var(--border-default); position:sticky; top:0; }
.cmp-matrix th.cmp-th-dim { color:var(--text-muted); width:14%; }
.cmp-matrix th.cmp-th-ice { color:#5ab0ff; }
.cmp-matrix th.cmp-th-delta { color:#ff8a5c; }
.cmp-matrix th.cmp-th-hudi { color:#2dd4bf; }
.cmp-matrix td.cmp-td-hudi { border-left:2px solid rgba(20,184,166,.35); }
.cmp-matrix td { padding:11px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-secondary); line-height:1.5; vertical-align:top; }
.cmp-matrix td.cmp-td-dim { font-weight:700; color:var(--text-primary); white-space:nowrap; }
.cmp-matrix tr:last-child td { border-bottom:none; }
.cmp-matrix tbody tr:hover td { background:var(--bg-2); }
.cmp-matrix td.cmp-td-ice { border-left:2px solid rgba(74,174,255,.35); }
.cmp-matrix td.cmp-td-delta { border-left:2px solid rgba(255,90,60,.35); }

@media (max-width:1000px) { .cmp-cols { grid-template-columns:1fr; } }
`;
    document.head.appendChild(s);
  }

  const ICE_MARK = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><polygon points="12,3 21,20 3,20" fill="#4aaeff"/></svg>`;
  const DELTA_MARK = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><polygon points="12,3 21,20 3,20" fill="#ff5a3c"/></svg>`;
  const HUDI_MARK = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" fill="#14b8a6"/></svg>`;
  const BULB = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0012 2z"/></svg>`;

  function esc(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  // Cross-link chips to the other concept screens.
  function jumpLinks(currentId) {
    const c = TV.CompareData.concepts;
    const ids = Object.keys(c).filter(id => id !== currentId);
    return `<div class="cmp-jump"><span class="cmp-jump__label">Compare more</span>${
      ids.map(id => `<a href="#compare/${id}">${esc(c[id].title)}</a>`).join('')
    }</div>`;
  }

  function side(kind, data) {
    const mark = kind === 'ice' ? ICE_MARK : (kind === 'delta' ? DELTA_MARK : HUDI_MARK);
    const title = kind === 'ice' ? 'Apache Iceberg' : (kind === 'delta' ? 'Delta Lake' : 'Apache Hudi');
    return `
      <div class="cmp-col cmp-col--${kind}">
        <div class="cmp-col__head"><span class="cmp-col__badge">${mark}</span><span class="cmp-col__title">${title}</span></div>
        <div class="cmp-col__body">
          <ul class="cmp-points">${data.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
          ${data.code ? `<div class="cmp-code">${esc(data.code)}</div>` : ''}
        </div>
      </div>`;
  }

  function conceptModule(id) {
    const mod = {
      id, format: 'compare', group: 'deep',
      title: (TV.CompareData.concepts[id] || {}).title || id,
      render(container) {
        injectStyles();
        const c = TV.CompareData.concepts[id];
        container.className = '';
        if (!c) { container.innerHTML = `<div style="padding:40px;color:var(--text-muted)">Comparison not found.</div>`; return; }
        container.innerHTML = `
<div class="cmp-page page-enter">
  <div class="cmp-wrap">
    <h1 class="cmp-h1">${esc(c.title)}</h1>
    <p class="cmp-lead">${esc(c.intro)}</p>
    <div class="cmp-cols${c.hudi ? '' : ' cmp-cols--2'}">
      ${side('ice', c.iceberg)}
      ${side('delta', c.delta)}
      ${c.hudi ? side('hudi', c.hudi) : ''}
    </div>
    <div class="cmp-takeaway">
      <span class="cmp-takeaway__icon">${BULB}</span>
      <span class="cmp-takeaway__txt"><b>Bottom line —</b> ${esc(c.takeaway)}</span>
    </div>
    ${jumpLinks(id)}
  </div>
</div>`;
      },
      destroy() { TV.AnimationControls.hide(); },
    };
    TV.registerModule('compare', mod);
    return mod;
  }

  TV.CompareKit = { injectStyles, esc, side, jumpLinks, conceptModule, ICE_MARK, DELTA_MARK, HUDI_MARK, BULB };
})();
