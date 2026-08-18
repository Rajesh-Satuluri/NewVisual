/* modules/network-topology.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.topology;
  var NODES = [["supplier","dc-nat","dc-north","lc-store"],["dc-north","lc-store"],["dc-nat"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "network-topology", title: C.title, eyebrow: "Solver Inputs · 4 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"The graph the solver walks",html:"<p>Widget-A flows Supplier X → DC-National → DC-North → LC-Store-A. Each hop is a <b>BILT lane</b> with its own lead time and calendar; the solver traverses this graph to decide sourcing.</p>"},
    callout: {kind:"info",html:"No topology, no solve: the BILT / BOD graphs <b>are</b> the network. Expired or inactive lanes are simply not traversed."}
  }));
})();
