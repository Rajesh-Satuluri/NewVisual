/* ============================================================
   Cloud DE Visualizer — printable Study Summary (Wave 4).

   A clean, print-friendly one-page summary for the active cloud:
   its services by category, the mapped certifications, and the
   learner's own progress — stated honestly (reviewed counts from
   real marks; mastery shows "Not assessed" where there is no
   evidence). "Print / Save as PDF" uses the browser print dialog;
   a print stylesheet hides the app chrome. Additive new screen.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const CLOUD_LABEL = { azure: 'Microsoft Azure', databricks: 'Databricks', aws: 'AWS', fabric: 'Microsoft Fabric', 'multi-cloud': 'Cross-cloud' };
  const VENDOR_FMT = { aws: 'aws', microsoft: 'azure', azure: 'azure', databricks: 'databricks', fabric: 'fabric' };

  function reviewedSet() { try { return JSON.parse(TV.ls.get('cde-sd-reviewed') || '{}') || {}; } catch (e) { return {}; } }

  function certsFor(format) {
    const tracks = (TV.Certifications && TV.Certifications.tracks) || [];
    return tracks.filter(c => (VENDOR_FMT[String(c.vendor || '').toLowerCase()] || '') === format);
  }

  function ensureStyles() {
    if (document.getElementById('ss-styles')) return;
    const el = document.createElement('style'); el.id = 'ss-styles';
    el.textContent = `
.ss { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.ss-wrap { max-width:860px; margin:0 auto; }
.ss-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:6px; }
.ss-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.ss-h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 4px; }
.ss-meta { font-size:12px; color:var(--text-muted); }
.ss-print { cursor:pointer; border:1px solid var(--brand); background:var(--brand); color:#06171a; font:inherit; font-size:13px; font-weight:800; padding:9px 16px; border-radius:9px; }
.ss-print:hover { filter:brightness(1.08); }
.ss-sub { font-size:14px; color:var(--text-secondary); line-height:1.65; margin:10px 0 20px; max-width:680px; }
.ss-stats { display:flex; gap:22px; flex-wrap:wrap; margin:0 0 22px; padding:14px 16px; border:1px solid var(--border-default); border-radius:12px; background:var(--bg-2); }
.ss-stat b { display:block; font-size:22px; font-weight:800; color:var(--brand); line-height:1; }
.ss-stat span { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
.ss-sec { margin:0 0 20px; }
.ss-sec-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin:0 0 10px; padding-bottom:5px; border-bottom:1px solid var(--border-subtle); }
.ss-cat { margin:0 0 12px; break-inside:avoid; }
.ss-cat-h { font-size:13px; font-weight:800; color:var(--text-primary); margin:0 0 5px; }
.ss-svc { display:flex; gap:8px; align-items:baseline; font-size:13px; line-height:1.6; padding:2px 0; }
.ss-svc-name { font-weight:700; color:var(--text-primary); min-width:200px; }
.ss-svc-tag { color:var(--text-secondary); }
.ss-svc-rev { color:var(--green,#10b981); font-weight:800; font-size:11px; }
.ss-cert { border:1px solid var(--border-subtle); border-radius:9px; padding:10px 13px; margin-bottom:8px; break-inside:avoid; }
.ss-cert-name { font-size:13px; font-weight:800; color:var(--text-primary); }
.ss-cert-meta { font-size:12px; color:var(--text-muted); margin-top:2px; }
.ss-dims { display:grid; grid-template-columns:repeat(2,1fr); gap:6px 18px; }
.ss-dim { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; border-bottom:1px solid var(--border-subtle); }
.ss-dim-v-na { color:var(--text-muted); font-style:italic; }
.ss-dim-v-on { font-weight:800; color:var(--text-primary); }
.ss-note { font-size:11px; color:var(--text-muted); line-height:1.5; margin-top:8px; }
@media (max-width:620px){ .ss-dims { grid-template-columns:1fr; } .ss-svc-name { min-width:0; } }
@media print {
  #sidebar, .topbar, .skip-link, #cmdk-trigger, .ss-print, .backup-btn { display:none !important; }
  #app { display:block !important; }
  #module-container { position:static !important; overflow:visible !important; height:auto !important; }
  .ss { height:auto !important; overflow:visible !important; padding:0 !important; }
  .ss-stats, .ss-cert { border-color:#ccc; background:#fff; }
  body, #app, #module-container, .ss { background:#fff !important; color:#000 !important; }
  .ss-svc-name, .ss-cat-h, .ss-cert-name, .ss-h1, .ss-dim-v-on { color:#000 !important; }
}
`;
    document.head.appendChild(el);
  }

  function render(container) {
    ensureStyles();
    container.className = '';
    const format = TV.activeFormat || (location.hash.split('/')[0] || '').replace('#', '') || 'azure';
    const cats = (TV.ServiceDetail && TV.ServiceDetail.categoriesFor) ? TV.ServiceDetail.categoriesFor(format) : [];
    const total = cats.reduce((n, c) => n + c.items.length, 0);
    const reviewed = reviewedSet();
    const reviewedCount = cats.reduce((n, c) => n + c.items.filter(s => reviewed[s.id]).length, 0);
    const certs = certsFor(format);
    const today = new Date().toISOString().slice(0, 10);

    const catBlocks = cats.map(c => `
      <div class="ss-cat">
        <div class="ss-cat-h">${esc(c.label)}</div>
        ${c.items.map(s => `<div class="ss-svc">
          <span class="ss-svc-name">${esc(s.name)}${reviewed[s.id] ? ' <span class="ss-svc-rev">✓ reviewed</span>' : ''}</span>
          <span class="ss-svc-tag">${esc(s.tagline || '')}</span>
        </div>`).join('')}
      </div>`).join('');

    const certBlocks = certs.length ? certs.map(c => `
      <div class="ss-cert">
        <div class="ss-cert-name">${esc(c.name)}</div>
        <div class="ss-cert-meta">${c.examCode ? 'Exam ' + esc(c.examCode) + ' · ' : ''}${(c.domains || []).length} domains</div>
      </div>`).join('') : '<p class="ss-sub">No certification mapped to this view.</p>';

    let dimsHTML = '';
    if (TV.Progress && TV.Progress.masteryDimensions) {
      const m = TV.Progress.masteryDimensions({});
      dimsHTML = `<div class="ss-dims">${m.dimensions.map(d =>
        `<div class="ss-dim"><span>${esc(d.label)}</span>${d.value != null
          ? `<span class="ss-dim-v-on">${d.value}%</span>`
          : `<span class="ss-dim-v-na">Not assessed</span>`}</div>`).join('')}</div>
        <p class="ss-note">Mastery is computed from your own activity on this device. Dimensions you haven't exercised read "Not assessed" — never an invented score.</p>`;
    }

    container.innerHTML = `
<div class="ss page-enter">
  <div class="ss-wrap">
    <div class="ss-top">
      <div>
        <div class="ss-eyebrow">Study summary</div>
        <h1 class="ss-h1">${esc(CLOUD_LABEL[format] || format)} — data engineering</h1>
        <div class="ss-meta">Generated ${esc(today)} · for personal study</div>
      </div>
      <button class="ss-print" data-ss-print>🖨 Print / Save as PDF</button>
    </div>
    <p class="ss-sub">A one-page revision sheet: every service in this view, the mapped certifications, and your own progress. Use “Print / Save as PDF” for an offline copy.</p>
    <div class="ss-stats">
      <div class="ss-stat"><b>${total}</b><span>services</span></div>
      <div class="ss-stat"><b>${cats.length}</b><span>categories</span></div>
      <div class="ss-stat"><b>${reviewedCount}</b><span>marked reviewed</span></div>
      <div class="ss-stat"><b>${certs.length}</b><span>certifications</span></div>
    </div>
    <div class="ss-sec"><div class="ss-sec-h">Services</div>${catBlocks || '<p class="ss-sub">No services in this view.</p>'}</div>
    <div class="ss-sec"><div class="ss-sec-h">Certifications</div>${certBlocks}</div>
    ${dimsHTML ? `<div class="ss-sec"><div class="ss-sec-h">Your mastery</div>${dimsHTML}</div>` : ''}
  </div>
</div>`;
    const btn = container.querySelector('[data-ss-print]');
    if (btn) btn.addEventListener('click', () => { try { window.print(); } catch (e) {} });
  }

  function destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); }

  const MODULE = { id: 'study-summary', title: 'Study Summary', group: 'overview', render, destroy };
  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      const item = { id: 'study-summary', label: 'Study Summary', icon: 'file-text', available: true };
      const grp = desc.navGroups.find(g => g.id === 'overview');
      if (grp) { if (!grp.items.some(it => it.id === 'study-summary')) grp.items.push(item); }
      else desc.navGroups.unshift({ id: 'overview', label: 'Overview', items: [item] });
    });
  }

  register();
  TV.StudySummary = { register, render, destroy };
})();
