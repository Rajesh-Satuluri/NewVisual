/* modules/quiz.js — scored quiz */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var Q = AV.Interview.quiz;
  var module = {
    id: "quiz", title: "Quiz", _h: null, _answered: null,
    render: function (container) {
      var self = this;
      this._answered = {};
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Learning Mode</div>' +
          '<h1 class="module-title gradient-text">Quiz</h1>' +
          '<p class="module-subtitle">' + Q.length + ' questions mixing solver concepts and Widget-A scenarios. Click an answer to check it.</p></div>' +
        '<div class="quiz-score" id="score">Score: 0 / ' + Q.length + '</div>' +
        '<div id="quiz-list">' + Q.map(function (x, qi) {
          return '<div class="quiz-q" data-q="' + qi + '"><h3>' + (qi + 1) + '. ' + x.q + '</h3>' +
            x.opts.map(function (o, oi) { return '<button class="quiz-opt" data-q="' + qi + '" data-o="' + oi + '">' + o + '</button>'; }).join("") +
            '<div class="quiz-why">' + x.why + '</div></div>';
        }).join("") + '</div>';
      var list = container.querySelector("#quiz-list");
      var score = container.querySelector("#score");
      this._h = function (e) {
        var btn = e.target.closest(".quiz-opt"); if (!btn) return;
        var qi = +btn.getAttribute("data-q"), oi = +btn.getAttribute("data-o");
        if (self._answered[qi] != null) return; // lock after first answer
        var qEl = list.querySelector('.quiz-q[data-q="' + qi + '"]');
        var correct = Q[qi].correct;
        qEl.querySelectorAll(".quiz-opt").forEach(function (b) {
          var bo = +b.getAttribute("data-o");
          if (bo === correct) b.classList.add("correct");
          else if (bo === oi) b.classList.add("wrong");
          b.disabled = true;
        });
        qEl.classList.add("answered");
        self._answered[qi] = (oi === correct);
        var got = Object.keys(self._answered).filter(function (k) { return self._answered[k]; }).length;
        score.textContent = "Score: " + got + " / " + Q.length;
      };
      list.addEventListener("click", this._h);
    },
    destroy: function () { var l = document.querySelector("#quiz-list"); if (l && this._h) l.removeEventListener("click", this._h); this._h = null; this._answered = null; }
  };
  AV.registerModule(module);
})();
