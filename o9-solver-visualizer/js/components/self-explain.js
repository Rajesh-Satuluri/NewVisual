/* ============================================================
   components/self-explain.js — "explain it back" prompt box
   Kafka convention: auto-appended retrieval-practice block. Shows the
   prompt from SELF_EXPLAIN[moduleId] (data/self-explain.js), lets the
   learner type an answer, then reveals the rubric to self-score.
   Draft persisted to o9scs_selfx_<id>.

   Contract:
     AV.SelfExplain.create(moduleId, spec) -> HTML string
     AV.SelfExplain.init(container, { moduleId })

   STATUS: SCAFFOLD (returns empty; no-op init). Wired via
   router.enhanceModule() in the mastery iteration.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.SelfExplain = {
    storageKey: function (id) { return "o9scs_selfx_" + id; },
    create: function (/* moduleId, spec */) { return ""; /* TODO */ },
    init: function (/* container, opts */) { /* TODO: persist draft, reveal rubric */ }
  };
})();
