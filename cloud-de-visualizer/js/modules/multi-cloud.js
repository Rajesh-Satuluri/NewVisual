/* ============================================================
   Cloud DE Visualizer — Multi-Cloud (Cross-Cloud) renderer.
   Block D: the Azure ↔ Databricks ↔ AWS equivalence matrix
   (home) plus a deep-dive concept page per capability. Rating
   badges are DIRECT / CLOSE / PARTIAL / NONE. Service cells
   deep-link to the relevant Azure/Databricks/AWS detail pages;
   matrix rows link to the concept page. Reads TV.Equivalences.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  const RATING = {
    DIRECT:  { cls: 'direct',  label: 'DIRECT' },
    CLOSE:   { cls: 'close',   label: 'CLOSE' },
    PARTIAL: { cls: 'partial', label: 'PARTIAL' },
    NONE:    { cls: 'none',    label: 'NONE' },
  };

  function badge(rating) {
    const r = RATING[rating] || RATING.PARTIAL;
    return `<span class="mc-badge mc-badge--${r.cls}">${r.label}</span>`;
  }

  function cell(side, format) {
    if (side.id) {
      return `<a class="mc-svc mc-svc--link" href="#${format}/${side.id}">${esc(side.svc)}</a>`;
    }
    return `<span class="mc-svc">${esc(side.svc)}</span>`;
  }

  function styleTag() {
    return `
<style id="mc-styles">
.mc { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.mc-wrap { max-width:1040px; margin:0 auto; }
.mc-hero { border:1px solid var(--border-default); border-radius:16px; padding:24px 26px; margin-bottom:22px; background:
  radial-gradient(120% 140% at 0% 0%, var(--brand-glow), transparent 60%), var(--bg-2); }
.mc-hero h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:0 0 8px; color:var(--text-primary); }
.mc-hero p { font-size:14.5px; color:var(--text-secondary); line-height:1.7; margin:0; max-width:780px; }
.mc-legend { display:flex; flex-wrap:wrap; gap:16px; margin-top:16px; }
.mc-legend-item { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--text-secondary); }
.mc-badge { display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:.05em; padding:3px 8px; border-radius:999px; white-space:nowrap; }
.mc-badge--direct  { background:var(--green-subtle);  color:var(--green); }
.mc-badge--close   { background:var(--blue-subtle);   color:var(--blue); }
.mc-badge--partial { background:var(--yellow-subtle); color:var(--yellow); }
.mc-badge--none    { background:var(--bg-4);          color:var(--text-muted); }
.mc-tablewrap { border:1px solid var(--border-default); border-radius:14px; overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; }
.mc-table { width:100%; border-collapse:collapse; font-size:13px; min-width:720px; }
.mc-table thead th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted);
  font-weight:800; padding:12px 14px; background:var(--bg-2); border-bottom:1px solid var(--border-default); }
.mc-table thead th.az { color:var(--brand-2); } .mc-table thead th.db { color:#ff8f6b; } .mc-table thead th.aws { color:#ff9900; }
.mc-row { border-bottom:1px solid var(--border-subtle); cursor:pointer; transition:background .12s; }
.mc-row:last-child { border-bottom:none; }
.mc-row:hover { background:var(--bg-2); }
.mc-td { padding:12px 14px; vertical-align:top; }
.mc-cap { font-weight:700; color:var(--text-primary); }
.mc-cap-hint { display:block; font-size:11px; color:var(--text-muted); font-weight:400; margin-top:3px; }
.mc-svc { color:var(--text-secondary); }
.mc-svc--link { color:var(--brand); text-decoration:none; border-bottom:1px dashed var(--border-strong); }
.mc-svc--link:hover { color:var(--brand-strong); text-decoration:none; border-bottom-color:var(--brand); }
.mc-note { font-size:11.5px; color:var(--text-muted); line-height:1.5; }
.mc-open { font-size:10.5px; color:var(--brand); font-weight:700; white-space:nowrap; }
/* concept page */
.mc-c-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.mc-c-h1 { font-size:27px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.mc-c-intro { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:800px; }
.mc-cols { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:18px; }
@media (max-width:920px){ .mc-cols { grid-template-columns:1fr; } }
.mc-col { border:1px solid var(--border-default); border-radius:14px; padding:18px 18px 8px; background:var(--bg-2); }
.mc-col--az { border-top:3px solid var(--brand-2); }
.mc-col--db { border-top:3px solid #ff8f6b; }
.mc-col--aws { border-top:3px solid #ff9900; }
.mc-col-h { font-size:14px; font-weight:800; margin:0 0 12px; color:var(--text-primary); }
.mc-col--az .mc-col-h { color:var(--brand-2); } .mc-col--db .mc-col-h { color:#ff8f6b; } .mc-col--aws .mc-col-h { color:#ff9900; }
.mc-point { display:flex; gap:9px; margin-bottom:11px; font-size:13px; color:var(--text-secondary); line-height:1.6; }
.mc-point::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--brand); margin-top:7px; flex-shrink:0; }
.mc-col--db .mc-point::before { background:#ff8f6b; }
.mc-col--aws .mc-point::before { background:#ff9900; }
.mc-verdict { border:1px solid var(--border-default); border-left:3px solid var(--brand); border-radius:10px; padding:14px 16px; background:var(--brand-glow); }
.mc-verdict-l { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--brand); margin-bottom:6px; }
.mc-verdict p { font-size:13.5px; color:var(--text-primary); line-height:1.7; margin:0; }
.mc-back { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:var(--brand); text-decoration:none; margin-bottom:18px; }
.mc-back:hover { text-decoration:underline; }
/* migration scenarios */
.mc-scn { border:1px solid var(--border-default); border-radius:14px; padding:18px 20px; margin-bottom:16px; background:var(--bg-2); }
.mc-scn-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.mc-scn-q { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--brand); color:#fff; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.mc-scn-title { font-size:15.5px; font-weight:700; color:var(--text-primary); margin:0; }
.mc-scn-prompt { font-size:13.5px; color:var(--text-secondary); line-height:1.65; margin:0 0 14px; }
.mc-scn-answer { border-left:3px solid var(--green); background:var(--bg-1); border-radius:8px; padding:11px 13px; margin-bottom:14px; }
.mc-scn-l { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--green); margin-bottom:5px; }
.mc-scn-answer p { font-size:13px; color:var(--text-primary); line-height:1.65; margin:0; }
.mc-scn-steps { display:grid; gap:7px; margin-bottom:14px; }
.mc-scn-step { display:grid; grid-template-columns:minmax(120px,1fr) auto minmax(120px,1.2fr); align-items:baseline; gap:8px; padding:8px 11px; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:8px; }
.mc-scn-from { font-size:12px; color:var(--text-secondary); font-weight:600; }
.mc-scn-arrow { color:var(--brand); font-weight:700; }
.mc-scn-to { font-size:12px; color:var(--brand); font-weight:700; }
.mc-scn-note { grid-column:1 / -1; font-size:11.5px; color:var(--text-muted); line-height:1.5; }
.mc-scn-trap { font-size:12.5px; color:var(--text-secondary); line-height:1.6; background:var(--yellow-subtle); border-radius:8px; padding:10px 13px; }
.mc-scn-trap-l { font-weight:800; color:var(--yellow); }
@media (max-width:600px){ .mc-scn-step { grid-template-columns:1fr; } .mc-scn-arrow { display:none; } }
</style>`;
  }

  /* ── Matrix (home) ───────────────────────────────────────── */
  function renderMatrix(container) {
    container.className = '';
    const styles = document.getElementById('mc-styles') ? '' : styleTag();
    const M = TV.Equivalences.MATRIX;
    const rows = M.map(r => {
      const clickable = r.concept ? ` data-concept="${r.concept}"` : '';
      const open = r.concept ? `<span class="mc-open">Compare →</span>` : '';
      return `
      <tr class="mc-row"${clickable}>
        <td class="mc-td"><span class="mc-cap">${esc(r.cap)}</span></td>
        <td class="mc-td">${cell(r.az, 'azure')}</td>
        <td class="mc-td">${cell(r.db, 'databricks')}</td>
        <td class="mc-td">${r.aws ? cell(r.aws, 'aws') : '<span class="mc-svc">—</span>'}</td>
        <td class="mc-td">${badge(r.rating)}<div class="mc-note">${esc(r.note)}</div></td>
        <td class="mc-td">${open}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="mc page-enter">
  <div class="mc-wrap">
    <div class="mc-hero">
      <h1>Azure ⇄ Databricks ⇄ AWS equivalence matrix</h1>
      <p>How each core data-engineering capability maps across Azure, Databricks and AWS — rated honestly. Some are the same thing, some are the same job done differently, and a few have no first-party counterpart in one stack. Click a row to open the deep-dive comparison.</p>
      <div class="mc-legend">
        <span class="mc-legend-item">${badge('DIRECT')} effectively the same / interop-native</span>
        <span class="mc-legend-item">${badge('CLOSE')} same job, different model</span>
        <span class="mc-legend-item">${badge('PARTIAL')} overlaps, different scope/layer</span>
        <span class="mc-legend-item">${badge('NONE')} no first-party counterpart</span>
      </div>
    </div>
    <div class="mc-tablewrap">
      <table class="mc-table">
        <thead>
          <tr>
            <th>Capability</th>
            <th class="az">Azure</th>
            <th class="db">Databricks</th>
            <th class="aws">AWS</th>
            <th>Equivalence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
</div>`;
    container.querySelectorAll('.mc-row[data-concept]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // let service links work
        location.hash = '#multi-cloud/' + row.dataset.concept;
      });
    });
  }

  /* ── Concept deep-dive page ──────────────────────────────── */
  function renderConcept(container, c) {
    container.className = '';
    const styles = document.getElementById('mc-styles') ? '' : styleTag();
    const col = (side, mod) => `
      <div class="mc-col mc-col--${mod}">
        <h3 class="mc-col-h">${esc(side.label)}</h3>
        ${side.points.map(p => `<div class="mc-point">${esc(p)}</div>`).join('')}
      </div>`;
    container.innerHTML = `${styles}
<div class="mc page-enter">
  <div class="mc-wrap">
    <a class="mc-back" href="#multi-cloud/home">← Equivalence matrix</a>
    <div class="mc-c-eyebrow">Cross-cloud comparison</div>
    <h1 class="mc-c-h1">${esc(c.title)} ${badge(c.rating)}</h1>
    <p class="mc-c-intro">${esc(c.intro)}</p>
    <div class="mc-cols">
      ${col(c.azure, 'az')}
      ${col(c.databricks, 'db')}
      ${c.aws ? col(c.aws, 'aws') : ''}
    </div>
    <div class="mc-verdict">
      <div class="mc-verdict-l">Interview verdict</div>
      <p>${esc(c.verdict)}</p>
    </div>
  </div>
</div>`;
  }

  /* ── Migration / design scenarios page ───────────────────── */
  function renderScenarios(container) {
    container.className = '';
    const styles = document.getElementById('mc-styles') ? '' : styleTag();
    const S = (TV.Equivalences.SCENARIOS) || [];
    const cards = S.map(s => `
      <div class="mc-scn" id="scn-${esc(s.id)}">
        <div class="mc-scn-head">
          <span class="mc-scn-q">Q</span>
          <h3 class="mc-scn-title">${esc(s.title)}</h3>
        </div>
        <p class="mc-scn-prompt">${esc(s.prompt)}</p>
        <div class="mc-scn-answer">
          <div class="mc-scn-l">Recommended approach</div>
          <p>${esc(s.answer)}</p>
        </div>
        <div class="mc-scn-steps">
          ${s.steps.map(st => `
            <div class="mc-scn-step">
              <span class="mc-scn-from">${esc(st.from)}</span>
              <span class="mc-scn-arrow">→</span>
              <span class="mc-scn-to">${esc(st.to)}</span>
              <span class="mc-scn-note">${esc(st.note)}</span>
            </div>`).join('')}
        </div>
        <div class="mc-scn-trap"><span class="mc-scn-trap-l">⚠ Common trap</span> ${esc(s.trap)}</div>
      </div>`).join('');
    container.innerHTML = `${styles}
<div class="mc page-enter">
  <div class="mc-wrap">
    <div class="mc-c-eyebrow">Cross-cloud interview drills</div>
    <h1 class="mc-c-h1">Migration &amp; design scenarios</h1>
    <p class="mc-c-intro">The "design a stack" / "how would you migrate this" questions interviewers actually ask. Each gives the recommended approach, the service-by-service mapping, and the trap people fall into.</p>
    ${cards}
  </div>
</div>`;
  }

  /* ── Registration ────────────────────────────────────────── */
  function register() {
    if (!TV.Equivalences) return;
    TV.registerModule('multi-cloud', {
      id: 'home', title: 'Equivalence Matrix', group: 'overview', format: 'multi-cloud',
      render(container) { renderMatrix(container); },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
    TV.Equivalences.CONCEPTS.forEach(c => {
      TV.registerModule('multi-cloud', {
        id: c.id, title: c.title, group: 'deep-dives', format: 'multi-cloud',
        render(container) { renderConcept(container, c); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
    });
    TV.registerModule('multi-cloud', {
      id: 'scenarios', title: 'Migration Scenarios', group: 'drills', format: 'multi-cloud',
      render(container) { renderScenarios(container); },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
  }

  function navGroups() {
    const concepts = (TV.Equivalences && TV.Equivalences.CONCEPTS) || [];
    return [
      { id: 'overview', label: 'Overview',
        items: [{ id: 'home', label: 'Equivalence Matrix', icon: 'list', available: true }] },
      { id: 'deep-dives', label: 'Deep Dives',
        items: concepts.map(c => ({ id: c.id, label: c.title, icon: 'columns', available: true })) },
      { id: 'drills', label: 'Interview Drills',
        items: [{ id: 'scenarios', label: 'Migration Scenarios', icon: 'message-square', available: true }] },
    ];
  }

  TV.MultiCloud = { register, navGroups };
})();
