/* ============================================================
   Readiness Dashboard — aggregates every sviz-prog-<area> record
   into coverage + performance per competency, recommends the
   weakest area, and links to practice. Reflects tool activity
   only — not a prediction of interview success.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.SnowflakeViz = window.SnowflakeViz || {});

  const LABEL = {
    troubleshooting: 'Production Troubleshooting', 'de-scenarios': 'Snowflake + Data Eng', failure: 'Architecture Failure',
    'query-opt': 'Query Optimization', cost: 'Cost Decisions',
    decisions: 'Feature Decisions', sql: 'SQL Scenarios', traps: 'Interview Traps', 'cert-interview': 'Cert → Interview',
    design: 'System Design', 'rbac-lab': 'RBAC Design', 'loading-lab': 'Data Loading',
    chains: 'Follow-Up Chains', answers: 'Tiered Answers', 'case-study': 'E2E Case Study',
  };
  const MODULE = {
    troubleshooting: 'lab-troubleshooting', 'de-scenarios': 'lab-de', failure: 'lab-failure',
    'query-opt': 'lab-query-opt', cost: 'lab-cost',
    decisions: 'lab-decisions', sql: 'lab-sql', traps: 'lab-traps', 'cert-interview': 'lab-cert-interview',
    design: 'lab-design', 'rbac-lab': 'lab-rbac', 'loading-lab': 'lab-loading',
    chains: 'lab-chains', answers: 'lab-answers', 'case-study': 'lab-case',
  };
  const GROUPS = [
    { label: '🚨 Troubleshoot', areas: ['troubleshooting', 'de-scenarios', 'failure'] },
    { label: '🔎 Optimize', areas: ['query-opt', 'cost'] },
    { label: '🎯 Practice', areas: ['decisions', 'sql', 'traps', 'cert-interview'] },
    { label: '🏗️ Design', areas: ['design', 'rbac-lab', 'loading-lab'] },
    { label: '🎤 Interview', areas: ['chains', 'answers', 'case-study'] },
  ];

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function stat(area) {
    const total = (viz.ScenarioBank[area] || []).length;
    const s = viz.ProgressStore ? viz.ProgressStore.summary(area, total) : { attempted: 0, correct: 0, total, pct: 0 };
    return { area, total, attempted: s.attempted, correct: s.correct, pct: total ? Math.round(s.attempted / total * 100) : 0 };
  }

  const M = {
    render(canvas) {
      const rerender = () => this._draw(canvas);
      this._draw(canvas);
      document.addEventListener('sviz:progress', rerender);
      this._rerender = rerender;
      return { destroy() { document.removeEventListener('sviz:progress', rerender); } };
    },

    _draw(canvas) {
      canvas.innerHTML = '';
      const page = el('div', 'mod-page');
      page.appendChild(el('div', 'mod-header',
        `<div class="mod-eyebrow">📊 Progress</div><h1 class="mod-title">Interview Readiness Dashboard</h1>
         <p class="mod-subtitle">Your coverage and performance across every lab. These numbers reflect activity in this tool only — not a prediction of interview success.</p>`));

      // Collect stats
      const all = [];
      GROUPS.forEach(g => g.areas.forEach(a => all.push(stat(a))));
      const totAttempted = all.reduce((s, x) => s + x.attempted, 0);
      const totScenarios = all.reduce((s, x) => s + x.total, 0);
      const totCorrect = all.reduce((s, x) => s + x.correct, 0);
      const overallPct = totScenarios ? Math.round(totAttempted / totScenarios * 100) : 0;

      // Overall + recommendation row
      const top = el('div', 'dash-top');
      top.appendChild(el('div', 'dash-overall',
        `<div class="dash-ring" style="--pct:${overallPct}"><span>${overallPct}%</span></div>
         <div class="dash-overall-meta">
           <h3>Overall coverage</h3>
           <p><b>${totAttempted}</b> of <b>${totScenarios}</b> scenarios attempted${totCorrect ? ` · <b>${totCorrect}</b> graded correct` : ''}</p>
         </div>`));

      // Weakest area = lowest coverage pct (prefer started-but-low, else unstarted)
      const weakest = all.slice().sort((a, b) => a.pct - b.pct || a.attempted - b.attempted)[0];
      if (weakest) {
        const rec = el('div', 'dash-rec');
        rec.innerHTML = `<h3>🎯 Recommended practice</h3>
          <p>Your lowest coverage is <b>${esc(LABEL[weakest.area])}</b> (${weakest.attempted}/${weakest.total}). Practicing it will move your readiness the most.</p>`;
        const btn = el('button', 'lab-next', 'Practice ' + LABEL[weakest.area] + ' →');
        btn.type = 'button';
        btn.addEventListener('click', () => viz.navigate(MODULE[weakest.area]));
        rec.appendChild(btn);
        top.appendChild(rec);
      }
      page.appendChild(top);

      // Last mock result, if any
      let mock = null;
      try { mock = JSON.parse(localStorage.getItem('sviz-mock-last') || 'null'); } catch (_) {}
      if (mock && mock.overall != null) {
        const m = el('div', 'dash-mock');
        m.innerHTML = `<h3>🎙️ Last mock interview</h3>
          <p><b>${esc(mock.modeLabel || mock.mode)}</b> · ${esc(mock.date || '')} · self-rated score <b>${mock.overall}%</b> over ${mock.answered || 0} questions.</p>`;
        const b = el('button', 'lab-back', 'Start another mock →');
        b.type = 'button';
        b.addEventListener('click', () => viz.navigate('lab-mock'));
        m.appendChild(b);
        page.appendChild(m);
      }

      // Grouped bars
      GROUPS.forEach(g => {
        const sec = el('div', 'dash-group');
        sec.appendChild(el('h3', 'dash-group-title', g.label));
        g.areas.forEach(a => {
          const s = stat(a);
          const row = el('div', 'dash-row');
          const level = s.pct >= 67 ? 'hi' : s.pct >= 34 ? 'mid' : 'lo';
          row.innerHTML =
            `<button class="dash-row-label" data-mod="${MODULE[a]}">${esc(LABEL[a])}</button>
             <div class="dash-bar"><div class="dash-bar-fill ${level}" style="width:${s.pct}%"></div></div>
             <span class="dash-row-num">${s.attempted}/${s.total}${s.correct ? ` · ${s.correct}✓` : ''}</span>`;
          row.querySelector('.dash-row-label').addEventListener('click', () => viz.navigate(MODULE[a]));
          sec.appendChild(row);
        });
        page.appendChild(sec);
      });

      page.appendChild(el('p', 'dash-note',
        'Coverage = scenarios attempted ÷ available. “✓” counts graded scenarios you answered correctly (troubleshooting, decisions, design, traps). Reveal-based labs (chains, answers, SQL, case study) count as attempted once completed. Progress is stored locally in your browser.'));

      canvas.appendChild(page);
    },
  };

  viz.Modules = viz.Modules || {};
  viz.Modules.labDashboard = M;
})();
