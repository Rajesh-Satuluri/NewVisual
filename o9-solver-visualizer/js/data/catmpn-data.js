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
    ]
  };
})();
