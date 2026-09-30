/* ============================================================
   Quiz Engine — reusable multiple-choice quiz with scoring,
   explanations, retry, and best-score persistence.
   Questions: [{ q, choices:[str], answer:int, explain?:str }]
   ============================================================ */

(function () {
  'use strict';

  const Quiz = {
    bestScore(moduleId) {
      try { return JSON.parse(localStorage.getItem('sviz-quiz-' + moduleId) || 'null'); }
      catch (_) { return null; }
    },

    /**
     * @returns {HTMLElement} an embeddable quiz card
     */
    create(moduleId, questions) {
      const wrap = document.createElement('div');
      wrap.className = 'quiz';
      if (!Array.isArray(questions) || !questions.length) return wrap;

      const picks = new Array(questions.length).fill(-1);
      let checked = false;

      const head = document.createElement('div');
      head.className = 'quiz-head';
      head.innerHTML = `<span class="quiz-count">${questions.length} questions</span><span class="quiz-best"></span>`;
      wrap.appendChild(head);

      const list = document.createElement('div');
      list.className = 'quiz-list';
      wrap.appendChild(list);

      questions.forEach((qq, qi) => {
        const item = document.createElement('div');
        item.className = 'quiz-item';
        const name = `${moduleId}-q${qi}`;
        item.innerHTML = `<div class="quiz-q">${qi + 1}. ${_esc(qq.q)}</div>`;
        const opts = document.createElement('div');
        opts.className = 'quiz-opts';
        qq.choices.forEach((choice, ci) => {
          const id = `${name}-c${ci}`;
          const label = document.createElement('label');
          label.className = 'quiz-opt';
          label.setAttribute('for', id);
          label.innerHTML = `<input type="radio" id="${id}" name="${name}"><span>${_esc(choice)}</span>`;
          label.querySelector('input').addEventListener('change', () => {
            if (checked) return;
            picks[qi] = ci;
            opts.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
            label.classList.add('selected');
          });
          opts.appendChild(label);
        });
        item.appendChild(opts);
        const exp = document.createElement('div');
        exp.className = 'quiz-explain';
        exp.hidden = true;
        if (qq.explain) exp.innerHTML = `<strong>Why:</strong> ${_esc(qq.explain)}`;
        item.appendChild(exp);
        list.appendChild(item);
      });

      const foot = document.createElement('div');
      foot.className = 'quiz-foot';
      foot.innerHTML = `<button class="btn btn-primary quiz-check">Check answers</button><span class="quiz-score"></span>`;
      wrap.appendChild(foot);

      const btn = foot.querySelector('.quiz-check');
      const scoreEl = foot.querySelector('.quiz-score');
      const bestEl = head.querySelector('.quiz-best');
      renderBest();

      btn.addEventListener('click', () => {
        if (!checked) grade(); else reset();
      });

      function grade() {
        checked = true;
        let score = 0;
        questions.forEach((qq, qi) => {
          const item = list.children[qi];
          const opts = item.querySelectorAll('.quiz-opt');
          opts.forEach((o, ci) => {
            o.querySelector('input').disabled = true;
            if (ci === qq.answer) o.classList.add('correct');
            else if (ci === picks[qi]) o.classList.add('wrong');
          });
          if (picks[qi] === qq.answer) score++;
          const exp = item.querySelector('.quiz-explain');
          if (exp.innerHTML) exp.hidden = false;
        });
        scoreEl.textContent = `Score: ${score} / ${questions.length}`;
        btn.textContent = 'Try again';
        save(score);
        renderBest();
      }

      function reset() {
        checked = false;
        picks.fill(-1);
        list.querySelectorAll('.quiz-opt').forEach(o => {
          o.classList.remove('selected', 'correct', 'wrong');
          o.querySelector('input').disabled = false;
          o.querySelector('input').checked = false;
        });
        list.querySelectorAll('.quiz-explain').forEach(e => e.hidden = true);
        scoreEl.textContent = '';
        btn.textContent = 'Check answers';
      }

      function save(score) {
        const prev = Quiz.bestScore(moduleId);
        if (!prev || score > prev.best) {
          try { localStorage.setItem('sviz-quiz-' + moduleId, JSON.stringify({ best: score, total: questions.length, ts: Date.now() })); } catch (_) {}
        }
      }
      function renderBest() {
        const b = Quiz.bestScore(moduleId);
        bestEl.textContent = b ? `Best: ${b.best}/${b.total}` : '';
      }

      return wrap;
    },
  };

  function _esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Quiz = Quiz;
})();
