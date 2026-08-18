/* modules/capacity-inputs.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.capacity;
  var NODES = [["lc-store","dc-north"],["dc-north"],["dc-north","dc-nat"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "capacity-inputs", title: C.title, eyebrow: "Solver Inputs · 6 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"Keeping plans executable",html:"<p>If Week-3 receipts exceed LC-Store-A's inbound box capacity, the solver <b>spreads receipts across days</b> or flags a shortage — it never plans more than the warehouse can physically handle.</p>"},
    callout: {kind:"info",html:"Demonstrated Capacity uses <b>actual historical throughput</b>, not the theoretical max — a realistic ceiling that keeps plans achievable."}
  }));
})();
