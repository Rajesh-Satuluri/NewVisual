/* modules/quantity-constraints.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.quantity;
  var NODES = [["supplier","dc-north"],["supplier","dc-north"],["supplier"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "quantity-constraints", title: C.title, eyebrow: "Constraints · 3 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"Min then Mult rounding",html:"<div class=\"formula\">Net 350 units ÷ 5 = 70 boxes · Min <span class=\"hl\">50</span> ✓ · Mult <span class=\"hl\">50</span> → <span class=\"hl\">100 boxes = 500 units</span>. The extra 150 units become projected safety stock.</div>"},
    callout: {kind:"tip",html:"Order of operations matters: the solver computes net requirement, then applies <b>Min</b>, then rounds up to a <b>Mult</b>. EOQ is the target the Min/Mult round around."}
  }));
})();
