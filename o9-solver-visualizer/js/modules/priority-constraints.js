/* modules/priority-constraints.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.priority;
  var NODES = [["customer","lc-store"],["customer"],["lc-store"],["supplier","dc-north"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "priority-constraints", title: C.title, eyebrow: "Constraints · 6 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"Rationing, not randomness",html:"<p>When supply is short, the solver fulfils in strict order: <b>Priority Parts → SCHEDULE ORDER → COMMERCIAL → PULL</b>, with Demand Priority as the tie-break. Widget-A flagged as a Priority Part gets supply before lower tiers.</p>"},
    callout: {kind:"warn",html:"The solver <b>never rations arbitrarily</b>. Line Down Date is computed for Priority Parts so the most business-critical shortages escalate first."}
  }));
})();
