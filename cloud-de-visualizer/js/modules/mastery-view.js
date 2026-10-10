/* ============================================================
   Cloud DE Visualizer — Mastery hub (Phase 5 / M5.2–5.4, N5.5–5.6).

   One dashboard that ties the platform together:
     • 5-mode launcher — Learn / Design / Operate / Interview /
       Certify entry points (the N5 information architecture, layered
       additively over the existing per-cloud nav).
     • Multi-dimensional mastery — Knowledge / Confidence / Hands-on /
       Troubleshooting / Design / Interview, from TV.Progress.
     • Spaced-repetition review queue — topics due for review (SM-2-lite).
     • Content freshness — per-bank review status from TV.ContentMeta.

   Pure read of TV.Progress / TV.Taxonomy / TV.ContentMeta; writes
   nothing. Registered in every format under "For You".
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  const MODES = [
    { id: 'learn', label: 'Learn', icon: '📘', blurb: 'Service deep dives & paths', route: f => `#${f}/home` },
    { id: 'design', label: 'Design', icon: '📐', blurb: 'Cross-cloud design challenges', route: () => `#multi-cloud/design-challenges` },
    { id: 'operate', label: 'Operate', icon: '🛠️', blurb: 'Incident simulator & builds', route: f => `#${f}/incidents` },
    { id: 'interview', label: 'Interview', icon: '🎤', blurb: 'Drills & design scenarios', route: () => `#multi-cloud/scenarios` },
    { id: 'certify', label: 'Certify', icon: '🎓', blurb: 'Certification center & exams', route: f => `#${f}/certifications` },
  ];

  function catalogTotals() {
    return {
      projectTotal: (TV.ProjectTracks && TV.ProjectTracks.count()) || 0,
      incidentTotal: (TV.Incidents && TV.Incidents.count && TV.Incidents.count()) || 0,
      challengeTotal: (TV.DesignChallenges && TV.DesignChallenges.count()) || 0,
    };
  }

  function barColor(v) { return v >= 70 ? 'var(--green)' : (v >= 40 ? 'var(--yellow)' : '#ef4444'); }

  function dimensionsHTML() {
    if (!(TV.Progress && TV.Progress.masteryDimensions)) return '';
    const m = TV.Progress.masteryDimensions(catalogTotals());
    const rows = m.dimensions.map(d => {
      const has = d.value != null;
      const v = has ? d.value : 0;
      return `
      <div class="ms-dim">
        <div class="ms-dim-top"><span class="ms-dim-label">${esc(d.label)}</span>
          <span class="ms-dim-val">${has ? v + '%' : '—'}</span></div>
        <div class="ms-bar"><div class="ms-bar-fill" style="width:${has ? v : 0}%;background:${has ? barColor(v) : 'var(--bg-4)'}"></div></div>
        <div class="ms-dim-hint">${esc(d.hint)}</div>
      </div>`;
    }).join('');
    const overall = m.overall != null
      ? `<div class="ms-overall"><div class="ms-overall-pct" style="color:${barColor(m.overall)}">${m.overall}%</div><div class="ms-overall-txt">overall mastery<br><span>across ${m.dimensionsScored} dimension${m.dimensionsScored === 1 ? '' : 's'} with signal</span></div></div>`
      : `<div class="ms-empty">No mastery signal yet — take a quiz, run an incident, grade a design, or complete a project stage and this fills in.</div>`;
    return `
      <section class="ms-card">
        <div class="ms-card-h">Multi-dimensional mastery</div>
        ${overall}
        <div class="ms-dims">${rows}</div>
      </section>`;
  }

  function reviewHTML(format) {
    if (!(TV.Progress && TV.Progress.reviewQueue && TV.Taxonomy)) return '';
    let topics = [];
    try { topics = TV.Taxonomy.topics() || []; } catch (_) { topics = []; }
    const due = TV.Progress.reviewQueue(topics).slice(0, 8);
    const body = due.length
      ? `<div class="ms-review-list">${due.map(item => {
          const t = item.topic;
          const route = '#' + (t.cloud || format) + '/' + (t.navId || t.id);
          return `<a class="ms-review" href="${esc(route)}">
            <span class="ms-review-name">${esc(t.label || t.id)}</span>
            <span class="ms-review-meta"><span class="ms-review-m">${item.mastery}% mastery</span>
            <span class="ms-review-due">${item.overdueDays === 0 ? 'due now' : item.overdueDays + 'd overdue'}</span></span>
          </a>`;
        }).join('')}</div>`
      : `<div class="ms-empty">Nothing due for review. Study a few topics and spaced-repetition reminders appear here, weakest-first.</div>`;
    return `
      <section class="ms-card">
        <div class="ms-card-h">Due for review <span class="ms-card-sub">spaced repetition</span></div>
        ${body}
      </section>`;
  }

  function freshnessHTML() {
    if (!(TV.ContentMeta && TV.ContentMeta.bankIds)) return '';
    const ids = TV.ContentMeta.bankIds();
    let stale = 0;
    const rows = ids.map(id => {
      const r = TV.ContentMeta.resolve(id);
      if (r.stale) stale++;
      const cls = r.stale ? 'stale' : 'fresh';
      const age = r.ageDays == null ? '—' : (r.ageDays + 'd ago');
      return `<tr class="ms-fr-row">
        <td class="ms-fr-bank">${esc(id)}</td>
        <td class="ms-fr-date">${esc(r.lastReviewed || '—')}</td>
        <td class="ms-fr-age">${esc(age)}</td>
        <td><span class="ms-fr-badge ms-fr-badge--${cls}">${r.stale ? 'review due' : 'current'}</span></td>
      </tr>`;
    }).join('');
    const summary = stale === 0
      ? `All ${ids.length} content banks are within the ${TV.ContentMeta.STALE_AFTER_DAYS}-day review window.`
      : `${stale} of ${ids.length} banks are past the ${TV.ContentMeta.STALE_AFTER_DAYS}-day review window.`;
    return `
      <section class="ms-card">
        <div class="ms-card-h">Content freshness <span class="ms-card-sub">provenance & review status</span></div>
        <p class="ms-fr-summary">${esc(summary)}</p>
        <div class="ms-fr-wrap"><table class="ms-fr"><thead><tr><th>Bank</th><th>Last reviewed</th><th>Age</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>`;
  }

  function modesHTML(format) {
    const cards = MODES.map(m => `
      <a class="ms-mode" href="${esc(m.route(format))}">
        <span class="ms-mode-ic">${m.icon}</span>
        <span class="ms-mode-label">${esc(m.label)}</span>
        <span class="ms-mode-blurb">${esc(m.blurb)}</span>
      </a>`).join('');
    return `
      <section class="ms-card">
        <div class="ms-card-h">Five ways to work</div>
        <div class="ms-modes">${cards}</div>
      </section>`;
  }

  function styleTag() {
    if (document.getElementById('ms-styles')) return '';
    return `
<style id="ms-styles">
.ms { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.ms-wrap { max-width:960px; margin:0 auto; }
.ms-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.ms-h1 { font-size:27px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.ms-intro { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:800px; }
.ms-card { border:1px solid var(--border-default); border-radius:14px; padding:18px 20px; margin-bottom:16px; background:var(--bg-2); }
.ms-card-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:14px; display:flex; align-items:center; gap:9px; }
.ms-card-sub { font-weight:600; text-transform:none; letter-spacing:0; color:var(--text-muted); font-size:11px; background:var(--bg-4); padding:2px 8px; border-radius:999px; }
.ms-modes { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
@media (max-width:760px){ .ms-modes { grid-template-columns:repeat(2,1fr); } }
.ms-mode { display:flex; flex-direction:column; gap:4px; text-decoration:none; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:12px; padding:14px 13px; transition:border-color .12s, transform .12s; }
.ms-mode:hover { border-color:var(--brand); transform:translateY(-2px); text-decoration:none; }
.ms-mode-ic { font-size:22px; }
.ms-mode-label { font-size:14px; font-weight:800; color:var(--text-primary); }
.ms-mode-blurb { font-size:11px; color:var(--text-muted); line-height:1.4; }
.ms-overall { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
.ms-overall-pct { font-size:40px; font-weight:800; line-height:1; }
.ms-overall-txt { font-size:13px; color:var(--text-secondary); line-height:1.4; } .ms-overall-txt span { color:var(--text-muted); font-size:12px; }
.ms-dims { display:grid; grid-template-columns:1fr 1fr; gap:14px 20px; }
@media (max-width:620px){ .ms-dims { grid-template-columns:1fr; } }
.ms-dim-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; }
.ms-dim-label { font-size:13px; font-weight:700; color:var(--text-primary); }
.ms-dim-val { font-size:13px; font-weight:800; color:var(--text-secondary); }
.ms-bar { height:8px; border-radius:999px; background:var(--bg-4); overflow:hidden; }
.ms-bar-fill { height:100%; border-radius:999px; transition:width .3s; }
.ms-dim-hint { font-size:11px; color:var(--text-muted); margin-top:4px; }
.ms-empty { font-size:13px; color:var(--text-muted); line-height:1.6; background:var(--bg-1); border:1px dashed var(--border-default); border-radius:10px; padding:14px 16px; }
.ms-review-list { display:grid; gap:8px; }
.ms-review { display:flex; justify-content:space-between; align-items:center; gap:12px; text-decoration:none; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:10px; padding:11px 14px; transition:border-color .12s; }
.ms-review:hover { border-color:var(--brand); text-decoration:none; }
.ms-review-name { font-size:14px; font-weight:700; color:var(--text-primary); }
.ms-review-meta { display:flex; gap:9px; align-items:center; flex-shrink:0; }
.ms-review-m { font-size:11px; color:var(--text-muted); }
.ms-review-due { font-size:11px; font-weight:800; color:var(--yellow); background:var(--yellow-subtle); padding:2px 9px; border-radius:999px; }
.ms-fr-summary { font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0 0 12px; }
.ms-fr-wrap { border:1px solid var(--border-subtle); border-radius:10px; overflow-x:auto; }
.ms-fr { width:100%; border-collapse:collapse; font-size:12px; }
.ms-fr thead th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; padding:9px 12px; border-bottom:1px solid var(--border-default); background:var(--bg-1); }
.ms-fr-row { border-bottom:1px solid var(--border-subtle); } .ms-fr-row:last-child { border-bottom:none; }
.ms-fr td { padding:8px 12px; vertical-align:middle; }
.ms-fr-bank { font-family:var(--font-mono); color:var(--text-secondary); }
.ms-fr-date, .ms-fr-age { color:var(--text-muted); }
.ms-fr-badge { font-size:10px; font-weight:800; padding:2px 8px; border-radius:999px; }
.ms-fr-badge--fresh { color:var(--green); background:var(--green-subtle); }
.ms-fr-badge--stale { color:var(--yellow); background:var(--yellow-subtle); }
</style>`;
  }

  function render(container) {
    const format = (TV.state && TV.state.format) || (location.hash.split('/')[0] || '').replace('#', '') || 'multi-cloud';
    container.className = '';
    container.innerHTML = `${styleTag()}
<div class="ms page-enter">
  <div class="ms-wrap">
    <div class="ms-eyebrow">Your progress</div>
    <h1 class="ms-h1">Mastery</h1>
    <p class="ms-intro">Where you stand across every dimension of data-engineering skill, what's due for review, and how fresh the content is — all in one place. Everything here is computed from your own activity on this device.</p>
    ${modesHTML(format)}
    ${dimensionsHTML()}
    ${reviewHTML(format)}
    ${freshnessHTML()}
  </div>
</div>`;
  }

  function destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); }

  const MODULE = { id: 'mastery', title: 'Mastery', group: 'For You', render, destroy };
  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      const grp = desc.navGroups.find(g => g.id === 'for-you');
      const item = { id: 'mastery', label: 'Mastery', icon: 'award', available: true };
      if (grp) { if (!grp.items.some(it => it.id === 'mastery')) grp.items.push(item); }
      else desc.navGroups.unshift({ id: 'for-you', label: 'For You', items: [item] });
    });
  }

  register();
  TV.MasteryView = { register, render, destroy };
})();
