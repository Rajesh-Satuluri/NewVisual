/* ============================================================
   Cloud DE Visualizer — Test Yourself quiz (Block E1).
   A scored multiple-choice quiz per active format, opened from the
   topbar quiz button. Best score persists per format
   (cde-<fmt>-quiz-best). Decoupled: wires via the DOM + TV.QuizBank,
   listens to app:format/app:navigate to keep the button relevant.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;

  const LABEL = { azure: 'Azure', databricks: 'Databricks', 'multi-cloud': 'Cross-Cloud' };

  function bank() {
    const f = TV.currentFormat && TV.currentFormat();
    const b = (TV.QuizBank && TV.QuizBank[f]) || null;
    return b && b.length ? { fmt: f, questions: b } : null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  function injectStyles() {
    if (document.getElementById('quiz-styles')) return;
    const s = document.createElement('style');
    s.id = 'quiz-styles';
    s.textContent = `
.quiz-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); z-index:9000;
  display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .2s; }
.quiz-backdrop.visible { opacity:1; pointer-events:all; }
.quiz-box { background:var(--bg-2); border:1px solid var(--border-default); border-radius:16px; width:640px; max-width:100%;
  max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.5); }
.quiz-head { padding:18px 22px; border-bottom:1px solid var(--border-default); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
.quiz-head h2 { font-size:16px; font-weight:800; margin:0; color:var(--text-primary); }
.quiz-head .quiz-sub { font-size:11.5px; color:var(--text-muted); margin-top:2px; }
.quiz-close { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:20px; line-height:1; padding:4px 8px; border-radius:6px; }
.quiz-close:hover { background:var(--bg-3); color:var(--text-primary); }
.quiz-body { padding:20px 22px; overflow-y:auto; }
.quiz-progress { height:4px; background:var(--bg-4); border-radius:2px; overflow:hidden; margin-bottom:18px; }
.quiz-progress-fill { height:100%; background:var(--brand); transition:width .25s var(--ease); }
.quiz-qnum { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:8px; }
.quiz-q { font-size:16px; font-weight:700; color:var(--text-primary); line-height:1.5; margin-bottom:16px; }
.quiz-opts { display:grid; gap:9px; }
.quiz-opt { display:flex; align-items:flex-start; gap:11px; text-align:left; padding:12px 14px; background:var(--bg-1);
  border:1px solid var(--border-default); border-radius:10px; cursor:pointer; font:inherit; color:var(--text-secondary);
  font-size:13.5px; line-height:1.5; transition:border-color .12s, background .12s; width:100%; }
.quiz-opt:hover:not(:disabled) { border-color:var(--brand); }
.quiz-opt:disabled { cursor:default; }
.quiz-opt .quiz-letter { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--bg-4); color:var(--text-muted);
  font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.quiz-opt.correct { border-color:var(--green); background:var(--green-subtle); color:var(--text-primary); }
.quiz-opt.correct .quiz-letter { background:var(--green); color:#fff; }
.quiz-opt.wrong { border-color:var(--red); background:var(--red-subtle); color:var(--text-primary); }
.quiz-opt.wrong .quiz-letter { background:var(--red); color:#fff; }
.quiz-why { margin-top:14px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:8px; padding:11px 13px;
  font-size:12.5px; color:var(--text-secondary); line-height:1.6; display:none; }
.quiz-why.show { display:block; }
.quiz-why b { color:var(--text-primary); }
.quiz-foot { padding:14px 22px; border-top:1px solid var(--border-default); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
.quiz-score { font-size:12.5px; color:var(--text-muted); }
.quiz-btn { background:var(--brand-gradient); color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer; }
.quiz-btn:disabled { opacity:.4; cursor:default; }
.quiz-btn--ghost { background:none; border:1px solid var(--border-default); color:var(--text-secondary); }
/* result */
.quiz-result { text-align:center; padding:14px 0 6px; }
.quiz-result-score { font-size:44px; font-weight:800; color:var(--brand); line-height:1; }
.quiz-result-total { font-size:16px; color:var(--text-muted); }
.quiz-result-msg { font-size:14px; color:var(--text-secondary); margin-top:12px; }
.quiz-result-best { font-size:12px; color:var(--text-muted); margin-top:8px; }
`;
    document.head.appendChild(s);
  }

  let root, state;

  function ensureRoot() {
    if (root) return root;
    injectStyles();
    root = document.createElement('div');
    root.className = 'quiz-backdrop';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Test yourself quiz');
    document.body.appendChild(root);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('visible')) close(); });
    return root;
  }

  function bestKey(fmt) { return 'cde-' + fmt + '-quiz-best'; }

  function open() {
    const b = bank();
    if (!b) return;
    ensureRoot();
    state = { fmt: b.fmt, qs: b.questions, i: 0, correct: 0, answered: false };
    renderQuestion();
    root.classList.add('visible');
  }

  function close() { if (root) root.classList.remove('visible'); }

  function renderQuestion() {
    const q = state.qs[state.i];
    const pct = Math.round((state.i / state.qs.length) * 100);
    root.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-head">
          <div>
            <h2>Test Yourself — ${esc(LABEL[state.fmt] || state.fmt)}</h2>
            <div class="quiz-sub">Question ${state.i + 1} of ${state.qs.length}</div>
          </div>
          <button class="quiz-close" aria-label="Close quiz">✕</button>
        </div>
        <div class="quiz-body">
          <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
          <div class="quiz-qnum">Question ${state.i + 1}</div>
          <div class="quiz-q">${esc(q.q)}</div>
          <div class="quiz-opts">
            ${q.options.map((o, k) => `
              <button class="quiz-opt" data-opt="${k}">
                <span class="quiz-letter">${String.fromCharCode(65 + k)}</span>
                <span>${esc(o)}</span>
              </button>`).join('')}
          </div>
          <div class="quiz-why"><b>Why:</b> <span class="quiz-why-text"></span></div>
        </div>
        <div class="quiz-foot">
          <span class="quiz-score">Score: ${state.correct} / ${state.i + (state.answered ? 1 : 0)}</span>
          <button class="quiz-btn quiz-next" disabled>${state.i === state.qs.length - 1 ? 'See result' : 'Next →'}</button>
        </div>
      </div>`;
    root.querySelector('.quiz-close').addEventListener('click', close);
    root.querySelectorAll('.quiz-opt').forEach(btn => btn.addEventListener('click', () => choose(parseInt(btn.dataset.opt, 10))));
    root.querySelector('.quiz-next').addEventListener('click', next);
  }

  function choose(k) {
    if (state.answered) return;
    state.answered = true;
    const q = state.qs[state.i];
    const opts = root.querySelectorAll('.quiz-opt');
    opts.forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.answer) b.classList.add('correct');
      if (idx === k && k !== q.answer) b.classList.add('wrong');
    });
    if (k === q.answer) state.correct++;
    const why = root.querySelector('.quiz-why');
    root.querySelector('.quiz-why-text').textContent = q.why;
    why.classList.add('show');
    root.querySelector('.quiz-score').textContent = `Score: ${state.correct} / ${state.i + 1}`;
    root.querySelector('.quiz-next').disabled = false;
  }

  function next() {
    if (state.i === state.qs.length - 1) return finish();
    state.i++; state.answered = false;
    renderQuestion();
  }

  function finish() {
    const total = state.qs.length;
    const pct = Math.round((state.correct / total) * 100);
    let prevBest = 0;
    try { prevBest = parseInt(TV.ls.get(bestKey(state.fmt)) || '0', 10) || 0; } catch (e) {}
    const isBest = state.correct > prevBest;
    const best = Math.max(prevBest, state.correct);
    TV.ls.set(bestKey(state.fmt), String(best));
    const msg = pct === 100 ? 'Perfect — you’ve got this cold.' :
                pct >= 70 ? 'Strong. Review the ones you missed and you’re interview-ready.' :
                pct >= 40 ? 'Getting there — revisit the service pages for the misses.' :
                'Worth another pass through the pages before the interview.';
    root.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-head">
          <div><h2>Test Yourself — ${esc(LABEL[state.fmt] || state.fmt)}</h2><div class="quiz-sub">Complete</div></div>
          <button class="quiz-close" aria-label="Close quiz">✕</button>
        </div>
        <div class="quiz-body">
          <div class="quiz-result">
            <div><span class="quiz-result-score">${state.correct}</span><span class="quiz-result-total"> / ${total}</span></div>
            <div class="quiz-result-msg">${msg}</div>
            <div class="quiz-result-best">${isBest ? 'New best score!' : 'Best: ' + best + ' / ' + total}</div>
          </div>
        </div>
        <div class="quiz-foot">
          <button class="quiz-btn quiz-btn--ghost quiz-close2">Close</button>
          <button class="quiz-btn quiz-retry">Try again</button>
        </div>
      </div>`;
    root.querySelector('.quiz-close').addEventListener('click', close);
    root.querySelector('.quiz-close2').addEventListener('click', close);
    root.querySelector('.quiz-retry').addEventListener('click', open);
  }

  /* Wire the topbar quiz button: show it when the active format has a
     bank, hide it otherwise. */
  function syncButton() {
    const btn = document.getElementById('quiz-toggle');
    if (!btn) return;
    if (bank()) btn.hidden = false; else btn.hidden = true;
  }

  function init() {
    const btn = document.getElementById('quiz-toggle');
    if (btn) btn.addEventListener('click', open);
    document.addEventListener('app:format', syncButton);
    document.addEventListener('app:navigate', syncButton);
    syncButton();
    TV._openQuiz = open;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
