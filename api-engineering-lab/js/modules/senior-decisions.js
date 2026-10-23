/* ============================================================
   modules/senior-decisions.js — Senior Design Decisions
   Trade-off workshop: read the context, commit to an option, then
   reveal the reasoning, the recommendation, and when it flips.
   A reasonable alternative is never marked "wrong".
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "senior-decisions",
    title: "Senior Design Decisions",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("senior");
      var decisions = AV.data.practice.decisions;
      var i = 0;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Practice · Senior</div>' +
          '<h1 class="module-title">Make the call, then see the reasoning</h1>' +
          '<p class="module-subtitle">Senior engineering is judgment under constraints, not memorized answers. Read the scenario, commit to an option, then compare with the analysis — including when the recommendation would change.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Decisions</div><ol class="ch-list" id="sd-list">' +
            decisions.map(function (d, idx) { return '<li class="ch-item' + (idx === 0 ? " active" : "") + '" data-i="' + idx + '">' + d.q + "</li>"; }).join("") + "</ol></div>" +
          '<div id="sd-main"></div>' +
        "</div>";

      var listEl = container.querySelector("#sd-list");
      var mainEl = container.querySelector("#sd-main");

      function render() {
        var d = decisions[i];
        mainEl.innerHTML =
          '<div class="panel"><div class="panel-title">' + d.q + "</div>" +
            '<p><b>Context.</b> ' + d.ctx + "</p>" +
            '<div class="panel-sub" style="margin-top:var(--space-3)">Your call:</div>' +
            '<div class="chiprow" id="sd-opts">' + d.opts.map(function (o) { return '<button class="chip" data-o="' + esc(o) + '">' + o + "</button>"; }).join("") + "</div>" +
            '<div id="sd-reveal"></div>' +
          "</div>";
        listEl.querySelectorAll(".ch-item").forEach(function (el, idx) { el.classList.toggle("active", idx === i); });
        mainEl.querySelector("#sd-opts").addEventListener("click", function (e) {
          var b = e.target.closest(".chip"); if (!b) return;
          mainEl.querySelectorAll("#sd-opts .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
          var chosen = b.getAttribute("data-o");
          var matches = d.rec.toLowerCase().indexOf(chosen.toLowerCase()) !== -1;
          mainEl.querySelector("#sd-reveal").innerHTML =
            '<div class="callout ' + (matches ? "tip" : "info") + '" style="margin-top:var(--space-4)"><span class="callout-icon">' + (matches ? "✅" : "🤝") + '</span><div class="callout-body"><b>Recommended: ' + d.rec + ".</b> " + (matches ? "Your pick matches the common recommendation." : "Your pick can be defensible — this often depends on constraints.") + "</div></div>" +
            '<div class="callout" style="margin-top:var(--space-2);border-left:3px solid var(--airflow)"><span class="callout-icon">💭</span><div class="callout-body"><b>Why:</b> ' + d.why + "</div></div>" +
            '<div class="callout warn" style="margin-top:var(--space-2)"><span class="callout-icon">🔄</span><div class="callout-body"><b>When it flips:</b> ' + d.flip + "</div></div>";
        });
      }
      listEl.addEventListener("click", function (e) { var li = e.target.closest(".ch-item"); if (li) { i = parseInt(li.getAttribute("data-i"), 10); render(); } });
      render();
    },
    destroy: function () {}
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  AV.registerModule(module);
})();
