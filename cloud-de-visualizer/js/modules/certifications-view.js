/* ============================================================
   Cloud DE Visualizer — Certification Center + detail (C3).

   A native screen (#<cloud>/certifications) that renders the
   Certification Center (cards for every active track + a Retired
   section) and, when a card is opened, the full certification detail:
   official exam info, official-weighted domains with readiness bars,
   objectives deep-linked to existing content, exam focus, honest gaps,
   capstone and change history.

   Pure view over TV.Certifications + TV.CertEngine. Center ↔ detail is
   internal view state (the hash router only carries integer steps), so
   the screen manages its own selected-cert state.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.CertEngine) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  let _selected = null, _wired = false, _onProgress = null, _container = null;
  const _labOpen = {};
  let _planDays = 30;

  function injectStyles() {
    if (document.getElementById('cert-styles')) return;
    const s = document.createElement('style');
    s.id = 'cert-styles';
    s.textContent = `
.ct-wrap { max-width: 1040px; margin:0 auto; padding:8px 4px 48px; }
.ct-head h1 { font-size:22px; font-weight:820; margin:0 0 4px; color:var(--text-primary,#e6edf3); letter-spacing:-.01em; }
.ct-head p { margin:0 0 6px; font-size:13px; color:var(--text-muted,#8b949e); max-width:680px; line-height:1.55; }
.ct-verified { font-size:11px; color:var(--text-muted,#8b949e); margin-bottom:18px; }
.ct-verified b { color:var(--text-secondary,#adbac7); }
.ct-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:14px; }
.ct-card { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:12px; transition:border-color .12s; }
.ct-card:hover { border-color:color-mix(in srgb,var(--brand,#58a6ff) 55%,var(--border-default,#30363d)); }
.ct-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.ct-vendor { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#8b949e); }
.ct-name { font-size:15.5px; font-weight:800; color:var(--text-primary,#e6edf3); margin:3px 0 0; line-height:1.3; }
.ct-code { font-size:11.5px; color:var(--text-muted,#8b949e); margin-top:3px; }
.ct-badge { flex-shrink:0; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:3px 9px; border-radius:20px; }
.ct-badge.beta { background:rgba(210,153,34,.18); color:#d29922; }
.ct-badge.ready { background:rgba(63,185,80,.16); color:var(--green,#3fb950); }
.ct-ring { display:flex; align-items:center; gap:14px; }
.ct-ring svg { transform:rotate(-90deg); flex-shrink:0; }
.ct-ring-track { stroke:var(--bg-4,#2d333b); } .ct-ring-val { stroke:var(--brand,#58a6ff); stroke-linecap:round; transition:stroke-dashoffset .6s ease; }
.ct-ring-pct { font-size:19px; font-weight:820; color:var(--text-primary,#e6edf3); }
.ct-ring-tier { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#8b949e); }
.ct-stats { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; font-size:12px; color:var(--text-secondary,#adbac7); }
.ct-stats b { color:var(--text-primary,#e6edf3); }
.ct-meta { font-size:11.5px; color:var(--text-muted,#8b949e); line-height:1.6; }
.ct-actions { display:flex; gap:9px; flex-wrap:wrap; margin-top:2px; }
.ct-btn { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:8px 15px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; }
.ct-btn--ghost { background:none; border:1px solid var(--border-default,#30363d); color:var(--text-secondary,#adbac7); }
.ct-btn--ghost:hover { border-color:var(--brand,#58a6ff); color:var(--text-primary,#e6edf3); }
.ct-link { font-size:11.5px; color:var(--brand,#58a6ff); text-decoration:none; }
.ct-link:hover { text-decoration:underline; }
.ct-links { display:flex; flex-wrap:wrap; gap:12px; }
.ct-next { background:linear-gradient(135deg,color-mix(in srgb,var(--brand,#58a6ff) 14%,transparent),transparent); border:1px solid color-mix(in srgb,var(--brand,#58a6ff) 40%,var(--border-default,#30363d)); border-radius:12px; padding:14px 16px; margin:18px 0; }
.ct-next h3 { margin:0 0 4px; font-size:13px; font-weight:800; color:var(--text-primary,#e6edf3); }
.ct-next p { margin:0; font-size:12px; color:var(--text-secondary,#adbac7); line-height:1.55; }
.ct-section-h { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#8b949e); margin:26px 0 12px; }
.ct-portfolio { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:14px; padding:18px 20px; margin-bottom:18px; }
.ct-portfolio h2 { font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#8b949e); margin:0 0 14px; }
.ct-pf-row { display:grid; grid-template-columns:1fr 2fr auto auto; align-items:center; gap:12px; padding:7px 0; cursor:pointer; }
.ct-pf-row:hover .ct-pf-name { color:var(--brand,#58a6ff); }
.ct-pf-name { font-size:13px; font-weight:700; color:var(--text-primary,#e6edf3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ct-pf-bar { height:9px; background:var(--bg-4,#2d333b); border-radius:5px; overflow:hidden; }
.ct-pf-fill { height:100%; border-radius:5px; }
.ct-pf-pct { font-size:12.5px; font-weight:800; color:var(--text-primary,#e6edf3); width:40px; text-align:right; }
.ct-pf-tier { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted,#8b949e); width:92px; text-align:right; }
.ct-pf-insight { margin-top:12px; font-size:12.5px; color:var(--text-secondary,#adbac7); background:var(--bg-1,#0d1117); border-left:3px solid var(--brand,#58a6ff); border-radius:8px; padding:10px 13px; }
.ct-pf-insight b { color:var(--text-primary,#e6edf3); }
.ct-retired .ct-card { opacity:.75; }
.ct-retired-tag { font-size:10px; font-weight:800; text-transform:uppercase; color:#f85149; border:1px solid #f85149; border-radius:5px; padding:1px 6px; }
/* detail */
.ct-back { background:none; border:none; color:var(--brand,#58a6ff); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; padding:4px 0; margin-bottom:10px; }
.ct-d-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:14px; padding:20px; }
.ct-d-title { font-size:21px; font-weight:820; color:var(--text-primary,#e6edf3); margin:4px 0 6px; letter-spacing:-.01em; }
.ct-examinfo { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.ct-pill { font-size:11.5px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:8px; padding:5px 10px; color:var(--text-secondary,#adbac7); }
.ct-pill b { color:var(--text-primary,#e6edf3); }
.ct-note { font-size:12px; line-height:1.6; border-radius:9px; padding:11px 13px; margin:14px 0; }
.ct-note.beta { background:rgba(210,153,34,.1); border:1px solid rgba(210,153,34,.4); color:var(--text-secondary,#adbac7); }
.ct-readbar { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin:16px 0; }
.ct-read { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:10px; padding:11px 13px; }
.ct-read-k { font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#8b949e); font-weight:800; }
.ct-read-v { font-size:22px; font-weight:820; color:var(--text-primary,#e6edf3); margin-top:3px; }
.ct-dom { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:12px; padding:16px 18px; margin-bottom:12px; }
.ct-dom-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ct-dom-name { font-size:14.5px; font-weight:800; color:var(--text-primary,#e6edf3); }
.ct-dom-w { font-size:11.5px; font-weight:700; color:var(--brand,#58a6ff); }
.ct-dom-bar { height:7px; background:var(--bg-4,#2d333b); border-radius:5px; overflow:hidden; margin:9px 0 14px; }
.ct-dom-fill { height:100%; border-radius:5px; }
.lvl-lo{background:var(--red,#f85149);} .lvl-mid{background:#d29922;} .lvl-hi{background:var(--green,#3fb950);}
.ct-obj { border-top:1px solid var(--border-subtle,#21262d); padding:12px 0 4px; }
.ct-obj:first-child { border-top:none; }
.ct-obj-top { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
.ct-obj-st { font-size:13px; font-weight:700; color:var(--text-primary,#e6edf3); }
.ct-obj-sc { font-size:11.5px; color:var(--text-muted,#8b949e); white-space:nowrap; }
.ct-lvl { font-size:9px; font-weight:800; letter-spacing:.03em; padding:1px 6px; border-radius:9px; background:var(--bg-4,#2d333b); color:var(--text-muted,#8b949e); margin-left:7px; }
.ct-chips { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
.ct-chip { font-size:11.5px; padding:3px 9px; border-radius:7px; background:var(--bg-3,#21262d); border:1px solid var(--border-default,#30363d); color:var(--text-secondary,#adbac7); cursor:pointer; text-decoration:none; }
.ct-chip:hover { border-color:var(--brand,#58a6ff); color:var(--brand,#58a6ff); }
.ct-focus { margin:6px 0 0; padding-left:18px; }
.ct-focus li { font-size:12px; color:var(--text-secondary,#adbac7); line-height:1.55; }
.ct-gaps { font-size:11.5px; color:#d29922; margin-top:6px; }
.ct-gaps b { font-weight:700; }
.ct-capstone { background:var(--bg-2,#161b22); border:1px dashed var(--border-default,#30363d); border-radius:12px; padding:14px 16px; margin-top:14px; }
.ct-capstone .ct-flow { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:8px; }
.ct-flow span { font-size:11.5px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:6px; padding:3px 8px; color:var(--text-secondary,#adbac7); }
.ct-flow i { color:var(--text-muted,#8b949e); font-style:normal; }
.ct-change { font-size:11.5px; color:var(--text-muted,#8b949e); margin-top:16px; line-height:1.6; }
.ct-lab { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:11px; margin-bottom:9px; overflow:hidden; }
.ct-lab-top { display:flex; align-items:center; gap:12px; padding:12px 14px; cursor:pointer; }
.ct-lab-check { flex-shrink:0; width:22px; height:22px; border-radius:6px; border:2px solid var(--border-default,#30363d); background:var(--bg-1,#0d1117); color:transparent; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.ct-lab-check.done { background:var(--green,#3fb950); border-color:var(--green,#3fb950); color:#fff; }
.ct-lab-main { flex:1; min-width:0; }
.ct-lab-title { font-size:13.5px; font-weight:700; color:var(--text-primary,#e6edf3); }
.ct-lab-meta { font-size:11px; color:var(--text-muted,#8b949e); margin-top:2px; }
.ct-lab-chev { color:var(--text-muted,#8b949e); transition:transform .15s; }
.ct-lab.open .ct-lab-chev { transform:rotate(180deg); }
.ct-lab-body { display:none; padding:0 14px 14px 48px; font-size:12.5px; color:var(--text-secondary,#adbac7); line-height:1.6; }
.ct-lab.open .ct-lab-body { display:block; }
.ct-lab-body h5 { margin:12px 0 5px; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#8b949e); }
.ct-lab-body ol, .ct-lab-body ul { margin:0; padding-left:18px; }
.ct-lab-body li { margin:2px 0; }
.ct-plan-toggle { display:inline-flex; gap:3px; background:var(--bg-1,#0d1117); border:1px solid var(--border-default,#30363d); border-radius:9px; padding:3px; margin-left:10px; }
.ct-plan-day { background:none; border:none; color:var(--text-secondary,#adbac7); font:inherit; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:7px; cursor:pointer; }
.ct-plan-day.on { background:var(--brand,#58a6ff); color:#fff; }
.ct-phase { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-radius:11px; padding:12px 14px; margin-bottom:9px; }
.ct-phase-h { display:flex; justify-content:space-between; gap:10px; font-size:13px; font-weight:800; color:var(--text-primary,#e6edf3); }
.ct-phase-range { font-size:11px; color:var(--text-muted,#8b949e); font-weight:700; }
.ct-phase ul { margin:8px 0 0; padding-left:0; list-style:none; }
.ct-phase li { font-size:12.5px; color:var(--text-secondary,#adbac7); padding:3px 0; display:flex; gap:8px; align-items:baseline; }
.ct-kind { font-size:9px; font-weight:800; text-transform:uppercase; padding:1px 6px; border-radius:9px; background:var(--bg-4,#2d333b); color:var(--text-muted,#8b949e); flex-shrink:0; }
.ct-kind.study { background:color-mix(in srgb,var(--brand,#58a6ff) 18%,transparent); color:var(--brand,#58a6ff); }
.ct-kind.lab { background:rgba(63,185,80,.16); color:var(--green,#3fb950); }
.ct-kind.exam { background:rgba(210,153,34,.18); color:#d29922; }
.ct-link-plain { color:var(--text-primary,#e6edf3); text-decoration:none; cursor:pointer; } .ct-link-plain:hover { color:var(--brand,#58a6ff); }
.ct-cmp { width:100%; border-collapse:collapse; font-size:12px; margin:6px 0 14px; }
.ct-cmp td { border:1px solid var(--border-default,#30363d); padding:7px 9px; vertical-align:top; color:var(--text-secondary,#adbac7); }
.ct-cmp .ct-cmp-a { font-weight:700; color:var(--text-primary,#e6edf3); white-space:nowrap; }
.ct-cmp-note { font-size:11px; color:var(--text-muted,#8b949e); font-style:italic; }
.ct-trap { background:var(--bg-2,#161b22); border:1px solid var(--border-default,#30363d); border-left:3px solid #d29922; border-radius:9px; padding:9px 12px; margin-bottom:7px; }
.ct-trap-t { font-size:12.5px; font-weight:700; color:var(--text-primary,#e6edf3); }
.ct-trap-r { font-size:12px; color:var(--text-secondary,#adbac7); margin-top:3px; line-height:1.5; }
`;
    document.head.appendChild(s);
  }

  function lvlClass(p) { return p < 45 ? 'lvl-lo' : p < 70 ? 'lvl-mid' : 'lvl-hi'; }

  function ring(pct, r) {
    r = r || 26; const c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg width="${(r + 6) * 2}" height="${(r + 6) * 2}" viewBox="0 0 ${(r + 6) * 2} ${(r + 6) * 2}"><circle class="ct-ring-track" cx="${r + 6}" cy="${r + 6}" r="${r}" fill="none" stroke-width="6"/><circle class="ct-ring-val" cx="${r + 6}" cy="${r + 6}" r="${r}" fill="none" stroke-width="6" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
  }

  /* ── Center ──────────────────────────────────────────────────── */
  function cardHTML(cert) {
    const rd = TV.CertEngine.certReadiness(cert);
    const beta = cert.beta ? '<span class="ct-badge beta">Beta</span>' : '';
    const ready = rd.tier === 'EXAM READY' ? '<span class="ct-badge ready">Exam ready</span>' : '';
    const domainsN = cert.domains.length;
    const est = Math.max(1, Math.round((rd.topicsRemaining * 1.5 + 8) / 5)); // rough weeks estimate
    return `
<div class="ct-card">
  <div class="ct-card-top">
    <div><div class="ct-vendor">${esc(cert.vendor)}</div><div class="ct-name">${esc(cert.name)}</div>
      <div class="ct-code">${cert.examCode ? esc(cert.examCode) + ' · ' : ''}${esc(cert.difficulty)} · ${domainsN} domains</div></div>
    ${beta || ready || ''}
  </div>
  <div class="ct-ring">
    ${ring(rd.overall)}
    <div><div class="ct-ring-pct">${rd.overall}%</div><div class="ct-ring-tier">${esc(rd.tier)}</div></div>
    <div class="ct-stats" style="flex:1">
      <div>Topics <b>${rd.topicsDone}/${rd.topicsTotal}</b></div>
      <div>Practice <b>${rd.practiceExam == null ? '—' : rd.practiceExam + '%'}</b></div>
      <div>Hands-on <b>${rd.handsOn == null ? '—' : rd.handsOn + '%'}</b></div>
      <div>~Prep <b>${est} wk</b></div>
    </div>
  </div>
  <div class="ct-meta">Recommended: ${esc(cert.recommendedExperience)}<br>${cert.examDuration} min · ${esc(String(cert.questionCount))} Q · pass ${esc(cert.passingScore)}</div>
  <div class="ct-links">
    <a class="ct-link" href="${esc(cert.officialExamUrl)}" target="_blank" rel="noopener">Official page ↗</a>
    <a class="ct-link" href="${esc(cert.officialGuideUrl)}" target="_blank" rel="noopener">Exam guide ↗</a>
  </div>
  <div class="ct-actions">
    <button class="ct-btn" data-open="${esc(cert.certificationId)}">Start preparation →</button>
    <button class="ct-btn--ghost ct-btn" data-goal="${esc(cert.certificationId)}">Set as my goal</button>
  </div>
</div>`;
  }

  function retiredCardHTML(c) {
    return `
<div class="ct-card">
  <div class="ct-card-top">
    <div><div class="ct-vendor">${esc(c.vendor)}</div><div class="ct-name">${esc(c.name)}</div>
      <div class="ct-code">${esc(c.examCode)} · <span class="ct-retired-tag">Retired ${esc(c.retiredOn)}</span></div></div>
  </div>
  <div class="ct-meta">${esc(c.note)}</div>
  <div class="ct-links"><a class="ct-link" href="${esc(c.officialExamUrl)}" target="_blank" rel="noopener">Retirement notice ↗</a></div>
</div>`;
  }

  function portfolioHTML() {
    const sums = TV.CertEngine.certSummaries();
    const rows = sums.map(s => `
      <div class="ct-pf-row" data-open="${esc(s.certificationId)}">
        <span class="ct-pf-name">${esc(s.name)}</span>
        <div class="ct-pf-bar"><div class="ct-pf-fill ${lvlClass(s.overall)}" style="width:${s.overall}%"></div></div>
        <span class="ct-pf-pct">${s.overall}%</span>
        <span class="ct-pf-tier">${esc(s.tier)}</span>
      </div>`).join('');
    // shared-skill insight: a topic common to the most certs that is still weak
    const candidates = ['iq-spark-arch', 'delta-lake', 'structured-streaming', 'auto-loader', 'unity-catalog', 'change-data-feed'];
    let best = null;
    candidates.forEach(id => {
      const t = TV.Taxonomy.byId(id); if (!t) return;
      const certs = TV.CertEngine.certsForTopic(id);
      const score = TV.Recommend.calculateTopicScore(t).score;
      if (certs.length >= 2 && score < 80 && (!best || certs.length > best.certs.length)) best = { t, certs, score };
    });
    const insight = best
      ? `<div class="ct-pf-insight">💡 Studying <b>${esc(best.t.label)}</b> now improves readiness for <b>${best.certs.length} certification tracks</b> at once — a high-leverage next move.</div>`
      : '';
    return `<div class="ct-portfolio"><h2>My certification portfolio</h2>${rows}${insight}</div>`;
  }

  function centerHTML() {
    const C = TV.Certifications;
    const next = TV.CertEngine.recommendNextCert();
    const nextHTML = next ? `
      <div class="ct-next">
        <h3>✨ Recommended next: ${esc(next.cert.name)}</h3>
        <p>${esc(next.reason)}</p>
      </div>` : '';
    return `
<div class="ct-wrap page-enter">
  <div class="ct-head">
    <h1>Certification Center</h1>
    <p>Prepare for the current, official Data Engineering certifications — each mapped to the content you already study here, with readiness built from your real progress.</p>
    <div class="ct-verified">Exam facts verified <b>${esc(C.lastVerified)}</b> · ${esc(C.source)}</div>
  </div>
  ${portfolioHTML()}
  ${nextHTML}
  <div class="ct-grid">${C.active().map(cardHTML).join('')}</div>
  <div class="ct-section-h">Retired / Legacy</div>
  <div class="ct-grid ct-retired">${C.retired.map(retiredCardHTML).join('')}</div>
</div>`;
  }

  /* ── Detail ──────────────────────────────────────────────────── */
  function objHTML(o) {
    const topics = o.topics.map(t => `<a class="ct-chip" data-go="${esc(t.route)}">${esc(t.label)} ${t.started ? t.score + '%' : '·new'}</a>`).join('');
    const focus = o.examFocus.length ? `<ul class="ct-focus">${o.examFocus.map(f => '<li>' + esc(f) + '</li>').join('')}</ul>` : '';
    const gaps = o.gaps.length ? `<div class="ct-gaps"><b>Not yet in the tool (supplementary):</b> ${o.gaps.map(esc).join(', ')}</div>` : '';
    return `
<div class="ct-obj">
  <div class="ct-obj-top">
    <div class="ct-obj-st">${esc(o.statement)}<span class="ct-lvl">${esc(o.level || '')}</span></div>
    <div class="ct-obj-sc">${o.score}% · coverage ${o.coverage}%</div>
  </div>
  ${topics ? '<div class="ct-chips">' + topics + '</div>' : ''}
  <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#8b949e);font-weight:800;margin-top:4px">Exam focus</div>
  ${focus}
  ${gaps}
</div>`;
  }

  function labsHTML(cert) {
    const labs = (TV.CertLabs && TV.CertLabs.byCert(cert.certificationId)) || [];
    if (!labs.length) return '';
    const done = labs.filter(l => TV.Progress.isLabDone(l.id)).length;
    const rows = labs.map(l => {
      const isDone = TV.Progress.isLabDone(l.id);
      const open = _labOpen[l.id];
      return `
      <div class="ct-lab ${open ? 'open' : ''}">
        <div class="ct-lab-top" data-lab-toggle="${esc(l.id)}">
          <div class="ct-lab-check ${isDone ? 'done' : ''}" data-lab-done="${esc(l.id)}" role="checkbox" aria-checked="${isDone}" title="Mark complete">✓</div>
          <div class="ct-lab-main"><div class="ct-lab-title">${esc(l.title)}</div><div class="ct-lab-meta">~${l.estMinutes} min · ${esc(l.objective)}</div></div>
          <span class="ct-lab-chev">▾</span>
        </div>
        <div class="ct-lab-body">
          ${l.prerequisites && l.prerequisites.length ? '<h5>Prerequisites</h5><ul>' + l.prerequisites.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : ''}
          <h5>Steps</h5><ol>${l.steps.map(x => '<li>' + esc(x) + '</li>').join('')}</ol>
          <h5>Verify</h5><ul>${l.verify.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>
          ${l.officialRef ? '<h5>Follow along</h5><a class="ct-link" href="' + esc(l.officialRef.url) + '" target="_blank" rel="noopener">' + esc(l.officialRef.label) + ' ↗</a>' : ''}
        </div>
      </div>`;
    }).join('');
    return `
      <div class="ct-section-h">Hands-on labs — ${done}/${labs.length} complete</div>
      <p class="ct-change" style="margin:-6px 0 12px">Guided playbooks to run in your own account. Tick a lab when done — it feeds the hands-on readiness above.</p>
      ${rows}`;
  }

  function planHTML(cert) {
    const plan = TV.CertEngine.certStudyPlan(cert, _planDays);
    const toggle = [7, 14, 30, 60].map(d => `<button class="ct-plan-day ${d === _planDays ? 'on' : ''}" data-plan-day="${d}">${d}-day</button>`).join('');
    const phases = plan.phases.map(ph => `
      <div class="ct-phase">
        <div class="ct-phase-h"><span>${esc(ph.title)}</span><span class="ct-phase-range">${esc(ph.range)}</span></div>
        <ul>${ph.items.length ? ph.items.map(it => `<li><span class="ct-kind ${it.kind}">${esc(it.kind)}</span>${it.route ? '<a class="ct-link-plain" data-go="' + esc(it.route) + '">' + esc(it.label) + '</a>' : esc(it.label)}</li>`).join('') : '<li>Nothing outstanding — you\'re on track here.</li>'}</ul>
      </div>`).join('');
    return `
      <div class="ct-section-h" style="display:flex;align-items:center">Study plan <span class="ct-plan-toggle">${toggle}</span></div>
      <p class="ct-change" style="margin:-6px 0 12px">Adapts to your progress — mastered topics and completed labs drop off automatically.</p>
      ${phases}`;
  }

  function cramHTML(cert) {
    const cram = TV.CertEngine.certCram(cert);
    const weak = cram.weakTopics.length
      ? '<div class="ct-chips">' + cram.weakTopics.map(t => '<a class="ct-chip" data-go="' + esc(t.route) + '">' + esc(t.label) + ' ' + t.score + '%</a>').join('') + '</div>'
      : '<p class="ct-change" style="margin:4px 0">No weak topics flagged yet — take a practice exam or rate topics to populate this.</p>';
    const cmp = cram.comparisons.length ? '<table class="ct-cmp">' + cram.comparisons.map(c => `
      <tr><td class="ct-cmp-a">${esc(c.a)}</td><td>${esc(c.whenA)}</td></tr>
      <tr><td class="ct-cmp-a">${esc(c.b)}</td><td>${esc(c.whenB)}</td></tr>
      <tr><td></td><td class="ct-cmp-note">${esc(c.note)}${c.supplementary ? ' (supplementary)' : ''}</td></tr>`).join('') + '</table>' : '';
    const traps = cram.traps.map(t => `<div class="ct-trap"><div class="ct-trap-t">⚠ ${esc(t.trap)}</div><div class="ct-trap-r">${esc(t.reality)}</div></div>`).join('');
    return `
      <div class="ct-section-h">Cram sheet</div>
      <p class="ct-change" style="margin:-6px 0 10px">Last-mile essentials: your weak topics, the comparisons the exam leans on, and the classic traps.</p>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted,#8b949e);margin-bottom:6px">Weak topics to revise</div>
      ${weak}
      ${cmp ? '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted,#8b949e);margin:14px 0 2px">Know when to use which</div>' + cmp : ''}
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted,#8b949e);margin:10px 0 6px">Common exam traps</div>
      ${traps}`;
  }

  function detailHTML(cert) {
    const rd = TV.CertEngine.certReadiness(cert);
    const beta = cert.beta ? '<span class="ct-badge beta">Beta</span>' : '';
    const betaNote = cert.betaNote ? `<div class="ct-note beta"><b>Beta:</b> ${esc(cert.betaNote)}</div>` : '';
    const updateNote = cert.contentUpdate ? `<div class="ct-note beta">⚠ <b>Content update review:</b> some weightings/objectives for this track are provisional — re-verify against the official guide (last verified ${esc(cert.lastVerified)}).</div>` : '';
    const read = (k, v) => `<div class="ct-read"><div class="ct-read-k">${k}</div><div class="ct-read-v">${v == null ? '—' : v + '%'}</div></div>`;
    const domains = rd.domains.map(d => `
      <div class="ct-dom">
        <div class="ct-dom-top"><span class="ct-dom-name">${esc(d.name)}</span><span class="ct-dom-w">${esc(String(d.weight))}% of exam · ${d.score}% ready</span></div>
        <div class="ct-dom-bar"><div class="ct-dom-fill ${lvlClass(d.score)}" style="width:${d.score}%"></div></div>
        ${d.objectives.map(objHTML).join('')}
      </div>`).join('');
    const cap = cert.capstone ? `
      <div class="ct-capstone">
        <div class="ct-dom-name">🏗 Capstone — ${esc(cert.capstone.title)}</div>
        <div class="ct-flow">${cert.capstone.flow.map((s, i) => (i ? '<i>→</i>' : '') + '<span>' + esc(s) + '</span>').join('')}</div>
      </div>` : '';
    return `
<div class="ct-wrap page-enter">
  <button class="ct-back" data-back="1">← All certifications</button>
  <div class="ct-d-head">
    <div style="flex:1;min-width:240px">
      <div class="ct-vendor">${esc(cert.vendor)} ${beta}</div>
      <div class="ct-d-title">${esc(cert.name)}</div>
      <div class="ct-code">${cert.examCode ? esc(cert.examCode) + ' · ' : ''}${esc(cert.level)} · ${esc(cert.difficulty)}</div>
      <div class="ct-examinfo">
        <span class="ct-pill">⏱ <b>${cert.examDuration} min</b></span>
        <span class="ct-pill">❓ <b>${esc(String(cert.questionCount))}</b> questions</span>
        <span class="ct-pill">✅ pass <b>${esc(cert.passingScore)}</b></span>
        <span class="ct-pill">💵 <b>${esc(cert.cost)}</b></span>
        <span class="ct-pill">🗓 valid <b>${esc(cert.validity)}</b></span>
      </div>
      <div class="ct-links" style="margin-top:12px">
        <a class="ct-link" href="${esc(cert.officialExamUrl)}" target="_blank" rel="noopener">Official page ↗</a>
        <a class="ct-link" href="${esc(cert.officialGuideUrl)}" target="_blank" rel="noopener">Exam guide ↗</a>
        ${cert.officialTrainingUrl ? `<a class="ct-link" href="${esc(cert.officialTrainingUrl)}" target="_blank" rel="noopener">Official training ↗</a>` : ''}
        ${cert.officialPracticeUrl ? `<a class="ct-link" href="${esc(cert.officialPracticeUrl)}" target="_blank" rel="noopener">Practice assessment ↗</a>` : ''}
      </div>
    </div>
    <div style="text-align:center">
      ${ring(rd.overall, 32)}
      <div class="ct-ring-pct">${rd.overall}%</div>
      <div class="ct-ring-tier">${esc(rd.tier)}</div>
      <button class="ct-btn" style="margin-top:8px" data-goal="${esc(cert.certificationId)}">Set as my goal</button>
      ${TV.CertExam && TV.CertExam.available(cert.certificationId)
        ? `<button class="ct-btn ct-btn--ghost" style="margin-top:6px" data-exam="${esc(cert.certificationId)}">Take practice exam</button>`
        : `<div style="margin-top:6px;font-size:11px;color:var(--text-muted,#8b949e)">Practice exam: coming soon</div>`}
    </div>
  </div>
  ${betaNote}${updateNote}
  <div class="ct-readbar">
    ${read('Theory', rd.theory)}${read('Practice exam', rd.practiceExam)}${read('Hands-on', rd.handsOn)}${read('Troubleshooting', rd.troubleshooting)}
  </div>
  <div class="ct-section-h">Exam domains &amp; objectives (official weightings)</div>
  ${domains}
  ${planHTML(cert)}
  ${labsHTML(cert)}
  ${cramHTML(cert)}
  ${cap}
  <div class="ct-change">Exam version: <b>${esc(cert.version || cert.examCode || '—')}</b> · Status: <b>${esc(cert.status)}</b> · Last verified: <b>${esc(cert.lastVerified)}</b> · Source: official vendor exam guide.</div>
</div>`;
  }

  /* ── Render / events ─────────────────────────────────────────── */
  function render(container) {
    injectStyles();
    _container = container;
    const scroll = container.scrollTop;
    container.className = '';
    const cert = _selected && TV.Certifications.byId(_selected);
    container.innerHTML = cert ? detailHTML(cert) : centerHTML();
    container.scrollTop = _selected ? 0 : scroll;
    if (!_wired) {
      _wired = true;
      container.addEventListener('click', onClick);
      _onProgress = () => { if (TV.currentScreenId && TV.currentScreenId() === 'certifications') render(container); };
      document.addEventListener('progress:change', _onProgress);
    }
  }

  function onClick(e) {
    const open = e.target.closest('[data-open]');
    if (open) { _selected = open.getAttribute('data-open'); render(_container); return; }
    if (e.target.closest('[data-back]')) { _selected = null; render(_container); return; }
    const exam = e.target.closest('[data-exam]');
    if (exam) { if (TV.CertExam) TV.CertExam.open(exam.getAttribute('data-exam')); return; }
    const labDone = e.target.closest('[data-lab-done]');
    if (labDone) { e.stopPropagation(); const id = labDone.getAttribute('data-lab-done'); TV.Progress.setLabDone(id, !TV.Progress.isLabDone(id)); return; }
    const labTog = e.target.closest('[data-lab-toggle]');
    if (labTog) { const id = labTog.getAttribute('data-lab-toggle'); _labOpen[id] = !_labOpen[id]; render(_container); return; }
    const planDay = e.target.closest('[data-plan-day]');
    if (planDay) { _planDays = parseInt(planDay.getAttribute('data-plan-day'), 10) || 30; render(_container); return; }
    const goal = e.target.closest('[data-goal]');
    if (goal) {
      const id = goal.getAttribute('data-goal');
      TV.Progress.setGoal('certification'); TV.Progress.setTargetCert(id);
      if (TV.Toast && TV.Toast.show) TV.Toast.show('Goal set: preparing for ' + (TV.Certifications.byId(id) || {}).name);
      else goal.textContent = '✓ Goal set';
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); const r = go.getAttribute('data-go'); if (r) location.hash = r.replace(/^#/, ''); }
  }

  function destroy() {
    if (_onProgress) { document.removeEventListener('progress:change', _onProgress); _onProgress = null; }
    _wired = false;
    _selected = null; // re-enter at the center next time
  }

  const MODULE = { id: 'certifications', title: 'Certification Center', group: 'Certifications', render, destroy };

  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      if (!desc.navGroups.some(g => g.id === 'certs')) {
        // place right after the "For You" group if present, else at top
        const grp = { id: 'certs', label: 'Certifications', items: [{ id: 'certifications', label: 'Certification Center', icon: 'check-square', available: true }] };
        const foryou = desc.navGroups.findIndex(g => g.id === 'for-you');
        if (foryou !== -1) desc.navGroups.splice(foryou + 1, 0, grp); else desc.navGroups.unshift(grp);
      }
    });
  }

  register();
  TV.CertificationsView = { register, render, destroy };
})();
