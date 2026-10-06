/* ============================================================
   Cloud DE Visualizer — "For You" recommendation dashboard (Phase 1).

   The native screen that answers "What should I study next?". It is a
   thin VIEW over TV.Recommend (pure engine) + TV.Progress (signals):
   it renders readiness, ranked next-actions with expandable WHY, weak
   areas and review-due items, and lets you self-rate confidence and
   pick a target role — each of which feeds straight back into the
   engine and re-renders.

   Registered under every cloud format (so #azure/recommend,
   #databricks/recommend, … all resolve) and added to the sidebar as a
   "For You" group. The dashboard itself is cross-cloud regardless of
   the active format.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Recommend) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  /* Topics offered in the cold-start calibration strip. */
  const CALIBRATE = ['s3', 'adls-gen2', 'delta-lake', 'iq-spark-arch', 'data-factory', 'unity-catalog'];

  const _expanded = {};   // topicId → bool (persist expand across re-renders)
  let _wired = false;
  let _planMinutes = 60;  // study-plan budget

  function injectStyles() {
    if (document.getElementById('rec-styles')) return;
    const s = document.createElement('style');
    s.id = 'rec-styles';
    s.textContent = `
.rec-wrap { max-width: 1040px; margin: 0 auto; padding: 8px 4px 48px; }
.rec-hero { display:flex; flex-wrap:wrap; align-items:center; gap:22px; justify-content:space-between;
  background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:16px; padding:22px 24px; margin-bottom:18px; }
.rec-hero h1 { font-size:22px; font-weight:820; margin:0 0 4px; color:var(--text-primary,#e6edf3); letter-spacing:-.01em; }
.rec-hero p { margin:0; font-size:13px; color:var(--text-muted,#8b949e); max-width:540px; line-height:1.55; }
.rec-hero-left { min-width:260px; flex:1; }
.rec-ctrls { display:flex; align-items:center; gap:10px; margin-top:14px; flex-wrap:wrap; }
.rec-role { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text-secondary,#adbac7); }
.rec-role select { background:var(--bg-1,#0d1117); color:var(--text-primary,#e6edf3); border:1px solid var(--border-default,#30363d);
  border-radius:8px; padding:6px 10px; font:inherit; font-size:12.5px; cursor:pointer; }
.rec-reset { background:none; border:none; color:var(--text-muted,#8b949e); font:inherit; font-size:11.5px; cursor:pointer; text-decoration:underline; padding:4px; }
.rec-reset:hover { color:var(--text-secondary,#adbac7); }
.rec-goal { display:inline-flex; gap:3px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:9px; padding:3px; }
.rec-goal-seg { background:none; border:none; color:var(--text-secondary,#adbac7); font:inherit; font-size:12px; font-weight:700; padding:5px 12px; border-radius:7px; cursor:pointer; }
.rec-goal-seg.on { background:var(--brand,#58a6ff); color:#fff; }

/* readiness ring */
.rec-ring { display:flex; align-items:center; gap:16px; }
.rec-ring svg { transform:rotate(-90deg); flex-shrink:0; }
.rec-ring-track { stroke:var(--bg-4,#2d333b); }
.rec-ring-val { stroke:var(--brand,#58a6ff); stroke-linecap:round; transition:stroke-dashoffset .6s var(--ease,ease); }
.rec-ring-center { font-size:12px; color:var(--text-muted,#8b949e); }
.rec-ring-center b { display:block; font-size:26px; font-weight:820; color:var(--text-primary,#e6edf3); line-height:1; margin-bottom:2px; }
.rec-ring-meta { font-size:12px; color:var(--text-muted,#8b949e); line-height:1.7; }
.rec-ring-meta b { color:var(--text-secondary,#adbac7); }

.rec-section { margin:26px 0 10px; }
.rec-section h2 { font-size:14px; font-weight:800; color:var(--text-primary,#e6edf3); margin:0 0 3px; text-transform:uppercase; letter-spacing:.05em; }
.rec-section .rec-sub { font-size:12px; color:var(--text-muted,#8b949e); margin:0 0 14px; }

/* calibrate */
.rec-calibrate { background:linear-gradient(135deg, color-mix(in srgb, var(--brand,#58a6ff) 14%, transparent), transparent);
  border:1px solid color-mix(in srgb, var(--brand,#58a6ff) 40%, var(--border-default,#30363d)); border-radius:14px; padding:16px 18px; margin-bottom:18px; }
.rec-calibrate h3 { margin:0 0 4px; font-size:13.5px; font-weight:800; color:var(--text-primary,#e6edf3); }
.rec-calibrate p { margin:0 0 12px; font-size:12px; color:var(--text-secondary,#adbac7); }
.rec-cal-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
.rec-cal-item { background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:10px; padding:10px 12px; }
.rec-cal-item .rec-cal-name { font-size:12.5px; font-weight:700; color:var(--text-primary,#e6edf3); margin-bottom:7px; }

/* skill readiness bars */
.rec-skills { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:9px 24px; }
.rec-skill { display:grid; grid-template-columns:130px 1fr 40px; align-items:center; gap:11px; }
.rec-skill-label { font-size:12.5px; color:var(--text-secondary,#adbac7); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rec-bar { height:8px; background:var(--bg-4,#2d333b); border-radius:5px; overflow:hidden; }
.rec-bar-fill { height:100%; border-radius:5px; transition:width .5s var(--ease,ease); }
.rec-pct { font-size:12px; font-weight:700; color:var(--text-muted,#8b949e); text-align:right; }
.lvl-lo { background:var(--red,#f85149); } .lvl-mid { background:#d29922; } .lvl-hi { background:var(--green,#3fb950); }
.rec-weakest-note { margin-top:14px; font-size:12.5px; color:var(--text-secondary,#adbac7);
  background:var(--bg-1,#0d1117); border-left:3px solid #d29922; border-radius:8px; padding:10px 13px; }
.rec-weakest-note b { color:var(--text-primary,#e6edf3); }

/* recommendation cards */
.rec-cards { display:flex; flex-direction:column; gap:12px; }
.rec-card { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:14px; padding:16px 18px; transition:border-color .15s; }
.rec-card:hover { border-color:color-mix(in srgb, var(--brand,#58a6ff) 55%, var(--border-default,#30363d)); }
.rec-card-top { display:flex; align-items:flex-start; gap:13px; }
.rec-rank { flex-shrink:0; width:26px; height:26px; border-radius:8px; background:var(--bg-4,#2d333b); color:var(--text-secondary,#adbac7);
  font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.rec-card-main { flex:1; min-width:0; }
.rec-card-title { font-size:15.5px; font-weight:800; color:var(--text-primary,#e6edf3); margin:0; cursor:pointer; }
.rec-card-title:hover { color:var(--brand,#58a6ff); }
.rec-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:7px; }
.rec-chip { font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:20px; letter-spacing:.02em; text-transform:uppercase;
  background:var(--bg-4,#2d333b); color:var(--text-muted,#8b949e); border:1px solid var(--border-default,#30363d); }
.rec-chip--cloud { color:var(--text-secondary,#adbac7); }
.rec-chip--type { background:color-mix(in srgb, var(--brand,#58a6ff) 18%, transparent); color:var(--brand,#58a6ff); border-color:transparent; }
.rec-prio { flex-shrink:0; text-align:center; }
.rec-prio-num { font-size:22px; font-weight:820; line-height:1; color:var(--text-primary,#e6edf3); }
.rec-prio-lbl { font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted,#8b949e); margin-top:2px; }
.rec-know { display:flex; align-items:center; gap:10px; margin-top:12px; }
.rec-know-bar { flex:1; height:6px; background:var(--bg-4,#2d333b); border-radius:4px; overflow:hidden; position:relative; }
.rec-know-cur { height:100%; background:var(--brand,#58a6ff); border-radius:4px; }
.rec-know-txt { font-size:11px; color:var(--text-muted,#8b949e); white-space:nowrap; }
.rec-actions-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:13px; }
.rec-btn { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:8px 15px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; }
.rec-btn--ghost { background:none; border:1px solid var(--border-default,#30363d); color:var(--text-secondary,#adbac7); }
.rec-btn--ghost:hover { border-color:var(--brand,#58a6ff); color:var(--text-primary,#e6edf3); }
.rec-why-toggle { background:none; border:none; color:var(--brand,#58a6ff); font:inherit; font-size:12px; font-weight:600; cursor:pointer; padding:4px 0; display:inline-flex; align-items:center; gap:5px; }
.rec-why-toggle svg { transition:transform .18s; }
.rec-why-toggle[aria-expanded="true"] svg { transform:rotate(180deg); }
.rec-why { margin-top:12px; padding:13px 15px; background:var(--bg-1,#0d1117); border-radius:10px; border:1px solid var(--border-default,#30363d); display:none; }
.rec-why.show { display:block; }
.rec-why h4 { margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#8b949e); }
.rec-why ul { margin:0 0 10px; padding:0; list-style:none; }
.rec-why li { font-size:12.5px; color:var(--text-secondary,#adbac7); line-height:1.5; padding:3px 0 3px 20px; position:relative; }
.rec-why li::before { content:'✓'; position:absolute; left:0; color:var(--green,#3fb950); font-weight:800; }
.rec-prereqs { display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 12px; }
.rec-prereq { font-size:11.5px; padding:3px 9px; border-radius:7px; background:var(--bg-3,#21262d); color:var(--text-secondary,#adbac7); border:1px solid var(--border-default,#30363d); cursor:pointer; }
.rec-prereq.weak { border-color:var(--red,#f85149); color:var(--red,#f85149); }
.rec-prereq.ok::before { content:'✓ '; color:var(--green,#3fb950); }
.rec-do { margin:0; padding-left:18px; }
.rec-do li { font-size:12px; color:var(--text-secondary,#adbac7); line-height:1.6; }

/* stars */
.rec-stars { display:inline-flex; gap:2px; }
.rec-star { background:none; border:none; cursor:pointer; padding:1px; font-size:16px; line-height:1; color:var(--bg-4,#2d333b); }
.rec-star.on { color:#e3b341; }
.rec-star:hover { color:#e3b341; }
.rec-rate-lbl { font-size:11px; color:var(--text-muted,#8b949e); margin-right:3px; }

/* two-col lists */
.rec-cols { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:8px; }
.rec-list { list-style:none; margin:0; padding:0; }
.rec-list li { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 0; border-bottom:1px solid var(--border-default,#30363d); }
.rec-list li:last-child { border-bottom:none; }
.rec-list a { color:var(--text-primary,#e6edf3); text-decoration:none; font-size:13px; font-weight:600; }
.rec-list a:hover { color:var(--brand,#58a6ff); }
.rec-list .rec-mini { font-size:11px; color:var(--text-muted,#8b949e); }
.rec-empty { font-size:12.5px; color:var(--text-muted,#8b949e); font-style:italic; padding:10px 0; }
/* study plan */
.rec-plan { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:14px; padding:16px 18px; }
.rec-plan-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.rec-plan-budget { display:inline-flex; gap:4px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:9px; padding:3px; }
.rec-plan-min { background:none; border:none; color:var(--text-secondary,#adbac7); font:inherit; font-size:12px; font-weight:700; padding:5px 11px; border-radius:7px; cursor:pointer; }
.rec-plan-min.on { background:var(--brand,#58a6ff); color:#fff; }
.rec-plan-list { display:flex; flex-direction:column; gap:9px; }
.rec-plan-block { display:flex; align-items:center; gap:13px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:10px; padding:11px 14px; cursor:pointer; transition:border-color .12s; }
.rec-plan-block:hover { border-color:var(--brand,#58a6ff); }
.rec-plan-min-badge { flex-shrink:0; width:52px; text-align:center; font-size:13px; font-weight:800; color:var(--text-primary,#e6edf3); }
.rec-plan-min-badge span { display:block; font-size:9.5px; font-weight:700; color:var(--text-muted,#8b949e); text-transform:uppercase; }
.rec-plan-type { flex-shrink:0; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:3px 8px; border-radius:20px; }
.rec-plan-type.study { background:color-mix(in srgb,var(--brand,#58a6ff) 18%,transparent); color:var(--brand,#58a6ff); }
.rec-plan-type.review { background:rgba(210,153,34,.18); color:#d29922; }
.rec-plan-type.quiz { background:rgba(63,185,80,.16); color:var(--green,#3fb950); }
.rec-plan-body { flex:1; min-width:0; }
.rec-plan-title { font-size:13.5px; font-weight:700; color:var(--text-primary,#e6edf3); }
.rec-plan-reason { font-size:11.5px; color:var(--text-muted,#8b949e); margin-top:2px; }
.rec-plan-total { font-size:12px; color:var(--text-muted,#8b949e); }
/* path cross-link on cards + mini path list */
.rec-onpath { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; color:var(--text-muted,#8b949e); margin-top:9px; cursor:pointer; background:none; border:none; font:inherit; padding:0; }
.rec-onpath b { color:var(--brand,#58a6ff); font-weight:700; }
.rec-onpath:hover b { text-decoration:underline; }
.rec-paths-mini { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:10px; }
.rec-pathm { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:11px; padding:12px 14px; cursor:pointer; transition:border-color .12s; }
.rec-pathm:hover { border-color:var(--brand,#58a6ff); }
.rec-pathm-title { font-size:13px; font-weight:700; color:var(--text-primary,#e6edf3); display:flex; justify-content:space-between; gap:8px; }
.rec-pathm-pct { color:var(--text-muted,#8b949e); font-weight:700; }
.rec-pathm-bar { height:6px; background:var(--bg-4,#2d333b); border-radius:4px; overflow:hidden; margin-top:8px; }
.rec-pathm-fill { height:100%; background:var(--green,#3fb950); border-radius:4px; }
.rec-pathm-next { font-size:11px; color:var(--text-muted,#8b949e); margin-top:7px; }
.rec-pathm-next b { color:var(--text-secondary,#adbac7); }
.rec-scored-note { font-size:11.5px; color:var(--text-muted,#8b949e); margin-top:26px; line-height:1.6; }
.rec-scored-note summary { cursor:pointer; color:var(--text-secondary,#adbac7); }
@media (max-width:720px){ .rec-cols{ grid-template-columns:1fr; gap:4px; } .rec-skill{ grid-template-columns:110px 1fr 36px; } }
`;
    document.head.appendChild(s);
  }

  function lvlClass(p) { return p < 45 ? 'lvl-lo' : p < 70 ? 'lvl-mid' : 'lvl-hi'; }
  const chevron = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4.5L6 7.5 9 4.5"/></svg>';

  function starRow(topicId, rating) {
    let h = '<span class="rec-stars" data-rate="' + esc(topicId) + '" role="radiogroup" aria-label="Rate your confidence">';
    for (let i = 1; i <= 5; i++) h += '<button class="rec-star ' + (rating >= i ? 'on' : '') + '" data-val="' + i + '" title="' + i + '/5" aria-label="' + i + ' of 5">★</button>';
    return h + '</span>';
  }

  function card(rec, rank) {
    const open = _expanded[rec.topicId];
    const onPath = TV.Recommend.pathsForTopic(rec.topicId)[0];
    const prereqs = rec.prerequisites.map(p =>
      '<span class="rec-prereq ' + (p.weak ? 'weak' : 'ok') + '" data-go="' + esc(p.route) + '">' + esc(p.title) + (p.started ? ' ' + p.score + '%' : ' ·new') + '</span>'
    ).join('');
    const rating = rec.signals && rec.signals.rating;
    return `
<div class="rec-card" data-topic="${esc(rec.topicId)}">
  <div class="rec-card-top">
    <div class="rec-rank">${rank}</div>
    <div class="rec-card-main">
      <p class="rec-card-title" data-go="${esc(rec.route)}">${esc(rec.title)}</p>
      <div class="rec-chips">
        <span class="rec-chip rec-chip--cloud">${esc(rec.cloud)}</span>
        <span class="rec-chip rec-chip--type">${esc(rec.typeLabel)}</span>
        <span class="rec-chip">${esc(rec.difficulty)}</span>
        <span class="rec-chip">~${rec.estimatedMinutes} min</span>
      </div>
      <div class="rec-know">
        <span class="rec-know-txt">${rec.started ? 'Now ' + rec.knowledgeScore + '%' : 'Not started'}</span>
        <div class="rec-know-bar"><div class="rec-know-cur" style="width:${rec.knowledgeScore}%"></div></div>
        <span class="rec-know-txt">Target ${rec.targetScore}%</span>
      </div>
    </div>
    <div class="rec-prio"><div class="rec-prio-num">${rec.priorityScore}</div><div class="rec-prio-lbl">Priority</div></div>
  </div>
  <div class="rec-actions-row">
    <button class="rec-btn" data-go="${esc(rec.route)}">Start learning →</button>
    <button class="rec-why-toggle" aria-expanded="${open ? 'true' : 'false'}" data-why="${esc(rec.topicId)}">Why this? ${chevron}</button>
    <span style="flex:1"></span>
    <span class="rec-rate-lbl">Your confidence</span>${starRow(rec.topicId, rating)}
  </div>
  ${onPath ? `<button class="rec-onpath" data-go="${esc(onPath.route)}">◆ On path: <b>${esc(onPath.title)} →</b></button>` : ''}
  <div class="rec-why ${open ? 'show' : ''}" data-whybox="${esc(rec.topicId)}">
    <h4>Why this is #${rank} for you</h4>
    <ul>${rec.reason.map(r => '<li>' + esc(r) + '</li>').join('')}</ul>
    ${prereqs ? '<h4>Prerequisites</h4><div class="rec-prereqs">' + prereqs + '</div>' : ''}
    <h4>What to do</h4>
    <ol class="rec-do">${rec.actions.map(a => '<li>' + esc(a) + '</li>').join('')}</ol>
  </div>
</div>`;
  }

  function calItem(topicId) {
    const t = TV.Taxonomy.byId(topicId);
    if (!t) return '';
    const rating = TV.Progress.getRating(topicId);
    return `<div class="rec-cal-item"><div class="rec-cal-name">${esc(t.label)}</div>${starRow(topicId, rating)}</div>`;
  }

  function planBlockHTML(b) {
    const attr = b.type === 'quiz' ? `data-quiz-cloud="${esc(b.cloud)}"` : `data-go="${esc(b.route)}"`;
    return `
      <div class="rec-plan-block" ${attr}>
        <div class="rec-plan-min-badge">${b.minutes}<span>min</span></div>
        <span class="rec-plan-type ${b.type}">${b.type}</span>
        <div class="rec-plan-body">
          <div class="rec-plan-title">${esc(b.title)}</div>
          <div class="rec-plan-reason">${esc(b.reason || '')}</div>
        </div>
      </div>`;
  }

  function planHTML(ctx) {
    const plan = TV.Recommend.generateDailyPlan(_planMinutes, ctx || {});
    const mins = [30, 60, 120].map(m => `<button class="rec-plan-min ${m === _planMinutes ? 'on' : ''}" data-plan-min="${m}">${m}m</button>`).join('');
    const body = plan.blocks.length
      ? plan.blocks.map(planBlockHTML).join('')
      : '<p class="rec-empty">Rate a few topics or take a quiz and a tailored session plan appears here.</p>';
    return `
<div class="rec-section">
  <div class="rec-plan">
    <div class="rec-plan-head">
      <div><h2 style="margin:0">Today's study plan</h2><p class="rec-plan-total" style="margin:3px 0 0">A focused ${plan.used}-minute session built from your current gaps.</p></div>
      <div class="rec-plan-budget">${mins}</div>
    </div>
    <div class="rec-plan-list">${body}</div>
  </div>
</div>`;
  }

  function ring(pct) {
    const r = 34, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
      <circle class="rec-ring-track" cx="42" cy="42" r="${r}" fill="none" stroke-width="8"/>
      <circle class="rec-ring-val" cx="42" cy="42" r="${r}" fill="none" stroke-width="8" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
    </svg>`;
  }

  function html() {
    const ov = TV.Recommend.getOverview();
    const role = TV.Progress.getRole();
    const roles = TV.Taxonomy.roles();
    const ir = TV.Recommend.getInterviewReadiness();

    // Study goal: interview (default) vs certification (filters to a cert's topics).
    const goal = (TV.Progress.getGoal && TV.Progress.getGoal()) || 'interview';
    const certMode = goal === 'certification' && TV.Certifications && TV.CertEngine;
    let cert = null, certRd = null, restrictTo = null;
    if (certMode) {
      const tid = TV.Progress.getTargetCert() || (TV.Certifications.active()[0] || {}).certificationId;
      cert = TV.Certifications.byId(tid);
      if (cert) { certRd = TV.CertEngine.certReadiness(cert); restrictTo = TV.CertEngine.certTopicIds(cert); }
    }
    const nextCtx = restrictTo ? { restrictTo: restrictTo } : {};

    const next = TV.Recommend.getNextBestTopics(5, nextCtx);
    const weak = TV.Recommend.getWeakAreas(6);
    const review = TV.Recommend.getReviewTopics(6);
    const paths = TV.Recommend.getLearningPaths();
    const pathAvg = paths.length ? Math.round(paths.reduce((a, p) => a + p.progress.pct, 0) / paths.length) : 0;

    const roleOpts = roles.map(r => '<option value="' + esc(r.id) + '"' + (r.id === role ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('');
    const certOpts = (certMode ? TV.Certifications.active() : []).map(c => '<option value="' + esc(c.certificationId) + '"' + (cert && c.certificationId === cert.certificationId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
    const goalSeg = (g, label) => '<button class="rec-goal-seg ' + (goal === g ? 'on' : '') + '" data-goal-mode="' + g + '">' + label + '</button>';

    const skillsHtml = ir.skills.map(s => `
      <div class="rec-skill">
        <span class="rec-skill-label" title="${esc(s.label)}">${esc(s.label)}</span>
        <div class="rec-bar"><div class="rec-bar-fill ${lvlClass(s.pct)}" style="width:${s.pct}%"></div></div>
        <span class="rec-pct">${s.pct}%</span>
      </div>`).join('');

    const weakList = weak.length
      ? '<ul class="rec-list">' + weak.map(w => `<li><a data-go="${esc(w.route)}">${esc(w.title)}</a><span class="rec-mini">${w.knowledgeScore}% · ${esc(w.cloud)}</span></li>`).join('') + '</ul>'
      : '<p class="rec-empty">No weak topics yet — take a quiz or rate a few topics so I can find them.</p>';

    const reviewList = review.length
      ? '<ul class="rec-list">' + review.map(w => `<li><a data-go="${esc(w.route)}">${esc(w.title)}</a><span class="rec-mini">${w.signals.daysSinceStudied}d ago · ${w.knowledgeScore}%</span></li>`).join('') + '</ul>'
      : '<p class="rec-empty">Nothing due for review. Items appear here once a studied topic ages past ~10 days.</p>';

    const calibrate = !ov.personalized ? `
      <div class="rec-calibrate">
        <h3>✨ Personalize in 20 seconds</h3>
        <p>Rate how confident you feel on a few core topics (or take a quiz). Recommendations below update instantly — until then they're ranked by interview importance.</p>
        <div class="rec-cal-grid">${CALIBRATE.map(calItem).join('')}</div>
      </div>` : '';

    return `
<div class="rec-wrap page-enter">
  <div class="rec-hero">
    <div class="rec-hero-left">
      <h1>What should I study next?</h1>
      <p>${certMode && cert
        ? 'Certification mode — recommendations, readiness and today\'s plan are focused on <b>' + esc(cert.name) + '</b> and its official exam objectives.'
        : 'Your personal Cloud DE mentor — recommendations built from your actual quiz accuracy, self-ratings and what you\'ve opened, weighed by interview and production importance and prerequisite order.'}</p>
      <div class="rec-ctrls">
        <span class="rec-goal" role="group" aria-label="Study goal">${goalSeg('interview', 'Interview')}${goalSeg('certification', 'Certification')}</span>
        ${certMode
          ? '<label class="rec-role">Target cert <select id="rec-cert-select" aria-label="Target certification">' + certOpts + '</select></label>'
          : '<label class="rec-role">Target role <select id="rec-role-select" aria-label="Target role">' + roleOpts + '</select></label>'}
        <button class="rec-reset" id="rec-reset" title="Clear all saved progress signals">Reset my progress</button>
      </div>
    </div>
    <div class="rec-ring">
      ${certMode && certRd ? ring(certRd.overall) : ring(ov.interviewReadiness)}
      <div>
        <div class="rec-ring-center">${certMode && certRd
          ? '<b>' + certRd.overall + '%</b>' + esc(certRd.tier.toLowerCase())
          : '<b>' + ov.interviewReadiness + '%</b>interview-ready'}</div>
      </div>
      <div class="rec-ring-meta">
        ${certMode && certRd
          ? '<div><b>' + certRd.topicsDone + '</b> / ' + certRd.topicsTotal + ' topics ready</div><div>Practice: <b>' + (certRd.practiceExam == null ? '—' : certRd.practiceExam + '%') + '</b></div><div><a data-go="#aws/certifications" style="color:var(--brand,#58a6ff);text-decoration:none">Open Certification Center →</a></div>'
          : '<div><b>' + ov.started + '</b> / ' + ov.total + ' topics opened</div><div><b>' + ov.strong + '</b> strong</div>' + (ov.weakestSkill ? '<div>Biggest gap: <b>' + esc(ov.weakestSkill.label) + '</b></div>' : '') + '<div>Paths: <b>' + pathAvg + '% avg</b></div>'}
      </div>
    </div>
  </div>

  ${calibrate}

  <div class="rec-section">
    <h2>Top next actions${certMode && cert ? ' — ' + esc(cert.examCode || cert.name) : ''}</h2>
    <p class="rec-sub">${certMode
      ? 'The highest-value moves for this certification — scoped to its exam objectives, weakest first.'
      : 'The 5 highest-value moves right now — strong topics are skipped, and a topic is held back until its prerequisites are solid.'}</p>
    <div class="rec-cards">${next.map((r, i) => card(r, i + 1)).join('')}</div>
  </div>

  ${planHTML(nextCtx)}

  ${certMode && certRd ? `
  <div class="rec-section">
    <h2>Domain readiness — ${esc(cert.examCode || cert.name)}</h2>
    <p class="rec-sub">Official exam weightings. Lowest readiness first.</p>
    <div class="rec-skills">${certRd.domains.slice().sort((a, b) => a.score - b.score).map(d => `
      <div class="rec-skill">
        <span class="rec-skill-label" title="${esc(d.name)}">${esc(d.name)} · ${esc(String(d.weight))}%</span>
        <div class="rec-bar"><div class="rec-bar-fill ${lvlClass(d.score)}" style="width:${d.score}%"></div></div>
        <span class="rec-pct">${d.score}%</span>
      </div>`).join('')}</div>
    <div class="rec-weakest-note">Tier: <b>${esc(certRd.tier)}</b> · overall ${certRd.overall}%. Open the <a data-go="#aws/certifications" style="color:var(--brand,#58a6ff)">Certification Center</a> for full objectives, exam focus and official resources.</div>
  </div>` : `
  <div class="rec-section">
    <h2>Interview readiness</h2>
    <p class="rec-sub">Coverage-weighted by interview importance, weakest first.</p>
    <div class="rec-skills">${skillsHtml}</div>
    ${ir.weakest ? '<div class="rec-weakest-note"><b>' + esc(ir.weakest.label) + '</b> is currently your largest interview gap at ' + ir.weakest.pct + '%. The actions above prioritize it.</div>' : ''}
  </div>`}

  <div class="rec-section">
    <div class="rec-cols">
      <div><h2>Weak areas</h2><p class="rec-sub">Started, but below 60%.</p>${weakList}</div>
      <div><h2>Review due</h2><p class="rec-sub">Spaced repetition.</p>${reviewList}</div>
    </div>
  </div>

  <div class="rec-section">
    <h2>Your learning paths</h2>
    <p class="rec-sub">Guided journeys — jump back in where you left off.</p>
    <div class="rec-paths-mini">
      ${paths.map(p => `
        <div class="rec-pathm" data-go="#${esc(p.cloud)}/paths">
          <div class="rec-pathm-title">${esc(p.title)} <span class="rec-pathm-pct">${p.progress.pct}%</span></div>
          <div class="rec-pathm-bar"><div class="rec-pathm-fill" style="width:${p.progress.pct}%"></div></div>
          <div class="rec-pathm-next">${p.nextStep ? 'Next: <b>' + esc(p.nextStep.title) + '</b>' : 'Complete ✓'}</div>
        </div>`).join('')}
    </div>
  </div>

  <details class="rec-scored-note">
    <summary>How are these scored?</summary>
    Priority = knowledge-gap (30%) + interview importance (22%) + production (14%) + architecture (10%) + how many topics it unlocks (12%) + review pressure (7%) + foundation bonus (5%), then tilted by your target role. Knowledge comes from quiz accuracy, your self-ratings and what you've opened — whichever exist. Nothing here is random; set a role or rate a topic and every number above recomputes.
  </details>
</div>`;
  }

  /* ── Event wiring (delegated, so it survives re-renders) ────── */
  function go(route) { if (route) location.hash = route.replace(/^#/, ''); }

  function render(container) {
    injectStyles();
    const scroll = container.scrollTop;
    container.className = '';
    container.innerHTML = html();
    container.scrollTop = scroll;

    if (!_wired) {
      _wired = true;
      container.addEventListener('click', onClick);
      container.addEventListener('change', onChange);
      _onProgress = () => { if (TV.currentScreenId && TV.currentScreenId() === 'recommend') render(container); };
      document.addEventListener('progress:change', _onProgress);
    }
  }

  let _onProgress = null;

  function onClick(e) {
    const goalBtn = e.target.closest('[data-goal-mode]');
    if (goalBtn) {
      TV.Progress.setGoal(goalBtn.getAttribute('data-goal-mode'));
      render(document.getElementById('module-container'));
      return;
    }

    const minBtn = e.target.closest('[data-plan-min]');
    if (minBtn) { _planMinutes = parseInt(minBtn.getAttribute('data-plan-min'), 10) || 60; render(document.getElementById('module-container')); return; }

    const quizBlock = e.target.closest('[data-quiz-cloud]');
    if (quizBlock) {
      const cloud = quizBlock.getAttribute('data-quiz-cloud');
      if (cloud) location.hash = cloud + '/recommend'; // switches active format (and quiz bank), stays on dashboard
      if (TV._openQuiz) setTimeout(() => TV._openQuiz(), 80);
      return;
    }

    const goEl = e.target.closest('[data-go]');
    if (goEl) { e.preventDefault(); go(goEl.getAttribute('data-go')); return; }

    const whyBtn = e.target.closest('[data-why]');
    if (whyBtn) {
      const id = whyBtn.getAttribute('data-why');
      _expanded[id] = !_expanded[id];
      whyBtn.setAttribute('aria-expanded', _expanded[id] ? 'true' : 'false');
      const box = document.querySelector('[data-whybox="' + CSS.escape(id) + '"]');
      if (box) box.classList.toggle('show', _expanded[id]);
      return;
    }

    const star = e.target.closest('.rec-star');
    if (star) {
      const group = star.closest('[data-rate]');
      const id = group && group.getAttribute('data-rate');
      const val = parseInt(star.getAttribute('data-val'), 10);
      if (id && val) {
        // Toggle off if re-clicking the current rating.
        const cur = TV.Progress.getRating(id);
        if (cur === val) TV.Progress.clearRating(id); else TV.Progress.setRating(id, val);
      }
      return;
    }

    if (e.target.closest('#rec-reset')) {
      if (window.confirm('Clear all saved progress signals (views, quiz accuracy, ratings)? This cannot be undone.')) {
        TV.Progress.reset();
      }
    }
  }

  function onChange(e) {
    if (e.target && e.target.id === 'rec-role-select') {
      TV.Progress.setRole(e.target.value);
    } else if (e.target && e.target.id === 'rec-cert-select') {
      TV.Progress.setTargetCert(e.target.value);
      render(document.getElementById('module-container'));
    }
  }

  function destroy() {
    if (_onProgress) { document.removeEventListener('progress:change', _onProgress); _onProgress = null; }
    _wired = false;
  }

  /* ── Register under every cloud format + add the nav item ───── */
  const MODULE = { id: 'recommend', title: 'Recommendations', group: 'For You', render, destroy };

  function register() {
    ['azure', 'databricks', 'aws', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (desc && Array.isArray(desc.navGroups) && !desc.navGroups.some(g => g.id === 'for-you')) {
        desc.navGroups.unshift({
          id: 'for-you',
          label: 'For You',
          items: [{ id: 'recommend', label: 'Recommendations', icon: 'sparkles', available: true }],
        });
      }
    });
  }

  // Formats register in js/formats/*.js (loaded before this file); app boot
  // (_buildNav) runs on DOMContentLoaded, after this synchronous IIFE.
  register();
  TV.Recommendations = { register, render, destroy };
})();
