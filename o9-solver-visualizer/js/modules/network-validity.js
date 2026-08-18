/* modules/network-validity.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.validity;
  var NODES = [["supplier","dc-nat"],["supplier"],["lc-store"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "network-validity", title: C.title, eyebrow: "Constraints · 5 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"No phantom supply",html:"<p>A lane is used only if today is inside its <b>Effective In/Out</b> dates. For dual-source Widget-A, <b>Split Ratio</b> forces (say) 60/40 across suppliers; <b>NoCarry</b> stops the solver stockpiling surplus forward.</p>"},
    callout: {kind:"info",html:"These constraints keep plans <b>physically real</b>: only active lanes, correct source splits, and no artificial carry-forward."}
  }));
})();
