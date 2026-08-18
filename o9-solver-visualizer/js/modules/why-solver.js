/* modules/why-solver.js — why supply planning needs a solver (interactive) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var W = AV.CATMPN.widgetA;

  var COMPARE = {
    manual: {
      title: "Manual / spreadsheet planning",
      rows: [
        ["Scope", "One item, one LC at a time"],
        ["Constraints", "Lead times, calendars, MOQs juggled by hand"],
        ["Horizon", "A few weeks — 740 days is hopeless manually"],
        ["Consistency", "Planner-dependent, error-prone"],
        ["Speed", "Hours-to-days; stale before it's finished"],
        ["Result", "Habitual over-ordering, missed shortages"]
      ], kind: "bad"
    },
    solver: {
      title: "o9 solver",
      rows: [
        ["Scope", "Entire Item × LC × Supplier network at once"],
        ["Constraints", "All honoured simultaneously in one solve"],
        ["Horizon", "Full 740-day planning horizon"],
        ["Consistency", "Same rules applied everywhere, every night"],
        ["Speed", "Seconds; regenerated daily"],
        ["Result", "Precise net requirements, early shortage warning"]
      ], kind: "good"
    }
  };

  function table(c) {
    return '<div class="card"><div class="card-title">' + c.title + '</div>' +
      '<dl class="concept-def">' + c.rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></div>";
  }

  var module = {
    id: "why-solver", title: "Why a Solver",
    _handler: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Foundations</div>' +
          '<h1 class="module-title gradient-text">Why does supply planning need a solver?</h1>' +
          '<p class="module-subtitle">Because balancing supply and demand across hundreds of items, dozens of LCs, multiple suppliers and a 740-day horizon — all at once — is computationally infeasible by hand.</p>' +
        "</div>" +
        '<div class="view-toggle" id="cmp-toggle">' +
          '<button data-c="both" class="active">Both</button>' +
          '<button data-c="manual">Manual only</button>' +
          '<button data-c="solver">Solver only</button>' +
        "</div>" +
        '<div class="card-grid" id="cmp-grid"></div>' +
        '<section class="section"><h2 class="section-title">The Widget-A example</h2>' +
          '<p>Even for a single item, the solver silently does this every night:</p>' +
          '<div class="kpi-row">' +
            '<div class="kpi"><div class="kpi-num">' + W.demandToWeek3 + '</div><div class="kpi-label">Demand computed</div></div>' +
            '<div class="kpi accent"><div class="kpi-num">' + W.netRequirementUnits + '</div><div class="kpi-label">Net requirement</div></div>' +
            '<div class="kpi good"><div class="kpi-num">' + W.orderUnits + '</div><div class="kpi-label">Constrained order</div></div>' +
          "</div>" +
          '<div class="callout info"><span class="callout-icon">⚡</span><div class="callout-body">Now multiply that by every Item-LC in the network, refreshed daily. That scale is exactly why a solver — not a planner with a spreadsheet — makes the decision.</div></div>' +
        "</section>";

      var grid = container.querySelector("#cmp-grid");
      function render(mode) {
        var html = "";
        if (mode === "both" || mode === "manual") html += table(COMPARE.manual);
        if (mode === "both" || mode === "solver") html += table(COMPARE.solver);
        grid.innerHTML = html;
      }
      render("both");

      var toggle = container.querySelector("#cmp-toggle");
      this._handler = function (e) {
        var b = e.target.closest("button[data-c]");
        if (!b) return;
        toggle.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        render(b.getAttribute("data-c"));
      };
      toggle.addEventListener("click", this._handler);
    },
    destroy: function () {
      var t = document.querySelector("#cmp-toggle");
      if (t && this._handler) t.removeEventListener("click", this._handler);
      this._handler = null;
    }
  };
  AV.registerModule(module);
})();
