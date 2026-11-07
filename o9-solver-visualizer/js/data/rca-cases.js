/* ============================================================
   data/rca-cases.js — engine-solvable RCA scenarios
   Shape:
     AV.RCA_CASES = [
       { id, demand, network, config,
         expected:{ problemType, suggestedDate } }   // each solvable by scs-engine
     ]
   The RCA Clinic runs the engine on `network`+`config`+`demand`, then
   compares the learner's diagnosis to the computed Problem Type.
   STATUS: SCAFFOLD — empty; filled in the Outputs & RCA iteration
   (depends on the engine solve() pipeline, Iteration 1).
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.RCA_CASES = [];
})();
