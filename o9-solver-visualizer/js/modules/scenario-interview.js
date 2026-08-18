/* modules/scenario-interview.js — case/scenario questions + Sim Lab links */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var S = AV.Interview.scenarios;
  var module = {
    id: "scenario-interview", title: "Scenario Interviews", _h: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Learning Mode</div>' +
          '<h1 class="module-title gradient-text">Scenario / Case Interviews</h1>' +
          '<p class="module-subtitle">The "what would the solver do if…" questions. Read the model answer, then run the matching scenario in the Solver Behavior Lab.</p></div>' +
        '<div id="s-list" class="q-list">' +
        S.map(function (x, i) {
          return '<div class="qa-item"><button class="qa-q" data-i="' + i + '"><span class="qa-grp">Scenario</span>' + x.q + '<span class="qa-caret">▸</span></button>' +
            '<div class="qa-a"><p>' + x.a + '</p><a class="btn btn-secondary" href="#sim-lab">▶ Run this in the Solver Behavior Lab</a></div></div>';
        }).join("") + '</div>' +
        '<div class="callout tip"><span class="callout-icon">🎤</span><div class="callout-body">Tip: answer out loud using Widget-A numbers, then run the scenario to confirm the solver behaves exactly as you described.</div></div>';
      var list = container.querySelector("#s-list");
      this._h = function (e) { var btn = e.target.closest(".qa-q"); if (!btn) return; btn.parentNode.classList.toggle("open"); };
      list.addEventListener("click", this._h);
    },
    destroy: function () { var l = document.querySelector("#s-list"); if (l && this._h) l.removeEventListener("click", this._h); this._h = null; }
  };
  AV.registerModule(module);
})();
