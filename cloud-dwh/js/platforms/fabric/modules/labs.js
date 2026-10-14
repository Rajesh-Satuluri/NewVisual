/* ============================================================
   Fabric — Practice / Interview labs (ScenarioEngine wrappers +
   interview-prep + readiness dashboard).
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fabric = viz.P.fabric || {};
  const B = (viz.P.fabric.Modules = viz.P.fabric.Modules || {});
  const SE = viz.ScenarioEngine;

  function lab(area, renderer, eyebrow, title, intro) {
    return { render(canvas) {
      if (!SE) { canvas.innerHTML = '<div class="placeholder-msg"><p>Scenario engine unavailable.</p></div>'; return { destroy() {} }; }
      return SE.labView(canvas, { area, renderer, eyebrow, title, intro });
    }};
  }

  B.labTroubleshooting = lab('fb-troubleshooting', 'investigation', '🚨 Troubleshoot', 'Production Troubleshooting Lab',
    'Real Fabric symptoms — endpoint metadata sync, Direct Lake fallback, capacity throttling. Investigate step by step to root cause, resolution, prevention, and an interview-quality answer.');
  B.labFailure = lab('fb-failure', 'chain', '🚨 Troubleshoot', 'Architecture Failure Walkthrough',
    'Trace how a shared capacity can make unrelated workloads slow together — and how to isolate and prevent it.');
  B.labDe = lab('fb-de', 'investigation', '🔗 Data Eng', 'Fabric + Data Engineering',
    'Diagnose Fabric inside end-to-end pipelines — Direct Lake guardrails, metadata sync, and ingestion choices.');
  B.labPerfOpt = lab('fb-perf-opt', 'decision', '🔎 Optimize', 'Performance Optimization Lab',
    'Choose the right performance lever — Direct Lake, V-Order, capacity sizing — with the rationale behind each call.');
  B.labCost = lab('fb-cost', 'decision', '💰 Optimize', 'Cost Decision Lab',
    'Right-size F-SKUs, pause/resume, and use bursting/smoothing — pick the most cost-effective option and understand the trade-offs.');
  B.labDecisions = lab('fb-decisions', 'decision', '⚖️ Practice', 'Feature Decisions',
    'When to use which Fabric item — Warehouse vs Lakehouse, shortcuts vs mirroring — with senior-level reasoning.');
  B.labSql = lab('fb-sql', 'sql', '🧮 Practice', 'SQL Scenarios',
    'Fabric Warehouse T-SQL challenges — dedup and idempotent MERGE upserts, written the T-SQL way (no QUALIFY).');
  B.labTraps = lab('fb-traps', 'traps', '⚠️ Practice', 'Interview Traps',
    'Common Fabric misconceptions. See the myth, why it is wrong, the correct model, and an interview-safe way to say it.');
  B.labDesign = lab('fb-design', 'design', '🏗️ Design', 'System Design Lab',
    'Design a Fabric analytics platform step by step — ingestion, medallion, Direct Lake serving — then review the reference architecture.');
  B.labSecurity = lab('fb-security', 'design', '🔐 Design', 'Security Design Lab',
    'Model least-privilege access with RLS, CLS, dynamic data masking, and Purview governance for mixed audiences.');
  B.labLoading = lab('fb-loading', 'design', '📥 Design', 'Data Loading Lab',
    'Design ingestion across shortcuts, mirroring, pipelines, and dataflows — minimizing copies while keeping BI fresh.');
  B.labChains = lab('fb-chains', 'chain', '🎤 Interview', 'Follow-Up Chains',
    'The interviewer starts simple and drills deeper. Work each progressive follow-up to senior depth.');
  B.labAnswers = lab('fb-answers', 'tiered', '🌟 Interview', 'Bad → Good → Senior',
    'See how the same answer sounds at three levels, plus 30-second, 90-second, and 3-minute versions.');
  B.labCase = lab('fb-case', 'chain', '🎬 Interview', 'E2E Case Study',
    'A full Netflix-style analytics case on Fabric (illustrative) — design it and defend each decision.');
  B.labCertInterview = lab('fb-cert-interview', 'chain', '🎓 Practice', 'Cert → Interview',
    'Turn DP-600/DP-700 facts into interview-quality explanations with realistic follow-ups.');
  B.labMock = lab('fb-mock', 'chain', '🎙️ Interview', 'Mock Fabric Interview',
    'A rapid mixed round across OneLake, storage, BI, and governance. Answer out loud, then reveal a strong response.');

  /* interview-prep: aggregate Q&A for the active (Fabric) platform */
  B.interviewPrep = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">💬 Practice</div>' +
      '<h1 class="mod-title">Interview Prep</h1>' +
      '<p class="mod-subtitle">Every curated Microsoft Fabric interview question, grouped by topic. Expand any question to reveal a strong, concise answer.</p></div>';
    const IB = viz.InterviewBank || {};
    const nav = (viz.NAV_GROUPS || []).flatMap(g => g.items);
    let total = 0;
    nav.forEach(item => {
      const items = IB[item.id];
      if (!items || !items.length) return;
      total += items.length;
      const group = document.createElement('div'); group.className = 'home-module-group';
      const h = document.createElement('div'); h.className = 'home-module-group-title';
      h.textContent = item.icon + '  ' + item.label + '  (' + items.length + ')';
      h.style.cursor = 'pointer';
      h.addEventListener('click', () => viz.navigate && viz.navigate(item.id));
      group.appendChild(h);
      if (viz.QAAccordion) group.appendChild(viz.QAAccordion.create(items.map(x => ({ q: x.q, a: x.a, difficulty: x.difficulty }))));
      page.appendChild(group);
    });
    if (!total) page.insertAdjacentHTML('beforeend', '<div class="placeholder-msg"><p class="text-muted">Interview questions are being added.</p></div>');
    canvas.appendChild(page);
    return { destroy() {} };
  }};

  /* lab-dashboard: readiness across the practice areas */
  const AREAS = [
    ['fb-troubleshooting', 'Troubleshooting'], ['fb-perf-opt', 'Performance Optimization'],
    ['fb-cost', 'Cost Decisions'], ['fb-decisions', 'Feature Decisions'],
    ['fb-sql', 'SQL Scenarios'], ['fb-traps', 'Interview Traps'],
    ['fb-failure', 'Architecture Failure'], ['fb-de', 'Fabric + Data Eng'],
    ['fb-design', 'System Design'], ['fb-security', 'Security Design'], ['fb-loading', 'Data Loading'],
    ['fb-chains', 'Follow-Up Chains'], ['fb-answers', 'Bad→Good→Senior'],
    ['fb-case', 'E2E Case Study'], ['fb-cert-interview', 'Cert → Interview'], ['fb-mock', 'Mock Interview'],
  ];
  B.labDashboard = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">📈 Progress</div>' +
      '<h1 class="mod-title">Readiness Dashboard</h1>' +
      '<p class="mod-subtitle">Your progress across every Fabric practice lab. Attempt scenarios to fill these in.</p></div>';
    const bank = viz.ScenarioBank || {};
    const PS = viz.ProgressStore;
    const grid = document.createElement('div'); grid.className = 'home-module-grid'; grid.style.marginTop = '1rem';
    let attempted = 0, totalAll = 0;
    AREAS.forEach(([area, label]) => {
      const total = (bank[area] || []).length; totalAll += total;
      const s = PS ? PS.summary(area, total) : { attempted: 0, correct: 0, total, pct: 0 };
      attempted += s.attempted;
      const pct = total ? Math.round((s.attempted / total) * 100) : 0;
      const card = document.createElement('div'); card.className = 'home-module-card'; card.style.cursor = 'default';
      card.innerHTML =
        '<div class="home-module-info"><div class="home-module-label">' + label + '</div>' +
        '<div class="home-module-desc">' + s.attempted + ' / ' + total + ' attempted' + (s.correct ? ' · ' + s.correct + ' correct' : '') + '</div>' +
        '<div style="height:6px;border-radius:4px;background:var(--border);margin-top:.5rem;overflow:hidden;">' +
        '<div style="height:100%;width:' + pct + '%;background:var(--blue);"></div></div></div>';
      grid.appendChild(card);
    });
    const summary = document.createElement('div'); summary.className = 'home-stats-strip'; summary.style.marginTop = '1.25rem';
    const overallPct = totalAll ? Math.round((attempted / totalAll) * 100) : 0;
    summary.innerHTML =
      '<div class="home-stat-card"><div class="home-stat-value">' + totalAll + '</div><div class="home-stat-label">Total scenarios</div></div>' +
      '<div class="home-stat-card"><div class="home-stat-value">' + attempted + '</div><div class="home-stat-label">Attempted</div></div>' +
      '<div class="home-stat-card"><div class="home-stat-value">' + overallPct + '%</div><div class="home-stat-label">Coverage</div></div>';
    page.appendChild(summary); page.appendChild(grid);
    canvas.appendChild(page);
    return { destroy() {} };
  }};
})();
