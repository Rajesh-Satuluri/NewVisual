/* modules/inventory-inputs.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.inventory;
  var NODES = [["lc-store"],["lc-store"],["dc-north"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "inventory-inputs", title: C.title, eyebrow: "Solver Inputs · 2 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"Widget-A inventory position",html:"<div class=\"kpi-row\"><div class=\"kpi\"><div class=\"kpi-num\">200</div><div class=\"kpi-label\">On hand</div></div><div class=\"kpi accent\"><div class=\"kpi-num\">150</div><div class=\"kpi-label\">Safety stock</div></div></div><p>On-hand offsets demand; safety stock is <b>added on top</b> so the net requirement protects the buffer.</p>"},
    callout: {kind:"tip",html:"Safety Stock Final is <b>method-specific</b>: Poisson for sporadic demand, Quantile for regular demand, Forecast-Variation for high-error items."}
  }));
})();
