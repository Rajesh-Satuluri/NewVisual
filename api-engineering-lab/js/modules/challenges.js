/* ============================================================
   modules/challenges.js — Scenario Challenges
   Hands-on tasks across beginner → senior. Read the task, think,
   then reveal the expected answer + the engineering lesson.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var LEVELS = ["beginner", "intermediate", "advanced", "senior"];

  var module = {
    id: "challenges",
    title: "Scenario Challenges",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var all = AV.data.practice.challenges;
      var level = "beginner";

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice</div>' +
          '<h1 class="module-title">Scenario challenges</h1>' +
          '<p class="module-subtitle">Apply what you\'ve learned. Pick a level, try each task yourself, then reveal the expected answer and the lesson behind it.</p></div>' +

        '<div class="chiprow" id="cl-levels" style="margin-bottom:var(--space-4)">' +
          LEVELS.map(function (l, i) { return '<button class="chip' + (i === 0 ? " active" : "") + '" data-l="' + l + '"><span class="diff-badge ' + l + '" style="background:none;padding:0">' + l + "</span></button>"; }).join("") +
        "</div><div id=\"cl-list\"></div>";

      var listEl = container.querySelector("#cl-list");
      function render() {
        var items = all.filter(function (c) { return c.level === level; });
        listEl.innerHTML = items.map(function (c, idx) {
          return '<div class="panel" style="margin-bottom:var(--space-3)"><div class="panel-title"><span class="diff-badge ' + c.level + '">' + c.level + "</span> " + c.title + "</div>" +
            "<p><b>Task.</b> " + c.task + "</p>" +
            '<button class="btn btn-ghost btn-sm cl-reveal" data-idx="' + idx + '">Reveal answer</button>' +
            '<div class="cl-sol" data-idx="' + idx + '"></div></div>';
        }).join("");
      }
      listEl.addEventListener("click", function (e) {
        var b = e.target.closest(".cl-reveal"); if (!b) return;
        var idx = b.getAttribute("data-idx");
        var items = all.filter(function (c) { return c.level === level; });
        var c = items[parseInt(idx, 10)];
        var sol = listEl.querySelector('.cl-sol[data-idx="' + idx + '"]');
        sol.innerHTML = '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">✅</span><div class="callout-body"><b>Expected:</b> ' + c.answer + "</div></div>" +
          '<div class="callout info" style="margin-top:var(--space-2)"><span class="callout-icon">🎓</span><div class="callout-body"><b>Lesson:</b> ' + c.lesson + "</div></div>";
        b.disabled = true;
      });
      container.querySelector("#cl-levels").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        container.querySelectorAll("#cl-levels .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        level = b.getAttribute("data-l"); render();
      });
      render();
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
