/* ============================================================
   data/quiz-bank.js — per-module "Test Yourself" questions
   Shape (keyed by module id, auto-consumed by router.enhanceModule):
     AV.QUIZ_BANK = {
       "<moduleId>": [
         { q, options:[…], answer:<idx>, explanation }
       ]
     }
   Feeds: per-module quiz, aggregate Study Deck, mock-interview MCQ pool,
   and the spaced-repetition review deck (cards q:<mid>:<i>).
   STATUS: SCAFFOLD — empty; filled across content iterations.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.QUIZ_BANK = {};
})();
