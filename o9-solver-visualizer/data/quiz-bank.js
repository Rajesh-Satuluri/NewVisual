// quiz-bank.js — per-module "Test Yourself" questions.
// Shape: { <moduleId>: [ { q, options:[…], answer:<idx>, explanation } ] }
// Auto-appended under a module by script.js → enhanceModule(). Passing at the
// 2/3 ratio marks the module mastered. Grows as modules are built.
export const QUIZ_BANK = {
  'inventory': [
    {
      q: 'Before requesting new production upstream, what does the solver do first in a bucket?',
      options: [
        'Always build fresh supply to be safe',
        'Consume existing on-hand / inventory / expected-receipt supplies',
        'Short the demand',
        'Round up to the max stock',
      ],
      answer: 1,
      explanation: 'The solver looks for existing surplus/inventory/expected-receipt supplies in the JIT and earlier buckets before asking upstream for new supply.',
    },
    {
      q: 'Beginning-On-Hand (BOH) is applicable in which bucket?',
      options: ['Every bucket in the horizon', 'Only the Plan Current bucket', 'Only Plan Start', 'The due-date bucket'],
      answer: 1,
      explanation: 'BOH is only applicable at the current time bucket; BOH defined earlier than current is ignored. Expected Receipts are treated as cumulatively available at Plan Current.',
    },
    {
      q: 'In the inventory buckets, what does EOH represent?',
      options: ['Earliest order horizon', 'End-On-Hand — inventory carried out of the bucket', 'Expected order hold', 'Excess on hold'],
      answer: 1,
      explanation: 'The inventory profile runs BOH → … → EOH: End-On-Hand is what remains (and carries forward) after receipts and consumption in the bucket.',
    },
  ],
  'demand-inputs': [
    {
      q: 'Which attributes of a demand drive the order-by-order sort?',
      options: [
        'Only the quantity',
        'Priority, Fair-Share Priority, Due Date, Quantity, then the Demand Node Component keys',
        'Only the due date',
        'The item and location only',
      ],
      answer: 1,
      explanation: 'The sort keys are Priority → Fair-Share → Due Date (asc) → Quantity (asc) → key on the remaining Demand Node Components.',
    },
    {
      q: 'What are the "Demand Node Components"?',
      options: [
        'The BOM components of the demanded item',
        'The configured dimensions/attributes that identify a demand node (used for the final key sort and attribute-based planning)',
        'The capacity resources',
        'The safety-stock bands',
      ],
      answer: 1,
      explanation: 'Demand Node Components are the configured attributes of the demand node; the final sort key walks them in configured order, and they drive attribute-based demand planning.',
    },
    {
      q: 'On the quantity sort key, which demand is planned first on a tie?',
      options: ['The larger quantity', 'The smaller quantity', 'Whichever arrived first', 'Random'],
      answer: 1,
      explanation: 'Quantity is ascending — the lower quantity is planned first.',
    },
  ],
  'activity-params': [
    {
      q: 'What does an activity’s lead time determine during backward traversal?',
      options: [
        'The lot size',
        'How many buckets earlier the supply must start to arrive on the due date',
        'The demand priority',
        'The safety-stock target',
      ],
      answer: 1,
      explanation: 'Lead time offsets the start bucket backward from the due date — the solver subtracts it to find the latest feasible start.',
    },
    {
      q: 'An activity has effectivity Start W2 / End W5. The backward-planned start bucket lands on W6. What happens?',
      options: [
        'The activity is used anyway',
        'Nothing is planned on this activity — the start is outside its effective window',
        'The lead time is ignored',
        'The demand is split',
      ],
      answer: 1,
      explanation: 'Effectivity (Solver Activity Start/End Date) bounds when an activity may be used; a start outside the window makes the edge inactive, so nothing is planned on it.',
    },
    {
      q: 'When both a time-varying lead time and an expedited lead time apply, which takes precedence?',
      options: ['Expedited lead time', 'The time-varying lead time', 'Whichever is shorter', 'Neither — they add'],
      answer: 1,
      explanation: 'The time-varying lead time takes precedence over an expedited (reduced) lead time.',
    },
  ],
  'capacity': [
    {
      q: 'What do the capacity bands REGULAR / BAND1 / BAND2 represent?',
      options: [
        'Three separate resources',
        'Base capacity plus additional flex capacity tiers',
        'Three demand priorities',
        'Lot-size multiples',
      ],
      answer: 1,
      explanation: 'REGULAR is base capacity; BAND1/BAND2 are flex tiers used on top of base (e.g. during constrained phases) at the cost of using more expensive capacity.',
    },
    {
      q: 'With Capacity Constraint = False (unconstrained), what happens?',
      options: [
        'No supply is planned',
        'Capacity is treated as unlimited, so supply can be planned JIT regardless of load',
        'Only safety stock is planned',
        'All demand is shorted',
      ],
      answer: 1,
      explanation: 'Unconstrained planning ignores capacity limits — useful to see demand feasibility without the capacity bottleneck.',
    },
    {
      q: 'The Capacity Consumption Graph association tells the solver that an activity:',
      options: [
        'Produces a product',
        'Is constrained by the capacity of the resource it is attached to',
        'Consumes a material',
        'Has a lot size',
      ],
      answer: 1,
      explanation: 'The Capacity Consumption Graph marks that an activity node is constrained by the capacity available from its resource.',
    },
  ],
  'safety-stock': [
    {
      q: 'When is safety stock typically planned relative to regular demand?',
      options: [
        'Before regular demand',
        'After regular demand (as an additional demand on the target)',
        'It is never planned, only reported',
        'Simultaneously with WIP',
      ],
      answer: 1,
      explanation: 'Safety stock is planned as an additional "demand" to top inventory up to its target, typically after regular demand (unless SS-interleaves-with-demand is set).',
    },
    {
      q: 'Under the TARGET_LEVEL inventory plan policy, the solver replenishes to:',
      options: ['Zero', 'The safety-stock target level in each bucket', 'The max stock only', 'The lot multiple'],
      answer: 1,
      explanation: 'TARGET_LEVEL tops projected on-hand up to the configured safety-stock target level.',
    },
    {
      q: 'What does Adaptive SS BAL do?',
      options: [
        'Increases safety stock everywhere',
        'Reduces the Build-Ahead Limit for safety-stock demands to optimise performance',
        'Disables safety stock',
        'Sets the lot size',
      ],
      answer: 1,
      explanation: 'Adaptive SS BAL reduces the Build-Ahead Limit for safety-stock planning (performance optimisation) when the target isn’t met in a bucket.',
    },
  ],
  'wip': [
    {
      q: 'By default, when is WIP planned relative to demand?',
      options: ['After demand', 'Before demand', 'Only on holidays', 'Never'],
      answer: 1,
      explanation: 'WIP is planned before demand by default; the "WIP Interleaves With Demand" flag lets demand be planned ahead of WIP.',
    },
    {
      q: 'What does the freeze window (Respect Freeze Window For WIPs) protect?',
      options: [
        'The safety-stock target',
        'Near-term committed WIP from being replanned',
        'The max stock',
        'The objective rank list',
      ],
      answer: 1,
      explanation: 'The freeze window protects near-term in-progress production from being disturbed by replanning.',
    },
    {
      q: 'Setting "WIP Interleaves With Demand" to TRUE means:',
      options: [
        'WIP is ignored',
        'Demand can be planned ahead of WIP (they interleave)',
        'WIP always wins',
        'Safety stock is planned first',
      ],
      answer: 1,
      explanation: 'When true, WIP and demand can interleave — demand may be planned ahead of WIP rather than strictly after it.',
    },
  ],
  'lot-sizing': [
    {
      q: 'In what order does lot sizing shape a net requirement?',
      options: [
        'Cap at max → raise to min → round to multiple',
        'Raise to minimum order qty → ceil to the order multiple → cap at max',
        'Round to multiple → cap at max → raise to min',
        'It applies none of these',
      ],
      answer: 1,
      explanation: 'roundToLot: raise to the minimum, ceil to the order multiple, then cap at the max (0/undefined max = uncapped).',
    },
    {
      q: 'What does the Max Stock constraint limit?',
      options: [
        'The minimum order quantity',
        'How much inventory may be held at a node',
        'The demand priority',
        'The lead time',
      ],
      answer: 1,
      explanation: 'Max Stock caps the inventory a node may carry, limiting build-ahead that would exceed it.',
    },
    {
      q: 'The Storage constraint restricts:',
      options: [
        'The number of demands',
        'The physical storage capacity available to hold inventory',
        'The activity priority',
        'The safety-stock bands',
      ],
      answer: 1,
      explanation: 'The Storage constraint bounds how much can be stored (storage capacity), another ceiling on carried inventory.',
    },
  ],
  'objective-rank-list': [
    {
      q: 'What are the four levels of the Objective Rank List?',
      options: [
        'Priority, Fair-Share, Due Date, Quantity',
        'Band, Lot, Activity Marker, Late',
        'JIT, Build-Ahead, Build-Late, Short',
        'BOH, ER, EOH, WIP',
      ],
      answer: 1,
      explanation: 'The four soft constraints are Band (capacity/storage), Lot, Activity Marker, and Late. Default order: Band, Lot, ActivityMarker, Late.',
    },
    {
      q: 'In which direction does the solver relax the Objective Rank List?',
      options: ['Left to right', 'Right to left', 'Randomly', 'All at once'],
      answer: 1,
      explanation: 'Right to left: the rightmost entry is sacrificed first, the leftmost protected longest. Default relaxes Late → ActivityMarker → Lot → Band.',
    },
    {
      q: 'If a user provides only "Late, ActivityMarker", what does the solver use?',
      options: [
        'Just those two',
        'Late, ActivityMarker, Band, Lot (missing ones appended on the right in default order)',
        'The default, ignoring the input',
        'Band, Lot, Late, ActivityMarker',
      ],
      answer: 1,
      explanation: 'The solver appends the missing entries on the right in default order, giving Late, ActivityMarker, Band, Lot.',
    },
  ],
  'network-types': [
    {
      q: 'Which building blocks define a Manufacturing (MAKE) network in SCS?',
      options: [
        'Bill of Distribution + Transport Mode',
        'Bill of Material + Routing',
        'Supplier + Lead Time',
        'Objective Rank List + Priority',
      ],
      answer: 1,
      explanation: 'Manufacturing (SCOR MAKE) is built from BOM (produced part + components) and Routing (process lane + resources). BOD + Transport Mode is Distribution.',
    },
    {
      q: 'A material node has several alternate production edges. Which attribute does the solver compare FIRST?',
      options: [
        'Activity node end date',
        'Whether proportion is enabled',
        'Activity Priority (lower = higher)',
        'The activity key',
      ],
      answer: 2,
      explanation: 'Producer sort: Activity Priority → proportion-enabled → activity key → later end date. Priority dominates.',
    },
    {
      q: 'What is a "composite activity node"?',
      options: [
        'A material node shared by two locations',
        'An activity assembled from component dimensions (e.g. BOM + Routing)',
        'A demand split across two items',
        'The output pegging record',
      ],
      answer: 1,
      explanation: 'A composite activity node is one activity built from component dimensions — BOM + Routing for Manufacturing, BOD + Transport Mode for Distribution. It is optional.',
    },
  ],
  'nodes-graphs': [
    {
      q: 'What three elements make up every SCS graph relationship?',
      options: [
        'Item, Location, Time',
        'FROM node, TO node, and the edge',
        'Demand, Supply, Capacity',
        'Priority, Quantity, Due date',
      ],
      answer: 1,
      explanation: 'Graphs link nodes via a FROM node, a TO node, and the edge between them — this is how the whole network is built.',
    },
    {
      q: 'In the Material Production Graph, what does a Production Priority of n < 0 mean?',
      options: [
        'Highest possible priority',
        'The path is blocked — the solver will not use that edge',
        'Treated as 32,767',
        'Produce in reverse order',
      ],
      answer: 1,
      explanation: 'Lower = higher (0 is top); NULL = 32,767; a negative value blocks the path entirely.',
    },
    {
      q: 'What does the Association measure (value 1 or 0) on a graph edge control?',
      options: [
        'The lot size',
        'Whether the edge is active (1) or inactive (0) in the network',
        'The demand priority',
        'The number of units produced',
      ],
      answer: 1,
      explanation: 'Association is a Boolean switch: 1 = edge active in the network, 0 = inactive. Qty Per carries the per-unit quantity separately.',
    },
  ],
  'planning-horizon': [
    {
      q: 'A demand’s due date falls before Plan Start. What does the solver do?',
      options: [
        'Shifts it to Plan Start',
        'Plans it anyway',
        'Strictly ignores it',
        'Shifts it to Plan Current',
      ],
      answer: 2,
      explanation: 'Demands with due dates outside the horizon (before Start or after End) are strictly ignored.',
    },
    {
      q: 'A demand is due between Plan Start and Plan Current. What happens, and does the Build-Late Limit matter for the shift?',
      options: [
        'It is ignored unless BLL > 0',
        'It is shifted to Plan Current regardless of the BLL, then planned there or later',
        'It is planned exactly on its original due date',
        'It is split evenly across the horizon',
      ],
      answer: 1,
      explanation: 'Such demands are shifted to the Current bucket irrespective of the BLL; BLL only governs whether they can be planned later than Current.',
    },
    {
      q: 'Beginning-On-Hand (BOH) defined in a bucket earlier than Plan Current is:',
      options: [
        'Carried forward to Current automatically',
        'Ignored — BOH only counts at the Current bucket',
        'Doubled',
        'Used only for safety stock',
      ],
      answer: 1,
      explanation: 'BOH before the current bucket is ignored; on-hand is only applicable at Plan Current. A common cause of phantom shortages.',
    },
  ],
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
