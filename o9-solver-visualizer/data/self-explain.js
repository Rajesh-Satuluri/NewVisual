// self-explain.js — retrieval-practice prompts per module.
// Shape: { <moduleId>: [ { prompt, answer } ] }
// Auto-appended under a module by script.js → enhanceModule().
export const SELF_EXPLAIN = {
  'inventory': [
    {
      prompt: 'Explain how the solver uses on-hand and expected receipts before producing new supply, and the horizon rule about BOH timing.',
      answer: 'In each bucket the solver first looks for existing supply — on-hand inventory, prior surplus carried forward, and expected receipts — and consumes that before asking upstream to produce anything new. Beginning-On-Hand only counts at the Plan Current bucket (BOH defined earlier is ignored); expected receipts are treated as cumulatively available at Plan Current. The inventory profile runs BOH → receipts/consumption → EOH (end-on-hand carried forward).',
    },
  ],
  'demand-inputs': [
    {
      prompt: 'Describe how a demand is represented and which of its attributes drive the sort versus pegging/sourcing.',
      answer: 'A demand is a signal incident on a material node (Item×Location), with a composite grain (Order, Time, optional Customer, Item, Location, Version). Its attributes drive the sort — Priority (Demand Layer Measure), Fair-Share (Demand Priority Measure), Due Date, Quantity (Demand Qty Measure Name), then the remaining Demand Node Component keys — while attribute-based fields (e.g. revised priority / network selection) drive sourcing and pegging.',
    },
  ],
  'activity-params': [
    {
      prompt: 'Explain how lead time and yield on an activity change what and when the solver starts.',
      answer: 'Lead time offsets the start backward from the due date — the solver subtracts it to find the latest feasible start bucket. Yield means you must start more than you need: at 80% yield, netting 100 good units requires starting 125. Quantity-per sets the consumption/production recipe, and activity priority (lower = higher) orders alternate producers.',
    },
  ],
  'capacity': [
    {
      prompt: 'Explain capacity bands and the difference between constrained and unconstrained planning.',
      answer: 'Capacity is modelled via the Capacity Consumption Graph: an activity is constrained by its resource. REGULAR is base capacity; BAND1/BAND2 are flex tiers used on top of base during constrained phases. With Capacity Constraint = True the solver must respect these limits (spilling into flex, then building ahead/late); with it False (unconstrained) capacity is treated as unlimited and everything can be met JIT.',
    },
  ],
  'safety-stock': [
    {
      prompt: 'Explain how safety stock is planned and what the TARGET_LEVEL policy does.',
      answer: 'Safety stock is planned as an additional "demand" that tops projected on-hand up to a target, typically after regular demand (unless SS-interleaves-with-demand is set). Under the TARGET_LEVEL inventory plan policy the solver replenishes each bucket up to the configured safety-stock target. SS bands/priority allocate scarce supply across SS, and Adaptive SS BAL reduces the build-ahead limit for SS to optimise performance.',
    },
  ],
  'wip': [
    {
      prompt: 'Explain what WIP is, when it is planned relative to demand, and what the freeze window and interleave flag do.',
      answer: 'WIP is in-progress production already committed on a routing. By default the solver plans WIP before demand. The freeze window protects near-term committed WIP from being replanned. Setting "WIP Interleaves With Demand" to true lets demand be planned ahead of WIP (they interleave) rather than strictly after it.',
    },
  ],
  'lot-sizing': [
    {
      prompt: 'Describe how a net requirement becomes a lot-sized order, and how Max Stock and Storage further constrain it.',
      answer: 'Lot sizing raises the net requirement to the minimum order quantity, ceils it to the order multiple, then caps it at the max (roundToLot). Max Stock caps how much inventory a node may hold, and the Storage constraint caps the physical storage available — both act as ceilings that limit build-ahead beyond what can be carried/stored.',
    },
  ],
  'objective-rank-list': [
    {
      prompt: 'Explain the Objective Rank List, its four levels, and the direction of relaxation.',
      answer: 'It is the solver\'s objective: a four-level nested list of soft constraints — Band (capacity/storage), Lot, Activity Marker, Late. When a demand can\'t be met fully, the solver relaxes them from right to left, so the rightmost is sacrificed first and the leftmost protected longest. Default is Band, Lot, ActivityMarker, Late (relaxing Late first). Fewer than four entries are auto-filled on the right in default order; 24 orderings are possible.',
    },
  ],
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
  'sourcing-logic': [
    {
      prompt: 'List, in order, the keys the solver compares to choose among alternate production edges at a material node — and say what time-varying priority changes.',
      answer: 'Alternate production edges are sorted by: (1) Activity Priority (lower number = higher priority), (2) edge with proportion enabled, (3) the activity/member key (lower first), (4) the activity with the later end date — each key breaking a tie in the one before. With time-varying priority the solver uses the alternate priority in the PRODUCED bucket to select (it takes precedence over static priority); alternate-priority changes do not affect Demand Build-Ahead, No-Carry, SS MOVE_IN, or Excess Cleanup MOVE_OUT.',
    },
  ],
  'pegging': [
    {
      prompt: 'Explain what pegging is, how it differs from a flow plan, and what it can be pegged to.',
      answer: 'Pegging is a FIFO post-process that links a demand/order to the specific supply that fulfils it — the quantities produced and consumed at each material and capacity node across time buckets along the supply path. A Flow Plan shows only the aggregate flow of goods across nodes; pegging is per-order ("how many units are pegged to this order"). It can peg to material or capacity (and storage), supports Preferential Pegging via a Pegging ID, proportional-sourcing pegging, and hard / class-based pegging to on-hand supplies.',
    },
  ],
  'excess-cleanup': [
    {
      prompt: 'Explain what "excess" is and what the three Excess Clean Up strategies (RELEASE, MOVE_OUT, None) do.',
      answer: 'Excess is Ending-On-Hand a node carries above the safety-stock target (the Excess Clean Up parameter defaults to SS; the workflow resolves EOH violations). The Excess Clean Up Strategy has three options: RELEASE (default) releases the producing flow plan so it is never built; MOVE_OUT pushes the excess out of the node downstream to a consuming node (as Push Excess does at no-carry nodes); None leaves the excess in place. Bands for Excess and Push Excess By give finer control over where and how the excess is pushed.',
    },
  ],
  'solver-outputs': [
    {
      prompt: 'Name the main output plans/reports SCS writes, and say what the Delivery Plan captures for an unmet demand.',
      answer: 'SCS writes the Demand Fulfilment Report, the Delivery Plan, Flow Plans (aggregate flow of goods across material nodes — consumption, production, capacity, storage), the Inventory Plan (BOH/EOH per material node), and the Feasible WIP Plan Export, plus the Where-Used report. For a demand not fully met in a constrained run the Delivery Plan records Total MetOnTime, Total Short Quantity, Total Late Quantity, a Weighted Late Quantity, and the Commit Date.',
    },
  ],
  'rca': [
    {
      prompt: 'Explain what an RCA record gives you for a short/late demand, and name the RCA kinds.',
      answer: 'For each short or late demand RCA reports the Problem Type — the root-cause constraint that bound it (Material: MaterialShort, LeadTimePlanBeforeCurrent, FrozenPeriod, Effectiveness, NoBuild, Holiday…; Capacity: CapacityShort / RegularCapacityShort / ARCConstraint; Storage) — with the constraint item/resource, the constraint bucket and the RCA (short) quantity; the committed/available date is the Commit Date measure. RCA is reported against the JIT constraint bucket. Kinds: Stand-Alone RCA (RCA-only pass, no planning), Combined Material & Capacity RCA (merged into one graph), Actionable RCA (primary path + JIT bucket, with RCA Fence / exclude-demands / due-date offset), and Enhanced RCA (WIP-sweep + cost-analysis pre-process).',
    },
  ],
  'debug': [
    {
      prompt: 'List the three quick checks that tell you an SCS plan is valid, and sketch the solver execution order.',
      answer: 'A valid plan has: (1) no Negative On-Hand, (2) no Capacity Overload, (3) Σ Pegging = Plan (the pegged totals reconcile to the plan, no mismatch). The solver runs: config validation → truncate outputs → load data → WIP planning & WIP RCA → excess cleanup (flag-based) → Demand Planning (OBO) → excess cleanup → Safety Stock Planning → Replanning of late/short → Push Planning → Min Res utilization → OBO RCA → Peggings → Exports → additive/SS/zero-qty RCA & exports → finish.',
    },
  ],
  'invocation': [
    {
      prompt: 'How is the SCS solver invoked, and what is the difference between a FULL plan and an INCREMENTAL_PLAN?',
      answer: 'It is invoked two ways: a command-line exec statement — `exec plugin instance SupplyChainSolver for Measures {...} using scope (...) arguments {([Material Constrained], "true"), ([Capacity Constrained], "true"), ([Plan Type], "...")}` — or a configured Action Button in the Workspace (confirm success via the bell icon). Plan Type = FULL_PLAN rebuilds the whole plan from scratch; INCREMENTAL_PLAN (net-change) handles new/rush demands on top of the existing plan while minimizing impact on existing commitments; Delete_Plan clears the plan outputs. The [Material Constrained] / [Capacity Constrained] flags select unconstrained vs constrained (both true = fully constrained). Persist Mode (None / Persist) gives a data-load read-time benefit for incremental runs.',
    },
  ],
};
