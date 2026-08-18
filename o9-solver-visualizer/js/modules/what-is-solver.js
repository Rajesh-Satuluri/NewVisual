/* modules/what-is-solver.js — what the o9 solver is (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var NODES = [
    { id: "demand", label: "Demand signal", sub: "SplitWeek Fcst", x: 40, y: 90, w: 170, h: 60, color: "demand" },
    { id: "solver", label: "o9 SOLVER", sub: "graph traversal", x: 340, y: 80, w: 190, h: 80, color: "solver" },
    { id: "stos", label: "STOs", sub: "transfers", x: 660, y: 30, w: 150, h: 52, color: "dc" },
    { id: "psos", label: "PSOs", sub: "purchases", x: 660, y: 100, w: 150, h: 52, color: "supplier" },
    { id: "dist", label: "Distribution", sub: "quantities", x: 660, y: 170, w: 150, h: 52, color: "lc" }
  ];
  var EDGES = [["demand", "solver"], ["solver", "stos"], ["solver", "psos"], ["solver", "dist"]];
  var STEPS = [
    { active: ["demand"], edges: [], label: "1 · Demand in", desc: "The solver consumes prepared demand — the <b>SplitWeek Final Forecast</b> — across the whole Item × LC × Supplier network." },
    { active: ["solver"], edges: [["demand", "solver"]], label: "2 · Traverse the network", desc: "It is <b>not a rule-based calculator</b>. It is a constraint-aware, graph-traversal engine that evaluates the entire multi-echelon network in one coherent solve." },
    { active: ["stos", "psos", "dist"], edges: [["solver", "stos"], ["solver", "psos"], ["solver", "dist"]], label: "3 · Supply decisions out", desc: "It writes back <b>Stock Transfer Orders</b>, <b>Purchase Schedules</b> and distribution quantities — every day, in a fully automated batch." }
  ];

  var module = {
    id: "what-is-solver", title: "What is the o9 Solver", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Foundations</div>' +
          '<h1 class="module-title gradient-text">What is the o9 Solver?</h1>' +
          '<p class="module-subtitle">The core computational engine inside o9 IBP that translates demand signals into actionable supply decisions across the whole network.</p>' +
        "</div>" +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Watch a demand signal enter the solver and leave as concrete supply orders.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">In one definition</h2>' +
          '<dl class="concept-def">' +
            '<dt>What</dt><dd>A constraint-aware, graph-traversal planning engine — the compute core of o9 IBP.</dd>' +
            '<dt>Input</dt><dd>Prepared demand, inventory, in-flight supply, network topology, constraints and capacities.</dd>' +
            '<dt>Output</dt><dd>Time-phased STOs, Purchase Schedules (PSOs) and distribution quantities.</dd>' +
            '<dt>In CATMPN</dt><dd>Configured in the CAT Supply Plan; runs daily in a fully automated batch across the Logistics Center network.</dd>' +
          "</dl>" +
        "</section>" +
        '<section class="section"><h2 class="section-title">Not a calculator — a solver</h2>' +
          '<div class="callout info"><span class="callout-icon">🧠</span><div class="callout-body">A rule-based calculator evaluates one item at a time with fixed formulas. The solver simultaneously evaluates an <b>entire multi-echelon distribution network</b>, respects capacity limits and lead times, and generates a coherent plan in a single solve.</div></div>' +
          '<div><span class="measure-pill">CAT Supply Plan</span><span class="measure-pill">Stock Transfer Order (STO)</span><span class="measure-pill">Purchase Schedule (PSO)</span></div>' +
        "</section>";
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 860 240", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      function show(idx) {
        if (idx < 0) { diagram.clear(); return; }
        diagram.setActive(STEPS[idx].active, STEPS[idx].edges);
        detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].desc + "</p>";
      }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el);
      this._controls = controls; show(-1);
    },
    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };
  AV.registerModule(module);
})();
