/* modules/freeze-windows.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.freeze;
  var NODES = [["dc-north","lc-store"],["supplier","dc-north"],["dc-nat"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "freeze-windows", title: C.title, eyebrow: "Constraints · 1 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"Freeze blocks a late order",html:"<p>If Widget-A's <b>required ship date</b> lands inside the Firm Fence, the solver will <b>not</b> create supply — it raises a Short Exception and alerts the planner instead. Only a manual override can place supply inside the freeze.</p>"},
    callout: {kind:"warn",html:"The freeze is the #1 time constraint. <b>Activity Freeze Time Bucket Offset – BT(Solver)</b> is the parameter the solver reads directly to know how many buckets from today are locked."}
  }));
})();
