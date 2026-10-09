/* ============================================================
   Cloud DE Visualizer — Incident Simulator screen (Phase 2 / O2.3)

   Lists production-incident scenarios for the active cloud (all clouds
   under Cross-Cloud) and launches the simulator. Registered as an
   "Operate" nav item per format, mirroring the Certification Center.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const CLOUD_LABEL = { databricks: 'Databricks', aws: 'AWS', azure: 'Azure', fabric: 'Fabric' };
  let _wired = false, _container = null;

  function injectStyles() {
    if (document.getElementById('iv-styles')) return;
    const s = document.createElement('style'); s.id = 'iv-styles';
    s.textContent = `
.iv-wrap { max-width:960px; }
.iv-intro { font-size:14px; color:var(--text-secondary,#b3c0d6); line-height:1.7; margin:0 0 6px; max-width:760px; }
.iv-sec-h { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#7e8da8); margin:22px 0 12px; }
.iv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
.iv-card { text-align:left; background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:12px; padding:15px 16px; cursor:pointer; font:inherit; color:inherit; transition:border-color .12s, transform .12s; }
.iv-card:hover { border-color:var(--brand,#58a6ff); transform:translateY(-2px); }
.iv-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
.iv-card-cloud { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:2px 8px; border-radius:20px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); }
.iv-card-diff { font-size:11px; font-weight:700; color:var(--brand,#58a6ff); }
.iv-card-title { font-size:14px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.4; margin-bottom:6px; }
.iv-card-ctx { font-size:12px; color:var(--text-muted,#7e8da8); line-height:1.55; }
.iv-empty { font-size:13px; color:var(--text-muted,#7e8da8); }
`;
    document.head.appendChild(s);
  }

  const LVL = { 1: 'Recall', 2: 'Foundations', 3: 'Apply', 4: 'Scenario', 5: 'Troubleshoot', 6: 'Architecture', 7: 'Expert' };
  function cardHTML(inc) {
    return `<button class="iv-card" data-incident="${esc(inc.id)}">
      <div class="iv-card-top"><span class="iv-card-cloud">${esc(CLOUD_LABEL[inc.cloud] || inc.cloud)}</span><span class="iv-card-diff">${esc(LVL[inc.difficulty] || ('L' + inc.difficulty))}</span></div>
      <div class="iv-card-title">${esc(inc.title)}</div>
      <div class="iv-card-ctx">${esc(inc.context)}</div>
    </button>`;
  }

  function render(container) {
    injectStyles();
    _container = container;
    container.className = '';
    const fmt = TV.activeFormat || (TV.currentFormat && TV.currentFormat());
    const all = (TV.Incidents && TV.Incidents.list()) || [];
    const multi = !fmt || fmt === 'multi-cloud';
    const list = multi ? all : all.filter(i => i.cloud === fmt);

    let body;
    if (!list.length) {
      body = `<p class="iv-empty">No incident scenarios for this cloud yet.</p>`;
    } else if (multi) {
      // group by cloud
      body = (TV.Incidents.clouds()).map(c => {
        const items = all.filter(i => i.cloud === c);
        return `<div class="iv-sec-h">${esc(CLOUD_LABEL[c] || c)} · ${items.length}</div><div class="iv-grid">${items.map(cardHTML).join('')}</div>`;
      }).join('');
    } else {
      body = `<div class="iv-grid">${list.map(cardHTML).join('')}</div>`;
    }

    container.innerHTML = `
<div class="iv-wrap page-enter">
  <h1>Incident Simulator</h1>
  <p class="iv-intro">Real production failures. You investigate the evidence before the answer is revealed, commit to a root cause and a remediation, and are scored on evidence-led diagnosis — not a single generic fix. Each incident ends with how to validate the fix, how to prevent recurrence, interview follow-ups and the official reference.</p>
  ${body}
</div>`;

    if (!_wired) { container.addEventListener('click', onClick); _wired = true; }
  }

  function onClick(e) {
    const card = e.target.closest('[data-incident]');
    if (card && TV.IncidentSim) TV.IncidentSim.open(card.getAttribute('data-incident'));
  }

  function destroy() { _wired = false; }

  const MODULE = { id: 'incidents', title: 'Incident Simulator', group: 'Operate', render, destroy };

  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      if (!desc.navGroups.some(g => g.id === 'operate')) {
        const grp = { id: 'operate', label: 'Operate', items: [{ id: 'incidents', label: 'Incident Simulator', icon: 'zap', available: true }] };
        const certs = desc.navGroups.findIndex(g => g.id === 'certs');
        if (certs !== -1) desc.navGroups.splice(certs + 1, 0, grp); else desc.navGroups.unshift(grp);
      } else {
        const g = desc.navGroups.find(x => x.id === 'operate');
        if (g && !g.items.some(it => it.id === 'incidents')) g.items.push({ id: 'incidents', label: 'Incident Simulator', icon: 'zap', available: true });
      }
    });
  }

  register();
  TV.IncidentsView = { register, render, destroy };
})();
