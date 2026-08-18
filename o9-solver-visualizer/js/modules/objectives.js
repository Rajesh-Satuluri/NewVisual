/* modules/objectives.js — solver objectives (interactive) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var OBJ = {
    primary: {
      title: "Primary · Demand Fulfilment", icon: "🎯",
      rows: [
        ["Goal", "Meet the SplitWeek Final Forecast on time for every Customer × Item × LC × SplitWeek."],
        ["'On time'", "Goods arrive at the customer-facing LC by the required date, accounting for transit lead time."],
        ["Measured by", "Total Met OnTime Qty, Total Late Qty, Total Short Qty (Delivery Plan)."],
        ["Not the goal", "Cost minimisation — this is a priority-weighted heuristic, not a full LP cost optimiser."]
      ]
    },
    secondary: {
      title: "Secondary · Inventory Positioning", icon: "🧭",
      rows: [
        ["Goal", "Position inventory correctly for future periods, not just today."],
        ["Horizon", "Looks ahead across the full 740-day planning horizon."],
        ["Lead-time aware", "Generates supply far enough in advance to cover supplier lead times."],
        ["Example", "A purchase schedule generated today may be for delivery 12 weeks out."]
      ]
    }
  };
  function card(o) {
    return '<div class="card"><div class="card-title">' + o.icon + ' ' + o.title + '</div><dl class="concept-def">' +
      o.rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></div>";
  }
  var module = {
    id: "objectives", title: "Solver Objectives", _h: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">DRP Framework</div>' +
          '<h1 class="module-title gradient-text">The Solver&rsquo;s Objectives</h1>' +
          '<p class="module-subtitle">The CATMPN DRP solver is a <b>demand-fulfilment-first, constraint-respecting replenishment planner</b> — it does not minimise cost as a primary objective.</p></div>' +
        '<div class="view-toggle" id="obj-toggle"><button data-o="both" class="active">Both</button><button data-o="primary">Primary</button><button data-o="secondary">Secondary</button></div>' +
        '<div class="card-grid" id="obj-grid"></div>' +
        '<div class="callout info"><span class="callout-icon">⚖️</span><div class="callout-body">Interview soundbite: <i>"It fulfils demand as completely as possible while respecting physical supply-chain constraints, using a priority-weighted heuristic — near-term execution and long-horizon procurement at the same time."</i></div></div>';
      var grid = container.querySelector("#obj-grid");
      function render(m) { var h = ""; if (m === "both" || m === "primary") h += card(OBJ.primary); if (m === "both" || m === "secondary") h += card(OBJ.secondary); grid.innerHTML = h; }
      render("both");
      var toggle = container.querySelector("#obj-toggle");
      this._h = function (e) { var b = e.target.closest("button[data-o]"); if (!b) return; toggle.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); render(b.getAttribute("data-o")); };
      toggle.addEventListener("click", this._h);
    },
    destroy: function () { var t = document.querySelector("#obj-toggle"); if (t && this._h) t.removeEventListener("click", this._h); this._h = null; }
  };
  AV.registerModule(module);
})();
