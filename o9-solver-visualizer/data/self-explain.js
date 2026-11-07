// self-explain.js — retrieval-practice prompts per module.
// Shape: { <moduleId>: [ { prompt, answer } ] }
// Auto-appended under a module by script.js → enhanceModule().
export const SELF_EXPLAIN = {
  'obo-heuristic': [
    {
      prompt: 'Why does the ORDER in which demands are planned change the final plan?',
      answer: 'Because planning is sequential: each demand is planned to completion before the next, and earlier (higher-priority) demands consume scarce supply/capacity first. Later demands see only what remains, so reordering changes who is met JIT vs late vs short.',
    },
  ],
  'what-is-solver': [
    {
      prompt: 'Explain, to a new analyst, why SCS is a heuristic and not an optimiser — and why that matters.',
      answer: 'SCS plans order-by-order against a ranked list of objectives rather than solving one global cost function. That makes it fast and predictable at scale and means the Objective Rank List effectively IS the objective — change the ranking and you change the plan, with no hidden cost model overruling it.',
    },
  ],
  'three-phases': [
    {
      prompt: 'Describe when the solver moves from JIT to Build-Ahead, and from Build-Ahead to Build-Late.',
      answer: 'It tries JIT (arrive exactly when due) first. If JIT is infeasible (capacity, lot size, lead time), it builds earlier and carries, up to the Build-Ahead Limit. If still unmet, it allows late supply up to the Build-Late Limit, minimising lateness; beyond that the demand is short.',
    },
  ],
};
