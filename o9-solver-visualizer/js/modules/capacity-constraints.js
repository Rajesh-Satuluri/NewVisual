/* modules/capacity-constraints.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.capacity;
  var NODES = [["lc-store"],["dc-north","dc-nat"],["dc-north"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "capacity-constraints", title: C.title, eyebrow: "Constraints · 4 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"Soft cap, then exception",html:"<p>Capacity is a <b>soft</b> constraint: the solver tries to stay within inbound/outbound limits, but if demand forces a breach it will plan it and <b>flag the breach as an exception</b> rather than silently fail.</p>"},
    callout: {kind:"info",html:"Soft vs hard: a breached soft constraint produces a plan + an exception; a hard constraint (freeze, Min/Mult) is never violated."}
  }));
})();
