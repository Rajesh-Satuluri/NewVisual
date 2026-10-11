/* ============================================================
   Cloud DE Visualizer — Visualizers screen (Phase 5).

   A gallery of interactive, step-through conceptual visualizers
   (built on TV.Viz). Selecting one opens its player in place; a
   back control returns to the gallery. Registered on every format
   under "Learn"; the gallery lists whichever visualizers have been
   registered on TV.Viz, so later iterations add visualizers with no
   change here.

   Every visualizer is explicitly an EXPLANATORY SIMULATION — the
   player renders a prominent "Conceptual" disclaimer. Nothing here
   connects to a live cluster or cloud.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  let selected = null; // id of open visualizer, or null for the gallery

  function ensureStyles() {
    if (document.getElementById('vizview-styles')) return;
    const el = document.createElement('style');
    el.id = 'vizview-styles';
    el.textContent = `
.vzv { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.vzv-wrap { max-width:920px; margin:0 auto; }
.vzv-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.vzv-h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; }
.vzv-sub { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:720px; }
.vzv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
.vzv-card { text-align:left; cursor:pointer; background:var(--bg-2); border:1px solid var(--border-default); border-radius:12px; padding:16px 17px; font:inherit; transition:border-color .12s, transform .12s, box-shadow .12s; }
.vzv-card:hover { border-color:var(--brand); transform:translateY(-2px); box-shadow:var(--lift,0 6px 20px rgba(0,0,0,.18)); }
.vzv-card-name { font-size:15px; font-weight:800; color:var(--text-primary); margin-bottom:5px; }
.vzv-card-sub { font-size:12px; color:var(--text-secondary); line-height:1.55; margin-bottom:10px; }
.vzv-card-meta { display:flex; align-items:center; gap:8px; }
.vzv-card-steps { font-size:11px; font-weight:700; color:var(--text-muted); }
.vzv-card-sim { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#b45309; background:color-mix(in srgb,#f59e0b 13%,transparent); border:1px solid color-mix(in srgb,#f59e0b 40%,transparent); padding:2px 7px; border-radius:999px; }
:root[data-theme="dark"] .vzv-card-sim, :root:not([data-theme="light"]) .vzv-card-sim { color:#fcd34d; }
.vzv-back { cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary); font:inherit; font-size:13px; font-weight:700; padding:6px 13px; border-radius:9px; margin-bottom:16px; }
.vzv-back:hover { border-color:var(--brand); color:var(--text-primary); }
.vzv-empty { border:1px dashed var(--border-default); border-radius:12px; padding:28px; text-align:center; color:var(--text-muted); font-size:14px; }
`;
    document.head.appendChild(el);
  }

  function renderGallery(container) {
    const items = (TV.Viz && TV.Viz.list()) || [];
    const cards = items.map(v =>
      `<button type="button" class="vzv-card" data-viz-open="${esc(v.id)}">
         <div class="vzv-card-name">${esc(v.title)}</div>
         <div class="vzv-card-sub">${esc(v.subtitle || '')}</div>
         <div class="vzv-card-meta">
           <span class="vzv-card-steps">${(v.steps || []).length} steps</span>
           <span class="vzv-card-sim">Conceptual sim</span>
         </div>
       </button>`).join('');
    container.innerHTML = `
<div class="vzv page-enter">
  <div class="vzv-wrap">
    <div class="vzv-eyebrow">Interactive</div>
    <h1 class="vzv-h1">Visualizers</h1>
    <p class="vzv-sub">Step-through, interactive explanations of how the core engines actually behave — DAGs, shuffles, transactions, and more. Each one is a conceptual simulation that runs in your browser, not a connection to a live cluster or cloud.</p>
    ${items.length ? `<div class="vzv-grid">${cards}</div>` : `<div class="vzv-empty">No visualizers registered yet.</div>`}
  </div>
</div>`;
    container.querySelectorAll('[data-viz-open]').forEach(btn =>
      btn.addEventListener('click', () => { selected = btn.getAttribute('data-viz-open'); renderInto(container); }));
  }

  function renderPlayer(container, id) {
    const spec = TV.Viz && TV.Viz.get(id);
    if (!spec) { selected = null; return renderGallery(container); }
    container.innerHTML = `
<div class="vzv page-enter">
  <div class="vzv-wrap">
    <button type="button" class="vzv-back" data-viz-back>← All visualizers</button>
    <div data-viz-host></div>
  </div>
</div>`;
    const host = container.querySelector('[data-viz-host]');
    TV.Viz.player(spec, host);
    container.querySelector('[data-viz-back]').addEventListener('click', () => { selected = null; renderInto(container); });
  }

  function renderInto(container) {
    ensureStyles();
    container.className = '';
    if (selected) renderPlayer(container, selected);
    else renderGallery(container);
  }

  function render(container) { renderInto(container); }
  function destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); }

  const MODULE = { id: 'visualizers', title: 'Visualizers', group: 'overview', render, destroy };
  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      const item = { id: 'visualizers', label: 'Visualizers', icon: 'activity', available: true };
      const grp = desc.navGroups.find(g => g.id === 'overview');
      if (grp) { if (!grp.items.some(it => it.id === 'visualizers')) grp.items.push(item); }
      else desc.navGroups.unshift({ id: 'overview', label: 'Overview', items: [item] });
    });
  }

  register();
  TV.VisualizersView = { register, render, destroy };
})();
