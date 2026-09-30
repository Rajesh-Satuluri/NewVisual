/* ============================================================
   Mock Interview — timed sessions that sample questions from every
   scenario bank, hide them in advance, and end with a self-assessed
   per-dimension breakdown. Free-text answers can't be auto-graded
   without an LLM (out of scope), so grading is honest self-rating.
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
    'query-opt': 'lab-query-opt', cost: 'lab-cost', decisions: 'lab-decisions', sql: 'lab-sql',
    traps: 'lab-traps', 'cert-interview': 'lab-cert-interview', design: 'lab-design', 'rbac-lab': 'lab-rbac',
    'loading-lab': 'lab-loading', chains: 'lab-chains', answers: 'lab-answers', 'case-study': 'lab-case',
  };
  const MODES = {
    rapid:  { label: '15-minute rapid fire', minutes: 15, n: 10, desc: 'Concept recall and quick judgment across the fundamentals.',
              areas: ['answers', 'traps', 'chains', 'decisions', 'cert-interview'] },
    tech:   { label: '30-minute technical', minutes: 30, n: 12, desc: 'Concepts plus scenarios, troubleshooting, and SQL.',
              areas: ['troubleshooting', 'query-opt', 'cost', 'decisions', 'sql', 'answers', 'loading-lab'] },
    senior: { label: 'Senior Data Engineer', minutes: 30, n: 10, desc: 'Architecture, production incidents, optimization, and follow-ups.', difficulty: 'advanced',
              areas: ['design', 'troubleshooting', 'de-scenarios', 'rbac-lab', 'cost', 'chains', 'case-study'] },
  };

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Turn any scenario into a uniform { area, prompt, model }.
  function normalize(area, s) {
    switch (area) {
      case 'answers': return { area, prompt: s.question, model: 'Senior answer:\n' + (s.senior || s.min3 || '') };
      case 'traps': return { area, prompt: 'True, or a trap?\n\n“' + s.myth + '”', model: 'It\'s a trap.\n\n' + s.correct + '\n\nInterview-safe: ' + s.interviewSafe };
      case 'chains': return { area, prompt: (s.title || '') + '\n' + (s.intro || ''), model: (s.steps || []).map((x, i) => 'Q' + (i + 1) + ': ' + x.q + '\n→ ' + x.a).join('\n\n') };
      case 'case-study': return { area, prompt: (s.title || '') + '\n' + (s.intro || ''), model: (s.steps || []).map((x, i) => 'Q' + (i + 1) + ': ' + x.q + '\n→ ' + x.a).join('\n\n') };
      case 'failure': return { area, prompt: (s.title || '') + '\n' + (s.intro || ''), model: (s.steps || []).map(x => 'Q: ' + x.q + '\n→ ' + x.a).join('\n\n') };
      case 'cert-interview': return { area, prompt: (s.steps && s.steps[1] ? s.steps[1].q : s.title), model: (s.steps && s.steps[1] ? s.steps[1].a : '') };
      case 'sql': return { area, prompt: (s.title || '') + '\n' + (s.scenario || ''), model: (s.steps || []).map(x => (x.q ? x.q + '\n' : '') + (x.sql ? x.sql + '\n' : '') + (x.a || '')).join('\n\n') };
      default: // investigation / decision / design
        return { area, prompt: (s.title || '') + '\n\n' + (s.symptom || s.scenario || s.requirements || s.question || ''),
                 model: s.interviewAnswer || (s.rationale && s.rationale.fit) || [s.rootCause, s.resolution].filter(Boolean).join(' ') || (s.architecture || '') };
    }
  }

  function pickQuestions(mode) {
    const bank = viz.ScenarioBank || {};
    let pool = [];
    mode.areas.forEach(area => (bank[area] || []).forEach(s => pool.push({ area, s })));
    if (mode.difficulty) {
      const hard = pool.filter(x => x.s.difficulty === mode.difficulty);
      if (hard.length >= mode.n) pool = hard;
    }
    shuffle(pool);
    // spread across areas: round-robin by area for variety
    const byArea = {};
    pool.forEach(x => (byArea[x.area] = byArea[x.area] || []).push(x));
    const order = shuffle(Object.keys(byArea));
    const out = [];
    let added = true;
    while (out.length < mode.n && added) {
      added = false;
      for (const a of order) { if (byArea[a].length && out.length < mode.n) { out.push(byArea[a].shift()); added = true; } }
    }
    return out.slice(0, mode.n).map(x => normalize(x.area, x.s));
  }

  const M = {
    render(canvas) {
      this._timer = null;
      this._landing(canvas);
      return { destroy: () => { if (this._timer) clearInterval(this._timer); } };
    },

    _landing(canvas) {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      canvas.innerHTML = '';
      const page = el('div', 'mod-page');
      page.appendChild(el('div', 'mod-header',
        `<div class="mod-eyebrow">🎤 Interview</div><h1 class="mod-title">Mock Snowflake Interview</h1>
         <p class="mod-subtitle">Timed sessions that draw unseen questions from every lab. Answer out loud or in your head, reveal a model answer, and self-rate. Scores are your own honest assessment, not auto-graded.</p>`));
      const grid = el('div', 'mock-modes');
      Object.keys(MODES).forEach(key => {
        const m = MODES[key];
        const card = el('button', 'mock-mode-card');
        card.type = 'button';
        card.innerHTML = `<div class="mock-mode-time">${m.minutes} min</div>
          <div class="mock-mode-title">${esc(m.label)}</div>
          <div class="mock-mode-desc">${esc(m.desc)}</div>
          <div class="mock-mode-n">${m.n} questions</div>`;
        card.addEventListener('click', () => this._start(canvas, key));
        grid.appendChild(card);
      });
      page.appendChild(grid);
      canvas.appendChild(page);
    },

    _start(canvas, key) {
      const mode = MODES[key];
      const questions = pickQuestions(mode);
      const state = { key, mode, questions, idx: 0, ratings: [], secondsLeft: mode.minutes * 60 };
      this._session(canvas, state);
    },

    _session(canvas, state) {
      const self = this;
      canvas.innerHTML = '';
      const page = el('div', 'mod-page');

      // header: progress + timer
      const bar = el('div', 'mock-bar');
      const prog = el('span', 'mock-prog');
      const timer = el('span', 'mock-timer');
      const quit = el('button', 'lab-back', 'End & score');
      quit.type = 'button';
      quit.addEventListener('click', () => self._results(canvas, state));
      bar.append(prog, timer, quit);
      page.appendChild(bar);

      const qWrap = el('div');
      page.appendChild(qWrap);
      canvas.appendChild(page);

      function fmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ':' + String(ss).padStart(2, '0'); }
      function tick() {
        state.secondsLeft--;
        timer.textContent = '⏱️ ' + fmt(Math.max(0, state.secondsLeft));
        timer.classList.toggle('low', state.secondsLeft <= 60);
        if (state.secondsLeft <= 0) { clearInterval(self._timer); self._timer = null; self._results(canvas, state); }
      }
      if (self._timer) clearInterval(self._timer);
      timer.textContent = '⏱️ ' + fmt(state.secondsLeft);
      self._timer = setInterval(tick, 1000);

      function renderQ() {
        if (state.idx >= state.questions.length) { clearInterval(self._timer); self._timer = null; return self._results(canvas, state); }
        const q = state.questions[state.idx];
        prog.textContent = `Question ${state.idx + 1} / ${state.questions.length}`;
        qWrap.innerHTML = '';
        const card = el('div', 'mock-q');
        card.appendChild(el('div', 'mock-q-dim', LABEL[q.area] || q.area));
        card.appendChild(el('div', 'mock-q-prompt', esc(q.prompt)));
        const reveal = el('button', 'lab-next', 'Reveal model answer');
        reveal.type = 'button';
        reveal.addEventListener('click', () => {
          reveal.remove();
          card.appendChild(el('div', 'mock-model', esc(q.model)));
          card.appendChild(el('div', 'mock-rate-label', 'How did you do?'));
          const rate = el('div', 'mock-rate');
          [['Got it', 1, 'got'], ['Partial', 0.5, 'partial'], ['Missed', 0, 'missed']].forEach(([lbl, val, cls]) => {
            const b = el('button', 'mock-rate-btn ' + cls, lbl);
            b.type = 'button';
            b.addEventListener('click', () => { state.ratings.push({ area: q.area, score: val }); state.idx++; renderQ(); });
            rate.appendChild(b);
          });
          card.appendChild(rate);
        });
        card.appendChild(reveal);
        qWrap.appendChild(card);
      }
      renderQ();
    },

    _results(canvas, state) {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      const self = this;
      canvas.innerHTML = '';
      const page = el('div', 'mod-page');
      page.appendChild(el('div', 'mod-header',
        `<div class="mod-eyebrow">🎤 Interview · Results</div><h1 class="mod-title">${esc(state.mode.label)} — Results</h1>
         <p class="mod-subtitle">Self-assessed. These reflect your own honest rating of how you answered, not an automatic grade.</p>`));

      const answered = state.ratings.length;
      const totalQ = state.questions.length;
      const sum = state.ratings.reduce((s, r) => s + r.score, 0);
      const overall = answered ? Math.round(sum / answered * 100) : 0;

      page.appendChild(el('div', 'dash-top',
        `<div class="dash-overall"><div class="dash-ring" style="--pct:${overall}"><span>${overall}%</span></div>
           <div class="dash-overall-meta"><h3>Self-rated score</h3>
             <p>Answered <b>${answered}</b> of <b>${totalQ}</b>${answered < totalQ ? ' (ran out of time)' : ''}.</p></div></div>`));

      // per-dimension
      const byDim = {};
      state.ratings.forEach(r => { (byDim[r.area] = byDim[r.area] || []).push(r.score); });
      const dims = Object.keys(byDim).map(a => {
        const arr = byDim[a]; const sc = Math.round(arr.reduce((s, x) => s + x, 0) / arr.length * 100);
        return { area: a, score: sc, count: arr.length };
      }).sort((a, b) => a.score - b.score);

      const sec = el('div', 'dash-group');
      sec.appendChild(el('h3', 'dash-group-title', 'By dimension'));
      dims.forEach(d => {
        const level = d.score >= 67 ? 'hi' : d.score >= 34 ? 'mid' : 'lo';
        const row = el('div', 'dash-row');
        row.innerHTML = `<button class="dash-row-label" data-mod="${MODULE[d.area]}">${esc(LABEL[d.area] || d.area)}</button>
          <div class="dash-bar"><div class="dash-bar-fill ${level}" style="width:${d.score}%"></div></div>
          <span class="dash-row-num">${d.score}% · ${d.count}q</span>`;
        row.querySelector('.dash-row-label').addEventListener('click', () => viz.navigate(MODULE[d.area]));
        sec.appendChild(row);
      });
      page.appendChild(sec);

      // recommend weakest
      if (dims.length) {
        const w = dims[0];
        const rec = el('div', 'dash-rec');
        rec.innerHTML = `<h3>🎯 Focus next on</h3><p>Your weakest dimension was <b>${esc(LABEL[w.area] || w.area)}</b> (${w.score}%).</p>`;
        const b = el('button', 'lab-next', 'Practice ' + (LABEL[w.area] || w.area) + ' →');
        b.type = 'button'; b.addEventListener('click', () => viz.navigate(MODULE[w.area]));
        rec.appendChild(b);
        page.appendChild(rec);
      }

      const again = el('button', 'lab-back', '↺ New mock interview');
      again.type = 'button'; again.addEventListener('click', () => self._landing(canvas));
      page.appendChild(again);

      // persist last result for the dashboard
      try {
        localStorage.setItem('sviz-mock-last', JSON.stringify({
          mode: state.key, modeLabel: state.mode.label, date: new Date().toISOString().slice(0, 10),
          answered, overall, dimensions: dims,
        }));
      } catch (_) {}
      document.dispatchEvent(new CustomEvent('sviz:progress', { detail: { area: 'mock' } }));

      canvas.appendChild(page);
    },
  };

  viz.Modules = viz.Modules || {};
  viz.Modules.labMock = M;
})();
