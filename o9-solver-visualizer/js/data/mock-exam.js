/* ============================================================
   data/mock-exam.js — timed mock-interview set
   Shape:
     AV.MOCK_EXAM = {
       durationMin,
       sections: [ { title, count, source:'QUIZ_BANK'|'INTERVIEW', filter } ]
     }
   Draws from QUIZ_BANK (MCQ) + INTERVIEW (open) to assemble a scored,
   timed set with model answers. Feeds: Mock Interview (t10).
   STATUS: SCAFFOLD — empty; filled in the mastery iteration.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.MOCK_EXAM = { durationMin: 0, sections: [] };
})();
