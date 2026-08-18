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
