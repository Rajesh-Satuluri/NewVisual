/* ============================================================
   business-lens.js — the recurring supply-chain business example
   Appended below every concept module by the router, so the same
   "CAT Aftermarket Parts Network" (Widget-A) illustrates each o9
   solver concept in a real business context.
   SolverViz.BusinessLens.append(container, moduleId)
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  // Each entry ties one concept to the running CAT / Widget-A case.
  // Keys are module route ids. Non-concept pages (home, quiz…) omitted.
  var DATA = {
    "what-is-solver": {
      task: "Nightly CATMPN supply solve", system: "o9 Distribution Planning Solver",
      meaning: "Turn Widget-A demand into a purchase schedule automatically.",
      point: "Every night the solver reads Widget-A's forecast, on-hand and safety stock at <b>LC-Store-A</b>, walks up through <b>DC-North → DC-National → Supplier X</b>, and writes back a <b>500-unit</b> purchase schedule — a decision a planner could never make by hand across the whole Item × LC × Supplier network."
    },
    "planning-engine-stack": {
      task: "Rule engine → solver → rule engine", system: "o9 planning stack",
      meaning: "See where the solve sits in the nightly batch.",
      point: "Before the solve, the rule engine stages Widget-A's SplitWeek forecast, inventory position and constraints. The solver then decides the 500-unit order. After the solve, the rule engine reads that output back to compute exception flags, delivery-plan metrics and pegging — so the Buyer's workbench shows a complete picture at 8 AM."
    },
    "why-solver": {
      task: "Balance supply for hundreds of Item-LCs", system: "Full CAT network",
      meaning: "Why hand/spreadsheet planning fails here.",
      point: "Widget-A is one of hundreds of parts across dozens of LCs and a 740-day horizon. Balancing lead times, delivery calendars, safety stock and MOQs by hand is infeasible. The solver does the whole network in one consistent pass in seconds — that's the reason the solver exists."
    },
    "solver-components": {
      task: "Consumption + Production + WIP solve", system: "Coupled solver components",
      meaning: "What actually leaves a node vs. arrives at a node.",
      point: "For Widget-A the <b>Production Solver</b> decides the 500-unit planned receipt at DC-North, while the <b>Consumption Solver</b> decides the matching 500-unit draw from Supplier X on the ship date. The WIP component handles intermediate states and infeasibility — together they model the full flow, not just one side of it."
    }
    ,
    // ── DRP Framework ──
    "drp-overview": {
      task: "Demand climbs LC-Store-A → Supplier X", system: "DRP methodology",
      meaning: "Propagate customer demand upward, level by level.",
      point: "Widget-A demand at LC-Store-A (L1) becomes DRP Independent Demand at DC-North (L2), consolidates at DC-National (L3), and lands as a Purchase Schedule at Supplier X (L4) — one aligned chain."
    },
    "multi-echelon": {
      task: "4-echelon Widget-A solve", system: "CAT network",
      meaning: "One integrated pass across all levels.",
      point: "The 350-unit net requirement at LC-Store-A propagates up and returns as a constrained 500-unit purchase schedule cascading back down — solved together, so the supplier plan can't drift from customer demand."
    },
    objectives: {
      task: "Fulfil Widget-A on time", system: "Delivery Plan measures",
      meaning: "Demand-first, then position inventory ahead.",
      point: "For Widget-A the solver first guarantees the Week-3 forecast is met on time (Total Met OnTime Qty), then positions stock for future periods across the 740-day horizon — never a pure cost minimisation."
    },
    // ── Solver Inputs ──
    "demand-inputs": {
      task: "Stage Widget-A demand", system: "Rule engine (before solve)",
      meaning: "The signal the solver must meet.",
      point: "SplitWeek Final Forecast = 100 units/slot at LC-Store-A → 400 units to Week 3. The solver consumes this; it does not create it."
    },
    "inventory-inputs": {
      task: "Widget-A inventory position", system: "LC-Store-A",
      meaning: "On-hand offsets demand; safety stock adds a buffer.",
      point: "On hand 200, Safety Stock Final 150. These flow straight into the net-requirement formula: 400 − 200 + 150 = 350 units."
    },
    "supply-order-inputs": {
      task: "Net out in-flight supply", system: "Open POs / in-transit STOs",
      meaning: "Count committed supply so you don't double-order.",
      point: "If a 200-unit STO is already inbound to DC-North for Widget-A, the solver subtracts it before generating any new order."
    },
    "network-topology": {
      task: "Walk the Widget-A graph", system: "BILT / BOD graphs",
      meaning: "Which node sources which, on what lane.",
      point: "Widget-A's BILT lanes define Supplier X → DC-National → DC-North → LC-Store-A. The solver traverses exactly this graph to decide sourcing."
    },
    "constraint-params": {
      task: "Read Widget-A parameters", system: "Solver parameters",
      meaning: "The numeric levers read at solve time.",
      point: "Min 50, Mult 50, Lead time 14 days — these turn the 350-unit requirement into a 500-unit order shipped today for Week-3 delivery."
    },
    "capacity-inputs": {
      task: "Respect LC throughput", system: "Inbound / outbound capacity",
      meaning: "Keep the plan physically executable.",
      point: "If Week-3 receipts exceed LC-Store-A's inbound box capacity, the solver spreads them across days or flags a shortage rather than planning the impossible."
    },
    // ── Constraints ──
    "freeze-windows": {
      task: "Check Widget-A ship date vs fence", system: "Firm Fence / Activity Freeze",
      meaning: "Can't change plans already underway.",
      point: "If Widget-A's required ship date falls inside the freeze, the solver raises a Short Exception and alerts the planner instead of auto-ordering."
    },
    "calendar-constraints": {
      task: "Place Widget-A on valid days", system: "Transport / supplier / LC calendars",
      meaning: "Only ship and receive on working days.",
      point: "If LC-Store-A receives only Mon & Thu, the planned receipt lands on the nearest valid delivery day; a supplier holiday shifts the ship date earlier."
    },
    "quantity-constraints": {
      task: "Round Widget-A order", system: "Min / Mult / EOQ",
      meaning: "Economic and logistical order sizing.",
      point: "70 boxes needed → Min 50 ✓ → Mult 50 → 100 boxes (500 units). The extra 150 units become projected safety stock."
    },
    "capacity-constraints": {
      task: "Soft-cap Widget-A receipts", system: "Inbound/outbound/demonstrated capacity",
      meaning: "Breach is allowed, then flagged.",
      point: "If demand forces receipts above LC-Store-A's capacity, the solver plans the breach and raises an exception — a soft constraint, unlike the hard freeze."
    },
    "network-validity": {
      task: "Use only real Widget-A lanes", system: "Effective dates / split ratio / NoCarry",
      meaning: "No phantom supply, correct source splits.",
      point: "Dual-source Widget-A is split (e.g. 60/40) by Split Ratio; expired lanes are ignored; NoCarry stops the solver stockpiling surplus forward."
    },
    "priority-constraints": {
      task: "Ration Widget-A when short", system: "Priority framework",
      meaning: "Fulfil the most critical demand first.",
      point: "Priority Part → SCHEDULE ORDER → COMMERCIAL → PULL, tie-broken by Demand Priority. Widget-A as a Priority Part is supplied before lower tiers, and its Line Down Date is tracked."
    },
    // ── Solver Decisions ──
    "net-requirements": {
      task: "Compute Widget-A net requirement", system: "Solver core",
      meaning: "How much new supply is needed.",
      point: "max(0, 400 − 200 + 150) = 350 units, converted to 70 boxes, rounded by Min/Mult to a 500-unit order — the single most-asked calculation in an interview."
    },
    "timing-logic": {
      task: "Back-schedule Widget-A", system: "Lead time + freeze",
      meaning: "When the order must ship.",
      point: "Required ship date = Week-3 delivery − 14-day lead time = today. If that date were inside the freeze, the solver would raise a shortage exception instead of ordering."
    },
    "sourcing-logic": {
      task: "Choose Widget-A's source", system: "BILT graph + priority",
      meaning: "Where supply comes from.",
      point: "Single-source Widget-A uses its one active BILT lane; if it were dual-sourced, Split Ratio would divide the 500 units across suppliers in fixed proportions."
    },
    "shortage-handling": {
      task: "Widget-A can't be fully met", system: "Shortage-allocation mode",
      meaning: "Detect, ration, record, escalate.",
      point: "The six-step flow records Short Qty, tiers it by horizon, traces root cause via MaterialRootCause, and raises Short Exception — never a silent miss."
    },
    allocation: {
      task: "Split short Widget-A supply", system: "Priority framework",
      meaning: "Who gets the limited supply.",
      point: "300 available units fill Priority-Part and SCHEDULE-ORDER demand first; COMMERCIAL and PULL absorb the shortfall — consistent, rule-based rationing."
    },
    pegging: {
      task: "Trace a Widget-A demand line", system: "Consumption/Production pegging",
      meaning: "Which PO fulfils which demand.",
      point: "The customer demand pegs down to DC-North's receipt, to DC-National's supply, to the specific Supplier PO — full traceability for promise accuracy."
    },
    // ── Execution & Outputs ──
    "batch-sequence": {
      task: "Run the nightly CAT batch", system: "Automated daily cycle",
      meaning: "Ingestion → rule → solve → rule → outputs.",
      point: "Widget-A's 500-unit plan is produced inside one automated nightly run, so any change since yesterday is re-optimised without anyone pressing a button."
    },
    "solver-outputs": {
      task: "Write Widget-A results back", system: "Supply/Inventory/Delivery/Exception",
      meaning: "What the Buyer actually sees.",
      point: "Dist Prod Qty 500, Purchase Schedule 500, SCS Ending on Hand 300, InvHealth InStock — the numbers on the 8 AM workbench all come from these output families."
    },
    "worked-example": {
      task: "Widget-A end to end", system: "All six solver stages",
      meaning: "The canonical narrated solve.",
      point: "Input → net requirement 350 → constrained 500 → ship today → outputs → ending OH 300 InStock. Narrate these six with the numbers and you own the core interview question."
    }
  };

  function row(k, v, mono) {
    return '<div class="lens-row"><span class="lens-k">' + k + "</span>" +
      (mono ? '<code class="lens-v-mono">' + v + "</code>" : '<span class="lens-v">' + v + "</span>") +
      "</div>";
  }

  function create(id) {
    var d = DATA[id];
    if (!d) return null;
    var sec = document.createElement("section");
    sec.className = "section lens-section animate-fade-in";
    sec.innerHTML =
      '<div class="lens-card">' +
        '<div class="lens-head">' +
          '<span class="lens-badge">📦 Real business example</span>' +
          '<span class="lens-head-title">How this shows up in the CAT Aftermarket Parts Network</span>' +
        "</div>" +
        '<div class="lens-grid">' +
          '<div class="lens-meta">' +
            row("Where", d.task, true) +
            row("Business meaning", d.meaning, false) +
            row("System", d.system, false) +
          "</div>" +
          '<div class="lens-point">' +
            "<p>" + d.point + "</p>" +
            '<a class="lens-link" href="#business-scenario">See the full nightly solve story →</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    return sec;
  }

  function append(container, id) {
    if (!container) return;
    var el = create(id);
    if (el) container.appendChild(el);
  }

  AV.BusinessLens = { create: create, append: append, has: function (id) { return !!DATA[id]; } };
})();
