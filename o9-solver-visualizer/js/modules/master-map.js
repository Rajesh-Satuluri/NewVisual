/* modules/master-map.js — clickable concept map over all modules */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var GROUPS = [
    ["Real-World Scenario", [["business-scenario", "Nightly Supply Solve"]]],
    ["Foundations", [["what-is-solver", "What is the Solver"], ["planning-engine-stack", "Engine Stack"], ["why-solver", "Why a Solver"], ["solver-components", "Components"]]],
    ["DRP Framework", [["drp-overview", "DRP Overview"], ["multi-echelon", "Multi-Echelon"], ["objectives", "Objectives"]]],
    ["Solver Inputs", [["demand-inputs", "Demand"], ["inventory-inputs", "Inventory"], ["supply-order-inputs", "In-Flight Supply"], ["network-topology", "Topology"], ["constraint-params", "Constraint Params"], ["capacity-inputs", "Capacity"]]],
    ["Constraints", [["freeze-windows", "Freeze"], ["calendar-constraints", "Calendar"], ["quantity-constraints", "Min/Mult/EOQ"], ["capacity-constraints", "Capacity"], ["network-validity", "Validity"], ["priority-constraints", "Priority"]]],
    ["Solver Decisions", [["net-requirements", "Net Requirements"], ["timing-logic", "Timing"], ["sourcing-logic", "Sourcing"], ["shortage-handling", "Shortages"], ["allocation", "Allocation"], ["pegging", "Pegging"]]],
    ["Execution & Outputs", [["batch-sequence", "Batch Sequence"], ["solver-outputs", "Outputs"], ["worked-example", "Worked Example"]]],
    ["Learning Mode", [["sim-lab", "Behavior Lab"], ["interview", "Interview Q&A"], ["scenario-interview", "Scenario Interviews"], ["quiz", "Quiz"], ["glossary", "Glossary"]]]
  ];
  var module = {
    id: "master-map", title: "Master Concept Map",
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Learning Mode</div>' +
          '<h1 class="module-title gradient-text">Master Concept Map</h1>' +
          '<p class="module-subtitle">Every module in one place. Click any concept to jump straight to it.</p></div>' +
        '<div class="card-grid">' + GROUPS.map(function (g) {
          return '<div class="map-group"><h3>' + g[0] + '</h3><div class="map-chips">' +
            g[1].map(function (r) { return '<a class="map-chip" href="#' + r[0] + '">' + r[1] + '</a>'; }).join("") + '</div></div>';
        }).join("") + '</div>';
    },
    destroy: function () {}
  };
  AV.registerModule(module);
})();
