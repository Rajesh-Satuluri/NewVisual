/* ============================================================
   Redshift — Practice / Interview labs.
   Thin wrappers over the shared ScenarioEngine (content in
   data/scenarios.js, registered under rs-* areas), plus a
   Redshift interview-prep, readiness dashboard, and mock.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  const B = (viz.P.redshift.Modules = viz.P.redshift.Modules || {});
  const SE = viz.ScenarioEngine;

  function lab(area, renderer, eyebrow, title, intro) {
    return { render(canvas) {
      if (!SE) { canvas.innerHTML = '<div class="placeholder-msg"><p>Scenario engine unavailable.</p></div>'; return { destroy() {} }; }
      return SE.labView(canvas, { area, renderer, eyebrow, title, intro });
    }};
  }

  B.labTroubleshooting = lab('rs-troubleshooting', 'investigation', '🚨 Troubleshoot', 'Production Troubleshooting Lab',
    'Real Redshift production symptoms. Investigate step by step — read the evidence, avoid the wrong assumption, and reach the root cause, resolution, prevention, and an interview-quality answer.');
  B.labFailure = lab('rs-failure', 'chain', '🚨 Troubleshoot', 'Architecture Failure Walkthrough',
    'Trace how a single design choice (like distribution skew) can make a whole MPP cluster behave like one node.');
  B.labDe = lab('rs-de', 'investigation', '🔗 Data Eng', 'Redshift + Data Engineering',
    'Diagnose Redshift inside end-to-end pipelines — ingestion, loading, and orchestration pitfalls.');
  B.labQueryOpt = lab('rs-query-opt', 'decision', '🔎 Optimize', 'Query Optimization Lab',
    'Choose the right optimization for each symptom — pruning, distribution, and redistribution — with the rationale behind every call.');
  B.labCost = lab('rs-cost', 'decision', '💰 Optimize', 'Cost Decision Lab',
    'Provisioned vs Serverless, scale-up vs concurrency scaling — pick the most cost-effective option and understand the trade-offs.');
  B.labDecisions = lab('rs-decisions', 'decision', '⚖️ Practice', 'Feature Decisions',
    'When to use which Redshift feature — Spectrum vs COPY, datashares, and more — with the reasoning that separates a good answer from a senior one.');
  B.labSql = lab('rs-sql', 'sql', '🧮 Practice', 'SQL Scenarios',
    'Redshift-flavored SQL challenges — dedup, windowing, idempotent upserts — written the Redshift way (no QUALIFY).');
  B.labTraps = lab('rs-traps', 'traps', '⚠️ Practice', 'Interview Traps',
    'Common Redshift misconceptions. See the myth, why it is wrong, the correct model, and an interview-safe way to say it.');
  B.labDesign = lab('rs-design', 'design', '🏗️ Design', 'System Design Lab',
    'Design a Redshift analytics platform step by step — storage tiering, data modeling, and workload isolation — then review the reference architecture.');
  B.labRbac = lab('rs-rbac', 'design', '🔐 Design', 'RBAC Design Lab',
    'Model least-privilege access across teams with database roles, column/row-level security, and cross-account datashares.');
  B.labLoading = lab('rs-loading', 'design', '📥 Design', 'Data Loading Lab',
    'Design a high-throughput, idempotent ingestion strategy with COPY, staging merges, and federated lookups.');
  B.labChains = lab('rs-chains', 'chain', '🎤 Interview', 'Follow-Up Chains',
    'The interviewer starts simple and drills deeper. Work each progressive follow-up to senior depth.');
  B.labAnswers = lab('rs-answers', 'tiered', '🌟 Interview', 'Bad → Good → Senior',
    'See how the same answer sounds at three levels, plus 30-second, 90-second, and 3-minute versions.');
  B.labCase = lab('rs-case', 'chain', '🎬 Interview', 'E2E Case Study',
    'A full Netflix-style analytics case on Redshift — design it and defend each decision.');
  B.labCertInterview = lab('rs-cert-interview', 'chain', '🎓 Practice', 'Cert → Interview',
    'Turn certification facts into interview-quality explanations with realistic follow-ups.');

  /* Mock interview — a chain scenario mixing topics (registered here) */
  if (SE) {
    SE.register('rs-mock', [
      { id: 'rs-mock-1', area: 'rs-mock', category: 'Mock', difficulty: 'intermediate',
        title: 'Redshift mock interview (rapid round)',
        intro: 'A rapid mixed round across architecture, modeling, performance, and cost. Answer each, then reveal a strong response.',
        steps: [
          { q: 'Walk me through Redshift\'s architecture.', a: 'A leader node parses, plans, compiles to C++, and does final aggregation; clients connect only to it. Compute nodes are divided into slices that execute compiled segments in parallel over their data shard. Node type fixes vCPU/RAM/slice count. RA3 adds separation of compute and managed storage (RMS on S3).' },
          { q: 'How do distribution and sort keys differ?', a: 'Distribution style (KEY/EVEN/ALL/AUTO) decides which slice stores each row — it governs join data movement; co-locating join partners avoids redistribution. Sort keys set physical row order so zone maps skip 1 MB blocks for range filters. Distribution is about joins; sort is about scan pruning.' },
          { q: 'A date-filtered query scans the whole table. Why and fix?', a: 'The table isn\'t sorted on the date column, so every block\'s min/max spans the range and zone maps can\'t skip. Fix by making the date the sort key (or loading sorted), not by adding nodes.' },
          { q: 'When do you pick Serverless over provisioned?', a: 'Serverless for spiky/intermittent workloads — it auto-scales and bills per second (RPU-hours) only while active. Steady, high-utilization workloads are usually cheaper on provisioned RA3 with reserved pricing.' },
          { q: 'Dashboards are slow under a 9am rush of users. What do you do?', a: 'That\'s concurrency, not per-query speed: enable concurrency scaling on the queue (transient clusters absorb the burst, daily free credits often cover it), and add materialized views + rely on result caching for repeated aggregates.' },
          { q: 'How would you query 5 years of cold S3 history occasionally?', a: 'Leave it in S3 and use Redshift Spectrum external tables — pay only for data scanned, join with hot local tables — rather than COPYing and storing data you rarely touch.' },
        ] },
    ]);
    B.labMock = lab('rs-mock', 'chain', '🎙️ Interview', 'Mock Redshift Interview',
      'A rapid mixed round across architecture, modeling, performance, and cost. Answer out loud, then reveal a strong response.');
  }

  /* ── interview-prep: aggregate Q&A for the active (Redshift) platform ── */
  B.interviewPrep = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">💬 Practice</div>' +
      '<h1 class="mod-title">Interview Prep</h1>' +
      '<p class="mod-subtitle">Every curated Redshift interview question, grouped by topic. Expand any question to reveal a strong, concise answer.</p></div>';
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

  /* ── lab-dashboard: readiness across the practice areas ── */
  const AREAS = [
    ['rs-troubleshooting', 'Troubleshooting'], ['rs-query-opt', 'Query Optimization'],
    ['rs-cost', 'Cost Decisions'], ['rs-decisions', 'Feature Decisions'],
    ['rs-sql', 'SQL Scenarios'], ['rs-traps', 'Interview Traps'],
    ['rs-failure', 'Architecture Failure'], ['rs-de', 'Redshift + Data Eng'],
    ['rs-design', 'System Design'], ['rs-rbac', 'RBAC Design'], ['rs-loading', 'Data Loading'],
    ['rs-chains', 'Follow-Up Chains'], ['rs-answers', 'Bad→Good→Senior'],
    ['rs-case', 'E2E Case Study'], ['rs-cert-interview', 'Cert → Interview'], ['rs-mock', 'Mock Interview'],
  ];
  B.labDashboard = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">📈 Progress</div>' +
      '<h1 class="mod-title">Readiness Dashboard</h1>' +
      '<p class="mod-subtitle">Your progress across every Redshift practice lab. Attempt scenarios to fill these in.</p></div>';
    const bank = viz.ScenarioBank || {};
    const PS = viz.ProgressStore;
    const grid = document.createElement('div'); grid.className = 'home-module-grid'; grid.style.marginTop = '1rem';
    let attempted = 0, totalAll = 0;
    AREAS.forEach(([area, label]) => {
      const total = (bank[area] || []).length;
      totalAll += total;
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
    page.appendChild(summary);
    page.appendChild(grid);
    canvas.appendChild(page);
    return { destroy() {} };
  }};
})();
