/* ============================================================
   Loading Path — a guided learning-path + mastery strip injected
   at the top of every data-loading module.

   It turns the scattered loading modules (spread across Learn,
   Troubleshoot and Design nav groups) into one ordered journey with
   deep links, and doubles as a mastery tracker: each step shows
   whether you've started it or mastered it, pulled from the quiz
   best-scores, the flashcard SRS boxes, the decision-lab progress
   and the visited set. Click any step to jump there.
   ============================================================ */
(function () {
  'use strict';

  // Ordered journey. kind drives how mastery is computed.
  const PATH = [
    { id: 'data-loading',        label: 'Simulator',   icon: '📥', kind: 'quiz' },
    { id: 'loading-workshop',    label: 'Workshop',    icon: '🧰', kind: 'quiz' },
    { id: 'loading-incremental', label: 'Incremental', icon: '🔀', kind: 'quiz' },
    { id: 'loading-recovery',    label: 'Recovery',    icon: '🧯', kind: 'quiz' },
    { id: 'lab-loading',         label: 'Decision Lab',icon: '🎯', kind: 'scenario', area: 'loading-lab' },
    { id: 'loading-cheatsheet',  label: 'Cheat-Sheet', icon: '🗂️', kind: 'visit' },
    { id: 'loading-flashcards',  label: 'Flashcards',  icon: '🃏', kind: 'srs', deck: 'loading' },
  ];
  const IDS = {}; PATH.forEach((s, i) => { IDS[s.id] = i; });

  function _visited() {
    try { return new Set(JSON.parse(localStorage.getItem('cdwh-visited') || '[]')); }
    catch (_) { return new Set(); }
  }

  // Returns 'done' | 'started' | 'new' plus an optional detail string.
  function _state(step, visited) {
    try { return _computeState(step, visited); }
    catch (_) { return { s: visited.has(step.id) ? 'started' : 'new', d: '' }; }
  }

  function _computeState(step, visited) {
    const C = window.CDWH;
    if (step.kind === 'quiz' && C.Quiz) {
      const b = C.Quiz.bestScore(step.id);
      if (b && b.total && b.best / b.total >= 0.8) return { s: 'done', d: 'Quiz ' + b.best + '/' + b.total };
      if (b) return { s: 'started', d: 'Quiz ' + b.best + '/' + b.total };
      return { s: visited.has(step.id) ? 'started' : 'new', d: visited.has(step.id) ? 'Visited' : '' };
    }
    if (step.kind === 'srs' && C.P.snowflake.loadingFlashcards && C.SRS) {
      const ids = C.P.snowflake.loadingFlashcards.map(c => c.id);
      const st = C.SRS.stats(step.deck, ids);
      if (st.total && st.learned / st.total >= 0.8) return { s: 'done', d: st.learned + '/' + st.total + ' learned' };
      if (st.seen > 0) return { s: 'started', d: st.learned + '/' + st.total + ' learned' };
      return { s: 'new', d: '' };
    }
    if (step.kind === 'scenario' && C.ProgressStore) {
      const st = C.ProgressStore.summary(step.area);
      if (st.correct > 0) return { s: 'done', d: st.correct + ' solved' };
      if (st.attempted > 0) return { s: 'started', d: st.attempted + ' tried' };
      return { s: visited.has(step.id) ? 'started' : 'new', d: '' };
    }
    // 'visit' / fallback
    return { s: visited.has(step.id) ? 'done' : 'new', d: visited.has(step.id) ? 'Read' : '' };
  }

  const MARK = { done: '✓', started: '◐', new: '○' };

  function build(currentId) {
    const visited = _visited();
    let doneCount = 0;

    const wrap = document.createElement('section');
    wrap.className = 'lpath';
    const head = document.createElement('div');
    head.className = 'lpath-head';
    const title = document.createElement('span');
    title.className = 'lpath-title';
    title.textContent = 'Data-loading learning path';
    const score = document.createElement('span');
    score.className = 'lpath-score';
    head.append(title, score);
    wrap.appendChild(head);

    const track = document.createElement('div');
    track.className = 'lpath-track';
    track.setAttribute('data-noswipe', '');

    PATH.forEach((step, i) => {
      const st = _state(step, visited);
      if (st.s === 'done') doneCount++;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lpath-step state-' + st.s + (step.id === currentId ? ' current' : '');
      chip.setAttribute('aria-current', step.id === currentId ? 'step' : 'false');
      chip.title = step.label + (st.d ? ' — ' + st.d : '');
      chip.innerHTML =
        '<span class="lpath-num">' + (i + 1) + '</span>' +
        '<span class="lpath-ico">' + step.icon + '</span>' +
        '<span class="lpath-lbl">' + step.label + '</span>' +
        '<span class="lpath-mark" aria-hidden="true">' + MARK[st.s] + '</span>';
      chip.addEventListener('click', function () {
        if (window.CDWH.navigate) window.CDWH.navigate(step.id);
        else location.hash = '#snowflake/' + step.id;
      });
      track.appendChild(chip);
      if (i < PATH.length - 1) {
        const con = document.createElement('span');
        con.className = 'lpath-connector';
        con.setAttribute('aria-hidden', 'true');
        track.appendChild(con);
      }
    });

    wrap.appendChild(track);
    score.textContent = doneCount + ' / ' + PATH.length + ' mastered';
    return wrap;
  }

  function inject(id) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const old = canvas.querySelector('.lpath');
    if (old) old.remove();
    if (!(id in IDS)) return;
    canvas.insertBefore(build(id), canvas.firstChild);
  }

  document.addEventListener('cdwh:navigate', function (e) {
    const id = e && e.detail && e.detail.id;
    if (!(id in IDS)) return;
    // After the module + enhance.js have populated the canvas.
    setTimeout(function () { inject(id); }, 70);
  });
  // Refresh mastery marks live as the learner earns them.
  document.addEventListener('cdwh:srs', function () { const c = window.CDWH.currentModuleId; if (c in IDS) inject(c); });
  document.addEventListener('cdwh:progress', function () { const c = window.CDWH.currentModuleId; if (c in IDS) inject(c); });

  window.CDWH = window.CDWH || {};
  window.CDWH.LoadingPath = { build: build, inject: inject, PATH: PATH };
})();
