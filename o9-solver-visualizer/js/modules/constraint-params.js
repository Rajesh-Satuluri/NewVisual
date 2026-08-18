/* modules/constraint-params.js — Solver Inputs (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.inputs.constraintParam;
  var NODES = [["supplier","dc-north"],["supplier","dc-north"],["supplier"],["supplier"]];
  var measures = C.measures.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  AV.registerModule(AV.ConceptFactory.build({
    id: "constraint-params", title: C.title, eyebrow: "Solver Inputs · 5 of 6",
    intro: C.blurb,
    measures: measures,
    tableTitle: "Every measure in this category",
    pills: C.measures.map(function (m) { return m[0]; }),
    worked: {title:"The numbers the solver reads at solve time",html:"<div class=\"formula\">70 boxes needed · Min <span class=\"hl\">50</span> ✓ · Mult <span class=\"hl\">50</span> → round up to <span class=\"hl\">100 boxes</span> (500 units).</div>"},
    callout: {kind:"tip",html:"These parameters are <b>read directly</b> by the solver — they are the levers a planner tunes to change solver behaviour without touching demand."}
  }));
})();
