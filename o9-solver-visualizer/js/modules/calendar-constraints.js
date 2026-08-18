/* modules/calendar-constraints.js — Constraints (generated via ConceptFactory) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN.constraints.calendar;
  var NODES = [["supplier","dc-nat"],["supplier"],["lc-store"]];
  var measures = C.items.map(function (m, i) { return [m[0], m[1], m[2], NODES[i] || []]; });
  var kindBadge = C.kind === "hard" ? "Hard constraint — cannot be violated" : "Soft constraint — may be breached, then flagged";
  AV.registerModule(AV.ConceptFactory.build({
    id: "calendar-constraints", title: C.title, eyebrow: "Constraints · 2 of 6",
    intro: C.blurb + " <b>" + kindBadge + ".</b>",
    measures: measures,
    tableTitle: "Every constraint in this group",
    pills: C.items.map(function (m) { return m[0]; }),
    worked: {title:"Only valid days are used",html:"<p>If LC-Store-A receives only Mondays &amp; Thursdays, the solver places the planned receipt on the <b>nearest valid delivery day</b>; a supplier production holiday shifts the ship date to the nearest valid prior day.</p>"},
    callout: {kind:"info",html:"Three calendars stack: transport-lane holidays, supplier production holidays, and the LC delivery calendar — the solver must satisfy all three."}
  }));
})();
