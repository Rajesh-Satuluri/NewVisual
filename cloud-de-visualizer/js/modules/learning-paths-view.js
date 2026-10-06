/* ============================================================
   Cloud DE Visualizer — "Learning paths" screen (Phase 2 / B2).

   A native screen that renders the curated learning paths as adaptive
   vertical steppers. Each step shows its state (done / active /
   upcoming), the user's current score, a deep link into the content,
   and any weak prerequisites worth shoring up first. Purely a VIEW
   over TV.Recommend.getLearningPaths() — all logic lives in the engine.

   Registered under every cloud at #<cloud>/paths with a "Learning
   paths" item in the existing "For You" sidebar group.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Recommend) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  let _wired = false, _onProgress = null;

  function injectStyles() {
    if (document.getElementById('lp-styles')) return;
    const s = document.createElement('style');
    s.id = 'lp-styles';
    s.textContent = `
.lp-wrap { max-width: 920px; margin:0 auto; padding:8px 4px 48px; }
.lp-head h1 { font-size:22px; font-weight:800; margin:0 0 4px; color:var(--text-primary,#e6edf7); letter-spacing:-.01em; }
.lp-head p { margin:0 0 20px; font-size:13px; color:var(--text-muted,#7e8da8); max-width:620px; line-height:1.55; }
.lp-path { background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:14px; padding:18px 20px; margin-bottom:16px; }
.lp-path-top { display:flex; align-items:flex-start; gap:12px; margin-bottom:6px; }
.lp-ic { flex-shrink:0; width:34px; height:34px; border-radius:9px; background:var(--brand-glow,rgba(88,166,255,.12)); color:var(--brand,#58a6ff); display:flex; align-items:center; justify-content:center; }
.lp-ic svg { width:18px; height:18px; }
.lp-path-main { flex:1; min-width:0; }
.lp-path-title { font-size:16px; font-weight:800; color:var(--text-primary,#e6edf7); margin:0; }
.lp-path-goal { font-size:13px; color:var(--text-muted,#7e8da8); margin:3px 0 0; line-height:1.55; }
.lp-prog { display:flex; align-items:center; gap:10px; margin:12px 0 16px; }
.lp-prog-bar { flex:1; height:7px; background:var(--bg-4,#223047); border-radius:5px; overflow:hidden; }
.lp-prog-fill { height:100%; background:var(--green,#3fb950); border-radius:5px; transition:width .5s var(--ease,ease); }
.lp-prog-txt { font-size:12px; font-weight:700; color:var(--text-muted,#7e8da8); white-space:nowrap; }
.lp-cta { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:7px 14px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
.lp-steps { list-style:none; margin:0; padding:0; position:relative; }
.lp-step { display:flex; gap:13px; padding:9px 0; position:relative; }
.lp-step::before { content:''; position:absolute; left:12px; top:0; bottom:0; width:2px; background:var(--border-default,#223047); }
.lp-step:first-child::before { top:14px; }
.lp-step:last-child::before { bottom:calc(100% - 14px); }
.lp-dot { position:relative; z-index:1; flex-shrink:0; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:800; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); border:2px solid var(--bg-2,#131b2b); }
.lp-dot.done { background:var(--green,#3fb950); color:#fff; }
.lp-dot.active { background:var(--brand,#58a6ff); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--brand,#58a6ff) 25%, transparent); }
.lp-dot.weak { background:#d29922; color:#fff; }
.lp-step-body { flex:1; min-width:0; padding-top:1px; }
.lp-step-name { font-size:14px; font-weight:700; color:var(--text-primary,#e6edf7); text-decoration:none; cursor:pointer; }
.lp-step-name:hover { color:var(--brand,#58a6ff); }
.lp-step-meta { font-size:11px; color:var(--text-muted,#7e8da8); margin-top:2px; }
.lp-badge { display:inline-block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:1px 6px; border-radius:10px; margin-left:7px; vertical-align:middle; }
.lp-badge.active { background:color-mix(in srgb, var(--brand,#58a6ff) 18%, transparent); color:var(--brand,#58a6ff); }
.lp-badge.weak { background:rgba(210,153,34,.18); color:#d29922; }
.lp-badge.done { background:rgba(63,185,80,.16); color:var(--green,#3fb950); }
.lp-reinforce { margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.lp-reinforce-lbl { font-size:11px; color:var(--text-muted,#7e8da8); }
.lp-rchip { font-size:11px; padding:2px 8px; border-radius:7px; background:var(--bg-3,#1a2334); border:1px solid #d29922; color:#d29922; cursor:pointer; }
`;
    document.head.appendChild(s);
  }

  const ICONS = {
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  };
  function icon(n) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ICONS.zap}"/></svg>`; }

  function stepHTML(s) {
    const dotCls = s.done ? 'done' : s.state === 'active' ? 'active' : s.weak ? 'weak' : '';
    const mark = s.done ? '✓' : s.weak ? '!' : (s.state === 'active' ? '▸' : '');
    const badge = s.done ? '<span class="lp-badge done">done</span>'
      : s.state === 'active' ? '<span class="lp-badge active">next up</span>'
      : s.weak ? '<span class="lp-badge weak">needs work</span>' : '';
    const meta = s.started ? ('Now ' + s.score + '% · ' + esc(s.difficulty)) : ('Not started · ' + esc(s.difficulty));
    const reinforce = (s.reinforce && s.reinforce.length)
      ? `<div class="lp-reinforce"><span class="lp-reinforce-lbl">Shore up first:</span>${s.reinforce.map(r => '<span class="lp-rchip" data-go="' + esc(r.route) + '">' + esc(r.title) + (r.started ? ' ' + r.score + '%' : '') + '</span>').join('')}</div>`
      : '';
    return `
      <li class="lp-step">
        <span class="lp-dot ${dotCls}">${mark}</span>
        <div class="lp-step-body">
          <a class="lp-step-name" data-go="${esc(s.route)}">${esc(s.title)}</a>${badge}
          <div class="lp-step-meta">${meta}</div>
          ${reinforce}
        </div>
      </li>`;
  }

  function pathHTML(p) {
    const cta = p.nextStep
      ? `<button class="lp-cta" data-go="${esc(p.nextStep.route)}">${p.progress.done ? 'Continue' : 'Start path'} →</button>`
      : `<span class="lp-prog-txt">Complete ✓</span>`;
    return `
<div class="lp-path">
  <div class="lp-path-top">
    <div class="lp-ic">${icon(p.icon)}</div>
    <div class="lp-path-main">
      <p class="lp-path-title">${esc(p.title)}</p>
      <p class="lp-path-goal">${esc(p.goal)}</p>
    </div>
  </div>
  <div class="lp-prog">
    <div class="lp-prog-bar"><div class="lp-prog-fill" style="width:${p.progress.pct}%"></div></div>
    <span class="lp-prog-txt">${p.progress.done}/${p.progress.total} · ${p.progress.pct}%</span>
    ${cta}
  </div>
  <ul class="lp-steps">${p.steps.map(stepHTML).join('')}</ul>
</div>`;
  }

  function html() {
    const paths = TV.Recommend.getLearningPaths();
    return `
<div class="lp-wrap page-enter">
  <div class="lp-head">
    <h1>Learning paths</h1>
    <p>Guided journeys through the content. Each path adapts to you — topics you've mastered are marked done, your next step is highlighted, and weak prerequisites are flagged to shore up first.</p>
  </div>
  ${paths.map(pathHTML).join('')}
</div>`;
  }

  function go(route) { if (route) location.hash = route.replace(/^#/, ''); }

  function render(container) {
    injectStyles();
    const scroll = container.scrollTop;
    container.className = '';
    container.innerHTML = html();
    container.scrollTop = scroll;
    if (!_wired) {
      _wired = true;
      container.addEventListener('click', (e) => {
        const g = e.target.closest('[data-go]');
        if (g) { e.preventDefault(); go(g.getAttribute('data-go')); }
      });
      _onProgress = () => { if (TV.currentScreenId && TV.currentScreenId() === 'paths') render(container); };
      document.addEventListener('progress:change', _onProgress);
    }
  }

  function destroy() {
    if (_onProgress) { document.removeEventListener('progress:change', _onProgress); _onProgress = null; }
    _wired = false;
  }

  const MODULE = { id: 'paths', title: 'Learning paths', group: 'For You', render, destroy };

  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      let group = desc.navGroups.find(g => g.id === 'for-you');
      if (!group) {
        group = { id: 'for-you', label: 'For You', items: [] };
        desc.navGroups.unshift(group);
      }
      if (!group.items.some(it => it.id === 'paths')) {
        group.items.push({ id: 'paths', label: 'Learning paths', icon: 'git-branch', available: true });
      }
    });
  }

  register(); // formats + recommendations loaded before this file; before app boot
  TV.LearningPathsView = { register, render, destroy };
})();
