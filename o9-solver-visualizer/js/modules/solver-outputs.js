/* modules/solver-outputs.js — outputs the solver writes back (interactive) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var GROUPS = {
    supply: { title: "Replenishment & Purchase Schedule", icon: "📦", rows: [
      ["Dist Prod Qty – BILT(D)", "Planned receipt quantity at each node."],
      ["Purchase Schedule Qty CM", "Recommended purchase at the supplier."],
      ["Dist Cons Qty – BILT(D)(Solver)", "Quantity drawn from the upstream source on the ship date."] ] },
    inventory: { title: "Inventory Projection", icon: "📊", rows: [
      ["SCS Ending on Hand", "Projected closing inventory per period."],
      ["InvHealth (InStock / Stockout / SSViolation / ExcessStock)", "Daily inventory-health KPIs from post-solve logic."] ] },
    delivery: { title: "Delivery Plan", icon: "🚚", rows: [
      ["Total Met OnTime Qty", "Demand fulfilled on time."],
      ["Total Late Qty", "Demand fulfilled late."],
      ["Total Short Qty – CCtILO(D)", "Demand not fulfilled, tiered by horizon."] ] },
    exception: { title: "Exception & Shortage Signals", icon: "⚠️", rows: [
      ["Short Exception Indicator – BILT(D)", "Flags a shortage for the workbench."],
      ["Line Down Date", "Date a line stops for a Priority Part shortage."],
      ["Reschedule Date / Qty", "Expedite / de-expedite recommendations."] ] }
  };
  function card(g) {
    return '<div class="card"><div class="card-title">' + g.icon + ' ' + g.title + '</div><dl class="concept-def">' +
      g.rows.map(function (r) { return "<dt><code>" + r[0] + "</code></dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></div>";
  }
  var module = {
    id: "solver-outputs", title: "Solver Outputs", _h: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Execution &amp; Outputs</div>' +
          '<h1 class="module-title gradient-text">Solver Outputs</h1>' +
          '<p class="module-subtitle">All outputs are written back into the o9 model and immediately visible in workbenches. They fall into four families:</p></div>' +
        '<div class="view-toggle" id="out-toggle"><button data-g="all" class="active">All</button>' +
          '<button data-g="supply">Supply</button><button data-g="inventory">Inventory</button>' +
          '<button data-g="delivery">Delivery</button><button data-g="exception">Exceptions</button></div>' +
        '<div class="card-grid" id="out-grid"></div>' +
        '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body">For Widget-A: Dist Prod Qty = 500, Purchase Schedule = 500, SCS Ending on Hand (Wk3) = 300 > Safety Stock 150 → InvHealth <b>InStock</b>, no exception raised.</div></div>';
      var grid = container.querySelector("#out-grid");
      function render(g) {
        var keys = g === "all" ? Object.keys(GROUPS) : [g];
        grid.innerHTML = keys.map(function (k) { return card(GROUPS[k]); }).join("");
      }
      render("all");
      var toggle = container.querySelector("#out-toggle");
      this._h = function (e) { var b = e.target.closest("button[data-g]"); if (!b) return; toggle.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); render(b.getAttribute("data-g")); };
      toggle.addEventListener("click", this._h);
    },
    destroy: function () { var t = document.querySelector("#out-toggle"); if (t && this._h) t.removeEventListener("click", this._h); this._h = null; }
  };
  AV.registerModule(module);
})();
