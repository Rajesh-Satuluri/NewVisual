/* ============================================================
   data/incidents.js — RCA / troubleshooting walkthroughs
   Shape (flat array):
     AV.INCIDENTS = [
       { id, difficulty, icon, title, symptom,
         steps:[{ prompt, checks:[{ label, correct, evidence|why, reasoning }] }],
         rootCause, resolution, prevention, interviewAnswer }
     ]
   Grounded in real RootCause.[Problem Type] values.
   Feeds: RCA Clinic + Incident Bank (t10 / t7).
   STATUS: SCAFFOLD — empty; filled in the Outputs & RCA iteration.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.INCIDENTS = [];
})();
