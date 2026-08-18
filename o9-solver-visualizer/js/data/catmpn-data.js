/* ============================================================
   catmpn-data.js — the recurring business case
   "CAT Aftermarket Parts Network": a 4-echelon distribution
   network and the hero item Widget-A, using the exact numbers
   from the o9 Solver Framework worked example. Reused by every
   module so figures stay consistent across the whole visualizer.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});

  NS.CATMPN = {
    entity: "CAT Aftermarket Parts Network",

    // 4-echelon network: Supplier -> Central DC -> Regional DC -> Store LC
    network: {
      nodes: [
        { id: "supplier", label: "Supplier X", sub: "Source", tier: 4, color: "supplier" },
        { id: "dc-nat",   label: "DC-National", sub: "Central DC", tier: 3, color: "dc" },
        { id: "dc-north", label: "DC-North", sub: "Regional DC", tier: 2, color: "dc" },
        { id: "lc-store", label: "LC-Store-A", sub: "Customer LC", tier: 1, color: "lc" },
        { id: "customer", label: "Customer", sub: "Demand", tier: 0, color: "demand" }
      ],
      // demand propagates upward (customer->store->regional->central->supplier)
      lanes: [
        ["supplier", "dc-nat"],
        ["dc-nat", "dc-north"],
        ["dc-north", "lc-store"],
        ["lc-store", "customer"]
      ]
    },

    // Hero item — exact figures from the framework doc's worked example.
    widgetA: {
      item: "Widget-A",
      onHand: 200,
      safetyStock: 150,
      forecastPerSlot: 100,      // SplitWeek Final Forecast per delivery slot
      slotsToWeek3: 4,           // 2 weeks x 2 deliveries
      demandToWeek3: 400,        // 4 x 100
      leadTimeDays: 14,          // Supplier X lead time
      unitsPerBox: 5,
      minBoxes: 50,              // Dist Box Qty Min
      multBoxes: 50,             // Dist Box Qty Mult
      // net requirement = max(0, demand - onHand + safetyStock)
      netRequirementUnits: 350,  // 400 - 200 + 150
      netRequirementBoxes: 70,   // 350 / 5
      orderBoxes: 100,           // rounded up to multiple of 50
      orderUnits: 500,           // 100 x 5
      endingOnHandWk3: 300,      // 200 - 400 + 500
      invHealth: "InStock"
    },

    // Scenario definitions used by later Sim Lab / failure animations.
    scenarios: [
      { id: "normal",   name: "Normal solve",            trigger: "Baseline demand & supply",
        outcome: "Order 500 units for Week 3; ending OH 300 > SS 150; InStock.", severity: "ok" },
      { id: "sup-holi", name: "Supplier production holiday", trigger: "Supplier X cannot ship on required day",
        outcome: "Order shifts to nearest valid prior ship day; on-time if slack exists.", severity: "warn" },
      { id: "freeze",   name: "Freeze-window block",     trigger: "Required ship date lands inside Firm Fence",
        outcome: "No auto-order; Short Exception raised; planner alerted.", severity: "err" },
      { id: "spike",    name: "Demand spike",            trigger: "Forecast jumps above plan",
        outcome: "Net requirement rises; expedite / larger order; possible shortage.", severity: "warn" },
      { id: "capacity", name: "Inbound capacity breach", trigger: "Receipts exceed LC inbound box capacity",
        outcome: "Receipts spread across days, or shortage flagged.", severity: "warn" },
      { id: "failover", name: "Multi-source failover",   trigger: "One of two suppliers on holiday",
        outcome: "Split ratio redirects demand to the available source.", severity: "ok" }
    ],

    // ── Solver INPUTS (doc §4) — six staged categories ──
    inputs: {
      demand: {
        title: "Demand Inputs", icon: "📈",
        blurb: "The signal the solver must fulfil — prepared by the rule engine before the solve.",
        measures: [
          ["SplitWeek Final Forecast", "The time-phased demand per delivery slot the solver plans to meet.", "100 units/slot"],
          ["SCS Fcst Qty", "Customer-facing forecast quantity at the Level-1 LC.", "the starting signal"],
          ["DRP Independent Demand", "Downstream LC demand re-expressed as independent demand for the upstream DC.", "propagated up"],
          ["Demand Priority – CCtILO(D)", "Per-record priority used when supply is short.", "ranking key"]
        ]
      },
      inventory: {
        title: "Inventory Inputs", icon: "📦",
        blurb: "Where stock sits today and how much buffer each item must hold.",
        measures: [
          ["SCS Beginning on Hand", "Opening inventory position at the LC.", "200 units"],
          ["Safety Stock Final", "Target buffer; method-specific (Poisson / Quantile / Forecast-Variation).", "150 units"],
          ["EOQ Final (SIL)", "Economic order quantity target the solver aims at.", "planning input"]
        ]
      },
      supplyOrder: {
        title: "In-Flight Supply Inputs", icon: "🚚",
        blurb: "Committed supply already in motion — counted so the solver never double-orders.",
        measures: [
          ["Open Purchase Orders", "Supplier orders already placed, not yet received.", "avoid double-order"],
          ["In-Transit STOs", "Stock transfers already shipped between LCs.", "in-transit"],
          ["Firmed Planned Orders", "Planner-firmed supply inside the fence.", "locked supply"]
        ]
      },
      topology: {
        title: "Network Topology Inputs", icon: "🕸️",
        blurb: "The graph the solver traverses — which node sources which, on what lane.",
        measures: [
          ["BILT Graph", "Buyer-Item-Location-Time supply lanes between nodes.", "supply lanes"],
          ["BOD Lane", "Buy-Order-Delivery transport lane with holidays & transit time.", "transport"],
          ["BILT(ConsSolver) Graph", "Component consumption associations for kits.", "kit BOM"]
        ]
      },
      constraintParam: {
        title: "Constraint Parameter Inputs", icon: "🎚️",
        blurb: "The numeric limits the solver reads directly at solve time.",
        measures: [
          ["Dist Box Qty Min – BILT(Solver)", "Minimum boxes per shipment on the lane.", "50 boxes"],
          ["Dist Box Qty Mult – BILT(Solver)", "Shipment must be a multiple of this.", "50 boxes"],
          ["Dist Lead Time – BT(Solver)", "Transit / procurement lead time used to back-schedule.", "14 days"],
          ["Activity Freeze Time Bucket Offset – BT(Solver)", "How many buckets from today are frozen.", "freeze offset"]
        ]
      },
      capacity: {
        title: "Capacity Inputs", icon: "🏭",
        blurb: "Physical throughput ceilings so plans stay executable.",
        measures: [
          ["Inbound Box Count Capacity", "Max inbound receipts an LC can take per day/week.", "receiving limit"],
          ["Outbound Box Count Capacity", "Max outbound shipments to child LCs.", "shipping limit"],
          ["Demonstrated Capacity – CIL(D)", "Rolling-average historical throughput ceiling.", "realistic cap"]
        ]
      }
    },

    // ── Solver CONSTRAINTS (doc §5) — hard vs soft ──
    constraints: {
      freeze: {
        title: "Time Constraints: Freeze Windows", kind: "hard",
        blurb: "The period within which supply plans cannot change because operations are already underway.",
        items: [
          ["Firm Fence Date – BT", "Date up to which plans are firm; solver won't create/cancel/reschedule inside it.", "planner override only"],
          ["Activity Freeze Time Bucket Offset – BT(Solver)", "Solver-specific freeze in time buckets — read directly at solve time.", "buckets locked"],
          ["KIT Activity Freeze Time Bucket Offset", "Separate freeze for kit assembly activities.", "kit protection"]
        ]
      },
      calendar: {
        title: "Calendar Constraints", kind: "hard",
        blurb: "Working calendars at three granularities — the solver only acts on valid days.",
        items: [
          ["IsHoliday – BT(D)(Solver)", "BOD lane transport holiday; shipments shift to nearest valid prior day.", "lane holiday"],
          ["Dist Supplier Prod Holiday Solver", "Supplier can't produce/ship; no PSO placed that day.", "supplier holiday"],
          ["LC Delivery – LCToLCIE", "Days an Item-LC can receive (e.g. Mon & Thu only).", "delivery days"]
        ]
      },
      quantity: {
        title: "Quantity Constraints: Min / Mult / EOQ", kind: "hard",
        blurb: "Economic & logistical rounding on every order.",
        items: [
          ["Dist Box Qty Min – BILT(Solver)", "Order at least this many boxes; excess becomes safety stock.", "min 50"],
          ["Dist Box Qty Mult – BILT(Solver)", "Round order up to a multiple — full-pallet / truckload economics.", "mult 50"],
          ["EOQ Final (SIL)", "Target order size balancing ordering vs holding cost.", "EOQ target"]
        ]
      },
      capacity: {
        title: "Capacity Constraints", kind: "soft",
        blurb: "Throughput limits; may be breached but flagged as an exception.",
        items: [
          ["Inbound Box Count Capacity", "Won't plan more inbound than the LC can receive.", "spread or short"],
          ["Outbound Box Count Capacity", "Limits outbound shipments to child LCs.", "shipping cap"],
          ["Demonstrated Capacity – CIL(D)", "Realistic historical ceiling, not theoretical max.", "rolling avg"]
        ]
      },
      validity: {
        title: "Network Validity Constraints", kind: "hard",
        blurb: "Only real, currently-active lanes are used.",
        items: [
          ["Effective In/Out Dates – BT(Solver)", "Lane active only if today is inside its effective range.", "no phantom lanes"],
          ["Dist Supplier Split Ratio – BILT(D)(Solver)", "Allocate multi-source demand in fixed proportions.", "e.g. 60/40"],
          ["NoCarry – IL(Solver)", "Cannot carry surplus forward — match supply to demand.", "no stockpile"]
        ]
      },
      priority: {
        title: "Priority Constraints", kind: "hard",
        blurb: "When supply is insufficient, ration by a structured hierarchy — never arbitrarily.",
        items: [
          ["Demand Priority – CCtILO(D)", "Numeric priority per customer-item-LC-order.", "higher first"],
          ["Customer Type Priority", "SCHEDULE ORDER > COMMERCIAL > PULL.", "contract first"],
          ["Priority Part Indicator – ILDC", "Flagged parts get preferential allocation; Line Down Date tracked.", "critical parts"],
          ["Prod Priority – BILT(Solver)", "Sequences which supply lane is used first.", "lane order"]
        ]
      }
    }
  };
})();
