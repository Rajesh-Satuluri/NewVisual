/* ============================================================
   data/decisions.js — "which flag / which model / which input?" drills
   Shape (flat array with moduleId back-ref):
     AV.DECISIONS = [
       { id, title, difficulty, topic, moduleId, requirement,
         options:[{ label, verdict:'best'|'viable'|'wrong', why }],
         whatIfChanged, interviewNote }
     ]
   Feeds: Decision Drills (t10).
   STATUS: SCAFFOLD — empty; filled in the mastery iteration.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.DECISIONS = [];
})();
