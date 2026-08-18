/* ============================================================
   solver-concepts.js — concept metadata for glossary, master-map,
   and cross-linking. Keyed by module route id.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});

  NS.Concepts = {
    "what-is-solver":      { group: "Foundations", term: "o9 Solver", short: "Constraint-aware, graph-traversal planning engine that turns demand signals into supply decisions." },
    "planning-engine-stack":{ group: "Foundations", term: "Planning Engine Stack", short: "Rule Engine (before) → Solver → Rule Engine (after) — the 3-layer o9 planning stack." },
    "why-solver":          { group: "Foundations", term: "Why a Solver", short: "Manual multi-echelon balancing is infeasible; the solver solves the whole network in one pass." },
    "solver-components":   { group: "Foundations", term: "Solver Components", short: "Consumption Solver + Production Solver + WIP solver, coupled into one solve." }
  };
})();
