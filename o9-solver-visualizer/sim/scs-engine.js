// ─────────────────────────────────────────────────────────────────────────────
// o9 SCS Mini-Engine  (sim/scs-engine.js)
//
// A dependency-free ES module — importable in the browser (Solver Playground,
// Scenario Lab, Worked Examples, RCA Clinic) AND in Node (`node --test`). It
// models the DOCUMENTED o9 Supply Chain Solver heuristic: a priority-ranked,
// order-by-order (OBO) backward traversal, in three phases (JIT → Build-Ahead →
// Build-Late), honouring hard constraints and relaxing soft ones per the
// Objective Rank List. Output schemas mirror the real CATMPN `Out_Fact_*` grain.
//
// This is a teaching SIMULATION of the model, not o9's actual solver binary.
// See sim/PRESERVATION.md for the real-vs-simulated honesty ledger.
//
// STATUS: SCAFFOLD. The pure helpers below are implemented and unit-tested.
// The ScsSolver.solve() pipeline is a documented STUB — it returns a valid,
// empty-but-well-shaped Plan so consumers and tests can bind to the contract.
// Full pipeline implementation is Iteration 1 (see REVAMP-BLUEPRINT.md §3/§9).
// ─────────────────────────────────────────────────────────────────────────────

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// Seeded so reset() reproduces the exact same sequence → byte-identical replays.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Pure helpers (IMPLEMENTED + tested) ──────────────────────────────────────

// Net requirement = demand not covered by on-hand, plus safety-stock top-up.
// Floored at zero (never a negative requirement).
export function netRequirement(demand, boh = 0, ss = 0) {
  return Math.max(0, (demand || 0) - (boh || 0) + (ss || 0));
}

// Lot-size rounding: raise to minimum, then ceil to the order multiple, then
// cap at max (a max of 0/undefined means uncapped). Mirrors real
// Minimum_Order_Quantity / Order_Quantity_Multiple handling.
export function roundToLot(qty, { min = 0, mult = 1, max = Infinity } = {}) {
  let q = Math.max(qty || 0, min || 0);
  if (q <= 0) return 0;
  if (mult && mult > 1) q = Math.ceil(q / mult) * mult;
  const cap = !max || max <= 0 ? Infinity : max;
  return Math.min(q, cap);
}

// Demand sort: Priority → Fair-Share Priority → Due Date → Quantity → key.
// STABLE (tie-break on original index). Lower numeric priority = more urgent;
// earlier due date first; larger quantity first. Returns a new array.
export function sortDemands(demands = []) {
  const n = (v, d) => (v === undefined || v === null ? d : v);
  return demands
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const A = a.d, B = b.d;
      return (
        n(A.priority, 1e9) - n(B.priority, 1e9) ||
        n(A.fairShare, 1e9) - n(B.fairShare, 1e9) ||
        String(n(A.dueDate, "")).localeCompare(String(n(B.dueDate, ""))) ||
        n(B.qty, 0) - n(A.qty, 0) ||
        String(n(A.key, "")).localeCompare(String(n(B.key, ""))) ||
        a.i - b.i
      );
    })
    .map((x) => x.d);
}

// Backward lead-time offset: step back `leadTime` WORKING days from dueDay over
// a calendar of working-day indices. `calendar` is an ascending array of valid
// (working) day numbers. Returns the start day, or the calendar's first day if
// the offset runs off the front (a LeadTimePlanBeforeCurrent condition).
export function offsetByLeadTime(dueDay, calendar = [], leadTime = 0) {
  if (!calendar.length) return dueDay - leadTime;
  let idx = calendar.indexOf(dueDay);
  if (idx === -1) {
    // snap to the nearest working day <= dueDay
    for (let i = calendar.length - 1; i >= 0; i--) {
      if (calendar[i] <= dueDay) { idx = i; break; }
    }
    if (idx === -1) idx = 0;
  }
  const target = idx - (leadTime || 0);
  return target < 0 ? calendar[0] : calendar[target];
}

// ── The solver (SCAFFOLD — pipeline is a documented stub) ────────────────────

// The canonical empty Plan shape. Every output grain mirrors the real
// CATMPN Out_Fact_* schemas (see REVAMP-BLUEPRINT.md §2/§3).
export function emptyPlan() {
  return {
    flow: [],        // Out_Fact_DistProd/DistCons Quantity_Solver
    inventory: [],   // Out_Fact_LCItemInventoryBuckets (10 buckets, BOH→EOH)
    delivery: [],    // met-on-time / short / late / weighted-late
    pegging: [],     // from{BODLane,TransMode,LC,Day,GLBItem,LOTID} → to{Order,CustomerType,Customer,LC,Day,GLBItem} + Pegged Qty
    rca: [],         // Out_Fact_SolverRCAReport: RootCause.[Problem Type] + Suggested Available Date
    meta: { solved: false, phases: ["JIT", "BUILD_AHEAD", "BUILD_LATE"] }
  };
}

export class ScsSolver {
  constructor({ network = null, config = {}, seed = 1 } = {}) {
    this.network = network;
    this.config = config;
    this.seed = seed >>> 0;
    this.reset();
  }

  // Rebuild RNG + planning buckets so replays are byte-identical.
  reset() {
    this.rng = mulberry32(this.seed);
    this.plan = emptyPlan();
    return this;
  }

  // The documented pipeline (REVAMP-BLUEPRINT.md §3):
  //   1 demand sort → 2 backward traversal (BOH+ER, WIP-sweep, fresh prod)
  //   → 3 three-phase timing (JIT/BAL/BLL) → 4 alternates/sourcing split
  //   → 5 constraints (lead-time, lot, yield, capacity, storage, no-carry)
  //   → 6 safety-stock pass → 7 excess cleanup → 8 FIFO pegging → 9 outputs.
  //
  // STUB: returns a valid empty Plan. Implemented in Iteration 1.
  solve() {
    this.reset();
    // TODO(iter-1): implement the OBO heuristic pipeline over this.network.
    this.plan.meta.solved = false;
    return this.plan;
  }

  // Stable, serialisable snapshot for determinism tests
  // (assert.deepEqual(build(), build())).
  snapshot() {
    return JSON.parse(JSON.stringify(this.plan));
  }
}

export default ScsSolver;
