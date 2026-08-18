/* modules/supply-order-inputs.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.supplyOrder;
  var NODES = [["supplier","dc-nat"],["dc-nat","dc-north"],["dc-north"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "supply-order-inputs", title: C.title, eyebrow: "Solver Inputs · 3 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"Why in-flight supply matters",html:"<p>If a 200-unit STO is already in transit to DC-North, the solver <b>subtracts it</b> from the requirement — otherwise it would double-order. Committed supply is netted before new orders are generated.</p>"},
    callout: {kind:"warn",html:"Ignoring in-flight supply is the classic double-ordering bug. The solver always counts open POs, in-transit STOs and firmed orders first."}
  }));
})();
