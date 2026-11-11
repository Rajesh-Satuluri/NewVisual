/* ============================================================
   data/review.js — spaced-repetition scheduler (SM-2 variant)
   Kafka convention: pure scheduling logic, persisted via progress-store
   (category "review"). Cards are drawn from quiz questions (q:<mid>:<i>)
   and glossary terms (g:<term>).

   API (contract):
     buildDeck()               -> [ { cardId, type, ref } ]   all candidate cards
     schedule(card, grade)     -> { interval, ease, due }      SM-2 update
     partitionDeck(deck, now)  -> { due, fresh, later, learned }
     buildSession(deck, max)   -> [ card ]                     today's queue
     nextDueLabel(card, now)   -> "due now" | "in 2d" | …

   Grades: again / hard / good / easy.

   STATUS: SCAFFOLD — documented stubs returning safe defaults. The SM-2
   algorithm + co-located review.test.mjs land in the mastery iteration
   (REVAMP-BLUEPRINT.md §9, Iter 9).
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});

  NS.Review = {
    buildDeck: function () { return []; /* TODO: from QUIZ_BANK + CONCEPTS */ },
    schedule: function (/* card, grade */) { return { interval: 0, ease: 2.5, due: Date.now() }; /* TODO: SM-2 */ },
    partitionDeck: function (/* deck, now */) { return { due: [], fresh: [], later: [], learned: [] }; },
    buildSession: function (/* deck, max */) { return []; },
    nextDueLabel: function (/* card, now */) { return ""; }
  };
})();
