// quiz-bank.js — per-module "Test Yourself" questions.
// Shape: { <moduleId>: [ { q, options:[…], answer:<idx>, explanation } ] }
// Auto-appended under a module by script.js → enhanceModule(). Passing at the
// 2/3 ratio marks the module mastered. Grows as modules are built.
export const QUIZ_BANK = {
  'sc-basics': [
    {
      q: 'In which direction does the o9 solver traverse the network to plan a demand?',
      options: [
        'Forward — from supplier (upstream) to customer (downstream)',
        'Backward — from customer (downstream) to supplier (upstream)',
        'Top-down — from finished good to raw material in one pass',
        'It plans all nodes simultaneously',
      ],
      answer: 1,
      explanation: 'Planning is demand-driven backward propagation: it starts at the order and asks each upstream node for what it needs, until it reaches real supply — then confirms the flow forward.',
    },
    {
      q: 'Which SCOR operation does a Distribution network model, and what is its building block?',
      options: [
        'MAKE — Bill of Material',
        'SOURCE — Supplier',
        'DELIVER — Bill of Distribution + Transport Mode',
        'PLAN — Objective Rank List',
      ],
      answer: 2,
      explanation: 'Distribution = the DELIVER operation: moving an item between locations, modelled with Bill of Distribution (BOD) and Transport Mode. Manufacturing = MAKE (BOM + Routing); Procurement = SOURCE (Supplier).',
    },
    {
      q: 'Why does the solver traverse backward from the due date rather than forward from the factory?',
      options: [
        'Because upstream nodes are always faster',
        'Because the due date is the fixed point — walking lead times back finds the latest feasible start that still arrives on time',
        'Because forward planning is not supported by GraphCube',
        'To minimise the number of suppliers used',
      ],
      answer: 1,
      explanation: 'The due date is fixed; the only way to know when to start is to subtract each hop’s lead time back from when the customer needs it — the Just-In-Time ideal.',
    },
  ],
  'demand-sorting': [
    {
      q: 'What is the correct order of the demand sort keys?',
      options: [
        'Due Date → Priority → Quantity → Fair-Share → Key',
        'Priority → Fair-Share → Due Date → Quantity → Key',
        'Priority → Due Date → Quantity → Fair-Share → Key',
        'Quantity → Priority → Due Date → Fair-Share → Key',
      ],
      answer: 1,
      explanation: 'Demand Priority → Fair-Share Priority → Due Date (ascending) → Quantity (ascending) → Key sort on remaining Demand Node Components.',
    },
    {
      q: 'Two demands tie on priority, fair-share and due date. Which is planned first?',
      options: [
        'The one with the LARGER quantity',
        'The one with the SMALLER quantity',
        'Whichever was entered first',
        'They are planned together',
      ],
      answer: 1,
      explanation: 'Quantity is the 4th key and is ASCENDING — "lower quantity is planned first". A common trap: it is not largest-first.',
    },
    {
      q: 'Which SCS config property configures the FAIR-SHARE priority key?',
      options: [
        'Demand Layer Measure',
        'Demand Priority Measure',
        'Demand Qty Measure Name',
        'Demand Node Components',
      ],
      answer: 1,
      explanation: 'Naming quirk: Demand Priority Measure configures the fair-share key. The primary Demand Priority is configured by Demand Layer Measure.',
    },
  ],
  'what-is-solver': [
    {
      q: 'What kind of engine is the o9 Supply Chain Solver?',
      options: [
        'A cost-minimising linear/mixed-integer optimiser',
        'A priority-ranked, order-by-order heuristic plugin in the GraphCube server',
        'A machine-learning demand forecaster',
        'A spreadsheet macro that nets supply and demand',
      ],
      answer: 1,
      explanation: 'SCS is a heuristic plugin (o9.GraphCube.Plugins) that plans one demand at a time in priority order — not a single global LP/MIP optimisation.',
    },
    {
      q: 'Where does the solver run and what plan does it operate on?',
      options: [
        'In the client browser, on any plan',
        'As a GraphCube server plugin, on the Supply Plan',
        'Inside the ETL/SSIS layer, on staging tables',
        'In the rule engine, on the Demand Plan',
      ],
      answer: 1,
      explanation: 'The solver is a GraphCube server plugin and runs on the Supply Plan; the rule engine prepares inputs before and consumes outputs after.',
    },
    {
      q: 'In the planning stack, what runs immediately before and after the solver?',
      options: ['Nothing — the solver is standalone', 'The rule engine (before and after)', 'The forecast engine', 'The ETL pipeline only'],
      answer: 1,
      explanation: 'The stack is Rule Engine → Solver → Rule Engine: rules stage inputs, the solver plans, rules post-process outputs.',
    },
  ],
  'obo-heuristic': [
    {
      q: 'How is the o9 Supply Chain Solver best described?',
      options: [
        'A cost-minimising LP / MIP optimiser',
        'A priority-ranked, order-by-order heuristic',
        'A machine-learning demand forecaster',
        'A rules-only engine with no planning',
      ],
      answer: 1,
      explanation: 'It plans one demand at a time in priority order, honouring hard constraints and relaxing soft ones per the Objective Rank List.',
    },
    {
      q: 'Which key does the demand sort apply FIRST?',
      options: ['Due Date', 'Quantity', 'Priority', "The order's key"],
      answer: 2,
      explanation: 'Order is Priority → Fair-Share Priority → Due Date → Quantity → key. Priority dominates.',
    },
    {
      q: 'Two demands need the same scarce stock on the same day. Who is met on time?',
      options: ['The larger-quantity demand', 'Whichever was entered first', 'The higher-priority demand (planned first)', 'They split it evenly'],
      answer: 2,
      explanation: 'Planning is strictly sequential: the higher-priority demand is planned first and consumes the scarce supply; the next sees only what remains.',
    },
  ],
  'three-phases': [
    {
      q: 'The three timing phases, in the order the solver tries them, are:',
      options: [
        'Build-Late → JIT → Build-Ahead',
        'JIT → Build-Ahead → Build-Late',
        'Build-Ahead → JIT → Build-Late',
        'JIT → Build-Late → Build-Ahead',
      ],
      answer: 1,
      explanation: 'The solver prefers Just-In-Time, then builds ahead (up to the Build-Ahead Limit), and only then plans late (up to the Build-Late Limit) before declaring a shortage.',
    },
    {
      q: 'What does the Build-Ahead Limit control?',
      options: [
        'How late supply may arrive',
        'How early the solver may build and carry supply',
        'The maximum order quantity',
        'The safety-stock target',
      ],
      answer: 1,
      explanation: 'Build-Ahead Limit caps how far ahead of the due date the solver may build (and therefore carry) supply when JIT is infeasible.',
    },
    {
      q: 'If a demand cannot be met even within the Build-Late Limit, the solver:',
      options: ['Ignores the demand', 'Reports a shortage (and an RCA reason)', 'Automatically raises priority', 'Splits it to another item'],
      answer: 1,
      explanation: 'Beyond the Build-Late Limit the demand is short; the solver records the shortfall and a Root-Cause Problem Type.',
    },
  ],
};
