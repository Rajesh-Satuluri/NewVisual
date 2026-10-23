/* ============================================================
   modules/progress.js — Learning Progress
   Reads apilab-visited + apilab-quiz-* from localStorage and shows
   per-group completion and quiz bests. Lets the learner reset.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "progress",
    title: "Learning Progress",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty(null);
      var routes = AV.routes, order = AV.navOrder;

      function visited() { try { return JSON.parse(localStorage.getItem("apilab-visited") || "[]"); } catch (e) { return []; } }
      function quizBest(id) { try { return parseInt(localStorage.getItem("apilab-quiz-" + id), 10) || 0; } catch (e) { return 0; } }

      function render() {
        var vis = visited();
        var ready = order.filter(function (k) { return routes[k].ready; });
        var done = ready.filter(function (k) { return vis.indexOf(k) !== -1; });
        var pct = ready.length ? Math.round(done.length / ready.length * 100) : 0;

        // group completion
        var groups = {};
        ready.forEach(function (k) { var g = routes[k].group || "Other"; (groups[g] = groups[g] || []).push(k); });

        // quizzes
        var banks = (AV.data && AV.data.quizBanks) || {};
        var quizRows = Object.keys(banks).map(function (id) {
          var best = quizBest(id), total = banks[id].length;
          return { id: id, title: (routes[id] && routes[id].title) || id, best: best, total: total };
        });
        var quizTaken = quizRows.filter(function (q) { return q.best > 0; }).length;

        container.innerHTML =
          '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice</div>' +
            '<h1 class="module-title">Your learning progress</h1>' +
            '<p class="module-subtitle">Tracked locally in your browser. Explore modules and take the Test-Yourself quizzes to fill this in.</p></div>' +

          '<div class="stat-row" style="margin-bottom:var(--space-6)">' +
            stat(pct + "%", "modules explored") + stat(done.length + " / " + ready.length, "modules") +
            stat(quizTaken, "quizzes attempted") +
          "</div>" +

          '<section class="section"><h2 class="section-title">By section</h2><div class="note-grid">' +
            Object.keys(groups).map(function (g) {
              var ks = groups[g]; var d = ks.filter(function (k) { return vis.indexOf(k) !== -1; }).length;
              var p = Math.round(d / ks.length * 100);
              return '<div class="panel"><div class="panel-title">' + g + ' · ' + d + "/" + ks.length + '</div>' +
                '<div class="lesson-progress-bar" style="width:100%"><span style="width:' + p + '%"></span></div>' +
                '<ul class="tick-list" style="margin-top:var(--space-3)">' + ks.map(function (k) { return "<li>" + (vis.indexOf(k) !== -1 ? "✅" : "⬜") + ' <a href="#' + k + '">' + routes[k].title + "</a></li>"; }).join("") + "</ul></div>";
            }).join("") + "</div></section>" +

          '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Quiz scores</h2>' +
            (quizRows.length ? '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Module</th><th>Best score</th></tr></thead><tbody>' +
              quizRows.map(function (q) { return '<tr><td><a href="#' + q.id + '">' + q.title + "</a></td><td class=\"mono\">" + (q.best ? q.best + " / " + q.total : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>" : "<p class=\"text-muted\">No quizzes attempted yet.</p>") +
          "</section>" +

          '<div style="margin-top:var(--space-6)"><button class="btn btn-ghost btn-sm" id="pr-reset">↺ Reset my progress</button></div>';

        container.querySelector("#pr-reset").addEventListener("click", function () {
          if (!confirm("Reset all locally-stored progress and quiz scores?")) return;
          try {
            localStorage.removeItem("apilab-visited");
            Object.keys(localStorage).forEach(function (k) { if (k.indexOf("apilab-quiz-") === 0) localStorage.removeItem(k); });
          } catch (e) {}
          render();
          if (AV.App && AV.App.renderProgress) AV.App.renderProgress();
        });
      }
      render();
    },
    destroy: function () {}
  };

  function stat(n, l) { return '<div class="stat"><div class="stat-num">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  AV.registerModule(module);
})();
