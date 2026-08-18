/* modules/demand-inputs.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.demand;
  var NODES = [["customer","lc-store"],["lc-store"],["dc-north"],["lc-store","customer"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "demand-inputs", title: C.title, eyebrow: "Solver Inputs · 1 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"Widget-A demand signal",html:"<div class=\"formula\">SplitWeek Final Forecast = <span class=\"hl\">100 units per delivery slot</span> at LC-Store-A → 4 slots to Week 3 → <span class=\"hl\">400 units</span> of demand the solver must meet on time.</div>"},
    callout: {kind:"info",html:"Demand is <b>staged before</b> the solve. The rule engine prepares the SplitWeek forecast; the solver only consumes it — it does not forecast."}
  }));
})();
