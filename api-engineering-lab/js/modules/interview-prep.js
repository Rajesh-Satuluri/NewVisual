/* ============================================================
   modules/interview-prep.js — Knowledge & Interview Prep
   A topic-based question bank with reveal-able answer elements, plus
   a reusable answer framework for API/backend interviews.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var FRAMEWORK = [
    ["1 · Define", "State the concept crisply in one sentence."],
    ["2 · Mechanism", "Explain how it actually works under the hood."],
    ["3 · Business use", "Tie it to a concrete use case (ShopSphere checkout)."],
    ["4 · Trade-offs", "Name the cost / when NOT to use it."],
    ["5 · Failure mode", "Describe how it breaks in production."],
    ["6 · Mitigation", "Explain how you'd detect + prevent that failure."]
  ];

  var module = {
    id: "interview-prep",
    title: "Knowledge & Interview Prep",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var bank = AV.data.practice.interview;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice</div>' +
          '<h1 class="module-title">Interview preparation</h1>' +
          '<p class="module-subtitle">Senior API answers follow a shape: define → mechanism → business → trade-offs → failure → mitigation. Practise the bank below, then self-check against the answer elements.</p></div>' +

        '<div class="panel"><div class="panel-title">The answer framework</div><div class="note-grid">' +
          FRAMEWORK.map(function (f) { return '<div class="panel" style="background:var(--bg-3)"><div class="panel-title" style="color:var(--airflow-bright)">' + f[0] + "</div><p>" + f[1] + "</p></div>"; }).join("") + "</div></div>" +

        '<section class="section" style="margin-top:var(--space-5)"><h2 class="section-title">Question bank</h2><div id="ip-list">' +
          bank.map(function (b, idx) {
            return '<div class="panel" style="margin-bottom:var(--space-3)"><div class="panel-title"><span class="chip active" style="cursor:default">' + b.topic + "</span></div>" +
              "<p><b>Q.</b> " + b.q + "</p>" +
              '<button class="btn btn-ghost btn-sm ip-reveal" data-idx="' + idx + '">Show answer elements</button>' +
              '<div class="ip-sol" data-idx="' + idx + '"></div></div>';
          }).join("") + "</div></section>";

      var listEl = container.querySelector("#ip-list");
      listEl.addEventListener("click", function (e) {
        var b = e.target.closest(".ip-reveal"); if (!b) return;
        var idx = parseInt(b.getAttribute("data-idx"), 10);
        var item = bank[idx];
        var sol = listEl.querySelector('.ip-sol[data-idx="' + idx + '"]');
        sol.innerHTML = '<div class="callout tip" style="margin-top:var(--space-2)"><span class="callout-icon">🎯</span><div class="callout-body"><b>Hit these points:</b><ul class="tick-list">' +
          item.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div></div>";
        b.disabled = true;
      });
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
