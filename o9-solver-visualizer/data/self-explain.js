// self-explain.js — retrieval-practice prompts per module.
// Shape: { <moduleId>: [ { prompt, answer } ] }
// Auto-appended under a module by script.js → enhanceModule().
export const SELF_EXPLAIN = {
  'network-types': [
    {
      prompt: 'Name the three network types, the SCOR operation each maps to, and how the solver chooses between alternate producers at a material node.',
      answer: 'Manufacturing → MAKE (BOM + Routing), Distribution → DELIVER (BOD + Transport Mode), Procurement → SOURCE (Supplier). Between alternate producers it sorts by Activity Priority (lower = higher), then proportion-enabled edges, then activity key (lower member key first), then later activity end date — using each next key only on a tie.',
    },
  ],
  'nodes-graphs': [
    {
      prompt: 'Explain material vs activity nodes, the three input graphs, and what the Production Priority values 0, NULL and negative mean.',
      answer: 'A material node is Item×Location; an activity node is the Activity that transforms/moves material; they are linked by graphs (FROM node, TO node, edge). The three input graphs: Material Consumption (activity consumes a product), Material Production (activity produces a product, carrying Production Priority), and Capacity Consumption (activity constrained by its resource) — each with a Boolean Association (1 active / 0 inactive). Production Priority: lower = higher, 0 is top; NULL = 32,767; negative = path blocked.',
    },
  ],
  'planning-horizon': [
    {
      prompt: 'Describe Plan Start/Current/End and the three horizon rules (two for demand, one for supply).',
      answer: 'Start/Current/End bound the plan window (Current defaults to the server current bucket). Rule 1: demands outside the horizon are strictly ignored. Rule 2: demands between Start and Current are shifted to Current and planned there or later, regardless of the Build-Late Limit (RCA: lead time plan before current). Rule 3: BOH before Current is ignored — on-hand only counts at the Current bucket; expected receipts are treated as cumulatively available at Current.',
    },
  ],
  'sc-basics': [
    {
      prompt: 'Explain why supply chain planning traverses the network BACKWARD, and what the three network types (Manufacturing / Distribution / Procurement) contribute.',
      answer: 'It traverses backward because the due date is the fixed point: starting at the order and subtracting each hop’s lead time upstream finds the latest start that still arrives on time. Procurement (SOURCE) buys components from a supplier, Manufacturing (MAKE) transforms them via BOM + Routing, and Distribution (DELIVER) moves the item to the customer via BOD + Transport Mode — chained together they form the path the demand pulls along.',
    },
  ],
  'demand-sorting': [
    {
      prompt: 'State the five demand sort keys in order, and explain why the sort order is effectively the allocation of scarce supply.',
      answer: 'Priority → Fair-Share Priority → Due Date (ascending) → Quantity (ascending, lower first) → Key sort on remaining Demand Node Components. Because the solver plans each demand to completion before the next, the demand that sorts first gets first claim on scarce on-hand stock and JIT capacity; later demands see only what remains. So ordering the demands is rationing the supply.',
    },
  ],
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
